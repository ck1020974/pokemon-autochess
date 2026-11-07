import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';

const root=fileURLToPath(new URL('..',import.meta.url));
const output=resolve(root,'output/mobile-unit-sizes-20261107');mkdirSync(output,{recursive:true});
const server=await createServer({root,server:{host:'127.0.0.1',port:0,hmr:false}});
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[],failures=[];
const layouts=[[667,375,0,0,0,0],[844,360,0,47,47,21],[844,390,44,47,47,21],[932,430,0,59,59,21],[1280,720,0,0,0,0]];
const check=(condition,message)=>{if(!condition)failures.push(message);};
try{
 await server.listen();
 const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
 await context.addInitScript(()=>localStorage.setItem('pokemon-analytics-opt-out','1'));
 const page=await context.newPage();page.setDefaultTimeout(60000);const cdp=await context.newCDPSession(page);
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);
 const version=page.getByRole('button',{name:/^帝王版本 帝王版本/});await version.waitFor({timeout:180000});await version.click();await page.locator('button.is-focused').filter({hasText:'帝王版本'}).waitFor();await version.click();
 const difficulty=page.getByRole('button',{name:'大師 大師',exact:true});await difficulty.waitFor({timeout:180000});await difficulty.click();await page.locator('button.is-focused').filter({hasText:'大師'}).waitFor();await difficulty.click();
 await page.getByRole('button',{name:'跳過',exact:true}).click();
 await page.getByRole('listitem').filter({hasText:'小青'}).click();
 await page.evaluate(async()=>{
  const {Unit}=await import('/src/models/Unit.ts');const {ALL_UNITS}=await import('/src/data/AllUnits.ts');
  const game=window.game;
  game.playerTeam=['rattata','charmander','bulbasaur','squirtle','gastly'].map(id=>{const u=new Unit(ALL_UNITS[id]);u.stats={attack:1,hp:5000,maxHp:5000};return u;});
  game.shop.slots=['shinx','aron','togepi','happiny','raikou','luxray','aggron'].map(id=>new Unit(ALL_UNITS[id]));
  const all=[...game.edition.eliteOpponents];game.edition.eliteOpponents=[all.find(def=>def.name==='小智')??all[0]];
  game.wins=8;game.turn=12;game.gold=0;
 });
 await page.getByRole('button',{name:/^(🔊|🔇)$/}).click();
 const inspect=()=>page.evaluate(()=>{
  const box=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
  return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,header:box(document.querySelector('.header')),
   sides:[...document.querySelectorAll('.board-side')].map(side=>({side:side.className,slots:[...side.querySelectorAll(':scope > .unit-wrapper')].map(box),synergy:box(side.querySelector('.board-synergies')),images:[...side.querySelectorAll('.unit-image')].map(box),ids:[...side.querySelectorAll('.unit-wrapper')].map(el=>el.firstElementChild.id)})),
   shop:[...document.querySelectorAll('.shop-slots .unit-card')].map(el=>({card:box(el),image:box(el.querySelector('.unit-image'))})),refresh:document.querySelector('.reroll-icon-btn')?box(document.querySelector('.reroll-icon-btn')):null};
 });
 const capture=async phase=>{
  for(const [width,height,top,left,right,bottom] of layouts){
   await page.setViewportSize({width,height});await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top,left,right,bottom}});
   await page.mouse.move(0,0);await page.evaluate(()=>{scrollTo(0,0);return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
   await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{}))));
   const data=await inspect();results.push({phase,width,height,...data});
   check(data.scrollWidth<=width+1,`${phase}/${width}: page overflow ${data.scrollWidth}`);
   check(data.header.top>=top&&data.header.left>=left&&data.header.right<=width-right+1,`${phase}/${width}: HUD outside safe area`);
   for(const side of data.sides){
    check(side.slots.length===5,`${phase}/${width}: five fixed slots missing`);
    const player=side.side.includes('player'),anchor=side.slots[4];
    check(Math.abs(player?anchor.left-side.synergy.left:anchor.right-side.synergy.right)<=1,`${phase}/${width}: ${side.side} slot 5 anchor`);
    check(side.slots.every((slot,i)=>i===0||(player?slot.left<side.slots[i-1].left:slot.left>side.slots[i-1].left)),`${phase}/${width}: logical order`);
    if(width===932)check(side.images.every(image=>Math.abs(image.width-100)<.1&&Math.abs(image.height-100)<.1), phase+"/932: larger phone must preserve 100px portraits");
    check(side.images.every(image=>image.left>=left&&image.right<=width-right+1), phase+"/"+width+": portrait overlaps side safe area");
    if(width<1000)check(side.images.every(image=>image.width>=64&&image.height>=64),`${phase}/${width}: ${side.side} portraits below 64px: ${side.images.map(i=>i.width)}`);
   }
   if(phase==='battle'){
    check(data.sides.every(side=>side.images.length===5),`${width}: battle must show both full teams`);
    check(Math.max(...data.sides[0].images.map(b=>b.right))<Math.min(...data.sides[1].images.map(b=>b.left)),`${width}: teams intersect`);
   }
   if(phase==='shop'){
    check(data.shop.length===7,`${width}: need seven shop units`);
    for(const {card,image} of data.shop){check(image.left>=card.left-1&&image.right<=card.right+1,`${width}: shop portrait outside own card`);if(width<1000)check(image.width>=64&&image.height>=64,`${width}: shop portrait below 64px: ${image.width}`);}
    await page.locator('.shop-slot-scroll').evaluate(el=>{el.scrollLeft=el.scrollWidth;});
    check(JSON.stringify((await inspect()).refresh)===JSON.stringify(data.refresh),`${width}: scrolling moves refresh`);
    await page.locator('.shop-slot-scroll').evaluate(el=>{el.scrollLeft=0;});
   }
   await page.screenshot({path:resolve(output,`${phase}-${width}x${height}.png`),fullPage:true});
  }
 };
 await capture('shop');
 await page.getByRole('button',{name:'⚔️',exact:true}).click();
 const opponent=page.locator('.opponent-card').first();await opponent.click();await opponent.click();
 await page.getByRole('button',{name:'略過戰鬥演出'}).click();await page.getByRole('button',{name:'暫停戰鬥',exact:true}).click();
 await capture('battle');
 // Empty logical slot 5 keeps its box and anchor, independent of the portrait.
 await page.locator('.board-side > .unit-wrapper:last-child').evaluateAll(els=>els.forEach(el=>el.innerHTML='<div class="slot-placeholder"></div>'));
 for(const [width,height,top,left,right,bottom] of layouts){
  await page.setViewportSize({width,height});await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top,left,right,bottom}});await page.waitForTimeout(100);
  const data=await inspect();results.push({phase:'empty-slot-5',width,height,...data});
  for(const side of data.sides){const player=side.side.includes('player'),slot=side.slots[4];check(Math.abs(player?slot.left-side.synergy.left:slot.right-side.synergy.right)<=1,`${width}: empty slot 5 anchor ${side.side}`);}
 }
 writeFileSync(resolve(output,process.argv.includes('--baseline')?'baseline.json':'verification.json'),JSON.stringify({results,failures},null,2));
 assert.deepEqual(failures,[]);console.log('PASS: 5 actual seven-stock shop + 5 paused 5v5 battle layouts, safe-area insets, readable portraits, fixed refresh, both slot-5 anchors and empty anchors.');
}finally{await browser.close();await server.close();}
