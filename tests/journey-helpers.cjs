'use strict';
const assert=require('node:assert/strict');
// Battle/layout fixtures use a completed-user profile. Fresh completion is tested
// with real input in title-quality-training-browser, pico-tutorial and title-routes.
async function visitCompleted(page,url,options){
  await page.addInitScript(()=>localStorage.setItem('deadline.tutorial.v1','completed'));
  return page.goto(url,options);
}
async function initialMap(page){
  await page.waitForFunction(()=>!Deadline.inspect().titleActive);
  // Battle-only fixtures use the completed user's manual exit.
  // The START acceptance suites complete the real rehearsal instead of using this helper.
  if(await page.evaluate(()=>Deadline.inspect().briefingActive)){
    assert.equal(await page.evaluate(()=>Deadline.inspect().trainingPreference),'completed');
    await page.locator('#briefing-skip').click();
  }
  await page.waitForFunction(()=>Deadline.inspect().journey.mode==='map');
}
async function training(page){
  await page.waitForFunction(()=>!Deadline.inspect().titleActive);
  if(await page.evaluate(()=>Deadline.inspect().journey.mode==='map')){
    assert.equal(await page.locator('#world-map').isVisible(),true);
    await page.locator('#map-training').click();
  }
  await page.waitForFunction(()=>Deadline.inspect().briefingActive);
}
async function battleReady(page){
  if(await page.evaluate(()=>Deadline.inspect().journey.mode==='map'&&!Deadline.inspect().briefingActive))await page.locator('#map-enter').click();
  await page.waitForFunction(()=>Deadline.inspect().journey.mode==='battle'&&!Deadline.inspect().briefingActive);
}
async function nextArea(page){
  await page.waitForFunction(()=>Deadline.inspect().journey.mode==='map',{}, {timeout:8000});
  await page.locator('#map-enter').click();await battleReady(page);
}
module.exports={initialMap,training,battleReady,nextArea,visitCompleted};
