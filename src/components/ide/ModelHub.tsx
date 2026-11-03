import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Copy, Download, Upload, Loader2, Play, Plus, RefreshCw, Trash2, CheckCircle2, AlertCircle,
  Activity, Cpu, Gauge, Layers, Rocket, Save, Zap, X, FileJson, Route as RouteIcon, Swords, Send, ClipboardPaste,
} from 'lucide-react';
import { modelApi } from './ideApi';
import type { ApiModel, MarketplaceTemplate, ModelProfile, RouteConfig, TestResult, UsageStats } from './ideTypes';

const CAP_META: Record<string, { label: string; color: string }> = {
  chat: { label: 'Chat', color: 'bg-accent/15 text-ink-muted border-line-strong/30' },
  coding: { label: 'Coding', color: 'bg-accent/15 text-ink border-line-strong/30' },
  json: { label: 'JSON', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  'function-calling': { label: 'Tools', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  vision: { label: 'Vision', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  reasoning: { label: 'Reasoning', color: 'bg-elevated text-ink-muted border-line' },
  streaming: { label: 'Streaming', color: 'bg-elevated text-ink border-line-strong' },
  embeddings: { label: 'Embeddings', color: 'bg-elevated text-ink-muted border-line' },
  'image-generation': { label: 'Images', color: 'bg-elevated text-ink-muted border-line' },
  speech: { label: 'Speech', color: 'bg-accent/15 text-ink-muted border-line-strong/30' },
  offline: { label: 'Offline', color: 'bg-surface/15 text-ink-muted border-line/30' },
  fast: { label: 'Fast', color: 'bg-elevated text-ink-muted border-line' },
  cheap: { label: 'Cheap', color: 'bg-green-500/15 text-green-300 border-green-500/30' },
  'long-context': { label: 'Long Context', color: 'bg-elevated text-ink-muted border-line' },
  routing: { label: 'Routing', color: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
};

const FIELD_DEFS: { key: string; label: string; placeholder: string; type?: string; options?: string[] }[] = [
  { key: 'id', label: 'ID', placeholder: 'my-model', type: 'text' },
  { key: 'name', label: 'Name', placeholder: 'My Model', type: 'text' },
  { key: 'provider', label: 'Provider', placeholder: 'OpenAI', type: 'text' },
  { key: 'model_id', label: 'Model ID', placeholder: 'gpt-4o-mini', type: 'text' },
  { key: 'base_url', label: 'Base URL', placeholder: 'https://api.openai.com/v1', type: 'text' },
  { key: 'api_key', label: 'API Key', placeholder: 'sk-...', type: 'password' },
  { key: 'speed', label: 'Speed (display badge)', placeholder: '', type: 'select', options: ['', 'Fast', 'High Fast', 'Medium', 'High'] },
];

const CAP_KEYS = ['chat', 'coding', 'json', 'function-calling', 'vision', 'reasoning', 'streaming', 'embeddings', 'image-generation', 'speech', 'offline', 'fast', 'cheap', 'long-context', 'routing'];

const TASK_LABELS: Record<string, string> = {
  autocomplete: 'Autocomplete', chat: 'Chat', planning: 'Planning', coding: 'Coding', architecture: 'Architecture',
  vision: 'Vision', embeddings: 'Embeddings', documentation: 'Docs', background: 'Background',
};

function providerColor(provider: string) {
  const p = provider.toLowerCase();
  if (p.includes('openai') || p.includes('azure')) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  if (p.includes('anthropic')) return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
  if (p.includes('gemini') || p.includes('google')) return 'bg-elevated text-ink-muted border-line';
  if (p.includes('deepseek')) return 'bg-accent/15 text-ink-muted border-line-strong/30';
  if (p.includes('ollama') || p.includes('lm studio') || p.includes('vllm')) return 'bg-surface/15 text-ink-muted border-line/30';
  if (p.includes('groq')) return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  if (p.includes('mistral')) return 'bg-elevated text-ink-muted border-line';
  if (p.includes('openrouter')) return 'bg-elevated text-ink-muted border-line';
  return 'bg-accent/15 text-ink border-line-strong/30';
}

function modelCapabilities(m: ApiModel): string[] {
  const caps: string[] = [];
  if (m.supports_streaming) caps.push('streaming');
  if (m.supports_vision) caps.push('vision');
  if (m.supports_function_calling) caps.push('function-calling');
  if (m.supports_reasoning) caps.push('reasoning');
  if (m.supports_json) caps.push('json');
  if (m.supports_embeddings) caps.push('embeddings');
  if (m.supports_image_generation) caps.push('image-generation');
  if (m.supports_speech) caps.push('speech');
  return caps;
}

interface Props {
  onBack: () => void;
  onUseInChat?: (text: string) => void;
}

type Tab = 'models' | 'marketplace' | 'routes' | 'profiles' | 'usage' | 'arena';

type ArenaPane = {
  model: string;
  name: string;
  provider: string;
  text: string;
  latencyMs?: number;
  tokens?: number;
  error?: string;
  done: boolean;
};

export default function ModelHub({ onBack, onUseInChat }: Props) {
  const [tab, setTab] = useState<Tab>('models');
  const [models, setModels] = useState<ApiModel[]>([]);
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
  const [routesData, setRoutesData] = useState<RouteConfig | null>(null);
  const [profilesData, setProfilesData] = useState<{ profiles: ModelProfile[]; currentRoutes: Record<string, string> } | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [testState, setTestState] = useState<Record<string, TestResult | 'loading'>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [profileName, setProfileName] = useState('');
  const [profileDesc, setProfileDesc] = useState('');
  const [usageDays, setUsageDays] = useState(30);
  const [arenaPrompt, setArenaPrompt] = useState('');
  const [arenaSelected, setArenaSelected] = useState<Set<string>>(new Set());
  const [arenaContext, setArenaContext] = useState<'none' | 'repo'>('none');
  const [arenaRunning, setArenaRunning] = useState(false);
  const [arenaPanes, setArenaPanes] = useState<Record<string, ArenaPane>>({});
  const [arenaWinners, setArenaWinners] = useState<Record<string, string>>({});
  const arenaRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [m, t, r, p, u] = await Promise.all([
        modelApi.listModels(), modelApi.marketplace(), modelApi.routes(), modelApi.profiles(), modelApi.usage(usageDays),
      ]);
      setModels(m); setTemplates(t); setRoutesData(r); setProfilesData(p); setUsage(u);
    } catch (err: any) {
      showToast(`Backend offline: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [usageDays]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const testModel = async (idOrPayload: string | Record<string, any>) => {
    const key = typeof idOrPayload === 'string' ? idOrPayload : idOrPayload.id;
    setTestState((s) => ({ ...s, [key]: 'loading' }));
    try {
      const res = await modelApi.testModel(typeof idOrPayload === 'string' ? { id: idOrPayload } : idOrPayload);
      setTestState((s) => ({ ...s, [key]: res }));
    } catch (err: any) {
      setTestState((s) => ({ ...s, [key]: { ok: false, error: err.message, latencyMs: 0 } as TestResult }));
    }
  };

  const toggleArenaModel = (id: string) => {
    setArenaSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const runArena = async () => {
    const ids = [...arenaSelected];
    if (ids.length < 1) {
      showToast('Select at least one model');
      return;
    }
    if (!arenaPrompt.trim()) {
      showToast('Enter a prompt');
      return;
    }
    const controller = new AbortController();
    arenaRef.current = controller;
    setArenaRunning(true);
    setArenaWinners({});
    const init: Record<string, ArenaPane> = {};
    ids.forEach((id) => {
      const m = models.find((x) => x.id === id);
      init[id] = { model: id, name: m?.name || id, provider: m?.provider || '', text: '', done: false };
    });
    setArenaPanes(init);
    try {
      await modelApi.arena(
        { prompt: arenaPrompt.trim(), modelIds: ids, context: arenaContext },
        (ev) => {
          if (!ev || !ev.model) return;
          setArenaPanes((p) => {
            const cur = p[ev.model] || { model: ev.model, name: ev.name || ev.model, provider: ev.provider || '', text: '', done: false };
            if (ev.type === 'delta') {
              return { ...p, [ev.model]: { ...cur, text: cur.text + ev.text } };
            }
            if (ev.type === 'done') {
              return {
                ...p,
                [ev.model]: {
                  ...cur, name: ev.name || cur.name, provider: ev.provider || cur.provider,
                  text: ev.content ?? cur.text, latencyMs: ev.latencyMs, tokens: ev.tokens,
                  error: ev.error || undefined, done: true,
                },
              };
            }
            return p;
          });
        },
        controller.signal,
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') showToast(`Arena failed: ${err.message}`);
    } finally {
      setArenaRunning(false);
    }
  };

  const stopArena = () => {
    arenaRef.current?.abort();
    setArenaRunning(false);
  };

  const copyPane = (pane: ArenaPane) => {
    if (!pane.text) return;
    navigator.clipboard?.writeText(pane.text).then(() => showToast(`Copied ${pane.name}`)).catch(() => {});
  };

  const useInChat = (pane: ArenaPane) => {
    if (!pane.text) return;
    onUseInChat?.(pane.text);
  };

  const activateModel = async (id: string) => {
    try {
      await modelApi.activateModel(id);
      await loadAll();
      showToast('Model activated');
    } catch (err: any) {
      showToast(`Activate failed: ${err.message}`);
    }
  };

  const deleteModel = async (id: string) => {
    if (!window.confirm('Delete this model?')) return;
    try {
      await modelApi.deleteModel(id);
      await loadAll();
      showToast('Model deleted');
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  const duplicateModel = async (id: string) => {
    try {
      await modelApi.duplicateModel(id);
      await loadAll();
      showToast('Duplicate created');
    } catch (err: any) {
      showToast(`Duplicate failed: ${err.message}`);
    }
  };

  const openForm = (m?: ApiModel | MarketplaceTemplate) => {
    if (m) {
      if ('model_id' in m) {
        setEditingId(m.id);
        setForm({
          id: m.id, name: m.name, provider: m.provider,
          model_id: m.model_id,
          base_url: m.base_url,
          api_key: m.api_key || '',
          api_protocol: m.api_protocol || 'OpenAI',
          speed: m.speed || '',
        });
      } else {
        setEditingId(m.id);
        setForm({
          id: m.id, name: m.name, provider: m.provider,
          model_id: m.modelId,
          base_url: m.baseUrl,
          api_key: '',
          api_protocol: 'OpenAI',
          speed: '',
        });
      }
    } else {
      setEditingId(null);
      setForm({ id: '', name: '', provider: '', model_id: '', base_url: '', api_key: '', api_protocol: 'OpenAI', speed: '' });
    }
    setShowForm(true);
  };

  const saveModel = async () => {
    if (!form.name || !form.model_id || !form.base_url) {
      showToast('Name, Model ID and Base URL are required');
      return;
    }
    try {
      if (editingId) {
        await modelApi.updateModel(editingId, form);
      } else {
        await modelApi.createModel({ ...form, id: form.id || `model-${Date.now()}`, is_active: false });
      }
      setShowForm(false);
      await loadAll();
      showToast('Saved');
    } catch (err: any) {
      showToast(`Save failed: ${err.message}`);
    }
  };

  const addTemplate = async (t: MarketplaceTemplate) => {
    try {
      await modelApi.createModel({
        id: t.id, name: t.name, provider: t.provider, model_id: t.modelId, base_url: t.baseUrl,
        api_key: '', api_protocol: 'OpenAI', is_active: false,
      });
      await loadAll();
      showToast(`Added ${t.name} — set API key & test it`);
    } catch (err: any) {
      showToast(`Add failed: ${err.message}`);
    }
  };

  const exportConfig = async () => {
    try {
      const data = await modelApi.exportConfig();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `models-config-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast('Config exported');
    } catch (err: any) {
      showToast(`Export failed: ${err.message}`);
    }
  };

  const importConfig = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.models)) throw new Error('Invalid config file');
      const res = await modelApi.importConfig({ models: data.models, activeModelId: data.activeModelId });
      await loadAll();
      showToast(`Imported ${res.imported} models`);
    } catch (err: any) {
      showToast(`Import failed: ${err.message}`);
    }
  };

  const saveRoutes = async () => {
    if (!routesData) return;
    try {
      await modelApi.saveRoutes(routesData.routes);
      showToast('Routes saved');
    } catch (err: any) {
      showToast(`Save failed: ${err.message}`);
    }
  };

  const saveProfile = async () => {
    if (!profileName.trim() || !routesData) return;
    try {
      const activeModel = models.find((m) => m.is_active);
      await modelApi.createProfile(profileName.trim(), profileDesc.trim(), {
        routes: routesData.routes,
        activeModelId: activeModel?.id || null,
      });
      setProfileName('');
      setProfileDesc('');
      await loadAll();
      showToast('Profile saved');
    } catch (err: any) {
      showToast(`Profile save failed: ${err.message}`);
    }
  };

  const applyProfile = async (id: string) => {
    try {
      const res = await modelApi.applyProfile(id);
      await loadAll();
      showToast(`Applied profile (${res.applied} routes)`);
    } catch (err: any) {
      showToast(`Apply failed: ${err.message}`);
    }
  };

  const deleteProfile = async (id: string) => {
    if (!window.confirm('Delete this profile?')) return;
    try {
      await modelApi.deleteProfile(id);
      await loadAll();
      showToast('Profile deleted');
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  const fmtLatency = (ms: string | number) => `${Number(ms).toFixed(0)}ms`;

  const renderTestBadge = (id: string) => {
    const t = testState[id];
    if (!t) return null;
    if (t === 'loading') return <Loader2 className="w-4 h-4 animate-spin text-ink-muted" />;
    if ((t as TestResult).ok) {
      return <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" />{(t as TestResult).latencyMs}ms</span>;
    }
    return <span className="flex items-center gap-1 text-xs text-rose-400 max-w-[200px] truncate" title={(t as TestResult).error}><AlertCircle className="w-3.5 h-3.5" />{(t as TestResult).error}</span>;
  };

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'models', label: 'Models', icon: Layers },
    { key: 'marketplace', label: 'Marketplace', icon: Rocket },
    { key: 'arena', label: 'Arena', icon: Swords },
    { key: 'routes', label: 'Routes', icon: RouteIcon },
    { key: 'profiles', label: 'Profiles', icon: Save },
    { key: 'usage', label: 'Usage', icon: Activity },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 bg-surface text-ink-muted">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-surface/70 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-surface transition-colors" title="Back">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-elevated">
              <Cpu className="w-4 h-4 text-ink" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-ink leading-none">Model Hub</h1>
              <p className="text-[11px] text-ink-muted mt-0.5">Orchestrate every AI in the system</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportConfig} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface transition-colors">
            <Upload className="w-3.5 h-3.5" /> Import
          </button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importConfig(f); e.target.value = ''; }} />
          <button onClick={() => openForm()} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-elevated text-ink transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Model
          </button>
          <button onClick={loadAll} className="p-1.5 rounded-lg bg-surface hover:bg-surface transition-colors" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 px-4 pt-2 border-b border-line bg-surface/40">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-t-lg transition-colors border-b-2 ${tab === t.key ? 'text-ink border-line-strong bg-surface/60' : 'text-ink-muted border-transparent hover:text-ink-muted'}`}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2 text-ink-muted">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading...
          </div>
        ) : (
          <>
            {tab === 'models' && (
              <div className="space-y-3">
                {showForm && (
                  <div className="rounded-xl border border-line bg-surface/80 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-ink">{editingId ? 'Edit Model' : 'Add Model'}</h3>
                      <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-surface"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {FIELD_DEFS.map((f) => (
                        <label key={f.key} className="flex flex-col gap-1">
                          <span className="text-[11px] text-ink-muted">{f.label}</span>
                          {f.type === 'select' ? (
                            <select
                              value={form[f.key] ?? ''}
                              onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                              className="px-2.5 py-1.5 rounded-lg bg-surface border border-line focus:border-line-strong outline-none text-xs"
                            >
                              {(f.options || []).map((opt) => (
                                <option key={opt} value={opt}>{opt || 'None'}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={f.type || 'text'}
                              value={form[f.key] ?? ''}
                              placeholder={f.placeholder}
                              onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                              className="px-2.5 py-1.5 rounded-lg bg-surface border border-line focus:border-line-strong outline-none text-xs"
                            />
                          )}
                        </label>
                      ))}
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <button onClick={() => setShowForm(false)} className="text-xs px-3 py-1.5 rounded-lg bg-surface hover:bg-surface">Cancel</button>
                      <button onClick={saveModel} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-elevated text-ink">
                        <Save className="w-3.5 h-3.5" /> Save
                      </button>
                    </div>
                  </div>
                )}

                {models.length === 0 && (
                  <div className="text-center py-16 text-ink-muted">
                    <Cpu className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No models yet — add one or pick from the Marketplace</p>
                  </div>
                )}

                {models.map((m) => (
                  <div key={m.id} className={`rounded-xl border p-4 transition-colors ${m.is_active ? 'border-line-strong/60 bg-accent/5' : 'border-line bg-surface/50 hover:border-line'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`px-2 py-1 rounded-md text-[10px] font-semibold border ${providerColor(m.provider)}`}>{m.provider}</div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-ink truncate">{m.name}</span>
                            {m.is_active && <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-ink border border-line-strong/40"><Zap className="w-2.5 h-2.5" /> ACTIVE</span>}
                          </div>
                          <p className="text-[11px] text-ink-muted font-mono truncate">{m.model_id} · {m.base_url}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {renderTestBadge(m.id)}
                        <button onClick={() => testModel(m.id)} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-surface hover:bg-surface transition-colors" title="Test connection">
                          <Play className="w-3 h-3" /> Test
                        </button>
                        {!m.is_active && (
                          <button onClick={() => activateModel(m.id)} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-ink transition-colors" title="Set as active model">
                            <Zap className="w-3 h-3" /> Activate
                          </button>
                        )}
                        <button onClick={() => openForm(m)} className="p-1 rounded-lg bg-surface hover:bg-surface transition-colors" title="Edit">
                          <FileJson className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => duplicateModel(m.id)} className="p-1 rounded-lg bg-surface hover:bg-surface transition-colors" title="Duplicate">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteModel(m.id)} className="p-1 rounded-lg bg-surface hover:bg-rose-900/60 transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {m.description && <p className="text-[11px] text-ink-muted mt-2">{m.description}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {modelCapabilities(m).map((c) => (
                        <span key={c} className={`text-[10px] px-1.5 py-0.5 rounded border ${CAP_META[c]?.color || 'bg-surface/15 text-ink-muted border-line/30'}`}>
                          {CAP_META[c]?.label || c}
                        </span>
                      ))}
                      {modelCapabilities(m).length === 0 && <span className="text-[10px] text-ink-muted">No capability flags</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'marketplace' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {templates.map((t) => {
                  const added = models.some((m) => m.id === t.id);
                  return (
                    <div key={t.id} className="rounded-xl border border-line bg-surface/50 p-4 hover:border-line transition-colors flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <div className={`px-2 py-1 rounded-md text-[10px] font-semibold border ${providerColor(t.provider)}`}>{t.provider}</div>
                        {added && <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"><CheckCircle2 className="w-2.5 h-2.5" /> ADDED</span>}
                      </div>
                      <h3 className="text-sm font-semibold text-ink">{t.name}</h3>
                      <p className="text-[11px] text-ink-muted font-mono mt-0.5">{t.modelId}</p>
                      <p className="text-[11px] text-ink-muted mt-2 flex-1">{t.description}</p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {t.capabilities.map((c) => (
                          <span key={c} className={`text-[10px] px-1.5 py-0.5 rounded border ${CAP_META[c]?.color || 'bg-surface/15 text-ink-muted border-line/30'}`}>
                            {CAP_META[c]?.label || c}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => (added ? testModel(t.id) : addTemplate(t))}
                          className="flex items-center gap-1.5 flex-1 justify-center text-xs px-3 py-1.5 rounded-lg bg-elevated text-ink transition-colors"
                        >
                          {added ? <><Play className="w-3 h-3" /> Test</> : <><Plus className="w-3 h-3" /> Add</>}
                        </button>
                        {renderTestBadge(t.id)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {tab === 'routes' && routesData && (
              <div className="max-w-2xl space-y-2">
                {routesData.tasks.map((task) => (
                  <div key={task} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface/50 px-4 py-3">
                    <div>
                      <p className="text-xs font-medium text-ink">{TASK_LABELS[task] || task}</p>
                      <p className="text-[10px] text-ink-muted font-mono">{task}</p>
                    </div>
                    <select
                      value={routesData.routes[task] || ''}
                      onChange={(e) => setRoutesData((s) => s ? { ...s, routes: { ...s.routes, [task]: e.target.value } } : s)}
                      className="px-2.5 py-1.5 rounded-lg bg-surface border border-line focus:border-line-strong outline-none text-xs min-w-[180px]"
                    >
                      <option value="">Default (active model)</option>
                      {routesData.models.map((mdl) => (
                        <option key={mdl.id} value={mdl.id}>{mdl.name} ({mdl.provider})</option>
                      ))}
                    </select>
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <button onClick={saveRoutes} className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-elevated text-ink transition-colors">
                    <Save className="w-3.5 h-3.5" /> Save Routes
                  </button>
                </div>
              </div>
            )}

            {tab === 'profiles' && profilesData && (
              <div className="max-w-2xl space-y-4">
                <div className="rounded-xl border border-line bg-surface/80 p-4">
                  <h3 className="text-sm font-semibold text-ink mb-3">Save current routes as profile</h3>
                  <div className="flex flex-col gap-2">
                    <input
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Profile name (e.g. Coding setup)"
                      className="px-2.5 py-1.5 rounded-lg bg-surface border border-line focus:border-line-strong outline-none text-xs"
                    />
                    <input
                      value={profileDesc}
                      onChange={(e) => setProfileDesc(e.target.value)}
                      placeholder="Description (optional)"
                      className="px-2.5 py-1.5 rounded-lg bg-surface border border-line focus:border-line-strong outline-none text-xs"
                    />
                    <button onClick={saveProfile} className="flex items-center gap-1.5 justify-center text-xs px-3 py-2 rounded-lg bg-elevated text-ink transition-colors">
                      <Save className="w-3.5 h-3.5" /> Save Profile
                    </button>
                  </div>
                </div>

                {profilesData.profiles.map((p) => (
                  <div key={p.id} className="rounded-xl border border-line bg-surface/50 p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{p.name}</p>
                      {p.description && <p className="text-[11px] text-ink-muted mt-0.5 truncate">{p.description}</p>}
                      {p.config_json && (
                        <p className="text-[10px] text-ink-muted font-mono mt-1 truncate">{Object.keys((p.config_json as any).routes || {}).length} routes configured</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => applyProfile(p.id)} className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-ink transition-colors">
                        <Zap className="w-3 h-3" /> Apply
                      </button>
                      <button onClick={() => deleteProfile(p.id)} className="p-1.5 rounded-lg bg-surface hover:bg-rose-900/60 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {profilesData.profiles.length === 0 && (
                  <p className="text-center text-ink-muted text-xs py-8">No profiles yet</p>
                )}
              </div>
            )}

            {tab === 'usage' && usage && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {[7, 30, 90].map((d) => (
                    <button
                      key={d}
                      onClick={() => setUsageDays(d)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors ${usageDays === d ? 'bg-accent text-accent-fg' : 'bg-surface text-ink-muted hover:bg-surface'}`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Requests', value: usage.totals.requests, icon: Activity },
                    { label: 'Tokens', value: Number(usage.totals.tokens).toLocaleString(), icon: Gauge },
                    { label: 'Avg latency', value: fmtLatency(usage.totals.avg_latency), icon: Zap },
                    { label: 'Success rate', value: `${Number(usage.totals.requests) > 0 ? Math.round((Number(usage.totals.successes) / Number(usage.totals.requests)) * 100) : 0}%`, icon: CheckCircle2 },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-line bg-surface/50 p-4">
                      <s.icon className="w-4 h-4 text-ink-muted mb-2" />
                      <p className="text-lg font-bold text-ink">{s.value}</p>
                      <p className="text-[11px] text-ink-muted">{s.label}</p>
                    </div>
                  ))}
                </div>

                {usage.byDay.length > 0 && (
                  <div className="rounded-xl border border-line bg-surface/50 p-4">
                    <h3 className="text-xs font-semibold text-ink mb-3">Requests per day</h3>
                    <div className="flex items-end gap-1 h-28">
                      {usage.byDay.slice(-14).map((d, i, arr) => {
                        const max = Math.max(...arr.map((x) => Number(x.requests)), 1);
                        const h = Math.max((Number(d.requests) / max) * 100, 2);
                        return (
                          <div key={d.day} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                            <span className="text-[9px] text-ink-muted">{Number(d.requests) > 0 ? d.requests : ''}</span>
                            <div className="w-full rounded-t bg-elevated" style={{ height: `${h}%` }} />
                            <span className="text-[9px] text-ink-muted truncate">{d.day.slice(5)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {usage.byProvider.length > 0 && (
                    <div className="rounded-xl border border-line bg-surface/50 p-4">
                      <h3 className="text-xs font-semibold text-ink mb-2">By provider</h3>
                      {usage.byProvider.slice(0, 6).map((p) => (
                        <div key={p.provider} className="flex items-center justify-between py-1.5 border-b border-line/60 last:border-0">
                          <span className="text-[11px] text-ink-muted">{p.provider}</span>
                          <span className="text-[11px] text-ink-muted">{Number(p.requests)} req · {fmtLatency(p.avg_latency)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {usage.byTask.length > 0 && (
                    <div className="rounded-xl border border-line bg-surface/50 p-4">
                      <h3 className="text-xs font-semibold text-ink mb-2">By task</h3>
                      {usage.byTask.slice(0, 8).map((t) => (
                        <div key={t.task} className="flex items-center justify-between py-1.5 border-b border-line/60 last:border-0">
                          <span className="text-[11px] text-ink-muted">{TASK_LABELS[t.task] || t.task}</span>
                          <span className={`text-[11px] ${Number(t.failures) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {Number(t.requests)} req {Number(t.failures) > 0 ? `· ${t.failures} fail` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'arena' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-line bg-surface/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-ink flex items-center gap-2"><Swords className="w-4 h-4 text-ink-muted" /> Model Arena</h3>
                      <p className="text-[11px] text-ink-muted mt-0.5">Run the same prompt through multiple models side-by-side</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                        <input type="checkbox" checked={arenaContext === 'repo'} onChange={(e) => setArenaContext(e.target.checked ? 'repo' : 'none')} className="accent-accent" />
                        Attach workspace context
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] text-ink-muted">Models</label>
                    <div className="flex flex-wrap gap-2">
                      {models.length === 0 && <span className="text-[11px] text-ink-muted">Add models first — none exist yet.</span>}
                      {models.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => toggleArenaModel(m.id)}
                          className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border transition-colors ${arenaSelected.has(m.id) ? 'border-line-strong bg-accent/15 text-ink' : 'border-line bg-surface/60 text-ink-muted hover:border-line'}`}
                          title={m.base_url}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${arenaSelected.has(m.id) ? 'bg-accent' : 'bg-surface'}`} />
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="text-[11px] text-ink-muted">Prompt</label>
                    <textarea
                      value={arenaPrompt}
                      onChange={(e) => setArenaPrompt(e.target.value)}
                      placeholder="e.g. Explain the tradeoffs of a monolith vs microservices for a small team…"
                      className="mt-1 w-full h-24 px-3 py-2 rounded-lg bg-surface border border-line focus:border-line-strong outline-none text-xs resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={arenaRunning ? stopArena : runArena}
                      disabled={arenaRunning ? false : arenaSelected.size < 1 || !arenaPrompt.trim()}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-ink transition-colors ${arenaRunning ? 'bg-rose-600 hover:bg-rose-500' : 'bg-elevated disabled:opacity-40 disabled:cursor-not-allowed'}`}
                    >
                      {arenaRunning ? <><X className="w-3.5 h-3.5" /> Stop</> : <><Send className="w-3.5 h-3.5" /> Run Arena ({arenaSelected.size})</>}
                    </button>
                    {arenaRunning && <Loader2 className="w-4 h-4 animate-spin text-ink-muted" />}
                  </div>
                </div>

                {Object.keys(arenaPanes).length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.values(arenaPanes).map((pane) => (
                      <div key={pane.model} className={`rounded-xl border p-3 flex flex-col min-h-0 ${pane.error ? 'border-rose-800/60 bg-rose-950/10' : 'border-line bg-surface/50'}`}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${providerColor(pane.provider)}`}>{pane.provider || 'model'}</span>
                              <span className="text-xs font-semibold text-ink truncate">{pane.name}</span>
                              {pane.done && !pane.error && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                              {!pane.done && arenaRunning && <Loader2 className="w-3.5 h-3.5 animate-spin text-ink-muted shrink-0" />}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-ink-muted mt-1 font-mono">
                              {pane.done && pane.latencyMs != null && <span>{(pane.latencyMs / 1000).toFixed(2)}s</span>}
                              {pane.done && pane.tokens != null && <span>· {pane.tokens} tok</span>}
                              {pane.done && pane.tokens != null && pane.latencyMs != null && pane.latencyMs > 0 && <span>· {Math.round(pane.tokens / (pane.latencyMs / 1000))} tok/s</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {pane.done && !pane.error && (
                              <>
                                <button
                                  onClick={() => setArenaWinners((w) => ({ ...w, [pane.model]: pane.model === arenaWinners[pane.model] ? '' : pane.model }))}
                                  className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg transition-colors ${arenaWinners[pane.model] ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-surface hover:bg-surface text-ink-muted'}`}
                                  title="Pick as winner"
                                >
                                  <Zap className="w-3 h-3" /> Winner
                                </button>
                                {onUseInChat && (
                                  <button onClick={() => useInChat(pane)} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-surface hover:bg-surface text-ink-muted transition-colors" title="Send to chat">
                                    <ClipboardPaste className="w-3 h-3" />
                                  </button>
                                )}
                              </>
                            )}
                            <button onClick={() => copyPane(pane)} disabled={!pane.text} className="p-1.5 rounded-lg bg-surface hover:bg-surface text-ink-muted transition-colors disabled:opacity-40" title="Copy">
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto max-h-72 rounded-lg bg-surface border border-line/60 p-2 text-[11px] font-mono text-ink-muted whitespace-pre-wrap break-words">
                          {pane.error ? (
                            <span className="text-rose-400">⚠ {pane.error}</span>
                          ) : pane.text ? (
                            pane.text
                          ) : (
                            <span className="text-ink-muted">{arenaRunning ? 'Generating…' : 'No output'}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-surface border border-line text-xs text-ink shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
