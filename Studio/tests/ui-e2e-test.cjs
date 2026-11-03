// End-to-end UI check: sign in through the real modal, save a deck, create a
// public share link, then open the /p/<id> viewer and confirm it renders the
// slides. Requires Chrome and the Studio server (spawned here with temp data).
const { spawn } = require("child_process");
const os = require("os");
const path = require("path");
const fs = require("fs");
const WebSocket = require("ws");

const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const root = path.join(__dirname, "..");
const PORT = 5196;
const CDP_PORT = 9336;
const dataDir = path.join(os.tmpdir(), "studio-ui-" + Date.now());
const PROFILE = path.join(os.tmpdir(), "studio-ui-chrome-" + Date.now()).replace(/\\/g, "/");
const base = `http://127.0.0.1:${PORT}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn(process.execPath, [path.join(root, "server.js")], {
  env: { ...process.env, PORT: String(PORT), STUDIO_DATA_DIR: dataDir },
  stdio: "ignore",
  cwd: root,
});

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--mute-audio",
  `--user-data-dir=${PROFILE}`, `--remote-debugging-port=${CDP_PORT}`,
  "about:blank",
], { stdio: "ignore" });

function attach(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.on("open", () => {
      let id = 0;
      const pending = new Map();
      const errors = [];
      ws.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
        if (msg.method === "Runtime.exceptionThrown") {
          errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
        }
      });
      const send = (method, params = {}) => new Promise((res) => {
        const mid = ++id; pending.set(mid, res);
        ws.send(JSON.stringify({ id: mid, method, params }));
      });
      const evaluate = async (expression) => {
        const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
        if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
        return r.result?.result?.value;
      };
      const waitFor = async (expr, timeoutMs, label) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
          try { if (await evaluate(expr)) return; } catch {}
          await sleep(300);
        }
        throw new Error("timeout: " + label);
      };
      resolve({ ws, send, evaluate, waitFor, get errors() { return errors; } });
    });
    ws.on("error", reject);
  });
}

async function openPageTab() {
  const browserWsUrl = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json()).webSocketDebuggerUrl;
  const bws = new WebSocket(browserWsUrl);
  await new Promise((res, rej) => { bws.on("open", res); bws.on("error", rej); });
  bws.send(JSON.stringify({ id: 1, method: "Target.createTarget", params: { url: "about:blank" } }));
  await new Promise((res, rej) => {
    bws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id === 1) res();
    });
    bws.on("error", rej);
  });
  bws.close();
  const targets = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()).filter((t) => t.type === "page");
  return targets[targets.length - 1].webSocketDebuggerUrl;
}

(async () => {
  const failures = [];
  const check = (label, ok) => { if (!ok) failures.push(label); };
  try {
    for (let i = 0; i < 40; i += 1) {
      try { await fetch(base + "/"); break; } catch { await sleep(250); }
    }

    const pageWsUrl = await openPageTab();
    const ws2 = new WebSocket(pageWsUrl);
    await new Promise((res, rej) => { ws2.on("open", res); ws2.on("error", rej); });
    let id = 0;
    const pending = new Map();
    const pageErrors = [];
    ws2.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
      if (msg.method === "Runtime.exceptionThrown") pageErrors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    });
    const send = (method, params = {}) => new Promise((res) => {
      const mid = ++id; pending.set(mid, res);
      ws2.send(JSON.stringify({ id: mid, method, params }));
    });
    const evaluate = async (expression) => {
      const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
      return r.result?.result?.value;
    };
    const waitFor = async (expr, timeoutMs, label) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        try { if (await evaluate(expr)) return; } catch {}
        await sleep(300);
      }
      throw new Error("timeout: " + label);
    };

    // 1. Editor loads
    await send("Page.navigate", { url: base + "/" });
    await waitFor("!!document.querySelector('.studio')", 15000, "editor boot");
    check("editor renders", true);

    // 2. Sign in through the real modal
    await evaluate(`document.querySelector('[data-action="account"]').click()`);
    await waitFor("!!document.querySelector('.account-modal')", 8000, "account modal");
    await evaluate(`document.querySelector('[data-account-action="switch-mode"]').click()`);
    await waitFor("!!document.querySelector('[data-auth-name]')", 5000, "signup form");
    await evaluate(`(() => {
      const name = document.querySelector('[data-auth-name]');
      name.value = 'ui-user'; name.dispatchEvent(new Event('input'));
      const pw = document.querySelector('[data-auth-password]');
      pw.value = 'secret1'; pw.dispatchEvent(new Event('input'));
    })()`);
    await evaluate(`document.querySelector('[data-account-action="submit"]').click()`);
    await waitFor("localStorage.getItem('studio-cloud-token') !== null", 10000, "signed in (token)");
    check("signup via UI works", true);

    // 3. Save a deck (syncs to cloud) and create a share link
    await evaluate(`(() => { state.pages.push({ ...state.pages[0], name: 'Extra slide' }); })()`);
    await evaluate(`saveCurrentProject('Presentation', false)`);
    await sleep(1500);
    const cloudId = await evaluate(`state.cloudProjectId`);
    check("deck synced to cloud", typeof cloudId === "string" && cloudId.length > 0);
    const link = await evaluate(`createPublicShareLink()`);
    check("share link created", typeof link === "string" && /\/p\/[a-f0-9]{16}$/.test(link));

    // 4. Viewer renders the shared deck read-only
    await send("Page.navigate", { url: link });
    await waitFor("!!document.querySelector('.viewer')", 15000, "viewer boot");
    await waitFor("document.querySelectorAll('.viewer-dot').length === 2", 10000, "viewer has 2 slides");
    check("viewer shows deck", true);
    const title = await evaluate(`document.querySelector('.viewer-title').textContent`);
    check("viewer shows deck title", typeof title === "string" && title.length > 0);
    const slidesRendered = await evaluate(`document.querySelectorAll('.viewer-slide .slide-element').length > 0`);
    check("viewer renders slide elements", slidesRendered === true);
    const hasDrag = await evaluate(`document.querySelector('.viewer-slide .slide-element')?.classList.contains('selected') === true`);
    await evaluate(`document.querySelector('.viewer-slide .slide-element').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))`);
    await sleep(400);
    const becameSelected = await evaluate(`document.querySelector('.viewer-slide .slide-element')?.classList.contains('selected') === true`);
    check("viewer is read-only (no selection on click)", becameSelected === false && hasDrag === false);

    if (pageErrors.length) failures.push("page exceptions: " + pageErrors[0]);
  } catch (error) {
    failures.push("exception: " + error.message);
  }

  try { chrome.kill(); } catch {}
  try { server.kill(); } catch {}
  try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch {}
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch {}

  if (failures.length) {
    console.log("UI-E2E: FAIL");
    failures.forEach((f) => console.log("  - " + f));
    process.exitCode = 1;
  } else {
    console.log("UI-E2E: PASS — signup modal, cloud sync, share link, read-only viewer");
  }
  process.exit(0);
})();