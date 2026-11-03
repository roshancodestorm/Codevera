import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, Sparkles, Zap } from 'lucide-react';

export type ModelSpeed = 'Fast' | 'High Fast' | 'Medium' | 'High';

export interface ModelOption {
  id: string;
  name: string;
  provider?: string;
  /** Optional speed tier declared in model metadata. Absent = no badge. */
  speed?: ModelSpeed | string;
}

interface Props {
  models: ModelOption[];
  value: string | null;
  onChange: (id: string) => void;
  /** Auto mode: no explicit model, the router picks. */
  auto?: boolean;
  onAutoChange?: (auto: boolean) => void;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** Optional status dot color rendered before the name in the trigger. */
  dotColor?: string;
  className?: string;
}

function SpeedBadge({ speed }: { speed: string }) {
  return (
    <span className="shrink-0 text-[10px] leading-none px-1.5 py-1 rounded border border-line text-ink-muted group-data-[active=true]:border-line-strong/50">
      {speed}
    </span>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative inline-flex items-center h-5 w-9 shrink-0 rounded-full border transition-colors ${on ? 'bg-accent border-accent' : 'bg-elevated border-line'}`}
    >
      <span className="absolute top-0.5 left-0.5 h-3.5 w-3.5 rounded-full bg-accent-fg shadow-sm transition-transform" style={{ transform: on ? 'translateX(16px)' : 'translateX(0)' }} />
    </button>
  );
}

export default function ModelSelector({
  models,
  value,
  onChange,
  auto = false,
  onAutoChange,
  loading = false,
  disabled = false,
  placeholder = 'Select model',
  dotColor,
  className = '',
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => models.find((m) => m.id === value) || null, [models, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) => m.name.toLowerCase().includes(q) || (m.provider || '').toLowerCase().includes(q));
  }, [models, query]);

  const close = useCallback(() => { setOpen(false); setQuery(''); }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) close(); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, close]);

  useEffect(() => {
    if (open) {
      setActiveIndex(Math.max(0, filtered.findIndex((m) => m.id === value)));
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const commit = (id: string) => {
    onChange(id);
    if (auto && onAutoChange) onAutoChange(false);
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(filtered.length - 1, i + 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(0, i - 1)); return; }
    if (e.key === 'Enter') { e.preventDefault(); const m = filtered[activeIndex]; if (m) commit(m.id); return; }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`} onKeyDown={onKeyDown}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 max-w-[15rem] px-2.5 py-1.5 rounded-md border border-line bg-surface hover:bg-elevated text-[11px] text-ink transition-colors disabled:opacity-40"
        title={auto ? 'Auto — router picks the model' : selected ? `${selected.name}${selected.provider ? ` (${selected.provider})` : ''}` : placeholder}
      >
        {auto ? (
          <Sparkles className="w-3.5 h-3.5 text-ink-muted shrink-0" />
        ) : dotColor ? (
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
        ) : null}
        <span className="truncate">{auto ? 'Auto' : selected ? selected.name : placeholder}</span>
        {!auto && selected?.speed && <SpeedBadge speed={selected.speed} />}
        <ChevronDown className={`w-3 h-3 shrink-0 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          aria-label="Models"
          className="absolute right-0 z-50 mt-1.5 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface shadow-2xl shadow-black/50 overflow-hidden"
        >
          {/* Header: search + auto */}
          <div className="flex items-center gap-2 px-2.5 py-2 border-b border-line">
            <div className="flex items-center gap-1.5 flex-1 px-2 py-1.5 rounded-md bg-canvas border border-line focus-within:border-line-strong/50">
              <Search className="w-3.5 h-3.5 text-ink-muted shrink-0" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
                placeholder="Search models"
                className="w-full bg-transparent text-[11px] text-ink placeholder:text-ink-muted outline-none"
              />
            </div>
            <label className="flex items-center gap-1.5 shrink-0 cursor-pointer" title="Auto — let the router pick">
              <span className="text-[10px] text-ink-muted">Auto</span>
              <Toggle on={auto} onChange={(v) => onAutoChange?.(v)} label="Auto model routing" />
            </label>
          </div>

          {/* List */}
          <div ref={listRef} className="max-h-80 overflow-y-auto py-1 scrollbar-thin">
            {loading && (
              <div className="px-3 py-6 text-center text-[11px] text-ink-muted">Loading models…</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-[11px] text-ink-muted">No models found</div>
            )}
            {!loading && filtered.map((m, idx) => {
              const isSelected = m.id === value && !auto;
              const isActive = idx === activeIndex;
              return (
                <button
                  key={m.id}
                  type="button"
                  data-idx={idx}
                  data-active={isSelected}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => commit(m.id)}
                  className={`group w-full flex items-center gap-2 px-2.5 py-2 text-left transition-colors ${isSelected ? 'bg-accent/10' : isActive ? 'bg-elevated/70' : 'hover:bg-elevated/60'}`}
                >
                  <span className="w-4 shrink-0 flex justify-center">
                    {isSelected ? <Check className="w-3.5 h-3.5 text-ink" /> : null}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-[12px] truncate ${isSelected ? 'text-ink font-medium' : 'text-ink-subtle'}`}>{m.name}</span>
                    {m.provider && <span className="block text-[10px] text-ink-muted truncate">{m.provider}</span>}
                  </span>
                  {m.speed && <SpeedBadge speed={m.speed} />}
                </button>
              );
            })}
          </div>

          {/* Footer hint */}
          <div className="px-3 py-1.5 border-t border-line flex items-center gap-1.5 text-[10px] text-ink-muted">
            <Zap className="w-2.5 h-2.5" /> ↑↓ navigate · Enter select · Esc close
          </div>
        </div>
      )}
    </div>
  );
}
