import React, { useState } from 'react';

const PRESETS = [
  {
    name: 'Daily News Fetch',
    steps: [
      { type: 'http_request', config: { method: 'GET', url: 'https://hacker-news.firebaseio.com/v0/topstories.json' } },
      { type: 'wait', config: { seconds: 1 } },
    ]
  },
  {
    name: 'System Health Check',
    steps: [
      { type: 'http_request', config: { method: 'GET', url: 'http://localhost:8000/health' } },
      { type: 'http_request', config: { method: 'GET', url: 'http://localhost:8000/api/system/stats' } },
    ]
  }
];

export default function AutomationPage() {
  const [name, setName]     = useState('My Workflow');
  const [steps, setSteps]   = useState([{ type: 'http_request', config: { method: 'GET', url: '' } }]);
  const [saved, setSaved]   = useState([]);
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);

  const addStep  = () => setSteps(s => [...s, { type: 'http_request', config: { method: 'GET', url: '' } }]);
  const removeStep = (i) => setSteps(s => s.filter((_, idx) => idx !== i));
  const updateStep = (i, key, val) => setSteps(s => s.map((step, idx) => idx === i ? { ...step, config: { ...step.config, [key]: val } } : step));

  const saveWorkflow = async () => {
    try {
      await fetch('/api/automation/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, steps })
      });
      setSaved(s => [...s.filter(x => x !== name), name]);
    } catch { alert('Backend offline'); }
  };

  const runWorkflow = async (wfName = name) => {
    setRunning(true); setResults(null);
    try {
      const r = await fetch(`/api/automation/workflow/${encodeURIComponent(wfName)}/run`, { method: 'POST' });
      const d = await r.json();
      setResults(d.results);
    } catch { setResults([{ error: 'Backend offline' }]); }
    setRunning(false);
  };

  const loadPreset = (p) => { setName(p.name); setSteps(p.steps); };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-hud)', fontSize: '20px', letterSpacing: '4px', color: 'var(--cyan)' }}>AUTOMATION</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Build and run multi-step workflows — API calls, delays, and more</p>
      </div>

      <div className="grid-2" style={{ gap: '20px' }}>
        {/* Builder */}
        <div className="card">
          <p className="card-title">Workflow Builder</p>

          {/* Presets */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {PRESETS.map(p => (
              <button key={p.name} className="btn btn-sm" onClick={() => loadPreset(p)}>⚡ {p.name}</button>
            ))}
          </div>

          <input
            className="chat-input"
            placeholder="Workflow name"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ marginBottom: '12px' }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            {steps.map((step, i) => (
              <div key={i} style={{ border: '1px solid var(--cyan-border)', borderRadius: 'var(--radius-sm)', padding: '12px', background: 'var(--bg-hover)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-hud)', fontSize: '10px', color: 'var(--cyan)', letterSpacing: '2px' }}>STEP {i + 1}</span>
                  <button className="btn btn-sm btn-danger" onClick={() => removeStep(i)}>✕</button>
                </div>
                <select
                  value={step.type}
                  onChange={e => setSteps(s => s.map((st, idx) => idx === i ? { ...st, type: e.target.value } : st))}
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--cyan-border)', color: 'var(--cyan)', borderRadius: 'var(--radius-sm)', padding: '4px 8px', marginBottom: '8px', width: '100%' }}
                >
                  <option value="http_request">HTTP Request</option>
                  <option value="wait">Wait</option>
                </select>
                {step.type === 'http_request' && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select value={step.config.method} onChange={e => updateStep(i, 'method', e.target.value)}
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--cyan-border)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', padding: '6px', width: '80px' }}>
                      {['GET', 'POST', 'PUT', 'DELETE'].map(m => <option key={m}>{m}</option>)}
                    </select>
                    <input className="chat-input" placeholder="https://..." value={step.config.url} onChange={e => updateStep(i, 'url', e.target.value)} />
                  </div>
                )}
                {step.type === 'wait' && (
                  <input className="chat-input" type="number" placeholder="Seconds" value={step.config.seconds || 1} onChange={e => updateStep(i, 'seconds', parseInt(e.target.value))} />
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-sm" onClick={addStep}>+ ADD STEP</button>
            <button className="btn btn-sm" onClick={saveWorkflow}>💾 SAVE</button>
            <button className="btn" onClick={() => runWorkflow(name)} disabled={running}>
              {running ? '⚡ RUNNING...' : '▶ RUN'}
            </button>
          </div>
        </div>

        {/* Results & Saved */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {saved.length > 0 && (
            <div className="card">
              <p className="card-title">Saved Workflows</p>
              {saved.map(s => (
                <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--cyan-border)' }}>
                  <span style={{ fontSize: '13px' }}>⚡ {s}</span>
                  <button className="btn btn-sm" onClick={() => runWorkflow(s)}>RUN</button>
                </div>
              ))}
            </div>
          )}

          {results && (
            <div className="card">
              <p className="card-title">Execution Results</p>
              {results.map((r, i) => (
                <div key={i} style={{ padding: '8px', background: r.error ? 'rgba(255,77,109,0.1)' : 'rgba(0,245,255,0.05)', borderRadius: 'var(--radius-sm)', marginBottom: '8px' }}>
                  <p style={{ fontFamily: 'var(--font-hud)', fontSize: '10px', color: r.error ? 'var(--red)' : 'var(--green)', letterSpacing: '1px' }}>
                    STEP {i + 1} — {r.error ? 'ERROR' : 'OK'}
                  </p>
                  <pre style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', overflowX: 'auto' }}>
                    {JSON.stringify(r, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
