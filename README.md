# Li7z

这是一个基于Electron和7z命令行版制作的简易压缩软件

**注意⚠️：因版权原因，移除了对Rar、iso、img、wim文件的支持**

## 功能特性

- 正常解压缩
- Devtools可用
- 旧Windows支持 （Windows 7 X64 ）


## 安装说明

### 环境要求

- Node.js 14+

### 安装步骤

1. 克隆项目
```bash
git clone https://github.com/limingjun1092/Li7z.git
```

2. 安装依赖
```bash
cd Li7z
npm install
```

3. 运行项目
```bash
npm start
```

## 使用方法


### 基本使用演示

![使用图例1](https://github.com/limingjun1092/Li7z/releases/download/IMG/1.png)

![使用图例2](https://github.com/limingjun1092/Li7z/releases/download/IMG/2.png)

![使用图例3](https://github.com/limingjun1092/Li7z/releases/download/IMG/3.png)




## 项目结构

```
Li7z/
├── 7zip/ #需要的依赖
├── 7-Zip-LICENSE.md #使用7z的声明
├── CHROMIUM-LICENSE.md #使用Chromium的声明
├── LICENSE #MIT声明
├── compress.html #压缩页面文件
├── compress.js #压缩界面的js
├── index.html #主页面
├── main.js #主程序
├── package-lock.json #运行时锁文件
├── package.json #项目所需模块和配置信息的文件
├── preload.js #预加载
├── renderer.js #渲染
├── styles.css #页面需要的排版文件
└── test.js #7z测试
```

## 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 联系方式

- 作者：Li
- 邮箱：jak2022-2003@outlook.com
- 项目地址：https://github.com/limingjun1092/Li7z

## 更新日志

### v1.2.1 (2025-10-15)
- 版本发布
- 实现基础功能












Oi！你知道吗！接下来的是彩蛋！


# 彩蛋

你知道吗？我们曾试着自己压缩自己！
![“自压缩”](https://github.com/limingjun1092/Li7z/releases/download/IMG/4.png)

