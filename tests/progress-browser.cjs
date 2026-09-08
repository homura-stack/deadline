'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {initialMap,battleReady}=require('./journey-helpers.cjs');
const {state,planWave,surviveUntilReady}=require('./browser.cjs');
const base=process.env.DEADLINE_TEST_URL||'http://127.0.0.1:4186/';
const run={score:5300,maxChain:5,totalKills:16,perfectExecutions:2,hitsTaken:1,time:80};
const key='deadline.progress.v1',save=restored=>({version:1,restored,run});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),report={cases:[],errors:[]},out=path.join(__dirname,'artifacts','task-q');fs.mkdirSync(out,{recursive:true});
 try{
  for(const touch of [false,true]){
   const p=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1366,height:900},isMobile:touch,hasTouch:touch});p.on('pageerror',e=>report.errors.push(String(e)));
   await p.goto(base+'?debug');await p.waitForLoadState('networkidle');
   await p.evaluate(({key,data})=>{localStorage.setItem(key,JSON.stringify(data));localStorage.setItem('deadline.tutorial.v1','completed');localStorage.setItem('deadline.audio.v1',JSON.stringify({masterVolume:37,sfxVolume:64,muted:true}));},{key,data:save(2)});
   async function resume(restored){await p.reload();await p.waitForLoadState('networkidle');if(touch)await p.locator('#title-start').tap();else await p.locator('#title-start').click();await initialMap(p);const s=await p.evaluate(()=>Deadline.inspect());assert.equal(s.journey.restored,restored);assert.equal(await p.locator('.world-pico').getAttribute('data-location'),String(Math.min(4,restored)));assert.equal(s.world.score,run.score);}
   await resume(2);assert.equal(await p.locator('[data-area][data-status="online"]').count(),2);
   await p.locator('[data-area="0"]').click();await p.locator('#map-enter').click();await battleReady(p);assert.equal(await p.evaluate(()=>Deadline.inspect().areaReplayActive),true);
   await resume(2);await p.locator('#map-enter').click();await battleReady(p);assert.equal(await p.evaluate(()=>Deadline.inspect().world.wave),5);
   await p.waitForTimeout(150);await resume(2);
   await p.locator('#map-training').click();await p.locator('#briefing-skip').click();assert.equal(await p.evaluate(()=>Deadline.inspect().journey.restored),2);
   await p.evaluate(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key,data:save(3)});await resume(3);
   await p.locator('#map-enter').click();await battleReady(p);assert.equal(await p.evaluate(()=>Deadline.inspect().world.phase),'rule-preview');
   if(touch){await p.locator('#one-stop-preview-next').tap();await p.locator('#one-stop-start').tap();}else{await p.keyboard.press('Space');await p.keyboard.press('Space');}
   assert.equal(await p.evaluate(()=>Deadline.inspect().world.wave),7);await resume(3);
   await p.locator('#map-title').click();await p.locator('[data-title-info="settings"]').click();assert.equal(await p.locator('#master-volume').inputValue(),'37');assert.equal(await p.locator('#sfx-volume').inputValue(),'64');assert.equal(await p.locator('#setting-mute').getAttribute('aria-pressed'),'true');
   await p.evaluate(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key,data:save(5)});await resume(5);
   assert.equal(await p.locator('[data-area][data-status="online"]').count(),5);await p.locator('[data-area="0"]').click();await p.locator('#map-enter').click();await battleReady(p);await resume(5);
   report.cases.push({touch,checkpointReload:true,replayReload:true,battleReload:true,trainingAndAudio:true,completedMap:true});await p.close();
  }
  // Genuine campaign input, normal tuning: commit AREA 1, reload during its reveal,
  // reload during Wave 4 (uncommitted), then finish AREA 2 and resume its successor.
  const live=await browser.newPage({viewport:{width:1366,height:900},reducedMotion:'reduce'});live.on('pageerror',e=>report.errors.push(String(e)));
  await live.addInitScript(()=>{localStorage.setItem('deadline.tutorial.v1','completed');let seed=0xdead1e;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);});
  await live.goto(base+'?debug');await live.waitForLoadState('networkidle');await live.locator('#title-start').click();await initialMap(live);await battleReady(live);
  const stored=()=>live.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  async function clear(wave){await live.waitForFunction(n=>Deadline.inspect().world.wave===n&&Deadline.inspect().world.phase==='normal',wave);await surviveUntilReady(live);await live.keyboard.press('Space');await planWave(live);await live.keyboard.press('Space');await live.waitForFunction(()=>Deadline.inspect().world.phase==='wave-clear');}
  async function reloadMap(restored){await live.reload();await live.waitForLoadState('networkidle');await live.locator('#title-start').click();await initialMap(live);assert.equal((await state(live)).journey.restored,restored);assert.equal(await live.locator('.world-pico').getAttribute('data-location'),String(restored));}
  await clear(1);assert.equal((await stored()).restored,0);await clear(2);const garden=await stored();assert.equal(garden.restored,1);assert.equal((await state(live)).journey.mode,'restoring');
  await reloadMap(1);assert.equal((await state(live)).world.score,garden.run.score);await battleReady(live);await clear(3);
  await live.waitForFunction(()=>Deadline.inspect().world.wave===4&&Deadline.inspect().world.phase==='normal');assert.deepEqual(await stored(),garden);
  await reloadMap(1);await battleReady(live);assert.equal((await state(live)).world.wave,3);assert.equal((await state(live)).world.score,garden.run.score);
  await clear(3);await clear(4);const forge=await stored();assert.equal(forge.restored,2);assert.equal(forge.run.totalKills,16,'replaying uncommitted Wave 3 cannot duplicate its kills');await reloadMap(2);assert.equal((await state(live)).world.score,forge.run.score);await battleReady(live);assert.equal((await state(live)).world.wave,5);
  report.cases.push({realGarden:garden,realForge:forge,midWave4ReturnsToWave3:true});await live.close();
  for(const raw of ['{','null','[]',JSON.stringify({version:2,restored:2,run}),JSON.stringify({version:1,restored:2}),JSON.stringify({version:1,restored:9,run})]){
   const p=await browser.newPage();p.on('pageerror',e=>report.errors.push(String(e)));await p.goto(base+'?debug');await p.evaluate(({key,raw})=>{localStorage.setItem(key,raw);localStorage.setItem('deadline.tutorial.v1','completed');},{key,raw});await p.reload();await p.waitForLoadState('networkidle');await p.locator('#title-start').click();await initialMap(p);assert.equal(await p.evaluate(()=>Deadline.inspect().journey.restored),0);await p.close();
  }
  // Dedicated test profile, never the user's browser data: close Chrome itself and
  // reopen the same local file, which is also the user's normal launch method.
  const profile=fs.mkdtempSync(path.join(out,'chrome-profile-')),fileUrl=require('node:url').pathToFileURL(path.join(__dirname,'../index.html')).href+'?debug';
  let persisted=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true});
  try{const p=await persisted.newPage();await p.goto(fileUrl);await p.waitForLoadState('networkidle');await p.evaluate(({key,data})=>{localStorage.setItem(key,JSON.stringify(data));localStorage.setItem('deadline.tutorial.v1','completed');},{key,data:forge});}finally{await persisted.close();}
  persisted=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true});
  try{const p=await persisted.newPage();p.on('pageerror',e=>report.errors.push(String(e)));await p.goto(fileUrl);await p.waitForLoadState('networkidle');await p.locator('#title-start').click();await initialMap(p);assert.equal((await state(p)).journey.restored,2);assert.equal((await state(p)).world.score,forge.run.score);assert.equal(await p.locator('.world-pico').getAttribute('data-location'),'2');report.cases.push({closedChromeReopenedFile:true,profile});}finally{await persisted.close();}
  assert.deepEqual(report.errors,[]);console.log('PASS persistent progress: PC/touch START, map/battle/replay reload, completed map, Pico, audio/training coexistence and corrupt saves');
 }finally{fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
