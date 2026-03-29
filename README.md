# 🌊 Sentinel: The River Guardian
> **Real-time Autonomous Illegal Sand Mining Detection & Forensic Enforcement System.**

[![Hardware](https://img.shields.io/badge/Hardware-ESP32--S3-orange?style=for-the-badge&logo=espressif)](https://github.com/yourusername/sentinel)
[![Mobile App](https://img.shields.io/badge/Mobile-Android--Kotlin-green?style=for-the-badge&logo=android)](https://github.com/yourusername/sentinel)
[![Compliance](https://img.shields.io/badge/Compliance-MH%20Court%20March%2031-red?style=for-the-badge)](https://github.com/yourusername/sentinel)
[![Maps](https://img.shields.io/badge/Maps-OpenStreetMap-blue?style=for-the-badge&logo=openstreetmap)](https://github.com/yourusername/sentinel)

## 📌 Executive Summary
Illegal sand mining is an organized crime destroying Tamil Nadu's river ecosystems, causing **₹4,700 Crore** in annual revenue loss and permanent groundwater collapse. **Sentinel** is an end-to-end IoT and Mobile ecosystem designed to meet the **Madras High Court’s March 31, 2026 mandate** for real-time mining tracking.

---
<img width="2752" height="1536" alt="Gemini_Generated_Image_jrh9c2jrh9c2jrh9" src="https://github.com/user-attachments/assets/58c60eca-7c5f-4d98-9af9-500fcc45ba5c" />

## 🚀 Key Features

### 📡 1. Intelligent Edge Sentinel (Hardware)
* **Acoustic Fingerprinting:** Uses FFT on-device to distinguish heavy diesel engines from natural river flow.
* **Triple-Check Verification:** Correlates **Seismic Vibration (ADXL345)**, **Radar Proximity**, and **PIR Motion** to eliminate false positives.
* **Ghost Listener (Assembly):** Custom **ULP Assembly** logic allows the device to monitor 24/7 in a "Deep Sleep" state, waking the main CPU only during a breach.
* **Anti-Tamper Logic:** Instant "Ultra-Critical" alerts if the sensor is moved, covered, or smashed.

### 📱 2. Tactical Enforcement App (Mobile)
* **Zero-Cost GIS:** Built on **OpenStreetMap (OSM)** for unlimited, subscription-free patrolling and offline-ready mapping.
* **Real-Time Patrolling:** Shows a **Pulsing Red Activity Dot** at the officer's mobile location via Fused Location Sync.
* **Automated Evidence Loop:** Triggering a threshold automatically captures **4 rapid snapshots** via the mobile camera.

### ⚖️ 3. Automated Legal Pipeline (Software)
* **IF1 Forensic PDF:** Automatically generates a PDF styled after the **Tamil Nadu FIR Form IF1**, including watermarked photos and sensor telemetry.
* **Persistent Evidence Archive:** A secure, local Room DB log that stores every dossier with a "Zero-Click" save policy.
* **One-Tap FIR Prep:** Launches the **TN Police Portal** and copies a pre-formatted legal report to the clipboard instantly.

---

## 🛠️ Technical Stack
| Layer | Technologies |
| :--- | :--- |
| **Firmware** | C++, ESP-IDF, **ULP Assembly** |
| **Mobile App** | **Kotlin**, Jetpack Compose, Hilt, Ktor, Room DB |
| **Mapping** | **OSMDroid** (OpenStreetMap) |
| **Forensics** | Android `PdfDocument` API, CameraX |

---

## 📋 System Workflow
1.  **Detect:** Sensor node identifies a vibration magnitude **> 2.0g**.
2.  **Capture:** Mobile app auto-snaps **4 visual evidences** and syncs **Mobile GPS**.
3.  **Document:** System generates a **Form IF1 Forensic Dossier** and archives it locally.
4.  **Enforce:** Browser opens the **FIR Portal**; legal text is copied to the clipboard.

---

## 🚀 Deployment Runbook
```bash
# 1. Clone & Build
git clone [https://github.com/yourusername/sentinel.git](https://github.com/yourusername/sentinel.git)
./gradlew :app:assembleDebug

# 2. Install via ADB
adb install app-debug.apk

# 3. Auto-Grant Permissions for Demo
adb shell pm grant com.sentinel.app android.permission.ACCESS_FINE_LOCATION
adb shell pm grant com.sentinel.app android.permission.CAMERA
adb shell pm grant com.sentinel.app android.permission.POST_NOTIFICATIONS

Gemini said
This is your complete, professional README.md for the Sentinel project. It is structured to highlight your "Gold Medal" features—including the ULP Assembly hardware logic, OpenStreetMap integration, and the Automated IF1 Forensic PDF pipeline.

Markdown
# 🌊 Sentinel: The River Guardian
> **Real-time Autonomous Illegal Sand Mining Detection & Forensic Enforcement System.**

[![Hardware](https://img.shields.io/badge/Hardware-ESP32--S3-orange?style=for-the-badge&logo=espressif)](https://github.com/yourusername/sentinel)
[![Mobile App](https://img.shields.io/badge/Mobile-Android--Kotlin-green?style=for-the-badge&logo=android)](https://github.com/yourusername/sentinel)
[![Compliance](https://img.shields.io/badge/Compliance-MH%20Court%20March%2031-red?style=for-the-badge)](https://github.com/yourusername/sentinel)
[![Maps](https://img.shields.io/badge/Maps-OpenStreetMap-blue?style=for-the-badge&logo=openstreetmap)](https://github.com/yourusername/sentinel)

## 📌 Executive Summary
Illegal sand mining is an organized crime destroying Tamil Nadu's river ecosystems, causing **₹4,700 Crore** in annual revenue loss and permanent groundwater collapse. **Sentinel** is an end-to-end IoT and Mobile ecosystem designed to meet the **Madras High Court’s March 31, 2026 mandate** for real-time mining tracking.

---

## 🚀 Key Features

### 📡 1. Intelligent Edge Sentinel (Hardware)
* **Acoustic Fingerprinting:** Uses FFT on-device to distinguish heavy diesel engines from natural river flow.
* **Triple-Check Verification:** Correlates **Seismic Vibration (ADXL345)**, **Radar Proximity**, and **PIR Motion** to eliminate false positives.
* **Ghost Listener (Assembly):** Custom **ULP Assembly** logic allows the device to monitor 24/7 in a "Deep Sleep" state, waking the main CPU only during a breach.
* **Anti-Tamper Logic:** Instant "Ultra-Critical" alerts if the sensor is moved, covered, or smashed.

### 📱 2. Tactical Enforcement App (Mobile)
* **Zero-Cost GIS:** Built on **OpenStreetMap (OSM)** for unlimited, subscription-free patrolling and offline-ready mapping.
* **Real-Time Patrolling:** Shows a **Pulsing Red Activity Dot** at the officer's mobile location via Fused Location Sync.
* **Automated Evidence Loop:** Triggering a threshold automatically captures **4 rapid snapshots** via the mobile camera.

### ⚖️ 3. Automated Legal Pipeline (Software)
* **IF1 Forensic PDF:** Automatically generates a PDF styled after the **Tamil Nadu FIR Form IF1**, including watermarked photos and sensor telemetry.
* **Persistent Evidence Archive:** A secure, local Room DB log that stores every dossier with a "Zero-Click" save policy.
* **One-Tap FIR Prep:** Launches the **TN Police Portal** and copies a pre-formatted legal report to the clipboard instantly.

---

## 🛠️ Technical Stack
| Layer | Technologies |
| :--- | :--- |
| **Firmware** | C++, ESP-IDF, **ULP Assembly** |
| **Mobile App** | **Kotlin**, Jetpack Compose, Hilt, Ktor, Room DB |
| **Mapping** | **OSMDroid** (OpenStreetMap) |
| **Forensics** | Android `PdfDocument` API, CameraX |

---

## 📋 System Workflow
1.  **Detect:** Sensor node identifies a vibration magnitude **> 2.0g**.
2.  **Capture:** Mobile app auto-snaps **4 visual evidences** and syncs **Mobile GPS**.
3.  **Document:** System generates a **Form IF1 Forensic Dossier** and archives it locally.
4.  **Enforce:** Browser opens the **FIR Portal**; legal text is copied to the clipboard.

---

## 🚀 Deployment Runbook
```bash
# 1. Clone & Build
git clone [https://github.com/yourusername/sentinel.git](https://github.com/yourusername/sentinel.git)
./gradlew :app:assembleDebug

# 2. Install via ADB
adb install app-debug.apk

# 3. Auto-Grant Permissions for Demo
adb shell pm grant com.sentinel.app android.permission.ACCESS_FINE_LOCATION
adb shell pm grant com.sentinel.app android.permission.CAMERA
adb shell pm grant com.sentinel.app android.permission.POST_NOTIFICATIONS
⚖️ Legal & Compliance
This project is architected to support Section 379 IPC (Theft) and Section 21 of the MMDR Act 1957. It directly addresses the technical gaps identified by the Madras High Court regarding real-time nocturnal surveillance.

Developed for the 2026 National Level Hackathon Finalists.
