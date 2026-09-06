(function (root) {
  'use strict';
  const J = root.Deadline.journey;
  const paths = [
    'M500 594 L366 594 L210 438 L210 342',
    'M210 342 L295 427 L705 427 L790 342',
    'M790 342 L790 278 L642 130 L500 130',
    'M500 130 L500 345',
    'M500 345 L500 594'
  ];
  // Distinct low-relief silhouettes share the same etched, oblique circuit-board material.
  function building(x, y, w, h) {
    return `<g transform="translate(${x} ${y})"><path class="city-side" d="M${-w/2} 0v${-h}l${w} 0v${h}l${-w/2} 10Z"/><path class="city-roof" d="M${-w/2} ${-h}l${w/2} -10 ${w/2} 10 ${-w/2} 10Z"/><path class="city-ridge" d="M0 ${-h+10}V10M${-w/2+5} ${-h+9}v${h-12}M${w/2-5} ${-h+9}v${h-12}"/><path class="city-light" d="M0 ${-h+12}v${h-7}"/></g>`;
  }
  function leaf(x, y, s = 1) {
    return `<g transform="translate(${x} ${y}) scale(${s})"><path class="city-stem" d="M0 5v-25"/>${[-48,-24,0,24,48].map(a => `<path class="city-leaf" transform="rotate(${a} 0 0)" d="M0 0C-26 -19 -22 -43 0 -62C22 -43 26 -19 0 0Z"/>`).join('')}<path class="city-light" d="M0 0V-48"/><circle class="city-beacon" cy="-4" r="3"/></g>`;
  }
  function silhouette(index) {
    if (index === 0) return `${building(-66,6,25,14)}${building(62,8,28,18)}${leaf(-47,-12,.48)}${leaf(47,-12,.5)}${leaf(0,9,1.06)}${leaf(-24,30,.35)}${leaf(28,28,.36)}`;
    if (index === 1) return `${building(-54,-9,28,38)}${building(26,-9,33,50)}${building(-10,16,57,30)}${[-48,-9,33].map((x,i)=>`<g transform="translate(${x} ${-33-i*8})"><path class="city-side" d="M-6 0v-45h12V0Z"/><path class="city-light" d="M-5 -39H5"/><path class="city-ridge" d="M-3 -43v37"/></g>`).join('')}<circle class="city-wheel" cx="-8" cy="9" r="11"/><path class="city-light" d="M-19 9H3M-8 -2V20"/>`;
    if (index === 2) return `${building(-61,-16,22,33)}${building(49,-20,23,42)}<ellipse class="city-water" cy="6" rx="62" ry="27"/><ellipse class="city-water" cy="6" rx="40" ry="17"/><path class="city-ridge" d="M-66 6H66M0 -27V39"/>${building(0,-1,25,45)}<path class="city-light" d="M-57 18q57 38 114 0M-40 -12q40 -22 80 0"/>`;
    if (index === 3) return `${building(-64,0,21,33)}${building(57,1,23,48)}${building(-33,-3,25,69)}${building(28,-6,26,81)}${building(0,10,32,116)}<path class="city-spire" d="M0 -116v-35M28 -87v-20M-33 -72v-17"/><circle class="city-beacon" cy="-139" r="2"/>`;
    return `<ellipse class="city-water" cy="15" rx="65" ry="26"/><ellipse class="city-ridge" cy="15" rx="77" ry="33"/>${leaf(0,13,1.3)}<path class="city-heart" d="M0 -76C-39 -42 -29 0 0 12C29 0 39 -42 0 -76Z"/><path class="city-light" d="M0 -60V12"/>`;
  }
  class WorldMapView {
    constructor(container, onSelect) {
      this.container = container;
      const traces = Array.from({length:19},(_,i)=>`<path d="M${30+i*51} 735v-90l110 -110v-310l-95 -95V0"/>`).join('');
      container.innerHTML = `<svg class="world-diagram" viewBox="0 0 1000 750" aria-hidden="true">
        <defs><radialGradient id="world-depth"><stop stop-color="#162c36"/><stop offset="1" stop-color="#060d18"/></radialGradient><filter id="world-glow"><feGaussianBlur stdDeviation="3"/></filter></defs>
        <ellipse cx="500" cy="370" rx="480" ry="340" fill="url(#world-depth)" opacity=".55"/>
        <g class="world-substrate">${traces}<ellipse cx="500" cy="360" rx="426" ry="298"/><ellipse cx="500" cy="360" rx="410" ry="285"/><ellipse cx="500" cy="360" rx="268" ry="191"/></g>
        <g class="world-connections">${paths.map((d,i)=>`<g data-connection="${i}"><path class="connection-bed" d="${d}"/><path class="connection-core" d="${d}" pathLength="100"/><path class="connection-current" d="${d}" pathLength="100"/></g>`).join('')}</g>
        ${J.areas.map((area,i)=>`<g class="world-city" data-city="${i}" transform="translate(${area.x} ${area.y})" style="--district-light:${area.color}"><ellipse class="city-aura" rx="116" ry="68"/><path class="island-wall" d="M-101 0q101 90 202 0v24q-101 90 -202 0Z"/><ellipse class="island-top" rx="101" ry="47"/><ellipse class="island-ring" rx="92" ry="39"/><g class="island-pins">${Array.from({length:13},(_,n)=>{const x=(n-6)*13;return `<path d="M${x} ${42-Math.abs(x)*.2}v${12+(n%3)*7}"/>`;}).join('')}</g>${silhouette(i)}<circle class="city-node" cy="48" r="5"/></g>`).join('')}
        <g class="world-pico"><path d="M-28 18Q-50 28 -83 20"/><image href="assets/characters/pico.png" x="-34" y="-28" width="62" height="62"/><circle r="24"/></g>
      </svg>${J.areas.map((area,i)=>`<button type="button" class="map-node" data-area="${i}" style="left:${area.x/10}%;top:${(area.y+67)/7.5}%" aria-label="AREA ${i+1} ${area.name} ${area.ja}"><span class="map-node-number">${String(i+1).padStart(2,'0')}</span><span><b>${area.name}</b><small>${area.ja}</small></span><em>LOCKED</em></button>`).join('')}`;
      this.buttons = [...container.querySelectorAll('[data-area]')];
      this.buttons.forEach((button,i)=>button.addEventListener('click',()=>onSelect(i)));
      this.lastUnlock = -1;
    }
    render(state) {
      this.buttons.forEach((button,i)=>{
        const status = J.status(state,i), city = this.container.querySelector(`[data-city="${i}"]`);
        button.dataset.status = city.dataset.status = status;
        // District buttons inspect even locked places; only the separate ENTER command is disabled.
        button.setAttribute('aria-label',`AREA ${i+1} ${J.areas[i].name} ${J.areas[i].ja} ${status==='locked'?'LOCKED':status==='online'?'ONLINE':'AVAILABLE'}`);
        button.setAttribute('aria-pressed', String(state.selected === i));
        button.querySelector('em').textContent = status === 'online' ? 'ONLINE' : status === 'available' ? 'ENTER' : 'LOCKED';
        city.classList.toggle('is-selected',state.selected===i);
      });
      paths.forEach((_,i)=>{
        const connection = this.container.querySelector(`[data-connection="${i}"]`);
        connection.dataset.powered = String(i<4 ? state.restored>i+1 : state.restored===5);
        connection.classList.toggle('is-unlocking', i===state.unlockFrom&&i<4);
      });
      const area = J.areas[Math.min(4,state.restored)], pico = this.container.querySelector('.world-pico');
      pico.setAttribute('transform',`translate(${area.x-116} ${area.y+29})`);
      if (state.unlockFrom !== this.lastUnlock) {
        this.lastUnlock = state.unlockFrom;
        const wire = this.container.querySelector('.is-unlocking');
        if (wire) { wire.classList.remove('is-unlocking'); void this.container.getBoundingClientRect(); wire.classList.add('is-unlocking'); }
      }
    }
  }
  // Reuses the actual final LINE, then passes its light into decorative board traces and dormant leaves.
  function drawRestoration(renderer, state, player, reduced) {
    if (state?.mode !== 'restoring') return;
    const g=renderer.ctx, progress=reduced?1:Math.min(1,state.elapsed/J.restoreSeconds(state)), gold='#f4c565';
    const trace=(points,amount,color,width)=>{
      const legs=points.slice(1).map((p,i)=>({a:points[i],b:p,length:Math.hypot(p.x-points[i].x,p.y-points[i].y)}));
      let remain=legs.reduce((sum,p)=>sum+p.length,0)*Math.max(0,Math.min(1,amount));
      if (!legs.length||remain<=0) return;
      g.beginPath();g.moveTo(points[0].x,points[0].y);
      for(const leg of legs){const k=leg.length?Math.min(1,remain/leg.length):1;g.lineTo(leg.a.x+(leg.b.x-leg.a.x)*k,leg.a.y+(leg.b.y-leg.a.y)*k);remain-=leg.length;if(remain<=0)break;}
      g.strokeStyle=color;g.lineWidth=width;g.stroke();
    };
    g.save();g.lineCap='round';g.lineJoin='round';
    trace(state.route,progress*3,'#f4c56522',12);trace(state.route,progress*3,'#ffe7a9',2);
    const targets=[[151,128],[61,202],[39,382],[132,532],[335,574],[629,349],[745,523],[887,244],[733,98]];
    const origin=state.route[state.route.length-1]||player;
    targets.forEach(([x,y],i)=>{
      const k=Math.max(0,Math.min(1,(progress-.22-i*.04)*3.1));
      const points=[origin,{x:origin.x,y:y+40},{x:x+30,y:y+40},{x,y}];
      trace(points,k,'#f4c56516',8);trace(points,k,'#c5ab697d',1);
      if(k<.9)return;
      const a=(k-.9)*10;
      g.globalAlpha=a;g.strokeStyle='#76c5ad';g.fillStyle='#55b39b1c';g.lineWidth=.8;
      for(let n=-1;n<=1;n++){g.beginPath();g.ellipse(x+n*8,y-12,7,16,n*.6,0,Math.PI*2);g.fill();g.stroke();}
      const glow=g.createRadialGradient(x,y,1,x,y,20);glow.addColorStop(0,'#f4c56545');glow.addColorStop(1,'#f4c56500');g.fillStyle=glow;g.fillRect(x-20,y-20,40,40);
      renderer.circle(x,y,1.8,null,'#fff1c6');g.globalAlpha=1;
    });
    const glow=g.createRadialGradient(player.x,player.y,2,player.x,player.y,54);
    glow.addColorStop(0,`rgba(255,218,128,${.28+progress*.13})`);glow.addColorStop(1,'#f4c56500');g.fillStyle=glow;g.fillRect(player.x-54,player.y-54,108,108);
    if(!reduced){g.strokeStyle=gold+'55';g.lineWidth=1;g.beginPath();g.arc(player.x,player.y,23+progress*40,0,Math.PI*2);g.stroke();}
    g.restore();
  }
  root.Deadline.WorldMapView=WorldMapView;
  root.Deadline.drawRestoration=drawRestoration;
})(globalThis);
