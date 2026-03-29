/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  CheckCircle2, 
  Radio, 
  Cpu, 
  ShieldAlert, 
  Trees, 
  Shield, 
  Gavel, 
  Quote,
  ChevronDown,
} from 'lucide-react';
import LoginModal from './components/LoginModal';
import OfficerShell from './components/officer/OfficerShell';
import PoliceShell from './components/police/PoliceShell';
import CourtShell from './components/court/CourtShell';

// --- Sub-components (same as before) ---

const TiltCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={`perspective-1000 ${className}`}
    >
      {children}
    </motion.div>
  );
};

const FlipCard = ({ front, back, className = "" }: { front: React.ReactNode, back: React.ReactNode, className?: string }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  return (
    <div className={`group h-[400px] perspective-1000 cursor-pointer ${className}`} onClick={() => setIsFlipped(!isFlipped)}>
      <motion.div className="relative w-full h-full preserve-3d" initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }} transition={{ duration: 0.7, ease: "easeInOut" }}>
        <div className="absolute inset-0 backface-hidden bg-white p-10 rounded-3xl flex flex-col justify-between border border-outline-variant/10 shadow-sm">{front}</div>
        <div className="absolute inset-0 backface-hidden bg-primary p-10 rounded-3xl flex flex-col justify-center [transform:rotateY(180deg)] text-on-primary">{back}</div>
      </motion.div>
    </div>
  );
};

const TopoBackground = () => (
  <div className="absolute inset-0 z-0 opacity-10 pointer-events-none overflow-hidden">
    <motion.svg className="w-full h-full" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg"
      animate={{ x: [0, -20, 0], y: [0, -20, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
      <path d="M0 200 C 150 150, 350 250, 500 200 S 850 150, 1000 200" fill="transparent" stroke="#006a62" strokeWidth="1" />
      <path d="M0 400 C 150 350, 350 450, 500 400 S 850 350, 1000 400" fill="transparent" stroke="#006a62" strokeWidth="1" />
      <path d="M0 600 C 150 550, 350 650, 500 600 S 850 550, 1000 600" fill="transparent" stroke="#006a62" strokeWidth="1" />
      <path d="M0 800 C 150 750, 350 850, 500 800 S 850 750, 1000 800" fill="transparent" stroke="#006a62" strokeWidth="1" />
    </motion.svg>
  </div>
);

// --- Main App ---

type View = 'landing' | 'dashboard';

export default function App() {
  const { scrollYProgress } = useScroll();
  const yParallax = useTransform(scrollYProgress, [0, 1], [0, -200]);

  const [view, setView] = useState<View>('landing');
  const [showLogin, setShowLogin] = useState(false);
  const [role, setRole] = useState<'officer' | 'police' | 'admin'>('officer');

  const openLogin = () => setShowLogin(true);

  const handleLogin = (r: 'officer' | 'police' | 'admin') => {
    setRole(r);
    setShowLogin(false);
    setView('dashboard');
  };

  const handleLogout = () => {
    setView('landing');
  };

  return (
    <>
      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} onLogin={handleLogin} />

      <AnimatePresence mode="wait">
        {view === 'dashboard' ? (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {role === 'officer' && <OfficerShell onLogout={handleLogout} />}
            {role === 'police'  && <PoliceShell onLogout={handleLogout} />}
            {role === 'admin'   && <CourtShell onLogout={handleLogout} />}
          </motion.div>
        ) : (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* ── LANDING PAGE ── */}
            <div className="relative">
              {/* Header Navigation */}
              <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-outline-variant/10">
                <div className="flex justify-between items-center px-8 py-4 max-w-[1440px] mx-auto">
                  <div className="text-2xl font-headline italic font-semibold text-on-surface">TerraGuard</div>
                  <div className="hidden md:flex gap-8 items-center">
                    <a className="text-primary font-bold border-b-2 border-primary pb-1 font-label tracking-wide uppercase text-xs" href="#">Intelligence</a>
                    <a className="text-on-surface/70 font-medium hover:text-primary transition-all duration-300 font-label tracking-wide uppercase text-xs" href="#">Operations</a>
                    <a className="text-on-surface/70 font-medium hover:text-primary transition-all duration-300 font-label tracking-wide uppercase text-xs" href="#">Technology</a>
                    <a className="text-on-surface/70 font-medium hover:text-primary transition-all duration-300 font-label tracking-wide uppercase text-xs" href="#">Impact</a>
                  </div>
                  <button onClick={openLogin} className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-6 py-2 rounded-full font-label text-sm font-semibold tracking-wider hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-primary/20">
                    Request Demo
                  </button>
                </div>
              </nav>

              <main>
                {/* Hero */}
                <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
                  <TopoBackground />
                  <div className="max-w-[1440px] mx-auto px-8 grid md:grid-cols-2 gap-12 items-center relative z-10 w-full">
                    <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="space-y-8">
                      <span className="text-tertiary font-label font-bold tracking-[0.2em] uppercase text-xs flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                        Strategic Defense Protocol
                      </span>
                      <h1 className="text-6xl md:text-8xl font-headline font-bold leading-[1.1] tracking-tight text-on-surface">
                        India's Rivers Are Being <span className="italic text-primary">Stolen</span> — In Silence.
                      </h1>
                      <p className="text-xl text-on-surface-variant max-w-lg leading-relaxed font-body">
                        TerraGuard deploys intelligent sensor networks to detect illegal sand mining in real time — before the miners disappear.
                      </p>
                      <div className="flex flex-wrap gap-4 pt-4">
                        <button onClick={openLogin} className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-8 py-4 rounded-full font-semibold flex items-center gap-3 shadow-xl shadow-primary/20 hover:translate-y-[-2px] transition-all">
                          Request Demo <ArrowRight className="w-5 h-5" />
                        </button>
                        <button onClick={openLogin} className="border border-outline-variant hover:bg-surface-container-low text-on-surface px-8 py-4 rounded-full font-semibold transition-colors">
                          View Live Dashboard
                        </button>
                      </div>
                    </motion.div>

                    <div className="relative group">
                      <TiltCard className="w-full aspect-square bg-surface-container-highest rounded-[4rem] shadow-2xl overflow-hidden relative">
                        <img alt="IOT Sensor Node" className="w-full h-full object-cover mix-blend-multiply opacity-80"
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCYWUq_TwW9a7OUi7eQjuQh9CrQaTKyYwLB47cBqiqfGzHdqMnhde5nTJCBeOYWjbqdASnJ6Sk_MkrNH2k7mkJqYLwZ1vyPg2hOrBA-tWoNC1zJWLn0eTkStUWcbN_LUyjSSLhR0HTK0DK2fEkcuwXkE87DNL28XwhZkt03BPfFGehQcfUFuxsm1pQ_9lWXzkh9VWTmyUCqYAvopdMJiHl56AiGzdJEYlSPZGslzVMS2-YOSRc9e11MIdy9D2krE1pIQnrG8VWVh-U"
                          referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent"></div>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                          className="absolute top-10 right-10 bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-lg border border-outline-variant/15">
                          <p className="text-[10px] font-label font-bold text-on-surface-variant uppercase tracking-widest mb-1">Status</p>
                          <p className="text-primary font-bold flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                            ACTIVE_STREAM
                          </p>
                        </motion.div>
                      </TiltCard>
                    </div>
                  </div>
                  <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50">
                    <span className="text-[10px] font-label font-bold tracking-widest uppercase">Scroll to Explore</span>
                    <ChevronDown className="w-5 h-5 animate-bounce" />
                  </div>
                </section>

                {/* Stats Bar */}
                <section className="bg-surface-container-low py-16 border-y border-outline-variant/10">
                  <div className="max-w-[1440px] mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-12">
                    <div className="text-center md:text-left">
                      <h3 className="text-5xl font-headline font-bold text-primary mb-1">₹4,700 Cr</h3>
                      <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Annual Revenue Lost</p>
                    </div>
                    <div className="hidden md:block w-px h-16 bg-outline-variant/30"></div>
                    <div className="text-center md:text-left">
                      <h3 className="text-5xl font-headline font-bold text-primary mb-1">3</h3>
                      <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Rivers Monitored</p>
                    </div>
                    <div className="hidden md:block w-px h-16 bg-outline-variant/30"></div>
                    <div className="text-center md:text-left">
                      <h3 className="text-5xl font-headline font-bold text-primary mb-1">&lt; 90 sec</h3>
                      <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Response Latency</p>
                    </div>
                    <div className="hidden md:block w-px h-16 bg-outline-variant/30"></div>
                    <div className="text-center md:text-left">
                      <h3 className="text-5xl font-headline font-bold text-primary mb-1">24/7</h3>
                      <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Autonomous Guard</p>
                    </div>
                  </div>
                </section>

                {/* Problem Section */}
                <section className="py-32 bg-background">
                  <div className="max-w-[1440px] mx-auto px-8 grid md:grid-cols-2 gap-24 items-center">
                    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-10">
                      <h2 className="text-5xl md:text-7xl font-headline font-bold leading-tight">The Ecosystem is <span className="italic text-tertiary">Collapsing</span> in Plain Sight.</h2>
                      <p className="text-lg text-on-surface-variant leading-relaxed">Illegal sand mining isn't just theft; it's environmental warfare. Our riverbeds are being stripped, leading to plummeting water tables, structural bridge failures, and complete habitat destruction.</p>
                      <ul className="space-y-6">
                        <li className="flex items-start gap-4">
                          <CheckCircle2 className="w-6 h-6 text-primary mt-1" />
                          <div>
                            <h4 className="font-bold text-on-surface">Invisible Operations</h4>
                            <p className="text-on-surface-variant text-sm">Mining occurs under cover of darkness, in remote reaches inaccessible to manual patrols.</p>
                          </div>
                        </li>
                        <li className="flex items-start gap-4">
                          <CheckCircle2 className="w-6 h-6 text-primary mt-1" />
                          <div>
                            <h4 className="font-bold text-on-surface">Data Gaps</h4>
                            <p className="text-on-surface-variant text-sm">Law enforcement relies on delayed reports, often arriving hours after the criminals have fled.</p>
                          </div>
                        </li>
                      </ul>
                    </motion.div>
                    <div className="relative rounded-2xl overflow-hidden aspect-[4/5] shadow-2xl">
                      <motion.img style={{ y: yParallax }} alt="Aerial River Damage" className="w-full h-full object-cover scale-125"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEWGcG8RxLRosi2o7lNXDg9cXLb8KBkd8dFgb18yI7L6XXsAUCYcMlRXFktOn8fMb_eYc-xjsq8I4aRnyinztZ5-2-Ffal1Xm-beDaYcXRs80IMSGHtukUjqxrDzwpPNmlxT-Df0Vo7qkLMThJWLV2awV4p6JhrZLYcBAhjyZTN8YLVimiLnVP4ZmySycvieBlxjmeAalwtoIEMNx775VM6mAutyIDVIEqkORS8ClWrZvkud0v6zNrx_e35xtUecSIc5Vn845jBPw"
                        referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-tertiary/10 mix-blend-multiply"></div>
                      <div className="absolute bottom-8 left-8 right-8 bg-white/90 backdrop-blur-xl p-6 rounded-xl border border-outline-variant/20">
                        <span className="font-label text-[10px] font-bold text-tertiary tracking-widest uppercase mb-2 block">Site Intelligence: Cauvery Basin</span>
                        <p className="text-on-surface font-headline italic text-lg">"Illegal extraction detected at 02:44 AM. Volume estimated at 450 cubic meters."</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Architecture */}
                <section className="py-32 bg-surface-container-low overflow-hidden">
                  <div className="max-w-[1440px] mx-auto px-8 text-center mb-20">
                    <span className="text-primary font-label font-bold tracking-[0.2em] uppercase text-xs">The Architecture</span>
                    <h2 className="text-5xl font-headline font-bold mt-4">A Tri-Layer Shield</h2>
                  </div>
                  <div className="max-w-[1440px] mx-auto px-8 grid md:grid-cols-3 gap-8 relative">
                    <TiltCard className="bg-white p-10 rounded-3xl shadow-sm border border-outline-variant/10 group">
                      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-primary group-hover:text-on-primary transition-colors">
                        <Radio className="w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-headline font-bold mb-4">01. Neural Detection</h3>
                      <p className="text-on-surface-variant text-sm leading-relaxed">In-situ nodes monitor seismic vibrations, acoustic profiles of heavy machinery, and river turbidity 24/7.</p>
                    </TiltCard>
                    <TiltCard className="bg-white p-10 rounded-3xl shadow-sm border border-outline-variant/10 group">
                      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-primary group-hover:text-on-primary transition-colors">
                        <Cpu className="w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-headline font-bold mb-4">02. Edge Processing</h3>
                      <p className="text-on-surface-variant text-sm leading-relaxed">ESP32-driven edge AI filters noise, classifying activities with 98% accuracy before transmitting anomaly data.</p>
                    </TiltCard>
                    <TiltCard className="bg-white p-10 rounded-3xl shadow-sm border border-outline-variant/10 group">
                      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-primary group-hover:text-on-primary transition-colors">
                        <ShieldAlert className="w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-headline font-bold mb-4">03. Tactical Response</h3>
                      <p className="text-on-surface-variant text-sm leading-relaxed">Central command receives encrypted GPS coordinates and evidence logs instantly via satellite/GSM links.</p>
                    </TiltCard>
                    <svg className="absolute top-1/2 left-0 w-full hidden md:block opacity-20 pointer-events-none" fill="none" height="20" viewBox="0 0 1000 20">
                      <line stroke="#006a62" strokeDasharray="8 8" strokeWidth="2" x1="100" x2="900" y1="10" y2="10"></line>
                    </svg>
                  </div>
                </section>

                {/* Live Dashboard Preview */}
                <section className="py-32 bg-background">
                  <div className="max-w-[1440px] mx-auto px-8">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                      className="bg-[#1C1B1B] rounded-[2.5rem] p-4 md:p-8 shadow-2xl relative overflow-hidden">
                      <div className="flex items-center gap-2 mb-8 border-b border-white/10 pb-4">
                        <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-amber-500/50"></div>
                        <div className="w-3 h-3 rounded-full bg-emerald-500/50"></div>
                        <div className="ml-4 text-[10px] font-label text-white/30 tracking-widest uppercase">Sentinel-OS // Tactical Dashboard</div>
                      </div>
                      <div className="grid md:grid-cols-4 gap-8">
                        <div className="md:col-span-3 aspect-video bg-black/40 rounded-2xl overflow-hidden relative border border-white/5">
                          <img alt="Satellite Map View" className="w-full h-full object-cover opacity-60"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFV6ABNTHzPL9Xb3dU9SLsew5ByfkH1YziRuFT8N9aLr_NwKfTVMAf3TvyqrLDcttXMmZyVBcJQzOWTUCHsyL0uuwE2mgIUgHJh0vWMnozlxKfnHnj2igTQIn2-j-0YePMAjgWT3tDhjgtH3Kd4l0t1pOQCNqsHIZwu0zv84Dc-44YjoTUOm7S5AbNx3LYkuK_s1hVyXCbfP244y2W-qjEyFVLNz83GYt47ac3MoGUA7zTver_dtCAHjfSNuBRrNG_DGxTm5Y-na4"
                            referrerPolicy="no-referrer" />
                          <div className="absolute top-1/2 left-1/3 w-12 h-12">
                            <span className="absolute inset-0 bg-tertiary rounded-full animate-ping opacity-75"></span>
                            <span className="absolute inset-2 bg-tertiary rounded-full shadow-[0_0_15px_#F59E0B]"></span>
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-tertiary/30 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                            <span className="text-tertiary font-label font-bold text-[10px] tracking-widest uppercase flex items-center gap-2 mb-4">
                              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>CRITICAL_ALERT
                            </span>
                            <div className="space-y-4">
                              <div>
                                <p className="text-white/40 text-[10px] font-label uppercase">Confidence Score</p>
                                <p className="text-2xl font-headline font-bold text-white">92.4%</p>
                              </div>
                              <div className="h-px bg-white/10"></div>
                              <div>
                                <p className="text-white/40 text-[10px] font-label uppercase">Device ID</p>
                                <p className="text-sm font-label font-medium text-white">TN-CAU-772-NODE</p>
                              </div>
                              <div>
                                <p className="text-white/40 text-[10px] font-label uppercase">Coordinates</p>
                                <p className="text-sm font-label font-medium text-white">10.8505° N, 78.7047° E</p>
                              </div>
                              <button onClick={openLogin} className="w-full bg-tertiary text-white py-3 rounded-lg font-bold text-sm tracking-wide mt-4 hover:bg-tertiary/90 transition-colors">
                                DISPATCH UNIT
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </section>

                {/* Stakeholder */}
                <section className="py-32 bg-surface-container-low">
                  <div className="max-w-[1440px] mx-auto px-8">
                    <h2 className="text-5xl font-headline font-bold text-center mb-20 text-on-surface">Precision Intelligence for Every Stakeholder</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                      <FlipCard
                        front={<><Trees className="w-10 h-10 text-primary" /><h3 className="text-3xl font-headline font-bold text-on-surface">Forest Officer</h3><p className="text-on-surface-variant text-sm">Real-time alerts and terrain-specific encroachment tracking.</p></>}
                        back={<><h4 className="font-bold mb-4 uppercase tracking-widest text-xs">Officer View</h4><ul className="space-y-3 text-sm opacity-90"><li>• Instant SMS/WhatsApp Alerts</li><li>• Night-vision Drone Routing</li><li>• Acoustic Signature Logs</li></ul></>}
                      />
                      <FlipCard
                        front={<><Shield className="w-10 h-10 text-primary" /><h3 className="text-3xl font-headline font-bold text-on-surface">Law Enforcement</h3><p className="text-on-surface-variant text-sm">Actionable logistics for rapid intercept and arrest coordination.</p></>}
                        back={<><h4 className="font-bold mb-4 uppercase tracking-widest text-xs">Police View</h4><ul className="space-y-3 text-sm opacity-90"><li>• Suspect Vehicle Tracking</li><li>• Chain-of-Custody Evidence</li><li>• Inter-district Comms Hub</li></ul></>}
                      />
                      <FlipCard
                        front={<><Gavel className="w-10 h-10 text-primary" /><h3 className="text-3xl font-headline font-bold text-on-surface">Court Admin</h3><p className="text-on-surface-variant text-sm">Tamper-proof evidence logs for legal accountability.</p></>}
                        back={<><h4 className="font-bold mb-4 uppercase tracking-widest text-xs">Judicial View</h4><ul className="space-y-3 text-sm opacity-90"><li>• Historical Audit Trails</li><li>• Environmental Impact Stats</li><li>• Non-Repudiation Protocols</li></ul></>}
                      />
                    </div>
                  </div>
                </section>

                {/* Quote */}
                <section className="py-32 bg-background relative overflow-hidden">
                  <div className="grain-overlay absolute inset-0"></div>
                  <div className="max-w-4xl mx-auto px-8 text-center relative z-10">
                    <Quote className="w-16 h-16 text-primary/20 mx-auto mb-10" />
                    <motion.blockquote initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                      className="text-4xl md:text-5xl font-headline italic font-medium leading-relaxed text-on-surface mb-12">
                      "The state is the trustee of all natural resources... the ecological degradation of riverbeds through illegal mining must be stopped by adopting <span className="text-primary not-italic font-bold">advanced technological surveillance</span>."
                    </motion.blockquote>
                    <cite className="font-label text-xs uppercase tracking-[0.3em] font-bold text-on-surface-variant">— Madras High Court Mandate, 2023</cite>
                  </div>
                </section>

                {/* CTA */}
                <section className="bg-[#1C1B1B] pt-32 pb-12 relative overflow-hidden">
                  <div className="max-w-[1440px] mx-auto px-8 text-center relative z-10">
                    <h2 className="text-5xl md:text-7xl font-headline font-bold text-white mb-8">The deadline is March 31.<br/>The rivers <span className="italic text-primary-container">can't wait</span>.</h2>
                    <button onClick={openLogin} className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-12 py-5 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-2xl shadow-primary/20">
                      Deploy TerraGuard Now
                    </button>
                  </div>
                  <div className="mt-20 opacity-20">
                    <motion.svg className="w-full h-32" preserveAspectRatio="none" viewBox="0 0 1440 120"
                      animate={{ x: [0, -100, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}>
                      <path d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,58.7C960,64,1056,64,1152,58.7C1248,53,1344,43,1392,37.3L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z" fill="#00b4a6"></path>
                    </motion.svg>
                  </div>
                </section>
              </main>

              <footer className="bg-[#1C1B1B] border-t border-white/5">
                <div className="max-w-[1440px] mx-auto py-12 px-8 flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="text-lg font-headline text-white">TerraGuard</div>
                  <div className="flex flex-wrap justify-center gap-8">
                    <a className="font-label text-xs tracking-[0.05em] uppercase text-white/50 hover:text-white transition-colors" href="#">Privacy Protocol</a>
                    <a className="font-label text-xs tracking-[0.05em] uppercase text-white/50 hover:text-white transition-colors" href="#">Terms of Service</a>
                    <a className="font-label text-xs tracking-[0.05em] uppercase text-white/50 hover:text-white transition-colors" href="#">Security Disclosure</a>
                    <a className="font-label text-xs tracking-[0.05em] uppercase text-white/50 hover:text-white transition-colors" href="#">Contact Command</a>
                  </div>
                  <p className="font-label text-[10px] tracking-[0.05em] uppercase text-white/30">© 2024 TerraGuard Intelligence. All rights reserved.</p>
                </div>
              </footer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
