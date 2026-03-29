"""
TerraGuard — Sensor data ingest router.
POST /api/sensor-data   ← ESP32 submits readings here
GET  /api/latest        ← most recent reading
GET  /api/history       ← paginated reading history
"""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from detection import calculate_confidence
from models import Alert, SensorReading
from schemas import (
    DetectionResponse,
    SensorPayload,
    SensorReadingOut,
    SensorReadingPage,
)
from websocket import manager

router = APIRouter(prefix="/api", tags=["sensor"])


@router.post("/sensor-data", response_model=DetectionResponse, status_code=200)
@router.post("/data", response_model=DetectionResponse, status_code=200)
async def ingest_sensor_data(
    payload: SensorPayload,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DetectionResponse:
    """
    Receive an ESP32 sensor payload, run the detection model,
    persist to DB, broadcast via WebSocket, and return the result.
    """
    # 1. Run detection model
    result = calculate_confidence(payload)

    # 2. Persist sensor reading
    reading = SensorReading(
        id=uuid.uuid4(),
        device_id=payload.device.id,
        raw_payload=payload.model_dump(mode="json"),
        confidence=result["confidence"],
        risk_level=result["risk_level"],
        alert_triggered=result["alert"],
    )
    db.add(reading)
    await db.flush()  # get reading.id before creating alert

    # 3. Persist alert if triggered
    alert_row: Alert | None = None
    if result["alert"]:
        alert_row = Alert(
            id=uuid.uuid4(),
            sensor_reading_id=reading.id,
            device_id=payload.device.id,
            confidence=result["confidence"],
            risk_level=result["risk_level"],
            reasons=result["reasons"],
            lat=payload.gps.lat,
            lng=payload.gps.lng,
            status="NEW",
        )
        db.add(alert_row)

    await db.commit()
    await db.refresh(reading)

    # 4. Broadcast sensor_update to all WS clients
    ws_event: dict = {
        "type": "sensor_update",
        "data": payload.model_dump(mode="json"),
        "detection": {
            "confidence": result["confidence"],
            "risk_level": result["risk_level"],
            "reasons": result["reasons"],
            "alert": result["alert"],
        },
    }
    await manager.broadcast(ws_event)

    # 5. Broadcast alert_triggered if applicable
    if alert_row:
        await db.refresh(alert_row)
        await manager.broadcast(
            {
                "type": "alert_triggered",
                "data": {
                    "id": str(alert_row.id),
                    "device_id": alert_row.device_id,
                    "triggered_at": alert_row.triggered_at.isoformat(),
                    "confidence": alert_row.confidence,
                    "risk_level": alert_row.risk_level,
                    "reasons": alert_row.reasons,
                    "lat": alert_row.lat,
                    "lng": alert_row.lng,
                    "status": alert_row.status,
                },
            }
        )

    return DetectionResponse(**result)


@router.get("/latest", response_model=SensorReadingOut)
async def get_latest_reading(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SensorReading:
    """Return the most recent sensor reading row."""
    stmt = (
        select(SensorReading)
        .order_by(SensorReading.received_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    reading = result.scalar_one_or_none()
    if reading is None:
        raise HTTPException(status_code=404, detail="No sensor readings found")
    return reading


@router.get("/history", response_model=SensorReadingPage)
async def get_reading_history(
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> SensorReadingPage:
    """Return paginated sensor readings, newest first."""
    count_stmt = select(func.count()).select_from(SensorReading)
    total: int = (await db.execute(count_stmt)).scalar_one()

    stmt = (
        select(SensorReading)
        .order_by(SensorReading.received_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = (await db.execute(stmt)).scalars().all()

    return SensorReadingPage(total=total, limit=limit, offset=offset, items=list(rows))
