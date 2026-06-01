"""Tail and search bot log files."""
from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

from bot_registry import bot_root, get_bot


def _collect_log_files(bot_id: str) -> list[Path]:
    entry = get_bot(bot_id)
    if not entry:
        return []
    root = bot_root(bot_id)
    files: list[Path] = []
    for log_dir in entry.log_dirs:
        d = root / log_dir
        if d.is_dir():
            files.extend(sorted(d.glob("*.log*"), key=lambda p: p.stat().st_mtime, reverse=True))
    return files[:20]


def tail_logs(
    bot_id: str,
    lines: int = 100,
    search: Optional[str] = None,
    file_name: Optional[str] = None,
) -> dict:
    files = _collect_log_files(bot_id)
    if not files:
        return {"lines": [], "file": None, "files": []}

    target = files[0]
    if file_name:
        for f in files:
            if f.name == file_name:
                target = f
                break

    try:
        content = target.read_text(encoding="utf-8", errors="replace")
    except OSError as e:
        return {"lines": [f"Error reading log: {e}"], "file": target.name, "files": [f.name for f in files]}

    all_lines = content.splitlines()
    chunk = all_lines[-lines:] if lines > 0 else all_lines

    if search:
        pattern = re.compile(search, re.IGNORECASE)
        chunk = [ln for ln in chunk if pattern.search(ln)]

    return {
        "lines": chunk,
        "file": target.name,
        "files": [f.name for f in files],
    }
