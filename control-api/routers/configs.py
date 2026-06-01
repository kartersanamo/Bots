from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from typing import Any, Dict, List, Union

from pydantic import BaseModel

from auth import verify_control_key
from services import configs as cfg

router = APIRouter(prefix="/bots", tags=["configs"], dependencies=[Depends(verify_control_key)])


class ConfigWriteBody(BaseModel):
    content: Union[Dict[str, Any], List[Any]]


@router.get("/{bot_id}/config")
def get_config(bot_id: str, path: str):
    try:
        return cfg.read_config(bot_id, path)
    except FileNotFoundError as e:
        raise HTTPException(404, detail=str(e)) from e
    except (ValueError, json.JSONDecodeError) as e:
        raise HTTPException(400, detail=str(e)) from e


@router.put("/{bot_id}/config")
def put_config(bot_id: str, path: str, body: ConfigWriteBody):
    try:
        return cfg.write_config(bot_id, path, body.content)
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(400, detail=str(e)) from e


@router.get("/{bot_id}/config/backups")
def list_config_backups(bot_id: str, path: str):
    return {"backups": cfg.list_backups(bot_id, path)}


@router.post("/{bot_id}/config/restore")
def restore_config(bot_id: str, path: str, backup: str):
    try:
        return cfg.restore_backup(bot_id, path, backup)
    except FileNotFoundError as e:
        raise HTTPException(404, detail=str(e)) from e
