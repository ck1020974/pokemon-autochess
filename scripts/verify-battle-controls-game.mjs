import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.setDefaultTimeout(60000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:5182/');
    const version = page.getByRole('button', { name: /^經典版本 經典版本/ });
    await version.click(); await version.click();
    const normal = page.getByRole('button', { name: '普通 普通', exact: true });
    await normal.click(); await normal.click();
    await page.getByRole('button', { name: '跳過', exact: true }).click();
    await page.getByRole('listitem').filter({ hasText: '小青' }).click();
    await page.evaluate(async () => {
        const { music } = await import('/src/engine/MusicManager.ts');
        music.stop(); music.play = async () => {}; music.playOneShot = async () => {};
        const { Unit } = await import('/src/models/Unit.ts');
        const { ALL_UNITS } = await import('/src/data/AllUnits.ts');
        window.game.gold = 0;
        window.game.playerTeam = Array.from({ length: 5 }, () => new Unit(ALL_UNITS.rattata));
        for (const unit of window.game.playerTeam) unit.stats = { attack: 1, hp: 50, maxHp: 50 };
    });
    await page.getByRole('button', { name: /^(🔊|🔇)$/ }).click();
    await page.getByRole('button', { name:'對戰', exact: true }).click();
    await page.locator('.opponent-card').first().click();
    await page.locator('.opponent-card').first().click();
    await page.locator('.battle-intro-overlay').waitFor({ state: 'detached' });
    const pause = page.getByRole('button', { name: '暫停戰鬥', exact: true });
    await pause.click();
    const resume = page.getByRole('button', { name: '繼續戰鬥', exact: true });
    assert.equal(await resume.getAttribute('aria-pressed'), 'true');
    assert.equal(await resume.innerText(), '');
    for (const speed of [1, 2, 3]) {
        const button = page.getByRole('button', { name: `目前 ${speed} 倍速，切換為 ${speed === 3 ? 1 : speed + 1} 倍速` });
        assert.equal(await button.innerText(), `${speed}×`);
        await button.click();
    }
    await page.mouse.move(0, 0);
    const bounds = await page.locator('.battle-control-btn').evaluateAll(buttons => buttons.map(button => {
        const rect = button.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
    }));
    assert.deepEqual(bounds, [{ width: 56, height: 44 }, { width: 56, height: 44 }]);
    await page.screenshot({ path: resolve('../output/戰鬥控制按鈕-背景驗證-20261102/實際遊戲畫面.png') });
    await resume.click();
    assert.equal(await pause.getAttribute('aria-pressed'), 'false');
    assert.deepEqual(errors, []);
    await writeFile(resolve('../output/戰鬥控制按鈕-背景驗證-20261102/game-verification.json'), JSON.stringify({ nativeBattle: true, pauseResume: true, speedCycle: [1, 2, 3, 1], equalSize: bounds, pageErrors: errors }, null, 2));
    console.log('Native game battle controls verified.');
} finally {
    await browser.close();
}
