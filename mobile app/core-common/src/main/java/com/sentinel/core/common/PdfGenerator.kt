package com.sentinel.core.common

import android.content.Context
import android.graphics.Color
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import androidx.core.content.FileProvider
import com.sentinel.core.model.NodeDetail
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class PdfGenerator(
    private val context: Context,
    private val fileProviderAuthority: String
) {
    fun generateNodeDossier(detail: NodeDetail): android.net.Uri {
        val pdf = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(1240, 1754, 1).create()
        val page = pdf.startPage(pageInfo)

        val canvas = page.canvas
        val titlePaint = Paint().apply {
            color = Color.parseColor("#B00020")
            textSize = 36f
            isFakeBoldText = true
        }
        val sectionPaint = Paint().apply {
            color = Color.BLACK
            textSize = 24f
            isFakeBoldText = true
        }
        val bodyPaint = Paint().apply {
            color = Color.parseColor("#232323")
            textSize = 20f
        }

        canvas.drawText("Government of Tamil Nadu - Illegal Mining Evidence Report", 70f, 100f, titlePaint)
        canvas.drawText("Node: ${detail.nodeId}", 70f, 170f, sectionPaint)

        val time = SimpleDateFormat("dd MMM yyyy, hh:mm a", Locale.US).format(Date(detail.generatedAtEpochMs))
        canvas.drawText("Generated: $time", 70f, 210f, bodyPaint)
        canvas.drawText("Map Location: ${"%.6f".format(detail.latitude)}, ${"%.6f".format(detail.longitude)}", 70f, 245f, bodyPaint)

        canvas.drawText("Telemetry Snapshot", 70f, 320f, sectionPaint)
        drawGraph(canvas, "Vibration", detail.vibrationTrend, 70f, 355f)
        drawGraph(canvas, "Sound dB", detail.dbTrend, 70f, 620f)

        canvas.drawText("Timeline", 70f, 900f, sectionPaint)
        var y = 940f
        detail.timeline.take(8).forEach {
            canvas.drawText("${it.displayTime} - ${it.eventDescription} (${it.severity.name})", 90f, y, bodyPaint)
            y += 34f
        }

        val citizenId = detail.citizenReportId?.toString() ?: "N/A"
        val verdict = "Automated detection of heavy machinery at $time in ${"%.5f".format(detail.latitude)}, ${"%.5f".format(detail.longitude)}. Verified by Citizen Report ID #$citizenId."
        canvas.drawText("Verdict", 70f, 1320f, sectionPaint)
        canvas.drawText(verdict, 90f, 1360f, bodyPaint)
        detail.closestIntruderCm?.let {
            canvas.drawText("Radar proximity evidence: closest object at ${it} cm.", 90f, 1400f, bodyPaint)
        }

        pdf.finishPage(page)

        val outDir = File(context.filesDir, "shared").apply { mkdirs() }
        val file = File(outDir, "evidence_${detail.nodeId}_${detail.generatedAtEpochMs}.pdf")
        FileOutputStream(file).use { pdf.writeTo(it) }
        pdf.close()

        return FileProvider.getUriForFile(context, fileProviderAuthority, file)
    }

    private fun drawGraph(
        canvas: android.graphics.Canvas,
        label: String,
        values: List<Float>,
        startX: Float,
        startY: Float
    ) {
        val axisPaint = Paint().apply { color = Color.GRAY; strokeWidth = 2f }
        val linePaint = Paint().apply { color = Color.parseColor("#00897B"); strokeWidth = 4f }
        val textPaint = Paint().apply { color = Color.BLACK; textSize = 18f; isFakeBoldText = true }

        val width = 1000f
        val height = 200f
        canvas.drawText(label, startX, startY, textPaint)
        canvas.drawRect(startX, startY + 20f, startX + width, startY + 20f + height, axisPaint)
        if (values.size < 2) return

        val min = values.minOrNull() ?: 0f
        val max = values.maxOrNull() ?: 1f
        val range = (max - min).takeIf { it > 0f } ?: 1f
        val step = width / (values.size - 1)

        for (i in 0 until values.lastIndex) {
            val x1 = startX + (i * step)
            val y1 = startY + 20f + height - (((values[i] - min) / range) * height)
            val x2 = startX + ((i + 1) * step)
            val y2 = startY + 20f + height - (((values[i + 1] - min) / range) * height)
            canvas.drawLine(x1, y1, x2, y2, linePaint)
        }
    }
}
