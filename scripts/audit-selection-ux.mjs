import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const output = '../output/選擇流程-現況稽核-20261103';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const findings = [];
try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.setDefaultTimeout(90000);
    await page.goto('http://127.0.0.1:5182/');
    const version = page.getByRole('button', { name: /^無限版本 無限版本/ });
    await version.click(); await version.click();
    const normal = page.getByRole('button', { name: '普通 普通', exact: true });
    await normal.click(); await normal.click();
    await page.getByRole('button', { name: '跳過', exact: true }).click();
    await page.getByRole('listitem').filter({ hasText: '小青' }).click();
    await page.locator('.pool-choice-card').first().waitFor();
    const capture = async (name, selector) => {
        for (const [size, viewport] of [['桌面', { width: 1280, height: 720 }], ['手機橫向', { width: 844, height: 390 }]]) {
            await page.setViewportSize(viewport);
            await page.mouse.move(0, 0);
            await page.waitForTimeout(400);
            await page.screenshot({ path: `${output}/${name}-${size}.png` });
            const cards = await page.locator(selector).evaluateAll(nodes => nodes.map(node => {
                const rect = node.getBoundingClientRect();
                return { text: node.innerText, tag: node.tagName, role: node.getAttribute('role'), tabIndex: node.tabIndex,
                    x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottomClipped: rect.bottom > innerHeight };
            }));
            findings.push({ name, size, cards });
        }
        await page.setViewportSize({ width: 1280, height: 720 });
    };
    await capture('01-角色池', '.pool-choice-card');
    for (let i = 0; i < 5; i++) {
        await page.locator('.pool-choice-card').first().click();
        await page.waitForTimeout(850);
    }
    await page.evaluate(async () => {
        const { music } = await import('/src/engine/MusicManager.ts');
        music.stop(); music.play = async () => {}; music.playOneShot = async () => {};
        const { Unit } = await import('/src/models/Unit.ts');
        const { ALL_UNITS } = await import('/src/data/AllUnits.ts');
        window.game.gold = 0;
        window.game.playerTeam = [new Unit(ALL_UNITS.rattata), null, null, null, null];
        window.game.playerTeam[0].stats = { attack: 300, hp: 300, maxHp: 300 };
    });
    await page.getByRole('button', { name: /^(🔊|🔇)$/ }).click();
    await page.getByRole('button', { name:'對戰', exact: true }).click();
    await page.locator('.opponent-card--choice').first().waitFor();
    await capture('02-對手', '.opponent-card--choice');
    await page.locator('.opponent-card--choice').first().click();
    await page.locator('.battle-result-overlay').waitFor();
    await page.locator('.battle-result-overlay').click();
    await page.locator('.reward-selection-overlay .opponent-card').first().waitFor();
    await capture('03-獎勵', '.reward-selection-overlay .opponent-card');
    await writeFile(`${output}/audit.json`, JSON.stringify(findings, null, 2));
    console.log(JSON.stringify(findings.map(item => ({ name: item.name, size: item.size, cards: item.cards.length,
        clipped: item.cards.filter(card => card.bottomClipped).length, keyboardSelectable: item.cards.filter(card => card.tag === 'BUTTON' || card.tabIndex >= 0).length })), null, 2));
} finally { await browser.close(); }
