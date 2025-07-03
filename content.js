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
    settings: {
      en2zhEnabled: true,
      zh2enEnabled: true
    },

    // 初始化函数
    initialize() {
      if (this.isInitialized) return;
      
      console.log('Initializing WordTranslator');
      this.loadSettings();
      this.createTranslationContainer();
      this.setupEventListeners();
      this.isInitialized = true;
    },

    // 加载设置
    async loadSettings() {
      const result = await chrome.storage.sync.get(['en2zhEnabled', 'zh2enEnabled']);
      this.settings.en2zhEnabled = result.en2zhEnabled !== false;
      this.settings.zh2enEnabled = result.zh2enEnabled !== false;

      // 监听设置变化
      chrome.storage.onChanged.addListener((changes) => {
        if (changes.en2zhEnabled) {
          this.settings.en2zhEnabled = changes.en2zhEnabled.newValue;
        }
        if (changes.zh2enEnabled) {
          this.settings.zh2enEnabled = changes.zh2enEnabled.newValue;
        }
      });
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

      const phoneticText = document.createElement('div');
      phoneticText.className = 'phonetic-text';
      phoneticText.style.cssText = `
        color: rgba(255, 255, 255, 0.6);
        font-size: 12px;
        margin-top: 4px;
        font-style: italic;
      `;

      container.appendChild(originalText);
      container.appendChild(translatedText);
      container.appendChild(phoneticText);
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
      const text = this.getTextAtPoint(event.clientX, event.clientY);
      
      // 如果没有检测到文本，隐藏翻译并重置状态
      if (!text) {
        this.hideTranslation();
        this.lastWord = null;
        return;
      }

      // 如果是同一个文本，不做处理
      if (text === this.lastWord) {
        return;
      }

      // 根据文本类型和设置决定是否翻译
      const isEnglish = this.isEnglishWord(text);
      const isChinese = this.isChineseText(text);

      if ((isEnglish && !this.settings.en2zhEnabled) || 
          (isChinese && !this.settings.zh2enEnabled) ||
          (!isEnglish && !isChinese)) {
        this.hideTranslation();
        this.lastWord = null;
        return;
      }

      // 更新最后处理的文本
      this.lastWord = text;
      this.translateAndShow(text, event.clientX, event.clientY);
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

    // 获取指定位置的文本
    getTextAtPoint(x, y) {
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
        const text = range.toString().trim();
        
        // 如果是空白或者太长，返回null
        if (!text || text.length > 50 || /^\s*$/.test(text)) {
          return null;
        }

        return text;
      } catch (e) {
        console.error('Error expanding range:', e);
        return null;
      }
    },

    // 检查是否是英文单词
    isEnglishWord(text) {
      return /^[a-zA-Z]{2,}$/.test(text);
    },

    // 检查是否是中文文本
    isChineseText(text) {
      return /^[\u4e00-\u9fa5]{1,}$/.test(text);
    },

    // 翻译并显示
    async translateAndShow(text, x, y) {
      if (!text) return;

      let translation = this.translationCache.get(text);
      if (!translation) {
        try {
          translation = await this.translateText(text);
          if (translation) {
            this.translationCache.set(text, translation);
          }
        } catch (error) {
          console.error('Translation error:', error);
          return;
        }
      }

      if (translation) {
        this.showTranslation(text, translation, x, y);
      }
    },

    // 翻译文本
    async translateText(text) {
      const isEnglish = this.isEnglishWord(text);
      const apiUrl = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
      
      if (isEnglish) {
        try {
          const response = await fetch(apiUrl + text);
          const data = await response.json();
          
          if (Array.isArray(data) && data.length > 0) {
            const entry = data[0];
            const meaning = entry.meanings[0]?.definitions[0]?.definition || '';
            const phonetic = entry.phonetic || entry.phonetics?.[0]?.text || '';
            return {
              translation: meaning,
              phonetic: phonetic,
              type: 'en2zh'
            };
          }
        } catch (error) {
          console.error('Dictionary API error:', error);
        }
      }

      // 如果是中文或者英文词典查询失败，使用翻译API
      const targetLang = isEnglish ? 'zh' : 'en';
      try {
        const response = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + targetLang + '&dt=t&q=' + encodeURIComponent(text));
        const data = await response.json();
        return {
          translation: data[0][0][0],
          phonetic: '',
          type: isEnglish ? 'en2zh' : 'zh2en'
        };
      } catch (error) {
        console.error('Translation API error:', error);
        return null;
      }
    },

    // 显示翻译
    showTranslation(text, translationData, x, y) {
      const container = this.translationContainer;
      if (!container) return;

      const originalTextElem = container.querySelector('.original-word');
      const translatedTextElem = container.querySelector('.translated-word');
      const phoneticTextElem = container.querySelector('.phonetic-text');

      originalTextElem.textContent = text;
      translatedTextElem.textContent = translationData.translation;
      phoneticTextElem.textContent = translationData.phonetic || '';

      // 计算位置
      const rect = container.getBoundingClientRect();
      const margin = 15; // 与鼠标的间距
      
      // 初始位置在鼠标右下方
      let posX = x + margin;
      let posY = y + margin;

      // 确保不超出视窗
      if (posX + rect.width > window.innerWidth) {
        posX = x - rect.width - margin; // 切换到左侧
      }
      if (posY + rect.height > window.innerHeight) {
        posY = y - rect.height - margin; // 切换到上方
      }

      // 应用位置
      container.style.left = posX + 'px';
      container.style.top = posY + 'px';
      container.style.display = 'block';
      
      // 使用 requestAnimationFrame 来确保过渡动画正常工作
      requestAnimationFrame(() => {
        container.style.opacity = '1';
      });
    },

    // 隐藏翻译
    hideTranslation() {
      const container = this.translationContainer;
      if (container) {
        container.style.opacity = '0';
        setTimeout(() => {
          if (container.style.opacity === '0') {
            container.style.display = 'none';
          }
        }, 200);
      }
    }
  };

  // 初始化翻译器
  WordTranslator.initialize();
})(); 