const { app, BrowserWindow, Menu, dialog, shell, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// Onde fica salva a config persistente (pasta de jogos lembrada)
const configPath = path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (e) {
    return {};
  }
}

function saveConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Pasta onde ficam as capas baixadas (cache local, não precisa buscar de novo)
const coversDir = path.join(app.getPath('userData'), 'covers');
if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir, { recursive: true });

function coverPathFor(romName) {
  const safeName = romName.replace(/[\\/:*?"<>|]/g, '_');
  return path.join(coversDir, safeName + '.jpg');
}

// Busca a capa na internet (TheGamesDB via proxy publico de busca) e salva em cache
async function fetchCoverForGame(romName) {
  const cached = coverPathFor(romName);
  if (fs.existsSync(cached)) {
    return 'file://' + cached.replace(/\\/g, '/');
  }

  try {
    // Limpa o nome (remove tags tipo (Brazil), [!], etc.) para melhorar a busca
    const cleanName = romName
      .replace(/[\(\[].*?[\)\]]/g, '')
      .replace(/[_\-]/g, ' ')
      .trim();

    // Usa a API publica do RAWG (sem precisar de chave para busca simples) como fonte de capas
    const searchUrl = 'https://api.rawg.io/api/games?search=' + encodeURIComponent(cleanName) + '&page_size=1';
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    const data = await searchRes.json();

    const imageUrl = data?.results?.[0]?.background_image;
    if (!imageUrl) return null;

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    fs.writeFileSync(cached, buffer);

    return 'file://' + cached.replace(/\\/g, '/');
  } catch (e) {
    console.error('Erro ao buscar capa:', e);
    return null;
  }
}

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
            fullPath: fullPath,
            size: (stat.size / 1024 / 1024).toFixed(2),
            ext: ext.replace('.', '').toUpperCase()
          });
        }
      }
    }
  } catch (e) {
    console.error('Erro ao ler pasta de ROMs:', e);
  }
  return results;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
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

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  buildMenu();
}

function buildMenu() {
  const template = [
    {
      label: 'Arquivo',
      submenu: [
        {
          label: '📂 Abrir ROM...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
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
              const base64 = fileData.toString('base64');
              const fileName = path.basename(filePath);
              mainWindow.webContents.send('load-rom-file', { base64, fileName });
            }
          }
        },
        {
          label: '📁 Trocar pasta da Biblioteca...',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              title: 'Selecionar pasta de ROMs',
              properties: ['openDirectory']
            });
            if (!result.canceled && result.filePaths.length > 0) {
              const folderPath = result.filePaths[0];
              const config = loadConfig();
              config.romFolder = folderPath;
              saveConfig(config);
              const roms = scanRomFolder(folderPath);
              mainWindow.webContents.send('rom-library-loaded', { folderPath, roms });
            }
          }
        },
        { type: 'separator' },
        {
          label: '💾 Salvar Estado (Slot 1)',
          accelerator: 'F5',
          click: () => mainWindow.webContents.send('menu-action', 'save-state-1')
        },
        {
          label: '📥 Carregar Estado (Slot 1)',
          accelerator: 'F7',
          click: () => mainWindow.webContents.send('menu-action', 'load-state-1')
        },
        { type: 'separator' },
        {
          label: 'Sair',
          accelerator: 'Alt+F4',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Emulador',
      submenu: [
        {
          label: '⏸ Pausar / Continuar',
          accelerator: 'Space',
          click: () => mainWindow.webContents.send('menu-action', 'toggle-pause')
        },
        {
          label: '🔄 Reiniciar',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow.webContents.send('menu-action', 'reset')
        },
        { type: 'separator' },
        {
          label: 'Velocidade',
          submenu: [
            { label: '0.5x', click: () => mainWindow.webContents.send('menu-action', 'speed-0.5') },
            { label: '1x (Normal)', click: () => mainWindow.webContents.send('menu-action', 'speed-1') },
            { label: '2x', click: () => mainWindow.webContents.send('menu-action', 'speed-2') },
            { label: '4x', click: () => mainWindow.webContents.send('menu-action', 'speed-4') },
          ]
        },
        { type: 'separator' },
        {
          label: '🔇 Mudo',
          accelerator: 'CmdOrCtrl+M',
          click: () => mainWindow.webContents.send('menu-action', 'toggle-mute')
        }
      ]
    },
    {
      label: 'Vídeo',
      submenu: [
        {
          label: '⛶ Tela Cheia',
          accelerator: 'F11',
          click: () => {
            const isFS = mainWindow.isFullScreen();
            mainWindow.setFullScreen(!isFS);
            mainWindow.webContents.send('menu-action', isFS ? 'exit-fullscreen' : 'enter-fullscreen');
          }
        },
        { type: 'separator' },
        {
          label: 'Captura de Tela',
          accelerator: 'F12',
          click: () => mainWindow.webContents.send('menu-action', 'screenshot')
        }
      ]
    },
    {
      label: 'Configurações',
      submenu: [
        {
          label: '⚙️ Abrir Configurações',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow.webContents.send('menu-action', 'open-settings')
        }
      ]
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Atalhos de Teclado',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Atalhos de Teclado',
              message: 'Atalhos Padrão GBA',
              detail: [
                'D-Pad:      Setas ←↑→↓',
                'Botão A:    Z',
                'Botão B:    X',
                'L:          A',
                'R:          S',
                'Start:      Enter',
                'Select:     Backspace',
                '',
                'Emulador:',
                'Pausar:     Espaço',
                'Tela Cheia: F11',
                'Save State: F5',
                'Load State: F7',
                'Screenshot: F12',
                'Abrir ROM:  Ctrl+O',
              ].join('\n'),
              buttons: ['OK']
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Sobre',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Sobre GBA Emulator Ultimate',
              message: 'GBA Emulator Ultimate',
              detail: 'Versão 1.0.0\n\nEmulador Game Boy Advance completo.\nSuporta ROMs .gba, .gbc e .gb\n\nPowered by Electron',
              icon: path.join(__dirname, 'assets', 'icon.ico'),
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Abrir diálogo de arquivo único (botão "Abrir ROM" da toolbar)
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
  return {
    base64: fileData.toString('base64'),
    fileName: path.basename(filePath)
  };
});

// Pedir pasta de biblioteca (primeira vez OU "trocar pasta")
ipcMain.handle('choose-rom-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecionar pasta de ROMs',
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const folderPath = result.filePaths[0];
  const config = loadConfig();
  config.romFolder = folderPath;
  saveConfig(config);

  return { folderPath, roms: scanRomFolder(folderPath) };
});

// Obter a pasta já salva (e os jogos dela) sem perguntar nada
ipcMain.handle('get-saved-rom-folder', async () => {
  const config = loadConfig();
  if (!config.romFolder) return null;

  // Verifica se a pasta ainda existe (pode ter sido movida/apagada)
  if (!fs.existsSync(config.romFolder)) return null;

  return { folderPath: config.romFolder, roms: scanRomFolder(config.romFolder) };
});

// Buscar (ou pegar do cache) a capa de um jogo
ipcMain.handle('get-game-cover', async (event, romName) => {
  return await fetchCoverForGame(romName);
});

// Ler o conteúdo de um arquivo de ROM específico (para tocar)
ipcMain.handle('read-rom-file', async (event, fullPath) => {
  try {
    const fileData = fs.readFileSync(fullPath);
    return {
      base64: fileData.toString('base64'),
      fileName: path.basename(fullPath)
    };
  } catch (e) {
    return null;
  }
});

// Salvar screenshot em disco
ipcMain.handle('save-screenshot', async (event, { dataUrl, romName }) => {
  const downloadsPath = app.getPath('pictures');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultName = `GBA_${romName || 'screenshot'}_${timestamp}.png`;

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Salvar Screenshot',
    defaultPath: path.join(downloadsPath, defaultName),
    filters: [{ name: 'PNG', extensions: ['png'] }]
  });

  if (result.canceled) return false;

  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(result.filePath, base64Data, 'base64');
  return true;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
