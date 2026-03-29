"""
TerraGuard — Confidence Score Detection Engine
Optimized for the latest ESP32 hardware including Radar and IR sensing.
"""
from __future__ import annotations

from typing import Any
import logging

logger = logging.getLogger(__name__)

def calculate_confidence(payload: Any) -> dict[str, Any]:
    """
    Compute a mining-activity confidence score from a validated hardware payload.

    Scoring weights (max 100):
      +30  Vibration magnitude > 1.5 g (Heavy vehicle/machinery)
      +25  PIR motion detected (Human presence)
      +20  Radar Object detected within 500 cm
      +15  Radar Alert flag (High-speed approach or pattern)
      +10  IR Analog Value indicates nighttime/darkness (< 150)

    Returns a dict with: confidence, risk_level, reasons, alert, action.
    """
    score: int = 0
    reasons: list[str] = []

    magnitude: float = getattr(payload.vibration, 'magnitude', 0)
    closest_dist: float = getattr(payload.proximity, 'distance_cm', -1)
    ir_val: int = getattr(payload.ir, 'analog_value', 1024)

    # ── Composite Scoring Logic ──────────────────────────────────────────────
    if magnitude > 1.1:
        score += 55
        reasons.append(f"MAJOR: Vibration magnitude {magnitude:.2f}g suggests heavy machinery")

    if 0 < closest_dist <= 15:
        score += 55
        reasons.append(f"MAJOR: EXTREME PROXIMITY! Object at {closest_dist:.1f} cm")
    elif 15 < closest_dist < 500:
        score += 10
        reasons.append(f"MINOR: Object detected at {closest_dist:.1f} cm")

    if ir_val < 100:
        score += 55
        reasons.append(f"MAJOR: Severe IR darkness (Value: {ir_val})")
    elif ir_val < 150:
        score += 5
        reasons.append(f"MINOR: IR darkness threshold met (Value: {ir_val})")

    # Maintain PIR integration fallback
    override_pir = 1 if (0 < closest_dist <= 15) else 0
    if override_pir == 1:
        score += 5
        reasons.append("MINOR: PIR sensor confirmed riverbank motion")

    # ── Risk level mapping ───────────────────────────────────────────────────
    if score >= 80:
        risk_level = "CRITICAL"
    elif score >= 55:
        risk_level = "HIGH"
    elif score >= 30:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    alert_triggered: bool = score >= 80
    buzzer: bool = risk_level == "CRITICAL"

    return {
        "confidence": score,
        "risk_level": risk_level,
        "reasons": reasons,
        "alert": alert_triggered,
        "action": {
            "buzzer": buzzer,
            "notify_officer": alert_triggered,
            "log_evidence": alert_triggered,
        },
    }
