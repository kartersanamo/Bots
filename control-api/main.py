"""Minecadia Bots Control API — localhost only, shared-secret auth."""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

# Load env from Websites/Bots/.env when present
_env_path = Path(__file__).resolve().parent.parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)

from routers import configs, dms, logs, processes  # noqa: E402

app = FastAPI(
    title="Minecadia Bots Control API",
    version="1.0.0",
    docs_url="/docs" if os.environ.get("CONTROL_API_DEBUG") else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:3000", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(processes.router)
app.include_router(configs.router)
app.include_router(logs.router)
app.include_router(dms.router)


@app.get("/health")
def health(x_control_key: Optional[str] = Header(default=None)):
    secret = os.environ.get("CONTROL_API_SECRET", "")
    if secret and (not x_control_key or x_control_key != secret):
        raise HTTPException(status_code=401, detail="Invalid control key")
    return {"ok": True, "service": "bots-control-api"}


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("CONTROL_API_HOST", "127.0.0.1")
    port = int(os.environ.get("CONTROL_API_PORT", "8787"))
    uvicorn.run("main:app", host=host, port=port, reload=False)
