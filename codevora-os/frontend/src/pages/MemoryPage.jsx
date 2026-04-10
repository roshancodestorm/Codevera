import React, { useState, useEffect } from 'react';

export default function MemoryPage() {
  const [history, setHistory]  = useState([]);
  const [prefs, setPrefs]      = useState({});
  const [notes, setNotes]      = useState([]);
  const [newNote, setNewNote]  = useState('');
  const [prefKey, setPrefKey]  = useState('');
  const [prefVal, setPrefVal]  = useState('');

  const fetchAll = async () => {
    try {
      const [h, p, n] = await Promise.all([
        fetch('/api/memory/history?limit=20').then(r => r.json()),
        fetch('/api/memory/preferences').then(r => r.json()),
        fetch('/api/memory/notes').then(r => r.json()),
      ]);
      setHistory(h.history || []);
      setPrefs(p.preferences || {});
      setNotes(n.notes || []);
    } catch {}
  };

  useEffect(() => { fetchAll(); }, []);

  const clearHistory = async () => {
    if (!window.confirm('Clear all conversation history?')) return;
    await fetch('/api/memory/history', { method: 'DELETE' });
    setHistory([]);
  };

  const savePref = async () => {
    if (!prefKey || !prefVal) return;
    await fetch('/api/memory/preferences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: prefKey, value: prefVal }) });
    setPrefs(p => ({ ...p, [prefKey]: prefVal }));
    setPrefKey(''); setPrefVal('');
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    await fetch('/api/memory/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'user', content: newNote }) });
    setNotes(n => [...n, { content: newNote, time: Date.now() / 1000 }]);
    setNewNote('');
  };

  const fmt = (ts) => new Date(ts * 1000).toLocaleString();

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-hud)', fontSize: '20px', letterSpacing: '4px', color: 'var(--cyan)' }}>MEMORY SYSTEM</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Conversation history, user preferences, personal notes</p>
      </div>

      <div className="grid-3" style={{ gap: '16px' }}>
        {/* History */}
        <div className="card" style={{ gridColumn: '1 / 3' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p className="card-title" style={{ margin: 0 }}>Conversation History</p>
            <button className="btn btn-sm btn-danger" onClick={clearHistory}>🗑 CLEAR</button>
          </div>
          <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {history.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>No history yet.</p>}
            {history.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px', background: m.role === 'user' ? 'rgba(155,93,229,0.1)' : 'rgba(0,245,255,0.05)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontFamily: 'var(--font-hud)', fontSize: '10px', color: m.role === 'user' ? 'var(--violet)' : 'var(--cyan)', letterSpacing: '1px', minWidth: '40px' }}>
                  {m.role === 'user' ? 'YOU' : 'AI'}
                </span>
                <p style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.5, flex: 1 }}>{m.content}</p>
                <span style={{ fontSize: '10px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{m.time ? fmt(m.time) : ''}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Preferences */}
        <div className="card">
          <p className="card-title">Preferences</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
            {Object.entries(prefs).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--cyan)' }}>{k}</span>
                <span style={{ color: 'var(--text-dim)' }}>{v}</span>
              </div>
            ))}
          </div>
          <input className="chat-input" placeholder="Key" value={prefKey} onChange={e => setPrefKey(e.target.value)} style={{ marginBottom: '6px' }} />
          <input className="chat-input" placeholder="Value" value={prefVal} onChange={e => setPrefVal(e.target.value)} style={{ marginBottom: '8px' }} />
          <button className="btn btn-sm" onClick={savePref}>SAVE PREFERENCE</button>
        </div>

        {/* Notes */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <p className="card-title">Quick Notes</p>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <input className="chat-input" placeholder="Add a note..." value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNote()} />
            <button className="btn btn-sm" onClick={addNote}>ADD</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {notes.map((n, i) => (
              <div key={i} style={{ padding: '8px 14px', background: 'var(--bg-hover)', border: '1px solid var(--cyan-border)', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}>
                📌 {n.content}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
