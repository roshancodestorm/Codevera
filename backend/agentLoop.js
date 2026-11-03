import fsp from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { AGENT_TOOL_SYSTEM, TOOL_NAMES, createAgentToolExecutor } from './agentTools.js';
import { detectProjectManifest, manifestSummaryForPrompt } from './projectManifest.js';
import { getShellEnv } from './shellEnv.js';
import { getIndex } from './indexer.js';
import { getMcpToolMap, mcpToolHint } from './mcp.js';
import { collectRules } from './rules.js';
import { collectSkills } from './skills.js';
import { collectMemory, appendMemory } from './memory.js';
import { countActive, registerRun, unregisterRun, acquireFileLock, releaseFileLock, MAX_CONCURRENT_RUNS } from './runCoordinator.js';

const MAX_ITER = 28;
const MAX_TOOL_RESULT = 12000;
// Rough token estimate: 4 chars ≈ 1 token
const SUMMARIZE_CHAR_THRESHOLD = 40000; // ~10k tokens in message history

function parseAgentJson(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {}
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

function truncateForModel(obj) {
  const s = JSON.stringify(obj);
  if (s.length <= MAX_TOOL_RESULT) return s;
  return s.slice(0, MAX_TOOL_RESULT) + '…[truncated]';
}

// ── Sub-agent delegation ────────────────────────────────────────────────────
// The "delegate" tool spawns a bounded child loop (own message budget + step
// cap) that reuses the caller's executor, so writes are tracked & checkpointed.
// Exported separately so it can be unit-tested and reused by parallel runs.
export async function runSubAgentLoop(deps) {
  const {
    workspace, dir, runId,
    goal, files, maxSteps, budgetTokens,
    callLLM, tools, allToolNames,
    emit, step, sendLog, ensureActive,
    snapshotWorkspace, newRunId, mcpTools,
  } = deps;
  const theGoal = String(goal || '').trim();
  if (!theGoal) return { ok: false, error: 'delegate requires a "goal" string' };
  const stepsCap = Math.min(Math.max(Number(maxSteps) || 6, 1), 12);
  const budgetChars = Math.min(Math.max(Number(budgetTokens) || 1500, 200) * 4, 60000);
  const scopeFiles = Array.isArray(files) ? files.filter(Boolean).slice(0, 8) : [];
  const subId = `sub-${newRunId().slice(0, 8)}`;
  step('agent', 'running', `↳ Sub-agent (${subId}): ${theGoal.slice(0, 140)}`, `sub-agent · ${stepsCap} steps max`);
  if (sendLog) sendLog('tool', JSON.stringify({ tool: 'delegate', subId, goal: theGoal, files: scopeFiles }));

  const subRules = (await collectRules(dir, { files: scopeFiles })).text;
  const subMessages = [
    {
      role: 'system',
      content: AGENT_TOOL_SYSTEM
        + (mcpToolHint && mcpTools ? mcpToolHint(mcpTools) : '')
        + (subRules ? `\n\nProject rules:\n${subRules}` : '')
        + `\n\nYou are a focused SUB-AGENT spawned by the main agent. Autonomous goal: ${theGoal}.`
        + ' Work autonomously using tools. When done, reply {"type":"done","message":"<concise summary>", "filesTouched":["<rel path>", ...]} (filesTouched optional).'
        + ' Do not delegate further. Stay inside the workspace.',
    },
  ];
  let spentChars = 0;
  let final = 'Sub-agent finished without a summary.';
  const subFiles = new Set();
  for (let i = 0; i < stepsCap; i++) {
    ensureActive();
    step('agent', 'running', `↳ Sub-agent step ${i + 1}/${stepsCap}`, `sub-agent · ${theGoal.slice(0, 80)}`);
    const llm = await callLLM({ messages: subMessages, json: true, maxTokens: 2048, temperature: 0.25, task: 'tool-agent' });
    spentChars += String(llm.content || '').length;
    const parsed = parseAgentJson(llm.content);
    if (!parsed || !parsed.type) {
      subMessages.push({ role: 'assistant', content: llm.content || '{}' });
      subMessages.push({ role: 'user', content: 'Invalid JSON. Reply with strict JSON: {"type":"tool",...} / {"type":"tools",...} / {"type":"done","message":"..."}' });
      continue;
    }
    if (parsed.type === 'done') {
      final = String(parsed.message || 'Task complete.');
      if (Array.isArray(parsed.filesTouched)) parsed.filesTouched.forEach((f) => f && subFiles.add(String(f)));
      break;
    }
    const runCalls = parsed.type === 'tools'
      ? (Array.isArray(parsed.calls) ? parsed.calls.slice(0, 4) : [])
      : (parsed.type === 'tool' ? [parsed] : []);
    if (!runCalls.length) {
      subMessages.push({ role: 'assistant', content: JSON.stringify(parsed) });
      subMessages.push({ role: 'user', content: 'Use type "tool", "tools", or "done" only.' });
      continue;
    }
    const results = [];
    for (const c of runCalls) {
      const t = String(c?.tool || '');
      if (!allToolNames.has(t)) { results.push({ ok: false, error: `Unknown tool "${t}"` }); continue; }
      if (t === 'delegate') { results.push({ ok: false, error: 'Sub-agents cannot delegate further.' }); continue; }
      const res = await tools.execute(t, c?.args || {}).catch((e) => ({ ok: false, error: String(e?.message || e) }));
      if (t === 'write_file' || t === 'edit_file') {
        if (res.ok !== false) {
          const p = String(c?.args?.path || '');
          if (p) subFiles.add(p);
          emit('log', { kind: 'files', content: 'refresh', at: Date.now() });
          snapshotWorkspace(workspace, dir, runId).catch(() => {});
        }
      }
      results.push(res);
    }
    subMessages.push({ role: 'assistant', content: JSON.stringify(parsed) });
    subMessages.push({ role: 'user', content: runCalls.map((c, ci) => `Tool result for ${c.tool}:\n${truncateForModel(results[ci])}`).join('\n\n') + '\n\nContinue, or reply {"type":"done","message":"..."} when finished.' });
    if (spentChars > budgetChars) { final = `Sub-agent stopped after budget. ${final}`; break; }
  }
  const summary = final;
  step('agent', 'done', `↳ Sub-agent done: ${summary.slice(0, 220)}`, `sub-agent · ${subFiles.size} file(s) touched`);
  return { ok: true, subId, summary, output: summary, filesTouched: [...subFiles] };
}

// Pending permission confirmations: runId -> { resolve, tool, path, preview }
const pendingConfirms = new Map();

export function registerAgentToolRoutes(router, deps) {
  const {
    workspaceDir,
    safeJoin,
    callLLM,
    sendError,
    cancelledRunError,
    snapshotWorkspace,
    appendChat,
    loadChat,
    newRunId,
  } = deps;

  // Frontend calls this to approve or skip a pending write
  router.post('/agents/confirm', (req, res) => {
    const { runId, decision } = req.body || {};
    const pending = pendingConfirms.get(runId);
    if (!pending) return sendError(res, 404, 'No pending confirmation for this run');
    pending.resolve(decision === 'skip' ? 'skip' : 'allow');
    pendingConfirms.delete(runId);
    res.json({ ok: true });
  });

  router.post('/agents/tool-run', async (req, res) => {
    const { workspace, task, contextFiles = [], contextSymbols = [], maxIterations = MAX_ITER, requirePermissions = false } = req.body || {};
    const dir = workspaceDir(workspace);
    if (!dir) return sendError(res, 400, 'Invalid workspace');
    if (countActive(workspace) >= MAX_CONCURRENT_RUNS) return sendError(res, 409, `Too many concurrent agent runs for this workspace (max ${MAX_CONCURRENT_RUNS})`);

    const runTask = String(task || '').trim();
    if (!runTask) return sendError(res, 400, 'Task is required');

    const runId = newRunId();
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const runControl = registerRun({ runId, workspace, label: runTask });
    res.on('close', () => {
      if (!res.writableEnded && !runControl.paused) runControl.cancelled = true;
    });

    const emit = (event, payload) => {
      try {
        res.write(`data: ${JSON.stringify({ event, ...payload })}\n\n`);
      } catch {}
    };

    const step = (agent, status, message, detail = null, tokensIn = 0, tokensOut = 0) =>
      emit('step', { agent, status, message, detail, at: Date.now(), tokensIn, tokensOut });

    const sendLog = (kind, content) => emit('log', { kind, content, at: Date.now() });

    const heartbeat = setInterval(() => {
      try {
        res.write(`: ping ${Date.now()}\n\n`);
      } catch {}
    }, 15000);

    const ensureActive = () => {
      if (runControl.cancelled) throw cancelledRunError();
    };

    const mcpTools = await getMcpToolMap();
    const tools = createAgentToolExecutor({
      workspaceDir: dir,
      safeJoin,
      extraTools: mcpTools,
      fileLock: { workspace, runId, acquire: acquireFileLock, release: releaseFileLock },
    });
    const allToolNames = new Set([...TOOL_NAMES, ...mcpTools.keys()]);
    tools.resetChangedFiles();

    const runSubAgent = (args) => runSubAgentLoop({
      workspace,
      dir,
      runId,
      ...args,
      callLLM,
      tools,
      allToolNames,
      emit,
      step,
      sendLog,
      ensureActive,
      snapshotWorkspace,
      newRunId,
      mcpTools,
    });

    const runTool = (tool, toolArgs) => (tool === 'delegate' ? runSubAgent(toolArgs) : tools.execute(tool, toolArgs));

    try {
      ensureActive();
      await snapshotWorkspace(workspace, dir, runId);
      step('agent', 'running', 'Quick agent started');

      // Load project rules — `.codestrom/rules/**`, `global_rules.md`, legacy fallbacks
      const ctxFiles = Array.isArray(contextFiles) ? contextFiles.filter(Boolean) : [];
      let projectRules = '';
      try {
        projectRules = (await collectRules(dir, { files: ctxFiles })).text;
      } catch {}
      let memorySnippet = '';
      try { memorySnippet = await collectMemory(dir, 3000); } catch {}
      let skillsSnippet = '';
      try { skillsSnippet = (await collectSkills(dir, { files: ctxFiles })).text; } catch {}

      const shell = getShellEnv();
      const manifest = detectProjectManifest(dir);
      const history = (await loadChat(workspace, dir)).slice(-6);

      let fileSnippets = '';
      for (const rel of ctxFiles.slice(0, 8)) {
        const full = safeJoin(dir, rel);
        if (!full || !full.startsWith(dir)) continue;
        try {
          if (!fs.existsSync(full)) continue;
          const c = await fsp.readFile(full, 'utf8');
          fileSnippets += `\n--- ${rel} ---\n${c.slice(0, 4000)}\n`;
        } catch {}
      }

      let symbolSnippets = '';
      if (Array.isArray(contextSymbols) && contextSymbols.length) {
        const idx = getIndex(workspace) || null;
        for (const name of contextSymbols.slice(0, 6)) {
          const needle = String(name || '').replace(/^@/, '').trim();
          if (!needle) continue;
          const syms = idx && idx.symbols
            ? idx.symbols.filter((s) => s.name === needle || s.name === `#${needle}`).concat(idx.symbols.filter((s) => s.name.includes(needle)).slice(0, 1))
            : [];
          const s = syms[0];
          if (!s) continue;
          try {
            const full = safeJoin(dir, s.file);
            if (!full || !fs.existsSync(full)) continue;
            const content = await fsp.readFile(full, 'utf8');
            const lines = content.split('\n');
            const start = Math.max(0, (s.line || 1) - 15);
            const end = Math.min(lines.length, (s.line || 1) + 25);
            symbolSnippets += `\n--- ${s.file}:${s.line} (${s.kind} ${s.name}${s.signature ? ' ' + s.signature : ''}) ---\n${lines.slice(start, end).join('\n').slice(0, 2500)}\n`;
          } catch {}
        }
      }

      const messages = [
        { role: 'system', content: AGENT_TOOL_SYSTEM + mcpToolHint(mcpTools) + (projectRules ? `\n\nProject rules:\n${projectRules}` : '') + (memorySnippet ? `\n\nProject memory (respect these conventions/decisions):\n${memorySnippet}` : '') + (skillsSnippet ? `\n\nProject skills (use when relevant):\n${skillsSnippet}` : '') },
        {
          role: 'user',
          content: [
            `Workspace: ${workspace}`,
            `Shell: ${shell.label}`,
            manifestSummaryForPrompt(manifest),
            ctxFiles.length ? `Context files: ${ctxFiles.join(', ')}` : '',
            fileSnippets ? `Attached file snippets:${fileSnippets}` : '',
            symbolSnippets ? `Referenced symbols:${symbolSnippets}` : '',
            `User task:\n${runTask}`,
          ]
            .filter(Boolean)
            .join('\n\n'),
        },
      ];

      for (const h of history) {
        if (h.role === 'user' || h.role === 'assistant') {
          messages.push({ role: h.role, content: String(h.content || '').slice(0, 4000) });
        }
      }

      await appendChat(workspace, dir, 'user', runTask);

      let finalMessage = '';
      const iterLimit = Math.min(Math.max(Number(maxIterations) || MAX_ITER, 4), 40);

      for (let i = 0; i < iterLimit; i++) {
        ensureActive();
        step('agent', 'running', `Thinking (step ${i + 1}/${iterLimit})`);

        // Batch token deltas and emit as 'thinking' events so the frontend
        // can show a live streaming ticker while the model reasons.
        let thinkingBuf = '';
        let thinkingTimer = null;
        const flushThinking = () => {
          if (thinkingBuf) {
            emit('thinking', { text: thinkingBuf, at: Date.now() });
            thinkingBuf = '';
          }
          thinkingTimer = null;
        };
        const onDelta = (delta) => {
          thinkingBuf += delta;
          if (!thinkingTimer) thinkingTimer = setTimeout(flushThinking, 80);
        };

        const llm = await callLLM({
          messages,
          json: true,
          maxTokens: 4096,
          temperature: 0.25,
          task: 'tool-agent',
          onDelta,
        });
        // Flush any remaining buffered tokens
        if (thinkingTimer) { clearTimeout(thinkingTimer); flushThinking(); }
        // Signal end of thinking phase so UI can clear the ticker
        emit('thinking', { text: '', done: true, at: Date.now() });
        // Emit full reasoning chain if model returned one (o1/o3/DeepSeek-R1)
        if (llm.reasoningContent) {
          emit('reasoning', { text: llm.reasoningContent, at: Date.now() });
        }

        const stepTokIn = llm.usage?.prompt_tokens || 0;
        const stepTokOut = llm.usage?.completion_tokens || 0;

        const parsed = parseAgentJson(llm.content);
        if (!parsed || !parsed.type) {
          sendLog('warn', `Model returned invalid JSON: ${String(llm.content || '').slice(0, 500)}`);
          messages.push({ role: 'assistant', content: llm.content || '{}' });
          messages.push({
            role: 'user',
            content: 'Invalid JSON. Reply with STRICT JSON: {"type":"tool","tool":"...","args":{}} or {"type":"tools","calls":[...]} or {"type":"done","message":"..."}',
          });
          continue;
        }

        if (parsed.type === 'done') {
          finalMessage = String(parsed.message || 'Task complete.').trim();
          step('agent', 'done', finalMessage, null, stepTokIn, stepTokOut);
          break;
        }

        // ── Parallel tool calls ──────────────────────────────────────────────
        if (parsed.type === 'tools') {
          const calls = Array.isArray(parsed.calls) ? parsed.calls : [];
          if (!calls.length) {
            messages.push({ role: 'assistant', content: JSON.stringify(parsed) });
            messages.push({ role: 'user', content: 'type "tools" requires a non-empty "calls" array.' });
            continue;
          }
          // Validate all tool names up front
          const invalidTool = calls.find((c) => !allToolNames.has(String(c.tool || '')));
          if (invalidTool) {
            messages.push({ role: 'assistant', content: JSON.stringify(parsed) });
            messages.push({ role: 'user', content: `Unknown tool "${invalidTool.tool}". Use: ${[...allToolNames].join(', ')}` });
            continue;
          }
          // Emit a step chip per call (running)
          for (const c of calls) {
            step('tool', 'running', String(c.tool), c.args || null, stepTokIn, stepTokOut);
            sendLog('tool', JSON.stringify({ tool: c.tool, args: c.args || {} }));
          }
          // Run all calls in parallel
          const results = await Promise.all(
            calls.map((c) => runTool(String(c.tool), c.args || {}).catch((err) => ({ ok: false, error: String(err?.message || err) })))
          );
          // Emit result chips and handle file-refresh side-effects
          for (let ci = 0; ci < calls.length; ci++) {
            const c = calls[ci];
            const result = results[ci];
            const resultStr = truncateForModel(result);
            sendLog('tool_result', resultStr);
            step('tool', result.ok === false ? 'failed' : 'done', String(c.tool), resultStr.slice(0, 400));
            if (c.tool === 'write_file' || c.tool === 'edit_file') {
              emit('log', { kind: 'files', content: 'refresh', at: Date.now() });
              if (result.ok !== false) snapshotWorkspace(workspace, dir, runId).catch(() => {});
            }
          }
          const combinedResults = calls.map((c, ci) => `Tool result for ${c.tool}:\n${truncateForModel(results[ci])}`).join('\n\n');
          messages.push({ role: 'assistant', content: JSON.stringify(parsed) });
          messages.push({ role: 'user', content: `${combinedResults}\n\nContinue with the next tool or reply {"type":"done","message":"..."} when finished.` });
          continue;
        }

        if (parsed.type !== 'tool') {
          messages.push({ role: 'assistant', content: JSON.stringify(parsed) });
          messages.push({ role: 'user', content: 'Use type "tool", "tools", or "done" only.' });
          continue;
        }

        const toolName = String(parsed.tool || '');
        if (!allToolNames.has(toolName)) {
          messages.push({ role: 'assistant', content: JSON.stringify(parsed) });
          messages.push({ role: 'user', content: `Unknown tool "${toolName}". Use: ${[...allToolNames].join(', ')}` });
          continue;
        }

        step('tool', 'running', `${toolName}`, parsed.args || null, stepTokIn, stepTokOut);
        sendLog('tool', JSON.stringify({ tool: toolName, args: parsed.args || {} }));

        // Permission gate — pause before destructive writes if requirePermissions is set
        if (requirePermissions && (toolName === 'write_file' || toolName === 'edit_file')) {
          const targetPath = parsed.args?.path || '?';
          const preview = toolName === 'write_file'
            ? String(parsed.args?.content || '').slice(0, 500)
            : `find: ${String(parsed.args?.find || '').slice(0, 120)}\nreplace: ${String(parsed.args?.replace || '').slice(0, 120)}`;
          emit('confirm', { runId, tool: toolName, path: targetPath, preview, at: Date.now() });
          const decision = await new Promise((resolve) => {
            pendingConfirms.set(runId, { resolve, tool: toolName, path: targetPath, preview });
            // Auto-allow after 60s if user doesn't respond
            setTimeout(() => {
              if (pendingConfirms.has(runId)) {
                pendingConfirms.delete(runId);
                resolve('allow');
              }
            }, 60000);
          });
          if (decision === 'skip') {
            step('tool', 'done', `${toolName} — skipped by user`, null);
            messages.push({ role: 'assistant', content: JSON.stringify(parsed) });
            messages.push({ role: 'user', content: `Tool ${toolName} was skipped by the user for path "${targetPath}". Continue with the next step.` });
            continue;
          }
        }

        const result = await runTool(toolName, parsed.args || {});
        const resultStr = truncateForModel(result);
        sendLog('tool_result', resultStr);

        if (toolName === 'write_file' || toolName === 'edit_file') {
          emit('log', { kind: 'files', content: 'refresh', at: Date.now() });
          // Auto-checkpoint after every file write so the user can roll back
          // to any individual agent step (Emergent-style granular history).
          if (result.ok !== false) {
            snapshotWorkspace(workspace, dir, runId).catch(() => {});
          }
        }

        step('tool', result.ok === false ? 'failed' : 'done', `${toolName}`, resultStr.slice(0, 400));

        messages.push({ role: 'assistant', content: JSON.stringify(parsed) });
        messages.push({
          role: 'user',
          content: `Tool result for ${toolName}:\n${resultStr}\n\nContinue with the next tool or reply {"type":"done","message":"..."} when finished.`,
        });

        // ── Context summarization ─────────────────────────────────────────────
        // When history grows large, compress middle turns to free up context window.
        {
          const historyChars = messages.slice(2).reduce((sum, m) => sum + String(m.content || '').length, 0);
          if (historyChars > SUMMARIZE_CHAR_THRESHOLD) {
            const systemMsg = messages[0];
            const userGoal = messages[1];
            // Keep last 4 messages (2 assistant+user pairs) intact for continuity
            const toSummarize = messages.slice(2, messages.length - 4);
            const keepTail = messages.slice(messages.length - 4);
            if (toSummarize.length >= 4) {
              try {
                const summaryLlm = await callLLM({
                  messages: [
                    { role: 'system', content: 'You are a concise technical assistant.' },
                    {
                      role: 'user',
                      content: `Summarize the following agent tool-use conversation in 300 words or fewer. Focus on: what files were read/written, what commands ran, what was found, and what remains to do.\n\n${toSummarize.map((m) => `[${m.role}]: ${String(m.content || '').slice(0, 600)}`).join('\n')}`,
                    },
                  ],
                  maxTokens: 512,
                  temperature: 0.1,
                  task: 'summarize',
                });
                const summaryText = String(summaryLlm.content || '').trim();
                if (summaryText) {
                  const summaryMsg = { role: 'user', content: `[Conversation summary — earlier steps compressed to save context]:\n${summaryText}` };
                  messages.splice(2, toSummarize.length, summaryMsg);
                  messages.push(...keepTail.filter((m) => !messages.includes(m)));
                  sendLog('warn', `[context] History compressed: ${toSummarize.length} messages → 1 summary`);
                }
              } catch {
                // Summarization failed — continue with full history
              }
            }
          }
        }
      }

      if (!finalMessage) {
        finalMessage = 'Stopped after maximum agent steps. Review changes and run again if needed.';
        step('agent', 'done', finalMessage);
      }

      const files = tools.getChangedFiles();
      await appendChat(workspace, dir, 'assistant', finalMessage, { files });

      // Auto-update project memory with key decisions from this run
      if (!runControl.cancelled && !runControl.paused && tools.getChangedFiles().length > 0) {
        try {
          const changedList = tools.getChangedFiles().slice(0, 8).join(', ');
          const memResult = await callLLM({
            messages: [
              { role: 'system', content: 'You extract key technical decisions from code changes for a project memory log. Be concise. Reply with a JSON object: {"bullets": ["bullet1", "bullet2"]} — max 3 bullets, each under 15 words.' },
              { role: 'user', content: `Task: ${runTask.slice(0, 200)}\nChanged files: ${changedList}\nWrite 1-3 memory bullets about what was built/decided.` },
            ],
            json: true, maxTokens: 200, temperature: 0.2, task: 'docs',
          });
          let bullets = [];
          try {
            const parsed = JSON.parse(memResult.content);
            bullets = Array.isArray(parsed.bullets) ? parsed.bullets.filter(Boolean).slice(0, 3) : [];
          } catch {}
          if (bullets.length > 0) {
            const newEntry = `\n## Auto (${new Date().toISOString().slice(0, 10)})\n${bullets.map((b) => `- ${b}`).join('\n')}\n`;
            await appendMemory(dir, newEntry);
            emit('log', { kind: 'text', content: `📝 Memory updated: ${bullets[0]}`, at: Date.now() });
          }
        } catch {}
      }

      emit('done', { runId, summary: finalMessage, files, mode: 'tool-agent', failed: false });
    } catch (err) {
      const isCancel = err && (err.code === 'RUN_CANCELLED' || String(err.message).includes('cancelled'));
      const message = isCancel
        ? 'Run cancelled. Changes so far remain in the workspace.'
        : `Quick agent failed: ${String(err.message || err)}`;
      step('agent', 'failed', message);
      await appendChat(workspace, dir, 'assistant', message).catch(() => {});
      emit('done', { runId, summary: message, files: tools.getChangedFiles(), mode: 'tool-agent', failed: !isCancel, cancelled: isCancel });
    } finally {
      clearInterval(heartbeat);
      unregisterRun(runId);
      try {
        res.end();
      } catch {}
    }
  });
}
