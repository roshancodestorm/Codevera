// Extension Host Process - runs in separate Node process
//
// Loads VS Code extensions (.vsix), provides `vscode` API surface,
// and manages extension lifecycle.

import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSIONS_DIR = process.env.EXTENSIONS_DIR || path.join(__dirname, '..', 'extensions');

const extensions = new Map(); // id -> { manifest, path, exports, status, contributions }
let vscodeAPI = null;

// Minimal VS Code API surface
function createVSCodeAPI(extensionId, extensionPath) {
  const api = {
    // Workspace
    workspace: {
      workspaceFolders: [],
      getConfiguration: (section) => ({ get: () => undefined, update: async () => {} }),
      onDidChangeConfiguration: () => ({ dispose: () => {} }),
      onDidChangeWorkspaceFolders: () => ({ dispose: () => {} }),
      findFiles: async (pattern) => [],
      openTextDocument: async (uri) => ({ uri, getText: () => '', lineCount: 0 }),
      saveAll: async () => true,
      fs: {
        readFile: async (uri) => Buffer.from(''),
        writeFile: async (uri, content) => {},
        delete: async (uri) => {},
        createDirectory: async (uri) => {},
        stat: async (uri) => ({ type: 1, ctime: 0, mtime: 0, size: 0 }),
      },
    },

    // Window
    window: {
      activeTextEditor: undefined,
      visibleTextEditors: [],
      onDidChangeActiveTextEditor: () => ({ dispose: () => {} }),
      showInformationMessage: async (msg) => {},
      showWarningMessage: async (msg) => {},
      showErrorMessage: async (msg) => {},
      showInputBox: async () => undefined,
      showQuickPick: async () => undefined,
      createOutputChannel: (name) => ({
        appendLine: (v) => console.log(`[${name}] ${v}`),
        show: () => {},
        dispose: () => {},
      }),
      createStatusBarItem: () => ({
        show: () => {},
        hide: () => {},
        dispose: () => {},
      }),
    },

    // Commands
    commands: {
      registerCommand: (command, callback) => ({
        dispose: () => {},
      }),
      executeCommand: async (command, ...args) => {
        return sendToMain('executeCommand', { command, args });
      },
    },

    // Languages
    languages: {
      registerCompletionItemProvider: (selector, provider) => ({ dispose: () => {} }),
      registerHoverProvider: (selector, provider) => ({ dispose: () => {} }),
      registerDefinitionProvider: (selector, provider) => ({ dispose: () => {} }),
      registerDocumentFormattingEditProvider: (selector, provider) => ({ dispose: () => {} }),
      registerCodeActionsProvider: (selector, provider) => ({ dispose: () => {} }),
      registerCodeLensProvider: (selector, provider) => ({ dispose: () => {} }),
      registerDocumentSymbolProvider: (selector, provider) => ({ dispose: () => {} }),
      registerFoldingRangeProvider: (selector, provider) => ({ dispose: () => {} }),
      registerDocumentHighlightProvider: (selector, provider) => ({ dispose: () => {} }),
      registerDocumentLinkProvider: (selector, provider) => ({ dispose: () => {} }),
      registerColorProvider: (selector, provider) => ({ dispose: () => {} }),
      registerWorkspaceSymbolProvider: (provider) => ({ dispose: () => {} }),
      setLanguageConfiguration: (lang, config) => ({ dispose: () => {} }),
    },

    // Debug
    debug: {
      registerDebugAdapterDescriptorFactory: (type, factory) => ({ dispose: () => {} }),
      registerDebugConfigurationProvider: (type, provider) => ({ dispose: () => {} }),
      startDebugging: async (folder, config) => {},
    },

    // Extensions
    extensions: {
      getExtension: (id) => extensions.get(id)?.exports || undefined,
      all: Array.from(extensions.values()).map((e) => e.exports),
    },

    // Env
    env: {
      appName: 'Codestrom',
      sessionId: crypto.randomUUID(),
      machineId: 'codestrom-machine',
    },

    // Uri, Position, Range, etc.
    Uri: {
      file: (p) => ({ fsPath: p, scheme: 'file', toString: () => `file://${p}` }),
      parse: (s) => ({ fsPath: s.replace('file://', ''), scheme: 'file', toString: () => s }),
    },
    Position: class { constructor(line, char) { this.line = line; this.character = char; } },
    Range: class { constructor(start, end) { this.start = start; this.end = end; } },
    Location: class { constructor(uri, range) { this.uri = uri; this.range = range; } },
    Diagnostic: class { constructor(range, message, severity) { this.range = range; this.message = message; this.severity = severity; } },
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
    CompletionItem: class { constructor(label) { this.label = label; } },
    CompletionItemKind: { Text: 0, Method: 1, Function: 2, Constructor: 3, Field: 4, Variable: 5, Class: 6, Interface: 7, Module: 8, Property: 9, Unit: 10, Value: 11, Enum: 12, Keyword: 13, Snippet: 14, Color: 15, File: 16, Reference: 17, Folder: 18, EnumMember: 19, Constant: 20, Struct: 21, Event: 22, Operator: 23, TypeParameter: 24 },
    MarkdownString: class { constructor(value) { this.value = value; } },
  };

  return api;
}

function sendToMain(type, payload) {
  return new Promise((resolve, reject) => {
    const id = Math.random().toString(36).slice(2);
    const handler = (msg) => {
      if (msg.id === id && msg.type === 'response') {
        process.removeListener('message', handler);
        if (msg.error) reject(new Error(msg.error));
        else resolve(msg.result);
      }
    };
    process.on('message', handler);
    process.send({ id, type, payload });
    setTimeout(() => { process.removeListener('message', handler); reject(new Error('Timeout')); }, 30000);
  });
}

// Load extension from .vsix or folder
async function loadExtension(extPath, id) {
  let manifestPath = path.join(extPath, 'package.json');
  let manifest;
  
  if (extPath.endsWith('.vsix')) {
    // Extract .vsix to temp folder
    const tempDir = path.join(EXTENSIONS_DIR, '.tmp', id);
    fs.mkdirSync(tempDir, { recursive: true });
    const zip = new AdmZip(extPath);
    zip.extractAllTo(tempDir, true);
    manifestPath = path.join(tempDir, 'extension', 'package.json');
    extPath = path.join(tempDir, 'extension');
  }

  const manifestContent = await fsp.readFile(manifestPath, 'utf8');
  manifest = JSON.parse(manifestContent);
  
  if (!manifest.name || !manifest.version) {
    throw new Error('Invalid extension manifest');
  }

  const fullId = `${manifest.name}@${manifest.version}`;
  
  // Create the extension API
  const api = createVSCodeAPI(fullId, extPath);
  vscodeAPI = api; // Global for require()

  // Load the extension entry point
  let exports = {};
  const entryPoint = manifest.main ? path.join(extPath, manifest.main) : path.join(extPath, 'out', 'extension.js');
  
  if (fs.existsSync(entryPoint)) {
    try {
      const mod = await import(entryPoint);
      if (mod.activate) await mod.activate(api);
      exports = mod;
    } catch (err) {
      console.error(`[extension ${fullId}] Activation failed:`, err.message);
    }
  }

  const ext = {
    id: fullId,
    manifest,
    path: extPath,
    exports,
    status: 'active',
    contributions: manifest.contributes || {},
  };
  
  extensions.set(fullId, ext);
  return ext;
}

// Handle messages from main process
process.on('message', async (msg) => {
  if (!msg || !msg.id) return;
  
  try {
    let result;
    switch (msg.type) {
      case 'installVsix': {
        const { vsixPath, workspace } = msg.payload;
        const id = path.basename(vsixPath, '.vsix');
        const destPath = path.join(EXTENSIONS_DIR, `${id}.vsix`);
        await fsp.copyFile(vsixPath, destPath);
        const ext = await loadExtension(destPath, id);
        result = { id: ext.id, status: ext.status };
        break;
      }
      case 'uninstallExtension': {
        const { extensionId } = msg.payload;
        const ext = extensions.get(extensionId);
        if (ext) {
          if (ext.exports.deactivate) await ext.exports.deactivate();
          extensions.delete(extensionId);
        }
        result = { ok: true };
        break;
      }
      case 'listExtensions': {
        result = Array.from(extensions.values()).map((e) => ({
          id: e.id,
          name: e.manifest.displayName || e.manifest.name,
          version: e.manifest.version,
          description: e.manifest.description,
          status: e.status,
          contributions: Object.keys(e.contributions || {}),
        }));
        break;
      }
      case 'activateExtension': {
        const { extensionId } = msg.payload;
        const ext = extensions.get(extensionId);
        if (ext && ext.status !== 'active') {
          if (ext.exports.activate) await ext.exports.activate(vscodeAPI);
          ext.status = 'active';
        }
        result = { ok: true };
        break;
      }
      case 'executeCommand': {
        const { command, args } = msg.payload;
        // Find command in any active extension
        for (const ext of extensions.values()) {
          if (ext.contributions.commands) {
            const cmd = ext.contributions.commands.find((c) => c.command === command);
            if (cmd && ext.exports[cmd.callback]) {
              result = await ext.exports[cmd.callback](...args);
              break;
            }
          }
        }
        break;
      }
      case 'getContributions': {
        const { type } = msg.payload;
        const contributions = [];
        for (const ext of extensions.values()) {
          if (ext.contributions[type]) {
            contributions.push(...ext.contributions[type].map((c) => ({ ...c, extensionId: ext.id })));
          }
        }
        result = contributions;
        break;
      }
    }
    process.send({ id: msg.id, type: 'response', result });
  } catch (err) {
    process.send({ id: msg.id, type: 'response', error: String(err.message || err) });
  }
});

// Signal ready
process.send({ type: 'ready' });