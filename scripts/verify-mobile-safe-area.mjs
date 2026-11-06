import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {createServer} from 'vite';

const css=readFileSync(new URL('../src/index.css',import.meta.url),'utf8');
const out=resolve('output/mobile-safe-area-20261106');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const findings=[],failures=[];
try {
 const context=await browser.newContext({isMobile:true,hasTouch:true});
 const page=await context.newPage();const cdp=await context.newCDPSession(page);
 for(const [width,height,top,left,right,bottom] of [
  [844,390,0,47,47,21],[844,390,44,47,47,21],
  [844,360,0,47,47,21],[844,360,44,47,47,21],
  [667,375,0,0,0,0],[932,430,0,59,59,21],[390,844,59,0,0,34],
 ]) {
  await page.setViewportSize({width,height});
  await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top,left,right,bottom}});
  await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><div id="root"><div class="game-container"><header class="header"><div class="header-section">❤️ 生命：6　💰 金幣：10</div><div class="header-section">道館：0/8</div></header><div style="height:170px;flex-shrink:0">隊伍</div><div class="shop-container"><button id="last-control">開始戰鬥</button><div style="height:125px">商店</div></div></div></div>');
  await page.addStyleTag({content:css});
  // Insets can arrive after launch without a window resize or a device rotation.
  const tops=top===44?[44,59,0,44]:[top];
  for(const safeTop of tops) {
   await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:safeTop,left,right,bottom}});
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const actual=await page.locator('.header').evaluate(el=>{
    const r=el.getBoundingClientRect();const root=getComputedStyle(document.getElementById('root'));
    return {display:getComputedStyle(el).display,top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height,paddingTop:parseFloat(root.paddingTop),paddingLeft:parseFloat(root.paddingLeft),paddingRight:parseFloat(root.paddingRight),paddingBottom:parseFloat(root.paddingBottom)};
   });
   findings.push({viewport:{width,height},safeArea:{top:safeTop,left,right,bottom},hud:actual});
   if(actual.height===0||actual.display==='none')failures.push(`${width}x${height}/${safeTop}: top HUD is hidden`);
   if(actual.paddingTop<safeTop+5)failures.push(`${width}x${height}/${safeTop}: top safe area overwritten (${actual.paddingTop}px)`);
   if(actual.height>0&&actual.top<safeTop)failures.push(`${width}x${height}/${safeTop}: HUD overlaps status bar`);
   if(actual.left<left||actual.right>width-right+1)failures.push(`${width}x${height}/${safeTop}: HUD overlaps side cutouts`);
   await page.screenshot({path:resolve(out,`${width}x${height}-top${safeTop}.png`)});
   await page.locator('#last-control').scrollIntoViewIfNeeded();
   const reachable=await page.locator('#last-control').evaluate(el=>{
    const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;
   });
   if(!reachable)failures.push(`${width}x${height}/${safeTop}: lower controls are clipped`);
  }
 }
 writeFileSync(resolve(out,'verification.json'),JSON.stringify({findings,failures},null,2));
 assert.deepEqual(failures,[]);
 console.log(`PASS: ${findings.length} mobile safe-area/short-height layouts, including inset changes without rotation.`);
 const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{host:'127.0.0.1',port:0}});
 try {
  await server.listen();
  await page.setViewportSize({width:844,height:390});
  await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:0,left:47,right:47,bottom:21}});
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);
  const version=page.getByRole('button',{name:/^經典版本 經典版本/});await version.click();await version.click();
  const normal=page.getByRole('button',{name:'普通 普通',exact:true});await normal.click();await normal.click();
  await page.getByRole('button',{name:'跳過',exact:true}).click();
  await page.getByRole('listitem').filter({hasText:'小青'}).click();
  await page.locator('.shop-slot-scroll').waitFor();
  const live=[];
  for(const [width,height,top,left,right,bottom] of [[844,390,44,47,47,21],[844,390,59,47,47,21],[844,360,0,47,47,21],[667,375,0,0,0,0],[932,430,0,59,59,21],[844,390,0,47,47,21]]) {
   await page.setViewportSize({width,height});
   await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top,left,right,bottom}});
   await page.evaluate(()=>{scrollTo(0,0);return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
   const hud=await page.locator('.header').evaluate(el=>{
    const r=el.getBoundingClientRect();
    const children=[...el.querySelectorAll('.header-section > span,.difficulty-badge,button')].map(child=>{
     const b=child.getBoundingClientRect();return {text:child.textContent,left:b.left,right:b.right,top:b.top,bottom:b.bottom};
    });
    return {top:r.top,height:r.height,children};
   });
   assert.ok(hud.height>0&&hud.top>=top,`Top HUD hidden at ${width}x${height}`);
   for(const child of hud.children)assert.ok(child.left>=left&&child.right<=width-right+1,`HUD clipped at ${width}x${height}: ${JSON.stringify(child)}`);
   live.push({width,height,top,left,right,bottom,hud});
   await page.screenshot({path:resolve(out,`live-${width}x${height}-top${top}.png`)});
   await page.locator('.btn-battle').scrollIntoViewIfNeeded();
   await page.locator('.btn-battle').click({trial:true});
  }
  writeFileSync(resolve(out,'live-verification.json'),JSON.stringify(live,null,2));
  console.log(`PASS: ${live.length} actual game HUD layouts, all labels visible and battle control reachable.`);
 } finally {await server.close();}
} finally {await browser.close();}
