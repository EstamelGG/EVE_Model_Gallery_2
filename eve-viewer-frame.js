import {createViewerRuntime} from './viewer-runtime.mjs?v=d7de0dd71fe048ce';
import {createViewerTransition} from './viewer-transition.mjs?v=d7de0dd71fe048ce';
import {createCatalogLoader} from './catalog-loader.mjs?v=d7de0dd71fe048ce';
import {configureResourceBase,resourceURL} from './resource-location.mjs?v=d7de0dd71fe048ce';
import {normalizeRenderSettings,renderDefaultsForDNA} from './render-settings.mjs?v=d7de0dd71fe048ce';
import {normalizeDisplaySettings} from './display-settings.mjs?v=d7de0dd71fe048ce';
import {createResourceBatch} from './resource-activity.mjs?v=d7de0dd71fe048ce';
import {normalizeKillCount} from './kill-count.mjs?v=d7de0dd71fe048ce';
const batch=createResourceBatch();
const $=id=>document.getElementById(id),parentOrigin=new URL(document.referrer||location.href).origin;
const send=(type,value,id,error)=>parent.postMessage({channel:'eve-viewer',type,value,id,error},parentOrigin);
const json=async url=>{const response=await fetch(url);if(!response.ok)throw Error(`Resource ${response.status}: ${url}`);return response.json();};
let options={},index,loader,base,api,settings,lastError,revision=0,currentItem,backgroundTask;
let fittingData,loadedItem;
const runtime=createViewerRuntime({mount:$('mount'),transition:createViewerTransition($('stage'),$('snapshot')),
 loadRenderer:async()=>api=await import('./vendor/model-viewer-ao.min.js?v=d7de0dd71fe048ce'),view:{
  dimensionFrame:$('dimensions'),label:item=>item.name?.zh||item.name?.en||String(item.id),
  settings:()=>settings,batch:()=>batch,dimensions(){},
  progress:phase=>{$('status').textContent=`加载中 · ${phase}/5`;send('progress',{phase,total:5});},
  begin(){lastError=null;},reset(){},connected(){},installed(){},
  environment(viewer,module){
   backgroundTask=(async()=>{const catalog=await viewer.assetSession.json('data/backgrounds.json');
    if(runtime.viewer!==viewer)return;
    viewer.lifecycle.set('skybox',module.createSkybox(viewer,catalog,viewer.previewRace));
    await viewer.skybox.select(options.background||'auto');})();
   backgroundTask.catch(()=>{});return backgroundTask;
  },
  ready(){},failed({error}){lastError=error||Error('Model loading failed');},
 }});
function placements(){
 const fitting=runtime.viewer?.fitting;
 return fitting?fitting.slots.flatMap(({slot})=>{const entry=fitting.get(slot);return entry?[{slot,itemId:entry.id,nativeSlot:entry.nativeSlot,locatorName:entry.prefix,mounts:entry.mounts.map(m=>m.name)}]:[];}):[];
}
function renderPanel(){
 const panel=$('panel');panel.hidden=!options.controlPanel;panel.replaceChildren();
 if(panel.hidden)return;
 const heading=document.createElement('h2');heading.textContent='渲染设置';panel.append(heading);
 const checkbox=(label,key)=>{const row=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=!!options[key];row.append(label,input);input.onchange=()=>update({[key]:input.checked});panel.append(row);};
 checkbox('特效','effects');checkbox('查看白模','whiteModel');checkbox('自动旋转','autoRotate');
 for(const [key,label,min,max] of [['exposure','亮度',.1,3],['reflection','反射',0,3],['bloom','辉光',0,3]]){
  const row=document.createElement('label'),input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.step=.1;input.value=settings.render[key];row.append(label,input);input.oninput=()=>update({render:{...options.render,[key]:Number(input.value)}});panel.append(row);
 }
 const row=document.createElement('label'),select=document.createElement('select');
 for(const [value,label] of [['auto','自动'],['none','关闭'],['smaa','SMAA'],['msaa2','MSAA 2×'],['msaa4','MSAA 4×'],['msaa8','MSAA 8×']])select.add(new Option(label,value));
 select.value=settings.display.antialiasMode;select.onchange=()=>update({display:{...options.display,antialiasMode:select.value}});row.append('抗锯齿',select);panel.append(row);
}
function update(patch){
 options={...options,...patch};
 settings.render=normalizeRenderSettings({...renderDefaultsForDNA(currentItem.dna),...options.render});
 settings.display=normalizeDisplaySettings({...options.display,effects:options.effects,noColor:options.whiteModel});
 runtime.applyRenderSettings(settings.render);runtime.applyDisplaySettings(settings.display);
 runtime.viewer.autoRotate=!!options.autoRotate;send('settings-change',patch);
}
async function configure(next){
 const token=++revision;options={background:'auto',effects:true,whiteModel:false,autoRotate:false,controlPanel:false,...next};
 const config=await json(new URL('./site-config.json',import.meta.url)).catch(()=>({}));
 if(token!==revision)throw new DOMException('Superseded','AbortError');
 const nextBase=options.resourceBase||config.resourceBaseURL||'https://models.vanquisher.online/';
 if(base!==nextBase){runtime.close();base=nextBase;loadedItem=null;index=null;fittingData=null;
  configureResourceBase(base,options.resourceBase?'':config.backgroundBaseURL,options.resourceBase?undefined:config.backgroundFiles);}
 if(!index){index=await json(resourceURL('data/catalog-index.json'));loader=createCatalogLoader(index,url=>json(resourceURL(url)),item=>{for(const key of ['model','effects','thumbnail','render','image'])if(typeof item[key]==='string')item[key]=resourceURL(item[key]);return item;});}
 const itemId=Number(options.itemId);if(!Number.isSafeInteger(itemId)||itemId<=0)throw Error('item-id must be a positive integer');
 const item=await loader.item(itemId);if(!item?.model)throw Error(`No model for item ${itemId}`);
 if(item.groupID===963&&!item.subsystemParts)throw Error('This prototype requires an assembled T3 item');
 if(token!==revision)throw new DOMException('Superseded','AbortError');
 currentItem=item;settings={nativePreview:index.nativePreview,background:options.background,
  render:normalizeRenderSettings({...renderDefaultsForDNA(item.dna),...options.render}),
  display:normalizeDisplaySettings({...options.display,effects:options.effects,noColor:options.whiteModel}),
  killCount:normalizeKillCount(options.killCount),autoRotate:!!options.autoRotate};
 if(loadedItem!==item.id){
  if(!await runtime.show(item))throw lastError||new DOMException('Superseded','AbortError');
  loadedItem=item.id;
 }else{
  runtime.applyRenderSettings(settings.render);runtime.applyDisplaySettings(settings.display);
  runtime.viewer.killCount=settings.killCount;runtime.viewer.setKillCount?.(settings.killCount);
  runtime.viewer.autoRotate=settings.autoRotate;
  backgroundTask=runtime.viewer.skybox?.select(options.background);
 }
 await backgroundTask;
 if(token!==revision)throw new DOMException('Superseded','AbortError');
 const viewer=runtime.viewer;
 if(options.fitting?.equipment?.length||viewer.fitting){
  fittingData ||= await viewer.assetSession.json('data/fitting.json');
  if(fittingData.version!==2)throw Error('Fitting metadata version 2 is required');
  const locators=fittingData.ships?.[item.id];if(!locators?.length)throw Error('No compatible equipment mounts');
  const equipment=fittingData.equipment.filter(item=>item.supported!==false);
  if(!viewer.fitting)viewer.lifecycle.set('fitting',api.installFitting(viewer,{locators,equipment,
   settings:await viewer.assetSession.json(index.nativePreview),hullCategory:item.categoryID}));
  const desired=options.fitting?.equipment||[],used=new Set();
  for(const entry of desired){if(!Number.isSafeInteger(entry.slot)||used.has(entry.slot))throw Error('Invalid or duplicate logical equipment slot');used.add(entry.slot);}
  // Each existing set() commits a complete planned layout and retains it on error.
  for(const row of viewer.fitting.slots)if(!used.has(row.slot)&&viewer.fitting.get(row.slot))await viewer.fitting.set(row.slot,null);
  for(const entry of desired){if(token!==revision)throw new DOMException('Superseded','AbortError');await viewer.fitting.set(entry.slot,entry.itemId);}
  viewer.fitting.setDeployed(options.fitting?.deployed!==false);viewer.fitting.setEditing(!!options.showHardpoints);
 }
 runtime.applyDisplaySettings(settings.display);renderPanel();$('status').textContent='';
 const result={itemId:item.id,placements:placements()};send('load',result);return result;
}
window.addEventListener('message',async event=>{
 if(event.source!==parent||event.origin!==parentOrigin||event.data?.channel!=='eve-viewer')return;
 const {id,method,value}=event.data;
 try{
  let result;
  if(method==='configure')result=await configure(value);
  else if(method==='placements')result=placements();
  else if(method==='equipment')result=(fittingData?.equipment||[]).filter(item=>runtime.viewer?.fitting?.canFit(value,item)).map(({id,name})=>({id,name}));
  else if(method==='export-model')result=await runtime.exportModel(value);
  else if(method==='export-skybox')result=runtime.exportSkybox();
  else throw Error('Unknown viewer method');
  send('result',result,id);
 }catch(error){if(error.name!=='AbortError')$('status').textContent=error.message;send('result',null,id,{name:error.name,message:error.message||'Model loading failed'});}
});
window.addEventListener('pagehide',()=>{runtime.close();batch.stop();});
send('frame-ready');
