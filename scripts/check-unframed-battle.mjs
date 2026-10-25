import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
const out = resolve('../output/介面微調-20261026'); await mkdir(out, {recursive: true});
const browser = await chromium.launch({channel: 'chrome', headless: true});
const context = await browser.newContext({viewport: {width: 1280, height: 720}});
const page = await context.newPage();
page.setDefaultTimeout(90000);
const errors = [], findings = [];
page.on('pageerror', error => errors.push(error.message));
const styles = selector => page.locator(selector).first().evaluate(el => {
  const style = getComputedStyle(el);
  return {background: style.backgroundColor, image: style.backgroundImage, filter: style.backdropFilter,
    border: style.borderBottomWidth, shadow: style.boxShadow, classes: el.className};
});
const enter = async () => {
  await page.goto('http://127.0.0.1:5173/');
  const version = page.getByRole('button', {name: /^經典版本 經典版本/});
  await version.click(); await version.click();
  const normal = page.getByRole('button', {name: '普通 普通', exact: true});
  await normal.click(); await normal.click();
  await page.getByRole('button', {name: '跳過', exact: true}).click();
  await page.getByRole('listitem').filter({hasText: '小青'}).click();
  // Visual coverage isolates the presentation from audio autoplay/interruption races.
  await page.evaluate(async () => {
    const {music} = await import('/src/engine/MusicManager.ts');
    music.stop(); music.play = async () => {}; music.playOneShot = async () => {};
  });
};
try {
  await page.goto('http://127.0.0.1:5173/', {waitUntil: 'domcontentloaded'});
  assert.equal((await styles('.header')).background, 'rgba(0, 0, 0, 0)', 'Information bar must have no translucent panel');
  const preparationDisc = await styles('.board-side.player .floor-marker');
  assert.ok(Number(preparationDisc.background.split(',').at(-1).replace(')', '')) >= .35, 'Preparation discs must be visibly dark');
  await enter();
  const header = await styles('.header');
  assert.equal(header.background, 'rgba(0, 0, 0, 0)', 'Information bar must have no translucent panel');
  assert.equal(header.border, '0px'); assert.equal(header.shadow, 'none');
  findings.push({state: 'preparation-header', ...header});
  await page.screenshot({path: resolve(out, '01-備戰資訊列.png')});
  for (const result of ['WIN', 'LOSS']) {
    if (result === 'LOSS') await enter();
    await page.evaluate(result => {
      const game = window.game; game.gold = 0;
      game.playerTeam = game.shop.slots.filter(Boolean).slice(0, result === 'WIN' ? 4 : 1);
      for (const unit of game.playerTeam) unit.stats = result === 'WIN' ? {attack: 300, hp: 300, maxHp: 300} : {attack: 0, hp: 1, maxHp: 1};
    }, result);
    await page.getByRole('button', {name: /^(🔊|🔇)$/}).click();
    const before = await styles('.game-container');
    await page.getByRole('button', {name: '⚔️', exact: true}).click();
    await page.locator('.opponent-card').first().waitFor();
    const selecting = await styles('.game-container');
    assert.equal(selecting.image, before.image, 'Selecting an opponent must retain the preparation backdrop');
    assert.ok(!selecting.classes.includes('battle-scene--'), 'No battlefield before selecting an opponent');
    findings.push({state: 'opponent-selection', before: before.image, after: selecting.image});
    await page.screenshot({path: resolve(out, `02-${result}-選敵.png`)});
    await page.locator('.opponent-card').first().click();
    const intro = await styles('.battle-intro-scene');
    const scene = intro.classes.match(/battle-scene--[\w-]+/)?.[0]; assert.ok(scene);
    await page.locator('.battle-intro-overlay').waitFor({state: 'detached'});
    const stage = await styles('.game-container'); assert.ok(stage.classes.includes(scene));
    const spacing = await page.locator('.board-teams-horizontal').evaluate(el => {
      const left = el.querySelector('.player').getBoundingClientRect(), right = el.querySelector('.enemy').getBoundingClientRect();
      return right.left - left.right;
    });
    assert.ok(spacing >= 60, 'Teams need a clear separation');
    assert.equal((await styles('.board-side.player .floor-marker')).background, 'rgba(0, 0, 0, 0.22)', 'Battle discs retain their existing color');
    const battleHeader = await styles('.header');
    assert.equal(battleHeader.background, 'rgba(0, 0, 0, 0)'); assert.equal(battleHeader.border, '0px');
    const overlay = page.locator(`.battle-result--${result.toLowerCase()}`);
    await overlay.waitFor({timeout: 60000});
    for (const [width, height] of [[1280, 720], [896, 414]]) {
      await page.setViewportSize({width, height});
      const outcome = await styles(`.battle-result--${result.toLowerCase()}`);
      assert.equal(outcome.background, 'rgba(0, 0, 0, 0)'); assert.equal(outcome.image, 'none'); assert.equal(outcome.filter, 'none');
      assert.ok((await styles('.game-container')).classes.includes(scene), 'The battle result must retain the selected scene');
      findings.push({state: result, width, ...outcome, scene});
      await page.screenshot({path: resolve(out, `03-${result}-${width}.png`)});
    }
    await page.setViewportSize({width: 1280, height: 720});
    await page.evaluate(result => { if (result === 'WIN') window.game.wins = 12; else window.game.lives = 1; }, result);
    await overlay.click();
    await page.locator('.game-result-overlay').waitFor();
    assert.equal(await page.locator('.battle-result--win,.battle-result--loss').count(), 0, 'The final result must replace the round prompt');
    for (const phase of ['VICTORY', 'GAME_OVER']) {
      await page.evaluate(phase => { window.game.phase = phase; }, phase);
      await page.getByRole('button', {name: /^(🔊|🔇)$/}).evaluate(button => button.click());
      await page.locator('.game-result-overlay').waitFor();
      const ending = await styles('.game-result-overlay');
      assert.equal(ending.background, 'rgba(0, 0, 0, 0)'); assert.equal(ending.image, 'none'); assert.equal(ending.filter, 'none');
      assert.ok((await styles('.game-container')).classes.includes(scene), 'Final result must keep the last battlefield');
      findings.push({state: phase, ...ending});
      await page.screenshot({path: resolve(out, `04-${result}-${phase}.png`)});
    }
    await page.evaluate(() => {
      const ids = window.game.edition.noviceOpponents.map(opponent => opponent.id);
      window.game.battleHistory = Array.from({length: 96}, (_, i) => ({opponentId: ids[i % ids.length], result: i % 3 === 0 ? 'LOSS' : 'WIN'}));
    });
    await page.locator('.game-result-overlay').click();
    await page.getByRole('button', {name: '對戰', exact: true}).click();
    for (const [width, height] of [[1280, 720], [896, 414], [667, 375]]) {
      await page.setViewportSize({width, height});
      const table = await page.locator('.summary-history-display--battle').evaluate(el => ({overflow: getComputedStyle(el).overflowY,
        scrollbar: getComputedStyle(el.closest('.summary-tab-content')).scrollbarWidth,
        webkit: getComputedStyle(el.closest('.summary-tab-content'), '::-webkit-scrollbar').display,
        items: el.querySelectorAll('.history-item').length}));
      assert.equal(table.overflow, 'visible'); assert.equal(table.scrollbar, 'none'); assert.equal(table.webkit, 'none');
      assert.equal(table.items, 96, 'History remains complete without nested scrollbars');
      findings.push({state: 'history', width, ...table});
      await page.screenshot({path: resolve(out, `05-${result}-紀錄-${width}.png`)});
    }
    await page.setViewportSize({width: 1280, height: 720});
  }
  assert.deepEqual(errors, []);
  await writeFile(resolve(out, 'verification.json'), JSON.stringify({errors, findings}, null, 2));
  console.log(JSON.stringify({errors, states: findings.map(f => f.state)}));
} finally { await browser.close(); }
