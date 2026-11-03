// Project memory — `.memory/memory.md` + `.memory/project-memory.json`.
// Single read/write surface for every consumer (pipeline, quick agent, composer,
// chat, arena context) so memory stays consistent and is injected everywhere.
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

const MEMORY_DIR = '.memory';
const MEMORY_FILE = 'memory.md';
const STRUCTURED_FILE = 'project-memory.json';
const LEGACY_FILE = path.join('.ide', 'memory.md'); // old quick-agent path

export const MEMORY_INJECT_CAP = 4000; // chars injected into prompts
export const MEMORY_WRITE_CAP = 16000; // chars kept on append

function memPath(dir) {
  return path.join(dir, MEMORY_DIR, MEMORY_FILE);
}

export async function readMemory(dir) {
  if (!dir) return '';
  const p = memPath(dir);
  try {
    return await fsp.readFile(p, 'utf8');
  } catch {
    // One-time migration from the legacy `.ide/memory.md` location.
    try {
      const legacy = await fsp.readFile(path.join(dir, LEGACY_FILE), 'utf8');
      await fsp.mkdir(path.join(dir, MEMORY_DIR), { recursive: true });
      await fsp.writeFile(p, legacy, 'utf8');
      try { await fsp.unlink(path.join(dir, LEGACY_FILE)); } catch {}
      return legacy;
    } catch {
      return '';
    }
  }
}

export async function appendMemory(dir, text, cap = MEMORY_WRITE_CAP) {
  if (!dir) return;
  await fsp.mkdir(path.join(dir, MEMORY_DIR), { recursive: true });
  const p = memPath(dir);
  let existing = '';
  try { existing = await fsp.readFile(p, 'utf8'); } catch {}
  await fsp.writeFile(p, (existing + text).slice(-cap), 'utf8');
}

export async function writeMemory(dir, text) {
  if (!dir) return;
  await fsp.mkdir(path.join(dir, MEMORY_DIR), { recursive: true });
  await fsp.writeFile(memPath(dir), String(text || '').slice(0, MEMORY_WRITE_CAP), 'utf8');
}

// Markdown prompt block for injection. Returns '' when nothing to inject.
export async function collectMemory(dir, cap = MEMORY_INJECT_CAP) {
  const md = (await readMemory(dir)).trim();
  if (!md) return '';
  return md.slice(0, cap);
}

export function readStructuredMemory(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, MEMORY_DIR, STRUCTURED_FILE), 'utf8'));
  } catch {
    return { architecture: '', conventions: '', decisions: [], preferences: [], frequentlyModified: [] };
  }
}

export async function writeStructuredMemory(dir, data) {
  if (!dir) return;
  await fsp.mkdir(path.join(dir, MEMORY_DIR), { recursive: true });
  await fsp.writeFile(path.join(dir, MEMORY_DIR, STRUCTURED_FILE), JSON.stringify(data, null, 2), 'utf8');
}
