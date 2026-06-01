from fastapi import APIRouter, Depends, HTTPException

from auth import verify_control_key
from services import processes as proc

router = APIRouter(prefix="/bots", tags=["processes"], dependencies=[Depends(verify_control_key)])


@router.get("/{bot_id}/status")
def bot_status(bot_id: str):
    info = proc.get_process_info(bot_id)
    if info.message == "Unknown bot":
        raise HTTPException(404, detail="Unknown bot")
    return {
        "botId": info.bot_id,
        "status": info.status,
        "pid": info.pid,
        "uptimeSeconds": info.uptime_seconds,
        "systemdUnit": info.systemd_unit,
        "message": info.message,
    }


@router.get("/status")
def all_status():
    from bot_registry import BOT_ENTRIES

    bots = []
    for bid in BOT_ENTRIES:
        info = proc.get_process_info(bid)
        bots.append(
            {
                "botId": info.bot_id,
                "status": info.status,
                "pid": info.pid,
                "uptimeSeconds": info.uptime_seconds,
            }
        )
    return {"bots": bots}


@router.post("/{bot_id}/start")
def bot_start(bot_id: str):
    try:
        info = proc.start_bot(bot_id)
        return {"ok": True, "status": info.status, "pid": info.pid}
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(404, detail=str(e)) from e
    except RuntimeError as e:
        raise HTTPException(500, detail=str(e)) from e


@router.post("/{bot_id}/stop")
def bot_stop(bot_id: str):
    try:
        info = proc.stop_bot(bot_id)
        return {"ok": True, "status": info.status}
    except (ValueError, RuntimeError) as e:
        raise HTTPException(500, detail=str(e)) from e


@router.post("/{bot_id}/restart")
def bot_restart(bot_id: str):
    try:
        info = proc.restart_bot(bot_id)
        return {"ok": True, "status": info.status, "pid": info.pid}
    except (ValueError, FileNotFoundError, RuntimeError) as e:
        raise HTTPException(500, detail=str(e)) from e
