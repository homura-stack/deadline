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
const safeRoute=[{x:310,y:430},{x:450,y:235},{x:600,y:235},{x:700,y:270},{x:760,y:470}];
async function firstLessons(page){
  await move(page,{x:220,y:350});assert.equal((await state(page)).practice.step,'freeze');
  await page.keyboard.press('Space');assert.equal((await state(page)).practice.step,'draw');
  await stroke(page,[{x:275,y:350}]);assert.equal((await state(page)).practice.step,'target');
  await stroke(page,[(await state(page)).world.enemies[0]]);assert.equal((await state(page)).practice.step,'dangerIntro');
}
async function evade(page){
  await page.locator('#training-action').click();assert.equal((await state(page)).practice.step,'evade');
  for(const p of [{x:210,y:350},{x:440,y:350},{x:440,y:430}])await move(page,p);
  assert.equal((await state(page)).practice.evaded,true);assert.equal((await state(page)).practice.step,'route');
  await page.keyboard.press('Space');assert.equal((await state(page)).world.phase,'stopped');
}
async function plan(page){
  await firstLessons(page);await evade(page);
  const before=(await state(page)).world;
  await stroke(page,safeRoute);const snapshot=await state(page);
  assert.equal(snapshot.practice.step,'execute');assert.equal(snapshot.world.route.locks.length,3);assert.equal(snapshot.world.route.danger.length,0);
  return {before,plan:snapshot.world,endpoint:safeRoute.at(-1)};
}
module.exports={state,move,stroke,firstLessons,evade,plan,safeRoute};
