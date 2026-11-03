// Pro-features unit smoke test: import structuring, deck-chat ops, format
// conversion, theme application and adaptive reflow. Run: node tests/pro-features-test.cjs
const fs = require("fs");
const path = require("path");

// Minimal app.js stubs needed by layout-engine / smart-layout.
global.cleanAiText = (value, max = 300) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
global.aiText = (x, y, w, h, text, fontSize = 16, fontWeight = 400, color = "#111827", lineHeight = 1.16) =>
  ({ id: "t-" + Math.random().toString(36).slice(2), type: "text", x, y, w, h, text, fontSize, fontWeight, color, lineHeight });
global.image = (x, y, w, h, src) => ({ id: "i-" + Math.random().toString(36).slice(2), type: "image", x, y, w, h, src });
global.makeBlankPage = (name) => ({ id: "p-" + Math.random().toString(36).slice(2), name: name || "", background: "#ffffff", elements: [] });
// shape() is defined inside app.js; provide it before layout-engine loads.
global.shape = (type, x, y, w, h, fill, opacity = 1) => ({ id: "s-" + Math.random().toString(36).slice(2), type, x, y, w, h, fill, opacity });

const src = (name) => fs.readFileSync(path.join(__dirname, "..", name), "utf8");
eval(src("ai-core.js"));
eval(src("restyle-engine.js"));
// Bridge the pack's const into module scope (consts stay inside eval scope).
globalThis.__THEMES__ = null;
eval(src("themes.js") + "\n;globalThis.__THEMES__ = THEMES;");
const THEMES = globalThis.__THEMES__;
eval(src("import-engine.js"));
eval(src("deck-chat.js"));
eval(src("layout-engine.js"));
eval(src("smart-layout.js"));
eval(src("formats.js"));

let failures = 0;
function check(label, condition, extra = "") {
  if (condition) console.log(`  ok  ${label}`);
  else { failures += 1; console.log(`FAIL  ${label} ${extra}`); }
}

// ── 1. Import structuring ─────────────────────────────────────────────
const sampleText = `Urban Farming Revolution
Urban farming is transforming how cities feed themselves.

Benefits for Cities
- Fresher produce with zero transport miles
- Community jobs and training
• Green roofs reduce building heat

Yields grew by 42% across pilot programs in year one.
Costs stayed under $12 per square meter.

Challenges Ahead
Water access and zoning rules remain the biggest blockers for new sites.`;

const outline = structureOutlineFromText(sampleText, 10);
check("outline: title detected", outline.title === "Urban Farming Revolution", JSON.stringify(outline.title));
check("outline: >=3 slides", outline.slides.length >= 3, `got ${outline.slides.length}`);
check("outline: bullets captured", outline.slides.some((s) => s.bullets.length >= 2));
check("outline: stat line captured", outline.slides.some((s) => s.statCards.length >= 1));

// ── 2. Deck chat ops ─────────────────────────────────────────────────
const pagesIn = [
  { id: "a", elements: [
    { id: "t1", type: "text", x: 0, y: 0, w: 400, h: 40, text: "Old Title One", fontSize: 36, fontWeight: 900 },
    { id: "t2", type: "text", x: 0, y: 60, w: 400, h: 24, text: "Bullet A1", fontSize: 16, fontWeight: 500 },
    { id: "t3", type: "text", x: 0, y: 90, w: 400, h: 24, text: "Bullet A2", fontSize: 16, fontWeight: 500 },
  ]},
  { id: "b", elements: [{ id: "t4", type: "text", x: 0, y: 0, w: 400, h: 40, text: "Keep Me", fontSize: 30, fontWeight: 700 }] },
];
const rawOps = JSON.stringify({
  ops: [
    { index: 0, title: "New Title", bullets: ["First", "Second"], speakerNote: "Say this" },
    { index: 99, title: "Out of range — must be dropped" },
    { index: 1 },
  ],
  summary: "Retitled slide 1",
});
const clamped = clampDeckEditOps(rawOps, pagesIn.length);
check("chat: invalid ops filtered", clamped.ops.length === 1, JSON.stringify(clamped.ops));
const applied = applyDeckOpsToPages(pagesIn, clamped.ops);
check("chat: title applied", applied.pages[0].elements.find((e) => e.id === "t1").text === "New Title");
check("chat: bullets applied", applied.pages[0].elements.find((e) => e.id === "t2").text === "First");
check("chat: note applied + page b untouched", applied.pages[0].speakerNote === "Say this" && applied.pages[1].elements[0].text === "Keep Me");
check("chat: original not mutated", pagesIn[0].elements[0].text === "Old Title One");

// ── 3. Format conversion ─────────────────────────────────────────────
const deck = [{ id: "c1", background: "#fff", elements: [
  { id: "e", type: "text", x: 56, y: 40, w: 700, h: 60, text: "Big Title", fontSize: 44, fontWeight: 900 },
  { id: "f", type: "text", x: 56, y: 130, w: 620, h: 120, text: "Body text block", fontSize: 18, fontWeight: 400 },
]}];
const social = convertPagesForFormat(deck, "social");
check("social: canvas 1080x1080", social[0].w === 1080 && social[0].h === 1080);
check("social: element scaled+offset", social[0].elements[0].x > 56 && social[0].meta.kind === "social");
const card = convertPagesForFormat(deck, "card");
check("card: single column at margin", card[0].elements.every((el) => el.x === 56), JSON.stringify(card[0].elements.map((e) => e.x)));
check("card: variable height computed", estimatePageHeight(card[0], "card") >= 420);
const doc = convertPagesForFormat(deck, "document");
check("document: taller than wide spec", doc[0].w === 816 && doc[0].h >= 1056);

// ── 4. Themes ────────────────────────────────────────────────────────
check("themes: pack has 30 entries", THEMES.length === 30, `got ${THEMES.length}`);
const themed = applyThemeToPages(pagesIn.map((p) => ({ ...p, background: "#ffffff" })), themeById("neon-grid"));
check("themes: dark theme applied to light bg", themed[0].background !== "#ffffff");
const headingEl = themed[0].elements.find((e) => e.id === "t1");
check("themes: heading font swapped", headingEl.fontFamily === themeById("neon-grid").headingFont);

// ── 5. Smart reflow ─────────────────────────────────────────────────
const themedObj = themeById("midnight-board");
const aiSlide = {
  type: "stats",
  title: "Growth",
  subtitle: "",
  bullets: ["Revenue doubled", "Retention improved", "Costs fell"],
  labels: [],
  metric: "",
  note: "",
  _detail: { statCards: [{ value: "42%", label: "growth" }, { value: "$12", label: "cost" }, { value: "3x", label: "speed" }] },
};
const builtPage = renderBlockSlide(aiSlide, 0, 3, { palette: [themedObj.ink, themedObj.paper, themedObj.accent, themedObj.pop], muted: themedObj.muted, dark: false }, null);
const reflowed = reflowAiPages([builtPage]);
check("reflow: stats slide → stats-grid recipe", reflowed[0].aiRender.recipe === "stats-grid", reflowed[0].aiRender?.recipe);
const quoteSlide = { type: "quote", title: "Quote", bullets: [], labels: [], metric: "", note: "" };
const quotePage = renderBlockSlide(quoteSlide, 1, 3, { palette: ["#111", "#fff", "#7f56d9", "#22d3ee"], muted: "#666", dark: false }, null);
const reflowQuote = reflowAiPages([quotePage])[0];
check("reflow: quote stays quote recipe", reflowQuote.aiRender.recipe === "quote", reflowQuote.aiRender?.recipe);
const manual = tidyManualPage({ id: "m", elements: [
  { type: "text", x: 63, y: 33, w: 300, h: 30, text: "Snap me" },
]});
check("tidy: grid snap applied", manual.elements[0].x % 8 === 0 && manual.elements[0].y % 8 === 0, `${manual.elements[0].x},${manual.elements[0].y}`);

console.log(failures ? `\n${failures} FAILURES` : "\nALL PASS");
process.exit(failures ? 1 : 0);
