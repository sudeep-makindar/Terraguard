import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Alert, AlertStatus, useAppStore } from '../../store/useAppStore';
import { MapPin, CheckCircle, XCircle, Download, Filter, Clock } from 'lucide-react';

const RISK_STYLE: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  CRITICAL: { text: 'text-red-400', bg: 'bg-red-500/8', border: 'border-red-500/25', dot: '#ef4444' },
  HIGH:     { text: 'text-orange-400', bg: 'bg-orange-500/8', border: 'border-orange-500/25', dot: '#f97316' },
  MEDIUM:   { text: 'text-yellow-400', bg: 'bg-yellow-500/8', border: 'border-yellow-500/25', dot: '#eab308' },
  LOW:      { text: 'text-green-400', bg: 'bg-green-500/8', border: 'border-green-500/25', dot: '#22c55e' },
};

const STATUS_STYLE: Record<AlertStatus, { label: string; color: string }> = {
  NEW:          { label: 'NEW', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  ACKNOWLEDGED: { label: 'ACK', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  RESOLVED:     { label: 'DONE', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
};

interface AckModalProps { alert: Alert; onAck: (note: string) => void; onClose: () => void; mode: 'ack' | 'resolve'; }

function ActionModal({ alert, onAck, onClose, mode }: AckModalProps) {
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-[#0d1a18] border border-white/10 rounded-2xl p-6 w-96">
        <h3 className="text-white font-bold mb-1">{mode === 'ack' ? 'Acknowledge Alert' : 'Resolve Alert'}</h3>
        <p className="text-white/40 text-xs font-label mb-4">{alert.id} — {alert.risk_level}</p>
        {mode === 'resolve' && (
          <textarea value={note} onChange={e => setNote(e.target.value)}
            placeholder="Field observation note (e.g. Patrol dispatched, no activity found)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/20 mb-4 h-24 resize-none focus:outline-none focus:border-primary-container" />
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-white/10 text-white/40 text-sm font-label hover:border-white/30 hover:text-white transition-all">Cancel</button>
          <button onClick={() => { onAck(note); onClose(); }}
            className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-label font-bold hover:bg-primary/80 transition-all">
            {mode === 'ack' ? 'Acknowledge' : 'Resolve'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function AlertFeed({ officerName }: { officerName: string }) {
  const { alerts, acknowledgeAlert, resolveAlert } = useAppStore();
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [modal, setModal] = useState<{ alert: Alert; mode: 'ack' | 'resolve' } | null>(null);

  const filtered = alerts.filter(a =>
    (filterRisk === 'ALL' || a.risk_level === filterRisk) &&
    (filterStatus === 'ALL' || a.status === filterStatus)
  );

  return (
    <div className="space-y-4">
      {modal && (
        <ActionModal alert={modal.alert} mode={modal.mode}
          onAck={(note) => {
            if (modal.mode === 'ack') acknowledgeAlert(modal.alert.id, officerName);
            else resolveAlert(modal.alert.id, officerName, note);
          }}
          onClose={() => setModal(null)} />
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-white/30" />
        {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(r => (
          <button key={r} onClick={() => setFilterRisk(r)}
            className={`text-[10px] font-label px-3 py-1 rounded-full border transition-all ${filterRisk === r ? 'border-primary-container text-primary-container bg-primary/10' : 'border-white/10 text-white/30 hover:border-white/30'}`}>{r}</button>
        ))}
        <div className="ml-4 flex items-center gap-2">
          {(['ALL', 'NEW', 'ACKNOWLEDGED', 'RESOLVED'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`text-[10px] font-label px-3 py-1 rounded-full border transition-all ${filterStatus === s ? 'border-primary-container text-primary-container bg-primary/10' : 'border-white/10 text-white/30 hover:border-white/30'}`}>{s}</button>
          ))}
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {filtered.map(alert => {
          const rs = RISK_STYLE[alert.risk_level];
          const ss = STATUS_STYLE[alert.status];
          return (
            <motion.div key={alert.id} layout
              className={`rounded-2xl border p-4 ${rs.bg} ${rs.border}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: rs.dot }} />
                    <span className={`text-xs font-label font-bold ${rs.text}`}>{alert.risk_level}</span>
                    <span className="text-white font-label font-bold text-sm">{alert.id}</span>
                    <span className={`text-[9px] font-label font-bold px-2 py-0.5 rounded-full border ${ss.color}`}>{ss.label}</span>
                  </div>
                  <div className="flex items-center gap-4 text-white/40 text-xs font-label mb-2">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(alert.timestamp).toLocaleString()}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{alert.location_name}</span>
                    <span>{alert.confidence}% confidence</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {alert.reasons.map((r, i) => <span key={i} className={`text-[9px] font-label px-2 py-0.5 rounded-full border ${rs.border} ${rs.text} opacity-70`}>{r}</span>)}
                  </div>
                  {alert.officer_note && (
                    <p className="text-white/30 text-xs font-label italic border-l-2 border-white/10 pl-3">{alert.officer_note}</p>
                  )}
                  {alert.resolve_note && (
                    <p className="text-green-400/60 text-xs font-label mt-1 border-l-2 border-green-500/20 pl-3">{alert.resolve_note}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {alert.status === 'NEW' && (
                    <button onClick={() => setModal({ alert, mode: 'ack' })}
                      className="flex items-center gap-1.5 text-[10px] font-label px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 transition-all">
                      <CheckCircle className="w-3 h-3" /> Acknowledge
                    </button>
                  )}
                  {alert.status === 'ACKNOWLEDGED' && (
                    <button onClick={() => setModal({ alert, mode: 'resolve' })}
                      className="flex items-center gap-1.5 text-[10px] font-label px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all">
                      <XCircle className="w-3 h-3" /> Resolve
                    </button>
                  )}
                  <button className="flex items-center gap-1.5 text-[10px] font-label px-3 py-1.5 rounded-xl bg-white/4 border border-white/10 text-white/30 hover:text-white transition-all">
                    <Download className="w-3 h-3" /> Evidence
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
