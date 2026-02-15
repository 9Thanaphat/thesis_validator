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
        <>
          <header className="bg-white shadow-sm py-4 px-8 border-b border-slate-200 sticky top-0 z-10 flex justify-between items-center">
            <h1 className='text-xl font-extrabold text-blue-600 tracking-tight'>
              Thesis Validator <span className="text-slate-400 font-normal">| For Instructors</span>
            </h1>
          </header>

          <main className="container mx-auto p-8">
            <Dashboard onSelectProject={handleSelectProject} />
          </main>
        </>
      ) : (
        <main className="h-screen w-full">
          <Workspace 
            project={activeProject}
            onBack={handleBackToDashboard}
          />
        </main>
      )}
    </div>
  );
}

export default App;