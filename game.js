(function (root) {
  'use strict';
  const { config: C, sim: S, Renderer, Sound } = root.Deadline;
  const $ = id => document.getElementById(id);
  const ui = Object.fromEntries(['arena', 'phase', 'status-action', 'wave', 'wave-current', 'wave-total', 'score', 'stop-time', 'stop-gauge-label', 'lock-label', 'lock-count', 'life', 'time-stop', 'time-stop-label', 'clear-route', 'undo-route', 'cancel-stop', 'stop-gauge', 'gauge-value', 'hint', 'sound', 'restart', 'result', 'retry', 'retry-wave-number', 'result-kills', 'game-over-wave', 'game-over-score', 'game-over-title', 'retry-assist', 'retry-assist-15', 'retry-assist-20', 'complete', 'play-again', 'game-clear-title', 'final-score', 'final-time', 'final-kills', 'final-chain', 'final-perfect', 'final-hits', 'wave-banner', 'tutorial-prompt', 'lock-ready', 'one-stop-preview', 'one-stop-preview-next', 'preview-perfect', 'one-stop-intro', 'one-stop-start', 'rule-target-example', 'rule-target-count', 'one-stop-result', 'incomplete-title', 'incomplete-count', 'incomplete-reason', 'retry-wave', 'retry-one-stop-number', 'one-stop-assist', 'one-stop-assist-15', 'one-stop-assist-20', 'callout', 'debug', 'debug-shapes', 'debug-values'].map(id => [id, $(id)]));
  const titleUi = { screen: $('title-screen'), shell: $('game-shell'), start: $('title-start'), infoButtons: [...document.querySelectorAll('[data-title-info]')], panels: [...document.querySelectorAll('[data-title-panel]')],
    master: $('master-volume'), masterValue: $('master-value'), sfx: $('sfx-volume'), sfxValue: $('sfx-value'), mute: $('setting-mute') };
  const briefingUi = { screen: $('briefing-screen'), begin: $('briefing-begin') };
  const renderer = new Renderer(ui.arena), sound = new Sound();
  const app = { world: S.createWorld(), particles: [], hits: [], shake: 0, calloutLife: 0, pendingFinal: null,
    tutorial: { active: false, step: 'freeze' }, damageFx: { remaining: 0, max: C.feedback.damageFlashSeconds },
    timeFx: { blend: 0, enterRemaining: 0, exitRemaining: 0, origin: { x: 0, y: 0 } },
    routeFx: { drawing: false, lockFlashes: [] },
    combatFx: { releaseRemaining: 0, resumeRemaining: 0, releasePulse: 0, trail: [], lastTrail: null, pendingCompletion: null, completionRemaining: 0 },
    titleActive: true, titleLeaving: false, briefingActive: false,
    debugEnabled: C.debug.enabled || (C.debug.allowQueryFlag && new URLSearchParams(location.search).has('debug')),
    debugShapes: false, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches };
  let gesture = null, lastTime = 0, accumulator = 0, lastDrawSound = 0, debugClock = 0;
  let touchControls = matchMedia('(pointer: coarse)').matches;
  const heldKeys = new Set(), commandKeys = new Set(['Space', 'KeyZ', 'KeyX', 'KeyC', 'Escape', 'KeyR', 'Enter', 'Digit1', 'Digit2', 'Numpad1', 'Numpad2']);
  function setTouchControls(touch) {
    if (touchControls === touch) return;
    touchControls = touch; updateUi();
  }
  document.addEventListener('pointerdown', event => setTouchControls(event.pointerType === 'touch'), true);
  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse') setTouchControls(false);
  }, true);
  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(seconds)); return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }
  function syncSoundUi() {
    const settings = sound.preferences();
    titleUi.master.value = String(settings.masterVolume); titleUi.masterValue.textContent = String(settings.masterVolume);
    titleUi.sfx.value = String(settings.sfxVolume); titleUi.sfxValue.textContent = String(settings.sfxVolume);
    titleUi.mute.setAttribute('aria-pressed', String(settings.muted)); titleUi.mute.querySelector('strong').textContent = settings.muted ? 'ON' : 'OFF';
    ui.sound.textContent = settings.muted ? '音 OFF' : '音 ON'; ui.sound.setAttribute('aria-pressed', String(!settings.muted));
  }
  function updateTutorial() {
    const visible = app.tutorial.active && !app.world.failed && !['complete', 'one-stop-failed', 'rule-preview', 'rule-intro'].includes(app.world.phase);
    ui['tutorial-prompt'].hidden = !visible; if (!visible) return;
    ui['tutorial-prompt'].replaceChildren();
    if (app.tutorial.step === 'freeze') {
      if (!touchControls) { const key = document.createElement('kbd'); key.textContent = 'SPACE'; ui['tutorial-prompt'].append(key); }
      ui['tutorial-prompt'].append(document.createTextNode(touchControls ? 'TIME STOPをタップ' : 'FREEZE TIME'));
    } else if (app.tutorial.step === 'draw') ui['tutorial-prompt'].textContent = 'DRAW THROUGH ENEMIES';
    else {
      if (!touchControls) { const key = document.createElement('kbd'); key.textContent = 'SPACE'; ui['tutorial-prompt'].append(key); }
      ui['tutorial-prompt'].append(document.createTextNode(touchControls ? 'EXECUTEをタップ' : 'EXECUTE'));
    }
  }
  function updateUi() {
    const w = app.world, stopped = w.phase === 'stopped', executing = w.phase === 'executing', resting = w.phase === 'wave-clear', complete = w.phase === 'complete';
    const waveConfig = C.waves.definitions[w.waveIndex], oneStop = !!waveConfig.oneStopRequired, preview = w.phase === 'rule-preview', intro = w.phase === 'rule-intro', incomplete = w.phase === 'one-stop-failed';
    const routeReady = stopped && (w.route?.points.length || 0) > 1, drawing = stopped && app.routeFx.drawing;
    ui['stop-time'].textContent = stopped ? `${w.stopRemaining.toFixed(1)}s` : '—';
    ui['stop-gauge-label'].textContent = stopped ? 'TIME LEFT' : 'TIME STOP';
    const locks = w.route?.locks.length || 0, targets = w.stopTargetCount || w.enemies.filter(e => e.alive).length;
    ui['lock-count'].textContent = stopped && oneStop ? `${locks} / ${targets}` : String(locks);
    ui['lock-label'].textContent = oneStop ? 'ONE STOP · LOCK' : 'LOCK';
    const allLocked = stopped && oneStop && targets > 0 && locks === targets;
    ui['lock-count'].classList.toggle('all-locked', allLocked); ui['lock-ready'].hidden = !allLocked;
    ui.life.textContent = String(w.life);
    ui['wave-current'].textContent = String(w.wave); ui['wave-total'].textContent = String(C.waves.definitions.length);
    ui.wave.setAttribute('aria-label', `Wave ${w.wave} of ${C.waves.definitions.length}`); ui.score.textContent = String(w.score);
    const ready = S.canStop(w);
    if (stopped) {
      const duration = waveConfig.timeStopSeconds * w.timeLimitMultiplier;
      ui['stop-gauge'].max = duration; ui['stop-gauge'].value = w.stopRemaining;
      ui['gauge-value'].textContent = 'ACTIVE';
      ui['stop-gauge'].setAttribute('aria-label', 'TIME STOP remaining');
      ui['stop-gauge'].setAttribute('aria-valuetext', `${w.stopRemaining.toFixed(1)} seconds remaining`);
    } else {
      ui['stop-gauge'].max = C.gauge.max; ui['stop-gauge'].value = w.gauge;
      ui['gauge-value'].textContent = ready ? 'READY' : `${Math.floor(w.gauge / C.gauge.max * 100)}%`;
      ui['stop-gauge'].setAttribute('aria-label', 'TIME STOP charge');
      ui['stop-gauge'].setAttribute('aria-valuetext', ready ? 'ready' : `${Math.floor(w.gauge / C.gauge.max * 100)} percent`);
    }
    document.body.classList.toggle('ready', ready);
    document.body.classList.toggle('stopped', stopped); document.body.classList.toggle('executing', executing); document.body.classList.toggle('failed', w.failed);
    document.body.classList.toggle('modal-result', w.failed || complete || preview || intro || incomplete);
    document.body.classList.toggle('route-drawing', drawing); document.body.classList.toggle('route-ready', routeReady);
    const stopFx = C.feedback.timeStopVisual;
    document.body.classList.toggle('stop-warning', stopped && w.stopRemaining <= stopFx.warningSeconds);
    document.body.classList.toggle('stop-critical', stopped && w.stopRemaining <= stopFx.criticalSeconds);
    document.body.classList.toggle('stop-final', stopped && w.stopRemaining <= stopFx.finalSeconds);
    const limitSuffix = w.timeLimitMultiplier > 1 ? ` · TIME ×${w.timeLimitMultiplier.toFixed(1)}` : '';
    ui.phase.textContent = stopped ? `${oneStop ? 'ONE STOP' : 'TIME STOP'}${limitSuffix}` : executing ? 'EXECUTING' : resting ? 'WAVE CLEAR' : preview ? 'NEXT WAVE' : intro ? 'NEW RULE' : incomplete ? 'INCOMPLETE' : complete ? 'COMPLETE' : w.failed ? 'MISS' : 'NORMAL';
    ui['status-action'].textContent = drawing ? 'DRAW ROUTE' : routeReady ? 'READY TO EXECUTE' : stopped ? 'ROUTE INPUT' : executing ? 'AUTO RUN' : resting ? 'WAVE TRANSITION' : preview || intro ? 'RULE UPDATE' : incomplete || w.failed ? 'RETRY AVAILABLE' : complete ? 'MISSION COMPLETE' : ready ? 'TIME STOP READY' : 'MOVE / EVADE';
    document.body.classList.toggle('touch-controls', touchControls);
    ui['time-stop-label'].textContent = stopped ? touchControls ? 'EXECUTE / 実行' : 'EXECUTE' : executing ? 'EXECUTING…' : resting ? 'NEXT WAVE…' : preview ? 'NEXT WAVE' : intro ? 'NEW RULE' : incomplete || w.failed ? `RETRY WAVE ${w.wave}` : complete ? 'RETRY' : ready ? 'TIME STOP' : 'TIME STOP · CHARGING';
    ui['time-stop'].disabled = stopped ? !touchControls : !ready; ui.restart.disabled = executing;
    ui['time-stop'].classList.toggle('execute-ready', routeReady); ui['time-stop'].classList.toggle('execute-waiting', stopped && !routeReady);
    ui['clear-route'].disabled = !stopped || w.route.points.length < 2;
    ui['undo-route'].disabled = ui['clear-route'].disabled;
    ui['cancel-stop'].disabled = !stopped;
    ui['cancel-stop'].title = `実行せず終了 / ゲージ${C.gauge.cancelCost}消費 / C`;
    ui.result.hidden = !w.failed; ui['result-kills'].textContent = String(w.totalKills); ui['game-over-wave'].textContent = `${String(w.wave).padStart(2, '0')} / ${String(C.waves.definitions.length).padStart(2, '0')}`;
    ui['game-over-score'].textContent = String(w.score); ui['retry-wave-number'].textContent = String(w.wave); ui['retry-one-stop-number'].textContent = String(w.wave);
    ui.complete.hidden = !complete; ui['one-stop-preview'].hidden = !preview; ui['one-stop-intro'].hidden = !intro; ui['one-stop-result'].hidden = !incomplete;
    ui['preview-perfect'].hidden = !(preview && w.lastWavePerfect);
    const pendingTargets = w.pendingWaveIndex == null ? 0 : C.waves.definitions[w.pendingWaveIndex].enemies.length;
    ui['rule-target-count'].textContent = `${pendingTargets} / ${pendingTargets}`;
    const choices = S.availableTimeLimitMultipliers(w), first = choices.includes(C.waves.timeLimitAssist.first), second = choices.includes(C.waves.timeLimitAssist.second);
    ui['retry-assist'].hidden = !w.failed || !first; ui['one-stop-assist'].hidden = !incomplete || !first;
    ui['retry-assist-15'].hidden = !first; ui['one-stop-assist-15'].hidden = !first; ui['retry-assist-20'].hidden = !second; ui['one-stop-assist-20'].hidden = !second;
    ui['final-score'].textContent = String(w.score); ui['final-time'].textContent = formatTime(w.time); ui['final-kills'].textContent = String(w.totalKills);
    ui['final-chain'].textContent = String(w.maxChain); ui['final-perfect'].textContent = String(w.perfectExecutions); ui['final-hits'].textContent = String(w.hitsTaken);
    if (incomplete) {
      const failure = w.oneStopFailure;
      ui['incomplete-title'].textContent = failure.reason === 'time-over' ? 'TIME OVER' : failure.reason === 'cancel' ? 'TIME STOP CANCELLED' : 'EXECUTION INCOMPLETE';
      ui['incomplete-count'].textContent = `${failure.locked} / ${failure.total}`;
      ui['incomplete-reason'].textContent = failure.reason === 'time-over' ? `${failure.locked} / ${failure.total} LOCKED` : failure.reason === 'cancel' ? 'TIME STOPをキャンセルしました' : `${failure.defeated}体撃破・${failure.total - failure.defeated}体残っています`;
    }
    const showingWave = resting || (w.waveBannerRemaining > 0 && w.phase === 'normal');
    ui['wave-banner'].hidden = !showingWave;
    if (resting || !showingWave) ui['wave-banner'].classList.remove('wave-enter');
    ui['wave-banner'].textContent = resting ? `WAVE ${String(w.wave).padStart(2, '0')} CLEAR` : w.wave === C.waves.definitions.length ? `FINAL WAVE · ${String(w.wave).padStart(2, '0')} / ${String(C.waves.definitions.length).padStart(2, '0')}` : `WAVE ${String(w.wave).padStart(2, '0')} / ${String(C.waves.definitions.length).padStart(2, '0')}`;
    ui['wave-banner'].classList.toggle('final-wave', w.wave === C.waves.definitions.length);
    ui.hint.textContent = stopped ? allLocked ? 'ALL TARGETS LOCKED — SPACEで実行' : oneStop ? `${locks} / ${targets} LOCKED — 未ロック敵の明るい輪を確認` : touchControls ? 'ルートを描いてEXECUTE / 赤は警告・0秒で自動実行' : 'SPACEキーで実行 / 赤は警告・0秒で自動実行' : executing ? '描いたルートを実行中' : resting ? '敵弾を消去して次のWaveへ' : preview ? '次Waveの条件を確認してSPACE' : intro ? 'NEW RULEを確認してSPACEで開始' : incomplete || w.failed ? `SPACEで通常リトライ${first ? ' / 1・2でTIME LIMIT選択' : ''}` : complete ? 'SPACEで最初から再挑戦' : w.timeLimitMultiplier > 1 ? `TIME LIMIT ×${w.timeLimitMultiplier.toFixed(1)} / 弾を避けて充電` : ready ? touchControls ? 'TIME STOP → ドラッグでルート' : 'SPACEで時間停止 → ドラッグでルート' : w.waveGraceRemaining > 0 ? 'READY — 開始直後はダメージ無効' : '弾を避けて充電 → 満タンでTIME STOP';
    updateTutorial();
  }
  function comboText(kills) { return ['', '1 KILL', 'DOUBLE', 'TRIPLE', 'QUAD'][kills] || `${kills} KILLS`; }
  function showCallout(kills, allClear, perfect = false, finalWave = false) {
    ui.callout.replaceChildren(document.createTextNode(perfect ? 'PERFECT EXECUTION' : comboText(kills)));
    if (allClear) { const bonus = document.createElement('small'); bonus.textContent = finalWave ? `${kills} / ${kills} · FINAL EXECUTION` : `${comboText(kills)} · ALL CLEAR  +${C.scoring.allClearBonus}`; ui.callout.append(bonus); }
    ui.callout.style.setProperty('--strength', String(Math.min(6, kills))); app.calloutLife = perfect ? C.feedback.perfectCalloutSeconds : C.feedback.calloutSeconds;
  }
  function releasePointer() {
    if (gesture && ui.arena.hasPointerCapture(gesture.id)) ui.arena.releasePointerCapture(gesture.id);
    gesture = null; app.routeFx.drawing = false;
  }
  function reset(showTutorial = false) {
    releasePointer(); app.world = S.createWorld(); app.particles = []; app.hits = []; app.shake = 0; app.calloutLife = 0; app.pendingFinal = null;
    app.tutorial.active = showTutorial; app.tutorial.step = 'freeze'; app.damageFx.remaining = 0;
    app.timeFx.blend = 0; app.timeFx.enterRemaining = 0; app.timeFx.exitRemaining = 0;
    app.routeFx.lockFlashes = []; sound.stopTimeClock(); sound.stopAll();
    Object.assign(app.combatFx, { releaseRemaining: 0, resumeRemaining: 0, releasePulse: 0, trail: [], lastTrail: null, pendingCompletion: null, completionRemaining: 0 });
    accumulator = 0; lastTime = 0; lastDrawSound = 0; ui.callout.textContent = ''; updateUi();
  }
  function toggleTitleInfo(name) {
    for (const button of titleUi.infoButtons) {
      const active = button.dataset.titleInfo === name && button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(active));
    }
    for (const panel of titleUi.panels) {
      const button = titleUi.infoButtons.find(item => item.dataset.titleInfo === panel.dataset.titlePanel);
      panel.hidden = panel.dataset.titlePanel !== name || button?.getAttribute('aria-expanded') !== 'true';
    }
  }
  function startFromTitle() {
    if (!app.titleActive || app.titleLeaving) return;
    sound.unlock(); sound.playUiConfirm(); app.titleLeaving = true; titleUi.screen.classList.add('is-leaving');
    const finish = () => {
      app.titleActive = false; app.titleLeaving = false; app.briefingActive = true; titleUi.screen.hidden = true;
      document.body.classList.remove('title-open'); document.body.classList.add('briefing-open'); briefingUi.screen.hidden = false;
      briefingUi.begin.focus({ preventScroll: true });
    };
    if (app.reducedMotion) finish(); else setTimeout(finish, 340);
  }
  function beginFromBriefing() {
    if (!app.briefingActive) return;
    sound.unlock(); sound.playUiConfirm();
    app.briefingActive = false; briefingUi.screen.hidden = true; document.body.classList.remove('briefing-open');
    titleUi.shell.inert = false; titleUi.shell.removeAttribute('aria-hidden'); renderer.resize(); reset(true); ui.arena.focus({ preventScroll: true });
  }
  function returnToTitle() {
    releasePointer(); sound.stopTimeClock(); sound.stopAll(); reset(false);
    app.titleActive = true; app.titleLeaving = false; app.briefingActive = false;
    briefingUi.screen.hidden = true; titleUi.shell.inert = true; titleUi.shell.setAttribute('aria-hidden', 'true');
    titleUi.screen.classList.remove('is-leaving'); titleUi.screen.hidden = false;
    document.body.classList.remove('briefing-open'); document.body.classList.add('title-open'); titleUi.start.focus({ preventScroll: true });
  }
  function particle(x, y, color, count = 1, strength = 1) {
    const amount = app.reducedMotion ? Math.min(count, 4) : count;
    for (let i = 0; i < amount && app.particles.length < C.feedback.maxParticles; i++) {
      const angle = Math.random() * Math.PI * 2, velocity = (45 + Math.random() * 130) * strength;
      const life = C.feedback.particleLifetime * (0.7 + Math.random() * 0.3);
      app.particles.push({ x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, angle,
        life, maxLife: life, color, size: count === 1 ? 2 : 2 + Math.random() * 4 });
    }
  }
  function handleEvents() {
    for (const event of app.world.events) {
      if (event.type === 'stop') {
        if (app.tutorial.active) app.tutorial.step = 'draw';
        releasePointer(); sound.play('stop'); app.shake = 0; ui.callout.textContent = ''; app.calloutLife = 0;
        app.routeFx.lockFlashes = []; sound.startTimeClock();
        Object.assign(app.combatFx, { releaseRemaining: 0, resumeRemaining: 0, releasePulse: 0, trail: [], lastTrail: null, pendingCompletion: null, completionRemaining: 0 });
        app.timeFx.origin = { x: app.world.player.x, y: app.world.player.y };
        app.timeFx.enterRemaining = C.feedback.timeStopVisual.enterSeconds; app.timeFx.exitRemaining = 0;
        ui.phase.classList.remove('stop-phase-pulse'); void ui.phase.offsetWidth; ui.phase.classList.add('stop-phase-pulse');
      } else if (event.type === 'cancel') {
        releasePointer(); sound.stopTimeClock(); sound.playTimeResume();
        Object.assign(app.combatFx, { releaseRemaining: 0, resumeRemaining: 0, releasePulse: 0, trail: [], lastTrail: null, pendingCompletion: null, completionRemaining: 0 });
        app.timeFx.enterRemaining = 0; app.timeFx.exitRemaining = C.feedback.timeStopVisual.exitSeconds;
      }
      else if (event.type === 'lock') {
        if (app.tutorial.active) app.tutorial.step = 'execute';
        app.routeFx.lockFlashes = app.routeFx.lockFlashes.filter(flash => flash.enemyId !== event.enemyId);
        app.routeFx.lockFlashes.push({ enemyId: event.enemyId, order: event.order, life: C.feedback.routeVisual.lockFlashSeconds });
        sound.playTargetLock(event.order); ui['lock-count'].classList.remove('lock-pulse'); void ui['lock-count'].offsetWidth; ui['lock-count'].classList.add('lock-pulse');
      }
      else if (event.type === 'execute') {
        releasePointer(); sound.beginExecute();
        Object.assign(app.combatFx, { releaseRemaining: C.feedback.executeVisual.chargeSeconds, resumeRemaining: 0, releasePulse: 0, trail: [], lastTrail: { ...app.world.player }, pendingCompletion: null, completionRemaining: 0 });
        app.timeFx.enterRemaining = 0; app.timeFx.exitRemaining = 0;
      }
      else if (event.type === 'hit') {
        sound.playSlash(event.order, event.last); if (event.defeated) sound.playKill(event.order, event.last);
        app.shake = event.last ? C.feedback.finalShake : C.feedback.shake;
        particle(event.x, event.y, event.defeated ? '#baf9ff' : '#ff9499', event.defeated ? C.feedback.particlesPerEnemy : 4, event.last ? 1.25 : 1);
        const enemy = app.world.enemies.find(item => item.id === event.enemyId);
        app.hits.push({ ...event, enemy: enemy ? { ...enemy } : null, life: C.feedback.hitEffectLifetime, maxLife: C.feedback.hitEffectLifetime });
      } else if (event.type === 'done') {
        if (app.tutorial.active && event.kills > 0) app.tutorial.active = false;
        app.combatFx.releaseRemaining = 0; app.combatFx.resumeRemaining = C.feedback.executeVisual.resumeAfterglowSeconds;
        if (event.finalWave) { ui.callout.textContent = ''; app.calloutLife = 0; app.pendingFinal = { ...event, wait: C.feedback.finalSilence }; }
        else if (event.kills > 0) { showCallout(event.kills, event.allClear, event.perfect); if (event.perfect) { app.combatFx.pendingCompletion = 'perfect'; app.shake = C.feedback.perfectShake; } }
      } else if (event.type === 'waveClear' && !event.perfect) app.combatFx.pendingCompletion = 'clear';
      else if (event.type === 'waveStart') {
        ui['wave-banner'].classList.remove('wave-enter'); void ui['wave-banner'].offsetWidth; ui['wave-banner'].classList.add('wave-enter');
      }
      else if (event.type === 'rulePreview') { releasePointer(); sound.stopTimeClock(); ui.callout.textContent = ''; app.calloutLife = 0; }
      else if (event.type === 'oneStopFail') { app.tutorial.active = false; releasePointer(); sound.stopTimeClock(); app.combatFx.pendingCompletion = 'incomplete'; }
      else if (event.type === 'fail') {
        app.tutorial.active = false; sound.stopTimeClock(); sound.playDamage(); particle(event.x, event.y, '#ff6971', 12); app.shake = C.feedback.damageShake;
        app.damageFx.remaining = app.damageFx.max; ui.life.classList.remove('life-hit'); void ui.life.offsetWidth; ui.life.classList.add('life-hit');
        Object.assign(app.combatFx, { releaseRemaining: 0, resumeRemaining: 0, releasePulse: 0, trail: [], lastTrail: null, pendingCompletion: null, completionRemaining: 0 });
        app.timeFx.enterRemaining = 0; app.timeFx.exitRemaining = C.feedback.timeStopVisual.exitSeconds;
        releasePointer(); ui.callout.textContent = ''; app.calloutLife = 0;
      }
    }
    app.world.events.length = 0; updateUi();
  }
  function toggleTime() {
    sound.unlock();
    if (app.world.phase === 'normal') S.stopTime(app.world);
    else if (app.world.phase === 'stopped') S.executeRoute(app.world);
    handleEvents();
  }
  function drawPoint(event) {
    S.addRoutePoint(app.world, renderer.position(event));
    if (event.timeStamp - lastDrawSound > C.feedback.drawSoundInterval * 1000) { sound.play('draw'); lastDrawSound = event.timeStamp; }
    handleEvents();
  }
  function pointerMove(event) {
    const w = app.world, p = renderer.position(event);
    if (w.phase === 'normal') {
      if (insideField(p) && document.elementFromPoint(event.clientX, event.clientY) === ui.arena) S.movePlayer(w, p);
      handleEvents(); return;
    }
    if (w.phase !== 'stopped' || !gesture || event.pointerId !== gesture.id) return;
    if (!gesture.moved && S.distance(p, gesture.start) < C.drawing.pointSpacing) return;
    if (!gesture.moved) { S.addRoutePoint(w, gesture.start); gesture.moved = true; app.routeFx.drawing = true; lastDrawSound = event.timeStamp; sound.play('drawStart'); }
    drawPoint(event);
  }
  function insideField(p) {
    return p.x >= C.world.margin && p.x <= C.world.width - C.world.margin &&
      p.y >= C.world.margin && p.y <= C.world.height - C.world.margin;
  }
  ui.arena.addEventListener('pointerdown', event => {
    if (event.button !== 0 || gesture || !['normal', 'stopped'].includes(app.world.phase)) return;
    const p = renderer.position(event); if (!renderer.contains(p)) return;
    if (app.world.phase === 'normal' && !insideField(p)) return;
    sound.unlock(); ui.arena.focus({ preventScroll: true });
    if (app.world.phase === 'normal') { S.movePlayer(app.world, p); handleEvents(); if (app.world.failed) return; }
    gesture = { id: event.pointerId, start: p, moved: false }; ui.arena.setPointerCapture(event.pointerId); event.preventDefault();
  });
  ui.arena.addEventListener('pointermove', event => {
    if (gesture && event.pointerId !== gesture.id) return;
    if (!gesture && !['mouse', 'pen'].includes(event.pointerType)) return;
    // A captured or coalesced event ending over UI must not pull the player to the edge.
    if (app.world.phase === 'normal' && (!insideField(renderer.position(event)) || document.elementFromPoint(event.clientX, event.clientY) !== ui.arena)) return;
    const samples = event.getCoalescedEvents?.();
    for (const sample of samples?.length ? samples : [event]) { pointerMove(sample); if (app.world.failed) break; }
    if (gesture) event.preventDefault();
  });
  ui.arena.addEventListener('pointerup', event => {
    if (gesture?.id !== event.pointerId) return;
    if (app.world.phase === 'stopped' && gesture.moved) drawPoint(event);
    else if (app.world.phase === 'normal') pointerMove(event);
    releasePointer(); updateUi(); event.preventDefault();
  });
  ui.arena.addEventListener('pointercancel', () => { releasePointer(); updateUi(); });
  ui.arena.addEventListener('lostpointercapture', () => { gesture = null; app.routeFx.drawing = false; updateUi(); });
  function undo() { releasePointer(); app.routeFx.lockFlashes = []; S.undoRoute(app.world); updateUi(); }
  function clear() { releasePointer(); app.routeFx.lockFlashes = []; S.clearRoute(app.world); updateUi(); }
  function cancel() { S.cancelStop(app.world); handleEvents(); }
  function showRuleIntro() { S.acknowledgeRulePreview(app.world); handleEvents(); }
  function startOneStop() { S.startPendingWave(app.world); handleEvents(); }
  function retryWave(multiplier = C.waves.timeLimitAssist.standard) {
    releasePointer(); S.retryWave(app.world, multiplier); app.particles = []; app.hits = []; app.shake = 0; app.calloutLife = 0; app.pendingFinal = null;
    app.tutorial.active = false; app.damageFx.remaining = 0;
    app.timeFx.blend = 0; app.timeFx.enterRemaining = 0; app.timeFx.exitRemaining = 0;
    app.routeFx.lockFlashes = []; sound.stopTimeClock(); sound.stopAll();
    Object.assign(app.combatFx, { releaseRemaining: 0, resumeRemaining: 0, releasePulse: 0, trail: [], lastTrail: null, pendingCompletion: null, completionRemaining: 0 });
    accumulator = 0; lastTime = 0; lastDrawSound = 0; ui.callout.textContent = ''; handleEvents(); ui.arena.focus({ preventScroll: true });
  }
  ui.arena.addEventListener('contextmenu', event => { event.preventDefault(); undo(); });
  ui['time-stop'].addEventListener('click', event => {
    // Input identity, not screen width, authorizes touch EXECUTE on hybrid devices.
    if (app.world.phase === 'normal' || (app.world.phase === 'stopped' && event.pointerType === 'touch')) toggleTime();
  });
  ui['clear-route'].addEventListener('click', clear);
  ui['undo-route'].addEventListener('click', undo);
  ui['cancel-stop'].addEventListener('click', cancel);
  ui.restart.addEventListener('click', () => reset());
  ui.retry.addEventListener('click', () => retryWave());
  ui['play-again'].addEventListener('click', () => { reset(); ui.arena.focus({ preventScroll: true }); });
  ui['game-over-title'].addEventListener('click', returnToTitle);
  ui['game-clear-title'].addEventListener('click', returnToTitle);
  ui['one-stop-preview-next'].addEventListener('click', showRuleIntro);
  ui['one-stop-start'].addEventListener('click', startOneStop);
  ui['retry-wave'].addEventListener('click', () => retryWave());
  ui['retry-assist-15'].addEventListener('click', () => retryWave(C.waves.timeLimitAssist.first));
  ui['one-stop-assist-15'].addEventListener('click', () => retryWave(C.waves.timeLimitAssist.first));
  ui['retry-assist-20'].addEventListener('click', () => retryWave(C.waves.timeLimitAssist.second));
  ui['one-stop-assist-20'].addEventListener('click', () => retryWave(C.waves.timeLimitAssist.second));
  ui.sound.addEventListener('click', () => {
    sound.setMuted(!sound.muted); syncSoundUi(); if (!sound.muted) sound.playUiConfirm();
  });
  titleUi.start.addEventListener('click', startFromTitle);
  briefingUi.begin.addEventListener('click', beginFromBriefing);
  for (const button of titleUi.infoButtons) button.addEventListener('click', () => { sound.unlock(); sound.playUiConfirm(); toggleTitleInfo(button.dataset.titleInfo); });
  titleUi.master.addEventListener('input', () => { sound.setMasterVolume(titleUi.master.value); syncSoundUi(); });
  titleUi.sfx.addEventListener('input', () => { sound.setSfxVolume(titleUi.sfx.value); syncSoundUi(); });
  titleUi.mute.addEventListener('click', () => { sound.setMuted(!sound.muted); syncSoundUi(); if (!sound.muted) sound.playUiConfirm(); });
  document.addEventListener('keydown', event => {
    if (app.titleActive) {
      if (event.code === 'Space' && (event.target === document.body || event.target === titleUi.screen || event.target === titleUi.start)) {
        event.preventDefault();
        if (event.repeat || heldKeys.has(event.code)) return;
        heldKeys.add(event.code); startFromTitle();
      }
      return;
    }
    if (app.briefingActive) {
      if (event.code === 'Space') {
        event.preventDefault();
        if (event.repeat || heldKeys.has(event.code)) return;
        heldKeys.add(event.code); beginFromBriefing();
      }
      return;
    }
    if (!commandKeys.has(event.code) || event.isComposing || event.ctrlKey || event.metaKey || event.altKey ||
        /INPUT|TEXTAREA|SELECT|SUMMARY/.test(event.target.tagName) || event.target.isContentEditable) return;
    event.preventDefault(); // Also suppress default scroll/button activation on repeated SPACE.
    if (event.repeat || heldKeys.has(event.code)) return;
    heldKeys.add(event.code); setTouchControls(false);
    if (event.code === 'Space') {
      if (app.world.failed || app.world.phase === 'one-stop-failed') retryWave();
      else if (app.world.phase === 'complete') reset();
      else if (app.world.phase === 'rule-preview') showRuleIntro();
      else if (app.world.phase === 'rule-intro') startOneStop();
      else toggleTime();
    }
    else if (['Digit1', 'Numpad1'].includes(event.code) && (app.world.failed || app.world.phase === 'one-stop-failed')) retryWave(C.waves.timeLimitAssist.first);
    else if (['Digit2', 'Numpad2'].includes(event.code) && (app.world.failed || app.world.phase === 'one-stop-failed')) retryWave(C.waves.timeLimitAssist.second);
    else if (event.code === 'KeyZ') undo();
    else if (event.code === 'KeyX') clear();
    else if (event.code === 'KeyC' || event.code === 'Escape') cancel();
    else if (event.code === 'KeyR' && app.world.phase !== 'executing') { reset(); ui.arena.focus({ preventScroll: true }); }
    else if (app.world.failed && event.code === 'Enter') retryWave();
  });
  document.addEventListener('keyup', event => {
    if (heldKeys.delete(event.code)) event.preventDefault();
  });
  ui.debug.hidden = !app.debugEnabled;
  ui['debug-shapes'].addEventListener('change', () => { app.debugShapes = ui['debug-shapes'].checked; });
  new ResizeObserver(() => { releasePointer(); renderer.resize(); }).observe(ui.arena);
  document.addEventListener('visibilitychange', () => { releasePointer(); if (document.hidden) sound.stopTimeClock(); lastTime = 0; accumulator = 0; });
  window.addEventListener('blur', () => { releasePointer(); heldKeys.clear(); sound.stopTimeClock(); });
  function frame(now) {
    const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0; lastTime = now;
    if (document.hidden) { requestAnimationFrame(frame); return; }
    const releaseHold = app.world.phase === 'executing' && app.combatFx.releaseRemaining > 0;
    const resumeHold = app.combatFx.resumeRemaining > 0;
    if (releaseHold) {
      app.combatFx.releaseRemaining = Math.max(0, app.combatFx.releaseRemaining - dt); accumulator = 0;
      if (app.combatFx.releaseRemaining <= 0) { sound.playExecuteRelease(); app.combatFx.releasePulse = C.feedback.executeVisual.releasePulseSeconds; }
    }
    if (resumeHold) {
      app.combatFx.resumeRemaining = Math.max(0, app.combatFx.resumeRemaining - dt); accumulator = 0;
      if (app.combatFx.resumeRemaining <= 0) {
        sound.playTimeResume(); app.timeFx.exitRemaining = C.feedback.timeStopVisual.exitSeconds;
        if (app.combatFx.pendingCompletion) { app.combatFx.completionRemaining = 0.08; }
      }
    }
    if (app.titleActive || app.briefingActive || releaseHold || resumeHold) accumulator = 0;
    else {
      accumulator += dt;
      while (accumulator >= C.world.fixedStep) {
        if ((app.world.phase === 'executing' && app.combatFx.releaseRemaining > 0) || app.combatFx.resumeRemaining > 0) { accumulator = 0; break; }
        S.step(app.world); accumulator -= C.world.fixedStep; handleEvents();
      }
    }
    sound.updateTimeClock(app.world.phase === 'stopped', app.world.stopRemaining);
    const stopFx = C.feedback.timeStopVisual, stopTarget = ['stopped', 'executing'].includes(app.world.phase) || app.combatFx.resumeRemaining > 0 ? 1 : 0;
    const blendStep = dt / (stopTarget ? stopFx.enterSeconds : stopFx.exitSeconds);
    app.timeFx.blend = stopTarget ? Math.min(1, app.timeFx.blend + blendStep) : Math.max(0, app.timeFx.blend - blendStep);
    app.timeFx.enterRemaining = Math.max(0, app.timeFx.enterRemaining - dt);
    app.timeFx.exitRemaining = Math.max(0, app.timeFx.exitRemaining - dt);
    app.damageFx.remaining = Math.max(0, app.damageFx.remaining - dt);
    app.combatFx.releasePulse = Math.max(0, app.combatFx.releasePulse - dt);
    for (let i = app.routeFx.lockFlashes.length - 1; i >= 0; i--) {
      app.routeFx.lockFlashes[i].life -= dt;
      if (app.routeFx.lockFlashes[i].life <= 0) app.routeFx.lockFlashes.splice(i, 1);
    }
    if (app.world.phase !== 'stopped') {
      app.shake = Math.max(0, app.shake - dt * 28);
      if (app.pendingFinal) {
        app.pendingFinal.wait -= dt;
        if (app.pendingFinal.wait <= 0) { const event = app.pendingFinal; app.pendingFinal = null; showCallout(event.kills, true, true, true); sound.play('perfect'); app.shake = C.feedback.perfectShake; }
      }
      if (app.calloutLife > 0) { app.calloutLife -= dt; if (app.calloutLife <= 0) ui.callout.textContent = ''; }
      for (let i = app.particles.length - 1; i >= 0; i--) {
        const p = app.particles[i]; p.life -= dt;
        if (p.life <= 0) { app.particles.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt;
      }
      for (let i = app.hits.length - 1; i >= 0; i--) { app.hits[i].life -= dt; if (app.hits[i].life <= 0) app.hits.splice(i, 1); }
      for (let i = app.combatFx.trail.length - 1; i >= 0; i--) { app.combatFx.trail[i].life -= dt; if (app.combatFx.trail[i].life <= 0) app.combatFx.trail.splice(i, 1); }
      if (!app.reducedMotion && app.world.phase === 'executing' && app.combatFx.releaseRemaining <= 0) {
        const point = app.world.player, last = app.combatFx.lastTrail;
        if (!last || S.distance(last, point) >= C.feedback.executeVisual.trailSampleSpacing) {
          app.combatFx.trail.push({ x: point.x, y: point.y, life: C.feedback.executeVisual.trailLife, maxLife: C.feedback.executeVisual.trailLife });
          if (app.combatFx.trail.length > C.feedback.executeVisual.maxAfterimages) app.combatFx.trail.shift();
          app.combatFx.lastTrail = { ...point };
        }
      }
      if (app.combatFx.completionRemaining > 0) {
        app.combatFx.completionRemaining -= dt;
        if (app.combatFx.completionRemaining <= 0 && app.combatFx.pendingCompletion) { sound.play(app.combatFx.pendingCompletion); app.combatFx.pendingCompletion = null; }
      }
    }
    renderer.draw(app);
    if (app.debugEnabled && now - debugClock > 200) {
      debugClock = now; const w = app.world;
      ui['debug-values'].textContent = `phase=${w.phase} world=${w.time.toFixed(3)} points=${w.route?.points.length || 0} bullets=${w.bullets.length} run=${w.execution?.elapsed.toFixed(3) || 0}s`;
    }
    requestAnimationFrame(frame);
  }
  syncSoundUi(); reset(); titleUi.start.focus({ preventScroll: true }); requestAnimationFrame(frame);
  if (app.debugEnabled) root.Deadline.inspect = () => JSON.parse(JSON.stringify({ world: app.world, drawing: !!gesture,
    particles: app.particles, hits: app.hits, timeFx: app.timeFx, routeFx: app.routeFx, combatFx: app.combatFx, tutorial: app.tutorial, damageFx: app.damageFx, audio: sound.inspect(), titleActive: app.titleActive, titleLeaving: app.titleLeaving, briefingActive: app.briefingActive, reducedMotion: app.reducedMotion }));
})(globalThis);
