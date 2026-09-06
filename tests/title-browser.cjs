/* Focused Chrome checks for the responsive DEAD/LINE title presentation. */
'use strict';
const {training,battleReady,nextArea}=require('./journey-helpers.cjs');
const {assertTitleComposition}=require('./title-helpers.cjs');
const { chromium } = require('playwright');
const assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs');
const base = process.env.DEADLINE_TEST_URL || 'http://127.0.0.1:4186/';
const artifacts = path.join(__dirname, 'artifacts'); fs.mkdirSync(artifacts, { recursive: true });
const viewports = [
  { width: 1280, height: 720, name: 'title-desktop-16x9.png' },
  { width: 1920, height: 1080, name: 'title-desktop-1080p.png' },
  { width: 390, height: 844, name: 'title-mobile-390x844.png' },
  { width: 844, height: 390, name: 'title-mobile-landscape.png' },
  { width: 320, height: 800, name: 'title-mobile-320.png' },
  { width: 360, height: 800, name: 'title-mobile-360.png' },
  { width: 768, height: 800, name: 'title-tablet-768.png' }
];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true }), errors = [];
  try {
    const page = await browser.newPage(); page.on('pageerror', error => errors.push(String(error))); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    for (const viewport of viewports) {
      await page.setViewportSize(viewport); await page.goto(base + '?debug'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(700);
      await assertTitleComposition(page, viewport);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight), true);
      await page.screenshot({ path: path.join(artifacts, viewport.name) });
      await page.locator('[data-title-info="settings"]').click(); const settings = await page.locator('#title-settings').boundingBox();
      assert.ok(settings.y >= 0 && settings.y + settings.height <= viewport.height, `${viewport.width}x${viewport.height} settings=${JSON.stringify(settings)}`); assert.equal(await page.locator('#master-volume').isVisible(), true); assert.equal(await page.locator('#sfx-volume').isVisible(), true);
      await page.screenshot({ path: path.join(artifacts, viewport.name.replace('title-', 'settings-')) }); await page.locator('[data-title-info="settings"]').click();
      await page.locator('#title-start').click(); await page.waitForFunction(() => document.getElementById('title-screen').hidden);await training(page);
      assert.equal(await page.locator('#briefing-screen').isVisible(), true); assert.equal(await page.locator('.briefing-page').count(), 4);
      const begin = await page.locator('#briefing-begin').boundingBox(); assert.ok(begin.y >= 0 && begin.y + begin.height <= viewport.height);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight), true);
      await page.screenshot({ path: path.join(artifacts, viewport.name.replace('title-', 'briefing-')) });
      await page.locator('#briefing-skip').click(); await page.waitForFunction(() => document.getElementById('briefing-screen').hidden);await battleReady(page); await page.waitForTimeout(850);
      const target = await page.evaluate(() => Deadline.inspect().world.enemies.find(enemy => enemy.alive)), canvas = await page.locator('#arena').boundingBox();
      const scale = Math.min(canvas.width / 960, canvas.height / 600), offsetX = (canvas.width - 960 * scale) / 2, offsetY = (canvas.height - 600 * scale) / 2;
      await page.mouse.move(canvas.x + offsetX + target.x * scale, canvas.y + offsetY + target.y * scale); await page.waitForFunction(() => Deadline.inspect().world.phase === 'failed');
      const result = await page.locator('#result').boundingBox(); assert.ok(result.x >= 0 && result.y >= 0 && result.x + result.width <= viewport.width && result.y + result.height <= viewport.height);
      assert.ok((await page.locator('#result .result-actions button').evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect().height))).every(height => height >= 44));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight), true);
    }
    await page.setViewportSize({ width: 1280, height: 720 }); await page.goto(base + '?debug'); await page.waitForLoadState('networkidle');
    await page.locator('[data-title-info="settings"]').click(); await page.locator('#master-volume').fill('37'); await page.locator('#sfx-volume').fill('64');
    await page.waitForTimeout(30); assert.deepEqual(await page.evaluate(() => { const a=Deadline.inspect().audio; return { master:a.masterVolume,sfx:a.sfxVolume,masterGain:Number(a.masterGain.toFixed(2)),sfxGain:Number(a.sfxGain.toFixed(2)) }; }), { master:37,sfx:64,masterGain:.37,sfxGain:.64 });
    await page.locator('#setting-mute').click(); await page.waitForTimeout(30); assert.deepEqual(await page.evaluate(() => { const a=Deadline.inspect().audio; return { master:a.masterVolume,sfx:a.sfxVolume,muted:a.muted,masterGain:Number(a.masterGain.toFixed(2)) }; }), { master:37,sfx:64,muted:true,masterGain:0 });
    await page.reload(); await page.waitForLoadState('networkidle'); assert.equal(await page.locator('#master-volume').inputValue(),'37'); assert.equal(await page.locator('#sfx-volume').inputValue(),'64'); assert.equal(await page.locator('#setting-mute').getAttribute('aria-pressed'),'true');
    await page.evaluate(() => localStorage.setItem(Deadline.config.audio.storageKey,'{"masterVolume":"bad"}')); await page.reload(); await page.waitForLoadState('networkidle'); assert.equal(await page.locator('#master-volume').inputValue(),'80'); assert.equal(await page.locator('#sfx-volume').inputValue(),'90'); assert.equal(await page.locator('#setting-mute').getAttribute('aria-pressed'),'false');
    const before = await page.evaluate(() => Deadline.inspect().world.time); await page.waitForTimeout(220); assert.equal(await page.evaluate(() => Deadline.inspect().world.time), before);
    await page.locator('[data-title-info="how"]').click(); assert.equal(await page.locator('#title-how').isVisible(), true); await page.locator('[data-title-info="credits"]').click(); assert.equal(await page.locator('#title-how').isVisible(), false); assert.equal(await page.locator('#title-credits').isVisible(), true);
    await page.locator('#title-start').click(); assert.equal(await page.locator('#title-screen').evaluate(element => element.classList.contains('is-leaving')), true); await page.waitForFunction(() => document.getElementById('title-screen').hidden);await training(page); assert.equal(await page.evaluate(() => Deadline.inspect().titleActive), false); assert.equal(await page.evaluate(() => Deadline.inspect().briefingActive), true);
    const briefingTime = await page.evaluate(() => Deadline.inspect().world.time); await page.waitForTimeout(220); assert.equal(await page.evaluate(() => Deadline.inspect().world.time), briefingTime); for(let i=0;i<4;i++) await page.keyboard.press('Space'); await page.waitForFunction(() => document.getElementById('briefing-screen').hidden);await battleReady(page); assert.equal(await page.evaluate(() => Deadline.inspect().practice.active),true);
    const reduced = await browser.newPage({ reducedMotion: 'reduce' }); await reduced.goto(base + '?debug'); await reduced.waitForLoadState('networkidle'); assert.equal(await reduced.locator('.title-heading').evaluate(element => getComputedStyle(element).animationName), 'none'); await reduced.keyboard.press('Space'); await reduced.waitForFunction(() => document.getElementById('title-screen').hidden);await training(reduced); assert.equal(await reduced.locator('#briefing-screen').isVisible(), true); assert.equal(await reduced.locator('.briefing-demo *').first().evaluate(element=>getComputedStyle(element).animationName),'none'); await reduced.locator('#briefing-skip').click(); await reduced.waitForFunction(() => document.getElementById('briefing-screen').hidden);await battleReady(reduced); await reduced.close();
    assert.deepEqual(errors, []); console.log(`PASS Chrome ${browser.version()} title and BRIEFING layout at ${viewports.length} viewports`); console.log('PASS title freeze, BRIEFING freeze, BEGIN input and reduced motion');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
