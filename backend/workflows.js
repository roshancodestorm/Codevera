// Workflows — user-authorable multi-step recipes in `.codestrom/workflows/*.json`.
// Each workflow is `{ name, description, steps: [{ title, prompt }] }`. Running it
// executes the steps in order; every step is delegated to the LLM, which returns
// file edits that are applied to the workspace, so a whole "release flow" or
// "onboarding routine" can be re-run on demand (like Emergent / Cursor workflows).
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

const WORKFLOWS_SUBDIR = path.join('.codestrom', 'workflows');
const CACHE_TTL = 3000;
const cache = new Map(); // dir -> { at, workflows }

function sanitizeSlug(name) {
  let n = String(name || '').trim().replace(/\\/g, '/').replace(/^\.\.?[/\\]+/, '').replace(/^[/\\]+/, '');
  if (!n) return null;
  n = n.replace(/\.json$/i, '');
  if (/[^\w./\-\s]/.test(n)) return null;
  if (n.split('/').some((seg) => seg === '..' || seg === '.')) return null;
  if (n.length > 120) return null;
  return n;
}

async function scanWorkflows(dir) {
  const list = [];
  if (!dir || !fs.existsSync(dir)) return list;
  const wfDir = path.join(dir, WORKFLOWS_SUBDIR);
  try {
    const entries = await fsp.readdir(wfDir, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isFile() || !/\.json$/i.test(e.name)) continue;
      try {
        const data = JSON.parse(await fsp.readFile(path.join(wfDir, e.name), 'utf8'));
        list.push({
          slug: e.name.replace(/\.json$/i, ''),
          name: data.name || e.name.replace(/\.json$/i, ''),
          description: data.description || '',
          steps: Array.isArray(data.steps) ? data.steps.map((s) => ({ title: String(s.title || s.action || 'Step'), prompt: String(s.prompt || s.task || '') })).filter((s) => s.prompt) : [],
          updatedAt: data.updatedAt || 0,
        });
      } catch {}
    }
  } catch {}
  return list;
}

export async function getWorkflows(dir) {
  const hit = cache.get(dir);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.workflows;
  const workflows = await scanWorkflows(dir);
  cache.set(dir, { at: Date.now(), workflows });
  return workflows;
}

export function invalidateWorkflows(dir) {
  cache.delete(dir);
}

export function registerWorkflowsRoutes(router, deps) {
  const { workspaceDir, sendError, callLLM, safeJoin } = deps;

  router.get('/workflows', async (req, res) => {
    const { workspace } = req.query;
    const dir = workspaceDir(workspace);
    if (!dir) return sendError(res, 400, 'Invalid workspace');
    try {
      res.json({ workflows: await getWorkflows(dir) });
    } catch (err) {
      sendError(res, 500, String(err.message || err));
    }
  });

  router.post('/workflows', async (req, res) => {
    const { workspace, name, description, steps } = req.body || {};
    const dir = workspaceDir(workspace);
    if (!dir) return sendError(res, 400, 'Invalid workspace');
    const slug = sanitizeSlug(name);
    if (!slug) return sendError(res, 400, 'Invalid workflow name');
    const clean = (Array.isArray(steps) ? steps : [])
      .map((s) => ({ title: String(s.title || 'Step').slice(0, 120), prompt: String(s.prompt || s.task || '').trim() }))
      .filter((s) => s.prompt);
    if (!clean.length) return sendError(res, 400, 'workflow needs at least one step with a prompt');
    try {
      const full = path.join(dir, WORKFLOWS_SUBDIR, `${slug}.json`);
      const base = path.join(dir, WORKFLOWS_SUBDIR);
      if (!full.startsWith(base + path.sep)) return sendError(res, 400, 'Workflow path escaped the workflows directory');
      fs.mkdirSync(path.dirname(full), { recursive: true });
      const data = { name: slug.split('/').pop(), description: String(description || '').slice(0, 400), steps: clean, updatedAt: Date.now() };
      await fsp.writeFile(full, JSON.stringify(data, null, 2), 'utf8');
      invalidateWorkflows(dir);
      res.json({ ok: true, workflow: { slug, ...data } });
    } catch (err) {
      sendError(res, 500, `Failed to save workflow: ${String(err.message || err)}`);
    }
  });

  router.delete('/workflows', async (req, res) => {
    const { workspace, name } = req.query;
    const dir = workspaceDir(workspace);
    if (!dir) return sendError(res, 400, 'Invalid workspace');
    const slug = sanitizeSlug(name);
    if (!slug) return sendError(res, 400, 'Invalid workflow name');
    try {
      const full = path.join(dir, WORKFLOWS_SUBDIR, `${slug}.json`);
      const base = path.join(dir, WORKFLOWS_SUBDIR);
      if (!full.startsWith(base + path.sep)) return sendError(res, 400, 'Workflow path escaped the workflows directory');
      if (!fs.existsSync(full)) return sendError(res, 404, 'Workflow not found');
      await fsp.unlink(full);
      invalidateWorkflows(dir);
      res.json({ ok: true });
    } catch (err) {
      sendError(res, 500, `Failed to delete workflow: ${String(err.message || err)}`);
    }
  });

  // Run a saved workflow: every step is delegated to the LLM, which returns file
  // edits applied to the workspace. SSE progress: step / log / done.
  router.post('/workflows/run', async (req, res) => {
    const { workspace, name } = req.body || {};
    const dir = workspaceDir(workspace);
    if (!dir) return sendError(res, 400, 'Invalid workspace');
    const slug = sanitizeSlug(name);
    const all = await getWorkflows(dir);
    const wf = all.find((w) => w.slug === slug);
    if (!wf) return sendError(res, 404, 'Workflow not found');

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    const emit = (obj) => {
      try { res.write(`data: ${JSON.stringify(obj)}\n\n`); } catch {}
    };

    const fileTree = (() => {
      try {
        const walk = (d, rel) => {
          const out = [];
          for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'dist') continue;
            const p = rel ? `${rel}/${e.name}` : e.name;
            if (e.isDirectory()) out.push(...walk(path.join(d, e.name), p));
            else out.push(p);
          }
          return out;
        };
        return walk(dir, '').slice(0, 120).join('\n');
      } catch { return ''; }
    })();

    const readFiles = (patterns) => {
      const rels = Array.isArray(patterns) ? patterns : [];
      const found = [];
      for (const rel of rels) {
        const full = safeJoin(dir, String(rel || ''));
        if (!full) continue;
        try {
          const st = fs.statSync(full);
          if (st.isFile() && st.size < 4000) found.push(`--- ${rel} ---\n${fs.readFileSync(full, 'utf8').slice(0, 4000)}`);
        } catch {}
      }
      return found.join('\n');
    };

    const edits = [];
    for (let i = 0; i < wf.steps.length; i++) {
      const step = wf.steps[i];
      emit({ type: 'step', index: i, total: wf.steps.length, title: step.title, at: Date.now() });
      try {
        const resp = await callLLM({
          messages: [
            {
              role: 'system',
              content:
                'You execute exactly one step of a software workflow in an existing project. Reply with STRICT JSON: {"edits":[{"path":"<relative file path>","mode":"write|append","content":"<new file content or text to append>"}],"summary":"<one sentence>"}. Do not wrap in markdown fences. Only create/append files — never claim to do shell work. Max 5 edits, keep each under 3000 chars.',
            },
            {
              role: 'user',
              content: `Project files:\n${fileTree}\n\nExisting content:\n${readFiles(step.files)}\n\nWorkflow step ${i + 1}/${wf.steps.length}: ${step.title}\n\nTask:\n${step.prompt}`,
            },
          ],
          json: true, maxTokens: 4000, temperature: 0.2, task: 'workflow',
        });
        let parsed = null;
        try { parsed = JSON.parse(resp.content); } catch {}
        if (!parsed || !Array.isArray(parsed.edits)) throw new Error('Workflow step returned no valid edits');
        for (const ed of parsed.edits.slice(0, 5)) {
          const rel = String(ed.path || '').replace(/^\/+/, '');
          if (!rel) continue;
          const full = safeJoin(dir, rel);
          if (!full) throw new Error('Workflow edit escaped the workspace');
          const content = String(ed.content || '');
          const mode = String(ed.mode || 'write') === 'append' ? 'append' : 'write';
          if (mode === 'append') {
            fs.mkdirSync(path.dirname(full), { recursive: true });
            let existing = '';
            try { existing = fs.readFileSync(full, 'utf8'); } catch {}
            fs.writeFileSync(full, existing + '\n' + content, 'utf8');
          } else {
            fs.mkdirSync(path.dirname(full), { recursive: true });
            fs.writeFileSync(full, content, 'utf8');
          }
          edits.push({ path: rel, mode });
        }
        emit({ type: 'log', content: `✔ ${step.title}: ${parsed.summary || 'done'}`, at: Date.now() });
      } catch (err) {
        emit({ type: 'log', content: `✘ ${step.title}: ${String(err.message || err)}`, at: Date.now() });
        emit({ type: 'done', failed: true, summary: String(err.message || err), files: edits, at: Date.now() });
        return;
      }
    }
    emit({ type: 'done', failed: false, summary: `Workflow "${wf.name}" finished`, files: edits, at: Date.now() });
    res.end();
  });
}
