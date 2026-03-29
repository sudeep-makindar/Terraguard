# Sentinel

Professional-grade river monitoring Android app scaffold built with Jetpack Compose, Hilt, typed Navigation, Google Maps, and mock telemetry simulation.

## Quick Start

1. Add your Google Maps key to local.properties:

MAPS_API_KEY=YOUR_KEY_HERE

2. Build debug APK:

./gradlew assembleDebug

3. Install on a connected device:

adb install -r app/build/outputs/apk/debug/app-debug.apk

4. Grant runtime permissions (Android 13+ notifications and location):

adb shell pm grant com.sentinel.app android.permission.ACCESS_COARSE_LOCATION
adb shell pm grant com.sentinel.app android.permission.ACCESS_FINE_LOCATION
adb shell pm grant com.sentinel.app android.permission.POST_NOTIFICATIONS
adb shell pm grant com.sentinel.app android.permission.CAMERA

## ESP32 Integration

Edit sentinel endpoints in app/src/main/java/com/sentinel/app/Constants.kt.

Current mock mode is active via data-sensor SensorDataModule binding to MockSensorRepository.
To switch later, bind RemoteSensorRepository in SensorDataModule once transport is implemented.

## Demo Loop (Hackathon)

1. Trigger vibration/tamper in mock flow and observe red pulse/ultra-critical status.
2. Open Citizen tab and capture an incident photo.
3. Confirm watermark includes GPS, timestamp, and Node ID.
4. If within 500m of a critical node, app shows Multi-Source Verified badge.
5. Open a node detail and tap Generate Evidence Dossier FAB.
6. Share generated PDF from system share sheet.
