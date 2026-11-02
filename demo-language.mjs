import {siteLocale,browserLocale,languagePreference,saveLanguagePreference,languageStorageKey} from './locale.mjs?v=d0cb198114894f1b';
import {messages} from './messages.mjs?v=d0cb198114894f1b';
let preference=languagePreference(),locale=siteLocale();
export const demoText=(key,values={})=>(messages[key]?.[locale==='en'?1:0]??key).replace(/\{(\w+)\}/g,(_,name)=>values[name]??'');
const selector=document.createElement('select');selector.id='demo-language';
selector.innerHTML='<option value="auto">Automatic</option><option value="zh-CN">Chinese</option><option value="en">English</option>';
selector.style.cssText='background:#182630;color:#d4e0e7;border:1px solid #647987;padding:6px;font:12px sans-serif';
const navigation=document.querySelector('nav');
if(navigation)navigation.append(selector);else{selector.style.cssText+=';position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:5';document.body.append(selector);}
function apply(){
 document.documentElement.lang=locale;selector.value=preference;selector.setAttribute('aria-label',demoText('language'));selector.options[0].textContent=demoText('languageAuto');selector.options[1].textContent=demoText('languageChinese');
 document.title=demoText(location.pathname.includes('demo-config')?'demoConfigTitle':'demoTitle');
 for(const [id,key] of [['white','demoWhiteModel'],['panel','demoControls'],['fit','demoFit']]){const node=document.getElementById(id);if(node)node.textContent=demoText(key);}
 if(navigation)navigation.querySelector('a').textContent=demoText('demoMinimal');
 window.dispatchEvent(new Event('demo-language-change'));
}
selector.onchange=()=>{preference=selector.value;saveLanguagePreference(preference);locale=preference==='auto'?browserLocale():preference;apply();};
window.addEventListener('storage',event=>{if(event.key===languageStorageKey||event.key===null){preference=languagePreference();locale=siteLocale();apply();}});
window.addEventListener('languagechange',()=>{if(preference==='auto'){locale=browserLocale();apply();}});
apply();
