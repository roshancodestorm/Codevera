/**
 * lsp.js — Language Server Protocol bridge
 *
 * Spawns pylsp (Python) or gopls (Go) as child processes and proxies their
 * JSON-RPC stdio to a WebSocket endpoint:
 *
 *   ws://host/api/ide/lsp?lang=python   → spawns `pylsp`
 *   ws://host/api/ide/lsp?lang=go       → spawns `gopls -mode stdio`
 *
 * The frontend MonacoEditor connects as a WebSocket client and forwards
 * LSP messages directly — no JSON-RPC framing translation is needed because
 * both sides speak Content-Length framed JSON-RPC over the socket.
 *
 * Usage in server.js:
 *   import { setupLspWsProxy } from './lsp.js';
 *   setupLspWsProxy(httpServer);
 */

import { spawn } from 'child_process';
import { WebSocketServer } from 'ws';
import { URL } from 'url';

const LANG_CONFIG = {
  python: {
    cmd: 'pylsp',
    args: [],
    description: 'Python Language Server (pylsp)',
  },
  go: {
    cmd: 'gopls',
    args: ['-mode', 'stdio'],
    description: 'Go Language Server (gopls)',
  },
  typescript: {
    cmd: 'typescript-language-server',
    args: ['--stdio'],
    description: 'TypeScript/JavaScript Language Server',
  },
  rust: {
    cmd: 'rust-analyzer',
    args: [],
    description: 'Rust Analyzer',
  },
};

/** Content-Length framed JSON-RPC reader for LSP stdio */
function makeLspReader(onMessage) {
  let buf = Buffer.alloc(0);
  return (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    while (true) {
      const headerEnd = buf.indexOf('\r\n\r\n');
      if (headerEnd === -1) break;
      const header = buf.slice(0, headerEnd).toString('ascii');
      const lenMatch = header.match(/Content-Length:\s*(\d+)/i);
      if (!lenMatch) { buf = buf.slice(headerEnd + 4); continue; }
      const len = parseInt(lenMatch[1], 10);
      const bodyStart = headerEnd + 4;
      if (buf.length < bodyStart + len) break;
      const body = buf.slice(bodyStart, bodyStart + len).toString('utf8');
      buf = buf.slice(bodyStart + len);
      try { onMessage(JSON.parse(body)); } catch {}
    }
  };
}

/** Encode a JSON-RPC message with Content-Length framing for LSP stdin */
function encodeLsp(obj) {
  const body = JSON.stringify(obj);
  const header = `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n`;
  return header + body;
}

export function setupLspWsProxy(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    let pathname = '';
    try {
      pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
    } catch { return; }

    if (pathname !== '/api/ide/lsp') return;

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws, req) => {
    let lang = 'python';
    try {
      lang = new URL(req.url, `http://localhost`).searchParams.get('lang') || 'python';
    } catch {}

    const config = LANG_CONFIG[lang];
    if (!config) {
      ws.send(JSON.stringify({ jsonrpc: '2.0', method: '$/error', params: { message: `Unknown language: ${lang}` } }));
      ws.close(1008, 'Unknown language');
      return;
    }

    let proc;
    try {
      proc = spawn(config.cmd, config.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });
    } catch (err) {
      ws.send(JSON.stringify({ jsonrpc: '2.0', method: '$/error', params: { message: `Failed to start ${config.cmd}: ${err.message}` } }));
      ws.close(1011, 'LSP start failed');
      return;
    }

    console.log(`[lsp] started ${config.cmd} (pid ${proc.pid}) for ${lang}`);

    // Pipe LSP stdout → WebSocket (decode Content-Length frames → JSON → ws message)
    const reader = makeLspReader((msg) => {
      if (ws.readyState === ws.OPEN) {
        try { ws.send(JSON.stringify(msg)); } catch {}
      }
    });
    proc.stdout.on('data', reader);

    // Pipe LSP stderr to console for debugging
    proc.stderr.on('data', (d) => {
      const txt = d.toString().trim();
      if (txt) console.log(`[lsp:${lang}:stderr] ${txt.slice(0, 200)}`);
    });

    proc.on('exit', (code) => {
      console.log(`[lsp] ${config.cmd} exited (${code})`);
      if (ws.readyState === ws.OPEN) ws.close(1000, 'LSP server exited');
    });

    // Pipe WebSocket messages → LSP stdin (encode as Content-Length frames)
    ws.on('message', (data) => {
      let msg;
      try { msg = JSON.parse(data.toString()); } catch { return; }
      try { proc.stdin.write(encodeLsp(msg)); } catch {}
    });

    ws.on('close', () => {
      try { proc.kill('SIGTERM'); } catch {}
    });

    ws.on('error', () => {
      try { proc.kill('SIGTERM'); } catch {}
    });
  });

  console.log('[lsp] WebSocket proxy registered at /api/ide/lsp');
}

/** REST endpoint to check which LSP servers are available */
export async function lspAvailability() {
  const { execSync } = await import('child_process');
  const result = {};
  for (const [lang, cfg] of Object.entries(LANG_CONFIG)) {
    try {
      execSync(`${cfg.cmd} --version 2>&1`, { timeout: 3000 });
      result[lang] = { available: true, cmd: cfg.cmd };
    } catch {
      result[lang] = { available: false, cmd: cfg.cmd };
    }
  }
  return result;
}
