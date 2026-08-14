// Wire-level content sync check: two clients in one workspace; alice pushes a
// text update, bob must receive it via the server's UPDATE broadcast.
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
eval(fs.readFileSync(path.join(__dirname, "..", "vendor", "yjs.js"), "utf8"));

const SERVER = process.env.STUDIO_URL || "http://127.0.0.1:5174/";
const WS_BASE = SERVER.replace(/^http/, "ws");
const WS_NAME = "content-lab-" + Date.now();

function connect(user) {
  return new Promise((resolve) => {
    const doc = new Y.Doc();
    const ws = new WebSocket(WS_BASE + "api/collab?workspace=" + WS_NAME + "&user=" + user + "&color=%23ff0000");
    ws.binaryType = "arraybuffer";
    const enc = new Uint8Array(4);
    enc.set([0, 0]); // sync, step1
    ws.onopen = () => ws.send(enc);
    ws.onmessage = (raw) => {
      const view = new Uint8Array(raw.data);
      const t = view[0];
      const st = view[1];
      if (t === 0 && (st === 1 || st === 2)) {
        const u = view.subarray(3);
        if (u.length > 2) Y.applyUpdate(doc, u);
      }
    };
    setTimeout(() => resolve({ doc, ws, user }), 400);
  });
}

(async () => {
  const a = await connect("alice");
  const b = await connect("bob");
  const ytext = a.doc.getText("demo");
  ytext.insert(0, "hello-collab");
  const update = Y.encodeStateAsUpdate(a.doc);
  const msg = new Uint8Array(3 + update.length);
  msg.set([0, 1, update.length]);
  msg.set(update, 3);
  a.ws.send(msg);
  await new Promise((r) => setTimeout(r, 800));
  const bobHas = b.doc.getText("demo").toString();
  const pass = bobHas === "hello-collab";
  console.log(JSON.stringify({ aliceHas: ytext.toString(), bobHas, bobSyncPass: pass }));
  console.log(pass ? "CONTENT-SYNC: PASS" : "CONTENT-SYNC: FAIL");
  process.exitCode = pass ? 0 : 1;
  process.exit(0);
})();