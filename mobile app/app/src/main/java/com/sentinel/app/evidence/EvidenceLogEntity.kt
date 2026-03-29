package com.sentinel.app.evidence

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.sentinel.core.model.AlertSeverity

@Entity(tableName = "evidence_logs")
data class EvidenceLogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val timestampEpochMs: Long,
    val severity: AlertSeverity,
    val forensicTimeline: String,
    val pdfFileName: String,
    val pdfAbsolutePath: String,
    val vibrationPeak: Double,
    val radarPeakCm: Int,
    val mobileLatitude: Double,
    val mobileLongitude: Double
)
