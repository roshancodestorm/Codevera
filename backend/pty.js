/**
 * pty.js — Interactive PTY terminal over WebSocket
 *
 * Spawns a real pseudoterminal (node-pty) per connection so the browser gets
 * a full interactive shell: stdin, arrow keys, vim, less, python REPL, etc.
 *
 * Protocol (binary-safe text frames):
 *   Client → Server:
 *     { type: 'input',  data: '<text>' }      key / paste input
 *     { type: 'resize', cols: N, rows: N }    terminal resize
 *     { type: 'kill' }                        SIGKILL the pty
 *
 *   Server → Client:
 *     { type: 'output', data: '<text>' }      raw pty output (ANSI included)
 *     { type: 'exit',   code: N }             process exited
 *     { type: 'error',  message: '<text>' }   spawn / runtime error
 *
 * WebSocket endpoint: ws://host/api/ide/pty?workspace=<name>&cols=220&rows=50
 *
 * Usage:
 *   import { setupPtyWs } from './pty.js';
 *   setupPtyWs(httpServer);
 */

import pty from 'node-pty';
import { WebSocketServer } from 'ws';
import { URL } from 'url';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Max number of live PTY sessions (prevent runaway spawns)
const MAX_SESSIONS = 20;
let activeSessions = 0;

/** Default shell per platform */
function defaultShell() {
  if (process.platform === 'win32') {
    // Prefer PowerShell 7, then PowerShell 5, then cmd
    for (const candidate of ['pwsh.exe', 'powershell.exe', 'cmd.exe']) {
      try {
        const which = require('child_process').spawnSync('where', [candidate], { windowsHide: true });
        if (which.status === 0 && which.stdout?.toString().trim()) return candidate;
      } catch {}
    }
    return 'cmd.exe';
  }
  return process.env.SHELL || '/bin/bash';
}

export function setupPtyWs(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    let parsedUrl;
    try {
      parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    } catch {
      socket.destroy();
      return;
    }
    if (parsedUrl.pathname !== '/api/ide/pty') return;

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws, req) => {
    let parsedUrl;
    try {
      parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    } catch {
      ws.close(1008, 'bad url');
      return;
    }

    const workspace = parsedUrl.searchParams.get('workspace') || '';
    const cols = Math.max(20, Math.min(512, parseInt(parsedUrl.searchParams.get('cols') || '220', 10)));
    const rows = Math.max(5,  Math.min(200, parseInt(parsedUrl.searchParams.get('rows') || '50',  10)));

    // Resolve working directory for the workspace
    let cwd = os.homedir();
    if (workspace) {
      // Walk up from __dirname to find the workspaces root the same way ide.js does
      const backendDir = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
      const projectRoot = path.resolve(backendDir, '..');
      const wsRoot = path.join(projectRoot, 'workspaces', workspace.replace(/[^a-zA-Z0-9._-]/g, '-'));
      if (fs.existsSync(wsRoot)) cwd = wsRoot;

      // Also honour local-workspaces.json
      try {
        const lwFile = path.join(backendDir, 'local-workspaces.json');
        if (fs.existsSync(lwFile)) {
          const lw = JSON.parse(fs.readFileSync(lwFile, 'utf8'));
          const lp = lw[workspace];
          if (lp && path.isAbsolute(lp) && fs.existsSync(lp)) cwd = lp;
        }
      } catch {}
    }

    if (activeSessions >= MAX_SESSIONS) {
      ws.send(JSON.stringify({ type: 'error', message: `Max ${MAX_SESSIONS} PTY sessions reached` }));
      ws.close(1013, 'too many sessions');
      return;
    }

    const shell = defaultShell();
    let ptyProc;

    try {
      ptyProc = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols,
        rows,
        cwd,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          // Ensure tools don't think they're running headlessly
          LINES: String(rows),
          COLUMNS: String(cols),
        },
      });
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: `PTY spawn failed: ${err.message}` }));
      ws.close(1011, 'spawn error');
      return;
    }

    activeSessions++;

    // ── PTY → WebSocket ───────────────────────────────────────────────────────
    ptyProc.onData((data) => {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'output', data }));
        } catch {}
      }
    });

    ptyProc.onExit(({ exitCode }) => {
      activeSessions = Math.max(0, activeSessions - 1);
      try {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'exit', code: exitCode }));
          ws.close(1000, 'process exited');
        }
      } catch {}
    });

    // ── WebSocket → PTY ───────────────────────────────────────────────────────
    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(typeof raw === 'string' ? raw : raw.toString());
      } catch { return; }

      if (msg.type === 'input' && typeof msg.data === 'string') {
        try { ptyProc.write(msg.data); } catch {}
      } else if (msg.type === 'resize') {
        const c = Math.max(20, Math.min(512, parseInt(msg.cols, 10) || cols));
        const r = Math.max(5,  Math.min(200, parseInt(msg.rows, 10) || rows));
        try { ptyProc.resize(c, r); } catch {}
      } else if (msg.type === 'kill') {
        try { ptyProc.kill(); } catch {}
      }
    });

    ws.on('close', () => {
      try { ptyProc.kill(); } catch {}
    });

    ws.on('error', () => {
      try { ptyProc.kill(); } catch {}
    });
  });

  console.log('[pty] Interactive PTY WebSocket server ready at ws://.../api/ide/pty');
}
