// Design-to-code: turn a screenshot (data URL or remote URL) into a faithful
// HTML/CSS/JS workspace.
//
//   POST /design/from-image  { image, name?, description? }
//       → { ok, workspace, files, previewUrl }
//
// Uses the same model cascade as the rest of the IDE (callLLM). The prompt asks
// the model to reply with STRICT JSON {"files": { "index.html": "…", ... }} so
// the result is deterministic to apply. If no model is reachable the route
// fails cleanly (graceful 502) — scaffolding + workspace creation still work.

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

const DESIGN_SYSTEM = `You are a design-to-code engine. Convert the attached design screenshot into a faithful, production-quality static web page.

Rules:
- Output ONLY a single JSON object with a "files" key. No markdown fences, no commentary, no extra keys.
- JSON shape: {"files": {"index.html": "<full html>", "style.css": "<full css>", "script.js": "<full js>"}}
- index.html MUST <link rel="stylesheet" href="style.css"> and <script src="script.js"> before </body>.
- Match the screenshot's layout, colors, typography, spacing and components as closely as possible.
- Modern, responsive CSS (flexbox/grid), semantic HTML, no external frameworks.
- Use placeholder images from https://picsum.photos/seed/<topic>/400/300 when the design needs imagery.
- Keep everything self-contained in these three files.`;

function stripFences(text) {
  let t = String(text || '').trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return t;
}

export function registerDesignRoutes(router, ctx) {
  const { workspaceDir, sendError, callLLM, touchProject } = ctx;

  router.post('/design/from-image', async (req, res) => {
    const { image, name, description, workspace } = req.body || {};
    if (!image || typeof image !== 'string') return sendError(res, 400, 'image is required (data URL or http(s) URL)');
    if (!/^(data:image\/[a-z+.-]+;base64,|https?:\/\/)/i.test(image)) return sendError(res, 400, 'image must be a base64 data URL or an http(s) URL');
    if (image.length > 10 * 1024 * 1024) return sendError(res, 413, 'Image too large (max 10 MB)');

    try {
      // Resolve target workspace: explicit existing workspace, or create one.
      let ws = workspace;
      let dir = null;
      if (ws) {
        dir = workspaceDir(ws);
        if (!dir) return sendError(res, 400, 'Invalid workspace');
        fs.mkdirSync(dir, { recursive: true });
      } else {
        const base = String(name || description || 'design')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 40) || 'design-app';
        const root = path.dirname(workspaceDir('__probe__') || '.');
        let candidate = base;
        let n = 2;
        while (fs.existsSync(path.join(root, candidate))) { candidate = `${base}-${n}`; n++; }
        ws = candidate;
        dir = workspaceDir(ws);
        if (!dir) return sendError(res, 400, 'Invalid workspace name');
        fs.mkdirSync(dir, { recursive: true });
      }
      touchProject(ws, { owner: 'local', created: Date.now(), template: 'design' });

      const userText = description
        ? `Design brief (in addition to the screenshot): ${String(description).slice(0, 2000)}`
        : 'Recreate this design exactly.';

      const content = [{ type: 'text', text: userText }, { type: 'image_url', image_url: { url: String(image).slice(0, 2_000_000), detail: 'high' } }];

      const reply = await callLLM({
        messages: [{ role: 'system', content: DESIGN_SYSTEM }, { role: 'user', content }],
        json: true,
        maxTokens: 6000,
        temperature: 0.3,
        task: 'design',
      });
      const text = typeof reply === 'string' ? reply : String((reply && reply.content) || reply?.choices?.[0]?.message?.content || reply || '');
      let parsed = null;
      try {
        parsed = JSON.parse(stripFences(text));
      } catch {
        return sendError(res, 502, 'Model did not return valid JSON files. Try again.');
      }
      const files = parsed && parsed.files ? parsed.files : parsed;
      if (!files || typeof files !== 'object' || Object.keys(files).length === 0) {
        return sendError(res, 502, 'Model response contained no files.');
      }
      const written = [];
      for (const [rel, contentText] of Object.entries(files)) {
        if (typeof contentText !== 'string') continue;
        const safe = String(rel).replace(/^\.+\\|\/\.\.?\\|\.\./g, '').replace(/\\/g, '/').replace(/^\/+/, '');
        if (!safe || /\.\./.test(safe)) continue;
        const full = path.join(dir, safe);
        if (!full.startsWith(dir + path.sep) && full !== dir) continue;
        fs.mkdirSync(path.dirname(full), { recursive: true });
        await fsp.writeFile(full, contentText, 'utf8');
        written.push(safe);
      }
      if (written.length === 0) return sendError(res, 502, 'No valid file paths in model response.');
      res.json({ ok: true, workspace: ws, files: written, previewUrl: `/api/ide/preview/${encodeURIComponent(ws)}/index.html`, raw: text.slice(0, 200) });
    } catch (err) {
      const msg = String(err?.message || err || '');
      // Model-call failures (no active model, upstream rejects, connection/timeout)
      // should surface as a clean 502 "needs a reachable model" rather than a 500.
      const modelish = /NO_ACTIVE_MODEL|fetch failed|ECONNREFUSED|timeout|abort|API key|Unauthorized|401|429|500|502|503/i;
      const isJsonError = msg.includes('did not return valid JSON');
      if (!isJsonError && modelish.test(msg)) {
        return sendError(res, 502, `Design-to-code needs a reachable model: ${msg.slice(0, 160)}`);
      }
      sendError(res, isJsonError ? 502 : 500, msg.slice(0, 300));
    }
  });
}
