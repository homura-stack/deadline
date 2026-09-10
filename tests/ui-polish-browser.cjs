'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{PNG}=require('pngjs');
const {begin,plan,move,stroke,state}=require('./tutorial-helpers.cjs');
const {planWave,surviveUntilReady}=require('./browser.cjs');
const {assertTitleComposition,overlap}=require('./title-helpers.cjs');
const base=process.env.DEADLINE_TEST_URL||'http://127.0.0.1:4186/';
const out=path.join(__dirname,'artifacts','ui-polish');fs.mkdirSync(out,{recursive:true});
const report={layouts:[],routes:[],errors:[]};
async function snap(p,name){await p.screenshot({path:path.join(out,`after-${name}.png`)});}
async function layout(p,size){
  const m=await p.evaluate(()=>{const selectors=['#arena','.hud','.charge','#phase','#status-action','#stop-time','#life','#score','#lock-count','#hint','.controls'];return Object.fromEntries(selectors.map(s=>{const el=document.querySelector(s),r=el.getBoundingClientRect(),c=getComputedStyle(el);return[s,{font:parseFloat(c.fontSize),x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}]}));});
  // Shell and arena measurements keep HUD growth from reducing play space.
  const expected=size.width===1920?[1192,745]:size.width===1366?[772.797,483]:[1390,820];
  assert.ok(Math.abs(m['#arena'].width-expected[0])<.1);assert.equal(m['#arena'].height,expected[1]);
  for(const key of ['#stop-time','#life','#lock-count','#phase'])assert.ok(m[key].font>m['#score'].font,`${key} outranks score`);
  assert.ok(m['#stop-time'].font>=34);assert.ok(m['#life'].font>=27);assert.ok(m['#hint'].font>=14);
  assert.ok(m['.controls'].bottom<=size.height);assert.ok(m['.hud'].bottom<=m['#arena'].y);assert.ok(m['.charge'].bottom<=m['#arena'].y);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  for(const a of ['#phase','#lock-count','#life'])for(const b of ['#status-action','#score'])assert.equal(overlap(m[a],m[b]),false,`${a} / ${b}`);
  report.layouts.push({size,metrics:m});
}
async function map(p,size){
  await p.waitForFunction(()=>Deadline.inspect().journey.mode==='map'&&!Deadline.inspect().practice.active);
  await p.waitForSelector('#map-board[data-art-status="ready"]');
  // Verify a pixel of the photograph in the REAL game screen, not only an isolated mask fixture.
  const sample=await p.evaluate(()=>{const e=document.querySelector('.world-before'),r=e.getBoundingClientRect(),c=document.createElement('canvas');c.width=Math.round(r.width);c.height=Math.round(r.height);const ctx=c.getContext('2d');ctx.drawImage(e,0,0,c.width,c.height);const x=Math.round(r.width*.72),y=Math.round(r.height*.1);return {x:Math.round(r.x+x),y:Math.round(r.y+y),rgb:[...ctx.getImageData(x,y,1,1).data].slice(0,3)};});
  const shot=PNG.sync.read(await p.screenshot()),pixel=[...shot.data.slice((sample.y*shot.width+sample.x)*4,(sample.y*shot.width+sample.x)*4+3)];
  await snap(p,`map-${size.width}`);
  assert.ok(pixel.reduce((n,v,i)=>n+Math.abs(v-sample.rgb[i]),0)<12,'live WORLD MAP must show the source photograph '+JSON.stringify({sample,pixel}));
  const d=await p.locator('.map-detail').boundingBox();for(const l of await p.locator('.map-node-label').all())assert.equal(overlap(await l.boundingBox(),d),false);
  assert.match(await p.locator('[aria-current="location"] em').innerText(),/CURRENT/);
  await snap(p,`map-${size.width}`);
}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});report.browser=browser.version();
try{
 for(const size of [{width:1920,height:1080},{width:2560,height:1440},{width:1366,height:768}]){
  const p=await browser.newPage({viewport:size});p.on('pageerror',e=>report.errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});p.on('requestfailed',r=>report.errors.push(r.url()));
  await p.addInitScript(()=>{let seed=0xdead1e;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);});
  await p.goto(base+'?debug');await p.waitForLoadState('networkidle');await assertTitleComposition(p,size);await snap(p,`title-${size.width}`);
  await p.locator('#title-start').click();await p.waitForFunction(()=>Deadline.inspect().briefingActive);await snap(p,`briefing-${size.width}`);
  await begin(p);await snap(p,`training-${size.width}`);assert.match(await p.locator('#phase-label').innerText(),/TRAINING 1 \/ 5/);
  await plan(p);assert.match(await p.locator('#phase-label').innerText(),/TRAINING 5 \/ 5/);await snap(p,`training-line-${size.width}`);await p.keyboard.press('Space');await map(p,size);
  await p.evaluate(()=>{Deadline.config.gauge.recoveryPerSecond=40;});await p.locator('#map-enter').click();await p.waitForFunction(()=>Deadline.inspect().journey.mode==='battle');await layout(p,size);await snap(p,`battle-${size.width}`);
  const pico=await p.evaluate(()=>{const e=Deadline.characters.entries.pico;return[e.file,e.width,e.anchorX,e.anchorY,e.status]});assert.deepEqual(pico,['pico-final.png',48,.56,.47,'ready']);
  await surviveUntilReady(p);await p.keyboard.press('Space');await snap(p,`stop-${size.width}`);
  const release=p.mouse.up.bind(p.mouse);p.mouse.up=async()=>{await snap(p,`drawing-active-${size.width}`);await release();};await planWave(p);p.mouse.up=release;
  assert.equal(await p.locator('#target-note').innerText(),'✓ COMPLETE');assert.match(await p.locator('#lock-count').innerText(),/3 \/ 3/);await snap(p,`draw-${size.width}`);await p.keyboard.press('Space');await snap(p,`execute-${size.width}`);
  await p.waitForFunction(()=>Deadline.inspect().world.phase==='wave-clear');await snap(p,`wave-clear-${size.width}`);
  await p.waitForFunction(()=>Deadline.inspect().world.wave===2&&Deadline.inspect().world.phase==='normal');
  await surviveUntilReady(p);await p.keyboard.press('Space');await planWave(p);await p.keyboard.press('Space');await p.waitForFunction(()=>Deadline.inspect().journey.mode==='restoring');
  await p.waitForFunction(()=>Deadline.journey.restorationFrame(Deadline.inspect().journey).complete);await p.waitForTimeout(400);await snap(p,`restored-${size.width}`);await p.waitForFunction(()=>Deadline.inspect().journey.mode==='map');
  assert.equal((await state(p)).journey.restored,1);assert.equal(await p.locator('[data-area="1"]').getAttribute('data-status'),'available');
  await p.reload();await p.waitForLoadState('networkidle');await p.locator('#title-training-launch').click();await begin(p);await plan(p);await p.keyboard.press('Space');await map(p,size);
  await p.evaluate(()=>{Deadline.config.gauge.recoveryPerSecond=40;});await p.locator('#map-enter').click();await p.waitForFunction(()=>Deadline.inspect().journey.mode==='battle');await surviveUntilReady(p);await p.keyboard.press('Space');const w=(await state(p)).world;await p.waitForFunction(()=>Deadline.inspect().world.stopRemaining<.9);assert.equal(await p.locator('#gauge-value').innerText(),'残りわずか');await snap(p,`time-warning-${size.width}`);await stroke(p,[w.bullets[0]]);await p.keyboard.press('Space');
  await p.waitForFunction(()=>Deadline.inspect().world.failed);const impact=await state(p);assert.ok(impact.deathFx.hitStopRemaining>0);assert.ok(impact.deathFx.flashRemaining>0);assert.equal(await p.locator('#result').isVisible(),false);assert.equal(await p.locator('#status-action').innerText(),'IMPACT');
  await p.waitForTimeout(140);assert.equal(await p.locator('#result').isVisible(),false);await p.waitForFunction(()=>Deadline.inspect().deathFx.resultVisible);await snap(p,`game-over-${size.width}`);assert.equal(await p.locator('#life').innerText(),'0');assert.equal(await p.locator('#result').isVisible(),true);
  await p.locator('#retry').click();await p.waitForFunction(()=>!Deadline.inspect().world.failed);assert.equal((await state(p)).world.wave,3);assert.equal((await state(p)).world.life,1);
  if(size.width===1920){await p.waitForTimeout(900);await move(p,(await state(p)).world.enemies[0]);await p.waitForFunction(()=>Deadline.inspect().world.failed);await p.keyboard.press('Space');assert.equal((await state(p)).deathFx.retryQueued,1);await p.waitForFunction(()=>!Deadline.inspect().world.failed);assert.equal((await state(p)).world.wave,3);}
  // A keyboard-accessible help disclosure does not move the arena or fire a command.
  const arena=await p.locator('#arena').boundingBox();await p.locator('.play-help summary').focus();await p.keyboard.press('Enter');assert.equal(await p.locator('.play-help').getAttribute('open'),'');assert.equal((await state(p)).world.phase,'normal');
  const after=await p.locator('#arena').boundingBox();assert.equal(after.width,arena.width);assert.equal(after.height,arena.height);
  report.routes.push({size,flow:'fresh START → 4 pages → 5 practice steps → MAP → Garden W1/W2 → RESTORED → MAP; permanent TRAINING → restored MAP → Forge → impact pause → GAME OVER → RETRY',pico});await p.close();console.log('PASS UI hierarchy, live map pixels, complete real-input routes:',size.width,size.height);
 }
 assert.deepEqual(report.errors,[]);
}finally{fs.writeFileSync(path.join(out,'ui-report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
