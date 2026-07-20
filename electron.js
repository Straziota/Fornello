const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

app.setName('Fornello');

const PORT = 3001; // Use 3001 to avoid conflict with any running dev server
let mainWindow;
let serverProcess;

function waitForServer(callback, attempts = 0) {
  if (attempts > 60) { callback(new Error('Server failed to start')); return; }
  const socket = net.connect(PORT, '127.0.0.1', () => {
    socket.destroy();
    callback(null);
  });
  socket.on('error', () => setTimeout(() => waitForServer(callback, attempts + 1), 500));
}

function findNode() {
  // Try common Node.js install locations on macOS
  const candidates = [
    '/usr/local/bin/node',
    '/opt/homebrew/bin/node',
    '/usr/bin/node',
  ];
  const { execSync } = require('child_process');
  try {
    return execSync('which node', { env: { PATH: '/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin' } })
      .toString().trim();
  } catch {}
  return candidates.find(p => require('fs').existsSync(p)) || 'node';
}

function startNextServer() {
  const appDir = __dirname;
  const nodePath = findNode();
  const nextScript = path.join(appDir, 'node_modules', 'next', 'dist', 'bin', 'next');

  serverProcess = spawn(nodePath, [nextScript, 'start', '-p', String(PORT)], {
    cwd: appDir,
    stdio: 'pipe',
    env: { ...process.env, NODE_ENV: 'production', PATH: process.env.PATH + ':/usr/local/bin:/opt/homebrew/bin' },
  });
  serverProcess.stdout.on('data', d => console.log('[next]', d.toString()));
  serverProcess.stderr.on('data', d => console.error('[next]', d.toString()));
  serverProcess.on('error', e => console.error('Failed to start server:', e));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    title: 'Fornello',
    backgroundColor: '#F7F4EE',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'public', 'icon.icns'),
    show: false,
  });

  // Show a loading page immediately, then navigate to the app
  mainWindow.loadURL('data:text/html,<html style="background:#F7F4EE;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:Georgia,serif"><p style="color:#556257;font-size:18px;font-style:italic">Starting Fornello…</p></html>');
  mainWindow.once('ready-to-show', () => mainWindow.show());

  waitForServer(err => {
    if (err) { console.error('Server error:', err); return; }
    mainWindow && mainWindow.loadURL(`http://localhost:${PORT}`);
  });

  // Open external links in the default browser, not Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// Handle .fornello files opened from Finder
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (!filePath.endsWith('.fornello')) return;
  try {
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const recipe = data.fornello ? data.data : data;
    // Wait for server to be ready then import
    waitForServer(() => {
      const http = require('http');
      const body = JSON.stringify(recipe);
      const req = http.request(
        { hostname: '127.0.0.1', port: PORT, path: '/api/import', method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
        res => {
          if (mainWindow) {
            mainWindow.loadURL(`http://localhost:${PORT}/recipes`);
            mainWindow.focus();
          }
        }
      );
      req.write(body);
      req.end();
    });
  } catch (e) { console.error('Failed to import .fornello file:', e); }
});

app.whenReady().then(() => {
  // Kill anything already on our port before starting
  try {
    const { execSync } = require('child_process');
    execSync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true`, { shell: true });
  } catch {}
  startNextServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  app.quit();
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
});
