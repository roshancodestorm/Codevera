// ── AI deck schema + validation core ─────────────────────────────────
// Loaded before app.js. No DOM/state access at load time — only runtime
// calls into app.js helpers (cleanAiText, makeLocalDeckPlan) guarded by
// typeof checks so this can also run standalone in Node for tests.

const AI_SLIDE_TYPES = [
  "cover",
  "agenda",
  "profile",
  "definition",
  "timeline",
  "process",
  "stats",
  "impact",
  "challenges",
  "problem",
  "solution",
  "market",
  "strategy",
  "metrics",
  "roadmap",
  "comparison",
  "quote",
  "summary",
  "thankyou",
  "content",
  "table",
  "section",
];

const AI_SLIDE_TYPE_SET = new Set(AI_SLIDE_TYPES);

const AI_CHART_KINDS = ["bar", "line", "donut", "ranking", "pills"];

function sanitizeDeckText(value, max = 200) {
  let out = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!out || out === "undefined" || out === "null") return "";
  if (typeof cleanAiText === "function") out = cleanAiText(out, max);
  if (out.length > max) out = `${out.slice(0, max)}…`;
  return out;
}

function sanitizeDeckStringList(value, maxItems, maxLen) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => sanitizeDeckText(item, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

// Strategy (Step 1) validation — clamps the model's plan of attack.
function normalizeStrategy(raw) {
  const issues = [];
  const strategy = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const out = {
    topicCategory: sanitizeDeckText(strategy.topicCategory, 40) || "general",
    visualStyle: sanitizeDeckText(strategy.visualStyle, 40) || "",
    paletteChoice: sanitizeDeckText(strategy.paletteChoice, 24) || "",
    primaryAccentColor: /^#[0-9a-fA-F]{3,8}$/.test(String(strategy.primaryAccentColor || "")) ? strategy.primaryAccentColor : "",
    backgroundDark: Boolean(strategy.backgroundDark),
    templateFamily: sanitizeDeckText(strategy.templateFamily, 40) || "",
    toneVoice: sanitizeDeckText(strategy.toneVoice, 40) || "",
    keyMessages: sanitizeDeckStringList(strategy.keyMessages, 4, 120),
    slideTypes: sanitizeDeckStringList(strategy.slideTypes, 14, 40).filter((type) => AI_SLIDE_TYPE_SET.has(type.toLowerCase())),
    visualKeywords: sanitizeDeckStringList(strategy.visualKeywords, 8, 40),
    storyArc: sanitizeDeckStringList(strategy.storyArc, 14, 120),
  };
  if (!out.topicCategory) issues.push("strategy: missing topicCategory");
  if (!strategy.accent && !out.primaryAccentColor) issues.push("strategy: no accent color");
  if (out.keyMessages.length < 2) issues.push("strategy: fewer than 2 key messages");
  return { strategy: out, issues };
}

// Slide-level content detail (Step 3 writer output).
function normalizeSlideDetail(raw) {
  const detail = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const statCards = Array.isArray(detail.statCards)
    ? detail.statCards
        .map((card) => {
          const value = sanitizeDeckText(card?.value, 14);
          const label = sanitizeDeckText(card?.label, 32);
          if (!value && !label) return null;
          return { value: value || "—", label: label || "Key point", note: sanitizeDeckText(card?.note, 60) };
        })
        .filter(Boolean)
        .slice(0, 4)
    : [];
  const quote = detail.quote && typeof detail.quote === "object"
    ? { text: sanitizeDeckText(detail.quote.text, 260), source: sanitizeDeckText(detail.quote.source, 90) }
    : null;
  let chart = null;
  if (detail.chart && typeof detail.chart === "object") {
    const kind = AI_CHART_KINDS.includes(detail.chart.kind) ? detail.chart.kind : "bar";
    const labels = sanitizeDeckStringList(detail.chart.labels, 7, 40);
    const values = Array.isArray(detail.chart.values)
      ? detail.chart.values.map(Number).filter((n) => Number.isFinite(n)).slice(0, 7)
      : [];
    if (labels.length && values.length) {
      chart = {
        kind,
        labels,
        values: values.slice(0, labels.length),
        unit: sanitizeDeckText(detail.chart.unit, 10),
        note: sanitizeDeckText(detail.chart.note, 80),
      };
      if (chart.values.length < chart.labels.length) chart.labels = chart.labels.slice(0, chart.values.length);
    }
  }
  const imagePrompt = sanitizeDeckText(detail.imagePrompt, 500);
  return {
    kicker: sanitizeDeckText(detail.kicker, 44),
    title: sanitizeDeckText(detail.title, 90),
    subtitle: sanitizeDeckText(detail.subtitle, 170),
    bullets: detail.bullets !== undefined
      ? sanitizeDeckStringList(detail.bullets, 5, 160)
      : sanitizeDeckStringList(raw && raw.slideBullets, 5, 160),
    chips: sanitizeDeckStringList(detail.chips, 6, 26),
    statCards,
    quote,
    chart,
    imagePrompt,
    highlight: sanitizeDeckText(detail.highlight, 70),
    speakerNote: sanitizeDeckText(detail.speakerNote, 180),
  };
}

// Full deck plan validation + repair (Step 2 output).
// Returns { deck, issues } — deck.slides is always a valid,
// slideCount-sized, sanitized array. Falls back through the app's local
// generator when the model output is unusable.
function normalizeDeckPlan(raw, topic, slideCount, tone) {
  const issues = [];
  const count = Math.max(3, Math.min(12, Number(slideCount) || 8));
  let deck = null;
  if (typeof raw === "string") {
    try {
      deck = JSON.parse(raw);
    } catch {
      issues.push("deck: raw plan was a string but not valid JSON");
    }
  } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    deck = raw;
  } else {
    issues.push("deck: raw plan was not an object");
  }

  if (!deck || !Array.isArray(deck.slides)) {
    if (typeof makeLocalDeckPlan === "function") {
      issues.push("deck: invalid model output — used local fallback generator");
      return { deck: makeLocalDeckPlan(topic, count, tone), issues };
    }
    issues.push("deck: invalid model output and no fallback available");
    return { deck: { title: sanitizeDeckText(topic, 72) || "Presentation", subtitle: "", slides: [] }, issues };
  }

  const title = sanitizeDeckText(deck.title, 72) || sanitizeDeckText(topic, 72) || "Untitled deck";
  const subtitle = sanitizeDeckText(deck.subtitle, 150);
  const templateMood = sanitizeDeckText(deck.templateMood, 40);
  const paletteHint = sanitizeDeckText(deck.paletteHint, 24);

  let slides = deck.slides.map((slide) => {
    const type = sanitizeDeckText(slide?.type, 40).toLowerCase();
    if (!AI_SLIDE_TYPE_SET.has(type)) {
      issues.push(`deck: slide type "${type || "(empty)"}" not in whitelist — treated as content`);
    }
    return {
      type: AI_SLIDE_TYPE_SET.has(type) ? type : "content",
      title: sanitizeDeckText(slide?.title, 90) || "Untitled slide",
      subtitle: sanitizeDeckText(slide?.subtitle, 170),
      bullets: sanitizeDeckStringList(slide?.bullets, 5, 160),
      labels: sanitizeDeckStringList(slide?.labels, 6, 40),
      metric: sanitizeDeckText(slide?.metric, 28),
      note: sanitizeDeckText(slide?.note, 170),
      kicker: sanitizeDeckText(slide?.kicker, 44),
      ...(slide && slide._detail && typeof slide._detail === "object" ? { _detail: slide._detail } : {}),
    };
  });

  if (!slides.length) {
    issues.push("deck: model returned zero slides");
    slides = [{ type: "cover", title, subtitle, bullets: [], labels: [], metric: "", note: "" }];
  }

  if (slides.length > count) {
    issues.push(`deck: model returned ${slides.length} slides — trimmed to ${count}`);
    slides = slides.slice(0, count);
  }

  const hasCover = slides.some((slide) => slide.type === "cover");
  if (!hasCover) {
    issues.push("deck: no cover slide — inserted one");
    slides.unshift({ type: "cover", title, subtitle, bullets: [], labels: [], metric: "", note: "" });
  }
  while (slides.length < count) {
    slides.push({
      type: "summary",
      title: "Key Takeaways",
      subtitle: "",
      bullets: ["Focus on the core message", "Prioritize execution milestones", "Track measurable outcomes"],
      labels: [],
      metric: "",
      note: "",
    });
  }

  return {
    deck: { title, subtitle, templateMood, paletteHint, slides: slides.slice(0, count), _issues: issues },
    issues,
  };
}

function withTimeout(promise, ms, label = "operation") {
  let timer = null;
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}