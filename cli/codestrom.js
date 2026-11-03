#!/usr/bin/env node

// Codestrom CLI - `codestrom` binary
// Usage: codestrom <command> [options]

import { Command } from 'commander';
import fetch from 'node-fetch';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const program = new Command();

const CONFIG_DIR = join(homedir(), '.codestrom-cli');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const DEFAULT_BASE = 'http://localhost:5000';

function loadConfig() {
  if (existsSync(CONFIG_FILE)) {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
  }
  return { baseUrl: DEFAULT_BASE, token: null };
}

function saveConfig(config) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function getAuthHeaders(config) {
  const headers = { 'Content-Type': 'application/json' };
  if (config.token) headers.Authorization = `Bearer ${config.token}`;
  return headers;
}

async function api(config, path, options = {}) {
  const url = `${config.baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...getAuthHeaders(config), ...options.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Auth ─────────────────────────────────────────────────────────────
program
  .command('login')
  .description('Sign in to Codestrom')
  .option('-e, --email <email>', 'Email')
  .option('-p, --password <password>', 'Password')
  .action(async (opts) => {
    const config = loadConfig();
    const email = opts.email || await prompt('Email: ');
    const password = opts.password || await prompt('Password: ', true);
    const { token, user } = await api(config, '/api/ide/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    config.token = token;
    saveConfig(config);
    console.log(`✅ Logged in as ${user.name} (${user.email})`);
  });

program
  .command('logout')
  .description('Sign out')
  .action(async () => {
    const config = loadConfig();
    if (config.token) {
      await api(config, '/api/ide/auth/logout', { method: 'POST' });
    }
    config.token = null;
    saveConfig(config);
    console.log('✅ Logged out');
  });

program
  .command('whoami')
  .description('Show current user')
  .action(async () => {
    const config = loadConfig();
    if (!config.token) return console.log('Not logged in');
    const { user } = await api(config, '/api/ide/auth/me');
    console.log(`${user.name} <${user.email}>`);
  });

// ── Workspaces ───────────────────────────────────────────────────────
const workspaceCmd = program.command('workspace').description('Manage workspaces');

workspaceCmd.command('list').description('List workspaces').action(async () => {
  const config = loadConfig();
  const workspaces = await api(config, '/api/ide/workspaces');
  const list = Array.isArray(workspaces) ? workspaces : (workspaces.value || []);
  if (!list.length) return console.log('No workspaces');
  for (const w of list) {
    console.log(`  ${w.name}  (${w.root || 'generated'})`);
  }
});

workspaceCmd.command('create <name>').description('Create a new workspace').action(async (name) => {
  const config = loadConfig();
  const { name: created } = await api(config, '/api/ide/workspaces', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  console.log(`✅ Created workspace: ${created}`);
});

workspaceCmd.command('open <name>').description('Open a workspace (prints URL)').action(async (name) => {
  const config = loadConfig();
  await api(config, '/api/ide/workspaces/open', {
    method: 'POST',
    body: JSON.stringify({ workspace: name }),
  });
  console.log(`${config.baseUrl}/api/ide/preview/${encodeURIComponent(name)}`);
});

// ── Agent ────────────────────────────────────────────────────────────
const agentCmd = program.command('agent').description('Manage agent runs');

agentCmd.command('run <workspace> <task>').description('Run agent on a task').option('--auto-build', 'Auto build after', true).option('--auto-test', 'Auto test after', true).action(async (workspace, task, opts) => {
  const config = loadConfig();
  const r = await api(config, '/api/ide/agents/run', {
    method: 'POST',
    body: JSON.stringify({ workspace, task, autoBuild: opts.autoBuild, autoTest: opts.autoTest }),
  });
  console.log(`Run ID: ${r.runId}`);
  console.log(`Status: ${r.status}`);
  if (r.shareUrl) console.log(`Preview: ${r.shareUrl}`);
});

agentCmd.command('runs <workspace>').description('List agent runs').action(async (workspace) => {
  const config = loadConfig();
  const { runs } = await api(config, `/api/ide/agents/runs?workspace=${encodeURIComponent(workspace)}`);
  if (!runs.length) return console.log('No runs');
  for (const r of runs) {
    console.log(`  ${r.id}  ${r.status}  ${r.task?.slice(0, 60)}`);
  }
});

// ── Deploy ───────────────────────────────────────────────────────────
const deployCmd = program.command('deploy').description('Manage deployments');

deployCmd.command('local <workspace>').description('Deploy workspace locally (Node/static)').option('-f, --force', 'Force rebuild').action(async (workspace, opts) => {
  const config = loadConfig();
  const r = await api(config, '/api/ide/deploy', {
    method: 'POST',
    body: JSON.stringify({ workspace, force: opts.force }),
  });
  console.log(`Status: ${r.status}`);
  if (r.url) console.log(`Local: ${r.url}`);
  if (r.shareUrl) console.log(`Public: ${r.shareUrl}`);
});

deployCmd.command('docker <workspace>').description('Deploy workspace via Docker').option('-f, --force', 'Force rebuild').action(async (workspace, opts) => {
  const config = loadConfig();
  const r = await api(config, '/api/ide/deploy/docker', {
    method: 'POST',
    body: JSON.stringify({ workspace, force: opts.force }),
  });
  console.log(`Status: ${r.status}`);
  if (r.url) console.log(`Local: ${r.url}`);
  if (r.shareUrl) console.log(`Public: ${r.shareUrl}`);
});

deployCmd.command('hosted <workspace>').description('Deploy to cloud (Render/Railway/Fly)').requiredOption('-p, --provider <provider>', 'render | railway | fly').option('-f, --force', 'Force redeploy').action(async (workspace, opts) => {
  const config = loadConfig();
  const r = await api(config, '/api/ide/deploy/hosted', {
    method: 'POST',
    body: JSON.stringify({ workspace, provider: opts.provider, force: opts.force }),
  });
  console.log(`Status: ${r.status}`);
  if (r.shareUrl) console.log(`Live: ${r.shareUrl}`);
});

deployCmd.command('wake <workspace>').description('Wake a sleeping (autoscaled) deployment').action(async (workspace) => {
  const config = loadConfig();
  const r = await api(config, '/api/ide/deploy/wake', {
    method: 'POST',
    body: JSON.stringify({ workspace }),
  });
  console.log(`Status: ${r.status}`);
  if (r.shareUrl) console.log(`Live: ${r.shareUrl}`);
});

deployCmd.command('stop <workspace>').description('Stop deployment').action(async (workspace) => {
  const config = loadConfig();
  await api(config, '/api/ide/deploy/stop', {
    method: 'POST',
    body: JSON.stringify({ workspace }),
  });
  console.log('✅ Stopped');
});

// ── Extensions ──────────────────────────────────────────────────────
const extCmd = program.command('ext').description('Manage extensions');

extCmd.command('list').description('List installed extensions').action(async () => {
  const config = loadConfig();
  const { extensions } = await api(config, '/api/ide/extensions');
  if (!extensions.length) return console.log('No extensions installed');
  for (const e of extensions) {
    console.log(`  ${e.id}  ${e.status}  [${(e.contributions || []).join(', ')}]`);
  }
});

extCmd.command('install <vsixPath>').description('Install a .vsix extension').action(async (vsixPath) => {
  const config = loadConfig();
  const r = await api(config, '/api/ide/extensions/install', {
    method: 'POST',
    body: JSON.stringify({ vsixPath }),
  });
  console.log(`✅ Installed: ${r.id}`);
});

extCmd.command('uninstall <extensionId>').description('Uninstall an extension').action(async (extensionId) => {
  const config = loadConfig();
  await api(config, '/api/ide/extensions/uninstall', {
    method: 'POST',
    body: JSON.stringify({ extensionId }),
  });
  console.log('✅ Uninstalled');
});

extCmd.command('contributions <type>').description('List extension contributions (grammars|themes|snippets|languageServers|debugAdapters|commands|keybindings|views)').action(async (type) => {
  const config = loadConfig();
  const { contributions } = await api(config, `/api/ide/extensions/contributions?type=${type}`);
  console.log(JSON.stringify(contributions, null, 2));
});

// ── Config ───────────────────────────────────────────────────────────
const configCmd = program.command('config').description('Manage CLI config');

configCmd.command('set <key> <value>').description('Set config (baseUrl)').action((key, value) => {
  const config = loadConfig();
  config[key] = value;
  saveConfig(config);
  console.log(`✅ ${key} = ${value}`);
});

configCmd.command('get').description('Show config').action(() => {
  const config = loadConfig();
  console.log(JSON.stringify(config, null, 2));
});

// ── Helpers ──────────────────────────────────────────────────────────
function prompt(question, hidden = false) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    if (hidden) {
      const stdin = process.stdin;
      stdin.setRawMode(true);
      stdin.resume();
      stdin.once('data', (buf) => {
        stdin.setRawMode(false);
        stdin.pause();
        const char = buf.toString();
        if (char === '\n' || char === '\r') {
          console.log('');
          resolve('');
        } else if (char === '\u0003') {
          process.exit(1);
        } else {
          process.stdout.write('*');
          prompt('', true).then((rest) => resolve(char + rest));
        }
      });
    } else {
      process.stdin.once('data', (data) => resolve(data.toString().trim()));
    }
  });
}

program
  .name('codestrom')
  .description('Codestrom CLI - manage workspaces, agents, deployments, extensions')
  .version('1.0.0');

program.parseAsync(process.argv).catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});