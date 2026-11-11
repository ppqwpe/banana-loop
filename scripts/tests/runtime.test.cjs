const {test}=require('node:test');const assert=require('node:assert/strict');
const {BatchController,normalizeSpec}=require('../../assets/engine.js');
const {ReferenceManager}=require('../../assets/engine.js');
const config=(n=3)=>({reference:'none',spec:{mode:'PROMPT_ONLY',stride:10,prompts:Object.fromEntries(Array.from({length:n},(_,i)=>[i+1,'P'+(i+1)]))}});
function fixture(n=3){
 const sent=[];const adapter={inspect:()=>({ok:true,checks:[],aspect:'16:9'}),prepare:async()=>{},submit:(job,signal,attempt)=>{if(signal.aborted)throw Error('stopped');attempt();sent.push(job.slot);return{};},accepted:async()=>true};
 const controller=new BatchController(config(n),adapter,{gap:0});return{controller,adapter,sent};
}
test('one request, no concurrent double click, and resume without repeats',async()=>{
 const f=fixture();await Promise.all([f.controller.run({one:true}),f.controller.run()]);assert.deepEqual(f.sent,[1]);
 await f.controller.run();await f.controller.run();assert.deepEqual(f.sent,[1,2,3]);assert.equal(f.controller.state.phase,'completed');
});
test('stop before submit sends nothing, then resume retries the unsubmitted item',async()=>{
 const f=fixture();f.adapter.prepare=async()=>f.controller.stop();await f.controller.run();assert.deepEqual(f.sent,[]);assert.equal(f.controller.entries[0].status,'cancelled');
 f.adapter.prepare=async()=>{};await f.controller.run();assert.deepEqual(f.sent,[1,2,3]);
});
test('stop after accepted request preserves its cursor',async()=>{
 const f=fixture();f.adapter.accepted=async()=>{f.controller.stop();return true;};await f.controller.run();assert.deepEqual(f.sent,[1]);assert.equal(f.controller.state.cursor,1);
 f.adapter.accepted=async()=>true;await f.controller.run();assert.deepEqual(f.sent,[1,2,3]);
});
test('unconfirmed requests continue without locking or claiming acceptance',async()=>{
 const f=fixture();f.adapter.accepted=async()=>false;await f.controller.run();await f.controller.run();assert.deepEqual(f.sent,[1,2,3]);assert.equal(f.controller.state.unconfirmed,3);assert.equal(f.controller.state.accepted,0);assert.equal(f.controller.state.phase,'completed');
});
test('stop while checking acceptance prevents next request and resumes next item',async()=>{
 const f=fixture();f.adapter.accepted=async()=>{f.controller.stop();return false;};await f.controller.run();assert.deepEqual(f.sent,[1]);assert.equal(f.controller.state.cursor,1);
 f.adapter.accepted=async()=>true;await f.controller.run();assert.deepEqual(f.sent,[1,2,3]);
});
test('actual exception after click is reported without an uncertainty lock',async()=>{
 const f=fixture();f.adapter.submit=(job,signal,attempt)=>{attempt();throw Error('after click');};await f.controller.run();assert.equal(f.controller.state.phase,'blocked');assert.equal(f.controller.state.cursor,1);assert.equal(f.controller.state.unconfirmed,1);
});
test('preflight failure reports useful status without submitting',async()=>{
 const f=fixture();f.adapter.inspect=()=>({ok:false,checks:[{ok:false,code:'EDITOR',detail:'Open the prompt box.'}]});await f.controller.run();assert.deepEqual(f.sent,[]);assert.equal(f.controller.state.phase,'blocked');assert.match(f.controller.state.message,/prompt box/);
});
test('first failure does not skip to later prompts',async()=>{
 const f=fixture();f.adapter.prepare=async()=>{throw Error('upload failed');};await f.controller.run();assert.equal(f.controller.state.cursor,0);assert.deepEqual(f.sent,[]);
});
test('live shuffle pins in-flight item; OFF orders remaining work',async()=>{
 const f=fixture(4);const saved=Math.random;Math.random=()=>0;
 f.adapter.prepare=async(job)=>{if(job.slot===1)f.controller.setShuffle(true);if(job.slot===3)f.controller.setShuffle(false);};
 try{await f.controller.run();assert.deepEqual(f.sent,[1,3,2,4]);}finally{Math.random=saved;}
});
test('infinite OFF completes only the current round',async()=>{
 const f=fixture(2);f.controller.setInfinite(true);f.adapter.accepted=async()=>{f.controller.setInfinite(false);return true;};await f.controller.run();assert.deepEqual(f.sent,[1,2]);
});
test('infinite repeats and stop interrupts it',async()=>{
 const f=fixture(2);f.controller.setInfinite(true);f.adapter.accepted=async()=>{if(f.sent.length===3)f.controller.stop();return true;};await f.controller.run();assert.deepEqual(f.sent,[1,2,1]);
});
test('aspect metadata does not constrain execution',async()=>{
 for(const aspect of ['16:9','3:4','9:16','1:1','site']){const f=fixture(1);const c=config(1);c.spec.aspect=aspect;const runner=new BatchController(c,f.adapter,{gap:0});await runner.run();assert.equal(f.sent.length,1);}
});
test('schema rejects missing/invalid prompts and ambiguous manual references',()=>{
 assert.throws(()=>normalizeSpec({prompts:{1:''}}));assert.throws(()=>normalizeSpec({prompts:{1:'ok'},stride:0}));
 assert.throws(()=>new BatchController({...config(),reference:'manual'},{}));
});
test('text-only slots stay in numerical order across stride boundaries',async()=>{
 const f=fixture();const c=config();c.spec.prompts={1:'one',2:'two',11:'eleven'};
 await new BatchController(c,f.adapter,{gap:0}).run();assert.deepEqual(f.sent,[1,2,11]);
});
test('reference jobs remain grouped by original',()=>{
 const c=config();c.reference='folder';c.spec.mode='WITH_REF';c.spec.prompts={1:'one',2:'two',11:'eleven'};
 assert.deepEqual(new BatchController(c,{}).jobs.map(j=>j.slot),[1,11,2]);
});
test('stopping on the last item disables resume; infinite enables another round',async()=>{
 const f=fixture(1);f.adapter.accepted=async()=>{f.controller.stop();return true;};await f.controller.run();
 assert.equal(f.controller.snapshot().canRun,false);assert.equal(f.controller.snapshot().exhausted,true);
 f.controller.setInfinite(true);assert.equal(f.controller.snapshot().canRun,true);
 f.controller.setInfinite(false);assert.equal(f.controller.snapshot().canRun,false);
});
test('diagnostic snapshots cannot mutate controller checks',()=>{
 const f=fixture();f.adapter.inspect=()=>({ok:true,checks:[{ok:true,detail:'original'}]});f.controller.inspect();
 f.controller.snapshot().diagnostics.checks[0].detail='changed';assert.equal(f.controller.snapshot().diagnostics.checks[0].detail,'original');
});
test('responsive image changes preserve identity; replacement source does not',async()=>{
 const img={src:'original.png',currentSrc:'small.png',complete:true,naturalWidth:100};
 const refs=new ReferenceManager({thumbs:()=>[img]},'manual');await refs.prepare(1);
 img.currentSrc='large.png';assert.doesNotThrow(()=>refs.verify());
 img.src='replacement.png';assert.throws(()=>refs.verify(),/reference/);
});
test('thumbnail readiness follows the current node after rerender',async()=>{
 let img={src:'original.png',complete:false,naturalWidth:0};
 const refs=new ReferenceManager({thumbs:()=>[img]},'manual');
 const pending=refs.prepare(1);setTimeout(()=>{img={src:'original.png',complete:true,naturalWidth:100};},10);
 await pending;assert.equal(refs.identity,'original.png');
});
test('stop cancels thumbnail loading without accepting a reference',async()=>{
 const refs=new ReferenceManager({thumbs:()=>[{src:'original.png',complete:false,naturalWidth:0}]},'manual');
 const abort=new AbortController();const pending=refs.prepare(1,abort.signal);abort.abort();
 await assert.rejects(pending,{code:'STOPPED'});assert.equal(refs.identity,null);
});
test('missing next file never removes an existing reference',async()=>{
 const refs=new ReferenceManager({thumbs:()=>[{}]},'folder');let cleared=false;
 refs.clear=async()=>{cleared=true;};await assert.rejects(refs.prepare(2),{code:'FILES'});assert.equal(cleared,false);
});
test('unavailable upload route preserves the existing reference',async()=>{
 const refs=new ReferenceManager({thumbs:()=>[{}],prepareUpload:async()=>{throw Error('route missing');}},'folder');
 refs.files.set(1,{name:'01_ref.png',size:1});let cleared=false;refs.clear=async()=>{cleared=true;};
 await assert.rejects(refs.prepare(1),/route missing/);assert.equal(cleared,false);
});
test('stop during upload preflight preserves the existing reference',async()=>{
 const abort=new AbortController();const refs=new ReferenceManager({thumbs:()=>[{}],prepareUpload:async()=>{abort.abort();}},'folder');
 refs.files.set(1,{name:'01_ref.png',size:1});let cleared=false;refs.clear=async()=>{cleared=true;};
 await assert.rejects(refs.prepare(1,abort.signal),{code:'STOPPED'});assert.equal(cleared,false);
});

test('folder shuffle never interleaves originals, including a live toggle',async()=>{
 const f=fixture();const c={reference:'folder',spec:{mode:'WITH_REF',stride:10,prompts:{1:'a',11:'b',21:'c',2:'d',12:'e',3:'f',13:'g'}}};
 const runner=new BatchController(c,f.adapter,{gap:0});
 f.adapter.prepare=async job=>{if(job.slot===1)runner.setShuffle(true);if(job.slot===21)runner.setShuffle(false);};
 await runner.run();const refs=f.sent.map(s=>(s-1)%10+1);const seen=new Set();let previous;
 for(const ref of refs){if(ref!==previous){assert.ok(!seen.has(ref),'reference revisited');seen.add(ref);}previous=ref;}
 assert.equal(f.sent.length,7);assert.equal(new Set(f.sent).size,7);
});

test('failure records stage, file group and error code, then resumes unsent item',async()=>{
 const {WorkflowError}=require('../../assets/engine.js');const f=fixture(2);
 f.adapter.prepare=async(job,signal,phase)=>{phase('reference','uploading');throw new WorkflowError('UPLOAD','upload failed');};
 await f.controller.run();const error=f.controller.snapshot().lastError;
 assert.equal(error.code,'UPLOAD');assert.equal(error.stage,'reference');assert.equal(error.slot,1);
 error.code='changed';assert.equal(f.controller.state.lastError.code,'UPLOAD');
 f.adapter.prepare=async()=>{};await f.controller.run();assert.deepEqual(f.sent,[1,2]);assert.equal(f.controller.state.lastError,null);
});

test('unknown thrown values leave a usable error report',async()=>{
 const f=fixture(1);f.adapter.prepare=async()=>{throw 'unexpected rejection';};
 await f.controller.run();assert.equal(f.controller.state.lastError.code,'UNEXPECTED');assert.equal(f.controller.state.message,'unexpected rejection');assert.equal(f.controller.state.running,false);
});

test('invalid folder selection preserves previously connected files',()=>{
 const refs=new ReferenceManager({},'folder');const good={name:'01_good.png',size:20};refs.setFiles([good],[1]);
 assert.throws(()=>refs.setFiles([{name:'01_empty.png',size:0}],[1]),/Empty/);
 assert.throws(()=>refs.setFiles([{name:'01_a.png'},{name:'01_b.png'}],[1]),/Duplicate/);
 assert.throws(()=>refs.setFiles([{name:'02_b.png'}],[1]),/required/);
 assert.equal(refs.files.get(1),good);
});

test('offline preparation fails before reference or prompt changes',async()=>{
 const {BrowserAdapter}=require('../../assets/engine.js');const adapter=new BrowserAdapter({document:{},navigator:{onLine:false}},'none');
 await assert.rejects(adapter.prepare({},undefined,()=>{}),{code:'OFFLINE'});
});
