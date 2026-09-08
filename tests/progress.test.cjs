'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),J=require('../journey.js');
const fresh=()=>({version:1,restored:0,run:{score:0,maxChain:0,totalKills:0,perfectExecutions:0,hitsTaken:0,time:0}});
// The actual storage boundary only is substituted; serialization and checkpoint rules remain real.
function storage(raw=null){return {raw,writes:0,getItem(key){assert.equal(key,'deadline.progress.v1');return this.raw;},setItem(key,value){assert.equal(key,'deadline.progress.v1');this.raw=value;this.writes++;}};}
test('versioned progress store loads safe defaults and checkpoints completed AREA, not selection',()=>{
 assert.equal(typeof J.createProgressStore,'function');const disk=storage(),store=J.createProgressStore(()=>disk);
 assert.deepEqual(store.load(),fresh());const j={...J.create(),mode:'restoring',active:0,selected:4},w={...fresh().run,score:2150,totalKills:7,time:16};
 store.save(j,w);assert.equal(disk.writes,1);assert.deepEqual(JSON.parse(disk.raw),{version:1,restored:1,run:w});
 const again=J.createProgressStore(()=>disk);assert.deepEqual(again.load(),{version:1,restored:1,run:w});
 j.restored=1;j.mode='map';store.save(j,w);store.save(j,w);assert.equal(disk.writes,1);
 const loaded=store.load();loaded.run.score=999;assert.equal(store.load().run.score,2150);
});
test('progress ignores replay and battle state; stale tabs cannot downgrade a checkpoint',()=>{
 assert.equal(typeof J.createProgressStore,'function');const disk=storage(),a=J.createProgressStore(()=>disk),b=J.createProgressStore(()=>disk),w=fresh().run;
 a.save({...J.create(),mode:'map',restored:3},w);
 for(const j of [{mode:'map',restored:1},{mode:'battle',restored:4},{mode:'restoring',restored:3,active:0,replay:true}])b.save({...J.create(),...j},w);
 assert.equal(JSON.parse(disk.raw).restored,3);assert.equal(disk.writes,1);
 a.save({...J.create(),mode:'restoring',restored:4,active:4},w);
 a.save({...J.create(),mode:'ending',restored:5},w);assert.equal(a.load().restored,5);assert.equal(disk.writes,2);
});
test('corrupt JSON, schema versions, missing and invalid fields safely fall back without deletion',()=>{
 assert.equal(typeof J.createProgressStore,'function');
 for(const value of ['{','null','[]','true',JSON.stringify({version:2,restored:2,run:fresh().run}),JSON.stringify({version:1,restored:1}),...[-1,6,1.5,'2',null].map(restored=>JSON.stringify({...fresh(),restored})),...[-1,'20',null].map(score=>JSON.stringify({...fresh(),run:{...fresh().run,score}}))]){
  const disk=storage(value);assert.deepEqual(J.createProgressStore(()=>disk).load(),fresh());assert.equal(disk.raw,value);assert.equal(disk.writes,0);
 }
});
test('unavailable or full storage keeps a page-session checkpoint without throwing',()=>{
 assert.equal(typeof J.createProgressStore,'function');
 for(const get of [()=>{throw Error('denied');},()=>({getItem:()=>null,setItem:()=>{throw Error('quota');}})]){
  const store=J.createProgressStore(get);assert.deepEqual(store.load(),fresh());store.save({...J.create(),mode:'map',restored:2},fresh().run);assert.equal(store.load().restored,2);
 }
});
test('a failed write is retried at the next safe checkpoint once storage recovers',()=>{
 let full=true;const disk=storage(),write=disk.setItem;disk.setItem=function(...args){if(full)throw Error('quota');write.apply(this,args);};
 const store=J.createProgressStore(()=>disk),j={...J.create(),mode:'map',restored:2};store.save(j,fresh().run);
 assert.equal(disk.raw,null);full=false;store.save(j,fresh().run);assert.equal(JSON.parse(disk.raw)?.restored,2);
 store.save(j,fresh().run);assert.equal(disk.writes,1);
});
