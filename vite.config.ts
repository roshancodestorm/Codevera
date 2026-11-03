import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(rootDir, 'dist')

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
}

const platformRoots: Record<string, string> = {
  '/Studio': path.join(rootDir, 'Studio'),
  '/gamebuilder/assets': path.join(rootDir, 'gamebuilder', 'dist', 'assets'),
  '/gamebuilder/dist': path.join(rootDir, 'gamebuilder', 'dist'),
}

const platformAliases: Record<string, string> = {
  '/gamebuilder': '/gamebuilder/dist',
  '/gamebuilder/': '/gamebuilder/dist/',
}

const copyPlatformsToDist = () => {
  for (const [prefix, sourceDir] of Object.entries(platformRoots)) {
    if (!fs.existsSync(sourceDir)) continue

    const outputDir = path.join(distDir, ...prefix.split('/').filter(Boolean))
    fs.rmSync(outputDir, { recursive: true, force: true })
    fs.mkdirSync(path.dirname(outputDir), { recursive: true })
    fs.cpSync(sourceDir, outputDir, { recursive: true })
  }
}

const readJson = (req: any) =>
  new Promise<any>((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: Buffer | string) => {
      body += chunk
      if (body.length > 1024 * 1024) {
        reject(new Error('Request too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'))
      } catch {
        reject(new Error('Invalid JSON'))
      }
    })
    req.on('error', reject)
  })

const sendJson = (res: any, status: number, payload: unknown) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload))
}

const chatCompletionsUrl = (baseUrl: string) => {
  const clean = String(baseUrl || '').replace(/\/+$/, '')
  if (clean.endsWith('/chat/completions')) return clean
  return `${clean}/chat/completions`
}

const proxyModelChat = async (payload: any, res: any) => {
  const model = payload.model || {}
  if (!model.baseUrl || !model.modelId) {
    return sendJson(res, 400, { ok: false, error: 'Model ID and Base URL are required' })
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
    })

    const data: any = await upstream.json().catch(() => ({}))
    if (!upstream.ok) {
      const message = data.error?.message || data.message || `Provider returned HTTP ${upstream.status}`
      return sendJson(res, upstream.status, { ok: false, error: message })
    }

    const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || ''
    return sendJson(res, 200, { ok: true, content })
  } catch (error: any) {
    return sendJson(res, 502, { ok: false, error: error.message || 'Provider request failed' })
  }
}

const servePlatformFile = (req: any, res: any, next: () => void) => {
  const rawPath = decodeURIComponent((req.url || '').split('?')[0])
  const requestPath = platformAliases[rawPath] || rawPath

  for (const [prefix, directory] of Object.entries(platformRoots)) {
    if (requestPath !== prefix && !requestPath.startsWith(`${prefix}/`)) continue

    const relativePath = requestPath === prefix ? 'index.html' : requestPath.slice(prefix.length + 1)
    const normalized = path.normalize(relativePath === '' ? 'index.html' : relativePath).replace(/^(\.\.[/\\])+/, '')
    const filePath = path.join(directory, normalized)

    if (!filePath.startsWith(directory)) {
      res.writeHead(403)
      res.end('Forbidden')
      return
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404)
        res.end('Not found')
        return
      }

      res.writeHead(200, { 'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream' })
      res.end(data)
    })
    return
  }

  next()
}

const codestromPlatformPlugin = () => ({
  name: 'codestrom-platforms',
  configureServer(server: any) {
    server.middlewares.use(platformMiddleware)
  },
  configurePreviewServer(server: any) {
    server.middlewares.use(platformMiddleware)
  },
  closeBundle() {
    copyPlatformsToDist()
  },
})

const platformMiddleware = async (req: any, res: any, next: () => void) => {
  const requestPath = (req.url || '').split('?')[0]
  if (req.method === 'POST' && requestPath === '/api/log-error') {
    let body = '';
    req.on('data', (chunk: Buffer | string) => { body += chunk; });
    req.on('end', () => {
      console.log('\n\n=== BROWSER RUNTIME ERROR ===\n' + body + '\n=============================\n\n');
      res.writeHead(200);
      res.end('OK');
    });
    return;
  }
  if (req.method === 'POST' && requestPath === '/api/model-chat') {
    try {
      return await proxyModelChat(await readJson(req), res)
    } catch (error: any) {
      return sendJson(res, 400, { ok: false, error: error.message || 'Invalid request' })
    }
  }

  return servePlatformFile(req, res, next)
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [codestromPlatformPlugin(), react(), tailwindcss()],
  // monaco-vim's UMD build imports this extensionless ESM path. Vite 8's
  // resolver does not infer the .js extension for it during production builds.
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      'monaco-editor/esm/vs/editor/editor.api': path.join(rootDir, 'node_modules', 'monaco-editor', 'esm', 'vs', 'editor', 'editor.api.js'),
    },
  },
  css: {
    devSourcemap: false,
  },
  optimizeDeps: {
    exclude: [
      'monaco-editor',
      'monaco-vim',
      'y-monaco',
      'web-tree-sitter',
      'tree-sitter-wasms',
    ],
  },
  server: {
    host: true,
    port: 5173,
    open: true,
    strictPort: true,
    watch: {
      ignored: [
        '**/Hellomj/**',
        '**/.venv/**',
        '**/node_modules/**',
        '**/backend/**',
        '**/tmp/**',
        '**/output/**',
        '**/scratch/**',
        '**/dist/**',
        '**/ComfyUI/**',
        '**/codevora-os/**',
        '**/workspaces/**',
        '**/data_1M.csv',
        '**/*.log',
        '**/*.txt'
      ]
    }
  },
})
