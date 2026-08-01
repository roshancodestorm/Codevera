import { Router } from 'express';
import express from 'express';
import net from 'net';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { spawn, spawnSync } from 'child_process';
import { query } from './db.js';
import { initIndexer, buildIndex, getIndex, ensureIndex, searchSymbols, graphFor, contextFor, semanticSearch, startWatch, stopWatch, dropWorkspace } from './indexer.js';
import { initContextBuilder, buildContext } from './contextBuilder.js';
import { browserSanityIssues } from './browsercheck.js';

const router = Router();

const BACKEND_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(BACKEND_DIR, '..');
const WORKSPACES_ROOT = path.join(PROJECT_ROOT, 'workspaces');
const MAX_FILE_SIZE = 512 * 1024;
const MAX_OUTPUT = 200 * 1024;

if (!fs.existsSync(WORKSPACES_ROOT)) fs.mkdirSync(WORKSPACES_ROOT, { recursive: true });

function workspaceDir(name = 'my-app') {
  const safe = String(name || 'my-app').replace(/[^a-zA-Z0-9._-]/g, '-');
  const dir = path.join(WORKSPACES_ROOT, safe);
  const resolved = path.resolve(dir);
  if (!resolved.startsWith(WORKSPACES_ROOT + path.sep) && resolved !== WORKSPACES_ROOT) return null;
  return resolved;
}

function safeJoin(base, rel) {
  if (!base) return null;
  const full = path.resolve(base, String(rel || ''));
  if (full !== base && !full.startsWith(base + path.sep)) return null;
  return full;
}

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', '.venv', '.cache', 'output', 'workspaces', 'ComfyUI', 'Hellomj', 'tmp', '.ruff_cache', 'vscode-exports', '.ide', '.memory', 'Studio', 'gamebuilder', 'scratch', 'tmp_test']);

initIndexer({
  indexDir: path.join(PROJECT_ROOT, '.ide', 'indexes'),
  workspacesRoot: WORKSPACES_ROOT,
  ignoreDirs: IGNORE_DIRS,
  projectDirs: ['src', 'backend', 'public'],
  workspaceDir: (name) => (name === '__project__' ? PROJECT_ROOT : workspaceDir(name)),
});

initContextBuilder({
  workspaceDir: (name) => (name === '__project__' ? PROJECT_ROOT : workspaceDir(name)),
});

const USERS_FILE = path.join(BACKEND_DIR, 'users.json');
const SESSIONS_FILE = path.join(BACKEND_DIR, 'sessions.json');
const PROJECTS_FILE = path.join(BACKEND_DIR, 'projects.json');

function loadJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

let users = loadJson(USERS_FILE, {});
let sessions = loadJson(SESSIONS_FILE, {});
let projects = loadJson(PROJECTS_FILE, {});

const saveUsers = () => fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
const saveSessions = () => fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
const saveProjects = () => fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2));

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

function authUser(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  const email = sessions[token];
  if (!email || !users[email]) return null;
  return users[email];
}

function projectMeta(name) {
  return projects[String(name)] || null;
}

function touchProject(name, extra = {}) {
  const safe = String(name);
  projects[safe] = { ...(projects[safe] || {}), ...extra, lastOpened: Date.now() };
  saveProjects();
}

async function listFiles(dir, prefix = '', depth = 0, limit = 4000) {
  if (depth > 6 || limit <= 0) return [];
  const entries = [];
  try {
    const items = await fsp.readdir(dir, { withFileTypes: true });
    for (const item of items) {
      if (limit <= 0) break;
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        if (IGNORE_DIRS.has(item.name)) continue;
        entries.push({ name: item.name, type: 'dir', path: prefix ? `${prefix}/${item.name}` : item.name, children: await listFiles(full, prefix ? `${prefix}/${item.name}` : item.name, depth + 1, limit) });
      } else {
        const ext = path.extname(item.name).toLowerCase();
        if (['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.map', '.lock', '.csv'].includes(ext)) continue;
        let size = 0;
        try { size = (await fsp.stat(full)).size; } catch {}
        entries.push({ name: item.name, type: 'file', path: prefix ? `${prefix}/${item.name}` : item.name, size });
      }
      limit--;
    }
  } catch {}
  return entries;
}

function sendError(res, status, message) {
  res.status(status).json({ error: message });
}

const workspaceSnapshots = new Map();
const workspaceRunFiles = new Map();
const activeAgentRuns = new Map();

const CHAT_DIR = '.ide';

async function loadChat(workspace, dir) {
  try {
    const p = path.join(dir, CHAT_DIR, 'chat.json');
    if (!fs.existsSync(p)) return [];
    return JSON.parse(await fsp.readFile(p, 'utf8')).messages || [];
  } catch {
    return [];
  }
}

async function appendChat(workspace, dir, role, content, extra = {}) {
  try {
    const chatDir = path.join(dir, CHAT_DIR);
    fs.mkdirSync(chatDir, { recursive: true });
    const p = path.join(chatDir, 'chat.json');
    const messages = fs.existsSync(p) ? JSON.parse(await fsp.readFile(p, 'utf8')).messages || [] : [];
    messages.push({ role, content, at: Date.now(), ...extra });
    if (messages.length > 50) messages.splice(0, messages.length - 50);
    await fsp.writeFile(p, JSON.stringify({ messages }, null, 1), 'utf8');
  } catch {}
}

async function collectFiles(dir) {
  const tree = await listFiles(dir, '', 0, 2000);
  const out = [];
  const walk = (list) => { for (const f of list) { if (f.type === 'file') out.push(f.path); if (f.children) walk(f.children); } };
  walk(tree);
  return out;
}

async function snapshotWorkspace(workspace, dir) {
  const snap = new Map();
  const paths = await collectFiles(dir);
  for (const p of paths.slice(0, 300)) {
    try {
      const full = safeJoin(dir, p);
      if (!full || !fs.existsSync(full)) continue;
      const st = await fsp.stat(full);
      if (st.size > MAX_FILE_SIZE) continue;
      snap.set(p, await fsp.readFile(full, 'utf8'));
    } catch {}
  }
  workspaceSnapshots.set(workspace, snap);
  await persistSnapshot(workspace, dir);
  return snap;
}

const SNAPSHOT_REL = path.join('.ide', 'snapshot.json');

async function persistSnapshot(workspace, dir) {
  try {
    const full = safeJoin(dir, SNAPSHOT_REL);
    if (!full) return;
    const snap = workspaceSnapshots.get(workspace);
    const payload = {
      at: Date.now(),
      files: snap ? Object.fromEntries(snap) : {},
      runFiles: [...(workspaceRunFiles.get(workspace) || [])],
    };
    fs.mkdirSync(path.dirname(full), { recursive: true });
    await fsp.writeFile(full, JSON.stringify(payload), 'utf8');
  } catch {}
}

async function loadSnapshotFile(workspace, dir) {
  const full = safeJoin(dir, SNAPSHOT_REL);
  if (!full || !fs.existsSync(full)) return null;
  try {
    const payload = JSON.parse(await fsp.readFile(full, 'utf8'));
    const snap = new Map(Object.entries(payload.files || {}));
    if (Array.isArray(payload.runFiles)) workspaceRunFiles.set(workspace, new Set(payload.runFiles));
    return snap;
  } catch { return null; }
}

async function clearSnapshotFile(workspace, dir) {
  const full = safeJoin(dir, SNAPSHOT_REL);
  if (full && fs.existsSync(full)) {
    try { await fsp.unlink(full); } catch {}
  }
}

async function restoreWorkspaceSnapshot(workspace, dir) {
  let snap = workspaceSnapshots.get(workspace);
  if (!snap) snap = await loadSnapshotFile(workspace, dir);
  if (!snap) return { restored: 0, removed: 0 };
  let restored = 0;
  let removed = 0;
  for (const [filePath, content] of snap) {
    const full = safeJoin(dir, filePath);
    if (!full) continue;
    fs.mkdirSync(path.dirname(full), { recursive: true });
    await fsp.writeFile(full, content, 'utf8');
    restored++;
  }
  for (const filePath of workspaceRunFiles.get(workspace) || []) {
    if (snap.has(filePath)) continue;
    const full = safeJoin(dir, filePath);
    if (full && fs.existsSync(full)) {
      await fsp.unlink(full);
      removed++;
    }
  }
  return { restored, removed };
}

function cancelledRunError() {
  const err = new Error('RUN_CANCELLED');
  err.code = 'RUN_CANCELLED';
  return err;
}

function lineDiff(oldText, newText) {
  const a = String(oldText || '').replace(/\n$/, '').split('\n');
  const b = String(newText || '').replace(/\n$/, '').split('\n');
  const n = a.length, m = b.length;
  if (n * m > 2500000) {
    return [{ oldStart: 1, oldLines: a.slice(0, 2000), newStart: 1, newLines: b.slice(0, 2000) }];
  }
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const hunks = [];
  let i = 0, j = 0, cur = null;
  const push = () => { if (cur && (cur.oldLines.length || cur.newLines.length)) hunks.push(cur); cur = null; };
  while (i < n && j < m) {
    if (a[i] === b[j]) { push(); i++; j++; continue; }
    if (!cur) cur = { oldStart: i + 1, oldLines: [], newStart: j + 1, newLines: [] };
    if (dp[i + 1][j] >= dp[i][j + 1]) { cur.oldLines.push(a[i]); i++; }
    else { cur.newLines.push(b[j]); j++; }
  }
  if (i < n || j < m) {
    if (!cur) cur = { oldStart: i + 1, oldLines: [], newStart: j + 1, newLines: [] };
    while (i < n) { cur.oldLines.push(a[i]); i++; }
    while (j < m) { cur.newLines.push(b[j]); j++; }
  }
  push();
  return hunks;
}

function localRefExists(dir, fromFile, rawRef, extensions) {
  const ref = String(rawRef || '').split(/[?#]/)[0];
  if (!ref || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\/)/i.test(ref)) return true;
  const root = path.resolve(dir);
  const base = path.resolve(path.dirname(fromFile), ref);
  if (base !== root && !base.startsWith(root + path.sep)) return false;
  const candidates = [base];
  if (!path.extname(base)) {
    for (const ext of extensions) candidates.push(base + ext, path.join(base, `index${ext}`));
  }
  return candidates.some((candidate) => {
    try { return fs.statSync(candidate).isFile(); } catch { return false; }
  });
}

async function runtimeSanityIssues(dir, task = '', runFiles = null) {
  const issues = [];
  const source = { html: '', js: '' };
  const paths = await collectFiles(dir);
  for (const filePath of paths) {
    const full = safeJoin(dir, filePath);
    const ext = path.extname(filePath).toLowerCase();
    if (!full || !['.html', '.js', '.mjs', '.cjs'].includes(ext)) continue;
    let content = '';
    try {
      if ((await fsp.stat(full)).size <= MAX_FILE_SIZE) content = await fsp.readFile(full, 'utf8');
    } catch { continue; }
    if (ext === '.html') {
      source.html += `\n${content}`;
      for (const match of content.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
        if (!localRefExists(dir, full, match[1], ['.js', '.mjs', '.cjs'])) issues.push(`${filePath}: missing script asset ${match[1]}`);
      }
      for (const tag of content.matchAll(/<link\b[^>]*>/gi)) {
        const href = tag[0].match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
        if (/\bstylesheet\b/i.test(tag[0]) && href && !localRefExists(dir, full, href, ['.css'])) issues.push(`${filePath}: missing stylesheet asset ${href}`);
      }
    } else {
      source.js += `\n${content}`;
      const imports = [
        ...content.matchAll(/\b(?:import|export)\s+(?:[^'";\n]+?\s+from\s+)?["']([^"']+)["']/g),
        ...content.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g),
      ];
      for (const match of imports) {
        if (match[1].startsWith('.') && !localRefExists(dir, full, match[1], ['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx'])) issues.push(`${filePath}: missing local module ${match[1]}`);
      }
    }
  }

  const lowerTask = String(task).toLowerCase();
  const combined = `${source.html}\n${source.js}`;
  const htmlIds = new Set([...source.html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]));
  const htmlClasses = new Set([...source.html.matchAll(/\bclass\s*=\s*["']([^"']+)["']/gi)].flatMap((m) => m[1].split(/\s+/)));
  for (const m of source.js.matchAll(/(?:getElementById|querySelector|querySelectorAll)\(\s*["']#([a-zA-Z0-9_-]+)["']\s*\)/g)) {
    if (!htmlIds.has(m[1])) issues.push(`JavaScript references #${m[1]} but no element with that id exists in the HTML`);
  }
  for (const m of source.js.matchAll(/(?:querySelector|querySelectorAll)\(\s*["']\.([a-zA-Z0-9_-]+)["']\s*\)/g)) {
    if (!htmlClasses.has(m[1])) issues.push(`JavaScript references .${m[1]} but no element with that class exists in the HTML`);
  }
  for (const m of source.html.matchAll(/\b(?:getElementById|querySelector|querySelectorAll)\(\s*["']#([a-zA-Z0-9_-]+)["']\s*\)/g)) {
    if (!htmlIds.has(m[1])) issues.push(`Inline script references #${m[1]} but no element with that id exists in the HTML`);
  }
  if (runFiles && runFiles.has('package.json') && /\b(?:do not|don't|never|without|no)\b[^.\n]*package\.json/i.test(lowerTask)) {
    issues.push('Task forbids a package.json, but one was created by this run — remove it and its dependencies');
  }
  if (lowerTask.includes('localstorage') && !/\blocalStorage\b/.test(source.js)) issues.push('Task requires localStorage, but no localStorage access was found in JavaScript');
  if (/\badd(?:ing)?\s+tasks?\b|\badd tasks?\b/.test(lowerTask) && !/(addEventListener\s*\(\s*['"](?:submit|click)|onsubmit|onclick)/i.test(source.js)) issues.push('Task requires adding tasks, but no form or click handler was found');
  if (/\btoggle(?:\s+completion)?\b/.test(lowerTask) && !/\b(?:toggle|completed)\b/i.test(source.js)) issues.push('Task requires completion toggling, but no completion state logic was found');
  if (/\bdelet(?:e|ing)\s+tasks?\b/.test(lowerTask) && !/(?:\.remove\s*\(|removeChild\s*\(|\.splice\s*\(|\.filter\s*\()/i.test(source.js)) issues.push('Task requires deleting tasks, but no removal logic was found');
  if (/\bfilter(?:ing)?\b/.test(lowerTask) && !/(?:\.filter\s*\(|\bactive\b.*\bcompleted\b|\bcompleted\b.*\bactive\b)/is.test(combined)) issues.push('Task requires task filters, but no active/completed filtering logic was found');
  return issues.slice(0, 24);
}

router.get('/diff', async (req, res) => {
  const { workspace } = req.query;
  const dir = workspaceDir(workspace);
  if (!dir) return sendError(res, 400, 'Invalid workspace');
  const snap = workspaceSnapshots.get(workspace);
  if (!snap) return res.json([]);
  try {
    const paths = await collectFiles(dir);
    const all = new Set([...paths, ...snap.keys()]);
    const result = [];
    for (const p of all) {
      let cur = '';
      try {
        const full = safeJoin(dir, p);
        if (full && fs.existsSync(full)) {
          const st = await fsp.stat(full);
          if (st.size <= MAX_FILE_SIZE) cur = await fsp.readFile(full, 'utf8');
        }
      } catch {}
      const old = snap.get(p);
      if (old === undefined && cur === '') continue;
      if (old === cur) continue;
      const hunks = lineDiff(old ?? '', cur);
      let added = 0, removed = 0;
      for (const h of hunks) { added += h.newLines.length; removed += h.oldLines.length; }
      if (added === 0 && removed === 0) continue;
      result.push({ path: p, added, removed, hunks });
    }
    res.json(result);
  } catch {
    res.json([]);
  }
});

router.post('/diff/accept', async (req, res) => {
  const { workspace, path: filePath } = req.body || {};
  const dir = workspaceDir(workspace);
  const snap = workspaceSnapshots.get(workspace);
  if (!dir || !snap) return res.json({ success: true });
  try {
    const full = safeJoin(dir, filePath);
    if (full && fs.existsSync(full)) {
      const st = await fsp.stat(full);
      if (st.size <= MAX_FILE_SIZE) snap.set(filePath, await fsp.readFile(full, 'utf8'));
      else snap.delete(filePath);
    } else {
      snap.delete(filePath);
    }
  } catch {}
  res.json({ success: true });
});

router.post('/diff/reject', async (req, res) => {
  const { workspace, path: filePath } = req.body || {};
  const dir = workspaceDir(workspace);
  if (!dir) return sendError(res, 400, 'Invalid workspace');
  const snap = workspaceSnapshots.get(workspace);
  const old = snap?.get(filePath);
  if (old !== undefined) {
    const full = safeJoin(dir, filePath);
    if (full) await fsp.writeFile(full, old, 'utf8');
    snap.set(filePath, old);
  } else if (snap && workspaceRunFiles.get(workspace)?.has(filePath)) {
    const full = safeJoin(dir, filePath);
    if (full && fs.existsSync(full)) await fsp.unlink(full);
    workspaceRunFiles.get(workspace).delete(filePath);
  }
  res.json({ success: true });
});

// splice one hunk: remove removeLines.length lines at start, insert insertLines
function applyHunk(text, start, removeLines, insertLines) {
  const hadNl = String(text).endsWith('\n');
  const lines = String(text).replace(/\n$/, '').split('\n');
  const idx = Math.max(0, Math.min(start - 1, lines.length));
  const head = lines.slice(0, idx);
  const tail = lines.slice(idx + removeLines.length);
  const out = [...head, ...insertLines, ...tail];
  return out.join('\n') + (hadNl ? '\n' : '');
}

// per-hunk accept/reject: 'accept' keeps the hunk's change in the diff baseline,
// 'reject' reverts only that hunk on disk; other hunks of the file stay intact.
router.post('/diff/hunk', async (req, res) => {
  const { workspace, path: filePath, index, action } = req.body || {};
  const dir = workspaceDir(workspace);
  const snap = workspaceSnapshots.get(workspace);
  if (!dir || !snap) return sendError(res, 400, 'No diff state');
  const old = snap.get(filePath);
  if (old === undefined) return sendError(res, 404, 'No snapshot for file');
  const full = safeJoin(dir, filePath);
  const cur = full && fs.existsSync(full) ? await fsp.readFile(full, 'utf8') : '';
  const hunks = lineDiff(old, cur);
  const h = hunks[parseInt(index, 10)];
  if (!h) return sendError(res, 404, 'Hunk not found');
  if (action === 'reject') {
    const next = applyHunk(cur, h.newStart, h.newLines, h.oldLines);
    if (full) await fsp.writeFile(full, next, 'utf8');
  } else {
    snap.set(filePath, applyHunk(old, h.oldStart, h.oldLines, h.newLines));
  }
  res.json({ success: true });
});

router.post('/diff/reset', async (req, res) => {
  const { workspace } = req.body || {};
  workspaceSnapshots.delete(workspace);
  workspaceRunFiles.delete(workspace);
  res.json({ success: true });
});

router.get('/chat', async (req, res) => {
  const { workspace } = req.query;
  const dir = workspaceDir(workspace);
  if (!dir) return sendError(res, 400, 'Invalid workspace');
  res.json({ messages: await loadChat(workspace, dir) });
});

router.post('/chat/clear', async (req, res) => {
  const { workspace } = req.body || {};
  const dir = workspaceDir(workspace);
  if (!dir) return sendError(res, 400, 'Invalid workspace');
  try {
    const p = path.join(dir, CHAT_DIR, 'chat.json');
    if (fs.existsSync(p)) await fsp.unlink(p);
    res.json({ success: true });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

router.post('/agents/cancel', (req, res) => {
  const { workspace } = req.body || {};
  const run = activeAgentRuns.get(workspace);
  if (run) run.cancelled = true;
  res.json({ success: true, cancelled: !!run });
});

router.post('/agents/rollback', async (req, res) => {
  const { workspace } = req.body || {};
  const dir = workspaceDir(workspace);
  if (!dir) return sendError(res, 400, 'Invalid workspace');
  try {
    const result = await restoreWorkspaceSnapshot(workspace, dir);
    await clearSnapshotFile(workspace, dir);
    workspaceSnapshots.delete(workspace);
    workspaceRunFiles.delete(workspace);
    res.json({ success: true, ...result });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

const deployments = new Map();

function lanIps() {
  const out = [];
  const ifs = os.networkInterfaces();
  for (const name of Object.keys(ifs)) {
    for (const iface of ifs[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) out.push(iface.address);
    }
  }
  return out;
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const sock = net.createConnection(port, '127.0.0.1');
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('error', () => { sock.destroy(); resolve(false); });
  });
}

async function nextFreePort(from = 4200) {
  for (let p = from; p < from + 200; p++) {
    if (!(await isPortOpen(p))) return p;
  }
  return null;
}

function killTree(pid) {
  try {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true });
    else process.kill(pid, 'SIGTERM');
  } catch {}
}

function runCmdIn(dir, command, timeoutMs = 600000) {
  return new Promise((resolve) => {
    const child = spawn(command, { cwd: dir, shell: true, windowsHide: true });
    let out = '';
    const timer = setTimeout(() => { try { killTree(child.pid); } catch {} }, timeoutMs);
    child.stdout?.on('data', (d) => { if (out.length < 60000) out += d.toString(); });
    child.stderr?.on('data', (d) => { if (out.length < 60000) out += d.toString(); });
    child.on('error', (err) => { clearTimeout(timer); resolve({ exitCode: -1, output: String(err.message || err) }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ exitCode: code, output: out }); });
  });
}

router.get('/deploy', async (req, res) => {
  const { workspace } = req.query;
  const dir = workspaceDir(workspace);
  if (!dir) return sendError(res, 400, 'Invalid workspace');
  const d = deployments.get(workspace);
  if (!d) return res.json({ deployed: false, status: 'stopped' });
  res.json(deployPayload(workspace, d, true));
});

router.post('/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(name || '').trim().slice(0, 40);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) return sendError(res, 400, 'Enter a valid email address');
  if (String(password || '').length < 6) return sendError(res, 400, 'Password must be at least 6 characters');
  if (!cleanName) return sendError(res, 400, 'Name is required');
  if (users[cleanEmail]) return sendError(res, 409, 'An account with this email already exists');
  const salt = crypto.randomBytes(16).toString('hex');
  users[cleanEmail] = { name: cleanName, email: cleanEmail, salt, hash: hashPassword(password, salt), createdAt: Date.now() };
  saveUsers();
  const token = crypto.randomBytes(24).toString('hex');
  sessions[token] = cleanEmail;
  saveSessions();
  res.json({ success: true, token, user: { name: cleanName, email: cleanEmail } });
});

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const u = users[cleanEmail];
  if (!u || u.hash !== hashPassword(password, u.salt)) return sendError(res, 401, 'Invalid email or password');
  const token = crypto.randomBytes(24).toString('hex');
  sessions[token] = cleanEmail;
  saveSessions();
  res.json({ success: true, token, user: { name: u.name, email: u.email } });
});

router.post('/auth/logout', (req, res) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (sessions[token]) {
    delete sessions[token];
    saveSessions();
  }
  res.json({ success: true });
});

router.get('/auth/me', (req, res) => {
  const u = authUser(req);
  if (!u) return sendError(res, 401, 'Not signed in');
  res.json({ user: { name: u.name, email: u.email } });
});

function dockerReady() {
  try {
    return spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], { windowsHide: true, timeout: 15000 }).status === 0;
  } catch {
    return false;
  }
}

function dockerLogs(name) {
  return new Promise((resolve) => {
    const c = spawn('docker', ['logs', '--tail', '150', name], { windowsHide: true });
    let out = '';
    c.stdout?.on('data', (d) => { out += d.toString(); });
    c.stderr?.on('data', (d) => { out += d.toString(); });
    c.on('error', () => resolve(''));
    c.on('close', () => resolve(out));
  });
}

function dockerfileFor(dir) {
  const pkgPath = path.join(dir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return {
      name: 'static',
      innerPort: 80,
      dockerfile: 'FROM nginx:alpine\nCOPY . /usr/share/nginx/html\nEXPOSE 80\n',
    };
  }
  let pkg = {};
  try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')); } catch {}
  const scripts = pkg.scripts || {};
  if (scripts.dev === 'vite' || scripts.preview) {
    return {
      name: 'spa',
      innerPort: 80,
      previewConfig: 'export default { preview: { allowedHosts: true, host: "0.0.0.0" } }\n',
      dockerfile: 'FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install --no-audit --no-fund\nCOPY . .\nRUN npm run build\nEXPOSE 80\nCMD ["sh", "-c", "npx vite preview --config vite.preview.config.js --port 80 --host 0.0.0.0"]\n',
    };
  }
  return {
    name: 'node',
    innerPort: 3000,
    dockerfile: 'FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install --no-audit --no-fund\nCOPY . .\nEXPOSE 3000\nCMD ["sh", "-c", "npm start"]\n',
  };
}

function startShareTunnel(d, port) {
  try {
    const child = spawn(
      'ssh',
      ['-o', 'StrictHostKeyChecking=no', '-o', 'UserKnownHostsFile=NUL', '-R', `80:localhost:${port}`, 'nokey@localhost.run'],
      { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    d.tunnel = child;
    d.sharePending = true;
    let out = '';
    child.stdout?.on('data', (ch) => {
      out += ch.toString();
      const m = out.match(/https:\/\/(?:[a-z0-9-]+\.)?(?:lhr\.life|localhost\.run|localtunnel\.me)(?=[\/\s'"<>]|$)/i);
      if (m && !d.shareUrl) {
        d.shareUrl = m[0];
        d.sharePending = false;
        d.output = d.output ? `${d.output}\nPublic URL: ${d.shareUrl}` : `Public URL: ${d.shareUrl}`;
      }
    });
    child.stderr?.on('data', (ch) => { out += ch.toString(); });
    child.on('error', () => { d.sharePending = false; });
    child.on('close', () => { d.sharePending = false; });
  } catch {}
}

function deployPayload(workspace, d, deployed = true) {
  return {
    deployed,
    workspace,
    port: d.port,
    url: d.url,
    lanUrls: d.lanUrls || [],
    shareUrl: d.shareUrl || null,
    sharePending: !!d.sharePending,
    status: d.status,
    kind: d.kind,
    output: (d.output || '').slice(-2000),
    startedAt: d.startedAt,
  };
}

function stopDeployment(workspace) {
  const d = deployments.get(workspace);
  if (!d) return;
  if (d.kind === 'docker' && d.container) {
    try { spawnSync('docker', ['rm', '-f', d.container], { windowsHide: true }); } catch {}
  }
  if (d.tunnel) try { d.tunnel.kill(); } catch {}
  if (d.proc) killTree(d.proc.pid);
  if (d.server) try { d.server.close(); } catch {}
  deployments.delete(workspace);
}

router.post('/deploy/docker', async (req, res) => {
  const { workspace, force } = req.body || {};
  const dir = workspaceDir(workspace);
  if (!dir || !fs.existsSync(dir)) return sendError(res, 400, 'Invalid workspace');
  const existing = deployments.get(workspace);
  if (existing && existing.kind === 'docker' && ['building', 'starting', 'running'].includes(existing.status)) {
    if (!force) return res.json({ success: true, ...deployPayload(workspace, existing, true) });
    stopDeployment(workspace);
  }
  if (!dockerReady()) return sendError(res, 503, 'Docker is not running — start Docker Desktop first');
  const port = await nextFreePort();
  if (!port) return sendError(res, 500, 'No free port available');
  const safeName = `codestrom-${workspace}`.toLowerCase().replace(/[^a-z0-9_.-]/g, '-').slice(0, 60);
  const def = dockerfileFor(dir);
  fs.writeFileSync(path.join(dir, 'Dockerfile'), def.dockerfile);
  if (def.previewConfig) fs.writeFileSync(path.join(dir, 'vite.preview.config.js'), def.previewConfig);
  fs.writeFileSync(path.join(dir, '.dockerignore'), 'node_modules\ndist\n.git\n.ide\n.memory\nDockerfile\n.dockerignore\noutput\n');
  const url = `http://localhost:${port}`;
  const lanUrls = lanIps().map((ip) => `http://${ip}:${port}`);
  const d = { workspace, port, url, lanUrls, shareUrl: null, status: 'building', kind: 'docker', output: 'docker build -t ' + safeName, container: safeName, proc: null, tunnel: null, server: null, startedAt: Date.now() };
  deployments.set(workspace, d);
  res.json({ success: true, ...deployPayload(workspace, d, true) });

  (async () => {
    try {
      d.status = 'building';
      const build = await runCmdIn(dir, `docker build -t ${safeName} .`, 900000);
      d.output = build.output.slice(-2000);
      if (build.exitCode !== 0) {
        d.status = 'error';
        return;
      }
      d.status = 'starting';
      d.output = `docker run -d --name ${safeName} -p ${port}:${def.innerPort}`;
      const run = await runCmdIn(dir, `docker run -d --name ${safeName} -p ${port}:${def.innerPort} -e PORT=${def.innerPort} ${safeName}`);
      d.output = run.output.slice(-2000);
      if (run.exitCode !== 0) {
        d.status = 'error';
        return;
      }
      const deadline = Date.now() + 90000;
      while (Date.now() < deadline) {
        if (await isPortOpen(port)) break;
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (!(await isPortOpen(port))) {
        d.status = 'error';
        d.output = `Container started but port ${port} did not respond.\n${(await dockerLogs(safeName)).slice(-1500)}`;
        return;
      }
      d.status = 'running';
      d.output = (await dockerLogs(safeName)) || 'Container is running';
      startShareTunnel(d, port);
    } catch (err) {
      d.status = 'error';
      d.output = String(err.message || err);
    }
  })();
});

router.post('/deploy', async (req, res) => {
  const { workspace, force } = req.body || {};
  const dir = workspaceDir(workspace);
  if (!dir) return sendError(res, 400, 'Invalid workspace');
  const existing = deployments.get(workspace);
  if (existing) {
    if (!force) return res.json({ success: true, ...deployPayload(workspace, existing, true) });
    stopDeployment(workspace);
  }
  const port = await nextFreePort();
  if (!port) return sendError(res, 500, 'No free port available');
  const url = `http://localhost:${port}`;
  const lanUrls = lanIps().map((ip) => `http://${ip}:${port}`);
  const hasPkg = fs.existsSync(path.join(dir, 'package.json'));

  if (!hasPkg) {
    try {
      const app = express();
      app.use(express.static(dir));
      const srv = app.listen(port);
      const d = { workspace, port, url, lanUrls, status: 'running', kind: 'static', output: 'Serving static files from workspace', startedAt: Date.now(), proc: null, server: srv };
      deployments.set(workspace, d);
      startShareTunnel(d, port);
      return res.json({ success: true, ...deployPayload(workspace, d, true) });
    } catch (err) {
      return sendError(res, 500, `Static server failed: ${err.message}`);
    }
  }

  const d = { workspace, port, url, lanUrls, status: 'installing', kind: 'node', output: '', startedAt: Date.now(), proc: null, server: null };
  deployments.set(workspace, d);
  res.json({ success: true, ...deployPayload(workspace, d, true) });

  (async () => {
    try {
      if (!fs.existsSync(path.join(dir, 'node_modules'))) {
        d.status = 'installing';
        d.output = 'npm install --no-audit --no-fund';
        const inst = await runCmdIn(dir, 'npm install --no-audit --no-fund');
        d.output = inst.output.slice(-2000);
        if (inst.exitCode !== 0) {
          d.status = 'error';
          return;
        }
      }
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
      const script = (pkg.scripts && pkg.scripts.dev) ? 'dev' : 'start';
      d.status = 'starting';
      d.output = `npm run ${script} -- --port ${port} --host`;
      const child = spawn('cmd.exe', ['/d', '/s', '/c', `npm run ${script} -- --port ${port} --host`], {
        cwd: dir,
        env: { ...process.env, PORT: String(port), HOST: '0.0.0.0' },
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      d.proc = child;
      let out = '';
      child.stdout?.on('data', (ch) => { out += ch.toString(); if (out.length > 8000) out = out.slice(-8000); });
      child.stderr?.on('data', (ch) => { out += ch.toString(); if (out.length > 8000) out = out.slice(-8000); });
      child.on('error', (err) => { d.status = 'error'; d.output = String(err.message || err); });
      child.on('close', (code) => {
        if (deployments.get(workspace) === d) {
          d.output = (out || `Process exited (${code})`).slice(-2000);
          if (d.status !== 'error' && d.status !== 'running') d.status = code === 0 ? 'stopped' : 'error';
        }
      });
      const deadline = Date.now() + 90000;
      while (Date.now() < deadline && d.status === 'starting') {
        const m = out.match(/https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d+)/);
        const actual = m ? Number(m[1]) : null;
        if (actual && (await isPortOpen(actual))) {
          d.port = actual;
          d.url = `http://localhost:${actual}`;
          d.lanUrls = lanIps().map((ip) => `http://${ip}:${actual}`);
          d.status = 'running';
          break;
        }
        if (await isPortOpen(port)) { d.status = 'running'; break; }
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (d.status === 'starting') {
        d.status = 'error';
        d.output = `Server did not respond in time.\n${out.slice(-2000)}`;
        killTree(child.pid);
      } else if (d.status === 'running') {
        d.output = out.slice(-2000) || 'Server is running';
        startShareTunnel(d, d.port || port);
      }
    } catch (err) {
      d.status = 'error';
      d.output = String(err.message || err);
    }
  })();
});

router.post('/deploy/stop', async (req, res) => {
  const { workspace } = req.body || {};
  stopDeployment(workspace);
  res.json({ success: true });
});

router.get('/workspaces', async (req, res) => {
  try {
    const u = authUser(req);
    const items = await fsp.readdir(WORKSPACES_ROOT, { withFileTypes: true });
    const workspaces = [];
    for (const item of items) {
      if (!item.isDirectory()) continue;
      const meta = projects[item.name] || {};
      if (u && meta.owner !== u.email) continue;
      const dir = workspaceDir(item.name);
      if (!dir) continue;
      const files = await listFiles(dir, '', 0, 2000);
      let fileCount = 0;
      const walk = (list) => { for (const f of list) { if (f.type === 'file') fileCount++; if (f.children) walk(f.children); } };
      walk(files);
      workspaces.push({ name: item.name, fileCount, updatedAt: meta.lastOpened || null, created: meta.created || null, template: meta.template || null, hasPackageJson: fs.existsSync(path.join(dir, 'package.json')), hasIndexHtml: fs.existsSync(path.join(dir, 'index.html')) });
    }
    workspaces.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    res.json(workspaces);
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

router.post('/workspaces/open', (req, res) => {
  const { workspace } = req.body || {};
  const dir = workspaceDir(workspace);
  if (!dir || !fs.existsSync(dir)) return sendError(res, 404, 'Workspace not found');
  touchProject(workspace);
  startWatch(workspace);
  buildIndex(workspace).catch(() => {});
  res.json({ success: true });
});

router.delete('/workspaces', async (req, res) => {
  const { workspace } = req.body || {};
  const dir = workspaceDir(workspace);
  if (!dir || !fs.existsSync(dir)) return sendError(res, 404, 'Workspace not found');
  const d = deployments.get(workspace);
  if (d) {
    if (d.kind === 'docker' && d.container) {
      try { spawnSync('docker', ['rm', '-f', d.container], { windowsHide: true }); } catch {}
    }
    if (d.tunnel) try { d.tunnel.kill(); } catch {}
    if (d.proc) killTree(d.proc.pid);
    if (d.server) try { d.server.close(); } catch {}
    deployments.delete(workspace);
  }
  try {
    await fsp.rm(dir, { recursive: true, force: true });
    delete projects[workspace];
    saveProjects();
    dropWorkspace(workspace);
    res.json({ success: true });
  } catch (err) {
    sendError(res, 500, `Delete failed: ${err.message} (a file may be open — close the preview or terminal first)`);
  }
});

router.post('/workspaces', async (req, res) => {
  const { name } = req.body;
  const safe = String(name || '').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 40) || 'my-app';
  const dir = workspaceDir(safe);
  if (!dir) return sendError(res, 400, 'Invalid workspace name');
  try {
    fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(path.join(dir, 'index.html'))) {
      fs.writeFileSync(path.join(dir, 'index.html'), '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>My App</title>\n  <link rel="stylesheet" href="style.css" />\n</head>\n<body>\n  <h1>Hello from your AI workspace</h1>\n  <script src="script.js"></script>\n</body>\n</html>\n');
    }
    if (!fs.existsSync(path.join(dir, 'style.css'))) fs.writeFileSync(path.join(dir, 'style.css'), 'body { font-family: system-ui, sans-serif; background: #020617; color: #e2e8f0; }\n');
    if (!fs.existsSync(path.join(dir, 'script.js'))) fs.writeFileSync(path.join(dir, 'script.js'), 'console.log("workspace ready");\n');
    const u = authUser(req);
    touchProject(safe, { owner: u ? u.email : 'local', created: Date.now(), template: null });
    startWatch(safe);
    buildIndex(safe).catch(() => {});
    res.json({ success: true, name: safe });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

router.get('/tree', async (req, res) => {
  const { workspace, root } = req.query;
  try {
    if (root === 'project') {
      const tree = await listFiles(PROJECT_ROOT, '', 0, 3000);
      return res.json(tree);
    }
    const dir = workspaceDir(workspace);
    if (!dir || !fs.existsSync(dir)) return sendError(res, 404, 'Workspace not found');
    const tree = await listFiles(dir, '', 0, 3000);
    res.json(tree);
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

router.get('/file', async (req, res) => {
  const { workspace, path: relPath, root } = req.query;
  try {
    const base = root === 'project' ? PROJECT_ROOT : workspaceDir(workspace);
    if (!base) return sendError(res, 400, 'Invalid path');
    const full = safeJoin(base, relPath);
    if (!full) return sendError(res, 403, 'Path traversal blocked');
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return sendError(res, 404, 'File not found');
    if (fs.statSync(full).size > MAX_FILE_SIZE) return sendError(res, 413, 'File too large');
    const content = await fsp.readFile(full, 'utf8');
    res.json({ content, path: relPath });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

router.post('/file', async (req, res) => {
  const { workspace, path: relPath, content } = req.body;
  const dir = workspaceDir(workspace);
  if (!dir) return sendError(res, 400, 'Invalid workspace');
  const full = safeJoin(dir, relPath);
  if (!full) return sendError(res, 403, 'Path traversal blocked');
  if (full === dir) return sendError(res, 400, 'Cannot write directory path');
  try {
    fs.mkdirSync(path.dirname(full), { recursive: true });
    await fsp.writeFile(full, String(content ?? ''), 'utf8');
    res.json({ success: true });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

router.post('/delete', async (req, res) => {
  const { workspace, path: relPath } = req.body;
  const dir = workspaceDir(workspace);
  if (!dir) return sendError(res, 400, 'Invalid workspace');
  const full = safeJoin(dir, relPath);
  if (!full || full === dir) return sendError(res, 403, 'Path traversal blocked');
  try {
    await fsp.rm(full, { recursive: true, force: true });
    res.json({ success: true });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

const BLOCKED_COMMANDS = ['rm -rf /', 'rm -rf ~', 'format c:', 'del /s /q c:', 'Remove-Item -Recurse', 'shutdown', 'format('];

const TEMPLATES = {
  blank: {
    label: 'Blank Starter',
    description: 'Just an empty index.html to start from absolute zero.',
    category: 'web',
    tags: ['HTML'],
    kind: 'static',
    files: {
      'index.html': '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>My Site</title>\n</head>\n<body>\n</body>\n</html>\n',
    },
  },
  static: {
    label: 'Static Site',
    description: 'A single-page HTML/CSS/JS starter with a dark gradient theme and an interactive button.',
    category: 'web',
    tags: ['HTML', 'CSS', 'JS'],
    kind: 'static',
    files: {
      'index.html': '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>My Site</title>\n  <link rel="stylesheet" href="style.css" />\n</head>\n<body>\n  <h1>Hello, world</h1>\n  <button id="btn">Click me</button>\n  <script src="script.js"></script>\n</body>\n</html>\n',
      'style.css': 'body { font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 100vh; background: linear-gradient(135deg, #0f0f14, #1b1b24); color: #e4e4e7; }\nbutton { padding: 10px 20px; border-radius: 8px; border: 1px solid #3f3f46; background: #27272a; color: #e4e4e7; cursor: pointer; }\nbutton:hover { background: #3f3f46; }\n',
      'script.js': 'document.getElementById("btn")?.addEventListener("click", () => alert("Hello!"));\n',
    },
  },
  tailwind: {
    label: 'Tailwind Landing Page',
    description: 'A polished landing page with Tailwind CSS via CDN — dark hero, features grid, responsive layout.',
    category: 'web',
    tags: ['HTML', 'Tailwind'],
    kind: 'static',
    files: {
      'index.html': '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>Landing Page</title>\n  <script src="https://cdn.tailwindcss.com"></script>\n</head>\n<body class="bg-slate-950 text-slate-100 antialiased">\n  <nav class="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">\n    <span class="text-lg font-bold tracking-tight">Acme<span class="text-violet-400">.</span></span>\n    <a href="#features" class="text-sm text-slate-400 hover:text-white transition-colors">Features</a>\n  </nav>\n  <header class="max-w-3xl mx-auto px-6 pt-20 pb-16 text-center">\n    <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">Build faster with <span class="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Acme</span></h1>\n    <p class="mt-4 text-slate-400 text-lg">The simplest way to ship products. No setup, no config — just speed.</p>\n    <div class="mt-8 flex gap-3 justify-center">\n      <button class="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 font-medium text-sm transition-colors">Get started</button>\n      <button class="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-medium text-sm transition-colors">Learn more</button>\n    </div>\n  </header>\n  <section id="features" class="max-w-5xl mx-auto px-6 pb-20 grid sm:grid-cols-3 gap-4">\n    <div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">\n      <div class="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold mb-3">1</div>\n      <h3 class="font-semibold">Lightning fast</h3>\n      <p class="text-sm text-slate-400 mt-1">Everything loads instantly on modern hardware.</p>\n    </div>\n    <div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">\n      <div class="w-8 h-8 rounded-lg bg-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 font-bold mb-3">2</div>\n      <h3 class="font-semibold">Secure by default</h3>\n      <p class="text-sm text-slate-400 mt-1">Best practices baked in, out of the box.</p>\n    </div>\n    <div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">\n      <div class="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold mb-3">3</div>\n      <h3 class="font-semibold">Easy to extend</h3>\n      <p class="text-sm text-slate-400 mt-1">Simple, readable code you can build on.</p>\n    </div>\n  </section>\n</body>\n</html>\n',
    },
  },
  react: {
    label: 'React + Vite',
    description: 'Modern React 19 app with the Vite dev server and hot reload — ready to deploy.',
    category: 'frontend',
    tags: ['React', 'Vite', 'JSX'],
    kind: 'node',
    files: {
      'package.json': JSON.stringify({
        name: 'react-app', private: true, version: '1.0.0', type: 'module',
        scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview', test: 'echo "no tests" && exit 0' },
        dependencies: { react: '^19.0.0', 'react-dom': '^19.0.0' },
        devDependencies: { '@vitejs/plugin-react': '^4.3.4', vite: '^6.0.0' },
      }, null, 2),
      'vite.config.js': "import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\nexport default defineConfig({ plugins: [react()] })\n",
      'index.html': '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>React App</title>\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module" src="/src/main.jsx"></script>\n</body>\n</html>\n',
      'src/main.jsx': "import React from 'react'\nimport { createRoot } from 'react-dom/client'\nimport App from './App.jsx'\nimport './index.css'\ncreateRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)\n",
      'src/App.jsx': "export default function App() {\n  return (\n    <div className=\"app\">\n      <h1>React + Vite</h1>\n      <p>Edit App.jsx and save to see changes.</p>\n    </div>\n  )\n}\n",
      'src/index.css': ':root { color-scheme: dark; }\nbody { margin: 0; font-family: system-ui, sans-serif; background: #0f0f14; color: #e4e4e7; }\n.app { display: grid; place-items: center; min-height: 100vh; }\n',
    },
  },
  express: {
    label: 'Node.js Express API',
    description: 'REST API server with CORS and health endpoints. Reads PORT from the environment.',
    category: 'backend',
    tags: ['Node.js', 'Express'],
    kind: 'node',
    files: {
      'package.json': JSON.stringify({
        name: 'express-api', private: true, version: '1.0.0', type: 'module',
        scripts: { start: 'node server.js', dev: 'node --watch server.js', test: 'echo "no tests" && exit 0' },
        dependencies: { express: '^4.21.0', cors: '^2.8.5' },
      }, null, 2),
      'server.js': "import express from 'express'\nimport cors from 'cors'\nconst app = express()\nconst port = process.env.PORT || 3000\napp.use(cors())\napp.use(express.json())\napp.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }))\napp.get('/api/greet', (req, res) => res.json({ message: 'Hello from Express' }))\napp.listen(port, () => console.log(`API listening on http://localhost:${port}`))\n",
      'README.md': '# Express API\n\n```bash\nnpm install\nnpm start\n```\n\nEndpoints: `GET /api/health`, `GET /api/greet`\n',
    },
  },
  python: {
    label: 'Python CLI',
    description: 'Minimal Python entrypoint with a requirements file to grow into anything.',
    category: 'cli',
    tags: ['Python'],
    kind: 'cli',
    files: {
      'main.py': 'import sys\n\ndef main():\n    print("Hello from Python!")\n\nif __name__ == "__main__":\n    main()\n',
      'requirements.txt': '# add dependencies here\n',
      'README.md': '# Python CLI\n\n```bash\npython main.py\n```\n',
    },
  },
};

router.get('/templates', (req, res) => {
  res.json(Object.entries(TEMPLATES).map(([id, t]) => ({ id, label: t.label, description: t.description, category: t.category, tags: t.tags, kind: t.kind, fileCount: Object.keys(t.files).length })));
});

router.post('/template', async (req, res) => {
  const { name, template } = req.body;
  const def = TEMPLATES[String(template || '')];
  if (!def) return sendError(res, 400, 'Unknown template');
  const safe = String(name || '').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 40) || `app-${Date.now()}`;
  const dir = workspaceDir(safe);
  if (!dir) return sendError(res, 400, 'Invalid name');
  try {
    fs.mkdirSync(dir, { recursive: true });
    for (const [rel, content] of Object.entries(def.files)) {
      const full = safeJoin(dir, rel);
      if (!full) continue;
      fs.mkdirSync(path.dirname(full), { recursive: true });
      await fsp.writeFile(full, content, 'utf8');
    }
    const u = authUser(req);
    touchProject(safe, { owner: u ? u.email : 'local', created: Date.now(), template });
    res.json({ success: true, name: safe, template });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

router.post('/clone', async (req, res) => {
  const { url, name } = req.body;
  const repoUrl = String(url || '').trim();
  if (!/^(https?:\/\/|git@|ssh:\/\/|git:\/\/)/i.test(repoUrl)) return sendError(res, 400, 'Invalid git URL');
  let safe = String(name || '').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 40);
  if (!safe) {
    const base = repoUrl.replace(/\.git$/i, '').split('/').pop();
    safe = (base || 'cloned-repo').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 40);
  }
  const dir = workspaceDir(safe);
  if (!dir) return sendError(res, 400, 'Invalid name');
  try {
    if (fs.existsSync(dir) && fs.readdirSync(dir).length > 0) return sendError(res, 409, `Workspace "${safe}" already exists`);
    const out = await new Promise((resolve) => {
      const child = spawn('git', ['clone', '--depth', '1', repoUrl, dir], { windowsHide: true });
      let output = '';
      const timer = setTimeout(() => { try { child.kill(); } catch {} }, 180000);
      child.stdout?.on('data', (d) => { if (output.length < 4000) output += d.toString(); });
      child.stderr?.on('data', (d) => { if (output.length < 4000) output += d.toString(); });
      child.on('error', (err) => { clearTimeout(timer); resolve({ code: -1, output: String(err.message || err) }); });
      child.on('close', (code) => { clearTimeout(timer); resolve({ code, output }); });
    });
    if (out.code !== 0) return sendError(res, 500, `Clone failed: ${out.output.slice(0, 800)}`);
    const u = authUser(req);
    touchProject(safe, { owner: u ? u.email : 'local', created: Date.now(), template: 'clone' });
    res.json({ success: true, name: safe });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

router.get('/git', async (req, res) => {
  const { workspace } = req.query;
  const dir = workspaceDir(workspace);
  if (!dir) return sendError(res, 400, 'Invalid workspace');
  const run = (args) => new Promise((resolve) => {
    const child = spawn('git', args, { cwd: dir, windowsHide: true });
    let out = '';
    const timer = setTimeout(() => { try { child.kill(); } catch {} }, 30000);
    child.stdout?.on('data', (d) => { if (out.length < 8000) out += d.toString(); });
    child.stderr?.on('data', (d) => { if (out.length < 8000) out += d.toString(); });
    child.on('error', (err) => { clearTimeout(timer); resolve({ code: -1, output: String(err.message || err) }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, output: out }); });
  });
  try {
    if (!fs.existsSync(path.join(dir, '.git'))) {
      const init = await run(['init', '-b', 'main']);
      return res.json({ isRepo: false, branch: null, status: [], output: init.output.slice(0, 500) });
    }
    const branchRes = await run(['branch', '--show-current']);
    const statusRes = await run(['status', '--short']);
    const status = statusRes.output.split('\n').filter(Boolean).map((l) => ({
      flag: l.slice(0, 2).trim() || '??',
      file: l.slice(3),
    }));
    // per-file line counts for tracked changes
    const numstatRes = await run(['diff', '--numstat', 'HEAD']);
    const counts = {};
    for (const line of numstatRes.output.split('\n')) {
      const parts = line.split('\t');
      if (parts.length < 3) continue;
      const [, , p] = parts;
      counts[p] = { added: parts[0] === '-' ? 0 : parseInt(parts[0], 10) || 0, removed: parts[1] === '-' ? 0 : parseInt(parts[1], 10) || 0 };
    }
    const untrackedRes = await run(['ls-files', '--others', '--exclude-standard']);
    for (const p of untrackedRes.output.split('\n').filter(Boolean)) {
      if (!counts[p]) counts[p] = { added: null, removed: null, untracked: true };
    }
    for (const s of status) {
      const c = counts[s.file];
      if (c) { s.added = c.added; s.removed = c.removed; s.untracked = !!c.untracked; }
      else { s.added = 0; s.removed = 0; s.untracked = s.flag === '??'; }
    }
    res.json({ isRepo: true, branch: branchRes.output.trim() || 'main', status, output: statusRes.output.slice(0, 4000) });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

function gitRun(dir, args, timeout = 30000) {
  return new Promise((resolve) => {
    const child = spawn('git', args, { cwd: dir, windowsHide: true });
    let out = '';
    const timer = setTimeout(() => { try { child.kill(); } catch {} }, timeout);
    child.stdout?.on('data', (d) => { if (out.length < 16000) out += d.toString(); });
    child.stderr?.on('data', (d) => { if (out.length < 16000) out += d.toString(); });
    child.on('error', (err) => { clearTimeout(timer); resolve({ code: -1, output: String(err.message || err) }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, output: out }); });
  });
}

async function gitHeadContent(dir, filePath) {
  const r = await gitRun(dir, ['show', `HEAD:${filePath}`], 15000);
  return r.code === 0 ? r.output : null;
}

// per-hunk staging state: workspace -> Map<file, baseline(HEAD + accepted hunks)> — drives diff display
const gitStaged = new Map();
function gitBaseline(ws, file) {
  const m = gitStaged.get(ws);
  return m?.get(file) ?? null;
}
function setGitBaseline(ws, file, baseline) {
  if (!gitStaged.has(ws)) gitStaged.set(ws, new Map());
  gitStaged.get(ws).set(file, baseline);
}

function buildHunkPatch(filePath, h, fromLines, toLines) {
  // single zero-context hunk patch (--unidiff-zero)
  const q = (p) => (/\s/.test(p) ? `"${p}"` : p);
  const lines = [
    `diff --git a/${q(filePath)} b/${q(filePath)}`,
    `--- a/${q(filePath)}`,
    `+++ b/${q(filePath)}`,
    `@@ -${h.oldStart},${h.oldLines.length} +${h.newStart},${h.newLines.length} @@`,
  ];
  for (const l of h.oldLines) lines.push(`-${l}`);
  for (const l of h.newLines) lines.push(`+${l}`);
  void fromLines; void toLines;
  return lines.join('\n') + '\n';
}

// per-file or all-file diffs vs HEAD (staged-hunk baseline aware)
router.get('/git/diff', async (req, res) => {
  const { workspace, path: filePath } = req.query;
  const dir = workspaceDir(workspace);
  if (!dir) return sendError(res, 400, 'Invalid workspace');
  try {
    if (filePath) {
      const oldBase = gitBaseline(workspace, filePath);
      const tracked = oldBase !== null || (await gitHeadContent(dir, filePath)) !== null;
      let old = tracked ? oldBase ?? (await gitHeadContent(dir, filePath)) ?? '' : '';
      let cur = '';
      const full = safeJoin(dir, filePath);
      if (full && fs.existsSync(full)) {
        const st = await fsp.stat(full);
        if (st.size <= MAX_FILE_SIZE) cur = await fsp.readFile(full, 'utf8');
      }
      old = old.replace(/\r\n/g, '\n');
      cur = cur.replace(/\r\n/g, '\n');
      if (!tracked && cur === '') return res.json({ file: null });
      const hunks = lineDiff(old ?? '', cur);
      let added = 0, removed = 0;
      for (const h of hunks) { added += h.newLines.length; removed += h.oldLines.length; }
      if (added === 0 && removed === 0) return res.json({ file: null });
      return res.json({ file: { path: filePath, tracked, added, removed, hunks } });
    }
    const untrackedRes = await gitRun(dir, ['ls-files', '--others', '--exclude-standard']);
    const untracked = untrackedRes.output.split('\n').filter(Boolean);
    const numstatRes = await gitRun(dir, ['diff', '--numstat', 'HEAD']);
    const files = [];
    for (const line of numstatRes.output.split('\n')) {
      const parts = line.split('\t');
      if (parts.length < 3) continue;
      files.push({ path: parts[2], tracked: true, added: parts[0] === '-' ? 0 : parseInt(parts[0], 10) || 0, removed: parts[1] === '-' ? 0 : parseInt(parts[1], 10) || 0 });
    }
    for (const p of untracked) {
      if (!files.some((f) => f.path === p)) files.push({ path: p, tracked: false, added: null, removed: null });
    }
    files.sort((a, b) => a.path.localeCompare(b.path));
    res.json({ files: files.slice(0, 60) });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

// per-hunk accept (real partial stage) / reject (undo hunk on disk)
router.post('/git/hunk', async (req, res) => {
  const { workspace, path: filePath, index, action } = req.body || {};
  const dir = workspaceDir(workspace);
  if (!dir) return sendError(res, 400, 'Invalid workspace');
  try {
    const baselineRaw = gitBaseline(workspace, filePath) ?? (await gitHeadContent(dir, filePath));
    const tracked = baselineRaw !== null;
    const baseline = (baselineRaw ?? '').replace(/\r\n/g, '\n');
    const full = safeJoin(dir, filePath);
    const curRaw = full && fs.existsSync(full) ? await fsp.readFile(full, 'utf8') : '';
    const cur = curRaw.replace(/\r\n/g, '\n');
    const hunks = lineDiff(tracked ? baseline : '', cur);
    const h = hunks[parseInt(index, 10)];
    if (!h) return sendError(res, 404, 'Hunk not found');
    if (action === 'reject') {
      if (tracked) {
        const next = applyHunk(cur, h.newStart, h.newLines, h.oldLines);
        const eol = curRaw.includes('\r') ? '\r\n' : '\n';
        if (full) await fsp.writeFile(full, next.replace(/\n/g, eol), 'utf8');
      } else if (full && fs.existsSync(full)) {
        await fsp.unlink(full);
      }
    } else {
      if (tracked) {
        const patch = buildHunkPatch(filePath, h, null, null);
        const tmp = path.join(os.tmpdir(), `hunk-${Date.now()}.patch`);
        await fsp.writeFile(tmp, patch, 'utf8');
        const apply = await gitRun(dir, ['apply', '--cached', '--unidiff-zero', tmp], 30000);
        await fsp.unlink(tmp).catch(() => {});
        if (apply.code !== 0) return sendError(res, 422, apply.output.slice(0, 800));
      } else {
        await gitRun(dir, ['add', '--', filePath], 15000);
      }
      setGitBaseline(workspace, filePath, applyHunk(baseline, h.oldStart, h.oldLines, h.newLines));
    }
    res.json({ success: true });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

router.post('/git', async (req, res) => {
  const { workspace, action, message } = req.body;
  const dir = workspaceDir(workspace);
  if (!dir) return sendError(res, 400, 'Invalid workspace');
  if (!['commit', 'push', 'pull', 'init'].includes(action)) return sendError(res, 400, 'Unknown action');
  const run = (args) => new Promise((resolve) => {
    const child = spawn('git', args, { cwd: dir, windowsHide: true });
    let out = '';
    const timer = setTimeout(() => { try { child.kill(); } catch {} }, 120000);
    child.stdout?.on('data', (d) => { if (out.length < 8000) out += d.toString(); });
    child.stderr?.on('data', (d) => { if (out.length < 8000) out += d.toString(); });
    child.on('error', (err) => { clearTimeout(timer); resolve({ code: -1, output: String(err.message || err) }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, output: out }); });
  });
  try {
    let result;
    if (action === 'init') {
      result = await run(['init', '-b', 'main']);
    } else if (action === 'commit') {
      const msg = String(message || 'Update from Neural IDE').replace(/[^\w\s.,!?()\/:;-]/g, '').slice(0, 200);
      const add = await run(['add', '-A']);
      result = add.code === 0 ? await run(['commit', '-m', msg]) : add;
      if (result.code === 0) gitStaged.delete(workspace);
    } else {
      result = await run([action]);
    }
    if (result.code !== 0 && !result.output.toLowerCase().includes('nothing to commit')) {
      return res.status(422).json({ error: result.output.slice(0, 1200), output: result.output.slice(0, 4000) });
    }
    res.json({ success: true, output: result.output.slice(0, 4000) });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

router.get('/git/log', async (req, res) => {
  const { workspace } = req.query;
  const dir = workspaceDir(workspace);
  if (!dir) return sendError(res, 400, 'Invalid workspace');
  try {
    if (!fs.existsSync(path.join(dir, '.git'))) return res.json({ commits: [] });
    const r = await gitRun(dir, ['log', '-n', '20', '--format=%h|%an|%ad|%s', '--date=short'], 20000);
    if (r.code !== 0) return res.json({ commits: [] });
    const commits = r.output.split('\n').filter(Boolean).map((l) => {
      const [hash, author, date, ...rest] = l.split('|');
      return { hash, author, date, message: rest.join('|') };
    });
    res.json({ commits });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

router.get('/git/branches', async (req, res) => {
  const { workspace } = req.query;
  const dir = workspaceDir(workspace);
  if (!dir) return sendError(res, 400, 'Invalid workspace');
  try {
    const r = await gitRun(dir, ['branch', '--format=%(refname:short)'], 15000);
    const cur = await gitRun(dir, ['branch', '--show-current'], 15000);
    const branches = r.output.split('\n').filter(Boolean);
    res.json({ branches, current: cur.output.trim() });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

router.post('/git/branch', async (req, res) => {
  const { workspace, name, action } = req.body || {};
  const dir = workspaceDir(workspace);
  if (!dir) return sendError(res, 400, 'Invalid workspace');
  const clean = String(name || '').trim().replace(/[^A-Za-z0-9._\/-]/g, '');
  if (!clean) return sendError(res, 400, 'Invalid branch name');
  try {
    const r = action === 'create'
      ? await gitRun(dir, ['checkout', '-b', clean], 30000)
      : await gitRun(dir, ['checkout', clean], 30000);
    if (r.code !== 0) return res.status(422).json({ error: r.output.slice(0, 1200) });
    res.json({ success: true, branch: clean });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

// AI-generated commit message from the current diff
router.post('/git/suggest-message', async (req, res) => {
  const { workspace } = req.body || {};
  const dir = workspaceDir(workspace);
  if (!dir) return sendError(res, 400, 'Invalid workspace');
  try {
    const stat = await gitRun(dir, ['diff', 'HEAD', '--stat'], 20000);
    const diff = await gitRun(dir, ['diff', 'HEAD'], 20000);
    const untracked = await gitRun(dir, ['ls-files', '--others', '--exclude-standard'], 15000);
    const sample = diff.output.split('\n').slice(0, 400).join('\n');
    const content = await callLLM({
      messages: [
        { role: 'system', content: 'You write concise conventional commit messages (e.g. "feat: add login flow"). Reply with ONLY the message, no quotes, no explanation, max 12 words.' },
        { role: 'user', content: `Files changed:\n${stat.output.slice(0, 1500)}\n${untracked.output.trim() ? 'New files:\n' + untracked.output.slice(0, 600) : ''}\n\nDiff sample:\n${sample.slice(0, 6000)}\n\nWrite a commit message:` },
      ],
      maxTokens: 80,
      temperature: 0.3,
      task: 'git-message',
    });
    const msg = String(content.content || '').replace(/[^\w\s.,!?()\/:;'-]/g, '').trim().slice(0, 120);
    if (!msg) return res.status(422).json({ error: 'Model returned empty message' });
    res.json({ message: msg });
  } catch (err) {
    sendError(res, 502, String(err.message || err).slice(0, 400));
  }
});


router.post('/run', async (req, res) => {
  const { workspace, command } = req.body;
  const dir = workspaceDir(workspace);
  if (!dir) return sendError(res, 400, 'Invalid workspace');
  if (!command || typeof command !== 'string') return sendError(res, 400, 'No command');
  if (BLOCKED_COMMANDS.some((b) => command.toLowerCase().includes(b.toLowerCase()))) {
    return sendError(res, 403, 'Command blocked by sandbox');
  }
  const child = spawn(command, { cwd: dir, shell: true, windowsHide: true });
  let output = '';
  const started = Date.now();
  const timer = setTimeout(() => { try { child.kill(); } catch {} }, 120000);
  child.stdout?.on('data', (d) => { if (output.length < MAX_OUTPUT) output += d.toString(); });
  child.stderr?.on('data', (d) => { if (output.length < MAX_OUTPUT) output += d.toString(); });
  child.on('error', (err) => {
    clearTimeout(timer);
    res.json({ exitCode: -1, output: String(err.message || err), durationMs: Date.now() - started });
  });
  child.on('close', (code) => {
    clearTimeout(timer);
    res.json({ exitCode: code, output: output.slice(0, MAX_OUTPUT), durationMs: Date.now() - started });
  });
});

router.get('/search', async (req, res) => {
  const { workspace, q, root } = req.query;
  const base = root === 'project' ? PROJECT_ROOT : workspaceDir(workspace);
  if (!base) return sendError(res, 400, 'Invalid path');
  const needle = String(q || '');
  if (!needle) return res.json([]);
  const results = [];
  const walk = async (dir, prefix) => {
    if (results.length >= 60) return;
    let items = [];
    try { items = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const item of items) {
      if (results.length >= 60) return;
      if (item.isDirectory()) {
        if (IGNORE_DIRS.has(item.name)) continue;
        await walk(path.join(dir, item.name), prefix ? `${prefix}/${item.name}` : item.name);
      } else {
        const ext = path.extname(item.name).toLowerCase();
        if (!['.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.json', '.md', '.py', '.mjs', '.cjs'].includes(ext)) continue;
        try {
          const stat = await fsp.stat(path.join(dir, item.name));
          if (stat.size > MAX_FILE_SIZE) continue;
          const content = await fsp.readFile(path.join(dir, item.name), 'utf8');
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(needle.toLowerCase())) {
              results.push({ file: prefix ? `${prefix}/${item.name}` : item.name, line: i + 1, text: lines[i].trim().slice(0, 200) });
              if (results.length >= 60) return;
            }
          }
        } catch {}
      }
    }
  };
  try {
    await walk(base, '');
    res.json(results);
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

const IMPORT_RE = /(?:from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;

router.get('/imports', async (req, res) => {
  const nodes = [];
  const edges = [];
  const seen = new Set();
  const base = PROJECT_ROOT;
  const srcBase = path.join(base, 'src');
  if (!fs.existsSync(srcBase)) return res.json({ nodes, edges });
  const walk = async (dir, prefix) => {
    let items = [];
    try { items = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const item of items) {
      if (item.isDirectory()) {
        if (IGNORE_DIRS.has(item.name) || item.name === 'components' || item.name === 'assets' || item.name === 'utils' || item.name === 'config' || item.name === 'locales' || item.name === 'types') {
          if (nodes.length >= 100) return;
          continue;
        }
        await walk(path.join(dir, item.name), prefix ? `${prefix}/${item.name}` : item.name);
      } else {
        if (nodes.length >= 100) return;
        const ext = path.extname(item.name).toLowerCase();
        if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) continue;
        const rel = prefix ? `${prefix}/${item.name}` : item.name;
        let content = '';
        try { content = await fsp.readFile(path.join(dir, item.name), 'utf8'); } catch { continue; }
        if (!seen.has(rel)) { seen.add(rel); nodes.push({ id: rel, group: path.basename(rel) }); }
        let m;
        IMPORT_RE.lastIndex = 0;
        while ((m = IMPORT_RE.exec(content)) !== null) {
          const target = (m[1] || m[2] || m[3] || '').trim();
          if (!target || target.startsWith('http') || target.startsWith('node:') || target.startsWith('@')) continue;
          if (edges.length >= 250) break;
          edges.push({ from: rel, to: target });
        }
      }
    }
  };
  try {
    await walk(srcBase, 'src');
    res.json({ nodes: nodes.slice(0, 100), edges: edges.slice(0, 250) });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

router.get('/index', async (req, res) => {
  const { workspace, force } = req.query;
  const dir = workspaceDir(workspace);
  if (!dir || !fs.existsSync(dir)) return sendError(res, 404, 'Workspace not found');
  try {
    const idx = await buildIndex(workspace, { force: String(force) === '1' || String(force) === 'true' });
    if (!idx) return sendError(res, 404, 'Workspace not found');
    res.json({
      version: idx.version,
      workspace: idx.workspace,
      updatedAt: idx.updatedAt,
      stats: idx.stats,
      files: idx.files,
      symbols: idx.symbols,
      routes: idx.routes,
      apis: idx.apis,
      database: idx.database,
      deps: idx.deps,
      envVars: idx.envVars,
      edges: idx.edges.slice(0, 2000),
    });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

router.get('/index/search', async (req, res) => {
  const { workspace, q, kind } = req.query;
  try {
    await ensureIndex(workspace);
    res.json({ results: searchSymbols(workspace, q, kind) });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

// symbols of a single file, sorted by line — powers the editor outline panel
router.get('/index/file-symbols', async (req, res) => {
  const { workspace, file } = req.query;
  if (!file) return sendError(res, 400, 'Missing file');
  try {
    await ensureIndex(workspace);
    const idx = getIndex(workspace);
    const syms = (idx?.symbols || [])
      .filter((s) => s.file === file)
      .sort((a, b) => (a.line || 0) - (b.line || 0))
      .slice(0, 500)
      .map((s) => ({ id: s.id, name: s.name, kind: s.kind, line: s.line, signature: s.signature }));
    res.json({ results: syms });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

router.get('/index/graph', async (req, res) => {
  const { workspace, node, depth, type } = req.query;
  try {
    await ensureIndex(workspace);
    res.json(graphFor(workspace, node, { depth: parseInt(depth, 10) || 1, type: type || 'all' }));
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

router.get('/index/context', async (req, res) => {
  const { workspace, q, limit } = req.query;
  try {
    await ensureIndex(workspace);
    res.json(contextFor(workspace, q, { limit: Math.min(parseInt(limit, 10) || 8, 30) }));
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

router.post('/index/semantic', async (req, res) => {
  const { workspace, q, limit, filePrefix } = req.body || {};
  if (!workspace || !q) return sendError(res, 400, 'workspace and q required');
  try {
    await ensureIndex(workspace);
    res.json({ results: semanticSearch(workspace, q, { limit: Math.min(parseInt(limit, 10) || 8, 30), filePrefix: filePrefix || null }) });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

router.post('/context/build', async (req, res) => {
  const { workspace, task, history, memory, refFiles, budget } = req.body || {};
  if (!workspace || !task) return sendError(res, 400, 'workspace and task required');
  try {
    const dir = workspaceDir(workspace);
    if (!dir) return sendError(res, 404, 'Workspace not found');
    let memoryText = memory;
    if (typeof memoryText !== 'string') {
      const mdPath = path.join(dir, '.memory', 'memory.md');
      memoryText = fs.existsSync(mdPath) ? await fsp.readFile(mdPath, 'utf8') : '';
    }
    const pkg = await buildContext({ workspace, task, history: String(history || ''), memory: memoryText, refFiles, budget: parseInt(budget, 10) || 16000 });
    res.json(pkg);
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

router.get('/memory', async (req, res) => {
  const { workspace } = req.query;
  const dir = workspaceDir(workspace);
  if (!dir) return sendError(res, 400, 'Invalid workspace');
  try {
    const mdPath = path.join(dir, '.memory', 'memory.md');
    const jsonPath = path.join(dir, '.memory', 'project-memory.json');
    let markdown = '';
    let structured = { architecture: '', conventions: '', decisions: [], preferences: [], frequentlyModified: [] };
    if (fs.existsSync(mdPath)) markdown = await fsp.readFile(mdPath, 'utf8');
    if (fs.existsSync(jsonPath)) {
      try { structured = { ...structured, ...JSON.parse(await fsp.readFile(jsonPath, 'utf8')) }; } catch {}
    }
    res.json({ markdown, structured });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

router.post('/memory', async (req, res) => {
  const { workspace, markdown, structured } = req.body;
  const dir = workspaceDir(workspace);
  if (!dir) return sendError(res, 400, 'Invalid workspace');
  try {
    const memDir = path.join(dir, '.memory');
    fs.mkdirSync(memDir, { recursive: true });
    if (markdown !== undefined) await fsp.writeFile(path.join(memDir, 'memory.md'), String(markdown), 'utf8');
    if (structured !== undefined) await fsp.writeFile(path.join(memDir, 'project-memory.json'), JSON.stringify(structured, null, 2), 'utf8');
    res.json({ success: true });
  } catch (err) {
    sendError(res, 500, err.message);
  }
});

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.woff': 'font/woff', '.woff2': 'font/woff2',
};

router.get('/preview', async (req, res) => {
  const { workspace } = req.query;
  const dir = workspaceDir(workspace);
  if (!dir) return sendError(res, 400, 'Invalid workspace');
  let rel = String(req.query.path || 'index.html').replace(/^\/+/, '');
  const full = safeJoin(dir, rel);
  if (!full) return sendError(res, 403, 'Path traversal blocked');
  if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
    const idx = safeJoin(full, 'index.html');
    if (idx && fs.existsSync(idx)) return res.sendFile(idx);
    return sendError(res, 404, 'No index.html in directory');
  }
  if (!fs.existsSync(full)) return sendError(res, 404, 'Not found');
  const ext = path.extname(full).toLowerCase();
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(full);
});

function normalizeChatBaseUrl(rawBaseUrl = '') {
  let baseUrl = String(rawBaseUrl || '').trim();
  if (!baseUrl) return '';
  if (baseUrl.includes('localhost:11434') && !baseUrl.includes('/v1') && !baseUrl.includes('/api/')) {
    baseUrl = baseUrl.endsWith('/') ? baseUrl + 'v1' : baseUrl + '/v1';
  }
  return baseUrl.replace(/\/+$/, '');
}

async function callLLM({ messages, json = false, maxTokens = 2048, temperature = 0.3, task = 'agent' }) {
  const active = await query('SELECT * FROM models WHERE is_active = true ORDER BY created_at DESC LIMIT 1');
  const candidates = active.rows.length > 0 ? active.rows : (await query('SELECT * FROM models WHERE api_key IS NOT NULL AND api_key != \'\' ORDER BY created_at DESC')).rows;
  if (candidates.length === 0) {
    const ollama = await query('SELECT * FROM models WHERE provider ILIKE \'%ollama%\' LIMIT 1');
    if (ollama.rows.length > 0) candidates.push(ollama.rows[0]);
  }
  if (candidates.length === 0) throw new Error('NO_ACTIVE_MODEL: activate a model in the Model Hub first');
  let lastError = null;
  for (const model of candidates) {
    const baseUrl = normalizeChatBaseUrl(model.base_url);
    const url = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
    const started = Date.now();
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (model.api_key) headers.Authorization = `Bearer ${model.api_key}`;
      let extraHeaders = {};
      try { extraHeaders = model.headers || {}; } catch {}
      Object.assign(headers, extraHeaders);
      const body = {
        model: model.model_id,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      };
      if (json && model.supports_json !== false) body.response_format = { type: 'json_object' };
      if (model.custom_params) {
        try { Object.assign(body, model.custom_params); } catch {}
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Number(model.timeout_ms || 120000));
      const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
      clearTimeout(timer);
      const latency = Date.now() - started;
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = data.error?.message || data.message || `HTTP ${response.status}`;
        await logUsage(model, task, 0, 0, latency, false, message);
        lastError = new Error(message);
        continue;
      }
      const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
      const usage = data.usage || {};
      await logUsage(model, task, usage.prompt_tokens || 0, usage.completion_tokens || 0, latency, true);
      if (!content && data.choices?.[0]?.message?.reasoning_content && data.choices?.[0]?.finish_reason === 'length' && maxTokens < 32768) {
        console.log(`[callLLM] ${model.model_id} hit reasoning token limit (${maxTokens}) — retrying with ${maxTokens * 2} tokens (${task})`);
        const retry = await callLLM({ messages, json, maxTokens: maxTokens * 2, temperature, task });
        return retry;
      }
      return { content, model: { id: model.id, name: model.name, provider: model.provider } };
    } catch (err) {
      const latency = Date.now() - started;
      await logUsage(model, task, 0, 0, latency, false, String(err.message || err));
      lastError = err;
    }
  }
  throw lastError || new Error('All models failed');
}

async function logUsage(model, task, tokensIn, tokensOut, latencyMs, success, error = null) {
  try {
    await query(
      'INSERT INTO model_usage (model_id, model_name, provider, task, tokens_in, tokens_out, latency_ms, success, error) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [model.id, model.name, model.provider, task, tokensIn, tokensOut, latencyMs, success, error]
    );
  } catch {}
}

function extractJson(text) {
  if (!text) return null;
  let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}
  return null;
}

function execCommand(dir, cmd, timeoutMs = 45000) {  return new Promise((resolve) => {
    let out = '';
    let child;
    try {
      child = spawn(cmd, { cwd: dir, shell: true, windowsHide: true });
    } catch (e) {
      return resolve({ exitCode: -1, output: String(e.message || e) });
    }
    const timer = setTimeout(() => { try { child.kill(); } catch {} }, timeoutMs);
    child.stdout?.on('data', (d) => { if (out.length < 6000) out += d.toString(); });
    child.stderr?.on('data', (d) => { if (out.length < 6000) out += d.toString(); });
    child.on('error', (err) => { clearTimeout(timer); resolve({ exitCode: -1, output: String(err.message || err) }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ exitCode: code, output: out.slice(0, 6000) }); });
  });
}

function lintVerifyCmd(cmd) {
  const positions = [];
  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i];
    if (ch === '"') positions.push(i);
    else if ((ch === '<' || ch === '>') && positions.length % 2 === 0) return `unquoted ${ch} outside double quotes (cmd treats it as redirection)`;
  }
  if (positions.length % 2 !== 0) return 'unbalanced double quotes';
  for (let k = 0; k < positions.length; k += 2) {
    if (cmd.slice(positions[k] + 1, positions[k + 1]).includes('"')) return 'nested double quotes inside a quoted string — cmd cannot parse this';
  }
  return null;
}

const VERIFY_BROKEN = /cannot open|is not recognized|not recognized as|cannot find the file|not found as an/i;

const AGENTS = {
  planner: { title: 'Planner', icon: '🧭', prompt: `You are the Planner Agent. Break the user goal into an implementation roadmap grounded in the repository context below (file paths, symbols, routes, deps).

Rules:
- Reference EXACT file paths and symbol names from the context. Never invent files that do not exist; if a file must be created, name it explicitly under the workspace root.
- Order steps so each one is independently verifiable (build, run, or content-check).
- Every step MUST include a "verify" hint describing how to confirm it works.
- Honor explicit scope budgets from the user. If they ask for exactly one implementation step, return exactly one step containing every required target file.
- IMPORTANT: verify commands run in a WINDOWS cmd shell. No grep. Use e.g. findstr /C:"text" index.html, node --check script.js, npm run build. NEVER use start, open, explorer, notepad, or any command that does not check content or build state.

Reply with STRICT JSON only, no markdown:
{"roadmap":[{"milestone": string, "goal": string, "steps":[{"action": string, "target": [string], "verify": string}]}]}
"target" is the list of file paths the step touches. Do not write any code files.` },
  architect: { title: 'Architect', icon: '🏛️', prompt: 'You are the Architect Agent. Based on the current workspace files, the roadmap, and design patterns, recommend the file structure, design patterns, and consistency rules. Reply with STRICT JSON only: {"structure": [string], "patterns": [string], "consistency": [string]}. Do not write files.' },
  coder: { title: 'Coder', icon: '👨‍💻', prompt: 'You are the Coder Agent. Implement the feature requested. Write production-quality, runnable code. Reuse existing files when possible. Reply with STRICT JSON only: {"files": [{"path": string, "content": string}]}. Paths are relative to the workspace root. Every file must have a complete content. Do not skip files. Never wrap the JSON in markdown.' },
  debugger: { title: 'Debugger', icon: '🐞', prompt: 'You are the Debugging Agent. The build failed with the error below. Analyze it and produce corrected file contents. Reply with STRICT JSON only: {"analysis": string, "fixes": [{"path": string, "content": string}]}. Only include files that need fixing. Never wrap JSON in markdown.' },
  reviewer: { title: 'Reviewer', icon: '🔍', prompt: `You are the Reviewer Agent. Review the code quality, security, and correctness of the generated files against the task.

Before scoring, resolve every local JavaScript import and HTML script/stylesheet reference. Compare every explicit task requirement to actual UI, event handlers, and persistence logic; placeholders do not count. A missing local module, a browser-load crash, or an absent required feature is at least a major issue.

Scoring rubric (0-100): start at 85. Deduct 25 per critical issue (security hole, broken logic, crash on load), 15 per major issue (task not fully implemented, broken feature), 5 per minor issue (style, a11y, edge cases). Do not be overly harsh for a small static app; reward working, complete implementations with 80+.

Reply with STRICT JSON only: {"score": number, "issues": [{"severity": "critical"|"major"|"minor", "file": string, "detail": string}], "suggestions": [string]}. No code changes.` },
  tester: { title: 'Tester', icon: '🧪', prompt: 'You are the Testing Agent. For the files below, decide what automated tests are needed and list them. Reply with STRICT JSON only: {"tests": [{"file": string, "purpose": string}], "recommendations": [string]}. Do not write files.' },
  docs: { title: 'Documentation', icon: '📚', prompt: 'You are the Documentation Agent. Write a README.md for this project in plain markdown covering: overview, structure, setup, usage. Reply with STRICT JSON only: {"readme": string}. Use escaped newlines inside the JSON string.' },
  fixer: { title: 'Fixer', icon: '🔧', prompt: 'You are the Fix Agent. Apply the reviewer findings: fix the listed issues in the given files. Reply with STRICT JSON only: {"files": [{"path": string, "content": string}]} — COMPLETE new content for every changed file (full file, not a diff). Only fix the listed issues; keep everything else identical.' },
  summary: { title: 'Summary', icon: '✅', prompt: '' },
};

router.post('/agents/run', async (req, res) => {
  const { workspace, task, autoBuild = true, autoTest = true, maxRetries = 3, contextFiles = [], reviewThreshold = 70, autoBrowser = true } = req.body;
  const dir = workspaceDir(workspace);
  if (!dir) return sendError(res, 400, 'Invalid workspace');
  if (!task || typeof task !== 'string' || !task.trim()) return sendError(res, 400, 'Task is required');
  if (activeAgentRuns.has(workspace)) return sendError(res, 409, 'An agent run is already active for this workspace');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const runControl = { cancelled: false };
  activeAgentRuns.set(workspace, runControl);
  res.on('close', () => {
    if (!res.writableEnded) runControl.cancelled = true;
  });
  const ensureActive = () => {
    if (runControl.cancelled) throw cancelledRunError();
  };

  const emit = (event, payload) => {
    try { res.write(`data: ${JSON.stringify({ event, ...payload })}\n\n`); } catch {}
  };

  const step = (agent, status, message, detail = null) => emit('step', { agent, status, message, detail, at: Date.now() });

  const sendText = (kind, content) => emit('log', { kind, content, at: Date.now() });

  const heartbeat = setInterval(() => {
    try { res.write(`: ping ${Date.now()}\n\n`); } catch {}
  }, 15000);

  try {
    ensureActive();
    const [tree, memoryRes] = await Promise.all([
      listFiles(dir, '', 0, 1500),
      (async () => {
        try {
          const mdPath = path.join(dir, '.memory', 'memory.md');
          return fs.existsSync(mdPath) ? await fsp.readFile(mdPath, 'utf8') : '';
        } catch { return ''; }
      })(),
    ]);
    const fileList = [];
    const walk = (list) => { for (const f of list) { if (f.type === 'file') fileList.push(f.path); if (f.children) walk(f.children); } };
    walk(tree);
    const runFiles = new Set();
    await snapshotWorkspace(workspace, dir);
    workspaceRunFiles.set(workspace, runFiles);
    const history = (await loadChat(workspace, dir)).slice(-8);
    const historyText = history.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${String(m.content).slice(0, 2000)}`).join('\n');
    step('context', 'running', 'Assembling context from repository index');
    const ctxPkg = await buildContext({ workspace, task, history: historyText, memory: memoryRes, refFiles: contextFiles });
    ensureActive();
    const ctx = ctxPkg.text + (historyText ? '\n\nThis run continues that conversation — the user task above is the latest instruction.' : '');
    sendText('context', `files: ${ctxPkg.files.length} · symbols: ${ctxPkg.symbols.length} · routes: ${ctxPkg.routes.length} · deps: ${ctxPkg.deps.length} · ${ctxPkg.chars} chars`);
    step('context', 'done', 'Context ready', `${ctxPkg.files.length} files, ${ctxPkg.symbols.length} symbols, ${ctxPkg.routes.length} routes`);
    await appendChat(workspace, dir, 'user', task);

    step('planner', 'running', 'Analyzing goal and building roadmap');
    const planResp = await callLLM({ messages: [{ role: 'system', content: AGENTS.planner.prompt }, { role: 'user', content: ctx }], json: true, temperature: 0.4, task: 'planner' });
    ensureActive();
    const plan = extractJson(planResp.content) || { roadmap: [] };
    let roadmap = (Array.isArray(plan.roadmap) ? plan.roadmap : []).map((m) => ({
      milestone: String(m?.milestone || 'Milestone'),
      goal: String(m?.goal || ''),
      steps: (Array.isArray(m?.steps) ? m.steps : []).map((s) =>
        typeof s === 'string' ? { action: s, target: [], verify: '' } : {
          action: String(s?.action || ''),
          target: Array.isArray(s?.target) ? s.target.map(String) : [],
          verify: String(s?.verify || ''),
        }
      ),
    }));
    if (/\bexactly one (?:implementation )?step\b/i.test(task)) {
      const allSteps = roadmap.flatMap((milestone) => milestone.steps);
      const taskFiles = [...String(task).matchAll(/\b([a-zA-Z0-9._-]+\.(?:html|css|js|mjs|cjs|ts|tsx|json))\b/g)].map((m) => m[1]);
      const noPkg = /\b(?:do not|don't|never|without|no)\b[^.\n]*package\.json/i.test(String(task));
      const targets = [...new Set([...allSteps.flatMap((step) => step.target).filter(Boolean), ...taskFiles])].filter((t) => !(noPkg && /^package(?:-lock)?\.json$/i.test(t)));
      const preferredVerify = allSteps.map((step) => step.verify).find((verify) => /node --check|npm run build/i.test(verify)) || allSteps.find((step) => step.verify)?.verify || '';
      roadmap = [{
        milestone: roadmap[0]?.milestone || 'Implementation',
        goal: roadmap.map((milestone) => milestone.goal).filter(Boolean).join(' ') || String(task),
        steps: [{ action: 'Implement the requested feature across all required files', target: targets, verify: preferredVerify }],
      }];
    }
    const taskVerifyCmd = String(task).match(/\bnode\s+--check\s+[a-zA-Z0-9._\-\/]+/i)?.[0].replace(/\.+$/, '') || '';
    const sanityVerify = taskVerifyCmd || roadmap.flatMap((m) => m.steps).map((s) => s.verify).find((v) => /node --check|npm run build/i.test(String(v))) || '';
    const planText = JSON.stringify(roadmap, null, 1);
    sendText('plan', planText.slice(0, 4000));
    step('planner', 'done', 'Roadmap ready', roadmap.map((m) => m.milestone).join(' → ') || 'No milestones');

    let arch = null;
    if (fileList.length > 0) {
      step('architect', 'running', 'Analyzing architecture and design patterns');
      try {
        ensureActive();
        const archResp = await callLLM({ messages: [{ role: 'system', content: AGENTS.architect.prompt }, { role: 'user', content: `${ctx}\n\nRoadmap:\n${planText}` }], json: true, temperature: 0.4, task: 'architect' });
        ensureActive();
        arch = extractJson(archResp.content);
        step('architect', 'done', 'Architecture brief ready', Array.isArray(arch?.patterns) ? arch.patterns.join(', ') : 'No patterns');
      } catch (err) {
        step('architect', 'error', `Architect failed: ${err.message}`);
      }
    }

    let generatedFiles = [];
    const applyCodeFiles = async (respContent) => {
      ensureActive();
      const res = extractJson(respContent);
      if (!res || !Array.isArray(res.files) || res.files.length === 0) throw new Error('No valid files returned');
      const written = [];
      for (const f of res.files) {
        ensureActive();
        const full = safeJoin(dir, f.path);
        if (!full || full === dir) continue;
        try { if (fs.statSync(full).isDirectory()) continue; } catch {}
        fs.mkdirSync(path.dirname(full), { recursive: true });
        const content = String(f.content ?? '');
        const CHUNK = 220;
        const chunks = [];
        for (let i = 0; i < content.length; i += CHUNK) chunks.push(content.slice(i, i + CHUNK));
        for (let i = 0; i < chunks.length; i++) {
          emit('stream', { path: f.path, chunk: chunks[i], index: i, total: chunks.length });
          await new Promise((r) => setTimeout(r, 10));
        }
        try {
          await fsp.writeFile(full, content, 'utf8');
          if (!generatedFiles.includes(f.path)) generatedFiles.push(f.path);
          runFiles.add(f.path);
          written.push(f.path);
        } catch (writeErr) {
          sendText('build', `write error for ${f.path}: ${writeErr.message}`);
        }
      }
      return written;
    };

    const stepFilesSnippet = async (targets) => {
      let out = '';
      const seen = new Set();
      for (const t of (targets || []).slice(0, 5)) {
        if (!t || seen.has(t)) continue;
        seen.add(t);
        const full = safeJoin(dir, t);
        if (full && fs.existsSync(full)) {
          const content = await fsp.readFile(full, 'utf8');
          const MAX = 60000;
          out += `\n===== FILE ${t} (${content.length} chars) =====\n${content.length > MAX ? content.slice(0, MAX) + '\n...(truncated)' : content}\n`;
        } else {
          out += `\n===== FILE ${t} (does not exist yet — create it) =====\n`;
        }
      }
      return out || '\n(no target files specified — touch only files that are strictly required)\n';
    };

    const EXECUTOR_PROMPT = `You are the Execution Agent. Implement EXACTLY ONE step of the roadmap in the workspace.
Rules:
- Make minimal, surgical changes using the exact file paths from the current file list.
- Every file you return MUST contain its COMPLETE new content (full file, not a diff).
- Keep the existing code style; do not touch unrelated code.
- If the step requires a new file, create it with a complete, runnable implementation.
Reply with STRICT JSON only: {"files":[{"path":string,"content":string}], "note":string}. No markdown, no prose outside the JSON.`;

    let execSummary = null;
    if (roadmap.some((m) => m.steps.length > 0)) {
      const allSteps = [];
      for (const m of roadmap) for (const s of m.steps) allSteps.push({ milestone: m.milestone, action: s.action, target: s.target || [], verify: s.verify || '' });
      const totalSteps = allSteps.length;
      let verified = 0;
      step('executor', 'running', 'Executing roadmap step by step');
      for (let i = 0; i < totalSteps; i++) {
        ensureActive();
        const st = allSteps[i];
        step('executor', 'running', `Step ${i + 1}/${totalSteps}: ${st.action}`, `[${st.milestone}]`);
        sendText('exec', JSON.stringify({ index: i + 1, total: totalSteps, milestone: st.milestone, action: st.action, status: 'running' }));
        try {
          const snippet = await stepFilesSnippet(st.target);
          let execResp = null;
          for (let attempt = 1; attempt <= 2; attempt++) {
            ensureActive();
            execResp = await callLLM({ messages: [{ role: 'system', content: EXECUTOR_PROMPT }, { role: 'user', content: `Full user task (obey ALL constraints, including file scope):\n${task}\n\nWorkspace: ${workspace}\nFiles: ${ctxPkg.files.map((f) => `${f.path}${f.line ? `:${f.line}` : ''} (${f.reason})`).join('; ')}\nSymbols:\n${ctxPkg.symbols.slice(0, 60).join('\n')}${ctxPkg.routes.length ? `\nRoutes:\n${ctxPkg.routes.map((r) => `${r.method} ${r.path} — ${r.file}`).join('\n')}` : ''}${ctxPkg.deps.length ? `\nDependencies: ${ctxPkg.deps.join(', ')}` : ''}\n\nMilestone: ${st.milestone}\nStep to implement: ${st.action}\nVerification after: ${st.verify || 'manual review'}\n\nCurrent contents of target files:\n${snippet}` }], json: true, maxTokens: 8192, temperature: 0.3, task: 'executor' });
            const parsed = extractJson(execResp.content);
            if (parsed && Array.isArray(parsed.files) && parsed.files.length > 0) break;
            console.log('[executor] no valid files (attempt ' + attempt + '):', String(execResp.content || '').slice(0, 600));
            if (attempt === 1) {
              sendText('build', 'executor returned no valid files — retrying with strict JSON reminder');
              execResp = null;
            }
          }
          const written = await applyCodeFiles(execResp.content);
          sendText('files', written.join('\n'));
          let ok = true;
          let vOut = '';
          if (st.verify && st.verify.trim()) {
            sendText('exec', JSON.stringify({ index: i + 1, total: totalSteps, milestone: st.milestone, action: st.action, status: 'fixing' }));
            let lintReason = lintVerifyCmd(st.verify);
            let v = null;
            if (!lintReason) {
              v = await execCommand(dir, st.verify, 45000);
              vOut = v.output;
              ok = v.exitCode === 0;
            } else {
              ok = false;
              vOut = `malformed command (${lintReason}): ${st.verify}`;
            }
            let attempt = 0;
            while (!ok && attempt < maxRetries) {
              ensureActive();
              attempt++;
              step('executor', 'running', `Verification failed for step ${i + 1} — fixing (attempt ${attempt})`, vOut.slice(0, 300));
              try {
                if (lintReason || VERIFY_BROKEN.test(vOut)) {
                  const vcResp = await callLLM({ messages: [{ role: 'system', content: 'You repair a broken verification command for a WINDOWS cmd shell. Reply STRICT JSON only: {"verify": string} — a SINGLE one-line command (no grep; use findstr /C:"text" file, node --check file.js, npm run build). Use ONLY double quotes around search strings, always closed; never single quotes; every argument quoted if it contains spaces.' }, { role: 'user', content: `Step: ${st.action}\nBroken command: ${st.verify}\nError:\n${vOut.slice(0, 800)}` }], json: true, maxTokens: 512, temperature: 0.2, task: 'executor' });
                  const vc = extractJson(vcResp.content);
                  if (vc && vc.verify && typeof vc.verify === 'string') {
                    st.verify = vc.verify.replace(/^`+|`+$/g, '').trim();
                    sendText('build', `repaired verify command: ${st.verify}`);
                  }
                } else {
                  const snippet2 = await stepFilesSnippet(st.target);
                  const fixResp = await callLLM({ messages: [{ role: 'system', content: EXECUTOR_PROMPT + '\n\nYour previous implementation FAILED verification. Fix the files below.' }, { role: 'user', content: `Full user task (obey ALL constraints):\n${task}\n\nStep: ${st.action}\nVerification command: ${st.verify}\nVerification output (exit ${v ? v.exitCode : -1}):\n${vOut.slice(0, 3000)}\n\nCurrent contents:\n${snippet2}` }], json: true, maxTokens: 8192, temperature: 0.3, task: 'executor' });
                  await applyCodeFiles(fixResp.content);
                }
              } catch (fixErr) {
                sendText('build', `Fix attempt ${attempt} error: ${fixErr.message}`);
              }
              lintReason = lintVerifyCmd(st.verify);
              if (!lintReason) {
                v = await execCommand(dir, st.verify, 45000);
                ensureActive();
                vOut = v.output;
                ok = v.exitCode === 0;
              } else {
                ok = false;
                vOut = `malformed command (${lintReason}): ${st.verify}`;
              }
            }
            if (!ok && st.target && st.target.length > 0) {
              const missing = [];
              for (const t of st.target.slice(0, 5)) {
                const full = safeJoin(dir, t);
                if (!full || !fs.existsSync(full)) { missing.push(t); continue; }
                try { const stt = fs.statSync(full); if (stt.isDirectory() || stt.size === 0) missing.push(t); } catch { missing.push(t); }
              }
              if (missing.length === 0) {
                ok = true;
                vOut = 'verified via presence check (verify command unreliable)';
                sendText('build', `✓ presence check passed for step ${i + 1}/${totalSteps}: ${st.target.join(', ')}`);
              }
            }
            sendText('build', ok ? `✓ verified step ${i + 1}/${totalSteps}: ${st.action}\n${vOut.slice(0, 400)}` : `✗ verification still failing for step ${i + 1}/${totalSteps}: ${st.action}\n${vOut.slice(0, 400)}`);
          }
          if (ok) verified++;
          step('executor', ok ? 'done' : 'error', `Step ${i + 1}/${totalSteps} ${ok ? 'verified' : 'verification failed'}`, st.action);
          sendText('exec', JSON.stringify({ index: i + 1, total: totalSteps, milestone: st.milestone, action: st.action, status: ok ? 'done' : 'failed' }));
        } catch (err) {
          step('executor', 'error', `Step ${i + 1}/${totalSteps} failed`, String(err.message).slice(0, 300));
          sendText('exec', JSON.stringify({ index: i + 1, total: totalSteps, milestone: st.milestone, action: st.action, status: 'failed' }));
        }
      }
      sendText('files', generatedFiles.join('\n'));
      execSummary = { total: totalSteps, verified };
      step('executor', 'done', `Executed ${totalSteps} step(s), ${verified} verified`, `${totalSteps - verified} step(s) not fully verified`);
    } else {
      step('coder', 'running', 'Generating implementation');
      const coderPrompt = AGENTS.coder.prompt + `\n\nContext:\n${ctx}\n\nRoadmap (implement ALL steps of ALL milestones):\n${planText}\n\nArchitect brief (if any): ${arch ? JSON.stringify(arch) : 'none'}`;
      const codeResp = await callLLM({ messages: [{ role: 'system', content: coderPrompt }, { role: 'user', content: `Implement: ${task}` }], json: true, maxTokens: 8192, temperature: 0.35, task: 'coder' });
      ensureActive();
      const code = extractJson(codeResp.content);
      if (!code || !Array.isArray(code.files) || code.files.length === 0) {
        console.log('[coder] raw response:', String(codeResp.content || '').slice(0, 1500));
        const retryResp = await callLLM({ messages: [{ role: 'system', content: 'You are a code generator. Produce ONLY a JSON object: {"files":[{"path":string,"content":string}]}. Every changed file must have its COMPLETE new content. No markdown, no prose, no commentary.' }, { role: 'user', content: coderPrompt + '\n\nTask: ' + task }], json: true, maxTokens: 8192, temperature: 0.3, task: 'coder' });
        console.log('[coder] retry raw:', String(retryResp.content || '').slice(0, 800));
        const code2 = extractJson(retryResp.content);
        if (!code2 || !Array.isArray(code2.files) || code2.files.length === 0) {
          throw new Error('Coder returned no valid files');
        }
        code.files = code2.files;
      }
      await applyCodeFiles(JSON.stringify(code));
      sendText('files', generatedFiles.join('\n'));
      step('coder', 'done', `Wrote ${generatedFiles.length} file(s)`, generatedFiles.join(', '));
    }

    let buildResult = null;
    let testResult = null;
    if (autoBuild && fs.existsSync(path.join(dir, 'package.json'))) {
      ensureActive();
      step('debugger', 'running', 'Building project');
      try {
        const runCmd = (cmd) => new Promise((resolve) => {
          const child = spawn(cmd, { cwd: dir, shell: true, windowsHide: true });
          let out = '';
          const timer = setTimeout(() => { try { child.kill(); } catch {} }, 180000);
          child.stdout?.on('data', (d) => { if (out.length < MAX_OUTPUT) out += d.toString(); });
          child.stderr?.on('data', (d) => { if (out.length < MAX_OUTPUT) out += d.toString(); });
          child.on('error', (err) => { clearTimeout(timer); resolve({ exitCode: -1, output: String(err.message || err) }); });
          child.on('close', (code) => { clearTimeout(timer); resolve({ exitCode: code, output: out.slice(0, MAX_OUTPUT) }); });
        });
        if (!fs.existsSync(path.join(dir, 'node_modules'))) {
          sendText('build', 'Running npm install...');
          await runCmd('npm install --no-audit --no-fund');
        }
        let result = await runCmd('npm run build');
        ensureActive();
        buildResult = { exitCode: result.exitCode, output: result.output.slice(0, 8000) };
        let attempt = 0;
        while (buildResult.exitCode !== 0 && attempt < maxRetries) {
          ensureActive();
          attempt++;
          step('debugger', 'running', `Build failed (attempt ${attempt}). Analyzing and fixing...`);
          sendText('build', buildResult.output);
          try {
            const fixResp = await callLLM({ messages: [{ role: 'system', content: AGENTS.debugger.prompt }, { role: 'user', content: `${AGENTS.debugger.prompt}\n\nBuild error:\n${buildResult.output.slice(0, 6000)}\n\nContext:\n${ctx}\n\nCurrent files:\n${generatedFiles.join('\n')}` }], json: true, maxTokens: 8192, temperature: 0.3, task: 'debugger' });
            const fix = extractJson(fixResp.content);
            if (fix && Array.isArray(fix.fixes)) {
              for (const f of fix.fixes) {
                const full = safeJoin(dir, f.path);
                if (!full) continue;
                fs.mkdirSync(path.dirname(full), { recursive: true });
                await fsp.writeFile(full, String(f.content ?? ''), 'utf8');
                if (!generatedFiles.includes(f.path)) generatedFiles.push(f.path);
                runFiles.add(f.path);
              }
              sendText('files', `fixed: ${fix.fixes.map((f) => f.path).join(', ')}`);
            }
          } catch (fixErr) {
            sendText('build', `Fix generation failed: ${fixErr.message}`);
          }
          result = await runCmd('npm run build');
          ensureActive();
          buildResult = { exitCode: result.exitCode, output: result.output.slice(0, 8000) };
        }
        step('debugger', 'done', buildResult.exitCode === 0 ? 'Build passed' : `Build still failing after ${maxRetries} retries`, buildResult.output.slice(0, 800));

        if (autoTest && buildResult.exitCode === 0) {
          step('tester', 'running', 'Running tests');
          const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
          if (pkg.scripts?.test) {
            const t = await runCmd('npm test');
            testResult = { exitCode: t.exitCode, output: t.output.slice(0, 4000) };
            step('tester', 'done', t.exitCode === 0 ? 'Tests passed' : 'Tests failed', testResult.output.slice(0, 500));
          } else {
            step('tester', 'done', 'No test script configured', '');
          }
        }
      } catch (err) {
        step('debugger', 'error', `Build runner error: ${err.message}`);
      }
    } else if (autoBuild) {
      step('debugger', 'done', 'No package.json — static project, build skipped');
    }

    let review = null;
    let reviewRounds = 0;
    step('reviewer', 'running', 'Reviewing code quality and security');
    try {
      ensureActive();
      const doReview = async () => {
        const filesContent = {};
        for (const f of generatedFiles.slice(0, 12)) {
          try {
            const full = safeJoin(dir, f);
            if (full && fs.existsSync(full)) filesContent[f] = (await fsp.readFile(full, 'utf8')).slice(0, 8000);
          } catch {}
        }
        const reviewResp = await callLLM({ messages: [{ role: 'system', content: AGENTS.reviewer.prompt }, { role: 'user', content: `Files:\n${JSON.stringify(filesContent).slice(0, 40000)}\n\nTask: ${task}` }], json: true, maxTokens: 4096, temperature: 0.3, task: 'reviewer' });
        return extractJson(reviewResp.content);
      };
      review = await doReview();
      const score = () => { const s = Number(review?.score); return Number.isFinite(s) ? s : 0; };
      const REVIEW_THRESHOLD = Number(reviewThreshold) > 0 ? Number(reviewThreshold) : 70;
      const MAX_REVIEW_ROUNDS = 2;
      while (score() < REVIEW_THRESHOLD && reviewRounds < MAX_REVIEW_ROUNDS) {
        ensureActive();
        reviewRounds++;
        step('fixer', 'running', `Review score ${score()} below threshold ${REVIEW_THRESHOLD} — fixing (round ${reviewRounds}/${MAX_REVIEW_ROUNDS})`);
        try {
          const fixable = (review?.issues || []).filter((i) => i?.severity && /critical|major/i.test(String(i.severity)));
          const issuesText = (fixable.length > 0 ? fixable : review.issues || []).slice(0, 8);
          const currentFiles = {};
          for (const f of generatedFiles.slice(0, 12)) {
            try {
              const full = safeJoin(dir, f);
              if (full && fs.existsSync(full)) currentFiles[f] = (await fsp.readFile(full, 'utf8')).slice(0, 8000);
            } catch {}
          }
          const fixResp = await callLLM({ messages: [{ role: 'system', content: AGENTS.fixer.prompt }, { role: 'user', content: `Task: ${task}\n\nReview findings to fix:\n${JSON.stringify(issuesText)}\n\nCurrent file contents:\n${JSON.stringify(currentFiles).slice(0, 30000)}` }], json: true, maxTokens: 8192, temperature: 0.3, task: 'fixer' });
          await applyCodeFiles(fixResp.content);
          ensureActive();
          sendText('files', `fix round ${reviewRounds} applied`);
          review = await doReview();
          step('reviewer', 'done', `Re-review score: ${score()}`, (review?.issues || []).slice(0, 6).map((i) => `[${i.severity}] ${i.detail}`).join(' | '));
        } catch (err) {
          step('fixer', 'error', `Fix round ${reviewRounds} failed: ${err.message}`);
          break;
        }
      }
      step('reviewer', 'done', `Review score: ${score()}${reviewRounds > 0 ? ` (after ${reviewRounds} fix round${reviewRounds > 1 ? 's' : ''})` : ''}`, (review?.issues || []).slice(0, 6).map((i) => `[${i.severity}] ${i.detail}`).join(' | '));
    } catch (err) {
      step('reviewer', 'error', `Review failed: ${err.message}`);
    }

    let sanityIssues = [];
    let browserIssues = [];
    if (generatedFiles.length > 0) {
      const hasIndex = fs.existsSync(path.join(dir, 'index.html'));
      const runSanity = async () => {
        try { return await runtimeSanityIssues(dir, task, runFiles); } catch (err) { return [`sanity check error: ${err.message}`]; }
      };
      const runBrowser = async () => {
        if (!autoBrowser || !hasIndex) return [];
        step('browser', 'running', 'Loading app in headless browser');
        try {
          const r = await browserSanityIssues(dir);
          step('browser', 'done', r.issues.length === 0 ? 'Browser checks passed' : `${r.issues.length} browser issue(s) found`, r.issues.slice(0, 3).join(' | '));
          return r.issues;
        } catch (err) {
          return [`browser check error: ${err.message}`];
        }
      };
      const runChecks = async () => {
        sanityIssues = await runSanity();
        browserIssues = await runBrowser();
        return [...sanityIssues, ...browserIssues];
      };
      let allIssues = await runChecks();
      if (allIssues.length > 0) step('sanity', 'running', `${allIssues.length} verification issue(s) detected after generation`, allIssues.slice(0, 3).join(' | '));
      const MAX_FIX_ROUNDS = 3;
      let fixRounds = 0;
      while (allIssues.length > 0 && fixRounds < MAX_FIX_ROUNDS) {
        ensureActive();
        fixRounds++;
        step('sanity', 'running', `Fixing verification issues (round ${fixRounds}/${MAX_FIX_ROUNDS})`, allIssues.slice(0, 3).join(' | '));
        try {
          const currentFiles = {};
          for (const f of generatedFiles.slice(0, 12)) {
            try {
              const full = safeJoin(dir, f);
              if (full && fs.existsSync(full)) currentFiles[f] = (await fsp.readFile(full, 'utf8')).slice(0, 8000);
            } catch {}
          }
          const fixResp = await (async () => {
            let lastErr = null;
            for (let attempt = 1; attempt <= 2; attempt++) {
              try {
                ensureActive();
                return await callLLM({ messages: [{ role: 'system', content: AGENTS.fixer.prompt + '\n\nConcrete runtime issues were detected in the workspace. Repair the root cause with SURGICAL EDITS — reply STRICT JSON only: {"edits":[{"path":string,"find":string,"replace":string}]} where each "find" block exists EXACTLY ONCE in the current file (copy it verbatim from the file contents) and is replaced by "replace". Change the smallest possible block. If an issue references a specific file or line (e.g. script.js:12) or names a runtime error (ReferenceError, TypeError, null), fix the root cause in THAT file. If a file must be created or rewritten entirely, you may instead reply {"files":[{"path":string,"content":string}]}. Never do both in one reply.' }, { role: 'user', content: `Task: ${task}\n\nVerification issues to fix:\n${allIssues.join('\n')}\n\nCurrent file contents:\n${JSON.stringify(currentFiles).slice(0, 30000)}` }], json: true, maxTokens: 8192, temperature: 0.3, task: 'sanity' });
              } catch (fixCallErr) {
                lastErr = fixCallErr;
                sendText('build', `Fix LLM call attempt ${attempt} failed: ${fixCallErr.message}${attempt < 2 ? ' — retrying' : ''}`);
              }
            }
            throw lastErr;
          })();
          const fix = extractJson(fixResp.content);
          let editCount = 0;
          if (fix && Array.isArray(fix.edits)) {
            for (const e of fix.edits) {
              ensureActive();
              const full = safeJoin(dir, e?.path);
              if (!full || !fs.existsSync(full) || typeof e.find !== 'string' || typeof e.replace !== 'string') continue;
              const content = await fsp.readFile(full, 'utf8');
              const idx = content.indexOf(e.find);
              if (idx === -1) { sendText('build', `edit miss on ${e.path}: find block not found`); continue; }
              if (content.indexOf(e.find, idx + e.find.length) !== -1) { sendText('build', `edit ambiguous on ${e.path}: find block matches multiple times`); continue; }
              await fsp.writeFile(full, content.slice(0, idx) + e.replace + content.slice(idx + e.find.length), 'utf8');
              editCount++;
              if (!generatedFiles.includes(e.path)) generatedFiles.push(e.path);
              runFiles.add(e.path);
            }
            if (editCount > 0) sendText('files', `surgical fix round ${fixRounds}: ${editCount} edit(s) applied`);
          }
          if (fix && Array.isArray(fix.files) && fix.files.length > 0) {
            await applyCodeFiles(fixResp.content);
            editCount += fix.files.length;
          }
          if (editCount === 0) {
            step('sanity', 'error', `Fix round ${fixRounds}: no applicable edits returned`);
            break;
          }
          ensureActive();
          sendText('files', `verification fix round ${fixRounds} applied`);
          if (sanityVerify && /node --check|npm run build/i.test(sanityVerify)) {
            const v = await execCommand(dir, sanityVerify, 45000);
            if (v.exitCode !== 0) {
              sanityIssues = [`verify command failed after fixes: ${sanityVerify}\n${v.output.slice(0, 600)}`];
              browserIssues = [];
              allIssues = sanityIssues;
            } else {
              sendText('build', `✓ ${sanityVerify} passed after fixes`);
              allIssues = await runChecks();
            }
          } else {
            allIssues = await runChecks();
          }
          step('sanity', 'done', allIssues.length === 0 ? `Verification clean after ${fixRounds} fix round${fixRounds > 1 ? 's' : ''}` : `${allIssues.length} issue(s) remain`, allIssues.slice(0, 3).join(' | '));
        } catch (err) {
          step('sanity', 'error', `Fix round ${fixRounds} failed: ${err.message}`);
          break;
        }
      }
      if (allIssues.length === 0) {
        step('sanity', 'done', 'Runtime verification passed');
      } else if (fixRounds > 0) {
        step('sanity', 'error', `${allIssues.length} verification issue(s) remain after ${fixRounds} fix round${fixRounds > 1 ? 's' : ''}`, allIssues.slice(0, 4).join(' | '));
      }
    }

    if (reviewRounds > 0 && autoBuild && fs.existsSync(path.join(dir, 'package.json'))) {
      ensureActive();
      step('debugger', 'running', 'Running final verification after review fixes');
      const finalBuild = await execCommand(dir, 'npm run build', 180000);
      buildResult = { exitCode: finalBuild.exitCode, output: finalBuild.output.slice(0, 8000) };
      sendText('build', finalBuild.output.slice(0, 6000));
      step('debugger', finalBuild.exitCode === 0 ? 'done' : 'error', finalBuild.exitCode === 0 ? 'Final build passed' : 'Final build failed', finalBuild.output.slice(0, 800));
      if (autoTest && finalBuild.exitCode === 0) {
        const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
        if (pkg.scripts?.test) {
          step('tester', 'running', 'Running final tests');
          const finalTest = await execCommand(dir, 'npm test', 180000);
          testResult = { exitCode: finalTest.exitCode, output: finalTest.output.slice(0, 4000) };
          step('tester', finalTest.exitCode === 0 ? 'done' : 'error', finalTest.exitCode === 0 ? 'Final tests passed' : 'Final tests failed', finalTest.output.slice(0, 500));
        }
      }
    }

    step('docs', 'running', 'Generating documentation');
    try {
      const docsResp = await callLLM({ messages: [{ role: 'system', content: AGENTS.docs.prompt }, { role: 'user', content: `${ctx}\n\nGenerated files: ${generatedFiles.join(', ')}\nBuild result: ${buildResult?.exitCode === 0 ? 'passed' : 'not run'}` }], json: true, maxTokens: 2048, temperature: 0.3, task: 'docs' });
      const docs = extractJson(docsResp.content);
      const readme = docs?.readme || `# ${workspace}\n\nBuilt with the Codestrom AI IDE.\n`;
      const full = safeJoin(dir, 'README.md');
      if (full) await fsp.writeFile(full, readme, 'utf8');
      runFiles.add('README.md');
      step('docs', 'done', 'README.md written');
    } catch (err) {
      step('docs', 'error', `Docs failed: ${err.message}`);
    }

    const summary = `Pipeline complete for "${task}"\n\nFiles created/modified:\n${generatedFiles.map((f) => `- ${f}`).join('\n') || '(none)'}\n\nSteps: ${execSummary ? `${execSummary.verified}/${execSummary.total} verified` : 'single-shot generation'}\nBuild: ${buildResult ? (buildResult.exitCode === 0 ? '✅ passed' : `❌ failed (exit ${buildResult.exitCode})`) : 'skipped'}\nTests: ${testResult ? (testResult.exitCode === 0 ? '✅ passed' : '❌ failed') : 'not run'}\nReview score: ${review?.score ?? 'n/a'}${reviewRounds > 0 ? ` (after ${reviewRounds} fix round${reviewRounds > 1 ? 's' : ''})` : ''}\nRuntime checks: ${sanityIssues.length === 0 ? '✅ clean' : `❌ ${sanityIssues.length} issue(s) remaining`}\nBrowser checks: ${browserIssues.length === 0 ? '✅ clean' : `❌ ${browserIssues.length} issue(s) remaining`}\n\nTop suggestions:\n${(review?.suggestions || []).slice(0, 5).map((s) => `- ${s}`).join('\n')}`;
    await appendChat(workspace, dir, 'assistant', summary, { files: generatedFiles });
    const threshold = Number(reviewThreshold) > 0 ? Number(reviewThreshold) : 70;
    const failed = !!(buildResult && buildResult.exitCode !== 0)
      || !!(testResult && testResult.exitCode !== 0)
      || sanityIssues.length > 0
      || browserIssues.length > 0
      || (review && Number.isFinite(Number(review.score)) && Number(review.score) < threshold);
    emit('done', { summary, files: generatedFiles, build: buildResult, test: testResult, review, failed, sanityIssues, browserIssues });
  } catch (err) {
    const cancelled = err?.code === 'RUN_CANCELLED';
    step('pipeline', cancelled ? 'error' : 'error', cancelled ? 'Run cancelled' : String(err.message || err));
    const message = cancelled ? 'Run cancelled. Generated changes remain available for review or rollback.' : `Pipeline failed: ${String(err.message || err)}`;
    await appendChat(workspace, dir, 'assistant', message);
    emit('done', { summary: message, files: [], error: cancelled ? 'RUN_CANCELLED' : String(err.message || err), cancelled });
  } finally {
    clearInterval(heartbeat);
    activeAgentRuns.delete(workspace);
    try { await persistSnapshot(workspace, dir); } catch {}
    try { res.end(); } catch {}
  }
});

export default router;
