// Neural embeddings via LM Studio (text-embedding-nomic-embed-text-v1.5).
// Returns Float32Array vectors; never throws — returns null entries on failure
// so callers can degrade to the hash-based fallback.
import crypto from 'crypto';

const EMBED_MODEL = 'text-embedding-nomic-embed-text-v1.5';
const BASE = process.env.LMSTUDIO_URL || 'http://127.0.0.1:1234';
const BATCH = 32;
const REQ_TIMEOUT = 90000;
const CACHE_CAP = 8192;
const MAX_CHARS = 7000;

const cache = new Map(); // sha1(text) -> Float32Array
let tail = Promise.resolve();

function sha1(s) {
  return crypto.createHash('sha1').update(s).digest('hex');
}

async function callEmbed(texts) {
  const res = await fetch(`${BASE}/v1/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
    signal: AbortSignal.timeout(REQ_TIMEOUT),
  });
  if (!res.ok) throw new Error(`embed HTTP ${res.status}`);
  const data = await res.json();
  return (data.data || []).map((d) => new Float32Array(d.embedding));
}

// Serialized so concurrent callers don't stampede the model server.
export function embedTexts(texts) {
  const p = tail.then(() => doEmbed(texts));
  tail = p.catch(() => {});
  return p;
}

async function doEmbed(texts) {
  if (!texts || !texts.length) return [];
  const out = new Array(texts.length).fill(null);
  const missing = [];
  const idxOf = [];
  texts.forEach((t, i) => {
    const key = sha1(String(t));
    const hit = cache.get(key);
    if (hit) {
      out[i] = hit;
    } else {
      missing.push(String(t));
      idxOf.push(i);
    }
  });
  if (!missing.length) return out;
  for (let i = 0; i < missing.length; i += BATCH) {
    const slice = missing.slice(i, i + BATCH).map((t) => t.slice(0, MAX_CHARS));
    let vecs = null;
    try {
      vecs = await callEmbed(slice);
    } catch (err) {
      console.warn('[embedder] batch failed:', err.message);
    }
    if (!vecs) break;
    vecs.forEach((v, j) => {
      if (!v) return;
      const key = sha1(slice[j]);
      if (cache.size >= CACHE_CAP) cache.delete(cache.keys().next().value);
      cache.set(key, v);
      out[idxOf[i + j]] = v;
    });
  }
  return out;
}

export async function embedQuery(q) {
  const vecs = await embedTexts([String(q || '').slice(0, MAX_CHARS)]);
  return vecs[0] || null;
}
