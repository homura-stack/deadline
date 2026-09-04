// Development-only tests for time-stop, route traversal and current bullet collision.
'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const C = require('../config.js'), S = require('../simulation.js');
const p = (x, y) => ({ x, y });
const enemy = (id, x, y) => ({ id, x, y, vx: 0, vy: 0, alive: true, pattern: 'aim', burstRemaining: 0, burstTimer: 0, shotRemaining: 10 });
const bullet = (id, x, y, vx = 135, vy = 0) => ({ id, enemyId: 1, x, y, vx, vy, life: C.shooting.lifetime });
function world(enemies = []) { const w = S.createWorld(); w.enemies = enemies; w.player = p(100, 100); w.waveGraceRemaining = 0; return w; }
function readyStop(w) { w.gauge = C.gauge.max; S.stopTime(w); } // Isolated funded-route fixtures.
function plan(w, points) { readyStop(w); points.forEach(point => S.addRoutePoint(w, point)); return w; }
function finish(w, inspect = () => {}) { S.executeRoute(w); for (let i = 0; i < 240 && w.phase === 'executing'; i++) { S.step(w); inspect(w); } assert.notEqual(w.phase, 'executing'); return w; }
function physical(w) { return { time: w.time, bullets: structuredClone(w.bullets), enemies: w.enemies.map(({ alive, hp, ...rest }) => rest) }; }
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test('normal mode immediately moves enemies and fires at the actual current player', () => {
 const w = world([enemy(1, 600, 300)]); w.enemies[0].vx = 24; w.enemies[0].shotRemaining = C.world.fixedStep;
 S.movePlayer(w, p(100, 200)); S.step(w); assert.equal(w.phase, 'normal'); assert.ok(w.enemies[0].x > 600); assert.equal(w.bullets.length, 1);
 const e = w.enemies[0], b = w.bullets[0], d = S.distance(w.player, e);
 close(b.vx, (w.player.x - e.x) / d * C.shooting.patterns.aim.speed); close(b.vy, (w.player.y - e.y) / d * C.shooting.patterns.aim.speed);
 const velocity = p(b.vx, b.vy); S.movePlayer(w, p(100, 50)); S.step(w); assert.deepEqual(p(b.vx, b.vy), velocity);
});
test('normal shots repeat at configured intervals and visible bullets are bounded', () => {
 const w = world([enemy(1, 600, 300)]); w.enemies[0].shotRemaining = 0; S.step(w); const first = w.nextBulletId;
 for (let i = 0; i < 198; i++) { w.player.y = i % 2 ? 50 : 550; S.step(w); }
 assert.equal(w.failed, false); assert.equal(w.nextBulletId, first + 3);
 w.bullets = Array.from({ length: C.shooting.maxBullets }, (_, i) => bullet(i, 800, 50, 0, 0)); w.enemies[0].shotRemaining = 0; S.step(w); assert.equal(w.bullets.length, C.shooting.maxBullets);
});
test('STOP freezes world positions, bullets, timers and self while the planning clock decreases', () => {
 const w = S.createWorld(); w.bullets.push(bullet(1, 850, 90)); const snapshot = physical(w), start = structuredClone(w.player);
 plan(w, [p(280, 400)]); S.movePlayer(w, p(80, 80)); for (let i = 0; i < 120; i++) S.step(w);
 assert.deepEqual(physical(w), snapshot); assert.deepEqual(w.player, start); close(w.stopRemaining, 4); assert.equal(w.phase, 'stopped');
});
test('drawing is accepted only while stopped; clear keeps the elapsed planning budget', () => {
 const w = world(); S.addRoutePoint(w, p(400, 100)); assert.equal(w.route, null);
 plan(w, [p(400, 100)]); S.step(w, 1); S.clearRoute(w); assert.equal(w.route.points.length, 1); assert.equal(w.route.locks.length, 0); assert.equal(w.stopRemaining, 4);
 S.addRoutePoint(w, p(400, 100)); S.executeRoute(w); const before = structuredClone(w.route); S.addRoutePoint(w, p(900, 500)); S.movePlayer(w, p(900, 500)); readyStop(w);
 assert.deepEqual(w.route, before); assert.deepEqual(w.player, p(100, 100)); assert.equal(w.phase, 'executing');
});
test('locks use radius entry order, include near misses of the center and never duplicate', () => {
 const w = plan(world([enemy(9, 360, 135), enemy(2, 220, 100), enemy(3, 550, 160)]), [p(600, 100), p(100, 100), p(600, 100)]);
 assert.deepEqual(w.route.locks.map(l => l.enemyId), [2, 9]); assert.deepEqual(w.route.locks.map(l => l.order), [1, 2]); close(w.route.locks[0].along, 72);
});
test('backtracking beyond an earlier point retains the actual drawn turn', () => {
 const w = plan(world(), [p(200, 100), p(50, 100)]); assert.deepEqual(w.route.points, [p(100, 100), p(200, 100), p(50, 100)]); close(w.route.length, 250);
});
test('closed and self-crossing paths cause no enclosure or area damage', () => {
 const w = plan(world([enemy(1, 300, 300)]), [p(600, 100), p(600, 550), p(100, 550), p(100, 100)]);
 assert.equal(w.route.locks.length, 0); finish(w); assert.equal(w.enemies[0].alive, true); assert.equal(w.lastKills, 0); assert.equal(w.score, 0); assert.equal(S.pointInPolygon, undefined);
});
test('expiry runs the drawn route automatically and an empty timeout simply resumes', () => {
 const w = plan(world(), [p(300, 100)]); S.step(w, C.timeStop.seconds); assert.equal(w.phase, 'executing');
 for (let i = 0; i < 80 && w.phase === 'executing'; i++) S.step(w); assert.equal(w.phase, 'normal'); assert.deepEqual(w.player, p(300, 100));
 const empty = plan(world(), []); S.step(empty, C.timeStop.seconds); assert.equal(empty.phase, 'normal'); assert.equal(empty.failed, false); assert.equal(empty.lastKills, 0);
});
test('each lock is killed at arrival in path order, with a distinct hit and a stronger final pause', () => {
 const w = plan(world([enemy(5, 450, 100), enemy(2, 220, 100), enemy(3, 340, 100)]), [p(550, 100)]); const order = [];
 finish(w, current => { for (const ev of current.events.filter(e => e.type === 'hit')) { order.push(ev.enemyId); close(S.distance(ev.from, ev), C.timeStop.lockRadius); if (ev.last) close(current.execution.pause, C.feedback.finalHitStop); } current.events.length = 0; });
 assert.deepEqual(order, [2, 3, 5]); assert.equal(w.lastKills, 3); assert.equal(w.failed, false); assert.deepEqual(w.player, p(550, 100)); assert.ok(w.execution.elapsed >= .2 && w.execution.elapsed < 1);
});
test('all enemy coordinates/timers and existing bullet identities stay frozen throughout execution', () => {
 const w = world([enemy(1, 300, 100), enemy(2, 500, 500)]); w.bullets.push(bullet(1, 800, 500)); w.enemies[0].vx = 24;
 plan(w, [p(450, 100)]); const snapshot = physical(w); finish(w, current => assert.deepEqual(physical(current), snapshot));
 assert.equal(w.enemies[0].alive, false); S.step(w); assert.ok(w.time > snapshot.time); assert.ok(w.bullets[0].x > snapshot.bullets[0].x); assert.ok(w.enemies[1].shotRemaining < snapshot.enemies[1].shotRemaining);
 readyStop(w); assert.equal(w.phase, 'stopped'); close(w.stopRemaining, C.timeStop.seconds);
});
test('fast traversal checks each saved leg and does not cut across corners', () => {
 const w = world(); w.bullets.push(bullet(1, 150, 150)); plan(w, [p(200, 100), p(200, 200)]);
 assert.equal(w.route.danger.length, 0); S.executeRoute(w); S.step(w, 1); assert.equal(w.failed, false); assert.deepEqual(w.player, p(200, 200));
});
test('static red intervals and actual swept impact agree even at very high run speed', () => {
 const w = world(); w.bullets.push(bullet(1, 300, 100)); plan(w, [p(800, 100)]);
 assert.equal(w.route.danger.length, 1); close(w.route.danger[0].start, 186); close(w.route.danger[0].end, 214); S.executeRoute(w); S.step(w, 1);
 assert.equal(w.phase, 'failed'); close(w.player.x, 286); assert.equal(w.life, 0); assert.equal(w.bullets[0].x, 300);
});
test('bullet risk depends only on current position, including tangency and safe clearance', () => {
 const w = world(); w.bullets.push(bullet(1, 300, 114)); plan(w, [p(800, 100)]); assert.equal(w.route.danger.length, 1);
 w.bullets[0].vx = -9000; w.bullets[0].vy = 9000; assert.deepEqual(S.compileRoute(w.route.points, w).danger, w.route.danger);
 w.bullets[0].y = 114.1; assert.equal(S.compileRoute(w.route.points, w).danger.length, 0);
});
test('a stopped bullet beyond a lock kills the player after that one hit, not all remaining enemies', () => {
 const w = world([enemy(1, 220, 100), enemy(2, 500, 100)]); w.bullets.push(bullet(1, 350, 100)); plan(w, [p(700, 100)]); finish(w);
 assert.equal(w.failed, true); assert.equal(w.lastKills, 1); assert.equal(w.enemies[1].alive, true); close(w.player.x, 336);
});
test('six kills over a long route complete within one second including all hit pauses', () => {
 const w = S.createWorld(); w.enemies = Array.from({length:6},(_,i)=>enemy(i+1,260+i*105,120+(i%2)*280)); readyStop(w); for (const e of w.enemies) S.addRoutePoint(w, e);
 for (const point of [p(900, 550), p(50, 550), p(50, 50), p(900, 50)]) S.addRoutePoint(w, point);
 assert.equal(w.route.locks.length, 6); finish(w); assert.equal(w.lastKills, 6); assert.equal(w.failed, false); assert.ok(w.execution.elapsed <= 1, w.execution.elapsed); close(w.execution.duration, .72);
});
test('short routes respect minimum run duration in funded route fixtures', () => {
 const w = plan(world(), [p(104, 100)]); finish(w); assert.ok(w.execution.elapsed >= .2 - 1e-8); assert.ok(w.execution.elapsed < .22);
 for (let i = 0; i < 5; i++) { readyStop(w); assert.equal(w.phase, 'stopped'); S.executeRoute(w); assert.equal(w.phase, 'normal'); }
});
test('normal bullet contact and player sweep cause damage; retry restores the same Wave', () => {
 const w = world(); w.bullets.push(bullet(1, 150, 100, -1000)); S.step(w, .1); assert.equal(w.failed, true); close(w.bullets[0].x, 114);
 const swept = world(); swept.bullets.push(bullet(1, 250, 100)); S.movePlayer(swept, p(800, 100)); assert.equal(swept.failed, true); close(swept.player.x, 236);
 S.retryWave(w);assert.equal(w.failed,false);assert.equal(w.life,1);assert.equal(w.bullets.length,0);assert.equal(w.phase,'normal');assert.equal(w.wave,1);assert.equal(w.gauge,C.waves.retryGaugeInitial);
});
test('the last kill enters a short Wave clear rest, removes bullets, then spawns the next definition', () => {
 const w = world([enemy(1, 300, 100)]); w.enemies[0].shotRemaining = .001; w.bullets.push(bullet(1, 800, 500, 0)); plan(w, [p(400, 100)]); finish(w);
 const next = w.nextBulletId; assert.equal(w.phase,'wave-clear');assert.equal(w.bullets.length,0);S.step(w,1);assert.equal(w.phase,'wave-clear');assert.equal(w.nextBulletId,next);
 S.step(w,C.waves.intermissionSeconds);assert.equal(w.phase,'normal');assert.equal(w.wave,2);assert.deepEqual(w.enemies.map(e=>e.pattern),['aim','aim','aim','aim']);
});
