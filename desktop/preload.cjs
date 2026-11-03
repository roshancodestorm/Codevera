const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  pickFolder:  () => ipcRenderer.invoke('dialog:pickFolder'),
  pickFolders: () => ipcRenderer.invoke('dialog:pickFolderMulti'),
  isDesktop:   true,
  version:     () => ipcRenderer.invoke('app:version'),

  // ── Auto-update bridge ───────────────────────────────────────────────────
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  installUpdate:   () => ipcRenderer.invoke('updater:install'),
  onUpdateEvent: (callback) => {
    const events = [
      'updater:checking-for-update',
      'updater:update-available',
      'updater:update-not-available',
      'updater:download-progress',
      'updater:update-downloaded',
      'updater:error',
    ];
    const handlers = events.map((ev) => {
      const h = (_e, info) => callback(ev.replace('updater:', ''), info);
      ipcRenderer.on(ev, h);
      return [ev, h];
    });
    // Return an unsubscribe function
    return () => handlers.forEach(([ev, h]) => ipcRenderer.removeListener(ev, h));
  },
});
