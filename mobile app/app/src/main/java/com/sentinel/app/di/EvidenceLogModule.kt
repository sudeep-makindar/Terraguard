package com.sentinel.app.di

import android.content.Context
import androidx.room.Room
import com.sentinel.app.evidence.EvidenceLogDao
import com.sentinel.app.evidence.EvidenceLogDatabase
import com.sentinel.app.evidence.EvidenceLogRepository
import com.sentinel.app.evidence.EvidenceLogRepositoryImpl
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object EvidenceLogDatabaseModule {

    @Provides
    @Singleton
    fun provideEvidenceDb(@ApplicationContext context: Context): EvidenceLogDatabase {
        return Room.databaseBuilder(context, EvidenceLogDatabase::class.java, "evidence_logs.db").build()
    }

    @Provides
    fun provideEvidenceDao(db: EvidenceLogDatabase): EvidenceLogDao = db.evidenceLogDao()
}

@Module
@InstallIn(SingletonComponent::class)
abstract class EvidenceLogBindingsModule {

    @Binds
    @Singleton
    abstract fun bindEvidenceRepository(impl: EvidenceLogRepositoryImpl): EvidenceLogRepository
}
