'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {visitCompleted,initialMap,battleReady}=require('./journey-helpers.cjs');
const {state,move}=require('./tutorial-helpers.cjs');
const base=process.env.DEADLINE_TEST_URL||'http://127.0.0.1:4186/';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),report={browser:browser.version(),cases:[],errors:[]},out=path.join(__dirname,'artifacts','ready-death');fs.mkdirSync(out,{recursive:true});
 try{
  for(const reduced of [false,true]){
   const p=await browser.newPage({viewport:{width:1366,height:900},reducedMotion:reduced?'reduce':'no-preference'});p.on('pageerror',e=>report.errors.push(String(e)));
   await visitCompleted(p,base+'?debug');await p.waitForLoadState('networkidle');
   await p.evaluate(()=>{const draw=Deadline.Renderer.prototype.draw;Deadline.Renderer.prototype.draw=function(app){window.__fixtureApp=app;draw.call(this,app);if(app.world.failed){
    const x=Math.round((this.offsetX+app.world.player.x*this.scale)*this.ratio),y=Math.round((this.offsetY+app.world.player.y*this.scale)*this.ratio),r=Math.ceil(25*this.scale*this.ratio),pixels=this.ctx.getImageData(x-r,y-r,r*2,r*2).data;let whitePixels=0;
    for(let i=0;i<pixels.length;i+=4)if(pixels[i]>=250&&pixels[i+1]>=250&&pixels[i+2]>=250)whitePixels++;
    (window.__deathFrames??=[]).push({at:performance.now(),...app.deathFx,damage:app.damageFx.remaining,particles:JSON.stringify(app.particles),white:app.deathFx.flashRemaining>0,whitePixels});}};});
   await p.locator('#title-start').click();await initialMap(p);await battleReady(p);await p.waitForFunction(()=>!!window.__fixtureApp);
   async function fixture(gauge){await p.evaluate(gauge=>{const a=window.__fixtureApp,w=a.world;w.gauge=gauge;w.phase='normal';w.failed=false;w.life=1;w.player={x:100,y:100};w.bullets=[];w.enemies=[];w.waveGraceRemaining=0;w.safetyRemaining=0;w.passiveRecoveryScale=0;w.events=[];},gauge);}
   await fixture(100);const opening=(await state(p)).readyFx.activations;await p.waitForTimeout(100);assert.equal((await state(p)).readyFx.activations,opening,'full initialization has no transition');
   await fixture(99);await p.evaluate(()=>window.__fixtureApp.world.passiveRecoveryScale=1);await p.waitForFunction(()=>Deadline.inspect().readyFx.flashRemaining>0);
   let s=await state(p);assert.equal(s.readyFx.activations,opening+1);assert.equal(s.audio.plays.ready,1);assert.equal(s.world.gauge,100);
   assert.equal(await p.locator('body').evaluate(e=>e.classList.contains('gauge-ready-flash')),true);
   await p.screenshot({path:path.join(out,`ready-${reduced?'reduced':'normal'}.png`)});await p.waitForTimeout(450);s=await state(p);assert.equal(s.readyFx.activations,opening+1);assert.equal(s.readyFx.waveRemaining,0);assert.equal(await p.locator('#gauge-value').innerText(),'READY');
   await p.keyboard.press('Space');assert.equal((await state(p)).readyFx.waveRemaining,0);await p.keyboard.press('KeyC');assert.ok((await state(p)).world.gauge<100);
   await fixture(84);await move(p,{x:100,y:100},1);await p.evaluate(()=>window.__fixtureApp.world.bullets=[{id:901,enemyId:0,x:200,y:135,vx:0,vy:0,life:999,grazed:false}]);await move(p,{x:300,y:100});s=await state(p);assert.equal(s.world.gauge,100);assert.equal(s.readyFx.activations,opening+2);assert.equal(s.nearMissFx.gain,16);
   await p.keyboard.press('Space');s=await state(p);assert.equal(s.readyFx.waveRemaining,0);assert.equal(s.readyFx.flashRemaining,0);
   await p.keyboard.press('KeyC');await fixture(99.99);
   const beforeDeath=(await state(p)).readyFx.activations;
   if(reduced)await p.evaluate(()=>Deadline.characters.entries.pico.status='error');
   await p.evaluate(()=>{const w=window.__fixtureApp.world;w.passiveRecoveryScale=1;w.bullets=[{id:902,enemyId:0,x:100,y:100,vx:0,vy:0,life:999,grazed:false}];window.__deathFrames=[];});
   await p.waitForFunction(()=>Deadline.inspect().world.failed);assert.equal((await state(p)).readyFx.activations,beforeDeath,'same-step death suppresses READY');
   assert.equal(await p.locator('#result').isVisible(),false);await p.waitForTimeout(220);s=await state(p);assert.ok(s.deathFx.hitStopRemaining>0);assert.ok(s.deathFx.flashRemaining>0);assert.equal(s.deathFx.reactionRemaining,.35);
   await p.screenshot({path:path.join(out,`impact-${reduced?'reduced':'normal'}.png`)});
   await p.waitForFunction(()=>Deadline.inspect().deathFx.hitStopRemaining<=0);s=await state(p);assert.ok(s.deathFx.reactionRemaining>0);assert.equal(s.deathFx.flashRemaining,0);assert.equal(await p.locator('#result').isVisible(),false);
   await p.waitForFunction(()=>Deadline.inspect().deathFx.resultVisible);const frames=await p.evaluate(()=>window.__deathFrames),hold=frames.filter(f=>f.hitStopRemaining>0),last=frames.find(f=>f.resultVisible);
   assert.ok(hold.length>=2);assert.ok(hold.at(-1).at-hold[0].at>=250,'300ms impact must remain visible beyond the old 200ms hold');assert.ok(hold.every(f=>f.white&&f.reactionRemaining===.35&&f.whitePixels>20),'sprite and fallback must actually render neutral white');assert.equal(new Set(hold.map(f=>f.particles)).size,1);assert.ok(last.at-frames[0].at>=590);assert.ok(last.at-frames[0].at<850);assert.ok(last.reactionRemaining<1e-8);
   assert.equal(await p.locator('body').evaluate(el=>el.classList.contains('gauge-ready-idle')),false);
   await p.keyboard.press('Space');assert.equal((await state(p)).world.wave,1);assert.equal((await state(p)).world.failed,false);
   await fixture(20);await p.evaluate(()=>{const w=window.__fixtureApp.world;w.bullets=[{id:903,enemyId:0,x:100,y:100,vx:0,vy:0,life:999,grazed:false}];window.__deathFrames=[];});await p.waitForFunction(()=>Deadline.inspect().world.failed);
   await p.keyboard.press('Space');assert.equal((await state(p)).deathFx.retryQueued,1);await p.waitForFunction(()=>!Deadline.inspect().world.failed);assert.equal((await state(p)).world.wave,1);
   const queuedDelay=await p.evaluate(()=>performance.now()-window.__deathFrames[0].at);assert.ok(queuedDelay>=590&&queuedDelay<900,`queued retry after ${queuedDelay}ms`);
   // Hiding/returning clears the active pulse and cannot synthesize another charge event.
   await fixture(99);await p.evaluate(()=>window.__fixtureApp.world.passiveRecoveryScale=1);await p.waitForFunction(()=>Deadline.inspect().readyFx.waveRemaining>0);const beforeBlur=(await state(p)).readyFx.activations;
   await p.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal((await state(p)).readyFx.waveRemaining,0);await p.waitForTimeout(100);assert.equal((await state(p)).readyFx.activations,beforeBlur);
   report.cases.push({reducedMotion:reduced,deathVisibleAfterMs:last.at-frames[0].at,heldFrames:hold.length,readyTransitions:beforeBlur});await p.close();
  }
  assert.deepEqual(report.errors,[]);console.log('PASS ready/death feedback: READY transitions, same-step death priority, death timeline, queued retry and reduced motion');
 }finally{fs.writeFileSync(path.join(out,'gameplay.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
