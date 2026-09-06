(function (root) {
  'use strict';
  const { config: C, sim: S, Renderer, Sound, journey: J, WorldMapView, stageArt: Stage } = root.Deadline;
  const $ = id => document.getElementById(id);
  /**
   * Browser-only presentation state layered over the DOM-free simulation world.
   * @typedef {Object} RuntimeApp
   * @property {Object} world
   * @property {Object} timeFx
   * @property {Object} routeFx
   * @property {{cursor: ?{x: number, y: number}}} touchDraw
   * @property {Object} combatFx
   * @property {boolean} reducedMotion
   */
  /**
   * Accumulated relative input for the mobile MOVE PAD.
   * @typedef {Object} TouchPadState
   * @property {?number} id Active PointerEvent identifier.
   * @property {number} dx Unconsumed horizontal screen-space movement.
   * @property {number} dy Unconsumed vertical screen-space movement.
   * @property {number} contactDistance Distance since the current touch began.
   * @property {boolean} drawing Whether this contact has crossed the DRAW threshold.
   */
  const ui = Object.fromEntries(['arena', 'phase', 'status-action', 'wave', 'wave-current', 'wave-total', 'score', 'stop-time', 'stop-gauge-label', 'lock-label', 'lock-count', 'life', 'time-stop', 'time-stop-label', 'clear-route', 'undo-route', 'cancel-stop', 'stop-gauge', 'gauge-value', 'hint', 'sound', 'restart', 'result', 'retry', 'retry-wave-number', 'result-kills', 'game-over-wave', 'game-over-score', 'game-over-title', 'retry-assist', 'retry-assist-15', 'retry-assist-20', 'complete', 'play-again', 'game-clear-title', 'final-score', 'final-time', 'final-kills', 'final-chain', 'final-perfect', 'final-hits', 'wave-banner', 'tutorial-prompt', 'lock-ready', 'one-stop-preview', 'one-stop-preview-next', 'preview-perfect', 'one-stop-intro', 'one-stop-start', 'rule-target-example', 'rule-target-count', 'one-stop-result', 'incomplete-title', 'incomplete-count', 'incomplete-reason', 'retry-wave', 'retry-one-stop-number', 'one-stop-assist', 'one-stop-assist-15', 'one-stop-assist-20', 'callout', 'move-pad', 'move-pad-label', 'move-pad-state', 'debug', 'debug-shapes', 'debug-values'].map(id => [id, $(id)]));
  const titleUi = { screen: $('title-screen'), shell: $('game-shell'), start: $('title-start'), infoButtons: [...document.querySelectorAll('[data-title-info]')], panels: [...document.querySelectorAll('[data-title-panel]')],
    master: $('master-volume'), masterValue: $('master-value'), sfx: $('sfx-volume'), sfxValue: $('sfx-value'), mute: $('setting-mute'),
    touchSensitivity: $('touch-sensitivity'), touchSensitivityValue: $('touch-sensitivity-value') };
  const briefingUi = { screen: $('briefing-screen'), begin: $('briefing-begin'), back: $('briefing-back'), skip: $('briefing-skip'),
    counter: $('briefing-counter'), pages: [...document.querySelectorAll('[data-briefing-page]')], progress: [...document.querySelectorAll('.briefing-progress i')] };
  const trainingPreference = root.Deadline.training.createPreferences(() => localStorage);
  let trainingReturn = null;
  const renderer = new Renderer(ui.arena), sound = new Sound();
  const mapUi = Object.fromEntries(['world-map','map-board','map-title','map-enter','map-training','map-notice','map-restored-count','map-progress-lights','map-area-number','map-area-name','map-area-ja','map-area-status','map-area-description','map-area-waves','map-score','area-caption','area-transition','area-transition-kicker','area-transition-name','area-transition-ja','area-transition-note','stage-loading-actions','stage-retry','stage-title','world-sync','journey-ending','ending-score','ending-restart','ending-title-button'].map(id=>[id,$(id)]));
  /** @type {RuntimeApp} */
  const app = { world: S.createWorld(), journey: J.create(), particles: [], hits: [], shake: 0, calloutLife: 0, pendingFinal: null,
    tutorial: { active: false, step: 'move' }, practice: { active: false, step: 'move', origin: null, completeRemaining: 0, drawStarted: false },
    briefingPage: 0, damageFx: { remaining: 0, max: C.feedback.damageFlashSeconds },
    timeFx: { blend: 0, enterRemaining: 0, exitRemaining: 0, origin: { x: 0, y: 0 } },
    routeFx: { drawing: false, lockFlashes: [] },
    touchDraw: { cursor: null },
    combatFx: { releaseRemaining: 0, resumeRemaining: 0, releasePulse: 0, trail: [], lastTrail: null, pendingCompletion: null, completionRemaining: 0 },
    artFx: { pendingRoute: null, echo: null, life: 0, flash: 0, origin: { x: 0, y: 0 }, scores: [] },
    titleActive: true, titleLeaving: false, briefingActive: false,
    debugEnabled: C.debug.enabled || (C.debug.allowQueryFlag && new URLSearchParams(location.search).has('debug')),
    debugShapes: false, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches };
  const mapView = new WorldMapView(mapUi['map-board'], selectMapArea);
  let gesture = null, lastTime = 0, accumulator = 0, lastDrawSound = 0, debugClock = 0;
  const coarsePointer = matchMedia('(pointer: coarse)').matches;
  let touchControls = coarsePointer;
  let touchCapable = coarsePointer || navigator.maxTouchPoints > 0;
  /** @type {TouchPadState} */
  const touchPad = { id: null, lastX: 0, lastY: 0, startX: 0, startY: 0, x: 0, y: 0, dx: 0, dy: 0, contactDistance: 0, drawing: false, visualDirty: true };
  let touchSensitivity = C.controls.touchSensitivityDefault;
  const heldKeys = new Set(), commandKeys = new Set(['Space', 'KeyZ', 'KeyX', 'KeyC', 'Escape', 'KeyR', 'Enter', 'Digit1', 'Digit2', 'Numpad1', 'Numpad2']);
  function setTouchControls(touch) {
    if (touch) touchCapable = true;
    if (touchControls === touch) return;
    touchControls = touch; updateBriefingPage(); updateUi();
  }
  document.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') setTouchControls(true);
    else if (!touchCapable) setTouchControls(false);
  }, true);
  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse' && !touchCapable) setTouchControls(false);
  }, true);
  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(seconds)); return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }
  function syncJourneyUi() {
    const j=app.journey, area=J.areas[j.active], onMap=J.onMap(j), entering=j.mode==='entering', restoring=j.mode==='restoring';
    const restored=restoring&&J.restorationFrame(j,app.reducedMotion).complete, loading=Stage.status(j.active);
    document.body.classList.toggle('map-open',onMap);document.body.classList.toggle('restoring-area',restoring);
    mapUi['world-map'].hidden=!onMap;mapUi['world-map'].inert=!onMap;
    titleUi.shell.inert=onMap||app.titleActive||app.briefingActive;
    titleUi.shell.setAttribute('aria-hidden',String(titleUi.shell.inert));
    mapUi['area-caption'].hidden=app.practice.active;
    mapUi['area-caption'].textContent=`AREA ${String(j.active+1).padStart(2,'0')} · ${area.name} / ${area.ja} · WAVE ${Math.max(1,Math.min(2,app.world.wave-area.first+1))} / 2`;
    mapUi['area-transition'].hidden=!entering&&!restoring;
    mapUi['area-transition'].classList.toggle('is-restoring',restoring);
    mapUi['area-transition'].classList.toggle('is-revealed',restored);
    mapUi['area-transition-kicker'].textContent=restoring?'':`AREA ${String(j.active+1).padStart(2,'0')}`;
    mapUi['area-transition-name'].textContent=restoring?(restored?'LIGHT RESTORED':''):area.name;
    mapUi['area-transition-ja'].textContent=restoring?(restored?`${area.name} / ${area.ja}`:''):area.ja;
    mapUi['area-transition-note'].textContent=restoring?'':loading==='ready'?'WAVE 1 / 2':loading==='error'?'背景を読み込めませんでした。再試行できます。':'背景を読み込んでいます…';
    mapUi['stage-loading-actions'].hidden=!entering||loading==='ready';mapUi['stage-retry'].hidden=loading!=='error';
    mapUi['world-map'].classList.toggle('is-ending',j.mode==='ending');
    mapUi['world-map'].classList.toggle('is-synchronizing',j.mode==='synchronizing');
    mapUi['journey-ending'].hidden=j.mode!=='ending';mapUi['ending-score'].textContent=String(app.world.score);
    document.querySelector('.map-detail').hidden=j.mode==='ending';
    mapUi['world-sync'].hidden=j.mode!=='synchronizing'||!J.finaleFrame(j,app.reducedMotion).sync;
    mapUi['map-board'].inert=j.mode==='synchronizing';
    if(restoring){ui.phase.textContent=restored?'LIGHT RESTORED':'RESTORING';ui['status-action'].textContent=restored?'AREA COMPLETE':'PICO → WORLD';ui['time-stop-label'].textContent='WORLD MAP…';ui.hint.textContent='Picoの光が、世界へ広がっていきます。';}
    if(J.paused(j)){ui['time-stop'].disabled=true;ui['clear-route'].disabled=true;ui['undo-route'].disabled=true;ui['cancel-stop'].disabled=true;ui.restart.disabled=true;}
    if(!onMap)return;
    mapView.render(j);
    const selected=J.areas[j.selected],status=J.status(j,j.selected);
    mapUi['map-restored-count'].replaceChildren(document.createTextNode(String(j.restored)+' '),Object.assign(document.createElement('span'),{textContent:'/ 5'}));
    [...mapUi['map-progress-lights'].children].forEach((light,i)=>light.classList.toggle('online',i<j.restored));
    mapUi['map-area-number'].textContent=`AREA ${String(j.selected+1).padStart(2,'0')}`;
    mapUi['map-area-name'].textContent=selected.name;mapUi['map-area-ja'].textContent=selected.ja;
    mapUi['map-area-status'].textContent=status==='online'?'LIGHT RESTORED / ONLINE':status==='locked'?'LOCKED / DEAD CIRCUIT':'DEAD CIRCUIT / AVAILABLE';
    mapUi['map-area-description'].textContent=selected.description;
    mapUi['map-area-waves'].textContent=`${String(selected.first).padStart(2,'0')} — ${String(selected.last).padStart(2,'0')}`;
    mapUi['map-score'].textContent=String(app.world.score);
    mapUi['map-enter'].disabled=status!=='available';mapUi['map-enter'].querySelector('span').textContent=status==='available'?`ENTER ${selected.name}`:status==='online'?'LIGHT RESTORED':'LOCKED';
    mapUi['map-training'].hidden=false;
  }
  function showWorldMap() {
    const j=app.journey;if(j.mode!=='synchronizing')j.mode='map';
    releasePointer();releaseTouchPad();heldKeys.clear();sound.stopTimeClock();sound.stopAll();
    app.particles=[];app.hits=[];app.shake=0;app.calloutLife=0;ui.callout.textContent='';
    accumulator=0;lastTime=0;
    mapUi['map-notice'].classList.remove('is-locked');
    mapUi['map-notice'].textContent=j.restored===5?'小さな光が、応えあう。':j.restored?`AREA ${String(j.restored+1).padStart(2,'0')} — ${J.areas[j.restored].name} UNLOCKED`:'GARDENから旅をはじめよう。';
    if(j.restored<5)Stage.prepare(j.restored);
    updateUi();(mapUi['map-enter'].disabled?mapUi['map-title']:mapUi['map-enter']).focus({preventScroll:true});
  }
  function selectMapArea(index) {
    if(!['map','ending'].includes(app.journey.mode))return;
    app.journey.selected=index;sound.unlock();sound.playUiConfirm();updateUi();
    const locked=J.status(app.journey,index)==='locked';mapUi['map-notice'].classList.toggle('is-locked',locked);
    mapUi['map-notice'].textContent=locked?`LOCKED — ${J.areas[index-1].name}を復旧すると解禁。`:J.status(app.journey,index)==='online'?`${J.areas[index].name} // ONLINE`:`${J.areas[index].name}へ進もう。`;
  }
  function enterArea(index) {
    if(!J.enter(app.journey,index))return;
    sound.unlock();sound.playUiConfirm();releasePointer();releaseTouchPad();heldKeys.clear();resetArtFx();Stage.prepare(index);
    // Resume only the existing between-Wave transition. No combat step, retuning or recreated Wave.
    if(app.world.phase==='wave-clear')S.step(app.world,app.world.transitionRemaining+C.world.fixedStep);
    handleEvents();renderer.resize();accumulator=0;lastTime=0;updateUi();
  }
  function openTraining() {
    if (app.titleLeaving || app.practice.active || app.briefingActive || (!app.titleActive && app.journey.mode !== 'map')) return;
    // Keep the campaign objects untouched while the historical rehearsal uses its own world.
    trainingReturn = { world: app.world, journey: app.journey };
    const exitLabel = trainingPreference.shouldOffer() ? 'TITLEへ戻る' : 'WORLD MAPへ';
    briefingUi.skip.textContent = exitLabel; $('practice-exit').textContent = exitLabel;
    app.journey = J.create(); app.journey.mode = 'battle';
    app.titleActive = false; titleUi.screen.hidden = true; document.body.classList.remove('title-open');
    app.briefingActive = true; app.briefingPage = 0; sound.unlock(); sound.playUiConfirm();
    Stage.prepare(0); document.body.classList.add('briefing-open'); briefingUi.screen.hidden = false;
    updateBriefingPage(); updateUi(); briefingUi.begin.focus({ preventScroll: true });
  }
  function returnFromTraining() {
    if (!app.briefingActive && !app.practice.active) return;
    // Aborting is allowed, but only finishPractice() unlocks the first campaign entry.
    if (trainingPreference.shouldOffer()) { returnToTitle(); return; }
    const saved = trainingReturn;
    app.briefingActive = false; briefingUi.screen.hidden = true; document.body.classList.remove('briefing-open');
    reset(false); if (saved) { app.world = saved.world; app.journey = saved.journey; }
    trainingReturn = null; showWorldMap();
  }
  function restartJourney() {
    app.journey=J.create();reset(false);showWorldMap();
  }
  function clampTouchSensitivity(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? S.clamp(numeric, C.controls.touchSensitivityMin, C.controls.touchSensitivityMax) : C.controls.touchSensitivityDefault;
  }
  function loadTouchSensitivity() {
    try {
      const saved = JSON.parse(localStorage.getItem(C.controls.touchStorageKey) || 'null');
      return clampTouchSensitivity(saved?.touchSensitivity);
    } catch (_) { return C.controls.touchSensitivityDefault; }
  }
  function syncTouchSensitivityUi() {
    titleUi.touchSensitivity.value = String(touchSensitivity);
    titleUi.touchSensitivityValue.textContent = `${touchSensitivity}%`;
  }
  function saveTouchSensitivity(value) {
    touchSensitivity = clampTouchSensitivity(value); syncTouchSensitivityUi();
    try { localStorage.setItem(C.controls.touchStorageKey, JSON.stringify({ touchSensitivity })); } catch (_) { /* Storage may be unavailable in private contexts. */ }
  }
  function updateBriefingPage() {
    const last = briefingUi.pages.length - 1;
    app.briefingPage = S.clamp(app.briefingPage, 0, last);
    briefingUi.pages.forEach((page, index) => { page.hidden = index !== app.briefingPage; });
    briefingUi.progress.forEach((item, index) => item.classList.toggle('is-active', index === app.briefingPage));
    briefingUi.counter.textContent = `BRIEFING / ${String(app.briefingPage + 1).padStart(2, '0')} OF ${String(briefingUi.pages.length).padStart(2, '0')}`;
    briefingUi.back.disabled = app.briefingPage === 0;
    briefingUi.begin.querySelector('kbd').textContent = touchControls ? 'TAP' : 'SPACE';
    briefingUi.begin.querySelector('span').textContent = app.briefingPage === last ? 'BEGIN TRAINING' : 'NEXT';
  }
  function changeBriefingPage(delta) {
    if (!app.briefingActive) return;
    const next = S.clamp(app.briefingPage + delta, 0, briefingUi.pages.length - 1);
    if (next === app.briefingPage) return;
    sound.unlock(); sound.playUiConfirm(); app.briefingPage = next; updateBriefingPage(); briefingUi.begin.focus({ preventScroll: true });
  }
  function syncSoundUi() {
    const settings = sound.preferences();
    titleUi.master.value = String(settings.masterVolume); titleUi.masterValue.textContent = String(settings.masterVolume);
    titleUi.sfx.value = String(settings.sfxVolume); titleUi.sfxValue.textContent = String(settings.sfxVolume);
    titleUi.mute.setAttribute('aria-pressed', String(settings.muted)); titleUi.mute.querySelector('strong').textContent = settings.muted ? 'ON' : 'OFF';
    ui.sound.textContent = settings.muted ? '音 OFF' : '音 ON'; ui.sound.setAttribute('aria-pressed', String(!settings.muted));
  }
  function updateTutorial() {
    const visible = app.practice.active && !app.world.failed && app.practice.step !== 'running';
    ui['tutorial-prompt'].hidden = !visible; if (!visible) return;
    ui['tutorial-prompt'].replaceChildren();
    if (app.practice.step === 'move') {
      if (!touchControls) { const mouse = document.createElement('i'); mouse.className = 'guide-mouse'; mouse.setAttribute('aria-hidden', 'true'); ui['tutorial-prompt'].append(mouse); }
      ui['tutorial-prompt'].append(document.createTextNode(touchControls ? 'MOVE PAD · SWIPE' : 'MOVE · EVADE'));
    }
    else if (app.practice.step === 'freeze') {
      if (!touchControls) { const key = document.createElement('kbd'); key.textContent = 'SPACE'; ui['tutorial-prompt'].append(key); }
      ui['tutorial-prompt'].append(document.createTextNode(touchControls ? 'TIME STOPをタップ / FREEZE' : 'FREEZE TIME'));
    } else if (app.practice.step === 'draw') ui['tutorial-prompt'].textContent = touchControls ? (app.practice.drawStarted ? 'MOVE PAD · DRAW THROUGH TARGETS' : 'MOVE PAD · DRAW ROUTE') : (app.practice.drawStarted ? 'DRAW THROUGH BOTH TARGETS' : 'PRESS · HOLD · DRAW');
    else if (app.practice.step === 'execute') {
      if (!touchControls) { const key = document.createElement('kbd'); key.textContent = 'SPACE'; ui['tutorial-prompt'].append(key); }
      ui['tutorial-prompt'].append(document.createTextNode(touchControls ? 'EXECUTEをタップ' : 'EXECUTE THE ROUTE'));
    } else ui['tutorial-prompt'].textContent = 'TUTORIAL COMPLETE · WORLD MAPへ';
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
    document.body.classList.toggle('touch-draw-pad', touchControls && stopped);
    app.touchControls = touchControls;
    for (const step of ['move', 'freeze', 'draw', 'execute']) document.body.classList.toggle(`practice-${step}`, app.practice.active && app.practice.step === step);
    ui['time-stop-label'].textContent = stopped ? touchControls ? 'EXECUTE / 実行' : 'EXECUTE' : executing ? 'EXECUTING…' : resting ? 'NEXT WAVE…' : preview ? 'NEXT WAVE' : intro ? 'NEW RULE' : incomplete || w.failed ? `RETRY WAVE ${w.wave}` : complete ? 'RETRY' : ready ? 'TIME STOP' : 'TIME STOP · CHARGING';
    ui['time-stop'].disabled = stopped ? !touchCapable : !ready; ui.restart.disabled = executing;
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
    ui.hint.textContent = stopped ? allLocked ? touchControls ? 'ALL TARGETS LOCKED — EXECUTEをタップ' : 'ALL TARGETS LOCKED — SPACEで実行' : oneStop ? `${locks} / ${targets} LOCKED — 未ロック敵の明るい輪を確認` : touchControls ? 'MOVE PADでルートを描いてEXECUTE / 赤は警告' : 'SPACEキーで実行 / 赤は警告・0秒で自動実行' : executing ? '描いたルートを実行中' : resting ? '敵弾を消去して次のWaveへ' : preview ? '次Waveの条件を確認してSPACE' : intro ? 'NEW RULEを確認してSPACEで開始' : incomplete || w.failed ? `SPACEで通常リトライ${first ? ' / 1・2でTIME LIMIT選択' : ''}` : complete ? 'SPACEで最初から再挑戦' : w.timeLimitMultiplier > 1 ? `TIME LIMIT ×${w.timeLimitMultiplier.toFixed(1)} / 弾を避けて充電` : ready ? touchControls ? 'TIME STOP → MOVE PADでルート' : 'SPACEで時間停止 → ドラッグでルート' : w.waveGraceRemaining > 0 ? 'READY — 開始直後はダメージ無効' : '弾を避けて充電 → 満タンでTIME STOP';
    const padEnabled = touchControls && ['normal', 'stopped'].includes(w.phase) && !w.failed && !complete && !preview && !intro && !incomplete;
    ui['move-pad'].setAttribute('aria-disabled', String(!padEnabled));
    ui['move-pad-label'].textContent = stopped ? 'MOVE PAD · DRAW ROUTE' : 'MOVE PAD · MOVE';
    ui['move-pad-state'].textContent = padEnabled ? stopped ? 'DRAW' : 'ACTIVE' : 'LOCKED';
    ui['move-pad'].setAttribute('aria-label', stopped ? '描画カーソルを相対移動する仮想タッチパッド' : '自機を相対移動する仮想タッチパッド');
    if (app.practice.active) {
      ui['wave-current'].textContent = 'P'; ui['wave-total'].textContent = '—'; ui.wave.setAttribute('aria-label', 'Practice');
      ui.phase.textContent = app.practice.step === 'complete' ? 'COMPLETE' : stopped ? 'TIME STOP' : executing ? 'EXECUTING' : 'PRACTICE';
      ui['status-action'].textContent = app.practice.step === 'move' ? 'MOVE / EVADE' : app.practice.step === 'freeze' ? 'TIME STOP READY' : app.practice.step === 'draw' ? 'ROUTE INPUT' : app.practice.step === 'execute' ? 'READY TO EXECUTE' : 'TRAINING COMPLETE';
      ui.hint.textContent = app.practice.step === 'move' ? (touchControls ? 'MOVE PADで自機を少し動かす' : 'マウスで自機を少し動かす') : app.practice.step === 'freeze' ? (touchControls ? 'TIME STOPボタンで世界を止める' : 'SPACEで世界を止める') : app.practice.step === 'draw' ? (touchControls ? 'MOVE PADで2体を通るルートを描く' : '停止中の2体を線で通過してTARGETにする') : app.practice.step === 'execute' ? (touchControls ? 'EXECUTEボタンでルートを実行' : 'SPACEでルートを実行') : 'WORLD MAPへ戻ります';
      ui['lock-label'].textContent = 'TARGET'; ui['lock-count'].textContent = stopped ? `${locks} / ${targets}` : '—';
      ui['wave-banner'].hidden = true; ui.result.hidden = true; ui.complete.hidden = true;
    }
    $('practice-exit').hidden = !app.practice.active;
    updateTutorial();syncJourneyUi();
  }
  function comboText(kills) { return ['', '1 KILL', 'DOUBLE', 'TRIPLE', 'QUAD'][kills] || `${kills} KILLS`; }
  function resetArtFx() {
    Object.assign(app.artFx, { pendingRoute: null, echo: null, life: 0, flash: 0, scores: [] });
  }
  function showCallout(kills, allClear, perfect = false, finalWave = false) {
    ui.callout.replaceChildren(document.createTextNode(perfect ? 'PERFECT EXECUTION' : comboText(kills)));
    if (allClear) { const bonus = document.createElement('small'); bonus.textContent = finalWave ? `${kills} / ${kills} · FINAL EXECUTION` : `${comboText(kills)} · ALL CLEAR  +${C.scoring.allClearBonus}`; ui.callout.append(bonus); }
    ui.callout.style.setProperty('--strength', String(Math.min(6, kills))); app.calloutLife = perfect ? C.feedback.perfectCalloutSeconds : C.feedback.calloutSeconds;
  }
  function releasePointer() {
    if (gesture && ui.arena.hasPointerCapture(gesture.id)) ui.arena.releasePointerCapture(gesture.id);
    gesture = null; app.routeFx.drawing = false;
  }
  function releaseTouchPad() {
    if (touchPad.id !== null && ui['move-pad'].hasPointerCapture(touchPad.id)) ui['move-pad'].releasePointerCapture(touchPad.id);
    if (touchPad.drawing) app.routeFx.drawing = false;
    touchPad.id = null; touchPad.dx = 0; touchPad.dy = 0; touchPad.contactDistance = 0; touchPad.drawing = false; touchPad.visualDirty = true;
    ui['move-pad'].classList.remove('is-active');
  }
  function resetTouchDrawCursor() { app.touchDraw.cursor = { x: app.world.player.x, y: app.world.player.y }; }
  function syncTouchDrawCursor() {
    const points = app.world.route?.points;
    app.touchDraw.cursor = points?.length ? { ...points[points.length - 1] } : { ...app.world.player };
  }
  function updateTouchPadVisual() {
    if (!touchPad.visualDirty) return;
    touchPad.visualDirty = false;
    const rect = ui['move-pad'].getBoundingClientRect(); if (!rect.width || !rect.height) return;
    const startX = S.clamp((touchPad.startX - rect.left) / rect.width * 100, 0, 100);
    const startY = S.clamp((touchPad.startY - rect.top) / rect.height * 100, 0, 100);
    const x = S.clamp((touchPad.x - rect.left) / rect.width * 100, 0, 100), y = S.clamp((touchPad.y - rect.top) / rect.height * 100, 0, 100);
    const dx = touchPad.x - touchPad.startX, dy = touchPad.y - touchPad.startY;
    ui['move-pad'].style.setProperty('--pad-start-x', `${startX}%`); ui['move-pad'].style.setProperty('--pad-start-y', `${startY}%`);
    ui['move-pad'].style.setProperty('--pad-x', `${x}%`); ui['move-pad'].style.setProperty('--pad-y', `${y}%`);
    ui['move-pad'].style.setProperty('--pad-length', `${Math.hypot(dx, dy)}px`); ui['move-pad'].style.setProperty('--pad-angle', `${Math.atan2(dy, dx)}rad`);
  }
  function notePracticeMovement() {
    if (!app.practice.active || app.practice.step !== 'move' || !app.practice.origin) return;
    if (S.distance(app.practice.origin, app.world.player) < C.practice.moveDistance) return;
    app.practice.step = 'freeze'; app.tutorial.step = 'freeze'; app.world.gauge = C.gauge.max; sound.playUiConfirm(); updateUi();
  }
  /**
   * Converts screen-space PAD motion into world-space motion with precision near the origin.
   * @param {number} length
   * @param {number} [scale=1]
   * @returns {number}
   */
  function touchInputFactor(length, scale = 1) {
    const capped = Math.min(length, C.controls.touchMaxFrameDelta), normalized = capped / length;
    const curve = S.clamp((capped - C.controls.touchPrecisionDistance) / Math.max(1, C.controls.touchFullSpeedDistance - C.controls.touchPrecisionDistance), 0, 1);
    const precision = C.controls.touchPrecisionScale + (1 - C.controls.touchPrecisionScale) * curve;
    return normalized * precision * (touchSensitivity / 100) * scale / Math.max(renderer.scale, 0.01);
  }
  /**
   * Consumes PAD deltas once per animation frame, independent of the browser's pointer event frequency.
   * Both mouse DRAW and PAD DRAW call `addRoutePoint`, keeping TARGET and danger rules identical.
   * @returns {void}
   */
  function applyTouchPadInput() {
    if(J.paused(app.journey)){releaseTouchPad();return;}
    const phase = app.world.phase;
    if (touchPad.id === null || !['normal', 'stopped'].includes(phase) || !touchControls) { updateTouchPadVisual(); return; }
    if (phase === 'stopped' && !touchPad.drawing && touchPad.contactDistance < C.controls.touchDrawStartDistance) { updateTouchPadVisual(); return; }
    let dx = touchPad.dx, dy = touchPad.dy; touchPad.dx = 0; touchPad.dy = 0;
    const length = Math.hypot(dx, dy); if (length > 0 && Number.isFinite(length)) {
      const drawMode = phase === 'stopped', factor = touchInputFactor(length, drawMode ? C.controls.touchDrawSensitivityScale : 1);
      if (drawMode) {
        if (!app.touchDraw.cursor) resetTouchDrawCursor();
        if (!touchPad.drawing) {
          touchPad.drawing = true; app.routeFx.drawing = true;
          if (app.practice.active) app.practice.drawStarted = true;
          lastDrawSound = performance.now(); sound.play('drawStart');
        }
        const margin = C.world.margin, cursor = {
          x: S.clamp(app.touchDraw.cursor.x + dx * factor, margin, C.world.width - margin),
          y: S.clamp(app.touchDraw.cursor.y + dy * factor, margin, C.world.height - margin)
        };
        if (S.distance(cursor, app.touchDraw.cursor) > 0.01) {
          app.touchDraw.cursor = cursor; S.addRoutePoint(app.world, cursor);
          const now = performance.now();
          if (now - lastDrawSound > C.feedback.drawSoundInterval * 1000) { sound.play('draw'); lastDrawSound = now; }
          handleEvents();
        }
      } else {
        S.movePlayer(app.world, { x: app.world.player.x + dx * factor, y: app.world.player.y + dy * factor }); handleEvents(); notePracticeMovement();
      }
    }
    updateTouchPadVisual();
  }
  function configurePracticeWorld() {
    const w = S.createWorld();
    w.phase = 'normal'; w.gauge = 0; w.waveBannerRemaining = 0; w.waveGraceRemaining = 999; w.safetyRemaining = 999;
    w.score = 0; w.totalKills = 0; w.events.length = 0;
    w.enemies = w.enemies.slice(0, C.practice.enemies.length).map((enemy, index) => ({ ...enemy,
      x: C.practice.enemies[index].x, y: C.practice.enemies[index].y, vx: 0, vy: 0, shotRemaining: 999, burstRemaining: 0, delayRemaining: null }));
    w.bullets = C.practice.bullets.map((bullet, index) => ({ id: w.nextBulletId++, enemyId: 0, ...bullet, life: 999, grazed: false, pattern: index ? 'fan' : 'aim' }));
    return w;
  }
  function startPractice() {
    resetArtFx();
    releasePointer(); releaseTouchPad(); app.world = configurePracticeWorld(); app.practice.active = true; app.practice.step = 'move';
    app.touchDraw.cursor = null;
    app.practice.origin = { ...app.world.player }; app.practice.completeRemaining = 0; app.practice.drawStarted = false; app.tutorial.active = true; app.tutorial.step = 'move';
    app.particles = []; app.hits = []; app.shake = 0; app.calloutLife = 0; app.pendingFinal = null; app.damageFx.remaining = 0;
    app.briefingActive = false; briefingUi.screen.hidden = true; document.body.classList.remove('briefing-open');
    titleUi.shell.inert = false; titleUi.shell.removeAttribute('aria-hidden'); renderer.resize(); accumulator = 0; lastTime = 0; updateUi(); ui.arena.focus({ preventScroll: true });
  }
  function finishPractice() {
    trainingPreference.remember('completed'); returnFromTraining();
  }
  function reset(showTutorial = false) {
    Stage.prepare(0);
    resetArtFx();
    releasePointer(); releaseTouchPad(); app.world = S.createWorld(); app.particles = []; app.hits = []; app.shake = 0; app.calloutLife = 0; app.pendingFinal = null;
    app.touchDraw.cursor = null;
    app.practice.active = false; app.practice.step = 'move'; app.practice.origin = null; app.practice.completeRemaining = 0; app.practice.drawStarted = false;
    app.tutorial.active = showTutorial; app.tutorial.step = 'move'; app.damageFx.remaining = 0;
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
      app.titleLeaving = false;
      if (trainingPreference.shouldOffer()) { openTraining(); return; }
      app.titleActive = false; app.titleLeaving = false; app.briefingActive = false; titleUi.screen.hidden = true;
      document.body.classList.remove('title-open');
      showWorldMap();
    };
    if (app.reducedMotion) finish(); else setTimeout(finish, 340);
  }
  function beginFromBriefing() {
    if (!app.briefingActive) return;
    if (app.briefingPage < briefingUi.pages.length - 1) { changeBriefingPage(1); return; }
    sound.unlock(); sound.playUiConfirm(); startPractice();
  }
  function skipTutorial() {
    if (!app.briefingActive) return;
    sound.unlock(); sound.playUiConfirm(); returnFromTraining();
  }
  function returnToTitle() {
    trainingReturn = null;
    app.journey=J.create();
    releasePointer(); releaseTouchPad(); sound.stopTimeClock(); sound.stopAll(); reset(false);
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
  /**
   * Drains semantic simulation events into UI, audio and short-lived visual effects.
   * This boundary keeps simulation.js deterministic and usable by the Node test suite.
   * @returns {void}
   */
  function handleEvents() {
    for (const event of app.world.events) {
      if (event.type === 'stop') {
        resetArtFx();
        if (app.practice.active) { app.practice.step = 'draw'; app.practice.drawStarted = false; app.tutorial.step = 'draw'; }
        releasePointer(); releaseTouchPad(); sound.play('stop'); app.shake = 0; ui.callout.textContent = ''; app.calloutLife = 0;
        resetTouchDrawCursor();
        app.routeFx.lockFlashes = []; sound.startTimeClock();
        Object.assign(app.combatFx, { releaseRemaining: 0, resumeRemaining: 0, releasePulse: 0, trail: [], lastTrail: null, pendingCompletion: null, completionRemaining: 0 });
        app.timeFx.origin = { x: app.world.player.x, y: app.world.player.y };
        app.timeFx.enterRemaining = C.feedback.timeStopVisual.enterSeconds; app.timeFx.exitRemaining = 0;
        ui.phase.classList.remove('stop-phase-pulse'); void ui.phase.offsetWidth; ui.phase.classList.add('stop-phase-pulse');
      } else if (event.type === 'cancel') {
        if (app.practice.active) { app.practice.step = 'freeze'; app.practice.drawStarted = false; app.tutorial.step = 'freeze'; app.world.gauge = C.gauge.max; }
        releasePointer(); releaseTouchPad(); app.touchDraw.cursor = null; sound.stopTimeClock(); sound.playTimeResume();
        Object.assign(app.combatFx, { releaseRemaining: 0, resumeRemaining: 0, releasePulse: 0, trail: [], lastTrail: null, pendingCompletion: null, completionRemaining: 0 });
        app.timeFx.enterRemaining = 0; app.timeFx.exitRemaining = C.feedback.timeStopVisual.exitSeconds;
      }
      else if (event.type === 'lock') {
        if (app.practice.active && app.world.route?.locks.length === app.world.enemies.filter(enemy => enemy.alive).length) {
          app.practice.step = 'execute'; app.tutorial.step = 'execute';
        }
        app.routeFx.lockFlashes = app.routeFx.lockFlashes.filter(flash => flash.enemyId !== event.enemyId);
        app.routeFx.lockFlashes.push({ enemyId: event.enemyId, order: event.order, life: C.feedback.routeVisual.lockFlashSeconds });
        sound.playTargetLock(event.order); ui['lock-count'].classList.remove('lock-pulse'); void ui['lock-count'].offsetWidth; ui['lock-count'].classList.add('lock-pulse');
      }
      else if (event.type === 'execute') {
        app.artFx.pendingRoute = app.world.route?.points.map(point => ({ ...point })) || null;
        app.artFx.origin = { ...app.world.player };
        if (app.practice.active) { app.practice.step = 'running'; app.tutorial.step = 'running'; }
        releasePointer(); releaseTouchPad(); app.touchDraw.cursor = null; sound.beginExecute();
        Object.assign(app.combatFx, { releaseRemaining: C.feedback.executeVisual.chargeSeconds, resumeRemaining: 0, releasePulse: 0, trail: [], lastTrail: { ...app.world.player }, pendingCompletion: null, completionRemaining: 0 });
        app.timeFx.enterRemaining = 0; app.timeFx.exitRemaining = 0;
      }
      else if (event.type === 'hit') {
        sound.playSlash(event.order, event.last); if (event.defeated) sound.playKill(event.order, event.last);
        app.shake = event.last ? C.feedback.finalShake : C.feedback.shake;
        particle(event.x, event.y, event.defeated ? '#f6cc86' : '#ff9499', event.defeated ? C.feedback.particlesPerEnemy : 4, event.last ? 1.5 : 1.1);
        if (event.defeated) {
          app.artFx.scores.push({ x: event.x, y: event.y, life: .65,
            value: C.scoring.baseKill + (app.world.execution.kills - 1) * C.scoring.chainBonus });
          if (app.artFx.scores.length > 12) app.artFx.scores.shift();
          ui.score.classList.remove('score-earned'); void ui.score.offsetWidth; ui.score.classList.add('score-earned');
        }
        const enemy = app.world.enemies.find(item => item.id === event.enemyId);
        app.hits.push({ ...event, enemy: enemy ? { ...enemy } : null, life: C.feedback.hitEffectLifetime * 1.5, maxLife: C.feedback.hitEffectLifetime * 1.5 });
      } else if (event.type === 'done') {
        app.artFx.echo = app.artFx.pendingRoute; app.artFx.pendingRoute = null; app.artFx.life = .65;
        if (app.practice.active && event.allClear) {
          app.practice.step = 'complete'; app.tutorial.step = 'complete'; app.practice.completeRemaining = C.practice.completeSeconds;
          app.world.phase = 'practice-complete'; app.world.bullets.length = 0;
        } else if (app.practice.active) {
          app.practice.step = 'freeze'; app.tutorial.step = 'freeze'; app.world.gauge = C.gauge.max;
        } else if (app.tutorial.active && event.kills > 0) app.tutorial.active = false;
        app.combatFx.releaseRemaining = 0; app.combatFx.resumeRemaining = C.feedback.executeVisual.resumeAfterglowSeconds;
        if (event.finalWave) { ui.callout.textContent = ''; app.calloutLife = 0; app.pendingFinal = { ...event, wait: C.feedback.finalSilence }; }
        else if (event.kills > 0) { showCallout(event.kills, event.allClear, event.perfect); if (event.perfect) { app.combatFx.pendingCompletion = 'perfect'; app.shake = C.feedback.perfectShake; } }
      } else if (event.type === 'waveClear') {
        if(!event.perfect)app.combatFx.pendingCompletion='clear';
        if(!app.practice.active&&J.cleared(app.journey,event.wave,app.artFx.echo,app.world.player)){
          releasePointer();releaseTouchPad();heldKeys.clear();sound.stopTimeClock();accumulator=0;
          // The existing simulation has already removed defeated enemies and bullets. Clear only presentation residue.
          sound.stopAll();resetArtFx();app.particles=[];app.hits=[];app.shake=0;app.pendingFinal=null;app.calloutLife=0;ui.callout.textContent='';
          app.combatFx.releaseRemaining=0;app.combatFx.resumeRemaining=0;app.combatFx.releasePulse=0;app.combatFx.pendingCompletion=null;app.combatFx.completionRemaining=0;app.combatFx.trail=[];
          app.timeFx.blend=0;app.timeFx.enterRemaining=0;app.timeFx.exitRemaining=0;
        }
      }
      else if (event.type === 'waveStart') {
        ui['wave-banner'].classList.remove('wave-enter'); void ui['wave-banner'].offsetWidth; ui['wave-banner'].classList.add('wave-enter');
      }
      else if (event.type === 'rulePreview') { releasePointer(); sound.stopTimeClock(); ui.callout.textContent = ''; app.calloutLife = 0; }
      else if (event.type === 'oneStopFail') { app.tutorial.active = false; releasePointer(); releaseTouchPad(); app.touchDraw.cursor = null; sound.stopTimeClock(); app.combatFx.pendingCompletion = 'incomplete'; }
      else if (event.type === 'fail') {
        resetArtFx();
        if (app.practice.active) { app.world.failed = false; app.world.life = 1; app.world.phase = 'normal'; app.world.safetyRemaining = 999; app.world.waveGraceRemaining = 999; app.world.gauge = app.practice.step === 'move' ? 0 : C.gauge.max; }
        else app.tutorial.active = false;
        sound.stopTimeClock(); sound.playDamage(); particle(event.x, event.y, '#ff6971', 12); app.shake = C.feedback.damageShake;
        app.damageFx.remaining = app.damageFx.max; ui.life.classList.remove('life-hit'); void ui.life.offsetWidth; ui.life.classList.add('life-hit');
        Object.assign(app.combatFx, { releaseRemaining: 0, resumeRemaining: 0, releasePulse: 0, trail: [], lastTrail: null, pendingCompletion: null, completionRemaining: 0 });
        app.timeFx.enterRemaining = 0; app.timeFx.exitRemaining = C.feedback.timeStopVisual.exitSeconds;
        releasePointer(); releaseTouchPad(); app.touchDraw.cursor = null; ui.callout.textContent = ''; app.calloutLife = 0;
      }
    }
    app.world.events.length = 0; updateUi();
  }
  /** Routes the shared TIME STOP / EXECUTE command without duplicating phase rules in input handlers. */
  function toggleTime() {
    if(J.paused(app.journey))return;
    sound.unlock();
    if (app.world.phase === 'normal') S.stopTime(app.world);
    else if (app.world.phase === 'stopped') {
      if (app.practice.active) app.world.bullets.length = 0;
      S.executeRoute(app.world);
    }
    handleEvents();
  }
  function drawPoint(event) {
    S.addRoutePoint(app.world, renderer.position(event));
    if (event.timeStamp - lastDrawSound > C.feedback.drawSoundInterval * 1000) { sound.play('draw'); lastDrawSound = event.timeStamp; }
    handleEvents();
  }
  /**
   * Handles fine-pointer MOVE/DRAW only; touch coordinates are accepted exclusively from MOVE PAD.
   * @param {PointerEvent} event
   * @returns {void}
   */
  function pointerMove(event) {
    if(J.paused(app.journey))return;
    const w = app.world, p = renderer.position(event);
    if (w.phase === 'normal') {
      if (insideField(p) && document.elementFromPoint(event.clientX, event.clientY) === ui.arena) S.movePlayer(w, p);
      handleEvents(); notePracticeMovement(); return;
    }
    if (w.phase !== 'stopped' || !gesture || event.pointerId !== gesture.id) return;
    if (!gesture.moved && S.distance(p, gesture.start) < C.drawing.pointSpacing) return;
    if (!gesture.moved) { S.addRoutePoint(w, gesture.start); gesture.moved = true; app.routeFx.drawing = true; if (app.practice.active) app.practice.drawStarted = true; lastDrawSound = event.timeStamp; sound.play('drawStart'); }
    drawPoint(event);
  }
  function insideField(p) {
    return p.x >= C.world.margin && p.x <= C.world.width - C.world.margin &&
      p.y >= C.world.margin && p.y <= C.world.height - C.world.margin;
  }
  ui.arena.addEventListener('pointerdown', event => {
    if(J.paused(app.journey))return;
    if (event.button !== 0 || gesture || !['normal', 'stopped'].includes(app.world.phase)) return;
    if (event.pointerType === 'touch') return;
    const p = renderer.position(event); if (!renderer.contains(p)) return;
    if (app.world.phase === 'normal' && !insideField(p)) return;
    sound.unlock(); ui.arena.focus({ preventScroll: true });
    if (app.world.phase === 'normal') { S.movePlayer(app.world, p); handleEvents(); notePracticeMovement(); if (app.world.failed) return; }
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
  ui['move-pad'].addEventListener('pointerdown', event => {
    if(J.paused(app.journey))return;
    if (event.button !== 0 || touchPad.id !== null || !touchControls || !['normal', 'stopped'].includes(app.world.phase)) return;
    sound.unlock(); touchPad.id = event.pointerId; touchPad.lastX = touchPad.startX = touchPad.x = event.clientX; touchPad.lastY = touchPad.startY = touchPad.y = event.clientY;
    touchPad.dx = 0; touchPad.dy = 0; touchPad.contactDistance = 0; touchPad.drawing = false; touchPad.visualDirty = true; ui['move-pad'].classList.add('is-active'); ui['move-pad'].setPointerCapture(event.pointerId); event.preventDefault();
  });
  ui['move-pad'].addEventListener('pointermove', event => {
    if (event.pointerId !== touchPad.id) return;
    const dx = event.clientX - touchPad.lastX, dy = event.clientY - touchPad.lastY;
    if (Number.isFinite(dx) && Number.isFinite(dy)) { touchPad.dx += dx; touchPad.dy += dy; touchPad.contactDistance += Math.hypot(dx, dy); touchPad.lastX = touchPad.x = event.clientX; touchPad.lastY = touchPad.y = event.clientY; touchPad.visualDirty = true; }
    event.preventDefault();
  });
  const endTouchPad = event => { if (event.pointerId === touchPad.id) { applyTouchPadInput(); releaseTouchPad(); updateTouchPadVisual(); updateUi(); } };
  ui['move-pad'].addEventListener('pointerup', endTouchPad);
  ui['move-pad'].addEventListener('pointercancel', endTouchPad);
  ui['move-pad'].addEventListener('lostpointercapture', event => { if (event.pointerId === touchPad.id) releaseTouchPad(); });
  function syncPracticeRouteStep() {
    if (!app.practice.active || app.world.phase !== 'stopped') return;
    const locked = app.world.route?.locks.length || 0, alive = app.world.enemies.filter(enemy => enemy.alive).length;
    app.practice.step = locked > 0 && locked === alive ? 'execute' : 'draw'; app.tutorial.step = app.practice.step;
  }
  function undo() { releasePointer(); releaseTouchPad(); app.routeFx.lockFlashes = []; S.undoRoute(app.world); syncTouchDrawCursor(); syncPracticeRouteStep(); updateUi(); }
  function clear() { releasePointer(); releaseTouchPad(); app.routeFx.lockFlashes = []; S.clearRoute(app.world); resetTouchDrawCursor(); syncPracticeRouteStep(); updateUi(); }
  function cancel() { releaseTouchPad(); S.cancelStop(app.world); handleEvents(); }
  function showRuleIntro() { S.acknowledgeRulePreview(app.world); handleEvents(); }
  function startOneStop() { S.startPendingWave(app.world); handleEvents(); }
  function retryWave(multiplier = C.waves.timeLimitAssist.standard) {
    resetArtFx();
    releasePointer(); releaseTouchPad(); S.retryWave(app.world, multiplier); app.touchDraw.cursor = null; app.particles = []; app.hits = []; app.shake = 0; app.calloutLife = 0; app.pendingFinal = null;
    app.tutorial.active = false; app.damageFx.remaining = 0;
    app.timeFx.blend = 0; app.timeFx.enterRemaining = 0; app.timeFx.exitRemaining = 0;
    app.routeFx.lockFlashes = []; sound.stopTimeClock(); sound.stopAll();
    Object.assign(app.combatFx, { releaseRemaining: 0, resumeRemaining: 0, releasePulse: 0, trail: [], lastTrail: null, pendingCompletion: null, completionRemaining: 0 });
    accumulator = 0; lastTime = 0; lastDrawSound = 0; ui.callout.textContent = ''; handleEvents(); ui.arena.focus({ preventScroll: true });
  }
  ui.arena.addEventListener('contextmenu', event => {
    event.preventDefault();
    // A long press may synthesize contextmenu after pointerup. Canvas touch never edits the route.
    if (event.pointerType === 'touch' || (coarsePointer && event.pointerType !== 'mouse')) return;
    undo();
  });
  /**
   * Binds one logical command to touch pointerup and click without accepting the synthesized click twice.
   * @param {HTMLButtonElement} button
   * @param {(event: Event) => void} action
   * @returns {void}
   */
  function bindTouchSafeCommand(button, action) {
    let touchUpAt = -Infinity;
    button.addEventListener('pointerup', event => {
      if (event.pointerType !== 'touch' || button.disabled) return;
      touchUpAt = performance.now(); action(event);
    });
    button.addEventListener('click', event => {
      if (performance.now() - touchUpAt < 500) return;
      action(event);
    });
  }
  bindTouchSafeCommand(ui['time-stop'], event => {
    // Input identity, not screen width, authorizes touch EXECUTE on hybrid devices.
    if (app.world.phase === 'normal' || (app.world.phase === 'stopped' && event.pointerType === 'touch')) toggleTime();
  });
  bindTouchSafeCommand(ui['clear-route'], clear);
  bindTouchSafeCommand(ui['undo-route'], undo);
  bindTouchSafeCommand(ui['cancel-stop'], cancel);
  ui.restart.addEventListener('click', () => app.practice.active ? startPractice() : restartJourney());
  ui.retry.addEventListener('click', () => retryWave());
  ui['play-again'].addEventListener('click', restartJourney);
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
  mapUi['map-enter'].addEventListener('click',()=>enterArea(app.journey.selected));
  mapUi['map-training'].addEventListener('click',openTraining);
  $('title-training').addEventListener('click',openTraining);
  $('title-training-launch').addEventListener('click',openTraining);
  bindTouchSafeCommand($('practice-exit'),returnFromTraining);
  mapUi['map-title'].addEventListener('click',returnToTitle);
  mapUi['stage-retry'].addEventListener('click',()=>{Stage.retry(app.journey.active);updateUi();});
  mapUi['stage-title'].addEventListener('click',returnToTitle);
  mapUi['ending-title-button'].addEventListener('click',returnToTitle);
  mapUi['ending-restart'].addEventListener('click',restartJourney);
  briefingUi.begin.addEventListener('click', beginFromBriefing);
  briefingUi.back.addEventListener('click', () => changeBriefingPage(-1));
  briefingUi.skip.addEventListener('click', skipTutorial);
  for (const button of titleUi.infoButtons) button.addEventListener('click', () => { sound.unlock(); sound.playUiConfirm(); toggleTitleInfo(button.dataset.titleInfo); });
  titleUi.master.addEventListener('input', () => { sound.setMasterVolume(titleUi.master.value); syncSoundUi(); });
  titleUi.sfx.addEventListener('input', () => { sound.setSfxVolume(titleUi.sfx.value); syncSoundUi(); });
  titleUi.mute.addEventListener('click', () => { sound.setMuted(!sound.muted); syncSoundUi(); if (!sound.muted) sound.playUiConfirm(); });
  titleUi.touchSensitivity.addEventListener('input', () => saveTouchSensitivity(titleUi.touchSensitivity.value));
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
      if (event.target.closest?.('button') && event.target !== briefingUi.begin) return;
      if (['Space', 'Enter', 'KeyZ'].includes(event.code)) {
        event.preventDefault();
        if (event.repeat || heldKeys.has(event.code)) return;
        heldKeys.add(event.code); beginFromBriefing();
      } else if (['Escape', 'KeyX', 'ArrowLeft'].includes(event.code)) { event.preventDefault(); changeBriefingPage(-1); }
      return;
    }
    if (app.practice.active && event.target === $('practice-exit')) return;
    if(J.onMap(app.journey)) {
      if(event.code==='Escape'){event.preventDefault();returnToTitle();}
      return; // Native keyboard activation of map buttons; never leak SPACE into TIME STOP.
    }
    if(app.journey.mode==='entering' && event.target.closest?.('#stage-loading-actions')) return;
    if(J.paused(app.journey)) { if(commandKeys.has(event.code))event.preventDefault();return; }
    if (!commandKeys.has(event.code) || event.isComposing || event.ctrlKey || event.metaKey || event.altKey ||
        /INPUT|TEXTAREA|SELECT|SUMMARY/.test(event.target.tagName) || event.target.isContentEditable) return;
    event.preventDefault(); // Also suppress default scroll/button activation on repeated SPACE.
    if (event.repeat || heldKeys.has(event.code)) return;
    heldKeys.add(event.code); setTouchControls(false);
    if (event.code === 'Space') {
      if (app.world.failed || app.world.phase === 'one-stop-failed') retryWave();
      else if (app.world.phase === 'complete') restartJourney();
      else if (app.world.phase === 'rule-preview') showRuleIntro();
      else if (app.world.phase === 'rule-intro') startOneStop();
      else toggleTime();
    }
    else if (['Digit1', 'Numpad1'].includes(event.code) && (app.world.failed || app.world.phase === 'one-stop-failed')) retryWave(C.waves.timeLimitAssist.first);
    else if (['Digit2', 'Numpad2'].includes(event.code) && (app.world.failed || app.world.phase === 'one-stop-failed')) retryWave(C.waves.timeLimitAssist.second);
    else if (event.code === 'KeyZ') undo();
    else if (event.code === 'KeyX') clear();
    else if (event.code === 'KeyC' || event.code === 'Escape') cancel();
    else if (event.code === 'KeyR' && app.world.phase !== 'executing') { if (app.practice.active) startPractice(); else restartJourney(); }
    else if (app.world.failed && event.code === 'Enter') retryWave();
  });
  document.addEventListener('keyup', event => {
    if (heldKeys.delete(event.code)) event.preventDefault();
  });
  ui.debug.hidden = !app.debugEnabled;
  ui['debug-shapes'].addEventListener('change', () => { app.debugShapes = ui['debug-shapes'].checked; });
  new ResizeObserver(() => { releasePointer(); releaseTouchPad(); renderer.resize(); }).observe(ui.arena);
  document.addEventListener('visibilitychange', () => { releasePointer(); releaseTouchPad(); if (document.hidden) sound.stopTimeClock(); lastTime = 0; accumulator = 0; });
  window.addEventListener('blur', () => { releasePointer(); releaseTouchPad(); heldKeys.clear(); sound.stopTimeClock(); });
  /**
   * Runs responsive input/effects at display rate and gameplay at a fixed step.
   * The accumulator is cleared during presentation holds so hit stop never causes simulation catch-up.
   * @param {DOMHighResTimeStamp} now
   * @returns {void}
   */
  function frame(now) {
    const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0; lastTime = now;
    if (document.hidden) { requestAnimationFrame(frame); return; }
    const journeyChange=J.tick(app.journey,dt,app.reducedMotion,Stage.status(app.journey.active)==='ready');
    if(journeyChange==='map')showWorldMap();
    else if(journeyChange==='battle'){Stage.prepare(app.journey.active,true);updateUi();ui.arena.focus({preventScroll:true});}
    else if(journeyChange==='ending'){updateUi();mapUi['map-notice'].textContent='5 / 5 AREAS ONLINE';mapUi['ending-restart'].focus({preventScroll:true});}
    const presentationKey=[app.journey.mode,Stage.status(app.journey.active),J.restorationFrame(app.journey,app.reducedMotion).stage,J.finaleFrame(app.journey,app.reducedMotion).sync].join('/');
    if(app.presentationKey!==presentationKey){app.presentationKey=presentationKey;syncJourneyUi();}
    if(J.onMap(app.journey))mapView.animate(app.journey,app.reducedMotion);
    applyTouchPadInput();
    const releaseHold = app.world.phase === 'executing' && app.combatFx.releaseRemaining > 0;
    const resumeHold = app.combatFx.resumeRemaining > 0;
    if (releaseHold) {
      app.combatFx.releaseRemaining = Math.max(0, app.combatFx.releaseRemaining - dt); accumulator = 0;
      if (app.combatFx.releaseRemaining <= 0) { sound.playExecuteRelease(); app.combatFx.releasePulse = C.feedback.executeVisual.releasePulseSeconds; app.artFx.flash = .22; }
    }
    if (resumeHold) {
      app.combatFx.resumeRemaining = Math.max(0, app.combatFx.resumeRemaining - dt); accumulator = 0;
      if (app.combatFx.resumeRemaining <= 0) {
        sound.playTimeResume(); app.timeFx.exitRemaining = C.feedback.timeStopVisual.exitSeconds;
        if (app.combatFx.pendingCompletion) { app.combatFx.completionRemaining = 0.08; }
      }
    }
    if (app.titleActive || app.briefingActive || J.paused(app.journey) || releaseHold || resumeHold) accumulator = 0;
    else {
      accumulator += dt;
      while (accumulator >= C.world.fixedStep) {
        if (J.paused(app.journey) || (app.world.phase === 'executing' && app.combatFx.releaseRemaining > 0) || app.combatFx.resumeRemaining > 0) { accumulator = 0; break; }
        S.step(app.world); accumulator -= C.world.fixedStep; handleEvents();
      }
    }
    if (app.practice.active && app.practice.step === 'complete') {
      app.practice.completeRemaining = Math.max(0, app.practice.completeRemaining - dt);
      if (app.practice.completeRemaining <= 0) finishPractice();
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
    app.artFx.flash = Math.max(0, app.artFx.flash - dt);
    app.artFx.life = Math.max(0, app.artFx.life - dt);
    if (app.artFx.life <= 0) app.artFx.echo = null;
    for (let i = app.artFx.scores.length - 1; i >= 0; i--) {
      app.artFx.scores[i].life -= dt;
      if (app.artFx.scores[i].life <= 0) app.artFx.scores.splice(i, 1);
    }
    if(!J.onMap(app.journey))renderer.draw(app);
    if (app.debugEnabled && now - debugClock > 200) {
      debugClock = now; const w = app.world;
      ui['debug-values'].textContent = `phase=${w.phase} world=${w.time.toFixed(3)} points=${w.route?.points.length || 0} bullets=${w.bullets.length} run=${w.execution?.elapsed.toFixed(3) || 0}s`;
    }
    requestAnimationFrame(frame);
  }
  touchSensitivity = loadTouchSensitivity(); syncTouchSensitivityUi(); syncSoundUi(); updateBriefingPage(); reset(); titleUi.start.focus({ preventScroll: true }); requestAnimationFrame(frame);
  if (app.debugEnabled) root.Deadline.inspect = () => JSON.parse(JSON.stringify({ world: app.world, drawing: !!gesture,
    trainingPreference: trainingPreference.status(), journey: app.journey, stageArt: Stage.inspect(),
    particles: app.particles, hits: app.hits, timeFx: app.timeFx, routeFx: app.routeFx, combatFx: app.combatFx, artFx: app.artFx, tutorial: app.tutorial, practice: app.practice,
    touchPad: { active: touchPad.id !== null, drawing: touchPad.drawing, contactDistance: touchPad.contactDistance, sensitivity: touchSensitivity }, touchDraw: app.touchDraw,
    damageFx: app.damageFx, audio: sound.inspect(), titleActive: app.titleActive, titleLeaving: app.titleLeaving, briefingActive: app.briefingActive, briefingPage: app.briefingPage, touchControls, reducedMotion: app.reducedMotion }));
})(globalThis);
