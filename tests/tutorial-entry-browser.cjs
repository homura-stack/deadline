/* F.1 regression: saved FIRST FLIGHT choices must not hide the visible training entrance. */
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {state,begin,plan}=require('./tutorial-helpers.cjs');
const {battleReady}=require('./journey-helpers.cjs');
const base=process.env.DEADLINE_TEST_URL||'http://127.0.0.1:4186/';
const out=path.join(__dirname,'artifacts','task-f1');fs.mkdirSync(out,{recursive:true});
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],requests=[],report={browser:browser.version(),preferences:[],layouts:[]};
  async function open(saved,viewport={width:1920,height:1080}){
    const page=await browser.newPage({viewport});
    page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    page.on('requestfailed',r=>errors.push(r.url()));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    page.on('request',r=>requests.push(r.url()));
    if(saved)await page.addInitScript(value=>localStorage.setItem('deadline.tutorial.v1',value),saved);
    await page.goto(base+'?debug');await page.waitForLoadState('networkidle');return page;
  }
  async function map(page){await page.waitForFunction(()=>Deadline.inspect().journey.mode==='map'&&!Deadline.inspect().practice.active);}
  try{
    for(const saved of ['completed','started','skipped',null]){
      const page=await open(saved),button=page.locator('#title-training-launch');
      assert.equal(await page.locator('#title-how').isVisible(),false);
      assert.equal(await button.isVisible(),true,'TRAINING must be visible without opening HOW TO PLAY, even with a saved choice');
      await button.focus();await page.keyboard.press(saved==='started'?'Space':'Enter');
      await page.waitForFunction(()=>Deadline.inspect().briefingActive);
      assert.equal((await state(page)).briefingPage,0,'native activation opens page 1 without leaking into NEXT');
      assert.equal(await page.locator('#briefing-screen').isVisible(),true);
      assert.deepEqual(await page.locator('.demo-pico-sprite').evaluateAll(xs=>xs.map(x=>x.getAttribute('href'))),Array(4).fill('assets/characters/pico-final.png'));
      if(saved==='completed'){
        await page.screenshot({path:path.join(out,'recovered-training.png')});
        await begin(page);await plan(page);await page.screenshot({path:path.join(out,'recovered-practice.png')});
        await page.keyboard.press('Space');await page.waitForFunction(()=>Deadline.inspect().practice.step==='complete');await map(page);
        await page.locator('#map-enter').click();await battleReady(page);
        const normal=await state(page);assert.equal(normal.world.wave,1);assert.equal(normal.world.score,0);assert.equal(normal.world.life,1);
        const pico=await page.evaluate(()=>{const e=Deadline.characters.entries.pico;return {file:e.file,status:e.status,width:e.width,height:e.height,anchorX:e.anchorX,anchorY:e.anchorY};});
        assert.deepEqual(pico,{file:'pico-final.png',status:'ready',width:48,height:48*1214/1295,anchorX:.56,anchorY:.47});report.pico=pico;
        await page.screenshot({path:path.join(out,'garden.png')});
      }else{await page.locator('#briefing-skip').click();assert.equal((await state(page)).titleActive,true);}
      await page.reload();await page.waitForLoadState('networkidle');await page.locator('#title-start').click();await page.waitForFunction(()=>!Deadline.inspect().titleActive);
      if(saved==='completed')await map(page);else assert.equal((await state(page)).briefingActive,true,'uncompleted START requires training');
      report.preferences.push({saved,directTraining:true,normalStart:saved==='completed'?'WORLD MAP':'TRAINING'});await page.close();
    }
    for(const viewport of [{width:1920,height:1080},{width:1280,height:720},{width:768,height:800},{width:390,height:844},{width:320,height:800},{width:844,height:390}]){
      const page=await open('completed',viewport);
      for(const selector of ['#title-start','#title-training-launch','[data-title-info="how"]']){
        const box=await page.locator(selector).boundingBox();assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width&&box.y+box.height<=viewport.height,`${selector} inside ${viewport.width}x${viewport.height}`);
        if(selector==='#title-training-launch')assert.ok(box.height>=44);
      }
      await page.screenshot({path:path.join(out,`title-${viewport.width}x${viewport.height}.png`)});
      await page.locator('#title-training-launch').click();assert.equal((await state(page)).briefingActive,true);report.layouts.push(viewport);await page.close();
    }
    assert.equal(requests.some(url=>url.endsWith('/assets/characters/pico.png')),false);assert.deepEqual(errors,[]);
    report.errors=errors;fs.writeFileSync(path.join(out,'entry-regression.json'),JSON.stringify(report,null,2));
    console.log('PASS F.1: visible TITLE -> TRAINING for all saved states; legacy practice -> MAP -> Garden; normal START preserved; final Pico unchanged; six layouts; errors 0');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
