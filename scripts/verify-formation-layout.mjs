import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const out=resolve('../output/playwright/formation-layout-20261103');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const findings=[];
try {
 const page=await browser.newPage();
 await page.goto('http://127.0.0.1:5173/');
 await page.addStyleTag({content:'#root {display:none !important} #layout-test {width:100%;max-width:1680px;padding:20px;box-sizing:border-box}'});
 await page.evaluate(async()=>{
  const {createElement:h}=(await import('/node_modules/.vite/deps/react.js')).default;
  const {createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;
  const {useFormationSynergyAnchor}=await import('/src/presentation/useFormationSynergyAnchor.ts');
  const {useRef}=(await import('/node_modules/.vite/deps/react.js')).default;
  const img='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="white"/></svg>';
  function Side({side,empty,revision}) {
   const ref=useRef(null); useFormationSynergyAnchor(ref,String(revision));
   return h('div',{ref,className:`board-side ${side}`},
    h('div',{className:'board-synergies'},h('span',{className:'synergy-icon'},'🔥')),
    ...Array.from({length:5},(_,i)=>h('div',{className:'unit-wrapper',key:i,'data-slot':i},
     empty.includes(i)?h('div',{className:'slot-placeholder'},h('div',{className:'floor-marker'})):
     h('div',{className:`unit-card${side==='enemy'?' flipped':''}`},h('div',{className:'floor-marker'}),h('div',{className:'unit-visual-wrapper'},h('img',{className:'unit-image',src:img})),h('div',{className:'unit-stats'},'3 10')))));
  }
  const el=document.createElement('div');el.id='layout-test';document.body.append(el);const root=createRoot(el);
  window.renderLayout=(battle,empty=[],revision=0)=>root.render(h('div',{className:`game-container battle-stage-shell${battle?' is-battling battle-scene--stadium':''}`},h('div',{className:`board-container${battle?' is-battling':''}`},h('div',{className:'board-teams-horizontal'},h(Side,{side:'player',empty,revision}),h(Side,{side:'enemy',empty,revision})))));
 });
 for(const battle of [false,true])for(const [width,height]of [[1920,1080],[1440,900],[1280,720],[1024,768],[1280,550],[915,412],[844,390]]){
  await page.setViewportSize({width,height});
  for(const empty of [[],[4],[0,2,4]]){
   await page.evaluate(({battle,empty})=>window.renderLayout(battle,empty,empty.length),{battle,empty});
   await page.locator('#layout-test .unit-wrapper').last().waitFor();
   await page.locator('#layout-test .unit-card').evaluateAll(els=>els.forEach(el=>el.style.animation='none'));
   await page.locator('#layout-test .unit-card').evaluateAll(els=>els.forEach(el=>el.classList.remove('clash-anim')));
   await page.mouse.move(0,0);
   await page.waitForTimeout(250);
   const sample=await page.locator('#layout-test .board-side').evaluateAll(sides=>sides.map(side=>{
    const slots=[...side.querySelectorAll(':scope > .unit-wrapper')], rects=slots.map(s=>s.getBoundingClientRect()).sort((a,b)=>a.left-b.left);
    const anchor=slots[4].getBoundingClientRect(),hud=side.querySelector('.board-synergies').getBoundingClientRect();
    const isPlayer=side.classList.contains('player');
    const images=[...side.querySelectorAll('.unit-image')].map(el=>el.getBoundingClientRect()).sort((a,b)=>a.left-b.left);
    return {side:side.className,anchorError:Math.abs(isPlayer?anchor.left-hud.left:anchor.right-hud.right),minGap:Math.min(...images.slice(1).map((r,i)=>r.left-images[i].right)),left:rects[0].left,right:rects.at(-1).right};
   }));
   for(const s of sample){assert.ok(s.anchorError<=1,`Slot 5 anchor: ${JSON.stringify(s)}`);assert.ok(s.left>=-1&&s.right<=width+1,`Slots inside ${width}: ${JSON.stringify(s)}`);if(width>=1000 && !process.argv.includes('--layers-only'))assert.ok(s.minGap>=7,`Desktop portraits need space ${width}x${height}, battle=${battle}: ${JSON.stringify(s)}`);}
   findings.push({battle,width,height,empty,sample});
  }
  // Freeze clash at peak displacement, testing actual paint order where image and disc overlap.
  await page.locator('#layout-test .unit-card').evaluateAll(els=>els.forEach(el=>{el.classList.add('clash-anim');el.style.setProperty('--clash-offset','20px');}));
  await page.locator('#layout-test .unit-image').evaluateAll(els=>els.forEach(el=>{for(const a of el.getAnimations()){a.pause();a.currentTime=75;}}));
  const layers=await page.locator('#layout-test .unit-card').evaluateAll(cards=>cards.map(card=>{
   const img=card.querySelector('.unit-image'),disc=card.querySelector('.floor-marker'),a=img.getBoundingClientRect(),b=disc.getBoundingClientRect();
   const x=(Math.max(a.left,b.left)+Math.min(a.right,b.right))/2,y=(Math.max(a.top,b.top)+Math.min(a.bottom,b.bottom))/2;
   const stack=document.elementsFromPoint(x,y);
   return {side:card.closest('.board-side').className,imageAboveDisc:stack.indexOf(img)>=0&&stack.indexOf(img)<stack.indexOf(disc)};
  }));
  assert.ok(layers.every(l=>l.imageAboveDisc),`Portrait must paint over disc during clash ${width}: ${JSON.stringify(layers)}`);
  await page.screenshot({path:resolve(out,`${battle?'battle':'prep'}-${width}x${height}.png`)});
 }
 writeFileSync(resolve(out,'verification.json'),JSON.stringify(findings,null,2));
 console.log(`PASS: ${findings.length} formation cases, both slot-5 anchors, empty slots, responsive spacing and clash paint order.`);
}finally{await browser.close();}



