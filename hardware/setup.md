# Setup & Installation

## 1. Prerequisites
- **Arduino IDE v1.8+ or v2.x** installed.
- **ESP32 Board Package** installed via Board Manager.

## 2. Library Dependencies
Install the following libraries using the Arduino Library Manager (`Tools > Manage Libraries`):
- `MPU6050` by Jeff Rowberg
- `ArduinoJson` by Benoit Blanchon
- `TinyGPSPlus` by Mikal Hart
- `RF24` by TMRh20
- `MFRC522` by GithubCommunity

## 3. Configuration
Before uploading, configure the sketch variables:

### Communication Mode
Select the primary communication method by defining `COMM_MODE` on line 9:
```cpp
#define COMM_MODE MODE_WIFI // Options: MODE_WIFI, MODE_GSM, MODE_NRF
```

- **WiFi:** Update `WIFI_SSID` and `WIFI_PASSWORD`. Set `SERVER_URL`.
- **GSM:** Update `GSM_APN`, `GSM_USER`, and `GSM_PASS`.

### Motion Threshold
Adjust `MOTION_DISTANCE_CM` to configure the distance (in cm) that triggers a motion alert.
```cpp
#define MOTION_DISTANCE_CM 15.0
```

### Feature Flags (Sensors Present)
If you are missing certain hardware modules, you can disable them by setting their realtime flags to `false`. This uses dummy values for testing.
```cpp
#define GPS_REAL  true
#define RFID_REAL false
```

## 4. Flash to ESP32
1. Connect ESP32 via USB.
2. Select your exact ESP32 model under `Tools > Board`.
3. Select the correct COM Port under `Tools > Port`.
4. Click **Upload**. (If it fails to connect, press and hold the 'BOOT' button on the ESP32 until uploading starts).
