


let isExtracting = false;
// DOM元素
const dropArea = document.getElementById('dropArea');
const browseButton = document.getElementById('browseButton');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const filePath = document.getElementById('filePath');
const fileSize = document.getElementById('fileSize');
const fileCount = document.getElementById('fileCount');
const fileList = document.getElementById('fileList');
const extractButton = document.getElementById('extractButton');
const extractSelectedButton = document.getElementById('extractSelectedButton');
const openFolderButton = document.getElementById('openFolderButton');
const cancelButton = document.getElementById('cancelButton');
const compressButton = document.getElementById('compressButton');
const statusMessage = document.getElementById('statusMessage');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');

// 初始化
async function init() {
    setupEventListeners();
    setupDragAndDrop();
    await test7z();
    setStatus('准备就绪', 0);
}

// 设置事件监听器
function setupEventListeners() {
    // 浏览按钮点击，弹出文件选择
    browseButton.addEventListener('click', async () => {
        try {
            const filePath = await electronAPI.openFileDialog();
            if (filePath && isArchiveFile(filePath)) {
                openArchive(filePath);
            } else if (filePath) {
                showError('请选择有效的压缩文件 (zip, 7z, tar, gz, bz2, xz)');
            }
        } catch (error) {
            showError('无法打开文件对话框: ' + error.message);
        }
    });

    // 压缩按钮点击，打开压缩窗口
    compressButton.addEventListener('click', () => {
        if (window.electronAPI.openCompressWindow) {
            window.electronAPI.openCompressWindow();
        } else {
            // 兼容性提示
            showError('主进程未实现压缩窗口打开功能');
        }
    });

    // 修正：解压全部传递空数组，解压选中传递选中的文件
    extractButton.addEventListener('click', () => extractArchive([]));
    extractSelectedButton.addEventListener('click', () => extractArchive(selectedFiles));
    openFolderButton.addEventListener('click', handleOpenFolder);
    cancelButton.addEventListener('click', handleCancelExtraction);

    // 监听主进程事件
    electronAPI.onFileOpened((event, filePath) => {
        openArchive(filePath);
    });

    electronAPI.onExtractionProgress((event, progress) => {
        updateExtractionProgress(progress);
    });
}

// 设置拖放功能
function setupDragAndDrop() {
    // 只允许 dropArea 响应拖放，避免全局阻止导致拖放失效
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('dragover');
    });

    dropArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropArea.classList.remove('dragover');
    });

    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (isArchiveFile(file.name)) {
                openArchive(file.path);
            } else {
                showError('请选择有效的压缩文件 (zip, 7z, tar, gz, bz2, xz)');
            }
        }
    });
}

// 检查是否为压缩文件
function isArchiveFile(fileName) {
    return fileName && fileName.match(/\.(zip|7z|tar|gz|bz2|xz)$/i);
}

// 测试7z功能
async function test7z() {
    try {
        const result = await electronAPI.test7z();
        if (!result.success) {
            setStatus(`警告: ${result.error}`, 0);
        } else {
            console.log('7z测试通过:', result.version);
        }
    } catch (error) {
        console.error('7z测试失败:', error);
    }
}

// 处理浏览文件
async function handleBrowse() {
    try {
        const filePath = await electronAPI.openFileDialog();
        if (filePath) {
            openArchive(filePath);
        }
    } catch (error) {
        console.error('打开文件对话框失败:', error);
        showError('无法打开文件对话框: ' + error.message);
    }
}

// 处理打开文件夹
function handleOpenFolder() {
    if (currentArchive) {
        electronAPI.showItemInFolder(currentArchive);
    }
}

// 处理取消解压
async function handleCancelExtraction() {
    if (isExtracting) {
        setStatus('正在取消...', 0);
        try {
            await electronAPI.cancelExtraction();
        } catch (error) {
            console.error('取消解压失败:', error);
        }
        isExtracting = false;
        updateExtractionUI(false);
        setStatus('操作已取消', 0);
    }
}

// 打开压缩文件
async function openArchive(archivePath) {
    try {
        setStatus('正在读取压缩文件...', 30);
        
        // 异步获取文件信息
        const fileInfo = await electronAPI.getFileInfo(archivePath);
        const fileSizeFormatted = formatFileSize(fileInfo.size);
        
        currentArchive = archivePath;
        fileName.textContent = getFileName(archivePath);
        filePath.textContent = `路径: ${archivePath}`;
        fileSize.textContent = `大小: ${fileSizeFormatted}`;
        fileCount.textContent = `文件数: 计算中...`;
        
        // 获取压缩文件内容
        const archiveData = await electronAPI.listArchive(archivePath);
        
        const fileCountValue = archiveData.files.filter(file => !file.folder).length;
        const folderCountValue = archiveData.files.filter(file => file.folder).length;
        
        fileCount.textContent = `文件数: ${fileCountValue} 文件, ${folderCountValue} 文件夹`;
        displayFileList(archiveData.files);
        
        extractButton.disabled = false;
        extractSelectedButton.disabled = false;
        openFolderButton.disabled = false;
        
        setStatus('压缩文件加载完成', 100);
        
        setTimeout(() => {
            setStatus('准备就绪', 0);
        }, 2000);
        
    } catch (error) {
        console.error('打开压缩文件失败:', error);
        setStatus(`错误: ${error.message}`, 0);
        showError(`无法打开压缩文件: ${error.message}`);
    }
}

// 显示文件列表
function displayFileList(files) {
    fileList.innerHTML = '';
    selectedFiles = [];

    if (!files || files.length === 0) {
        fileList.innerHTML = '<div class="empty-state"><p>压缩包为空</p></div>';
        extractSelectedButton.disabled = true;
        extractSelectedButton.classList.remove('primary');
        return;
    }

    // 过滤掉文件夹，只显示文件
    const fileItems = files.filter(file => !file.folder);

    if (fileItems.length === 0) {
        fileList.innerHTML = '<div class="empty-state"><p>压缩包中没有文件（只有文件夹）</p></div>';
        extractSelectedButton.disabled = true;
        extractSelectedButton.classList.remove('primary');
        return;
    }

    fileItems.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.index = index;

        // 复选框实现
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'file-checkbox';
        checkbox.style.marginRight = '8px';

        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                if (!selectedFiles.includes(file.path)) selectedFiles.push(file.path);
            } else {
                const idx = selectedFiles.indexOf(file.path);
                if (idx > -1) selectedFiles.splice(idx, 1);
            }
            extractSelectedButton.disabled = selectedFiles.length === 0 || isExtracting;
            extractSelectedButton.textContent = selectedFiles.length > 0 ? `解压选中 (${selectedFiles.length})` : '解压选中';
            // 选中时变绿色，否则恢复
            if (selectedFiles.length > 0) {
                extractSelectedButton.classList.add('primary');
            } else {
                extractSelectedButton.classList.remove('primary');
            }
        });

        const fileName = document.createElement('div');
        fileName.className = 'file-name';
        fileName.textContent = file.path || '-';
        fileName.title = file.path || '-';

        const fileSize = document.createElement('div');
        fileSize.className = 'file-size';
        fileSize.textContent = formatFileSize(file.size);

        const fileDate = document.createElement('div');
        fileDate.className = 'file-date';
        fileDate.textContent = file.modified ? formatDate(file.modified) : '-';

        fileItem.appendChild(checkbox);
        fileItem.appendChild(fileName);
        fileItem.appendChild(fileSize);
        fileItem.appendChild(fileDate);

        fileList.appendChild(fileItem);
    });

    // 初始禁用“解压选中”
    extractSelectedButton.disabled = true;
    extractSelectedButton.textContent = '解压选中';
    extractSelectedButton.classList.remove('primary');
}

// 解压文件
async function extractArchive(files = []) {
    if (!currentArchive || isExtracting) return;

    try {
        setStatus('选择解压目录...', 10);
        const outputDir = await electronAPI.openFolderDialog();
        if (!outputDir) {
            setStatus('已取消解压', 0);
            return;
        }

        setStatus('正在解压...', 20);
        isExtracting = true;
        updateExtractionUI(true);

        const result = await electronAPI.extractArchive(currentArchive, outputDir, files);

        if (result.cancelled) {
            setStatus('解压已取消', 0);
        } else {
            setStatus('解压完成!', 100);
            setTimeout(() => {
                setStatus('准备就绪', 0);
            }, 2000);
            const openFolder = confirm(`文件已解压到: ${outputDir}\n\n是否打开该目录?`);
            if (openFolder) {
            electronAPI.showItemInFolder(outputDir);
            }
        }
    } catch (error) {
        console.error('解压失败:', error);
        setStatus(`解压失败: ${error.message}`, 0);
        showError(`解压失败: ${error.message}`);
    } finally {
        isExtracting = false;
        updateExtractionUI(false);
    }
}

// 更新解压UI状态
function updateExtractionUI(extracting) {
    extractButton.disabled = extracting;
    extractSelectedButton.disabled = extracting || selectedFiles.length === 0;
    openFolderButton.disabled = extracting;
    
    if (extracting) {
        cancelButton.classList.remove('hidden');
    } else {
        cancelButton.classList.add('hidden');
        progressText.textContent = '0%';
    }
}

// 更新解压进度
function updateExtractionProgress(progress) {
    setStatus(`正在解压... ${progress}%`, progress);
    progressText.textContent = `${progress}%`;
}

// 设置状态消息和进度
function setStatus(message, progress) {
    statusMessage.textContent = message;
    progressBar.style.width = `${progress}%`;
}

// 显示错误消息
function showError(message) {
    alert(message);
}

// 工具函数
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    if (!dateString) return '-';
    // 简单格式化日期，显示日期和时间部分
    return dateString.substring(0, 16).replace('T', ' ');
}

function getFileName(filePath) {
    return filePath.split(/[\\/]/).pop();
}

// 初始化应用
document.addEventListener('DOMContentLoaded', init);