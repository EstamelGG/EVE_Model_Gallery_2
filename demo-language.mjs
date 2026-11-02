import {siteLocale,browserLocale,languagePreference,saveLanguagePreference,languageStorageKey} from './locale.mjs?v=3a05d216c0ea8c0d';
let preference=languagePreference(),locale=siteLocale();
export const demoText=(zh,en)=>locale==='en'?en:zh;
const selector=document.createElement('select');selector.id='demo-language';
selector.innerHTML='<option value="auto">Automatic</option><option value="zh-CN">中文</option><option value="en">English</option>';
selector.style.cssText='background:#182630;color:#d4e0e7;border:1px solid #647987;padding:6px;font:12px sans-serif';
const navigation=document.querySelector('nav');
if(navigation)navigation.append(selector);else{selector.style.cssText+=';position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:5';document.body.append(selector);}
function apply(){
 document.documentElement.lang=locale;selector.value=preference;selector.setAttribute('aria-label',demoText('语言','Language'));selector.options[0].textContent=demoText('自动识别','Automatic');
 document.title=location.pathname.includes('demo-config')?demoText('EVE 标签 · 参数与装备示例','EVE component · Settings and equipment'):demoText('EVE 模型标签 · 最小示例','EVE model component · Minimal example');
 for(const [id,zh,en] of [['white','切换白模','Toggle white model'],['panel','切换控制区','Toggle controls'],['fit','安装鱼雷发射器 II','Fit Torpedo Launcher II']]){const node=document.getElementById(id);if(node)node.textContent=demoText(zh,en);}
 if(navigation)navigation.querySelector('a').textContent=demoText('最小示例','Minimal example');
 window.dispatchEvent(new Event('demo-language-change'));
}
selector.onchange=()=>{preference=selector.value;saveLanguagePreference(preference);locale=preference==='auto'?browserLocale():preference;apply();};
window.addEventListener('storage',event=>{if(event.key===languageStorageKey||event.key===null){preference=languagePreference();locale=siteLocale();apply();}});
window.addEventListener('languagechange',()=>{if(preference==='auto'){locale=browserLocale();apply();}});
apply();
