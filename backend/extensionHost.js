// VS Code Extension Host for Codestrom
//
// Runs extensions in a separate process for isolation. Loads .vsix files,
// provides the `vscode` API surface, and routes contributions (grammars,
// themes, snippets, LSP, DAP, commands) to the main IDE.

import { EventEmitter } from 'events';
import { spawn, fork } from 'child_process';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSIONS_DIR = path.join(__dirname, '..', 'extensions');
const EXTENSION_HOST_SCRIPT = path.join(__dirname, 'extensionHostProcess.js');

fs.mkdirSync(EXTENSIONS_DIR, { recursive: true });

class ExtensionHost extends EventEmitter {
  constructor() {
    super();
    this.process = null;
    this.extensions = new Map(); // id -> { manifest, path, status, contributions }
    this.api = null;
    this.ready = false;
    this.messageId = 0;
    this.pending = new Map(); // id -> { resolve, reject }
  }

  async start() {
    if (this.process) return;
    if (process.env.CODESTROM_DISABLE_EXTENSIONS === '1') {
      console.log('[extensions] Skipped (CODESTROM_DISABLE_EXTENSIONS=1)');
      return;
    }
    
    console.log('[extensions] Forking extension host process...');
    this.process = fork(EXTENSION_HOST_SCRIPT, {
      env: { ...process.env, EXTENSIONS_DIR },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    });

    this.process.on('message', (msg) => this.handleMessage(msg));
    this.process.on('error', (err) => { console.error('[extensions] Process error:', err); this.emit('error', err); });
    this.process.on('exit', (code) => { console.log('[extensions] Process exited:', code); this.ready = false; this.emit('exit', code); });

    // Wait for ready
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { console.error('[extensions] Startup timeout'); reject(new Error('Extension host startup timeout')); }, 10000);
      this.once('ready', () => { clearTimeout(timeout); console.log('[extensions] Ready event received'); resolve(); });
    });
  }

  handleMessage(msg) {
    if (msg.type === 'ready') {
      this.ready = true;
      this.emit('ready');
      return;
    }
    if (msg.type === 'response') {
      const pending = this.pending.get(msg.id);
      if (pending) {
        this.pending.delete(msg.id);
        if (msg.error) pending.reject(new Error(msg.error));
        else pending.resolve(msg.result);
      }
      return;
    }
    if (msg.type === 'event') {
      this.emit(msg.event, msg.data);
    }
  }

  send(type, payload) {
    if (!this.process) {
      return Promise.reject(new Error('Extension host disabled (CODESTROM_DISABLE_EXTENSIONS=1)'));
    }
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      this.pending.set(id, { resolve, reject });
      this.process.send({ id, type, payload });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('Extension host request timeout'));
        }
      }, 30000);
    });
  }

  // Extension management
  async installVsix(vsixPath, workspace) {
    return this.send('installVsix', { vsixPath, workspace });
  }

  async uninstallExtension(extensionId) {
    return this.send('uninstallExtension', { extensionId });
  }

  async listExtensions() {
    return this.send('listExtensions', {});
  }

  async activateExtension(extensionId) {
    return this.send('activateExtension', { extensionId });
  }

  // API forwarding
  async executeCommand(command, ...args) {
    return this.send('executeCommand', { command, args });
  }

  // Contribution queries
  async getGrammars() {
    return this.send('getContributions', { type: 'grammars' });
  }

  async getThemes() {
    return this.send('getContributions', { type: 'themes' });
  }

  async getSnippets() {
    return this.send('getContributions', { type: 'snippets' });
  }

  async getLanguageServers() {
    return this.send('getContributions', { type: 'languageServers' });
  }

  async getDebugAdapters() {
    return this.send('getContributions', { type: 'debugAdapters' });
  }

  async getCommands() {
    return this.send('getContributions', { type: 'commands' });
  }

  async getKeybindings() {
    return this.send('getContributions', { type: 'keybindings' });
  }

  async getViews() {
    return this.send('getContributions', { type: 'views' });
  }

  stop() {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.ready = false;
    }
  }
}

export const extensionHost = new ExtensionHost();

// Initialize on startup
export async function initExtensionHost() {
  console.log('[extensions] Starting extension host...');
  await extensionHost.start();
  console.log('[extensions] Host started');
  
  // Load any pre-installed extensions
  const installed = await extensionHost.listExtensions();
  for (const ext of installed) {
    if (ext.status === 'installed') {
      await extensionHost.activateExtension(ext.id);
    }
  }
}

export default extensionHost;