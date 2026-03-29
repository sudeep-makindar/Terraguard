package com.sentinel.feature.dashboard

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.staggeredgrid.LazyVerticalStaggeredGrid
import androidx.compose.foundation.lazy.staggeredgrid.StaggeredGridCells
import androidx.compose.foundation.lazy.staggeredgrid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.GppBad
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sentinel.core.common.ErrorRed
import com.sentinel.core.common.SafeTeal
import com.sentinel.core.common.WarningAmber
import com.sentinel.core.model.AlertSeverity
import com.sentinel.core.model.SensorReading

private data class MetricCardModel(
    val nodeId: String,
    val title: String,
    val value: String,
    val severity: AlertSeverity,
    val isTampered: Boolean,
    val trend: List<Float>,
    val radarWebValues: Triple<Float, Float, Float>? = null
)

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun DashboardScreen(
    readings: List<SensorReading>,
    onNodeClick: (String) -> Unit
) {
    val cards = remember(readings) {
        readings.flatMap { reading ->
            listOf(
                MetricCardModel(reading.nodeId, "Vibration RMS", "${"%.2f".format(reading.vibrationRms)} g", reading.severity, reading.isTampered, syntheticTrend(reading.vibrationRms)),
                MetricCardModel(reading.nodeId, "dB Level", "${"%.0f".format(reading.dbLevel)} dB", reading.severity, reading.isTampered, syntheticTrend(reading.dbLevel)),
                MetricCardModel(reading.nodeId, "Turbidity (IR)", "${reading.ir.analog_value}", reading.severity, reading.isTampered, syntheticTrend(reading.turbidity)),
                MetricCardModel(reading.nodeId, "PIR (Motion)", "${reading.pirStatus}", reading.severity, reading.isTampered, syntheticTrend(reading.pirStatus.toFloat() + 0.1f)),
                MetricCardModel(reading.nodeId, "Proximity", "${"%.3f".format(reading.proximityDistanceCm)} cm", reading.severity, reading.isTampered, syntheticTrend(reading.closestCm.toFloat())),
                MetricCardModel(reading.nodeId, "Battery", "${reading.batteryPercent}%", reading.severity, reading.isTampered, syntheticTrend(reading.batteryPercent.toFloat())),
                MetricCardModel(reading.nodeId, "Device Health", "RSSI ${reading.rssi} dBm", reading.severity, reading.isTampered, syntheticTrend(reading.rssi.toFloat())),
                MetricCardModel(
                    nodeId = reading.nodeId,
                    title = "Radar Web",
                    value = "Vib / Sound / Radar",
                    severity = reading.severity,
                    isTampered = reading.isTampered,
                    trend = syntheticTrend(reading.vibrationRms),
                    radarWebValues = Triple(
                        reading.vibrationRms.coerceIn(0f, 4f) / 4f,
                        (reading.dbLevel / 120f).coerceIn(0f, 1f),
                        (1f - (reading.closestCm.coerceIn(0, 100).toFloat() / 100f)).coerceIn(0f, 1f)
                    )
                )
            )
        }
    }

    LazyVerticalStaggeredGrid(
        columns = StaggeredGridCells.Adaptive(minSize = 180.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalItemSpacing = 12.dp,
        modifier = Modifier
            .background(Color(0xFFF3F6F7))
            .padding(12.dp)
    ) {
        items(cards, key = { it.nodeId + it.title }) { card ->
            MetricCard(
                card = card,
                onClick = { onNodeClick(card.nodeId) }
            )
        }
    }
}

@Composable
private fun MetricCard(
    card: MetricCardModel,
    onClick: () -> Unit
) {
    val (accent, container, lift) = cardStyle(card.severity)

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = container),
        elevation = CardDefaults.cardElevation(defaultElevation = lift)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = card.title,
                    style = MaterialTheme.typography.titleMedium,
                    color = Color(0xFF1D2127)
                )
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (card.isTampered) {
                        Icon(Icons.Default.GppBad, contentDescription = "Broken Shield", tint = accent)
                    }
                    Text(
                        text = if (card.isTampered) "${card.nodeId} - Broken Shield" else card.nodeId,
                        style = MaterialTheme.typography.labelSmall,
                        color = accent
                    )
                }
            }
            Text(
                text = card.value,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF1D2127)
            )
            if (card.radarWebValues != null) {
                RadarWebGraph(
                    values = card.radarWebValues,
                    color = accent,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(120.dp)
                )
            } else {
                Sparkline(
                    points = card.trend,
                    color = accent,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(58.dp)
                )
            }
        }
    }
}

private fun cardStyle(severity: AlertSeverity): Triple<Color, Color, Dp> {
    return Triple(SafeTeal, Color(0xFFFFFFFF), 5.dp)
}

@Composable
private fun RadarWebGraph(
    values: Triple<Float, Float, Float>,
    color: Color,
    modifier: Modifier = Modifier
) {
    Canvas(modifier = modifier) {
        val center = Offset(size.width / 2f, size.height / 2f)
        val maxR = size.minDimension * 0.38f
        val angles = listOf(-90f, 30f, 150f).map { Math.toRadians(it.toDouble()) }

        repeat(4) { ring ->
            val fraction = (ring + 1) / 4f
            val ringPath = Path()
            angles.forEachIndexed { index, angle ->
                val x = center.x + (kotlin.math.cos(angle) * maxR * fraction).toFloat()
                val y = center.y + (kotlin.math.sin(angle) * maxR * fraction).toFloat()
                if (index == 0) ringPath.moveTo(x, y) else ringPath.lineTo(x, y)
            }
            ringPath.close()
            drawPath(ringPath, color = Color(0xFF30404D), style = Stroke(width = 1.5f))
        }

        val radarValues = listOf(values.first, values.second, values.third)
        val dataPath = Path()
        angles.forEachIndexed { index, angle ->
            val radius = maxR * radarValues[index].coerceIn(0f, 1f)
            val x = center.x + (kotlin.math.cos(angle) * radius).toFloat()
            val y = center.y + (kotlin.math.sin(angle) * radius).toFloat()
            if (index == 0) dataPath.moveTo(x, y) else dataPath.lineTo(x, y)
        }
        dataPath.close()

        drawPath(dataPath, color = color.copy(alpha = 0.25f))
        drawPath(dataPath, color = color, style = Stroke(width = 3f, cap = StrokeCap.Round))
    }
}

@Composable
private fun Sparkline(
    points: List<Float>,
    color: Color,
    modifier: Modifier = Modifier
) {
    if (points.size < 2) return

    Canvas(modifier = modifier) {
        val max = points.maxOrNull() ?: 1f
        val min = points.minOrNull() ?: 0f
        val range = (max - min).takeIf { it > 0f } ?: 1f
        val stepX = size.width / (points.size - 1)

        val path = Path()
        points.forEachIndexed { index, value ->
            val x = index * stepX
            val y = size.height - ((value - min) / range * size.height)
            val point = Offset(x, y)
            if (index == 0) path.moveTo(point.x, point.y) else path.lineTo(point.x, point.y)
        }

        drawPath(
            path = path,
            color = color,
            style = Stroke(width = 4f, cap = StrokeCap.Round)
        )
    }
}

private fun syntheticTrend(latestValue: Float): List<Float> {
    return buildList {
        repeat(18) { index ->
            val drift = ((index - 9) * 0.08f)
            val pulse = kotlin.math.sin(index / 2f) * 0.32f
            add((latestValue - drift + pulse).coerceAtLeast(0.2f))
        }
    }
}
