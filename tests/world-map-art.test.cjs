'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),J=require('../journey.js');
const {frame}=require('../world-map.js');

test('map artwork never grants progression or exposes locked districts',()=>{
  for(let restored=0;restored<=4;restored++){
    const state={...J.create(),mode:'map',restored,elapsed:4,unlockFrom:restored-1},snapshot=structuredClone(state);
    const result=frame(state);
    assert.deepEqual(result.reveal,[0,1,2,3,4].map(i=>i<restored?1:0));assert.equal(result.full,0);
    assert.deepEqual(state,snapshot);
    state.selected=4;assert.deepEqual(frame(state).reveal,result.reveal,'inspecting a locked district does not restore it');
  }
});

test('new regional reveal spreads continuously while prior restoration remains',()=>{
  for(let restored=1;restored<=5;restored++){
    const state={...J.create(),mode:restored===5?'synchronizing':'map',restored,unlockFrom:restored-1};let previous=0;
    for(let t=0;t<=4;t+=.02){state.elapsed=t;const result=frame(state);assert.ok(result.reveal[restored-1]>=previous);previous=result.reveal[restored-1];for(let i=0;i<restored-1;i++)assert.equal(result.reveal[i],1);}
    assert.equal(previous,1);
  }
});

test('firefly calls, dips, answers, then settles without a hard light jump',()=>{
  const state={...J.create(),mode:'map',restored:1,unlockFrom:0};
  const light=t=>{state.elapsed=t;return frame(state).lights[0];};
  assert.ok(light(.4)>light(.9)+.3);assert.ok(light(1.75)>light(1)+.5);assert.equal(light(3.5),1);
  let previous=light(0);for(let t=.001;t<4;t+=.001){const value=light(t);assert.ok(Math.abs(value-previous)<.01);previous=value;}
});

test('full photograph waits for the SYNC breath and remains visible before the epilogue',()=>{
  for(const reduced of [false,true]){
    const scale=reduced?4/8.4:1,state={...J.create(),mode:'synchronizing',restored:5,unlockFrom:4};
    state.elapsed=4.9*scale;assert.equal(frame(state,reduced).full,0);assert.ok(frame(state,reduced).dim>.1);
    state.elapsed=5.8*scale;assert.ok(frame(state,reduced).full>0&&frame(state,reduced).full<1);
    state.elapsed=6.8*scale;assert.equal(frame(state,reduced).full,1);assert.ok(state.elapsed<J.finaleSeconds(reduced));
    state.mode='ending';state.elapsed=0;assert.equal(frame(state,reduced).full,1);assert.equal(frame(state,reduced).dim,0);
  }
});
