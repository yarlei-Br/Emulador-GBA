const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Abrir diálogo de arquivo único
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),

  // Escolher pasta de ROMs (abre diálogo nativo e salva a escolha)
  chooseRomFolder: () => ipcRenderer.invoke('choose-rom-folder'),

  // Pega a pasta já salva anteriormente, sem perguntar nada
  getSavedRomFolder: () => ipcRenderer.invoke('get-saved-rom-folder'),

  // Ler o conteúdo de um arquivo de ROM específico pelo caminho completo
  readRomFile: (fullPath) => ipcRenderer.invoke('read-rom-file', fullPath),

  // Salvar screenshot
  saveScreenshot: (dataUrl, romName) => ipcRenderer.invoke('save-screenshot', { dataUrl, romName }),

  // Receber ações do menu nativo
  onMenuAction: (callback) => ipcRenderer.on('menu-action', (event, action) => callback(action)),

  // Receber ROM carregada via menu
  onLoadRomFile: (callback) => ipcRenderer.on('load-rom-file', (event, data) => callback(data)),

  // Receber biblioteca recarregada via menu "Trocar pasta"
  onRomLibraryLoaded: (callback) => ipcRenderer.on('rom-library-loaded', (event, data) => callback(data)),

  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  platform: process.platform,
  isElectron: true
});
