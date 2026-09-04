(function (root) {
  'use strict';
  const { config: C, sim: S } = root.Deadline;
  const cyan = '#79e4f2', red = '#ff6971';
  const rgb = hex => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  const rgba = (hex, alpha) => { const color = rgb(hex); return `rgba(${color[0]},${color[1]},${color[2]},${alpha})`; };
  const mix = (from, to, amount) => {
    const a = rgb(from), b = rgb(to), t = Math.max(0, Math.min(1, amount));
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
  };
  class Renderer {
    constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false }); this.resize(); }
    resize() {
      const r = this.canvas.getBoundingClientRect();
      this.width = r.width; this.height = r.height; this.ratio = Math.min(devicePixelRatio || 1, C.render.maxPixelRatio);
      this.canvas.width = Math.round(r.width * this.ratio); this.canvas.height = Math.round(r.height * this.ratio);
      this.scale = Math.min(r.width / C.world.width, r.height / C.world.height);
      this.offsetX = (r.width - C.world.width * this.scale) / 2; this.offsetY = (r.height - C.world.height * this.scale) / 2;
    }
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
    enemy(enemy, colors, alpha = 1) {
      const g = this.ctx, r = C.enemy.radius - 2;
      g.save(); g.globalAlpha = alpha; g.fillStyle = colors.fill; g.strokeStyle = colors.stroke; g.lineWidth = 1.8;
      const sides = { aim: 3, fan: 5, burst: 0, rotate: 4, delay: 6 }[enemy.pattern] ?? 3;
      g.beginPath();
      if (!sides) g.arc(enemy.x, enemy.y, r, 0, Math.PI * 2);
      else { for (let i = 0; i < sides; i++) {
        const a = -Math.PI / 2 + i * Math.PI * 2 / sides, x = enemy.x + Math.cos(a) * (r + 2), y = enemy.y + Math.sin(a) * (r + 2);
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      } g.closePath(); }
      if (enemy.delayRemaining != null) g.fillStyle = colors.delayFill;
      g.fill(); g.stroke();
      if (enemy.pattern === 'rotate') {
        g.beginPath(); g.moveTo(enemy.x, enemy.y); g.lineTo(enemy.x + Math.cos(enemy.rotateAngle) * 21, enemy.y + Math.sin(enemy.rotateAngle) * 21); g.stroke();
      }
      if (enemy.delayRemaining != null) {
        const progress = 1 - enemy.delayRemaining / C.shooting.patterns.delay.warningSeconds;
        g.strokeStyle = colors.delayStroke; g.lineWidth = 2; g.beginPath(); g.arc(enemy.x, enemy.y, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, progress)); g.stroke();
        g.beginPath(); g.moveTo(enemy.x + Math.cos(enemy.delayAngle) * 18, enemy.y + Math.sin(enemy.delayAngle) * 18);
        g.lineTo(enemy.x + Math.cos(enemy.delayAngle) * 30, enemy.y + Math.sin(enemy.delayAngle) * 30); g.stroke();
      }
      this.circle(enemy.x, enemy.y, 3, null, colors.core); g.restore();
    }
    bullet(bullet, stopBlend) {
      // Pattern is communicated by the live projectile itself; no trails or prediction guides.
      const palette = { aim: ['#ffd6a8', '#ffae68'], fan: ['#ffc28a', '#f58a61'], burst: ['#ffaaa0', '#ef6f72'],
        rotate: ['#e9a0aa', '#cf6f80'], delay: ['#ffe0ad', '#ff966d'] }[bullet.pattern] || ['#ffd6a8', '#ffae68'];
      const colors = { fill: mix(palette[0], C.feedback.timeStopVisual.bulletFill, stopBlend), stroke: mix(palette[1], C.feedback.timeStopVisual.bulletStroke, stopBlend),
        halo: stopBlend > 0.5 ? C.feedback.timeStopVisual.bulletHalo : rgba(palette[1], 0.08) };
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
    practiceGuide(app) {
      if (!app.practice?.active || app.practice.step === 'running' || app.practice.step === 'complete') return;
      const g = this.ctx, w = app.world, touch = !!app.touchControls, time = performance.now() * 0.001;
      if (app.practice.step === 'move') {
        if (touch) return;
        const phase = app.reducedMotion ? 0.72 : (Math.sin(time * 3.4) + 1) * 0.5;
        const x = w.player.x + 34 + phase * 70, y = w.player.y - 28 - phase * 18;
        g.save(); g.setLineDash([5, 6]); g.strokeStyle = 'rgba(121,228,242,.55)'; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(w.player.x + 17, w.player.y - 10); g.lineTo(x - 13, y + 5); g.stroke(); g.setLineDash([]);
        this.circle(w.player.x + 72, w.player.y - 43, 7, 'rgba(121,228,242,.62)', 'rgba(121,228,242,.08)', 1.2);
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
      g.save(); this.path(points); g.setLineDash([8, 9]); g.lineDashOffset = app.reducedMotion ? 0 : -time * 18; g.strokeStyle = 'rgba(121,228,242,.42)'; g.lineWidth = 2; g.stroke(); g.setLineDash([]);
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i], angle = Math.atan2(b.y - a.y, b.x - a.x), x = a.x + (b.x - a.x) * .72, y = a.y + (b.y - a.y) * .72;
        g.save(); g.translate(x, y); g.rotate(angle); g.fillStyle = 'rgba(216,251,255,.72)'; g.beginPath(); g.moveTo(7, 0); g.lineTo(-5, -4); g.lineTo(-5, 4); g.closePath(); g.fill(); g.restore();
      }
      g.restore(); this.inputCue(point.x + 13, point.y + 17, touch, true);
    }
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
      g.fillStyle = `rgba(190,247,255,${(entering ? 0.13 : 0.055) * (1 - progress)})`; g.fillRect(0, 0, C.world.width, C.world.height);
      g.strokeStyle = `rgba(174,243,255,${alpha})`; g.lineWidth = entering ? 2.2 : 1.4;
      g.beginPath(); g.arc(fx.origin.x, fx.origin.y, Math.max(1, radius), 0, Math.PI * 2); g.stroke();
      g.strokeStyle = `rgba(121,228,242,${alpha * 0.35})`; g.lineWidth = 7;
      g.beginPath(); g.arc(fx.origin.x, fx.origin.y, Math.max(1, radius + 5), 0, Math.PI * 2); g.stroke();
      g.restore();
    }
    draw(app) {
      const g = this.ctx, w = app.world, stopBlend = app.timeFx?.blend || 0, stopVisual = C.feedback.timeStopVisual;
      const enemyColors = { fill: mix('#4b2b3a', stopVisual.enemyFill, stopBlend), stroke: mix('#ff6971', stopVisual.enemyStroke, stopBlend),
        core: mix('#ff9c9c', stopVisual.enemyCore, stopBlend), delayFill: mix('#875537', '#4d4747', stopBlend), delayStroke: mix('#ffd4a6', '#a69b94', stopBlend) };
      g.setTransform(this.ratio, 0, 0, this.ratio, 0, 0); g.fillStyle = mix('#0e1926', stopVisual.background, stopBlend); g.fillRect(0, 0, this.width, this.height);
      g.save(); g.translate(this.offsetX, this.offsetY); g.scale(this.scale, this.scale);
      g.beginPath(); g.rect(0, 0, C.world.width, C.world.height); g.clip();
      if (app.shake > 0 && !app.reducedMotion) {
        const strength = app.shake * (this.width < 650 ? C.feedback.mobileShakeScale : 1);
        g.translate((Math.random() - 0.5) * strength, (Math.random() - 0.5) * strength);
      }
      g.strokeStyle = mix('#162333', stopVisual.grid, stopBlend); g.lineWidth = 0.6; g.beginPath();
      for (let x = 40; x < C.world.width; x += 40) { g.moveTo(x, 24); g.lineTo(x, C.world.height - 24); }
      for (let y = 40; y < C.world.height; y += 40) { g.moveTo(24, y); g.lineTo(C.world.width - 24, y); }
      g.stroke(); g.strokeStyle = mix('#233549', stopVisual.innerBorder, stopBlend); g.strokeRect(24, 24, C.world.width - 48, C.world.height - 48);
      for (const e of w.enemies) if (e.alive) this.enemy(e, enemyColors);
      if (w.route) this.route(app, stopBlend);
      if (w.phase === 'stopped' && C.waves.definitions[w.waveIndex].oneStopRequired) {
        const locked = new Set(w.route.locks.map(lock => lock.enemyId)), pulse = 0.45 + (Math.sin(performance.now() * 0.009) + 1) * 0.18;
        for (const e of w.enemies) if (e.alive && !locked.has(e.id)) {
          this.circle(e.x, e.y, C.enemy.radius + 9, `rgba(255,177,110,${pulse})`, null, 2);
          this.circle(e.x, e.y, C.enemy.radius + 14, `rgba(255,105,113,${pulse * 0.45})`, null, 1);
        }
      }
      for (const hit of app.hits) {
        const k = hit.life / hit.maxLife, elapsed = hit.maxLife - hit.life, defeated = !!hit.defeated;
        const flash = Math.max(0, 1 - elapsed / C.feedback.executeVisual.hitFlashSeconds);
        if (hit.enemy && flash > 0) this.enemy(hit.enemy, { fill: '#d7fcff', stroke: '#ffffff', core: '#ffffff', delayFill: '#d7fcff', delayStroke: '#ffffff' }, 0.25 + flash * 0.7);
        const dx = hit.x - hit.from.x, dy = hit.y - hit.from.y, length = Math.hypot(dx, dy) || 1, nx = -dy / length, ny = dx / length;
        const slashLength = defeated ? 27 : 20, spread = defeated ? 5 : 3;
        g.save(); g.globalCompositeOperation = 'screen'; g.strokeStyle = `rgba(226,253,255,${Math.min(1, k * 1.5)})`; g.lineCap = 'round';
        for (const offset of [-spread, spread]) { g.lineWidth = defeated ? 2.5 : 1.7; g.beginPath(); g.moveTo(hit.x - nx * slashLength + dx / length * offset, hit.y - ny * slashLength + dy / length * offset); g.lineTo(hit.x + nx * slashLength + dx / length * offset, hit.y + ny * slashLength + dy / length * offset); g.stroke(); }
        this.circle(hit.x, hit.y, 10 + (1 - k) * (hit.last ? 38 : defeated ? 29 : 20), `rgba(121,228,242,${k * (defeated ? 0.95 : 0.65)})`, null, (defeated ? 2.4 : 1.5) * k);
        if (defeated && !app.reducedMotion) for (let i = 0; i < C.feedback.executeVisual.fragmentCount; i++) {
          const angle = i * Math.PI * 2 / C.feedback.executeVisual.fragmentCount + hit.order * 0.37, distance = (1 - k) * (hit.last ? 34 : 24);
          g.save(); g.translate(hit.x + Math.cos(angle) * distance, hit.y + Math.sin(angle) * distance); g.rotate(angle); g.globalAlpha = k * 0.75; g.fillStyle = i % 2 ? '#79e4f2' : '#e5fdff'; g.fillRect(-3, -1, 6, 2); g.restore();
        }
        g.restore();
      }
      for (const p of app.particles) {
        g.globalAlpha = Math.max(0, p.life / p.maxLife); g.fillStyle = p.color;
        g.save(); g.translate(p.x, p.y); g.rotate(p.angle); g.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); g.restore();
      }
      g.globalAlpha = 1;
      for (const echo of app.combatFx?.trail || []) {
        const k = echo.life / echo.maxLife; g.save(); g.translate(echo.x, echo.y); g.rotate(Math.PI / 4); g.globalAlpha = k * 0.2;
        g.fillStyle = '#9af2fb'; const er = C.player.radius * (0.45 + k * 0.2); g.fillRect(-er, -er, er * 2, er * 2); g.restore();
      }
      for (const bullet of w.bullets) this.bullet(bullet, stopBlend);
      const player = w.player;
      if (app.combatFx?.releasePulse > 0 && !app.reducedMotion) {
        const k = app.combatFx.releasePulse / C.feedback.executeVisual.releasePulseSeconds;
        this.circle(player.x, player.y, 14 + (1 - k) * 44, `rgba(121,228,242,${k * 0.7})`, null, 1.8 * k);
      }
      if (w.safetyRemaining > 0) this.circle(player.x, player.y, C.player.radius + 8, '#e7fcff', null, 1.5);
      this.circle(player.x, player.y, 15 + stopBlend * 9 + (w.phase === 'executing' ? 5 : 0), null, `rgba(121,228,242,${0.07 + stopBlend * 0.2 + (w.phase === 'executing' ? 0.1 : 0)})`);
      const damage = app.damageFx?.remaining > 0 ? app.damageFx.remaining / app.damageFx.max : 0;
      g.save(); g.translate(player.x + (damage && !app.reducedMotion ? Math.sin(damage * 35) * 2 : 0), player.y); g.rotate(Math.PI / 4);
      if (stopBlend > 0) { g.shadowColor = '#79e4f2'; g.shadowBlur = 6 + stopBlend * 12; }
      g.fillStyle = w.failed ? '#af4a60' : mix('#50b9ff', stopVisual.playerFill, stopBlend); g.strokeStyle = mix('#d8faff', stopVisual.playerStroke, stopBlend); g.lineWidth = 1.8 + stopBlend * 0.7;
      const r = C.player.radius * 0.75 * (damage ? 0.82 + (1 - damage) * 0.18 : 1); g.fillRect(-r, -r, r * 2, r * 2); g.strokeRect(-r, -r, r * 2, r * 2); g.restore();
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
    routeSection(route, start, end) {
      const g = this.ctx; g.beginPath(); const from = S.pointAt(route, start); g.moveTo(from.x, from.y);
      for (const leg of route.legs) if (leg.end > start && leg.end < end) g.lineTo(leg.b.x, leg.b.y);
      const to = S.pointAt(route, end); g.lineTo(to.x, to.y);
    }
    route(app, stopBlend = 0) {
      const g = this.ctx, w = app.world, route = w.route, executing = w.phase === 'executing';
      const stopVisual = C.feedback.timeStopVisual, visual = C.feedback.routeVisual;
      g.save(); g.lineJoin = 'round'; g.lineCap = 'round'; this.path(route.points);
      if (!executing) {
        g.strokeStyle = rgba(visual.outerGlow, visual.outerGlowAlpha * stopBlend); g.lineWidth = visual.outerGlowWidth; g.stroke();
        this.path(route.points); g.strokeStyle = rgba(visual.glow, C.render.routeGlowAlpha + stopBlend * (stopVisual.routeGlowAlpha - C.render.routeGlowAlpha)); g.lineWidth = C.render.routeGlowWidth + stopBlend * 4; g.stroke();
        this.path(route.points); g.strokeStyle = mix(cyan, visual.core, stopBlend); g.lineWidth = C.render.routeWidth + stopBlend * 0.9; g.stroke();
        if (route.length > 0) {
          this.path(route.points); g.setLineDash([visual.flowDash, visual.flowGap]);
          g.lineDashOffset = app.reducedMotion ? 0 : -(performance.now() * 0.001 * visual.flowSpeed) % (visual.flowDash + visual.flowGap);
          g.strokeStyle = `rgba(255,255,255,${0.12 + stopBlend * 0.16})`; g.lineWidth = 1.25; g.stroke(); g.setLineDash([]);
          const recentStart = Math.max(0, route.length - visual.recentLength);
          this.routeSection(route, recentStart, route.length); g.strokeStyle = rgba(visual.glow, app.routeFx?.drawing ? 0.3 : 0.17); g.lineWidth = visual.recentGlowWidth; g.stroke();
          this.routeSection(route, recentStart, route.length); g.strokeStyle = visual.recentCore; g.lineWidth = C.render.routeWidth + 0.45; g.globalAlpha = app.routeFx?.drawing ? 0.92 : 0.7; g.stroke(); g.globalAlpha = 1;
        }
      } else {
        if (w.execution.along < route.length) {
          this.routeSection(route, w.execution.along, route.length); g.strokeStyle = '#79e4f22e'; g.lineWidth = C.render.routeGlowWidth; g.stroke();
          this.routeSection(route, w.execution.along, route.length); g.strokeStyle = '#8dcbd35c'; g.lineWidth = C.render.routeWidth; g.stroke();
        }
        if (w.execution.along > 0) {
          this.routeSection(route, 0, w.execution.along); g.strokeStyle = '#79e4f238'; g.lineWidth = C.render.routeWidth + 0.8; g.stroke();
        }
      }
      if (!executing) for (const span of route.danger) {
        this.routeSection(route, Math.max(0, span.start - 2), Math.min(route.length, span.end + 2));
        g.strokeStyle = red; g.lineWidth = C.render.routeWidth + 0.5; g.stroke();
      }
      if (executing) {
        this.routeSection(route, Math.max(0, w.execution.along - C.feedback.trailLength), w.execution.along);
        g.strokeStyle = '#79e4f252'; g.lineWidth = C.render.routeGlowWidth; g.stroke();
        this.routeSection(route, Math.max(0, w.execution.along - C.feedback.trailLength), w.execution.along);
        g.strokeStyle = '#e7fdff'; g.lineWidth = C.render.routeWidth + 1.2; g.stroke();
      }
      if (route.points.length > 1) {
        const end = route.points[route.points.length - 1];
        if (executing) this.circle(end.x, end.y, 6, cyan, '#0b1420', 1.8);
        else {
          const animate = app.routeFx?.drawing && !app.reducedMotion;
          const pulse = animate ? (Math.sin(performance.now() * 0.014) + 1) * 0.5 : 0.35;
          this.circle(end.x, end.y, visual.tipHaloRadius + pulse * 2, rgba(visual.glow, 0.26 + pulse * 0.14), rgba(visual.glow, 0.07 + pulse * 0.04), 1.2);
          this.circle(end.x, end.y, visual.tipRadius + pulse * 0.55, '#d8fbff', visual.tip, 1.2);
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
        g.fillStyle = '#cef8ff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(lock.order), e.x, e.y - 33); g.restore();
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
