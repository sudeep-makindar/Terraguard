import React from 'react';
import { motion } from 'motion/react';
import { SensorReading } from '../../hooks/useSensorSimulator';

interface Props {
  history: SensorReading[];
}

type Series = { key: keyof SensorReading; label: string; color: string };

const SERIES: Series[] = [
  { key: 'accel_x', label: 'Accel X', color: '#00b4a6' },
  { key: 'accel_y', label: 'Accel Y', color: '#f97316' },
  { key: 'accel_z', label: 'Accel Z', color: '#a78bfa' },
  { key: 'magnitude', label: 'Magnitude', color: '#ef4444' },
];

function buildPath(data: number[], w: number, h: number, min: number, max: number) {
  if (data.length < 2) return `M0,${h}`;
  const xStep = w / (data.length - 1);
  return data.map((v, i) => {
    const val = isNaN(v) ? 0 : v;
    const x = i * xStep;
    const y = h - ((val - min) / (max - min + 0.001)) * h;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

export default function VibrationChart({ history }: Props) {
  const W = 480, H = 100;
  const allVals = history.flatMap(r => SERIES.map(s => r[s.key] as number));
  const min = Math.max(0, Math.min(...allVals) - 0.1);
  const max = Math.max(...allVals) + 0.1;

  return (
    <div className="bg-[#111a19] border border-white/8 rounded-2xl p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <p className="text-white/40 text-[10px] font-label uppercase tracking-widest">Vibration — Live</p>
        <div className="flex gap-3">
          {SERIES.map(s => (
            <span key={s.key} className="text-[9px] font-label flex items-center gap-1" style={{ color: s.color }}>
              <span className="w-3 h-0.5 rounded inline-block" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>
      <div className="relative overflow-hidden rounded-xl" style={{ height: H }}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map(f => (
            <line key={f} x1={0} y1={H * f} x2={W} y2={H * f} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          ))}
          {SERIES.map(s => {
            const data = history.map(r => r[s.key] as number);
            const path = buildPath(data, W, H, min, max);
            return (
              <motion.path
                key={s.key}
                d={path}
                fill="none"
                stroke={s.color}
                strokeWidth="1.5"
                opacity={0.85}
                animate={{ d: path }}
                transition={{ duration: 0.3 }}
              />
            );
          })}
          {/* Alert threshold line at 1.8g */}
          {(() => {
            const y = H - ((1.8 - min) / (max - min + 0.001)) * H;
            return y > 0 && y < H ? (
              <line x1={0} y1={y} x2={W} y2={y} stroke="#ef444440" strokeWidth="1" strokeDasharray="4 4" />
            ) : null;
          })()}
        </svg>
        {/* Threshold label */}
        <div className="absolute right-2 top-1 text-[9px] font-label text-red-400/60">1.8g threshold</div>
      </div>
    </div>
  );
}
