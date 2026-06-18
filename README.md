# GBA Emulator Ultimate — App Windows Nativo

Emulador GBA completo empacotado como aplicativo nativo para Windows (.exe) usando Electron.

---

## Pré-requisitos

- **Node.js** 18+ → https://nodejs.org
- **npm** (vem junto com o Node.js)
- Windows 10 ou superior para executar o app gerado

---

## Como compilar o .exe

### 1. Instalar as dependências

Abra o terminal nesta pasta e execute:

```bash
npm install
```

### 2. Testar antes de compilar (opcional)

```bash
npm start
```

Isso abre o app direto, sem precisar compilar.

### 3. Gerar o instalador .exe

```bash
npm run build
```

Os arquivos gerados ficam na pasta `dist/`:

| Arquivo | Descrição |
|---------|-----------|
| `GBA Emulator Ultimate Setup 1.0.0.exe` | Instalador com wizard (recomendado) |
| `GBA Emulator Ultimate 1.0.0.exe` | Executável portátil (roda sem instalar) |

---

## Funcionalidades nativas adicionadas

Além de tudo que o site já tinha, o app Windows inclui:

- **Menu nativo do Windows** (Arquivo, Emulador, Vídeo, Configurações, Ajuda)
- **Diálogo nativo de abrir arquivo** ao clicar em "Abrir ROM" — usa o Explorer do Windows
- **Diálogo nativo de salvar screenshot** — salva direto em Imagens
- **Atalho Ctrl+O** para abrir ROM pelo menu
- **F11** para tela cheia nativa da janela
- **Atalhos de teclado** acessíveis via menu Ajuda
- **Ícone na barra de tarefas e no Desktop**
- **Instalador com opção de atalho no Desktop**

---

## Estrutura do projeto

```
gba-emulator-windows/
├── main.js          # Processo principal do Electron (janela, menu, IPC)
├── preload.js       # Bridge segura entre Electron e a página HTML
├── package.json     # Configuração do projeto e do build
├── assets/
│   └── icon.ico     # Ícone do aplicativo
└── src/
    └── index.html   # O emulador GBA (seu arquivo original adaptado)
```

---

## Controles padrão

| GBA        | Teclado   |
|------------|-----------|
| A          | Z         |
| B          | X         |
| L          | A         |
| R          | S         |
| Start      | Enter     |
| Select     | Backspace |
| D-Pad      | Setas     |
| Pausar     | Espaço    |
| Screenshot | F12       |
| Save State | F5        |
| Load State | F7        |
| Tela cheia | F11       |
