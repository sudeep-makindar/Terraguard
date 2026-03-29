import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, Eye, EyeOff, LogIn } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onLogin: (role: 'officer' | 'police' | 'admin') => void;
}

const DEMO_ACCOUNTS = [
  { username: 'officer@terraguard', password: 'officer123', role: 'officer' as const, label: 'Forest Officer', color: '#006a62' },
  { username: 'police@terraguard',  password: 'police123',  role: 'police'  as const, label: 'Law Enforcement', color: '#855300' },
  { username: 'admin@terraguard',   password: 'admin123',   role: 'admin'   as const, label: 'Admin',           color: '#1C1B1B' },
];

export default function LoginModal({ open, onClose, onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      const account = DEMO_ACCOUNTS.find(a => a.username === username && a.password === password);
      if (account) {
        onLogin(account.role);
      } else {
        setError('Invalid credentials. Use a demo account below.');
      }
      setLoading(false);
    }, 800);
  };

  const quickLogin = (role: typeof DEMO_ACCOUNTS[0]['role']) => {
    const acc = DEMO_ACCOUNTS.find(a => a.role === role)!;
    setUsername(acc.username);
    setPassword(acc.password);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative z-10 w-full max-w-md bg-[#0f1a19] border border-white/10 rounded-3xl p-8 shadow-2xl"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <button onClick={onClose} className="absolute top-5 right-5 text-white/30 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-container" />
              </div>
              <div>
                <h2 className="text-white font-headline font-bold text-xl">TerraGuard Access</h2>
                <p className="text-white/40 text-xs font-label tracking-widest uppercase">Secure Command Portal</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-white/50 text-xs font-label uppercase tracking-widest mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-primary-container transition-colors text-sm"
                  placeholder="officer@terraguard"
                  required
                />
              </div>
              <div>
                <label className="block text-white/50 text-xs font-label uppercase tracking-widest mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-white/20 focus:outline-none focus:border-primary-container transition-colors text-sm"
                    placeholder="••••••••"
                    required
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-xs font-label bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
              )}

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-br from-primary to-primary-container text-white py-4 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-3 disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><LogIn className="w-4 h-4" /> Authenticate</>
                )}
              </motion.button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-white/30 text-xs font-label uppercase tracking-widest text-center mb-3">Quick Demo Login</p>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map(acc => (
                  <button
                    key={acc.role}
                    onClick={() => quickLogin(acc.role)}
                    className="text-xs py-2 px-3 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-all font-label"
                    style={{ borderColor: username === acc.username ? acc.color : undefined, color: username === acc.username ? acc.color : undefined }}
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
