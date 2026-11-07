import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const server=await createServer({root,server:{host:'127.0.0.1',port:0,hmr:false}});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 await server.listen();
 const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
 await context.addInitScript(()=>localStorage.setItem('pokemon-analytics-opt-out','1'));
 const page=await context.newPage();page.setDefaultTimeout(60000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const scarce of [false,true]){
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);
  const version=page.getByRole('button',{name:/^帝王版本 帝王版本/});await version.click();await version.click();
  const difficulty=page.getByRole('button',{name:'普通 普通',exact:true});await difficulty.click();await difficulty.click();
  await page.getByRole('button',{name:'跳過',exact:true}).click();
  await page.getByRole('listitem').filter({hasText:'小青'}).click();
  await page.evaluate(async scarce=>{
   const {Unit}=await import('/src/models/Unit.ts');const {ALL_UNITS}=await import('/src/data/AllUnits.ts');
   const {music}=await import('/src/engine/MusicManager.ts');music.stop();music.play=async()=>{};
   const game=window.game;const base=game.edition.noviceOpponents[0];
   const pool=['EASY','NORMAL','HARD','VERY_HARD'].map((difficulty,i)=>({...base,id:`qa-${i}`,name:`QA-${difficulty}`,difficulty}));
   game.edition.noviceOpponents=pool;game.defeatedOpponentIds=scarce?['qa-0','qa-1','qa-3']:['qa-3'];
   game.wins=0;game.turn=1;game.gold=0;game.playerTeam=[new Unit(ALL_UNITS.rattata),null,null,null,null];
  },scarce);
  await page.getByRole('button',{name:/^(🔊|🔇)$/}).click();
  await page.getByRole('button',{name:'對戰',exact:true}).click();
  await page.locator('.opponent-card').first().waitFor();
  const names=await page.locator('.opponent-card .opponent-name').allTextContents();
  const badges=await page.locator('.opponent-card .selection-badge').allTextContents();
  assert.deepEqual(names,scarce?['QA-HARD']:['QA-EASY','QA-NORMAL','QA-HARD']);
  assert.deepEqual(badges,scarce?['HARD']:['EASY','NORMAL','HARD']);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: native mobile opponent choices show three distinct unseen tiers, or only the one remaining trainer.');
}finally{await browser.close();await server.close();}
