(function (root) {
  'use strict';
  // One local preference only. Campaign progress and practice rules live elsewhere.
  const storageKey = 'deadline.tutorial.v1';
  const valid = new Set(['started', 'skipped', 'completed']);
  function createPreferences(getStorage) {
    let state = null;
    try { const saved = getStorage().getItem(storageKey); if (valid.has(saved)) state = saved; } catch (_) { /* Session fallback when storage is unavailable. */ }
    return {
      status: () => state,
      shouldOffer: () => state === null,
      remember(value) {
        if (!valid.has(value) || state === 'completed') return;
        state = value;
        try { getStorage().setItem(storageKey, state); } catch (_) { /* Keep the choice for this page session. */ }
      }
    };
  }
  const api = { storageKey, createPreferences };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Deadline.training = api;
})(typeof window === 'undefined' ? globalThis : window);
