(function (root) {
  'use strict';
  const { config: C, sim: S } = root.Deadline;
  /** @typedef {{x: number, y: number}} Point */
  /**
   * Minimal renderer-facing shape. The renderer reads this state but never advances gameplay.
   * @typedef {Object} RenderAppState
   * @property {Object} world
   * @property {Object} timeFx
   * @property {Object} routeFx
   * @property {Object} touchDraw
   * @property {Object} combatFx
   * @property {boolean} touchControls
   * @property {boolean} reducedMotion
   */
  const cyan = '#8debf1', red = '#ff7395', gold = '#f4c565';
  const light = { core: '#fff7db', middle: '#ffdb85', outer: gold };
  // Presentation palette deliberately stays outside gameplay config.
  const frozenPalette = { background: '#080c1a', grid: '#101a29', innerBorder: '#273747',
    enemyFill: '#292532', enemyStroke: '#ad8797', enemyCore: '#dbc1c8',
    bulletFill: '#e6acbf', bulletStroke: '#c77498', bulletHalo: '#ed7aab10' };
  const rgb = hex => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  const rgba = (hex, alpha) => { const color = rgb(hex); return `rgba(${color[0]},${color[1]},${color[2]},${alpha})`; };
  const mix = (from, to, amount) => {
    const a = rgb(from), b = rgb(to), t = Math.max(0, Math.min(1, amount));
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
  };
  class Renderer {
    /** @param {HTMLCanvasElement} canvas */
    constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false }); this.resize(); }
    resize() {
      const r = this.canvas.getBoundingClientRect();
      this.width = r.width; this.height = r.height; this.ratio = Math.min(devicePixelRatio || 1, C.render.maxPixelRatio);
      this.canvas.width = Math.round(r.width * this.ratio); this.canvas.height = Math.round(r.height * this.ratio);
      this.scale = Math.min(r.width / C.world.width, r.height / C.world.height);
      this.offsetX = (r.width - C.world.width * this.scale) / 2; this.offsetY = (r.height - C.world.height * this.scale) / 2;
    }
    /**
     * @param {{clientX: number, clientY: number}} event
     * @returns {Point}
     */
    position(event) {
      const r = this.canvas.getBoundingClientRect();
      return { x: (event.clientX - r.left - this.offsetX) / this.scale, y: (event.clientY - r.top - this.offsetY) / this.scale };
    }
    contains(p) { return p.x >= 0 && p.x <= C.world.width && p.y >= 0 && p.y <= C.world.height; }
    circle(x, y, radius, stroke, fill, width = 1) {
      const g = this.ctx; g.beginPath(); g.arc(x, y, radius, 0, Math.PI * 2);
      if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = width; g.stroke(); }
    }
    path(points, closed = false) {
      const g = this.ctx; g.beginPath(); if (!points.length) return;
      g.moveTo(points[0].x, points[0].y); for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
      if (closed) g.closePath();
    }
    /** Draw a cached transparent sprite about its collision-center anchor. Never changes world state. */
    character(key, x, y, flash = 0) {
      const asset = root.Deadline.characters?.entries[key];
      if (asset?.status !== 'ready') return false;
      const g = this.ctx, left = x - asset.width * asset.anchorX, top = y - asset.height * asset.anchorY;
      g.drawImage(asset.stamp, left, top, asset.width, asset.height);
      if (flash > 0) {
        g.save(); g.globalAlpha *= Math.min(1, flash);
        g.drawImage(asset.flash, left, top, asset.width, asset.height); g.restore();
      }
      return true;
    }
    enemy(enemy, colors, alpha = 1, hitFlash = false) {
      const g = this.ctx, r = C.enemy.radius - 2;
      g.save(); g.globalAlpha = alpha; g.fillStyle = colors.fill; g.strokeStyle = colors.stroke; g.lineWidth = 1.8;
      const sprite = root.Deadline.characters?.enemyTypes[enemy.pattern];
      const hasSprite = this.character(sprite, enemy.x, enemy.y, hitFlash ? .85 : 0);
      if (hasSprite) {
        // The red danger rim remains separate from the larger cyan TARGET ring on every enemy silhouette.
        g.strokeStyle = '#ff7395'; g.lineWidth = 1;
        g.beginPath(); g.arc(enemy.x, enemy.y, C.enemy.radius + 2, .15 * Math.PI, .85 * Math.PI); g.stroke();
        if (enemy.pattern === 'fan') {
          g.beginPath();
          for (const dx of [-5, 0, 5]) { g.moveTo(enemy.x + dx, enemy.y + 19); g.lineTo(enemy.x + dx, enemy.y + 22); }
          g.stroke();
        }
      } else {
        const sides = { aim: 3, fan: 5, burst: 0, rotate: 4, delay: 6 }[enemy.pattern] ?? 3;
        g.beginPath();
        if (!sides) g.arc(enemy.x, enemy.y, r, 0, Math.PI * 2);
        else { for (let i = 0; i < sides; i++) {
          const a = -Math.PI / 2 + i * Math.PI * 2 / sides, x = enemy.x + Math.cos(a) * (r + 2), y = enemy.y + Math.sin(a) * (r + 2);
          if (i) g.lineTo(x, y); else g.moveTo(x, y);
        } g.closePath(); }
        if (enemy.delayRemaining != null) g.fillStyle = colors.delayFill;
        g.fill(); g.stroke();
        // Faceted casing stays within the original radius; type silhouettes remain distinct.
        g.save(); g.translate(enemy.x, enemy.y); g.strokeStyle = colors.stroke; g.globalAlpha *= .4;
        g.beginPath(); g.moveTo(-r * .62, r * .45); g.lineTo(0, -r * .56); g.lineTo(r * .62, r * .45); g.stroke();
        g.restore();
      }
      g.strokeStyle = hasSprite ? '#ff7395' : colors.stroke;
      if (enemy.pattern === 'rotate') {
        g.beginPath(); g.moveTo(enemy.x, enemy.y); g.lineTo(enemy.x + Math.cos(enemy.rotateAngle) * 21, enemy.y + Math.sin(enemy.rotateAngle) * 21); g.stroke();
      }
      if (enemy.delayRemaining != null) {
        const progress = 1 - enemy.delayRemaining / C.shooting.patterns.delay.warningSeconds;
        g.strokeStyle = hasSprite ? '#ed9cda' : colors.delayStroke; g.lineWidth = 2; g.beginPath(); g.arc(enemy.x, enemy.y, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, progress)); g.stroke();
        g.beginPath(); g.moveTo(enemy.x + Math.cos(enemy.delayAngle) * 18, enemy.y + Math.sin(enemy.delayAngle) * 18);
        g.lineTo(enemy.x + Math.cos(enemy.delayAngle) * 30, enemy.y + Math.sin(enemy.delayAngle) * 30); g.stroke();
      }
      if (!hasSprite) this.circle(enemy.x, enemy.y, 3, null, colors.core);
      g.restore();
    }
    bullet(bullet, stopBlend) {
      // Pattern is communicated by the live projectile itself; no trails or prediction guides.
      const palette = { aim: ['#ffc3cf', '#ed5478'], fan: ['#ffc1dd', '#dc538f'], burst: ['#ffbfc5', '#ff566e'],
        rotate: ['#ebcbff', '#ad78e6'], delay: ['#ffd1ed', '#e367bc'] }[bullet.pattern] || ['#ffc3cf', '#ed5478'];
      const colors = { fill: mix(palette[0], frozenPalette.bulletFill, stopBlend), stroke: mix(palette[1], frozenPalette.bulletStroke, stopBlend),
        halo: stopBlend > 0.5 ? frozenPalette.bulletHalo : rgba(palette[1], 0.11) };
      const g = this.ctx, r = C.shooting.bulletRadius;
      this.circle(bullet.x, bullet.y, r + 1.5, null, colors.halo);
      g.save(); g.translate(bullet.x, bullet.y); g.rotate(Math.atan2(bullet.vy, bullet.vx)); g.fillStyle = colors.fill; g.strokeStyle = colors.stroke; g.lineWidth = 1;
      if (bullet.pattern === 'fan') { g.beginPath(); g.moveTo(r + 1, 0); g.lineTo(0, r); g.lineTo(-r - 1, 0); g.lineTo(0, -r); g.closePath(); g.fill(); g.stroke(); }
      else if (bullet.pattern === 'rotate') { g.rotate(Math.PI / 4); g.fillRect(-r, -r, r * 2, r * 2); g.strokeRect(-r, -r, r * 2, r * 2); }
      else if (bullet.pattern === 'delay') { g.beginPath(); g.moveTo(r + 2, 0); g.lineTo(-r, r); g.lineTo(-r, -r); g.closePath(); g.fill(); g.stroke(); }
      else if (bullet.pattern === 'burst') { g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); g.stroke(); g.fillStyle = mix('#812c3d', '#726d69', stopBlend); g.beginPath(); g.arc(0, 0, 1.8, 0, Math.PI * 2); g.fill(); }
      else { g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); g.stroke(); }
      g.restore();
    }
    inputCue(x, y, touch, pressed = false) {
      const g = this.ctx; g.save(); g.translate(x, y); g.lineCap = 'round'; g.lineJoin = 'round';
      g.shadowColor = '#79e4f2'; g.shadowBlur = 7; g.strokeStyle = '#c8fbff'; g.fillStyle = '#071522'; g.lineWidth = 1.8;
      if (touch) {
        g.beginPath(); g.moveTo(-5, 12); g.lineTo(-5, -7); g.quadraticCurveTo(-5, -12, 0, -12); g.quadraticCurveTo(5, -12, 5, -7);
        g.lineTo(5, 1); g.lineTo(9, -1); g.quadraticCurveTo(16, -4, 17, 4); g.lineTo(14, 14); g.lineTo(-1, 14); g.closePath(); g.fill(); g.stroke();
        this.circle(0, -8, pressed ? 8 : 12, `rgba(121,228,242,${pressed ? 0.72 : 0.34})`, null, 1.2);
      } else {
        g.beginPath(); g.moveTo(-9, -6); g.quadraticCurveTo(-9, -14, 0, -14); g.quadraticCurveTo(9, -14, 9, -6);
        g.lineTo(9, 7); g.quadraticCurveTo(9, 14, 0, 14); g.quadraticCurveTo(-9, 14, -9, 7); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(0, -13); g.lineTo(0, -3); g.stroke();
        if (pressed) { g.fillStyle = 'rgba(121,228,242,.48)'; g.fillRect(-7.5, -12, 6.5, 8); }
      }
      g.restore();
    }
    /**
     * Draws the PAD-controlled cursor separately from the player, which must remain frozen during planning.
     * @param {RenderAppState} app
     */
    touchDrawCursor(app) {
      if (!app.touchControls || app.world.phase !== 'stopped' || !app.touchDraw?.cursor) return;
      const g = this.ctx, point = app.touchDraw.cursor, active = !!app.routeFx?.drawing;
      const pulse = app.reducedMotion ? 0 : (Math.sin(performance.now() * 0.008) + 1) * 0.5;
      g.save(); g.translate(point.x, point.y); g.globalCompositeOperation = 'screen';
      g.shadowColor = gold; g.shadowBlur = active ? 12 : 7;
      g.strokeStyle = active ? light.core : light.middle; g.lineWidth = active ? 1.8 : 1.35;
      g.beginPath(); g.moveTo(-12, 0); g.lineTo(-4, 0); g.moveTo(4, 0); g.lineTo(12, 0); g.moveTo(0, -12); g.lineTo(0, -4); g.moveTo(0, 4); g.lineTo(0, 12); g.stroke();
      this.circle(0, 0, 7 + pulse * 1.5, rgba(gold, active ? .72 : .45), rgba(gold,.08), 1.2);
      this.circle(0, 0, 1.7, null, light.core); g.restore();
    }
    practiceGuide(app) {
      if (!app.practice?.active || app.practice.step === 'running' || app.practice.step === 'complete') return;
      const g = this.ctx, w = app.world, touch = !!app.touchControls, time = performance.now() * 0.001;
      if (app.practice.step === 'move') {
        if (touch) return;
        const phase = app.reducedMotion ? 0.72 : (Math.sin(time * 3.4) + 1) * 0.5;
        const x = w.player.x + 34 + phase * 70, y = w.player.y - 28 - phase * 18;
        g.save(); g.setLineDash([5, 6]); g.strokeStyle = rgba(gold,.55); g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(w.player.x + 17, w.player.y - 10); g.lineTo(x - 13, y + 5); g.stroke(); g.setLineDash([]);
        this.circle(w.player.x + 72, w.player.y - 43, 7, rgba(gold,.62), rgba(gold,.08), 1.2);
        g.restore(); this.inputCue(x, y, false, false); return;
      }
      if (app.practice.step !== 'draw' || app.practice.drawStarted || w.phase !== 'stopped') return;
      const enemies = w.enemies.filter(enemy => enemy.alive), points = [{ ...w.player }, ...enemies.map(enemy => ({ x: enemy.x, y: enemy.y }))];
      if (points.length < 2) return;
      const last = points[points.length - 1]; points.push({ x: Math.min(C.world.width - 45, last.x + 105), y: Math.min(C.world.height - 45, last.y + 70) });
      const legs = []; let total = 0;
      for (let i = 1; i < points.length; i++) { const length = S.distance(points[i - 1], points[i]); legs.push({ a: points[i - 1], b: points[i], start: total, length }); total += length; }
      const progress = app.reducedMotion ? 0.62 : (time % 2.35) / 2.35, along = total * progress;
      let point = points[0]; for (const leg of legs) if (along >= leg.start && along <= leg.start + leg.length) { const t = (along - leg.start) / leg.length; point = { x: leg.a.x + (leg.b.x - leg.a.x) * t, y: leg.a.y + (leg.b.y - leg.a.y) * t }; break; }
      g.save(); this.path(points); g.setLineDash([8, 9]); g.lineDashOffset = app.reducedMotion ? 0 : -time * 18; g.strokeStyle = rgba(gold,.42); g.lineWidth = 2; g.stroke(); g.setLineDash([]);
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i], angle = Math.atan2(b.y - a.y, b.x - a.x), x = a.x + (b.x - a.x) * .72, y = a.y + (b.y - a.y) * .72;
        g.save(); g.translate(x, y); g.rotate(angle); g.fillStyle = rgba(light.middle,.72); g.beginPath(); g.moveTo(7, 0); g.lineTo(-5, -4); g.lineTo(-5, 4); g.closePath(); g.fill(); g.restore();
      }
      g.restore();
      if (touch) {
        g.save(); g.translate(point.x, point.y); g.globalCompositeOperation = 'screen'; g.shadowColor = gold; g.shadowBlur = 8;
        g.strokeStyle = light.core; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-10, 0); g.lineTo(10, 0); g.moveTo(0, -10); g.lineTo(0, 10); g.stroke();
        this.circle(0, 0, 6, rgba(light.middle,.7), rgba(gold,.08), 1.1); g.restore();
      } else this.inputCue(point.x + 13, point.y + 17, false, true);
    }
    /**
     * Draws presentation-only entry/exit feedback without altering STOP timing.
     * @param {RenderAppState} app
     */
    timeShock(app) {
      const g = this.ctx, fx = app.timeFx, settings = C.feedback.timeStopVisual;
      if (!fx) return;
      const entering = fx.enterRemaining > 0, exiting = !entering && fx.exitRemaining > 0;
      if (!entering && !exiting) return;
      const duration = entering ? settings.enterSeconds : settings.exitSeconds;
      const remaining = entering ? fx.enterRemaining : fx.exitRemaining;
      const progress = Math.max(0, Math.min(1, 1 - remaining / duration));
      const eased = 1 - Math.pow(1 - progress, 3), maxRadius = Math.hypot(C.world.width, C.world.height) * 0.68;
      const radius = app.reducedMotion ? 90 : entering ? 18 + maxRadius * eased : maxRadius * (1 - eased);
      const alpha = (entering ? 0.46 : 0.25) * (1 - progress);
      g.save(); g.globalCompositeOperation = 'screen';
      const wash = g.createRadialGradient(fx.origin.x, fx.origin.y, 0, fx.origin.x, fx.origin.y, 150);
      wash.addColorStop(0, rgba(gold, (entering ? .1 : .045) * (1 - progress)));
      wash.addColorStop(1, rgba(gold, 0));
      g.fillStyle = wash; g.fillRect(fx.origin.x - 150, fx.origin.y - 150, 300, 300);
      g.strokeStyle = rgba(light.middle, alpha); g.lineWidth = entering ? 2.2 : 1.4;
      g.beginPath(); g.arc(fx.origin.x, fx.origin.y, Math.max(1, radius), 0, Math.PI * 2); g.stroke();
      g.strokeStyle = rgba(gold, alpha * .35); g.lineWidth = 7;
      g.beginPath(); g.arc(fx.origin.x, fx.origin.y, Math.max(1, radius + 5), 0, Math.PI * 2); g.stroke();
      g.restore();
    }
    /** Cached dormant circuit city. Its state never changes with Wave progress or kills. */
    backdrop(stopBlend) {
      const g = this.ctx;
      g.drawImage(root.Deadline.battleArt.backdrop(this.scale * this.ratio), 0, 0, C.world.width, C.world.height);
      if (stopBlend > 0) { g.fillStyle = rgba('#000000', stopBlend * .38); g.fillRect(0, 0, C.world.width, C.world.height); }
      g.strokeStyle = mix('#354359', '#334a55', stopBlend); g.lineWidth = .8;
      g.strokeRect(24, 24, 912, 552);
      // Four cropped corners describe the real input bounds.
      g.strokeStyle = mix('#8399ab', '#98c3c0', stopBlend); g.lineWidth = 1.4; g.beginPath();
      for (const [x, y, dx, dy] of [[24,24,1,1],[936,24,-1,1],[24,576,1,-1],[936,576,-1,-1]]) {
        g.moveTo(x, y + dy * 13); g.lineTo(x, y); g.lineTo(x + dx * 13, y);
      }
      g.stroke();
    }
    /** A short wake follows observed player positions only. Its clock freezes with simulation time. */
    picoWake(app) {
      const w = app.world, g = this.ctx;
      if (this.wakeWorld !== w || app.reducedMotion || app.titleActive || app.briefingActive || w.failed ||
          !['normal', 'stopped'].includes(w.phase)) { this.wake = []; this.wakeWorld = w; }
      if (!this.wake) this.wake = [];
      if (!app.reducedMotion && !app.titleActive && !app.briefingActive && !w.failed && w.phase === 'normal') {
        this.wake = this.wake.filter(p => w.time >= p.time && w.time - p.time < .18);
        const previous = this.wake[this.wake.length - 1];
        if (!previous || S.distance(previous,w.player) > 1) {
          this.wake.push({x:w.player.x,y:w.player.y,time:w.time});
          if (this.wake.length > 12) this.wake.shift();
        }
      }
      g.save(); g.lineCap='round';
      for (let i=1;i<this.wake.length;i++) {
        const a=this.wake[i-1],b=this.wake[i],k=Math.max(0,1-(w.time-a.time)/.18);
        // Long pointer jumps retain only the final 48 logical pixels, keeping the field clear.
        const length=S.distance(a,b),trim=length>48?1-48/length:0;
        this.path([{x:a.x+(b.x-a.x)*trim,y:a.y+(b.y-a.y)*trim},b]);
        g.strokeStyle=rgba(gold,k*.07);g.lineWidth=7;g.stroke();
        g.strokeStyle=rgba(light.middle,k*.34);g.lineWidth=1.1;g.stroke();
      }
      g.restore();
    }
    picoHalo(player, stopBlend, executing, failed) {
      const g=this.ctx,r=executing?32:stopBlend>0?29:25;
      const wash=g.createRadialGradient(player.x,player.y+3,2,player.x,player.y+3,r);
      wash.addColorStop(0,rgba(light.middle,failed ? .045 : .2));
      wash.addColorStop(.4,rgba(gold,failed ? .02 : .09));wash.addColorStop(1,rgba(gold,0));
      g.fillStyle=wash;g.fillRect(player.x-r,player.y+3-r,r*2,r*2);
    }
    /** A warm echo of the completed path, fading before the next decision. */
    ignitionEcho(app) {
      const fx = app.artFx, g = this.ctx;
      if (!fx?.echo || fx.life <= 0) return;
      const k = fx.life / .65;
      g.save(); g.globalCompositeOperation = 'screen'; g.lineJoin = 'round'; g.lineCap = 'round';
      this.path(fx.echo); g.strokeStyle = rgba(gold, k * .075); g.lineWidth = 17 * k + 2; g.stroke();
      this.path(fx.echo); g.strokeStyle = rgba(gold, k * .58); g.lineWidth = 1.3; g.stroke();
      g.restore();
    }
    /** Localized energy release instead of a full-screen white strobe. */
    ignitionBurst(app) {
      const fx = app.artFx, g = this.ctx;
      if (!fx || fx.flash <= 0 || app.reducedMotion) return;
      const k = fx.flash / .22, p = fx.origin;
      g.save(); g.globalCompositeOperation = 'screen';
      const wash = g.createRadialGradient(p.x, p.y, 3, p.x, p.y, 180);
      wash.addColorStop(0, rgba(gold, k * .2)); wash.addColorStop(1, rgba(gold, 0));
      g.fillStyle = wash; g.fillRect(p.x - 180, p.y - 180, 360, 360);
      this.circle(p.x, p.y, 20 + (1 - k) * 130, rgba(gold, k * .55), null, 1.4);
      g.restore();
    }
    /**
     * Renders one frame from a read-only state snapshot. STOP color interpolation lives here so physics stays exact.
     * @param {RenderAppState} app
     */
    draw(app) {
      const g = this.ctx, w = app.world, stopBlend = app.timeFx?.blend || 0, stopVisual = frozenPalette;
      const enemyColors = { fill: mix('#42283e', stopVisual.enemyFill, stopBlend), stroke: mix('#f69399', stopVisual.enemyStroke, stopBlend),
        core: mix('#ffdad0', stopVisual.enemyCore, stopBlend), delayFill: mix('#875537', '#4d4747', stopBlend), delayStroke: mix('#ffd4a6', '#c5b099', stopBlend) };
      g.setTransform(this.ratio, 0, 0, this.ratio, 0, 0); g.fillStyle = mix('#10162a', stopVisual.background, stopBlend); g.fillRect(0, 0, this.width, this.height);
      g.save(); g.translate(this.offsetX, this.offsetY); g.scale(this.scale, this.scale);
      g.beginPath(); g.rect(0, 0, C.world.width, C.world.height); g.clip();
      if (app.shake > 0 && !app.reducedMotion) {
        const strength = app.shake * (this.width < 650 ? C.feedback.mobileShakeScale : 1);
        g.translate((Math.random() - 0.5) * strength, (Math.random() - 0.5) * strength);
      }
      this.backdrop(stopBlend); this.ignitionEcho(app); this.picoWake(app);
      for (const e of w.enemies) if (e.alive) this.enemy(e, enemyColors);
      if (w.route) this.route(app, stopBlend);
      if (w.phase === 'stopped' && C.waves.definitions[w.waveIndex].oneStopRequired) {
        const locked = new Set(w.route.locks.map(lock => lock.enemyId)), pulse = 0.45 + (Math.sin(performance.now() * 0.009) + 1) * 0.18;
        for (const e of w.enemies) if (e.alive && !locked.has(e.id)) {
          this.circle(e.x, e.y, C.enemy.radius + 9, rgba(cyan,pulse), null, 2);
          this.circle(e.x, e.y, C.enemy.radius + 14, rgba(cyan,pulse*.45), null, 1);
        }
      }
      for (const hit of app.hits) {
        const k = hit.life / hit.maxLife, elapsed = hit.maxLife - hit.life, defeated = !!hit.defeated;
        const flash = Math.max(0, 1 - elapsed / C.feedback.executeVisual.hitFlashSeconds);
        if (hit.enemy && flash > 0) this.enemy(hit.enemy, { fill: '#d7fcff', stroke: '#ffffff', core: '#ffffff', delayFill: '#d7fcff', delayStroke: '#ffffff' }, 0.25 + flash * 0.7, true);
        const dx = hit.x - hit.from.x, dy = hit.y - hit.from.y, length = Math.hypot(dx, dy) || 1, nx = -dy / length, ny = dx / length;
        const slashLength = defeated ? 27 : 20, spread = defeated ? 5 : 3;
        g.save(); g.globalCompositeOperation = 'screen'; g.strokeStyle = `rgba(255,239,199,${Math.min(1, k * 1.5)})`; g.lineCap = 'round';
        for (const offset of [-spread, spread]) { g.lineWidth = defeated ? 2.5 : 1.7; g.beginPath(); g.moveTo(hit.x - nx * slashLength + dx / length * offset, hit.y - ny * slashLength + dy / length * offset); g.lineTo(hit.x + nx * slashLength + dx / length * offset, hit.y + ny * slashLength + dy / length * offset); g.stroke(); }
        this.circle(hit.x, hit.y, 10 + (1 - k) * (hit.last ? 58 : defeated ? 40 : 20), rgba(gold, k * (defeated ? .95 : .65)), null, (defeated ? 2.4 : 1.5) * k);
        if (defeated) {
          const reach = app.reducedMotion ? 22 : 24 + (1 - k) * (hit.last ? 75 : 42);
          g.strokeStyle = rgba(gold, k * .8); g.lineWidth = 1;
          g.beginPath(); g.moveTo(hit.x - reach, hit.y + reach * .28); g.lineTo(hit.x + reach, hit.y - reach * .28); g.stroke();
        }
        if (defeated && !app.reducedMotion) for (let i = 0; i < C.feedback.executeVisual.fragmentCount; i++) {
          const angle = i * Math.PI * 2 / C.feedback.executeVisual.fragmentCount + hit.order * 0.37, distance = (1 - k) * (hit.last ? 34 : 24);
          g.save(); g.translate(hit.x + Math.cos(angle) * distance, hit.y + Math.sin(angle) * distance); g.rotate(angle); g.globalAlpha = k * 0.75; g.fillStyle = i % 2 ? gold : '#fff2d5'; g.fillRect(-5, -.8, 10, 1.6); g.restore();
        }
        g.restore();
      }
      for (const label of app.artFx?.scores || []) {
        const k = Math.min(1, label.life / .18);
        g.save(); g.globalAlpha = k; g.font = 'bold 12px Consolas, monospace'; g.textAlign = 'left';
        g.fillStyle = '#fce6bb'; g.shadowColor = '#080c1b'; g.shadowBlur = 4;
        g.fillText(`+${label.value}`, Math.min(880, label.x + 22), Math.max(48, label.y - 20 - (app.reducedMotion ? 0 : (.65 - label.life) * 24))); g.restore();
      }
      for (const p of app.particles) {
        g.globalAlpha = Math.max(0, p.life / p.maxLife); g.fillStyle = p.color;
        g.save(); g.translate(p.x, p.y); g.rotate(p.angle); g.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); g.restore();
      }
      g.globalAlpha = 1;
      for (const echo of app.combatFx?.trail || []) {
        const k = echo.life / echo.maxLife; g.save(); g.translate(echo.x, echo.y); g.rotate(Math.PI / 4); g.globalAlpha = k * 0.2;
        g.fillStyle = gold; const er = C.player.radius * (0.45 + k * 0.2); g.fillRect(-er, -er, er * 2, er * 2); g.restore();
      }
      for (const bullet of w.bullets) this.bullet(bullet, stopBlend);
      const player = w.player;
      if (app.combatFx?.releasePulse > 0 && !app.reducedMotion) {
        const k = app.combatFx.releasePulse / C.feedback.executeVisual.releasePulseSeconds;
        this.circle(player.x, player.y, 14 + (1 - k) * 44, rgba(gold, k * 0.7), null, 1.8 * k);
      }
      if (w.safetyRemaining > 0) this.circle(player.x, player.y, C.player.radius + 8, light.core, null, 1.5);
      this.picoHalo(player, stopBlend, w.phase === 'executing', w.failed);
      const damage = app.damageFx?.remaining > 0 ? app.damageFx.remaining / app.damageFx.max : 0;
      g.save(); g.translate(player.x + (damage && !app.reducedMotion ? Math.sin(damage * 35) * 2 : 0), player.y);
      if (w.failed) g.globalAlpha = .55;
      const pico = this.character('pico', 0, 0, w.phase === 'executing' ? .32 : damage * .7);
      if (!pico) {
        g.rotate(Math.PI / 4);
        if (stopBlend > 0) { g.shadowColor = gold; g.shadowBlur = 6 + stopBlend * 12; }
        g.fillStyle = w.failed ? '#af4a60' : '#ffecc7'; g.strokeStyle = '#fff5dc'; g.lineWidth = 1.5;
        const r = C.player.radius * 0.75 * (damage ? 0.82 + (1 - damage) * 0.18 : 1); g.fillRect(-r, -r, r * 2, r * 2); g.strokeRect(-r, -r, r * 2, r * 2);
        g.fillStyle = '#493b2d'; g.fillRect(-1.8, -1.8, 3.6, 3.6);
      }
      g.restore();
      if (!w.failed) {
        g.save(); g.strokeStyle = rgba(gold, .6); g.lineWidth = .8;
        g.beginPath(); g.moveTo(player.x - 17, player.y - 4); g.lineTo(player.x - 17, player.y + 4);
        g.moveTo(player.x + 17, player.y - 4); g.lineTo(player.x + 17, player.y + 4); g.stroke(); g.restore();
      }
      this.ignitionBurst(app);
      this.touchDrawCursor(app);
      this.practiceGuide(app);
      this.timeShock(app);
      if (damage > 0) { g.fillStyle = `rgba(255,53,70,${0.16 * damage})`; g.fillRect(0, 0, C.world.width, C.world.height); }
      if (app.debugEnabled && app.debugShapes) {
        this.circle(player.x, player.y, C.player.radius, '#e8f4ff');
        for (const e of w.enemies) if (e.alive) this.circle(e.x, e.y, C.enemy.radius, '#ff697180');
        for (const bullet of w.bullets) this.circle(bullet.x, bullet.y, C.shooting.bulletRadius, '#ffb16e');
        if (w.phase === 'stopped') for (const e of w.enemies) if (e.alive) this.circle(e.x, e.y, C.timeStop.lockRadius, '#79e4f23a');
      }
      g.restore();
    }
    /**
     * @param {Object} route
     * @param {number} start
     * @param {number} end
     */
    routeSection(route, start, end) {
      const g = this.ctx; g.beginPath(); const from = S.pointAt(route, start); g.moveTo(from.x, from.y);
      for (const leg of route.legs) if (leg.end > start && leg.end < end) g.lineTo(leg.b.x, leg.b.y);
      const to = S.pointAt(route, end); g.lineTo(to.x, to.y);
    }
    /**
     * Draws planning danger, TARGET order and EXECUTE progress from one compiled route.
     * @param {RenderAppState} app
     * @param {number} [stopBlend=0]
     */
    route(app, stopBlend = 0) {
      const g = this.ctx, w = app.world, route = w.route, executing = w.phase === 'executing';
      const visual = C.feedback.routeVisual;
      g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; this.path(route.points);
      if (!executing) {
        // Soft amber falloff surrounds a narrow ivory core on the exact compiled polyline.
        g.strokeStyle = rgba(light.outer,.045); g.lineWidth = 15; g.stroke();
        this.path(route.points); g.strokeStyle = rgba(light.outer,.09); g.lineWidth = 8; g.stroke();
        this.path(route.points); g.strokeStyle = rgba(light.middle,.42); g.lineWidth = 3.8; g.stroke();
        this.path(route.points); g.strokeStyle = mix(light.middle, light.core, .65 + stopBlend*.2); g.lineWidth = 1.65; g.stroke();
        if (route.length > 0) {
          this.path(route.points); g.setLineDash([visual.flowDash, visual.flowGap]);
          g.lineDashOffset = app.reducedMotion ? 0 : -(performance.now() * 0.001 * visual.flowSpeed) % (visual.flowDash + visual.flowGap);
          g.strokeStyle = rgba(light.core,.12 + stopBlend*.16); g.lineWidth = 1.15; g.stroke(); g.setLineDash([]);
          const recentStart = Math.max(0, route.length - visual.recentLength);
          this.routeSection(route, recentStart, route.length); g.strokeStyle = rgba(gold, app.routeFx?.drawing ? .22 : .1); g.lineWidth = visual.recentGlowWidth; g.stroke();
          this.routeSection(route, recentStart, route.length); g.strokeStyle = light.core; g.lineWidth = 1.7; g.globalAlpha = app.routeFx?.drawing ? .96 : .7; g.stroke(); g.globalAlpha = 1;
          // Direction cues follow the compiled polyline; they never smooth or shortcut it.
          for (let d = 70; d < route.length; d += Math.max(100, route.length / 20)) {
            const a = S.pointAt(route, d - 3), b = S.pointAt(route, d + 3);
            g.save(); g.translate(b.x, b.y); g.rotate(Math.atan2(b.y - a.y, b.x - a.x));
            g.strokeStyle = rgba(light.middle,.48); g.lineWidth = .8; g.beginPath(); g.moveTo(-4, -3); g.lineTo(0, 0); g.lineTo(-4, 3); g.stroke(); g.restore();
          }
          // At most 16 small light motes travel along the real route. No smoothing or extra control points.
          const count=Math.min(16,Math.floor(route.length/55)),now=app.reducedMotion?0:performance.now()*.001;
          for (let i=0;i<count;i++) {
            const d=(i*route.length/count+now*15)%route.length;
            if (route.danger.some(span=>d>=span.start-5 && d<=span.end+5)) continue;
            const p=S.pointAt(route,d),q=S.pointAt(route,Math.max(0,d-2));
            const angle=Math.atan2(p.y-q.y,p.x-q.x),offset=(i%2?1:-1)*2.4;
            this.circle(p.x-Math.sin(angle)*offset,p.y+Math.cos(angle)*offset,.65,null,rgba(light.middle,app.routeFx?.drawing ? .5 : .28));
          }
        }
      } else {
        if (w.execution.along < route.length) {
          this.routeSection(route, w.execution.along, route.length); g.strokeStyle = rgba(gold,.09); g.lineWidth = C.render.routeGlowWidth; g.stroke();
          this.routeSection(route, w.execution.along, route.length); g.strokeStyle = rgba(light.middle,.38); g.lineWidth = 1.7; g.stroke();
        }
        if (w.execution.along > 0) {
          this.routeSection(route, 0, w.execution.along); g.strokeStyle = rgba(gold,.16); g.lineWidth = 12; g.stroke();
          this.routeSection(route, 0, w.execution.along); g.strokeStyle = rgba(light.middle,.7); g.lineWidth = 1.7; g.stroke();
        }
      }
      if (!executing) for (const span of route.danger) {
        this.routeSection(route, Math.max(0, span.start - 2), Math.min(route.length, span.end + 2));
        g.strokeStyle = '#150d1f'; g.lineWidth = 7; g.stroke();
        g.strokeStyle = red; g.lineWidth = 3.6; g.stroke();
        const p = S.pointAt(route, (span.start + span.end) / 2);
        g.strokeStyle = red; g.lineWidth = 1.4; g.beginPath(); g.moveTo(p.x - 4, p.y - 12); g.lineTo(p.x + 4, p.y - 20); g.moveTo(p.x + 4, p.y - 12); g.lineTo(p.x - 4, p.y - 20); g.stroke();
      }
      if (executing) {
        this.routeSection(route, Math.max(0, w.execution.along - C.feedback.trailLength), w.execution.along);
        g.strokeStyle = rgba(gold,.16); g.lineWidth = 19; g.stroke();
        this.routeSection(route, Math.max(0, w.execution.along - C.feedback.trailLength), w.execution.along);
        g.strokeStyle = light.middle; g.lineWidth = 4.2; g.stroke();
        g.strokeStyle = light.core; g.lineWidth = 2; g.shadowColor = gold; g.shadowBlur = app.reducedMotion ? 0 : 12; g.stroke(); g.shadowBlur = 0;
      }
      if (route.points.length > 1) {
        const end = route.points[route.points.length - 1];
        if (executing) this.circle(end.x, end.y, 6, light.middle, '#1b1720', 1.8);
        else {
          const animate = app.routeFx?.drawing && !app.reducedMotion;
          const pulse = animate ? (Math.sin(performance.now() * 0.014) + 1) * 0.5 : 0.35;
          this.circle(end.x, end.y, visual.tipHaloRadius + pulse * 2, rgba(gold,.26+pulse*.14), rgba(gold,.07+pulse*.04), 1.2);
          this.circle(end.x, end.y, visual.tipRadius + pulse * .55, light.middle, light.core, 1.2);
        }
      }
      for (const lock of route.locks) {
        const e = w.enemies.find(enemy => enemy.id === lock.enemyId); if (!e?.alive) continue;
        const strength = Math.min(5, lock.order);
        g.save(); g.shadowColor = '#79e4f2'; g.shadowBlur = strength * 1.8;
        if (!executing) this.circle(e.x, e.y, C.enemy.radius + 5, 'rgba(162,235,242,0.62)', 'rgba(121,228,242,0.035)', 1.1);
        g.strokeStyle = '#a2ebf2'; g.lineWidth = 1.2 + strength * 0.16; g.beginPath();
        for (const x of [-1, 1]) for (const y of [-1, 1]) {
          g.moveTo(e.x + x * 17, e.y + y * 22); g.lineTo(e.x + x * 22, e.y + y * 22); g.lineTo(e.x + x * 22, e.y + y * 17);
        }
        g.stroke(); g.font = `bold ${Math.max(12, 8 / this.scale)}px Consolas, monospace`;
        g.fillStyle = '#0c1e2b'; g.fillRect(e.x - 12, e.y - 43, 24, 18); g.strokeStyle = '#a8eee788'; g.lineWidth = .7; g.strokeRect(e.x - 12, e.y - 43, 24, 18);
        g.fillStyle = '#d8fff0'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(lock.order).padStart(2, '0'), e.x, e.y - 33); g.restore();
      }
      if (!executing) for (const flash of app.routeFx?.lockFlashes || []) {
        const e = w.enemies.find(enemy => enemy.id === flash.enemyId); if (!e?.alive) continue;
        const progress = 1 - flash.life / visual.lockFlashSeconds;
        const radius = C.enemy.radius + 5 + (app.reducedMotion ? 3 : visual.lockFlashExpand * progress);
        g.save(); g.globalCompositeOperation = 'screen'; g.shadowColor = visual.glow; g.shadowBlur = app.reducedMotion ? 5 : 12;
        this.circle(e.x, e.y, radius, rgba(visual.core, Math.max(0, 0.9 * (1 - progress))), null, 2.4 - progress);
        g.restore();
      }
      g.restore();
    }
  }
  root.Deadline.Renderer = Renderer;
})(globalThis);
