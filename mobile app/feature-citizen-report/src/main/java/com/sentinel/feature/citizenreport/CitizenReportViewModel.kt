package com.sentinel.feature.citizenreport

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.gms.location.LocationServices
import com.sentinel.core.model.AlertSeverity
import com.sentinel.core.model.IncidentReport
import com.sentinel.core.model.SensorReading
import com.sentinel.feature.citizenreport.data.CitizenReportRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import javax.inject.Inject
import kotlin.coroutines.resume

@HiltViewModel
class CitizenReportViewModel @Inject constructor(
    private val repository: CitizenReportRepository
) : ViewModel() {

    val reports = repository.observeReports().stateIn(
        viewModelScope,
        kotlinx.coroutines.flow.SharingStarted.WhileSubscribed(5_000),
        emptyList()
    )

    private val _captureState = MutableStateFlow<CitizenCaptureState>(CitizenCaptureState.Idle)
    val captureState: StateFlow<CitizenCaptureState> = _captureState.asStateFlow()

    fun submitFromCapturedFile(
        context: Context,
        photoFile: File,
        readings: List<SensorReading>
    ) {
        viewModelScope.launch {
            _captureState.value = CitizenCaptureState.Uploading

            val now = System.currentTimeMillis()
            val location = readBestLocation(context)
            val nearestNode = readings.minByOrNull { distanceSq(location.first, location.second, it.latitude, it.longitude) }
            val nodeId = nearestNode?.nodeId
            val watermarked = watermarkPhoto(
                inputFile = photoFile,
                latitude = location.first,
                longitude = location.second,
                timestampEpochMs = now,
                nodeId = nodeId
            )

            val critical = readings.filter { it.severity == AlertSeverity.Critical || it.severity == AlertSeverity.UltraCritical }
            val report = repository.submitIncident(
                latitude = location.first,
                longitude = location.second,
                nearbyNodeId = nodeId,
                imagePath = watermarked.absolutePath,
                criticalReadings = critical
            )
            _captureState.value = CitizenCaptureState.Success(report)
        }
    }

    suspend fun takePicture(context: Context, imageCapture: ImageCapture, output: File): Result<File> {
        return suspendCancellableCoroutine { continuation ->
            val outputOptions = ImageCapture.OutputFileOptions.Builder(output).build()
            imageCapture.takePicture(
                outputOptions,
                androidx.core.content.ContextCompat.getMainExecutor(context),
                object : ImageCapture.OnImageSavedCallback {
                    override fun onError(exception: ImageCaptureException) {
                        continuation.resume(Result.failure(exception))
                    }

                    override fun onImageSaved(outputFileResults: ImageCapture.OutputFileResults) {
                        continuation.resume(Result.success(output))
                    }
                }
            )
        }
    }

    private suspend fun readBestLocation(context: Context): Pair<Double, Double> {
        val client = LocationServices.getFusedLocationProviderClient(context)
        return suspendCancellableCoroutine { continuation ->
            try {
                client.lastLocation.addOnSuccessListener { loc ->
                    if (loc != null) {
                        continuation.resume(loc.latitude to loc.longitude)
                    } else {
                        continuation.resume(11.1271 to 78.6569)
                    }
                }.addOnFailureListener {
                    continuation.resume(11.1271 to 78.6569)
                }
            } catch (_: SecurityException) {
                continuation.resume(11.1271 to 78.6569)
            }
        }
    }

    private fun watermarkPhoto(
        inputFile: File,
        latitude: Double,
        longitude: Double,
        timestampEpochMs: Long,
        nodeId: String?
    ): File {
        val bitmap = BitmapFactory.decodeFile(inputFile.absolutePath).copy(Bitmap.Config.ARGB_8888, true)
        val canvas = Canvas(bitmap)
        val overlayPaint = Paint().apply {
            color = Color.argb(180, 0, 0, 0)
        }
        val textPaint = Paint().apply {
            color = Color.WHITE
            textSize = (bitmap.width * 0.03f).coerceAtLeast(30f)
            isFakeBoldText = true
        }

        val date = SimpleDateFormat("dd MMM yyyy hh:mm:ss a", Locale.US).format(Date(timestampEpochMs))
        val lines = listOf(
            "GPS: ${"%.6f".format(latitude)}, ${"%.6f".format(longitude)}",
            "Timestamp: $date",
            "NodeID: ${nodeId ?: "N/A"}"
        )

        val lineHeight = textPaint.textSize + 10f
        val boxHeight = (lineHeight * lines.size) + 40f
        val top = bitmap.height - boxHeight - 20f
        canvas.drawRect(20f, top, bitmap.width - 20f, bitmap.height - 20f, overlayPaint)

        var y = top + 50f
        lines.forEach {
            canvas.drawText(it, 40f, y, textPaint)
            y += lineHeight
        }

        val outFile = File(inputFile.parentFile, "wm_${inputFile.nameWithoutExtension}.jpg")
        FileOutputStream(outFile).use { stream ->
            bitmap.compress(Bitmap.CompressFormat.JPEG, 92, stream)
        }
        bitmap.recycle()
        return outFile
    }

    private fun distanceSq(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val dLat = lat1 - lat2
        val dLon = lon1 - lon2
        return (dLat * dLat) + (dLon * dLon)
    }
}

sealed interface CitizenCaptureState {
    data object Idle : CitizenCaptureState
    data object Uploading : CitizenCaptureState
    data class Success(val report: IncidentReport) : CitizenCaptureState
    data class Error(val message: String) : CitizenCaptureState
}
