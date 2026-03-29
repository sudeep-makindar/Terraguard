// ============================================================
//  TerraGuard — ESP32 Main Sketch
//  Version: 2.1
//  Changes from v2.0:
//  - Single HC-SR04 on servo (removed second sensor)
//  - HW-024 level converter still used for ECHO pin
//  - Cleaned up all dual-sensor references
// ============================================================

// ------------------------------------------------------------
//  COMMUNICATION MODE
//  Options: MODE_WIFI | MODE_GSM | MODE_NRF
// ------------------------------------------------------------
#define COMM_MODE MODE_WIFI

#define MODE_WIFI 1
#define MODE_GSM  2
#define MODE_NRF  3

// ------------------------------------------------------------
//  YOUR SETTINGS
// ------------------------------------------------------------
const char* WIFI_SSID     = "testing324";
const char* WIFI_PASSWORD = "12345678";
const char* SERVER_URL    = "http://192.168.137.1:6767/data";

const char* GSM_APN  = "airtelgprs.com";
const char* GSM_USER = "";
const char* GSM_PASS = "";

// ------------------------------------------------------------
//  FEATURE FLAGS
// ------------------------------------------------------------
#define GPS_REAL  true    // NEO-6M wired and working
#define PIR_REAL  true    // HC-SR501 wired and working
#define RFID_REAL false   // module not arrived yet

// ------------------------------------------------------------
//  DUMMY VALUES (only used if flags above are false)
// ------------------------------------------------------------
#define GPS_DUMMY_LAT   11.1271
#define GPS_DUMMY_LNG   78.6569
#define GPS_DUMMY_ALT   94.2
#define GPS_DUMMY_SATS  0
#define GPS_DUMMY_FIX   0
#define GPS_DUMMY_TIME  "00:00:00"
#define GPS_DUMMY_DATE  "00/00/00"
#define PIR_DUMMY       0

// ------------------------------------------------------------
//  PIN DEFINITIONS
// ------------------------------------------------------------

// I2C — MPU6050
#define SDA_PIN      21
#define SCL_PIN      22

// GPS UART2
#define GPS_RX_PIN   16
#define GPS_TX_PIN   17

// PIR
#define PIR_PIN      27

// HC-SR04 (single, mounted on servo)
#define TRIG_PIN     26
#define ECHO_PIN     25   // via HW-024 level converter A side

// SG90 Servo
#define SERVO_PIN    15

// IR Sensor
#define IR_PIN       34

// Buzzer
#define BUZZER_PIN   32

// SIM800L UART1
#define GSM_RX_PIN   14
#define GSM_TX_PIN   13

// NRF24L01 SPI
#define NRF_CE_PIN   4
#define NRF_CSN_PIN  5
// SCK=18, MISO=19, MOSI=23 (ESP32 default SPI)

// RFID placeholder pins — confirm when module arrives
#define RFID_SS_PIN  2
#define RFID_RST_PIN 0

// ------------------------------------------------------------
//  RADAR SETTINGS
// ------------------------------------------------------------
#define RADAR_MIN_ANGLE  0
#define RADAR_MAX_ANGLE  180
#define RADAR_STEP       5      // degrees per step
#define RADAR_STEP_DELAY 30     // ms between steps
#define RADAR_ALERT_CM   500    // alert if object within 500cm

// ------------------------------------------------------------
//  RFID MAINTENANCE MODE
// ------------------------------------------------------------
#define MAINTENANCE_DURATION_MS 7200000UL  // 2 hours

bool          maintenanceMode  = false;
unsigned long maintenanceStart = 0;
String        maintenanceCardID = "";

// ------------------------------------------------------------
//  LIBRARIES
// ------------------------------------------------------------
#include <Wire.h>
#include <MPU6050.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>

#if GPS_REAL
  #include <TinyGPSPlus.h>
  HardwareSerial gpsSerial(2);
  TinyGPSPlus gps;
#endif

#if COMM_MODE == MODE_WIFI
  #include <WiFi.h>
  #include <HTTPClient.h>
#endif

#if COMM_MODE == MODE_GSM
  #include <HardwareSerial.h>
  HardwareSerial gsmSerial(1);
#endif

#if COMM_MODE == MODE_NRF
  #include <SPI.h>
  #include <RF24.h>
  RF24 radio(NRF_CE_PIN, NRF_CSN_PIN);
  const byte nrfAddress[6] = "TG001";
#endif

#if RFID_REAL
  #include <SPI.h>
  #include <MFRC522.h>
  MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);
#endif

// ------------------------------------------------------------
//  GLOBALS
// ------------------------------------------------------------
MPU6050 mpu;
Servo   radarServo;
int     currentMode  = COMM_MODE;
int     servoAngle   = RADAR_MIN_ANGLE;
int     servoDir     = 1;   // 1=forward, -1=backward

// Radar scan storage
struct RadarPoint {
  int   angle;
  float dist;
};

#define RADAR_POINTS 37   // 0 to 180 in steps of 5
RadarPoint radarScan[RADAR_POINTS];
int radarIndex = 0;

// Closest object in current sweep
float closestDist  = 9999;
int   closestAngle = 0;

unsigned long lastPostTime = 0;
#define POST_INTERVAL 5000

// ------------------------------------------------------------
//  SETUP
// ------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n=============================");
  Serial.println("  TerraGuard Node v2.1");
  Serial.println("=============================");

  // WiFi first
  initComm();

  // MPU6050
  Wire.begin(SDA_PIN, SCL_PIN);
  mpu.initialize();
  Serial.println(mpu.testConnection() ? "[OK] MPU6050" : "[FAIL] MPU6050 — check SDA/SCL");

  // GPS
  #if GPS_REAL
    gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
    Serial.println("[OK] GPS UART started — waiting for fix");
  #endif

  // Sensor pins
  pinMode(PIR_PIN,    INPUT);
  pinMode(TRIG_PIN,   OUTPUT);
  pinMode(ECHO_PIN,   INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  Serial.println("[OK] Sensor pins");

  // Servo
  radarServo.attach(SERVO_PIN);
  radarServo.write(RADAR_MIN_ANGLE);
  delay(500);
  Serial.println("[OK] Servo radar");

  // RFID
  #if RFID_REAL
    SPI.begin();
    rfid.PCD_Init();
    Serial.println("[OK] RFID");
  #else
    Serial.println("[PLACEHOLDER] RFID — set RFID_REAL true when module arrives");
  #endif

  Serial.println("=============================");
  Serial.print("  Comm: ");
  if      (currentMode == MODE_WIFI) Serial.println("WiFi");
  else if (currentMode == MODE_GSM)  Serial.println("GSM");
  else                                Serial.println("NRF24");
  Serial.println("  System Ready");
  Serial.println("=============================\n");
}

// ------------------------------------------------------------
//  COMMUNICATION INIT
// ------------------------------------------------------------
void initComm() {
  #if COMM_MODE == MODE_WIFI
    WiFi.mode(WIFI_STA);
    WiFi.disconnect(true);
    delay(1000);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.print("[WiFi] Connecting");
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 40) {
      delay(500); Serial.print("."); attempts++;
    }
    Serial.println();
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("[WiFi] Connected");
      Serial.print("[WiFi] IP: ");   Serial.println(WiFi.localIP());
      Serial.print("[WiFi] RSSI: "); Serial.println(WiFi.RSSI());
    } else {
      Serial.println("[WiFi] FAILED — check SSID/password, use 2.4GHz");
    }
  #endif

  #if COMM_MODE == MODE_GSM
    gsmSerial.begin(9600, SERIAL_8N1, GSM_RX_PIN, GSM_TX_PIN);
    delay(3000);
    Serial.println("[GSM] Initializing SIM800L...");
    sendAT("AT", 1000);
    sendAT("AT+CPIN?", 1000);
    sendAT("AT+CREG?", 1000);
    sendAT("AT+CGATT=1", 2000);
    sendAT("AT+SAPBR=3,1,\"Contype\",\"GPRS\"", 1000);
    sendAT("AT+SAPBR=3,1,\"APN\",\"" + String(GSM_APN) + "\"", 1000);
    sendAT("AT+SAPBR=1,1", 3000);
    Serial.println("[GSM] Ready");
  #endif

  #if COMM_MODE == MODE_NRF
    SPI.begin();
    radio.begin();
    radio.openWritingPipe(nrfAddress);
    radio.setPALevel(RF24_PA_LOW);
    radio.stopListening();
    Serial.println("[NRF24] Ready — node 2 needed for full mesh");
  #endif
}

// ------------------------------------------------------------
//  DISTANCE — HC-SR04
// ------------------------------------------------------------
float getDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return -1;
  return duration * 0.034 / 2.0;
}

// ------------------------------------------------------------
//  RADAR SWEEP — one step per loop call
// ------------------------------------------------------------
void radarStep() {
  radarServo.write(servoAngle);
  delay(RADAR_STEP_DELAY);

  float dist = getDistance();

  // Store reading
  if (radarIndex < RADAR_POINTS) {
    radarScan[radarIndex] = { servoAngle, dist };
    radarIndex++;
  }

  // Track closest
  if (dist > 0 && dist < closestDist) {
    closestDist  = dist;
    closestAngle = servoAngle;
  }

  Serial.printf("[Radar] Angle: %3d deg  Dist: %.1f cm\n", servoAngle, dist);

  // Step servo
  servoAngle += servoDir * RADAR_STEP;

  // Reverse at 180
  if (servoAngle >= RADAR_MAX_ANGLE) {
    servoAngle = RADAR_MAX_ANGLE;
    servoDir   = -1;
    radarIndex = 0;
    Serial.printf("[Radar] Sweep complete — closest: %.1f cm at %d deg\n", closestDist, closestAngle);
    closestDist  = 9999;
    closestAngle = 0;
  }

  // Reverse at 0
  if (servoAngle <= RADAR_MIN_ANGLE) {
    servoAngle = RADAR_MIN_ANGLE;
    servoDir   = 1;
    radarIndex = 0;
  }
}

// ------------------------------------------------------------
//  RFID CHECK
// ------------------------------------------------------------
void checkRFID() {
  // Check expiry
  if (maintenanceMode) {
    if (millis() - maintenanceStart >= MAINTENANCE_DURATION_MS) {
      maintenanceMode   = false;
      maintenanceCardID = "";
      Serial.println("[RFID] Maintenance expired — system resumed");
    }
    return;
  }

  #if RFID_REAL
    if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;
    String cardID = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
      if (rfid.uid.uidByte[i] < 0x10) cardID += "0";
      cardID += String(rfid.uid.uidByte[i], HEX);
    }
    cardID.toUpperCase();
    Serial.println("[RFID] Card: " + cardID);
    maintenanceMode   = true;
    maintenanceStart  = millis();
    maintenanceCardID = cardID;
    Serial.println("[RFID] Maintenance ON — alerts off for 2 hours");
    rfid.PICC_HaltA();
  #endif
}

// ------------------------------------------------------------
//  PIR READ
// ------------------------------------------------------------
int getPIR() {
  #if PIR_REAL
    return digitalRead(PIR_PIN);
  #else
    return PIR_DUMMY;
  #endif
}

// ------------------------------------------------------------
//  MAINTENANCE REMAINING
// ------------------------------------------------------------
unsigned long maintenanceRemaining() {
  if (!maintenanceMode) return 0;
  unsigned long elapsed = millis() - maintenanceStart;
  if (elapsed >= MAINTENANCE_DURATION_MS) return 0;
  return MAINTENANCE_DURATION_MS - elapsed;
}

// ------------------------------------------------------------
//  BUILD JSON PAYLOAD
// ------------------------------------------------------------
String buildPayload() {
  // MPU6050
  int16_t ax, ay, az, gx, gy, gz;
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
  float magnitude = sqrt(
    pow(ax / 16384.0, 2) +
    pow(ay / 16384.0, 2) +
    pow(az / 16384.0, 2)
  );

  // IR
  int irVal = analogRead(IR_PIN);

  // PIR
  int pirVal = getPIR();

  // GPS feed
  #if GPS_REAL
    while (gpsSerial.available()) gps.encode(gpsSerial.read());
  #endif

  StaticJsonDocument<2048> doc;

  // Device
  doc["device"]["id"]        = "terraguard_node_01";
  doc["device"]["uptime_ms"] = millis();
  doc["device"]["comm_mode"] = (currentMode == MODE_WIFI) ? "wifi"
                             : (currentMode == MODE_GSM)  ? "gsm" : "nrf";
  #if COMM_MODE == MODE_WIFI
    doc["device"]["rssi"]    = WiFi.RSSI();
  #endif

  // GPS
  #if GPS_REAL
    doc["gps"]["lat"]        = gps.location.isValid() ? gps.location.lat()     : 0.0;
    doc["gps"]["lng"]        = gps.location.isValid() ? gps.location.lng()     : 0.0;
    doc["gps"]["altitude_m"] = gps.altitude.isValid() ? gps.altitude.meters()  : 0.0;
    doc["gps"]["speed_kmh"]  = gps.speed.isValid()    ? gps.speed.kmph()       : 0.0;
    doc["gps"]["satellites"] = gps.satellites.value();
    doc["gps"]["fix"]        = gps.location.isValid() ? 1 : 0;
    doc["gps"]["hdop"]       = gps.hdop.isValid()     ? gps.hdop.value()/100.0 : 99.9;
    if (gps.time.isValid()) {
      char t[10];
      sprintf(t, "%02d:%02d:%02d", gps.time.hour(), gps.time.minute(), gps.time.second());
      doc["gps"]["utc_time"] = t;
    }
    if (gps.date.isValid()) {
      char d[10];
      sprintf(d, "%02d/%02d/%02d", gps.date.day(), gps.date.month(), gps.date.year() % 100);
      doc["gps"]["date"] = d;
    }
  #else
    doc["gps"]["lat"]        = GPS_DUMMY_LAT;
    doc["gps"]["lng"]        = GPS_DUMMY_LNG;
    doc["gps"]["altitude_m"] = GPS_DUMMY_ALT;
    doc["gps"]["satellites"] = GPS_DUMMY_SATS;
    doc["gps"]["fix"]        = GPS_DUMMY_FIX;
    doc["gps"]["utc_time"]   = GPS_DUMMY_TIME;
    doc["gps"]["date"]       = GPS_DUMMY_DATE;
    doc["gps"]["is_dummy"]   = true;
  #endif

  // Vibration
  doc["vibration"]["accel_x"]   = ax / 16384.0;
  doc["vibration"]["accel_y"]   = ay / 16384.0;
  doc["vibration"]["accel_z"]   = az / 16384.0;
  doc["vibration"]["gyro_x"]    = gx / 131.0;
  doc["vibration"]["gyro_y"]    = gy / 131.0;
  doc["vibration"]["gyro_z"]    = gz / 131.0;
  doc["vibration"]["magnitude"] = magnitude;

  // Motion
  doc["motion"]["pir_status"] = pirVal;

  // Radar — single sensor
  doc["radar"]["closest_cm"]    = (closestDist == 9999) ? -1 : closestDist;
  doc["radar"]["closest_angle"] = closestAngle;
  doc["radar"]["servo_angle"]   = servoAngle;
  doc["radar"]["alert"]         = (closestDist < RADAR_ALERT_CM && closestDist > 0);

  JsonArray scanArray = doc["radar"].createNestedArray("scan");
  for (int i = 0; i < radarIndex; i++) {
    JsonObject pt = scanArray.createNestedObject();
    pt["angle"] = radarScan[i].angle;
    pt["dist"]  = radarScan[i].dist;
  }

  // IR
  doc["ir"]["analog_value"] = irVal;

  // Buzzer
  doc["buzzer"]["state"] = 0;

  // Maintenance / RFID
  doc["maintenance"]["active"]       = maintenanceMode;
  doc["maintenance"]["remaining_ms"] = maintenanceRemaining();
  doc["maintenance"]["card_id"]      = maintenanceCardID;

  String payload;
  serializeJson(doc, payload);
  return payload;
}

// ------------------------------------------------------------
//  SEND DATA
// ------------------------------------------------------------
void sendData(String payload) {
  if (maintenanceMode) {
    unsigned long rem = maintenanceRemaining();
    unsigned long mins = rem / 60000;
    Serial.printf("[Maintenance] Active — %lu min remaining\n", mins);
    return;
  }

  #if COMM_MODE == MODE_WIFI
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WiFi] Disconnected — reconnecting...");
      WiFi.reconnect();
      delay(2000);
      return;
    }
    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");
    int code = http.POST(payload);
    Serial.print("[WiFi] POST response: "); Serial.println(code);
    if (code == 200) handleResponse(http.getString());
    http.end();
  #endif

  #if COMM_MODE == MODE_GSM
    Serial.println("[GSM] Sending...");
    sendAT("AT+HTTPINIT", 1000);
    sendAT("AT+HTTPPARA=\"CID\",1", 500);
    sendAT("AT+HTTPPARA=\"URL\",\"" + String(SERVER_URL) + "\"", 500);
    sendAT("AT+HTTPPARA=\"CONTENT\",\"application/json\"", 500);
    sendAT("AT+HTTPDATA=" + String(payload.length()) + ",10000", 2000);
    gsmSerial.print(payload);
    delay(1000);
    sendAT("AT+HTTPACTION=1", 5000);
    sendAT("AT+HTTPREAD", 2000);
    sendAT("AT+HTTPTERM", 500);
  #endif

  #if COMM_MODE == MODE_NRF
    StaticJsonDocument<128> mini;
    StaticJsonDocument<2048> full;
    deserializeJson(full, payload);
    mini["mag"]   = full["vibration"]["magnitude"];
    mini["pir"]   = full["motion"]["pir_status"];
    mini["dist"]  = full["radar"]["closest_cm"];
    mini["angle"] = full["radar"]["closest_angle"];
    String mp;
    serializeJson(mini, mp);
    bool ok = radio.write(mp.c_str(), mp.length());
    Serial.print("[NRF24] TX: "); Serial.println(ok ? "OK" : "FAILED");
  #endif
}

// ------------------------------------------------------------
//  HANDLE BACKEND RESPONSE
// ------------------------------------------------------------
void handleResponse(String response) {
  StaticJsonDocument<512> res;
  if (deserializeJson(res, response)) {
    Serial.println("[Response] Parse error"); return;
  }

  int confidence   = res["confidence"] | 0;
  const char* risk = res["risk_level"] | "UNKNOWN";
  Serial.printf("[Alert] Confidence: %d%%  Risk: %s\n", confidence, risk);

  // Buzzer
  if (res["action"]["buzzer"] == true) {
    Serial.println("[Buzzer] ALARM ON");
    digitalWrite(BUZZER_PIN, HIGH);
    delay(2000);
    digitalWrite(BUZZER_PIN, LOW);
    Serial.println("[Buzzer] ALARM OFF");
  }

  // Runtime comm mode override from dashboard
  if (res["action"].containsKey("set_comm_mode")) {
    String m = res["action"]["set_comm_mode"].as<String>();
    if      (m == "wifi") currentMode = MODE_WIFI;
    else if (m == "gsm")  currentMode = MODE_GSM;
    else if (m == "nrf")  currentMode = MODE_NRF;
    Serial.println("[Mode] Switched to: " + m);
  }
}

// ------------------------------------------------------------
//  GSM AT COMMAND HELPER
// ------------------------------------------------------------
#if COMM_MODE == MODE_GSM
void sendAT(String cmd, int timeout) {
  gsmSerial.println(cmd);
  long start = millis();
  while (millis() - start < timeout) {
    if (gsmSerial.available()) Serial.write(gsmSerial.read());
  }
  Serial.println();
}
#endif

// ------------------------------------------------------------
//  MAIN LOOP
// ------------------------------------------------------------
void loop() {
  // Radar sweeps every loop iteration
  radarStep();

  // RFID check every loop
  checkRFID();

  // Post every 5 seconds
  if (millis() - lastPostTime >= POST_INTERVAL) {
    lastPostTime = millis();
    Serial.println("\n--- Sensor read + POST ---");
    String payload = buildPayload();
    Serial.println("[Payload] " + payload);
    sendData(payload);
    Serial.println("--- Done ---\n");
  }
}
