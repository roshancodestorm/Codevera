// ── Import engine: PDF / DOCX / URL / raw text → deck source material ──
// Dependency-free client-side parsers. Loaded before app.js.
//
// - DOCX: it's a ZIP; we walk local file headers, inflate word/document.xml
//   with DecompressionStream("deflate-raw"), then strip XML to paragraphs.
// - PDF: scan for stream objects, inflate FlateDecode payloads with
//   DecompressionStream("deflate"/"deflate-raw"), pull text out of Tj/TJ
//   operators. Works on most text-based (non-scanned) PDFs.
// - structureOutlineFromText(): deterministic heading/bullet/stat detection
//   that turns raw text into a deck outline the AI pipeline can expand.

function decodeXmlEntities(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&");
}

async function inflateBytes(bytes, format) {
  try {
    if (typeof DecompressionStream === "undefined") return null;
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format));
    const buffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

function bytesToUtf8(bytes) {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

// Minimal ZIP reader: enough for DOCX (stored + deflate entries).
async function unzipReadFile(arrayBuffer, wantedName) {
  const view = new DataView(arrayBuffer);
  const bytes = new Uint8Array(arrayBuffer);
  let offset = 0;
  while (offset + 30 <= bytes.length) {
    const signature = view.getUint32(offset, true);
    if (signature !== 0x04034b50) {
      offset += 1;
      continue;
    }
    const method = view.getUint16(offset + 8, true);
    let compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const name = bytesToUtf8(bytes.slice(offset + 30, offset + 30 + nameLength));
    const dataStart = offset + 30 + nameLength + extraLength;
    // Size 0 with data descriptor flag → scan for the next header to size it.
    if (!compressedSize && (view.getUint16(offset + 6, true) & 0x08)) {
      let probe = dataStart;
      while (probe + 4 <= bytes.length && view.getUint32(probe, true) !== 0x04034b50 && view.getUint32(probe, true) !== 0x08074b50 && view.getUint32(probe, true) !== 0x02014b50) probe += 1;
      compressedSize = Math.max(0, probe - dataStart);
    }
    if (name === wantedName) {
      const chunk = bytes.slice(dataStart, dataStart + compressedSize);
      const inflated = method === 0 ? chunk : await inflateBytes(chunk, "deflate-raw");
      return inflated ? bytesToUtf8(inflated) : "";
    }
    offset = method === 0 && !compressedSize ? dataStart : dataStart + compressedSize;
  }
  return "";
}

async function extractDocxText(file) {
  const xml = await unzipReadFile(await file.arrayBuffer(), "word/document.xml");
  if (!xml) throw new Error("Could not read document.xml inside this .docx");
  const paragraphs = xml
    .split(/<\/w:p>/)
    .map((block) => {
      const texts = block.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
      const line = texts.map((t) => decodeXmlEntities(t.replace(/<[^>]+>/g, ""))).join("");
      return line.trim();
    })
    .filter(Boolean);
  return paragraphs.join("\n");
}

// Minimal PDF text extractor for text-based PDFs.
async function extractPdfText(file) {
  const raw = bytesToUtf8(new Uint8Array(await file.arrayBuffer()));
  const chunks = [];
  const streamRe = /stream\r?\n/g;
  let match;
  while ((match = streamRe.exec(raw))) {
    const start = match.index + match[0].length;
    const end = raw.indexOf("endstream", start);
    if (end < 0) break;
    const latin = raw.slice(start, end);
    let content = null;
    // Try zlib-wrapped first, then raw deflate.
    for (const format of ["deflate", "deflate-raw"]) {
      const bytes = new Uint8Array(latin.length);
      for (let i = 0; i < latin.length; i += 1) bytes[i] = latin.charCodeAt(i) & 0xff;
      const inflated = await inflateBytes(bytes, format);
      if (inflated && /T[jJ]|Tf|BT/.test(bytesToUtf8(inflated))) {
        content = bytesToUtf8(inflated);
        break;
      }
    }
    if (!content && /\((?:\\.|[^\\)])*\)\s*Tj/.test(latin)) content = latin;
    if (content) chunks.push(content);
    streamRe.lastIndex = end + 1;
  }
  const lines = [];
  chunks.forEach((content) => {
    const showTextRe = /\((?:\\.|[^\\()])*\)/g;
    const segments = content.match(showTextRe) || [];
    let line = "";
    segments.forEach((seg) => {
      const text = seg
        .slice(1, -1)
        .replace(/\\([nrtbf])/g, (__, c) => ({ n: "\n", r: "", t: "\t", b: "", f: "\n" }[c]))
        .replace(/\\(\d{1,3})/g, (__, oct) => String.fromCharCode(parseInt(oct, 8)))
        .replace(/\\([()\\])/g, "$1");
      if (text.includes("\n")) {
        line += text.split("\n")[0];
        lines.push(line.trim());
        line = "";
        text.split("\n").slice(1).forEach((part, idx, all) => {
          if (idx < all.length - 1) lines.push(part.trim());
          else line = part;
        });
      } else {
        line += text;
      }
    });
    if (line.trim()) lines.push(line.trim());
  });
  const text = lines.filter((l) => l && l.length > 1).join("\n");
  if (!text.trim()) throw new Error("No extractable text — this PDF may be scanned images.");
  return text;
}

async function extractTextFromFile(file) {
  const name = String(file.name || "").toLowerCase();
  if (name.endsWith(".docx")) return extractDocxText(file);
  if (name.endsWith(".pdf")) return extractPdfText(file);
  if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".csv") || file.type.startsWith("text/")) {
    return file.text();
  }
  throw new Error("Unsupported file — use .pdf, .docx, .txt or .md");
}

// Deterministic structuring: headings, bullets, stat lines. The output is a
// deck-outline the generator uses as SOURCE MATERIAL (not invented content).
function structureOutlineFromText(rawText, maxSlides = 10) {
  const paragraphs = String(rawText || "")
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}|\n(?=[\-•*\d])/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 1);

  const looksLikeHeading = (line) =>
    line.length >= 3 && line.length <= 70 &&
    !/[.!?;:]$/.test(line) &&
    (/^[A-Z0-9][^.!?]*$/.test(line) || line === line.toUpperCase() && /[A-Z]{2}/.test(line));

  const isBullet = (line) => /^([-•*·]|\d{1,2}[.)])\s+/.test(line);
  const stripBullet = (line) => line.replace(/^([-•*·]|\d{1,2}[.)])\s+/, "");
  const hasStat = (line) => /[$₹€£]\s?\d/.test(line) || /\b\d{1,3}(\.\d+)?\s?(%|percent|x|k|m|bn|billion|million)/i.test(line);

  // A leading standalone line that reads like a heading is the deck title.
  const firstLine = String(rawText || "").replace(/\r\n?/g, "\n").split("\n")[0].trim();
  const titleCandidate = looksLikeHeading(firstLine) ? firstLine : "";
  if (titleCandidate && paragraphs[0] === titleCandidate) paragraphs.shift();

  const title = (titleCandidate || paragraphs.find((p) => looksLikeHeading(p)) || paragraphs[0] || "Imported deck").slice(0, 90);
  const slides = [];
  let current = null;

  const pushCurrent = () => {
    if (!current) return;
    if (current.bullets.length || current.subtitle || current.statCards.length) slides.push(current);
    current = null;
  };

  paragraphs.forEach((paragraph) => {
    const words = paragraph.split(/\s+/);
    if (looksLikeHeading(paragraph) && (!current || current.bullets.length >= 2 || words.length <= 12)) {
      pushCurrent();
      current = { type: "content", title: paragraph.slice(0, 90), subtitle: "", bullets: [], statCards: [] };
      return;
    }
    if (!current) current = { type: "content", title: title, subtitle: "", bullets: [], statCards: [] };
    if (isBullet(paragraph)) {
      current.bullets.push(stripBullet(paragraph).slice(0, 160));
    } else if (hasStat(paragraph)) {
      // Stat-heavy lines become their own stat slide once the current one is full.
      if (current.bullets.length >= 2 || current.statCards.length >= 4) {
        pushCurrent();
        current = { type: "stats", title: words.slice(0, 8).join(" ").replace(/[.,]$/, ""), subtitle: "", bullets: [], statCards: [] };
      }
      const value = (paragraph.match(/([$₹€£]\s?[\d.,]+\s?[kmb]?|\d{1,3}(\.\d+)?\s?(%|percent|x|k|m|bn))/i) || ["—"])[0].trim();
      current.statCards.push({ value: value.slice(0, 14), label: paragraph.replace(value, "").trim().slice(0, 60) || "Key figure" });
    } else if (!current.subtitle) {
      current.subtitle = paragraph.slice(0, 170);
    } else {
      current.bullets.push(paragraph.slice(0, 160));
    }
    if (current.bullets.length >= 5) pushCurrent();
  });
  pushCurrent();

  const normalized = slides.slice(0, Math.max(3, maxSlides)).map((slide) => ({
    ...slide,
    type: slide.statCards.length >= 2 ? "stats" : slide.bullets.length ? "content" : "definition",
    bullets: slide.bullets.slice(0, 5),
    statCards: slide.statCards.slice(0, 4),
  }));

  while (normalized.length && normalized.length < 3) {
    normalized.push({ type: "content", title: `${title} — point ${normalized.length + 1}`, subtitle: "", bullets: [], statCards: [] });
  }

  return {
    title,
    subtitle: "",
    slides: normalized.length ? normalized : [{ type: "content", title, subtitle: "", bullets: [], statCards: [] }],
  };
}
