import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, 'mcp-servers.json');

const MCP_PROTOCOL_VERSION = '2025-03-26';
const DEFAULT_TIMEOUT = 20000;

let cached = null;

export function getMcpServers() {
  if (cached) return cached;
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      if (Array.isArray(raw)) cached = raw;
    }
  } catch (err) {
    console.error('[mcp] failed to load config:', err.message);
  }
  if (!cached) cached = [];
  return cached;
}

function persist() {
  getMcpServers();
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cached, null, 2));
  } catch (err) {
    console.error('[mcp] failed to persist config:', err.message);
  }
}

export function addMcpServer({ name, url, headers }) {
  const servers = getMcpServers();
  const cleanName = String(name || '').trim().replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 40);
  if (!cleanName) throw new Error('Server name is required (letters, digits, -, _)');
  if (!url) throw new Error('URL is required');
  const cleanUrl = String(url).trim();
  if (!/^https?:\/\//i.test(cleanUrl)) throw new Error('URL must start with http:// or https://');
  if (servers.some((s) => s.url === cleanUrl)) throw new Error('A server with this URL is already registered');

  const server = { id: randomUUID(), name: cleanName, url: cleanUrl, headers: headers || {} };
  servers.push(server);
  persist();
  return server;
}

export function removeMcpServer(id) {
  const servers = getMcpServers();
  const idx = servers.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  servers.splice(idx, 1);
  persist();
  return true;
}

async function rpc(server, method, params, sessionId) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
    ...(server.headers || {}),
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT);
  let resp;
  try {
    resp = await fetch(server.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: ctrl.signal,
    });
  } catch (err) {
    const msg = err?.name === 'AbortError'
      ? `MCP request timed out after ${DEFAULT_TIMEOUT / 1000}s`
      : `Connection to MCP server failed: ${err?.message || err}`;
    throw new Error(msg);
  } finally {
    clearTimeout(timer);
  }

  let payload;
  const ct = String(resp.headers.get('content-type') || '');
  if (ct.includes('text/event-stream')) {
    const text = await resp.text();
    for (const line of text.split(/\r?\n/)) {
      if (!line.startsWith('data: ')) continue;
      try {
        payload = JSON.parse(line.slice(6));
        break;
      } catch {}
    }
    if (!payload) throw new Error(`MCP server returned empty SSE response (HTTP ${resp.status})`);
  } else {
    try {
      payload = await resp.json();
    } catch {
      throw new Error(`MCP server returned non-JSON response (HTTP ${resp.status})`);
    }
  }

  const nextSession = resp.headers.get('mcp-session-id');
  if (payload.error) {
    throw new Error(`MCP error: ${payload.error.message || JSON.stringify(payload.error)}`);
  }
  return { result: payload.result, sessionId: nextSession || sessionId };
}

export async function mcpConnect(server) {
  const init = await rpc(server, 'initialize', {
    protocolVersion: MCP_PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: 'codestrom-ide', version: '1.0.0' },
  });
  await rpc(server, 'notifications/initialized', {}, init.sessionId).catch(() => {});
  return { sessionId: init.sessionId, serverInfo: init.result?.serverInfo, capabilities: init.result?.capabilities };
}

export async function mcpListTools(server, sessionId) {
  const { result } = await rpc(server, 'tools/list', {}, sessionId);
  return Array.isArray(result?.tools) ? result.tools : [];
}

export async function mcpCallTool(server, toolName, args, sessionId) {
  const { result } = await rpc(server, 'tools/call', { name: toolName, arguments: args || {} }, sessionId);
  const parts = Array.isArray(result?.content) ? result.content : [];
  const text = parts
    .map((p) => {
      if (!p) return '';
      if (p.type === 'text') return p.text;
      if (p.type === 'image') return '[image result]';
      if (p.type === 'resource') return `[resource ${p.resource?.uri || ''}]`;
      return JSON.stringify(p);
    })
    .filter(Boolean)
    .join('\n');
  return { text, isError: !!result?.isError, structured: result?.structuredContent || null };
}

const toolCache = new Map();

export async function getMcpToolMap({ refresh = false } = {}) {
  const map = new Map();
  const now = Date.now();
  for (const server of getMcpServers()) {
    let entry = toolCache.get(server.id);
    if (refresh || !entry || now - entry.at > 60000) {
      try {
        const { sessionId } = await mcpConnect(server);
        const tools = await mcpListTools(server, sessionId);
        entry = { at: now, sessionId, tools };
      } catch (err) {
        console.error(`[mcp] server "${server.name}" unavailable:`, err.message);
        continue;
      }
      toolCache.set(server.id, entry);
    }
    for (const t of entry.tools) {
      const toolName = `${server.name}__${t.name}`;
      map.set(toolName, { server, name: t.name, sessionId: entry.sessionId, def: t });
    }
  }
  return map;
}

export function invalidateMcpCache() {
  toolCache.clear();
}

export function mcpToolHint(map) {
  if (!map || map.size === 0) return '';
  const lines = [];
  for (const [name, entry] of map) {
    const schema = entry.def?.inputSchema || {};
    lines.push(`- ${name}: ${entry.def?.description || 'no description'} ${JSON.stringify(schema).slice(0, 300)}`);
  }
  return `\n\nAdditional MCP tools (call them like any other tool — the tool name includes the server prefix):\n${lines.join('\n')}`;
}

export function registerMcpRoutes(router) {
  router.get('/mcp/servers', (req, res) => {
    res.json({ servers: getMcpServers() });
  });

  router.post('/mcp/servers', (req, res) => {
    try {
      const server = addMcpServer(req.body || {});
      invalidateMcpCache();
      res.json({ success: true, server });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.delete('/mcp/servers/:id', (req, res) => {
    const removed = removeMcpServer(req.params.id);
    invalidateMcpCache();
    if (!removed) return res.status(404).json({ error: 'Server not found' });
    res.json({ success: true });
  });

  router.post('/mcp/servers/:id/test', async (req, res) => {
    const server = getMcpServers().find((s) => s.id === req.params.id);
    if (!server) return res.status(404).json({ error: 'Server not found' });
    try {
      const { serverInfo, capabilities } = await mcpConnect(server);
      const tools = await mcpListTools(server);
      invalidateMcpCache();
      res.json({
        success: true,
        serverInfo: serverInfo || null,
        capabilities: capabilities || null,
        tools: tools.map((t) => ({ name: t.name, description: t.description || '', inputSchema: t.inputSchema || {} })),
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
}
