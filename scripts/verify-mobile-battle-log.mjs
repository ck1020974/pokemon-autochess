import assert from 'node:assert/strict';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium, devices} from 'playwright';

// Exercise the production stylesheet with the same rolling three-message DOM as App.
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const out = resolve('../output/playwright/mobile-battle-log-20261103');
mkdirSync(out, {recursive: true});
const browser = await chromium.launch({channel: 'chrome', headless: true});
const findings = [];
try {
  for (const device of ['Pixel 7', 'iPhone 13']) {
    const context = await browser.newContext({...devices[device]});
    const page = await context.newPage();
    await page.setContent('<meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"><div class="game-container is-battling"><div class="battle-log" role="log" aria-label="對戰訊息"><div>戰鬥進行中...</div></div></div></div>');
    await page.addStyleTag({content: css});
    for (const [width, height] of [[390,844], [844,390], [915,412], [1024,768], [1280,720], [844,390]]) {
      await page.setViewportSize({width, height});
      const messages = ['戰鬥開始！', '我方小火龍使用噴射火焰，對後方的敵人造成 3 點傷害！', '敵方傑尼龜發動技能，降低受到的傷害！', '我方寶可夢受到攻擊，生命值減少！'.repeat(6)];
      for (let count = 0; count <= messages.length; count++) {
        await page.locator('.battle-log').evaluate((el, messages) => {
          el.replaceChildren(...(messages.length ? messages.slice(-3) : ['戰鬥進行中...']).map((message, i, lines) => {
            const line = document.createElement('div');
            line.className = `battle-log-entry${i === lines.length - 1 ? ' is-latest' : ''}`;
            line.textContent = message;
            return line;
          }));
        }, messages.slice(0, count));
        const lines = await page.locator('.battle-log > div').evaluateAll(els => els.map(el => {
          const style = getComputedStyle(el);
          return {font: parseFloat(style.fontSize), adjust: style.getPropertyValue('text-size-adjust') || style.getPropertyValue('-webkit-text-size-adjust'), width: el.clientWidth, scrollWidth: el.scrollWidth};
        }));
        const expected = width <= 600 || (width > height && height <= 500) ? 12 : 14.4;
        for (const line of lines) {
          assert.ok(Math.abs(line.font - expected) < .1, `${device} ${width}x${height}, message ${count}: font ${line.font}`);
          assert.equal(line.adjust, '100%', `${device}: every message must opt out of heuristic text inflation`);
          assert.ok(line.scrollWidth <= line.width + 1, 'Long messages must wrap within their row');
        }
        findings.push({device, width, height, count, lines});
      }
    }
    await page.screenshot({path: resolve(out, `${device}-landscape.png`)});
    await context.close();
  }
  writeFileSync(resolve(out, 'verification.json'), JSON.stringify(findings, null, 2));
  console.log(`PASS: ${findings.length} mobile/desktop rolling-message cases; all lines retain responsive size and wrap.`);
} finally {
  await browser.close();
}
