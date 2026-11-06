import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const server=await createServer({root,appType:'custom',server:{middlewareMode:true}});
const selected=process.argv[2];
const failures=[];
let count=0;
const check=async(group,name,run)=>{
 if(selected&&selected!==group)return;
 try {await run();count++;} catch(error){failures.push(`${name}: ${error.message}`);}
};
try {
 globalThis.window={};
 const {ALL_UNITS}=await server.ssrLoadModule('/src/data/AllUnits.ts');
 const {Unit}=await server.ssrLoadModule('/src/models/Unit.ts');
 const {GameLoop}=await server.ssrLoadModule('/src/engine/GameLoop.ts');
 const {BattleSimulator}=await server.ssrLoadModule('/src/engine/BattleSimulator.ts');
 const {HeadlessBattleSimulator}=await server.ssrLoadModule('/src/engine/HeadlessBattleSimulator.ts');
 const makeBattle=(Simulator,originals,enemies)=>{
  const sim=new Simulator(originals,enemies,originals);
  sim.delay=sim.playAnimation=sim.playTeamAnimation=sim.notifySkill=async()=>{};
  return sim;
 };
 for(const Simulator of [BattleSimulator,HeadlessBattleSimulator]) {
  for(const [id,stat] of [['togepi','attack'],['happiny','maxHp']]) {
   for(const [cap,permanent] of [[50,40],[50,49],[50,50],[60,40]]) {
    await check('1',`${Simulator.name} ${id} cap ${cap} original ${permanent}`,async()=>{
     const originals=[new Unit(ALL_UNITS[id]),new Unit(ALL_UNITS.rattata)];
     for(const unit of originals) {
      unit.attackCap=cap;unit.maxHpCap=cap;
      unit.stats={attack:permanent,hp:permanent,maxHp:permanent};
     }
     const sim=makeBattle(Simulator,originals,[new Unit(ALL_UNITS.rattata)]);
     for(const unit of sim.playerTeam) unit.stats={attack:cap,hp:cap,maxHp:cap};
     for(let attacks=1;attacks<=2;attacks++) {
      await sim.eventBus.emit({type:'AFTER_ATTACK',source:sim.playerTeam[0],context:{simulator:sim}});
      originals.forEach(unit=>assert.equal(unit.stats[stat],Math.min(cap,permanent+2*attacks),'permanent source and rear growth'));
      sim.playerTeam.forEach(unit=>assert.equal(unit.stats[stat],cap,'combat stats stay capped'));
     }
    });
   }
  }
 }
 for(const [id,level,exp,amount,expectedId,expectedLevel] of [
  ['charmander',1,1,1,'charmander',1],
  ['charmander',1,2,1,'charmeleon',2],
  ['charmeleon',2,8,1,'charizard',3],
  ['charmander',1,1,8,'charizard',3],
  ['charmander',1,2,10,'charizard',3],
  ['eevee',1,2,1,null,2],
  ['eevee',1,1,8,null,3],
  ['flareon',2,8,1,'flareon_final',3],
  ['raikou',1,2,1,'raikou',2],
  ['charizard',3,9,1,'charizard',3],
 ]) await check('2',`${id} EXP ${exp}+${amount}`,()=>{
  const game=new GameLoop();
  const unit=new Unit(ALL_UNITS[id]);unit.level=level;unit.exp=exp;
  game.playerTeam=[unit,null,null,null,null];
  const before={...unit.stats};
  game.applyExpToUnit(unit,amount);
  assert.equal(unit.exp,exp+amount,'Reward grants exactly its stated EXP');
  assert.equal(unit.level,expectedLevel);
  if(expectedId)assert.equal(unit.templateId,expectedId);
  else assert.notEqual(unit.templateId,'eevee');
  if(level===expectedLevel)assert.deepEqual(unit.stats,before,'EXP-only rewards do not grant unrelated stats');
  assert.equal(unit.hasNewPermanentBuff,true);
 });
 await check('2','EXP reward does not fire merge-only abilities',()=>{
  const game=new GameLoop();
  const unit=new Unit(ALL_UNITS.mankey);unit.exp=2;
  const ally=new Unit(ALL_UNITS.rattata);
  const before={...ally.stats};
  game.playerTeam=[unit,ally,null,null,null];
  game.applyExpToUnit(unit,1);
  assert.deepEqual(ally.stats,before,'EXP rewards are not a merge');
 });
 await check('2','Actual merging keeps original EXP and growth rules',()=>{
  const game=new GameLoop();
  const unit=new Unit(ALL_UNITS.charmander);unit.exp=2;
  game.playerTeam=[unit,new Unit(ALL_UNITS.charmander),null,null,null];
  game.moveUnit(1,0);
  assert.equal(unit.exp,3);assert.equal(unit.level,2);assert.equal(unit.templateId,'charmeleon');
  assert.equal(game.playerTeam[1],null);
 });
 for(const Simulator of [BattleSimulator,HeadlessBattleSimulator]) {
  for(const [index,id] of ['snover','abomasnow','abomasnow_final'].entries()) {
   for(const silenced of [false,true]) await check('3',`${Simulator.name} ${id} silenced ${silenced}`,async()=>{
    const source=new Unit(ALL_UNITS[id]);source.level=index+1;source.stats.attack=1;
    const enemy=new Unit(ALL_UNITS.rattata);enemy.stats={attack:1,hp:50,maxHp:50};
    const sim=makeBattle(Simulator,[source],[enemy]);
    const actor=sim.playerTeam[0];
    sim.unitStates.set(actor,{...sim.unitStates.get(actor),isSilenced:silenced});
    for(let attacks=1;attacks<=2;attacks++) {
     await sim.performAttack(actor,sim.enemyTeam[0]);
     const expected=1+(silenced?0:[1,2,5][index])*attacks;
     assert.equal(source.stats.attack,expected,'Snover family permanent growth follows its stage');
     assert.equal(actor.stats.attack,expected,'Combat and permanent growth agree');
    }
   });
  }
 }
 for(const Simulator of [BattleSimulator,HeadlessBattleSimulator]) {
  for(const side of ['player','enemy']) {
   for(const mode of ['inactive','active','silenced','capped']) await check('4',`${Simulator.name} BugBite ${side}/${mode}`,async()=>{
    const source=new Unit(ALL_UNITS.caterpie);
    const ally=new Unit(ALL_UNITS.grubbin);
    if(mode==='capped')source.stats={hp:40,maxHp:40,attack:2};
    const baseHp=source.stats.maxHp,baseAtk=source.stats.attack;
    const team=mode==='inactive'?[source]:[source,ally];
    const victims=[new Unit(ALL_UNITS.aron),new Unit(ALL_UNITS.rattata)];
    const sim=side==='player'?makeBattle(Simulator,team,victims):makeBattle(Simulator,victims,team);
    const killer=(side==='player'?sim.playerTeam:sim.enemyTeam)[0];
    const victim=(side==='player'?sim.enemyTeam:sim.playerTeam)[0];
    if(mode==='silenced')sim.unitStates.set(killer,{...sim.unitStates.get(killer),isSilenced:true});
    if(mode==='capped')killer.stats={hp:50,maxHp:50,attack:2};
    const gain=mode==='inactive'||mode==='silenced'?0:1;
    await sim.dealDamage(killer,victim,100);
    assert.equal(killer.stats.maxHp,mode==='capped'?50:baseHp+gain,'Kill reward adds one combat HP');
    assert.equal(source.stats.maxHp,baseHp+(side==='player'?gain:0),'Only player kills write back to player originals');
    assert.equal(killer.stats.attack,baseAtk,'BugBite does not grant the obsolete Claw attack buff');
    const after=source.stats.maxHp;
    await sim.dealDamage(killer,victim,100);
    assert.equal(source.stats.maxHp,after,'A dead enemy cannot grant a second kill reward');
   });
  }
 }
 if(failures.length)throw new Error(`${failures.length} failed cases:\n${failures.join('\n')}`);
 assert.ok(count>0,'At least one case must run');
 console.log(`PASS: ${count} growth/EXP/parity regression cases${selected?` (group ${selected})`:''}.`);
} finally {await server.close();}
