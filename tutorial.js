(function (root) {
  'use strict';
  const C = root.Deadline?.config || (typeof require === 'function' ? require('./config.js') : null);
  const S = root.Deadline?.sim || (typeof require === 'function' ? require('./simulation.js') : null);
  // A separate rehearsal world. The production Wave table, AI and collision functions are never changed.
  const start = { x: 160, y: 430 }, beacon = { x: 440, y: 430 };
  const lessons = {
    move: [1, 'PICO / あなたの小さな光', '暖かい黄金色に光るPicoが、あなたです。少し動かしてみよう。', 'マウスを動かす', 'MOVE PADをスワイプ'],
    freeze: [2, 'TIME STOP / 世界を止める', '敵も弾も止まった時間の中で、飛ぶルートを考えます。練習は時間無制限。本番は制限時間があります。', 'SPACEで時間停止', 'TIME STOPをタップ'],
    draw: [3, 'LINE / Picoの光を描く', 'Picoからドラッグを続けよう。この黄金のLINEは、Picoが超高速で飛ぶときに残す光です。', '押したまま、少し線を引く', 'MOVE PADで線を引く'],
    target: [4, 'TARGET / シアンの輪を通る', '敵の周りに浮かぶシアンのTARGETへ。LINEが輪を通るとロックされ、実行時の攻撃が届きます。', 'そのまま最寄りのTARGETへ', 'MOVE PADで最寄りのTARGETへ'],
    dangerIntro: [5, 'DANGER / 動いている時間は危険', '次は回避の実習。Picoの位置とLINEを戻します。通常時は敵本体と赤・ピンク・紫の弾に触れないように。', '「回避を練習する」へ', '「回避を練習する」へ'],
    evade: [5, 'DANGER / 敵を回り込もう', '正面の敵を上下に回り込み、黄金の輪までPicoを動かそう。触れたらこの練習からやり直せます。', 'マウスで回り込んで黄金の輪へ', 'MOVE PADで回り込んで黄金の輪へ'],
    route: [5, 'DANGER / 弾のない道を選ぶ', '3つのTARGETをつなぎ、弾の列を上下に回り込もう。赤くなったLINEは危険。CLEARで引き直せます。', 'SPACEで止めてから、安全なLINEを描く', 'TIME STOP → MOVE PADで安全なLINE'],
    execute: [6, 'EXECUTE / 小さな光を、解き放つ', '安全なLINEで3つのTARGETをつなげました。Pico自身の光が、描いた道を一気に走ります。', 'SPACEでEXECUTE', 'EXECUTEをタップ'],
    running: [6, 'EXECUTE / 光が走る', 'PicoがLINEを飛び、TARGETを連続で撃破しています。', '飛行中', '飛行中'],
    complete: [7, 'WAVE CLEAR / 光を世界へ', '練習完了。本番は2 WAVEごとにAREAを復旧し、次の地区へ進みます。5つの地区に、もういちどひかりを。', 'GARDENのWAVE 1へ', 'GARDENのWAVE 1へ']
  };
  function create() { return { active: true, step: 'move', origin: { ...start }, drawStarted: false, evaded: false, notice: '', history: ['move'] }; }
  function setStep(p, step) { if (p.step !== step) { p.step = step; p.notice = ''; p.history.push(step); } }
  function world() {
    const w = S.createWorld(), template = w.enemies[0];
    Object.assign(w, { phase: 'normal', gauge: 0, waveBannerRemaining: 0, waveGraceRemaining: 0, safetyRemaining: 0, score: 0, totalKills: 0, player: { ...start } });
    w.events.length = 0;
    w.enemies = [{ pattern: 'burst', x: 310, y: 430 }, { pattern: 'aim', x: 700, y: 270 }, { pattern: 'rotate', x: 760, y: 470 }].map((enemy, i) => ({ ...template, ...enemy, id: i + 1, vx: 0, vy: 0, shotRemaining: 999, burstRemaining: 0, delayRemaining: null }));
    w.nextEnemyId = 4;
    w.bullets = [{ id: w.nextBulletId++, enemyId: 0, x: 800, y: 130, vx: -18, vy: 0, life: 999, grazed: false, pattern: 'aim' }];
    return w;
  }
  function beginEvade(w, p) {
    S.cancelStop(w); w.events.length = 0;
    w.player = { ...start }; w.gauge = 0; w.safetyRemaining = 0; w.waveGraceRemaining = 0;
    w.bullets = Array.from({ length: 12 }, (_, i) => ({ id: w.nextBulletId++, enemyId: 0, x: 550, y: 290 + i * 20, vx: -2, vy: 0, life: 999, grazed: false, pattern: ['aim', 'fan', 'rotate'][i % 3] }));
    setStep(p, 'evade');
  }
  function movement(w, p) {
    if (w.failed || w.phase !== 'normal') return false;
    if (p.step === 'move' && S.distance(p.origin, w.player) >= C.practice.moveDistance) { setStep(p, 'freeze'); w.gauge = C.gauge.max; return true; }
    if (p.step === 'evade' && S.distance(beacon, w.player) < 24) { p.evaded = true; setStep(p, 'route'); w.gauge = C.gauge.max; return true; }
    return false;
  }
  function routeStep(w, p) {
    if (w.phase !== 'stopped' || ['dangerIntro', 'running', 'complete'].includes(p.step)) return;
    const r = w.route;
    if (p.evaded) {
      setStep(p, r?.locks.length === 3 && r.length > 0 && r.danger.length === 0 ? 'execute' : 'route');
    } else if (r?.locks.length) setStep(p, 'dangerIntro');
    else setStep(p, r?.length >= 45 ? 'target' : 'draw');
  }
  function canExecute(w, p) { return p.active && p.evaded && p.step === 'execute' && w.phase === 'stopped' && w.route?.locks.length === 3 && w.route.danger.length === 0; }
  const api = { create, world, beginEvade, movement, routeStep, canExecute, setStep, lessons, beacon };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Deadline.training = api;
})(typeof window === 'undefined' ? globalThis : window);
