const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 打开压缩窗口
  openCompressWindow: () => ipcRenderer.invoke('open-compress-window'),
  // 文件操作
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
  getFileInfo: (filePath) => ipcRenderer.invoke('get-file-info', filePath),
  showItemInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath),
  selectSource: (type) => ipcRenderer.invoke('select-source', type),
  selectOutputPath: (defaultName, ext) => ipcRenderer.invoke('select-output-path', defaultName, ext),
  
  // 压缩/解压文件操作
  listArchive: (archivePath) => ipcRenderer.invoke('list-archive', archivePath),
  extractArchive: (archivePath, outputDir, files) => ipcRenderer.invoke('extract-archive', archivePath, outputDir, files),
  cancelExtraction: () => ipcRenderer.invoke('cancel-extraction'),
  startCompress: (params) => ipcRenderer.invoke('start-compress', params),
  
  // 测试功能
  test7z: () => ipcRenderer.invoke('test-7z'),
  
  // 事件监听
  onFileOpened: (callback) => {
    ipcRenderer.removeAllListeners('file-opened');
    ipcRenderer.on('file-opened', callback);
  },
  onExtractionProgress: (callback) => {
    ipcRenderer.removeAllListeners('extraction-progress');
    ipcRenderer.on('extraction-progress', callback);
  },
  onCompressProgress: (callback) => {
    ipcRenderer.removeAllListeners('compress-progress');
    ipcRenderer.on('compress-progress', callback);
  },
  
  // 取消操作 - 修复：使用正确的IPC通道
  cancelExtractionRequest: () => ipcRenderer.send('cancel-extraction')
});