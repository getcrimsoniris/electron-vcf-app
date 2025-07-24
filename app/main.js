const { app, BrowserWindow } = require('electron');
const path = require('path');

const isDev = !app.isPackaged; // true when running with `npm run dev`

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:3000'); // Next.js dev server
  } else {
    win.loadFile(path.join(__dirname, 'out/index.html')); // Next.js static build
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
