import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';

const out='output/seven-fixes-20261107/ui'; mkdirSync(out,{recursive:true});
const server=await createServer({cacheDir:'tmp/seven-fixes-ui-cache',server:{host:'127.0.0.1',port:0,hmr:false}});
await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true});
const findings=[], failures=[], errors=[];
let activePage;
const check=(name,value,detail)=>{findings.push({name,pass:!!value,detail});if(!value)failures.push(name);};
const settle=page=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const capture=async(page,name)=>{await settle(page);await page.screenshot({path:`${out}/${name}.png`});writeFileSync(`${out}/progress.json`,JSON.stringify({stage:name,findings,failures,errors},null,2));};
try {
 const context=await browser.newContext({viewport:{width:1280,height:720}});
 await context.addInitScript(()=>localStorage.setItem('pokemon-analytics-opt-out','1'));
 const page=await context.newPage(); activePage=page; page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));
 const url=`http://127.0.0.1:${server.httpServer.address().port}/`;
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:180000});
 const classic=page.getByRole('button',{name:/^經典版本/});await classic.click();await page.locator('button.is-focused').filter({hasText:'經典版本'}).waitFor();await classic.click();
 const normal=page.getByRole('button',{name:'普通 普通',exact:true});await normal.waitFor({timeout:180000});await normal.click();await page.locator('button.is-focused').filter({hasText:'普通'}).waitFor();await normal.click();
 await page.getByRole('button',{name:'開始',exact:true}).click();
 await page.locator('.tutorial-coach[data-step="2"]').waitFor();
 await page.evaluate(async()=>{const {music}=await import('/src/engine/MusicManager.ts');music.stop();music.play=async()=>{};music.playOneShot=async()=>{};});
 const prep=await page.locator('.header').evaluate(e=>({bg:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color}));
 const finger=await page.locator('.shop-slot-scroll').evaluate(e=>{const target=e.querySelector('.tutorial-highlight');const r=target.getBoundingClientRect(),p=getComputedStyle(target,'::after');return {top:r.top+parseFloat(p.top)-15,clipTop:e.getBoundingClientRect().top};});
 check('Native shop finger fits inside its scroll viewport',finger.top>=finger.clipTop,finger);
 await capture(page,'tutorial-step2-desktop');
 for(const [width,height] of [[844,390],[375,812]]) {await page.setViewportSize({width,height});await capture(page,`tutorial-step2-${width}`);}
 await page.setViewportSize({width:1280,height:720});
 const shop=page.locator('.shop-slots > div'),board=page.locator('.board-side.player > .unit-wrapper');
 const drag=async(from,to)=>{const dt=await page.evaluateHandle(()=>new DataTransfer());await from.dispatchEvent('dragstart',{dataTransfer:dt});await to.dispatchEvent('dragover',{dataTransfer:dt});await to.dispatchEvent('drop',{dataTransfer:dt});await dt.dispose();};
 await shop.nth(0).locator('.unit-card').click();await page.getByRole('button',{name:'購買 $3',exact:true}).click();
 await drag(shop.nth(1).locator('.unit-card'),board.nth(1));await drag(shop.nth(2).locator('.unit-card'),board.nth(2));
 await page.locator('.tutorial-coach[data-step="3"]').waitFor();await board.nth(0).locator('.unit-card').click();await capture(page,'tutorial-step3-detail');await page.locator('.detail-panel > button').first().click();
 await page.locator('.tutorial-coach[data-step="4"]').waitFor();
 const before=await page.evaluate(()=>({gold:window.game.gold,shop:window.game.shop.slots.map(u=>u?.id??null),reroll:document.querySelector('.reroll-icon-btn').getBoundingClientRect().toJSON()}));
 await drag(board.nth(0).locator('.unit-card'),board.nth(1));
 await page.locator('.tutorial-coach[data-step="5"]').waitFor();
 const after=await page.evaluate(()=>({gold:window.game.gold,shop:window.game.shop.slots.map(u=>u?.id??null),reroll:document.querySelector('.reroll-icon-btn').getBoundingClientRect().toJSON(),position:getComputedStyle(document.querySelector('.reroll-icon-btn')).position}));
 check('Ghost move preserves stock and gold',before.gold===after.gold&&JSON.stringify(before.shop)===JSON.stringify(after.shop),{before,after});
 check('Refresh hint preserves absolute position',after.position==='absolute'&&Math.abs(before.reroll.x-after.reroll.x)<1&&Math.abs(before.reroll.y-after.reroll.y)<1,{before,after});
 await capture(page,'tutorial-step5');await page.locator('.reroll-icon-btn').click();
 await page.locator('.tutorial-coach[data-step="6"]').waitFor();
 await shop.nth(0).locator('.card-lock-overlay').click();await shop.nth(1).locator('.card-lock-overlay').click();
 await page.locator('.tutorial-coach[data-step="7"]').waitFor();await page.getByRole('button',{name:'⚔️',exact:true}).click();
 const cards=page.locator('.opponent-card--choice');await cards.first().waitFor();
 const previews=await cards.evaluateAll(cs=>cs.map(c=>({disabled:c.getAttribute('aria-disabled'),templates:[...c.querySelectorAll('.opponent-core img')].map(i=>i.dataset.templateId)})));
 check('Tutorial cards show three different real rosters',new Set(previews.map(c=>c.templates.join(','))).size===3,previews);
 check('Only EASY can be chosen in first tutorial',!previews[0].disabled&&previews[1].disabled==='true'&&previews[2].disabled==='true',previews);
 await cards.nth(1).dispatchEvent('click');await cards.nth(2).dispatchEvent('keydown',{key:'Enter'});
 check('Blocked choices cannot select or start battle',await cards.count()===3&&await page.locator('.opponent-card--choice.is-selected').count()===0);
 await capture(page,'tutorial-brock-choices');
 await cards.first().click();await cards.first().click();
 await page.getByRole('button',{name:'略過戰鬥演出'}).click();await page.getByRole('button',{name:'暫停戰鬥',exact:true}).click();
 const battle=await page.locator('.header').evaluate(e=>({bg:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color,shadow:getComputedStyle(e).textShadow,filter:getComputedStyle(e).filter}));
 check('Preparation and battle HUD use identical opaque surface and ink',prep.bg===battle.bg&&prep.color===battle.color&&!prep.bg.includes('rgba'),{prep,battle});
 check('Battle HUD stays sharp',battle.shadow==='none'&&battle.filter==='none',battle);
 const cdp=await context.newCDPSession(page);
 await page.locator('.battle-log').evaluate(e=>{window.qaOriginalLogNodes=[...e.childNodes];});
 for(const [width,height,insets] of [[844,390,{top:0,left:0,right:0,bottom:0}],[667,375,{top:0,left:0,right:0,bottom:0}],[844,390,{top:0,left:47,right:47,bottom:21}],[844,360,{top:0,left:47,right:47,bottom:21}],[844,390,{top:44,left:47,right:47,bottom:21}],[932,430,{top:0,left:59,right:59,bottom:21}],[375,812,{top:44,left:0,right:0,bottom:34}]]) {
  await page.setViewportSize({width,height});await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets});
  if(height>width) {
   check('Portrait keeps the existing rotate-phone guide',await page.getByText('請旋轉手機',{exact:false}).isVisible());
   await capture(page,'orientation-guide-portrait');
   continue;
  }
  await page.locator('.game-container').evaluate(e=>e.scrollTop=0);
  await page.locator('.battle-log').evaluate(e=>{e.replaceChildren(...['小火龍 對後方敵人使用了噴射火焰，造成招式傷害！','鬼斯 在戰鬥結束時永久增加前方友軍的攻擊數值。','傑尼龜 使用招式，提升隊伍的生命與攻擊，繼續迎戰小剛的寶可夢！'].map(text=>{const entry=document.createElement('div');entry.className='battle-log-entry';entry.textContent=text;return entry;}));});
  await settle(page);
  const data=await page.locator('.battle-log').evaluate(e=>{const r=e.getBoundingClientRect();const last=e.lastElementChild.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,lastBottom:last.bottom,client:e.clientHeight,scroll:e.scrollHeight,viewport:innerHeight};});
  check(`Three full messages visible ${width}x${height} safe${insets.top}/${insets.bottom}`,data.top>=insets.top&&data.left>=insets.left&&data.right<=width-insets.right&&data.lastBottom<=height-insets.bottom&&data.scroll<=data.client+1,data);
  await capture(page,`battle-${width}x${height}-safe${insets.top}-${insets.bottom}`);
 }
 await page.locator('.battle-log').evaluate(e=>{e.replaceChildren(...window.qaOriginalLogNodes);delete window.qaOriginalLogNodes;});
 if(!process.argv.includes('--layout-only')) {
 await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:0,left:0,right:0,bottom:0}});
 await page.setViewportSize({width:844,height:390});
 await page.getByRole('button',{name:'繼續戰鬥',exact:true}).click();
 await page.locator('.battle-result--win').waitFor();
 await capture(page,'first-battle-native-win');
 await page.locator('.battle-result--win').click();
 const reward=page.locator('.reward-selection-overlay .selection-card');await reward.first().waitFor();
 const heart=reward.filter({hasText:'愛心糖飾'});await (await heart.count()?heart:reward.first()).click();
 await page.locator('.tutorial-coach[data-step="8"]').waitFor();await capture(page,'tutorial-step8');
 await drag(shop.nth(0).locator('.unit-card'),board.nth(0));await drag(shop.nth(1).locator('.unit-card'),board.nth(0));
 await page.locator('.tutorial-coach[data-step="9"]').waitFor();await capture(page,'tutorial-step9');
 await shop.nth(2).locator('.unit-card').click();await page.getByRole('button',{name:'購買 $3',exact:true}).click();
 await page.locator('.tutorial-coach[data-step="10"]').waitFor();await capture(page,'tutorial-step10');
 await page.getByRole('button',{name:'⚔️',exact:true}).click();
 const champions=page.locator('.opponent-card--choice');await champions.first().waitFor();
 check('Second tutorial opponents remain selectable',await champions.evaluateAll(cs=>cs.every(c=>c.getAttribute('aria-disabled')!=='true')));
 await champions.first().click();await champions.first().click();await page.getByRole('button',{name:'略過戰鬥演出'}).click();
 await page.locator('.battle-result--loss').waitFor();await page.locator('.battle-result--loss').click();
 await page.locator('.tutorial-coach[data-step="11"]').waitFor();await capture(page,'tutorial-step11');
 await page.getByRole('button',{name:'繼續 →',exact:true}).click();
 await page.locator('.tutorial-completion-overlay').waitFor();
 await page.locator('.tutorial-completion-overlay').evaluate(e=>Promise.all(e.getAnimations({subtree:true}).filter(a=>Number.isFinite(a.effect.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{}))));
 await capture(page,'tutorial-complete-mobile');
 check('Native tutorial completes through evolution, synergy and defeat',await page.locator('.tutorial-completion-overlay').isVisible());
 const completion=await page.locator('.tutorial-completion-overlay').evaluate(e=>({opacity:getComputedStyle(e).opacity,background:getComputedStyle(e).backgroundColor,blur:getComputedStyle(e).backdropFilter}));
 check('Completion uses native dark mask after its transition',completion.opacity==='1'&&completion.background==='rgba(0, 0, 0, 0.82)'&&completion.blur==='blur(10px)',completion);
 await page.setViewportSize({width:1280,height:720});
 // Evaluate real selection animation without changing the game's choices.
 await page.evaluate(()=>{const c=document.createElement('div');c.className='opponent-card pool-card-destroy';c.id='exit-animation-probe';document.body.append(c);});
 const exit=await page.locator('#exit-animation-probe').evaluate(e=>{const a=e.getAnimations()[0];return {duration:a?.effect.getTiming().duration,frames:a?.effect.getKeyframes()};});
 check('Unselected cards exit smoothly without jagged clipping',exit.duration===400&&exit.frames?.every(f=>!f.clipPath||f.clipPath==='none'),exit);
 await page.emulateMedia({reducedMotion:'reduce'});
 const reduced=await page.locator('#exit-animation-probe').evaluate(e=>getComputedStyle(e).animationDuration);
 check('Reduced motion exit is brief',parseFloat(reduced)<=.15,reduced);
 // Infinite opens directly in the shop; later rounds retain manual drafting.
 const poolPage=await context.newPage();await poolPage.bringToFront();activePage=poolPage;poolPage.setDefaultTimeout(60000);poolPage.on('pageerror',e=>errors.push(e.message));
 await poolPage.goto(url,{waitUntil:'domcontentloaded',timeout:180000});
 const infinite=poolPage.getByRole('button',{name:/^無限版本/});await infinite.click();await poolPage.locator('button.is-focused').filter({hasText:'無限版本'}).waitFor();await infinite.click();
 const poolNormal=poolPage.getByRole('button',{name:'普通 普通',exact:true});await poolNormal.waitFor({timeout:180000});await poolNormal.click();await poolPage.locator('button.is-focused').filter({hasText:'普通'}).waitFor();await poolNormal.click();
 await poolPage.getByRole('button',{name:'跳過',exact:true}).click();await poolPage.getByRole('listitem').first().click();
 await poolPage.locator('.shop-container').waitFor();
 const opening=await poolPage.evaluate(()=>({phase:window.game.phase,pool:[...window.game.activePoolUnitIds],choices:window.game.poolChoices.length}));
 check('Infinite first round skips drafting and retains starters plus five draws',opening.phase==='SHOP'&&opening.pool.length===17&&opening.choices===0,opening);
 await poolPage.evaluate(()=>{window.game.turn=2;window.game.startShopPhase();});
 await poolPage.getByRole('button',{name:/^(🔊|🔇)$/}).click();
 const poolCards=poolPage.locator('.pool-choice-card');await poolCards.first().waitFor();
 const starting=await poolPage.evaluate(()=>({phase:window.game.phase,pool:[...window.game.activePoolUnitIds]}));
 await poolCards.first().click();
 await poolPage.locator('.pool-choice-card.is-selected').waitFor();
 check('First pool tap only previews',await poolPage.evaluate(()=>window.game.phase)==='POOL_SELECTION');
 const retreatState=await poolPage.evaluate(async()=>{
  document.querySelector('.pool-choice-card.is-selected').click();
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const cs=[...document.querySelectorAll('.pool-choice-card')];
  const other=cs.find(c=>c.classList.contains('pool-card-destroy'));
  const animation=other?.getAnimations()[0];
  if(animation) {animation.pause();animation.currentTime=150;}
  const data={disabled:cs.filter(c=>c.getAttribute('aria-disabled')==='true').length,
   selected:cs.filter(c=>c.classList.contains('is-selected')&&!c.classList.contains('pool-card-destroy')).length,
   transform:other?getComputedStyle(other).transform:'none'};
  cs[1]?.dispatchEvent(new MouseEvent('click',{bubbles:true}));
  return data;
 });
 check('Selected pool card stays clear while other cards retreat',retreatState.disabled===3&&retreatState.selected===1,retreatState);
 check('Real pool cards actually shrink and move',!['none','matrix(1, 0, 0, 1, 0, 0)'].includes(retreatState.transform),retreatState);
 await capture(poolPage,'pool-retreat');
 await poolPage.waitForFunction(count=>window.game.activePoolUnitIds.length>count,starting.pool.length);
 const committed=await poolPage.evaluate(()=>({phase:window.game.phase,pool:[...window.game.activePoolUnitIds]}));
 check('Pool selection commits exactly once',committed.pool.length===starting.pool.length+1,{starting,committed});
 for(let remaining=0;remaining<5&&await poolPage.evaluate(()=>window.game.phase)==='POOL_SELECTION';remaining++) {
  const count=await poolPage.evaluate(()=>window.game.activePoolUnitIds.length);
  await poolCards.first().click();await poolCards.first().click();
  await poolPage.waitForFunction(before=>window.game.activePoolUnitIds.length>before,count);
 }
 check('Second-round infinite draft returns to preparation',await poolPage.evaluate(()=>window.game.phase)==='SHOP');
 await poolPage.close();
 }
 check('No browser exceptions',errors.length===0,errors);
 writeFileSync(`${out}/verification.json`,JSON.stringify({findings,failures,errors},null,2));
 assert.deepEqual(failures,[]);
 console.log(`PASS: ${findings.length} native tutorial, HUD, mobile-message and animation checks.`);
} catch(error) {
 if(activePage&&!activePage.isClosed()) {
  await activePage.screenshot({path:`${out}/failure.png`}).catch(()=>{});
  writeFileSync(`${out}/failure.json`,JSON.stringify({error:String(error),text:await activePage.locator('body').innerText().catch(()=>''),errors,findings,failures},null,2));
 }
 throw error;
} finally {await browser.close();await server.close();}
