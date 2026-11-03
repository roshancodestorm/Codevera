import React, { useEffect, useRef, useState } from 'react';
import monaco, { applyEditorTheme } from './monacoSetup';
import { ideApi } from './ideApi';
import { Loader2, Play, Sparkles } from 'lucide-react';
import { CollabProvider, type CollabUser } from './CollabProvider';
import { useTheme, resolveTheme } from '../../utils/theme';

const EXT_LANG: Record<string, string> = {
  js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript',
  ts: 'typescript', tsx: 'typescript', html: 'html', htm: 'html', css: 'css',
  scss: 'scss', less: 'less', json: 'json', md: 'markdown', py: 'python',
  sh: 'shell', bash: 'shell', txt: 'plaintext', svg: 'xml', xml: 'xml',
  yaml: 'yaml', yml: 'yaml', sql: 'sql', java: 'java', go: 'go', rs: 'rust',
  c: 'c', h: 'c', cpp: 'cpp', cs: 'csharp', rb: 'ruby', php: 'php',
};

function languageOf(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return EXT_LANG[ext] || 'plaintext';
}

export interface DiffHunk {
  oldStart: number;
  oldLines: string[];
  newStart: number;
  newLines: string[];
}

export interface DiagnosticMarker {
  severity: 'error' | 'warning' | 'info';
  message: string;
  line: number;
  col: number;
  endLine: number;
  endCol: number;
  file: string;
}

interface Props {
  path: string;
  value: string;
  readOnly?: boolean;
  workspace?: string;
  diffHunks?: DiffHunk[];
  originalContent?: string;
  reveal?: { line: number; ts: number } | null;
  onChange: (value: string) => void;
  onSave: () => void;
  onAcceptHunk?: (hunkIndex: number) => void;
  onRejectHunk?: (hunkIndex: number) => void;
  onCommitted?: () => void;
  onOpenLocation?: (path: string, line: number) => void;
  onFindUsages?: (path: string, line: number, col: number, word: string) => void;
  onExtract?: (path: string, line: number, col: number, word: string) => void;
  onMarkersChange?: (markers: DiagnosticMarker[]) => void;
  collabEnabled?: boolean;
  collabUser?: string;
  collabColor?: string;
  onCollabCursorsChange?: (cursors: Map<string, CollabUser & { decorationId: string[] }>) => void;
  inlayHints?: boolean;
  vimMode?: boolean;
}

const DIFF_OPTIONS: monaco.editor.IStandaloneDiffEditorConstructionOptions = {
  automaticLayout: true,
  minimap: { enabled: false },
  fontSize: 13,
  lineHeight: 21,
  fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
  fontLigatures: true,
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  padding: { top: 14, bottom: 14 },
  renderLineHighlight: 'all',
  roundedSelection: true,
  wordWrap: 'off',
  inlineSuggest: { enabled: true, showToolbar: 'always', suppressSuggestions: false },
  quickSuggestions: { other: true, comments: false, strings: true },
  suggestOnTriggerCharacters: true,
  originalEditable: false,
  renderSideBySide: true,
  readOnly: false,
  diffWordWrap: 'off',
  renderOverviewRuler: false,
  enableSplitViewResizing: true,
  hideUnchangedRegions: {
    enabled: true,
    contextLineCount: 2,
    minimumLineCount: 3,
    revealLineCount: 12,
  },
};

type CompletionState = { workspace?: string; readOnly?: boolean; path?: string; editor: monaco.editor.IStandaloneCodeEditor | null };
const completionState: CompletionState = { editor: null };
const completionCache = new Map<string, { text: string; candidates?: { text: string; multiLine: boolean }[] } | null>();
const completionsInflight = new Map<string, AbortController>();

function hashStr(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return String(h);
}

const DEBOUNCE_MS = 80;

type DefInfo = {
  definition: { name: string; kind: string; file: string; line: number; signature?: string } | null;
  references: { file: string; line: number; text: string }[];
  total: number;
  ts?: {
    name: string;
    kind: string | null;
    signature: string | null;
    docComment: string | null;
    defLine: number;
    defCol: number;
    local: boolean;
    unresolved?: boolean;
  } | null;
};
const hoverCache = new Map<string, DefInfo>();

let hoverProviderRegistered = false;
function ensureHoverProvider() {
  if (hoverProviderRegistered) return;
  hoverProviderRegistered = true;
  monaco.languages.registerHoverProvider('*', {
    provideHover: async (model, position, token) => {
      const state = completionState;
      if (!state.workspace || !state.path) return { contents: [] };
      const ed = state.editor;
      if (!ed || ed.getModel() !== model) return { contents: [] };
      const w = model.getWordAtPosition(position);
      if (!w || !w.word.trim()) return { contents: [] };
      const key = `${state.workspace}|${state.path}|${w.word}`;
      let info = hoverCache.get(key);
      if (!info) {
        if (token.isCancellationRequested) return { contents: [] };
        const [def, ts] = await Promise.all([
          ideApi.definition(state.workspace, state.path, w.word).catch(() => null),
          ideApi.tsSymbol(state.workspace, state.path, position.lineNumber, position.column).catch(() => null),
        ]);
        if (def || ts) {
          info = {
            definition: def?.definition ?? null,
            references: def?.references ?? [],
            total: def?.total ?? 0,
            ts: ts && ts.ts && ts.symbol ? ts.symbol : null,
          };
          hoverCache.set(key, info);
          if (hoverCache.size > 120) {
            const first = hoverCache.keys().next().value;
            if (first !== undefined) hoverCache.delete(first);
          }
        } else {
          info = undefined;
        }
      }
      if (!info) return { contents: [] };
      const lines: string[] = [];
      const t = info.ts;
      const kind = t?.kind || info.definition?.kind;
      const name = t?.name || info.definition?.name || w.word;
      if (t || info.definition) {
        const sig = (t?.signature || info.definition?.signature) ? ` — ${(t?.signature || info.definition?.signature)?.slice(0, 120)}` : '';
        const fileLine = info.definition ? `\`${info.definition.file}:${info.definition.line}\`` : (t ? `\`${state.path}:${t.defLine}\`` : '');
        lines.push(`**${name}** ${kind ? `\`${kind}\`` : ''}${fileLine ? ` · ${fileLine}` : ''}${sig}`);
        if (t?.docComment) {
          lines.push('');
          lines.push(t.docComment.split('\n').slice(0, 8).join('\n'));
        }
        lines.push('');
        lines.push('`Ctrl+Click` to go to definition');
      } else {
        lines.push(`No definition found for \`${w.word}\``);
      }
      if (info.total > 0) {
        lines.push('');
        lines.push(`${info.total} reference${info.total === 1 ? '' : 's'} (showing ${Math.min(info.references.length, 6)})`);
        for (const r of info.references.slice(0, 6)) {
          lines.push(`\`${r.file}:${r.line}\` — ${r.text.slice(0, 120)}`);
        }
      }
      if (t) {
        lines.push('');
        lines.push('`F2` to rename');
      }
      const range = new monaco.Range(position.lineNumber, w.startColumn, position.lineNumber, w.endColumn);
      return { contents: [{ value: lines.join('\n') }], range };
    },
  });
}

let inlineProviderRegistered = false;
function ensureInlineProvider() {
  if (inlineProviderRegistered) return;
  inlineProviderRegistered = true;
  monaco.languages.registerInlineCompletionsProvider('*', {
    provideInlineCompletions: async (model, position, _context, token) => {
      const state = completionState;
      const ed = state.editor;
      if (!ed || ed.getModel() !== model) return { items: [] };
      if (state.readOnly || !state.workspace || !state.path) return { items: [] };
      const text = model.getValue();
      const cursor = model.getOffsetAt(position);
      if (!text.trim()) return { items: [] };
      const buildItems = (primary: string, candidates?: { text: string; multiLine: boolean }[]) => {
        const insertions: string[] = [];
        if (candidates && candidates.length) {
          for (const c of candidates) if (c && typeof c.text === 'string' && !insertions.includes(c.text)) insertions.push(c.text);
          if (!insertions.includes(primary)) insertions.push(primary);
        } else {
          insertions.push(primary);
        }
        return insertions.slice(0, 2).map((ins) => {
          const after = text.slice(cursor, cursor + 120);
          let o = 0;
          while (o < ins.length && o < after.length && ins[o] === after[o]) o++;
          const range = o > 0
            ? new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column + o)
            : new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column);
          return { insertText: ins, range };
        });
      };
      const near = text.slice(Math.max(0, cursor - 80), Math.min(text.length, cursor + 40));
      const cacheKey = `${state.workspace}|${state.path}|${cursor}|${hashStr(near)}`;
      if (completionCache.has(cacheKey)) {
        const hit = completionCache.get(cacheKey) as { text: string; candidates?: { text: string; multiLine: boolean }[] } | null;
        if (!hit || !hit.text) return { items: [] };
        return { items: buildItems(hit.text, hit.candidates) };
      }
      const inflight = completionsInflight.get(cacheKey);
      if (inflight) return { items: [] };
      const controller = new AbortController();
      completionsInflight.set(cacheKey, controller);
      const onCancel = () => controller.abort();
      const cancelDisposable = token.onCancellationRequested(onCancel);
      try {
        await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS));
        if (token.isCancellationRequested) return { items: [] };
        const res = await Promise.race<Awaited<ReturnType<typeof ideApi.completion>> | null>([
          ideApi.completion(state.workspace, state.path, text, cursor),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
        ]);
        const out = res?.text || null;
        if (out) {
          completionCache.set(cacheKey, { text: out, candidates: res?.candidates });
          if (completionCache.size > 80) {
            const first = completionCache.keys().next().value;
            if (first !== undefined) completionCache.delete(first);
          }
          if (token.isCancellationRequested) return { items: [] };
          return { items: buildItems(out, res?.candidates) };
        }
        completionCache.set(cacheKey, null);
        return { items: [] };
      } catch {
        return { items: [] };
      } finally {
        completionsInflight.delete(cacheKey);
        try { cancelDisposable.dispose(); } catch {}
      }
    },
    disposeInlineCompletions: () => {},
  });
}

export default function MonacoEditor({ path, value, readOnly, workspace, diffHunks, originalContent, reveal, onChange, onSave, onAcceptHunk, onRejectHunk, onCommitted, onOpenLocation, onFindUsages, onExtract, onMarkersChange, collabEnabled, collabUser, collabColor, onCollabCursorsChange, inlayHints, vimMode }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const diffRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const modelsRef = useRef<{ original: monaco.editor.ITextModel | null; modified: monaco.editor.ITextModel | null }>({ original: null, modified: null });
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const onAcceptHunkRef = useRef(onAcceptHunk);
  const onRejectHunkRef = useRef(onRejectHunk);
  const onCommittedRef = useRef(onCommitted);
  const onOpenLocationRef = useRef(onOpenLocation);
  const onFindUsagesRef = useRef(onFindUsages);
  const onExtractRef = useRef(onExtract);
  const onMarkersChangeRef = useRef(onMarkersChange);
  const onCollabCursorsChangeRef = useRef(onCollabCursorsChange);
  const collabRef = useRef<CollabProvider | null>(null);
  const applyingRef = useRef(false);
  const decoRef = useRef<string[]>([]);
  const zoneRef = useRef<string[]>([]);
  const [inlineOpen, setInlineOpen] = useState(false);
  const [inlinePending, setInlinePending] = useState(false);
  const [inlineBusy, setInlineBusy] = useState(false);
  const [inlineInput, setInlineInput] = useState('');
  const [inlineErr, setInlineErr] = useState<string | null>(null);
  const inlineInputRef = useRef<HTMLInputElement | null>(null);
  const inlineRangeRef = useRef<monaco.Range | null>(null);
  const inlinePreTextRef = useRef('');
  const inlineDecoRef = useRef<string[]>([]);
  const inlineOpenRef = useRef(false);
  const vimDisposableRef = useRef<{ dispose(): void } | null>(null);

  inlineOpenRef.current = inlineOpen;

  onChangeRef.current = onChange;
  onSaveRef.current = onSave;
  onAcceptHunkRef.current = onAcceptHunk;
  onRejectHunkRef.current = onRejectHunk;
  onCommittedRef.current = onCommitted;
  onOpenLocationRef.current = onOpenLocation;
  onFindUsagesRef.current = onFindUsages;
  onExtractRef.current = onExtract;
  onMarkersChangeRef.current = onMarkersChange;
  onCollabCursorsChangeRef.current = onCollabCursorsChange;

  const isDiffMode = originalContent !== undefined && !!diffHunks?.length;

  // Keep the Monaco theme in sync with the app theme (light/dark).
  const [themeMode] = useTheme();
  useEffect(() => {
    applyEditorTheme(resolveTheme(themeMode) === 'dark');
  }, [themeMode]);

  // Mount: either a side-by-side diff editor or a plain editor
  useEffect(() => {
    if (!containerRef.current) return;
    let editor: monaco.editor.IStandaloneCodeEditor | null = null;
    let diff: monaco.editor.IStandaloneDiffEditor | null = null;
    let originalModel: monaco.editor.ITextModel | null = null;
    let modifiedModel: monaco.editor.ITextModel | null = null;

    if (isDiffMode) {
      originalModel = monaco.editor.createModel(originalContent ?? '', languageOf(path));
      modifiedModel = monaco.editor.createModel(value, languageOf(path));
      diff = monaco.editor.createDiffEditor(containerRef.current, DIFF_OPTIONS);
      diff.setModel({ original: originalModel, modified: modifiedModel });
      editor = diff.getModifiedEditor();
      modelsRef.current = { original: originalModel, modified: modifiedModel };
      diffRef.current = diff;
    } else {
      editor = monaco.editor.create(containerRef.current, {
        value,
        language: languageOf(path),
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 13,
        lineHeight: 21,
        fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
        fontLigatures: true,
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        padding: { top: 14, bottom: 14 },
        renderLineHighlight: 'all',
        roundedSelection: true,
        tabSize: 2,
        readOnly: !!readOnly,
        contextmenu: true,
        wordWrap: 'off',
        inlineSuggest: { enabled: true, showToolbar: 'always', suppressSuggestions: false },
        quickSuggestions: { other: true, comments: false, strings: true },
        suggestOnTriggerCharacters: true,
      });
    }

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => onSaveRef.current());
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      if (readOnly) return;
      const model = editor.getModel();
      const sel = editor.getSelection();
      if (!model || !sel || sel.isEmpty()) {
        if (inlineOpenRef.current) {
          setInlineOpen(false);
          setInlinePending(false);
          clearInlineDeco(editor);
        }
        return;
      }
      inlineRangeRef.current = new monaco.Range(sel.startLineNumber, sel.startColumn, sel.endLineNumber, sel.endColumn);
      inlinePreTextRef.current = model.getValue();
      inlineDecoRef.current = model.deltaDecorations(inlineDecoRef.current, []);
      setInlineErr(null);
      setInlinePending(false);
      setInlineOpen(true);
      setTimeout(() => inlineInputRef.current?.focus(), 0);
    });
    editor.addAction({
      id: 'accept-next-word-inline',
      label: 'Accept Next Word (Inline Suggestion)',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.RightArrow],
      run: (ed) => {
        ed.trigger('keyboard', 'editor.action.inlineSuggest.acceptNextWord', {});
      },
    });
    editor.addAction({
      id: 'accept-next-line-inline',
      label: 'Accept Next Line (Inline Suggestion)',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.RightArrow],
      run: (ed) => {
        ed.trigger('keyboard', 'editor.action.inlineSuggest.acceptNextLine', {});
      },
    });
    editor.onMouseDown((e) => {
      if (!(e.event.ctrlKey || e.event.metaKey)) return;
      const pos = e.target.position;
      const model = editor.getModel();
      if (!model || !pos || !workspace) return;
      const w = model.getWordAtPosition(pos);
      if (!w || !w.word.trim()) return;
      void gotoDefinition(editor, model, w.word);
    });
    editor.addAction({
      id: 'rename-symbol',
      label: 'Rename symbol…',
      keybindings: [monaco.KeyCode.F2],
      contextMenuGroupId: 'navigation',
      run: (ed) => {
        const model = ed.getModel();
        const pos = ed.getPosition();
        if (!model || !pos || !workspace || readOnly) return;
        const w = model.getWordAtPosition(pos);
        if (!w || !w.word.trim()) return;
        window.dispatchEvent(
          new CustomEvent('codestrom-rename', {
            detail: { workspace, path, line: pos.lineNumber, col: w.startColumn, name: w.word },
          })
        );
      },
    });
    editor.addAction({
      id: 'find-usages',
      label: 'Find usages…',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 0.9,
      run: (ed) => {
        const model = ed.getModel();
        const pos = ed.getPosition();
        if (!model || !pos || !workspace) return;
        const w = model.getWordAtPosition(pos);
        if (!w || !w.word.trim()) return;
        onFindUsagesRef.current?.(path, pos.lineNumber, w.startColumn, w.word);
      },
    });
    editor.addAction({
      id: 'extract-symbol',
      label: 'Extract symbol…',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyE],
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 0.95,
      run: (ed) => {
        const model = ed.getModel();
        const pos = ed.getPosition();
        if (!model || !pos || !workspace || readOnly) return;
        const w = model.getWordAtPosition(pos);
        if (!w || !w.word.trim()) return;
        onExtractRef.current?.(path, pos.lineNumber, w.startColumn, w.word);
      },
    });
    // Lightbulb: in-place AI rewrite for squiggled errors (diff-previewed via Accept/Reject)
    editor.addAction({
      id: 'neural-ai-fix',
      label: 'Fix with Neural AI (rewrite in place)',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1,
      run: (ed) => {
        const model = ed.getModel();
        const pos = ed.getPosition();
        if (!model || !pos || !workspace || readOnly) return;
        const markers = monaco.editor.getModelMarkers({ owner: 'neural-ts' })
          .filter((m) => m.startLineNumber <= pos.lineNumber && m.endLineNumber >= pos.lineNumber);
        const sel = ed.getSelection();
        let rng: monaco.Range | null = null;
        if (sel && !sel.isEmpty()) {
          rng = new monaco.Range(sel.startLineNumber, sel.startColumn, sel.endLineNumber, sel.endColumn);
        } else if (markers[0]) {
          rng = new monaco.Range(markers[0].startLineNumber, markers[0].startColumn, markers[0].endLineNumber, markers[0].endColumn);
        } else {
          rng = new monaco.Range(pos.lineNumber, 1, pos.lineNumber, model.getLineMaxColumn(pos.lineNumber));
        }
        const line = model.getLineContent(pos.lineNumber);
        const msgs = markers.slice(0, 3).map((m) => m.message);
        const instruction = msgs.length
          ? `Fix the reported errors. ${msgs.map((m) => `Error: ${m}`).join('\n')}\nContext line: ${line}`
          : `Improve the selected code. Keep behavior identical unless the context line suggests a clear fix.\nContext line: ${line}`;
        void runInlineEdit(rng, instruction, msgs);
      },
    });
    // Alt path: full autonomous agent fix (unchanged behavior, kept as a separate menu item)
    editor.addAction({
      id: 'neural-ai-fix-agent',
      label: 'Fix with AI Agent (autonomous, whole project)',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 2,
      run: (ed) => {
        const model = ed.getModel();
        const pos = ed.getPosition();
        if (!model || !pos || !workspace || readOnly) return;
        const markers = monaco.editor.getModelMarkers({ owner: 'neural-ts' })
          .filter((m) => m.startLineNumber <= pos.lineNumber && m.endLineNumber >= pos.lineNumber);
        const msg = markers[0]?.message ?? 'Fix the error at the cursor';
        const line = model.getLineContent(pos.lineNumber);
        const instruction = `Fix: ${msg}. Context line: ${line}`;
        window.dispatchEvent(new CustomEvent('codestrom-inline-fix', {
          detail: { workspace, path, instruction, markers: markers.slice(0, 3).map((m) => m.message) },
        }));
      },
    });
    ensureHoverProvider();
    editor.onDidChangeModelContent(() => {
      if (!applyingRef.current) onChangeRef.current(editor!.getValue());
    });
    editorRef.current = editor;
    ensureInlineProvider();
    const bindState = () => {
      completionState.workspace = workspace;
      completionState.readOnly = readOnly;
      completionState.path = path;
      completionState.editor = editor;
    };
    bindState();
    const focusDisposable = editor.onDidFocusEditorText(bindState);

    // Collab: connect provider if enabled (non-diff mode only)
    let cursorDisposable: { dispose(): void } | null = null;
    let contentDisposable: { dispose(): void } | null = null;
    if (collabEnabled && workspace && !isDiffMode) {
      const color = collabColor || '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
      const prov = new CollabProvider({
        workspace,
        user: collabUser || 'Guest',
        color,
        model: editor.getModel()!,
        editor,
        monacoRef: monaco,
      });
      prov.onCursorsChange = (cursors) => {
        onCollabCursorsChangeRef.current?.(cursors as any);
      };
      prov.connect();
      collabRef.current = prov;
      cursorDisposable = editor.onDidChangeCursorPosition((e) => {
        prov.sendCursor(e.position.lineNumber, e.position.column);
      });
      contentDisposable = editor.onDidChangeModelContent(() => {
        if (!applyingRef.current) prov.pushLocalUpdate(editor!.getValue());
      });
    }

    return () => {
      focusDisposable.dispose();
      cursorDisposable?.dispose();
      contentDisposable?.dispose();
      collabRef.current?.destroy();
      collabRef.current = null;
      if (completionState.editor === editor) completionState.editor = null;
      editor.dispose();
      diff?.dispose();
      if (modelsRef.current.original) modelsRef.current.original.dispose();
      if (modelsRef.current.modified) modelsRef.current.modified.dispose();
      modelsRef.current = { original: null, modified: null };
      diffRef.current = null;
      editorRef.current = null;
      decoRef.current = [];
      zoneRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, isDiffMode, collabEnabled, workspace, collabUser, collabColor]);

  // Sync external value into the modified model
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const current = ed.getModel()?.getValue();
    if (current === value) return;
    const pos = ed.getPosition();
    applyingRef.current = true;
    ed.getModel()?.setValue(value);
    if (pos) ed.setPosition(pos);
    applyingRef.current = false;
  }, [value]);

  // Diagnostics: TS/JS via tsindexer, Python/Go/Rust via lang/diagnostics
  useEffect(() => {
    if (!workspace || readOnly) return;
    const ext = path.split('.').pop()?.toLowerCase() ?? '';
    const isTs = ['ts', 'tsx', 'js', 'jsx', 'mjs'].includes(ext);
    const isLang = ['py', 'go', 'rs'].includes(ext);
    if (!isTs && !isLang) return;
    const OWNER = isTs ? 'neural-ts' : 'neural-lang';
    const DELAY = ext === 'rs' ? 3000 : 1500; // cargo check is slow
    const t = setTimeout(async () => {
      const ed = editorRef.current;
      const model = ed?.getModel();
      if (!model) return;
      try {
        const src = isTs
          ? await ideApi.tsDiagnostics(workspace, path, model.getValue())
          : await ideApi.langDiagnostics(workspace, path, model.getValue());
        const markers: monaco.editor.IMarkerData[] = src.diagnostics.map((d) => ({
          severity: d.severity === 'error'
            ? monaco.MarkerSeverity.Error
            : d.severity === 'warning'
              ? monaco.MarkerSeverity.Warning
              : monaco.MarkerSeverity.Info,
          message: isTs && (d as any).code ? `TS${(d as any).code}: ${d.message}` : d.message,
          startLineNumber: d.line,
          startColumn: d.col,
          endLineNumber: d.endLine,
          endColumn: d.endCol + 1,
          source: isTs ? 'Neural IDE' : ext === 'py' ? 'pyflakes' : ext === 'go' ? 'go vet' : 'cargo check',
        }));
        monaco.editor.setModelMarkers(model, OWNER, markers);
      } catch {}
    }, DELAY);
    return () => {
      clearTimeout(t);
      const model = editorRef.current?.getModel();
      if (model) monaco.editor.setModelMarkers(model, OWNER, []);
    };
  }, [value, workspace, path, readOnly]);

  // Emit marker changes to parent so it can show a Problems panel
  useEffect(() => {
    const disposable = monaco.editor.onDidChangeMarkers((uris) => {
      const model = editorRef.current?.getModel();
      if (!model) return;
      if (!uris.some((u) => u.toString() === model.uri.toString())) return;
      const raw = monaco.editor.getModelMarkers({ resource: model.uri });
      const mapped: DiagnosticMarker[] = raw.map((m) => ({
        severity: m.severity === monaco.MarkerSeverity.Error ? 'error' : m.severity === monaco.MarkerSeverity.Warning ? 'warning' : 'info',
        message: m.message,
        line: m.startLineNumber,
        col: m.startColumn,
        endLine: m.endLineNumber,
        endCol: m.endColumn,
        file: path,
      }));
      onMarkersChangeRef.current?.(mapped);
    });
    return () => disposable.dispose();
  }, [path]);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.updateOptions({ readOnly: !!readOnly });
    if (!isDiffMode) {
      const model = ed.getModel();
      if (model) monaco.editor.setModelLanguage(model, languageOf(path));
    }
  }, [readOnly, path, isDiffMode]);

  // Inlay hints — toggle TypeScript parameter + return-type hints
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const lang = languageOf(path);
    if ((lang === 'typescript' || lang === 'javascript') && monaco.typescript) {
      const tsDefaults = (monaco.typescript as unknown as { typescriptDefaults?: { setInlayHintsOptions(o: Record<string, unknown>): void } }).typescriptDefaults;
      if (tsDefaults) tsDefaults.setInlayHintsOptions({
        includeInlayParameterNameHints: inlayHints ? 'all' : 'none',
        includeInlayParameterNameHintsWhenArgumentMatchesName: false,
        includeInlayFunctionParameterTypeHints: !!inlayHints,
        includeInlayVariableTypeHints: !!inlayHints,
        includeInlayPropertyDeclarationTypeHints: !!inlayHints,
        includeInlayFunctionLikeReturnTypeHints: !!inlayHints,
        includeInlayEnumMemberValueHints: !!inlayHints,
      });
    }
  }, [inlayHints, path]);

  // Vim mode — load monaco-vim lazily and toggle on/off
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed || isDiffMode) return;
    if (vimMode) {
      import('monaco-vim').then((mod) => {
        // Clean up any existing vim instance first
        vimDisposableRef.current?.dispose();
        const statusNode = document.createElement('div');
        statusNode.style.cssText = 'position:absolute;bottom:0;left:0;right:0;height:20px;background:#0c0c10;color:#a1a1aa;font-size:11px;font-family:monospace;padding:2px 8px;z-index:10;pointer-events:none;';
        ed.getDomNode()?.appendChild(statusNode);
        const vim = (mod as any).initVimMode(ed, statusNode);
        vimDisposableRef.current = {
          dispose: () => {
            vim?.dispose?.();
            statusNode.remove();
          },
        };
      }).catch(() => {});
    } else {
      vimDisposableRef.current?.dispose();
      vimDisposableRef.current = null;
    }
  }, [vimMode, isDiffMode]);

  // ── LSP bridge: connect to backend proxy for .py / .go files ─────────────────
  useEffect(() => {
    if (!workspace || readOnly || isDiffMode) return;
    const ext = path.split('.').pop()?.toLowerCase() ?? '';
    const langMap: Record<string, string> = { py: 'python', go: 'go' };
    const lspLang = langMap[ext];
    if (!lspLang) return;

    const BACKEND_WS = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/^http/, 'ws');
    const wsUrl = `${BACKEND_WS}/api/ide/lsp?lang=${lspLang}`;
    let ws: WebSocket;
    let disposed = false;
    let reqIdCounter = 1;
    const pending = new Map<number, (result: any) => void>();

    function send(msg: object) {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    }

    // LSP message ID counter
    function nextId() { return reqIdCounter++; }

    const URI = `file:///${path.replace(/\\/g, '/')}`;

    ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      if (disposed) { ws.close(); return; }
      // Initialize LSP
      const initId = nextId();
      send({ jsonrpc: '2.0', id: initId, method: 'initialize', params: {
        processId: null, clientInfo: { name: 'Codestrom Neural IDE' },
        capabilities: { textDocument: { completion: { completionItem: { snippetSupport: false } }, hover: {}, definition: {} } },
        rootUri: null,
      }});
      pending.set(initId, () => {
        send({ jsonrpc: '2.0', method: 'initialized', params: {} });
        send({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
          textDocument: { uri: URI, languageId: lspLang, version: 1, text: editorRef.current?.getModel()?.getValue() || '' }
        }});
      });
    };

    ws.onmessage = (ev) => {
      let msg: any;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.id !== undefined && pending.has(msg.id)) {
        const cb = pending.get(msg.id)!;
        pending.delete(msg.id);
        cb(msg.result);
      }
      // Server-pushed diagnostics
      if (msg.method === 'textDocument/publishDiagnostics') {
        const params = msg.params || {};
        const diags: monaco.editor.IMarkerData[] = (params.diagnostics || []).map((d: any) => ({
          severity: d.severity === 1 ? monaco.MarkerSeverity.Error : d.severity === 2 ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Info,
          message: d.message,
          startLineNumber: (d.range?.start?.line ?? 0) + 1,
          startColumn: (d.range?.start?.character ?? 0) + 1,
          endLineNumber: (d.range?.end?.line ?? 0) + 1,
          endColumn: (d.range?.end?.character ?? 0) + 1,
          source: lspLang === 'python' ? 'pylsp' : 'gopls',
        }));
        const model = editorRef.current?.getModel();
        if (model) monaco.editor.setModelMarkers(model, 'lsp-' + lspLang, diags);
      }
    };

    // Notify LSP of content changes
    let docVersion = 2;
    const changeDisposable = editorRef.current?.onDidChangeModelContent(() => {
      if (disposed || ws.readyState !== WebSocket.OPEN) return;
      send({ jsonrpc: '2.0', method: 'textDocument/didChange', params: {
        textDocument: { uri: URI, version: docVersion++ },
        contentChanges: [{ text: editorRef.current?.getModel()?.getValue() || '' }],
      }});
    });

    // Register LSP completion provider for this language
    const compDisposable = monaco.languages.registerCompletionItemProvider(lspLang, {
      triggerCharacters: ['.', '(', ',', ' '],
      provideCompletionItems: async (model, position) => {
        if (model !== editorRef.current?.getModel() || ws.readyState !== WebSocket.OPEN) return { suggestions: [] };
        return new Promise((resolve) => {
          const id = nextId();
          const timeout = setTimeout(() => { pending.delete(id); resolve({ suggestions: [] }); }, 3000);
          pending.set(id, (result) => {
            clearTimeout(timeout);
            const items = Array.isArray(result?.items) ? result.items : Array.isArray(result) ? result : [];
            resolve({
              suggestions: items.slice(0, 40).map((item: any) => ({
                label: item.label,
                kind: (monaco.languages.CompletionItemKind as any)[
                  ['Text','Method','Function','Constructor','Field','Variable','Class','Interface','Module','Property','Unit','Value','Enum','Keyword','Snippet','Color','File','Reference','Folder','EnumMember','Constant','Struct','Event','Operator','TypeParameter'][item.kind - 1] || 'Text'
                ] ?? monaco.languages.CompletionItemKind.Text,
                insertText: item.insertText || item.label,
                detail: item.detail,
                documentation: typeof item.documentation === 'object' ? item.documentation?.value : item.documentation,
                range: { startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber, endColumn: position.column },
              })),
            });
          });
          send({ jsonrpc: '2.0', id, method: 'textDocument/completion', params: {
            textDocument: { uri: URI },
            position: { line: position.lineNumber - 1, character: position.column - 1 },
          }});
        });
      },
    });

    return () => {
      disposed = true;
      changeDisposable?.dispose();
      compDisposable.dispose();
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        try { send({ jsonrpc: '2.0', method: 'textDocument/didClose', params: { textDocument: { uri: URI } } }); } catch {}
        ws.close();
      }
      const model = editorRef.current?.getModel();
      if (model) monaco.editor.setModelMarkers(model, 'lsp-' + lspLang, []);
    };
  }, [path, workspace, readOnly, isDiffMode]);

  // Highlight added lines on the modified side
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const decorations: monaco.editor.IModelDeltaDecoration[] = [];
    for (const hunk of diffHunks || []) {
      const start = hunk.newStart;
      hunk.newLines.forEach((_, i) => {
        const line = start + i;
        if (line >= 1) {
          decorations.push({
            range: new monaco.Range(line, 1, line, 1),
            options: {
              isWholeLine: true,
              className: 'ide-diff-add-line',
              linesDecorationsClassName: 'ide-diff-add-gutter',
            },
          });
        }
      });
    }
    decoRef.current = ed.deltaDecorations(decoRef.current, decorations);
  }, [diffHunks, value]);

  // Accept/Reject zones on the modified side
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.changeViewZones((accessor) => {
      for (const id of zoneRef.current) accessor.removeZone(id);
      zoneRef.current = [];
      const hunks = diffHunks || [];
      if (!hunks.length) return;
      hunks.forEach((hunk, i) => {
        if (readOnly) return;
        const dom = document.createElement('div');
        dom.className = 'ide-diff-zone';
        const bar = document.createElement('div');
        bar.className = 'ide-diff-zone-bar';
        const label = document.createElement('span');
        label.className = 'ide-diff-zone-label';
        label.textContent = `${hunk.oldLines.length ? '−' + hunk.oldLines.length : ''}${hunk.newLines.length ? ' +' + hunk.newLines.length : ''} changed`;
        const btnAccept = document.createElement('button');
        btnAccept.className = 'ide-diff-btn ide-diff-btn-accept';
        btnAccept.textContent = 'Accept';
        const btnReject = document.createElement('button');
        btnReject.className = 'ide-diff-btn ide-diff-btn-reject';
        btnReject.textContent = 'Reject';
        btnAccept.addEventListener('click', (e) => { e.stopPropagation(); onAcceptHunkRef.current?.(i); });
        btnReject.addEventListener('click', (e) => { e.stopPropagation(); onRejectHunkRef.current?.(i); });
        bar.append(label, btnAccept, btnReject);
        dom.appendChild(bar);
        if (hunk.oldLines.length) {
          const removed = document.createElement('div');
          removed.className = 'ide-diff-zone-removed';
          hunk.oldLines.forEach((line) => {
            const row = document.createElement('div');
            row.className = 'ide-diff-removed-line';
            const pm = document.createElement('span');
            pm.className = 'ide-diff-pm';
            pm.textContent = '−';
            const txt = document.createElement('span');
            txt.textContent = line;
            row.append(pm, txt);
            removed.appendChild(row);
          });
          dom.appendChild(removed);
        }
        const beforeLine = Math.max(0, hunk.newStart - 1);
        const id = accessor.addZone({
          afterLineNumber: beforeLine,
          domNode: dom,
          suppressMouseDown: true,
        });
        zoneRef.current.push(id);
      });
    });
  }, [diffHunks, value, readOnly]);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed || !reveal || reveal.line < 1) return;
    const line = Math.min(reveal.line, ed.getModel()?.getLineCount() ?? reveal.line);
    ed.revealLineInCenter(line);
    ed.setPosition({ lineNumber: line, column: 1 });
    ed.focus();
  }, [reveal]);

  const clearInlineDeco = (ed: monaco.editor.ICodeEditor | null) => {
    if (ed && ed.getModel()) {
      inlineDecoRef.current = ed.getModel()!.deltaDecorations(inlineDecoRef.current, []);
    } else {
      inlineDecoRef.current = [];
    }
  };

  const runInlineEdit = async (rng: monaco.Range, instr: string, extraMarkers: string[] = []) => {
    const ed = editorRef.current;
    const model = ed?.getModel();
    if (!ed || !model || !instr || inlineBusy || !workspace) return;
    setInlineBusy(true);
    setInlineErr(null);
    try {
      const startOffset = model.getOffsetAt({ lineNumber: rng.startLineNumber, column: rng.startColumn });
      const endOffset = model.getOffsetAt({ lineNumber: rng.endLineNumber, column: rng.endColumn });
      const selected = model.getValueInRange(rng);
      const res = await ideApi.inlineEdit(workspace, path, model.getValue(), startOffset, endOffset, instr, extraMarkers);
      if (!res.ok || !res.replacement) {
        setInlineErr('The model returned an empty replacement. Try rephrasing the instruction.');
        return;
      }
      inlinePreTextRef.current = model.getValue();
      await ideApi.checkpointCreate(workspace, 'Inline edit').catch(() => {});
      applyingRef.current = true;
      model.pushEditOperations([], [{ range: rng, text: res.replacement }], () => null);
      applyingRef.current = false;
      ed.pushUndoStop();
      const newStart = model.getPositionAt(startOffset);
      const newEnd = model.getPositionAt(startOffset + res.replacement.length);
      inlineDecoRef.current = model.deltaDecorations(inlineDecoRef.current, [
        {
          range: new monaco.Range(newStart.lineNumber, 1, newEnd.lineNumber, 1),
          options: {
            isWholeLine: true,
            className: 'ide-inline-edited',
            linesDecorationsClassName: 'ide-inline-edited-gutter',
          },
        },
      ]);
      setInlineOpen(true);
      setInlinePending(true);
      setInlineInput('');
    } catch (err: any) {
      setInlineErr(String(err.message || err));
    } finally {
      setInlineBusy(false);
    }
  };

  const applyInline = async () => {
    const ed = editorRef.current;
    const model = ed?.getModel();
    const instr = inlineInput.trim();
    if (!ed || !model || !instr || inlineBusy || !workspace) return;
    const rng = inlineRangeRef.current;
    if (!rng) return;
    await runInlineEdit(rng, instr);
  };

  const acceptInline = async () => {
    const ed = editorRef.current;
    const model = ed?.getModel();
    if (!ed || !model || !workspace) return;
    clearInlineDeco(ed);
    setInlineOpen(false);
    setInlinePending(false);
    try {
      await ideApi.writeFile(workspace, path, model.getValue());
      onCommittedRef.current?.();
    } catch (err: any) {
      setInlineErr(String(err.message || err));
    }
  };

  const rejectInline = () => {
    const ed = editorRef.current;
    if (!ed) return;
    clearInlineDeco(ed);
    setInlineOpen(false);
    setInlinePending(false);
    applyingRef.current = true;
    ed.getModel()?.setValue(inlinePreTextRef.current);
    applyingRef.current = false;
  };

  const closeInline = () => {
    if (inlinePending) rejectInline();
    else setInlineOpen(false);
  };

  const gotoDefinition = async (ed: monaco.editor.ICodeEditor, model: monaco.editor.ITextModel, word: string) => {
    if (!workspace) return;
    try {
      const r = await ideApi.definition(workspace, path, word);
      if (r.definition) {
        const d = r.definition;
        if (d.file === path) {
          ed.revealLineInCenter(d.line);
          ed.setPosition({ lineNumber: d.line, column: 1 });
          ed.focus();
        } else {
          onOpenLocationRef.current?.(d.file, d.line);
        }
      } else if (model.getValue().includes(`function ${word}`)) {
        const m = model.getValue().split('\n').findIndex((l) => l.includes(`function ${word}`));
        if (m >= 0) {
          ed.revealLineInCenter(m + 1);
          ed.setPosition({ lineNumber: m + 1, column: 1 });
          ed.focus();
        }
      }
    } catch {}
  };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {inlineOpen && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 w-[580px] max-w-[92%] rounded-lg border border-amber-500/40 bg-surface shadow-2xl shadow-black/60 overflow-hidden">
          {inlinePending ? (
            <div className="flex items-center gap-2 px-3 py-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] text-emerald-300">Edit applied — review it, then accept or reject</span>
              <div className="flex-1" />
              <button
                onClick={() => void acceptInline()}
                className="px-2.5 py-1 text-[11px] rounded bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-colors"
              >
                Accept
              </button>
              <button
                onClick={rejectInline}
                className="px-2.5 py-1 text-[11px] rounded bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 transition-colors"
              >
                Reject
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <input
                ref={inlineInputRef}
                value={inlineInput}
                onChange={(e) => setInlineInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void applyInline();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    closeInline();
                  }
                }}
                placeholder={readOnly ? 'Read-only file' : 'Edit selection — e.g. "use arrow function, rename to greet"'}
                disabled={inlineBusy || readOnly}
                className="flex-1 bg-transparent text-xs text-ink outline-none placeholder:text-ink-muted disabled:opacity-50"
                spellCheck={false}
                autoComplete="off"
              />
              {inlineBusy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
              ) : (
                <button
                  onClick={() => void applyInline()}
                  disabled={!inlineInput.trim() || readOnly}
                  className="p-1 rounded text-amber-300 hover:bg-amber-500/15 transition-colors disabled:opacity-40"
                  title="Apply (Enter)"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          {inlineErr && <div className="px-3 pb-2 text-[11px] text-rose-400">{inlineErr}</div>}
        </div>
      )}
    </div>
  );
}
