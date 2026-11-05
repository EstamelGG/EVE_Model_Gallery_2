export const languageStorageKey='ccpdec-language';
export const supportedLocales=['zh-CN','en'];
export function browserLocale(languages=globalThis.navigator?.languages?.length?globalThis.navigator.languages:[globalThis.navigator?.language]){
 const preferred=languages.find(value=>/^(zh|en)(-|$)/i.test(value||''))||'en';
 return /^zh(-|$)/i.test(preferred)?'zh-CN':'en';
}
export function languagePreference(storage){try{storage??=globalThis.localStorage;const value=storage?.getItem(languageStorageKey);return supportedLocales.includes(value)?value:'auto';}catch{return 'auto';}}
export function siteLocale(){const choice=languagePreference();return choice==='auto'?browserLocale():choice;}
export function saveLanguagePreference(choice){if(!['auto',...supportedLocales].includes(choice))return;try{if(choice==='auto')globalThis.localStorage?.removeItem(languageStorageKey);else globalThis.localStorage?.setItem(languageStorageKey,choice);}catch{}}
// Embeds inherit their page language without reading the site's storage.
export function componentLocale(choice,inherited=globalThis.document?.documentElement?.lang){
 const value=choice&&choice!=='auto'?choice:inherited;
 if(/^zh(-|$)/i.test(value||''))return 'zh-CN';
 if(/^en(-|$)/i.test(value||''))return 'en';
 return browserLocale();
}
