import http from 'node:http';
import { readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jsx': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webp': 'image/webp', '.md': 'text/plain', '.txt': 'text/plain' };

export async function browserSanityIssues(dir, { timeoutMs = 30000, url = null } = {}) {
  const issues = [];
  let root = path.resolve(dir);
  if (!url) {
    for (const sub of ['dist', 'build', 'out']) {
      if (existsSync(path.join(root, sub, 'index.html'))) { root = path.join(root, sub); break; }
    }
  }
  let server = null;
  let port = 0;
  if (!url) {
    server = http.createServer((req, res) => {
      let rel;
      try { rel = decodeURIComponent(req.url.split('?')[0]); } catch { rel = '/'; }
      if (rel === '/') rel = 'index.html';
      const full = path.resolve(root, rel.replace(/^\/+/, ''));
      if (full !== root && !full.startsWith(root + path.sep)) { res.writeHead(403); return res.end('forbidden'); }
      if (!existsSync(full) || statSync(full).isDirectory()) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(readFileSync(full));
    });

    try {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
      });
      port = server.address().port;
    } catch (err) {
      return { issues: [`browser server could not start: ${err.message}`], detail: {} };
    }
  }

  const baseUrl = url || `http://127.0.0.1:${port}`;
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  let browser = null;
  try {
    browser = await puppeteer.launch({ headless: 'shell' });
    const page = await browser.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const loc = typeof msg.location === 'function' ? msg.location() : null;
        consoleErrors.push(loc ? `${msg.text()} (${loc.url}:${loc.lineNumber})` : msg.text());
      }
    });
    page.on('pageerror', (err) => pageErrors.push(err?.stack || String(err)));
    page.on('requestfailed', (req) => failedRequests.push(req.url()));

    await page.goto(baseUrl, { waitUntil: 'networkidle0', timeout: timeoutMs });
    await new Promise((r) => setTimeout(r, 500));

    // Responsive check — reload at mobile width and detect horizontal scroll
    try {
      await page.setViewport({ width: 375, height: 812 });
      await new Promise((r) => setTimeout(r, 400));
      const overflow = await page.evaluate(() => ({
        doc: document.documentElement.scrollWidth,
        win: window.innerWidth,
      })).catch(() => null);
      if (overflow && overflow.doc > overflow.win) {
        issues.push(`NOT mobile responsive: at 375px viewport the page is ${overflow.doc}px wide (viewport ${overflow.win}px) — horizontal scrolling required. Add media queries / fluid layouts.`);
      }
    } catch {}

    // Interactive input/submit smoke test — only run on pages that look like
    // task/todo/CRUD apps (have a dedicated output list that should reflect input).
    // Static sites (landing pages, portfolios, marketing) use inputs only for
    // contact/newsletter forms where the typed text is never echoed back into the
    // DOM, so this check would always produce a false-positive failure there.
    const looksLikeCrudApp = await page.evaluate(() => {
      const hasTaskList = !!(document.getElementById('taskList') || document.getElementById('todoList') || document.getElementById('itemList'));
      const hasAddBtn   = !!document.querySelector('[id*="add"],[id*="submit"],[class*="add-btn"],[class*="add_btn"]');
      return hasTaskList || hasAddBtn;
    }).catch(() => false);

    if (looksLikeCrudApp) {
      const inputCount = await page.evaluate(() => document.querySelectorAll('input, textarea').length).catch(() => 0);
      const hasButton  = await page.evaluate(() => !!document.querySelector('button, [role="button"], input[type="submit"]')).catch(() => false);
      if (inputCount > 0 && hasButton) {
        const typed = `hello-${Date.now()}`;
        await page.evaluate((t) => {
          const input = document.querySelector('input, textarea');
          if (input) input.value = t;
          const btn = document.querySelector('button, [role="button"], input[type="submit"]');
          if (btn) btn.click();
        }, typed).catch(() => {});
        await new Promise((r) => setTimeout(r, 600));
        const appears = await page.evaluate((t) => document.body.innerText.includes(t), typed).catch(() => false);
        if (!appears) {
          const detail = await page.evaluate(() => {
            const list = document.getElementById('taskList') || document.querySelector('ul');
            return {
              inputValue: (document.querySelector('input, textarea')?.value) ?? null,
              listItems: list ? list.children.length : -1,
              listHtml: list ? list.innerHTML.slice(0, 300) : null,
            };
          }).catch(() => ({}));
          issues.push(`Typed "${typed}" into the first input and clicked the first button, but the text never appeared in the page. After the click: input value = ${JSON.stringify(detail.inputValue)}, list items = ${detail.listItems}, list HTML = ${JSON.stringify(detail.listHtml)}. Form submission or rendering is broken.`);
        }
      }
    }
  } catch (err) {
    issues.push(`browser load failed: ${err.message}`);
  } finally {
    try { await browser?.close(); } catch {}
    if (server) server.close();
  }

  for (const e of new Set(consoleErrors)) issues.push(`console error: ${e}`);
  for (const e of new Set(pageErrors)) issues.push(`page error: ${e}`);
  for (const u of new Set(failedRequests)) issues.push(`resource failed to load: ${u}`);

  const detail = { baseUrl: `http://127.0.0.1:${port}`, consoleErrors: [...new Set(consoleErrors)].slice(0, 8), pageErrors: [...new Set(pageErrors)].slice(0, 5), failedRequests: [...new Set(failedRequests)].slice(0, 5) };
  return { issues: issues.slice(0, 12), detail };
}
