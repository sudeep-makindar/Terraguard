package com.sentinel.feature.citizenreport

import android.Manifest
import android.content.pm.PackageManager
import android.util.Size
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.sentinel.core.model.SensorReading
import kotlinx.coroutines.launch
import java.io.File

@Composable
fun CitizenReportScreen(
    readings: List<SensorReading>,
    viewModel: CitizenReportViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()
    val reports by viewModel.reports.collectAsStateWithLifecycle()
    val captureState by viewModel.captureState.collectAsStateWithLifecycle()

    var imageCapture by remember { mutableStateOf<ImageCapture?>(null) }
    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        )
    }
    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        hasCameraPermission = granted
    }

    LaunchedEffect(Unit) {
        hasCameraPermission = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        if (!hasCameraPermission) {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(text = "Camera permission is required for citizen evidence capture.")
                    Button(onClick = { cameraPermissionLauncher.launch(Manifest.permission.CAMERA) }) {
                        Text("Grant Camera Access")
                    }
                }
            }
        } else {
            CameraPreview(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(280.dp),
                lifecycleOwner = lifecycleOwner,
                onCaptureReady = { imageCapture = it }
            )
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(
                onClick = {
                    val capture = imageCapture ?: return@Button
                    val out = File(context.cacheDir, "incident_${System.currentTimeMillis()}.jpg")
                    scope.launch {
                        val result = viewModel.takePicture(context, capture, out)
                        result.onSuccess { file ->
                            viewModel.submitFromCapturedFile(context, file, readings)
                        }
                    }
                },
                enabled = imageCapture != null && hasCameraPermission
            ) {
                Text("Capture Incident")
            }
            if (captureState is CitizenCaptureState.Uploading) {
                CircularProgressIndicator(modifier = Modifier.height(24.dp))
            }
        }

        if (captureState is CitizenCaptureState.Success) {
            val report = (captureState as CitizenCaptureState.Success).report
            if (report.multiSourceVerified) {
                Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
                    Row(modifier = Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Multi-Source Verified")
                        AssistChip(onClick = {}, label = { Text("High Confidence") })
                    }
                }
            }
        }

        Text("Incident Reports", style = MaterialTheme.typography.titleMedium)
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(reports, key = { it.id }) { report ->
                Card(elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)) {
                    Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Report #${report.id}")
                        Text("GPS: ${"%.5f".format(report.latitude)}, ${"%.5f".format(report.longitude)}")
                        Text("Nearby Node: ${report.nearbyNodeId ?: "N/A"}")
                        Text("Upload: ${if (report.uploaded) "Synced" else "Pending"}")
                        if (report.multiSourceVerified) {
                            Text("Status: Multi-Source Verified")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CameraPreview(
    modifier: Modifier,
    lifecycleOwner: LifecycleOwner,
    onCaptureReady: (ImageCapture) -> Unit
) {
    val context = LocalContext.current

    AndroidView(
        factory = {
            val previewView = PreviewView(context)
            val providerFuture = ProcessCameraProvider.getInstance(context)
            providerFuture.addListener({
                val provider = providerFuture.get()
                val preview = Preview.Builder().build().also {
                    it.surfaceProvider = previewView.surfaceProvider
                }
                val imageCapture = ImageCapture.Builder()
                    .setTargetResolution(Size(1280, 720))
                    .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                    .build()

                provider.unbindAll()
                provider.bindToLifecycle(
                    lifecycleOwner,
                    CameraSelector.DEFAULT_BACK_CAMERA,
                    preview,
                    imageCapture
                )
                onCaptureReady(imageCapture)
            }, ContextCompat.getMainExecutor(context))

            previewView
        },
        modifier = modifier
    )
}
