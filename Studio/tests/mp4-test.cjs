const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const APP = process.env.STUDIO_URL || "http://127.0.0.1:5174/";
const TMP = path.join(__dirname, "tmp");
const PROFILE = path.join(TMP, "profiles", "chrome-mp4-" + Date.now());
const DL = path.join(TMP, "mp4-downloads");
const CDP_PORT = 9333;

fs.rmSync(DL, { recursive: true, force: true });
fs.mkdirSync(DL, { recursive: true });
fs.mkdirSync(PROFILE, { recursive: true });

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--mute-audio",
  `--user-data-dir=${PROFILE}`, `--remote-debugging-port=${CDP_PORT}`, "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
      const list = await res.json();
      const page = Array.isArray(list) && list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
      const ver = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      return (await ver.json()).webSocketDebuggerUrl;
    } catch { await sleep(250); }
  }
  throw new Error("CDP not up");
}

(async () => {
  let ws;
  let ok = false;
  try {
    const url = await getWsUrl();
    ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.on("open", res); ws.on("error", rej); });

    let id = 0;
    const pending = new Map();
    const errors = [];
    const debugLogs = [];
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
      if (msg.method === "Runtime.consoleAPICalled" && (msg.params.type === "error" || msg.params.type === "log" || msg.params.type === "warning")) {
        const text = msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ");
        if (msg.params.type === "error") errors.push(text);
        if (text.includes("[video-debug]")) debugLogs.push(text);
      }
      if (msg.method === "Runtime.exceptionThrown") {
        errors.push("EXC: " + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text));
      }
    });
    const send = (method, params = {}) => new Promise((res) => {
      const mid = ++id; pending.set(mid, res);
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
    const evaluate = async (expression) => {
      const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (r.result?.exceptionDetails) {
        throw new Error("eval failed: " + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text));
      }
      return r.result?.result?.value;
    };
    const waitFor = async (expr, timeoutMs, label) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        try { if (await evaluate(expr)) return; } catch { /* keep polling */ }
        await sleep(300);
      }
      throw new Error("timeout waiting for: " + label);
    };

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Page.addScriptToEvaluateOnNewDocument", {
      source: `
        (() => {
          const origCreate = URL.createObjectURL.bind(URL);
          const origRevoke = URL.revokeObjectURL.bind(URL);
          window.__blobUrls = [];
          URL.createObjectURL = (obj) => { const u = origCreate(obj); window.__blobUrls.push(u); return u; };
          URL.revokeObjectURL = () => {};
        })();
      `,
    });
    await send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: DL, eventsEnabled: true });
    await send("Page.navigate", { url: APP });
    try {
      await waitFor('document.readyState === "complete"', 15000, "page complete");
      await waitFor('document.querySelector("[data-action=\\"download\\"]") !== null', 30000, "app load");
    } catch (e) {
      const href = await evaluate("location.href").catch(() => "?");
      const title = await evaluate("document.title").catch(() => "?");
      const bodyLen = await evaluate("document.body ? document.body.innerHTML.length : -1").catch(() => -1);
      const bodySnippet = await evaluate("document.body ? document.body.innerText.slice(0, 300) : ''").catch(() => "");
      console.log("DIAG href:", href);
      console.log("DIAG title:", title);
      console.log("DIAG bodyLen:", bodyLen);
      console.log("DIAG text:", JSON.stringify(bodySnippet));
      console.log("console errors so far:", errors.length ? JSON.stringify(errors) : "none");
      throw e;
    }

    const pageCount = await evaluate('document.querySelectorAll(".slide").length');
    console.log("slides on load:", pageCount);

    await evaluate('document.querySelector("[data-action=\\"add-page\\"]").click()');
    await sleep(600);
    const pageCount2 = await evaluate('document.querySelectorAll(".slide").length');
    console.log("slides after add-page:", pageCount2);

    await evaluate('document.querySelector("[data-action=\\"download\\"]").click()');
    await waitFor('document.querySelector("[data-share-action=\\"see-all\\"]") !== null', 5000, "share panel");
    await evaluate('document.querySelector("[data-share-action=\\"see-all\\"]").click()');
    await waitFor('document.querySelector("[data-export=\\"mp4\\"]") !== null', 5000, "mp4 button");
    const menuBtnCount = await evaluate('document.querySelectorAll("[data-export=\\"mp4\\"]").length');
    console.log("mp4 buttons in DOM:", menuBtnCount);
    await evaluate('document.querySelector("[data-export=\\"mp4\\"]").click()');
    console.log("export clicked, recording...");
    await sleep(5000);
    console.log("blobUrls after 5s:", await evaluate("window.__blobUrls.length").catch(() => "n/a"));
    console.log("body len:", await evaluate("document.body.innerHTML.length").catch(() => "n/a"));

    const start = Date.now();
    let found = null;
    while (Date.now() - start < 90000 && !found) {
      await sleep(2500);
      const urls = await evaluate("window.__blobUrls.slice(-6)").catch(() => []);
      for (const u of urls || []) {
        const probe = await evaluate(
          `fetch(${JSON.stringify(u)}).then((r) => r.arrayBuffer()).then((b) => {
            const bytes = new Uint8Array(b);
            return String.fromCharCode.apply(null, bytes.subarray(4, 12));
          })`
        ).catch(() => null);
        if (probe && (probe.includes("ftyp") || probe === "\u001aE\u00df\u00a3")) {
          found = u;
          break;
        }
      }
      if (errors.some((e) => e.includes("Recording failed"))) break;
    }
    await sleep(2000);

    const msg = await evaluate('document.querySelector(".share-message")?.textContent || ""');
    console.log("shareMessage:", JSON.stringify(msg));
    console.log("console errors:", errors.length ? JSON.stringify(errors) : "none");
    console.log("video-debug logs:", debugLogs.length ? debugLogs.join("\n  ") : "(none)");
    if (found) {
      const base64 = await evaluate(
        `fetch(${JSON.stringify(found)}).then((r) => r.arrayBuffer()).then((b) => {
          let s = "";
          const bytes = new Uint8Array(b);
          for (let i = 0; i < bytes.length; i += 4096) {
            s += String.fromCharCode.apply(null, bytes.subarray(i, i + 4096));
          }
          return btoa(s);
        })`
      );
      const buf = Buffer.from(base64, "base64");
      const hasFtyp = buf.subarray(4, 12).toString("latin1").includes("ftyp");
      const isWebm = buf.subarray(0, 4).toString("hex") === "1a45dfa3";
      console.log("video bytes:", buf.length);
      console.log("head:", buf.subarray(0, 12).toString("hex"));
      console.log("CONTAINER:", hasFtyp ? "MP4" : isWebm ? "WEBM" : "UNKNOWN");
      fs.writeFileSync(path.join(DL, "deck-video.mp4"), buf);
      console.log("saved:", path.join(DL, "deck-video.mp4"));
      ok = buf.length > 10000 && (hasFtyp || isWebm);
      console.log("PASS:", ok);
      const playback = await evaluate(`
        new Promise((resolve) => {
          const v = document.createElement("video");
          v.muted = true;
          v.preload = "auto";
          v.src = ${JSON.stringify(found)};
          const timer = setTimeout(() => resolve({ error: "playback timeout" }), 15000);
          v.onloadeddata = () => {
            v.currentTime = 1;
            v.onseeked = () => {
              const c = document.createElement("canvas");
              c.width = 480; c.height = 270;
              const ctx = c.getContext("2d");
              ctx.drawImage(v, 0, 0, 480, 270);
              const d = ctx.getImageData(0, 0, 480, 270).data;
              let nonWhite = 0, colored = 0;
              for (let i = 0; i < d.length; i += 4) {
                if (d[i] !== 255 || d[i + 1] !== 255 || d[i + 2] !== 255) nonWhite += 1;
                if (d[i] + d[i + 1] + d[i + 2] > 40) colored += 1;
              }
              clearTimeout(timer);
              resolve({ w: v.videoWidth, h: v.videoHeight, dur: v.duration, nonWhite, colored });
            };
          };
          v.onerror = () => { clearTimeout(timer); resolve({ error: "video decode error" }); };
        })
      `).catch((e) => ({ error: "eval: " + e.message }));
      console.log("playback:", JSON.stringify(playback));
    } else {
      const diag = await evaluate(`Promise.all(window.__blobUrls.map(async (u) => {
        try {
          const r = await fetch(u);
          const b = await r.arrayBuffer();
          return u.slice(0, 70) + " -> " + b.byteLength + "B " + JSON.stringify(new TextDecoder().decode(b.subarray(4, 12)));
        } catch (e) {
          return u.slice(0, 70) + " -> ERR " + e.message;
        }
      }))`).catch((e) => "diag eval failed: " + e.message);
      console.log("blob url diagnostics:", JSON.stringify(diag, null, 1));
      console.log("NO VIDEO FOUND — FAIL");
    }
  } catch (e) {
    console.error("TEST ERROR:", e.message);
  } finally {
    try { ws && ws.close(); } catch { /* noop */ }
    chrome.kill();
  }
  process.exitCode = ok ? 0 : 1;
})();