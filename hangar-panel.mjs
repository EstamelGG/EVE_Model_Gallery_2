import {loadJSON} from './resource-activity.mjs?v=9ef3d531955fac58';
import {resourceURL} from './resource-location.mjs?v=9ef3d531955fac58';

export const supportsHangar=item=>!!item?.available&&[3,6,65].includes(item.categoryID);
export function createHangarPanel({root,currentViewer,currentItem,translate:t,name,catalog,nativeSettings,background,loading}){
 const $=id=>root.querySelector('#'+id),saved=new Map();
 let context=null,metadata=null,pendingMetadata=null,ships=null,revision=0;
 const state=()=>{const id=currentItem()?.id;if(!saved.has(id))saved.set(id,{room:'',mode:'dock',ship:638});return saved.get(id);};
 const valid=c=>c===context&&c.viewer===currentViewer()&&c.item.id===currentItem()?.id;
 const status=key=>$('hangar-status').textContent=key?t(key):'';
 function loadingTask(viewer){
  const task=loading?.beginTask('hangarLoading');
  const progress=event=>task?.progress(({document:2,geometry:2,materials:3,lighting:4,effects:4,ready:5})[event.detail.split(':').at(-1)]||2);
  const plan=event=>task?.plan(event.detail);
  viewer.addEventListener('hangar-progress',progress);viewer.addEventListener('hangar-resource-plan',plan);
  return ()=>{viewer.removeEventListener('hangar-progress',progress);viewer.removeEventListener('hangar-resource-plan',plan);task?.finish();};
 }
 function restoreSelection(c){const actual=c.viewer.hangar?.selection||{room:''};Object.assign(state(),Object.fromEntries(Object.entries(actual).filter(([,value])=>value!==undefined)));render();}
 async function metadataReady(){
  pendingMetadata ||= loadJSON(resourceURL('data/hangars.json')).then(value=>{if(value.version!==1)throw Error('Unsupported hangars');metadata=value;return value;}).catch(error=>{pendingMetadata=null;throw error;});
  return pendingMetadata;
 }
 function shipOptions(){
  const s=state(),query=$('hangar-ship-search').value.trim().toLowerCase();
  $('hangar-ship').replaceChildren(...(ships||[]).filter(i=>i.id===s.ship||!query||`${i.id} ${i.name?.zh} ${i.name?.en}`.toLowerCase().includes(query)).map(i=>new Option(name(i.name),String(i.id))));
  $('hangar-ship').value=String(s.ship);
 }
 function render(){
  const s=state(),item=currentItem(),building=item?.categoryID!==6;
  $('hangar-room').replaceChildren(new Option(t('hangarSpace'),''),...(metadata?.hangars||[]).map(room=>new Option(name(room.name),room.key)));
  $('hangar-room').value=s.room;
  $('hangar-mode-row').hidden=!building||!s.room;$('hangar-ship-controls').hidden=!building||!s.room||s.mode!=='dock';
  $('hangar-mode').value=s.mode;shipOptions();$('hangar-room').disabled=!context||!metadata;
 }
 async function apply(){
  const c=context;if(!c||!valid(c))return;
  const token=++revision,s={...state()};status('hangarLoading');
  const finish=loadingTask(c.viewer);
  try{
   await metadataReady();const room=metadata.hangars.find(r=>r.key===s.room);
   const ship=room&&c.item.categoryID!==6?await catalog().item(s.ship):null;
   const settings=await nativeSettings(c.viewer);
   if(!valid(c)||token!==revision)return;
   if(!c.viewer.hangar)c.viewer.lifecycle.set('hangar',c.module.createHangarViewer(c.viewer,{item:c.item,settings}));
   await background(c.viewer,!!room);
   if(!valid(c)||token!==revision)return;
   const applied=await c.viewer.hangar.setRoom(room,ship,s.mode);
   if(!valid(c)||token!==revision||!applied)return;
   await background(c.viewer,!!room);status(room?'hangarReady':'');render();
  }catch(error){if(valid(c)&&token===revision){restoreSelection(c);await background(c.viewer,!!c.viewer.hangar?.active);status('hangarFailed');console.warn('Hangar failed',error);}}
  finally{finish();}
 }
 async function open(){
  if(!supportsHangar(currentItem()))return;
  status('hangarLoading');
  try{await metadataReady();ships ||= (await catalog().search()).filter(i=>i.available&&i.categoryID===6);
   render();status(currentViewer()?.hangar?.active?'hangarReady':'hangarHint');
  }catch(error){status('hangarFailed');console.warn('Hangar metadata failed',error);}
 }
 $('hangar-room').addEventListener('change',()=>{state().room=$('hangar-room').value;render();void apply();});
 $('hangar-mode').addEventListener('change',()=>{state().mode=$('hangar-mode').value;currentViewer()?.hangar?.setMode(state().mode);render();});
 $('hangar-ship-search').addEventListener('input',shipOptions);
 $('hangar-ship').addEventListener('change',async()=>{
  const c=context;if(!c?.viewer.hangar)return;const token=++revision;
  state().ship=Number($('hangar-ship').value);status('hangarLoading');
  const finish=loadingTask(c.viewer);
  try{const ship=await catalog().item(state().ship);if(!valid(c)||token!==revision)return;
   const applied=await c.viewer.hangar.setShip(ship);if(valid(c)&&token===revision&&applied)status('hangarReady');
  }catch(error){if(valid(c)&&token===revision){restoreSelection(c);status('hangarFailed');}console.warn(error);}finally{finish();}
 });
 $('hangar-reset').addEventListener('click',()=>currentViewer()?.hangar?.reset());
 return {open,render,
  connect(viewer,item,module){revision++;context=supportsHangar(item)?{viewer,item,module}:null;render();if(context&&state().room)void apply();},
  reset(){revision++;context=null;$('hangar-room').disabled=true;},
 };
}
