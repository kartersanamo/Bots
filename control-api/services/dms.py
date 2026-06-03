"""Discord DM proxy using per-bot tokens."""
from __future__ import annotations

import asyncio
import os
from pathlib import Path
from typing import Any, Dict, Optional, Union

import httpx
from dotenv import load_dotenv

from bot_registry import bot_token_env_key
from services import dm_registry

DISCORD_API = "https://discord.com/api/v10"
_ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"


def _ensure_env() -> None:
    if _ENV_PATH.exists():
        load_dotenv(_ENV_PATH, override=False)


def _token(bot_id: str) -> str:
    _ensure_env()
    key = bot_token_env_key(bot_id)
    token = (os.environ.get(key) or os.environ.get("DISCORD_BOT_TOKEN") or "").strip()
    if not token:
        raise ValueError(f"No token configured for bot {bot_id} (set {key})")
    return token


def token_configured(bot_id: str) -> bool:
    try:
        _token(bot_id)
        return True
    except ValueError:
        return False


def _headers(bot_id: str) -> dict[str, str]:
    return {"Authorization": f"Bot {_token(bot_id)}"}


def _recipient_user_id(channel: dict[str, Any]) -> Optional[str]:
    """Human user in a bot DM (exclude the bot account)."""
    for r in channel.get("recipients") or []:
        if r.get("bot"):
            continue
        rid = r.get("id")
        if rid:
            return str(rid)
    recipients = channel.get("recipients") or []
    if recipients and recipients[0].get("id"):
        return str(recipients[0]["id"])
    return None


def _enrich_channel(
    channel: dict[str, Any], registry_meta: Optional[dict[str, Any]] = None
) -> dict[str, Any]:
    meta = registry_meta or {}
    rid = _recipient_user_id(channel) or meta.get("user_id")
    out = dict(channel)
    if rid:
        out["recipient_id"] = str(rid)
    return out


def _snowflake_key(value: Optional[str]) -> int:
    if not value:
        return 0
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


async def _get_channel(
    client: httpx.AsyncClient, bot_id: str, channel_id: str
) -> Optional[dict[str, Any]]:
    res = await client.get(
        f"{DISCORD_API}/channels/{channel_id}",
        headers=_headers(bot_id),
    )
    if res.status_code == 404:
        return None
    if res.status_code == 403:
        return None
    res.raise_for_status()
    return res.json()


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
        messages = res.json()
        ch = await _get_channel(client, bot_id, channel_id)
        recipient = (ch or {}).get("recipients") or []
        human = next((r for r in recipient if not r.get("bot")), None)
        if not human and recipient:
            human = recipient[0]
        touch_kwargs: dict[str, Any] = {
            "last_message_id": messages[0].get("id") if messages else None,
        }
        if human:
            touch_kwargs["user_id"] = human.get("id")
            touch_kwargs["recipient_username"] = human.get("username")
            touch_kwargs["recipient_global_name"] = human.get("global_name")
        dm_registry.touch(bot_id, channel_id, **touch_kwargs)
        return messages


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
        msg = res.json()
        dm_registry.touch(
            bot_id,
            channel_id,
            last_message_id=msg.get("id"),
        )
        return msg


async def open_dm(bot_id: str, user_id: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(
            f"{DISCORD_API}/users/@me/channels",
            headers={**_headers(bot_id), "Content-Type": "application/json"},
            json={"recipient_id": user_id},
        )
        res.raise_for_status()
        channel = res.json()
        human = next(
            (r for r in channel.get("recipients") or [] if not r.get("bot")),
            (channel.get("recipients") or [{}])[0],
        )
        dm_registry.touch(
            bot_id,
            str(channel["id"]),
            user_id=str(user_id),
            recipient_username=human.get("username"),
            recipient_global_name=human.get("global_name"),
            last_message_id=channel.get("last_message_id"),
        )
        return _enrich_channel(channel, {"user_id": user_id})


async def _probe_user_dm(
    client: httpx.AsyncClient,
    bot_id: str,
    user_id: str,
    *,
    known_channel_ids: set[str],
) -> Optional[dict[str, Any]]:
    res = await client.post(
        f"{DISCORD_API}/users/@me/channels",
        headers={**_headers(bot_id), "Content-Type": "application/json"},
        json={"recipient_id": user_id},
    )
    if res.status_code in (401, 403):
        return None
    if res.status_code >= 400:
        return None
    channel = res.json()
    cid = str(channel.get("id", ""))
    if not cid or cid in known_channel_ids:
        return channel if cid else None

    recipient = (channel.get("recipients") or [{}])[0]
    dm_registry.touch(
        bot_id,
        cid,
        user_id=user_id,
        recipient_username=recipient.get("username"),
        recipient_global_name=recipient.get("global_name"),
        last_message_id=channel.get("last_message_id"),
    )

    if channel.get("last_message_id"):
        return channel

    msg_res = await client.get(
        f"{DISCORD_API}/channels/{cid}/messages",
        headers=_headers(bot_id),
        params={"limit": 1},
    )
    if msg_res.status_code == 200:
        msgs = msg_res.json()
        if msgs:
            latest = msgs[0]
            author = latest.get("author") or {}
            if not author.get("bot"):
                dm_registry.touch(
                    bot_id,
                    cid,
                    user_id=author.get("id"),
                    last_message_id=latest.get("id"),
                    recipient_username=author.get("username"),
                    recipient_global_name=author.get("global_name"),
                )
            else:
                dm_registry.touch(
                    bot_id,
                    cid,
                    last_message_id=latest.get("id"),
                )
            channel["last_message_id"] = latest.get("id") or channel.get("last_message_id")
            return channel
    return None


async def list_dm_channels(
    bot_id: str,
    limit: int = 50,
    user_ids: Optional[list[str]] = None,
    *,
    probe_limit: int = 150,
) -> list[dict[str, Any]]:
    """
    List DM channels for a bot.

    Discord intentionally returns an empty list from GET /users/@me/channels for bots.
    We merge a local registry (updated on message fetch/send) with optional user_id probes.
    """
    _token(bot_id)
    registry = dm_registry.load(bot_id)
    by_id: dict[str, dict[str, Any]] = {}
    known_users = {
        str(meta.get("user_id"))
        for meta in registry.values()
        if meta.get("user_id")
    }

    async with httpx.AsyncClient(timeout=30) as client:
        # Legacy endpoint — usually empty for bots, but merge if present.
        res = await client.get(
            f"{DISCORD_API}/users/@me/channels",
            headers=_headers(bot_id),
        )
        if res.status_code == 401:
            raise ValueError("Invalid bot token")
        if res.status_code == 200:
            for ch in res.json():
                if ch.get("type") in (1, 3):
                    cid = str(ch["id"])
                    by_id[cid] = ch
                    recipient = (ch.get("recipients") or [{}])[0]
                    dm_registry.touch(
                        bot_id,
                        cid,
                        user_id=recipient.get("id"),
                        last_message_id=ch.get("last_message_id"),
                        recipient_username=recipient.get("username"),
                        recipient_global_name=recipient.get("global_name"),
                    )

        # Refresh channels we have seen before.
        for cid in list(registry.keys()):
            if cid in by_id:
                continue
            refreshed = await _get_channel(client, bot_id, cid)
            if refreshed and refreshed.get("type") in (1, 3):
                by_id[cid] = refreshed

        # Probe candidate user IDs (from dashboard DB) not already mapped.
        candidates: list[str] = []
        if user_ids:
            for uid in user_ids:
                s = str(uid).strip()
                if not s.isdigit() or len(s) < 17:
                    continue
                if s in known_users:
                    continue
                candidates.append(s)
        candidates = candidates[:probe_limit]

        if candidates:
            sem = asyncio.Semaphore(6)

            async def run_probe(uid: str) -> None:
                async with sem:
                    ch = await _probe_user_dm(
                        client, bot_id, uid, known_channel_ids=set(by_id.keys())
                    )
                    if ch and ch.get("id"):
                        by_id[str(ch["id"])] = ch

            await asyncio.gather(*[run_probe(uid) for uid in candidates])

    def sort_key(ch: dict[str, Any]) -> int:
        cid = str(ch.get("id", ""))
        meta = registry.get(cid) or {}
        return _snowflake_key(
            ch.get("last_message_id") or meta.get("last_message_id")
        )

    ordered = sorted(by_id.values(), key=sort_key, reverse=True)
    enriched: list[dict[str, Any]] = []
    for ch in ordered[:limit]:
        cid = str(ch.get("id", ""))
        enriched.append(_enrich_channel(ch, registry.get(cid)))
    return enriched
