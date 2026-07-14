/**
 * SmartSchool – Electron Main Process
 *
 * Responsibilities:
 *  1. Load database config from config.env (resources or userData)
 *  2. Check internet / database reachability → set DEMO_MODE if unreachable
 *  3. Dynamically import the bundled API server (Express + tRPC) so it starts
 *     listening inside this same Node.js process (no child process / no terminal)
 *  4. Register the custom app:// protocol to serve frontend static files
 *  5. Open a maximised BrowserWindow — user sees only the app, no localhost
 */

import { app, BrowserWindow, protocol, net, ipcMain, dialog } from 'electron';
import { existsSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

// ─── Resolve __dirname in ESM ─────────────────────────────────────────────────
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const isDev = !app.isPackaged;

// ─── Resource Paths ────────────────────────────────────────────────────────────
// In a packaged app, extra resources land in process.resourcesPath.
// In dev (electron .), we look next to the electron package.
const resourcesDir = isDev
  ? join(__dirname, '..', 'resources')
  : process.resourcesPath;

const apiServerPath  = join(resourcesDir, 'api-server', 'dist', 'index.mjs');
const frontendDir    = join(resourcesDir, 'frontend');

// Fixed internal port — users never see this number
const API_PORT = 58_423;

// ─── MIME map for app:// static serving ───────────────────────────────────────
const MIME = {
  '.html' : 'text/html; charset=utf-8',
  '.js'   : 'text/javascript',
  '.mjs'  : 'text/javascript',
  '.cjs'  : 'text/javascript',
  '.css'  : 'text/css',
  '.json' : 'application/json',
  '.svg'  : 'image/svg+xml',
  '.png'  : 'image/png',
  '.jpg'  : 'image/jpeg',
  '.jpeg' : 'image/jpeg',
  '.gif'  : 'image/gif',
  '.webp' : 'image/webp',
  '.ico'  : 'image/x-icon',
  '.woff' : 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf'  : 'font/ttf',
  '.eot'  : 'application/vnd.ms-fontobject',
  '.mp4'  : 'video/mp4',
};

// ─── Config Loading ────────────────────────────────────────────────────────────
/**
 * Parse a simple KEY=VALUE env file, returning a key→value map.
 * Lines starting with # are ignored. Handles quoted values.
 */
function parseEnvFile(filePath) {
  const out = {};
  const content = readFileSync(filePath, 'utf-8');
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx < 1) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    // Strip surrounding quotes if present
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function loadConfig() {
  const config = {};

  // Priority 1: resources/config.env (bundled with the app — set at build time)
  const bundledConfig = join(resourcesDir, 'config.env');
  if (existsSync(bundledConfig)) {
    Object.assign(config, parseEnvFile(bundledConfig));
  }

  // Priority 2: userData/config.env (user-editable, overrides bundled values)
  const userConfig = join(app.getPath('userData'), 'config.env');
  if (existsSync(userConfig)) {
    Object.assign(config, parseEnvFile(userConfig));
  }

  // Priority 3: system environment variables (development / CI)
  if (process.env.DATABASE_URL)    config.DATABASE_URL    = process.env.DATABASE_URL;
  if (process.env.DEEPSEEK_API_KEY) config.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
  if (process.env.SESSION_SECRET)  config.SESSION_SECRET  = process.env.SESSION_SECRET;

  return config;
}

// ─── Internet / DB Reachability Check ─────────────────────────────────────────
/**
 * Quick TCP-level connectivity probe.
 * Parses the host from a postgres:// URL and attempts a 4-second connection.
 * Falls back to a general internet check if URL is malformed.
 */
async function isDatabaseReachable(databaseUrl) {
  if (!databaseUrl) return false;
  try {
    const url = new URL(databaseUrl);
    const host = url.hostname;
    const port = parseInt(url.port || '5432', 10);

    return await new Promise((resolve) => {
      import('node:net').then(({ createConnection }) => {
        const sock = createConnection({ host, port, timeout: 4000 });
        sock.once('connect', () => { sock.destroy(); resolve(true); });
        sock.once('error',   () => { sock.destroy(); resolve(false); });
        sock.once('timeout', () => { sock.destroy(); resolve(false); });
      }).catch(() => resolve(false));
    });
  } catch {
    return false;
  }
}

// ─── Register Privileged Scheme (must happen before app is ready) ──────────────
protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: {
    standard       : true,
    secure         : true,
    supportFetchAPI: true,
    corsEnabled    : true,
    stream         : true,
  },
}]);

// ─── API Server Startup ────────────────────────────────────────────────────────
/**
 * Import the pre-built API server bundle into this process.
 * The server reads process.env at import time, so we set all env vars first.
 */
async function startApiServer(config, demoMode) {
  // Set every env var the server needs before importing it
  process.env.PORT            = String(API_PORT);
  process.env.NODE_ENV        = 'production';
  process.env.DATABASE_URL    = config.DATABASE_URL || 'postgres://demo:demo@localhost/nodb';
  process.env.DEMO_MODE       = demoMode ? 'true' : 'false';
  process.env.SESSION_SECRET  = config.SESSION_SECRET || 'electron-fallback-secret-change-me';
  process.env.DEEPSEEK_API_KEY = config.DEEPSEEK_API_KEY || '';

  if (!existsSync(apiServerPath)) {
    console.error(`[Electron] API bundle not found at: ${apiServerPath}`);
    console.error('[Electron] Run the build script first: scripts/build-windows.sh');
    return false;
  }

  try {
    // Dynamic import executes the module — Express starts listening on API_PORT
    await import(pathToFileURL(apiServerPath).toString());
    console.log(`[Electron] API server running on port ${API_PORT} (demoMode=${demoMode})`);
    return true;
  } catch (err) {
    console.error('[Electron] API server failed to start:', err);
    return false;
  }
}

// ─── BrowserWindow ─────────────────────────────────────────────────────────────
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width         : 1440,
    height        : 900,
    minWidth      : 1024,
    minHeight     : 700,
    title         : 'SmartSchool – SMK Bangsar',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload          : join(__dirname, 'preload.mjs'),
      contextIsolation : true,
      nodeIntegration  : false,
      sandbox          : false,
    },
    // Hide until content is ready to avoid white flash
    show: false,
  });

  // Load the app via the custom app:// protocol (no localhost visible)
  mainWindow.loadURL('app://school-app/');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  // Open any target="_blank" links in the system browser, not a new Electron window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    import('electron').then(({ shell }) => shell.openExternal(url));
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── app:// Protocol Handler ───────────────────────────────────────────────────
/**
 * Serves the Vite-built frontend from the app:// origin.
 * Unknown paths fall back to index.html so the SPA router works correctly.
 */
function registerAppProtocol() {
  protocol.handle('app', async (request) => {
    const url  = new URL(request.url);
    // Strip leading slash; normalise path separators
    const rel  = decodeURIComponent(url.pathname).replace(/^\/+/, '').replace(/\//g, '/');
    let   file = join(frontendDir, rel || 'index.html');

    // Resolve file: if it doesn't exist or is a directory → serve index.html (SPA)
    if (!existsSync(file) || !extname(file)) {
      file = join(frontendDir, 'index.html');
    }

    const mimeType = MIME[extname(file).toLowerCase()] || 'application/octet-stream';

    // Delegate actual file I/O to net.fetch with a file:// URL
    const fileUrl = pathToFileURL(file).toString();
    const res     = await net.fetch(fileUrl);

    // Clone response to set correct Content-Type header
    const body    = await res.arrayBuffer();
    return new Response(body, {
      status : res.status,
      headers: { 'Content-Type': mimeType },
    });
  });
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
function registerIpc() {
  // Renderer can ask for the API port (used by preload → VITE_API_URL fallback)
  ipcMain.on('get-api-port', (event) => {
    event.returnValue = API_PORT;
  });
}

// ─── App Lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // 1. Load config from disk / environment
  const config = loadConfig();

  // 2. Probe database reachability → decide demo mode
  console.log('[Electron] Checking database connectivity…');
  const dbReachable = await isDatabaseReachable(config.DATABASE_URL);
  const demoMode    = !dbReachable;

  if (demoMode) {
    console.log('[Electron] Database unreachable → starting in Demo Mode');
  } else {
    console.log('[Electron] Database reachable → starting in Live Mode');
  }

  // 3. Start the API server (imports the Express bundle into this process)
  const apiStarted = await startApiServer(config, demoMode);
  if (!apiStarted) {
    dialog.showErrorBox(
      'SmartSchool – Startup Error',
      'The API server bundle was not found.\n\n' +
      'Please run the build script before launching:\n' +
      '  scripts/build-windows.sh\n\n' +
      'The application will now close.'
    );
    app.quit();
    return;
  }

  // 4. Register app:// protocol for static frontend files
  registerAppProtocol();

  // 5. Register IPC handlers
  registerIpc();

  // 6. Create the main window
  createWindow();
});

// Quit when all windows are closed (standard Windows / Linux behaviour)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  // macOS: re-open window when dock icon is clicked and no windows are open
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Graceful shutdown: nothing special needed — the API server is in-process
app.on('before-quit', () => {
  console.log('[Electron] Shutting down…');
});
