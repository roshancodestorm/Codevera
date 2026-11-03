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

// ── Cloud storage: users, sessions, projects, share links ────────────────
// JSON-file backed (no dependencies). All writes are atomic (tmp + rename).
const dataDir = process.env.STUDIO_DATA_DIR
  ? (path.isAbsolute(process.env.STUDIO_DATA_DIR) ? process.env.STUDIO_DATA_DIR : path.join(root, process.env.STUDIO_DATA_DIR))
  : path.join(root, "data");

function readStore(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, `${name}.json`), "utf8"));
  } catch {
    return fallback;
  }
}

function writeStore(name, data) {
  fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, `${name}.json`);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file);
}

const loadUsers = () => readStore("users", {});
const saveUsers = (data) => writeStore("users", data);
const loadSessions = () => readStore("sessions", {});
const saveSessions = (data) => writeStore("sessions", data);
const loadProjects = () => readStore("projects", {});
const saveProjects = (data) => writeStore("projects", data);

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString("hex");
}

function publicUser(user) {
  return { id: user.id, name: user.name, createdAt: user.createdAt };
}

function issueSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const sessions = loadSessions();
  sessions[token] = { userId, createdAt: new Date().toISOString() };
  saveSessions(sessions);
  return token;
}

function authFrom(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  const sessions = loadSessions();
  const userId = sessions[token]?.userId;
  if (!userId) return null;
  const users = loadUsers();
  const user = Object.values(users).find((item) => item.id === userId);
  if (!user) return null;
  return { token, userId, user };
}

async function routeAuth(req, res, kind) {
  const payload = await readJson(req);
  const name = String(payload.name || "").trim().slice(0, 40);
  const password = String(payload.password || "");
  if (!name || password.length < 4) {
    return sendJson(res, 400, { ok: false, error: "Name and a password of at least 4 characters are required" });
  }
  const users = loadUsers();
  if (kind === "signup") {
    if (users[name]) return sendJson(res, 409, { ok: false, error: "That name is already taken" });
    const user = { id: crypto.randomUUID(), name, salt: crypto.randomBytes(16).toString("hex"), createdAt: new Date().toISOString() };
    user.passwordHash = hashPassword(password, user.salt);
    users[name] = user;
    saveUsers(users);
    return sendJson(res, 200, { ok: true, token: issueSession(user.id), user: publicUser(user) });
  }
  const user = users[name];
  if (!user) return sendJson(res, 401, { ok: false, error: "No account with that name" });
  const stored = Buffer.from(String(user.passwordHash || ""), "hex");
  const given = Buffer.from(hashPassword(password, user.salt), "hex");
  if (stored.length !== given.length || !crypto.timingSafeEqual(stored, given)) {
    return sendJson(res, 401, { ok: false, error: "Wrong password" });
  }
  return sendJson(res, 200, { ok: true, token: issueSession(user.id), user: publicUser(user) });
}

function routeMe(req, res) {
  const auth = authFrom(req);
  if (!auth) return sendJson(res, 401, { ok: false, error: "Not signed in" });
  return sendJson(res, 200, { ok: true, user: publicUser(auth.user) });
}

function routeLogout(req, res) {
  const auth = authFrom(req);
  if (auth) {
    const sessions = loadSessions();
    delete sessions[auth.token];
    saveSessions(sessions);
  }
  return sendJson(res, 200, { ok: true });
}

async function routeProjects(req, res, method, id, share) {
  const auth = authFrom(req);
  if (!auth) return sendJson(res, 401, { ok: false, error: "Sign in required" });
  const all = loadProjects();
  const owned = Object.values(all).filter((project) => project.ownerId === auth.userId);

  if (method === "GET" && !id) {
    const list = owned
      .map((project) => ({ id: project.id, name: project.name, kind: project.kind, updatedAt: project.updatedAt, shareId: project.shareId || "" }))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 50);
    return sendJson(res, 200, { ok: true, projects: list });
  }

  if (method === "POST" && !id) {
    const payload = await readJson(req);
    const project = {
      id: crypto.randomUUID(),
      ownerId: auth.userId,
      name: String(payload.name || "Untitled design").slice(0, 80),
      kind: String(payload.kind || "Presentation").slice(0, 40),
      savedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pages: Array.isArray(payload.pages) ? payload.pages : [],
    };
    all[project.id] = project;
    saveProjects(all);
    return sendJson(res, 200, { ok: true, id: project.id });
  }

  const project = id ? all[id] : null;
  if (!project || project.ownerId !== auth.userId) return sendJson(res, 404, { ok: false, error: "Project not found" });

  if (method === "GET") return sendJson(res, 200, { ok: true, project });

  if (method === "PUT") {
    const payload = await readJson(req);
    if (typeof payload.name === "string") project.name = String(payload.name).slice(0, 80);
    if (typeof payload.kind === "string") project.kind = String(payload.kind).slice(0, 40);
    if (Array.isArray(payload.pages)) project.pages = payload.pages;
    project.updatedAt = new Date().toISOString();
    saveProjects(all);
    return sendJson(res, 200, { ok: true });
  }

  if (method === "DELETE") {
    delete all[id];
    saveProjects(all);
    return sendJson(res, 200, { ok: true });
  }

  if (share) {
    project.shareId = crypto.randomBytes(8).toString("hex");
    saveProjects(all);
    return sendJson(res, 200, { ok: true, shareId: project.shareId });
  }

  return sendJson(res, 404, { ok: false, error: "Not found" });
}

function routeShared(req, res, shareId) {
  const all = loadProjects();
  const project = Object.values(all).find((item) => item.shareId === shareId);
  if (!project) return sendJson(res, 404, { ok: false, error: "Shared presentation not found" });
  return sendJson(res, 200, { ok: true, project: { name: project.name, kind: project.kind, pages: project.pages } });
}

// ── URL import: fetch + readability-lite extraction ──────────────────────
function stripHtmlToText(html) {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "";
  const description = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) || [])[1] || "";
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(h[1-3])[^>]*>/gi, "\n\n")
    .replace(/<\/(h[1-3])>/gi, "\n")
    .replace(/<(p|div|li|section|article|blockquote)[^>]*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  const decode = (value) => value
    .replace(/&nbsp;/gi, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&");
  const lines = body.split("\n")
    .map((line) => decode(line).replace(/\s+/g, " ").trim())
    .filter((line, index, all) => line.length > 2 && line !== all[index - 1]);
  // Drop nav/boilerplate-looking short repeats.
  const counts = new Map();
  lines.forEach((line) => counts.set(line, (counts.get(line) || 0) + 1));
  const clean = lines.filter((line) => !(counts.get(line) > 2 && line.length < 60));
  return { title: decode(title).trim().slice(0, 120), description: decode(description).trim(), text: clean.join("\n") };
}

async function importFromUrl(payload, res) {
  const target = String(payload?.url || "").trim();
  let parsed;
  try {
    parsed = new URL(target.startsWith("http") ? target : `https://${target}`);
  } catch {
    return sendJson(res, 400, { ok: false, error: "Enter a valid URL" });
  }
  if (!["http:", "https:"].includes(parsed.protocol)) return sendJson(res, 400, { ok: false, error: "Only http(s) URLs are supported" });
  try {
    const upstream = await fetch(parsed.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; StudioDeckImporter/1.0)", Accept: "text/html,*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined,
    });
    const contentType = upstream.headers.get("content-type") || "";
    if (!upstream.ok) return sendJson(res, 502, { ok: false, error: `Page returned HTTP ${upstream.status}` });
    if (!contentType.includes("html") && !contentType.includes("text")) {
      return sendJson(res, 415, { ok: false, error: "That URL is not an HTML page" });
    }
    const html = (await upstream.text()).slice(0, 2_000_000);
    const extracted = stripHtmlToText(html);
    if (!extracted.text || extracted.text.length < 80) {
      return sendJson(res, 422, { ok: false, error: "Could not extract readable text from that page" });
    }
    return sendJson(res, 200, { ok: true, url: parsed.toString(), title: extracted.title || parsed.hostname, description: extracted.description, text: extracted.text.slice(0, 60000) });
  } catch (error) {
    return sendJson(res, 502, { ok: false, error: error.message || "Fetch failed" });
  }
}

// ── Deck analytics ───────────────────────────────────────────────────────
// Store shape: { [shareId]: { [sessionId]: { startedAt, ms: { [pageIndex]: totalMs }, lastPage } } }
const loadAnalytics = () => readStore("analytics", {});
const saveAnalytics = (data) => writeStore("analytics", data);

function routeAnalyticsTrack(payload, res) {
  const shareId = String(payload?.shareId || "").slice(0, 64);
  const sessionId = String(payload?.sessionId || "").slice(0, 64);
  const pageIndex = Math.max(0, Math.min(200, Number(payload?.pageIndex) || 0));
  const deltaMs = Math.max(0, Math.min(30000, Number(payload?.ms) || 0));
  if (!shareId || !sessionId) return sendJson(res, 400, { ok: false, error: "shareId and sessionId are required" });

  const store = loadAnalytics();
  const deck = store[shareId] || {};
  const session = deck[sessionId] || { startedAt: new Date().toISOString(), ms: {}, lastPage: 0 };
  session.ms[pageIndex] = (session.ms[pageIndex] || 0) + deltaMs;
  session.lastPage = pageIndex;

  // Prune: keep at most 500 sessions per deck (drop oldest).
  const entries = Object.entries(deck);
  entries.push([sessionId, session]);
  entries.sort((a, b) => String(a[1].startedAt).localeCompare(String(b[1].startedAt)));
  deck[sessionId] = session;
  const pruned = entries.slice(-500);

  store[shareId] = Object.fromEntries(pruned);
  saveAnalytics(store);
  return sendJson(res, 200, { ok: true });
}

function routeAnalyticsReport(req, res, shareId) {
  const auth = authFrom(req);
  if (!auth) return sendJson(res, 401, { ok: false, error: "Sign in required" });
  if (!shareId) return sendJson(res, 400, { ok: false, error: "shareId is required" });
  const projects = loadProjects();
  const project = Object.values(projects).find((item) => item.shareId === shareId);
  if (!project || project.ownerId !== auth.userId) return sendJson(res, 404, { ok: false, error: "No shared deck found for your account" });

  const deck = loadAnalytics()[shareId] || {};
  const sessions = Object.values(deck);
  const slideCount = Array.isArray(project.pages) ? project.pages.length : 0;
  const totals = new Array(Math.max(slideCount, 1)).fill(0);
  const reach = new Array(Math.max(slideCount, 1)).fill(0); // sessions that saw page i
  let totalMs = 0;

  sessions.forEach((session) => {
    Object.entries(session.ms || {}).forEach(([idx, ms]) => {
      const i = Number(idx);
      if (i < totals.length) {
        totals[i] += ms;
        reach[i] += 1;
      }
    });
    Object.keys(session.ms || {}).forEach((k) => totalMs += Number(session.ms[k] || 0));
  });

  const viewers = sessions.length;
  const avgTimePerPage = totals.map((ms) => Math.round(ms / Math.max(1, reach.filter(Boolean).length)));
  const dropOff = reach.map((count, i) => (viewers && i === 0 ? 0 : viewers ? Math.round(((viewers - count) / viewers) * 100) : 0));
  const completed = reach[Math.min(reach.length - 1, slideCount - 1)] || 0;

  return sendJson(res, 200, {
    ok: true,
    shareId,
    projectName: project.name,
    viewers,
    uniqueViewers: viewers,
    completionRate: viewers ? Math.round((completed / viewers) * 100) : 0,
    avgSecondsPerPage: avgTimePerPage.map((ms) => Math.round(ms / 1000)),
    dropOffPercent: dropOff,
    totalMinutes: Math.round(totalMs / 60000),
  });
}

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

  // ── Import: fetch a web page and return clean readable text ─────────
  if (req.method === "POST" && req.url.split("?")[0] === "/api/import/url") {
    readJson(req)
      .then((payload) => importFromUrl(payload, res))
      .catch((error) => sendJson(res, 400, { ok: false, error: error.message || "Invalid request" }));
    return;
  }

  // ── Deck analytics: viewer tracking + owner report ──────────────────
  if (req.method === "POST" && req.url.split("?")[0] === "/api/analytics/track") {
    readJson(req)
      .then((payload) => routeAnalyticsTrack(payload, res))
      .catch(() => sendJson(res, 400, { ok: false }));
    return;
  }
  if (req.method === "GET" && req.url.split("?")[0] === "/api/analytics/report") {
    const url = new URL(req.url, `http://${req.headers.host}`);
    routeAnalyticsReport(req, res, url.searchParams.get("shareId") || "")
      .catch((error) => sendJson(res, 400, { ok: false, error: error.message || "Invalid request" }));
    return;
  }

  const urlPath = decodeURIComponent(req.url.split("?")[0]);

  // ── Cloud routes: auth, projects, share ────────────────────────────
  if (req.method === "POST" && urlPath === "/api/auth/signup") {
    routeAuth(req, res, "signup").catch((error) => sendJson(res, 400, { ok: false, error: error.message || "Invalid request" }));
    return;
  }
  if (req.method === "POST" && urlPath === "/api/auth/login") {
    routeAuth(req, res, "login").catch((error) => sendJson(res, 400, { ok: false, error: error.message || "Invalid request" }));
    return;
  }
  if (req.method === "POST" && urlPath === "/api/auth/logout") return routeLogout(req, res);
  if (req.method === "GET" && urlPath === "/api/me") return routeMe(req, res);
  const projectMatch = urlPath.match(/^\/api\/projects(?:\/([^/]+))?(?:\/(share))?$/);
  if (projectMatch) {
    routeProjects(req, res, req.method, projectMatch[1] || "", Boolean(projectMatch[2]))
      .catch((error) => sendJson(res, 400, { ok: false, error: error.message || "Invalid request" }));
    return;
  }
  const sharedMatch = req.method === "GET" ? urlPath.match(/^\/api\/shared\/([^/]+)$/) : null;
  if (sharedMatch) return routeShared(req, res, sharedMatch[1]);

  // Public read-only viewer route: /p/<shareId> serves the app shell, and
  // /p/<asset> aliases root assets so the shell's relative script/style
  // links keep resolving under the /p/ path.
  if (req.method === "GET" && urlPath.startsWith("/p/")) {
    const viewerMatch = urlPath.match(/^\/p\/([a-f0-9]{16})$/i);
    if (viewerMatch) {
      fs.readFile(path.join(root, "index.html"), (err, data) => {
        if (err) return sendJson(res, 404, { ok: false, error: "Not found" });
        res.writeHead(200, { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" });
        res.end(data);
      });
      return;
    }
    const asset = urlPath.slice(3);
    if (asset && !asset.includes("/") && path.extname(asset)) {
      fs.readFile(path.join(root, asset), (err, data) => {
        if (err) return sendJson(res, 404, corsHeaders, "Not found");
        res.writeHead(200, { ...corsHeaders, "Content-Type": types[path.extname(asset)] || "application/octet-stream" });
        res.end(data);
      });
      return;
    }
  }

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
      if (body.length > 4 * 1024 * 1024) {
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
  // Keyless fallback: Wikimedia Commons search (topic-relevant, CC-licensed)
  try {
    const upstream = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=${count}&gsrsearch=${encodeURIComponent(q)}&prop=imageinfo&iiprop=url&iiurlwidth=320`,
    );
    const data = await upstream.json().catch(() => ({}));
    const pages = data.query?.pages ? Object.values(data.query.pages) : [];
    const seen = new Set();
    const photos = [];
    for (const page of pages) {
      const info = page.imageinfo?.[0];
      const thumb = info?.thumburl || "";
      if (!thumb || thumb.endsWith(".svg") || thumb.endsWith(".tif") || thumb.endsWith(".tiff")) continue;
      if (seen.has(thumb)) continue;
      seen.add(thumb);
      // Scale the Commons thumb path up for a large preview URL.
      const full = thumb.replace(/\/(\d+)px-/, "/1600px-");
      photos.push({
        url: full !== thumb ? full : info.url,
        thumb,
        alt: String(page.title || q).replace(/^File:/, "").replace(/\.(jpe?g|png|gif|webp)$/i, "").replace(/_/g, " ").trim() || q,
        photographer: "Wikimedia Commons",
        source: "wikimedia",
      });
    }
    if (photos.length) return { ok: true, source: "wikimedia", query: q, count: photos.length, photos };
  } catch {
    // fall through to picsum
  }
  // Last-resort deterministic fallback — query-hash seeded picsum images
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
  // Prefer the local ComfyUI bridge when reachable; otherwise fall back to
  // the free pollinations.ai cloud endpoint so generation always works.
  try {
    const upstream = await fetch(`${COMFYUI_BRIDGE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, width, height }),
    });
    const data = await upstream.json().catch(() => ({}));
    if (upstream.ok && data.ok) {
      // Return image URL (served by ComfyUI bridge /output static)
      const imageUrl = `${COMFYUI_BRIDGE}${data.path}`;
      return sendJson(res, 200, { ok: true, imageUrl, filename: data.filename, source: "comfyui" });
    }
    console.warn(`[image-gen] ComfyUI failed (${data.error || upstream.status}) - using pollinations fallback`);
  } catch (error) {
    console.warn(`[image-gen] ComfyUI unreachable (${error.message}) - using pollinations fallback`);
  }
  try {
    const seed = crypto.randomInt(100000, 999999);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(String(prompt).slice(0, 400))}?width=${Math.min(width, 1600)}&height=${Math.min(height, 1600)}&nologo=true&seed=${seed}`;
    return sendJson(res, 200, { ok: true, imageUrl, filename: `pollinations-${seed}.jpg`, source: "pollinations" });
  } catch (error) {
    return sendJson(res, 502, { ok: false, error: error.message || "Image generation failed" });
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
