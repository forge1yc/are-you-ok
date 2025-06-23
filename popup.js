document.addEventListener('DOMContentLoaded', () => {
  // 获取模式选择的单选按钮
  const modeInputs = document.querySelectorAll('input[name="translateMode"]');
  
  // 从存储中加载保存的模式
  chrome.storage.sync.get(['translateMode'], (result) => {
    const savedMode = result.translateMode || 'hover';
    document.querySelector(`input[value="${savedMode}"]`).checked = true;
  });

  // 监听模式变化
  modeInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      const mode = e.target.value;
      // 保存选择的模式
      chrome.storage.sync.set({ translateMode: mode });
      
      // 通知当前标签页模式已更改
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'update-mode',
          mode: mode 
        });
      });
    });
  });

  // 处理自定义快捷键链接点击
  document.getElementById('customizeShortcut').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });
}); 