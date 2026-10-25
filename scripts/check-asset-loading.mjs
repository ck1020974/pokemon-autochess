import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const out = path.resolve('../output/載入檢查'); await mkdir(out, {recursive: true});
const browser = await chromium.launch({channel: 'chrome', headless: true});
const context = await browser.newContext({viewport: {width: 1280, height: 720}, serviceWorkers: 'block'});
const page = await context.newPage();
const errors = [], requests = [], progress = [];
let failures = 0, backgroundRequested = false, releaseBackground;
let backgroundStarted;
const backgroundStart = new Promise(resolve => backgroundStarted = resolve);
const backgroundGate = new Promise(resolve => releaseBackground = resolve);
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => { if (/\.(webp|png|OGG)(?:\?|$)/.test(request.url())) requests.push({url: decodeURI(request.url()), type: request.resourceType(), time: Date.now()}); });
await page.route(url => decodeURIComponent(url.pathname).endsWith('/item/金珠.png'), async route => {
  if (++failures <= 2) return route.fulfill({status: 503, body: 'temporary'});
  return route.continue();
});
await page.route('**/icon-512.png', async route => { backgroundRequested = true; backgroundStarted(); await backgroundGate; await route.continue().catch(() => {}); });
await page.addInitScript(() => {
  window.loadingSamples = [];
  new MutationObserver(() => {
    const bars = [...document.querySelectorAll('[role="progressbar"]')];
    for (const bar of bars) window.loadingSamples.push(Number(bar.getAttribute('aria-valuenow')));
  }).observe(document, {subtree: true, childList: true, attributes: true, attributeFilter: ['aria-valuenow']});
});
const checkImages = async label => {
  await page.waitForFunction(() => [...document.images].filter(image => image.offsetWidth && image.offsetHeight).every(image => image.complete && image.naturalWidth > 0));
  const broken = await page.evaluate(() => [...document.images].filter(image => image.offsetWidth && image.offsetHeight && (!image.complete || !image.naturalWidth)).map(image => image.src));
  assert.deepEqual(broken, [], `Broken images in ${label}`);
  await page.screenshot({path: path.join(out, label + '.png')});
};
try {
  await page.goto('http://127.0.0.1:5173/');
  const version = page.getByRole('button', {name: /^經典版本 經典版本/});
  await version.waitFor({timeout: 60000});
  const beforeSelection = Date.now();
  assert.ok(requests.some(request => request.url.includes('/assets/') && request.time <= beforeSelection), 'Pokemon images must start loading on the title screen');
  await version.click(); await version.click();
  const normal = page.getByRole('button', {name: '普通 普通', exact: true});
  await normal.waitFor({timeout: 60000});
  assert.ok(failures >= 3, 'Transient image failure must be retried before entry');
  progress.push(...await page.evaluate(() => window.loadingSamples));
  assert.ok(new Set(progress.filter(value => value > 0 && value < 100)).size >= 8, 'Progress should advance across actual file transfers');
  await normal.click(); await normal.click();
  await page.getByRole('button', {name: '跳過', exact: true}).click();
  await page.getByRole('listitem').filter({hasText: '小青'}).waitFor();
  await checkImages('01-選角');
  await page.getByRole('listitem').filter({hasText: '小青'}).click();
  await checkImages('02-商店');
  await page.waitForFunction(async () => {
    const {gameAssets} = await import('/src/loading/gameAssets.ts');
    return gameAssets.progress(['icon-512.png']).ready === false;
  });
  await Promise.race([backgroundStart, page.waitForTimeout(60000).then(() => { throw new Error('Background queue did not reach its remaining images'); })]);
  assert.ok(backgroundRequested, 'Background loading must continue while already in the game');
  releaseBackground();
  await page.waitForFunction(async () => {
    const {gameAssets} = await import('/src/loading/gameAssets.ts');
    return gameAssets.progress(['icon-512.png']).ready;
  });
  await page.evaluate(() => { window.game.gold = 0; });
  await page.getByRole('button', {name: '⚔️', exact: true}).click();
  await page.locator('.opponent-card').first().waitFor();
  await checkImages('03-選敵');
  // Render every reward and tutorial-specific portrait from the real catalog, including later opponents.
  const coverage = await page.evaluate(async () => {
    const [{getEditionAssets}, {ClassicEdition}] = await Promise.all([import('/src/loading/assetCatalog.ts'), import('/src/data/editions/classic/index.ts')]);
    const urls = getEditionAssets(ClassicEdition).map(asset => asset.url);
    const bad = [];
    for (let i = 0; i < urls.length; i += 12) await Promise.all(urls.slice(i, i + 12).map(url => new Promise(resolve => {
      const image = new Image(); image.onload = () => resolve(); image.onerror = () => { bad.push(url); resolve(); }; image.src = url;
    })));
    return {count: urls.length, bad};
  });
  assert.deepEqual(coverage.bad, [], 'All unit, trainer, enemy, reward and tutorial images must render after entry');
  assert.deepEqual(errors, []);
  await writeFile(path.join(out, 'browser-loading.json'), JSON.stringify({errors, failures, backgroundRequested, coverage, progressValues: [...new Set(progress)], requestCount: requests.length}, null, 2));
  console.log(JSON.stringify({errors, failures, backgroundRequested, coverage, progressSteps: new Set(progress).size, requestCount: requests.length}));
} catch (error) {
  console.log(await page.locator('body').innerText());
  console.log(await page.evaluate(async () => {
    const {gameAssets} = await import('/src/loading/gameAssets.ts');
    const entries = [...gameAssets.entries.values()];
    return {states: entries.reduce((all, entry) => ({...all, [entry.state]: (all[entry.state] || 0) + 1}), {}), unfinished: entries.filter(entry => entry.priority < 10 && entry.state !== 'loaded').slice(0, 12)};
  }).catch(() => 'diagnostic unavailable'));
  await page.screenshot({path: path.join(out, 'failure.png')}).catch(() => {});
  throw error;
} finally { releaseBackground(); await browser.close(); }
