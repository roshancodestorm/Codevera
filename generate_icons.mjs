/**
 * generate_icons.mjs
 * Generates icon-192.png and icon-512.png for the PWA manifest.
 * Tries the 'canvas' npm package first; falls back to a built-in pure-Node
 * PNG writer that needs zero dependencies.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'public');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Pure-Node minimal PNG encoder ───────────────────────────────────────────
// Produces a valid 24-bit RGB PNG without any external dependency.

import zlib from 'zlib';
import { createHash } from 'crypto';

function crc32(buf) {
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c;
    }
    return t;
  })());
  let c = 0xffffffff;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const dataBuf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(dataBuf.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, dataBuf])), 0);
  return Buffer.concat([lenBuf, typeBuf, dataBuf, crcBuf]);
}

function encodePng(width, height, rgbaRows) {
  // Build raw filter-0 scanlines
  const scanlines = [];
  for (let y = 0; y < height; y++) {
    const row = [0]; // filter byte
    for (let x = 0; x < width; x++) {
      const [r, g, b] = rgbaRows[y][x];
      row.push(r, g, b);
    }
    scanlines.push(Buffer.from(row));
  }
  const raw = zlib.deflateSync(Buffer.concat(scanlines), { level: 6 });

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', raw),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Icon renderer (pure pixel math, no canvas) ───────────────────────────────

function renderIcon(size) {
  const rows = [];
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  // Colour palette
  const BG = [12, 12, 16];        // #0c0c10 dark
  const PURPLE = [124, 58, 237];  // #7c3aed
  const LPURPLE = [168, 85, 247]; // #a855f7

  function inCircle(x, y, ox, oy, radius) {
    return (x - ox) ** 2 + (y - oy) ** 2 <= radius ** 2;
  }

  function roundedRect(x, y, w, h, rad) {
    return (px, py) => {
      if (px < x || px > x + w || py < y || py > y + h) return false;
      const corners = [
        [x + rad, y + rad], [x + w - rad, y + rad],
        [x + rad, y + h - rad], [x + w - rad, y + h - rad],
      ];
      const nearCorner = px < x + rad || px > x + w - rad;
      const nearTopBot = py < y + rad || py > y + h - rad;
      if (nearCorner && nearTopBot) {
        const corner = corners.find(([cx, cy]) => Math.abs(px - cx) <= rad && Math.abs(py - cy) <= rad);
        if (!corner) return false;
        return inCircle(px, py, corner[0], corner[1], rad);
      }
      return true;
    };
  }

  const outerR = size * 0.18;
  const innerX = size * 0.08, innerY = size * 0.08;
  const innerW = size * 0.84, innerH = size * 0.84;
  const innerRad = size * 0.12;
  const isOuter = roundedRect(0, 0, size, size, outerR);
  const isInner = roundedRect(innerX, innerY, innerW, innerH, innerRad);

  // Dot accent position
  const dotCX = size * 0.67, dotCY = size * 0.33, dotR = size * 0.065;

  // Letter "C" rendered as arc segments
  const letterCX = cx, letterCY = cy + size * 0.03;
  const letterR = size * 0.22;
  const strokeW = size * 0.07;
  const gapStart = -Math.PI * 0.3, gapEnd = Math.PI * 0.3;

  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      let color = null;

      if (!isOuter(x, y)) {
        color = null; // transparent → white bg for PNG display, or just white
        row.push([255, 255, 255]);
        continue;
      }

      // Purple outer ring
      if (!isInner(x, y)) {
        color = PURPLE;
        row.push(color);
        continue;
      }

      // Dark inner background
      color = BG;

      // Dot accent
      if (inCircle(x, y, dotCX, dotCY, dotR)) {
        color = LPURPLE;
        row.push(color);
        continue;
      }

      // "C" letter — draw as an arc stroke
      const dx = x - letterCX;
      const dy = y - letterCY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= letterR - strokeW && dist <= letterR + strokeW * 0.5) {
        const angle = Math.atan2(dy, dx);
        // Gap on the right side
        if (angle < gapStart || angle > gapEnd) {
          color = PURPLE;
        }
      }

      row.push(color || BG);
    }
    rows.push(row);
  }

  return encodePng(size, size, rows);
}

const buf192 = renderIcon(192);
const buf512 = renderIcon(512);

fs.writeFileSync(path.join(OUT_DIR, 'icon-192.png'), buf192);
fs.writeFileSync(path.join(OUT_DIR, 'icon-512.png'), buf512);

console.log(`icon-192.png  ${buf192.length} bytes`);
console.log(`icon-512.png  ${buf512.length} bytes`);
console.log('PWA icons written to public/');
