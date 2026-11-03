// Sub-agent delegation system
//
// Parent agent can spawn child agents for specialized tasks via the `delegate` tool.
// Each sub-agent runs an isolated loop with its own context budget, tool allowlist,
// and checkpoint directory. Results are streamed back to parent via event bus.

import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';

// In-memory registry of active sub-agents
const subAgents = new Map(); // runId -> { parentRunId, role, status, events, abortController }

// Event bus for parent-child communication
const subAgentBus = new EventEmitter();

const ROLE_TOOLS = {
  planner: ['readFile', 'writeFile', 'listFiles', 'grep', 'semanticSearch', 'runCommand'],
  architect: ['readFile', 'writeFile', 'listFiles', 'grep', 'semanticSearch', 'applyDiff'],
  coder: ['readFile', 'writeFile', 'listFiles', 'grep', 'semanticSearch', 'applyDiff', 'runCommand', 'runTests'],
  tester: ['readFile', 'listFiles', 'grep', 'runCommand', 'runTests'],
  reviewer: ['readFile', 'listFiles', 'grep', 'semanticSearch'],
  fixer: ['readFile', 'writeFile', 'listFiles', 'grep', 'applyDiff', 'runCommand', 'runTests'],
  researcher: ['readFile', 'listFiles', 'grep', 'semanticSearch', 'webSearch'],
  documenter: ['readFile', 'writeFile', 'listFiles', 'grep'],
};

const ROLE_SYSTEM = {
  planner: `You are a Planner sub-agent. Break the task into a clear, ordered roadmap. Output JSON: {"milestones": [{"title": "...", "steps": ["..."]}]}. No code.`,
  architect: `You are an Architect sub-agent. Design the file structure, key interfaces, and data flow. Output JSON: {"files": [{"path": "...", "purpose": "..."}]}. No implementation code.`,
  coder: `You are a Coder sub-agent. Implement the assigned files completely. Write production-ready code. Use applyDiff for edits.`,
  tester: `You are a Tester sub-agent. Write and run tests for the given code. Use runTests tool. Report pass/fail with details.`,
  reviewer: `You are a Reviewer sub-agent. Audit the code for bugs, security, performance, and style. Output JSON: {"issues": [{"file": "...", "line": ..., "severity": "high|med|low", "message": "..."}]}`,
  fixer: `You are a Fixer sub-agent. Fix the reported issues. Use applyDiff to edit files. Run tests after each fix.`,
  researcher: `You are a Researcher sub-agent. Search the codebase and web for information. Summarize findings concisely.`,
  documenter: `You are a Documenter sub-agent. Write clear documentation (README, comments, API docs) for the given code.`,
};

function buildSubAgentSystemPrompt(role, parentContext = '') {
  const base = ROLE_SYSTEM[role] || ROLE_SYSTEM.coder;
  return `${base}\n\nParent context:\n${parentContext}\n\nYour available tools: ${(ROLE_TOOLS[role] || ROLE_TOOLS.coder).join(', ')}`;
}

export async function spawnSubAgent(params, ctx) {
  const {
    parentRunId,
    task,
    role = 'coder',
    contextBudget = 8000,
    modelId = null,
    tools: customTools,
    workspace,
  } = params;

  const { callLLM, sendError, workspaceDir: getWsDir, safeJoin: sj } = ctx;
  const dir = getWsDir(workspace);
  if (!dir) throw new Error('Invalid workspace');

  const runId = `sub-${parentRunId}-${role}-${Date.now().toString(36)}`;
  const abortController = new AbortController();
  const events = [];

  const subAgent = {
    runId,
    parentRunId,
    role,
    task,
    status: 'running',
    events,
    abortController,
    startTime: Date.now(),
  };
  subAgents.set(runId, subAgent);

  // Sub-agent checkpoint dir
  const ckptDir = path.join(dir, '.ide', 'subagents', runId);
  fs.mkdirSync(ckptDir, { recursive: true });

  // Emit start event
  const emit = (event, data) => {
    const ev = { event, runId, role, at: Date.now(), ...data };
    events.push(ev);
    subAgentBus.emit('event', ev);
  };

  emit('start', { task, role });

  // Run the sub-agent loop
  (async () => {
    try {
      let history = [];
      let iteration = 0;
      const maxIterations = role === 'planner' ? 1 : 8;

      while (iteration < maxIterations && !abortController.signal.aborted) {
        iteration++;
        emit('iteration', { iteration, maxIterations });

        // Build context from parent + own history
        const parentCtx = ''; // Could fetch from parent run's context
        const systemPrompt = buildSubAgentSystemPrompt(role, parentCtx);

        const messages = [
          { role: 'system', content: systemPrompt },
          ...history.slice(-6),
          { role: 'user', content: iteration === 1 ? task : 'Continue. What is the next step?' },
        ];

        const allowedTools = customTools || ROLE_TOOLS[role] || ROLE_TOOLS.coder;

        const reply = await callLLM({
          messages,
          json: role === 'planner' || role === 'architect' || role === 'reviewer',
          maxTokens: 4000,
          temperature: 0.3,
          task: `subagent-${role}`,
          modelId,
          onDelta: (delta) => emit('delta', { delta }),
        });

        const content = typeof reply === 'string' ? reply : String(reply?.content || reply?.choices?.[0]?.message?.content || '');
        history.push({ role: 'assistant', content });

        emit('llm', { content: content.slice(0, 500) });

        // Parse tool calls if any (simplified - in real impl would use tool calling)
        // For now, assume the sub-agent returns a final result on last iteration
        if (iteration === maxIterations || role === 'planner' || role === 'architect' || role === 'reviewer') {
          subAgent.status = 'done';
          subAgent.result = content;
          emit('done', { result: content });
          break;
        }
      }

      if (subAgent.status === 'running') {
        subAgent.status = 'done';
        emit('done', { result: 'Max iterations reached' });
      }
    } catch (err) {
      if (abortController.signal.aborted) {
        subAgent.status = 'cancelled';
        emit('cancelled', {});
      } else {
        subAgent.status = 'error';
        emit('error', { message: String(err.message || err) });
      }
    } finally {
      // Cleanup after a delay
      setTimeout(() => subAgents.delete(runId), 60000);
    }
  })();

  return { runId, status: 'started' };
}

export function getSubAgent(runId) {
  return subAgents.get(runId);
}

export function listSubAgents(parentRunId) {
  return [...subAgents.values()].filter((a) => a.parentRunId === parentRunId);
}

export function cancelSubAgent(runId) {
  const a = subAgents.get(runId);
  if (a) {
    a.abortController.abort();
    a.status = 'cancelling';
  }
}

export function onSubAgentEvent(handler) {
  subAgentBus.on('event', handler);
  return () => subAgentBus.off('event', handler);
}

export const DELEGATE_TOOL_SPEC = {
  name: 'delegate',
  description: 'Spawn a sub-agent to handle a specialized sub-task',
  parameters: {
    type: 'object',
    properties: {
      role: { type: 'string', enum: ['planner', 'architect', 'coder', 'tester', 'reviewer', 'fixer', 'researcher', 'documenter'], description: 'Sub-agent role' },
      task: { type: 'string', description: 'Clear, self-contained task description for the sub-agent' },
      contextBudget: { type: 'number', description: 'Max context tokens for sub-agent (default 8000)' },
    },
    required: ['role', 'task'],
  },
};