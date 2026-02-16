const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld("electronAPI", {
  // Python Connection
  checkBackend: () => ipcRenderer.invoke("check-backend-status"),
  testCheckPDF: (filePath) => ipcRenderer.invoke("test-check-pdf", filePath),

  // Managed Library Management
  getProjects: () => ipcRenderer.invoke("get-projects"),
  importThesis: (sourcePath) => ipcRenderer.invoke("import-thesis", sourcePath),
  deleteProject: (folderName) =>
    ipcRenderer.invoke("delete-project", folderName),
  getProjectPath: (folderName) =>
    ipcRenderer.invoke("get-project-path", folderName),

  // Configuration Management
  getConfig: () => ipcRenderer.invoke("get-config"),
  saveConfig: (config) => ipcRenderer.invoke("save-config", config),

  // System Dialogs
  selectFile: () => ipcRenderer.invoke("select-pdf-file"),

  // Workspace
  getCheckResult: (folderName) =>
    ipcRenderer.invoke("get-check-result", folderName),
  getPDFBlob: (folderName) => ipcRenderer.invoke("get-pdf-blob", folderName),

  saveCheckResult: (data) => ipcRenderer.invoke("save-check-result", data),

  // Review & Export
  confirmReview: (folderName) => ipcRenderer.invoke("confirm-review", folderName),
  exportAnnotatedPDF: (folderName) => ipcRenderer.invoke("export-annotated-pdf", folderName),
});