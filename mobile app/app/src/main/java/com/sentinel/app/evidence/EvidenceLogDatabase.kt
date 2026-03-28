package com.sentinel.app.evidence

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverter
import androidx.room.TypeConverters
import com.sentinel.core.model.AlertSeverity

@Database(
    entities = [EvidenceLogEntity::class],
    version = 1,
    exportSchema = false
)
@TypeConverters(EvidenceSeverityConverters::class)
abstract class EvidenceLogDatabase : RoomDatabase() {
    abstract fun evidenceLogDao(): EvidenceLogDao
}

class EvidenceSeverityConverters {
    @TypeConverter
    fun toSeverity(value: String): AlertSeverity = AlertSeverity.valueOf(value)

    @TypeConverter
    fun fromSeverity(severity: AlertSeverity): String = severity.name
}
