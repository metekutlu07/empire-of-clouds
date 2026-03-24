/**
 * i18n.js — Empire of Clouds
 *
 * 1. On page load, fetches the stored language (localStorage 'lang').
 * 2. index.js can call window.i18n.load(lang) at any time.
 * 3. window.i18nReady is a Promise that resolves when translations load.
 * 4. window.i18n.get(key) returns the translation or null, never the raw key.
 */
(function () {
  const SUPPORTED = ['en', 'fr', 'tr', 'zh', 'ja'];
  const DEFAULT = 'en';
  let translations = null;
  let currentLang = DEFAULT;

  function translationUrl(lang) {
    return new URL(`i18n/${lang}.json`, window.location.href).toString();
  }

  function storedLang() {
    const s = localStorage.getItem('lang');
    return SUPPORTED.includes(s) ? s : DEFAULT;
  }

  function resolve(t, key) {
    return key.split('.').reduce((o, k) => (o != null ? o[k] : undefined), t);
  }

  function captureDefaults() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      if (el.dataset.i18nDefault == null) {
        el.dataset.i18nDefault = el.innerHTML;
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      if (el.dataset.i18nPlaceholderDefault == null) {
        el.dataset.i18nPlaceholderDefault = el.getAttribute('placeholder') || '';
      }
    });

    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      if (el.dataset.i18nAriaDefault == null) {
        el.dataset.i18nAriaDefault = el.getAttribute('aria-label') || '';
      }
    });

    const titleEl = document.querySelector('title[data-i18n]');
    if (titleEl && titleEl.dataset.i18nDefault == null) {
      titleEl.dataset.i18nDefault = titleEl.textContent || '';
    }
  }

  function applyToDOM(t) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const v = t ? resolve(t, el.dataset.i18n) : null;
      if (v != null) {
        el.innerHTML = v;
      } else if (el.dataset.i18nDefault != null) {
        el.innerHTML = el.dataset.i18nDefault;
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const v = t ? resolve(t, el.dataset.i18nPlaceholder) : null;
      if (v != null) {
        el.placeholder = v;
      } else if (el.dataset.i18nPlaceholderDefault != null) {
        el.placeholder = el.dataset.i18nPlaceholderDefault;
      }
    });

    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const v = t ? resolve(t, el.dataset.i18nAria) : null;
      if (v != null) {
        el.setAttribute('aria-label', v);
      } else if (el.dataset.i18nAriaDefault != null) {
        el.setAttribute('aria-label', el.dataset.i18nAriaDefault);
      }
    });

    const titleEl = document.querySelector('title[data-i18n]');
    if (titleEl) {
      const v = t ? resolve(t, titleEl.dataset.i18n) : null;
      document.title = v != null ? v : (titleEl.dataset.i18nDefault || titleEl.textContent || '');
    }
  }

  function preselectLangBtn() {
    const btns = document.querySelectorAll('.entryOption[data-lang]');
    if (!btns.length) return;
    const current = storedLang();
    btns.forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.lang === current);
    });
  }

  async function loadLang(lang) {
    currentLang = SUPPORTED.includes(lang) ? lang : DEFAULT;
    translations = null;

    if (currentLang !== DEFAULT) {
      try {
        const res = await fetch(translationUrl(currentLang), { cache: 'no-cache' });
        if (res.ok) {
          translations = await res.json();
        } else {
          console.warn('[i18n] HTTP', res.status, 'for', currentLang);
        }
      } catch (e) {
        console.warn('[i18n] fetch failed:', e);
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        captureDefaults();
        applyToDOM(translations);
        preselectLangBtn();
      }, { once: true });
    } else {
      captureDefaults();
      applyToDOM(translations);
      preselectLangBtn();
    }

    window.dispatchEvent(new CustomEvent('i18n:updated', {
      detail: { lang: currentLang, translations }
    }));

    return true;
  }

  const api = {
    get(key) {
      const val = resolve(translations, key);
      return val != null ? val : null;
    },
    current() {
      return currentLang;
    },
    load(lang) {
      const nextLang = SUPPORTED.includes(lang) ? lang : DEFAULT;
      localStorage.setItem('lang', nextLang);
      document.documentElement.lang = nextLang === 'zh' ? 'zh-Hans' : nextLang;
      window.i18nReady = loadLang(nextLang);
      return window.i18nReady;
    }
  };
  window.i18n = api;

  const initialLang = storedLang();
  currentLang = initialLang;
  document.documentElement.lang = currentLang === 'zh' ? 'zh-Hans' : currentLang;
  window.i18nReady = loadLang(initialLang);
})();
