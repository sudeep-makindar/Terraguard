package com.sentinel.feature.citizenreport.data.di

import android.content.Context
import androidx.room.Room
import com.sentinel.feature.citizenreport.data.CitizenReportDatabase
import com.sentinel.feature.citizenreport.data.CitizenReportRepository
import com.sentinel.feature.citizenreport.data.CitizenReportRepositoryImpl
import com.sentinel.feature.citizenreport.data.IncidentReportDao
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object CitizenReportDatabaseModule {

    @Provides
    @Singleton
    fun provideCitizenDb(@ApplicationContext context: Context): CitizenReportDatabase {
        return Room.databaseBuilder(context, CitizenReportDatabase::class.java, "citizen_report.db").build()
    }

    @Provides
    fun provideIncidentDao(db: CitizenReportDatabase): IncidentReportDao = db.incidentReportDao()
}

@Module
@InstallIn(SingletonComponent::class)
abstract class CitizenReportBindingsModule {

    @Binds
    @Singleton
    abstract fun bindCitizenRepository(impl: CitizenReportRepositoryImpl): CitizenReportRepository
}
