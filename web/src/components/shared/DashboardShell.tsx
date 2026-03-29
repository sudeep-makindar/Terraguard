import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, LogOut, Bell, ChevronRight, Radio, Activity, FileText, Server, BarChart2, MessageSquare, Settings, Camera } from 'lucide-react';

interface NavItem { id: string; label: string; icon: React.ReactNode; badge?: number; }

interface Props {
  role: 'officer' | 'police' | 'admin';
  roleLabel: string;
  navItems: NavItem[];
  activeScreen: string;
  onNav: (id: string) => void;
  onLogout: () => void;
  isAlert?: boolean;
  alertCount?: number;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}

export default function DashboardShell({
  roleLabel, navItems, activeScreen, onNav, onLogout, isAlert, alertCount, children, headerRight,
}: Props) {
  return (
    <div className="min-h-screen bg-[#0a1210] text-white flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-white/8 flex flex-col bg-[#0d1a18] flex-shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary/20 rounded-lg flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-primary-container" />
            </div>
            <div>
              <p className="text-white font-headline font-bold text-sm leading-none">TerraGuard</p>
              <p className="text-white/30 text-[9px] font-label tracking-widest uppercase mt-0.5">{roleLabel}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => onNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-label transition-all relative
                ${activeScreen === item.id
                  ? 'bg-primary/20 text-primary-container'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/4'}`}
            >
              <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>
              <span className="flex-1 text-left text-xs tracking-wide">{item.label}</span>
              {(item.badge ?? 0) > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {item.badge}
                </span>
              )}
              {activeScreen === item.id && (
                <motion.div layoutId="activePill" className="absolute right-2 w-1 h-4 rounded-full bg-primary-container" />
              )}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-white/8 space-y-1">
          {isAlert && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
              <span className="text-red-300 text-[10px] font-label font-bold">{alertCount} ACTIVE ALERT{alertCount !== 1 ? 'S' : ''}</span>
            </div>
          )}
          <button onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/30 hover:text-white hover:bg-white/4 transition-all text-xs font-label">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="border-b border-white/8 px-6 py-3 flex items-center justify-between bg-[#0d1a18]/60 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="text-white/40 text-xs font-label">{navItems.find(n => n.id === activeScreen)?.label}</span>
            <ChevronRight className="w-3 h-3 text-white/20" />
            <span className="text-white/60 text-xs font-label">terraguard_node_01</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-label text-white/30">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              LIVE
            </div>
            {headerRight}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div key={activeScreen}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}>
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export const OFFICER_NAV: NavItem[] = [
  { id: 'live', label: 'Live Monitor', icon: <Activity className="w-4 h-4" /> },
  { id: 'feeds', label: 'Live Feeds', icon: <Camera className="w-4 h-4" /> },
  { id: 'alerts', label: 'Alert Feed', icon: <Bell className="w-4 h-4" /> },
  { id: 'nodes', label: 'Node Health', icon: <Server className="w-4 h-4" /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart2 className="w-4 h-4" /> },
  { id: 'messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

export const POLICE_NAV: NavItem[] = [
  { id: 'inbox', label: 'Alerts Inbox', icon: <Bell className="w-4 h-4" /> },
  { id: 'feeds', label: 'Live Feeds', icon: <Camera className="w-4 h-4" /> },
  { id: 'firs', label: 'FIR Manager', icon: <FileText className="w-4 h-4" /> },
  { id: 'sms', label: 'SMS Log', icon: <Radio className="w-4 h-4" /> },
  { id: 'messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" /> },
];

export const COURT_NAV: NavItem[] = [
  { id: 'vault', label: 'Evidence Vault', icon: <FileText className="w-4 h-4" /> },
  { id: 'firs', label: 'FIR Archive', icon: <Activity className="w-4 h-4" /> },
  { id: 'timeline', label: 'Incident Timeline', icon: <ChevronRight className="w-4 h-4" /> },
  { id: 'analytics', label: 'Analytics Report', icon: <BarChart2 className="w-4 h-4" /> },
  { id: 'comms', label: 'Communication Logs', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'custody', label: 'Chain of Custody', icon: <Shield className="w-4 h-4" /> },
];
