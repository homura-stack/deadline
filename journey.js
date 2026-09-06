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
  const create = () => ({ mode: 'title', restored: 0, selected: 0, active: 0, elapsed: 0, unlockFrom: -1, route: [] });
  const areaForWave = wave => areas[Math.max(0, Math.min(4, Math.floor((wave - 1) / 2)))];
  const status = (state, index) => index < state.restored ? 'online' : index === state.restored && index < areas.length ? 'available' : 'locked';
  const paused = state => ['title', 'map', 'entering', 'restoring'].includes(state.mode);
  function enter(state, index) {
    if (state.mode !== 'map' || !Number.isInteger(index) || status(state, index) !== 'available' || !areas[index]) return false;
    state.active = state.selected = index; state.mode = 'entering'; state.elapsed = 0; state.route = []; return true;
  }
  function cleared(state, wave, route) {
    if (state.mode !== 'battle' || state.active !== state.restored || wave !== areas[state.active].last) return false;
    state.mode = 'restoring'; state.elapsed = 0;
    state.route = (route || []).map(({x,y}) => ({x,y})); return true;
  }
  const restoreSeconds = state => state.active === 0 ? 3.2 : 2.4;
  function tick(state, dt, reduced = false) {
    if (!['entering', 'restoring'].includes(state.mode)) return null;
    state.elapsed += Math.max(0, Math.min(.05, dt));
    if (state.mode === 'entering' && state.elapsed >= (reduced ? .2 : .85)) { state.mode = 'battle'; state.elapsed = 0; return 'battle'; }
    if (state.mode === 'restoring' && state.elapsed >= (reduced ? 1 : restoreSeconds(state))) {
      state.restored = Math.min(areas.length, state.active + 1); state.selected = Math.min(4, state.restored);
      state.unlockFrom = state.active; state.mode = 'map'; state.elapsed = 0; return 'map';
    }
    return null;
  }
  root.Deadline = root.Deadline || {};
  root.Deadline.journey = { areas, create, areaForWave, status, paused, enter, cleared, tick, restoreSeconds };
  if (typeof module !== 'undefined') module.exports = root.Deadline.journey;
})(globalThis);
