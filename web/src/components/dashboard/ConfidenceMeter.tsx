import React from 'react';
import { motion } from 'motion/react';

interface Props {
  confidence: number;
  riskLevel: string;
  reasons: string[];
}

function getColor(c: number) {
  if (c > 80) return { stroke: '#ef4444', text: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'CRITICAL' };
  if (c > 60) return { stroke: '#f97316', text: '#f97316', bg: 'rgba(249,115,22,0.1)', label: 'HIGH' };
  if (c >= 40) return { stroke: '#eab308', text: '#eab308', bg: 'rgba(234,179,8,0.1)', label: 'MEDIUM' };
  return { stroke: '#22c55e', text: '#22c55e', bg: 'rgba(34,197,94,0.1)', label: 'LOW' };
}

export default function ConfidenceMeter({ confidence, riskLevel, reasons }: Props) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (confidence / 100) * circ;
  const color = getColor(confidence);

  return (
    <div className="bg-[#111a19] border border-white/8 rounded-2xl p-5 flex flex-col h-full">
      <p className="text-white/40 text-[10px] font-label uppercase tracking-widest mb-4">Threat Confidence</p>
      <div className="flex items-center gap-4 flex-1">
        <div className="relative flex-shrink-0">
          <svg width="140" height="140" viewBox="0 0 140 140">
            {/* Background track */}
            <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
            {/* Glow ring */}
            <motion.circle
              cx="70" cy="70" r={r}
              fill="none"
              stroke={color.stroke}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={circ / 4}
              transform="rotate(-90 70 70)"
              animate={{ strokeDasharray: `${dash} ${circ - dash}` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
            {/* Center text */}
            <text x="70" y="65" textAnchor="middle" fill={color.text} fontSize="26" fontWeight="bold" fontFamily="Inter">
              {confidence}
            </text>
            <text x="70" y="83" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="Inter">
              / 100
            </text>
          </svg>
        </div>
        <div className="flex-1 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1" style={{ background: color.bg }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: color.stroke }} />
            <span className="text-xs font-label font-bold tracking-widest" style={{ color: color.text }}>
              {riskLevel}
            </span>
          </div>
          <div className="space-y-1 mt-2">
            {reasons.length === 0 && (
              <p className="text-white/20 text-xs font-label">No anomaly detected</p>
            )}
            {reasons.map((r, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="text-white/60 text-xs font-label flex items-center gap-2"
              >
                <span className="w-1 h-1 rounded-full bg-white/30 flex-shrink-0" />
                {r}
              </motion.p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
