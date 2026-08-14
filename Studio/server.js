import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import * as Y from "yjs";
import { WebSocketServer } from "ws";
import { createDecoder, readVarUint, readVarUint8Array } from "lib0/decoding";
import { createEncoder, writeVarUint, writeVarUint8Array, toUint8Array } from "lib0/encoding";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const root = __dirname;
const port = Number(process.env.PORT || 5173);
const host = "127.0.0.1";
const logFile = path.join(root, "server-error.log");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url.split("?")[0] === "/api/model-chat") {
    readJson(req)
      .then((payload) => proxyModelChat(payload, res))
      .catch((error) => sendJson(res, 400, { ok: false, error: error.message || "Invalid request" }));
    return;
  }

  if (req.method === "POST" && req.url.split("?")[0] === "/api/image-gen") {
    readJson(req)
      .then((payload) => proxyImageGen(payload, res))
      .catch((error) => sendJson(res, 400, { ok: false, error: error.message || "Invalid request" }));
    return;
  }

  if (req.method === "GET" && req.url.split("?")[0] === "/api/photo-search") {
    const url = new URL(req.url, `http://${req.headers.host}`);
    photoSearch(url.searchParams.get("q"), Number(url.searchParams.get("per") || 24))
      .then((result) => sendJson(res, result.ok ? 200 : 502, result))
      .catch((error) => sendJson(res, 502, { ok: false, error: error.message || "Photo search failed" }));
    return;
  }

  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  const relative = path.normalize(urlPath === "/" ? "index.html" : urlPath).replace(/^(\.\.[/\\])+/, "");
  const file = path.join(root, relative);

  if (!file.startsWith(root)) {
    res.writeHead(403, corsHeaders);
    res.end("Forbidden");
    return;
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, corsHeaders);
      res.end("Not found");
      return;
    }

    res.writeHead(200, { ...corsHeaders, "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
});

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

async function proxyModelChat(payload, res) {
  const model = payload.model || {};
  if (!model.baseUrl || !model.modelId) return sendJson(res, 400, { ok: false, error: "Model ID and Base URL are required" });
  const endpoint = chatCompletionsUrl(model.baseUrl);
  const requestBody = {
    model: model.modelId,
    messages: Array.isArray(payload.messages) ? payload.messages : [],
    temperature: 0.72,
    max_tokens: Number(payload.maxTokens || 1200),
  };
  // Only send response_format for models that support it (not deepseek flash/v4 variants)
  const modelId = String(model.modelId || "").toLowerCase();
  const supportsJsonFormat = payload.json && !modelId.includes("flash") && !modelId.includes("deepseek-v4") && !modelId.includes("deepseek-r");
  if (supportsJsonFormat) requestBody.response_format = { type: "json_object" };
  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(model.apiKey ? { Authorization: `Bearer ${model.apiKey}` } : {}),
      },
      body: JSON.stringify(requestBody),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = data.error?.message || data.message || `Provider returned HTTP ${upstream.status}`;
      return sendJson(res, upstream.status, { ok: false, error: message });
    }
    const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || "";
    return sendJson(res, 200, { ok: true, content });
  } catch (error) {
    return sendJson(res, 502, { ok: false, error: error.message || "Provider request failed" });
  }
}

function chatCompletionsUrl(baseUrl) {
  const clean = String(baseUrl || "").replace(/\/+$/, "");
  if (clean.endsWith("/chat/completions")) return clean;
  return `${clean}/chat/completions`;
}

const COMFYUI_BRIDGE = process.env.COMFYUI_BRIDGE || "http://127.0.0.1:7860";

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || "";

async function photoSearch(query, per = 24) {
  const q = String(query || "").trim().slice(0, 80);
  if (!q) return { ok: false, error: "Query is required" };
  const count = Math.min(Math.max(Number(per) || 24, 8), 40);
  if (UNSPLASH_ACCESS_KEY) {
    try {
      const upstream = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=${count}&orientation=landscape&client_id=${encodeURIComponent(UNSPLASH_ACCESS_KEY)}`,
        { headers: { "Accept-Version": "v1" } },
      );
      const data = await upstream.json().catch(() => ({}));
      if (upstream.ok && Array.isArray(data.results)) {
        const photos = data.results
          .map((item) => ({
            url: item.urls?.regular || item.urls?.raw || "",
            thumb: item.urls?.thumb || item.urls?.small || item.urls?.regular || "",
            alt: item.alt_description || q,
            photographer: item.user?.name || "",
            source: "unsplash",
          }))
          .filter((p) => p.url);
        if (photos.length) return { ok: true, source: "unsplash", query: q, count: photos.length, photos };
      }
      if (data.errors) return { ok: false, error: data.errors[0] || "Unsplash search failed" };
    } catch (error) {
      return { ok: false, error: error.message || "Unsplash search failed" };
    }
  }
  // Keyless deterministic fallback — query-hash seeded picsum images
  const seed = crypto.createHash("sha256").update(q).digest("hex").slice(0, 12);
  const photos = [];
  for (let i = 0; i < count; i += 1) {
    const s = `${seed}-${i + 1}`;
    photos.push({
      url: `https://picsum.photos/seed/${encodeURIComponent(s)}/900/540`,
      thumb: `https://picsum.photos/seed/${encodeURIComponent(s)}/360/216`,
      alt: `${q} photo ${i + 1}`,
      photographer: "picsum",
      source: "picsum",
    });
  }
  return { ok: true, source: "picsum", query: q, count: photos.length, photos };
}

async function proxyImageGen(payload, res) {
  const prompt = payload?.prompt;
  const width = Number(payload?.width || 512);
  const height = Number(payload?.height || 512);
  if (!prompt || typeof prompt !== "string") return sendJson(res, 400, { ok: false, error: "Prompt is required" });
  try {
    const upstream = await fetch(`${COMFYUI_BRIDGE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, width, height }),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok || !data.ok) {
      return sendJson(res, upstream.status || 502, { ok: false, error: data.error || "ComfyUI generation failed" });
    }
    // Return image URL (served by ComfyUI bridge /output static)
    const imageUrl = `${COMFYUI_BRIDGE}${data.path}`;
    return sendJson(res, 200, { ok: true, imageUrl, filename: data.filename });
  } catch (error) {
    return sendJson(res, 502, { ok: false, error: error.message || "ComfyUI bridge unreachable" });
  }
}

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const MESSAGE_SYNC_STEP1 = 0;
const MESSAGE_SYNC_STEP2 = 1;
const MESSAGE_SYNC_UPDATE = 2;

const collabRooms = new Map();

function getCollabRoom(workspace) {
  if (!collabRooms.has(workspace)) {
    collabRooms.set(workspace, { doc: new Y.Doc(), clients: new Set(), awareness: new Map() });
  }
  return collabRooms.get(workspace);
}

function encodeCollabMessage(messageType, ...parts) {
  const encoder = createEncoder();
  writeVarUint(encoder, messageType);
  for (const part of parts) writeVarUint8Array(encoder, part);
  return toUint8Array(encoder);
}

function broadcastCollabExcept(room, sender, message) {
  for (const client of room.clients) {
    if (client !== sender && client.readyState === 1) {
      try { client.send(message); } catch {}
    }
  }
}

function broadcastCollabAll(room, message) {
  for (const client of room.clients) {
    if (client.readyState === 1) {
      try { client.send(message); } catch {}
    }
  }
}

function handleCollabSync(room, sender, decoder) {
  const syncType = readVarUint(decoder);
  if (syncType === MESSAGE_SYNC_STEP1) {
    const sv = readVarUint8Array(decoder);
    const update = Y.encodeStateAsUpdate(room.doc, sv);
    if (update.length > 2 || update[0] !== 0) {
      // empty yjs updates are exactly 00 00 — only answer when there is content,
      // otherwise an echo loop grows unbounded (client re-requests on reply).
      const encoder = createEncoder();
      writeVarUint(encoder, MESSAGE_SYNC);
      writeVarUint(encoder, MESSAGE_SYNC_STEP2);
      writeVarUint8Array(encoder, update);
      try { sender.send(toUint8Array(encoder)); } catch {}
    }
  } else if (syncType === MESSAGE_SYNC_STEP2 || syncType === MESSAGE_SYNC_UPDATE) {
    const update = readVarUint8Array(decoder);
    Y.applyUpdate(room.doc, update);
    const encoder = createEncoder();
    writeVarUint(encoder, MESSAGE_SYNC);
    writeVarUint(encoder, MESSAGE_SYNC_UPDATE);
    writeVarUint8Array(encoder, update);
    broadcastCollabExcept(room, sender, toUint8Array(encoder));
  }
}

function handleCollabAwareness(room, sender, decoder) {
  const data = readVarUint8Array(decoder);
  const encoder = createEncoder();
  writeVarUint(encoder, MESSAGE_AWARENESS);
  writeVarUint8Array(encoder, data);
  broadcastCollabAll(room, toUint8Array(encoder));
}

function setupCollabUpgrade(req, socket, head) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (!url.pathname.startsWith("/api/collab")) return false;
  const workspace = url.searchParams.get("workspace") || "default";
  const room = getCollabRoom(workspace);

  const wss = new WebSocketServer({ noServer: true });
  wss.handleUpgrade(req, socket, head, (ws) => {
    room.clients.add(ws);

    // Send current doc state to new client
    const sv = new Uint8Array([0]); // encoded empty state vector (plain [] crashes Yjs decode)
    const update = Y.encodeStateAsUpdate(room.doc, sv);
    const encoder = createEncoder();
    writeVarUint(encoder, MESSAGE_SYNC);
    writeVarUint(encoder, MESSAGE_SYNC_STEP2);
    writeVarUint8Array(encoder, update);
    try { ws.send(toUint8Array(encoder)); } catch {}

    ws.on("message", (rawMsg) => {
      try {
        const msg = rawMsg instanceof Buffer ? rawMsg : Buffer.from(rawMsg);
        const decoder = createDecoder(new Uint8Array(msg));
        const messageType = readVarUint(decoder);
        if (messageType === MESSAGE_SYNC) handleCollabSync(room, ws, decoder);
        else if (messageType === MESSAGE_AWARENESS) handleCollabAwareness(room, ws, decoder);
      } catch {}
    });

    ws.on("close", () => {
      room.clients.delete(ws);
      if (room.clients.size === 0) room.awareness.clear();
    });

    ws.on("error", () => { room.clients.delete(ws); });
  });
  return true;
}

function sendJson(res, status, payload) {
  res.writeHead(status, { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

process.on("uncaughtException", (error) => {
  fs.writeFileSync(logFile, `[${new Date().toISOString()}] ${error.stack || error.message}\n`);
  console.error("[uncaughtException]", error.stack || error.message);
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  fs.writeFileSync(logFile, `${error.stack || error}\n`);
  process.exit(1);
});

server.on("error", (error) => {
  fs.writeFileSync(logFile, `${error.stack || error.message}\n`);
  process.exit(1);
});

server.on("upgrade", (req, socket, head) => {
  try {
    if (setupCollabUpgrade(req, socket, head)) return;
    socket.destroy();
  } catch (error) {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] [collab-upgrade-error] ${error.stack || error.message}\n`);
    socket.destroy();
  }
});

server.listen(port, host);
