// main.js — GBA Emulator Ultimate
// Correções: save sem conflito de nome, screenshot direto, sem diálogo bloqueante.

const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// ── Config persistente ──────────────────────────────────────────────
const configPath = path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(configPath, 'utf-8')); }
  catch (e) { return {}; }
}
function saveConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// ── Capas ───────────────────────────────────────────────────────────
const coversDir = path.join(app.getPath('userData'), 'covers');
if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir, { recursive: true });

function coverPathFor(romName) {
  const safeName = romName.replace(/[\\/:*?"<>|]/g, '_');
  return path.join(coversDir, safeName + '.jpg');
}

async function fetchCoverForGame(romName) {
  const cached = coverPathFor(romName);
  if (fs.existsSync(cached)) return 'file://' + cached.replace(/\\/g, '/');

  const baseUrl = 'https://thumbnails.libretro.com/Nintendo%20-%20Game%20Boy%20Advance/Named_Boxarts/';

  function buildCandidates(name) {
    const noTags = name.replace(/[\(\[].*?[\)\]]/g, '').trim();
    const candidates = [name];
    if (noTags === name) {
      candidates.push(name + ' (USA)', name + ' (Europe)', name + ' (World)', name + ' (Japan)');
    } else {
      candidates.push(noTags + ' (USA)', noTags + ' (Europe)');
    }
    return candidates;
  }

  for (const candidate of buildCandidates(romName)) {
    try {
      const url = baseUrl + encodeURIComponent(candidate.replace(/\s+/g, ' ')) + '.png';
      const res = await fetch(url);
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length > 500) {
          fs.writeFileSync(cached, buffer);
          return 'file://' + cached.replace(/\\/g, '/');
        }
      }
    } catch (e) { /* tenta próximo */ }
  }
  return null;
}

// ── Scan de ROMs ────────────────────────────────────────────────────
function scanRomFolder(folderPath) {
  const exts = ['.gba', '.gbc', '.gb'];
  let results = [];
  try {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (exts.includes(ext)) {
          const fullPath = path.join(folderPath, entry.name);
          const stat = fs.statSync(fullPath);
          results.push({
            name: entry.name.replace(/\.[^.]+$/, ''),
            fileName: entry.name,
            fullPath,
            size: (stat.size / 1024 / 1024).toFixed(2),
            ext: ext.replace('.', '').toUpperCase()
          });
        }
      }
    }
  } catch (e) { console.error('Erro ao ler pasta de ROMs:', e); }
  return results;
}

// ── Janela ──────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 800, minHeight: 600,
    title: 'GBA Emulator Ultimate',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    backgroundColor: '#0c0c10',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
  buildMenu();
}

// ── Menu ────────────────────────────────────────────────────────────
function buildMenu() {
  const send = (a) => mainWindow.webContents.send('menu-action', a);

  const template = [
    {
      label: 'Arquivo',
      submenu: [
        { label: '📂 Abrir ROM...', accelerator: 'CmdOrCtrl+O', click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              title: 'Selecionar ROM GBA',
              filters: [
                { name: 'ROMs GBA/GBC/GB', extensions: ['gba', 'gbc', 'gb'] },
                { name: 'Todos os arquivos', extensions: ['*'] }
              ],
              properties: ['openFile']
            });
            if (!result.canceled && result.filePaths.length > 0) {
              const filePath = result.filePaths[0];
              const fileData = fs.readFileSync(filePath);
              mainWindow.webContents.send('load-rom-file', {
                base64: fileData.toString('base64'),
                fileName: path.basename(filePath)
              });
            }
        }},
        { label: '📁 Trocar pasta da Biblioteca...', click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              title: 'Selecionar pasta de ROMs',
              properties: ['openDirectory']
            });
            if (!result.canceled && result.filePaths.length > 0) {
              const folderPath = result.filePaths[0];
              const config = loadConfig();
              config.romFolder = folderPath;
              saveConfig(config);
              mainWindow.webContents.send('rom-library-loaded', {
                folderPath, roms: scanRomFolder(folderPath)
              });
            }
        }},
        { type: 'separator' },
        { label: '💾 Salvar Estado (Slot 1)', accelerator: 'F5', click: () => send('save-state-1') },
        { label: '📥 Carregar Estado (Slot 1)', accelerator: 'F7', click: () => send('load-state-1') },
        { type: 'separator' },
        { label: 'Sair', accelerator: 'Alt+F4', click: () => app.quit() }
      ]
    },
    {
      label: 'Emulador',
      submenu: [
        { label: '⏸ Pausar / Continuar', accelerator: 'Space', click: () => send('toggle-pause') },
        { label: '🔄 Reiniciar', accelerator: 'CmdOrCtrl+R', click: () => send('reset') },
        { type: 'separator' },
        { label: 'Velocidade', submenu: [
          { label: '0.5x', click: () => send('speed-0.5') },
          { label: '1x (Normal)', click: () => send('speed-1') },
          { label: '2x', click: () => send('speed-2') },
          { label: '4x', click: () => send('speed-4') },
        ]},
        { type: 'separator' },
        { label: '🔇 Mudo', accelerator: 'CmdOrCtrl+M', click: () => send('toggle-mute') }
      ]
    },
    {
      label: 'Vídeo',
      submenu: [
        { label: '⛶ Tela Cheia', accelerator: 'F11', click: () => {
            const isFS = mainWindow.isFullScreen();
            mainWindow.setFullScreen(!isFS);
            send(isFS ? 'exit-fullscreen' : 'enter-fullscreen');
        }},
        { type: 'separator' },
        { label: 'Captura de Tela', accelerator: 'F12', click: () => send('screenshot') }
      ]
    },
    {
      label: 'Configurações',
      submenu: [
        { label: '⚙️ Abrir Configurações', accelerator: 'CmdOrCtrl+,', click: () => send('open-settings') }
      ]
    },
    {
      label: 'Ajuda',
      submenu: [
        { label: 'Atalhos de Teclado', click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info', title: 'Atalhos de Teclado', message: 'Atalhos Padrão GBA',
              detail: [
                'D-Pad:      Setas ←↑→↓',
                'Botão A:    Z',
                'Botão B:    X',
                'L:          A',
                'R:          S',
                'Start:      Enter',
                'Select:     Backspace',
                '', 'Emulador:',
                'Pausar:     Espaço',
                'Tela Cheia: F11',
                'Save State: F5',
                'Load State: F7',
                'Screenshot: F12',
                'Abrir ROM:  Ctrl+O',
              ].join('\n'),
              buttons: ['OK']
            });
        }},
        { type: 'separator' },
        { label: 'Sobre', click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info', title: 'Sobre GBA Emulator Ultimate', message: 'GBA Emulator Ultimate',
              detail: 'Versão 1.1.0\n\nEmulador Game Boy Advance completo.\nSuporta ROMs .gba, .gbc e .gb\n\nPowered by Electron',
              icon: path.join(__dirname, 'assets', 'icon.ico'), buttons: ['OK']
            });
        }}
      ]
    }
  ];

  Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── IPC ─────────────────────────────────────────────────────────────
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecionar ROM GBA',
    filters: [
      { name: 'ROMs GBA/GBC/GB', extensions: ['gba', 'gbc', 'gb'] },
      { name: 'Todos os arquivos', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  const fileData = fs.readFileSync(filePath);
  return { base64: fileData.toString('base64'), fileName: path.basename(filePath) };
});

ipcMain.handle('choose-rom-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecionar pasta de ROMs', properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const folderPath = result.filePaths[0];
  const config = loadConfig();
  config.romFolder = folderPath;
  saveConfig(config);
  return { folderPath, roms: scanRomFolder(folderPath) };
});

ipcMain.handle('get-saved-rom-folder', async () => {
  const config = loadConfig();
  if (!config.romFolder) return null;
  if (!fs.existsSync(config.romFolder)) return null;
  return { folderPath: config.romFolder, roms: scanRomFolder(config.romFolder) };
});

ipcMain.handle('get-game-cover', async (event, romName) => {
  return await fetchCoverForGame(romName);
});

ipcMain.handle('set-game-cover-manual', async (event, romName) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Escolher capa do jogo',
    filters: [{ name: 'Imagens', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const cached = coverPathFor(romName);
  try {
    fs.writeFileSync(cached, fs.readFileSync(result.filePaths[0]));
    return 'file://' + cached.replace(/\\/g, '/') + '?t=' + Date.now();
  } catch (e) { return null; }
});

ipcMain.handle('read-rom-file', async (event, fullPath) => {
  try {
    const fileData = fs.readFileSync(fullPath);
    return { base64: fileData.toString('base64'), fileName: path.basename(fullPath) };
  } catch (e) { return null; }
});

// ── SCREENSHOT: salva direto, sem diálogo, sobrescreve se existir ───
ipcMain.handle('save-screenshot', async (event, { dataUrl, romName }) => {
  try {
    const picturesPath = app.getPath('pictures');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultName = `GBA_${romName || 'screenshot'}_${timestamp}.png`;
    const filePath = path.join(picturesPath, defaultName);

    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    // 'w' sobrescreve se existir — mas o timestamp já torna o nome único
    fs.writeFileSync(filePath, base64Data, 'base64');
    return { ok: true, path: filePath };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ── EXPORTAR SAVES: salva direto em Documentos, sem diálogo ─────────
ipcMain.handle('save-saves-backup', async (event, { json, defaultName }) => {
  try {
    const docsPath = app.getPath('documents');
    const filePath = path.join(docsPath, defaultName);
    fs.writeFileSync(filePath, json, 'utf-8');
    return { ok: true, path: filePath };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ── Ciclo de vida ───────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
