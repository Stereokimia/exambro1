const { app, BrowserWindow, ipcMain, Menu, clipboard } = require('electron')

let launcherWindow
let examWindow
let focusInterval
let isPunished = false // Status apakah sedang dihukum

app.disableHardwareAcceleration()

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

  // --- LOGIKA HUKUMAN (SUNTIKAN SCRIPT) ---
  // Script ini akan dijalankan di browser siswa saat melanggar
  const scriptHukuman = `
    (function() {
        if(document.getElementById('hukuman-overlay')) return; // Jangan double

        // 1. Buat Layar Penutup
        const div = document.createElement('div');
        div.id = 'hukuman-overlay';
        div.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:2147483647; display:flex; flex-direction:column; justify-content:center; align-items:center; color:white; font-family:sans-serif; text-align:center;';
        
        // 2. Isi Pesan
        div.innerHTML = '<h1 style="font-size:50px; color:#ff4444; margin-bottom:10px;">⚠️ PELANGGARAN! ⚠️</h1><h2 style="margin-bottom:20px;">Anda terdeteksi meninggalkan ujian.</h2><h3>Sistem terkunci selama <span id="hukuman-timer" style="font-size:40px; color:yellow;">60</span> detik.</h3><p>Jangan coba-coba keluar lagi.</p>';
        
        document.body.appendChild(div);

        // 3. Efek Blur pada Soal (di belakang overlay)
        document.body.style.filter = 'blur(10px)';

        // 4. Hitung Mundur
        let sisa = 60;
        const timerElem = document.getElementById('hukuman-timer');
        const interval = setInterval(() => {
            sisa--;
            if(timerElem) timerElem.innerText = sisa;
            
            if(sisa <= 0) {
                clearInterval(interval);
                div.remove(); // Hapus overlay
                document.body.style.filter = 'none'; // Hapus blur
            }
        }, 1000);
    })();
  `

  // --- SECURITY EVENT ---

  // A. Trigger Hukuman saat Blur (Alt+Tab / Klik App Lain)
  examWindow.on('blur', () => {
    if (!examWindow || isPunished) return; // Jika sudah dihukum, jangan tumpuk

    console.log("Pelanggaran terdeteksi!");
    
    // 1. Set Status Dihukum
    isPunished = true;
    clipboard.clear(); // Kosongkan clipboard

    // 2. Suntikkan Script Hukuman ke Layar
    examWindow.webContents.executeJavaScript(scriptHukuman);

    // 3. Reset Status Hukuman setelah 60 detik (Sesuai timer di script)
    setTimeout(() => {
        isPunished = false;
    }, 61000); 

    // 4. Tetap paksa fokus kembali (Biar dia nontonin timer hukuman)
    setTimeout(() => {
        if(examWindow) {
            examWindow.restore();
            examWindow.focus();
        }
    }, 100);
  });


  // B. KEYBOARD INTERCEPT (Ctrl+Q tetap jalan buat emergency)
  examWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key.toLowerCase() === 'q' && (input.control || input.meta)) {
      event.preventDefault();
      app.quit();
      return;
    }

    if (input.key.startsWith('F') || input.alt || input.meta) {
       event.preventDefault();
    }
  });

  // C. LOOPING PENJAGA (Tetap jalan untuk memastikan layar tidak diminimize)
  focusInterval = setInterval(() => {
    if (examWindow && !examWindow.isDestroyed()) {
      if (!examWindow.isFocused()) {
        examWindow.show();
        examWindow.focus();
        examWindow.setAlwaysOnTop(true, 'screen-saver');
      }
    }
  }, 100); 

  // D. Blokir Navigasi
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
