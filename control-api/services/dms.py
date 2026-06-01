"""Discord DM proxy using per-bot tokens."""
from __future__ import annotations

import os
from typing import Any, Dict, Optional, Union

import httpx

from bot_registry import bot_token_env_key

DISCORD_API = "https://discord.com/api/v10"


def _token(bot_id: str) -> str:
    key = bot_token_env_key(bot_id)
    token = os.environ.get(key) or os.environ.get("DISCORD_BOT_TOKEN", "")
    if not token:
        raise ValueError(f"No token configured for bot {bot_id} (set {key})")
    return token


def _headers(bot_id: str) -> dict[str, str]:
    return {"Authorization": f"Bot {_token(bot_id)}"}


async def list_dm_channels(bot_id: str, limit: int = 50) -> list[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.get(
            f"{DISCORD_API}/users/@me/channels",
            headers=_headers(bot_id),
        )
        if res.status_code == 401:
            raise ValueError("Invalid bot token")
        res.raise_for_status()
        channels = res.json()
        # Filter DM type (1)
        dms = [c for c in channels if c.get("type") == 1][:limit]
        return dms


async def get_channel_messages(
    bot_id: str, channel_id: str, limit: int = 50, before: Optional[str] = None
) -> list:
    params: Dict[str, Union[str, int]] = {"limit": min(limit, 100)}
    if before:
        params["before"] = before

    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.get(
            f"{DISCORD_API}/channels/{channel_id}/messages",
            headers=_headers(bot_id),
            params=params,
        )
        res.raise_for_status()
        return res.json()


async def send_dm_message(
    bot_id: str, channel_id: str, content: str
) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(
            f"{DISCORD_API}/channels/{channel_id}/messages",
            headers={**_headers(bot_id), "Content-Type": "application/json"},
            json={"content": content[:2000]},
        )
        res.raise_for_status()
        return res.json()


async def open_dm(bot_id: str, user_id: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(
            f"{DISCORD_API}/users/@me/channels",
            headers={**_headers(bot_id), "Content-Type": "application/json"},
            json={"recipient_id": user_id},
        )
        res.raise_for_status()
        return res.json()
