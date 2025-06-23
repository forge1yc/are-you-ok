// 使用立即执行函数表达式避免全局变量冲突
(function() {
  // 创建命名空间
  const WordTranslator = {
    isInitialized: false,
    translationCache: new Map(),
    translationContainer: null,

    // 初始化函数
    initialize() {
      if (this.isInitialized) return;
      
      console.log('Initializing WordTranslator');
      this.createTranslationContainer();
      this.setupEventListeners();
      this.isInitialized = true;
    },

    // 创建翻译容器
    createTranslationContainer() {
      if (document.getElementById('word-translation-container')) return;

      const container = document.createElement('div');
      container.id = 'word-translation-container';
      container.style.cssText = `
        position: fixed;
        display: none;
        background: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        font-size: 14px;
        line-height: 1.4;
        z-index: 2147483647;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        pointer-events: none;
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        max-width: 300px;
        word-wrap: break-word;
      `;

      const originalText = document.createElement('div');
      originalText.className = 'original-word';
      originalText.style.cssText = `
        color: rgba(255, 255, 255, 0.7);
        font-size: 12px;
        margin-bottom: 4px;
      `;

      const translatedText = document.createElement('div');
      translatedText.className = 'translated-word';
      translatedText.style.cssText = `
        color: white;
        font-weight: 500;
      `;

      container.appendChild(originalText);
      container.appendChild(translatedText);
      document.body.appendChild(container);
      this.translationContainer = container;
    },

    // 设置事件监听器
    setupEventListeners() {
      document.addEventListener('mousemove', this.handleMouseMove.bind(this));
      document.addEventListener('mouseout', this.handleMouseOut.bind(this));
    },

    // 处理鼠标移动
    handleMouseMove(event) {
      // 获取鼠标位置的单词
      const word = this.getWordAtPoint(event.clientX, event.clientY);
      if (!word) {
        this.hideTranslation();
        return;
      }

      // 检查是否是英文单词
      if (this.isEnglishWord(word)) {
        this.translateAndShow(word, event.clientX, event.clientY);
      } else {
        this.hideTranslation();
      }
    },

    // 处理鼠标移出
    handleMouseOut(event) {
      if (!event.relatedTarget) {
        this.hideTranslation();
      }
    },

    // 获取指定位置的单词
    getWordAtPoint(x, y) {
      const element = document.elementFromPoint(x, y);
      if (!element || !element.textContent) return null;

      // 如果是文本节点
      if (element.nodeType === Node.TEXT_NODE) {
        return this.getWordFromPosition(element, x, y);
      }

      // 获取元素中的文本节点
      const textNode = Array.from(element.childNodes)
        .find(node => node.nodeType === Node.TEXT_NODE);
      
      if (textNode) {
        return this.getWordFromPosition(textNode, x, y);
      }

      // 如果元素本身就是一个单词
      const text = element.textContent.trim();
      if (text.split(/\s+/).length === 1) {
        return text;
      }

      return null;
    },

    // 从位置获取单词
    getWordFromPosition(textNode, x, y) {
      const range = document.createRange();
      range.selectNodeContents(textNode);
      
      const textRect = range.getBoundingClientRect();
      if (x < textRect.left || x > textRect.right || 
          y < textRect.top || y > textRect.bottom) {
        return null;
      }

      const text = textNode.textContent;
      const words = text.match(/\b\w+\b/g) || [];
      
      // 找到最接近鼠标位置的单词
      let closestWord = null;
      let minDistance = Infinity;

      words.forEach(word => {
        const wordRange = document.createRange();
        const startIndex = text.indexOf(word);
        const endIndex = startIndex + word.length;
        
        wordRange.setStart(textNode, startIndex);
        wordRange.setEnd(textNode, endIndex);
        
        const rect = wordRange.getBoundingClientRect();
        const distance = Math.abs(x - (rect.left + rect.width / 2));
        
        if (distance < minDistance) {
          minDistance = distance;
          closestWord = word;
        }
      });

      return closestWord;
    },

    // 检查是否是英文单词
    isEnglishWord(word) {
      return /^[a-zA-Z]{2,}$/.test(word);
    },

    // 翻译并显示
    async translateAndShow(word, x, y) {
      if (!word) return;

      let translation = this.translationCache.get(word);
      if (!translation) {
        try {
          translation = await this.translateWord(word);
          if (translation) {
            this.translationCache.set(word, translation);
          }
        } catch (error) {
          console.error('Translation error:', error);
          return;
        }
      }

      if (translation) {
        this.showTranslation(word, translation, x, y);
      }
    },

    // 翻译单词
    async translateWord(word) {
      try {
        const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(word)}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data[0][0][0];
      } catch (error) {
        console.error('Translation error:', error);
        return null;
      }
    },

    // 显示翻译
    showTranslation(word, translation, x, y) {
      const container = this.translationContainer;
      if (!container) return;

      const originalText = container.querySelector('.original-word');
      const translatedText = container.querySelector('.translated-word');

      originalText.textContent = word;
      translatedText.textContent = translation;

      // 计算位置，确保在视口内
      const containerRect = container.getBoundingClientRect();
      let left = x + 10; // 鼠标右侧10px
      let top = y + 10;  // 鼠标下方10px

      // 确保不超出右边界
      if (left + containerRect.width > window.innerWidth) {
        left = x - containerRect.width - 10;
      }

      // 确保不超出下边界
      if (top + containerRect.height > window.innerHeight) {
        top = y - containerRect.height - 10;
      }

      container.style.left = `${left}px`;
      container.style.top = `${top}px`;
      container.style.display = 'block';
    },

    // 隐藏翻译
    hideTranslation() {
      if (this.translationContainer) {
        this.translationContainer.style.display = 'none';
      }
    }
  };

  // 初始化
  console.log('Content script loaded');
  WordTranslator.initialize();
})(); 