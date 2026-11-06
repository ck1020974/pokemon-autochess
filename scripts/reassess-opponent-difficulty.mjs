import {createServer} from 'vite';
import {mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {buildLegalBenchmarkUnit} from './legal-benchmark-merges.mjs';

// Usage: node scripts/reassess-opponent-difficulty.mjs --pilot
//        node scripts/reassess-opponent-difficulty.mjs --samples=256 (64 per global difficulty)
const root=fileURLToPath(new URL('..',import.meta.url));
const pilot=process.argv.includes('--pilot');
const mergeOnly=process.argv.includes('--merge-only');
const sampleCount=Number(process.argv.find(a=>a.startsWith('--samples='))?.split('=')[1] || (pilot?4:256));
assert.ok(Number.isInteger(sampleCount)&&sampleCount>=4&&sampleCount%4===0);
const out=`${root}/output/difficulty-audit-20261107`;
const outputStem=pilot?'pilot':mergeOnly?'merge-only':'calibration';
mkdirSync(out,{recursive:true});
const server=await createServer({root,appType:'custom',server:{middlewareMode:true,hmr:false}});
const originalRandom=Math.random, originalLog=console.log;
console.log=()=>{};
globalThis.window={};
globalThis.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]};
globalThis.requestAnimationFrame=callback=>{callback(0);return 0;};
function hash(text){let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function seed(text){let a=hash(text);Math.random=()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const pick=pool=>pool[Math.floor(Math.random()*pool.length)];
const stages=[
 {id:'novice',key:'noviceOpponents',contexts:[[1,0],[3,2]],copies:[1,1,2,3]},
 {id:'intermediate',key:'intermOpponents',contexts:[[5,3],[6,4]],copies:[1,2,3,4]},
 {id:'advanced',key:'advancedOpponents',contexts:[[7,5],[9,7]],copies:[3,4,6,9]},
 {id:'elite',key:'eliteOpponents',contexts:[[10,8],[12,10]],copies:[4,6,9,12]},
 {id:'champion',key:'championOpponents',contexts:[[13,12],[15,12]],copies:[6,9,12,15]}
];
const difficulties=['NORMAL','GREAT','ULTRA','MASTER'];
const multipliers={NORMAL:.6,GREAT:.75,ULTRA:1.1,MASTER:1.5};
const labels=['EASY','NORMAL','HARD','VERY_HARD'];
const serialize=team=>team.map(u=>u?{templateId:u.templateId,level:u.level,exp:u.exp,stats:{...u.stats},synergies:[...u.synergies],scalingValue:u.scalingValue}:null);
try{
 const {ALL_UNITS,PREFERRED_POSITIONS}=await server.ssrLoadModule('/src/data/AllUnits.ts');
 const {Unit}=await server.ssrLoadModule('/src/models/Unit.ts');
 const {Shop}=await server.ssrLoadModule('/src/models/Shop.ts');
 const {GameLoop}=await server.ssrLoadModule('/src/engine/GameLoop.ts');
 const {BattleSimulator}=await server.ssrLoadModule('/src/engine/BattleSimulator.ts');
 const {HeadlessBattleSimulator}=await server.ssrLoadModule('/src/engine/HeadlessBattleSimulator.ts');
 const {createEnemyTeam}=await server.ssrLoadModule('/src/engine/createEnemyTeam.ts');
 const {REWARD_DATA}=await server.ssrLoadModule('/src/models/RewardData.ts');
 const rosters=[], ratings=[], parity=[];
 const start=performance.now();let totalBattles=0;
 function player(edition,stage,index){
  seed(`audit-v1/player/${edition.id}/${stage.id}/${index}`);
  const budget=index%4, strategy=Math.floor(index/4)%4, context=stage.contexts[Math.floor(index/64)%2];
  const [turn,wins]=context, tier=new Shop().getTier(turn)+1;
  // Shop stage 1/2/3/4 allows tiers up to 2/3/4/5 via its probability table.
  // Only purchasable base forms in this edition; native merges evolve them.
  const pool=Object.values(ALL_UNITS).filter(t=>edition.availableUnitIds.includes(t.id)&&!t.isHiddenFromShop&&t.id!=='sprout'&&t.tier<=tier);
  assert.ok(pool.length);
  const families=new Set(), count=turn===1?3:5;
  const focus=pick([...new Set(pool.flatMap(t=>t.synergies))]);
  const templates=[];
  for(let slot=0;slot<count;slot++){
   let candidates=pool.filter(t=>!families.has(t.family||t.id));
   if(!candidates.length)candidates=pool;
   if(strategy===1||strategy===2){const focused=candidates.filter(t=>t.synergies.includes(focus));if(focused.length&&(slot<3||strategy===2))candidates=focused;}
   if(strategy===3){const sorted=[...candidates].sort((a,b)=>(b.baseStats.hp+b.baseStats.attack)-(a.baseStats.hp+a.baseStats.attack));candidates=sorted.slice(0,Math.max(3,Math.ceil(sorted.length/2)));}
   const t=pick(candidates);templates.push(t);families.add(t.family||t.id);
  }
  const game=new GameLoop(edition);game.turn=turn;game.wins=wins;
  window.game=game;
  game.refreshSpecialDescriptions();
  game.playerTeam=templates.map(t=>new Unit(t));
  const purchasedTier=new Map(game.playerTeam.map((u,i)=>[u,templates[i].tier]));
  // Three gold per purchase. Even the strongest benchmark cannot spend more
  // than all natural income to date; lower budgets leave room for rolling.
  const purchaseCopyCap=Math.floor(turn*10/3), purchasedCopies=[],mergeHistory=[],unusedCopyBudgets=[];
  let remainingCopies=purchaseCopyCap;
  game.playerTeam.forEach((u,slot)=>{
   const desired=Math.max(1,stage.copies[budget]-(slot===count-1&&budget>1?1:0));
   const copies=Math.max(1,Math.min(desired,Math.floor(remainingCopies/(count-slot))));
   const built=buildLegalBenchmarkUnit({game,target:u,template:templates[slot],maxCopies:copies,Unit});
   remainingCopies-=built.purchasedCopies;purchasedCopies.push(built.purchasedCopies);
   unusedCopyBudgets.push(built.unusedCopyBudget);
   mergeHistory.push(...built.mergeHistory.map(entry=>({slot,...entry})));
  });
  const pos={FRONT:0,FRONT_MID:1,ALL:2,MID:2,MID_BACK:3,BACK:4};
  game.playerTeam.sort((a,b)=>(pos[PREFERRED_POSITIONS[a.family]||'ALL'])-(pos[PREFERRED_POSITIONS[b.family]||'ALL']));
  const rewardHistory=[];
  if(!mergeOnly&&budget>0){
   const rewardDifficulty=['EASY','NORMAL','HARD','EXTREME'][budget];
   for(let battle=0;battle<wins;battle++){
    const firstPossibleShopTurn={1:1,2:1,3:3,4:6,5:10,6:99};
    const eligible=game.playerTeam.filter(u=>firstPossibleShopTurn[purchasedTier.get(u)]<=battle+1);
    const pool=REWARD_DATA.filter(r=>r.category==='PERM_SYNERGY'&&r.difficulty===rewardDifficulty&&eligible.some(u=>u.synergies.includes(r.synergyId)));
    if(!pool.length)continue;
    // A permanent synergy reward is one of the native choice categories. Pick
    // one matching the most remaining team members, with seeded tie handling.
    const scored=pool.map(r=>({reward:r,count:eligible.filter(u=>u.synergies.includes(r.synergyId)).length}));
    const most=Math.max(...scored.map(r=>r.count));
    const reward=pick(scored.filter(r=>r.count===most)).reward;
    game.applyPermanentReward(reward,eligible);
    rewardHistory.push({afterWin:battle+1,difficulty:reward.difficulty,item:reward.item,synergyId:reward.synergyId,effect:reward.effect,eligibleFamilies:eligible.map(u=>u.family)});
   }
  }
  while(game.playerTeam.length<5)game.playerTeam.push(null);
  game.startBattlePhase();
  const purchaseCopies=purchasedCopies.reduce((a,b)=>a+b,0);
  assert.ok(purchaseCopies*3<=turn*10);
  return {team:game.playerTeam,turn,wins,budget,strategy,focus,mewSynergies:[...game.mewSynergies],maxPurchasableTier:tier,purchasedTemplateIds:templates.map(t=>t.id),copiesBudget:stage.copies[budget],purchasedCopies,purchaseCopies,purchaseGold:purchaseCopies*3,naturalIncomeCeiling:turn*10,rewardHistory,mergeHistory,unusedCopyBudgets};
 }
 async function fight(Simulator,p,e,meta,battleSeed){
  seed(battleSeed);
  const multiplier=meta.globalDifficulty==='MASTER'&&meta.turn===1?1:multipliers[meta.globalDifficulty];
  let sim;
  if(Simulator===HeadlessBattleSimulator){
   const scaled=e.map(u=>{if(!u)return null;const v=new Unit(ALL_UNITS[u.templateId]);Object.assign(v,u,{stats:{...u.stats}});for(const k of ['hp','maxHp','attack'])v.stats[k]=Math.max(v.stats[k],Math.floor(v.stats[k]*multiplier));v.capStats();return v;});
   sim=new Simulator(p,scaled,undefined,meta.wins,2,meta.wins+1);
  }else sim=new Simulator(p,e,undefined,multiplier,1,2,meta.wins+1,true,[]);
  sim.delay=sim.playAnimation=sim.playTeamAnimation=sim.notifySkill=async()=>{};
  await sim.init();let steps=0, active=true;
  while(active&&steps<200){active=await sim.simulateStep();steps++;}
  return {result:sim.getResult()||'TIMEOUT',steps};
 }
 for(const editionId of ['classic','modern','infinite']){
  const module=await server.ssrLoadModule(`/src/data/editions/${editionId}/index.ts`);
  const edition=module[`${editionId[0].toUpperCase()}${editionId.slice(1)}Edition`];
  for(const stage of stages){
   const scalingGame=new GameLoop(edition);
   const benchmarks=Array.from({length:sampleCount},(_,i)=>player(edition,stage,i));
   benchmarks.forEach((p,index)=>rosters.push({editionId,stage:stage.id,index,...p,team:serialize(p.team)}));
   const stageRatings=[];
   for(const opponent of edition[stage.key]){
    const perGlobal={};
    for(let i=0;i<sampleCount;i++){
     const p=benchmarks[i],globalDifficulty=difficulties[Math.floor(i/16)%4];
     window.game={mewSynergies:p.mewSynergies};
     const meta={...p,globalDifficulty};
     seed(`audit-v1/enemy/${editionId}/${stage.id}/${opponent.id}/${i}`);
     const e=createEnemyTeam({game:{turn:p.turn,wins:p.wins,difficultyScore:p.turn,shop:new Shop()},activeEdition:edition,difficulty:globalDifficulty,tutorialStep:0,opponent});
     scalingGame.wins=p.wins;scalingGame.opponentTeam=e;scalingGame.refreshSpecialDescriptions();
     const battleSeed=`audit-v1/battle/${editionId}/${stage.id}/${opponent.id}/${i}`;
     const result=await fight(BattleSimulator,p.team,e,meta,battleSeed);
     totalBattles++;
     const g=perGlobal[globalDifficulty]??={WIN:0,LOSS:0,DRAW:0,TIMEOUT:0,steps:0};g[result.result]++;g.steps+=result.steps;
     if((!pilot&&[0,16,32,48,64,127,191,255].includes(i))||(pilot&&i===0&&stageRatings.length<2)){
      const headless=await fight(HeadlessBattleSimulator,p.team,e,meta,battleSeed);totalBattles++;
      parity.push({editionId,stage:stage.id,opponentId:opponent.id,index:i,headless,live:result,match:headless.result===result.result});
     }
    }
    for(const [gameDifficulty,c] of Object.entries(perGlobal)){
     const samples=c.WIN+c.LOSS+c.DRAW+c.TIMEOUT, resolved=samples-c.TIMEOUT;
     stageRatings.push({editionId,stage:stage.id,gameDifficulty,opponentId:opponent.id,name:opponent.name,previousDifficulty:opponent.difficulty,difficulty:'NORMAL',score:resolved?(c.LOSS+.5*c.DRAW)/resolved:.5,playerWinRate:c.WIN/samples,wins:c.WIN,losses:c.LOSS,draws:c.DRAW,timeouts:c.TIMEOUT,samples,meanSteps:c.steps/samples});
    }
   }
   for(const gameDifficulty of difficulties){
    const group=stageRatings.filter(r=>r.gameDifficulty===gameDifficulty).sort((a,b)=>a.score-b.score||a.opponentId.localeCompare(b.opponentId));
    group.forEach((r,i)=>{
     const tied=group.filter(other=>other.score===r.score),lower=group.filter(other=>other.score<r.score).length;
     const percentile=(lower+tied.length/2)/group.length;
     const difficulty=r.score===1?'VERY_HARD':r.score===0?'EASY':labels[Math.min(3,Math.floor(percentile*4))];
     Object.assign(r,{difficulty,rank:i+1,stageOpponentCount:group.length,sameScoreCount:tied.length,lowConfidence:tied.length>1||r.score>=.98||r.score<=.02});
    });
   }
   ratings.push(...stageRatings);
   originalLog(`${editionId}/${stage.id}: ${stageRatings.length} opponents; ${totalBattles} fights, ${((performance.now()-start)/1000).toFixed(1)}s`);
  }
 }
 const mismatches=parity.filter(p=>!p.match);
 const metadata={schemaVersion:2,seedNamespace:'audit-v1',engine:'BattleSimulator (isSim=true; presentation delays stubbed)',generatedAt:new Date().toISOString(),samplesPerOpponentAcrossGlobals:sampleCount,totalBattles,elapsedSeconds:(performance.now()-start)/1000,parityCases:parity.length,parityMismatches:mismatches.length,provisional:pilot||sampleCount<256,methodology:{stages,globals:difficulties,score:'(player losses + 0.5 * draws) / resolved fights; timeouts excluded from score, retained separately',labels:'Within each edition/stage/gameDifficulty, ascending score quartiles; deterministic ID tiebreak. Labels are relative benchmark ranks, not actual player win probability.',player:'Purchasable base forms within edition and current shop tier, unique families where possible; random, 3-unit synergy, full synergy, upper-half base-stat draft; actual GameLoop.mergeUnits with documented copies budgets. No invented permanent reward buffs. No spending/economy simulation.',limitations:['Equal mix of budgets and roster styles is a reference distribution, not measured player behavior. Each global difficulty is calibrated separately.','Fixed progression contexts and difficultyScore=turn; losses can shift real progression.','Skill scalingValue uses current template defaults; no inferred lifetime skill growth or item reward history.','Infinite rosters draw from legal edition possibilities; do not model per-run unlock draft restrictions.','Ranks near boundaries or tied scores have low certainty; a four-way split is a UI ranking, not statistical separation.']}};
 metadata.methodology.economy='Every purchase costs 3 gold. Team copies are capped at floor(turn*10/3), never exceeding cumulative natural income (10 per turn); the strongest budget may spend up to this ceiling, leaving no guaranteed reroll allowance. Unusable copy budgets remain unspent. This is a stat/merge budget ceiling, not a modeled probability of assembling the roster. Merges use actual GameLoop logic, exp 3/9 star thresholds, native evolution and merge effects; no artificial stat growth.';
 metadata.methodology.parity='Headless receives the same enemy multiplier, capStats and psychic arguments as the live engine. Paired tests reset battle RNG to the same seed. Full labels use live BattleSimulator regardless of parity results.';
 metadata.methodology.playerRewards=mergeOnly?'None (merge-only sensitivity baseline)':'Budget 0: no permanent rewards; budget 1/2/3: one actual NORMAL/HARD/EXTREME PERM_SYNERGY reward per prior win, applied with native GameLoop.applyPermanentReward. Select the reward synergy matching most current units, seeded ties. Assumes the current roster survived and benefited throughout; these are hypothetical valid reward histories, not measured player distributions. No extra flat stats or hand-authored reward values.';
 metadata.methodology.player=metadata.methodology.player.replace('No invented permanent reward buffs.','Permanent rewards use the exact native reward table and application logic.');
 metadata.benchmarkBuilderVersion=2;
 metadata.methodology.player=metadata.methodology.player.replace('actual GameLoop.mergeUnits','legal merge trees through native GameLoop.moveUnit');
 metadata.methodology.legalMerges='Every merge passes native moveUnit with identical family/name and both levels below 3. Evolved sources are built from their own base copies through legal merges. Three-star units stop accepting copies. Unusable copy budget is not purchased or charged. A five-slot scratch board keeps two actual allied units and up to three synthesis units; native merge effects affect the allies actually present. The other two final allies are assembled outside this scratch context. Eevee evolves with native weights from those two allies and stops after its first evolution, rather than assuming another Eevee independently evolves into a matching form. Every source/target/result exp, form, level and copy count is saved in mergeHistory.';
 metadata.methodology.rewardAvailability='A unit receives historical rewards only after its original shop tier could first appear: T1/T2 turn1, T3 turn3, T4 turn6, T5 turn10. One prior win is assigned to each earliest historical turn. No guarantee is made about exact rolls, purchases, or reward offers; these are stage-budgeted benchmark scenarios.';
 metadata.methodology.labels='Within each edition/stage/gameDifficulty, tied score groups share their midpoint percentile and the same quartile label. Score=1 is VERY_HARD, score=0 is EASY. Saturated pools may have fewer than four labels; no ID tiebreak can create an unsupported difficulty distinction.';
 metadata.methodology.preparation='Player startBattlePhase invokes native prep-end synergies and individual effects exactly once for the current turn. Native refreshSpecialDescriptions assigns enemy charmander/pichu/riolu N=max(1,wins). Player growing skill N and Psychic N remain 1 and 2 respectively, without inferred past history.';
 metadata.methodology.limitations=metadata.methodology.limitations.filter(t=>!t.startsWith('Skill scalingValue'));
 writeFileSync(`${out}/${outputStem}.json`,JSON.stringify({...metadata,ratings,parity},null,2));
 writeFileSync(`${out}/${outputStem}-rosters.json`,JSON.stringify(rosters,null,2));
 if(!pilot&&!mergeOnly&&!metadata.provisional){
  writeFileSync(`${root}/src/data/opponentDifficultyLookup.json`,JSON.stringify(Object.fromEntries(ratings.map(r=>[`${r.editionId}/${r.stage}/${r.gameDifficulty}/${r.opponentId}`,r.difficulty])),null,2));
  writeFileSync(`${root}/src/data/opponentDifficultyRatings.json`,JSON.stringify({...metadata,ratings},null,2));
 }
 const groups=Object.groupBy(ratings,r=>`${r.editionId}/${r.stage}/${r.gameDifficulty}`);
 const report=[
  '# 對手難度校準（2026-11-07）','',
  `主引擎：${metadata.engine}。333 個 NPC 定義，每總難度各 ${sampleCount/4} 個樣本；正式戰鬥 ${ratings.reduce((s,r)=>s+r.samples,0)} 場，Headless 對照 ${parity.length} 場，結果不一致 ${mismatches.length} 組。總耗時 ${metadata.elapsedSeconds.toFixed(1)} 秒。`,'',
  '這是同版本、同階段、同遊戲總難度的相對基準，並非實際玩家勝率預測。以原生 createEnemyTeam 生成敵方，包含填充、升星、站位、小智皮卡丘鎖定；倍率由正式 BattleSimulator 依 App 相同規則處理。200 steps 尚有雙方存活者記 TIMEOUT，與 DRAW 分開。','',
  '玩家用可購買基本型態及原生 GameLoop.moveUnit 合法合成樹建隊，4 種購買強度與 4 種選角策略、2 個階段進程；購買總價不超過回合 × 10 金。每次合成校驗同family／同name、雙方未滿三星；進化來源也先用基本型態合法合成，三星停止，不能利用的份數不購買、不計費。五槽合成工作隊保留兩位實際隊友，另三槽合成；原生合成效果只影響當時在場者。伊布採這兩位隊友的原生進化權重，首次進化後停止，避免假定另一隻伊布必定進化為相同型態。','',
  '永久獎勵使用實際 REWARD_DATA 與 applyPermanentReward，每已勝回合最多一次；各強度為無獎勵／NORMAL／HARD／EXTREME，以可受益最多的羈絆優先。完整原始模板、星數、數值、購買數、每次合法合成的來源／目標／結果與獎勵歷史在 calibration-rosters.json。benchmarkBuilderVersion=2 取代先前直接餵基本型態的無效基準；舊探索資料不得用來作目前難度結論。','',
  '難度分數 =（玩家敗 + 0.5 × 平）／已結束戰鬥數；同分群組共用排名中點的分位標籤，同分絕不依 ID 拆成不同級。score=1 全敗飽和組為 VERY_HARD，score=0 為 EASY，因此部分池可以少於四種標籤。sameScoreCount 與 lowConfidence 明示同分及極端結果的不確定性。64 個樣本主要支持排序方向，無法精確區分相差幾個百分點的對手。','',
  '當回合玩家以 startBattlePhase 套用原生備戰結束羈絆及個別效果一次。敵方以 refreshSpecialDescriptions 同步小火龍／皮丘／利歐路家族 N=max(1,wins)；玩家技能N=1、Psychic N=2，未推定過往養成。Champion contexts均wins=12。','',
  '限制：這不是從開局跑完商店、選獎勵、存活與交易的政策模擬。高強度採有利獎勵歷史；最強購買強度可耗盡自然收入而沒有刷新餘額。不同輪次取得的寶可夢及羈絆可能與假設不同。Infinite 未重建每局解鎖選池。玩家歷史技能及備戰養成未全程重建。實際玩家難度仍需遊戲紀錄校驗。','',
  'merge-only-baseline.json 為早期未計獎勵的探索資料（也早於備戰／技能N／最高商店tier校正），只供歷史診斷，不能視為單變量對照。要做同規則獎勵敏感度，可加 --merge-only 產生獨立 merge-only.json，不覆寫正式lookup。舊 Stage/Classic/Modern/InfiniteBalanceSim 報告未沿用。','',
  '## 各池實測範圍','',
  '| 版本／階段／總難度 | NPC數 | 玩家勝率範圍 | 不同分數數 | 超時 | 與舊標籤不同 |',
  '| --- | ---: | --- | ---: | ---: | ---: |',
  ...Object.entries(groups).map(([key,rows])=>`| ${key} | ${rows.length} | ${(100*Math.min(...rows.map(r=>r.playerWinRate))).toFixed(1)}%–${(100*Math.max(...rows.map(r=>r.playerWinRate))).toFixed(1)}% | ${new Set(rows.map(r=>r.score)).size} | ${rows.reduce((s,r)=>s+r.timeouts,0)} | ${rows.filter(r=>r.previousDifficulty!==r.difficulty).length} |`),
  '', '重跑：`node scripts/reassess-opponent-difficulty.mjs --samples=256`。資料驗證：`node scripts/verify-opponent-difficulty-ratings.mjs`。固定 seed namespace 為 audit-v1；同一 source/Node 版本可重現。來源與資料都應隨專案一起保存。',''
 ];
 writeFileSync(`${out}/${mergeOnly?'MERGE-ONLY-REPORT':'REPORT'}.md`,report.join('\n'));
 if(!pilot&&!mergeOnly)writeFileSync(`${root}/docs/對手難度校準-20261107.md`,report.join('\n'));
 originalLog(JSON.stringify({...metadata,methodology:undefined,mismatches:mismatches.slice(0,12)},null,2));
}finally{Math.random=originalRandom;console.log=originalLog;await server.close();}
