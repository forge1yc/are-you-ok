# Quick English Translator Chrome 扩展

这是一个简单但实用的 Chrome 扩展，可以帮助你快速翻译网页上的英文内容，无需重新加载页面。

## 功能特点

- 使用快捷键快速翻译选中的英文文本
- 翻译结果以浮动框的形式显示
- 支持所有网页
- 无需重新加载页面
- 简洁的用户界面

## 安装说明

1. 下载或克隆此仓库到本地
2. 打开 Chrome 浏览器，进入扩展程序页面（chrome://extensions/）
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择本项目文件夹

## 使用方法

1. 在网页上选中要翻译的英文文本
2. 按下快捷键 `Ctrl+Shift+T`（Windows/Linux）或 `Command+Shift+T`（Mac）
3. 翻译结果会在选中文本下方显示
4. 点击页面任意位置可关闭翻译结果

## 自定义快捷键

1. 访问 Chrome 扩展快捷键设置页面（chrome://extensions/shortcuts）
2. 找到 "Quick English Translator" 扩展
3. 点击现有快捷键输入框
4. 按下你想要使用的新快捷键组合

## 技术说明

- 使用 Chrome Extension Manifest V3
- 使用 Google Translate API 进行翻译
- 纯原生 JavaScript 实现，无需额外依赖

## 注意事项

- 翻译功能依赖于 Google Translate API 的可用性
- 建议选择适量的文本进行翻译，避免过长的内容
- 如遇到翻译失败，可能是网络问题或 API 限制，请稍后重试

## 隐私说明

- 本扩展仅在用户主动选中文本并按下快捷键时工作
- 不会收集或存储任何用户数据
- 仅发送选中的文本到 Google Translate API 进行翻译 