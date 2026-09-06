/* Title presentation only. Existing game.js owns START, TRAINING and every game transition. */
(function () {
  'use strict';
  const screen = document.getElementById('title-screen'), art = document.getElementById('title-art');
  const panels = [...screen.querySelectorAll('[data-title-panel]')];
  function closePanel(name) {
    const button = screen.querySelector(`[data-title-info="${name}"]`);
    if (!screen.hidden && button?.getAttribute('aria-expanded') === 'true') {
      button.click(); button.focus({ preventScroll: true });
    }
  }
  for (const button of screen.querySelectorAll('[data-title-close]')) {
    button.addEventListener('click', () => closePanel(button.dataset.titleClose));
  }
  screen.addEventListener('keydown', event => {
    if (event.code !== 'Escape') return;
    const panel = panels.find(item => !item.hidden);
    if (panel) { event.preventDefault(); closePanel(panel.dataset.titlePanel); }
  });
  // Narrow windows place reading panels below the picture. Keep their controls reachable.
  new MutationObserver(changes => {
    if (screen.hidden) return;
    const opened = changes.map(change => change.target).find(panel => !panel.hidden);
    if (opened) opened.scrollIntoView({ block: 'nearest' });
  }).observe(screen.querySelector('.title-info'), { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  function imageState() { screen.classList.toggle('title-background-failed', art.complete && art.naturalWidth === 0); }
  art.addEventListener('load', imageState); art.addEventListener('error', imageState); imageState();
})();
