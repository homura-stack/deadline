/* Offline taps measure the actual Sound graph without replacing its oscillators, filters or envelopes. */
'use strict';
async function measureAudio(page){
 return page.evaluate(async()=>{
  const C=Deadline.config,results={};
  async function render(kind){
   const sr=48000,context=new OfflineAudioContext(3,sr*2,sr);let time=0,end=0;
   const facade=new Proxy(context,{get(target,key){if(key==='currentTime')return time;if(key==='state')return 'running';const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});
   window.AudioContext=function(){return facade;};
   const s=new Deadline.Sound();s.masterVolume=100;s.sfxVolume=100;s.unlock();
   // Independent mono channels: pre-limiter, post-limiter, final master output.
   const merger=context.createChannelMerger(3);s.masterGain.disconnect(context.destination);merger.connect(context.destination);
   s.referenceGain.connect(merger,0,0);s.limiter.connect(merger,0,1);s.masterGain.connect(merger,0,2);
   const voices=[];
   for(const method of ['tone','noise']){const original=s[method];s[method]=function(...args){
    const duration=method==='tone'?args[1]:args[0];end=Math.max(end,time+duration+.008);voices.push({method,at:time,args});return original.apply(this,args);
   };}
   const play={stop:()=>s.playTimeStopStart(),nearMiss:()=>s.playNearMiss(),ready:()=>s.playReady(),lock:()=>s.playTargetLock(),execute:()=>s.playExecuteRelease(),kill:()=>s.playKill(),final:()=>s.play('final',10),damage:()=>s.playDamage(),perfect:()=>s.play('perfect'),clear:()=>s.play('clear'),ui:()=>s.playUiConfirm(),clock:()=>s.playTimeTick(4),draw:()=>s.play('draw'),resume:()=>s.playTimeResume()};
   if(kind==='locks'){for(let i=0;i<10;i++){time=i*.05;s.playTargetLock(i+1);}}
   else if(kind==='executeKill'){s.playExecuteRelease();time=.065;s.play('hit',1);}
   else if(kind==='tenKills'){s.playExecuteRelease();for(let i=1;i<=10;i++){time=.065+(i-1)*.04;s.playSlash(i,i===10);s.playKill(i,i===10);}}
   else if(kind==='denseSequence'){s.playNearMiss();s.playReady();for(let i=1;i<=10;i++){time=.15+i*.05;s.playTargetLock(i);}time=.7;s.playExecuteRelease();for(let i=1;i<=10;i++){time=.76+i*.025;s.playSlash(i,i===10);s.playKill(i,i===10);}time=1.2;s.play('perfect');}
   else if(kind==='damageReady'){s.playDamage();s.playReady();}
   else if(kind==='stress'){for(let i=1;i<=10;i++)s.play('final',i);s.playDamage();s.playReady();}
   else if(kind==='hit')s.play('hit',1);
   else play[kind]();
   const audio=await context.startRendering(),count=Math.ceil(end*sr),pre=audio.getChannelData(0),post=audio.getChannelData(1),final=audio.getChannelData(2);
   function metrics(data){let energy=0,peak=0,first20=0,e50=0,e100=0,tail=0;
    for(let i=0;i<data.length;i++){if(!Number.isFinite(data[i]))throw Error('non-finite audio');const e=data[i]*data[i];energy+=e;peak=Math.max(peak,Math.abs(data[i]));if(i<sr*.02)first20+=e;if(i<sr*.05)e50+=e;if(i<sr*.1)e100+=e;if(i>=count)tail+=e;}
    return{peak,rms:Math.sqrt(energy/count),energy20Percent:energy?100*first20/energy:0,rms50:Math.sqrt(e50/(sr*.05)),rms100:Math.sqrt(e100/(sr*.1)),tailEnergy:tail};
   }
   let above=0,maxReduction=0;for(let i=0;i<count;i++){if(Math.abs(pre[i])>C.audio.limiterKnee)above++;maxReduction=Math.max(maxReduction,Math.abs(pre[i]-post[i]));}
   const beforeLimiter=metrics(pre),afterLimiter=metrics(post);
   return{windowMs:end*1000,voices,final:metrics(final),beforeLimiter,limiter:{aboveKneePercent:100*above/count,rmsGainDb:20*Math.log10(afterLimiter.rms/beforeLimiter.rms),maxReduction},activeVoices:s.inspect().activeVoices,plays:s.inspect().plays};
  }
  for(const kind of ['stop','nearMiss','ready','lock','execute','kill','hit','final','damage','perfect','clear','ui','clock','draw','resume','locks','executeKill','tenKills','denseSequence','damageReady','stress'])results[kind]=await render(kind);
  return{sampleRate:48000,master:100,sfx:100,commonGain:C.audio.referenceGain,limiterKnee:C.audio.limiterKnee,limiterCeiling:C.audio.limiterCeiling,results};
 });
}
module.exports={measureAudio};
