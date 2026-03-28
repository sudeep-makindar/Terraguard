# Hardware Guide

## Component List
- **Main Microcontroller:** ESP32 (e.g., NodeMCU or WROOM-32)
- **Vibration & Motion:** MPU6050 (6-axis accelerometer and gyroscope)
- **Positioning:** NEO-6M GPS Module
- **Proximity & Motion:** HC-SR04 Ultrasonic Sensor (distance acts as a virtual PIR trigger)
- **Proximity (Short-range):** IR Sensor
- **Alert Indicator:** Piezo Buzzer
- **Cellular Comm:** SIM800L GSM Module
- **RF Comm:** NRF24L01 Transceiver
- **Authentication:** MFRC522 RFID Module
- **Level Shifter:** HW-024 Level Converter (recommended for HC-SR04 ECHO pin 5V to 3.3V)

## Pin Mappings (ESP32)

| Component           | ESP32 Pin        | Notes                                  |
|---------------------|------------------|----------------------------------------|
| **MPU6050**         | SDA: 21, SCL: 22 | Standard I2C                           |
| **GPS NEO-6M**      | RX: 16, TX: 17   | UART2                                  |
| **HC-SR04**         | Trig: 26, Echo: 25| Echo connects via HW-024 converter (A) |
| **IR Sensor**       | 34               | Analog Input                           |
| **Buzzer**          | 32               | Digital Output (Active High)           |
| **SIM800L**         | RX: 14, TX: 13   | UART1                                  |
| **NRF24L01**        | CE: 4, CSN: 5    | SCK=18, MISO=19, MOSI=23 (Default SPI) |
| **MFRC522 (RFID)**  | SS: 2, RST: 0    | Standard SPI                           |

> **Note:** Ensure all modules sharing SPI (NRF24L01 and MFRC522) use the standard SPI pins (MOSI: 23, MISO: 19, SCK: 18) with separate Chip Select / SS pins.
