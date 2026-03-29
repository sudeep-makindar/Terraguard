package com.sentinel.app

object Constants {
    object Endpoints {
        const val PRIMARY_ESP32_BASE_URL = "http://172.16.41.167:6767"
        const val TELEMETRY_PATH = "/latest"
    }

    object Streams {
        val CAMERA_STREAM_URLS = listOf(
            "http://172.16.41.165:5000",
            "http://172.16.41.167:5000",
            "http://172.16.41.209:5000",
            "http://172.16.41.159:5000"
        )
    }

    object Performance {
        const val SENSOR_POLL_INTERVAL_MS = 1_000L
    }

    object SeverityThresholds {
        const val VIBRATION_WARNING = 1.1
        const val VIBRATION_CRITICAL = 2.0
        const val VIBRATION_ALERT_TRIGGER = 1.1
        const val TURBIDITY_ALERT_IR_DROP = 100
        const val TURBIDITY_WARNING_IR_DROP = 3000
        const val INCIDENT_CONFIDENCE_BOOST_PERCENT = 30
    }

    object Legal {
        const val TN_POLICE_FIR_PORTAL_URL = "https://eservices.tnpolice.gov.in/"
    }

    object Palette {
        const val SAFE_TEAL = 0xFF00897B
        const val WARNING_AMBER = 0xFFFFAB00
        const val ERROR_RED = 0xFFB00020
    }
}
