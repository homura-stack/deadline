/* Central tuning for gameplay and presentation. No runtime dependencies. */
(function (root) {
  'use strict';
  /**
   * Wave enemy placement used by the data-driven Wave table.
   * @typedef {{type: 'aim'|'fan'|'burst'|'rotate'|'delay', x: number, y: number, angle: number}} WaveEnemyPlacement
   */
  /**
   * Values stay mutable so Node and browser tests can create isolated fixtures without a build step.
   * Simulation coordinates are independent of responsive Canvas size.
   */
  const config = {
    // Fixed-step world dimensions are the shared coordinate contract for input, simulation and rendering.
    world: { width: 960, height: 600, margin: 24, fixedStep: 1 / 120 },
    player: { radius: 9, start: { x: 160, y: 430 } },
    // MOVE and DRAW share relative PAD input; DRAW uses a lower scale for accurate TARGET passes.
    controls: { touchStorageKey: 'deadline.controls.v1', touchSensitivityDefault: 100,
      touchSensitivityMin: 50, touchSensitivityMax: 150, touchPrecisionScale: 0.68,
      touchPrecisionDistance: 10, touchFullSpeedDistance: 28, touchMaxFrameDelta: 64,
      touchDrawSensitivityScale: 0.8, touchDrawStartDistance: 5 },
    practice: { moveDistance: 64, completeSeconds: 1.05,
      enemies: [{ x: 430, y: 210 }, { x: 690, y: 360 }],
      bullets: [{ x: 300, y: 105, vx: -24, vy: 0 }, { x: 790, y: 510, vx: 20, vy: 0 }] },
    // Sampling limits stabilize geometry cost across mouse and high-frequency touch hardware.
    drawing: { pointSpacing: 3, maxPoints: 4096 },
    timeStop: { seconds: 5, lockRadius: 48 },
    gauge: { max: 100, initial: 20, recoveryPerSecond: 20, nearMissGain: 8, nearMissRadius: 32, cost: 100, cancelCost: 40 },
    safety: { afterExecution: 0.5 },
    execution: { speed: 2600, minDuration: 0.2, maxDuration: 0.72 },
    enemy: { radius: 15, spawnClearance: 110 },
    audio: { storageKey: 'deadline.audio.v1', masterDefault: 80, sfxDefault: 90 },
    // Each Wave owns composition and tuning; simulation.js contains no Wave-specific branches.
    waves: { bannerSeconds: 0.7, intermissionSeconds: 1.1, finalIntermissionSeconds: 1.45, startGraceSeconds: 0.8, retryGaugeInitial: 0,
      timeLimitAssist: { firstUnlockFailures: 3, secondUnlockFailures: 5, standard: 1, first: 1.5, second: 2 },
      definitions: [
        { number: 1, oneStopRequired: false, timeStopSeconds: 5, enemyHp: 1, enemySpeed: 18, fireIntervalScale: 1.2, bulletSpeedScale: 0.85,
          counts: { aim: 3 }, enemies: [
            { type: 'aim', x: 410, y: 180, angle: 0.35 }, { type: 'aim', x: 650, y: 290, angle: 2.5 },
            { type: 'aim', x: 440, y: 430, angle: 5.1 }
          ] },
        { number: 2, oneStopRequired: false, timeStopSeconds: 5, enemyHp: 1, enemySpeed: 19, fireIntervalScale: 1.12, bulletSpeedScale: 0.88,
          counts: { aim: 3 }, enemies: [
            { type: 'aim', x: 340, y: 155, angle: 0.4 }, { type: 'aim', x: 610, y: 170, angle: 2.2 },
            { type: 'aim', x: 450, y: 405, angle: 4.3 }, { type: 'aim', x: 735, y: 390, angle: 5.5 }
          ] },
        { number: 3, oneStopRequired: false, timeStopSeconds: 5, enemyHp: 1, enemySpeed: 20, fireIntervalScale: 1.08, bulletSpeedScale: 0.9,
          counts: { aim: 3, fan: 3 }, enemies: [
            { type: 'aim', x: 330, y: 150, angle: 0.2 }, { type: 'fan', x: 585, y: 160, angle: 2.0 },
            { type: 'aim', x: 430, y: 410, angle: 4.8 }, { type: 'fan', x: 745, y: 385, angle: 1.2 }
          ] },
        { number: 4, oneStopRequired: false, timeStopSeconds: 5, enemyHp: 1, enemySpeed: 21, fireIntervalScale: 1.02, bulletSpeedScale: 0.92,
          counts: { aim: 3, fan: 5, burst: 8 }, enemies: [
            { type: 'aim', x: 300, y: 145, angle: 0.4 }, { type: 'fan', x: 520, y: 155, angle: 2.2 },
            { type: 'burst', x: 725, y: 260, angle: 3.4 }, { type: 'aim', x: 430, y: 420, angle: 5.0 },
            { type: 'fan', x: 720, y: 445, angle: 1.1 }
          ] },
        { number: 5, oneStopRequired: false, timeStopSeconds: 5, enemyHp: 1, enemySpeed: 22, fireIntervalScale: 0.98, bulletSpeedScale: 0.94,
          counts: { aim: 3, fan: 5, burst: 8, rotate: 6 }, enemies: [
            { type: 'aim', x: 300, y: 140, angle: 0.3 }, { type: 'fan', x: 535, y: 150, angle: 2.0 },
            { type: 'burst', x: 740, y: 285, angle: 3.6 }, { type: 'rotate', x: 450, y: 425, angle: 5.1 },
            { type: 'fan', x: 730, y: 445, angle: 1.3 }
          ] },
        { number: 6, oneStopRequired: false, timeStopSeconds: 5.2, enemyHp: 1, enemySpeed: 23, fireIntervalScale: 0.94, bulletSpeedScale: 0.96,
          counts: { aim: 3, fan: 5, burst: 9, rotate: 7 }, enemies: [
            { type: 'aim', x: 285, y: 135, angle: 0.2 }, { type: 'fan', x: 495, y: 145, angle: 1.9 },
            { type: 'burst', x: 720, y: 175, angle: 3.5 }, { type: 'rotate', x: 350, y: 420, angle: 5.2 },
            { type: 'fan', x: 575, y: 430, angle: 0.8 }, { type: 'aim', x: 790, y: 400, angle: 2.6 }
          ] },
        { number: 7, oneStopRequired: true, timeStopSeconds: 5.4, enemyHp: 1, enemySpeed: 21, fireIntervalScale: 1, bulletSpeedScale: 0.94,
          counts: { aim: 3, fan: 4, burst: 8 }, enemies: [
            { type: 'aim', x: 300, y: 155, angle: 0.3 }, { type: 'fan', x: 520, y: 145, angle: 2.1 },
            { type: 'burst', x: 735, y: 290, angle: 3.7 }, { type: 'aim', x: 455, y: 425, angle: 5.0 },
            { type: 'fan', x: 745, y: 445, angle: 1.2 }
          ] },
        { number: 8, oneStopRequired: true, timeStopSeconds: 5.7, enemyHp: 1, enemySpeed: 22, fireIntervalScale: 0.92, bulletSpeedScale: 0.96,
          counts: { aim: 3, fan: 5, burst: 9, rotate: 7 }, enemies: [
            { type: 'aim', x: 270, y: 130, angle: 0.2 }, { type: 'fan', x: 455, y: 145, angle: 1.8 },
            { type: 'burst', x: 660, y: 150, angle: 3.4 }, { type: 'rotate', x: 790, y: 290, angle: 4.7 },
            { type: 'aim', x: 335, y: 430, angle: 5.4 }, { type: 'fan', x: 570, y: 440, angle: 0.9 },
            { type: 'burst', x: 765, y: 455, angle: 2.7 }
          ] },
        { number: 9, oneStopRequired: true, timeStopSeconds: 6, enemyHp: 1, enemySpeed: 23, fireIntervalScale: 0.86, bulletSpeedScale: 0.98,
          counts: { aim: 3, fan: 5, burst: 10, rotate: 8 }, enemies: [
            { type: 'aim', x: 260, y: 125, angle: 0.2 }, { type: 'fan', x: 430, y: 145, angle: 1.7 },
            { type: 'burst', x: 615, y: 135, angle: 3.2 }, { type: 'rotate', x: 790, y: 220, angle: 4.6 },
            { type: 'fan', x: 300, y: 410, angle: 5.5 }, { type: 'rotate', x: 500, y: 445, angle: 0.9 },
            { type: 'aim', x: 685, y: 430, angle: 2.4 }, { type: 'burst', x: 820, y: 455, angle: 3.8 }
          ] },
        { number: 10, oneStopRequired: true, timeStopSeconds: 6.4, enemyHp: 1, enemySpeed: 24, fireIntervalScale: 0.8, bulletSpeedScale: 1,
          counts: { aim: 3, fan: 5, burst: 10, rotate: 8 }, enemies: [
            { type: 'aim', x: 245, y: 115, angle: 0.1 }, { type: 'fan', x: 395, y: 135, angle: 1.4 },
            { type: 'burst', x: 550, y: 120, angle: 2.9 }, { type: 'rotate', x: 705, y: 145, angle: 4.2 },
            { type: 'aim', x: 825, y: 250, angle: 5.4 }, { type: 'fan', x: 260, y: 390, angle: 0.7 },
            { type: 'rotate', x: 420, y: 455, angle: 2.0 }, { type: 'burst', x: 585, y: 430, angle: 3.4 },
            { type: 'aim', x: 735, y: 465, angle: 4.8 }, { type: 'fan', x: 840, y: 400, angle: 6.0 }
          ] }
      ] },
    // maxBullets is a hard performance bound shared by all firing patterns.
    shooting: { firstShotDelay: 1.2, initialStagger: 0.16,
      bulletRadius: 5, muzzleGap: 2, lifetime: 7, maxBullets: 180,
      patterns: {
        aim: { interval: 1.65, count: 3, burstInterval: 0.16, speed: 135 },
        fan: { interval: 2.05, count: 5, spreadDegrees: 70, speed: 115 },
        burst: { interval: 2.8, count: 10, speed: 95 },
        rotate: { interval: 2.4, count: 8, burstInterval: 0.12, turnDegrees: 22.5, speed: 110 },
        delay: { interval: 2.8, count: 1, warningSeconds: 0.65, spreadDegrees: 12, speed: 230 }
      } },
    scoring: { baseKill: 100, chainBonus: 50, allClearBonus: 500 },
    // Presentation tuning is centralized so visual/audio polish can be adjusted without scattering constants.
    feedback: { hitStop: 0.02, finalHitStop: 0.04, hitStopBudget: 0.22,
      shake: 2.5, finalShake: 5, maxShake: 7, damageShake: 3.2, damageFlashSeconds: 0.18, mobileShakeScale: 0.45,
      calloutSeconds: 0.8, perfectCalloutSeconds: 1.15, perfectShake: 6.5, finalSilence: 0.14, maxParticles: 140, particlesPerEnemy: 12, particleLifetime: 0.32,
      hitEffectLifetime: 0.22, drawSoundInterval: 0.075, trailLength: 170,
      combatAudio: { tickInterval: 0.96, warningTickInterval: 0.76, criticalTickInterval: 0.6, finalTickInterval: 0.52,
        tickVolume: 0.024, tickDuration: 0.022, tockDuration: 0.026, tickFilterStart: 3000, tickFilterEnd: 2200, tockFilterStart: 1700, tockFilterEnd: 1100,
        tickFilterQ: 4.2, tockFilterQ: 3.6, clockAttack: 0.0015, tickRelease: 0.007, tockRelease: 0.008,
        criticalTickGainScale: 1.05, finalTickGainScale: 1.1,
        drawStartVolume: 0.018, drawVolume: 0.009, uiVolume: 0.027, targetVolume: 0.03, stopVolume: 0.038, resumeVolume: 0.034,
        executeVolume: 0.046, damageVolume: 0.052, slashVolume: 0.062, killVolume: 0.07,
        incompleteVolume: 0.045, clearVolume: 0.05, perfectVolume: 0.06,
        slashPitchVariation: 0.026 },
      executeVisual: { chargeSeconds: 0.065, resumeAfterglowSeconds: 0.055, trailLife: 0.18, trailSampleSpacing: 12,
        maxAfterimages: 20, releasePulseSeconds: 0.16, hitFlashSeconds: 0.075, fragmentCount: 6 },
      timeStopVisual: { enterSeconds: 0.22, exitSeconds: 0.16, warningSeconds: 2, criticalSeconds: 1, finalSeconds: 0.5,
        background: '#060c15', grid: '#09131d', innerBorder: '#152638',
        enemyFill: '#29282e', enemyStroke: '#75666b', enemyCore: '#9b858a',
        bulletHalo: '#a79b8f0b', bulletStroke: '#91877e', bulletFill: '#b9afa5',
        playerFill: '#b8fbff', playerStroke: '#ffffff', routeCore: '#d2fcff', routeGlowAlpha: 0.3 },
      routeVisual: { core: '#e9feff', glow: '#79e4f2', outerGlow: '#4bcddd', recentCore: '#ffffff', tip: '#ffffff',
        outerGlowWidth: 22, outerGlowAlpha: 0.075, recentLength: 92, recentGlowWidth: 8,
        flowDash: 18, flowGap: 74, flowSpeed: 92, tipRadius: 3.8, tipHaloRadius: 10,
        lockFlashSeconds: 0.2, lockFlashExpand: 14, lockSoundMinGap: 0.045 } },
    render: { maxPixelRatio: 2, routeWidth: 3.5, routeGlowWidth: 12, routeGlowAlpha: 0.15 },
    debug: { enabled: false, allowQueryFlag: true }
  };
  root.Deadline = root.Deadline || {};
  root.Deadline.config = config;
  if (typeof module !== 'undefined') module.exports = config;
})(globalThis);
