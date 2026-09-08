'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../config.js'),S=require('../simulation.js'),{detour,planWavePoints}=require('./route-planner.cjs');
const captured=require('./fixtures/wave7-grid-trap.json');
test('captured Wave 7 can leave the lower-edge pocket without relaxing the 3px safety padding',()=>{
 const goal={x:88,y:576},route=detour(captured,captured.player,goal);
 assert.ok(route,'The valid y=576 escape must be in the search graph');
 assert.equal(S.compileRoute(route,captured).danger.length,0);
 for(let i=1;i<route.length;i++)for(const shot of captured.bullets)assert.equal(S.segmentCircleTime(route[i-1],route[i],shot,17),null);
 for(const p of route){assert.ok(p.x>=24&&p.x<=936);assert.ok(p.y>=24&&p.y<=576);}
});
test('planner must not report a route from an actually colliding start',()=>{
 const w={bullets:[{x:100,y:100}]};
 assert.equal(detour(w,{x:100,y:100},{x:200,y:200}),null);
});
test('safe near-miss start can exit heuristic padding but cannot cross the real 14px collision boundary',()=>{
 const w={bullets:[{x:100,y:100}],enemies:[]},from={x:116,y:100};
 const route=detour(w,from,{x:200,y:100});
 assert.ok(route,'16px is alive: a 17px planning cushion must not imprison the player');
 assert.equal(S.compileRoute(route,w).danger.length,0);
 assert.equal(detour(w,{x:114,y:100},{x:200,y:100}),null);
});
test('captured 50ms-later Wave 7 near-miss snapshot can still lock five and execute without damage',()=>{
 const w=structuredClone(require('./fixtures/wave7-padding-trap.json'));
 const nearest=Math.min(...w.bullets.map(b=>S.distance(w.player,b)));
 assert.ok(nearest>14&&nearest<17);
 const points=planWavePoints(w);w.route=S.compileRoute(points,w);
 assert.equal(w.route.danger.length,0);assert.equal(w.route.locks.length,5);
 S.executeRoute(w);for(let i=0;i<3000&&w.phase==='executing';i++)S.step(w);
 assert.equal(w.phase,'wave-clear');assert.equal(w.failed,false);assert.equal(w.lastKills,5);
});
test('captured Wave 7 route locks all five targets and clears under unchanged production simulation',()=>{
 const before=JSON.stringify(captured),w=structuredClone(captured),points=planWavePoints(w);
 const route=S.compileRoute(points,w);
 assert.equal(route.locks.length,5);assert.equal(route.danger.length,0);
 for(let i=1;i<points.length;i++)for(const shot of w.bullets)assert.equal(S.segmentCircleTime(points[i-1],points[i],shot,17),null);
 assert.equal(JSON.stringify(captured),before);
 w.route=route;S.executeRoute(w);
 for(let i=0;i<3000&&w.phase==='executing';i++)S.step(w,C.world.fixedStep);
 assert.equal(w.phase,'wave-clear');assert.equal(w.failed,false);assert.equal(w.lastKills,5);
});
