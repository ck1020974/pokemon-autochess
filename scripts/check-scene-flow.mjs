import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';

const base = process.env.SCENE_TEST_URL || 'http://127.0.0.1:5173/';
const out = resolve(process.env.SCENE_TEST_OUT || '../output/場景檢查-v4');
await mkdir(out, {recursive: true});
const browser = await chromium.launch({channel: 'chrome', headless: true});
const findings = [];
const errors = [];
const enter = async (page, edition) => {
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  const version = page.getByRole('button', {name: new RegExp(`^${edition} ${edition}`)});
  await version.click(); await version.click();
  const normal = page.getByRole('button', {name: '普通 普通', exact: true});
  await normal.click(); await normal.click();
  await page.getByRole('button', {name: '跳過', exact: true}).click();
  await page.getByRole('listitem').filter({hasText: '小青'}).click();
};
const background = async (page, selector) => page.locator(selector).evaluate(async el => {
  const image = getComputedStyle(el).backgroundImage;
  const url = image.match(/url\("?([^"\)]+)"?\)/)?.[1];
  if (url) { const resource = new Image(); resource.src = url; await resource.decode(); }
  return {image, classes: el.className, bodyWidth: document.body.scrollWidth, viewWidth: innerWidth};
});

try {
  for (const [kind, wins] of [['regular', 0], ['elite', 8], ['champion', 12]]) {
    const context = await browser.newContext({viewport: {width: 1920, height: 1080}});
    const page = await context.newPage();
    await enter(page, '經典版本');
    await page.evaluate(wins => {
      const game = window.game; game.wins = wins; game.turn = wins + 1; game.gold = 0;
      game.playerTeam = game.shop.slots.filter(Boolean).slice(0, 5);
      for (const unit of game.playerTeam) unit.stats = {attack: 35, hp: 45, maxHp: 45};
    }, wins);
    await page.getByRole('button', {name: /^(🔊|🔇)$/}).click();
    const preparation = await background(page, '.game-container');
    await page.getByRole('button', {name: '⚔️', exact: true}).click();
    await page.locator('.opponent-card').first().waitFor();
    const selection = await background(page, '.game-container');
    assert.equal(selection.image, preparation.image, 'Opponent selection retains its preparation scene until an opponent is selected');
    await page.screenshot({path: resolve(out, `flow-${kind}-selection.png`)});
    await page.locator('.opponent-card').first().click();
    const intro = await background(page, '.battle-intro-scene');
    const scene = intro.classes.match(/battle-scene--[\w-]+/)?.[0];
    assert.ok(scene, 'Intro must receive a selected scene');
    if (kind === 'elite') assert.match(scene, /^battle-scene--stadium(?:-|$)/);
    if (kind === 'champion') assert.match(scene, /^battle-scene--champion-hall(?:-|$)/);
    await page.screenshot({path: resolve(out, `flow-${kind}-intro.png`)});
    await page.locator('.battle-intro-overlay').waitFor({state: 'detached'});
    await page.getByRole('button', {name: '⛔ 暫停', exact: true}).evaluate(button => button.click());
    for (const [width, height] of [[1920, 1080], [896, 414]]) {
      await page.setViewportSize({width, height});
      const battle = await background(page, '.battle-stage-shell.is-battling');
      assert.ok(battle.classes.split(' ').includes(scene), 'Battle must retain exactly the intro scene');
      assert.ok(battle.bodyWidth <= width, 'Battle must fit the viewport');
      findings.push({kind, width, height, scene, background: battle.image, introMatchesBattle: true});
      await page.screenshot({path: resolve(out, `flow-${kind}-battle-${width}.png`)});
    }
    await context.close();
  }
  const context = await browser.newContext({viewport: {width: 1920, height: 1080}});
  const page = await context.newPage();
  await enter(page, '無限版本');
  for (const [width, height] of [[1920, 1080], [896, 414]]) {
    await page.setViewportSize({width, height});
    const lab = await background(page, '.game-container');
    assert.ok(lab.image.includes('prep-lab'), 'Infinite opening must use the research lab');
    assert.ok(lab.bodyWidth <= width, 'Research lab must fit the viewport');
    findings.push({kind: 'research-lab', width, height, ...lab});
    await page.screenshot({path: resolve(out, `flow-lab-${width}.png`)});
  }
  for (const result of ['LOSS', 'DRAW']) {
    await page.evaluate(result => { window.game.generatePoolChoices(1); window.game.lastResult = result; }, result);
    await page.getByRole('button', {name: /^(🔊|🔇)$/}).evaluate(button => button.click());
    await page.waitForTimeout(100);
    const lab = await background(page, '.game-container');
    assert.ok(lab.image.includes('prep-lab'), `Pool selection after ${result} must take priority over the recovery room`);
    findings.push({kind: `research-lab-after-${result}`, ...lab});
  }
  await context.close();
  assert.deepEqual(errors, [], 'No browser runtime errors');
  await writeFile(resolve(out, 'scene-flow.json'), JSON.stringify({base, errors, findings}, null, 2));
  console.log(JSON.stringify({errors, checks: findings.map(({kind, width, scene}) => ({kind, width, scene}))}));
} finally {
  await browser.close();
}
