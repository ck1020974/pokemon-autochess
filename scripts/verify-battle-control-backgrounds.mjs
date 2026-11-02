import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium } from 'playwright';

const output = resolve('../output/戰鬥控制按鈕-背景驗證-20261102');
await mkdir(output, { recursive: true });
const server = await createServer({ appType: 'custom', server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true, include: [] } });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
    const { BattleControls } = await server.ssrLoadModule('/src/components/BattleControls.tsx');
    const css = await readFile('src/index.css', 'utf8');
    const scenes = await Promise.all((await readdir('src/assets/battle-scenes')).filter(file => file.endsWith('.svg')).sort().map(async file => ({
        name: file.replace('.svg', ''),
        background: `url(data:image/svg+xml;base64,${(await readFile(`src/assets/battle-scenes/${file}`)).toString('base64')})`,
    })));
    scenes.push({ name: '純白／最亮', background: '#ffffff' }, { name: '純黑／最暗', background: '#000000' });
    const states = [[false, 1], [true, 1], [false, 2], [false, 3]];
    const controls = states.map(([isPaused, speed]) => renderToStaticMarkup(createElement(BattleControls, { isPaused, speed, onTogglePause() {}, onToggleSpeed() {} }))).join('');
    const page = await browser.newPage({ viewport: { width: 1140, height: 900 }, deviceScaleFactor: 1 });
    await page.setContent(`<html lang="zh-Hant"><meta charset="utf-8"><style>${css}
body{margin:0;background:#121416!important;color:#f5f5f4!important;font-family:'Microsoft JhengHei',sans-serif}.audit{padding:28px;width:100%}.audit h1{font-size:24px;margin:0 0 8px}.audit p{font-size:13px;color:#b8bdc5;margin:0 0 20px}.audit-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.audit-card{height:170px;border:1px solid #70757d;border-radius:12px;background-size:cover;background-position:center;overflow:hidden;position:relative}.audit-label{display:inline-block;background:rgba(0,0,0,.85);color:#fff;font-size:12px;padding:5px 9px;margin:8px;border-radius:5px}.audit-controls{display:grid;grid-template-columns:repeat(2,122px);gap:10px;justify-content:center;margin-top:5px}.battle-controls-row{gap:10px}
</style><main class="audit"><h1>戰鬥控制按鈕 · 全背景檢查</h1><p>各背景依序呈現一般、暫停、2×、3×；使用遊戲實際元件與樣式，背景未額外壓暗。</p><div class="audit-grid">${scenes.map(scene => `<section class="audit-card" style="background-image:${scene.background.startsWith('url') ? scene.background : 'none'};background-color:${scene.background.startsWith('#') ? scene.background : '#222'}"><div class="audit-label">${scene.name}</div><div class="audit-controls">${controls}</div></section>`).join('')}</div></main></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: resolve(output, '全部背景檢查.png'), fullPage: true });

    const inspect = async () => page.locator('.battle-control-btn').evaluateAll(buttons => buttons.map(button => {
        const style = getComputedStyle(button);
        const bounds = button.getBoundingClientRect();
        return { color: style.color, background: style.backgroundColor, border: style.borderTopColor, width: bounds.width, height: bounds.height };
    }));
    const rgba = color => color.match(/[\d.]+/g).map(Number);
    const composite = (foreground, background) => foreground.slice(0, 3).map((channel, i) => channel * (foreground[3] ?? 1) + background[i] * (1 - (foreground[3] ?? 1)));
    const luminance = color => color.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
    const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
    const verify = values => values.flatMap(value => {
        assert.equal(value.width, 56);
        assert.equal(value.height, 44);
        return [[0, 0, 0], [255, 255, 255]].map(backdrop => {
            const background = composite(rgba(value.background), backdrop);
            const ink = composite(rgba(value.color), background);
            const border = composite(rgba(value.border), background);
            const textContrast = contrast(ink, background);
            const borderContrast = contrast(border, background);
            assert.ok(textContrast >= 4.5, `Icon/multiplier contrast ${textContrast}`);
            assert.ok(borderContrast >= 3, `Control border contrast ${borderContrast}`);
            return { textContrast, borderContrast };
        });
    });
    const measurements = verify(await inspect());
    for (const selector of ['.battle-pause-btn', '.battle-pause-btn.is-paused', '.battle-speed-btn', '.battle-speed-btn.active']) {
        await page.locator(selector).first().hover();
        measurements.push(...verify(await inspect()));
    }
    await page.keyboard.press('Tab');
    const focused = await page.locator(':focus-visible').evaluate(node => ({ outlineStyle: getComputedStyle(node).outlineStyle, outlineWidth: getComputedStyle(node).outlineWidth }));
    assert.equal(focused.outlineStyle, 'solid');
    assert.equal(focused.outlineWidth, '2px');
    await page.addStyleTag({ content: '.battle-control-btn{backdrop-filter:none!important}' });
    measurements.push(...verify(await inspect()));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addStyleTag({ content: '.audit{padding:16px}.audit-grid{grid-template-columns:1fr}' });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: resolve(output, '手機背景檢查.png'), fullPage: true });
    const evidence = { backgrounds: scenes.length, gameBackgrounds: scenes.length - 2, statesPerBackground: states.length, width: 56, height: 44, minTextContrast: Math.min(...measurements.map(value => value.textContrast)), minBorderContrast: Math.min(...measurements.map(value => value.borderContrast)), hoverChecked: true, keyboardFocusChecked: true, noBackdropFilterChecked: true, mobileOverflow: false };
    await writeFile(resolve(output, 'verification.json'), JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify(evidence, null, 2));
} finally {
    await browser.close();
    await server.close();
}
