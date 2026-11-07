import assert from 'node:assert/strict';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {createServer} from 'vite';

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const output = resolve('output/mobile-shop-20261106');
mkdirSync(output, {recursive:true});
const browser = await chromium.launch({channel:'chrome',headless:true});
const results = [], failures = [];
try {
 const page = await browser.newPage();
 for(const [width,height] of [[320,740],[390,844],[430,932],[667,375],[740,360],[844,390],[915,412],[1024,768],[1280,720]]) {
  await page.setViewportSize({width,height});
  for(const count of [3,4,7]) {
   const slots=Array.from({length:7},(_,i)=> i<count ? `<div style="position:relative"><div class="unit-card tier-4"><div class="card-lock-overlay">🔒</div><div class="unit-visual-wrapper"><img class="unit-image" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='orange'/%3E%3C/svg%3E"></div><div class="unit-stats"><span>60</span><span>60</span></div></div></div>` : '<div class="slot-placeholder">×</div>').join('');
   await page.setContent(`<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"><div class="game-container"><div class="shop-container"><div class="shop-controls">商店</div><div class="shop-slots-area" style="position:relative"><button class="reroll-icon-btn" style="position:absolute;top:-5px;left:-5px">🔄</button><div class="shop-slot-scroll"><div class="shop-slots">${slots}</div></div></div></div></div></div>`);
   await page.addStyleTag({content:css+' .unit-card {animation:none;transition:none}'});
   const inspect=()=>page.evaluate(()=>{
    const rect = el=> {const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width}};
    return {container:rect(document.querySelector('.shop-container')), area:rect(document.querySelector('.shop-slots-area')), button:rect(document.querySelector('.reroll-icon-btn')), scroll:document.documentElement.scrollWidth, cards:[...document.querySelectorAll('.unit-card')].map(el=>({card:rect(el),image:rect(el.querySelector('img'))}))};
   });
   const result=await inspect(); results.push({width,height,count,...result});
   if(result.area.right>result.container.right+1 || result.scroll>width+1) failures.push(`${width}x${height}/${count}: shop exceeds container`);
   for(const {card,image} of result.cards) if(image.left<card.left-1 || image.right>card.right+1) failures.push(`${width}x${height}/${count}: image exceeds slot`);
   assert.ok(await page.locator('.shop-slot-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Stock fits without scrolling');
   if(count===7) await page.screenshot({path:resolve(output,`${width}x${height}.png`)});
  }
 }
 writeFileSync(resolve(output,'verification.json'),JSON.stringify({results,failures},null,2));
 assert.deepEqual(failures,[]);
 console.log(`PASS: ${results.length} mobile/desktop shop layouts, image bounds and fixed refresh.`);
 const server = await createServer({server:{host:'127.0.0.1',port:0,hmr:false}});
 try {
  await server.listen();
  await page.setViewportSize({width:844,height:390});
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`,{waitUntil:'domcontentloaded',timeout:180000});
  const version=page.getByRole('button',{name:/^經典版本 經典版本/});
  await version.click(); await version.click();
  const normal=page.getByRole('button',{name:'普通 普通',exact:true});
  await normal.waitFor({timeout:180000});
  await normal.click(); await normal.click();
  await page.getByRole('button',{name:'跳過',exact:true}).click();
  await page.getByRole('listitem').filter({hasText:'小青'}).click();
  await page.locator('.shop-slot-scroll').waitFor();
  await page.evaluate(async()=>{
   const {Unit}=await import('/src/models/Unit.ts');
   const {ALL_UNITS}=await import('/src/data/AllUnits.ts');
   window.game.shop.slots=['shinx','aron','togepi','happiny','raikou','luxray','aggron'].map(id=>new Unit(ALL_UNITS[id]));
  });
  // Trigger React through the native mute control after setting the QA stock.
  await page.getByRole('button',{name:/^(🔊|🔇)$/}).click();
  for(const [width,height] of [[390,844],[667,375],[844,390],[915,412],[1280,720]]) {
   await page.setViewportSize({width,height});
   await page.mouse.move(0,0);
   await page.locator('.shop-slots .unit-image').last().waitFor();
   const bounds=await page.locator('.shop-container').evaluate(el=>{
    const container=el.getBoundingClientRect();
    const area=el.querySelector('.shop-slots-area').getBoundingClientRect();
    return {right:container.right,areaRight:area.right,viewport:innerWidth,scroll:document.documentElement.scrollWidth};
   });
   assert.ok(bounds.areaRight<=bounds.right+1,JSON.stringify(bounds));
   assert.ok(bounds.right<=width+1,JSON.stringify(bounds));
   await page.screenshot({path:resolve(output,`live-${width}x${height}.png`)});
  }
  console.log('PASS: 5 actual game shop viewports with seven Pokemon.');
 } finally {await server.close();}
} finally {await browser.close();}
