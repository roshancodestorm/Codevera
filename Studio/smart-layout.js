// ── Smart layout: adaptive reflow rules engine ──────────────────────
// Beautiful.ai-style: measure what's ON the page, then choose and apply the
// best-fitting recipe — content drives layout, not a fixed template.
// Pure functions over page objects; loaded after layout-engine.js.
//
//  reflowAiPages(pages)      → AI-generated pages get rebuilt via recipes
//                              chosen from live content density.
//  tidyManualPage(page)      → grid snap, margin align, overlap resolve,
//                              even distribution for hand-made pages.
//  autoReflowAll(pages)      → one click: every page gets its best layout.

const SL_GRID = 8;
const SL_MARGIN = 56;

function slMeasureContent(slide) {
  const bullets = (slide?.bullets || []).filter(Boolean);
  const statCards = slide?.statCards || [];
  const words = bullets.join(" ").split(/\s+/).filter(Boolean).length;
  return {
    bulletCount: bullets.length,
    avgBulletWords: bullets.length ? words / bullets.length : 0,
    hasPhoto: Boolean(slide?._detail?.generatedImage || slide?.photo || slide?.image),
    hasChart: Boolean(slide?._detail?.chart),
    statCount: statCards.length + ((slide?._detail?.statCards) || []).length,
    isQuote: String(slide?.type) === "quote",
    isCover: ["cover", "thankyou", "section"].includes(String(slide?.type)),
    density: words + bullets.length * 6 + statCards.length * 10,
  };
}

function slChooseRecipe(type, m) {
  if (m.isQuote) return "quote";
  if (m.isCover) return m.hasPhoto ? "cover-photo" : "cover-center";
  if (type === "agenda") return "agenda";
  if (type === "table") return "table";
  if (type === "roadmap") return "roadmap";
  if (type === "comparison") return "comparison";
  if (type === "timeline") return "roadmap";
  if (m.hasChart && m.statCount >= 1) return "metrics";
  if (m.statCount >= 3) return "stats-grid";
  if (m.statCount >= 1 && m.bulletCount <= 2) return "stats-grid";
  if (m.hasChart) return "metrics";
  if (m.hasPhoto && m.bulletCount <= 4 && m.avgBulletWords <= 14) return "bullets-photo";
  if (m.bulletCount >= 4 || m.avgBulletWords > 14) return "bullets-cards";
  if (m.density < 24) return "chips-highlight";
  if (m.hasPhoto) return "bullets-photo";
  return "content";
}

function slThemeFromPage(page, fallbackTheme) {
  const stored = page?.aiRender?.theme;
  if (stored && Array.isArray(stored.palette)) return stored;
  return fallbackTheme || { palette: ["#0f172a", "#ffffff", "#7f56d9", "#22d3ee"], muted: "#64748b", dark: false };
}

// Rebuild AI pages using content-driven recipe selection. Manual edits to
// non-text elements are respected by only rebuilding pages that carry aiRender.
function reflowAiPages(pages, preferredRecipeForIndex = {}) {
  const rebuilt = pages.map((page, index) => {
    const spec = page && page.aiRender;
    if (!spec || !spec.slide) return page;
    const m = slMeasureContent(spec.slide);
    const wanted = preferredRecipeForIndex[index] || spec.preferredRecipe || "";
    const recipe = wanted && LAYOUT_RECIPES[wanted] ? wanted : slChooseRecipe(spec.slide.type, m);
    const theme = slThemeFromPage(page);
    let fresh;
    try {
      fresh = renderBlockSlide(spec.slide, spec.index ?? index, spec.total ?? pages.length, theme, spec.deck, recipe);
    } catch {
      return page;
    }
    // Preserve user-touched fields.
    fresh.id = page.id;
    fresh.name = page.name;
    if (page.speakerNote) fresh.speakerNote = page.speakerNote;
    fresh.meta = page.meta;
    fresh.aiRender.preferredRecipe = recipe;
    return fresh;
  });
  return rebuilt;
}

// Grid tidy for manually built pages: snap, align margins, resolve overlaps.
function tidyManualPage(page) {
  if (!page || !Array.isArray(page.elements) || page.aiRender) return page;
  const W = 960;
  const placed = [];

  const overlapsAny = (el) => placed.some((other) =>
    el.x < other.x + other.w + 8 && el.x + el.w + 8 > other.x &&
    el.y < other.y + other.h + 8 && el.y + el.h + 8 > other.y);

  page.elements.forEach((el) => {
    if (el.x == null) return;
    if (el.type === "rect" && Number(el.w) >= W - 2) return; // full-bleed bg
    // Snap near-edges to margins.
    if (Math.abs(el.x - SL_MARGIN) < 18) el.x = SL_MARGIN;
    if (Math.abs(el.x + Number(el.w || 0) - (W - SL_MARGIN)) < 18) el.x = W - SL_MARGIN - Number(el.w);
    el.x = Math.round(el.x / SL_GRID) * SL_GRID;
    el.y = Math.round(el.y / SL_GRID) * SL_GRID;
    // Push overlapping elements down until clear.
    let guard = 0;
    while (overlapsAny(el) && guard < 40) {
      el.y += 16;
      guard += 1;
    }
    placed.push(el);
  });

  // Even vertical rhythm for same-size rows of text elements.
  const texts = page.elements.filter((el) => el.type === "text").sort((a, b) => a.y - b.y);
  for (let i = 1; i < texts.length; i += 1) {
    const gap = texts[i].y - (texts[i - 1].y + texts[i - 1].h);
    if (gap > 26 && gap < 60) texts[i].y = texts[i - 1].y + texts[i - 1].h + 24;
  }
  return page;
}

function autoReflowAll(pages) {
  const withAiRebuilt = reflowAiPages(pages);
  return withAiRebuilt.map((page) => tidyManualPage(page));
}
