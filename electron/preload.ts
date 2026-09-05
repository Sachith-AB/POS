import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronApp', {
  version: '1.0.0',
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  checkForUpdates: () => ipcRenderer.invoke('app:check-for-updates'),
  restartApp: () => ipcRenderer.invoke('app:restart'),
  setWindowIcon: (logoUrl: string) => ipcRenderer.invoke('app:set-window-icon', logoUrl),
});
