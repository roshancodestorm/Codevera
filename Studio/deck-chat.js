// ── Deck chat: AI edits the WHOLE deck from one instruction ─────────
// Loaded before app.js. Depends on app.js runtime helpers (callConfiguredModel,
// parseAiJson, sanitizeDeckText) guarded for standalone Node test use.
//
// One agent call receives a compact summary of every slide and the user's
// instruction ("make it punchier", "translate to Hindi", "add risk slide")
// and returns validated per-slide operations that app.js applies atomically.

const DECK_CHAT_TIMEOUT_MS = 60000;

const DECK_CHAT_QUICK_ACTIONS = [
  { id: "punchy", label: "Make it punchier", instruction: "Rewrite all titles and bullets to be shorter, punchier and more confident. Cut filler words." },
  { id: "shorten", label: "Shorten everything", instruction: "Cut every bullet to at most 12 words and every subtitle to one short line. Keep meaning." },
  { id: "expand", label: "Expand detail", instruction: "Add useful specific detail to each slide's bullets (4-5 bullets each). Do not invent hard numbers." },
  { id: "formal", label: "Formal tone", instruction: "Rewrite all text in a formal, professional business tone." },
  { id: "casual", label: "Casual tone", instruction: "Rewrite all text in a friendly conversational tone." },
  { id: "hindi", label: "Translate → Hindi", instruction: "Translate all slide text (titles, subtitles, bullets, chips) to natural Hindi. Keep proper nouns." },
  { id: "english", label: "Translate → English", instruction: "Translate all slide text (titles, subtitles, bullets, chips) to natural English. Keep proper nouns." },
];

function summarizePageForChat(page, index) {
  const texts = (page.elements || [])
    .filter((el) => el.type === "text" && String(el.text || "").trim())
    .sort((a, b) => (a.y - b.y) || (a.x - b.x));
  const title = (texts[0]?.text || page.name || `Slide ${index + 1}`).slice(0, 90);
  const rest = texts.slice(1).map((el) => String(el.text).slice(0, 140));
  return {
    index,
    title,
    subtitle: rest[0] && rest[0].length > 30 ? rest[0] : "",
    bullets: rest.filter((t, i) => !(i === 0 && t === rest[0])).slice(0, 6),
  };
}

function clampDeckEditOps(raw, pageCount) {
  const parsed = typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
  const ops = Array.isArray(parsed?.ops) ? parsed.ops : [];
  const clean = [];
  ops.forEach((op) => {
    if (!op || typeof op !== "object") return;
    const index = Number(op.index);
    if (!Number.isInteger(index) || index < 0 || index >= pageCount) return;
    const patch = {};
    if (typeof op.title === "string" && op.title.trim()) patch.title = op.title.trim().slice(0, 120);
    if (Array.isArray(op.bullets)) {
      const bullets = op.bullets.map((b) => String(b ?? "").trim().slice(0, 200)).filter(Boolean).slice(0, 8);
      if (bullets.length) patch.bullets = bullets;
    }
    if (typeof op.speakerNote === "string" && op.speakerNote.trim()) patch.speakerNote = op.speakerNote.trim().slice(0, 300);
    if (Object.keys(patch).length) clean.push({ index, ...patch });
  });
  return { ops: clean, summary: String(parsed?.summary || "").slice(0, 240) };
}

// Applies ops by replacing the page's text elements in reading order:
// first text element becomes the title, subsequent ones take bullets.
function applyDeckOpsToPages(pages, ops) {
  const cloned = JSON.parse(JSON.stringify(pages));
  let changed = 0;
  ops.forEach((op) => {
    const page = cloned[op.index];
    if (!page || !Array.isArray(page.elements)) return;
    const texts = page.elements
      .filter((el) => el.type === "text" && String(el.text || "").trim())
      .sort((a, b) => (a.y - b.y) || (a.x - b.x));
    if (!texts.length) return;
    if (op.title) texts[0].text = op.title;
    if (op.bullets && texts.length > 1) {
      // Distribute new bullet strings over remaining text elements; when
      // there are more bullets than elements, merge extras into the last one.
      const targets = texts.slice(1);
      targets.forEach((el, i) => {
        if (i < op.bullets.length) el.text = op.bullets[i];
      });
      if (op.bullets.length > targets.length) {
        targets[targets.length - 1].text += ` ${op.bullets.slice(targets.length).join(" ")}`;
      }
    }
    if (op.speakerNote) page.speakerNote = op.speakerNote;
    changed += 1;
  });
  return { pages: cloned, changed };
}

async function agentDeckEdit(model, ctx, instruction, pages) {
  const summary = pages.slice(0, 14).map((page, index) => summarizePageForChat(page, index));
  const system = [
    "You are a senior presentation editor. You receive the full outline of a deck and ONE user instruction.",
    "Return minimal edit operations that apply the instruction across relevant slides.",
    "Never invent hard numbers, dates or named sources not present in the deck.",
    "Respond ONLY with valid JSON, no markdown fences.",
  ].join(" ");
  const user = `DECK OUTLINE:
${summary.map((slide) => `${slide.index}: TITLE="${slide.title}"${slide.subtitle ? ` SUB="${slide.subtitle}"` : ""}${slide.bullets.length ? `\n   BULLETS: ${JSON.stringify(slide.bullets)}` : ""}`).join("\n")}

USER INSTRUCTION: "${instruction}"

Rules:
- Only include slides you actually change. Use exact indexes from the outline.
- "bullets" replaces that slide's body lines entirely — send the FULL final list (3-6 items).
- Keep language consistent with the instruction (e.g., translate means translate ALL touched slides).
Return exactly:
{ "ops": [ { "index": 0, "title": "...", "bullets": ["..."], "speakerNote": "..." } ], "summary": "one line describing what you changed" }`;
  try {
    const result = await withTimeout(
      callConfiguredModel(model, [
        { role: "system", content: system },
        { role: "user", content: user },
      ], { maxTokens: 1800, json: true }),
      DECK_CHAT_TIMEOUT_MS,
      "deck edit",
    );
    if (!result.ok) return { ok: false, error: result.error };
    const { ops, summary: changeSummary } = clampDeckEditOps(result.content, pages.length);
    if (!ops.length) return { ok: false, error: "The model returned no usable edits — try a more specific instruction." };
    return { ok: true, ops, summary: changeSummary };
  } catch (error) {
    return { ok: false, error: error.message || "Deck edit failed" };
  }
}
