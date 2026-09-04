/* Development-only Chrome verification for EXECUTE visuals and synthesized audio. */
'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs');
const C = require('../config.js'), S = require('../simulation.js');
const base = process.env.DEADLINE_TEST_URL || 'http://127.0.0.1:4186/';
const artifacts = path.join(__dirname, 'artifacts'); fs.mkdirSync(artifacts, { recursive: true });
const report = { browser: '', cases: {}, errors: [] };
function hook(page) { page.on('pageerror', error => report.errors.push(String(error))); page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); }); }
async function state(page) { return page.evaluate(() => Deadline.inspect()); }
async function open(page, options = {}) {
  await page.goto(base + '?debug'); await page.waitForLoadState('networkidle');
  await page.evaluate(settings => {
    if (settings.initialGauge != null) Deadline.config.gauge.initial = settings.initialGauge;
    if (settings.stopSeconds != null) Deadline.config.waves.definitions[0].timeStopSeconds = settings.stopSeconds;
  }, options);
  await page.keyboard.press('Space'); await page.waitForFunction(() => document.getElementById('title-screen').hidden);
  await page.locator('#briefing-skip').click(); await page.waitForFunction(() => document.getElementById('briefing-screen').hidden);
}
async function coords(page, point) {
  const box = await page.locator('#arena').boundingBox(), scale = Math.min(box.width / 960, box.height / 600);
  return { x: box.x + (box.width - 960 * scale) / 2 + point.x * scale, y: box.y + (box.height - 600 * scale) / 2 + point.y * scale };
}
async function move(page, point, steps = 1) { const at = await coords(page, point); await page.mouse.move(at.x, at.y, { steps }); }
async function stroke(page, points, steps = 5) { await move(page, points[0]); await page.mouse.down(); for (const point of points.slice(1)) await move(page, point, steps); await page.mouse.up(); }
function audioEvents(snapshot, name) { return snapshot.audio.events.filter(event => event.name === name); }
function percentile(values, ratio) { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))] || 0; }
function detour(world, from, goal) {
  const margin = 24, grid = 16, cols = 58, rows = 35, radius = C.player.radius + C.shooting.bulletRadius + 3;
  const clear = (a, b) => world.bullets.every(bullet => S.segmentCircleTime(a, b, bullet, radius) === null);
  const position = id => ({ x: margin + (id % cols) * grid, y: margin + Math.floor(id / cols) * grid });
  const openSet = new Set(), cost = new Map(), parent = new Map();
  for (let id = 0; id < cols * rows; id++) { const p = position(id); if (S.distance(from, p) < 32 && clear(from, p)) { openSet.add(id); cost.set(id, S.distance(from, p)); parent.set(id, null); } }
  let end = null;
  while (openSet.size) {
    let current = null, best = Infinity;
    for (const id of openSet) { const score = cost.get(id) + S.distance(position(id), goal); if (score < best) { best = score; current = id; } }
    openSet.delete(current); const a = position(current);
    if (S.distance(a, goal) < 32 && clear(a, goal)) { end = current; break; }
    for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) {
      if (!dx && !dy) continue; const x = current % cols + dx, y = Math.floor(current / cols) + dy;
      if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
      const id = y * cols + x, b = position(id), next = cost.get(current) + S.distance(a, b);
      if (next >= (cost.get(id) ?? Infinity) || !clear(a, b)) continue; cost.set(id, next); parent.set(id, current); openSet.add(id);
    }
  }
  if (end === null) return null; const raw = [goal]; for (let id = end; id !== null; id = parent.get(id)) raw.push(position(id)); raw.push(from); raw.reverse();
  const simple = [from]; let i = 0; while (i < raw.length - 1) { let j = raw.length - 1; while (j > i + 1 && !clear(raw[i], raw[j])) j--; simple.push(raw[j]); i = j; } return simple;
}
function routeAll(world) {
  const points = [{ ...world.player }]; let from = world.player;
  for (const enemy of world.enemies.filter(item => item.alive)) { const part = detour(world, from, enemy); assert.ok(part); points.push(...part.slice(1)); from = part.at(-1); }
  for (const end of [{ x: 60, y: 550 }, { x: 60, y: 60 }, { x: 900, y: 550 }]) { const tail = detour(world, from, end); if (tail) { points.push(...tail.slice(1)); break; } }
  return points;
}
async function caseA(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); hook(page); await open(page, { initialGauge: 100, stopSeconds: 3.2 });
  await page.keyboard.press('Space'); await page.waitForFunction(() => Deadline.inspect().world.phase === 'normal', {}, { timeout: 4500 }); await page.waitForTimeout(180);
  const current = await state(page), clock = current.audio.events.filter(event => ['tick', 'tock'].includes(event.name));
  assert.ok(clock.length >= 3); assert.ok(clock.some(event => event.interval === C.feedback.combatAudio.warningTickInterval)); assert.ok(clock.some(event => event.interval <= C.feedback.combatAudio.criticalTickInterval));
  assert.ok(clock.every((event, index) => event.name === (index % 2 ? 'tock' : 'tick'))); assert.ok(clock.every(event => event.interval >= 0.5 && event.duration >= 0.018 && event.duration <= 0.03));
  assert.ok(C.feedback.combatAudio.tickVolume / C.feedback.combatAudio.slashVolume >= 0.3 && C.feedback.combatAudio.tickVolume / C.feedback.combatAudio.slashVolume <= 0.4);
  assert.ok(C.feedback.combatAudio.tickVolume < C.feedback.combatAudio.targetVolume && C.feedback.combatAudio.targetVolume < C.feedback.combatAudio.slashVolume);
  assert.equal(current.audio.clockActive, false); assert.equal(current.audio.activeClockVoices, 0);
  report.cases.A = { ticks: clock.length, sequence: clock.map(event => event.name), gapsMs: clock.slice(1).map((event, index) => Math.round((event.at - clock[index].at) * 1000)),
    intervals: [...new Set(clock.map(event => event.interval))], profiles: clock.map(({ name, duration, filterStart, filterEnd, q, gain, attack, release }) => ({ name, duration, filterStart, filterEnd, q, gain, attack, release })),
    mix: { tickToSlash: C.feedback.combatAudio.tickVolume / C.feedback.combatAudio.slashVolume, tickToTarget: C.feedback.combatAudio.tickVolume / C.feedback.combatAudio.targetVolume }, stopped: !current.audio.clockActive }; await page.close();
}
async function caseD(browser) {
  const page = await browser.newPage(); hook(page); await open(page, { initialGauge: 100 }); await page.keyboard.press('Space');
  await page.waitForFunction(() => (Deadline.inspect().audio.plays.tick || 0) + (Deadline.inspect().audio.plays.tock || 0) > 0); await page.keyboard.press('KeyC'); await page.waitForTimeout(120);
  const current = await state(page); assert.equal(current.world.phase, 'normal'); assert.equal(current.audio.clockActive, false); assert.equal(current.audio.activeClockVoices, 0);
  report.cases.D = { clockActive: current.audio.clockActive, activeClockVoices: current.audio.activeClockVoices }; await page.close();
}
async function clockTargetMix(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); hook(page); await open(page, { initialGauge: 100, stopSeconds: 7 }); await page.keyboard.press('Space');
  await page.waitForFunction(() => (Deadline.inspect().audio.plays.tick || 0) > 0); const opening = (await state(page)).world, enemy = opening.enemies.find(item => item.alive);
  await stroke(page, [opening.player, enemy]); await page.waitForFunction(() => (Deadline.inspect().audio.plays.target || 0) === 1);
  await page.waitForFunction(() => (Deadline.inspect().audio.plays.tick || 0) + (Deadline.inspect().audio.plays.tock || 0) >= 2);
  let current = await state(page); assert.equal(current.world.phase, 'stopped'); assert.equal(current.audio.plays.target, 1);
  assert.ok(C.feedback.combatAudio.tickVolume < C.feedback.combatAudio.targetVolume && C.feedback.combatAudio.targetVolume < C.feedback.combatAudio.slashVolume);
  await page.keyboard.press('KeyC'); await page.waitForTimeout(120); current = await state(page); assert.equal(current.audio.activeClockVoices, 0);
  report.cases.clockTargetMix = { clockEvents: (current.audio.plays.tick || 0) + (current.audio.plays.tock || 0), targetEvents: current.audio.plays.target,
    tickGain: C.feedback.combatAudio.tickVolume, targetGain: C.feedback.combatAudio.targetVolume, slashGain: C.feedback.combatAudio.slashVolume }; await page.close();
}
async function caseE(browser) {
  const page = await browser.newPage(); hook(page); await open(page, { initialGauge: 100, stopSeconds: 0.75 }); await page.keyboard.press('Space');
  await page.waitForFunction(() => Deadline.inspect().world.phase === 'normal', {}, { timeout: 1800 }); await page.waitForTimeout(220);
  const current = await state(page); assert.equal(current.audio.clockActive, false); assert.equal(current.audio.activeClockVoices, 0);
  report.cases.E = { clockActive: current.audio.clockActive, activeClockVoices: current.audio.activeClockVoices, resume: current.audio.plays.resume || 0 }; await page.close();
}
async function executeRouteCase(browser, allTargets) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }); hook(page); await open(page, { initialGauge: 100, stopSeconds: 7 }); await page.keyboard.press('Space');
  const opening = (await state(page)).world, targets = allTargets ? opening.enemies.filter(enemy => enemy.alive) : [opening.enemies.find(enemy => enemy.alive)];
  const points = [{ ...opening.player }]; for (const enemy of targets) points.push({ x: enemy.x, y: enemy.y }); const last = targets.at(-1); points.push({ x: Math.min(920, last.x + 76), y: Math.min(560, last.y + 64) });
  await stroke(page, points); assert.equal((await state(page)).world.route.locks.length, targets.length);
  await page.evaluate(() => { window.__feedbackFrames = []; let previous = null, end = performance.now() + 1300; function sample(now) { if (previous != null) window.__feedbackFrames.push(now - previous); previous = now; const state = Deadline.inspect(); window.__maxTrail = Math.max(window.__maxTrail || 0, state.combatFx.trail.length); window.__maxHits = Math.max(window.__maxHits || 0, state.hits.length); if (now < end) requestAnimationFrame(sample); } requestAnimationFrame(sample); });
  await page.keyboard.press('Space'); await page.waitForFunction(() => Deadline.inspect().combatFx.releaseRemaining > 0); await page.screenshot({ path: path.join(artifacts, allTargets ? 'execute-multi-windup.png' : 'execute-single-windup.png'), fullPage: true });
  await page.waitForFunction(() => Deadline.inspect().hits.length > 0); await page.locator('#arena').screenshot({ path: path.join(artifacts, allTargets ? 'execute-multi-hit.png' : 'execute-single-hit.png') });
  await page.waitForFunction(() => !['executing'].includes(Deadline.inspect().world.phase)); await page.waitForTimeout(520);
  const current = await state(page), commands = audioEvents(current, 'executeCommand'), releases = audioEvents(current, 'execute'), slashes = audioEvents(current, 'slash'), kills = audioEvents(current, 'kill'), resumes = audioEvents(current, 'resume');
  assert.equal(commands.length, 1); assert.equal(releases.length, 1); assert.ok(releases[0].at - commands[0].at >= 0.045); assert.equal(slashes.length, targets.length); assert.equal(kills.length, targets.length); assert.ok(resumes.at(-1).at > kills.at(-1).at);
  assert.equal(current.audio.clockActive, false); assert.equal(current.audio.activeVoices, 0); assert.ok(current.combatFx.trail.length <= C.feedback.executeVisual.maxAfterimages);
  if (allTargets) for (let i = 1; i < slashes.length; i++) { assert.ok(slashes[i].at > slashes[i - 1].at); assert.ok(slashes[i].variation > slashes[i - 1].variation); }
  const frames = await page.evaluate(() => window.__feedbackFrames || []), perf = { p95FrameMs: percentile(frames, 0.95), maxTrail: await page.evaluate(() => window.__maxTrail || 0), maxHits: await page.evaluate(() => window.__maxHits || 0), maxVoices: current.audio.maxVoices };
  await page.close(); return { targets: targets.length, silentGapMs: Math.round((releases[0].at - commands[0].at) * 1000), slashTimes: slashes.map(event => event.at), pitchVariation: slashes.map(event => event.variation), perf };
}
async function caseF(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }); hook(page); await open(page); await move(page, { x: 60, y: 550 });
  await page.waitForFunction(() => Deadline.sim.canStop(Deadline.inspect().world) || Deadline.inspect().world.failed, {}, { timeout: 6500 });
  let current = await state(page); assert.equal(current.world.failed, false); assert.ok(current.world.bullets.length >= 15); const bullets = current.world.bullets.length;
  await page.keyboard.press('Space'); current = await state(page); const points = routeAll(current.world); await stroke(page, points, 1); assert.equal((await state(page)).world.route.locks.length, 3);
  await page.evaluate(() => { window.__perf = []; let previous = null, end = performance.now() + 1400; function sample(now) { if (previous != null) window.__perf.push(now - previous); previous = now; if (now < end) requestAnimationFrame(sample); } requestAnimationFrame(sample); });
  await page.keyboard.press('Space'); await page.waitForFunction(() => !['executing'].includes(Deadline.inspect().world.phase), {}, { timeout: 2200 }); await page.waitForTimeout(1450);
  current = await state(page); const frames = await page.evaluate(() => window.__perf); assert.equal(current.world.failed, false); assert.ok(percentile(frames, 0.95) < 25); assert.equal(current.audio.activeVoices, 0);
  await page.screenshot({ path: path.join(artifacts, 'execute-high-density-result.png'), fullPage: true }); report.cases.F = { bullets, targets: 3, p95FrameMs: percentile(frames, 0.95), maxVoices: current.audio.maxVoices, activeVoicesAfter: current.audio.activeVoices }; await page.close();
}
async function reducedMotion(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }); hook(page); await open(page, { initialGauge: 100, stopSeconds: 7 }); await page.keyboard.press('Space');
  const opening = (await state(page)).world, enemy = opening.enemies[0]; await stroke(page, [opening.player, enemy, { x: enemy.x + 72, y: enemy.y + 55 }]); await page.keyboard.press('Space');
  await page.waitForFunction(() => Deadline.inspect().hits.length > 0); const during = await state(page); assert.equal(during.reducedMotion, true); assert.equal(during.combatFx.trail.length, 0);
  await page.waitForFunction(() => Deadline.inspect().world.phase !== 'executing'); await page.waitForTimeout(420); const after = await state(page); assert.equal(after.audio.activeVoices, 0);
  report.cases.reducedMotion = { trail: during.combatFx.trail.length, activeVoicesAfter: after.audio.activeVoices }; await page.close();
}
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true }); report.browser = browser.version();
  try {
    await caseA(browser); console.log('PASS CASE A clock cadence follows 2 / 1 / 0.5 second thresholds');
    await clockTargetMix(browser); console.log('PASS clock remains perceptible beside one stronger TARGET cue and stops on CANCEL');
    report.cases.B = await executeRouteCase(browser, false); console.log('PASS CASE B single TARGET -> release -> slash -> kill -> resume');
    report.cases.C = await executeRouteCase(browser, true); console.log('PASS CASE C three ordered TARGET slashes retain timing and pitch separation');
    await caseD(browser); console.log('PASS CASE D CANCEL stops clock voices');
    await caseE(browser); console.log('PASS CASE E timeout stops clock voices');
    await caseF(browser); console.log('PASS CASE F live barrage multi-target EXECUTE stays within frame and resource bounds');
    await reducedMotion(browser); console.log('PASS reduced motion keeps hit feedback while suppressing execution afterimages');
    assert.deepEqual(report.errors, []); console.log('PASS no console errors or uncaught exceptions');
  } finally {
    fs.writeFileSync(path.join(artifacts, 'execute-feedback-results.json'), JSON.stringify(report, null, 2)); await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
