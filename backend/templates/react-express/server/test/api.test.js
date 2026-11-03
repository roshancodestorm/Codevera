import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../index.js';

const server = createApp().listen(0);
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;
after(() => server.close());

test('GET /api/health returns ok', async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
});

test('POST then GET /api/messages round-trips', async () => {
  const created = await fetch(`${base}/api/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test', email: 'test@example.com', message: 'hello world' }),
  });
  assert.equal(created.status, 201);
  const saved = await created.json();
  assert.ok(saved.id);
  assert.equal(saved.name, 'Test');

  const list = await fetch(`${base}/api/messages`);
  assert.equal(list.status, 200);
  const rows = await list.json();
  assert.ok(Array.isArray(rows));
  assert.ok(rows.some((r) => r.id === saved.id));
});

test('POST /api/messages rejects invalid payloads', async () => {
  const res = await fetch(`${base}/api/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '', email: 'nope', message: '' }),
  });
  assert.equal(res.status, 400);
});
