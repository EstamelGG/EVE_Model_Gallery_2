import {guideCopy,caseCopy} from './viewer-guide-copy.mjs?v=3d1da1d840c92b10';
import {siteLocale,browserLocale,languagePreference,saveLanguagePreference,languageStorageKey} from './locale.mjs?v=3d1da1d840c92b10';

const $=id=>document.getElementById(id);
let preference=languagePreference(),locale=siteLocale(),currentCase='minimal',previewState={kind:'initial'},viewer,resourceBase,caseRevision=0,toastTimer;
const en=()=>locale==='en';
const text=(zh,english)=>en()?english:zh;
const caseTitle=example=>en()?caseCopy[example.id][0]:example.title;
const caseDescription=example=>en()?caseCopy[example.id][1]:example.description;
const codeSources=new Map();
const codeEnglish=value=>value.replaceAll('lang="zh-CN"','lang="en"');
function updateStatus(){
 const {kind,phase,total,result,error}=previewState;
 $('preview-status').textContent=kind==='progress'?text(`加载中 · ${phase}/${total}`,`Loading · ${phase}/${total}`):kind==='loaded'?text(`飞船 ${result.itemId} · ${result.placements.length} 个逻辑装备槽 · 拖动旋转，滚轮缩放`,`Ship ${result.itemId} · ${result.placements.length} logical slots · Drag to orbit, scroll to zoom`):kind==='error'?text(`加载失败：${error}`,`Loading failed: ${error}`):kind==='applying'?text('正在应用案例…','Applying example…'):text('准备加载飞船 587','Preparing ship 587');
}
function status(kind,data={}){previewState={kind,...data};updateStatus();}
function applyLanguage(){
 document.documentElement.lang=locale;document.title=text('EVE 模型组件 · 使用指南','EVE model component · Guide');
 for(const node of document.querySelectorAll('[data-guide-i18n]'))node.innerHTML=guideCopy[node.dataset.guideI18n][en()?1:0];
 $('guide-language').value=preference;$('language-label').textContent=text('语言','Language');$('guide-language').options[0].textContent=text('自动识别','Automatic');
 document.querySelector('.guide-header nav').setAttribute('aria-label',text('页面导航','Page navigation'));
 document.querySelector('.docs-nav').setAttribute('aria-label',text('指南目录','Guide contents'));
 document.querySelector('meta[name="description"]').content=text('EVE 模型标签使用指南：引入一个 JS，在自己的网页中展示飞船、背景、特效和自动挂载装备。','Embed EVE models with one JavaScript file. Working examples for ships, visual settings and automatic equipment mounting.');
 for(const example of cases){const card=$('example-'+example.id);if(!card)continue;card.querySelector('h3').textContent=caseTitle(example);card.querySelector('p').textContent=caseDescription(example);card.querySelector('[data-run]').textContent=text('运行案例 ↗','Run example ↗');card.querySelector('[data-copy]').textContent=text('复制代码','Copy code');}
 for(const code of document.querySelectorAll('pre>code')){if(!codeSources.has(code.id))codeSources.set(code.id,code.textContent);code.textContent=en()?codeEnglish(codeSources.get(code.id)):codeSources.get(code.id);}
 $('case-name').textContent=caseTitle(cases.find(example=>example.id===currentCase));
 viewer?.setAttribute('lang',locale);updateStatus();
}

const baseline={itemId:587,background:'none',controlPanel:false,whiteModel:false,effects:true,autoRotate:false,showHardpoints:false,killCount:0,render:{exposure:.7,reflection:.7,bloom:.2,sun:1,fill:1,f0:1,roughness:1,dirt:1,depthOfField:1},display:{antialiasMode:'auto',occlusion:true,bloom:true,depthOfField:false,textures:{}},equipment:[]};
const cases=[
 {id:'minimal',title:'最简嵌入',description:'飞船 587，关闭背景。',options:{},code:`<eve-model-viewer
  item-id="587"
  background="none"
  style="height:500px">
</eve-model-viewer>`},
 {id:'controls',title:'原版视觉控制区',description:'显示原版视觉设置，可调整画质、白模和光照。',options:{controlPanel:true},code:`<eve-model-viewer
  item-id="587"
  background="none"
  control-panel
  style="height:600px">
</eve-model-viewer>`},
 {id:'background',title:'背景与自动旋转',description:'自动选择背景，缓慢旋转模型。',options:{background:'auto',autoRotate:true},code:`<eve-model-viewer
  item-id="587"
  background="auto"
  auto-rotate
  style="height:500px">
</eve-model-viewer>`},
 {id:'white',title:'查看白模',description:'查看白模，在控制区可切回完整材质。',options:{whiteModel:true,controlPanel:true},code:`<eve-model-viewer
  item-id="587"
  background="none"
  white-model
  control-panel
  style="height:600px">
</eve-model-viewer>`},
 {id:'quality',title:'调整反射与抗锯齿',description:'使用 SMAA，将反射强度设为 0.3。',options:{render:{reflection:.3},display:{antialiasMode:'smaa'}},code:`<eve-model-viewer
  item-id="587"
  background="none"
  reflection="0.3"
  antialias="smaa"
  style="height:500px">
</eve-model-viewer>`},
 {id:'turrets',title:'普通炮塔自动挂载 · 587 + 484',description:'裂谷级安装两组 125mm 加特林自动加农炮 I。',options:{equipment:[484,484]},code:`<eve-model-viewer
  item-id="587"
  equipment="[484,484]"
  background="none"
  style="height:500px">
</eve-model-viewer>`},
 {id:'launchers',title:'特殊装备自动挂载 · 12032 + 503',description:'蝎尾怪级安装两组鱼雷发射器 I，自动匹配发射器挂点。',options:{itemId:12032,equipment:[503,503]},code:`<eve-model-viewer
  item-id="12032"
  equipment="[503,503]"
  background="none"
  style="height:500px">
</eve-model-viewer>`}
];
for(const [index,example] of cases.entries()){
 const card=document.createElement('article');card.className='example-card';card.id='example-'+example.id;
 const heading=document.createElement('div');heading.className='example-heading';
 const number=document.createElement('span');number.textContent=String(index+1).padStart(2,'0');
 const run=document.createElement('button');run.type='button';run.dataset.run=example.id;run.textContent=text('运行案例 ↗','Run example ↗');run.onclick=()=>runCase(example.id,true);
 heading.append(number,run);
 const title=document.createElement('h3');title.textContent=caseTitle(example);
 const description=document.createElement('p');description.textContent=caseDescription(example);
 const block=document.createElement('div');block.className='code-block';
 const bar=document.createElement('div');bar.className='code-heading';
 const language=document.createElement('span');language.textContent='HTML';
 const copy=document.createElement('button');copy.type='button';copy.className='text-button';copy.dataset.copy='code-'+example.id;copy.textContent=text('复制代码','Copy code');bar.append(language,copy);
 const pre=document.createElement('pre'),code=document.createElement('code');code.id='code-'+example.id;code.textContent=example.code;pre.append(code);block.append(bar,pre);card.append(heading,title,description,block);$('example-list').append(card);
}

function message(text){$('copy-status').textContent=text;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('copy-status').textContent='',2800);}
async function initialize(){
 await import('./eve-model-viewer.js?v=3d1da1d840c92b10');
 // The documentation uses the site's resource configuration for local previews.
 // Copied examples and the component itself keep the production CDN default.
 try{const response=await fetch('./site-config.json');if(response.ok)resourceBase=(await response.json()).resourceBaseURL;}catch{}
 viewer=document.createElement('eve-model-viewer');viewer.setAttribute('item-id','587');viewer.setAttribute('background','none');viewer.setAttribute('lang',locale);
 if(resourceBase)viewer.setAttribute('resource-base',resourceBase);
 viewer.addEventListener('progress',({detail})=>status('progress',detail));
 viewer.addEventListener('error',({detail})=>{status('error',{error:detail.message});$('preview-status').dataset.error='true';});
 $('preview-mount').replaceChildren(viewer);
 document.querySelector('#preview-reset svg').replaceWith(viewer.shadowRoot.querySelector('#reset svg').cloneNode(true));
 await Promise.resolve();
 await runCase('minimal');
}
async function runCase(id,scroll=false){
 const example=cases.find(value=>value.id===id);if(!example||!viewer)return;
 const token=++caseRevision;
 const options={...structuredClone(baseline),...structuredClone(example.options),resourceBase,
  render:{...baseline.render,...example.options.render},display:{...baseline.display,...example.options.display}};
 currentCase=id;$('case-name').textContent=caseTitle(example);status('applying');delete $('preview-status').dataset.error;
 $('placement-details').hidden=true;$('placement-details').open=false;$('preview-mounts').hidden=true;$('preview-mounts').setAttribute('aria-pressed','false');
 for(const card of document.querySelectorAll('.example-card'))card.classList.toggle('active',card.id==='example-'+id);
 for(const button of document.querySelectorAll('[data-run]'))button.setAttribute('aria-pressed',String(button.dataset.run===id));
 if(scroll)document.querySelector('.playground').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
 try{
  const result=await viewer.configure(options);if(token!==caseRevision)return;
  status('loaded',{result});
  $('preview-mounts').hidden=!result.placements.length;$('placement-details').hidden=!result.placements.length;$('placement-output').textContent=JSON.stringify(result.placements,null,2);
 }catch(error){if(token===caseRevision&&error.name!=='AbortError'){status('error',{error:error.message});$('preview-status').dataset.error='true';}}
}
$('preview-reset').onclick=()=>viewer?.resetView();
$('preview-mounts').onclick=async()=>{
 const button=$('preview-mounts'),showHardpoints=button.getAttribute('aria-pressed')!=='true';button.disabled=true;
 try{await viewer.configure({showHardpoints});button.setAttribute('aria-pressed',String(showHardpoints));}catch(error){if(error.name!=='AbortError')message(error.message);}finally{button.disabled=false;}
};
document.addEventListener('click',async event=>{
 const copy=event.target.closest('[data-copy]'),download=event.target.closest('[data-download]');
 if(copy){try{await navigator.clipboard.writeText($(copy.dataset.copy).textContent);message(text('代码已复制','Code copied'));}catch{message(text('无法自动复制，请手动选中代码复制。','Clipboard unavailable. Select the code and copy it manually.'));}}
 if(download){const blob=new Blob([$(download.dataset.download).textContent],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='eve-model-demo.html';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
});
const observer=new IntersectionObserver(entries=>{const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];if(!visible)return;for(const link of document.querySelectorAll('.docs-nav>a')){if(link.hash==='#'+visible.target.id)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');}},{rootMargin:'-15% 0px -65% 0px',threshold:0});
for(const section of document.querySelectorAll('main>section[id]'))observer.observe(section);
$('guide-language').onchange=()=>{preference=$('guide-language').value;saveLanguagePreference(preference);locale=preference==='auto'?browserLocale():preference;applyLanguage();};
window.addEventListener('storage',event=>{if(event.key===languageStorageKey||event.key===null){preference=languagePreference();locale=siteLocale();applyLanguage();}});
window.addEventListener('languagechange',()=>{if(preference==='auto'){preference=languagePreference();locale=siteLocale();applyLanguage();}});
applyLanguage();
initialize().catch(error=>status('error',{error:error.message}));
