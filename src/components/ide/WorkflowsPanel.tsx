import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Play, Plus, Save, Trash2, Workflow as WorkflowIcon, X } from 'lucide-react';
import { ideApi } from './ideApi';

interface Workflow {
  slug: string;
  name: string;
  description: string;
  steps: { title: string; prompt: string }[];
  updatedAt: number;
}

export default function WorkflowsPanel({ workspace, readOnly }: { workspace: string; readOnly: boolean }) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; description: string; steps: { title: string; prompt: string }[] }>({ name: '', description: '', steps: [{ title: '', prompt: '' }] });
  const [runLogs, setRunLogs] = useState<string[]>([]);
  const [runName, setRunName] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const logRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await ideApi.workflowsList(workspace);
      setWorkflows(r.workflows || []);
    } catch (e: any) {
      setError(e.message);
    }
  }, [workspace]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [runLogs]);

  const startNew = () => {
    setEditing('');
    setDraft({ name: '', description: '', steps: [{ title: 'Step 1', prompt: '' }] });
  };

  const startEdit = (w: Workflow) => {
    setEditing(w.slug);
    setDraft({ name: w.name, description: w.description, steps: w.steps.map((s) => ({ title: s.title, prompt: s.prompt })) });
  };

  const updateStep = (i: number, patch: Partial<{ title: string; prompt: string }>) => {
    setDraft((d) => ({ ...d, steps: d.steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));
  };

  const addStep = () => setDraft((d) => ({ ...d, steps: [...d.steps, { title: '', prompt: '' }] }));
  const removeStep = (i: number) => setDraft((d) => ({ ...d, steps: d.steps.filter((_, idx) => idx !== i) }));

  const save = async () => {
    if (!draft.name.trim() || busy || readOnly) return;
    const steps = draft.steps.filter((s) => s.prompt.trim()).map((s) => ({ title: s.title.trim() || 'Step', prompt: s.prompt.trim() }));
    if (!steps.length) {
      setError('Add at least one step with a prompt.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await ideApi.workflowsSave(workspace, { name: draft.name.trim(), description: draft.description.trim(), steps });
      setEditing(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (name: string) => {
    try {
      await ideApi.workflowsDelete(workspace, name);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const runWorkflow = (w: Workflow) => {
    if (running) return;
    setRunning(true);
    setRunName(w.name);
    setRunLogs([]);
    ideApi.workflowsRun(
      workspace,
      w.slug,
      (ev) => setRunLogs((prev) => [...prev, `[step ${ev.index + 1}/${ev.total}] ${ev.title}`]),
      (ev) => {
        setRunLogs((prev) => [...prev, ev.failed ? `FAILED: ${ev.summary}` : `DONE: ${ev.summary}${ev.files?.length ? ` (${ev.files.length} file${ev.files.length === 1 ? '' : 's'} changed)` : ''}`]);
        setRunning(false);
      },
      (msg) => {
        setRunLogs((prev) => [...prev, `ERROR: ${msg}`]);
        setRunning(false);
      }
    );
  };

  return (
    <div className="flex flex-col gap-2.5 h-full">
      <div className="flex items-center gap-2">
        <button
          onClick={startNew}
          disabled={readOnly || editing !== null}
          className={`flex items-center justify-center gap-1.5 flex-1 py-2 rounded-lg text-[11px] transition-colors ${editing !== null ? 'bg-elevated text-ink' : 'bg-accent text-accent-fg hover:bg-accent'}`}
        >
          <Plus className="w-3.5 h-3.5" /> New workflow
        </button>
        {editing !== null && (
          <button onClick={() => setEditing(null)} className="p-2 rounded-lg text-[10px] text-ink-muted hover:text-ink hover:bg-elevated transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {editing !== null && (
        <div className="rounded-lg border border-line-strong/30 bg-surface p-3 space-y-2 max-h-[55%] overflow-y-auto scrollbar-thin">
          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Workflow name (e.g. release-flow)"
            disabled={editing !== ''}
            className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11px] font-mono text-ink outline-none focus:border-line-strong/60 placeholder:text-ink-muted disabled:opacity-50"
          />
          <input
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="Description (optional)"
            className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-[11px] text-ink outline-none focus:border-line-strong/60 placeholder:text-ink-muted"
          />
          <div className="text-[10px] font-semibold tracking-widest text-ink-muted uppercase">Steps (run in order)</div>
          {draft.steps.map((s, i) => (
            <div key={i} className="rounded-md border border-line bg-surface p-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-ink-muted w-4">{i + 1}.</span>
                <input
                  value={s.title}
                  onChange={(e) => updateStep(i, { title: e.target.value })}
                  placeholder="Step title"
                  className="flex-1 rounded border border-line bg-surface px-2 py-1 text-[10px] text-ink outline-none focus:border-line-strong/60 placeholder:text-ink-muted"
                />
                <button onClick={() => removeStep(i)} className="p-1 rounded text-ink-muted hover:text-rose-400" title="Remove step">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <textarea
                value={s.prompt}
                onChange={(e) => updateStep(i, { prompt: e.target.value })}
                placeholder="Prompt for this step, e.g. Scaffold a REST API with Express — create server.js, routes/, and a README section."
                className="w-full rounded border border-line bg-surface px-2 py-1 text-[10px] font-mono text-ink outline-none focus:border-line-strong/60 resize-y placeholder:text-ink-muted"
              />
            </div>
          ))}
          <button onClick={addStep} className="w-full py-1.5 rounded-md border border-dashed border-line text-[10px] text-ink-subtle hover:text-ink hover:border-line transition-colors">
            + Add step
          </button>
          <button onClick={() => void save()} disabled={busy || !draft.name.trim() || readOnly} className="w-full py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-[11px] text-ink transition-colors disabled:opacity-40">
            {busy ? 'Saving…' : 'Save workflow'}
          </button>
        </div>
      )}

      {error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[10px] text-rose-300 break-words">{error}</div>}

      {runName && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2 space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] text-emerald-300">
            {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <WorkflowIcon className="w-3 h-3" />} Running: {runName}
          </div>
          <div ref={logRef} className="max-h-28 overflow-y-auto scrollbar-thin space-y-0.5 text-[10px] font-mono text-ink-subtle">
            {runLogs.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
          {!running && runLogs.length > 0 && (
            <button onClick={() => setRunName(null)} className="text-[10px] text-ink-muted hover:text-ink">Dismiss</button>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin space-y-2 pr-0.5">
        {workflows.length === 0 && (
          <div className="text-[10px] text-ink-muted leading-relaxed pt-1">
            No workflows yet. Workflows live in <code className="text-ink-subtle">.codestrom/workflows/*.json</code> and run steps in order —
            each step is delegated to the model, which writes files. Save a reusable recipe like "add a landing page" or "release flow".
          </div>
        )}
        {workflows.map((w) => (
          <div key={w.slug} className="rounded-lg border border-line bg-surface overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2">
              <WorkflowIcon className="w-3.5 h-3.5 text-ink-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-ink font-medium truncate">{w.name}</div>
                {w.description && <div className="text-[9px] text-ink-muted truncate">{w.description}</div>}
              </div>
              <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-elevated/60 text-ink">{w.steps.length} steps</span>
              <button onClick={() => runWorkflow(w)} disabled={running || readOnly} className="p-1.5 rounded-md bg-emerald-600/15 text-emerald-300 hover:bg-emerald-600/25 transition-colors disabled:opacity-40" title="Run workflow">
                <Play className="w-3 h-3" />
              </button>
              <button onClick={() => startEdit(w)} disabled={readOnly} className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-elevated transition-colors" title="Edit">
                <Save className="w-3 h-3" />
              </button>
              <button onClick={() => void remove(w.slug)} disabled={readOnly} className="p-1 rounded-md text-ink-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors" title="Delete">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <div className="border-t border-line/60 px-3 py-2 text-[10px] text-ink-muted space-y-0.5">
              {w.steps.map((s, i) => (
                <div key={i} className="truncate">
                  <span className="text-ink-muted">{i + 1}.</span> <span className="text-ink">{s.title}</span> — {s.prompt}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
