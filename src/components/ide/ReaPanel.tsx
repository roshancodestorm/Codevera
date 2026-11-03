import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronRight, Clock, Copy, Download, FileJson, Loader2, Play, RefreshCw, Search, Square } from 'lucide-react';
import { ideApi } from './ideApi';
import type { ReaJob } from './ideApi';

interface ReaKind {
  id: string;
  label: string;
  description: string;
  target: 'workspace' | 'optional' | 'none' | 'browser';
  timeoutMs: number;
  options: { name: string; flag: string; type: string }[];
}

interface Props {
  workspace: string;
  onToast: (msg: string) => void;
}

const STATUS_STYLE: Record<ReaJob['status'], string> = {
  running: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  done: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  error: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  cancelled: 'bg-elevated text-ink-subtle border-line',
  timeout: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

function relTime(ms: number): string {
  const d = Date.now() - ms;
  if (d < 60000) return `${Math.round(d / 1000)}s ago`;
  if (d < 3600000) return `${Math.round(d / 60000)}m ago`;
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ReaPanel({ workspace, onToast }: Props) {
  const [status, setStatus] = useState<{ available: boolean; version: string | null; binPath: string | null } | null>(null);
  const [kinds, setKinds] = useState<ReaKind[]>([]);
  const [kindId, setKindId] = useState('analyze-javascript-application');
  const [usePath, setUsePath] = useState(false);
  const [pathValue, setPathValue] = useState('');
  const [endpoint, setEndpoint] = useState('http://127.0.0.1:9222');
  const [targetId, setTargetId] = useState('');
  const [intOptions, setIntOptions] = useState<Record<string, string>>({});
  const [jobs, setJobs] = useState<ReaJob[]>([]);
  const [active, setActive] = useState<ReaJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const kind = useMemo(() => kinds.find((k) => k.id === kindId) || null, [kinds, kindId]);
  const intOptionDefs = useMemo(() => (kind?.options || []).filter((o) => o.type === 'int'), [kind]);

  const loadStatus = useCallback(async () => {
    try {
      const [s, k] = await Promise.all([ideApi.reaStatus(), ideApi.reaKinds()]);
      setStatus(s);
      setKinds(k.kinds || []);
      if (k.kinds.length && !k.kinds.some((x) => x.id === kindId)) setKindId(k.kinds[0].id);
    } catch (err: any) {
      onToast(`REA unavailable: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [kindId, onToast]);

  const loadJobs = useCallback(async () => {
    try {
      const r = await ideApi.reaJobs();
      setJobs(r.jobs || []);
    } catch {}
  }, []);

  useEffect(() => { loadStatus(); loadJobs(); }, [loadStatus, loadJobs]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const watch = useCallback((id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await ideApi.reaJob(id);
        setActive(r.job);
        if (r.job.status !== 'running') {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setRunning(false);
          loadJobs();
          onToast(r.job.status === 'done' ? `REA ${r.job.kind} finished` : `REA ${r.job.kind}: ${r.job.status}`);
        }
      } catch (err: any) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setRunning(false);
        onToast(`Poll failed: ${err.message}`);
      }
    }, 1200);
  }, [loadJobs, onToast]);

  const run = async () => {
    if (!kind) return;
    const payload: Record<string, unknown> = { kind: kind.id };
    if (kind.target === 'browser') {
      if (!endpoint.trim() || !targetId.trim()) return onToast('Endpoint and target id are required');
      payload.endpoint = endpoint.trim();
      payload.targetId = targetId.trim();
    } else if (kind.target === 'workspace') {
      if (usePath) {
        if (!pathValue.trim()) return onToast('Enter an absolute path');
        payload.path = pathValue.trim();
      } else {
        if (!workspace) return onToast('No workspace selected');
        payload.workspace = workspace;
      }
    } else if (kind.target === 'optional' && usePath && pathValue.trim()) {
      payload.path = pathValue.trim();
    }
    const options: Record<string, unknown> = {};
    for (const def of intOptionDefs) {
      const v = intOptions[def.name];
      if (v !== undefined && v !== '') options[def.name] = Number(v);
    }
    if (Object.keys(options).length) payload.options = options;

    setRunning(true);
    setActive(null);
    try {
      const r = await ideApi.reaAnalyze(payload as any);
      setActive(r.job);
      loadJobs();
      watch(r.job.id);
    } catch (err: any) {
      setRunning(false);
      onToast(`Failed to start: ${err.message}`);
    }
  };

  const cancel = async () => {
    if (!active) return;
    try { await ideApi.reaCancel(active.id); onToast('Cancelling…'); } catch (err: any) { onToast(`Cancel failed: ${err.message}`); }
  };

  const showJob = async (id: string) => {
    try {
      const r = await ideApi.reaJob(id);
      setActive(r.job);
      if (r.job.status === 'running') watch(id);
    } catch (err: any) { onToast(`Load failed: ${err.message}`); }
  };

  const resultText = useMemo(() => {
    if (!active) return '';
    const payload = active.parsed ?? (active.status === 'error' ? { error: active.error, stderr: active.stderr, stdout: active.stdoutTail } : null);
    return payload ? JSON.stringify(payload, null, 2) : '';
  }, [active]);

  const copyResult = () => {
    if (!resultText) return;
    navigator.clipboard.writeText(resultText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center gap-2 text-ink-muted">
        <Loader2 className="w-4 h-4 animate-spin" /> <span className="text-[12px]">Checking REA…</span>
      </div>
    );
  }

  if (status && !status.available) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-8">
        <AlertCircle className="w-8 h-8 text-amber-400" />
        <p className="text-[12px] text-ink">REA CLI not installed</p>
        <p className="text-[11px] text-ink-muted max-w-[260px]">Install it with <code className="font-mono text-ink-subtle">npm install rea-agents</code> inside the <code className="font-mono text-ink-subtle">backend/</code> folder, then reload.</p>
        <button onClick={loadStatus} className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-elevated hover:bg-elevated/80 text-[11px] text-ink transition-colors">
          <RefreshCw className="w-3 h-3" /> Re-check
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <div className="flex items-center gap-2 shrink-0">
        <Search className="w-3.5 h-3.5 text-ink-muted" />
        <span className="text-[11px] font-semibold text-ink">Reverse Engineer</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-elevated text-ink-subtle border border-line">rea {status?.version || ''}</span>
        <button onClick={() => { loadStatus(); loadJobs(); }} className="ml-auto p-1.5 text-ink-muted hover:text-ink transition-colors" title="Refresh">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-2 shrink-0">
        <select
          value={kindId}
          onChange={(e) => { setKindId(e.target.value); setIntOptions({}); }}
          disabled={running}
          className="w-full px-2.5 py-1.5 rounded-lg border border-line bg-surface text-[11px] text-ink outline-none focus:border-line-strong/50 disabled:opacity-50"
        >
          {kinds.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>
        {kind && <p className="text-[10px] text-ink-muted leading-snug">{kind.description}</p>}

        {kind && (kind.target === 'workspace' || kind.target === 'optional') && (
          <>
            {kind.target === 'workspace' && (
              <div className="flex rounded-lg border border-line overflow-hidden">
                <button onClick={() => setUsePath(false)} disabled={running} className={`flex-1 px-2.5 py-1 text-[10px] transition-colors ${!usePath ? 'bg-accent text-accent-fg' : 'text-ink-subtle hover:text-ink'}`}>Workspace</button>
                <button onClick={() => setUsePath(true)} disabled={running} className={`flex-1 px-2.5 py-1 text-[10px] transition-colors ${usePath ? 'bg-accent text-accent-fg' : 'text-ink-subtle hover:text-ink'}`}>Path</button>
              </div>
            )}
            {usePath || kind.target === 'optional' ? (
              <input
                value={pathValue}
                onChange={(e) => setPathValue(e.target.value)}
                placeholder="C:\\path\\to\\app or .asar"
                disabled={running}
                className="w-full px-2.5 py-1.5 rounded-lg border border-line bg-surface text-[11px] font-mono text-ink placeholder:text-ink-muted outline-none focus:border-line-strong/50 disabled:opacity-50"
              />
            ) : (
              <div className="px-2.5 py-1.5 rounded-lg border border-line bg-surface/60 text-[11px] font-mono text-ink-subtle truncate">{workspace || '(no workspace selected)'}</div>
            )}
          </>
        )}

        {kind && kind.target === 'browser' && (
          <div className="space-y-1.5">
            <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="CDP endpoint (http://127.0.0.1:9222)" disabled={running}
              className="w-full px-2.5 py-1.5 rounded-lg border border-line bg-surface text-[11px] font-mono text-ink placeholder:text-ink-muted outline-none focus:border-line-strong/50 disabled:opacity-50" />
            <input value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder="Target id" disabled={running}
              className="w-full px-2.5 py-1.5 rounded-lg border border-line bg-surface text-[11px] font-mono text-ink placeholder:text-ink-muted outline-none focus:border-line-strong/50 disabled:opacity-50" />
          </div>
        )}

        {intOptionDefs.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5">
            {intOptionDefs.map((o) => (
              <input
                key={o.name}
                type="number"
                min={0}
                value={intOptions[o.name] ?? ''}
                onChange={(e) => setIntOptions((p) => ({ ...p, [o.name]: e.target.value }))}
                placeholder={o.flag.replace(/^--/, '')}
                disabled={running}
                className="w-full px-2 py-1 rounded-lg border border-line bg-surface text-[10px] font-mono text-ink placeholder:text-ink-muted outline-none focus:border-line-strong/50 disabled:opacity-50"
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          {!running ? (
            <button onClick={run} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent text-[11px] text-accent-fg transition-colors">
              <Play className="w-3 h-3" /> Run analysis
            </button>
          ) : (
            <button onClick={cancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-[11px] text-ink transition-colors">
              <Square className="w-3 h-3" /> Cancel
            </button>
          )}
          {running && <span className="flex items-center gap-1.5 text-[11px] text-amber-300"><Loader2 className="w-3 h-3 animate-spin" /> Analyzing…</span>}
        </div>
      </div>

      {active && (
        <div className="flex-1 min-h-0 flex flex-col gap-1.5 overflow-hidden">
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[9px] px-1.5 py-0.5 rounded border ${STATUS_STYLE[active.status]}`}>{active.status}</span>
            <span className="text-[10px] text-ink font-medium truncate">{active.kind}</span>
            {active.durationMs != null && <span className="text-[10px] text-ink-muted flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {(active.durationMs / 1000).toFixed(1)}s</span>}
            {active.exitCode != null && active.exitCode !== 0 && <span className="text-[9px] text-amber-300">exit {active.exitCode}</span>}
            <div className="ml-auto flex items-center gap-1">
              <button onClick={copyResult} disabled={!resultText} className="p-1.5 text-ink-muted hover:text-ink transition-colors disabled:opacity-30" title="Copy JSON">
                {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
              <a href={ideApi.reaJobResultUrl(active.id)} download className={`p-1.5 text-ink-muted hover:text-ink transition-colors ${!resultText ? 'pointer-events-none opacity-30' : ''}`} title="Download JSON">
                <Download className="w-3 h-3" />
              </a>
            </div>
          </div>
          {active.error && active.status !== 'done' && (
            <div className="shrink-0 flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30">
              <AlertCircle className="w-3 h-3 text-rose-400 mt-0.5 shrink-0" />
              <p className="text-[10px] text-rose-200 font-mono whitespace-pre-wrap break-all">{active.error}</p>
            </div>
          )}
          <div className="flex-1 overflow-auto min-h-0 rounded-lg border border-line bg-canvas">
            {resultText ? (
              <pre className="p-3 text-[10px] font-mono text-ink whitespace-pre">{resultText}</pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-center py-8">
                <Loader2 className="w-6 h-6 text-ink-subtle animate-spin" />
                <p className="text-[11px] text-ink-muted">Waiting for Evidence…</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!active && (
        <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
          <div className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider shrink-0">Recent analyses</div>
          {jobs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-8">
              <FileJson className="w-8 h-8 text-ink-subtle" />
              <p className="text-[12px] text-ink-muted">No analyses yet</p>
              <p className="text-[11px] text-ink-muted max-w-[220px]">Pick an analysis kind and a target, then run it. Results land here as JSON.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
              {jobs.map((j) => (
                <button key={j.id} onClick={() => showJob(j.id)} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-line bg-surface/60 hover:bg-elevated/60 text-left transition-colors">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border shrink-0 ${STATUS_STYLE[j.status]}`}>{j.status}</span>
                  <span className="text-[11px] text-ink truncate flex-1">{j.kind}</span>
                  <span className="text-[9px] text-ink-muted shrink-0">{relTime(j.startedAt)}</span>
                  <ChevronRight className="w-3 h-3 text-ink-subtle shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
