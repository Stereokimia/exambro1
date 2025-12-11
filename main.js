const { app, BrowserWindow, ipcMain, Menu, clipboard } = require('electron')

let launcherWindow
let examWindow
let focusInterval
let isPunished = false 

app.disableHardwareAcceleration() // Biar ga berat/lag

// 1. LAUNCHER
function createLauncher() {
  launcherWindow = new BrowserWindow({
    width: 450,
    height: 500,
    resizable: false,
    autoHideMenuBar: true,
    frame: true,
    icon: __dirname + '/icon.ico',
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  })
  launcherWindow.loadFile('index.html')
  Menu.setApplicationMenu(null)
}

// 2. EXAM WINDOW
function createExamWindow(targetUrl) {
  if (launcherWindow) {
    launcherWindow.close()
    launcherWindow = null
  }

  examWindow = new BrowserWindow({
    fullscreen: true,
    kiosk: true,
    frame: false,
    alwaysOnTop: true,
    closable: false,
    minimizable: false,
    skipTaskbar: true,
    icon: __dirname + '/icon.ico',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
    }
  })

  examWindow.setAlwaysOnTop(true, 'screen-saver')
  examWindow.loadURL(targetUrl)

  // --- SCRIPT HUKUMAN (PERBAIKAN TAMPILAN) ---
  // Menggunakan 'backdrop-filter' agar teks tetap TAJAM
  const scriptHukuman = `
    (function() {
        if(document.getElementById('hukuman-overlay')) return; 

        const div = document.createElement('div');
        div.id = 'hukuman-overlay';
        
        // CSS PERBAIKAN:
        // backdrop-filter: blur(20px) -> Membuat background di belakangnya blur
        // background: rgba(...) -> Hitam transparan agar teks kontras
        div.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); z-index:2147483647; display:flex; flex-direction:column; justify-content:center; align-items:center; color:white; font-family:sans-serif; text-align:center;';
        
        div.innerHTML = '<h1 style="font-size:50px; color:#ff4444; margin-bottom:10px; text-shadow: 2px 2px 0 #000;">⚠️ PELANGGARAN! ⚠️</h1><h2 style="margin-bottom:20px; text-shadow: 1px 1px 0 #000;">Anda terdeteksi meninggalkan ujian.</h2><h3>Sistem terkunci selama <span id="hukuman-timer" style="font-size:50px; color:#ffff00; font-weight:bold;">60</span> detik.</h3><p>Jangan coba-coba keluar lagi.</p>';
        
        document.body.appendChild(div);

        // Tidak perlu nge-blur body lagi karena sudah pakai backdrop-filter

        // Hitung Mundur
        let sisa = 60;
        const timerElem = document.getElementById('hukuman-timer');
        const interval = setInterval(() => {
            sisa--;
            if(timerElem) timerElem.innerText = sisa;
            
            if(sisa <= 0) {
                clearInterval(interval);
                div.remove(); 
            }
        }, 1000);
    })();
  `

  // --- EVENT HANDLER ---

  // A. Trigger Hukuman saat Blur
  examWindow.on('blur', () => {
    if (!examWindow || isPunished) return;

    // HUKUMAN
    isPunished = true;
    clipboard.clear(); 
    examWindow.webContents.executeJavaScript(scriptHukuman);

    // Reset status setelah 60 detik
    setTimeout(() => { isPunished = false; }, 61000); 

    // Paksa Fokus Balik (Biar nonton hukuman)
    setTimeout(() => {
        if(examWindow) {
            examWindow.restore();
            examWindow.focus();
        }
    }, 100);
  });


  // B. KEYBOARD INTERCEPT (PERBAIKAN TOMBOL KELUAR F7)
  examWindow.webContents.on('before-input-event', (event, input) => {
    
    // 1. TOMBOL KELUAR: F7
    if (input.key === 'F7') {
        event.preventDefault();
        app.quit(); // Langsung Tutup Aplikasi
        return;
    }

    // 2. BLOKIR SEMUA TOMBOL F (F1-F12), KECUALI F7
    if (input.key.startsWith('F') && input.key !== 'F7') {
       event.preventDefault();
       return;
    }

    // 3. BLOKIR KOMBINASI (Alt, Ctrl, WinKey)
    if (input.alt || input.meta || input.control) {
        // Blokir copy, paste, tab, dll
        const forbidden = ['c', 'v', 'x', 'a', 'p', 's', 'w', 'r', 'Tab', 'Escape', 'ArrowLeft', 'ArrowRight', 'Delete', 'Backspace'];
        
        if (forbidden.includes(input.key) || input.alt || input.meta) {
           event.preventDefault();
        }
    }
  });

  // C. LOOPING PENJAGA
  focusInterval = setInterval(() => {
    if (examWindow && !examWindow.isDestroyed()) {
      if (!examWindow.isFocused()) {
        examWindow.show();
        examWindow.focus();
        examWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    }
  }, 100); 

  // D. Blokir Klik Kanan & Navigasi
  examWindow.webContents.on('context-menu', (e) => e.preventDefault());
  examWindow.webContents.setWindowOpenHandler(() => { return { action: 'deny' } });
}

// --- APP LIFECYCLE ---
app.whenReady().then(() => {
  createLauncher();
  ipcMain.on('start-exam-mode', (event, url) => {
    createExamWindow(url);
  });
});

app.on('will-quit', () => {
  if (focusInterval) clearInterval(focusInterval);
});

app.on('window-all-closed', () => {});
