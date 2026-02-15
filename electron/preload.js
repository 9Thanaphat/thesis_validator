const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Python Connection
  testCheckPDF: (filePath) => ipcRenderer.invoke('test-check-pdf', filePath),
  
  // Managed Library Management
  getProjects: () => ipcRenderer.invoke('get-projects'),
  importThesis: (sourcePath) => ipcRenderer.invoke('import-thesis', sourcePath),
  deleteProject: (folderName) => ipcRenderer.invoke('delete-project', folderName),
  getProjectPath: (folderName) => ipcRenderer.invoke('get-project-path', folderName),
  
  // System Dialogs
  selectFile: () => ipcRenderer.invoke('select-pdf-file'),

  // Workspace 
  getCheckResult: (folderName) => ipcRenderer.invoke('get-check-result', folderName),
  getPDFBlob: (folderName) => ipcRenderer.invoke('get-pdf-blob', folderName),
});