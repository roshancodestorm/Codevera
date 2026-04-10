import React, { useState, useRef } from 'react';

export default function VoicePage() {
  const [listening, setListening]   = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse]     = useState('');
  const [status, setStatus]         = useState('Ready — click the orb or press Space');
  const [history, setHistory]       = useState([]);
  const mediaRef  = useRef(null);
  const recRef    = useRef(null);

  const startListening = async () => {
    if (listening) return;
    setListening(true);
    setStatus('🎧 Listening...');
    setTranscript('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRef.current = stream;
      const rec = new MediaRecorder(stream);
      recRef.current = rec;
      const chunks = [];

      rec.ondataavailable = e => chunks.push(e.data);
      rec.onstop = async () => {
        setStatus('🔍 Processing speech...');
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const form = new FormData();
        form.append('audio', blob, 'voice.webm');

        try {
          const sttRes = await fetch('/api/voice/stt', { method: 'POST', body: form });
          const sttData = await sttRes.json();
          const text = sttData.transcript || '';
          setTranscript(text || '[Could not understand]');

          if (text) {
            setStatus('🧠 Thinking...');
            const chatRes = await fetch('/api/chat/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: text, include_memory: true })
            });
            const chatData = await chatRes.json();
            const reply = chatData.reply || 'No response from brain.';
            setResponse(reply);
            setHistory(h => [...h, { q: text, a: reply }]);

            // TTS playback
            setStatus('🔊 Speaking...');
            const ttsRes = await fetch('/api/voice/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: reply })
            });
            const audioBlob = await ttsRes.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.onended = () => setStatus('Ready — click the orb or press Space');
            audio.play();
          } else {
            setStatus('Ready — click the orb or press Space');
          }
        } catch {
          setStatus('⚠️ Backend offline'); setResponse('Start the backend server first.');
        }
        setListening(false);
      };

      rec.start();
      setTimeout(() => { if (rec.state === 'recording') rec.stop(); }, 6000); // Auto-stop after 6s
    } catch (e) {
      setStatus('❌ Microphone access denied');
      setListening(false);
    }
  };

  const stopListening = () => {
    if (recRef.current && recRef.current.state === 'recording') {
      recRef.current.stop();
      mediaRef.current?.getTracks().forEach(t => t.stop());
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-hud)', fontSize: '20px', letterSpacing: '4px', color: 'var(--cyan)' }}>VOICE ENGINE</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Speak to CODEVORA — STT → AI → TTS pipeline</p>
      </div>

      <div className="grid-2" style={{ gap: '24px' }}>
        {/* Orb Panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 20px' }}>
          <div
            id="voice-orb"
            className={`voice-ring ${listening ? 'listening' : ''}`}
            onClick={listening ? stopListening : startListening}
            style={{ cursor: 'pointer' }}
          >
            <div className="voice-ring-inner">
              {listening ? '⏹️' : '🎙️'}
            </div>
          </div>

          <p style={{ fontFamily: 'var(--font-hud)', fontSize: '11px', letterSpacing: '2px', color: listening ? 'var(--cyan)' : 'var(--text-dim)', textAlign: 'center', marginBottom: '24px' }}>
            {status}
          </p>

          <div style={{ width: '100%' }}>
            <p className="card-title">You Said</p>
            <p style={{ fontSize: '14px', minHeight: '40px', fontStyle: transcript ? 'normal' : 'italic', color: transcript ? 'var(--text-primary)' : 'var(--text-dim)' }}>
              {transcript || 'Waiting for speech...'}
            </p>
          </div>

          <div style={{ width: '100%', marginTop: '16px', borderTop: '1px solid var(--cyan-border)', paddingTop: '16px' }}>
            <p className="card-title">AI Response</p>
            <p style={{ color: 'var(--cyan)', fontSize: '14px', minHeight: '40px' }}>
              {response || 'Response will appear here...'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button className="btn" onClick={startListening} disabled={listening}>▶ START</button>
            <button className="btn btn-danger" onClick={stopListening} disabled={!listening}>⏹ STOP</button>
          </div>
        </div>

        {/* History */}
        <div className="card">
          <p className="card-title">Voice History</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
            {history.length === 0 && (
              <p style={{ color: 'var(--text-dim)', fontSize: '13px', fontStyle: 'italic' }}>No voice interactions yet.</p>
            )}
            {history.map((h, i) => (
              <div key={i} style={{ borderLeft: '2px solid var(--cyan-border)', paddingLeft: '12px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px' }}>🗣️ {h.q}</p>
                <p style={{ fontSize: '13px', color: 'var(--text-primary)' }}>🤖 {h.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
