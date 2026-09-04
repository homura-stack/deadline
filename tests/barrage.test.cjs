// Development-only coverage of mixed shooting, frozen burst clocks and bounded bullet lifetime.
'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const C = require('../config.js'), S = require('../simulation.js');
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
function fixture(pattern = 'aim') {
 const w = S.createWorld(); w.player = {x:100,y:100}; w.waveGraceRemaining=0;
 w.enemies = [{id:1,x:600,y:300,vx:0,vy:0,alive:true,pattern,shotRemaining:0,burstRemaining:0,burstTimer:0,rotateAngle:0,delayRemaining:null,delayAngle:0}];
 return w;
}
function readyStop(w) { w.gauge = C.gauge.max; S.stopTime(w); } // Funded isolated fixtures.
const bullet = (id, life = 7, x = 800) => ({id,enemyId:1,x,y:500,vx:0,vy:0,life});

test('Wave 1 opens with the configured AIM-only teaching group', () => {
 const w = S.createWorld(); assert.deepEqual(w.enemies.map(e=>e.pattern),['aim','aim','aim']);
 assert.equal(C.timeStop.seconds,5);assert.equal(C.timeStop.lockRadius,48);assert.equal(C.execution.maxDuration,.72);
});
test('three-shot bursts retarget each actual shot, respect burst gaps and do not home afterward', () => {
 const w=fixture(), frames=[], angles=[];
 for(let i=0;i<50;i++) {
  w.player.y=100+i*3;const before=w.nextBulletId;S.step(w);
  if(w.nextBulletId>before){frames.push(i);const b=w.bullets.at(-1);close(Math.hypot(b.vx,b.vy),135);close(Math.atan2(b.vy,b.vx),Math.atan2(w.player.y-300,w.player.x-600));angles.push(Math.atan2(b.vy,b.vx));}
 }
 assert.equal(frames.length,3);assert.equal(new Set(angles).size,3);
 for(let i=1;i<3;i++)assert.ok(Math.abs((frames[i]-frames[i-1])*C.world.fixedStep-.16)<=C.world.fixedStep+1e-8);
 close(Math.atan2(w.bullets[0].vy,w.bullets[0].vx),angles[0]);
});
test('fan emits five evenly spaced shots over 70 degrees centered on the current aim', () => {
 const w=fixture('fan');S.step(w);assert.equal(w.bullets.length,5);const center=Math.atan2(-200,-500),spread=70*Math.PI/180;
 w.bullets.forEach((b,i)=>{const angle=center-spread/2+i*spread/4;close(b.vx,Math.cos(angle)*115);close(b.vy,Math.sin(angle)*115);});
});
test('ring emits ten unique evenly spaced directions at the slower configured speed', () => {
 const w=fixture('burst');S.step(w);assert.equal(w.bullets.length,10);
 close(w.bullets.reduce((sum,b)=>sum+b.vx,0),0);close(w.bullets.reduce((sum,b)=>sum+b.vy,0),0);
 for(let i=0;i<10;i++){const b=w.bullets[i],n=w.bullets[(i+1)%10];close(Math.hypot(b.vx,b.vy),95);close((b.vx*n.vx+b.vy*n.vy)/95**2,Math.cos(Math.PI*2/10));}
});
test('burst remainder and bullet lifetime freeze through STOP and execution, then resume without catch-up', () => {
 const w=fixture();S.step(w);readyStop(w);S.addRoutePoint(w,{x:130,y:100});const snapshot=structuredClone({enemy:w.enemies[0],bullets:w.bullets,time:w.time});
 for(let i=0;i<240;i++)S.step(w);S.executeRoute(w);
 while(w.phase==='executing')S.step(w);
 assert.deepEqual({enemy:w.enemies[0],bullets:w.bullets,time:w.time},snapshot);
 for(let i=0;i<19;i++)S.step(w);assert.equal(w.bullets.length,1);S.step(w);assert.equal(w.bullets.length,2);
});
test('clearing the last enemy cancels pending shots and removes inter-wave bullets', () => {
 const w=fixture();S.step(w);readyStop(w);S.addRoutePoint(w,{x:600,y:100});S.addRoutePoint(w,{x:600,y:300});S.executeRoute(w);
 while(w.phase==='executing')S.step(w);assert.equal(w.failed,false);assert.equal(w.lastKills,1);
 const next=w.nextBulletId;assert.equal(w.phase,'wave-clear');assert.equal(w.bullets.length,0);for(let i=0;i<48;i++)S.step(w);assert.equal(w.nextBulletId,next);
});
test('mixed volleys cannot exceed the cap and discarded volleys are not queued', () => {
 const w=fixture('burst');w.bullets=Array.from({length:C.shooting.maxBullets-2},(_,i)=>bullet(i+100));S.step(w);assert.equal(w.bullets.length,180);assert.equal(w.nextBulletId,3);
 w.enemies[0].shotRemaining=0;S.step(w);assert.equal(w.nextBulletId,3);w.bullets.forEach(b=>b.life=.001);S.step(w);assert.equal(w.bullets.length,0);
 S.step(w);assert.equal(w.bullets.length,0);
});
test('expiry and out-of-bounds cleanup compact in place and retain the other bullet identities', () => {
 const w=fixture();w.enemies[0].shotRemaining=10;w.bullets=[bullet(1,.001),bullet(2),bullet(3,7,980),bullet(4)];const array=w.bullets,keep=w.bullets[1];
 S.step(w);assert.equal(w.bullets,array);assert.deepEqual(w.bullets.map(b=>b.id),[2,4]);assert.equal(w.bullets[0],keep);close(keep.life,7-C.world.fixedStep);
});
test('expiry clips swept movement; expired bullets cannot hit later in the same frame', () => {
 const w=fixture();w.enemies[0].shotRemaining=10;w.bullets=[{...bullet(1,.01,150),y:100,vx:-1000}];S.step(w,.1);assert.equal(w.failed,false);assert.equal(w.bullets.length,0);
});
test('failure during compaction preserves remaining bullets without duplication', () => {
 const w=fixture();w.enemies[0].shotRemaining=10;w.bullets=[bullet(1,.001),{...bullet(2,7,150),y:100,vx:-1000},bullet(3),bullet(4)];
 S.step(w,.1);assert.equal(w.failed,true);assert.deepEqual(w.bullets.map(b=>b.id),[2,3,4]);close(w.bullets[0].x,114);
});
test('Wave 1 builds a visible, slower AIM barrage while allowing reaction', () => {
 const w=S.createWorld();for(let i=0;i<300;i++)S.step(w);assert.equal(w.failed,false);assert.ok(w.bullets.length>=9,w.bullets.length);assert.deepEqual([...new Set(w.bullets.map(b=>Math.round(Math.hypot(b.vx,b.vy))))],[115]);
});
test('one minute of Wave 1 shooting remains bounded by count and lifetime limits', () => {
 // Isolated load fixture, deliberately outside the playfield so damage cannot stop the workload.
 const w=S.createWorld();w.player={x:-10000,y:-10000};let peak=0;
 for(let i=0;i<7200;i++){S.step(w);peak=Math.max(peak,w.bullets.length);assert.ok(w.bullets.length<=180);assert.ok(w.bullets.every(b=>b.life>0&&b.life<=7));}
 assert.ok(peak>=9);assert.ok(w.nextBulletId>100);
});
