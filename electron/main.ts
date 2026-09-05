import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'path';
import { fork, ChildProcess } from 'child_process';
import http from 'http';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;
let serverProcess: ChildProcess | null = null;

function isServerRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:4000/api/health', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureBackendServer() {
  if (isDev) {
    // In dev mode, wait for the concurrent dev:server (tsx watch) to start
    for (let i = 0; i < 10; i++) {
      if (await isServerRunning()) {
        console.log('[Main] Connected to dev backend server on http://localhost:4000');
        return;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    console.warn('[Main] Dev backend server not detected yet on http://localhost:4000');
    return;
  }

  // Set default environment variables for embedded production server
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://postgres:Qazwsx%40321@localhost:5432/pos_system?schema=public';
  }
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = '0f3f2e9c7a5b4d8e1c6a9b2d5e8f1a4c7b0d3e6f9a2c5b8d1e4f7a0c3b6d9e2f';
  }
  if (!process.env.PORT) {
    process.env.PORT = '4000';
  }

  // In production packaged mode
  const running = await isServerRunning();
  if (running) {
    console.log('[Main] Backend server is already running on http://localhost:4000');
    return;
  }

  console.log('[Main] Starting embedded backend server on port 4000...');
  try {
    // Import backend server directly inside Electron's Node runtime (has native .asar support)
    // @ts-ignore
    await import('../apps/server/dist/index.js');
    console.log('[Main] Embedded backend server started successfully on http://localhost:4000');
  } catch (err) {
    console.error('[Main] Failed to start embedded backend server:', err);
  }
}

function initAutoUpdater() {
  if (isDev) return;
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.checkForUpdatesAndNotify().catch((err: any) => {
      console.error('[AutoUpdater Error]', err);
    });
  } catch (err) {
    console.warn('[AutoUpdater initialization skipped]', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 720,
    title: 'K ZERO MOBILE POS v1.0.0',
    icon: path.join(__dirname, '../apps/web/public/favicon.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    autoHideMenuBar: true,
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../apps/web/dist/index.html'));
  }

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      const choice = dialog.showMessageBoxSync(mainWindow!, {
        type: 'question',
        buttons: ['Yes, Exit', 'Cancel'],
        defaultId: 1,
        cancelId: 1,
        title: 'Exit POS System',
        message: 'Are you sure you want to exit the POS system?',
        detail: 'Any active transactions or parked sales will remain saved.',
      });

      if (choice === 0) {
        isQuitting = true;
        app.quit();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Electron Application Lifecycle
app.whenReady().then(async () => {
  await ensureBackendServer();
  createWindow();
  initAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});

// IPC Handlers for Version & Controls
ipcMain.handle('app:get-version', () => {
  return app.getVersion();
});

ipcMain.handle('app:set-window-icon', async (_, logoUrl: string) => {
  if (!mainWindow || !logoUrl) return;
  try {
    const { nativeImage, net } = await import('electron');
    const fullUrl = logoUrl.startsWith('http') ? logoUrl : `http://localhost:4000${logoUrl}`;
    const response = await net.fetch(fullUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const img = nativeImage.createFromBuffer(buffer);
    if (img && !img.isEmpty()) {
      mainWindow.setIcon(img);
    }
  } catch (err) {
    console.error('[Electron Set Window Icon Error]', err);
  }
});

ipcMain.handle('app:check-for-updates', async () => {
  if (isDev) {
    return { status: 'dev', message: 'Auto-update check disabled in dev mode (v1.0.0-dev)' };
  }
  try {
    const { autoUpdater } = require('electron-updater');
    const result = await autoUpdater.checkForUpdates();
    return { status: 'success', updateInfo: result?.updateInfo };
  } catch (err: any) {
    return { status: 'error', message: err.message || 'Failed to check for updates' };
  }
});

ipcMain.handle('app:restart', () => {
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.quitAndInstall();
  } catch (err) {
    app.relaunch();
    app.exit(0);
  }
});
