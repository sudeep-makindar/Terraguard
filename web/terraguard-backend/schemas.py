"""
TerraGuard — Pydantic v2 request/response schemas.
Mirrors the exact ESP32 payload structure + all API I/O contracts.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field


# ─── ESP32 Inbound Payload ────────────────────────────────────────────────────

class DeviceInfo(BaseModel):
    id: str
    uptime_ms: int
    comm_mode: Optional[str] = "wifi"
    rssi: int
    free_heap: Optional[int] = 0
    cpu_freq_mhz: Optional[int] = 0
    # Make timestamp optional as some firmwares might send it via other fields or depend on server time
    timestamp: Optional[datetime] = Field(default_factory=datetime.now) 


class GPSData(BaseModel):
    lat: float
    lng: float
    altitude_m: float
    speed_kmh: float
    heading_deg: Optional[float] = 0
    satellites: int
    fix: int
    hdop: float
    utc_time: str
    date: str


class VibrationData(BaseModel):
    accel_x: float
    accel_y: float
    accel_z: float
    gyro_x: float
    gyro_y: float
    gyro_z: float
    magnitude: float
    temperature_c: Optional[float] = 0


class MotionData(BaseModel):
    pir_status: int = Field(ge=0, le=1)


class ProximityData(BaseModel):
    distance_cm: float


class IRData(BaseModel):
    analog_value: int
    digital_status: Optional[int] = 0


class MaintenanceData(BaseModel):
    active: bool
    remaining_ms: int
    card_id: str


class BuzzerData(BaseModel):
    state: int = Field(ge=0, le=1)


class SensorPayload(BaseModel):
    """Root model for the complete ESP32 POST body based on the latest hardware version."""
    device: DeviceInfo
    gps: GPSData
    vibration: VibrationData
    motion: MotionData
    proximity: ProximityData
    ir: IRData
    buzzer: BuzzerData
    maintenance: MaintenanceData


# ─── Detection Result ─────────────────────────────────────────────────────────

class ActionResponse(BaseModel):
    buzzer: bool
    notify_officer: bool
    log_evidence: bool


class DetectionResponse(BaseModel):
    alert: bool
    confidence: int
    risk_level: str
    reasons: list[str]
    action: ActionResponse


# ─── Sensor Reading Responses ─────────────────────────────────────────────────

class SensorReadingOut(BaseModel):
    id: uuid.UUID
    device_id: str
    received_at: datetime
    raw_payload: dict[str, Any]
    confidence: int
    risk_level: str
    alert_triggered: bool

    model_config = {"from_attributes": True}


class SensorReadingPage(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[SensorReadingOut]


# ─── FIR Schemas ─────────────────────────────────────────────────────────────

class FIRCreateRequest(BaseModel):
    filed_by: str
    station_name: str
    additional_notes: str = ""

class FIROut(BaseModel):
    id: uuid.UUID
    alert_id: uuid.UUID
    generated_at: datetime
    filed_by: str
    station_name: str
    status: str
    fir_data: dict[str, Any]
    model_config = {"from_attributes": True}

class FIRSummary(BaseModel):
    id: uuid.UUID
    status: str
    filed_by: str
    model_config = {"from_attributes": True}

class FIRStatusUpdate(BaseModel):
    status: str = Field(pattern="^(FILED|SUBMITTED_TO_COURT|REVIEWED)$")

# ─── Alert Schemas ────────────────────────────────────────────────────────────

class AlertOut(BaseModel):
    id: uuid.UUID
    sensor_reading_id: uuid.UUID
    device_id: str
    triggered_at: datetime
    confidence: int
    risk_level: str
    reasons: list[str]
    lat: float | None
    lng: float | None
    status: str
    officer_note: str | None
    fir_generated: bool

    model_config = {"from_attributes": True}


class AlertWithSnapshot(AlertOut):
    """Alert + raw sensor snapshot + linked FIR summary."""
    raw_payload: dict[str, Any] | None = None
    fir_record: FIRSummary | None = None


class AlertStatusUpdate(BaseModel):
    status: str = Field(pattern="^(ACKNOWLEDGED|RESOLVED)$")
    officer_note: str | None = None


class AlertPage(BaseModel):
    total: int
    limit: int
    items: list[AlertWithSnapshot]





# ─── Node / Stats Schemas ─────────────────────────────────────────────────────

class NodeInfo(BaseModel):
    device_id: str
    last_seen: datetime
    rssi: int | None
    uptime_ms: int | None
    free_heap: int | None
    satellites: int | None


class StatsOut(BaseModel):
    total_alerts: int
    critical_count: int
    high_count: int
    alerts_last_24h: int
    active_nodes: int
    avg_confidence: float


# ─── Buzzer Schemas ───────────────────────────────────────────────────────────

class BuzzerCommand(BaseModel):
    device_id: str
    state: bool
