async function exportAllSaves() {
  const saves = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('gba_save_')) {
      saves.push({ key, data: localStorage.getItem(key) });
    }
  }

  const exportData = JSON.stringify(saves, null, 2);
  const defaultName = `gba_saves_backup_${Date.now()}.json`;

  // Modo Electron: salva direto em Documentos
  if (window.electronAPI && window.electronAPI.saveSavesBackup) {
    const res = await window.electronAPI.saveSavesBackup(exportData, defaultName);
    if (res && res.ok) {
      toast('📦 Saves exportados em: ' + res.path);
    } else {
      toast('❌ Erro ao exportar: ' + (res && res.error));
    }
    return;
  }

  // Modo navegador: download tradicional
  const blob = new Blob([exportData], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = defaultName;
  a.click();
  toast('📦 Saves exportados!');
}
