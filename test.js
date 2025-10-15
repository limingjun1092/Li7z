const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

async function test7zFunctionality() {
    console.log('=== Li7z 功能测试 ===\n');
    
    // 测试7z路径
    const get7zPath = () => {
        const base = __dirname;
        if (process.platform === 'win32') {
            return path.join(base, 'resources', '7zip', '7z.exe');
        } else {
            return path.join(base, 'resources', '7zip', '7z');
        }
    };
    
    const sevenZipPath = get7zPath();
    
    try {
        // 测试7z是否存在
        await fs.access(sevenZipPath);
        console.log('✓ 7z可执行文件存在:', sevenZipPath);
        
        // 测试7z版本
        const versionTest = await new Promise((resolve) => {
            const child = spawn(sevenZipPath, ['--help']);
            let output = '';
            
            child.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            child.on('close', (code) => {
                resolve({ code, output });
            });
        });
        
        if (versionTest.code === 0) {
            console.log('✓ 7z版本测试通过');
            if (versionTest.output.includes('7-Zip')) {
                const versionMatch = versionTest.output.match(/7-Zip\s+([\d.]+)/);
                if (versionMatch) {
                    console.log(`✓ 检测到7z版本: ${versionMatch[1]}`);
                }
            }
        } else {
            console.log('✗ 7z版本测试失败');
        }
        
        // 测试-slt参数
        const sltTest = await new Promise((resolve) => {
            const child = spawn(sevenZipPath, ['l', 'l']);
            let output = '';
            
            child.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            child.on('close', (code) => {
                resolve({ code, output });
            });
        });
        
        if (sltTest.code === 0 || sltTest.output.includes('Syntax')) {
            console.log('✓ l参数支持测试通过');
        } else {
            console.log('✗ l参数支持测试失败');
        }
        
        console.log('\n=== 所有测试完成 ===');
        
    } catch (error) {
        console.error('✗ 测试失败:', error.message);
        console.log('\n请确保7z可执行文件位于正确位置:', sevenZipPath);
    }
}

// 运行测试
if (require.main === module) {
    test7zFunctionality();
}

module.exports = { test7zFunctionality };