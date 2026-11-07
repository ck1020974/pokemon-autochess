import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';

const root=fileURLToPath(new URL('..',import.meta.url));
const output=resolve(root,'output/opponent-preview-20261107');mkdirSync(output,{recursive:true});
const server=await createServer({root,server:{host:'127.0.0.1',port:0,hmr:false}});
const browser=await chromium.launch({channel:'chrome',headless:true});const results=[],errors=[];
try{
 await server.listen();
 const context=await browser.newContext({viewport:{width:1280,height:720}});
 await context.addInitScript(()=>localStorage.setItem('pokemon-analytics-opt-out','1'));
 const page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',error=>errors.push(error.message));
 for(const ash of [true,false]){
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`,{waitUntil:'domcontentloaded',timeout:180000});
  const version=page.getByRole('button',{name:/^帝王版本 帝王版本/});await version.click();await version.click();
  const master=page.getByRole('button',{name:'大師 大師',exact:true});await master.waitFor({timeout:180000});await master.click();await master.click();
  await page.getByRole('button',{name:'跳過',exact:true}).click();
  await page.getByRole('listitem').filter({hasText:'小青'}).click();
  const opponent=await page.evaluate(async ash=>{
   const {Unit}=await import('/src/models/Unit.ts');const {ALL_UNITS}=await import('/src/data/AllUnits.ts');
   const {music}=await import('/src/engine/MusicManager.ts');music.stop();music.play=async()=>{};music.playOneShot=async()=>{};
   const game=window.game;const edition=game.edition;
   const all=[...edition.noviceOpponents,...edition.intermOpponents,...edition.advancedOpponents,...edition.eliteOpponents,...edition.championOpponents];
   const def=all.find(def=>(def.name==='小智')===ash&&def.coreUnits.some(id=>ALL_UNITS[id]?.family==='pichu'));
   if(!def)throw new Error('Missing QA opponent');
   edition.eliteOpponents=[def];game.wins=8;game.turn=12;game.gold=0;
   game.playerTeam=Array.from({length:5},()=>{const unit=new Unit(ALL_UNITS.rattata);unit.stats={attack:1,hp:50,maxHp:50};return unit;});
   return {id:def.id,name:def.name};
  },ash);
  await page.getByRole('button',{name:/^(🔊|🔇)$/}).click();
  await page.getByRole('button',{name:'對戰',exact:true}).click();
  const card=page.locator('.opponent-card').first();await card.waitFor();
  const preview=await card.locator('.opponent-core img').evaluateAll(images=>images.map(img=>({id:img.dataset.unitId,templateId:img.dataset.templateId,name:img.alt,src:img.getAttribute('src')})));
  assert.equal(preview.length,3);assert.ok(preview.some(unit=>!['pichu','charmander','bulbasaur','squirtle'].includes(unit.templateId)));
  await page.screenshot({path:resolve(output,`${ash?'ash':'other'}-choices.png`)});
  await card.click();
  const focused=await card.locator('.opponent-core img').evaluateAll(images=>images.map(img=>img.dataset.unitId));
  assert.deepEqual(focused,preview.map(unit=>unit.id),'First tap must not reroll the preview');
  await card.click();
  const intro=await page.locator('[aria-label="敵方出戰隊伍"] img').evaluateAll(images=>images.map(img=>({templateId:img.dataset.templateId,name:img.alt})));
  assert.equal(intro.length,5);assert.ok(intro.some(unit=>unit.templateId===(ash?'pikachu':'raichu')));
  assert.deepEqual(intro.slice(0,3).map(unit=>unit.templateId),preview.map(unit=>unit.templateId));
  await page.screenshot({path:resolve(output,`${ash?'ash':'other'}-intro.png`)});
  await page.getByRole('button',{name:'略過戰鬥演出'}).click();
  await page.getByRole('button',{name:'暫停戰鬥',exact:true}).click();
  const battle=await page.evaluate(()=>window.game.opponentTeam.filter(Boolean).map(unit=>({id:unit.id,templateId:unit.templateId,level:unit.level})));
  assert.deepEqual(battle.slice(0,3).map(unit=>unit.id),preview.map(unit=>unit.id),'Actual battle reuses the exact previewed instances');
  assert.deepEqual(battle.map(unit=>unit.templateId),intro.map(unit=>unit.templateId));
  const rendered=await page.locator('.board-side.enemy > .unit-wrapper .unit-card').evaluateAll(cards=>cards.map(card=>({id:card.id,name:card.querySelector('img').alt})));
  assert.equal(rendered.length,5);assert.ok(rendered.some(unit=>unit.name===(ash?'皮卡丘':'雷丘')));
  assert.deepEqual(rendered.map(unit=>unit.id),battle.map(unit=>unit.id));
  await page.screenshot({path:resolve(output,`${ash?'ash':'other'}-battle.png`)});
  results.push({opponent,preview,intro,battle,rendered});
 }
 assert.deepEqual(errors,[]);
 writeFileSync(resolve(output,'verification.json'),JSON.stringify({results,errors},null,2));
 console.log('PASS: 2 native selection-to-intro-to-battle flows; preview identities and forms match, Ash keeps Pikachu, others evolve.');
}finally{await browser.close();await server.close();}
