/* Original title illustration. Presentation only; never touches the game world or input. */
(function () {
  'use strict';
  const canvas = document.getElementById('title-art'), screen = document.getElementById('title-screen');
  const g = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0, height = 0, ratio = 1, start = performance.now(), frameId = 0;
  const points = [[126, 450], [272, 196], [438, 355], [362, 456], [524, 144]];
  const legs = points.slice(1).map((b, i) => ({ a: points[i], b, length: Math.hypot(b[0] - points[i][0], b[1] - points[i][1]) }));
  const total = legs.reduce((sum, leg) => sum + leg.length, 0);
  function pointAt(t) {
    let distance = Math.max(0, Math.min(1, t)) * total;
    for (const leg of legs) {
      if (distance <= leg.length) { const k = distance / leg.length; return [leg.a[0] + (leg.b[0] - leg.a[0]) * k, leg.a[1] + (leg.b[1] - leg.a[1]) * k]; }
      distance -= leg.length;
    }
    return points.at(-1);
  }
  function path(fraction) {
    let distance = fraction * total; g.beginPath(); g.moveTo(...points[0]);
    for (const leg of legs) {
      if (distance < leg.length) { g.lineTo(...pointAt(fraction)); break; }
      g.lineTo(...leg.b); distance -= leg.length;
    }
  }
  function circle(x, y, r, stroke, fill) {
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.stroke(); }
  }
  function draw(now) {
    frameId = 0;
    if (document.hidden || screen.hidden) return;
    const time = reduced.matches ? 4.6 : (now - start) / 1000 % 9;
    const progress = Math.min(1, Math.max(0, (time - 1.3) / 3.5));
    const firing = time >= 5.3 && time < 6.1, after = time >= 6.1;
    const fire = Math.min(1, Math.max(0, (time - 5.3) / .72));
    const accent = firing || after ? '#f6cc86' : '#a8f3ec';
    g.setTransform(ratio, 0, 0, ratio, 0, 0); g.clearRect(0, 0, width, height);
    const scale = Math.min(width / 640, height / 640);
    g.translate((width - 640 * scale) / 2, (height - 640 * scale) / 2); g.scale(scale, scale);
    const halo = g.createRadialGradient(330, 316, 12, 330, 316, 304);
    halo.addColorStop(0, '#19314580'); halo.addColorStop(.62, '#1d294333'); halo.addColorStop(1, '#10162500');
    g.fillStyle = halo; g.fillRect(0, 0, 640, 640);
    g.lineWidth = 1;
    circle(330, 316, 249, '#74899d30'); circle(330, 316, 227, '#74899d18'); circle(330, 316, 167, '#74899d14');
    g.strokeStyle = '#a9bfc326'; g.beginPath();
    for (let i = 0; i < 120; i++) {
      const a = i / 120 * Math.PI * 2, r = i % 10 === 0 ? 260 : 253;
      g.moveTo(330 + Math.cos(a) * 246, 316 + Math.sin(a) * 246); g.lineTo(330 + Math.cos(a) * r, 316 + Math.sin(a) * r);
    }
    g.stroke();
    g.font = '10px Consolas, monospace'; g.fillStyle = '#8b9ea9'; g.textAlign = 'center';
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 - Math.PI / 2; g.fillText(['00', '15', '30', '45'][i], 330 + Math.cos(a) * 279, 320 + Math.sin(a) * 279); }
    g.strokeStyle = '#94bac424'; g.setLineDash([2, 8]); g.beginPath(); g.moveTo(60, 316); g.lineTo(600, 316); g.moveTo(330, 46); g.lineTo(330, 586); g.stroke(); g.setLineDash([]);
    // Stationary hazards illustrate routing without implying another game mechanic.
    for (const [x, y] of [[193,251],[240,325],[331,205],[386,286],[453,447],[492,247],[341,389],[181,409],[397,176]]) {
      circle(x, y, 3, '#d9a27e90', '#edc6a8'); circle(x, y, 7, '#e6ad7520');
    }
    path(1); g.strokeStyle = '#b7e8e715'; g.lineWidth = 1; g.stroke();
    if (progress > 0) {
      path(progress); g.strokeStyle = firing ? '#eec08518' : '#a1eee914'; g.lineWidth = firing ? 24 : 12; g.stroke();
      path(progress); g.strokeStyle = accent; g.lineWidth = firing ? 2.8 : 1.4; g.shadowColor = accent; g.shadowBlur = firing ? 22 : 9; g.stroke(); g.shadowBlur = 0;
    }
    for (let i = 1; i < points.length - 1; i++) {
      const [x, y] = points[i], locked = progress * total >= legs.slice(0, i).reduce((sum, leg) => sum + leg.length, 0);
      const destroyed = after || firing && fire * total >= legs.slice(0, i).reduce((sum, leg) => sum + leg.length, 0);
      g.save(); g.translate(x, y);
      if (!destroyed) {
        g.beginPath(); g.moveTo(0, -13); g.lineTo(12, 10); g.lineTo(-12, 10); g.closePath(); g.fillStyle = '#381e2d'; g.fill(); g.strokeStyle = '#ef8b87'; g.lineWidth = 1.5; g.stroke(); circle(0, 0, 2.5, null, '#ffd2c0');
        if (locked) { circle(0, 0, 25, '#a8f3ec6a'); g.font = '11px Consolas, monospace'; g.fillStyle = '#bbddd9'; g.fillText('0' + i, 0, -36); }
      } else { circle(0, 0, 34 + Math.max(0, time - 5.4) * 12, '#edc48938'); g.fillStyle = '#e9c998'; g.fillText('0' + i, 0, -36); }
      g.restore();
    }
    const cursor = pointAt(firing ? fire : after ? 1 : progress);
    g.save(); g.translate(...cursor); g.rotate(Math.PI / 4); g.shadowColor = accent; g.shadowBlur = 22; g.fillStyle = '#f4faf1'; g.fillRect(-5, -5, 10, 10); g.strokeStyle = accent; g.strokeRect(-11, -11, 22, 22); g.restore();
    if (firing) { path(fire); g.lineWidth = 3.2; g.strokeStyle = '#fff5d6'; g.shadowColor = '#ffd38e'; g.shadowBlur = 18; g.stroke(); g.shadowBlur = 0; }
    g.font = '11px Consolas, monospace'; g.textAlign = 'left'; g.fillStyle = '#9cacb7'; g.fillText('ROUTE / ' + (firing || after ? 'EXECUTED' : progress >= 1 ? 'ARMED' : 'TRACING'), 78, 611);
    g.textAlign = 'right'; g.fillStyle = accent; g.fillText(firing || after ? '03 / EXECUTE' : time < 1.3 ? '01 / FREEZE' : '02 / DRAW', 578, 611);
    if (!reduced.matches) frameId = requestAnimationFrame(draw);
  }
  function requestDraw() { if (!frameId) frameId = requestAnimationFrame(draw); }
  new ResizeObserver(() => {
    const box = canvas.getBoundingClientRect(); width = box.width; height = box.height; ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); requestDraw();
  }).observe(canvas);
  new MutationObserver(() => { if (!screen.hidden) { start = performance.now(); requestDraw(); } }).observe(screen, { attributes: true, attributeFilter: ['hidden'] });
  document.addEventListener('visibilitychange', requestDraw); reduced.addEventListener('change', requestDraw);
})();
