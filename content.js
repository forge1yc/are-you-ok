// 初始化标志
console.log('Content script loaded');
let isInitialized = false;
let currentMode = 'hover';

// 初始化函数
function initialize() {
  if (isInitialized) return;
  
  console.log('Initializing content script');
  createTranslationStyles();
  
  // 从存储中加载翻译模式
  chrome.storage.sync.get(['translateMode'], (result) => {
    currentMode = result.translateMode || 'hover';
    console.log('Loaded translation mode:', currentMode);
  });
  
  isInitialized = true;
}

// 用于存储翻译结果的Map
let translationCache = new Map();
let isProcessing = false;

// 创建翻译样式
const createTranslationStyles = () => {
  if (document.getElementById('quick-translator-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'quick-translator-styles';
  style.textContent = `
    .quick-translator-text {
      position: relative !important;
      display: inline-block !important;
    }
    .quick-translator-translation {
      position: absolute !important;
      top: 100% !important;
      left: 0 !important;
      font-size: 14px !important;
      color: #666 !important;
      background: rgba(255, 255, 255, 0.95) !important;
      padding: 2px 4px !important;
      border-radius: 4px !important;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
      z-index: 10000 !important;
      white-space: nowrap !important;
    }
    .quick-translator-text.hover-mode .quick-translator-translation {
      display: none !important;
    }
    .quick-translator-text.hover-mode:hover .quick-translator-translation {
      display: block !important;
    }
    .quick-translator-text.full-mode .quick-translator-translation {
      display: block !important;
      position: relative !important;
      top: 0 !important;
      left: 0 !important;
      margin-top: 4px !important;
      margin-bottom: 4px !important;
    }
  `;
  document.head.appendChild(style);
  console.log('Translation styles created');
};

// 检查文本是否为英文
const isEnglishText = (text) => {
  const cleanText = text.replace(/[^a-zA-Z\s]/g, '').trim();
  return cleanText.length > 0 && /^[a-zA-Z\s]+$/.test(cleanText);
};

// 检查元素是否包含特定类名
const hasClass = (element, className) => {
  if (!element) return false;
  
  // 处理 classList
  if (element.classList) {
    return element.classList.contains(className);
  }
  
  // 处理普通 className 字符串
  if (typeof element.className === 'string') {
    return element.className.split(' ').includes(className);
  }
  
  // 处理 SVG 元素的 className
  if (element.className && element.className.baseVal) {
    return element.className.baseVal.split(' ').includes(className);
  }
  
  return false;
};

// 翻译文本
const translateText = async (text) => {
  if (translationCache.has(text)) {
    return translationCache.get(text);
  }

  try {
    console.log('Requesting translation for:', text);
    const response = await chrome.runtime.sendMessage({
      action: 'translate',
      text: text
    });

    if (response.success) {
      const translation = response.translation;
      translationCache.set(text, translation);
      console.log('Translation result:', translation);
      return translation;
    } else {
      console.error('Translation error:', response.error);
      return `[翻译失败] ${text}`;
    }
  } catch (error) {
    console.error('Translation request error:', error);
    return `[翻译失败] ${text}`;
  }
};

// 处理文本节点
const processTextNode = async (node) => {
  const text = node.textContent.trim();
  if (!text || !isEnglishText(text)) return;

  try {
    const translation = await translateText(text);
    if (!translation) return;

    const wrapper = document.createElement('span');
    wrapper.className = `quick-translator-text ${currentMode}-mode`;
    wrapper.textContent = text;

    const translationSpan = document.createElement('span');
    translationSpan.className = 'quick-translator-translation';
    translationSpan.textContent = translation;

    wrapper.appendChild(translationSpan);
    if (node.parentNode) {
      node.parentNode.replaceChild(wrapper, node);
      console.log('Text node processed:', text);
    }
  } catch (error) {
    console.error('Error processing text node:', error);
  }
};

// 遍历并处理页面文本
const processPage = async () => {
  if (isProcessing) {
    console.log('Page processing already in progress');
    return;
  }

  try {
    console.log('Starting page processing');
    isProcessing = true;
    initialize();

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          // 忽略脚本、样式和已处理的节点
          if (parent.tagName === 'SCRIPT' ||
              parent.tagName === 'STYLE' ||
              parent.tagName === 'NOSCRIPT' ||
              parent.tagName === 'IFRAME' ||
              hasClass(parent, 'quick-translator-text') ||
              hasClass(parent, 'quick-translator-translation')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }

    console.log(`Found ${textNodes.length} text nodes to process`);
    
    // 根据模式选择处理方式
    if (currentMode === 'full') {
      // 全文翻译模式：批量处理所有节点
      const batchSize = 10;
      for (let i = 0; i < textNodes.length; i += batchSize) {
        const batch = textNodes.slice(i, i + batchSize);
        await Promise.all(batch.map(node => processTextNode(node)));
      }
    } else {
      // 悬浮翻译模式：逐个处理节点
      for (const node of textNodes) {
        await processTextNode(node);
      }
    }

    console.log('Page processing completed');
  } catch (error) {
    console.error('Error processing page:', error);
  } finally {
    isProcessing = false;
  }
};

// 更新翻译模式
const updateTranslationMode = (mode) => {
  currentMode = mode;
  console.log('Translation mode updated:', mode);
  
  // 更新现有翻译元素的类名
  document.querySelectorAll('.quick-translator-text').forEach(element => {
    element.className = `quick-translator-text ${mode}-mode`;
  });
};

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  
  if (request.action === 'translate-page') {
    processPage().then(() => {
      console.log('Translation completed');
      sendResponse({ success: true });
    }).catch((error) => {
      console.error('Translation failed:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // 保持消息通道开放
  }
  
  if (request.action === 'update-mode') {
    updateTranslationMode(request.mode);
    sendResponse({ success: true });
  }
});

// 初始化
initialize(); 
initialize(); 