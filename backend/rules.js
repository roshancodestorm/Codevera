// Project rules engine — `.codestrom/rules/**/*.md` + `global_rules.md`.
// Version-controlled, glob-scoped instructions loaded into every agent run,
// composer edit and inline completion. Mirrors `.cursor/rules` / `.windsurf/rules`.
//
// Frontmatter (YAML-ish, one `key: value` per line):
//   ---
//   name: My Rule
//   glob: "src/**/*.ts"     # optional — only applies to matching files
//   apply: always           # always | auto (auto = only when a glob-matched file is in scope)
//   description: optional short label
//   ---
//   Markdown instructions…
//
// Precedence: project `always` > global `always` (global_rules.md) > `auto`.
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

const RULES_SUBDIR = path.join('.codestrom', 'rules');
const GLOBAL_FILE = 'global_rules.md';
const LEGACY_CANDIDATES = ['.neuralrules', 'AGENTS.md', '.cursorrules'];
const DEFAULT_CAP = 32000; // ~8k tokens
const CACHE_TTL = 5000;

const cache = new Map(); // dir -> { at, rules }

function posix(p) {
  return String(p || '').replace(/\\/g, '/');
}

// Convert a glob like "src/**/*.ts" / "**/*.test.{js,ts}" into a RegExp.
function globToRegex(glob) {
  const g = posix(glob).trim();
  if (!g) return null;
  let re = '^';
  let i = 0;
  while (i < g.length) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') {
        if (g[i + 2] === '/') {
          // "**/" matches any number of path segments (including none)
          re += '(?:[^/]*/)*';
          i += 3;
        } else {
          re += '.*';
          i += 2;
        }
      } else {
        re += '[^/]*';
        i += 1;
      }
    } else if (c === '?') {
      re += '[^/]';
      i += 1;
    } else if (c === '{') {
      const end = g.indexOf('}', i);
      if (end > i) {
        const alts = g.slice(i + 1, end).split(',').map((a) => a.trim()).filter(Boolean);
        re += '(?:' + alts.join('|') + ')';
        i = end + 1;
      } else { re += '\\{'; i += 1; }
    } else if (c === '[') {
      const end = g.indexOf(']', i);
      if (end > i) { re += g.slice(i, end + 1); i = end + 1; }
      else { re += '\\['; i += 1; }
    } else {
      re += c.replace(/[.+^$()|\\]/g, '\\$&');
      i += 1;
    }
  }
  re += '$';
  try { return new RegExp(re); } catch { return null; }
}

export function matchesGlob(glob, file) {
  const re = globToRegex(glob);
  if (!re) return false;
  return re.test(posix(file));
}

function parseFrontmatter(text) {
  const str = String(text || '');
  const m = str.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { frontmatter: {}, body: str.trim() };
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key) fm[key] = val;
  }
  return { frontmatter: fm, body: str.slice(m[0].length).trim() };
}

function ruleFrom(name, full, raw, level) {
  const { frontmatter, body } = parseFrontmatter(raw);
  return {
    name: frontmatter.name || name,
    glob: frontmatter.glob || null,
    apply: String(frontmatter.apply || 'always').toLowerCase() === 'auto' ? 'auto' : 'always',
    description: frontmatter.description || '',
    content: body,
    path: posix(full),
    level,
  };
}

async function scanRules(dir) {
  const rules = [];
  if (!dir || !fs.existsSync(dir)) return rules;
  const rulesDir = path.join(dir, RULES_SUBDIR);
  try {
    const entries = await fsp.readdir(rulesDir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isFile() || !/\.md$/i.test(e.name)) continue;
      try {
        const full = path.join(rulesDir, e.name);
        const raw = await fsp.readFile(full, 'utf8');
        rules.push(ruleFrom(e.name.replace(/\.md$/i, ''), full, raw, 'project'));
      } catch {}
    }
  } catch {}
  const gPath = path.join(dir, GLOBAL_FILE);
  if (fs.existsSync(gPath)) {
    try {
      const raw = await fsp.readFile(gPath, 'utf8');
      rules.push(ruleFrom('global_rules', gPath, raw, 'global'));
    } catch {}
  }
  return rules;
}

async function getRules(dir) {
  const hit = cache.get(dir);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.rules;
  const rules = await scanRules(dir);
  cache.set(dir, { at: Date.now(), rules });
  return rules;
}

export function invalidateRules(dir) {
  cache.delete(dir);
}

// Does a rule apply given the set of relative file paths currently in scope?
function ruleApplies(rule, files) {
  if (rule.apply === 'always' && !rule.glob) return true;
  if (!rule.glob) return false;
  if (!files.length) return rule.apply === 'always';
  return files.some((f) => matchesGlob(rule.glob, f));
}

function collectLegacy(dir) {
  for (const candidate of LEGACY_CANDIDATES) {
    const full = path.join(dir, candidate);
    if (fs.existsSync(full)) {
      try {
        const raw = fs.readFileSync(full, 'utf8');
        return { name: candidate, content: raw, level: 'legacy', path: candidate };
      } catch {}
    }
  }
  return null;
}

// Load every applicable rule for a workspace directory and render a prompt block.
// `files` are relative paths in scope (used for glob + auto matching).
export async function collectRules(dir, { files = [], cap = DEFAULT_CAP } = {}) {
  if (!dir || !fs.existsSync(dir)) return { text: '', rules: [], matched: [] };
  const all = await getRules(dir);
  const fileSet = Array.isArray(files) ? files : [];
  const matched = all.filter((r) => ruleApplies(r, fileSet)).sort((a, b) => {
    const prec = (r) => (r.level === 'global' ? 1 : 0) + (r.apply === 'auto' ? 2 : 0);
    return prec(a) - prec(b);
  });
  const legacy = collectLegacy(dir);
  const parts = matched.map((r) => {
    const header = r.name !== 'global_rules' ? `# Rule: ${r.name}${r.description ? ' — ' + r.description : ''}` : '# Global rules';
    return `${header}\n${r.content.trim()}`;
  });
  if (legacy) parts.push(`# Legacy rules (${legacy.name})\n${legacy.content.trim()}`);
  let text = parts.join('\n\n---\n\n').slice(0, cap);
  if (text && !text.startsWith('#')) text = `# Project rules\n${text}`;
  return { text, rules: all, matched };
}

function sanitizeRuleName(name) {
  let n = String(name || '').trim().replace(/\\/g, '/').replace(/^\.\.?[/\\]+/, '').replace(/^[/\\]+/, '');
  if (!n) return null;
  n = n.replace(/\.md$/i, '');
  if (/[^\w./\-\s]/.test(n)) return null;
  if (n.split('/').some((seg) => seg === '..' || seg === '.')) return null;
  if (n.length > 120) return null;
  return n;
}

export function registerRulesRoutes(router, deps) {
  const { workspaceDir, sendError } = deps;

  router.get('/rules', async (req, res) => {
    const { workspace } = req.query;
    const dir = workspaceDir(workspace);
    if (!dir) return sendError(res, 400, 'Invalid workspace');
    try {
      const rules = await getRules(dir);
      res.json({ rules });
    } catch (err) {
      sendError(res, 500, String(err.message || err));
    }
  });

  router.post('/rules', async (req, res) => {
    const { workspace, name, content, glob, apply, description } = req.body || {};
    const dir = workspaceDir(workspace);
    if (!dir) return sendError(res, 400, 'Invalid workspace');
    const safeName = sanitizeRuleName(name);
    if (!safeName) return sendError(res, 400, 'Invalid rule name — use letters, numbers, dash, dot or sub-folders');
    if (typeof content !== 'string') return sendError(res, 400, 'content is required');
    try {
      const isGlobal = safeName === 'global_rules';
      const full = isGlobal
        ? path.join(dir, GLOBAL_FILE)
        : path.join(dir, RULES_SUBDIR, `${safeName}.md`);
      const safeBase = isGlobal ? dir : path.join(dir, RULES_SUBDIR);
      if (full !== safeBase && !full.startsWith(safeBase + path.sep)) return sendError(res, 400, 'Rule path escaped the rules directory');
      fs.mkdirSync(path.dirname(full), { recursive: true });
      const fm = ['---'];
      if (safeName !== 'global_rules') fm.push(`name: ${safeName.split('/').pop()}`);
      if (glob) fm.push(`glob: "${String(glob).replace(/"/g, "'")}"`);
      fm.push(`apply: ${String(apply || 'always') === 'auto' ? 'auto' : 'always'}`);
      if (description) fm.push(`description: ${String(description).replace(/[\r\n]/g, ' ')}`);
      fm.push('---', '');
      await fsp.writeFile(full, fm.join('\n') + content.trim() + '\n', 'utf8');
      invalidateRules(dir);
      const raw = await fsp.readFile(full, 'utf8');
      const rule = ruleFrom(isGlobal ? 'global_rules' : safeName.split('/').pop(), full, raw, isGlobal ? 'global' : 'project');
      res.json({ ok: true, rule });
    } catch (err) {
      sendError(res, 500, `Failed to save rule: ${String(err.message || err)}`);
    }
  });

  router.delete('/rules', async (req, res) => {
    const { workspace, name } = req.query;
    const dir = workspaceDir(workspace);
    if (!dir) return sendError(res, 400, 'Invalid workspace');
    const safeName = sanitizeRuleName(name);
    if (!safeName) return sendError(res, 400, 'Invalid rule name');
    try {
      const full = safeName === 'global_rules'
        ? path.join(dir, GLOBAL_FILE)
        : path.join(dir, RULES_SUBDIR, `${safeName}.md`);
      if (safeName !== 'global_rules') {
        const rulesDir = path.join(dir, RULES_SUBDIR);
        if (!full.startsWith(rulesDir + path.sep)) return sendError(res, 400, 'Rule path escaped the rules directory');
      }
      if (!fs.existsSync(full)) return sendError(res, 404, 'Rule not found');
      await fsp.unlink(full);
      invalidateRules(dir);
      res.json({ ok: true });
    } catch (err) {
      sendError(res, 500, `Failed to delete rule: ${String(err.message || err)}`);
    }
  });
}
