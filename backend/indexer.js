// Repository Indexer — Stage 1 of the Codestrom master plan.
// Builds and maintains a persistent, queryable index of every workspace:
// files, symbols (functions/classes/components/interfaces), dependency
// graph, call graph, routes, client APIs, database usage, env vars.
// Incremental re-index on file change via fs.watch; survives restarts.
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { embedTexts, embedQuery } from './embedder.js';

let INDEX_DIR = null;
let WORKSPACES_ROOT = null;
let IGNORE = null;
let workspaceDirOf = null;
let PROJECT_DIRS = null;

const MAX_FILES = 3000;
const MAX_FILE_SIZE = 512 * 1024;
const PARSE_VERSION = 6;
const EMBED_VERSION = 2; // 1 = hash pairs, 2 = dense nomic-embed (b64 float32)
const SCAN_EXTS = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.py', '.html', '.htm', '.css', '.json', '.md', '.env', '.kt', '.kts', '.java', '.xml', '.toml', '.gradle', '.properties']);

const indexes = new Map();      // workspace -> index object (in memory)
const watchers = new Map();     // workspace -> { dirs: Set, timers: Map, files: Map }
const dirtyTimers = new Map();  // workspace -> timeout for persist

export function initIndexer(opts) {
  INDEX_DIR = opts.indexDir;
  WORKSPACES_ROOT = opts.workspacesRoot;
  IGNORE = opts.ignoreDirs;
  workspaceDirOf = opts.workspaceDir;
  PROJECT_DIRS = opts.projectDirs || null;
  if (!fs.existsSync(INDEX_DIR)) fs.mkdirSync(INDEX_DIR, { recursive: true });
  loadAll();
}

function indexFile(name) {
  return path.join(INDEX_DIR, `${String(name).replace(/[^a-zA-Z0-9._-]/g, '_')}.json`);
}

function loadAll() {
  let files = [];
  try { files = fs.readdirSync(INDEX_DIR); } catch {}
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const idx = JSON.parse(fs.readFileSync(path.join(INDEX_DIR, f), 'utf8'));
      if (idx && idx.workspace) indexes.set(idx.workspace, idx);
    } catch {}
  }
}

function blankIndex(workspace) {
  return {
    version: 1,
    embedVersion: EMBED_VERSION,
    workspace,
    updatedAt: Date.now(),
    stats: { files: 0, symbols: 0, functions: 0, classes: 0, components: 0, interfaces: 0, routes: 0, apis: 0, database: 0, deps: 0, envVars: 0, edges: 0, chunks: 0 },
    files: [],
    symbols: [],
    routes: [],
    apis: [],
    database: [],
    deps: [],
    envVars: [],
    edges: [],
    chunks: [],
    _files: {},
  };
}

function persist(name) {
  const idx = indexes.get(name);
  if (!idx) return;
  const t = dirtyTimers.get(name);
  if (t) clearTimeout(t);
  dirtyTimers.set(
    name,
    setTimeout(() => {
      try {
        fs.writeFileSync(indexFile(name), JSON.stringify(idx, null, 2));
      } catch {}
      dirtyTimers.delete(name);
    }, 400)
  );
}

function recomputeStats(idx) {
  const s = idx.stats;
  s.files = idx.files.length;
  s.symbols = idx.symbols.length;
  s.functions = idx.symbols.filter((x) => x.kind === 'function' || x.kind === 'method').length;
  s.classes = idx.symbols.filter((x) => x.kind === 'class').length;
  s.components = idx.symbols.filter((x) => x.kind === 'component').length;
  s.interfaces = idx.symbols.filter((x) => x.kind === 'interface' || x.kind === 'type').length;
  s.routes = idx.routes.length;
  s.apis = idx.apis.length;
  s.database = idx.database.length;
  s.deps = idx.deps.length;
  s.envVars = idx.envVars.length;
  s.edges = idx.edges.length;
  s.chunks = idx.chunks.length;
}

// ─── walk ───────────────────────────────────────────────────────────

async function walkWorkspace(workspace) {
  const root = workspaceDirOf(workspace);
  if (!root) return [];
  const out = [];
  if (workspace === '__project__' && PROJECT_DIRS) {
    for (const sub of PROJECT_DIRS) {
      const d = path.join(root, sub);
      if (!fs.existsSync(d)) continue;
      await walkInto(out, d, sub);
    }
    let rootItems = [];
    try { rootItems = await fsp.readdir(root, { withFileTypes: true }); } catch {}
    for (const item of rootItems) {
      if (item.isDirectory()) continue;
      if (/\.env$/i.test(item.name) || SCAN_EXTS.has(path.extname(item.name).toLowerCase())) {
        out.push({ abs: path.join(root, item.name), rel: item.name });
      }
    }
    return out;
  }
  await walkInto(out, root, '');
  return out;
}

async function walkInto(out, dir, prefix) {
  if (out.length >= MAX_FILES) return;
  let items = [];
  try { items = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const item of items) {
    if (out.length >= MAX_FILES) return;
    if (item.isDirectory()) {
      if (IGNORE.has(item.name)) continue;
      await walkInto(out, path.join(dir, item.name), prefix ? `${prefix}/${item.name}` : item.name);
    } else {
      if (/\.env$/i.test(item.name)) {
        out.push({ abs: path.join(dir, item.name), rel: prefix ? `${prefix}/${item.name}` : item.name });
        continue;
      }
      if (!SCAN_EXTS.has(path.extname(item.name).toLowerCase())) continue;
      out.push({ abs: path.join(dir, item.name), rel: prefix ? `${prefix}/${item.name}` : item.name });
    }
  }
}

// ─── parsers ────────────────────────────────────────────────────────

const IMPORT_RE = /(?:from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
const DB_ENGINES = [
  { engine: 'mongoose', re: /mongoose/i },
  { engine: 'mongodb', re: /mongodb/i },
  { engine: 'prisma', re: /prisma/i },
  { engine: 'postgres', re: /(?:^|\/)pg\b|postgres/i },
  { engine: 'sqlite', re: /sqlite/i },
  { engine: 'sequelize', re: /sequelize/i },
  { engine: 'knex', re: /knex/i },
  { engine: 'mysql', re: /mysql2?|mariadb/i },
  { engine: 'redis', re: /^redis/i },
  { engine: 'supabase', re: /supabase/i },
  { engine: 'firebase', re: /firebase/i },
  { engine: 'drizzle', re: /drizzle/i },
];

function parseJsLike(rel, content) {
  // strip comments (preserving newlines so line numbers stay accurate)
  const stripped = content
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^\s*\/\/[^\n]*/gm, (m) => m.replace(/[^\n]/g, ' '));
  const lines = content.split('\n');
  const symbols = [];
  const calls = []; // { name } occurrences (resolved later)
  const imports = [];
  const routes = [];
  const apis = [];
  const envVars = [];
  const isJsx = /\.(jsx|tsx)$/.test(rel);

  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(stripped))) {
    const spec = m[1] || m[2] || m[3];
    if (spec) imports.push(spec);
  }

  const ROUTE_RE = /(?:app|router|server|fastify|hono|route)\.(get|post|put|delete|patch|head|options|use|all)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  const routeHandlers = [];
  while ((m = ROUTE_RE.exec(stripped))) {
    const method = (m[1] === 'use' ? 'USE' : m[1].toUpperCase());
    routes.push({ file: rel, method, path: m[2] });
    routeHandlers.push({ method, path: m[2], matchStart: m.index, matchLen: m[0].length });
  }

  const API_RE = /(?:fetch\s*\(\s*['"`]([^'"`]+)['"`]|axios\.(?:get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`])/g;
  while ((m = API_RE.exec(stripped))) {
    const url = m[1] || m[2];
    if (/^(\/api\/|https?:\/\/)/.test(url)) apis.push({ file: rel, kind: 'client', url });
  }

  const ENV_RE = /(?:process\.env\.([A-Za-z0-9_]+)|process\.env\[['"]([A-Za-z0-9_]+)['"]\]|import\.meta\.env\.([A-Za-z0-9_]+))/g;
  while ((m = ENV_RE.exec(stripped))) {
    const name = m[1] || m[2] || m[3];
    if (name && !envVars.some((e) => e.name === name)) envVars.push({ name, file: rel });
  }

  for (const spec of imports) {
    for (const d of DB_ENGINES) {
      if (d.re.test(spec)) {
        const kind = /model|schema/.test(spec) ? 'model' : 'connection';
        const existing = dbSeen.has(rel + '::' + spec);
        if (!existing) {
          dbSeen.add(rel + '::' + spec);
          db.push({ file: rel, kind, engine: d.engine, detail: spec });
        }
      }
    }
  }

  // functions & classes & components & methods (approximate, regex based)
  const FN_RE = /(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g;
  const CONST_FN_RE = /(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\(([^)]*)\)|([A-Za-z_$][\w$]*))\s*=>/g;
  const CLASS_RE = /(?:export\s+)?(?:default\s+)?class\s+([A-Za-z_$][\w$]*)/g;
  const IFACE_RE = /(?:export\s+)?(?:interface|type)\s+([A-Za-z_$][\w$]*)/g;
  const METHOD_RE = /^\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{\s*$/g;
  const CALL_RE = /\b([A-Za-z_$][\w$]*)\s*\(/g;

  const pushSym = (kind, name, signature, line, bodyStart, bodyEndAt = -1) => {
    symbols.push({ id: `${rel}::${name}`, name, kind, file: rel, line, signature, body: null });
    if (kind === 'function' || kind === 'method' || kind === 'component' || kind === 'route') {
      // extract call targets from the body region (bounded by the matching brace,
      // or by an explicit end for expression-bodied arrows)
      const end = bodyEndAt >= 0 ? bodyEndAt : bodyEnd(stripped, bodyStart);
      const seg = stripped.slice(bodyStart, end);
      const local = new Set();
      let cm;
      CALL_RE.lastIndex = 0;
      while ((cm = CALL_RE.exec(seg))) local.add(cm[1]);
      const last = symbols[symbols.length - 1];
      last.calls = [...local];
    }
  };

  let fm;
  FN_RE.lastIndex = 0;
  while ((fm = FN_RE.exec(stripped))) {
    const [sig, name, args] = [fm[0], fm[1], fm[2]];
    const openBrace = handlerBrace(stripped, fm.index);
    const isComponent = isJsx && /^[A-Z]/.test(name) && looksLikeJsx(stripped, openBrace);
    pushSym(isComponent ? 'component' : 'function', name, `${name}(${args.trim()})`, lineOf(content, fm.index), openBrace + 1);
  }
  CONST_FN_RE.lastIndex = 0;
  while ((fm = CONST_FN_RE.exec(stripped))) {
    const [sig, name, a1, a2] = [fm[0], fm[1], fm[2], fm[3]];
    const args = (a1 ?? a2 ?? '').trim();
    const arrow = stripped.indexOf('=>', fm.index);
    const openBrace = handlerBrace(stripped, arrow + 2);
    const isComponent = isJsx && /^[A-Z]/.test(name) && looksLikeJsx(stripped, arrow + 2);
    pushSym(isComponent ? 'component' : 'function', name, `${name}(${args})`, lineOf(content, fm.index), Math.max(arrow + 2, openBrace + 1), openBrace === -1 ? stripped.indexOf('\n', arrow + 2) : -1);
  }
  // plain value declarations (const/let/var name = …) — outline fodder; arrows handled above
  const VALUE_RE = /(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;=\n]{1,80})/g;
  VALUE_RE.lastIndex = 0;
  while ((fm = VALUE_RE.exec(stripped))) {
    if (fm[2].includes('=>')) continue; // arrow functions handled by CONST_FN_RE
    if (fm[2].includes('...')) continue; // spread/rest patterns
    pushSym(fm[0].match(/\b(const|let|var)\b/)[1], fm[1], `${fm[1]} = ${fm[2].trim().slice(0, 60)}`, lineOf(content, fm.index), fm.index, stripped.indexOf('\n', fm.index));
  }
  CLASS_RE.lastIndex = 0;
  while ((fm = CLASS_RE.exec(stripped))) {
    pushSym('class', fm[1], `class ${fm[1]}`, lineOf(content, fm.index), stripped.indexOf('{', fm.index) + 1);
  }
  IFACE_RE.lastIndex = 0;
  while ((fm = IFACE_RE.exec(stripped))) {
    pushSym(/^interface/.test(fm[0]) ? 'interface' : 'type', fm[1], fm[0].split(' ').slice(0, 3).join(' '), lineOf(content, fm.index), fm.index);
  }
  // methods: only scan inside class bodies (approx: after a 'class X' line, indented defs)
  const classMatch = stripped.match(/(?:class)\s+[A-Za-z_$][\w$]*[^{]*{/g);
  let methodFrom = 0;
  METHOD_RE.lastIndex = 0;
  while ((fm = METHOD_RE.exec(stripped))) {
    if (fm[1] === 'return' || fm[1] === 'if' || fm[1] === 'for' || fm[1] === 'while' || fm[1] === 'switch' || fm[1] === 'catch') continue;
    // require some class context: a 'class' keyword appears before this line in the file
    if (!classMatch || fm.index < stripped.indexOf('class ')) continue;
    pushSym('method', fm[1], `${fm[1]}(${fm[2].trim()})`, lineOf(content, fm.index), handlerBrace(stripped, fm.index) + 1);
  }
  void methodFrom;

  // routes with handler names (heuristic: second arg is identifier)
  for (const r of routes) {
    const rl = lineOf(content, stripped.indexOf(`'${r.path}'`));
    if (rl >= 0) r.line = rl;
  }

  // route handler symbols (calls inside the handler body become graph edges)
  for (const rh of routeHandlers) {
    const name = `route:${rh.method} ${rh.path}`;
    if (symbols.some((s) => s.name === name)) continue;
    const after = stripped.slice(rh.matchStart + rh.matchLen);
    const arrowIdx = after.indexOf('=>');
    const fnIdx = after.indexOf('function');
    const handlerAt = arrowIdx === -1 ? fnIdx : fnIdx === -1 ? arrowIdx : Math.min(arrowIdx, fnIdx);
    if (handlerAt >= 0) {
      const openBrace = handlerBrace(stripped, rh.matchStart + rh.matchLen + handlerAt);
      if (openBrace !== -1) {
        pushSym('route', name, name, lineOf(content, rh.matchStart), openBrace + 1);
      }
    }
  }

  return { symbols, imports, routes, apis, envVars, calls };
}

let dbSeen = null;
let db = null;
let databaseEntries = null;

function looksLikeJsx(content, from) {
  const seg = content.slice(from, Math.min(from + 3000, content.length));
  return /return\s*(?:\(|\s*<\w|<\w)|<\/[A-Za-z]|<>[\s\S]*<\/>|createElement/.test(seg);
}

function pairClose(str, start) {
  // find index of the '}' that closes the '{' at start; string/template aware; -1 if unbalanced
  let depth = 0;
  let mode = null;
  for (let i = start; i < str.length; i++) {
    const c = str[i];
    if (mode) {
      if (c === '\\') { i++; continue; }
      if (c === mode) mode = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { mode = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth <= 0) return i;
    }
  }
  return -1;
}

function bodyEnd(str, start) {
  if (start < 0) start = 0;
  let i = start;
  let mode = null; // '"' | "'" | '`' — string/template awareness so braces inside literals don't count
  while (i < str.length) {
    const c = str[i];
    if (mode) {
      if (c === '\\') { i++; }
      else if (c === mode) mode = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { mode = c; i++; continue; }
    if (c === '{') {
      // nested block / object literal / destructuring pattern: skip the whole balanced pair
      const close = pairClose(str, i);
      if (close > i) { i = close + 1; continue; }
      i++;
      continue;
    }
    if (c === '}') return i;
    i++;
  }
  return str.length;
}

function handlerBrace(str, from) {
  // first '{' preceded (ignoring whitespace) by '=>' or ')' — skips destructured params like ({ a }) => {
  if (from < 0) from = 0;
  for (let i = from; i < str.length; i++) {
    if (str[i] === '{') {
      let j = i - 1;
      while (j >= from && /\s/.test(str[j])) j--;
      if (j < from) continue;
      if (str[j] === '>' || str[j] === ')') return i;
    }
  }
  return -1;
}

// ─── semantic retrieval (Stage 2) ───────────────────────────────────

const EMBED_DIM = 512;
const CHUNK_LINES = 30;
const EMBED_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'on', 'is', 'are', 'was', 'were', 'be', 'been', 'by',
  'with', 'from', 'as', 'at', 'this', 'that', 'it', 'its', 'not', 'but', 'so', 'if', 'then', 'than', 'when',
  'while', 'else', 'return', 'function', 'const', 'let', 'var', 'export', 'import', 'from', 'default', 'class',
  'new', 'typeof', 'void', 'async', 'await', 'true', 'false', 'null', 'undefined', 'require', 'module', 'use',
  'strict', 'window', 'document', 'console', 'log', 'error', 'string', 'boolean', 'object', 'array', 'number',
  'interface', 'type', 'extends', 'implements', 'keyof', 'readonly', 'get', 'set', 'render', 'return', 'none',
  'def', 'self', 'print', 'str', 'int', 'float', 'bool', 'list', 'dict', 'tuple', 'true', 'false', 'your',
  'you', 'will', 'can', 'into', 'about', 'via', 'all', 'any', 'some', 'each', 'also', 'over', 'under', 'have', 'has',
]);

function splitIdent(tok) {
  return tok
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9$]+/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function embedTokens(text) {
  const tokens = [];
  for (const m of text.matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)) {
    for (const part of splitIdent(m[0])) {
      if (part.length >= 2 && !EMBED_STOPWORDS.has(part)) tokens.push(part);
    }
  }
  const vec = new Map();
  const bump = (tok, w) => {
    const { dim, sign } = hashDim(tok);
    vec.set(dim, (vec.get(dim) || 0) + w * sign);
  };
  for (const t of tokens) bump(t, 1);
  for (let i = 0; i + 1 < tokens.length; i++) bump(tokens[i] + ' ' + tokens[i + 1], 0.5);
  let norm = 0;
  for (const w of vec.values()) norm += w * w;
  norm = Math.sqrt(norm) || 1;
  return {
    pairs: [...vec.entries()]
      .map(([dim, w]) => [dim, w / norm])
      .filter(([, w]) => Math.abs(w) > 1e-6)
      .sort((a, b) => a[0] - b[0]),
    norm: 1,
  };
}

function hashDim(tok) {
  let h = 2166136261;
  for (let i = 0; i < tok.length; i++) {
    h ^= tok.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hh = h >>> 0;
  return { dim: hh % EMBED_DIM, sign: (hh >> 28) & 1 ? 1 : -1 };
}

function chunkFile(rel, content, symbols) {
  if (/package-lock\.json$|yarn\.lock$|pnpm-lock\.yaml$|\.lock$/.test(rel)) return [];
  const lines = content.split('\n');
  const chunks = [];
  const symByLine = new Map();
  for (const s of symbols) symByLine.set(s.line, (symByLine.get(s.line) || []).concat(s.name));
  for (let start = 0; start < lines.length; start += CHUNK_LINES) {
    const block = lines.slice(start, start + CHUNK_LINES);
    const text = block.join('\n');
    if (text.trim().length < 8) continue;
    const labels = [];
    for (let i = start; i < start + CHUNK_LINES; i++) {
      if (symByLine.has(i + 1)) labels.push(...symByLine.get(i + 1));
    }
    const snippet = block.find((l) => l.trim().length > 0) || '';
    chunks.push({
      id: `${rel}::L${start + 1}`,
      file: rel,
      startLine: start + 1,
      endLine: Math.min(start + CHUNK_LINES, lines.length),
      labels: [...new Set(labels)].slice(0, 5),
      snippet: snippet.trim().slice(0, 120),
      vec: null,
      _text: text,
    });
  }
  return chunks;
}

function vecDot(a, b) {
  if (!a || !b) return 0;
  if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) {
    // dense float32 vectors
    let sum = 0;
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) sum += a[i] * b[i];
    return sum;
  }
  if (ArrayBuffer.isView(a) !== ArrayBuffer.isView(b)) return 0;
  // sparse [dim, weight] pairs
  let sum = 0;
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i][0] === b[j][0]) {
      sum += a[i][1] * b[j][1];
      i++;
      j++;
    } else if (a[i][0] < b[j][0]) i++;
    else j++;
  }
  return sum;
}

function vecToB64(vec) {
  return Buffer.from(new Float32Array(vec).buffer).toString('base64');
}

const denseCache = new Map(); // `${workspace}::${chunk.id}` -> Float32Array

function chunkVec(workspace, c) {
  if (typeof c.vec === 'string') {
    const key = workspace + '::' + c.id;
    let v = denseCache.get(key);
    if (!v) {
      const buf = Buffer.from(c.vec, 'base64');
      v = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
      denseCache.set(key, v);
    }
    return v;
  }
  return c.vec || null;
}

function lineOf(content, index) {
  if (index < 0) return 1;
  return content.slice(0, index).split('\n').length;
}

function parsePython(rel, content) {
  const lines = content.split('\n');
  const symbols = [];
  const imports = [];
  const routes = [];
  const envVars = [];
  const apis = [];

  for (const spec of imports) void spec;
  const IMP_RE = /(?:import\s+([a-zA-Z_][\w]*)|from\s+([a-zA-Z_][\w.]*)\s+import)/g;
  let m;
  while ((m = IMP_RE.exec(content))) imports.push(m[1] || m[2]);

  const FN_RE = /^\s*(?:async\s+)?def\s+([a-zA-Z_][\w]*)\s*\(([^)]*)\)/gm;
  while ((m = FN_RE.exec(content))) {
    symbols.push({ id: `${rel}::${m[1]}`, name: m[1], kind: 'function', file: rel, line: lineOf(content, m.index), signature: `${m[1]}(${m[2].trim()})` });
  }
  const CLS_RE = /^\s*class\s+([a-zA-Z_][\w]*)/gm;
  while ((m = CLS_RE.exec(content))) {
    symbols.push({ id: `${rel}::${m[1]}`, name: m[1], kind: 'class', file: rel, line: lineOf(content, m.index), signature: `class ${m[1]}` });
  }
  const ROUTE_RE = /@(?:app|router|bp|blueprint)\.(?:route|get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
  while ((m = ROUTE_RE.exec(content))) {
    const method = m[0].split('.').pop().replace(/\(.*/, '').toUpperCase();
    routes.push({ file: rel, method: method === 'ROUTE' ? 'ANY' : method, path: m[1] });
  }
  const ENV_RE = /os\.(?:environ\.(?:get\s*\(\s*)?|getenv\s*\(\s*)['"]([A-Za-z0-9_]+)['"]/g;
  while ((m = ENV_RE.exec(content))) {
    if (!envVars.some((e) => e.name === m[1])) envVars.push({ name: m[1], file: rel });
  }
  const API_RE = /(?:requests\.(?:get|post|put|delete)\s*\(\s*['"]([^'"]+)['"]|urllib|httpx\.(?:get|post)\s*\(\s*['"]([^'"]+)['"])/g;
  while ((m = API_RE.exec(content))) {
    const url = m[1] || m[2];
    if (/^(\/api\/|https?:\/\/)/.test(url)) apis.push({ file: rel, kind: 'client', url });
  }
  return { symbols, imports, routes, apis, envVars, calls: [] };
}

function parseHtml(rel, content) {
  const deps = [];
  const symbols = [];
  const SC_RE = /<(?:script|link)[^>]+(?:src|href)=['"]([^'"]+)['"]/g;
  let m;
  while ((m = SC_RE.exec(content))) deps.push(m[1]);
  const ID_RE = /id\s*=\s*['"]([A-Za-z_][\w-]*)['"]/g;
  while ((m = ID_RE.exec(content))) {
    symbols.push({ id: `${rel}::#${m[1]}`, name: `#${m[1]}`, kind: 'html-id', file: rel, line: lineOf(content, m.index), signature: `id="${m[1]}"` });
  }
  return { symbols, imports: deps, routes: [], apis: [], envVars: [], calls: [] };
}

function parseCss(rel, content) {
  const symbols = [];
  const SEL_RE = /([.#][A-Za-z_][\w-]*)\s*\{/g;
  let m;
  while ((m = SEL_RE.exec(content))) {
    symbols.push({ id: `${rel}::${m[1]}`, name: m[1], kind: 'css-selector', file: rel, line: lineOf(content, m.index), signature: m[1] });
  }
  return { symbols, imports: [], routes: [], apis: [], envVars: [], calls: [] };
}

function parseEnvFile(rel, content) {
  const envVars = [];
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (m && !m[1].startsWith('#')) envVars.push({ name: m[1], file: rel, defaultValue: m[2].trim().slice(0, 60) });
  }
  return { symbols: [], imports: [], routes: [], apis: [], envVars, calls: [] };
}

function parseFile(rel, content) {
  const ext = path.extname(rel).toLowerCase();
  if (rel === '.env' || /\.env\b/.test(rel)) return parseEnvFile(rel, content);
  if (ext === '.py') return parsePython(rel, content);
  if (ext === '.html' || ext === '.htm') return parseHtml(rel, content);
  if (ext === '.css') return parseCss(rel, content);
  if (ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.cjs' || ext === '.ts' || ext === '.tsx') return parseJsLike(rel, content);
  if (ext === '.md') return { symbols: [], imports: [], routes: [], apis: [], envVars: [], calls: [] };
  return { symbols: [], imports: [], routes: [], apis: [], envVars: [], calls: [] };
}

// ─── build ──────────────────────────────────────────────────────────

export async function buildIndex(workspace, { force = false } = {}) {
  const existing = indexes.get(workspace);
  const idx = existing && !force ? existing : blankIndex(workspace);
  const root = workspaceDirOf(workspace);
  if (!root || !fs.existsSync(root)) {
    indexes.delete(workspace);
    return null;
  }
  const files = await walkWorkspace(workspace);

  // package.json deps
  const pkgPath = path.join(root, 'package.json');
  const deps = [];
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      for (const [n, v] of Object.entries(pkg.dependencies || {})) deps.push({ name: n, version: v, scope: 'runtime' });
      for (const [n, v] of Object.entries(pkg.devDependencies || {})) deps.push({ name: n, version: v, scope: 'dev' });
    } catch {}
  }

  dbSeen = new Set();
  db = [];
  databaseEntries = db;

  const newFiles = [];
  const newSymbols = [];
  const newRoutes = [];
  const newApis = [];
  const newEnv = [];
  const newImports = []; // { file, spec }
  const newChunks = [];
  const fileRecords = {};

  for (const f of files) {
    let content = '';
    try {
      const stat = await fsp.stat(f.abs);
      if (stat.size > MAX_FILE_SIZE) continue;
      content = await fsp.readFile(f.abs, 'utf8');
    } catch {
      continue;
    }
    const hash = crypto.createHash('sha1').update(content).digest('hex');
    const cached = idx._files[f.rel];
    if (!force && cached && cached.hash === hash && cached.parseVersion === PARSE_VERSION && cached.embedVersion === EMBED_VERSION) {
      // reuse cached parse — copy its artifacts
      const cachedArtifacts = cached.symbols || [];
      const cachedRoutes = cached.routes || [];
      const cachedApis = cached.apis || [];
      const cachedEnv = cached.envVars || [];
      const cachedImports = cached.imports || [];
      const cachedChunks = (cached.chunks || []).filter((c) => !/package-lock\.json$|yarn\.lock$|pnpm-lock\.yaml$|\.lock$/.test(c.file));
      const cf = { path: f.rel, size: content.length, hash, language: langOf(f.rel), symbolIds: cachedArtifacts.map((s) => s.id), imports: cachedImports };
      fileRecords[f.rel] = cf;
      newFiles.push(cf);
      newSymbols.push(...cachedArtifacts);
      newRoutes.push(...cachedRoutes);
      newApis.push(...cachedApis);
      newEnv.push(...cachedEnv);
      newChunks.push(...cachedChunks);
      for (const spec of cachedImports) newImports.push({ file: f.rel, spec });
      continue;
    }
    const parsed = parseFile(f.rel, content);
    const artifacts = parsed.symbols;
    const chunks = chunkFile(f.rel, content, artifacts);
    const cf = { path: f.rel, size: content.length, hash, language: langOf(f.rel), symbolIds: artifacts.map((s) => s.id), imports: parsed.imports };
    fileRecords[f.rel] = cf;
    newFiles.push(cf);
    newSymbols.push(...artifacts);
    newRoutes.push(...parsed.routes);
    newApis.push(...parsed.apis);
    newEnv.push(...parsed.envVars);
    newChunks.push(...chunks);
    for (const spec of parsed.imports) newImports.push({ file: f.rel, spec });
    idx._files[f.rel] = { parseVersion: PARSE_VERSION, hash, symbols: artifacts, routes: parsed.routes, apis: parsed.apis, envVars: parsed.envVars, imports: parsed.imports, chunks };
  }

  // prune removed files from cache
  const known = new Set(Object.keys(fileRecords));
  for (const rel of Object.keys(idx._files)) {
    if (!known.has(rel)) delete idx._files[rel];
  }

  // neural embedding pass: batch-embed fresh chunks; fall back to hash pairs
  // if the embedder is unavailable (embedVersion stays 1 → retried next run)
  const toEmbed = newChunks.filter((c) => c.vec == null && c._text);
  let denseUsed = false;
  if (toEmbed.length) {
    try {
      const vecs = await embedTexts(toEmbed.map((c) => c._text));
      if (vecs.every((v) => v != null)) {
        toEmbed.forEach((c, i) => { c.vec = vecToB64(vecs[i]); });
        denseUsed = true;
      }
    } catch {}
    if (!denseUsed) {
      for (const c of toEmbed) c.vec = embedTokens(c._text).pairs;
    }
  }
  for (const c of newChunks) delete c._text;
  for (const rel of Object.keys(idx._files)) {
    const rec = idx._files[rel];
    const cs = rec.chunks || [];
    rec.embedVersion = cs.length && cs.every((c) => typeof c.vec === 'string') ? EMBED_VERSION : 1;
  }

  // resolve imports to workspace files → edges
  const edges = [];
  const fileByName = new Map();
  for (const fr of Object.values(fileRecords)) fileByName.set(fr.path, fr);
  for (const imp of newImports) {
    let target = null;
    const spec = imp.spec;
    if (spec.startsWith('.') || spec.startsWith('/')) {
      const baseDir = path.posix.dirname(imp.file);
      const resolved = path.posix.normalize(path.posix.join(baseDir, spec));
      for (const ext of ['', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '/index.js', '/index.ts', '/index.jsx']) {
        const tryPath = resolved + ext;
        if (fileByName.has(tryPath)) { target = tryPath; break; }
      }
      if (target && target !== imp.file) edges.push({ from: imp.file, to: target, type: 'import' });
    } else {
      // package dep edge
      if (deps.some((d) => d.name === spec || spec.startsWith(d.name + '/'))) {
        edges.push({ from: imp.file, to: `pkg:${spec}`, type: 'dep' });
      }
    }
  }

  // call graph: symbol-level, resolved by name within workspace
  const symByName = new Map();
  for (const s of newSymbols) {
    const key = s.name;
    if (!symByName.has(key)) symByName.set(key, []);
    symByName.get(key).push(s);
  }
  for (const s of newSymbols) {
    for (const called of s.calls || []) {
      const targets = symByName.get(called);
      if (targets) {
        for (const t of targets.slice(0, 4)) {
          if (t.id !== s.id) edges.push({ from: s.id, to: t.id, type: 'call' });
        }
      }
    }
  }

  idx.files = newFiles;
  idx.symbols = dedupeSymbols(newSymbols);
  idx.routes = newRoutes;
  idx.apis = newApis;
  idx.envVars = newEnv;
  idx.deps = deps;
  idx.database = db;
  idx.edges = edges;
  idx.chunks = newChunks;
  idx.updatedAt = Date.now();
  idx.version = PARSE_VERSION;
  idx.embedVersion = EMBED_VERSION;
  recomputeStats(idx);
  indexes.set(workspace, idx);
  persist(workspace);
  return idx;
}

function dedupeSymbols(symbols) {
  const seen = new Set();
  return symbols.filter((s) => {
    const key = `${s.id}::${s.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function langOf(rel) {
  const ext = path.extname(rel).toLowerCase();
  return ext === '.py' ? 'python' : ext === '.html' || ext === '.htm' ? 'html' : ext === '.css' ? 'css' : ext === '.json' ? 'json' : /\.(jsx|tsx)$/.test(rel) ? 'react' : ext === '.ts' ? 'typescript' : 'javascript';
}

// ─── watcher ────────────────────────────────────────────────────────

export function startWatch(workspace) {
  if (watchers.has(workspace)) return;
  const root = workspaceDirOf(workspace);
  if (!root || !fs.existsSync(root)) return;
  const w = { dirs: new Set(), timers: new Map(), files: new Map(), watchers: [] };
  watchers.set(workspace, w);
  const register = (dir) => {
    try {
      const fsw = fs.watch(dir, (evt, fname) => {
        void evt;
        const name = Buffer.isBuffer(fname) ? fname.toString() : fname || '';
        const full = path.join(dir, name);
        const rel = path.relative(root, full).split(path.sep).join('/');
        const timerKey = rel || '__root__';
        if (w.timers.has(timerKey)) clearTimeout(w.timers.get(timerKey));
        w.timers.set(
          timerKey,
          setTimeout(async () => {
            w.timers.delete(timerKey);
            try {
              const st = await fsp.stat(full);
              if (st.isDirectory()) {
                if (IGNORE.has(name)) return;
                await buildIndex(workspace);
                register(full);
                registerSubdirs(full, workspace);
              } else if (SCAN_EXTS.has(path.extname(name).toLowerCase())) {
                await buildIndex(workspace);
              }
            } catch {
              await buildIndex(workspace); // file removed
            }
          }, 700)
        );
      });
      fsw.on('error', () => {});
      w.dirs.add(dir);
      w.watchers.push(fsw);
    } catch {}
  };
  const registerSubdirs = (dir, ws) => {
    let items = [];
    try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const item of items) {
      if (item.isDirectory() && !IGNORE.has(item.name)) {
        register(path.join(dir, item.name));
        registerSubdirs(path.join(dir, item.name), ws);
      }
    }
  };
  if (workspace === '__project__' && PROJECT_DIRS) {
    for (const sub of PROJECT_DIRS) {
      const d = path.join(root, sub);
      if (!fs.existsSync(d)) continue;
      register(d);
      registerSubdirs(d, workspace);
    }
  } else {
    register(root);
    registerSubdirs(root, workspace);
  }
}

export function stopWatch(workspace) {
  const w = watchers.get(workspace);
  if (w) {
    for (const fsw of w.watchers) {
      try { fsw.close(); } catch {}
    }
    for (const t of w.timers.values()) clearTimeout(t);
    watchers.delete(workspace);
  }
}

export function dropWorkspace(workspace) {
  stopWatch(workspace);
  indexes.delete(workspace);
  try { fs.unlinkSync(indexFile(workspace)); } catch {}
}

// ─── queries ────────────────────────────────────────────────────────

export function getIndex(workspace) {
  return indexes.get(workspace) || null;
}

// Ensure an index exists and is up to date with the current parser/embedder
export async function ensureIndex(workspace) {
  const idx = indexes.get(workspace);
  if (!idx || idx.embedVersion !== EMBED_VERSION || idx.version !== PARSE_VERSION || !Array.isArray(idx.chunks)) {
    return buildIndex(workspace);
  }
  return idx;
}

export function searchSymbols(workspace, q, kind) {
  const idx = indexes.get(workspace);
  if (!idx) return [];
  const needle = String(q || '').toLowerCase();
  let syms = idx.symbols;
  if (kind && kind !== 'all') syms = syms.filter((s) => s.kind === kind);
  if (needle) {
    syms = syms.filter((s) => s.name.toLowerCase().includes(needle) || (s.signature || '').toLowerCase().includes(needle));
  }
  return syms.slice(0, 100).map((s) => ({ id: s.id, name: s.name, kind: s.kind, file: s.file, line: s.line, signature: s.signature }));
}

export function graphFor(workspace, node, { depth = 1, type = 'all' } = {}) {
  const idx = indexes.get(workspace);
  if (!idx) return { nodes: [], edges: [] };
  const nodeOut = (s) => ({ id: s.id, label: s.name, kind: s.kind, file: s.file, line: s.line, signature: s.signature });
  const fileNode = (file) => ({ id: file, label: file.split('/').pop() || file, kind: 'file', file, line: 1, signature: '' });
  const edgeOk = (e) => (type === 'all' || e.type === type);
  if (node) {
    let start = idx.symbols.find((s) => s.id === node);
    if (!start) start = idx.symbols.find((s) => s.name === node);
    if (!start) {
      const prefix = idx.symbols.filter((s) => node.startsWith(s.id));
      if (prefix.length) start = prefix.reduce((a, b) => (b.id.length > a.id.length ? b : a));
    }
    if (!start) return { nodes: [], edges: [] };
    const included = new Set([start.id]);
    const nodeEntries = new Map([[start.id, nodeOut(start)]]);
    let frontier = [start.id];
    const hops = Math.min(parseInt(depth, 10) || 1, 3);
    for (let h = 0; h < hops; h++) {
      const next = [];
      for (const cur of frontier) {
        const rel = idx.edges.filter((e) => edgeOk(e) && (e.from === cur || e.to === cur));
        for (const e of rel) {
          const otherId = e.from === cur ? e.to : e.from;
          if (included.has(otherId)) continue;
          included.add(otherId);
          const sym = idx.symbols.find((x) => x.id === otherId);
          if (sym) {
            nodeEntries.set(otherId, nodeOut(sym));
            next.push(otherId);
          } else if (typeof otherId === 'string' && !otherId.startsWith('pkg:')) {
            nodeEntries.set(otherId, fileNode(otherId));
          }
        }
      }
      frontier = next;
      if (included.size > 400) break;
    }
    const nodes = [...nodeEntries.values()];
    const edges = idx.edges.filter((e) => included.has(e.from) && included.has(e.to) && edgeOk(e));
    return { nodes, edges };
  }
  const limit = 500;
  return { nodes: idx.symbols.slice(0, limit).map(nodeOut), edges: idx.edges.filter((e) => e.type !== 'dep' && edgeOk(e)).slice(0, 1200) };
}

// Semantic retrieval: rank chunks by cosine similarity over neural embeddings
// (nomic-embed via LM Studio), falling back to hashed n-gram embeddings.
export async function semanticSearch(workspace, q, { limit = 8, filePrefix = null } = {}) {
  const idx = indexes.get(workspace);
  if (!idx || !Array.isArray(idx.chunks) || !idx.chunks.length) return [];
  let qDense = null;
  try {
    qDense = await embedQuery(q);
  } catch {}
  const qSparse = embedTokens(String(q || ''));
  const qvec = qDense || qSparse.pairs;
  if (!qvec || (!ArrayBuffer.isView(qvec) && !qvec.length)) return [];
  const terms = new Set(String(q || '').toLowerCase().split(/[^a-z0-9_]+/).filter((t) => t.length >= 2));
  const scored = [];
  for (const c of idx.chunks) {
    if (filePrefix && !c.file.startsWith(filePrefix)) continue;
    const cvec = chunkVec(workspace, c);
    if (!cvec) continue;
    const s = vecDot(qvec, cvec);
    if (s > 0.001) {
      let score = s;
      const pathLower = c.file.toLowerCase();
      for (const t of terms) {
        if (pathLower.includes(t)) score += 0.08;
      }
      scored.push({ ...c, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((c) => ({ id: c.id, file: c.file, line: c.startLine, score: c.score, snippet: c.snippet, labels: c.labels || [] }));
}

// Stage 2 seed: ranked files + symbols for a query (used by context builder)
export async function contextFor(workspace, q, { limit = 14 } = {}) {
  const idx = indexes.get(workspace);
  if (!idx) return { files: [], symbols: [] };
  const sem = await semanticSearch(workspace, q, { limit });
  if (sem.length) {
    const files = [...new Set(sem.map((r) => r.file))].slice(0, limit);
    const symbols = [];
    const seen = new Set();
    for (const r of sem) {
      for (const label of r.labels) {
        const key = `${r.file}::${label}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const syms = idx.symbols.filter((s) => s.file === r.file && s.name === label);
        if (syms.length) symbols.push(...syms.slice(0, 1));
      }
      if (symbols.length >= 40) break;
    }
    return { files, symbols: symbols.map((s) => ({ id: s.id, name: s.name, kind: s.kind, file: s.file, line: s.line, signature: s.signature })) };
  }
  const terms = String(q || '').toLowerCase().split(/[^a-z0-9_]+/).filter(Boolean);
  if (!terms.length) return { files: idx.files.slice(0, limit).map((f) => f.path), symbols: [] };
  const score = new Map(); // path -> score
  const symsByFile = new Map();
  for (const s of idx.symbols) {
    const name = s.name.toLowerCase();
    for (const t of terms) {
      if (name.includes(t)) {
        score.set(s.file, (score.get(s.file) || 0) + 3);
      }
    }
    if (!symsByFile.has(s.file)) symsByFile.set(s.file, []);
    symsByFile.get(s.file).push(s);
  }
  for (const f of idx.files) {
    const p = f.path.toLowerCase();
    for (const t of terms) {
      if (p.includes(t)) score.set(f.path, (score.get(f.path) || 0) + 2);
    }
  }
  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([p]) => p);
  const symbols = ranked.flatMap((p) => (symsByFile.get(p) || []).slice(0, 20));
  return { files: ranked, symbols: symbols.map((s) => ({ id: s.id, name: s.name, kind: s.kind, file: s.file, line: s.line, signature: s.signature })) };
}
