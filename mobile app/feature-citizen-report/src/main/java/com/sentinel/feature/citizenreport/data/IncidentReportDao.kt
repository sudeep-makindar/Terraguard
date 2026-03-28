package com.sentinel.feature.citizenreport.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface IncidentReportDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(report: IncidentReportEntity): Long

    @Query("SELECT * FROM incident_reports ORDER BY timestampEpochMs DESC")
    fun observeAll(): Flow<List<IncidentReportEntity>>

    @Query("UPDATE incident_reports SET uploaded = :uploaded WHERE id = :id")
    suspend fun updateUploaded(id: Long, uploaded: Boolean)

    @Query("SELECT * FROM incident_reports WHERE id = :id LIMIT 1")
    suspend fun getById(id: Long): IncidentReportEntity?
}
