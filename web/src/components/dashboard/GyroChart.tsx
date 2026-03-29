import React from 'react';
import { motion } from 'motion/react';
import { SensorReading } from '../../hooks/useSensorSimulator';

interface Props { history: SensorReading[]; }

const SERIES = [
  { key: 'gyro_x' as keyof SensorReading, label: 'Gyro X', color: '#a78bfa' },
  { key: 'gyro_y' as keyof SensorReading, label: 'Gyro Y', color: '#34d399' },
  { key: 'gyro_z' as keyof SensorReading, label: 'Gyro Z', color: '#fbbf24' },
];

function buildPath(data: number[], W: number, H: number, min: number, max: number) {
  if (data.length < 2) return `M0,${H}`;
  const xStep = W / (data.length - 1);
  return data.map((v, i) => {
    const val = isNaN(v) ? 0 : v;
    const x = i * xStep;
    const y = H - ((val - min) / (max - min + 0.001)) * H;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

export default function GyroChart({ history }: Props) {
  const W = 480, H = 80;
  const allVals = history.flatMap(r => SERIES.map(s => r[s.key] as number));
  const min = Math.max(0, Math.min(...allVals) - 0.05);
  const max = Math.max(...allVals) + 0.05;

  return (
    <div className="bg-[#111a19] border border-white/8 rounded-2xl p-4 h-full">
      <div className="flex items-center justify-between mb-2">
        <p className="text-white/40 text-[10px] font-label uppercase tracking-widest">Gyroscope — Live</p>
        <div className="flex gap-3">
          {SERIES.map(s => (
            <span key={s.key} className="text-[9px] font-label flex items-center gap-1" style={{ color: s.color }}>
              <span className="w-3 h-0.5 rounded inline-block" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>
      <div className="relative rounded-lg overflow-hidden" style={{ height: H }}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          {[0.33, 0.66].map(f => (
            <line key={f} x1={0} y1={H * f} x2={W} y2={H * f} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          ))}
          {SERIES.map(s => {
            const data = history.map(r => r[s.key] as number);
            const path = buildPath(data, W, H, min, max);
            return (
              <motion.path key={s.key} d={path} fill="none" stroke={s.color} strokeWidth="1.5" opacity={0.85}
                animate={{ d: path }} transition={{ duration: 0.3 }} />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
