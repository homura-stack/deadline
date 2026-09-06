/* Mandatory every-task routes A-E: title entry, original training, campaign entry and reading panels. */
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {state,begin,plan}=require('./tutorial-helpers.cjs'),{battleReady}=require('./journey-helpers.cjs');
const {assertTitleComposition}=require('./title-helpers.cjs');
const base=process.env.DEADLINE_TEST_URL||'http://127.0.0.1:4186/';
const out=path.join(__dirname,'artifacts','title-routes');fs.mkdirSync(out,{recursive:true});
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],external=[],oldArt=[],report={browser:browser.version(),routes:{},layouts:[]};
  async function open(saved='completed',viewport={width:1920,height:1080}){
    const page=await browser.newPage({viewport});
    page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    page.on('requestfailed',r=>errors.push(r.url()));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    page.on('request',r=>{if(!r.url().startsWith(new URL(base).origin)&&!r.url().startsWith('data:'))external.push(r.url());if(/\/(pico\.png|title-art\.js)$/.test(r.url()))oldArt.push(r.url());});
    if(saved)await page.addInitScript(value=>localStorage.setItem('deadline.tutorial.v1',value),saved);
    await page.goto(base+'?debug');await page.waitForLoadState('networkidle');return page;
  }
  async function map(page){await page.waitForFunction(()=>Deadline.inspect().journey.mode==='map'&&!Deadline.inspect().practice.active);}
  async function garden(page){await page.locator('#map-enter').click();await battleReady(page);const s=await state(page);assert.equal(s.world.wave,1);assert.equal(s.world.score,0);assert.equal(s.world.life,1);}
  try{
    const page=await open();await assertTitleComposition(page,{width:1920,height:1080});await page.screenshot({path:path.join(out,'title-1920.png')});
    // A uses real input through the E.1 rehearsal; never inject a completion or rewrite its world.
    await page.locator('#title-training-launch').click();await begin(page);await plan(page);await page.keyboard.press('Space');
    await page.waitForFunction(()=>Deadline.inspect().practice.step==='complete');await page.screenshot({path:path.join(out,'training-complete.png')});await map(page);await garden(page);
    report.routes.A='TITLE -> TRAINING -> completed -> WORLD MAP -> GARDEN';
    const pico=await page.evaluate(()=>{const e=Deadline.characters.entries.pico;return {file:e.file,width:e.width,anchorX:e.anchorX,anchorY:e.anchorY,status:e.status};});
    assert.deepEqual(pico,{file:'pico-final.png',width:48,anchorX:.56,anchorY:.47,status:'ready'});report.pico=pico;
    await page.reload();await page.waitForLoadState('networkidle');await page.locator('#title-start').click();
    await page.waitForFunction(()=>!Deadline.inspect().titleActive);assert.equal((await state(page)).briefingActive,true,'completed START also enters training');
    assert.equal(await page.locator('#world-map').isVisible(),false);await begin(page);await plan(page);await page.keyboard.press('Space');
    await map(page);await garden(page);report.routes.B='completed TITLE -> START -> TRAINING -> completed -> WORLD MAP -> GARDEN';
    for(const [route,name]of[['C','how'],['D','settings'],['E','credits']]){
      await page.reload();await page.waitForLoadState('networkidle');const before=(await state(page)).world;
      await page.locator(`[data-title-info="${name}"]`).click();assert.equal(await page.locator('#title-'+name).isVisible(),true);
      assert.deepEqual((await state(page)).world,before);assert.equal((await state(page)).titleActive,true);
      if(name==='settings'){await page.locator('#master-volume').fill('37');await page.locator('#sfx-volume').fill('64');await page.locator('#setting-mute').click();}
      await page.screenshot({path:path.join(out,name+'.png')});await page.locator(`[data-title-close="${name}"]`).click();
      assert.equal(await page.locator('#title-'+name).isVisible(),false);assert.equal(await page.locator('#title-training-launch').isVisible(),true);
      assert.equal(await page.evaluate(()=>document.activeElement.dataset.titleInfo),name);
      await page.locator(`[data-title-info="${name}"]`).click();await page.keyboard.press('Escape');assert.equal(await page.locator('#title-'+name).isVisible(),false);
      report.routes[route]=`TITLE -> ${name.toUpperCase()} -> TITLE (back button / Escape)`;
    }
    await page.reload();await page.waitForLoadState('networkidle');assert.equal(await page.locator('#master-volume').inputValue(),'37');assert.equal(await page.locator('#sfx-volume').inputValue(),'64');assert.equal(await page.locator('#setting-mute').getAttribute('aria-pressed'),'true');
    for(const viewport of [{width:1920,height:1080},{width:2560,height:1440},{width:1366,height:768},{width:1280,height:720},{width:2560,height:1080},{width:1024,height:768},{width:768,height:800},{width:390,height:844},{width:320,height:800},{width:844,height:390}]){
      await page.setViewportSize(viewport);await assertTitleComposition(page,viewport);await page.screenshot({path:path.join(out,`title-${viewport.width}x${viewport.height}.png`)});
      for(const name of ['how','settings','credits']){
        await page.locator(`[data-title-info="${name}"]`).click();const box=await page.locator('#title-'+name).boundingBox();
        assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width&&box.y+box.height<=viewport.height,`${name} at ${viewport.width}x${viewport.height}`);
        await page.locator(`[data-title-close="${name}"]`).click();
      }
      report.layouts.push(viewport);
    }
    await page.close();
    // G.1 supersedes the optional choice: fresh START completes the real rehearsal first.
    const fresh=await open(null);await fresh.locator('#title-start').click();await fresh.waitForFunction(()=>Deadline.inspect().briefingActive);await begin(fresh);await plan(fresh);await fresh.keyboard.press('Space');await map(fresh);await garden(fresh);await fresh.close();report.firstStart='START -> TRAINING -> completed -> MAP -> GARDEN';
    const digest=crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..','assets/title/pico-dead-circuit-original.jpeg'))).digest('hex');assert.equal(digest,'db3cae82f0fde61644714aa92e2cadef661407e8d58acd40f0a99f15fc4df592');report.backgroundSHA256=digest;
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(oldArt,[]);report.errors=errors;report.externalRequests=external;
    // Isolated negative case: the title still has its name and working buttons if just its JPG fails.
    const failed=await browser.newPage({viewport:{width:1366,height:768}}),pageErrors=[];failed.on('pageerror',e=>pageErrors.push(String(e)));
    await failed.route('**/assets/title/pico-dead-circuit-original.jpeg',r=>r.abort());await failed.goto(base+'?debug');await failed.waitForLoadState('networkidle');
    assert.equal(await failed.locator('#title-screen').evaluate(e=>e.classList.contains('title-background-failed')),true);assert.equal(await failed.locator('.title-heading').evaluate(e=>getComputedStyle(e).clipPath),'none');
    await failed.locator('#title-training-launch').click();assert.equal((await state(failed)).briefingActive,true);assert.deepEqual(pageErrors,[]);await failed.close();report.imageFailureFallback='name + TRAINING usable; expected JPG request failure isolated';
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log('PASS mandatory routes A-E, mandatory fresh completion, unchanged Pico, ten resized layouts, title asset integrity, errors 0 and image failure fallback');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
