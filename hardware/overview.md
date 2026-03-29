# System Overview

## TerraGuard Node v2.3
TerraGuard is a comprehensive IoT smart security and surveillance node based on the ESP32 microcontroller. It aggregates multi-sensor environmental data to detect anomalies, intrusions, and track asset location, sending telemetry back to a central server.

### Key Features
- **Multi-Comm Capability:** Dynamically functions over WiFi, Cellular (GSM/GPRS via SIM800L), or Local RF (NRF24L01). 
- **Distance-Based Motion Detection:** Uses an HC-SR04 ultrasonic sensor to measure proximity. If an object is detected within a configurable threshold (`MOTION_DISTANCE_CM`), the system registers a motion event (virtual PIR).
- **Vibration/Tamper Detection:** Uses an MPU6050 to detect shocks or abnormal mounting angles.
- **Asset Tracking:** Live GPS coordinates using a NEO-6M module.
- **Maintenance Authentication:** Incorporates an optional RFID reader (MFRC522) allowing authorized personnel to temporarily silence alarms/alerts for a 2-hour maintenance window.
- **Backend Remote Control:** Can accept commands from the remote server's JSON response, such as toggling the onboard buzzer alarm or remotely overriding the active communication mode.

### Dashboard Integration
The TerraGuard node expects to interface with a central dashboard (the backend server). The dashboard can:
- **Receive Telemetry:** The node sends a rich JSON payload containing sensor data, proximity/motion status, GPS coordinates, and current `comm_mode` (WiFi, GSM, or NRF).
- **Trigger Alarms:** The dashboard can return `{"action": {"buzzer": true}}` in the HTTP response to trigger the node's physical buzzer.
- **Override Comm Mode (GSM/WiFi):** The dashboard can remotely switch the node's communication method by returning `{"action": {"set_comm_mode": "gsm"}}` (or `"wifi"`, `"nrf"`). This forces the ESP32 to immediately switch its network interface.
