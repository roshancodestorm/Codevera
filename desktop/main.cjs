const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// ─── Auto-update (electron-updater + GitHub Releases) ────────────────────────
// Checks for updates on GitHub Releases every 60 min (when not in dev).
// IPC events forwarded to renderer so the UI can show an update banner.
let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
  autoUpdater.logger = { info: console.log, warn: console.warn, error: console.error };
  autoUpdater.autoDownload = true;   // download silently in background
  autoUpdater.autoInstallOnAppQuit = true; // install on next quit
} catch {
  // electron-updater not available in dev / packaged without it
  autoUpdater = null;
}

const DEV_URL = process.env.CODESTROM_DEV_URL || 'http://localhost:5173';
const BACKEND_PORT = process.env.BACKEND_PORT || '3001';

let win = null;
let backendProc = null;

// ─── Auto-spawn backend/server.js when launched from Electron ────────────────
function startBackend() {
  // Locate backend directory relative to this file (desktop/main.cjs → ../backend)
  const backendDir = path.join(__dirname, '..', 'backend');
  const serverEntry = path.join(backendDir, 'server.js');

  if (!fs.existsSync(serverEntry)) {
    console.warn('[electron] backend/server.js not found — skipping auto-spawn');
    return;
  }

  // Prefer node from PATH; electron ships its own node so use process.execPath
  // only as a last resort (it exposes electron-specific globals).
  const nodeExec = process.platform === 'win32' ? 'node.exe' : 'node';

  backendProc = spawn(nodeExec, [serverEntry], {
    cwd: backendDir,
    env: { ...process.env, PORT: BACKEND_PORT },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  backendProc.stdout?.on('data', (d) => {
    process.stdout.write(`[backend] ${d}`);
  });
  backendProc.stderr?.on('data', (d) => {
    process.stderr.write(`[backend] ${d}`);
  });
  backendProc.on('error', (err) => {
    console.error('[electron] backend spawn error:', err.message);
  });
  backendProc.on('exit', (code, signal) => {
    console.log(`[electron] backend exited (code=${code}, signal=${signal})`);
    backendProc = null;
  });

  console.log(`[electron] backend started (pid=${backendProc.pid}, port=${BACKEND_PORT})`);
}

function stopBackend() {
  if (!backendProc) return;
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(backendProc.pid), '/T', '/F'], { windowsHide: true });
    } else {
      backendProc.kill('SIGTERM');
    }
  } catch {}
  backendProc = null;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: 'Codestrom',
    backgroundColor: '#0b0b10',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const builtIndex = path.join(__dirname, '..', 'dist', 'index.html');
  if (process.env.CODESTROM_USE_DIST === '1' && fs.existsSync(builtIndex)) {
    win.loadFile(builtIndex);
  } else {
    win.loadURL(DEV_URL);
  }

  if (process.env.CODESTROM_SMOKE === '1') {
    win.webContents.once('did-finish-load', async () => {
      const bridge = await win.webContents.executeJavaScript('({ has: !!window.desktopAPI, pick: typeof (window.desktopAPI && window.desktopAPI.pickFolder), ver: typeof (window.desktopAPI && window.desktopAPI.version) })');
      console.log('[SMOKE] bridge:', JSON.stringify(bridge));
      console.log('[SMOKE] page loaded:', win.webContents.getURL());
      setTimeout(() => { console.log('[SMOKE] OK'); app.quit(); }, 1200);
    });
    win.webContents.once('did-fail-load', (_e, code, desc) => {
      console.error('[SMOKE] load failed:', code, desc);
      app.exit(1);
    });
  }
}

ipcMain.handle('dialog:pickFolder', async () => {
  const result = await dialog.showOpenDialog(win, {
    title: 'Open Local Folder',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('dialog:pickFolderMulti', async () => {
  const result = await dialog.showOpenDialog(win, {
    title: 'Open Local Folder',
    properties: ['openDirectory', 'multiSelections'],
  });
  if (result.canceled || result.filePaths.length === 0) return [];
  return result.filePaths;
});

ipcMain.handle('app:version', () => app.getVersion());

// ─── Update IPC handlers ─────────────────────────────────────────────────────
// Renderer can call these to check / apply updates.
ipcMain.handle('updater:check', () => {
  if (!autoUpdater) return { available: false, reason: 'updater not available' };
  try { autoUpdater.checkForUpdatesAndNotify(); return { checking: true }; } catch (e) { return { error: e.message }; }
});

ipcMain.handle('updater:install', () => {
  if (!autoUpdater) return;
  autoUpdater.quitAndInstall();
});

app.whenReady().then(() => {
  // Start the backend before opening the window so the API is ready
  startBackend();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Start auto-update checks in packaged builds only
  if (autoUpdater && !process.env.CODESTROM_DEV_URL?.includes('localhost')) {
    // Forward updater events → renderer so the UI can show update banners
    const fwd = (event) => autoUpdater.on(event, (info) => {
      try { win?.webContents?.send(`updater:${event}`, info); } catch {}
    });
    ['checking-for-update', 'update-available', 'update-not-available',
     'download-progress', 'update-downloaded', 'error'].forEach(fwd);

    // Initial check + periodic checks every 60 minutes
    try { autoUpdater.checkForUpdatesAndNotify(); } catch {}
    setInterval(() => { try { autoUpdater.checkForUpdatesAndNotify(); } catch {} }, 60 * 60 * 1000);
  }
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopBackend();
});
