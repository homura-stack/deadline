'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {assertTitleComposition,overlap}=require('./title-helpers.cjs');
const {visitCompleted,initialMap}=require('./journey-helpers.cjs');
const base=process.env.DEADLINE_TEST_URL||'http://127.0.0.1:4186/';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),report={layouts:[],overlaps:[],errors:[]},out=path.join(__dirname,'artifacts','task-o');fs.mkdirSync(out,{recursive:true});
 try{
  for(const [file,sha]of [['title.png','5aab8b499f8ea84c645348cbdd9a06095f6b20f8305c2adbf5fa5f91a4fd65b9'],['logo.png','c53c85065ee3b42c381922b7d1b364966710a47db133eee26eaea8ee941ecc5c']])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../assets/title',file))).digest('hex'),sha);
  for(const touch of [false,true]){
   const size=touch?{width:390,height:844}:{width:1920,height:1080};
   const p=await browser.newPage({viewport:size,isMobile:touch,hasTouch:touch});p.on('pageerror',e=>report.errors.push(String(e)));
   await visitCompleted(p,base+'?debug');await p.waitForLoadState('networkidle');
   await assertTitleComposition(p,size);assert.equal(await p.locator('#title-screen img').count(),1);
   await p.screenshot({path:path.join(out,`title-${touch?'touch':'pc'}.png`)});
   if(touch)await p.locator('#title-start').tap();else await p.locator('#title-start').click();await initialMap(p);
   assert.equal(await p.locator('.world-pico').getAttribute('data-location'),'0');
   await p.waitForFunction(()=>document.querySelector('.world-pico img').naturalWidth===1295);
   assert.equal(await p.locator('.world-pico-hover').evaluate(e=>getComputedStyle(e).animationName),'map-pico-hover');
   await p.locator('[data-area="2"]').click();assert.equal(await p.locator('.world-pico').getAttribute('data-location'),'0');
   // Render-only fixtures exercise every progress position without granting real progress or touching saves.
   await p.evaluate(()=>{window.oState={...Deadline.journey.create(),mode:'map',elapsed:4};window.oView=new Deadline.WorldMapView(document.querySelector('#map-board'),i=>{oState.selected=i;oView.render(oState);});});
   await p.waitForFunction(()=>document.querySelector('.world-pico img').naturalWidth===1295);
   const layers=await p.evaluate(()=>Object.fromEntries(['.world-pico','.world-diagram','.map-node'].map(selector=>[selector,Number(getComputedStyle(document.querySelector(selector)).zIndex)])));
   assert.ok(layers['.world-pico']>=layers['.world-diagram']&&layers['.world-pico']<layers['.map-node'],'Pico must render above restored artwork and below AREA labels');
   for(const viewport of touch?[size]:[{width:1920,height:1080},{width:1366,height:768},{width:960,height:720},{width:600,height:900},{width:500,height:844},{width:375,height:812},{width:320,height:740},{width:844,height:390}]){
    await p.setViewportSize(viewport);
    for(let restored=0;restored<=5;restored++){
     const geometry=await p.evaluate(restored=>{
      oState.restored=restored;oState.selected=0;const before=JSON.stringify(oState);oView.render(oState);oView.animate(oState,false);
      const box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
      return{unchanged:before===JSON.stringify(oState),location:oView.pico.dataset.location,pico:box(oView.pico),labels:[...document.querySelectorAll('#map-board .map-node-label')].map(box),cities:[...document.querySelectorAll('#map-board .city-node')].map(box),overflow:document.documentElement.scrollWidth>innerWidth};
     },restored);
     report.layouts.push({viewport,restored,...geometry});
     assert.ok(geometry.unchanged);assert.equal(geometry.location,String(Math.min(4,restored)));assert.equal(geometry.overflow,false);
     assert.ok(geometry.pico.width>=44&&geometry.pico.width<=68);assert.ok(geometry.pico.x>=0&&geometry.pico.x+geometry.pico.width<=viewport.width);
     for(const [index,b]of [...geometry.labels,...geometry.cities].entries())if(overlap(geometry.pico,b))report.overlaps.push({width:viewport.width,restored,index});
    }
    await p.screenshot({path:path.join(out,`map-${viewport.width}.png`),fullPage:true});
   }
   await p.evaluate(()=>{oState.restored=2;oState.selected=2;oView.render(oState);});
   if(touch)await p.locator('[data-area="0"]').tap();else await p.locator('[data-area="0"]').click();
   assert.equal(await p.locator('.world-pico').getAttribute('data-location'),'2');assert.equal(await p.locator('[data-area="0"]').getAttribute('aria-pressed'),'true');
   await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.locator('.world-pico-hover').evaluate(e=>getComputedStyle(e).animationName),'none');
   assert.notEqual(await p.locator('.world-pico img').evaluate(e=>getComputedStyle(e).filter),'none');
   await p.reload();await p.waitForLoadState('networkidle');await p.locator('#title-start').click();await initialMap(p);
   assert.equal(await p.locator('.world-pico').getAttribute('data-location'),'0','render-only fixtures never change the saved campaign checkpoint');
   assert.equal(await p.evaluate(()=>localStorage.getItem('deadline.tutorial.v1')),'completed');await p.close();
  }
  const failed=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});failed.on('pageerror',e=>report.errors.push(String(e)));
  await failed.route('**/assets/title/title.png',r=>r.abort());await failed.route('**/assets/characters/pico-final.png',r=>r.abort());
  await visitCompleted(failed,base+'?debug');await failed.waitForLoadState('networkidle');assert.equal(await failed.locator('#title-screen').evaluate(e=>e.classList.contains('title-background-failed')),true);
  await failed.locator('#title-start').tap();await initialMap(failed);assert.equal(await failed.locator('.world-pico-fallback').isVisible(),true);
  await failed.locator('#map-enter').tap();await failed.waitForFunction(()=>Deadline.inspect().journey.mode==='battle');assert.equal(await failed.locator('#arena').isVisible(),true);
  // No safe supplied HUD crop: retain the existing minimal wordmark, not a generated replacement.
  assert.equal(await failed.locator('#game-shell .masthead-logo').getAttribute('aria-label'),'DEAD/LINE');assert.equal(await failed.locator('#game-shell .masthead-logo img').count(),0);
  await failed.close();assert.deepEqual(report.errors,[]);assert.deepEqual(report.overlaps,[],'Pico must not obscure AREA labels or nodes');
  console.log('PASS TASK O official title, responsive non-overlap, current vs selected Pico, all locations, unchanged reload semantics, reduced motion, touch controls, image failures and HUD hold');
 }finally{fs.writeFileSync(path.join(out,'official-visual.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
