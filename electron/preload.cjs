const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    scanNetworks: () => ipcRenderer.invoke('scan-networks')
});
