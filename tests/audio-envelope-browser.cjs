'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {measureAudio}=require('./audio-metrics.cjs'),baseline=require('./fixtures/audio-m-baseline.json');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(String(e)));
  await p.addScriptTag({path:path.join(__dirname,'..','config.js')});await p.addScriptTag({path:path.join(__dirname,'..','audio.js')});
  const report=await measureAudio(p);report.browser=browser.version();report.before=baseline.results;
  const out=path.join(__dirname,'artifacts',process.env.DEADLINE_REPORT_DIR||'task-m');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'audio-envelope.json'),JSON.stringify(report,null,2));
  assert.equal(report.commonGain,4);assert.equal(report.limiterKnee,.8);assert.equal(report.limiterCeiling,.95);
  for(const [name,r]of Object.entries(report.results)){
   assert.ok(r.final.peak<=.950001,name);assert.ok(r.final.rms>0,name);assert.equal(r.activeVoices,0,name);
   assert.ok(r.final.tailEnergy<1e-6,`${name} must not leak a sustained tail`);
  }
  for(const name of ['lock','execute','kill','damage','final']){
   const now=report.results[name].final,before=baseline.results[name].final;
   assert.ok(now.rms>before.rms*1.1,`${name}: stronger body at unchanged common gain`);
   assert.ok(now.rms100>before.rms100*1.1,`${name}: fixed-window presence must grow, not just change the RMS window`);
   // 20ms energy is reported, not a rigid timbre/quality pass threshold.
  }
  for(const name of ['stop','nearMiss','ready','perfect','clear','ui','clock','draw','resume']){
   for(const metric of ['peak','rms','rms50','rms100','energy20Percent'])assert.ok(Math.abs(report.results[name].final[metric]-baseline.results[name].final[metric])<Math.max(1e-6,Math.abs(baseline.results[name].final[metric])*.01),`${name} ${metric} must stay unchanged`);
   assert.equal(report.results[name].windowMs,baseline.results[name].windowMs);
  }
  const r=report.results;assert.ok(r.execute.final.rms100>r.lock.final.rms100*1.5,'EXECUTE must lead LOCK');
  assert.ok(r.final.final.rms100>r.kill.final.rms100,'final kill must lead normal kill');
  assert.ok(r.final.final.rms100>r.hit.final.rms100,'final kill must also lead the full normal slash + kill event');
  assert.equal(r.locks.plays.target,10);assert.equal(r.tenKills.plays.kill,10);assert.equal(r.damageReady.plays.damage,1);assert.equal(r.damageReady.plays.ready,1);
  for(const name of ['locks','executeKill','tenKills','denseSequence','damageReady'])assert.ok(r[name].limiter.aboveKneePercent<10,`${name}: limiter must not be active throughout normal use`);
  assert.deepEqual(errors,[]);console.log('PASS TASK M: per-SE envelope metrics, fixed windows, unchanged non-target sounds, hierarchy, overlap, limiter and cleanup');
  for(const name of ['lock','execute','kill','damage','final','locks','executeKill','tenKills','denseSequence','damageReady'])console.log(name,JSON.stringify({before:baseline.results[name].final,after:r[name].final,limiter:r[name].limiter}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
