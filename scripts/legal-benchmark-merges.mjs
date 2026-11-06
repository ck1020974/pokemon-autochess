import assert from 'node:assert/strict';

// Native moveUnit enforces the public board merge rules. Keep two actual allies
// and three working slots: building a second two-star source needs a waiting
// target, a source under construction, and one new base copy at most.
export function buildLegalBenchmarkUnit({game,target,template,maxCopies,Unit}) {
 const fullTeam=game.playerTeam;
 const allies=fullTeam.filter(u=>u&&u!==target).slice(0,2);
 game.playerTeam=[...allies,...Array(5-allies.length).fill(null)];
 const copies=new Map([[target,1]]),history=[];
 let purchased=1;
 const snapshot=u=>({templateId:u.templateId,family:u.family,name:u.name,level:u.level,exp:u.exp,copies:copies.get(u)});
 const place=u=>{const index=game.playerTeam.indexOf(null);assert.ok(index>=0,'Five-slot scratch board has room');game.playerTeam[index]=u;return u;};
 const base=()=>{const u=new Unit(template);copies.set(u,1);purchased++;return place(u);};
 const merge=(to,from)=>{
  assert.equal(to.family,from.family);assert.equal(to.name,from.name);
  assert.ok(to.level<3&&from.level<3,'Never feed a three-star unit');
  const entry={source:snapshot(from),target:snapshot(to),boardCount:game.playerTeam.filter(Boolean).length,allyFamilies:allies.map(u=>u.family)};
  assert.ok(entry.boardCount<=5);
  const sourceIndex=game.playerTeam.indexOf(from),targetIndex=game.playerTeam.indexOf(to);
  game.moveUnit(sourceIndex,targetIndex);
  assert.equal(game.playerTeam[sourceIndex],null,'Native moveUnit consumed legal source');
  assert.equal(game.playerTeam[targetIndex],to);
  copies.set(to,copies.get(to)+copies.get(from));
  entry.result=snapshot(to);history.push(entry);
  return to;
 };
 const twoStarSource=()=>{
  const source=base();
  merge(source,base());merge(source,base());
  assert.equal(source.level,2);
  return source;
 };
 try{
  place(target);
  while(target.level<3){
   // Do not pretend an independently evolved Eevee necessarily matches the
   // waiting form. Two-star Eevee is a conservative legal benchmark ceiling.
   if(target.family==='eevee'&&target.name!==template.name)break;
   const needed=target.name===template.name?1:3;
   if(purchased+needed>maxCopies)break;
   const source=needed===1?base():twoStarSource();
   merge(target,source);
  }
  assert.equal(copies.get(target),purchased);
  return {unit:target,purchasedCopies:purchased,unusedCopyBudget:maxCopies-purchased,mergeHistory:history};
 }finally{game.playerTeam=fullTeam;game.updateTeamCaps();}
}
