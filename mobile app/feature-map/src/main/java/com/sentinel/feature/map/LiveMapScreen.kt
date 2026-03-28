package com.sentinel.feature.map

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.location.Location
import android.os.Looper
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.sentinel.core.model.AlertSeverity
import com.sentinel.core.model.SensorReading
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polygon

@Composable
fun LiveMapScreen(readings: List<SensorReading>) {
    val context = LocalContext.current
    LaunchedEffect(Unit) {
        Configuration.getInstance().userAgentValue = context.packageName
    }

    val mobileLocation = rememberMobileLocationUpdates()
    val alertActive = readings.any {
        it.vibration.magnitude > 2.0 ||
            it.severity == AlertSeverity.Critical ||
            it.severity == AlertSeverity.UltraCritical
    }

    val pulseTransition = rememberInfiniteTransition(label = "patrol-pulse")
    val pulseFactor by pulseTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1300),
            repeatMode = RepeatMode.Restart
        ),
        label = "pulse"
    )

    if (readings.isEmpty()) {
        Text(text = "Waiting for telemetry...")
        return
    }

    val first = readings.first()
    val patrolPoint = mobileLocation?.let { GeoPoint(it.latitude, it.longitude) }
        ?: GeoPoint(first.mapLatitude, first.mapLongitude)

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { ctx ->
                MapView(ctx).apply {
                    setTileSource(TileSourceFactory.MAPNIK)
                    setMultiTouchControls(true)
                    controller.setZoom(16.0)
                    controller.setCenter(patrolPoint)
                }
            },
            update = { mapView ->
                val focusPoint = readings.firstOrNull {
                    it.severity == AlertSeverity.Critical || it.severity == AlertSeverity.UltraCritical || it.isTampered
                }?.let { GeoPoint(it.mapLatitude, it.mapLongitude) } ?: patrolPoint

                mapView.controller.animateTo(focusPoint)
                renderOverlays(
                    mapView = mapView,
                    readings = readings,
                    patrolPoint = patrolPoint,
                    alertActive = alertActive,
                    pulseFactor = pulseFactor
                )
            }
        )

        if (mobileLocation != null) {
            AssistChip(
                onClick = {},
                label = { Text("Mobile GPS Sync Active") },
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 12.dp)
            )
            Text(
                text = "Mobile: ${"%.6f".format(mobileLocation.latitude)}, ${"%.6f".format(mobileLocation.longitude)}",
                color = Color.White,
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .offset(y = 48.dp)
                    .padding(horizontal = 10.dp, vertical = 6.dp)
                    .background(Color(0xB2161B22))
                    .padding(horizontal = 10.dp, vertical = 6.dp)
            )
        } else {
            AssistChip(
                onClick = {},
                label = { Text("Using sensor GPS fallback until mobile fix") },
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 12.dp)
            )
        }
    }
}

private fun renderOverlays(
    mapView: MapView,
    readings: List<SensorReading>,
    patrolPoint: GeoPoint,
    alertActive: Boolean,
    pulseFactor: Float
) {
    mapView.overlays.clear()

    readings.forEach { reading ->
        val marker = Marker(mapView).apply {
            position = GeoPoint(reading.mapLatitude, reading.mapLongitude)
            title = reading.nodeId
            snippet = "vib ${"%.2f".format(reading.vibrationRms)} | PIR ${reading.pirStatus} | prox ${"%.1f".format(reading.proximityDistanceCm)} cm"
            icon = when (reading.severity) {
                AlertSeverity.Safe -> dotIcon(android.graphics.Color.parseColor("#2E7D32"))
                AlertSeverity.Warning -> dotIcon(android.graphics.Color.parseColor("#F9A825"))
                AlertSeverity.Critical -> dotIcon(android.graphics.Color.parseColor("#B00020"))
                AlertSeverity.UltraCritical -> dotIcon(android.graphics.Color.parseColor("#B00020"))
            }
        }
        mapView.overlays.add(marker)
    }

    if (alertActive) {
        val dangerZone = Polygon(mapView).apply {
            points = Polygon.pointsAsCircle(patrolPoint, 100.0)
            fillColor = android.graphics.Color.argb(60, 176, 0, 32)
            strokeColor = android.graphics.Color.argb(180, 176, 0, 32)
            strokeWidth = 3f
        }
        mapView.overlays.add(dangerZone)
    }

    val pulseRadiusMeters = 10.0 + (pulseFactor * 25.0)
    val pulse = Polygon(mapView).apply {
        points = Polygon.pointsAsCircle(patrolPoint, pulseRadiusMeters)
        fillColor = android.graphics.Color.argb((70 * (1f - pulseFactor)).toInt().coerceIn(10, 90), 220, 20, 60)
        strokeColor = android.graphics.Color.argb((140 * (1f - pulseFactor)).toInt().coerceIn(35, 160), 220, 20, 60)
        strokeWidth = 2f
    }
    mapView.overlays.add(pulse)

    val patrolMarker = Marker(mapView).apply {
        position = patrolPoint
        title = "Mobile Patrol"
        snippet = "Patrolling marker"
        icon = dotIcon(android.graphics.Color.parseColor("#D50000"))
    }
    mapView.overlays.add(patrolMarker)

    mapView.invalidate()
}

private fun dotIcon(color: Int): android.graphics.drawable.Drawable {
    val size = 28
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { this.color = color }
    canvas.drawCircle(size / 2f, size / 2f, size / 2.3f, paint)
    return android.graphics.drawable.BitmapDrawable(null, bitmap)
}

@SuppressLint("MissingPermission")
@Composable
private fun rememberMobileLocationUpdates(): Location? {
    val context = LocalContext.current
    var location by remember { mutableStateOf<Location?>(null) }
    var permissionGranted by remember {
        mutableStateOf(hasLocationPermission(context))
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { result ->
        permissionGranted = result[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            result[Manifest.permission.ACCESS_COARSE_LOCATION] == true
    }

    LaunchedEffect(Unit) {
        if (!permissionGranted) {
            permissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }
    }

    DisposableEffect(permissionGranted) {
        if (!permissionGranted) {
            onDispose {}
        } else {
            val fusedClient = LocationServices.getFusedLocationProviderClient(context)
            val callback = object : LocationCallback() {
                override fun onLocationResult(result: LocationResult) {
                    result.lastLocation?.let { location = it }
                }
            }

            val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 2_000L)
                .setMinUpdateIntervalMillis(1_000L)
                .build()

            fusedClient.lastLocation.addOnSuccessListener { last ->
                if (last != null) location = last
            }

            fusedClient.requestLocationUpdates(request, callback, Looper.getMainLooper())
            onDispose {
                fusedClient.removeLocationUpdates(callback)
            }
        }
    }

    return location
}

private fun hasLocationPermission(context: android.content.Context): Boolean {
    return ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
}
