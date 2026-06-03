"""Start/stop bots in dedicated tmux panes and stream console output."""
from __future__ import annotations

import os
import shlex
import subprocess
import time
from typing import List, Optional

from bot_registry import bot_root, get_bot


def tmux_session() -> str:
    return os.environ.get("TMUX_SESSION", "bots")


def tmux_socket_args() -> List[str]:
    """Optional -S when control-api runs outside the tmux client env."""
    socket = os.environ.get("TMUX_SOCKET", "").strip()
    if not socket:
        return []
    return ["-S", socket]


def tmux_target(bot_id: str) -> Optional[str]:
    entry = get_bot(bot_id)
    if not entry or not entry.tmux_window:
        return None
    return f"{tmux_session()}:{entry.tmux_window}"


def tmux_available() -> bool:
    try:
        result = subprocess.run(
            ["tmux", *tmux_socket_args(), "has-session", "-t", tmux_session()],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def window_exists(bot_id: str) -> bool:
    entry = get_bot(bot_id)
    if not entry or not entry.tmux_window:
        return False
    if not tmux_available():
        return False
    try:
        result = subprocess.run(
            [
                "tmux",
                *tmux_socket_args(),
                "list-windows",
                "-t",
                tmux_session(),
                "-F",
                "#{window_name}",
            ],
            capture_output=True,
            text=True,
            timeout=5,
        )
    except subprocess.TimeoutExpired:
        return False
    if result.returncode != 0:
        return False
    return entry.tmux_window in result.stdout.splitlines()


def uses_tmux(bot_id: str) -> bool:
    return window_exists(bot_id)


def capture_pane(
    bot_id: str,
    lines: int = 200,
    *,
    full_scrollback: bool = False,
) -> List[str]:
    target = tmux_target(bot_id)
    if not target:
        return []
    if full_scrollback:
        start = "-"
    else:
        start = str(max(-min(lines, 5000), -5000))
    try:
        result = subprocess.run(
            [
                "tmux",
                *tmux_socket_args(),
                "capture-pane",
                "-t",
                target,
                "-p",
                "-e",
                "-S",
                start,
            ],
            capture_output=True,
            text=True,
            timeout=15,
        )
    except subprocess.TimeoutExpired:
        return []
    if result.returncode != 0:
        return []
    text = result.stdout.rstrip("\n")
    return text.splitlines() if text else []


def send_keys(bot_id: str, *keys: str) -> bool:
    target = tmux_target(bot_id)
    if not target:
        return False
    try:
        result = subprocess.run(
            ["tmux", *tmux_socket_args(), "send-keys", "-t", target, *keys],
            capture_output=True,
            text=True,
            timeout=10,
        )
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        return False


def interrupt_pane(bot_id: str) -> None:
    send_keys(bot_id, "C-c")
    time.sleep(0.6)
    send_keys(bot_id, "C-c")
    time.sleep(0.3)


def start_run_sh(bot_id: str) -> None:
    """Run ./run.sh in the bot's tmux pane (same as manual ops)."""
    entry = get_bot(bot_id)
    if not entry:
        raise ValueError("Unknown bot")
    if not uses_tmux(bot_id):
        raise RuntimeError(
            f"Tmux window {entry.tmux_window!r} not found in session {tmux_session()!r}"
        )

    root = bot_root(bot_id)
    run_sh = root / "run.sh"
    if not run_sh.is_file():
        raise FileNotFoundError(f"No run.sh under {root}")

    interrupt_pane(bot_id)
    time.sleep(0.4)
    if not send_keys(bot_id, f"cd {shlex.quote(str(root))}", "Enter"):
        raise RuntimeError(f"Failed to cd in tmux pane {tmux_target(bot_id)}")
    time.sleep(0.25)
    if not send_keys(bot_id, "./run.sh", "Enter"):
        raise RuntimeError(f"Failed to run ./run.sh in tmux pane {tmux_target(bot_id)}")


def restart_run_sh(bot_id: str) -> None:
    start_run_sh(bot_id)
