/* Higgsfield console runtime - class-based execution, site settings preserved. */
(function(root,factory){
  if(typeof module==='object' && module.exports) module.exports=factory();
  else root.HiggsfieldRuntime=factory();
})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  const VERSION='0.3.2-alpha.6';
  const MODES=['PROMPT_ONLY','WITH_REF'];
  const record=value=>value&&typeof value==='object'&&!Array.isArray(value);
  const normalizeText=text=>String(text).replace(/\r\n/g,'\n').trim();
  function normalizeSpec(input) {
    if (!record(input) || !record(input.prompts)) throw new Error('A prompts object is required.');
    if (input.schema_version !== undefined && input.schema_version !== 1) throw new Error('Unsupported schema_version.');
    const stride = input.stride === undefined ? 30 : input.stride;
    if (!Number.isSafeInteger(stride) || stride < 1 || stride > 1000) throw new Error('stride must be an integer from 1 to 1000.');
    const mode = input.mode || 'WITH_REF';
    if (!MODES.includes(mode)) throw new Error('Invalid mode.');
    if (input.labels !== undefined && !record(input.labels)) throw new Error('labels must be an object.');
    if (input.project !== undefined && typeof input.project !== 'string') throw new Error('project must be a string.');
    const prompts = {}, labels = {}, groups = new Map();
    for (const [key, value] of Object.entries(input.prompts)) {
      const slot = Number(key);
      if (!/^[1-9]\d*$/.test(key) || !Number.isSafeInteger(slot) || slot > 1000000) throw new Error('Invalid slot number: ' + key);
      if (typeof value !== 'string' || !value.trim() || value.length > 100000) throw new Error('Invalid prompt: ' + key);
      prompts[slot] = normalizeText(value);
      const label = input.labels?.[key] ?? ('Cut ' + key);
      if (typeof label !== 'string') throw new Error('Labels must be strings: ' + key);
      labels[slot] = label;
      const ref = mode === 'PROMPT_ONLY' ? 1 : ((slot - 1) % stride) + 1;
      if (ref > 999) throw new Error('Reference numbers must be 1-999.');
      if (!groups.has(ref)) groups.set(ref, []);
      groups.get(ref).push(slot);
    }
    if (!Object.keys(prompts).length || Object.keys(prompts).length > 10000) throw new Error('There must be 1-10000 prompts.');
    return {schema_version: 1, project: input.project || 'Untitled project',
      aspect: typeof input.aspect === 'string' ? input.aspect : 'site', mode, stride, prompts, labels,
      groups: [...groups].sort((a, b) => a[0] - b[0]).map(([ref, slots]) => ({ref, slots: slots.sort((a, b) => a - b)}))};
  }

  class WorkflowError extends Error {
    constructor(code, message) { super(message); this.name='WorkflowError'; this.code=code; }
  }
  function checkAbort(signal) { if(signal?.aborted) throw new WorkflowError('STOPPED','Stopped. You can resume.'); }
  function delay(ms, signal) {
    checkAbort(signal);
    return new Promise((resolve,reject)=>{
      const done=()=>{signal?.removeEventListener('abort',cancel);resolve();};
      const timer=setTimeout(done,ms);
      const cancel=()=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);reject(new WorkflowError('STOPPED','Stopped.'));};
      signal?.addEventListener('abort',cancel,{once:true});
    });
  }
  async function until(test, {timeout=8000, signal, interval=100}={}) {
    const deadline=Date.now()+timeout;
    do {checkAbort(signal);if(await test()) return true;await delay(interval,signal);} while(Date.now()<deadline);
    return Boolean(await test());
  }
  // Korean alternatives in the matchers below follow Higgsfield's Korean UI. Keep them.
  class DomResolver {
    constructor(win){this.win=win;this.doc=win.document;}
    all(selector,root=this.doc){return [...root.querySelectorAll(selector)];}
    visible(el){
      if(!el||!el.isConnected||el.closest('#hf-skills-panel')||!el.getClientRects().length)return false;
      for(let p=el;p&&p.nodeType===1;p=p.parentElement){const css=this.win.getComputedStyle(p);if(css.display==='none'||css.visibility==='hidden')return false;}
      return true;
    }
    name(el){return [el.getAttribute('aria-label'),el.textContent,...(el.getAttribute('aria-labelledby')||'').split(/\s+/).map(id=>this.doc.getElementById(id)?.textContent)].filter(Boolean).join(' ').trim();}
    unique(items,code,message){if(items.length!==1)throw new WorkflowError(code,message+` (found: ${items.length})`);return items[0];}
    input(){
      const preferred=this.all('[id="hf:tour-image-prompt"],[data-tour-anchor="tour-image-prompt"]').filter(e=>this.visible(e)&&e.matches('textarea,[contenteditable="true"]'));
      if(preferred.length)return this.unique(preferred,'EDITOR','Check the prompt box.');
      return this.unique(this.all('textarea,[contenteditable="true"]').filter(e=>this.visible(e)&&!e.disabled),'EDITOR','Open the image generation prompt box.');
    }
    form(){
      const input=this.input(), form=input.closest('form');if(form)return form;
      for(let p=input.parentElement,i=0;p&&p!==this.doc.body&&i<9;p=p.parentElement,i++){
        if(p.querySelector('[id="hf:image-form-submit"],[data-tour-anchor="tour-image-generate"]'))return p;
        if(p.querySelector('input[type="file"]')&&this.all('button,[role="button"]',p).some(e=>this.isSubmitText(this.name(e))))return p;
      }
      throw new WorkflowError('FORM','Could not find the generation form. Open the image generation page.');
    }
    isSubmitText(text){return /^(?:generate|생성하기|생성|unlimited|언리미티드)(?:\s|\d|[✦✧✨★⭐]|$)/i.test(text.trim());}
    submit(enabled=false){
      const root=this.form();
      const candidates=this.all('button,[role="button"]',root).filter(e=>this.visible(e)&&!e.matches('[role="switch"],[role="checkbox"]')&&!e.querySelector('[role="switch"],input[type="checkbox"]')&&!e.closest('[role="switch"]'));
      let matches=candidates.filter(e=>e.id==='hf:image-form-submit'||e.getAttribute('data-tour-anchor')==='tour-image-generate');
      if(!matches.length)matches=candidates.filter(e=>this.isSubmitText(this.name(e)));
      const button=this.unique(matches,'SUBMIT','Generate button not found, or more than one. Close any open menus.');
      if(enabled&&(button.disabled||button.getAttribute('aria-disabled')==='true'))throw new WorkflowError('SUBMIT_DISABLED','The prompt or upload is not ready yet.');
      return button;
    }
    unlimited(){
      const root=this.form();
      const items=this.all('[role="switch"],input[type="checkbox"]',root).filter(e=>this.visible(e));
      return this.unique(items.filter(e=>{
        if(/unlimited|언리미티드/i.test(this.name(e)))return true;
        for(let p=e.parentElement,i=0;p&&p!==root&&i<4;p=p.parentElement,i++){
          if(p.textContent.length<160&&p.querySelectorAll('[role="switch"],input[type="checkbox"]').length===1&&/unlimited|언리미티드/i.test(p.textContent))return true;
        }return false;
      }),'UNLIMITED','Unlimited switch not found. Check that this model has Unlimited.');
    }
    checked(el){return el.type==='checkbox'?el.checked:el.getAttribute('aria-checked')==='true';}
    thumbs(){return this.all('img',this.form()).filter(e=>this.visible(e));}
    aspect(){
      const buttons=this.all('button,[role="button"]',this.form()).filter(e=>this.visible(e));
      return buttons.map(e=>e.textContent.trim()).find(t=>/^\d{1,2}\s*:\s*\d{1,2}$/.test(t))||'unknown';
    }
    uploadCandidates(){
      const form=this.form();
      const eligible=this.all('input[type="file"]').filter(e=>e.isConnected&&!e.disabled&&!e.webkitdirectory&&!e.hasAttribute('directory')&&!e.closest('#hf-skills-panel')&&(!e.accept||/image|\.(png|jpe?g|webp)/i.test(e.accept)));
      if(this.all('button[aria-label="Close assets picker"]').some(e=>this.visible(e))){
        const portal=eligible.filter(e=>!e.form&&/image/i.test(e.accept));
        if(portal.length)return portal;
      }
      const scoped=eligible.filter(e=>form.contains(e)||e.form===form);
      // Prefer the active add-image control over stale hidden duplicate containers.
      const shown=scoped.filter(e=>this.visible(e.closest('label')||e.parentElement));
      const empty=shown.filter(e=>!e.closest('label')?.querySelector('img')&&!e.parentElement?.querySelector('img'));
      if(empty.length)return empty;
      if(shown.length)return shown;
      if(scoped.length)return scoped;
      // Portal inputs may live outside the form. Only accept an unambiguous,
      // explicitly image-typed input without association to a different form.
      return eligible.filter(e=>!e.form&&/image|\.(png|jpe?g|webp)/i.test(e.accept));
    }
    upload(){
      return this.unique(this.uploadCandidates(),'UPLOAD','Could not pin down the image upload input. Open the attach (+) menu and resume.');
    }
    attachmentMenu(){
      const candidates=this.all('button,[role="button"]',this.form()).filter(e=>this.visible(e)&&!e.disabled&&e.getAttribute('aria-disabled')!=='true'&&
        /^(?:references|레퍼런스|참조|\+|add(?: image| images| reference)?|attach(?: image| file)?|upload(?: image)?|이미지 추가|레퍼 추가|첨부)$/i.test(this.name(e))&&
        (/^(references|레퍼런스|참조)$/i.test(e.getAttribute('aria-label')||'')||e.hasAttribute('aria-controls')||e.getAttribute('aria-haspopup')==='menu'||e.getAttribute('aria-haspopup')==='dialog'));
      return candidates.length===1?candidates[0]:null;
    }
    async prepareUpload(signal){
      checkAbort(signal);
      if(this.uploadCandidates().length===1)return this.upload();
      const menu=this.attachmentMenu();
      if(menu&&menu.getAttribute('aria-expanded')!=='true'){
        menu.click();
        await until(()=>this.uploadCandidates().length===1,{timeout:5000,signal});
      }
      return this.upload();
    }
    async closeAssetPicker(signal){
      const buttons=this.all('button[aria-label="Close assets picker"]').filter(e=>this.visible(e));
      if(buttons.length===1){
        buttons[0].click();
        if(!await until(()=>!this.all('button[aria-label="Close assets picker"]').some(e=>this.visible(e)),{timeout:4000,signal}))throw new WorkflowError('UPLOAD','Could not close the assets picker.');
        await delay(200,signal);
      }
    }
    assetCards(){return this.all('[data-assets-picker-selectable-card="true"]').filter(e=>this.visible(e));}
    assetKey(card){return card.getAttribute('aria-label')||card.querySelector('img')?.getAttribute('src');}
    async assetBaseline(signal){
      if(!this.all('button[aria-label="Close assets picker"]').some(e=>this.visible(e)))return null;
      // The picker input mounts before its asynchronous asset list. Wait for
      // that list to settle before distinguishing the newly uploaded card.
      let previous='',stable=0;
      for(let n=0;n<20;n++){
        await delay(250,signal);
        const key=this.assetCards().map(e=>this.assetKey(e)).join('|');
        stable=key===previous?stable+1:0;previous=key;
        if(n>=3&&stable>=3)break;
      }
      return new Set(this.assetCards().map(e=>this.assetKey(e)));
    }
    async attachUploaded(before,signal){
      let selected=false;
      const found=await until(()=>{
        if(this.thumbs().length===1)return true;
        if(before&&!selected){
          const added=this.assetCards().filter(e=>this.assetKey(e)&&!before.has(this.assetKey(e)));
          if(added.length>1)throw new WorkflowError('UPLOAD_SELECT','Several new uploads appeared, so none was picked automatically. Select the one image to use and start again.');
          if(added.length===1){
            const img=added[0].querySelector('img');
            if(img?.complete&&img.naturalWidth>0){checkAbort(signal);added[0].click();selected=true;}
          }
        }
        return this.thumbs().length===1;
      },{timeout:60000,signal,interval:200});
      if(!found)throw new WorkflowError('UPLOAD','Could not confirm the upload or reference selection. Check the assets picker and any site error.');
    }
    uploadDiagnostics(){
      return {eligible:this.uploadCandidates().length,menuAvailable:!!this.attachmentMenu(),attached:this.thumbs().length};
    }
  }

  class PromptEditor {
    constructor(dom){this.dom=dom;}
    read(){const e=this.dom.input();return normalizeText(e.value??e.innerText??e.textContent);}
    async write(text,signal){
      checkAbort(signal);const {win,doc}=this.dom;const el=this.dom.input();el.focus();await delay(150,signal);
      if(el.tagName==='TEXTAREA'){
        Object.getOwnPropertyDescriptor(win.HTMLTextAreaElement.prototype,'value').set.call(el,text);
        el.dispatchEvent(new win.Event('input',{bubbles:true}));el.dispatchEvent(new win.Event('change',{bubbles:true}));
      }else{
        // Let the editor process focus and selection before each native edit.
        // A synchronous DOM Range + insertText can leave Lexical's model empty.
        doc.execCommand('selectAll',false,null);await delay(80,signal);
        doc.execCommand('delete',false,null);await delay(80,signal);
        el.replaceChildren();el.dispatchEvent(new win.Event('input',{bubbles:true}));await delay(80,signal);
        if(!doc.execCommand('insertText',false,text))throw new WorkflowError('INPUT_WRITE','Could not type the prompt. Click the prompt box and try again.');
      }
      await delay(700,signal);
      if(!await until(()=>this.read()===normalizeText(text),{timeout:2500,signal}))throw new WorkflowError('INPUT_VERIFY','The prompt was not entered in full. No generation was requested.');
    }
  }
  class UnlimitedControl {
    constructor(dom){this.dom=dom;}
    isOn(){return this.dom.checked(this.dom.unlimited());}
    async enable(signal){
      checkAbort(signal);const control=this.dom.unlimited();
      if(!this.dom.checked(control))control.click();
      if(!await until(()=>this.isOn(),{timeout:4000,signal}))throw new WorkflowError('UNLIMITED_OFF','Could not turn Unlimited on. Check the switch on the site. Generate was not pressed.');
    }
  }
  class ReferenceManager {
    constructor(dom,mode){this.dom=dom;this.mode=mode;this.files=new Map();this.activeRef=null;this.identity=null;}
    setFiles(files,required){
      const next=new Map();
      for(const f of files){
        if(f.webkitRelativePath&&f.webkitRelativePath.split('/').length!==2)continue;
        const m=/^(\d{1,3})_.+\.(png|jpe?g|webp)$/i.exec(f.name);if(!m)continue;
        const id=Number(m[1]);if(id<1||id>999||next.has(id))throw new WorkflowError('FILES','Duplicate or invalid reference number: '+id);
        next.set(id,f);
      }
      if(required.some(id=>!next.has(id)))throw new WorkflowError('FILES','An image with a required number is missing. Check the numbers and the folder.');
      for(const id of required)if(next.get(id).size===0)throw new WorkflowError('FILES','Empty image file: '+next.get(id).name);
      this.files=next;this.activeRef=null;this.identity=null;return next.size;
    }
    signature(){
      // currentSrc changes with responsive image size; src identifies the original.
      return this.dom.thumbs().map(e=>e.src||e.currentSrc).join('|');
    }
    async ready(signal){
      // React may replace the loading thumbnail: resolve the current node each time.
      if(!await until(()=>{const images=this.dom.thumbs();return images.length===1&&images[0].complete&&images[0].naturalWidth>0;},{timeout:15000,signal}))
        throw new WorkflowError('UPLOAD','The uploaded image is not ready yet.');
    }
    inspect(required){
      const count=this.dom.thumbs().length;
      if(this.mode==='manual'&&count!==1)throw new WorkflowError('REFERENCE','Upload exactly one original reference on the site.');
      if(this.mode==='none'&&count)throw new WorkflowError('REFERENCE','This is a text-only job. Remove the reference attached on the site.');
      if(this.mode==='folder'&&required.some(id=>!this.files.has(id)))throw new WorkflowError('FILES','Connect the numbered image folder first.');
      return this.mode==='manual'?'keeping 1 original':this.mode==='none'?'no reference':`${this.files.size} connected`;
    }
    async clear(signal){
      for(let n=0;n<10;n++){
        checkAbort(signal);const images=this.dom.thumbs();if(!images.length)return;
        let cell=images[0].parentElement,remove=null;
        for(let i=0;cell&&cell!==this.dom.form()&&i<5;i++,cell=cell.parentElement){
          const buttons=this.dom.all('button,[role="button"]',cell).filter(e=>this.dom.visible(e)&&(e.getAttribute('data-tour-anchor')==='tour-image-reference-remove'||/^(remove|delete|clear|삭제|제거)(?:\s|$)/i.test(this.dom.name(e))));
          if(buttons.length===1){remove=buttons[0];break;}
        }
        if(!remove)throw new WorkflowError('REFERENCE_REMOVE','Reference remove button not found. Remove the reference on the site and resume.');
        remove.click();if(!await until(()=>this.dom.thumbs().length<images.length,{timeout:4000,signal}))throw new WorkflowError('REFERENCE_REMOVE','Could not confirm the reference was removed.');
      }
      if(this.dom.thumbs().length)throw new WorkflowError('REFERENCE_REMOVE','Could not finish removing the reference.');
    }
    async prepare(ref,signal,phase=()=>{}){
      checkAbort(signal);
      if(this.mode==='none'){this.inspect([]);return;}
      if(this.mode==='manual'){
        this.inspect([]);await this.ready(signal);const now=this.signature();
        if(this.identity&&now!==this.identity)throw new WorkflowError('REFERENCE_CHANGED','The original reference changed during the run. Upload the original image again and restart.');
        this.identity=now;return;
      }
      if(this.activeRef===ref&&this.dom.thumbs().length===1&&this.signature()===this.identity){await this.ready(signal);return;}
      const file=this.files.get(ref);if(!file)throw new WorkflowError('FILES','Reference file missing: '+ref);
      if(file.size===0)throw new WorkflowError('FILES','Empty image file: '+file.name);
      phase('reference','Checking the upload path · '+file.name);
      await this.dom.prepareUpload(signal);checkAbort(signal);
      await this.dom.closeAssetPicker(signal);checkAbort(signal);
      this.activeRef=null;this.identity=null;
      phase('reference','Removing the previous reference');await this.clear(signal);checkAbort(signal);
      // Deleting a thumbnail may remount the file input; never reuse that node.
      const input=await this.dom.prepareUpload(signal);checkAbort(signal);
      const before=await this.dom.assetBaseline(signal);checkAbort(signal);
      phase('reference','Uploading the next reference · '+file.name);
      const transfer=new this.dom.win.DataTransfer();transfer.items.add(file);input.value='';input.files=transfer.files;input.dispatchEvent(new this.dom.win.Event('change',{bubbles:true}));
      await this.dom.attachUploaded(before,signal);
      phase('reference','Waiting for the new reference · '+file.name);
      await this.ready(signal);checkAbort(signal);
      this.activeRef=ref;this.identity=this.signature();await this.dom.closeAssetPicker(signal);
    }
    verify(){
      if(this.mode==='none'){this.inspect([]);return;}
      if(this.dom.thumbs().length!==1||this.signature()!==this.identity)throw new WorkflowError('REFERENCE_CHANGED','The reference changed. Check the original before generating.');
    }
  }
  class SubmissionMonitor {
    constructor(dom){this.dom=dom;}
    pending(){return this.dom.all('span,div,p,[role="status"]').filter(e=>!e.children.length&&/^(queued|generating|pending|in queue|대기\s*중|생성\s*중|처리\s*중|대기열)(?:\s*[.…]*|\s*\d+%?)$/i.test(e.textContent.trim())&&this.dom.visible(e));}
    error(){return this.dom.all('[role="alert"],[data-sonner-toast]').filter(e=>this.dom.visible(e)).map(e=>e.textContent.trim()).find(t=>/failed|error|insufficient|upgrade|실패|오류|한도|부족|프롬프트를 입력|enter.{0,20}prompt/i.test(t));}
    snapshot(){return new Set(this.pending());}
    async waitCapacity(signal){
      if(!await until(()=>this.pending().length<8,{timeout:300000,interval:300,signal}))throw new WorkflowError('QUEUE','The queue is full. Resume once some generations finish.');
      const error=this.error();if(error)throw new WorkflowError('SITE_ERROR',error);
    }
    async accepted(before,signal){
      // A click or changing button state is not evidence of server acceptance.
      const end=Date.now()+8000;
      do{
        if(this.pending().some(e=>!before.has(e)))return true;
        if(signal?.aborted)return false;
        const error=this.error();if(error)throw new WorkflowError('SITE_ERROR',error);
        await delay(150);
      }while(Date.now()<end);
      return false;
    }
  }
  class BrowserAdapter {
    constructor(win,mode){
      this.dom=new DomResolver(win);this.editor=new PromptEditor(this.dom);this.unlimited=new UnlimitedControl(this.dom);
      this.references=new ReferenceManager(this.dom,mode);this.monitor=new SubmissionMonitor(this.dom);
    }
    inspect(required){
      const checks=[];const add=(key,label,fn)=>{try{const detail=fn();checks.push({key,label,ok:true,detail:typeof detail==='string'?detail:'ok'});}catch(e){checks.push({key,label,ok:false,detail:e.message,code:e.code});}};
      add('input','Prompt box',()=>this.dom.input());add('submit','Generate button',()=>this.dom.submit());
      add('unlimited','Unlimited',()=>this.unlimited.isOn()?'on':'turned on at start');
      add('reference','Reference',()=>this.references.inspect(required));
      let aspect='unknown';try{aspect=this.dom.aspect();}catch{}
      let upload=null;try{upload=this.dom.uploadDiagnostics();}catch{}
      return {ok:checks.every(c=>c.ok),checks,aspect,upload};
    }
    async prepare(job,signal,phase){
      if(this.dom.win.navigator?.onLine===false)throw new WorkflowError('OFFLINE','You are offline. Reconnect and resume.');
      phase('queue','Checking the queue');await this.monitor.waitCapacity(signal);
      phase('unlimited','Checking Unlimited');await this.unlimited.enable(signal);
      phase('reference','Preparing the reference');await this.references.prepare(job.ref,signal,phase);
      phase('input','Typing the prompt');await this.editor.write(job.prompt,signal);
      await this.unlimited.enable(signal);await this.monitor.waitCapacity(signal);
      if(!await until(()=>{try{this.dom.submit(true);return true;}catch(e){if(e.code!=='SUBMIT_DISABLED')throw e;return false;}},{timeout:8000,signal}))throw new WorkflowError('SUBMIT_DISABLED','The Generate button is disabled. Check the form on the site.');
    }
    // Synchronous final verification immediately before the external side effect.
    submit(job,signal,onAttempt){
      checkAbort(signal);this.references.verify();
      if(this.editor.read()!==normalizeText(job.prompt))throw new WorkflowError('INPUT_CHANGED','The typed prompt changed, so the run stopped.');
      if(!this.unlimited.isOn())throw new WorkflowError('UNLIMITED_OFF','Unlimited is off, so nothing was generated.');
      const button=this.dom.submit(true);const before=this.monitor.snapshot();onAttempt();button.click();return before;
    }
    accepted(before,signal){return this.monitor.accepted(before,signal);}
  }
  class BatchController {
    constructor(config,adapter,options={}){
      this.spec=normalizeSpec(config.spec);this.mode=config.reference||'none';
      if(!['manual','folder','none'].includes(this.mode))throw new WorkflowError('CONFIG','Invalid reference mode.');
      if((this.mode==='none')!==(this.spec.mode==='PROMPT_ONLY'))throw new WorkflowError('CONFIG','The prompt data does not match the reference mode. Rebuild the console file.');
      if(this.mode==='manual'&&this.spec.groups.length!==1)throw new WorkflowError('CONFIG','One-reference mode takes variants of a single original only.');
      this.jobs=this.spec.groups.flatMap(g=>g.slots.map(slot=>({ref:g.ref,slot,label:this.spec.labels[slot],prompt:this.spec.prompts[slot]})));
      this.adapter=adapter;this.listeners=new Set();this.options={gap:3500,...options};
      this.state={phase:'idle',message:'Ready',running:false,infinite:!!config.infinite,shuffle:!!config.shuffle,round:1,cursor:0,accepted:0,unconfirmed:0,current:null,lastError:null};
      this.entries=[];this.order=this.jobs.map((_,i)=>i);this.abort=null;this.inflight=false;this.diagnostics=null;this.reorder(0);
    }
    subscribe(fn){this.listeners.add(fn);fn(this.snapshot());return()=>this.listeners.delete(fn);}
    snapshot(){
      const exhausted=this.state.cursor>=this.order.length&&!this.state.infinite;
      return {...this.state,total:this.jobs.length,exhausted,canRun:!this.state.running&&!exhausted,
        lastError:this.state.lastError?{...this.state.lastError}:null,
        diagnostics:this.diagnostics?{...this.diagnostics,checks:this.diagnostics.checks.map(c=>({...c}))}:null};
    }
    emit(){for(const fn of this.listeners)try{fn(this.snapshot());}catch(e){console.error(e);}}
    phase(phase,message){this.state.phase=phase;this.state.message=message;this.emit();}
    inspect(){this.diagnostics=this.adapter.inspect(this.spec.groups.map(g=>g.ref));this.emit();return this.diagnostics;}
    setFiles(files){if(this.state.running)throw new WorkflowError('BUSY','Stop the run before changing the folder.');const count=this.adapter.references.setFiles(files,this.spec.groups.map(g=>g.ref));this.inspect();return count;}
    // active: the original currently attached; folder mode finishes it first.
    reorder(start=this.state.cursor+(this.inflight?1:0),active=start?this.jobs[this.order[start-1]].ref:null){
      const rest=this.order.slice(start).sort((a,b)=>a-b);
      const shuffle=list=>{for(let i=list.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;};
      if(this.mode==='folder'){
        const groups=new Map();for(const index of rest){const ref=this.jobs[index].ref;if(!groups.has(ref))groups.set(ref,[]);groups.get(ref).push(index);}
        // Finish the active original before moving to another, even if shuffle
        // is changed while a prompt is being prepared or after a pause.
        const pinned=groups.get(active)||[];groups.delete(active);
        const remaining=[...groups.values()];
        if(this.state.shuffle){shuffle(pinned);remaining.forEach(shuffle);shuffle(remaining);}
        this.order=this.order.slice(0,start).concat(pinned,...remaining);
      }else{
        if(this.state.shuffle)shuffle(rest);
        this.order=this.order.slice(0,start).concat(rest);
      }
    }
    setShuffle(on){this.state.shuffle=!!on;this.reorder();this.emit();}
    setInfinite(on){this.state.infinite=!!on;this.emit();}
    stop(){if(!this.state.running)return;this.abort.abort();this.phase('stopping','Stopping · no more requests will be sent.');}
    report(){return {version:VERSION,project:this.spec.project,state:this.snapshot(),entries:this.entries.map(e=>({...e})),note:'accepted means a new queued/generating marker appeared; it does not mean the image finished.'};}
    async run({one=false}={}){
      if(this.state.running)return false;
      if(this.state.cursor>=this.order.length&&!this.state.infinite){this.phase('completed','All requests sent. Check the results.');return false;}
      this.abort=new AbortController();const signal=this.abort.signal;this.state.running=true;this.state.lastError=null;this.phase('checking','Checking before the run');
      let entry=null;
      try{
        const diagnostics=this.inspect();if(!diagnostics.ok){const failed=diagnostics.checks.find(c=>!c.ok);throw new WorkflowError(failed.code||'CHECK',failed.detail);}
        while(!signal.aborted){
          if(this.state.cursor>=this.order.length){if(!this.state.infinite)break;
            // Keep the last attached original first so a new round does not re-upload it.
            const last=this.jobs[this.order[this.order.length-1]].ref;
            this.state.round++;this.state.cursor=0;this.order=this.jobs.map((_,i)=>i);this.reorder(0,last);}
          const job=this.jobs[this.order[this.state.cursor]];this.state.current=job.label;this.inflight=true;
          entry={slot:job.slot,ref:job.ref,round:this.state.round,label:job.label,status:'preparing',at:new Date().toISOString()};this.entries.push(entry);
          await this.adapter.prepare(job,signal,(p,m)=>this.phase(p,m));checkAbort(signal);
          this.phase('submitting','Requesting generation');
          const before=this.adapter.submit(job,signal,()=>{entry.status='attempted';});
          this.phase('waiting','Waiting for acceptance');
          const accepted=await this.adapter.accepted(before,signal);
          entry.status=accepted?'accepted':'unconfirmed';
          if(accepted)this.state.accepted++;else{this.state.unconfirmed++;this.phase('waiting','No acceptance marker seen · logged, moving to the next one.');}
          this.state.cursor++;entry=null;this.inflight=false;this.emit();
          if(one)break;await delay(this.options.gap,signal);
        }
        this.phase(signal.aborted?'paused':this.state.cursor>=this.order.length&&!this.state.infinite?'completed':'paused',signal.aborted?'Stopped. You can resume.':this.state.cursor>=this.order.length&&!this.state.infinite?'All requests sent. Check the results.':'Test run finished. Check the result.');
      }catch(error){
        const message=error?.message||String(error);
        const detail={code:error?.code||'UNEXPECTED',stage:this.state.phase,slot:entry?.slot??null,ref:entry?.ref??null,message,at:new Date().toISOString()};
        this.state.lastError=detail;if(entry){entry.error={...detail};entry.message=message;}
        // A clicked request may already be queued on the site: count it and move on.
        if(entry?.status==='attempted'){entry.status='unconfirmed';this.state.unconfirmed++;this.state.cursor++;}
        else if(entry)entry.status=signal.aborted?'cancelled':'failed';
        this.phase(signal.aborted?'paused':'blocked',message);
      }finally{this.inflight=false;this.state.running=false;this.emit();}
      return this.report();
    }
  }
  return {VERSION,normalizeSpec,normalizeText,WorkflowError,DomResolver,PromptEditor,UnlimitedControl,ReferenceManager,SubmissionMonitor,BrowserAdapter,BatchController};

});
