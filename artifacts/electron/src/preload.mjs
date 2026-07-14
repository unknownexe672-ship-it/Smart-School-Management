/**
 * Electron preload script — runs in an isolated context before the renderer.
 * contextBridge exposes safe APIs to the renderer without enabling full Node.
 */
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  /** Returns the API port chosen by the main process */
  getApiPort: () => ipcRenderer.sendSync('get-api-port'),

  /** True when running inside Electron desktop app */
  isElectron: true,

  /** Platform identifier */
  platform: process.platform,
});
