import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const out = path.resolve('../output/載入檢查'); await mkdir(out, {recursive: true});
const browser = await chromium.launch({channel: 'chrome', headless: true});
const errors = [];
try {
  const fault = await browser.newContext({viewport: {width: 1280, height: 720}, serviceWorkers: 'block'});
  const page = await fault.newPage(); page.on('pageerror', error => errors.push(error.message));
  let repaired = false, attempts = 0;
  await page.route(url => decodeURIComponent(url.pathname).endsWith('/item/金珠.png'), route => {
    attempts++;
    return repaired ? route.continue() : route.fulfill({status: 503, body: 'temporary outage'});
  });
  await page.goto('http://127.0.0.1:5173/');
  const retry = page.getByRole('button', {name: '重試載入圖片', exact: true});
  await retry.waitFor({timeout: 60000});
  const failedPercent = Number(await page.getByRole('progressbar').getAttribute('aria-valuenow'));
  assert.ok(failedPercent < 100 && attempts >= 3, 'Failed images must not display 100% or allow entry');
  assert.equal(await page.getByRole('button', {name: /^經典版本 經典版本/}).count(), 0);
  await page.screenshot({path: path.join(out, '04-失敗重試提示.png')});
  repaired = true; await retry.click();
  await page.getByRole('button', {name: /^經典版本 經典版本/}).waitFor({timeout: 60000});
  assert.equal(await retry.count(), 0);
  await fault.close();

  const cached = await browser.newContext({viewport: {width: 1280, height: 720}});
  const production = await cached.newPage(); production.on('pageerror', error => errors.push(error.message));
  await production.goto('http://127.0.0.1:5174/');
  await production.getByRole('button', {name: /^經典版本 經典版本/}).waitFor({timeout: 60000});
  await production.waitForFunction(() => Boolean(navigator.serviceWorker.controller), {timeout: 30000});
  const pictures = ['assets/鬼斯00.webp', 'assets/鬼斯01.webp', 'gym/小青.webp', 'gym/小剛03.webp', 'champion/竹蘭02.webp', 'item/金珠.png'];
  await production.evaluate(async pictures => {
    for (const picture of pictures) {
      const response = await fetch(picture, {cache: 'reload'});
      if (!response.ok) throw new Error(picture);
      await response.arrayBuffer();
    }
  }, pictures);
  await production.waitForFunction(async pictures => (await Promise.all(pictures.map(picture => caches.match(new URL(picture, location.href))))).every(Boolean), pictures);
  await cached.setOffline(true);
  const offline = await production.evaluate(async pictures => {
    const bad = [];
    for (const picture of pictures) {
      const image = new Image(); image.src = picture;
      try { await image.decode(); } catch { bad.push(picture); }
    }
    return {bad, caches: await caches.keys()};
  }, pictures);
  assert.deepEqual(offline.bad, [], 'Cached unit, player, opponent, tutorial and reward images must work offline');
  assert.ok(offline.caches.some(name => name.startsWith('pkm-autochess-assets-')));
  await cached.setOffline(false);
  await cached.close();
  assert.deepEqual(errors, []);
  const result = {errors, attempts, failedPercent, manualRetry: true, productionCache: offline};
  await writeFile(path.join(out, 'recovery-cache.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
