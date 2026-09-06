/* TASK A asset acceptance. Development-only Playwright; never loaded by the game. */
'use strict';
const {training,battleReady,nextArea}=require('./journey-helpers.cjs');
const { chromium } = require('playwright');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { pathToFileURL } = require('node:url');
const base = process.env.DEADLINE_TEST_URL || 'http://127.0.0.1:4186/';
const artifacts = path.join(__dirname, 'artifacts', 'pico'); fs.mkdirSync(artifacts, { recursive: true });
const report = { browser: '', assets: {}, fixtures: [], errors: [], externalRequests: [], loading: null, failure: null, file: null };
function hook(page) {
  page.on('pageerror', error => report.errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
  page.on('request', request => { if (!request.url().startsWith(new URL(base).origin) && !/^(file|data):/.test(request.url())) report.externalRequests.push(request.url()); });
}
async function enter(page) {
  await page.locator('#title-start').click();
  await training(page);await page.waitForFunction(() => Deadline.inspect().briefingActive);
  await page.locator('#briefing-skip').click();
  await page.waitForFunction(() => Deadline.inspect().world.time > 0);
}
async function fixture(page, mode) {
  return page.evaluate(mode => {
    const { Renderer, sim: S, config: C } = Deadline;
    const canvas = document.createElement('canvas');
    canvas.id = 'asset-fixture'; canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:9999';
    document.body.append(canvas);
    const renderer = new Renderer(canvas), world = S.createWorld();
    const template = world.enemies[0];
    world.enemies = ['burst', 'aim', 'rotate', 'fan', 'delay'].map((pattern, i) => ({ ...template, id: i + 1,
      pattern, x: 130 + i * 175, y: 230, rotateAngle: -.7, delayRemaining: pattern === 'delay' ? .3 : null, delayAngle: -.5 }));
    world.bullets = ['burst', 'aim', 'rotate', 'fan', 'delay'].map((pattern, i) => ({ x:130 + i * 175, y:320, vx:1, vy:0, pattern }));
    world.player = { x:160, y:430 }; world.gauge = 100;
    if (mode !== 'normal') {
      S.stopTime(world);
      for (const e of world.enemies) S.addRoutePoint(world, e);
      S.addRoutePoint(world, { x:880, y:430 });
    }
    const app = { world, particles:[], hits:[], shake:0, timeFx:{ blend:mode === 'normal' ? 0 : 1 },
      reducedMotion:true, debugEnabled:mode === 'hitboxes', debugShapes:mode === 'hitboxes' };
    const before = JSON.stringify(world); renderer.draw(app);
    const g = renderer.ctx;
    g.setTransform(renderer.ratio, 0, 0, renderer.ratio, 0, 0);
    g.translate(renderer.offsetX, renderer.offsetY); g.scale(renderer.scale, renderer.scale);
    g.fillStyle = '#d2d9e2'; g.font = '12px monospace'; g.textAlign = 'center';
    for (const e of world.enemies) g.fillText(e.pattern.toUpperCase(), e.x, 160);
    g.textAlign = 'left'; g.fillText('TASK A / ISOLATED RENDER FIXTURE / ' + mode.toUpperCase(), 40, 52);
    g.fillText('PICO', 120, 478); g.fillText('ACTUAL BULLET SHAPES / UNCHANGED', 300, 345);
    return { worldUnchanged:before === JSON.stringify(world), locks:world.route?.locks.length || 0,
      radii:{ player:C.player.radius, enemy:C.enemy.radius, bullet:C.shooting.bulletRadius },
      scale:renderer.scale, ratio:renderer.ratio, image:canvas.toDataURL('image/png') };
  }, mode);
}
(async () => {
  const browser = await chromium.launch({ channel:'chrome', headless:true }); report.browser = browser.version();
  try {
    const page = await browser.newPage({ viewport:{width:1920,height:1080} }); hook(page);
    await page.goto(base + '?debug'); await page.evaluate(() => Deadline.characters.ready);
    report.assets = await page.evaluate(() => Object.fromEntries(Object.entries(Deadline.characters.entries).map(([key, entry]) => {
      const canvas = document.createElement('canvas'); canvas.width = entry.image.naturalWidth; canvas.height = entry.image.naturalHeight;
      const g = canvas.getContext('2d'); g.drawImage(entry.image, 0, 0);
      const pixels = g.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparent = 0, visible = 0;
      for (let i = 3; i < pixels.length; i += 4) { if (pixels[i] === 0) transparent++; if (pixels[i] > 128) visible++; }
      const at = (x,y) => pixels[(y * canvas.width + x) * 4 + 3];
      return [key, { status:entry.status, width:canvas.width, height:canvas.height,
        aspectError:Math.abs(entry.width / entry.height - canvas.width / canvas.height),
        cornerAlpha:[at(0,0),at(canvas.width-1,0),at(0,canvas.height-1),at(canvas.width-1,canvas.height-1)],
        anchorAlpha:at(Math.floor(entry.anchorX*canvas.width),Math.floor(entry.anchorY*canvas.height)),
        transparentFraction:transparent / (canvas.width*canvas.height), visibleFraction:visible / (canvas.width*canvas.height) }];
    })));
    assert.equal(Object.keys(report.assets).length, 4);
    for (const [name, asset] of Object.entries(report.assets)) {
      assert.equal(asset.status, 'ready', name); assert.ok(asset.aspectError < 1e-9, name);
      assert.deepEqual(asset.cornerAlpha, [0,0,0,0], name); assert.ok(asset.anchorAlpha > 200, name);
      assert.ok(asset.transparentFraction > .3, name); assert.ok(asset.visibleFraction > .15, name);
    }
    // Compare cutouts over two opaque backgrounds. Original reference is intentionally not requested by the game.
    await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.id='asset-sheet'; canvas.width=1200; canvas.height=640;
      canvas.style.cssText='position:fixed;inset:0;width:1200px;height:640px;z-index:9999'; document.body.append(canvas);
      const g=canvas.getContext('2d'); g.fillStyle='#172638'; g.fillRect(0,0,1200,320); g.fillStyle='#cad4dc'; g.fillRect(0,320,1200,320);
      Object.entries(Deadline.characters.entries).forEach(([name,entry], i) => {
        for (const y of [25,345]) g.drawImage(entry.image,35+i*295,y,230,230*entry.image.naturalHeight/entry.image.naturalWidth);
        g.font='14px monospace'; g.fillStyle='#fff'; g.fillText(name,40+i*295,285);
      });
    });
    await page.locator('#asset-sheet').screenshot({ path:path.join(artifacts,'transparency.png') });
    await page.locator('#asset-sheet').evaluate(element => element.remove());
    for (const mode of ['normal','stopped','hitboxes']) {
      const result = await fixture(page, mode); assert.equal(result.worldUnchanged, true);
      assert.deepEqual(result.radii, {player:9,enemy:15,bullet:5}); if (mode !== 'normal') assert.equal(result.locks,5);
      fs.writeFileSync(path.join(artifacts, mode + '-1920.png'), Buffer.from(result.image.split(',')[1], 'base64'));
      const {image, ...detail} = result; report.fixtures.push({mode,...detail});
      await page.locator('#asset-fixture').evaluate(element => element.remove());
    }
    const highDpi = await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:2}); hook(highDpi);
    await highDpi.goto(base+'?debug'); await highDpi.evaluate(()=>Deadline.characters.ready);
    const hidpi = await fixture(highDpi,'hitboxes'); assert.equal(hidpi.ratio,2);
    fs.writeFileSync(path.join(artifacts,'hitboxes-1280-dpr2.png'), Buffer.from(hidpi.image.split(',')[1],'base64'));
    await highDpi.close();
    // Deliberately hold the PNG requests. Gameplay starts normally with readable fallback bodies.
    const slow = await browser.newPage({viewport:{width:1280,height:720}}); hook(slow);
    let releaseImages; const hold = new Promise(resolve => { releaseImages = resolve; });
    await slow.route('**/assets/characters/*.png', async route => { await hold; await route.continue(); });
    await slow.goto(base+'?debug',{waitUntil:'domcontentloaded'});
    assert.ok((await slow.evaluate(()=>Object.values(Deadline.characters.entries).map(e=>e.status))).every(status=>status==='loading'));
    await enter(slow); const before = await slow.evaluate(()=>Deadline.inspect().world);
    releaseImages(); assert.deepEqual(await slow.evaluate(()=>Deadline.characters.ready),['ready','ready','ready','ready']);
    const after = await slow.evaluate(()=>Deadline.inspect().world);
    assert.ok(after.time >= before.time); assert.equal(after.wave,before.wave); assert.equal(after.score,before.score);
    report.loading={simulationStartedWhileLoading:true,recovered:true}; await slow.close();
    // Failed requests are expected in this isolated negative case; normal sessions still require zero console errors.
    const failure = await browser.newPage(); const expectedErrors=[], failedImages=[];
    failure.on('pageerror',error=>report.errors.push(String(error)));
    failure.on('console',message=>{if(message.type()==='error')expectedErrors.push(message.text());});
    await failure.route('**/assets/characters/*.png',route=>{failedImages.push(route.request().url());return route.abort();});
    await failure.goto(base+'?debug'); assert.deepEqual(await failure.evaluate(()=>Deadline.characters.ready),['error','error','error','error']);
    await enter(failure); assert.ok((await failure.evaluate(()=>Deadline.inspect().world.time))>0);
    // The Pico welcome may request the same PNG separately after an aborted preload.
    assert.equal(new Set(failedImages).size,4); assert.equal(expectedErrors.length,failedImages.length);
    assert.ok(expectedErrors.every(text=>text.includes('ERR_FAILED')));
    report.failure={fallbackPlayable:true,expectedNetworkErrors:expectedErrors.length}; await failure.close();
    const local = await browser.newPage(); hook(local);
    await local.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href+'?debug');
    assert.deepEqual(await local.evaluate(()=>Deadline.characters.ready),['ready','ready','ready','ready']);
    await enter(local); report.file={fourSpritesLoaded:true,gameStarted:true}; await local.close();
    assert.deepEqual(report.errors,[]); assert.deepEqual(report.externalRequests,[]);
    console.log('PASS 4 transparent sprites, original aspect ratios, opaque anchors, 5 enemy patterns, unchanged hitboxes/world, TARGET, DPR 2, delayed/failed loading and file:// startup');
  } finally {
    fs.writeFileSync(path.join(artifacts,'acceptance.json'),JSON.stringify(report,null,2)); await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
