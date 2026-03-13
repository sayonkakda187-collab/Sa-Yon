const { contextBridge, ipcRenderer } = require("electron");
const { extractUrls } = require("./src/platform-service");

contextBridge.exposeInMainWorld("pinterestDownloader", {
  getDefaultFolder: (platform) => ipcRenderer.invoke("folder:get-default", platform),
  selectFolder: () => ipcRenderer.invoke("folder:select"),
  openFolder: (folderPath) => ipcRenderer.invoke("folder:open", folderPath),
  importTextFile: () => ipcRenderer.invoke("file:import-text"),
  analyzeUrls: (payload) => ipcRenderer.invoke("media:analyze", payload),
  extractUrls: (text, platform) => extractUrls(platform, text),
  startDownloads: (payload) => ipcRenderer.invoke("download:start", payload),
  exportLog: (payload) => ipcRenderer.invoke("log:export", payload),
  onDownloadEvent: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("download:event", listener);
    return () => ipcRenderer.removeListener("download:event", listener);
  },
});
