import React from 'react';
import { AlertEvent } from '../../hooks/useSensorSimulator';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, AlertTriangle } from 'lucide-react';

interface Props {
  alerts: AlertEvent[];
}

const RISK_STYLES = {
  CRITICAL: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', dot: '#ef4444' },
  HIGH:     { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', dot: '#f97316' },
  MEDIUM:   { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', dot: '#eab308' },
  LOW:      { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', dot: '#22c55e' },
};

export default function AlertLog({ alerts }: Props) {
  return (
    <div className="bg-[#111a19] border border-white/8 rounded-2xl p-5 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="w-4 h-4 text-orange-400" />
        <p className="text-white/40 text-[10px] font-label uppercase tracking-widest">Alert Evidence Log</p>
        <span className="ml-auto text-xs font-label text-white/20">{alerts.length} events</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto max-h-72 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
        <AnimatePresence initial={false}>
          {alerts.length === 0 && (
            <p className="text-white/20 text-xs font-label text-center py-8">No alerts recorded.</p>
          )}
          {alerts.map(alert => {
            const s = RISK_STYLES[alert.risk_level];
            const time = new Date(alert.timestamp).toLocaleTimeString();
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={`rounded-xl border px-4 py-3 ${s.bg} ${s.border}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.dot }} />
                    <span className={`text-xs font-label font-bold tracking-widest ${s.text}`}>{alert.risk_level}</span>
                    <span className="text-white/30 text-xs font-label">{alert.confidence}% confidence</span>
                  </div>
                  <span className="text-white/20 text-[10px] font-label">{time}</span>
                </div>
                <div className="flex items-center gap-2 text-white/40 text-[10px] font-label mb-2">
                  <MapPin className="w-3 h-3" />
                  {alert.lat.toFixed(4)}°N, {alert.lng.toFixed(4)}°E
                  <span className="ml-2 text-white/20">{alert.device_id}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {alert.reasons.map((r, i) => (
                    <span key={i} className={`text-[9px] font-label px-2 py-0.5 rounded-full border ${s.border} ${s.text} opacity-70`}>{r}</span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
