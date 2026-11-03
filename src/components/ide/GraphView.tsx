import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Copy, Loader2, Network, Search } from 'lucide-react';
import { ideApi } from './ideApi';

interface GNode { id: string; label: string; kind: string; file?: string; line?: number; signature?: string; }
interface GEdge { from: string; to: string; type: string; }

const KIND_COLORS: Record<string, string> = {
  function: '#8b5cf6',
  method: '#60a5fa',
  class: '#f472b6',
  const: '#34d399',
  let: '#34d399',
  var: '#34d399',
  arrow: '#34d399',
  'html-id': '#fbbf24',
  'css-selector': '#38bdf8',
  route: '#fb7185',
  env: '#a3e635',
  file: '#71717a',
  unknown: '#71717a',
};

const KIND_LABELS: Record<string, string> = {
  function: 'function', method: 'method', class: 'class', const: 'const',
  'html-id': 'html id', 'css-selector': 'css', route: 'route', env: 'env', file: 'file',
};

function toMermaid(nodes: GNode[], edges: GEdge[]): string {
  const sanitize = (s: string) => String(s || '').replace(/["\n]/g, '').slice(0, 40);
  const lines = ['graph LR'];
  for (const n of nodes) {
    const id = `N${nodes.indexOf(n)}`;
    const label = sanitize(n.label.split('::').pop() || n.id);
    lines.push(`  ${id}["${label}"]`);
  }
  const idMap = new Map(nodes.map((n, i) => [n.id, `N${i}`]));
  for (const e of edges) {
    const a = idMap.get(e.from);
    const b = idMap.get(e.to);
    if (a && b) lines.push(`  ${a} --> ${b}`);
  }
  return lines.join('\n');
}

export default function GraphView({
  workspace, projectMode, onOpenFile,
}: {
  workspace: string;
  projectMode: boolean;
  onOpenFile: (file: string, line?: number) => void;
}) {
  const [nodes, setNodes] = useState<GNode[]>([]);
  const [edges, setEdges] = useState<GEdge[]>([]);
  const [selected, setSelected] = useState<GNode | null>(null);
  const [depth, setDepth] = useState(2);
  const [type, setType] = useState<'all' | 'import' | 'call'>('all');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (opts: { node?: string; depth?: number; type?: string } = {}) => {
    setBusy(true);
    setErr('');
    try {
      const g = await ideApi.indexGraph(workspace, { depth, type, ...opts });
      setNodes(g.nodes);
      setEdges(g.edges);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }, [workspace, depth, type]);

  useEffect(() => { load(); }, [load]);

  const focus = (n: GNode) => {
    setSelected(n);
    load({ node: n.id, depth, type });
  };

  const reset = () => {
    setSelected(null);
    load();
  };

  const visible = useMemo(() => {
    if (!query.trim()) return nodes;
    const q = query.toLowerCase();
    return nodes.filter((n) => n.label.toLowerCase().includes(q));
  }, [nodes, query]);
  const visibleIds = useMemo(() => new Set(visible.map((n) => n.id)), [visible]);
  const visibleEdges = useMemo(() => edges.filter((e) => visibleIds.has(e.from) && visibleIds.has(e.to)), [edges, visibleIds]);

  const pos = useMemo(() => {
    const P = new Map<string, { x: number; y: number }>();
    const W = 620, H = 400, cx = W / 2, cy = H / 2;
    if (selected && visible.some((n) => n.id === selected.id)) {
      const hops = new Map<string, number>();
      const q: string[] = [selected.id];
      hops.set(selected.id, 0);
      while (q.length) {
        const cur = q.shift()!;
        for (const e of visibleEdges) {
          const other = e.from === cur ? e.to : e.to === cur ? e.from : null;
          if (other && !hops.has(other)) { hops.set(other, (hops.get(cur) || 0) + 1); q.push(other); }
        }
      }
      for (const n of visible) {
        const h = hops.get(n.id) ?? 1;
        const idx = [...visible].filter((x) => (hops.get(x.id) ?? 1) === h).findIndex((x) => x.id === n.id);
        const count = Math.max(1, [...visible].filter((x) => (hops.get(x.id) ?? 1) === h).length);
        const angle = (idx / count) * Math.PI * 2 - Math.PI / 2;
        const r = h === 0 ? 0 : Math.min(W, H) / 2 - 40 * h;
        P.set(n.id, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
      }
      return P;
    }
    const sorted = [...visible].sort((a, b) => (a.kind < b.kind ? -1 : 1));
    const r = Math.min(W, H) / 2 - 46;
    sorted.forEach((n, i) => {
      const angle = (i / Math.max(1, sorted.length)) * Math.PI * 2 - Math.PI / 2;
      P.set(n.id, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    });
    return P;
  }, [visible, visibleEdges, selected]);

  const kinds = useMemo(() => [...new Set(nodes.map((n) => n.kind))].sort(), [nodes]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5">
          <Search className="w-3 h-3 text-ink-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter nodes..." className="flex-1 bg-transparent text-[11px] text-ink outline-none placeholder:text-ink-muted" />
        </div>
        {nodes.length > 0 && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(toMermaid(visible, visibleEdges)).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }).catch(() => {});
            }}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[10px] transition-colors ${copied ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' : 'border-line bg-surface text-ink-subtle hover:text-ink'}`}
            title="Copy graph as Mermaid diagram"
          >
            <Copy className="w-3 h-3" /> {copied ? 'Copied!' : 'Mermaid'}
          </button>
        )}
        {selected && (
          <button onClick={reset} className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-line bg-surface text-[10px] text-ink-subtle hover:text-ink">
            <ArrowLeft className="w-3 h-3" /> Full graph
          </button>
        )}
        <select value={String(depth)} onChange={(e) => setDepth(Number(e.target.value))} className="rounded-lg border border-line bg-surface px-1.5 py-1.5 text-[10px] text-ink outline-none">
          <option value="1">depth 1</option>
          <option value="2">depth 2</option>
          <option value="3">depth 3</option>
        </select>
        <select value={type} onChange={(e) => setType(e.target.value as any)} className="rounded-lg border border-line bg-surface px-1.5 py-1.5 text-[10px] text-ink outline-none">
          <option value="all">all edges</option>
          <option value="call">calls only</option>
          <option value="import">imports only</option>
        </select>
      </div>

      {err && <p className="text-[10px] text-red-400">{err}</p>}

      <div className="rounded-xl border border-line bg-surface p-2 relative">
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface z-10">
            <Loader2 className="w-4 h-4 text-ink-muted animate-spin" />
          </div>
        )}
        {nodes.length === 0 && !busy && (
          <p className="text-xs text-ink-muted py-10 text-center">No symbol data — the index builds when a workspace is opened</p>
        )}
        {nodes.length > 0 && (
          <svg viewBox="0 0 620 400" className="w-full h-auto">
            {visibleEdges.map((e, i) => {
              const a = pos.get(e.from);
              const b = pos.get(e.to);
              if (!a || !b) return null;
              const color = e.type === 'call' ? 'rgba(52,211,153,0.25)' : e.type === 'import' ? 'rgba(139,92,246,0.25)' : 'rgba(251,191,36,0.2)';
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={e.type === 'call' ? 0.8 : 0.5} />;
            })}
            {visible.map((n) => {
              const p = pos.get(n.id);
              if (!p) return null;
              const color = KIND_COLORS[n.kind] || KIND_COLORS.unknown;
              const isSel = selected?.id === n.id;
              const label = String(n.label).split('::').pop() || n.id;
              return (
                <g key={n.id} onClick={() => focus(n)} onDoubleClick={() => onOpenFile(n.file || '', n.line)} style={{ cursor: 'pointer' }}>
                  <circle cx={p.x} cy={p.y} r={isSel ? 7 : 5} fill={isSel ? color : '#1b1430'} stroke={color} strokeWidth={isSel ? 1.6 : 0.9} />
                  <text x={p.x} y={p.y + 14} textAnchor="middle" fontSize={isSel ? 8 : 6.5} fill={isSel ? '#e4e4e7' : '#71717a'}>{label.length > 24 ? label.slice(0, 23) + '…' : label}</text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {selected && (
        <div className="rounded-xl border border-line-strong/30 bg-accent/5 p-3 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Network className="w-3 h-3 text-ink" />
            <span className="text-[11px] font-medium text-ink">{String(selected.label).split('::').pop()}</span>
            <span className="px-1.5 py-px rounded-full bg-accent/15 text-ink text-[9px] font-mono">{KIND_LABELS[selected.kind] || selected.kind}</span>
            <button
              onClick={() => onOpenFile(selected.file || '', selected.line)}
              disabled={!selected.file}
              className="ml-auto text-[10px] px-2 py-0.5 rounded-md bg-accent hover:bg-accent text-accent-fg disabled:opacity-40 transition-colors"
            >
              {selected.file ? `Open ${selected.file.split('/').pop()}${selected.line ? `:${selected.line}` : ''}` : 'No file'}
            </button>
          </div>
          {selected.signature && <p className="text-[10px] font-mono text-ink-muted">{selected.signature}</p>}
          <p className="text-[10px] text-ink-muted">Click a node to expand its neighborhood · double-click to jump to the definition</p>
        </div>
      )}

      {!selected && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {kinds.map((k) => (
            <span key={k} className="flex items-center gap-1 text-[9px] text-ink-muted">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: KIND_COLORS[k] || '#71717a' }} /> {KIND_LABELS[k] || k}
            </span>
          ))}
          <span className="flex items-center gap-1 text-[9px] text-ink-muted">
            <span className="w-3 border-t" style={{ borderColor: 'rgba(52,211,153,0.5)' }} /> call
          </span>
          <span className="flex items-center gap-1 text-[9px] text-ink-muted">
            <span className="w-3 border-t" style={{ borderColor: 'rgba(139,92,246,0.5)' }} /> import
          </span>
        </div>
      )}
      <p className="text-[10px] text-ink-muted">Workspace: <span className="text-ink-subtle">{workspace}</span>{projectMode ? ' · project scope (src/backend/public)' : ''} · {nodes.length} nodes</p>
    </div>
  );
}
