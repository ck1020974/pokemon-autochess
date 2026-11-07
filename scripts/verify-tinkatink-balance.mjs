import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server = await createServer({appType:'custom', optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true}});
let checks=0;
try {
 globalThis.window={}; globalThis.document={getElementById:()=>null,querySelectorAll:()=>[]};
 globalThis.requestAnimationFrame=cb=>{cb();return 0;};
 const {ALL_UNITS}=await server.ssrLoadModule('/src/data/AllUnits.ts');
 const {Unit}=await server.ssrLoadModule('/src/models/Unit.ts');
 const {GameLoop}=await server.ssrLoadModule('/src/engine/GameLoop.ts');
 const {BattleSimulator}=await server.ssrLoadModule('/src/engine/BattleSimulator.ts');
 const {HeadlessBattleSimulator}=await server.ssrLoadModule('/src/engine/HeadlessBattleSimulator.ts');
 const editions=await Promise.all(['classic','modern','infinite'].map(async name=>Object.values(await server.ssrLoadModule(`/src/data/editions/${name}/index.ts`)).find(e=>e?.availableUnitIds)));
 const ids=['tinkatink','tinkatuff','tinkaton'];
 for(const [index,id] of ids.entries()) {
  const t=ALL_UNITS[id]; assert.ok(t,`${id}: registered template`);
  assert.equal(t.tier,5); assert.equal(t.family,'tinkatink'); assert.equal(t.isPlayerOnly,true);
  assert.deepEqual(t.synergies,['Charm','Hard']);
  assert.equal(t.description,ALL_UNITS[['larvitar','pupitar','tyranitar'][index]].description);
  assert.equal(Boolean(t.isHiddenFromShop),index>0);
  for(const [e,edition] of editions.entries()) assert.equal(edition.availableUnitIds.includes(id),e===2);
  checks++;
 }
 assert.deepEqual(ALL_UNITS.tinkatink.baseStats,{hp:8,maxHp:8,attack:8});
 for(const Simulator of [BattleSimulator,HeadlessBattleSimulator]) {
  for(const side of ['player','enemy']) for(const level of [1,2,3]) for(const silenced of [false,true]) {
   const unit=new Unit(ALL_UNITS[ids[level-1]]);unit.level=level;unit.stats.attack=11;
   const foes=[new Unit(ALL_UNITS.rattata),null,new Unit(ALL_UNITS.rattata),new Unit(ALL_UNITS.rattata),null];
   foes.filter(Boolean).forEach(u=>{u.maxHpCap=200;u.stats={hp:100,maxHp:100,attack:1};});
   const sim=new Simulator(side==='player'?[unit]:foes,side==='enemy'?[unit]:foes);
   sim.delay=sim.playAnimation=sim.playTeamAnimation=sim.notifySkill=async()=>{};
   const source=sim[side+'Team'][0],targets=sim[side==='player'?'enemyTeam':'playerTeam'];
   sim.unitStates.set(source,{isSilenced:silenced});
   await sim.eventBus.emit({type:'BEFORE_ATTACK',source,target:targets[0],context:{}});
   assert.equal(targets[2].stats.hp,100-(silenced?0:Math.ceil(11*[0,.33,.5,.66][level])));
   assert.equal(targets[0].stats.hp,100);assert.equal(targets[3].stats.hp,100);checks++;
  }
  for(const id of ['kangaskhan','kangaskhan_2','kangaskhan_3','shuckle']) for(const side of ['player','enemy']) {
   const original=new Unit(ALL_UNITS[id]); original.level=id.endsWith('_3')?3:id.endsWith('_2')?2:1; const before={...original.stats};
   assert.deepEqual(before,id==='shuckle'?{hp:6,maxHp:6,attack:4}:{hp:4,maxHp:4,attack:6});
   const foe=new Unit(ALL_UNITS.rattata);
   const sim=new Simulator(side==='player'?[original]:[foe],side==='enemy'?[original]:[foe],[original]);
   sim.delay=sim.playAnimation=sim.playTeamAnimation=sim.notifySkill=async()=>{};
   const source=sim[side+'Team'][0];
   await sim.executeUnitStartOfBattleAbility(source);
   assert.deepEqual(source.stats,id==='shuckle'?{hp:9,maxHp:9,attack:4}:{hp:4,maxHp:4,attack:9});
   assert.deepEqual(original.stats,before,'opening buff stays temporary');checks++;
  }
  for(const id of ['shuckle','kangaskhan']) for(const silenced of [false,true]) {
   const original=new Unit(ALL_UNITS[id]);original.stats={hp:15,maxHp:15,attack:13};
   const sim=new Simulator([original],[new Unit(ALL_UNITS.rattata)],[original]);
   sim.delay=sim.playAnimation=sim.playTeamAnimation=sim.notifySkill=async()=>{};
   const source=sim.playerTeam[0];
   source.stats={hp:7,maxHp:17,attack:3};
   sim.unitStates.set(source,{isSilenced:silenced});
   await sim.executeUnitStartOfBattleAbility(source);
   assert.deepEqual(source.stats,silenced?{hp:7,maxHp:17,attack:3}:id==='shuckle'?{hp:14,maxHp:24,attack:3}:{hp:7,maxHp:17,attack:9},'opening snapshot, floor, silence');
   assert.deepEqual(original.stats,{hp:15,maxHp:15,attack:13});checks++;
  }
 }
 const game=new GameLoop(); const unit=new Unit(ALL_UNITS.tinkatink);game.playerTeam=[unit,null,null,null,null];
 for(let battle=1;battle<=24;battle++) {
  game.endBattle('DRAW');
  assert.equal(unit.exp,1+Math.floor(battle/3));
  assert.equal(unit.templateId,battle<6?'tinkatink':battle<24?'tinkatuff':'tinkaton');
  assert.deepEqual(unit.synergies,['Charm','Hard']);checks++;
 }
 game.endBattle('DRAW'); assert.equal(unit.exp,9);checks++;
 console.log(`Tinkatink and opening balance: ${checks} checks passed`);
} finally {await server.close();}
