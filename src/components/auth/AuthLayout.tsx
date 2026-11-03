import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, KeyRound, Check, AlertCircle, Sun, Moon, Monitor, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme, type ThemeMode } from '../../utils/theme';
import { saveRuntimeSupabaseConfig, SUPABASE_URL } from '../../lib/supabase';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const THEME_CYCLE: ThemeMode[] = ['system', 'light', 'dark'];

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => {
  const { isConfigured } = useAuth();
  const [theme, setTheme] = useTheme();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [configSaved, setConfigSaved] = useState(false);

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  const cycleTheme = () => {
    const idx = THEME_CYCLE.indexOf(theme);
    setTheme(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl || !customKey) return;
    saveRuntimeSupabaseConfig(customUrl, customKey);
    setConfigSaved(true);
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between selection:bg-accent selection:text-accent-fg relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] rounded-full bg-purple-600/5 blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState({}, '', '/');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className="flex items-center gap-2.5 group"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 border border-line shadow-sm transition-transform group-hover:scale-105 overflow-hidden">
            <img src="/favicon.svg" alt="Codevora AI" className="h-5 w-5 object-contain" />
          </div>
          <span className="text-base font-semibold tracking-tight">Codevora AI</span>
        </a>

        <div className="flex items-center gap-2">
          {!isConfigured && (
            <button
              onClick={() => setShowConfigModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Configure Supabase
            </button>
          )}

          <button
            onClick={cycleTheme}
            aria-label={`Theme: ${theme}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted hover:text-ink hover:bg-hover transition-colors"
          >
            <ThemeIcon className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content Card Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Card */}
          <div className="rounded-2xl border border-line bg-surface/90 backdrop-blur-xl p-8 shadow-xl shadow-black/5">
            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
              <p className="mt-2 text-sm text-ink-muted leading-relaxed">{subtitle}</p>
            </div>

            {/* Demo mode info banner */}
            {!isConfigured && (
              <div className="mb-6 p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-xs text-indigo-700 dark:text-indigo-300 flex items-start gap-2.5">
                <span className="text-base leading-none">🧪</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">Interactive Demo Mode Active</p>
                    <button
                      type="button"
                      onClick={() => setShowConfigModal(true)}
                      className="font-medium underline hover:no-underline text-[11px]"
                    >
                      Connect Live Supabase
                    </button>
                  </div>
                  <p className="mt-1 text-indigo-600/90 dark:text-indigo-300/80 leading-relaxed">
                    You can test all 7 PRD flows right now! Default account:{' '}
                    <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded font-mono font-semibold">demo@codevora.ai</code> / <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded font-mono font-semibold">Password123!</code> or create a new one on Signup.
                  </p>
                </div>
              </div>
            )}

            {/* Child Form */}
            {children}
          </div>

          {/* Quick Back to Landing */}
          <div className="text-center mt-6">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="inline-flex items-center gap-1.5 text-xs text-ink-subtle hover:text-ink transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Codevora AI Home
            </a>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-6 text-center text-xs text-ink-subtle z-10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-green-500" />
          <span>Encrypted with Supabase Auth &amp; SSL</span>
        </div>
        <span>&copy; 2026 Codevora AI Inc. All rights reserved.</span>
      </footer>

      {/* Supabase Runtime Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-accent" />
                <h3 className="font-semibold text-ink text-base">Supabase Project Settings</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-ink-muted hover:text-ink text-sm p-1"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-xs text-ink-muted leading-relaxed">
              Connect your existing Supabase project. You can find these in your Supabase Dashboard under <strong>Project Settings &gt; API</strong>.
            </p>

            <form onSubmit={handleSaveConfig} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Project URL (VITE_SUPABASE_URL)
                </label>
                <input
                  type="url"
                  placeholder="https://xyzcompany.supabase.co"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-line bg-canvas text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  Anon / Public Key (VITE_SUPABASE_ANON_KEY)
                </label>
                <textarea
                  rows={3}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-line bg-canvas text-sm font-mono text-ink placeholder:text-ink-subtle focus:outline-none focus:border-accent"
                  required
                />
                <p className="text-[11px] text-ink-subtle mt-1">
                  Only use your <span className="font-semibold">anon / public</span> key. Never paste the service_role secret key in the browser.
                </p>
              </div>

              {configSaved && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Configuration saved! Reloading application...
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl border border-line text-xs font-medium text-ink hover:bg-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-accent text-accent-fg text-xs font-medium hover:opacity-90"
                >
                  Save &amp; Connect
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
