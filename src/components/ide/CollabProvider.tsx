/**
 * CollabProvider — Yjs WebSocket collaboration for the Monaco editor.
 *
 * Implements the standard y-websocket sync protocol (message types 0 = sync,
 * 1 = awareness) without depending on y-monaco (which has a broken ESM path
 * in this project).  Instead we manually mirror the Y.Text into Monaco's
 * ITextModel and vice-versa.
 *
 * Usage:
 *   const prov = new CollabProvider({ workspace, user, color, model, monaco })
 *   prov.connect()
 *   // later:
 *   prov.destroy()
 */
import * as Y from 'yjs';
import * as monaco from 'monaco-editor';
import { COLLAB_WS_BASE } from './ideApi';

const MSG_SYNC       = 0;
const MSG_AWARENESS  = 1;
const SYNC_STEP1     = 0;
const SYNC_STEP2     = 1;
const SYNC_UPDATE    = 2;

// ── tiny lib0-compatible encoder / decoder ──────────────────────────────────
function encodeVarUint(n: number): Uint8Array {
  const bytes: number[] = [];
  do { let b = n & 0x7f; n >>>= 7; if (n > 0) b |= 0x80; bytes.push(b); } while (n > 0);
  return new Uint8Array(bytes);
}
function encodeVarUint8Array(arr: Uint8Array): Uint8Array {
  return new Uint8Array([...encodeVarUint(arr.length), ...arr]);
}
function buildMessage(msgType: number, syncType: number, payload: Uint8Array): Uint8Array {
  return new Uint8Array([...encodeVarUint(msgType), ...encodeVarUint(syncType), ...encodeVarUint8Array(payload)]);
}
function readVarUint(buf: Uint8Array, pos: { v: number }): number {
  let result = 0, shift = 0;
  while (pos.v < buf.length) {
    const b = buf[pos.v++];
    result |= (b & 0x7f) << shift;
    shift += 7;
    if ((b & 0x80) === 0) break;
  }
  return result;
}
function readVarUint8Array(buf: Uint8Array, pos: { v: number }): Uint8Array {
  const len = readVarUint(buf, pos);
  const slice = buf.slice(pos.v, pos.v + len);
  pos.v += len;
  return slice;
}

export interface CollabUser {
  name: string;
  color: string;
  cursor?: { line: number; col: number };
}

interface CollabCursor {
  name: string;
  color: string;
  line: number;
  col: number;
  decorationId: string[];
}

export class CollabProvider {
  private ws: WebSocket | null = null;
  private doc: Y.Doc;
  private text: Y.Text;
  private model: monaco.editor.ITextModel;
  private editor: monaco.editor.ICodeEditor | null;
  private workspace: string;
  private user: string;
  private color: string;
  private applying = false;
  private cursors = new Map<string, CollabCursor>();
  private clientId: string;
  private monacoRef: typeof monaco;
  private disposed = false;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  onCursorsChange?: (cursors: Map<string, CollabCursor>) => void;

  constructor(opts: {
    workspace: string;
    user: string;
    color: string;
    model: monaco.editor.ITextModel;
    editor: monaco.editor.ICodeEditor | null;
    monacoRef: typeof monaco;
  }) {
    this.workspace = opts.workspace;
    this.user = opts.user;
    this.color = opts.color;
    this.model = opts.model;
    this.editor = opts.editor;
    this.monacoRef = opts.monacoRef;
    this.doc = new Y.Doc();
    this.text = this.doc.getText('content');
    this.clientId = Math.random().toString(36).slice(2);

    // When remote Yjs update arrives, mirror to Monaco
    this.text.observe(() => {
      if (this.applying) return;
      const newValue = this.text.toString();
      if (this.model.getValue() === newValue) return;
      this.applying = true;
      const pos = this.editor?.getPosition();
      this.model.setValue(newValue);
      if (pos) this.editor?.setPosition(pos);
      this.applying = false;
    });
  }

  connect() {
    if (this.disposed) return;
    const url = `${COLLAB_WS_BASE}/api/ide/collab?workspace=${encodeURIComponent(this.workspace)}&user=${encodeURIComponent(this.user)}&color=${encodeURIComponent(this.color)}`;
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    ws.onopen = () => {
      // Step 1: send our state vector so server can send us missing updates
      const sv = Y.encodeStateVector(this.doc);
      ws.send(buildMessage(MSG_SYNC, SYNC_STEP1, sv));
      // Also push our full state so server knows what we have
      const fullUpdate = Y.encodeStateAsUpdate(this.doc);
      if (fullUpdate.length > 2) ws.send(buildMessage(MSG_SYNC, SYNC_UPDATE, fullUpdate));
      this.sendAwareness();
      this.pingInterval = setInterval(() => this.sendAwareness(), 10000);
    };

    ws.onmessage = (evt) => {
      const buf = new Uint8Array(evt.data as ArrayBuffer);
      const pos = { v: 0 };
      const msgType = readVarUint(buf, pos);
      if (msgType === MSG_SYNC) {
        const syncType = readVarUint(buf, pos);
        if (syncType === SYNC_STEP1) {
          // Server wants our update for its state vector
          const theirSv = readVarUint8Array(buf, pos);
          const update = Y.encodeStateAsUpdate(this.doc, theirSv);
          ws.send(buildMessage(MSG_SYNC, SYNC_STEP2, update));
        } else if (syncType === SYNC_STEP2 || syncType === SYNC_UPDATE) {
          const update = readVarUint8Array(buf, pos);
          this.applying = true;
          Y.applyUpdate(this.doc, update);
          this.applying = false;
        }
      } else if (msgType === MSG_AWARENESS) {
        const data = readVarUint8Array(buf, pos);
        this.handleAwareness(data);
      }
    };

    ws.onclose = () => {
      if (!this.disposed) setTimeout(() => this.connect(), 3000);
    };
    ws.onerror = () => {};
  }

  /** Called by Monaco whenever cursor position changes */
  sendCursor(line: number, col: number) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.sendAwareness({ cursor: { line, col } });
  }

  /** Push our awareness state (cursor + name + color) */
  private sendAwareness(extra: Partial<CollabUser> = {}) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    const state = JSON.stringify({ id: this.clientId, name: this.user, color: this.color, ...extra });
    const encoded = new TextEncoder().encode(state);
    this.ws.send(buildMessage(MSG_AWARENESS, 0, encoded));
  }

  private handleAwareness(data: Uint8Array) {
    try {
      const state = JSON.parse(new TextDecoder().decode(data)) as CollabUser & { id: string };
      if (state.id === this.clientId) return; // our own echo
      const prev = this.cursors.get(state.id);
      const cur: CollabCursor = {
        name: state.name,
        color: state.color,
        line: state.cursor?.line ?? prev?.line ?? 1,
        col: state.cursor?.col ?? prev?.col ?? 1,
        decorationId: [],
      };
      // Remove old decoration
      if (prev?.decorationId.length && this.editor) {
        this.editor.deltaDecorations(prev.decorationId, []);
      }
      // Add cursor decoration
      if (this.editor && state.cursor) {
        cur.decorationId = this.editor.deltaDecorations([], [{
          range: new this.monacoRef.Range(cur.line, cur.col, cur.line, cur.col + 1),
          options: {
            className: `collab-cursor-${state.id.slice(0, 6)}`,
            hoverMessage: { value: state.name },
            beforeContentClassName: 'collab-cursor-caret',
            zIndex: 10,
          },
        }]);
        // Inject dynamic CSS for this user's cursor color
        const styleId = `collab-style-${state.id.slice(0, 6)}`;
        if (!document.getElementById(styleId)) {
          const s = document.createElement('style');
          s.id = styleId;
          s.textContent = `.collab-cursor-${state.id.slice(0, 6)} { border-left: 2px solid ${cur.color}; } .collab-cursor-${state.id.slice(0, 6)}::after { content: '${cur.name}'; background: ${cur.color}; color: #fff; font-size: 10px; padding: 0 3px; border-radius: 3px; position: absolute; top: -16px; white-space: nowrap; pointer-events: none; }`;
          document.head.appendChild(s);
        }
      }
      this.cursors.set(state.id, cur);
      this.onCursorsChange?.(this.cursors);
    } catch {}
  }

  /** Called when local editor content changes — push to Yjs */
  pushLocalUpdate(newValue: string) {
    if (this.applying) return;
    const current = this.text.toString();
    if (current === newValue) return;
    this.applying = true;
    this.doc.transact(() => {
      this.text.delete(0, this.text.length);
      this.text.insert(0, newValue);
    });
    this.applying = false;
    // Send update to server
    if (this.ws?.readyState === WebSocket.OPEN) {
      const update = Y.encodeStateAsUpdate(this.doc);
      this.ws.send(buildMessage(MSG_SYNC, SYNC_UPDATE, update));
    }
  }

  destroy() {
    this.disposed = true;
    if (this.pingInterval) clearInterval(this.pingInterval);
    // Remove all cursor decorations
    if (this.editor) {
      for (const c of this.cursors.values()) {
        if (c.decorationId.length) this.editor.deltaDecorations(c.decorationId, []);
      }
    }
    this.cursors.clear();
    this.ws?.close();
    this.ws = null;
    this.doc.destroy();
  }

  getActiveCursors(): CollabUser[] {
    return [...this.cursors.values()].map((c) => ({ name: c.name, color: c.color, cursor: { line: c.line, col: c.col } }));
  }
}
