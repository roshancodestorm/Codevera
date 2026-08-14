const { spawn } = require("child_process");
const WebSocket = require("ws");

const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PROFILE = require("path").join(__dirname, "tmp", "profiles", "chrome-collab-" + Date.now());
const CDP_PORT = 9335;
const APP = process.env.STUDIO_URL || "http://127.0.0.1:5174/";

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--mute-audio",
  `--user-data-dir=${PROFILE}`, `--remote-debugging-port=${CDP_PORT}`,
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function attach(wsUrl) {
  const ws = new WebSocket(wsUrl);
  return new Promise((resolve, reject) => {
    ws.on("open", () => {
      let id = 0;
      const pending = new Map();
      const logs = [];
      ws.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
        if (msg.method === "Runtime.consoleAPICalled" && (msg.params.type === "error" || msg.params.type === "log" || msg.params.type === "warning")) {
          const text = msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ");
          logs.push("[" + msg.params.type + "] " + text);
        }
        if (msg.method === "Runtime.exceptionThrown") {
          logs.push("EXC: " + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text));
        }
      });
      const send = (method, params = {}) => new Promise((res) => {
        const mid = ++id; pending.set(mid, res);
        ws.send(JSON.stringify({ id: mid, method, params }));
      });
      const evaluate = async (expression) => {
        const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
        if (r.result?.exceptionDetails) throw new Error("eval: " + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text));
        return r.result?.result?.value;
      };
      const waitFor = async (expr, timeoutMs, label) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
          try { if (await evaluate(expr)) return; } catch { /* poll */ }
          await sleep(300);
        }
        throw new Error("timeout: " + label);
      };
      resolve({ ws, send, evaluate, waitFor, get logs() { return logs; } });
    });
    ws.on("error", reject);
  });
}

(async () => {
  let tabA, tabB;
  try {
    let targets;
    for (let i = 0; i < 60; i++) {
      try {
        targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
        const pages = targets.filter((t) => t.type === "page");
        if (pages.length >= 1) break;
      } catch { /* retry */ }
      await sleep(250);
    }
    const browserWsUrl = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json()).webSocketDebuggerUrl;
    const bws = new WebSocket(browserWsUrl);
    await new Promise((res, rej) => { bws.on("open", res); bws.on("error", rej); });
    const bCreate = await new Promise((res) => {
      bws.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.id === 1) res(msg);
      });
      bws.send(JSON.stringify({ id: 1, method: "Target.createTarget", params: { url: "about:blank" } }));
    });
    bws.close();
    if (!bCreate.result?.targetId) throw new Error("createTarget failed");
    for (let i = 0; i < 40; i++) {
      targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
      if (targets.filter((t) => t.type === "page").length >= 2) break;
      await sleep(250);
    }
    targets = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()).filter((t) => t.type === "page");
    if (!targets || targets.length < 2) throw new Error("need 2 page targets");
    console.log("targets:", targets.length);

    tabA = await attach(targets[0].webSocketDebuggerUrl);
    tabB = await attach(targets[1].webSocketDebuggerUrl);

const EPOCH = 1750000000000 + Math.floor(Math.random() * 1e7); // fresh workspace per run, deterministic within run
    const PATCH = `
      Object.defineProperty(Date, "now", { value: () => ${EPOCH}, configurable: true });
    `;
    for (const tab of [tabA, tabB]) {
      await tab.send("Page.enable");
      await tab.send("Runtime.enable");
      await tab.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: PATCH });
    }

    console.log("[A] load app...");
await tabA.send("Page.navigate", { url: APP });
    await tabA.waitFor('document.querySelector("[data-tool=\\"text\\"]") !== null', 30000, "A app load");
    await tabA.evaluate('document.querySelector("[data-tool=\\"text\\"]").click()');
    await sleep(800);
    const aProbe = await tabA.evaluate(`(() => ({
      toolbar: !!document.querySelector(".toolbar"),
      toggleCollab: !!document.querySelector("[data-action=\\"toggle-collab\\"]"),
      editor: !!document.querySelector(".editor"),
      slides: document.querySelectorAll("[data-slide]").length,
    }))()`);
    console.log("A post-text-click probe:", JSON.stringify(aProbe));
    await tabA.waitFor('document.querySelector("[data-action=\\"toggle-collab\\"]") !== null', 15000, "A editor toolbar");
    await tabA.evaluate('document.querySelector("[data-action=\\"toggle-collab\\"]").click()');
    await sleep(2500);
    const aCollabProbe = await tabA.evaluate(`(() => ({
      studioCollabClass: typeof window.StudioCollab,
      btnText: document.querySelector("[data-action=\\"toggle-collab\\"]")?.textContent || "",
      bodyText: document.body.innerText.slice(0, 120),
    }))()`);
    console.log("A collab probe:", JSON.stringify(aCollabProbe));
    console.log("A errors:", JSON.stringify(tabA.logs));
    await tabA.waitFor('document.querySelector("[data-action=\\"toggle-collab\\"]").textContent.includes("Live")', 15000, "A collab live");
console.log("A collab ON");
    await sleep(500);

    console.log("[B] load app...");
    await tabB.send("Page.navigate", { url: APP });
    await tabB.waitFor('document.querySelector("[data-tool=\\"text\\"]") !== null', 30000, "B app load");
    await tabB.evaluate('document.querySelector("[data-tool=\\"text\\"]").click()');
    await tabB.waitFor('document.querySelector("[data-action=\\"toggle-collab\\"]") !== null', 15000, "B editor toolbar");
    await tabB.evaluate('document.querySelector("[data-action=\\"toggle-collab\\"]").click()');
    await tabB.waitFor('document.querySelector("[data-action=\\"toggle-collab\\"]").textContent.includes("Live")', 15000, "B collab live");
    console.log("B collab ON");
    await sleep(4000);

    const aProbe2 = await tabA.evaluate(`(() => ({
      presence: !!document.querySelector(".collab-presence"),
      avatars: document.querySelectorAll(".collab-avatar").length,
      remoteCursors: document.querySelectorAll(".remote-cursor").length,
      btnText: document.querySelector("[data-action=\\"toggle-collab\\"]")?.textContent || "",
    }))()`).catch((e) => ({ err: e.message }));
    const bProbe2 = await tabB.evaluate(`(() => ({
      presence: !!document.querySelector(".collab-presence"),
      avatars: document.querySelectorAll(".collab-avatar").length,
      remoteCursors: document.querySelectorAll(".remote-cursor").length,
      btnText: document.querySelector("[data-action=\\"toggle-collab\\"]")?.textContent || "",
    }))()`).catch((e) => ({ err: e.message }));
    console.log("A probe2:", JSON.stringify(aProbe2));
    console.log("B probe2:", JSON.stringify(bProbe2));
    console.log("A logs:", JSON.stringify(tabA.logs));
    console.log("B logs:", JSON.stringify(tabB.logs));

    console.log("[verify] presence chips both ways...");
    await tabA.waitFor('(document.querySelector(".collab-presence")?.querySelectorAll(".collab-avatar").length || 0) >= 1', 15000, "A sees B");
    const aChips = await tabA.evaluate('document.querySelector(".collab-presence")?.querySelectorAll(".collab-avatar").length || 0');
    await tabB.waitFor('(document.querySelector(".collab-presence")?.querySelectorAll(".collab-avatar").length || 0) >= 1', 15000, "B sees A");
    const bChips = await tabB.evaluate('document.querySelector(".collab-presence")?.querySelectorAll(".collab-avatar").length || 0');
    const aTitle = await tabA.evaluate('document.querySelector(".collab-presence")?.getAttribute("title") || ""');
    const bTitle = await tabB.evaluate('document.querySelector(".collab-presence")?.getAttribute("title") || ""');
    console.log("A chips:", aChips, "title:", JSON.stringify(aTitle));
    console.log("B chips:", bChips, "title:", JSON.stringify(bTitle));

    const aSlides0 = await tabA.evaluate('document.querySelectorAll("[data-page]").length');
    const bSlides0 = await tabB.evaluate('document.querySelectorAll("[data-page]").length');
    console.log("initial slides A/B:", aSlides0, "/", bSlides0);

    console.log("[verify] A adds a page -> B sees it live...");
    await tabA.evaluate('document.querySelector("[data-action=\\"add-page\\"]").click()');
    await tabA.waitFor('document.querySelectorAll("[data-page]").length === ' + (aSlides0 + 1), 10000, "A has page 2");
    await tabB.waitFor('document.querySelectorAll("[data-page]").length === ' + (bSlides0 + 1), 15000, "B got page 2");
    const aSlides1 = await tabA.evaluate('document.querySelectorAll("[data-page]").length');
    const bSlides1 = await tabB.evaluate('document.querySelectorAll("[data-page]").length');
    console.log("after add-page A/B:", aSlides1, "/", bSlides1, (aSlides1 === bSlides1) ? "OK" : "MISMATCH");

    console.log("[verify] B moves pointer over slide -> A sees cursor...");
    await tabB.evaluate(`
      (() => {
        const slide = document.querySelector("[data-slide]");
        if (!slide) return;
        const r = slide.getBoundingClientRect();
        slide.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }));
      })()
    `);
    await tabA.waitFor('(document.querySelector("[data-remote-cursors]")?.querySelectorAll(".remote-cursor").length || 0) >= 1', 15000, "A sees B cursor");
    const aCursors = await tabA.evaluate('document.querySelector("[data-remote-cursors]")?.querySelectorAll(".remote-cursor").length || 0');
    console.log("A remote cursors:", aCursors, aCursors >= 1 ? "OK" : "FAIL");

    console.log("[verify] B switches page -> A follows pageIndex/remotes...");
    const bTabs = await tabB.evaluate('document.querySelectorAll("[data-page]").length');
    if (bTabs > 1) {
      await tabB.evaluate('document.querySelectorAll("[data-page]")[1].click()');
      await tabB.waitFor('document.querySelector(\'[data-page="1"]\').classList.contains("active")', 10000, "B on page 2");
      await tabA.waitFor('document.querySelector(\'[data-page="1"]\')?.classList.contains("active")', 15000, "A follows to page 2");
      const aActive = await tabA.evaluate('document.querySelector("[data-page].active")?.getAttribute("data-page") || "0"');
      console.log("A active page after B switch:", aActive, aActive === "1" ? "OK" : "FAIL");
    } else {
      console.log("page switch test skipped (tab B has 1 page)");
    }

    console.log("[verify] A adds a text element -> B sees it live...");
    const bEls0 = await tabB.evaluate('document.querySelectorAll(".slide-element").length');
    const aAddTextBtns = await tabA.evaluate('document.querySelectorAll("[data-add-text]").length');
    await tabA.evaluate('document.querySelector("[data-add-text]")?.click()');
    await tabB.waitFor('document.querySelectorAll(".slide-element").length === ' + (bEls0 + 1), 15000, "B got text element");
    const bEls1 = await tabB.evaluate('document.querySelectorAll(".slide-element").length');
    console.log("add-text buttons on A:", aAddTextBtns, "| B elements:", bEls0, "->", bEls1, bEls1 === bEls0 + 1 ? "OK" : "FAIL");

    console.log("[verify] A edits text content -> B sees updated text...");
    await tabA.evaluate(`(() => {
      const el = document.querySelector(".slide-element.text [data-text-content]");
      if (!el) return "no editable";
      el.innerText = "collab live edit check";
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return "edited";
    })()`);
    await tabB.waitFor('document.body.innerText.includes("collab live edit check")', 15000, "B sees edited text");
    const bText = await tabB.evaluate('document.querySelector(".slide-element.text [data-text-content]")?.innerText || ""');
    console.log("B text content:", JSON.stringify(bText), bText.includes("collab live edit check") ? "OK" : "FAIL");

    console.log("[verify] B moves the element -> A sees new position...");
    const aPos0 = await tabA.evaluate('document.querySelector(".slide-element.text")?.style.left || ""');
    const rect = await tabB.evaluate(`(() => {
      const el = document.querySelector(".slide-element.text");
      if (!el) return null;
      el.scrollIntoView({ block: "center", inline: "center" });
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    })()`);
    if (rect) {
      const hit = await tabB.evaluate(`(() => {
        const el = document.elementFromPoint(${rect.x}, ${rect.y});
        return { tag: el?.tagName, cls: el?.className, vw: innerWidth, vh: innerHeight };
      })()`);
      console.log("B hit at", JSON.stringify(rect), "->", JSON.stringify(hit));
      await tabB.send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
      await new Promise((r) => setTimeout(r, 300));
      const sel = await tabB.evaluate('document.querySelector(".slide-element.text.selected") !== null');
      console.log("B element selected after press:", sel);
      await tabB.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: rect.x + 120, y: rect.y, button: "left", buttons: 1 });
      await tabB.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x + 120, y: rect.y, button: "left", clickCount: 1 });
      await new Promise((r) => setTimeout(r, 800));
      const bLeft = await tabB.evaluate('document.querySelector(".slide-element.text")?.style.left || ""');
      console.log("B text left after drag:", JSON.stringify(bLeft));
      await tabA.waitFor('parseFloat(document.querySelector(".slide-element.text")?.style.left || "0") > 200', 15000, "A sees moved element");
    }
    await new Promise((r) => setTimeout(r, 500));
    const aPos1 = await tabA.evaluate('document.querySelector(".slide-element.text")?.style.left || ""');
    console.log("A text left:", JSON.stringify(aPos0), "->", JSON.stringify(aPos1), (parseFloat(aPos1) > 200) ? "OK" : "FAIL");

console.log("tabA errors:", tabA.logs.length ? JSON.stringify(tabA.logs) : "none");
    console.log("tabB errors:", tabB.logs.length ? JSON.stringify(tabB.logs) : "none");
    const allPass = (aChips >= 1 && bChips >= 1 && aSlides1 === bSlides1 && aCursors >= 1);
    process.exitCode = allPass ? 0 : 1;
  } catch (e) {
    console.error("TEST ERROR:", e.message);
    console.log("RESULT: FAIL");
    process.exitCode = 1;
  } finally {
    try { tabA && tabA.ws.close(); } catch { /* noop */ }
    try { tabB && tabB.ws.close(); } catch { /* noop */ }
    chrome.kill();
  }
})();


