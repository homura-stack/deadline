'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {state,move,stroke,safeRoute}=require('./tutorial-helpers.cjs');
const {battleReady}=require('./journey-helpers.cjs');
const base=process.env.DEADLINE_TEST_URL||'http://127.0.0.1:4186/';
const out=path.join(__dirname,'artifacts','tutorial-e');fs.mkdirSync(out,{recursive:true});
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],external=[],report={browser:browser.version(),runs:[]};
  const p=await browser.newPage({viewport:{width:1920,height:1080}});
  p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  p.on('request',r=>{if(!r.url().startsWith(new URL(base).origin)&&!r.url().startsWith('data:'))external.push(r.url());});
  try{
    await p.goto(base+'?debug');await p.waitForLoadState('networkidle');
    for(let run=0;run<2;run++){
      await p.locator('[data-title-info="how"]').click();if(!await p.locator('#title-training').isVisible())await p.locator('[data-title-info="how"]').click();
      await p.locator('#title-training').click();assert.equal((await state(p)).briefingActive,true);
      assert.equal(await p.locator('.demo-player-body').count(),0);
      assert.ok(await p.locator('.pico-welcome-art img').evaluate(i=>i.complete&&i.naturalWidth>0));
      if(!run)await p.screenshot({path:path.join(out,'01-welcome.png')});
      await p.locator('#briefing-begin').click();
      const sprites=await p.evaluate(()=>Deadline.inspect().world.enemies.map(e=>Deadline.characters.enemyTypes[e.pattern]));
      assert.deepEqual(sprites,['enemy01','enemy02','enemy03']);
      // No action, button or keyboard spam can mark a lesson completed.
      await p.keyboard.press('Space');assert.equal((await state(p)).practice.step,'move');
      assert.equal(await p.locator('#training-action').isVisible(),false);
      await move(p,{x:220,y:350});await p.keyboard.press('Space');
      if(!run){
        const frozen=(await state(p)).world;await p.waitForTimeout(5600);const after=(await state(p)).world;
        assert.deepEqual(after,frozen,'reading during STOP must not time out or move any actor');
        assert.equal(await p.locator('#stop-time').innerText(),'∞');
      }
      await stroke(p,[{x:275,y:350}]);assert.equal((await state(p)).practice.step,'target');
      await p.keyboard.press('Space');assert.equal((await state(p)).world.phase,'stopped');
      await stroke(p,[(await state(p)).world.enemies[0]]);
      assert.equal((await state(p)).practice.step,'dangerIntro');await p.keyboard.press('Space');assert.equal((await state(p)).world.phase,'stopped');
      await p.locator('#training-action').click();
      // A direct path through the enemy fails and restarts only the avoidance lesson.
      await move(p,{x:440,y:430},1);let snapshot=await state(p);
      assert.equal(snapshot.practice.evaded,false);assert.equal(snapshot.practice.step,'evade');assert.match(snapshot.practice.notice,/危険/);
      for(const pt of [{x:210,y:350},{x:440,y:350},{x:440,y:430}])await move(p,pt);
      assert.equal((await state(p)).practice.evaded,true);await p.keyboard.press('Space');
      await stroke(p,(await state(p)).world.enemies);
      snapshot=await state(p);assert.equal(snapshot.world.route.locks.length,3);assert.ok(snapshot.world.route.danger.length);
      assert.equal(await p.locator('#time-stop').isDisabled(),true);await p.keyboard.press('Space');assert.equal((await state(p)).world.phase,'stopped');
      if(!run)await p.screenshot({path:path.join(out,'02-danger-line.png')});
      await p.keyboard.press('KeyX');await stroke(p,safeRoute);assert.equal((await state(p)).practice.step,'execute');
      await p.keyboard.press('KeyZ');assert.equal((await state(p)).practice.step,'route');await p.keyboard.press('Space');assert.equal((await state(p)).world.phase,'stopped');
      await stroke(p,[safeRoute.at(-1)]);assert.equal((await state(p)).practice.step,'execute');
      if(!run)await p.screenshot({path:path.join(out,'03-ready-to-fly.png')});
      const bullets=(await state(p)).world.bullets.length;
      await p.keyboard.press('Space');snapshot=await state(p);assert.equal(snapshot.practice.step,'running');assert.equal(snapshot.world.bullets.length,bullets);
      await p.waitForFunction(()=>Deadline.inspect().practice.step==='complete');snapshot=await state(p);
      assert.equal(snapshot.world.totalKills,3);assert.equal(snapshot.world.failed,false);
      for(const step of ['move','freeze','draw','target','dangerIntro','evade','route','execute','running','complete'])assert.ok(snapshot.practice.history.includes(step),step);
      assert.match(await p.locator('#training-copy').innerText(),/2 WAVE/);
      await p.waitForTimeout(1400);assert.equal((await state(p)).practice.step,'complete','completion copy stays until the player continues');
      if(!run)await p.screenshot({path:path.join(out,'04-wave-clear.png')});
      await p.locator('#training-action').focus();await p.keyboard.press('Enter');await battleReady(p);
      snapshot=await state(p);assert.equal(snapshot.practice.active,false);assert.equal(snapshot.world.wave,1);assert.equal(snapshot.world.score,0);assert.equal(snapshot.world.totalKills,0);assert.equal(snapshot.world.hitsTaken,0);assert.equal(snapshot.world.life,1);assert.equal(snapshot.journey.restored,0);
      report.runs.push({run:run+1,lessons:'7, all real input',normalWave:snapshot.world.wave,normalScore:snapshot.world.score});
      if(!run)await p.screenshot({path:path.join(out,'05-normal-garden.png')});
      await p.locator('#restart').click();await p.locator('#map-title').click();
    }
    // Exit/restart/cancel paths and map entry remain available, without granting completion.
    await p.locator('#title-start').click();await p.locator('#map-training').click();await p.locator('#briefing-begin').click();
    await move(p,{x:220,y:350});await p.keyboard.press('Space');await stroke(p,[{x:275,y:350}]);
    await p.keyboard.press('KeyC');assert.equal((await state(p)).practice.step,'freeze');
    await p.keyboard.press('KeyR');assert.equal((await state(p)).practice.step,'move');
    await p.locator('#training-exit').focus();await p.keyboard.press('Space');assert.equal((await state(p)).titleActive,true);
    await p.reload();await p.waitForLoadState('networkidle');assert.equal((await state(p)).practice.active,false);assert.equal((await state(p)).titleActive,true);
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);report.errors=errors;report.externalRequests=external;
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
    console.log('PASS Pico tutorial: 2 real seven-lesson runs, invalid action gates, enemy collision retry, unsafe/undo gates, manual EXECUTE, clean Garden handoff, exit/replay/reload; console errors 0');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
