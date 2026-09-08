(function (root) {
  'use strict';
  // Presentation metadata only: widths use the same logical units as the 960 × 600 arena.
  // Anchors locate Pico's head / each enemy's luminous core, not the image's bounding-box center.
  const definitions = {
    pico: { file: 'pico-final.png', width: 48, anchorX: .56, anchorY: .47 },
    enemy01: { file: 'enemy-01.png', width: 52, anchorX: .499, anchorY: .478 },
    enemy02: { file: 'enemy-02.png', width: 52, anchorX: .5, anchorY: .555 },
    enemy03: { file: 'enemy-03.png', width: 50, anchorX: .504, anchorY: .482 }
  };
  const enemyTypes = Object.freeze({ aim: 'enemy02', fan: 'enemy02', burst: 'enemy01', rotate: 'enemy03', delay: 'enemy03' });
  const entries = {};
  const ready = Promise.all(Object.entries(definitions).map(([key, definition]) => new Promise(resolve => {
    const image = new Image();
    const entry = entries[key] = { ...definition, image, status: 'loading', stamp: null, flash: null };
    image.onload = () => {
      // Cache a small, high-resolution stamp once. No per-frame image decoding/filtering.
      // drawImage preserves PNG alpha and aspect ratio, also when index.html is opened directly with file://.
      const stamp = document.createElement('canvas');
      stamp.width = 192; stamp.height = Math.round(stamp.width * image.naturalHeight / image.naturalWidth);
      const context = stamp.getContext('2d');
      context.imageSmoothingQuality = 'high';
      // TASK B reserves cyan for TARGET. Recolor only the displayed triangular enemy; source PNG stays intact.
      if (key === 'enemy02') context.filter = 'hue-rotate(125deg)';
      context.drawImage(image, 0, 0, stamp.width, stamp.height); context.filter = 'none';
      const flash = document.createElement('canvas'); flash.width = stamp.width; flash.height = stamp.height;
      const glow = flash.getContext('2d'); glow.drawImage(stamp, 0, 0);
      glow.globalCompositeOperation = 'source-in'; glow.fillStyle = '#fff5dc'; glow.fillRect(0, 0, flash.width, flash.height);
      entry.stamp = stamp; entry.flash = flash; entry.height = definition.width * image.naturalHeight / image.naturalWidth;
      if (key === 'pico') {
        // A neutral-white damage silhouette; retain the warm stamp for other combat highlights.
        const white = document.createElement('canvas'); white.width = stamp.width; white.height = stamp.height;
        const mask = white.getContext('2d'); mask.drawImage(stamp, 0, 0);
        mask.globalCompositeOperation = 'source-in'; mask.fillStyle = '#ffffff'; mask.fillRect(0, 0, white.width, white.height);
        entry.deathFlash = white;
      }
      entry.status = 'ready'; resolve(entry.status);
    };
    image.onerror = () => { entry.status = 'error'; resolve(entry.status); };
    image.src = `assets/characters/${definition.file}`;
  })));
  // Loading / failed images use the renderer's existing vector body; the simulation never waits for an asset.
  root.Deadline.characters = { entries, enemyTypes, ready };
})(window);
