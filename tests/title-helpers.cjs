'use strict';
const assert=require('node:assert/strict');
const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
// Protect the original artwork's baked logo, Pico and trail; coordinates below are normalized to the original G preview.
async function assertTitleComposition(page,viewport){
  const art=page.locator('#title-art');
  assert.deepEqual(await art.evaluate(img=>({loaded:img.complete,w:img.naturalWidth,h:img.naturalHeight})),{loaded:true,w:2752,h:1536});
  const box=await art.boundingBox();assert.ok(box&&box.x>=-.1&&box.y>=-.1&&box.x+box.width<=viewport.width+.1&&box.y+box.height<=viewport.height+.1,'the complete illustration stays in view');
  assert.ok(Math.abs(box.width/box.height-2752/1536)<.002,'the supplied image keeps its aspect ratio');
  const scale=box.width/1024,region=(x,y,width,height)=>({x:box.x+x*scale,y:box.y+y*scale,width:width*scale,height:height*scale});
  const logo=region(56,207,400,150),pico=region(529,19,370,380),trail=region(432,150,100,310),copy=region(766,386,170,38);
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
