// 监听快捷键命令
console.log('Background script loaded');

chrome.commands.onCommand.addListener(async (command) => {
  console.log('Command received:', command);
  
  if (command === 'translate-page') {
    console.log('Translate command triggered');
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('Current tab:', tab);
    
    if (tab) {
      try {
        // 注入内容脚本
        console.log('Injecting content script...');
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        console.log('Content script injected');
        
        // 注入样式
        console.log('Injecting CSS...');
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['content.css']
        });
        console.log('CSS injected');
        
        // 发送消息触发翻译
        console.log('Sending translate message...');
        await chrome.tabs.sendMessage(tab.id, { action: 'translate-page' });
        console.log('Message sent');
      } catch (error) {
        console.error('Error in background script:', error);
      }
    }
  }
});

// 监听扩展安装事件
chrome.runtime.onInstalled.addListener(() => {
  console.log('扩展已安装');
});

// 监听扩展图标点击事件
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked');
  try {
    // 注入内容脚本
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    
    // 注入样式
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['content.css']
    });
    
    // 发送消息触发翻译
    await chrome.tabs.sendMessage(tab.id, { action: 'translate-page' });
  } catch (error) {
    console.error('Error handling icon click:', error);
  }
}); 