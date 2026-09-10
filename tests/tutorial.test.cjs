/* Baseline contract captured from revision ce742ca5:game.js. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const C=require('../config.js'),S=require('../simulation.js'),T=require('../tutorial.js'),legacy=require('./fixtures/tutorial-legacy.json');
const source=fs.readFileSync(path.join(__dirname,'..','game.js'),'utf8').replace(/\r\n/g,'\n');
function baselineFunction(name){return source.match(new RegExp('^  function '+name+'\\([^\\n]*\\) \\{[\\s\\S]*?^  \\}','m'))[0];}
const normalize=value=>JSON.parse(JSON.stringify(value));
test('the restored placement/timing and five unaffected practice controls match the Git baseline while near-miss training is explicit',()=>{
  assert.deepEqual(C.practice,legacy.practice);
  for(const [name,expected] of Object.entries(legacy.preservedFunctionSHA256))if(!['notePracticeMovement','handleEvents'].includes(name))assert.equal(crypto.createHash('sha256').update(baselineFunction(name).replace('    w.passiveRecoveryScale = 0;\n','')).digest('hex'),expected,name);
  const movement=baselineFunction('notePracticeMovement');assert.match(movement,/setupPracticeNearMiss\(\)/);assert.doesNotMatch(movement,/world\.gauge = C\.gauge\.max/);
  assert.match(baselineFunction('handleEvents'),/event\.type==='nearMiss'/);
});
test('the actual restored rehearsal creates two fixed targets and sparse harmless practice bullets',()=>{
  const normal=S.createWorld(),config=JSON.stringify(C);
  const w=vm.runInNewContext(baselineFunction('configurePracticeWorld')+';configurePracticeWorld()',{S,C});
  assert.deepEqual(normalize(w.player),{x:160,y:430});assert.equal(w.gauge,0);
  assert.equal(w.passiveRecoveryScale,0);assert.equal(normal.passiveRecoveryScale,1);const waiting=structuredClone(w);S.step(waiting,1);assert.equal(waiting.gauge,0);
  assert.deepEqual(normalize(w.enemies.map(e=>({x:e.x,y:e.y}))),legacy.practice.enemies);
  assert.ok(w.enemies.every(e=>e.pattern==='aim'&&e.vx===0&&e.vy===0&&e.shotRemaining===999));
  assert.equal(w.bullets.length,2);assert.equal(w.safetyRemaining,999);assert.equal(w.waveGraceRemaining,999);
  w.enemies[0].hp=99;assert.equal(JSON.stringify(C),config);assert.deepEqual(S.createWorld(),normal);
});
test('two-target practice uses normal five-second STOP and execution collision/score rules',()=>{
  const w=vm.runInNewContext(baselineFunction('configurePracticeWorld')+';configurePracticeWorld()',{S,C});
  w.gauge=100;S.stopTime(w);assert.equal(w.stopRemaining,5);
  for(const point of [...w.enemies,{x:805,y:400}])S.addRoutePoint(w,point);
  assert.equal(w.route.locks.length,2);w.bullets.length=0;S.executeRoute(w);
  for(let i=0;i<200&&w.phase==='executing';i++)S.step(w);
  assert.equal(w.totalKills,2);assert.equal(w.score,750);assert.equal(w.failed,false);
});
function storage(saved=null){return {saved,writes:[],getItem(){return this.saved;},setItem(key,value){this.writes.push({key,value});this.saved=value;}};}
test('only normal completion permits the manual exit to MAP, including legacy saves',()=>{
  for(const value of [null,'unknown','{}','started','skipped'])assert.equal(T.createPreferences(()=>storage(value)).shouldOffer(),true,value);
  assert.equal(T.createPreferences(()=>storage('completed')).shouldOffer(),false);
});
test('starting and leaving never write a completion or dismiss the requirement',()=>{
  for(const value of ['started','skipped']){
    const s=storage(),p=T.createPreferences(()=>s);p.remember(value);
    assert.equal(p.shouldOffer(),true);assert.equal(T.createPreferences(()=>s).status(),null);
    assert.deepEqual(s.writes,[]);
  }
});
test('completion persists and replay cannot downgrade it to started or skipped',()=>{
  const s=storage(),p=T.createPreferences(()=>s);p.remember('completed');p.remember('started');p.remember('skipped');
  assert.equal(p.status(),'completed');assert.equal(T.createPreferences(()=>s).status(),'completed');assert.equal(s.writes.length,1);
});
test('blocked storage falls back to this page session without errors or repeated forcing',()=>{
  const p=T.createPreferences(()=>{throw Error('storage blocked');});assert.equal(p.shouldOffer(),true);
  p.remember('skipped');assert.equal(p.shouldOffer(),true);p.remember('completed');assert.equal(p.status(),'completed');assert.equal(p.shouldOffer(),false);
});
test('invalid updates cannot dismiss required training or write unrelated settings',()=>{
  const s=storage(),p=T.createPreferences(()=>s);p.remember('invalid');assert.equal(p.shouldOffer(),true);assert.deepEqual(s.writes,[]);
});
