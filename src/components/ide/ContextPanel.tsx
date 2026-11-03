import React, { useState } from 'react';
import { Braces, FileCode, Globe, Loader2, Play, Package, Route as RouteIcon, Sparkles } from 'lucide-react';
import { ideApi } from './ideApi';

interface ContextPkg {
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
}

export default function ContextPanel({ task, workspace }: { task: string; workspace: string }) {
  const [input, setInput] = useState(task);
  const [busy, setBusy] = useState(false);
  const [pkg, setPkg] = useState<ContextPkg | null>(null);
  const [err, setErr] = useState('');

  const build = async () => {
    if (!input.trim() || busy) return;
    setBusy(true);
    setErr('');
    try {
      setPkg(await ideApi.buildContext(workspace, input, { budget: 16000 }));
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && build()}
          placeholder="Task the agents will receive..."
          className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-line-strong/60 outline-none placeholder:text-ink-muted"
        />
        <button onClick={build} disabled={busy || !input.trim()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent hover:bg-accent text-[10px] font-semibold text-accent-fg transition-colors disabled:opacity-40">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Build
        </button>
      </div>
      <p className="text-[10px] text-ink-muted">Assembled for: <span className="text-ink-subtle">{workspace}</span> · semantic retrieval → symbols → routes → deps, token-budgeted.</p>
      {err && <p className="text-[10px] text-red-400">{err}</p>}
      {pkg && (
        <>
          <div className="flex flex-wrap gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-accent/10 text-ink text-[9px] font-mono">{pkg.files.length} files</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[9px] font-mono">{pkg.symbols.length} symbols</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 text-[9px] font-mono">{pkg.routes.length} routes</span>
            <span className="px-2 py-0.5 rounded-full bg-accent/10 text-ink-muted text-[9px] font-mono">{pkg.deps.length} deps</span>
            <span className="px-2 py-0.5 rounded-full bg-elevated/30 text-ink-subtle text-[9px] font-mono">{pkg.chars} chars</span>
          </div>

          <div className="rounded-xl border border-line bg-surface p-3 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-ink-subtle uppercase tracking-wider">
              <FileCode className="w-3 h-3" /> Key files
            </div>
            {pkg.files.map((f) => (
              <div key={f.path} className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-ink truncate flex-1">{f.path}{f.line ? `:${f.line}` : ''}</span>
                {typeof f.score === 'number' && <span className="text-[9px] font-mono text-emerald-400/80">{Math.round(f.score * 100)}%</span>}
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-line bg-surface p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-ink-subtle uppercase tracking-wider">
              <Sparkles className="w-3 h-3" /> Symbols
            </div>
            {pkg.symbols.slice(0, 12).map((s, i) => (
              <div key={i} className="text-[10px] font-mono text-ink-subtle truncate">{s}</div>
            ))}
            {pkg.symbols.length > 12 && <div className="text-[9px] text-ink-muted">+{pkg.symbols.length - 12} more</div>}
          </div>

          {(pkg.routes.length > 0 || pkg.database.length > 0) && (
            <div className="rounded-xl border border-line bg-surface p-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-ink-subtle uppercase tracking-wider">
                <RouteIcon className="w-3 h-3" /> Routes & data
              </div>
              {pkg.routes.map((r, i) => (
                <div key={i} className="text-[10px] font-mono text-amber-200/70">{r.method} {r.path} <span className="text-ink-muted">— {r.file}</span></div>
              ))}
              {pkg.database.map((d, i) => (
                <div key={i} className="text-[10px] font-mono text-amber-200/70">{d.engine} ({d.kind}) <span className="text-ink-muted">— {d.file}</span></div>
              ))}
            </div>
          )}

          {pkg.deps.length > 0 && (
            <div className="rounded-xl border border-line bg-surface p-3 flex items-start gap-2">
              <Package className="w-3 h-3 mt-0.5 text-ink-muted" />
              <div className="flex flex-wrap gap-1">
                {pkg.deps.map((d, i) => (
                  <span key={i} className="px-1.5 py-px rounded bg-elevated/80 text-[9px] font-mono text-ink-subtle">{d}</span>
                ))}
              </div>
            </div>
          )}

          <details className="rounded-xl border border-line bg-surface">
            <summary className="flex items-center gap-1.5 px-3 py-2 text-[10px] text-ink-subtle cursor-pointer hover:text-ink">
              <Braces className="w-3 h-3" /> Full prompt text
            </summary>
            <pre className="px-3 pb-3 text-[9px] leading-relaxed text-ink-muted whitespace-pre-wrap max-h-80 overflow-y-auto scrollbar-thin">{pkg.text}</pre>
          </details>
        </>
      )}
      {!pkg && !err && <p className="text-[10px] text-ink-muted py-4 text-center">Build a context package to see exactly what the agents receive.</p>}
    </div>
  );
}
