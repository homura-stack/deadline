'use strict';
const {initialMap}=require('./journey-helpers.cjs');
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.DEADLINE_TEST_URL||'http://127.0.0.1:4186/';
const output=path.join(__dirname,'artifacts','restoration');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),report={browser:browser.version(),runs:[],errors:[]};
 try{
  for(const profile of [{name:'desktop',cpu:1,dpr:1},{name:'4x-cpu-dpr2',cpu:4,dpr:2}]){
   const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:profile.dpr});const p=await context.newPage();
   p.on('pageerror',e=>report.errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
   const cdp=await context.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:profile.cpu});
   await p.goto(base+'?debug');await p.waitForLoadState('networkidle');await p.locator('#title-start').click();await initialMap(p);
   await p.evaluate(()=>Deadline.stageArt.prepare(4));await p.waitForFunction(()=>Deadline.stageArt.status(4)==='ready');
   const result=await p.evaluate(async()=>{
    const D=Deadline,c=document.createElement('canvas');Object.assign(c.style,{position:'fixed',left:'0',top:'0',width:'1200px',height:'750px'});document.body.append(c);
    const renderer=new D.Renderer(c),w=D.sim.createWorld(),j={...D.journey.create(),mode:'battle',active:4,origin:{x:65,y:540}};
    const snapshot=JSON.stringify(D.inspect().world);w.bullets=Array.from({length:180},(_,i)=>({id:i,x:30+(i%20)*47,y:40+Math.floor(i/20)*59,vx:40,vy:60,life:10,pattern:['aim','burst','rotate'][i%3]}));
    const app={...D.inspect(),world:w,journey:j,titleActive:false,briefingActive:false,shake:0,debugEnabled:false};
    const runs=[];
    for(const mode of ['battle','restoring']){
     j.mode=mode;const times=[],frames=[];let last=0;
     for(let i=0;i<210;i++)await new Promise(resolve=>requestAnimationFrame(now=>{
      j.elapsed=mode==='restoring'?1.45+(i%180)/180*3.3:0;
      const t=performance.now();renderer.draw(app);const cost=performance.now()-t;
      if(i>=30){times.push(cost);if(last)frames.push(now-last);}last=now;resolve();
     }));
     const percentile=(a,p)=>[...a].sort((x,y)=>x-y)[Math.floor((a.length-1)*p)];
     runs.push({mode,frames:times.length,drawP95:percentile(times,.95),drawMax:Math.max(...times),frameP95:percentile(frames,.95)});
    }
    return {runs,worldUnchanged:snapshot===JSON.stringify(D.inspect().world),cachedPixels:renderer.stageCache.width*renderer.stageCache.height*3,assets:D.stageArt.inspect()};
   });
   assert.equal(result.worldUnchanged,true);assert.ok(result.cachedPixels<=1920*1200*3);assert.ok(result.assets.images.length<=4);
   for(const r of result.runs)assert.ok(r.drawP95<16.7,`${profile.name} ${r.mode} draw p95 ${r.drawP95.toFixed(2)}ms exceeds a 60Hz frame`);
   report.runs.push({...profile,...result});console.log('PASS',profile.name,JSON.stringify(result.runs));await context.close();
  }
  assert.deepEqual(report.errors,[]);
 }finally{fs.writeFileSync(path.join(output,'performance.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
