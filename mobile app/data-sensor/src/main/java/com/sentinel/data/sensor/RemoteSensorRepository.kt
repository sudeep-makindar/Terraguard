package com.sentinel.data.sensor

import android.annotation.SuppressLint
import android.content.Context
import android.util.Log
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.tasks.Task
import com.sentinel.core.model.SensorState
import com.sentinel.core.model.Device
import com.sentinel.core.model.Gps
import com.sentinel.core.model.Ir
import com.sentinel.core.model.Buzzer
import com.sentinel.core.model.Maintenance
import com.sentinel.core.model.Motion
import com.sentinel.core.model.Radar
import com.sentinel.core.model.SensorReading
import com.sentinel.core.model.Vibration
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.flow
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume

@Singleton
class RemoteSensorRepository @Inject constructor(
    private val httpClient: HttpClient,
    @ApplicationContext private val context: Context
) : SensorRepository {

    private val fusedLocationClient: FusedLocationProviderClient by lazy {
        LocationServices.getFusedLocationProviderClient(context)
    }

    override fun getLiveUpdates(): Flow<SensorState> = flow {
        var lastKnown: List<SensorReading> = emptyList()
        while (true) {
            try {
                val raw = httpClient.get("http://172.16.41.167:6767/latest").bodyAsText()
                lastKnown = parseReadings(raw)
                lastKnown = injectMobileGpsFallback(lastKnown)
                Log.d("RemoteSensorRepository", "Fetched ${lastKnown.size} reading(s) from endpoint")
                emit(SensorState.Live(readings = lastKnown))
            } catch (t: Throwable) {
                Log.e("RemoteSensorRepository", "Polling failed", t)
                emit(
                    SensorState.Offline(
                        message = "Connection Lost: ${t.javaClass.simpleName} ${t.message ?: "Unknown error"}",
                        lastKnownReadings = lastKnown
                    )
                )
            }
            delay(1_000)
        }
    }

    private fun parseReadings(raw: String): List<SensorReading> {
        val element = sensorJson.parseToJsonElement(raw)
        return when (element) {
            is JsonArray -> element.mapNotNull { it.asReadingOrNull(raw) }
            is JsonObject -> listOfNotNull(element.asReadingOrNull(raw))
            else -> emptyList()
        }
    }

    @SuppressLint("MissingPermission")
    private suspend fun injectMobileGpsFallback(readings: List<SensorReading>): List<SensorReading> {
        if (readings.none { it.gps.lat == 0.0 }) return readings

        val fallbackLocation = runCatching { awaitTask(fusedLocationClient.lastLocation) }.getOrNull()
        if (fallbackLocation == null) return readings

        return readings.map { reading ->
            if (reading.gps.lat == 0.0) {
                reading.copy(
                    gps = Gps(lat = fallbackLocation.latitude, lng = fallbackLocation.longitude),
                    mobileGpsSyncActive = true
                )
            } else {
                reading
            }
        }
    }
}

private fun JsonElement.asReadingOrNull(raw: String): SensorReading? {
    val obj = this as? JsonObject ?: return null
    val deviceObj = obj["device"] as? JsonObject ?: return null
    val gpsObj = obj["gps"] as? JsonObject ?: JsonObject(emptyMap())
    val vibObj = obj["vibration"] as? JsonObject ?: JsonObject(emptyMap())
    val motionObj = obj["motion"] as? JsonObject ?: JsonObject(emptyMap())
    val radarObj = obj["radar"] as? JsonObject ?: JsonObject(emptyMap())
    val proximityObj = obj["proximity"] as? JsonObject ?: JsonObject(emptyMap())
    val irObj = obj["ir"] as? JsonObject ?: JsonObject(emptyMap())
    val buzzerObj = obj["buzzer"] as? JsonObject ?: JsonObject(emptyMap())
    val maintenanceObj = obj["maintenance"] as? JsonObject ?: JsonObject(emptyMap())

    val proximityDistance = proximityObj.double("distance_cm")
        ?: radarObj.double("distance_cm")
        ?: radarObj.int("closest_cm")?.toDouble()
        ?: 0.0
    val closestCm = proximityDistance.toInt()
    val radarAlert = (radarObj.bool("alert") ?: false) || (closestCm in 1..100)

    return SensorReading(
        device = Device(
            id = deviceObj.string("id") ?: "UNKNOWN",
            rssi = deviceObj.int("rssi") ?: -120,
            uptimeMs = deviceObj.long("uptime_ms") ?: 0L,
            commMode = deviceObj.string("comm_mode") ?: "unknown",
            batteryPercent = deviceObj.int("battery_percent")
        ),
        gps = Gps(
            lat = gpsObj.double("lat") ?: 0.0,
            lng = gpsObj.double("lng") ?: 0.0,
            altitude_m = gpsObj.double("altitude_m") ?: 0.0,
            speed_kmh = gpsObj.double("speed_kmh") ?: 0.0,
            satellites = gpsObj.int("satellites") ?: 0,
            fix = gpsObj.int("fix") ?: 0,
            hdop = gpsObj.double("hdop") ?: 99.99,
            utc_time = gpsObj.string("utc_time") ?: "00:00:00",
            date = gpsObj.string("date") ?: "00/00/00"
        ),
        vibration = Vibration(
            magnitude = vibObj.double("magnitude") ?: 0.0,
            accel_x = vibObj.double("accel_x") ?: 0.0,
            accel_y = vibObj.double("accel_y") ?: 0.0,
            accel_z = vibObj.double("accel_z") ?: 0.0,
            gyro_x = vibObj.double("gyro_x") ?: 0.0,
            gyro_y = vibObj.double("gyro_y") ?: 0.0,
            gyro_z = vibObj.double("gyro_z") ?: 0.0
        ),
        motion = Motion(
            pir_status = motionObj.int("pir_status") ?: 0
        ),
        radar = Radar(
            alert = radarAlert,
            closest_cm = closestCm,
            distance_cm = proximityDistance
        ),
        ir = Ir(
            analog_value = irObj.int("analog_value") ?: 4095
        ),
        buzzer = Buzzer(
            state = buzzerObj.int("state") ?: 0
        ),
        maintenance = Maintenance(
            active = maintenanceObj.bool("active") ?: false,
            remaining_ms = maintenanceObj.long("remaining_ms") ?: 0L,
            card_id = maintenanceObj.string("card_id") ?: ""
        ),
        rawJsonLog = raw
    )
}

private fun JsonObject.string(key: String): String? {
    val p = this[key] as? JsonPrimitive ?: return null
    return p.content
}

private fun JsonObject.int(key: String): Int? {
    val p = this[key] as? JsonPrimitive ?: return null
    return p.content.toIntOrNull()
}

private fun JsonObject.long(key: String): Long? {
    val p = this[key] as? JsonPrimitive ?: return null
    return p.content.toLongOrNull()
}

private fun JsonObject.double(key: String): Double? {
    val p = this[key] as? JsonPrimitive ?: return null
    return p.content.toDoubleOrNull()
}

private fun JsonObject.bool(key: String): Boolean? {
    val p = this[key] as? JsonPrimitive ?: return null
    return p.content.toBooleanStrictOrNull()
}

private val sensorJson = Json {
    ignoreUnknownKeys = true
    isLenient = true
}

private suspend fun <T> awaitTask(task: Task<T>): T? {
    return suspendCancellableCoroutine { cont ->
        task.addOnSuccessListener { cont.resume(it) }
            .addOnFailureListener { cont.resume(null) }
    }
}
