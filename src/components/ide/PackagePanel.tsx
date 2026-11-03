import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Package, Plus, Search, Trash2, X } from 'lucide-react';
import { ideApi } from './ideApi';

interface Pkg {
  name: string;
  version: string;
  dev: boolean;
  manager: 'npm' | 'pip' | 'cargo' | 'go';
}

interface SearchResult {
  name: string;
  version: string;
  description: string;
  manager: string;
}

interface Props {
  workspace: string;
  onToast: (msg: string) => void;
}

export default function PackagePanel({ workspace, onToast }: Props) {
  const [installed, setInstalled] = useState<Pkg[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [manager, setManager] = useState<'npm' | 'pip' | 'cargo' | 'go'>('npm');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [output, setOutput] = useState<{ name: string; text: string; ok: boolean } | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadInstalled = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    try {
      const r = await ideApi.packagesInstalled(workspace);
      setInstalled(r.packages);
      // Auto-detect manager
      const hasPip = r.packages.some((p) => p.manager === 'pip');
      const hasNpm = r.packages.some((p) => p.manager === 'npm');
      if (hasPip && !hasNpm) setManager('pip');
    } catch {}
    setLoading(false);
  }, [workspace]);

  useEffect(() => { loadInstalled(); }, [loadInstalled]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const r = await ideApi.packagesSearch(workspace, q, manager);
      setResults(r.results.slice(0, 8));
    } catch {}
    setSearching(false);
  }, [workspace, manager]);

  const onQueryChange = (v: string) => {
    setQuery(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(v), 400);
  };

  const install = async (name: string, version?: string, dev = false) => {
    const key = name;
    setBusy((b) => ({ ...b, [key]: true }));
    setOutput(null);
    try {
      const r = await ideApi.packageInstall(workspace, name, version, dev, manager);
      setOutput({ name, text: r.output, ok: r.ok });
      if (r.ok) {
        onToast(`Installed ${name}`);
        await loadInstalled();
        setResults([]);
        setQuery('');
      } else {
        onToast(`Install failed: ${r.output.slice(0, 80)}`);
      }
    } catch (err: any) {
      onToast(`Install error: ${err.message}`);
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
    }
  };

  const uninstall = async (pkg: Pkg) => {
    if (!confirm(`Remove ${pkg.name}?`)) return;
    const key = pkg.name;
    setBusy((b) => ({ ...b, [key]: true }));
    setOutput(null);
    try {
      const r = await ideApi.packageUninstall(workspace, pkg.name, pkg.manager);
      setOutput({ name: pkg.name, text: r.output, ok: r.ok });
      if (r.ok) {
        onToast(`Removed ${pkg.name}`);
        await loadInstalled();
      } else {
        onToast(`Uninstall failed`);
      }
    } catch (err: any) {
      onToast(`Uninstall error: ${err.message}`);
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
    }
  };

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      {/* Manager toggle + search */}
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border border-line overflow-hidden shrink-0">
          {(['npm', 'pip', 'cargo', 'go'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setManager(m); setResults([]); }}
              className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${manager === m ? 'bg-accent text-accent-fg' : 'bg-transparent text-ink-subtle hover:text-ink'}`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-muted pointer-events-none" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={`Search ${manager} packages…`}
            className="w-full pl-6 pr-2 py-1 rounded-lg border border-line bg-surface text-[11px] text-ink placeholder:text-ink-muted outline-none focus:border-line-strong/50"
          />
          {searching && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-muted animate-spin" />}
        </div>
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <div className="rounded-lg border border-line bg-surface/60 overflow-hidden">
          <div className="text-[10px] text-ink-muted px-2.5 py-1 border-b border-line">Search results</div>
          {results.map((r) => (
            <div key={r.name} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-elevated/50 border-b border-line/40 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-ink">{r.name}</span>
                  {r.version && <span className="text-[10px] text-ink-muted">v{r.version}</span>}
                </div>
                {r.description && <p className="text-[10px] text-ink-muted truncate">{r.description}</p>}
              </div>
              <button
                onClick={() => install(r.name, r.version)}
                disabled={!!busy[r.name]}
                className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/15 border border-line-strong/30 text-[10px] text-ink hover:bg-accent/25 disabled:opacity-40 transition-colors"
              >
                {busy[r.name] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Install
              </button>
            </div>
          ))}
          <button onClick={() => { setResults([]); setQuery(''); }} className="w-full py-1 text-[10px] text-ink-muted hover:text-ink-subtle transition-colors">Clear</button>
        </div>
      )}

      {/* Install output */}
      {output && (
        <div className={`rounded-lg border px-3 py-2 ${output.ok ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            {output.ok ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <AlertCircle className="w-3 h-3 text-rose-400" />}
            <span className={`text-[10px] font-semibold ${output.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{output.ok ? `${output.name} installed` : 'Install failed'}</span>
            <button onClick={() => setOutput(null)} className="ml-auto text-ink-muted hover:text-ink"><X className="w-3 h-3" /></button>
          </div>
          <pre className="text-[10px] text-ink-subtle font-mono whitespace-pre-wrap break-all max-h-24 overflow-y-auto">{output.text.slice(-800)}</pre>
        </div>
      )}

      {/* Installed packages */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-3">
        {loading && <div className="flex items-center gap-1.5 text-[11px] text-ink-muted"><Loader2 className="w-3 h-3 animate-spin" /> Loading packages…</div>}
        {[
          { label: 'npm packages', pkgs: installed.filter((p) => p.manager === 'npm') },
          { label: 'pip packages', pkgs: installed.filter((p) => p.manager === 'pip') },
          { label: 'cargo crates', pkgs: installed.filter((p) => p.manager === 'cargo') },
          { label: 'go modules', pkgs: installed.filter((p) => p.manager === 'go') },
        ].map(({ label, pkgs }) =>
          pkgs.length > 0 ? (
            <div key={label}>
              <div className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-1">{label} ({pkgs.length})</div>
              <div className="rounded-lg border border-line overflow-hidden">
                {pkgs.map((p, i) => (
                  <div key={p.name} className={`flex items-center gap-2 px-2.5 py-1.5 ${i < pkgs.length - 1 ? 'border-b border-line/40' : ''}`}>
                    <Package className="w-3 h-3 text-ink-muted shrink-0" />
                    <span className="flex-1 font-mono text-[11px] text-ink truncate">{p.name}</span>
                    <span className="text-[10px] text-ink-muted">{p.version}</span>
                    {p.dev && <span className="text-[9px] px-1 py-0.5 rounded bg-elevated text-ink-muted">dev</span>}
                    <button
                      onClick={() => uninstall(p)}
                      disabled={!!busy[p.name]}
                      className="p-0.5 text-ink-muted hover:text-rose-400 disabled:opacity-40 transition-colors"
                      title={`Uninstall ${p.name}`}
                    >
                      {busy[p.name] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null
        )}
        {!loading && installed.length === 0 && (
          <div className="text-[11px] text-ink-muted text-center py-4">No packages installed yet.<br />Search above to install one.</div>
        )}
      </div>
    </div>
  );
}
