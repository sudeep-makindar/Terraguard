"""
TerraGuard — SQLAlchemy async ORM models.
All primary keys are UUID4, stored as native UUIDs in PostgreSQL.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    device_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    raw_payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    confidence: Mapped[int] = mapped_column(Integer, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(16), nullable=False)
    alert_triggered: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # relationship
    alert: Mapped["Alert | None"] = relationship(
        "Alert", back_populates="sensor_reading", uselist=False
    )


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    sensor_reading_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sensor_readings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    device_id: Mapped[str] = mapped_column(String(128), nullable=False)
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    confidence: Mapped[int] = mapped_column(Integer, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(16), nullable=False)
    reasons: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="NEW", index=True
    )
    officer_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    fir_generated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # relationships
    sensor_reading: Mapped["SensorReading"] = relationship(
        "SensorReading", back_populates="alert"
    )
    fir_record: Mapped["FIRRecord | None"] = relationship(
        "FIRRecord", back_populates="alert", uselist=False
    )


class FIRRecord(Base):
    __tablename__ = "fir_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    alert_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("alerts.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    filed_by: Mapped[str] = mapped_column(String(256), nullable=False)
    station_name: Mapped[str] = mapped_column(String(256), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="DRAFT")
    # Full FIR field values — auto-filled from alert + officer input
    fir_data: Mapped[dict] = mapped_column(JSONB, nullable=False)

    # relationship
    alert: Mapped["Alert"] = relationship("Alert", back_populates="fir_record")
