import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertCircle, ArrowLeft, BookOpen, Braces, Bug, Calculator, Check, CheckCircle2, ChevronDown, ChevronRight,
  CircleDot, Container, Copy, Cloud, Database, Edit3, ExternalLink, Eye, EyeOff, FileCode, FilePlus2, FileText, Folder, FolderOpen, FolderPlus, GitBranch, GitCommitHorizontal, Globe,
  History, Image as ImageIcon, KeyRound, LayoutGrid, Layers, Link2, Loader2, Mic, Monitor, MoreHorizontal, Moon, Network, Package, Pause, Play, Plug, Plus, RefreshCw, Rocket,
  Download, Save, Search, Settings, ShieldCheck, Sparkles, Square, StepForward, Sun, Terminal as TerminalIcon, TestTube2, Trash2, Undo2, Upload, Users,
  Wrench, X, Zap, TriangleAlert, Info, Workflow,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ideApi, modelApi, setAuthToken } from './ideApi';
import type { AgentLog, AgentStep, CapabilitySnapshot, ExecStatus, MemoryData, SearchResult, StackSupportInfo, TemplateInfo, TreeNode, WorkspaceInfo } from './ideTypes';
import type { GitDiffFile, GitLogEntry, AgentRun, SubAgent } from './ideApi';
import { AGENT_META } from './agentPrompts';
import MonacoEditor from './MonacoEditor';
import type { DiagnosticMarker } from './MonacoEditor';
import ContextPanel from './ContextPanel';
import GraphView from './GraphView';
import PackagePanel from './PackagePanel';
import DatabasePanel from './DatabasePanel';
import CollabInvitePanel from './CollabInvitePanel';
import ApiTestPanel from './ApiTestPanel';
import NotebookView from './NotebookView';
import ProfilerPanel from './ProfilerPanel';
import PluginsPanel from './PluginsPanel';
import SkillsPanel from './SkillsPanel';
import WorkflowsPanel from './WorkflowsPanel';
import DeliveryPanel from './DeliveryPanel';
import ReaPanel from './ReaPanel';
import ModelSelector from './ModelSelector';
import type { ModelOption } from './ModelSelector';
import { useTheme, resolveTheme } from '../../utils/theme';

const AGENT_ORDER = ['planner', 'architect', 'coder', 'debugger', 'tester', 'reviewer', 'docs'];

interface Props {
  onBack: () => void;
}

interface DiffResult {
  path: string;
  added: number;
  removed: number;
  hunks: { oldStart: number; oldLines: string[]; newStart: number; newLines: string[] }[];
  oldContent?: string;
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  at: number;
  files?: string[];
  images?: string[];
}

const ANSI_RE = /[\u001B[\u009B][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
function stripAnsi(s: string) {
  return s ? String(s).replace(ANSI_RE, '') : s;
}

// Matches common stack-trace references: "src/foo.ts:12:5", "at foo (bar.js:3:1)", "./index.js:7"
const STACK_RE = /((?:\.\/|\.\.\/|[a-zA-Z]:[\\/]|\/)?[\w./\\-]+\.[a-z]{1,6}):(\d+)(?::(\d+))?/g;

type TermSegment = { t: 'txt'; s: string } | { t: 'link'; file: string; line: number; s: string };

function parseStackLine(raw: string): TermSegment[] {
  const segs: TermSegment[] = [];
  let last = 0;
  STACK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = STACK_RE.exec(raw)) !== null) {
    if (m.index > last) segs.push({ t: 'txt', s: raw.slice(last, m.index) });
    segs.push({ t: 'link', file: m[1], line: parseInt(m[2], 10), s: m[0] });
    last = m.index + m[0].length;
  }
  if (last < raw.length) segs.push({ t: 'txt', s: raw.slice(last) });
  return segs.length ? segs : [{ t: 'txt', s: raw }];
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['ts', 'tsx'].includes(ext)) return <FileCode className="w-3.5 h-3.5 text-ink-muted/90 shrink-0" />;
  if (['js', 'jsx', 'mjs', 'cjs'].includes(ext)) return <FileCode className="w-3.5 h-3.5 text-amber-400/90 shrink-0" />;
  if (ext === 'json') return <Braces className="w-3.5 h-3.5 text-yellow-400/90 shrink-0" />;
  if (['html', 'htm', 'css', 'scss', 'svg'].includes(ext)) return <FileText className="w-3.5 h-3.5 text-orange-400/90 shrink-0" />;
  if (['md', 'txt', 'py', 'sh', 'sql', 'yml', 'yaml'].includes(ext)) return <FileText className="w-3.5 h-3.5 text-ink-subtle/90 shrink-0" />;
  return <FileCode className="w-3.5 h-3.5 text-ink-muted/90 shrink-0" />;
}

function relativeTime(iso: string | null) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const KIND_COLORS: Record<string, string> = {
  function: '#8b5cf6',
  method: '#60a5fa',
  class: '#f472b6',
  interface: '#a78bfa',
  type: '#a78bfa',
  component: '#f59e0b',
  const: '#34d399',
  let: '#34d399',
  var: '#34d399',
  arrow: '#34d399',
  route: '#fb7185',
  env: '#a3e635',
  'html-id': '#fbbf24',
  'css-selector': '#38bdf8',
};

function KindIcon({ kind }: { kind: string }) {
  return <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: KIND_COLORS[kind] || '#71717a' }} title={kind} />;
}

/** Split an assistant message into alternating prose/code segments. */
type ChatBlock = { type: 'text'; text: string } | { type: 'code'; lang: string; code: string };
function parseChatBlocks(content: string): ChatBlock[] {
  const blocks: ChatBlock[] = [];
  const re = /```([\w.-]*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) blocks.push({ type: 'text', text: content.slice(last, m.index) });
    blocks.push({ type: 'code', lang: m[1] || 'code', code: m[2] });
    last = m.index + m[0].length;
  }
  if (last < content.length) blocks.push({ type: 'text', text: content.slice(last) });
  return blocks;
}

/**
 * Produce a simple line-level diff (no external deps).
 * Returns an array of { op: '+' | '-' | ' ', line: string }.
 */
function computeLineDiff(oldText: string, newText: string) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  // LCS-based patience diff — O(n²) is fine for small files in a modal
  const result: { op: '+' | '-' | ' '; line: string }[] = [];
  // Build LCS table
  const m = oldLines.length, n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      dp[i][j] = oldLines[i] === newLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  let i = 0, j = 0;
  while (i < m || j < n) {
    if (i < m && j < n && oldLines[i] === newLines[j]) {
      result.push({ op: ' ', line: oldLines[i++] }); j++;
    } else if (j < n && (i >= m || dp[i + 1]?.[j] <= dp[i]?.[j + 1])) {
      result.push({ op: '+', line: newLines[j++] });
    } else {
      result.push({ op: '-', line: oldLines[i++] });
    }
  }
  return result;
}

function ResizeHandle({ dir, onResize, onDrag }: { dir: 'x' | 'y'; onResize: (d: number) => void; onDrag?: (d: boolean) => void }) {
  const startRef = useRef(0);
  return (
    <div
      className={
        dir === 'x'
          ? 'w-1 cursor-col-resize shrink-0 hover:bg-accent/50 active:bg-accent/70 transition-colors z-10'
          : 'h-1 cursor-row-resize shrink-0 hover:bg-accent/50 active:bg-accent/70 transition-colors z-10'
      }
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        startRef.current = dir === 'x' ? e.clientX : e.clientY;
        onDrag?.(true);
      }}
      onPointerMove={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        const now = dir === 'x' ? e.clientX : e.clientY;
        onResize(now - startRef.current);
        startRef.current = now;
      }}
      onPointerUp={() => onDrag?.(false)}
      onPointerCancel={() => onDrag?.(false)}
    />
  );
}

function DirectChatInput({ onSend, busy, onStop }: { onSend: (msg: string) => void; busy: boolean; onStop: () => void }) {
  const [val, setVal] = React.useState('');
  const showCodebaseHint = val.includes('@') && !val.includes('@codebase');
  const submit = () => {
    if (!val.trim() || busy) return;
    onSend(val.trim());
    setVal('');
  };
  return (
    <div className="shrink-0 px-3 pb-3 pt-2 border-t border-line/60">
      {showCodebaseHint && (
        <div className="mb-1.5 flex items-center gap-1.5">
          <button
            onMouseDown={(e) => { e.preventDefault(); setVal((v) => v.replace(/@\S*$/, '') + '@codebase '); }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/10 border border-line-strong/30 text-[10px] text-ink hover:bg-accent/20 transition-colors"
          >
            <Search className="w-2.5 h-2.5" /> @codebase
          </button>
          <span className="text-[10px] text-ink-muted">semantic search across all files</span>
        </div>
      )}
      <div className={`flex items-center gap-1.5 rounded-xl border bg-surface px-2.5 py-1.5 transition-all ${busy ? 'border-line-strong/40' : 'border-line focus-within:border-line-strong/50'}`}>
        <Sparkles className="w-3 h-3 text-ink-muted shrink-0" />
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder={busy ? 'Neural IDE is typing…' : 'Ask anything · @codebase for semantic search'}
          disabled={busy && !val}
          className="flex-1 bg-transparent text-[11px] text-ink placeholder:text-ink-muted outline-none"
        />
        {busy ? (
          <button onClick={onStop} title="Stop" className="p-1 rounded-md text-rose-400 hover:bg-rose-500/15 transition-colors">
            <Square className="w-3 h-3" />
          </button>
        ) : (
          <button onClick={submit} disabled={!val.trim()} title="Send" className="p-1 rounded-md text-ink-muted hover:bg-accent/20 disabled:opacity-30 transition-colors">
            <Sparkles className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

const TABS_META: Record<string, { icon: any; label: string; hint: string }> = {
  settings: { icon: Settings, label: 'Settings', hint: 'Workspace, model & sandbox information.' },
  secrets: { icon: KeyRound, label: 'Secrets', hint: 'Env vars stored in .env (auto-gitignored). Injected into every terminal command.' },
  collab: { icon: Users, label: 'Collab', hint: 'Share workspace with teammates — generate an invite link.' },
  packages: { icon: Package, label: 'Packages', hint: 'Search and install npm / pip packages directly into the workspace.' },
  database: { icon: Database, label: 'Database', hint: 'SQLite table browser and SQL query runner. DATABASE_URL auto-injected into .env.' },
  notes: { icon: FileText, label: 'Scratchpad', hint: 'Free-text notes injected into every agent run as context. Jot down constraints, open questions, or snippets.' },
  history: { icon: History, label: 'Step History', hint: 'Timeline of every checkpoint — restore the workspace to any earlier state.' },
  graph: { icon: Network, label: 'Import Graph', hint: 'Symbol graph & dependencies of the current workspace (read-only).' },
  context: { icon: Layers, label: 'Context', hint: 'Preview the exact context the agents will receive for your task.' },
  memory: { icon: BookOpen, label: 'Project Memory', hint: 'Agents read this every run — the more you write, the smarter the builds.' },
  rules: { icon: FileCode, label: 'Rules', hint: 'Glob-scoped instructions in .codestrom/rules — injected into every agent run, composer edit and inline completion.' },
  skills: { icon: Zap, label: 'Skills', hint: 'Reusable playbooks in .codestrom/skills — injected into agent runs, composer edits and chat.' },
  workflows: { icon: Workflow, label: 'Workflows', hint: 'Reusable multi-step recipes in .codestrom/workflows — run them on demand.' },
  status: { icon: Activity, label: 'Status', hint: 'Runtime health of the IDE backend.' },
  security: { icon: ShieldCheck, label: 'Sandbox Security', hint: 'Every agent action runs inside the sandbox.' },
  mcp: { icon: Plug, label: 'MCP Servers', hint: 'Connect external MCP tool servers — their tools become available to the agents.' },
  calc: { icon: Calculator, label: 'Calculator', hint: 'Quick arithmetic.' },
  apitest: { icon: Zap, label: 'API Tester', hint: 'Postman-lite: scan Express/Flask routes, send requests, view responses.' },
  plugins: { icon: Plug, label: 'Plugins', hint: 'Install npm packages as workspace plugins from a curated marketplace.' },
  profiler: { icon: Activity, label: 'Profiler', hint: 'CPU profiling via node --prof. Start profiling, run your app, stop to view hotspots.' },
  rea: { icon: Search, label: 'Reverse Engineer', hint: 'REA static analysis — reconstruct local JS/Electron apps, inspect binaries, capture web bundles. Results returned as JSON Evidence.' },
};

function supportLevelLabel(level: StackSupportInfo['supportLevel']) {
  if (level === 'full') return 'Full support';
  if (level === 'scaffold-only') return 'Scaffold only';
  return 'Unavailable';
}

function supportLevelClasses(level: StackSupportInfo['supportLevel']) {
  if (level === 'full') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (level === 'scaffold-only') return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
}

function opLabel(key: keyof StackSupportInfo['operations']) {
  if (key === 'contentChecks') return 'content checks';
  return key;
}

function CalculatorPad({ onResult }: { onResult?: (v: string) => void }) {
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('');
  const keys = ['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '=', '+', 'C', '⌫'];
  const press = (k: string) => {
    if (k === 'C') { setExpr(''); setResult(''); return; }
    if (k === '⌫') { setExpr((e) => e.slice(0, -1)); return; }
    if (k === '=') {
      try {
        const v = String(Function(`"use strict";return (${expr || '0'})`)());
        setResult(v);
        onResult?.(v);
      } catch { setResult('Error'); }
      return;
    }
    setExpr((e) => e + k);
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-lg border border-line bg-surface/60 px-3 py-2 font-mono text-sm text-ink text-right min-h-[56px] flex flex-col justify-center">
        <span className="text-[10px] text-ink-muted break-all">{expr}</span>
        <span className="text-lg text-ink">{result}</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => press(k)}
            className={`py-2 rounded-md text-xs font-mono transition-colors ${
              k === '=' ? 'bg-accent text-accent-fg hover:bg-accent' : ['C', '⌫'].includes(k) ? 'bg-elevated hover:bg-elevated text-rose-300' : 'bg-elevated/70 hover:bg-elevated text-ink'
            }`}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Composer session types ─────────────────────────────────────────────────
interface ComposerSession {
  id: string;
  name: string;
  chat: ChatMsg[];
  steps: AgentStep[];
  logs: AgentLog[];
  task: string;
  mentions: string[];
  summary: string;
  generatedFiles: string[];
  running: boolean;
}
function newSession(id?: string): ComposerSession {
  return { id: id ?? `s${Date.now().toString(36)}`, name: 'New session', chat: [], steps: [], logs: [], task: '', mentions: [], summary: '', generatedFiles: [], running: false };
}

export default function AICodingIDE({ onBack }: Props) {
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [currentWs, setCurrentWs] = useState('');
  const [projectMode, setProjectMode] = useState(false);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; path: string; isDir: boolean } | null>(null);
  const [renameEntry, setRenameEntry] = useState<{ path: string; isDir: boolean } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [newEntry, setNewEntry] = useState<{ parentDir: string; kind: 'file' | 'dir' } | null>(null);
  const [newEntryValue, setNewEntryValue] = useState('');
  const [localFolderOpen, setLocalFolderOpen] = useState(false);
  const [localFolderPath, setLocalFolderPath] = useState('');
  const [localFolderBusy, setLocalFolderBusy] = useState(false);
  // ── SSH Workspace state ────────────────────────────────────────────────────
  const [sshModalOpen, setSshModalOpen] = useState(false);
  const [sshHost, setSshHost] = useState('');
  const [sshPort, setSshPort] = useState('22');
  const [sshUser, setSshUser] = useState('');
  const [sshKeyPath, setSshKeyPath] = useState('');
  const [sshRemotePath, setSshRemotePath] = useState('~');
  const [sshBusy, setSshBusy] = useState(false);
  const [sshStatus, setSshStatus] = useState<{ ok?: boolean; error?: string; files?: string[] } | null>(null);
  const [dragPath, setDragPath] = useState<string | null>(null);
  const [dragOverDir, setDragOverDir] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<{ path: string; content: string; dirty: boolean }[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<'explorer' | 'search' | 'git' | 'outline'>('explorer');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchScope, setSearchScope] = useState<'workspace' | 'project'>('workspace');
  const [searchMode, setSearchMode] = useState<'text' | 'semantic'>('semantic');
  const [searching, setSearching] = useState(false);
  const [replaceQuery, setReplaceQuery] = useState('');
  const [replacing, setReplacing] = useState(false);
  const [replaceCount, setReplaceCount] = useState<number | null>(null);
  const [outline, setOutline] = useState<{ id: string; name: string; kind: string; line: number; signature: string }[]>([]);
  const [outlineLoading, setOutlineLoading] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');
  const [quickFiles, setQuickFiles] = useState<string[]>([]);
  const [quickIdx, setQuickIdx] = useState(0);
  const quickInputRef = useRef<HTMLInputElement | null>(null);
  const [memory, setMemory] = useState<MemoryData>({ markdown: '', structured: { architecture: '', conventions: '', decisions: [], preferences: [], frequentlyModified: [] } });
  const [graph, setGraph] = useState<{ nodes: { id: string; group: string }[]; edges: { from: string; to: string }[] }>({ nodes: [], edges: [] });
  const [revealLine, setRevealLine] = useState<{ line: number; ts: number } | null>(null);
  const [activeModel, setActiveModel] = useState<{ name: string; provider: string } | null>(null);
  const [resolvedModel, setResolvedModel] = useState<{ name: string; provider: string; source: 'cloud' | 'active' | 'lmstudio' } | null>(null);
  const [modelList, setModelList] = useState<ModelOption[]>([]);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [modelAuto, setModelAuto] = useState(false);
  const [modelBusy, setModelBusy] = useState(false);
  const [sessionTokens, setSessionTokens] = useState(0);
  const [theme, setTheme] = useTheme();
  const resolvedTheme = resolveTheme(theme);
  const [lmModel, setLmModel] = useState<{ online: boolean; id: string | null; count: number }>({ online: false, id: null, count: 0 });
  const [task, setTask] = useState('');
  const [running, setRunning] = useState(false);
  const [taskQueue, setTaskQueue] = useState<string[]>([]);
  const taskQueueRef = useRef<string[]>([]);
  const [quickMode, setQuickMode] = useState(false);
  // Diff preview before applying a chat code block to a file
  const [applyPreview, setApplyPreview] = useState<{ path: string; oldCode: string; newCode: string } | null>(null);
  const [rename, setRename] = useState<{ open: boolean; file: string; line: number; col: number; name: string; newName: string; busy: boolean; error: string | null }>({
    open: false,
    file: '',
    line: 1,
    col: 1,
    name: '',
    newName: '',
    busy: false,
    error: null,
  });
  const [runFailed, setRunFailed] = useState(false);
  const [agentRunId, setAgentRunId] = useState<string | null>(null);
  const [runPaused, setRunPaused] = useState(false);
  const [refsPanel, setRefsPanel] = useState<{
    open: boolean;
    file: string;
    symbol: string;
    refs: { line: number; col: number; isDeclaration: boolean; text: string }[];
    busy: boolean;
    error: string | null;
  }>({ open: false, file: '', symbol: '', refs: [], busy: false, error: null });
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());
  const [subAgentsMap, setSubAgentsMap] = useState<Record<string, SubAgent[]>>({});
  const [runsOpen, setRunsOpen] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [planSteps, setPlanSteps] = useState<{ milestone: string; goal: string; steps: { action: string; target: string[]; verify: string }[] }[]>([]);
  const [execLog, setExecLog] = useState<ExecStatus[]>([]);
  const [summary, setSummary] = useState('');
  const [generatedFiles, setGeneratedFiles] = useState<string[]>([]);
  const [termLines, setTermLines] = useState<{ kind: 'cmd' | 'out' | 'err' | 'url'; text: string }[]>([]);
  const [termInput, setTermInput] = useState('');
  const [requirePermissions, setRequirePermissions] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{ runId: string; tool: string; path: string; preview: string } | null>(null);
  const [pendingLiveApproval, setPendingLiveApproval] = useState<{ taskId: string; action: string; title?: string; reason?: string; risk?: string } | null>(null);
  const [termRunning, setTermRunning] = useState(false);
  const [termRunId, setTermRunId] = useState<string | null>(null);
  const [termPreviewUrl, setTermPreviewUrl] = useState<string | null>(null);
  const [lastTermCmd, setLastTermCmd] = useState<string | null>(null);
  const [lastTermExit, setLastTermExit] = useState<number | null>(null);
  const [fixBusy, setFixBusy] = useState(false);
  const termEsRef = useRef<EventSource | null>(null);
  const termRunIdRef = useRef<string | null>(null);
  const termScrollRef = useRef<HTMLDivElement | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [toast, setToast] = useState('');
  const [git, setGit] = useState<{ isRepo: boolean; branch: string | null; status: { flag: string; file: string; added: number | null; removed: number | null; untracked?: boolean }[]; output: string } | null>(null);
  const [gitMsg, setGitMsg] = useState('');
  const [gitBusy, setGitBusy] = useState(false);
  const [gitDiffs, setGitDiffs] = useState<Record<string, GitDiffFile>>({});
  const [gitLog, setGitLog] = useState<GitLogEntry[]>([]);
  const [gitBranches, setGitBranches] = useState<string[]>([]);
  const [gitBranchBusy, setGitBranchBusy] = useState(false);
  const [gitSuggesting, setGitSuggesting] = useState(false);
  const [newBranch, setNewBranch] = useState('');
  // ── GitHub OAuth state ──────────────────────────────────────────────────────
  const [githubToken, setGithubToken] = useState<string | null>(() => { try { return localStorage.getItem('neural-github-token'); } catch { return null; } });
  const [githubLogin, setGithubLogin] = useState<string | null>(() => { try { return localStorage.getItem('neural-github-login'); } catch { return null; } });
  const [githubConnecting, setGithubConnecting] = useState(false);
  const [githubDeviceCode, setGithubDeviceCode] = useState<string | null>(null);
  const [githubUserCode, setGithubUserCode] = useState<string | null>(null);
  const [githubVerifyUrl, setGithubVerifyUrl] = useState<string | null>(null);
  const [githubPushOpen, setGithubPushOpen] = useState(false);
  const [githubPushUrl, setGithubPushUrl] = useState('');
  const [githubPushBranch, setGithubPushBranch] = useState('main');
  const [githubPushMsg, setGithubPushMsg] = useState('');
  const [githubPushBusy, setGithubPushBusy] = useState(false);
  const githubPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [capabilities, setCapabilities] = useState<CapabilitySnapshot | null>(null);
  const [cloneUrl, setCloneUrl] = useState('');
  const [cloneBusy, setCloneBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [cloudOpen, setCloudOpen] = useState(false);
  const [cloudEnabled, setCloudEnabled] = useState(false);
  const [cloudModel, setCloudModel] = useState('openrouter/auto');
  const [cloudKey, setCloudKey] = useState('');
  const [cloudKeySet, setCloudKeySet] = useState(false);
  const [cloudKeyMasked, setCloudKeyMasked] = useState('');
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudTest, setCloudTest] = useState<{ ok: boolean; message: string } | null>(null);
  const [completionsModelId, setCompletionsModelId] = useState('');
  const [completionsModelBusy, setCompletionsModelBusy] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<keyof typeof TABS_META>('settings');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [agentsOpen, setAgentsOpen] = useState(true);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [explorerW, setExplorerW] = useState(264);
  const [agentsW, setAgentsW] = useState(372);
  const [terminalH, setTerminalH] = useState(216);
  const [previewW, setPreviewW] = useState(460);
  /** quick = OpenCode-style tool loop; full = multi-agent build pipeline */
  const [agentMode, setAgentMode] = useState<'quick' | 'full'>('quick');
  const [resizing, setResizing] = useState(false);
  const [newProjOpen, setNewProjOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [templatePicker, setTemplatePicker] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [templateCat, setTemplateCat] = useState<string>('all');
  const [templateBusyId, setTemplateBusyId] = useState<string | null>(null);
  const [communityTemplates, setCommunityTemplates] = useState<{ id: string; name: string; description: string; repoUrl: string; tags: string[]; category: string }[]>([]);
  const [communityTplLoaded, setCommunityTplLoaded] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [thinkingText, setThinkingText] = useState('');
  // Reasoning chains from o1/o3/DeepSeek-R1 models — keyed by agent name
  const [reasoningBlocks, setReasoningBlocks] = useState<Record<string, string>>({});
  const [expandedReasoning, setExpandedReasoning] = useState<string | null>(null);
  const [diffs, setDiffs] = useState<DiffResult[]>([]);
  const [diffOpen, setDiffOpen] = useState<string | null>(null);
  const [diffSectionOpen, setDiffSectionOpen] = useState(true);
  const [scratchpad, setScratchpad] = useState('');
  // Editor prefs
  const [formatOnSave, setFormatOnSave] = useState(true);
  const [inlayHints, setInlayHints] = useState(false);
  const [vimMode, setVimMode] = useState(false);
  // Plan edit gate — after planner finishes, show editable plan before executor runs
  const [pendingPlan, setPendingPlan] = useState<{ milestones: typeof planSteps; resolve: (ms: typeof planSteps) => void } | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionSymbols, setMentionSymbols] = useState<string[]>([]);
  const [symbolMatches, setSymbolMatches] = useState<{ id: string; name: string; kind: string; file: string; line: number; signature?: string }[]>([]);
  // ── Onboarding / cheatsheet ────────────────────────────────────────────────
  const [onboardingOpen, setOnboardingOpen] = useState(() => {
    try { return !localStorage.getItem('codestrom-onboarded'); } catch { return false; }
  });
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  const [checkpoints, setCheckpoints] = useState<{ runId: string; at: number; label: string }[]>([]);
  const [checkpointsOpen, setCheckpointsOpen] = useState(false);
  const checkpointsRef = useRef<HTMLDivElement | null>(null);
  const [mentions, setMentions] = useState<string[]>([]);
  const [mcpServers, setMcpServers] = useState<{ id: string; name: string; url: string; headers?: Record<string, string> }[]>([]);
  const [mcpTools, setMcpTools] = useState<Record<string, { name: string; description: string }[]>>({});
  const [mcpStatus, setMcpStatus] = useState<Record<string, 'ok' | 'error' | 'testing'>>({});
  const [mcpError, setMcpError] = useState<string | null>(null);
  const [mcpAddOpen, setMcpAddOpen] = useState(false);
  const [mcpForm, setMcpForm] = useState({ name: '', url: '', headers: '' });
  const [csRules, setCsRules] = useState<{ name: string; glob: string | null; apply: 'always' | 'auto'; description: string; content: string; path: string; level: string }[]>([]);
  const [csRulesError, setCsRulesError] = useState<string | null>(null);
  const [csRuleEditing, setCsRuleEditing] = useState<string | null>(null);
  const [csRulesBusy, setCsRulesBusy] = useState(false);
  const [csRuleDraft, setCsRuleDraft] = useState({ name: '', glob: '', apply: 'always' as 'always' | 'auto', description: '', content: '' });
  const [webCtx, setWebCtx] = useState<{ source: string; content: string } | null>(null);
  const [webInput, setWebInput] = useState('');
  const [webOpen, setWebOpen] = useState(false);
  const [webBusy, setWebBusy] = useState(false);
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);
  const [envBusy, setEnvBusy] = useState(false);
  const [envMasked, setEnvMasked] = useState<Record<number, boolean>>({});
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rulesContent, setRulesContent] = useState('');
  const [rulesFile, setRulesFile] = useState('.neuralrules');
  const [rulesBusy, setRulesBusy] = useState(false);
  const [rulesHasContent, setRulesHasContent] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [deployInfo, setDeployInfo] = useState<{ status: string; port?: number; url?: string; lanUrls?: string[]; shareUrl?: string | null; sharePending?: boolean; kind?: string; provider?: string | null; output?: string } | null>(null);
  const [deployBusy, setDeployBusy] = useState(false);
  const [hostedProvider, setHostedProvider] = useState<'render' | 'railway' | 'fly'>('render');
  // Build Pipeline State
  const [buildJobs, setBuildJobs] = useState<import('./ideTypes').BuildJob[]>([]);
  const [buildProfiles, setBuildProfiles] = useState<import('./ideTypes').BuildProfile[]>([]);
  const [buildPanelOpen, setBuildPanelOpen] = useState(false);
  const [activeBuildJob, setActiveBuildJob] = useState<string | null>(null);
  const [buildLogs, setBuildLogs] = useState<import('./ideTypes').BuildLogEntry[]>([]);
  const [buildBusy, setBuildBusy] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [chatStreaming, setChatStreaming] = useState(false);
  const [chatStreamText, setChatStreamText] = useState('');
  // Image attachments for vision chat (base64 data URIs)
  const [chatImages, setChatImages] = useState<string[]>([]);
  const [designBusy, setDesignBusy] = useState(false);
  const [designMsg, setDesignMsg] = useState('');  // Problems panel (diagnostics from Monaco markers)
  const [problems, setProblems] = useState<DiagnosticMarker[]>([]);
  const [problemsOpen, setProblemsOpen] = useState(false);
  // Real-time collaboration
  const [collabEnabled, setCollabEnabled] = useState(false);
  const [collabPeers, setCollabPeers] = useState<{ name: string; color: string }[]>([]);
  // ── Terminal share state ─────────────────────────────────────────────────────
  const [termShareUrl, setTermShareUrl] = useState<string | null>(null);
  const [termSharePending, setTermSharePending] = useState(false);
  const [termSharePort, setTermSharePort] = useState<number | null>(null);
  const termSharePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // ── Composer sessions ────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<ComposerSession[]>(() => [newSession('default')]);
  const [activeSessionId, setActiveSessionId] = useState<string>('default');
  const [liveTaskId, setLiveTaskId] = useState<string | null>(null);
  const [liveTaskRecord, setLiveTaskRecord] = useState<any | null>(null);
  const [deliveryMode, setDeliveryMode] = useState(false);
  const [sessionRenaming, setSessionRenaming] = useState<string | null>(null);
  const [sessionRenameVal, setSessionRenameVal] = useState('');
  // ── Debugger state ───────────────────────────────────────────────────────────
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  const [debugId, setDebugId] = useState<string | null>(null);
  const [debugFile, setDebugFile] = useState('');
  const [debugLang, setDebugLang] = useState<'auto' | 'node' | 'python'>('auto');
  const [debugStatus, setDebugStatus] = useState<'idle' | 'running' | 'paused' | 'exited' | 'error'>('idle');
  const [debugStack, setDebugStack] = useState<{ id: string; functionName: string; file: string; line: number; column: number }[]>([]);
  const [debugVars, setDebugVars] = useState<{ name: string; value: string; type: string; scope: string }[]>([]);
  const [debugBreakpoints, setDebugBreakpoints] = useState<Map<string, Set<number>>>(new Map());
  const [debugOutput, setDebugOutput] = useState<{ type: string; text: string }[]>([]);
  const [debugBusy, setDebugBusy] = useState(false);
  const debugPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // ── Test Generation state ────────────────────────────────────────────────────
  const [testGenBusy, setTestGenBusy] = useState(false);
  const [testGenResult, setTestGenResult] = useState<{ passed: boolean; output: string; testFile: string; fixed?: boolean } | null>(null);
  const [testGenStatus, setTestGenStatus] = useState('');
  const testGenEsRef = useRef<AbortController | null>(null);
  // ── Notebook state ───────────────────────────────────────────────────────────
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [notebookFile, setNotebookFile] = useState('');
  const [notebookLang, setNotebookLang] = useState('javascript');
  const chatAbortRef = useRef<AbortController | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const prevTaskRef = useRef('');
  const deployPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamsRef = useRef<Map<string, string>>(new Map());
  const restoreRef = useRef<{ files: string[]; active: string | null } | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const logsRef = useRef<HTMLDivElement | null>(null);
  const stepsRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  // keep taskQueueRef in sync with taskQueue state
  const welcomeInputRef = useRef<HTMLTextAreaElement | null>(null);
  const moreRef = useRef<HTMLDivElement | null>(null);
  const runsRef = useRef<HTMLDivElement | null>(null);
  const buildTermRunIdRef = useRef<string | null>(null);
  const buildEsRef = useRef<EventSource | null>(null);

  const reqWs = projectMode ? '' : currentWs;
  const readOnly = projectMode;
  const inIde = !!currentWs || projectMode;
  const previewUrl = inIde && !projectMode ? ideApi.previewUrl(currentWs) : '';
  const effectivePreviewUrl = inIde && !projectMode && termPreviewUrl ? termPreviewUrl : previewUrl;

  useEffect(() => {
    const el = termScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [termLines, terminalOpen]);

  useEffect(() => {
    const es = termEsRef.current;
    const rid = termRunIdRef.current;
    es?.close();
    termEsRef.current = null;
    termRunIdRef.current = null;
    setTermRunId(null);
    setTermRunning(false);
    setTermPreviewUrl(null);
    if (rid) ideApi.terminalKill(rid).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWs]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  }, []);

  const loadWorkspaces = useCallback(async () => {
    try {
      const ws = await ideApi.listWorkspaces();
      setWorkspaces(ws);
    } catch (err: any) {
      showToast(`Backend offline: ${err.message}`);
    }
  }, []);

  useEffect(() => {
    loadWorkspaces();
    ideApi.imports().then(setGraph).catch(() => {});
    ideApi.templates().then(setTemplates).catch(() => {});
    ideApi.capabilities().then(setCapabilities).catch(() => {});
    void loadCompletionsModel();
    ideApi.sessionUsage().then((r) => setSessionTokens(r.totalTokens)).catch(() => {});
    const loadActiveModelFallback = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/models');
        if (!response.ok) throw new Error(`Model API returned ${response.status}`);
        const models: any[] = await response.json();
        setModelList(models.map((m) => ({ id: m.id, name: m.name, provider: m.provider, speed: m.speed ?? undefined })));
        const selected = models.find((model) => model.is_active);
        setActiveModelId(selected ? selected.id : null);
        const fallback = selected ? { name: selected.name, provider: selected.provider } : null;
        setActiveModel(fallback);
        setResolvedModel(fallback ? { ...fallback, source: 'active' } : null);
      } catch {
        setActiveModel(null);
        setResolvedModel(null);
      }
    };
    void loadActiveModelFallback();
    const pollLm = async () => {
      try {
        const r = await fetch('http://localhost:5000/api/ide/lmstudio-model');
        const j = await r.json();
        setLmModel({ online: !!j.lmstudio?.online, id: j.lmstudio?.id || null, count: j.lmstudio?.count || 0 });
        const rp = j.resolved;
        if (rp) {
          const source: 'cloud' | 'active' | 'lmstudio' = rp.provider === 'cloud' ? 'cloud' : rp.id === 'lmstudio-live' ? 'lmstudio' : 'active';
          setResolvedModel({ name: rp.display || rp.name, provider: rp.provider, source });
        } else {
          void loadActiveModelFallback();
        }
      } catch {
        setLmModel({ online: false, id: null, count: 0 });
        void loadActiveModelFallback();
      }
    };
    pollLm();
    const lmTimer = setInterval(pollLm, 8000);
    const refreshTimer = setInterval(() => {
      void loadActiveModelFallback();
    }, 30000);
    const capabilitiesTimer = setInterval(() => {
      ideApi.capabilities().then(setCapabilities).catch(() => {});
    }, 30000);
    return () => {
      clearInterval(lmTimer);
      clearInterval(refreshTimer);
      clearInterval(capabilitiesTimer);
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('neural-ide-v1');
      if (raw) {
        const saved = JSON.parse(raw);
        setTask(saved.task || '');
        setMentions(saved.mentions || []);
        setLeftTab(saved.leftTab || 'explorer');
        setExplorerW(saved.explorerW || 264);
        setAgentsW(saved.agentsW || 372);
        setTerminalH(saved.terminalH || 216);
        setPreviewW(saved.previewW || 460);
        setPreviewOpen(!!saved.previewOpen);
        setTerminalOpen(!!saved.terminalOpen);
        if (saved.drawerOpen) {
          setDrawerOpen(true);
          setDrawerTab(saved.drawerTab || 'settings');
        }
        if (saved.workspace && typeof saved.workspace === 'string') {
          restoreRef.current = { files: Array.isArray(saved.openFiles) ? saved.openFiles : [], active: saved.activePath || null };
          setCurrentWs(saved.workspace);
        }
        if (saved.agentMode === 'full' || saved.agentMode === 'quick') setAgentMode(saved.agentMode);
        if (saved.scratchpad) setScratchpad(saved.scratchpad);
      }
    } catch {}
  }, [loadWorkspaces]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          'neural-ide-v1',
          JSON.stringify({
            workspace: currentWs,
            task,
            openFiles: openFiles.map((f) => f.path),
            activePath,
            previewOpen,
            terminalOpen,
            explorerW,
            agentsW,
            terminalH,
            previewW,
            drawerOpen,
            drawerTab,
            leftTab,
            mentions,
            agentMode,
            scratchpad,
          })
        );
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [currentWs, task, openFiles, activePath, previewOpen, terminalOpen, explorerW, agentsW, terminalH, previewW, drawerOpen, drawerTab, leftTab, mentions, agentMode, scratchpad]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('neural-ide-auth');
      if (saved) {
        const { token, user: u } = JSON.parse(saved);
        if (token) {
          setAuthToken(token);
          setUser(u || null);
          ideApi.auth
            .me()
            .then((r) => {
              setUser(r.user);
              localStorage.setItem('neural-ide-auth', JSON.stringify({ token, user: r.user }));
            })
            .catch(() => {
              setAuthToken(null);
              setUser(null);
              localStorage.removeItem('neural-ide-auth');
            });
        }
      }
    } catch {}
  }, [loadWorkspaces]);

  const doAuth = async () => {
    setAuthBusy(true);
    try {
      const r =
        authMode === 'register'
          ? await ideApi.auth.register(authName, authEmail, authPass)
          : await ideApi.auth.login(authEmail, authPass);
      setAuthToken(r.token);
      setUser(r.user);
      localStorage.setItem('neural-ide-auth', JSON.stringify({ token: r.token, user: r.user }));
      setAuthOpen(false);
      setAuthPass('');
      await loadWorkspaces();
      showToast(`Welcome, ${r.user.name.split(' ')[0]}!`);
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const doLogout = async () => {
    try {
      await ideApi.auth.logout();
    } catch {}
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem('neural-ide-auth');
    await loadWorkspaces();
  };

  const deleteWorkspace = async (name: string) => {
    if (!confirm(`Delete project "${name}"? This removes all its files.`)) return;
    try {
      await ideApi.deleteWorkspace(name);
      await loadWorkspaces();
      showToast('Project deleted');
    } catch (err: any) {
      showToast(err.message);
    }
  };

  useEffect(() => {
    if (!inIde) return;
    refreshTree();
    setRuns([]);
    setRunPaused(false);
    setAgentRunId(null);
    loadRuns(currentWs);
    if (!projectMode) {
      ideApi.memory(currentWs).then(setMemory).catch(() => {});
      refreshGit(currentWs);
      loadDiff(currentWs);
      ideApi.chat(currentWs).then((r) => setChat(r.messages || [])).catch(() => setChat([]));
    } else {
      setMemory({ markdown: '', structured: { architecture: '', conventions: '', decisions: [], preferences: [], frequentlyModified: [] } });
      setGit(null);
      setGitDiffs({});
      setGitLog([]);
      setGitBranches([]);
      setDiffs([]);
      setChat([]);
    }
    setSummary('');
    setGeneratedFiles([]);
    setSteps([]);
    setOpenFiles([]);
    setActivePath(null);
    if (deployPollRef.current) {
      clearInterval(deployPollRef.current);
      deployPollRef.current = null;
    }
    setDeployInfo(null);
    if (restoreRef.current) {
      const { files, active } = restoreRef.current;
      restoreRef.current = null;
      (async () => {
        for (const p of files.slice(0, 12)) {
          try {
            const res = await ideApi.readFile(currentWs, p);
            setOpenFiles((prev) => [...prev, { path: p, content: res.content, dirty: false }]);
          } catch {}
        }
        setActivePath(active && files.includes(active) ? active : null);
      })();
    }
  }, [currentWs, projectMode]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
      if (runsRef.current && !runsRef.current.contains(e.target as Node)) setRunsOpen(false);
      setCtxMenu(null);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    return () => {
      if (deployPollRef.current) clearInterval(deployPollRef.current);
    };
  }, []);

  const flatTreeFiles = (nodes: TreeNode[]): string[] => {
    const out: string[] = [];
    for (const n of nodes) {
      if (n.type === 'file') out.push(n.path);
      else if (n.children) out.push(...flatTreeFiles(n.children));
    }
    return out;
  };

  useEffect(() => {
    if (!quickOpen) return;
    setQuickQuery('');
    setQuickIdx(0);
    (projectMode ? ideApi.tree('', 'project') : currentWs ? ideApi.tree(currentWs) : Promise.resolve([]))
      .then((t) => setQuickFiles(flatTreeFiles(t)))
      .catch(() => setQuickFiles([]));
    setTimeout(() => quickInputRef.current?.focus(), 30);
  }, [quickOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setQuickOpen((o) => { if (!o) setQuickQuery(''); return true; });
      }
      // Ctrl+Shift+P → open palette in command mode
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setQuickOpen(true);
        setTimeout(() => { setQuickQuery('>'); setQuickIdx(0); }, 10);
      }
      if (e.key === 'Escape') { setQuickOpen(false); setCheatsheetOpen(false); }
      // ? key toggles cheatsheet (only when not typing in an input)
      if (e.key === '?' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setCheatsheetOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const quickFiltered = useMemo(() => {
    const q = quickQuery.trim().toLowerCase();
    return q ? quickFiles.filter((f) => f.toLowerCase().includes(q)).slice(0, 40) : quickFiles.slice(0, 40);
  }, [quickFiles, quickQuery]);

  const quickPick = (file: string) => {
    setQuickOpen(false);
    openFile(file, projectMode || readOnly);
  };

  const refreshTree = useCallback(async () => {
    try {
      setTree(projectMode ? await ideApi.tree('', 'project') : currentWs ? await ideApi.tree(currentWs) : []);
    } catch (err: any) {
      showToast(`Tree failed: ${err.message}`);
    }
  }, [currentWs, projectMode]);

  const loadBuildProfiles = useCallback(async () => {
    if (!currentWs || readOnly) {
      setBuildProfiles([]);
      return;
    }
    try {
      const res = await ideApi.readFile(currentWs, 'package.json');
      const pkg = JSON.parse(res.content || '{}');
      const scripts: Record<string, string> = pkg.scripts || {};
      const order = ['dev', 'build', 'test', 'lint', 'preview'];
      const names = Object.keys(scripts)
        .filter((k) => !/^pre|post/.test(k))
        .sort((a, b) => order.indexOf(a) - order.indexOf(b) || a.localeCompare(b));
      const profiles = names.map((n) => ({
        id: n,
        name: n,
        command: `npm run ${n}`,
        description: `npm run ${n}`,
      }));
      setBuildProfiles(profiles);
    } catch {
      // Static workspace or no package.json — offer a default dev profile.
      setBuildProfiles([{ id: 'dev', name: 'dev', command: 'npx vite', description: 'npx vite' }]);
    }
  }, [currentWs, readOnly]);

  useEffect(() => {
    loadBuildProfiles();
  }, [loadBuildProfiles]);

  const openWorkspace = (name: string) => {
    setProjectMode(false);
    setCurrentWs(name);
    ideApi.touchWorkspace(name).catch(() => {});
  };

  const openProjectRoot = () => {
    setProjectMode(true);
    setCurrentWs('');
  };

  const goWelcome = () => {
    setProjectMode(false);
    setCurrentWs('');
    setOpenFiles([]);
    setActivePath(null);
  };

  const createProject = async (name: string) => {
    if (!name.trim()) return;
    try {
      const res = await ideApi.createWorkspace(name.trim());
      setNewProjOpen(false);
      setNewProjName('');
      await loadWorkspaces();
      openWorkspace(res.name);
      setTimeout(() => welcomeInputRef.current?.focus(), 100);
    } catch (err: any) {
      showToast(`Create failed: ${err.message}`);
    }
  };

  const buildFromPrompt = async (prompt: string) => {
    const p = prompt.trim();
    if (!p || running) return;
    let ws = currentWs;
    if (!ws) {
      const slug = p.slice(0, 32).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const name = slug || `app-${Date.now()}`;
      try {
        const res = await ideApi.createWorkspace(name);
        await loadWorkspaces();
        openWorkspace(res.name);
        ws = res.name;
      } catch (err: any) {
        showToast(`Create failed: ${err.message}`);
        return;
      }
    }
    setTask(p);
    setTimeout(() => runAgentFor(p, ws), 250);
  };

  const scaffoldTemplate = async (template: string, name?: string) => {
    setTemplateBusy(true);
    setTemplateBusyId(template);
    try {
      const res = await ideApi.scaffoldTemplate(name || `${template}-${Date.now().toString().slice(-4)}`, template);
      await loadWorkspaces();
      setTemplatePicker(false);
      openWorkspace(res.name);
    } catch (err: any) {
      showToast(`Template failed: ${err.message}`);
    } finally {
      setTemplateBusy(false);
      setTemplateBusyId(null);
    }
  };

  const cloneRepo = async () => {
    const url = cloneUrl.trim();
    if (!url) return;
    setCloneBusy(true);
    try {
      const res = await ideApi.cloneRepo(url);
      await loadWorkspaces();
      setCloneUrl('');
      openWorkspace(res.name);
    } catch (err: any) {
      showToast(`Clone failed: ${err.message}`);
    } finally {
      setCloneBusy(false);
    }
  };

  const importFromDisk = async () => {
    const w = window as any;
    if (typeof w.showDirectoryPicker !== 'function') {
      showToast('Folder import needs Chrome or Edge (File System Access API)');
      return;
    }
    if (importBusy) return;
    try {
      const handle = await w.showDirectoryPicker({ mode: 'read' });
      const BATCH = 300;
      const MAX_FILES = 10000;
      const MAX_FILE = 512 * 1024;
      const MAX_TOTAL = 190 * 1024 * 1024;
      const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', 'out', 'coverage', '.cache', '__pycache__', '.venv', 'venv', 'target', '.idea', '.vscode', '.turbo', '.parcel-cache', '.svn', '.hg']);
      const BINARY = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'avif', 'ico', 'pdf', 'zip', 'tar', 'gz', '7z', 'rar', 'exe', 'dll', 'so', 'dylib', 'o', 'obj', 'class', 'jar', 'war', 'pyc', 'pyd', 'whl', 'mp3', 'mp4', 'mkv', 'avi', 'mov', 'wav', 'flac', 'ogg', 'webm', 'otf', 'ttf', 'woff', 'woff2', 'eot', 'psd', 'ai', 'sqlite', 'db', 'wasm', 'bin', 'pkl', 'npy', 'npz']);
      let workspace: string | null = null;
      let total = 0;
      let imported = 0;
      let skipped = 0;
      const wname = handle.name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'imported-app';
      let batch: { path: string; content: string }[] = [];
      const flush = async () => {
        if (!batch.length) return;
        setImportBusy(true);
        setImportProgress(`Importing ${imported} files…`);
        const res = await ideApi.importFolder(wname, batch, workspace || undefined);
        workspace = res.name;
        imported += batch.length;
        batch = [];
      };
      const walk = async (dh: any, prefix: string) => {
        for await (const [name, h] of (dh as any).entries()) {
          if (total >= MAX_TOTAL) return;
          if (SKIP.has(name)) { skipped++; continue; }
          const rel = prefix ? `${prefix}/${name}` : name;
          if (h.kind === 'directory') { await walk(h, rel); continue; }
          if (h.kind !== 'file') continue;
          try {
            const f = await h.getFile();
            if (f.size > MAX_FILE || f.size === 0) { skipped++; continue; }
            const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
            if (BINARY.has(ext)) { skipped++; continue; }
            const text = await f.text();
            if (text.includes('\u0000')) { skipped++; continue; }
            total += text.length;
            if (total > MAX_TOTAL) return;
            batch.push({ path: rel, content: text });
            if (batch.length >= BATCH) await flush();
          } catch { skipped++; }
        }
      };
      await walk(handle, '');
      await flush();
      setImportBusy(false);
      setImportProgress('');
      if (!workspace) { showToast(`No importable files found${skipped ? ` (${skipped} skipped)` : ''}`); return; }
      await loadWorkspaces();
      openWorkspace(workspace);
      showToast(`Imported ${imported} files${skipped ? `, ${skipped} skipped` : ''}`);
    } catch (err: any) {
      setImportBusy(false);
      setImportProgress('');
      if (err?.name !== 'AbortError') showToast(`Import failed: ${err.message}`);
    }
  };

  const openLocalFolder = async () => {
    const api = (window as any).desktopAPI;
    if (!api?.pickFolder) {
      setLocalFolderOpen(true);
      setLocalFolderPath('');
      return;
    }
    if (importBusy) return;
    try {
      const root = await api.pickFolder();
      if (!root) return;
      setImportBusy(true);
      setImportProgress('Registering folder…');
      const res = await ideApi.registerLocalFolder(root);
      localStorage.setItem('neural-ide-local-last', JSON.stringify({ name: res.name, root: res.root }));
      await loadWorkspaces();
      openWorkspace(res.name);
      setTerminalOpen(true);
      showToast(`Opened local folder ${res.name}`);
    } catch (err: any) {
      showToast(`Open failed: ${err.message}`);
    } finally {
      setImportBusy(false);
      setImportProgress('');
    }
  };

  const openLocalPath = async () => {
    const p = localFolderPath.trim();
    if (!p || localFolderBusy) return;
    setLocalFolderBusy(true);
    try {
      const res = await ideApi.registerLocalFolder(p);
      localStorage.setItem('neural-ide-local-last', JSON.stringify({ name: res.name, root: res.root }));
      await loadWorkspaces();
      openWorkspace(res.name);
      setTerminalOpen(true);
      setLocalFolderOpen(false);
      setLocalFolderPath('');
      showToast(`Opened local folder ${res.name}`);
    } catch (err: any) {
      showToast(`Open failed: ${err.message}`);
    } finally {
      setLocalFolderBusy(false);
    }
  };

  const removeLocalWorkspace = async (name: string) => {
    if (!confirm(`Remove "${name}" from Codestrom? Files on disk are NOT deleted.`)) return;
    try {
      await ideApi.unregisterLocalFolder(name);
      if (currentWs === name) goWelcome();
      await loadWorkspaces();
      showToast('Removed local folder');
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const loadCloudSettings = async () => {
    try {
      const s = await ideApi.getCloudSettings();
      setCloudEnabled(s.cloudEnabled);
      setCloudModel(s.openrouterModel);
      setCloudKeySet(s.keySet);
      setCloudKeyMasked(s.keyMasked);
    } catch {}
  };

  const loadCompletionsModel = async () => {
    try {
      const r = await ideApi.getCompletionsModel();
      setCompletionsModelId(r.completionsModelId || '');
    } catch {}
  };

  const saveCompletionsModel = async (id: string) => {
    setCompletionsModelBusy(true);
    try {
      await ideApi.saveCompletionsModel(id);
      setCompletionsModelId(id);
      showToast(id ? `Completions model set to ${id}` : 'Completions model reset to active model');
    } catch (err: any) {
      showToast(`Failed to save: ${err.message}`);
    } finally {
      setCompletionsModelBusy(false);
    }
  };

  const selectModel = async (id: string) => {
    setModelBusy(true);
    try {
      await modelApi.activateModel(id);
      setActiveModelId(id);
      setModelAuto(false);
      const response = await fetch('http://localhost:5000/api/models');
      if (response.ok) {
        const models: any[] = await response.json();
        setModelList(models.map((m) => ({ id: m.id, name: m.name, provider: m.provider, speed: m.speed ?? undefined })));
        const selected = models.find((m) => m.is_active);
        if (selected) {
          setActiveModel({ name: selected.name, provider: selected.provider });
          setResolvedModel({ name: selected.name, provider: selected.provider, source: 'active' });
        }
      }
      showToast('Active model updated');
    } catch (err: any) {
      showToast(`Failed to switch model: ${err.message}`);
    } finally {
      setModelBusy(false);
    }
  };

  const saveCloudSettings = async () => {
    setCloudBusy(true);
    try {
      const s = await ideApi.saveCloudSettings({ cloudEnabled, openrouterModel: cloudModel, openrouterKey: cloudKey });
      setCloudEnabled(s.cloudEnabled);
      setCloudModel(s.openrouterModel);
      setCloudKeySet(s.keySet);
      setCloudKeyMasked(s.keyMasked);
      setCloudKey('');
      setCloudTest(null);
      showToast('Cloud model settings saved');
    } catch (err: any) {
      showToast(`Save failed: ${err.message}`);
    } finally {
      setCloudBusy(false);
    }
  };

  const testCloud = async () => {
    setCloudBusy(true);
    setCloudTest(null);
    try {
      const saved = await ideApi.saveCloudSettings({ cloudEnabled, openrouterModel: cloudModel, openrouterKey: cloudKey });
      const res = await ideApi.testCloudSettings();
      setCloudTest({ ok: res.ok, message: res.message });
      setCloudEnabled(saved.cloudEnabled);
      setCloudKeySet(saved.keySet);
      setCloudKeyMasked(saved.keyMasked);
    } catch (err: any) {
      setCloudTest({ ok: false, message: String(err.message || err) });
    } finally {
      setCloudBusy(false);
    }
  };

  const toggleDir = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const openFile = async (path: string, projectRoot = false, line?: number) => {
    if (openFiles.some((f) => f.path === path)) {
      setActivePath(path);
      if (line) setRevealLine({ line, ts: Date.now() });
      return;
    }
    try {
      const res = projectRoot || readOnly
        ? await ideApi.readFile('', path, 'project')
        : await ideApi.readFile(currentWs, path);
      setOpenFiles((prev) => [...prev, { path, content: res.content, dirty: false }]);
      setActivePath(path);
      if (line) setRevealLine({ line, ts: Date.now() });
    } catch (err: any) {
      showToast(`Read failed: ${err.message}`);
    }
  };

  const closeFile = (path: string) => {
    setOpenFiles((prev) => prev.filter((f) => f.path !== path));
    if (activePath === path) {
      const rest = openFiles.filter((f) => f.path !== path);
      setActivePath(rest.length ? rest[rest.length - 1].path : null);
    }
  };

  const updateContent = (path: string, content: string) => {
    setOpenFiles((prev) => prev.map((f) => (f.path === path ? { ...f, content, dirty: true } : f)));
  };

  // Auto-save dirty files after 2s of no changes
  useEffect(() => {
    if (readOnly || projectMode || !currentWs) return;
    const dirty = openFiles.filter((f) => f.dirty);
    if (!dirty.length) return;
    const t = setTimeout(async () => {
      for (const file of dirty) {
        try {
          await ideApi.writeFile(currentWs, file.path, file.content);
          setOpenFiles((prev) => prev.map((f) => (f.path === file.path ? { ...f, dirty: false } : f)));
        } catch {}
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [openFiles, currentWs, readOnly, projectMode]);

  const saveFile = async (path: string) => {
    const file = openFiles.find((f) => f.path === path);
    if (!file || readOnly) return;
    try {
      let content = file.content;
      if (formatOnSave && !readOnly) {
        try {
          const fmt = await ideApi.formatFile(currentWs, path, content);
          if (fmt.ok && fmt.content) {
            content = fmt.content;
            setOpenFiles((prev) => prev.map((f) => (f.path === path ? { ...f, content, dirty: false } : f)));
          }
        } catch {}
      }
      await ideApi.writeFile(currentWs, path, content);
      setOpenFiles((prev) => prev.map((f) => (f.path === path ? { ...f, dirty: false } : f)));
      showToast('Saved');
    } catch (err: any) {
      showToast(`Save failed: ${err.message}`);
    }
  };

  const baseName = (p: string) => p.split('/').pop() || p;
  const dirName = (p: string) => {
    const i = p.lastIndexOf('/');
    return i < 0 ? '.' : p.slice(0, i);
  };

  const openCtx = (e: React.MouseEvent, path: string, isDir: boolean) => {
    if (readOnly || projectMode) return;
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, path, isDir });
  };

  const ctxNew = (parentDir: string, kind: 'file' | 'dir') => {
    setCtxMenu(null);
    setNewEntry({ parentDir, kind });
    setNewEntryValue('');
  };

  const ctxRename = (entry: { path: string; isDir: boolean }) => {
    setCtxMenu(null);
    setRenameEntry(entry);
    setRenameValue(baseName(entry.path));
  };

  const commitRename = async () => {
    const entry = renameEntry;
    const val = renameValue.trim();
    setRenameEntry(null);
    if (!entry || !val || readOnly) return;
    const parent = dirName(entry.path);
    const to = parent === '.' ? val : `${parent}/${val}`;
    if (to === entry.path) return;
    try {
      await ideApi.moveFile(currentWs, entry.path, to);
      setOpenFiles((prev) => prev.map((f) => (f.path === entry.path ? { ...f, path: to } : f)));
      setActivePath((p) => (p === entry.path ? to : p));
      await refreshTree();
    } catch (err: any) {
      showToast(`Rename failed: ${err.message}`);
    }
  };

  const commitNew = async () => {
    const entry = newEntry;
    const val = newEntryValue.trim();
    setNewEntry(null);
    if (!entry || !val || readOnly) return;
    const rel = entry.parentDir === '.' ? val : `${entry.parentDir}/${val}`;
    try {
      if (entry.kind === 'dir') {
        await ideApi.createFolder(currentWs, rel);
      } else {
        await ideApi.importFolder('', [{ path: rel, content: '' }], currentWs);
        setExpanded((prev) => new Set(prev).add(entry.parentDir));
      }
      await refreshTree();
      if (entry.kind === 'file') openFile(rel, false);
    } catch (err: any) {
      showToast(`${entry.kind === 'dir' ? 'Folder' : 'File'} create failed: ${err.message}`);
    }
  };

  const ctxDelete = async (path: string, isDir: boolean) => {
    setCtxMenu(null);
    if (!confirm(`Delete ${path}?`)) return;
    try {
      await ideApi.deleteFile(currentWs, path);
      closeFile(path);
      await refreshTree();
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  const dropMove = async (from: string, targetDir: string) => {
    setDragPath(null);
    setDragOverDir(null);
    if (from === targetDir) return;
    if (targetDir && from.startsWith(targetDir + '/')) return;
    try {
      await ideApi.moveFile(currentWs, from, `${targetDir === '.' ? '' : targetDir + '/'}`);
      setOpenFiles((prev) => prev.map((f) => (f.path === from ? { ...f, path: `${targetDir === '.' ? '' : targetDir + '/'}${baseName(from)}` } : f)));
      setActivePath((p) => (p === from ? `${targetDir === '.' ? '' : targetDir + '/'}${baseName(from)}` : p));
      await refreshTree();
    } catch (err: any) {
      showToast(`Move failed: ${err.message}`);
    }
  };

  const doSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      if (searchMode === 'semantic') {
        const ws = searchScope === 'project' || projectMode ? '__project__' : currentWs;
        if (!ws) throw new Error('Open a workspace to search');
        const { results } = await ideApi.semanticSearch(ws, searchQuery, 10);
        setSearchResults(
          results.map((r) => ({
            file: r.file,
            line: r.line,
            text: r.snippet || '',
            score: r.score,
            labels: r.labels,
          }))
        );
      } else {
        const results = await ideApi.search(reqWs, searchQuery, searchScope === 'project' || projectMode ? 'project' : undefined);
        setSearchResults(results);
      }
    } catch (err: any) {
      showToast(`Search failed: ${err.message}`);
    } finally {
      setSearching(false);
    }
  };

  const doReplace = async () => {
    if (!searchQuery.trim() || readOnly) return;
    setReplacing(true);
    setReplaceCount(null);
    try {
      const ws = searchScope === 'project' || projectMode ? '' : currentWs;
      const r = await ideApi.replaceInFiles(ws, searchQuery, replaceQuery);
      setReplaceCount(r.replacements);
      showToast(`Replaced ${r.replacements} occurrence${r.replacements !== 1 ? 's' : ''} in ${r.files} file${r.files !== 1 ? 's' : ''}`);
      // Refresh any open files that were modified
      await reloadOpenFiles();
      await refreshTree();
      // Re-run the search to show the updated state
      if (searchResults.length > 0) setSearchResults([]);
    } catch (err: any) {
      showToast(`Replace failed: ${err.message}`);
    } finally {
      setReplacing(false);
    }
  };

  const saveMemory = async () => {
    if (readOnly) return;
    try {
      await ideApi.saveMemory(currentWs, memory.markdown, memory.structured);
      showToast('Memory saved');
    } catch (err: any) {
      showToast(`Memory failed: ${err.message}`);
    }
  };

  const runTerminal = async () => {
    const cmd = termInput.trim();
    if (!cmd || termRunning || readOnly) return;
    setTermRunning(true);
    setTermLines([]);
    setLastTermCmd(cmd);
    setLastTermExit(null);
    try {
      const { runId } = await ideApi.terminalStart(currentWs, cmd);
      setTermRunId(runId);
      termRunIdRef.current = runId;
      const es = new EventSource(ideApi.terminalStreamUrl(runId));
      termEsRef.current = es;
      es.addEventListener('start', (e: MessageEvent) => {
        const d = JSON.parse(e.data);
        setTermLines([{ kind: 'cmd', text: `$ ${d.command}` }]);
      });
      es.addEventListener('out', (e: MessageEvent) => {
        const d = JSON.parse(e.data);
        setTermLines((prev) => [...prev, ...(d.text as string[]).map((t) => ({ kind: d.kind === 'err' ? ('err' as const) : ('out' as const), text: t }))]);
      });
      es.addEventListener('url', (e: MessageEvent) => {
        const d = JSON.parse(e.data);
        setTermPreviewUrl(d.url as string);
        setTermLines((prev) => [...prev, { kind: 'url', text: d.url as string }]);
      });
      es.addEventListener('done', (e: MessageEvent) => {
        const d = JSON.parse(e.data);
        setTermLines((prev) => [
          ...prev,
          { kind: 'out', text: d.killed ? '[terminated]' : `[exit ${d.exitCode}] (${d.durationMs}ms)` },
        ]);
        setLastTermExit(d.exitCode as number);
        es.close();
        termEsRef.current = null;
        termRunIdRef.current = null;
        setTermRunId(null);
        setTermRunning(false);
      });
      es.onerror = () => {
        // EventSource auto-reconnects; server replays the buffer on reconnect.
        if (es.readyState === EventSource.CLOSED) {
          termRunIdRef.current = null;
          setTermRunId(null);
          setTermRunning(false);
        }
      };
    } catch (err: any) {
      setTermLines((prev) => [...prev, { kind: 'err', text: String(err.message || err) }]);
      setTermRunning(false);
    }
  };

  const killTerminal = async () => {
    if (!termRunId || readOnly) return;
    try {
      await ideApi.terminalKill(termRunId);
    } catch (err: any) {
      showToast(`Kill failed: ${err.message}`);
    }
  };

  const shareTerminalPort = async (port: number) => {
    if (!currentWs || readOnly) return;
    setTermSharePort(port);
    setTermShareUrl(null);
    setTermSharePending(true);
    try {
      const r = await ideApi.shareTerminalStart(currentWs, port);
      if (r.shareUrl) {
        setTermShareUrl(r.shareUrl);
        setTermSharePending(false);
        await navigator.clipboard.writeText(r.shareUrl).catch(() => {});
        showToast('Share URL copied!');
        return;
      }
      // Poll until the tunnel URL arrives (≤30s)
      if (termSharePollRef.current) clearInterval(termSharePollRef.current);
      termSharePollRef.current = setInterval(async () => {
        try {
          const s = await ideApi.shareTerminalStatus(currentWs, port);
          if (s.shareUrl) {
            setTermShareUrl(s.shareUrl);
            setTermSharePending(false);
            clearInterval(termSharePollRef.current!);
            termSharePollRef.current = null;
            await navigator.clipboard.writeText(s.shareUrl).catch(() => {});
            showToast('Share URL ready & copied!');
          } else if (!s.sharePending) {
            setTermSharePending(false);
            clearInterval(termSharePollRef.current!);
            termSharePollRef.current = null;
            showToast('Tunnel failed to start');
          }
        } catch {}
      }, 1500);
    } catch (err: any) {
      setTermSharePending(false);
      showToast(`Share failed: ${err.message}`);
    }
  };

  // One-click smart run — picks the 'dev' profile or first available, opens terminal
  const smartRun = async () => {
    if (!currentWs || readOnly || termRunning) return;
    const profile = buildProfiles.find((p) => p.id === 'dev' || p.id === 'start') ?? buildProfiles[0];
    if (!profile) { showToast('No run scripts found — add a "dev" script to package.json'); return; }
    setTerminalOpen(true);
    setTermInput(profile.command);
    setTermLines([]);
    setLastTermCmd(profile.command);
    setLastTermExit(null);
    setTermRunning(true);
    try {
      const { runId } = await ideApi.terminalStart(currentWs, profile.command);
      setTermRunId(runId);
      termRunIdRef.current = runId;
      const es = new EventSource(ideApi.terminalStreamUrl(runId));
      termEsRef.current = es;
      es.addEventListener('start', (e: MessageEvent) => {
        const d = JSON.parse(e.data);
        setTermLines([{ kind: 'cmd', text: `$ ${d.command}` }]);
      });
      es.addEventListener('out', (e: MessageEvent) => {
        const d = JSON.parse(e.data);
        setTermLines((prev) => [...prev, ...(d.text as string[]).map((t) => ({ kind: d.kind === 'err' ? ('err' as const) : ('out' as const), text: t }))]);
      });
      es.addEventListener('url', (e: MessageEvent) => {
        const d = JSON.parse(e.data);
        setTermPreviewUrl(d.url as string);
        setTermLines((prev) => [...prev, { kind: 'url', text: d.url as string }]);
      });
      es.addEventListener('done', (e: MessageEvent) => {
        const d = JSON.parse(e.data);
        setTermRunning(false);
        setLastTermExit(d.exitCode ?? 0);
        es.close();
        termEsRef.current = null;
        termRunIdRef.current = null;
      });
      es.onerror = () => { if (es.readyState === EventSource.CLOSED) { setTermRunning(false); es.close(); termEsRef.current = null; } };
    } catch (err: any) {
      setTermRunning(false);
      showToast(`Run failed: ${err.message}`);
    }
  };

  const fixErrors = async () => {
    const cmd = lastTermCmd;
    if (!cmd || fixBusy || readOnly) return;
    setFixBusy(true);
    setTermLines((prev) => [...prev, { kind: 'cmd', text: `$ auto-fix: ${cmd}` }]);
    try {
      await ideApi.fixRun(
        currentWs,
        cmd,
        3,
        (p) => {
          setTermLines((prev) => [
            ...prev,
            { kind: p.status === 'failed' || p.status === 'error' ? 'err' : 'out', text: `[${p.agent}] ${p.message}${p.detail ? ` — ${p.detail}` : ''}` },
          ]);
        },
        (p) => {
          if (p.kind === 'out' || p.kind === 'err') {
            const text = String(p.content || '');
            if (text.trim()) {
              setTermLines((prev) => [
                ...prev,
                ...text.split('\n').filter((t: string) => t.trim()).map((t: string) => ({ kind: p.kind as 'out' | 'err', text: t })),
              ]);
            }
          } else if (p.kind === 'files' && p.content === 'refresh') {
            void refreshTree();
          }
        },
        (d) => {
          setTermLines((prev) => [
            ...prev,
            { kind: d.failed ? 'err' : 'out', text: d.failed ? `[auto-fix failed] ${d.summary}` : `[auto-fix passed] ${d.summary}` },
          ]);
          setLastTermExit(d.failed ? (d.exitCode as number) : 0);
          setFixBusy(false);
          if (d.files?.length) void refreshTree();
          showToast(d.failed ? `Auto-fix failed (exit ${d.exitCode})` : `Auto-fix succeeded in ${d.rounds} round(s)`);
        },
        (m) => {
          setTermLines((prev) => [...prev, { kind: 'err', text: `[auto-fix error] ${m}` }]);
          setFixBusy(false);
        }
      );
    } catch (err: any) {
      setTermLines((prev) => [...prev, { kind: 'err', text: `[auto-fix error] ${String(err.message || err)}` }]);
      setFixBusy(false);
    }
  };

  const runAgentFor = (t: string, ws: string, resumeRunId?: string) => {
     runPipelineFor(t, ws, resumeRunId);
   };

  const startBuild = async (profileId: string) => {
    if (buildBusy || !currentWs || readOnly) return;
    const profile = buildProfiles.find((p) => p.id === profileId);
    if (!profile) return;
    const jobId = `build-${Date.now().toString(36)}`;
    setBuildBusy(true);
    setActiveBuildJob(jobId);
    setBuildLogs([{ timestamp: new Date().toISOString(), stream: 'system', data: `$ ${profile.command}` }]);
    setBuildJobs((prev) => [...prev, {
      id: jobId,
      workspace: currentWs,
      profile: profile.id,
      status: 'running',
      command: profile.command,
      cwd: currentWs,
      logs: [],
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    }]);
    let jobFinished = false;
    const finish = (exitCode?: number) => {
      if (jobFinished) return;
      jobFinished = true;
      setBuildBusy(false);
      setActiveBuildJob(null);
      setBuildJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, status: (exitCode ?? 0) === 0 ? 'success' : 'failed', exitCode, endedAt: new Date().toISOString(), finishedAt: new Date().toISOString() }
            : j,
        ),
      );
      buildTermRunIdRef.current = null;
    };
    try {
      const { runId } = await ideApi.terminalStart(currentWs, profile.command);
      buildTermRunIdRef.current = runId;
      const es = new EventSource(ideApi.terminalStreamUrl(runId));
      buildEsRef.current = es;
      es.addEventListener('out', (e: MessageEvent) => {
        const d = JSON.parse(e.data);
        const lines = (d.text as string[] || []).map((t) => ({
          timestamp: new Date().toISOString(),
          stream: (d.kind === 'err' ? 'stderr' : 'stdout') as 'stdout' | 'stderr',
          data: t,
        }));
        setBuildLogs((prev) => [...prev, ...lines]);
        setBuildJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, logs: [...j.logs, ...lines] } : j)),
        );
      });
      es.addEventListener('done', (e: MessageEvent) => {
        const d = JSON.parse(e.data);
        finish(d.exitCode);
        es.close();
        buildEsRef.current = null;
        buildTermRunIdRef.current = null;
      });
      es.onerror = () => {
        if (es.readyState === EventSource.CLOSED) {
          finish(-1);
          buildEsRef.current = null;
          buildTermRunIdRef.current = null;
        }
      };
    } catch (err: any) {
      setBuildLogs((prev) => [
        ...prev,
        { timestamp: new Date().toISOString(), stream: 'stderr', data: String(err.message || err) },
      ]);
      finish(-1);
    }
  };

  const cancelBuild = async () => {
    const rid = buildTermRunIdRef.current;
    if (!rid) {
      setBuildBusy(false);
      setActiveBuildJob(null);
      return;
    }
    try {
      await ideApi.terminalKill(rid);
    } catch (err: any) {
      showToast(`Cancel failed: ${err.message}`);
    }
    buildEsRef.current?.close();
    buildEsRef.current = null;
    buildTermRunIdRef.current = null;
    setBuildBusy(false);
    setActiveBuildJob(null);
    setBuildJobs((prev) =>
      prev.map((j) =>
        j.status === 'running' ? { ...j, status: 'cancelled', endedAt: new Date().toISOString(), finishedAt: new Date().toISOString() } : j,
      ),
    );
  };

  const clearBuildLogs = () => {
    setBuildLogs([]);
  };

  // ── Debugger helpers ─────────────────────────────────────────────────────────
  const startDebug = async () => {
    if (!currentWs || !debugFile.trim() || debugBusy) return;
    setDebugBusy(true);
    setDebugOutput([]);
    setDebugStack([]);
    setDebugVars([]);
    try {
      // Resolve lang: auto → detect from extension
      const resolvedLang = debugLang === 'auto'
        ? (debugFile.trim().endsWith('.py') ? 'python' : 'node')
        : debugLang;
      const r = await ideApi.debugStart(currentWs, debugFile.trim(), [], resolvedLang);
      setDebugId(r.debugId);
      setDebugStatus('running');
      showToast(`Debugger attached (pid ${r.pid}, port ${r.port})`);
      // Poll status every 800ms
      if (debugPollRef.current) clearInterval(debugPollRef.current);
      debugPollRef.current = setInterval(async () => {
        if (!r.debugId) return;
        try {
          const s = await ideApi.debugStatus(r.debugId);
          setDebugStatus(s.status as any);
          if (s.output?.length) setDebugOutput((prev) => [...prev, ...s.output].slice(-200));
          if (s.paused) {
            const [stackRes, varsRes] = await Promise.all([
              ideApi.debugStack(r.debugId),
              ideApi.debugVariables(r.debugId),
            ]);
            setDebugStack(stackRes.stack || []);
            setDebugVars(varsRes.variables || []);
          } else {
            setDebugStack([]);
            setDebugVars([]);
          }
          if (s.status === 'exited' || s.status === 'error') {
            clearInterval(debugPollRef.current!);
            debugPollRef.current = null;
          }
        } catch {}
      }, 800);
    } catch (err: any) {
      showToast(`Debug start failed: ${err.message}`);
      setDebugStatus('error');
    } finally {
      setDebugBusy(false);
    }
  };

  const stopDebug = async () => {
    if (!debugId) return;
    if (debugPollRef.current) { clearInterval(debugPollRef.current); debugPollRef.current = null; }
    try { await ideApi.debugStop(debugId); } catch {}
    setDebugId(null);
    setDebugStatus('idle');
    setDebugStack([]);
    setDebugVars([]);
    setDebugOutput([]);
  };

  const toggleBreakpoint = async (file: string, line: number) => {
    if (!debugId) return;
    const fileKey = file;
    const existing = debugBreakpoints.get(fileKey);
    const hasLine = existing?.has(line);
    try {
      await ideApi.debugBreakpoint(debugId, file, line, !!hasLine);
      setDebugBreakpoints((prev) => {
        const next = new Map(prev);
        const lines = new Set(next.get(fileKey) || []);
        if (hasLine) lines.delete(line);
        else lines.add(line);
        next.set(fileKey, lines);
        return next;
      });
    } catch (err: any) {
      showToast(`Breakpoint failed: ${err.message}`);
    }
  };

  // Clean up debug session on workspace change
  useEffect(() => {
    return () => {
      if (debugPollRef.current) clearInterval(debugPollRef.current);
    };
  }, []);

  const runPipeline = async () => {
     if (!task.trim() || running) return;
     runPipelineFor(task, currentWs);
   };

  const runDelivery = async () => {
    if (!task.trim() || running) return;
    runDeliveryFor(task, currentWs);
  };

  const runDeliveryFor = async (t: string, ws: string) => {
    if (!t.trim() || !ws || readOnly) {
      if (readOnly) showToast('Open a sandboxed workspace to run agents');
      return;
    }
    if (running) {
      showToast('A delivery run is already in progress');
      return;
    }
    setRunning(true);
    setRunFailed(false);
    setRunPaused(false);
    setAgentRunId(null);
    prevTaskRef.current = t;
    setSteps([]);
    setLogs([]);
    setPlanSteps([]);
    setExecLog([]);
    setSummary('');
    setGeneratedFiles([]);
    setDiffs([]);
    setThinkingText('');
    setReasoningBlocks({});
    setExpandedReasoning(null);
    setChat((prev) => [...prev, { role: 'user', content: t, at: Date.now() }]);
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    const fullTask = [
      t,
      webCtx ? `[Web context from ${webCtx.source}]:\n${webCtx.content.slice(0, 3000)}` : '',
      scratchpad.trim() ? `[Scratchpad notes]:\n${scratchpad.trim().slice(0, 2000)}` : '',
    ].filter(Boolean).join('\n\n');
    try {
      const liveTask = await ideApi.createLiveTask(ws, t);
      setLiveTaskId(liveTask.task.id);
      setLiveTaskRecord({ ...liveTask.task, goal: t, plan: [], modifiedFiles: [] });
      abortRef.current = ideApi.runDelivery(
        ws,
        fullTask,
        (ev) => {
          if (ev.event === 'plan_update' && Array.isArray(ev.plan)) setPlanSteps(ev.plan);
          if (ev.event === 'summary' && ev.text) setSummary(String(ev.text));
        },
        (d) => {
          setSummary(d.summary || 'Delivery run complete');
          setRunFailed(!!d.error || !!d.cancelled || !!d.failed);
          setRunPaused(!!d.paused);
          setRunning(false);
          streamsRef.current.clear();
          setChat((prev) => [...prev, { role: 'assistant', content: d.summary || 'Delivery run complete', at: Date.now(), files: d.files || [] }]);
          setTask('');
          loadRuns(ws);
          refreshTree();
          loadDiff(ws);
          void loadCheckpoints(ws);
          ideApi.sessionUsage().then((r) => setSessionTokens(r.totalTokens)).catch(() => {});
          refreshGit(ws);
          reloadOpenFiles();
        },
        (err) => {
          setSummary(`Delivery failed: ${err}`);
          setRunFailed(true);
          setRunning(false);
          setRunPaused(false);
          streamsRef.current.clear();
          setChat((prev) => [...prev, { role: 'assistant', content: `Delivery failed: ${err}`, at: Date.now() }]);
        },
        liveTask.task.id,
      );
    } catch (err: any) {
      setRunning(false);
      showToast(`Delivery error: ${err.message}`);
    }
  };

  /** Pop the next task from the queue and start it automatically. */
  const drainQueue = (ws: string) => {
    const next = taskQueueRef.current.shift();
    if (!next) return;
    setTaskQueue([...taskQueueRef.current]);
    showToast(`▶ Starting queued task: ${next.slice(0, 60)}${next.length > 60 ? '…' : ''}`);
    setTimeout(() => {
      if (quickMode) runQuickAgent(next);
      else runPipelineFor(next, ws);
    }, 400);
  };

  const collectCtx = (t: string) => {
    const mentioned = new Set<string>();
    for (const m of mentions) if (flatFiles.includes(m)) mentioned.add(m);
    for (const mm of t.match(/@[\w./-]+/g) || []) {
      const p = mm.slice(1);
      if (flatFiles.includes(p)) mentioned.add(p);
    }
    // Auto-attach the active file when the user hasn't manually specified any @file context
    if (mentioned.size === 0 && activePath && flatFiles.includes(activePath)) {
      mentioned.add(activePath);
    }
    const mentionedSyms = new Set<string>(mentionSymbols);
    for (const mm of t.match(/@[\w./-]+/g) || []) {
      const n = mm.slice(1);
      if (!flatFiles.includes(n)) mentionedSyms.add(n);
    }
    return { ctxFiles: [...mentioned], ctxSymbols: [...mentionedSyms] };
  };

  const runQuickAgent = async (t?: string) => {
    const taskText = (t ?? task).trim();
    const ws = currentWs;
    if (!taskText || !ws || readOnly) {
      if (readOnly) showToast('Open a sandboxed workspace to run agents');
      return;
    }
    // If already running, queue the task instead of dropping it
    if (running) {
      taskQueueRef.current = [...taskQueueRef.current, taskText];
      setTaskQueue([...taskQueueRef.current]);
      showToast(`Queued: ${taskText.slice(0, 60)}${taskText.length > 60 ? '…' : ''}`);
      setTask('');
      return;
    }
    setRunning(true);
    setRunFailed(false);
    setRunPaused(false);
    setAgentRunId(null);
    prevTaskRef.current = taskText;
    setSteps([]);
    setLogs([]);
    setPlanSteps([]);
    setExecLog([]);
    setSummary('');
    setGeneratedFiles([]);
    setDiffs([]);
    setThinkingText('');
    setReasoningBlocks({});
    setExpandedReasoning(null);
    setChat((prev) => [...prev, { role: 'user', content: taskText, at: Date.now() }]);
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    const { ctxFiles, ctxSymbols } = collectCtx(taskText);
    const fullTask = [
      taskText,
      webCtx ? `[Web context from ${webCtx.source}]:\n${webCtx.content.slice(0, 3000)}` : '',
      scratchpad.trim() ? `[Scratchpad notes]:\n${scratchpad.trim().slice(0, 2000)}` : '',
    ].filter(Boolean).join('\n\n');
    setWebCtx(null);
    try {
      abortRef.current = ideApi.runToolAgent(
        ws,
        fullTask,
        (s) => {
          setSteps((prev) => {
            // Tool chips: keep all tool steps separately (don't dedupe by agent)
            if (s.agent === 'tool') return [...prev, s as AgentStep];
            return [...prev.filter((p) => p.agent !== s.agent || p.agent === 'tool'), s as AgentStep];
          });
          if (stepsRef.current) stepsRef.current.scrollTop = stepsRef.current.scrollHeight;
        },
        (l) => {
          setLogs((prev) => [...prev, l as AgentLog]);
          if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
          if (l.kind === 'files') {
            refreshTree();
            reloadOpenFiles();
          }
        },
        (d) => {
          const files: string[] = d.files || [];
          setSummary(d.summary || 'Quick agent complete');
          setRunFailed(!!d.error || !!d.cancelled || !!d.failed);
          setRunPaused(!!d.paused);
          setGeneratedFiles(files);
          setRunning(false);
          drainQueue(ws);
          setChat((prev) => [...prev, { role: 'assistant', content: d.summary || 'Quick agent complete', at: Date.now(), files }]);
          setTask('');
          loadRuns(ws);
          refreshTree();
          loadDiff(ws);
          void loadCheckpoints(ws);
          ideApi.sessionUsage().then((r) => setSessionTokens(r.totalTokens)).catch(() => {});
          // auto-open preview for web projects
          if (files.some((f) => /\.(html|htm)$/.test(f) || f === 'index.html')) {
            setTimeout(() => { setPreviewOpen(true); setPreviewKey((k) => k + 1); }, 800);
          }
        },
        (err) => {
          setSummary(`Quick agent failed: ${err}`);
          setRunFailed(true);
          setRunning(false);
          drainQueue(ws);
          setChat((prev) => [...prev, { role: 'assistant', content: `Quick agent failed: ${err}`, at: Date.now() }]);
        },
        ctxFiles,
        ctxSymbols,
        requirePermissions,
        (confirm) => setPendingConfirm({ runId: confirm.runId, tool: confirm.tool, path: confirm.path, preview: confirm.preview }),
        (t) => {
          if (t.done) setThinkingText('');
          else setThinkingText((prev) => prev + t.text);
        },
        (r) => {
          const key = r.agent || 'agent';
          setReasoningBlocks((prev) => ({ ...prev, [key]: r.text }));
          setExpandedReasoning(key);
        },
      );
    } catch (err: any) {
      setRunning(false);
      showToast(`Quick agent failed: ${err.message}`);
    }
  };

  const loadRuns = useCallback(async (ws: string) => {
    if (!ws || projectMode) return;
    try {
      const r = await ideApi.agentRuns(ws);
      setRuns(r.runs);
    } catch {}
  }, [projectMode]);

  // Restore durable task history after refresh and keep the compact Live Task
  // card current while an agent stream is active.
  useEffect(() => {
    if (!currentWs || projectMode) { setLiveTaskRecord(null); return; }
    let alive = true;
    const refresh = async () => {
      try {
        const { tasks } = await ideApi.liveTasks(currentWs);
        if (!alive) return;
        const latest = tasks[0] || null;
        setLiveTaskRecord(latest);
        if (latest) setLiveTaskId((previous) => previous || latest.id);
      } catch {}
    };
    void refresh();
    const poll = running ? window.setInterval(refresh, 1800) : undefined;
    return () => { alive = false; if (poll) window.clearInterval(poll); };
  }, [currentWs, projectMode, running]);

  useEffect(() => {
    if (!liveTaskId) return;
    const events = new EventSource(ideApi.liveTaskEventsUrl(liveTaskId));
    events.onmessage = () => {
      void ideApi.liveTask(liveTaskId).then(({ task }) => setLiveTaskRecord(task)).catch(() => {});
    };
    return () => events.close();
  }, [liveTaskId]);

  const toggleRunExpand = useCallback(async (runId: string) => {
    setExpandedRuns((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        next.add(runId);
        // Load sub-agents for this run
        if (currentWs && !subAgentsMap[runId]) {
          ideApi.agentSubAgents(currentWs, runId).then((r) => {
            setSubAgentsMap((m) => ({ ...m, [runId]: r.subAgents || [] }));
          }).catch(() => {});
        }
      }
      return next;
    });
  }, [currentWs, subAgentsMap]);

  const pauseRun = async () => {
    if (!currentWs || !running) return;
    try {
      await ideApi.agentPause(currentWs);
      showToast('Pausing run after current step…');
    } catch (err: any) {
      showToast(`Pause failed: ${err.message}`);
    }
  };

  const resumeRun = (run: AgentRun) => {
    if (!currentWs || running || readOnly) return;
    if (run.status !== 'paused') return;
    setTask(run.task);
    setRunsOpen(false);
    setTimeout(() => runPipelineFor(run.task, currentWs, run.id), 100);
  };

  const runPipelineFor = async (t: string, ws: string, resumeRunId?: string) => {
    if (!t.trim() || !ws || readOnly) {
      if (readOnly) showToast('Open a sandboxed workspace to run agents');
      return;
    }
    // If already running, queue the task
    if (running) {
      if (liveTaskId) {
        try {
          await ideApi.steerLiveTask(liveTaskId, t);
          setChat((prev) => [...prev, { role: 'user', content: t, at: Date.now() }, { role: 'assistant', content: 'Direction received. I will apply it at the next safe step and revise the plan if the scope changes.', at: Date.now() }]);
          showToast('Direction sent to the live task');
          setTask('');
          return;
        } catch (err: any) { showToast(`Could not send direction: ${err.message}`); }
      }
      taskQueueRef.current = [...taskQueueRef.current, t];
      setTaskQueue([...taskQueueRef.current]);
      showToast(`Queued: ${t.slice(0, 60)}${t.length > 60 ? '…' : ''}`);
      setTask('');
      return;
    }
    setRunning(true);
    setRunFailed(false);
    setRunPaused(false);
    setAgentRunId(resumeRunId || null);
    prevTaskRef.current = t;
    setSteps([]);
    setLogs([]);
    setPlanSteps([]);
    setExecLog([]);
    setSummary('');
    setGeneratedFiles([]);
    setDiffs([]);
    setThinkingText('');
    setReasoningBlocks({});
    setExpandedReasoning(null);
    setChat((prev) => [...prev, { role: 'user', content: t, at: Date.now() }]);
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    const { ctxFiles, ctxSymbols } = collectCtx(t);
    const fullPipelineTask = [
      t,
      scratchpad.trim() ? `[Scratchpad notes]:\n${scratchpad.trim().slice(0, 2000)}` : '',
    ].filter(Boolean).join('\n\n');
    try {
      // The task record is created before SSE starts so refresh/restart never
      // loses the user's goal, plan, approvals, or verification evidence.
      const liveTask = await ideApi.createLiveTask(ws, t);
      setLiveTaskId(liveTask.task.id);
      setLiveTaskRecord({ ...liveTask.task, goal: t, plan: [], modifiedFiles: [] });
      abortRef.current = ideApi.runPipeline(
        ws,
        fullPipelineTask,
        (s) => {
          setSteps((prev) => [...prev.filter((p) => p.agent !== s.agent), s as AgentStep]);
          if (stepsRef.current) stepsRef.current.scrollTop = stepsRef.current.scrollHeight;
        },
        (l) => {
          setLogs((prev) => [...prev, l as AgentLog]);
          if (l.kind === 'plan') {
            try {
              const parsed = JSON.parse(l.content);
              if (Array.isArray(parsed)) {
                setPlanSteps(parsed);
                // Plan edit gate: show modal so user can review/edit before executor fires.
                // The pipeline keeps running but the backend pauses at plan stage waiting
                // for the front-end — we surface it as an async interruption in the UI.
                new Promise<typeof parsed>((resolve) => {
                  setPendingPlan({ milestones: parsed, resolve });
                }).then((edited) => {
                  if (edited.length) setPlanSteps(edited);
                }).catch(() => {});
              }
            } catch {}
          }
          if (l.kind === 'exec') {
            try {
              const parsed = JSON.parse(l.content) as ExecStatus;
              setExecLog((prev) => [...prev.filter((e) => e.index !== parsed.index), parsed].sort((a, b) => a.index - b.index));
            } catch {}
          }
          if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
          if (l.kind === 'files') {
            refreshTree();
            reloadOpenFiles();
          }
        },
        (d) => {
          const files: string[] = d.files || [];
          setSummary(d.summary || 'Pipeline complete');
          setRunFailed(!!d.error || !!d.cancelled || !!d.failed);
          setRunPaused(!!d.paused);
          setAgentRunId(d.runId || resumeRunId || null);
          setGeneratedFiles(files);
          setRunning(false);
          if (!d.paused) drainQueue(ws);
          streamsRef.current.clear();
          setChat((prev) => [...prev, { role: 'assistant', content: d.summary || 'Pipeline complete', at: Date.now(), files }]);
          setTask(d.paused ? prevTaskRef.current : '');
          loadRuns(ws);
          refreshTree();
          loadDiff(ws);
          void loadCheckpoints(ws);
          ideApi.sessionUsage().then((r) => setSessionTokens(r.totalTokens)).catch(() => {});
          refreshGit(ws);
          reloadOpenFiles();
          // auto-open preview for web projects
          if (files.some((f) => /\.(html|htm)$/.test(f) || f === 'index.html')) {
            setTimeout(() => { setPreviewOpen(true); setPreviewKey((k) => k + 1); }, 800);
          }
        },
        (err) => {
          setSummary(`Pipeline failed: ${err}`);
          setRunFailed(true);
          setRunning(false);
          drainQueue(ws);
          setRunPaused(false);
          streamsRef.current.clear();
          setChat((prev) => [...prev, { role: 'assistant', content: `Pipeline failed: ${err}`, at: Date.now() }]);
        },
        ctxFiles,
        (s) => {
          const full = (streamsRef.current.get(s.path) || '') + s.chunk;
          streamsRef.current.set(s.path, full);
          setOpenFiles((prev) => {
            const exists = prev.some((f) => f.path === s.path);
            if (exists) return prev.map((f) => (f.path === s.path ? { ...f, content: full, dirty: false } : f));
            return [...prev, { path: s.path, content: full, dirty: false }];
          });
          if (!openFiles.some((f) => f.path === s.path)) setActivePath(s.path);
        },
        resumeRunId,
        ctxSymbols,
        (th) => {
          if (th.done) setThinkingText('');
          else setThinkingText((prev) => prev + th.text);
        },
        (r) => {
          const key = r.agent || 'agent';
          setReasoningBlocks((prev) => ({ ...prev, [key]: r.text }));
          setExpandedReasoning(key);
        },
        liveTask.task.id,
        (request) => setPendingLiveApproval({ taskId: request.taskSessionId || liveTask.task.id, action: request.action, title: request.title, reason: request.reason, risk: request.risk }),
      );
    } catch (err: any) {
      setRunning(false);
      showToast(`Pipeline error: ${err.message}`);
    }
  };

  const stopPipeline = () => {
    if (currentWs) ideApi.cancelPipeline(currentWs).catch(() => {});
    abortRef.current?.abort();
    setRunning(false);
    setRunFailed(true);
    setSummary('Run stopped. Generated changes remain available for review or rollback.');
    setChat((prev) => [...prev, { role: 'assistant', content: '⏹ Run stopped by user — you can adjust the task and run again.', at: Date.now() }]);
  };

  const rollbackRun = async (runId?: string) => {
    if (!currentWs || running) return;
    if (!runId && !confirm('Roll back the workspace to before the last agent run? Uncommitted changes will be lost.')) return;
    try {
      const r = await ideApi.rollbackRun(currentWs, runId);
      setRunFailed(false);
      setDiffs([]);
      setGeneratedFiles([]);
      await refreshTree();
      await reloadOpenFiles();
      loadRuns(currentWs);
      showToast(`Rolled back${r.restored > 0 ? ` — ${r.restored} file(s) restored` : ''}${r.removed > 0 ? `, ${r.removed} later run(s) removed from history` : ''}`);
    } catch (err: any) {
      showToast(`Rollback failed: ${err.message}`);
    }
  };

  const generateTests = async () => {
    if (!currentWs || testGenBusy) return;
    setTestGenBusy(true);
    setTestGenResult(null);
    setTestGenStatus('Preparing…');
    // Cancel any in-flight
    testGenEsRef.current?.abort();
    const controller = new AbortController();
    testGenEsRef.current = controller;
    try {
      const BASE = 'http://localhost:5000';
      const r = await fetch(`${BASE}/api/ide/tests/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace: currentWs, files: generatedFiles.filter((f) => /\.(js|ts|jsx|tsx|py)$/.test(f)) }),
        signal: controller.signal,
      });
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
          const line = buf.slice(0, idx); buf = buf.slice(idx + 1);
          if (!line.startsWith('data:')) continue;
          try {
            const ev = JSON.parse(line.slice(5).trim());
            if (ev.event === 'status') setTestGenStatus(ev.text || '');
            else if (ev.event === 'file_written') setTestGenStatus(`Written ${ev.path}`);
            else if (ev.event === 'result') {
              setTestGenResult({ passed: ev.passed, output: ev.output || '', testFile: ev.testFile, fixed: ev.fixed });
              setTestGenStatus('');
              if (ev.testFile) {
                openFile(ev.testFile);
                await refreshTree();
              }
              showToast(ev.passed ? `Tests passed ✓` : `Tests written — some failing`);
            } else if (ev.event === 'error') {
              setTestGenStatus('');
              showToast(`Test gen: ${ev.message}`);
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') showToast(`Test generation failed: ${err.message}`);
    } finally {
      setTestGenBusy(false);
      setTestGenStatus('');
    }
  };

  const loadCheckpoints = useCallback(async (ws: string) => {
    if (!ws || projectMode) return;
    try {
      const r = await ideApi.checkpointList(ws);
      setCheckpoints(r.checkpoints);
    } catch {}
  }, [projectMode]);

  const afterRestore = async () => {
    setDiffs([]);
    await refreshTree();
    await reloadOpenFiles();
    if (currentWs) {
      loadRuns(currentWs);
      void loadCheckpoints(currentWs);
    }
  };

  const undoLast = async () => {
    if (!currentWs) return;
    if (!confirm('Undo to the previous checkpoint? All changes since then will be lost.')) return;
    try {
      const r = await ideApi.checkpointRestore(currentWs);
      await afterRestore();
      showToast(`Undone — ${r.restored} file(s) restored${r.removed > 0 ? `, ${r.removed} removed` : ''}`);
    } catch (err: any) {
      showToast(`Undo failed: ${err.message}`);
    }
  };

  const loadMcpServers = useCallback(async () => {
    try {
      const r = await ideApi.mcpList();
      setMcpServers(r.servers);
    } catch (err: any) {
      setMcpError(err.message);
    }
  }, []);

  useEffect(() => {
    void loadMcpServers();
  }, [loadMcpServers]);

  const loadCsRules = useCallback(async () => {
    if (!currentWs) { setCsRules([]); return; }
    try {
      const r = await ideApi.rulesList(currentWs);
      setCsRules(r.rules);
    } catch (err: any) {
      setCsRulesError(err.message);
    }
  }, [currentWs]);

  useEffect(() => {
    void loadCsRules();
  }, [loadCsRules]);

  const startNewRule = () => {
    setCsRuleEditing('');
    setCsRuleDraft({ name: '', glob: '', apply: 'always', description: '', content: '' });
    setCsRulesError(null);
  };

  const editRule = (r: { name: string; glob: string | null; apply: 'always' | 'auto'; description: string; content: string }) => {
    setCsRuleEditing(r.name);
    setCsRuleDraft({ name: r.name, glob: r.glob || '', apply: r.apply, description: r.description, content: r.content });
    setCsRulesError(null);
  };

  const saveCsRule = async () => {
    if (readOnly || !currentWs || csRulesBusy) return;
    setCsRulesBusy(true);
    setCsRulesError(null);
    try {
      await ideApi.rulesSave(currentWs, {
        name: csRuleDraft.name.trim() || csRuleEditing || 'rule',
        content: csRuleDraft.content,
        glob: csRuleDraft.glob.trim() || undefined,
        apply: csRuleDraft.apply,
        description: csRuleDraft.description.trim() || undefined,
      });
      setCsRuleEditing(null);
      setCsRuleDraft({ name: '', glob: '', apply: 'always', description: '', content: '' });
      await loadCsRules();
      showToast('Rule saved — applied on the next agent run');
    } catch (err: any) {
      setCsRulesError(err.message);
    } finally {
      setCsRulesBusy(false);
    }
  };

  const removeCsRule = async (name: string) => {
    if (readOnly || !currentWs) return;
    if (!confirm(`Delete rule "${name}"?`)) return;
    try {
      await ideApi.rulesDelete(currentWs, name);
      if (csRuleEditing === name) { setCsRuleEditing(null); setCsRuleDraft({ name: '', glob: '', apply: 'always', description: '', content: '' }); }
      await loadCsRules();
    } catch (err: any) {
      setCsRulesError(err.message);
    }
  };

  const testMcpServer = async (id: string) => {
    setMcpStatus((s) => ({ ...s, [id]: 'testing' }));
    try {
      const r = await ideApi.mcpTest(id);
      if (!r.success || r.error) throw new Error(r.error || 'Test failed');
      setMcpTools((t) => ({ ...t, [id]: (r.tools || []).map((tool) => ({ name: tool.name, description: tool.description })) }));
      setMcpStatus((s) => ({ ...s, [id]: 'ok' }));
    } catch (err: any) {
      setMcpStatus((s) => ({ ...s, [id]: 'error' }));
      setMcpError(err.message);
    }
  };

  const addMcpServer = async () => {
    setMcpError(null);
    try {
      let headers: Record<string, string> | undefined;
      if (mcpForm.headers.trim()) {
        headers = JSON.parse(mcpForm.headers);
      }
      await ideApi.mcpAdd(mcpForm.name.trim(), mcpForm.url.trim(), headers);
      setMcpForm({ name: '', url: '', headers: '' });
      setMcpAddOpen(false);
      await loadMcpServers();
      showToast('MCP server added — it will be available to agents on the next run');
    } catch (err: any) {
      setMcpError(err.message);
    }
  };

  const removeMcpServer = async (id: string) => {
    try {
      await ideApi.mcpRemove(id);
      setMcpTools((t) => {
        const next = { ...t };
        delete next[id];
        return next;
      });
      setMcpStatus((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });
      await loadMcpServers();
    } catch (err: any) {
      setMcpError(err.message);
    }
  };

  const restoreCheckpoint = async (runId: string, label: string) => {
    if (!currentWs) return;
    if (!confirm(`Restore to "${label}"? Changes made after it will be lost.`)) return;
    try {
      const r = await ideApi.checkpointRestore(currentWs, runId);
      setCheckpointsOpen(false);
      await afterRestore();
      showToast(`Restored "${label}" — ${r.restored} file(s)`);
    } catch (err: any) {
      showToast(`Restore failed: ${err.message}`);
    }
  };

  const commitCheckpoints = async () => {
    if (!currentWs) return;
    if (!confirm('Keep the current state as the new baseline? The previous checkpoint will no longer be undoable.')) return;
    try {
      const r = await ideApi.checkpointCommit(currentWs);
      setCheckpoints(r.checkpoints);
      loadDiff(currentWs);
      showToast('Current state saved as baseline');
    } catch (err: any) {
      showToast(`Baseline failed: ${err.message}`);
    }
  };

  const deleteRun = async (runId: string) => {
    if (!confirm('Delete this run record? The workspace files stay untouched.')) return;
    try {
      await ideApi.agentRunDelete(runId);
      if (currentWs) loadRuns(currentWs);
      showToast('Run record deleted');
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  // ── Session helpers ──────────────────────────────────────────────────────────
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? sessions[0];

  const updateSession = (id: string, patch: Partial<ComposerSession>) => {
    setSessions((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s));
  };

  const addSession = () => {
    const s = newSession();
    setSessions((prev) => [...prev, s]);
    setActiveSessionId(s.id);
    // Save current active session before switching
    updateSession(activeSessionId, { chat, steps, logs, task, mentions, summary, generatedFiles, running });
    // Reset live state for new session
    setChat([]); setSteps([]); setLogs([]); setTask(''); setMentions([]); setSummary(''); setGeneratedFiles([]); setRunning(false);
  };

  const switchSession = (id: string) => {
    if (id === activeSessionId) return;
    if (running) { showToast('Stop the current run before switching sessions'); return; }
    // Save current state into active session
    updateSession(activeSessionId, { chat, steps, logs, task, mentions, summary, generatedFiles, running });
    // Restore target session
    const target = sessions.find((s) => s.id === id) ?? newSession(id);
    setActiveSessionId(id);
    setChat(target.chat); setSteps(target.steps); setLogs(target.logs);
    setTask(target.task); setMentions(target.mentions); setSummary(target.summary);
    setGeneratedFiles(target.generatedFiles); setRunning(false);
  };

  const removeSession = (id: string) => {
    if (sessions.length <= 1) { showToast('Cannot remove the last session'); return; }
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (activeSessionId === id) {
      const fallback = remaining[0];
      setActiveSessionId(fallback.id);
      setChat(fallback.chat); setSteps(fallback.steps); setLogs(fallback.logs);
      setTask(fallback.task); setMentions(fallback.mentions); setSummary(fallback.summary);
      setGeneratedFiles(fallback.generatedFiles); setRunning(false);
    }
  };

  const clearChat = async () => {
    if (!currentWs) return;
    if (!confirm('Clear this conversation? The workspace files stay untouched.')) return;
    try {
      await ideApi.clearChat(currentWs);
      setChat([]);
    } catch (err: any) {
      showToast(`Clear failed: ${err.message}`);
    }
  };

  const sendChatMessage = async (msg: string) => {
    if (!currentWs || !msg.trim() || chatStreaming) return;
    let userMsg = msg.trim();

    // @codebase — resolve semantic search results and prepend as context
    if (/@codebase\b/i.test(userMsg)) {
      const query = userMsg.replace(/@codebase\b/gi, '').trim();
      setChatStreamText('Searching codebase…▌');
      setChatStreaming(true);
      try {
        const { results } = await ideApi.semanticSearch(currentWs, query || userMsg, 5);
        if (results.length > 0) {
          const ctxBlock = results
            .map((r) => `// ${r.file}:${r.line ?? 1}\n${r.snippet || r.text}`)
            .join('\n\n');
          userMsg = `[Codebase context]\n${ctxBlock}\n\n${userMsg.replace(/@codebase\b/gi, '').trim()}`;
        }
      } catch {}
      setChatStreamText('');
    }

    const imgs = chatImages.slice();
    setChatImages([]);
    setChat((prev) => [...prev, { role: 'user', content: msg.trim(), at: Date.now(), images: imgs.length ? imgs : undefined }]);
    setChatStreaming(true);
    setChatStreamText('');
    setTimeout(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, 30);
    chatAbortRef.current = ideApi.chatMessage(
      currentWs,
      userMsg,
      chat,
      (delta) => {
        setChatStreamText((prev) => prev + delta);
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
      },
      (full) => {
        setChatStreaming(false);
        setChatStreamText('');
        if (full) setChat((prev) => [...prev, { role: 'assistant', content: full, at: Date.now() }]);
        setTimeout(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, 30);
      },
      (errMsg) => {
        setChatStreaming(false);
        setChatStreamText('');
        showToast(`Chat error: ${errMsg}`);
      },
      imgs,
    );
  };

  const pollDeploy = useCallback(async (ws: string) => {
    try {
      const s = await ideApi.deployStatus(ws);
      setDeployInfo(s);
      if (s.status === 'error' || s.status === 'stopped' || (s.status === 'running' && !s.sharePending)) {
        if (deployPollRef.current) {
          clearInterval(deployPollRef.current);
          deployPollRef.current = null;
        }
        if (s.status === 'running') showToast(s.kind === 'hosted' ? (s.shareUrl ? `Live at ${s.shareUrl}` : `${s.provider || 'Cloud'} deploy finished`) : s.kind === 'docker' ? `Docker deploy live: ${s.shareUrl || s.url}` : `Deployed at ${s.url}`);
      }
    } catch {}
  }, [showToast]);

  const designFromImage = async () => {
    const img = chatImages[0];
    if (!img || designBusy) return;
    setDesignBusy(true);
    setDesignMsg('Turning screenshot into a workspace…');
    try {
      const desc = task.trim() || undefined;
      const r = await ideApi.designFromImage(img, desc ? { description: desc } : undefined);
      if (r.ok) {
        setChatImages([]);
        setTask('');
        setDesignMsg(`Built ${r.files.length} files — opening workspace…`);
        await loadWorkspaces();
        openWorkspace(r.workspace);
        showToast(`Design-to-code: ${r.files.join(', ')}`);
        setTimeout(() => { setDesignMsg(''); setDesignBusy(false); }, 800);
        return;
      }
      setDesignMsg('');
      setDesignBusy(false);
    } catch (err: any) {
      setDesignMsg('');
      setDesignBusy(false);
      showToast(`Design failed: ${err.message}`);
    }
  };

  const handleDeploy = async (mode: 'local' | 'docker', force = false) => {
    if (!currentWs || readOnly) return;
    try {
      setDeployBusy(true);
      const r = mode === 'docker' ? await ideApi.deployDocker(currentWs, force) : await ideApi.deploy(currentWs, force);
      const info = { status: r.status || 'starting', port: r.port, url: r.url, lanUrls: r.lanUrls || [], shareUrl: r.shareUrl ?? null, sharePending: r.sharePending, kind: r.kind };
      setDeployInfo(info);
      if (info.status === 'installing' || info.status === 'starting' || info.status === 'building' || info.sharePending) {
        if (!deployPollRef.current) deployPollRef.current = setInterval(() => pollDeploy(currentWs), 2000);
      } else if (info.status === 'running') {
        showToast(info.kind === 'docker' ? `Docker deploy live: ${info.shareUrl || info.url}` : `Deployed at ${r.url}`);
      }
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setDeployBusy(false);
    }
  };

  const handleStopDeploy = async () => {
    if (!currentWs) return;
    try {
      await ideApi.stopDeploy(currentWs);
      setDeployInfo((prev) => (prev ? { ...prev, status: 'stopped', url: undefined } : prev));
      showToast('Deployment stopped');
    } catch (err: any) {
      showToast(`Stop failed: ${err.message}`);
    }
  };

  const handleWakeDeploy = async () => {
    if (!currentWs) return;
    try {
      setDeployBusy(true);
      const r = await ideApi.deployWake(currentWs);
      if (r.success) {
        setDeployInfo((prev) => (prev ? { ...prev, status: r.status, kind: r.kind } : prev));
        if (r.status === 'running') showToast('Deployment woke up');
      } else {
        showToast(`Wake failed: ${r.error || 'unknown error'}`);
      }
    } catch (err: any) {
      showToast(`Wake failed: ${err.message}`);
    } finally {
      setDeployBusy(false);
    }
  };

  const handleDeployHosted = async (force = false) => {
    if (!currentWs || readOnly) return;
    try {
      setDeployBusy(true);
      const r = await ideApi.deployHosted(currentWs, hostedProvider, force);
      const info = { status: r.status || 'building', provider: r.provider ?? hostedProvider, url: r.url, lanUrls: [], shareUrl: r.shareUrl ?? null, sharePending: r.sharePending, kind: r.kind || 'hosted', output: r.output };
      setDeployInfo(info);
      if (info.status === 'building' || info.status === 'starting') {
        if (!deployPollRef.current) deployPollRef.current = setInterval(() => pollDeploy(currentWs), 2500);
      } else if (info.status === 'running') {
        showToast(info.shareUrl ? `Live at ${info.shareUrl}` : `${hostedProvider} deploy finished`);
      }
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setDeployBusy(false);
    }
  };

  const loadDiff = useCallback(async (ws: string) => {
    if (!ws) return;
    try {
      const d = await ideApi.getDiff(ws);
      setDiffs(d);
      setDiffSectionOpen(d.length <= 3);
    } catch {}
  }, []);

  const refreshGit = useCallback(async (ws: string) => {
    if (!ws) return;
    try {
      const st = await ideApi.gitStatus(ws);
      setGit(st);
      setGitBranches([]);
      setGitLog([]);
      if (st.isRepo) {
        const [dl, lg, br] = await Promise.all([
          ideApi.gitDiff(ws),
          ideApi.gitLog(ws),
          ideApi.gitBranches(ws),
        ]);
        setGitDiffs(Object.fromEntries((dl.files || []).map((f) => [f.path, f])));
        setGitLog(lg.commits || []);
        setGitBranches(br.branches || []);
      } else {
        setGitDiffs({});
      }
    } catch {}
  }, []);

  const reloadOpenFiles = useCallback(async () => {
    if (readOnly || !currentWs) return;
    const paths = openFiles.filter((f) => !f.dirty && !streamsRef.current.has(f.path)).map((f) => f.path);
    if (!paths.length) return;
    const updated: { path: string; content: string; dirty: boolean }[] = [];
    for (const p of paths) {
      try {
        const res = await ideApi.readFile(currentWs, p);
        updated.push({ path: p, content: res.content, dirty: false });
      } catch {}
    }
    if (!updated.length) return;
    setOpenFiles((prev) => prev.map((f) => updated.find((u) => u.path === f.path) ?? f));
  }, [currentWs, readOnly, openFiles]);

  const refetchFile = async (path: string) => {
    if (!currentWs) return;
    try {
      const res = await ideApi.readFile(currentWs, path);
      setOpenFiles((prev) => prev.map((f) => (f.path === path ? { ...f, content: res.content, dirty: false } : f)));
    } catch {}
  };

  const doRename = async () => {
    const newName = rename.newName.trim();
    if (!newName || !currentWs || rename.busy) return;
    setRename((r) => ({ ...r, busy: true, error: null }));
    try {
      const res = await ideApi.tsRename(currentWs, rename.file, rename.line, rename.col, newName);
      setRename((r) => ({ ...r, open: false, busy: false }));
      await refreshTree();
      for (const f of res.changedFiles) {
        await refetchFile(f.path);
      }
      void loadCheckpoints(currentWs);
      loadRuns(currentWs);
      showToast(`Renamed ${res.name} → ${res.renameTo} (${res.count} occurrence${res.count === 1 ? '' : 's'} in ${res.changedFiles.length} file${res.changedFiles.length === 1 ? '' : 's'})`);
    } catch (err: any) {
      setRename((r) => ({ ...r, busy: false, error: err.message }));
    }
  };

  const doFindUsages = async (file: string, line: number, col: number, word: string) => {
    if (!currentWs) return;
    setRefsPanel((r) => ({ ...r, open: true, file, symbol: word, refs: [], busy: true, error: null }));
    try {
      const res = await ideApi.tsReferences(currentWs, file, line, col);
      setRefsPanel((r) => ({
        ...r,
        busy: false,
        refs: res.references ?? [],
        error: res.ts ? null : (res.references && res.references.length === 0 ? 'No references found' : 'Tree-sitter unavailable'),
      }));
    } catch (err: any) {
      setRefsPanel((r) => ({ ...r, busy: false, error: err.message }));
    }
  };

  const doExtract = async (file: string, line: number, col: number, word: string) => {
    if (!currentWs || readOnly) {
      if (readOnly) showToast('Open a sandboxed workspace to run agents');
      return;
    }
    setTask(`Extract the symbol \`${word}\` (defined in ${file}:${line}) into a separate, well-named file, update imports and references across the project`);
    await runQuickAgent(`Extract the symbol \`${word}\` (defined in ${file}:${line}) into a separate, well-named file, update imports and references across the project`);
  };

  useEffect(() => {
    const onRename = (e: Event) => {
      const d = (e as CustomEvent).detail as { workspace?: string; path?: string; line?: number; col?: number; name?: string };
      if (!d || !d.path || !d.line || !d.col) return;
      if (d.workspace && d.workspace !== currentWs) return;
      setRename({ open: true, file: d.path, line: d.line, col: d.col, name: d.name || '', newName: d.name || '', busy: false, error: null });
    };
    const onInlineFix = (e: Event) => {
      const { workspace: ws, path: fp, instruction } = (e as CustomEvent).detail || {};
      if (!ws || !fp || !instruction) return;
      // Put the instruction into the task bar so the user can review, then run quick agent
      setTask(`Fix the error in ${fp}: ${instruction}`);
      setTimeout(() => runQuickAgent(`Fix the error in ${fp}: ${instruction}`), 100);
    };
    window.addEventListener('codestrom-inline-fix', onInlineFix);
    window.addEventListener('codestrom-rename', onRename);
    return () => {
      window.removeEventListener('codestrom-inline-fix', onInlineFix);
      window.removeEventListener('codestrom-rename', onRename);
    };
  }, [currentWs]);

  const acceptDiff = async (path: string) => {
    try {
      await ideApi.acceptDiff(currentWs, path);
      setDiffs((prev) => prev.filter((d) => d.path !== path));
      showToast('Changes accepted');
    } catch (err: any) {
      showToast(`Accept failed: ${err.message}`);
    }
  };

  const rejectDiff = async (path: string) => {
    try {
      await ideApi.rejectDiff(currentWs, path);
      setDiffs((prev) => prev.filter((d) => d.path !== path));
      await refreshTree();
      await refetchFile(path);
      showToast('Changes reverted');
    } catch (err: any) {
      showToast(`Reject failed: ${err.message}`);
    }
  };

  const applyHunk = async (path: string, index: number, action: 'accept' | 'reject') => {
    try {
      await ideApi.hunkDiff(currentWs, path, index, action);
      if (action === 'reject') {
        await refreshTree();
        await refetchFile(path);
      }
      await loadDiff(currentWs);
      showToast(action === 'accept' ? 'Hunk accepted' : 'Hunk reverted');
    } catch (err: any) {
      showToast(`Hunk ${action} failed: ${err.message}`);
    }
  };

  const applyGitHunk = async (path: string, index: number, action: 'accept' | 'reject') => {
    try {
      await ideApi.gitHunk(currentWs, path, index, action);
      if (action === 'reject') {
        await refreshTree();
        await refetchFile(path);
      }
      await refreshGit(currentWs);
      showToast(action === 'accept' ? 'Hunk staged' : 'Hunk reverted');
    } catch (err: any) {
      showToast(`Hunk ${action} failed: ${err.message}`);
    }
  };

  const gitLoopHunks = async (path: string, action: 'accept' | 'reject') => {
    let guard = 0;
    while (guard++ < 60) {
      const d = await ideApi.gitDiff(currentWs, path);
      if (!d.file?.hunks?.length) break;
      await ideApi.gitHunk(currentWs, path, 0, action);
    }
  };

  const stageAll = async (path: string) => {
    try {
      await gitLoopHunks(path, 'accept');
      await refreshGit(currentWs);
      showToast('File staged');
    } catch (err: any) {
      showToast(`Stage failed: ${err.message}`);
    }
  };

  const revertAll = async (path: string) => {
    try {
      await gitLoopHunks(path, 'reject');
      await refreshTree();
      await refetchFile(path);
      await refreshGit(currentWs);
      showToast('File reverted');
    } catch (err: any) {
      showToast(`Revert failed: ${err.message}`);
    }
  };

  // ── GitHub OAuth helpers ──────────────────────────────────────────────────────
  const connectGithub = async () => {
    setGithubConnecting(true);
    setGithubUserCode(null);
    setGithubVerifyUrl(null);
    try {
      const r = await ideApi.githubDeviceStart();
      if (!r.ok) { showToast('GitHub Device Flow failed — set GITHUB_CLIENT_ID in backend .env'); setGithubConnecting(false); return; }
      setGithubDeviceCode(r.deviceCode);
      setGithubUserCode(r.userCode);
      setGithubVerifyUrl(r.verificationUri);
      // Open browser to verification page
      window.open(r.verificationUri, '_blank');
      // Poll every 6s
      if (githubPollRef.current) clearInterval(githubPollRef.current);
      githubPollRef.current = setInterval(async () => {
        try {
          const p = await ideApi.githubDevicePoll(r.deviceCode);
          if (p.ok && p.accessToken) {
            clearInterval(githubPollRef.current!); githubPollRef.current = null;
            setGithubToken(p.accessToken);
            setGithubLogin(p.login || null);
            localStorage.setItem('neural-github-token', p.accessToken);
            if (p.login) localStorage.setItem('neural-github-login', p.login);
            setGithubConnecting(false);
            setGithubUserCode(null);
            showToast(`Connected to GitHub as @${p.login}`);
          } else if (p.expired || p.error) {
            clearInterval(githubPollRef.current!); githubPollRef.current = null;
            setGithubConnecting(false);
            showToast(`GitHub auth failed: ${p.error || 'expired'}`);
          }
        } catch {}
      }, 6000);
    } catch (err: any) {
      setGithubConnecting(false);
      showToast(`GitHub connect failed: ${err.message}`);
    }
  };

  const disconnectGithub = () => {
    if (githubPollRef.current) { clearInterval(githubPollRef.current); githubPollRef.current = null; }
    setGithubToken(null); setGithubLogin(null);
    localStorage.removeItem('neural-github-token');
    localStorage.removeItem('neural-github-login');
    setGithubConnecting(false);
  };

  const pushToGithub = async () => {
    if (!currentWs || !githubToken || !githubPushUrl.trim() || githubPushBusy) return;
    setGithubPushBusy(true);
    try {
      const r = await ideApi.githubPush(currentWs, githubToken, githubPushUrl.trim(), githubPushBranch || 'main', githubPushMsg || `Update from Codestrom IDE`);
      if (r.ok) {
        showToast(`Pushed to ${r.branch} ✓`);
        setGithubPushOpen(false);
      } else {
        showToast(`Push failed: ${r.error}`);
      }
    } catch (err: any) {
      showToast(`Push error: ${err.message}`);
    } finally {
      setGithubPushBusy(false);
    }
  };

  const suggestGitMessage = async () => {
    if (!currentWs || gitSuggesting) return;
    setGitSuggesting(true);
    try {
      const res = await ideApi.gitSuggestMessage(currentWs);
      setGitMsg(res.message);
    } catch (err: any) {
      showToast(`Suggest failed: ${err.message}`);
    } finally {
      setGitSuggesting(false);
    }
  };

  const gitCheckout = async (name: string) => {
    if (!currentWs || gitBranchBusy || !name || name === git?.branch) return;
    setGitBranchBusy(true);
    try {
      await ideApi.gitBranch(currentWs, name, 'checkout');
      await refreshGit(currentWs);
    } catch (err: any) {
      showToast(`Checkout failed: ${err.message}`);
    } finally {
      setGitBranchBusy(false);
    }
  };

  const createBranch = async () => {
    if (!currentWs || gitBranchBusy || !newBranch.trim()) return;
    setGitBranchBusy(true);
    try {
      await ideApi.gitBranch(currentWs, newBranch.trim(), 'create');
      setNewBranch('');
      await refreshGit(currentWs);
    } catch (err: any) {
      showToast(`Create branch failed: ${err.message}`);
    } finally {
      setGitBranchBusy(false);
    }
  };

  useEffect(() => {
    if (!activePath) { setOutline([]); return; }
    const ws = projectMode ? '__project__' : currentWs;
    if (!ws) { setOutline([]); return; }
    let cancelled = false;
    setOutlineLoading(true);
    ideApi.fileSymbols(ws, activePath)
      .then((res) => { if (!cancelled) setOutline(res.results); })
      .catch(() => { if (!cancelled) setOutline([]); })
      .finally(() => { if (!cancelled) setOutlineLoading(false); });
    return () => { cancelled = true; };
  }, [activePath, currentWs, projectMode]);

  const insertMention = (path: string) => {
    if (mentionQuery === null) return;
    const v = task;
    const atIdx = v.lastIndexOf('@');
    if (atIdx === -1) return;
    const before = v.slice(0, atIdx);
    const after = v.slice(atIdx + 1 + mentionQuery.length);
    const next = `${before}@${path} ${after}`;
    setTask(next);
    setMentions((prev) => (prev.includes(path) ? prev : [...prev, path]));
    setMentionQuery(null);
    requestAnimationFrame(() => {
      const el = editorRef.current;
      if (el) {
        el.focus();
        const pos = before.length + path.length + 2;
        el.setSelectionRange(pos, pos);
      }
    });
  };

  const removeMention = (path: string) => {
    setMentions((prev) => prev.filter((m) => m !== path));
    setTask((t) => t.split(`@${path}`).join('').replace(/\s{2,}/g, ' ').trim());
  };

  const insertMentionSymbol = (name: string) => {
    if (mentionQuery === null) return;
    const v = task;
    const atIdx = v.lastIndexOf('@');
    if (atIdx === -1) return;
    const before = v.slice(0, atIdx);
    const after = v.slice(atIdx + 1 + mentionQuery.length);
    const next = `${before}@${name} ${after}`;
    setTask(next);
    setMentionSymbols((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setMentionQuery(null);
    requestAnimationFrame(() => {
      const el = editorRef.current;
      if (el) {
        el.focus();
        const pos = before.length + name.length + 2;
        el.setSelectionRange(pos, pos);
      }
    });
  };

  const removeMentionSymbol = (name: string) => {
    setMentionSymbols((prev) => prev.filter((m) => m !== name));
    setTask((t) => t.split(`@${name}`).join('').replace(/\s{2,}/g, ' ').trim());
  };

  useEffect(() => {
    let cancelled = false;
    if (mentionQuery === null || !currentWs || projectMode) {
      setSymbolMatches([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await ideApi.symbolSearch(currentWs, mentionQuery);
        if (!cancelled) setSymbolMatches(r.symbols);
      } catch {
        if (!cancelled) setSymbolMatches([]);
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [mentionQuery, currentWs, projectMode]);

  const openRules = async () => {
    if (!currentWs) return;
    try {
      const r = await ideApi.projectRules(currentWs);
      setRulesContent(r.content);
      setRulesFile(r.file);
      setRulesHasContent(!!r.content.trim());
      setRulesOpen(true);
    } catch {
      setRulesContent('');
      setRulesFile('.neuralrules');
      setRulesHasContent(false);
      setRulesOpen(true);
    }
  };

  const saveRules = async () => {
    if (!currentWs || rulesBusy) return;
    setRulesBusy(true);
    try {
      await ideApi.saveProjectRules(currentWs, rulesContent);
      setRulesHasContent(!!rulesContent.trim());
      setRulesOpen(false);
      showToast('.neuralrules saved — agents will use it on every run');
    } catch (err: any) {
      showToast(`Save failed: ${err.message}`);
    } finally {
      setRulesBusy(false);
    }
  };

  const loadEnvVars = async () => {
    if (!currentWs) return;
    try {
      const r = await ideApi.envVars(currentWs);
      setEnvVars(r.vars);
      const masked: Record<number, boolean> = {};
      r.vars.forEach((_, i) => { masked[i] = true; });
      setEnvMasked(masked);
    } catch {}
  };

  const saveEnvVarsHandler = async (vars: { key: string; value: string }[]) => {
    if (!currentWs || envBusy) return;
    setEnvBusy(true);
    try {
      await ideApi.saveEnvVars(currentWs, vars.filter((v) => v.key.trim()));
      showToast('.env saved — variables will be injected on next run');
    } catch (err: any) {
      showToast(`Save failed: ${err.message}`);
    } finally {
      setEnvBusy(false);
    }
  };

  const fetchWebCtx = async (urlOrQuery: string) => {
    const isUrl = /^https?:\/\//i.test(urlOrQuery.trim());
    setWebBusy(true);
    try {
      const r = await ideApi.webFetch(isUrl ? urlOrQuery.trim() : undefined, isUrl ? undefined : urlOrQuery.trim());
      setWebCtx({ source: r.source, content: r.content });
      setWebOpen(false);
      showToast(`@web context loaded from ${r.source.slice(0, 40)}`);
    } catch (err: any) {
      showToast(`@web failed: ${err.message}`);
    } finally {
      setWebBusy(false);
    }
  };

  const handleComposerChange = (v: string) => {
    setTask(v);
    const atIdx = v.lastIndexOf('@');
    if (atIdx === -1 || (atIdx > 0 && v[atIdx - 1] === '@')) {
      setMentionQuery(null);
      return;
    }
    const after = v.slice(atIdx + 1);
    // @web trigger — open the web fetch input
    if (after === 'web' || after.startsWith('web ')) {
      setMentionQuery(null);
      setWebOpen(true);
      return;
    }
    if (/[\s\n]/.test(after)) {
      setMentionQuery(null);
      return;
    }
    setMentionQuery(after);
  };

  const startVoice = () => {    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      showToast('Voice not supported in this browser');
      return;
    }
    try {
      const rec = new SR();
      rec.lang = 'en-IN';
      rec.onresult = (e: any) => {
        const transcript = e.results?.[0]?.[0]?.transcript || '';
        setTask((t) => (t ? t + ' ' + transcript : transcript));
        // Auto-submit on voice end — same behaviour as Cursor/Emergent
        if (transcript.trim()) setTimeout(() => runQuickAgent(transcript.trim()), 100);
      };
      rec.start();
    } catch {
      showToast('Voice start failed');
    }
  };

  const speak = (text: string) => {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text.slice(0, 400)));
    } catch {}
  };

  const importFile = () => {
    const input = fileInputRef.current;
    if (!input || readOnly) return;
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const name = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      try {
        const content = await file.text();
        await ideApi.writeFile(currentWs, name, content);
        await refreshTree();
        showToast(`Imported ${name}`);
      } catch (err: any) {
        showToast(`Import failed: ${err.message}`);
      }
      input.value = '';
    };
    input.click();
  };

  const gitAction = async (action: 'commit' | 'push' | 'pull' | 'init') => {
    if (!currentWs || gitBusy) return;
    setGitBusy(true);
    try {
      const res = await ideApi.gitAction(currentWs, action, gitMsg);
      await refreshGit(currentWs);
      setGitMsg('');
      showToast(`Git ${action}: done`);
    } catch (err: any) {
      showToast(`Git ${action}: ${err.message}`);
    } finally {
      setGitBusy(false);
    }
  };

  const activeFile = openFiles.find((f) => f.path === activePath);
  const activeDiff = diffs.find((d) => d.path === activePath);
  const gitFileDiff = activePath && git?.isRepo ? gitDiffs[activePath] : undefined;
  const flatFiles = useMemo(() => {
    const out: string[] = [];
    const walk = (list: TreeNode[]) => {
      for (const n of list) {
        if (n.type === 'file') out.push(n.path);
        if (n.children) walk(n.children);
      }
    };
    walk(tree);
    return out;
  }, [tree]);

  const mentionMatches = mentionQuery === null ? [] : flatFiles.filter((p) => p.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 8);

  const renderTree = (nodes: TreeNode[], depth: number) =>
    nodes.map((node) => {
      const isDir = node.type === 'dir';
      const isOpen = expanded.has(node.path);
      const isRenaming = renameEntry?.path === node.path;
      const isDragOver = dragOverDir === node.path && isDir;
      const newHere = newEntry && newEntry.parentDir === node.path && isDir;
      return (
        <div
          key={node.path}
          onDragOver={(e) => {
            if (isDir && dragPath) {
              e.preventDefault();
              setDragOverDir(node.path);
            }
          }}
          onDragLeave={() => { if (dragOverDir === node.path) setDragOverDir(null); }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragPath && isDir) dropMove(dragPath, node.path);
            else setDragOverDir(null);
          }}
        >
          <div className={`flex items-center rounded-md transition-colors ${isDragOver ? 'bg-accent/15 ring-1 ring-line-strong' : ''}`}>
            <button
              className={`w-full flex items-center gap-1.5 py-[5px] pr-2 text-left text-xs transition-colors ${isDragOver ? 'text-ink-muted' : 'text-ink-subtle hover:text-ink hover:bg-elevated/60'}`}
              style={{ paddingLeft: `${depth * 14 + 8}px` }}
              onClick={() => (isDir ? toggleDir(node.path) : openFile(node.path))}
              onContextMenu={(e) => openCtx(e, node.path, isDir)}
              draggable={!readOnly && !projectMode}
              onDragStart={() => setDragPath(node.path)}
              onDragEnd={() => { setDragPath(null); setDragOverDir(null); }}
            >
              {isDir ? (
                isOpen ? <ChevronDown className="w-3 h-3 text-ink-muted shrink-0" /> : <ChevronRight className="w-3 h-3 text-ink-muted shrink-0" />
              ) : (
                <span className="w-3 shrink-0" />
              )}
              {isDir ? (isOpen ? <FolderOpen className="w-3.5 h-3.5 text-ink-muted/70 shrink-0" /> : <Folder className="w-3.5 h-3.5 text-ink-muted/70 shrink-0" />) : fileIcon(node.name)}
              {isRenaming ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') { setRenameEntry(null); setCtxMenu(null); }
                  }}
                  onBlur={commitRename}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 min-w-0 rounded border border-line-strong/50 bg-surface px-1.5 py-0.5 text-xs text-ink outline-none"
                />
              ) : (
                <span className="truncate">{node.name}</span>
              )}
              {!isDir && node.path === activePath && <CircleDot className="w-2 h-2 text-ink-muted ml-auto shrink-0" />}
            </button>
          </div>
          {newHere && (
            <div className="flex items-center gap-1.5 py-[5px] pr-2" style={{ paddingLeft: `${(depth + 1) * 14 + 8}px` }}>
              {newEntry!.kind === 'dir' ? <Folder className="w-3.5 h-3.5 text-ink-muted/70 shrink-0" /> : fileIcon(newEntryValue || 'untitled')}
              <input
                autoFocus
                value={newEntryValue}
                onChange={(e) => setNewEntryValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitNew();
                  if (e.key === 'Escape') setNewEntry(null);
                }}
                placeholder={newEntry!.kind === 'dir' ? 'folder name' : 'file name'}
                className="flex-1 min-w-0 rounded border border-line-strong/50 bg-surface px-1.5 py-0.5 text-xs text-ink outline-none placeholder:text-ink-muted"
              />
            </div>
          )}
          {isDir && isOpen && node.children && renderTree(node.children, depth + 1)}
        </div>
      );
    });

  const stopMsg = running ? 'Stop' : '';
  const railItems: { key: 'explorer' | 'search' | 'git' | 'outline' | 'agents'; icon: any; label: string }[] = [
    { key: 'explorer', icon: Folder, label: 'Explorer' },
    { key: 'search', icon: Search, label: 'Search' },
    { key: 'git', icon: GitBranch, label: 'Git' },
    { key: 'outline', icon: Braces, label: 'Outline (file symbols)' },
    { key: 'agents', icon: Users, label: 'AI Agents' },
  ];

  const railActive = (k: string) =>
    k === 'explorer' || k === 'search' || k === 'git' || k === 'outline' ? explorerOpen && leftTab === k : agentsOpen;

  return (
    <div className="flex flex-col h-full w-full bg-canvas text-ink overflow-hidden relative">
      <input ref={fileInputRef} type="file" className="hidden" />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          files.forEach((f) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const url = ev.target?.result as string;
              if (url) setChatImages((prev) => [...prev, url]);
            };
            reader.readAsDataURL(f);
          });
          e.target.value = '';
        }}
      />

      {/* ─── Onboarding Modal (first run) ─── */}
      {onboardingOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-scrim backdrop-blur-sm">
          <div className="relative max-w-lg w-full mx-4 rounded-2xl border border-line bg-surface shadow-2xl shadow-black/80 p-8">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-elevated flex items-center justify-center shadow-xl  mb-4">
                <Sparkles className="w-7 h-7 text-ink" />
              </div>
              <h2 className="text-xl font-semibold text-ink mb-1">Welcome to Codestrom</h2>
              <p className="text-sm text-ink-subtle">Your AI-powered full-stack IDE. Here's a quick overview.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { icon: Sparkles, color: 'text-ink-muted', title: 'Agent Pipeline', desc: 'Planner → Architect → Coder → Debugger — full AI pipeline in one click.' },
                { icon: Package, color: 'text-ink-muted', title: 'Package Manager', desc: 'Search & install npm / pip / cargo packages from the Packages drawer tab.' },
                { icon: Database, color: 'text-emerald-400', title: 'SQLite Database', desc: 'New Database → table browser → SQL runner, DATABASE_URL auto-injected.' },
                { icon: TestTube2, color: 'text-amber-400', title: 'AI Test Gen', desc: 'After a run, click Generate Tests — Jest/pytest tests written & run for you.' },
                { icon: Zap, color: 'text-rose-400', title: 'API Tester', desc: 'Routes auto-detected from your code. Send requests & view responses inline.' },
                { icon: History, color: 'text-ink', title: 'Step History', desc: 'Every agent run is checkpointed — restore any earlier state in one click.' },
              ].map((f) => (
                <div key={f.title} className="flex items-start gap-2.5 p-3 rounded-xl border border-line bg-surface/60">
                  <f.icon className={`w-4 h-4 shrink-0 mt-0.5 ${f.color}`} />
                  <div>
                    <div className="text-[12px] font-semibold text-ink">{f.title}</div>
                    <p className="text-[11px] text-ink-muted mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  try { localStorage.setItem('codestrom-onboarded', '1'); } catch {}
                  setOnboardingOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent text-accent-fg text-sm font-medium transition-colors"
              >
                Get Started →
              </button>
              <button
                onClick={() => { setCheatsheetOpen(true); setOnboardingOpen(false); try { localStorage.setItem('codestrom-onboarded', '1'); } catch {} }}
                className="px-4 py-2.5 rounded-xl bg-elevated border border-line text-ink text-sm hover:bg-elevated transition-colors"
              >
                Shortcuts
              </button>
            </div>
            <p className="text-center text-[10px] text-ink-muted mt-3">Press <kbd className="px-1 py-0.5 rounded bg-elevated font-mono">?</kbd> anytime to reopen keyboard shortcuts</p>
          </div>
        </div>
      )}

      {/* ─── Keyboard Shortcuts Cheatsheet ─── */}
      {cheatsheetOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-surface backdrop-blur-sm" onClick={() => setCheatsheetOpen(false)}>
          <div className="relative max-w-md w-full mx-4 rounded-2xl border border-line bg-surface shadow-2xl shadow-black/80 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold text-ink">Keyboard Shortcuts</h3>
              <button onClick={() => setCheatsheetOpen(false)} className="p-1 text-ink-muted hover:text-ink transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              {[
                { section: 'Navigation', items: [
                  ['Ctrl+P', 'Quick open file'],
                  ['Ctrl+Shift+P', 'Command palette'],
                  ['Ctrl+`', 'Toggle terminal'],
                  ['Ctrl+Shift+E', 'Explorer'],
                  ['Ctrl+Shift+F', 'Search'],
                  ['Ctrl+Shift+G', 'Source control'],
                ]},
                { section: 'Agent', items: [
                  ['Enter', 'Run quick agent (task input)'],
                  ['Shift+Enter', 'Run full pipeline'],
                  ['Ctrl+Shift+X', 'Stop running agent'],
                ]},
                { section: 'Editor', items: [
                  ['Ctrl+S', 'Save file'],
                  ['Alt+Shift+F', 'Format document'],
                  ['F12', 'Go to definition'],
                  ['Shift+F12', 'Find references'],
                  ['?', 'Toggle this cheatsheet'],
                ]},
              ].map((group) => (
                <div key={group.section}>
                  <div className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-1.5">{group.section}</div>
                  <div className="space-y-1">
                    {group.items.map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-[12px] text-ink-subtle">{label}</span>
                        <kbd className="px-2 py-0.5 rounded bg-elevated border border-line text-[10px] font-mono text-ink">{key}</kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Top Bar ─── */}
      <div className="flex items-center gap-3 px-4 h-12 border-b border-line/80 bg-canvas shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-md text-ink-subtle hover:text-ink hover:bg-elevated transition-colors" title="Back to dashboard">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-elevated flex items-center justify-center shadow-lg ">
            <Sparkles className="w-3.5 h-3.5 text-ink" />
          </div>
          <span className="text-sm font-semibold text-ink tracking-tight">Neural IDE</span>
        </div>

        <div className="h-6 w-px bg-elevated mx-1" />

        <div className="relative">
          <button
            onClick={() => setMoreOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-ink hover:bg-elevated/80 transition-colors border border-transparent hover:border-line/60"
          >
            <Folder className="w-3.5 h-3.5 text-ink-muted" />
            {projectMode ? 'codestrom (project root)' : currentWs || 'No project open'}
            <ChevronDown className="w-3 h-3 text-ink-muted" />
          </button>
          {moreOpen && (
            <div ref={moreRef} className="absolute top-full left-0 mt-2 w-72 rounded-xl border border-line bg-elevated shadow-2xl shadow-black/50 z-50 overflow-hidden">
              <div className="px-3 py-2 text-[10px] font-semibold tracking-widest text-ink-muted uppercase">Switch project</div>
              <div className="max-h-56 overflow-y-auto pb-1">
                {workspaces.map((w) => (
                  <button
                    key={w.name}
                    onClick={() => { setMoreOpen(false); openWorkspace(w.name); }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-elevated/70 transition-colors text-left ${w.name === currentWs ? 'text-ink bg-elevated/50' : 'text-ink-subtle'}`}
                  >
                    <Folder className="w-3.5 h-3.5 text-ink-muted/70 shrink-0" />
                    <span className="truncate flex-1">{w.name}</span>
                    {w.local && <span className="text-[9px] text-ink-muted bg-accent/10 border border-line-strong/30 rounded px-1 py-0.5 shrink-0">local</span>}
                    <span className="text-[10px] text-ink-muted">{w.fileCount}f</span>
                  </button>
                ))}
              </div>
              <div className="border-t border-line p-1.5">
                <button onClick={() => { setMoreOpen(false); openLocalFolder(); }} className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-ink-muted hover:bg-accent/10 transition-colors">
                  <FolderOpen className="w-3.5 h-3.5" /> Open Local Folder…
                </button>
                <button onClick={() => { setMoreOpen(false); setNewProjOpen(true); }} className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-ink hover:bg-accent/10 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> New project
                </button>
                <button onClick={() => { setMoreOpen(false); openProjectRoot(); }} className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-ink-subtle hover:bg-elevated/70 transition-colors">
                  <FolderOpen className="w-3.5 h-3.5" /> Open project root (read-only)
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Token usage pill */}
        {sessionTokens > 0 && (
          <span
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-elevated/80 border border-line/60 text-ink-subtle font-mono"
            title={`${sessionTokens.toLocaleString()} tokens used this session (last 24 h)`}
          >
            <Zap className="w-2.5 h-2.5 text-amber-400" />
            {sessionTokens >= 1000 ? `${(sessionTokens / 1000).toFixed(1)}k` : sessionTokens}
          </span>
        )}

        <ModelSelector
          models={modelList}
          value={activeModelId}
          onChange={selectModel}
          auto={modelAuto}
          onAutoChange={(v) => { setModelAuto(v); showToast(v ? 'Auto mode — router picks the model' : 'Manual model selection'); }}
          disabled={modelBusy}
          dotColor={resolvedModel ? (resolvedModel.source === 'cloud' ? '#38bdf8' : resolvedModel.source === 'active' ? '#34d399' : '#a78bfa') : undefined}
        />

        {resolvedModel ? (
          <span
            className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border"
            title={`Pipeline model: ${resolvedModel.name} (${resolvedModel.provider})`}
            style={
              resolvedModel.source === 'cloud'
                ? { backgroundColor: 'rgba(56,189,248,0.1)', borderColor: 'rgba(56,189,248,0.3)', color: '#7dd3fc' }
                : resolvedModel.source === 'active'
                  ? { backgroundColor: 'rgba(52,211,153,0.1)', borderColor: 'rgba(52,211,153,0.3)', color: '#6ee7b7' }
                  : { backgroundColor: 'rgba(167,139,250,0.1)', borderColor: 'rgba(167,139,250,0.3)', color: '#c4b5fd' }
            }
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={
                resolvedModel.source === 'cloud'
                  ? { backgroundColor: '#38bdf8' }
                  : resolvedModel.source === 'active'
                    ? { backgroundColor: '#34d399' }
                    : { backgroundColor: '#a78bfa' }
              }
            />
            <span className="max-w-48 truncate">{resolvedModel.name}</span>
            <span className="text-[9px] font-semibold tracking-wider opacity-70 border rounded px-1 py-px" style={{ borderColor: 'currentColor' }}>
              {resolvedModel.source === 'cloud' ? 'CLOUD' : resolvedModel.source === 'active' ? 'ACTIVE' : 'LIVE'}
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-300">
            <AlertCircle className="w-3 h-3" /> No active model
          </span>
        )}

        <button
          onClick={() => { setCloudOpen(true); loadCloudSettings(); }}
          className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md text-ink-subtle hover:text-ink hover:bg-elevated transition-colors border border-line"
          title="Cloud model settings (OpenRouter)"
        >
          <Settings className="w-3.5 h-3.5" /> Cloud
          {cloudEnabled && cloudKeySet && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
        </button>

        {/* ─── Smart Run button ─── */}
        {buildProfiles.length > 0 && (
          <button
            onClick={termRunning ? killTerminal : smartRun}
            disabled={!currentWs || readOnly}
            title={termRunning ? `Stop running (${lastTermCmd})` : `Run: ${(buildProfiles.find((p) => p.id === 'dev' || p.id === 'start') ?? buildProfiles[0])?.command}`}
            className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md transition-colors border disabled:opacity-40 disabled:hover:bg-transparent ${
              termRunning
                ? 'text-rose-300 border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20'
                : 'text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10'
            }`}
          >
            {termRunning
              ? <><Square className="w-3.5 h-3.5" /> Stop</>
              : <><Play className="w-3.5 h-3.5" /> Run</>
            }
          </button>
        )}

        <button
          onClick={() => handleDeploy('local')}
          disabled={!currentWs || readOnly || deployBusy}
          className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md text-ink hover:text-ink hover:bg-elevated transition-colors border border-line disabled:opacity-40 disabled:hover:bg-transparent"
          title="Deploy this project"
        >
          {deployBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin text-ink-muted" /> : <Rocket className="w-3.5 h-3.5 text-ink-muted" />}
          Deploy
          {deployInfo && (
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                deployInfo.status === 'running' ? 'bg-emerald-400' : deployInfo.status === 'installing' || deployInfo.status === 'starting' ? 'bg-amber-400 animate-pulse' : deployInfo.status === 'error' ? 'bg-rose-400' : 'bg-line-strong'
              }`}
            />
          )}
        </button>

        {/* ─── Share (tunnel) button ─── */}
        <button
          onClick={async () => {
            if (deployInfo?.shareUrl) {
              await navigator.clipboard.writeText(deployInfo.shareUrl).catch(() => {});
              showToast('Share URL copied!');
            } else {
              handleDeploy('local');
            }
          }}
          disabled={!currentWs || readOnly || deployBusy}
          title={deployInfo?.shareUrl ? `Share: ${deployInfo.shareUrl}` : deployInfo?.sharePending ? 'Generating share URL…' : 'Create a public share URL via tunnel'}
          className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md transition-colors border disabled:opacity-40 disabled:hover:bg-transparent ${
            deployInfo?.shareUrl
              ? 'text-ink-muted border-line-strong/40 bg-accent/10 hover:bg-accent/20'
              : 'text-ink hover:text-ink hover:bg-elevated border-line'
          }`}
        >
          {deployInfo?.sharePending
            ? <Loader2 className="w-3.5 h-3.5 animate-spin text-ink-muted" />
            : <Link2 className="w-3.5 h-3.5 text-ink-muted" />
          }
          {deployInfo?.shareUrl ? 'Copy Link' : deployInfo?.sharePending ? 'Sharing…' : 'Share'}
        </button>

        {user ? (
          <div className="flex items-center gap-1.5 pl-1">
            <span
              className="flex items-center justify-center w-6 h-6 rounded-full bg-elevated text-ink text-[10px] font-bold"
              title={user.email}
            >
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="text-[11px] text-ink max-w-28 truncate">{user.name.split(' ')[0]}</span>
            <button onClick={doLogout} className="p-1 rounded-md text-ink-muted hover:text-rose-300 hover:bg-elevated transition-colors" title="Sign out">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAuthOpen((o) => !o)}
            className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md text-ink hover:text-ink hover:bg-elevated transition-colors border border-line"
          >
            <Users className="w-3.5 h-3.5 text-ink-muted" /> Sign in
          </button>
        )}

        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="p-1.5 rounded-md text-ink-subtle hover:text-ink hover:bg-elevated transition-colors"
        >
          {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button onClick={() => setMoreOpen((o) => !o)} className="p-1.5 rounded-md text-ink-subtle hover:text-ink hover:bg-elevated transition-colors" title="More actions">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {deployInfo && (
        <div className="fixed top-16 right-4 z-[55] w-96 rounded-xl border border-line bg-elevated shadow-2xl shadow-black/60 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-line">
            <Rocket className="w-3.5 h-3.5 text-ink-muted" />
            <span className="text-xs font-medium text-ink">Deploy</span>
            <span
              className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${
                deployInfo.status === 'running'
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : deployInfo.status === 'installing' || deployInfo.status === 'starting'
                    ? 'bg-amber-500/15 text-amber-300'
                    : deployInfo.status === 'error'
                      ? 'bg-rose-500/15 text-rose-300'
                      : 'bg-elevated/40 text-ink-subtle'
              }`}
            >
              {deployInfo.status === 'installing' || deployInfo.status === 'starting' ? `${deployInfo.status}…` : deployInfo.status}
            </span>
            <span className="text-[9px] text-ink-muted px-1 py-0.5 rounded bg-elevated/80 border border-line/50 font-mono uppercase">{deployInfo.kind || 'static'}</span>
            <div className="flex-1" />
            <button onClick={() => setDeployInfo(null)} className="p-1 rounded text-ink-muted hover:text-ink hover:bg-elevated transition-colors" title="Close">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-3 space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
            {deployInfo.status === 'running' && deployInfo.url && (
              <>
                <div className="flex items-center gap-2">
                  <a
                    href={deployInfo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-accent hover:bg-accent text-accent-fg text-[11px] font-medium transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> Open app
                  </a>
                  <button
                    onClick={() => navigator.clipboard?.writeText(deployInfo.url || '')}
                    className="px-2.5 py-1.5 rounded-md bg-elevated hover:bg-elevated text-ink text-[11px] transition-colors"
                  >
                    Copy URL
                  </button>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-semibold tracking-widest text-ink-muted uppercase">Local</div>
                  <a href={deployInfo.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-ink hover:underline font-mono break-all">
                    <Globe className="w-3 h-3 shrink-0" /> {deployInfo.url}
                  </a>
                  {(deployInfo.lanUrls || []).length > 0 && (
                    <>
                      <div className="text-[10px] font-semibold tracking-widest text-ink-muted uppercase pt-1">On your network</div>
                      {(deployInfo.lanUrls || []).map((u) => (
                        <a key={u} href={u} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-ink-subtle hover:text-ink hover:underline font-mono break-all">
                          <Monitor className="w-3 h-3 shrink-0" /> {u}
                        </a>
                      ))}
                    </>
                  )}
                </div>
              </>
            )}
            {deployInfo.status === 'installing' || deployInfo.status === 'starting' || deployInfo.status === 'building' ? (
              <div className="flex items-center gap-2 text-[11px] text-amber-300/90">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {deployInfo.status === 'building'
                  ? 'Building container image… (first build pulls base images)'
                  : deployInfo.status === 'installing'
                    ? 'Installing dependencies…'
                    : 'Starting the app…'}{' '}
                (port {deployInfo.port})
              </div>
            ) : null}
            {deployInfo.status === 'error' && (
              <div className="text-[11px] text-rose-300">Deploy failed — see output below.</div>
            )}
            {deployInfo.status === 'stopped' && <div className="text-[11px] text-ink-muted">Stopped. Click Deploy again to restart.</div>}
            {deployInfo.status === 'sleeping' && (
              <div className="flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-2">
                <Moon className="w-3 h-3 text-amber-400" />
                <span className="text-[11px] text-amber-300">Sleeping (autoscaled after 5min idle)</span>
                <button
                  onClick={handleWakeDeploy}
                  disabled={deployBusy}
                  className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-[11px] font-medium transition-colors disabled:opacity-40"
                  title="Wake up the deployment"
                >
                  <Sun className="w-3.5 h-3.5" /> Wake
                </button>
              </div>
            )}
            {deployInfo.shareUrl ? (
              <div className="space-y-1 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2">
                <div className="text-[10px] font-semibold tracking-widest text-emerald-400/80 uppercase">Public URL (anyone can open)</div>
                <div className="flex items-center gap-1.5">
                  <a href={deployInfo.shareUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-emerald-300 hover:underline font-mono break-all flex-1">
                    <Globe className="w-3 h-3 shrink-0" /> {deployInfo.shareUrl}
                  </a>
                  <button
                    onClick={() => navigator.clipboard?.writeText(deployInfo.shareUrl || '')}
                    className="p-1 rounded bg-elevated hover:bg-elevated text-ink-subtle hover:text-ink transition-colors shrink-0"
                    title="Copy public URL"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : null}
            {deployInfo.sharePending && !deployInfo.shareUrl ? (
              <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2 text-[11px] text-emerald-300">
                <Loader2 className="w-3 h-3 animate-spin" /> Waiting for public URL…
              </div>
            ) : null}
            {deployInfo.output ? (
              <pre className="text-[10px] font-mono text-ink-subtle bg-surface border border-line/60 rounded-md p-2 max-h-36 overflow-y-auto scrollbar-thin whitespace-pre-wrap break-all">{deployInfo.output}</pre>
            ) : null}
            <div className="rounded-md border border-line-strong/20 bg-accent/5 p-2 space-y-2">
              <div className="flex items-center gap-1.5">
                <Cloud className="w-3 h-3 text-ink-muted" />
                <span className="text-[10px] font-semibold tracking-widest text-ink/90 uppercase">Deploy to Cloud</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={hostedProvider}
                  onChange={(e) => setHostedProvider(e.target.value as 'render' | 'railway' | 'fly')}
                  className="flex-1 bg-surface border border-line rounded-md text-[11px] text-ink px-2 py-1.5 focus:outline-none focus:border-line-strong"
                >
                  <option value="render">Render</option>
                  <option value="railway">Railway</option>
                  <option value="fly">Fly.io</option>
                </select>
                <button
                  onClick={() => handleDeployHosted()}
                  disabled={deployBusy || deployInfo.status === 'installing' || deployInfo.status === 'starting' || deployInfo.status === 'building'}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-accent hover:bg-accent text-accent-fg text-[11px] font-medium transition-colors disabled:opacity-40"
                  title="Deploy to your own Render/Railway/Fly account via the provider CLI"
                >
                  {deployInfo.kind === 'hosted' && (deployInfo.status === 'building' || deployInfo.status === 'starting') ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Cloud className="w-3 h-3" />
                  )}
                  {deployInfo.kind === 'hosted' && (deployInfo.status === 'building' || deployInfo.status === 'starting') ? 'Deploying…' : 'Deploy to cloud'}
                </button>
              </div>
              {deployInfo.kind === 'hosted' && deployInfo.provider ? (
                <div className="text-[10px] text-ink-muted">
                  Hosted on <span className="text-ink capitalize">{deployInfo.provider}</span> — the live URL appears here when the CLI finishes.
                </div>
              ) : null}
            </div>
            <div className="flex gap-2 pt-1 flex-wrap">
              <button
                onClick={() => handleDeploy('local', true)}
                disabled={deployBusy || deployInfo.status === 'installing' || deployInfo.status === 'starting' || deployInfo.status === 'building'}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-elevated hover:bg-elevated text-ink text-[11px] transition-colors disabled:opacity-40"
              >
                <Play className="w-3 h-3" /> Redeploy local
              </button>
              <button
                onClick={() => handleDeploy('docker', true)}
                disabled={deployBusy || deployInfo.status === 'installing' || deployInfo.status === 'starting' || deployInfo.status === 'building'}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-elevated hover:bg-elevated text-ink text-[11px] transition-colors disabled:opacity-40"
                title="Build a container image and run it in Docker"
              >
                <Container className="w-3 h-3" /> Deploy in Docker
              </button>
              <button
                onClick={handleStopDeploy}
                disabled={deployInfo.status === 'stopped' || deployInfo.status === 'error'}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-[11px] transition-colors disabled:opacity-40"
              >
                <Square className="w-3 h-3" /> Stop
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-16 right-4 z-[60] px-4 py-2 rounded-lg bg-elevated border border-line text-xs text-ink shadow-2xl shadow-black/50">
          {toast}
        </div>
      )}

      {/* ─── Welcome Screen ─── */}
      <AnimatePresence mode="wait">
        {!inIde && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="flex-1 min-h-0 overflow-y-auto scrollbar-thin"
          >
            <div className="max-w-3xl mx-auto px-8 py-14">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-elevated flex items-center justify-center shadow-2xl  mb-6">
                  <Sparkles className="w-7 h-7 text-ink" />
                </div>
                <h1 className="text-3xl font-semibold text-ink tracking-tight mb-2">What do you want to build?</h1>
                <p className="text-sm text-ink-muted mb-8">Describe it in one sentence — the agents plan, code, build and fix everything for you.</p>
              </div>

              <div className="relative">
                <textarea
                  ref={welcomeInputRef}
                  autoFocus
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      buildFromPrompt(task);
                    }
                  }}
                  rows={3}
                  placeholder="e.g. Build a todo app with a dark theme, add and delete tasks..."
                  className="w-full resize-none rounded-2xl border border-line bg-surface px-5 py-4 text-sm text-ink placeholder:text-ink-muted focus:border-line-strong/60 focus:ring-2 focus:ring-line-strong/20 outline-none shadow-2xl shadow-black/40 transition-all"
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                  <button onClick={startVoice} className="p-2 rounded-lg text-ink-subtle hover:text-ink hover:bg-elevated transition-colors" title="Voice input">
                    <Mic className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => buildFromPrompt(task)}
                    disabled={!task.trim() || running}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent hover:bg-accent text-accent-fg text-xs font-medium transition-colors disabled:opacity-40 disabled:hover:bg-accent"
                  >
                    {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Build
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-ink-muted mt-2 px-1">Enter to create a project and run the agent pipeline</p>

              <div className="grid grid-cols-6 gap-3 mt-8">
                {[
                  { label: 'Create Project', icon: Plus, action: () => setNewProjOpen(true) },
                  { label: 'Open Local Folder', icon: FolderOpen, action: openLocalFolder },
                  { label: 'SSH Remote', icon: Globe, action: () => setSshModalOpen(true) },
                  { label: 'Clone Repository', icon: Globe, action: () => { const box = document.getElementById('clone-box'); box?.classList.toggle('hidden'); } },
                  { label: 'Import from disk', icon: Upload, action: importFromDisk },
                  { label: 'Templates', icon: LayoutGrid, action: () => setTemplatePicker(true) },
                  { label: 'Open Folder', icon: Folder, action: openProjectRoot },
                ].map((a) => (
                  <button
                    key={a.label}
                    onClick={a.action}
                    disabled={importBusy}
                    className="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface hover:border-line hover:bg-surface/60 py-4 px-2 transition-all group disabled:opacity-50"
                  >
                    <a.icon className="w-4 h-4 text-ink-muted group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] text-ink-subtle group-hover:text-ink">{a.label}</span>
                  </button>
                ))}
              </div>
              {importBusy && (
                <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-muted">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-ink-muted" />
                  {importProgress || 'Importing…'}
                </div>
              )}

              <div id="clone-box" className="hidden mt-3 flex items-center gap-2">
                <input
                  value={cloneUrl}
                  onChange={(e) => setCloneUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && cloneRepo()}
                  placeholder="https://github.com/user/repo.git"
                  className="flex-1 rounded-lg border border-line bg-surface px-4 py-2.5 text-xs text-ink placeholder:text-ink-muted focus:border-line-strong/60 outline-none"
                />
                <button onClick={cloneRepo} disabled={cloneBusy || !cloneUrl.trim()} className="px-4 py-2.5 rounded-lg bg-elevated hover:bg-elevated text-xs text-ink transition-colors disabled:opacity-40">
                  {cloneBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Clone'}
                </button>
              </div>

              {newProjOpen && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    autoFocus
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createProject(newProjName)}
                    placeholder="Project name"
                    className="flex-1 rounded-lg border border-line bg-surface px-4 py-2.5 text-xs text-ink placeholder:text-ink-muted focus:border-line-strong/60 outline-none"
                  />
                  <button onClick={() => createProject(newProjName)} className="px-4 py-2.5 rounded-lg bg-accent hover:bg-accent text-xs text-accent-fg transition-colors">Create</button>
                  <button onClick={() => setNewProjOpen(false)} className="p-2.5 rounded-lg text-ink-muted hover:text-ink hover:bg-elevated transition-colors"><X className="w-4 h-4" /></button>
                </div>
              )}

              {templatePicker && (
                <div className="mt-3">
                  <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                    {['all', ...new Set(templates.map((t) => t.category))].map((c) => (
                      <button
                        key={c}
                        onClick={() => setTemplateCat(c)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${
                          templateCat === c
                            ? 'bg-accent/15 border-line-strong/40 text-ink'
                            : 'bg-surface/40 border-line text-ink-muted hover:text-ink hover:border-line'
                        }`}
                      >
                        {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {templates
                      .filter((t) => templateCat === 'all' || t.category === templateCat)
                      .map((t) => (
                        <button
                          key={t.id}
                          onClick={() => scaffoldTemplate(t.id)}
                          disabled={templateBusy}
                          className="rounded-xl border border-line bg-surface hover:border-line-strong/50 hover:bg-surface/60 p-4 text-left transition-all disabled:opacity-50 group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            {templateBusy && templateBusyId === t.id ? (
                              <Loader2 className="w-4 h-4 text-ink-muted animate-spin" />
                            ) : (
                              <Rocket className="w-4 h-4 text-ink-muted group-hover:scale-110 transition-transform" />
                            )}
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${
                                t.kind === 'node'
                                  ? 'bg-emerald-500/15 text-emerald-300'
                                  : t.kind === 'cli'
                                    ? 'bg-amber-500/15 text-amber-300'
                                    : 'bg-accent/15 text-ink-muted'
                              }`}
                            >
                              {t.kind}
                            </span>
                          </div>
                          <p className="text-xs text-ink font-medium">{t.label}</p>
                          <p className="text-[10px] text-ink-muted mt-1 leading-relaxed line-clamp-2">{t.description}</p>
                          <div className="flex items-center gap-1 flex-wrap mt-2.5">
                            {t.tags.map((tag) => (
                              <span key={tag} className="px-1.5 py-0.5 rounded bg-elevated/80 border border-line/50 text-[9px] text-ink-subtle font-mono">
                                {tag}
                              </span>
                            ))}
                          </div>
                          {(() => {
                            const support = capabilities?.templates?.find((x: any) => x.templateId === t.id);
                            if (!support) return null;
                            const isReady = support.supported && support.toolchain.ready;
                            return (
                              <div className={`flex items-center gap-1.5 mt-2 text-[10px] ${isReady ? 'text-emerald-400' : 'text-amber-400'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isReady ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                {isReady ? 'Ready' : support.toolchain.reason || 'Missing toolchain'}
                              </div>
                            );
                          })()}
                          <p className="text-[10px] text-ink-muted mt-2.5">{t.fileCount} file{t.fileCount === 1 ? '' : 's'}</p>
                        </button>
                      ))}
                  </div>
                  {/* Community templates */}
                  <div className="mt-5 pt-4 border-t border-line/60">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-semibold text-ink">Community templates</span>
                      {!communityTplLoaded && (
                        <button
                          onClick={async () => {
                            try {
                              const r = await ideApi.communityTemplates();
                              setCommunityTemplates(r.templates);
                            } catch {}
                            setCommunityTplLoaded(true);
                          }}
                          className="text-[10px] text-ink-muted hover:text-ink transition-colors"
                        >
                          Load
                        </button>
                      )}
                    </div>
                    {communityTplLoaded && communityTemplates.length === 0 && (
                      <p className="text-[11px] text-ink-muted">No community templates available.</p>
                    )}
                    {communityTemplates.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {communityTemplates
                          .filter((t) => templateCat === 'all' || t.category === templateCat)
                          .map((t) => (
                            <a
                              key={t.id}
                              href={t.repoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-xl border border-line bg-surface hover:border-line-strong/50 hover:bg-surface/60 p-4 text-left transition-all group"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <Rocket className="w-4 h-4 text-ink-muted/60 group-hover:scale-110 transition-transform" />
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-elevated/80 text-ink-subtle">{t.category}</span>
                              </div>
                              <p className="text-xs text-ink font-medium">{t.name}</p>
                              <p className="text-[10px] text-ink-muted mt-1 leading-relaxed line-clamp-2">{t.description}</p>
                              <div className="flex items-center gap-1 flex-wrap mt-2.5">
                                {t.tags.map((tag) => (
                                  <span key={tag} className="px-1.5 py-0.5 rounded bg-elevated/80 border border-line/50 text-[9px] text-ink-subtle font-mono">{tag}</span>
                                ))}
                              </div>
                              <p className="text-[10px] text-ink-muted/60 mt-2 flex items-center gap-1"><ExternalLink className="w-2.5 h-2.5" /> Open on GitHub</p>
                            </a>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {authOpen && !user && (
                <div className="mt-8 rounded-xl border border-line bg-surface p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm text-ink font-semibold">{authMode === 'register' ? 'Create an account' : 'Sign in'}</h2>
                      <p className="text-[11px] text-ink-muted mt-0.5">
                        {authMode === 'register' ? 'Your projects stay private to your account.' : 'Projects are kept separate per account.'}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setAuthMode('login')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${authMode === 'login' ? 'bg-accent/15 text-ink' : 'text-ink-muted hover:text-ink'}`}
                      >
                        Login
                      </button>
                      <button
                        onClick={() => setAuthMode('register')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${authMode === 'register' ? 'bg-accent/15 text-ink' : 'text-ink-muted hover:text-ink'}`}
                      >
                        Register
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {authMode === 'register' && (
                      <input
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Your name"
                        className="rounded-lg border border-line bg-surface px-3 py-2.5 text-xs text-ink placeholder:text-ink-muted focus:border-line-strong/60 outline-none"
                      />
                    )}
                    <input
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="Email"
                      type="email"
                      className="rounded-lg border border-line bg-surface px-3 py-2.5 text-xs text-ink placeholder:text-ink-muted focus:border-line-strong/60 outline-none"
                    />
                    <input
                      value={authPass}
                      onChange={(e) => setAuthPass(e.target.value)}
                      placeholder="Password"
                      type="password"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') doAuth();
                      }}
                      className="rounded-lg border border-line bg-surface px-3 py-2.5 text-xs text-ink placeholder:text-ink-muted focus:border-line-strong/60 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={doAuth}
                      disabled={authBusy || !authEmail.trim() || !authPass || (authMode === 'register' && !authName.trim())}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent hover:bg-accent text-xs text-accent-fg font-medium transition-colors disabled:opacity-40"
                    >
                      {authBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {authMode === 'register' ? 'Create account' : 'Sign in'}
                    </button>
                    <button onClick={() => setAuthOpen(false)} className="text-[11px] text-ink-muted hover:text-ink transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-10">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[11px] font-semibold tracking-widest text-ink-muted uppercase">{user ? 'My projects' : 'Recent projects'}</h2>
                  {workspaces.length > 0 && (
                    <button onClick={loadWorkspaces} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-elevated transition-colors">
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {workspaces.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-line py-10 text-center">
                    <Folder className="w-6 h-6 text-ink-subtle mx-auto mb-2" />
                    <p className="text-xs text-ink-muted">
                      {user ? 'No projects yet — describe something above or create one from a template' : 'No projects yet — describe something above or create one from a template'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {workspaces.map((w) => (
                      <div
                        key={w.name}
                        className="w-full flex items-center gap-3 rounded-xl border border-line bg-surface hover:border-line hover:bg-surface/60 px-4 py-3 transition-all group"
                      >
                        <button onClick={() => openWorkspace(w.name)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                          <div className="p-2 rounded-lg bg-elevated/70 group-hover:bg-accent/15 transition-colors">
                            <Folder className="w-4 h-4 text-ink-muted" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-ink font-medium truncate">{w.name}</p>
                              {w.local && (
                                <span className="px-1.5 py-0.5 rounded bg-accent/15 border border-line-strong/30 text-[9px] text-ink-muted font-medium shrink-0">
                                  local
                                </span>
                              )}
                              {w.template && w.template !== 'clone' && w.template !== 'local' && (
                                <span className="px-1.5 py-0.5 rounded bg-accent/15 border border-line-strong/30 text-[9px] text-ink font-medium shrink-0">
                                  {w.template}
                                </span>
                              )}
                              {w.template === 'clone' && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[9px] text-emerald-300 font-medium shrink-0">
                                  cloned
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-ink-muted">
                              {w.local && w.root ? <span className="block truncate text-ink-muted">{w.root}</span> : null}
                              {w.fileCount} files{w.created ? ` · created ${relativeTime(w.created)}` : ''} · opened {relativeTime(w.updatedAt)}
                            </p>
                          </div>
                        </button>
                        <ChevronRight className="w-4 h-4 text-ink-subtle group-hover:text-ink-subtle transition-colors" />
                        <button
                          onClick={() => (w.local ? removeLocalWorkspace(w.name) : deleteWorkspace(w.name))}
                          className="p-1.5 rounded-md text-ink-muted hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                          title={w.local ? 'Remove local folder (files stay on disk)' : 'Delete project'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── IDE Mode ─── */}
        {inIde && (
          <motion.div
            key="ide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="flex-1 min-h-0 flex"
          >
            {/* Icon rail */}
            <div className="w-12 border-r border-line/80 bg-surface flex flex-col items-center py-2 gap-1 shrink-0">
              {railItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    if (item.key === 'explorer') { setLeftTab('explorer'); setExplorerOpen((o) => !o); }
                    else if (item.key === 'agents') setAgentsOpen((o) => !o);
                    else { setLeftTab(item.key); setExplorerOpen(true); }
                  }}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors relative ${railActive(item.key) ? 'text-ink bg-accent/15' : 'text-ink-muted hover:text-ink hover:bg-elevated/70'}`}
                  title={item.label}
                >
                  <item.icon className="w-4 h-4" />
                  {item.key === 'git' && git?.isRepo && git.status.length > 0 && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-accent" />
                  )}
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={() => setDrawerOpen((o) => !o)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${drawerOpen ? 'text-ink bg-accent/15' : 'text-ink-muted hover:text-ink hover:bg-elevated/70'}`}
                title="Tools"
              >
                <Wrench className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDebugPanelOpen((o) => !o)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${debugPanelOpen ? 'text-amber-300 bg-amber-500/15' : 'text-ink-muted hover:text-ink hover:bg-elevated/70'}`}
                title="Debugger"
              >
                <Bug className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTerminalOpen((o) => !o)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${terminalOpen ? 'text-ink bg-accent/15' : 'text-ink-muted hover:text-ink hover:bg-elevated/70'}`}
                title="Terminal"
              >
                <TerminalIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setPreviewOpen((o) => !o); if (!previewOpen) setPreviewKey((k) => k + 1); }}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${previewOpen ? 'text-ink bg-accent/15' : 'text-ink-muted hover:text-ink hover:bg-elevated/70'}`}
                title="Preview"
              >
                <Monitor className="w-4 h-4" />
              </button>
            </div>

            {/* Left panel: Explorer / Search / Git */}
            <div
              className={`h-full flex flex-col shrink-0 overflow-hidden ${resizing ? '' : 'transition-[width] duration-200'} border-r border-line/80 bg-surface`}
              style={{ width: explorerOpen ? explorerW : 0 }}
            >
              <div className="flex items-center justify-between px-4 py-2.5 shrink-0">
                <span className="text-[10px] font-semibold tracking-widest text-ink-muted uppercase">
                  {leftTab === 'git' ? 'Source Control' : leftTab === 'search' ? 'Search' : leftTab === 'outline' ? 'Outline' : 'Explorer'}
                </span>
                <div className="flex items-center gap-0.5">
                  {leftTab === 'explorer' && (
                    <>
                      <button onClick={importFile} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-elevated transition-colors" title="Import file">
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                      {currentWs && !projectMode && (
                        <a
                          href={ideApi.exportZipUrl(currentWs)}
                          download={`${currentWs}.zip`}
                          className="p-1 rounded-md text-ink-muted hover:text-emerald-400 hover:bg-elevated transition-colors"
                          title="Download workspace as .zip"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button onClick={refreshTree} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-elevated transition-colors" title="Refresh">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                {leftTab === 'outline' && (
                  <div className="h-full flex flex-col">
                    {!activePath ? (
                      <p className="text-[11px] text-ink-muted text-center py-6">Open a file to see its symbols</p>
                    ) : (
                      <>
                        <div className="px-4 py-1.5 text-[10px] text-ink-muted truncate border-b border-line/60" title={activePath}>
                          {activePath}
                        </div>
                        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-3">
                          {outlineLoading ? (
                            <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-ink-muted" /></div>
                          ) : outline.length === 0 ? (
                            <p className="text-[11px] text-ink-muted text-center py-6">No symbols indexed</p>
                          ) : (
                            <div className="space-y-px">
                              {outline.map((s, i) => (
                                <button
                                  key={s.id || i}
                                  onClick={() => openFile(activePath, projectMode || readOnly, s.line)}
                                  className="w-full flex items-center gap-2 px-2 py-1 rounded-md text-[11px] text-ink-subtle hover:bg-elevated/60 hover:text-ink transition-colors text-left"
                                  title={s.signature || s.name}
                                >
                                  <KindIcon kind={s.kind} />
                                  <span className="truncate flex-1 font-mono">{s.name.replace(/^route:/, '')}</span>
                                  <span className="text-[9px] text-ink-muted tabular-nums shrink-0">{s.line}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {leftTab === 'git' && (
                    <button onClick={() => ideApi.gitStatus(currentWs).then(setGit).catch(() => {})} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-elevated transition-colors" title="Refresh git status">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {readOnly && leftTab === 'explorer' && (
                <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-accent/10 border border-line-strong/25 text-[10px] text-ink">
                  Read-only project view. Create a sandboxed workspace to edit & run agents.
                </div>
              )}
              <div className="flex-1 min-h-0 overflow-hidden">
                {leftTab === 'explorer' && (
                  <div
                    className="h-full overflow-y-auto px-2 pb-3 scrollbar-thin"
                    onDragOver={(e) => { if (dragPath) e.preventDefault(); }}
                    onDrop={(e) => { e.preventDefault(); if (dragPath) dropMove(dragPath, '.'); else setDragOverDir(null); }}
                  >
                    {newEntry && newEntry.parentDir === '.' && (
                      <div className="flex items-center gap-1.5 py-[5px] pr-2" style={{ paddingLeft: '8px' }}>
                        {newEntry.kind === 'dir' ? <Folder className="w-3.5 h-3.5 text-ink-muted/70 shrink-0" /> : fileIcon(newEntryValue || 'untitled')}
                        <input
                          autoFocus
                          value={newEntryValue}
                          onChange={(e) => setNewEntryValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitNew();
                            if (e.key === 'Escape') setNewEntry(null);
                          }}
                          placeholder={newEntry.kind === 'dir' ? 'folder name' : 'file name'}
                          className="flex-1 min-w-0 rounded border border-line-strong/50 bg-surface px-1.5 py-0.5 text-xs text-ink outline-none placeholder:text-ink-muted"
                        />
                      </div>
                    )}
                    {renderTree(tree, 0)}
                  </div>
                )}

                {leftTab === 'search' && (
                  <div className="h-full flex flex-col gap-2 p-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                        placeholder="search code..."
                        className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-line-strong/60 outline-none placeholder:text-ink-muted"
                      />
                      <button onClick={doSearch} className="p-2 rounded-lg bg-elevated hover:bg-elevated text-ink transition-colors">
                        {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="flex gap-1">
                      {(['workspace', 'project'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setSearchScope(s)}
                          className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider transition-colors ${searchScope === s ? 'bg-accent/15 text-ink' : 'text-ink-muted hover:text-ink-subtle'}`}
                        >
                          {s}
                        </button>
                      ))}
                      <span className="mx-1 w-px bg-elevated" />
                      {(['semantic', 'text'] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setSearchMode(m)}
                          className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider transition-colors ${searchMode === m ? 'bg-emerald-500/15 text-emerald-300' : 'text-ink-muted hover:text-ink-subtle'}`}
                        >
                          {m === 'semantic' ? 'smart' : m}
                        </button>
                      ))}
                    </div>
                    {/* Replace row — only in text mode and non-read-only workspaces */}
                    {searchMode === 'text' && !readOnly && !projectMode && (
                      <div className="flex items-center gap-1.5">
                        <input
                          value={replaceQuery}
                          onChange={(e) => setReplaceQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && searchQuery.trim() && doReplace()}
                          placeholder="replace with..."
                          className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-amber-500/60 outline-none placeholder:text-ink-muted"
                        />
                        <button
                          onClick={doReplace}
                          disabled={!searchQuery.trim() || replacing}
                          title="Replace all occurrences in workspace"
                          className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-300 transition-colors disabled:opacity-40"
                        >
                          {replacing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Edit3 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                    {replaceCount !== null && (
                      <div className="text-[10px] text-amber-300/80 font-mono">
                        ✓ {replaceCount} replacement{replaceCount !== 1 ? 's' : ''} applied
                      </div>
                    )}
                    <div className="flex-1 overflow-y-auto scrollbar-thin">
                      {searchResults.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => openFile(r.file, searchScope === 'project' || projectMode)}
                          className="w-full text-left px-2 py-1.5 rounded-md hover:bg-elevated/60 transition-colors block"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-ink font-mono truncate">{r.file}:{r.line}</span>
                            {typeof r.score === 'number' && (
                              <span className="ml-auto shrink-0 text-[9px] font-mono text-emerald-400/80">{Math.round(r.score * 100)}%</span>
                            )}
                          </div>
                          <div className="text-[10px] text-ink-muted truncate">{r.text}</div>
                          {!!r.labels?.length && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {r.labels.slice(0, 3).map((l, li) => (
                                <span key={li} className="px-1 py-px rounded bg-elevated/80 text-[8px] font-mono text-ink-subtle">{l}</span>
                              ))}
                            </div>
                          )}
                        </button>
                      ))}
                      {searchResults.length === 0 && searchQuery.trim() && !searching && (
                        <p className="text-[11px] text-ink-muted text-center py-6">No matches</p>
                      )}
                    </div>
                  </div>
                )}

                {leftTab === 'git' && (
                  <div className="h-full flex flex-col p-3 gap-2">
                    {!projectMode ? (
                      <>
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-3.5 h-3.5 text-ink-muted" />
                          <span className="text-xs text-ink">{git ? (git.isRepo ? git.branch : 'No repository yet') : '…'}</span>
                          {git && !git.isRepo && (
                            <button onClick={() => gitAction('init')} disabled={gitBusy} className="ml-auto px-2.5 py-1 rounded-md bg-accent hover:bg-accent text-[10px] text-accent-fg transition-colors disabled:opacity-40">
                              {gitBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Init repo'}
                            </button>
                          )}
                        </div>
                        {git && git.isRepo && (
                          <>
                            <div className="flex items-center gap-1.5">
                              <select
                                value={git.branch ?? ''}
                                onChange={(e) => gitCheckout(e.target.value)}
                                disabled={gitBranchBusy}
                                title="Switch branch"
                                className="flex-1 min-w-0 rounded-lg border border-line bg-surface px-2 py-1 text-[11px] font-mono text-ink focus:border-line-strong/60 outline-none disabled:opacity-40"
                              >
                                {gitBranches.map((b) => (
                                  <option key={b} value={b}>{b}</option>
                                ))}
                              </select>
                              <input
                                value={newBranch}
                                onChange={(e) => setNewBranch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && createBranch()}
                                placeholder="new branch"
                                className="flex-1 min-w-0 rounded-lg border border-line bg-surface px-2 py-1 text-[11px] text-ink focus:border-line-strong/60 outline-none placeholder:text-ink-muted"
                              />
                              <button onClick={createBranch} disabled={gitBranchBusy || !newBranch.trim()} className="p-1.5 rounded-lg bg-elevated hover:bg-elevated text-ink transition-colors disabled:opacity-40" title="Create and switch to branch">
                                {gitBranchBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                              </button>
                            </div>
                            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-0.5">
                              {git.status.length === 0 && <p className="text-[11px] text-ink-muted text-center py-6">Working tree clean</p>}
                              {git.status.map((s, i) => (
                                <div key={i} className="group flex items-center gap-2 px-2 py-1 rounded-md text-[11px] font-mono hover:bg-elevated/50 transition-colors">
                                  <span className={`w-6 text-center shrink-0 font-semibold ${s.flag === '??' ? 'text-amber-400' : s.flag.startsWith('D') ? 'text-rose-400' : s.flag.startsWith('M') ? 'text-emerald-400' : 'text-ink-muted'}`}>{s.flag}</span>
                                  <span className="text-ink-subtle truncate flex-1 cursor-pointer" onClick={() => openFile(s.file, false)} title={s.file}>{s.file}</span>
                                  {s.untracked ? (
                                    <span className="text-[9px] text-amber-400/80 shrink-0">new</span>
                                  ) : (
                                    <span className="text-[9px] font-mono shrink-0 whitespace-nowrap">
                                      <span className="text-emerald-400">+{s.added}</span> <span className="text-rose-400">-{s.removed}</span>
                                    </span>
                                  )}
                                  <button onClick={() => stageAll(s.file)} disabled={gitBusy} className="p-1 rounded-md text-ink-muted hover:text-emerald-300 hover:bg-elevated transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-0" title="Stage all changes in this file">
                                    <Plus className="w-3 h-3" />
                                  </button>
                                  <button onClick={() => revertAll(s.file)} disabled={gitBusy} className="p-1 rounded-md text-ink-muted hover:text-rose-300 hover:bg-elevated transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-0" title="Revert all changes in this file">
                                    <Undo2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-1.5">
                              <input
                                value={gitMsg}
                                onChange={(e) => setGitMsg(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && gitAction('commit')}
                                placeholder="commit message"
                                className="flex-1 min-w-0 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] text-ink focus:border-line-strong/60 outline-none placeholder:text-ink-muted"
                              />
                              <button onClick={suggestGitMessage} disabled={gitSuggesting || gitBusy} className="p-1.5 rounded-lg bg-elevated hover:bg-elevated text-ink transition-colors disabled:opacity-40" title="Suggest commit message with AI">
                                {gitSuggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                              </button>
                              <button onClick={() => gitAction('commit')} disabled={gitBusy} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent hover:bg-accent text-[10px] text-accent-fg transition-colors disabled:opacity-40" title="Commit all changes">
                                <GitCommitHorizontal className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex gap-1.5">
                              <button onClick={() => gitAction('pull')} disabled={gitBusy} className="flex-1 py-1.5 rounded-lg bg-elevated hover:bg-elevated text-[10px] text-ink transition-colors disabled:opacity-40">Pull</button>
                              <button onClick={() => gitAction('push')} disabled={gitBusy} className="flex-1 py-1.5 rounded-lg bg-elevated hover:bg-elevated text-[10px] text-ink transition-colors disabled:opacity-40">Push</button>
                            </div>
                            {gitLog.length > 0 && (
                              <div className="border-t border-line/60 pt-2 max-h-36 overflow-y-auto scrollbar-thin space-y-1">
                                {gitLog.map((c) => (
                                  <div key={c.hash} className="flex items-center gap-1.5 text-[10px] font-mono">
                                    <span className="text-ink-muted shrink-0">{c.hash.slice(0, 7)}</span>
                                    <span className="text-ink-muted shrink-0">{c.date}</span>
                                    <span className="text-ink-subtle truncate" title={`${c.message}\n${c.author}`}>{c.message}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* ─── GitHub section ─── */}
                            <div className="border-t border-line/60 pt-2 space-y-2">
                              {!githubToken ? (
                                <div className="space-y-2">
                                  {githubUserCode && (
                                    <div className="rounded-lg border border-line-strong/30 bg-accent/5 px-3 py-2 text-center">
                                      <div className="text-[9px] text-ink-muted uppercase tracking-wider mb-1">Enter this code at github.com/login/device</div>
                                      <div className="text-lg font-mono font-bold text-ink tracking-widest">{githubUserCode}</div>
                                      <div className="text-[9px] text-ink-muted mt-1">Waiting for authorization…</div>
                                    </div>
                                  )}
                                  <button
                                    onClick={connectGithub}
                                    disabled={githubConnecting}
                                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-elevated hover:bg-elevated border border-line text-[10px] text-ink transition-colors disabled:opacity-50"
                                  >
                                    {githubConnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitBranch className="w-3 h-3" />}
                                    {githubConnecting ? 'Waiting for GitHub…' : 'Connect GitHub'}
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <GitBranch className="w-3 h-3 text-emerald-400" />
                                      <span className="text-[10px] text-ink">@{githubLogin || 'connected'}</span>
                                    </div>
                                    <button onClick={disconnectGithub} className="text-[9px] text-ink-muted hover:text-rose-400 transition-colors">Disconnect</button>
                                  </div>
                                  <button
                                    onClick={() => setGithubPushOpen((o) => !o)}
                                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-elevated hover:bg-elevated border border-line text-[10px] text-ink transition-colors"
                                  >
                                    <Upload className="w-3 h-3 text-emerald-400" />
                                    Push to GitHub
                                  </button>
                                  {githubPushOpen && (
                                    <div className="space-y-1.5 pt-1">
                                      <input
                                        value={githubPushUrl}
                                        onChange={(e) => setGithubPushUrl(e.target.value)}
                                        placeholder="https://github.com/user/repo"
                                        className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11px] font-mono text-ink outline-none focus:border-line-strong/60 placeholder:text-ink-muted"
                                      />
                                      <div className="flex gap-1.5">
                                        <input value={githubPushBranch} onChange={(e) => setGithubPushBranch(e.target.value)} placeholder="main" className="w-20 rounded-md border border-line bg-surface px-2 py-1.5 text-[11px] font-mono text-ink outline-none focus:border-line-strong/60" />
                                        <input value={githubPushMsg} onChange={(e) => setGithubPushMsg(e.target.value)} placeholder="commit message (optional)" className="flex-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11px] text-ink outline-none focus:border-line-strong/60 placeholder:text-ink-muted" />
                                      </div>
                                      <button
                                        onClick={pushToGithub}
                                        disabled={!githubPushUrl.trim() || githubPushBusy}
                                        className="w-full py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-[10px] text-ink transition-colors disabled:opacity-40"
                                      >
                                        {githubPushBusy ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Push'}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <p className="text-[11px] text-ink-muted text-center py-6">Git works in sandboxed workspaces</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            {explorerOpen && <ResizeHandle dir="x" onResize={(d) => setExplorerW((w) => Math.min(480, Math.max(200, w + d)))} onDrag={setResizing} />}

            {/* Center: editor + preview */}
            <div className="flex-1 flex min-w-0">
              <div className="flex-1 flex flex-col min-w-0 bg-canvas">
                {/* ─── Problems bar (VS Code-style status strip) ─── */}
                {inIde && problems.length > 0 && (
                  <div className="shrink-0 border-b border-line/60 bg-canvas">
                    <button
                      onClick={() => setProblemsOpen((o) => !o)}
                      className="w-full flex items-center gap-3 px-3 h-6 hover:bg-elevated/40 transition-colors"
                    >
                      {problems.some((p) => p.severity === 'error') && (
                        <span className="flex items-center gap-1 text-[10px] text-rose-400 font-semibold">
                          <AlertCircle className="w-3 h-3" />
                          {problems.filter((p) => p.severity === 'error').length} error{problems.filter((p) => p.severity === 'error').length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {problems.some((p) => p.severity === 'warning') && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
                          <TriangleAlert className="w-3 h-3" />
                          {problems.filter((p) => p.severity === 'warning').length} warning{problems.filter((p) => p.severity === 'warning').length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {problems.every((p) => p.severity === 'info') && (
                        <span className="flex items-center gap-1 text-[10px] text-ink-muted font-semibold">
                          <Info className="w-3 h-3" />
                          {problems.length} info
                        </span>
                      )}
                      {/* Fix all errors with one click */}
                      {problems.some((p) => p.severity === 'error') && !running && !readOnly && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const errorList = problems
                              .filter((p) => p.severity === 'error')
                              .slice(0, 8)
                              .map((p) => `${p.file}:${p.line} — ${p.message}`)
                              .join('\n');
                            runQuickAgent(`Fix these errors:\n${errorList}`);
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-[10px] text-rose-300 hover:bg-rose-500/25 transition-colors ml-2 shrink-0"
                          title="Auto-fix all errors with quick agent"
                        >
                          <Wrench className="w-3 h-3" /> Fix all
                        </button>
                      )}
                      <ChevronDown className={`w-3 h-3 text-ink-muted ml-auto transition-transform ${problemsOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {problemsOpen && (
                      <div className="max-h-48 overflow-y-auto scrollbar-thin border-t border-line/60 bg-surface">
                        {problems.map((p, i) => (
                          <button
                            key={i}
                            onClick={() => openFile(p.file, false, p.line)}
                            className="w-full flex items-start gap-2 px-3 py-1.5 text-left hover:bg-elevated/50 transition-colors group"
                          >
                            {p.severity === 'error'
                              ? <AlertCircle className="w-3 h-3 text-rose-400 shrink-0 mt-px" />
                              : p.severity === 'warning'
                              ? <TriangleAlert className="w-3 h-3 text-amber-400 shrink-0 mt-px" />
                              : <Info className="w-3 h-3 text-ink-muted shrink-0 mt-px" />
                            }
                            <span className="flex-1 min-w-0 text-[11px] font-mono text-ink truncate">{p.message}</span>
                            <span className="shrink-0 text-[10px] text-ink-muted font-mono whitespace-nowrap ml-1">
                              {p.file}:{p.line}:{p.col}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center h-9 border-b border-line/80 bg-surface overflow-x-auto scrollbar-none shrink-0">
                  {openFiles.map((f) => {
                    const base = f.path.split('/').pop() || f.path;
                    const dir = f.path.split('/').slice(0, -1).join('/');
                    return (
                      <div
                        key={f.path}
                        onClick={() => setActivePath(f.path)}
                        title={f.path}
                        className={`flex items-center gap-1.5 px-3 text-[11px] font-mono border-r border-line/60 cursor-pointer whitespace-nowrap h-full transition-colors ${activePath === f.path ? 'bg-elevated text-ink' : 'text-ink-muted hover:text-ink'}`}
                      >
                        {f.dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                        <span className="shrink-0">{fileIcon(f.path)}</span>
                        <span className="truncate max-w-[180px]">{base}</span>
                        {dir && <span className="text-[9px] text-ink-muted truncate max-w-[120px]">…{dir.slice(-40)}</span>}
                        <X className="w-3 h-3 hover:text-rose-400" onClick={(e) => { e.stopPropagation(); closeFile(f.path); }} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex-1 min-h-0 relative">
                  {/* Notebook overlay */}
                  {notebookOpen && activeFile && (
                    <div className="absolute inset-0 z-20 bg-canvas overflow-hidden">
                      <NotebookView
                        workspace={currentWs}
                        file={activeFile.path}
                        lang={notebookLang}
                        onClose={() => setNotebookOpen(false)}
                      />
                    </div>
                  )}
                  {activeFile ? (
                    <>
                      <div className="absolute top-2 right-3 z-10 flex items-center gap-1">
                        {/* Notebook toggle button */}
                        {activeFile && /\.(py|js|ts|mjs|jsx|tsx|r)$/.test(activeFile.path) && (
                          <button
                            onClick={() => {
                              const ext = activeFile.path.split('.').pop() || 'js';
                              setNotebookLang(['py', 'r'].includes(ext) ? 'python' : 'javascript');
                              setNotebookFile(activeFile.path);
                              setNotebookOpen((o) => !o);
                            }}
                            title="Toggle notebook / cell mode"
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] transition-colors shadow-lg ${notebookOpen ? 'bg-accent text-accent-fg' : 'bg-elevated/90 hover:bg-elevated text-ink-subtle hover:text-ink'}`}
                          >
                            <Braces className="w-3 h-3" /> Cells
                          </button>
                        )}
                        {!readOnly && (
                          <button onClick={() => saveFile(activeFile.path)} disabled={!activeFile.dirty} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-elevated/90 hover:bg-elevated text-[10px] text-ink disabled:opacity-40 transition-colors shadow-lg">
                            <Save className="w-3 h-3" /> {activeFile.dirty ? 'Save' : 'Saved'}
                          </button>
                        )}
                        {readOnly && <span className="px-2 py-1 rounded-md bg-elevated/90 text-[10px] text-ink-subtle">Read-only</span>}
                        {!projectMode && currentWs && (
                          <div className="flex items-center gap-1">
                            {/* Peer avatar circles — one per connected collaborator */}
                            {collabEnabled && collabPeers.map((p, i) => (
                              <span
                                key={i}
                                title={p.name}
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-ink ring-1 ring-black/30 shadow-sm shrink-0"
                                style={{ background: p.color }}
                              >
                                {p.name.slice(0, 2).toUpperCase()}
                              </span>
                            ))}
                            <button
                              onClick={() => { setCollabEnabled((e) => !e); setCollabPeers([]); }}
                              title={collabEnabled ? 'Disable live collaboration' : 'Enable live collaboration'}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] transition-colors shadow-lg ${collabEnabled ? 'bg-accent/80 hover:bg-accent text-accent-fg' : 'bg-elevated/90 hover:bg-elevated text-ink-subtle hover:text-ink'}`}
                            >
                              <Users className="w-3 h-3" />
                              {collabEnabled ? (collabPeers.length > 0 ? `${collabPeers.length} peer${collabPeers.length !== 1 ? 's' : ''}` : 'Live') : 'Collab'}
                            </button>
                          </div>
                        )}
                      </div>
                      <MonacoEditor
                        key={activeFile.path}
                        path={activeFile.path}
                        value={activeFile.content}
                        readOnly={readOnly}
                        workspace={projectMode ? '' : currentWs}
                        diffHunks={activeDiff?.hunks ?? (gitFileDiff ? gitFileDiff.hunks : undefined)}
                        originalContent={activeDiff?.oldContent}
                        reveal={revealLine}
                        onChange={(v) => updateContent(activeFile.path, v)}
                        onSave={() => saveFile(activeFile.path)}
                        onAcceptHunk={gitFileDiff ? (i) => applyGitHunk(activeFile.path, i, 'accept') : (i) => applyHunk(activeFile.path, i, 'accept')}
                        onRejectHunk={gitFileDiff ? (i) => applyGitHunk(activeFile.path, i, 'reject') : (i) => applyHunk(activeFile.path, i, 'reject')}
                        onCommitted={() => {
                          void refreshTree();
                          setOpenFiles((prev) => prev.map((f) => (f.path === activeFile.path ? { ...f, dirty: false } : f)));
                          showToast('Inline edit saved');
                        }}
                        onOpenLocation={(p, line) => openFile(p, false, line)}
                        onFindUsages={(p, line, col, word) => void doFindUsages(p, line, col, word)}
                        onExtract={(p, line, col, word) => void doExtract(p, line, col, word)}
                        onMarkersChange={(m) => setProblems(m)}
                        collabEnabled={collabEnabled}
                        collabUser={undefined}
                        collabColor={undefined}
                        onCollabCursorsChange={(cursors) =>
                          setCollabPeers([...cursors.values()].map((c) => ({ name: c.name, color: c.color })))
                        }
                        inlayHints={inlayHints}
                        vimMode={vimMode}
                      />
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-8">
                      <div className="w-12 h-12 rounded-2xl bg-elevated/60 border border-line/60 flex items-center justify-center">
                        <FileCode className="w-5 h-5 text-ink-muted" />
                      </div>
                      <div>
                        <p className="text-sm text-ink-subtle">Select a file to start editing</p>
                        <p className="text-[11px] text-ink-muted mt-1">Or tell the agents what to build below</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {previewOpen && !projectMode && (
                <>
                  <ResizeHandle dir="x" onResize={(d) => setPreviewW((w) => Math.min(720, Math.max(320, w - d)))} onDrag={setResizing} />
                  <div className={`h-full flex flex-col bg-surface border-l border-line/80 shrink-0 overflow-hidden ${resizing ? '' : 'transition-[width] duration-200'}`} style={{ width: previewW }}>
                    <div className="flex items-center gap-2 px-3 h-9 border-b border-line/80 shrink-0">
                      <button onClick={() => setPreviewKey((k) => k + 1)} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-elevated transition-colors" title="Reload">
                        <RefreshCw className="w-3 h-3" />
                      </button>
                      <span className="text-[10px] text-ink-muted font-mono truncate flex-1">preview · {currentWs}</span>
                      {termPreviewUrl && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[9px] text-emerald-300 font-mono" title="Dev server detected from terminal">
                          dev
                          <button onClick={() => setTermPreviewUrl(null)} className="text-emerald-400/70 hover:text-emerald-200 transition-colors" title="Reset to static preview">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      <a href={effectivePreviewUrl} target="_blank" rel="noreferrer" className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-elevated transition-colors" title="Open in new tab">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button onClick={() => setPreviewOpen(false)} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-elevated transition-colors" title="Close">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <iframe key={previewKey} src={effectivePreviewUrl} className="flex-1 w-full bg-surface border-none" title="Workspace preview" />
                  </div>
                </>
              )}
            </div>
            {previewOpen && <div className="w-px shrink-0" />}

            {/* AI Agents panel */}
            <div
              className={`h-full flex flex-col shrink-0 overflow-hidden border-l border-line/80 bg-surface ${resizing ? '' : 'transition-[width] duration-200'}`}
              style={{ width: agentsOpen ? agentsW : 0 }}
            >
              {/* ─── Session tabs bar ─── */}
              <div className="shrink-0 border-b border-line/60 bg-canvas">
                <div className="flex items-center gap-0 overflow-x-auto scrollbar-none px-2 pt-1.5">
                  {sessions.map((s) => (
                    <div key={s.id} className={`group relative flex items-center gap-1 shrink-0 px-2.5 py-1 mr-0.5 rounded-t-md text-[10px] cursor-pointer transition-colors select-none ${s.id === activeSessionId ? 'bg-surface border border-b-line border-line/80 text-ink' : 'text-ink-muted hover:text-ink hover:bg-elevated/40'}`}
                      onClick={() => switchSession(s.id)}>
                      {sessionRenaming === s.id ? (
                        <input
                          autoFocus
                          value={sessionRenameVal}
                          onChange={(e) => setSessionRenameVal(e.target.value)}
                          onBlur={() => { updateSession(s.id, { name: sessionRenameVal.trim() || s.name }); setSessionRenaming(null); }}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') { updateSession(s.id, { name: sessionRenameVal.trim() || s.name }); setSessionRenaming(null); } }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-20 bg-transparent outline-none border-b border-line-strong/60 text-ink font-mono text-[10px]"
                        />
                      ) : (
                        <span className="max-w-[80px] truncate font-medium" onDoubleClick={(e) => { e.stopPropagation(); setSessionRenaming(s.id); setSessionRenameVal(s.name); }}>
                          {s.name}
                        </span>
                      )}
                      {s.running && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" />}
                      {sessions.length > 1 && (
                        <button onClick={(e) => { e.stopPropagation(); removeSession(s.id); }} className="opacity-0 group-hover:opacity-100 ml-0.5 text-ink-muted hover:text-rose-400 transition-all" title="Close session">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={addSession} className="shrink-0 p-1 ml-1 rounded-md text-ink-muted hover:text-ink hover:bg-elevated/40 transition-colors" title="New session">
                    <Plus className="w-3 h-3" />
                  </button>
                  <div className="flex-1" />
                  {running && (
                    <button onClick={stopPipeline} className="shrink-0 flex items-center gap-1 px-2 py-1 mr-1 rounded-md bg-rose-500/15 text-rose-300 text-[10px] hover:bg-rose-500/25 transition-colors">
                      <Square className="w-3 h-3" /> Stop
                    </button>
                  )}
                  <button onClick={() => setAgentsOpen(false)} className="shrink-0 p-1 rounded-md text-ink-muted hover:text-ink hover:bg-elevated transition-colors" title="Close panel">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {liveTaskRecord && (
                <div className="shrink-0 border-b border-line/70 bg-accent/[0.035] px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Activity className={`h-3.5 w-3.5 ${['completed'].includes(liveTaskRecord.state) ? 'text-emerald-400' : ['failed', 'stopped'].includes(liveTaskRecord.state) ? 'text-rose-400' : 'text-ink-muted animate-pulse'}`} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-ink">Live task · {String(liveTaskRecord.state || 'planning').replace('_', ' ')}</span>
                    <span className="ml-auto text-[9px] text-ink-muted">{liveTaskRecord.modifiedFiles?.length || 0} files</span>
                  </div>
                  <p className="mt-1 truncate text-[10px] text-ink-muted" title={liveTaskRecord.goal}>{liveTaskRecord.goal}</p>
                  <div className="mt-2 space-y-1 border-l border-line pl-2">
                    {(liveTaskRecord.events || []).slice(-4).reverse().map((event: any) => {
                      const text = event.message || event.acknowledgement || event.content || (event.type === 'plan_update' ? 'Plan updated' : event.type === 'file_edit' ? `Changed ${event.path || 'source file'}` : event.type === 'build_test_result' ? (event.failed ? 'Verification found remaining issues' : 'Verification passed') : event.type?.replace(/_/g, ' '));
                      return <div key={event.id || `${event.type}-${event.at}`} className="truncate text-[9px] leading-4 text-ink-muted" title={typeof text === 'string' ? text : JSON.stringify(text)}>{text}</div>;
                    })}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(liveTaskRecord.plan || []).slice(0, 2).map((milestone: any, index: number) => (
                      <span key={index} className="rounded border border-line-strong/20 bg-accent/10 px-1.5 py-0.5 text-[9px] text-ink">{milestone.milestone || milestone.goal}</span>
                    ))}
                    {liveTaskRecord.verification?.build && (
                      <span className={`rounded border px-1.5 py-0.5 text-[9px] ${liveTaskRecord.verification.build.exitCode === 0 ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'}`}>
                        build {liveTaskRecord.verification.build.exitCode === 0 ? 'passed' : 'failed'}
                      </span>
                    )}
                    {running && liveTaskId && (
                      liveTaskRecord.state === 'paused' ? (
                        <button onClick={() => ideApi.controlLiveTask(liveTaskId, 'resume').then(({ state }) => setLiveTaskRecord((current: any) => current ? { ...current, state } : current)).catch((err) => showToast(err.message))} className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-300 hover:bg-emerald-500/20">Resume</button>
                      ) : (
                        <button onClick={() => ideApi.controlLiveTask(liveTaskId, 'pause').then(({ state }) => setLiveTaskRecord((current: any) => current ? { ...current, state } : current)).catch((err) => showToast(err.message))} className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-300 hover:bg-amber-500/20">Pause</button>
                      )
                    )}
                    {running && liveTaskId && (
                      <button onClick={() => ideApi.controlLiveTask(liveTaskId, 'stop').then(stopPipeline).catch(() => stopPipeline())} className="rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[9px] text-rose-300 hover:bg-rose-500/20">Stop task</button>
                    )}
                  </div>
                </div>
              )}

              {liveTaskRecord && (
                <DeliveryPanel workspace={currentWs || ''} task={liveTaskRecord} running={running} onToast={showToast} />
              )}

              {(chat.length > 0 || chatStreaming) && (
                <div ref={chatRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin border-b border-line/60">
                  {chat.map((m, i) => {
                    const blocks = m.role === 'assistant' ? parseChatBlocks(m.content) : null;
                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                        <div className={`max-w-[92%] rounded-xl px-3 py-2 ${m.role === 'user' ? 'bg-accent/15 border border-line-strong/30' : 'bg-surface border border-line/80'}`}>
                          <div className={`text-[9px] font-semibold tracking-widest uppercase mb-1 ${m.role === 'user' ? 'text-ink' : 'text-ink-muted'}`}>
                            {m.role === 'user' ? 'You' : 'Neural IDE'}
                          </div>
                          {blocks ? (
                            <div className="space-y-1.5">
                              {blocks.map((b, bi) =>
                                b.type === 'text' ? (
                                  b.text.trim() ? <pre key={bi} className="text-[10px] text-ink whitespace-pre-wrap break-words font-mono leading-relaxed">{b.text}</pre> : null
                                ) : (
                                  <div key={bi} className="rounded-lg border border-line/60 overflow-hidden">
                                    {/* Code block header: language label + Copy + Apply */}
                                    <div className="flex items-center justify-between px-2.5 py-1 bg-elevated/70 border-b border-line/60">
                                      <span className="text-[9px] font-mono text-ink-subtle">{b.lang}</span>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => navigator.clipboard.writeText(b.code).then(() => showToast('Copied'))}
                                          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-ink-subtle hover:text-ink hover:bg-elevated/60 transition-colors"
                                          title="Copy code"
                                        >
                                          <Copy className="w-3 h-3" /> Copy
                                        </button>
                                        {activePath && !readOnly && (
                                          <button
                                            onClick={() => {
                                              const currentContent = openFiles.find((f) => f.path === activePath)?.content ?? '';
                                              setApplyPreview({ path: activePath, oldCode: currentContent, newCode: b.code });
                                            }}
                                            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-ink hover:text-ink hover:bg-accent/20 transition-colors"
                                            title={`Preview diff → ${activePath}`}
                                          >
                                            <Check className="w-3 h-3" /> Apply
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    <pre className="text-[10px] text-ink font-mono whitespace-pre-wrap break-words leading-relaxed px-2.5 py-2 max-h-64 overflow-y-auto scrollbar-thin bg-canvas">{b.code}</pre>
                                  </div>
                                )
                              )}
                            </div>
                          ) : (
                            <pre className="text-[10px] text-ink whitespace-pre-wrap break-words font-mono leading-relaxed">{m.content}</pre>
                          )}
                          {m.images && m.images.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {m.images.map((src, ii) => (
                                <img key={ii} src={src} alt="" className="h-24 max-w-[160px] object-cover rounded-lg border border-line/60" />
                              ))}
                            </div>
                          )}
                          {m.files && m.files.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {m.files.slice(0, 8).map((f) => (
                                <button key={f} onClick={() => openFile(f)} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-elevated/80 border border-line/50 text-[9px] text-ink hover:bg-elevated transition-colors font-mono">
                                  <FileCode className="w-2.5 h-2.5" /> {f}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                  {chatStreaming && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                      <div className="max-w-[92%] rounded-xl px-3 py-2 bg-surface border border-line-strong/30">
                        <div className="text-[9px] font-semibold tracking-widest uppercase mb-1 text-ink-muted">Neural IDE</div>
                        <pre className="text-[10px] text-ink whitespace-pre-wrap break-words font-mono leading-relaxed">
                          {chatStreamText}<span className="animate-pulse text-ink-muted">▌</span>
                        </pre>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              <div ref={stepsRef} className={`${chat.length > 0 ? 'flex-1 min-h-0' : 'flex-1'} overflow-y-auto px-3 py-2 space-y-1.5 scrollbar-thin`}>
                {steps.length === 0 && !running && chat.length === 0 && (
                  <div className="text-center py-10 px-4">
                    <Users className="w-6 h-6 text-ink-subtle mx-auto mb-3" />
                    <p className="text-xs text-ink-muted leading-relaxed">
                      Planner → Architect → Coder → Debugger → Tester → Reviewer → Docs
                    </p>
                    <p className="text-[11px] text-ink-muted mt-2">Describe a task in the composer below — the agents build, test and fix it autonomously.</p>
                  </div>
                )}
                {steps.map((s, i) => {
                  if (s.agent === 'tool') {
                    // Tool-use chip — inline compact pill
                    let toolName = s.message;
                    let toolArgs: Record<string, any> | null = null;
                    try { toolArgs = typeof s.detail === 'string' ? JSON.parse(s.detail) : (s.detail as any); } catch {}
                    const isWrite = toolName === 'write_file' || toolName === 'edit_file';
                    const isRun = toolName === 'run_command';
                    const color = isWrite ? 'text-amber-300' : isRun ? 'text-rose-300' : 'text-ink-muted';
                    const bg = isWrite ? 'bg-amber-500/8 border-amber-500/20' : isRun ? 'bg-rose-500/8 border-rose-500/20' : 'bg-accent/8 border-line-strong/20';
                    const icon = isWrite ? <Save className="w-3 h-3 shrink-0" /> : isRun ? <TerminalIcon className="w-3 h-3 shrink-0" /> : <Wrench className="w-3 h-3 shrink-0" />;
                    const label = toolArgs?.path || toolArgs?.command || toolArgs?.pattern || toolArgs?.glob || '';
                    return (
                      <motion.div
                        key={`tool-${i}`}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-mono ${bg} ${s.status === 'running' ? 'opacity-100' : 'opacity-70'}`}
                      >
                        {s.status === 'running' ? <Loader2 className={`w-3 h-3 shrink-0 animate-spin ${color}`} /> : s.status === 'error' ? <AlertCircle className="w-3 h-3 shrink-0 text-rose-400" /> : icon}
                        <span className={`font-semibold ${color}`}>{toolName}</span>
                        {label && <span className="text-ink-muted truncate max-w-[160px]">{label}</span>}
                        {s.status === 'done' && <CheckCircle2 className="w-3 h-3 text-emerald-500 ml-auto shrink-0" />}
                      </motion.div>
                    );
                  }
                  const meta = AGENT_META[s.agent] || { title: s.agent, icon: '⚙️', color: '#a1a1aa' };
                  const isOpen = expandedStep === s.agent;
                  // Tool logs belonging to this agent step
                  const agentToolLogs = logs.filter((l) => l.kind === 'tool' || l.kind === 'tool_result');
                  return (
                    <motion.div
                      key={`${s.agent}-${i}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-lg border ${s.status === 'running' ? 'border-line-strong/40 bg-accent/5' : 'border-line/80 bg-surface'} overflow-hidden`}
                    >
                      <button
                        onClick={() => setExpandedStep(isOpen ? null : s.agent)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
                      >
                        <span className="text-sm leading-none">{meta.icon}</span>
                        <span className="text-[11px] font-medium" style={{ color: meta.color }}>{meta.title}</span>
                        <span className="flex-1" />
                        {/* Token budget badge */}
                        {(s.tokensIn || s.tokensOut) ? (
                          <span
                            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-elevated border border-line/50 text-[9px] font-mono text-ink-muted shrink-0"
                            title={`Context: ${(s.tokensIn ?? 0).toLocaleString()} in / ${(s.tokensOut ?? 0).toLocaleString()} out`}
                          >
                            <Zap className="w-2.5 h-2.5 text-amber-400/70" />
                            {(s.tokensIn ?? 0) >= 1000 ? `${((s.tokensIn ?? 0) / 1000).toFixed(1)}k` : (s.tokensIn ?? 0)}
                          </span>
                        ) : null}
                        {s.status === 'running' && <Loader2 className="w-3 h-3 text-ink-muted animate-spin" />}
                        {s.status === 'done' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                        {s.status === 'error' && <AlertCircle className="w-3 h-3 text-rose-400" />}
                        <ChevronDown className={`w-3 h-3 text-ink-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {/* Live thinking ticker — visible when this step is running and the model is streaming */}
                      {s.status === 'running' && thinkingText && (
                        <div className="px-3 pb-2 border-t border-line-strong/20">
                          <p className="text-[10px] text-ink/80 font-mono whitespace-pre-wrap break-words leading-relaxed line-clamp-4">
                            {thinkingText}<span className="animate-pulse">▌</span>
                          </p>
                        </div>
                      )}
                      {/* Reasoning chain — collapsible block for o1/o3/DeepSeek-R1 models */}
                      {reasoningBlocks[s.agent] && (
                        <div className="px-3 pb-2 border-t border-line-strong/20">
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedReasoning(expandedReasoning === s.agent ? null : s.agent); }}
                            className="flex items-center gap-1.5 text-[10px] text-ink-muted/80 hover:text-ink w-full text-left py-1"
                          >
                            <Sparkles className="w-3 h-3 shrink-0" />
                            <span>Reasoning chain</span>
                            <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${expandedReasoning === s.agent ? 'rotate-180' : ''}`} />
                          </button>
                          {expandedReasoning === s.agent && (
                            <pre className="mt-1 text-[10px] text-ink/70 font-mono whitespace-pre-wrap break-words leading-relaxed max-h-48 overflow-y-auto bg-surface/20 rounded-md p-2">
                              {reasoningBlocks[s.agent]}
                            </pre>
                          )}
                        </div>
                      )}
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-3 pb-3 space-y-1.5"
                          >
                            <p className="text-[11px] text-ink-subtle">{s.message}</p>
                            {s.detail && <pre className="mt-1 text-[10px] text-ink-muted font-mono whitespace-pre-wrap break-words">{typeof s.detail === 'string' ? s.detail : JSON.stringify(s.detail, null, 2)}</pre>}
                            {agentToolLogs.length > 0 && (
                              <div className="mt-2 space-y-1 border-t border-line/60 pt-2">
                                <span className="text-[9px] tracking-widest text-ink-muted uppercase">Tool calls</span>
                                {agentToolLogs.slice(-12).map((l, li) => {
                                  if (l.kind === 'tool') {
                                    let parsed: any = null;
                                    try { parsed = JSON.parse(l.content); } catch {}
                                    const isW = parsed?.tool === 'write_file' || parsed?.tool === 'edit_file';
                                    return (
                                      <div key={li} className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded ${isW ? 'bg-amber-500/8 text-amber-300' : 'bg-accent/8 text-ink-muted'}`}>
                                        {isW ? <Save className="w-3 h-3 shrink-0" /> : <Wrench className="w-3 h-3 shrink-0" />}
                                        <span className="font-semibold">{parsed?.tool ?? l.content}</span>
                                        {parsed?.args?.path && <span className="text-ink-muted truncate">{parsed.args.path}</span>}
                                        {parsed?.args?.command && <span className="text-ink-muted truncate">{parsed.args.command}</span>}
                                      </div>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>

              {planSteps.length > 0 && (
                <div className="rounded-lg border border-line/80 bg-surface overflow-hidden">
                  <div className="flex items-center gap-1.5 px-3 py-2 border-b border-line/80">
                    <Wrench className="w-3 h-3 text-amber-300" />
                    <span className="text-[10px] font-semibold tracking-widest text-amber-300 uppercase">Implementation roadmap</span>
                  </div>
                  <div className="px-3 py-2 flex flex-col gap-3 max-h-56 overflow-y-auto scrollbar-thin">
                    {planSteps.map((m, mi) => (
                      <div key={mi}>
                        <p className="text-[11px] font-medium text-ink">{mi + 1}. {m.milestone}</p>
                        {m.goal && <p className="text-[10px] text-ink-muted mt-0.5">{m.goal}</p>}
                        <div className="mt-1.5 flex flex-col gap-1">
                          {m.steps.map((s, si) => {
                            const before = planSteps.slice(0, mi).reduce((acc, mm) => acc + mm.steps.length, 0);
                            const ex = execLog.find((e) => e.index === before + si + 1);
                            const st = ex?.status;
                            return (
                              <div key={si} className="flex items-start gap-1.5 text-[10px]">
                                {st === 'running' && <Loader2 className="w-3 h-3 mt-0.5 text-ink-muted animate-spin shrink-0" />}
                                {st === 'fixing' && <RefreshCw className="w-3 h-3 mt-0.5 text-amber-400 animate-spin shrink-0" />}
                                {st === 'failed' && <AlertCircle className="w-3 h-3 mt-0.5 text-rose-400 shrink-0" />}
                                {(!st || st === 'done') && <CheckCircle2 className={`w-3 h-3 mt-0.5 shrink-0 ${st === 'done' ? 'text-emerald-400' : 'text-ink-subtle'}`} />}
                                <div className="min-w-0">
                                  <p className={`${st === 'failed' ? 'text-rose-300' : st === 'done' ? 'text-ink-subtle' : 'text-ink'}`}>{s.action}</p>
                                  <p className="text-[9px] text-ink-muted">
                                    {s.target.length > 0 && <span className="font-mono text-ink/70">[{s.target.join(', ')}] </span>}
                                    {s.verify && <span className="text-emerald-400/50">✓ {s.verify}</span>}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {summary && (
                <div className="border-t border-line/80 px-3 py-3 max-h-44 overflow-y-auto scrollbar-thin bg-surface">
                  <div className="flex items-center gap-1.5 mb-2">
                    {runFailed ? <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    <span className={`text-[10px] font-semibold tracking-widest uppercase ${runFailed ? 'text-rose-300' : 'text-emerald-300'}`}>{runFailed ? 'Run stopped' : 'Complete'}</span>
                    {runFailed && diffs.length > 0 && (
                      <button onClick={() => rollbackRun()} className="ml-auto flex items-center gap-1 px-2 py-1 rounded-md bg-rose-500/15 text-[10px] text-rose-300 hover:bg-rose-500/25 transition-colors">
                        <Undo2 className="w-3 h-3" /> Roll back run
                      </button>
                    )}
                    <button onClick={() => speak(summary)} className={`${runFailed && diffs.length > 0 ? '' : 'ml-auto'} text-[10px] text-ink-muted hover:text-ink transition-colors`}>Read aloud</button>
                  </div>
                  <pre className="text-[10px] text-ink-subtle whitespace-pre-wrap break-words font-mono leading-relaxed">{summary}</pre>
                  {generatedFiles.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {generatedFiles.map((f) => (
                        <button key={f} onClick={() => openFile(f)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-elevated/80 border border-line/50 text-[10px] text-ink hover:bg-elevated transition-colors font-mono">
                          <FileCode className="w-3 h-3" /> {f}
                        </button>
                      ))}
                      {!previewOpen && generatedFiles.includes('index.html') && (
                        <button onClick={() => { setPreviewOpen(true); setPreviewKey((k) => k + 1); }} className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-300 hover:bg-emerald-500/25 transition-colors">
                          <Monitor className="w-3 h-3" /> Preview
                        </button>
                      )}
                    </div>
                  )}
                  {diffs.length > 0 && (
                    <div className="mt-3 border-t border-line/60 pt-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <button
                          onClick={() => setDiffSectionOpen((o) => !o)}
                          className="flex items-center gap-1.5 text-left"
                        >
                          <ChevronRight className={`w-3 h-3 text-ink-muted shrink-0 transition-transform ${diffSectionOpen ? 'rotate-90' : ''}`} />
                          <span className="text-[10px] font-semibold tracking-widest text-ink-subtle uppercase">
                            {diffs.length} {diffs.length === 1 ? 'file' : 'files'} changed
                          </span>
                          <span className="text-[10px] text-ink-muted ml-1">
                            <span className="text-emerald-400">+{diffs.reduce((a, d) => a + d.added, 0)}</span>
                            {' / '}
                            <span className="text-rose-400">−{diffs.reduce((a, d) => a + d.removed, 0)}</span>
                          </span>
                        </button>
                        <div className="flex items-center gap-2">
                          <button onClick={undoLast} title="Undo all changes back to the last checkpoint" className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] text-amber-300 hover:bg-amber-500/15 transition-colors">
                            <Undo2 className="w-3 h-3" /> Undo all
                          </button>
                          <div className="relative" ref={checkpointsRef}>
                            <button
                              onClick={() => {
                                if (currentWs) loadCheckpoints(currentWs);
                                setCheckpointsOpen((o) => !o);
                              }}
                              title="Checkpoints"
                              className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-elevated transition-colors"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                            {checkpointsOpen && (
                              <div className="absolute right-0 top-full mt-1 w-60 rounded-xl border border-line bg-surface shadow-2xl shadow-black/60 overflow-hidden z-50">
                                <div className="px-3 py-1.5 text-[9px] tracking-widest text-ink-muted uppercase font-semibold border-b border-line/60">Checkpoints</div>
                                <div className="max-h-52 overflow-y-auto scrollbar-thin">
                                  {checkpoints.length === 0 ? (
                                    <div className="px-3 py-2 text-[11px] text-ink-muted">No checkpoints yet</div>
                                  ) : (
                                    [...checkpoints].reverse().map((c) => (
                                      <button
                                        key={c.runId}
                                        onClick={() => restoreCheckpoint(c.runId, c.label)}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-elevated transition-colors"
                                      >
                                        <Undo2 className="w-3 h-3 text-amber-400 shrink-0" />
                                        <span className="text-[11px] text-ink flex-1 truncate">{c.label}</span>
                                        <span className="text-[9px] text-ink-muted shrink-0">{new Date(c.at).toLocaleTimeString()}</span>
                                      </button>
                                    ))
                                  )}
                                </div>
                                <button
                                  onClick={commitCheckpoints}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left border-t border-line/60 text-[11px] text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                                >
                                  <Check className="w-3 h-3 shrink-0" /> Set current state as baseline
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {diffSectionOpen && (
                        <div className="space-y-1">
                          {diffs.map((d) => (
                            <div key={d.path} className="rounded-lg border border-line/70 bg-surface overflow-hidden">
                              <div className="flex items-center gap-2 px-2.5 py-1.5">
                                <button onClick={() => setDiffOpen(diffOpen === d.path ? null : d.path)} className="flex items-center gap-1.5 flex-1 min-w-0 text-left">
                                  <ChevronRight className={`w-3 h-3 text-ink-muted shrink-0 transition-transform ${diffOpen === d.path ? 'rotate-90' : ''}`} />
                                  <FileCode className="w-3 h-3 text-ink-muted shrink-0" />
                                  <span className="text-[11px] text-ink font-mono truncate">{d.path}</span>
                                  <span className="text-[10px] text-emerald-400 shrink-0">+{d.added}</span>
                                  <span className="text-[10px] text-rose-400 shrink-0">−{d.removed}</span>
                                </button>
                                <button onClick={() => acceptDiff(d.path)} title="Accept changes" className="p-1 rounded-md text-emerald-400 hover:bg-emerald-500/15 transition-colors shrink-0">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => rejectDiff(d.path)} title="Revert changes" className="p-1 rounded-md text-rose-400 hover:bg-rose-500/15 transition-colors shrink-0">
                                  <Undo2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {diffOpen === d.path && (
                                <div className="px-2 pb-2 max-h-40 overflow-y-auto scrollbar-thin font-mono text-[10px] space-y-0">
                                  {d.hunks.map((h, hi) => (
                                    <div key={hi}>
                                      {h.oldLines.map((l, li) => (
                                        <div key={`o${li}`} className="bg-rose-500/10 text-rose-300/90 px-2 py-px whitespace-pre-wrap">- {(l || ' ')}</div>
                                      ))}
                                      {h.newLines.map((l, li) => (
                                        <div key={`n${li}`} className="bg-emerald-500/10 text-emerald-300/90 px-2 py-px whitespace-pre-wrap">+ {(l || ' ')}</div>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {/* ─── Direct chat input ─── */}
              <DirectChatInput onSend={sendChatMessage} busy={chatStreaming} onStop={() => { chatAbortRef.current?.abort(); setChatStreaming(false); setChatStreamText(''); }} />
            </div>
            {agentsOpen && <ResizeHandle dir="x" onResize={(d) => setAgentsW((w) => Math.min(560, Math.max(300, w - d)))} onDrag={setResizing} />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Apply diff preview modal ─── */}
      {applyPreview && (
        <div
          className="fixed inset-0 z-[125] flex items-center justify-center bg-scrim"
          onMouseDown={(e) => e.target === e.currentTarget && setApplyPreview(null)}
        >
          <div className="w-[640px] max-w-[96vw] max-h-[80vh] flex flex-col rounded-xl border border-line bg-surface shadow-2xl shadow-black/70 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-line/80 shrink-0">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-ink-muted" />
                <span className="text-xs font-medium text-ink font-mono">{applyPreview.path}</span>
              </div>
              <button onClick={() => setApplyPreview(null)} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-elevated transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin font-mono text-[10px] bg-canvas px-1 py-1">
              {computeLineDiff(applyPreview.oldCode, applyPreview.newCode).map((row, i) => (
                <div
                  key={i}
                  className={`px-3 py-px whitespace-pre-wrap break-all leading-relaxed ${
                    row.op === '+' ? 'bg-emerald-500/10 text-emerald-300' :
                    row.op === '-' ? 'bg-rose-500/10 text-rose-300' :
                    'text-ink-muted'
                  }`}
                >
                  {row.op === '+' ? '+' : row.op === '-' ? '−' : ' '} {row.line}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-line/80 shrink-0">
              <span className="text-[10px] text-ink-muted">
                {computeLineDiff(applyPreview.oldCode, applyPreview.newCode).filter((r) => r.op === '+').length} additions,&nbsp;
                {computeLineDiff(applyPreview.oldCode, applyPreview.newCode).filter((r) => r.op === '-').length} deletions
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setApplyPreview(null)}
                  className="px-3 py-1.5 rounded-lg bg-elevated border border-line text-[11px] text-ink hover:bg-elevated transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const { path, newCode } = applyPreview;
                    setApplyPreview(null);
                    try {
                      await ideApi.writeFile(currentWs, path, newCode);
                      await refetchFile(path);
                      showToast(`Applied to ${path}`);
                    } catch (err: any) {
                      showToast(`Apply failed: ${err.message}`);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent text-[11px] text-accent-fg font-medium transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> Apply changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Rename symbol modal ─── */}
      {rename.open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-surface" onMouseDown={(e) => e.target === e.currentTarget && setRename((r) => ({ ...r, open: false }))}>
          <div className="w-[380px] rounded-xl border border-line bg-surface shadow-2xl shadow-black/60 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-line/80">
              <span className="text-xs font-medium text-ink">Rename symbol</span>
              <button onClick={() => setRename((r) => ({ ...r, open: false }))} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-elevated transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-[10px] text-ink-muted">
                Rename <span className="font-mono text-ink">{rename.name}</span> in <span className="font-mono text-ink-subtle">{rename.file}</span>
                <br />A checkpoint is created so you can undo it.
              </div>
              <input
                value={rename.newName}
                onChange={(e) => setRename((r) => ({ ...r, newName: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void doRename();
                  if (e.key === 'Escape') setRename((r) => ({ ...r, open: false }));
                }}
                autoFocus
                spellCheck={false}
                placeholder="New name"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs font-mono text-ink outline-none focus:border-line-strong/60 placeholder:text-ink-muted"
              />
              {rename.error && <div className="text-[10px] text-rose-400 break-words">{rename.error}</div>}
              <button
                onClick={() => void doRename()}
                disabled={rename.busy || !rename.newName.trim() || rename.newName.trim() === rename.name}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent hover:bg-accent text-[11px] text-accent-fg transition-colors disabled:opacity-40"
              >
                {rename.busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Find usages panel ─── */}
      {refsPanel.open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-surface" onMouseDown={(e) => e.target === e.currentTarget && setRefsPanel((r) => ({ ...r, open: false }))}>
          <div className="w-[440px] max-h-[60vh] rounded-xl border border-line bg-surface shadow-2xl shadow-black/60 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-line/80 shrink-0">
              <span className="text-xs font-medium text-ink flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-ink-muted" />
                Usages of <span className="font-mono text-ink">{refsPanel.symbol}</span>
              </span>
              <button onClick={() => setRefsPanel((r) => ({ ...r, open: false }))} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-elevated transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="px-4 py-2 border-b border-line/50 text-[10px] text-ink-muted shrink-0 truncate">
              <span className="font-mono text-ink-subtle">{refsPanel.file}</span>
              {refsPanel.refs.length > 0 && <span className="ml-2 text-ink-muted">· {refsPanel.refs.length} occurrence{refsPanel.refs.length === 1 ? '' : 's'}</span>}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
              {refsPanel.busy ? (
                <div className="flex items-center justify-center gap-2 py-10 text-[11px] text-ink-muted">
                  <Loader2 className="w-4 h-4 animate-spin text-ink-muted" /> Resolving references…
                </div>
              ) : refsPanel.error ? (
                <div className="px-4 py-6 text-[11px] text-rose-400 break-words">{refsPanel.error}</div>
              ) : refsPanel.refs.length === 0 ? (
                <div className="px-4 py-6 text-[11px] text-ink-muted">No references found.</div>
              ) : (
                refsPanel.refs.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setRefsPanel((p) => ({ ...p, open: false }));
                      openFile(refsPanel.file, false, r.line);
                    }}
                    className="w-full text-left px-4 py-2 border-b border-line/40 hover:bg-elevated/40 transition-colors flex gap-3"
                  >
                    <span className="shrink-0 text-[10px] font-mono text-ink-muted tabular-nums mt-0.5 w-8 text-right">
                      {r.line}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={`block text-[11px] font-mono ${r.isDeclaration ? 'text-ink' : 'text-ink'} truncate`}>{r.text}</span>
                      {r.isDeclaration && <span className="text-[9px] text-ink-muted/80 uppercase tracking-widest">declaration</span>}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Tools Drawer (right) ─── */}
      <AnimatePresence>
        {inIde && drawerOpen && (
          <motion.div
            initial={{ x: 340, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 340, opacity: 0 }}
            transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
            className="absolute top-12 bottom-0 right-0 w-[320px] border-l border-line/80 bg-surface flex flex-col z-30 shadow-2xl shadow-black/50"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-line/80 shrink-0">
              <span className="text-[10px] font-semibold tracking-widest text-ink-muted uppercase">Tools</span>
              <button onClick={() => setDrawerOpen(false)} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-elevated transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex gap-1 px-3 pt-2 overflow-x-auto scrollbar-none shrink-0">
              {Object.entries(TABS_META).map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => {
                    setDrawerTab(key as keyof typeof TABS_META);
                    if (key === 'secrets') loadEnvVars();
                    if (key === 'history' && currentWs) loadCheckpoints(currentWs);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] whitespace-nowrap transition-colors ${drawerTab === key ? 'bg-accent/15 text-ink' : 'text-ink-muted hover:text-ink hover:bg-elevated/70'}`}
                >
                  <meta.icon className="w-3 h-3" /> {meta.label}
                </button>
              ))}
            </div>
            <div className="px-4 py-2 text-[10px] text-ink-muted shrink-0">{TABS_META[drawerTab].hint}</div>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 scrollbar-thin">
              {drawerTab === 'notes' && (
                <div className="space-y-2">
                  <textarea
                    value={scratchpad}
                    onChange={(e) => setScratchpad(e.target.value)}
                    placeholder={"Jot down constraints, TODOs, open questions…\nAgents will read this as context on every run."}
                    spellCheck={false}
                    className="w-full h-72 bg-surface border border-line rounded-lg px-3 py-2.5 text-[11px] text-ink font-mono leading-relaxed resize-none outline-none focus:border-line-strong/40 placeholder:text-ink-muted scrollbar-thin"
                  />
                  {scratchpad.trim() && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent/8 border border-line-strong/20">
                      <Sparkles className="w-3 h-3 text-ink-muted shrink-0" />
                      <span className="text-[10px] text-ink">Injected into agent context on next run</span>
                    </div>
                  )}
                  {scratchpad.trim() && (
                    <button
                      onClick={() => setScratchpad('')}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] text-ink-muted hover:text-ink hover:bg-elevated transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Clear scratchpad
                    </button>
                  )}
                </div>
              )}
              {drawerTab === 'history' && (
                <div className="space-y-1">
                  {/* Current state — always at top */}
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center shrink-0 mt-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30" />
                      {checkpoints.length > 0 && <div className="w-px flex-1 bg-elevated/60 mt-1" style={{ minHeight: 20 }} />}
                    </div>
                    <div className="flex-1 pb-3">
                      <p className="text-[11px] font-semibold text-emerald-300">Current state</p>
                      <p className="text-[10px] text-ink-muted mt-0.5">Now</p>
                      <div className="flex gap-1.5 mt-1.5">
                        <button
                          onClick={commitCheckpoints}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-elevated/80 hover:bg-elevated text-[10px] text-emerald-300 transition-colors"
                        >
                          <Check className="w-2.5 h-2.5" /> Set as baseline
                        </button>
                      </div>
                    </div>
                  </div>

                  {checkpoints.length === 0 ? (
                    <div className="pl-5 text-[11px] text-ink-muted py-3">
                      No checkpoints yet — run an agent to create step history automatically.
                    </div>
                  ) : (
                    [...checkpoints].reverse().map((c, idx, arr) => {
                      const isLast = idx === arr.length - 1;
                      const relTime = (() => {
                        const diff = Date.now() - c.at;
                        if (diff < 60000) return `${Math.round(diff / 1000)}s ago`;
                        if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
                        return new Date(c.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      })();
                      const isAgent = c.label.startsWith('Agent run') || c.label.startsWith('r_');
                      const isBaseline = c.label === 'Baseline';
                      const dotColor = isBaseline ? 'bg-accent ring-line-strong/30' : isAgent ? 'bg-amber-400 ring-amber-400/30' : 'bg-accent ring-line-strong/30';
                      return (
                        <div key={c.runId} className="flex items-start gap-3">
                          <div className="flex flex-col items-center shrink-0 mt-1">
                            <div className={`w-2.5 h-2.5 rounded-full ring-2 ${dotColor}`} />
                            {!isLast && <div className="w-px flex-1 bg-elevated/60 mt-1" style={{ minHeight: 20 }} />}
                          </div>
                          <div className="flex-1 pb-3">
                            <div className="flex items-center gap-2">
                              <p className="text-[11px] font-medium text-ink truncate flex-1">{c.label}</p>
                              <span className="text-[9px] text-ink-muted shrink-0">{relTime}</span>
                            </div>
                            <p className="text-[10px] text-ink-muted mt-0.5 font-mono">{new Date(c.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                            <button
                              onClick={() => restoreCheckpoint(c.runId, c.label)}
                              className="mt-1.5 flex items-center gap-1 px-2 py-1 rounded-md bg-elevated/80 hover:bg-amber-500/15 text-[10px] text-amber-300 hover:text-amber-200 transition-colors"
                            >
                              <Undo2 className="w-2.5 h-2.5" /> Restore
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
              {drawerTab === 'graph' && (
                <GraphView
                  workspace={currentWs || '__project__'}
                  projectMode={projectMode}
                  onOpenFile={(file, line) => openFile(file, projectMode || readOnly, line)}
                />
              )}
              {drawerTab === 'packages' && (
                <PackagePanel workspace={currentWs} onToast={showToast} />
              )}
              {drawerTab === 'collab' && (
                <CollabInvitePanel workspace={currentWs} peers={collabPeers} onToast={showToast} />
              )}
              {drawerTab === 'database' && (
                <DatabasePanel workspace={currentWs} onToast={showToast} />
              )}
              {drawerTab === 'apitest' && (
                <ApiTestPanel workspace={currentWs} onToast={showToast} />
              )}
              {drawerTab === 'plugins' && (
                <PluginsPanel workspace={currentWs} onToast={showToast} />
              )}
              {drawerTab === 'profiler' && (
                <ProfilerPanel workspace={currentWs} onToast={showToast} />
              )}
              {drawerTab === 'rea' && (
                <ReaPanel workspace={currentWs} onToast={showToast} />
              )}
              {drawerTab === 'context' && (
                <ContextPanel task={task} workspace={currentWs || '__project__'} />
              )}
              {drawerTab === 'memory' && (
                <div className="flex flex-col gap-2 h-full">
                  <textarea
                    value={memory.markdown}
                    onChange={(e) => setMemory((prev) => ({ ...prev, markdown: e.target.value }))}
                    placeholder="# Project memory&#10;&#10;Architecture, conventions, decisions, preferences..."
                    className="flex-1 min-h-0 rounded-lg border border-line bg-surface p-3 text-xs font-mono text-ink focus:border-line-strong/60 outline-none resize-none placeholder:text-ink-muted"
                  />
                  <button onClick={saveMemory} disabled={readOnly} className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent hover:bg-accent text-xs text-accent-fg transition-colors disabled:opacity-40">
                    <Save className="w-3.5 h-3.5" /> Save memory
                  </button>
                </div>
              )}
              {drawerTab === 'rules' && (
                <div className="flex flex-col gap-2.5 h-full">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={startNewRule}
                      className={`flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg text-[11px] transition-colors ${csRuleEditing !== null ? 'bg-elevated text-ink hover:opacity-90' : 'bg-accent text-accent-fg hover:bg-accent'}`}
                    >
                      <Plus className="w-3.5 h-3.5" /> New rule
                    </button>
                    {csRuleEditing !== null && (
                      <button onClick={() => setCsRuleEditing(null)} className="p-2 rounded-lg text-[10px] text-ink-muted hover:text-ink hover:bg-elevated transition-colors">
                        Cancel
                      </button>
                    )}
                  </div>
                  {csRuleEditing !== null && (
                    <div className="rounded-lg border border-line-strong/30 bg-surface p-3 space-y-2">
                      <input
                        value={csRuleDraft.name}
                        onChange={(e) => setCsRuleDraft((d) => ({ ...d, name: e.target.value }))}
                        placeholder="Rule name (e.g. api-handlers or subfolder/name)"
                        disabled={csRuleEditing !== ''}
                        className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11px] font-mono text-ink outline-none focus:border-line-strong/60 placeholder:text-ink-muted disabled:opacity-50"
                      />
                      <div className="flex gap-2">
                        <input
                          value={csRuleDraft.glob}
                          onChange={(e) => setCsRuleDraft((d) => ({ ...d, glob: e.target.value }))}
                          placeholder="Glob e.g. src/**/*.ts"
                          className="flex-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11px] font-mono text-ink outline-none focus:border-line-strong/60 placeholder:text-ink-muted"
                        />
                        <select
                          value={csRuleDraft.apply}
                          onChange={(e) => setCsRuleDraft((d) => ({ ...d, apply: e.target.value as 'always' | 'auto' }))}
                          className="rounded-md border border-line bg-surface px-2 py-1.5 text-[11px] text-ink outline-none focus:border-line-strong/60"
                        >
                          <option value="always">always</option>
                          <option value="auto">auto</option>
                        </select>
                      </div>
                      <input
                        value={csRuleDraft.description}
                        onChange={(e) => setCsRuleDraft((d) => ({ ...d, description: e.target.value }))}
                        placeholder="Short description (optional)"
                        className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11px] text-ink outline-none focus:border-line-strong/60 placeholder:text-ink-muted"
                      />
                      <textarea
                        value={csRuleDraft.content}
                        onChange={(e) => setCsRuleDraft((d) => ({ ...d, content: e.target.value }))}
                        placeholder={'Markdown instructions…\ne.g.\n- Never delete .env or package.json\n- Use early returns\n- Run `npm run lint` before declaring done'}
                        className="w-full min-h-[120px] rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11px] font-mono text-ink focus:border-line-strong/60 outline-none resize-y placeholder:text-ink-muted"
                      />
                      <button
                        onClick={() => void saveCsRule()}
                        disabled={csRulesBusy || !csRuleDraft.content.trim()}
                        className="w-full py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-[11px] text-ink transition-colors disabled:opacity-40"
                      >
                        {csRulesBusy ? 'Saving…' : 'Save rule'}
                      </button>
                    </div>
                  )}
                  {csRulesError && (
                    <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[10px] text-rose-300 break-words">{csRulesError}</div>
                  )}
                  <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin space-y-2 pr-0.5">
                    {csRules.length === 0 && (
                      <div className="text-[10px] text-ink-muted leading-relaxed pt-1">
                        No rules yet. Rules live in <code className="text-ink-subtle">.codestrom/rules/*.md</code> (glob-scoped) or{' '}
                        <code className="text-ink-subtle">global_rules.md</code> (workspace-wide). They are injected into every agent run,
                        composer edit and inline completion — like <code className="text-ink-subtle">.cursor/rules</code>.
                      </div>
                    )}
                    {csRules.map((r) => (
                      <div key={r.name} className="rounded-lg border border-line bg-surface overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2">
                          <FileCode className={`w-3.5 h-3.5 shrink-0 ${r.level === 'global' ? 'text-amber-400' : 'text-ink-muted'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] text-ink font-medium truncate">
                              {r.name} <span className="text-ink-muted font-normal">({r.level}{r.glob ? ` · ${r.glob}` : ''})</span>
                            </div>
                            <div className="text-[9px] text-ink-muted font-mono truncate">{r.path}</div>
                          </div>
                          <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded ${r.apply === 'auto' ? 'bg-elevated/60 text-ink' : 'bg-accent/15 text-ink'}`}>{r.apply}</span>
                          <button onClick={() => editRule(r)} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-elevated transition-colors" title="Edit">
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button onClick={() => void removeCsRule(r.name)} className="p-1 rounded-md text-ink-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="Delete">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="border-t border-line/60 px-3 py-2 text-[10px] text-ink-subtle leading-relaxed whitespace-pre-wrap line-clamp-4">{r.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {drawerTab === 'skills' && currentWs && <SkillsPanel workspace={currentWs} readOnly={readOnly} />}
              {drawerTab === 'workflows' && currentWs && <WorkflowsPanel workspace={currentWs} readOnly={readOnly} />}
              {drawerTab === 'status' && (
                <div className="space-y-2.5">
                  {[
                    { label: 'Backend', value: 'online', ok: true },
                    { label: 'Active model', value: resolvedModel ? `${resolvedModel.name} (${resolvedModel.provider})` : 'none', ok: !!resolvedModel },
                    { label: 'Workspace', value: projectMode ? 'project root' : currentWs || '—', ok: true },
                    { label: 'Mode', value: readOnly ? 'read-only' : 'sandboxed', ok: !readOnly },
                    { label: 'Files in workspace', value: String(workspaces.find((w) => w.name === currentWs)?.fileCount ?? (projectMode ? tree.length : 0)), ok: true },
                    { label: 'Git', value: git ? (git.isRepo ? `repo · ${git.branch}` : 'not initialized') : '—', ok: !!git?.isRepo },
                    { label: 'Tokens (24 h)', value: sessionTokens > 0 ? `${sessionTokens.toLocaleString()} total` : '—', ok: true },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2.5">
                      <span className="text-[11px] text-ink-muted">{s.label}</span>
                      <span className={`flex items-center gap-1.5 text-[11px] ${s.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.ok ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <span className="max-w-[140px] truncate">{s.value}</span>
                      </span>
                    </div>
                  ))}
                  {capabilities?.stacks && (
                    <div className="mt-3 pt-3 border-t border-line/80">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold tracking-widest text-ink-muted uppercase">Stack Support</span>
                        <span className="text-[10px] text-ink-muted">{capabilities.stacks.filter((s: any) => s.supported).length}/{capabilities.stacks.length}</span>
                      </div>
                      <div className="space-y-1.5">
                        {capabilities.stacks.map((s: any) => (
                          <div key={s.stack} className="flex items-center justify-between rounded border border-line/60 bg-surface px-2.5 py-2">
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${s.supported ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                              <span className="text-[10px] text-ink">{s.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {s.supported && s.toolchain?.version && (
                                <span className="text-[9px] text-ink-muted font-mono">{s.toolchain.version}</span>
                              )}
                              {!s.supported && s.reason && (
                                <span className="text-[9px] text-amber-400 truncate max-w-[100px]" title={s.reason}>{s.reason}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {drawerTab === 'secrets' && (
                <div className="flex flex-col gap-2 h-full">
                  <div className="flex items-center justify-between shrink-0">
                    <span className="text-[10px] text-ink-muted">Stored in <span className="font-mono text-amber-300">.env</span> · auto-gitignored · injected into every run</span>
                    <button onClick={loadEnvVars} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-elevated transition-colors" title="Reload .env from disk">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 scrollbar-thin">
                    {envVars.map((v, i) => (
                      <div key={i} className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5">
                        <input
                          value={v.key}
                          onChange={(e) => setEnvVars((prev) => prev.map((x, j) => j === i ? { ...x, key: e.target.value } : x))}
                          placeholder="KEY"
                          className="w-28 shrink-0 bg-transparent text-[11px] font-mono text-amber-200 placeholder:text-ink-subtle outline-none border-r border-line pr-2"
                          spellCheck={false}
                        />
                        <div className="flex-1 flex items-center gap-1 min-w-0">
                          <input
                            type={envMasked[i] ? 'password' : 'text'}
                            value={v.value}
                            onChange={(e) => setEnvVars((prev) => prev.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                            placeholder="value"
                            className="flex-1 bg-transparent text-[11px] font-mono text-ink placeholder:text-ink-subtle outline-none min-w-0"
                            spellCheck={false}
                          />
                          <button onClick={() => setEnvMasked((m) => ({ ...m, [i]: !m[i] }))} className="p-0.5 text-ink-muted hover:text-ink transition-colors shrink-0">
                            {envMasked[i] ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          </button>
                        </div>
                        <button onClick={() => { setEnvVars((prev) => prev.filter((_, j) => j !== i)); setEnvMasked((m) => { const n = { ...m }; delete n[i]; return n; }); }} className="p-1 rounded-md text-ink-muted hover:text-rose-400 transition-colors shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {envVars.length === 0 && (
                      <div className="text-center py-6 text-ink-muted text-[11px]">
                        No secrets yet. Click + to add a variable.
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 pt-1 border-t border-line/60">
                    <button
                      onClick={() => { setEnvVars((prev) => [...prev, { key: '', value: '' }]); setEnvMasked((m) => ({ ...m, [envVars.length]: false })); }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-ink hover:bg-elevated border border-line transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add variable
                    </button>
                    <button
                      onClick={() => saveEnvVarsHandler(envVars)}
                      disabled={envBusy}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-amber-600 hover:bg-amber-500 text-ink font-medium transition-colors disabled:opacity-40 ml-auto"
                    >
                      {envBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Save .env
                    </button>
                  </div>
                </div>
              )}
              {drawerTab === 'security' && (
                <div className="space-y-2.5">
                  {[
                    'Agent file writes are confined to sandboxed workspaces',
                    'Path traversal (../) is blocked on every read/write',
                    'Dangerous commands (rm -rf /, format, shutdown…) are rejected',
                    'Commands time out after 120s with output capped at 200KB',
                    'File reads are capped at 512KB',
                    'Git clone URLs must be http(s), ssh or git protocol',
                  ].map((r) => (
                    <div key={r} className="flex items-start gap-2 rounded-lg border border-line bg-surface px-3 py-2.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <span className="text-[11px] text-ink-subtle leading-relaxed">{r}</span>
                    </div>
                  ))}
                </div>
              )}
              {drawerTab === 'calc' && <CalculatorPad />}
              {drawerTab === 'mcp' && (
                <div className="flex flex-col gap-2.5 h-full">
                  <button
                    onClick={() => { setMcpAddOpen((o) => !o); setMcpError(null); }}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent hover:bg-accent text-[11px] text-accent-fg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add MCP server
                  </button>
                  {mcpAddOpen && (
                    <div className="rounded-lg border border-line-strong/30 bg-surface p-3 space-y-2">
                      <input
                        value={mcpForm.name}
                        onChange={(e) => setMcpForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Server name (e.g. my-server)"
                        className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11px] text-ink outline-none focus:border-line-strong/60 placeholder:text-ink-muted"
                      />
                      <input
                        value={mcpForm.url}
                        onChange={(e) => setMcpForm((f) => ({ ...f, url: e.target.value }))}
                        placeholder="URL (http://localhost:4010)"
                        className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11px] font-mono text-ink outline-none focus:border-line-strong/60 placeholder:text-ink-muted"
                      />
                      <input
                        value={mcpForm.headers}
                        onChange={(e) => setMcpForm((f) => ({ ...f, headers: e.target.value }))}
                        placeholder='Headers JSON (optional) e.g. {"Authorization":"Bearer …"}'
                        className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11px] font-mono text-ink outline-none focus:border-line-strong/60 placeholder:text-ink-muted"
                      />
                      <button onClick={addMcpServer} className="w-full py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-[11px] text-ink transition-colors">
                        Save server
                      </button>
                    </div>
                  )}
                  {mcpError && (
                    <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[10px] text-rose-300 break-words">{mcpError}</div>
                  )}
                  <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin space-y-2 pr-0.5">
                    {mcpServers.length === 0 && (
                      <div className="text-[10px] text-ink-muted leading-relaxed pt-1">
                        No MCP servers connected yet. MCP servers expose extra tools that the quick agent and auto-fix loop can call.
                        <br /><br />
                        Try the built-in demo: <code className="text-ink-subtle">backend/mcp-demo-server.js</code> on port 4010.
                      </div>
                    )}
                    {mcpServers.map((s) => (
                      <div key={s.id} className="rounded-lg border border-line bg-surface overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2">
                          <Plug className={`w-3.5 h-3.5 shrink-0 ${mcpStatus[s.id] === 'ok' ? 'text-emerald-400' : mcpStatus[s.id] === 'error' ? 'text-rose-400' : 'text-ink-muted'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] text-ink font-medium truncate">{s.name}</div>
                            <div className="text-[9px] text-ink-muted font-mono truncate">{s.url}</div>
                          </div>
                          <button
                            onClick={() => void testMcpServer(s.id)}
                            disabled={mcpStatus[s.id] === 'testing'}
                            title="Test connection & list tools"
                            className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-elevated transition-colors disabled:opacity-40"
                          >
                            {mcpStatus[s.id] === 'testing' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          </button>
                          <button onClick={() => void removeMcpServer(s.id)} title="Remove server" className="p-1 rounded-md text-ink-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        {(mcpTools[s.id] || []).length > 0 && (
                          <div className="border-t border-line/60 px-3 py-1.5 space-y-1">
                            {(mcpTools[s.id] || []).map((t) => (
                              <div key={t.name} className="flex items-start gap-1.5">
                                <span className="text-[9px] text-ink font-mono shrink-0">{t.name}</span>
                                <span className="text-[9px] text-ink-muted truncate" title={t.description}>{t.description}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {drawerTab === 'settings' && (
                <div className="space-y-2.5">
                  <div className="rounded-lg border border-line bg-surface px-3 py-3">
                    <p className="text-[10px] font-semibold tracking-widest text-ink-muted uppercase mb-2">Actions</p>
                    <div className="space-y-1.5">
                      <button onClick={importFile} disabled={readOnly} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-elevated/70 hover:bg-elevated text-[11px] text-ink transition-colors disabled:opacity-40">
                        <Upload className="w-3.5 h-3.5" /> Import file into workspace
                      </button>
                      <button onClick={openLocalFolder} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-elevated/70 hover:bg-elevated text-[11px] text-ink-muted transition-colors">
                        <FolderOpen className="w-3.5 h-3.5" /> Open Local Folder…
                      </button>
                      <button onClick={() => { setPreviewOpen(true); setPreviewKey((k) => k + 1); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-elevated/70 hover:bg-elevated text-[11px] text-ink transition-colors">
                        <Monitor className="w-3.5 h-3.5" /> Open live preview
                      </button>
                      {currentWs && !projectMode && (
                        <a
                          href={ideApi.exportZipUrl(currentWs)}
                          download={`${currentWs}.zip`}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-elevated/70 hover:bg-elevated text-[11px] text-emerald-300 transition-colors"
                        >
                          <Save className="w-3.5 h-3.5" /> Export workspace as .zip
                        </a>
                      )}
                      <button onClick={goWelcome} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-elevated/70 hover:bg-elevated text-[11px] text-ink transition-colors">
                        <LayoutGrid className="w-3.5 h-3.5" /> Back to project picker
                      </button>
                      <button onClick={() => setTerminalOpen(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-elevated/70 hover:bg-elevated text-[11px] text-ink transition-colors">
                        <TerminalIcon className="w-3.5 h-3.5" /> Open terminal
                      </button>
                    </div>
                  </div>
                  <div className="rounded-lg border border-line bg-surface px-3 py-3">
                    <p className="text-[10px] font-semibold tracking-widest text-ink-muted uppercase mb-2">Completions Model</p>
                    <p className="text-[10px] text-ink-muted mb-2 leading-relaxed">Pick a fast local model for Tab completions (FIM). Leave blank to use the active agent model.</p>
                    <div className="flex gap-1.5">
                      <input
                        value={completionsModelId}
                        onChange={(e) => setCompletionsModelId(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') void saveCompletionsModel(completionsModelId); }}
                        placeholder="model_id (e.g. qwen2.5-coder-3b) or blank"
                        className="flex-1 min-w-0 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] text-ink placeholder:text-ink-muted focus:border-line-strong/60 outline-none"
                      />
                      <button
                        onClick={() => void saveCompletionsModel(completionsModelId)}
                        disabled={completionsModelBusy}
                        className="px-3 py-1.5 rounded-lg bg-accent hover:bg-accent text-[10px] text-accent-fg font-medium transition-colors disabled:opacity-40"
                      >
                        {completionsModelBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                      </button>
                    </div>
                    {completionsModelId && (
                      <button onClick={() => void saveCompletionsModel('')} className="mt-1.5 text-[10px] text-ink-muted hover:text-ink-subtle transition-colors">Clear (use active model)</button>
                    )}
                  </div>
                  {/* ─── Editor preferences ─── */}
                  <div className="rounded-lg border border-line bg-surface px-3 py-3 space-y-2">
                    <p className="text-[10px] font-semibold tracking-widest text-ink-muted uppercase mb-1">Editor</p>
                    {([
                      { label: 'Format on save', sublabel: 'Run Prettier / Black / gofmt on Ctrl+S', state: formatOnSave, set: setFormatOnSave },
                      { label: 'TypeScript inlay hints', sublabel: 'Show parameter names & return types inline', state: inlayHints, set: setInlayHints },
                      { label: 'Vim keybindings', sublabel: 'Enable Vim normal/insert/visual mode', state: vimMode, set: setVimMode },
                    ] as const).map(({ label, sublabel, state, set }) => (
                      <div key={label} className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] text-ink">{label}</p>
                          <p className="text-[10px] text-ink-muted">{sublabel}</p>
                        </div>
                        <button
                          onClick={() => (set as (v: boolean) => void)(!state)}
                          className={`relative w-8 h-4.5 rounded-full transition-colors shrink-0 ${state ? 'bg-accent' : 'bg-elevated'}`}
                          style={{ minWidth: 32, height: 18 }}
                        >
                          <span
                            className="absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-surface transition-transform"
                            style={{ transform: state ? 'translateX(14px)' : 'translateX(0)' }}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-line bg-surface px-3 py-3">
                    <p className="text-[10px] font-semibold tracking-widest text-ink-muted uppercase mb-2">Shortcuts</p>
                    <div className="space-y-1.5 text-[11px] text-ink-muted">
                      <div className="flex justify-between"><span>Save file</span><kbd className="text-ink-subtle">Ctrl S</kbd></div>
                      <div className="flex justify-between"><span>Submit task</span><kbd className="text-ink-subtle">Enter</kbd></div>
                      <div className="flex justify-between"><span>New line in task</span><kbd className="text-ink-subtle">Shift Enter</kbd></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Bottom: Terminal + Composer ─── */}
      <AnimatePresence>
        {inIde && terminalOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: terminalH, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
            className="shrink-0 border-t border-line/80 bg-surface flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-1.5 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold tracking-widest text-ink-muted uppercase">Terminal</span>
                {termPreviewUrl && (
                  <button
                    onClick={() => {
                      setPreviewOpen(true);
                      setPreviewKey((k) => k + 1);
                    }}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[9px] text-emerald-300 hover:bg-emerald-500/20 transition-colors font-mono"
                    title="Dev server detected — open preview"
                  >
                    <Globe className="w-3 h-3" />
                    {termPreviewUrl.replace(/^https?:\/\//, '')}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                <button onClick={() => setTermLines([])} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-elevated transition-colors" title="Clear">
                  <Trash2 className="w-3 h-3" />
                </button>
                <button onClick={() => setTerminalOpen(false)} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-elevated transition-colors" title="Close">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
            <ResizeHandle dir="y" onResize={(d) => setTerminalH((h) => Math.min(480, Math.max(120, h - d)))} onDrag={setResizing} />
            <div ref={termScrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-2 font-mono text-[11px] scrollbar-thin selection:bg-emerald-400/20">
              {termLines.map((l, i) => {
                const clean = stripAnsi(l.text) || '\u00A0';
                if (l.kind === 'cmd') {
                  return <div key={i} className="text-emerald-300 break-all"><span className="text-ink-muted">$</span> {clean}</div>;
                }
                if (l.kind === 'url') {
                  const portMatch = l.text.match(/:(\d{2,5})\/?$/);
                  const detectedPort = portMatch ? parseInt(portMatch[1], 10) : null;
                  const isSharedPort = termSharePort === detectedPort;
                  const shareUrl = isSharedPort ? termShareUrl : null;
                  const sharePending = isSharedPort ? termSharePending : false;
                  return (
                    <div key={i} className="my-1 flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => { setPreviewOpen(true); setPreviewKey((k) => k + 1); }}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-300 hover:bg-emerald-500/20 transition-colors font-mono"
                        title="Open in preview pane"
                      >
                        <Globe className="w-3 h-3 shrink-0" />
                        <span>{l.text.replace(/^https?:\/\//, '')}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60" />
                      </button>
                      {/* Share button — tunnels the local port to a public URL */}
                      {detectedPort && !shareUrl && (
                        <button
                          onClick={() => shareTerminalPort(detectedPort)}
                          disabled={sharePending}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-accent/10 border border-line-strong/30 text-[10px] text-ink-muted hover:bg-accent/20 disabled:opacity-50 transition-colors font-mono"
                          title="Create a public share URL via SSH tunnel"
                        >
                          {sharePending ? <Loader2 className="w-3 h-3 animate-spin shrink-0" /> : <Link2 className="w-3 h-3 shrink-0" />}
                          {sharePending ? 'Sharing…' : 'Share'}
                        </button>
                      )}
                      {shareUrl && (
                        <button
                          onClick={async () => { await navigator.clipboard.writeText(shareUrl).catch(() => {}); showToast('Share URL copied!'); }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-accent/15 border border-line-strong/40 text-[10px] text-ink-muted hover:bg-accent/25 transition-colors font-mono max-w-[200px]"
                          title={shareUrl}
                        >
                          <Link2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">{shareUrl.replace(/^https?:\/\//, '')}</span>
                          <Copy className="w-2.5 h-2.5 shrink-0 opacity-60" />
                        </button>
                      )}
                    </div>
                  );
                }
                // err + out: parse stack-trace file references into clickable links
                const segs = parseStackLine(clean);
                const hasLinks = segs.some((s) => s.t === 'link');
                const lineClass = l.kind === 'err' ? 'text-rose-300' : 'text-ink';
                if (hasLinks) {
                  return (
                    <div key={i} className={`${lineClass} break-all whitespace-pre-wrap`}>
                      {segs.map((seg, si) =>
                        seg.t === 'link' ? (
                          <button
                            key={si}
                            onClick={() => openFile(seg.file, false, seg.line)}
                            className="text-ink-muted underline underline-offset-2 hover:text-ink-muted transition-colors font-mono"
                            title={`Open ${seg.file}:${seg.line}`}
                          >{seg.s}</button>
                        ) : (
                          <span key={si}>{seg.s}</span>
                        )
                      )}
                    </div>
                  );
                }
                return <div key={i} className={`${lineClass} break-all whitespace-pre-wrap`}>{clean}</div>;
              })}
              {termRunning && (
                <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse" style={{ animationDuration: '1.05s' }} />
              )}
              {!termLines.length && (
                <div className="text-ink-muted py-3">Runs inside the sandboxed workspace. Try: <span className="text-ink-muted">npm install</span> · <span className="text-ink-muted">npm run build</span> · <span className="text-ink-muted">npm run dev</span> (long-running — kill with <span className="text-rose-400">■</span>)</div>
              )}
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 border-t ${termRunning ? 'border-rose-500/40' : 'border-line/80'} shrink-0`}>
              <span className={`font-mono text-sm transition-colors ${termRunning ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>$</span>
              <input
                value={termInput}
                onChange={(e) => setTermInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runTerminal()}
                placeholder={readOnly ? 'Terminal unavailable in read-only mode' : termRunning ? 'running…' : 'type a command'}
                disabled={readOnly || termRunning}
                className="flex-1 bg-transparent text-xs font-mono text-ink outline-none placeholder:text-ink-muted disabled:opacity-50 caret-emerald-400"
                spellCheck={false}
                autoComplete="off"
              />
              {termRunning && (
                <span className="terminal-cursor text-emerald-400 text-xl select-none">▎</span>
              )}
              {termRunning ? (
                <button onClick={killTerminal} disabled={readOnly} className="p-1.5 rounded-md text-rose-400 hover:text-rose-200 hover:bg-rose-500/15 transition-colors" title="Kill process (Ctrl+C)">
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              ) : (
                <button onClick={runTerminal} disabled={readOnly} className="p-1.5 rounded-md text-ink-subtle hover:text-ink hover:bg-elevated transition-colors" title="Run (Enter)">
                  <Play className="w-3.5 h-3.5" />
                </button>
              )}
              {fixBusy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : !termRunning && lastTermCmd && lastTermExit !== null && lastTermExit !== 0 && (
                <button
                  onClick={fixErrors}
                  disabled={readOnly}
                  className="p-1.5 rounded-md text-amber-400 hover:text-amber-200 hover:bg-amber-500/15 transition-colors"
                  title={`Auto-fix errors in "${lastTermCmd}" (up to 3 rounds)`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Build Panel ─── */}
      <AnimatePresence>
        {inIde && buildPanelOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: terminalH, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
            className="shrink-0 border-t border-line/80 bg-surface flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-1.5 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold tracking-widest text-ink-muted uppercase">Build Pipeline</span>
                {activeBuildJob && buildBusy && (
                  <span className="flex items-center gap-1 text-[9px] text-amber-300">
                    <Loader2 className="w-3 h-3 animate-spin" /> Running...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                <div className="flex items-center gap-1 mr-2">
                  <select
                    value=""
                    onChange={(e) => {
                      const profileId = e.target.value;
                      if (profileId) startBuild(profileId);
                    }}
                    className="text-[10px] bg-elevated border border-line rounded px-2 py-1 text-ink outline-none focus:border-line-strong/50"
                  >
                    <option value="">Select profile...</option>
                    {buildProfiles.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                {buildBusy && activeBuildJob && (
                  <button onClick={cancelBuild} className="p-1 rounded-md text-rose-400 hover:text-rose-200 hover:bg-rose-500/15 transition-colors" title="Cancel build">
                    <Square className="w-3 h-3 fill-current" />
                  </button>
                )}
                <button onClick={clearBuildLogs} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-elevated transition-colors" title="Clear logs">
                  <Trash2 className="w-3 h-3" />
                </button>
                <button onClick={() => setBuildPanelOpen(false)} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-elevated transition-colors" title="Close">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
            <ResizeHandle dir="y" onResize={(d) => setTerminalH((h) => Math.min(480, Math.max(120, h - d)))} onDrag={setResizing} />
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 font-mono text-[11px] scrollbar-thin">
              {buildLogs.length === 0 ? (
                <div className="text-ink-muted py-3">
                  {buildBusy ? 'Build starting...' : 'No build logs yet. Select a profile above to start building.'}
                </div>
              ) : (
                buildLogs.map((log, i) => (
                  <div
                    key={i}
                    className={
                      log.stream === 'stderr'
                        ? 'text-rose-400'
                        : log.stream === 'system'
                        ? 'text-amber-300'
                        : 'text-ink-subtle'
                    }
                  >
                    <span className="text-ink-muted mr-2">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    {log.data}
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center gap-2 px-4 py-2 border-t border-line/80 shrink-0 text-[10px] text-ink-muted">
              <span>Jobs: {buildJobs.length}</span>
              {activeBuildJob && <span className="text-amber-400">Active: {activeBuildJob.slice(0, 8)}...</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Debugger Panel ─── */}
      <AnimatePresence>
        {inIde && debugPanelOpen && (
          <motion.div
            key="debugger-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: Math.min(terminalH + 40, 320), opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
            className="shrink-0 border-t border-amber-800/40 bg-canvas flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-1.5 shrink-0 border-b border-line/60">
              <div className="flex items-center gap-2">
                <Bug className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-semibold tracking-widest text-amber-400/80 uppercase">Debugger</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium border ${
                  debugStatus === 'running' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' :
                  debugStatus === 'paused'  ? 'bg-amber-500/15  border-amber-500/30  text-amber-300'  :
                  debugStatus === 'exited'  ? 'bg-line-strong/15   border-line      text-ink-subtle'   :
                  debugStatus === 'error'   ? 'bg-rose-500/15   border-rose-500/30   text-rose-300'   :
                                             'bg-elevated       border-line      text-ink-muted'
                }`}>{debugStatus}</span>
              </div>
              <div className="flex items-center gap-1">
                {debugId && debugStatus === 'paused' && (
                  <>
                    <button onClick={() => ideApi.debugContinue(debugId).then(() => setDebugStatus('running')).catch(() => {})}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors"
                      title="Continue">
                      <Play className="w-3 h-3" /> Continue
                    </button>
                    <button onClick={() => ideApi.debugStep(debugId).catch(() => {})}
                      className="p-1 rounded text-ink-subtle hover:text-ink hover:bg-elevated transition-colors" title="Step over">
                      <StepForward className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => ideApi.debugStepIn(debugId).catch(() => {})}
                      className="p-1 rounded text-ink-subtle hover:text-ink hover:bg-elevated transition-colors" title="Step in">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => ideApi.debugStepOut(debugId).catch(() => {})}
                      className="p-1 rounded text-ink-subtle hover:text-ink hover:bg-elevated transition-colors" title="Step out">
                      <ChevronRight className="w-3.5 h-3.5 rotate-[-90deg]" />
                    </button>
                  </>
                )}
                {debugId ? (
                  <button onClick={stopDebug} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors" title="Stop">
                    <Square className="w-3 h-3 fill-current" /> Stop
                  </button>
                ) : (
                  <button onClick={startDebug} disabled={!debugFile.trim() || debugBusy}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 disabled:opacity-40 transition-colors" title="Start debugging">
                    {debugBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Debug
                  </button>
                )}
                <button onClick={() => setDebugPanelOpen(false)} className="p-1 rounded text-ink-muted hover:text-ink hover:bg-elevated transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
            {/* File + lang input */}
            <div className="flex items-center gap-2 px-4 py-1.5 border-b border-line/40 shrink-0">
              <span className="text-[9px] text-ink-muted uppercase tracking-wider w-10 shrink-0">File</span>
              <input
                value={debugFile}
                onChange={(e) => setDebugFile(e.target.value)}
                placeholder={activePath || 'index.js or app.py'}
                onFocus={() => { if (!debugFile && activePath) setDebugFile(activePath); }}
                className="flex-1 bg-transparent text-[11px] font-mono text-ink placeholder:text-ink-muted outline-none border-b border-line/50 focus:border-amber-500/50"
              />
              <div className="flex rounded overflow-hidden border border-line shrink-0">
                {(['auto', 'node', 'python'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setDebugLang(l)}
                    className={`px-2 py-0.5 text-[9px] font-medium transition-colors ${debugLang === l ? 'bg-amber-500/20 text-amber-300' : 'text-ink-muted hover:text-ink'}`}
                  >{l}</button>
                ))}
              </div>
            </div>
            {/* Split: call stack + variables */}
            <div className="flex flex-1 min-h-0 overflow-hidden divide-x divide-line/60">
              {/* Call stack */}
              <div className="w-1/2 flex flex-col overflow-hidden">
                <div className="px-3 py-1 text-[9px] text-ink-muted uppercase tracking-wider shrink-0">Call Stack</div>
                <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-1">
                  {debugStack.length === 0 ? (
                    <div className="text-[11px] text-ink-muted px-1 py-2">
                      {debugStatus === 'paused' ? 'Fetching stack…' : debugStatus === 'running' ? 'Running…' : 'No active session'}
                    </div>
                  ) : (
                    debugStack.map((f, i) => (
                      <div key={i} className={`flex flex-col px-2 py-1 rounded-md cursor-pointer transition-colors ${i === 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'hover:bg-elevated/50'}`}
                        onClick={() => f.file && openFile(f.file.replace(/^file:\/\/\//,'').replace(/\//g, '/'), false, f.line)}>
                        <span className="text-[11px] font-mono text-ink truncate">{f.functionName}</span>
                        <span className="text-[9px] text-ink-muted truncate font-mono">{f.file.split('/').slice(-2).join('/')}:{f.line}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              {/* Variables */}
              <div className="w-1/2 flex flex-col overflow-hidden">
                <div className="px-3 py-1 text-[9px] text-ink-muted uppercase tracking-wider shrink-0">Variables</div>
                <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-1">
                  {debugVars.length === 0 ? (
                    <div className="text-[11px] text-ink-muted px-1 py-2">
                      {debugStatus === 'paused' ? 'Fetching variables…' : 'Paused to inspect variables'}
                    </div>
                  ) : (
                    debugVars.map((v, i) => (
                      <div key={i} className="flex items-baseline gap-2 px-1 py-0.5 rounded hover:bg-elevated/30 transition-colors">
                        <span className="text-[10px] text-ink font-mono shrink-0">{v.name}</span>
                        <span className="text-[10px] text-ink-subtle font-mono truncate flex-1">{String(v.value).slice(0, 80)}</span>
                        <span className="text-[9px] text-ink-muted shrink-0">{v.type}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            {/* Console output */}
            {debugOutput.length > 0 && (
              <div className="border-t border-line/40 px-4 py-1.5 max-h-16 overflow-y-auto scrollbar-thin shrink-0">
                {debugOutput.slice(-8).map((o, i) => (
                  <div key={i} className="text-[10px] font-mono text-ink-subtle">{o.text}</div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Composer (opencode-style primary input) ─── */}
      {inIde && (
        <div className="shrink-0 px-4 pb-4 pt-3 border-t border-line/80 bg-canvas">
          <div className="max-w-4xl mx-auto relative">
            <AnimatePresence>
              {pendingLiveApproval && running && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="mb-3 rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] px-4 py-3">
                  <div className="flex items-start gap-2.5"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-amber-200">Approval required</div>
                    <p className="mt-1 text-xs font-medium text-ink">{pendingLiveApproval.title || 'Allow this agent action?'}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-ink-subtle">{pendingLiveApproval.reason}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-ink-muted">Risk: {pendingLiveApproval.risk}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <button onClick={() => ideApi.approveLiveTask(pendingLiveApproval.taskId, 'approve', 'once', pendingLiveApproval.action).then(() => setPendingLiveApproval(null)).catch((err) => showToast(err.message))} className="rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1.5 text-[10px] font-medium text-emerald-200 hover:bg-emerald-500/25">Approve once</button>
                      <button onClick={() => ideApi.approveLiveTask(pendingLiveApproval.taskId, 'approve', 'workspace', pendingLiveApproval.action).then(() => setPendingLiveApproval(null)).catch((err) => showToast(err.message))} className="rounded-lg border border-line-strong/30 bg-accent/15 px-2.5 py-1.5 text-[10px] font-medium text-ink hover:bg-accent/25">Always allow workspace</button>
                      <button onClick={() => ideApi.approveLiveTask(pendingLiveApproval.taskId, 'deny', 'once', pendingLiveApproval.action).then(() => setPendingLiveApproval(null)).catch((err) => showToast(err.message))} className="rounded-lg border border-line bg-elevated px-2.5 py-1.5 text-[10px] text-ink hover:bg-elevated">Deny</button>
                      <button onClick={() => ideApi.controlLiveTask(pendingLiveApproval.taskId, 'stop').finally(() => { setPendingLiveApproval(null); stopPipeline(); })} className="rounded-lg px-2.5 py-1.5 text-[10px] text-rose-300 hover:bg-rose-500/10">Stop task</button>
                    </div>
                  </div></div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* ─── Permission confirm card ─── */}
            <AnimatePresence>
              {pendingConfirm && running && (
                <motion.div
                  key="confirm-card"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mb-3 rounded-2xl border border-line-strong/40 bg-accent/5 px-4 py-3"
                >
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-ink-muted shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-semibold tracking-widest uppercase mb-1 text-ink">Agent wants to write a file</div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[11px] font-semibold text-amber-300 font-mono">{pendingConfirm.tool}</span>
                        <span className="text-[11px] text-ink-subtle font-mono truncate">{pendingConfirm.path}</span>
                      </div>
                      {pendingConfirm.preview && (
                        <pre className="text-[10px] text-ink-muted font-mono whitespace-pre-wrap break-words max-h-24 overflow-y-auto scrollbar-thin bg-surface rounded-lg px-2.5 py-2 mb-2 border border-line/80">{pendingConfirm.preview}</pre>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => { await ideApi.agentConfirm(pendingConfirm.runId, 'allow'); setPendingConfirm(null); }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[11px] text-emerald-300 hover:bg-emerald-500/25 transition-colors font-medium"
                        >
                          <Check className="w-3 h-3" /> Allow write
                        </button>
                        <button
                          onClick={async () => { await ideApi.agentConfirm(pendingConfirm.runId, 'skip'); setPendingConfirm(null); }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-elevated border border-line text-[11px] text-ink hover:bg-elevated transition-colors"
                        >
                          <X className="w-3 h-3" /> Skip this file
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── Post-run summary card ─── */}
            <AnimatePresence>
              {!running && summary && generatedFiles.length > 0 && (
                <motion.div
                  key="summary-card"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className={`mb-3 rounded-2xl border ${runFailed ? 'border-rose-500/30 bg-rose-500/5' : 'border-emerald-500/25 bg-emerald-500/5'} px-4 py-3`}
                >
                  <div className="flex items-start gap-2">
                    <div className="shrink-0 mt-0.5">
                      {runFailed
                        ? <AlertCircle className="w-4 h-4 text-rose-400" />
                        : <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[10px] font-semibold tracking-widest uppercase mb-1 ${runFailed ? 'text-rose-300' : 'text-emerald-300'}`}>
                        {runFailed ? 'Run stopped' : 'Agents done'}
                      </div>
                      <pre className="text-[11px] text-ink-subtle whitespace-pre-wrap break-words font-mono leading-relaxed line-clamp-3">{summary}</pre>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {generatedFiles.slice(0, 6).map((f) => (
                          <button key={f} onClick={() => openFile(f)} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-elevated/80 border border-line/50 text-[10px] text-ink hover:bg-elevated transition-colors font-mono">
                            <FileCode className="w-3 h-3" /> {f}
                          </button>
                        ))}
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        {!previewOpen && generatedFiles.includes('index.html') && (
                          <button
                            onClick={() => { setPreviewOpen(true); setPreviewKey((k) => k + 1); }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[10px] text-emerald-300 hover:bg-emerald-500/25 transition-colors"
                          >
                            <Monitor className="w-3 h-3" /> Open Preview
                          </button>
                        )}
                        {deployInfo?.status === 'running' && deployInfo.url && (
                          <button
                            onClick={() => window.open(deployInfo.url!, '_blank')}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/15 border border-line-strong/30 text-[10px] text-ink-muted hover:bg-accent/25 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" /> Run Project
                          </button>
                        )}
                        {!deployInfo || deployInfo.status !== 'running' ? (
                          <button
                            onClick={() => handleDeploy('local')}
                            disabled={deployBusy}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/15 border border-line-strong/30 text-[10px] text-ink hover:bg-accent/25 disabled:opacity-40 transition-colors"
                          >
                            {deployBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />}
                            {deployBusy ? 'Deploying…' : 'Run Project'}
                          </button>
                        ) : null}
                        {/* Generate Tests button */}
                        {!runFailed && generatedFiles.length > 0 && (
                          <button
                            onClick={generateTests}
                            disabled={testGenBusy}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/15 border border-line-strong/30 text-[10px] text-ink-muted hover:bg-accent/25 disabled:opacity-40 transition-colors"
                            title="AI writes Jest/pytest tests for the generated files and runs them"
                          >
                            {testGenBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <TestTube2 className="w-3 h-3" />}
                            {testGenBusy ? (testGenStatus || 'Generating…') : 'Generate Tests'}
                          </button>
                        )}
                        {testGenResult && (
                          <div className={`w-full mt-1 px-2 py-1 rounded-md border text-[10px] ${testGenResult.passed ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300' : 'border-amber-500/30 bg-amber-500/5 text-amber-300'}`}>
                            {testGenResult.passed ? <CheckCircle2 className="w-3 h-3 inline-block mr-1" /> : <AlertCircle className="w-3 h-3 inline-block mr-1" />}
                            {testGenResult.passed ? `Tests passed${testGenResult.fixed ? ' (after fix)' : ''}` : 'Tests written — some failing'}
                            {' · '}
                            <button onClick={() => openFile(testGenResult.testFile)} className="underline underline-offset-2">{testGenResult.testFile}</button>
                          </div>
                        )}
                        {/* "Deepen" button: escalate a finished quick-agent run into the full pipeline */}
                        {quickMode && !runFailed && prevTaskRef.current && task.trim() === '' && (
                          <button
                            onClick={() => {
                              const t = prevTaskRef.current;
                              setQuickMode(false);
                              setSummary('');
                              setTask(t);
                              setTimeout(() => runPipelineFor(t, currentWs), 50);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/15 border border-line-strong/30 text-[10px] text-ink hover:bg-accent/25 transition-colors"
                            title="Run the full plan→build→test pipeline on the same task"
                          >
                            <Sparkles className="w-3 h-3" /> Deepen with full pipeline
                          </button>
                        )}
                        {diffs.length > 0 && (
                          <button
                            onClick={() => rollbackRun()}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 hover:bg-amber-500/20 transition-colors"
                          >
                            <Undo2 className="w-3 h-3" /> Rollback
                          </button>
                        )}
                        <button
                          onClick={() => setSummary('')}
                          className="ml-auto p-1 rounded-md text-ink-muted hover:text-ink transition-colors"
                          title="Dismiss"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Task queue pill strip */}
            {taskQueue.length > 0 && (
              <div className="flex items-center gap-2 mb-2 px-0.5">
                <span className="text-[9px] tracking-widest text-ink-muted uppercase shrink-0">Queue</span>
                <div className="flex-1 flex flex-wrap gap-1 min-w-0">
                  {taskQueue.map((q, qi) => (
                    <span key={qi} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-elevated/80 border border-line/50 text-[10px] text-ink-subtle font-mono max-w-[200px] truncate">
                      <span className="text-ink-muted shrink-0">{qi + 1}.</span>
                      <span className="truncate">{q}</span>
                      <button
                        onClick={() => {
                          taskQueueRef.current = taskQueueRef.current.filter((_, i) => i !== qi);
                          setTaskQueue([...taskQueueRef.current]);
                        }}
                        className="text-ink-muted hover:text-rose-400 transition-colors shrink-0"
                        title="Remove from queue"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => { taskQueueRef.current = []; setTaskQueue([]); }}
                  className="shrink-0 text-[9px] text-ink-muted hover:text-rose-400 transition-colors"
                  title="Clear queue"
                >
                  Clear
                </button>
              </div>
            )}
            {webOpen && (
              <div className="flex items-center gap-2 mb-2 p-2 rounded-xl border border-line-strong/30 bg-accent/5">
                <Globe className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                <input
                  autoFocus
                  value={webInput}
                  onChange={(e) => setWebInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && webInput.trim()) { e.preventDefault(); fetchWebCtx(webInput.trim()); }
                    if (e.key === 'Escape') { setWebOpen(false); setWebInput(''); }
                  }}
                  placeholder="URL (https://...) or search query"
                  className="flex-1 bg-transparent text-[12px] text-ink-muted placeholder:text-ink-muted outline-none"
                  disabled={webBusy}
                />
                {webBusy
                  ? <Loader2 className="w-3.5 h-3.5 text-ink-muted animate-spin shrink-0" />
                  : <button onClick={() => webInput.trim() && fetchWebCtx(webInput.trim())} disabled={!webInput.trim()} className="text-[10px] px-2 py-0.5 rounded-md bg-elevated hover:bg-accent text-accent-fg disabled:opacity-40 shrink-0">Fetch</button>
                }
                <button onClick={() => { setWebOpen(false); setWebInput(''); }} className="text-ink-muted hover:text-ink-muted shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
            {webCtx && (
              <div className="flex items-center gap-1.5 mb-2">
                <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-accent/10 border border-line-strong/30 text-[10px] text-ink-muted font-mono max-w-xs truncate">
                  <Globe className="w-3 h-3 shrink-0" />
                  @web: {webCtx.source.slice(0, 40)}
                  <button onClick={() => setWebCtx(null)} className="text-ink-muted/70 hover:text-ink-muted transition-colors ml-1" title="Remove web context">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              </div>
            )}
            {mentions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {mentions.map((m) => (
                  <span key={m} className="flex items-center gap-1 px-2 py-1 rounded-md bg-accent/10 border border-line-strong/30 text-[10px] text-ink font-mono">
                    <FileCode className="w-3 h-3 shrink-0" />
                    {m}
                    <button onClick={() => removeMention(m)} className="text-ink-muted/70 hover:text-ink transition-colors" title="Remove">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {mentionSymbols.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {mentionSymbols.map((m) => (
                  <span key={m} className="flex items-center gap-1 px-2 py-1 rounded-md bg-accent/10 border border-line-strong/30 text-[10px] text-ink-muted font-mono">
                    <Braces className="w-3 h-3 shrink-0" />
                    {m}
                    <button onClick={() => removeMentionSymbol(m)} className="text-ink-muted/70 hover:text-ink-muted transition-colors" title="Remove">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {mentionQuery !== null && !running && (
              <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-line bg-surface shadow-2xl shadow-black/60 overflow-hidden z-50 max-h-80 overflow-y-auto">
                <div className="px-3 py-1.5 text-[9px] tracking-widest text-ink-muted uppercase font-semibold border-b border-line/60">Reference files</div>
                {mentionMatches.length === 0 ? (
                  <div className="px-3 py-2 text-[11px] text-ink-muted">No matching files — type more or pick from the explorer</div>
                ) : (
                  mentionMatches.map((p) => (
                    <button
                      key={p}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertMention(p);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[11px] text-ink hover:bg-elevated transition-colors font-mono"
                    >
                      <FileCode className="w-3 h-3 text-ink-muted shrink-0" />
                      <span className="truncate">{p}</span>
                    </button>
                  ))
                )}
                {symbolMatches.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-[9px] tracking-widest text-ink-muted uppercase font-semibold border-y border-line/60">Symbols</div>
                    {symbolMatches.map((s) => (
                      <button
                        key={s.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          insertMentionSymbol(s.name);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[11px] text-ink hover:bg-elevated transition-colors font-mono"
                      >
                        <Braces className={`w-3 h-3 shrink-0 ${s.kind === 'class' ? 'text-ink-muted' : s.kind === 'component' ? 'text-ink-muted' : 'text-amber-400'}`} />
                        <span className="truncate">{s.name}</span>
                        <span className="ml-auto shrink-0 text-[9px] text-ink-muted truncate max-w-[45%]">
                          {s.kind} · {s.file}:{s.line}
                        </span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
            {runsOpen && (
              <div ref={runsRef} className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-line bg-surface shadow-2xl shadow-black/60 overflow-hidden z-50 max-h-72 flex flex-col">
                <div className="px-3 py-1.5 flex items-center justify-between border-b border-line/60 shrink-0">
                  <span className="text-[9px] tracking-widest text-ink-muted uppercase font-semibold">Run history</span>
                  <button onClick={() => setRunsOpen(false)} className="text-ink-muted hover:text-ink transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="overflow-y-auto">
{runs.length === 0 ? (
                      <div className="px-3 py-3 text-[11px] text-ink-muted">No agent runs yet for this workspace.</div>
                    ) : (
                      runs.map((r) => {
                        const isExpanded = expandedRuns.has(r.id);
                        const subs = subAgentsMap[r.id] || [];
                        return (
                          <div key={r.id} className="border-b border-line/40 last:border-0">
                            <button
                              onClick={() => toggleRunExpand(r.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-elevated/40 transition-colors text-left"
                            >
                              <span
                                className={`shrink-0 w-1.5 h-1.5 rounded-full ${r.status === 'done' ? 'bg-emerald-400' : r.status === 'paused' ? 'bg-amber-400' : r.status === 'running' ? 'bg-accent animate-pulse' : r.status === 'cancelled' ? 'bg-line-strong' : 'bg-rose-500'}`}
                                title={r.status}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-[11px] text-ink truncate">{r.task || '(no task)'}</div>
                                <div className="text-[9px] text-ink-muted font-mono mt-0.5">
                                  {r.status} · {r.phase} · {r.id.replace(/^r_/, '').slice(0, 13)}
                                  {r.error ? ` · ${r.error}` : ''}
                                  {subs.length > 0 && ` · ${subs.length} sub-agent${subs.length > 1 ? 's' : ''}`}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-ink-muted" /> : <ChevronRight className="w-3.5 h-3.5 text-ink-muted" />}
                                {r.status === 'paused' && (
                                  <button onClick={(e) => { e.stopPropagation(); resumeRun(r); }} className="p-1 rounded-md text-amber-300 hover:bg-amber-500/15 transition-colors" title="Resume this run">
                                    <Play className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {r.status === 'done' && r.generatedFiles.length > 0 && (
                                  <button onClick={(e) => { e.stopPropagation(); rollbackRun(r.id); }} className="p-1 rounded-md text-ink-subtle hover:text-ink hover:bg-elevated transition-colors" title="Roll back to before this run">
                                    <Undo2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); deleteRun(r.id); }} className="p-1 rounded-md text-ink-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="Delete run record">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </button>
                            {isExpanded && subs.length > 0 && (
                              <div className="pl-8 border-l border-line/40 ml-1.5">
                                {subs.map((sa) => (
                                  <div key={sa.runId} className="flex items-center gap-2 px-3 py-1.5 hover:bg-elevated/30 transition-colors">
                                    <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${sa.status === 'done' ? 'bg-emerald-400' : sa.status === 'running' ? 'bg-accent animate-pulse' : sa.status === 'cancelled' ? 'bg-line-strong' : 'bg-rose-500'}`} title={sa.status} />
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[10px] text-ink-subtle truncate">{sa.role}: {sa.task.slice(0, 100)}</div>
                                      <div className="text-[8px] text-ink-muted font-mono mt-0.5">
                                        {sa.status} · {sa.runId.slice(0, 16)} · {sa.events?.length || 0} events
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {sa.status === 'running' && (
                                        <button onClick={() => ideApi.agentCancelSubAgent(currentWs!, sa.runId)} className="p-0.5 rounded-md text-rose-400 hover:bg-rose-500/10 transition-colors" title="Cancel sub-agent">
                                          <X className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                </div>
              </div>
            )}
            {/* Attached image previews */}
            {chatImages.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {chatImages.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img src={img} alt="" className="h-16 w-16 object-cover rounded-lg border border-line/60" />
                    <button
                      onClick={() => setChatImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-surface border border-line flex items-center justify-center text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {designMsg && (
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {designMsg}
              </div>
            )}
            <div className={`flex items-end gap-2 rounded-2xl border bg-surface px-3 py-2.5 shadow-2xl shadow-black/40 transition-all ${running ? 'border-line-strong/50' : 'border-line focus-within:border-line-strong/60 focus-within:ring-2 focus-within:ring-line-strong/15'}`}>
              <textarea
                ref={editorRef}
                value={task}
                onChange={(e) => handleComposerChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (quickMode) runQuickAgent();
                    else if (deliveryMode) runDelivery();
                    else runPipeline();
                  }
                }}
                onPaste={(e) => {
                  // Paste image from clipboard
                  const items = Array.from(e.clipboardData?.items || []);
                  const imgItem = items.find((it) => it.type.startsWith('image/'));
                  if (!imgItem) return;
                  e.preventDefault();
                  const file = imgItem.getAsFile();
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const url = ev.target?.result as string;
                    if (url) setChatImages((prev) => [...prev, url]);
                  };
                  reader.readAsDataURL(file);
                }}
                rows={Math.min(4, Math.max(1, task.split('\n').length))}
                placeholder={running ? 'Agents are working…' : readOnly ? 'Open a sandboxed workspace to run agents' : 'What should the agents build? e.g. Add a login page to my app'}
                disabled={readOnly}
                className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted outline-none resize-none disabled:opacity-50 leading-relaxed"
              />
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => { if (currentWs) { if (runsOpen) setRunsOpen(false); else { loadRuns(currentWs); setRunsOpen(true); } } }} className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-elevated transition-colors" title="Run history (pause / resume / rollback)">
                  <History className="w-4 h-4" />
                </button>
                {runPaused && !running && agentRunId && (
                  <button
                    onClick={() => {
                      const paused = runs.find((r) => r.id === agentRunId);
                      if (paused) resumeRun(paused);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 text-xs font-medium transition-colors"
                    title="Continue the paused run from where it stopped"
                  >
                    <Play className="w-3.5 h-3.5" /> Resume
                  </button>
                )}
                <button
                  onClick={() => setQuickMode((m) => !m)}
                  disabled={running || readOnly}
                  title={quickMode ? 'Quick mode: fast tool-agent, no build/test pipeline' : 'Full mode: plan → build → test pipeline'}
                  className={`flex items-center gap-1 px-2 py-2 rounded-lg text-[10px] font-medium transition-colors ${quickMode ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25' : 'text-ink-muted hover:text-ink hover:bg-elevated'}`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Quick
                </button>
                <button
                  onClick={() => setDeliveryMode((m) => !m)}
                  disabled={running || readOnly}
                  title={deliveryMode ? 'Delivery mode ON: GSD plan → Neural IDE execute → RALPH supervise → CodeRabbit review → stack verification' : 'Delivery mode: GSD plan → execute → RALPH supervision → CodeRabbit review → verification gates'}
                  className={`flex items-center gap-1 px-2 py-2 rounded-lg text-[10px] font-medium transition-colors ${deliveryMode ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25' : 'text-ink-muted hover:text-ink hover:bg-elevated'}`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Delivery
                </button>
                <button
                  onClick={() => setWebOpen((o) => !o)}
                  className={`flex items-center gap-1 px-2 py-2 rounded-lg text-[10px] font-medium transition-colors ${webCtx ? 'bg-accent/15 border border-line-strong/40 text-ink-muted hover:bg-accent/25' : 'text-ink-muted hover:text-ink hover:bg-elevated'}`}
                  title="Inject @web context — type a URL or search query"
                >
                  <Globe className="w-3.5 h-3.5" />
                  @web
                </button>
                {/* Auto-context pill — shows which file will be auto-attached */}
                {activePath && mentions.length === 0 && !readOnly && (
                  <span
                    className="flex items-center gap-1 px-2 py-1 rounded-lg border border-line/50 bg-elevated/50 text-[9px] text-ink-muted font-mono max-w-[120px] truncate cursor-default"
                    title={`${activePath} will be auto-attached as context. Use @file to override.`}
                  >
                    <FileCode className="w-3 h-3 shrink-0 text-ink-muted" />
                    <span className="truncate">{activePath.split('/').pop()}</span>
                  </span>
                )}
                {/* Image attach button */}
                <button
                  onClick={() => imageInputRef.current?.click()}
                  disabled={readOnly}
                  className={`flex items-center gap-1 px-2 py-2 rounded-lg text-[10px] font-medium transition-colors disabled:opacity-40 ${chatImages.length > 0 ? 'bg-accent/15 border border-line-strong/40 text-ink-muted hover:bg-accent/25' : 'text-ink-muted hover:text-ink hover:bg-elevated'}`}
                  title="Attach image (or paste from clipboard)"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  {chatImages.length > 0 ? chatImages.length.toString() : 'Img'}
                </button>
                {chatImages.length > 0 && (
                  <button
                    onClick={designFromImage}
                    disabled={designBusy || readOnly}
                    className="flex items-center gap-1 px-2 py-2 rounded-lg text-[10px] font-medium transition-colors disabled:opacity-40 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25"
                    title="Design-to-code: turn the attached screenshot into an HTML/CSS workspace"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Design
                  </button>
                )}
                <button
                  onClick={openRules}
                  disabled={!currentWs}
                  className={`flex items-center gap-1 px-2 py-2 rounded-lg text-[10px] font-medium transition-colors disabled:opacity-40 ${rulesHasContent ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25' : 'text-ink-muted hover:text-ink hover:bg-elevated'}`}
                  title="Project rules (.neuralrules) — prepended to every agent & chat prompt"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Rules
                </button>
                <button
                  onClick={() => setRequirePermissions((p) => !p)}
                  className={`flex items-center gap-1 px-2 py-2 rounded-lg text-[10px] font-medium transition-colors ${requirePermissions ? 'bg-accent/15 border border-line-strong/40 text-ink hover:bg-accent/25' : 'text-ink-muted hover:text-ink hover:bg-elevated'}`}
                  title={requirePermissions ? 'Permission mode ON — asks before each write (click to disable)' : 'Enable permission mode — approve/skip before each file write'}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Ask
                </button>
                <button onClick={startVoice} className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-elevated transition-colors" title="Voice input">
                  <Mic className="w-4 h-4" />
                </button>
                {running ? (
                  <>
                    <button onClick={pauseRun} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-elevated/80 hover:opacity-90 text-ink text-xs font-medium transition-colors" title="Pause after the current step — resume from run history">
                      <Pause className="w-3.5 h-3.5" /> Pause
                    </button>
                    <button onClick={stopPipeline} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-ink text-xs font-medium transition-colors">
                      <Square className="w-3.5 h-3.5" /> Stop
                    </button>
                  </>
                ) : (
                  <button
                    onClick={quickMode ? () => runQuickAgent() : deliveryMode ? runDelivery : runPipeline}
                    disabled={!task.trim() || readOnly}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent hover:bg-accent text-accent-fg text-xs font-medium transition-colors disabled:opacity-40 disabled:hover:bg-accent"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> {quickMode ? 'Run quick' : deliveryMode ? 'Run delivery' : 'Run agents'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Explorer context menu ─── */}
      {inIde && ctxMenu && (
        <div className="fixed z-[85]" style={{ left: Math.min(ctxMenu.x, window.innerWidth - 190), top: Math.min(ctxMenu.y, window.innerHeight - 170) }} onClick={(e) => e.stopPropagation()}>
          <div className="w-44 rounded-xl border border-line bg-elevated shadow-2xl shadow-black/60 py-1.5 text-xs">
            <button onClick={() => ctxNew(ctxMenu.isDir ? ctxMenu.path : dirName(ctxMenu.path), 'file')} className="w-full flex items-center gap-2 px-3 py-1.5 text-ink hover:bg-elevated/70 transition-colors text-left">
              <FilePlus2 className="w-3.5 h-3.5 text-ink-muted/80" /> New file
            </button>
            <button onClick={() => ctxNew(ctxMenu.isDir ? ctxMenu.path : dirName(ctxMenu.path), 'dir')} className="w-full flex items-center gap-2 px-3 py-1.5 text-ink hover:bg-elevated/70 transition-colors text-left">
              <FolderPlus className="w-3.5 h-3.5 text-ink-muted/80" /> New folder
            </button>
            <div className="my-1 border-t border-line/80" />
            <button onClick={() => ctxRename({ path: ctxMenu.path, isDir: ctxMenu.isDir })} className="w-full flex items-center gap-2 px-3 py-1.5 text-ink hover:bg-elevated/70 transition-colors text-left">
              <Edit3 className="w-3.5 h-3.5 text-amber-400/80" /> Rename
            </button>
            <button onClick={() => ctxDelete(ctxMenu.path, ctxMenu.isDir)} className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-300 hover:bg-rose-500/10 transition-colors text-left">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      )}

      {/* ─── Command Palette (Ctrl+P / Ctrl+Shift+P) ─── */}
      {inIde && quickOpen && (() => {
        const isCmd = quickQuery.startsWith('>');
        const rawQ = isCmd ? quickQuery.slice(1).trim().toLowerCase() : quickQuery.trim().toLowerCase();

        // ── Static commands list ──────────────────────────────────────────
        const ALL_COMMANDS: { id: string; label: string; hint: string; icon: React.ReactNode; action: () => void }[] = [
          // Navigation
          { id: 'explorer',  label: 'Show: Explorer',        hint: 'Ctrl+Shift+E', icon: <FolderOpen className="w-4 h-4 text-amber-400" />,   action: () => { setLeftTab('explorer');  setExplorerOpen(true); } },
          { id: 'search',    label: 'Show: Search',          hint: 'Ctrl+Shift+F', icon: <Search className="w-4 h-4 text-ink-muted" />,          action: () => { setLeftTab('search');    setExplorerOpen(true); } },
          { id: 'git',       label: 'Show: Source Control',  hint: 'Ctrl+Shift+G', icon: <GitBranch className="w-4 h-4 text-ink-muted" />,    action: () => { setLeftTab('git');       setExplorerOpen(true); } },
          { id: 'outline',   label: 'Show: Outline',         hint: '',             icon: <Layers className="w-4 h-4 text-ink-subtle" />,          action: () => { setLeftTab('outline');   setExplorerOpen(true); } },
          { id: 'agents',    label: 'Show: Agents panel',    hint: '',             icon: <Sparkles className="w-4 h-4 text-ink-muted" />,      action: () => setAgentsOpen(true) },
          { id: 'terminal',  label: 'Toggle: Terminal',      hint: 'Ctrl+`',       icon: <TerminalIcon className="w-4 h-4 text-emerald-400" />, action: () => setTerminalOpen((o) => !o) },
          { id: 'preview',   label: 'Toggle: Preview',       hint: '',             icon: <Monitor className="w-4 h-4 text-ink-muted" />,          action: () => { setPreviewOpen((o) => !o); if (!previewOpen) setPreviewKey((k) => k + 1); } },
          // Agents
          { id: 'runquick',  label: 'Run: Quick agent',      hint: '',             icon: <Zap className="w-4 h-4 text-amber-400" />,            action: () => { setQuickMode(true);  runQuickAgent(); } },
          { id: 'runfull',   label: 'Run: Full pipeline',    hint: '',             icon: <Rocket className="w-4 h-4 text-ink-muted" />,        action: () => { setQuickMode(false); runPipeline(); } },
          { id: 'stop',      label: 'Stop running agent',    hint: '',             icon: <Square className="w-4 h-4 text-rose-400" />,          action: () => stopPipeline() },
          // Workspace
          { id: 'deploy',    label: 'Deploy: Run project',   hint: '',             icon: <Rocket className="w-4 h-4 text-ink-muted" />,        action: () => handleDeploy('local') },
          { id: 'gitcommit', label: 'Git: Commit all',       hint: '',             icon: <GitCommitHorizontal className="w-4 h-4 text-emerald-400" />, action: () => { setLeftTab('git'); setExplorerOpen(true); } },
          { id: 'rules',     label: 'Open: Project rules',   hint: '',             icon: <BookOpen className="w-4 h-4 text-amber-400" />,       action: openRules },
          { id: 'memory',    label: 'Open: Project memory',  hint: '',             icon: <BookOpen className="w-4 h-4 text-ink-muted" />,         action: () => { setDrawerTab('memory');  setDrawerOpen(true); } },
          { id: 'settings',  label: 'Open: Settings',        hint: '',             icon: <Settings className="w-4 h-4 text-ink-subtle" />,        action: () => { setDrawerTab('settings'); setDrawerOpen(true); } },
          { id: 'secrets',   label: 'Open: Secrets / Env',   hint: '',             icon: <KeyRound className="w-4 h-4 text-yellow-400" />,      action: () => { setDrawerTab('secrets');  setDrawerOpen(true); } },
          { id: 'mcp',       label: 'Open: MCP Servers',     hint: '',             icon: <Plug className="w-4 h-4 text-ink-muted" />,             action: () => { setDrawerTab('mcp');      setDrawerOpen(true); } },
          { id: 'history',   label: 'Open: Step history',    hint: '',             icon: <History className="w-4 h-4 text-ink-muted" />,       action: () => { setDrawerTab('history');  setDrawerOpen(true); } },
          { id: 'clearchat', label: 'Clear conversation',    hint: '',             icon: <Trash2 className="w-4 h-4 text-rose-400" />,          action: clearChat },
          { id: 'checkpoint',label: 'Create checkpoint',     hint: '',             icon: <Save className="w-4 h-4 text-emerald-400" />,         action: () => ideApi.checkpointCreate(currentWs, 'manual').then(() => showToast('Checkpoint saved')).catch(() => {}) },
          { id: 'rollback',  label: 'Rollback last run',     hint: '',             icon: <Undo2 className="w-4 h-4 text-amber-400" />,          action: () => rollbackRun() },
          // Tools
          { id: 'packages',  label: 'Open: Packages',        hint: '',             icon: <Package className="w-4 h-4 text-ink-muted" />,          action: () => { setDrawerTab('packages');  setDrawerOpen(true); } },
          { id: 'database',  label: 'Open: Database',        hint: '',             icon: <Database className="w-4 h-4 text-emerald-400" />,     action: () => { setDrawerTab('database');  setDrawerOpen(true); } },
          { id: 'apitest',   label: 'Open: API Tester',      hint: '',             icon: <Zap className="w-4 h-4 text-rose-400" />,             action: () => { setDrawerTab('apitest');   setDrawerOpen(true); } },
          { id: 'plugins',   label: 'Open: Plugins',         hint: '',             icon: <Plug className="w-4 h-4 text-ink-muted" />,          action: () => { setDrawerTab('plugins');   setDrawerOpen(true); } },
          { id: 'profiler',  label: 'Open: Profiler',        hint: '',             icon: <Activity className="w-4 h-4 text-amber-400" />,       action: () => { setDrawerTab('profiler');  setDrawerOpen(true); } },
          { id: 'rea',       label: 'Open: Reverse Engineer', hint: '',             icon: <Search className="w-4 h-4 text-ink-muted" />,          action: () => { setDrawerTab('rea');       setDrawerOpen(true); } },
          { id: 'collab',    label: 'Open: Collaboration',   hint: '',             icon: <Users className="w-4 h-4 text-ink-muted" />,            action: () => { setDrawerTab('collab');    setDrawerOpen(true); } },
          { id: 'cheatsheet',label: 'Show: Shortcuts',       hint: '?',            icon: <Info className="w-4 h-4 text-ink-subtle" />,            action: () => setCheatsheetOpen(true) },
          { id: 'gentests',  label: 'Run: Generate Tests',   hint: '',             icon: <TestTube2 className="w-4 h-4 text-ink-muted" />,        action: () => generateTests() },
          { id: 'notebook',  label: 'Toggle: Notebook Mode', hint: '',             icon: <Braces className="w-4 h-4 text-ink-muted" />,        action: () => { if (activeFile) setNotebookOpen((o) => !o); } },
        ];

        const filteredCmds = rawQ
          ? ALL_COMMANDS.filter((c) => c.label.toLowerCase().includes(rawQ) || c.id.toLowerCase().includes(rawQ))
          : ALL_COMMANDS;

        const filteredFiles = !isCmd
          ? (rawQ ? quickFiles.filter((f) => f.toLowerCase().includes(rawQ)).slice(0, 30) : quickFiles.slice(0, 30))
          : [];

        // Flat list for keyboard nav: commands first when >, files first when not
        type PaletteItem =
          | { kind: 'file'; file: string }
          | { kind: 'cmd'; cmd: typeof ALL_COMMANDS[0] };
        const items: PaletteItem[] = isCmd
          ? filteredCmds.map((cmd) => ({ kind: 'cmd' as const, cmd }))
          : [
              ...filteredFiles.map((f) => ({ kind: 'file' as const, file: f })),
              ...(rawQ ? filteredCmds.slice(0, 5).map((cmd) => ({ kind: 'cmd' as const, cmd })) : []),
            ];

        const clampedIdx = Math.min(quickIdx, Math.max(0, items.length - 1));

        const runItem = (item: PaletteItem) => {
          setQuickOpen(false);
          setQuickQuery('');
          if (item.kind === 'file') openFile(item.file, projectMode || readOnly);
          else item.cmd.action();
        };

        return (
          <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[10vh] bg-surface backdrop-blur-sm" onClick={() => setQuickOpen(false)}>
            <div className="w-[600px] max-w-[94vw] rounded-2xl border border-line/80 bg-surface shadow-2xl shadow-black/70 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Search bar */}
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-line/80">
                {isCmd
                  ? <Sparkles className="w-4 h-4 text-ink-muted shrink-0" />
                  : <Search className="w-4 h-4 text-ink-muted shrink-0" />
                }
                <input
                  ref={quickInputRef}
                  value={quickQuery}
                  onChange={(e) => { setQuickQuery(e.target.value); setQuickIdx(0); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { if (items.length) runItem(items[clampedIdx]); }
                    else if (e.key === 'ArrowDown') { e.preventDefault(); setQuickIdx((i) => Math.min(i + 1, Math.max(0, items.length - 1))); }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); setQuickIdx((i) => Math.max(i - 1, 0)); }
                    else if (e.key === 'Escape') setQuickOpen(false);
                  }}
                  placeholder={isCmd ? 'Type a command…' : 'Search files  ·  type > for commands'}
                  className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted outline-none"
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => { setQuickQuery(isCmd ? '' : '>'); setQuickIdx(0); setTimeout(() => quickInputRef.current?.focus(), 10); }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${isCmd ? 'bg-accent/20 text-ink border border-line-strong/30' : 'bg-elevated/70 text-ink-muted border border-line/50 hover:text-ink'}`}
                    title={isCmd ? 'Switch to file search' : 'Switch to commands (>)'}
                  >
                    {isCmd ? 'files' : '>cmd'}
                  </button>
                  <span className="text-[10px] text-ink-muted">esc</span>
                </div>
              </div>

              {/* Results */}
              <div className="max-h-[54vh] overflow-y-auto scrollbar-thin py-1">
                {items.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[11px] text-ink-muted">
                    {isCmd ? 'No matching commands' : 'No matching files'}
                  </div>
                ) : (
                  <>
                    {/* Section label */}
                    {!isCmd && filteredFiles.length > 0 && (
                      <div className="px-4 py-1 text-[9px] font-semibold tracking-widest text-ink-muted uppercase">Files</div>
                    )}
                    {items.map((item, i) => {
                      const active = i === clampedIdx;
                      if (item.kind === 'file') {
                        const segs = item.file.split('/');
                        const name = segs.pop() || item.file;
                        const dir = segs.join('/');
                        return (
                          <button
                            key={item.file}
                            onClick={() => runItem(item)}
                            onMouseEnter={() => setQuickIdx(i)}
                            className={`w-full flex items-center gap-2.5 px-4 py-2 text-left text-xs transition-colors ${active ? 'bg-accent/15 text-ink' : 'text-ink-subtle hover:bg-elevated/60'}`}
                          >
                            {fileIcon(item.file)}
                            <span className="font-mono">{name}</span>
                            {dir && <span className="text-[10px] text-ink-muted ml-auto truncate max-w-[45%]">{dir}</span>}
                          </button>
                        );
                      }
                      // cmd item — show a divider before the first command in mixed mode
                      const isFirstCmd = !isCmd && i > 0 && items[i - 1].kind === 'file';
                      return (
                        <React.Fragment key={item.cmd.id}>
                          {isFirstCmd && (
                            <div className="mx-4 my-1 border-t border-line/60" />
                          )}
                          {isFirstCmd && (
                            <div className="px-4 py-1 text-[9px] font-semibold tracking-widest text-ink-muted uppercase">Commands</div>
                          )}
                          <button
                            onClick={() => runItem(item)}
                            onMouseEnter={() => setQuickIdx(i)}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-left text-xs transition-colors ${active ? 'bg-accent/15 text-ink' : 'text-ink-subtle hover:bg-elevated/60'}`}
                          >
                            <span className="shrink-0">{item.cmd.icon}</span>
                            <span className="flex-1">{item.cmd.label}</span>
                            {item.cmd.hint && (
                              <kbd className="shrink-0 px-1.5 py-0.5 rounded bg-elevated/80 border border-line/50 text-[9px] font-mono text-ink-muted">{item.cmd.hint}</kbd>
                            )}
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Footer hint */}
              <div className="px-4 py-2 border-t border-line/60 flex items-center gap-3 text-[9px] text-ink-muted">
                <span><kbd className="font-mono">↑↓</kbd> navigate</span>
                <span><kbd className="font-mono">↵</kbd> select</span>
                <span><kbd className="font-mono">esc</kbd> close</span>
                <span className="ml-auto">{isCmd ? `${filteredCmds.length} commands` : `${quickFiles.length} files`}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {localFolderOpen && (
        <div className="fixed inset-0 z-[90] bg-scrim flex items-center justify-center p-4" onClick={() => setLocalFolderOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-ink mb-1">Open Local Folder</h3>
            <p className="text-[11px] text-ink-muted mb-4">
              {window.desktopAPI?.isDesktop
                ? 'Pick a folder on this computer.'
                : 'Running in the browser — enter the absolute path of a folder on this machine (e.g. D:\\Projects\\MyApp). In the desktop app this opens a native picker.'}
            </p>
            <input
              autoFocus
              value={localFolderPath}
              onChange={(e) => setLocalFolderPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && openLocalPath()}
              placeholder="D:\\Projects\\MyApp"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-xs text-ink placeholder:text-ink-muted focus:border-line-strong/60 outline-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setLocalFolderOpen(false)} className="px-3 py-2 rounded-lg text-xs text-ink-subtle hover:bg-elevated transition-colors">
                Cancel
              </button>
              <button onClick={openLocalPath} disabled={localFolderBusy || !localFolderPath.trim()} className="px-4 py-2 rounded-lg bg-accent hover:bg-accent text-accent-fg text-xs font-medium transition-colors disabled:opacity-40">
                {localFolderBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Open'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SSH Workspace Modal ─── */}
      {sshModalOpen && (
        <div className="fixed inset-0 z-[90] bg-scrim flex items-center justify-center p-4" onClick={() => { setSshModalOpen(false); setSshStatus(null); }}>
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-ink-muted" />
                <h3 className="text-sm font-semibold text-ink">Connect Remote SSH Workspace</h3>
              </div>
              <button onClick={() => { setSshModalOpen(false); setSshStatus(null); }} className="text-ink-muted hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-ink-muted mb-0.5 block">Host</label>
                  <input value={sshHost} onChange={(e) => setSshHost(e.target.value)} placeholder="192.168.1.100" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[11px] text-ink placeholder:text-ink-muted focus:border-line-strong/60 outline-none" />
                </div>
                <div className="w-20">
                  <label className="text-[10px] text-ink-muted mb-0.5 block">Port</label>
                  <input value={sshPort} onChange={(e) => setSshPort(e.target.value)} placeholder="22" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[11px] text-ink placeholder:text-ink-muted focus:border-line-strong/60 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-ink-muted mb-0.5 block">Username</label>
                <input value={sshUser} onChange={(e) => setSshUser(e.target.value)} placeholder="ubuntu" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[11px] text-ink placeholder:text-ink-muted focus:border-line-strong/60 outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-ink-muted mb-0.5 block">Private key path (optional)</label>
                <input value={sshKeyPath} onChange={(e) => setSshKeyPath(e.target.value)} placeholder="~/.ssh/id_rsa" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[11px] font-mono text-ink placeholder:text-ink-muted focus:border-line-strong/60 outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-ink-muted mb-0.5 block">Remote path</label>
                <input value={sshRemotePath} onChange={(e) => setSshRemotePath(e.target.value)} placeholder="~" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[11px] font-mono text-ink placeholder:text-ink-muted focus:border-line-strong/60 outline-none" />
              </div>
              {sshStatus && (
                <div className={`rounded-lg px-3 py-2.5 text-[11px] border ${sshStatus.ok ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300' : 'border-rose-500/30 bg-rose-500/5 text-rose-300'}`}>
                  {sshStatus.ok ? (
                    <>
                      <div className="font-medium mb-1">✓ Connected — {sshStatus.files?.length ?? 0} items in home</div>
                      <div className="text-ink-muted text-[10px] truncate">{sshStatus.files?.slice(0, 6).join('  ')}</div>
                    </>
                  ) : sshStatus.error}
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={async () => {
                  setSshBusy(true); setSshStatus(null);
                  try {
                    const r = await ideApi.sshConnect(sshHost, Number(sshPort) || 22, sshUser, sshKeyPath || undefined);
                    setSshStatus({ ok: r.ok, error: r.error, files: r.files });
                  } catch (err: any) { setSshStatus({ ok: false, error: err.message }); }
                  setSshBusy(false);
                }}
                disabled={sshBusy || !sshHost.trim() || !sshUser.trim()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-elevated hover:bg-accent text-accent-fg text-xs font-medium transition-colors disabled:opacity-40"
              >
                {sshBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />} Test Connection
              </button>
              <button
                onClick={async () => {
                  if (!currentWs) { showToast('Open a workspace first'); return; }
                  setSshBusy(true);
                  try {
                    const r = await ideApi.sshSync(currentWs, sshHost, Number(sshPort) || 22, sshUser, sshKeyPath || undefined, sshRemotePath);
                    if (r.ok) {
                      showToast(`Synced ${sshRemotePath} → ${currentWs}`);
                      await refreshTree();
                      setSshModalOpen(false); setSshStatus(null);
                    } else { setSshStatus({ ok: false, error: r.error }); }
                  } catch (err: any) { setSshStatus({ ok: false, error: err.message }); }
                  setSshBusy(false);
                }}
                disabled={sshBusy || !sshStatus?.ok || !currentWs}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent hover:bg-accent text-accent-fg text-xs font-medium transition-colors disabled:opacity-40"
              >
                {sshBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />} Sync to Workspace
              </button>
              <button onClick={() => { setSshModalOpen(false); setSshStatus(null); }} className="ml-auto px-3 py-2 rounded-lg text-xs text-ink-subtle hover:bg-elevated transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {cloudOpen && (
        <div className="fixed inset-0 z-[90] bg-scrim flex items-center justify-center p-4" onClick={() => setCloudOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-ink">Cloud model (OpenRouter)</h3>
              <button onClick={() => setCloudOpen(false)} className="text-ink-muted hover:text-ink text-sm">✕</button>
            </div>
            <p className="text-[11px] text-ink-muted mb-4 leading-relaxed">
              Jab enabled ho, agent pipeline pehle cloud model use karega; fail hone pe automatically local models pe fallback ho jayega.
            </p>
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input type="checkbox" checked={cloudEnabled} onChange={(e) => setCloudEnabled(e.target.checked)} className="accent-accent w-4 h-4" />
              <span className="text-xs text-ink">Use cloud model when available</span>
            </label>
            <label className="block text-[11px] text-ink-muted mb-1">Model (OpenRouter ID)</label>
            <input
              value={cloudModel}
              onChange={(e) => setCloudModel(e.target.value)}
              list="cloud-model-presets"
              placeholder="openrouter/auto"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-xs text-ink placeholder:text-ink-muted focus:border-line-strong/60 outline-none mb-3"
            />
            <datalist id="cloud-model-presets">
              {['openrouter/auto', 'deepseek/deepseek-chat', 'openai/gpt-5', 'anthropic/claude-sonnet-4-5', 'google/gemini-2.5-pro', 'qwen/qwen3-coder-480b'].map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <label className="block text-[11px] text-ink-muted mb-1">
              API key {cloudKeySet && <span className="text-emerald-400/80">(saved: {cloudKeyMasked})</span>}
            </label>
            <input
              type="password"
              value={cloudKey}
              onChange={(e) => setCloudKey(e.target.value)}
              placeholder={cloudKeySet ? 'Type a new key to replace' : 'sk-or-…'}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-xs text-ink placeholder:text-ink-muted focus:border-line-strong/60 outline-none mb-2"
            />
            {cloudTest && (
              <div className={`text-[11px] mb-3 px-3 py-2 rounded-lg border ${cloudTest.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'}`}>
                {cloudTest.message}
              </div>
            )}
            <div className="flex items-center justify-end gap-2 mt-4">
              <button onClick={testCloud} disabled={cloudBusy} className="px-3 py-2 rounded-lg border border-line text-[11px] text-ink hover:bg-elevated transition-colors disabled:opacity-40">
                {cloudBusy ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null} Test connection
              </button>
              <button onClick={saveCloudSettings} disabled={cloudBusy} className="px-4 py-2 rounded-lg bg-accent hover:bg-accent text-[11px] text-accent-fg font-medium transition-colors disabled:opacity-40">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── .neuralrules editor modal ─── */}
      {rulesOpen && (
        <div className="fixed inset-0 z-[95] bg-scrim flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setRulesOpen(false); }}>
          <div className="w-full max-w-lg rounded-2xl border border-line bg-surface shadow-2xl flex flex-col" style={{ maxHeight: '80vh' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-line/80 shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-ink">Project Rules</h3>
                <span className="text-[10px] text-ink-muted font-mono">{rulesFile}</span>
              </div>
              <button onClick={() => setRulesOpen(false)} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-elevated transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="px-4 py-2 shrink-0">
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Write instructions prepended to <strong className="text-ink">every</strong> agent run and chat message — coding style, stack preferences, naming conventions, what to avoid. Supports <span className="font-mono text-amber-300">.neuralrules</span>, <span className="font-mono text-amber-300">AGENTS.md</span>, or <span className="font-mono text-amber-300">.cursorrules</span>.
              </p>
            </div>
            <textarea
              value={rulesContent}
              onChange={(e) => setRulesContent(e.target.value)}
              placeholder={'# Project Rules\n\nAlways use TypeScript strict mode.\nPrefer functional components.\nUse Tailwind for styling.\nDo not use class-based components.\n...'}
              className="flex-1 min-h-0 bg-surface px-4 py-3 text-xs font-mono text-ink placeholder:text-ink-subtle outline-none resize-none border-t border-line/60"
              spellCheck={false}
            />
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-line/80 shrink-0">
              <button
                onClick={() => { setRulesContent(''); }}
                className="text-[11px] text-ink-muted hover:text-rose-300 transition-colors"
              >
                Clear
              </button>
              <div className="flex gap-2">
                <button onClick={() => setRulesOpen(false)} className="px-3 py-2 rounded-lg text-xs text-ink-subtle hover:bg-elevated transition-colors">
                  Cancel
                </button>
                <button
                  onClick={saveRules}
                  disabled={rulesBusy}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-ink text-xs font-medium transition-colors disabled:opacity-40"
                >
                  {rulesBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save rules'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Plan edit gate modal ─── */}
      {pendingPlan && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-scrim backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl border border-amber-500/30 bg-surface shadow-2xl shadow-black/70 flex flex-col overflow-hidden" style={{ maxHeight: '80vh' }}>
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-line/80 shrink-0">
              <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-ink">Review implementation plan</h3>
                <p className="text-[10px] text-ink-muted mt-0.5">Edit steps before the executor starts. Add, remove, or reorder — then approve.</p>
              </div>
              <button onClick={() => { pendingPlan.resolve(pendingPlan.milestones); setPendingPlan(null); }} className="ml-auto p-1 rounded-md text-ink-muted hover:text-ink hover:bg-elevated transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
              {pendingPlan.milestones.map((m, mi) => (
                <div key={mi} className="rounded-lg border border-line/70 bg-surface overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-line/60">
                    <span className="text-[10px] text-ink-muted font-semibold shrink-0">{mi + 1}.</span>
                    <input
                      value={m.milestone}
                      onChange={(e) => setPendingPlan((prev) => prev ? { ...prev, milestones: prev.milestones.map((x, xi) => xi === mi ? { ...x, milestone: e.target.value } : x) } : null)}
                      className="flex-1 bg-transparent text-[11px] text-ink font-medium outline-none placeholder:text-ink-muted"
                    />
                    <button
                      onClick={() => setPendingPlan((prev) => prev ? { ...prev, milestones: prev.milestones.filter((_, xi) => xi !== mi) } : null)}
                      className="p-0.5 rounded text-ink-muted hover:text-rose-400 transition-colors shrink-0"
                      title="Remove milestone"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="px-3 py-2 space-y-1">
                    {m.steps.map((s, si) => (
                      <div key={si} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-ink-subtle shrink-0 mt-px" />
                        <input
                          value={s.action}
                          onChange={(e) => setPendingPlan((prev) => prev ? { ...prev, milestones: prev.milestones.map((x, xi) => xi === mi ? { ...x, steps: x.steps.map((st, sti) => sti === si ? { ...st, action: e.target.value } : st) } : x) } : null)}
                          className="flex-1 bg-transparent text-[11px] text-ink outline-none"
                        />
                        <button
                          onClick={() => setPendingPlan((prev) => prev ? { ...prev, milestones: prev.milestones.map((x, xi) => xi === mi ? { ...x, steps: x.steps.filter((_, sti) => sti !== si) } : x) } : null)}
                          className="p-0.5 rounded text-ink-subtle hover:text-rose-400 transition-colors shrink-0"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setPendingPlan((prev) => prev ? { ...prev, milestones: prev.milestones.map((x, xi) => xi === mi ? { ...x, steps: [...x.steps, { action: '', target: [], verify: '' }] } : x) } : null)}
                      className="flex items-center gap-1 text-[10px] text-ink-muted hover:text-ink-subtle transition-colors mt-1"
                    >
                      <Plus className="w-3 h-3" /> Add step
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-line/80 shrink-0">
              <button
                onClick={() => setPendingPlan((prev) => prev ? { ...prev, milestones: [...prev.milestones, { milestone: 'New milestone', goal: '', steps: [{ action: '', target: [], verify: '' }] }] } : null)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] text-ink-subtle hover:text-ink hover:bg-elevated transition-colors"
              >
                <Plus className="w-3 h-3" /> Add milestone
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { pendingPlan.resolve([]); setPendingPlan(null); }}
                  className="px-3 py-2 rounded-lg text-[11px] text-ink-subtle hover:bg-elevated transition-colors"
                >
                  Skip plan
                </button>
                <button
                  onClick={() => { const m = pendingPlan.milestones; pendingPlan.resolve(m); setPlanSteps(m); setPendingPlan(null); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-[11px] text-ink font-semibold transition-colors"
                >
                  <Play className="w-3.5 h-3.5" /> Approve & Execute
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
