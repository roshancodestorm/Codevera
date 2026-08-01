// Context Builder — Stage 3 of the Codestrom master plan.
// Turns a task into a token-budgeted context package for the agent
// pipeline: relevant file regions, symbols, routes, APIs, env vars,
// dependencies, database usage, project memory and conversation history.
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { ensureIndex, getIndex, semanticSearch } from './indexer.js';

const MAX_FILE_SIZE = 512 * 1024;
const MAX_REF_FILE = 8000;
const MAX_REF_TOTAL = 60000;

function safeJoin(base, rel) {
  if (!base) return null;
  const full = path.resolve(base, String(rel || ''));
  if (full !== base && !full.startsWith(base + path.sep)) return null;
  return full;
}

function matchTerms(task) {
  return new Set(String(task || '').toLowerCase().split(/[^a-z0-9_]+/).filter((t) => t.length >= 3));
}

function pickByTerms(items, terms, field, cap) {
  const out = [];
  for (const it of items) {
    const val = String(it[field] || '').toLowerCase();
    if (terms.size === 0 || [...terms].some((t) => val.includes(t))) out.push(it);
    if (out.length >= cap) break;
  }
  return out;
}

async function extractRegion(dir, rel, line, budget) {
  const full = safeJoin(dir, rel);
  if (!full || !fs.existsSync(full)) return null;
  try {
    const st = await fsp.stat(full);
    if (st.size > MAX_FILE_SIZE) return null;
    const content = await fsp.readFile(full, 'utf8');
    const lines = content.split('\n');
    let start = 0;
    let end = Math.min(lines.length, 60);
    if (line && line > 0) {
      start = Math.max(0, line - 15);
      end = Math.min(lines.length, line + 45);
    }
    return lines.slice(start, end).join('\n').slice(0, budget);
  } catch {
    return null;
  }
}

export async function buildContext({ workspace, task, history = '', memory = '', refFiles = [], budget = 16000 }) {
  let idx = null;
  try {
    idx = await ensureIndex(workspace);
  } catch {}
  const terms = matchTerms(task);

  // 1) semantic retrieval
  let hits = [];
  try {
    hits = semanticSearch(workspace, task, { limit: 8 });
  } catch {}
  const hitFiles = hits.map((h) => h.file);
  const hitByFile = new Map(hits.map((h) => [h.file, h]));
  const files = new Set(idx ? idx.files.map((f) => f.path) : []);
  const topFiles = [...new Set([...hitFiles, ...(idx ? idx.files.slice(0, 3).map((f) => f.path) : [])])].filter((f) => files.has(f)).slice(0, 6);

  // 2) file regions with token budget
  const perFile = Math.max(2000, Math.floor((budget * 0.65) / Math.max(topFiles.length, 1)));
  const fileParts = [];
  const fileMeta = [];
  const dirPath = workspaceDirFor(workspace);
  for (let i = 0; i < topFiles.length; i++) {
    const rel = topFiles[i];
    const hit = hitByFile.get(rel);
    const share = i === 0 ? Math.min(perFile + 3000, 9000) : perFile;
    const region = await extractRegion(dirPath, rel, hit ? hit.line : 0, share);
    if (region == null) continue;
    const reason = hit ? `relevance ${Math.round(hit.score * 100)}% at line ${hit.line}` : 'project entry point';
    fileParts.push(`--- ${rel} (${reason}) ---\n${region}`);
    fileMeta.push({ path: rel, line: hit ? hit.line : null, score: hit ? hit.score : null, reason });
  }

  // 3) symbols (from hit files + task term matches)
  const symbolRows = [];
  if (idx) {
    const byFile = new Set(hitFiles);
    const seen = new Set();
    for (const s of idx.symbols) {
      const inHitFile = byFile.has(s.file);
      const nameMatch = [...terms].some((t) => s.name.toLowerCase().includes(t));
      if (!inHitFile && !nameMatch) continue;
      const key = s.id;
      if (seen.has(key)) continue;
      seen.add(key);
      symbolRows.push(`${s.name} (${s.kind}) ${s.file}:${s.line} ${s.signature || ''}`.trim());
      if (symbolRows.length >= 40) break;
    }
  }

  // 4) routes / apis / env / deps / db
  const routes = idx ? pickByTerms(idx.routes, terms, 'path', 12) : [];
  const apis = idx ? pickByTerms(idx.apis, terms, 'url', 8) : [];
  const envs = idx ? idx.envVars.slice(0, 10) : [];
  const deps = idx ? idx.deps.slice(0, 24) : [];
  const db = idx ? idx.database.slice(0, 5) : [];

  // 5) user-referenced files
  const refParts = [];
  for (const p of (Array.isArray(refFiles) ? refFiles : []).slice(0, 8)) {
    const full = dirPath ? safeJoin(dirPath, p) : null;
    if (!full || !fs.existsSync(full)) continue;
    try {
      const st = await fsp.stat(full);
      if (st.size > MAX_FILE_SIZE) continue;
      const content = (await fsp.readFile(full, 'utf8')).slice(0, MAX_REF_FILE);
      refParts.push(`--- ${p} ---\n${content}`);
    } catch {}
    if (refParts.join('\n').length > MAX_REF_TOTAL) break;
  }
  const refText = refParts.length ? `\nUser-referenced files:\n${refParts.join('\n')}` : '';

  // 6) assemble
  const parts = [];
  parts.push(`Workspace: ${workspace}`);
  if (idx) {
    parts.push(`Index: ${idx.files.length} files, ${idx.symbols.length} symbols, ${idx.routes.length} routes, ${idx.deps.length} deps`);
  }
  if (fileParts.length) parts.push(`\nKey files:\n${fileParts.join('\n')}`);
  if (symbolRows.length) parts.push(`\nSymbols:\n${symbolRows.join('\n')}`);
  if (routes.length) parts.push(`\nServer routes:\n${routes.map((r) => `${r.method} ${r.path} — ${r.file}`).join('\n')}`);
  if (apis.length) parts.push(`\nClient API calls:\n${apis.map((a) => `${a.url} — ${a.file}`).join('\n')}`);
  if (envs.length) parts.push(`\nEnv vars: ${envs.map((e) => `${e.name}${e.defaultValue ? `=${e.defaultValue}` : ''}`).join(', ')}`);
  if (deps.length) parts.push(`\nDependencies: ${deps.map((d) => d.name).join(', ')}`);
  if (db.length) parts.push(`\nDatabase: ${db.map((d) => `${d.engine} ${d.kind} — ${d.file}`).join('; ')}`);
  if (memory) parts.push(`\nProject memory: ${memory.slice(0, 2500)}`);
  if (history) parts.push(`\nConversation history (most recent last):\n${history}`);
  parts.push(`\nUser task: ${task}${refText}`);

  const text = parts.join('\n').slice(0, budget + 8000);
  return {
    text,
    chars: text.length,
    files: fileMeta,
    symbols: symbolRows,
    routes: routes.map((r) => ({ method: r.method, path: r.path, file: r.file })),
    apis: apis.map((a) => ({ url: a.url, file: a.file })),
    env: envs,
    deps: deps.map((d) => d.name),
    database: db,
    hits: hits.map((h) => ({ file: h.file, line: h.line, score: h.score })),
  };
}

let wsRootOf = null;

export function initContextBuilder(opts) {
  wsRootOf = opts.workspaceDir;
}

function workspaceDirFor(workspace) {
  if (!wsRootOf) return null;
  try { return wsRootOf(workspace); } catch { return null; }
}
