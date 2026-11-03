/**
 * PtyTerminal.tsx
 *
 * Full interactive PTY terminal using xterm.js + the backend pty.js WebSocket.
 * Supports:
 *  - Real stdin/stdout/stderr (vim, python REPL, git, npm run dev …)
 *  - ANSI colours and escape sequences
 *  - Terminal resize (ResizeObserver)
 *  - Copy-paste, search addon
 *  - Reconnect on disconnect
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal, type ITheme } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import '@xterm/xterm/css/xterm.css';
import { Loader2, RefreshCw, X, Search } from 'lucide-react';
import { useTheme, resolveTheme } from '../../utils/theme';

const WS_BASE = 'ws://localhost:5000';

const TERM_DARK: ITheme = {
  background:   '#0c0c10',
  foreground:   '#e4e4e7',
  cursor:       '#a855f7',
  cursorAccent: '#0c0c10',
  selectionBackground: 'rgba(124,58,237,0.35)',
  black:   '#1c1c24', red:     '#f87171', green:   '#4ade80', yellow:  '#fbbf24',
  blue:    '#60a5fa', magenta: '#c084fc', cyan:    '#34d399', white:   '#e4e4e7',
  brightBlack:   '#52525b', brightRed:     '#fca5a5', brightGreen:  '#86efac',
  brightYellow:  '#fde68a', brightBlue:    '#93c5fd', brightMagenta:'#d8b4fe',
  brightCyan:    '#6ee7b7', brightWhite:   '#f4f4f5',
};

const TERM_LIGHT: ITheme = {
  background:   '#ffffff',
  foreground:   '#18181b',
  cursor:       '#7c3aed',
  cursorAccent: '#ffffff',
  selectionBackground: 'rgba(124,58,237,0.25)',
  black:   '#18181b', red:     '#dc2626', green:   '#16a34a', yellow:  '#b45309',
  blue:    '#2563eb', magenta: '#7c3aed', cyan:    '#0891b2', white:   '#e4e4e7',
  brightBlack:   '#71717a', brightRed:     '#ef4444', brightGreen:  '#22c55e',
  brightYellow:  '#d97706', brightBlue:    '#3b82f6', brightMagenta:'#8b5cf6',
  brightCyan:    '#06b6d4', brightWhite:   '#fafafa',
};

interface Props {
  workspace: string;
  /** Initial command to run on first connect (optional) */
  initCmd?: string;
  onClose?: () => void;
  style?: React.CSSProperties;
}

type ConnState = 'connecting' | 'open' | 'closed' | 'error';

export default function PtyTerminal({ workspace, initCmd, onClose, style }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef      = useRef<Terminal | null>(null);
  const fitRef       = useRef<FitAddon | null>(null);
  const searchRef    = useRef<SearchAddon | null>(null);
  const wsRef        = useRef<WebSocket | null>(null);
  const resizeObRef  = useRef<ResizeObserver | null>(null);

  const [connState, setConnState] = useState<ConnState>('connecting');
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Keep the terminal palette in sync with the app theme without reconnecting.
  const [themeMode] = useTheme();
  const dark = resolveTheme(themeMode) === 'dark';
  const darkRef = useRef(dark);

  useEffect(() => {
    darkRef.current = dark;
    if (termRef.current) {
      termRef.current.options.theme = dark ? TERM_DARK : TERM_LIGHT;
    }
  }, [dark]);

  // ── Connect / reconnect ──────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!containerRef.current) return;

    setConnState('connecting');

    // ── Create xterm ──────────────────────────────────────────────────────
    if (termRef.current) {
      termRef.current.dispose();
    }
    const term = new Terminal({
      fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Menlo, monospace',
      fontSize: 13,
      lineHeight: 1.35,
      cursorBlink: true,
      cursorStyle: 'block',
      allowProposedApi: true,
      theme: darkRef.current ? TERM_DARK : TERM_LIGHT,
      scrollback: 5000,
      convertEol: true,
    });
    termRef.current = term;

    const fit = new FitAddon();
    const links = new WebLinksAddon();
    const search = new SearchAddon();
    fitRef.current = fit;
    searchRef.current = search;

    term.loadAddon(fit);
    term.loadAddon(links);
    term.loadAddon(search);
    term.open(containerRef.current);
    fit.fit();

    const { cols, rows } = term;

    // ── WebSocket ─────────────────────────────────────────────────────────
    const wsUrl = `${WS_BASE}/api/ide/pty?workspace=${encodeURIComponent(workspace)}&cols=${cols}&rows=${rows}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      setConnState('open');
      // Send initial command if provided
      if (initCmd) {
        ws.send(JSON.stringify({ type: 'input', data: initCmd + '\r' }));
      }
    };

    ws.onmessage = (evt) => {
      let msg: { type: string; data?: string; code?: number; message?: string };
      try {
        msg = JSON.parse(typeof evt.data === 'string' ? evt.data : new TextDecoder().decode(evt.data));
      } catch { return; }
      if (msg.type === 'output' && msg.data) term.write(msg.data);
      if (msg.type === 'exit') {
        term.writeln(`\r\n\x1b[2m[Process exited with code ${msg.code}]\x1b[0m`);
        setConnState('closed');
      }
      if (msg.type === 'error') {
        term.writeln(`\r\n\x1b[31m[Error: ${msg.message}]\x1b[0m`);
        setConnState('error');
      }
    };

    ws.onclose = () => {
      setConnState((prev) => prev === 'open' ? 'closed' : prev);
    };

    ws.onerror = () => setConnState('error');

    // ── Terminal input → WebSocket ────────────────────────────────────────
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });

    // ── Resize ────────────────────────────────────────────────────────────
    const sendResize = () => {
      fit.fit();
      const { cols: c, rows: r } = term;
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols: c, rows: r }));
      }
    };

    resizeObRef.current?.disconnect();
    const ro = new ResizeObserver(() => sendResize());
    if (containerRef.current) ro.observe(containerRef.current);
    resizeObRef.current = ro;

    return () => {
      ws.close();
      term.dispose();
      ro.disconnect();
    };
  }, [workspace, initCmd]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup?.();
      wsRef.current?.close();
      termRef.current?.dispose();
      resizeObRef.current?.disconnect();
    };
  }, [connect]);

  // ── Search ────────────────────────────────────────────────────────────────
  const doSearch = (forward = true) => {
    if (!searchRef.current || !searchTerm) return;
    if (forward) searchRef.current.findNext(searchTerm, { incremental: true });
    else         searchRef.current.findPrevious(searchTerm);
  };

  const statusColor = {
    connecting: '#f59e0b',
    open:       '#4ade80',
    closed:     '#71717a',
    error:      '#f87171',
  }[connState];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 10px',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--line)',
          flexShrink: 0,
          fontSize: 12,
          color: 'var(--ink-muted)',
          userSelect: 'none',
        }}
      >
        {/* Status dot */}
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
        <span style={{ fontWeight: 500, color: 'var(--ink)' }}>Terminal</span>
        {connState === 'connecting' && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
        <span style={{ color: 'var(--ink-subtle)', fontSize: 11, fontFamily: 'monospace' }}>
          {workspace || 'shell'}
        </span>
        <span style={{ flex: 1 }} />

        {/* Search toggle */}
        <button
          onClick={() => setShowSearch((p) => !p)}
          title="Search (Ctrl+F)"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-subtle)', lineHeight: 1, padding: 2 }}
        >
          <Search size={13} />
        </button>

        {/* Reconnect */}
        <button
          onClick={connect}
          title="Reconnect"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-subtle)', lineHeight: 1, padding: 2 }}
        >
          <RefreshCw size={13} />
        </button>

        {onClose && (
          <button
            onClick={onClose}
            title="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-subtle)', lineHeight: 1, padding: 2 }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Search bar */}
      {showSearch && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            background: 'var(--elevated)',
            borderBottom: '1px solid var(--line)',
            flexShrink: 0,
          }}
        >
          <input
            autoFocus
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') doSearch(!e.shiftKey);
              if (e.key === 'Escape') setShowSearch(false);
            }}
            placeholder="Search…"
            style={{
              flex: 1,
              background: 'var(--bg)',
              border: '1px solid var(--line-strong)',
              borderRadius: 4,
              color: 'var(--ink)',
              padding: '3px 8px',
              fontSize: 12,
              outline: 'none',
            }}
          />
          <button onClick={() => doSearch(false)} style={{ ...btnStyle }}>↑</button>
          <button onClick={() => doSearch(true)}  style={{ ...btnStyle }}>↓</button>
          <button onClick={() => setShowSearch(false)} style={{ ...btnStyle }}><X size={11} /></button>
        </div>
      )}

      {/* xterm container */}
      <div
        ref={containerRef}
        style={{ flex: 1, overflow: 'hidden', padding: '4px 2px 2px 6px' }}
      />
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid var(--line-strong)',
  borderRadius: 4,
  color: 'var(--ink-muted)',
  padding: '2px 6px',
  cursor: 'pointer',
  fontSize: 11,
  lineHeight: 1,
};
