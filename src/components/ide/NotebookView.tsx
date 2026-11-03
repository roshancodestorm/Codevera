import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Loader2, Play, Plus, RefreshCw, X } from 'lucide-react';
import { ideApi } from './ideApi';

interface Cell {
  id: number;
  title: string;
  source: string;
  startLine: number;
}

interface CellResult {
  ok: boolean;
  output: string;
  exitCode: number;
}

interface Props {
  workspace: string;
  file: string;
  lang: string;
  onClose: () => void;
}

export default function NotebookView({ workspace, file, lang, onClose }: Props) {
  const [cells, setCells] = useState<Cell[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<number, CellResult>>({});
  const [running, setRunning] = useState<Record<number, boolean>>({});
  const [editedSources, setEditedSources] = useState<Record<number, string>>({});
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  const load = useCallback(async () => {
    if (!workspace || !file) return;
    setLoading(true);
    try {
      const r = await ideApi.cellParse(workspace, file);
      setCells(r.cells);
      setResults({});
      setEditedSources({});
    } catch {}
    setLoading(false);
  }, [workspace, file]);

  useEffect(() => { load(); }, [load]);

  const runCell = async (cell: Cell) => {
    const source = editedSources[cell.id] ?? cell.source;
    setRunning((r) => ({ ...r, [cell.id]: true }));
    try {
      const r = await ideApi.cellRun(workspace, source, lang);
      setResults((prev) => ({ ...prev, [cell.id]: r }));
    } catch (err: any) {
      setResults((prev) => ({ ...prev, [cell.id]: { ok: false, output: err.message, exitCode: -1 } }));
    } finally {
      setRunning((r) => ({ ...r, [cell.id]: false }));
    }
  };

  const runAll = async () => {
    for (const cell of cells) {
      await runCell(cell);
    }
  };

  const addCell = () => {
    const newCell: Cell = { id: Date.now(), title: `Cell ${cells.length + 1}`, source: '', startLine: -1 };
    setCells((prev) => [...prev, newCell]);
    setEditedSources((s) => ({ ...s, [newCell.id]: '' }));
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-line shrink-0 bg-canvas">
        <span className="text-[11px] font-semibold text-ink truncate flex-1">{file.split('/').pop()} — Notebook</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 border border-line-strong/30 text-ink">{lang}</span>
        <button onClick={load} className="p-1 text-ink-muted hover:text-ink transition-colors" title="Reload cells">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={runAll}
          disabled={loading || cells.length === 0}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-ink text-[10px] disabled:opacity-40 transition-colors"
        >
          <Play className="w-3 h-3" /> Run All
        </button>
        <button onClick={addCell} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-elevated border border-line text-[10px] text-ink hover:bg-elevated transition-colors">
          <Plus className="w-3 h-3" /> Cell
        </button>
        <button onClick={onClose} className="p-1 text-ink-muted hover:text-ink transition-colors" title="Close notebook">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cells */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-3">
        {loading && <div className="flex items-center gap-2 text-[11px] text-ink-muted"><Loader2 className="w-3 h-3 animate-spin" /> Parsing cells…</div>}
        {!loading && cells.length === 0 && (
          <div className="text-center py-8">
            <p className="text-[12px] text-ink-muted mb-2">No cells found</p>
            <p className="text-[11px] text-ink-muted">Add <code className="bg-elevated px-1 rounded">{'# %%'}</code> markers to split this file into cells</p>
            <button onClick={addCell} className="mt-3 flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-lg bg-accent text-accent-fg text-[11px] hover:bg-accent transition-colors">
              <Plus className="w-3 h-3" /> Add first cell
            </button>
          </div>
        )}
        {cells.map((cell) => {
          const isRunning = running[cell.id];
          const result = results[cell.id];
          const source = editedSources[cell.id] ?? cell.source;
          const isCollapsed = collapsed[cell.id];
          return (
            <div key={cell.id} className="rounded-xl border border-line overflow-hidden bg-canvas">
              {/* Cell header */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-surface/60 border-b border-line">
                <button onClick={() => setCollapsed((c) => ({ ...c, [cell.id]: !c[cell.id] }))} className="text-ink-muted hover:text-ink transition-colors">
                  {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                <span className="text-[10px] text-ink-subtle flex-1 truncate">{cell.title}</span>
                {cell.startLine >= 0 && <span className="text-[9px] text-ink-muted">L{cell.startLine + 1}</span>}
                <button
                  onClick={() => runCell(cell)}
                  disabled={isRunning}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600/20 border border-emerald-500/30 text-[10px] text-emerald-300 hover:bg-emerald-600/30 disabled:opacity-40 transition-colors"
                >
                  {isRunning ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Play className="w-2.5 h-2.5" />}
                  Run
                </button>
              </div>

              {/* Cell source */}
              {!isCollapsed && (
                <textarea
                  value={source}
                  onChange={(e) => setEditedSources((s) => ({ ...s, [cell.id]: e.target.value }))}
                  className="w-full p-3 bg-transparent text-[11px] font-mono text-ink outline-none resize-none min-h-[60px]"
                  style={{ height: Math.min(Math.max((source.split('\n').length + 1) * 18, 60), 400) }}
                  spellCheck={false}
                />
              )}

              {/* Cell output */}
              {result && !isCollapsed && (
                <div className={`border-t border-line px-3 py-2 ${result.ok ? 'bg-emerald-500/3' : 'bg-rose-500/3'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {result.ok ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> : <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />}
                    <span className={`text-[10px] font-medium ${result.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{result.ok ? 'Success' : `Exit ${result.exitCode}`}</span>
                  </div>
                  {result.output && (
                    <pre className="text-[11px] font-mono text-ink whitespace-pre-wrap break-words max-h-48 overflow-y-auto">{result.output}</pre>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
