import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Wifi, Clock, Satellite, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

function msToUptime(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

const STATUS_STYLE = {
  ONLINE:   { icon: <CheckCircle className="w-4 h-4 text-green-400" />, dot: 'bg-green-400', label: 'ONLINE' },
  DEGRADED: { icon: <AlertTriangle className="w-4 h-4 text-yellow-400" />, dot: 'bg-yellow-400 animate-pulse', label: 'DEGRADED' },
  OFFLINE:  { icon: <XCircle className="w-4 h-4 text-red-400" />, dot: 'bg-red-400', label: 'OFFLINE' },
};

export function NodeHealth() {
  const { nodes } = useAppStore();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-white font-bold text-lg">Sensor Node Health</h2>
        <span className="text-white/30 text-xs font-label">{nodes.filter(n => n.status === 'ONLINE').length}/{nodes.length} nodes online</span>
      </div>
      <div className="grid gap-4">
        {nodes.map(node => {
          const s = STATUS_STYLE[node.status];
          return (
            <div key={node.id} className="bg-[#111a19] border border-white/8 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${s.dot}`} />
                  <div>
                    <p className="text-white font-bold">{node.label}</p>
                    <p className="text-white/40 text-xs font-label">{node.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-label">
                  {s.icon}
                  <span className={node.status === 'ONLINE' ? 'text-green-400' : node.status === 'DEGRADED' ? 'text-yellow-400' : 'text-red-400'}>{s.label}</span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white/4 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-white/30 mb-1"><Wifi className="w-3 h-3" /><span className="text-[9px] font-label uppercase">RSSI</span></div>
                  <p className={`font-label font-bold text-sm ${node.rssi < -80 ? 'text-red-400' : node.rssi < -70 ? 'text-yellow-400' : 'text-green-400'}`}>{node.rssi} dBm</p>
                </div>
                <div className="bg-white/4 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-white/30 mb-1"><Clock className="w-3 h-3" /><span className="text-[9px] font-label uppercase">Uptime</span></div>
                  <p className="font-label font-bold text-sm text-white">{msToUptime(node.uptime_ms)}</p>
                </div>
                <div className="bg-white/4 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-white/30 mb-1"><Satellite className="w-3 h-3" /><span className="text-[9px] font-label uppercase">Satellites</span></div>
                  <p className="font-label font-bold text-sm text-white">{node.satellites}</p>
                </div>
                <div className="bg-white/4 rounded-xl p-3">
                  <div className="text-[9px] font-label uppercase text-white/30 mb-1">Free Heap</div>
                  <p className={`font-label font-bold text-sm ${node.free_heap < 150000 ? 'text-red-400' : 'text-white'}`}>{(node.free_heap / 1024).toFixed(0)} KB</p>
                </div>
              </div>
              <div className="mt-3 text-white/20 text-[10px] font-label">
                Last seen: {new Date(node.last_seen).toLocaleString()} · {node.location} · {node.lat.toFixed(4)}°N, {node.lng.toFixed(4)}°E
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
