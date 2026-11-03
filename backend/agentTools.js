import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { runCommand, DEFAULT_BLOCKED_COMMANDS } from './shellEnv.js';
import { detectProjectManifest, manifestSummaryForPrompt } from './projectManifest.js';
import { spawnSubAgent } from './subagent.js';

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.cache', '__pycache__', '.venv', 'venv', '.ide', '.memory']);

export const TOOL_NAMES = ['read_file', 'write_file', 'edit_file', 'list_dir', 'grep', 'run_command', 'project_info', 'fetch_url', 'browser_preview', 'delegate'];

export function createAgentToolExecutor({ workspaceDir, safeJoin, extraTools, fileLock }) {
  const changedFiles = new Set();
  const extra = extraTools && typeof extraTools.has === 'function' ? extraTools : new Map();
  // fileLock = { workspace, runId, acquire, release } — optional advisory write lock
  // for parallel runs; skip when absent (single-run / legacy behavior).
  const lock = fileLock && typeof fileLock.acquire === 'function' ? fileLock : null;

  async function readFile(args) {
    const rel = String(args.path || '').replace(/^[/\\]+/, '');
    const full = safeJoin(workspaceDir, rel);
    if (!full || !fs.existsSync(full)) return { ok: false, error: `File not found: ${rel}` };
    const stat = fs.statSync(full);
    if (!stat.isFile()) return { ok: false, error: 'Not a file' };
    const max = Math.min(Number(args.maxChars) || 24000, 80000);
    const content = await fsp.readFile(full, 'utf8');
    return { ok: true, path: rel, truncated: content.length > max, content: content.slice(0, max) };
  }

  async function writeFile(args) {
    const rel = String(args.path || '').replace(/^[/\\]+/, '');
    if (!rel) return { ok: false, error: 'path required' };
    const full = safeJoin(workspaceDir, rel);
    if (!full) return { ok: false, error: 'Invalid path' };
    if (lock) {
      const ok = await lock.acquire(lock.workspace, lock.runId, rel, 2000);
      if (!ok) return { ok: false, error: `FILE_BUSY: "${rel}" is being written by another active run` };
    }
    try {
      const content = String(args.content ?? '');
      await fsp.mkdir(path.dirname(full), { recursive: true });
      await fsp.writeFile(full, content, 'utf8');
      changedFiles.add(rel);
      return { ok: true, path: rel, bytes: Buffer.byteLength(content, 'utf8') };
    } finally {
      if (lock) lock.release(lock.workspace, lock.runId, rel);
    }
  }

  async function editFile(args) {
    const rel = String(args.path || '').replace(/^[/\\]+/, '');
    const find = String(args.find ?? '');
    const replace = String(args.replace ?? '');
    if (!find) return { ok: false, error: 'find block required' };
    const full = safeJoin(workspaceDir, rel);
    if (!full || !fs.existsSync(full)) return { ok: false, error: `File not found: ${rel}` };
    if (lock) {
      const ok = await lock.acquire(lock.workspace, lock.runId, rel, 2000);
      if (!ok) return { ok: false, error: `FILE_BUSY: "${rel}" is being written by another active run` };
    }
    try {
      const content = await fsp.readFile(full, 'utf8');
      const count = content.split(find).length - 1;
      if (count === 0) return { ok: false, error: 'find block not found in file' };
      if (count > 1) return { ok: false, error: `find block appears ${count} times — must be unique` };
      const next = content.replace(find, replace);
      await fsp.writeFile(full, next, 'utf8');
      changedFiles.add(rel);
      return { ok: true, path: rel, replaced: true };
    } finally {
      if (lock) lock.release(lock.workspace, lock.runId, rel);
    }
  }

  async function walkDir(dir, prefix, depth, limit, out) {
    if (depth > 4 || limit <= 0 || out.length >= 200) return;
    let items;
    try {
      items = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const item of items) {
      if (out.length >= 200 || limit <= 0) break;
      const rel = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.isDirectory()) {
        if (SKIP_DIRS.has(item.name)) continue;
        out.push({ path: rel, type: 'dir' });
        await walkDir(path.join(dir, item.name), rel, depth + 1, limit - 1, out);
      } else {
        out.push({ path: rel, type: 'file' });
      }
      limit--;
    }
  }

  async function listDir(args) {
    const rel = String(args.path || '.').replace(/^[/\\]+/, '') || '.';
    const full = rel === '.' ? workspaceDir : safeJoin(workspaceDir, rel);
    if (!full || !fs.existsSync(full)) return { ok: false, error: 'Directory not found' };
    const entries = [];
    await walkDir(full, rel === '.' ? '' : rel, 0, 150, entries);
    return { ok: true, entries };
  }

  async function grep(args) {
    const pattern = String(args.pattern || '');
    if (!pattern) return { ok: false, error: 'pattern required' };
    let re;
    try {
      re = new RegExp(pattern, args.ignoreCase ? 'i' : '');
    } catch (err) {
      return { ok: false, error: `Invalid regex: ${err.message}` };
    }
    const glob = String(args.glob || '').toLowerCase();
    const matches = [];
    const walk = async (dir, prefix) => {
      if (matches.length >= 40) return;
      let items;
      try {
        items = await fsp.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const item of items) {
        if (matches.length >= 40) break;
        const rel = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.isDirectory()) {
          if (SKIP_DIRS.has(item.name)) continue;
          await walk(path.join(dir, item.name), rel);
        } else {
          if (glob && !item.name.toLowerCase().includes(glob.replace('*', ''))) continue;
          const ext = path.extname(item.name).toLowerCase();
          if (['.png', '.jpg', '.gif', '.woff', '.lock', '.map'].includes(ext)) continue;
          const full = path.join(dir, item.name);
          let text;
          try {
            const st = fs.statSync(full);
            if (st.size > 512 * 1024) continue;
            text = await fsp.readFile(full, 'utf8');
          } catch {
            continue;
          }
          const lines = text.split(/\r?\n/);
          for (let i = 0; i < lines.length; i++) {
            if (re.test(lines[i])) {
              matches.push({ file: rel, line: i + 1, text: lines[i].slice(0, 200) });
              if (matches.length >= 40) break;
            }
          }
        }
      }
    };
    await walk(workspaceDir, '');
    return { ok: true, matchCount: matches.length, matches };
  }

  async function runCmd(args) {
    const command = String(args.command || '').trim();
    const result = await runCommand(workspaceDir, command, { blocked: DEFAULT_BLOCKED_COMMANDS });
    return { ok: result.exitCode === 0, ...result };
  }

  async function projectInfo() {
    const manifest = detectProjectManifest(workspaceDir);
    return {
      ok: true,
      manifest,
      summary: manifestSummaryForPrompt(manifest),
    };
  }

  async function fetchUrl(args) {
    const url = String(args.url || '').trim();
    const query = String(args.query || '').trim();
    const maxChars = Math.min(Number(args.maxChars) || 4000, 12000);
    try {
      if (url && /^https?:\/\//i.test(url)) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        try {
          const r = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CodestromBot/1.0)' },
          });
          if (!r.ok) return { ok: false, error: `HTTP ${r.status} from ${url}` };
          const html = await r.text();
          const text = html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim()
            .slice(0, maxChars);
          return { ok: true, content: text, source: url };
        } finally {
          clearTimeout(timer);
        }
      }
      if (query) {
        const ddg = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
          const r = await fetch(ddg, { signal: controller.signal });
          const data = await r.json();
          const abstract = String(data.AbstractText || data.Answer || '').slice(0, 3000);
          const related = Array.isArray(data.RelatedTopics)
            ? data.RelatedTopics.slice(0, 6).map((t) => String(t.Text || t.Result || '')).filter(Boolean).join('\n')
            : '';
          const content = [abstract, related].filter(Boolean).join('\n\n').slice(0, maxChars);
          return { ok: true, content: content || `No results for: ${query}`, source: `duckduckgo:${query}` };
        } finally {
          clearTimeout(timer);
        }
      }
      return { ok: false, error: 'Provide url (https://...) or query string' };
    } catch (err) {
      return { ok: false, error: String(err.message || err).slice(0, 200) };
    }
  }

  /**
   * browser_preview — launch the workspace URL (or a given url) in headless Chromium,
   * return a base64 screenshot + console errors + visible text summary.
   * Requires puppeteer (already installed in backend).
   */
  async function browserPreview(args) {
    const url = String(args.url || '').trim() || null;
    const waitMs = Math.min(Number(args.waitMs) || 2500, 10000);
    const maxTextChars = Math.min(Number(args.maxTextChars) || 3000, 8000);
    const action = String(args.action || '').trim(); // optional: "click:#btn-id" or "type:input[name=q]:hello"
    // Viewport: number form "375x812" or shortcuts "mobile" (375x812), "tablet" (768x1024), "desktop" (1280x800)
    let vw = 1280;
    let vh = 800;
    const vp = String(args.viewport || 'desktop').trim().toLowerCase();
    if (vp === 'mobile') { vw = 375; vh = 812; }
    else if (vp === 'tablet') { vw = 768; vh = 1024; }
    else {
      const m = vp.match(/^(\d+)x(\d+)$/);
      if (m) { vw = Math.max(320, Math.min(2560, Number(m[1]))); vh = Math.max(480, Math.min(2880, Number(m[2]))); }
    }

    // Resolve the URL to load
    let targetUrl = url;
    if (!targetUrl) {
      // Try to detect a running dev server in the workspace from well-known ports.
      // Never probe Codestrom's own ports (5000 API, 5173 IDE frontend) or the IDE
      // would load itself instead of the generated app.
      const reserved = new Set([5000, 5173]);
      const tryPorts = [4200, 4201, 4202, 3000, 5174, 8080, 8000, 4173, 3001].filter((p) => !reserved.has(p));
      for (const p of tryPorts) {
        try {
          const r = await fetch(`http://127.0.0.1:${p}`, { signal: AbortSignal.timeout(600) });
          if (r.ok || r.status < 500) { targetUrl = `http://127.0.0.1:${p}`; break; }
        } catch {}
      }
    }
    if (!targetUrl) {
      // Last resort: serve index.html from workspace
      const idx = path.join(workspaceDir, 'index.html');
      if (fs.existsSync(idx)) {
        targetUrl = `file:///${idx.replace(/\\/g, '/')}`;
      } else {
        return { ok: false, error: 'No running dev server found. Start one with run_command first, or pass { "url": "http://localhost:PORT" }.' };
      }
    }

    let browser = null;
    try {
      const { default: puppeteer } = await import('puppeteer');
      browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      await page.setViewport({ width: vw, height: vh });

      const consoleErrors = [];
      const pageErrors = [];
      page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200)); });
      page.on('pageerror', (err) => pageErrors.push(String(err?.message || err).slice(0, 200)));

      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise((r) => setTimeout(r, waitMs));

      // Optional interaction
      if (action.startsWith('click:')) {
        const sel = action.slice(6).trim();
        await page.click(sel).catch(() => {});
        await new Promise((r) => setTimeout(r, 600));
      } else if (action.startsWith('type:')) {
        const parts = action.slice(5).split(':');
        if (parts.length >= 2) {
          await page.type(parts[0].trim(), parts.slice(1).join(':').trim()).catch(() => {});
          await new Promise((r) => setTimeout(r, 400));
        }
      }

      // Screenshot as base64
      const screenshotBuf = await page.screenshot({ type: 'png', encoding: 'base64', clip: { x: 0, y: 0, width: 1280, height: 800 } });
      const screenshot = typeof screenshotBuf === 'string' ? screenshotBuf.slice(0, 32000) : '';

      // Visible text summary
      const visibleText = await page.evaluate(() => {
        const body = document.body;
        if (!body) return '';
        const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null);
        const parts = [];
        let node;
        while ((node = walker.nextNode())) {
          const t = (node.textContent || '').trim();
          if (t) parts.push(t);
        }
        return parts.join(' ').replace(/\s+/g, ' ').slice(0, 4000);
      }).catch(() => '');

      // Responsive check: horizontal overflow means a broken mobile layout
      const layout = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        docWidth: document.documentElement.scrollWidth,
        scrollable: document.documentElement.scrollWidth > window.innerWidth,
      })).catch(() => ({ scrollable: false }));

      // Current URL after navigation (may differ due to redirects)
      const finalUrl = page.url();

return {
        ok: true,
        url: finalUrl,
        viewport: `${vw}x${vh}`,
        responsive: layout,
        screenshot: screenshot ? `data:image/png;base64,${screenshot}` : null,
        screenshotNote: '(base64 PNG — describe what you see to help debug)',
        visibleText: visibleText.slice(0, maxTextChars),
        consoleErrors: [...new Set(consoleErrors)].slice(0, 8),
        pageErrors: [...new Set(pageErrors)].slice(0, 5),
        hasErrors: consoleErrors.length > 0 || pageErrors.length > 0,
      };
    } catch (err) {
      return { ok: false, error: `browser_preview failed: ${String(err?.message || err).slice(0, 300)}` };
    } finally {
      try { await browser?.close(); } catch {}
    }
  }

  async function execute(tool, args) {
    switch (tool) {
      case 'read_file':
        return readFile(args || {});
      case 'write_file':
        return writeFile(args || {});
      case 'edit_file':
        return editFile(args || {});
      case 'list_dir':
        return listDir(args || {});
      case 'grep':
        return grep(args || {});
      case 'run_command':
        return runCmd(args || {});
      case 'project_info':
        return projectInfo();
      case 'fetch_url':
        return fetchUrl(args || {});
      case 'browser_preview':
        return browserPreview(args || {});
      case 'delegate':
        return delegateTool(args || {});
      default: {
        if (extra.has(tool)) {
          const { server, name, sessionId } = extra.get(tool);
          try {
            const { mcpCallTool } = await import('./mcp.js');
            const result = await mcpCallTool(server, name, args || {}, sessionId);
            return { ok: !result.isError, content: result.text, isError: result.isError };
          } catch (err) {
            return { ok: false, error: `MCP tool failed: ${err?.message || err}` };
          }
        }
        return { ok: false, error: `Unknown tool: ${tool}` };
      }
    }
  }

  async function delegateTool(args) {
    const { role = 'coder', task, contextBudget = 8000, maxSteps = 6, workspace = workspaceDir } = args;
    if (!task || typeof task !== 'string') return { ok: false, error: 'delegate: task required' };
    try {
      const result = await spawnSubAgent(
        { parentRunId: `main-${Date.now()}`, task, role, contextBudget, workspace },
        { workspaceDir, sendError: (_, __, msg) => { throw new Error(msg); }, callLLM: null, safeJoin }
      );
      return { ok: true, runId: result.runId, message: `Sub-agent ${result.runId} (${role}) started. Use sub-status to check progress.` };
    } catch (err) {
      return { ok: false, error: `delegate failed: ${String(err?.message || err)}` };
    }
  }

  function getChangedFiles() {
    return [...changedFiles];
  }

  function resetChangedFiles() {
    changedFiles.clear();
  }

  return { execute, getChangedFiles, resetChangedFiles };
}

// Production quality bar injected into every agent system prompt. This is what
// separates a "demo" from a Cursor-grade deliverable.
export const PRODUCTION_QUALITY_RUBRIC = `PRODUCTION QUALITY BAR — every deliverable (especially websites/web apps) must ship as PRODUCTION-GRADE, never a demo:

STRUCTURE
- Separate concerns: dedicated CSS file, dedicated JS file, assets/ folder. Never inline large CSS/JS into index.html. Use semantic HTML5 (header/nav/main/section/footer, proper h1→h3 hierarchy).
- If the requirement implies persistence (booking, contact, forms, cart, auth, login): build a REAL backend (Express API — e.g. server.js + JSON file storage or SQLite). Forms must actually fetch() to real endpoints and render the result. NEVER a fake confirmation that stores nothing.
- Single source of truth: constants (prices, menu items, config) defined ONCE and referenced everywhere. Never duplicate hardcoded values across files.

DESIGN & UI
- Responsive, mobile-first: media queries for tablet/mobile, tap targets ≥ 44px, NO horizontal scroll at 375px. Verify with browser_preview in BOTH desktop and mobile viewports before finishing.
- Modern visual design: coherent color palette, good typography (system stack or Google Fonts), spacing scale, cards with subtle shadows, hover/focus states, smooth transitions. Nothing may look like the browser default (plain Arial, white box on white, default blue links).
- Real imagery/icons: placeholder images (picsum.photos) or inline SVG icons where relevant; hero section with headline + CTA where appropriate.

SEO & META
- <title>, meta description, Open Graph tags, favicon (SVG data URI or assets/favicon.svg), alt text on every image.

ACCESSIBILITY
- Real <label for> on every input, 4.5:1 contrast, visible focus-visible outlines, keyboard-navigable.

DOCS
- README.md with overview + setup/run instructions.

QUALITY GATE (BEFORE replying done)
- browser_preview at desktop AND mobile (viewport "mobile"); fix EVERY console error, page error, missing asset, broken interaction, and horizontal overflow.
- Click through every link/form/flow end-to-end.
- If you added a backend, start it and exercise each endpoint (curl or browser_preview) before finishing.

FULL-STACK APPS (React/SPA frontend + Express API)
- Keep the client and server in ONE project: frontend under src/ (React + Vite), API under server/ (Express). Do NOT collapse the API into static files.
- The frontend must call the API through RELATIVE /api/* URLs (the Vite dev/preview server proxies /api) — never hardcode host:port. Read ports from the environment: PORT (web) and API_PORT (API); API_PORT defaults to PORT + 1.
- The API must expose an /api/health endpoint and real REST routes backed by persistence (SQLite via node:sqlite, or a JSON store). Validate and sanitize every request body; return proper status codes (200/201/400/404/500) and JSON errors.
- Wire scripts so both halves run and verify: "dev" (concurrent API + Vite), "build" (vite build), "start" (serve API + built dist), "test" (node --test hitting the API).
- Handle async in the UI: loading, empty, success and error states; never leave a form that silently does nothing.
- Before finishing, verify BOTH halves: start the API and hit /api/health plus one write→read round-trip, then load the built frontend in the browser and confirm data flows from API to UI with no console errors.`;

export const AGENT_TOOL_SYSTEM = `You are an autonomous coding agent (OpenCode-style). Use tools to read, edit, and verify the workspace until the user's task is complete.

Reply with STRICT JSON only — one object per turn, no markdown fences.

SINGLE tool call:
{"type":"tool","tool":"<name>","args":{...}}

PARALLEL tool calls (use when multiple independent reads/greps can run simultaneously):
{"type":"tools","calls":[{"tool":"<name>","args":{...}},{"tool":"<name>","args":{...}}]}

When finished:
{"type":"done","message":"concise summary for the user"}

Available tools:
- read_file: { "path": string, "maxChars"?: number }
- write_file: { "path": string, "content": string } — full file content
- edit_file: { "path": string, "find": string, "replace": string } — find must appear exactly once
- list_dir: { "path"?: string } — default "."
- grep: { "pattern": string, "glob"?: string, "ignoreCase"?: boolean }
- run_command: { "command": string } — shell command in workspace root (install, build, test)
- project_info: {} — detected stack and suggested commands
- fetch_url: { "url"?: string, "query"?: string, "maxChars"?: number } — fetch a web page (url) or search DuckDuckGo (query) for docs/APIs
- browser_preview: { "url"?: string, "waitMs"?: number, "action"?: string, "viewport"?: string, "maxTextChars"?: number } — open a URL in headless Chromium; returns visibleText + consoleErrors + responsive overflow check + screenshot (base64). viewport: "desktop" | "tablet" | "mobile" or "WxH". If url is omitted, auto-detects the running dev server. action can be "click:#selector" or "type:input[name=q]:hello world".
- delegate: { "goal": string, "files"?: string[], "maxSteps"?: number, "budgetTokens"?: number } — spawn a focused sub-agent to investigate or implement a self-contained subtask (e.g. search+summarize an area, write a unit test, draft a helper module). Runs autonomously in the workspace and returns {summary, filesTouched}. Do NOT delegate the whole main task; delegate only a clearly-bounded piece.

Rules:
- Prefer edit_file for small changes; write_file for new files or large rewrites.
- Run project_info early when opening an unfamiliar repo.
- Use fetch_url to read API docs, library changelogs, or search for error solutions before guessing.
- After building a web app, call browser_preview to verify it renders correctly before replying done.
- Use browser_preview visibleText and consoleErrors to self-diagnose and fix rendering or JS errors.
- After edits, run appropriate verify commands (npm test, npm run build, etc.) when toolchain allows.
- Paths are relative to the workspace root. Do not access paths outside the workspace.
- When reading multiple independent files, use type "tools" with parallel calls to save steps.
- Consider delegate for a self-contained sub-goal (a focused investigation or a small isolated task) so the main loop stays short.
- When the task is done, reply with type "done" only — do not call tools in the same message.

${PRODUCTION_QUALITY_RUBRIC}`;
