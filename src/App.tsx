import { useState, useEffect, useCallback } from 'react';
import JarvisHome from './components/JarvisHome';
import JarvisChat from './components/JarvisChat';

function normalizePath(): string {
  const p = window.location.pathname.replace(/\/$/, '') || '/';
  return p === '' ? '/' : p;
}

function pathForView(v: 'landing' | 'dashboard'): string {
  if (v === 'dashboard') return '/dashboard';
  return '/';
}

function viewFromPath(): 'landing' | 'dashboard' {
  const p = normalizePath();
  if (p === '/login') return 'dashboard';
  if (p === '/dashboard') return 'dashboard';
  return 'landing';
}

export default function App() {
  const [view, setViewState] = useState<'landing' | 'dashboard'>(viewFromPath);
  const [userName, setUserName] = useState('');

  const setView = useCallback((next: 'landing' | 'dashboard') => {
    setViewState(next);
    const urlPath = pathForView(next);
    if (normalizePath() !== urlPath) {
      window.history.pushState({ view: next }, '', urlPath);
    }
  }, []);

  useEffect(() => {
    const onPopState = () => setViewState(viewFromPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleLogout = () => {
    setUserName('');
    setView('landing');
  };

  if (view === 'dashboard') {
    return <JarvisChat userName={userName || 'Agent'} onLogout={handleLogout} />;
  }

  return <JarvisHome onStart={() => setView('dashboard')} />;
}
