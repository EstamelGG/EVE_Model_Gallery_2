// Framework-free public element. Each frame owns its renderer, settings and caches.
const frameURL=new URL('./eve-viewer-frame.html?v=3917cd56cb3b22aa',import.meta.url);
const attributes=['item-id','resource-base','background','exposure','reflection','kill-count','effects','white-model','auto-rotate','control-panel','antialias'];
export class EveModelViewer extends HTMLElement {
 static observedAttributes=attributes;
 constructor(){
  super();this.attachShadow({mode:'open'});this._pending=new Map();this._sequence=0;this._options={};
  this._receive=event=>{
   if(event.source!==this._frame?.contentWindow||event.origin!==frameURL.origin||event.data?.channel!=='eve-viewer')return;
   const {type,id,value,error}=event.data;
   if(type==='frame-ready'){this._resolveReady();return;}
   if(type==='result'){
    const pending=this._pending.get(id);if(!pending)return;this._pending.delete(id);
    error?pending.reject(Object.assign(Error(error.message),{name:error.name})):pending.resolve(value);return;
   }
   if(type==='load')this._placements=value.placements;
   if(type==='settings-change')this._options={...this._options,...value,render:{...this._options.render,...value.render},display:{...this._options.display,...value.display}};
   this.dispatchEvent(new CustomEvent(type,{detail:value}));
  };
 }
 connectedCallback(){
  if(this._frame)return;
  this._ready=new Promise(resolve=>this._resolveReady=resolve);
  const style=document.createElement('style');style.textContent=':host{display:block;min-height:240px}iframe{display:block;width:100%;height:100%;min-height:inherit;border:0}';
  const frame=this._frame=document.createElement('iframe');frame.title='EVE model viewer';frame.src=frameURL.href;
  window.addEventListener('message',this._receive);this.shadowRoot.replaceChildren(style,frame);
  this.configure({...this._attributes(),...this._options}).catch(error=>this._error(error));
 }
 disconnectedCallback(){
  window.removeEventListener('message',this._receive);
  this._resolveReady?.();
  for(const pending of this._pending.values())pending.reject(new DOMException('Viewer disconnected','AbortError'));
  this._pending.clear();this._frame?.remove();this._frame=null;
 }
 attributeChangedCallback(){
  if(!this.isConnected||!this._frame||this._scheduled)return;
  this._scheduled=true;queueMicrotask(()=>{this._scheduled=false;if(this.isConnected)this.configure(this._attributes()).catch(error=>this._error(error));});
 }
 _error(error){if(error.name!=='AbortError')this.dispatchEvent(new CustomEvent('error',{detail:{message:error.message}}));}
 _attributes(){
  const value=name=>this.getAttribute(name);
  return {itemId:Number(value('item-id'))||null,resourceBase:value('resource-base')||undefined,
   background:value('background')||'auto',killCount:Number(value('kill-count'))||0,
   effects:value('effects')!=='false',whiteModel:this.hasAttribute('white-model'),
   autoRotate:this.hasAttribute('auto-rotate'),controlPanel:this.hasAttribute('control-panel'),
   render:Object.fromEntries(['exposure','reflection'].filter(k=>value(k)!==null).map(k=>[k,Number(value(k))])),
   display:{antialiasMode:value('antialias')||'auto'}};
 }
 async _call(method,value){
  if(!this.isConnected||!this._frame)throw new DOMException('Viewer is not connected','InvalidStateError');
  const frame=this._frame;await this._ready;
  if(this._frame!==frame||!this.isConnected)throw new DOMException('Viewer disconnected','AbortError');
  const id=++this._sequence;
  return new Promise((resolve,reject)=>{this._pending.set(id,{resolve,reject});frame.contentWindow.postMessage({channel:'eve-viewer',id,method,value},frameURL.origin);});
 }
 configure(options={}){
  this._options={...this._options,...options,render:{...this._options.render,...options.render},display:{...this._options.display,...options.display}};
  return this._call('configure',this._options);
 }
 get placements(){return this._placements||[];}
 getPlacements(){return this._call('placements');}
 getAvailableEquipment(slot){return this._call('equipment',slot);}
 exportModel(format='glb'){return this._call('export-model',format);}
 exportSkybox(){return this._call('export-skybox');}
}
if(!customElements.get('eve-model-viewer'))customElements.define('eve-model-viewer',EveModelViewer);
