package com.sentinel.app.di

import android.content.Context
import com.sentinel.core.common.ForensicReporter
import com.sentinel.core.common.PdfGenerator
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppUtilitiesModule {

    @Provides
    @Singleton
    fun providePdfGenerator(@ApplicationContext context: Context): PdfGenerator {
        return PdfGenerator(
            context = context,
            fileProviderAuthority = "${context.packageName}.fileprovider"
        )
    }

    @Provides
    @Singleton
    fun provideForensicReporter(@ApplicationContext context: Context): ForensicReporter {
        return ForensicReporter(
            context = context,
            fileProviderAuthority = "${context.packageName}.fileprovider"
        )
    }
}
