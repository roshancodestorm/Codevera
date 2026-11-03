// Hosted / managed Postgres for workspaces.
//
//   POST /db/hosted/connect     — connect the DB panel to a hosted Postgres via
//                                 a DATABASE_URL (falls back to the workspace
//                                 `.env` DATABASE_URL). Lists tables immediately.
//   GET  /db/hosted             — current hosted connection status + tables.
//   POST /db/hosted/query       — run SQL against the hosted Postgres.
//   POST /db/hosted/provision   — provision a new managed Postgres via a provider
//                                 CLI (render/railway/fly), then auto-connect.
//   DELETE /db/hosted           — disconnect (and teardown if we provisioned it).
//
// Mirrors the hosted deploy pattern (HOSTED_PROVIDERS in ide.js) but for managed
// databases. Connections are per-workspace and pooled (pg.Pool).

import { spawn, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import pg from 'pg';

const HOSTED_DB_PROVIDERS = {
  render: {
    label: 'Render',
    bin: 'render',
    requires: 'Install the CLI: `npm i -g @renderinc/cli`, then `render login`.',
    provision: (name) => [['render', 'postgres', 'create', '--name', name, '--confirm']],
    teardown: (name) => ['render', 'postgres', 'delete', '--name', name, '--confirm'],
    urlRe: /postgres:\/\/[^\s"']+/,
  },
  railway: {
    label: 'Railway',
    bin: 'railway',
    requires: 'Install the CLI: `npm i -g @railway/cli`, `railway login`, then `railway link` in the workspace (or set RAILWAY_TOKEN).',
    provision: () => [['railway', 'add', '--plugin', 'postgresql']],
    teardown: () => [],
    urlRe: /postgres:\/\/[^\s"']+/,
  },
  fly: {
    label: 'Fly.io',
    bin: 'flyctl',
    requires: 'Install the CLI: `npm i -g @fly.io/flyctl`, then `flyctl auth login`.',
    provision: (name) => [['flyctl', 'postgres', 'create', '--name', name, '--yes']],
    teardown: (name) => ['flyctl', 'postgres', 'destroy', '--yes', '--name', name],
    urlRe: /postgres:\/\/[^\s"']+/,
  },
};

function cliBin(cmd) {
  try {
    const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { windowsHide: true, timeout: 10000 });
    if (r.status === 0) {
      const first = String(r.stdout || '').split(/\r?\n/)[0].trim();
      if (first) return first;
    }
  } catch {}
  return null;
}

function spawnCli(cwd, bin, argv, stdio = ['ignore', 'pipe', 'pipe']) {
  if (process.platform === 'win32' && /\.(cmd|bat)$/i.test(bin)) {
    const cmdline = `${bin} ${argv.map((a) => (/\s/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a)).join(' ')}`;
    return spawn('cmd.exe', ['/d', '/s', '/c', cmdline], { cwd, windowsHide: true, stdio });
  }
  return spawn(bin, argv, { cwd, windowsHide: true, stdio });
}

function runCliStream(cwd, bin, argv, onChunk) {
  return new Promise((resolve) => {
    let output = '';
    const child = spawnCli(cwd, bin, argv);
    child.stdout?.on('data', (c) => { const s = c.toString(); output += s; onChunk?.(s); });
    child.stderr?.on('data', (c) => { const s = c.toString(); output += s; onChunk?.(s); });
    child.on('error', (e) => resolve({ exitCode: -1, output: String(e.message || e) }));
    child.on('close', (code) => resolve({ exitCode: code === null ? -1 : code, output }));
  });
}

function maskUrl(url) {
  try {
    const s = String(url);
    const schemeEnd = s.indexOf('//');
    const at = s.lastIndexOf('@');
    const slash = s.indexOf('/', schemeEnd + 2);
    if (at > 0 && (slash === -1 || at < slash)) {
      return s.slice(0, schemeEnd + 2) + '••••' + s.slice(at);
    }
    return s;
  } catch {
    return '••••';
  }
}

export function registerHostedDbRoutes(router, ctx) {
  const { workspaceDir, sendError } = ctx;
  // workspace -> { url, provider, app, pool, tables, status, output, provisioned, startedAt }
  const hosted = new Map();

  const tablesFor = async (pool) => {
    const t = await pool.query(
      `SELECT table_name, (SELECT count(*) FROM information_schema.tables t2) AS _x FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    );
    const out = [];
    for (const r of t.rows) {
      try {
        const count = await pool.query(`SELECT COUNT(*) AS c FROM "${r.table_name}"`);
        const cols = await pool.query(
          `SELECT column_name AS name, data_type AS type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
          [r.table_name]
        );
        out.push({ name: r.table_name, rowCount: Number(count.rows[0].c), columns: cols.rows.map((c) => ({ name: c.name, type: c.type, pk: false, notnull: c.is_nullable === 'NO', dflt: c.column_default })) });
      } catch {
        out.push({ name: r.table_name, rowCount: 0, columns: [] });
      }
    }
    return out;
  };

  const connectTo = async (workspace, url) => {
    const existing = hosted.get(workspace);
    if (existing?.pool) {
      try { await existing.pool.end(); } catch {}
    }
    const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 10000, max: 4 });
    const rec = { url, provider: existing?.provider || null, app: existing?.app || null, pool, tables: [], status: 'connected', output: `Connected to hosted Postgres (${maskUrl(url)})`, provisioned: existing?.provisioned || false, startedAt: existing?.startedAt || Date.now() };
    hosted.set(workspace, rec);
    try {
      const tables = await tablesFor(pool);
      rec.tables = tables;
      rec.status = 'connected';
    } catch (err) {
      rec.status = 'error';
      rec.output = `Connected, but listing tables failed: ${String(err.message || err)}`;
    }
    return rec;
  };

  const teardown = async (workspace) => {
    const rec = hosted.get(workspace);
    if (rec?.pool) try { await rec.pool.end(); } catch {}
    hosted.delete(workspace);
    if (rec?.provisioned && rec?.provider && rec?.app) {
      const conf = HOSTED_DB_PROVIDERS[rec.provider];
      const bin = cliBin(conf?.bin);
      if (bin && conf) {
        for (const argv of conf.teardown(rec.app)) {
          await runCliStream(process.cwd(), bin, argv);
        }
      }
    }
  };

  router.get('/db/hosted', async (req, res) => {
    const { workspace } = req.query;
    const dir = workspaceDir(workspace);
    if (!dir) return sendError(res, 400, 'Invalid workspace');
    const rec = hosted.get(workspace);
    if (!rec) return res.json({ connected: false });
    res.json({ connected: true, status: rec.status, urlMasked: maskUrl(rec.url), provider: rec.provider, provisioned: rec.provisioned, tables: rec.tables, output: rec.output });
  });

  router.post('/db/hosted/connect', async (req, res) => {
    const { workspace, url } = req.body || {};
    const dir = workspaceDir(workspace);
    if (!dir) return sendError(res, 400, 'Invalid workspace');
    let conn = String(url || '').trim();
    if (!conn) {
      // Fall back to the workspace .env DATABASE_URL (e.g. injected by a real PaaS).
      try {
        const envPath = path.join(dir, '.env');
        if (fs.existsSync(envPath)) {
          const content = await fsp.readFile(envPath, 'utf8');
          const m = content.match(/^DATABASE_URL=(.+)$/m);
          if (m) conn = m[1].trim();
        }
      } catch {}
    }
    if (!conn || !/^postgres(ql)?:\/\//i.test(conn)) return sendError(res, 400, 'A valid postgres:// DATABASE_URL is required (or set DATABASE_URL in the workspace .env)');
    try {
      const rec = await connectTo(workspace, conn);
      res.json({ ok: true, connected: true, status: rec.status, urlMasked: maskUrl(conn), tables: rec.tables, output: rec.output });
    } catch (err) {
      sendError(res, 502, `Could not connect to hosted Postgres: ${String(err.message || err)}`);
    }
  });

  router.post('/db/hosted/query', async (req, res) => {
    const { workspace, sql } = req.body || {};
    const rec = hosted.get(workspace);
    if (!rec?.pool) return sendError(res, 409, 'No hosted Postgres connected');
    const stmt = String(sql || '').trim();
    if (!stmt) return sendError(res, 400, 'sql required');
    try {
      const upper = stmt.toUpperCase().replace(/\s+/g, ' ').trimStart();
      const isSelect = upper.startsWith('SELECT') || upper.startsWith('WITH') || upper.startsWith('SHOW');
      const r = await rec.pool.query(stmt);
      if (isSelect) {
        res.json({ ok: true, rows: r.rows, columns: r.fields ? r.fields.map((f) => f.name) : (r.rows.length ? Object.keys(r.rows[0]) : []), rowCount: r.rowCount });
      } else {
        res.json({ ok: true, changes: r.rowCount ?? r.rows?.length ?? 0, rows: [], columns: [] });
      }
    } catch (err) {
      res.json({ ok: false, error: String(err.message) });
    }
  });

  router.post('/db/hosted/provision', async (req, res) => {
    const { workspace, provider } = req.body || {};
    const dir = workspaceDir(workspace);
    if (!dir) return sendError(res, 400, 'Invalid workspace');
    const conf = HOSTED_DB_PROVIDERS[provider];
    if (!conf) return sendError(res, 400, `Unknown provider "${provider}" — use ${Object.keys(HOSTED_DB_PROVIDERS).join(', ')}`);
    const bin = cliBin(conf.bin);
    if (!bin) return sendError(res, 503, `CLI "${conf.bin}" not found on PATH. ${conf.requires}`);
    const app = `codestrom-db-${workspace.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24)}`;
    const existing = hosted.get(workspace);
    if (existing?.pool) try { await existing.pool.end(); } catch {}
    hosted.set(workspace, { provider, app, pool: null, tables: [], status: 'provisioning', output: `Provisioning ${conf.label} Postgres…`, provisioned: true, startedAt: Date.now(), url: null });
    res.json({ ok: true, status: 'provisioning' });

    (async () => {
      try {
        let out = '';
        const steps = conf.provision(app);
        for (const argv of steps) {
          const r = await runCliStream(dir, bin, argv, (chunk) => { out += chunk; if (out.length > 12000) out = out.slice(-12000); });
          if (r.exitCode !== 0) {
            const rec = hosted.get(workspace);
            if (rec) { rec.status = 'error'; rec.output = `${conf.bin} ${argv.join(' ')} exited ${r.exitCode}\n${(out || r.output).slice(-2000)}`; }
            return;
          }
        }
        const m = out.match(conf.urlRe);
        if (!m) {
          const rec = hosted.get(workspace);
          if (rec) { rec.status = 'error'; rec.output = `Provisioned, but no postgres:// URL could be parsed from output:\n${out.slice(-1500)}`; }
          return;
        }
        const url = m[0];
        // Auto-connect: point the DB panel at the fresh managed database.
        await connectTo(workspace, url);
        const rec = hosted.get(workspace);
        if (rec) { rec.provider = provider; rec.app = app; rec.provisioned = true; }
      } catch (err) {
        const rec = hosted.get(workspace);
        if (rec) { rec.status = 'error'; rec.output = String(err.message || err); }
      }
    })();
  });

  router.delete('/db/hosted', async (req, res) => {
    const { workspace } = req.body || {};
    if (!workspaceDir(workspace)) return sendError(res, 400, 'Invalid workspace');
    try {
      await teardown(workspace);
      res.json({ ok: true });
    } catch (err) {
      sendError(res, 500, String(err.message || err));
    }
  });

  return { hosted, teardownAll: async () => { for (const w of [...hosted.keys()]) await teardown(w); } };
}
