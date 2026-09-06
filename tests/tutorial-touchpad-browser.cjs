/* Chrome interaction checks for the visual tutorial, practice flow and relative mobile touch pad. */
'use strict';
const {training,battleReady,nextArea}=require('./journey-helpers.cjs');
const { chromium } = require('playwright');
const assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs');
const C = require('../config.js');
const base = process.env.DEADLINE_TEST_URL || 'http://127.0.0.1:4186/';
const artifacts = path.join(__dirname, 'artifacts'); fs.mkdirSync(artifacts, { recursive: true });

function hook(page, errors) {
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
}
async function drag(cdp, box, points, pointerId = 1) {
  const absolute = points.map(point => ({ x: box.x + point.x, y: box.y + point.y, id: pointerId }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [absolute[0]] });
  for (const point of absolute.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await new Promise(resolve => setTimeout(resolve, 45));
}
async function padTo(cdp,page,target,tolerance=8) {
  for (let i=0;i<48;i++) {
    const snapshot=await page.evaluate(()=>Deadline.inspect()),current=snapshot.world.phase==='stopped'?snapshot.touchDraw.cursor:snapshot.world.player;
    assert.ok(current,'touch draw cursor missing');const dx=target.x-current.x,dy=target.y-current.y,distance=Math.hypot(dx,dy);if(distance<=tolerance)return;
    await page.locator('#move-pad').scrollIntoViewIfNeeded();
    const arena=await page.locator('#arena').boundingBox(),pad=await page.locator('#move-pad').boundingBox(),renderScale=Math.min(arena.width/960,arena.height/600);
    const drawScale=snapshot.world.phase==='stopped'?C.controls.touchDrawSensitivityScale:1,raw=Math.min(46,Math.max(7,distance*renderScale/(snapshot.touchPad.sensitivity/100*drawScale)));
    const center={x:pad.width/2,y:pad.height/2};await drag(cdp,pad,[center,{x:center.x+dx/distance*raw,y:center.y+dy/distance*raw}],7);
  }
  assert.fail(`MOVE PAD did not reach ${JSON.stringify(target)}`);
}
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true }), errors = [];
  try {
    const variants=[{width:390,height:844},{width:844,height:390},{width:390,height:844,reduce:true}];
    for(const viewport of variants){
      const context=await browser.newContext({viewport,deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:viewport.reduce?'reduce':'no-preference'});
      const page=await context.newPage();hook(page,errors);const cdp=await context.newCDPSession(page);
      await page.goto(base+'?debug');await page.waitForLoadState('networkidle');
      await page.locator('[data-title-info="settings"]').tap();await page.locator('#touch-sensitivity').fill('135');
      await page.reload();await page.waitForLoadState('networkidle');assert.equal(await page.locator('#touch-sensitivity').inputValue(),'135');
      await page.locator('[data-title-info="how"]').tap();await page.locator('#title-training').tap();
      if(viewport.reduce)assert.equal(await page.locator('.pico-welcome-art').evaluate(el=>el.getAnimations({subtree:true}).length),0);
      await page.locator('#briefing-begin').tap();await page.waitForFunction(()=>Deadline.inspect().practice.active);
      assert.match(await page.locator('#tutorial-prompt').innerText(),/MOVE PAD/);
      const initial=await page.evaluate(()=>Deadline.inspect().world.player);
      await page.locator('#arena').scrollIntoViewIfNeeded();const canvas=await page.locator('#arena').boundingBox();
      await drag(cdp,canvas,[{x:canvas.width*.2,y:canvas.height*.7},{x:canvas.width*.8,y:canvas.height*.25}]);
      assert.deepEqual(await page.evaluate(()=>Deadline.inspect().world.player),initial,'field touch cannot MOVE');
      await page.locator('#move-pad').scrollIntoViewIfNeeded();let pad=await page.locator('#move-pad').boundingBox(),center={x:pad.width/2,y:pad.height/2};
      await drag(cdp,pad,[center,{x:center.x,y:center.y-5}]);let precise=await page.evaluate(()=>Deadline.inspect().world.player);
      const preciseDistance=Math.hypot(precise.x-initial.x,precise.y-initial.y);assert.ok(preciseDistance>0&&preciseDistance<35);
      await drag(cdp,pad,[center,{x:center.x,y:center.y-46}]);let fast=await page.evaluate(()=>Deadline.inspect().world.player);
      assert.ok(Math.hypot(fast.x-precise.x,fast.y-precise.y)>preciseDistance*3,'relative pad precision curve');
      await padTo(cdp,page,{x:220,y:350});await page.waitForFunction(()=>Deadline.inspect().practice.step==='freeze');
      await page.locator('#time-stop').tap();assert.equal(await page.evaluate(()=>Deadline.inspect().practice.step),'draw');
      const routeBefore=await page.evaluate(()=>Deadline.inspect().world.route.points);
      await page.locator('#arena').scrollIntoViewIfNeeded();const stoppedCanvas=await page.locator('#arena').boundingBox();
      await drag(cdp,stoppedCanvas,[{x:stoppedCanvas.width*.2,y:stoppedCanvas.height*.6},{x:stoppedCanvas.width*.8,y:stoppedCanvas.height*.3}]);
      await page.locator('#arena').dispatchEvent('contextmenu',{pointerType:'touch'});
      assert.deepEqual(await page.evaluate(()=>Deadline.inspect().world.route.points),routeBefore,'field touch/context menu cannot DRAW or UNDO');
      await padTo(cdp,page,{x:275,y:350});assert.equal(await page.evaluate(()=>Deadline.inspect().practice.step),'target');
      const released=await page.evaluate(()=>Deadline.inspect().touchDraw.cursor);assert.equal(await page.evaluate(()=>Deadline.inspect().touchPad.active),false);
      await padTo(cdp,page,{x:310,y:430});assert.equal(await page.evaluate(()=>Deadline.inspect().practice.step),'dangerIntro');
      assert.ok(await page.evaluate(point=>Deadline.inspect().world.route.points.some(p=>Math.hypot(p.x-point.x,p.y-point.y)<1),released),'release and resume retains prior route');
      await page.locator('#training-action').tap();
      assert.equal(await page.evaluate(()=>Deadline.inspect().practice.step),'evade');
      for(const point of [{x:210,y:350},{x:440,y:350},{x:440,y:430}])await padTo(cdp,page,point);
      assert.equal(await page.evaluate(()=>Deadline.inspect().practice.evaded),true,JSON.stringify(await page.evaluate(()=>({practice:Deadline.inspect().practice,player:Deadline.inspect().world.player,phase:Deadline.inspect().world.phase}))));await page.locator('#time-stop').tap();
      for(const point of require('./tutorial-helpers.cjs').safeRoute)await padTo(cdp,page,point);
      assert.equal(await page.evaluate(()=>Deadline.inspect().practice.step),'execute');
      const ready=await page.evaluate(()=>Deadline.inspect());assert.equal(ready.world.route.locks.length,3);assert.equal(ready.world.route.danger.length,0);
      await page.screenshot({path:path.join(artifacts,`tutorial-e-pad-${viewport.width}-${!!viewport.reduce}.png`),fullPage:true});
      await page.locator('#time-stop').tap();await page.waitForFunction(()=>Deadline.inspect().practice.step==='complete');
      await page.locator('#training-action').tap();await battleReady(page);
      const normal=await page.evaluate(()=>Deadline.inspect());assert.equal(normal.practice.active,false);assert.equal(normal.world.wave,1);assert.equal(normal.world.score,0);assert.equal(normal.world.life,1);
      await context.close();
    }
    // All sizes retain accessible welcome controls and no horizontal clipping.
    for(const viewport of [{width:1920,height:1080},{width:1280,height:720},{width:768,height:800},{width:390,height:844},{width:360,height:800},{width:320,height:800},{width:844,height:390}]){
      const page=await browser.newPage({viewport});hook(page,errors);await page.goto(base+'?debug');await page.waitForLoadState('networkidle');
      await page.locator('[data-title-info="how"]').click();assert.ok((await page.locator('#title-training').boundingBox()).height>=44);
      await page.locator('#title-training').click();const next=await page.locator('#briefing-begin').boundingBox();
      assert.ok(next.y>=0&&next.y+next.height<=viewport.height,`welcome clipped ${JSON.stringify(viewport)} ${JSON.stringify(next)}`);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.locator('#briefing-begin').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      const hud=await page.locator('.hud').boundingBox();
      for(const selector of ['#life','#score','#lock-count','#wave','#phase']){
        const item=await page.locator(selector).boundingBox();
        assert.ok(item.x>=hud.x&&item.x+item.width<=hud.x+hud.width,`${selector} clipped in practice HUD at ${viewport.width}`);
      }
      const exit=await page.locator('#training-exit').boundingBox();assert.ok(exit.height>=44);
      await page.screenshot({path:path.join(artifacts,`tutorial-e-layout-${viewport.width}.png`),fullPage:true});await page.close();
    }
    assert.deepEqual(errors,[]);
    console.log(`PASS Chrome ${browser.version()} Pico tutorial: full MOVE PAD run in 390x844, 844x390 and reduced motion; field isolation, precision, continuation, 7 responsive widths; console errors 0`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
