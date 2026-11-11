const {chromium}=require('playwright');
// The mock page below copies Higgsfield's Korean UI on purpose (업로드, 생성하기, 대기 중) to test Korean-site matching.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const core=fs.readFileSync(path.join(__dirname,'../../assets/engine.js'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'../../assets/console-panel.js'),'utf8');
const tempDir=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'higgsfield-test-'));
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7x8AAAAASUVORK5CYII=';
const fixture=`<!doctype html><meta charset="utf-8"><style>body{font:14px system-ui;background:#eceef1}form{position:fixed;bottom:20px;left:20px;width:560px;background:white;padding:15px;border:1px solid #ccc}fieldset{display:flex}.editor{min-height:70px;width:360px}.sr-only{position:absolute;width:1px;height:1px;clip:rect(0,0,0,0)}label{display:block;width:50px;height:50px;border:1px solid #ccc}button{padding:8px}#submit-holder{width:110px}.ref img{width:60px;height:60px}</style>
<h2>Local test page · no external generation requests</h2><div id="results"></div>
<form id="image-form"><fieldset><div><div id="refs"></div><label>업로드<input class="sr-only" type="file" accept="image/png"></label><div style="display:none"><label><input type="file" accept="image/png"></label></div><div id="hf:tour-image-prompt" class="editor" contenteditable="true" data-lexical-editor="true" role="textbox"></div><button type="button" id="aspect">16:9</button><div id="toggle-wrap">Unlimited<button type="button"><button type="button" id="unlimited" role="switch" aria-checked="false">○</button></button></div></div><div id="submit-holder"><button id="hf:image-form-submit" type="submit"><div>생성하기<span>2</span></div></button></div></fieldset></form>
<script>
window.submitted=[];window.uploadNames=[];window.nativeEdits=0;window.serverPrompt='';
document.querySelector('form').onsubmit=e=>e.preventDefault();
document.querySelector('[contenteditable]').addEventListener('input',e=>{if(e.inputType){nativeEdits++;serverPrompt=e.currentTarget.innerText;}});
document.querySelector('#unlimited').onclick=e=>{e.preventDefault();e.currentTarget.setAttribute('aria-checked',e.currentTarget.getAttribute('aria-checked')==='true'?'false':'true');};
document.getElementById('hf:image-form-submit').onclick=()=>{submitted.push(serverPrompt);const n=document.createElement('div');n.textContent='대기 중';document.querySelector('#results').appendChild(n);};
window.addRef=()=>{const cell=document.createElement('div');cell.className='ref';cell.innerHTML='<img src="data:image/png;base64,${png}"><button type="button" aria-label="Remove image">×</button>';cell.querySelector('button').onclick=()=>cell.remove();document.querySelector('#refs').appendChild(cell);};
document.querySelector('input[type=file]').onchange=e=>{uploadNames.push(e.target.files[0].name);addRef();};
</script>`;
const make=(mode='none',prompts={1:'First\nsecond line `x` ${literal} "quote" <b>text</b>',11:'Another prompt'})=>({reference:mode,infinite:false,shuffle:false,spec:{schema_version:1,mode:mode==='none'?'PROMPT_ONLY':'WITH_REF',project:'Character test',aspect:'site',stride:10,prompts}});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});let passed=0;
 try{
 const page=await browser.newPage({viewport:{width:1250,height:900}});
 await page.route('**/*',r=>r.fulfill({status:200,contentType:'text/html',body:fixture}));
 async function reset(config=make()){await page.goto('https://higgsfield.ai/ko/ai/image');await page.addScriptTag({content:'window.module={exports:{}};'+core+';window.core=module.exports;delete window.module;'});await page.evaluate(c=>{window.config=c;},config);}
 async function mount(){await page.addScriptTag({content:'('+ui+')(window.core,window.config);'});}
 await reset(make('manual'));await page.evaluate(()=>addRef());await mount();
 assert.equal(await page.getByRole('button',{name:'Start',exact:true}).isEnabled(),true);passed++;
 assert.equal(await page.getByRole('button',{name:/작동/}).count(),0);passed++;
 await page.screenshot({path:path.join(tempDir,'object-panel.png')});
 await page.evaluate(()=>hfConsole.run(true));
 assert.deepEqual(await page.evaluate(()=>submitted),[make().spec.prompts[1]]);assert.ok(await page.evaluate(()=>nativeEdits)>0);passed+=2;
 assert.equal(await page.locator('#refs img').count(),1);assert.equal(await page.evaluate(()=>uploadNames.length),0);passed+=2;
 await mount();assert.equal(await page.evaluate(()=>hfConsole.state.cursor),1);passed++;
 await page.evaluate(()=>hfConsole.run());assert.equal(await page.evaluate(()=>submitted.length),2);passed++;
 // Upgrade the engine only: same project resumes instead of resetting to zero.
 await page.evaluate(()=>{hfConsole.fingerprint=hfConsole.fingerprint.replace('0.3.2-alpha.6:','0.3.2-alpha.2:');});
 await mount();assert.equal(await page.evaluate(()=>hfConsole.state.cursor),2);await page.evaluate(()=>hfConsole.run());assert.equal(await page.evaluate(()=>submitted.length),2);passed++;
 await page.evaluate(()=>hfConsole.run());assert.equal(await page.evaluate(()=>submitted.length),2);passed++;
 // All aspect choices remain unchanged; runtime accepts site settings without an aspect gate.
 for(const aspect of ['16:9','3:4','9:16','1:1']){
  await reset(make('none',{1:'Test'}));await page.locator('#aspect').evaluate((e,a)=>{e.textContent=a;},aspect);await mount();await page.evaluate(()=>hfConsole.run(true));
  assert.equal(await page.evaluate(()=>submitted.length),1);assert.equal(await page.locator('#aspect').innerText(),aspect);passed++;
 }
 // Labels can have no spaces, contain SVG/cost decorations, or be translated.
 for(const label of ['생성하기2','Unlimited✦','Generate2']){
  await reset(make('none',{1:'Test'}));await page.locator('[id="hf:image-form-submit"]').evaluate((e,t)=>{e.textContent=t;},label);await mount();await page.evaluate(()=>hfConsole.run(true));assert.equal(await page.evaluate(()=>submitted.length),1);passed++;
 }
 await reset(make('none',{1:'Test'}));await page.locator('#toggle-wrap').evaluate(e=>e.remove());await mount();await page.evaluate(()=>hfConsole.run(true));assert.equal(await page.evaluate(()=>submitted.length),0);assert.match(await page.evaluate(()=>hfConsole.state.message),/Unlimited/);passed++;
 await reset(make('none',{1:'Test'}));await page.locator('[contenteditable]').evaluate(e=>e.addEventListener('input',()=>hfConsole.stop(),{once:true}));await mount();await page.evaluate(()=>hfConsole.run(true));assert.equal(await page.evaluate(()=>submitted.length),0);assert.equal(await page.evaluate(()=>hfConsole.state.phase),'paused');passed++;
 await reset(make('none',{1:'Test'}));await mount();await page.locator('[id="hf:image-form-submit"]').evaluate(e=>{e.onclick=()=>{submitted.push(serverPrompt);hfConsole.stop();};});await page.evaluate(()=>hfConsole.run(true));assert.equal(await page.evaluate(()=>hfConsole.state.phase),'paused');await page.evaluate(()=>hfConsole.run());assert.equal(await page.evaluate(()=>submitted.length),1);passed++;
 // Folder order, replacing the old reference and ignoring hidden duplicate file inputs.
 await reset(make('folder',{1:'Forest',2:'Character'}));await mount();
 await page.evaluate(()=>{const files=['01_forest.png','02_character.png'].map(name=>new File(['x'],name,{type:'image/png'}));hfConsole.controller.setFiles(files);});
 await page.evaluate(()=>hfConsole.run(true));
 await page.locator('#refs button').evaluate(e=>{e.removeAttribute('aria-label');e.textContent='';e.setAttribute('data-tour-anchor','tour-image-reference-remove');});
 await page.evaluate(()=>hfConsole.run());assert.deepEqual(await page.evaluate(()=>uploadNames),['01_forest.png','02_character.png']);assert.equal(await page.locator('#refs img').count(),1);assert.equal(await page.evaluate(()=>submitted.length),2);passed++;
 // Upload routes: hidden input, portal outside form, menu-created input, initial refs.
 for(const route of ['hidden','portal','menu','references']){
  await reset(make('folder',{1:'One',11:'Variant',2:'Two'}));
  await page.evaluate(route=>{
   const input=document.querySelector('input[type=file]');
   document.querySelectorAll('input[type=file]').forEach(e=>{if(e!==input)e.remove();});
   input.style.display='none';
   if(route==='portal')document.body.append(input);
   if(route==='menu'||route==='references'){
    input.remove();const b=document.createElement('button');b.type='button';b.textContent='+';if(route==='references'){b.textContent='';b.setAttribute('aria-label','References');}else b.setAttribute('aria-haspopup','menu');
    b.onclick=()=>{document.body.append(input);b.setAttribute('aria-expanded','true');};document.querySelector('form').append(b);
   }
   addRef();addRef();
  },route);
  await mount();
  await page.evaluate(()=>{hfConsole.controller.options.gap=0;hfConsole.controller.setFiles(['01_a.png','02_b.png'].map(n=>new File(['x'],n,{type:'image/png'})));});
  await page.evaluate(()=>hfConsole.run());
  assert.deepEqual(await page.evaluate(()=>uploadNames),['01_a.png','02_b.png']);
  assert.deepEqual(await page.evaluate(()=>submitted),['One','Variant','Two']);
  assert.equal(await page.locator('#refs img').count(),1);passed++;
 }
 // Live Oct 1 picker: upload adds an asset card, then explicit selection attaches it.
 await reset(make('folder',{1:'One',11:'Variant',2:'Two'}));
 await page.evaluate(()=>{
  document.querySelectorAll('input[type=file]').forEach(e=>e.remove());
  const menu=document.createElement('button');menu.type='button';menu.setAttribute('aria-label','References');document.querySelector('form').append(menu);
  let sequence=0;
  menu.onclick=()=>{
   if(document.querySelector('#picker'))return;
   const picker=document.createElement('div');picker.id='picker';
   picker.innerHTML='<button aria-label="Close assets picker">Close</button><input type="file" accept="image/png" hidden><div data-assets-picker-selectable-card="true" aria-label="old">Old</div>';
   picker.querySelector('button').onclick=()=>setTimeout(()=>picker.remove(),300);
   picker.querySelector('input').onchange=e=>{
    uploadNames.push(e.target.files[0].name);
    const card=document.createElement('div');card.setAttribute('data-assets-picker-selectable-card','true');card.setAttribute('aria-label','new-'+(++sequence));
    const img=document.createElement('img');img.src=document.querySelector('#refs img')?.src||'data:image/png;base64,'+window.testPng;card.append(img);
    card.onclick=()=>{addRef();};picker.append(card);
   };setTimeout(()=>document.body.append(picker),250);
  };for(let i=0;i<2;i++){const e=document.createElement('input');e.type='file';e.accept='image/png';e.hidden=true;document.querySelector('form').append(e);}addRef();addRef();
 });
 await page.evaluate(png=>window.testPng=png,png);await mount();
 await page.evaluate(()=>{hfConsole.controller.options.gap=0;hfConsole.controller.setFiles(['01_a.png','02_b.png'].map(n=>new File(['x'],n,{type:'image/png'})));});
 await page.evaluate(()=>hfConsole.run());
 assert.deepEqual(await page.evaluate(()=>uploadNames),['01_a.png','02_b.png']);
 assert.deepEqual(await page.evaluate(()=>submitted),['One','Variant','Two']);assert.equal(await page.locator('#refs img').count(),1);passed++;
 // A missing or ambiguous upload route must leave the existing reference intact.
 for(const route of ['missing','ambiguous']){
  await reset(make('folder',{1:'One'}));
  await page.evaluate(route=>{
   document.querySelectorAll('input[type=file]').forEach(e=>e.remove());addRef();
   if(route==='ambiguous')for(let i=0;i<2;i++){const e=document.createElement('input');e.type='file';e.accept='image/png';e.hidden=true;document.body.append(e);}
  },route);
  await mount();await page.evaluate(()=>hfConsole.controller.setFiles([new File(['x'],'01_a.png',{type:'image/png'})]));
  await page.evaluate(()=>hfConsole.run());
  assert.equal(await page.locator('#refs img').count(),1);assert.equal(await page.evaluate(()=>submitted.length),0);passed++;
 }
 // Reference deletion can replace the upload input. Resolve it again afterwards.
 await reset(make('folder',{1:'One'}));await page.evaluate(()=>{
  addRef();document.querySelector('#refs button').onclick=()=>{
   document.querySelector('#refs').replaceChildren();const old=document.querySelector('input[type=file]');
   const next=old.cloneNode();next.onchange=old.onchange;old.replaceWith(next);
  };
 });await mount();await page.evaluate(()=>hfConsole.controller.setFiles([new File(['x'],'01_a.png',{type:'image/png'})]));
 await page.evaluate(()=>hfConsole.run(true));assert.deepEqual(await page.evaluate(()=>uploadNames),['01_a.png']);assert.equal(await page.evaluate(()=>submitted.length),1);passed++;
 // Close means stop; reopening doesn't introduce a second controller or an OFF gate.
 await reset(make('none',{1:'Test'}));await mount();await page.getByRole('button',{name:'Close and stop',exact:true}).click();await mount();assert.equal(await page.getByRole('button',{name:'Start',exact:true}).isEnabled(),true);passed++;
 await page.getByRole('button',{name:'Fold',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Start',exact:true}).isVisible(),false);await page.getByRole('button',{name:'Unfold',exact:true}).click();passed++;
 await reset(make('none',{1:'Test'}));await page.setViewportSize({width:700,height:700});await mount();const box=await page.locator('#hf-skills-panel').evaluate(e=>({right:e.getBoundingClientRect().right,left:e.getBoundingClientRect().left}));assert.ok(box.left>=0&&box.right<=700);passed++;
 await reset(make('manual'));await page.evaluate(()=>addRef());await page.addScriptTag({content:'(function(){const module={exports:{}};'+core+';('+ui+')(module.exports,'+JSON.stringify(make('manual'))+');})();'});
 await page.evaluate(()=>hfConsole.run(true));assert.equal(await page.evaluate(()=>submitted.length),1);assert.equal(await page.evaluate(()=>hfConsole.version),'0.3.2-alpha.6');passed++;
 await page.getByText('Log · diagnostics',{exact:true}).click();
 const savedReport=page.waitForEvent('download');await page.getByRole('button',{name:'Save diagnostics',exact:true}).click();
 const reportDownload=await savedReport;const report=JSON.parse(fs.readFileSync(await reportDownload.path(),'utf8'));
 assert.equal(report.version,'0.3.2-alpha.6');assert.equal(report.state.accepted,1);passed++;
 for(const width of [700,1024,1920]){
  await page.setViewportSize({width,height:900});
  await reset(make('none',{1:'Responsive test'}));await mount();
  await page.evaluate(()=>hfConsole.run(true));assert.equal(await page.evaluate(()=>submitted.length),1);
  const fit=await page.locator('#hf-skills-panel').evaluate(e=>e.getBoundingClientRect().right<=innerWidth);assert.ok(fit);passed++;
 }
 console.log(`PASS ${passed} browser checks. Captured live DOM structure, native editor transactions, site aspect variants, manual/folder/none references, stop/resume, uncertainty, UI and final standalone script. No live generation.`);
 }finally{await browser.close();fs.rmSync(tempDir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
