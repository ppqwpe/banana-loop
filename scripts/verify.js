#!/usr/bin/env node
// Standalone smoke check: node scripts/verify.js assets/engine.js [prompts.json]
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const enginePath = process.argv[2];
if (!enginePath) { console.error('Usage: node verify.js <engine.js> [prompts.json]'); process.exit(2); }
const engine = require(path.resolve(enginePath));
const spec = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8').replace(/^\uFEFF/, ''))
  : {mode:'WITH_REF',stride:10,prompts:{1:'first',11:'variant',3:'third'}};
const checked = engine.normalizeSpec(spec);
assert.ok(checked.groups.length);
assert.throws(() => engine.normalizeSpec({prompts:{1:''}}));
assert.throws(() => engine.normalizeSpec({prompts:{1:'x'},stride:0.5}));
let clicked = false;
const runner = new engine.BatchController({spec,reference:spec.mode==='PROMPT_ONLY'?'none':'folder'}, {
  inspect:()=>({ok:false,checks:[{ok:false,code:'UNLIMITED',detail:'Unlimited unavailable'}]}),
  submit:()=>{clicked=true;}
});
runner.run().then(()=>{
  assert.equal(clicked,false); assert.equal(runner.state.running,false);assert.equal(runner.state.phase,'blocked');
  console.log(`Smoke check passed: ${checked.groups.length} groups; failed readiness blocks generation.`);
  console.log('This does not validate the live Higgsfield UI.');
}).catch(error=>{console.error(error);process.exitCode=1;});
