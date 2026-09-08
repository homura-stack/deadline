'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {begin,plan,state}=require('./tutorial-helpers.cjs');
const base=process.env.DEADLINE_TEST_URL||'http://127.0.0.1:4186/';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),report={cases:[],errors:[]};
 const out=path.join(__dirname,'artifacts',process.env.DEADLINE_REPORT_DIR||'task-l');fs.mkdirSync(out,{recursive:true});
 try{
  for(const [reduced,width] of [[false,1280],[false,390],[true,1280],[true,390]]){
   const p=await browser.newPage({viewport:{width,height:width===390?844:900},reducedMotion:reduced?'reduce':'no-preference'});
   p.on('pageerror',e=>report.errors.push(String(e)));await p.goto(base+'?debug');await p.waitForLoadState('networkidle');
   await p.locator('#title-training-launch').click();await p.waitForFunction(()=>Deadline.inspect().briefingActive);
   await p.locator('#briefing-begin').click();assert.match(await p.locator('.briefing-page:visible p').innerText(),/敵弾のすぐ近くをかわすとTIME STOPゲージが大きく増える/);
   await p.screenshot({path:path.join(out,`near-miss-slide-${reduced}.png`)});
   await p.locator('#briefing-back').click();await begin(p);
   // Actual practice movement earns +16 and one READY, then explicit SPACE enters STOP.
   await plan(p);await p.keyboard.press('KeyC');assert.equal((await state(p)).practice.step,'freeze');
   // Rehearsal cancel refunds the full practice gauge, but must not synthesize a READY event.
   await p.waitForFunction(()=>document.body.classList.contains('gauge-ready-idle'));
   const before=await state(p);
   await p.evaluate(()=>{window.__idleWaves=[];document.querySelector('.charge').addEventListener('animationiteration',e=>{if(e.animationName==='gauge-ready-idle')window.__idleWaves.push(performance.now());});});
   const css=await p.locator('.charge').evaluate(el=>{const s=getComputedStyle(el,'::after');return {name:s.animationName,period:s.animationDuration};});
   if(reduced){assert.equal(css.name,'none');assert.equal(await p.locator('#stop-gauge').evaluate(el=>getComputedStyle(el).animationName),'none');await p.waitForTimeout(1450);assert.equal(await p.evaluate(()=>window.__idleWaves.length),0);}
   else{
    assert.equal(css.name,'gauge-ready-idle');assert.equal(css.period,'1.1s');
    await p.waitForFunction(()=>window.__idleWaves.length>=3);
    const times=await p.evaluate(()=>window.__idleWaves);for(let i=1;i<times.length;i++)assert.ok(times[i]-times[i-1]>950&&times[i]-times[i-1]<1250);
    // Sample the actual weak crest without changing its animation or the game clock.
    await p.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.charge'),'::after').opacity)>.24);
    const crest=await p.locator('.charge').evaluate(el=>{const s=getComputedStyle(el,'::after');return{opacity:Number(s.opacity),inset:parseFloat(s.top)};});
    assert.ok(crest.opacity<=.32);assert.ok(crest.inset>=-14);
    // Inspect real CSS animations at matching phases; no READY/game-state mutation.
    const pulse=await p.locator('.charge').evaluate(el=>{
     const animations=el.getAnimations({subtree:true}),wave=animations.find(a=>a.animationName==='gauge-ready-idle'),bar=animations.find(a=>a.animationName==='gauge-ready-bar');
     if(!wave||!bar)return null;
     const offset=Math.abs(wave.startTime-bar.startTime),period=wave.effect.getTiming().duration;
     for(const a of [wave,bar]){a.pause();a.currentTime=period*.65;}
     const crest={opacity:Number(getComputedStyle(el,'::after').opacity),filter:getComputedStyle(el.querySelector('progress')).filter};
     for(const a of [wave,bar])a.currentTime=period*.99;
     const tail={inset:parseFloat(getComputedStyle(el,'::after').top),filter:getComputedStyle(el.querySelector('progress')).filter};
     for(const a of [wave,bar]){a.currentTime=period*.65;a.play();}
     return{offset,crest,tail};
    });
    assert.ok(pulse,'full gauge needs a synchronized short white bar pulse');assert.ok(pulse.offset<35);
    assert.ok(pulse.crest.opacity<=.32);assert.match(pulse.crest.filter,/brightness/);assert.notEqual(pulse.crest.filter,pulse.tail.filter);
    assert.ok(pulse.tail.inset<-12&&pulse.tail.inset>=-14);await p.screenshot({path:path.join(out,`ready-idle-${width}.png`)});
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'wave must not widen the page');
    report.cases.push({width,pulse});
   }
   const after=await state(p);assert.equal(after.readyFx.activations,before.readyFx.activations);assert.equal(after.audio.plays.ready,before.audio.plays.ready);
   await p.keyboard.press('Space');assert.equal((await state(p)).world.phase,'stopped');
   assert.equal(await p.locator('body').evaluate(el=>el.classList.contains('gauge-ready-idle')),false);
   assert.equal(await p.locator('.charge').evaluate(el=>getComputedStyle(el,'::after').animationName),'none');
   assert.equal(await p.locator('#stop-gauge').evaluate(el=>getComputedStyle(el).animationName),'none');
   assert.equal(await p.locator('#stop-gauge').evaluate(el=>getComputedStyle(el).filter),'none');
   const stoppedCount=await p.evaluate(()=>window.__idleWaves.length);await p.waitForTimeout(1450);assert.equal(await p.evaluate(()=>window.__idleWaves.length),stoppedCount);
   report.cases.push({width,reduced,css,readyEvents:after.readyFx.activations,stopCancels:true});await p.close();
  }
  assert.deepEqual(report.errors,[]);console.log('PASS READY visibility: real Near Miss -> READY -> SPACE; synchronized 1.1s wave/bar pulses, bounded expansion, no repeated sound/events, STOP cancellation, reduced motion');
 }finally{fs.writeFileSync(path.join(out,'feedback.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
