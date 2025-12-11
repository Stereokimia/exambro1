const { app, BrowserWindow, ipcMain, globalShortcut, Menu, session } = require('electron')

let launcherWindow
let examWindow

// 1. Buat Jendela Launcher (Kecil)
function createLauncher() {
  launcherWindow = new BrowserWindow({
    width: 400,
    height: 500,
    resizable: false,
    autoHideMenuBar: true,
    frame: true, // Ada bingkai buat close kalau belum mulai
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  launcherWindow.loadFile('index.html')
}

// 2. Buat Jendela Ujian (Secure Mode)
function createExamWindow(examUrl) {
  // Tutup launcher dulu
  if (launcherWindow) launcherWindow.close();

  examWindow = new BrowserWindow({
    fullscreen: true,       // Layar Penuh
    kiosk: true,            // Mode Kiosk (Menutup taskbar Windows)
    alwaysOnTop: true,      // Selalu di paling atas
    closable: false,        // Tidak bisa di-close user (kecuali Alt+F4 diblok)
    movable: false,
    minimizable: false,
    autoHideMenuBar: true,  // Hilangkan menu
    webPreferences: {
      nodeIntegration: false, // Security: Web luar ga bisa akses sistem
      contextIsolation: true,
      devTools: false         // Matikan Inspect Element
    }
  })

  // Load URL Ujian
  examWindow.loadURL(examUrl)

  // --- FITUR KEAMANAN EKSTRA ---

  // A. Blokir Menu Klik Kanan
  examWindow.webContents.on('context-menu', (e) => {
    e.preventDefault()
  })

  // B. Blokir Tombol Keyboard (Alt+Tab, F12, dll)
  // Catatan: Alt+Tab level OS susah diblok total tanpa C++, tapi Kiosk mode menutup taskbar.
  globalShortcut.register('Alt+Tab', () => { return false }) 
  globalShortcut.register('Alt+F4', () => { return false }) 
  globalShortcut.register('CommandOrControl+C', () => { return false }) // Copy
  globalShortcut.register('CommandOrControl+V', () => { return false }) // Paste
  globalShortcut.register('F11', () => { return false })
  globalShortcut.register('F5', () => { return false }) // Refresh (Opsional)
  globalShortcut.register('F12', () => { return false }) // DevTools

  // C. Hapus Clipboard (Agar tidak bisa paste jawaban dari luar)
  const { clipboard } = require('electron')
  clipboard.clear()
  setInterval(() => {
     clipboard.clear()
  }, 1000)

  // D. Cegah membuka Tab Baru / Popup
  examWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })

  // E. Inject CSS untuk mencegah seleksi teks (di dalam website target)
  examWindow.webContents.on('did-finish-load', () => {
    examWindow.webContents.insertCSS(`
      * { 
        user-select: none !important; 
        -webkit-user-select: none !important; 
        -webkit-touch-callout: none !important; 
      }
    `)
  })
}

// --- LOGIKA APLIKASI ---

app.whenReady().then(() => {
  createLauncher()

  // Terima perintah dari index.html
  ipcMain.on('start-exam-mode', (event, url) => {
    createExamWindow(url)
  })
})

// Matikan shortcut saat aplikasi keluar
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
