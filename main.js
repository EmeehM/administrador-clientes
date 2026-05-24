const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    title: 'SegurTrack - Control de Vencimientos',
    backgroundColor: '#090d16', // Color de fondo oscuro para evitar destello blanco al cargar
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  // Ocultar la barra de menú estándar de Electron para una interfaz de aplicación limpia y profesional
  win.removeMenu();

  // Cargar el index.html principal
  win.loadFile(path.join(__dirname, 'index.html'));

  // Manejar enlaces externos para que no abran ventanas secundarias extrañas en Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

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
