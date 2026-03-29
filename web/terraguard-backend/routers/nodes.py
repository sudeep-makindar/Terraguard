"""
TerraGuard — Node health and stats routers.
GET /api/nodes
GET /api/stats
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import distinct, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Alert, SensorReading
from schemas import NodeInfo, StatsOut

router = APIRouter(prefix="/api", tags=["nodes"])


@router.get("/nodes", response_model=list[NodeInfo])
async def list_nodes(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[NodeInfo]:
    """
    Return each distinct device_id with its most recent heartbeat data.
    Uses a correlated subquery to get the latest row per device.
    """
    # Subquery: latest received_at per device
    subq = (
        select(
            SensorReading.device_id,
            func.max(SensorReading.received_at).label("max_ts"),
        )
        .group_by(SensorReading.device_id)
        .subquery()
    )

    stmt = (
        select(SensorReading)
        .join(
            subq,
            (SensorReading.device_id == subq.c.device_id)
            & (SensorReading.received_at == subq.c.max_ts),
        )
        .order_by(SensorReading.received_at.desc())
    )

    rows = (await db.execute(stmt)).scalars().all()

    nodes: list[NodeInfo] = []
    for row in rows:
        raw: dict = row.raw_payload or {}
        dev: dict = raw.get("device", {})
        gps: dict = raw.get("gps", {})
        nodes.append(
            NodeInfo(
                device_id=row.device_id,
                last_seen=row.received_at,
                rssi=dev.get("rssi"),
                uptime_ms=dev.get("uptime_ms"),
                free_heap=dev.get("free_heap"),
                satellites=gps.get("satellites"),
            )
        )
    return nodes


@router.get("/stats", response_model=StatsOut)
async def get_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StatsOut:
    """Return aggregate dashboard statistics."""
    now = datetime.now(timezone.utc)
    last_24h = now - timedelta(hours=24)

    # Total alerts
    total_alerts: int = (
        await db.execute(select(func.count()).select_from(Alert))
    ).scalar_one()

    # CRITICAL count
    critical_count: int = (
        await db.execute(
            select(func.count()).select_from(Alert).where(Alert.risk_level == "CRITICAL")
        )
    ).scalar_one()

    # HIGH count
    high_count: int = (
        await db.execute(
            select(func.count()).select_from(Alert).where(Alert.risk_level == "HIGH")
        )
    ).scalar_one()

    # Alerts in last 24 h
    alerts_last_24h: int = (
        await db.execute(
            select(func.count())
            .select_from(Alert)
            .where(Alert.triggered_at >= last_24h)
        )
    ).scalar_one()

    # Active nodes (distinct device_ids seen in last 24 h)
    active_nodes: int = (
        await db.execute(
            select(func.count(distinct(SensorReading.device_id))).where(
                SensorReading.received_at >= last_24h
            )
        )
    ).scalar_one()

    # Average confidence across all alerts
    avg_conf = (
        await db.execute(select(func.avg(Alert.confidence)))
    ).scalar_one()

    return StatsOut(
        total_alerts=total_alerts,
        critical_count=critical_count,
        high_count=high_count,
        alerts_last_24h=alerts_last_24h,
        active_nodes=active_nodes,
        avg_confidence=round(float(avg_conf or 0), 1),
    )
