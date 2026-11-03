import type { CapabilitySnapshot, ImportGraph, MemoryData, RunResult, SearchResult, TemplateInfo, TreeNode, WorkspaceInfo } from './ideTypes';

export interface GitDiffFile {
  path: string;
  tracked: boolean;
  added: number | null;
  removed: number | null;
  hunks?: { oldStart: number; oldLines: string[]; newStart: number; newLines: string[] }[];
  oldContent?: string;
}

export interface GitLogEntry {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export interface AgentRun {
  id: string;
  workspace: string;
  task: string;
  status: 'running' | 'paused' | 'cancelled' | 'failed' | 'done';
  phase: string;
  plan: any;
  arch: any;
  generatedFiles: string[];
  summary: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  subAgents?: SubAgent[];
}

export interface SubAgent {
  runId: string;
  role: string;
  task: string;
  status: 'running' | 'paused' | 'cancelled' | 'failed' | 'done';
  startTime: number;
  events: { event: string; at: number; [key: string]: any }[];
}

export interface ReaJob {
  id: string;
  kind: string;
  status: 'running' | 'done' | 'error' | 'cancelled' | 'timeout';
  target: string | null;
  endpoint: string | null;
  targetId: string | null;
  args: string[];
  startedAt: number;
  finishedAt: number | null;
  durationMs: number | null;
  exitCode: number | null;
  signal: string | null;
  error: string | null;
  stderr: string;
  stdoutTail?: string;
  parsed: any;
  bytes: number;
  result?: any;
}

const BASE = 'http://localhost:5000';
export const COLLAB_WS_BASE = 'ws://localhost:5000';

let authToken: string | null = null;

export function setAuthToken(t: string | null) {
  authToken = t;
}

async function j<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...((options?.headers as Record<string, string>) || {}) };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const ideApi = {
  auth: {
    register: (name: string, email: string, password: string) =>
      j<{ success: boolean; token: string; user: { name: string; email: string } }>(`${BASE}/api/ide/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      }),
    login: (email: string, password: string) =>
      j<{ success: boolean; token: string; user: { name: string; email: string } }>(`${BASE}/api/ide/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }),
    logout: () => j<{ success: boolean }>(`${BASE}/api/ide/auth/logout`, { method: 'POST' }),
    me: () => j<{ user: { name: string; email: string } }>(`${BASE}/api/ide/auth/me`),
  },
  touchWorkspace: (workspace: string) =>
    j<{ success: boolean }>(`${BASE}/api/ide/workspaces/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace }),
    }),
  deleteWorkspace: (workspace: string) =>
    j<{ success: boolean }>(`${BASE}/api/ide/workspaces`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace }),
    }),
  listWorkspaces: () => j<WorkspaceInfo[]>(`${BASE}/api/ide/workspaces`),
  createWorkspace: (name: string) =>
    j<{ success: boolean; name: string }>(`${BASE}/api/ide/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),
  tree: (workspace: string, root?: string) =>
    j<TreeNode[]>(`${BASE}/api/ide/tree?workspace=${encodeURIComponent(workspace)}${root ? `&root=${root}` : ''}`),
  readFile: (workspace: string, path: string, root?: string) =>
    j<{ content: string; path: string }>(
      `${BASE}/api/ide/file?workspace=${encodeURIComponent(workspace)}&path=${encodeURIComponent(path)}${root ? `&root=${root}` : ''}`
    ),
  writeFile: (workspace: string, path: string, content: string) =>
    j<{ success: boolean }>(`${BASE}/api/ide/file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, path, content }),
    }),
  deleteFile: (workspace: string, path: string) =>
    j<{ success: boolean }>(`${BASE}/api/ide/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, path }),
    }),
  inlineEdit: (workspace: string, path: string, fullText: string, selectionStart: number, selectionEnd: number, instruction: string, markers: string[] = []) =>
    j<{ ok: boolean; replacement: string }>(`${BASE}/api/ide/inline/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, path, fullText, selectionStart, selectionEnd, instruction, markers }),
    }),
  tsDiagnostics: (workspace: string, path: string, content: string) =>
    j<{ diagnostics: { line: number; col: number; endLine: number; endCol: number; message: string; severity: string; code?: number }[] }>(`${BASE}/api/ide/ts/diagnostics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, path, content }),
    }),
  langDiagnostics: (workspace: string, path: string, content: string) =>
    j<{ diagnostics: { line: number; col: number; endLine: number; endCol: number; message: string; severity: string }[] }>(`${BASE}/api/ide/lang/diagnostics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, path, content }),
    }),
  symbolSearch: (workspace: string, q: string) =>
    j<{ symbols: { id: string; name: string; kind: string; file: string; line: number; signature?: string }[] }>(
      `${BASE}/api/ide/symbols?workspace=${encodeURIComponent(workspace)}&q=${encodeURIComponent(q)}`
    ),
  definition: (workspace: string, path: string, word: string) =>
    j<{
      definition: { name: string; kind: string; file: string; line: number; signature?: string } | null;
      references: { file: string; line: number; text: string }[];
      total: number;
    }>(`${BASE}/api/ide/definition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, path, word }),
    }),
  checkpointList: (workspace: string) =>
    j<{ checkpoints: { runId: string; at: number; label: string }[] }>(`${BASE}/api/ide/checkpoints?workspace=${encodeURIComponent(workspace)}`),
  checkpointCreate: (workspace: string, label: string) =>
    j<{ success: boolean; checkpoints: { runId: string; at: number; label: string }[] }>(`${BASE}/api/ide/checkpoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, label }),
    }),
  checkpointRestore: (workspace: string, runId?: string) =>
    j<{ success: boolean; restored: number; removed: number }>(`${BASE}/api/ide/checkpoints/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, ...(runId ? { runId } : {}) }),
    }),
  checkpointCommit: (workspace: string) =>
    j<{ success: boolean; checkpoints: { runId: string; at: number; label: string }[] }>(`${BASE}/api/ide/checkpoints/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace }),
    }),
  runCommand: (workspace: string, command: string) =>
    j<RunResult>(`${BASE}/api/ide/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, command }),
    }),
  terminalStart: (workspace: string, command: string) =>
    j<{ runId: string }>(`${BASE}/api/ide/terminal/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, command }),
    }),
  terminalKill: (runId: string) =>
    j<{ success: boolean }>(`${BASE}/api/ide/terminal/kill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId }),
    }),
  terminalStreamUrl: (runId: string) => `${BASE}/api/ide/terminal/stream/${runId}`,
  search: (workspace: string, q: string, root?: string) =>
    j<SearchResult[]>(
      `${BASE}/api/ide/search?workspace=${encodeURIComponent(workspace)}&q=${encodeURIComponent(q)}${root ? `&root=${root}` : ''}`
    ),
  replaceInFiles: (workspace: string, search: string, replace: string) =>
    j<{ files: number; replacements: number }>(`${BASE}/api/ide/replace`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, search, replace }),
    }),
  semanticSearch: (workspace: string, q: string, limit = 8) =>
    j<{ results: (SearchResult & { snippet?: string })[] }>(`${BASE}/api/ide/index/semantic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, q, limit }),
    }),
  imports: () => j<ImportGraph>(`${BASE}/api/ide/imports`),
  indexGraph: (workspace: string, opts: { node?: string; depth?: number; type?: string } = {}) =>
    j<{ nodes: { id: string; label: string; kind: string; file?: string; line?: number; signature?: string }[]; edges: { from: string; to: string; type: string }[] }>(
      `${BASE}/api/ide/index/graph?workspace=${encodeURIComponent(workspace)}${opts.node ? `&node=${encodeURIComponent(opts.node)}` : ''}${opts.depth ? `&depth=${opts.depth}` : ''}${opts.type ? `&type=${opts.type}` : ''}`
    ),
  indexStats: (workspace: string) =>
    j<{ stats: { files: number; symbols: number; routes: number; apis: number; database: number; deps: number; envVars: number; edges: number }; updatedAt: number }>(
      `${BASE}/api/ide/index?workspace=${encodeURIComponent(workspace)}`
    ),
  indexSearch: (workspace: string, q: string, kind?: string) =>
    j<{ results: { id: string; name: string; kind: string; file: string; line: number; signature: string }[] }>(
      `${BASE}/api/ide/index/search?workspace=${encodeURIComponent(workspace)}&q=${encodeURIComponent(q)}${kind ? `&kind=${encodeURIComponent(kind)}` : ''}`
    ),
  fileSymbols: (workspace: string, file: string) =>
    j<{ results: { id: string; name: string; kind: string; line: number; signature: string }[] }>(
      `${BASE}/api/ide/index/file-symbols?workspace=${encodeURIComponent(workspace)}&file=${encodeURIComponent(file)}`
    ),
  buildContext: (workspace: string, task: string, opts: { history?: string; memory?: string; refFiles?: string[]; budget?: number } = {}) =>
    j<{
      text: string;
      chars: number;
      files: { path: string; line: number | null; score: number | null; reason: string }[];
      symbols: string[];
      routes: { method: string; path: string; file: string }[];
      apis: { url: string; file: string }[];
      env: { name: string; defaultValue?: string }[];
      deps: string[];
      database: { engine: string; kind: string; file: string }[];
      hits: { file: string; line: number; score: number }[];
    }>(`${BASE}/api/ide/context/build`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, task, ...opts }),
    }),
  memory: (workspace: string) => j<MemoryData>(`${BASE}/api/ide/memory?workspace=${encodeURIComponent(workspace)}`),
  saveMemory: (workspace: string, markdown: string, structured?: MemoryData['structured']) =>
    j<{ success: boolean }>(`${BASE}/api/ide/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, markdown, structured }),
    }),
  previewUrl: (workspace: string) => `${BASE}/api/ide/preview/${encodeURIComponent(workspace)}/`,
  getDiff: (workspace: string) =>
    j<{ path: string; added: number; removed: number; hunks: { oldStart: number; oldLines: string[]; newStart: number; newLines: string[] }[]; oldContent?: string }[]>(
      `${BASE}/api/ide/diff?workspace=${encodeURIComponent(workspace)}`
    ),
  acceptDiff: (workspace: string, path: string) =>
    j<{ success: boolean }>(`${BASE}/api/ide/diff/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, path }),
    }),
  rejectDiff: (workspace: string, path: string) =>
    j<{ success: boolean }>(`${BASE}/api/ide/diff/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, path }),
    }),
  hunkDiff: (workspace: string, path: string, index: number, action: 'accept' | 'reject') =>
    j<{ success: boolean }>(`${BASE}/api/ide/diff/hunk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, path, index, action }),
    }),
  resetDiff: (workspace: string) =>
    j<{ success: boolean }>(`${BASE}/api/ide/diff/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace }),
    }),
  rollbackRun: (workspace: string, runId?: string) =>
    j<{ success: boolean; restored: number; removed: number }>(`${BASE}/api/ide/agents/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, ...(runId ? { runId } : {}) }),
    }),
  agentConfirm: (runId: string, decision: 'allow' | 'skip') =>
    j<{ ok: boolean }>(`${BASE}/api/ide/agents/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId, decision }),
    }),
  agentRuns: (workspace: string, limit = 20) =>
    j<{ runs: AgentRun[] }>(`${BASE}/api/ide/agents/runs?workspace=${encodeURIComponent(workspace)}&limit=${limit}`),
  agentSubAgents: (workspace: string, parentRunId: string) =>
    j<{ subAgents: SubAgent[] }>(`${BASE}/api/ide/agents/sub-status?workspace=${encodeURIComponent(workspace)}&parentRunId=${encodeURIComponent(parentRunId)}`),
  agentCancelSubAgent: (workspace: string, runId: string) =>
    j<{ ok: boolean }>(`${BASE}/api/ide/agents/sub-cancel`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, runId }),
    }),
  agentPause: (workspace: string) =>
    j<{ success: boolean; paused: boolean }>(`${BASE}/api/ide/agents/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace }),
    }),
  agentRunDelete: (runId: string) =>
    j<{ success: boolean }>(`${BASE}/api/ide/agents/runs/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId }),
    }),
  cancelPipeline: (workspace: string) =>
    j<{ success: boolean; cancelled: boolean }>(`${BASE}/api/ide/agents/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace }),
    }),
  completion: (workspace: string, path: string, text: string, cursor: number) => {
    const prefix = text.slice(0, cursor);
    const suffix = text.slice(cursor);
    return j<{ text: string; model?: string; candidates?: { text: string; multiLine: boolean }[] }>(`${BASE}/api/ide/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, path, text, cursor, prefix, suffix }),
    });
  },
  chat: (workspace: string) =>
    j<{ messages: { role: 'user' | 'assistant'; content: string; at: number; files?: string[] }[] }>(
      `${BASE}/api/ide/chat?workspace=${encodeURIComponent(workspace)}`
    ),
  createLiveTask: (workspace: string, goal: string) =>
    j<{ task: { id: string; state: string; createdAt: string } }>(`${BASE}/api/ide/tasks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace, goal }),
    }),
  liveTasks: (workspace: string) => j<{ tasks: any[] }>(`${BASE}/api/ide/tasks?workspace=${encodeURIComponent(workspace)}`),
  liveTask: (id: string) => j<{ task: any }>(`${BASE}/api/ide/tasks/${encodeURIComponent(id)}`),
  liveTaskEventsUrl: (id: string) => `${BASE}/api/ide/tasks/${encodeURIComponent(id)}/events`,
  steerLiveTask: (id: string, message: string) =>
    j<{ steering: any }>(`${BASE}/api/ide/tasks/${encodeURIComponent(id)}/steer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) }),
  controlLiveTask: (id: string, action: 'stop' | 'pause' | 'resume') =>
    j<{ ok: boolean; state: string }>(`${BASE}/api/ide/tasks/${encodeURIComponent(id)}/control`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) }),
  approveLiveTask: (id: string, decision: 'approve' | 'deny', scope: 'once' | 'workspace', action: string, details = '') =>
    j<{ approval: any; policies: Record<string, boolean> }>(`${BASE}/api/ide/tasks/${encodeURIComponent(id)}/approval`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, scope, action, details }) }),
  clearChat: (workspace: string) =>
    j<{ success: boolean }>(`${BASE}/api/ide/chat/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace }),
    }),
  projectRules: (workspace: string) =>
    j<{ content: string; file: string }>(`${BASE}/api/ide/project-rules?workspace=${encodeURIComponent(workspace)}`),
  saveProjectRules: (workspace: string, content: string) =>
    j<{ success: boolean }>(`${BASE}/api/ide/project-rules`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, content }),
    }),
  envVars: (workspace: string) =>
    j<{ vars: { key: string; value: string }[] }>(`${BASE}/api/ide/env?workspace=${encodeURIComponent(workspace)}`),
  saveEnvVars: (workspace: string, vars: { key: string; value: string }[]) =>
    j<{ success: boolean }>(`${BASE}/api/ide/env`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, vars }),
    }),
  chatMessage(
    workspace: string,
    message: string,
    history: { role: 'user' | 'assistant'; content: string }[],
    onDelta: (delta: string) => void,
    onDone: (full: string) => void,
    onError: (msg: string) => void,
    imageUrls: string[] = [],
  ) {
    const controller = new AbortController();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/ide/chat-message`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ workspace, message, history, imageUrls }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) { onError(`HTTP ${res.status}`); onDone(''); return; }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let full = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buf.indexOf('\n')) !== -1) {
            const line = buf.slice(0, idx); buf = buf.slice(idx + 1);
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            try {
              const ev = JSON.parse(payload);
              if (ev.event === 'delta' && ev.delta) { full += ev.delta; onDelta(ev.delta); }
              else if (ev.event === 'done') { onDone(ev.content || full); return; }
              else if (ev.event === 'error') { onError(ev.message || 'unknown error'); onDone(full); return; }
            } catch {}
          }
        }
        onDone(full);
      } catch (err: any) {
        if (err?.name !== 'AbortError') onError(String(err?.message || err));
        onDone('');
      }
    })();
    return controller;
  },
  templates: () => j<TemplateInfo[]>(`${BASE}/api/ide/templates`),
  capabilities: () => j<CapabilitySnapshot>(`${BASE}/api/ide/capabilities`),
  sessionUsage: (hours = 24) =>
    j<{ tokensIn: number; tokensOut: number; totalTokens: number; calls: number; hours: number }>(`${BASE}/api/ide/usage/session?hours=${hours}`),
  scaffoldTemplate: (name: string, template: string) =>
    j<{ success: boolean; name: string; template: string }>(`${BASE}/api/ide/template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, template }),
    }),
  cloneRepo: (url: string, name?: string) =>
    j<{ success: boolean; name: string }>(`${BASE}/api/ide/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, name }),
    }),
  importFolder: (name: string, files: { path: string; content: string }[], workspace?: string) =>
    j<{ success: boolean; name: string; fileCount: number }>(`${BASE}/api/ide/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, files, workspace }),
    }),
  getCompletionsModel: () => j<{ completionsModelId: string }>(`${BASE}/api/ide/completions-model`),
  saveCompletionsModel: (completionsModelId: string) =>
    j<{ success: boolean; completionsModelId: string }>(`${BASE}/api/ide/completions-model`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completionsModelId }),
    }),
  getCloudSettings: () => j<{ cloudEnabled: boolean; openrouterModel: string; keySet: boolean; keyMasked: string }>(`${BASE}/api/ide/cloud-settings`),
  saveCloudSettings: (payload: { cloudEnabled: boolean; openrouterModel: string; openrouterKey: string }) =>
    j<{ success: boolean; cloudEnabled: boolean; openrouterModel: string; keySet: boolean; keyMasked: string }>(`${BASE}/api/ide/cloud-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  testCloudSettings: () =>
    j<{ ok: boolean; message: string; latencyMs?: number }>(`${BASE}/api/ide/cloud-settings/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),
  registerLocalFolder: (root: string, name?: string) =>
    j<{ success: boolean; name: string; root: string }>(`${BASE}/api/ide/local-workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ root, name }),
    }),
  getLocalWorkspaces: () => j<{ name: string; root: string }[]>(`${BASE}/api/ide/local-workspaces`),
  unregisterLocalFolder: (name: string) =>
    j<{ success: boolean }>(`${BASE}/api/ide/local-workspaces/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    }),
  moveFile: (workspace: string, from: string, to: string) =>
    j<{ success: boolean }>(`${BASE}/api/ide/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, from, to }),
    }),
  createFolder: (workspace: string, path: string) =>
    j<{ success: boolean }>(`${BASE}/api/ide/folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, path }),
    }),
  gitStatus: (workspace: string) =>
    j<{ isRepo: boolean; branch: string | null; status: { flag: string; file: string; added: number | null; removed: number | null; untracked?: boolean }[]; output: string }>(
      `${BASE}/api/ide/git?workspace=${encodeURIComponent(workspace)}`
    ),
  gitAction: (workspace: string, action: 'commit' | 'push' | 'pull' | 'init', message?: string) =>
    j<{ success: boolean; output: string }>(`${BASE}/api/ide/git`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, action, message }),
    }),
  gitDiff: (workspace: string, path?: string) =>
    j<{ files?: GitDiffFile[]; file?: GitDiffFile | null }>(
      `${BASE}/api/ide/git/diff?workspace=${encodeURIComponent(workspace)}${path ? `&path=${encodeURIComponent(path)}` : ''}`
    ),
  gitHunk: (workspace: string, path: string, index: number, action: 'accept' | 'reject') =>
    j<{ success: boolean }>(`${BASE}/api/ide/git/hunk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, path, index, action }),
    }),
  gitLog: (workspace: string) =>
    j<{ commits: { hash: string; author: string; date: string; message: string }[] }>(
      `${BASE}/api/ide/git/log?workspace=${encodeURIComponent(workspace)}`
    ),
  gitBranches: (workspace: string) =>
    j<{ branches: string[]; current: string | null }>(`${BASE}/api/ide/git/branches?workspace=${encodeURIComponent(workspace)}`),
  gitBranch: (workspace: string, name: string, action: 'create' | 'checkout') =>
    j<{ success: boolean; output?: string }>(`${BASE}/api/ide/git/branch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, name, action }),
    }),
  gitSuggestMessage: (workspace: string) =>
    j<{ message: string }>(`${BASE}/api/ide/git/suggest-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace }),
    }),
  deploy: (workspace: string, force = false) =>
    j<{ success: boolean; deployed: boolean; workspace: string; port?: number; url?: string; lanUrls?: string[]; shareUrl?: string | null; sharePending?: boolean; status?: string; kind?: string }>(
      `${BASE}/api/ide/deploy`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace, force }),
      }
    ),
  deployDocker: (workspace: string, force = false) =>
    j<{ success: boolean; deployed: boolean; workspace: string; port?: number; url?: string; lanUrls?: string[]; shareUrl?: string | null; sharePending?: boolean; status?: string; kind?: string }>(
      `${BASE}/api/ide/deploy/docker`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace, force }),
      }
    ),
  deployStatus: (workspace: string) =>
    j<{ deployed: boolean; workspace: string; port?: number; url?: string; lanUrls?: string[]; shareUrl?: string | null; sharePending?: boolean; status: string; kind?: string; provider?: string | null; output?: string }>(
      `${BASE}/api/ide/deploy?workspace=${encodeURIComponent(workspace)}`
    ),
  deployHosted: (workspace: string, provider: string, force = false) =>
    j<{ success: boolean; deployed: boolean; workspace: string; provider?: string | null; url?: string; shareUrl?: string | null; sharePending?: boolean; status?: string; kind?: string; output?: string }>(
      `${BASE}/api/ide/deploy/hosted`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace, provider, force }),
      }
    ),
  stopDeploy: (workspace: string) =>
    j<{ success: boolean }>(`${BASE}/api/ide/deploy/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace }),
    }),
  deployWake: (workspace: string) =>
    j<{ success: boolean; deployed: boolean; status: string; kind?: string; error?: string }>(`${BASE}/api/ide/deploy/wake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace }),
    }),
  runPipeline: (
    workspace: string,
    task: string,
    onStep: (payload: any) => void,
    onLog: (payload: any) => void,
    onDone: (payload: any) => void,
    onError: (message: string) => void,
    contextFiles: string[] = [],
    onStream?: (payload: { path: string; chunk: string; index: number; total: number }) => void,
    resumeRunId?: string,
    contextSymbols: string[] = [],
    onThinking?: (payload: { text: string; done?: boolean }) => void,
    onReasoning?: (payload: { text: string; agent?: string }) => void,
    taskSessionId?: string,
    onApprovalRequest?: (payload: { action: string; title?: string; reason?: string; risk?: string; taskSessionId?: string }) => void,
  ) => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/ide/agents/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspace, task, autoBuild: true, autoTest: true, maxRetries: 10, contextFiles, contextSymbols, ...(resumeRunId ? { resumeRunId } : {}), ...(taskSessionId ? { taskSessionId } : {}) }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as any).error || `HTTP ${res.status}`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';
          for (const evt of events) {
            const line = evt.split('\n').find((l) => l.startsWith('data: '));
            if (!line) continue;
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.event === 'step') onStep(payload);
              else if (payload.event === 'log') onLog(payload);
              else if (payload.event === 'done') onDone(payload);
              else if (payload.event === 'stream' && onStream) onStream(payload);
              else if (payload.event === 'thinking' && onThinking) onThinking(payload);
              else if (payload.event === 'reasoning' && onReasoning) onReasoning(payload);
              else if (payload.event === 'approval_request' && onApprovalRequest) onApprovalRequest(payload);
            } catch {}
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        onError(String(err.message || err));
      }
    })();
    return controller;
  },
  runToolAgent: (
    workspace: string,
    task: string,
    onStep: (payload: any) => void,
    onLog: (payload: any) => void,
    onDone: (payload: any) => void,
    onError: (message: string) => void,
    contextFiles: string[] = [],
    contextSymbols: string[] = [],
    requirePermissions = false,
    onConfirm?: (payload: any) => void,
    onThinking?: (payload: { text: string; done?: boolean }) => void,
    onReasoning?: (payload: { text: string; agent?: string }) => void,
  ) => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/ide/agents/tool-run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspace, task, contextFiles, contextSymbols, requirePermissions }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as any).error || `HTTP ${res.status}`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';
          for (const evt of events) {
            const line = evt.split('\n').find((l) => l.startsWith('data: '));
            if (!line) continue;
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.event === 'step') onStep(payload);
              else if (payload.event === 'log') onLog(payload);
              else if (payload.event === 'done') onDone(payload);
              else if (payload.event === 'confirm' && onConfirm) onConfirm(payload);
              else if (payload.event === 'thinking' && onThinking) onThinking(payload);
              else if (payload.event === 'reasoning' && onReasoning) onReasoning(payload);
            } catch {}
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        onError(String(err.message || err));
      }
    })();
    return controller;
  },
  fixRun: (
    workspace: string,
    command: string,
    maxRounds: number,
    onStep: (payload: any) => void,
    onLog: (payload: any) => void,
    onDone: (payload: any) => void,
    onError: (message: string) => void
  ) => {    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/ide/fix/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspace, command, maxRounds }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as any).error || `HTTP ${res.status}`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';
          for (const evt of events) {
            const line = evt.split('\n').find((l) => l.startsWith('data: '));
            if (!line) continue;
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.event === 'step') onStep(payload);
              else if (payload.event === 'log') onLog(payload);
              else if (payload.event === 'done') onDone(payload);
            } catch {}
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        onError(String(err.message || err));
      }
    })();
    return controller;
  },
  mcpList: () => j<{ servers: { id: string; name: string; url: string; headers?: Record<string, string> }[] }>(`${BASE}/api/ide/mcp/servers`),
  rulesList: (workspace: string) =>
    j<{ rules: { name: string; glob: string | null; apply: 'always' | 'auto'; description: string; content: string; path: string; level: string }[] }>(
      `${BASE}/api/ide/rules?workspace=${encodeURIComponent(workspace)}`
    ),
  rulesSave: (workspace: string, rule: { name: string; content: string; glob?: string; apply?: string; description?: string }) =>
    j<{ ok: boolean; rule: { name: string; glob: string | null; apply: 'always' | 'auto'; description: string; content: string; path: string; level: string } }>(
      `${BASE}/api/ide/rules`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace, ...rule }),
      }
    ),
  rulesDelete: (workspace: string, name: string) =>
    j<{ ok: boolean }>(`${BASE}/api/ide/rules?workspace=${encodeURIComponent(workspace)}&name=${encodeURIComponent(name)}`, { method: 'DELETE' }),
  skillsList: (workspace: string) =>
    j<{ skills: { slug: string; name: string; description: string; tags: string[]; enabled: boolean; glob: string | null; content: string; path: string }[] }>(
      `${BASE}/api/ide/skills?workspace=${encodeURIComponent(workspace)}`
    ),
  skillsSave: (workspace: string, skill: { name: string; content: string; description?: string; tags?: string[]; enabled?: boolean; glob?: string }) =>
    j<{ ok: boolean; skill: { slug: string; name: string; description: string; tags: string[]; enabled: boolean; glob: string | null; content: string } }>(
      `${BASE}/api/ide/skills`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace, ...skill }),
      }
    ),
  skillsDelete: (workspace: string, name: string) =>
    j<{ ok: boolean }>(`${BASE}/api/ide/skills?workspace=${encodeURIComponent(workspace)}&name=${encodeURIComponent(name)}`, { method: 'DELETE' }),
  workflowsList: (workspace: string) =>
    j<{ workflows: { slug: string; name: string; description: string; steps: { title: string; prompt: string }[]; updatedAt: number }[] }>(
      `${BASE}/api/ide/workflows?workspace=${encodeURIComponent(workspace)}`
    ),
  workflowsSave: (workspace: string, workflow: { name: string; description?: string; steps: { title: string; prompt: string }[] }) =>
    j<{ ok: boolean }>(`${BASE}/api/ide/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, ...workflow }),
    }),
  workflowsDelete: (workspace: string, name: string) =>
    j<{ ok: boolean }>(`${BASE}/api/ide/workflows?workspace=${encodeURIComponent(workspace)}&name=${encodeURIComponent(name)}`, { method: 'DELETE' }),
  workflowsRun: (workspace: string, name: string, onEvent: (ev: any) => void, onDone: (ev: any) => void, onError: (msg: string) => void) => {
    fetch(`${BASE}/api/ide/workflows/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, name }),
    })
      .then((r) => {
        if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);
        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        const pump = (): void => {
          reader.read().then(({ done, value }) => {
            if (done) return;
            buf += decoder.decode(value, { stream: true });
            let idx;
            while ((idx = buf.indexOf('\n\n')) >= 0) {
              const block = buf.slice(0, idx);
              buf = buf.slice(idx + 2);
              const m = block.match(/^data: (.*)$/m);
              if (m) {
                try {
                  const ev = JSON.parse(m[1]);
                  if (ev.type === 'done') onDone(ev);
                  else onEvent(ev);
                } catch {}
              }
            }
            pump();
          }).catch((err) => onError(String(err.message || err)));
        };
        pump();
      })
      .catch((err) => onError(String(err.message || err)));
  },
  tsSymbol: (workspace: string, file: string, line: number, col: number) =>
    j<{
      ts: boolean;
      symbol?: {
        name: string;
        kind: string | null;
        signature: string | null;
        docComment: string | null;
        defLine: number;
        defCol: number;
        local: boolean;
        unresolved?: boolean;
      } | null;
      word?: { word: string } | null;
    }>(`${BASE}/api/ide/ts/symbol`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, file, line, col }),
    }),
  tsReferences: (workspace: string, file: string, line: number, col: number) =>
    j<{
      ts: boolean;
      symbol?: { name: string; kind: string | null; defLine: number; local: boolean } | null;
      references?: { line: number; col: number; isDeclaration: boolean; text: string }[];
      total?: number;
    }>(`${BASE}/api/ide/ts/references`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, file, line, col }),
    }),
  tsRename: (workspace: string, file: string, line: number, col: number, newName: string) =>
    j<{ ok: boolean; name: string; renameTo: string; changedFiles: { path: string; replacements: number }[]; count: number }>(
      `${BASE}/api/ide/ts/rename`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace, file, line, col, newName }),
      }
    ),
  mcpAdd: (name: string, url: string, headers?: Record<string, string>) =>
    j<{ success: boolean; server: { id: string; name: string; url: string; headers?: Record<string, string> } }>(`${BASE}/api/ide/mcp/servers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url, headers }),
    }),
  mcpRemove: (id: string) =>
    j<{ success: boolean }>(`${BASE}/api/ide/mcp/servers/${id}`, { method: 'DELETE' }),
  mcpTest: (id: string) =>
    j<{
      success: boolean;
      error?: string;
      serverInfo?: { name?: string; version?: string } | null;
      tools?: { name: string; description: string; inputSchema?: any }[];
    }>(`${BASE}/api/ide/mcp/servers/${id}/test`, { method: 'POST' }),
  webFetch: (url?: string, query?: string) =>
    j<{ content: string; source: string }>(`${BASE}/api/ide/web-fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, query }),
    }),
  suggestIterations: (workspace: string, files: string[], task: string) =>
    j<{ suggestions: string[] }>(`${BASE}/api/ide/suggest-iterations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, files, task }),
    }),
  formatFile: (workspace: string, path: string, content: string) =>
    j<{ ok: boolean; content?: string; reason?: string }>(`${BASE}/api/ide/format`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, path, content }),
    }),
  exportZipUrl: (workspace: string) =>
    `${BASE}/api/ide/export-zip?workspace=${encodeURIComponent(workspace)}`,
  // ── Terminal share (SSH tunnel) ──────────────────────────────────────────────
  shareTerminalStart: (workspace: string, port: number) =>
    j<{ ok: boolean; shareUrl: string | null; sharePending: boolean }>(`${BASE}/api/ide/share-terminal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, port }),
    }),
  shareTerminalStatus: (workspace: string, port: number) =>
    j<{ ok: boolean; shareUrl: string | null; sharePending: boolean }>(`${BASE}/api/ide/share-terminal?workspace=${encodeURIComponent(workspace)}&port=${port}`),
  shareTerminalStop: (workspace: string, port: number) =>
    j<{ ok: boolean }>(`${BASE}/api/ide/share-terminal/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, port }),
    }),
  // ── DAP Debugger ────────────────────────────────────────────────────────────
  debugSessions: () => j<{ sessions: any[] }>(`${BASE}/api/ide/debug/sessions`),
  debugStart: (workspace: string, file: string, args: string[] = [], lang?: string) =>
    j<{ ok: boolean; debugId: string; pid: number; port: number; lang: string }>(`${BASE}/api/ide/debug/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, file, args, lang }),
    }),
  debugStop: (debugId: string) =>
    j<{ ok: boolean }>(`${BASE}/api/ide/debug/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ debugId }),
    }),
  debugBreakpoint: (debugId: string, file: string, line: number, remove = false) =>
    j<{ ok: boolean; breakpointId?: string }>(`${BASE}/api/ide/debug/breakpoint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ debugId, file, line, remove }),
    }),
  debugContinue: (debugId: string) =>
    j<{ ok: boolean }>(`${BASE}/api/ide/debug/continue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ debugId }),
    }),
  debugStep: (debugId: string) =>
    j<{ ok: boolean }>(`${BASE}/api/ide/debug/step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ debugId }),
    }),
  debugStepIn: (debugId: string) =>
    j<{ ok: boolean }>(`${BASE}/api/ide/debug/step-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ debugId }),
    }),
  debugStepOut: (debugId: string) =>
    j<{ ok: boolean }>(`${BASE}/api/ide/debug/step-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ debugId }),
    }),
  debugStack: (debugId: string) =>
    j<{ ok: boolean; paused: boolean; stack: any[] }>(`${BASE}/api/ide/debug/stack?debugId=${encodeURIComponent(debugId)}`),
  debugVariables: (debugId: string) =>
    j<{ ok: boolean; variables: any[] }>(`${BASE}/api/ide/debug/variables?debugId=${encodeURIComponent(debugId)}`),
  debugStatus: (debugId: string) =>
    j<{ ok: boolean; status: string; paused: boolean; pausedFrame: any; output: any[] }>(`${BASE}/api/ide/debug/status?debugId=${encodeURIComponent(debugId)}`),
  // ── GitHub OAuth Device Flow ──────────────────────────────────────────────────
  githubDeviceStart: () =>
    j<{ ok: boolean; deviceCode: string; userCode: string; verificationUri: string }>(`${BASE}/api/ide/github/device-start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }),
  githubDevicePoll: (deviceCode: string) =>
    j<{ ok: boolean; accessToken?: string; login?: string; name?: string; email?: string; pending?: boolean; expired?: boolean; error?: string }>(`${BASE}/api/ide/github/device-poll`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceCode }),
    }),
  githubPush: (workspace: string, accessToken: string, repoUrl: string, branch?: string, message?: string) =>
    j<{ ok: boolean; branch?: string; repoUrl?: string; error?: string }>(`${BASE}/api/ide/github/push`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, accessToken, repoUrl, branch, message }),
    }),

  // ── Package Installer ────────────────────────────────────────────────────
  packagesInstalled: (workspace: string) =>
    j<{ packages: { name: string; version: string; dev: boolean; manager: 'npm' | 'pip' | 'cargo' | 'go' }[] }>(
      `${BASE}/api/ide/packages/installed?workspace=${encodeURIComponent(workspace)}`
    ),
  packagesSearch: (workspace: string, q: string, manager: 'npm' | 'pip' | 'cargo' | 'go' = 'npm') =>
    j<{ results: { name: string; version: string; description: string; manager: string }[] }>(
      `${BASE}/api/ide/packages/search?workspace=${encodeURIComponent(workspace)}&q=${encodeURIComponent(q)}&manager=${manager}`
    ),
  packageInstall: (workspace: string, name: string, version?: string, dev?: boolean, manager?: string) =>
    j<{ ok: boolean; output: string; cmd: string }>(`${BASE}/api/ide/packages/install`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, name, version, dev, manager }),
    }),
  packageUninstall: (workspace: string, name: string, manager?: string) =>
    j<{ ok: boolean; output: string; cmd: string }>(`${BASE}/api/ide/packages/uninstall`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, name, manager }),
    }),

  // ── Test Generation (SSE) ────────────────────────────────────────────────
  generateTestsUrl: (workspace: string) => `${BASE}/api/ide/tests/generate`,
  generateTests: (workspace: string, files: string[], signal?: AbortSignal): Promise<AbortController> => {
    const controller = new AbortController();
    return Promise.resolve(controller);
  },

  // ── Database GUI ──────────────────────────────────────────────────────────
  dbTables: (workspace: string) =>
    j<{ tables: { name: string; rowCount: number; columns: { name: string; type: string; pk: boolean }[] }[]; exists: boolean }>(
      `${BASE}/api/ide/db/tables?workspace=${encodeURIComponent(workspace)}`
    ),
  dbTable: (workspace: string, name: string, offset = 0, limit = 100) =>
    j<{ columns: string[]; rows: Record<string, unknown>[]; total: number; offset: number; limit: number }>(
      `${BASE}/api/ide/db/table/${encodeURIComponent(name)}?workspace=${encodeURIComponent(workspace)}&offset=${offset}&limit=${limit}`
    ),
  dbQuery: (workspace: string, sql: string) =>
    j<{ ok: boolean; rows: Record<string, unknown>[]; columns: string[]; rowCount?: number; changes?: number; error?: string }>(
      `${BASE}/api/ide/db/query`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace, sql }),
      }
    ),
  dbCreate: (workspace: string) =>
    j<{ ok: boolean; path: string; databaseUrl: string }>(`${BASE}/api/ide/db/create`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace }),
    }),
  dbHostedStatus: (workspace: string) =>
    j<{ connected: boolean; status?: string; urlMasked?: string; provider?: string | null; provisioned?: boolean; tables?: { name: string; rowCount: number; columns: { name: string; type: string; pk: boolean }[] }[]; output?: string }>(
      `${BASE}/api/ide/db/hosted?workspace=${encodeURIComponent(workspace)}`
    ),
  dbHostedConnect: (workspace: string, url?: string) =>
    j<{ ok: boolean; connected: boolean; status: string; urlMasked: string; tables: { name: string; rowCount: number; columns: { name: string; type: string; pk: boolean }[] }[]; output: string }>(
      `${BASE}/api/ide/db/hosted/connect`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace, url }),
      }
    ),
  dbHostedQuery: (workspace: string, sql: string) =>
    j<{ ok: boolean; rows: Record<string, unknown>[]; columns: string[]; rowCount?: number; changes?: number; error?: string }>(
      `${BASE}/api/ide/db/hosted/query`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace, sql }),
      }
    ),
  dbHostedProvision: (workspace: string, provider: string) =>
    j<{ ok: boolean; status: string }>(`${BASE}/api/ide/db/hosted/provision`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, provider }),
    }),
  dbHostedDisconnect: (workspace: string) =>
    j<{ ok: boolean }>(`${BASE}/api/ide/db/hosted`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace }),
    }),
  collabInvite: (workspace: string, readOnly = false) =>
    j<{ token: string; url: string; workspace: string; readOnly: boolean }>(`${BASE}/api/ide/collab/invite`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, readOnly }),
    }),
  collabValidateInvite: (token: string) =>
    j<{ workspace: string; readOnly: boolean }>(`${BASE}/api/ide/collab/invite/${token}`),
  collabPeers: (workspace: string) =>
    j<{ count: number }>(`${BASE}/api/ide/collab/peers?workspace=${encodeURIComponent(workspace)}`),
  designFromImage: (image: string, opts?: { name?: string; description?: string; workspace?: string }) =>
    j<{ ok: boolean; workspace: string; files: string[]; previewUrl: string }>(`${BASE}/api/ide/design/from-image`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, ...(opts || {}) }),
    }),
  communityTemplates: () =>
    j<{ templates: { id: string; name: string; description: string; repoUrl: string; tags: string[]; category: string }[] }>(`${BASE}/api/ide/templates/community`),

  // ── API Test Panel ──────────────────────────────────────────────────────────
  apiRoutes: (workspace: string) =>
    j<{ routes: { method: string; path: string; file: string }[] }>(`${BASE}/api/ide/api-routes?workspace=${encodeURIComponent(workspace)}`),
  apiTest: (workspace: string, method: string, path: string, headers: Record<string, string>, body: unknown, port?: number) =>
    j<{ ok: boolean; status: number; statusText: string; latency: number; body: string; headers: Record<string, string>; error?: string }>(
      `${BASE}/api/ide/api-test`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace, method, path, headers, body, port }) }
    ),

  // ── Notebook / Cell Mode ────────────────────────────────────────────────────
  cellParse: (workspace: string, file: string) =>
    j<{ cells: { id: number; title: string; source: string; startLine: number }[]; file: string; lang: string }>(
      `${BASE}/api/ide/cell/parse?workspace=${encodeURIComponent(workspace)}&file=${encodeURIComponent(file)}`
    ),
  cellRun: (workspace: string, code: string, lang: string) =>
    j<{ ok: boolean; output: string; exitCode: number }>(`${BASE}/api/ide/cell/run`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace, code, lang }),
    }),

  // ── Plugins ────────────────────────────────────────────────────────────────
  pluginsList: (workspace: string) =>
    j<{ plugins: { id: string; name: string; description: string; version: string; npmPackage: string | null; installedAt: string }[] }>(
      `${BASE}/api/ide/plugins?workspace=${encodeURIComponent(workspace)}`
    ),
  pluginsInstall: (workspace: string, id: string, name: string, description: string, version: string, npmPackage?: string) =>
    j<{ ok: boolean; plugins: any[]; output?: string; error?: string }>(`${BASE}/api/ide/plugins/install`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, id, name, description, version, npmPackage }),
    }),
  pluginsUninstall: (workspace: string, id: string) =>
    j<{ ok: boolean }>(`${BASE}/api/ide/plugins/${encodeURIComponent(id)}?workspace=${encodeURIComponent(workspace)}`, {
      method: 'DELETE',
    }),

  // ── Performance Profiler ───────────────────────────────────────────────────
  profileStart: (workspace: string, file: string, lang: string) =>
    j<{ ok: boolean; message?: string; error?: string }>(`${BASE}/api/ide/profile/start`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace, file, lang }),
    }),
  profileStop: (workspace: string) =>
    j<{ ok: boolean; result?: { output: string; duration: number; lang: string; file: string; at: number }; error?: string }>(
      `${BASE}/api/ide/profile/stop`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace }) }
    ),
  profileResult: (workspace: string) =>
    j<{ result: { output: string; duration: number; lang: string; file: string; at: number } | null }>(
      `${BASE}/api/ide/profile/result?workspace=${encodeURIComponent(workspace)}`
    ),

  // ── REA (Reverse Engineer Anything) static analysis ─────────────────────────
  reaStatus: () =>
    j<{ available: boolean; binPath: string | null; version: string | null; resultsDir: string }>(`${BASE}/api/ide/rea/status`),
  reaKinds: () =>
    j<{ kinds: { id: string; label: string; description: string; target: 'workspace' | 'optional' | 'none' | 'browser'; timeoutMs: number; options: { name: string; flag: string; type: string }[] }[] }>(
      `${BASE}/api/ide/rea/kinds`
    ),
  reaAnalyze: (payload: {
    kind: string;
    workspace?: string;
    path?: string;
    endpoint?: string;
    targetId?: string;
    options?: Record<string, unknown>;
  }) =>
    j<{ job: ReaJob }>(`${BASE}/api/ide/rea/analyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    }),
  reaJobs: () => j<{ jobs: ReaJob[] }>(`${BASE}/api/ide/rea/jobs`),
  reaJob: (id: string) => j<{ job: ReaJob }>(`${BASE}/api/ide/rea/jobs/${encodeURIComponent(id)}`),
  reaJobResultUrl: (id: string) => `${BASE}/api/ide/rea/jobs/${encodeURIComponent(id)}/result`,
  reaCancel: (id: string) =>
    j<{ ok: boolean }>(`${BASE}/api/ide/rea/jobs/${encodeURIComponent(id)}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }),

  // ── SSH Workspace ──────────────────────────────────────────────────────────
  sshList: () =>
    j<{ profiles: { id: string; host: string; port: number; user: string; keyPath: string | null; savedAt: string }[] }>(`${BASE}/api/ide/ssh/list`),
  sshConnect: (host: string, port: number, user: string, keyPath?: string) =>
    j<{ ok: boolean; files?: string[]; profile?: any; error?: string }>(`${BASE}/api/ide/ssh/connect`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host, port, user, keyPath }),
    }),
  sshSync: (workspace: string, host: string, port: number, user: string, keyPath: string | undefined, remotePath: string) =>
    j<{ ok: boolean; output?: string; error?: string }>(`${BASE}/api/ide/ssh/sync`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, host, port, user, keyPath, remotePath }),
    }),

  // ── Real SSH / SFTP file system ───────────────────────────────────────────
  sftpSessions: () =>
    j<{ sessions: { sessionId: string; host: string; port: number; username: string; connectedAt: number }[] }>(`${BASE}/api/ide/ssh/sessions`),
  sftpConnect: (host: string, port: number, username: string, password?: string, privateKey?: string) =>
    j<{ ok: boolean; sessionId: string; host: string; port: number; username: string }>(`${BASE}/api/ide/ssh/connect`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host, port, username, password, privateKey }),
    }),
  sftpDisconnect: (sessionId: string) =>
    j<{ ok: boolean }>(`${BASE}/api/ide/ssh/disconnect`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    }),
  sftpLs: (sessionId: string, path: string) =>
    j<{ ok: boolean; path: string; entries: { name: string; type: string; size: number; mtime: string | null }[] }>(
      `${BASE}/api/ide/ssh/ls?sessionId=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(path)}`
    ),
  sftpRead: (sessionId: string, path: string) =>
    j<{ ok: boolean; path: string; content: string; size: number }>(
      `${BASE}/api/ide/ssh/read?sessionId=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(path)}`
    ),
  sftpWrite: (sessionId: string, path: string, content: string) =>
    j<{ ok: boolean; path: string; size: number }>(`${BASE}/api/ide/ssh/write`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, path, content }),
    }),
  sftpDelete: (sessionId: string, path: string, isDir = false) =>
    j<{ ok: boolean }>(`${BASE}/api/ide/ssh/delete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, path, isDir }),
    }),
  sftpRename: (sessionId: string, oldPath: string, newPath: string) =>
    j<{ ok: boolean }>(`${BASE}/api/ide/ssh/rename`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, oldPath, newPath }),
    }),
  sftpExec: (sessionId: string, command: string) =>
    j<{ ok: boolean; stdout: string; stderr: string; exitCode: number }>(`${BASE}/api/ide/ssh/exec`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, command }),
    }),

  // ── Multi-file Composer ───────────────────────────────────────────────────
  composer: (workspace: string, files: string[], instruction: string, context = '') =>
    j<{ ok: boolean; applied: string[]; errors: { path: string; error: string }[]; checkpointId: string; model?: any }>(`${BASE}/api/ide/composer`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, files, instruction, context }),
    }),

  // ── Health / keepalive ────────────────────────────────────────────────────
  health: () =>
    j<{ ok: boolean; uptime: number; rss: number; heapUsed: number; at: string }>(`${BASE}/api/ide/health`),
  keepalive: () =>
    j<{ ok: boolean; at: string }>(`${BASE}/api/ide/keepalive`, { method: 'POST' }),

  // ── Streaming completions (ghost-text SSE) ────────────────────────────────
  // Returns an EventSource — caller reads delta / done events.
  completionsStream: (workspace: string, filePath: string, text: string, cursor: number) => {
    const url = `${BASE}/api/ide/completions/stream`;
    return { url, body: JSON.stringify({ workspace, path: filePath, text, cursor }) };
  },

  // ── Debug REPL + Watch expressions ───────────────────────────────────────
  debugEvaluate: (debugId: string, expression: string) =>
    j<{ ok: boolean; result: string; type: string }>(`${BASE}/api/ide/debug/evaluate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ debugId, expression }),
    }),
  debugWatch: (debugId: string, expressions: string[]) =>
    j<{ ok: boolean; watches: { expression: string; result: string; type: string }[] }>(`${BASE}/api/ide/debug/watch`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ debugId, expressions }),
    }),

  // ── VSCode-compatible extensions (Open VSX) ───────────────────────────────
  extensionSearch: (q: string, limit = 20) =>
    j<{ extensions: any[]; total: number }>(`${BASE}/api/ide/extensions/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  extensionList: () =>
    j<{ extensions: any[] }>(`${BASE}/api/ide/extensions/list`),
  extensionInstall: (publisher: string, name: string, version?: string) =>
    j<{ ok: boolean; id: string; version: string; contributions: any }>(`${BASE}/api/ide/extensions/install`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publisher, name, version }),
    }),
  extensionUninstall: (id: string) =>
    j<{ ok: boolean }>(`${BASE}/api/ide/extensions/uninstall`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }),
  extensionThemes: () =>
    j<{ themes: { id: string; label: string; uiTheme: string; extensionId: string }[] }>(`${BASE}/api/ide/extensions/themes`),
  extensionGrammars: () =>
    j<{ grammars: { language: string; scopeName: string; extensionId: string }[] }>(`${BASE}/api/ide/extensions/grammars`),
  extensionSnippets: (lang: string) =>
    j<{ snippets: Record<string, any>; count: number }>(`${BASE}/api/ide/extensions/snippets/${encodeURIComponent(lang)}`),

  // ── Delivery pipeline (GSD / RALPH / CodeRabbit / stack verifiers) ──────
  deliveryConfig: (workspace: string) =>
    j<{ workspace: string; config: any; providers: { id: string; label: string; enabled: boolean; configured: boolean; optional: boolean; hooks: string[] }[] }>(
      `${BASE}/api/ide/delivery/config?workspace=${encodeURIComponent(workspace)}`
    ),
  saveDeliveryConfig: (workspace: string, patch: any, approval?: { decision: 'approve' }) =>
    j<{ ok: boolean; config?: any; needsApproval?: boolean; message?: string }>(`${BASE}/api/ide/delivery/config`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, patch, approval }),
    }),
  deliveryPhaseSnapshots: (workspace: string) =>
    j<{ snapshots: { label: string; at: number; files: number }[] }>(`${BASE}/api/ide/delivery/phase-snapshots?workspace=${encodeURIComponent(workspace)}`),
  deliveryRollback: (workspace: string, phase?: string) =>
    j<{ success: boolean; restored?: number; removed?: number; error?: string; snapshots?: any[] }>(`${BASE}/api/ide/delivery/rollback`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, ...(phase ? { phase } : {}) }),
    }),
  deliveryContinue: (taskId: string, decision: 'accept' | 'repair' = 'accept') =>
    j<{ ok: boolean; state: string }>(`${BASE}/api/ide/delivery/continue`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, decision }),
    }),
  runDelivery: (
    workspace: string,
    task: string,
    onEvent: (ev: any) => void,
    onDone: (payload: any) => void,
    onError: (message: string) => void,
    taskSessionId?: string,
    onApprovalRequest?: (payload: any) => void,
  ) => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/ide/delivery/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspace, task, ...(taskSessionId ? { taskSessionId } : {}) }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as any).error || `HTTP ${res.status}`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';
          for (const evt of events) {
            const line = evt.split('\n').find((l) => l.startsWith('data: '));
            if (!line) continue;
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.event === 'done') onDone(payload);
              else if (payload.event === 'approval_request' && onApprovalRequest) onApprovalRequest(payload);
              else onEvent(payload);
            } catch {}
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        onError(String(err.message || err));
      }
    })();
    return controller;
  },
};

export const modelApi = {
  listModels: () => j<any[]>(`${BASE}/api/models`),
  createModel: (model: any) =>
    j<{ success: boolean }>(`${BASE}/api/models`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(model),
    }),
  updateModel: (id: string, model: any) =>
    j<{ success: boolean }>(`${BASE}/api/models/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(model),
    }),
  deleteModel: (id: string) => j<{ success: boolean }>(`${BASE}/api/models/${id}`, { method: 'DELETE' }),
  activateModel: (id: string) =>
    j<{ success: boolean; active: boolean }>(`${BASE}/api/models/${id}/activate`, { method: 'POST' }),
  duplicateModel: (id: string) => j<{ success: boolean; id: string }>(`${BASE}/api/models/${id}/duplicate`, { method: 'POST' }),
  testModel: (model: any) =>
    j<any>(`${BASE}/api/models/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(model),
    }),
  syncOllama: () => j<{ success: boolean; count: number; total: number }>(`${BASE}/api/models/sync-ollama`, { method: 'POST' }),
  exportConfig: () => j<any>(`${BASE}/api/models/export-config`),
  importConfig: (payload: any) =>
    j<{ success: boolean; imported: number }>(`${BASE}/api/models/import-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  marketplace: () => j<any[]>(`${BASE}/api/model-marketplace`),
  routes: () => j<any>(`${BASE}/api/model-routes`),
  saveRoutes: (routes: Record<string, string>) =>
    j<{ success: boolean }>(`${BASE}/api/model-routes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routes }),
    }),
  profiles: () => j<any>(`${BASE}/api/model-profiles`),
  createProfile: (name: string, description: string, config: any) =>
    j<{ success: boolean; id: string }>(`${BASE}/api/model-profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, config_json: config }),
    }),
  deleteProfile: (id: string) => j<{ success: boolean }>(`${BASE}/api/model-profiles/${id}`, { method: 'DELETE' }),
  applyProfile: (id: string) => j<{ success: boolean; applied: number }>(`${BASE}/api/model-profiles/${id}/apply`, { method: 'POST' }),
  usage: (days = 30) => j<any>(`${BASE}/api/model-usage?days=${days}`),
  arena: (payload: { prompt: string; modelIds: string[]; context?: string; workspace?: string }, onEvent: (ev: any) => void, signal?: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
      fetch(`${BASE}/api/ide/arena`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal,
      })
        .then(async (r) => {
          if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);
          const reader = r.body.getReader();
          const decoder = new TextDecoder();
          let buf = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            let idx;
            while ((idx = buf.indexOf('\n')) !== -1) {
              const line = buf.slice(0, idx);
              buf = buf.slice(idx + 1);
              if (!line.startsWith('data:')) continue;
              try {
                onEvent(JSON.parse(line.slice(5).trim()));
              } catch {}
            }
          }
          resolve();
        })
        .catch(reject);
    }),
};
