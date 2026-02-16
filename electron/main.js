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

    if (process.env.VITE_DEV_SERVER_URL) {
        console.log("[System]: Development Mode - Loading from Vite...");
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
        win.webContents.openDevTools(); 
    } else {
        const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
        
        if (fs.existsSync(indexPath)) {
            console.log("[System]: Production Mode - Loading from dist...");
            win.loadFile(indexPath);
        } else {
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

ipcMain.handle("get-projects", async () => {
  try {
    if (!fs.existsSync(storagePath)) {
        console.log("Folder not found!");
        return [];
    }

    const folders = fs.readdirSync(storagePath);

    const projects = folders.map((folder) => {
      const projectDir = path.join(storagePath, folder);
      const infoPath = path.join(projectDir, "info.json");
      const resultPath = path.join(projectDir, "document_result.json");

      if (!fs.existsSync(infoPath)) return null;

      try {
        const info = JSON.parse(fs.readFileSync(infoPath, "utf-8"));

        let stats = { total: 0, resolved: 0, remaining: 0 };
        // อ่าน status จาก info.json ก่อน (รองรับ reviewed)
        // ถ้าไม่มี => "pending"
        let status = info.status || "pending";

        // อ่านไฟล์ผลตรวจ
        if (fs.existsSync(resultPath)) {
          try {
            // ถ้า status ยังเป็น pending แต่มีไฟล์ result => checked
            if (status === "pending") {
              status = "checked";
            }
            const fileContent = fs.readFileSync(resultPath, "utf-8");
            const resultJson = JSON.parse(fileContent);

            // รองรับโครงสร้างข้อมูลทั้ง 3 แบบ
            const issues = resultJson.issues || resultJson.data || (Array.isArray(resultJson) ? resultJson : []);

            const total = issues.length;
            const resolved = issues.filter((i) => i.is_ignored === true || i.isIgnored === true).length;

            stats = {
              total: total,
              resolved: resolved,
              remaining: total - resolved,
            };
          } catch (readErr) {
            console.error(`Error parsing result for ${folder}:`, readErr);
            status = "pending"; 
          }
        }

        return { ...info, status, stats };
      } catch (err) {
        console.error(`Error reading info for ${folder}:`, err);
        return null;
      }
    });

    return projects.filter(Boolean).sort((a, b) => b.id - a.id);

  } catch (err) {
    console.error("Error getting projects:", err);
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

// ============================================================
// test-check-pdf: ส่ง PDF ไปตรวจที่ Python แล้ว SAVE ผลลง JSON
// ============================================================
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

        // รับผลจาก Python ตามเดิม ไม่แปลง format
        const resultData = await response.json();

        // === เพิ่ม: Save ผลลงไฟล์ ===
        try {
            const projectDir = path.dirname(filePath);
            const resultPath = path.join(projectDir, 'document_result.json');
            fs.writeFileSync(resultPath, JSON.stringify(resultData, null, 4), 'utf-8');

            // อัปเดต info.json status เป็น "checked"
            const infoPath = path.join(projectDir, 'info.json');
            if (fs.existsSync(infoPath)) {
                const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
                info.status = 'checked';
                info.checkedDate = new Date().toISOString();
                fs.writeFileSync(infoPath, JSON.stringify(info, null, 4), 'utf-8');
            }
        } catch (saveErr) {
            console.error('[Save Error]:', saveErr.message);
        }

        // Return ค่าเดิมจาก Python โดยไม่แปลง
        return resultData;
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

ipcMain.handle('get-config', () => {
    const exePath = !app.isPackaged 
        ? path.join(app.getAppPath(), 'bin', 'thesis_backend.exe')
        : path.join(process.resourcesPath, 'bin', 'thesis_backend.exe');
    const configPath = path.join(path.dirname(exePath), 'config.json');

    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
});

ipcMain.handle('save-config', async (event, newConfig) => {
    try {
        const exePath = !app.isPackaged 
            ? path.join(app.getAppPath(), 'bin', 'thesis_backend.exe')
            : path.join(process.resourcesPath, 'bin', 'thesis_backend.exe');
            
        const configPath = path.join(path.dirname(exePath), 'config.json');
        
        fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 4), 'utf-8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// ============================================================
// save-check-result: บันทึก isIgnored status ลง JSON
// ============================================================
ipcMain.handle('save-check-result', async (event, { folderName, issues }) => {
    try {
        const resultPath = path.join(storagePath, folderName, 'document_result.json');
        
        let content = {};
        if (fs.existsSync(resultPath)) {
             try {
                 const fileContent = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
                 if (fileContent && !Array.isArray(fileContent)) {
                    content = fileContent;
                 }
             } catch (e) {}
        }
        
        // บันทึกลงทั้ง issues และ data เพื่อให้อ่านได้ถูกต้องทุกกรณี
        content.issues = issues;
        content.data = issues;
        
        fs.writeFileSync(resultPath, JSON.stringify(content, null, 4), 'utf-8');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// ============================================================
// confirm-review: อัปเดต status เป็น "reviewed"
// ============================================================
ipcMain.handle('confirm-review', async (event, folderName) => {
    try {
        const infoPath = path.join(storagePath, folderName, 'info.json');
        if (!fs.existsSync(infoPath)) {
            return { success: false, error: 'info.json not found' };
        }
        const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
        info.status = 'reviewed';
        info.reviewedDate = new Date().toISOString();
        fs.writeFileSync(infoPath, JSON.stringify(info, null, 4), 'utf-8');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// ============================================================
// export-annotated-pdf: วาด bbox annotations ลงบน PDF
// ============================================================
ipcMain.handle('export-annotated-pdf', async (event, folderName) => {
    try {
        const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

        const projectDir = path.join(storagePath, folderName);
        const pdfPath = path.join(projectDir, 'document.pdf');
        const resultPath = path.join(projectDir, 'document_result.json');

        if (!fs.existsSync(pdfPath) || !fs.existsSync(resultPath)) {
            return { success: false, error: 'PDF or result file not found' };
        }

        const pdfBytes = fs.readFileSync(pdfPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        const resultJson = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
        const issues = resultJson.issues || resultJson.data || (Array.isArray(resultJson) ? resultJson : []);

        // วาด annotations เฉพาะ active issues (ที่ยังไม่ resolve)
        const activeIssues = issues.filter(i => !(i.is_ignored === true || i.isIgnored === true));

        for (const issue of activeIssues) {
            const pageIdx = (parseInt(issue.page) || 1) - 1;
            if (pageIdx < 0 || pageIdx >= pdfDoc.getPageCount()) continue;

            const page = pdfDoc.getPage(pageIdx);
            const { height: pageH } = page.getSize();

            if (issue.bbox && issue.bbox.length === 4) {
                const [x0, y0, x1, y1] = issue.bbox;

                // PDF coordinate system: y=0 is bottom
                const rectX = x0;
                const rectY = pageH - y1;
                const rectW = x1 - x0;
                const rectH = y1 - y0;

                const isError = (issue.severity || '').toLowerCase().includes('error');
                const color = isError ? rgb(0.88, 0.11, 0.28) : rgb(0.98, 0.75, 0.14);

                page.drawRectangle({
                    x: rectX,
                    y: rectY,
                    width: rectW,
                    height: rectH,
                    borderColor: color,
                    borderWidth: 1.5,
                    opacity: 0.15,
                    color: color,
                });

                // วาดข้อความ label เหนือกรอบ
                const label = `[${issue.code || issue.severity}]`;
                try {
                    page.drawText(label, {
                        x: rectX,
                        y: rectY + rectH + 2,
                        size: 7,
                        font: font,
                        color: color,
                    });
                } catch (e) {}
            }
        }

        const annotatedBytes = await pdfDoc.save();

        // เปิด Save Dialog
        const result = await dialog.showSaveDialog({
            title: 'Save Annotated PDF',
            defaultPath: `Annotated_${folderName}.pdf`,
            filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
        });

        if (result.canceled || !result.filePath) {
            return { success: false, error: 'Save cancelled' };
        }

        fs.writeFileSync(result.filePath, annotatedBytes);
        return { success: true, filePath: result.filePath };
    } catch (err) {
        console.error('Export PDF Error:', err);
        return { success: false, error: err.message };
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