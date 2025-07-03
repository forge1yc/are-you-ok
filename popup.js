document.addEventListener('DOMContentLoaded', () => {
  const en2zhSwitch = document.getElementById('en2zh');
  const zh2enSwitch = document.getElementById('zh2en');

  // 从存储中读取开关状态
  chrome.storage.sync.get(['en2zhEnabled', 'zh2enEnabled'], (result) => {
    en2zhSwitch.checked = result.en2zhEnabled !== false; // 默认为true
    zh2enSwitch.checked = result.zh2enEnabled !== false; // 默认为true
  });

  // 监听开关变化
  en2zhSwitch.addEventListener('change', () => {
    chrome.storage.sync.set({ en2zhEnabled: en2zhSwitch.checked });
  });

  zh2enSwitch.addEventListener('change', () => {
    chrome.storage.sync.set({ zh2enEnabled: zh2enSwitch.checked });
  });
}); 