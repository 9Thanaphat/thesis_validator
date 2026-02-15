import { useState } from 'react';

import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';

import './Style.css';

function App() {
  // 1. State สำหรับจัดการหน้า
  const [activeProject, setActiveProject] = useState(null);

  // 2. ฟังก์ชันเลือกโปรเจกต์
  const handleSelectProject = (project) => {
    setActiveProject(project);
  };

  // 3. ฟังก์ชันปิดหน้าตรวจ
  const handleBackToDashboard = () => {
    setActiveProject(null);
  };

  return (
    <div className='min-h-screen min-w-full bg-slate-50 text-slate-800 font-sans'>
      
      {!activeProject ? (
        /* === ส่วนของ Dashboard (ต้องการ Header และ Container) === */
        <>
          <header className="bg-white shadow-sm py-4 px-8 border-b border-slate-200 sticky top-0 z-10 flex justify-between items-center">
            <h1 className='text-xl font-extrabold text-blue-600 tracking-tight'>
              Thesis Validator <span className="text-slate-400 font-normal">| For Instructors</span>
            </h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-bold text-slate-500 uppercase">System Ready</span>
            </div>
          </header>

          <main className="container mx-auto p-8">
            <Dashboard onSelectProject={handleSelectProject} />
          </main>
        </>
      ) : (
        /* === ส่วนของ Workspace (ไม่ต้องมี Header นอก เพราะ Workspace มี Header ของตัวเอง) === */
        /* และไม่ต้องใส่ Container เพื่อให้ PDF Viewer แสดงผลได้เต็มความสูงหน้าจอ */
        <main className="h-screen w-full">
          <Workspace 
            project={activeProject}
            onBack={handleBackToDashboard}
          />
        </main>
      )}

      {/* 📡 Debug Button */}
      <button 
        onClick={async () => {
          // ทดสอบเรียก IPC ที่เราเขียนไว้ใน main.js
          const res = await window.electronAPI.runCheck("test-folder");
          console.log("Debug IPC Response:", res);
          alert("Check Console (F12)");
        }}
        className="fixed bottom-4 left-4 z-50 bg-slate-800 text-white w-8 h-8 rounded-full shadow-lg opacity-20 hover:opacity-100 transition-all text-[10px] flex items-center justify-center"
        title="Debug Connection"
      >
        📡
      </button>

    </div>
  );
}

export default App;