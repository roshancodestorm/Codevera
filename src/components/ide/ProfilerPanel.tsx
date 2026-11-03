import React, { useCallback, useEffect, useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, Clock, Loader2, Play, RefreshCw, Square } from 'lucide-react';
import { ideApi } from './ideApi';

interface ProfileResult {
  output: string;
  duration: number;
  lang: string;
  file: string;
  at: number;
}

interface Props {
  workspace: string;
  onToast: (msg: string) => void;
}

export default function ProfilerPanel({ workspace, onToast }: Props) {
  const [entryFile, setEntryFile] = useState('index.js');
  const [lang, setLang] = useState<'auto' | 'javascript' | 'python'>('auto');
  const [running, setRunning] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [result, setResult] = useState<ProfileResult | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const loadResult = useCallback(async () => {
    if (!workspace) return;
    try {
      const r = await ideApi.profileResult(workspace);
      if (r.result) setResult(r.result);
    } catch {}
  }, [workspace]);

  useEffect(() => { loadResult(); }, [loadResult]);

  const startProfiling = async () => {
    setRunning(true);
    setResult(null);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    try {
      const r = await ideApi.profileStart(workspace, entryFile, lang);
      if (!r.ok) {
        onToast(`Start failed: ${r.error}`);
        setRunning(false);
        clearInterval(timerRef.current!);
      } else {
        onToast(`Profiling started for ${entryFile}`);
      }
    } catch (err: any) {
      onToast(`Error: ${err.message}`);
      setRunning(false);
      clearInterval(timerRef.current!);
    }
  };

  const stopProfiling = async () => {
    setStopping(true);
    clearInterval(timerRef.current!);
    try {
      const r = await ideApi.profileStop(workspace);
      if (r.ok && r.result) {
        setResult(r.result);
        onToast(`Profile collected (${(r.result.duration / 1000).toFixed(1)}s)`);
      } else {
        onToast(`Stop failed: ${r.error}`);
      }
    } catch (err: any) {
      onToast(`Error: ${err.message}`);
    } finally {
      setRunning(false);
      setStopping(false);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      {/* Config */}
      <div className="space-y-2 shrink-0">
        <div className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Entry File</div>
        <input
          value={entryFile}
          onChange={(e) => setEntryFile(e.target.value)}
          placeholder="index.js or app.py"
          disabled={running}
          className="w-full px-2.5 py-1.5 rounded-lg border border-line bg-surface text-[11px] font-mono text-ink placeholder:text-ink-muted outline-none focus:border-line-strong/50 disabled:opacity-50"
        />
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-ink-muted shrink-0">Runtime</div>
          <div className="flex rounded-lg border border-line overflow-hidden">
            {(['auto', 'javascript', 'python'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                disabled={running}
                className={`px-2.5 py-1 text-[10px] transition-colors ${lang === l ? 'bg-accent text-accent-fg' : 'text-ink-subtle hover:text-ink'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!running ? (
            <button
              onClick={startProfiling}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-ink text-[11px] transition-colors"
            >
              <Play className="w-3 h-3" /> Start Profiling
            </button>
          ) : (
            <button
              onClick={stopProfiling}
              disabled={stopping}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-ink text-[11px] disabled:opacity-40 transition-colors"
            >
              {stopping ? <Loader2 className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3" />}
              Stop &amp; Collect
            </button>
          )}
          {running && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-300">
              <Activity className="w-3 h-3 animate-pulse" />
              Profiling… {elapsed}s
            </div>
          )}
          <button onClick={loadResult} className="ml-auto p-1.5 text-ink-muted hover:text-ink transition-colors" title="Reload last result">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="flex-1 min-h-0 flex flex-col gap-1.5 overflow-hidden">
          <div className="flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] text-ink font-medium">{result.file}</span>
            <span className="text-[10px] text-ink-muted flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {formatDuration(result.duration)}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-elevated text-ink-subtle">{result.lang}</span>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 rounded-lg border border-line bg-canvas">
            <pre className="p-3 text-[10px] font-mono text-ink whitespace-pre-wrap">{result.output}</pre>
          </div>
        </div>
      )}
      {!result && !running && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-8">
          <Activity className="w-8 h-8 text-ink-subtle" />
          <p className="text-[12px] text-ink-muted">No profile data yet</p>
          <p className="text-[11px] text-ink-muted max-w-[200px]">Enter an entry file, click Start, let your app run, then click Stop &amp; Collect.</p>
        </div>
      )}
    </div>
  );
}
