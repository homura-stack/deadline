'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const C = require('../config.js'), S = require('../simulation.js'), T = require('../tutorial.js');
function stop(w, p) { w.gauge = 100; S.stopTime(w); T.setStep(p, p.evaded ? 'route' : 'draw'); }
function route(w, points) { for (const point of points) S.addRoutePoint(w, point); }
const safe = [{x:310,y:430},{x:450,y:235},{x:600,y:235},{x:700,y:270},{x:760,y:470}];
test('rehearsal creates all three current enemy patterns without changing the production world or config', () => {
  const config = JSON.stringify(C), normal = S.createWorld();
  const w = T.world(); assert.deepEqual(w.enemies.map(e=>e.pattern), ['burst','aim','rotate']);
  w.enemies[0].hp = 200; w.player.x = 700;
  assert.deepEqual(S.createWorld(), normal); assert.equal(JSON.stringify(C), config);
});
test('movement and freeze are action gated; reading or drawing alone cannot execute', () => {
  const w = T.world(), p = T.create(); assert.equal(S.canStop(w),false); assert.equal(T.movement(w,p),false);
  S.movePlayer(w,{x:220,y:350}); assert.equal(T.movement(w,p),true); assert.equal(p.step,'freeze');
  stop(w,p); route(w,safe); T.routeStep(w,p); assert.equal(T.canExecute(w,p),false); assert.equal(p.step,'dangerIntro');
});
test('LINE, TARGET and DANGER are learned in order from real route geometry', () => {
  const w = T.world(), p = T.create(); stop(w,p);
  route(w,[{x:180,y:420}]); T.routeStep(w,p); assert.equal(p.step,'draw');
  route(w,[{x:210,y:390}]); T.routeStep(w,p); assert.equal(p.step,'target');
  route(w,[w.enemies[0]]); T.routeStep(w,p); assert.equal(p.step,'dangerIntro');
});
test('evade challenge uses real collision: a direct move through the enemy cannot meet the goal', () => {
  const w = T.world(), p = T.create(); T.beginEvade(w,p);
  S.movePlayer(w,T.beacon); assert.equal(w.failed,true); assert.equal(T.movement(w,p),false); assert.equal(p.evaded,false);
});
test('moving around the enemy reaches the beacon and unlocks route planning', () => {
  const w = T.world(), p = T.create(); T.beginEvade(w,p);
  for (const point of [{x:210,y:350},{x:440,y:350},T.beacon]) S.movePlayer(w,point);
  assert.equal(w.failed,false); assert.equal(T.movement(w,p),true); assert.equal(p.evaded,true); assert.equal(p.step,'route');
});
test('all TARGETs on an unsafe LINE cannot execute; CLEAR and a detour can', () => {
  const w = T.world(), p = T.create(); T.beginEvade(w,p); p.evaded=true; w.player={...T.beacon}; stop(w,p);
  route(w,[...w.enemies]); T.routeStep(w,p);
  assert.equal(w.route.locks.length,3); assert.ok(w.route.danger.length); assert.equal(T.canExecute(w,p),false);
  S.clearRoute(w); route(w,safe); T.routeStep(w,p); assert.equal(T.canExecute(w,p),true);
  const bullets=w.bullets.length; S.executeRoute(w); assert.equal(w.bullets.length,bullets,'no removal of live hazards before execution');
  for(let i=0;i<200 && w.phase==='executing';i++) S.step(w);
  assert.equal(w.phase,'wave-clear'); assert.equal(w.totalKills,3); assert.equal(w.failed,false);
});
test('undo or clear revokes execution readiness; cancelling never completes practice', () => {
  const w=T.world(),p=T.create();T.beginEvade(w,p);p.evaded=true;w.player={...T.beacon};stop(w,p);route(w,safe);T.routeStep(w,p);
  assert.equal(T.canExecute(w,p),true);S.undoRoute(w);T.routeStep(w,p);assert.equal(T.canExecute(w,p),false);
  route(w,[safe.at(-1)]);T.routeStep(w,p);assert.equal(T.canExecute(w,p),true);
  S.clearRoute(w);T.routeStep(w,p);assert.equal(T.canExecute(w,p),false);S.cancelStop(w);assert.equal(T.canExecute(w,p),false);
});
test('fresh normal play after training retains the exact Wave 1 state', () => {
  const before=S.createWorld(),w=T.world(),p=T.create();T.beginEvade(w,p);w.score=9999;w.hitsTaken=5;
  assert.deepEqual(S.createWorld(),before);
});
