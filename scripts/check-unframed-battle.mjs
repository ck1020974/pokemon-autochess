import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
const out = resolve('../output/全畫面勝敗與雙方陰影-20261026'); await mkdir(out, {recursive: true});
const browser = await chromium.launch({channel: 'chrome', headless: true});
const context = await browser.newContext({viewport: {width: 1280, height: 720}});
const page = await context.newPage();
page.setDefaultTimeout(90000);
const errors = [], findings = [];
const winOnly = process.argv.includes('--win-only');
page.on('pageerror', error => errors.push(error.message));
const styles = selector => page.locator(selector).first().evaluate(el => {
  const style = getComputedStyle(el);
  return {background: style.backgroundColor, image: style.backgroundImage, filter: style.backdropFilter,
    border: style.borderBottomWidth, shadow: style.boxShadow, classes: el.className,
    position: style.position, radius: style.borderRadius,
    rect: {left: el.getBoundingClientRect().left, top: el.getBoundingClientRect().top,
      right: el.getBoundingClientRect().right, bottom: el.getBoundingClientRect().bottom}};
});
const assertFullscreen = (style, width, height) => {
  assert.equal(style.position, 'fixed', 'Result backdrops must be fixed to the entire viewport');
  assert.equal(style.radius, '0px', 'Full-screen backdrops must have no rounded corners');
  for (const [edge,expected] of Object.entries({left:0, top:0, right:width, bottom:height}))
    assert.ok(Math.abs(style.rect[edge]-expected) < 1, `${edge}: backdrop must meet viewport edge ${expected}, got ${style.rect[edge]}`);
};
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
  for (const result of winOnly ? ['WIN'] : ['WIN', 'LOSS']) {
    if (result === 'LOSS') await enter();
    await page.evaluate(async result => {
      const game = window.game; game.gold = 0;
      const {Unit} = await import('/src/models/Unit.ts');
      const {ALL_UNITS} = await import('/src/data/AllUnits.ts');
      // Houndour always emits a real opening skill message. Basic-only combat may emit none.
      game.playerTeam = result === 'WIN'
        ? Array.from({length: 4}, () => new Unit(ALL_UNITS.houndour))
        : [new Unit(ALL_UNITS.rattata)];
      for (const unit of game.playerTeam) unit.stats = result === 'WIN' ? {attack: 300, hp: 300, maxHp: 300} : {attack: 0, hp: 3, maxHp: 3};
    }, result);
    await page.getByRole('button', {name: /^(🔊|🔇)$/}).click();
    const before = await styles('.game-container');
    await page.getByRole('button', {name: '⚔️', exact: true}).click();
    await page.locator('.opponent-card').first().waitFor();
    const selectionOverlay = await styles('.opponent-select-overlay');
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
    await overlay.evaluate(el => Promise.all(el.getAnimations({subtree:true}).filter(a => a.effect.getTiming().iterations !== Infinity).map(a => a.finished)));
    for (const [width, height] of [[1280, 720], [896, 414]]) {
      await page.setViewportSize({width, height});
      const outcome = await styles(`.battle-result--${result.toLowerCase()}`);
      assertFullscreen(outcome, width, height);
      assert.equal(outcome.background, selectionOverlay.background, 'Round backdrop must match opponent selection');
      assert.equal(outcome.image, 'none');
      assert.equal(outcome.filter, selectionOverlay.filter);
      assert.ok((await styles('.game-container')).classes.includes(scene), 'The battle result must retain the selected scene');
      findings.push({state: result, width, ...outcome, scene});
      await page.screenshot({path: resolve(out, `03-${result}-${width}.png`)});
    }
    // Read real combat messages, including the older entries. All lines remain opaque.
    const log = await page.locator('.battle-log').evaluate(el => ({
      background: getComputedStyle(el).backgroundColor,
      entries: [...el.querySelectorAll('.battle-log-entry')].map(line => ({text: line.textContent,
        opacity: getComputedStyle(line).opacity, color: getComputedStyle(line).color,
        latest: line.classList.contains('is-latest')}))
    }));
    assert.equal(log.background, 'rgba(0, 0, 0, 0)', 'Combat messages must have no panel');
    if (result === 'WIN') assert.ok(log.entries.length > 0);
    assert.ok(log.entries.every(line => line.opacity === '1'));
    assert.equal(log.entries.filter(line => line.latest).length, Math.min(1, log.entries.length));
    if (log.entries.length) assert.ok(log.entries.at(-1).latest, 'Last available message must be emphasized, even when fewer than three');
    findings.push({state: 'battle-log', result, ...log});
    await overlay.evaluate(el => el.style.visibility = 'hidden');
    for (const [width, height] of [[1280, 720], [896, 414]]) {
      await page.setViewportSize({width, height});
      await page.screenshot({path: resolve(out, `06-${result}-訊息-${width}.png`)});
    }
    if (result === 'WIN') {
      const originalClass = await page.locator('.game-container').getAttribute('class');
      for (const [width,height] of [[1280,720], [896,414]]) {
        await page.setViewportSize({width,height});
        for (const [id,expected] of [['champion-hall','rgb(0, 0, 0)'], ['champion-hall-gold','rgb(0, 0, 0)'], ['volcanic','rgb(0, 0, 0)'], ['cavern','rgb(0, 0, 0)']]) {
          await page.locator('.game-container').evaluate((el,id) => {el.className = el.className.replace(/battle-scene--[\w-]+/, `battle-scene--${id}`);}, id);
          const message = await page.locator('.battle-log').evaluate(el => ({color:getComputedStyle(el).color,
            background:getComputedStyle(el).backgroundColor, border:getComputedStyle(el).borderWidth,
            radius:getComputedStyle(el).borderRadius, shadow:getComputedStyle(el).boxShadow,
            lines:[...el.children].map(line => getComputedStyle(line).color)}));
          assert.equal(message.color, expected); assert.equal(message.background,'rgba(0, 0, 0, 0)');
          assert.equal(message.border,'0px'); assert.equal(message.radius,'0px'); assert.equal(message.shadow,'none');
          assert.ok(message.lines.every(color => color === expected));
          findings.push({state:'adaptive-log',id,width,...message});
          await page.screenshot({path:resolve(out, `08-${id}-${width}.png`)});
        }
      }
      await page.locator('.game-container').evaluate((el,classes) => {el.className = classes;}, originalClass);
    }
    await overlay.evaluate(el => el.style.visibility = '');
    await page.setViewportSize({width: 1280, height: 720});
    if (result === 'WIN') {
      await overlay.click();
      const reward = page.locator('.reward-selection-overlay');
      await reward.waitFor();
      const rewardStyle = await styles('.reward-selection-overlay');
      assert.equal(rewardStyle.background, selectionOverlay.background);
      assert.equal(rewardStyle.image, 'none'); assert.equal(rewardStyle.filter, selectionOverlay.filter);
      const descriptionColors = await reward.locator('.reward-description').evaluateAll(lines => lines.map(line => getComputedStyle(line).color));
      assert.ok(descriptionColors.length > 0 && descriptionColors.every(color => color === 'rgb(36, 83, 86)'), 'Reward effects must use dark text on light cards');
      findings.push({state:'reward', ...rewardStyle});
      for (const [width, height] of [[1280,720], [896,414]]) {
        await page.setViewportSize({width,height});
        await page.screenshot({path:resolve(out, `07-獎勵-${width}.png`)});
      }
      await reward.locator('.opponent-card').first().click();
      await page.evaluate(() => { window.game.phase = 'VICTORY'; });
      await page.getByRole('button', {name: /^(🔊|🔇)$/}).evaluate(button => button.click());
    } else {
      await page.evaluate(() => { window.game.lives = 1; });
      await overlay.click();
    }
    await page.locator('.game-result-overlay').waitFor();
    assert.equal(await page.locator('.battle-result--win,.battle-result--loss').count(), 0, 'The final result must replace the round prompt');
    for (const phase of ['VICTORY', 'GAME_OVER']) {
      await page.evaluate(phase => { window.game.phase = phase; }, phase);
      await page.getByRole('button', {name: /^(🔊|🔇)$/}).evaluate(button => button.click());
      await page.locator('.game-result-overlay').waitFor();
      const ending = await styles('.game-result-overlay');
      const viewport = page.viewportSize(); assertFullscreen(ending, viewport.width, viewport.height);
      assert.equal(ending.background, selectionOverlay.background); assert.equal(ending.image, 'none'); assert.equal(ending.filter, selectionOverlay.filter);
      assert.ok((await styles('.game-container')).classes.includes(scene), 'Final result must keep the last battlefield');
      await page.locator('.game-result-overlay').evaluate(el => Promise.all(el.getAnimations({subtree:true}).filter(a => a.effect.getTiming().iterations !== Infinity).map(a => a.finished)));
      findings.push({state: phase, ...ending});
      await page.screenshot({path: resolve(out, `04-${result}-${phase}.png`)});
    }
    await page.evaluate(() => {
      const ids = window.game.edition.noviceOpponents.map(opponent => opponent.id);
      window.game.battleHistory = Array.from({length: 96}, (_, i) => ({opponentId: ids[i % ids.length], result: i % 3 === 0 ? 'LOSS' : 'WIN'}));
    });
    await page.locator('.game-result-overlay').click();
    // Both tabs use the same shadow; switching teams must not override the image filter.
    for (const [width,height] of [[1280,720], [896,414]]) {
      await page.setViewportSize({width,height});
      const filters = () => page.locator('.summary-team-panel.is-visible .summary-unit-img').evaluateAll(images => images.map(img => getComputedStyle(img).filter));
      const playerFilters = await filters();
      assert.ok(playerFilters.length > 0 && playerFilters.every(filter => filter.includes('drop-shadow(')));
      await page.screenshot({path:resolve(out, `09-${result}-我方-${width}.png`)});
      await page.locator('.summary-team-panel.is-visible').getByRole('button', {name:'敵方隊伍',exact:true}).click();
      const enemyFilters = await filters();
      assert.ok(enemyFilters.length > 0 && enemyFilters.every(filter => filter === playerFilters[0]), 'Enemy and player portraits must share the same shadow');
      findings.push({state:'summary-shadows',result,width,playerFilters,enemyFilters});
      await page.screenshot({path:resolve(out, `09-${result}-敵方-${width}.png`)});
      await page.locator('.summary-team-panel.is-visible').getByRole('button', {name:'我方隊伍',exact:true}).click();
    }
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
  await writeFile(resolve(out, winOnly ? 'verification-reward.json' : 'verification.json'), JSON.stringify({errors, findings}, null, 2));
  console.log(JSON.stringify({errors, states: findings.map(f => f.state)}));
} finally { await browser.close(); }
