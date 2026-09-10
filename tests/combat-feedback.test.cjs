'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const C=require('../config.js');
test('combat feedback keeps Wave tuning and all gameplay parameters intact',()=>{
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(C.waves)).digest('hex'),'29a7752894aec2e5e00184ac5fcf3369c7c96933d09c1ba55ca3414b6f5c4b2b');
  assert.equal(C.gauge.nearMissRadius,40);assert.equal(C.gauge.nearMissGain,16);assert.equal(C.gauge.recoveryPerSecond,15);
});
test('combat feedback stays bounded and separates impact from reaction',()=>{
  assert.equal(C.feedback.death.hitStopSeconds,.3);assert.equal(C.feedback.death.playerFlashSeconds,.3);
  assert.equal(C.feedback.death.reactionSeconds,.35);assert.equal(C.feedback.death.resultDelaySeconds,.65);
  assert.ok(Math.abs(C.feedback.death.hitStopSeconds+C.feedback.death.reactionSeconds-C.feedback.death.resultDelaySeconds)<1e-10);
  assert.equal(C.feedback.ready.idlePeriodSeconds,1.1);assert.equal(C.feedback.ready.idleWaveExpand,14);
  assert.equal(C.feedback.ready.idleWaveOpacity,.32);
  assert.equal(C.feedback.ready.flashSeconds,.12);assert.equal(C.feedback.ready.waveSeconds,.32);assert.equal(C.feedback.ready.waveExpand,6);
  assert.equal(C.audio.referenceGain,4);assert.equal(C.audio.limiterKnee,.8);assert.equal(C.audio.limiterCeiling,.95);
});
test('five briefing slides introduce Near Miss before FREEZE in the intended order',()=>{
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  assert.deepEqual([...html.matchAll(/class="briefing-number">([^<]+)/g)].map(m=>m[1]),['01 / EVADE','02 / NEAR MISS','03 / FREEZE','04 / DRAW','05 / EXECUTE']);
  assert.deepEqual([...html.matchAll(/data-briefing-page="(\d+)"/g)].map(m=>m[1]),['0','1','2','3','4']);
  assert.match(html,/敵弾のすぐ近くをかわすとTIME STOPゲージが大きく増える/);
  assert.match(html,/危険へ踏み込むほど早く時間を止められる/);
});
