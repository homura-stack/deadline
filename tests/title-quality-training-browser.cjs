/* G.1 quality / G.2 START routing: completed saves bypass rehearsal; TRAINING remains replayable. */
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {state,begin,plan}=require('./tutorial-helpers.cjs');
const base=process.env.DEADLINE_TEST_URL||'http://127.0.0.1:4186/';
const out=path.join(__dirname,'artifacts','task-g2');fs.mkdirSync(out,{recursive:true});
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],report={browser:browser.version(),cases:{},layouts:[]};
  async function open(saved=null){
    const p=await browser.newPage({viewport:{width:1920,height:1080}});
    p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    p.on('requestfailed',r=>errors.push(r.url()));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    await p.goto(base+'?debug');
    // An isolated browser profile only: never clear the user's actual game data.
    if(saved){await p.evaluate(value=>localStorage.setItem('deadline.tutorial.v1',value),saved);await p.reload();}
    await p.waitForLoadState('networkidle');return p;
  }
  async function start(p,completed=false){
    await p.locator('#title-start').click();await p.waitForFunction(()=>!Deadline.inspect().titleActive);
    const s=await state(p);assert.equal(s.briefingActive,!completed,'completed START alone bypasses TRAINING');
    if(completed){await map(p);assert.equal(await p.locator('#world-map').isVisible(),true);}else{assert.equal(s.briefingPage,0);assert.equal(await p.locator('#world-map').isVisible(),false);}
  }
  async function map(p){await p.waitForFunction(()=>Deadline.inspect().journey.mode==='map'&&!Deadline.inspect().practice.active);}
  async function complete(p){await begin(p);await plan(p);await p.keyboard.press('Space');await p.waitForFunction(()=>Deadline.inspect().practice.step==='complete');await map(p);assert.equal(await p.evaluate(()=>localStorage.getItem('deadline.tutorial.v1')),'completed');}
  try{
    const p=await open();assert.equal(await p.evaluate(()=>localStorage.getItem('deadline.tutorial.v1')),null);
    await start(p);assert.equal((await state(p)).briefingActive,true,'fresh START must enter TRAINING directly');
    assert.equal(await p.evaluate(()=>localStorage.getItem('deadline.tutorial.v1')),null,'START is not completion');
    assert.equal(await p.locator('#first-skip').count(),0,'no first-play skip to MAP');
    assert.match(await p.locator('#briefing-skip').innerText(),/TITLE/);
    await p.locator('#briefing-skip').click();assert.equal((await state(p)).titleActive,true,'aborting briefing returns TITLE');
    await start(p);await begin(p);await p.keyboard.press('KeyR');assert.equal((await state(p)).practice.step,'move');
    await p.locator('#practice-exit').click();assert.equal((await state(p)).titleActive,true,'aborting rehearsal cannot unlock MAP');
    assert.equal(await p.evaluate(()=>localStorage.getItem('deadline.tutorial.v1')),null);
    await p.reload();await p.waitForLoadState('networkidle');await start(p);await complete(p);
    report.cases.A='fresh START -> TRAINING; briefing/practice abort and reload stay incomplete; actual completion -> MAP';
    await p.locator('#map-title').click();await start(p,true);
    await p.locator('#map-title').click();await p.reload();await p.waitForLoadState('networkidle');await start(p,true);
    report.cases.B='completed START -> WORLD MAP directly, including reload';
    await p.locator('#map-title').click();await p.locator('#title-training-launch').click();await complete(p);
    await p.locator('#map-training').click();await p.locator('#briefing-skip').click();await map(p);
    report.cases.C='permanent TRAINING -> actual completion -> MAP; MAP replay/exit preserved';
    await p.locator('#map-title').click();
    for(const viewport of [{width:1920,height:1080},{width:2560,height:1440},{width:1366,height:768},{width:3840,height:2160}]){
      await p.setViewportSize(viewport);
      const quality=await p.locator('#title-art').evaluate(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {natural:[e.naturalWidth,e.naturalHeight],render:[r.width,r.height],scale:r.width/e.naturalWidth,tag:e.tagName,fit:s.objectFit,position:s.objectPosition,imageRendering:s.imageRendering,filter:s.filter,transform:s.transform,opacity:s.opacity,src:e.currentSrc};});
      assert.deepEqual(quality.natural,[1678,937]);assert.ok(quality.scale<=1,'do not upscale beyond source size');assert.equal(quality.tag,'IMG');assert.equal(quality.fit,'contain');assert.equal(quality.filter,'none');assert.equal(quality.transform,'none');assert.equal(quality.opacity,'1');
      report.layouts.push({viewport,...quality});await p.screenshot({path:path.join(out,`after-${viewport.width}.png`)});
    }
    const title=fs.readFileSync(path.join(__dirname,'..','assets/title/title.png'));
    report.sourceSHA256=crypto.createHash('sha256').update(title).digest('hex');assert.equal(report.sourceSHA256,'5aab8b499f8ea84c645348cbdd9a06095f6b20f8305c2adbf5fa5f91a4fd65b9');assert.equal(title.length,1787537);
    report.cases.D='official 1678 x 937 PNG bytes, contain, no CSS blur/transform/opacity, source-size cap';
    // Clearing the existing key behaves as first play again; regular restart does not clear it.
    await p.evaluate(()=>localStorage.removeItem('deadline.tutorial.v1'));await p.reload();await p.waitForLoadState('networkidle');await start(p);assert.equal((await state(p)).briefingActive,true);await p.close();
    for(const saved of ['started','skipped']){
      const legacy=await open(saved);await start(legacy);assert.equal((await state(legacy)).briefingActive,true,saved+' is not completed');
      await legacy.locator('#briefing-skip').click();assert.equal((await state(legacy)).titleActive,true);assert.equal(await legacy.evaluate(()=>localStorage.getItem('deadline.tutorial.v1')),saved);
      await start(legacy);await complete(legacy);await legacy.reload();await legacy.waitForLoadState('networkidle');await start(legacy,true);await legacy.close();
    }
    assert.deepEqual(errors,[]);report.errors=errors;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log('PASS G.2 START cases A-C, completed/legacy saves, abort/reload, replay, unchanged title quality; errors 0');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
