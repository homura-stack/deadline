/* E.1 acceptance: genuine title choices, historical rehearsal, replay and browser preference. */
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {state,move,stroke,begin,plan}=require('./tutorial-helpers.cjs');
const {battleReady}=require('./journey-helpers.cjs');
const base=process.env.DEADLINE_TEST_URL||'http://127.0.0.1:4186/';
const out=path.join(__dirname,'artifacts','tutorial-e1');fs.mkdirSync(out,{recursive:true});
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],external=[],report={browser:browser.version(),runs:[],layouts:[]};
  function hook(p){p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('request',r=>{if(!r.url().startsWith(new URL(base).origin)&&!r.url().startsWith('data:'))external.push(r.url());});}
  async function open(p){hook(p);await p.goto(base+'?debug');await p.waitForLoadState('networkidle');}
  async function first(p){await p.locator('#title-start').click();await p.waitForFunction(()=>Deadline.inspect().firstFlightActive);assert.equal(await p.locator('#world-map').isVisible(),false);assert.equal(await p.evaluate(()=>document.activeElement.id),'first-training');}
  async function map(p){await p.waitForFunction(()=>Deadline.inspect().journey.mode==='map'&&!Deadline.inspect().practice.active);}
  try{
    const p=await browser.newPage({viewport:{width:1920,height:1080}});await open(p);await first(p);
    const frozen=(await state(p)).world;await p.waitForTimeout(200);assert.deepEqual((await state(p)).world,frozen);
    await p.screenshot({path:path.join(out,'01-first-flight.png')});
    await p.keyboard.press('Enter');assert.equal((await state(p)).briefingActive,true);
    for(let run=0;run<2;run++){
      assert.equal(await p.locator('.briefing-page').count(),4);assert.equal(await p.locator('.demo-player-body').count(),0);
      assert.equal(await p.locator('.demo-pico-sprite').count(),4);
      assert.ok((await p.locator('.demo-enemy-sprite').evaluateAll(images=>images.map(i=>i.getAttribute('href')))).every(url=>url==='assets/characters/enemy-02.png'));
      if(!run)await p.screenshot({path:path.join(out,'02-briefing-pico.png')});
      // Back is a native keyboard control, not an accidental NEXT.
      await p.locator('#briefing-begin').click();await p.locator('#briefing-back').focus();await p.keyboard.press('Enter');assert.equal((await state(p)).briefingPage,0);
      await begin(p);const opening=await state(p);
      assert.deepEqual(opening.world.enemies.map(e=>({x:e.x,y:e.y})),[{x:430,y:210},{x:690,y:360}]);assert.equal(opening.practice.step,'move');
      // The real sparse bullets move; Pico traverses the empty lower lane.
      const bullets=opening.world.bullets;await p.waitForTimeout(180);assert.notDeepEqual((await state(p)).world.bullets,bullets);
      const route=await plan(p);assert.equal(route.plan.stopRemaining<=5,true);assert.equal(route.plan.time,route.before.time);
      assert.deepEqual(route.plan.player,route.before.player);assert.deepEqual(route.plan.enemies,route.before.enemies);assert.deepEqual(route.plan.bullets,route.before.bullets);
      if(!run)await p.screenshot({path:path.join(out,'03-golden-line-cyan-targets.png')});
      await p.keyboard.press('Space');assert.equal((await state(p)).practice.step,'running');
      await p.waitForFunction(()=>Deadline.inspect().practice.step==='complete');const done=await state(p);
      assert.equal(done.world.totalKills,2);assert.equal(done.world.score,750);assert.equal(done.world.failed,false);
      assert.ok(Math.hypot(done.world.player.x-route.endpoint.x,done.world.player.y-route.endpoint.y)<1);
      if(!run)await p.screenshot({path:path.join(out,'04-complete.png')});
      await map(p);const after=await state(p);assert.deepEqual(after.world,frozen);assert.equal(after.trainingPreference,'completed');
      assert.equal(after.journey.restored,0);assert.ok((await p.locator('#map-training').boundingBox()).height>=50);
      report.runs.push({run:run+1,targets:2,score:750,completion:'automatic -> WORLD MAP',campaignPreserved:true});
      if(!run){await p.screenshot({path:path.join(out,'05-map-training-button.png')});await p.locator('#map-training').focus();await p.keyboard.press('Space');}
    }
    await p.locator('#map-enter').focus();await p.keyboard.press('Enter');await battleReady(p);
    const normal=await state(p);assert.equal(normal.world.wave,1);assert.equal(normal.world.score,0);assert.equal(normal.world.life,1);assert.equal(normal.journey.restored,0);
    await p.screenshot({path:path.join(out,'06-garden.png')});
    // Completed preference survives reload. HOW TO PLAY still offers training directly.
    await p.reload();await p.waitForLoadState('networkidle');await p.locator('#title-start').click();await map(p);assert.equal((await state(p)).firstFlightActive,false);
    await p.locator('#map-title').click();await p.locator('[data-title-info="how"]').click();await p.locator('#title-training').click();await begin(p);
    // Cancel, restart and exit affect only practice. Exiting through a focused button does not execute.
    await move(p,{x:240,y:470});await p.keyboard.press('Space');await stroke(p,[{x:300,y:390}]);await p.keyboard.press('KeyC');assert.equal((await state(p)).practice.step,'freeze');
    await p.keyboard.press('KeyR');assert.equal((await state(p)).practice.step,'move');
    await p.locator('#practice-exit').focus();await p.keyboard.press('Space');await map(p);assert.equal((await state(p)).trainingPreference,'completed');
    await p.close();
    // First SKIP is a secondary, keyboard-accessible action. Reload never forces training again.
    const skip=await browser.newPage({viewport:{width:1280,height:720}});await open(skip);await first(skip);await skip.keyboard.press('Tab');assert.equal(await skip.evaluate(()=>document.activeElement.id),'first-skip');await skip.keyboard.press('Space');await map(skip);
    assert.equal((await state(skip)).trainingPreference,'skipped');await skip.reload();await skip.waitForLoadState('networkidle');await skip.locator('#title-start').click();await map(skip);assert.equal((await state(skip)).firstFlightActive,false);
    await skip.locator('#map-training').click();await skip.locator('#briefing-skip').focus();await skip.keyboard.press('Enter');await map(skip);await skip.close();
    // Storage-denied browsers retain the choice for this page session and remain playable.
    const blocked=await browser.newPage({viewport:{width:1280,height:720}});await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));await open(blocked);await first(blocked);await blocked.keyboard.press('Escape');await map(blocked);await blocked.locator('#map-title').click();await blocked.locator('#title-start').click();await map(blocked);assert.equal((await state(blocked)).firstFlightActive,false);await blocked.close();
    for(const viewport of [{width:1920,height:1080},{width:1280,height:720},{width:768,height:800},{width:390,height:844},{width:320,height:800},{width:844,height:390}]){
      const v=await browser.newPage({viewport,reducedMotion:'reduce'});await open(v);await first(v);
      for(const selector of ['#first-training','#first-skip']){const box=await v.locator(selector).boundingBox();assert.ok(box.x>=0&&box.x+box.width<=viewport.width&&box.y>=0&&box.y+box.height<=viewport.height);assert.ok(box.height>=44);}
      assert.equal(await v.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await v.screenshot({path:path.join(out,`first-${viewport.width}.png`)});
      await v.locator('#first-skip').click();await map(v);await v.locator('#map-training').scrollIntoViewIfNeeded();const button=await v.locator('#map-training').boundingBox();assert.ok(button.height>=50);assert.ok(button.x>=0&&button.x+button.width<=viewport.width);report.layouts.push(viewport);await v.close();
    }
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);report.errors=errors;report.externalRequests=external;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
    console.log('PASS E.1: first START -> four-page Pico briefing -> two-target practice -> automatic MAP -> Garden; replay, HOW TO PLAY, skip/reload, blocked storage, keyboard controls, six layouts; console errors 0');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
