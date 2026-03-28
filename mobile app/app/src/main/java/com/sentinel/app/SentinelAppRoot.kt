package com.sentinel.app

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.content.res.Configuration
import android.media.AudioManager
import android.media.ToneGenerator
import android.net.Uri
import android.widget.Toast
import androidx.core.content.FileProvider
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.background
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.NavigationRailItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavDestination.Companion.hasRoute
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collect
import java.io.File
import com.sentinel.core.common.ErrorRed
import com.sentinel.core.common.SafeTeal
import com.sentinel.core.common.WarningAmber
import com.sentinel.core.model.AlertSeverity
import com.sentinel.core.navigation.SentinelRoute
import com.sentinel.app.share.DossierShareDispatcher
import com.sentinel.app.share.FirAutomationDispatcher
import com.sentinel.feature.citizenreport.CitizenReportScreen
import com.sentinel.feature.dashboard.DashboardScreen
import com.sentinel.feature.logs.EvidenceArchiveItemUi
import com.sentinel.feature.logs.LogsScreen
import com.sentinel.feature.map.LiveMapScreen
import com.sentinel.feature.nodedetail.NodeDetailScreen

private data class NavItem(
    val route: SentinelRoute,
    val label: String,
    val icon: @Composable () -> Unit
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SentinelAppRoot(viewModel: SentinelViewModel = hiltViewModel()) {
    val context = LocalContext.current
    val navController = rememberNavController()
    val readingState by viewModel.readings.collectAsStateWithLifecycle()
    val isOffline by viewModel.isOffline.collectAsStateWithLifecycle()
    val offlineMessage by viewModel.offlineMessage.collectAsStateWithLifecycle()
    val globalSeverity by viewModel.globalSeverity.collectAsStateWithLifecycle()
    val captureRequest by viewModel.captureRequest.collectAsStateWithLifecycle()
    val pipelineState by viewModel.pipelineState.collectAsStateWithLifecycle()
    val evidenceArchive by viewModel.evidenceArchive.collectAsStateWithLifecycle()

    val navItems = listOf(
        NavItem(SentinelRoute.Dashboard, "Dashboard") { Icon(Icons.Default.Dashboard, contentDescription = null) },
        NavItem(SentinelRoute.LiveMap, "Live Map") { Icon(Icons.Default.Map, contentDescription = null) },
        NavItem(SentinelRoute.CitizenReport, "Citizen") { Icon(Icons.Default.PhotoCamera, contentDescription = null) },
        NavItem(SentinelRoute.Logs, "Logs") { Icon(Icons.Default.Description, contentDescription = null) }
    )
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = backStackEntry?.destination

    val configuration = LocalConfiguration.current
    val useRail = configuration.orientation == Configuration.ORIENTATION_LANDSCAPE || configuration.screenWidthDp >= 840

    val healthText = when (globalSeverity) {
        AlertSeverity.Safe -> "System Health: Stable"
        AlertSeverity.Warning -> "System Health: Warning"
        AlertSeverity.Critical -> "System Health: Critical"
        AlertSeverity.UltraCritical -> "System Health: Ultra-Critical"
    }

    val healthColor = when (globalSeverity) {
        AlertSeverity.Safe -> SafeTeal
        AlertSeverity.Warning -> WarningAmber
        AlertSeverity.Critical -> ErrorRed
        AlertSeverity.UltraCritical -> ErrorRed
    }
    val isAnomaly = readingState.any {
        it.vibration.magnitude > Constants.SeverityThresholds.VIBRATION_ALERT_TRIGGER ||
            it.ir.analog_value < Constants.SeverityThresholds.TURBIDITY_ALERT_IR_DROP
    }

    var wasAnomaly by remember { mutableStateOf(false) }
    LaunchedEffect(isAnomaly) {
        if (isAnomaly && !wasAnomaly) {
            ToneGenerator(AudioManager.STREAM_ALARM, 95).startTone(ToneGenerator.TONE_CDMA_ALERT_CALL_GUARD, 700)
        }
        wasAnomaly = isAnomaly
    }

    LaunchedEffect(Unit) {
        DossierShareDispatcher.shareUris.collect { uri ->
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "application/pdf"
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            context.startActivity(Intent.createChooser(intent, "Share Evidence Dossier"))
        }
    }

    LaunchedEffect(Unit) {
        FirAutomationDispatcher.payloads.collect { payload ->
            val clipboard = context.getSystemService(ClipboardManager::class.java)
            clipboard?.setPrimaryClip(ClipData.newPlainText("Sentinel FIR Draft", payload.draftText))

            Toast.makeText(context, "FIR Drafted. Details copied to clipboard for submission.", Toast.LENGTH_LONG).show()
            val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(payload.portalUrl))
            context.startActivity(browserIntent)
        }
    }

    LaunchedEffect(pipelineState.stage) {
        if (pipelineState.stage == PipelineStage.Completed || pipelineState.stage == PipelineStage.Failed) {
            delay(1_800)
            viewModel.dismissPipelineOverlay()
        }
    }

    fun openEvidencePdf(absolutePath: String) {
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            File(absolutePath)
        )
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/pdf")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        runCatching {
            context.startActivity(intent)
        }.onFailure {
            Toast.makeText(context, "No PDF viewer found on this device.", Toast.LENGTH_LONG).show()
        }
    }

    MaterialTheme {
        Surface(modifier = Modifier.fillMaxSize()) {
            Box(modifier = Modifier.fillMaxSize()) {
            Scaffold(
                topBar = {
                    TopAppBar(
                        title = { Text(text = healthText, color = healthColor) }
                    )
                },
                bottomBar = {
                    if (!useRail) {
                        NavigationBar {
                            navItems.forEach { item ->
                                val selected = currentDestination?.hasRoute(item.route::class) == true
                                NavigationBarItem(
                                    selected = selected,
                                    onClick = {
                                        navController.navigate(item.route) {
                                            launchSingleTop = true
                                        }
                                    },
                                    icon = item.icon,
                                    label = { Text(item.label) }
                                )
                            }
                        }
                    }
                }
            ) { innerPadding ->
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding)
                ) {
                    if (useRail) {
                        NavigationRail {
                            navItems.forEach { item ->
                                val selected = currentDestination?.hasRoute(item.route::class) == true
                                NavigationRailItem(
                                    selected = selected,
                                    onClick = {
                                        navController.navigate(item.route) {
                                            launchSingleTop = true
                                        }
                                    },
                                    icon = item.icon,
                                    label = { Text(item.label) }
                                )
                            }
                        }
                    }

                    Column(modifier = Modifier.fillMaxSize()) {
                        if (isOffline) {
                            Text(
                                text = offlineMessage ?: "Connection Lost",
                                color = Color.White,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(ErrorRed)
                                    .padding(horizontal = 12.dp, vertical = 8.dp)
                            )
                        }

                        if (isAnomaly && !isOffline) {
                            AnomalyCameraWall(streamUrls = Constants.Streams.CAMERA_STREAM_URLS)
                        }

                        NavHost(
                            navController = navController,
                            startDestination = SentinelRoute.Dashboard,
                            modifier = Modifier.fillMaxSize()
                        ) {
                        composable<SentinelRoute.Dashboard> {
                            DashboardScreen(
                                readings = readingState,
                                onNodeClick = { nodeId -> navController.navigate(SentinelRoute.NodeDetail(nodeId)) }
                            )
                        }
                        composable<SentinelRoute.LiveMap> {
                            LiveMapScreen(readings = readingState)
                        }
                        composable<SentinelRoute.Logs> {
                            LogsScreen(
                                archiveItems = evidenceArchive.map {
                                    EvidenceArchiveItemUi(
                                        id = it.id,
                                        fileName = it.fileName,
                                        absolutePath = it.absolutePath,
                                        timestampEpochMs = it.timestampEpochMs,
                                        severity = it.severity,
                                        forensicTimeline = it.forensicTimeline,
                                        vibrationPeak = it.vibrationPeak,
                                        radarPeakCm = it.radarPeakCm,
                                        mobileLatitude = it.mobileLatitude,
                                        mobileLongitude = it.mobileLongitude
                                    )
                                },
                                onViewPdf = ::openEvidencePdf
                            )
                        }
                        composable<SentinelRoute.CitizenReport> {
                            CitizenReportScreen(readings = readingState)
                        }
                        composable<SentinelRoute.NodeDetail> { backStack ->
                            val route = backStack.toRoute<SentinelRoute.NodeDetail>()
                            val nodeReading = readingState.firstOrNull { it.nodeId == route.nodeId }
                            NodeDetailScreen(
                                nodeId = route.nodeId,
                                reading = nodeReading,
                                timeline = viewModel.timelineForNode(route.nodeId),
                                onGenerateDossier = {
                                    viewModel.generateAndShareDossier(route.nodeId)
                                }
                            )
                        }
                    }
                    }
                }
            }

            AutoQuadCaptureEngine(
                request = captureRequest,
                modifier = Modifier.fillMaxSize(),
                onProgress = viewModel::onQuadCaptureProgress,
                onComplete = viewModel::onQuadCaptureCompleted,
                onError = viewModel::onQuadCaptureFailed
            )

            EvidencePipelineOverlay(state = pipelineState)
            }
        }
    }
}
