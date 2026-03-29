# Application Workflow

1. **System Initialization (`setup()`)**
   - The ESP32 opens hardware serial streams.
   - Initial connection is attempted for the pre-configured `COMM_MODE` (e.g. WiFi connects to AP; GSM registers on cellular network, configures GPRS).
   - Sensors and busses are initialized (I2C for MPU6050, UART for GPS/GSM, SPI for RFID/NRF24).
   - Control pins for the buzzer, IR, and ultrasonic sensors are assigned. 

2. **Continuous Loop (`loop()`)**
   - **RFID Authorization:** The system checks if an RFID card is presented. If an authorized read occurs, the system enters "Maintenance Mode", pausing further backend telemetry updates for a default of 2 hours.
   
3. **Telemetry Dispatch (Every 3 seconds)**
   - The ultrasonic sensor fires a ping to detect distance (`getDistance()`). Note: v2.3 logic derives `pir_status` true if an object is closer than `MOTION_DISTANCE_CM` (default 15cm).
   - Acceleration and vibration (magnitude) matrices are parsed from the MPU6050.
   - GPS buffers are decoded via `TinyGPSPlus`.
   - All environment variables, metadata (uptime, device ID, RSSI), and proximity data are serialized into a packed JSON document.
   - `sendData()` is called:
     - **WiFi:** Dispatches standard HTTP POST with `application/json` payload to the target server.
     - **GSM:** Uses continuous AT commands to mount HTTP over GPRS, transmitting the payload string.
     - **NRF:** Serializes a smaller, compressed packet containing only vital alerts (Magnitude, PIR, Proximity) to fit into standard NRF TX buffers.

4. **Action Handling**
   - After a successful POST, `handleResponse()` executes.
   - Parses incoming JSON and triggers local effectors (activating `BUZZER_PIN`).
   - Re-routes system behavior if variables like `set_comm_mode` dictate a switch from WiFi to GSM or vice-versa.
