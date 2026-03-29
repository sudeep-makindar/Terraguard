import React from 'react';
import { SensorReading } from '../../hooks/useSensorSimulator';
import { motion } from 'motion/react';

interface Props { reading: SensorReading; confidence: number; }

export default function GpsMap({ reading, confidence }: Props) {
  // Render a stylized static SVG map with pulsing pin — no external lib needed
  const isAlert = confidence > 60;

  return (
    <div className="bg-[#111a19] border border-white/8 rounded-2xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-white/40 text-[10px] font-label uppercase tracking-widest">GPS Location</p>
        <span className="text-[10px] font-label text-white/30">{reading.satellites} sats · RSSI {reading.rssi} dBm</span>
      </div>
      <div className="flex-1 relative rounded-xl overflow-hidden" style={{ minHeight: 180 }}>
        {/* Map tile substitute — dark grid */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, #0a1a18 0%, #0d2420 50%, #0a1a18 100%)',
        }}>
          <svg width="100%" height="100%" className="opacity-20">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#00b4a6" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          {/* River line */}
          <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 400 200" preserveAspectRatio="none">
            <path d="M0 120 Q100 100, 200 110 T400 96" fill="none" stroke="#00b4a6" strokeWidth="8" opacity="0.3"/>
            <path d="M0 124 Q100 104, 200 114 T400 100" fill="none" stroke="#1a3a38" strokeWidth="6"/>
          </svg>
        </div>

        {/* Pin */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          {isAlert && (
            <>
              <span className="absolute w-16 h-16 rounded-full border-2 border-red-400 animate-ping opacity-30" />
              <span className="absolute w-10 h-10 rounded-full bg-red-500/20 animate-ping" style={{ animationDelay: '0.3s' }} />
            </>
          )}
          <motion.div
            className="relative z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center"
            style={{ background: isAlert ? '#ef4444' : '#00b4a6', borderColor: isAlert ? '#fca5a5' : '#5eead4' }}
            animate={{ scale: isAlert ? [1, 1.15, 1] : 1 }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <span className="w-2 h-2 rounded-full bg-white" />
          </motion.div>
        </div>

        {/* Coords overlay */}
        <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-label text-white/30 uppercase tracking-widest">Coordinates</p>
            <p className="text-white text-xs font-label font-bold">{reading.lat.toFixed(5)}°N &nbsp; {reading.lng.toFixed(5)}°E</p>
          </div>
          {isAlert && (
            <span className="text-[9px] font-label text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5 animate-pulse">
              ACTIVE ALERT
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
