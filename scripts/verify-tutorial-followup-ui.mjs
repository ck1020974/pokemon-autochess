import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';

const out='output/tutorial-followup-20261107/ui';mkdirSync(out,{recursive:true});
const server=await createServer({cacheDir:'tmp/seven-fixes-ui-cache',server:{host:'127.0.0.1',port:0,hmr:false}});
await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true});
const findings=[],failures=[],errors=[];
const check=(name,pass,detail)=>{findings.push({name,pass,detail});if(!pass)failures.push(name);};
let page;
try {
 const context=await browser.newContext({viewport:{width:1280,height:720}});
 await context.addInitScript(()=>localStorage.setItem('pokemon-analytics-opt-out','1'));
 page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`,{waitUntil:'domcontentloaded',timeout:180000});
 const classic=page.getByRole('button',{name:/^經典版本/});await classic.waitFor({timeout:180000});await classic.click();await page.locator('button.is-focused').filter({hasText:'經典版本'}).waitFor();await classic.click();
 const normal=page.getByRole('button',{name:'普通 普通',exact:true});await normal.waitFor({timeout:180000});await normal.click();await page.locator('button.is-focused').filter({hasText:'普通'}).waitFor();await normal.click();
 await page.getByRole('button',{name:'開始',exact:true}).click();await page.locator('.tutorial-coach[data-step="2"]').waitFor();
 await page.evaluate(async()=>{const {music}=await import('/src/engine/MusicManager.ts');music.stop();music.play=async()=>{};music.playOneShot=async()=>{};});
 const shop=page.locator('.shop-slots > div'),board=page.locator('.board-side.player > .unit-wrapper');
 const drag=async(from,to)=>{const dt=await page.evaluateHandle(()=>new DataTransfer());await from.dispatchEvent('dragstart',{dataTransfer:dt});await to.dispatchEvent('dragover',{dataTransfer:dt});await to.dispatchEvent('drop',{dataTransfer:dt});await dt.dispose();};
 // Legal tutorial purchase into slot 5 puts the native hand directly beside the synergy row.
 await drag(shop.nth(0).locator('.unit-card'),board.nth(4));
 await drag(shop.nth(1).locator('.unit-card'),board.nth(0));await drag(shop.nth(2).locator('.unit-card'),board.nth(1));
 await page.locator('.tutorial-coach[data-step="3"]').waitFor();
 for(const [width,height] of [[1280,720],[844,390],[667,375]]) {
  await page.setViewportSize({width,height});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const data=await board.nth(4).evaluate(target=>{
   const side=target.parentElement,synergy=side.querySelector('.board-synergies'),container=side.closest('.board-container');
   const hand=getComputedStyle(target,'::after'),r=target.getBoundingClientRect(),clip=container.getBoundingClientRect();
   return {slotZ:Number(getComputedStyle(target).zIndex),synergyZ:Number(getComputedStyle(synergy).zIndex),overflow:getComputedStyle(container).overflow,
    nativeContent:hand.content,nativeAnimation:hand.animationName,handTop:r.top+parseFloat(hand.top)-15,clipTop:clip.top,headerBottom:document.querySelector('.header').getBoundingClientRect().bottom,
    slot5:r.toJSON(),synergy:synergy.getBoundingClientRect().toJSON()};
  });
  check(`Native slot5 hand above synergy row ${width}`,data.slotZ>data.synergyZ,data);
  check(`Native hand not clipped by board ${width}`,data.overflow==='visible'||data.handTop>=data.clipTop,data);
  check(`Full hand bounce clears fixed HUD ${width}`,data.handTop>=data.headerBottom+2,data);
  check(`Native hand and bounce preserved ${width}`,data.nativeContent!=='none'&&data.nativeAnimation==='pointer-bounce',data);
  await page.screenshot({path:`${out}/finger-slot5-${width}.png`});
  if(width<1000) {
   await page.locator('.game-container').evaluate(e=>{e.scrollTop=30;});
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const scrolling=await board.nth(4).evaluate(e=>({scroll:document.querySelector('.game-container').scrollTop,top:e.getBoundingClientRect().top+parseFloat(getComputedStyle(e,'::after').top)-15,hud:document.querySelector('.header').getBoundingClientRect().bottom}));
   check(`Hand keeps HUD clearance after scrolling ${width}`,scrolling.top>=scrolling.hud+2,scrolling);
   await page.screenshot({path:`${out}/finger-slot5-${width}-scroll.png`});
   await page.locator('.game-container').evaluate(e=>{e.scrollTop=0;});
  }
 }
 await page.setViewportSize({width:1280,height:720});
 await board.nth(4).locator('.unit-card').click();await page.locator('.detail-panel > button').first().click();
 // Gastly was already placed behind the two starters, so step4 naturally advances to refresh.
 await page.locator('.tutorial-coach[data-step="5"]').waitFor();await page.locator('.reroll-icon-btn').click();
 await page.locator('.tutorial-coach[data-step="6"]').waitFor();await shop.nth(0).locator('.card-lock-overlay').click();await shop.nth(1).locator('.card-lock-overlay').click();
 await page.locator('.tutorial-coach[data-step="7"]').waitFor();await page.getByRole('button',{name:'對戰',exact:true}).click();
 const cards=page.locator('.opponent-card--choice');await cards.first().waitFor();
 const choices=await cards.evaluateAll(cs=>cs.map(c=>({text:c.innerText,disabled:c.getAttribute('aria-disabled'),filter:getComputedStyle(c).filter,glow:getComputedStyle(c,'::before').animationName,shadow:getComputedStyle(c,'::before').boxShadow})));
 check('Unavailable Brock cards have no lock wording',choices.every(c=>!/(暫不開放|僅開放|未開放|鎖定)/.test(c.text)),choices);
 check('Unavailable difficulties are grayscale and disabled',choices.slice(1).every(c=>c.disabled==='true'&&c.filter.includes('grayscale(1)')),choices);
 check('Available EASY has native tutorial glow',choices[0].disabled!=='true'&&choices[0].glow==='tutorialGlowPulse'&&choices[0].shadow!=='none',choices);
 await page.screenshot({path:`${out}/brock-choices-desktop.png`});
 await page.setViewportSize({width:844,height:390});await page.screenshot({path:`${out}/brock-choices-mobile.png`});
 const titleVisible=await page.locator('#opponent-selection-title').evaluate(e=>{const r=e.getBoundingClientRect();return !!document.elementFromPoint(r.left+r.width/2,r.top+2)?.closest('.selection-dialog');});
 check('Mobile difficulty title is above the background HUD',titleVisible);
 await cards.nth(1).dispatchEvent('click');await cards.nth(2).dispatchEvent('keydown',{key:'Enter'});
 check('Gray difficulties remain unselectable',await page.locator('.opponent-card--choice.is-selected').count()===0);
 await cards.first().click();await cards.first().click();
 await page.getByRole('button',{name:'略過戰鬥演出'}).click();await page.getByRole('button',{name:'暫停戰鬥',exact:true}).click();
 const art=await page.evaluate(()=>({expected:window.game.opponentTeam.filter(Boolean).map(u=>({id:u.id,name:u.name,art:u.battleImageUrl||u.imageUrl})),
  actual:[...document.querySelectorAll('.board-side.enemy > .unit-wrapper .unit-card')].map(c=>({id:c.id,name:c.querySelector('img').alt,art:c.querySelector('img').getAttribute('src')})),
  slotCounts:[...document.querySelectorAll('.board-side')].map(side=>side.querySelectorAll(':scope > .unit-wrapper').length)}));
 check('Actual Brock combat uses native battle sprites and correct identities',JSON.stringify(art.actual)===JSON.stringify(art.expected),art);
 check('Both combat formations keep five logical slots',art.slotCounts.every(count=>count===5),art);
 await page.screenshot({path:`${out}/brock-battle-mobile.png`});
 await page.setViewportSize({width:1280,height:720});await page.screenshot({path:`${out}/brock-battle-desktop.png`});
 await page.getByRole('button',{name:'繼續戰鬥',exact:true}).click();await page.locator('.battle-result--win').waitFor();
 check('Native tutorial still wins after artwork correction',true);
 check('No browser errors',errors.length===0,errors);
 writeFileSync(`${out}/verification.json`,JSON.stringify({findings,failures,errors},null,2));
 assert.deepEqual(failures,[]);console.log(`PASS: ${findings.length} native pointer, difficulty and combat-art checks.`);
} catch(error) {
 if(page&&!page.isClosed())await page.screenshot({path:`${out}/failure.png`}).catch(()=>{});
 throw error;
} finally {await browser.close();await server.close();}
