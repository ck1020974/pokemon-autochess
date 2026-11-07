import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='../output/選擇卡片-正式驗證-20261104';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.setDefaultTimeout(90000);
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:5182/');
 const version=page.getByRole('button',{name:/^無限版本 無限版本/});await version.click();await version.click();
 const normal=page.getByRole('button',{name:'普通 普通',exact:true});await normal.click();await normal.click();
 await page.getByRole('button',{name:'跳過',exact:true}).click();await page.getByRole('listitem').filter({hasText:'小青'}).click();
 const cards=page.locator('.pool-choice-card');await cards.first().waitFor();
 const first=await cards.first().innerText();await cards.first().click();await page.waitForTimeout(850);
 assert.equal(await cards.first().innerText(),first,'First tap must not consume the pool choice');
 assert.equal(await cards.first().getAttribute('aria-pressed'),'true');
 await cards.nth(1).click();assert.equal(await cards.nth(1).getAttribute('aria-pressed'),'true');assert.equal(await cards.first().getAttribute('aria-pressed'),'false');
 const icon=cards.nth(1).locator('.synergy-icon').first();await icon.click();assert.equal(await cards.nth(1).getAttribute('aria-pressed'),'true');assert.ok(await icon.locator('.synergy-tooltip').isVisible());
 await page.mouse.move(0,0);await page.locator('.selection-title').click();
 const capture=async(name,selector)=>{
  for(const [label,viewport]of[['桌面',{width:1280,height:720}],['手機橫向',{width:844,height:390}],['手機直向',{width:390,height:844}]]){
   await page.setViewportSize(viewport);await page.mouse.move(0,0);await page.waitForTimeout(350);
   const data=await page.locator('.selection-dialog').evaluate(n=>{const title=n.querySelector('.selection-title').getBoundingClientRect();return{title:{y:title.y,height:title.height,font:getComputedStyle(n.querySelector('.selection-title')).fontSize},cards:[...n.querySelectorAll('.selection-card')].map(c=>{const r=c.getBoundingClientRect();return{width:r.width,height:r.height,x:r.x,y:r.y,overflow:c.scrollHeight>c.clientHeight+1,bg:getComputedStyle(c).backgroundColor};}),horizontalOverflow:n.scrollWidth>innerWidth,overflowNodes:[...n.querySelectorAll("*")].filter(x=>x.getBoundingClientRect().right>innerWidth+1).map(x=>({cls:x.className,right:x.getBoundingClientRect().right,visibility:getComputedStyle(x).visibility})).slice(0,8)};});
   assert.equal(data.horizontalOverflow,false,JSON.stringify({name,label,...data}));assert.ok(data.cards.every(c=>!c.overflow),name+' text overflow '+label);
   if(label!=='手機直向')assert.ok(data.cards.every(c=>c.x>=0&&c.x+c.width<=viewport.width+1&&c.y>=0&&c.y+c.height<=viewport.height+1),name+' clipped '+label);
   report.push({name,label,...data});await page.screenshot({path:`${out}/${name}-${label}.png`});
   if(label==='手機直向'){await page.locator(selector).last().scrollIntoViewIfNeeded();assert.ok(await page.locator(selector).last().evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1;}));}
  }await page.setViewportSize({width:1280,height:720});
 };
 await capture('01-角色池','.pool-choice-card');
 // Keyboard confirms the selected card, and the new batch must start without a selection.
 await cards.nth(1).focus();await page.keyboard.press('Enter');await page.waitForTimeout(850);assert.equal(await page.locator('.pool-choice-card[aria-pressed=true]').count(),0);
 for(let i=0;i<4;i++){await cards.first().click();await cards.first().click();await page.waitForTimeout(850);}
 assert.equal(await cards.count(),0);
 await page.evaluate(async()=>{const {music}=await import('/src/engine/MusicManager.ts');music.stop();music.play=async()=>{};music.playOneShot=async()=>{};const{Unit}=await import('/src/models/Unit.ts');const{ALL_UNITS}=await import('/src/data/AllUnits.ts');window.game.gold=0;window.game.playerTeam=[new Unit(ALL_UNITS.rattata),null,null,null,null];window.game.playerTeam[0].stats={attack:300,hp:300,maxHp:300};});
 await page.getByRole('button',{name:/^(🔊|🔇)$/}).click();await page.getByRole('button',{name:'對戰',exact:true}).click();
 const opponents=page.locator('.opponent-card--choice');await opponents.first().waitFor();
 await opponents.first().click();await page.waitForTimeout(400);assert.equal(await opponents.count(),3);assert.equal(await opponents.first().getAttribute('aria-pressed'),'true');
 await opponents.nth(1).click();assert.equal(await opponents.count(),3);assert.equal(await opponents.nth(1).getAttribute('aria-pressed'),'true');
 assert.equal(await opponents.first().locator('.opponent-core img').count(),3);await capture('02-對手','.opponent-card--choice');
 await opponents.nth(1).focus();await page.keyboard.press('Space');await page.locator('.battle-result-overlay').waitFor();await page.locator('.battle-result-overlay').click();
 const rewards=page.locator('.reward-selection-overlay .selection-card');await rewards.first().waitFor();await capture('03-獎勵','.reward-selection-overlay .selection-card');
 await rewards.first().click();assert.equal(await rewards.count(),0,'Rewards retain single-tap collection');
 for(const label of ['桌面','手機橫向','手機直向']){const group=report.filter(x=>x.label===label);for(const row of group){assert.deepEqual(row.title,group[0].title);assert.equal(row.cards[0].width,group[0].cards[0].width);assert.equal(row.cards[0].height,group[0].cards[0].height);}}
 await writeFile(`${out}/verification.json`,JSON.stringify({pass:true,report},null,2));console.log('PASS: selection/switch/confirm/reset/keyboard/tooltips/rewards + 9 responsive screens');
}finally{await browser.close();}
