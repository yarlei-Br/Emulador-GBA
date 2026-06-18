const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras para o renderer (a página HTML)
contextBridge.exposeInMainWorld('electronAPI', {
  // Abrir diálogo de arquivo nativo
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),

  // Salvar screenshot
  saveScreenshot: (dataUrl, romName) => ipcRenderer.invoke('save-screenshot', { dataUrl, romName }),

  // Receber ações do menu nativo
  onMenuAction: (callback) => ipcRenderer.on('menu-action', (event, action) => callback(action)),

  // Receber ROM carregada via menu
  onLoadRomFile: (callback) => ipcRenderer.on('load-rom-file', (event, data) => callback(data)),

  // Remover listeners (limpeza)
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // Info da plataforma
  platform: process.platform,
  isElectron: true
});
