const { app, BrowserWindow, ipcMain, globalShortcut, clipboard, Menu } = require('electron')

let launcherWindow
let examWindow

// Matikan Hardware Acceleration agar tidak ngelag saat forcing focus
app.disableHardwareAcceleration()

// 1. Jendela Launcher (Input URL)
function createLauncher() {
  launcherWindow = new BrowserWindow({
    width: 450,
    height: 500,
    resizable: false,
    autoHideMenuBar: true,
    frame: true,
    icon: __dirname + '/icon.ico',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  launcherWindow.loadFile('index.html')
  
  // Hapus menu default
  Menu.setApplicationMenu(null)
}

// 2. Jendela Ujian (SECURITY KETAT)
function createExamWindow(targetUrl) {
  if (launcherWindow) launcherWindow.close();

  examWindow = new BrowserWindow({
    fullscreen: true,       
    kiosk: true,            // Mode Kiosk
    frame: false,           
    alwaysOnTop: true,      // PAKSA SELALU DI ATAS
    closable: false,        // Tidak bisa di-close user
    minimizable: false,     // Tidak bisa di-minimize
    icon: __dirname + '/icon.ico',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
      // Preload script jika perlu (opsional)
    }
  })

  // Set level "Screen Saver" agar menimpa Taskbar dan aplikasi lain
  examWindow.setAlwaysOnTop(true, 'screen-saver')

  examWindow.loadURL(targetUrl)

  // --- FITUR SECURITY BARU (LEBIH KEJAM) ---

  // A. ANTI-TAB & ANTI-MINIMIZE (Logic: "Jendela Posesif")
  // Jika jendela kehilangan fokus (karena Alt+Tab), paksa ambil fokus lagi!
  examWindow.on('blur', () => {
    // Cek apakah window masih ada
    if (!examWindow) return
    
    // Hapus clipboard sebagai hukuman
    clipboard.clear()
    
    // Paksa fokus kembali (hampir instan)
    setTimeout(() => {
        if(examWindow) {
            examWindow.restore()
            examWindow.focus()
            examWindow.setAlwaysOnTop(true, 'screen-saver')
        }
    }, 100) 
  })

  // B. BLOKIR KEYBOARD DARI DALAM (Intercept Input)
  // Ini menangkap tombol SEBELUM website memprosesnya. Lebih ampuh dari globalShortcut.
  examWindow.webContents.on('before-input-event', (event, input) => {
    // Blokir Tombol F1 - F12
    if (input.key.startsWith('F') && input.type === 'keyDown') {
        event.preventDefault()
        return
    }

    // Blokir Kombinasi Tombol CTRL / ALT
    if (input.control || input.alt || input.meta) {
        // Daftar tombol yang dilarang dikombinasikan dengan Ctrl/Alt
        const forbiddenKeys = ['c', 'v', 'x', 'a', 'p', 's', 'u', 'Tab', 'Escape', 'ArrowLeft', 'ArrowRight'];
        
        if (forbiddenKeys.includes(input.key)) {
            event.preventDefault() // BATALKAN AKSINYA
        }
    }
  })

  // C. Blokir Klik Kanan
  examWindow.webContents.on('context-menu', (e) => e.preventDefault())

  // D. Blokir Navigasi (Mencegah buka link ke window baru)
  examWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })

  // E. RAHASIA KELUAR: Ctrl + Q (Gunakan Global Shortcut untuk ini)
  globalShortcut.register('CommandOrControl+Q', () => {
    // Matikan proteksi sebelum keluar agar tidak error
    if (examWindow) {
        examWindow.setAlwaysOnTop(false)
        examWindow = null
    }
    app.quit()
  })
}

app.whenReady().then(() => {
  createLauncher()
  
  ipcMain.on('start-exam-mode', (event, url) => {
    createExamWindow(url)
  })
})

// Mencegah aplikasi keluar sendiri
app.on('window-all-closed', (e) => {
  e.preventDefault() 
})
