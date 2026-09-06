'use strict';
const assert=require('node:assert/strict');
const state=page=>page.evaluate(()=>Deadline.inspect());
async function move(page,point,steps=6){
  const box=await page.locator('#arena').boundingBox(),scale=Math.min(box.width/960,box.height/600);
  await page.mouse.move(box.x+(box.width-scale*960)/2+point.x*scale,box.y+(box.height-scale*600)/2+point.y*scale,{steps});
}
async function stroke(page,points){
  const w=(await state(page)).world;await move(page,w.route.points.at(-1));await page.mouse.down();
  for(const point of points)await move(page,point);await page.mouse.up();
}
async function begin(page){
  for(const heading of ['01 / EVADE','02 / FREEZE','03 / DRAW','04 / EXECUTE']){
    assert.equal((await page.locator('.briefing-page:visible .briefing-number').innerText()).trim(),heading);
    await page.locator('#briefing-begin').click();
  }
  await page.waitForFunction(()=>Deadline.inspect().practice.active);
}
async function plan(page){
  await move(page,{x:240,y:470});assert.equal((await state(page)).practice.step,'freeze');
  await page.keyboard.press('Space');assert.equal((await state(page)).practice.step,'draw');
  const before=(await state(page)).world;
  const endpoint={x:805,y:400};await stroke(page,[...before.enemies,endpoint]);const snapshot=await state(page);
  assert.equal(snapshot.practice.step,'execute');assert.equal(snapshot.world.route.locks.length,2);assert.equal(snapshot.world.route.danger.length,0);
  return {before,plan:snapshot.world,endpoint};
}
module.exports={state,move,stroke,begin,plan};
