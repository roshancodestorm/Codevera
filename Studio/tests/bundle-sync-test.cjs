// Wire-level sync-loop regression: a fresh client must NOT re-request state
// forever when the server has nothing to send. An "empty" yjs update is
// exactly 00 00 — any client that sees >1 STEP2 replies has re-entered the
// infinite STEP1<->STEP2 loop this suite guards against.
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

eval(fs.readFileSync(path.join(__dirname, "..", "vendor", "yjs.js"), "utf8"));

const SERVER = process.env.STUDIO_URL || "http://127.0.0.1:5174/";
const WS_BASE = SERVER.replace(/^http/, "ws");

async function run(label) {
  return new Promise((resolve) => {
    const doc = new Y.Doc();
    const ws = new WebSocket(WS_BASE + "api/collab?workspace=bsync-lab-" + Date.now() + "&user=" + label + "&color=%23ff0000");
    ws.binaryType = "arraybuffer";
    let step2Count = 0;
    let nonEmpty = 0;
    let step1Server = 0;
    let dead = false;
    const firstHex = [];
    const timer = setTimeout(() => { dead = true; finish(); }, 6000);
    const finish = () => {
      clearTimeout(timer);
      resolve({ step2Count, nonEmpty, step1Server, svBytes: Y.encodeStateVector(doc).length, firstHex });
    };
    ws.onopen = () => {
      sendStep1();
    };
    const sendStep1 = () => {
      const sv = Y.encodeStateVector(doc);
      const payload = encodeVarUint8Array(sv);
      const msg = new Uint8Array(payload.length + 2);
      msg[0] = 0; // sync
      msg[1] = 0; // step1
      msg.set(payload, 2);
      ws.send(msg);
    };
    const encodeVarUint8Array = (u8) => {
      const len = u8.length;
      const out = [];
      let n = len;
      do { let b = n & 127; n >>>= 7; if (n) b |= 128; out.push(b); } while (n);
      out.push(...u8);
      return new Uint8Array(out);
    };
    const decodeVarUint = (view, pos) => {
      let result = 0, shift = 0, b;
      do { b = view[pos++]; result |= (b & 127) << shift; shift += 7; } while (b & 128);
      return { value: result >>> 0, pos };
    };
    const decodeVarUint8Array = (view, pos) => {
      const r = decodeVarUint(view, pos);
      const len = r.value;
      return { value: view.subarray(r.pos, r.pos + len), pos: r.pos + len };
    };
    ws.onmessage = (raw) => {
      if (dead) return;
      const view = new Uint8Array(raw.data);
      const t = decodeVarUint(view, 0);
      if (t.value !== 0) return; // only sync messages
      const st = decodeVarUint(view, t.pos);
      if (st.value === 0) { // server STEP1
        step1Server += 1;
      } else if (st.value === 1) { // STEP2
        const u = decodeVarUint8Array(view, st.pos);
        step2Count += 1;
        if (step2Count <= 2) {
          firstHex.push({ len: u.value.length, hex: Buffer.from(u.value.slice(0, 40)).toString("hex") });
        }
        if (u.value.length > 2 || u.value[0] !== 0) {
          nonEmpty += 1;
          Y.applyUpdate(doc, u.value);
          sendStep1();
        } else {
          finish();
        }
      }
    };
    ws.onerror = () => { finish(); };
  });
}

(async () => {
  const results = [];
  for (let i = 0; i < 3; i++) results.push(await run("t" + i));
  console.log(JSON.stringify(results));
  const pass = results.every((r) => r.step2Count <= 1 && r.nonEmpty === 0);
  console.log(pass ? "SYNC-LOOP GUARD: PASS" : "SYNC-LOOP GUARD: FAIL");
  process.exitCode = pass ? 0 : 1;
  process.exit(0);
})();