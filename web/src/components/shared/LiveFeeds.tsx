import React, { useState, useEffect } from 'react';
import { Camera, ExternalLink, Wifi, Users, Truck, ShieldAlert } from 'lucide-react';

const FEEDS = [
  { id: 'cam1', url: 'http://172.16.41.165:5000/', label: 'Main River Entry' },
  { id: 'cam2', url: 'http://172.16.41.167:5000/', label: 'North Sand Bank' },
  { id: 'cam3', url: 'http://localhost:5000/', label: 'Forest Perimeter' },
  { id: 'cam4', url: 'http://172.16.41.209:5000/', label: 'South Access Road' },
];

interface AnalysisResult {
  cam_id: string;
  counts: {
    people: number;
    cars: number;
    trucks: number;
    buses: number;
    motorcycles: number;
  };
  plates?: string[];
  faces: string[];
  risk_level: 'LOW' | 'HIGH' | 'CRITICAL';
}

export function LiveFeeds() {
  const [analysis, setAnalysis] = useState<Record<string, AnalysisResult>>({});
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws');
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'VIDEO_ANALYSIS') {
          setAnalysis(prev => ({ ...prev, [data.cam_id]: data }));
          setLastUpdate(new Date().toLocaleTimeString());
        }
      } catch (e) {
        console.error('WS Error:', e);
      }
    };
    return () => ws.close();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary-container" />
          <h2 className="text-white font-bold text-lg">Live Surveillance</h2>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-label text-white/30 bg-white/5 border border-white/10 rounded-full px-3 py-1">
          <Wifi className="w-3 h-3 text-green-400" />
          CONNECTED · 4 CAMERAS ACTIVE · {lastUpdate || 'WAITING FOR AI...'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {FEEDS.map((feed) => {
          const res = analysis[feed.id];
          return (
            <div key={feed.id} className="bg-[#111a19] border border-white/8 rounded-2xl overflow-hidden group relative">
              <div className="aspect-video bg-black relative">
                {/* Using backend proxy to resolve single-connection limits on mobile apps */}
                <img
                  src={`http://localhost:8000/proxy/stream/${feed.id}`}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  alt={feed.label}
                />

                {/* AI Overlay */}
                <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                  {/* Top: Badges */}
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[9px] font-label text-white font-bold uppercase tracking-wider">LIVE</span>
                      </div>
                      {res && res.risk_level !== 'LOW' && (
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border font-bold text-[9px] font-label shadow-lg
                          ${res.risk_level === 'CRITICAL' ? 'bg-red-500/20 border-red-500 text-red-500 animate-bounce' : 'bg-orange-500/20 border-orange-500 text-orange-500'}`}>
                          <ShieldAlert className="w-3 h-3" />
                          {res.risk_level} ACTIVITY
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {res && (
                        <div className="bg-black/80 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 flex flex-col gap-2 text-white shadow-2xl min-w-[80px]">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[8px] uppercase text-white/40 font-label">People</span>
                            <span className={`text-[10px] font-bold ${res.counts.people > 0 ? 'text-blue-400' : 'text-white/20'}`}>{res.counts.people}</span>
                          </div>
                          <div className="border-t border-white/5 pt-1 space-y-1">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-[8px] uppercase text-white/40 font-label">Cars</span>
                              <span className={`text-[10px] font-bold ${res.counts.cars > 0 ? 'text-yellow-400' : 'text-white/20'}`}>{res.counts.cars}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-[8px] uppercase text-white/40 font-label">Trucks</span>
                              <span className={`text-[10px] font-bold ${res.counts.trucks > 0 ? 'text-orange-400' : 'text-white/20'}`}>{res.counts.trucks}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-[8px] uppercase text-white/40 font-label">Buses</span>
                              <span className={`text-[10px] font-bold ${res.counts.buses > 0 ? 'text-purple-400' : 'text-white/20'}`}>{res.counts.buses}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Plates & Face Rec */}
                  <div className="flex justify-between items-end gap-2">
                    <div className="flex flex-col gap-2 flex-grow max-w-[70%]">
                      {res && res.plates && res.plates.length > 0 && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 backdrop-blur-md px-2 py-1 rounded-lg flex flex-col">
                          <span className="text-[7px] font-label text-yellow-500 uppercase tracking-tighter mb-0.5">Identified Plates</span>
                          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                            {res.plates.map((plate, idx) => (
                              <span key={idx} className="text-[9px] font-mono font-bold text-yellow-200 bg-black/40 px-1.5 py-0.5 rounded border border-white/5 whitespace-nowrap">
                                {plate}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-primary/10 border border-primary-container/30 backdrop-blur-md px-3 py-1.5 rounded-lg flex flex-col transition-all">
                        <span className="text-[8px] font-label text-white/40 uppercase tracking-tighter mb-0.5">Identified Subjects</span>
                        <div className="flex gap-2">
                          {res && res.faces.length > 0 ? res.faces.map((f, idx) => (
                            <span key={idx} className="text-[10px] items-center gap-1 font-bold text-primary-container flex">
                              <span className="w-1 h-1 rounded-full bg-primary-container" /> {f}
                            </span>
                          )) : <span className="text-[9px] text-white/20 italic">No faces detected</span>}
                        </div>
                      </div>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={feed.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-white hover:bg-white/10 transition-colors block pointer-events-auto"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-sm mb-0.5">{feed.label}</p>
                  <p className="text-white/30 text-[10px] font-label uppercase tracking-widest">{feed.id} · AI ANALYSIS ACTIVE</p>
                </div>
                <div className="text-right">
                  <p className="text-white/60 text-[10px] font-label">LAT: 11.8492°N</p>
                  <p className="text-white/60 text-[10px] font-label">LNG: 77.8203°E</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
