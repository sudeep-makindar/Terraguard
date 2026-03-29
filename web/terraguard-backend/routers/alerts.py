"""
TerraGuard — Alerts router.
GET   /api/alerts
GET   /api/alerts/{alert_id}
PATCH /api/alerts/{alert_id}/status
"""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models import Alert, FIRRecord, SensorReading
from schemas import (
    AlertOut,
    AlertPage,
    AlertStatusUpdate,
    AlertWithSnapshot,
    FIRSummary,
)
from websocket import manager

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=AlertPage)
async def list_alerts(
    db: Annotated[AsyncSession, Depends(get_db)],
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> AlertPage:
    """Return paginated alerts, optionally filtered by status."""
    base = select(Alert)
    count_base = select(func.count()).select_from(Alert)

    if status:
        base = base.where(Alert.status == status)
        count_base = count_base.where(Alert.status == status)

    total: int = (await db.execute(count_base)).scalar_one()
    
    # We must explicitly load relations to fulfill AlertWithSnapshot for historical alerts!
    base = base.options(
        selectinload(Alert.sensor_reading),
        selectinload(Alert.fir_record)
    )
    
    rows = (
        await db.execute(
            base.order_by(Alert.triggered_at.desc()).limit(limit).offset(offset)
        )
    ).scalars().all()

    items = []
    for alert in rows:
        fir_summary = FIRSummary.model_validate(alert.fir_record) if alert.fir_record else None
        raw = alert.sensor_reading.raw_payload if alert.sensor_reading else None
        
        items.append(
            AlertWithSnapshot(
                **AlertOut.model_validate(alert).model_dump(),
                raw_payload=raw,
                fir_record=fir_summary,
            )
        )

    return AlertPage(total=total, limit=limit, items=items)


@router.get("/{alert_id}", response_model=AlertWithSnapshot)
async def get_alert(
    alert_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AlertWithSnapshot:
    """Return a single alert with its raw sensor snapshot and linked FIR."""
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

    fir_summary: FIRSummary | None = None
    if alert.fir_record:
        fir_summary = FIRSummary.model_validate(alert.fir_record)

    raw: dict | None = (
        alert.sensor_reading.raw_payload if alert.sensor_reading else None
    )

    return AlertWithSnapshot(
        **AlertOut.model_validate(alert).model_dump(),
        raw_payload=raw,
        fir_record=fir_summary,
    )


@router.patch("/{alert_id}/status", response_model=AlertOut)
async def update_alert_status(
    alert_id: uuid.UUID,
    body: AlertStatusUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Alert:
    """Update alert status to ACKNOWLEDGED or RESOLVED and optionally add a note."""
    stmt = select(Alert).where(Alert.id == alert_id)
    result = await db.execute(stmt)
    alert = result.scalar_one_or_none()
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = body.status
    if body.officer_note is not None:
        alert.officer_note = body.officer_note

    await db.commit()
    await db.refresh(alert)

    # Broadcast status change
    await manager.broadcast(
        {
            "type": "alert_status_update",
            "data": {
                "alert_id": str(alert.id),
                "status": alert.status,
                "officer_note": alert.officer_note,
            },
        }
    )

    return alert
