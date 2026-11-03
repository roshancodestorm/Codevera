// REA (Reverse Engineer Anything) integration.
//
// Wraps the `rea-agents` CLI (https://www.npmjs.com/package/rea-agents) so the
// IDE can run local static analysis and stream JSON Evidence back to the UI.
//
// Safety model:
//   * The CLI is invoked as `node <rea.mjs> <subcommand> ...args` with an
//     argument ARRAY and `shell: false` — no shell, so nothing in a path can be
//     interpreted as a command.
//   * The subcommand and every flag come from a fixed allowlist below; user
//     input never becomes a raw argument except as the validated target path /
//     browser endpoint values, which are passed as discrete array entries.
//   * Each job has a hard timeout and an output cap; the child is always killed.
//   * Optionally set REA_ALLOWED_ROOTS (path.delimiter separated) to restrict
//     which filesystem paths may be analyzed. Unset => any existing path.
//
// Routes (mounted on the shared IDE router, so the base is /api/ide):
//   GET  /rea/status            readiness + resolved CLI path
//   GET  /rea/kinds             allowlisted analysis kinds for the UI
//   POST /rea/analyze           start a job -> { job }
//   GET  /rea/jobs              list recent jobs (no bulky output)
//   GET  /rea/jobs/:id          one job, including the parsed JSON result
//   GET  /rea/jobs/:id/result   raw JSON download
//   POST /rea/jobs/:id/cancel   stop a running job

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const BACKEND_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(BACKEND_DIR, '..');
const WORKSPACES_ROOT = path.resolve(process.env.CODESTROM_WORKSPACES || path.join(PROJECT_ROOT, 'workspaces'));
const RESULTS_DIR = path.join(PROJECT_ROOT, '.ide', 'rea');
const LOCAL_WORKSPACES_FILE = path.join(BACKEND_DIR, 'local-workspaces.json');

const MAX_OUTPUT = 8 * 1024 * 1024; // 8 MiB captured per stream
const MAX_JOBS = 40;

// ── Allowlisted analysis kinds ──────────────────────────────────────────────
// `cli` must be a real `rea <subcommand>`. `target`:
//   'workspace' — needs a workspace name (resolved) or an absolute path
//   'optional'  — path optional (doctor)
//   'none'      — no target (capabilities)
//   'browser'   — needs a CDP `endpoint` + `targetId`
export const REA_KINDS = {
  'analyze-javascript-application': {
    label: 'Analyze JavaScript application',
    cli: 'analyze-javascript-application',
    description: 'Statically reconstruct a local JavaScript / Electron app (ASAR or extracted directory).',
    target: 'workspace',
    timeoutMs: 300000,
    options: {
      maxSemanticNodes: { flag: '--max-semantic-nodes', type: 'int' },
      maxSemanticNodesPerFile: { flag: '--max-semantic-nodes-per-file', type: 'int' },
      maxHeapMb: { flag: '--max-heap-mb', type: 'int' },
      analysisTimeoutMs: { flag: '--analysis-timeout-ms', type: 'int' },
      sourcePath: { flag: '--source-path', type: 'stringList' },
    },
  },
  analyze: {
    label: 'Analyze app overview',
    cli: 'analyze',
    description: 'High-level overview of an app, program or analysis database.',
    target: 'workspace',
    timeoutMs: 180000,
    options: {
      provider: { flag: '--provider', type: 'string' },
      sourcePath: { flag: '--source-path', type: 'stringList' },
    },
  },
  inspect: {
    label: 'Inspect with evidence',
    cli: 'inspect',
    description: 'Inspect an app overview and return supporting Evidence.',
    target: 'workspace',
    timeoutMs: 180000,
    options: {
      provider: { flag: '--provider', type: 'string' },
    },
  },
  'analyze-web-bundle': {
    label: 'Analyze web bundle',
    cli: 'analyze-web-bundle',
    description: 'Capture and statically analyze a page bundle over Chrome DevTools Protocol.',
    target: 'browser',
    timeoutMs: 120000,
    options: {
      observationMs: { flag: '--observation-ms', type: 'int' },
      fetchSourceMaps: { flag: '--fetch-source-maps', type: 'boolean' },
      allowedOrigins: { flag: '--allowed-origins', type: 'stringList' },
    },
  },
  doctor: {
    label: 'Readiness check',
    cli: 'doctor',
    description: 'Check whether REA and its providers are ready to run.',
    target: 'optional',
    timeoutMs: 60000,
    options: {
      provider: { flag: '--provider', type: 'stringList' },
    },
  },
  capabilities: {
    label: 'Provider capabilities',
    cli: 'capabilities',
    description: 'List provider capabilities and the side effects they declare.',
    target: 'none',
    timeoutMs: 60000,
    options: {},
  },
};

// ── CLI discovery ───────────────────────────────────────────────────────────
export function resolveReaBin() {
  const candidate = path.join(BACKEND_DIR, 'node_modules', 'rea-agents', 'scripts', 'rea.mjs');
  return fs.existsSync(candidate) ? candidate : null;
}

export function reaAvailable() {
  return resolveReaBin() !== null;
}

// ── Argument construction (pure, unit-tested) ───────────────────────────────
export function buildReaArgs(kind, { target, endpoint, targetId, options } = {}) {
  const spec = REA_KINDS[kind];
  if (!spec) throw new Error(`Unknown analysis kind: ${kind}`);

  const args = [spec.cli];
  if (spec.target === 'browser') {
    if (!endpoint || !targetId) throw new Error('This analysis needs both a CDP endpoint and a target id');
    args.push(String(endpoint), String(targetId));
  } else if (spec.target === 'workspace') {
    if (!target) throw new Error('This analysis needs a target path');
    args.push(String(target));
  } else if (spec.target === 'optional') {
    if (target) args.push(String(target));
  }

  const opts = options || {};
  for (const [name, def] of Object.entries(spec.options || {})) {
    const value = opts[name];
    if (value === undefined || value === null || value === '') continue;
    if (def.type === 'int') {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) throw new Error(`Option ${name} must be a non-negative integer`);
      args.push(def.flag, String(n));
    } else if (def.type === 'boolean') {
      if (value === true || value === 'true') args.push(def.flag);
    } else if (def.type === 'stringList') {
      const list = Array.isArray(value) ? value : [value];
      for (const item of list) args.push(def.flag, String(item));
    } else {
      args.push(def.flag, String(value));
    }
  }

  // Machine-readable output is non-negotiable for the UI.
  args.push('--format', 'json');
  return args;
}

// ── Path validation ──────────────────────────────────────────────────────────
function allowedRoots() {
  const roots = [PROJECT_ROOT, WORKSPACES_ROOT];
  try {
    const saved = JSON.parse(fs.readFileSync(LOCAL_WORKSPACES_FILE, 'utf8'));
    for (const root of Object.values(saved || {})) {
      if (typeof root === 'string' && path.isAbsolute(root)) roots.push(path.resolve(root));
    }
  } catch {}
  const envRoots = String(process.env.REA_ALLOWED_ROOTS || '')
    .split(path.delimiter)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => path.resolve(s));
  return { roots, envRoots };
}

export function isAllowedPath(p) {
  if (typeof p !== 'string' || !p.trim()) return { ok: false, error: 'Target path is required' };
  if (p.includes('\0')) return { ok: false, error: 'Invalid target path' };
  const abs = path.resolve(p);
  if (!fs.existsSync(abs)) return { ok: false, error: `Target does not exist: ${abs}` };
  const { envRoots } = allowedRoots();
  if (envRoots.length) {
    const within = envRoots.some((root) => abs === root || abs.startsWith(root + path.sep));
    if (!within) return { ok: false, error: 'Target is outside REA_ALLOWED_ROOTS' };
  }
  return { ok: true, path: abs };
}

// ── Job store ────────────────────────────────────────────────────────────────
let resolveWorkspaceDir = () => null;

const jobs = new Map(); // id -> job
const jobProcs = new Map(); // id -> ChildProcess

function parseJsonLoose(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {}
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(trimmed.slice(first, last + 1));
    } catch {}
  }
  return null;
}

function publicJob(job, { includeResult = false } = {}) {
  const clone = {
    id: job.id,
    kind: job.kind,
    status: job.status,
    target: job.target || null,
    endpoint: job.endpoint || null,
    targetId: job.targetId || null,
    args: job.args,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt || null,
    durationMs: job.finishedAt ? job.finishedAt - job.startedAt : (job.status === 'running' ? Date.now() - job.startedAt : null),
    exitCode: job.exitCode ?? null,
    signal: job.signal || null,
    error: job.error || null,
    stderr: job.stderr ? job.stderr.slice(-4000) : '',
    stdoutTail: job.parsed ? '' : (job.stdout ? job.stdout.slice(-4000) : ''),
    parsed: job.parsed || null,
    bytes: job.bytes,
  };
  if (includeResult) clone.result = job.parsed || null;
  return clone;
}

function persistResult(job) {
  try {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    fs.writeFileSync(path.join(RESULTS_DIR, `${job.id}.json`), JSON.stringify(publicJob(job, { includeResult: true }), null, 2));
  } catch {}
}

function pruneJobs() {
  if (jobs.size <= MAX_JOBS) return;
  const finished = [...jobs.values()].filter((j) => j.status !== 'running').sort((a, b) => (a.finishedAt || a.startedAt) - (b.finishedAt || b.startedAt));
  while (jobs.size > MAX_JOBS && finished.length) {
    const victim = finished.shift();
    jobs.delete(victim.id);
    jobProcs.delete(victim.id);
  }
}

export function startReaJob(input = {}) {
  const kind = String(input.kind || '');
  const spec = REA_KINDS[kind];
  if (!spec) {
    const err = new Error(`Unknown analysis kind: ${kind}`);
    err.statusCode = 400;
    throw err;
  }
  const bin = resolveReaBin();
  if (!bin) {
    const err = new Error('REA is not installed (run: npm install rea-agents in backend/)');
    err.statusCode = 503;
    throw err;
  }

  let target = null;
  if (spec.target === 'workspace' || spec.target === 'optional') {
    if (input.workspace && !input.path) {
      const dir = resolveWorkspaceDir(String(input.workspace));
      if (!dir) {
        const err = new Error(`Workspace not found: ${input.workspace}`);
        err.statusCode = 400;
        throw err;
      }
      target = dir;
    } else if (input.path) {
      const check = isAllowedPath(String(input.path));
      if (!check.ok) {
        const err = new Error(check.error);
        err.statusCode = 400;
        throw err;
      }
      target = check.path;
    } else if (spec.target === 'workspace') {
      const err = new Error('A workspace or target path is required');
      err.statusCode = 400;
      throw err;
    }
  }

  const args = buildReaArgs(kind, {
    target,
    endpoint: input.endpoint,
    targetId: input.targetId,
    options: input.options,
  });

  const id = crypto.randomUUID();
  const job = {
    id,
    kind,
    status: 'running',
    target,
    endpoint: input.endpoint || null,
    targetId: input.targetId || null,
    args,
    startedAt: Date.now(),
    finishedAt: null,
    exitCode: null,
    signal: null,
    error: null,
    stdout: '',
    stderr: '',
    parsed: null,
    bytes: 0,
    cancelled: false,
  };
  jobs.set(id, job);
  pruneJobs();

  const child = spawn(process.execPath, [bin, ...args], {
    cwd: target && fs.existsSync(target) && fs.statSync(target).isDirectory() ? target : BACKEND_DIR,
    shell: false,
    windowsHide: true,
    env: { ...process.env, NO_COLOR: '1' },
  });
  jobProcs.set(id, child);

  const timer = setTimeout(() => {
    job.error = `Timed out after ${spec.timeoutMs}ms`;
    job.status = 'timeout';
    try { child.kill('SIGKILL'); } catch {}
  }, spec.timeoutMs);

  const append = (key, chunk) => {
    if (job.bytes >= MAX_OUTPUT) return;
    const text = chunk.toString('utf8');
    job[key] += text;
    job.bytes += text.length;
    if (job[key].length > MAX_OUTPUT) job[key] = job[key].slice(0, MAX_OUTPUT) + '\n…[output truncated]';
  };

  child.stdout.on('data', (c) => append('stdout', c));
  child.stderr.on('data', (c) => append('stderr', c));

  const finish = () => {
    clearTimeout(timer);
    jobProcs.delete(id);
    if (job.finishedAt) return; // already settled
    job.finishedAt = Date.now();
    if (!job.cancelled && !job.error) {
      job.exitCode = child.exitCode;
      job.signal = child.signalCode || null;
      job.parsed = parseJsonLoose(job.stdout);
      if (job.parsed) {
        // REA writes machine JSON to stdout even when the exit code is non-zero
        // (e.g. `doctor` exits 1 to signal "not healthy"). Keep the payload and
        // let the caller decide; only a missing payload is a hard failure.
        job.status = 'done';
      } else if (child.exitCode === 0) {
        job.status = 'done';
        job.error = 'REA produced no parseable JSON output';
      } else {
        job.status = 'error';
        job.error = job.stderr.trim().split('\n').slice(-6).join('\n') || `REA exited with code ${child.exitCode}`;
      }
    }
    persistResult(job);
  };

  child.on('error', (err) => {
    job.error = `Failed to start REA: ${err.message}`;
    job.status = 'error';
    finish();
  });
  child.on('close', finish);

  return publicJob(job, { includeResult: true });
}

export function getReaJob(id, { includeResult = true } = {}) {
  const job = jobs.get(String(id));
  return job ? publicJob(job, { includeResult }) : null;
}

export function cancelReaJob(id) {
  const job = jobs.get(String(id));
  if (!job) return false;
  if (job.status !== 'running') return true;
  job.cancelled = true;
  job.status = 'cancelled';
  job.error = 'Cancelled by user';
  job.finishedAt = Date.now();
  const proc = jobProcs.get(job.id);
  if (proc) {
    try { proc.kill('SIGKILL'); } catch {}
    jobProcs.delete(job.id);
  }
  persistResult(job);
  return true;
}

// ── HTTP routes ──────────────────────────────────────────────────────────────
export function registerReaRoutes(router, deps = {}) {
  if (typeof deps.workspaceDir === 'function') resolveWorkspaceDir = deps.workspaceDir;

  router.get('/rea/status', (req, res) => {
    const bin = resolveReaBin();
    let version = null;
    if (bin) {
      try {
        version = JSON.parse(fs.readFileSync(path.join(BACKEND_DIR, 'node_modules', 'rea-agents', 'package.json'), 'utf8')).version;
      } catch {}
    }
    res.json({ available: !!bin, binPath: bin, version, resultsDir: RESULTS_DIR });
  });

  router.get('/rea/kinds', (req, res) => {
    res.json({
      kinds: Object.entries(REA_KINDS).map(([id, spec]) => ({
        id,
        label: spec.label,
        description: spec.description,
        target: spec.target,
        timeoutMs: spec.timeoutMs,
        options: Object.entries(spec.options || {}).map(([name, def]) => ({ name, flag: def.flag, type: def.type })),
      })),
    });
  });

  router.post('/rea/analyze', (req, res) => {
    try {
      const job = startReaJob(req.body || {});
      res.json({ job });
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  router.get('/rea/jobs', (req, res) => {
    const list = [...jobs.values()].sort((a, b) => b.startedAt - a.startedAt).map((j) => publicJob(j));
    res.json({ jobs: list });
  });

  router.get('/rea/jobs/:id', (req, res) => {
    const job = jobs.get(String(req.params.id));
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ job: publicJob(job, { includeResult: true }) });
  });

  router.get('/rea/jobs/:id/result', (req, res) => {
    const job = jobs.get(String(req.params.id));
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const body = JSON.stringify(job.parsed ?? { status: job.status, error: job.error, exitCode: job.exitCode, stderr: job.stderr, stdout: job.stdout }, null, 2);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="rea-${job.kind}-${job.id}.json"`);
    res.send(body);
  });

  router.post('/rea/jobs/:id/cancel', (req, res) => {
    const ok = cancelReaJob(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Job not found' });
    res.json({ ok: true });
  });
}
