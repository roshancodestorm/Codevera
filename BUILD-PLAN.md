# Build Plan — Top 5 Parity Gaps

Closes the gaps identified in `FEATURE-PARITY.md`. Each item: goal, where it lives in the codebase, design, acceptance criteria, effort. All five ship in the existing stack (Express + `ide.js` routers, `agentLoop.js`, `MonacoEditor.tsx`, `AICodingIDE.tsx`, `ModelHub.tsx`).

---

## 1. Sub-agents (task delegation)

**Goal:** let a running agent spawn a focused child agent (e.g. "search and summarize" or "write a unit test") that reports back into the parent loop. Matches Trae Sub-Agent / Windsurf flows.

**Where:**
- `backend/agentLoop.js` — iteration loop, tool registry (`agentTools.js` `TOOL_NAMES`)
- `backend/ide.js` `/agents/run` (4495) — executor prompt, context assembly
- `src/components/ide/AICodingIDE.tsx` — agent step rendering, permission confirm card

**Design:**
1. Add `delegate` tool to `agentTools.js` `TOOL_NAMES`: params `{goal, files[], budgetTokens}`.
2. `agentLoop.js` runs the sub-agent as a fresh LLM loop (shared `callLLM`, `MAX_ITER` reduced e.g. 8, own token budget capped) with read-only tools + `write_file` only into the parent's workspace.
3. Result returns as a structured `{summary, filesTouched, output}` tool result inlined into the parent's history (fits the existing summarization).
4. Frontend: render sub-agent as indented "child run" block in step log (reuse `agentRun` rendering).

**Acceptance:** parent run can emit `delegate`, child completes, summary appears in step log; budget respected; cancel from parent cancels child.
**Effort:** M (backend ~150 lines, frontend ~60).

---

## 2. Parallel agent runs

**Goal:** run N independent tasks concurrently in the same workspace, each with its own run record, so a user can dispatch "add search + add dark mode" simultaneously — Cursor 3 parallel-agents parity.

**Where:**
- `backend/ide.js` `/agents/run` (4495) — currently single-flight per workspace
- `backend/agentLoop.js` — shared state
- `src/components/ide/AICodingIDE.tsx` — run orchestrators `runPipelineFor`/`resumeRun`

**Design:**
1. Key runs by `runId` (already exists via `POST /agents/cancel|pause|rollback` per run); remove the per-workspace single-flight guard and allow up to N=4 concurrent runs keyed by runId.
2. Apply a file-write advisory lock map (`workspace → active run`) so two agents don't clobber the same file; second writer to a busy file must wait or fail with "busy".
3. Each run keeps its own token budget and memory file suffix (`memory.<runId>.md`) until the run completes, then merges into `.ide/memory.md`.
4. Frontend: Agents tab lists concurrent runs; per-run pause/resume/cancel; per-run checkpoint restore.

**Acceptance:** two `/agents/run` calls in one workspace execute concurrently; same-file writes are serialized/fenced; both rollbacks independent.
**Effort:** M-L (file-lock map is the only tricky part).

---

## 3. Rules files (`.codestrom/rules`)

**Goal:** version-controlled, glob-scoped rules loaded into every agent run and completion context — parity with `.cursor/rules` / `.windsurf/rules`.

**Where:**
- `backend/contextBuilder.js` — `buildContext` (rules must become a context layer)
- `backend/agentLoop.js` — memory step; prompt assembly
- `backend/ide.js` `/completions` (1247) + `/completions/stream` (1405) — completion context

**Design:**
1. Scan `.codestrom/rules/**/*.md` (and `global_rules.md` at workspace root) on index; parse frontmatter `{glob: "src/**/*.ts", apply: always|auto}`.
2. `contextBuilder.js` appends matched rules (path-glob resolved against the files in scope) to the system prompt, before memory/scratchpad. Cap 8k tokens.
3. Completions: include `always` rules in the inline-completion prompt.
4. Settings drawer: Rules tab (list/author/edit, syntax is plain markdown) — reuse Secrets-drawer form pattern.
5. Precedence: project `always` > global `always` > `auto` (model-invoked on matching glob).

**Acceptance:** rule file controls agent behavior (e.g. "never delete .env") across agent + composer runs; glob scoping respected; settings tab shows active rules.
**Effort:** M (contextBuilder + scanner ~200 lines, UI ~150).

---

## 4. Model Arena (side-by-side comparison)

**Goal:** run the same prompt/task through 2+ models and diff outputs — Cursor/Windsurf Arena parity.

**Where:**
- `backend/ide.js` `POST /completions/stream` (1405) + `callLLM` in `agentLoop.js`
- `backend/modelhub.js` — model profiles/routes
- `src/components/ide/ModelHub.tsx` — new Arena tab

**Design:**
1. `POST /arena` route: `{workspace, prompt, modelIds[], context?}` → streams each model's response as a separate SSE channel (`event: <modelId>`, existing streaming primitives), plus a `done` event with `{model, latencyMs, tokens}`.
2. Optional code task: `{task, files[]}` runs each model through the same Composer prompt and returns per-model diff to apply.
3. UI: Arena tab in ModelHub — model checkboxes (from active profile list), prompt box, live side-by-side panes, "winner" button that copies the winning pane into chat/agent.

**Acceptance:** two active models stream concurrently; latency + token stats shown; diff mode produces per-model diffs.
**Effort:** M (route reuses streaming; UI ~200 lines).

---

## 5. Hosted deploy target (beyond localhost tunnel)

**Goal:** one-click deploy of a workspace to a real always-on URL without the user running a tunnel — closes the Replit/Emergent "ship a live URL" gap while staying self-hostable.

**Where:**
- `backend/ide.js` `/deploy` (2020), `/deploy/docker` (1960), `/share-terminal` (5617)
- `src/components/ide/AICodingIDE.tsx` Deploy panel (:3446-3630)

**Design (choose one target per repo, default Tier 1):**
1. **Tier 1 — Render/Railway/Fly via CLI:** `POST /deploy/hosted` shells `render`/`railway`/`flyctl` with a generated `Dockerfile`+`render.yaml` from the workspace; streams deploy logs (reuse `/terminal/stream` plumbing); returns the public URL. Keeps the user's own account/keys.
2. **Tier 2 — built-in PaaS mode:** backend detects `CODESTROM_HOSTED=1` and serves a deployed workspace on a per-workspace subpath behind a reverse proxy (existing `servePreview` reused), plus a one-command startup script `npm run deploy:hosted`.

**Acceptance:** `POST /deploy/hosted` produces a live URL; deploy logs stream to the Deploy panel; stop tears down; failure surfaces the CLI error.
**Effort:** L (CLI integration + generated manifests; no new infra dependency at Tier 1).

---

## Suggested order & dependencies

1. **Rules files (#3)** — small, touches everything (agent + composer + completion), unblocks better prompt behavior for everything else.
2. **Sub-agents (#1)** — depends on rules being in context.
3. **Parallel runs (#2)** — depends on sub-agent pattern for the shared-loop refactor.
4. **Arena (#4)** — independent; reuse streaming.
5. **Hosted deploy (#5)** — largest; can run in parallel with #4.

Estimated total: ~1,200-1,400 lines across backend + frontend. Verify each with `node --check backend/ide.js`, `npx tsc -b --noEmit`, and the live-backend smoke route pattern used previously.
