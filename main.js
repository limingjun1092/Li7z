const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const iconv = require('iconv-lite');


let mainWindow;
let compressWindow = null;
let extractionProcess = null;
let compressProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: getIconPath(),
    title: 'Li7z'
  });

  mainWindow.loadFile('index.html');

  // 处理从命令行打开文件（延迟以便窗口准备就绪）
  if (process.argv.length > 1 && isArchiveFile(process.argv[1])) {
    const filePath = process.argv[1];
    setTimeout(() => {
      mainWindow.webContents.send('file-opened', filePath);
    }, 1000);
  }

  // 新增：监听打开压缩窗口请求（可通过IPC或菜单/按钮触发）
  ipcMain.handle('open-compress-window', () => {
    if (compressWindow && !compressWindow.isDestroyed()) {
      compressWindow.focus();
      return;
    }
    compressWindow = new BrowserWindow({
      width: 600,
      height: 600,
      parent: mainWindow,
      modal: false,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      title: '新建压缩包'
    });
    compressWindow.loadFile('compress.html');
    compressWindow.on('closed', () => {
      compressWindow = null;
    });
  });
}
// 选择源文件/文件夹
ipcMain.handle('select-source', async (event, type) => {
  let props = [];
  if (type === 'file') props = ['openFile'];
  else if (type === 'folder') props = ['openDirectory'];
  else props = ['openFile', 'openDirectory'];
  const result = await dialog.showOpenDialog(compressWindow || mainWindow, {
    properties: props,
    filters: [
      { name: '所有文件', extensions: ['*'] }
    ]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// 选择输出路径（保存压缩包）
ipcMain.handle('select-output-path', async (event, defaultName = 'archive.zip', ext = 'zip') => {
  // 动态过滤器
  const allExts = ['zip','7z','tar','gz','bz2','xz','iso','img','wim'];
  const result = await dialog.showSaveDialog(compressWindow || mainWindow, {
    title: '保存压缩包',
    defaultPath: path.join(app.getPath('desktop'), defaultName),
    filters: [
      { name: '压缩文件', extensions: allExts },
      { name: '所有文件', extensions: ['*'] }
    ]
  });
  if (!result.canceled && result.filePath) {
    return result.filePath;
  }
  return null;
});

// 压缩处理
ipcMain.handle('start-compress', async (event, params) => {
  const { sources, outputPath, format, level, password, label } = params;
  let ext = format;
  let outFile = outputPath;
  if (!outFile.endsWith('.' + ext)) {
    outFile += '.' + ext;
  }


//  } else {
    if (!await check7zExists()) {
      throw new Error('7z executable not found');
    }
    const sevenZipPath = get7zPath();
    let args = ['a', outFile, `-t${format}`, `-mx=${level}`, '-bsp1'];
    if (password) args.push(`-p${password}`);
    if (Array.isArray(sources)) args.push(...sources);
    return new Promise((resolve, reject) => {
      compressProcess = spawn(sevenZipPath, args);
      let output = '';
      let error = '';
      compressProcess.stdout.on('data', (data) => {
        const text = iconv.decode(data, 'gbk');
        output += text;
        const m = text.match(/(\d{1,3})%/);
        if (m) {
          const progress = Math.max(0, Math.min(100, parseInt(m[1], 10)));
          if (compressWindow && !compressWindow.isDestroyed()) {
            compressWindow.webContents.send('compress-progress', progress);
          }
        }
      });
      compressProcess.stderr.on('data', (data) => {
        error += iconv.decode(data, 'gbk');
      });
      compressProcess.on('close', (code) => {
        compressProcess = null;
        if (code === 0) {
          if (compressWindow && !compressWindow.isDestroyed()) {
            compressWindow.webContents.send('compress-progress', 100);
          }
          resolve({ success: true, output });
        } else {
          reject(new Error(`压缩失败 code ${code}: ${error}`));
        }
      });
    });
  }
);
// 忽略证书错误
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  event.preventDefault();
  callback(true);
});
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 获取图标路径
function getIconPath() {
  const base = app.isPackaged ? process.resourcesPath : __dirname;
  if (process.platform === 'linux') {
    return path.join(base, '.', 'icon.png');
  } else {
    return path.join(base, '.', 'icon.ico');
  }
}

// 检查是否为压缩文件
function isArchiveFile(filePath) {
  return filePath && filePath.match(/\.(zip|7z|tar|gz|bz2|xz)$/i);
}

// 获取7z可执行文件路径
function get7zPath() {
  const base = app.isPackaged ? process.resourcesPath : __dirname;
  if (process.platform === 'win32') {
    return path.join(base, '7zip', '7z.exe');
  } else {
    return path.join(base, '7zip', '7z');
  }
}

// 检查7z是否存在
async function check7zExists() {
  try {
    await fs.access(get7zPath());
    return true;
  } catch {
    return false;
  }
}

// 使用-slt获取结构化列表信息
ipcMain.handle('list-archive', async (event, archivePath) => {
  if (!await check7zExists()) {
    throw new Error('7z executable not found');
  }

  const sevenZipPath = get7zPath();
  const args = ['l', '-slt', archivePath];

  return new Promise((resolve, reject) => {
    const child = spawn(sevenZipPath, args);
    let output = '';
    let error = '';

    child.stdout.on('data', (data) => {
      // Windows下7z输出为GBK编码
      output += iconv.decode(data, 'gbk');
    });

    child.stderr.on('data', (data) => {
      error += iconv.decode(data, 'gbk');
    });

    child.on('close', (code) => {
      if (code === 0) {
        try {
          const result = parseSltOutput(output);
          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse output: ${parseError.message}`));
        }
      } else {
        reject(new Error(`7z failed with code ${code}: ${error}`));
      }
    });
  });
});

// 解析-slt输出的结构化数据
function parseSltOutput(output) {
  const lines = output.split('\n');
  const result = {
    archiveInfo: {},
    files: []
  };

  let currentFile = null;
  let archivePath = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r?\n/, '');
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      if (currentFile) {
        result.files.push(currentFile);
        currentFile = null;
      }
      continue;
    }

    const sep = ' = ';
    const idx = trimmedLine.indexOf(sep);
    if (idx === -1) continue;

    const key = trimmedLine.substring(0, idx);
    const value = trimmedLine.substring(idx + sep.length);

    // 归档级别信息（在文件段出现前）
    if (!archivePath && key === 'Path') {
      archivePath = value;
      result.archiveInfo.path = value;
      continue;
    }

    if (!currentFile && key === 'Path' && value !== archivePath) {
      currentFile = { path: value };
      continue;
    }

    if (currentFile) {
      switch (key) {
        case 'Folder':
          currentFile.folder = value === '+';
          break;
        case 'Size':
          currentFile.size = parseInt(value) || 0;
          break;
        case 'Packed Size':
          currentFile.packedSize = parseInt(value) || 0;
          break;
        case 'Modified':
          currentFile.modified = value;
          break;
        case 'Attributes':
          currentFile.attributes = value;
          break;
        case 'CRC':
          currentFile.crc = value;
          break;
        case 'Encrypted':
          currentFile.encrypted = value === '+';
          break;
        case 'Comment':
          currentFile.comment = value;
          break;
        default:
          // 忽略其他字段
          break;
      }
    } else {
      // 归档级别其他信息
      switch (key) {
        case 'Type':
          result.archiveInfo.type = value;
          break;
        case 'Physical Size':
          result.archiveInfo.physicalSize = parseInt(value) || 0;
          break;
        case 'Headers Size':
          result.archiveInfo.headersSize = parseInt(value) || 0;
          break;
        case 'Method':
          result.archiveInfo.method = value;
          break;
        default:
          break;
      }
    }
  }

  if (currentFile) result.files.push(currentFile);

  return result;
}

// 解压文件（支持进度和取消）
ipcMain.handle('extract-archive', async (event, archivePath, outputDir, files = []) => {
  if (!await check7zExists()) {
    throw new Error('7z executable not found');
  }

  const sevenZipPath = get7zPath();
  const args = ['x', archivePath, `-o${outputDir}`, '-y', '-bsp1']; // -bsp1 显示进度信息
  if (files.length > 0) args.push(...files);

  return new Promise((resolve, reject) => {
    extractionProcess = spawn(sevenZipPath, args);
    let output = '';
    let error = '';

    extractionProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;

      // 尝试解析百分比（7z 的 -bsp1 会输出进度行）
      const m = text.match(/(\d{1,3})%/);
      if (m) {
        const progress = Math.max(0, Math.min(100, parseInt(m[1], 10)));
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('extraction-progress', progress);
        }
      }
    });

    extractionProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    extractionProcess.on('close', (code) => {
      extractionProcess = null;
      if (code === 0) {
        resolve({ success: true, output });
      } else {
        reject(new Error(`Extraction failed with code ${code}: ${error}`));
      }
    });

    // 监听取消请求 - 修复：使用正确的IPC监听
    const cancelHandler = () => {
      console.log('收到取消解压请求');
      if (extractionProcess) {
        extractionProcess.kill();
        extractionProcess = null;
        resolve({ success: false, cancelled: true });
      }
    };

    // 监听来自渲染进程的取消请求
    ipcMain.once('cancel-extraction', cancelHandler);

    // 清理：当进程结束时移除监听器
    extractionProcess.on('close', () => {
      ipcMain.removeListener('cancel-extraction', cancelHandler);
    });
  });
});

// 取消解压（备用）
ipcMain.handle('cancel-extraction', async () => {
  if (extractionProcess) {
    extractionProcess.kill();
    extractionProcess = null;
    return true;
  }
  return false;
});

// 获取文件信息（异步）
ipcMain.handle('get-file-info', async (event, filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    };
  } catch (error) {
    throw new Error(`无法获取文件信息: ${error.message}`);
  }
});

// 打开文件对话框
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: '压缩文件', extensions: ['zip', 'tar', 'gz', 'bz2', 'xz'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// 打开文件夹对话框
ipcMain.handle('open-folder-dialog', async () => {
  // 确保窗口未销毁
  if (!mainWindow || mainWindow.isDestroyed()) {
    throw new Error('主窗口未初始化或已关闭，无法弹出目录选择');
  }
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// 打开文件所在位置
ipcMain.handle('show-item-in-folder', async (event, filePath) => {
  shell.showItemInFolder(filePath);
});

// 测试7z功能
ipcMain.handle('test-7z', async () => {
  try {
    if (!await check7zExists()) {
      return { success: false, error: '7z executable not found' };
    }

    const sevenZipPath = get7zPath();
    const args = ['--help'];

    return new Promise((resolve) => {
      const child = spawn(sevenZipPath, args);
      let output = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        resolve({ 
          success: code === 0, 
          version: output.includes('7-Zip') ? '7z detected' : 'Unknown version',
          path: sevenZipPath
        });
      });
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

