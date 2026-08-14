// ── AI agents: slide writer + regeneration ──────────────────────────
// Runtime-only functions. Depends on app.js helpers (callConfiguredModel,
// parseAiJson) which exist by the time these are invoked.

const AI_WRITER_TIMEOUT_MS = 45000;
const AI_REGENERATE_TIMEOUT_MS = 45000;

function aiAgentContext(ctx) {
  return `TOPIC: "${ctx.topic}"
TONE: ${ctx.tone || "Professional"}
DECK TITLE: ${ctx.deckTitle || ctx.topic}
${ctx.strategy ? `DESIGN STRATEGY (fixed, follow it):
- Topic category: ${ctx.strategy.topicCategory || "general"}
- Tone voice: ${ctx.strategy.toneVoice || ""}
- Key messages: ${(ctx.strategy.keyMessages || []).join("; ")}
- Visual keywords: ${(ctx.strategy.visualKeywords || []).join(", ")}
` : ""}${ctx.brand && brandKitActive(ctx.brand) ? `BRAND KIT (design tokens — use these exact colors/fonts in your output):
${brandPromptBlock(ctx.brand)}
` : ""}${ctx.previousTitles && ctx.previousTitles.length ? `PREVIOUS SLIDES: ${ctx.previousTitles.join(" → ")}\n` : ""}`;
}

// Step 3 — writes full, slide-specific content for one slide using the
// plan's outline. Keeps the { type, title } from the outline, enriches
// everything else. Returns { ok, detail } where detail is normalized.
async function agentSlideWriter(model, ctx, slidePlan, index) {
  const type = String(slidePlan?.type || "content");
  const planTitle = String(slidePlan?.title || "").slice(0, 90);
  const planBullets = Array.isArray(slidePlan?.bullets) ? slidePlan.bullets.slice(0, 5) : [];
  const system = [
    "You are a senior presentation copywriter for a Canva-level deck generator.",
    "Write clear, specific, useful content. Never invent hard numbers, dates, market sizes, percentages, or named sources that the topic does not provide.",
    "If numeric facts would be fabricated, use qualitative language instead.",
    "Return ONLY valid JSON. No markdown fences, no commentary.",
  ].join(" ");
  const user = `${aiAgentContext(ctx)}
Now write the content for slide ${index + 1}, type "${type}"${planTitle ? `, current title "${planTitle}"` : ""}.
${planBullets.length ? `Outline bullets (improve or replace, keep the intent): ${planBullets.map((b) => `"${b}"`).join(", ")}` : ""}
Rules:
- titles: short, concrete, no placeholders.
- bullets: 3 to 5 specific sentences; each must be useful on its own.
- statCards: only if the topic itself gives a defensible figure (population, share, date, count). Otherwise return [].
- chart: only if plain numeric data exists for the topic (e.g., crop seasons, survey shares, budget split). Otherwise omit.
- quote: only if a real, well-known voice plausibly said something about this topic. Otherwise null.
- chips: 3 to 6 short labels for the slide (max 4 words each).
- imagePrompt: a vivid, specific prompt for an AI image generator (Stable Diffusion / Midjourney style) that would make a stunning, on-topic visual for THIS slide. Include style keywords (e.g., "cinematic lighting, 8k, detailed"). Return "" if no image fits.
- speakerNote: one sentence a presenter could say aloud.
Return exactly this JSON:
{
  "kicker": "short uppercase-style label, max 5 words",
  "title": "improved slide title",
  "subtitle": "optional one-line positioning",
  "bullets": ["3 to 5 bullets"],
  "chips": ["tag", "tag", "tag"],
  "statCards": [{ "value": "short figure", "label": "what it means", "note": "optional" }],
  "chart": { "kind": "bar|line|donut|ranking", "labels": ["a","b","c"], "values": [1, 2, 3], "unit": "optional", "note": "optional" },
  "quote": { "text": "quote line", "source": "who said it" },
  "imagePrompt": "vivid prompt for AI image generator or empty string",
  "highlight": "optional one strong takeaway line",
  "speakerNote": "one sentence"
}`;
  try {
    const result = await withTimeout(
      callConfiguredModel(model, [
        { role: "system", content: system },
        { role: "user", content: user },
      ], { maxTokens: 1400, json: true }),
      AI_WRITER_TIMEOUT_MS,
      `slide ${index + 1} writer`,
    );
    if (!result.ok) return { ok: false, error: result.error };
    let parsed;
    try {
      parsed = parseAiJson(result.content);
    } catch (error) {
      return { ok: false, error: `Invalid JSON from writer: ${error.message}` };
    }
    const detail = normalizeSlideDetail({ ...parsed, slideBullets: planBullets });
    if (!detail.bullets.length && !detail.statCards.length && !detail.quote && !detail.highlight) {
      return { ok: false, error: "Writer returned no usable content" };
    }
    return { ok: true, detail };
  } catch (error) {
    return { ok: false, error: error.message || "Writer request failed" };
  }
}

// Regenerate / remix one slide later: send the current deck context + an
// optional user instruction, get a revised single-slide plan back.
async function agentRegenerateSlide(model, ctx, deck, slideIndex, instruction = "") {
  const slide = deck?.slides?.[slideIndex];
  if (!slide) return { ok: false, error: "Slide not found in deck" };
  const system = [
    "You are a senior presentation designer. Rewrite ONE slide of an existing deck.",
    "Keep the deck's overall story intact. Do not invent hard facts the topic does not provide.",
    "Return ONLY valid JSON. No markdown fences, no commentary.",
  ].join(" ");
  const user = `${aiAgentContext(ctx)}
DECK STRUCTURE: ${(deck.slides || []).map((s, i) => `${i + 1}. [${s.type}] ${s.title}`).join(" | ")}
SLIDE ${slideIndex + 1} TO REWRITE: type "${slide.type}", title "${slide.title}", bullets: ${JSON.stringify(slide.bullets || [])}
${instruction ? `USER REQUEST: ${instruction}\n` : ""}Respond with the same single-slide schema the writer uses:
{
  "type": "same type",
  "title": "rewritten title",
  "subtitle": "optional",
  "bullets": ["3 to 5"],
  "kicker": "short label",
  "statCards": [{ "value": "...", "label": "..." }],
  "quote": { "text": "...", "source": "..." },
  "speakerNote": "one sentence"
}`;
  try {
    const result = await withTimeout(
      callConfiguredModel(model, [
        { role: "system", content: system },
        { role: "user", content: user },
      ], { maxTokens: 1000, json: true }),
      AI_REGENERATE_TIMEOUT_MS,
      `regenerate slide ${slideIndex + 1}`,
    );
    if (!result.ok) return { ok: false, error: result.error };
    let parsed;
    try {
      parsed = parseAiJson(result.content);
    } catch (error) {
      return { ok: false, error: `Invalid JSON from regenerator: ${error.message}` };
    }
    return { ok: true, slide: normalizeSlideDetail({ ...parsed, slideBullets: slide.bullets }) };
  } catch (error) {
    return { ok: false, error: error.message || "Regenerate request failed" };
  }
}