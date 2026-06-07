"""Bot JSON config read/write with backups."""
from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

from bot_registry import bot_root, get_bot


def _resolve_config_path(bot_id: str, relative_path: str) -> Path:
    entry = get_bot(bot_id)
    if not entry:
        raise ValueError("Unknown bot")
    root = bot_root(bot_id)
    # Normalize: registry uses paths like Assets/config.json
    rel = relative_path.replace("\\", "/").lstrip("/")
    candidates = [rel]
    if "assets/Configs/" in rel:
        candidates.append(rel.replace("assets/Configs/", "assets/configs/"))
    if "Assets/Configs/" in rel:
        candidates.append(rel.replace("Assets/Configs/", "assets/configs/"))

    for candidate in candidates:
        full = (root / candidate).resolve()
        if not str(full).startswith(str(root.resolve())):
            raise ValueError("Path escapes bot directory")
        if full.exists():
            return full

    last = (root / candidates[-1]).resolve()
    if not str(last).startswith(str(root.resolve())):
        raise ValueError("Path escapes bot directory")
    if not last.exists() and not last.parent.exists():
        raise FileNotFoundError(f"Config not found: {rel}")
    return last


def read_config(bot_id: str, relative_path: str) -> dict:
    path = _resolve_config_path(bot_id, relative_path)
    if not path.exists():
        raise FileNotFoundError(str(path))
    text = path.read_text(encoding="utf-8")
    return {"path": relative_path, "content": json.loads(text), "raw": text}


def _backup_dir(bot_id: str) -> Path:
    d = bot_root(bot_id) / "Assets" / ".backups"
    if not d.exists():
        d = bot_root(bot_id) / ".backups"
    d.mkdir(parents=True, exist_ok=True)
    return d


def write_config(bot_id: str, relative_path: str, content: object) -> dict:
    path = _resolve_config_path(bot_id, relative_path)
    if not isinstance(content, (dict, list)):
        raise ValueError("Content must be JSON object or array")

    backup_dir = _backup_dir(bot_id)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    safe_name = relative_path.replace("/", "_")
    if path.exists():
        shutil.copy2(path, backup_dir / f"{safe_name}.{ts}.bak")

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(content, indent=4, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return {"path": relative_path, "backup": f"{safe_name}.{ts}.bak"}


def list_backups(bot_id: str, relative_path: str) -> list[str]:
    backup_dir = _backup_dir(bot_id)
    safe_name = relative_path.replace("/", "_")
    return sorted(
        [f.name for f in backup_dir.glob(f"{safe_name}.*.bak")],
        reverse=True,
    )


def restore_backup(bot_id: str, relative_path: str, backup_name: str) -> dict:
    backup_dir = _backup_dir(bot_id)
    backup_path = (backup_dir / backup_name).resolve()
    if not str(backup_path).startswith(str(backup_dir.resolve())):
        raise ValueError("Invalid backup path")
    if not backup_path.exists():
        raise FileNotFoundError(backup_name)

    path = _resolve_config_path(bot_id, relative_path)
    shutil.copy2(backup_path, path)
    return read_config(bot_id, relative_path)
