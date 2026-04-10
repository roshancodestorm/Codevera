import React, { useState } from 'react';

const APPS = [
  { id: 'chrome',     label: 'Chrome',      icon: '🌐', desc: 'Open browser' },
  { id: 'vscode',     label: 'VS Code',     icon: '💻', desc: 'Code editor' },
  { id: 'notepad',    label: 'Notepad',     icon: '📝', desc: 'Text editor' },
  { id: 'calculator', label: 'Calculator',  icon: '🔢', desc: 'Math tool' },
  { id: 'explorer',   label: 'Explorer',    icon: '📁', desc: 'File manager' },
  { id: 'terminal',   label: 'Terminal',    icon: '⬛', desc: 'Windows Terminal' },
  { id: 'paint',      label: 'Paint',       icon: '🎨', desc: 'Image editor' },
  { id: 'word',       label: 'Word',        icon: '📄', desc: 'Document editor' },
  { id: 'excel',      label: 'Excel',       icon: '📊', desc: 'Spreadsheets' },
];

const SYS_CMDS = [
  { action: 'lock',     label: '🔒 Lock PC',    danger: false },
  { action: 'sleep',    label: '💤 Sleep',       danger: false },
  { action: 'restart',  label: '🔄 Restart',     danger: true },
  { action: 'shutdown', label: '⏻ Shutdown',     danger: true },
];

export default function AppsPage() {
  const [status, setStatus] = useState('');

  const openApp = async (app) => {
    setStatus(`Opening ${app}...`);
    try {
      const r = await fetch('/api/system/open-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app })
      });
      const d = await r.json();
      setStatus(d.message || `Opened ${app}`);
    } catch { setStatus('⚠️ Backend offline'); }
    setTimeout(() => setStatus(''), 3000);
  };

  const runCmd = async (action) => {
    if (['shutdown', 'restart'].includes(action)) {
      if (!window.confirm(`Are you sure you want to ${action}?`)) return;
    }
    setStatus(`Executing ${action}...`);
    try {
      await fetch('/api/system/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      setStatus(`${action} executed.`);
    } catch { setStatus('⚠️ Backend offline'); }
    setTimeout(() => setStatus(''), 3000);
  };

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-hud)', fontSize: '20px', letterSpacing: '4px', color: 'var(--cyan)' }}>APP CONTROL</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Launch desktop applications and execute system commands</p>
        </div>
        {status && <span style={{ color: 'var(--green)', fontFamily: 'var(--font-hud)', fontSize: '11px', letterSpacing: '2px' }}>{status}</span>}
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <p className="card-title">Applications</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px' }}>
          {APPS.map(a => (
            <button key={a.id} id={`btn-app-${a.id}`} className="app-btn" onClick={() => openApp(a.id)}>
              <span className="app-btn-icon">{a.icon}</span>
              <span style={{ fontWeight: 600, fontSize: '12px' }}>{a.label}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{a.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <p className="card-title">System Commands</p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {SYS_CMDS.map(c => (
            <button
              key={c.action}
              id={`btn-sys-${c.action}`}
              className={`btn ${c.danger ? 'btn-danger' : ''}`}
              onClick={() => runCmd(c.action)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
