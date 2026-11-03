// Skills library — `.codestrom/skills/<slug>.md`.
// Named, reusable instruction packs ("how to add a payment gateway", "repo
// conventions", "React patterns") stored as version-controlled markdown and
// injected into every agent run, composer edit and chat call alongside rules.
//
// Frontmatter (YAML-ish):
//   ---
//   name: Payments
//   description: How to add Stripe payments
//   tags: backend, payments
//   enabled: true
//   glob: "**/*.{ts,tsx}"      # optional — only applies to matching files
//   ---
//   Markdown instructions…
//
// Unlike rules (short constraints), skills are longer "playbooks". They are
// always injected in `enabled` order, newest first, capped by character budget.
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { matchesGlob } from './rules.js';

const SKILLS_SUBDIR = path.join('.codestrom', 'skills');
const DEFAULT_CAP = 20000; // ~5k tokens
const CACHE_TTL = 5000;

const cache = new Map(); // dir -> { at, skills }

function posix(p) {
  return String(p || '').replace(/\\/g, '/');
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

function skillFrom(slug, full, raw) {
  const { frontmatter, body } = parseFrontmatter(raw);
  const enabled = String(frontmatter.enabled ?? 'true').toLowerCase() !== 'false';
  return {
    slug,
    name: frontmatter.name || slug.replace(/[-_]/g, ' '),
    description: frontmatter.description || '',
    tags: String(frontmatter.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
    enabled,
    glob: frontmatter.glob || null,
    content: body,
    path: posix(full),
    updatedAt: Date.now(),
  };
}

async function scanSkills(dir) {
  const skills = [];
  if (!dir || !fs.existsSync(dir)) return skills;
  const skillsDir = path.join(dir, SKILLS_SUBDIR);
  try {
    const entries = await fsp.readdir(skillsDir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isFile() || !/\.md$/i.test(e.name)) continue;
      try {
        const full = path.join(skillsDir, e.name);
        const raw = await fsp.readFile(full, 'utf8');
        skills.push(skillFrom(e.name.replace(/\.md$/i, ''), full, raw));
      } catch {}
    }
  } catch {}
  return skills;
}

export async function getSkills(dir) {
  const hit = cache.get(dir);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.skills;
  const skills = await scanSkills(dir);
  cache.set(dir, { at: Date.now(), skills });
  return skills;
}

export function invalidateSkills(dir) {
  cache.delete(dir);
}

function skillApplies(skill, files) {
  if (!skill.enabled) return false;
  if (!skill.glob) return true;
  if (!files.length) return false;
  return files.some((f) => matchesGlob(skill.glob, f));
}

// Render every enabled skill into a prompt block. `files` = relative paths in scope.
export async function collectSkills(dir, { files = [], cap = DEFAULT_CAP } = {}) {
  if (!dir || !fs.existsSync(dir)) return { text: '', skills: [] };
  const all = await getSkills(dir);
  const fileSet = Array.isArray(files) ? files : [];
  const active = all.filter((s) => skillApplies(s, fileSet)).sort((a, b) => b.updatedAt - a.updatedAt);
  const parts = active.map((s) => {
    const head = `# Skill: ${s.name}${s.description ? ' — ' + s.description : ''}`;
    return `${head}\n${s.content.trim()}`;
  });
  let text = parts.join('\n\n---\n\n').slice(0, cap);
  if (text && !text.startsWith('#')) text = `# Skills\n${text}`;
  return { text, skills: all };
}

function sanitizeSlug(name) {
  let n = String(name || '').trim().replace(/\\/g, '/').replace(/^\.\.?[/\\]+/, '').replace(/^[/\\]+/, '');
  if (!n) return null;
  n = n.replace(/\.md$/i, '');
  if (/[^\w./\-\s]/.test(n)) return null;
  if (n.split('/').some((seg) => seg === '..' || seg === '.')) return null;
  if (n.length > 120) return null;
  return n;
}

export function registerSkillsRoutes(router, deps) {
  const { workspaceDir, sendError } = deps;

  router.get('/skills', async (req, res) => {
    const { workspace } = req.query;
    const dir = workspaceDir(workspace);
    if (!dir) return sendError(res, 400, 'Invalid workspace');
    try {
      const skills = await getSkills(dir);
      res.json({ skills });
    } catch (err) {
      sendError(res, 500, String(err.message || err));
    }
  });

  router.post('/skills', async (req, res) => {
    const { workspace, name, content, description, tags, enabled, glob } = req.body || {};
    const dir = workspaceDir(workspace);
    if (!dir) return sendError(res, 400, 'Invalid workspace');
    const slug = sanitizeSlug(name);
    if (!slug) return sendError(res, 400, 'Invalid skill name — use letters, numbers, dash, dot or sub-folders');
    if (typeof content !== 'string' || !content.trim()) return sendError(res, 400, 'content is required');
    try {
      const full = path.join(dir, SKILLS_SUBDIR, `${slug}.md`);
      const safeBase = path.join(dir, SKILLS_SUBDIR);
      if (!full.startsWith(safeBase + path.sep)) return sendError(res, 400, 'Skill path escaped the skills directory');
      fs.mkdirSync(path.dirname(full), { recursive: true });
      const fm = [
        '---',
        `name: ${slug.split('/').pop()}`,
      ];
      if (description) fm.push(`description: ${String(description).replace(/[\r\n]/g, ' ')}`);
      if (Array.isArray(tags) && tags.length) fm.push(`tags: ${tags.map((t) => String(t).trim()).filter(Boolean).join(', ')}`);
      if (glob) fm.push(`glob: "${String(glob).replace(/"/g, "'")}"`);
      fm.push(`enabled: ${String(enabled) === 'false' ? 'false' : 'true'}`);
      fm.push('---', '');
      await fsp.writeFile(full, fm.join('\n') + content.trim() + '\n', 'utf8');
      invalidateSkills(dir);
      const raw = await fsp.readFile(full, 'utf8');
      const skill = skillFrom(slug.split('/').pop(), full, raw);
      res.json({ ok: true, skill });
    } catch (err) {
      sendError(res, 500, `Failed to save skill: ${String(err.message || err)}`);
    }
  });

  router.delete('/skills', async (req, res) => {
    const { workspace, name } = req.query;
    const dir = workspaceDir(workspace);
    if (!dir) return sendError(res, 400, 'Invalid workspace');
    const slug = sanitizeSlug(name);
    if (!slug) return sendError(res, 400, 'Invalid skill name');
    try {
      const full = path.join(dir, SKILLS_SUBDIR, `${slug}.md`);
      const skillsDir = path.join(dir, SKILLS_SUBDIR);
      if (!full.startsWith(skillsDir + path.sep)) return sendError(res, 400, 'Skill path escaped the skills directory');
      if (!fs.existsSync(full)) return sendError(res, 404, 'Skill not found');
      await fsp.unlink(full);
      invalidateSkills(dir);
      res.json({ ok: true });
    } catch (err) {
      sendError(res, 500, `Failed to delete skill: ${String(err.message || err)}`);
    }
  });
}
