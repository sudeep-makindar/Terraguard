package com.sentinel.data.sensor

import com.sentinel.core.model.SensorState
import kotlinx.coroutines.flow.Flow

interface SensorRepository {
    fun getLiveUpdates(): Flow<SensorState>
}
