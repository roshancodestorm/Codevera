// ── Studio Collaboration Client (Yjs WebSocket) ─────────────────
// Loads Yjs + lib0 from CDN, connects to /api/collab WebSocket

class StudioCollab {
  constructor(options = {}) {
    this.workspace = options.workspace || "studio-" + Date.now().toString(36);
    this.userName = options.userName || "User" + Math.random().toString(36).slice(2, 6);
    this.userColor = options.userColor || "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
    this.onRemoteChange = options.onRemoteChange || (() => {});
    this.onPeersChange = options.onPeersChange || (() => {});
    this.onAwareness = options.onAwareness || (() => {});
    this.connected = false;
    this.ws = null;
    this.doc = null;
    this.awareness = null;
    this.clientId = "c-" + Math.random().toString(36).slice(2, 10);
    this._messageQueue = [];
    this._reconnectTimer = null;
    this._readyResolve = null;
    this._localChange = false;
    this._bound = new Map();
    this._lib0 = null;
    this._Y = null;
  }

  init() {
    return this._loadDeps().then(() => {
      this.doc = new this._Y.Doc();
      this.doc.on("update", (update, origin) => {
        if (origin === "remote") return;
        if (update.length > 2 || update[0] !== 0) {
          this._sendSyncUpdate(update);
        }
      });
      this._connect();
      return new Promise((resolve) => { this._readyResolve = resolve; });
    });
  }

  _sendSyncUpdate(update) {
    const encoder = this._lib0.encoding.createEncoder();
    this._lib0.encoding.writeVarUint(encoder, 0); // SYNC
    this._lib0.encoding.writeVarUint(encoder, 2); // UPDATE
    this._lib0.encoding.writeVarUint8Array(encoder, update);
    this._send(this._lib0.encoding.toUint8Array(encoder));
  }

  _loadDeps() {
    const loadDep = (globalName, urls) => new Promise((resolve, reject) => {
      if (window[globalName]) return resolve();
      const attempt = (remaining) => {
        if (!remaining.length) return reject(new Error("Failed to load " + globalName));
        const script = document.createElement("script");
        script.src = remaining[0];
        script.onload = () => {
          if (window[globalName]) resolve();
          else attempt(remaining.slice(1));
        };
        script.onerror = () => attempt(remaining.slice(1));
        document.head.appendChild(script);
      };
      attempt(urls);
    });
    return loadDep("lib0", [
      "/vendor/lib0.js",
      "https://cdn.jsdelivr.net/npm/lib0@0.2.93/dist/lib0.js",
    ]).then(() => {
      this._lib0 = window.lib0;
      return loadDep("Y", [
        "/vendor/yjs.js",
        "https://cdn.jsdelivr.net/npm/yjs@13.6.18/dist/y.js",
      ]);
    }).then(() => {
      this._Y = window.Y;
    });
  }

  _connect() {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${location.host}/api/collab?workspace=${encodeURIComponent(this.workspace)}&user=${encodeURIComponent(this.userName)}&color=${encodeURIComponent(this.userColor)}`;
    this.ws = new WebSocket(url);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      this.connected = true;
      console.log("[Collab] Connected to workspace:", this.workspace);
      this._flushQueue();
      // Request full state
      this._sendSyncStep1();
      // Announce presence so other peers see us
      this.setAwareness({ hello: true, pageIndex: 0 });
    };

    this.ws.onmessage = (event) => this._handleMessage(event.data);

    this.ws.onclose = () => {
      this.connected = false;
      console.log("[Collab] Disconnected, reconnecting in 3s...");
      this._reconnectTimer = setTimeout(() => this._connect(), 3000);
    };

    this.ws.onerror = (err) => console.error("[Collab] WebSocket error:", err);
  }

  _handleMessage(data) {
    const view = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data);
    const decoder = this._lib0.decoding.createDecoder(view);
    const messageType = this._lib0.decoding.readVarUint(decoder);

    if (messageType === 0) { // SYNC
      const syncType = this._lib0.decoding.readVarUint(decoder);
      if (syncType === 1) { // STEP2 - full state
        const update = this._lib0.decoding.readVarUint8Array(decoder);
        // Re-request only when the reply changed the doc — an empty yjs update
        // (00 00) is not 1 byte, so length checks alone loop forever.
        const svBefore = this._Y.encodeStateVector(this.doc);
        this._Y.applyUpdate(this.doc, update, "remote");
        const svAfter = this._Y.encodeStateVector(this.doc);
        if (svBefore.length !== svAfter.length || svBefore.some((b, i) => b !== svAfter[i])) {
          this._sendSyncStep1();
        }
        if (this._readyResolve) {
          this._readyResolve();
          this._readyResolve = null;
        }
      } else if (syncType === 2) { // UPDATE
        const update = this._lib0.decoding.readVarUint8Array(decoder);
        this._Y.applyUpdate(this.doc, update, "remote");
        this.onRemoteChange(this.doc, null);
      }
    } else if (messageType === 1) { // AWARENESS
      const data = this._lib0.decoding.readVarUint8Array(decoder);
      this._applyAwareness(data);
    }
  }

  _sendSyncStep1() {
    const sv = this._Y.encodeStateVector(this.doc);
    const encoder = this._lib0.encoding.createEncoder();
    this._lib0.encoding.writeVarUint(encoder, 0); // SYNC
    this._lib0.encoding.writeVarUint(encoder, 0); // STEP1
    this._lib0.encoding.writeVarUint8Array(encoder, sv);
    this._send(this._lib0.encoding.toUint8Array(encoder));
  }

  _send(bytes) {
    if (this.connected && this.ws) {
      this.ws.send(bytes);
    } else {
      this._messageQueue.push(bytes);
    }
  }

  _flushQueue() {
    while (this._messageQueue.length) {
      this._send(this._messageQueue.shift());
    }
  }

  _applyAwareness(data) {
    try {
      const states = JSON.parse(new TextDecoder().decode(data));
      this.onAwareness(states);
    } catch (error) {
      console.error("[Collab] awareness error:", error && error.message ? error.message : error);
    }
  }

  // High-level: bind a plain object to a Y.Map in the doc
  bindState(key, initialValue) {
    const ymap = this.doc.getMap(key);
    if (initialValue !== undefined && ymap.size === 0) {
      // Only seed when the collaborative doc has nothing yet (never clobber remote data)
      if (typeof initialValue === "object" && initialValue !== null) {
        if (Array.isArray(initialValue)) {
          if (!ymap.has("items")) {
            const yarr = new this._Y.Array();
            yarr.push(initialValue.map((v) => this._toYValue(v)));
            ymap.set("items", yarr);
          }
        } else if (!ymap.has("data")) {
          const child = new this._Y.Map();
          for (const [k, v] of Object.entries(initialValue)) child.set(k, v);
          ymap.set("data", child);
        }
      } else if (!ymap.has("value")) {
        ymap.set("value", initialValue);
      }
    }

    ymap.observe(() => {
      if (!this._localChange) this.onRemoteChange(this._toPlain(ymap), key);
    });

    this._bound.set(key, ymap);
    return ymap;
  }

  // Publish a local value to the collaborative doc (no echo back to us)
  publish(key, value) {
    const ymap = this._bound.get(key) || this.doc.getMap(key);
    this._localChange = true;
    try {
      if (typeof value === "object" && value !== null) {
        if (Array.isArray(value)) {
          const yarr = new this._Y.Array();
          yarr.push(value.map((v) => this._toYValue(v)));
          ymap.set("items", yarr);
        } else {
          const child = new this._Y.Map();
          for (const [k, v] of Object.entries(value)) child.set(k, v);
          ymap.set("data", child);
        }
      } else {
        ymap.set("value", value);
      }
    } finally {
      this._localChange = false;
    }
  }

  // Read the current remote value of a bound key (undefined when absent)
  getValue(key) {
    const ymap = this.doc.getMap(key);
    if (ymap.size === 0) return undefined;
    return this._toPlain(ymap);
  }

  // Deep-convert Y values to plain JS, unwrapping the single-key wrappers
  // ({ items } / { value } / { data }) used by publish()/bindState().
  _toPlain(yvalue) {
    if (yvalue instanceof this._Y.Map) {
      if (yvalue.size === 1) {
        if (yvalue.has("items")) return this._toPlain(yvalue.get("items"));
        if (yvalue.has("value")) return this._toPlain(yvalue.get("value"));
        if (yvalue.has("data")) return this._toPlain(yvalue.get("data"));
      }
      const obj = {};
      for (const [k, v] of yvalue) obj[k] = this._toPlain(v);
      return obj;
    }
    if (yvalue instanceof this._Y.Array) return yvalue.toArray().map(this._toPlain.bind(this));
    return yvalue;
  }

  _toYValue(val) {
    if (val === null || val === undefined) return val;
    if (Array.isArray(val)) {
      const arr = new this._Y.Array();
      arr.push(val.map(v => this._toYValue(v)));
      return arr;
    }
    if (typeof val === "object") {
      const map = new this._Y.Map();
      for (const [k, v] of Object.entries(val)) map.set(k, this._toYValue(v));
      return map;
    }
    return val;
  }

  setAwareness(state) {
    const payload = JSON.stringify({
      clientId: this.clientId || "local",
      user: this.userName,
      color: this.userColor,
      ts: Date.now(),
      ...state,
    });
    const encoder = this._lib0.encoding.createEncoder();
    this._lib0.encoding.writeVarUint(encoder, 1); // AWARENESS
    this._lib0.encoding.writeVarUint8Array(encoder, new TextEncoder().encode(payload));
    this._send(this._lib0.encoding.toUint8Array(encoder));
  }

  _send(bytes) {
    if (this.connected && this.ws) {
      this.ws.send(bytes);
    } else {
      this._messageQueue.push(bytes);
    }
  }

  disconnect() {
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    if (this.ws) { this.ws.close(); this.ws = null; }
    this.connected = false;
  }
}

// Export
if (typeof window !== "undefined") window.StudioCollab = StudioCollab;
if (typeof module !== "undefined") module.exports = StudioCollab;