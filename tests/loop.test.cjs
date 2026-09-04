'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../config.js'),S=require('../simulation.js');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const p=(x,y)=>({x,y});
function world(){const w=S.createWorld();w.player=p(100,100);w.enemies=[];w.waveGraceRemaining=0;return w;}
function foe(pattern='aim',x=500,y=300){return{id:1,x,y,vx:0,vy:0,alive:true,pattern,shotRemaining:0,burstRemaining:0,burstTimer:0,rotateAngle:0,delayRemaining:null,delayAngle:0};}
const shot=(x,y,vx=0,vy=0)=>({id:1,enemyId:1,x,y,vx,vy,life:7,grazed:false});
function funded(w){w.gauge=C.gauge.max;S.stopTime(w);return w;}
function run(w){S.executeRoute(w);while(w.phase==='executing')S.step(w);return w;}
test('opening gauge blocks STOP via the simulation API, and passive recovery takes four normal seconds',()=>{
 const w=world();assert.equal(w.gauge,20);S.stopTime(w);assert.equal(w.phase,'normal');assert.equal(w.route,null);
 w.enemies=[foe()];w.enemies[0].shotRemaining=100;for(let i=0;i<479;i++)S.step(w);assert.equal(S.canStop(w),false);S.step(w);assert.equal(S.canStop(w),true);close(w.gauge,100);
});
test('only normal time recovers gauge, and successful activation spends it once',()=>{
 const w=funded(world());close(w.gauge,0);S.stopTime(w);S.step(w,1);close(w.gauge,0);S.addRoutePoint(w,p(130,100));S.executeRoute(w);S.step(w);close(w.gauge,0);
 while(w.phase==='executing')S.step(w);S.stopTime(w);assert.equal(w.phase,'normal');S.step(w);close(w.gauge,20/120);
 w.failed=true;w.phase='failed';const amount=w.gauge;S.step(w,10);close(w.gauge,amount);
});
test('cancel charges its net fee once, removes the route and cannot grant safety or a free second stop',()=>{
 const w=funded(world());S.addRoutePoint(w,p(300,100));S.cancelStop(w);assert.equal(w.phase,'normal');assert.deepEqual(w.player,p(100,100));assert.equal(w.route,null);close(w.gauge,60);close(w.safetyRemaining,0);
 S.cancelStop(w);close(w.gauge,60);S.stopTime(w);assert.equal(w.phase,'normal');
});
test('cancel and activation costs remain separately tunable',()=>{
 const original={...C.gauge};try{C.gauge.max=200;C.gauge.initial=50;C.gauge.cost=150;C.gauge.cancelCost=70;
 const w=world();assert.equal(w.gauge,50);funded(w);assert.equal(w.gauge,50);S.cancelStop(w);assert.equal(w.gauge,130);
 }finally{Object.assign(C.gauge,original);}
});
test('a player near miss awards eight once per bullet and no extra points for retracing',()=>{
 const w=world();w.bullets=[shot(200,120)];S.movePlayer(w,p(300,100));close(w.gauge,28);assert.equal(w.failed,false);assert.equal(w.bullets[0].grazed,true);
 S.movePlayer(w,p(100,100));close(w.gauge,28);
});
test('moving bullet near misses reuse the same one-time flag and direct hits do not award charge',()=>{
 const w=world();w.bullets=[shot(70,120,600)];S.step(w,.1);close(w.gauge,30);assert.equal(w.failed,false);S.movePlayer(w,p(150,100));close(w.gauge,30);
 const hit=world();hit.bullets=[shot(50,100,1000)];S.step(hit,.1);assert.equal(hit.failed,true);close(hit.gauge,22);assert.equal(hit.bullets[0].grazed,false);
});
test('safety and stopped/execute phases cannot farm near-miss bonuses',()=>{
 const w=world();w.safetyRemaining=.5;w.bullets=[shot(200,120)];S.movePlayer(w,p(300,100));close(w.gauge,20);assert.equal(w.bullets[0].grazed,false);
 funded(w);S.addRoutePoint(w,p(100,100));close(w.gauge,0);run(w);close(w.gauge,0);
});
test('red route geometry never causes planning damage; Undo and Clear recalculate warning and locks',()=>{
 const w=world();w.enemies=[foe('aim',260,100)];w.bullets=[shot(200,100)];funded(w);S.addRoutePoint(w,p(140,100));S.addRoutePoint(w,p(260,150));
 // Start a fresh straight risky segment after a genuine corner.
 S.addRoutePoint(w,p(180,100));assert.ok(w.route.danger.length>0);assert.equal(w.failed,false);const budget=w.stopRemaining;
 S.undoRoute(w);assert.equal(w.route.danger.length,0);S.clearRoute(w);assert.equal(w.route.points.length,1);assert.equal(w.route.locks.length,0);close(w.stopRemaining,budget);close(w.gauge,0);
 S.undoRoute(w);assert.equal(w.route.points.length,1);
});
test('a risky plan damages only on traversal, even if safety remained before STOP',()=>{
 const w=world();w.safetyRemaining=.5;w.bullets=[shot(200,100)];funded(w);S.addRoutePoint(w,p(300,100));S.step(w,1);assert.equal(w.failed,false);run(w);assert.equal(w.failed,true);close(w.player.x,186);close(w.safetyRemaining,0);
});
test('the run travels past the final enemy to its drawn endpoint and grants half a second of safety',()=>{
 const w=world();w.enemies=[foe('aim',220,100),{...foe('fan',800,500),id:2}];funded(w);S.addRoutePoint(w,p(500,100));run(w);assert.equal(w.lastKills,1);assert.deepEqual(w.player,p(500,100));close(w.safetyRemaining,.5);
 w.enemies=[foe('fan',500,100),{...foe('aim',800,500),id:2}];w.enemies.forEach(e=>e.shotRemaining=100);
 for(let i=0;i<60;i++)S.step(w);assert.equal(w.failed,false);S.step(w);assert.equal(w.failed,true);
});
test('safety covers projectile contact and pointer motion, then ends without deleting bullets',()=>{
 const w=funded(world());S.addRoutePoint(w,p(120,100));run(w);w.bullets=[shot(180,100)];S.movePlayer(w,p(180,100));assert.equal(w.failed,false);
 for(let i=0;i<60;i++)S.step(w);assert.equal(w.failed,false);assert.equal(w.bullets.length,1);S.step(w);assert.equal(w.failed,true);
});
test('timeout executes a partial plan; empty timeout consumes full activation cost without safety',()=>{
 const w=funded(world());S.addRoutePoint(w,p(300,100));S.step(w,5);assert.equal(w.phase,'executing');run(w);assert.deepEqual(w.player,p(300,100));
 const empty=funded(world());S.step(empty,5);assert.equal(empty.phase,'normal');assert.equal(empty.failed,false);close(empty.gauge,0);close(empty.safetyRemaining,0);
});
test('ROTATE fires eight successive angular steps and preserves rotation between volleys',()=>{
 const w=world();w.enemies=[foe('rotate')];for(let i=0;i<115;i++)S.step(w);assert.equal(w.bullets.length,8);
 w.bullets.forEach((b,i)=>{close(b.vx,Math.cos(i*Math.PI/8)*110);close(b.vy,Math.sin(i*Math.PI/8)*110);});close(w.enemies[0].rotateAngle,Math.PI);
});
test('DELAY warns before firing, freezes its locked aim/timer, then fires without retargeting',()=>{
 const w=world();w.enemies=[foe('delay')];S.step(w);assert.equal(w.bullets.length,0);const angle=w.enemies[0].delayAngle;
 funded(w);const before=structuredClone(w.enemies[0]);S.step(w,1);assert.deepEqual(w.enemies[0],before);S.cancelStop(w);S.movePlayer(w,p(100,400));
 for(let i=0;i<77;i++)S.step(w);assert.equal(w.bullets.length,0);S.step(w);assert.equal(w.bullets.length,1);close(w.bullets[0].vx,Math.cos(angle)*230);close(w.bullets[0].vy,Math.sin(angle)*230);assert.equal(w.enemies[0].delayRemaining,null);
});
test('Wave definitions own type, count and per-Wave combat tuning',()=>{
 const w=S.createWorld(),wave=C.waves.definitions[0];assert.equal(w.enemies.length,wave.enemies.length);assert.ok(w.enemies.every(e=>e.pattern==='aim'&&e.hp===wave.enemyHp));
 assert.ok(w.enemies.every(e=>e.shotCount===wave.counts.aim&&e.fireIntervalScale===wave.fireIntervalScale&&e.bulletSpeedScale===wave.bulletSpeedScale));
});
