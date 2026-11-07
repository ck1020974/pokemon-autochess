import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { validateBatch } from '../supabase/functions/pa-ingest/validation.ts';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const output = '../output/作者統計頁-20261103';
await mkdir(output, { recursive: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'block' });
page.setDefaultTimeout(90000);
const events = [], errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
    // Enable collection solely inside this intercepted test module. Production still
    // excludes localhost and webdriver; no testing switch ships in the application.
    await page.route('**/src/analytics/collector.ts*', async route => {
        const response = await route.fetch();
        let source = await response.text();
        source = source.replace(/location\.hostname !== ["']ck1020974\.github\.io["']/, 'false').replace('navigator.webdriver', 'false');
        await route.fulfill({ response, body: source });
    });
    await page.route('https://jhyqpizbvbwikvalqxpy.supabase.co/functions/v1/pa-ingest', async route => {
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'apikey,content-type' } });
        const batch = route.request().postDataJSON();
        validateBatch(batch);
        events.push(...batch.events);
        await route.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ accepted: batch.events.map(event => event.eventId) }) });
    });
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
        window.game.playerTeam = [new Unit(ALL_UNITS.rattata), null, null, null, null];
        window.game.playerTeam[0].stats = { attack: 300, hp: 300, maxHp: 300 };
    });
    await page.getByRole('button', { name: /^(🔊|🔇)$/ }).click();
    await page.getByRole('button', { name:'對戰', exact: true }).click();
    await page.locator('.opponent-card').first().click();
    await page.locator('.opponent-card').first().click();
    await page.locator('.battle-result-overlay').waitFor();
    await page.waitForTimeout(500);
    assert.equal(events.filter(event => event.kind === 'visit').length, 1);
    assert.equal(events.filter(event => event.kind === 'battle_start').length, 1);
    assert.equal(events.filter(event => event.kind === 'battle_end').length, 1);
    const start = events.find(event => event.kind === 'battle_start');
    const end = events.find(event => event.kind === 'battle_end');
    assert.equal(start.runId, end.runId); assert.equal(start.battleId, end.battleId);
    assert.equal(start.payload.playerTeam.length, 5); assert.equal(start.payload.playerTeam[4], null);
    assert.equal(end.payload.result, 'WIN');
    await page.reload(); await page.waitForTimeout(500);
    assert.equal(events.filter(event => event.kind === 'visit').length, 1);
    assert.deepEqual(errors, []);
    await writeFile(`${output}/native-tracking-verification.json`, JSON.stringify({ nativeFlow: true, events: events.map(event => ({ kind: event.kind, runId: event.runId, battleId: event.battleId })), refreshVisitDedup: true, serverSchemaValidated: true, zeroRuntimeErrors: true }, null, 2));
    console.log('Native analytics integration passed: visit, immutable start, result, refresh dedup and server validation.');
} catch (error) {
    await page.screenshot({ path: `${output}/integration-failure.png` });
    console.error((await page.locator('body').innerText()).slice(0, 1500));
    throw error;
} finally { await browser.close(); }
