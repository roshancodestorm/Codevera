/**
 * ComposerPanel.tsx
 *
 * Cursor Composer-style targeted multi-file editor.
 * Users pick specific files, type an instruction, and the AI atomically edits
 * all selected files in a single LLM call.  A checkpoint is created so they
 * can roll back instantly.
 */

import React, { useState, useCallback } from 'react';
import {
  Files,
  Wand2,
  X,
  Plus,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const BASE = 'http://localhost:5000';

interface FileEntry {
  path: string;
  name?: string;
  type: 'file' | 'dir';
  children?: FileEntry[];
}

interface ComposerResult {
  ok: boolean;
  applied: string[];
  errors: { path: string; error: string }[];
  checkpointId: string;
  model?: { id: string; name: string };
}

interface Props {
  workspace: string;
  fileTree: FileEntry[];
  onClose?: () => void;
  authToken?: string | null;
}

// ── tiny helpers ──────────────────────────────────────────────────────────────

function flattenFiles(tree: FileEntry[], prefix = ''): string[] {
  const out: string[] = [];
  for (const entry of tree) {
    const full = prefix ? `${prefix}/${entry.name ?? (entry as any).path}` : (entry.name ?? (entry as any).path ?? entry.path);
    if (entry.type === 'file') {
      out.push(full.replace(/^\//, ''));
    } else if (entry.type === 'dir' && entry.children) {
      out.push(...flattenFiles(entry.children, full));
    }
  }
  return out;
}

// Collects .path values recursively for a FileEntry tree that uses the
// {name, type, path, children} shape returned by the workspace tree API.
function collectPaths(tree: FileEntry[]): string[] {
  const out: string[] = [];
  const walk = (entries: FileEntry[]) => {
    for (const e of entries) {
      if (e.type === 'file') out.push((e as any).path ?? e.path);
      if (e.type === 'dir' && e.children) walk(e.children);
    }
  };
  walk(tree);
  return out;
}

// ── Sub-component: file picker ────────────────────────────────────────────────

function FilePicker({
  allFiles,
  selected,
  onToggle,
}: {
  allFiles: string[];
  selected: Set<string>;
  onToggle: (f: string) => void;
}) {
  const [filter, setFilter] = useState('');
  const visible = filter
    ? allFiles.filter((f) => f.toLowerCase().includes(filter.toLowerCase()))
    : allFiles;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <input
        type="text"
        placeholder="Filter files…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{
          background: '#18181f',
          border: '1px solid #2d2d3a',
          borderRadius: 6,
          color: '#e4e4e7',
          padding: '5px 10px',
          fontSize: 12,
          outline: 'none',
        }}
      />
      <div
        style={{
          maxHeight: 200,
          overflowY: 'auto',
          background: '#111118',
          borderRadius: 6,
          border: '1px solid #2d2d3a',
          padding: 4,
        }}
      >
        {visible.length === 0 && (
          <div style={{ color: '#52525b', fontSize: 12, padding: '6px 8px' }}>No files</div>
        )}
        {visible.map((f) => (
          <label
            key={f}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '3px 8px',
              borderRadius: 4,
              cursor: 'pointer',
              background: selected.has(f) ? 'rgba(124,58,237,0.12)' : 'transparent',
              color: selected.has(f) ? '#c4b5fd' : '#a1a1aa',
              fontSize: 12,
            }}
          >
            <input
              type="checkbox"
              checked={selected.has(f)}
              onChange={() => onToggle(f)}
              style={{ accentColor: '#7c3aed' }}
            />
            <span style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{f}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ComposerPanel({ workspace, fileTree, onClose, authToken }: Props) {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [instruction, setInstruction] = useState('');
  const [context, setContext] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ComposerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);

  const allFiles = collectPaths(fileTree);

  const toggleFile = useCallback((f: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  }, []);

  const run = async () => {
    if (!instruction.trim()) return;
    if (selectedFiles.size === 0) {
      setError('Select at least one file to edit.');
      return;
    }
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      const res = await fetch(`${BASE}/api/ide/composer`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          workspace,
          files: [...selectedFiles],
          instruction: instruction.trim(),
          context: context.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data as ComposerResult);
    } catch (err: any) {
      setError(err.message || 'Composer failed');
    } finally {
      setRunning(false);
    }
  };

  const rollback = async () => {
    if (!result?.checkpointId) return;
    setRolling(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      await fetch(`${BASE}/api/ide/checkpoints/restore`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ workspace, runId: result.checkpointId }),
      });
      setResult(null);
    } catch {}
    setRolling(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#0f0f14',
        color: '#e4e4e7',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 13,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderBottom: '1px solid #1e1e2a',
          background: '#12121a',
          flexShrink: 0,
        }}
      >
        <Wand2 size={15} color="#7c3aed" />
        <span style={{ fontWeight: 600, fontSize: 13, color: '#c4b5fd' }}>Composer</span>
        <span style={{ flex: 1 }} />
        <span style={{ color: '#52525b', fontSize: 11 }}>Multi-file AI edits</span>
        {onClose && (
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', lineHeight: 1 }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* File selection */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 6,
              color: '#a1a1aa',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <Files size={11} />
            Files to Edit
            {selectedFiles.size > 0 && (
              <span
                style={{
                  marginLeft: 4,
                  background: '#7c3aed',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '0 6px',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              >
                {selectedFiles.size}
              </span>
            )}
          </div>
          <FilePicker allFiles={allFiles} selected={selectedFiles} onToggle={toggleFile} />
        </div>

        {/* Selected chips */}
        {selectedFiles.size > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {[...selectedFiles].map((f) => (
              <span
                key={f}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'rgba(124,58,237,0.15)',
                  border: '1px solid rgba(124,58,237,0.3)',
                  borderRadius: 4,
                  padding: '2px 6px',
                  fontSize: 11,
                  color: '#c4b5fd',
                  fontFamily: 'monospace',
                }}
              >
                {f.split('/').pop()}
                <X
                  size={10}
                  style={{ cursor: 'pointer', opacity: 0.7 }}
                  onClick={() => toggleFile(f)}
                />
              </span>
            ))}
          </div>
        )}

        {/* Instruction */}
        <div>
          <div
            style={{
              color: '#a1a1aa',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 6,
            }}
          >
            Instruction
          </div>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Describe the change you want across all selected files…"
            rows={4}
            style={{
              width: '100%',
              background: '#18181f',
              border: '1px solid #2d2d3a',
              borderRadius: 6,
              color: '#e4e4e7',
              padding: '8px 10px',
              fontSize: 13,
              resize: 'vertical',
              outline: 'none',
              lineHeight: 1.5,
              boxSizing: 'border-box',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run();
            }}
          />
          <div style={{ color: '#52525b', fontSize: 11, marginTop: 3 }}>⌘↵ / Ctrl+↵ to run</div>
        </div>

        {/* Advanced context (collapsible) */}
        <div>
          <button
            onClick={() => setShowAdvanced((p) => !p)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#71717a',
              fontSize: 11,
              padding: 0,
            }}
          >
            {showAdvanced ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Extra context (optional)
          </button>
          {showAdvanced && (
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Architecture notes, constraints, style guide…"
              rows={3}
              style={{
                marginTop: 6,
                width: '100%',
                background: '#18181f',
                border: '1px solid #2d2d3a',
                borderRadius: 6,
                color: '#e4e4e7',
                padding: '8px 10px',
                fontSize: 12,
                resize: 'vertical',
                outline: 'none',
                lineHeight: 1.5,
                boxSizing: 'border-box',
              }}
            />
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 6,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 6,
              padding: '8px 10px',
              color: '#fca5a5',
              fontSize: 12,
            }}
          >
            <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            style={{
              background: result.ok ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)',
              border: `1px solid ${result.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
              borderRadius: 6,
              padding: '10px 12px',
              fontSize: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 6,
                color: result.ok ? '#86efac' : '#fca5a5',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={13} />
              {result.ok
                ? `${result.applied.length} file${result.applied.length !== 1 ? 's' : ''} updated`
                : 'Composer failed'}
            </div>
            {result.applied.length > 0 && (
              <div style={{ color: '#a1a1aa', marginBottom: 4 }}>
                {result.applied.map((f) => (
                  <div key={f} style={{ fontFamily: 'monospace', fontSize: 11 }}>
                    ✓ {f}
                  </div>
                ))}
              </div>
            )}
            {result.errors.length > 0 && (
              <div style={{ color: '#fca5a5' }}>
                {result.errors.map((e) => (
                  <div key={e.path} style={{ fontFamily: 'monospace', fontSize: 11 }}>
                    ✗ {e.path}: {e.error}
                  </div>
                ))}
              </div>
            )}
            {result.model && (
              <div style={{ color: '#52525b', fontSize: 10, marginTop: 4 }}>via {result.model.name}</div>
            )}
            {result.ok && (
              <button
                onClick={rollback}
                disabled={rolling}
                style={{
                  marginTop: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: 'rgba(124,58,237,0.15)',
                  border: '1px solid rgba(124,58,237,0.3)',
                  borderRadius: 5,
                  color: '#c4b5fd',
                  padding: '4px 10px',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                {rolling ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                Rollback
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer / Run button */}
      <div
        style={{
          padding: '10px 14px',
          borderTop: '1px solid #1e1e2a',
          background: '#12121a',
          flexShrink: 0,
        }}
      >
        <button
          onClick={run}
          disabled={running || !instruction.trim() || selectedFiles.size === 0}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            padding: '9px 0',
            borderRadius: 7,
            border: 'none',
            background:
              running || !instruction.trim() || selectedFiles.size === 0
                ? '#1e1e2a'
                : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            color:
              running || !instruction.trim() || selectedFiles.size === 0 ? '#52525b' : '#fff',
            fontWeight: 600,
            fontSize: 13,
            cursor:
              running || !instruction.trim() || selectedFiles.size === 0
                ? 'not-allowed'
                : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {running ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Applying edits…
            </>
          ) : (
            <>
              <Wand2 size={14} />
              Apply to {selectedFiles.size || '?'} file{selectedFiles.size !== 1 ? 's' : ''}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
