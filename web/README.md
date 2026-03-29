<div align="center">
<img width="1200" height="475" alt="TerraGuard Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 🌿 TerraGuard
### *Intelligent Real-Time Defense Against Illegal Sand Mining*
</div>

---

## 🚀 Overview
**TerraGuard** is a sophisticated multi-vector surveillance system designed to detect and deter illegal riverbed sand mining. By combining low-latency IoT sensor arrays with machine learning-driven forensic logging, TerraGuard provides law enforcement and forest officials with a state-of-the-art situational awareness platform.

## 🏗️ System Architecture
The system is divided into three core pillars:
1.  **Hardware (IoT Nodes)**: ESP32-powered sensor nodes equipped with vibration sensors (magnitude detection), ultrasonic proximity (0-500cm), Infrared (photomech darkness values), and PIR motion sensors.
2.  **Backend (FastAPI)**: A high-performance Python engine that processes raw sensor streams, calculates threat confidence scores, and persists forensic evidence to a NeonDB (PostgreSQL) instance.
3.  **Frontend (React/Vite)**: A high-fidelity, triple-shell dashboard system (Forest-Officer, Police, and Court) featuring real-time data visualization via Recharts and live WebSocket synchronization.

## 🧠 Threat Detection Engine
TerraGuard utilizes a composite scoring algorithm to minimize false positives:
-   **MAJOR TRIGGERS (+55 pts)**: Vibration > 1.1g, Proximity < 15cm, Extreme Infrared Darkness.
-   **CRITICAL ALERTS**: Automatically triggered and saved to the database when 2+ major vectors occur simultaneously (Score $\ge 80$).
-   **HIGH ALERTS**: Triggered by a single confirmed major sensor event (Score $\ge 55$).

## ⚖️ Forensic Evidence Workflow
TerraGuard automates the legal chain-of-custody:
-   **One-Click FIR**: Police officers can generate formal First Information Reports directly from an alert, auto-embedding sensor snapshots and GPS coordinates.
-   **Judicial Export**: The Court Dashboard allows magistrates to review historical alerts, linked FIRs, and time-stamped custody logs for judicial proceedings.
-   **Live WebSockets**: Any status update or FIR generation is instantly broadcast across all dashboards globally.

---

## 🛠️ Setup & Execution

### 1. Web Dashboards (Frontend)
```bash
cd web
npm install
npm run dev
```

### 2. Forensic Logic Service (Backend)
```bash
cd web/terraguard-backend
# Recommended: create a virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py
```

## 🔋 Tech Stack
- **Languages**: TypeScript, Python, C++ (Arduino/ESP32)
- **Frameworks**: React, Vite, FastAPI
- **Database**: PostgreSQL (NeonDB) with SQLAlchemy Async
- **Styling**: Tailwind CSS, Framer Motion, Lucide Icons
- **ML/Analytics**: YOLOv8 (Video), Custom Logic Engine (Sensors)

---
*Developed for the Hackathon — Protecting our riverbeds with intelligence.*
