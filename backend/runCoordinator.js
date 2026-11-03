// Parallel-run coordination: per-runId control + per-workspace concurrency cap
// + file-write advisory locks shared across concurrent runs.
//
// Keyed by runId (not workspace) so N independent runs of the same workspace can
// run side by side; the cap and the file locks keep them from clobbering each other.

export const MAX_CONCURRENT_RUNS = 4;

const runs = new Map();          // runId -> { workspace, cancelled, paused, label, at }
const byWorkspace = new Map();   // workspace -> Set<runId>
const fileLocks = new Map();     // `${workspace}::${rel}` -> { runId, at }
const LOCK_STALE_MS = 5 * 60 * 1000;

function normRel(rel) {
  return String(rel || '').replace(/^[/\\]+/, '').replace(/\\/g, '/');
}

export function registerRun({ runId, workspace, label = '' }) {
  const rc = { workspace, cancelled: false, paused: false, label: String(label || '').slice(0, 80), at: Date.now() };
  runs.set(runId, rc);
  if (!byWorkspace.has(workspace)) byWorkspace.set(workspace, new Set());
  byWorkspace.get(workspace).add(runId);
  return rc;
}

export function unregisterRun(runId) {
  const rc = runs.get(runId);
  if (!rc) return;
  runs.delete(runId);
  const set = byWorkspace.get(rc.workspace);
  if (set) {
    set.delete(runId);
    if (!set.size) byWorkspace.delete(rc.workspace);
  }
  for (const [key, lk] of fileLocks) {
    if (lk.runId === runId) fileLocks.delete(key);
  }
}

export function getRunControl(runId) {
  return runs.get(runId);
}

export function countActive(workspace) {
  return byWorkspace.get(workspace)?.size || 0;
}

export function activeRunIds(workspace) {
  return [...(byWorkspace.get(workspace) || [])];
}

export function cancelRun(runId) {
  const rc = runs.get(runId);
  if (rc) rc.cancelled = true;
  return !!rc;
}

export function pauseRun(runId) {
  const rc = runs.get(runId);
  if (rc) rc.paused = true;
  return !!rc;
}

// Cancel every active run of a workspace (legacy per-workspace control). Returns count.
export function cancelWorkspace(workspace) {
  const set = byWorkspace.get(workspace);
  if (!set) return 0;
  for (const runId of set) {
    const rc = runs.get(runId);
    if (rc) rc.cancelled = true;
  }
  return set.size;
}

const waitMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Advisory lock for one relative path. Waits up to timeoutMs for the other run
// to release; same run may re-acquire (idempotent for its own file).
export async function acquireFileLock(workspace, runId, rel, timeoutMs = 3000) {
  const key = `${workspace}::${normRel(rel)}`;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const cur = fileLocks.get(key);
    if (!cur || cur.runId === runId) {
      fileLocks.set(key, { runId, at: Date.now() });
      return true;
    }
    if (cur.at < Date.now() - LOCK_STALE_MS && !runs.has(cur.runId)) {
      fileLocks.delete(key);
      continue;
    }
    if (Date.now() >= deadline) return false;
    await waitMs(120);
  }
}

export function releaseFileLock(workspace, runId, rel) {
  const key = `${workspace}::${normRel(rel)}`;
  const cur = fileLocks.get(key);
  if (cur && cur.runId === runId) fileLocks.delete(key);
}

// Acquire a batch atomically (all or nothing). Returns { ok, busy, acquired }.
export async function acquireFileLocks(workspace, runId, rels, timeoutMs = 3000) {
  const acquired = [];
  const unique = [...new Set(rels.filter(Boolean).map(normRel))];
  try {
    for (const rel of unique) {
      const ok = await acquireFileLock(workspace, runId, rel, timeoutMs);
      if (!ok) return { ok: false, busy: rel, acquired };
      acquired.push(rel);
    }
    return { ok: true, busy: null, acquired };
  } catch (err) {
    for (const rel of acquired) releaseFileLock(workspace, runId, rel);
    throw err;
  }
}

export function releaseFileLocks(workspace, runId, rels) {
  for (const rel of rels) releaseFileLock(workspace, runId, rel);
}
