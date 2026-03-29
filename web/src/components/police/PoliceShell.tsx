import React, { useState } from 'react';
import { useAppStore, Alert, FIR } from '../../store/useAppStore';
import DashboardShell, { POLICE_NAV } from '../shared/DashboardShell';
import { MessagesScreen } from '../shared/MessagesScreen';
import { LiveFeeds } from '../shared/LiveFeeds';
import { MapPin, Clock, FileText, MessageSquare, CheckCircle, Radio, Download, ArrowLeft, ExternalLink } from 'lucide-react';

const RISK_STYLE: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  CRITICAL: { text: 'text-red-400', bg: 'bg-red-500/8', border: 'border-red-500/25', dot: '#ef4444' },
  HIGH: { text: 'text-orange-400', bg: 'bg-orange-500/8', border: 'border-orange-500/25', dot: '#f97316' },
};

const FIR_STATUS_STYLE: Record<string, string> = {
  DRAFT: 'text-white/50 bg-white/5 border-white/10',
  FILED: 'text-green-400 bg-green-500/10 border-green-500/20',
  SUBMITTED_TO_COURT: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  REVIEWED: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

// FIR form modal
function FIRFormModal({ alert, onClose, onSubmit }: { alert: Alert; onClose: () => void; onSubmit: (station: string, notes: string, location: string) => void }) {
  const [station, setStation] = useState('Mettur');
  const [location, setLocation] = useState(alert.location_name);
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0d1a18] border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-bold text-lg">Generate FIR</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white text-sm">✕</button>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {[
            { label: 'Incident Date & Time', value: new Date(alert.timestamp).toLocaleString(), editable: false },
            { label: 'Confidence Score', value: `${alert.confidence}%`, editable: false },
            { label: 'Sensor Summary', value: `Vib: ${alert.sensor_snapshot.magnitude}g | PIR: ${alert.sensor_snapshot.pir_status ? 'YES' : 'NO'} | Radar: ${alert.sensor_snapshot.radar_closest_cm.toFixed(0)}cm`, editable: false },
            { label: 'Evidence Reference', value: alert.id, editable: false },
            { label: 'Witness / Source', value: `TerraGuard IoT Node — ${alert.device_id}`, editable: false },
            { label: 'Nature of Offence', value: 'Illegal Sand Mining under MM(DR) Act 1957', editable: false },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-white/40 text-[10px] font-label uppercase tracking-widest mb-1">{f.label}</label>
              <p className="text-white text-xs font-label bg-white/4 border border-white/8 rounded-xl px-3 py-2">{f.value}</p>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-white/40 text-[10px] font-label uppercase tracking-widest mb-1">Police Station</label>
            <input value={station} onChange={e => setStation(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-container transition-colors" />
          </div>
          <div>
            <label className="block text-white/40 text-[10px] font-label uppercase tracking-widest mb-1">Incident Location (refine)</label>
            <input value={location} onChange={e => setLocation(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-container transition-colors" />
          </div>
          <div>
            <label className="block text-white/40 text-[10px] font-label uppercase tracking-widest mb-1">Additional Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-primary-container transition-colors resize-none" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-white/40 text-sm font-label hover:border-white/30 hover:text-white transition-all">Cancel</button>
          <button onClick={() => { onSubmit(station, notes, location); onClose(); }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-container text-white text-sm font-label font-bold hover:opacity-90 transition-all">
            📄 Submit FIR
          </button>
        </div>
      </div>
    </div>
  );
}

// Alert detail page
function AlertDetailView({ alert, onBack }: { alert: Alert; onBack: () => void }) {
  const { firs, generateFIR, markResponded } = useAppStore();
  const [showFIR, setShowFIR] = useState(false);
  const [responded, setResponded] = useState(false);
  const existingFIR = firs.find(f => f.alert_id === alert.id);
  const rs = RISK_STYLE[alert.risk_level] ?? RISK_STYLE.HIGH;

  return (
    <div className="space-y-4">
      {showFIR && (
        <FIRFormModal alert={alert} onClose={() => setShowFIR(false)}
          onSubmit={(station, notes, location) => generateFIR(alert.id, 'SI Arjun Prasad', station, notes, location)} />
      )}
      <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white text-xs font-label transition-colors mb-2">
        <ArrowLeft className="w-4 h-4" /> Back to Inbox
      </button>
      {/* Header banner */}
      <div className={`rounded-2xl border p-5 ${rs.bg} ${rs.border}`}>
        <div className="flex items-center gap-3 mb-2">
          <span className="w-3 h-3 rounded-full" style={{ background: rs.dot }} />
          <span className={`text-sm font-label font-bold ${rs.text}`}>{alert.risk_level} ALERT</span>
          <span className="text-white font-bold text-lg">{alert.id}</span>
        </div>
        <div className="flex items-center gap-6 text-white/40 text-xs font-label">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(alert.timestamp).toLocaleString()}</span>
          <span>{alert.confidence}% confidence</span>
          <span>{alert.device_id}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Location */}
        <div className="bg-[#111a19] border border-white/8 rounded-2xl p-5">
          <p className="text-white/40 text-[10px] font-label uppercase tracking-widest mb-3">📍 Location</p>
          <p className="text-white font-bold mb-1">{alert.location_name}</p>
          <p className="text-white/50 text-xs font-label mb-3">{alert.lat.toFixed(5)}°N, {alert.lng.toFixed(5)}°E</p>
          <a href={`https://maps.google.com/?q=${alert.lat},${alert.lng}`} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 text-xs font-label text-primary-container hover:underline">
            <ExternalLink className="w-3 h-3" /> Open in Google Maps
          </a>
          {/* Mock map */}
          <div className="mt-3 h-24 bg-[#0a1a18] rounded-xl border border-white/5 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <svg width="100%" height="100%"><defs><pattern id="g2" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0L0 0 0 16" fill="none" stroke="#00b4a6" strokeWidth="0.4" /></pattern></defs><rect width="100%" height="100%" fill="url(#g2)" /></svg>
            </div>
            <div className="relative w-4 h-4 rounded-full bg-red-500 border-2 border-red-300 z-10">
              <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-60" />
            </div>
          </div>
        </div>

        {/* Sensor snapshot */}
        <div className="bg-[#111a19] border border-white/8 rounded-2xl p-5">
          <p className="text-white/40 text-[10px] font-label uppercase tracking-widest mb-3">📊 Sensor Snapshot at Alert Time</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Vibration', value: `${alert.sensor_snapshot.magnitude}g`, alert: alert.sensor_snapshot.magnitude > 1.8 },
              { label: 'Motion', value: alert.sensor_snapshot.pir_status ? 'YES' : 'NO', alert: !!alert.sensor_snapshot.pir_status },
              { label: 'Radar Dist', value: `${alert.sensor_snapshot.radar_closest_cm.toFixed(0)} cm`, alert: alert.sensor_snapshot.radar_closest_cm < 500 },
              { label: 'IR Intensity', value: alert.sensor_snapshot.ir_analog, alert: alert.sensor_snapshot.ir_analog < 150 },
              { label: 'Night/Day', value: alert.sensor_snapshot.ir_analog < 150 ? 'NIGHT' : 'DAY', alert: false },
              { label: 'Satellites', value: alert.sensor_snapshot.satellites, alert: false },
            ].map((s, i) => (
              <div key={i} className="bg-white/4 rounded-xl px-3 py-2">
                <span className="text-white/30 text-[9px] font-label block">{s.label}</span>
                <span className={`font-label font-bold text-xs ${s.alert ? 'text-orange-400' : 'text-white'}`}>{s.value}</span>
              </div>
            ))}
          </div>
          {alert.officer_note && (
            <div className="mt-3 border-t border-white/8 pt-3">
              <p className="text-white/30 text-[9px] font-label uppercase tracking-widest mb-1">💬 Forest Officer Note</p>
              <p className="text-white/60 text-xs font-label italic">{alert.officer_note}</p>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button onClick={() => setShowFIR(true)} disabled={!!existingFIR}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-container text-white text-sm font-label font-bold hover:opacity-90 transition-all disabled:opacity-40">
          <FileText className="w-4 h-4" /> {existingFIR ? `FIR: ${existingFIR.id}` : 'Generate FIR'}
        </button>
        <button onClick={() => { }} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-label hover:text-white hover:border-white/30 transition-all">
          <Radio className="w-4 h-4" /> Send SMS
        </button>
        <button onClick={() => { markResponded(alert.id, 'SI Arjun Prasad'); setResponded(true); }}
          disabled={responded}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-label hover:bg-green-500/20 transition-all disabled:opacity-50">
          <CheckCircle className="w-4 h-4" /> {responded ? 'Marked Responded' : 'Mark Responded'}
        </button>
        <button className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/4 border border-white/10 text-white/40 text-sm font-label hover:text-white transition-all">
          <Download className="w-4 h-4" /> Evidence Package
        </button>
      </div>
    </div>
  );
}

// Police Alerts Inbox
function AlertsInbox({ onDetail }: { onDetail: (a: Alert) => void }) {
  const { alerts } = useAppStore();
  const policeAlerts = alerts.filter(a => a.risk_level === 'HIGH' || a.risk_level === 'CRITICAL');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-bold text-lg">Alerts Inbox</h2>
        <span className="text-xs font-label text-white/30 bg-white/5 border border-white/10 rounded-full px-3 py-1">
          HIGH + CRITICAL only · {policeAlerts.filter(a => a.status === 'NEW').length} unread
        </span>
      </div>
      {policeAlerts.map(alert => {
        const rs = RISK_STYLE[alert.risk_level] ?? RISK_STYLE.HIGH;
        const isNew = alert.status === 'NEW';
        return (
          <button key={alert.id} onClick={() => onDetail(alert)}
            className={`w-full text-left rounded-2xl border p-4 transition-all hover:opacity-90 ${rs.bg} ${rs.border} ${isNew ? 'shadow-lg' : ''}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  {isNew && <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />}
                  <span className={`text-xs font-label font-bold ${rs.text}`}>{alert.risk_level}</span>
                  <span className="text-white font-bold text-sm">{alert.id}</span>
                  <span className="text-white/40 text-xs font-label">{alert.confidence}% confidence</span>
                </div>
                <div className="flex items-center gap-4 text-white/40 text-xs font-label">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{alert.location_name}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(alert.timestamp).toLocaleString()}</span>
                </div>
              </div>
              <span className="text-white/20 text-xs">→</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// FIR Manager
function FIRManager() {
  const { firs, fileFIR } = useAppStore();
  return (
    <div className="space-y-4">
      <h2 className="text-white font-bold text-lg">FIR Manager</h2>
      {firs.map(fir => (
        <div key={fir.id} className="bg-[#111a19] border border-white/8 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-white font-bold">{fir.id}</p>
              <p className="text-white/40 text-xs font-label">{fir.alert_id} · {fir.station} Police Station</p>
            </div>
            <span className={`text-[10px] font-label font-bold px-3 py-1 rounded-full border ${FIR_STATUS_STYLE[fir.status]}`}>
              {fir.status.replace('_', ' ')}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3 text-xs font-label">
            <div><span className="text-white/30 block">Incident Time</span><span className="text-white">{new Date(fir.incident_time).toLocaleString()}</span></div>
            <div><span className="text-white/30 block">Location</span><span className="text-white">{fir.incident_location}</span></div>
            <div><span className="text-white/30 block">Filed By</span><span className="text-white">{fir.reporting_officer}</span></div>
          </div>
          <div className="flex gap-2">
            {fir.status === 'DRAFT' && (
              <button onClick={() => fileFIR(fir.id)}
                className="flex items-center gap-1.5 text-[10px] font-label px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all">
                <CheckCircle className="w-3 h-3" /> File FIR
              </button>
            )}
            <button className="flex items-center gap-1.5 text-[10px] font-label px-3 py-1.5 rounded-xl bg-white/4 border border-white/10 text-white/30 hover:text-white transition-all">
              <Download className="w-3 h-3" /> Download PDF
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// SMS Log
function SMSLogScreen() {
  const { smsLog } = useAppStore();
  return (
    <div className="space-y-4">
      <h2 className="text-white font-bold text-lg">SMS Alert Log</h2>
      <div className="space-y-3">
        {smsLog.map(sms => (
          <div key={sms.id} className="bg-[#111a19] border border-white/8 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Radio className="w-4 h-4 text-white/30" />
                <span className="text-white text-xs font-label font-bold">{sms.recipient}</span>
                <span className={`text-[9px] font-label px-2 py-0.5 rounded-full border ${sms.status === 'DELIVERED' ? 'text-green-400 bg-green-500/10 border-green-500/20' : sms.status === 'FAILED' ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'}`}>
                  {sms.status}
                </span>
              </div>
              <span className="text-white/20 text-[10px] font-label">{new Date(sms.timestamp).toLocaleString()}</span>
            </div>
            <p className="text-white/50 text-xs font-label leading-relaxed">{sms.content}</p>
            <p className="text-white/20 text-[9px] font-label mt-1">Alert: {sms.alert_id}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Police Shell
export default function PoliceShell({ onLogout }: { onLogout: () => void }) {
  const [screen, setScreen] = useState('inbox');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const { alerts } = useAppStore();
  const newCount = alerts.filter(a => (a.risk_level === 'HIGH' || a.risk_level === 'CRITICAL') && a.status === 'NEW').length;
  const nav = POLICE_NAV.map(n => n.id === 'inbox' ? { ...n, badge: newCount } : n);

  const handleNav = (id: string) => { setScreen(id); setSelectedAlert(null); };

  return (
    <DashboardShell role="police" roleLabel="Law Enforcement"
      navItems={nav} activeScreen={screen} onNav={handleNav} onLogout={onLogout}
      alertCount={newCount} isAlert={newCount > 0}>
      {screen === 'inbox' && !selectedAlert && <AlertsInbox onDetail={setSelectedAlert} />}
      {screen === 'inbox' && selectedAlert && <AlertDetailView alert={selectedAlert} onBack={() => setSelectedAlert(null)} />}
      {screen === 'feeds' && <LiveFeeds />}
      {screen === 'firs' && <FIRManager />}
      {screen === 'sms' && <SMSLogScreen />}
      {screen === 'messages' && <MessagesScreen myRole="police" myName="SI Arjun Prasad" />}
    </DashboardShell>
  );
}
