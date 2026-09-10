'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../config.js'),source=fs.readFileSync(require('node:path').join(__dirname,'..','audio.js'),'utf8');
function fixture(saved=null){
  const nodes=[],writes=[];
  const param=()=>({value:0,events:[],cancelScheduledValues(){},setValueAtTime(v,t){this.value=v;this.events.push(['set',v,t]);},linearRampToValueAtTime(v,t){this.value=v;this.events.push(['linear',v,t]);},exponentialRampToValueAtTime(v,t){this.value=v;this.events.push(['exponential',v,t]);}});
  const node=kind=>{const n={kind,connections:[],gain:param(),frequency:param(),playbackRate:param(),Q:param(),connect(to){this.connections.push(to);},disconnect(){this.connections=[];},start(t){this.startedAt=t;},stop(t){this.stoppedAt=t;}};nodes.push(n);return n;};
  const context={state:'running',currentTime:1,sampleRate:48000,destination:node('destination'),resume(){this.state='running';return Promise.resolve();},createGain:()=>node('gain'),createWaveShaper:()=>node('limiter'),createOscillator:()=>node('oscillator'),createBiquadFilter:()=>node('filter'),createBufferSource:()=>node('source'),createBuffer:(_,n)=>({getChannelData:()=>new Float32Array(n)})};
  const sandbox={Deadline:{config:C},localStorage:{getItem:()=>saved,setItem:(key,value)=>writes.push({key,value})},window:{AudioContext:function(){return context;}}};
  vm.runInNewContext(source,sandbox);return{sound:new sandbox.Deadline.Sound(),context,nodes,writes};
}
test('audio graph boosts the shared bus and limits before the unchanged saved master gain',()=>{
  const {sound:s}=fixture(JSON.stringify({masterVolume:37,sfxVolume:64,muted:false}));s.unlock();
  assert.equal(s.sfxGain.connections[0],s.referenceGain);assert.equal(s.referenceGain.connections[0],s.limiter);assert.equal(s.limiter.connections[0],s.masterGain);assert.equal(s.masterGain.connections[0],s.context.destination);
  assert.equal(s.referenceGain.gain.value,4);assert.equal(s.masterGain.gain.value,.37);assert.equal(s.sfxGain.gain.value,.64);
  const curve=s.limiter.curve;assert.equal(curve[(curve.length-1)/2],0);assert.ok(Math.max(...curve)<.95);assert.ok(Math.min(...curve)>-.95);
  for(let i=1;i<curve.length;i++)assert.ok(curve[i]>=curve[i-1]);
  assert.ok(Math.abs(curve[3072]-.5)<1e-6,'ordinary levels stay linear');
});
test('READY uses tracked short voices and stopGroup releases both nodes',()=>{
  const {sound:s}=fixture();s.unlock();s.playReady();assert.equal(s.inspect().plays.ready,1);assert.equal(s.activeVoices.size,2);
  s.stopGroup('ready');assert.equal(s.activeVoices.size,0);s.playReady();assert.equal(s.activeVoices.size,2);s.stopAll();assert.equal(s.activeVoices.size,0);
});
test('mute, zero gain, saved sliders and suspended context remain compatible',()=>{
  const {sound:s,context,writes}=fixture();s.unlock();s.playReady();s.setMuted(true);assert.equal(s.masterGain.gain.value,0);assert.equal(s.activeVoices.size,0);s.playReady();assert.equal(s.inspect().plays.ready,1);
  s.setMasterVolume(0);s.setSfxVolume(64);s.setMuted(false);assert.equal(s.masterGain.gain.value,0);assert.equal(s.sfxGain.gain.value,.64);
  context.state='suspended';s.unlock();assert.equal(context.state,'running');assert.equal(s.referenceGain.gain.value,4);
  assert.deepEqual(JSON.parse(writes.at(-1).value),{masterVolume:0,sfxVolume:64,muted:false});assert.ok(writes.every(w=>w.key===C.audio.storageKey));
});
test('invalid preferences use configured defaults and all important sound APIs remain callable',()=>{
  const {sound:s}=fixture('{invalid');s.unlock();assert.equal(s.masterVolume,80);assert.equal(s.sfxVolume,90);
  s.playTimeStopStart();s.playNearMiss();s.playReady();s.playTargetLock();s.playExecuteRelease();s.playKill();s.playKill(10,true);s.playDamage();s.play('perfect');s.play('clear');
  assert.ok(s.activeVoices.size>0);s.stopAll();assert.equal(s.activeVoices.size,0);
});

test('selected combat voices schedule an attack, positive hold and bounded two-stage decay',()=>{
  for(const method of ['playTargetLock','playExecuteRelease','playKill','playDamage']){
    const {sound:s}=fixture();s.unlock();s[method]();
    for(const voice of s.activeVoices){
      const events=voice.nodes.find(n=>n.kind==='gain').gain.events;
      const attack=events.find(e=>e[0]==='linear'),hold=events.find(e=>e[0]==='set'&&e[1]===attack[1]);
      assert.ok(hold&&hold[2]>attack[2],`${method} needs a hold after attack`);
      const decays=events.filter(e=>e[0]==='exponential');assert.equal(decays.length,2);
      assert.ok(decays[0][1]<attack[1]&&decays[0][1]>.0001);assert.ok(decays[0][2]>hold[2]);
      assert.equal(decays[1][1],.0001);assert.ok(decays[1][2]>decays[0][2]);
      assert.ok(voice.source.stoppedAt-decays[1][2]>.007);
    }
  }
});

test('kill retains its low sine and adds a short restrained midrange voice, including final kill',()=>{
  for(const last of [false,true]){
    const {sound:s}=fixture();s.unlock();s.playKill(1,last);
    const voices=[...s.activeVoices],tones=voices.filter(v=>v.source.kind==='oscillator');
    assert.equal(voices.length,3);assert.equal(tones.length,2);
    const bass=tones.find(v=>v.source.type==='sine'),mid=tones.find(v=>v.source.type==='triangle');
    assert.equal(bass.source.frequency.events[0][1],last?118:98);assert.equal(bass.source.frequency.events.at(-1)[1],38);
    assert.ok(mid.source.frequency.events[0][1]>=600);assert.ok(mid.source.stoppedAt-mid.source.startedAt<.09);
    const peak=v=>v.nodes.find(n=>n.kind==='gain').gain.events.find(e=>e[0]==='linear')[1];
    assert.ok(peak(mid)<=peak(bass)*.25);s.stopAll();assert.equal(s.activeVoices.size,0);
  }
});

test('LOCK rate limiting is unchanged while EXECUTE remains a bounded 100-180ms event',()=>{
  const {sound:s,context}=fixture();s.unlock();s.playTargetLock();context.currentTime+=.04;s.playTargetLock();assert.equal(s.inspect().plays.target,1);
  context.currentTime+=.006;s.playTargetLock();assert.equal(s.inspect().plays.target,2);s.stopAll();s.playExecuteRelease();
  const duration=Math.max(...[...s.activeVoices].map(v=>v.source.stoppedAt-v.source.startedAt));
  assert.ok(duration>=.1&&duration<=.188);s.setMuted(true);assert.equal(s.activeVoices.size,0);
});

test('READY and UI keep their short envelopes rather than inheriting a combat hold',()=>{
  for(const method of ['playReady','playUiConfirm']){
    const {sound:s}=fixture();s.unlock();s[method]();
    for(const voice of s.activeVoices){const events=voice.nodes.find(n=>n.kind==='gain').gain.events;assert.equal(events.filter(e=>e[0]==='set').length,1);}
  }
});
