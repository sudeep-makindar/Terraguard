import React from 'react';
import { motion } from 'motion/react';
import { SensorReading } from '../../hooks/useSensorSimulator';

interface Props {
  reading: SensorReading;
}

// Normalize to 0-100 scale for radar
function normalize(val: number | undefined, min: number, max: number) {
  if (val === undefined || isNaN(val)) return 0;
  return Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));
}

export default function RadarChart({ reading }: Props) {
  const axes = [
    { label: 'Vibration', value: normalize(reading.magnitude, 0, 4) },
    { label: 'Motion', value: (reading.pir_status || 0) * 100 },
    { label: 'Radar', value: normalize(1000 - (reading.radar_closest_cm || 0), 0, 1000) },
    { label: 'IR Int.', value: normalize(reading.ir_analog, 0, 1024) },
    { label: 'Nightmode', value: (reading.ir_analog || 0) < 150 ? 90 : 20 },
  ];

  const N = axes.length;
  const cx = 110, cy = 110, maxR = 85;

  function polarPoint(i: number, r: number) {
    if (isNaN(r)) r = 0;
    const angle = (2 * Math.PI * i) / N - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  const dataPoints = axes.map((a, i) => polarPoint(i, (a.value / 100) * maxR));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';

  return (
    <div className="bg-[#111a19] border border-white/8 rounded-2xl p-5 h-full flex flex-col">
      <p className="text-white/40 text-[10px] font-label uppercase tracking-widest mb-3">Sensor Radar</p>
      <div className="flex-1 flex items-center justify-center">
        <svg width="220" height="220" viewBox="0 0 220 220">
          {/* Grid rings */}
          {[0.25, 0.5, 0.75, 1].map((f, i) => {
            const ring = axes.map((_, j) => {
              const p = polarPoint(j, maxR * f);
              return `${j === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            }).join(' ') + ' Z';
            return <path key={i} d={ring} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
          })}
          {/* Axis spokes */}
          {axes.map((_, i) => {
            const p = polarPoint(i, maxR);
            return <line key={i} x1={cx} y1={cy} x2={p.x.toFixed(1)} y2={p.y.toFixed(1)} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />;
          })}
          {/* Data polygon */}
          <motion.path
            d={dataPath}
            fill="rgba(0,180,166,0.15)"
            stroke="#00b4a6"
            strokeWidth="2"
            animate={{ d: dataPath }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          {/* Data points */}
          {dataPoints.map((p, i) => (
            <motion.circle key={i} cx={p.x} cy={p.y} r="4" fill="#00b4a6"
              animate={{ cx: p.x, cy: p.y }} transition={{ duration: 0.5 }} />
          ))}
          {/* Axis labels */}
          {axes.map((a, i) => {
            const labelR = maxR + 18;
            const p = polarPoint(i, labelR);
            return (
              <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
                fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="Inter">
                {a.label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
