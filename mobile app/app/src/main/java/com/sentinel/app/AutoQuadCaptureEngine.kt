package com.sentinel.app

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.sentinel.core.common.ForensicSnapshot
import kotlinx.coroutines.delay
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.File
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import kotlin.coroutines.resume

@Composable
fun AutoQuadCaptureEngine(
    request: EvidenceCaptureRequest?,
    modifier: Modifier = Modifier,
    onProgress: (capturedCount: Int, totalCount: Int) -> Unit,
    onComplete: (List<ForensicSnapshot>) -> Unit,
    onError: (String) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val latestProgress by rememberUpdatedState(onProgress)
    val latestComplete by rememberUpdatedState(onComplete)
    val latestError by rememberUpdatedState(onError)

    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }
    DisposableEffect(Unit) {
        onDispose {
            cameraExecutor.shutdown()
        }
    }

    var permissionGranted by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        )
    }
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        permissionGranted = granted
        if (!granted) {
            latestError("Camera permission denied")
        }
    }

    var imageCapture by remember(request?.incidentKey) { mutableStateOf<ImageCapture?>(null) }

    if (request != null && !permissionGranted) {
        LaunchedEffect(request.incidentKey) {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    if (request != null && permissionGranted) {
        AndroidView(
            modifier = modifier,
            factory = { ctx ->
                val previewView = PreviewView(ctx)
                val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                cameraProviderFuture.addListener(
                    {
                        val cameraProvider = cameraProviderFuture.get()
                        val preview = Preview.Builder().build().also {
                            it.surfaceProvider = previewView.surfaceProvider
                        }
                        val capture = ImageCapture.Builder()
                            .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                            .build()

                        cameraProvider.unbindAll()
                        cameraProvider.bindToLifecycle(
                            lifecycleOwner,
                            CameraSelector.DEFAULT_BACK_CAMERA,
                            preview,
                            capture
                        )
                        imageCapture = capture
                    },
                    ContextCompat.getMainExecutor(ctx)
                )
                previewView
            }
        )

        LaunchedEffect(request.incidentKey) {
            val captureUseCase = awaitImageCapture { imageCapture }
            if (captureUseCase == null) {
                latestError("Camera initialization failed")
                return@LaunchedEffect
            }

            val snapshots = mutableListOf<ForensicSnapshot>()
            repeat(4) { index ->
                val capturedAt = System.currentTimeMillis()
                val bitmap = captureBitmap(
                    context = context,
                    imageCapture = captureUseCase,
                    executor = cameraExecutor,
                    frameIndex = index
                )

                snapshots += ForensicSnapshot(
                    bitmap = bitmap,
                    capturedAtEpochMs = capturedAt,
                    vibrationMagnitude = request.reading.vibration.magnitude
                )

                latestProgress(index + 1, 4)
                if (index < 3) {
                    delay(1_000)
                }
            }

            latestComplete(snapshots)
        }
    }
}

private suspend fun awaitImageCapture(
    provider: () -> ImageCapture?
): ImageCapture? {
    repeat(30) {
        provider()?.let { return it }
        delay(100)
    }
    return null
}

private suspend fun captureBitmap(
    context: Context,
    imageCapture: ImageCapture,
    executor: ExecutorService,
    frameIndex: Int
): Bitmap = suspendCancellableCoroutine { continuation ->
    val outFile = File(context.cacheDir, "quad_capture_${System.currentTimeMillis()}_${frameIndex}.jpg")
    val options = ImageCapture.OutputFileOptions.Builder(outFile).build()

    imageCapture.takePicture(
        options,
        executor,
        object : ImageCapture.OnImageSavedCallback {
            override fun onError(exception: ImageCaptureException) {
                continuation.resume(createFallbackBitmap())
            }

            override fun onImageSaved(outputFileResults: ImageCapture.OutputFileResults) {
                val decoded = BitmapFactory.decodeFile(outFile.absolutePath)
                continuation.resume(decoded ?: createFallbackBitmap())
            }
        }
    )
}

private fun createFallbackBitmap(): Bitmap {
    return Bitmap.createBitmap(420, 320, Bitmap.Config.ARGB_8888)
}
