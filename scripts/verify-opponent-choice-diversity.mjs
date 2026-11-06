import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const root=fileURLToPath(new URL('..',import.meta.url));
const server=await createServer({root,appType:'custom',server:{middlewareMode:true}});
try{
 const module=existsSync(new URL('../src/engine/opponentSelection.ts',import.meta.url))?await server.ssrLoadModule('/src/engine/opponentSelection.ts'):{};
 assert.equal(typeof module.selectOpponentChoices,'function','Opponent choices need a diversity policy');
 const {selectOpponentChoices,getOpponentStage}=module;
 const labels=['EASY','NORMAL','HARD','VERY_HARD'];
 const pool=labels.flatMap((difficulty,tier)=>Array.from({length:3},(_,i)=>({id:`${tier}-${i}`,difficulty})));
 let checked=0;
 for(let seed=0;seed<24;seed++){
  let state=seed+1;const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
  const result=selectOpponentChoices(pool,[],{random});
  assert.equal(result.length,3);assert.equal(new Set(result.map(x=>x.difficulty)).size,3);
  assert.equal(new Set(result.map(x=>x.id)).size,3);
  assert.deepEqual(result.map(x=>labels.indexOf(x.difficulty)),result.map(x=>labels.indexOf(x.difficulty)).sort((a,b)=>a-b));checked++;
 }
 const onlyHard=pool.filter(x=>x.difficulty==='HARD');
 const seen=pool.filter(x=>x.difficulty!=='HARD').map(x=>x.id);
 const same=selectOpponentChoices(pool,seen,{random:()=>0});
 assert.equal(same.length,3);assert.ok(same.every(x=>x.difficulty==='HARD'),'Never reuse defeated opponents to fabricate diversity');checked++;
 const two=selectOpponentChoices(pool,pool.slice(2).map(x=>x.id),{random:()=>0});assert.equal(two.length,2);assert.ok(two.every(x=>!pool.slice(2).some(seen=>seen.id===x.id)));checked++;
 assert.deepEqual(selectOpponentChoices(pool,pool.map(x=>x.id)),[]);checked++;
 const twoTypes=selectOpponentChoices(pool.filter(x=>['NORMAL','HARD'].includes(x.difficulty)),[],{random:()=>0});assert.equal(twoTypes.length,3);assert.equal(new Set(twoTypes.map(x=>x.difficulty)).size,2);checked++;
 const endless=selectOpponentChoices(onlyHard,[],{diversify:false,random:()=>0});assert.equal(endless.length,3);assert.ok(endless.every(x=>x.difficulty==='HARD'));checked++;
 const exhausted=selectOpponentChoices(onlyHard,onlyHard.map(x=>x.id),{diversify:false,random:()=>0});assert.deepEqual(exhausted,[]);checked++;
 const duplicated=selectOpponentChoices([...pool,pool[0]],[],{random:()=>0});assert.equal(new Set(duplicated.map(x=>x.id)).size,3);checked++;
 assert.deepEqual(selectOpponentChoices([],[]),[]);assert.deepEqual(selectOpponentChoices(pool,[],{count:0}),[]);checked++;
 assert.deepEqual(pool,labels.flatMap((difficulty,tier)=>Array.from({length:3},(_,i)=>({id:`${tier}-${i}`,difficulty}))));checked++;
 for(const [wins,stage] of [[0,'novice'],[2,'novice'],[3,'intermediate'],[4,'intermediate'],[5,'advanced'],[7,'advanced'],[8,'elite'],[11,'elite'],[12,'champion'],[20,'champion']]){assert.equal(getOpponentStage(wins),stage);checked++;}
 console.log(`PASS: ${checked} opponent diversity, unseen-only and stage boundary cases.`);
}finally{await server.close();}
