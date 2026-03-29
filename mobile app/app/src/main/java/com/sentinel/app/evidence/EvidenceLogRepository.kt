package com.sentinel.app.evidence

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

data class EvidenceLogRecord(
    val id: Long,
    val timestampEpochMs: Long,
    val severityName: String,
    val forensicTimeline: String,
    val pdfFileName: String,
    val pdfAbsolutePath: String,
    val vibrationPeak: Double,
    val radarPeakCm: Int,
    val mobileLatitude: Double,
    val mobileLongitude: Double
)

interface EvidenceLogRepository {
    fun observeLogs(): Flow<List<EvidenceLogRecord>>
    suspend fun addLog(entry: EvidenceLogEntity)
}

@Singleton
class EvidenceLogRepositoryImpl @Inject constructor(
    private val dao: EvidenceLogDao
) : EvidenceLogRepository {
    override fun observeLogs(): Flow<List<EvidenceLogRecord>> {
        return dao.observeAll().map { rows ->
            rows.map {
                EvidenceLogRecord(
                    id = it.id,
                    timestampEpochMs = it.timestampEpochMs,
                    severityName = it.severity.name,
                    forensicTimeline = it.forensicTimeline,
                    pdfFileName = it.pdfFileName,
                    pdfAbsolutePath = it.pdfAbsolutePath,
                    vibrationPeak = it.vibrationPeak,
                    radarPeakCm = it.radarPeakCm,
                    mobileLatitude = it.mobileLatitude,
                    mobileLongitude = it.mobileLongitude
                )
            }
        }
    }

    override suspend fun addLog(entry: EvidenceLogEntity) {
        dao.insert(entry)
    }
}
