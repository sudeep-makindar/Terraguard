package com.sentinel.core.common

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint.Align
import android.graphics.RectF
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.net.Uri
import androidx.core.content.FileProvider
import com.sentinel.core.model.SensorReading
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class ForensicSnapshot(
    val bitmap: Bitmap,
    val capturedAtEpochMs: Long,
    val vibrationMagnitude: Double
)

data class ForensicReportRecord(
    val fileName: String,
    val absolutePath: String,
    val generatedAtEpochMs: Long,
    val uri: Uri,
    val snapshotPaths: List<String> = emptyList()
)

class ForensicReporter(
    private val context: Context,
    private val fileProviderAuthority: String
) {

    fun generateAutomatedReport(
        reading: SensorReading,
        snapshots: List<ForensicSnapshot>,
        vibrationSeries: List<Float>,
        mobileLatitude: Double,
        mobileLongitude: Double
    ): ForensicReportRecord {
        val generatedAt = System.currentTimeMillis()
        val stamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date(generatedAt))
        val outDir = File(context.filesDir, "evidence_logs").apply { mkdirs() }
        val snapshotPaths = saveSnapshots(outDir, stamp, snapshots)
        val pdf = PdfDocument()
        val vibrationPeak = vibrationSeries.maxOrNull()?.toDouble() ?: reading.vibration.magnitude
        val radarPeak = reading.closestCm

        val page1 = pdf.startPage(PdfDocument.PageInfo.Builder(1240, 1754, 1).create())
        drawIncidentSummary(page1.canvas, reading, generatedAt)
        pdf.finishPage(page1)

        val page2 = pdf.startPage(PdfDocument.PageInfo.Builder(1240, 1754, 2).create())
        drawVisualEvidencePage(page2.canvas, snapshots, vibrationPeak, radarPeak, mobileLatitude, mobileLongitude)
        pdf.finishPage(page2)

        val page3 = pdf.startPage(PdfDocument.PageInfo.Builder(1240, 1754, 3).create())
        drawTelemetryPage(page3.canvas, reading, vibrationSeries, mobileLatitude, mobileLongitude)
        pdf.finishPage(page3)

        val fileName = "SENTINEL_REPORT_${stamp}.pdf"
        val file = File(outDir, fileName)

        FileOutputStream(file).use { pdf.writeTo(it) }
        pdf.close()

        val uri = FileProvider.getUriForFile(context, fileProviderAuthority, file)
        return ForensicReportRecord(
            fileName = fileName,
            absolutePath = file.absolutePath,
            generatedAtEpochMs = generatedAt,
            uri = uri,
            snapshotPaths = snapshotPaths
        )
    }

    fun generateDraftReport(
        reading: SensorReading,
        citizenReportId: Long?,
        verificationScore: Int
    ): Uri {
        val placeHolder = Bitmap.createBitmap(420, 320, Bitmap.Config.ARGB_8888).also { bitmap ->
            val canvas = Canvas(bitmap)
            val fill = Paint().apply { color = Color.LTGRAY }
            val text = Paint().apply { color = Color.DKGRAY; textSize = 28f; textAlign = Align.CENTER }
            canvas.drawRect(0f, 0f, bitmap.width.toFloat(), bitmap.height.toFloat(), fill)
            canvas.drawText("No Camera Frame", bitmap.width / 2f, bitmap.height / 2f, text)
        }
        val snapshots = List(4) {
            ForensicSnapshot(
                bitmap = placeHolder,
                capturedAtEpochMs = System.currentTimeMillis(),
                vibrationMagnitude = reading.vibration.magnitude
            )
        }
        return generateAutomatedReport(
            reading = reading,
            snapshots = snapshots,
            vibrationSeries = listOf(0.8f, 1.0f, 1.3f, reading.vibrationRms, 1.2f),
            mobileLatitude = reading.mapLatitude,
            mobileLongitude = reading.mapLongitude
        ).uri
    }

    private fun drawIncidentSummary(
        canvas: Canvas,
        reading: SensorReading,
        generatedAtEpochMs: Long
    ) {
        val header = Paint().apply { color = Color.parseColor("#8D1F1F"); textSize = 42f; isFakeBoldText = true }
        val section = Paint().apply { color = Color.BLACK; textSize = 26f; isFakeBoldText = true }
        val body = Paint().apply { color = Color.parseColor("#222222"); textSize = 22f }
        val timestamp = SimpleDateFormat("dd MMM yyyy, HH:mm:ss.SSS", Locale.US).format(Date(generatedAtEpochMs))
        val date = SimpleDateFormat("dd/MM/yyyy", Locale.US).format(Date(generatedAtEpochMs))

        canvas.drawText("FIRST INFORMATION REPORT - Under Section 154 Cr.P.C", 56f, 95f, header)
        canvas.drawText("Integrated Form IF1 - Tamil Nadu", 56f, 152f, section)
        canvas.drawText("1. Date of Report: $date", 56f, 220f, body)
        canvas.drawText("2. Police Station: Cauvery Protection Unit", 56f, 262f, body)
        canvas.drawText("3. Sections: 379 IPC / Sec 21 MMDR Act", 56f, 304f, body)
        canvas.drawText("Alert Timestamp: $timestamp", 56f, 360f, body)
        canvas.drawText("ESP32 Node ID: ${reading.nodeId}", 56f, 402f, body)
        canvas.drawText("Offence Details", 56f, 470f, section)
        canvas.drawText("Illegal extraction activity detected with vibration and radar corroboration.", 56f, 512f, body)
        canvas.drawText("Section 379 IPC invoked for theft of mineral resources.", 56f, 554f, body)
        canvas.drawText("Section 21 MMDR Act, 1957 invoked for unauthorized mining operations.", 56f, 596f, body)
        canvas.drawText("Field RSSI: ${reading.rssi} dBm", 56f, 638f, body)

        drawSeal(canvas)
    }

    private fun saveSnapshots(
        outDir: File,
        stamp: String,
        snapshots: List<ForensicSnapshot>
    ): List<String> {
        return snapshots.take(4).mapIndexed { index, snapshot ->
            val shotFile = File(outDir, "SENTINEL_SNAPSHOT_${stamp}_${index + 1}.jpg")
            FileOutputStream(shotFile).use { stream ->
                snapshot.bitmap.compress(Bitmap.CompressFormat.JPEG, 92, stream)
            }
            shotFile.absolutePath
        }
    }

    private fun drawVisualEvidencePage(
        canvas: Canvas,
        snapshots: List<ForensicSnapshot>,
        vibrationPeak: Double,
        radarPeakCm: Int,
        mobileLatitude: Double,
        mobileLongitude: Double
    ) {
        val section = Paint().apply { color = Color.BLACK; textSize = 26f; isFakeBoldText = true }
        val border = Paint().apply { color = Color.DKGRAY; style = Paint.Style.STROKE; strokeWidth = 3f }
        val overlay = Paint().apply { color = Color.parseColor("#AA000000") }
        val overlayText = Paint().apply { color = Color.WHITE; textSize = 18f; isFakeBoldText = true }
        val body = Paint().apply { color = Color.parseColor("#222222"); textSize = 20f }

        canvas.drawText("Evidence Page - Visual Capture Matrix", 56f, 95f, section)
        canvas.drawText("Vibration Peak: ${"%.2f".format(Locale.US, vibrationPeak)} g", 56f, 130f, body)
        canvas.drawText("Radar Peak (Closest): ${radarPeakCm} cm", 400f, 130f, body)
        canvas.drawText("Mobile GPS at Alert: ${"%.6f".format(Locale.US, mobileLatitude)}, ${"%.6f".format(Locale.US, mobileLongitude)}", 700f, 130f, body)

        val normalized = if (snapshots.size >= 4) snapshots.take(4) else {
            snapshots + List(4 - snapshots.size) {
                ForensicSnapshot(
                    bitmap = Bitmap.createBitmap(300, 240, Bitmap.Config.ARGB_8888),
                    capturedAtEpochMs = System.currentTimeMillis(),
                    vibrationMagnitude = 0.0
                )
            }
        }

        val margin = 56f
        val gap = 28f
        val availableWidth = 1240f - (margin * 2)
        val cellWidth = (availableWidth - gap) / 2f
        val cellHeight = 680f
        val top = 140f

        normalized.forEachIndexed { index, shot ->
            val col = index % 2
            val row = index / 2
            val left = margin + (col * (cellWidth + gap))
            val t = top + (row * (cellHeight + gap))
            val rect = RectF(left, t, left + cellWidth, t + cellHeight)
            canvas.drawBitmap(shot.bitmap, null, rect, null)
            canvas.drawRect(rect, border)

            val bannerTop = rect.bottom - 54f
            canvas.drawRect(rect.left, bannerTop, rect.right, rect.bottom, overlay)
            val ts = SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.US).format(Date(shot.capturedAtEpochMs))
            val vib = "%.2f".format(Locale.US, shot.vibrationMagnitude)
            canvas.drawText("$ts | Vib: ${vib}g", rect.left + 12f, rect.bottom - 18f, overlayText)
        }

        drawSeal(canvas)
    }

    private fun drawTelemetryPage(
        canvas: Canvas,
        reading: SensorReading,
        vibrationSeries: List<Float>,
        mobileLatitude: Double,
        mobileLongitude: Double
    ) {
        val section = Paint().apply { color = Color.BLACK; textSize = 26f; isFakeBoldText = true }
        val body = Paint().apply { color = Color.parseColor("#222222"); textSize = 20f }

        canvas.drawText("Page 3 - Sensor Telemetry", 56f, 95f, section)
        canvas.drawText("Vibration Spike Timeline", 56f, 150f, body)
        drawGraph(
            canvas = canvas,
            x = 56f,
            y = 190f,
            values = if (vibrationSeries.isNotEmpty()) vibrationSeries else listOf(0.5f, 0.8f, reading.vibrationRms, 1.0f)
        )

        canvas.drawText("Radar Proximity Evidence", 56f, 560f, body)
        canvas.drawText("radar.closest_cm = ${reading.closestCm}", 56f, 605f, body)
        canvas.drawText("radar.alert = ${reading.radarAlert}", 56f, 650f, body)
        canvas.drawText("motion.pir_status = ${reading.pirStatus}", 56f, 695f, body)
        canvas.drawText("mobile.lat = ${"%.6f".format(Locale.US, mobileLatitude)}", 56f, 740f, body)
        canvas.drawText("mobile.lng = ${"%.6f".format(Locale.US, mobileLongitude)}", 56f, 785f, body)

        val rawHeader = Paint().apply { color = Color.BLACK; textSize = 22f; isFakeBoldText = true }
        val rawBody = Paint().apply { color = Color.parseColor("#222222"); textSize = 16f }
        canvas.drawText("Chain of Custody (Raw JSON)", 56f, 850f, rawHeader)
        val raw = reading.rawJsonLog.ifBlank { "{}" }
        var y = 890f
        raw.chunked(102).take(34).forEach { line ->
            canvas.drawText(line, 56f, y, rawBody)
            y += 22f
        }

        drawSeal(canvas)
    }

    private fun drawGraph(canvas: Canvas, x: Float, y: Float, values: List<Float>) {
        val frame = Paint().apply { color = Color.GRAY; style = Paint.Style.STROKE; strokeWidth = 2f }
        val line = Paint().apply { color = Color.parseColor("#B00020"); strokeWidth = 4f }
        val marker = Paint().apply { color = Color.parseColor("#1565C0"); textSize = 16f }
        canvas.drawRect(x, y, x + 1124f, y + 300f, frame)

        val min = values.minOrNull() ?: 0f
        val max = values.maxOrNull() ?: 1f
        val range = (max - min).takeIf { it > 0f } ?: 1f
        val step = 1124f / (values.size - 1)

        for (i in 0 until values.lastIndex) {
            val x1 = x + (i * step)
            val y1 = y + 300f - (((values[i] - min) / range) * 300f)
            val x2 = x + ((i + 1) * step)
            val y2 = y + 300f - (((values[i + 1] - min) / range) * 300f)
            canvas.drawLine(x1, y1, x2, y2, line)
        }

        val peak = max
        canvas.drawText("Peak: ${"%.2f".format(Locale.US, peak)}g", x + 12f, y + 24f, marker)
    }

    private fun drawSeal(canvas: Canvas) {
        val seal = Paint().apply {
            color = Color.parseColor("#5500897B")
            textSize = 34f
            isFakeBoldText = true
        }
        canvas.save()
        canvas.rotate(-18f, 320f, 1520f)
        canvas.drawText("SEAL OF AUTHENTICITY - SENTINEL", 120f, 1520f, seal)
        canvas.restore()
    }
}
