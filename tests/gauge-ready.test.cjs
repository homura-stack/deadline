'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../config.js'),S=require('../simulation.js');
function world(gauge=20){const w=S.createWorld();w.events=[];w.enemies=[];w.player={x:100,y:100};w.waveGraceRemaining=0;w.gauge=gauge;return w;}
const bullet=(x,y,vx=0,vy=0)=>({id:1,enemyId:1,x,y,vx,vy,life:7,grazed:false});
const ready=w=>w.events.filter(e=>e.type==='gaugeReady');
test('40px graze boundary and unchanged 14px contact boundary cover both movement directions',()=>{
  assert.equal(C.gauge.nearMissRadius,40);assert.equal(C.player.radius+C.shooting.bulletRadius,14);
  for(const movingBullet of [false,true])for(const direction of [-1,1])for(const offset of [13.99,14,14.01,39.99,40,40.01]){
    const w=world();w.passiveRecoveryScale=0;
    if(movingBullet){w.bullets=[bullet(100-direction*60,100+offset,direction*1200)];S.step(w,.1);}
    else{w.player={x:100-direction*60,y:100};w.bullets=[bullet(100,100+offset)];S.movePlayer(w,{x:100+direction*60,y:100});}
    assert.equal(w.failed,offset<=14,`${movingBullet}/${direction}/${offset}`);
    assert.equal(w.gauge,offset>14&&offset<=40?36:20);
  }
});
test('passive charge emits READY once, re-arms after consumption, and full initialization stays quiet',()=>{
  const w=world(99);S.step(w,.1);assert.equal(w.gauge,100);assert.deepEqual(ready(w),[{type:'gaugeReady',source:'passive'}]);
  S.step(w,1);assert.equal(ready(w).length,1);S.stopTime(w);S.cancelStop(w);S.step(w,3);assert.equal(ready(w).length,2);
  const full=world(100);S.step(full,2);assert.equal(ready(full).length,0);
});
test('near miss delivers actual gain before READY and cannot repeat at full charge',()=>{
  const w=world(84);w.bullets=[bullet(200,135)];S.movePlayer(w,{x:300,y:100});
  assert.equal(w.gauge,100);assert.deepEqual(w.events,[{type:'nearMiss',x:200,y:135,gain:16},{type:'gaugeReady',source:'nearMiss'}]);
  S.movePlayer(w,{x:100,y:100});assert.equal(ready(w).length,1);
  const capped=world(95);capped.bullets=[bullet(200,135)];S.movePlayer(capped,{x:300,y:100});assert.equal(capped.events[0].gain,5);
});
test('practice recovery suppression is world-local and cannot bypass the near miss',()=>{
  const practice=world(84),normal=world(84);assert.equal(normal.passiveRecoveryScale,1);practice.passiveRecoveryScale=0;
  S.step(practice,30);assert.equal(practice.gauge,84);assert.equal(ready(practice).length,0);
  S.step(normal,2);assert.equal(normal.gauge,100);
  practice.bullets=[bullet(200,135)];S.movePlayer(practice,{x:300,y:100});assert.equal(practice.gauge,100);assert.equal(ready(practice).length,1);
});
