"""Shared secret authentication for control API."""
from __future__ import annotations

import os
from typing import Optional

from fastapi import Header, HTTPException


def verify_control_key(x_control_key: Optional[str] = Header(default=None)) -> None:
    secret = os.environ.get("CONTROL_API_SECRET", "")
    if not secret:
        raise HTTPException(status_code=503, detail="Control API secret not configured")
    if not x_control_key or x_control_key != secret:
        raise HTTPException(status_code=401, detail="Invalid control key")
