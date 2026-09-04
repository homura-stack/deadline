/* Focused touch-Chrome pass for SETTINGS -> BRIEFING -> tutorial -> result -> retry. */
'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict'), path = require('node:path');
const base = process.env.DEADLINE_TEST_URL || 'http://127.0.0.1:4186/';
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(base+'?debug');await page.waitForLoadState('networkidle');
    await page.locator('[data-title-info="settings"]').tap();await page.locator('#master-volume').fill('72');await page.locator('#sfx-volume').fill('68');
    assert.equal(await page.locator('#master-value').innerText(),'72');assert.equal(await page.locator('#sfx-value').innerText(),'68');
    await page.locator('#setting-mute').tap();assert.equal(await page.locator('#setting-mute').getAttribute('aria-pressed'),'true');await page.locator('#setting-mute').tap();
    await page.locator('#title-start').tap();await page.waitForFunction(()=>document.getElementById('title-screen').hidden);await page.locator('#briefing-begin').tap();
    await page.waitForFunction(()=>document.getElementById('briefing-screen').hidden);assert.match(await page.locator('#tutorial-prompt').innerText(),/TIME STOPをタップ/);
    await page.waitForTimeout(850);const target=await page.evaluate(()=>Deadline.inspect().world.enemies.find(e=>e.alive)),canvas=await page.locator('#arena').boundingBox();
    const scale=Math.min(canvas.width/960,canvas.height/600),ox=(canvas.width-960*scale)/2,oy=(canvas.height-600*scale)/2;
    await page.touchscreen.tap(canvas.x+ox+target.x*scale,canvas.y+oy+target.y*scale);await page.waitForFunction(()=>Deadline.inspect().world.phase==='failed');
    assert.match(await page.locator('#result').innerText(),/GAME OVER[\s\S]*WAVE[\s\S]*SCORE[\s\S]*KILLS/);
    assert.ok((await page.locator('#result .result-actions button').evaluateAll(bs=>bs.map(b=>b.getBoundingClientRect().height))).every(h=>h>=44));
    await page.waitForTimeout(220);await page.screenshot({path:path.join(__dirname,'artifacts','final-polish-mobile-result.png')});await page.locator('#retry').tap();
    assert.equal(await page.evaluate(()=>Deadline.inspect().world.phase),'normal');assert.equal(await page.locator('#tutorial-prompt').isVisible(),false);assert.deepEqual(errors,[]);
    console.log(`PASS Chrome ${browser.version()} mobile SETTINGS -> BRIEFING -> tutorial -> GAME OVER -> RETRY`);
    await context.close();
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
