/**
 * collab.js — Yjs WebSocket collaboration server
 *
 * Each workspace gets its own Y.Doc. Clients connect via:
 *   ws://host/api/ide/collab?workspace=<name>&user=<name>&color=<hex>
 *
 * The server relays Yjs sync and awareness messages between all clients
 * connected to the same workspace. On disconnect the doc is retained in
 * memory so rejoining clients get the current state immediately.
 */
import crypto from 'crypto';
import * as Y from 'yjs';
import { WebSocketServer } from 'ws';
import { createDecoder, readVarUint, readVarUint8Array } from 'lib0/decoding';
import { createEncoder, writeVarUint, writeVarUint8Array, toUint8Array } from 'lib0/encoding';

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const MESSAGE_SYNC_STEP1 = 0;
const MESSAGE_SYNC_STEP2 = 1;
const MESSAGE_SYNC_UPDATE = 2;

// workspace name -> { doc: Y.Doc, clients: Set<WebSocket>, awareness: Map<clientId, state> }
const rooms = new Map();

function getRoom(workspace) {
  if (!rooms.has(workspace)) {
    rooms.set(workspace, { doc: new Y.Doc(), clients: new Set(), awareness: new Map(), clock: 0 });
  }
  return rooms.get(workspace);
}

function encodeMessage(messageType, ...parts) {
  const encoder = createEncoder();
  writeVarUint(encoder, messageType);
  for (const part of parts) writeVarUint8Array(encoder, part);
  return toUint8Array(encoder);
}

function broadcastExcept(room, sender, message) {
  for (const client of room.clients) {
    if (client !== sender && client.readyState === 1 /* OPEN */) {
      try { client.send(message); } catch {}
    }
  }
}

function broadcastAll(room, message) {
  for (const client of room.clients) {
    if (client.readyState === 1) {
      try { client.send(message); } catch {}
    }
  }
}

function handleSyncMessage(room, sender, decoder) {
  const syncType = readVarUint(decoder);
  if (syncType === MESSAGE_SYNC_STEP1) {
    // Client sends its state vector; we reply with our update
    const sv = readVarUint8Array(decoder);
    const update = Y.encodeStateAsUpdate(room.doc, sv);
    const encoder = createEncoder();
    writeVarUint(encoder, MESSAGE_SYNC);
    writeVarUint(encoder, MESSAGE_SYNC_STEP2);
    writeVarUint8Array(encoder, update);
    try { sender.send(toUint8Array(encoder)); } catch {}

    // Also ask client for its update
    const ourSv = Y.encodeStateVector(room.doc);
    const encoder2 = createEncoder();
    writeVarUint(encoder2, MESSAGE_SYNC);
    writeVarUint(encoder2, MESSAGE_SYNC_STEP1);
    writeVarUint8Array(encoder2, ourSv);
    try { sender.send(toUint8Array(encoder2)); } catch {}
  } else if (syncType === MESSAGE_SYNC_STEP2 || syncType === MESSAGE_SYNC_UPDATE) {
    const update = readVarUint8Array(decoder);
    Y.applyUpdate(room.doc, update);
    // Relay update to other clients
    const encoder = createEncoder();
    writeVarUint(encoder, MESSAGE_SYNC);
    writeVarUint(encoder, MESSAGE_SYNC_UPDATE);
    writeVarUint8Array(encoder, update);
    broadcastExcept(room, sender, toUint8Array(encoder));
  }
}

function handleAwarenessMessage(room, sender, decoder) {
  const data = readVarUint8Array(decoder);
  // Relay awareness to all clients including sender (so they know about each other)
  const encoder = createEncoder();
  writeVarUint(encoder, MESSAGE_AWARENESS);
  writeVarUint8Array(encoder, data);
  broadcastAll(room, toUint8Array(encoder));
}

export function setupCollabServer(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (!url.pathname.startsWith('/api/ide/collab')) return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const workspace = url.searchParams.get('workspace') || 'default';
    const room = getRoom(workspace);
    room.clients.add(ws);

    // Send current doc state to new client
    const sv = new Uint8Array(0); // request full state
    const update = Y.encodeStateAsUpdate(room.doc, sv);
    const encoder = createEncoder();
    writeVarUint(encoder, MESSAGE_SYNC);
    writeVarUint(encoder, MESSAGE_SYNC_STEP2);
    writeVarUint8Array(encoder, update);
    try { ws.send(toUint8Array(encoder)); } catch {}

    ws.on('message', (rawMsg) => {
      try {
        const msg = rawMsg instanceof Buffer ? rawMsg : Buffer.from(rawMsg);
        const decoder = createDecoder(new Uint8Array(msg));
        const messageType = readVarUint(decoder);
        if (messageType === MESSAGE_SYNC) handleSyncMessage(room, ws, decoder);
        else if (messageType === MESSAGE_AWARENESS) handleAwarenessMessage(room, ws, decoder);
      } catch {}
    });

    ws.on('close', () => {
      room.clients.delete(ws);
      // Remove stale awareness entries — broadcast empty update
      if (room.clients.size === 0) {
        // Keep doc in memory; GC the awareness map
        room.awareness.clear();
      }
    });

    ws.on('error', () => { room.clients.delete(ws); });
  });
}

// invite tokens: token -> { workspace, readOnly, createdAt }
const inviteTokens = new Map();

export function registerCollabRoutes(router) {
  // POST /collab/invite — generate invite token
  router.post('/collab/invite', (req, res) => {
    const { workspace, readOnly = false } = req.body || {};
    if (!workspace) return res.status(400).json({ error: 'workspace required' });
    const token = crypto.randomBytes(16).toString('hex');
    inviteTokens.set(token, { workspace, readOnly: !!readOnly, createdAt: Date.now() });
    // Clean expired (>24h)
    for (const [t, v] of inviteTokens) {
      if (Date.now() - v.createdAt > 86400000) inviteTokens.delete(t);
    }
    res.json({ token, url: `/join?token=${token}`, workspace, readOnly });
  });

  // GET /collab/invite/:token — validate token
  router.get('/collab/invite/:token', (req, res) => {
    const entry = inviteTokens.get(req.params.token);
    if (!entry) return res.status(404).json({ error: 'Invalid or expired invite link' });
    if (Date.now() - entry.createdAt > 86400000) {
      inviteTokens.delete(req.params.token);
      return res.status(410).json({ error: 'Invite link expired' });
    }
    res.json({ workspace: entry.workspace, readOnly: entry.readOnly });
  });

  // GET /collab/peers?workspace=X — list connected peers
  router.get('/collab/peers', (req, res) => {
    const { workspace } = req.query;
    const room = workspace ? rooms.get(workspace) : null;
    res.json({ count: room ? room.clients.size : 0 });
  });
}
