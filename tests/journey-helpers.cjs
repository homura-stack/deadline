'use strict';
const assert=require('node:assert/strict');
// Navigate the visible entry choices; do not seed preferences or bypass campaign state.
async function initialMap(page){
  await page.waitForFunction(()=>!Deadline.inspect().titleActive);
  if(await page.evaluate(()=>Deadline.inspect().firstFlightActive))await page.locator('#first-skip').click();
  await page.waitForFunction(()=>Deadline.inspect().journey.mode==='map'&&!Deadline.inspect().firstFlightActive);
}
async function training(page){
  await page.waitForFunction(()=>!Deadline.inspect().titleActive);
  if(await page.evaluate(()=>Deadline.inspect().firstFlightActive))await page.locator('#first-training').click();
  else if(await page.evaluate(()=>Deadline.inspect().journey.mode==='map')){
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
module.exports={initialMap,training,battleReady,nextArea};
