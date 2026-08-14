// ── Block-based auto-layout engine ─────────────────────────────────
// Loaded before app.js. Runtime-only deps on app.js helpers:
// aiText, aiTitleText, shape, image, makeBlankPage, cleanAiText.
//
// Model: every slide is normalized into BLOCKS; layouts are RECIPES
// that place blocks on the 960x540 canvas. Recipes auto-fit text and
// adapt to the theme (dark/light, palette). Same content can be
// re-rendered with a different recipe — that is what powers "Remix".

const LAYOUT_CANVAS = { w: 960, h: 540 };

function fitFont(text, w, h, maxSize, minSize = 12, lineHeight = 1.12) {
  if (!text) return maxSize;
  let size = maxSize;
  while (size > minSize) {
    const charsPerLine = Math.max(1, Math.floor(w / (size * 0.52)));
    const lines = Math.max(1, Math.ceil(String(text).length / charsPerLine));
    if (lines * size * lineHeight <= h + size * 0.35) break;
    size -= 1;
  }
  return size;
}

function lineCount(text, w, size) {
  if (!text) return 1;
  const charsPerLine = Math.max(1, Math.floor(w / (size * 0.52)));
  return Math.max(1, Math.ceil(String(text).length / charsPerLine));
}

// ── Text / element factories (theme-aware) ─────────────────────────

function LText(value, x, y, w, h, opts = {}) {
  const clean = cleanAiText(String(value ?? ""), opts.max || 300);
  const size = fitFont(clean, w, h, opts.maxSize || 40, opts.minSize || 11, opts.lineHeight || 1.12);
  const el = aiText(x, y, w, h, clean, size, opts.weight || 700, opts.color || "#111827", opts.lineHeight || 1.12);
  if (opts.family) el.fontFamily = opts.family;
  if (opts.align) el.align = opts.align;
  return el;
}

function LTitle(value, x, y, w, color, maxSize = 40) {
  const clean = cleanAiText(value, 88);
  const size = fitFont(clean, w, 70, maxSize, 24, 1.06);
  const el = aiText(x, y, w, 70, clean, size, 900, color, 1.06);
  el.fontFamily = "Montserrat";
  return el;
}

function LKicker(text, x, y, color, maxSize = 13) {
  const value = String(text || "").toUpperCase();
  const w = Math.min(360, value.length * 9 + 34);
  return [
    shape("pill", x, y, w, 30, "rgba(127,86,217,0.14)", 1),
    LText(value, x + 17, y + 6, w - 34, 18, { maxSize, weight: 800, color, family: "Inter" }),
  ];
}

function LPill(x, y, w, h, fill, label, color, maxSize = 13) {
  return [shape("pill", x, y, w, h, fill, 1), LText(label, x + 14, y + (h - 18) / 2, w - 28, 16, { maxSize, weight: 800, color })];
}

function LChip(value, x, y, w, fill, color, maxSize = 12) {
  return [shape("pill", x, y, w, 30, fill, 1), LText(value, x + 14, y + 6, w - 28, 18, { maxSize, weight: 700, color })];
}

function LStatCard(x, y, w, h, card, colors) {
  const elements = [shape("rect", x, y, w, h, colors.bg, 1), shape("rect", x, y, w, 6, colors.accent, 1)];
  const value = String(card.value || "—");
  const valueSize = fitFont(value, w - 24, 44, 36, 20, 1);
  elements.push(LText(value, x + 12, y + 22, w - 24, 44, { maxSize: valueSize, minSize: 20, weight: 900, color: colors.value }));
  elements.push(LText(card.label, x + 12, y + 66, w - 24, 34, { maxSize: 15, minSize: 11, weight: 650, color: colors.label, lineHeight: 1.15 }));
  return elements;
}

function LFooter(page, index, total, theme) {
  page.elements.push(LText(`${index + 1}/${total}`, 854, 502, 56, 20, { maxSize: 12, minSize: 12, weight: 700, color: theme.muted }));
  return page;
}

function LPhoto(x, y, w, h, src, overlay) {
  const elements = [image(x, y, w, h, src || "")];
  if (overlay) elements.push(shape("rect", x, y, w, h, overlay, 1));
  return elements;
}

// ── Block model ────────────────────────────────────────────────────
// Any truthy block guides recipe selection; recipes tolerate absence.

function blocksFromSlide(slide, deck, theme) {
  const photo = slide.generatedImage || theme.photos?.[0] || theme.photo;
  return {
    kicker: String(slide.kicker || ""),
    title: String(slide.title || (deck && deck.title) || "Untitled slide"),
    subtitle: String(slide.subtitle || ""),
    bullets: Array.isArray(slide.bullets) ? slide.bullets.filter(Boolean).slice(0, 5) : [],
    statCards: Array.isArray(slide.statCards) ? slide.statCards.filter(Boolean).slice(0, 4) : [],
    quote: slide.quote && typeof slide.quote === "object" ? slide.quote : null,
    chart: slide.chart && typeof slide.chart === "object" && Array.isArray(slide.chart.values) && slide.chart.values.length ? slide.chart : null,
    chips: Array.isArray(slide.chips) ? slide.chips.filter(Boolean).slice(0, 5) : [],
    highlight: String(slide.highlight || ""),
    metric: String(slide.metric || ""),
    labels: Array.isArray(slide.labels) ? slide.labels.filter(Boolean).slice(0, 6) : [],
    note: String(slide.note || ""),
    photo,
    footerLabel: String(theme.footerLabel || ""),
  };
}

function recipeScores(slide, blocks, theme) {
  const type = String(slide.type || "").toLowerCase();
  const scores = [];
  const add = (recipe, score) => scores.push({ recipe, score });
  if (type === "cover" || type === "thankyou") {
    add("cover-photo", blocks.photo ? 10 + (blocks.kicker ? 1 : 0) : 5);
    add("cover-center", type === "thankyou" ? 12 : 7);
  }
  if (type === "agenda") add("agenda", 10);
  if (type === "quote" || blocks.quote) add("quote", blocks.quote ? 12 : 8);
  if (blocks.chart && type === "stats") add("chart-bar", 12);
  if ((type === "stats" || type === "impact") && blocks.statCards.length >= 2) add("stats-grid", 11 + blocks.statCards.length);
  if ((type === "metrics" || type === "market") && blocks.statCards.length >= 2) add("stats-grid", 10);
  if (type === "metrics" || type === "market") add("metrics", 9);
  if (type === "roadmap") add("roadmap", 10);
  if (type === "comparison") add("comparison", 10);
  if (type === "table") add("table", 10);
  if ((blocks.kicker || blocks.highlight) && blocks.chips.length && !blocks.bullets.length) add("chips-highlight", 8);
  if (blocks.chart && type !== "stats") add("chart-bar", 7);
  if (blocks.statCards.length >= 2) add("bullets-cards", 6);
  if (blocks.bullets.length) add("bullets-photo", blocks.photo ? 7 : 5);
  add("content", 2);
  return scores;
}

function pickRecipe(slide, blocks, theme, preferred = "") {
  if (preferred) return preferred;
  const scores = recipeScores(slide, blocks, theme);
  scores.sort((a, b) => b.score - a.score);
  return scores[0] ? scores[0].recipe : "content";
}

function recipeNamesFor(slide, blocks, theme) {
  return recipeScores(slide, blocks, theme)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.recipe)
    .filter((name, i, all) => all.indexOf(name) === i);
}

// ── Recipes (each returns a filled page) ───────────────────────────

const LAYOUT_RECIPES = {
  "cover-photo"(blocks, ctx) {
    const { theme, index, total, slide } = ctx;
    const [ink, paper, accent, pop] = theme.palette;
    const isDark = theme.dark;
    const page = makeBlankPage(blocks.title);
    page.background = isDark ? ink : paper;
    page.elements = [shape("rect", 0, 0, LAYOUT_CANVAS.w, LAYOUT_CANVAS.h, isDark ? ink : paper, 1)];
    page.elements.push(...LPhoto(520, 0, 440, 540, blocks.photo, isDark ? "rgba(8,10,20,0.42)" : "rgba(15,23,42,0.30)"));
    if (blocks.kicker) page.elements.push(...LKicker(blocks.kicker, 66, 96, accent, 13));
    page.elements.push(LTitle(blocks.title, 64, 138, 430, isDark ? "#ffffff" : ink, 50));
    if (blocks.subtitle) {
      page.elements.push(LText(blocks.subtitle, 66, 250, 420, 96, { maxSize: 23, minSize: 15, weight: 500, color: isDark ? "#c6d2e3" : "#475569", lineHeight: 1.2 }));
    } else if (blocks.highlight) {
      page.elements.push(LText(blocks.highlight, 66, 250, 420, 96, { maxSize: 23, minSize: 15, weight: 600, color: accent, lineHeight: 1.2 }));
    }
    page.elements.push(shape("rect", 66, 362, 250, 12, accent, 1));
    if (blocks.footerLabel) page.elements.push(LText(blocks.footerLabel, 66, 402, 380, 24, { maxSize: 14, minSize: 12, weight: 800, color: theme.muted }));
    page.elements.push(shape("circle", 386, 348, 96, 96, pop, 0.92));
    return LFooter(page, index, total, theme);
  },

  "cover-center"(blocks, ctx) {
    const { theme, index, total } = ctx;
    const [ink, paper, accent, pop] = theme.palette;
    const isDark = theme.dark;
    const page = makeBlankPage(blocks.title);
    page.background = isDark ? ink : paper;
    page.elements = [shape("rect", 0, 0, LAYOUT_CANVAS.w, LAYOUT_CANVAS.h, isDark ? ink : paper, 1)];
    page.elements.push(shape("circle", -110, -130, 300, 300, accent, 0.14));
    page.elements.push(shape("circle", 810, 340, 230, 230, pop, 0.16));
    if (blocks.kicker) {
      const kickerEls = LKicker(blocks.kicker, 392, 132, accent, 13);
      kickerEls[0].x = 388;
      kickerEls[0].w = 200;
      kickerEls[1].x = 405;
      kickerEls[1].w = 170;
      page.elements.push(...kickerEls);
    }
    page.elements.push(LTitle(blocks.title, 130, 180, 700, isDark ? "#ffffff" : ink, 56));
    page.elements.push(shape("rect", 350, 288, 260, 8, accent, 1));
    if (blocks.subtitle) {
      page.elements.push(LText(blocks.subtitle, 220, 320, 520, 72, { maxSize: 22, minSize: 15, weight: 500, color: isDark ? "#c6d2e3" : "#475569", lineHeight: 1.25, align: "center" }));
    }
    if (blocks.chips.length) {
      const chipList = blocks.chips.slice(0, 3);
      let offset = chipList.reduce((sum, chip, i) => sum + Math.min(220, chip.length * 8 + 40) + 12, 0);
      let chipX = 480 - offset / 2;
      chipList.forEach((chip) => {
        const w = Math.min(220, chip.length * 8 + 40);
        page.elements.push(...LChip(chip, chipX, 418, w, isDark ? "#1e293b" : "#eef2ff", accent, 12));
        chipX += w + 12;
      });
    }
    return LFooter(page, index, total, theme);
  },

  agenda(blocks, ctx) {
    const { theme, index, total, slide } = ctx;
    const [ink, paper, accent, pop] = theme.palette;
    const isDark = theme.dark;
    const page = makeBlankPage(blocks.title);
    page.background = isDark ? ink : paper;
    page.elements = [shape("rect", 0, 0, LAYOUT_CANVAS.w, LAYOUT_CANVAS.h, isDark ? ink : paper, 1)];
    page.elements.push(LTitle(blocks.title, 54, 40, 720, isDark ? "#ffffff" : ink, 42));
    if (blocks.subtitle) page.elements.push(LText(blocks.subtitle, 56, 108, 560, 30, { maxSize: 17, minSize: 13, weight: 500, color: theme.muted }));
    const items = (blocks.bullets.length ? blocks.bullets : ["Context", "Solution", "Execution", "Metrics"]).slice(0, 5);
    items.forEach((item, i) => {
      const y = 138 + i * 72;
      page.elements.push(shape("rect", 80, y, 730, 52, i % 2 ? (isDark ? "#1c2740" : "#ffffff") : (isDark ? "#2a3754" : "#eef2ff"), 1));
      page.elements.push(shape("circle", 104, y + 11, 30, 30, accent, 1));
      page.elements.push(LText(String(i + 1), 113, y + 17, 22, 18, { maxSize: 14, minSize: 13, weight: 900, color: "#ffffff" }));
      page.elements.push(LText(item, 154, y + 11, 620, 36, { maxSize: 21, minSize: 14, weight: 700, color: isDark ? "#e2eaf5" : ink, lineHeight: 1.15 }));
    });
    return LFooter(page, index, total, theme);
  },

  "bullets-photo"(blocks, ctx) {
    const { theme, index, total, slide } = ctx;
    const [ink, paper, accent, pop] = theme.palette;
    const isDark = theme.dark;
    const page = makeBlankPage(blocks.title);
    page.background = isDark ? ink : paper;
    page.elements = [shape("rect", 0, 0, LAYOUT_CANVAS.w, LAYOUT_CANVAS.h, isDark ? ink : paper, 1)];
    page.elements.push(LTitle(blocks.title, 56, 40, 740, isDark ? "#ffffff" : ink, 40));
    if (blocks.kicker) page.elements.push(LText(blocks.kicker.toUpperCase(), 56, 102, 320, 20, { maxSize: 12, minSize: 12, weight: 800, color: accent }));
    page.elements.push(shape("rect", 58, 118, 220, 8, accent, 1));
    const bullets = (blocks.bullets.length ? blocks.bullets : [blocks.subtitle || blocks.note || "A focused point for this slide"]).slice(0, 4);
    const yStart = 160;
    const rowH = bullets.length > 3 ? 60 : 68;
    bullets.forEach((item, i) => {
      const y = yStart + i * rowH;
      page.elements.push(shape("circle", 78, y + 4, 18, 18, accent, 1));
      page.elements.push(LText(item, 114, y - 4, 480, 58, { maxSize: 20, minSize: 14, weight: 600, color: isDark ? "#dbe4f0" : "#334155", lineHeight: 1.2 }));
    });
    if (blocks.chips.length) {
      let chipX = 114;
      blocks.chips.slice(0, 4).forEach((chip) => {
        const w = Math.min(200, chip.length * 8 + 40);
        page.elements.push(...LChip(chip, chipX, 484, w, isDark ? "#1c2740" : "#eef2ff", accent, 11));
        chipX += w + 8;
      });
    }
    page.elements.push(...LPhoto(646, 140, 240, 290, blocks.photo, null));
    page.elements.push(shape("rect", 640, 452, 220, 42, pop, 0.94));
    page.elements.push(LText(blocks.metric || `${index + 1}/${total}`, 654, 462, 180, 20, { maxSize: 15, minSize: 13, weight: 900, color: isDark ? ink : "#ffffff" }));
    return page;
  },

  "bullets-cards"(blocks, ctx) {
    const { theme, index, total, slide } = ctx;
    const [ink, paper, accent, pop] = theme.palette;
    const isDark = theme.dark;
    const page = makeBlankPage(blocks.title);
    page.background = isDark ? ink : paper;
    page.elements = [shape("rect", 0, 0, LAYOUT_CANVAS.w, LAYOUT_CANVAS.h, isDark ? ink : paper, 1)];
    page.elements.push(LTitle(blocks.title, 56, 40, 740, isDark ? "#ffffff" : ink, 40));
    if (blocks.kicker) page.elements.push(LText(blocks.kicker.toUpperCase(), 56, 102, 320, 20, { maxSize: 12, minSize: 12, weight: 800, color: accent }));
    page.elements.push(shape("rect", 58, 118, 220, 8, accent, 1));
    const bullets = (blocks.bullets.length ? blocks.bullets : [blocks.subtitle || "A focused point for this slide"]).slice(0, 3);
    bullets.forEach((item, i) => {
      const y = 156 + i * 78;
      page.elements.push(shape("circle", 78, y + 4, 18, 18, accent, 1));
      page.elements.push(LText(item, 114, y - 4, 450, 62, { maxSize: 19, minSize: 14, weight: 600, color: isDark ? "#dbe4f0" : "#334155", lineHeight: 1.2 }));
    });
    const cards = blocks.statCards.slice(0, 4);
    cards.forEach((card, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      page.elements.push(...LStatCard(638 + col * 162, 148 + row * 132, 148, 116, card, { bg: isDark ? "#1c2740" : "#ffffff", accent: [accent, pop, "#38bdf8", "#22c55e"][i % 4], value: isDark ? "#ffffff" : ink, label: theme.muted }));
    });
    if (blocks.chips.length) {
      let chipX = 114;
      blocks.chips.slice(0, 4).forEach((chip) => {
        const w = Math.min(200, chip.length * 8 + 40);
        page.elements.push(...LChip(chip, chipX, 482, w, isDark ? "#1c2740" : "#eef2ff", accent, 11));
        chipX += w + 8;
      });
    }
    if (!cards.length) page.elements.push(...LPhoto(646, 148, 248, 300, blocks.photo, null));
    return page;
  },

  "stats-grid"(blocks, ctx) {
    const { theme, index, total, slide } = ctx;
    const [ink, paper, accent, pop] = theme.palette;
    const isDark = theme.dark;
    const page = makeBlankPage(blocks.title);
    page.background = isDark ? ink : paper;
    page.elements = [shape("rect", 0, 0, LAYOUT_CANVAS.w, LAYOUT_CANVAS.h, isDark ? ink : paper, 1)];
    page.elements.push(LTitle(blocks.title, 56, 36, 760, isDark ? "#ffffff" : ink, 38));
    if (blocks.subtitle) page.elements.push(LText(blocks.subtitle, 58, 96, 640, 26, { maxSize: 16, minSize: 12, weight: 500, color: theme.muted }));
    const cards = blocks.statCards.slice(0, 4);
    cards.forEach((card, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      page.elements.push(...LStatCard(72 + col * 400, 150 + row * 168, 380, 148, card, { bg: isDark ? "#1c2740" : "#ffffff", accent: [accent, pop, "#38bdf8", "#22c55e"][i % 4], value: isDark ? "#ffffff" : ink, label: theme.muted }));
    });
    const y = 150 + (cards.length > 2 ? 2 : cards.length) * 168;
    if (blocks.highlight) {
      page.elements.push(shape("rect", 72, y + 6, 780, 54, accent, 0.16));
      page.elements.push(LText(blocks.highlight, 92, y + 13, 720, 40, { maxSize: 18, minSize: 13, weight: 700, color: isDark ? "#ffffff" : ink, lineHeight: 1.2 }));
    }
    return LFooter(page, index, total, theme);
  },

  metrics(blocks, ctx) {
    const { theme, index, total, slide } = ctx;
    const [ink, paper, accent, pop] = theme.palette;
    const isDark = theme.dark;
    const page = makeBlankPage(blocks.title);
    page.background = isDark ? ink : paper;
    page.elements = [shape("rect", 0, 0, LAYOUT_CANVAS.w, LAYOUT_CANVAS.h, isDark ? ink : paper, 1)];
    page.elements.push(LTitle(blocks.title, 54, 38, 720, isDark ? "#ffffff" : ink, 38));
    page.elements.push(LText(blocks.subtitle || blocks.highlight || "Signals and practical proof points", 58, 104, 620, 30, { maxSize: 17, minSize: 13, weight: 500, color: theme.muted }));
    const colors = [accent, pop, "#38bdf8", "#22c55e", "#f59e0b", "#a855f7"];
    const values = blocks.chart ? blocks.chart.values.slice(0, 8) : [35, 55, 72, 98, 118, 170, 146, 62].slice(0, 8);
    const max = Math.max(...values, 1);
    const barW = 46;
    const gap = 62;
    const baseY = 396;
    const barH = 210;
    values.forEach((value, i) => {
      const h = Math.max(14, Math.round((value / max) * barH));
      page.elements.push(shape("rect", 96 + i * gap, baseY - h, barW, h, colors[i % colors.length], 0.95));
      page.elements.push(LText(String(value), 96 + i * gap, baseY - h - 22, barW, 18, { maxSize: 13, minSize: 11, weight: 800, color: theme.muted, align: "center" }));
      if (blocks.chart && blocks.chart.labels[i]) {
        page.elements.push(LText(blocks.chart.labels[i], 92 + i * gap, baseY + 10, 58, 26, { maxSize: 11, minSize: 10, weight: 600, color: theme.muted, lineHeight: 1.1 }));
      }
    });
    page.elements.push(shape("rect", 640, 140, 220, 200, accent, 0.97));
    page.elements.push(LText(blocks.metric || (blocks.chart ? `${Math.round(values.reduce((a, b) => a + b, 0) / values.length)}` : "Key signal"), 664, 176, 176, 56, { maxSize: 44, minSize: 26, weight: 900, color: "#ffffff" }));
    page.elements.push(LText(blocks.chart && blocks.chart.unit ? `avg ${blocks.chart.unit}` : "focus area", 666, 240, 170, 30, { maxSize: 15, minSize: 12, weight: 700, color: "#ffffff" }));
    if (blocks.chart && blocks.chart.note) page.elements.push(LText(blocks.chart.note, 664, 278, 176, 52, { maxSize: 12, minSize: 10, weight: 500, color: "#e8eef7", lineHeight: 1.2 }));
    page.elements.push(LText(blocks.bullets[0] || "Use practical signals to understand progress and improve decisions.", 96, 448, 500, 40, { maxSize: 15, minSize: 12, weight: 500, color: isDark ? "#b9c6d9" : "#475569", lineHeight: 1.3 }));
    return LFooter(page, index, total, theme);
  },

  quote(blocks, ctx) {
    const { theme, index, total, slide } = ctx;
    const [ink, paper, accent, pop] = theme.palette;
    const isDark = theme.dark;
    const page = makeBlankPage(blocks.title);
    page.background = isDark ? ink : paper;
    page.elements = [shape("rect", 0, 0, LAYOUT_CANVAS.w, LAYOUT_CANVAS.h, isDark ? ink : paper, 1)];
    page.elements.push(LTitle(blocks.title, 56, 38, 730, isDark ? "#ffffff" : ink, 34));
    const quoteText = blocks.quote ? blocks.quote.text : blocks.subtitle || blocks.note || "Great things are built one step at a time.";
    page.elements.push(LText("“", 60, 88, 120, 110, { maxSize: 110, minSize: 110, weight: 900, color: accent, family: "Georgia" }));
    page.elements.push(LText(quoteText, 72, 168, 640, 200, { maxSize: 34, minSize: 20, weight: 650, color: isDark ? "#e5edf7" : ink, lineHeight: 1.24 }));
    page.elements.push(shape("rect", 72, 392, 120, 8, accent, 1));
    const source = blocks.quote && blocks.quote.source ? blocks.quote.source : blocks.note;
    if (source) page.elements.push(LText(source, 72, 416, 500, 34, { maxSize: 19, minSize: 14, weight: 700, color: theme.muted }));
    if (blocks.chips.length) {
      let chipX = 72;
      blocks.chips.slice(0, 3).forEach((chip) => {
        const w = Math.min(200, chip.length * 8 + 40);
        page.elements.push(...LChip(chip, chipX, 476, w, isDark ? "#1c2740" : "#eef2ff", accent, 11));
        chipX += w + 8;
      });
    }
    page.elements.push(shape("circle", 700, 84, 140, 140, accent, 0.16));
    page.elements.push(shape("circle", 756, 140, 52, 52, pop, 0.9));
    page.elements.push(LText("“", 770, 162, 20, 22, { maxSize: 22, minSize: 22, weight: 900, color: "#ffffff", family: "Georgia" }));
    return page;
  },

"chart-bar"(blocks, ctx) {
    const { theme, index, total } = ctx;
    const [ink, paper, accent, pop] = theme.palette;
    const isDark = theme.dark;
    const page = makeBlankPage(blocks.title);
    page.background = isDark ? ink : paper;
    page.elements = [shape("rect", 0, 0, LAYOUT_CANVAS.w, LAYOUT_CANVAS.h, isDark ? ink : paper, 1)];
    page.elements.push(LTitle(blocks.title, 54, 36, 720, isDark ? "#ffffff" : ink, 38));
    page.elements.push(LText(blocks.subtitle || blocks.note || "What the data shows", 56, 100, 560, 28, { maxSize: 16, minSize: 12, weight: 500, color: theme.muted }));
    const chart = blocks.chart;
    const colors = [accent, pop, "#38bdf8", "#22c55e", "#f59e0b", "#a855f7"];
    const max = Math.max(...chart.values, 1);
    const chartX = 96;
    const chartW = 480;
    const baseY = 420;
    const barH = 260;
    const n = chart.values.length;
    const step = (chartW - 40) / n;
    const barW = Math.max(26, step - 22);
    chart.values.forEach((value, i) => {
      const h = Math.max(16, Math.round((value / max) * barH));
      const x = chartX + i * step + (step - barW) / 2;
      page.elements.push(shape("rect", x, baseY - h, barW, h, colors[i % colors.length], 0.96));
      page.elements.push(LText(String(value), x - 8, baseY - h - 22, barW + 16, 18, { maxSize: 13, minSize: 11, weight: 800, color: isDark ? "#dbe4f0" : ink, align: "center" }));
      if (chart.labels[i]) page.elements.push(LText(chart.labels[i], x - 8, baseY + 8, barW + 16, 34, { maxSize: 11, minSize: 9, weight: 600, color: theme.muted, lineHeight: 1.1, align: "center" }));
    });
    page.elements.push(shape("rect", 620, 130, 250, 250, isDark ? "#1c2740" : "#ffffff", 1));
    const chartTotal = chart.values.reduce((a, b) => a + b, 0);
    page.elements.push(LText(String(chartTotal) + (chart.unit ? ` ${chart.unit}` : ""), 646, 160, 200, 56, { maxSize: 38, minSize: 26, weight: 900, color: accent }));
    page.elements.push(LText(chart.note || "Total across categories", 648, 224, 200, 56, { maxSize: 14, minSize: 11, weight: 600, color: theme.muted, lineHeight: 1.3 }));
    if (blocks.highlight) page.elements.push(LText(blocks.highlight, 646, 300, 200, 60, { maxSize: 14, minSize: 11, weight: 700, color: isDark ? "#ffffff" : ink, lineHeight: 1.3 }));
    return LFooter(page, index, total, theme);
  },

  roadmap(blocks, ctx) {
    const { theme, index, total, slide } = ctx;
    const [ink, paper, accent, pop] = theme.palette;
    const isDark = theme.dark;
    const page = makeBlankPage(blocks.title);
    page.background = isDark ? ink : paper;
    page.elements = [shape("rect", 0, 0, LAYOUT_CANVAS.w, LAYOUT_CANVAS.h, isDark ? ink : paper, 1)];
    page.elements.push(LTitle(blocks.title, 54, 38, 700, isDark ? "#ffffff" : ink, 40));
    const items = (blocks.bullets.length ? blocks.bullets : ["Discover", "Build", "Launch", "Scale", "Lead"]).slice(0, 5);
    const colors = [accent, pop, "#38bdf8", "#22c55e", "#6366f1"];
    items.forEach((item, i) => {
      const x = 90 + i * 168;
      page.elements.push(shape("circle", x, 210, 86, 86, colors[i % colors.length], 1));
      page.elements.push(LText(`0${i + 1}`, x + 31, 240, 28, 22, { maxSize: 18, minSize: 16, weight: 900, color: "#ffffff" }));
      page.elements.push(LText(item, x - 24, 322, 136, 74, { maxSize: 18, minSize: 12, weight: 750, color: isDark ? "#dbe4f0" : ink, lineHeight: 1.2 }));
      if (i < items.length - 1) page.elements.push(shape("rect", x + 92, 252, 70, 5, theme.muted, 0.5));
    });
    if (blocks.highlight) {
      page.elements.push(shape("rect", 90, 432, 700, 48, accent, 0.16));
      page.elements.push(LText(blocks.highlight, 112, 442, 640, 32, { maxSize: 17, minSize: 13, weight: 700, color: isDark ? "#ffffff" : ink, lineHeight: 1.2 }));
    }
    return LFooter(page, index, total, theme);
  },

  comparison(blocks, ctx) {
    const { theme, index, total, slide } = ctx;
    const [ink, paper, accent, pop] = theme.palette;
    const isDark = theme.dark;
    const page = makeBlankPage(blocks.title);
    page.background = isDark ? ink : paper;
    page.elements = [shape("rect", 0, 0, LAYOUT_CANVAS.w, LAYOUT_CANVAS.h, isDark ? ink : paper, 1)];
    page.elements.push(LTitle(blocks.title, 54, 38, 760, isDark ? "#ffffff" : ink, 40));
    page.elements.push(shape("rect", 88, 128, 360, 300, isDark ? "#1c2740" : "#ffffff", 0.94));
    page.elements.push(shape("rect", 512, 128, 360, 300, accent, 0.96));
    const beforeLabel = blocks.labels[0] || "Current";
    const afterLabel = blocks.labels[1] || "Better Direction";
    page.elements.push(LText(beforeLabel, 122, 156, 240, 36, { maxSize: 26, minSize: 18, weight: 900, color: isDark ? "#ffffff" : ink }));
    page.elements.push(LText(afterLabel, 546, 156, 240, 36, { maxSize: 24, minSize: 18, weight: 900, color: "#ffffff" }));
    const items = (blocks.bullets.length ? blocks.bullets : ["Clearer story", "Faster execution", "Better measurement"]).slice(0, 4);
    items.forEach((item, i) => {
      const y = 214 + i * 46;
      page.elements.push(LText(`- ${item}`, 122, y, 280, 42, { maxSize: 16, minSize: 12, weight: 600, color: theme.muted, lineHeight: 1.2 }));
      page.elements.push(LText(`+ ${item}`, 546, y, 280, 42, { maxSize: 16, minSize: 12, weight: 750, color: "#ffffff", lineHeight: 1.2 }));
    });
    if (blocks.highlight) {
      page.elements.push(shape("rect", 88, 452, 784, 44, pop, 0.9));
      page.elements.push(LText(blocks.highlight, 110, 462, 730, 26, { maxSize: 16, minSize: 13, weight: 700, color: isDark ? ink : "#ffffff", lineHeight: 1.2 }));
    }
    return LFooter(page, index, total, theme);
  },

  table(blocks, ctx) {
    const { theme, index, total, slide } = ctx;
    const [ink, paper, accent, pop] = theme.palette;
    const isDark = theme.dark;
    const page = makeBlankPage(blocks.title);
    page.background = isDark ? ink : paper;
    page.elements = [shape("rect", 0, 0, LAYOUT_CANVAS.w, LAYOUT_CANVAS.h, isDark ? ink : paper, 1)];
    page.elements.push(LTitle(blocks.title, 54, 36, 760, isDark ? "#ffffff" : ink, 38));
    const labels = (blocks.labels.length ? blocks.labels : ["One", "Two", "Three", "Four"]).slice(0, 6);
    const cellW = 780 / labels.length;
    const rowY = 150;
    labels.forEach((label, i) => {
      const x = 90 + i * cellW;
      page.elements.push(shape("rect", x, rowY, cellW - 14, 110, i % 2 ? (isDark ? "#1c2740" : "#ffffff") : (isDark ? "#2a3754" : "#eef2ff"), 1));
      page.elements.push(shape("rect", x, rowY, cellW - 14, 6, [accent, pop, "#38bdf8", "#22c55e", "#f59e0b", "#a855f7"][i % 6], 1));
      page.elements.push(LText(label, x + 14, rowY + 26, cellW - 42, 34, { maxSize: 18, minSize: 13, weight: 800, color: isDark ? "#ffffff" : ink, align: "center" }));
    });
    const rows = (blocks.bullets.length ? blocks.bullets : []).slice(0, 3);
    rows.forEach((row, i) => {
      const y = 292 + i * 52;
      page.elements.push(shape("rect", 90, y, 780, 40, i % 2 ? (isDark ? "#1c2740" : "#ffffff") : (isDark ? "#22304a" : "#f1f5f9"), 1));
      page.elements.push(LText(row, 108, y + 8, 740, 26, { maxSize: 15, minSize: 12, weight: 600, color: isDark ? "#dbe4f0" : "#334155", lineHeight: 1.2 }));
    });
    return LFooter(page, index, total, theme);
  },

  "chips-highlight"(blocks, ctx) {
    const { theme, index, total, slide } = ctx;
    const [ink, paper, accent, pop] = theme.palette;
    const isDark = theme.dark;
    const page = makeBlankPage(blocks.title);
    page.background = isDark ? ink : paper;
    page.elements = [shape("rect", 0, 0, LAYOUT_CANVAS.w, LAYOUT_CANVAS.h, isDark ? ink : paper, 1)];
    page.elements.push(LTitle(blocks.title, 56, 60, 800, isDark ? "#ffffff" : ink, 42));
    page.elements.push(shape("rect", 56, 152, 220, 8, accent, 1));
    if (blocks.highlight) {
      page.elements.push(shape("rect", 56, 196, 848, 110, isDark ? "#1c2740" : "#ffffff", 1));
      page.elements.push(shape("rect", 56, 196, 10, 110, accent, 1));
      page.elements.push(LText(blocks.highlight, 92, 218, 780, 72, { maxSize: 26, minSize: 16, weight: 700, color: isDark ? "#ffffff" : ink, lineHeight: 1.25 }));
    }
    const chips = blocks.chips.slice(0, 5);
    const chipGap = 24;
    const sizes = [];
    let totalW = 0;
    chips.forEach((chip) => {
      const w = Math.min(260, chip.length * 8.5 + 48);
      sizes.push(w);
      totalW += w + chipGap;
    });
    let x = 480 - totalW / 2;
    chips.forEach((chip, i) => {
      page.elements.push(...LChip(chip, x, 368, sizes[i], isDark ? "#1c2740" : "#eef2ff", accent, 13));
      x += sizes[i] + chipGap;
    });
    if (blocks.subtitle) page.elements.push(LText(blocks.subtitle, 220, 444, 520, 34, { maxSize: 16, minSize: 12, weight: 500, color: theme.muted, align: "center" }));
    return LFooter(page, index, total, theme);
  },

  content(blocks, ctx) {
    const { theme, index, total, slide } = ctx;
    const [ink, paper, accent, pop] = theme.palette;
    const isDark = theme.dark;
    const page = makeBlankPage(blocks.title);
    page.background = isDark ? ink : paper;
    page.elements = [shape("rect", 0, 0, LAYOUT_CANVAS.w, LAYOUT_CANVAS.h, isDark ? ink : paper, 1)];
    page.elements.push(LTitle(blocks.title, 56, 40, 740, isDark ? "#ffffff" : ink, 40));
    page.elements.push(shape("rect", 58, 112, 220, 8, accent, 1));
    if (blocks.kicker) page.elements.push(LText(blocks.kicker.toUpperCase(), 296, 96, 320, 20, { maxSize: 12, minSize: 12, weight: 800, color: accent }));
    const bullets = (blocks.bullets.length ? blocks.bullets : [blocks.subtitle || blocks.note || "A focused point for this slide"]).slice(0, 4);
    const yStart = 168;
    const rowH = bullets.length > 3 ? 64 : 70;
    bullets.forEach((item, i) => {
      const y = yStart + i * rowH;
      page.elements.push(shape("circle", 78, y + 4, 18, 18, accent, 1));
      page.elements.push(LText(item, 114, y - 4, 500, 58, { maxSize: 20, minSize: 14, weight: 600, color: isDark ? "#dbe4f0" : "#334155", lineHeight: 1.2 }));
    });
    page.elements.push(...LPhoto(668, 148, 220, 250, blocks.photo, null));
    page.elements.push(shape("rect", 640, 424, 180, 40, pop, 0.94));
    page.elements.push(LText(blocks.metric || `${index + 1}/${total}`, 656, 434, 150, 18, { maxSize: 14, minSize: 12, weight: 900, color: isDark ? ink : "#ffffff" }));
    if (Array.isArray(blocks.chips) && blocks.chips.length) {
      let chipX = 114;
      blocks.chips.slice(0, 4).forEach((chip) => {
        const w = Math.min(200, chip.length * 8 + 40);
        page.elements.push(...LChip(chip, chipX, 476, w, isDark ? "#1c2740" : "#eef2ff", accent, 11));
        chipX += w + 8;
      });
    }
    return page;
  },
};

// ── Public entry ───────────────────────────────────────────────────

function renderBlockSlide(slide, index, total, theme, deck, preferredRecipe = "") {
  const blocks = blocksFromSlide(slide, deck, theme);
  const recipe = pickRecipe(slide, blocks, theme, preferredRecipe);
  const ctx = { theme, index, total, slide, deck };
  const page = LAYOUT_RECIPES[recipe](blocks, ctx);
  if (page && page.elements) page.aiRender = { slide, index, total, theme, deck, recipe };
  return page;
}