"""Tail bot logs from tmux console and/or log files."""
from __future__ import annotations

import re
from pathlib import Path
from typing import List, Literal, Optional

from bot_registry import bot_root, get_bot
from services import tmux_console as tcx

LogSource = Literal["auto", "console", "file"]


def _collect_log_files(bot_id: str) -> list[Path]:
    entry = get_bot(bot_id)
    if not entry:
        return []
    root = bot_root(bot_id)
    files: list[Path] = []
    for log_dir in entry.log_dirs:
        d = root / log_dir
        if d.is_dir():
            files.extend(
                sorted(d.glob("*.log*"), key=lambda p: p.stat().st_mtime, reverse=True)
            )
    # dashboard-start.log is legacy fallback output — not shown in the Logs tab.
    return [f for f in files[:20] if f.name != "dashboard-start.log"]


def _filter_lines(lines: List[str], search: Optional[str]) -> List[str]:
    if not search:
        return lines
    safe = search[:200]
    try:
        pattern = re.compile(safe, re.IGNORECASE)
        return [ln for ln in lines if pattern.search(ln)]
    except re.error:
        needle = safe.lower()
        return [ln for ln in lines if needle in ln.lower()]


def _tail_file_lines(
    bot_id: str,
    lines: int,
    search: Optional[str],
    file_name: Optional[str],
) -> dict:
    files = _collect_log_files(bot_id)
    if not files:
        return {"lines": [], "file": None, "files": [], "source": "file"}

    target = files[0]
    if file_name:
        for f in files:
            if f.name == file_name:
                target = f
                break

    try:
        content = target.read_text(encoding="utf-8", errors="replace")
    except OSError as e:
        return {
            "lines": [f"Error reading log: {e}"],
            "file": target.name,
            "files": [f.name for f in files],
            "source": "file",
        }

    all_lines = content.splitlines()
    chunk = all_lines[-lines:] if lines > 0 else all_lines
    chunk = _filter_lines(chunk, search)

    return {
        "lines": chunk,
        "file": target.name,
        "files": [f.name for f in files],
        "source": "file",
    }


def tail_logs(
    bot_id: str,
    lines: int = 100,
    search: Optional[str] = None,
    file_name: Optional[str] = None,
    source: LogSource = "auto",
) -> dict:
    if source == "console":
        if not tcx.uses_tmux(bot_id):
            return {
                "lines": [
                    f"Tmux window unavailable for this bot "
                    f"(session {tcx.tmux_session()}). "
                    "Open the matching tmux pane on the host."
                ],
                "file": None,
                "files": [],
                "source": "console",
                "tmuxAvailable": False,
            }
        console_lines = tcx.capture_pane(
            bot_id,
            lines=max(lines, 500),
            full_scrollback=True,
        )
        console_lines = _filter_lines(console_lines, search)
        if lines > 0:
            console_lines = console_lines[-lines:]
        return {
            "lines": console_lines,
            "file": "tmux console",
            "files": [],
            "source": "console",
            "tmuxAvailable": True,
        }

    if source == "file":
        return _tail_file_lines(bot_id, lines, search, file_name)

    # auto: prefer tmux console when available, else log files
    if tcx.uses_tmux(bot_id):
        console_lines = tcx.capture_pane(
            bot_id,
            lines=max(lines, 500),
            full_scrollback=True,
        )
        console_lines = _filter_lines(console_lines, search)
        if console_lines:
            if lines > 0:
                console_lines = console_lines[-lines:]
            return {
                "lines": console_lines,
                "file": "tmux console",
                "files": [f.name for f in _collect_log_files(bot_id)],
                "source": "console",
                "tmuxAvailable": True,
            }

    result = _tail_file_lines(bot_id, lines, search, file_name)
    result["tmuxAvailable"] = tcx.uses_tmux(bot_id)
    return result
