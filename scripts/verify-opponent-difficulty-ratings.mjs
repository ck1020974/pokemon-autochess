import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {buildLegalBenchmarkUnit} from './legal-benchmark-merges.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const data=JSON.parse(readFileSync(`${root}/src/data/opponentDifficultyRatings.json`));
const lookup=JSON.parse(readFileSync(`${root}/src/data/opponentDifficultyLookup.json`));
const rosterFile=`${root}/output/difficulty-audit-20261107/calibration-rosters.json`;
const rosters=existsSync(rosterFile)?JSON.parse(readFileSync(rosterFile)):[];
assert.equal(data.schemaVersion,2);assert.equal(data.provisional,false);
assert.equal(data.benchmarkBuilderVersion,2);
const server=await createServer({root,appType:'custom',server:{middlewareMode:true,hmr:false}});
try{
 const {ALL_UNITS}=await server.ssrLoadModule('/src/data/AllUnits.ts');
 const {Unit}=await server.ssrLoadModule('/src/models/Unit.ts');
 const {GameLoop}=await server.ssrLoadModule('/src/engine/GameLoop.ts');
 const checkMerge=entry=>{
  assert.equal(entry.source.family,entry.target.family);
  assert.equal(entry.source.name,entry.target.name);
  assert.ok(entry.source.level<3&&entry.target.level<3);
  assert.equal(entry.result.exp,entry.source.exp*(entry.target.family==='eevee'?2:1)+entry.target.exp);
  assert.equal(entry.result.copies,entry.source.copies+entry.target.copies);
  assert.ok(entry.result.level<=3&&entry.boardCount<=5);
 };
 const savedLog=console.log;console.log=()=>{};
 try{
  globalThis.window={};
  for(const id of ['charmander','rattata','dwebble','eevee'])for(const budget of [1,2,3,4,6,8,9,15]){
   const game=new GameLoop();window.game=game;
   const target=new Unit(ALL_UNITS[id]);
   const board=[target,...['bulbasaur','squirtle','gastly','igglybuff'].map(other=>new Unit(ALL_UNITS[other]))];
   game.playerTeam=board;
   const built=buildLegalBenchmarkUnit({game,target,template:ALL_UNITS[id],maxCopies:budget,Unit});
   assert.equal(game.playerTeam,board);
   assert.ok(built.purchasedCopies<=Math.min(budget,9));
   assert.equal(built.purchasedCopies+built.unusedCopyBudget,budget);
   if(id!=='eevee')assert.equal(built.purchasedCopies,target.exp);
   built.mergeHistory.forEach(checkMerge);
   if(budget===15)assert.equal(built.purchasedCopies,id==='eevee'?2:9);
  }
 }finally{console.log=savedLog;}
 const {rateOpponent}=await server.ssrLoadModule('/src/data/opponentDifficulty.ts');
 const unknown={id:'custom-audit-unknown',difficulty:'NORMAL',coreUnits:['rattata']};
 assert.equal(rateOpponent(unknown,'classic','novice','NORMAL'),unknown);
 const keys={novice:'noviceOpponents',intermediate:'intermOpponents',advanced:'advancedOpponents',elite:'eliteOpponents',champion:'championOpponents'};
 for(const editionId of ['classic','modern','infinite']){
  const module=await server.ssrLoadModule(`/src/data/editions/${editionId}/index.ts`);
  const edition=module[`${editionId[0].toUpperCase()}${editionId.slice(1)}Edition`];
  for(const [stage,key] of Object.entries(keys))for(const gameDifficulty of ['NORMAL','GREAT','ULTRA','MASTER']){
   const rows=data.ratings.filter(r=>r.editionId===editionId&&r.stage===stage&&r.gameDifficulty===gameDifficulty);
   assert.equal(rows.length,edition[key].length);
   assert.deepEqual(new Set(rows.map(r=>r.opponentId)),new Set(edition[key].map(o=>o.id)));
   assert.ok(new Set(rows.map(r=>r.difficulty)).size<=4);
   const byScore=new Map();
   const sorted=rows.toSorted((a,b)=>a.rank-b.rank);
   for(const [i,r] of sorted.entries()){
    const original=edition[key].find(opponent=>opponent.id===r.opponentId);
    const before=JSON.stringify(original);
    const rated=rateOpponent(original,editionId,stage,gameDifficulty);
    assert.equal(rated.difficulty,r.difficulty);
    assert.equal(JSON.stringify(original),before,'Original opponent definitions remain unchanged');
    assert.equal(rated.coreUnits,original.coreUnits,'Calibration preserves coreUnits');
    assert.equal(r.samples,64);assert.equal(r.wins+r.losses+r.draws+r.timeouts,r.samples);
    assert.equal(r.playerWinRate,r.wins/r.samples);
    assert.equal(r.score,(r.losses+.5*r.draws)/(r.samples-r.timeouts));
    assert.equal(r.rank,i+1);if(i)assert.ok(sorted[i-1].score<=r.score);
    if(byScore.has(r.score))assert.equal(r.difficulty,byScore.get(r.score));byScore.set(r.score,r.difficulty);
    assert.equal(lookup[`${editionId}/${stage}/${gameDifficulty}/${r.opponentId}`],r.difficulty);
    if(r.score===1)assert.equal(r.difficulty,'VERY_HARD');
   }
  }
 }
 for(const p of rosters){
  assert.ok(p.purchaseGold<=p.turn*10);
  assert.equal(p.purchaseGold,p.purchaseCopies*3);
  assert.equal(p.purchaseCopies,p.purchasedCopies.reduce((a,b)=>a+b,0));
  assert.ok(p.team.filter(Boolean).every(u=>u.level>=1&&u.level<=3&&u.stats.hp>0));
  if(p.stage==='champion')assert.ok(p.wins>=12);
  assert.ok(p.rewardHistory.length<=p.wins);
  assert.equal(p.maxPurchasableTier,p.turn<=2?2:p.turn<=5?3:p.turn<=9?4:5);
  assert.ok(p.purchasedTemplateIds.every(id=>ALL_UNITS[id].tier<=p.maxPurchasableTier&&!ALL_UNITS[id].isHiddenFromShop));
  assert.ok(p.mergeHistory,'Rosters preserve legal merge evidence');
  p.mergeHistory.forEach(checkMerge);
  assert.ok(p.purchasedCopies.every(n=>n<=9),'No post-three-star copy feeding');
 }
 console.log(`PASS: ${data.ratings.length} ratings cover every opponent in 60 edition/stage/global pools; ${rosters.length} legal merge-budget rosters.`);
}finally{await server.close();}
