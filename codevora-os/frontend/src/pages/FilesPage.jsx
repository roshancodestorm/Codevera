import React, { useState, useRef } from 'react';

export default function FilesPage() {
  const [dragging, setDragging]   = useState(false);
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [question, setQuestion]   = useState('');
  const [qaAnswer, setQaAnswer]   = useState('');
  const fileRef = useRef(null);

  const analyze = async (file) => {
    setLoading(true);
    setResult(null);
    setQaAnswer('');
    const form = new FormData();
    form.append('file', file);

    try {
      const r = await fetch('/api/files/analyze', { method: 'POST', body: form });
      const d = await r.json();
      setResult(d);
    } catch { setResult({ error: 'Backend offline — start the server.' }); }
    setLoading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) analyze(file);
  };

  const askAboutFile = async () => {
    if (!result || !question) return;
    const prompt = `Based on this file content:\n\n${typeof result.analysis === 'string' ? result.analysis.substring(0,1500) : JSON.stringify(result).substring(0,1500)}\n\nAnswer this: ${question}`;
    try {
      const r = await fetch('/api/chat/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: prompt, include_memory: false }) });
      const d = await r.json();
      setQaAnswer(d.reply);
    } catch { setQaAnswer('Backend offline.'); }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-hud)', fontSize: '20px', letterSpacing: '4px', color: 'var(--cyan)' }}>FILE ANALYSIS</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Upload PDF, CSV, TXT — AI reads and answers questions about it</p>
      </div>

      {/* Drop Zone */}
      <div
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{ marginBottom: '20px' }}
      >
        <input ref={fileRef} type="file" style={{ display: 'none' }} accept=".pdf,.csv,.txt,.md,.log" onChange={e => e.target.files[0] && analyze(e.target.files[0])} />
        <p style={{ fontSize: '32px', marginBottom: '12px' }}>📂</p>
        <p style={{ fontFamily: 'var(--font-hud)', color: 'var(--cyan)', letterSpacing: '2px', fontSize: '13px' }}>DROP FILE HERE</p>
        <p style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '6px' }}>PDF • CSV • TXT • MD • LOG</p>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '32px' }}>
          <p style={{ color: 'var(--cyan)', fontFamily: 'var(--font-hud)', letterSpacing: '3px', animation: 'pulse-ring 1s infinite' }}>ANALYZING FILE...</p>
          <div className="progress" style={{ marginTop: '16px' }}>
            <div className="progress-fill" style={{ width: '70%' }} />
          </div>
        </div>
      )}

      {result && !loading && (
        <div className="grid-2" style={{ gap: '16px' }}>
          {/* File Info */}
          <div className="card">
            <p className="card-title">File Info</p>
            <p style={{ color: 'var(--cyan)', fontWeight: 600 }}>{result.filename}</p>
            <p style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Type: {result.type} {result.pages ? `| Pages: ${result.pages}` : ''} {result.rows ? `| Rows: ${result.rows}` : ''}</p>
            {result.columns && <p style={{ color: 'var(--text-dim)', fontSize: '11px', marginTop: '8px' }}>Columns: {result.columns?.join(', ')}</p>}
            {result.error && <p style={{ color: 'var(--red)' }}>{result.error}</p>}
          </div>

          {/* Content Preview */}
          <div className="card">
            <p className="card-title">Content Preview</p>
            <pre style={{ color: 'var(--text-primary)', fontSize: '11px', overflowY: 'auto', maxHeight: '150px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {typeof result.analysis === 'string' ? result.analysis.substring(0, 600) : JSON.stringify(result.preview || {}, null, 2).substring(0, 600)}
            </pre>
          </div>

          {/* Ask About File */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <p className="card-title">Ask AI About This File</p>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <input
                className="chat-input"
                placeholder="e.g. 'Summarize this document' or 'What are the top 5 rows?'"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && askAboutFile()}
              />
              <button className="btn" onClick={askAboutFile}>ASK</button>
            </div>
            {qaAnswer && <p style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: 1.6, borderTop: '1px solid var(--cyan-border)', paddingTop: '12px' }}>🤖 {qaAnswer}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
