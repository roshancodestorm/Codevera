import fs from 'fs';
import path from 'path';
import { detectStack, getStackSupport, getToolchainSnapshot } from './stackCapabilities.js';

const MARKERS = [
  { file: 'package.json', kind: 'node' },
  { file: 'pnpm-lock.yaml', kind: 'node' },
  { file: 'yarn.lock', kind: 'node' },
  { file: 'requirements.txt', kind: 'python' },
  { file: 'pyproject.toml', kind: 'python' },
  { file: 'Pipfile', kind: 'python' },
  { file: 'manage.py', kind: 'django' },
  { file: 'go.mod', kind: 'go' },
  { file: 'Cargo.toml', kind: 'rust' },
  { file: 'pom.xml', kind: 'java' },
  { file: 'build.gradle', kind: 'java' },
  { file: 'pubspec.yaml', kind: 'flutter' },
  { file: 'index.html', kind: 'static' },
];

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

export function detectProjectManifest(workspaceDir) {
  const hints = [];
  let primary = 'unknown';

  for (const m of MARKERS) {
    const full = path.join(workspaceDir, m.file);
    if (!fs.existsSync(full)) continue;
    hints.push(m.file);
    if (primary === 'unknown') primary = m.kind;
  }

  if (fs.existsSync(path.join(workspaceDir, 'manage.py'))) primary = 'django';
  else if (fs.existsSync(path.join(workspaceDir, 'next.config.js')) || fs.existsSync(path.join(workspaceDir, 'next.config.mjs'))) primary = 'next';
  else if (fs.existsSync(path.join(workspaceDir, 'vite.config.ts'))) primary = 'react-ts';
  else if (fs.existsSync(path.join(workspaceDir, 'vite.config.js'))) primary = 'react';
  else if (fs.existsSync(path.join(workspaceDir, 'package.json'))) {
    const pkg = readJsonSafe(path.join(workspaceDir, 'package.json'));
    const deps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
    if (deps.electron) primary = 'electron';
    else if (deps.next) primary = 'next';
    else if (deps.react) primary = deps.typescript ? 'react-ts' : 'react';
    else if (deps.express) primary = 'express';
    else primary = 'node';
  } else if (fs.existsSync(path.join(workspaceDir, 'app.py'))) {
    const req = fs.existsSync(path.join(workspaceDir, 'requirements.txt'))
      ? fs.readFileSync(path.join(workspaceDir, 'requirements.txt'), 'utf8').toLowerCase()
      : '';
    if (req.includes('fastapi')) primary = 'fastapi';
    else if (req.includes('flask')) primary = 'flask';
    else primary = 'python';
  }

  const stackId = primary === 'node' ? 'express' : primary === 'python' ? 'flask' : primary === 'unknown' ? 'static' : primary;
  const snapshot = getToolchainSnapshot();
  const support = getStackSupport(stackId, snapshot) || getStackSupport('static', snapshot);

  const scripts = [];
  const pkgPath = path.join(workspaceDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = readJsonSafe(pkgPath);
    const s = pkg?.scripts || {};
    if (s.dev) scripts.push({ label: 'dev', command: 'npm run dev' });
    if (s.start) scripts.push({ label: 'start', command: 'npm start' });
    if (s.build) scripts.push({ label: 'build', command: 'npm run build' });
    if (s.test) scripts.push({ label: 'test', command: 'npm test' });
    if (scripts.length === 0 && fs.existsSync(path.join(workspaceDir, 'package-lock.json'))) {
      scripts.push({ label: 'install', command: 'npm install' });
    }
  }
  if (fs.existsSync(path.join(workspaceDir, 'requirements.txt'))) {
    scripts.push({ label: 'pip-install', command: 'python -m pip install -r requirements.txt' });
  }
  if (fs.existsSync(path.join(workspaceDir, 'manage.py'))) {
    scripts.push({ label: 'django-check', command: 'python manage.py check' });
  }
  if (fs.existsSync(path.join(workspaceDir, 'Cargo.toml'))) {
    scripts.push({ label: 'cargo-build', command: 'cargo build' });
  }
  if (fs.existsSync(path.join(workspaceDir, 'go.mod'))) {
    scripts.push({ label: 'go-build', command: 'go build ./...' });
  }

  return {
    primary,
    stackId,
    markers: hints,
    support,
    suggestedCommands: scripts,
    shell: snapshot.os,
  };
}

export function manifestSummaryForPrompt(manifest) {
  const lines = [
    `Detected project: ${manifest.primary} (stack: ${manifest.stackId})`,
    `Toolchain: ${manifest.support?.summary || 'unknown'}`,
    `Suggested commands: ${manifest.suggestedCommands.map((s) => s.command).join('; ') || 'none'}`,
  ];
  if (manifest.support?.missingTools?.length) {
    lines.push(`Missing tools on this machine: ${manifest.support.missingTools.join(', ')}`);
  }
  return lines.join('\n');
}

export function detectStackFromTask(task) {
  return detectStack(task);
}
