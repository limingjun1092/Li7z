let selectedSources = [];
let outputPath = '';
let isCompressing = false;
let currentFormat = document.getElementById('format').value;

const addFileButton = document.getElementById('addFileButton');
const addFolderButton = document.getElementById('addFolderButton');
const selectedSourcesUl = document.getElementById('selectedSources');
const formatSelect = document.getElementById('format');
const levelSelect = document.getElementById('level');
const passwordInput = document.getElementById('password');
const selectOutput = document.getElementById('selectOutput');
const outputPathSpan = document.getElementById('outputPath');
const startCompress = document.getElementById('startCompress');
const compressStatus = document.getElementById('compressStatus');
const compressProgressBar = document.getElementById('compressProgressBar');
const compressProgressText = document.getElementById('compressProgressText');


// 添加文件
addFileButton.addEventListener('click', async () => {
    const result = await window.electronAPI.selectSource('file');
    if (result && !selectedSources.includes(result)) {
        selectedSources.push(result);
        renderSourceList();
        checkReady();
    }
});

// 添加文件夹
addFolderButton.addEventListener('click', async () => {
    const result = await window.electronAPI.selectSource('folder');
    if (result && !selectedSources.includes(result)) {
        selectedSources.push(result);
        renderSourceList();
        checkReady();
    }
});

function renderSourceList() {
    selectedSourcesUl.innerHTML = '';
    selectedSources.forEach((src, idx) => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.marginBottom = '4px';
        const span = document.createElement('span');
        span.textContent = src;
        span.style.flex = '1';
        const delBtn = document.createElement('button');
        delBtn.textContent = '×';
        delBtn.className = 'button warning';
        delBtn.style.marginLeft = '8px';
        delBtn.style.padding = '2px 8px';
        delBtn.onclick = () => {
            selectedSources.splice(idx, 1);
            renderSourceList();
            checkReady();
        };
        li.appendChild(span);
        li.appendChild(delBtn);
        selectedSourcesUl.appendChild(li);
    });
}

selectOutput.addEventListener('click', async () => {
    // 动态后缀和默认名
    let ext = currentFormat;
    let defaultName = 'archive.' + ext;
    // 通过IPC传递建议文件名和后缀
    const result = await window.electronAPI.selectOutputPath(defaultName, ext);
    if (result) {
        outputPath = result;
        outputPathSpan.textContent = result;
        checkReady();
    }
});

function checkReady() {
    startCompress.disabled = !(selectedSources.length > 0 && outputPath);
}

// 选择格式时，禁用等级和密码（iso/img/wim）
formatSelect.addEventListener('change', () => {
    const fmt = formatSelect.value;
    const disable = ['iso', 'img', 'wim'].includes(fmt);
    levelSelect.disabled = disable;
    passwordInput.disabled = disable;
    if (disable) {
        levelSelect.value = '5';
        passwordInput.value = '';
    }
});

startCompress.addEventListener('click', async () => {
    if (isCompressing) return;
    isCompressing = true;
    compressStatus.textContent = '正在压缩...';
    compressProgressBar.style.width = '0%';
    compressProgressText.textContent = '0%';

    const format = formatSelect.value;
    const level = levelSelect.value;
    const password = passwordInput.value;
    const label = labelInput ? labelInput.value : '';

    try {
        await window.electronAPI.startCompress({
            sources: selectedSources,
            outputPath,
            format,
            level,
            password,
            label
        });
    } catch (err) {
        compressStatus.textContent = '压缩失败: ' + err.message;
        isCompressing = false;
        return;
    }
});

window.electronAPI.onCompressProgress((event, progress) => {
    compressProgressBar.style.width = `${progress}%`;
    compressProgressText.textContent = `${progress}%`;
    compressStatus.textContent = `正在压缩... ${progress}%`;
    if (progress >= 100) {
        compressStatus.textContent = '压缩完成!';
        isCompressing = false;
    }
});
