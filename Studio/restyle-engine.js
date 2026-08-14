// ── Brand restyle engine ───────────────────────────────────────────
// Pure functions, no DOM access. Loaded before app.js.
// Provides: brandPromptBlock, brandThemeOverrides, placeBrandLogos,
// restyleDeckFonts, restyleDeckToBrand, brandKitActive.

function relativeLuminance(hex) {
  const m = String(hex || "").match(/^#?([0-9a-f]{6})/i);
  if (!m) return 0.5;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
  const lin = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function nearestBrandColor(hex, lockedColors) {
  const target = String(hex || "").trim();
  const m = target.match(/^#([0-9a-f]{6})$/i);
  if (!m) return hex;
  const t = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  let best = hex;
  let bestDist = Infinity;
  Object.values(lockedColors || {}).forEach((c) => {
    const cm = String(c).match(/^#([0-9a-f]{6})$/i);
    if (!cm) return;
    const cc = [0, 2, 4].map((i) => parseInt(cm[1].slice(i, i + 2), 16));
    const dr = t[0] - cc[0];
    const dg = t[1] - cc[1];
    const db = t[2] - cc[2];
    const dist = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  });
  return best;
}

function brandPaletteFromKit(brandKit) {
  const c = (brandKit && brandKit.lockedColors) || {};
  const paper = c.background || "#ffffff";
  const textLum = relativeLuminance(c.text);
  const ink = textLum > 0.55 ? c.primary || "#2563eb" : c.text || "#1e293b";
  return [ink, paper, c.primary || "#2563eb", c.secondary || c.accent || "#64748b"];
}

function brandThemeOverrides(brandKit) {
  const palette = brandPaletteFromKit(brandKit);
  const dark = relativeLuminance(palette[1]) < 0.35;
  const muted = (brandKit && brandKit.lockedColors && brandKit.lockedColors.textMuted) || (dark ? "#b8c2d0" : "#64748b");
  return { palette, dark, muted };
}

function brandKitActive(brandKit) {
  return Boolean(brandKit && (brandKit.colorLockEnabled || brandKit.fontLockEnabled));
}

function brandPromptBlock(brandKit) {
  if (!brandKit) return "";
  const parts = [];
  if (brandKit.colorLockEnabled && brandKit.lockedColors) {
    const c = brandKit.lockedColors;
    parts.push(`BRAND PALETTE (use these exact hex colors for accents, chips, stat cards and backgrounds):
- primary accent: ${c.primary || "#2563eb"}
- secondary accent: ${c.secondary || "#64748b"}
- accent highlight: ${c.accent || "#f59e0b"}
- background: ${c.background || "#ffffff"}
- surface: ${c.surface || "#f8fafc"}
- text: ${c.text || "#1e293b"}
- muted text: ${c.textMuted || "#64748b"}`);
  }
  if (brandKit.fontLockEnabled) {
    parts.push(`BRAND FONTS (headings use "${brandKit.primaryFont || "Inter"}", body uses "${brandKit.secondaryFont || "Inter"}"):`);
  }
  return parts.join("\n");
}

function elementsOverlap(a, b, pad = 8) {
  if (!a || !b || a.x == null || a.w == null || b.x == null || b.w == null) return false;
  return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
}

function placeBrandLogos(pages, brandKit) {
  if (!brandKit || !brandKit.logo || !Array.isArray(pages)) return pages;
  const w = brandKit.logoWidth || 120;
  const h = brandKit.logoHeight || 40;
  const spots = [
    { x: 24, y: 20 },
    { x: 960 - w - 24, y: 20 },
  ];
  pages.forEach((page) => {
    if (!page || !Array.isArray(page.elements)) return;
    if (page.elements.some((el) => el.type === "image" && el.src === brandKit.logo)) return;
    const spot = spots.find((s) => !page.elements.some((el) => elementsOverlap(s, el)));
    if (!spot) return;
    page.elements.push({
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "logo-" + Math.random().toString(36).slice(2),
      type: "image",
      x: spot.x,
      y: spot.y,
      w,
      h,
      src: brandKit.logo,
    });
  });
  return pages;
}

function restyleDeckFonts(pages, brandKit) {
  const primary = (brandKit && brandKit.primaryFont) || "Inter";
  const secondary = (brandKit && brandKit.secondaryFont) || "Inter";
  pages.forEach((page) => {
    if (!page || !Array.isArray(page.elements)) return;
    page.elements.forEach((el) => {
      if (el.type === "text") el.fontFamily = (el.fontWeight || 400) >= 700 ? primary : secondary;
    });
  });
  return pages;
}

function restyleDeckToBrand(pages, brandKit) {
  const cloned = JSON.parse(JSON.stringify(pages));
  const c = (brandKit && brandKit.lockedColors) || {};
  const primary = (brandKit && brandKit.primaryFont) || "Inter";
  const secondary = (brandKit && brandKit.secondaryFont) || "Inter";
  const keepLightText = (el) => el.type === "text" && relativeLuminance(el.color) > 0.85;
  cloned.forEach((page) => {
    if (!page) return;
    if (typeof page.background === "string" && /^#[0-9a-f]{6}$/i.test(page.background)) {
      page.background = nearestBrandColor(page.background, c);
    }
    if (!Array.isArray(page.elements)) return;
    page.elements.forEach((el) => {
      if (!el) return;
      if (el.type === "text") {
        if (!keepLightText(el) && el.color) el.color = nearestBrandColor(el.color, c);
        el.fontFamily = (el.fontWeight || 400) >= 700 ? primary : secondary;
      } else if (el.type === "icon") {
        if (el.color) el.color = nearestBrandColor(el.color, c);
      } else if (el.type === "shapeAsset" || !["image", "video"].includes(el.type)) {
        if (el.fill) el.fill = nearestBrandColor(el.fill, c);
      }
    });
  });
  return placeBrandLogos(cloned, brandKit);
}