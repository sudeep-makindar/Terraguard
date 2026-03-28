package com.sentinel.app.evidence

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface EvidenceLogDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entry: EvidenceLogEntity): Long

    @Query("SELECT * FROM evidence_logs ORDER BY timestampEpochMs DESC")
    fun observeAll(): Flow<List<EvidenceLogEntity>>
}
