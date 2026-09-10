'use strict';
const assert=require('node:assert/strict');
const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
// Protect the official title artwork's baked logo, Pico, trail, and subtitle.
async function assertTitleComposition(page,viewport){
  const art=page.locator('#title-art');
  assert.deepEqual(await art.evaluate(img=>({loaded:img.complete,w:img.naturalWidth,h:img.naturalHeight})),{loaded:true,w:1678,h:937});
  const box=await art.boundingBox();assert.ok(box&&box.x>=-.1&&box.y>=-.1&&box.x+box.width<=viewport.width+.1&&box.y+box.height<=viewport.height+.1,'the complete illustration stays in view');
  assert.ok(Math.abs(box.width/box.height-1678/937)<.002,'the title image keeps its aspect ratio');
  const scale=box.width/1678,region=(x,y,width,height)=>({x:box.x+x*scale,y:box.y+y*scale,width:width*scale,height:height*scale});
  const logo=region(45,315,785,185),pico=region(880,28,585,665),trail=region(720,400,160,450),copy=region(65,500,715,35);
  for(const selector of ['#title-start','#title-training-launch','[data-title-info="how"]','[data-title-info="settings"]','[data-title-info="credits"]']){
    const button=page.locator(selector),bounds=await button.boundingBox();
    assert.ok(await button.isVisible());assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=viewport.width&&bounds.y+bounds.height<=viewport.height,`${selector} is reachable at ${viewport.width}x${viewport.height}: ${JSON.stringify(bounds)}`);
    for(const [name,protectedBox]of Object.entries({logo,pico,trail,copy}))assert.equal(overlap(bounds,protectedBox),false,selector+' does not cover '+name);
  }
  assert.equal(await page.locator('.title-heading').getAttribute('aria-label'),'DEAD/LINE');
  assert.equal(await page.locator('.title-heading').evaluate(e=>getComputedStyle(e).clipPath),'inset(50%)','no second visible HTML logo');
  return {art:box,logo,pico};
}
module.exports={assertTitleComposition,overlap};
