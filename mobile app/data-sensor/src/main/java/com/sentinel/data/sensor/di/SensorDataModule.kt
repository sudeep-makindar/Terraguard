package com.sentinel.data.sensor.di

import com.sentinel.data.sensor.RemoteSensorRepository
import com.sentinel.data.sensor.SensorRepository
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import io.ktor.client.HttpClient
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.HttpTimeout
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class SensorDataModule {

    @Binds
    @Singleton
    abstract fun bindSensorRepository(impl: RemoteSensorRepository): SensorRepository
}

@Module
@InstallIn(SingletonComponent::class)
object SensorNetworkModule {

    @Provides
    @Singleton
    fun provideHttpClient(): HttpClient {
        return HttpClient(OkHttp) {
            install(HttpTimeout) {
                connectTimeoutMillis = 1500
                requestTimeoutMillis = 2500
                socketTimeoutMillis = 2500
            }
            install(ContentNegotiation) {
                json(
                    Json {
                        ignoreUnknownKeys = true
                        isLenient = true
                    }
                )
            }
        }
    }
}
