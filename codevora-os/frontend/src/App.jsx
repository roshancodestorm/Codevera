import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import ChatPage from './pages/ChatPage';
import VoicePage from './pages/VoicePage';
import AppsPage from './pages/AppsPage';
import FilesPage from './pages/FilesPage';
import AutomationPage from './pages/AutomationPage';
import MemoryPage from './pages/MemoryPage';
import AIBabyApp from './pages/AIBabyApp';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import PricingPage from './pages/PricingPage';
import SettingsPanel from './components/SettingsPanel';

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('landing'); // 'landing' | 'login' | 'pricing' | 'app'
  const [activePage, setActivePage] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setView('app');
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setView('landing');
  };

  const pages = {
    dashboard:  <Dashboard />,
    chat:       <ChatPage />,
    voice:      <VoicePage />,
    apps:       <AppsPage />,
    files:      <FilesPage />,
    automation: <AutomationPage />,
    memory:     <MemoryPage />,
    aibaby:     <AIBabyApp />
  };

  // ── Render Logic ───────────────────────────────────────────────
  
  if (view === 'landing') {
    return <LandingPage onLogin={() => setView('login')} onStart={() => setView('pricing')} />;
  }

  if (view === 'login') {
    return <LoginPage onBack={() => setView('landing')} onLoginSuccess={handleLoginSuccess} />;
  }

  if (view === 'pricing') {
    return <PricingPage onBack={() => setView('landing')} />;
  }

  return (
    <div className="os-shell">
      <TopBar onLogout={handleLogout} onOpenSettings={() => setShowSettings(true)} user={user} />
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <main className="main-content" key={activePage}>
        {pages[activePage]}
      </main>
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
