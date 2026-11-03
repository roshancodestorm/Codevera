/**
 * extensions.js — VSCode-compatible extension manager
 *
 * Searches and installs extensions from the Open VSX Registry (open-vsx.org)
 * — a vendor-neutral, fully open alternative to the Microsoft Marketplace.
 * Extensions are downloaded as .vsix archives and their contributions
 * (themes, grammars, snippets) are extracted so Monaco can load them.
 *
 * Routes mounted under /api/ide/extensions:
 *
 *   GET  /search?q=<query>&limit=20        Search Open VSX registry
 *   GET  /list                             List installed extensions
 *   POST /install                          Install { publisher, name, version? }
 *   POST /uninstall                        Uninstall { id }
 *   GET  /metadata/:publisher/:name        Get extension metadata
 *   GET  /themes                           List installed colour themes
 *   GET  /grammars                         List language grammars (for Monaco)
 *   GET  /snippets/:lang                   Snippets for a language
 *
 * Data directory: <workspacesRoot>/../.ide/extensions/
 */

import { Router } from 'express';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';

const BACKEND_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(BACKEND_DIR, '..');
const EXT_DIR = path.join(PROJECT_ROOT, '.ide', 'extensions');
const META_FILE = path.join(EXT_DIR, 'installed.json');

const OPEN_VSX = 'https://open-vsx.org/api';
const TIMEOUT_MS = 20000;

// ── Persistence helpers ───────────────────────────────────────────────────────

function ensureExtDir() {
  fs.mkdirSync(EXT_DIR, { recursive: true });
}

function loadMeta() {
  ensureExtDir();
  try { return JSON.parse(fs.readFileSync(META_FILE, 'utf8')); } catch { return {}; }
}

function saveMeta(meta) {
  ensureExtDir();
  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2), 'utf8');
}

// ── Open VSX API helpers ──────────────────────────────────────────────────────

async function vsxFetch(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`Open VSX: HTTP ${r.status}`);
    return r.json();
  } finally {
    clearTimeout(timer);
  }
}

async function vsxDownload(url, destFile) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`Download failed: HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    await fsp.writeFile(destFile, buf);
    return buf;
  } finally {
    clearTimeout(timer);
  }
}

// ── VSIX extraction ───────────────────────────────────────────────────────────
// A .vsix is just a ZIP containing extension/package.json + extension/ folder.
// We extract it and index the contributions.

async function extractVsix(vsixBuf, extDestDir) {
  const zip = await JSZip.loadAsync(vsixBuf);
  const files = {};
  for (const [zipPath, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    // Strip the "extension/" prefix that VS Code .vsix archives use
    const relPath = zipPath.replace(/^extension\//, '');
    const destPath = path.join(extDestDir, relPath);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    const content = await zipEntry.async('nodebuffer');
    await fsp.writeFile(destPath, content);
    files[relPath] = destPath;
  }
  return files;
}

// Parse package.json contributions from an installed extension
function parseContributions(pkgJson) {
  const c = pkgJson.contributes || {};
  return {
    themes:    (c.themes || []).map((t) => ({ label: t.label, uiTheme: t.uiTheme, path: t.path })),
    grammars:  (c.grammars || []).map((g) => ({ language: g.language, scopeName: g.scopeName, path: g.path })),
    languages: (c.languages || []).map((l) => ({ id: l.id, extensions: l.extensions || [], aliases: l.aliases || [] })),
    snippets:  (c.snippets || []).map((s) => ({ language: s.language, path: s.path })),
  };
}

// ── Router ────────────────────────────────────────────────────────────────────

const router = Router();

// Search Open VSX
router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const limit = Math.min(50, parseInt(String(req.query.limit || '20'), 10) || 20);
  if (!q) return res.json({ extensions: [], total: 0 });
  try {
    const url = `${OPEN_VSX}/-/search?query=${encodeURIComponent(q)}&size=${limit}&sortBy=relevance&sortOrder=desc`;
    const data = await vsxFetch(url);
    const extensions = (data.extensions || []).map((e) => ({
      id: `${e.namespace}.${e.name}`,
      publisher: e.namespace,
      name: e.name,
      displayName: e.displayName || e.name,
      description: e.description || '',
      version: e.version,
      downloads: e.downloadCount || 0,
      rating: e.averageRating || 0,
      tags: e.tags || [],
      categories: e.categories || [],
      icon: e.files?.icon || null,
      installed: !!loadMeta()[`${e.namespace}.${e.name}`],
    }));
    res.json({ extensions, total: data.totalSize || extensions.length });
  } catch (err) {
    res.status(502).json({ error: `Open VSX search failed: ${err.message}` });
  }
});

// List installed extensions
router.get('/list', (_req, res) => {
  const meta = loadMeta();
  const list = Object.values(meta).map((e) => ({
    id: e.id,
    publisher: e.publisher,
    name: e.name,
    displayName: e.displayName,
    version: e.version,
    description: e.description,
    themes: e.contributions?.themes || [],
    grammars: e.contributions?.grammars || [],
    languages: e.contributions?.languages || [],
    snippets: e.contributions?.snippets || [],
    installedAt: e.installedAt,
  }));
  res.json({ extensions: list });
});

// Install an extension
router.post('/install', async (req, res) => {
  const { publisher, name, version } = req.body || {};
  if (!publisher || !name) return res.status(400).json({ error: 'publisher and name required' });
  const id = `${publisher}.${name}`;

  try {
    // Fetch metadata
    const metaUrl = version
      ? `${OPEN_VSX}/api/${publisher}/${name}/${version}`
      : `${OPEN_VSX}/${publisher}/${name}`;
    const data = await vsxFetch(metaUrl);
    const resolvedVersion = data.version || version || 'latest';
    const downloadUrl = data.files?.download;
    if (!downloadUrl) return res.status(404).json({ error: 'No download URL found for this extension' });

    // Download .vsix
    ensureExtDir();
    const vsixFile = path.join(EXT_DIR, `${id}-${resolvedVersion}.vsix`);
    const vsixBuf = await vsxDownload(downloadUrl, vsixFile);

    // Extract
    const extDestDir = path.join(EXT_DIR, id.replace(/\./g, '-'));
    fs.mkdirSync(extDestDir, { recursive: true });
    await extractVsix(vsixBuf, extDestDir);

    // Parse package.json
    let contributions = {};
    let displayName = data.displayName || name;
    let description = data.description || '';
    try {
      const pkgPath = path.join(extDestDir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(await fsp.readFile(pkgPath, 'utf8'));
        contributions = parseContributions(pkg);
        displayName = pkg.displayName || displayName;
        description = pkg.description || description;
      }
    } catch {}

    // Persist metadata
    const meta = loadMeta();
    meta[id] = {
      id,
      publisher,
      name,
      displayName,
      version: resolvedVersion,
      description,
      contributions,
      vsixFile,
      extDir: extDestDir,
      installedAt: new Date().toISOString(),
    };
    saveMeta(meta);

    res.json({ ok: true, id, version: resolvedVersion, contributions });
  } catch (err) {
    res.status(500).json({ error: `Install failed: ${err.message}` });
  }
});

// Uninstall
router.post('/uninstall', async (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id required' });
  const meta = loadMeta();
  const ext = meta[id];
  if (!ext) return res.status(404).json({ error: 'Extension not installed' });
  try {
    if (ext.extDir && fs.existsSync(ext.extDir)) {
      await fsp.rm(ext.extDir, { recursive: true, force: true });
    }
    if (ext.vsixFile && fs.existsSync(ext.vsixFile)) {
      await fsp.unlink(ext.vsixFile).catch(() => {});
    }
  } catch {}
  delete meta[id];
  saveMeta(meta);
  res.json({ ok: true });
});

// Extension metadata from registry
router.get('/metadata/:publisher/:name', async (req, res) => {
  const { publisher, name } = req.params;
  try {
    const data = await vsxFetch(`${OPEN_VSX}/${publisher}/${name}`);
    const installed = !!loadMeta()[`${publisher}.${name}`];
    res.json({ ...data, installed });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Themes list (from all installed extensions)
router.get('/themes', (_req, res) => {
  const meta = loadMeta();
  const themes = [];
  for (const ext of Object.values(meta)) {
    for (const t of (ext.contributions?.themes || [])) {
      const absPath = ext.extDir ? path.join(ext.extDir, t.path) : null;
      themes.push({
        id: `${ext.id}/${t.label}`,
        label: t.label,
        uiTheme: t.uiTheme,
        extensionId: ext.id,
        path: absPath && fs.existsSync(absPath) ? absPath : null,
      });
    }
  }
  res.json({ themes });
});

// Grammar list (for Monaco tokenizers)
router.get('/grammars', (_req, res) => {
  const meta = loadMeta();
  const grammars = [];
  for (const ext of Object.values(meta)) {
    for (const g of (ext.contributions?.grammars || [])) {
      const absPath = ext.extDir ? path.join(ext.extDir, g.path) : null;
      grammars.push({
        language: g.language,
        scopeName: g.scopeName,
        extensionId: ext.id,
        path: absPath && fs.existsSync(absPath) ? absPath : null,
      });
    }
  }
  res.json({ grammars });
});

// Grammar file content (served to Monaco at runtime)
router.get('/grammar-file', async (req, res) => {
  const { ext: extId, file } = req.query;
  if (!extId || !file) return res.status(400).json({ error: 'ext and file required' });
  const meta = loadMeta();
  const extMeta = meta[String(extId)];
  if (!extMeta?.extDir) return res.status(404).json({ error: 'Extension not found' });
  const full = path.resolve(extMeta.extDir, String(file).replace(/^\/+/, ''));
  if (!full.startsWith(extMeta.extDir + path.sep)) return res.status(403).json({ error: 'path traversal blocked' });
  if (!fs.existsSync(full)) return res.status(404).json({ error: 'File not found' });
  const ext = path.extname(full).toLowerCase();
  res.setHeader('Content-Type', ext === '.json' ? 'application/json' : 'text/plain');
  res.sendFile(full);
});

// Snippets for a language
router.get('/snippets/:lang', async (req, res) => {
  const lang = req.params.lang.toLowerCase();
  const meta = loadMeta();
  const allSnippets = {};
  for (const ext of Object.values(meta)) {
    for (const s of (ext.contributions?.snippets || [])) {
      if ((s.language || '').toLowerCase() !== lang) continue;
      const absPath = ext.extDir ? path.join(ext.extDir, s.path) : null;
      if (!absPath || !fs.existsSync(absPath)) continue;
      try {
        const raw = JSON.parse(await fsp.readFile(absPath, 'utf8'));
        Object.assign(allSnippets, raw);
      } catch {}
    }
  }
  res.json({ snippets: allSnippets, count: Object.keys(allSnippets).length });
});

export default router;
