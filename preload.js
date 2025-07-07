const { contextBridge, ipcRenderer } = require("electron/renderer");

contextBridge.exposeInMainWorld("indexBridge", {
  runStatus: (callback) => ipcRenderer.on("runStatus", callback),
});
