// 翻译函数
async function translateText(text) {
  // 备用接口
  const endpoints = [
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=`,
    `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=zh-CN&q=`,
    `https://translate.google.com/translate_a/single?client=at&sl=en&tl=zh-CN&dt=t&q=`
  ];

  // 添加随机延迟以避免请求过于频繁
  const randomDelay = () => new Promise(resolve => 
    setTimeout(resolve, Math.random() * 200 + 100)
  );

  // 重试次数和延迟
  const maxRetries = 3;
  const retryDelay = 1000; // 1秒

  for (let retry = 0; retry < maxRetries; retry++) {
    for (const baseUrl of endpoints) {
      try {
        // 添加随机延迟
        await randomDelay();
        
        console.log(`Translating text (attempt ${retry + 1}):`, text);
        const response = await fetch(baseUrl + encodeURIComponent(text));

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        let translation;

        // 处理不同接口的返回格式
        if (Array.isArray(data) && data[0] && Array.isArray(data[0])) {
          // 第一种格式：[[["译文","原文"]]]
          translation = data[0][0][0];
        } else if (Array.isArray(data?.sentences)) {
          // 第二种格式：{sentences:[{trans:"译文"}]}
          translation = data.sentences.map(s => s.trans).join(' ');
        } else if (typeof data === 'string') {
          // 第三种格式：直接返回译文
          translation = data;
        } else {
          throw new Error('Invalid translation response format');
        }

        if (translation) {
          console.log('Translation result:', translation);
          return translation;
        }
      } catch (error) {
        console.error(`Translation error (endpoint ${endpoints.indexOf(baseUrl)}, attempt ${retry + 1}):`, error);
        
        // 如果是最后一次重试的最后一个接口，则抛出错误
        if (retry === maxRetries - 1 && baseUrl === endpoints[endpoints.length - 1]) {
          throw error;
        }
        
        // 否则等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  throw new Error('All translation attempts failed');
}

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
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details);
  if (details.reason === 'install') {
    // 打开快捷键设置页面
    chrome.tabs.create({
      url: 'chrome://extensions/shortcuts'
    });
  }
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

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    translateText(request.text)
      .then(translation => sendResponse({ success: true, translation }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持消息通道开放
  }
}); 