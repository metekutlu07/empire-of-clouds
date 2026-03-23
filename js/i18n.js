/**
 * i18n.js — Empire of Clouds
 *
 * 1. On page load, fetches the stored language (localStorage 'lang').
 * 2. On entry-screen confirm, index.js sets dataset.lang on <html>.
 *    We watch this, re-fetch the chosen language, and re-apply to DOM.
 * 3. window.i18nReady is a Promise that resolves when translations load.
 *    index.js awaits this before starting animation sequences.
 * 4. window.i18n.get(key) returns the translation or null — never the
 *    raw key string, so index.js fallbacks ("|| English text") work.
 */
(function () {
  const SUPPORTED = ['en', 'fr', 'tr', 'zh', 'ja'];
  const DEFAULT   = 'en';
  let translations = null;

  // ── Helpers ───────────────────────────────────────────────────────
  function storedLang() {
    const s = localStorage.getItem('lang');
    return SUPPORTED.includes(s) ? s : DEFAULT;
  }

  function resolve(t, key) {
    return key.split('.').reduce((o, k) => (o != null ? o[k] : undefined), t);
  }

  function applyToDOM(t) {
    if (!t) return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const v = resolve(t, el.dataset.i18n);
      if (v != null) el.innerHTML = v;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const v = resolve(t, el.dataset.i18nPlaceholder);
      if (v != null) el.placeholder = v;
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const v = resolve(t, el.dataset.i18nAria);
      if (v != null) el.setAttribute('aria-label', v);
    });
    const titleEl = document.querySelector('title[data-i18n]');
    if (titleEl) {
      const v = resolve(t, titleEl.dataset.i18n);
      if (v != null) document.title = v;
    }
  }

  function preselectLangBtn() {
    const btns = document.querySelectorAll('.entryOption[data-lang]');
    if (!btns.length) return;
    const current = storedLang();
    btns.forEach(btn =>
      btn.classList.toggle('selected', btn.dataset.lang === current)
    );
  }

  // ── Load a language (fetch JSON, update translations, apply to DOM) ─
  async function loadLang(lang) {
    translations = null;
    if (lang !== DEFAULT) {
      try {
        const res = await fetch(`/i18n/${lang}.json`);
        if (res.ok) translations = await res.json();
        else console.warn('[i18n] HTTP', res.status, 'for', lang);
      } catch (e) {
        console.warn('[i18n] fetch failed:', e);
      }
    }

    // Refresh the global getter with the new translations
    window.i18n = {
      get: function (key) {
        const val = resolve(translations, key);
        return val != null ? val : null; // null, not key — so || fallbacks in callers work
      }
    };

    // Apply to DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        applyToDOM(translations);
        preselectLangBtn();
      });
    } else {
      applyToDOM(translations);
      preselectLangBtn();
    }

    return true;
  }

  // ── Expose early so callers don't need to guard against undefined ─
  window.i18n = { get: () => null };

  // ── Initial page load ─────────────────────────────────────────────
  const initialLang = storedLang();
  document.documentElement.lang = initialLang === 'zh' ? 'zh-Hans' : initialLang;
  window.i18nReady = loadLang(initialLang);

  // ── Watch for entry-screen confirm (index.js sets dataset.lang) ───
  // On confirm, re-fetch the newly chosen language and re-apply to DOM.
  // window.i18nReady is updated so index.js can await it.
  new MutationObserver(mutations => {
    for (const m of mutations) {
      if (m.attributeName === 'data-lang') {
        const chosen = document.documentElement.dataset.lang;
        if (chosen && SUPPORTED.includes(chosen)) {
          localStorage.setItem('lang', chosen);
          document.documentElement.lang = chosen === 'zh' ? 'zh-Hans' : chosen;
          window.i18nReady = loadLang(chosen);
        }
      }
    }
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-lang']
  });

})();
