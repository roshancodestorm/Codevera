import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { browserSanityIssues } from './browsercheck.js';

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const p = srv.address().port;
      srv.close(() => resolve(p));
    });
    srv.on('error', reject);
  });
}

async function waitForHttp(url, timeoutMs, predicate) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
      if (!predicate || predicate(res)) return res;
    } catch {}
    await new Promise((r) => setTimeout(r, 700));
  }
  return null;
}

// End-to-end runtime verification for full-stack (frontend + API) projects:
// boots the Express API, probes /api/health and a write read-back, then loads the
// built frontend through `vite preview` (which proxies /api to the API) in a
// headless browser. Never leaves stray processes behind.
export async function fullstackRuntimeIssues(dir, { timeoutMs = 40000, browser = true } = {}) {
  const issues = [];
  const logs = [];
  const capture = (child) => {
    child.stdout?.on('data', (d) => logs.push(d.toString()));
    child.stderr?.on('data', (d) => logs.push(d.toString()));
  };
  const serverEntry = [path.join(dir, 'server', 'index.js'), path.join(dir, 'server', 'server.js'), path.join(dir, 'api', 'index.js')].find((p) => fs.existsSync(p));
  if (!serverEntry) return ['full-stack project has no server entry (expected server/index.js)'];

  const apiPort = await freePort();
  const webPort = await freePort();
  const env = { ...process.env, API_PORT: String(apiPort), PORT: String(webPort) };
  let api = null;
  let web = null;
  try {
    api = spawn(process.execPath, [serverEntry], { cwd: dir, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    capture(api);
    const health = await waitForHttp(`http://127.0.0.1:${apiPort}/api/health`, Math.min(timeoutMs, 25000), (r) => r.ok);
    if (!health) {
      return [`full-stack backend did not respond on /api/health within ${timeoutMs}ms. Output:\n${logs.join('').slice(-700)}`];
    }

    // Write/read round-trip when the API exposes a messages collection.
    try {
      const post = await fetch(`http://127.0.0.1:${apiPort}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'IDE smoke', email: 'smoke@test.dev', message: 'runtime verification' }),
        signal: AbortSignal.timeout(5000),
      });
      if (post.status >= 500) issues.push(`POST /api/messages failed with HTTP ${post.status}`);
    } catch (err) {
      issues.push(`POST /api/messages request failed: ${err.message}`);
    }

    if (browser) {
      const viteBin = path.join(dir, 'node_modules', 'vite', 'bin', 'vite.js');
      const distIndex = path.join(dir, 'dist', 'index.html');
      if (fs.existsSync(viteBin) && fs.existsSync(distIndex)) {
        web = spawn(process.execPath, [viteBin, 'preview', '--port', String(webPort), '--host'], { cwd: dir, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
        capture(web);
        const up = await waitForHttp(`http://127.0.0.1:${webPort}/`, Math.min(timeoutMs, 25000), (r) => r.ok);
        if (!up) {
          issues.push(`full-stack preview server did not start. Output:\n${logs.join('').slice(-500)}`);
        } else {
          const r = await browserSanityIssues(dir, { url: `http://127.0.0.1:${webPort}`, timeoutMs: 20000 });
          issues.push(...r.issues);
        }
      }
    }
  } catch (err) {
    issues.push(`full-stack runtime check error: ${err.message}`);
  } finally {
    try { web?.kill(); } catch {}
    try { api?.kill(); } catch {}
  }
  return issues.slice(0, 12);
}
