import { Router } from 'express';
import { initDb } from '../db.js';

const router = Router();

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// GET /api/messages — list the most recent submissions
router.get('/', (_req, res) => {
  try {
    const rows = initDb()
      .prepare('SELECT id, name, email, message, created_at FROM messages ORDER BY id DESC LIMIT 100')
      .all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages — create a submission
router.post('/', (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email and message are required' });
  }
  if (!EMAIL_RE.test(String(email))) {
    return res.status(400).json({ error: 'invalid email address' });
  }
  try {
    const info = initDb()
      .prepare('INSERT INTO messages (name, email, message) VALUES (?, ?, ?)')
      .run(String(name).slice(0, 120), String(email).slice(0, 160), String(message).slice(0, 2000));
    const row = initDb()
      .prepare('SELECT id, name, email, message, created_at FROM messages WHERE id = ?')
      .get(info.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
