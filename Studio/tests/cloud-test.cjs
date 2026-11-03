// Cloud layer wire-level check: signup → login → project CRUD → share link →
// public shared view → auth rejection. Spawns its own server instance with a
// temp data dir so it never touches real user data or the main server.
const { spawn } = require("child_process");
const os = require("os");
const path = require("path");
const fs = require("fs");

const PORT = 5197;
const root = path.join(__dirname, "..");
const dataDir = path.join(os.tmpdir(), "studio-cloud-" + Date.now());
const srv = spawn(process.execPath, [path.join(root, "server.js")], {
  env: { ...process.env, PORT: String(PORT), STUDIO_DATA_DIR: dataDir },
  stdio: "ignore",
  cwd: root,
});

const base = `http://127.0.0.1:${PORT}`;

async function api(p, opts = {}) {
  const res = await fetch(base + p, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function waitReady() {
  for (let i = 0; i < 40; i += 1) {
    try { await fetch(base + "/"); return; } catch { await new Promise((r) => setTimeout(r, 250)); }
  }
  throw new Error("server did not start");
}

(async () => {
  const failures = [];
  const check = (label, ok) => { if (!ok) failures.push(label); };
  try {
    await waitReady();

    const signup = await api("/api/auth/signup", { method: "POST", body: JSON.stringify({ name: "alice", password: "secret1" }) });
    check("signup ok", signup.status === 200 && signup.body.ok);
    const token = signup.body.token;
    const h = { Authorization: `Bearer ${token}` };

    const dup = await api("/api/auth/signup", { method: "POST", body: JSON.stringify({ name: "alice", password: "secret1" }) });
    check("duplicate signup rejected", dup.status === 409);

    const wrongPw = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ name: "alice", password: "nope" }) });
    check("wrong password rejected", wrongPw.status === 401);

    const me = await api("/api/me", { headers: h });
    check("me returns user", me.status === 200 && me.body.user.name === "alice");

    const create = await api("/api/projects", {
      method: "POST",
      headers: h,
      body: JSON.stringify({ name: "Test Deck", kind: "Presentation", pages: [{ background: "#fff", elements: [] }] }),
    });
    check("project created", create.status === 200 && create.body.ok);
    const id = create.body.id;

    const list = await api("/api/projects", { headers: h });
    check("list contains project", list.status === 200 && list.body.projects.some((p) => p.id === id));

    const update = await api(`/api/projects/${id}`, { method: "PUT", headers: h, body: JSON.stringify({ name: "Renamed Deck" }) });
    check("project updated", update.status === 200 && update.body.ok);

    const share = await api(`/api/projects/${id}/share`, { method: "POST", headers: h });
    check("share created", share.status === 200 && /^[a-f0-9]{16}$/.test(share.body.shareId || ""));
    const shareId = share.body.shareId;

    const shared = await api(`/api/shared/${shareId}`);
    check("public share readable", shared.status === 200 && shared.body.project.name === "Renamed Deck" && shared.body.project.pages.length === 1);

    const sharedBad = await api("/api/shared/not-a-real-id");
    check("bad share rejected", sharedBad.status === 404);

    const foreigner = await api("/api/auth/signup", { method: "POST", body: JSON.stringify({ name: "bob", password: "secret2" }) });
    const foreign = { Authorization: `Bearer ${foreigner.body.token}` };
    const steal = await api(`/api/projects/${id}`, { headers: foreign });
    check("other user cannot read", steal.status === 404);

    const unauth = await api("/api/projects");
    check("no token rejected", unauth.status === 401);

    const viewer = await fetch(`${base}/p/${shareId}`);
    check("viewer route serves app", viewer.status === 200 && (await viewer.text()).includes("Codestream"));

    const logout = await api("/api/auth/logout", { method: "POST", headers: h });
    check("logout ok", logout.status === 200 && logout.body.ok);
    const meAfter = await api("/api/me", { headers: h });
    check("token invalid after logout", meAfter.status === 401);
  } catch (error) {
    failures.push("exception: " + error.message);
  }

  srv.kill();
  fs.rmSync(dataDir, { recursive: true, force: true });

  if (failures.length) {
    console.log("CLOUD: FAIL");
    failures.forEach((f) => console.log("  - " + f));
    process.exitCode = 1;
  } else {
    console.log("CLOUD: PASS — auth, projects, share links, viewer route");
  }
  process.exit(0);
})();