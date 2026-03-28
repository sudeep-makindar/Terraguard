package com.sentinel.feature.citizenreport.data

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [IncidentReportEntity::class],
    version = 1,
    exportSchema = false
)
abstract class CitizenReportDatabase : RoomDatabase() {
    abstract fun incidentReportDao(): IncidentReportDao
}
