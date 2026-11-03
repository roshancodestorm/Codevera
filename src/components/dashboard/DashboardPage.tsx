import React, { useState, useEffect } from 'react';
import { 
  LogOut, 
  User, 
  ShieldCheck, 
  Mail, 
  Calendar, 
  Sparkles, 
  Code2, 
  Bot, 
  ExternalLink, 
  CheckCircle, 
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme, type ThemeMode } from '../../utils/theme';
import JarvisChat from '../JarvisChat';

const THEME_CYCLE: ThemeMode[] = ['system', 'light', 'dark'];

export const DashboardPage: React.FC = () => {
  const { user, session, signOut, userName, isVerified, isDemoMode, avatarUrl } = useAuth();
  const [theme, setTheme] = useTheme();
  const [activeTab, setActiveTab] = useState<'overview' | 'workspace'>('overview');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  const cycleTheme = () => {
    const idx = THEME_CYCLE.indexOf(theme);
    setTheme(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut();
    window.history.pushState({}, '', '/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const provider = user?.app_metadata?.provider || (user?.email ? 'email' : 'supabase');
  const createdDate = user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'Recently';

  if (activeTab === 'workspace') {
    return (
      <div className="relative min-h-screen">
        <JarvisChat 
          userName={userName}
          userAvatar={avatarUrl}
          onLogout={handleLogout} 
        />
        {/* Quick return button to Dashboard Overview */}
        <button
          onClick={() => setActiveTab('overview')}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-line bg-surface/90 backdrop-blur text-ink hover:bg-hover shadow-lg transition-all"
        >
          <User className="w-3.5 h-3.5" />
          Dashboard Overview
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between selection:bg-accent selection:text-accent-fg">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 h-16 border-b border-line bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 border border-line shadow-sm overflow-hidden">
              <img src="/favicon.svg" alt="Codevora AI" className="h-5 w-5 object-contain" />
            </div>
            <div>
              <span className="text-sm font-semibold tracking-tight text-ink block leading-none">Codevora AI</span>
              <span className="text-[10px] text-ink-subtle leading-tight">Dashboard &middot; Production</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('workspace')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-accent text-accent-fg text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Launch AI Workspace</span>
            </button>

            <button
              onClick={cycleTheme}
              aria-label={`Theme: ${theme}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted hover:text-ink hover:bg-hover transition-colors"
            >
              <ThemeIcon className="h-4 w-4" />
            </button>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line text-xs font-medium text-ink-muted hover:text-red-600 hover:border-red-500/30 hover:bg-red-500/5 transition-colors disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isLoggingOut ? 'Signing out...' : 'Sign out'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-line bg-surface/70 p-8 shadow-sm">
          <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-blue-500/10 via-purple-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Authenticated Session
                </span>
                {isDemoMode && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    🧪 Demo Mode (Mock Auth)
                  </span>
                )}
                {isVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    <ShieldCheck className="w-3 h-3" />
                    Verified User
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-ink">
                Welcome back, {userName}
              </h1>
              <p className="text-sm text-ink-muted max-w-xl">
                You have active access to the Codevora AI development environment, neural coders, and full cloud workspace.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('workspace')}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-accent text-accent-fg text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
              >
                <Code2 className="w-4 h-4" />
                <span>Open Codevora IDE</span>
              </button>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* User Profile Card */}
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
              <div className="flex items-center gap-2">
                {avatarUrl && !imageError ? (
                  <img
                    src={avatarUrl}
                    alt={userName}
                    referrerPolicy="no-referrer"
                    onError={() => setImageError(true)}
                    className="w-5 h-5 rounded-full object-cover border border-line shrink-0"
                  />
                ) : (
                  <User className="w-4 h-4 text-accent shrink-0" />
                )}
                <h2 className="text-sm font-semibold text-ink">User Profile</h2>
              </div>
              <span className="text-[11px] uppercase tracking-wider text-ink-subtle font-mono">
                {provider}
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-ink-subtle block">Full Name</span>
                <span className="font-semibold text-ink text-sm">{userName}</span>
              </div>
              <div>
                <span className="text-ink-subtle block">Email Address</span>
                <span className="font-mono text-ink text-sm flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-ink-muted" />
                  {user?.email || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-ink-subtle block">Member Since</span>
                <span className="text-ink flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-ink-muted" />
                  {createdDate}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Access Tools */}
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <h2 className="text-sm font-semibold text-ink">AI Capabilities</h2>
                </div>
                <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">Ready</span>
              </div>

              <ul className="space-y-2 text-xs text-ink-muted">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-accent" />
                  <span>Full Monaco Editor with Vim bindings</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-accent" />
                  <span>Multi-provider Neural Model Hub</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-accent" />
                  <span>Interactive Node Terminal (PTY)</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => setActiveTab('workspace')}
              className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-line hover:bg-hover text-xs font-semibold text-ink transition-colors"
            >
              <span>Launch Studio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-6 border-t border-line text-center text-xs text-ink-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
        <span>Codevora AI Authentication System MVP &middot; Supabase Auth</span>
        <span>&copy; 2026 Codevora AI Inc.</span>
      </footer>
    </div>
  );
};
