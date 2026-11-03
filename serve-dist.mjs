import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT || 5173);

const platformRoots = {
  '/Studio': [
    path.join(distDir, 'Studio'),
    path.join(__dirname, 'Studio'),
  ],
  '/gamebuilder/assets': [
    path.join(distDir, 'gamebuilder', 'assets'),
    path.join(__dirname, 'gamebuilder', 'dist', 'assets'),
  ],
  '/gamebuilder/dist': [
    path.join(distDir, 'gamebuilder', 'dist'),
    path.join(__dirname, 'gamebuilder', 'dist'),
  ],
};

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  createReadStream(filePath).pipe(res);
}

async function trySendExistingFile(res, filePath) {
  if (!existsSync(filePath)) return false;

  const info = await stat(filePath);
  const resolvedPath = info.isDirectory() ? path.join(filePath, 'index.html') : filePath;
  if (!existsSync(resolvedPath)) return false;

  sendFile(res, resolvedPath);
  return true;
}

async function tryServePlatform(req, res, requestPath) {
  const redirectTarget =
    requestPath === '/gamebuilder' || requestPath === '/gamebuilder/'
      ? '/gamebuilder/dist/index.html'
      : requestPath;

  for (const [prefix, directories] of Object.entries(platformRoots)) {
    if (redirectTarget !== prefix && !redirectTarget.startsWith(`${prefix}/`)) continue;

    const relativePath = redirectTarget === prefix ? 'index.html' : redirectTarget.slice(prefix.length + 1);
    const normalized = path.normalize(relativePath || 'index.html').replace(/^(\.\.[\\/])+/, '');

    for (const directory of directories) {
      const filePath = path.join(directory, normalized);
      if (!filePath.startsWith(directory)) {
        res.writeHead(403);
        res.end('Forbidden');
        return true;
      }

      if (await trySendExistingFile(res, filePath)) return true;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Platform asset not found: ${req.url}`);
    return true;
  }

  return false;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('Request too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function chatCompletionsUrl(baseUrl) {
  const clean = String(baseUrl || '').replace(/\/+$/, '');
  if (clean.endsWith('/chat/completions')) return clean;
  return `${clean}/chat/completions`;
}

async function proxyModelChat(payload, res) {
  const model = payload.model || {};
  if (!model.baseUrl || !model.modelId) {
    sendJson(res, 400, { ok: false, error: 'Model ID and Base URL are required' });
    return;
  }

  try {
    const upstream = await fetch(chatCompletionsUrl(model.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(model.apiKey ? { Authorization: `Bearer ${model.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: model.modelId,
        messages: Array.isArray(payload.messages) ? payload.messages : [],
        temperature: 0.72,
        max_tokens: Number(payload.maxTokens || 1200),
        ...(payload.json ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = data.error?.message || data.message || `Provider returned HTTP ${upstream.status}`;
      sendJson(res, upstream.status, { ok: false, error: message });
      return;
    }

    const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
    sendJson(res, 200, { ok: true, content });
  } catch (error) {
    sendJson(res, 502, { ok: false, error: error instanceof Error ? error.message : 'Provider request failed' });
  }
}

const server = createServer(async (req, res) => {
  try {
    const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);

    if (req.method === 'POST' && requestPath === '/api/model-chat') {
      try {
        await proxyModelChat(await readJson(req), res);
      } catch (error) {
        sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : 'Invalid request' });
      }
      return;
    }

    if (await tryServePlatform(req, res, requestPath)) return;

    const normalizedPath = requestPath === '/' ? '/index.html' : requestPath;
    const safePath = path.normalize(normalizedPath).replace(/^(\.\.[\\/])+/, '');
    let filePath = path.join(distDir, safePath);

    if (await trySendExistingFile(res, filePath)) return;

    sendFile(res, path.join(distDir, 'index.html'));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Static server error: ${error instanceof Error ? error.message : String(error)}`);
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Codestrom frontend available at http://localhost:${port}`);
});
