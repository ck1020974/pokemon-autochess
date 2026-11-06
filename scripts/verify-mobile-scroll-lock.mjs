import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

const css=readFileSync(new URL('../src/index.css',import.meta.url),'utf8');
const out='output/mobile-scroll-lock-20261107';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const findings=[],failures=[];
try{
 const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});
 const page=await context.newPage();const cdp=await context.newCDPSession(page);
 await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><div id="root"><div class="game-container battle-stage-shell prep-scene--mart"><header class="header" style="position:relative;z-index:25000"><div class="header-section">❤️ 生命：6　💰 金幣：10</div><div class="header-section">道館：0/8</div></header><div style="height:280px;flex:none">五隻角色</div><div class="shop-container" style="min-height:180px;flex:none"><button id="last-control">開始戰鬥</button><div class="shop-slot-scroll" style="width:180px"><div style="width:650px;height:70px">七個商品</div></div></div></div></div>');
 await page.addStyleTag({content:css});
 const inspect=()=>page.evaluate(()=>{const r=document.querySelector('.header').getBoundingClientRect();const game=document.querySelector('.game-container');return {windowY:scrollY,headerTop:r.top,headerBottom:r.bottom,gameTop:game.getBoundingClientRect().top,gameScroll:game.scrollTop,gameHeight:game.clientHeight,gameContent:game.scrollHeight,documentHeight:document.documentElement.scrollHeight,viewport:innerHeight};});
 for(const [width,height,top,left,right,bottom] of [[844,390,44,47,47,21],[844,360,59,47,47,21],[667,375,0,0,0,0],[390,844,59,0,0,34],[844,390,44,47,47,21]]){
  await page.setViewportSize({width,height});await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top,left,right,bottom}});
  await page.evaluate(()=>{window.scrollTo(0,300);document.querySelector('.game-container').scrollTop=300;});
  await page.mouse.move(width/2,height/2);await page.mouse.wheel(0,500);
  await cdp.send('Input.synthesizeScrollGesture',{x:width/2,y:height*.65,yDistance:-150,gestureSourceType:'touch'});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const data=await inspect();findings.push({width,height,top,...data});
  if(data.windowY!==0)failures.push(`Page moved ${data.windowY}px at ${width}x${height}`);
  if(data.headerTop<top)failures.push(`HUD moved behind safe area (${data.headerTop}<${top}) at ${width}x${height}`);
  if(data.documentHeight>height+1)failures.push(`Document overflow ${data.documentHeight}>${height}`);
  await page.locator('#last-control').scrollIntoViewIfNeeded();
  const bottomControl=await page.locator('#last-control').boundingBox();
  if(bottomControl.y<top||bottomControl.y+bottomControl.height>height-bottom)failures.push('Lower control is unreachable');
  await page.locator('.shop-slot-scroll').evaluate(el=>{el.scrollLeft=200;});
  assert.ok(await page.locator('.shop-slot-scroll').evaluate(el=>el.scrollLeft>0),'Stock still scrolls sideways');
  await page.screenshot({path:`${out}/${width}x${height}-${top}.png`});
 }
 // The game must still keep its HUD while battle fills the same bounded frame.
 await page.locator('.game-container').evaluate(el=>{el.classList.add('is-battling');el.scrollTop=300;});
 const battle=await inspect();findings.push({battle:true,...battle});
 if(battle.windowY!==0||battle.headerTop<44)failures.push('Battle scroll hides HUD');
 writeFileSync(`${out}/verification.json`,JSON.stringify({findings,failures},null,2));
 assert.deepEqual(failures,[]);
 console.log('PASS: document stays fixed through scroll/resize/inset changes; HUD stays visible, lower controls and horizontal stock remain usable.');
}finally{await browser.close();}
