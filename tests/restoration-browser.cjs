'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {state,planWave,surviveUntilReady}=require('./browser.cjs');
const {battleReady,nextArea}=require('./journey-helpers.cjs');
const base=process.env.DEADLINE_TEST_URL||'http://127.0.0.1:4186/';
const out=path.join(__dirname,'artifacts','restoration');fs.mkdirSync(out,{recursive:true});
const report={browser:'',pixels:[],flow:[],errors:[],failedRequests:[],loading:null,layouts:[]};
const loadingOnly=process.argv.includes('--loading-only');
const save=(name,data)=>fs.writeFileSync(path.join(out,name),Buffer.from(data.split(',')[1],'base64'));
function hook(p){p.on('pageerror',e=>report.errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});p.on('requestfailed',r=>report.failedRequests.push(r.url()));}
async function start(p){await p.locator('#title-start').click();await p.waitForFunction(()=>Deadline.inspect().journey.mode==='map');await p.locator('#map-enter').click();await battleReady(p);}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});report.browser=browser.version();
 try{
  if(!loadingOnly){
  // Isolated rendering fixtures validate actual JPEG pixels, not just loader status or canvas dimensions.
  const fixture=await browser.newPage({viewport:{width:1920,height:1080}});hook(fixture);await fixture.goto(base+'?debug');await fixture.waitForLoadState('networkidle');
  for(let area=0;area<5;area++){
   await fixture.evaluate(i=>Deadline.stageArt.prepare(i),area);await fixture.waitForFunction(i=>Deadline.stageArt.status(i)==='ready',area);
   const result=await fixture.evaluate(i=>{
    const D=Deadline,j={...D.journey.create(),active:i,mode:'battle',origin:{x:80,y:510}},c=document.createElement('canvas');c.width=960;c.height=600;
    const renderer={ctx:c.getContext('2d'),scale:1,ratio:1},app={journey:j,reducedMotion:false};
    const paint=()=>{D.stageArt.draw(renderer,app);return new Uint8ClampedArray(renderer.ctx.getImageData(0,0,960,600).data);};
    const before=paint(), beforeImage=c.toDataURL();j.mode='restoring';j.elapsed=.3;const quiet=paint();
    j.elapsed=D.journey.restoreSeconds(j);const after=paint(),afterImage=c.toDataURL();
    j.elapsed=2.48;const f=D.journey.restorationFrame(j),middle=paint(),middleImage=c.toDataURL();
    const farthest=Math.hypot(960-80,510),radius=(farthest+110)*f.reveal;let near=0,far=0,soft=0,bad=0,quietDifference=0;
    const delta=(a,b,k)=>Math.abs(a[k]-b[k])+Math.abs(a[k+1]-b[k+1])+Math.abs(a[k+2]-b[k+2]);
    for(let y=0;y<600;y+=3)for(let x=0;x<960;x+=3){const k=(y*960+x)*4;quietDifference+=delta(before,quiet,k);if(delta(before,after,k)<18)continue;
      const d=Math.hypot(x-80,y-510),a=delta(middle,after,k),b=delta(middle,before,k);
      if(d<radius-81){near++;if(a>3)bad++;}else if(d>radius+81){far++;if(b>3)bad++;}else if(a>3&&b>3)soft++;
    }
    // At 100%, the final image is the un-darkened AFTER cache, without a global fade.
    const expected=renderer.stageCache.after.getContext('2d').getImageData(0,0,960,600).data;let fullDifference=0;
    for(let k=0;k<after.length;k+=4)fullDifference+=delta(after,expected,k);
    j.mode='battle';const combatAgain=paint();let combatDifference=0;for(let k=0;k<before.length;k+=4)combatDifference+=delta(before,combatAgain,k);
    return {area:i,id:D.journey.areas[i].id,near,far,soft,bad,quietDifference,fullDifference,combatDifference,origin:j.origin,images:D.stageArt.inspect().images,beforeImage,middleImage,afterImage};
   },area);
   assert.equal(result.quietDifference,0);assert.equal(result.fullDifference,0);assert.equal(result.combatDifference,0);assert.equal(result.bad,0);
   assert.ok(result.near>100&&result.far>100&&result.soft>100,'Pico-local fully restored, untouched far field, and a soft transition must coexist');
   for(const [kind,key] of [['before','beforeImage'],['spreading','middleImage'],['after','afterImage']]){save(`${result.id}-${kind}-pixels.png`,result[key]);delete result[key];}
   report.pixels.push(result);console.log('PASS JPEG pixels / quiet / soft radial reveal / full AFTER / combat BEFORE:',result.id);
  }
  await fixture.close();
  const p=await browser.newPage({viewport:{width:1920,height:1080}});hook(p);
  await p.addInitScript(()=>{let seed=0xdead1e;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);});
  await p.goto(base+'?debug');await p.waitForLoadState('networkidle');await start(p);
  await p.evaluate(()=>{
   const original=Deadline.Renderer.prototype.draw;window.__restoration={frames:0,mutations:0,residueFrames:0,stages:{}};
   Deadline.Renderer.prototype.draw=function(app){const j=app.journey,check=j.mode==='restoring',before=check?JSON.stringify(app.world):null;original.call(this,app);if(check){const audit=window.__restoration,f=Deadline.journey.restorationFrame(j,app.reducedMotion);audit.frames++;if(app.shake||app.pendingFinal||app.hits.length||app.particles.length||app.artFx.flash||app.combatFx.releasePulse)audit.residueFrames++;if(JSON.stringify(app.world)!==before)audit.mutations++;audit.stages[`${j.active}-${f.stage}`]=true;}};
  });
  for(let wave=1;wave<=10;wave++){
   if(wave>1){if(wave%2===1)await nextArea(p);else await p.waitForFunction(n=>Deadline.inspect().world.wave===n,wave);}
   if(wave===7){await p.waitForFunction(()=>Deadline.inspect().world.phase==='rule-preview');await p.keyboard.press('Space');await p.keyboard.press('Space');}
   await p.waitForFunction(()=>Deadline.inspect().world.phase==='normal');const opening=await state(p),area=Math.floor((wave-1)/2),id=['garden','forge','canal','skyline','core'][area];
   assert.equal(opening.journey.active,area);assert.equal(opening.stageArt.images.find(e=>e.id===id+'_before').status,'ready');assert.ok(opening.stageArt.images.length<=4);
   await surviveUntilReady(p);if(wave%2===1)await p.screenshot({path:path.join(out,`${id}-combat.png`),fullPage:true});await p.keyboard.press('Space');await planWave(p);
   if(wave%2===1)await p.screenshot({path:path.join(out,`${id}-line-target.png`),fullPage:true});await p.keyboard.press('Space');
   await p.waitForFunction(()=>Deadline.inspect().world.phase==='wave-clear');const cleared=await state(p);
   assert.equal(cleared.world.bullets.length,0);assert.equal(cleared.world.life,1);
   if(wave%2===0){
    assert.equal(cleared.journey.mode,'restoring');assert.deepEqual(cleared.journey.origin,{x:cleared.world.player.x,y:cleared.world.player.y});
    assert.equal(cleared.hits.length,0);assert.equal(cleared.particles.length,0);
    assert.equal(await p.locator('#area-transition-name').innerText(),'');const frozen=cleared.world;
    await p.mouse.move(960,100);await p.keyboard.press('Space');await p.waitForTimeout(180);assert.deepEqual((await state(p)).world,frozen);
    await p.screenshot({path:path.join(out,`${id}-quiet.png`),fullPage:true});
    await p.waitForFunction(()=>Deadline.journey.restorationFrame(Deadline.inspect().journey).reveal>.35);
    await p.screenshot({path:path.join(out,`${id}-spreading.png`),fullPage:true});
    await p.waitForFunction(()=>Deadline.journey.restorationFrame(Deadline.inspect().journey).complete);
    assert.match(await p.locator('#area-transition-name').innerText(),/LIGHT RESTORED/);assert.match(await p.locator('#area-transition-ja').innerText(),new RegExp(id.toUpperCase()));
    await p.waitForTimeout(400);await p.screenshot({path:path.join(out,`${id}-after.png`),fullPage:true});assert.deepEqual((await state(p)).world,frozen);
    await p.waitForFunction(()=>Deadline.journey.onMap(Deadline.inspect().journey));
    const map=await state(p);assert.equal(map.journey.restored,area+1);assert.equal(await p.locator('[data-city][data-status="online"]').count(),area+1);assert.deepEqual(map.world,frozen);
    await p.screenshot({path:path.join(out,`${id}-map-answer.png`),fullPage:true});
   }
   report.flow.push({wave,score:cleared.world.score,kills:cleared.world.totalKills,life:cleared.world.life,area:id});console.log('PASS real Wave',wave,id);
  }
  assert.equal((await state(p)).journey.mode,'synchronizing');
  await p.waitForFunction(()=>Deadline.journey.finaleFrame(Deadline.inspect().journey).sync);assert.equal(await p.locator('#world-sync').isVisible(),true);
  await p.screenshot({path:path.join(out,'world-sync.png')});
  await p.waitForFunction(()=>Deadline.inspect().journey.mode==='ending');await p.waitForTimeout(1250);
  assert.equal(await p.locator('#journey-ending').isVisible(),true);assert.match(await p.locator('#journey-ending').innerText(),/止まった回路に、[\s\S]*もういちど ひかりを。/);
  const ending=await state(p);assert.equal(ending.world.score,18400);assert.equal(ending.world.totalKills,57);assert.equal(ending.world.hitsTaken,0);assert.equal(ending.world.life,1);
  const audit=await p.evaluate(()=>window.__restoration);assert.equal(audit.mutations,0);assert.equal(audit.residueFrames,0);for(let i=0;i<5;i++)for(const stage of ['quiet','breathing','spreading','restored'])assert.equal(audit.stages[`${i}-${stage}`],true);report.audit=audit;
  await p.screenshot({path:path.join(out,'ending-1920.png')});
  for(const size of [{width:1366,height:768},{width:960,height:720},{width:390,height:844},{width:844,height:390}]){
   await p.setViewportSize(size);const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);report.layouts.push({...size,overflow});
   assert.equal(await p.locator('#ending-restart').isEnabled(),true);if(size.width===390)await p.screenshot({path:path.join(out,'ending-390.png'),fullPage:true});
  }
  await p.setViewportSize({width:1920,height:1080});await p.locator('#ending-restart').click();assert.equal((await state(p)).journey.restored,0);assert.equal((await state(p)).journey.mode,'map');assert.equal((await state(p)).world.score,0);
  await p.locator('#map-enter').click();await battleReady(p);assert.equal((await state(p)).world.wave,1);assert.equal((await state(p)).stageArt.images.find(e=>e.id==='garden_before').status,'ready');
  await p.reload();await p.waitForLoadState('networkidle');assert.equal((await state(p)).titleActive,true);await p.close();
  }
  // Delayed / failed file loads are explicit fixtures, separate from the no-error normal run above.
  const delayed=await browser.newPage();const delayedErrors=[];delayed.on('pageerror',e=>delayedErrors.push(String(e)));
  await delayed.route('**/garden_after.jpeg',async route=>{await new Promise(resolve=>setTimeout(resolve,1800));await route.continue();});
  await delayed.goto(base+'?debug',{waitUntil:'domcontentloaded'});await delayed.locator('#title-start').click();await delayed.locator('#map-enter').click();
  await delayed.waitForTimeout(300);assert.equal((await state(delayed)).journey.mode,'entering');assert.equal((await state(delayed)).world.time,0);assert.match(await delayed.locator('#area-transition-note').innerText(),/読み込んでいます/);await battleReady(delayed);await delayed.close();
  const failed=await browser.newPage();const failureErrors=[];failed.on('pageerror',e=>failureErrors.push(String(e)));
  await failed.route('**/garden_after.jpeg',route=>route.abort());await failed.goto(base+'?debug');await failed.locator('#title-start').click();await failed.locator('#map-enter').click();
  await failed.waitForFunction(()=>Deadline.stageArt.status(0)==='error');assert.equal((await state(failed)).world.time,0);assert.equal(await failed.locator('#stage-retry').isVisible(),true);
  await failed.unroute('**/garden_after.jpeg');await failed.locator('#stage-retry').focus();await failed.keyboard.press('Enter');await battleReady(failed);assert.equal((await state(failed)).world.wave,1);await failed.close();
  const cancel=await browser.newPage();cancel.on('pageerror',e=>failureErrors.push(String(e)));
  await cancel.route('**/garden_after.jpeg',async route=>{await new Promise(resolve=>setTimeout(resolve,1400));await route.continue();});
  await cancel.goto(base+'?debug',{waitUntil:'domcontentloaded'});await cancel.locator('#title-start').click();await cancel.locator('#map-enter').click();await cancel.locator('#stage-title').focus();await cancel.keyboard.press('Space');
  assert.equal((await state(cancel)).titleActive,true);await cancel.waitForLoadState('networkidle');assert.equal((await state(cancel)).titleActive,true);assert.equal((await state(cancel)).world.time,0);await cancel.close();
  assert.deepEqual(delayedErrors,[]);assert.deepEqual(failureErrors,[]);report.loading={delayed:'waits without combat time or white frame',failure:'retry returns to Garden; no uncaught exception'};
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);
  console.log(loadingOnly?'PASS background loading delay, keyboard retry, keyboard TITLE and stale-load cancellation':'PASS full original-input journey → all five official AFTER scenes → synchronized map → ending → restart; image masks, layouts and delayed/failed-load recovery');
 }finally{fs.writeFileSync(path.join(out,loadingOnly?'loading.json':'acceptance.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
