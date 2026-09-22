// preload.js — bridge segura entre Electron e a página HTML
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Diálogos de arquivo / pasta
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  chooseRomFolder: () => ipcRenderer.invoke('choose-rom-folder'),
  getSavedRomFolder: () => ipcRenderer.invoke('get-saved-rom-folder'),

  // ROMs
  readRomFile: (fullPath) => ipcRenderer.invoke('read-rom-file', fullPath),

  // Capas
  getGameCover: (romName) => ipcRenderer.invoke('get-game-cover', romName),
  setGameCoverManual: (romName) => ipcRenderer.invoke('set-game-cover-manual', romName),

  // Screenshot — agora retorna { ok, path } e salva direto
  saveScreenshot: (dataUrl, romName) =>
    ipcRenderer.invoke('save-screenshot', { dataUrl, romName }),

  // Exportar saves — salva direto em Documentos, sem diálogo
  saveSavesBackup: (json, defaultName) =>
    ipcRenderer.invoke('save-saves-backup', { json, defaultName }),

  // Eventos do menu nativo
  onMenuAction: (cb) => ipcRenderer.on('menu-action', (e, a) => cb(a)),
  onLoadRomFile: (cb) => ipcRenderer.on('load-rom-file', (e, d) => cb(d)),
  onRomLibraryLoaded: (cb) => ipcRenderer.on('rom-library-loaded', (e, d) => cb(d)),
});
