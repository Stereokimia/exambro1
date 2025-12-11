const { app, BrowserWindow, ipcMain, globalShortcut, clipboard } = require('electron')

let launcherWindow
let examWindow

// --- 1. JENDELA LAUNCHER (INPUT URL) ---
function createLauncher() {
  launcherWindow = new BrowserWindow({
    width: 400,
    height: 450,
    resizable: false,
    autoHideMenuBar: true,
    frame: true,
    icon: __dirname + '/icon.ico', // Memuat Icon Aplikasi
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  launcherWindow.loadFile('index.html')
}

// --- 2. JENDELA UJIAN (MODE RINGAN) ---
function createExamWindow(targetUrl) {
  // Tutup launcher agar hemat RAM
  if (launcherWindow) launcherWindow.close();

  examWindow = new BrowserWindow({
    fullscreen: true,
    kiosk: true,            // Mode Kiosk (Menutup taskbar)
    frame: false,           // Hilangkan bingkai Windows
    autoHideMenuBar: true,
    icon: __dirname + '/icon.ico',
    webPreferences: {
      nodeIntegration: false, // Security: Web luar tidak bisa akses sistem
      contextIsolation: true,
      devTools: false         // Matikan Inspect Element
    }
  })

  examWindow.loadURL(targetUrl)

  // --- KEAMANAN EFISIEN (HEMAT CPU) ---

  // A. Hapus Clipboard HANYA saat jendela kehilangan fokus
  // (Saat siswa Alt+Tab atau klik aplikasi lain, clipboard otomatis kosong)
  examWindow.on('blur', () => {
    clipboard.clear()
  })
  
  // B. Hapus juga saat kembali fokus
  examWindow.on('focus', () => {
    clipboard.clear()
  })

  // C. Blokir Klik Kanan
  examWindow.webContents.on('context-menu', (e) => e.preventDefault())

  // D. Blokir Tombol Keyboard Fatal (Alt+Tab, F12, dll)
  globalShortcut.register('Alt+Tab', () => { return false }) 
  globalShortcut.register('Alt+F4', () => { return false }) 
  globalShortcut.register('F11', () => { return false })
  globalShortcut.register('F5', () => { return false }) 
  globalShortcut.register('F12', () => { return false }) 
  globalShortcut.register('CommandOrControl+R', () => { return false }) // Reload

  // E. RAHASIA KELUAR: Tekan Ctrl + Q
  globalShortcut.register('CommandOrControl+Q', () => {
    app.quit()
  })
}

// --- LOGIKA UTAMA ---

app.whenReady().then(() => {
  createLauncher()

  // Menerima URL dari index.html
  ipcMain.on('start-exam-mode', (event, url) => {
    createExamWindow(url)
  })
})

// Bersihkan memori saat keluar
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
