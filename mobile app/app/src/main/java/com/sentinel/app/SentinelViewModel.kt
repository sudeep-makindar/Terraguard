package com.sentinel.app

import android.content.Context
import android.annotation.SuppressLint
import android.graphics.Bitmap
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.gms.location.LocationServices
import com.google.android.gms.tasks.Task
import com.sentinel.app.evidence.EvidenceLogEntity
import com.sentinel.app.evidence.EvidenceLogRepository
import com.sentinel.app.share.FirAutomationDispatcher
import com.sentinel.app.share.FirDraftPayload
import com.sentinel.core.common.ForensicReportRecord
import com.sentinel.core.common.ForensicReporter
import com.sentinel.core.common.ForensicSnapshot
import com.sentinel.core.common.PdfGenerator
import com.sentinel.core.model.AlertSeverity
import com.sentinel.core.model.BreachTimelineEntry
import com.sentinel.core.model.NodeDetail
import com.sentinel.core.model.SensorReading
import com.sentinel.core.model.SensorState
import com.sentinel.core.model.SystemEvent
import com.sentinel.data.sensor.SensorRepository
import com.sentinel.feature.citizenreport.data.CitizenReportRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import javax.inject.Inject
import kotlin.coroutines.resume

data class EvidenceArchiveEntry(
    val id: Long,
    val fileName: String,
    val absolutePath: String,
    val timestampEpochMs: Long,
    val severity: AlertSeverity = AlertSeverity.Critical,
    val forensicTimeline: String,
    val vibrationPeak: Double,
    val radarPeakCm: Int,
    val mobileLatitude: Double,
    val mobileLongitude: Double
)

enum class PipelineStage {
    Idle,
    CapturingEvidence,
    GeneratingPdf,
    OpeningFirPortal,
    Completed,
    Failed
}

data class EvidencePipelineState(
    val active: Boolean = false,
    val stage: PipelineStage = PipelineStage.Idle,
    val message: String = "",
    val progress: Float = 0f,
    val capturedCount: Int = 0,
    val totalCount: Int = 4
)

data class EvidenceCaptureRequest(
    val incidentKey: String,
    val reading: SensorReading,
    val mobileLatitude: Double,
    val mobileLongitude: Double
)

@HiltViewModel
class SentinelViewModel @Inject constructor(
    @ApplicationContext private val appContext: Context,
    sensorRepository: SensorRepository,
    private val citizenReportRepository: CitizenReportRepository,
    private val pdfGenerator: PdfGenerator,
    private val forensicReporter: ForensicReporter,
    private val evidenceLogRepository: EvidenceLogRepository
) : ViewModel() {

    private var lastCaptureSignature: String? = null
    private val previousVibrationByNode = mutableMapOf<String, Double>()
    private val previousIrByNode = mutableMapOf<String, Int>()

    private val _captureRequest = MutableStateFlow<EvidenceCaptureRequest?>(null)
    val captureRequest: StateFlow<EvidenceCaptureRequest?> = _captureRequest

    private val _pipelineState = MutableStateFlow(EvidencePipelineState())
    val pipelineState: StateFlow<EvidencePipelineState> = _pipelineState

    private val _evidenceArchive = MutableStateFlow<List<EvidenceArchiveEntry>>(emptyList())
    val evidenceArchive: StateFlow<List<EvidenceArchiveEntry>> = _evidenceArchive

    val sensorState: StateFlow<SensorState> = sensorRepository.getLiveUpdates().stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = SensorState.Offline("Initializing connection...")
    )

    val readings: StateFlow<List<SensorReading>> = sensorState.map { state ->
        when (state) {
            is SensorState.Live -> state.readings
            is SensorState.Offline -> state.lastKnownReadings
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val isOffline: StateFlow<Boolean> = sensorState.map { it is SensorState.Offline }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), false)

    val offlineMessage: StateFlow<String?> = sensorState.map { state ->
        if (state is SensorState.Offline) state.message else null
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    val globalSeverity: StateFlow<AlertSeverity> = readings.map { list ->
        when {
            list.any { it.isTampered || it.severity == AlertSeverity.UltraCritical } -> AlertSeverity.UltraCritical
            list.any { it.severity == AlertSeverity.Critical } -> AlertSeverity.Critical
            list.any { it.severity == AlertSeverity.Warning } -> AlertSeverity.Warning
            else -> AlertSeverity.Safe
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), AlertSeverity.Safe)

    val incidentReports = citizenReportRepository.observeReports().stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = emptyList()
    )

    val events: StateFlow<List<SystemEvent>> = readings.map { list ->
        list.map { reading ->
            val title = when (reading.severity) {
                AlertSeverity.Safe -> "Node stable"
                AlertSeverity.Warning -> "Node warning"
                AlertSeverity.Critical -> "Critical anomaly"
                AlertSeverity.UltraCritical -> "Ultra-critical tamper"
            }
            SystemEvent(
                id = "${reading.nodeId}-${reading.timestampEpochMs}",
                title = title,
                detail = "${reading.nodeId}: vib ${"%.2f".format(reading.vibrationRms)} / IR ${reading.ir.analog_value} / RSSI ${reading.rssi} / confidence+${reading.incidentConfidenceBoostPercent}%",
                timestampEpochMs = reading.timestampEpochMs,
                severity = reading.severity
            )
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    init {
        viewModelScope.launch(Dispatchers.IO) {
            evidenceLogRepository.observeLogs().collectLatest { logs ->
                _evidenceArchive.value = logs.map {
                    EvidenceArchiveEntry(
                        id = it.id,
                        fileName = it.pdfFileName,
                        absolutePath = it.pdfAbsolutePath,
                        timestampEpochMs = it.timestampEpochMs,
                        severity = AlertSeverity.valueOf(it.severityName),
                        forensicTimeline = it.forensicTimeline,
                        vibrationPeak = it.vibrationPeak,
                        radarPeakCm = it.radarPeakCm,
                        mobileLatitude = it.mobileLatitude,
                        mobileLongitude = it.mobileLongitude
                    )
                }
            }
        }

        viewModelScope.launch(Dispatchers.IO) {
            readings.collectLatest { list ->
                var triggerReading: SensorReading? = null
                val vibrationThreshold = Constants.SeverityThresholds.VIBRATION_ALERT_TRIGGER
                val turbidityThreshold = Constants.SeverityThresholds.TURBIDITY_ALERT_IR_DROP

                list.forEach { reading ->
                    val prevVibration = previousVibrationByNode[reading.nodeId]
                    val prevIr = previousIrByNode[reading.nodeId]
                    previousVibrationByNode[reading.nodeId] = reading.vibration.magnitude
                    previousIrByNode[reading.nodeId] = reading.ir.analog_value

                    // Trigger only on threshold crossing to avoid firing immediately at app start.
                    val vibrationCrossed = prevVibration != null &&
                        prevVibration <= vibrationThreshold &&
                        reading.vibration.magnitude > vibrationThreshold
                    val turbidityCrossed = prevIr != null &&
                        prevIr >= turbidityThreshold &&
                        reading.ir.analog_value < turbidityThreshold

                    if ((vibrationCrossed || turbidityCrossed) && triggerReading == null) {
                        triggerReading = reading
                    }
                }

                if (triggerReading != null && _captureRequest.value == null) {
                    val signature = "${triggerReading.nodeId}-${triggerReading.closestCm}-${triggerReading.timestampEpochMs / 30_000}"
                    if (lastCaptureSignature != signature) {
                        val mobile = fetchMobileLocation()
                        lastCaptureSignature = signature
                        _captureRequest.value = EvidenceCaptureRequest(
                            incidentKey = signature,
                            reading = triggerReading,
                            mobileLatitude = mobile.first,
                            mobileLongitude = mobile.second
                        )
                        _pipelineState.value = EvidencePipelineState(
                            active = true,
                            stage = PipelineStage.CapturingEvidence,
                            message = "Capturing Evidence...",
                            progress = 0.1f,
                            capturedCount = 0
                        )
                    }
                }
            }
        }
    }

    fun onQuadCaptureProgress(capturedCount: Int, totalCount: Int) {
        _pipelineState.value = EvidencePipelineState(
            active = true,
            stage = PipelineStage.CapturingEvidence,
            message = "Capturing Evidence...",
            progress = (capturedCount.toFloat() / totalCount.toFloat()) * 0.6f,
            capturedCount = capturedCount,
            totalCount = totalCount
        )
    }

    fun onQuadCaptureFailed(reason: String) {
        val request = _captureRequest.value
        _captureRequest.value = null

        if (request == null) {
            _pipelineState.value = EvidencePipelineState(
                active = true,
                stage = PipelineStage.Failed,
                message = "Evidence pipeline failed: $reason",
                progress = 0f,
                capturedCount = 0
            )
            return
        }

        viewModelScope.launch(Dispatchers.IO) {
            val fallbackSnapshots = List(4) {
                ForensicSnapshot(
                    bitmap = Bitmap.createBitmap(420, 320, Bitmap.Config.ARGB_8888),
                    capturedAtEpochMs = System.currentTimeMillis(),
                    vibrationMagnitude = request.reading.vibration.magnitude
                )
            }
            processAutomatedEvidence(
                reading = request.reading,
                snapshots = fallbackSnapshots,
                mobileLat = request.mobileLatitude,
                mobileLng = request.mobileLongitude,
                stagePrefix = "Camera unavailable, using fallback evidence..."
            )
        }
    }

    fun onQuadCaptureCompleted(snapshots: List<ForensicSnapshot>) {
        val request = _captureRequest.value ?: return
        _captureRequest.value = null
        viewModelScope.launch(Dispatchers.IO) {
            processAutomatedEvidence(
                reading = request.reading,
                snapshots = snapshots,
                mobileLat = request.mobileLatitude,
                mobileLng = request.mobileLongitude,
                stagePrefix = "Generating PDF..."
            )
        }
    }

    fun dismissPipelineOverlay() {
        _pipelineState.value = EvidencePipelineState()
    }

    fun timelineForNode(nodeId: String): List<BreachTimelineEntry> {
        val df = SimpleDateFormat("hh:mm a", Locale.US)
        return readings.value
            .filter { it.nodeId == nodeId }
            .sortedByDescending { it.timestampEpochMs }
            .take(8)
            .mapIndexed { index, reading ->
                val eventText = when {
                    reading.vibrationRms > 2.0f -> "Vibration critical"
                    reading.ir.analog_value < Constants.SeverityThresholds.TURBIDITY_ALERT_IR_DROP -> "IR turbidity critical"
                    reading.ir.analog_value < 3000 -> "IR turbidity warning"
                    reading.radarAlert -> "Radar proximity alert (${reading.closestCm} cm)"
                    reading.pirStatus == 1 -> "PIR movement detected"
                    else -> "Normal telemetry heartbeat"
                }
                BreachTimelineEntry(
                    id = "$nodeId-$index-${reading.timestampEpochMs}",
                    displayTime = df.format(Date(reading.timestampEpochMs)),
                    eventDescription = eventText,
                    severity = reading.severity
                )
            }
    }

    fun generateAndShareDossier(nodeId: String) {
        val nodeReading = readings.value.firstOrNull { it.nodeId == nodeId } ?: return
        val timeline = timelineForNode(nodeId)
        val citizenId = incidentReports.value.firstOrNull {
            it.nearbyNodeId == nodeId && it.multiSourceVerified
        }?.id

        val detail = NodeDetail(
            nodeId = nodeId,
            generatedAtEpochMs = System.currentTimeMillis(),
            latitude = nodeReading.mapLatitude,
            longitude = nodeReading.mapLongitude,
            vibrationTrend = syntheticTrend(nodeReading.vibrationRms),
            dbTrend = syntheticTrend(nodeReading.dbLevel),
            timeline = timeline,
            citizenReportId = citizenId,
            closestIntruderCm = if (nodeReading.radarAlert || nodeReading.pirStatus == 1) nodeReading.closestCm else null,
            verificationScore = verificationScore(nodeReading, citizenId != null),
            rawJsonLog = nodeReading.rawJsonLog
        )

        viewModelScope.launch(Dispatchers.IO) {
            val uri = pdfGenerator.generateNodeDossier(detail)
            com.sentinel.app.share.DossierShareDispatcher.emit(uri)
        }
    }

    fun generateAndShareHighestRiskDossier() {
        val top = readings.value
            .sortedByDescending {
                when (it.severity) {
                    AlertSeverity.UltraCritical -> 4
                    AlertSeverity.Critical -> 3
                    AlertSeverity.Warning -> 2
                    AlertSeverity.Safe -> 1
                }
            }
            .firstOrNull()
        top?.let { generateAndShareDossier(it.nodeId) }
    }

    private fun verificationScore(reading: SensorReading, hasCitizenReport: Boolean): Int {
        var score = 40
        if (reading.severity == AlertSeverity.Critical || reading.severity == AlertSeverity.UltraCritical) score += 25
        if (reading.radarAlert) score += 15
        if (reading.pirStatus == 1) score += 10
        if (hasCitizenReport) score += 10
        return score.coerceIn(0, 100)
    }

    private fun syntheticTrend(latestValue: Float): List<Float> {
        return buildList {
            repeat(20) { index ->
                val drift = ((index - 10) * 0.11f)
                val pulse = kotlin.math.sin(index / 2f) * 0.4f
                add((latestValue - drift + pulse).coerceAtLeast(0.2f))
            }
        }
    }

    private fun buildVibrationSeries(reading: SensorReading): List<Float> {
        return listOf(
            0.55f,
            0.72f,
            0.98f,
            1.22f,
            reading.vibrationRms,
            1.35f,
            0.88f
        )
    }

    private fun formatAutomatedFirText(
        reading: SensorReading,
        report: ForensicReportRecord,
        mobileLatitude: Double,
        mobileLongitude: Double
    ): String {
        val gps = "${"%.6f".format(Locale.US, mobileLatitude)}, ${"%.6f".format(Locale.US, mobileLongitude)}"
        return "AUTOMATED REPORT: Illegal mining at $gps. Signature: Heavy Excavator. Evidence Dossier ${report.fileName} is archived and ready for forensic upload."
    }

    private suspend fun processAutomatedEvidence(
        reading: SensorReading,
        snapshots: List<ForensicSnapshot>,
        mobileLat: Double,
        mobileLng: Double,
        stagePrefix: String
    ) {
        _pipelineState.value = EvidencePipelineState(
            active = true,
            stage = PipelineStage.GeneratingPdf,
            message = stagePrefix,
            progress = 0.75f,
            capturedCount = snapshots.size
        )

        val report = forensicReporter.generateAutomatedReport(
            reading = reading,
            snapshots = snapshots,
            vibrationSeries = buildVibrationSeries(reading),
            mobileLatitude = mobileLat,
            mobileLongitude = mobileLng
        )

        evidenceLogRepository.addLog(
            EvidenceLogEntity(
                timestampEpochMs = report.generatedAtEpochMs,
                severity = reading.severity,
                forensicTimeline = formatForensicTimeline(reading, report.generatedAtEpochMs),
                pdfFileName = report.fileName,
                pdfAbsolutePath = report.absolutePath,
                vibrationPeak = reading.vibration.magnitude,
                radarPeakCm = reading.closestCm,
                mobileLatitude = mobileLat,
                mobileLongitude = mobileLng
            )
        )

        _pipelineState.value = EvidencePipelineState(
            active = true,
            stage = PipelineStage.OpeningFirPortal,
            message = "Opening FIR Portal...",
            progress = 0.92f,
            capturedCount = snapshots.size
        )

        FirAutomationDispatcher.emit(
            FirDraftPayload(
                portalUrl = Constants.Legal.TN_POLICE_FIR_PORTAL_URL,
                draftText = formatAutomatedFirText(reading, report, mobileLat, mobileLng)
            )
        )

        _pipelineState.value = EvidencePipelineState(
            active = true,
            stage = PipelineStage.Completed,
            message = "Automated legal pipeline complete.",
            progress = 1f,
            capturedCount = snapshots.size
        )
    }

    private fun formatForensicTimeline(reading: SensorReading, timestampEpochMs: Long): String {
        val time = SimpleDateFormat("hh:mm:ss a", Locale.US).format(Date(timestampEpochMs))
        val event = when {
            reading.radarAlert -> "Radar Intruder Detected at ${reading.closestCm}cm"
            reading.pirStatus == 1 -> "PIR Motion Triggered"
            reading.vibration.magnitude > Constants.SeverityThresholds.VIBRATION_CRITICAL ->
                "Vibration Spike ${"%.2f".format(Locale.US, reading.vibration.magnitude)}g"
            else -> "Telemetry anomaly recorded"
        }
        return "$time - $event"
    }

    @SuppressLint("MissingPermission")
    private suspend fun fetchMobileLocation(): Pair<Double, Double> {
        val client = LocationServices.getFusedLocationProviderClient(appContext)
        val location = runCatching { awaitTask(client.lastLocation) }.getOrNull()
        return if (location != null) {
            location.latitude to location.longitude
        } else {
            val fallback = readings.value.firstOrNull()
            if (fallback != null) fallback.mapLatitude to fallback.mapLongitude else 11.1271 to 78.6569
        }
    }

    private suspend fun <T> awaitTask(task: Task<T>): T? {
        return suspendCancellableCoroutine { cont ->
            task.addOnSuccessListener { cont.resume(it) }
                .addOnFailureListener { cont.resume(null) }
        }
    }
}
