const { app, BrowserWindow } = require('electron')

function createWindow () {
  const win = new BrowserWindow({
    fullscreen: true,       // Paksa Fullscreen
    kiosk: true,            // Mode Kiosk (Susah keluar)
    autoHideMenuBar: true,  // Sembunyikan menu file/edit
    webPreferences: {
      nodeIntegration: false
    }
  })

  // GANTI LINK INI DENGAN LINK UJIANMU / GOOGLE FORM
  win.loadURL('https://forms.google.com/your-form-link')
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})