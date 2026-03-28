package com.sentinel.feature.nodedetail

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PictureAsPdf
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sentinel.core.common.ErrorRed
import com.sentinel.core.common.SafeTeal
import com.sentinel.core.common.WarningAmber
import com.sentinel.core.model.AlertSeverity
import com.sentinel.core.model.BreachTimelineEntry
import com.sentinel.core.model.SensorReading

@Composable
fun NodeDetailScreen(
    nodeId: String,
    reading: SensorReading?,
    timeline: List<BreachTimelineEntry>,
    onGenerateDossier: () -> Unit
) {
    val severity = reading?.severity ?: AlertSeverity.Safe
    val statusColor = when (severity) {
        AlertSeverity.Safe -> SafeTeal
        AlertSeverity.Warning -> WarningAmber
        AlertSeverity.Critical -> ErrorRed
        AlertSeverity.UltraCritical -> ErrorRed
    }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(onClick = onGenerateDossier) {
                Icon(Icons.Default.PictureAsPdf, contentDescription = "Generate Evidence Dossier")
            }
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFFF4F6F8))
                .padding(innerPadding)
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = statusColor.copy(alpha = 0.12f)),
                elevation = CardDefaults.cardElevation(defaultElevation = 5.dp)
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(text = "Alert Status", style = MaterialTheme.typography.labelLarge)
                    Text(
                        text = "$nodeId: ${severity.name}",
                        style = MaterialTheme.typography.headlineMedium,
                        color = statusColor,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        item {
            Card(elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(text = "Hardware Parameters", style = MaterialTheme.typography.titleMedium)
                    Text(
                        text = "Device: ${reading?.device?.id ?: "N/A"} | RSSI: ${reading?.rssi?.toString() ?: "N/A"} dBm | Uptime: ${reading?.device?.uptimeMs?.toString() ?: "N/A"} ms",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        text = "Comm Mode: ${reading?.device?.commMode ?: "N/A"}",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        text = "GPS Lat/Lng: ${reading?.gps?.lat?.let { "%.6f".format(it) } ?: "N/A"}, ${reading?.gps?.lng?.let { "%.6f".format(it) } ?: "N/A"}",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        text = "GPS Alt: ${reading?.gps?.altitude_m?.let { "%.2f".format(it) } ?: "N/A"} m | Speed: ${reading?.gps?.speed_kmh?.let { "%.2f".format(it) } ?: "N/A"} km/h",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        text = "GPS Sat/Fix/HDOP: ${reading?.gps?.satellites?.toString() ?: "N/A"} / ${reading?.gps?.fix?.toString() ?: "N/A"} / ${reading?.gps?.hdop?.let { "%.2f".format(it) } ?: "N/A"}",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        text = "GPS UTC/Date: ${reading?.gps?.utc_time ?: "N/A"} / ${reading?.gps?.date ?: "N/A"}",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        text = "Vibration (Magnitude): ${reading?.vibration?.magnitude?.let { "%.2f".format(it) } ?: "N/A"} g",
                        style = MaterialTheme.typography.bodyLarge
                    )
                    Text(
                        text = "Accel XYZ: ${reading?.vibration?.accel_x?.let { "%.4f".format(it) } ?: "N/A"}, ${reading?.vibration?.accel_y?.let { "%.4f".format(it) } ?: "N/A"}, ${reading?.vibration?.accel_z?.let { "%.4f".format(it) } ?: "N/A"}",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        text = "Gyro XYZ: ${reading?.vibration?.gyro_x?.let { "%.4f".format(it) } ?: "N/A"}, ${reading?.vibration?.gyro_y?.let { "%.4f".format(it) } ?: "N/A"}, ${reading?.vibration?.gyro_z?.let { "%.4f".format(it) } ?: "N/A"}",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        text = "Proximity (Distance): ${reading?.proximityDistanceCm?.let { "%.3f".format(it) } ?: "N/A"} cm",
                        style = MaterialTheme.typography.bodyLarge
                    )
                    Text(
                        text = "PIR (Motion): ${reading?.pirStatus?.toString() ?: "N/A"}",
                        style = MaterialTheme.typography.bodyLarge
                    )
                    Text(
                        text = "IR (Intensity): ${reading?.ir?.analog_value?.toString() ?: "N/A"}",
                        style = MaterialTheme.typography.bodyLarge
                    )
                    Text(
                        text = "Buzzer State: ${reading?.buzzer?.state?.toString() ?: "N/A"}",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        text = "Maintenance: active=${reading?.maintenance?.active?.toString() ?: "N/A"}, remaining=${reading?.maintenance?.remaining_ms?.toString() ?: "N/A"} ms, card=${reading?.maintenance?.card_id ?: "N/A"}",
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        }

        item {
            Text(text = "Timeline of Breach", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
        }

            items(timeline, key = { it.id }) { entry ->
                Card(elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(text = "${entry.displayTime} - ${entry.eventDescription}", style = MaterialTheme.typography.bodyLarge)
                        Text(text = "Severity: ${entry.severity.name}", style = MaterialTheme.typography.labelMedium)
                    }
                }
            }
        }
    }
}
