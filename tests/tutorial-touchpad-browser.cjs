/* Chrome interaction checks for the visual tutorial, practice flow and relative mobile touch pad. */
'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs');
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
async function within(inner, outer, label) {
  assert.ok(inner.x >= outer.x - 1 && inner.y >= outer.y - 1 && inner.x + inner.width <= outer.x + outer.width + 1 && inner.y + inner.height <= outer.y + outer.height + 1, `${label} clipped`);
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true }), errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await context.newPage(); hook(page, errors); const cdp = await context.newCDPSession(page);
    await page.goto(base + '?debug'); await page.waitForLoadState('networkidle');
    await page.locator('[data-title-info="settings"]').tap(); assert.equal(await page.locator('#touch-sensitivity').isVisible(), true);
    await page.locator('#touch-sensitivity').fill('135'); await page.reload(); await page.waitForLoadState('networkidle');
    await page.locator('[data-title-info="settings"]').tap(); assert.equal(await page.locator('#touch-sensitivity').inputValue(), '135');
    await page.locator('#title-start').tap(); await page.waitForFunction(() => document.getElementById('title-screen').hidden);
    const headings = ['01 / EVADE', '02 / FREEZE', '03 / DRAW', '04 / EXECUTE'];
    for (let index = 0; index < headings.length; index++) {
      assert.equal((await page.locator('.briefing-page:visible .briefing-number').innerText()).trim(), headings[index]);
      assert.equal(await page.locator('.briefing-page:visible svg').isVisible(), true);
      assert.equal(await page.locator('.briefing-page:visible .demo-player-body').count(), 1);
      assert.equal(await page.locator('.briefing-page:visible .demo-player > path').count(), 0, 'tutorial player must use the same diamond geometry as the game');
      assert.equal(await page.locator('.briefing-page:visible .demo-input-touch').isVisible(), true);
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
    const pad = await page.locator('#move-pad').boundingBox(), center = { x: pad.width / 2, y: pad.height / 2 };
    const opening = await page.evaluate(() => Deadline.inspect().world.player);
    await drag(cdp, pad, [center, { x: center.x + 5, y: center.y }]);
    const precise = await page.evaluate(() => Deadline.inspect().world.player); const preciseDistance = Math.hypot(precise.x - opening.x, precise.y - opening.y);
    assert.ok(preciseDistance > 0 && preciseDistance < 35, `precise movement ${preciseDistance}`);
    await drag(cdp, pad, [center, { x: center.x + 46, y: center.y - 4 }]);
    const fast = await page.evaluate(() => Deadline.inspect().world.player); const fastDistance = Math.hypot(fast.x - precise.x, fast.y - precise.y);
    assert.ok(fastDistance > preciseDistance * 3, `fast ${fastDistance}, precise ${preciseDistance}`);
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
    assert.equal(await page.locator('#move-pad').getAttribute('aria-disabled'), 'true');
    const routeBefore = await page.evaluate(() => Deadline.inspect().world.route.points.length);
    await drag(cdp, pad, [center, { x: center.x - 50, y: center.y }]);
    assert.equal(await page.evaluate(() => Deadline.inspect().world.route.points.length), routeBefore);
    const practice = await page.evaluate(() => Deadline.inspect().world), routePoints = [practice.player, ...practice.enemies.map(enemy => ({ x: enemy.x, y: enemy.y })), { x: 850, y: 470 }];
    const canvas = await page.locator('#arena').boundingBox(), screenPoints = [];
    for (const point of routePoints) { const screen = await worldPoint(page, point); screenPoints.push({ x: screen.x - canvas.x, y: screen.y - canvas.y }); }
    await drag(cdp, canvas, screenPoints); await page.waitForFunction(() => Deadline.inspect().practice.step === 'execute');
    assert.equal(await page.evaluate(() => Deadline.inspect().practice.drawStarted), true);
    assert.equal(await page.evaluate(() => Deadline.inspect().world.route.locks.length), 2);
    assert.equal(await page.locator('#time-stop .practice-button-finger').isVisible(), true);
    await page.locator('#time-stop').tap(); await page.waitForFunction(() => Deadline.inspect().practice.step === 'complete');
    assert.match(await page.locator('#tutorial-prompt').innerText(), /TUTORIAL COMPLETE/);
    await page.waitForFunction(() => !Deadline.inspect().practice.active && Deadline.inspect().world.wave === 1, {}, { timeout: 3500 });
    assert.equal(await page.evaluate(() => Deadline.inspect().world.phase), 'normal');
    await page.screenshot({ path: path.join(artifacts, 'touchpad-mobile-390x844.png'), fullPage: true });
    await context.close();

    const mobileViews = [{ width: 320, height: 800 }, { width: 360, height: 800 }, { width: 390, height: 844 }, { width: 430, height: 860 }, { width: 844, height: 390 }, { width: 768, height: 800 }];
    for (const viewport of mobileViews) {
      const mobile = await browser.newContext({ viewport, isMobile: true, hasTouch: true }); const p = await mobile.newPage(); hook(p, errors);
      await p.goto(base + '?debug'); await p.waitForLoadState('networkidle'); await p.locator('#title-start').tap(); await p.waitForFunction(() => document.getElementById('title-screen').hidden);
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const visiblePage = await p.locator('.briefing-page:visible').boundingBox(), next = await p.locator('#briefing-begin').boundingBox();
      assert.ok(visiblePage.y >= 0 && next.y + next.height <= viewport.height, `${viewport.width}x${viewport.height} briefing overflow`);
      await within(await p.locator('.briefing-page:visible .demo-input-touch').boundingBox(), await p.locator('.briefing-page:visible svg').boundingBox(), `${viewport.width}x${viewport.height} touch input`);
      await p.locator('#briefing-skip').tap(); await p.waitForFunction(() => document.getElementById('briefing-screen').hidden);
      const field = await p.locator('#arena').boundingBox(), movePad = await p.locator('#move-pad').boundingBox(), action = await p.locator('#time-stop').boundingBox();
      assert.ok(field.width >= (viewport.width > viewport.height ? viewport.width * .52 : viewport.width - 60), `${viewport.width}x${viewport.height} field width ${field.width}`);
      assert.ok(movePad.width > 85 && movePad.height >= 88); assert.ok(action.height >= 44);
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      if (viewport.width === 844) await p.screenshot({ path: path.join(artifacts, 'touchpad-landscape-844x390.png'), fullPage: true });
      await mobile.close();
    }

    const visual = await browser.newPage({ viewport: { width: 1280, height: 720 } }); hook(visual, errors);
    await visual.goto(base + '?debug'); await visual.waitForLoadState('networkidle'); await visual.keyboard.press('Space'); await visual.waitForFunction(() => document.getElementById('title-screen').hidden);
    await visual.addStyleTag({ content: '.briefing-copy,.briefing-header,.briefing-demo text{visibility:hidden}' });
    await setDemoTime(visual, 1500);
    const evadePlayer = await visual.locator('.briefing-page:visible .demo-player').boundingBox(), evadeBullet = await visual.locator('.briefing-page:visible .demo-bullet').boundingBox();
    assert.ok(Math.abs((evadePlayer.y + evadePlayer.height / 2) - (evadeBullet.y + evadeBullet.height / 2)) > 45, 'STEP 1 player must visibly clear the bullet lane');
    await visual.screenshot({ path: path.join(artifacts, 'tutorial-visual-only-01-evade.png'), fullPage: true });
    await visual.locator('#briefing-begin').click(); await setDemoTime(visual, 1850);
    const freezeColors = await visual.evaluate(() => { const page = document.querySelector('[data-briefing-page="1"]'); return { body: getComputedStyle(page.querySelector('.demo-enemy-body')).fill, barrel: getComputedStyle(page.querySelector('.demo-enemy-part')).fill, bullet: getComputedStyle(page.querySelector('.demo-bullet')).fill, bulletTransform: getComputedStyle(page.querySelector('.demo-bullet')).transform }; });
    assert.equal(freezeColors.body, 'rgb(41, 40, 46)'); assert.equal(freezeColors.barrel, freezeColors.body); assert.equal(freezeColors.bullet, 'rgb(199, 192, 184)');
    await setDemoTime(visual, 2850); assert.equal(await visual.locator('.briefing-page:visible .demo-bullet').evaluate(el => getComputedStyle(el).transform), freezeColors.bulletTransform, 'STEP 2 bullet must remain frozen');
    await visual.screenshot({ path: path.join(artifacts, 'tutorial-visual-only-02-freeze.png'), fullPage: true });
    await visual.locator('#briefing-begin').click(); await setDemoTime(visual, 1750);
    assert.equal(await visual.locator('.briefing-page:visible .demo-target-one').evaluate(el => getComputedStyle(el).opacity), '1');
    assert.notEqual(await visual.locator('.briefing-page:visible .demo-target-two').evaluate(el => getComputedStyle(el).opacity), '1');
    await setDemoTime(visual, 2450); assert.equal(await visual.locator('.briefing-page:visible .demo-target-two').evaluate(el => getComputedStyle(el).opacity), '1');
    await visual.screenshot({ path: path.join(artifacts, 'tutorial-visual-only-03-draw.png'), fullPage: true });
    await visual.locator('#briefing-begin').click(); await setDemoTime(visual, 1450);
    assert.equal(await visual.locator('.briefing-page:visible .demo-kill-one').evaluate(el => getComputedStyle(el).opacity), '0');
    assert.equal(await visual.locator('.briefing-page:visible .demo-kill-two').evaluate(el => getComputedStyle(el).opacity), '1');
    await setDemoTime(visual, 2250); assert.equal(await visual.locator('.briefing-page:visible .demo-kill-two').evaluate(el => getComputedStyle(el).opacity), '0');
    await visual.screenshot({ path: path.join(artifacts, 'tutorial-visual-only-04-execute.png'), fullPage: true }); await visual.close();

    const reducedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const reduced = await reducedContext.newPage(); hook(reduced, errors); await reduced.goto(base + '?debug'); await reduced.waitForLoadState('networkidle'); await reduced.locator('#title-start').tap();
    for (let index = 0; index < headings.length; index++) {
      assert.equal(await reduced.locator('.briefing-page:visible .briefing-demo').evaluate(demo => demo.getAnimations({ subtree: true }).length), 0, `reduced motion STEP ${index + 1}`);
      if (index < headings.length - 1) await reduced.locator('#briefing-begin').tap();
    }
    assert.equal(await reduced.locator('.briefing-page:visible .demo-impact-one').evaluate(el => getComputedStyle(el).opacity), '0.72');
    await reducedContext.close();

    const desktop = await browser.newPage({ viewport: { width: 1280, height: 720 } }); hook(desktop, errors);
    await desktop.goto(base + '?debug'); await desktop.waitForLoadState('networkidle'); await desktop.keyboard.press('Space'); await desktop.waitForFunction(() => document.getElementById('title-screen').hidden);
    for (let i = 0; i < 4; i++) await desktop.locator('#briefing-begin').click();
    await desktop.waitForFunction(() => Deadline.inspect().practice.active);
    assert.equal(await desktop.locator('#move-pad').isVisible(), false); assert.equal(await desktop.locator('.tutorial-prompt .guide-mouse').isVisible(), true);
    const before = await desktop.evaluate(() => Deadline.inspect().world.player), arena = await desktop.locator('#arena').boundingBox();
    await desktop.mouse.move(arena.x + arena.width * .25, arena.y + arena.height * .7); const after = await desktop.evaluate(() => Deadline.inspect().world.player); assert.notDeepEqual(after, before);
    const fps = await desktop.evaluate(() => new Promise(resolve => { const samples = []; let last = performance.now(); function step(now) { samples.push(now - last); last = now; if (samples.length < 70) requestAnimationFrame(step); else resolve(1000 / (samples.reduce((a, b) => a + b, 0) / samples.length)); } requestAnimationFrame(step); }));
    assert.ok(fps > 45, `rAF ${fps.toFixed(1)}fps`); await desktop.close();
    assert.deepEqual(errors, []);
    console.log(`PASS Chrome ${browser.version()} tutorial visual timeline, practice prompts, relative touch pad and 7 responsive viewports`);
    console.log(`PASS text-hidden STEP 1-4 sequence, precision/fast movement, bounds, DRAW separation, pointer capture and ${fps.toFixed(1)}fps rAF sample`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
