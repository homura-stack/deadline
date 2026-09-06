'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),J=require('../journey.js');
function tickUntilChange(j,reduced=false){for(let i=0;i<220;i++){const event=J.tick(j,.05,reduced);if(event)return event;}assert.fail('transition did not finish');}
test('five immutable areas retain the exact ten Wave mapping',()=>{
 assert.deepEqual(J.areas.map(a=>[a.first,a.last]),[[1,2],[3,4],[5,6],[7,8],[9,10]]);
 for(let wave=1;wave<=10;wave++)assert.equal(J.areaForWave(wave),J.areas[Math.floor((wave-1)/2)]);
 assert.ok(Object.isFrozen(J.areas)&&J.areas.every(Object.isFrozen));
});
test('fresh map allows only Garden and never marks it restored merely by entering',()=>{
 const j=J.create();j.mode='map';assert.deepEqual(J.areas.map((_,i)=>J.status(j,i)),['available','locked','locked','locked','locked']);
 for(const i of [-1,1,2,3,4,5,.5])assert.equal(J.enter(j,i),false);
 assert.equal(J.enter(j,0),true);assert.equal(j.restored,0);assert.equal(J.paused(j),true);assert.equal(tickUntilChange(j),'battle');assert.equal(J.paused(j),false);
});
test('first Wave stays in battle; second Wave alone starts restoration',()=>{
 const j=J.create();j.mode='map';J.enter(j,0);tickUntilChange(j);
 assert.equal(J.cleared(j,1,[]),false);assert.equal(j.mode,'battle');assert.equal(J.cleared(j,4,[]),false);
 const route=[{x:12,y:34},{x:78,y:90}];assert.equal(J.cleared(j,2,route),true);route[0].x=999;
 assert.equal(j.route[0].x,12);assert.equal(j.restored,0);assert.equal(J.cleared(j,2,route),false);
});
test('restoration grants exactly one new area after its beat, with all later districts locked',()=>{
 const j=J.create();j.mode='map';
 for(let i=0;i<5;i++){
  assert.equal(J.enter(j,i),true);tickUntilChange(j);assert.equal(J.cleared(j,i*2+2,[]),true);
  assert.equal(J.paused(j),true);assert.equal(tickUntilChange(j),'map');assert.equal(j.restored,i+1);
  for(let k=0;k<5;k++)assert.equal(J.status(j,k),k<=i?'online':k===i+1?'available':'locked');
  assert.equal(J.enter(j,i),false);assert.equal(J.tick(j,99),null);
 }
 assert.equal(j.mode,'synchronizing');assert.equal(j.restored,5);assert.equal(J.enter(j,5),false);
 assert.equal(tickUntilChange(j),'ending');assert.equal(J.paused(j),true);assert.equal(J.onMap(j),true);
});
test('map time cannot advance progress and long frames do not skip the presentation',()=>{
 const j=J.create();j.mode='map';const before=structuredClone(j);J.tick(j,1000);assert.deepEqual(j,before);
 J.enter(j,0);J.tick(j,1000);assert.equal(j.elapsed,.05);assert.equal(j.mode,'entering');
});
test('reduced motion shortens presentation without changing unlock order or Wave mapping',()=>{
 const j=J.create();j.mode='map';J.enter(j,0);assert.equal(tickUntilChange(j,true),'battle');J.cleared(j,2,[]);assert.equal(tickUntilChange(j,true),'map');assert.equal(j.restored,1);
});

test('entry waits for its actual background pair without advancing the journey clock',()=>{
 const j=J.create();j.mode='map';J.enter(j,0);
 for(let i=0;i<300;i++)J.tick(j,.05,false,false);
 assert.equal(j.mode,'entering');assert.equal(j.elapsed,0);assert.equal(tickUntilChange(j),'battle');
});

test('firefly restoration holds BEFORE, breathes, expands, and labels only full AFTER',()=>{
 for(const active of [0,1,2,3,4])for(const reduced of [false,true]){
  const j={...J.create(),active,mode:'restoring'};
  j.elapsed=.4;assert.equal(J.restorationFrame(j,reduced).quiet,true);assert.equal(J.restorationFrame(j,reduced).reveal,0);
  j.elapsed=.6;assert.equal(J.restorationFrame(j,reduced).stage,'breathing');assert.equal(J.restorationFrame(j,reduced).complete,false);
  let previous=0;for(let t=0;t<J.restoreSeconds(j,reduced);t+=.01){j.elapsed=t;const f=J.restorationFrame(j,reduced);assert.ok(f.reveal>=previous);if(f.complete)assert.equal(f.reveal,1);previous=f.reveal;}
  assert.equal(J.restorationFrame(j,reduced).complete,true);
 }
});

test('restoration origin is a snapshot of Pico, independent of the route and later pointer movement',()=>{
 const j={...J.create(),mode:'battle'},player={x:911,y:48},route=[{x:50,y:80},{x:900,y:50}];
 J.cleared(j,2,route,player);player.x=0;route[1].x=0;
 assert.deepEqual(j.origin,{x:911,y:48});assert.equal(j.route[1].x,900);
});

test('five separate answers converge, briefly dim, breathe together and hold the complete map',()=>{
 const j={...J.create(),mode:'synchronizing',restored:5,active:4};
 j.elapsed=1;const separate=J.finaleFrame(j);assert.ok(Math.max(...separate.lights)-Math.min(...separate.lights)>.1);
 j.elapsed=4;const aligned=J.finaleFrame(j);assert.ok(aligned.lights.every(v=>v===aligned.lights[0]));
 j.elapsed=4.9;const sync=J.finaleFrame(j);assert.equal(sync.sync,true);assert.ok(sync.lights[0]<.35);
 j.elapsed=6.8;const full=J.finaleFrame(j);assert.deepEqual(full.lights,[1,1,1,1,1]);assert.equal(full.wire,1);
 assert.equal(j.mode,'synchronizing');j.elapsed=J.finaleSeconds(false);assert.equal(J.tick(j,.01),'ending');
 assert.equal(J.enter(j,0),false);const finished=structuredClone(j);J.tick(j,1000);assert.deepEqual(j,finished);
});
