/* Normal configuration campaign: no funded gauge, extended test timer, relocated actors or unlocked assist. */
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {state,planWave,surviveUntilReady}=require('./browser.cjs');
const {visitCompleted,initialMap,battleReady,nextArea}=require('./journey-helpers.cjs');
const base=process.env.DEADLINE_TEST_URL||'http://127.0.0.1:4186/';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),report={browser:browser.version(),waves:[],errors:[],note:'Automation verifies mechanics and reachable safe routes; it does not measure perceived difficulty.'},out=path.join(__dirname,'artifacts','task-k');fs.mkdirSync(out,{recursive:true});
 try{
  const p=await browser.newPage({viewport:{width:1366,height:900}});p.on('pageerror',e=>report.errors.push(String(e)));
  await p.addInitScript(()=>{let seed=0xdead1e;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);});
  await visitCompleted(p,base+'?debug');await p.waitForLoadState('networkidle');const config=await p.evaluate(()=>JSON.stringify(Deadline.config));
  await p.locator('#title-start').click();await initialMap(p);await battleReady(p);
  for(let wave=1;wave<=10;wave++){
   if(wave>1){if(wave%2===1)await nextArea(p);else await p.waitForFunction(n=>Deadline.inspect().world.wave===n,wave);}
   if(wave===7){await p.waitForFunction(()=>Deadline.inspect().world.phase==='rule-preview');await p.keyboard.press('Space');await p.keyboard.press('Space');}
   await p.waitForFunction(()=>Deadline.inspect().world.phase==='normal');await surviveUntilReady(p);await p.keyboard.press('Space');
   const stopped=(await state(p)).world;assert.equal(stopped.timeLimitMultiplier,1);assert.equal(stopped.phase,'stopped');
   let points;
   try{points=await planWave(p);}catch(error){report.failure={wave,message:error.message,stopped};throw error;}
   const planned=(await state(p)).world;assert.equal(planned.route.danger.length,0);
   if(wave>=8)await p.locator('#arena').screenshot({path:path.join(out,`wave-${wave}-normal-route.png`)});
   await p.keyboard.press('Space');await p.waitForFunction(()=>['wave-clear','complete','failed','one-stop-failed'].includes(Deadline.inspect().world.phase));
   const after=(await state(p)).world;assert.equal(after.failed,false);assert.equal(after.phase,'wave-clear');
   report.waves.push({wave,bulletsAtStop:stopped.bullets.length,targets:stopped.enemies.filter(e=>e.alive).length,stopSeconds:stopped.stopRemaining,remainingAfterDraw:planned.stopRemaining,routePoints:points.length,failures:stopped.waveFailures[wave-1],score:after.score});
   console.log(`PASS standard Wave ${wave}: ${report.waves.at(-1).targets} targets, ${stopped.bullets.length} bullets, no assist`);
  }
  await p.waitForFunction(()=>Deadline.inspect().journey.mode==='ending',{}, {timeout:15000});assert.equal(await p.evaluate(()=>JSON.stringify(Deadline.config)),config);assert.deepEqual(report.errors,[]);
 }finally{fs.writeFileSync(path.join(out,'standard-waves.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
