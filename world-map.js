(function (root) {
  'use strict';
  const J = root.Deadline.journey;
  // Coordinates are measured against the supplied photographs, not the retired SVG islands.
  // Both originals share this normalized viewport; their two-pixel width difference is 0.073%.
  const art = Object.freeze({ width: 1000, height: 558.139535, maxWidth: 2750,
    before: 'assets/world-map/before.jpeg', after: 'assets/world-map/after.jpeg' });
  const districts = Object.freeze([
    { x:500, y:480, shape:'M298 405 Q332 383 393 401 Q487 380 573 401 Q649 394 685 429 L696 558 H280 Q267 491 298 405Z' },
    { x:160, y:280, shape:'M0 122 Q78 98 130 150 Q209 143 278 192 Q323 230 325 310 L298 390 Q171 410 83 402 L0 390Z' },
    { x:835, y:270, shape:'M756 160 Q823 121 932 150 L1000 180 V558 H800 Q725 517 758 459 Q743 398 700 359 L715 260Z' },
    { x:495, y:118, shape:'M267 32 Q440 -10 620 17 Q717 42 732 119 L692 164 Q651 199 583 183 L560 153 Q506 135 452 159 L421 184 Q329 176 281 160Z' },
    { x:500, y:263, shape:'M449 168 Q500 123 554 171 Q591 194 571 228 L592 296 Q595 331 543 336 H455 Q406 331 411 296 L432 229 Q414 192 449 168Z' }
  ].map(Object.freeze));
  const paths = Object.freeze([
    'M500 462 C499 422 482 408 442 395 L366 361 Q343 350 325 320 L284 279 Q262 265 241 268 L174 279',
    'M174 279 L270 279 Q294 279 315 308 L348 342 Q360 351 388 350 L625 350 Q652 350 670 329 L727 296 Q752 286 818 278',
    'M831 269 Q777 264 750 237 L710 196 Q681 175 644 174 L611 163 Q578 146 515 126',
    'M496 135 Q489 161 491 187 L500 242',
    'M500 282 L500 354 Q494 389 500 409 L500 462'
  ]);
  const pulse = t => t < 0 || t > 2.8 ? 0 : Math.pow(Math.sin(Math.min(1,t/.8)*Math.PI),2)*.72 + (t>1?Math.pow(Math.sin(Math.min(1,(t-1)/1.5)*Math.PI),2):0);
  // Pure presentation values: no campaign state, training preference or combat mutations.
  function frame(state, reduced=false) {
    const final=state.mode==='synchronizing'||state.mode==='ending', ending=state.mode==='ending';
    const t=state.elapsed, ft=t/(reduced?4/8.4:1), sequence=final?J.finaleFrame(state,reduced):null;
    const spread=reduced?1:J.smooth((t-.2)/3.2);
    const reveal=districts.map((_,i)=>i>=state.restored?0:i===state.unlockFrom&&!ending?spread:1);
    const lights=districts.map((_,i)=>{
      if(i>=state.restored)return 0;
      if(ending||reduced)return 1;
      if(final){const answer=.24+.76*pulse(ft-i*.48);return answer+(sequence.lights[i]-answer)*J.smooth((ft-2.5)/1.5);}
      return i===state.unlockFrom?.3+.7*Math.max(pulse(t),J.smooth((t-2.4)/.9)):.75+.16*pulse(t-.45-i*.12);
    });
    return {reveal,lights,wire:sequence?sequence.wire:1,soak:reduced?1:J.smooth((t-.5)/3.1),
      full:ending?1:final?J.smooth((ft-4.95)/1.85):0,
      dim:final&&!ending?(ft<4.95?J.smooth((ft-4.4)/.55):1-J.smooth((ft-4.95)/1.85))*.12:0};
  }
  let serial=0;
  class WorldMapView {
    constructor(container,onSelect) {
      this.container=container;
      const id=`map-art-${++serial}`, h=art.height;
      container.innerHTML=`<img class="world-before" src="${art.before}" width="2752" height="1536" alt="光を失った電子都市。下の蛍庭区、左の工業区、右の水路、上の塔群、中央の核。" decoding="sync">
        <img class="world-after-source" src="${art.after}" width="2750" height="1536" alt="" hidden decoding="async">
        <svg class="world-diagram world-art" viewBox="0 0 1000 ${h}" aria-hidden="true">
          <defs>
            <filter id="${id}-feather" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="8"/></filter>
            <filter id="${id}-wire" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="4"/></filter>
            <mask id="${id}-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="${h}" style="mask-type:alpha">
              ${districts.map((d,i)=>`<path data-reveal="${i}" d="${d.shape}" fill="white" opacity="0" filter="url(#${id}-feather)"/>`).join('')}
              ${paths.map((d,i)=>`<path data-wire-reveal="${i}" d="${d}" fill="none" stroke="white" stroke-width="18" stroke-linecap="round" opacity="0" pathLength="100" filter="url(#${id}-wire)"/>`).join('')}
              <rect class="world-full-reveal" width="1000" height="${h}" fill="white" opacity="0"/>
            </mask>
          </defs>
          <image class="world-after" width="1000" height="${h}" preserveAspectRatio="none" mask="url(#${id}-mask)"/>
          <rect class="world-breath-dim" width="1000" height="${h}" fill="#030915" opacity="0"/>
          <g class="world-connections">${paths.map((d,i)=>`<g data-connection="${i}"><path class="connection-core" d="${d}"/><path class="connection-current" d="${d}" pathLength="100"/></g>`).join('')}</g>
          ${districts.map((d,i)=>`<g class="world-city" data-city="${i}" transform="translate(${d.x} ${d.y})"><circle class="city-aura" r="18"/><circle class="city-ring" r="7"/><path class="city-node" d="M0 -5Q1 -1 5 0Q1 1 0 5Q-1 1 -5 0Q-1 -1 0 -5Z"/></g>`).join('')}
          <g class="world-pico"><path d="M-18 4Q-33 15 -49 10"/><image href="assets/characters/pico-final.png" x="-18" y="-22" width="36" height="36"/></g>
        </svg>
        ${districts.map((d,i)=>`<button type="button" class="map-node" data-area="${i}" style="left:${d.x/10}%;top:${d.y/h*100}%" aria-label="AREA ${i+1} ${J.areas[i].name}"><span class="map-node-beacon" aria-hidden="true"></span><span class="map-node-label"><b><span class="map-node-number">${String(i+1).padStart(2,'0')}</span> ${J.areas[i].name}</b><small>${J.areas[i].ja}</small><em>LOCKED</em></span></button>`).join('')}
        <div class="map-art-message" role="status"><span>WORLD MAPを読み込んでいます…</span><button type="button" hidden>背景を再読み込み</button></div>`;
      this.buttons=[...container.querySelectorAll('[data-area]')];
      this.buttons.forEach((button,i)=>button.addEventListener('click',()=>onSelect(i)));
      this.cities=[...container.querySelectorAll('[data-city]')];
      this.connections=[...container.querySelectorAll('[data-connection]')];
      this.regions=[...container.querySelectorAll('[data-reveal]')];
      this.wires=[...container.querySelectorAll('[data-wire-reveal]')];
      this.full=container.querySelector('.world-full-reveal');this.dim=container.querySelector('.world-breath-dim');
      this.pico=container.querySelector('.world-pico');
      this.sources=[container.querySelector('.world-before'),container.querySelector('.world-after-source')];
      const message=container.querySelector('.map-art-message'), retry=message.querySelector('button');
      this.sources.forEach(image=>{
        image.addEventListener('load',()=>{image.dataset.loaded='ready';this.updateLoading();});
        image.addEventListener('error',()=>{image.dataset.loaded='error';this.updateLoading();});
        if(image.complete&&image.naturalWidth)image.dataset.loaded='ready';
      });
      retry.addEventListener('click',()=>{
        this.sources.filter(image=>image.dataset.loaded==='error').forEach(image=>{image.dataset.loaded='loading';image.src=image.getAttribute('src');});this.updateLoading();
      });
      this.updateLoading();
    }
    updateLoading() {
      const ready=this.sources.every(image=>image.dataset.loaded==='ready'), failed=this.sources.some(image=>image.dataset.loaded==='error');
      this.container.dataset.artStatus=ready?'ready':failed?'error':'loading';
      const message=this.container.querySelector('.map-art-message');message.hidden=ready;
      message.querySelector('span').textContent=failed?'WORLD MAPの背景を読み込めませんでした。':'WORLD MAPを読み込んでいます…';
      message.querySelector('button').hidden=!failed;
      if(this.sources[1].dataset.loaded==='ready')this.container.querySelector('.world-after').setAttribute('href',art.after);
    }
    render(state) {
      this.buttons.forEach((button,i)=>{
        const status=J.status(state,i), label=status==='online'?'RESTORED':status==='available'?'UNLOCKED':'LOCKED';
        button.dataset.status=this.cities[i].dataset.status=status;
        button.setAttribute('aria-current',i===Math.min(4,state.restored)?'location':'false');
        button.setAttribute('aria-label',`AREA ${i+1} ${J.areas[i].name} ${J.areas[i].ja} ${label}`);
        button.setAttribute('aria-pressed',String(state.selected===i));button.querySelector('em').textContent=(i===Math.min(4,state.restored)?'CURRENT · ':'')+label;
        this.cities[i].classList.toggle('is-selected',state.selected===i);
      });
      this.connections.forEach((wire,i)=>wire.dataset.powered=String(i<4?state.restored>i+1:state.restored===5));
      const current=districts[Math.min(4,state.restored)];this.pico.setAttribute('transform',`translate(${current.x-26} ${current.y-17})`);
      this.animationKey=null;
    }
    animate(state,reduced=false) {
      const key=`${state.mode}/${state.restored}/${state.elapsed}/${state.unlockFrom}/${reduced}`;
      if(this.animationKey===key)return;this.animationKey=key;
      const f=frame(state,reduced);
      this.regions.forEach((region,i)=>{
        const amount=f.reveal[i], d=districts[i], scale=.14+.86*amount;
        region.setAttribute('opacity',amount.toFixed(4));
        region.setAttribute('transform',`translate(${d.x} ${d.y}) scale(${scale}) translate(${-d.x} ${-d.y})`);
        this.cities[i].style.setProperty('--city-breath',f.lights[i].toFixed(3));
      });
      this.connections.forEach((wire,i)=>{
        const powered=wire.dataset.powered==='true', newWire=i===state.unlockFrom-1||(i===4&&state.restored===5);
        const amount=powered?(newWire?f.soak:1):0, mask=this.wires[i];
        mask.setAttribute('opacity',amount.toFixed(4));mask.setAttribute('stroke-dasharray','100');mask.setAttribute('stroke-dashoffset',String(100*(1-amount)));
        wire.style.setProperty('--wire-light',String(f.wire*amount*(1-f.full)));
        wire.style.setProperty('--soak-offset',String(100*(1-amount)));wire.style.setProperty('--soak-light',String(powered&&newWire?Math.sin(amount*Math.PI)*.22:0));
      });
      this.full.setAttribute('opacity',f.full.toFixed(4));this.dim.setAttribute('opacity',f.dim.toFixed(4));
      this.container.dataset.fullAfter=String(f.full===1);
    }
  }
  WorldMapView.art=art;WorldMapView.districts=districts;WorldMapView.frame=frame;
  root.Deadline.WorldMapView=WorldMapView;
  if(typeof module!=='undefined')module.exports={art,districts,frame};
})(globalThis);
