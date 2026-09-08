'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),J=require('../journey.js');
global.Deadline={journey:J};const V=require('../world-map.js');
test('Pico location derives only from restored progress, including selected past areas and replay',()=>{
 for(let restored=0;restored<=5;restored++)for(let selected=0;selected<5;selected++){
  const s={...J.create(),mode:'map',restored,selected,active:selected},before=JSON.stringify(s);
  assert.equal(V.currentArea(s),Math.min(4,restored));assert.equal(JSON.stringify(s),before);
  const replay={...s,replay:true,mode:'battle'};assert.equal(V.currentArea(replay),Math.min(4,restored));
  assert.equal(V.currentArea(JSON.parse(JSON.stringify(s))),Math.min(4,restored));
 }
});
test('Pico advances on existing restoration completion and fresh campaign state remains Garden',()=>{
 const s=J.create();s.mode='map';assert.equal(V.currentArea(s),0);
 J.enter(s,0);while(s.mode==='entering')J.tick(s,.05,true);J.cleared(s,2,[],{x:1,y:1});
 assert.equal(V.currentArea(s),0);while(s.mode==='restoring')J.tick(s,.05,true);
 assert.equal(V.currentArea(s),1);assert.equal(s.selected,1);assert.equal(V.currentArea(J.create()),0);
});
