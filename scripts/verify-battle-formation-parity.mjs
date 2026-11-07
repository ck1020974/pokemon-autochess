import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {fileURLToPath} from 'node:url';

// The team stays where preparation placed it when the battle starts.
const root=fileURLToPath(new URL('..',import.meta.url));
const server=await createServer({root,server:{host:'127.0.0.1',port:0,hmr:false}});
const browser=await chromium.launch({channel:'chrome',headless:true});
const measure=page=>page.evaluate(()=>{
 const read=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return [r.left,r.top,r.right,r.bottom].map(Math.round);};
 return {header:read('.header'),board:read('.board-container'),player:read('.board-side.player'),enemy:read('.board-side.enemy')};
});
try{
 await server.listen();
 const url=`http://127.0.0.1:${server.httpServer.address().port}/`;
 for(const [width,height,mobile,inset=0] of [[1280,720,false],[1920,1080,false],[844,390,true],[667,375,true],[740,360,true],[844,330,true],[844,390,true,21],[932,430,true,21]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile});
  await context.addInitScript(()=>localStorage.setItem('pokemon-analytics-opt-out','1'));
  const page=await context.newPage();page.setDefaultTimeout(60000);
  await page.goto(url);
  if(inset)await (await context.newCDPSession(page)).send('Emulation.setSafeAreaInsetsOverride',{insets:{top:0,left:47,right:47,bottom:inset}});
  const version=page.getByRole('button',{name:/^無限版本/});await version.click();await version.click();
  const difficulty=page.getByRole('button',{name:'普通 普通',exact:true});await difficulty.click();await difficulty.click();
  await page.getByRole('button',{name:'跳過',exact:true}).click();
  await page.getByRole('listitem').filter({hasText:'小青'}).click();
  await page.waitForTimeout(1000);
  await page.evaluate(()=>{const g=window.game;g.gold=30;g.shop.slots.slice(0,3).forEach((u,i)=>{if(u)g.buyUnit(i)});g.gold=0;});
  await page.getByRole('button',{name:/^(🔊|🔇)$/}).click();
  await page.waitForTimeout(300);
  await page.locator('.game-container').evaluate(e=>e.scrollTop=0);
  const prep=await measure(page);
  await page.getByRole('button',{name:'對戰',exact:true}).click();
  await page.locator('.selection-dialog').waitFor();
  const card=page.locator('.selection-dialog .selection-card').first();await card.click();await page.waitForTimeout(250);
  if(await page.locator('.selection-dialog').count())await card.click({force:true}).catch(()=>{});
  await page.locator('.battle-log').waitFor();
  await page.waitForTimeout(800);
  const battle=await measure(page);
  assert.deepEqual(battle,prep,`${width}x${height}: formation moved between preparation and battle`);
  if(mobile){
   const lines=['小火龍 對後方敵人使用了噴射火焰，造成招式傷害！','鬼斯 在戰鬥結束時永久增加前方友軍的攻擊數值。','傑尼龜 使用招式，提升隊伍的生命與攻擊，繼續迎戰小剛的寶可夢！'];
   await page.locator('.battle-log').evaluate((log,lines)=>log.replaceChildren(...lines.map(text=>Object.assign(document.createElement('div'),{textContent:text}))),lines);
   await page.mouse.move(width/2,height/2);await page.mouse.wheel(0,400);await page.waitForTimeout(100);
   const locked=await page.evaluate(()=>{const g=document.querySelector('.game-container'),header=document.querySelector('.header').getBoundingClientRect(),last=document.querySelector('.battle-log').lastElementChild.getBoundingClientRect();return {overflow:getComputedStyle(g).overflowY,top:g.scrollTop,window:scrollY,headerHeight:header.height,lastBottom:last.bottom,limit:g.getBoundingClientRect().bottom};});
   assert.equal(locked.overflow,'hidden',`${width}x${height}: battle must not scroll`);
   assert.equal(locked.top+locked.window,0,`${width}x${height}: battle moved`);
   assert.ok(locked.headerHeight<=52,`${width}x${height}: status bar wrapped to ${locked.headerHeight}px`);
   assert.ok(locked.lastBottom<=locked.limit+1,`${width}x${height}: newest message clipped`);
  }
  await context.close();
  console.log(`ok ${width}x${height} inset ${inset}`);
 }
 console.log('PASS: 8 viewports keep the HUD, board and both teams in place; phone battles stay locked with one-row HUD and newest message visible.');
}finally{await browser.close();await server.close();}
