import './eve-model-viewer.js?v=fcc16a8bca1d0ed2';

const $=id=>document.getElementById(id);
const baseline={itemId:587,background:'none',controlPanel:false,whiteModel:false,effects:true,autoRotate:false,showHardpoints:false,killCount:0,render:{exposure:.7,reflection:.7,bloom:.2,sun:1,fill:1,f0:1,roughness:1,dirt:1,depthOfField:1},display:{antialiasMode:'auto',occlusion:true,bloom:true,depthOfField:false,textures:{}},fitting:{deployed:true,equipment:[]}};
const cases=[
 {id:'minimal',title:'最简嵌入',description:'只传入飞船 ID 和高度。587 使用完整材质，关闭背景，作为最基础的展示窗口。',options:{},code:`<eve-model-viewer
  item-id="587"
  background="none"
  style="height:500px">
</eve-model-viewer>`},
 {id:'controls',title:'原版视觉控制区',description:'加一个布尔属性，显示原版视觉设置。用户可自己调整背景、画质、白模与光照参数。',options:{controlPanel:true},code:`<eve-model-viewer
  item-id="587"
  background="none"
  control-panel
  style="height:600px">
</eve-model-viewer>`},
 {id:'background',title:'背景与自动旋转',description:'自动选择与船体匹配的背景，并缓慢旋转模型。适合物品介绍、飞船展示和详情页。',options:{background:'auto',autoRotate:true},code:`<eve-model-viewer
  item-id="587"
  background="auto"
  auto-rotate
  style="height:500px">
</eve-model-viewer>`},
 {id:'white',title:'查看白模',description:'使用白模观察结构。贴图资源仍然保留；运行后，可从控制区随时切回完整材质。',options:{whiteModel:true,controlPanel:true},code:`<eve-model-viewer
  item-id="587"
  background="none"
  white-model
  control-panel
  style="height:600px">
</eve-model-viewer>`},
 {id:'quality',title:'调整反射与抗锯齿',description:'通过属性指定渲染参数。这里选择 SMAA 并降低反射强度；auto 则沿用原版默认抗锯齿策略。',options:{render:{reflection:.3},display:{antialiasMode:'smaa'}},code:`<eve-model-viewer
  item-id="587"
  background="none"
  reflection="0.3"
  antialias="smaa"
  style="height:500px">
</eve-model-viewer>`},
 {id:'turrets',title:'普通炮塔自动挂载 · 587 + 484',description:'为裂谷级安装两组 125mm 加特林自动加农炮 I。只给逻辑槽和装备 ID，组件自动分配兼容炮塔挂点。',options:{fitting:{deployed:true,equipment:[{slot:1,itemId:484},{slot:2,itemId:484}]}},code:`<eve-model-viewer id="ship" item-id="587"
  background="none" style="height:500px">
</eve-model-viewer>
<script type="module">
  import './eve-model-viewer.js?v=fcc16a8bca1d0ed2';
  await document.querySelector('#ship').configure({
    fitting: { equipment: [
      { slot: 1, itemId: 484 },
      { slot: 2, itemId: 484 }
    ] }
  });
</script>`},
 {id:'launchers',title:'特殊装备自动挂载 · 12032 + 503',description:'为蝎尾怪级安装两组鱼雷发射器 I。组件读取装备的发射器类型，匹配 locator_launcher_，无需手填角度或位置。',options:{itemId:12032,fitting:{deployed:true,equipment:[{slot:1,itemId:503},{slot:2,itemId:503}]}},code:`<eve-model-viewer id="bomber" item-id="12032"
  background="none" style="height:500px">
</eve-model-viewer>
<script type="module">
  import './eve-model-viewer.js?v=fcc16a8bca1d0ed2';
  const viewer = document.querySelector('#bomber');
  await viewer.configure({
    fitting: { equipment: [
      { slot: 1, itemId: 503 },
      { slot: 2, itemId: 503 }
    ] }
  });
  console.log(await viewer.getPlacements());
</script>`}
];
for(const [index,example] of cases.entries()){
 const card=document.createElement('article');card.className='example-card';card.id='example-'+example.id;
 const heading=document.createElement('div');heading.className='example-heading';
 const number=document.createElement('span');number.textContent=String(index+1).padStart(2,'0');
 const run=document.createElement('button');run.type='button';run.dataset.run=example.id;run.textContent='运行案例 ↗';run.onclick=()=>runCase(example.id,true);
 heading.append(number,run);
 const title=document.createElement('h3');title.textContent=example.title;
 const description=document.createElement('p');description.textContent=example.description;
 const block=document.createElement('div');block.className='code-block';
 const bar=document.createElement('div');bar.className='code-heading';
 const language=document.createElement('span');language.textContent=example.id==='turrets'||example.id==='launchers'?'HTML + JavaScript':'HTML';
 const copy=document.createElement('button');copy.type='button';copy.className='text-button';copy.dataset.copy='code-'+example.id;copy.textContent='复制代码';bar.append(language,copy);
 const pre=document.createElement('pre'),code=document.createElement('code');code.id='code-'+example.id;code.textContent=example.code;pre.append(code);block.append(bar,pre);card.append(heading,title,description,block);$('example-list').append(card);
}
let viewer,resourceBase,caseRevision=0,toastTimer;
function message(text){$('copy-status').textContent=text;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('copy-status').textContent='',2800);}
async function initialize(){
 // The documentation uses the site's resource configuration for local previews.
 // Copied examples and the component itself keep the production CDN default.
 try{const response=await fetch('./site-config.json');if(response.ok)resourceBase=(await response.json()).resourceBaseURL;}catch{}
 viewer=document.createElement('eve-model-viewer');viewer.setAttribute('item-id','587');viewer.setAttribute('background','none');
 if(resourceBase)viewer.setAttribute('resource-base',resourceBase);
 viewer.addEventListener('progress',({detail})=>{$('preview-status').textContent=`加载中 · ${detail.phase}/${detail.total}`;});
 viewer.addEventListener('error',({detail})=>{$('preview-status').textContent=`加载失败：${detail.message}`;$('preview-status').dataset.error='true';});
 $('preview-mount').replaceChildren(viewer);
 await Promise.resolve();
 await runCase('minimal');
}
async function runCase(id,scroll=false){
 const example=cases.find(value=>value.id===id);if(!example||!viewer)return;
 const token=++caseRevision;
 const options={...structuredClone(baseline),...structuredClone(example.options),resourceBase,
  render:{...baseline.render,...example.options.render},display:{...baseline.display,...example.options.display}};
 $('case-name').textContent=example.title;$('preview-status').textContent='正在应用案例…';delete $('preview-status').dataset.error;
 $('placement-details').hidden=true;$('placement-details').open=false;$('preview-mounts').hidden=true;$('preview-mounts').setAttribute('aria-pressed','false');
 for(const card of document.querySelectorAll('.example-card'))card.classList.toggle('active',card.id==='example-'+id);
 for(const button of document.querySelectorAll('[data-run]'))button.setAttribute('aria-pressed',String(button.dataset.run===id));
 if(scroll)document.querySelector('.playground').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
 try{
  const result=await viewer.configure(options);if(token!==caseRevision)return;
  $('preview-status').textContent=`飞船 ${result.itemId} · ${result.placements.length} 个逻辑装备槽 · 拖动旋转，滚轮缩放`;
  $('preview-mounts').hidden=!result.placements.length;$('placement-details').hidden=!result.placements.length;$('placement-output').textContent=JSON.stringify(result.placements,null,2);
 }catch(error){if(token===caseRevision&&error.name!=='AbortError'){$('preview-status').textContent=`加载失败：${error.message}`;$('preview-status').dataset.error='true';}}
}
$('preview-reset').onclick=()=>viewer?.resetView();
$('preview-mounts').onclick=async()=>{
 const button=$('preview-mounts'),showHardpoints=button.getAttribute('aria-pressed')!=='true';button.disabled=true;
 try{await viewer.configure({showHardpoints});button.setAttribute('aria-pressed',String(showHardpoints));}catch(error){if(error.name!=='AbortError')message(error.message);}finally{button.disabled=false;}
};
document.addEventListener('click',async event=>{
 const copy=event.target.closest('[data-copy]'),download=event.target.closest('[data-download]');
 if(copy){try{await navigator.clipboard.writeText($(copy.dataset.copy).textContent);message('代码已复制');}catch{message('无法自动复制，请手动选中代码复制。');}}
 if(download){const blob=new Blob([$(download.dataset.download).textContent],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='eve-model-demo.html';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
});
const observer=new IntersectionObserver(entries=>{const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];if(!visible)return;for(const link of document.querySelectorAll('.docs-nav>a')){if(link.hash==='#'+visible.target.id)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');}},{rootMargin:'-15% 0px -65% 0px',threshold:0});
for(const section of document.querySelectorAll('main>section[id]'))observer.observe(section);
initialize().catch(error=>{$('preview-status').textContent=`初始化失败：${error.message}`;});
