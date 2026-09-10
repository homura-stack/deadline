(function (root) {
  'use strict';
  // Campaign presentation only. Combat tuning and the ten Wave definitions stay in config.js.
  const areas = Object.freeze([
    { id: 'garden', name: 'GARDEN', ja: '蛍庭区', first: 1, last: 2, x: 500, y: 594, color: '#75bfb0', description: '電子植物が眠る、はじまりの庭。' },
    { id: 'forge', name: 'FORGE', ja: '機関区', first: 3, last: 4, x: 210, y: 342, color: '#ce956a', description: '止まった機械が連なる、巨大な工業区。' },
    { id: 'canal', name: 'CANAL', ja: '電流水路区', first: 5, last: 6, x: 790, y: 342, color: '#82c5d3', description: '電流の川をたたえた、水の回路都市。' },
    { id: 'skyline', name: 'SKYLINE', ja: '天蓋区', first: 7, last: 8, x: 500, y: 130, color: '#b5cfde', description: '光を失った塔が、雲の上まで伸びる。' },
    { id: 'core', name: 'CORE', ja: '中央核', first: 9, last: 10, x: 500, y: 345, color: '#e9d49c', description: 'すべての回路が集まる、世界の心臓。' }
  ].map(Object.freeze));
  const create = () => ({ mode: 'title', restored: 0, selected: 0, active: 0, replay: false, elapsed: 0, unlockFrom: -1, route: [], origin: {x:480,y:300} });
  // One immutable AREA checkpoint; no combat objects, selected cursor or duplicate Pico position.
  const progressKey = 'deadline.progress.v1';
  const runKeys = ['score','maxChain','totalKills','perfectExecutions','hitsTaken','time'];
  const freshProgress = () => ({version:1,restored:0,run:Object.fromEntries(runKeys.map(key=>[key,0]))});
  function validProgress(value) {
    if (!value || value.version!==1 || !Number.isInteger(value.restored) || value.restored<0 || value.restored>areas.length || !value.run) return null;
    if (!runKeys.every(key=>typeof value.run[key]==='number' && Number.isFinite(value.run[key]) && value.run[key]>=0 && value.run[key]<=Number.MAX_SAFE_INTEGER && (key==='time'||Number.isSafeInteger(value.run[key])))) return null;
    return {version:1,restored:value.restored,run:Object.fromEntries(runKeys.map(key=>[key,value.run[key]]))};
  }
  function createProgressStore(getStorage) {
    let checkpoint=null,needsWrite=false;
    function refresh() {
      try {
        const saved=validProgress(JSON.parse(getStorage().getItem(progressKey)));
        if(saved && (!checkpoint || saved.restored>=checkpoint.restored)){checkpoint=saved;needsWrite=false;}
      } catch (_) { /* Missing permissions, malformed JSON or quota: retain the page checkpoint. */ }
    }
    return {
      load() { refresh();return structuredClone(checkpoint||freshProgress()); },
      save(state,world) {
        if(state.replay || !['restoring','map','synchronizing','ending'].includes(state.mode))return;
        if(state.mode==='restoring' && state.active!==state.restored)return;
        const next=validProgress({version:1,restored:state.mode==='restoring'?state.active+1:state.restored,run:world});
        if(!next)return;
        refresh();
        // A replay, old tab or repeated map/ENDING notification cannot overwrite a committed AREA.
        if(!checkpoint || next.restored>checkpoint.restored){checkpoint=next;needsWrite=true;}
        if(!needsWrite)return;
        try { getStorage().setItem(progressKey,JSON.stringify(checkpoint));needsWrite=false; } catch (_) { /* Retry only at a later safe checkpoint, never each frame. */ }
      }
    };
  }
  const areaForWave = wave => areas[Math.max(0, Math.min(4, Math.floor((wave - 1) / 2)))];
  const status = (state, index) => index < state.restored ? 'online' : index === state.restored && index < areas.length ? 'available' : 'locked';
  const onMap = state => ['map', 'synchronizing', 'ending'].includes(state.mode);
  const paused = state => state.mode !== 'battle';
  function enter(state, index, replay = false) {
    const areaStatus = status(state, index), permitted = areaStatus === 'available' || (replay && areaStatus === 'online');
    if (state.mode !== 'map' || !Number.isInteger(index) || !permitted || !areas[index]) return false;
    state.active = state.selected = index; state.replay = areaStatus === 'online'; state.mode = 'entering'; state.elapsed = 0; state.route = []; return true;
  }
  function cleared(state, wave, route, player) {
    if (state.mode !== 'battle' || state.replay || state.active !== state.restored || wave !== areas[state.active].last) return false;
    state.mode = 'restoring'; state.elapsed = 0;
    state.route = (route || []).map(({x,y}) => ({x,y}));
    const origin = player || state.route.at(-1) || {x:480,y:300};
    state.origin = {x:origin.x,y:origin.y}; return true;
  }
  const smooth = value => { const x = Math.max(0,Math.min(1,value)); return x*x*(3-2*x); };
  const revealStart = reduced => reduced ? .85 : 1.45;
  const revealEnd = (state,reduced) => reduced ? (state.active===4?2.2:1.8) : (state.active===4?4.75:3.8);
  const restoreSeconds = (state,reduced=false) => revealEnd(state,reduced)+(reduced?.8:1.15);
  function restorationFrame(state,reduced=false) {
    const t=state.elapsed, start=revealStart(reduced), end=revealEnd(state,reduced);
    const reveal=smooth((t-start)/(end-start));
    const dim=smooth((t-.45)/.25), inhale=smooth((t-.7)/(start-.7+.4));
    return {reveal, complete:t>=end, quiet:t<.45, pico:.9-.35*dim+.65*inhale, stage:t<.45?'quiet':t<start?'breathing':t<end?'spreading':'restored'};
  }
  const finaleSeconds = reduced => reduced ? 4 : 8.4;
  function finaleFrame(state,reduced=false) {
    if(state.mode==='ending')return {lights:[1,1,1,1,1],wire:1,stage:'ending',sync:false};
    const t=state.elapsed/(reduced?4/8.4:1);
    let stage='answering', wire=.5;
    const lights=areas.map((_,i)=>{
      if(t<4.4){const alignment=smooth((t-1.5)/2),offset=(i*.56)*(1-alignment);return .48+.34*(.5-.5*Math.cos((t-offset)*Math.PI/1.1));}
      if(t<4.95){stage='sync';return .48-.17*smooth((t-4.4)/.55);}
      if(t<6.8){stage='breathing';return .31+.69*Math.sin(Math.min(1,(t-4.95)/1.85)*Math.PI/2);}
      stage='restored';return 1;
    });
    if(t>=4.4)wire=lights[0];
    return {lights,wire,stage,sync:t>=4.55&&t<5.35};
  }
  // AREA移動から復帰、最終同期までを進める唯一の時間更新点。
  // 背景準備前の操作開始を避けるためenteringはassetsReadyを待ち、タブ復帰時に演出を飛ばさないようdtを50msに制限する。
  // restoredは復帰演出の完了時だけ更新し、表示途中のAREAが進行済みとして保存されるのを防ぐ。
  function tick(state, dt, reduced = false, assetsReady = true) {
    if (!['entering', 'restoring', 'map', 'synchronizing'].includes(state.mode)) return null;
    if(state.mode==='map' && (state.unlockFrom<0 || state.elapsed>=4))return null;
    if(state.mode==='entering' && !assetsReady)return null;
    state.elapsed += Math.max(0, Math.min(.05, dt));
    if (state.mode === 'entering' && state.elapsed >= (reduced ? .2 : .85)) { state.mode = 'battle'; state.elapsed = 0; return 'battle'; }
    if (state.mode === 'restoring' && state.elapsed >= restoreSeconds(state,reduced)) {
      state.restored = Math.min(areas.length, state.active + 1); state.selected = Math.min(4, state.restored);
      state.unlockFrom = state.active; state.mode = state.restored===5?'synchronizing':'map'; state.elapsed = 0; return 'map';
    }
    if(state.mode==='synchronizing' && state.elapsed>=finaleSeconds(reduced)){state.mode='ending';state.elapsed=0;return 'ending';}
    return null;
  }
  root.Deadline = root.Deadline || {};
  root.Deadline.journey = { areas, create, progressKey, createProgressStore, areaForWave, status, onMap, paused, enter, cleared, tick, restoreSeconds, restorationFrame, finaleFrame, finaleSeconds, smooth };
  if (typeof module !== 'undefined') module.exports = root.Deadline.journey;
})(globalThis);
