// Development-only coverage of the ten-Wave run, ONE STOP trials, score and result state.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../config.js'),S=require('../simulation.js');
const expectedScore=n=>n*C.scoring.baseKill+n*(n-1)/2*C.scoring.chainBonus+C.scoring.allClearBonus;
function clearCurrentWave(w){
 w.bullets.length=0;w.player={x:100,y:100};w.enemies.forEach((e,i)=>{e.x=i<5?230+i*150:830-(i-5)*150;e.y=i<5?100:500;e.vx=0;e.vy=0;e.shotRemaining=100;});
 w.gauge=C.gauge.max;S.stopTime(w);S.addRoutePoint(w,{x:900,y:100});S.addRoutePoint(w,{x:900,y:500});S.addRoutePoint(w,{x:100,y:500});S.executeRoute(w);
 while(w.phase==='executing')S.step(w);return w.lastKills;
}
function nextWave(w){S.step(w,Math.max(C.waves.intermissionSeconds,C.waves.finalIntermissionSeconds)+C.world.fixedStep);}
function advance(w){nextWave(w);if(w.phase==='rule-preview')S.acknowledgeRulePreview(w);if(w.phase==='rule-intro')S.startPendingWave(w);}

test('the short Wave banner does not pause movement or combat time',()=>{
 const w=S.createWorld(),x=w.enemies[0].x;S.step(w,.4);assert.equal(w.phase,'normal');assert.ok(w.waveBannerRemaining>0&&w.waveBannerRemaining<C.waves.bannerSeconds);assert.notEqual(w.enemies[0].x,x);assert.equal(w.time,.4);
});

test('each Wave starts with the configured short damage grace and then restores collision',()=>{
 const w=S.createWorld();w.enemies.forEach(e=>e.shotRemaining=100);w.bullets=[{id:999,enemyId:1,x:w.player.x,y:w.player.y,vx:0,vy:0,life:7,grazed:false}];
 S.step(w,C.waves.startGraceSeconds/2);assert.equal(w.phase,'normal');assert.ok(w.waveGraceRemaining>0);
 S.step(w,C.waves.startGraceSeconds/2+C.world.fixedStep);assert.equal(w.phase,'normal');
 S.step(w);assert.equal(w.phase,'failed');
});

test('ten data-defined Waves progress from AIM teaching to a ten-target mixed climax',()=>{
 const w=S.createWorld(),counts=[],types=[];
 for(let i=0;i<10;i++){counts.push(w.enemies.length);types.push([...new Set(w.enemies.map(e=>e.pattern))]);clearCurrentWave(w);if(i<9)advance(w);}
 assert.deepEqual(counts,[3,4,4,5,5,6,5,7,8,10]);assert.deepEqual(types[0],['aim']);assert.deepEqual(types[2],['aim','fan']);assert.deepEqual(types[3],['aim','fan','burst']);assert.deepEqual(types[9],['aim','fan','burst','rotate']);
});

test('one STOP all-clear scores the ordered chain and fixed bonus, then clears bullets',()=>{
 const w=S.createWorld();w.bullets.push({id:99,enemyId:1,x:900,y:500,vx:0,vy:0,life:7,grazed:false});
 const kills=clearCurrentWave(w);assert.equal(kills,3);assert.equal(w.maxChain,3);assert.equal(w.score,expectedScore(3));assert.equal(w.phase,'wave-clear');assert.equal(w.bullets.length,0);
 const done=w.events.findLast(e=>e.type==='done');assert.equal(done.allClear,true);assert.ok(w.events.some(e=>e.type==='waveClear'&&e.allClear));
});

test('Wave 6 teaches PERFECT, Wave 7 waits for acknowledgement, and Wave 10 reaches COMPLETE',()=>{
 const w=S.createWorld(),counts=[];for(let i=0;i<6;i++){counts.push(clearCurrentWave(w));nextWave(w);if(i<5)assert.equal(w.phase,'normal');}
 assert.equal(w.wave,6);assert.equal(w.phase,'rule-preview');assert.equal(w.pendingWaveIndex,6);assert.equal(w.perfectExecutions,1);assert.equal(w.lastWavePerfect,true);S.step(w,20);assert.equal(w.phase,'rule-preview');
 S.acknowledgeRulePreview(w);assert.equal(w.phase,'rule-intro');S.step(w,20);assert.equal(w.phase,'rule-intro');S.startPendingWave(w);assert.equal(w.wave,7);assert.equal(w.phase,'normal');assert.equal(C.waves.definitions[w.waveIndex].oneStopRequired,true);
 for(let i=6;i<10;i++){counts.push(clearCurrentWave(w));nextWave(w);}
 assert.deepEqual(counts,[3,4,4,5,5,6,5,7,8,10]);assert.equal(w.phase,'complete');assert.equal(w.wave,10);assert.equal(w.maxChain,10);assert.equal(w.perfectExecutions,5);assert.equal(w.hitsTaken,0);
 assert.equal(w.score,counts.reduce((sum,n)=>sum+expectedScore(n),0));const snapshot=structuredClone(w.enemies);S.step(w,10);assert.deepEqual(w.enemies,snapshot);
 const result=w.events.findLast(e=>e.type==='complete');assert.deepEqual({score:result.score,maxChain:result.maxChain,perfectExecutions:result.perfectExecutions,hitsTaken:result.hitsTaken},{score:w.score,maxChain:10,perfectExecutions:5,hitsTaken:0});
});

test('an incomplete Wave 7 execution shows exact progress, rolls score back and retries that Wave at zero gauge',()=>{
 const w=S.createWorld();for(let i=0;i<6;i++){clearCurrentWave(w);advance(w);}assert.equal(w.wave,7);
 const waveStart=structuredClone(w.waveStartSnapshot);
 w.player={x:100,y:100};w.bullets.length=0;w.enemies.forEach((e,i)=>{e.x=250+i*130;e.y=100;e.vx=0;e.vy=0;});const score=w.score;
 w.gauge=C.gauge.max;S.stopTime(w);S.addRoutePoint(w,{x:280,y:100});S.executeRoute(w);while(w.phase==='executing')S.step(w);
 assert.equal(w.phase,'one-stop-failed');assert.deepEqual(w.oneStopFailure,{reason:'incomplete',defeated:1,locked:1,total:5,failures:1});assert.equal(w.score,score);assert.equal(w.enemies.filter(e=>e.alive).length,4);
 S.retryWave(w);assert.equal(w.phase,'normal');assert.equal(w.wave,7);assert.equal(w.enemies.length,5);assert.ok(w.enemies.every(e=>e.alive));assert.equal(w.gauge,C.waves.retryGaugeInitial);assert.deepEqual(w.player,waveStart.player);
});

test('Waves 7 through 10 each restore their exact Wave opening state after an incomplete execution',()=>{
 const w=S.createWorld();for(let i=0;i<6;i++){clearCurrentWave(w);advance(w);}
 for(let wave=7;wave<=10;wave++){
  const opening={snapshot:structuredClone(w.waveStartSnapshot),enemies:structuredClone(w.enemies),score:w.score,maxChain:w.maxChain,perfect:w.perfectExecutions,hits:w.hitsTaken};
  w.player={x:100,y:100};w.bullets=[{id:999,enemyId:1,x:900,y:550,vx:0,vy:0,life:7,grazed:false}];
  w.enemies.forEach((e,i)=>{e.x=250+i*65;e.y=100;e.vx=0;e.vy=0;e.shotRemaining=100;});
  w.gauge=C.gauge.max;S.stopTime(w);S.addRoutePoint(w,{x:275,y:100});S.executeRoute(w);while(w.phase==='executing')S.step(w);
  assert.equal(w.phase,'one-stop-failed');assert.equal(w.wave,wave);S.retryWave(w);
  assert.equal(w.wave,wave);assert.equal(w.phase,'normal');assert.equal(w.gauge,C.waves.retryGaugeInitial);assert.equal(w.bullets.length,0);assert.equal(w.route,null);assert.equal(w.execution,null);assert.equal(w.oneStopFailure,null);
  assert.deepEqual(w.player,opening.snapshot.player);assert.equal(w.score,opening.score);assert.equal(w.maxChain,opening.maxChain);assert.equal(w.perfectExecutions,opening.perfect);assert.equal(w.hitsTaken,opening.hits);assert.deepEqual(w.enemies,opening.enemies);
  if(wave<10){clearCurrentWave(w);advance(w);}
 }
});

test('ordinary death restores the current Wave opening score, statistics, player and enemies',()=>{
 const w=S.createWorld();for(let i=0;i<3;i++){clearCurrentWave(w);advance(w);}assert.equal(w.wave,4);
 const opening={snapshot:structuredClone(w.waveStartSnapshot),enemies:structuredClone(w.enemies),score:w.score,maxChain:w.maxChain,perfect:w.perfectExecutions,hits:w.hitsTaken};
 w.player={x:100,y:100};w.bullets.length=0;w.enemies.forEach((e,i)=>{e.x=260+i*120;e.y=100;e.vx=0;e.vy=0;e.shotRemaining=100;});
 w.gauge=C.gauge.max;S.stopTime(w);S.addRoutePoint(w,{x:300,y:100});S.executeRoute(w);while(w.phase==='executing')S.step(w);assert.ok(w.score>opening.score);
 w.safetyRemaining=0;w.waveGraceRemaining=0;w.bullets=[{id:999,enemyId:1,x:w.player.x,y:w.player.y,vx:0,vy:0,life:7,grazed:false}];S.step(w);assert.equal(w.phase,'failed');assert.equal(w.hitsTaken,opening.hits+1);
 S.retryWave(w);assert.equal(w.wave,4);assert.equal(w.phase,'normal');assert.equal(w.gauge,C.waves.retryGaugeInitial);assert.equal(w.score,opening.score);assert.equal(w.maxChain,opening.maxChain);assert.equal(w.perfectExecutions,opening.perfect);assert.equal(w.hitsTaken,opening.hits);assert.deepEqual(w.player,opening.snapshot.player);assert.deepEqual(w.enemies,opening.enemies);assert.equal(w.bullets.length,0);
});

test('Wave 7 death resets both a 20 and 100 gauge attempt to the configured zero retry value',()=>{
 const w=S.createWorld();for(let i=0;i<6;i++){clearCurrentWave(w);advance(w);}assert.equal(w.wave,7);
 for(const gauge of [20,100]){w.gauge=gauge;w.safetyRemaining=0;w.waveGraceRemaining=0;w.bullets=[{id:999,enemyId:1,x:w.player.x,y:w.player.y,vx:0,vy:0,life:7,grazed:false}];S.step(w);assert.equal(w.phase,'failed');S.retryWave(w);assert.equal(w.wave,7);assert.equal(w.phase,'normal');assert.equal(w.gauge,0);}
});

test('optional time-limit choices unlock at three and five failures and affect only STOP duration for that Wave',()=>{
 const w=S.createWorld();for(let i=0;i<6;i++){clearCurrentWave(w);advance(w);}const base=C.waves.definitions[w.waveIndex].timeStopSeconds;
 const fail=()=>{w.gauge=C.gauge.max;S.stopTime(w);S.cancelStop(w);};
 fail();assert.deepEqual(S.availableTimeLimitMultipliers(w),[1]);S.retryWave(w,2);assert.equal(w.timeLimitMultiplier,1);
 fail();assert.deepEqual(S.availableTimeLimitMultipliers(w),[1]);S.retryWave(w);
 fail();assert.deepEqual(S.availableTimeLimitMultipliers(w),[1,1.5]);S.retryWave(w,1.5);assert.equal(w.gauge,0);assert.equal(w.timeLimitMultiplier,1.5);w.gauge=C.gauge.max;S.stopTime(w);assert.equal(w.stopRemaining,base*1.5);S.cancelStop(w);
 assert.deepEqual(S.availableTimeLimitMultipliers(w),[1,1.5]);S.retryWave(w);fail();assert.deepEqual(S.availableTimeLimitMultipliers(w),[1,1.5,2]);S.retryWave(w,2);assert.equal(w.timeLimitMultiplier,2);w.gauge=C.gauge.max;S.stopTime(w);assert.equal(w.stopRemaining,base*2);S.cancelStop(w);S.retryWave(w,2);
 clearCurrentWave(w);advance(w);assert.equal(w.wave,8);assert.equal(w.timeLimitMultiplier,1);assert.equal(w.waveFailures[7],0);
});

test('Wave 7 timeout and cancel report distinct causes without returning to Wave 1',()=>{
 const w=S.createWorld();for(let i=0;i<6;i++){clearCurrentWave(w);advance(w);}w.gauge=C.gauge.max;S.stopTime(w);S.step(w,C.waves.definitions[6].timeStopSeconds);assert.equal(w.phase,'one-stop-failed');assert.equal(w.oneStopFailure.reason,'time-over');assert.equal(w.oneStopFailure.locked,0);
 S.retryWave(w);assert.equal(w.gauge,0);w.gauge=C.gauge.max;S.stopTime(w);S.cancelStop(w);assert.equal(w.phase,'one-stop-failed');assert.equal(w.oneStopFailure.reason,'cancel');assert.equal(w.wave,7);
});

test('enemy HP remains a Wave-local data parameter',()=>{
 const wave=C.waves.definitions[0],saved=wave.enemyHp;try{wave.enemyHp=2;const w=S.createWorld();assert.ok(w.enemies.every(e=>e.hp===2));clearCurrentWave(w);assert.ok(w.enemies.every(e=>e.alive&&e.hp===1));assert.equal(w.score,0);assert.equal(w.phase,'normal');}finally{wave.enemyHp=saved;}
});
