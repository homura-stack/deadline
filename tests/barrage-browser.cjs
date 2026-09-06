// Development-only isolated worst-case bullet load; not a survival test.
'use strict';
const {visitCompleted}=require('./journey-helpers.cjs');
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.DEADLINE_TEST_URL||'http://127.0.0.1:4186/',artifacts=path.join(__dirname,'artifacts'),errors=[],results=[];
async function benchmark(page,label,rate){
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await visitCompleted(page,base+'?debug');await page.waitForLoadState('networkidle');
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate});
 const detail=await page.evaluate(async()=>{
  const {config:C,sim:S,Renderer}=Deadline,canvas=document.createElement('canvas');canvas.style.width='960px';canvas.style.height='600px';document.body.appendChild(canvas);
  const renderer=new Renderer(canvas),world=S.createWorld();world.player={x:-10000,y:-10000};world.bullets=Array.from({length:C.shooting.maxBullets},(_,i)=>({id:i,x:40+i%20*45,y:50+Math.floor(i/20)*55,vx:0,vy:0,life:7,grazed:false,enemyId:1}));
  const app={world,particles:[],hits:[],shake:0,reducedMotion:true,debugEnabled:false},draw=[],step=[],frame=[];let previous=null;
  for(let i=0;i<120;i++)await new Promise(resolve=>requestAnimationFrame(now=>{if(previous!==null)frame.push(now-previous);previous=now;let t=performance.now();S.step(world);S.step(world);step.push(performance.now()-t);t=performance.now();renderer.draw(app);draw.push(performance.now()-t);resolve();}));
  world.gauge=C.gauge.max;S.stopTime(world);const points=Array.from({length:512},(_,i)=>({x:24+i*1.75,y:300+210*Math.sin(i*.06)})),compile=[];
  for(let i=0;i<20;i++){const t=performance.now();S.compileRoute(points,world);compile.push(performance.now()-t);}
  const stats=a=>{a.sort((a,b)=>a-b);return{median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],max:a.at(-1)};};canvas.remove();
  return{bullets:world.bullets.length,drawMs:stats(draw),twoStepsMs:stats(step),frameMs:stats(frame),compile512PointsMs:stats(compile),pixelRatio:renderer.ratio};
 });
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});assert.equal(detail.bullets,180);assert.ok(detail.drawMs.p95+detail.twoStepsMs.p95<16.7);assert.ok(detail.compile512PointsMs.p95<60);results.push({name:label,passed:true,detail});console.log('PASS '+label);
}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});await benchmark(page,'Desktop / 180 bullets',1);
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});await benchmark(await context.newPage(),'Touch emulation / 4x CPU slowdown / 180 bullets',4);
 assert.deepEqual(errors,[]);results.push({name:'No runtime or console errors',passed:true});fs.writeFileSync(path.join(artifacts,'barrage-results.json'),JSON.stringify({browser:browser.version(),results,errors,realMobileDevice:false},null,2));await context.close();
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
