"""Start/stop bots in dedicated tmux panes and stream console output."""
from __future__ import annotations

import os
import subprocess
import time
from typing import List, Optional

from bot_registry import get_bot


def tmux_session() -> str:
    return os.environ.get("TMUX_SESSION", "bots")


def tmux_target(bot_id: str) -> Optional[str]:
    entry = get_bot(bot_id)
    if not entry or not entry.tmux_window:
        return None
    return f"{tmux_session()}:{entry.tmux_window}"


def tmux_available() -> bool:
    try:
        result = subprocess.run(
            ["tmux", "has-session", "-t", tmux_session()],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def uses_tmux(bot_id: str) -> bool:
    return tmux_available() and tmux_target(bot_id) is not None


def capture_pane(bot_id: str, lines: int = 200) -> List[str]:
    target = tmux_target(bot_id)
    if not target:
        return []
    start = max(-min(lines, 5000), -5000)
    try:
        result = subprocess.run(
            [
                "tmux",
                "capture-pane",
                "-t",
                target,
                "-p",
                "-S",
                str(start),
            ],
            capture_output=True,
            text=True,
            timeout=10,
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
            ["tmux", "send-keys", "-t", target, *keys],
            capture_output=True,
            text=True,
            timeout=10,
        )
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        return False


def interrupt_pane(bot_id: str) -> None:
    send_keys(bot_id, "C-c")
    time.sleep(0.5)
    send_keys(bot_id, "C-c")


def start_run_sh(bot_id: str) -> None:
    """Run ./run.sh in the bot's tmux pane (same as manual ops)."""
    interrupt_pane(bot_id)
    time.sleep(0.3)
    send_keys(bot_id, "./run.sh", "Enter")


def restart_run_sh(bot_id: str) -> None:
    start_run_sh(bot_id)
