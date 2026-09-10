'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{PNG}=require('pngjs');
const {begin,plan}=require('./tutorial-helpers.cjs');
const base=process.env.DEADLINE_TEST_URL||'http://127.0.0.1:4186/';
const out=path.join(__dirname,'artifacts','world-map-restoration');fs.mkdirSync(out,{recursive:true});
const report={layouts:[],pixels:[],errors:[],requests:[]};
const delta=(a,b)=>a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0);
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});report.browser=browser.version();
 function hook(p){p.on('pageerror',e=>report.errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});p.on('requestfailed',r=>report.requests.push(r.url()));}
 try{
  for(const [file,sha]of [['before','dda4a2d70d7cfb28d8f286466c9af0c4484725b807afe7820b3abae78af7676a'],['after','6dd325544d929130d9ffaf98313c43aa37349995bb280fb31359d5ee2cecee30']])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..','assets','world-map',file+'.jpeg'))).digest('hex'),sha,'source JPEG bytes match the manifest');
  const p=await browser.newPage({viewport:{width:1920,height:1080}});hook(p);await p.goto(base+'?debug');await p.waitForLoadState('networkidle');
  await p.locator('#title-start').click();await p.waitForFunction(()=>Deadline.inspect().briefingActive);await begin(p);await plan(p);await p.keyboard.press('Space');await p.waitForFunction(()=>Deadline.inspect().journey.mode==='map');
  await p.waitForSelector('#map-board[data-art-status="ready"]');assert.equal(await p.locator('[data-area][data-status="locked"]').count(),4);assert.equal(await p.locator('.world-full-reveal').getAttribute('opacity'),'0.0000');
  for(const size of [{width:1920,height:1080},{width:2560,height:1440},{width:1366,height:768},{width:1920,height:1080},{width:960,height:720},{width:390,height:844},{width:844,height:390},{width:3840,height:2160}]){
   await p.setViewportSize(size);
   const layout=await p.evaluate(()=>{const box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};},board=document.querySelector('#map-board'),art=box(board),before=document.querySelector('.world-before'),after=document.querySelector('.world-after-source'),detail=box(document.querySelector('.map-detail'));
    return {art,detail,natural:[[before.naturalWidth,before.naturalHeight],[after.naturalWidth,after.naturalHeight]],scale:art.width/2750,overflow:document.documentElement.scrollWidth>innerWidth,nodes:[...document.querySelectorAll('[data-area]')].map((e,i)=>({index:i,...box(e),label:box(e.querySelector('.map-node-label')),expected:{x:art.x+Deadline.WorldMapView.districts[i].x/1000*art.width,y:art.y+Deadline.WorldMapView.districts[i].y/Deadline.WorldMapView.art.height*art.height}}))};});
   assert.equal(layout.overflow,false);assert.ok(layout.scale<=1.00001);assert.deepEqual(layout.natural,[[2752,1536],[2750,1536]]);
   for(const node of layout.nodes){assert.ok(Math.abs(node.x+node.width/2-node.expected.x)<.1);assert.ok(Math.abs(node.y+node.height/2-node.expected.y)<.1);assert.ok(node.x>=0&&node.right<=size.width+1);assert.ok(node.height>=44);
    const d=layout.detail,l=node.label;assert.ok(l.right<=d.x||d.right<=l.x||l.bottom<=d.y||d.bottom<=l.y,'detail must not obscure AREA '+node.index);
   }
   if(size.width>=1001){assert.ok(layout.art.bottom<=size.height);assert.ok(layout.detail.bottom<=size.height);}
   report.layouts.push({size,...layout});await p.screenshot({path:path.join(out,`map-${size.width}x${size.height}.png`),fullPage:true});
  }
  await p.setViewportSize({width:1920,height:1080});await p.locator('[data-area="1"] .map-node-label').click();assert.equal(await p.locator('#map-enter').isDisabled(),true);await p.locator('[data-area="1"]').focus();await p.keyboard.press('Enter');assert.equal(await p.locator('#map-enter').isDisabled(),true);await p.locator('[data-area="0"]').focus();await p.keyboard.press('Enter');assert.equal(await p.locator('#map-enter').isEnabled(),true);
  await p.locator('#map-enter').click();await p.waitForFunction(()=>Deadline.inspect().journey.mode==='battle');assert.equal(await p.evaluate(()=>Deadline.inspect().world.wave),1);report.campaignEntry='fresh START -> real TRAINING -> MAP -> GARDEN';
  await p.reload();await p.waitForLoadState('networkidle');await p.locator('#title-training-launch').click();await p.waitForFunction(()=>Deadline.inspect().briefingActive);assert.equal(await p.evaluate(()=>Deadline.inspect().briefingPage),0);report.trainingEntry='permanent TRAINING -> same briefing';await p.close();
  // The actual SVG mask is rasterized by Chrome. Pixel comparison uses the source JPEGs,
  // and isolates presentation fixtures from the live campaign's progression.
  const v=await browser.newPage({viewport:{width:1100,height:700},deviceScaleFactor:1});hook(v);await v.goto(base+'?debug');await v.waitForLoadState('networkidle');
  await v.evaluate(()=>{const box=document.createElement('div');box.id='art-fixture';box.className='map-board';box.style.cssText='position:fixed;left:0;top:0;width:1000px;height:558.139535px;z-index:99999';document.body.append(box);window.artView=new Deadline.WorldMapView(box,()=>{});window.artState={...Deadline.journey.create(),mode:'map',elapsed:4};const style=document.createElement('style');style.textContent='#art-fixture .map-node,#art-fixture .world-city,#art-fixture .world-pico,#art-fixture .world-connections{visibility:hidden}';document.head.append(style);});
  await v.waitForSelector('#art-fixture[data-art-status="ready"]');
  const references=await v.evaluate(()=>{
   const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=558;const ctx=canvas.getContext('2d');
   const data=image=>{ctx.clearRect(0,0,1000,558);ctx.drawImage(image,0,0,1000,558.139535);return ctx.getImageData(0,0,1000,558).data;};
   const b=data(artView.sources[0]),a=data(artView.sources[1]),rgb=(d,x,y)=>[...d.slice((y*1000+x)*4,(y*1000+x)*4+3)];
   // Pick a lit feature inside each district's art, avoiding opaque buildings' dark roofs.
   const points=[[340,410,450,510],[180,180,250,225],[800,190,860,245],[585,85,645,140],[478,180,522,222]].map(([x0,y0,x1,y1])=>{let best=-1,point;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const k=(y*1000+x)*4,delta=Math.abs(a[k]-b[k])+Math.abs(a[k+1]-b[k+1])+Math.abs(a[k+2]-b[k+2]);if(delta>best){best=delta;point=[x,y];}}return point;});
   return {points,before:points.map(([x,y])=>rgb(b,x,y)),after:points.map(([x,y])=>rgb(a,x,y))};
  });report.references=references;
  const paint=async(restored,mode='map',elapsed=4)=>{await v.evaluate(({restored,mode,elapsed})=>{Object.assign(artState,{restored,selected:Math.min(restored,4),unlockFrom:restored-1,mode,elapsed});artView.render(artState);artView.animate(artState);},{restored,mode,elapsed});return PNG.sync.read(await v.locator('#art-fixture').screenshot());};
  const samples=image=>references.points.map(([x,y])=>[...image.data.slice((y*image.width+x)*4,(y*image.width+x)*4+3)]);
  for(let restored=0;restored<=4;restored++){
   const image=await paint(restored),actual=samples(image);fs.writeFileSync(path.join(out,`mask-${restored}.png`),PNG.sync.write(image));
   actual.forEach((value,i)=>{assert.ok(delta(references.before[i],references.after[i])>18,'sample must distinguish source artwork '+i);assert.ok(delta(value,restored>i?references.after[i]:references.before[i])<=12,`district ${i}, restored ${restored}: ${value}`);});report.pixels.push({restored,actual});
  }
  // Growth originates inside Garden, leaves the other four districts dark, and has soft edge pixels.
  const before=await paint(0),fullGarden=await paint(1),middle=await paint(1,'map',1.9);let soft=0,changed=0;
  for(let k=0;k<middle.data.length;k+=4){const b=delta([...before.data.slice(k,k+3)],[...middle.data.slice(k,k+3)]),a=delta([...fullGarden.data.slice(k,k+3)],[...middle.data.slice(k,k+3)]);if(b>8)changed++;if(b>8&&a>8)soft++;}
  assert.ok(soft>150&&changed>500);report.soft={soft,changed};fs.writeFileSync(path.join(out,'mask-spreading.png'),PNG.sync.write(middle));
  await paint(5,'synchronizing',.1);assert.equal(await v.locator('#art-fixture .world-full-reveal').getAttribute('opacity'),'0.0000');
  await paint(5,'synchronizing',4.9);assert.equal(await v.locator('#art-fixture .world-full-reveal').getAttribute('opacity'),'0.0000');assert.ok(Number(await v.locator('#art-fixture .world-breath-dim').getAttribute('opacity'))>.1);
  await paint(5,'synchronizing',5.8);const partial=Number(await v.locator('#art-fixture .world-full-reveal').getAttribute('opacity'));assert.ok(partial>0&&partial<1);
  const complete=await paint(5,'synchronizing',6.9);assert.equal(await v.locator('#art-fixture').getAttribute('data-full-after'),'true');samples(complete).forEach((c,i)=>assert.ok(delta(c,references.after[i])<=12));fs.writeFileSync(path.join(out,'mask-full.png'),PNG.sync.write(complete));
  await paint(5,'ending',0);assert.equal(await v.locator('#art-fixture').getAttribute('data-full-after'),'true');
  const purity=await v.evaluate(()=>{const snapshot=JSON.stringify(artState);for(const reduced of [false,true]){artView.render(artState);artView.animate(artState,reduced);}return JSON.stringify(artState)===snapshot;});assert.equal(purity,true);await v.close();
  // Explicit image failure and retry stay separate from the normal no-error run.
  const fail=await browser.newPage();const failureErrors=[];fail.on('pageerror',e=>failureErrors.push(String(e)));await fail.route('**/world-map/after.jpeg',r=>r.abort());await fail.goto(base+'?debug');await fail.waitForLoadState('networkidle');
  await fail.locator('#title-start').click();await fail.waitForFunction(()=>Deadline.inspect().briefingActive);await begin(fail);await plan(fail);await fail.keyboard.press('Space');await fail.waitForFunction(()=>Deadline.inspect().journey.mode==='map');
  await fail.waitForSelector('#map-board[data-art-status="error"]');await fail.unroute('**/world-map/after.jpeg');await fail.locator('.map-art-message button').click();await fail.waitForSelector('#map-board[data-art-status="ready"]');assert.deepEqual(failureErrors,[]);await fail.close();
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);report.loading='normal images ready; intentional failure retries without changing campaign';
  console.log('PASS world-map restoration: real START/training/Garden, permanent training, source hashes, 8 layouts, exact nodes, 0-4 regional AFTER pixels, soft spreading, gated SYNC/full AFTER, immutable state, failed-image retry');
 }finally{fs.writeFileSync(path.join(out,'map-art-report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
