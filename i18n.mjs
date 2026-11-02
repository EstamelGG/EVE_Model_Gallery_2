import {siteLocale,browserLocale,languagePreference,saveLanguagePreference,languageStorageKey} from './locale.mjs?v=39b269378ac17ed1';
import {messages} from './messages.mjs?v=39b269378ac17ed1';

const storageKey = languageStorageKey;
let preference=languagePreference();
export let locale = siteLocale();

export function t(key, values = {}) {
  const text = messages[key]?.[locale === 'en' ? 1 : 0] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
}

export function localizedName(names) {
  return names?.[locale === 'en' ? 'en' : 'zh'] || names?.en || names?.zh || '';
}

export function setLocale(value) {
  if (!['auto','zh-CN','en'].includes(value)) return;
  preference=value;saveLanguagePreference(value);
  locale = value==='auto'?browserLocale():value;
  applyTranslations();
}
window.addEventListener('storage',event=>{if(event.key===storageKey||event.key===null){preference=languagePreference();locale=siteLocale();applyTranslations();}});
window.addEventListener('languagechange',()=>{if(preference==='auto'){preference=languagePreference();locale=siteLocale();applyTranslations();}});

export function applyTranslations() {
  document.documentElement.lang = locale;
  for (const element of document.querySelectorAll('[data-i18n]')) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const attribute of ['aria-label', 'placeholder', 'title']) {
    for (const element of document.querySelectorAll(`[data-i18n-${attribute}]`)) {
      element.setAttribute(attribute, t(element.getAttribute(`data-i18n-${attribute}`)));
    }
  }
  for (const select of document.querySelectorAll('[data-language]')) select.value = preference;
}

