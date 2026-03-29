import { useState, useEffect, useRef } from 'react';
import { useAppStore, Alert } from '../store/useAppStore';

export interface SensorReading {
  timestamp: string;
  device_id: string;
  lat: number;
  lng: number;
  magnitude: number;
  accel_x: number;
  accel_y: number;
  accel_z: number;
  gyro_x: number;
  gyro_y: number;
  gyro_z: number;
  pir_status: number;
  radar_closest_cm: number;
  radar_alert: boolean;
  ir_analog: number;
  rssi: number;
  satellites: number;
}

export interface AlertEvent {
  id: string;
  timestamp: string;
  confidence: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasons: string[];
  lat: number;
  lng: number;
  device_id: string;
}

const HISTORY_SIZE = 30;

export function useSensorSimulator() {
  const [reading, setReading] = useState<SensorReading | null>(null);
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [confidence, setConfidence] = useState(0);
  const [reasons, setReasons] = useState<string[]>([]);
  const [riskLevel, setRiskLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('LOW');
  const { updateNode, injectLiveAlert, injectLiveFIR, updateLiveFIRStatus } = useAppStore();
  
  // Real-time Laptop GPS state
  const [laptopGps, setLaptopGps] = useState({ lat: 11.1271, lng: 78.6569 }); // Default coords
  const laptopGpsRef = useRef(laptopGps);

  useEffect(() => {
    // 1. Get Laptop GPS via Browser API
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newGps = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLaptopGps(newGps);
          laptopGpsRef.current = newGps;
          console.log(`Laptop GPS Updated: ${pos.coords.latitude}, ${pos.coords.longitude}`);
        },
        (err) => console.warn(`GPS Error: ${err.message}`),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  useEffect(() => {
    // 2. Connect to Backend WebSocket
    const ws = new WebSocket('ws://localhost:8000/ws');

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'alert_triggered') {
        const ad = msg.data;
        // Global alert logic
        const globalAlert: Alert = {
          id: ad.id,
          timestamp: ad.triggered_at,
          confidence: ad.confidence,
          risk_level: ad.risk_level,
          reasons: ad.reasons,
          lat: laptopGpsRef.current.lat,
          lng: laptopGpsRef.current.lng,
          device_id: ad.device_id,
          location_name: 'River Entry Point',
          status: 'NEW',
          sensor_snapshot: reading || dummyReading,
        };
        injectLiveAlert(globalAlert);

        const newAlert: AlertEvent = {
          id: ad.id,
          timestamp: ad.triggered_at,
          confidence: ad.confidence,
          risk_level: ad.risk_level,
          reasons: ad.reasons,
          lat: laptopGpsRef.current.lat,
          lng: laptopGpsRef.current.lng,
          device_id: ad.device_id,
        };
        setAlerts(prev => [newAlert, ...prev].slice(0, 20));
      } else if (msg.type === 'fir_created') {
        const fd = msg.data;
        injectLiveFIR({
          id: fd.id,
          alert_id: fd.alert_id,
          incident_time: fd.fir_data?.incident_date_time,
          incident_location: fd.fir_data?.location,
          nature_of_offence: fd.fir_data?.nature_of_offence,
          evidence_ref: fd.fir_data?.evidence_reference,
          sensor_summary: fd.fir_data?.sensor_readings_summary,
          confidence: fd.fir_data?.confidence_score || 0,
          reporting_officer: fd.filed_by,
          station: fd.station_name,
          additional_notes: fd.fir_data?.additional_notes || "",
          status: fd.status,
          created_at: fd.generated_at,
        });
      } else if (msg.type === 'fir_status_update') {
        updateLiveFIRStatus(msg.data.fir_id, msg.data.status);
      }
    };

    return () => ws.close();
  }, []); // Empty dependency array prevents reconnect loops caused by GPS jitter

  useEffect(() => {
    // Direct UI Polling to Relay (Bypassing Backend Bottleneck)
    // Uses Vite proxy to avoid CORS security blocks!
    let active = true;
    const fetchLatest = async () => {
      try {
        const res = await fetch('/relay/latest');
        if (!res.ok) return;
        const payload = await res.json();
        
        if (active && payload.device) {
          let radarDist = payload.proximity?.distance_cm || 0;
          
          // User Request: Force PIR Detection if proximity < 15cm, otherwise ignore hardware PIR data
          const overridePirStatus = (radarDist > 0 && radarDist <= 15) ? 1 : 0;

          const newReading: SensorReading = {
            timestamp: payload.device.timestamp || new Date().toISOString(),
            device_id: payload.device.id,
            lat: laptopGpsRef.current.lat,
            lng: laptopGpsRef.current.lng,
            magnitude: payload.vibration?.magnitude || 0,
            accel_x: payload.vibration?.accel_x || 0,
            accel_y: payload.vibration?.accel_y || 0,
            accel_z: payload.vibration?.accel_z || 0,
            gyro_x: payload.vibration?.gyro_x || 0,
            gyro_y: payload.vibration?.gyro_y || 0,
            gyro_z: payload.vibration?.gyro_z || 0,
            pir_status: overridePirStatus,
            radar_closest_cm: radarDist,
            radar_alert: radarDist > 0 && radarDist < 15,
            ir_analog: payload.ir?.analog_value || 0,
            rssi: payload.device?.rssi || -99,
            satellites: payload.gps?.satellites || 0,
          };

          // Embedded Frontend AI Confidence Engine
          let c_score = 0;
          let c_reasons: string[] = [];

          if (newReading.magnitude > 1.1) {
            c_score += 55;
            c_reasons.push(`MAJOR: Vibration magnitude ${newReading.magnitude.toFixed(2)}g suggests heavy machinery`);
          }

          if (newReading.radar_closest_cm > 0 && newReading.radar_closest_cm <= 15) {
            c_score += 55;
            c_reasons.push(`MAJOR: EXTREME PROXIMITY! Object at ${newReading.radar_closest_cm.toFixed(1)} cm`);
          } else if (newReading.radar_closest_cm > 15 && newReading.radar_closest_cm < 500) {
            c_score += 10;
            c_reasons.push(`MINOR: Object detected at ${newReading.radar_closest_cm.toFixed(1)} cm`);
          }

          if (newReading.ir_analog < 100) {
            c_score += 55;
            c_reasons.push(`MAJOR: Severe IR darkness (Value: ${newReading.ir_analog})`);
          } else if (newReading.ir_analog < 150) {
            c_score += 5;
            c_reasons.push(`MINOR: IR darkness threshold met (Value: ${newReading.ir_analog})`);
          }

          if (newReading.pir_status === 1) {
            c_score += 5;
            c_reasons.push("MINOR: PIR sensor confirmed riverbank motion (override)");
          }

          setConfidence(c_score);
          setReasons(c_reasons);
          
          if (c_score >= 80) setRiskLevel('CRITICAL');
          else if (c_score >= 55) setRiskLevel('HIGH');
          else if (c_score >= 30) setRiskLevel('MEDIUM');
          else setRiskLevel('LOW');

          setReading(newReading);
          setHistory(prev => [...prev.slice(-(HISTORY_SIZE - 1)), newReading]);

          updateNode({
            id: payload.device.id,
            uptime_ms: payload.device.uptime_ms || 0,
            rssi: payload.device.rssi || -99,
            free_heap: payload.device.free_heap || 250000,
            satellites: payload.gps.satellites || 0,
            lat: laptopGpsRef.current.lat,
            lng: laptopGpsRef.current.lng,
            status: 'ONLINE',
            last_seen: new Date().toISOString()
          });
        }
      } catch (err) {
        // Will fail cleanly if hardware is offline
      }
    };

    const intervalId = setInterval(fetchLatest, 150); // Hard poll at 150ms for raw speed
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  const dummyReading: SensorReading = {
     timestamp: new Date().toISOString(),
     device_id: 'detecting...',
     lat: laptopGps.lat, 
     lng: laptopGps.lng,
     magnitude: 0, accel_x: 0, accel_y: 0, accel_z: 1,
     gyro_x: 0, gyro_y: 0, gyro_z: 0,
     pir_status: 0,
     radar_closest_cm: 0, radar_alert: false,
     ir_analog: 0, rssi: 0, satellites: 0
  };

  return { reading: reading || dummyReading, history, alerts, confidence, reasons, riskLevel };
}
