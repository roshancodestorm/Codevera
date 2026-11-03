import os from 'os';
import { spawnSync } from 'child_process';
import { TEMPLATES } from './ide.js';

const isWindows = process.platform === 'win32';
const PROBE_TTL_MS = 30000;

const TOOLCHAINS = [
  { id: 'node', label: 'Node.js', command: 'node --version' },
  { id: 'npm', label: 'npm', command: 'npm --version' },
  { id: 'python', label: 'Python', command: 'python --version' },
  { id: 'pip', label: 'pip', command: 'python -m pip --version' },
  { id: 'flutter', label: 'Flutter SDK', command: 'flutter --version' },
  { id: 'java', label: 'Java', command: 'java -version' },
  { id: 'gradle', label: 'Gradle', command: 'gradle --version' },
  { id: 'android', label: 'Android SDK', command: 'if exist "%LOCALAPPDATA%\\Android\\Sdk\\platforms\\android-36\\android.jar" (echo android-36 ready) else (exit /b 1)' },
  { id: 'maven', label: 'Maven', command: 'mvn -version' },
  { id: 'go', label: 'Go', command: 'go version' },
  { id: 'cargo', label: 'Cargo', command: 'cargo --version' },
  { id: 'rustc', label: 'Rust', command: 'rustc --version' },
  { id: 'docker', label: 'Docker', command: 'docker --version' },
];

const STACKS = [
  {
    id: 'static',
    label: 'Static HTML/CSS/JS',
    family: 'web',
    requiredTools: [],
    operations: { scaffold: true, install: false, build: false, test: false, run: true, browser: true },
    notes: ['No local toolchain required.'],
  },
  {
    id: 'react',
    label: 'React + Vite',
    family: 'frontend',
    requiredTools: ['node', 'npm'],
    operations: { scaffold: true, install: true, build: true, test: true, run: true, browser: true },
    notes: ['Uses the Vite dev/build pipeline.'],
  },
  {
    id: 'react-ts',
    label: 'React + TypeScript',
    family: 'frontend',
    requiredTools: ['node', 'npm'],
    operations: { scaffold: true, install: true, build: true, test: true, run: true, browser: true },
    notes: ['Runs TypeScript checks before bundling.'],
  },
  {
    id: 'next',
    label: 'Next.js',
    family: 'frontend',
    requiredTools: ['node', 'npm'],
    operations: { scaffold: true, install: true, build: true, test: true, run: true, browser: true },
    notes: ['App Router scaffold with local build support when Node/npm are available.'],
  },
  {
    id: 'express',
    label: 'Express API',
    family: 'backend',
    requiredTools: ['node', 'npm'],
    operations: { scaffold: true, install: true, build: false, test: true, run: true, browser: false },
    notes: ['Runtime verification focuses on API health endpoints rather than browser UI.'],
  },
  {
    id: 'react-express',
    label: 'React + Express (Full-Stack)',
    family: 'fullstack',
    requiredTools: ['node', 'npm'],
    operations: { scaffold: true, install: true, build: true, test: true, run: true, browser: true },
    notes: ['Boots the Express API and browser-verifies the React frontend through the Vite preview proxy.'],
  },
  {
    id: 'electron',
    label: 'Electron Desktop',
    family: 'desktop',
    requiredTools: ['node', 'npm'],
    operations: { scaffold: true, install: true, build: false, test: true, run: true, browser: true },
    notes: ['Uses Electron plus browser-style renderer checks.'],
  },
  {
    id: 'flask',
    label: 'Flask',
    family: 'backend',
    requiredTools: ['python', 'pip'],
    operations: { scaffold: true, install: true, build: false, test: true, run: true, browser: false },
    notes: ['Python runtime support is available when Python and pip are installed.'],
  },
  {
    id: 'fastapi',
    label: 'FastAPI',
    family: 'backend',
    requiredTools: ['python', 'pip'],
    operations: { scaffold: true, install: true, build: false, test: true, run: true, browser: false },
    notes: ['FastAPI scaffold supports install and runtime verification when Python is available.'],
  },
  {
    id: 'django',
    label: 'Django',
    family: 'backend',
    requiredTools: ['python', 'pip'],
    operations: { scaffold: true, install: true, build: false, test: true, run: true, browser: true },
    notes: ['`python manage.py check` is the baseline verification path.'],
  },
  {
    id: 'flutter',
    label: 'Flutter',
    family: 'mobile',
    requiredTools: ['flutter'],
    operations: { scaffold: true, install: true, build: true, test: true, run: true, browser: false },
    notes: ['Without the Flutter SDK, only scaffold/content checks are possible.'],
  },
  {
    id: 'java',
    label: 'Java / Spring',
    family: 'backend',
    requiredTools: ['java', 'maven'],
    operations: { scaffold: true, install: true, build: true, test: true, run: true, browser: false },
    notes: ['Requires JDK and Maven for real builds and test execution.'],
  },
  {
    id: 'kotlin',
    label: 'Kotlin (JVM)',
    family: 'desktop',
    requiredTools: ['java', 'gradle'],
    operations: { scaffold: true, install: true, build: true, test: true, run: true, browser: false },
    notes: ['Uses Gradle + the Kotlin JVM plugin; Swing is built into the JDK for desktop UI.'],
  },
  {
    id: 'android',
    label: 'Android (Kotlin + Compose)',
    family: 'mobile',
    requiredTools: ['java', 'gradle', 'android'],
    operations: { scaffold: true, install: true, build: true, test: true, run: false, browser: false },
    notes: ['Builds an APK with the Android Gradle Plugin. Running needs an emulator/device.'],
  },
  {
    id: 'go',
    label: 'Go',
    family: 'backend',
    requiredTools: ['go'],
    operations: { scaffold: true, install: true, build: true, test: true, run: true, browser: false },
    notes: ['Without Go installed, the system can only scaffold and content-check.'],
  },
  {
    id: 'rust',
    label: 'Rust',
    family: 'backend',
    requiredTools: ['cargo', 'rustc'],
    operations: { scaffold: true, install: true, build: true, test: true, run: true, browser: false },
    notes: ['Cargo and rustc are both required for full verification.'],
  },
  {
    id: 'python-cli',
    label: 'Python CLI',
    family: 'cli',
    requiredTools: ['python'],
    operations: { scaffold: true, install: false, build: false, test: true, run: true, browser: false },
    notes: ['Template-only starter for simple Python scripts and CLIs.'],
  },
];

const STACK_MAP = Object.fromEntries(STACKS.map((stack) => [stack.id, stack]));

let cachedSnapshot = null;

function runProbe(command) {
  const shell = isWindows ? 'cmd.exe' : 'sh';
  const args = isWindows ? ['/d', '/s', '/c', command] : ['-lc', command];
  try {
    const result = spawnSync(shell, args, {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 12000,
    });
    const output = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
    const firstLine = output.split(/\r?\n/).find((line) => line.trim())?.trim() || '';
    return {
      installed: result.status === 0,
      version: result.status === 0 ? firstLine : null,
      error: result.status === 0 ? null : firstLine || `exit ${result.status ?? 'unknown'}`,
    };
  } catch (err) {
    return {
      installed: false,
      version: null,
      error: String(err?.message || err || 'probe failed'),
    };
  }
}

function supportSummary(level, missingTools) {
  if (level === 'full') return 'Full support on this machine';
  if (missingTools.length > 0) return `Scaffold only - missing ${missingTools.join(', ')}`;
  return 'Unavailable';
}

export function detectStack(task) {
  const t = String(task || '').toLowerCase();
  if (/\b(electron|desktop app|desktop application)\b/.test(t)) return 'electron';
  if (/\b(next\.?js|next app|nextjs)\b/.test(t)) return 'next';
  if (/\bandroid\b/i.test(t) || /\b(android studio|jetpack compose|jetpack|androidx|apk|avd|material design|compose ui)\b/i.test(t)) return 'android';
  if (/\bkotlin\b/.test(t)) return 'kotlin';
  if (/\b(java|spring boot|springboot|maven|gradle)\b/.test(t)) return 'java';
  if (/\b(golang|go lang|go server|go app|go program)\b/.test(t)) return 'go';
  if (/\b(rust|cargo)\b/.test(t)) return 'rust';
  if (/\b(flutter|dart)\b|\bmobile\s+app\b/.test(t)) return 'flutter';
  if (/\bdjango\b/.test(t)) return 'django';
  if (/\bfastapi\b/.test(t)) return 'fastapi';
  if (/\b(flask|python)\b/.test(t)) return 'flask';
  if (/\bfull[\s-]?stack\b/.test(t) || (/\b(react|vue|svelte|frontend|front-end)\b/.test(t) && /\b(express|api|backend|server|database|sqlite|mongodb|postgres|rest)\b/.test(t))) return 'react-express';
  if (/\b(express|backend|api server|node server|rest api)\b/.test(t)) return 'express';
  if (/\b(typescript|\.tsx|\btsx\b)\b/.test(t)) return 'react-ts';
  if (/\breact\b|\bcomponent-?based\b|\bjsx\b/.test(t)) return 'react';
  return 'static';
}

export function getToolchainSnapshot(force = false) {
  if (!force && cachedSnapshot && Date.now() - cachedSnapshot.checkedAt < PROBE_TTL_MS) return cachedSnapshot;
  const tools = TOOLCHAINS.map((tool) => {
    const probe = runProbe(tool.command);
    return {
      id: tool.id,
      label: tool.label,
      command: tool.command,
      installed: probe.installed,
      version: probe.version,
      error: probe.error,
    };
  });
  const available = Object.fromEntries(tools.map((tool) => [tool.id, tool.installed]));
  cachedSnapshot = {
    checkedAt: Date.now(),
    os: `${os.platform()} ${os.release()}`,
    tools,
    available,
  };
  return cachedSnapshot;
}

export function getStackSupport(stackId, snapshot = getToolchainSnapshot()) {
  const stack = STACK_MAP[stackId];
  if (!stack) return null;
  const missingTools = stack.requiredTools.filter((tool) => !snapshot.available[tool]);
  const full = missingTools.length === 0;
  const supportLevel = full ? 'full' : (stack.operations.scaffold ? 'scaffold-only' : 'unavailable');
  return {
    id: stack.id,
    label: stack.label,
    family: stack.family,
    supportLevel,
    summary: supportSummary(supportLevel, missingTools),
    requiredTools: stack.requiredTools,
    missingTools,
    notes: stack.notes,
    operations: {
      scaffold: !!stack.operations.scaffold,
      install: full && !!stack.operations.install,
      build: full && !!stack.operations.build,
      test: full && !!stack.operations.test,
      run: full && !!stack.operations.run,
      browser: full && !!stack.operations.browser,
      contentChecks: true,
    },
  };
}

export function listStackSupports(snapshot = getToolchainSnapshot()) {
  return STACKS.map((stack) => getStackSupport(stack.id, snapshot)).filter(Boolean);
}

export function getCapabilityMatrix(force = false) {
  const snapshot = getToolchainSnapshot(force);
  // Templates are keyed by their id in ide.js and carry a `kind` of either
  // 'static' (no toolchain) or 'node' (requires node + npm). We surface per-template
  // toolchain readiness so the frontend can badge each template card.
  const templates = Object.entries(TEMPLATES).map(([id, def]) => {
    const kind = String(def.kind || 'static');
    const missing = [];
    if (kind === 'node') {
      for (const t of ['node', 'npm']) if (!snapshot.available[t]) missing.push(t);
    }
    const ready = missing.length === 0;
    return {
      templateId: id,
      supported: ready,
      toolchain: { ready, reason: ready ? null : `Missing ${missing.join(', ')}` },
    };
  });
  return {
    checkedAt: snapshot.checkedAt,
    os: snapshot.os,
    toolchains: snapshot.tools,
    stacks: listStackSupports(snapshot),
    templates,
  };
}
