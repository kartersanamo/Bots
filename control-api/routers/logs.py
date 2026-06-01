from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query

from auth import verify_control_key
from services import logs as log_svc

router = APIRouter(prefix="/bots", tags=["logs"], dependencies=[Depends(verify_control_key)])


@router.get("/{bot_id}/logs")
def tail_bot_logs(
    bot_id: str,
    lines: int = Query(100, ge=1, le=2000),
    search: Optional[str] = None,
    file: Optional[str] = None,
):
    return log_svc.tail_logs(bot_id, lines=lines, search=search, file_name=file)
