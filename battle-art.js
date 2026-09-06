(function (root) {
  'use strict';
  // An unpowered city etched into a circuit board. All geometry is decorative and static.
  // No access to player/enemy/Wave state, no animation clock and no restored-city variant.
  // Two densities let a resized/secondary canvas coexist without rebuilding each frame.
  // Keep this bounded: old full-resolution backdrops must not accumulate across resizes.
  const cache = new Map();
  function build(density) {
    const canvas = document.createElement('canvas'); canvas.width = 960 * density; canvas.height = 600 * density;
    const g = canvas.getContext('2d'); g.scale(density, density);
    const polygon = (points, fill, stroke, width = .7) => {
      g.beginPath(); points.forEach(([x,y],i) => i ? g.lineTo(x,y) : g.moveTo(x,y)); g.closePath();
      if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = width; g.stroke(); }
    };
    const line = (points, color, width = .65) => {
      g.beginPath(); points.forEach(([x,y],i) => i ? g.lineTo(x,y) : g.moveTo(x,y));
      g.strokeStyle = color; g.lineWidth = width; g.stroke();
    };
    const via = (x,y,r = 1.5) => {
      g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fillStyle = '#0a141e'; g.fill();
      g.strokeStyle = '#21323c'; g.lineWidth = .6; g.stroke();
    };
    const wash = g.createRadialGradient(490,285,30,490,285,610);
    wash.addColorStop(0,'#101c29'); wash.addColorStop(.65,'#0c1622'); wash.addColorStop(1,'#060c15');
    g.fillStyle = wash; g.fillRect(0,0,960,600);
    // Low relief substrate, cut channels and parallel copper traces, all without emission.
    polygon([[0,325],[280,44],[650,44],[92,600],[0,600]],'#0a141e');
    polygon([[573,600],[912,240],[960,240],[960,600]],'#0a121c');
    for (let i = 0; i < 35; i++) {
      const x = i * 32 - 240, jog = 270 + (i % 7) * 13;
      for (let lane = 0; lane < 3; lane++) {
        const offset = lane * 3.4;
        line([[x+offset,620],[x+135+offset,465],[x+135+offset,jog],[x+310+offset,jog-175],[x+310+offset,-30]],
          lane === 1 ? '#1b2a36' : '#15222e',lane === 1 ? .65 : .45);
      }
      if (i % 3 === 0) { via(x+135,jog+22); via(x+310,62,1.2); }
    }
    for (const [x,y] of [[245,150],[590,270],[420,425],[775,182],[170,343],[760,500]]) {
      line([[x-65,y+21],[x-21,y-22],[x+45,y-22],[x+68,y-45]],'#1a2b37');
      for (let i=0;i<4;i++) via(x-12+i*8,y-22,1.3);
    }
    // A common oblique projection ties IC roofs, streets and plants into one physical place.
    function chip(cx,cy,w,d,h,opacity=1,label='') {
      g.save(); g.globalAlpha = opacity;
      const p = (u,v,z=0) => [cx+(u-w/2)*.88-(v-d/2)*.72,cy+(u-w/2)*.33+(v-d/2)*.48-z];
      const roof = [p(0,0,h),p(w,0,h),p(w,d,h),p(0,d,h)];
      polygon([p(-6,-6),p(w+6,-6),p(w+6,d+6),p(-6,d+6)],'#07101a','#1a2935');
      polygon([p(0,0),p(w,0),p(w,d),p(0,d)].map(([x,y])=>[x+10,y+12]),'#060c15');
      // Connector legs stay much smaller and darker than every projectile.
      for (let u=7;u<w-4;u+=7) {
        line([p(u,0,2),p(u,-7,2),p(u,-11)],'#253440',1.5);
        line([p(u,d,2),p(u,d+7,2),p(u,d+11)],'#293b46',1.5);
      }
      for (let v=7;v<d-4;v+=7) {
        line([p(0,v,2),p(-8,v,2)],'#20333f',1.4); line([p(w,v,2),p(w+8,v,2)],'#273b45',1.4);
      }
      polygon([p(0,d,h),p(w,d,h),p(w,d),p(0,d)],'#0b1722','#1e303b');
      polygon([p(w,0,h),p(w,d,h),p(w,d),p(w,0)],'#08121d','#1b2b37');
      polygon(roof,'#152430','#2a3a46');
      for (let u=8;u<w;u+=9) line([p(u,d,3),p(u,d,h-3)],'#20313b',.55);
      polygon([p(5,5,h+.2),p(w-5,5,h+.2),p(w-5,d-5,h+.2),p(5,d-5,h+.2)],null,'#20343e',.6);
      // Roof pads and engraved bus paths suggest districts at a very small scale.
      for (let v=10;v<d-9;v+=9) {
        line([p(10,v,h+.5),p(w*.43,v,h+.5),p(w*.5,v+4,h+.5),p(w-11,v+4,h+.5)],'#22333f',.65);
      }
      const pad=p(9,7,h+.7); via(pad[0],pad[1],2);
      if (label) {
        const at=p(w*.48,d*.55,h+1); g.save(); g.translate(...at); g.transform(.88,.33,-.72,.48,0,0);
        g.fillStyle='#35434c'; g.font='8px Consolas, monospace'; g.textAlign='center'; g.fillText(label,0,0); g.restore();
      }
      g.restore();
    }
    // Tall silhouettes at the edges; the middle keeps a broad, quiet playing surface.
    const blocks = [
      [93,86,92,54,32,1,'IC-01'],[259,43,112,58,26,.85,''],[452,43,62,43,48,.7,''],
      [659,92,114,72,35,.85,'IC-04'],[849,119,89,63,55,1,''],[948,237,74,51,42,.9,''],
      [23,269,81,61,46,.9,''],[172,266,66,42,12,.32,''],[402,226,71,46,8,.27,''],
      [707,335,80,51,9,.3,''],[66,467,103,70,37,1,'IC-08'],[211,581,115,69,48,.9,''],
      [464,602,94,58,30,.7,''],[673,582,86,58,39,.8,''],[838,516,111,74,43,1,'IC-12'],
      [931,442,62,48,46,.85,'']
    ];
    blocks.sort((a,b)=>a[1]-b[1]).forEach(args=>chip(...args));
    // Dormant electronic foliage: translucent metal leaves, dark nodes, no lights or motion.
    function plant(x,y,size=1,opacity=1) {
      g.save(); g.translate(x,y); g.scale(size,size); g.globalAlpha=opacity;
      for (let root=0;root<4;root++) line([[0,2],[root*8-12,8],[root*8-25,20]],'#203638',.7);
      line([[0,3],[0,-23],[-3,-31]],'#293c40',2.6);
      for (let i=0;i<7;i++) {
        const angle=i*Math.PI*2/7, vx=Math.cos(angle)*20, vy=Math.sin(angle)*10-18;
        const sx=0,sy=-14,ex=vx,ey=vy-17;
        g.beginPath(); g.moveTo(sx,sy); g.bezierCurveTo(vx*.1-7,vy,ex-7,ey-8,ex,ey);
        g.bezierCurveTo(ex+8,ey-3,vx*.6+5,vy+12,sx,sy);
        g.fillStyle=i%2?'#13272c':'#172e32'; g.fill(); g.strokeStyle='#294042'; g.lineWidth=.7; g.stroke();
        line([[sx,sy],[ex*.6,ey*.6-6],[ex,ey]],'#294044',.6);
        via(ex,ey,1.2);
      }
      g.beginPath(); g.ellipse(0,1,8,3,0,0,Math.PI*2); g.fillStyle='#0a171e'; g.fill();
      g.restore();
    }
    for (const args of [[61,202,1.2,.8],[151,128,.8,.7],[287,79,.8,.6],[733,98,1,.7],
      [887,244,1.2,.85],[947,330,.9,.6],[39,382,.85,.7],[132,532,1.25,.85],
      [335,574,1,.7],[745,523,.85,.75],[895,573,1.2,.8],[629,349,.55,.27]]) plant(...args);
    // Unlit street fixtures. Their lamp heads are black, unlike luminous bullets/targets.
    for (const [x,y] of [[180,110],[809,202],[107,420],[799,486]]) {
      line([[x-5,y+2],[x+4,y+2]],'#24343f',1.8);
      line([[x,y],[x,y-31],[x+8,y-35]],'#293945',1.2);
      polygon([[x+5,y-39],[x+15,y-35],[x+10,y-32],[x,y-36]],'#0b141e','#283a46');
    }
    const vignette=g.createRadialGradient(480,305,160,480,305,620);
    vignette.addColorStop(0,'#050a1200'); vignette.addColorStop(.7,'#050a1220'); vignette.addColorStop(1,'#030811b0');
    g.fillStyle=vignette; g.fillRect(0,0,960,600);
    return canvas;
  }
  root.Deadline.battleArt = {
    backdrop(density=1) {
      const next = Math.min(3, Math.max(1, Math.ceil(density*2)/2));
      const canvas = cache.get(next) || build(next);
      cache.delete(next); cache.set(next, canvas);
      if (cache.size > 2) cache.delete(cache.keys().next().value);
      return canvas;
    }
  };
})(window);
