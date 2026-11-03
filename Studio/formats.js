// ── Design formats: classic slides, Gamma-style cards, documents, social ──
// Pure functions, no DOM access. Loaded before app.js.
//
// - presentation: fixed 960x540 slides (default).
// - card:         960 wide, variable height — content grows, page height
//                 adapts (Gamma's card model).
// - document:     816 wide continuous pages that merge into one flowing doc.
// - social:       1080x1080 square posts.
//
// Pages carry meta.kind so render/export can treat them correctly.

const FORMAT_SPECS = {
  presentation: { label: "Classic deck", w: 960, h: 540, icon: "▭" },
  card: { label: "Card deck", w: 960, h: 540, minHeight: 420, icon: "▤" },
  document: { label: "Document", w: 816, h: 1056, icon: "☰" },
  social: { label: "Social post", w: 1080, h: 1080, icon: "▢" },
};

function formatSpec(kind) {
  return FORMAT_SPECS[kind] || FORMAT_SPECS.presentation;
}

function estimatePageHeight(page, kind) {
  if (!page || !Array.isArray(page.elements)) return formatSpec(kind).h;
  let bottom = 0;
  page.elements.forEach((el) => {
    const elBottom = Number(el.y || 0) + Number(el.h || 0);
    if (elBottom > bottom) bottom = elBottom;
  });
  return Math.max(formatSpec(kind).minHeight || formatSpec(kind).h, Math.ceil(bottom + 48));
}

// Reflow a deck between formats. presentation→social scales the canvas;
// →card/document re-lays elements into a single centered column.
function convertPagesForFormat(pages, targetKind) {
  const target = formatSpec(targetKind);
  const cloned = JSON.parse(JSON.stringify(pages || []));

  cloned.forEach((page) => {
    page.meta = { ...(page.meta || {}), kind: targetKind };
    if (targetKind === "presentation") {
      page.w = target.w; page.h = target.h;
      return;
    }
    if (targetKind === "social") {
      const scale = Math.min(target.w / 960, target.h / 540);
      const offsetX = (target.w - 960 * scale) / 2;
      const offsetY = (target.h - 540 * scale) / 2;
      page.w = target.w; page.h = target.h;
      page.elements.forEach((el) => {
        el.x = Math.round(Number(el.x || 0) * scale + offsetX);
        el.y = Math.round(Number(el.y || 0) * scale + offsetY);
        el.w = Math.round(Number(el.w || 0) * scale);
        el.h = Math.round(Number(el.h || 0) * scale);
        if (el.fontSize) el.fontSize = Math.round(el.fontSize * scale);
      });
      page.background = page.background || "#f8fafc";
      return;
    }
    // card / document: stack into one readable column with margins.
    const width = target.w;
    const marginX = targetKind === "document" ? 72 : 56;
    const columnWidth = width - marginX * 2;
    let y = targetKind === "document" ? 64 : 48;
    const sorted = [...page.elements].sort((a, b) => (a.y - b.y) || (a.x - b.x));
    const titleLike = sorted.filter((el) => el.type === "text" && Number(el.fontWeight || 400) >= 700 && Number(el.fontSize || 0) >= 24);
    const bodyEls = sorted.filter((el) => !titleLike.includes(el));
    [...titleLike, ...bodyEls].forEach((el) => {
      const scaleW = Math.min(1, columnWidth / Math.max(1, Number(el.w || 1)));
      const newW = Math.round(Math.min(columnWidth, Number(el.w || 0) * scaleW));
      const newH = Math.max(18, Math.round(Number(el.h || 20) * scaleW));
      if (el.type === "text") {
        el.x = marginX;
        el.y = y;
        el.w = newW;
        el.h = newH;
        y += newH + (Number(el.fontWeight || 400) >= 700 ? 14 : 8);
      } else {
        el.x = marginX;
        el.y = y;
        el.w = Math.min(newW, columnWidth);
        el.h = Math.round((Number(el.h || 60)) * Math.min(1, columnWidth / Math.max(1, Number(el.w || 1))));
        y += el.h + 12;
      }
    });
    y += 40;
    page.w = width;
    page.h = targetKind === "document" ? Math.max(target.h, Math.ceil(y + 64)) : Math.max(target.minHeight || 420, Math.ceil(y));
  });
  return cloned;
}

// Continuous HTML for document mode (also used by "Export DOC-style HTML").
function buildDocumentHtml(projectName, pages) {
  const escape = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = pages.map((page) => {
    const texts = (page.elements || [])
      .filter((el) => el.type === "text" && String(el.text || "").trim())
      .sort((a, b) => (a.y - b.y) || (a.x - b.x));
    return texts.map((el) => {
      const size = Number(el.fontSize || 16);
      const heading = Number(el.fontWeight || 400) >= 700 && size >= 22;
      if (heading) return `<h2>${escape(el.text)}</h2>`;
      if (size <= 15) return `<p class="small">${escape(el.text)}</p>`;
      return `<p>${escape(el.text)}</p>`;
    }).join("\n");
  }).join("\n<hr />\n");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(projectName)}</title>
<style>body{max-width:760px;margin:48px auto;padding:0 24px;font:16px/1.65 Georgia,serif;color:#1e293b}
h1{font-size:34px;margin:0 0 6px}.small{color:#64748b;font-size:13px}h2{margin-top:36px;border-bottom:1px solid #e2e8f0;padding-bottom:8px}
hr{border:0;border-top:1px dashed #cbd5e1;margin:32px 0}</style></head>
<body><h1>${escape(projectName)}</h1>${body}</body></html>`;
}
