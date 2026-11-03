import { useEffect, useState } from 'react';
import { api } from './api.js';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [online, setOnline] = useState(null);

  const load = async () => {
    try {
      const rows = await api.listMessages();
      setMessages(rows);
    } catch {
      setMessages([]);
    }
  };

  useEffect(() => {
    api.health().then(() => setOnline(true)).catch(() => setOnline(false));
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('Sending…');
    try {
      await api.createMessage(form);
      setForm({ name: '', email: '', message: '' });
      setStatus('Message sent');
      await load();
    } catch (err) {
      setError(err.message);
      setStatus('');
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="container">
          <h1>Full-Stack App</h1>
          <span className={`badge ${online ? 'badge-ok' : 'badge-down'}`}>
            API {online === null ? 'checking…' : online ? 'online' : 'offline'}
          </span>
        </div>
      </header>

      <main className="container grid">
        <section className="card" aria-labelledby="contact-title">
          <h2 id="contact-title">Contact</h2>
          <form onSubmit={submit} noValidate>
            <label htmlFor="name">Name</label>
            <input id="name" value={form.name} required
              onChange={(e) => setForm({ ...form, name: e.target.value })} />

            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={form.email} required
              onChange={(e) => setForm({ ...form, email: e.target.value })} />

            <label htmlFor="message">Message</label>
            <textarea id="message" value={form.message} required
              onChange={(e) => setForm({ ...form, message: e.target.value })} />

            <button type="submit">Send message</button>
            {status && <p className="status" role="status">{status}</p>}
            {error && <p className="error" role="alert">{error}</p>}
          </form>
        </section>

        <section className="card" aria-labelledby="messages-title">
          <h2 id="messages-title">Messages</h2>
          {messages.length === 0 ? (
            <p className="muted">No messages yet.</p>
          ) : (
            <ul className="messages">
              {messages.map((m) => (
                <li key={m.id}>
                  <strong>{m.name}</strong> <span className="muted">&lt;{m.email}&gt;</span>
                  <p>{m.message}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
