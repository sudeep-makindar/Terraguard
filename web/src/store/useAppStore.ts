/**
 * TerraGuard Global App Store
 * Production version: Clears seed data and initializes empty state for live sensor ingest.
 */

import { useState, useCallback, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
export type FIRStatus = 'DRAFT' | 'FILED' | 'SUBMITTED_TO_COURT' | 'REVIEWED';

export interface Alert {
  id: string;
  timestamp: string;
  confidence: number;
  risk_level: RiskLevel;
  reasons: string[];
  lat: number;
  lng: number;
  device_id: string;
  location_name: string;
  status: AlertStatus;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_by?: string;
  resolved_at?: string;
  resolve_note?: string;
  sensor_snapshot: SensorSnapshot;
  officer_note?: string;
}

export interface SensorSnapshot {
  magnitude: number;
  pir_status: number;
  radar_closest_cm: number;
  radar_alert: boolean;
  ir_analog: number;
  rssi: number;
  satellites: number;
  accel_x: number; accel_y: number; accel_z: number;
  gyro_x: number;  gyro_y: number;  gyro_z: number;
  maintenance_active?: boolean;
}

export interface FIR {
  id: string;
  alert_id: string;
  incident_time: string;
  incident_location: string;
  nature_of_offence: string;
  evidence_ref: string;
  sensor_summary: string;
  confidence: number;
  reporting_officer: string;
  station: string;
  additional_notes: string;
  status: FIRStatus;
  created_at: string;
  filed_at?: string;
  submitted_at?: string;
}

export interface Message {
  id: string;
  author_role: 'officer' | 'police';
  author_name: string;
  text: string;
  alert_id?: string;
  timestamp: string;
}

export interface SMSEntry {
  id: string;
  alert_id: string;
  recipient: string;
  content: string;
  status: 'DELIVERED' | 'FAILED' | 'PENDING';
  timestamp: string;
}

export interface CustodyEntry {
  id: string;
  alert_id: string;
  action: string;
  actor_role: string;
  actor_name: string;
  timestamp: string;
  details?: string;
}

export interface NodeInfo {
  id: string;
  label: string;
  location: string;
  lat: number; lng: number;
  last_seen: string;
  uptime_ms: number;
  rssi: number;
  comm_mode?: string;
  free_heap: number;
  satellites: number;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
}

// ─── Global State & Pub/Sub ───────────────────────────────────────────────────

let globalState = {
  alerts: [] as Alert[],
  firs: [] as FIR[],
  messages: [] as Message[],
  smsLog: [] as SMSEntry[],
  custody: [] as CustodyEntry[],
  nodes: [] as NodeInfo[],
  historyFetched: false,
};

const listeners = new Set<() => void>();

function setGlobalState(partial: Partial<typeof globalState>) {
  globalState = { ...globalState, ...partial };
  listeners.forEach(l => l());
}

// ─── Store Hook ───────────────────────────────────────────────────────────────

export function useAppStore() {
  const [, forceRender] = useState({});

  useEffect(() => {
    const listener = () => forceRender({});
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  // Automatically fetch history once when the first hook mounts
  useEffect(() => {
    if (!globalState.historyFetched) {
      setGlobalState({ historyFetched: true }); // Prevent double fetch
      // Fetch Alerts
      fetch('http://localhost:8000/api/alerts')
        .then(res => res.json())
        .then(data => {
          if (data && data.items) {
            const mappedAlerts: Alert[] = data.items.map((apiAlert: any) => ({
              id: apiAlert.id,
              timestamp: apiAlert.triggered_at,
              confidence: apiAlert.confidence,
              risk_level: apiAlert.risk_level,
              reasons: apiAlert.reasons,
              lat: apiAlert.lat,
              lng: apiAlert.lng,
              device_id: apiAlert.device_id,
              location_name: 'River Entry Point',
              status: apiAlert.status,
              officer_note: apiAlert.officer_note,
              sensor_snapshot: (() => {
                const snap = apiAlert.raw_payload || apiAlert.sensor_reading?.raw_payload || {};
                return {
                  magnitude: snap.vibration?.magnitude || 0,
                  pir_status: snap.motion?.pir_status || 0,
                  radar_closest_cm: snap.proximity?.distance_cm || 0,
                  radar_alert: snap.proximity?.distance_cm < 15 || false,
                  ir_analog: snap.ir?.analog_value || 0,
                  rssi: snap.device?.rssi || -99,
                  satellites: snap.gps?.satellites || 0,
                  accel_x: snap.vibration?.accel_x || 0,
                  accel_y: snap.vibration?.accel_y || 0,
                  accel_z: snap.vibration?.accel_z || 0,
                  gyro_x: snap.vibration?.gyro_x || 0,
                  gyro_y: snap.vibration?.gyro_y || 0,
                  gyro_z: snap.vibration?.gyro_z || 0,
                };
              })()
            }));
            
            const existingIds = new Set(globalState.alerts.map(a => a.id));
            const newAlerts = mappedAlerts.filter(a => !existingIds.has(a.id));
            if (newAlerts.length > 0) {
              setGlobalState({ 
                alerts: [...globalState.alerts, ...newAlerts].sort((a, b) => 
                  new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                )
              });
            }
          }
        })
        .catch(err => console.error("Failed to fetch historical alerts:", err));

      // Fetch FIRs
      fetch('http://localhost:8000/api/firs')
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data)) {
            const mappedFirs: FIR[] = data.map((apiFir: any) => ({
              id: apiFir.id,
              alert_id: apiFir.alert_id,
              incident_time: apiFir.fir_data?.incident_date_time,
              incident_location: apiFir.fir_data?.location,
              nature_of_offence: apiFir.fir_data?.nature_of_offence,
              evidence_ref: apiFir.fir_data?.evidence_reference,
              sensor_summary: apiFir.fir_data?.sensor_readings_summary,
              confidence: apiFir.fir_data?.confidence_score || 0,
              reporting_officer: apiFir.filed_by,
              station: apiFir.station_name,
              additional_notes: apiFir.fir_data?.additional_notes || "",
              status: apiFir.status,
              created_at: apiFir.generated_at,
            }));
            setGlobalState({ firs: mappedFirs });
          }
        })
        .catch(err => console.error("Failed to fetch FIRs:", err));
    }
  }, []);

  const { alerts, firs, messages, smsLog, custody, nodes } = globalState;

  const addCustody = useCallback((entry: Omit<CustodyEntry, 'id'>) => {
    setGlobalState({ custody: [...globalState.custody, { ...entry, id: `c${Date.now()}` }] });
  }, []);

  const acknowledgeAlert = useCallback((alertId: string, officerName: string) => {
    const now = new Date().toISOString();
    const updated = globalState.alerts.map(a => a.id === alertId
      ? { ...a, status: 'ACKNOWLEDGED' as const, acknowledged_by: officerName, acknowledged_at: now }
      : a);
    setGlobalState({ alerts: updated });
    addCustody({ alert_id: alertId, action: 'ALERT_ACKNOWLEDGED', actor_role: 'officer', actor_name: officerName, timestamp: now });
  }, [addCustody]);

  const resolveAlert = useCallback((alertId: string, officerName: string, note: string) => {
    const now = new Date().toISOString();
    const updated = globalState.alerts.map(a => a.id === alertId
      ? { ...a, status: 'RESOLVED' as const, resolved_by: officerName, resolved_at: now, resolve_note: note }
      : a);
    setGlobalState({ alerts: updated });
    addCustody({ alert_id: alertId, action: 'ALERT_RESOLVED', actor_role: 'officer', actor_name: officerName, timestamp: now, details: note });
  }, [addCustody]);

  const addOfficerNote = useCallback((alertId: string, note: string) => {
    setGlobalState({ alerts: globalState.alerts.map(a => a.id === alertId ? { ...a, officer_note: note } : a) });
  }, []);

  const markResponded = useCallback((alertId: string, officerName: string) => {
    const now = new Date().toISOString();
    addCustody({ alert_id: alertId, action: 'POLICE_RESPONDED', actor_role: 'police', actor_name: officerName, timestamp: now });
  }, [addCustody]);

  const generateFIR = useCallback(async (alertId: string, officerName: string, station: string, notes: string, location: string) => {
    try {
      const resp = await fetch(`http://localhost:8000/api/alerts/${alertId}/fir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filed_by: officerName,
          station_name: station,
          additional_notes: notes
        })
      });
      if (resp.ok) {
        const apiFir = await resp.json();
        const newFIR: FIR = {
          id: apiFir.id,
          alert_id: alertId,
          incident_time: apiFir.fir_data?.incident_date_time,
          incident_location: apiFir.fir_data?.location || location,
          nature_of_offence: apiFir.fir_data?.nature_of_offence,
          evidence_ref: apiFir.fir_data?.evidence_reference,
          sensor_summary: apiFir.fir_data?.sensor_readings_summary,
          confidence: apiFir.fir_data?.confidence_score || 0,
          reporting_officer: apiFir.filed_by,
          station: apiFir.station_name,
          additional_notes: apiFir.fir_data?.additional_notes || notes,
          status: apiFir.status,
          created_at: apiFir.generated_at,
        };
        setGlobalState({ firs: [newFIR, ...globalState.firs] });
        addCustody({ alert_id: alertId, action: 'FIR_GENERATED', actor_role: 'police', actor_name: officerName, timestamp: new Date().toISOString(), details: `FIR generated via API` });
      }
    } catch (e) {
      console.error(e);
    }
  }, [addCustody, globalState.firs]);

  const fileFIR = useCallback(async (firId: string) => {
    try {
      // Find full FIR object to get the real un-truncated UUID if needed,
      // but backend expects real UUID. Since our frontend mapped ID to substring(0,8),
      // we need the real UUID. Wait! `useAppStore` mapped `id: apiFir.id.substring(0, 8)`.
      // Let's just find the original fir. Actually, we might need the full ID for the endpoint.
      // Let's modify the frontend FIR ID mapping to use the full UUID instead of substring to avoid matching errors to backend.
      
      const resp = await fetch(`http://localhost:8000/api/fir/${firId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'FILED' })
      });
      if (resp.ok) {
        const now = new Date().toISOString();
        setGlobalState({ firs: globalState.firs.map(f => f.id === firId ? { ...f, status: 'FILED' as const, filed_at: now } : f) });
      }
    } catch (e) {
      console.error(e);
    }
  }, [globalState.firs]);

  const sendMessage = useCallback((role: 'officer' | 'police', name: string, text: string, alertId?: string) => {
    const msg: Message = { id: `m${Date.now()}`, author_role: role, author_name: name, text, alert_id: alertId, timestamp: new Date().toISOString() };
    setGlobalState({ messages: [...globalState.messages, msg] });
  }, []);

  const injectLiveAlert = useCallback((alert: Alert) => {
    // Only inject if it doesn't already exist
    if (!globalState.alerts.find(a => a.id === alert.id)) {
      setGlobalState({ alerts: [alert, ...globalState.alerts] });
      addCustody({ alert_id: alert.id, action: 'ALERT_TRIGGERED', actor_role: 'system', actor_name: 'TerraGuard AI', timestamp: alert.timestamp, details: `Confidence: ${alert.confidence}%, Buzzer activated` });
    }
  }, [addCustody]);

  const injectLiveFIR = useCallback((fir: FIR) => {
    if (!globalState.firs.find(f => f.id === fir.id)) {
      setGlobalState({ firs: [fir, ...globalState.firs] });
      addCustody({ alert_id: fir.alert_id, action: 'FIR_GENERATED', actor_role: 'police', actor_name: fir.reporting_officer, timestamp: fir.created_at, details: `Real-time FIR synced: ${fir.id}` });
    }
  }, [addCustody]);

  const updateLiveFIRStatus = useCallback((firId: string, status: FIRStatus) => {
    const updated = globalState.firs.map(f => f.id === firId ? { ...f, status } : f);
    setGlobalState({ firs: updated });
  }, []);

  const updateNode = useCallback((nodeInfo: Partial<NodeInfo> & { id: string }) => {
    const existing = globalState.nodes.find(n => n.id === nodeInfo.id);
    if (existing) {
      setGlobalState({
        nodes: globalState.nodes.map(n => n.id === nodeInfo.id ? { ...n, ...nodeInfo } : n)
      });
    } else {
      // Default new node
      const newNode: NodeInfo = {
        id: nodeInfo.id,
        label: nodeInfo.label || 'New Sensor Node',
        location: nodeInfo.location || 'Unknown Location',
        lat: nodeInfo.lat || 0,
        lng: nodeInfo.lng || 0,
        last_seen: new Date().toISOString(),
        uptime_ms: 0,
        rssi: 0,
        free_heap: 0,
        satellites: 0,
        status: 'ONLINE' as const,
        ...nodeInfo
      };
      setGlobalState({ nodes: [...globalState.nodes, newNode] });
    }
  }, []);

  return {
    alerts, firs, messages, smsLog, custody, nodes,
    acknowledgeAlert, resolveAlert, addOfficerNote,
    markResponded, generateFIR, fileFIR, sendMessage, injectLiveAlert, 
    injectLiveFIR, updateLiveFIRStatus, updateNode
  };
}
