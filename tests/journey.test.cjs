'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),J=require('../journey.js');
function tickUntilChange(j,reduced=false){for(let i=0;i<100;i++){const event=J.tick(j,.05,reduced);if(event)return event;}assert.fail('transition did not finish');}
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
 assert.equal(j.mode,'map');assert.equal(j.restored,5);assert.equal(J.enter(j,5),false);
});
test('map time cannot advance progress and long frames do not skip the presentation',()=>{
 const j=J.create();j.mode='map';const before=structuredClone(j);J.tick(j,1000);assert.deepEqual(j,before);
 J.enter(j,0);J.tick(j,1000);assert.equal(j.elapsed,.05);assert.equal(j.mode,'entering');
});
test('reduced motion shortens presentation without changing unlock order or Wave mapping',()=>{
 const j=J.create();j.mode='map';J.enter(j,0);assert.equal(tickUntilChange(j,true),'battle');J.cleared(j,2,[]);assert.equal(tickUntilChange(j,true),'map');assert.equal(j.restored,1);
});
