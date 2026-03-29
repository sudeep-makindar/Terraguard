"""
TerraGuard — Buzzer command router.
POST /api/buzzer → broadcasts buzzer command to all WS clients.
The ESP32 listens on its WebSocket connection for this event.
"""
from __future__ import annotations

from fastapi import APIRouter

from schemas import BuzzerCommand
from websocket import manager

router = APIRouter(prefix="/api", tags=["buzzer"])


@router.post("/buzzer", status_code=200)
async def send_buzzer_command(body: BuzzerCommand) -> dict:
    """
    Broadcast a buzzer ON/OFF command to all connected WebSocket clients.
    The ESP32 client (or a bridge) listens for type='buzzer_command' and
    activates/deactivates the physical buzzer accordingly.
    """
    event = {
        "type": "buzzer_command",
        "data": {
            "device_id": body.device_id,
            "state": body.state,
        },
    }
    await manager.broadcast(event)
    return {"ok": True, "device_id": body.device_id, "state": body.state}
