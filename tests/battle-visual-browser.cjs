/* TASK B: color separation, background readability and render isolation in real Chrome. */
'use strict';
const {visitCompleted}=require('./journey-helpers.cjs');
const { chromium } = require('playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const base = process.env.DEADLINE_TEST_URL || 'http://127.0.0.1:4186/';
const artifacts = path.join(__dirname,'artifacts','battle'); fs.mkdirSync(artifacts,{recursive:true});
const report = {browser:'',background:null,colors:[],wake:null,errors:[],externalRequests:[]};
function hook(page) {
  page.on('pageerror',e=>report.errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  page.on('request',r=>{if(!r.url().startsWith(new URL(base).origin)&&!r.url().startsWith('data:'))report.externalRequests.push(r.url());});
}
function save(name,data) { fs.writeFileSync(path.join(artifacts,name+'.png'),Buffer.from(data.split(',')[1],'base64')); }
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});report.browser=browser.version();
  try {
    const page=await browser.newPage({viewport:{width:1920,height:1080}});hook(page);
    await visitCompleted(page,base+'?debug');await page.waitForLoadState('networkidle');await page.evaluate(()=>Deadline.characters.ready);
    report.background=await page.evaluate(()=>{
      const canvas=Deadline.battleArt.backdrop(1),g=canvas.getContext('2d'),pixels=g.getImageData(0,0,960,600).data;
      const luminance=[],colors=new Set();let maxChannel=0;
      for(let i=0;i<pixels.length;i+=4){
        const [r,g,b]=pixels.slice(i,i+3);luminance.push(.2126*r+.7152*g+.0722*b);maxChannel=Math.max(maxChannel,r,g,b);colors.add(`${r},${g},${b}`);
      }
      luminance.sort((a,b)=>a-b);
      const highDensity=Deadline.battleArt.backdrop(2);
      const alternatingCached=canvas===Deadline.battleArt.backdrop(1)&&highDensity===Deadline.battleArt.backdrop(2);
      return {median:luminance[Math.floor(luminance.length*.5)],p99:luminance[Math.floor(luminance.length*.99)],
        maxChannel,distinctColors:colors.size,cached:canvas===Deadline.battleArt.backdrop(1),alternatingCached,image:canvas.toDataURL()};
    });
    save('dead-city',report.background.image);delete report.background.image;
    assert.ok(report.background.p99<45);assert.ok(report.background.maxChannel<85);
    assert.ok(report.background.distinctColors>150);assert.ok(report.background.median>6);assert.equal(report.background.cached,true);
    assert.equal(report.background.alternatingCached,true,'Different render densities must reuse both cached backdrops');
    for (const mode of ['normal','plan','execute','dense','reduced']) {
      const result=await page.evaluate(mode=>{
        const {Renderer,sim:S,config:C}=Deadline;
        const canvas=document.createElement('canvas');canvas.id='battle-fixture';
        canvas.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:9999';document.body.append(canvas);
        const renderer=new Renderer(canvas),w=S.createWorld(),e=w.enemies[0];
        w.enemies=[{...e,id:1,x:400,y:230,pattern:'burst'}, {...e,id:2,x:600,y:230,pattern:'aim'}, {...e,id:3,x:800,y:230,pattern:'rotate',rotateAngle:0}];
        w.player={x:160,y:430};w.gauge=100;
        w.bullets=['aim','fan','burst','rotate','delay'].map((pattern,i)=>({x:260+i*130,y:340,vx:1,vy:0,pattern}));
        if(mode!=='normal') {
          S.stopTime(w);for(const p of [{x:400,y:430},...w.enemies,{x:860,y:440}])S.addRoutePoint(w,p);
        }
        // Capture the live current before this deliberately mixed bullet fixture can cause a hit.
        if(mode==='execute'){S.executeRoute(w);for(let i=0;i<5;i++)S.step(w);}
        if(mode==='dense') {
          w.bullets=Array.from({length:180},(_,i)=>({x:60+(i%20)*43,y:60+Math.floor(i/20)*56,vx:1,vy:0,pattern:['aim','fan','burst','rotate','delay'][i%5]}));
          w.route=S.compileRoute(w.route.points,w);
        }
        const app={world:w,particles:[],hits:[],shake:0,timeFx:{blend:mode==='normal'?0:1},reducedMotion:mode==='reduced',routeFx:{drawing:mode==='plan',lockFlashes:[]}};
        const worldBefore=JSON.stringify(w);renderer.draw(app);
        const pixel=(x,y)=>Array.from(renderer.ctx.getImageData(Math.round((renderer.offsetX+x*renderer.scale)*renderer.ratio),Math.round((renderer.offsetY+y*renderer.scale)*renderer.ratio),1,1).data).slice(0,3);
        const region=(cx,cy,radius,predicate)=>{
          let count=0;for(let y=cy-radius;y<=cy+radius;y++)for(let x=cx-radius;x<=cx+radius;x++)if(predicate(pixel(x,y)))count++;return count;
        };
        const warm=([r,g,b])=>r>120&&r>g+5&&g>b+20;
        const cyan=([r,g,b])=>g>130&&g>r+35&&b>r+35;
        const redPurple=([r,g,b])=>(r>140||b>140)&&Math.max(r,b)>g+20;
        // Sample behind Pico's sprite, so the casing/transparent wings cannot mask the current.
        const current=w.execution?S.pointAt(w.route,Math.max(0,w.execution.along-30)):null;
        const metrics={mode,phase:w.phase,current:current?pixel(current.x,current.y):null,
          worldUnchanged:worldBefore===JSON.stringify(w),routePoints:w.route?.points.length||0,
          line:pixel(230,430),tip:pixel(860,440),picoWarm:region(w.player.x,w.player.y,20,warm),
          targetCyan:mode==='normal'?0:region(600,230,23,cyan),enemyCyan:region(600,230,15,cyan),enemyDanger:region(600,230,15,redPurple),
          bullets:mode==='dense'?[]:w.bullets.map(b=>({pattern:b.pattern,pixel:pixel(b.x+2,b.y)})),image:canvas.toDataURL()};
        // A generated visual never changes after a kill/Wave transition; no recovery is encoded in the background.
        const original=Deadline.battleArt.backdrop(renderer.scale*renderer.ratio).toDataURL();
        const oldWave=w.wave;w.wave=10;w.enemies.forEach(enemy=>{enemy.alive=false;});renderer.backdrop(0);
        metrics.backgroundAfterClear=original===Deadline.battleArt.backdrop(renderer.scale*renderer.ratio).toDataURL();w.wave=oldWave;
        return metrics;
      },mode);
      save(mode+'-1920',result.image);delete result.image;report.colors.push(result);
      assert.equal(result.worldUnchanged,true);assert.equal(result.backgroundAfterClear,true);
      assert.equal(result.phase,mode==='normal'?'normal':mode==='execute'?'executing':'stopped');
      if(mode==='execute')assert.ok(result.current[0]>result.current[1]&&result.current[1]>result.current[2]+20,'EXECUTE current stays warm');
      assert.ok(result.picoWarm>10,mode+' Pico');assert.ok(result.enemyDanger>10,mode+' enemy');
      if(mode==='normal')assert.equal(result.enemyCyan,0);
      if(mode==='plan'||mode==='reduced') {
        assert.ok(result.line[0]>result.line[1]&&result.line[1]>result.line[2]+20,mode+' gold line');
        assert.ok(result.tip[0]>result.tip[1]&&result.tip[1]>result.tip[2]+20,mode+' gold tip');
        assert.ok(result.targetCyan>35,mode+' cyan target');
      }
      for(const bullet of result.bullets){const [r,g,b]=bullet.pixel;assert.ok(Math.max(r,b)>g+15,bullet.pattern);assert.ok(r+g+b>350,bullet.pattern+' brightness');}
      await page.locator('#battle-fixture').evaluate(e=>e.remove());
    }
    // Presentational movement history is bounded, freezes on STOP, and resets on new world/reduced motion.
    report.wake=await page.evaluate(()=>{
      const {Renderer,sim:S}=Deadline,canvas=document.createElement('canvas');canvas.style.cssText='width:960px;height:600px';document.body.append(canvas);
      const r=new Renderer(canvas),w=S.createWorld(),app={world:w,particles:[],hits:[],shake:0,reducedMotion:false};let mutations=0;
      for(let i=0;i<24;i++){w.time=i/120;w.player.x=130+i*3;const before=JSON.stringify(w);r.draw(app);if(before!==JSON.stringify(w))mutations++;}
      const moving=r.wake.length;w.gauge=100;S.stopTime(w);r.draw(app);const frozen=JSON.stringify(r.wake);r.draw(app);
      const stoppedStable=frozen===JSON.stringify(r.wake);app.world=S.createWorld();r.draw(app);const reset=r.wake.length;
      app.reducedMotion=true;r.draw(app);const reduced=r.wake.length;canvas.remove();
      return {moving,stoppedStable,reset,reduced,mutations};
    });
    assert.ok(report.wake.moving>1&&report.wake.moving<=12);assert.equal(report.wake.stoppedStable,true);
    assert.equal(report.wake.reset,1);assert.equal(report.wake.reduced,0);assert.equal(report.wake.mutations,0);
    assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);
    console.log('PASS dark detailed city, gold Pico/LINE/tip, cyan TARGET, red-purple enemies/bullets, 180-bullet visual fixture, unchanged world, bounded frozen wake and no city recovery');
  }finally{fs.writeFileSync(path.join(artifacts,'acceptance.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
