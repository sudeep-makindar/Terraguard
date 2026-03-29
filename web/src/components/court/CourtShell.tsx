import React, { useState } from 'react';
import { useAppStore, Alert, FIR, CustodyEntry } from '../../store/useAppStore';
import DashboardShell, { COURT_NAV } from '../shared/DashboardShell';
import { MessagesScreen } from '../shared/MessagesScreen';
import { Download, Search, Filter, FileText, MapPin, Clock, Shield, BarChart2, ChevronRight } from 'lucide-react';

const RISK_STYLE: Record<string, { text: string; bg: string; border: string; dot: string; badge: string }> = {
  CRITICAL: { text: 'text-red-400',    bg: 'bg-red-500/8',    border: 'border-red-500/20',    dot: '#ef4444', badge: '🔴' },
  HIGH:     { text: 'text-orange-400', bg: 'bg-orange-500/8', border: 'border-orange-500/20', dot: '#f97316', badge: '🟠' },
  MEDIUM:   { text: 'text-yellow-400', bg: 'bg-yellow-500/8', border: 'border-yellow-500/20', dot: '#eab308', badge: '🟡' },
  LOW:      { text: 'text-green-400',  bg: 'bg-green-500/8',  border: 'border-green-500/20',  dot: '#22c55e', badge: '🟢' },
};

const FIR_STATUS_STYLE: Record<string, string> = {
  DRAFT:              'text-white/50 bg-white/5 border-white/10',
  FILED:              'text-green-400 bg-green-500/10 border-green-500/20',
  SUBMITTED_TO_COURT: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  REVIEWED:           'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

// ─── Evidence Vault ──────────────────────────────────────────────────────────
function EvidenceVault() {
  const { alerts, firs } = useAppStore();
  const [search, setSearch] = useState('');
  const filtered = alerts.filter(a =>
    a.id.toLowerCase().includes(search.toLowerCase()) ||
    a.location_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg">Evidence Vault</h2>
        <button className="flex items-center gap-2 text-xs font-label px-4 py-2 rounded-xl border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-all">
          <Download className="w-3.5 h-3.5" /> Export All
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by incident ID or location..."
            className="w-full bg-[#111a19] border border-white/8 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-primary-container transition-colors" />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-white/30 text-xs font-label hover:border-white/30 hover:text-white transition-all">
          <Filter className="w-3.5 h-3.5" /> Filter
        </button>
      </div>

      {/* Evidence Cards */}
      <div className="space-y-3">
        {filtered.map(alert => {
          const rs = RISK_STYLE[alert.risk_level];
          const fir = firs.find(f => f.alert_id === alert.id);
          return (
            <div key={alert.id} className={`rounded-2xl border p-5 ${rs.bg} ${rs.border}`}>
              <div className="flex items-start gap-4">
                <span className="text-2xl">{rs.badge}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-white font-bold">📁 {alert.id}</span>
                    <span className={`text-[10px] font-label font-bold px-2 py-0.5 rounded-full border ${rs.border} ${rs.text}`}>{alert.risk_level}</span>
                    {fir && <span className={`text-[10px] font-label px-2 py-0.5 rounded-full border ${FIR_STATUS_STYLE[fir.status]}`}>{fir.status.replace('_',' ')}</span>}
                    {!fir && <span className="text-[10px] font-label text-white/20 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">⚠️ FIR PENDING</span>}
                  </div>
                  <div className="flex items-center gap-4 text-white/40 text-xs font-label mb-3">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(alert.timestamp).toLocaleString()}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{alert.location_name}</span>
                    <span>{alert.confidence}% confidence</span>
                    {fir && <span className="text-white/30">FIR: {fir.id}</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      '📄 Sensor Snapshot',
                      fir ? '📄 FIR Copy' : '⏳ FIR Pending',
                      '📋 Timeline',
                      '💬 Comms Log',
                      '🗺️ GPS Evidence',
                      '📦 Download All',
                    ].map(btn => (
                      <button key={btn} className="text-[10px] font-label px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-all">
                        {btn}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── FIR Archive ─────────────────────────────────────────────────────────────
function FIRArchive() {
  const { firs } = useAppStore();
  const [updatedStatus, setUpdatedStatus] = useState<Record<string, string>>({});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg">FIR Archive</h2>
        <button className="flex items-center gap-2 text-xs font-label px-4 py-2 rounded-xl border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-all">
          <Download className="w-3.5 h-3.5" /> Download All (ZIP)
        </button>
      </div>
      <div className="space-y-3">
        {firs.map(fir => {
          const status = updatedStatus[fir.id] || fir.status;
          return (
            <div key={fir.id} className="bg-[#111a19] border border-white/8 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-white font-bold text-sm">{fir.id}</p>
                  <p className="text-white/40 text-xs font-label">Alert: {fir.alert_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-label font-bold px-3 py-1 rounded-full border ${FIR_STATUS_STYLE[status]}`}>
                    {status.replace('_', ' ')}
                  </span>
                  {(status === 'SUBMITTED_TO_COURT') && (
                    <button onClick={() => setUpdatedStatus(prev => ({ ...prev, [fir.id]: 'REVIEWED' }))}
                      className="text-[10px] font-label px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-all">
                      Mark Reviewed
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs font-label mb-4">
                <div><span className="text-white/30 block">Incident Time</span><span className="text-white">{new Date(fir.incident_time).toLocaleString()}</span></div>
                <div><span className="text-white/30 block">Location</span><span className="text-white">{fir.incident_location}</span></div>
                <div><span className="text-white/30 block">Filed By</span><span className="text-white">{fir.reporting_officer}</span></div>
                <div><span className="text-white/30 block">Station</span><span className="text-white">{fir.station} Police</span></div>
                <div><span className="text-white/30 block">Confidence</span><span className="text-white">{fir.confidence}%</span></div>
                <div><span className="text-white/30 block">Offence</span><span className="text-white/70">MM(DR) Act 1957</span></div>
              </div>
              {fir.additional_notes && (
                <p className="text-white/40 text-xs font-label italic border-l-2 border-white/10 pl-3 mb-3">{fir.additional_notes}</p>
              )}
              <button className="flex items-center gap-1.5 text-[10px] font-label px-3 py-1.5 rounded-xl bg-white/4 border border-white/10 text-white/30 hover:text-white transition-all">
                <Download className="w-3 h-3" /> Download FIR PDF
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Incident Timeline ────────────────────────────────────────────────────────
function IncidentTimeline() {
  const { alerts, custody } = useAppStore();
  const [selectedId, setSelectedId] = useState<string>(alerts[0]?.id ?? '');
  const alertCustody = custody.filter(c => c.alert_id === selectedId).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const ACTION_ICONS: Record<string, string> = {
    ALERT_TRIGGERED: '🔴', SMS_DISPATCHED: '📱', ALERT_ACKNOWLEDGED: '✅',
    POLICE_VIEWED: '👁️', FIR_GENERATED: '📄', ALERT_RESOLVED: '✔️',
    FIR_FILED: '📋', EVIDENCE_LOCKED: '🔒', POLICE_RESPONDED: '🚔',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-white font-bold text-lg">Incident Timeline</h2>
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
          className="ml-auto bg-[#111a19] border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-label focus:outline-none">
          {alerts.map(a => <option key={a.id} value={a.id}>{a.id} — {a.location_name}</option>)}
        </select>
      </div>

      <div className="bg-[#111a19] border border-white/8 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/8">
          <div>
            <p className="text-white font-bold">INCIDENT TIMELINE — {selectedId}</p>
            <p className="text-white/30 text-xs font-label">{alerts.find(a => a.id === selectedId)?.location_name}</p>
          </div>
          <button className="flex items-center gap-2 text-xs font-label px-4 py-2 rounded-xl border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-all">
            <Download className="w-3.5 h-3.5" /> Download PDF
          </button>
        </div>

        <div className="relative space-y-0">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-white/8" />
          {alertCustody.map((entry, i) => (
            <div key={entry.id} className="flex gap-4 relative pb-6 last:pb-0">
              <div className="w-10 h-10 rounded-full bg-[#0a1a18] border border-white/10 flex items-center justify-center flex-shrink-0 text-base z-10">
                {ACTION_ICONS[entry.action] || '•'}
              </div>
              <div className="flex-1 pt-1.5">
                <div className="flex items-center gap-3 mb-1">
                  <p className="text-white text-sm font-label font-bold">{entry.action.replace(/_/g, ' ')}</p>
                  <span className={`text-[9px] font-label px-2 py-0.5 rounded-full border ${entry.actor_role === 'system' ? 'text-primary-container border-primary/20 bg-primary/10' : entry.actor_role === 'officer' ? 'text-green-400 border-green-500/20 bg-green-500/10' : 'text-orange-400 border-orange-500/20 bg-orange-500/10'}`}>
                    {entry.actor_role.toUpperCase()}
                  </span>
                </div>
                <p className="text-white/40 text-xs font-label">{entry.actor_name}</p>
                {entry.details && <p className="text-white/50 text-xs font-label mt-1 italic">{entry.details}</p>}
                <p className="text-white/20 text-[10px] font-label mt-1">{new Date(entry.timestamp).toLocaleString()}</p>
              </div>
            </div>
          ))}
          {alertCustody.length === 0 && (
            <p className="text-white/20 text-xs font-label text-center py-8">No chain-of-custody events recorded for this incident yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Chain of Custody ─────────────────────────────────────────────────────────
function ChainOfCustody() {
  const { custody } = useAppStore();
  const sorted = [...custody].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <div className="space-y-4">
      <h2 className="text-white font-bold text-lg">Chain of Custody — Full Audit Log</h2>
      <div className="bg-[#111a19] border border-white/8 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/8">
              {['Time', 'Alert ID', 'Action', 'Actor', 'Role', 'Details'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] font-label uppercase tracking-widest text-white/30">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(entry => (
              <tr key={entry.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                <td className="px-4 py-3 text-[10px] font-label text-white/30 whitespace-nowrap">{new Date(entry.timestamp).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs font-label text-white/60">{entry.alert_id}</td>
                <td className="px-4 py-3 text-[10px] font-label text-white font-bold">{entry.action.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 text-xs font-label text-white/60">{entry.actor_name}</td>
                <td className="px-4 py-3">
                  <span className={`text-[9px] font-label px-2 py-0.5 rounded-full border ${entry.actor_role === 'system' ? 'text-primary-container border-primary/20 bg-primary/10' : entry.actor_role === 'officer' ? 'text-green-400 border-green-500/20 bg-green-500/10' : 'text-orange-400 border-orange-500/20 bg-orange-500/10'}`}>
                    {entry.actor_role.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-[10px] font-label text-white/30 italic">{entry.details || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Court Analytics ──────────────────────────────────────────────────────────
function CourtAnalytics() {
  const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  const counts = [8, 12, 7, 15, 11, 42];
  const maxC = Math.max(...counts);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg">Court Analytics Report</h2>
        <button className="flex items-center gap-2 text-xs font-label px-4 py-2 rounded-xl border border-white/10 text-white/40 hover:border-white/30 hover:text-white transition-all">
          <Download className="w-3.5 h-3.5" /> Export Court Report PDF
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Incidents', value: '95', sub: 'Since deployment' },
          { label: 'FIRs Filed', value: '74', sub: '78% conversion rate', color: 'text-green-400' },
          { label: 'Court Submissions', value: '42', sub: 'Awaiting review' },
          { label: 'Avg Confidence', value: '83%', sub: 'AI model accuracy' },
        ].map((s, i) => (
          <div key={i} className="bg-[#111a19] border border-white/8 rounded-2xl p-4">
            <p className="text-white/30 text-[10px] font-label uppercase tracking-widest mb-2">{s.label}</p>
            <p className={`text-2xl font-headline font-bold ${s.color || 'text-white'}`}>{s.value}</p>
            <p className="text-white/30 text-[10px] font-label mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Alert count by month */}
      <div className="bg-[#111a19] border border-white/8 rounded-2xl p-5">
        <p className="text-white/40 text-[10px] font-label uppercase tracking-widest mb-4">Alerts by Month</p>
        <div className="flex items-end gap-4 h-28">
          {months.map((m, i) => (
            <div key={m} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-white/40 text-[9px] font-label">{counts[i]}</span>
              <div className="w-full rounded-t-md" style={{ height: `${(counts[i] / maxC) * 90}px`, background: i === months.length - 1 ? '#ef4444' : 'rgba(0,180,166,0.5)' }} />
              <span className="text-[9px] font-label text-white/30">{m}</span>
            </div>
          ))}
        </div>
        <p className="text-red-400/60 text-[10px] font-label mt-3">↑ March shows spike — peak illegal mining season confirmed</p>
      </div>

      {/* Time-of-day distribution */}
      <div className="bg-[#111a19] border border-white/8 rounded-2xl p-5">
        <p className="text-white/40 text-[10px] font-label uppercase tracking-widest mb-4">Mining Pattern: Time of Day</p>
        <div className="flex items-end gap-0.5 h-20">
          {Array.from({ length: 24 }, (_, h) => {
            const v = (h >= 1 && h <= 4) ? 85 + Math.random() * 15 : Math.random() * 20;
            return (
              <div key={h} className="flex-1 flex flex-col items-center">
                <div className="w-full rounded-sm" style={{ height: `${v}%`, background: h >= 1 && h <= 4 ? '#ef4444' : 'rgba(255,255,255,0.1)' }} />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[9px] font-label text-white/20 mt-1">
          <span>00:00</span><span className="text-red-400/60">Peak: 01:00–04:00</span><span>23:59</span>
        </div>
      </div>
    </div>
  );
}

// ─── Court Shell ──────────────────────────────────────────────────────────────
export default function CourtShell({ onLogout }: { onLogout: () => void }) {
  const [screen, setScreen] = useState('vault');

  return (
    <DashboardShell role="admin" roleLabel="Court Portal"
      navItems={COURT_NAV} activeScreen={screen} onNav={setScreen} onLogout={onLogout}>
      {screen === 'vault'    && <EvidenceVault />}
      {screen === 'firs'     && <FIRArchive />}
      {screen === 'timeline' && <IncidentTimeline />}
      {screen === 'analytics'&& <CourtAnalytics />}
      {screen === 'comms'    && <MessagesScreen myRole="officer" myName="Court Reader" />}
      {screen === 'custody'  && <ChainOfCustody />}
    </DashboardShell>
  );
}
