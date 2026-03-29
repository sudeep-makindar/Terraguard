package com.sentinel.core.model

import kotlinx.serialization.Serializable

@Serializable
enum class AlertSeverity {
    Safe,
    Warning,
    Critical,
    UltraCritical
}

@Serializable
data class SensorReading(
    val device: Device,
    val gps: Gps,
    val vibration: Vibration,
    val motion: Motion,
    val radar: Radar,
    val ir: Ir,
    val buzzer: Buzzer = Buzzer(state = 0),
    val maintenance: Maintenance = Maintenance(active = false, remaining_ms = 0, card_id = ""),
    val mobileGpsSyncActive: Boolean = false,
    val rawJsonLog: String = ""
) {
    val nodeId: String get() = device.id
    val timestampEpochMs: Long get() = System.currentTimeMillis()
    val rssi: Int get() = device.rssi
    val latitude: Double get() = gps.lat
    val longitude: Double get() = gps.lng
    val mapLatitude: Double get() = if (gpsWarmingUp) 10.9601 else gps.lat
    val mapLongitude: Double get() = if (gpsWarmingUp) 78.6747 else gps.lng
    val gpsWarmingUp: Boolean get() = gps.lat == 0.0
    val vibrationRms: Float get() = vibration.magnitude.toFloat()
    val dbLevel: Float get() = (vibration.magnitude * 42.0).toFloat()
    val turbidity: Float get() = ir.analog_value.toFloat()
    val pirStatus: Int get() = motion.pir_status
    val radarAlert: Boolean get() = radar.alert
    val closestCm: Int get() = radar.closest_cm
    val proximityDistanceCm: Double get() = radar.distance_cm
    val incidentConfidenceBoostPercent: Int get() = if (pirStatus == 1 || radarAlert) 30 else 0
    val batteryPercent: Int get() = device.batteryPercent ?: (((rssi + 100).coerceIn(0, 60) / 60.0) * 100).toInt()
    val isTampered: Boolean get() = false

    val severity: AlertSeverity
        get() {
            var level = AlertSeverity.Safe

            if (vibration.magnitude > 2.0) {
                level = AlertSeverity.Critical
            } else if (vibration.magnitude > 1.1) {
                level = AlertSeverity.Warning
            }

            if (ir.analog_value < 100) {
                level = AlertSeverity.Critical
            } else if (ir.analog_value < 3000 && level == AlertSeverity.Safe) {
                level = AlertSeverity.Warning
            }

            if ((pirStatus == 1 || radar.alert) && level == AlertSeverity.Safe) {
                level = AlertSeverity.Warning
            }

            if ((pirStatus == 1 && (radar.alert || closestCm in 1..20)) && level != AlertSeverity.UltraCritical) {
                level = AlertSeverity.Critical
            }

            if (incidentConfidenceBoostPercent >= 30 && level == AlertSeverity.Warning) {
                level = AlertSeverity.Critical
            }

            return level
        }
}

@Serializable
data class Device(
    val id: String,
    val rssi: Int,
    val uptimeMs: Long = 0,
    val commMode: String = "unknown",
    val batteryPercent: Int? = null
)

@Serializable
data class Gps(
    val lat: Double,
    val lng: Double,
    val altitude_m: Double = 0.0,
    val speed_kmh: Double = 0.0,
    val satellites: Int = 0,
    val fix: Int = 0,
    val hdop: Double = 99.99,
    val utc_time: String = "00:00:00",
    val date: String = "00/00/00"
)

@Serializable
data class Vibration(
    val magnitude: Double,
    val accel_x: Double = 0.0,
    val accel_y: Double = 0.0,
    val accel_z: Double = 0.0,
    val gyro_x: Double = 0.0,
    val gyro_y: Double = 0.0,
    val gyro_z: Double = 0.0
)

@Serializable
data class Motion(
    val pir_status: Int
)

@Serializable
data class Radar(
    val alert: Boolean,
    val closest_cm: Int,
    val distance_cm: Double = 0.0
)

@Serializable
data class Ir(
    val analog_value: Int
)

@Serializable
data class Buzzer(
    val state: Int
)

@Serializable
data class Maintenance(
    val active: Boolean,
    val remaining_ms: Long,
    val card_id: String
)

sealed interface SensorState {
    data class Live(
        val readings: List<SensorReading>,
        val fetchedAtEpochMs: Long = System.currentTimeMillis()
    ) : SensorState

    data class Offline(
        val message: String,
        val lastKnownReadings: List<SensorReading> = emptyList(),
        val fetchedAtEpochMs: Long = System.currentTimeMillis()
    ) : SensorState
}

@Serializable
data class SystemEvent(
    val id: String,
    val title: String,
    val detail: String,
    val timestampEpochMs: Long,
    val severity: AlertSeverity
)

@Serializable
data class BreachTimelineEntry(
    val id: String,
    val displayTime: String,
    val eventDescription: String,
    val severity: AlertSeverity
)

@Serializable
data class IncidentReport(
    val id: Long,
    val timestampEpochMs: Long,
    val latitude: Double,
    val longitude: Double,
    val nearbyNodeId: String?,
    val imagePath: String,
    val uploaded: Boolean,
    val multiSourceVerified: Boolean
)

@Serializable
data class NodeDetail(
    val nodeId: String,
    val generatedAtEpochMs: Long,
    val latitude: Double,
    val longitude: Double,
    val vibrationTrend: List<Float>,
    val dbTrend: List<Float>,
    val timeline: List<BreachTimelineEntry>,
    val citizenReportId: Long?,
    val closestIntruderCm: Int?,
    val verificationScore: Int,
    val rawJsonLog: String
)
