import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSensorSimulator } from '../../hooks/useSensorSimulator';
import { useAppStore } from '../../store/useAppStore';
import ConfidenceMeter from '../dashboard/ConfidenceMeter';
import RadarChart from '../dashboard/RadarChart';
import VibrationChart from '../dashboard/VibrationChart';
import GyroChart from '../dashboard/GyroChart';
import GpsMap from '../dashboard/GpsMap';
import { Zap, Eye, Ruler, Droplets, Sun, Wifi, Satellite, Clock, Bell, Volume2, Camera, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';

export function LiveMonitor() {
  const { reading, history, confidence, reasons, riskLevel } = useSensorSimulator();
  const [buzzerOn, setBuzzerOn] = useState(false);
  const isAlert = confidence >= 80;
  
  const currentHour = new Date().getHours();
  const isNight = currentHour >= 18 || currentHour < 6;

  const downloadEvidence = async () => {
    try {
      const doc = new jsPDF();
      doc.setFont("helvetica");
      doc.setFontSize(22);
      doc.text("TerraGuard - Incident Evidence Report", 20, 20);
      
      doc.setFontSize(10);
      doc.text(`Timestamp: ${new Date(reading?.timestamp || Date.now()).toLocaleString()}`, 20, 30);
      doc.text(`Device ID: ${reading?.device_id || 'UNKNOWN'}`, 20, 36);
      doc.text(`Location: ${(reading?.lat || 0).toFixed(5)}°N, ${(reading?.lng || 0).toFixed(5)}°E`, 20, 42);
      
      doc.setFontSize(14);
      doc.text("1. Sensor Telemetry Dump", 20, 55);
      
      doc.setFontSize(11);
      doc.text(`Threat Confidence: ${confidence}/100 [ ${riskLevel || 'LOW'} ]`, 20, 65);
      doc.text(`AI Reasons: ${(reasons || []).join(' | ') || 'None'}`, 20, 71);
      
      doc.text(`Radar Proximity: ${(reading?.radar_closest_cm || 0).toFixed(1)} cm`, 20, 80);
      doc.text(`Vibration Magnitude: ${(reading?.magnitude || 0).toFixed(2)} g`, 20, 86);
      doc.text(`PIR Motion: ${reading?.pir_status ? 'DETECTED' : 'CLEAR'}`, 20, 92);
      doc.text(`IR Intensity: ${reading?.ir_analog || 0} (${isNight ? 'NIGHT' : 'DAY'})`, 20, 98);
      
      doc.setFontSize(14);
      doc.text("2. Camera Snapshot", 20, 115);
      
      try {
        const res = await fetch("http://172.16.41.165:5000/snapshot");
        if (res.ok) {
          const blob = await res.blob();
          const base64data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          doc.addImage(base64data, "JPEG", 20, 125, 160, 120);
        } else {
          doc.setFontSize(10);
          doc.text("[Camera offline or timeout occurred while pulling snapshot]", 20, 125);
        }
      } catch (e) {
        doc.setFontSize(10);
        doc.text("[Camera unreachable - evidence skipped]", 20, 125);
      }
      
      doc.save(`TERRAGUARD_EVIDENCE_${Date.now()}.pdf`);
    } catch (criticalErr) {
      console.error("PDF engine crash: ", criticalErr);
      alert("Error generating PDF. Check console logs for details.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Alert Banner */}
      <AnimatePresence>
        {isAlert && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
            <Bell className="w-4 h-4 text-red-400 animate-pulse flex-shrink-0" />
            <p className="text-red-300 text-xs font-label flex-1">
              <span className="font-bold">⚠ ALERT</span> — {reasons.join(' · ')}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={downloadEvidence}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-label font-bold border transition-all bg-white/5 border-white/20 text-white/80 hover:border-teal-400 hover:text-teal-400">
                <Download className="w-3 h-3" />
                LOG EVIDENCE
              </button>
              <button onClick={() => setBuzzerOn(v => !v)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-label font-bold border transition-all
                  ${buzzerOn ? 'bg-red-500 border-red-400 text-white animate-pulse' : 'bg-white/5 border-white/20 text-white/50 hover:border-red-400 hover:text-red-400'}`}>
                <Volume2 className="w-3 h-3" />
                {buzzerOn ? 'BUZZER ON' : 'BUZZER OFF'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Row 1: Confidence + Radar + Camera */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-3 min-h-[220px] shadow-2xl flex flex-col"><ConfidenceMeter confidence={confidence} riskLevel={riskLevel} reasons={reasons} /></div>
        <div className="col-span-3 min-h-[220px] shadow-2xl flex flex-col"><RadarChart reading={reading} /></div>
        <div className="col-span-6 min-h-[220px] rounded-2xl overflow-hidden border border-white/8 relative group shadow-2xl bg-black">
          <iframe 
            src="http://172.16.41.165:5000/video" 
            className="w-full h-full border-none opacity-80 hover:opacity-100 transition-opacity"
            title="Live Camera Feed"
          />
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[9px] font-label text-white font-bold uppercase tracking-wider">LIVE CAM 01</span>
          </div>
          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[9px] font-label text-white/50">River Entry Point · Mettur</span>
          </div>
        </div>
      </div>

      {/* Row 2: Vibration + Gyro + GPS */}
      <div className="grid grid-cols-3 gap-4">
        <div className="h-[200px] shadow-xl flex flex-col"><VibrationChart history={history} /></div>
        <div className="h-[200px] shadow-xl flex flex-col"><GyroChart history={history} /></div>
        <div className="h-[200px] shadow-xl flex flex-col"><GpsMap reading={reading} confidence={confidence} /></div>
      </div>

      {/* Row 3: Stat Cards */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { icon: <Eye className="w-4 h-4"/>, label: 'PIR Motion', value: reading.pir_status ? 'DETECTED' : 'CLEAR', alert: reading.pir_status === 1 },
          { icon: <Ruler className="w-4 h-4"/>, label: 'Radar Dist', value: `${reading.radar_closest_cm.toFixed(0)} cm`, alert: reading.radar_closest_cm < 500 },
          { icon: <Droplets className="w-4 h-4"/>, label: 'IR Intensity', value: reading.ir_analog, alert: reading.ir_analog < 150 },
          { icon: <Sun className="w-4 h-4"/>, label: 'Night/Day', value: isNight ? '🌙 NIGHT' : '☀️ DAY', alert: false },
          { icon: <Wifi className="w-4 h-4"/>, label: 'RSSI', value: `${reading.rssi} dBm`, alert: reading.rssi < -80 },
        ].map((s, i) => (
          <div key={i} className={`bg-[#111a19] border rounded-2xl p-4 ${s.alert ? 'border-orange-500/30' : 'border-white/8'}`}>
            <div className="flex items-center gap-2 mb-2 text-white/30">{s.icon}<span className="text-[10px] font-label uppercase tracking-widest">{s.label}</span></div>
            <p className={`font-label font-bold text-sm ${s.alert ? 'text-orange-400' : 'text-white'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Footer node info */}
      <div className="bg-[#111a19] border border-white/8 rounded-2xl px-5 py-3 flex items-center gap-8 text-[10px] font-label text-white/30">
        <span className="flex items-center gap-1.5"><Wifi className="w-3 h-3" /> {reading.rssi} dBm</span>
        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Uptime: 23h 14m</span>
        <span className="flex items-center gap-1.5"><Satellite className="w-3 h-3" /> {reading.satellites} sats</span>
        <span className="flex items-center gap-1.5"><Zap className="w-3 h-3" /> Heap: 214 KB free</span>
        <span className="ml-auto text-[9px]">terraguard_node_01 · {new Date(reading.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
