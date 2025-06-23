// 使用立即执行函数表达式避免全局变量冲突
(function() {
  // 创建命名空间
  const WordTranslator = {
    isInitialized: false,
    translationCache: new Map(),
    translationContainer: null,
    debounceTimer: null,
    lastWord: null,
    lastPosition: { x: 0, y: 0 },

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
        opacity: 0;
        transition: opacity 0.2s ease-out;
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
      // 使用节流的mousemove处理
      document.addEventListener('mousemove', (e) => {
        // 计算鼠标移动距离
        const distance = Math.sqrt(
          Math.pow(e.clientX - this.lastPosition.x, 2) +
          Math.pow(e.clientY - this.lastPosition.y, 2)
        );

        // 更新最后位置
        this.lastPosition = { x: e.clientX, y: e.clientY };

        // 如果移动距离小于5像素，不触发新的检测
        if (distance < 5) return;

        // 清除之前的定时器
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }

        // 设置新的定时器
        this.debounceTimer = setTimeout(() => {
          this.handleMouseMove(e);
        }, 100); // 100ms的防抖延迟
      });

      document.addEventListener('mouseout', this.handleMouseOut.bind(this));
    },

    // 处理鼠标移动
    handleMouseMove(event) {
      const word = this.getWordAtPoint(event.clientX, event.clientY);
      
      // 如果没有检测到单词，隐藏翻译并重置状态
      if (!word) {
        this.hideTranslation();
        this.lastWord = null;
        return;
      }

      // 如果是同一个单词，不做处理
      if (word === this.lastWord) {
        return;
      }

      // 如果不是英文单词，隐藏翻译
      if (!this.isEnglishWord(word)) {
        this.hideTranslation();
        this.lastWord = null;
        return;
      }

      // 更新最后处理的单词
      this.lastWord = word;
      this.translateAndShow(word, event.clientX, event.clientY);
    },

    // 处理鼠标移出
    handleMouseOut(event) {
      // 检查是否真的离开了页面元素
      if (!event.relatedTarget) {
        this.hideTranslation();
        this.lastWord = null;
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }
      }
    },

    // 获取指定位置的单词
    getWordAtPoint(x, y) {
      const element = document.elementFromPoint(x, y);
      if (!element || !element.textContent) return null;

      // 如果鼠标在输入框或文本区域上，不显示翻译
      if (element.tagName === 'INPUT' || 
          element.tagName === 'TEXTAREA' || 
          element.isContentEditable) {
        return null;
      }

      // 获取鼠标位置的文本节点和偏移量
      let range = document.caretRangeFromPoint(x, y);
      if (!range) return null;

      // 扩展选区到单词边界
      try {
        range.expand('word');
        const word = range.toString().trim();
        
        // 如果是空白或者太长，返回null
        if (!word || word.length > 50 || /^\s*$/.test(word)) {
          return null;
        }

        return word;
      } catch (e) {
        console.error('Error expanding range:', e);
        return null;
      }
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

      // 平滑过渡
      container.style.transition = 'all 0.2s ease-out';

      // 计算位置，确保在视口内
      const containerRect = container.getBoundingClientRect();
      let left = x + 10;
      let top = y + 10;

      if (left + containerRect.width > window.innerWidth) {
        left = x - containerRect.width - 10;
      }

      if (top + containerRect.height > window.innerHeight) {
        top = y - containerRect.height - 10;
      }

      container.style.left = `${left}px`;
      container.style.top = `${top}px`;
      container.style.display = 'block';
      container.style.opacity = '1';
    },

    // 隐藏翻译
    hideTranslation() {
      if (this.translationContainer) {
        this.translationContainer.style.opacity = '0';
        setTimeout(() => {
          if (this.translationContainer.style.opacity === '0') {
            this.translationContainer.style.display = 'none';
            // 重置最后处理的单词
            this.lastWord = null;
          }
        }, 200);
      }
    }
  };

  // 初始化
  console.log('Content script loaded');
  WordTranslator.initialize();
})(); 