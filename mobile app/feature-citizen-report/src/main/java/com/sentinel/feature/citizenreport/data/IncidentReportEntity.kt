package com.sentinel.feature.citizenreport.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "incident_reports")
data class IncidentReportEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val timestampEpochMs: Long,
    val latitude: Double,
    val longitude: Double,
    val nearbyNodeId: String?,
    val imagePath: String,
    val uploaded: Boolean,
    val multiSourceVerified: Boolean
)
