import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Plus, Puzzle, RefreshCw, Trash2, X } from 'lucide-react';
import { ideApi } from './ideApi';

interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  npmPackage: string | null;
  installedAt: string;
}

const MARKETPLACE: { id: string; name: string; description: string; version: string; npmPackage: string; tags: string[] }[] = [
  { id: 'prettier', name: 'Prettier', description: 'Opinionated code formatter', version: 'latest', npmPackage: 'prettier', tags: ['formatter'] },
  { id: 'eslint', name: 'ESLint', description: 'Pluggable JavaScript linter', version: 'latest', npmPackage: 'eslint', tags: ['linter'] },
  { id: 'jest', name: 'Jest', description: 'Delightful JavaScript testing', version: 'latest', npmPackage: 'jest', tags: ['testing'] },
  { id: 'dotenv', name: 'dotenv', description: 'Loads env vars from .env files', version: 'latest', npmPackage: 'dotenv', tags: ['env'] },
  { id: 'axios', name: 'Axios', description: 'Promise-based HTTP client', version: 'latest', npmPackage: 'axios', tags: ['http'] },
  { id: 'lodash', name: 'Lodash', description: 'Modern JavaScript utility library', version: 'latest', npmPackage: 'lodash', tags: ['utils'] },
  { id: 'zod', name: 'Zod', description: 'TypeScript-first schema validation', version: 'latest', npmPackage: 'zod', tags: ['validation'] },
  { id: 'dayjs', name: 'Day.js', description: 'Minimalist date library', version: 'latest', npmPackage: 'dayjs', tags: ['date'] },
  { id: 'vitest', name: 'Vitest', description: 'Blazing fast unit test framework', version: 'latest', npmPackage: 'vitest', tags: ['testing'] },
  { id: 'tsx', name: 'tsx', description: 'TypeScript execute for Node.js', version: 'latest', npmPackage: 'tsx', tags: ['typescript'] },
];

interface Props {
  workspace: string;
  onToast: (msg: string) => void;
}

export default function PluginsPanel({ workspace, onToast }: Props) {
  const [installed, setInstalled] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [installOutput, setInstallOutput] = useState<{ id: string; text: string; ok: boolean } | null>(null);
  const [customId, setCustomId] = useState('');
  const [customPkg, setCustomPkg] = useState('');
  const [customName, setCustomName] = useState('');
  const [addCustomOpen, setAddCustomOpen] = useState(false);

  const load = useCallback(async () => {
    if (!workspace) return;
    setLoading(true);
    try {
      const r = await ideApi.pluginsList(workspace);
      setInstalled(r.plugins);
    } catch {}
    setLoading(false);
  }, [workspace]);

  useEffect(() => { load(); }, [load]);

  const install = async (item: typeof MARKETPLACE[0]) => {
    setBusy((b) => ({ ...b, [item.id]: true }));
    setInstallOutput(null);
    try {
      const r = await ideApi.pluginsInstall(workspace, item.id, item.name, item.description, item.version, item.npmPackage);
      setInstallOutput({ id: item.id, text: r.output || 'Installed', ok: r.ok });
      if (r.ok) {
        onToast(`${item.name} installed`);
        await load();
      } else {
        onToast(`Install failed: ${r.error?.slice(0, 80)}`);
      }
    } catch (err: any) {
      onToast(`Error: ${err.message}`);
    } finally {
      setBusy((b) => ({ ...b, [item.id]: false }));
    }
  };

  const installCustom = async () => {
    if (!customId.trim() || !customName.trim()) return;
    setBusy((b) => ({ ...b, [customId]: true }));
    setInstallOutput(null);
    try {
      const r = await ideApi.pluginsInstall(workspace, customId.trim(), customName.trim(), '', 'latest', customPkg.trim() || undefined);
      setInstallOutput({ id: customId, text: r.output || 'Installed', ok: r.ok });
      if (r.ok) {
        onToast(`${customName} installed`);
        setCustomId(''); setCustomPkg(''); setCustomName(''); setAddCustomOpen(false);
        await load();
      } else {
        onToast(`Install failed`);
      }
    } catch (err: any) {
      onToast(`Error: ${err.message}`);
    } finally {
      setBusy((b) => ({ ...b, [customId]: false }));
    }
  };

  const uninstall = async (plugin: Plugin) => {
    if (!confirm(`Remove ${plugin.name}?`)) return;
    setBusy((b) => ({ ...b, [plugin.id]: true }));
    try {
      await ideApi.pluginsUninstall(workspace, plugin.id);
      onToast(`${plugin.name} removed`);
      await load();
    } catch (err: any) {
      onToast(`Error: ${err.message}`);
    } finally {
      setBusy((b) => ({ ...b, [plugin.id]: false }));
    }
  };

  const isInstalled = (id: string) => installed.some((p) => p.id === id);

  return (
    <div className="flex flex-col gap-3 h-full min-h-0 overflow-hidden">
      {/* Installed */}
      <div className="shrink-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Installed ({installed.length})</span>
          <button onClick={load} className="ml-auto p-0.5 text-ink-muted hover:text-ink transition-colors">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </button>
        </div>
        {installed.length === 0 && !loading && (
          <p className="text-[10px] text-ink-muted">No plugins installed yet.</p>
        )}
        {installed.length > 0 && (
          <div className="rounded-lg border border-line overflow-hidden">
            {installed.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-2 px-2.5 py-2 ${i < installed.length - 1 ? 'border-b border-line/40' : ''}`}>
                <Puzzle className="w-3 h-3 text-ink-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-ink font-medium truncate">{p.name}</div>
                  {p.description && <p className="text-[10px] text-ink-muted truncate">{p.description}</p>}
                </div>
                <span className="text-[9px] text-ink-muted font-mono shrink-0">v{p.version}</span>
                <button
                  onClick={() => uninstall(p)}
                  disabled={!!busy[p.id]}
                  className="p-0.5 text-ink-muted hover:text-rose-400 transition-colors disabled:opacity-40 shrink-0"
                  title={`Remove ${p.name}`}
                >
                  {busy[p.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Install output */}
      {installOutput && (
        <div className={`shrink-0 rounded-lg border px-3 py-2 ${installOutput.ok ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            {installOutput.ok ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <AlertCircle className="w-3 h-3 text-rose-400" />}
            <span className={`text-[10px] font-semibold ${installOutput.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{installOutput.ok ? 'Installed' : 'Failed'}</span>
            <button onClick={() => setInstallOutput(null)} className="ml-auto text-ink-muted hover:text-ink"><X className="w-3 h-3" /></button>
          </div>
          <pre className="text-[10px] font-mono text-ink-subtle whitespace-pre-wrap break-all max-h-20 overflow-y-auto">{installOutput.text.slice(-600)}</pre>
        </div>
      )}

      {/* Marketplace */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Marketplace</span>
          <button
            onClick={() => setAddCustomOpen((o) => !o)}
            className="ml-auto flex items-center gap-1 text-[10px] text-ink-muted hover:text-ink transition-colors"
          >
            <Plus className="w-3 h-3" /> Custom
          </button>
        </div>

        {addCustomOpen && (
          <div className="mb-2 p-2.5 rounded-lg border border-line bg-surface/60 space-y-1.5">
            <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Display name" className="w-full px-2 py-1 rounded border border-line bg-surface text-[11px] text-ink placeholder:text-ink-muted outline-none focus:border-line-strong/50" />
            <input value={customId} onChange={(e) => setCustomId(e.target.value)} placeholder="Unique ID (e.g. my-plugin)" className="w-full px-2 py-1 rounded border border-line bg-surface text-[11px] font-mono text-ink placeholder:text-ink-muted outline-none focus:border-line-strong/50" />
            <input value={customPkg} onChange={(e) => setCustomPkg(e.target.value)} placeholder="npm package (optional)" className="w-full px-2 py-1 rounded border border-line bg-surface text-[11px] font-mono text-ink placeholder:text-ink-muted outline-none focus:border-line-strong/50" />
            <div className="flex gap-1.5">
              <button onClick={installCustom} disabled={!customId.trim() || !customName.trim() || !!busy[customId]} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent text-accent-fg text-[10px] hover:bg-accent disabled:opacity-40 transition-colors">
                {busy[customId] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add
              </button>
              <button onClick={() => setAddCustomOpen(false)} className="px-2 py-1 rounded-lg bg-elevated text-[10px] text-ink-subtle hover:text-ink transition-colors">Cancel</button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          {MARKETPLACE.map((item) => {
            const installed_ = isInstalled(item.id);
            return (
              <div key={item.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-line hover:border-line transition-colors">
                <Puzzle className={`w-4 h-4 shrink-0 ${installed_ ? 'text-ink-muted' : 'text-ink-muted'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-ink">{item.name}</span>
                    {item.tags.map((t) => (
                      <span key={t} className="text-[8px] px-1 py-0.5 rounded bg-elevated text-ink-muted">{t}</span>
                    ))}
                  </div>
                  <p className="text-[10px] text-ink-muted truncate">{item.description}</p>
                </div>
                {installed_ ? (
                  <span className="text-[10px] text-emerald-300 flex items-center gap-0.5 shrink-0"><CheckCircle2 className="w-3 h-3" /> Installed</span>
                ) : (
                  <button
                    onClick={() => install(item)}
                    disabled={!!busy[item.id]}
                    className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/15 border border-line-strong/30 text-[10px] text-ink hover:bg-accent/25 disabled:opacity-40 transition-colors"
                  >
                    {busy[item.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Install
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
