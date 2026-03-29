import React from 'react';
import { SensorReading } from '../../hooks/useSensorSimulator';
import { Cpu, Wifi, Clock, Zap, Eye, Ruler, Droplets, Sun } from 'lucide-react';

interface Props { reading: SensorReading; }

function Stat({ icon, label, value, unit, color = 'text-white' }: {
  icon: React.ReactNode; label: string; value: string | number; unit?: string; color?: string;
}) {
  return (
    <div className="bg-white/4 border border-white/8 rounded-xl p-3 flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5 text-white/30">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-white/30 text-[9px] font-label uppercase tracking-widest truncate">{label}</p>
        <p className={`font-label font-bold text-sm ${color}`}>
          {value}<span className="text-white/30 font-normal text-xs ml-1">{unit}</span>
        </p>
      </div>
    </div>
  );
}

export default function SensorStats({ reading }: Props) {
  return (
    <div className="bg-[#111a19] border border-white/8 rounded-2xl p-5 h-full">
      <p className="text-white/40 text-[10px] font-label uppercase tracking-widest mb-4">Live Sensor Readings</p>
      <div className="grid grid-cols-2 gap-2">
        <Stat icon={<Zap className="w-4 h-4"/>} label="Magnitude" value={reading.magnitude} unit="g"
          color={reading.magnitude > 1.8 ? 'text-red-400' : 'text-white'} />
        <Stat icon={<Eye className="w-4 h-4"/>} label="PIR Motion" value={reading.pir_status ? 'DETECTED' : 'CLEAR'}
          color={reading.pir_status ? 'text-orange-400' : 'text-green-400'} />
        <Stat icon={<Ruler className="w-4 h-4"/>} label="Radar Dist" value={reading.radar_closest_cm} unit="cm"
          color={reading.radar_closest_cm < 500 ? 'text-orange-400' : 'text-white'} />
        <Stat icon={<Zap className="w-4 h-4"/>} label="Radar Alert" value={reading.radar_alert ? 'YES' : 'NO'}
          color={reading.radar_alert ? 'text-red-400' : 'text-white/30'} />
        <Stat icon={<Droplets className="w-4 h-4"/>} label="Darkness IR" value={reading.ir_analog} unit="ADC"
          color={reading.ir_analog < 150 ? 'text-indigo-400' : 'text-yellow-400'} />
        <Stat icon={<Wifi className="w-4 h-4"/>} label="RSSI" value={reading.rssi} unit="dBm" />
        <Stat icon={<Cpu className="w-4 h-4"/>} label="Gyro X/Y/Z"
          value={`${reading.gyro_x} / ${reading.gyro_y} / ${reading.gyro_z}`} />
        <Stat icon={<Clock className="w-4 h-4"/>} label="Timestamp"
          value={new Date(reading.timestamp).toLocaleTimeString()} />
      </div>
    </div>
  );
}
