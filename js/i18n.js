(function () {
  const STORAGE_KEY = 'lang';
  const SUPPORTED = ['en', 'zh'];
  const DEFAULT_LANG = 'en';

  /** All translatable static-shell strings live here. Project cards and popups
   * are loaded from sibling `.zh.json` / `.zh.html` files instead, so this
   * dictionary stays small and focused on the index shell + modal chrome. */
  const DICT = {
    en: {
      'pageTitle': 'Henry Guo',
      'nav.langEn': 'EN',
      'nav.langZh': '中',
      'hero.title.html': 'Zehao <span class="hero-name-mid">(Henry)</span> Guo',
      'hero.sub.line1': 'BS Applied Mathematics @ UIUC (Aug 2020 – Dec 2024)',
      'hero.sub.line2': 'MS Data Science @ Northeastern (Jan 2025 – Present)',
      'hero.sub.tagline':
        'I build data pipelines and analytics systems. I generally use the tools that work best for the task at hand. I aim to support environmental understanding and improve quality of life.',
      'hero.links.linkedin': 'LinkedIn',
      'hero.links.github': 'GitHub',
      'hero.links.email': 'Email',
      'section.projects': 'Projects',
      'section.hobbies': 'Hobbies',
      'hobbies.text':
        'I love playing tennis (NTRP rating ≈ 3.5); I enjoy playing GO (Weiqi, Baduk); and my favorite author is George R.R. Martin',
      'modal.close': 'Close project details',
      'modal.overview': 'Overview',
      'modal.highlights': 'Highlights',
      'modal.stack': 'Stack',
      'modal.viewGithub': 'View on GitHub',
      'modal.unavailable': 'Project details are temporarily unavailable.',
      'projects.error':
        'Projects could not be loaded. Try refreshing the page.',
      'projects.error.fileHelp':
        ' Opening this file directly (file://) blocks loading project data in most browsers. From the site folder run a local server, e.g. python3 -m http.server 8000, then open http://localhost:8000',
      'aria.hobbies': 'Hobbies',
      'aria.langGroup': 'Language',
      'aria.langEn': 'Switch to English',
      'aria.langZh': '切换到简体中文',
    },
    zh: {
      'pageTitle': '郭泽灏',
      'nav.langEn': 'EN',
      'nav.langZh': '中',
      'hero.title.html': '郭泽灏 <span class="hero-name-mid">(Henry)</span>',
      'hero.sub.line1': '应用数学学士 @ UIUC（2020 年 8 月 – 2024 年 12 月）',
      'hero.sub.line2': '数据科学硕士 @ Northeastern（2025 年 1 月 – 至今）',
      'hero.sub.tagline':
        '我搭建数据管道与分析系统，通常按任务选择最合适的工具。希望我的工作能够帮助理解大自然、改善生活质量。',
      'hero.links.linkedin': '领英',
      'hero.links.github': 'GitHub',
      'hero.links.email': '邮箱',
      'section.projects': '项目',
      'section.hobbies': '兴趣',
      'hobbies.text':
        '我喜欢打网球（NTRP 评级 ≈ 3.5）；爱下围棋；最喜欢的作家是 George R.R. Martin。',
      'modal.close': '关闭项目详情',
      'modal.overview': '概览',
      'modal.highlights': '亮点',
      'modal.stack': '技术栈',
      'modal.viewGithub': '在 GitHub 上查看',
      'modal.unavailable': '项目详情暂时无法加载。',
      'projects.error': '项目无法加载，请尝试刷新页面。',
      'projects.error.fileHelp':
        ' 直接以 file:// 方式打开本文件会被多数浏览器阻止加载项目数据。请在站点目录下启动本地服务器（例如 python3 -m http.server 8000），然后访问 http://localhost:8000',
      'aria.hobbies': '兴趣',
      'aria.langGroup': '语言',
      'aria.langEn': 'Switch to English',
      'aria.langZh': '切换到简体中文',
    },
  };

  function detectInitialLang() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED.indexOf(saved) !== -1) return saved;
    } catch {}
    const nav = (navigator.language || '').toLowerCase();
    if (nav.indexOf('zh') === 0) return 'zh';
    return DEFAULT_LANG;
  }

  let currentLang = detectInitialLang();
  window.__lang = currentLang;

  function t(key) {
    const table = DICT[currentLang] || DICT[DEFAULT_LANG];
    if (key in table) return table[key];
    const fallback = DICT[DEFAULT_LANG];
    return key in fallback ? fallback[key] : '';
  }

  /** Walks the DOM and applies translations for:
   *  - data-i18n="key"           → textContent
   *  - data-i18n-html="key"      → innerHTML (use sparingly, only for trusted dict entries)
   *  - data-i18n-attr="attr:key,attr:key" → arbitrary attribute(s)
   */
  function applyTranslations(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      el.textContent = t(key);
    });
    scope.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const key = el.getAttribute('data-i18n-html');
      if (!key) return;
      el.innerHTML = t(key);
    });
    scope.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      const spec = el.getAttribute('data-i18n-attr');
      if (!spec) return;
      spec.split(',').forEach((pair) => {
        const idx = pair.indexOf(':');
        if (idx <= 0) return;
        const attr = pair.slice(0, idx).trim();
        const key = pair.slice(idx + 1).trim();
        if (!attr || !key) return;
        el.setAttribute(attr, t(key));
      });
    });

    document.documentElement.setAttribute('lang', currentLang === 'zh' ? 'zh-Hans' : 'en');
    if (document.title !== t('pageTitle')) {
      document.title = t('pageTitle');
    }

    document.querySelectorAll('.lang-switcher [data-lang]').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === currentLang);
      btn.setAttribute('aria-pressed', btn.getAttribute('data-lang') === currentLang ? 'true' : 'false');
    });
  }

  function setLang(next) {
    if (SUPPORTED.indexOf(next) === -1) return;
    if (next === currentLang) return;
    currentLang = next;
    window.__lang = currentLang;
    try { localStorage.setItem(STORAGE_KEY, currentLang); } catch {}
    applyTranslations();
    if (typeof window.rerenderProjects === 'function') {
      window.rerenderProjects();
    }
  }

  function getLang() { return currentLang; }

  function bindSwitcher() {
    const switcher = document.querySelector('.lang-switcher');
    if (!switcher) return;
    switcher.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-lang]');
      if (!btn) return;
      const next = btn.getAttribute('data-lang');
      if (next) setLang(next);
    });
  }

  function init() {
    applyTranslations();
    bindSwitcher();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.__i18n = { t, setLang, getLang, applyTranslations };
})();
