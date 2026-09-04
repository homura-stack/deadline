/* Development-only Chrome automation; the game loads no external library. */
'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs');
const C=require('../config.js'),S=require('../simulation.js');
const base = process.env.DEADLINE_TEST_URL || 'http://127.0.0.1:4186/';
const artifacts = path.join(__dirname, 'artifacts'); fs.mkdirSync(artifacts, { recursive: true });
const errors = [], results = [];
function record(name, detail) { results.push({ name, passed: true, detail }); console.log('PASS ' + name); }
function hook(page) { page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); }
const state = page => page.evaluate(() => Deadline.inspect());
const physical = w => ({ time: w.time, bullets: w.bullets, enemies: w.enemies.map(({alive, hp, ...rest}) => rest) });
async function coords(page, p) {
 const r = await page.locator('#arena').boundingBox(), scale = Math.min(r.width / 960, r.height / 600);
 return { x: r.x + (r.width - 960 * scale) / 2 + p.x * scale, y: r.y + (r.height - 600 * scale) / 2 + p.y * scale };
}
async function move(page, p, steps = 1) { const at = await coords(page, p); await page.mouse.move(at.x, at.y, { steps }); }
async function stroke(page, points, release = true, steps = 6) { await move(page, points[0]); await page.mouse.down(); for (const p of points.slice(1)) await move(page, p, steps); if (release) await page.mouse.up(); }
async function enterGame(page, touchMode = false) {
 assert.equal(await page.locator('#title-screen').isVisible(),true);
 if(touchMode)await page.locator('#title-start').tap();else await page.keyboard.press('Space');
 await page.waitForFunction(()=>document.getElementById('title-screen').hidden);
 assert.equal(await page.locator('#briefing-screen').isVisible(),true);
 if(touchMode)await page.locator('#briefing-skip').tap();else await page.locator('#briefing-skip').click();
 await page.waitForFunction(()=>document.getElementById('briefing-screen').hidden);
}
async function touch(cdp, page, points, end = 'touchEnd') {
 let previous = await coords(page, points[0]); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...previous, id: 1 }] });
 for (const point of points.slice(1)) { const next = await coords(page, point);
  for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: previous.x + (next.x - previous.x) * i / 6, y: previous.y + (next.y - previous.y) * i / 6, id: 1 }] });
  previous = next;
 }
 if (end) { await cdp.send('Input.dispatchTouchEvent', { type: end, touchPoints: [] }); await page.waitForTimeout(20); }
}
async function observe(page) {
 await page.evaluate(() => {
  const step = Deadline.sim.step; window.__runs = []; window.__hits = []; window.__done = null;
  Deadline.sim.step = function(w, dt) {
   const wasExecuting = w.phase === 'executing'; step(w, dt);
   if (wasExecuting) window.__runs.push(JSON.parse(JSON.stringify(w)));
   for (const ev of w.events) { if (ev.type === 'hit') window.__hits.push({...ev}); if (ev.type === 'done') window.__done = { ...ev, player: {...w.player} }; }
  };
 });
}
function detour(w, from, goal) {
 const margin=24,grid=16,cols=58,rows=35,radius=C.player.radius+C.shooting.bulletRadius+3;
 const clear=(a,b)=>w.bullets.every(shot=>S.segmentCircleTime(a,b,shot,radius)===null);
 const position=id=>({x:margin+(id%cols)*grid,y:margin+Math.floor(id/cols)*grid});
 const candidates=new Set(),cost=new Map(),parent=new Map();
 for(let id=0;id<cols*rows;id++){const p=position(id);if(S.distance(from,p)<32&&clear(from,p)){candidates.add(id);cost.set(id,S.distance(from,p));parent.set(id,null);}}
 let end=null;
 while(candidates.size){let current=null,best=Infinity;for(const id of candidates){const f=cost.get(id)+S.distance(position(id),goal);if(f<best){best=f;current=id;}}
  candidates.delete(current);const a=position(current);
  if(S.distance(a,goal)<32&&clear(a,goal)){end=current;break;}
  for(const dx of [-1,0,1])for(const dy of [-1,0,1]){if(!dx&&!dy)continue;const x=current%cols+dx,y=Math.floor(current/cols)+dy;if(x<0||x>=cols||y<0||y>=rows)continue;
   const id=y*cols+x,b=position(id),next=cost.get(current)+S.distance(a,b);if(next>=(cost.get(id)??Infinity)||!clear(a,b))continue;cost.set(id,next);parent.set(id,current);candidates.add(id);
  }
 }
 if(end===null)return null;const raw=[goal];for(let id=end;id!==null;id=parent.get(id))raw.push(position(id));raw.push(from);raw.reverse();
 const simple=[from];let i=0;while(i<raw.length-1){let j=raw.length-1;while(j>i+1&&!clear(raw[i],raw[j]))j--;simple.push(raw[j]);i=j;}return simple;
}
async function charge(page,touchMode=false,cdp=null) {
 if(touchMode) {await page.locator('#restart').tap();await touch(cdp,page,[{x:60,y:550}]);}
 else {await page.locator('#restart').click();await move(page,{x:60,y:550});}
 await page.waitForFunction(()=>Deadline.sim.canStop(Deadline.inspect().world)||Deadline.inspect().world.failed,{},{timeout:6500});
 const w=(await state(page)).world;assert.equal(w.failed,false);assert.ok(Math.abs(w.gauge-100)<1e-6);assert.ok(w.time>=2.5);assert.ok(w.bullets.length>=6);
}
async function collideWithEnemy(page,touchMode=false,cdp=null){const target=(await state(page)).world.enemies.find(e=>e.alive);if(touchMode)await touch(cdp,page,[target]);else await move(page,target);await page.waitForFunction(()=>Deadline.inspect().world.failed);}
async function planSafe(page,touchMode=false,cdp=null) {
 const w=(await state(page)).world;let points=null;
 for(const target of w.enemies.filter(e=>e.alive)){const path=detour(w,w.player,target);if(path){
  // Append an escape point beyond the final lock instead of stopping at its center.
  for(const dx of [80,-80,0])for(const dy of [80,-80,0]){if(!dx&&!dy)continue;const end={x:Math.max(24,Math.min(936,target.x+dx)),y:Math.max(24,Math.min(576,target.y+dy))};const tail=detour(w,target,end);if(tail){points=[...path,...tail.slice(1)];break;}}
  if(points)break;
 }}assert.ok(points);assert.equal(S.compileRoute(points,w).danger.length,0);
 if(touchMode)await touch(cdp,page,points);else await stroke(page,points);return points;
}
async function planPartial(page) {
 const w=(await state(page)).world;let choice=null;
 for(const target of w.enemies.filter(e=>e.alive)){const path=approach(w,w.player,target);if(!path)continue;const route=S.compileRoute(path,w);
  if(route.danger.length===0&&route.locks.length>0&&route.locks.length<w.enemies.filter(e=>e.alive).length&&(!choice||route.length<choice.route.length))choice={path,route};
 }
 assert.ok(choice,`No safe partial route for Wave ${w.wave}`);await stroke(page,choice.path,true,1);const planned=(await state(page)).world;assert.ok(planned.route);assert.equal(planned.route.danger.length,0);return planned.route.locks.length;
}
function pathLength(points){let total=0;for(let i=1;i<points.length;i++)total+=S.distance(points[i-1],points[i]);return total;}
function approach(w,from,target){let best=null;
 for(const radius of [36,44,0])for(let i=0;i<(radius?16:1);i++){const angle=i*Math.PI/8,goal={x:Math.max(24,Math.min(936,target.x+Math.cos(angle)*radius)),y:Math.max(24,Math.min(576,target.y+Math.sin(angle)*radius))};const path=detour(w,from,goal);if(path&&(!best||pathLength(path)<pathLength(best)))best=path;}
 return best;
}
async function planWave(page){const w=(await state(page)).world,points=[w.player];let from=w.player,remaining=w.enemies.filter(e=>e.alive);
 while(remaining.length){let choice=null;for(const target of remaining){const path=approach(w,from,target);if(path&&(!choice||pathLength(path)<pathLength(choice.path)))choice={target,path};}assert.ok(choice,'No safe approach to a Wave enemy');points.push(...choice.path.slice(1));from=choice.path.at(-1);remaining=remaining.filter(e=>e.id!==choice.target.id);}
 for(const end of [{x:60,y:550},{x:60,y:60},{x:900,y:550}]){const tail=detour(w,from,end);if(tail){points.push(...tail.slice(1));break;}}
 // Long late-Wave routes use one pointer event per safe segment so browser automation
 // does not consume the player's real five-to-six second planning budget.
 await stroke(page,points,true,1);const planned=(await state(page)).world;assert.ok(planned.route,`Wave ${w.wave} STOP expired while drawing`);assert.equal(planned.route.danger.length,0);assert.equal(planned.route.locks.length,w.enemies.filter(e=>e.alive).length);return points;
}
async function surviveUntilReady(page){
 const opening=(await state(page)).world;if(opening.time<.1)await move(page,{x:60,y:550},6);
 for(let i=0;i<65;i++){const w=(await state(page)).world;if(w.failed)assert.fail(`Player failed while charging Wave ${w.wave}`);if(S.canStop(w))return;
  let best=w.player,bestScore=-Infinity;
  for(let j=0;j<16;j++){const angle=j*Math.PI/8,candidate={x:Math.max(32,Math.min(928,w.player.x+Math.cos(angle)*28)),y:Math.max(32,Math.min(568,w.player.y+Math.sin(angle)*28))};
   if(w.bullets.some(b=>S.segmentCircleTime(w.player,candidate,b,C.player.radius+C.shooting.bulletRadius+2)!==null)||w.enemies.some(e=>e.alive&&S.segmentCircleTime(w.player,candidate,e,C.player.radius+C.enemy.radius+2)!==null))continue;
   let score=Infinity;for(const b of w.bullets)score=Math.min(score,S.distance(candidate,{x:b.x+b.vx*.18,y:b.y+b.vy*.18}));for(const e of w.enemies)if(e.alive)score=Math.min(score,S.distance(candidate,e)*.8);if(score>bestScore){bestScore=score;best=candidate;}
  }
  await move(page,best,4);await page.waitForTimeout(90);
 }assert.equal(S.canStop((await state(page)).world),true);
}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});hook(page);await page.goto(base+'?debug');await page.waitForLoadState('networkidle');await observe(page);
  assert.equal(await page.title(),'DEAD/LINE — 時間停止ルート');assert.equal(await page.locator('#title-screen').isVisible(),true);assert.equal(await page.locator('.title-logo').getAttribute('alt'),'DEAD/LINE');
  assert.deepEqual(await page.locator('.title-logo').evaluate(image=>({complete:image.complete,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight})),{complete:true,naturalWidth:2172,naturalHeight:724});
  const titleFrozen=(await state(page)).world.time;await page.waitForTimeout(240);assert.equal((await state(page)).world.time,titleFrozen);await page.waitForTimeout(420);await page.screenshot({path:path.join(artifacts,'title-desktop.png')});
  await page.keyboard.down('Space');await page.waitForTimeout(90);assert.equal((await state(page)).titleLeaving,true);assert.equal(await page.locator('#title-screen').isVisible(),true);await page.screenshot({path:path.join(artifacts,'title-start-transition.png')});await page.keyboard.up('Space');await page.waitForFunction(()=>document.getElementById('title-screen').hidden);assert.equal((await state(page)).titleActive,false);assert.equal((await state(page)).briefingActive,true);const briefingTime=(await state(page)).world.time;await page.waitForTimeout(180);assert.equal((await state(page)).world.time,briefingTime);assert.equal(await page.locator('.briefing-page').count(),4);await page.locator('#briefing-skip').click();await page.waitForFunction(()=>document.getElementById('briefing-screen').hidden);record('Transparent DEAD/LINE artwork transitions through a frozen four-step BRIEFING and the explicit skip starts Wave 1');
  assert.equal(await page.locator('#time-stop').isDisabled(),true);await page.keyboard.press('Space');assert.equal((await state(page)).world.phase,'normal');
  assert.equal(await page.locator('#phase').innerText(),'NORMAL');assert.equal(await page.locator('#status-action').innerText(),'MOVE / EVADE');assert.equal(await page.locator('#stop-gauge-label').innerText(),'TIME STOP');
  record('Opening gauge prevents immediate STOP and the normal HUD identifies movement, Wave, charge, Score, Lock and Life');
  await move(page,{x:60,y:550});await page.mouse.down();const lastValid=(await state(page)).world.player;
  const commandBox=await page.locator('#time-stop').boundingBox();await page.mouse.move(commandBox.x+commandBox.width/2,commandBox.y+commandBox.height/2);assert.deepEqual((await state(page)).world.player,lastValid);
  await move(page,{x:10,y:550});assert.deepEqual((await state(page)).world.player,lastValid);await page.mouse.up();assert.deepEqual((await state(page)).world.player,lastValid);
  await move(page,{x:70,y:550});assert.ok(S.distance((await state(page)).world.player,{x:70,y:550})<1);
  await page.keyboard.press('KeyZ');await page.keyboard.press('KeyX');await page.keyboard.press('KeyC');assert.equal((await state(page)).world.phase,'normal');assert.equal((await state(page)).world.route,null);
  record('Captured mouse input over UI or outside the field preserves the last valid position; reentry resumes movement and Z/X/C are inactive in normal time');
  await move(page,{x:60,y:550});assert.deepEqual((await state(page)).world.enemies.map(e=>e.pattern),['aim','aim','aim']);assert.equal((await page.locator('#wave').innerText()).replace(/\s+/g,' '),'1 / 10');
  await page.screenshot({path:path.join(artifacts,'wave-1-desktop.png'),fullPage:true});record('Wave 1 opens immediately with three visible AIM enemies and a compact 1 / 10 HUD');
  await page.waitForFunction(()=>Deadline.sim.canStop(Deadline.inspect().world));const ready=(await state(page)).world;assert.ok(ready.bullets.length>15);assert.equal(await page.locator('#gauge-value').innerText(),'READY');assert.equal(await page.locator('#status-action').innerText(),'TIME STOP READY');assert.equal(await page.locator('#time-stop-label').innerText(),'TIME STOP');
  const normalTone=await page.locator('#arena').evaluate(canvas=>Array.from(canvas.getContext('2d').getImageData(3,3,1,1).data.slice(0,3)));
  await page.locator('#time-stop').focus();await page.keyboard.down('Space');await page.keyboard.down('Space');await page.keyboard.down('Space');await page.waitForTimeout(100);await page.keyboard.up('Space');
   await page.waitForFunction(()=>Deadline.inspect().timeFx.blend>.25&&Deadline.inspect().timeFx.enterRemaining>0,{},{timeout:400});
  let frozenState=await state(page),frozen=frozenState.world;assert.equal(frozen.gauge,0);assert.equal(frozen.phase,'stopped');assert.equal(await page.locator('#status-action').innerText(),'ROUTE INPUT');assert.equal(await page.locator('#stop-gauge-label').innerText(),'TIME LEFT');assert.equal(await page.locator('#gauge-value').innerText(),'ACTIVE');record('Normal survival builds the gauge while enemies form a barrage, then STOP spends it and exposes the planning state');
  const stoppedTone=await page.locator('#arena').evaluate(canvas=>Array.from(canvas.getContext('2d').getImageData(3,3,1,1).data.slice(0,3)));
  assert.ok(frozenState.timeFx.blend>.25);assert.ok(frozenState.timeFx.enterRemaining>0);assert.ok(stoppedTone.reduce((a,b)=>a+b,0)<normalTone.reduce((a,b)=>a+b,0));
  assert.equal(await page.locator('body').evaluate(body=>body.classList.contains('stopped')),true);
  assert.ok(Number(await page.locator('.arena-wrap').evaluate(el=>getComputedStyle(el,'::after').opacity))>.4);await page.screenshot({path:path.join(artifacts,'hud-time-stop-desktop.png'),fullPage:true});
  record('TIME STOP shock, dimmed field and cyan freeze frame activate without changing frozen world state');
  await page.keyboard.press('KeyC');await charge(page);await page.keyboard.press('Space');frozenState=await state(page);frozen=frozenState.world;
  assert.equal(await page.evaluate(()=>scrollY),0);assert.equal(await page.locator('#time-stop').isDisabled(),true);assert.match(await page.locator('#hint').innerText(),/SPACEキーで実行/);
  assert.deepEqual(await page.locator('.controls kbd').allTextContents(),['Z','X','C','SPACE']);
  await page.mouse.click(commandBox.x+commandBox.width/2,commandBox.y+commandBox.height/2);await page.keyboard.press('Enter');assert.equal((await state(page)).world.phase,'stopped');
  record('SPACE repeat and focused-button defaults cannot double-trigger; PC STOP shows keycaps and SPACE guidance and rejects mouse/Enter EXECUTE');
  const b=frozen.bullets[0];await stroke(page,[frozen.player,b]);let planned=(await state(page)).world;assert.ok(planned.route.danger.length>0);assert.equal(planned.failed,false);assert.equal(await page.locator('#status-action').innerText(),'READY TO EXECUTE');assert.equal(await page.locator('#time-stop').evaluate(button=>button.classList.contains('execute-ready')),true);await page.screenshot({path:path.join(artifacts,'hud-execute-ready-desktop.png'),fullPage:true});
  await page.waitForTimeout(150);assert.deepEqual(physical((await state(page)).world),physical(frozen));
  record('Drawing through an actual frozen bullet gives a red warning without damage or world motion');
  const count=planned.route.points.length;await page.mouse.click((await coords(page,b)).x,(await coords(page,b)).y,{button:'right'});assert.equal((await state(page)).world.route.points.length,count-1);
  await stroke(page,[frozen.player,{x:130,y:540}]);await page.keyboard.press('KeyX');assert.equal((await state(page)).world.route.points.length,1);assert.equal((await state(page)).world.phase,'stopped');assert.equal(await page.locator('#status-action').innerText(),'ROUTE INPUT');
  await stroke(page,[frozen.player,{x:90,y:500},{x:130,y:500}],false);const beforeUndo=(await state(page)).world;await page.keyboard.press('KeyZ');const afterUndo=(await state(page)).world;assert.equal(afterUndo.route.points.length,beforeUndo.route.points.length-1);assert.ok(afterUndo.stopRemaining<=beforeUndo.stopRemaining);assert.equal(afterUndo.gauge,0);assert.equal((await state(page)).drawing,false);await page.mouse.up();assert.equal((await state(page)).world.route.points.length,afterUndo.route.points.length);
  record('Z and right-click remove the last point; X clears the route while STOP and its budget continue, including release of an active drawing gesture');
  await page.keyboard.press('KeyC');await page.waitForTimeout(35);const canceledState=await state(page),canceled=canceledState.world;assert.equal(canceled.phase,'normal');assert.equal(canceled.route,null);assert.ok(canceled.gauge>=60&&canceled.gauge<65);assert.deepEqual(canceled.player,frozen.player);assert.equal(canceled.safetyRemaining,0);assert.ok(canceledState.timeFx.exitRemaining>0&&canceledState.timeFx.blend>0);assert.equal(await page.locator('#time-stop').isDisabled(),true);assert.equal(await page.locator('#status-action').innerText(),'MOVE / EVADE');record('C cancels without moving the cursor/player and preserves the net 40 fee, recharge gate and short visual release');
  await charge(page);await page.keyboard.press('Space');const executionStart=(await state(page)).world;const route=await planSafe(page);
  const expected=(await state(page)).world.route.locks.map(l=>l.enemyId);assert.ok(expected.length>0);await page.evaluate(()=>{window.__done=null;window.__hits=[];window.__runs=[];});
  await page.keyboard.press('Space');assert.equal(await page.locator('#cancel-stop').isDisabled(),true);await page.waitForFunction(()=>window.__done!==null);
  const run=await page.evaluate(()=>({done:window.__done,hits:window.__hits,frames:window.__runs}));assert.deepEqual(run.hits.map(e=>e.enemyId),expected);
  assert.ok(S.distance(run.done.player,route.at(-1))<1);assert.ok(run.done.elapsed<1);for(const frame of run.frames)assert.deepEqual(physical(frame),physical(executionStart));
   assert.ok((await state(page)).world.score>=100);assert.ok((await page.locator('#callout').innerText()).length>0);assert.equal(await page.locator('#tutorial-prompt').isVisible(),false);
  const safety=(await state(page)).world;assert.ok(safety.safetyRemaining>0);assert.equal(safety.failed,false);assert.ok(safety.gauge<10);await page.screenshot({path:path.join(artifacts,'gauge-success-safety-desktop.png'),fullPage:true});record('Safe detour executes in order to the drawn endpoint, keeps the world frozen and grants post-run safety');
  const t=safety.time;await page.waitForTimeout(100);const resumed=(await state(page)).world;assert.ok(resumed.time>t);assert.ok(resumed.gauge>safety.gauge);assert.ok(resumed.safetyRemaining<safety.safetyRemaining);await page.keyboard.press('Space');assert.equal((await state(page)).world.phase,'normal');record('After the run, normal time and recharge resume and a second STOP is gated');
   await charge(page);await page.keyboard.press('Space');const risky=(await state(page)).world;await stroke(page,[risky.player,risky.bullets[0]]);assert.equal((await state(page)).world.failed,false);await page.keyboard.down('Space');await page.waitForFunction(()=>Deadline.inspect().world.failed);await page.keyboard.down('Space');await page.waitForTimeout(100);assert.equal((await state(page)).world.phase,'failed');await page.keyboard.up('Space');assert.equal(await page.locator('#retry').isVisible(),true);assert.match(await page.locator('#retry').innerText(),/SPACE\s+RETRY WAVE 1/);assert.match(await page.locator('#result').innerText(),/GAME OVER[\s\S]*WAVE[\s\S]*SCORE[\s\S]*KILLS[\s\S]*TITLE/);assert.ok((await state(page)).damageFx.remaining>0);assert.ok((await state(page)).audio.plays.damage>=1);await page.keyboard.press('Space');const retriedOpening=(await state(page)).world;assert.equal(retriedOpening.wave,1);assert.equal(retriedOpening.phase,'normal');assert.equal(retriedOpening.gauge,C.waves.retryGaugeInitial);assert.equal(retriedOpening.bullets.length,0);assert.equal(retriedOpening.route,null);assert.ok(retriedOpening.enemies.every(e=>e.alive));assert.equal(await page.locator('#tutorial-prompt').isVisible(),false);record('A risky EXECUTE shows the formal damage result, then retries the same Wave at zero gauge without replaying the tutorial');
   assert.equal(await page.locator('#retry-assist').isVisible(),false);await collideWithEnemy(page);assert.equal((await state(page)).world.waveFailures[0],2);assert.equal(await page.locator('#retry-assist').isVisible(),false);await page.keyboard.press('Space');
   await collideWithEnemy(page);assert.equal((await state(page)).world.waveFailures[0],3);assert.equal(await page.locator('#retry-assist-15').isVisible(),true);assert.equal(await page.locator('#retry-assist-20').isVisible(),false);await page.keyboard.press('Space');assert.equal((await state(page)).world.timeLimitMultiplier,1);
   await collideWithEnemy(page);assert.equal((await state(page)).world.waveFailures[0],4);assert.equal(await page.locator('#retry-assist-15').isVisible(),true);assert.equal(await page.locator('#retry-assist-20').isVisible(),false);await page.keyboard.press('Digit1');let assisted=(await state(page)).world;assert.equal(assisted.gauge,0);assert.equal(assisted.timeLimitMultiplier,1.5);await surviveUntilReady(page);await page.keyboard.press('Space');assert.ok(Math.abs((await state(page)).world.stopRemaining-C.waves.definitions[0].timeStopSeconds*1.5)<.05);await page.keyboard.press('KeyC');
   await collideWithEnemy(page);assert.equal((await state(page)).world.waveFailures[0],5);assert.equal(await page.locator('#retry-assist-15').isVisible(),true);assert.equal(await page.locator('#retry-assist-20').isVisible(),true);await page.screenshot({path:path.join(artifacts,'retry-assistance-desktop.png'),fullPage:true});await page.keyboard.press('Digit2');assisted=(await state(page)).world;assert.equal(assisted.gauge,0);assert.equal(assisted.timeLimitMultiplier,2);await surviveUntilReady(page);await page.keyboard.press('Space');assert.ok(Math.abs((await state(page)).world.stopRemaining-C.waves.definitions[0].timeStopSeconds*2)<.05);await page.keyboard.press('KeyC');record('Failure 3 unlocks optional TIME LIMIT x1.5, failure 5 adds x2.0, while SPACE keeps the standard retry');
  await charge(page);await page.keyboard.press('Space');await page.evaluate(()=>{window.__done=null;});
  await page.waitForFunction(()=>document.body.classList.contains('stop-warning'),{},{timeout:4000});assert.equal(await page.locator('body').evaluate(body=>body.classList.contains('stop-critical')),false);
  await page.waitForFunction(()=>document.body.classList.contains('stop-critical'),{},{timeout:2000});
  await page.waitForFunction(()=>document.body.classList.contains('stop-final'),{},{timeout:1200});record('STOP frame and TIME display escalate at the 2.0, 1.0 and 0.5 second thresholds');
  await page.waitForFunction(()=>window.__done!==null,{},{timeout:1600});const empty=(await state(page)).world;assert.equal(empty.phase,'normal');assert.equal(empty.failed,false);assert.equal(empty.safetyRemaining,0);assert.ok(empty.gauge<5);record('Empty five-second timeout returns normally with the charge consumed and no safety exploit');
  await charge(page);await page.keyboard.press('Space');const timerRoute=await planSafe(page);await page.evaluate(()=>{window.__done=null;});await page.waitForFunction(()=>window.__done!==null,{},{timeout:6500});assert.ok(S.distance((await page.evaluate(()=>window.__done)).player,timerRoute.at(-1))<1);assert.equal((await state(page)).world.failed,false);record('Nonempty five-second timeout automatically executes the edited route without a timeout failure');
  await page.locator('#restart').click();const waveTypes=[
   ['aim','aim','aim'],['aim','aim','aim','aim'],['aim','fan','aim','fan'],['aim','fan','burst','aim','fan'],['aim','fan','burst','rotate','fan'],
   ['aim','fan','burst','rotate','fan','aim'],['aim','fan','burst','aim','fan'],['aim','fan','burst','rotate','aim','fan','burst'],
   ['aim','fan','burst','rotate','fan','rotate','aim','burst'],['aim','fan','burst','rotate','aim','fan','rotate','burst','aim','fan']];
  for(let wave=1;wave<=10;wave++){
   if(wave>1){
     if(wave===7){await page.waitForFunction(()=>Deadline.inspect().world.phase==='rule-preview',{},{timeout:3000});assert.equal(await page.locator('#one-stop-preview').isVisible(),true);assert.match(await page.locator('#one-stop-preview').innerText(),/次のWaveから、1回のTIME STOPで全敵を倒す必要があります/);assert.equal(await page.locator('#preview-perfect').isVisible(),true);await page.screenshot({path:path.join(artifacts,'one-stop-preview-desktop.png'),fullPage:true});await page.keyboard.press('Space');assert.equal((await state(page)).world.phase,'rule-intro');assert.equal(await page.locator('#one-stop-intro').isVisible(),true);assert.match(await page.locator('#one-stop-intro').innerText(),/NEW RULE[\s\S]*1回のTIME STOPで[\s\S]*全敵をロックして撃破せよ/);assert.match(await page.locator('#rule-target-example').innerText(),/TARGETS 5 \/ 5.*SPACE/);await page.screenshot({path:path.join(artifacts,'one-stop-new-rule-desktop.png'),fullPage:true});await page.keyboard.press('Space');}
    await page.waitForFunction(n=>Deadline.inspect().world.phase==='normal'&&Deadline.inspect().world.wave===n,wave,{timeout:3000});
   }
   assert.deepEqual((await state(page)).world.enemies.map(e=>e.pattern),waveTypes[wave-1]);
    if(wave===7){const opening=(await state(page)).world,openingScore=opening.score,openingPlayer=structuredClone(opening.player);await surviveUntilReady(page);await page.keyboard.press('Space');const partial=(await state(page)).world,partialLocks=await planPartial(page);assert.ok(partialLocks>0&&partialLocks<partial.enemies.length);assert.match(await page.locator('#lock-count').innerText(),new RegExp(`${partialLocks} / ${partial.enemies.length}`));await page.keyboard.press('Space');await page.waitForFunction(()=>Deadline.inspect().world.phase==='one-stop-failed');const failedStop=(await state(page)).world;assert.equal(failedStop.wave,wave);assert.equal(failedStop.score,openingScore);assert.equal(await page.locator('#one-stop-result').isVisible(),true);assert.match(await page.locator('#one-stop-result').innerText(),new RegExp(`${partialLocks} / ${partial.enemies.length}`));assert.match(await page.locator('#retry-wave').innerText(),new RegExp(`SPACE\\s+RETRY WAVE ${wave}`));await page.screenshot({path:path.join(artifacts,'one-stop-incomplete-desktop.png'),fullPage:true});await page.keyboard.press('Space');const retry=(await state(page)).world;assert.equal(retry.wave,wave);assert.equal(retry.phase,'normal');assert.equal(retry.gauge,C.waves.retryGaugeInitial);assert.equal(retry.bullets.length,0);assert.equal(retry.route,null);assert.equal(retry.execution,null);assert.ok(retry.enemies.every((e,i)=>e.alive&&e.hp===1&&e.burstRemaining===0&&Math.abs(e.shotRemaining-(C.shooting.firstShotDelay+i*C.shooting.initialStagger))<.02));assert.deepEqual(retry.player,openingPlayer);assert.equal(retry.score,openingScore);await surviveUntilReady(page);}
    else await surviveUntilReady(page);
   await page.keyboard.press('Space');const allRoute=await planWave(page);const locked=await page.locator('#lock-count').innerText();if(wave>=7){assert.equal(locked,`${waveTypes[wave-1].length} / ${waveTypes[wave-1].length}`);assert.equal(await page.locator('#lock-ready').isVisible(),true);}
   if(wave===10)await page.screenshot({path:path.join(artifacts,'wave-10-plan-desktop.png'),fullPage:true});await page.keyboard.press('Space');
   await page.waitForFunction(()=>Deadline.inspect().world.phase==='wave-clear');if(wave===10)await page.waitForTimeout(180);const cleared=(await state(page)).world;assert.equal(cleared.lastKills,waveTypes[wave-1].length);assert.equal(cleared.bullets.length,0);assert.match(await page.locator('#callout').innerText(),wave>=6?/PERFECT EXECUTION/:/ALL CLEAR/);assert.ok(S.distance(cleared.player,allRoute.at(-1))<1);
  }
  await page.waitForFunction(()=>Deadline.inspect().world.phase==='complete',{},{timeout:3000});const completed=(await state(page)).world;assert.equal(completed.score,18400);assert.equal(completed.maxChain,10);assert.equal(completed.perfectExecutions,5);assert.equal(completed.hitsTaken,0);assert.equal(await page.locator('#complete').isVisible(),true);assert.match(await page.locator('#complete').innerText(),/SCORE\s+18400/);
  assert.match(await page.locator('#complete').innerText(),/MISSION COMPLETE[\s\S]*CLEAR TIME[\s\S]*KILLS[\s\S]*TITLE/);assert.equal(completed.totalKills,57);await page.screenshot({path:path.join(artifacts,'wave-10-complete-desktop.png'),fullPage:true});await page.locator('#game-clear-title').click();assert.equal(await page.locator('#title-screen').isVisible(),true);assert.equal((await state(page)).titleActive,true);record('Ten live Waves teach four barrages, explain ONE STOP, retry an incomplete Wave 7, climax at the formal MISSION COMPLETE and return to TITLE');
   const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const phone=await context.newPage();hook(phone);await phone.goto(base+'?debug');await phone.waitForLoadState('networkidle');await observe(phone);await phone.waitForTimeout(700);await phone.screenshot({path:path.join(artifacts,'title-mobile-390x844.png')});await enterGame(phone,true);const cdp=await context.newCDPSession(phone);
  await charge(phone,true,cdp);await phone.locator('#time-stop').tap();const phoneStart=(await state(phone)).world;
   await touch(cdp,phone,[phoneStart.player,phoneStart.bullets[0]]);assert.equal((await state(phone)).world.failed,false);assert.ok((await state(phone)).world.route.danger.length>0);await phone.locator('#undo-route').tap();await touch(cdp,phone,[phoneStart.player,{x:130,y:540}]);await phone.waitForFunction(()=>!document.getElementById('clear-route').disabled);await phone.locator('#clear-route').tap();await phone.waitForFunction(()=>Deadline.inspect().world.route.points.length===1);
  await phone.waitForTimeout(40);await phone.screenshot({path:path.join(artifacts,'gauge-controls-mobile.png'),fullPage:true});await phone.locator('#cancel-stop').tap();assert.ok((await state(phone)).world.gauge>=60);record('Touch can charge, STOP, draw a risky plan, Undo, Clear and cancel with a fee');
  await charge(phone,true,cdp);await phone.locator('#time-stop').tap();const mobileRoute=await planSafe(phone,true,cdp);await phone.screenshot({path:path.join(artifacts,'gauge-route-mobile.png'),fullPage:true});await phone.locator('#time-stop').tap();await phone.waitForFunction(()=>window.__done!==null);assert.ok(S.distance((await phone.evaluate(()=>window.__done)).player,mobileRoute.at(-1))<1);assert.equal((await state(phone)).world.failed,false);assert.equal(await phone.evaluate(()=>scrollY),0);record('Touch executes a safe barrage route to its endpoint with no unintended scrolling');
   await charge(phone,true,cdp);await phone.locator('#time-stop').tap();const hybridBox=await phone.locator('#time-stop').boundingBox();assert.equal(await phone.locator('#time-stop').isDisabled(),false);
   await phone.mouse.click(hybridBox.x+hybridBox.width/2,hybridBox.y+hybridBox.height/2);assert.equal((await state(phone)).world.phase,'stopped');assert.equal(await phone.locator('#time-stop').isDisabled(),false);assert.match(await phone.locator('#hint').innerText(),/EXECUTE/);
   assert.ok((await state(phone)).world.stopRemaining>3);await phone.touchscreen.tap(hybridBox.x+hybridBox.width/2,hybridBox.y+hybridBox.height/2);assert.equal((await state(phone)).world.phase,'normal');
   record('On a touch-capable viewport a mouse cannot EXECUTE; a subsequent real touch switches the controls back and can EXECUTE');
   await charge(phone,true,cdp);await phone.locator('#time-stop').tap();const touchRisk=(await state(phone)).world;await touch(cdp,phone,[touchRisk.player,touchRisk.bullets[0]]);await phone.locator('#time-stop').tap();await phone.waitForFunction(()=>Deadline.inspect().world.failed);assert.match(await phone.locator('#retry').innerText(),/RETRY WAVE 1/);await phone.locator('#retry').tap();const touchRetry=(await state(phone)).world;assert.equal(touchRetry.wave,1);assert.equal(touchRetry.phase,'normal');assert.equal(touchRetry.gauge,C.waves.retryGaugeInitial);assert.equal(touchRetry.bullets.length,0);record('Touch retry restores the failed Wave at zero gauge with no bullets or stale route state');
   await collideWithEnemy(phone,true,cdp);await phone.locator('#retry').tap();await collideWithEnemy(phone,true,cdp);assert.equal((await state(phone)).world.waveFailures[0],3);assert.equal(await phone.locator('#retry-assist-15').isVisible(),true);await phone.locator('#retry-assist-15').tap();assert.equal((await state(phone)).world.timeLimitMultiplier,1.5);assert.equal((await state(phone)).world.gauge,0);record('Touch can choose the optional x1.5 time limit from the stopped retry screen');
  for(const viewport of [{width:844,height:390},{width:320,height:800},{width:360,height:800},{width:768,height:800}]){await phone.setViewportSize(viewport);await phone.waitForTimeout(60);assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);const targets=await phone.locator('.controls button').evaluateAll(buttons=>buttons.map(button=>button.getBoundingClientRect().height));assert.ok(targets.every(height=>height>=44));assert.equal(await phone.locator('#status-action').isVisible(),true);assert.equal(await phone.locator('#stop-gauge').isVisible(),true);}record('Landscape and 320 / 360 / 768px layouts retain 44px touch controls and a visible status/gauge without horizontal overflow');await context.close();
  const hudWide=await browser.newPage({viewport:{width:1280,height:720}});hook(hudWide);await hudWide.goto(base+'?debug');await hudWide.waitForLoadState('networkidle');await enterGame(hudWide);assert.equal(await hudWide.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await hudWide.locator('.controls').evaluate(element=>element.getBoundingClientRect().bottom<=innerHeight),true);await hudWide.screenshot({path:path.join(artifacts,'hud-normal-1280x720.png'),fullPage:true});await hudWide.close();record('The 1280 x 720 game HUD and one-row command bar remain inside the viewport without horizontal overflow');
  const titleResponsive=await browser.newPage({viewport:{width:1280,height:720}});hook(titleResponsive);for(const viewport of [{width:1280,height:720,name:'title-desktop-16x9.png'},{width:844,height:390,name:'title-mobile-landscape.png'},{width:320,height:800,name:'title-mobile-320.png'},{width:360,height:800,name:'title-mobile-360.png'},{width:768,height:800,name:'title-tablet-768.png'}]){await titleResponsive.setViewportSize(viewport);await titleResponsive.goto(base);await titleResponsive.waitForLoadState('networkidle');await titleResponsive.waitForTimeout(700);const logoBox=await titleResponsive.locator('.title-logo').boundingBox();assert.ok(logoBox.width<=viewport.width-24&&logoBox.height<=viewport.height*.5);assert.ok(Math.abs(logoBox.width/logoBox.height-2172/724)<.02);assert.equal(await titleResponsive.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight),true);await titleResponsive.screenshot({path:path.join(artifacts,viewport.name)});}await titleResponsive.close();record('Title logo keeps its aspect ratio and margins at 16:9, landscape, 320, 360 and 768px');
  const reducedTitle=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});hook(reducedTitle);await reducedTitle.goto(base+'?debug');await reducedTitle.waitForLoadState('networkidle');assert.equal(await reducedTitle.locator('.title-logo').evaluate(element=>getComputedStyle(element).animationName),'none');await reducedTitle.keyboard.press('Space');await reducedTitle.waitForFunction(()=>document.getElementById('title-screen').hidden);assert.equal((await state(reducedTitle)).titleActive,false);assert.equal((await state(reducedTitle)).briefingActive,true);await reducedTitle.locator('#briefing-skip').click();await reducedTitle.waitForFunction(()=>document.getElementById('briefing-screen').hidden);await reducedTitle.close();record('Reduced motion shows the logo and static BRIEFING immediately and can begin without transition delay');
  const routeVisual=await browser.newPage({viewport:{width:1280,height:900}});hook(routeVisual);await routeVisual.goto(base+'?debug');await routeVisual.waitForLoadState('networkidle');await observe(routeVisual);await enterGame(routeVisual);
  await routeVisual.evaluate(()=>{Deadline.config.gauge.initial=100;Deadline.config.waves.definitions[0].timeStopSeconds=8;document.getElementById('restart').click();});await routeVisual.keyboard.press('Space');
  await routeVisual.waitForFunction(()=>Deadline.inspect().world.phase==='stopped'&&Deadline.inspect().timeFx.blend===1);const visualOpening=(await state(routeVisual)).world;
  await move(routeVisual,visualOpening.player);await routeVisual.mouse.down();await move(routeVisual,visualOpening.enemies[0],12);await routeVisual.waitForFunction(()=>Deadline.inspect().world.route.locks.length===1);assert.equal(await routeVisual.locator('#status-action').innerText(),'DRAW ROUTE');
  let routeVisualState=await state(routeVisual);assert.equal(routeVisualState.drawing,true);assert.equal(routeVisualState.routeFx.drawing,true);assert.equal(routeVisualState.routeFx.lockFlashes.at(-1).enemyId,routeVisualState.world.route.locks[0].enemyId);
  await move(routeVisual,visualOpening.enemies[1],12);await routeVisual.waitForFunction(()=>Deadline.inspect().world.route.locks.length===2);routeVisualState=await state(routeVisual);assert.ok(routeVisualState.routeFx.lockFlashes.every(flash=>routeVisualState.world.route.locks.some(lock=>lock.enemyId===flash.enemyId)));
  await routeVisual.locator('#arena').screenshot({path:path.join(artifacts,'route-drawing-multi-lock.png')});await move(routeVisual,{x:800,y:520},10);await routeVisual.mouse.up();await routeVisual.waitForTimeout(260);
  routeVisualState=await state(routeVisual);assert.equal(routeVisualState.drawing,false);assert.equal(routeVisualState.routeFx.drawing,false);assert.equal(routeVisualState.world.route.locks.length,2);assert.equal(routeVisualState.routeFx.lockFlashes.length,0);
  await routeVisual.locator('#arena').screenshot({path:path.join(artifacts,'route-ready-execute.png')});await routeVisual.keyboard.press('Space');await routeVisual.waitForFunction(()=>Deadline.inspect().world.phase==='normal'&&Deadline.inspect().world.route===null);assert.equal((await state(routeVisual)).world.enemies.filter(enemy=>enemy.alive).length,1);await routeVisual.close();
  record('Live Chrome drawing shows an active tip, locks two enemies through the simulation event, retains both targets before EXECUTE and completes the same route');
  const visual=await browser.newPage({viewport:{width:1280,height:900}});hook(visual);await visual.goto(base+'?debug');await visual.waitForLoadState('networkidle');await observe(visual);await enterGame(visual);await charge(visual);
  await visual.locator('#arena').screenshot({path:path.join(artifacts,'time-stop-compare-1-normal.png'),animations:'disabled'});await visual.evaluate(()=>{Deadline.config.waves.definitions[0].timeStopSeconds=7;});await visual.keyboard.press('Space');
  await visual.waitForTimeout(70);await visual.locator('#arena').screenshot({path:path.join(artifacts,'time-stop-compare-2-entry.png'),animations:'disabled'});await visual.waitForTimeout(260);await visual.locator('#arena').screenshot({path:path.join(artifacts,'time-stop-compare-3-stable.png'),animations:'disabled'});
  await visual.waitForFunction(()=>Deadline.inspect().world.stopRemaining<.9);await visual.locator('#arena').screenshot({path:path.join(artifacts,'time-stop-compare-4-warning.png'),animations:'disabled'});await visual.keyboard.press('KeyC');await visual.waitForTimeout(55);await visual.locator('#arena').screenshot({path:path.join(artifacts,'time-stop-compare-5-release.png'),animations:'disabled'});await visual.close();record('Five field-only screenshots distinguish normal, entry, stable STOP, final warning and release without relying on TIME text');
  const local=await browser.newPage({reducedMotion:'reduce'});hook(local);const requests=[];local.on('request',r=>requests.push(r.url()));await local.goto('file://'+path.join(__dirname,'..','index.html').replace(/\\/g,'/'));await local.waitForLoadState('load');assert.equal(await local.locator('#title-screen').isVisible(),true);assert.equal(await local.locator('.title-logo').evaluate(image=>image.complete&&image.naturalWidth===2172),true);assert.equal(await local.locator('#debug').isVisible(),false);assert.equal(await local.evaluate(()=>typeof Deadline.inspect),'undefined');assert.ok(requests.every(url=>url.startsWith('file:')||url.startsWith('data:')));record('Static-file launch loads the local logo without external dependencies and hides debug mode');
  assert.deepEqual(errors,[]);record('No Chrome console errors or uncaught exceptions');fs.writeFileSync(path.join(artifacts,'browser-results.json'),JSON.stringify({browser:browser.version(),results,errors,realMobileDevice:false},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
