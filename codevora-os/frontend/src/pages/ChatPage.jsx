import React, { useState, useRef, useEffect } from 'react';

export default function ChatPage() {
  const [messages, setMessages]   = useState([
    { role: 'ai', text: 'CODEVORA-OS AI Brain online. How can I assist you today?' }
  ]);
  const [input, setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [model, setModel]   = useState('gpt-4o');
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const r = await fetch('/api/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, model, include_memory: true })
      });
      const d = await r.json();
      setMessages(prev => [...prev, { role: 'ai', text: d.reply || d.detail }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: '⚠️ Backend offline. Please start the server.' }]);
    }
    setLoading(false);
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <div style={{ height: 'calc(100vh - 104px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-hud)', fontSize: '20px', letterSpacing: '4px', color: 'var(--cyan)' }}>AI BRAIN</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Multi-model conversation with persistent memory</p>
        </div>
        <select
          value={model}
          onChange={e => setModel(e.target.value)}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--cyan-border)', color: 'var(--cyan)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', fontFamily: 'var(--font-hud)', fontSize: '11px', cursor: 'pointer' }}
        >
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4-turbo">GPT-4 Turbo</option>
          <option value="gpt-3.5-turbo">GPT-3.5</option>
        </select>
      </div>

      {/* Messages */}
      <div className="card chat-wrap" style={{ flex: 1, overflow: 'hidden' }}>
        <div className="chat-history">
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble ${m.role === 'user' ? 'bubble-user' : 'bubble-ai'}`}>
              {m.text}
            </div>
          ))}
          {loading && (
            <div className="chat-bubble bubble-ai" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ animation: 'pulse-ring 1s infinite' }}>●</span>
              <span style={{ animation: 'pulse-ring 1s 0.2s infinite' }}>●</span>
              <span style={{ animation: 'pulse-ring 1s 0.4s infinite' }}>●</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-row">
          <input
            id="chat-input"
            className="chat-input"
            placeholder="Ask anything — CODEVORA AI is listening..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading}
          />
          <button className="btn" onClick={send} disabled={loading}>SEND</button>
          <button className="btn btn-danger btn-sm" onClick={() => setMessages([{ role: 'ai', text: 'Memory cleared. Starting fresh.' }])}>CLR</button>
        </div>
      </div>
    </div>
  );
}
