/**
 * i18n.js — Empire of Clouds
 *
 * 1. Reads the selected language from localStorage('lang').
 * 2. Fetches /i18n/{lang}.json when lang !== 'en'.
 * 3. Replaces innerHTML / placeholder / aria-label on every
 *    [data-i18n], [data-i18n-placeholder], [data-i18n-aria] element.
 * 4. Watches document.documentElement.dataset.lang (set by index.js
 *    on entry-screen confirm) and persists the choice to localStorage.
 * 5. Pre-selects the correct language button on the entry screen.
 */
// Expose a promise that resolves when translations are ready
window.i18nReady = (async function () {
  const SUPPORTED = ['en', 'fr', 'tr', 'zh', 'ja'];
  const DEFAULT   = 'en';

  // ── Resolve current language ──────────────────────────────────────
  function storedLang() {
    const s = localStorage.getItem('lang');
    return SUPPORTED.includes(s) ? s : DEFAULT;
  }

  const lang = storedLang();
  document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : lang;

  // ── Watch for entry-screen language selection (index.html) ────────
  // index.js sets document.documentElement.dataset.lang on confirm.
  // We intercept that mutation and save the choice to localStorage.
  new MutationObserver(mutations => {
    for (const m of mutations) {
      if (m.attributeName === 'data-lang') {
        const chosen = document.documentElement.dataset.lang;
        if (chosen && SUPPORTED.includes(chosen)) {
          localStorage.setItem('lang', chosen);
        }
      }
    }
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-lang']
  });

  // ── Pre-select the stored language button on the entry screen ─────
  function preselectLangBtn() {
    const btns = document.querySelectorAll('.entryOption[data-lang]');
    if (!btns.length) return;
    const current = storedLang();
    btns.forEach(btn =>
      btn.classList.toggle('selected', btn.dataset.lang === current)
    );
  }

  // ── Key resolver (dot-notation) ───────────────────────────────────
  function get(t, key) {
    return key.split('.').reduce(
      (o, k) => (o != null ? o[k] : undefined),
      t
    );
  }

  // ── Apply translations to DOM ─────────────────────────────────────
  function apply(t) {
    if (t) {
      // innerHTML (supports embedded HTML tags)
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const v = get(t, el.dataset.i18n);
        if (v != null) el.innerHTML = v;
      });

      // placeholder attributes (form inputs)
      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const v = get(t, el.dataset.i18nPlaceholder);
        if (v != null) el.placeholder = v;
      });

      // aria-label attributes
      document.querySelectorAll('[data-i18n-aria]').forEach(el => {
        const v = get(t, el.dataset.i18nAria);
        if (v != null) el.setAttribute('aria-label', v);
      });

      // <title> element
      const titleEl = document.querySelector('title[data-i18n]');
      if (titleEl) {
        const v = get(t, titleEl.dataset.i18n);
        if (v != null) document.title = v;
      }
    }

    preselectLangBtn();
  }

  // ── Fetch translations (only when non-English) ────────────────────
  let translations = null;
  if (lang !== DEFAULT) {
    try {
      const res = await fetch(`/i18n/${lang}.json`);
      if (res.ok) translations = await res.json();
      else console.warn('[i18n] HTTP', res.status, 'for', lang);
    } catch (e) {
      console.warn('[i18n] fetch failed:', e);
    }
  }

  // ── Expose a global getter for accessing translations ────────────────
  window.i18n = {
    get: function(key) {
      return get(translations, key) || key;
    }
  };

  // ── Run after DOM is ready ────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => apply(translations));
  } else {
    apply(translations);
  }

  return true; // Signal that i18n is ready
})();
