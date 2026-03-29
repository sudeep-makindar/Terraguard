"""
TerraGuard — FIR router.
POST  /api/alerts/{alert_id}/fir     ← generate FIR from alert
GET   /api/fir/{fir_id}
PATCH /api/fir/{fir_id}/status
"""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models import Alert, FIRRecord, SensorReading
from schemas import FIRCreateRequest, FIROut, FIRStatusUpdate
from websocket import manager

router = APIRouter(prefix="/api", tags=["fir"])


@router.post("/alerts/{alert_id}/fir", response_model=FIROut, status_code=201)
async def generate_fir(
    alert_id: uuid.UUID,
    body: FIRCreateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FIRRecord:
    """
    Auto-fill a FIR from the alert row + officer input.
    All sensor fields are derived from the linked sensor_reading — never
    sent by the frontend a second time.
    """
    # Load alert + sensor reading + existing fir
    stmt = (
        select(Alert)
        .where(Alert.id == alert_id)
        .options(
            selectinload(Alert.sensor_reading),
            selectinload(Alert.fir_record),
        )
    )
    result = await db.execute(stmt)
    alert = result.scalar_one_or_none()
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.fir_record is not None:
        raise HTTPException(
            status_code=409,
            detail=f"FIR already exists for this alert: {alert.fir_record.id}",
        )

    # Build auto-filled FIR data from alert + raw sensor snapshot
    raw: dict = alert.sensor_reading.raw_payload if alert.sensor_reading else {}
    vib = raw.get("vibration", {})
    prox = raw.get("proximity", {})
    mot = raw.get("motion", {})
    gps = raw.get("gps", {})

    fir_data: dict = {
        "incident_date_time": alert.triggered_at.isoformat(),
        "location": (
            f"{gps.get('lat', alert.lat):.5f}°N, {gps.get('lng', alert.lng):.5f}°E"
            if (alert.lat or gps.get("lat"))
            else "Unknown"
        ),
        "nature_of_offence": "Illegal Sand Mining under MM(DR) Act 1957",
        "evidence_reference": str(alert.id),
        "sensor_readings_summary": (
            f"Vibration: {vib.get('magnitude', 'N/A')}g | "
            f"Motion: {'YES' if mot.get('pir_status') == 1 else 'NO'} | "
            f"Distance: {prox.get('distance_cm', 'N/A')} cm | "
            f"Confidence: {alert.confidence}%"
        ),
        "confidence_score": alert.confidence,
        "risk_level": alert.risk_level,
        "ai_reasons": alert.reasons,
        "reporting_officer": body.filed_by,
        "witness_source": f"TerraGuard IoT Node — {alert.device_id}",
        "station_name": body.station_name,
        "additional_notes": body.additional_notes,
        "gps_coordinates": {
            "lat": alert.lat,
            "lng": alert.lng,
            "satellites": gps.get("satellites"),
            "hdop": gps.get("hdop"),
            "altitude_m": gps.get("altitude_m"),
        },
        "device_id": alert.device_id,
    }

    fir = FIRRecord(
        id=uuid.uuid4(),
        alert_id=alert.id,
        filed_by=body.filed_by,
        station_name=body.station_name,
        status="DRAFT",
        fir_data=fir_data,
    )
    db.add(fir)

    # Mark alert as having a FIR
    alert.fir_generated = True
    await db.commit()
    await db.refresh(fir)

    # Broadcast FIR creation to all dashboards
    await manager.broadcast({
        "type": "fir_created",
        "data": {
            "id": str(fir.id),
            "alert_id": str(fir.alert_id),
            "status": fir.status,
            "filed_by": fir.filed_by,
            "station_name": fir.station_name,
            "generated_at": fir.generated_at.isoformat(),
            "fir_data": fir.fir_data
        }
    })

    return fir


@router.get("/firs", response_model=list[FIROut])
async def list_firs(
    db: Annotated[AsyncSession, Depends(get_db)]
) -> list[FIRRecord]:
    result = await db.execute(select(FIRRecord).order_by(FIRRecord.generated_at.desc()))
    return list(result.scalars().all())

@router.get("/fir/{fir_id}", response_model=FIROut)
async def get_fir(
    fir_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FIRRecord:
    result = await db.execute(select(FIRRecord).where(FIRRecord.id == fir_id))
    fir = result.scalar_one_or_none()
    if fir is None:
        raise HTTPException(status_code=404, detail="FIR record not found")
    return fir


@router.patch("/fir/{fir_id}/status", response_model=FIROut)
async def update_fir_status(
    fir_id: uuid.UUID,
    body: FIRStatusUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FIRRecord:
    result = await db.execute(select(FIRRecord).where(FIRRecord.id == fir_id))
    fir = result.scalar_one_or_none()
    if fir is None:
        raise HTTPException(status_code=404, detail="FIR record not found")
    fir.status = body.status
    await db.commit()
    await db.refresh(fir)

    # Broadcast status change
    await manager.broadcast({
        "type": "fir_status_update",
        "data": {
            "fir_id": str(fir.id),
            "status": fir.status
        }
    })

    return fir
