# Codestrom — Feature Parity vs Cursor · Replit · Emergent · Trae (2026)

Evidence-based comparison. Every Codestrom claim is tied to a real file path, route, or line.
Tool data is from public 2026 sources (Cursor 3.0/Composer 2, Replit Agent 2/3, Emergent, Trae 2.0 SOLO, Windsurf→Devin Desktop).

Legend: `●` full · `◐` partial · `○` missing

## Editing & completions

| Feature | Codestrom (evidence) | Cursor | Replit | Emergent | Trae |
|---|---|---|---|---|---|
| Streaming inline/ghost completion | `●` `MonacoEditor.tsx:200` inline provider; `POST /completions/stream` (ide.js:1405) | `●` | `○` | `○` | `●` |
| Multi-line predictive "Tab" | `◐` same provider; no trained edit model | `●` | `○` | `○` | `◐` |
| Inline edit Ctrl+K + accept/reject | `●` `POST /inline/edit` ide.js:918; UI ide.js-diff :867-1028 | `●` | `◐` | `◐` | `●` |
| Multi-file Composer + checkpoints | `●` `POST /composer` ide.js:6573; `GET/POST /checkpoints` :576-605; `ComposerPanel.tsx` | `●` | `◐` | `●` | `●` (DiffView) |
| Smart rewrites / auto-correct | `◐` "Fix with Neural AI" context action :435-459 | `●` | `○` | `○` | `◐` |

## Agent

| Feature | Codestrom (evidence) | Cursor | Replit | Emergent | Trae |
|---|---|---|---|---|---|
| Autonomous agent loop w/ tools | `●` `agentLoop.js` (MAX_ITER 28), `agentTools.js` (9 tools), `/agents/run` ide.js:4495 | `●` | `●` | `●` | `●` (SOLO) |
| Permission gate / confirm | `●` `/agents/confirm`, 60s auto-allow, skip | `●` | `◐` | `◐` | `◐` |
| Plan→execute (planner/architect roles) | `●` `agentPrompts.ts` AGENT_META (planner/architect/coder/executor/debugger/tester/reviewer/fixer/docs/pipeline) | `◐` | `◐` | `●` | `●` Plan mode |
| Fix loop (auto-fix errors) | `●` `fixLoop.js` MAX_ITER 24, wrench button (AICodingIDE :5844) | `◐` | `●` | `●` | `◐` |
| Sub-agents / parallel agents | `○` | `●` (up to 8) | `◐` | `◐` | `●` (Sub Agent) |
| Background / cloud async agent → PR | `○` | `●` (Cursor 3, cloud sandboxes) | `◐` | `●` | `○` |
| Checkpoint rollback | `●` `/checkpoints/restore` + Step History drawer | `●` | `●` | `○` | `◐` |

## Context & intelligence

| Feature | Codestrom (evidence) | Cursor | Replit | Emergent | Trae |
|---|---|---|---|---|---|
| Codebase embedding index | `●` `indexer.js` (PARSE_VERSION 6, MAX_FILES 3000), `contextBuilder.js` | `●` | `◐` | `◐` | `◐` |
| Semantic search | `●` `POST /index/semantic` (embedder.js nomic-embed) | `●` | `◐` | `◐` | `◐` |
| Symbols / references / rename (tree-sitter) | `●` `tsindexer.js` WASM; `/ts/symbol|references|rename` ide.js:699-760 | `●` | `◐` | `◐` | `◐` |
| Inlay hints | `●` `MonacoEditor.tsx:605` via `monaco.typescript` | `●` | `○` | `○` | `◐` |
| Find usages / extract symbol | `●` editor actions :404-433; refsPanel (AICodingIDE :5191) | `●` | `○` | `○` | `◐` |
| Import/call graph + Mermaid export | `●` `GraphView.tsx`, `/index/graph` ide.js:3387 | `◐` | `○` | `○` | `○` |
| Rules files (`.cursor/rules`/`.windsurf/rules`) | `◐` `.ide/memory.md` + scratchpad inject only | `●` | `◐` | `◐` | `◐` |
| Memories / Skills / Workflows | `◐` memory step in agentLoop (12k cap) | `○` | `○` | `○` | `●` (SOLO ctx mgmt) |

## IDE surfaces

| Feature | Codestrom (evidence) | Cursor | Replit | Emergent | Trae |
|---|---|---|---|---|---|
| PTY terminal (xterm.js) | `●` `pty.js` WS upgrade; `PtyTerminal.tsx` | `●` | `●` | `◐` | `●` |
| Debugger (DAP eval/watch/breakpoints) | `●` `dap.js` (`/debug/evaluate|watch|breakpoint|continue|step|stack|variables`), panel :5941 | `●` | `◐` | `◐` | `●` |
| Extensions | `◐` Open VSX grammars/themes/snippets (`extensions.js`) + curated npm plugin marketplace | `●` (full VS Code marketplace) | `◐` | `◐` | `●` (VS Code) |
| MCP servers | `●` `mcp.js` `/mcp/servers` (+add/remove/test), tools drawer | `●` | `●` | `●` | `●` |
| SSH / SFTP | `●` `ssh.js` (ssh2) + system ssh/rsync (`/ssh/sync`) | `●` | `◐` | `◐` | `◐` |
| Git panel + push | `●` `/git/*` ide.js:2724-2995; git tab (AICodingIDE :4342) | `●` | `◐` | `◐` | `●` |
| Browser preview iframe | `●` `/preview/:workspace/*` servePreview (path-based, SPA fallback) | `●` | `●` | `●` | `●` |
| Notebook (`# %%`), DB browser, API tester, profiler | `●` NotebookView.tsx / DatabasePanel.tsx / ApiTestPanel.tsx / ProfilerPanel.tsx | `◐` (extensions) | `◐` | `○` | `◐` |
| Collab (Yjs) | `●` CollabProvider.tsx + setupCollabServer (server.js:1512) | `◐` (ext only) | `●` | `◐` | `◐` |

## Platform & distribution

| Feature | Codestrom (evidence) | Cursor | Replit | Emergent | Trae |
|---|---|---|---|---|---|
| Prompt→app + deploy + public URL | `●` agent pipeline + `/deploy` + `/share-terminal` (localhost.run tunnel, live-verified) | `○` (needs external) | `●` (.replit.app, SSL, CDN) | `●` (core value) | `●` (Builder) |
| Hosted DB / auth / autoscale PaaS | `◐` SQLite DB panel; no managed Postgres/auth/CDN | `○` | `●` | `●` | `○` |
| Design-to-code (Figma/screenshot) | `◐` image attachments in chat only | `◐` (Design Mode) | `●` | `◐` | `●` (multimodal) |
| Browser/cloud IDE (no install) | `●` (it IS browser-based: Vite + local Node backend) | `○` | `●` | `●` | `●` |
| Local models / BYOK / usage stats | `●` ModelHub.tsx (Models/Routes/Profiles/Usage), Ollama+LM Studio+OpenAI-compatible, modelhub.js | `◐` BYOK | `○` | `○` | `○` |
| Electron auto-update desktop | `●` desktop/main.cjs (electron-updater, 60-min check) | `●` | `○` | `○` | `○` |
| JetBrains / mobile / CLI | `○` | `●` (JetBrains, mobile, CLI) | `◐` mobile | `○` | `○` |

## Honest verdict

- **vs Cursor** — closest category (local IDE). Full parity on the core: streaming completions, agent loop, composer + checkpoints, tree-sitter refs/rename, diff-apply, PTY terminal, DAP debugger, MCP, SSH, preview, deploy. Genuinely missing: sub-agents/parallel agents, background/cloud agents → PR, BugBot/PR review, Hooks, rules-as-config, model Arena, JetBrains/mobile/CLI, and the entire VS Code extension ecosystem. **Est. ~70-75% feature parity.**
- **vs Trae** — philosophical twin (browser IDE + context engineering). Codestrom ≥ Trae on local/BYOK model freedom (ModelHub beats locked models), PTY, DAP, and matches SOLO's plan mode + context compression. Missing: free hosted frontier models and Builder-mode polish.
- **vs Replit Agent & Emergent** — different category (cloud prompt→PaaS). Codestrom replicates the full pipeline (planner→coder→tester→deployer) and ships a real public URL, but is local-first with no managed hosting/Postgres/auth/autoscale. Exceeds them on local debugging (DAP), terminal, and local-model control.

## Caveat

Token quality depends on the model, not Codestrom. At time of writing all model backends were down (OmniRoute :20128, Ollama :11434, LM Studio :1234), so completion/agent parity is structural — verified endpoints and transforms — not yet live-demoed.

## Next steps

Top 5 gaps → see `BUILD-PLAN.md`: sub-agents, parallel agent runs, rules files, model arena, hosted deploy.
