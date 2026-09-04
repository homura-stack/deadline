/* Focused Chrome interaction for the time-stop route presentation. */
'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs');
const base = process.env.DEADLINE_TEST_URL || 'http://127.0.0.1:4186/';
const artifacts = path.join(__dirname, 'artifacts'); fs.mkdirSync(artifacts, { recursive: true });

async function state(page) { return page.evaluate(() => Deadline.inspect()); }
async function coords(page, point) {
  const box = await page.locator('#arena').boundingBox(), scale = Math.min(box.width / 960, box.height / 600);
  return { x: box.x + (box.width - 960 * scale) / 2 + point.x * scale, y: box.y + (box.height - 600 * scale) / 2 + point.y * scale };
}
async function move(page, point, steps = 1) { const at = await coords(page, point); await page.mouse.move(at.x, at.y, { steps }); }

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(base + '?debug'); await page.waitForLoadState('networkidle'); await page.keyboard.press('Space'); await page.waitForFunction(() => document.getElementById('title-screen').hidden); await page.locator('#briefing-skip').click(); await page.waitForFunction(() => document.getElementById('briefing-screen').hidden);
    await page.evaluate(() => { Deadline.config.gauge.initial = 100; Deadline.config.waves.definitions[0].timeStopSeconds = 8; document.getElementById('restart').click(); });
    await page.keyboard.press('Space');
    await page.waitForFunction(() => Deadline.inspect().world.phase === 'stopped' && Deadline.inspect().timeFx.blend === 1);
    const opening = (await state(page)).world;

    await move(page, opening.player); await page.mouse.down();
    await move(page, opening.enemies[0], 12);
    await page.waitForFunction(() => Deadline.inspect().world.route.locks.length === 1);
    let snapshot = await state(page);
    assert.equal(snapshot.drawing, true); assert.equal(snapshot.routeFx.drawing, true);
    assert.equal(snapshot.routeFx.lockFlashes.at(-1).enemyId, snapshot.world.route.locks[0].enemyId);
    await page.locator('#arena').screenshot({ path: path.join(artifacts, 'route-lock-1.png') });

    await move(page, opening.enemies[1], 12);
    await page.waitForFunction(() => Deadline.inspect().world.route.locks.length === 2);
    snapshot = await state(page);
    assert.ok(snapshot.routeFx.lockFlashes.every(flash => snapshot.world.route.locks.some(lock => lock.enemyId === flash.enemyId)));
    await page.locator('#arena').screenshot({ path: path.join(artifacts, 'route-drawing-multi-lock.png') });

    await move(page, { x: 800, y: 520 }, 10); await page.mouse.up(); await page.waitForTimeout(260);
    snapshot = await state(page);
    assert.equal(snapshot.drawing, false); assert.equal(snapshot.routeFx.drawing, false);
    assert.equal(snapshot.world.route.locks.length, 2); assert.equal(snapshot.routeFx.lockFlashes.length, 0);
    await page.locator('#arena').screenshot({ path: path.join(artifacts, 'route-ready-execute.png') });

    await page.keyboard.press('Space');
    await page.waitForFunction(() => Deadline.inspect().world.phase === 'normal' && Deadline.inspect().world.route === null);
    assert.equal((await state(page)).world.enemies.filter(enemy => enemy.alive).length, 1);
    const reduced = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    reduced.on('pageerror', error => errors.push(String(error)));
    reduced.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await reduced.goto(base + '?debug'); await reduced.waitForLoadState('networkidle'); await reduced.keyboard.press('Space'); await reduced.waitForFunction(() => document.getElementById('title-screen').hidden); await reduced.locator('#briefing-skip').click(); await reduced.waitForFunction(() => document.getElementById('briefing-screen').hidden);
    await reduced.evaluate(() => { Deadline.config.gauge.initial = 100; document.getElementById('restart').click(); }); await reduced.keyboard.press('Space');
    await reduced.waitForFunction(() => Deadline.inspect().world.phase === 'stopped' && Deadline.inspect().timeFx.blend === 1);
    const reducedOpening = (await state(reduced)).world; await move(reduced, reducedOpening.player); await reduced.mouse.down(); await move(reduced, reducedOpening.enemies[0], 12); await reduced.mouse.up(); await reduced.waitForTimeout(260);
    assert.equal((await state(reduced)).reducedMotion, true); assert.equal((await state(reduced)).world.route.locks.length, 1);
    const reducedA = await reduced.locator('#arena').screenshot(); await reduced.waitForTimeout(120); const reducedB = await reduced.locator('#arena').screenshot(); assert.deepEqual(reducedA, reducedB);
    await reduced.close(); assert.deepEqual(errors, []);
    console.log('PASS draw start -> target 1 -> target 2 -> route ready -> execute');
    console.log('PASS reduced motion retains route/tip/target and freezes route animation');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
