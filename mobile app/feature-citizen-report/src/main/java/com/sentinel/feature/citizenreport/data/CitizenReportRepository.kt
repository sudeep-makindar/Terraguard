package com.sentinel.feature.citizenreport.data

import com.sentinel.core.model.AlertSeverity
import com.sentinel.core.model.IncidentReport
import com.sentinel.core.model.SensorReading
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

interface CitizenReportRepository {
    fun observeReports(): Flow<List<IncidentReport>>
    suspend fun submitIncident(
        latitude: Double,
        longitude: Double,
        nearbyNodeId: String?,
        imagePath: String,
        criticalReadings: List<SensorReading>
    ): IncidentReport
}

@Singleton
class CitizenReportRepositoryImpl @Inject constructor(
    private val dao: IncidentReportDao
) : CitizenReportRepository {

    override fun observeReports(): Flow<List<IncidentReport>> {
        return dao.observeAll().map { list -> list.map { it.toModel() } }
    }

    override suspend fun submitIncident(
        latitude: Double,
        longitude: Double,
        nearbyNodeId: String?,
        imagePath: String,
        criticalReadings: List<SensorReading>
    ): IncidentReport {
        val multiSourceVerified = criticalReadings.any {
            (it.severity == AlertSeverity.Critical || it.severity == AlertSeverity.UltraCritical) &&
                haversineMeters(latitude, longitude, it.latitude, it.longitude) <= 500.0
        }

        val id = dao.insert(
            IncidentReportEntity(
                timestampEpochMs = System.currentTimeMillis(),
                latitude = latitude,
                longitude = longitude,
                nearbyNodeId = nearbyNodeId,
                imagePath = imagePath,
                uploaded = false,
                multiSourceVerified = multiSourceVerified
            )
        )

        delay(700)
        dao.updateUploaded(id, true)
        return dao.getById(id)?.toModel() ?: IncidentReport(
            id = id,
            timestampEpochMs = System.currentTimeMillis(),
            latitude = latitude,
            longitude = longitude,
            nearbyNodeId = nearbyNodeId,
            imagePath = imagePath,
            uploaded = true,
            multiSourceVerified = multiSourceVerified
        )
    }

    private fun IncidentReportEntity.toModel(): IncidentReport {
        return IncidentReport(
            id = id,
            timestampEpochMs = timestampEpochMs,
            latitude = latitude,
            longitude = longitude,
            nearbyNodeId = nearbyNodeId,
            imagePath = imagePath,
            uploaded = uploaded,
            multiSourceVerified = multiSourceVerified
        )
    }
}

private fun haversineMeters(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
    val earthRadius = 6_371_000.0
    val dLat = Math.toRadians(lat2 - lat1)
    val dLon = Math.toRadians(lon2 - lon1)
    val a = sin(dLat / 2).pow(2.0) + cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * sin(dLon / 2).pow(2.0)
    return 2 * earthRadius * asin(sqrt(a))
}
