from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth import verify_control_key
from services import dms as dm_svc

router = APIRouter(prefix="/bots", tags=["dms"], dependencies=[Depends(verify_control_key)])


class SendMessageBody(BaseModel):
    content: str = Field(..., max_length=2000)


class OpenDmBody(BaseModel):
    user_id: str


@router.get("/{bot_id}/dms")
async def list_dms(
    bot_id: str,
    limit: int = Query(50, ge=1, le=100),
    user_ids: Optional[str] = Query(
        None,
        description="Comma-separated Discord user IDs to probe for DM history",
    ),
):
    try:
        uid_list = None
        if user_ids:
            uid_list = [u.strip() for u in user_ids.split(",") if u.strip()]
        channels = await dm_svc.list_dm_channels(
            bot_id, limit=limit, user_ids=uid_list
        )
        return {
            "channels": channels,
            "token_configured": dm_svc.token_configured(bot_id),
        }
    except ValueError as e:
        raise HTTPException(400, detail=str(e)) from e


@router.get("/{bot_id}/dms/{channel_id}/messages")
async def get_messages(
    bot_id: str,
    channel_id: str,
    limit: int = Query(50, ge=1, le=100),
    before: Optional[str] = None,
):
    try:
        messages = await dm_svc.get_channel_messages(
            bot_id, channel_id, limit=limit, before=before
        )
        return {"messages": messages}
    except Exception as e:
        raise HTTPException(502, detail=str(e)) from e


@router.post("/{bot_id}/dms/{channel_id}/messages")
async def send_message(bot_id: str, channel_id: str, body: SendMessageBody):
    try:
        msg = await dm_svc.send_dm_message(bot_id, channel_id, body.content)
        return {"message": msg}
    except Exception as e:
        raise HTTPException(502, detail=str(e)) from e


@router.post("/{bot_id}/dms/open")
async def open_dm(bot_id: str, body: OpenDmBody):
    try:
        channel = await dm_svc.open_dm(bot_id, body.user_id)
        return {"channel": channel}
    except Exception as e:
        raise HTTPException(502, detail=str(e)) from e
