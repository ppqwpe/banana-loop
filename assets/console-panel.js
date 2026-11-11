function(core,config){
  'use strict';
  if(!/(^|\.)higgsfield\.ai$/i.test(location.hostname))throw new Error('Run this on the Higgsfield image page.');
  const fingerprint=core.VERSION+':'+JSON.stringify(config);
  const previous=window.hfConsole;
  if(window.hfConsole?.fingerprint===fingerprint){window.hfConsole.show();return;}
  if(window.hfConsole?.state?.running||window.imgAuto?.state?.running||window._kb?.running)throw new Error('Stop the running job before pasting new code.');
  document.getElementById('hf-skills-panel')?.remove();document.getElementById('kb-panel')?.remove();
  class BatchPanel {
    constructor(controller){
      this.controller=controller;this.lines=[];this.lastMessage='';this.folded=false;
      this.host=document.createElement('div');this.host.id='hf-skills-panel';
      this.host.style.cssText='position:fixed;right:16px;top:64px;width:390px;max-width:calc(100vw - 24px);z-index:2147483647';
      this.root=this.host.attachShadow({mode:'open'});document.body.appendChild(this.host);
      const style=document.createElement('style');style.textContent=`
        :host{all:initial;color-scheme:dark}*{box-sizing:border-box}
        .panel{font:12px/1.6 system-ui,-apple-system,sans-serif;color:#d4d4d8;background:rgba(20,20,22,.98);border:1px solid #3a3a3e;border-radius:12px;padding:14px;box-shadow:0 12px 40px #0006;max-height:calc(100vh - 88px);overflow:auto}
        header{display:flex;align-items:center;gap:8px;justify-content:space-between;margin-bottom:12px;cursor:grab;touch-action:none}
        strong{font-size:13px;line-height:1.5;overflow-wrap:anywhere}.actions{display:flex;gap:5px;flex-shrink:0}
        button{font:600 12px/1.5 system-ui;color:#d4d4d8;background:#26262a;border:1px solid #3a3a3e;border-radius:6px;padding:8px 10px;cursor:pointer;min-width:0}
        button:hover:not(:disabled){filter:brightness(1.18)}button:disabled{opacity:.4;cursor:not-allowed}button:focus-visible{outline:2px solid #a2c0b0;outline-offset:2px}
        button[aria-pressed=true]{background:#435d50;border-color:#648973;color:#e4f0e9}button[aria-pressed=false]{color:#9999a2}
        .small{padding:4px 8px;font-size:11px}.card{border:1px solid #353539;background:#242427;border-radius:7px;padding:10px;margin-bottom:10px}
        .muted{color:#95959f;font-size:11px}.row{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px}.run{grid-template-columns:1fr 90px}
        .primary{background:#5b8a72;border-color:#5b8a72;color:white;padding:12px 10px}.danger{background:#914e50;border-color:#914e50;color:white}
        .status{font-weight:600;white-space:pre-wrap}.progress{height:3px;background:#39393e;border-radius:2px;margin:9px 0}.bar{height:100%;background:#739a84;border-radius:2px;transition:width .2s}
        details{margin-top:8px}summary{cursor:pointer;color:#aaaab2;font-size:11px}pre{font:11px/1.6 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere;max-height:160px;overflow:auto;margin:8px 0 0;background:#19191b;padding:8px;border-radius:5px;color:#aaaab2}
        .check{display:flex;justify-content:space-between;gap:12px;margin:3px 0;font-size:11px}.good{color:#9ab7a6}.bad{color:#e3aaaa}.hint{color:#8e8e97;font-size:11px;margin-top:8px}.full{width:100%;margin-bottom:8px}[hidden]{display:none!important}
      `;this.root.appendChild(style);
      this.panel=this.el('section','',this.root,'panel');const header=this.el('header','',this.panel);
      this.el('strong',controller.spec.project,header);const actions=this.el('div','',header,'actions');
      this.fold=this.button('Fold',()=>{this.folded=!this.folded;this.body.hidden=this.folded;this.fold.textContent=this.folded?'Unfold':'Fold';},actions,'small');
      this.button('×',()=>{controller.stop();this.host.hidden=true;},actions,'small').setAttribute('aria-label','Close and stop');
      this.body=this.el('div','',this.panel);
      const intro=this.el('div','',this.body,'card');
      this.el('div',`alpha · ${core.VERSION}`,intro,'muted');
      this.el('div',`${controller.jobs.length} prompts ready`,intro);
      const modeText=controller.mode==='manual'?'Keeps the one original uploaded on the site.':controller.mode==='folder'?'Attaches images from the connected folder in number order · runs each image\'s prompts':'Prompts only, no reference.';
      this.el('div',modeText,intro,'muted');this.settings=this.el('div','Aspect, model, outputs: site settings',intro,'muted');
      if(controller.mode==='folder'){
        this.file=this.el('input','',this.body);this.file.type='file';this.file.multiple=true;this.file.webkitdirectory=true;this.file.hidden=true;
        this.folder=this.button('Connect image folder',()=>this.file.click(),this.body,'full');
        this.file.onchange=()=>{try{controller.setFiles([...this.file.files]);}catch(e){this.note(e.message);}finally{this.file.value='';}};
      }
      const toggles=this.el('div','',this.body,'row');
      this.infinite=this.button('',()=>controller.setInfinite(!controller.state.infinite),toggles);this.infinite.title='ON: repeat until stopped / OFF: stop after this round';
      this.shuffle=this.button('',()=>controller.setShuffle(!controller.state.shuffle),toggles);this.shuffle.title='Reorders the remaining prompts only.';
      const status=this.el('div','',this.body,'card');this.status=this.el('div','Ready',status,'status');
      this.progress=this.el('div','',this.el('div','',status,'progress'),'bar');this.count=this.el('div','',status,'muted');this.current=this.el('div','',status,'muted');
      const run=this.el('div','',this.body,'row run');this.start=this.button('Start',()=>controller.run(),run,'primary');this.stop=this.button('Stop',()=>controller.stop(),run,'danger');
      const tools=this.el('div','',this.body,'row');this.one=this.button('Test once',()=>controller.run({one:true}),tools);this.inspect=this.button('Check setup',()=>controller.inspect(),tools);
      this.checks=this.el('div','',this.body);
      const details=this.el('details','',this.body);this.el('summary','Log · diagnostics',details);this.logs=this.el('pre','',details);
      const exports=this.el('div','',details,'row');this.button('Copy diagnostics',()=>navigator.clipboard.writeText(JSON.stringify(controller.report(),null,2)),exports);
      this.button('Save diagnostics',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(controller.report(),null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='higgsfield-diagnostics.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},exports);
      this.button('Copy current prompt',()=>{const j=controller.jobs[controller.order[Math.min(controller.state.cursor,controller.order.length-1)]];return navigator.clipboard.writeText(j.prompt);},exports);
      this.el('div','Fold keeps running · Close/Stop sends no more requests. Generations already accepted keep going on the site.',this.body,'hint');
      this.el('div','Keep this tab open and turn off sleep.',this.body,'hint');
      this.drag(header);controller.subscribe(s=>this.render(s));
    }
    el(tag,text,parent,cls){const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;parent.appendChild(e);return e;}
    button(text,action,parent,cls){const b=this.el('button',text,parent,cls);b.type='button';b.onclick=()=>Promise.resolve().then(action).catch(e=>this.note(e.message));return b;}
    note(message){if(this.lastMessage===message)return;this.lastMessage=message;this.lines.push(new Date().toLocaleTimeString()+' '+message);this.lines=this.lines.slice(-35);this.logs.textContent=this.lines.join('\n');}
    render(s){
      this.infinite.textContent='Loop '+(s.infinite?'ON':'OFF');this.infinite.setAttribute('aria-pressed',String(s.infinite));
      this.shuffle.textContent='Shuffle '+(s.shuffle?'ON':'OFF');this.shuffle.setAttribute('aria-pressed',String(s.shuffle));
      this.start.disabled=this.one.disabled=!s.canRun;this.stop.disabled=!s.running;
      this.inspect.disabled=s.running;if(this.folder)this.folder.disabled=s.running;
      this.start.textContent=s.exhausted?'All sent':s.cursor?'Resume':'Start';
      this.status.textContent=s.message;this.status.className='status '+(s.phase==='blocked'?'bad':'');
      this.count.textContent=`Round ${s.round} · ${s.cursor}/${s.total} done · accepted ${s.accepted} · unconfirmed ${s.unconfirmed}`;
      this.progress.style.width=(s.cursor/s.total*100)+'%';this.current.textContent=s.current||'';
      if(s.diagnostics){
        this.checks.replaceChildren();
        this.settings.textContent=`Aspect ${s.diagnostics.aspect} · site settings kept`;
        for(const check of s.diagnostics.checks){const row=this.el('div','',this.checks,'check');this.el('span',check.label,row);this.el('span',(check.ok?'✓ ':'! ')+check.detail,row,check.ok?'good':'bad');}
      }
      this.note(s.message);
    }
    drag(header){
      let origin=null;
      header.onpointerdown=e=>{if(e.target.closest('button'))return;const box=this.host.getBoundingClientRect();origin={x:e.clientX,y:e.clientY,left:box.left,top:box.top};header.setPointerCapture(e.pointerId);};
      header.onpointermove=e=>{if(!origin)return;this.host.style.right='auto';this.host.style.left=Math.max(0,Math.min(innerWidth-this.host.offsetWidth,origin.left+e.clientX-origin.x))+'px';this.host.style.top=Math.max(0,Math.min(innerHeight-40,origin.top+e.clientY-origin.y))+'px';};
      header.onpointerup=()=>{origin=null;};header.onpointercancel=()=>{origin=null;};
    }
    show(){this.host.hidden=false;}
  }
  const adapter=new core.BrowserAdapter(window,config.reference);
  const controller=new core.BatchController(config,adapter);
  // A code-only update in the same open page keeps confirmed progress and files.
  // Changed project data or a refreshed page starts a separate run.
  if(previous?.controller&&!previous.state.running&&previous.fingerprint?.slice(previous.fingerprint.indexOf(':')+1)===JSON.stringify(config)){
    const old=previous.controller;
    if(old.order?.length===controller.jobs.length&&old.state.cursor>=0&&old.state.cursor<=old.order.length){
      controller.order=[...old.order];controller.entries=old.entries.map(e=>({...e}));
      for(const key of ['cursor','round','accepted','unconfirmed','infinite','shuffle'])controller.state[key]=old.state[key];
      adapter.references.files=new Map(old.adapter.references.files);
      controller.state.message='Updated engine ready · resumes from the previous position';
    }
  }
  const panel=new BatchPanel(controller);
  window.hfConsole={version:core.VERSION,fingerprint,state:controller.state,controller,show:()=>panel.show(),run:one=>controller.run({one:!!one}),stop:()=>controller.stop(),report:()=>controller.report()};
  controller.inspect();
}
