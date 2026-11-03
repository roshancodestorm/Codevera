import { ChangeEvent, DragEvent, FormEvent, lazy, ReactNode, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createTemplateProject, templateTypes } from "./data/templates";
import { drawGamePreview } from "./lib/gameEngine";
import { repository } from "./lib/storage";
import { Asset, AuthMode, Entity, GameType, Project, PublishedGame, Theme, User, View } from "./types";

const nowLabel = () => new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
const CarRacingGame = lazy(() => import("./CarRacingGame"));
const TruiserGame = lazy(() => import("./TruiserGame"));
const RailwayGame = lazy(() => import("./RailwayGame"));

export default function App() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [view, setView] = useState<View>("landing");
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [user, setUser] = useState<User>(() => repository.getUser());
  const [projects, setProjects] = useState<Project[]>([]);
  const [published, setPublished] = useState<PublishedGame[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>("");

  useEffect(() => {
    repository.bootstrap();
    const loadedProjects = repository.getProjects();
    setProjects(loadedProjects);
    setPublished(repository.getPublished());
    setUser(repository.getUser());
    setActiveProjectId(loadedProjects[0]?.id ?? "");
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0];
  const saveProjects = (next: Project[]) => { setProjects(next); repository.saveProjects(next); };
  const updateProject = (project: Project) => saveProjects(projects.map((item) => item.id === project.id ? { ...project, lastEdited: new Date().toISOString(), version: project.version + 1 } : item));
  const createProject = (type: GameType = "Platformer") => {
    const project = createTemplateProject(type, `Untitled ${type}`);
    saveProjects([project, ...projects]);
    setActiveProjectId(project.id);
    setView("editor");
  };
  const publishProject = (project: Project) => {
    const slug = project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const game: PublishedGame = {
      id: uid("published"),
      projectId: project.id,
      title: project.title,
      slug,
      shareUrl: `https://gameforge.studio/play/${slug}`,
      plays: Math.floor(1200 + Math.random() * 9000),
      likes: Math.floor(80 + Math.random() * 900),
      completionRate: Math.floor(42 + Math.random() * 45),
      publishedAt: new Date().toISOString(),
    };
    const nextPublished = [game, ...published.filter((item) => item.projectId !== project.id)];
    setPublished(nextPublished);
    repository.savePublished(nextPublished);
    updateProject({ ...project, status: "Published" });
    setView("publish");
  };

  return (
    <div className="app-shell">
      <TopNav theme={theme} user={user} view={view} onTheme={() => setTheme(theme === "dark" ? "light" : "dark")} onView={setView} />
      {view === "landing" && <LandingPage onStart={() => setView("auth")} onTemplates={() => setView("dashboard")} />}
      {view === "auth" && <AuthShell mode={authMode} user={user} onMode={setAuthMode} onSubmit={(nextUser) => { setUser(nextUser); repository.saveUser(nextUser); setView("dashboard"); }} />}
      {view === "dashboard" && <Dashboard projects={projects} published={published} onCreate={createProject} onOpen={(project) => { setActiveProjectId(project.id); setView("editor"); }} onOpenRacing={() => setView("carRacing")} onOpenTruiser={() => setView("truiser")} onOpenRailway={() => setView("railway")} onPublish={publishProject} />}
      {view === "editor" && activeProject && <Editor project={activeProject} onUpdate={updateProject} onPublish={publishProject} onDashboard={() => setView("dashboard")} />}
      {view === "publish" && activeProject && <PublishCenter project={activeProject} published={published} onOpenEditor={() => setView("editor")} />}
      {view === "profile" && <Profile user={user} onSave={(next) => { setUser(next); repository.saveUser(next); }} />}
      {view === "carRacing" && <Suspense fallback={<main className="racing-page"><section className="auth-card"><p className="eyebrow">Loading</p><h2>Preparing 3D racing engine...</h2></section></main>}><CarRacingGame onDashboard={() => setView("dashboard")} /></Suspense>}
      {view === "truiser" && <Suspense fallback={<main className="truiser-page"><section className="auth-card"><p className="eyebrow">Loading</p><h2>Preparing Truiser...</h2></section></main>}><TruiserGame onDashboard={() => setView("dashboard")} /></Suspense>}
      {view === "railway" && <Suspense fallback={<main className="railway-page"><section className="auth-card"><p className="eyebrow">Loading</p><h2>Preparing Bhartiye Railway...</h2></section></main>}><RailwayGame onDashboard={() => setView("dashboard")} /></Suspense>}
    </div>
  );
}

function TopNav({ theme, user, view, onTheme, onView }: { theme: Theme; user: User; view: View; onTheme: () => void; onView: (view: View) => void }) {
  return (
    <header className="top-nav">
      <button className="brand" onClick={() => onView("landing")}><span className="brand-mark">GF</span><span>GameForge Studio</span></button>
      <nav>{["landing", "dashboard", "editor", "publish"].map((item) => <button key={item} className={view === item ? "active" : ""} onClick={() => onView(item as View)}>{item}</button>)}</nav>
      <div className="nav-actions"><button className="icon-btn" onClick={onTheme}>{theme === "dark" ? "Light" : "Dark"}</button><button className="avatar" onClick={() => onView("profile")}>{user.name.slice(0, 2).toUpperCase()}</button></div>
    </header>
  );
}

function LandingPage({ onStart, onTemplates }: { onStart: () => void; onTemplates: () => void }) {
  return (
    <main>
      <section className="hero-section">
        <div className="hero-copy"><p className="eyebrow">No-code 2D and 3D game creation platform</p><h1>Build Games Visually. Publish Everywhere.</h1><p>Create game projects, test built-in playable games, and publish prototypes from one dashboard.</p><div className="hero-actions"><button className="primary" onClick={onStart}>Start Building</button><button className="secondary" onClick={onTemplates}>Explore Templates</button></div></div>
        <div className="hero-product"><div className="mini-toolbar"><span></span><span></span><span></span><button>Play</button></div><div className="mini-editor"><aside><b>Assets</b><b>Scenes</b><b>Prefabs</b><b>Sounds</b></aside><div className="mini-canvas"><span className="mini-player"></span><span className="mini-coin"></span><span className="mini-enemy"></span></div><aside><b>Position</b><b>Physics</b><b>Collision</b><b>Behavior</b></aside></div></div>
      </section>
    </main>
  );
}

function AuthShell({ mode, user, onMode, onSubmit }: { mode: AuthMode; user: User; onMode: (mode: AuthMode) => void; onSubmit: (user: User) => void }) {
  const [form, setForm] = useState(user);
  return <main className="auth-layout"><form className="auth-card" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}><p className="eyebrow">Creators, teams, and studios</p><h2>{mode === "login" ? "Welcome back" : mode === "forgot" ? "Reset your password" : "Create your workspace"}</h2>{mode !== "forgot" && <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" />}<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" />{mode !== "forgot" && <input type="password" placeholder="Password" defaultValue="gameforge" />}{mode === "signup" && <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as User["role"] })}><option>Creator</option><option>Team</option><option>Studio</option></select>}<button className="primary">{mode === "forgot" ? "Send Reset Link" : "Continue"}</button><div className="mode-switch"><button type="button" onClick={() => onMode("login")}>Login</button><button type="button" onClick={() => onMode("signup")}>Sign up</button><button type="button" onClick={() => onMode("forgot")}>Forgot password</button></div></form></main>;
}

function Dashboard({ projects, published, onCreate, onOpen, onOpenRacing, onOpenTruiser, onOpenRailway, onPublish }: { projects: Project[]; published: PublishedGame[]; onCreate: (type?: GameType) => void; onOpen: (project: Project) => void; onOpenRacing: () => void; onOpenTruiser: () => void; onOpenRailway: () => void; onPublish: (project: Project) => void }) {
  return (
    <main className="dashboard">
      <section className="dashboard-hero"><div><p className="eyebrow">Workspace overview</p><h1>Build, test, and publish games</h1></div><div className="quick-actions"><button className="primary" onClick={() => onCreate()}>+ New Game</button><button className="secondary">Import Assets</button><button className="secondary">Published Games ({published.length})</button></div></section>
      <section className="template-strip">{templateTypes.map((type) => <button key={type} onClick={() => onCreate(type)}>{type}</button>)}</section>
      <section className="project-grid"><BuiltinRacingCard onOpen={onOpenRacing} /><BuiltinTruiserCard onOpen={onOpenTruiser} /><BuiltinRailwayCard onOpen={onOpenRailway} />{projects.map((project) => <article className="project-card" key={project.id}><div className="project-thumb" style={{ background: `radial-gradient(circle at 30% 25%, #fff8, transparent 22%), ${project.thumbnail}` }} /><div className="project-meta"><span>{project.status}</span><span>{project.type}</span></div><h3>{project.title}</h3><p>Last edited {new Date(project.lastEdited).toLocaleString()}</p><div className="card-actions"><button className="primary" onClick={() => onOpen(project)}>Open</button><button className="secondary" onClick={() => onPublish(project)}>Publish</button></div></article>)}</section>
    </main>
  );
}

function BuiltinRacingCard({ onOpen }: { onOpen: () => void }) {
  return <article className="project-card built-in-racing-card"><div className="project-thumb racing-thumb"><span className="thumb-road"></span><span className="thumb-car player"></span><span className="thumb-car rival"></span></div><div className="project-meta"><span>Built-in</span><span>Racing</span></div><h3>Car Racing</h3><p>Open an HD 3D cockpit racing game with steering, gas, and brake controls.</p><div className="card-actions"><button className="primary" onClick={onOpen}>Open</button><button className="secondary" onClick={onOpen}>Play</button></div></article>;
}

function BuiltinTruiserCard({ onOpen }: { onOpen: () => void }) {
  return <article className="project-card built-in-truiser-card"><div className="project-thumb truiser-thumb"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div><div className="project-meta"><span>Built-in</span><span>Match-3</span></div><h3>Truiser</h3><p>Swap bright tiles, create matches, clear cascades, and chase a high score.</p><div className="card-actions"><button className="primary" onClick={onOpen}>Open</button><button className="secondary" onClick={onOpen}>Play</button></div></article>;
}

function BuiltinRailwayCard({ onOpen }: { onOpen: () => void }) {
  return <article className="project-card built-in-railway-card"><div className="project-thumb railway-thumb"><span className="rail-sky"></span><span className="rail-track"></span><span className="rail-train"></span><span className="rail-platform"></span></div><div className="project-meta"><span>Built-in</span><span>Train Sim</span></div><h3>Bhartiye Railway</h3><p>Drive an Indian rail engine, follow signals, control throttle and brake, and stop at the next station.</p><div className="card-actions"><button className="primary" onClick={onOpen}>Open</button><button className="secondary" onClick={onOpen}>Play</button></div></article>;
}

function Editor({
  project,
  onUpdate,
  onPublish,
  onDashboard,
}: {
  project: Project;
  onUpdate: (project: Project) => void;
  onPublish: (project: Project) => void;
  onDashboard: () => void;
}) {
  const [selectedId, setSelectedId] = useState("entity-player");
  const [playing, setPlaying] = useState(false);
  const [tab, setTab] = useState<"timeline" | "layers" | "console" | "logic">("logic");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scene = project.config.scenes.find((item) => item.id === project.config.activeSceneId) ?? project.config.scenes[0];
  const selected = scene.entities.find((item) => item.id === selectedId) ?? scene.entities[0];

  useEffect(() => {
    let raf = 0;
    const loop = (time: number) => {
      if (canvasRef.current) drawGamePreview(canvasRef.current, project.config, { time, selectedId, playing });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [project, selectedId, playing]);

  const patchEntity = (patch: Partial<Entity>) => {
    const scenes = project.config.scenes.map((item) =>
      item.id === scene.id
        ? { ...item, entities: item.entities.map((entity) => (entity.id === selected.id ? { ...entity, ...patch } : entity)) }
        : item,
    );
    onUpdate({ ...project, config: { ...project.config, scenes } });
  };

  const addAssetEntity = (asset: Asset, x = 220, y = 180) => {
    const entity: Entity = {
      id: uid("entity"),
      name: asset.name,
      kind: asset.category === "Enemies" ? "enemy" : asset.category === "Objects" ? "coin" : "player",
      x,
      y,
      width: 44,
      height: 44,
      rotation: 0,
      color: asset.color,
      physics: asset.category !== "UI",
      collision: true,
      animation: "Idle",
      behavior: "Designer placed object",
      variables: {},
    };
    const scenes = project.config.scenes.map((item) =>
      item.id === scene.id ? { ...item, entities: [...item.entities, entity] } : item,
    );
    onUpdate({ ...project, config: { ...project.config, scenes } });
    setSelectedId(entity.id);
  };

  const uploadAsset = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const asset: Asset = {
      id: uid("asset"),
      name: file.name,
      category: file.type.startsWith("audio") ? "Sounds" : "Objects",
      type: file.type.startsWith("audio") ? "audio" : "sprite",
      color: "#7dd3fc",
      url: URL.createObjectURL(file),
    };
    onUpdate({ ...project, assets: [asset, ...project.assets] });
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const asset = project.assets.find((item) => item.id === event.dataTransfer.getData("asset-id"));
    if (!asset) return;
    const rect = event.currentTarget.getBoundingClientRect();
    addAssetEntity(asset, event.clientX - rect.left - 22, event.clientY - rect.top - 22);
  };

  return (
    <main className="editor">
      <div className="editor-toolbar">
        <button className="secondary" onClick={onDashboard}>← Dashboard</button>
        <strong>{project.title}</strong>
        <span>Autosaved {nowLabel()} · v{project.version}</span>
        <div className="toolbar-actions">
          <button>Undo</button><button>Redo</button>
          <button className={playing ? "danger" : "primary"} onClick={() => setPlaying(!playing)}>{playing ? "Stop" : "Play"}</button>
          <button>Preview</button><button>Export</button><button className="primary" onClick={() => onPublish(project)}>Publish</button><button>Settings</button>
        </div>
      </div>
      <div className="editor-grid">
        <aside className="left-panel">
          <PanelTitle title="Assets" action={<label className="upload-btn">Upload<input type="file" onChange={uploadAsset} /></label>} />
          <div className="asset-list">
            {project.assets.map((asset) => (
              <button key={asset.id} draggable onDragStart={(e) => e.dataTransfer.setData("asset-id", asset.id)} onClick={() => addAssetEntity(asset)}>
                <span style={{ background: asset.color }}></span><b>{asset.name}</b><small>{asset.category}</small>
              </button>
            ))}
          </div>
          <PanelTitle title="Scenes" />
          {project.config.scenes.map((item) => <button className="scene-row active" key={item.id}>{item.name}</button>)}
        </aside>
        <section className="stage-wrap" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
          <div className="stage-header"><span>Stage · 1280x720</span><span>Drag assets here</span></div>
          <canvas ref={canvasRef} width={760} height={430} />
        </section>
        <aside className="right-panel">
          <PanelTitle title="Inspector" />
          {selected && (
            <div className="inspector">
              <input value={selected.name} onChange={(e) => patchEntity({ name: e.target.value })} />
              {(["x", "y", "width", "height", "rotation"] as const).map((key) => (
                <label key={key}>{key}<input type="number" value={selected[key]} onChange={(e) => patchEntity({ [key]: Number(e.target.value) })} /></label>
              ))}
              <label>Physics<input type="checkbox" checked={selected.physics} onChange={(e) => patchEntity({ physics: e.target.checked })} /></label>
              <label>Collision<input type="checkbox" checked={selected.collision} onChange={(e) => patchEntity({ collision: e.target.checked })} /></label>
              <label>Animation<input value={selected.animation} onChange={(e) => patchEntity({ animation: e.target.value })} /></label>
              <label>Behavior<textarea value={selected.behavior} onChange={(e) => patchEntity({ behavior: e.target.value })} /></label>
            </div>
          )}
          <AiAssistant project={project} onApply={(rule) => onUpdate({ ...project, config: { ...project.config, logic: [rule, ...project.config.logic] } })} />
        </aside>
      </div>
      <section className="bottom-panel">
        <div className="tabs">{(["timeline", "layers", "console", "logic"] as const).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
        {tab === "logic" ? <LogicBuilder project={project} onUpdate={onUpdate} /> : <PanelContent tab={tab} scene={scene} />}
      </section>
    </main>
  );
}

function PanelTitle({ title, action }: { title: string; action?: ReactNode }) {
  return <div className="panel-title"><h3>{title}</h3>{action}</div>;
}

function PanelContent({ tab, scene }: { tab: string; scene: { entities: Entity[] } }) {
  if (tab === "layers") return <div className="layer-list">{scene.entities.map((entity) => <span key={entity.id}>{entity.name}</span>)}</div>;
  if (tab === "console") return <pre className="console">[info] Preview runtime ready{"\n"}[logic] 2 enabled event chains{"\n"}[asset] Built-in library mounted</pre>;
  return <div className="timeline">{scene.entities.map((entity, index) => <span key={entity.id} style={{ width: `${90 + index * 30}px` }}>{entity.animation}</span>)}</div>;
}

function LogicBuilder({ project, onUpdate }: { project: Project; onUpdate: (project: Project) => void }) {
  const [draft, setDraft] = useState({ trigger: "When keyboard Space is pressed", condition: "player is grounded", actions: "make player jump, play Arcade Blip" });
  const addRule = () => {
    onUpdate({
      ...project,
      config: {
        ...project.config,
        logic: [{ id: uid("logic"), trigger: draft.trigger, condition: draft.condition, actions: draft.actions.split(",").map((x) => x.trim()), enabled: true }, ...project.config.logic],
      },
    });
  };
  return (
    <div className="logic-builder">
      <div className="logic-form">
        <input value={draft.trigger} onChange={(e) => setDraft({ ...draft, trigger: e.target.value })} />
        <input value={draft.condition} onChange={(e) => setDraft({ ...draft, condition: e.target.value })} />
        <input value={draft.actions} onChange={(e) => setDraft({ ...draft, actions: e.target.value })} />
        <button className="primary" onClick={addRule}>Add Event</button>
      </div>
      <div className="logic-chain">
        {project.config.logic.map((rule) => (
          <article key={rule.id}>
            <span>Trigger</span><b>{rule.trigger}</b><i>→</i><span>Condition</span><b>{rule.condition}</b><i>→</i><span>Actions</span><b>{rule.actions.join(" → ")}</b>
          </article>
        ))}
      </div>
    </div>
  );
}

function AiAssistant({ project, onApply }: { project: Project; onApply: (rule: Project["config"]["logic"][number]) => void }) {
  const [prompt, setPrompt] = useState("Create a coin combo system");
  const suggestion = useMemo(() => {
    const title = prompt.toLowerCase();
    if (title.includes("level")) return "Generate a three-lane level with coin arcs, two patrol enemies, checkpoints, and a boss gate.";
    if (title.includes("fix")) return "Your enemy touch rule should debounce damage for 1 second before health changes again.";
    return "When player collects 5 coins → multiply score by 2 → spawn particle burst → play Arcade Blip.";
  }, [prompt]);
  return (
    <div className="ai-panel">
      <PanelTitle title="AI Assistant" />
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      <p>{suggestion}</p>
      <button
        className="secondary"
        onClick={() => onApply({ id: uid("logic"), trigger: "When player collects 5 coins", condition: "combo timer is active", actions: ["multiply score by 2", "spawn particle burst", "play Arcade Blip"], enabled: true })}
      >
        Apply Logic
      </button>
    </div>
  );
}

function PublishCenter({ project, published, onOpenEditor }: { project: Project; published: PublishedGame[]; onOpenEditor: () => void }) {
  const game = published.find((item) => item.projectId === project.id);
  return (
    <main className="publish-page">
      <section className="publish-card">
        <div><p className="eyebrow">Publish pipeline</p><h1>{project.title}</h1><p>Instant browser preview, HTML5 export metadata, public page, and shareable game link.</p></div>
        <button className="primary" onClick={onOpenEditor}>Open Editor</button>
      </section>
      <section className="publish-grid">
        <article><h3>Share Link</h3><p>{game?.shareUrl ?? "Publish from the editor to generate a link."}</p></article>
        <article><h3>HTML5 Export</h3><p>Game JSON, assets manifest, scene graph, and event logic are ready for a Phaser/Pixi runtime package.</p></article>
        <article><h3>Analytics</h3><strong>{game?.plays ?? 0}</strong><p>plays · {game?.likes ?? 0} likes · {game?.completionRate ?? 0}% completion</p></article>
      </section>
    </main>
  );
}

function Profile({ user, onSave }: { user: User; onSave: (user: User) => void }) {
  const [draft, setDraft] = useState(user);
  return (
    <main className="profile-page">
      <section className="auth-card">
        <p className="eyebrow">User profile</p><h2>Workspace settings</h2>
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
        <select value={draft.plan} onChange={(e) => setDraft({ ...draft, plan: e.target.value as User["plan"] })}><option>Free</option><option>Pro</option><option>Studio</option></select>
        <button className="primary" onClick={() => onSave(draft)}>Save Profile</button>
      </section>
    </main>
  );
}




