package com.sentinel.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

@Composable
fun EvidencePipelineOverlay(state: EvidencePipelineState) {
    if (!state.active) {
        return
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0x99000000)),
        contentAlignment = Alignment.Center
    ) {
        Card(
            colors = CardDefaults.cardColors(containerColor = Color(0xFF0B0F14)),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
        ) {
            Column(
                modifier = Modifier.padding(18.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = state.message.ifBlank { "Automated Evidence Pipeline" },
                    color = Color.White,
                    style = MaterialTheme.typography.titleLarge
                )
                if (state.stage == PipelineStage.CapturingEvidence) {
                    Text(
                        text = "Snapshots: ${state.capturedCount} / ${state.totalCount}",
                        color = Color(0xFFB0BEC5),
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
                LinearProgressIndicator(
                    progress = { state.progress.coerceIn(0f, 1f) },
                    modifier = Modifier.fillMaxWidth(),
                    color = Color(0xFF00BFA5),
                    trackColor = Color(0xFF263238)
                )
                Text(
                    text = "Capturing Evidence... Generating PDF... Opening FIR Portal...",
                    color = Color(0xFFCFD8DC),
                    style = MaterialTheme.typography.labelLarge
                )
            }
        }
    }
}
