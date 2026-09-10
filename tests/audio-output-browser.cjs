/* Real Web Audio rendering; metrics measure output, not whether a play method was called. */
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.addScriptTag({path:path.join(__dirname,'..','config.js')});await page.addScriptTag({path:path.join(__dirname,'..','audio.js')});
    const report=await page.evaluate(async()=>{
      const C=Deadline.config;
      const configuredGain=C.audio.referenceGain;
      async function render(kind,referenceGain=configuredGain,master=100,sfx=100){
        const context=new OfflineAudioContext(1,96000,48000);let time=0;
        // The real graph renders offline; only the scheduling clock/state are adapted for the live Sound API.
        const facade=new Proxy(context,{get(target,key){if(key==='currentTime')return time;if(key==='state')return 'running';const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});
        window.AudioContext=function(){return facade;};C.audio.referenceGain=referenceGain;
        const sound=new Deadline.Sound();sound.unlock();sound.setMasterVolume(master);sound.setSfxVolume(sfx);
        const play={stop:()=>sound.playTimeStopStart(),nearMiss:()=>sound.playNearMiss(),ready:()=>sound.playReady(),lock:()=>sound.playTargetLock(),execute:()=>sound.playExecuteRelease(),kill:()=>sound.playKill(),final:()=>sound.play('final',10),damage:()=>sound.playDamage(),perfect:()=>sound.play('perfect'),clear:()=>sound.play('clear')};
        if(kind==='sequence'){
          sound.playNearMiss();sound.playReady();
          for(let i=1;i<=10;i++){time=.15+i*.05;sound.playTargetLock(i);}
          time=.7;sound.playExecuteRelease();
          for(let i=1;i<=10;i++){time=.76+i*.025;sound.playSlash(i,i===10);sound.playKill(i,i===10);}
          time=1.2;sound.play('perfect');
        }else if(kind==='stress'){for(let i=1;i<=10;i++){sound.play('final',i);}sound.playDamage();sound.playReady();}
        else play[kind]();
        const buffer=await context.startRendering(),data=buffer.getChannelData(0);let peak=0,energy=0,nonFinite=0;
        for(const v of data){peak=Math.max(peak,Math.abs(v));energy+=v*v;if(!Number.isFinite(v))nonFinite++;}
        return{peak,rms:Math.sqrt(energy/data.length),nonFinite,activeVoices:sound.inspect().activeVoices,plays:sound.inspect().plays};
      }
      const cases={};for(const name of ['stop','nearMiss','ready','lock','execute','kill','final','damage','perfect','clear','sequence','stress'])cases[name]=await render(name);
      cases.oldLock=await render('lock',1);cases.masterZero=await render('sequence',configuredGain,0);cases.sfxZero=await render('sequence',configuredGain,100,0);
      for(const name of ['lock','kill','final','perfect','clear','sequence'])cases['baseline_'+name]=await render(name,2.5);
      return cases;
    });
    for(const [name,r]of Object.entries(report)){
      assert.equal(r.nonFinite,0,name);assert.ok(r.peak<=.950001,`${name} peak ${r.peak}`);assert.equal(r.activeVoices,0,name);
      if(name.endsWith('Zero'))assert.equal(r.peak,0,name);else assert.ok(r.rms>0,name);
    }
    assert.ok(report.stress.peak>.8,'overlap actually exercises the limiter');
    const increase=report.lock.rms/report.oldLock.rms;assert.ok(increase>3.95&&increase<4.05,increase);
    for(const name of ['lock','kill','final','perfect','clear','sequence']){
      const ratio=report[name].rms/report['baseline_'+name].rms;
      assert.ok(ratio>1.55&&ratio<1.65,`${name}: 4.0 / 2.5 gain preserves event dynamics, ${ratio}`);
      assert.ok(report[name].peak<.8,`${name}: normal use should not drive the limiter excessively`);
    }
    assert.ok(report.final.rms>report.kill.rms);assert.ok(report.perfect.rms>report.clear.rms);assert.deepEqual(errors,[]);
    const out=path.join(__dirname,'artifacts',process.env.DEADLINE_REPORT_DIR||'audio-output');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'audio-output.json'),JSON.stringify({browser:browser.version(),increase,cases:report,errors},null,2));
    console.log(`PASS audio output: 10 event sounds, real overlap, mute levels, peak ceiling and cleanup; LOCK RMS ${increase.toFixed(3)}x`);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
