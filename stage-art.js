(function (root) {
  'use strict';
  const J=root.Deadline.journey, W=960, H=600;
  const entries=new Map(), shades=[.18,.14,.26,.18,.3];
  let retained=new Set([0]), generation=0;
  const key=(area,version)=>`${J.areas[area].id}_${version}`;
  function load(area,version) {
    const id=key(area,version);
    if(entries.has(id))return entries.get(id);
    const image=new Image(), entry={id,area,version,image,status:'loading',width:0,height:0};
    entries.set(id,entry); image.decoding='async';
    let settled=false;
    const finish=ready=>{
      if(settled)return;settled=true;clearTimeout(timeout);
      entry.status=ready?'ready':'error';entry.width=image.naturalWidth;entry.height=image.naturalHeight;generation++;
    };
    const timeout=setTimeout(()=>finish(false),20000);
    image.onload=()=>image.decode().then(()=>finish(true),()=>finish(false));
    image.onerror=()=>finish(false);
    image.src=`assets/stages/${id}.jpeg`;
    return entry;
  }
  function prepare(area,next=false) {
    retained=new Set([area]);if(next&&area<4)retained.add(area+1);
    // Discard references to departed districts; the browser's ordinary HTTP cache can serve revisits.
    for(const [id,entry] of entries)if(!retained.has(entry.area))entries.delete(id);
    for(const index of retained)for(const version of ['before','after'])load(index,version);
  }
  function status(area) {
    const pair=['before','after'].map(version=>entries.get(key(area,version))?.status||'idle');
    return pair.includes('error')?'error':pair.every(s=>s==='ready')?'ready':'loading';
  }
  function retry(area) {
    for(const version of ['before','after']){const id=key(area,version);if(entries.get(id)?.status==='error')entries.delete(id);}
    prepare(area);
  }
  function inspect() {
    return {generation,retained:[...retained],images:[...entries.values()].map(({id,area,status,width,height})=>({id,area,status,width,height}))};
  }
  function canvas(width,height) {const c=document.createElement('canvas');c.width=width;c.height=height;return c;}
  function fit(g,image,width,height) {
    const scale=Math.max(width/image.naturalWidth,height/image.naturalHeight);
    const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
    g.drawImage(image,(width-w)/2,(height-h)/2,w,h);
  }
  /** One current-area pair, resized only on area/resolution changes. Original JPEG bytes are untouched. */
  function stamps(renderer,area) {
    const before=entries.get(key(area,'before')),after=entries.get(key(area,'after'));
    if(before?.status!=='ready'||after?.status!=='ready')return null;
    const scale=Math.max(.5,Math.min(2,Math.ceil(renderer.scale*renderer.ratio*4)/4));
    const cacheKey=`${area}/${scale}`;
    if(renderer.stageCache?.key===cacheKey && renderer.stageCache.source===before)return renderer.stageCache;
    const width=Math.round(W*scale),height=Math.round(H*scale), cache={key:cacheKey,source:before,width,height,scale};
    for(const [version,entry] of [['before',before],['after',after]]){
      const c=canvas(width,height),g=c.getContext('2d');fit(g,entry.image,width,height);
      if(version==='before'){g.fillStyle=`rgba(2,7,17,${shades[area]})`;g.fillRect(0,0,width,height);}
      cache[version]=c;
    }
    cache.masked=canvas(width,height);renderer.stageCache=cache;return cache;
  }
  function draw(renderer,app) {
    if(!app?.journey)return false;
    const state=app.journey, cache=stamps(renderer,state.active);
    if(!cache)return false;
    const g=renderer.ctx;g.drawImage(cache.before,0,0,W,H);
    // AFTER is never composited in combat, at title, or during the entry card.
    if(state.mode!=='restoring')return true;
    const frame=J.restorationFrame(state,app.reducedMotion);
    if(frame.reveal<=0)return true;
    if(frame.complete){g.drawImage(cache.after,0,0,W,H);return true;}
    const origin=state.origin, distance=Math.max(...[[0,0],[W,0],[0,H],[W,H]].map(([x,y])=>Math.hypot(x-origin.x,y-origin.y)));
    const radius=(distance+110)*frame.reveal, soft=80;
    const m=cache.masked.getContext('2d');m.setTransform(1,0,0,1,0,0);m.globalCompositeOperation='source-over';m.clearRect(0,0,cache.width,cache.height);
    m.drawImage(cache.after,0,0);m.globalCompositeOperation='destination-in';
    const mask=m.createRadialGradient(origin.x*cache.scale,origin.y*cache.scale,Math.max(0,radius-soft)*cache.scale,origin.x*cache.scale,origin.y*cache.scale,(radius+soft)*cache.scale);
    mask.addColorStop(0,'#fff');mask.addColorStop(.3,'#ffffffee');mask.addColorStop(.7,'#ffffff55');mask.addColorStop(1,'#ffffff00');
    m.fillStyle=mask;m.fillRect(0,0,cache.width,cache.height);m.globalCompositeOperation='source-over';
    g.drawImage(cache.masked,0,0,W,H);return true;
  }
  const replies=[[[170,190],[585,485],[805,325]],[[155,220],[538,130],[864,330]],[[190,390],[530,120],[820,255]],[[295,150],[580,125],[780,275]],[[640,150],[230,320],[745,450]]];
  function glow(g,x,y,r,alpha) {
    const fill=g.createRadialGradient(x,y,0,x,y,r);fill.addColorStop(0,`rgba(255,232,171,${alpha})`);fill.addColorStop(.25,`rgba(244,197,101,${alpha*.45})`);fill.addColorStop(1,'#f4c56500');
    g.fillStyle=fill;g.fillRect(x-r,y-r,r*2,r*2);
  }
  /** Only light: no explosions, geometric expanding ring, enemy flashes, or simulation writes. */
  function fireflies(renderer,state,reduced) {
    const g=renderer.ctx, f=J.restorationFrame(state,reduced), p=state.origin;
    g.save();
    glow(g,p.x-5,p.y+17,32+f.pico*26,.14*f.pico);
    glow(g,p.x-5,p.y+17,10,.24*f.pico);
    if(f.reveal>0&&!f.complete){
      const reach=Math.max(...[[0,0],[W,0],[0,H],[W,H]].map(([x,y])=>Math.hypot(x-p.x,y-p.y)))+110;
      if(!reduced)for(let i=0;i<8;i++){
        const angle=i*2.399+state.active*.3, radius=reach*f.reveal-25+(i%3)*12;
        const x=p.x+Math.cos(angle)*radius,y=p.y+Math.sin(angle)*radius;
        const alpha=.12*Math.sin(f.reveal*Math.PI);
        glow(g,x,y,9,alpha);renderer.circle(x,y,.8,null,`rgba(255,231,167,${alpha*3})`);
      }
    }
    if(!reduced)replies[state.active].forEach(([x,y],i)=>{
      const start=.28+i*.16, phase=Math.max(0,Math.min(1,(f.reveal-start)/.38));
      const alpha=Math.sin(phase*Math.PI)*.15;
      if(alpha>0){glow(g,x,y,18,alpha);renderer.circle(x,y,1.1,null,`rgba(255,239,196,${alpha*3})`);}
    });
    g.restore();return f;
  }
  root.Deadline.stageArt={prepare,status,retry,inspect,draw,fireflies};
})(globalThis);
