import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {fileURLToPath} from 'node:url';

// The team stays where preparation placed it when the battle starts.
const root=fileURLToPath(new URL('..',import.meta.url));
const server=await createServer({root,cacheDir:'tmp/seven-fixes-ui-cache',server:{host:'127.0.0.1',port:0,hmr:false}});
const browser=await chromium.launch({channel:'chrome',headless:true});
const measure=page=>page.evaluate(()=>{
 const read=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return [r.left,r.top,r.right,r.bottom].map(Math.round);};
 return {header:read('.header'),board:read('.board-container'),player:read('.board-side.player'),enemy:read('.board-side.enemy')};
});
try{
 await server.listen();
 const url=`http://127.0.0.1:${server.httpServer.address().port}/`;
 for(const [width,height,mobile] of [[1280,720,false],[1920,1080,false],[844,390,true],[667,375,true]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile});
  await context.addInitScript(()=>localStorage.setItem('pokemon-analytics-opt-out','1'));
  const page=await context.newPage();page.setDefaultTimeout(60000);
  await page.goto(url);
  const version=page.getByRole('button',{name:/^無限版本/});await version.waitFor({timeout:180000});await version.click();await page.locator('button.is-focused').filter({hasText:'無限版本'}).waitFor();await version.click();
  const difficulty=page.getByRole('button',{name:'普通 普通',exact:true});await difficulty.waitFor({timeout:180000});await difficulty.click();await page.locator('button.is-focused').filter({hasText:'普通'}).waitFor();await difficulty.click();
  await page.getByRole('button',{name:'跳過',exact:true}).click();
  await page.getByRole('listitem').filter({hasText:'小青'}).click();
  await page.waitForTimeout(1000);
  await page.evaluate(()=>{const g=window.game;g.gold=30;g.shop.slots.slice(0,3).forEach((u,i)=>{if(u)g.buyUnit(i)});g.gold=0;});
  await page.getByRole('button',{name:/^(🔊|🔇)$/}).click();
  await page.waitForTimeout(300);
  await page.locator('.game-container').evaluate(e=>e.scrollTop=0);
  const prep=await measure(page);
  await page.getByRole('button',{name:'⚔️',exact:true}).click();
  await page.locator('.selection-dialog').waitFor();
  const card=page.locator('.selection-dialog .selection-card').first();await card.click();await page.waitForTimeout(250);
  if(await page.locator('.selection-dialog').count())await card.click({force:true}).catch(()=>{});
  await page.locator('.battle-log').waitFor();
  await page.waitForTimeout(800);
  const battle=await measure(page);
  assert.deepEqual(battle,prep,`${width}x${height}: formation moved between preparation and battle`);
  await context.close();
 }
 console.log('PASS: 4 viewports keep the HUD, board and both teams in place when battle starts.');
}finally{await browser.close();await server.close();}
