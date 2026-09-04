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
    await page.locator('#touch-sensitivity').fill('125');assert.equal(await page.locator('#touch-sensitivity-value').innerText(),'125%');
    await page.locator('#title-start').tap();await page.waitForFunction(()=>document.getElementById('title-screen').hidden);assert.equal(await page.locator('.briefing-page').count(),4);
    await page.locator('#briefing-skip').tap();await page.waitForFunction(()=>document.getElementById('briefing-screen').hidden);assert.equal(await page.locator('#move-pad').isVisible(),true);
    const before=await page.evaluate(()=>Deadline.inspect().world.player),canvas=await page.locator('#arena').boundingBox();await page.touchscreen.tap(canvas.x+canvas.width*.8,canvas.y+canvas.height*.3);await page.waitForTimeout(80);assert.deepEqual(await page.evaluate(()=>Deadline.inspect().world.player),before);
    await page.waitForTimeout(220);await page.screenshot({path:path.join(__dirname,'artifacts','final-polish-mobile-touchpad.png'),fullPage:true});assert.equal(await page.locator('#tutorial-prompt').isVisible(),false);assert.deepEqual(errors,[]);
    console.log(`PASS Chrome ${browser.version()} mobile SETTINGS -> BRIEFING -> MOVE PAD and direct-field movement separation`);
    await context.close();
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
