import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Loader2, Play, Plus, RefreshCw, Trash2, X, Zap } from 'lucide-react';
import { ideApi } from './ideApi';

interface ApiRoute {
  method: string;
  path: string;
  file: string;
}

interface TestResult {
  ok: boolean;
  status: number;
  statusText: string;
  latency: number;
  body: string;
  headers: Record<string, string>;
  error?: string;
}

interface SavedRequest {
  id: string;
  method: string;
  path: string;
  body: string;
  headers: string;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  POST: 'text-ink-muted bg-accent/10 border-line-strong/30',
  PUT: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
  PATCH: 'text-ink bg-accent/10 border-line-strong/30',
  DELETE: 'text-rose-300 bg-rose-500/10 border-rose-500/30',
  OPTIONS: 'text-ink bg-line-strong/10 border-line/30',
};

interface Props {
  workspace: string;
  onToast: (msg: string) => void;
}

export default function ApiTestPanel({ workspace, onToast }: Props) {
  const [routes, setRoutes] = useState<ApiRoute[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [method, setMethod] = useState('GET');
  const [routePath, setRoutePath] = useState('/');
  const [bodyText, setBodyText] = useState('');
  const [headersText, setHeadersText] = useState('');
  const [port, setPort] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [savedReqs, setSavedReqs] = useState<SavedRequest[]>([]);
  const [routesOpen, setRoutesOpen] = useState(true);
  const [respTab, setRespTab] = useState<'body' | 'headers'>('body');

  const loadRoutes = useCallback(async () => {
    if (!workspace) return;
    setLoadingRoutes(true);
    try {
      const r = await ideApi.apiRoutes(workspace);
      setRoutes(r.routes);
    } catch {}
    setLoadingRoutes(false);
  }, [workspace]);

  useEffect(() => { loadRoutes(); }, [loadRoutes]);

  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      let parsedHeaders: Record<string, string> = {};
      if (headersText.trim()) {
        try { parsedHeaders = JSON.parse(headersText); } catch {}
      }
      let parsedBody: unknown = undefined;
      if (bodyText.trim()) {
        try { parsedBody = JSON.parse(bodyText); } catch { parsedBody = bodyText; }
      }
      const r = await ideApi.apiTest(workspace, method, routePath, parsedHeaders, parsedBody, port ? Number(port) : undefined);
      setResult(r);
    } catch (err: any) {
      onToast(`Request failed: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const selectRoute = (r: ApiRoute) => {
    setMethod(r.method);
    setRoutePath(r.path);
    setResult(null);
  };

  const saveRequest = () => {
    const req: SavedRequest = { id: Date.now().toString(), method, path: routePath, body: bodyText, headers: headersText };
    setSavedReqs((prev) => [...prev, req]);
    onToast('Request saved');
  };

  const loadRequest = (r: SavedRequest) => {
    setMethod(r.method);
    setRoutePath(r.path);
    setBodyText(r.body);
    setHeadersText(r.headers);
    setResult(null);
  };

  const statusColor = (s: number) => {
    if (s >= 200 && s < 300) return 'text-emerald-300';
    if (s >= 400) return 'text-rose-300';
    return 'text-amber-300';
  };

  return (
    <div className="flex flex-col gap-3 h-full min-h-0 overflow-hidden">
      {/* Detected routes */}
      <div className="shrink-0">
        <button
          onClick={() => setRoutesOpen((o) => !o)}
          className="flex items-center gap-1.5 w-full text-[10px] font-semibold text-ink-muted uppercase tracking-wider hover:text-ink transition-colors"
        >
          {routesOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          Detected Routes ({routes.length})
          <button onClick={(e) => { e.stopPropagation(); loadRoutes(); }} className="ml-auto p-0.5 text-ink-muted hover:text-ink">
            {loadingRoutes ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </button>
        </button>
        {routesOpen && routes.length > 0 && (
          <div className="mt-1 rounded-lg border border-line overflow-hidden max-h-36 overflow-y-auto">
            {routes.map((r, i) => (
              <button
                key={i}
                onClick={() => selectRoute(r)}
                className="flex items-center gap-2 px-2.5 py-1.5 w-full hover:bg-elevated/50 transition-colors text-left border-b border-line/40 last:border-0"
              >
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${METHOD_COLORS[r.method] || METHOD_COLORS['GET']}`}>{r.method}</span>
                <span className="text-[11px] font-mono text-ink truncate flex-1">{r.path}</span>
                <span className="text-[10px] text-ink-muted truncate max-w-[80px]">{r.file.split('/').pop()}</span>
              </button>
            ))}
          </div>
        )}
        {routesOpen && routes.length === 0 && !loadingRoutes && (
          <p className="text-[10px] text-ink-muted mt-1">No Express/Flask routes found. Open a project with routes first.</p>
        )}
      </div>

      {/* Request builder */}
      <div className="shrink-0 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="shrink-0 px-2 py-1 rounded-lg border border-line bg-surface text-[11px] font-medium outline-none focus:border-line-strong/50 text-ink"
          >
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            value={routePath}
            onChange={(e) => setRoutePath(e.target.value)}
            placeholder="/api/..."
            className="flex-1 px-2.5 py-1 rounded-lg border border-line bg-surface text-[11px] font-mono text-ink placeholder:text-ink-muted outline-none focus:border-line-strong/50"
            onKeyDown={(e) => e.key === 'Enter' && run()}
          />
          <input
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder=":port"
            className="w-16 px-2 py-1 rounded-lg border border-line bg-surface text-[11px] font-mono text-ink-muted placeholder:text-ink-subtle outline-none focus:border-line-strong/50"
          />
          <button
            onClick={run}
            disabled={running}
            className="shrink-0 flex items-center gap-1 px-3 py-1 rounded-lg bg-accent hover:bg-accent text-accent-fg text-[11px] disabled:opacity-40 transition-colors"
          >
            {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            Send
          </button>
        </div>
        {['POST', 'PUT', 'PATCH'].includes(method) && (
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder='{"key": "value"}'
            rows={3}
            className="w-full px-2.5 py-1.5 rounded-lg border border-line bg-surface text-[11px] font-mono text-ink placeholder:text-ink-muted outline-none focus:border-line-strong/50 resize-none"
          />
        )}
        <div className="flex items-center gap-2">
          <button onClick={saveRequest} className="flex items-center gap-1 text-[10px] text-ink-muted hover:text-ink transition-colors">
            <Plus className="w-3 h-3" /> Save
          </button>
          {savedReqs.map((r) => (
            <button key={r.id} onClick={() => loadRequest(r)} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-elevated border border-line text-[10px] text-ink-subtle hover:text-ink transition-colors">
              <span className={`text-[8px] font-bold ${METHOD_COLORS[r.method]?.split(' ')[0]}`}>{r.method}</span> {r.path}
              <button onClick={(e) => { e.stopPropagation(); setSavedReqs((p) => p.filter((x) => x.id !== r.id)); }} className="ml-0.5 text-ink-muted hover:text-rose-400"><X className="w-2.5 h-2.5" /></button>
            </button>
          ))}
        </div>
      </div>

      {/* Response */}
      {result && (
        <div className="flex-1 min-h-0 flex flex-col gap-1.5 overflow-hidden">
          <div className="flex items-center gap-2 shrink-0">
            {result.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
            <span className={`text-[12px] font-bold ${statusColor(result.status)}`}>{result.status} {result.statusText}</span>
            <span className="text-[10px] text-ink-muted">{result.latency}ms</span>
            <div className="ml-auto flex items-center gap-1">
              {(['body', 'headers'] as const).map((t) => (
                <button key={t} onClick={() => setRespTab(t)} className={`px-2 py-0.5 rounded text-[10px] transition-colors ${respTab === t ? 'bg-accent text-accent-fg' : 'text-ink-muted hover:text-ink'}`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 rounded-lg border border-line bg-canvas">
            {respTab === 'body' ? (
              <pre className="p-3 text-[11px] font-mono text-ink whitespace-pre-wrap break-words">{
                (() => { try { return JSON.stringify(JSON.parse(result.body), null, 2); } catch { return result.body; } })()
              }</pre>
            ) : (
              <div className="p-2 space-y-1">
                {Object.entries(result.headers).map(([k, v]) => (
                  <div key={k} className="flex items-start gap-2">
                    <span className="text-[10px] font-medium text-ink-subtle shrink-0">{k}</span>
                    <span className="text-[10px] text-ink-muted break-all">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
