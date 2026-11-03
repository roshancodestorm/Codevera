import fsp from 'fs/promises';
import { spawn } from 'child_process';
import { AGENT_TOOL_SYSTEM, TOOL_NAMES, createAgentToolExecutor } from './agentTools.js';
import { countActive, registerRun, unregisterRun, acquireFileLock, releaseFileLock, MAX_CONCURRENT_RUNS } from './runCoordinator.js';
import { getMcpToolMap, mcpToolHint } from './mcp.js';
import { detectProjectManifest, manifestSummaryForPrompt } from './projectManifest.js';
import { getShellEnv } from './shellEnv.js';

const MAX_ITER = 24;
const MAX_TOOL_RESULT = 12000;
const MAX_OUTPUT = 50000;
const DEFAULT_TIMEOUT_MS = 120000;

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

export function registerFixLoopRoutes(router, deps) {
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

  router.post('/fix/run', async (req, res) => {
    const { workspace, command, maxRounds = 3, timeoutMs = DEFAULT_TIMEOUT_MS } = req.body || {};
    const dir = workspaceDir(workspace);
    if (!dir) return sendError(res, 400, 'Invalid workspace');
    if (countActive(workspace) >= MAX_CONCURRENT_RUNS) return sendError(res, 409, `Too many concurrent agent runs for this workspace (max ${MAX_CONCURRENT_RUNS})`);

    const cmd = String(command || '').trim();
    if (!cmd) return sendError(res, 400, 'Command is required');

    const runId = newRunId();
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const runControl = registerRun({ runId, workspace, label: command });
    res.on('close', () => {
      if (!res.writableEnded && !runControl.paused) runControl.cancelled = true;
    });

    const emit = (event, payload) => {
      try {
        res.write(`data: ${JSON.stringify({ event, ...payload })}\n\n`);
      } catch {}
    };

    const step = (agent, status, message, detail = null) =>
      emit('step', { agent, status, message, detail, at: Date.now() });

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
    const shell = getShellEnv();
    const manifest = detectProjectManifest(dir);

    const runCmd = () =>
      new Promise((resolve) => {
        let out = '';
        let child;
        try {
          child = spawn(cmd, { cwd: dir, shell: true, windowsHide: true });
        } catch (e) {
          return resolve({ exitCode: -1, output: String(e.message || e) });
        }
        const timer = setTimeout(() => {
          try {
            child.kill();
          } catch {}
        }, Math.max(Number(timeoutMs) || DEFAULT_TIMEOUT_MS, 15000));
        child.stdout?.on('data', (d) => {
          const t = d.toString();
          out = (out + t).slice(-MAX_OUTPUT);
          sendLog('out', t);
        });
        child.stderr?.on('data', (d) => {
          const t = d.toString();
          out = (out + t).slice(-MAX_OUTPUT);
          sendLog('err', t);
        });
        child.on('error', (err) => {
          clearTimeout(timer);
          resolve({ exitCode: -1, output: String(err.message || err) });
        });
        child.on('close', (code) => {
          clearTimeout(timer);
          resolve({ exitCode: code, output: out });
        });
      });

    try {
      ensureActive();
      await snapshotWorkspace(workspace, dir, runId);
      step('fix', 'running', `Auto-fix loop started for: ${cmd}`);
      await appendChat(workspace, dir, 'user', `Auto-fix request — command: ${cmd}`);

      let exitCode = -1;
      let lastOutput = '';
      let round = 0;
      let filesChanged = [];

      while (round <= maxRounds) {
        ensureActive();
        const attemptLabel = round === 0 ? 'Initial run' : `Re-run after fix ${round}`;
        step('cmd', 'running', attemptLabel);
        sendLog('system', `$ ${cmd}\n`);
        const r = await runCmd();
        exitCode = r.exitCode;
        lastOutput = r.output;
        step('cmd', exitCode === 0 ? 'done' : 'failed', `${attemptLabel} → exit ${exitCode}`, lastOutput.slice(-600));
        sendLog('system', `[exit ${exitCode}]\n`);

        if (exitCode === 0) {
          step('fix', 'done', `Command passed after ${round} fix round${round === 1 ? '' : 's'}`);
          break;
        }
        if (round >= maxRounds) break;
        round++;

        tools.resetChangedFiles();
        step('agent', 'running', `Diagnosing errors (round ${round}/${maxRounds})`);
        sendLog('system', `─ AI fixing errors (round ${round}/${maxRounds}) ─\n`);

        const history = (await loadChat(workspace, dir)).slice(-4);
        const messages = [
          {
            role: 'system',
            content:
              AGENT_TOOL_SYSTEM +
              mcpToolHint(mcpTools) +
              '\n\nYou are running an AUTO-FIX loop. The verification command FAILED. Diagnose the errors in the command output, edit the necessary files to fix them, then reply {"type":"done","message":"..."}. Only make changes that directly address the errors.',
          },
          {
            role: 'user',
            content: [
              `Workspace: ${workspace}`,
              `Shell: ${shell.label}`,
              manifestSummaryForPrompt(manifest),
              `Verification command: ${cmd}`,
              `Command output (exit ${exitCode}):\n${lastOutput.slice(-12000)}`,
              `Files already changed this session: ${filesChanged.join(', ') || '(none)'}`,
              `Task: Fix the errors so the command exits with code 0.`,
            ]
              .filter(Boolean)
              .join('\n\n'),
          },
        ];
        for (const h of history) {
          if (h.role === 'user' || h.role === 'assistant') {
            messages.push({ role: h.role, content: String(h.content || '').slice(0, 3000) });
          }
        }

        let agentSummary = 'Fixes applied.';
        for (let i = 0; i < MAX_ITER; i++) {
          ensureActive();
          step('agent', 'running', `Thinking (step ${i + 1}/${MAX_ITER})`);

          const llm = await callLLM({
            messages,
            json: true,
            maxTokens: 4096,
            temperature: 0.25,
            task: 'auto-fix',
          });

          const parsed = parseAgentJson(llm.content);
          if (!parsed || !parsed.type) {
            sendLog('warn', `Model returned invalid JSON: ${String(llm.content || '').slice(0, 500)}`);
            messages.push({ role: 'assistant', content: llm.content || '{}' });
            messages.push({
              role: 'user',
              content: 'Invalid JSON. Reply with STRICT JSON: {"type":"tool","tool":"...","args":{}} or {"type":"done","message":"..."}',
            });
            continue;
          }

          if (parsed.type === 'done') {
            agentSummary = String(parsed.message || 'Fixes applied.').trim();
            step('agent', 'done', agentSummary);
            break;
          }

          if (parsed.type !== 'tool') {
            messages.push({ role: 'assistant', content: JSON.stringify(parsed) });
            messages.push({ role: 'user', content: 'Use type "tool" or "done" only.' });
            continue;
          }

          const toolName = String(parsed.tool || '');
          if (!allToolNames.has(toolName)) {
            messages.push({ role: 'assistant', content: JSON.stringify(parsed) });
            messages.push({ role: 'user', content: `Unknown tool "${toolName}". Use: ${[...allToolNames].join(', ')}` });
            continue;
          }

          step('tool', 'running', `${toolName}`, parsed.args || null);
          sendLog('tool', JSON.stringify({ tool: toolName, args: parsed.args || {} }));

          const result = await tools.execute(toolName, parsed.args || {});
          const resultStr = truncateForModel(result);
          sendLog('tool_result', resultStr);

          if (toolName === 'write_file' || toolName === 'edit_file') {
            emit('log', { kind: 'files', content: 'refresh', at: Date.now() });
          }

          step('tool', result.ok === false ? 'failed' : 'done', `${toolName}`, resultStr.slice(0, 400));

          messages.push({ role: 'assistant', content: JSON.stringify(parsed) });
          messages.push({
            role: 'user',
            content: `Tool result for ${toolName}:\n${resultStr}\n\nContinue fixing or reply {"type":"done","message":"..."} when ready for the command to be re-run.`,
          });
        }

        const changed = tools.getChangedFiles();
        filesChanged = [...new Set([...filesChanged, ...changed])];
        step('agent', 'done', `${changed.length} file(s) changed this round`, changed.join(', ') || agentSummary);
      }

      const passed = exitCode === 0;
      const summary = passed
        ? `Command passed after ${round} fix round${round === 1 ? '' : 's'} — ${cmd}`
        : `Command still failing after ${maxRounds} fix round${maxRounds === 1 ? '' : 's'} — ${cmd}`;
      await appendChat(workspace, dir, 'assistant', summary, { files: filesChanged });
      emit('done', { runId, summary, failed: !passed, exitCode, rounds: round, files: filesChanged, command: cmd });
    } catch (err) {
      const isCancel = err && (err.code === 'RUN_CANCELLED' || String(err.message).includes('cancelled'));
      const message = isCancel
        ? 'Auto-fix loop cancelled. Changes so far remain in the workspace.'
        : `Auto-fix loop failed: ${String(err.message || err)}`;
      step('fix', 'failed', message);
      await appendChat(workspace, dir, 'assistant', message).catch(() => {});
      emit('done', { runId, summary: message, failed: !isCancel, cancelled: isCancel, exitCode, files: tools.getChangedFiles() });
    } finally {
      clearInterval(heartbeat);
      unregisterRun(runId);
      try {
        res.end();
      } catch {}
    }
  });
}
