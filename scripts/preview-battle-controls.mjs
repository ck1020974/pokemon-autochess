import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const output = resolve('../output/戰鬥控制按鈕示意-等寬版-20261102');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
    const page = await browser.newPage({ viewport: { width: 1120, height: 760 }, deviceScaleFactor: 2 });
    const errors = [];
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
    page.on('console', message => { if (message.type() === 'error') console.error(message.text()); });
    await page.route('**/battle-controls-preview', route => route.fulfill({ contentType: 'text/html', body: `
<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<script type="module">
import RefreshRuntime from '/@react-refresh';
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => type => type;
window.__vite_plugin_react_preamble_installed__ = true;
</script>
<style>
*{box-sizing:border-box}body{margin:0;background:#121416!important;color:#f5f5f4;font-family:"Microsoft JhengHei","Segoe UI",sans-serif!important}
.preview{max-width:1120px;margin:auto;padding:42px 52px 30px}.eyebrow{font-size:11px;letter-spacing:.16em;color:#f6d58b;margin-bottom:12px}.heading{display:flex;justify-content:space-between;align-items:end;margin-bottom:28px}h1{font-size:30px;letter-spacing:.04em;margin:0 0 9px;font-weight:600}.intro{font-size:14px;color:#a9adb3;margin:0}.tag{font-size:12px;color:#bfc1c5;border:1px solid #3a3d41;border-radius:20px;padding:8px 13px;margin-bottom:4px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.state{position:relative;border-radius:16px;border:1px solid #3a3d41;overflow:hidden;background:#1b1e22;height:230px}.label{position:absolute;top:20px;left:22px;z-index:2}.label small{font-size:10px;color:#999fa8;letter-spacing:.12em}.label h2{font-size:17px;font-weight:500;margin:6px 0}.scene{position:absolute;inset:0;background:linear-gradient(180deg,rgba(16,19,24,.91) 0%,rgba(16,19,24,.38) 50%,rgba(16,19,24,.88) 100%),url('/src/assets/battle-scenes/stadium.svg') center 55%/cover}.controls{position:absolute;top:108px;left:0;width:100%;display:flex;justify-content:center}.state p{position:absolute;bottom:20px;left:0;width:100%;margin:0;text-align:center;color:#b5b9c0;font-size:12px}.footer{display:flex;gap:20px;justify-content:space-between;align-items:center;color:#9fa5ae;font-size:12px;margin-top:23px;padding-top:20px;border-top:1px solid #30343a}.footer strong{color:#d8dadd;font-weight:500}.dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#f6d58b;margin-right:8px}
@media(max-width:600px){.preview{padding:24px 20px}.heading{display:block}.tag{display:none}h1{font-size:24px}.intro{line-height:1.6}.grid{grid-template-columns:1fr}.state{height:220px}.footer{display:block;line-height:1.8}}
</style></head><body><main id="root"></main>
<script type="module">
import React from '/node_modules/.vite/deps/react.js';
import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
const {useState} = React;
const {createRoot} = ReactDOM;
import '/src/index.css';
import {BattleControls} from '/src/components/BattleControls.tsx';
const states=[['一般播放',false,1,'白色圖示清楚呈現，可隨時暫停或切換速度。'],['已暫停',true,1,'切換為金色播放圖示，點一下繼續戰鬥。'],['兩倍速度',false,2,'目前倍率以淡金色標示，點一下切換至 3×。'],['三倍速度',false,3,'點一下回到 1×，速度依序循環切換。']];
function Card({item,index}){const[paused,setPaused]=useState(item[1]);const[speed,setSpeed]=useState(item[2]);return React.createElement('section',{className:'state','data-state':index},React.createElement('div',{className:'scene'}),React.createElement('div',{className:'label'},React.createElement('small',null,'0'+(index+1)+' / STATE'),React.createElement('h2',null,item[0])),React.createElement('div',{className:'controls'},React.createElement(BattleControls,{isPaused:paused,speed,onTogglePause:()=>setPaused(v=>!v),onToggleSpeed:()=>setSpeed(v=>v===3?1:v+1)})),React.createElement('p',null,item[3]));}
function App(){return React.createElement('div',{className:'preview'},React.createElement('div',{className:'eyebrow'},'POKÉMON AUTO CHESS / PLAYBACK CONTROLS'),React.createElement('header',{className:'heading'},React.createElement('div',null,React.createElement('h1',null,'戰鬥播放控制'),React.createElement('p',{className:'intro'},'統一單色圖示，讓暫停狀態與目前速度一眼就能辨識。')),React.createElement('span',{className:'tag'},'修改後元件 · 四種狀態')),React.createElement('div',{className:'grid'},...states.map((item,index)=>React.createElement(Card,{key:index,item,index}))),React.createElement('footer',{className:'footer'},React.createElement('span',null,React.createElement('i',{className:'dot'}),'淡金色標示繼續操作與加速狀態'),React.createElement('span',null,React.createElement('strong',null,'44px'),' 點擊高度 · 固定按鈕寬度 · 1× → 2× → 3×')));}
createRoot(document.getElementById('root')).render(React.createElement(App));
</script></body></html>` }));
    await page.goto('http://127.0.0.1:5182/battle-controls-preview', { waitUntil: 'domcontentloaded' });
    await page.locator('.battle-control-btn').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    // index.css is imported by Vite after the preview's head; keep the presentation frame scoped.
    await page.addStyleTag({ content: 'body{background:#121416!important;color:#f5f5f4!important}#root{width:100%;max-width:none;margin:0;padding:0}' });
    await page.screenshot({ path: resolve(output, '戰鬥控制-四種狀態.png'), fullPage: true });
    const first = page.locator('[data-state="0"]');
    const pause = first.locator('.battle-pause-btn');
    const speed = first.locator('.battle-speed-btn');
    const before = await pause.boundingBox();
    await pause.click();
    assert.equal(await pause.getAttribute('aria-pressed'), 'true');
    assert.equal(await pause.innerText(), '');
    assert.equal(await pause.getAttribute('aria-label'), '繼續戰鬥');
    const after = await pause.boundingBox();
    assert.equal(before.width, after.width);
    assert.equal(before.height, 44);
    const speedBounds = await speed.boundingBox();
    assert.equal(before.width, speedBounds.width);
    assert.equal(before.height, speedBounds.height);
    for (const expected of ['2×', '3×', '1×']) {
        await speed.click();
        assert.equal(await speed.innerText(), expected);
    }
    await pause.click();
    assert.equal(await pause.innerText(), '');
    assert.equal(await pause.getAttribute('aria-label'), '暫停戰鬥');
    assert.equal(await speed.locator('svg').count(), 0);
    assert.equal(await pause.locator('svg').count(), 1);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: resolve(output, '戰鬥控制-手機示意.png'), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    await writeFile(resolve(output, 'verification.json'), JSON.stringify({ pauseToggle: true, speedCycle: [1, 2, 3, 1], fixedWidth: true, targetHeight: 44, mobileNoOverflow: true, pageErrors: errors }, null, 2));
    console.log(output);
} finally {
    await browser.close();
}
