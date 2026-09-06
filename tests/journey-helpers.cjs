'use strict';
const assert=require('node:assert/strict');
// Existing combat/tutorial suites now navigate the real map instead of bypassing campaign state.
async function training(page){
  await page.waitForFunction(()=>!Deadline.inspect().titleActive);
  if(await page.evaluate(()=>Deadline.inspect().journey.mode==='map')){
    assert.equal(await page.locator('#world-map').isVisible(),true);
    await page.locator('#map-training').click();
  }
  await page.waitForFunction(()=>Deadline.inspect().briefingActive);
}
async function battleReady(page){
  await page.waitForFunction(()=>Deadline.inspect().journey.mode==='battle'&&!Deadline.inspect().briefingActive);
}
async function nextArea(page){
  await page.waitForFunction(()=>Deadline.inspect().journey.mode==='map',{}, {timeout:8000});
  await page.locator('#map-enter').click();await battleReady(page);
}
module.exports={training,battleReady,nextArea};
