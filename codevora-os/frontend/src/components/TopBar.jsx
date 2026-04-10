import React, { useEffect, useState } from 'react';
import { Settings, LogOut, Crown, User, Globe } from 'lucide-react';

export default function TopBar({ onLogout, onOpenSettings, user }) {
  const [time, setTime] = useState(new Date());
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch('/api/../health', { signal: AbortSignal.timeout(2000) });
        setBackendOnline(r.ok);
      } catch { setBackendOnline(false); }
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  const fmt = (d) => d.toLocaleTimeString('en-US', { hour12: false });

  return (
    <div className="topbar">
      <div className="topbar-brand">
        CODEVORA<span>-OS</span>
        <span style={{ fontSize: '10px', letterSpacing: '3px', color: 'var(--text-dim)', marginLeft: '12px', fontWeight: 400 }}>
          v2.0
        </span>
      </div>

      <div className="hidden md:flex items-center gap-8">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
          <span className={`status-dot ${backendOnline ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`}></span>
          <span style={{ color: backendOnline ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-hud)', fontSize: '9px', letterSpacing: '2px' }}>
            {backendOnline ? 'BACKEND ONLINE' : 'SYSTEM OFFLINE'}
          </span>
        </div>
        
        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
          <Globe size={12} className="text-cyan-400" />
          <span className="text-[10px] font-bold tracking-widest text-slate-400">EN-US</span>
        </div>
      </div>

      <div className="topbar-right">
        <button className="flex items-center gap-2 px-4 py-1.5 bg-cyan-500 text-black rounded-full font-black text-[10px] tracking-widest shadow-[0_0_15px_rgba(0,245,255,0.3)] hover:scale-105 transition-all">
          <Crown size={12} />
          UPGRADE
        </button>

        <div className="h-6 w-px bg-white/10 mx-2" />

        <div className="flex items-center gap-3 bg-white/5 px-4 py-1 rounded-full border border-white/5">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center">
            <User size={14} className="text-white" />
          </div>
          <span className="text-xs font-bold text-white tracking-widest">{user?.name?.toUpperCase() || 'AGENT'}</span>
        </div>

        <button onClick={onOpenSettings} className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all" title="Settings">
          <Settings size={18} />
        </button>

        <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Logout">
          <LogOut size={18} />
        </button>
        
        <div className="ml-4 flex flex-col items-end">
           <span className="topbar-time text-white">{fmt(time)}</span>
           <span className="text-[8px] text-slate-500 tracking-[0.2em]">LATENCY: 12MS</span>
        </div>
      </div>
    </div>
  );
}
