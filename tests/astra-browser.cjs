/* Chrome acceptance for the redesign. Real input runs and isolated render checks are reported separately. */
'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const base = process.env.DEADLINE_TEST_URL || 'http://127.0.0.1:4186/';
const artifacts = path.join(__dirname, 'artifacts', 'astra');
fs.mkdirSync(artifacts, { recursive: true });
const report = { browser: '', liveRuns: [], layouts: [], renderChecks: {}, errors: [], externalRequests: [] };
const state = page => page.evaluate(() => Deadline.inspect());
function hook(page) {
  page.on('pageerror', error => report.errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
  page.on('request', request => { if (!request.url().startsWith(new URL(base).origin) && !/^(file|data):/.test(request.url())) report.externalRequests.push(request.url()); });
}
async function move(page, point, steps = 1) {
  const box = await page.locator('#arena').boundingBox(), scale = Math.min(box.width / 960, box.height / 600);
  await page.mouse.move(box.x + (box.width - scale * 960) / 2 + point.x * scale, box.y + (box.height - scale * 600) / 2 + point.y * scale, { steps });
}
async function recordFrames(page) {
  await page.evaluate(() => {
    const draw = Deadline.Renderer.prototype.draw;
    window.__artFrames = {}; window.__artAudit = { draws: 0, checkedFrames: 0, worldMutations: 0, maxScores: 0 };
    Deadline.Renderer.prototype.draw = function (app) {
      const audit = window.__artAudit, check = !app.titleActive && !app.briefingActive && ['stopped', 'executing'].includes(app.world.phase) && audit.checkedFrames < 40;
      const before = check ? JSON.stringify(app.world) : null;
      draw.call(this, app); audit.draws++;
      if (check) { audit.checkedFrames++; if (before !== JSON.stringify(app.world)) audit.worldMutations++; }
      audit.maxScores = Math.max(audit.maxScores, app.artFx.scores.length);
      const phase = app.world.phase;
      const name = phase === 'executing' && app.hits.length ? 'ignition' : app.artFx.echo ? 'afterglow' : null;
      if (name && !window.__artFrames[name]) window.__artFrames[name] = this.canvas.toDataURL('image/png');
    };
  });
}
async function trainingRun(page, index) {
  await page.keyboard.press('Space');
  await page.waitForFunction(() => Deadline.inspect().briefingActive);
  for (let i = 0; i < 4; i++) await page.locator('#briefing-begin').click();
  await page.waitForFunction(() => Deadline.inspect().practice.active);
  await move(page, { x: 240, y: 470 }, 8);
  await page.waitForFunction(() => Deadline.inspect().practice.step === 'freeze');
  await page.keyboard.press('Space');
  await page.waitForFunction(() => Deadline.inspect().world.phase === 'stopped');
  const before = (await state(page)).world;
  await move(page, before.player); await page.mouse.down();
  for (const target of before.enemies) await move(page, target, 8);
  const endpoint = { x: 805, y: 400 }; await move(page, endpoint, 4); await page.mouse.up();
  const plan = (await state(page)).world;
  assert.equal(plan.route.locks.length, 2); assert.equal(plan.route.danger.length, 0);
  assert.deepEqual(plan.player, before.player); assert.deepEqual(plan.enemies, before.enemies); assert.deepEqual(plan.bullets, before.bullets);
  if (index === 1) await page.screenshot({ path: path.join(artifacts, 'plan-1920.png') });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => Deadline.inspect().practice.step === 'complete');
  const done = await state(page);
  assert.equal(done.world.totalKills, 2); assert.equal(done.world.score, 750);
  assert.ok(Math.hypot(done.world.player.x - endpoint.x, done.world.player.y - endpoint.y) < 1);
  if (index === 1) await page.screenshot({ path: path.join(artifacts, 'reward-1920.png') });
  await page.waitForTimeout(780);
  const rested = await state(page); assert.equal(rested.artFx.echo, null); assert.equal(rested.artFx.scores.length, 0);
  await page.waitForFunction(() => !Deadline.inspect().practice.active);
  await page.waitForFunction(() => Deadline.inspect().world.waveGraceRemaining <= 0);
  await move(page, (await state(page)).world.enemies[0]);
  await page.waitForFunction(() => Deadline.inspect().world.failed);
  if (index === 1) {
    await page.locator('#result').evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
    await page.screenshot({ path: path.join(artifacts, 'game-over-1920.png') });
  }
  await page.keyboard.press('Space');
  assert.equal((await state(page)).world.failed, false); assert.equal((await state(page)).world.wave, 1);
  await page.waitForFunction(() => Deadline.inspect().world.waveGraceRemaining <= 0);
  await move(page, (await state(page)).world.enemies[0]); await page.waitForFunction(() => Deadline.inspect().world.failed);
  await page.locator('#game-over-title').click(); assert.equal((await state(page)).titleActive, true);
  report.liveRuns.push({ run: index, training: 'two locks, 750 score, exact endpoint', retry: 'same Wave', returnToTitle: true, staleEffects: false });
}
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true }); report.browser = browser.version();
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } }); hook(page);
    await page.goto(base + '?debug'); await page.waitForLoadState('networkidle'); await recordFrames(page);
    await page.waitForTimeout(4300); await page.screenshot({ path: path.join(artifacts, 'title-1920.png') });
    assert.equal((await state(page)).world.time, 0);
    await trainingRun(page, 1); await trainingRun(page, 2);
    report.renderChecks = await page.evaluate(() => window.__artAudit);
    assert.equal(report.renderChecks.worldMutations, 0); assert.equal(report.renderChecks.checkedFrames, 40); assert.ok(report.renderChecks.maxScores > 0);
    const frames = await page.evaluate(() => window.__artFrames);
    for (const name of ['ignition', 'afterglow']) {
      assert.ok(frames[name], `${name} must render in a real run`);
      fs.writeFileSync(path.join(artifacts, `${name}-canvas.png`), Buffer.from(frames[name].split(',')[1], 'base64'));
    }
    // Resize the same active application, then reload with its settings intact.
    await page.locator('[data-title-info="settings"]').click(); await page.locator('#master-volume').fill('42');
    await page.locator('[data-title-info="settings"]').click(); await page.locator('#title-start').click();
    await page.waitForFunction(() => Deadline.inspect().briefingActive); await page.locator('#briefing-skip').click();
    for (const viewport of [{ width:1920,height:1080 }, { width:1600,height:900 }, { width:1366,height:768 }, { width:1280,height:720 }, { width:960,height:720 }]) {
      await page.setViewportSize(viewport); await page.locator('#restart').click(); await page.waitForTimeout(90);
      const layout = await page.evaluate(() => ({ overflowX: document.documentElement.scrollWidth > innerWidth,
        footerBottom: document.querySelector('footer').getBoundingClientRect().bottom, controlBottom: document.querySelector('.controls').getBoundingClientRect().bottom,
        arenaWidth: document.getElementById('arena').width, arenaHeight: document.getElementById('arena').height }));
      assert.equal(layout.overflowX, false); assert.ok(layout.footerBottom <= viewport.height); assert.ok(layout.controlBottom <= viewport.height);
      await move(page, { x: 60, y: 550 });
      assert.ok(Math.hypot((await state(page)).world.player.x - 60, (await state(page)).world.player.y - 550) < 1);
      report.layouts.push({ ...viewport, ...layout });
      if (viewport.width === 1920 || viewport.width === 1280) await page.screenshot({ path: path.join(artifacts, `game-${viewport.width}.png`) });
    }
    await page.reload(); await page.waitForLoadState('networkidle'); assert.equal((await state(page)).titleActive, true);
    assert.equal(await page.locator('#master-volume').inputValue(), '42');
    await page.setViewportSize({ width:1280,height:720 }); await page.waitForTimeout(4300);
    await page.screenshot({ path: path.join(artifacts, 'title-1280.png') });
    // Isolated rendering: dense bullets and a danger span must remain visually distinguishable.
    report.renderChecks.fixture = await page.evaluate(() => {
      const { Renderer, sim: S, config: C } = Deadline;
      const canvas = document.createElement('canvas'); canvas.style.cssText = 'width:960px;height:600px;position:fixed;left:0;top:0'; document.body.append(canvas);
      const renderer = new Renderer(canvas), world = S.createWorld(); world.gauge = 100;
      world.bullets = [{ x: 280, y: 430, vx: 0, vy: 0, pattern: 'aim' }]; S.stopTime(world); S.addRoutePoint(world, { x: 370, y: 430 });
      const app = { world, particles: [], hits: [], shake: 0, timeFx: { blend:1 }, reducedMotion:true };
      const before = JSON.stringify(world); renderer.draw(app);
      const pixel = (x, y) => Array.from(renderer.ctx.getImageData(Math.round((renderer.offsetX + x * renderer.scale) * renderer.ratio), Math.round((renderer.offsetY + y * renderer.scale) * renderer.ratio), 1, 1).data).slice(0,3);
      const safe = pixel(210,430), danger = pixel(270,430), bullet = pixel(280,430);
      const result = { safe, danger, bullet, worldUnchanged:before === JSON.stringify(world), dangerSpans:world.route.danger.length };
      // Detach the test-created DOM node; no filesystem or production asset is removed.
      canvas.remove(); return result;
    });
    const fixture = report.renderChecks.fixture;
    assert.equal(fixture.worldUnchanged, true); assert.ok(fixture.dangerSpans > 0);
    // TASK B: Pico's safe route is warm ivory/gold; red danger remains a separate signal.
    assert.ok(fixture.safe[0] > fixture.safe[1] && fixture.safe[1] > fixture.safe[2] + 20);
    assert.ok(fixture.danger[0] > fixture.danger[1] + 35);
    assert.ok(fixture.bullet.reduce((a,b) => a+b,0) > 350);
    const reduced = await browser.newPage({ viewport:{width:1280,height:720}, reducedMotion:'reduce' }); hook(reduced);
    await reduced.goto(base + '?debug'); await reduced.waitForLoadState('networkidle');
    const a = await reduced.locator('#title-art').screenshot(); await reduced.waitForTimeout(250);
    assert.deepEqual(await reduced.locator('#title-art').screenshot(), a); await reduced.close();
    assert.deepEqual(report.errors, []); assert.deepEqual(report.externalRequests, []);
    console.log('PASS 2 real training/retry/title runs, 5 desktop resizes, reload, render isolation, danger pixels, transient cleanup and reduced motion');
  } finally { fs.writeFileSync(path.join(artifacts, 'acceptance.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
