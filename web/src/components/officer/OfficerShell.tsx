import React, { useState } from 'react';
import DashboardShell, { OFFICER_NAV } from '../shared/DashboardShell';
import { LiveMonitor } from './LiveMonitor';
import { AlertFeed } from './AlertFeed';
import { NodeHealth } from './NodeHealth';
import { MessagesScreen } from '../shared/MessagesScreen';
import { LiveFeeds } from '../shared/LiveFeeds';
import { useAppStore } from '../../store/useAppStore';
import { useSensorSimulator } from '../../hooks/useSensorSimulator';
import { BarChart2, Download } from 'lucide-react';

function OfficerAnalytics() {
  // Simple bar chart visualization using CSS
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const alertCounts = hours.map(h => (h >= 1 && h <= 4) ? Math.floor(Math.random() * 5 + 3) : Math.floor(Math.random() * 2));
  const maxCount = Math.max(...alertCounts);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg">Analytics Dashboard</h2>
        <button className="flex items-center gap-2 text-xs font-label px-4 py-2 rounded-xl border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-all">
          <Download className="w-3.5 h-3.5" /> Export PDF
        </button>
      </div>

      {/* Alert frequency heatmap by hour */}
      <div className="bg-[#111a19] border border-white/8 rounded-2xl p-5">
        <p className="text-white/40 text-[10px] font-label uppercase tracking-widest mb-4">Alert Frequency by Hour of Day (Last 7 Days)</p>
        <div className="flex items-end gap-1 h-24">
          {hours.map(h => {
            const pct = alertCounts[h] / maxCount;
            const isHot = h >= 1 && h <= 4;
            return (
              <div key={h} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-sm transition-all" style={{
                  height: `${Math.max(pct * 80, 4)}px`,
                  background: isHot ? '#ef4444' : 'rgba(0,180,166,0.4)'
                }} />
                <span className="text-[8px] font-label text-white/20">{h}</span>
              </div>
            );
          })}
        </div>
        <p className="text-red-400/60 text-[10px] font-label mt-3">🔴 Peak: 01:00–04:00 AM — consistent with illegal mining pattern</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Alerts', value: '42', sub: 'Last 30 days' },
          { label: 'CRITICAL Alerts', value: '18', sub: '43% of total', color: 'text-red-400' },
          { label: 'FIR Conversion', value: '78%', sub: 'CRITICAL → FIR filed', color: 'text-green-400' },
          { label: 'Avg Confidence', value: '82%', sub: 'Model accuracy' },
        ].map((s, i) => (
          <div key={i} className="bg-[#111a19] border border-white/8 rounded-2xl p-4">
            <p className="text-white/30 text-[10px] font-label uppercase tracking-widest mb-2">{s.label}</p>
            <p className={`text-2xl font-headline font-bold ${s.color || 'text-white'}`}>{s.value}</p>
            <p className="text-white/30 text-[10px] font-label mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Alert by risk level bars */}
      <div className="bg-[#111a19] border border-white/8 rounded-2xl p-5">
        <p className="text-white/40 text-[10px] font-label uppercase tracking-widest mb-4">Alert Distribution by Risk Level</p>
        <div className="space-y-3">
          {[
            { label: 'CRITICAL', count: 18, color: '#ef4444', total: 42 },
            { label: 'HIGH',     count: 14, color: '#f97316', total: 42 },
            { label: 'MEDIUM',   count: 7,  color: '#eab308', total: 42 },
            { label: 'LOW',      count: 3,  color: '#22c55e', total: 42 },
          ].map(r => (
            <div key={r.label} className="flex items-center gap-3">
              <span className="text-[10px] font-label w-16 text-white/50">{r.label}</span>
              <div className="flex-1 bg-white/5 rounded-full h-2">
                <div className="h-2 rounded-full transition-all" style={{ width: `${(r.count / r.total) * 100}%`, background: r.color }} />
              </div>
              <span className="text-[10px] font-label text-white/30 w-8 text-right">{r.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OfficerSettings() {
  const [thresholds, setThresholds] = useState({ vibration: 1.8, distance: 500, confidence: 60, ir: 600 });
  return (
    <div className="space-y-6">
      <h2 className="text-white font-bold text-lg">Detection Thresholds</h2>
      <div className="bg-[#111a19] border border-white/8 rounded-2xl p-6 space-y-6">
        {[
          { key: 'vibration', label: 'Vibration Threshold (g)', min: 0.5, max: 4, step: 0.1, unit: 'g', weight: '+35% confidence' },
          { key: 'distance', label: 'Proximity Alert Distance', min: 100, max: 1000, step: 10, unit: 'cm', weight: '+20% confidence' },
          { key: 'confidence', label: 'Alert Trigger Threshold', min: 40, max: 90, step: 5, unit: '%', weight: 'Alert fires above this' },
          { key: 'ir', label: 'IR Turbidity Threshold', min: 200, max: 900, step: 20, unit: 'ADC', weight: 'Sediment detection' },
        ].map(f => (
          <div key={f.key}>
            <div className="flex justify-between mb-2">
              <label className="text-white text-sm font-label">{f.label}</label>
              <div className="flex items-center gap-2">
                <span className="text-primary-container font-bold font-label">{thresholds[f.key as keyof typeof thresholds]}{f.unit}</span>
                <span className="text-white/20 text-[10px] font-label">({f.weight})</span>
              </div>
            </div>
            <input type="range" min={f.min} max={f.max} step={f.step}
              value={thresholds[f.key as keyof typeof thresholds]}
              onChange={e => setThresholds(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) }))}
              className="w-full accent-primary-container" />
          </div>
        ))}
        <button className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm font-label hover:bg-primary/80 transition-all">
          Save Thresholds
        </button>
      </div>
    </div>
  );
}

export default function OfficerShell({ onLogout }: { onLogout: () => void }) {
  const [screen, setScreen] = useState('live');
  const { alerts } = useAppStore();
  const { confidence } = useSensorSimulator();
  const newAlerts = alerts.filter(a => a.status === 'NEW').length;
  const isAlert = confidence > 60;

  const nav = OFFICER_NAV.map(n => n.id === 'alerts' ? { ...n, badge: newAlerts } : n);

  return (
    <DashboardShell
      role="officer" roleLabel="Forest Officer"
      navItems={nav} activeScreen={screen} onNav={setScreen} onLogout={onLogout}
      isAlert={isAlert} alertCount={newAlerts}
    >
      {screen === 'live'      && <LiveMonitor />}
      {screen === 'feeds'     && <LiveFeeds />}
      {screen === 'alerts'    && <AlertFeed officerName="Officer Ramesh K." />}
      {screen === 'nodes'     && <NodeHealth />}
      {screen === 'analytics' && <OfficerAnalytics />}
      {screen === 'messages'  && <MessagesScreen myRole="officer" myName="Officer Ramesh K." />}
      {screen === 'settings'  && <OfficerSettings />}
    </DashboardShell>
  );
}
