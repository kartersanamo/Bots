"""Bot process status and lifecycle via systemd or tmux + run.sh."""
from __future__ import annotations

import os
import signal
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
from typing import List, Literal, Optional, Tuple

from bot_registry import bot_root, get_bot, systemd_unit
from services import tmux_console as tcx

ProcessStatus = Literal["online", "offline", "starting", "degraded", "unknown"]


@dataclass
class ProcessInfo:
    bot_id: str
    status: ProcessStatus
    pid: Optional[int]
    uptime_seconds: Optional[float]
    systemd_unit: Optional[str]
    message: Optional[str]


def _run(cmd: list, timeout: int = 15) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=timeout,
    )


def _read_cmdline(pid: int) -> str:
    try:
        raw = (Path(f"/proc/{pid}") / "cmdline").read_bytes()
        return raw.replace(b"\0", b" ").decode("utf-8", errors="replace").strip()
    except OSError:
        return ""


def _read_cwd(pid: int) -> Optional[Path]:
    try:
        return (Path(f"/proc/{pid}") / "cwd").resolve()
    except OSError:
        return None


def _find_pids_by_bot_dir(root: Path, entry_script: str) -> List[int]:
    """
    Find bot PIDs by working directory + script name.

    Tmux/run.sh often runs `python3 main.py` without the full path in argv,
    so pgrep on /path/to/main.py does not match.
    """
    root = root.resolve()
    matches: List[int] = []

    try:
        proc_root = Path("/proc")
    except OSError:
        return matches

    for entry in proc_root.iterdir():
        if not entry.name.isdigit():
            continue
        pid = int(entry.name)
        cwd = _read_cwd(pid)
        if cwd != root:
            continue
        cmdline = _read_cmdline(pid)
        if entry_script not in cmdline:
            continue
        if "python" not in cmdline.lower():
            continue
        matches.append(pid)

    return sorted(matches)


def _find_pid_by_cwd(root: Path, entry_script: str) -> Optional[int]:
    pids = _find_pids_by_bot_dir(root, entry_script)
    return pids[0] if pids else None


def _systemd_active(unit: str) -> Tuple[ProcessStatus, Optional[str]]:
    try:
        result = _run(["systemctl", "is-active", unit])
        state = result.stdout.strip()
        if state == "active":
            return "online", None
        if state in ("activating", "reloading"):
            return "starting", f"systemd: {state}"
        return "offline", f"systemd: {state}"
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return "unknown", "systemctl unavailable"


def _systemd_main_pid(unit: str) -> Optional[int]:
    try:
        result = _run(["systemctl", "show", unit, "-p", "MainPID", "--value"])
        if result.returncode != 0:
            return None
        pid = int(result.stdout.strip() or "0")
        return pid if pid > 0 else None
    except (ValueError, subprocess.TimeoutExpired, FileNotFoundError):
        return None


def _process_uptime(pid: int) -> Optional[float]:
    try:
        stat = Path(f"/proc/{pid}/stat").read_text()
        parts = stat.split()
        starttime = int(parts[21])
        clk_tck = os.sysconf("SC_CLK_TCK")
        with open("/proc/uptime") as f:
            uptime = float(f.read().split()[0])
        return uptime - (starttime / clk_tck)
    except (OSError, ValueError, IndexError):
        return None


_STATUS_CACHE: dict[str, tuple[float, ProcessInfo]] = {}
_STATUS_CACHE_TTL = 5.0


def _get_process_info_uncached(bot_id: str) -> ProcessInfo:
    entry = get_bot(bot_id)
    if not entry:
        return ProcessInfo(bot_id, "unknown", None, None, None, "Unknown bot")

    unit = systemd_unit(bot_id)
    root = bot_root(bot_id)

    if unit:
        status, msg = _systemd_active(unit)
        pid = _systemd_main_pid(unit) if status == "online" else None
        uptime = _process_uptime(pid) if pid else None
        return ProcessInfo(bot_id, status, pid, uptime, unit, msg)

    pid = _find_pid_by_cwd(root, entry.entry_script)
    if pid:
        return ProcessInfo(
            bot_id,
            "online",
            pid,
            _process_uptime(pid),
            None,
            None,
        )
    return ProcessInfo(bot_id, "offline", None, None, None, None)


def get_process_info(bot_id: str) -> ProcessInfo:
    now = time.time()
    hit = _STATUS_CACHE.get(bot_id)
    if hit and now - hit[0] < _STATUS_CACHE_TTL:
        return hit[1]
    info = _get_process_info_uncached(bot_id)
    _STATUS_CACHE[bot_id] = (now, info)
    return info


def invalidate_process_cache(bot_id: str | None = None) -> None:
    if bot_id:
        _STATUS_CACHE.pop(bot_id, None)
    else:
        _STATUS_CACHE.clear()


def _resolve_bot_python(root: Path) -> str:
    """Prefer the bot's project venv over system python3."""
    for venv_dir in (".venv", "venv"):
        py = root / venv_dir / "bin" / "python"
        if py.is_file():
            return str(py)
    return "python3"


def _kill_bot_processes(bot_id: str) -> None:
    """Stop detached/orphan processes started outside tmux."""
    entry = get_bot(bot_id)
    if not entry:
        return
    root = bot_root(bot_id)
    pids = _find_pids_by_bot_dir(root, entry.entry_script)
    for pid in pids:
        try:
            os.kill(pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
    if pids:
        time.sleep(0.8)
        for pid in pids:
            try:
                os.kill(pid, signal.SIGKILL)
            except ProcessLookupError:
                pass


def start_bot(bot_id: str) -> ProcessInfo:
    entry = get_bot(bot_id)
    if not entry:
        raise ValueError("Unknown bot")

    unit = systemd_unit(bot_id)
    if unit:
        result = _run(["systemctl", "start", unit])
        if result.returncode != 0:
            raise RuntimeError(result.stderr or "Failed to start unit")
        time.sleep(1)
        invalidate_process_cache(bot_id)
        return get_process_info(bot_id)

    root = bot_root(bot_id)
    run_sh = root / "run.sh"
    script = root / entry.entry_script
    if not script.is_file() and not run_sh.is_file():
        raise FileNotFoundError(f"No {entry.entry_script} or run.sh under {root}")

    # Production bots use ./run.sh inside their tmux pane — never a detached process.
    if run_sh.is_file():
        _kill_bot_processes(bot_id)
        tcx.start_run_sh(bot_id)
        time.sleep(2)
        invalidate_process_cache(bot_id)
        return get_process_info(bot_id)

    if tcx.uses_tmux(bot_id):
        _kill_bot_processes(bot_id)
        tcx.start_run_sh(bot_id)
        time.sleep(2)
        invalidate_process_cache(bot_id)
        return get_process_info(bot_id)

    info = get_process_info(bot_id)
    if info.status == "online":
        return info

    python = _resolve_bot_python(root)
    cmd = [python, entry.entry_script]
    subprocess.Popen(
        cmd,
        cwd=str(root),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    time.sleep(2)
    invalidate_process_cache(bot_id)
    return get_process_info(bot_id)


def stop_bot(bot_id: str) -> ProcessInfo:
    entry = get_bot(bot_id)
    if not entry:
        raise ValueError("Unknown bot")

    unit = systemd_unit(bot_id)
    if unit:
        result = _run(["systemctl", "stop", unit])
        if result.returncode != 0:
            raise RuntimeError(result.stderr or "Failed to stop unit")
        time.sleep(0.5)
        invalidate_process_cache(bot_id)
        return get_process_info(bot_id)

    if tcx.uses_tmux(bot_id):
        tcx.interrupt_pane(bot_id)
        _kill_bot_processes(bot_id)
        time.sleep(0.5)
        invalidate_process_cache(bot_id)
        return get_process_info(bot_id)

    root = bot_root(bot_id)
    pids = _find_pids_by_bot_dir(root, entry.entry_script)
    for pid in pids:
        try:
            os.kill(pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
    if pids:
        time.sleep(1)
        for pid in pids:
            try:
                os.kill(pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
    time.sleep(0.5)
    invalidate_process_cache(bot_id)
    return get_process_info(bot_id)


def restart_bot(bot_id: str) -> ProcessInfo:
    unit = systemd_unit(bot_id)
    if unit:
        result = _run(["systemctl", "restart", unit])
        if result.returncode != 0:
            raise RuntimeError(result.stderr or "Failed to restart unit")
        time.sleep(1)
        invalidate_process_cache(bot_id)
        return get_process_info(bot_id)

    _kill_bot_processes(bot_id)
    if tcx.uses_tmux(bot_id) or (bot_root(bot_id) / "run.sh").is_file():
        tcx.restart_run_sh(bot_id)
        time.sleep(2)
        invalidate_process_cache(bot_id)
        return get_process_info(bot_id)

    stop_bot(bot_id)
    time.sleep(0.5)
    return start_bot(bot_id)
