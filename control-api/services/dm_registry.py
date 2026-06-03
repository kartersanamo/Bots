"""Persist DM channel IDs per bot (Discord does not list bot DMs via REST)."""
from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any, Optional

_DEFAULT_ROOT = Path(__file__).resolve().parent.parent.parent / "data" / "dm-registry"


def registry_dir() -> Path:
    raw = os.environ.get("DM_REGISTRY_DIR", "")
    path = Path(raw) if raw else _DEFAULT_ROOT
    path.mkdir(parents=True, exist_ok=True)
    return path


def _path(bot_id: str) -> Path:
    return registry_dir() / f"{bot_id}.json"


def load(bot_id: str) -> dict[str, dict[str, Any]]:
    path = _path(bot_id)
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        channels = data.get("channels")
        if isinstance(channels, dict):
            return {str(k): v for k, v in channels.items() if isinstance(v, dict)}
    except (json.JSONDecodeError, OSError):
        pass
    return {}


def save(bot_id: str, channels: dict[str, dict[str, Any]]) -> None:
    path = _path(bot_id)
    payload = {"channels": channels, "updated_at": int(time.time())}
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def touch(
    bot_id: str,
    channel_id: str,
    *,
    user_id: Optional[str] = None,
    last_message_id: Optional[str] = None,
    recipient_username: Optional[str] = None,
    recipient_global_name: Optional[str] = None,
) -> None:
    channels = load(bot_id)
    entry = channels.get(channel_id, {})
    if user_id:
        entry["user_id"] = str(user_id)
    if last_message_id:
        entry["last_message_id"] = str(last_message_id)
    if recipient_username:
        entry["recipient_username"] = recipient_username
    if recipient_global_name:
        entry["recipient_global_name"] = recipient_global_name
    entry["updated_at"] = int(time.time())
    channels[channel_id] = entry
    save(bot_id, channels)
