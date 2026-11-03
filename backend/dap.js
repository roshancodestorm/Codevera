/**
 * dap.js — debug bridge for Node.js (CDP) + Python (debugpy DAP)
 *
 * Node.js:   --inspect + Chrome DevTools Protocol (CDP) via WebSocket
 * Python:    debugpy spawned with --listen, DAP JSON-RPC over TCP socket
 *
 *   POST /api/ide/debug/start        → spawn target, return debugId
 *   POST /api/ide/debug/stop         → kill target
 *   POST /api/ide/debug/breakpoint   → set / clear a breakpoint
 *   POST /api/ide/debug/continue     → resume execution
 *   POST /api/ide/debug/step         → step-over (next)
 *   POST /api/ide/debug/step-in      → step-into
 *   POST /api/ide/debug/step-out     → step-out
 *   GET  /api/ide/debug/stack        → call-stack frames
 *   GET  /api/ide/debug/variables    → variables for current scope
 *   GET  /api/ide/debug/status       → running/paused + current location
 *   GET  /api/ide/debug/sessions     → list active sessions
 *
 * Only one active session per workspace is allowed.
 */

import { spawn } from 'child_process';
import net from 'net';
import crypto from 'crypto';

// CDP WebSocket client — uses the built-in 'ws' package already installed for collab
import { WebSocket } from 'ws';

const sessions = new Map(); // debugId → DebugSession | PythonDebugSession

// ─────────────────────────────────────────────────────────────────────────────
// Python debug session via debugpy DAP over TCP
// debugpy protocol: https://microsoft.github.io/debug-adapter-protocol/
// ─────────────────────────────────────────────────────────────────────────────

class PythonDebugSession {
  constructor({ debugId, workspace, port, proc }) {
    this.debugId = debugId;
    this.workspace = workspace;
    this.port = port;
    this.proc = proc;
    this.lang = 'python';
    this.socket = null;
    this.paused = false;
    this.pausedFrame = null;
    this.callStack = [];
    this.breakpoints = new Map(); // `file:line` → breakpointId
    this._seq = 1;
    this._pending = new Map(); // seq → { resolve, reject }
    this._buf = '';
    this.outputBuf = [];
    this.status = 'running';
    this._threadId = null;
    this._frameId = null;
  }

  async connect(retries = 30) {
    for (let i = 0; i < retries; i++) {
      try {
        await this._doConnect();
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    throw new Error('debugpy did not start in time');
  }

  _doConnect() {
    return new Promise((resolve, reject) => {
      const sock = net.createConnection({ host: '127.0.0.1', port: this.port });
      sock.on('connect', async () => {
        this.socket = sock;
        // DAP initialize request
        await this._request('initialize', {
          adapterID: 'codestrom-python',
          clientID: 'codestrom',
          pathFormat: 'path',
          supportsRunInTerminalRequest: false,
          linesStartAt1: true,
          columnsStartAt1: true,
        }).catch(() => {});
        await this._request('launch', {
          request: 'launch', noDebug: false,
          program: this._program,
          cwd: this._cwd,
          stopOnEntry: true,
        }).catch(() => {});
        resolve();
      });
      sock.on('data', (data) => this._onData(data.toString()));
      sock.on('error', reject);
      sock.on('close', () => { this.status = 'exited'; this.paused = false; });
    });
  }

  _onData(chunk) {
    this._buf += chunk;
    while (true) {
      const m = this._buf.match(/Content-Length: (\d+)\r\n\r\n/);
      if (!m) break;
      const len = parseInt(m[1], 10);
      const bodyStart = this._buf.indexOf('\r\n\r\n') + 4;
      if (this._buf.length < bodyStart + len) break;
      const body = this._buf.slice(bodyStart, bodyStart + len);
      this._buf = this._buf.slice(bodyStart + len);
      try { this._handleMsg(JSON.parse(body)); } catch {}
    }
  }

  _handleMsg(msg) {
    if (msg.type === 'response' && this._pending.has(msg.request_seq)) {
      const { resolve, reject } = this._pending.get(msg.request_seq);
      this._pending.delete(msg.request_seq);
      if (msg.success) resolve(msg.body || {});
      else reject(new Error(msg.message || 'DAP error'));
      return;
    }
    if (msg.type === 'event') {
      const { event, body } = msg;
      if (event === 'stopped') {
        this.paused = true;
        this.status = 'paused';
        this._threadId = body.threadId;
        // Fetch stack asynchronously
        this._request('stackTrace', { threadId: body.threadId, startFrame: 0, levels: 20 })
          .then((r) => {
            this.callStack = (r.stackFrames || []).map((f) => ({
              id: f.id,
              functionName: f.name || '(unknown)',
              file: f.source?.path || f.source?.name || '',
              line: f.line || 0,
              column: f.column || 0,
              scopeChain: [],
            }));
            this._frameId = r.stackFrames?.[0]?.id ?? null;
            this.pausedFrame = this.callStack[0] || null;
          }).catch(() => {});
      }
      if (event === 'continued') {
        this.paused = false;
        this.status = 'running';
        this.callStack = [];
        this.pausedFrame = null;
        this._frameId = null;
      }
      if (event === 'terminated' || event === 'exited') {
        this.status = 'exited';
      }
      if (event === 'output') {
        if (body.output) this.outputBuf.push({ type: body.category || 'stdout', text: body.output.trimEnd() });
        if (this.outputBuf.length > 500) this.outputBuf.shift();
      }
    }
  }

  _request(command, args = {}) {
    const seq = this._seq++;
    return new Promise((resolve, reject) => {
      this._pending.set(seq, { resolve, reject });
      const msg = JSON.stringify({ seq, type: 'request', command, arguments: args });
      const header = `Content-Length: ${Buffer.byteLength(msg, 'utf8')}\r\n\r\n`;
      try {
        this.socket.write(header + msg);
      } catch (err) {
        this._pending.delete(seq);
        reject(err);
      }
    });
  }

  async setBreakpoint(file, line) {
    const r = await this._request('setBreakpoints', {
      source: { path: file },
      breakpoints: [{ line }],
    });
    const bp = r.breakpoints?.[0];
    this.breakpoints.set(`${file}:${line}`, bp?.id);
    return bp;
  }

  async removeBreakpoint(file, line) {
    // Re-send setBreakpoints without this line
    this.breakpoints.delete(`${file}:${line}`);
    const remaining = [...this.breakpoints.entries()]
      .filter(([k]) => k.startsWith(file + ':'))
      .map(([k]) => ({ line: parseInt(k.split(':')[1], 10) }));
    await this._request('setBreakpoints', { source: { path: file }, breakpoints: remaining }).catch(() => {});
  }

  async resume() {
    if (this._threadId == null) return;
    return this._request('continue', { threadId: this._threadId });
  }
  async stepOver() {
    if (this._threadId == null) return;
    return this._request('next', { threadId: this._threadId });
  }
  async stepInto() {
    if (this._threadId == null) return;
    return this._request('stepIn', { threadId: this._threadId });
  }
  async stepOut() {
    if (this._threadId == null) return;
    return this._request('stepOut', { threadId: this._threadId });
  }

  async getVariables() {
    if (!this.paused || this._frameId == null) return [];
    try {
      const scopeRes = await this._request('scopes', { frameId: this._frameId });
      const vars = [];
      for (const scope of (scopeRes.scopes || []).slice(0, 3)) {
        const varRes = await this._request('variables', { variablesReference: scope.variablesReference, count: 50 });
        for (const v of varRes.variables || []) {
          vars.push({ name: v.name, value: v.value, type: v.type || 'unknown', scope: scope.name });
        }
      }
      return vars;
    } catch { return []; }
  }

  /** Evaluate an expression in the current frame (watch / REPL) */
  async evaluate(expression) {
    if (!this._frameId == null) {
      // no frame — evaluate in global context
      const r = await this._request('evaluate', {
        expression: String(expression),
        context: 'repl',
      }).catch((e) => ({ result: String(e.message), type: 'error' }));
      return { result: r.result ?? '', type: r.type ?? 'unknown' };
    }
    const r = await this._request('evaluate', {
      expression: String(expression),
      frameId: this._frameId,
      context: 'watch',
    }).catch((e) => ({ result: String(e.message), type: 'error' }));
    return { result: r.result ?? '', type: r.type ?? 'unknown' };
  }

  destroy() {
    try { this.socket?.destroy(); } catch {}
    try { this.proc?.kill('SIGTERM'); } catch {}
    this.status = 'exited';
  }
}

function newId() {
  return crypto.randomBytes(5).toString('hex');
}

async function findFreePort(start = 9229) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(start, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
    s.on('error', () => resolve(findFreePort(start + 1)));
  });
}

/** Poll until the /json endpoint is available (Node inspector takes ~300ms to start) */
async function waitForInspector(port, retries = 20) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(500) });
      const targets = await r.json();
      if (targets && targets.length > 0) return targets[0].webSocketDebuggerUrl;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('Node inspector did not start in time');
}

class DebugSession {
  constructor({ debugId, workspace, pid, port, proc }) {
    this.debugId = debugId;
    this.workspace = workspace;
    this.pid = pid;
    this.port = port;
    this.proc = proc;
    this.ws = null;          // CDP WebSocket
    this.paused = false;
    this.pausedFrame = null; // { scriptId, lineNumber, columnNumber, functionName }
    this.callStack = [];
    this.breakpoints = new Map(); // `file:line` → { breakpointId, scriptId }
    this._cmdId = 1;
    this._pending = new Map(); // id → { resolve, reject }
    this._scripts = new Map(); // scriptId → url
    this.outputBuf = [];
    this.status = 'running';
  }

  async connect(wsUrl) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      this.ws = ws;
      ws.on('open', () => {
        // Enable required domains
        this._send('Debugger.enable', {});
        this._send('Runtime.enable', {});
        this._send('Runtime.runIfWaitingForDebugger', {});
        resolve();
      });
      ws.on('message', (data) => this._onMessage(data));
      ws.on('error', (err) => {
        this.status = 'error';
        reject(err);
      });
      ws.on('close', () => {
        this.status = 'exited';
        this.paused = false;
      });
    });
  }

  _send(method, params) {
    const id = this._cmdId++;
    return new Promise((resolve, reject) => {
      this._pending.set(id, { resolve, reject });
      try {
        this.ws.send(JSON.stringify({ id, method, params }));
      } catch (err) {
        this._pending.delete(id);
        reject(err);
      }
    });
  }

  _onMessage(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    // Responses
    if (msg.id && this._pending.has(msg.id)) {
      const { resolve, reject } = this._pending.get(msg.id);
      this._pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result || {});
      return;
    }

    // Events
    const { method, params } = msg;
    if (!method) return;

    if (method === 'Debugger.scriptParsed') {
      this._scripts.set(params.scriptId, params.url);
    }
    if (method === 'Debugger.paused') {
      this.paused = true;
      this.status = 'paused';
      const top = params.callFrames?.[0];
      if (top) {
        this.pausedFrame = {
          scriptId: top.location?.scriptId,
          lineNumber: top.location?.lineNumber,
          columnNumber: top.location?.columnNumber,
          functionName: top.functionName || '(anonymous)',
          url: this._scripts.get(top.location?.scriptId) || '',
        };
      }
      this.callStack = (params.callFrames || []).map((f) => ({
        id: f.callFrameId,
        functionName: f.functionName || '(anonymous)',
        file: this._scripts.get(f.location?.scriptId) || '',
        line: (f.location?.lineNumber || 0) + 1,
        column: (f.location?.columnNumber || 0) + 1,
        scopeChain: f.scopeChain || [],
      }));
    }
    if (method === 'Debugger.resumed') {
      this.paused = false;
      this.status = 'running';
      this.callStack = [];
      this.pausedFrame = null;
    }
    if (method === 'Runtime.consoleAPICalled') {
      const text = (params.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
      this.outputBuf.push({ type: params.type, text });
      if (this.outputBuf.length > 500) this.outputBuf.shift();
    }
  }

  async setBreakpoint(file, line) {
    // Normalize file url
    const url = file.startsWith('file://') ? file : `file:///${file.replace(/\\/g, '/')}`;
    const res = await this._send('Debugger.setBreakpointByUrl', {
      lineNumber: line - 1, // CDP is 0-indexed
      url,
    });
    const key = `${file}:${line}`;
    this.breakpoints.set(key, { breakpointId: res.breakpointId });
    return res;
  }

  async removeBreakpoint(file, line) {
    const key = `${file}:${line}`;
    const bp = this.breakpoints.get(key);
    if (!bp) return;
    await this._send('Debugger.removeBreakpoint', { breakpointId: bp.breakpointId });
    this.breakpoints.delete(key);
  }

  async resume() {
    return this._send('Debugger.resume', {});
  }
  async stepOver() {
    return this._send('Debugger.stepOver', {});
  }
  async stepInto() {
    return this._send('Debugger.stepInto', {});
  }
  async stepOut() {
    return this._send('Debugger.stepOut', {});
  }

  async getVariables() {
    if (!this.paused || !this.callStack.length) return [];
    const frame = this.callStack[0];
    const vars = [];
    for (const scope of (frame.scopeChain || [])) {
      if (scope.type === 'global') continue;
      try {
        const res = await this._send('Runtime.getProperties', {
          objectId: scope.object?.objectId,
          ownProperties: true,
          accessorPropertiesOnly: false,
        });
        for (const prop of res.result || []) {
          if (prop.name.startsWith('__')) continue;
          vars.push({
            name: prop.name,
            value: prop.value?.value ?? prop.value?.description ?? String(prop.value?.type ?? ''),
            type: prop.value?.type || 'unknown',
            scope: scope.type,
          });
        }
      } catch {}
    }
    return vars;
  }

  /** Evaluate an expression via CDP Runtime.evaluate (REPL / watch expressions) */
  async evaluate(expression) {
    let callFrameId = null;
    if (this.paused && this.callStack.length) {
      callFrameId = this.callStack[0].id;
    }
    try {
      if (callFrameId) {
        // Evaluate in the paused call frame — full local variable access
        const res = await this._send('Debugger.evaluateOnCallFrame', {
          callFrameId,
          expression: String(expression),
          generatePreview: true,
          throwOnSideEffect: false,
        });
        const rv = res.result || {};
        return {
          result: rv.value !== undefined ? String(rv.value)
                : (rv.description ?? rv.type ?? ''),
          type: rv.type || 'unknown',
          objectId: rv.objectId || null,
        };
      } else {
        // Evaluate in the global context (REPL while running)
        const res = await this._send('Runtime.evaluate', {
          expression: String(expression),
          generatePreview: true,
          allowUnsafeEvalBlockedByCSP: true,
        });
        const rv = res.result || {};
        return {
          result: rv.value !== undefined ? String(rv.value)
                : (rv.description ?? rv.type ?? ''),
          type: rv.type || 'unknown',
          objectId: rv.objectId || null,
        };
      }
    } catch (err) {
      return { result: String(err.message || err), type: 'error', objectId: null };
    }
  }

  destroy() {
    try { this.ws?.close(); } catch {}
    try { this.proc?.kill('SIGTERM'); } catch {}
    this.status = 'exited';
  }
}

export function registerDapRoutes(router, { workspaceDir, safeJoin, sendError }) {
  // List active sessions
  router.get('/debug/sessions', (_req, res) => {
    const list = [...sessions.values()].map((s) => ({
      debugId: s.debugId,
      workspace: s.workspace,
      pid: s.pid,
      port: s.port,
      status: s.status,
      paused: s.paused,
      pausedFrame: s.pausedFrame,
    }));
    res.json({ sessions: list });
  });

  // Start a debug session (Node.js or Python)
  router.post('/debug/start', async (req, res) => {
    const { workspace, file, args = [], lang: reqLang } = req.body || {};
    const dir = workspaceDir(workspace);
    if (!dir) return sendError(res, 400, 'Invalid workspace');

    // Kill existing session for this workspace
    for (const [id, s] of sessions) {
      if (s.workspace === workspace) { s.destroy(); sessions.delete(id); }
    }

    const targetFile = String(file || 'index.js');
    const full = safeJoin(dir, targetFile);
    if (!full) return sendError(res, 400, 'Invalid file path');

    // Detect language: explicit param, or by extension
    const lang = reqLang || (targetFile.endsWith('.py') ? 'python' : 'node');
    const debugId = newId();

    if (lang === 'python') {
      // ── Python via debugpy ──────────────────────────────────────────────────
      const port = await findFreePort(5678).catch(() => null);
      if (!port) return sendError(res, 500, 'No free port for debugpy');

      // Detect python executable: prefer python3 on unix, fall back to python
      function spawnPython(executable) {
        return spawn(executable, ['-m', 'debugpy', '--listen', String(port), '--wait-for-client', targetFile, ...args], {
          cwd: dir,
          env: { ...process.env },
        });
      }

      // Try python3 first (Linux/macOS default), then python (Windows / venv)
      let proc = spawnPython(process.platform === 'win32' ? 'python' : 'python3');
      // Quick check: if the process errors immediately, retry with the other binary
      let spawnErrored = false;
      proc.once('error', () => { spawnErrored = true; });
      await new Promise((r) => setTimeout(r, 150)); // small grace period
      if (spawnErrored) {
        proc = spawnPython(process.platform === 'win32' ? 'python3' : 'python');
      }

      const session = new PythonDebugSession({ debugId, workspace, port, proc });
      session._program = full;
      session._cwd = dir;

      proc.stdout?.on('data', (d) => {
        const t = d.toString().trimEnd();
        if (t) session.outputBuf.push({ type: 'stdout', text: t });
      });
      proc.stderr?.on('data', (d) => {
        const t = d.toString().trimEnd();
        if (t) session.outputBuf.push({ type: 'stderr', text: t });
      });
      proc.on('exit', () => { session.status = 'exited'; });

      try {
        await session.connect();
      } catch (err) {
        proc.kill();
        return sendError(res, 500, `debugpy start failed: ${err.message}. Is debugpy installed? Run: pip install debugpy`);
      }

      sessions.set(debugId, session);
      res.json({ ok: true, debugId, pid: proc.pid, port, lang: 'python' });

    } else {
      // ── Node.js via CDP ─────────────────────────────────────────────────────
      const port = await findFreePort(9229).catch(() => null);
      if (!port) return sendError(res, 500, 'No free port for inspector');

      const proc = spawn(process.execPath, [`--inspect=${port}`, '--inspect-brk', full, ...args], {
        cwd: dir,
        env: { ...process.env, NODE_PATH: dir },
      });

      const session = new DebugSession({ debugId, workspace, pid: proc.pid, port, proc });
      proc.on('exit', () => { session.status = 'exited'; });

      try {
        const wsUrl = await waitForInspector(port);
        await session.connect(wsUrl);
      } catch (err) {
        proc.kill();
        return sendError(res, 500, `Debug start failed: ${err.message}`);
      }

      sessions.set(debugId, session);
      res.json({ ok: true, debugId, pid: proc.pid, port, lang: 'node' });
    }
  });

  // Stop a debug session
  router.post('/debug/stop', (req, res) => {
    const { debugId } = req.body || {};
    const s = sessions.get(debugId);
    if (!s) return sendError(res, 404, 'Session not found');
    s.destroy();
    sessions.delete(debugId);
    res.json({ ok: true });
  });

  // Set / remove a breakpoint
  router.post('/debug/breakpoint', async (req, res) => {
    const { debugId, file, line, remove = false } = req.body || {};
    const s = sessions.get(debugId);
    if (!s) return sendError(res, 404, 'Session not found');
    try {
      if (remove) {
        await s.removeBreakpoint(String(file), Number(line));
        res.json({ ok: true, removed: true });
      } else {
        const r = await s.setBreakpoint(String(file), Number(line));
        res.json({ ok: true, breakpointId: r.breakpointId });
      }
    } catch (err) {
      res.json({ ok: false, error: err.message });
    }
  });

  // Continue / step controls
  router.post('/debug/continue', async (req, res) => {
    const s = sessions.get(req.body?.debugId);
    if (!s) return sendError(res, 404, 'Session not found');
    await s.resume().catch(() => {});
    res.json({ ok: true });
  });

  router.post('/debug/step', async (req, res) => {
    const s = sessions.get(req.body?.debugId);
    if (!s) return sendError(res, 404, 'Session not found');
    await s.stepOver().catch(() => {});
    res.json({ ok: true });
  });

  router.post('/debug/step-in', async (req, res) => {
    const s = sessions.get(req.body?.debugId);
    if (!s) return sendError(res, 404, 'Session not found');
    await s.stepInto().catch(() => {});
    res.json({ ok: true });
  });

  router.post('/debug/step-out', async (req, res) => {
    const s = sessions.get(req.body?.debugId);
    if (!s) return sendError(res, 404, 'Session not found');
    await s.stepOut().catch(() => {});
    res.json({ ok: true });
  });

  // Call stack
  router.get('/debug/stack', (req, res) => {
    const s = sessions.get(req.query.debugId);
    if (!s) return sendError(res, 404, 'Session not found');
    res.json({ ok: true, paused: s.paused, stack: s.callStack });
  });

  // Variables
  router.get('/debug/variables', async (req, res) => {
    const s = sessions.get(req.query.debugId);
    if (!s) return sendError(res, 404, 'Session not found');
    try {
      const vars = await s.getVariables();
      res.json({ ok: true, variables: vars });
    } catch (err) {
      res.json({ ok: false, variables: [], error: err.message });
    }
  });

  // Status
  router.get('/debug/status', (req, res) => {
    const s = sessions.get(req.query.debugId);
    if (!s) return sendError(res, 404, 'Session not found');
    res.json({
      ok: true,
      status: s.status,
      paused: s.paused,
      pausedFrame: s.pausedFrame,
      output: s.outputBuf.splice(0),
    });
  });

  // ── Evaluate expression (REPL + watch expressions) ────────────────────────
  // POST /debug/evaluate  { debugId, expression }
  // Returns { ok, result, type } — works while paused (uses call frame) or
  // while running (uses global Runtime.evaluate for Node.js).
  router.post('/debug/evaluate', async (req, res) => {
    const { debugId, expression } = req.body || {};
    const s = sessions.get(debugId);
    if (!s) return sendError(res, 404, 'Session not found');
    const expr = String(expression || '').trim();
    if (!expr) return sendError(res, 400, 'expression is required');
    try {
      const r = await s.evaluate(expr);
      res.json({ ok: true, result: r.result, type: r.type });
    } catch (err) {
      res.json({ ok: false, result: String(err.message || err), type: 'error' });
    }
  });

  // ── Watch expressions (batch eval) ───────────────────────────────────────
  // POST /debug/watch  { debugId, expressions: string[] }
  // Returns { ok, watches: [{expression, result, type}] }
  router.post('/debug/watch', async (req, res) => {
    const { debugId, expressions = [] } = req.body || {};
    const s = sessions.get(debugId);
    if (!s) return sendError(res, 404, 'Session not found');
    if (!Array.isArray(expressions) || expressions.length === 0) {
      return res.json({ ok: true, watches: [] });
    }
    const watches = [];
    for (const expr of expressions.slice(0, 50)) {
      const e = String(expr || '').trim();
      if (!e) continue;
      try {
        const r = await s.evaluate(e);
        watches.push({ expression: e, result: r.result, type: r.type });
      } catch (err) {
        watches.push({ expression: e, result: String(err.message || err), type: 'error' });
      }
    }
    res.json({ ok: true, watches });
  });
}
