import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';

// Fixtures are injected into a browser-only intercepted module. Production has no demo entry.
const empty = { summary: { visits: 0, players: 0, runs: 0, completedRuns: 0, victories: 0, defeats: 0, abandonedRuns: 0, inProgressRuns: 0, battles: 0, battleWins: 0, battleDraws: 0, battleLosses: 0, winRate: null, completionRate: null, clearRate: null, avgWins: null }, daily: [], modes: [], synergies: [], recentRuns: [], versions: ['2026-11-02-controls-v1'], generatedAt: '2026-11-02T12:00:00Z' };
const unit = { templateId: 'charmander', name: '小火龍', level: 2, attack: 13, hp: 6, maxHp: 16, synergies: ['Fire'] };
const populated = { ...empty, summary: { visits: 1248, players: 826, runs: 640, completedRuns: 480, victories: 120, defeats: 360, abandonedRuns: 92, inProgressRuns: 68, battles: 3840, battleWins: 2880, battleDraws: 120, battleLosses: 840, winRate: 75, completionRate: 75, clearRate: 25, avgWins: 6 }, daily: Array.from({length:7}, (_,i) => ({date:`2026-10-${25+i}`, visits: [120,160,140,210,165,233,220][i], players: 80+i*6, runs: 60+i*8, battles: 400+i*30})), modes: [{edition:'classic',difficulty:'NORMAL',runs:480,completedRuns:360,victories:90,battles:2880,winRate:75},{edition:'modern',difficulty:'MASTER',runs:160,completedRuns:120,victories:30,battles:960,winRate:75}], synergies: ['Fire','Water','Ghost','Grass','Starter','Psychic'].map((id,i)=>({id,battles:120+i*30,wins:60+i*5,winRate:50+i*3})), recentRuns: ['victory','in_progress','defeat','abandoned'].map((status,i)=>({runId:`test-fixture-run-${i}`,edition:'classic',difficulty:'NORMAL',version:'2026-11-02-controls-v1',startedAt:'2026-11-02T12:00:00Z',status,wins:6,draws:1,losses:2,team:[unit,null,{...unit,name:'傑尼龜',templateId:'squirtle'},null,null]})) };
const output = resolve('output/playwright/author-dashboard');
const entry = process.env.AUTHOR_DASHBOARD_ENTRY || 'author-report-c9e84b67a2d1.html';
await mkdir(output, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 5193, strictPort: true }, configFile: false, plugins: [(await import('@vitejs/plugin-react')).default()] });
await server.listen();
const browser = await chromium.launch({channel:'chrome',headless:true});
const errors = [];
const checks = [];
try {
    async function open(scenario, {mobile=false, setup='', testDate}={}) {
        const context = await browser.newContext({viewport: mobile ? {width:390,height:844}:{width:1440,height:1000},timezoneId:'UTC',serviceWorkers:'block'});
        const page = await context.newPage();
        page.on('pageerror', error => { errors.push(`${scenario}: ${error.message}`); console.error(error.message); });
        page.on('console', message => { if(message.type()==='error') console.error(message.text()); });
        if (testDate) await page.clock.install({time:new Date(testDate)});
        await page.route('**/src/analytics/authorApi.ts*', route => route.fulfill({contentType:'application/javascript',body:`
            const scenario=${JSON.stringify(scenario)}; const fixture=${JSON.stringify(scenario==='empty'?empty:populated)};
            window.__authorTest={fetches:[],membership:0,otp:0,updates:[],unsubscribes:0}; let listener; let session=scenario==='signedout'||scenario==='recovery'||scenario==='bad-recovery'?null:{user:{id:'fixture-user'}};
            const notify=()=>listener?.('SIGNED_IN',session);
            export const authorClient={auth:{getSession:async()=>({data:{session},error:null}),onAuthStateChange:(fn)=>{listener=fn;queueMicrotask(()=>fn('INITIAL_SESSION',session));return {data:{subscription:{unsubscribe:()=>window.__authorTest.unsubscribes++}}}},signInWithPassword:async()=>{session={user:{id:'fixture-user'}};notify();return {error:null}},signOut:async()=>{session=null;listener?.('SIGNED_OUT',null);return {error:null}},verifyOtp:async(args)=>{window.__authorTest.otp++;if(scenario==='bad-recovery')return {data:{session:null},error:{message:'expired'}};session={user:{id:'fixture-user'}};notify();return {data:{session},error:null}},updateUser:async(args)=>{window.__authorTest.updates.push(args);return {error:null}}}};
            export const isAuthor=async()=>{window.__authorTest.membership++;return scenario!=='denied'};
            export const fetchDashboard=async(filters)=>{window.__authorTest.fetches.push(filters);if(scenario==='error')throw new Error('測試：讀取資料失敗');if(scenario==='loading')await new Promise(()=>{});return fixture};
        `}));
        await page.goto(`http://127.0.0.1:5193/${entry}${setup}`);
        await page.locator('.ad-header').waitFor();
        return {page,context};
    }
    async function capture(page,name) {
        await page.evaluate(()=>{const tag=document.createElement('div');tag.textContent='UI TEST FIXTURE · 測試資料，非正式統計';tag.style.cssText='position:fixed;bottom:8px;right:8px;background:#343424;color:#f0dc9c;padding:5px 10px;font:11px sans-serif;z-index:9999';document.body.append(tag)});
        await page.screenshot({path:resolve(output,`${name}.png`),fullPage:true});
    }
    {
        const {page,context}=await open('signedout');
        await page.getByRole('heading',{name:'作者登入',exact:true}).waitFor();
        assert.equal(await page.locator('.ad-kpis').count(),0);
        await capture(page,'signedout');
        await page.getByLabel('電子郵件',{exact:true}).fill('fixture@example.test');
        await page.getByLabel('密碼',{exact:true}).fill('fixture-password-123');
        await page.getByRole('button',{name:'登入作者統計'}).click();
        await page.locator('.ad-kpis').waitFor();
        assert.ok((await page.evaluate(()=>window.__authorTest.membership))>0);
        checks.push('signed out → login → membership check → dashboard');await context.close();
    }
    {
        const {page,context}=await open('denied');await page.getByRole('heading',{name:'此帳號沒有作者權限'}).waitFor();
        assert.equal(await page.locator('.ad-kpis').count(),0);assert.equal((await page.evaluate(()=>window.__authorTest.fetches)).length,0);
        await capture(page,'unauthorized');await page.getByRole('button',{name:'登出並重新登入'}).click();await page.getByRole('heading',{name:'作者登入',exact:true}).waitFor();
        checks.push('unauthorized sees no statistics and makes zero report requests; signout works');await context.close();
    }
    {
        const {page,context}=await open('empty',{testDate:'2026-11-02T16:30:00Z'});await page.locator('.ad-kpis').waitFor();
        assert.equal(await page.locator('.ad-kpi > strong').nth(3).textContent(),'—');
        const filters=await page.evaluate(()=>window.__authorTest.fetches.at(-1));assert.equal(filters.to,'2026-11-03');assert.equal(filters.from,'2026-10-28');
        await capture(page,'empty');checks.push('empty samples and null rates; Taipei date boundary under UTC browser');await context.close();
    }
    for (const mobile of [false,true]) {
        const {page,context}=await open('populated',{mobile});await page.locator('.ad-kpis').waitFor();
        assert.equal(await page.locator('.ad-kpi > strong').nth(3).textContent(),'75.0%');
        assert.equal(await page.locator('.ad-team').first().locator('li').count(),5);
        assert.match(await page.locator('.ad-team').first().locator('li').nth(1).textContent(),/槽位 2.*空槽/);
        assert.match(await page.locator('.ad-synergies').textContent(),/熱風/);
        assert.equal(await page.locator('select').nth(1).locator('option[value="MASTER"]').textContent(),'大師');
        await page.getByLabel('模式',{exact:true}).selectOption('modern');await page.getByLabel('難度',{exact:true}).selectOption('MASTER');await page.getByRole('button',{name:'套用 / 重新整理'}).click();
        await page.waitForFunction(()=>window.__authorTest.fetches.at(-1).difficulty==='MASTER');
        const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:window.innerWidth}));assert.ok(dimensions.scroll<=dimensions.width,`horizontal overflow: ${JSON.stringify(dimensions)}`);
        await capture(page,mobile?'populated-mobile':'populated-desktop');checks.push(`${mobile?'mobile':'desktop'} data, percent units, named synergy, retained holes, filters, no overflow`);await context.close();
    }
    {
        const {page,context}=await open('error');await page.getByRole('alert').filter({hasText:'測試：讀取資料失敗'}).waitFor();assert.equal(await page.locator('.ad-kpis').count(),0);checks.push('error is explicit and no stale stats');await context.close();
    }
    {
        const {page,context}=await open('loading');await page.getByRole('status').filter({hasText:'正在讀取統計資料'}).waitFor();assert.equal(await page.locator('.ad-kpis').count(),0);await context.setOffline(true);await page.getByRole('status').filter({hasText:'目前離線'}).waitFor();assert.equal(await page.locator('.ad-kpis').count(),0);checks.push('loading and offline states explicit');await context.close();
    }
    for(const setup of ['#setup=test-only-token&type=recovery','?setup=test-only-token&type=recovery']) {
        const {page,context}=await open('recovery',{setup});await page.getByRole('heading',{name:'設定作者密碼',exact:true}).waitFor();assert.ok(!page.url().includes('setup='));assert.equal(await page.locator('.ad-kpis').count(),0);assert.equal((await page.evaluate(()=>window.__authorTest.fetches)).length,0);assert.equal(await page.evaluate(()=>window.__authorTest.otp),1);
        await page.getByLabel('新密碼（至少 12 個字元）',{exact:true}).fill('fixture-password-123');await page.getByLabel('再次輸入新密碼',{exact:true}).fill('mismatch-password-123');await page.getByRole('button',{name:'儲存密碼並查看統計'}).click();await page.getByRole('alert').filter({hasText:'兩次輸入的密碼不一致'}).waitFor();assert.equal((await page.evaluate(()=>window.__authorTest.updates)).length,0);
        await capture(page,setup.startsWith('#')?'password-setup':'password-query-fallback');await page.getByLabel('再次輸入新密碼',{exact:true}).fill('fixture-password-123');await page.getByRole('button',{name:'儲存密碼並查看統計'}).click();await page.locator('.ad-kpis').waitFor();assert.equal((await page.evaluate(()=>window.__authorTest.updates)).length,1);
        checks.push(`${setup.startsWith('#')?'fragment':'query'} setup stripped, OTP once under StrictMode, no fetch until validated password saved`);await context.close();
    }
    {
        const {page,context}=await open('bad-recovery',{setup:'#setup=test-expired&type=recovery'});await page.getByRole('heading',{name:'暫時無法確認權限'}).waitFor();assert.match(await page.locator('.ad-state').textContent(),/設定連結已失效/);assert.equal((await page.evaluate(()=>window.__authorTest.fetches)).length,0);checks.push('expired recovery link fails closed');await context.close();
    }
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:checks.length,checks,runtimeErrors:errors,screenshots:output},null,2));
} finally {await browser.close();await server.close();}
