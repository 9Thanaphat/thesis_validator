import fs from 'fs';
import path from 'path';
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { fileURLToPath } from 'url';
import { spawn, exec } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let pythonProcess = null;

// --- 1. ตั้งค่า Managed Storage ---
const storagePath = path.join(app.getPath('userData'), 'ManagedThesis');
if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
}

// --- 2. ฟังก์ชันจัดการ Python Backend ---
function startPythonBackend() {
    const exePath = path.join(__dirname, '../bin/thesis_backend.exe');
    const workingDir = path.dirname(exePath);

    console.log("Attempting to start backend at:", exePath);
    
    pythonProcess = spawn(exePath, [], { 
        cwd: workingDir,
        env: { ...process.env }
    });

    pythonProcess.stdout.on('data', (data) => console.log(`[Python]: ${data}`));
    pythonProcess.stderr.on('data', (data) => console.error(`[Python Error]: ${data}`));
    pythonProcess.on('close', (code) => console.log(`[Python] exited with code ${code}`));
}

function killPythonBackend() {
    if (pythonProcess) {
        if (process.platform === 'win32') {
            // ใช้ taskkill เพื่อปิด process tree ทั้งหมด (ป้องกันซอมบี้ process)
            exec(`taskkill /pid ${pythonProcess.pid} /f /t`, (err) => {
                if (err) pythonProcess.kill();
                console.log("Python Backend force killed");
            });
        } else {
            pythonProcess.kill();
        }
        pythonProcess = null;
    }
}

// --- 3. IPC Handlers สำหรับ Managed Library ---

// เลือกไฟล์ (Dashboard ใช้ selectFile หรือ select-pdf-file)
ipcMain.handle('select-pdf-file', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    if (result.canceled) return null;
    return result.filePaths[0];
});

// นำเข้าไฟล์มาเก็บใน AppData
ipcMain.handle('import-thesis', async (event, sourcePath) => {
    try {
        const fileName = path.basename(sourcePath);
        const timestamp = Date.now();
        const folderName = `${timestamp}_${fileName.replace('.pdf', '')}`;
        const projectPath = path.join(storagePath, folderName);

        fs.mkdirSync(projectPath);
        const destPdfPath = path.join(projectPath, 'document.pdf');
        fs.copyFileSync(sourcePath, destPdfPath);

        const metaData = {
            id: timestamp,
            originalName: fileName,
            importDate: new Date().toISOString(),
            status: 'pending', // สถานะเริ่มต้น
            folderName: folderName
        };
        fs.writeFileSync(path.join(projectPath, 'info.json'), JSON.stringify(metaData));

        return { success: true, project: metaData };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// ดึงรายการโปรเจกต์ (ปรับปรุงให้เช็คไฟล์ JSON อัตโนมัติ)
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
                
                // [DYNAMIC STATUS] เช็คว่าถ้ามีไฟล์ผลลัพธ์ ให้เปลี่ยนสถานะเป็น checked ทันที
                if (fs.existsSync(resultPath)) {
                    info.status = 'checked';
                } else {
                    info.status = 'pending';
                }
                
                return info;
            }
            return null;
        }).filter(Boolean).sort((a, b) => b.id - a.id);
    } catch (err) {
        console.error("Error getting projects:", err);
        return [];
    }
});

// ลบโปรเจกต์
ipcMain.handle('delete-project', (event, folderName) => {
    try {
        const targetDir = path.join(storagePath, folderName);
        if (fs.existsSync(targetDir)) {
            fs.rmSync(targetDir, { recursive: true, force: true });
            return { success: true };
        }
        return { success: false, error: "Not found" };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('get-project-path', (event, folderName) => {
    return path.join(storagePath, folderName, 'document.pdf');
});

// โหลดผลการตรวจ JSON สำหรับหน้า Workspace
ipcMain.handle('get-check-result', async (e, folder) => {
    try {
        const p = path.join(storagePath, folder, 'document_result.json');
        if (fs.existsSync(p)) {
            const rawData = fs.readFileSync(p, 'utf8');
            return { success: true, data: JSON.parse(rawData) };
        }
        return { success: false, error: "Result file not found" };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// โหลดไฟล์ PDF เป็น Buffer สำหรับแสดงผล
ipcMain.handle('get-pdf-blob', async (e, folder) => {
    try {
        const p = path.join(storagePath, folder, 'document.pdf');
        if (fs.existsSync(p)) {
            return fs.readFileSync(p); // ส่ง Uint8Array กลับไป
        }
        return null;
    } catch (err) {
        console.error("Error reading PDF blob:", err);
        return null;
    }
});

// ยิง API ไปหา Python Backend
ipcMain.handle('test-check-pdf', async (event, filePath) => {
    try {
        const response = await fetch('http://127.0.0.1:8002/check_local_pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_path: filePath })
        });
        
        // ถ้า Python คืนค่า 500 หรือพัง จะดักจับที่นี่
        if (!response.ok) {
            const errText = await response.text();
            return { success: false, error: `Backend Error: ${errText}` };
        }

        return await response.json();
    } catch (error) {
        return { success: false, error: "ไม่สามารถเชื่อมต่อกับ Python Backend ได้" };
    }
});

// --- 4. App Life Cycle ---
function createWindow() {
    const win = new BrowserWindow({
        width: 1300, 
        height: 900,
        title: "Thesis Validator",
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
        // win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    startPythonBackend();
    createWindow();
});

// จัดการการปิดโปรแกรมให้สะอาดที่สุด
app.on('will-quit', killPythonBackend);
process.on('SIGINT', () => { killPythonBackend(); app.quit(); });
process.on('SIGTERM', () => { killPythonBackend(); app.quit(); });

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});