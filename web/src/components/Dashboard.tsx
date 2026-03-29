import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, LogOut, Radio, Bell, Activity } from 'lucide-react';
import { useSensorSimulator } from '../hooks/useSensorSimulator';
import ConfidenceMeter from './dashboard/ConfidenceMeter';
import RadarChart from './dashboard/RadarChart';
import VibrationChart from './dashboard/VibrationChart';
import GpsMap from './dashboard/GpsMap';
import AlertLog from './dashboard/AlertLog';
import SensorStats from './dashboard/SensorStats';

interface Props {
  role: 'officer' | 'police' | 'admin';
  onLogout: () => void;
}

const ROLE_LABELS = { officer: 'Forest Officer', police: 'Law Enforcement', admin: 'System Admin' };

export default function Dashboard({ role, onLogout }: Props) {
  const { reading, history, alerts, confidence, reasons, riskLevel } = useSensorSimulator();
  const isAlert = confidence > 60;

  return (
    <div className="min-h-screen bg-[#0a1210] text-white flex flex-col">
      {/* Top Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/8 bg-[#0d1a18]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary-container" />
          </div>
          <div>
            <span className="font-headline font-bold text-white">TerraGuard</span>
            <span className="text-white/30 text-xs font-label ml-2 uppercase tracking-widest">Sentinel OS</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Live pulse */}
          <div className="flex items-center gap-2 text-xs font-label text-white/40">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            LIVE
          </div>
          {/* Alert badge */}
          <AnimatePresence>
            {isAlert && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-label px-3 py-1.5 rounded-full"
              >
                <Bell className="w-3 h-3" />
                ALERT ACTIVE
              </motion.div>
            )}
          </AnimatePresence>
          <div className="text-xs font-label text-white/30 border border-white/10 rounded-full px-3 py-1.5">
            {ROLE_LABELS[role]}
          </div>
          <button onClick={onLogout}
            className="flex items-center gap-2 text-white/30 hover:text-white transition-colors text-xs font-label">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </nav>

      {/* Alert Banner */}
      <AnimatePresence>
        {isAlert && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="flex items-center gap-3 bg-red-500/10 border-b border-red-500/20 px-6 py-3"
          >
            <Activity className="w-4 h-4 text-red-400 animate-pulse" />
            <p className="text-red-300 text-xs font-label">
              <span className="font-bold">⚠ ILLEGAL MINING ALERT</span>
              &nbsp;— {reasons.join(' · ')} — Confidence: <strong>{confidence}%</strong> [{riskLevel}]
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid */}
      <div className="flex-1 p-6 grid gap-4" style={{
        gridTemplateColumns: 'repeat(12, 1fr)',
        gridTemplateRows: 'auto auto auto',
        alignItems: 'start',
      }}>
        {/* Row 1: Confidence + Radar + GPS */}
        <div style={{ gridColumn: 'span 3' }}><ConfidenceMeter confidence={confidence} riskLevel={riskLevel} reasons={reasons} /></div>
        <div style={{ gridColumn: 'span 3' }}><RadarChart reading={reading} /></div>
        <div style={{ gridColumn: 'span 6' }}><GpsMap reading={reading} confidence={confidence} /></div>

        {/* Row 2: Vibration chart full width */}
        <div style={{ gridColumn: 'span 12' }}><VibrationChart history={history} /></div>

        {/* Row 3: Stats + Alert Log */}
        <div style={{ gridColumn: 'span 7' }}><SensorStats reading={reading} /></div>
        <div style={{ gridColumn: 'span 5' }}><AlertLog alerts={alerts} /></div>
      </div>

      {/* Status bar */}
      <div className="border-t border-white/5 px-6 py-3 flex items-center gap-6 text-[10px] font-label text-white/20">
        <span className="flex items-center gap-1"><Radio className="w-3 h-3" /> {reading.device_id}</span>
        <span>Last: {new Date(reading.timestamp).toLocaleTimeString()}</span>
        <span>Satellites: {reading.satellites}</span>
        <span>Uptime: {Math.floor(Math.random() * 90000 + 84000)} ms</span>
        <span className="ml-auto">TerraGuard Intelligence v1.0 · Demo Mode</span>
      </div>
    </div>
  );
}
