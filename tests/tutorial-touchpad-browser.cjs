/* Chrome interaction checks for the visual tutorial, practice flow and relative mobile touch pad. */
'use strict';
const {visitCompleted}=require('./journey-helpers.cjs');
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
async function worldPoint(page, point) {
  const box = await page.locator('#arena').boundingBox(), scale = Math.min(box.width / 960, box.height / 600);
  return { x: box.x + (box.width - 960 * scale) / 2 + point.x * scale, y: box.y + (box.height - 600 * scale) / 2 + point.y * scale };
}
async function setDemoTime(page, milliseconds) {
  await page.locator('.briefing-page:visible .briefing-demo').evaluate((demo, time) => {
    for (const animation of demo.getAnimations({ subtree: true })) { animation.pause(); animation.currentTime = time; }
  }, milliseconds);
}
async function padTo(cdp,page,target,tolerance=8) {
  for (let i=0;i<48;i++) {
    const snapshot=await page.evaluate(()=>Deadline.inspect()),current=snapshot.world.phase==='stopped'?snapshot.touchDraw.cursor:snapshot.world.player;
    assert.ok(current,'touch draw cursor missing');const dx=target.x-current.x,dy=target.y-current.y,distance=Math.hypot(dx,dy);if(distance<=tolerance)return;
    const arena=await page.locator('#arena').boundingBox(),pad=await page.locator('#move-pad').boundingBox(),renderScale=Math.min(arena.width/960,arena.height/600);
    const drawScale=snapshot.world.phase==='stopped'?C.controls.touchDrawSensitivityScale:1,raw=Math.min(46,Math.max(7,distance*renderScale/(snapshot.touchPad.sensitivity/100*drawScale)));
    const center={x:pad.width/2,y:pad.height/2};await drag(cdp,pad,[center,{x:center.x+dx/distance*raw,y:center.y+dy/distance*raw}],7);
  }
  assert.fail(`MOVE PAD did not reach ${JSON.stringify(target)}`);
}
async function within(inner, outer, label) {
  assert.ok(inner.x >= outer.x - 1 && inner.y >= outer.y - 1 && inner.x + inner.width <= outer.x + outer.width + 1 && inner.y + inner.height <= outer.y + outer.height + 1, `${label} clipped`);
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true }), errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await context.newPage(); hook(page, errors); const cdp = await context.newCDPSession(page);
    await visitCompleted(page,base + '?debug'); await page.waitForLoadState('networkidle');
    await page.locator('[data-title-info="settings"]').tap(); assert.equal(await page.locator('#touch-sensitivity').isVisible(), true);
    await page.locator('#touch-sensitivity').fill('135'); await page.reload(); await page.waitForLoadState('networkidle');
    await page.locator('[data-title-info="settings"]').tap(); assert.equal(await page.locator('#touch-sensitivity').inputValue(), '135');
    await page.locator('#title-start').tap(); await page.waitForFunction(() => document.getElementById('title-screen').hidden);await training(page);
    const headings = ['01 / EVADE', '02 / NEAR MISS', '03 / FREEZE', '04 / DRAW', '05 / EXECUTE'];
    for (let index = 0; index < headings.length; index++) {
      assert.equal((await page.locator('.briefing-page:visible .briefing-number').innerText()).trim(), headings[index]);
      assert.equal(await page.locator('.briefing-page:visible svg').isVisible(), true);
      assert.equal(await page.locator('.briefing-page:visible .demo-pico-sprite').count(), 1);
      assert.equal(await page.locator('.briefing-page:visible .demo-player > path').count(), 0, 'tutorial uses the Pico image instead of fallback diamond geometry');
      assert.equal(await page.locator('.briefing-page:visible .demo-input-touch').isVisible(), true);
      if (index === 0) {
        assert.equal(await page.locator('.briefing-page:visible .demo-pad-move').isVisible(), true);
        assert.equal(await page.locator('.briefing-page:visible .demo-input-touch.demo-input-evade').count(), 0, 'STEP 1 must not show a finger moving on the game field');
        await page.screenshot({ path: path.join(artifacts, 'tutorial-mobile-move-pad.png'), fullPage: true });
      }
      if (index === 3) { await page.waitForTimeout(650); await page.screenshot({ path: path.join(artifacts, 'tutorial-mobile-draw-pad.png'), fullPage: true }); }
      if (index < headings.length - 1) {
        await page.locator('#briefing-begin').tap();
        if (index === 0) { await page.locator('#briefing-back').tap(); assert.equal((await page.locator('.briefing-page:visible .briefing-number').innerText()).trim(), headings[0]); await page.locator('#briefing-begin').tap(); }
      }
    }
    await page.screenshot({ path: path.join(artifacts, 'tutorial-mobile-draw-execute.png'), fullPage: true });
    await page.locator('#briefing-begin').tap(); await page.waitForFunction(() => Deadline.inspect().practice.active);
    assert.match(await page.locator('#tutorial-prompt').innerText(), /MOVE PAD/); assert.equal(await page.locator('#move-pad').isVisible(), true);
    assert.equal(await page.locator('body').evaluate(body => body.classList.contains('practice-move')), true);
    assert.equal(await page.locator('.practice-pad-finger').isVisible(), true);
    await page.screenshot({ path: path.join(artifacts, 'practice-mobile-move-pad.png'), fullPage: true });
    const normalCanvas = await page.locator('#arena').boundingBox(), normalBefore = await page.evaluate(() => Deadline.inspect().world.player);
    assert.match(await page.locator('#arena').evaluate(element => getComputedStyle(element).touchAction), /pan-y/);
    await drag(cdp, normalCanvas, [{ x: normalCanvas.width * .2, y: normalCanvas.height * .7 }, { x: normalCanvas.width * .8, y: normalCanvas.height * .25 }]);
    assert.deepEqual(await page.evaluate(() => Deadline.inspect().world.player), normalBefore, 'Canvas drag must not move the player on touch devices');
    const pad = await page.locator('#move-pad').boundingBox(), center = { x: pad.width / 2, y: pad.height / 2 };
    const opening = await page.evaluate(() => Deadline.inspect().world.player);
    await drag(cdp, pad, [center, { x: center.x + 5, y: center.y }]);
    const precise = await page.evaluate(() => Deadline.inspect().world.player); const preciseDistance = Math.hypot(precise.x - opening.x, precise.y - opening.y);
    assert.ok(preciseDistance > 0 && preciseDistance < 35, `precise movement ${preciseDistance}`);
    await drag(cdp, pad, [center, { x: center.x + 46, y: center.y - 4 }]);
    const fast = await page.evaluate(() => Deadline.inspect().world.player); const fastDistance = Math.hypot(fast.x - precise.x, fast.y - precise.y);
    assert.ok(fastDistance > preciseDistance * 3, `fast ${fastDistance}, precise ${preciseDistance}`);
    await page.waitForFunction(() => Deadline.inspect().practice.step === 'near-miss');await padTo(cdp,page,(await page.evaluate(()=>Deadline.inspect())).practice.nearMissTarget);
    await page.waitForFunction(() => Deadline.inspect().practice.step === 'freeze');
    assert.equal(await page.locator('body').evaluate(body => body.classList.contains('practice-freeze')), true);
    assert.equal(await page.locator('#time-stop .practice-button-finger').isVisible(), true);
    for (let i = 0; i < 4; i++) await drag(cdp, pad, [center, { x: center.x + 330, y: center.y + 210 }]);
    const bounded = await page.evaluate(() => Deadline.inspect().world.player); assert.ok(bounded.x <= 936 && bounded.y <= 576 && bounded.x >= 24 && bounded.y >= 24);
    await page.waitForTimeout(350);
    assert.equal(await page.locator('#time-stop').isDisabled(), false, JSON.stringify(await page.evaluate(() => Deadline.inspect())));
    await page.locator('#time-stop').tap();
    await page.waitForFunction(() => Deadline.inspect().practice.step === 'draw', {}, { timeout: 3000 });
    assert.equal(await page.evaluate(() => Deadline.inspect().practice.drawStarted), false);
    assert.equal(await page.locator('#move-pad').getAttribute('aria-disabled'), 'false');
    assert.match(await page.locator('#move-pad-label').innerText(), /DRAW ROUTE/);
    assert.equal(await page.locator('.practice-pad-finger').isVisible(), true);
    await page.screenshot({ path: path.join(artifacts, 'practice-mobile-draw-guide.png'), fullPage: true });
    const routeBefore = await page.evaluate(() => Deadline.inspect().world.route.points.length);
    const practice = await page.evaluate(() => Deadline.inspect().world), canvas = await page.locator('#arena').boundingBox();
    const directStart=await worldPoint(page,practice.player),directEnd=await worldPoint(page,practice.enemies[0]);
    await drag(cdp,canvas,[{x:directStart.x-canvas.x,y:directStart.y-canvas.y},{x:directEnd.x-canvas.x,y:directEnd.y-canvas.y}]);
    assert.equal(await page.evaluate(() => Deadline.inspect().world.route.points.length), routeBefore);
    await drag(cdp,pad,[center,{x:center.x+3,y:center.y+1}]);assert.equal(await page.evaluate(()=>Deadline.inspect().world.route.points.length),routeBefore,'touch placement under threshold must not draw');
    await padTo(cdp,page,practice.enemies[0]);let held=await page.evaluate(()=>Deadline.inspect());assert.ok(held.world.route.points.length>1);assert.ok(Math.hypot(held.touchDraw.cursor.x-practice.enemies[0].x,held.touchDraw.cursor.y-practice.enemies[0].y)<10);
    const pointsBeforeLongPress = held.world.route.points.length;
    await page.locator('#arena').evaluate(element => element.dispatchEvent(new PointerEvent('contextmenu', { pointerType: 'touch', button: 2, bubbles: true, cancelable: true })));
    assert.equal(await page.evaluate(() => Deadline.inspect().world.route.points.length), pointsBeforeLongPress, 'Canvas long press/contextmenu must not undo on touch UI');
    await page.locator('#clear-route').tap();let cleared=await page.evaluate(()=>Deadline.inspect());assert.equal(cleared.world.route.points.length,1);assert.deepEqual(cleared.touchDraw.cursor,cleared.world.player);
    await padTo(cdp,page,practice.enemies[0]);const released=await page.evaluate(()=>Deadline.inspect());const releasedCursor={...released.touchDraw.cursor},releasedPoints=released.world.route.points.length;
    assert.equal(released.touchPad.active,false);assert.ok(releasedPoints>1);
    await page.screenshot({ path: path.join(artifacts, 'practice-mobile-draw-pad.png'), fullPage: true });
    await padTo(cdp,page,practice.enemies[1]);await padTo(cdp,page,{x:850,y:470});await page.waitForFunction(() => Deadline.inspect().practice.step === 'execute');
    const continued=await page.evaluate(()=>Deadline.inspect());assert.ok(continued.world.route.points.length>releasedPoints);assert.ok(Math.hypot(continued.world.route.points[releasedPoints-1].x-releasedCursor.x,continued.world.route.points[releasedPoints-1].y-releasedCursor.y)<.01);
    assert.equal(await page.evaluate(() => Deadline.inspect().practice.drawStarted), true);
    assert.equal(await page.evaluate(() => Deadline.inspect().world.route.locks.length), 2);
    assert.equal(await page.locator('#time-stop .practice-button-finger').isVisible(), true);
    await page.locator('#time-stop').tap(); await page.waitForFunction(() => Deadline.inspect().practice.step === 'complete');
    assert.match(await page.locator('#tutorial-prompt').innerText(), /TUTORIAL COMPLETE/);
    await page.waitForFunction(() => !Deadline.inspect().practice.active && Deadline.inspect().world.wave === 1, {}, { timeout: 3500 });
    assert.equal(await page.evaluate(() => Deadline.inspect().journey.mode), 'map');await battleReady(page);
    assert.equal(await page.evaluate(() => Deadline.inspect().world.phase), 'normal');
    await page.screenshot({ path: path.join(artifacts, 'touchpad-mobile-390x844.png'), fullPage: true });
    await context.close();

    const mobileViews = [{ width: 320, height: 800 }, { width: 360, height: 800 }, { width: 390, height: 844 }, { width: 430, height: 860 }, { width: 844, height: 390 }, { width: 768, height: 800 }];
    for (const viewport of mobileViews) {
      const mobile = await browser.newContext({ viewport, isMobile: true, hasTouch: true }); const p = await mobile.newPage(); hook(p, errors);
      await visitCompleted(p,base + '?debug'); await p.waitForLoadState('networkidle'); await p.locator('#title-start').tap(); await p.waitForFunction(() => document.getElementById('title-screen').hidden);await training(p);
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const visiblePage = await p.locator('.briefing-page:visible').boundingBox(), next = await p.locator('#briefing-begin').boundingBox();
      assert.ok(visiblePage.y >= 0 && next.y + next.height <= viewport.height, `${viewport.width}x${viewport.height} briefing overflow`);
      await within(await p.locator('.briefing-page:visible .demo-input-touch').boundingBox(), await p.locator('.briefing-page:visible svg').boundingBox(), `${viewport.width}x${viewport.height} touch input`);
      await p.locator('#briefing-begin').tap();
      assert.match(await p.locator('.briefing-page:visible .briefing-number').innerText(), /NEAR MISS/);
      const nearSlide = await p.locator('.briefing-page:visible').boundingBox(), nearNext = await p.locator('#briefing-begin').boundingBox();
      assert.ok(nearSlide.y >= 0 && nearNext.y + nearNext.height <= viewport.height, `${viewport.width}x${viewport.height} Near Miss briefing overflow`);
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      if (viewport.width === 390) await p.screenshot({ path: path.join(artifacts, 'tutorial-mobile-near-miss.png'), fullPage: true });
      await p.locator('#briefing-skip').tap(); await p.waitForFunction(() => document.getElementById('briefing-screen').hidden);await battleReady(p);
      const field = await p.locator('#arena').boundingBox(), movePad = await p.locator('#move-pad').boundingBox(), action = await p.locator('#time-stop').boundingBox();
      assert.ok(field.width >= (viewport.width > viewport.height ? viewport.width * .52 : viewport.width - 60), `${viewport.width}x${viewport.height} field width ${field.width}`);
      assert.ok(movePad.width > 85 && movePad.height >= 88); assert.ok(action.height >= 44);
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      if (viewport.width === 844) await p.screenshot({ path: path.join(artifacts, 'touchpad-landscape-844x390.png'), fullPage: true });
      await mobile.close();
    }

    const landscapeContext = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    const landscape = await landscapeContext.newPage(); hook(landscape, errors); const landscapeCdp = await landscapeContext.newCDPSession(landscape);
    await visitCompleted(landscape,base + '?debug'); await landscape.waitForLoadState('networkidle'); await landscape.locator('#title-start').tap();await training(landscape);
    for (let i = 0; i < 5; i++) await landscape.locator('#briefing-begin').tap();
    await landscape.waitForFunction(() => Deadline.inspect().practice.active);
    let landscapePad = await landscape.locator('#move-pad').boundingBox(), landscapeCenter = { x: landscapePad.width / 2, y: landscapePad.height / 2 };
    const landscapeCanvas = await landscape.locator('#arena').boundingBox(), landscapeBefore = await landscape.evaluate(() => Deadline.inspect().world.player);
    await drag(landscapeCdp, landscapeCanvas, [{ x: landscapeCanvas.width * .2, y: landscapeCanvas.height * .75 }, { x: landscapeCanvas.width * .75, y: landscapeCanvas.height * .2 }]);
    assert.deepEqual(await landscape.evaluate(() => Deadline.inspect().world.player), landscapeBefore, '844x390 Canvas drag must not move the player');
    for (let i = 0; i < 3 && await landscape.evaluate(() => Deadline.inspect().practice.step === 'move'); i++) await drag(landscapeCdp, landscapePad, [landscapeCenter, { x: landscapeCenter.x + 46, y: landscapeCenter.y - 5 }]);
    await landscape.waitForFunction(() => Deadline.inspect().practice.step === 'near-miss');await padTo(landscapeCdp,landscape,(await landscape.evaluate(()=>Deadline.inspect())).practice.nearMissTarget);
    await landscape.waitForFunction(() => Deadline.inspect().practice.step === 'freeze'); await landscape.locator('#time-stop').tap();
    await landscape.waitForFunction(() => Deadline.inspect().practice.step === 'draw');
    const landscapePractice = await landscape.evaluate(() => Deadline.inspect().world), landscapeRouteBefore = landscapePractice.route.points.length;
    await drag(landscapeCdp, landscapeCanvas, [{ x: landscapeCanvas.width * .25, y: landscapeCanvas.height * .65 }, { x: landscapeCanvas.width * .8, y: landscapeCanvas.height * .3 }]);
    assert.equal(await landscape.evaluate(() => Deadline.inspect().world.route.points.length), landscapeRouteBefore, '844x390 Canvas drag must not draw');
    await padTo(landscapeCdp, landscape, landscapePractice.enemies[0]); const landscapeFirst = await landscape.evaluate(() => Deadline.inspect());
    const landscapeHeldPoints = landscapeFirst.world.route.points.length, landscapeHeldCursor = { ...landscapeFirst.touchDraw.cursor };
    await padTo(landscapeCdp, landscape, landscapePractice.enemies[1]); await padTo(landscapeCdp, landscape, { x: 850, y: 470 });
    const landscapeContinued = await landscape.evaluate(() => Deadline.inspect());
    assert.ok(landscapeContinued.world.route.points.length > landscapeHeldPoints);
    assert.ok(Math.hypot(landscapeContinued.world.route.points[landscapeHeldPoints - 1].x - landscapeHeldCursor.x, landscapeContinued.world.route.points[landscapeHeldPoints - 1].y - landscapeHeldCursor.y) < .01);
    assert.equal(landscapeContinued.world.route.locks.length, 2); await landscape.locator('#time-stop').tap();
    await landscape.waitForFunction(() => Deadline.inspect().practice.step === 'complete');
    await landscape.waitForFunction(() => !Deadline.inspect().practice.active && Deadline.inspect().world.wave === 1, {}, { timeout: 3500 });
    assert.equal(await landscape.evaluate(() => Deadline.inspect().journey.mode),'map');await battleReady(landscape);
    await landscape.screenshot({ path: path.join(artifacts, 'touchpad-landscape-844x390.png'), fullPage: true });
    await landscapeContext.close();

    const visual = await browser.newPage({ viewport: { width: 1280, height: 720 } }); hook(visual, errors);
    await visitCompleted(visual,base + '?debug'); await visual.waitForLoadState('networkidle'); await visual.keyboard.press('Space'); await visual.waitForFunction(() => document.getElementById('title-screen').hidden);await training(visual);
    await visual.addStyleTag({ content: '.briefing-copy,.briefing-header,.briefing-demo text{visibility:hidden}' });
    await setDemoTime(visual, 1500);
    const evadePlayer = await visual.locator('.briefing-page:visible .demo-player').boundingBox(), evadeBullet = await visual.locator('.briefing-page:visible .demo-bullet').boundingBox();
    assert.ok(Math.abs((evadePlayer.y + evadePlayer.height / 2) - (evadeBullet.y + evadeBullet.height / 2)) > 45, 'STEP 1 player must visibly clear the bullet lane');
    assert.equal(await visual.locator('.briefing-page:visible .demo-mouse-button').evaluate(el=>getComputedStyle(el).fill),'rgb(23, 49, 66)','STEP 1 mouse button must look released');
    await visual.screenshot({ path: path.join(artifacts, 'tutorial-visual-only-01-evade.png'), fullPage: true });
    await visual.locator('#briefing-begin').click(); assert.match(await visual.locator('.briefing-page:visible p').textContent(), /TIME STOPゲージが大きく増える/); await visual.locator('#briefing-begin').click(); await setDemoTime(visual, 1850);
    const freezeColors = await visual.evaluate(() => { const page = document.querySelector('[data-briefing-page="2"]'); return { sprite: page.querySelector('.demo-enemy-sprite').getAttribute('href'), bullet: getComputedStyle(page.querySelector('.demo-bullet')).fill, bulletTransform: getComputedStyle(page.querySelector('.demo-bullet')).transform }; });
    assert.equal(freezeColors.sprite, 'assets/characters/enemy-02.png'); assert.equal(freezeColors.bullet, 'rgb(255, 195, 207)');
    await setDemoTime(visual, 2850); assert.equal(await visual.locator('.briefing-page:visible .demo-bullet').evaluate(el => getComputedStyle(el).transform), freezeColors.bulletTransform, 'STEP 2 bullet must remain frozen');
    await visual.screenshot({ path: path.join(artifacts, 'tutorial-visual-only-02-freeze.png'), fullPage: true });
    await visual.locator('#briefing-begin').click(); await setDemoTime(visual, 420);
    assert.equal(await visual.locator('.briefing-page:visible .demo-mouse-button').evaluate(el=>getComputedStyle(el).fill),'rgb(121, 228, 242)','STEP 3 mouse button must visibly press');
    assert.ok(Number(await visual.locator('.briefing-page:visible .demo-click-origin').evaluate(el=>getComputedStyle(el).opacity))>0,'STEP 3 click ring must appear');
    await setDemoTime(visual, 1750);
    assert.equal(await visual.locator('.briefing-page:visible .demo-target-one').evaluate(el => getComputedStyle(el).opacity), '1');
    assert.notEqual(await visual.locator('.briefing-page:visible .demo-target-two').evaluate(el => getComputedStyle(el).opacity), '1');
    await setDemoTime(visual, 2450); assert.equal(await visual.locator('.briefing-page:visible .demo-target-two').evaluate(el => getComputedStyle(el).opacity), '1');
    await setDemoTime(visual,2700);assert.equal(await visual.locator('.briefing-page:visible .demo-mouse-button').evaluate(el=>getComputedStyle(el).fill),'rgb(23, 49, 66)','STEP 3 mouse button must visibly release');
    await visual.screenshot({ path: path.join(artifacts, 'tutorial-visual-only-03-draw.png'), fullPage: true });
    await visual.locator('#briefing-begin').click(); await setDemoTime(visual, 500);
    let executeState=await visual.evaluate(()=>{const page=document.querySelector('[data-briefing-page="4"]');return{player:getComputedStyle(page.querySelector('.demo-player-execute')).offsetDistance,key:getComputedStyle(page.querySelector('.demo-execute-key')).transform,bullet:getComputedStyle(page.querySelector('.demo-execute-bullet-one')).transform,enemy:page.querySelector('.demo-enemy-sprite').getAttribute('href')};});
    assert.equal(executeState.player,'0%');assert.equal(executeState.enemy,'assets/characters/enemy-02.png');
    await setDemoTime(visual,700);let releaseState=await visual.evaluate(()=>{const page=document.querySelector('[data-briefing-page="4"]');return{player:getComputedStyle(page.querySelector('.demo-player-execute')).offsetDistance,ring:getComputedStyle(page.querySelector('.demo-resume-ring')).opacity,bullet:getComputedStyle(page.querySelector('.demo-execute-bullet-one')).transform};});
    assert.equal(releaseState.player,'0%');assert.ok(Number(releaseState.ring)>0);assert.equal(releaseState.bullet,executeState.bullet,'bullet must remain stopped through SPACE release');
    await setDemoTime(visual,950);const resumedState=await visual.evaluate(()=>{const page=document.querySelector('[data-briefing-page="4"]');return{player:parseFloat(getComputedStyle(page.querySelector('.demo-player-execute')).offsetDistance),bullet:getComputedStyle(page.querySelector('.demo-execute-bullet-one')).transform,enemy:page.querySelector('.demo-enemy-sprite').getAttribute('href')};});
    assert.ok(resumedState.player>0);assert.notEqual(resumedState.bullet,executeState.bullet);assert.equal(resumedState.enemy,executeState.enemy);
    await setDemoTime(visual, 1700);
    assert.equal(await visual.locator('.briefing-page:visible .demo-kill-one').evaluate(el => getComputedStyle(el).opacity), '0');
    assert.equal(await visual.locator('.briefing-page:visible .demo-kill-two').evaluate(el => getComputedStyle(el).opacity), '1');
    await setDemoTime(visual, 2450); assert.equal(await visual.locator('.briefing-page:visible .demo-kill-two').evaluate(el => getComputedStyle(el).opacity), '0');
    await visual.screenshot({ path: path.join(artifacts, 'tutorial-visual-only-04-execute.png'), fullPage: true }); await visual.close();

    const reducedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const reduced = await reducedContext.newPage(); hook(reduced, errors); await visitCompleted(reduced,base + '?debug'); await reduced.waitForLoadState('networkidle'); await reduced.locator('#title-start').tap();await training(reduced);
    for (let index = 0; index < headings.length; index++) {
      assert.equal(await reduced.locator('.briefing-page:visible .briefing-demo').evaluate(demo => demo.getAnimations({ subtree: true }).length), 0, `reduced motion STEP ${index + 1}`);
      if (index < headings.length - 1) await reduced.locator('#briefing-begin').tap();
    }
    assert.equal(await reduced.locator('.briefing-page:visible .demo-impact-one').evaluate(el => getComputedStyle(el).opacity), '0.72');
    await reducedContext.close();

    const desktop = await browser.newPage({ viewport: { width: 1280, height: 720 } }); hook(desktop, errors);
    await visitCompleted(desktop,base + '?debug'); await desktop.waitForLoadState('networkidle'); await desktop.keyboard.press('Space'); await desktop.waitForFunction(() => document.getElementById('title-screen').hidden);await training(desktop);
    for (let i = 0; i < 5; i++) await desktop.locator('#briefing-begin').click();
    await desktop.waitForFunction(() => Deadline.inspect().practice.active);
    assert.equal(await desktop.locator('#move-pad').isVisible(), false); assert.equal(await desktop.locator('.tutorial-prompt .guide-mouse').isVisible(), true);
    const before = await desktop.evaluate(() => Deadline.inspect().world.player), arena = await desktop.locator('#arena').boundingBox();
    await desktop.mouse.move(arena.x + arena.width * .25, arena.y + arena.height * .7); const after = await desktop.evaluate(() => Deadline.inspect().world.player); assert.notDeepEqual(after, before);
    const fps = await desktop.evaluate(() => new Promise(resolve => { const samples = []; let last = performance.now(); function step(now) { samples.push(now - last); last = now; if (samples.length < 70) requestAnimationFrame(step); else resolve(1000 / (samples.reduce((a, b) => a + b, 0) / samples.length)); } requestAnimationFrame(step); }));
    assert.ok(fps > 45, `rAF ${fps.toFixed(1)}fps`); await desktop.close();
    assert.deepEqual(errors, []);
    console.log(`PASS Chrome ${browser.version()} tutorial visual timeline, practice prompts, relative touch pad and 7 responsive viewports`);
    console.log(`PASS 390x844 + 844x390 MOVE PAD-only flow, Canvas MOVE/DRAW/contextmenu isolation, release continuation and ${fps.toFixed(1)}fps rAF sample`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
