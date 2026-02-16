import { useState } from "react";

import Dashboard from "./pages/Dashboard";
import Workspace from "./pages/Workspace";
import Settings from "./pages/Settings";
import Preview from "./pages/Preview";

import "./Style.css";

function App() {
  const [view, setView] = useState("dashboard");
  const [activeProject, setActiveProject] = useState(null);

  const handleSelectProject = (project) => {
    setActiveProject(project);
    setView("workspace");
  };

  const handlePreviewProject = (project) => {
    setActiveProject(project);
    setView("preview");
  };

  const handleBackToDashboard = () => {
    setActiveProject(null);
    setView("dashboard");
  };

  const handleOpenSettings = () => {
    setView("settings");
  };

  return (
    <div className="min-h-screen min-w-full bg-slate-50 text-slate-800 font-sans">
      {view !== "workspace" && view !== "preview" && (
        <header className="bg-white shadow-sm py-4 px-8 border-b border-slate-200 sticky top-0 z-10 flex justify-between items-center">
          <h1
            className="text-xl font-extrabold text-blue-600 tracking-tight cursor-pointer"
            onClick={handleBackToDashboard}
          >
            Thesis Validator{" "}
            <span className="text-slate-400 font-normal">
              | For Instructors
            </span>
          </h1>
        </header>
      )}

      <main
        className={
          view === "workspace" ? "h-screen w-full" : "container mx-auto p-8"
        }
      >
        {view === "dashboard" && (
          <Dashboard
            onSelectProject={handleSelectProject}
            onPreviewProject={handlePreviewProject}
            onOpenSettings={handleOpenSettings}
          />
        )}

        {view === "workspace" && (
          <Workspace project={activeProject} onBack={handleBackToDashboard} />
        )}

        {view === "settings" && <Settings onBack={handleBackToDashboard} />}

        {view === "preview" && (
          <Preview project={activeProject} onBack={handleBackToDashboard} />
        )}
      </main>
    </div>
  );
}

export default App;
