/* Original deterministic route geometry and real-time simulation. No prediction engine. */
(function (root) {
  'use strict';
  const C = root.Deadline.config, EPS = 1e-8;

  /**
   * World-space coordinate in the fixed 960 x 600 simulation.
   * @typedef {{x: number, y: number}} Point
   */
  /**
   * @typedef {Object} Enemy
   * @property {number} id
   * @property {number} x
   * @property {number} y
   * @property {number} vx
   * @property {number} vy
   * @property {boolean} alive
   * @property {number} hp
   * @property {'aim'|'fan'|'burst'|'rotate'|'delay'} pattern
   * @property {number} shotRemaining
   * @property {number} shotCount
   */
  /**
   * @typedef {Object} Bullet
   * @property {number} id
   * @property {number} enemyId
   * @property {number} x
   * @property {number} y
   * @property {number} vx
   * @property {number} vy
   * @property {number} life
   * @property {boolean} grazed
   * @property {string} pattern
   */
  /** @typedef {{a: Point, b: Point, start: number, end: number, length: number}} RouteLeg */
  /** @typedef {{enemyId: number, along: number, point: Point, order: number}} TargetLock */
  /** @typedef {{start: number, end: number}} DangerSpan */
  /**
   * Values restored when retrying the same Wave; attempt-local gauge and bullets are intentionally absent.
   * @typedef {Object} WaveSnapshot
   * @property {Point} player
   * @property {number} score
   * @property {number} maxChain
   * @property {number} perfectExecutions
   * @property {number} hitsTaken
   * @property {number} totalKills
   * @property {number} nextEnemyId
   * @property {number} nextBulletId
   */
  /**
   * Distance cursor for the current high-speed traversal.
   * @typedef {Object} ExecutionState
   * @property {number} along
   * @property {number} lockIndex
   * @property {number} duration
   * @property {number} speed
   * @property {number} kills
   * @property {number} pause
   * @property {number} elapsed
   */
  /**
   * Derived route data. `points` is the editable source; every other field is rebuilt from it.
   * @typedef {Object} RoutePlan
   * @property {Point[]} points
   * @property {RouteLeg[]} legs
   * @property {number} length
   * @property {TargetLock[]} locks
   * @property {DangerSpan[]} danger
   */
  /**
   * Simulation-owned state. DOM, Canvas and Audio objects are deliberately excluded so tests can run in Node.
   * @typedef {Object} GameWorld
   * @property {Point} player
   * @property {Enemy[]} enemies
   * @property {Bullet[]} bullets
   * @property {'normal'|'stopped'|'executing'|'wave-clear'|'failed'|'one-stop-failed'|'rule-preview'|'rule-intro'|'complete'|'practice-complete'} phase
   * @property {number} gauge
   * @property {number} stopRemaining
   * @property {?RoutePlan} route
   * @property {?ExecutionState} execution
   * @property {number} wave
   * @property {number} waveIndex
   * @property {?WaveSnapshot} waveStartSnapshot
   * @property {Object[]} events
   */
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const copyPoint = p => ({ x: p.x, y: p.y });
  const currentWave = w => C.waves.definitions[w.waveIndex];
  const aimAngle = (w, enemy) => Math.atan2(w.player.y - enemy.y, w.player.x - enemy.x);
  const bounded = p => ({ x: clamp(p.x, C.world.margin, C.world.width - C.world.margin), y: clamp(p.y, C.world.margin, C.world.height - C.world.margin) });
  /**
   * Returns the normalized interval where a segment overlaps a circle.
   * The interval form lets route warnings mark the whole dangerous span while collision checks use its first point.
   * @param {Point} a
   * @param {Point} b
   * @param {Point} center
   * @param {number} radius
   * @returns {?DangerSpan}
   */
  function circleInterval(a, b, center, radius) {
    // Cheap rejection matters when a long drawn route is checked against dense bullets.
    if (center.x < Math.min(a.x, b.x) - radius || center.x > Math.max(a.x, b.x) + radius ||
        center.y < Math.min(a.y, b.y) - radius || center.y > Math.max(a.y, b.y) + radius) return null;
    const x = a.x - center.x, y = a.y - center.y, dx = b.x - a.x, dy = b.y - a.y;
    const aa = dx * dx + dy * dy, cc = x * x + y * y - radius * radius;
    if (aa < EPS) return cc <= EPS ? { start: 0, end: 1 } : null;
    const bb = 2 * (x * dx + y * dy), disc = bb * bb - 4 * aa * cc;
    if (disc < -EPS) return null;
    const root = Math.sqrt(Math.max(0, disc)), lo = (-bb - root) / (2 * aa), hi = (-bb + root) / (2 * aa);
    return hi < -EPS || lo > 1 + EPS ? null : { start: clamp(lo, 0, 1), end: clamp(hi, 0, 1) };
  }
  function segmentCircleTime(a, b, center, radius) { return circleInterval(a, b, center, radius)?.start ?? null; }
  /**
   * Rebuilds all route-derived data from editable points.
   * Keeping locks and danger spans derived prevents Undo, Clear and point thinning from leaving stale results.
   * @param {Point[]} points
   * @param {GameWorld} w
   * @returns {RoutePlan}
   */
  function compileRoute(points, w) {
    const route = { points: points.map(copyPoint), legs: [], length: 0, locks: [], danger: [] }, locked = new Set();
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], length = distance(a, b);
      if (length < EPS) continue;
      const start = route.length; route.length += length;
      route.legs.push({ a: copyPoint(a), b: copyPoint(b), start, end: route.length, length });
      for (const e of w.enemies) {
        if (!e.alive || locked.has(e.id)) continue;
        const t = segmentCircleTime(a, b, e, C.timeStop.lockRadius);
        if (t !== null) { locked.add(e.id); route.locks.push({ enemyId: e.id, along: start + length * t, point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t } }); }
      }
      // Only geometry against CURRENT stationary bullets, never their future motion.
      for (const bullet of w.bullets) {
        const span = circleInterval(a, b, bullet, C.player.radius + C.shooting.bulletRadius);
        if (span) route.danger.push({ start: start + length * span.start, end: start + length * span.end });
      }
    }
    route.locks.sort((a, b) => a.along - b.along || a.enemyId - b.enemyId);
    route.locks.forEach((lock, i) => { lock.order = i + 1; });
    route.danger.sort((a, b) => a.start - b.start);
    const merged = [];
    for (const span of route.danger) { const last = merged[merged.length - 1]; if (last && span.start <= last.end + EPS) last.end = Math.max(last.end, span.end); else merged.push({ ...span }); }
    route.danger = merged;
    return route;
  }
  function pointAt(route, along) {
    for (const leg of route.legs) if (along <= leg.end + EPS) {
      const t = clamp((along - leg.start) / leg.length, 0, 1);
      return { x: leg.a.x + (leg.b.x - leg.a.x) * t, y: leg.a.y + (leg.b.y - leg.a.y) * t };
    }
    return copyPoint(route.points[route.points.length - 1]);
  }
  function spawnEnemies(player, nextId, waveIndex) {
    const wave = C.waves.definitions[waveIndex];
    return wave.enemies.map((p, i) => {
      let x = p.x, y = p.y;
      if (distance({ x, y }, player) < C.enemy.spawnClearance) {
        x = C.world.width - x; y = C.world.height - y;
        if (distance({ x, y }, player) < C.enemy.spawnClearance) {
          x = player.x < C.world.width / 2 ? C.world.width - 120 : 120;
          y = player.y < C.world.height / 2 ? C.world.height - 120 : 120;
        }
      }
      const speed = Math.max(0, wave.enemySpeed);
      return { id: nextId + i, x, y, vx: Math.cos(p.angle) * speed, vy: Math.sin(p.angle) * speed,
        alive: true, hp: Math.max(1, Math.floor(wave.enemyHp)), pattern: p.type,
        shotCount: Math.max(0, Math.floor(wave.counts[p.type] ?? C.shooting.patterns[p.type].count)),
        fireIntervalScale: Math.max(C.world.fixedStep, wave.fireIntervalScale), bulletSpeedScale: Math.max(0, wave.bulletSpeedScale),
        burstRemaining: 0, burstTimer: 0, rotateAngle: p.angle, delayRemaining: null, delayAngle: 0,
        shotRemaining: C.shooting.firstShotDelay + i * C.shooting.initialStagger };
    });
  }
  function makeWaveSnapshot(w) {
    return { player: copyPoint(w.player), score: w.score, maxChain: w.maxChain,
      perfectExecutions: w.perfectExecutions, hitsTaken: w.hitsTaken, totalKills: w.totalKills,
      nextEnemyId: w.nextEnemyId, nextBulletId: w.nextBulletId };
  }
  /**
   * Starts a Wave from data and records its rollback boundary before any score can be earned.
   * @param {GameWorld} w
   * @param {number} waveIndex
   * @param {?WaveSnapshot} retrySnapshot
   * @returns {void}
   */
  function beginWave(w, waveIndex, retrySnapshot = null) {
    w.waveStartSnapshot = retrySnapshot || makeWaveSnapshot(w);
    w.waveIndex = waveIndex; w.wave = C.waves.definitions[waveIndex].number;
    w.enemies = spawnEnemies(w.player, w.nextEnemyId, waveIndex); w.nextEnemyId += w.enemies.length;
    w.bullets.length = 0; w.failed = false; w.life = 1; w.phase = 'normal'; w.safetyRemaining = 0; w.waveGraceRemaining = C.waves.startGraceSeconds;
    w.waveBannerRemaining = C.waves.bannerSeconds; w.transitionRemaining = 0;
    w.pendingWaveIndex = null; w.oneStopFailure = null; w.route = null; w.execution = null; w.stopRemaining = 0;
    w.stopGaugeBefore = 0; w.stopTargetCount = 0; w.stopScoreBefore = w.score; w.stopMaxChainBefore = w.maxChain; w.lastKills = 0;
    w.timeLimitMultiplier = C.waves.timeLimitAssist.standard;
    w.events.push({ type: 'waveStart', wave: w.wave });
  }
  /** @returns {GameWorld} A fresh deterministic run beginning at Wave 1. */
  function createWorld() {
    const player = copyPoint(C.player.start);
    const w = { player, enemies: [], nextEnemyId: 1,
      bullets: [], nextBulletId: 1, time: 0, life: 1, failed: false, phase: 'normal',
      gauge: clamp(C.gauge.initial, 0, C.gauge.max), stopGaugeBefore: 0, safetyRemaining: 0, waveGraceRemaining: 0,
      stopRemaining: 0, route: null, execution: null, lastKills: 0, totalKills: 0, score: 0, maxChain: 0, perfectExecutions: 0, hitsTaken: 0,
      wave: 1, waveIndex: 0, waveBannerRemaining: 0, transitionRemaining: 0, pendingWaveIndex: null, oneStopFailure: null, waveStartSnapshot: null,
      waveFailures: Array(C.waves.definitions.length).fill(0), timeLimitMultiplier: C.waves.timeLimitAssist.standard, lastWavePerfect: false, events: [] };
    beginWave(w, 0); return w;
  }
  function recordWaveFailure(w) {
    const count = (w.waveFailures[w.waveIndex] || 0) + 1; w.waveFailures[w.waveIndex] = count; return count;
  }
  function availableTimeLimitMultipliers(w) {
    const assist = C.waves.timeLimitAssist, failures = w.waveFailures[w.waveIndex] || 0, values = [assist.standard];
    if (failures >= assist.firstUnlockFailures) values.push(assist.first);
    if (failures >= assist.secondUnlockFailures) values.push(assist.second);
    return values;
  }
  function fail(w) {
    if (w.failed) return;
    w.failed = true; w.life = 0; w.phase = 'failed'; w.lastKills = w.execution?.kills || 0; w.hitsTaken++;
    const failures = recordWaveFailure(w); w.events.push({ type: 'fail', ...w.player, failures });
  }
  function movePlayer(w, position) {
    if (w.phase !== 'normal') return;
    const end = bounded(position), contact = collisionPoint(w, w.player, end);
    if (!contact) for (const bullet of w.bullets) graze(w, bullet, w.player, end, bullet);
    w.player = contact || end; if (contact) fail(w);
  }
  const immune = w => w.phase === 'normal' && (w.safetyRemaining > EPS || w.waveGraceRemaining > EPS);
  function graze(w, bullet, a, b, center) {
    if (w.phase !== 'normal' || immune(w) || bullet.grazed || C.gauge.nearMissGain <= 0) return;
    if (segmentCircleTime(a, b, center, C.gauge.nearMissRadius) !== null &&
        segmentCircleTime(a, b, center, C.player.radius + C.shooting.bulletRadius) === null) {
      bullet.grazed = true; w.gauge = Math.min(C.gauge.max, w.gauge + C.gauge.nearMissGain);
    }
  }
  function canStop(w) { return w.phase === 'normal' && w.gauge >= C.gauge.max - EPS; }
  /**
   * Freezes simulation-owned actors and creates the only editable route for this STOP.
   * @param {GameWorld} w
   * @returns {void}
   */
  function stopTime(w) {
    if (!canStop(w)) return;
    w.stopGaugeBefore = w.gauge; w.gauge = Math.max(0, w.gauge - C.gauge.cost);
    w.phase = 'stopped'; w.stopRemaining = (currentWave(w).timeStopSeconds ?? C.timeStop.seconds) * w.timeLimitMultiplier;
    w.stopTargetCount = w.enemies.filter(e => e.alive).length; w.stopScoreBefore = w.score; w.stopMaxChainBefore = w.maxChain;
    w.route = compileRoute([w.player], w); w.execution = null;
    w.events.push({ type: 'stop' });
  }
  function clearRoute(w) { if (w.phase === 'stopped') w.route = compileRoute([w.player], w); }
  function undoRoute(w) {
    if (w.phase === 'stopped' && w.route.points.length > 1) w.route = compileRoute(w.route.points.slice(0, -1), w);
  }
  function cancelStop(w) {
    if (w.phase !== 'stopped') return;
    w.gauge = clamp(w.stopGaugeBefore - C.gauge.cancelCost, 0, C.gauge.max);
    w.route = null; w.stopRemaining = 0; w.events.push({ type: 'cancel' });
    if (currentWave(w).oneStopRequired) failOneStop(w, 'cancel', 0, w.stopTargetCount);
    else w.phase = 'normal';
  }
  /**
   * Adds pointer or MOVE PAD input to the shared route pipeline.
   * Nearly collinear points are collapsed to keep high-frequency input from inflating target and danger checks.
   * @param {GameWorld} w
   * @param {Point} position
   * @returns {void}
   */
  function addRoutePoint(w, position) {
    if (w.phase !== 'stopped') return;
    const end = bounded(position), points = w.route.points.map(copyPoint), last = points[points.length - 1];
    if (distance(last, end) < C.drawing.pointSpacing) return;
    if (points.length > 1) {
      const a = points[points.length - 2], length = distance(a, end);
      const cross = (last.x - a.x) * (end.y - a.y) - (last.y - a.y) * (end.x - a.x);
      const forward = (last.x - a.x) * (end.x - last.x) + (last.y - a.y) * (end.y - last.y);
      if (forward > 0 && length > distance(a, last) && Math.abs(cross) / length < 0.35) points.pop();
    }
    points.push(end);
    const previousLocks = new Set(w.route.locks.map(lock => lock.enemyId));
    w.route = compileRoute(points.length >= C.drawing.maxPoints ? points.filter((_, i) => i === 0 || i % 2 === 1 || i === points.length - 1) : points, w);
    for (const lock of w.route.locks) if (!previousLocks.has(lock.enemyId)) w.events.push({ type: 'lock', enemyId: lock.enemyId, order: lock.order });
  }
  /**
   * Converts the immutable planned route into a distance-based execution cursor.
   * World actors remain frozen until that cursor reaches the route endpoint.
   * @param {GameWorld} w
   * @param {boolean} [timedOut=false]
   * @returns {void}
   */
  function executeRoute(w, timedOut = false) {
    if (w.phase !== 'stopped') return;
    const duration = clamp(w.route.length / C.execution.speed, C.execution.minDuration, C.execution.maxDuration);
    w.execution = { along: 0, legIndex: 0, lockIndex: 0, duration, speed: w.route.length / duration,
      kills: 0, startAlive: w.enemies.filter(e => e.alive).length, plannedLocks: w.route.locks.length, timedOut,
      scoreBefore: w.stopScoreBefore, maxChainBefore: w.stopMaxChainBefore, passedEnemyIds: [], pause: 0, pauseUsed: 0, elapsed: 0 };
    w.phase = 'executing'; w.stopRemaining = 0; w.safetyRemaining = 0; w.events.push({ type: 'execute' });
    if (w.route.length < EPS) finishExecution(w);
  }
  /**
   * Commits one execution result, then resumes normal time or enters the Wave transition.
   * ONE STOP failures roll back attempt score before the retry UI can be shown.
   * @param {GameWorld} w
   * @returns {void}
   */
  function finishExecution(w) {
    w.lastKills = w.execution.kills; w.phase = 'normal'; w.maxChain = Math.max(w.maxChain, w.lastKills);
    if (w.route.length > EPS) w.safetyRemaining = C.safety.afterExecution;
    const waveCleared = w.enemies.length > 0 && w.enemies.every(e => !e.alive);
    const allClear = waveCleared && w.lastKills > 0 && w.lastKills === w.execution.startAlive;
    const perfect = allClear && w.wave >= 6;
    if (allClear) w.score += C.scoring.allClearBonus;
    if (perfect) w.perfectExecutions++;
    w.events.push({ type: 'done', kills: w.lastKills, elapsed: w.execution.elapsed, allClear, perfect, finalWave: waveCleared && w.wave === C.waves.definitions.length });
    w.route = null;
    if (waveCleared) {
      w.lastWavePerfect = perfect;
      w.phase = 'wave-clear'; w.bullets.length = 0;
      w.transitionRemaining = w.wave === C.waves.definitions.length ? C.waves.finalIntermissionSeconds : C.waves.intermissionSeconds;
      w.events.push({ type: 'waveClear', wave: w.wave, allClear, perfect });
    } else if (currentWave(w).oneStopRequired) {
      w.score = w.execution.scoreBefore; w.maxChain = w.execution.maxChainBefore;
      failOneStop(w, w.execution.timedOut ? 'time-over' : 'incomplete', w.lastKills, w.execution.startAlive, w.execution.plannedLocks);
    }
  }
  function failOneStop(w, reason, defeated, total, locked = defeated) {
    w.phase = 'one-stop-failed'; w.stopRemaining = 0; w.safetyRemaining = 0;
    const failures = recordWaveFailure(w); w.oneStopFailure = { reason, defeated, locked, total, failures };
    w.events.push({ type: 'oneStopFail', ...w.oneStopFailure });
  }
  function acknowledgeRulePreview(w) {
    if (w.phase !== 'rule-preview' || w.pendingWaveIndex == null) return;
    w.phase = 'rule-intro'; w.events.push({ type: 'ruleIntro', wave: C.waves.definitions[w.pendingWaveIndex].number });
  }
  function startPendingWave(w) {
    if (w.phase !== 'rule-intro' || w.pendingWaveIndex == null) return;
    beginWave(w, w.pendingWaveIndex);
  }
  /**
   * Restores the Wave-entry snapshot so failed attempts cannot duplicate score or statistics.
   * The retry gauge is intentionally reset separately from the snapshot.
   * @param {GameWorld} w
   * @param {number} [timeLimitMultiplier]
   * @returns {void}
   */
  function retryWave(w, timeLimitMultiplier = C.waves.timeLimitAssist.standard) {
    if (!['one-stop-failed', 'failed'].includes(w.phase) || !w.waveStartSnapshot) return;
    const allowed = availableTimeLimitMultipliers(w), selected = allowed.includes(Number(timeLimitMultiplier)) ? Number(timeLimitMultiplier) : C.waves.timeLimitAssist.standard;
    const snapshot = { ...w.waveStartSnapshot, player: copyPoint(w.waveStartSnapshot.player) };
    w.player = copyPoint(snapshot.player); w.score = snapshot.score; w.maxChain = snapshot.maxChain;
    w.perfectExecutions = snapshot.perfectExecutions; w.hitsTaken = snapshot.hitsTaken; w.totalKills = snapshot.totalKills;
    w.nextEnemyId = snapshot.nextEnemyId; w.nextBulletId = snapshot.nextBulletId;
    beginWave(w, w.waveIndex, snapshot); w.gauge = clamp(C.waves.retryGaugeInitial, 0, C.gauge.max); w.timeLimitMultiplier = selected;
    w.events.push({ type: 'waveRetry', wave: w.wave, timeLimitMultiplier: selected });
  }
  function travelTo(w, target) {
    const run = w.execution, route = w.route;
    while (run.along < target - EPS) {
      while (run.legIndex < route.legs.length - 1 && route.legs[run.legIndex].end <= run.along + EPS) run.legIndex++;
      const leg = route.legs[run.legIndex], endDistance = Math.min(target, leg.end);
      const end = pointAt(route, endDistance), contact = collisionPoint(w, w.player, end);
      if (contact) { run.along += distance(w.player, contact); w.player = contact; fail(w); return false; }
      w.player = end; run.along = endDistance;
    }
    return true;
  }
  /**
   * @param {GameWorld} w
   * @param {number} dt
   * @returns {void}
   */
  function stepExecution(w, dt) {
    const run = w.execution; run.elapsed += dt;
    if (run.pause > EPS) { run.pause = Math.max(0, run.pause - dt); return; }
    const route = w.route, target = Math.min(route.length, run.along + run.speed * dt);
    const lock = route.locks[run.lockIndex];
    if (lock && lock.along <= target + EPS) {
      if (!travelTo(w, lock.along)) return;
      const e = w.enemies.find(enemy => enemy.id === lock.enemyId); run.lockIndex++;
      if (e?.alive) {
        run.passedEnemyIds.push(e.id);
        e.hp = (e.hp ?? 1) - 1;
        const defeated = e.hp <= 0;
        if (defeated) {
          e.alive = false; run.kills++; w.totalKills++;
          w.score += C.scoring.baseKill + (run.kills - 1) * C.scoring.chainBonus;
        }
        const last = run.lockIndex === route.locks.length;
        w.events.push({ type: 'hit', enemyId: e.id, x: e.x, y: e.y, from: copyPoint(w.player), order: lock.order, last, defeated });
        run.pause = Math.min(last ? C.feedback.finalHitStop : C.feedback.hitStop, Math.max(0, C.feedback.hitStopBudget - run.pauseUsed));
        run.pauseUsed += run.pause;
      }
      return; // Keep each hit distinct, including locks at the same path position.
    }
    if (!travelTo(w, target)) return;
    if (run.along >= route.length - EPS) finishExecution(w);
  }
  function collisionPoint(w, a, b) {
    if (immune(w)) return null;
    let first = null;
    for (const e of w.enemies) if (e.alive && !(w.phase === 'executing' && w.execution?.passedEnemyIds?.includes(e.id))) {
      const t = segmentCircleTime(a, b, e, C.enemy.radius + C.player.radius);
      if (t !== null && (first === null || t < first)) first = t;
    }
    // Only the moving player is checked. The already drawn stroke is never a collider.
    for (const bullet of w.bullets) {
      const t = segmentCircleTime(a, b, bullet, C.shooting.bulletRadius + C.player.radius);
      if (t !== null && (first === null || t < first)) first = t;
    }
    return first === null ? null : { x: a.x + (b.x - a.x) * first, y: a.y + (b.y - a.y) * first };
  }
  function emitBullet(w, enemy, angle, speed) {
    if (w.bullets.length >= C.shooting.maxBullets) return;
    const nx = Math.cos(angle), ny = Math.sin(angle);
    const muzzle = C.enemy.radius + C.shooting.bulletRadius + C.shooting.muzzleGap;
    w.bullets.push({ id: w.nextBulletId++, enemyId: enemy.id,
      x: enemy.x + nx * muzzle, y: enemy.y + ny * muzzle,
      vx: nx * speed * (enemy.bulletSpeedScale ?? 1), vy: ny * speed * (enemy.bulletSpeedScale ?? 1), life: C.shooting.lifetime, grazed: false, pattern: enemy.pattern || 'aim' });
  }
  function volley(w, enemy, pattern, center, circular = false) {
    const count = Math.max(0, Math.min(enemy.shotCount ?? Math.floor(pattern.count), C.shooting.maxBullets - w.bullets.length));
    const spread = circular ? Math.PI * 2 : (pattern.spreadDegrees || 0) * Math.PI / 180;
    for (let i = 0; i < count; i++) {
      const offset = circular ? i * spread / count : count === 1 ? 0 : -spread / 2 + i * spread / (count - 1);
      emitBullet(w, enemy, center + offset, pattern.speed);
    }
  }
  function sequenceShot(w, enemy, kind, pattern) {
    emitBullet(w, enemy, kind === 'rotate' ? enemy.rotateAngle : aimAngle(w, enemy), pattern.speed);
    if (kind === 'rotate') enemy.rotateAngle = (enemy.rotateAngle + pattern.turnDegrees * Math.PI / 180) % (Math.PI * 2);
  }
  function updateShooting(w, enemy, dt) {
    const kind = enemy.pattern || 'aim', pattern = C.shooting.patterns[kind];
    enemy.shotRemaining -= dt;
    if (enemy.delayRemaining != null) {
      enemy.delayRemaining -= dt;
      if (enemy.delayRemaining <= EPS) { volley(w, enemy, pattern, enemy.delayAngle); enemy.delayRemaining = null; }
      return;
    }
    if (enemy.burstRemaining > 0) {
      enemy.burstTimer -= dt;
      if (enemy.burstTimer <= EPS) {
        sequenceShot(w, enemy, kind, pattern); enemy.burstRemaining--;
        enemy.burstTimer += Math.max(C.world.fixedStep, pattern.burstInterval);
      }
      return;
    }
    if (enemy.shotRemaining > EPS) return;
    enemy.shotRemaining = Math.max(C.world.fixedStep, pattern.interval * (enemy.fireIntervalScale ?? 1));
    const count = Math.max(0, Math.min(C.shooting.maxBullets, enemy.shotCount ?? Math.floor(pattern.count)));
    if (!count) return;
    if (kind === 'aim' || kind === 'rotate') {
      sequenceShot(w, enemy, kind, pattern);
      enemy.burstRemaining = count - 1; enemy.burstTimer = Math.max(C.world.fixedStep, pattern.burstInterval);
    } else if (kind === 'delay') {
      enemy.delayAngle = aimAngle(w, enemy); enemy.delayRemaining = Math.max(C.world.fixedStep, pattern.warningSeconds);
    } else {
      volley(w, enemy, pattern, aimAngle(w, enemy), kind === 'burst');
    }
  }
  /**
   * Advances and compacts the bounded bullet array in place to avoid per-frame allocation on mobile.
   * @param {GameWorld} w
   * @param {number} dt
   * @returns {void}
   */
  function advanceBullets(w, dt) {
    const next = { x: 0, y: 0 }, r = C.shooting.bulletRadius;
    let kept = 0;
    for (let i = 0; i < w.bullets.length; i++) {
      const bullet = w.bullets[i], travelTime = Math.min(dt, bullet.life);
      if (travelTime <= EPS) continue;
      next.x = bullet.x + bullet.vx * travelTime; next.y = bullet.y + bullet.vy * travelTime;
      const contact = immune(w) ? null : segmentCircleTime(bullet, next, w.player, C.shooting.bulletRadius + C.player.radius);
      if (contact !== null) {
        bullet.x += (next.x - bullet.x) * contact; bullet.y += (next.y - bullet.y) * contact;
        bullet.life -= travelTime * contact; w.bullets[kept++] = bullet;
        // Preserve unprocessed bullets on the failure frame without duplicating compacted entries.
        for (let j = i + 1; j < w.bullets.length; j++) w.bullets[kept++] = w.bullets[j];
        w.bullets.length = kept;
        fail(w); return;
      }
      graze(w, bullet, bullet, next, w.player);
      bullet.x = next.x; bullet.y = next.y; bullet.life -= dt;
      if (bullet.life > EPS && bullet.x >= -r && bullet.x <= C.world.width + r && bullet.y >= -r && bullet.y <= C.world.height + r) w.bullets[kept++] = bullet;
    }
    w.bullets.length = kept;
  }
  function stepNormal(w, dt) {
    w.time += dt; w.waveBannerRemaining = Math.max(0, w.waveBannerRemaining - dt);
    w.gauge = Math.min(C.gauge.max, w.gauge + C.gauge.recoveryPerSecond * dt);
    const margin = C.world.margin + C.enemy.radius;
    for (const e of w.enemies) {
      if (!e.alive) continue;
      const before = copyPoint(e); e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.x < margin || e.x > C.world.width - margin) { e.vx *= -1; e.x = clamp(e.x, margin, C.world.width - margin); }
      if (e.y < margin || e.y > C.world.height - margin) { e.vy *= -1; e.y = clamp(e.y, margin, C.world.height - margin); }
      if (!immune(w) && segmentCircleTime(before, e, w.player, C.enemy.radius + C.player.radius) !== null) { fail(w); return; }
      updateShooting(w, e, dt);
    }
    advanceBullets(w, dt);
    w.safetyRemaining = Math.max(0, w.safetyRemaining - dt); w.waveGraceRemaining = Math.max(0, w.waveGraceRemaining - dt);
  }
  /**
   * Holds the short clear beat and inserts the one-time rule acknowledgement at the Wave 6/7 boundary.
   * @param {GameWorld} w
   * @param {number} dt
   * @returns {void}
   */
  function stepWaveClear(w, dt) {
    w.transitionRemaining = Math.max(0, w.transitionRemaining - dt);
    if (w.transitionRemaining > EPS) return;
    if (w.waveIndex + 1 < C.waves.definitions.length) {
      const next = w.waveIndex + 1;
      if (!currentWave(w).oneStopRequired && C.waves.definitions[next].oneStopRequired) {
        w.phase = 'rule-preview'; w.pendingWaveIndex = next; w.timeLimitMultiplier = C.waves.timeLimitAssist.standard;
        w.events.push({ type: 'rulePreview', wave: C.waves.definitions[next].number, practiced: w.lastWavePerfect });
      } else beginWave(w, next);
    } else { w.phase = 'complete'; w.events.push({ type: 'complete', score: w.score, maxChain: w.maxChain, perfectExecutions: w.perfectExecutions, hitsTaken: w.hitsTaken, totalKills: w.totalKills, clearTime: w.time }); }
  }
  /**
   * Advances exactly one simulation phase. STOP deliberately updates only its planning clock.
   * @param {GameWorld} w
   * @param {number} [dt=C.world.fixedStep]
   * @returns {void}
   */
  function step(w, dt = C.world.fixedStep) {
    if (w.phase === 'normal') stepNormal(w, dt);
    else if (w.phase === 'stopped') {
      w.stopRemaining = Math.max(0, w.stopRemaining - dt);
      if (w.stopRemaining <= EPS) executeRoute(w, true);
    } else if (w.phase === 'executing') stepExecution(w, dt);
    else if (w.phase === 'wave-clear') stepWaveClear(w, dt);
  }
  root.Deadline.sim = { clamp, distance, circleInterval, segmentCircleTime, compileRoute, pointAt,
    createWorld, movePlayer, canStop, stopTime, clearRoute, undoRoute, cancelStop, addRoutePoint, executeRoute,
    availableTimeLimitMultipliers, acknowledgeRulePreview, startPendingWave, retryWave, step };
  if (typeof module !== 'undefined') module.exports = root.Deadline.sim;
})(globalThis);
