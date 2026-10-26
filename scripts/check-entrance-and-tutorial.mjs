import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';

const out=resolve('../output/教學焦點與隊伍間距-20261026'); await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:720}});
const page=await context.newPage(); page.setDefaultTimeout(90000);
const errors=[],findings=[]; page.on('pageerror',error=>errors.push(error.message));
const soundOff=()=>page.evaluate(async()=>{const {music}=await import('/src/engine/MusicManager.ts');music.stop();music.play=async()=>{};music.playOneShot=async()=>{};});
const title=async()=>{
 await page.goto('http://127.0.0.1:5173/');
 const version=page.getByRole('button',{name:/^經典版本 經典版本/}); await version.click(); await version.click();
 const normal=page.getByRole('button',{name:'普通 普通',exact:true}); await normal.click(); await normal.click();
};
const layout=async(width,height)=>{
 await page.setViewportSize({width,height});
 await page.mouse.move(5,height-5);
 await page.locator('.board-teams-horizontal').evaluate(el=>Promise.allSettled(el.getAnimations({subtree:true}).filter(animation=>animation.effect.getTiming().iterations!==Infinity).map(animation=>animation.finished)));
 const sides=await page.locator('.board-side').evaluateAll(elements=>elements.map(el=>{
  const box=el.getBoundingClientRect(),hud=el.querySelector('.board-synergies').getBoundingClientRect();
  const images=[...el.querySelectorAll('.unit-image')].map(image=>image.getBoundingClientRect()).sort((a,b)=>a.left-b.left);
  const first=el.querySelector('.board-synergies .synergy-icon').getBoundingClientRect();
  return {side:el.className,left:hud.left,right:hud.right,teamLeft:box.left,teamRight:box.right,
   backEdge:el.classList.contains('player')?images[0].left:images.at(-1).right,
   iconEdge:el.classList.contains('player')?first.left:first.right,
   minImageGap:Math.min(...images.slice(1).map((image,index)=>image.left-images[index].right))};
 }));
 for(const side of sides){assert.ok(Math.abs(side.backEdge-side.iconEdge)<1,`First synergy must align with the backmost occupied portrait edge: ${JSON.stringify(side)}`);assert.ok(side.left>=-1&&side.right<=width+1);}
 if(width>=1100&&height>=600){
  assert.ok(sides[1].teamLeft-sides[0].teamRight>=144,'Desktop teams must be more widely separated');
  assert.ok(sides.every(side=>side.minImageGap>=4),'Desktop portraits must have breathing room');
 }
 const font=await page.locator('.battle-log').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
 assert.ok(font <= (height<=500?12.1:14.5));
 findings.push({state:'formation',width,height,font,sides});
 await page.screenshot({path:resolve(out,`10-陣容對齊-${width}.png`)});
};
const coach=async(step)=>{
 const prompt=page.locator(`.tutorial-coach[data-step="${step}"]`); await prompt.waitFor();
 for(const [width,height] of [[1280,720],[896,414]]){
  await page.setViewportSize({width,height});
  const geometry=await prompt.evaluate(el=>{
   const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
   const shop=document.querySelector('.shop-slots').getBoundingClientRect();
   return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,background:style.backgroundColor,
    overlapsShop:rect.left<shop.right&&rect.right>shop.left&&rect.top<shop.bottom&&rect.bottom>shop.top};
  });
  assert.ok(geometry.left>=0&&geometry.right<=width&&geometry.top>=0&&geometry.bottom<=height);
  assert.equal(geometry.overlapsShop,false,'Tutorial guidance must not cover the shop');
  assert.equal(geometry.background,'rgba(255, 255, 248, 0.72)');
  const mask=await page.locator('.tutorial-mask').evaluate(el=>getComputedStyle(el).backgroundColor);
  assert.equal(mask,'rgba(17, 44, 52, 0.52)');
  if(step<11){
   const targetSelector=({2:'.shop-slots .tutorial-highlight',3:'.board-side.player .tutorial-highlight',4:'.board-side.player .tutorial-highlight',5:'.reroll-icon-btn.tutorial-highlight',6:'.card-lock-overlay.tutorial-target-glow',7:'.btn-battle.tutorial-target-glow',8:'.shop-slots .tutorial-target-glow',9:'.shop-slots .tutorial-highlight',10:'.btn-battle.tutorial-target-glow'})[step];
   const glow=await page.locator(targetSelector).first().evaluate(el=>({shadow:getComputedStyle(el).boxShadow,animation:getComputedStyle(el).animationName}));
   assert.ok(glow.shadow!=='none','The current tutorial action must visibly glow');
   if(step===6) assert.equal(await page.locator(targetSelector).first().evaluate(el=>getComputedStyle(el).position),'absolute','Glowing lock controls must retain their corner position');
  }
  findings.push({state:'tutorial',step,width,...geometry});
  await page.screenshot({path:resolve(out,`12-教學-${step}-${width}.png`)});
 }
 await page.setViewportSize({width:1280,height:720});
};
const tutorialEntrance=async(label)=>{
 const intro=page.locator('.battle-intro-overlay');await intro.waitFor({timeout:5000});
 const preview=await intro.locator('.battle-intro-opponent .battle-intro-lineup img').evaluateAll(images=>images.map(image=>image.dataset.templateId));
 assert.ok(preview.length>0);
 assert.equal(await intro.locator('.battle-intro-player > img').getAttribute('alt'),'小青');
 await intro.evaluate(el=>Promise.all(el.getAnimations({subtree:true}).map(animation=>animation.finished)));
 for(const [width,height]of [[1280,720],[896,414]]){
  await page.setViewportSize({width,height});
  await page.screenshot({path:resolve(out,`13-教學進場-${label}-${width}.png`)});
 }
 await intro.waitFor({state:'detached'});
 assert.deepEqual(await page.evaluate(()=>window.game.opponentTeam.filter(Boolean).map(unit=>unit.templateId)),preview);
 findings.push({state:'tutorial-entrance',label,preview});
 await page.setViewportSize({width:1280,height:720});
};
try{
 await title(); await page.getByRole('button',{name:'跳過',exact:true}).click();
 await page.getByRole('listitem').filter({hasText:'小青'}).click(); await soundOff();
 await page.evaluate(async()=>{
  const {Unit}=await import('/src/models/Unit.ts'),{ALL_UNITS}=await import('/src/data/AllUnits.ts');
  const game=window.game; game.gold=0;game.wins=8;game.turn=9;
  game.playerTeam=['bulbasaur','charmander','squirtle','gastly'].map(id=>new Unit(ALL_UNITS[id]));
  // A spare slot in the middle verifies that the preview mirrors battle compaction.
  game.playerTeam.splice(1,0,null);
  for(const unit of game.playerTeam.filter(Boolean))unit.stats={attack:1,hp:50,maxHp:50};
  const original=window.setTimeout;
  window.testOriginalTimeout=original;
  window.setTimeout=(callback,delay,...args)=>original(callback,delay===2800?15000:delay,...args);
 });
 await page.getByRole('button',{name:/^(🔊|🔇)$/}).click();
 await page.getByRole('button',{name:'⚔️',exact:true}).click(); await page.locator('.opponent-card').first().click();
 const entrance=page.locator('.battle-intro-overlay');await entrance.waitFor();
 const preview=await page.locator('.battle-intro-opponent .battle-intro-lineup img').evaluateAll(images=>images.map(img=>img.dataset.templateId));
 assert.equal(preview.length,5);
 assert.equal(await page.locator('.battle-intro-player .battle-intro-slot').count(),5);
 assert.equal(await page.locator('.battle-intro-player .battle-intro-lineup img').count(),4);
 await entrance.evaluate(el=>Promise.all(el.getAnimations({subtree:true}).map(animation=>animation.finished)));
 for(const [width,height]of [[1280,720],[896,414],[667,375]]){
  await page.setViewportSize({width,height});
  const blocks=await page.locator('.battle-intro-trainer').evaluateAll(elements=>elements.map(el=>{
   const portrait=el.querySelector(':scope > img').getBoundingClientRect(),lineup=el.querySelector('.battle-intro-lineup').getBoundingClientRect();
   return {side:el.className,left:lineup.left,right:lineup.right,top:lineup.top,bottom:lineup.bottom,portraitBottom:portrait.bottom};
  }));
  assert.ok(blocks.every(box=>box.left>=0&&box.right<=width&&box.top>box.portraitBottom&&box.bottom<height));
  const bad=await entrance.locator('img').evaluateAll(images=>images.filter(image=>!image.complete||!image.naturalWidth).map(image=>image.src));assert.deepEqual(bad,[]);
  findings.push({state:'entrance',width,height,blocks,preview});
  await page.screenshot({path:resolve(out,`11-進場-${width}.png`)});
 }
 await page.getByRole('button',{name:'略過戰鬥演出',exact:true}).click();
 await page.evaluate(()=>{window.setTimeout=window.testOriginalTimeout;delete window.testOriginalTimeout;});
 await page.getByRole('button',{name:'⛔ 暫停',exact:true}).evaluate(button=>button.click());
 assert.deepEqual(await page.evaluate(()=>window.game.opponentTeam.filter(Boolean).map(unit=>unit.templateId)),preview);
 await page.locator('.board-teams-horizontal').evaluate(el=>Promise.allSettled(el.getAnimations({subtree:true}).filter(animation=>animation.effect.getTiming().iterations!==Infinity).map(animation=>animation.finished)));
 for(const [width,height]of [[1920,1080],[1440,900],[1280,720],[896,414],[667,375]])await layout(width,height);

 await page.setViewportSize({width:1280,height:720});
 // Re-open the course from an existing run's opponent selector, preserving the selected trainer.
 await page.evaluate(()=>{window.game.phase='SHOP';window.game.gold=0;});
 await page.getByRole('button',{name:/^(🔊|🔇)$/}).evaluate(button=>button.click());
 await page.getByRole('button',{name:'⚔️',exact:true}).click();
 await page.locator('.opponent-card').first().waitFor();
 await page.getByTitle('遊戲指南 (Tutorial)',{exact:true}).click();
 await page.getByRole('button',{name:'開始',exact:true}).click(); await soundOff(); await coach(2); page.setDefaultTimeout(30000);
 assert.equal(await page.locator('.opponent-select-overlay').count(),0,'Restarted tutorial must dismiss the previous opponent selector');
 assert.equal(await page.locator('.board-side.enemy .synergy-icon').count(),0,'Previous enemy synergy snapshots must be cleared');
 findings.push({state:'tutorial-reentry'});
 for(let i=0;i<3;i++){
  await page.locator('.shop-slots .unit-card').first().click();
  await page.getByRole('button',{name:/購買 \$3/}).click();
 }
 await coach(3);
 await page.locator('.board-side.player .unit-card').filter({has:page.locator('img[alt="鬼斯"]')}).click();
 await page.getByRole('button',{name:'×',exact:true}).click(); await coach(4);
 const ghost=page.locator('.board-side.player .unit-card').filter({has:page.locator('img[alt="鬼斯"]')});
 await ghost.dragTo(page.locator('.board-side.player > .unit-wrapper').nth(4)); await coach(5);
 await page.locator('.reroll-icon-btn').click(); await coach(6);
 await page.locator('.shop-slots .card-lock-overlay').nth(0).click();
 await page.locator('.shop-slots .card-lock-overlay').nth(1).click(); await coach(7);
 await page.evaluate(()=>{for(const unit of window.game.playerTeam.filter(Boolean))unit.stats={attack:50,hp:50,maxHp:50};});
 await page.getByRole('button',{name:'⚔️',exact:true}).click(); await page.locator('.opponent-card').first().click();
 await tutorialEntrance('first');
 await page.locator('.battle-result--win').waitFor({timeout:60000}); await page.locator('.battle-result--win').click();
 await page.locator('.reward-selection-overlay .opponent-card').first().click(); await coach(8);
 for(let i=0;i<2;i++){
  await page.locator('.shop-slots .unit-card').filter({has:page.locator('img[alt="小火龍"]')}).first().click();
  await page.getByRole('button',{name:/購買 \$3/}).click();
 }
 for(let i=0;i<2;i++){
  const ids=await page.evaluate(()=>window.game.playerTeam.filter(unit=>unit?.family==='charmander'&&unit.level===1).map(unit=>unit.id));
  if(ids.length<2)break;
  await page.locator(`[id="${ids[1]}"]`).dragTo(page.locator(`[id="${ids[0]}"]`));
 }
 await coach(9);
 await page.locator('.shop-slots .unit-card').filter({has:page.locator('img[alt="火球鼠"]')}).click();
 await page.getByRole('button',{name:/購買 \$3/}).click(); await coach(10);
 await page.evaluate(()=>{for(const unit of window.game.playerTeam.filter(Boolean))unit.stats={attack:0,hp:1,maxHp:1};});
 await page.getByRole('button',{name:'⚔️',exact:true}).click(); await page.locator('.opponent-card').first().click();
 await tutorialEntrance('second');
 await page.locator('.battle-result--loss').waitFor({timeout:60000}); await page.locator('.battle-result--loss').click();
 await coach(11); await page.locator('.tutorial-coach').getByRole('button',{name:'繼續 →',exact:true}).click();
 await page.locator('.battle-result-overlay').waitFor();
 findings.push({state:'tutorial-complete',text:await page.locator('.result-title').innerText()});
 assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'entrance-tutorial.json'),JSON.stringify({errors,findings},null,2));
 console.log(JSON.stringify({errors,checks:findings.map(({state,step,width})=>({state,step,width}))}));
}catch(error){await page.screenshot({path:resolve(out,'qa-failure.png')});throw error;}
finally{await browser.close();}
