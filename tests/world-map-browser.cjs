'use strict';
const {visitCompleted}=require('./journey-helpers.cjs');
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {state,move,planWave,surviveUntilReady}=require('./browser.cjs');
const {battleReady,initialMap}=require('./journey-helpers.cjs');
const base=process.env.DEADLINE_TEST_URL||'http://127.0.0.1:4186/';
const output=path.join(__dirname,'artifacts','journey');fs.mkdirSync(output,{recursive:true});
const report={browser:'',layouts:[],flow:[],render:null,errors:[],externalRequests:[]};
function hook(p){p.on('pageerror',e=>report.errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});p.on('request',r=>{if(!r.url().startsWith(new URL(base).origin)&&!r.url().startsWith('data:'))report.externalRequests.push(r.url());});}
async function mapStart(p){await p.locator('#title-start').click();await initialMap(p);}
async function frozen(p){const before=(await state(p)).world;await p.waitForTimeout(220);assert.deepEqual((await state(p)).world,before);return before;}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});report.browser=browser.version();
 try{
  const p=await browser.newPage({viewport:{width:1920,height:1080}});hook(p);
  await p.addInitScript(()=>{let seed=0xdead1e;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);});
  await visitCompleted(p,base+'?debug');await p.waitForLoadState('networkidle');await mapStart(p);
  assert.equal((await state(p)).world.time,0);assert.equal((await state(p)).journey.restored,0);
  assert.equal(await p.locator('.world-pico').getAttribute('data-location'),'0');
  assert.equal(await p.locator('[data-area][data-status="locked"]').count(),4);assert.equal(await p.locator('[data-city][data-status="online"]').count(),0);
  await frozen(p);
  for(const index of [1,2,3,4]){await p.locator(`[data-area="${index}"]`).click();assert.match(await p.locator('#map-notice').innerText(),/LOCKED/);assert.equal(await p.locator('#map-enter').isDisabled(),true);assert.equal((await state(p)).journey.mode,'map');}
  await p.locator('[data-area="0"]').click();await p.screenshot({path:path.join(output,'map-before-1920.png')});
  for(const size of [{width:1920,height:1080},{width:1366,height:768},{width:960,height:720},{width:390,height:844},{width:844,height:390}]){
   await p.setViewportSize(size);
   const layout=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,nodes:[...document.querySelectorAll('[data-area]')].map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};})}));
   assert.equal(layout.overflow,false);for(const n of layout.nodes){assert.ok(n.x>=0&&n.x+n.w<=size.width+1);assert.ok(n.h>=44);}
   for(let i=0;i<layout.nodes.length;i++)for(let k=i+1;k<layout.nodes.length;k++){const a=layout.nodes[i],b=layout.nodes[k];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'area buttons must not overlap');}
   report.layouts.push({...size,...layout});if(size.width===390)await p.screenshot({path:path.join(output,'map-mobile.png'),fullPage:true});
  }
  await p.setViewportSize({width:1920,height:1080});
  await p.locator('#map-enter').click();assert.equal((await state(p)).journey.mode,'entering');await frozen(p);
  await p.screenshot({path:path.join(output,'garden-entry.png')});await battleReady(p);
  const sizes=await p.evaluate(()=>({pico:Deadline.characters.entries.pico.width,enemies:['enemy01','enemy02','enemy03'].map(k=>Deadline.characters.entries[k].width),radii:[Deadline.config.player.radius,Deadline.config.enemy.radius,Deadline.config.shooting.bulletRadius]}));
  assert.deepEqual(sizes,{pico:48,enemies:[52,52,50],radii:[9,15,5]});report.sizes=sizes;
  await p.evaluate(()=>{
   const draw=Deadline.Renderer.prototype.draw;window.__restoreAudit={frames:0,mutations:0,image:null};
   Deadline.Renderer.prototype.draw=function(app){const check=app.journey.mode==='restoring',before=check?JSON.stringify(app.world):null;draw.call(this,app);if(check){window.__restoreAudit.frames++;if(before!==JSON.stringify(app.world))window.__restoreAudit.mutations++;if(app.journey.elapsed>2&&!window.__restoreAudit.image)window.__restoreAudit.image=this.canvas.toDataURL();}};
  });
  for(let wave=1;wave<=2;wave++){
   if(wave===2)await p.waitForFunction(()=>Deadline.inspect().world.wave===2&&Deadline.inspect().world.phase==='normal');
   assert.equal((await state(p)).journey.mode,'battle');await surviveUntilReady(p);await p.keyboard.press('Space');
   const before=(await state(p)).world;await planWave(p);assert.equal((await state(p)).world.life,1);await p.keyboard.press('Space');
   await p.waitForFunction(()=>Deadline.inspect().world.phase==='wave-clear');const after=await state(p);
   assert.ok(after.world.score>before.score);assert.equal(after.world.life,1);assert.ok(after.world.enemies.every(e=>!e.alive));
   report.flow.push({wave,kills:after.world.totalKills,score:after.world.score,journey:after.journey.mode});
   if(wave===1){assert.equal(after.journey.mode,'battle');assert.equal(after.journey.restored,0);}
   else{assert.equal(after.journey.mode,'restoring');assert.equal(after.journey.restored,0);assert.ok(after.journey.route.length>1);await frozen(p);await p.waitForFunction(()=>Deadline.journey.restorationFrame(Deadline.inspect().journey).complete);await p.waitForTimeout(400);await p.screenshot({path:path.join(output,'garden-light-restored.png')});}
  }
  await p.waitForFunction(()=>Deadline.inspect().journey.mode==='map');const cleared=await frozen(p);
  assert.equal((await state(p)).journey.restored,1);assert.equal(cleared.wave,2);
  const savedGarden=await p.evaluate(()=>JSON.parse(localStorage.getItem('deadline.progress.v1')));assert.equal(savedGarden.restored,1);assert.equal(savedGarden.run.score,cleared.score);
  assert.equal(await p.locator('.world-pico').getAttribute('data-location'),'1','real Garden clear moves Pico to Forge');
  assert.equal(await p.locator('[data-city="0"]').getAttribute('data-status'),'online');assert.equal(await p.locator('[data-city="1"]').getAttribute('data-status'),'available');
  assert.equal(await p.locator('[data-city][data-status="online"]').count(),1);assert.equal(await p.locator('[data-connection][data-powered="true"]').count(),0);
  assert.match(await p.locator('#map-notice').innerText(),/FORGE UNLOCKED/);
  await p.screenshot({path:path.join(output,'map-garden-online.png')});
  // Replay after a real restored area must preserve the complete paused campaign, not just its displayed score.
  // Let the four-second map unlock animation settle before taking an exact state snapshot.
  await p.waitForFunction(()=>Deadline.inspect().journey.elapsed>=4);
  const campaign=await state(p);await p.locator('#map-training').click();
  await require('./tutorial-helpers.cjs').begin(p);await require('./tutorial-helpers.cjs').plan(p);await p.keyboard.press('Space');
  await p.waitForFunction(()=>!Deadline.inspect().practice.active&&Deadline.inspect().journey.mode==='map');
  const replayed=await state(p);assert.deepEqual(replayed.world,campaign.world);assert.deepEqual(replayed.journey,campaign.journey);
  await p.locator('#map-training').click();await p.locator('#briefing-skip').click();assert.deepEqual((await state(p)).world,campaign.world);assert.deepEqual((await state(p)).journey,campaign.journey);
  report.flow.push({trainingReplay:'complete and abort preserve real Garden-restored campaign exactly'});
  await p.locator('[data-area="0"]').click();assert.equal(await p.locator('#map-enter').isDisabled(),false);assert.match(await p.locator('#map-enter').innerText(),/REPLAY GARDEN/);const campaignAtReplay=await state(p);
  assert.equal(await p.locator('.world-pico').getAttribute('data-location'),'1','past-area selection does not move Pico');
  await p.locator('#map-enter').click();await battleReady(p);let replay=await state(p);assert.equal(replay.areaReplayActive,true);assert.equal(replay.journey.replay,true);assert.equal(replay.world.wave,1);assert.equal(replay.world.score,0);
  for(const wave of [1,2]){if(wave===2)await p.waitForFunction(()=>Deadline.inspect().world.wave===2&&Deadline.inspect().world.phase==='normal');await surviveUntilReady(p);await p.keyboard.press('Space');await planWave(p);await p.keyboard.press('Space');if(wave===1)await p.waitForFunction(()=>Deadline.inspect().world.phase==='wave-clear');}
  await p.waitForFunction(()=>!Deadline.inspect().areaReplayActive&&Deadline.inspect().journey.mode==='map');const afterAreaReplay=await state(p);assert.deepEqual(afterAreaReplay.world,campaignAtReplay.world);assert.deepEqual(afterAreaReplay.journey,campaignAtReplay.journey);assert.match(await p.locator('#map-notice').innerText(),/REPLAY COMPLETE/);
  report.flow.push({areaReplay:'Garden Waves 1-2 return to the exact restored campaign without unlocking or score mutation'});
  assert.equal(await p.locator('.world-pico').getAttribute('data-location'),'1','actual replay returns Pico to campaign location');
  assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('deadline.progress.v1'))),savedGarden,'real AREA replay cannot write temporary score or progress');
  const audit=await p.evaluate(()=>window.__restoreAudit);assert.ok(audit.frames>20);assert.equal(audit.mutations,0);assert.ok(audit.image);fs.writeFileSync(path.join(output,'restoration-canvas.png'),Buffer.from(audit.image.split(',')[1],'base64'));delete audit.image;report.render=audit;
  await p.reload();await p.waitForLoadState('networkidle');await mapStart(p);assert.equal((await state(p)).journey.restored,1);assert.equal((await state(p)).world.score,cleared.score);assert.equal(await p.locator('.world-pico').getAttribute('data-location'),'1');
  await p.locator('[data-area="2"]').click();assert.equal(await p.locator('#map-enter').isDisabled(),true);await p.locator('[data-area="1"]').click();await p.locator('#map-enter').click();await battleReady(p);
  const forge=(await state(p)).world;assert.equal(forge.wave,3);assert.equal(forge.score,cleared.score);assert.equal(forge.life,1);assert.equal(forge.totalKills,cleared.totalKills);
  assert.match(await p.locator('#area-caption').innerText(),/FORGE.*WAVE 1 \/ 2/);await p.screenshot({path:path.join(output,'forge-wave-3.png')});
  await p.keyboard.press('KeyR');assert.equal((await state(p)).journey.mode,'map');assert.equal((await state(p)).journey.restored,1);assert.equal((await state(p)).world.score,cleared.score);
  await p.reload();await p.waitForLoadState('networkidle');assert.equal((await state(p)).titleActive,true);await mapStart(p);assert.equal((await state(p)).journey.restored,1);
  assert.equal(await p.locator('.world-pico').getAttribute('data-location'),'1','reload restores the committed campaign progress');
  const reduced=await browser.newPage({viewport:{width:1280,height:720},reducedMotion:'reduce'});hook(reduced);await visitCompleted(reduced,base+'?debug');await mapStart(reduced);await reduced.locator('#map-enter').focus();await reduced.keyboard.press('Enter');await battleReady(reduced);assert.equal((await state(reduced)).world.phase,'normal');await reduced.close();
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);
  console.log('PASS real title → map → Garden Waves 1–2 → LIGHT RESTORED → Garden ONLINE → Forge Wave 3; locks, pause, score/life, restart, reload, five layouts, reduced motion and render isolation');
 }finally{fs.writeFileSync(path.join(output,'acceptance.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
