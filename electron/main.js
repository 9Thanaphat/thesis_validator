import fs from 'fs';
import path from 'path';
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { fileURLToPath } from 'url';
import { spawn, exec } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ตัวแปรเก็บ Process ของ Python
let pythonProcess = null;

// --- 1. ตั้งค่า Storage ---
const storagePath = path.join(app.getPath('userData'), 'ManagedThesis');
if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
}

// --- 2. ฟังก์ชันจัดการ Python Backend (ฉบับแก้ Path ถาวร) ---
function startPythonBackend() {
    let exePath;

    // [FIX CRITICAL] เช็คจาก app.isPackaged โดยตรง ไม่สนว่า Vite จะตื่นหรือยัง
    // เพื่อป้องกันไม่ให้มันหลงไปหา path ใน node_modules
    if (!app.isPackaged) {
        // [DEV MODE] บังคับหาที่โฟลเดอร์ bin ในโปรเจกต์ (C:\...\thesis_validator\bin)
        exePath = path.join(app.getAppPath(), 'bin', 'thesis_backend.exe');
    } else {
        // [PROD MODE] หาใน resources (กรณี Build แล้ว)
        exePath = path.join(process.resourcesPath, 'bin', 'thesis_backend.exe');
    }
    
    const workingDir = path.dirname(exePath);

    console.log(`[System]: ------------------------------------------------`);
    console.log(`[System]: Backend Startup Check`);
    console.log(`[System]: Mode: ${!app.isPackaged ? 'DEVELOPMENT' : 'PRODUCTION'}`);
    console.log(`[System]: Target Executable: ${exePath}`);
    console.log(`[System]: ------------------------------------------------`);
    
    if (!fs.existsSync(exePath)) {
        console.error(`[CRITICAL ERROR]: Backend binary NOT FOUND at:`);
        console.error(`>> ${exePath}`);
        return;
    }

    try {
        pythonProcess = spawn(`"${exePath}"`, [], { 
            cwd: workingDir,
            env: { ...process.env },
            shell: true, 
            windowsHide: true 
        });

        pythonProcess.on('error', (err) => {
            console.error(`[System Error]: Failed to spawn process: ${err.message}`);
        });

        pythonProcess.stdout.on('data', (data) => console.log(`[Python]: ${data}`));
        pythonProcess.stderr.on('data', (data) => console.error(`[Python Error]: ${data}`));
        
        pythonProcess.on('close', (code) => {
            console.log(`[Python] exited with code ${code}`);
            pythonProcess = null;
        });

    } catch (error) {
        console.error(`[System]: Unexpected error during spawn: ${error.message}`);
    }
}

async function killPythonBackend() {
    try {
        console.log("[System]: Sending shutdown signal to Python...");
        await fetch('http://127.0.0.1:8002/shutdown', { method: 'POST' });
    } catch (e) {
    }

    if (pythonProcess) {
        if (process.platform === 'win32') {
            exec(`taskkill /pid ${pythonProcess.pid} /f /t`, (err) => {
            });
        } else {
            pythonProcess.kill();
        }
        pythonProcess = null;
    }
}

// --- 3. ฟังก์ชันสร้างหน้าต่าง ---
function createWindow() {
    const win = new BrowserWindow({
        width: 1400, 
        height: 900,
        title: "Thesis Validator",
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    // 1. ถ้ามี VITE_DEV_SERVER_URL ให้โหลดจาก URL (Dev Mode)
    if (process.env.VITE_DEV_SERVER_URL) {
        console.log("[System]: Development Mode - Loading from Vite...");
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
        
        // แถม: เปิด DevTools ให้อัตโนมัติเวลาแก้โค้ดจะได้เห็น Error
        win.webContents.openDevTools(); 
    } 
    // 2. ถ้าไม่มี URL แต่มีโฟลเดอร์ dist ให้โหลดไฟล์ (Production Mode)
    else {
        const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
        
        if (fs.existsSync(indexPath)) {
            console.log("[System]: Production Mode - Loading from dist...");
            win.loadFile(indexPath);
        } else {
            // 3. ถ้าพังทั้งคู่ ให้แจ้งเตือนแทนที่จะขึ้นหน้าขาวหรือ Error แปะหน้า
            console.error("[CRITICAL]: Cannot find Vite Server OR built files in 'dist'!");
            win.loadURL('data:text/html,<h1>Backend Ready but Frontend missing</h1><p>Please run <b>npm run dev</b> first.</p>');
        }
    }
}

// --- 4. IPC Handlers ---

ipcMain.handle('select-pdf-file', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('import-thesis', async (event, sourcePath) => {
    try {
        const fileName = path.basename(sourcePath);
        const timestamp = Date.now();
        const folderName = `${timestamp}_${fileName.replace('.pdf', '')}`;
        const projectPath = path.join(storagePath, folderName);

        if (!fs.existsSync(projectPath)) fs.mkdirSync(projectPath);
        
        const destPdfPath = path.join(projectPath, 'document.pdf');
        fs.copyFileSync(sourcePath, destPdfPath);

        const metaData = {
            id: timestamp,
            originalName: fileName,
            importDate: new Date().toISOString(),
            status: 'pending',
            folderName: folderName
        };
        fs.writeFileSync(path.join(projectPath, 'info.json'), JSON.stringify(metaData));

        return { success: true, project: metaData };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('get-projects', () => {
    try {
        if (!fs.existsSync(storagePath)) return [];
        const folders = fs.readdirSync(storagePath);
        
        return folders.map(folder => {
            const projectDir = path.join(storagePath, folder);
            const infoPath = path.join(projectDir, 'info.json');
            const resultPath = path.join(projectDir, 'document_result.json');

            if (fs.existsSync(infoPath)) {
                const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
                info.status = fs.existsSync(resultPath) ? 'checked' : 'pending';
                return info;
            }
            return null;
        }).filter(Boolean).sort((a, b) => b.id - a.id);
    } catch (err) {
        return [];
    }
});

ipcMain.handle('delete-project', (event, folderName) => {
    try {
        const targetDir = path.join(storagePath, folderName);
        if (fs.existsSync(targetDir)) {
            fs.rmSync(targetDir, { recursive: true, force: true });
            return { success: true };
        }
        return { success: false, error: "Project folder not found" };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('get-project-path', (event, folderName) => {
    return path.join(storagePath, folderName, 'document.pdf');
});

ipcMain.handle('get-check-result', async (e, folder) => {
    try {
        const p = path.join(storagePath, folder, 'document_result.json');
        if (fs.existsSync(p)) {
            return { success: true, data: JSON.parse(fs.readFileSync(p, 'utf8')) };
        }
        return { success: false, error: "Result data not found" };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('get-pdf-blob', async (e, folder) => {
    try {
        const p = path.join(storagePath, folder, 'document.pdf');
        return fs.existsSync(p) ? fs.readFileSync(p) : null;
    } catch (err) {
        return null;
    }
});

ipcMain.handle('test-check-pdf', async (event, filePath) => {
    try {
        const response = await fetch('http://127.0.0.1:8002/check_local_pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_path: filePath })
        });
        
        if (!response.ok) {
            const errText = await response.text();
            return { success: false, error: `Backend Error (500): ${errText}` };
        }
        return await response.json();
    } catch (error) {
        return { success: false, error: "Backend Connection Refused (8002)" };
    }
});

ipcMain.handle('check-backend-status', async () => {
    try {
        const response = await fetch('http://127.0.0.1:8002/'); 
        return { online: response.ok };
    } catch (error) {
        return { online: false };
    }
});

// --- 5. Lifecycle ---

app.whenReady().then(() => {
    startPythonBackend();
    createWindow();
});

// ปิด Backend เมื่อปิดแอป
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        killPythonBackend();
        app.quit();
    }
});