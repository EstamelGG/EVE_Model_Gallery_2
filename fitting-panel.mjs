import {loadJSON} from './resource-activity.mjs?v=326cd5c374d54460';
import {resourceURL} from './resource-location.mjs?v=326cd5c374d54460';

export function createFittingPanel({root,currentViewer,currentItem,translate:t,name,groupName,nativeSettings}) {
 const $=id=>root.querySelector('#'+id),saved=new Map();
 let active=false,context=null,generation=0,pending=null,dataPromise=null,data=null,limit=40;
 const valid=c=>context===c&&currentViewer()===c.viewer&&currentItem()===c.item;
 function state(id){if(!saved.has(id))saved.set(id,{choices:new Map(),selected:new Set(),initialized:false,deployed:true});return saved.get(id);}
 const selection=()=>context?state(context.item.id).selected:new Set();
 function status(key,values){$('fitting-status').textContent=t(key,values);}
 function totals(){const fitting=context?.viewer.fitting;if(fitting)status('fittingReady',{groups:fitting.slots.length,count:fitting.count});}
 function closePicker(restore=false){$('fitting-picker').hidden=true;$('fitting-choose').setAttribute('aria-expanded','false');if(restore)$('fitting-choose').focus({preventScroll:true});}
 function refreshSelection(){
  const slots=selection(),s=context&&state(context.item.id);
  context?.viewer.fitting?.select([...slots]);
  for(const button of $('fitting-slots').children){
   const slot=Number(button.dataset.slot),item=data?.equipment.find(e=>e.id===s?.choices.get(slot));
   button.setAttribute('aria-pressed',String(slots.has(slot)));
   button.title=t('fittingSlot',{slot,count:button.dataset.count})+' · '+(item?name(item.name):t('fittingEmpty'));
   button.classList.toggle('equipped',!!item);
  }
  $('fitting-selection').textContent=t('fittingSelected',{count:slots.size});
  $('fitting-choose').disabled=!slots.size;$('fitting-clear').disabled=!slots.size;
  const choices=new Set([...slots].map(slot=>s.choices.get(slot)??null)),id=choices.size===1?[...choices][0]:null;
  $('fitting-choose').textContent=!slots.size?t('fittingSelectHint'):choices.size>1?t('fittingMixed'):name(data?.equipment.find(e=>e.id===id)?.name)||t('fittingEmpty');
  if(!slots.size)closePicker();
 }
 function toggle(slot,follow=true){
  const slots=selection();if(slots.has(slot))slots.delete(slot);else{slots.add(slot);if(follow)context?.viewer.fitting?.focus(slot);}
  refreshSelection();if(!$('fitting-picker').hidden)results();
 }
 async function change(c,slot,id){
  if(!valid(c))return false;const fitting=c.viewer.fitting,s=state(c.item.id);s.choices.set(slot,id);
  try{return await fitting.set(slot,id);}
  catch(error){if(valid(c)&&s.choices.get(slot)===id)s.choices.set(slot,fitting.get(slot)?.id??null);throw error;}
 }
 async function applySelection(id){
  const c=context,slots=[...selection()];if(!c||!slots.length)return;
  closePicker(true);status('fittingLoading');
  const settled=await Promise.allSettled(slots.map(slot=>change(c,slot,id)));
  if(!valid(c))return;
  refreshSelection();
  if(settled.some(result=>result.status==='rejected')){status('fittingFailed');for(const result of settled)if(result.status==='rejected')console.warn(result.reason);}
  else totals();
 }
 function results(){
  if(!context)return;const query=$('fitting-search').value.trim().toLowerCase(),category=$('fitting-category').value;
  const matches=data.equipment.filter(e=>(!category||String(e.groupID)===category)&&(!query||`${e.id} ${e.name?.zh} ${e.name?.en}`.toLowerCase().includes(query)));
  const slots=[...selection()],choices=state(context.item.id).choices;
  $('fitting-results').replaceChildren(...[null,...matches.slice(0,limit)].map(item=>{
   const button=document.createElement('button');button.type='button';const label=document.createElement('span'),id=document.createElement('small');
   label.textContent=item?name(item.name):t('fittingEmpty');id.textContent=item?String(item.id):'—';button.append(label,id);
   button.setAttribute('aria-pressed',String(slots.length>0&&slots.every(slot=>(choices.get(slot)??null)===(item?.id??null))));
   button.onclick=()=>void applySelection(item?.id??null);return button;
  }));
  $('fitting-results-empty').hidden=matches.length>0;$('fitting-more').hidden=matches.length<=limit;
 }
 function openPicker(){
  if(!selection().size)return;limit=40;$('fitting-picker').hidden=false;$('fitting-choose').setAttribute('aria-expanded','true');
  $('fitting-picker-title').textContent=t('fittingBatchChoose');$('fitting-search').value='';results();$('fitting-search').focus({preventScroll:true});
 }
 function render(){
  closePicker();const fitting=context?.viewer.fitting;$('fitting-slots').replaceChildren();$('fitting-controls').hidden=!fitting;if(!fitting)return;
  const s=state(context.item.id);$('fitting-deployed').checked=s.deployed;
  if(!s.initialized){if(fitting.slots.length)s.selected.add(fitting.slots[0].slot);s.initialized=true;}
  for(const slot of fitting.slots){
   const button=document.createElement('button');button.type='button';button.dataset.slot=slot.slot;button.dataset.count=slot.mounts.length;
   button.textContent=String(slot.slot).padStart(2,'0');button.setAttribute('aria-label',t('fittingSlot',{slot:slot.slot,count:slot.mounts.length}));
   button.onclick=()=>toggle(slot.slot);$('fitting-slots').append(button);
  }
  const category=$('fitting-category').value;
  $('fitting-category').replaceChildren(new Option(t('fittingAllCategories'),''),...[...new Set(data.equipment.map(e=>e.groupID))].sort((a,b)=>String(groupName(a)).localeCompare(String(groupName(b)))).map(id=>new Option(groupName(id),String(id))));
  $('fitting-category').value=category;refreshSelection();totals();
 }
 async function ensure(){
  const c=context;if(!c||!valid(c))return;if(c.viewer.fitting){c.viewer.fitting.setEditing(active);return;}if(pending)return pending;
  if(c.item.categoryID!==6||c.item.subsystemParts||c.item.groupID===963){status('fittingUnavailable');return;}
  status('fittingLoading');const token=generation;
  const job=(async()=>{try{
   dataPromise ||= loadJSON(resourceURL('data/fitting.json')).catch(error=>{dataPromise=null;throw error;});data=await dataPromise;
   if(!valid(c)||token!==generation)return;const locators=data.ships?.[c.item.id];
   if(data.version!==1||!locators?.length){status('fittingUnavailable');return;}
   const settings=await nativeSettings(c.viewer);if(!valid(c)||token!==generation)return;
   const fitting=c.module.installFitting(c.viewer,{locators,equipment:data.equipment,settings,onSelect:slot=>{if(valid(c))toggle(slot,false);}});
   c.viewer.lifecycle.set('fitting',fitting);fitting.setEditing(active);const s=state(c.item.id);fitting.setDeployed(s.deployed);render();
   await Promise.all([...s.choices].filter(([slot,id])=>id!=null&&fitting.slots.some(s=>s.slot===slot)).map(([slot,id])=>change(c,slot,id)));if(valid(c)){refreshSelection();totals();}
  }catch(error){if(valid(c)&&token===generation){status('fittingFailed');console.warn('Fitting metadata failed',error);}}})();
  pending=job;try{await job;}finally{if(pending===job)pending=null;}
 }
 $('fitting-all').addEventListener('click',()=>{if(!context?.viewer.fitting)return;closePicker();const slots=selection();for(const s of context.viewer.fitting.slots)slots.add(s.slot);refreshSelection();});
 $('fitting-none').addEventListener('click',()=>{selection().clear();refreshSelection();});
 $('fitting-choose').addEventListener('click',()=>$('fitting-picker').hidden?openPicker():closePicker());
 $('fitting-search').addEventListener('input',()=>{limit=40;results();});$('fitting-category').addEventListener('change',()=>{limit=40;results();});
 $('fitting-more').addEventListener('click',()=>{limit+=40;results();});$('fitting-picker-close').addEventListener('click',()=>closePicker(true));
 $('fitting-picker').addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closePicker(true);}if(event.key==='ArrowDown'&&event.target===$('fitting-search')){event.preventDefault();$('fitting-results').querySelector('button')?.focus();}});
 $('fitting-deployed').addEventListener('change',()=>{if(context?.viewer.fitting){state(context.item.id).deployed=$('fitting-deployed').checked;context.viewer.fitting.setDeployed($('fitting-deployed').checked);}});
 $('fitting-clear').addEventListener('click',()=>void applySelection(null));
 return {
  connect(viewer,item,module){generation++;pending=null;closePicker();viewer.lifecycle.release('fitting');context={viewer,item,module};$('fitting-controls').hidden=true;$('fitting-slots').replaceChildren();status('fittingHint');if(active||saved.get(item.id)?.choices.size)void ensure();},
  reset(){generation++;pending=null;closePicker();context?.viewer.fitting?.setEditing(false);context=null;$('fitting-controls').hidden=true;$('fitting-slots').replaceChildren();status('fittingHint');},
  setActive(value){active=value;if(!active)closePicker();context?.viewer.fitting?.setEditing(active);if(active)void ensure();},render,
 };
}
