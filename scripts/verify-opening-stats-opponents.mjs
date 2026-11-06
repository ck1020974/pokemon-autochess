import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const server=await createServer({root,appType:'custom',server:{middlewareMode:true}});
const selected=process.argv[2];let passed=0;const failures=[];
const check=async(group,name,run)=>{
 if(selected&&group!==selected)return;
 try{await run();passed++;}catch(error){failures.push(`${name}: ${error.message}`);}
};
try {
 globalThis.window={};
 const {Unit}=await server.ssrLoadModule('/src/models/Unit.ts');
 const {ALL_UNITS}=await server.ssrLoadModule('/src/data/AllUnits.ts');
 const {GameLoop}=await server.ssrLoadModule('/src/engine/GameLoop.ts');
 const {BattleSimulator}=await server.ssrLoadModule('/src/engine/BattleSimulator.ts');
 const {HeadlessBattleSimulator}=await server.ssrLoadModule('/src/engine/HeadlessBattleSimulator.ts');
 const enemyModule=await server.ssrLoadModule('/src/engine/createEnemyTeam.ts');
 const makeBattle=(Simulator,players,enemies)=>{
  const sim=new Simulator(players,enemies,players);
  sim.delay=sim.playAnimation=sim.playTeamAnimation=sim.notifySkill=async()=>{};
  return sim;
 };
 for(const Simulator of [BattleSimulator,HeadlessBattleSimulator]) {
  for(const family of ['plusle','minun'])for(const level of [1,2,3])for(const side of ['player','enemy']) {
   await check('1',`${Simulator.name} ${family} ${level} ${side} immutable opening`,async()=>{
    const front=new Unit(ALL_UNITS.rattata);front.stats={attack:5,hp:5,maxHp:5};
    const source=new Unit(ALL_UNITS[level===1?family:`${family}_${level}`]);source.level=level;
    source.stats={attack:20,hp:20,maxHp:20};
    const sim=side==='player'?makeBattle(Simulator,[front,source],[new Unit(ALL_UNITS.rattata)]):makeBattle(Simulator,[new Unit(ALL_UNITS.rattata)],[front,source]);
    const team=side==='player'?sim.playerTeam:sim.enemyTeam;
    // Earlier effects change the combat copy and may also write permanent growth back.
    team[1].stats={attack:40,hp:40,maxHp:40};source.stats={attack:30,hp:30,maxHp:30};
    await sim.executeUnitStartOfBattleAbility(team[1]);
    const amount=Math.floor(20*[0,.25,.33,.5][level]);
    assert.equal(team[0].stats[family==='plusle'?'attack':'maxHp'],5+amount);
    assert.deepEqual(front.stats,{attack:5,hp:5,maxHp:5},'Helping Hand is temporary');
   });
  }
  for(const family of ['plusle','minun'])await check('1',`${Simulator.name} ${family} real opening order`,async()=>{
   const front=new Unit(ALL_UNITS.rattata);front.stats={attack:5,hp:5,maxHp:5};
   const booster=new Unit(ALL_UNITS[family==='plusle'?'caterpie':'cleffa']);
   const source=new Unit(ALL_UNITS[family]);source.stats={attack:7,hp:7,maxHp:7};
   const sim=makeBattle(Simulator,[front,booster,source],[new Unit(ALL_UNITS.rattata)]);
   await sim.init();
   assert.equal(sim.playerTeam[0].stats[family==='plusle'?'attack':'maxHp'],6,'Use 25% of opening 7, not boosted 8');
  });
  for(const family of ['plusle','minun'])for(const mode of ['first','silenced'])await check('1',`${Simulator.name} ${family} ${mode}`,async()=>{
   const source=new Unit(ALL_UNITS[family]);source.stats={attack:20,hp:20,maxHp:20};
   const front=new Unit(ALL_UNITS.rattata);
   const sim=makeBattle(Simulator,mode==='first'?[source,front]:[front,source],[new Unit(ALL_UNITS.rattata)]);
   const actor=sim.playerTeam[mode==='first'?0:1];
   if(mode==='silenced')sim.unitStates.set(actor,{...sim.unitStates.get(actor),isSilenced:true});
   const before=sim.playerTeam.map(unit=>({...unit.stats}));
   await sim.executeUnitStartOfBattleAbility(actor);
   assert.deepEqual(sim.playerTeam.map(unit=>unit.stats),before);
  });
 }
 for(const family of ['plusle','minun'])await check('1',`${family} enemy snapshot includes difficulty scaling`,async()=>{
  const source=new Unit(ALL_UNITS[family]);source.stats={attack:20,hp:20,maxHp:20};
  const front=new Unit(ALL_UNITS.rattata);front.stats={attack:5,hp:5,maxHp:5};
  const sim=new BattleSimulator([new Unit(ALL_UNITS.rattata)],[front,source],[],2);
  sim.delay=sim.playAnimation=sim.notifySkill=async()=>{};
  sim.enemyTeam[1].stats={attack:49,hp:49,maxHp:49};
  await sim.executeUnitStartOfBattleAbility(sim.enemyTeam[1]);
  assert.equal(sim.enemyTeam[0].stats[family==='plusle'?'attack':'maxHp'],20);
 });
 await check('2','Prepare opponent teams before displaying their preview',()=>{
  assert.equal(typeof enemyModule.prepareOpponentTeams,'function');
  const def={id:'test',name:'測試對手',coreUnits:['charmander','pichu','aron','togepi','happiny']};
  const edition=Object.fromEntries(['noviceOpponents','intermOpponents','advancedOpponents','eliteOpponents','championOpponents'].map(k=>[k,[def]]));
  edition.availableUnitIds=Object.keys(ALL_UNITS);
  const context={game:{turn:12,wins:12,difficultyScore:12,shop:{getTier:()=>4}},activeEdition:edition,difficulty:'MASTER',tutorialStep:0};
  const teams=enemyModule.prepareOpponentTeams(context,[def,def]);
  assert.equal(teams.size,1,'Duplicate tutorial choices share the same opponent lineup');
  const team=teams.get(def.id);assert.equal(team.length,5);
  const ids=team.map(u=>u?.templateId);
  assert.ok(ids.includes('charizard'));assert.ok(ids.includes('raichu'));assert.ok(ids.includes('aggron'));
  assert.equal(teams.get(def.id),team,'Choosing an opponent reuses the previewed lineup');
 });
 for(const editionName of ['classic','modern','infinite']) {
  const exportName=`${editionName[0].toUpperCase()}${editionName.slice(1)}Edition`;
  const {[exportName]:edition}=await server.ssrLoadModule(`/src/data/editions/${editionName}/index.ts`);
  const ashDefinitions=[...edition.noviceOpponents,...edition.intermOpponents,...edition.advancedOpponents,...edition.eliteOpponents,...edition.championOpponents].filter(def=>def.name==='小智'&&def.coreUnits.some(id=>ALL_UNITS[id]?.family==='pichu'));
  for(const def of ashDefinitions)for(const [turn,wins,difficulty] of [[1,0,'NORMAL'],[7,4,'NORMAL'],[12,12,'MASTER']]) {
   await check('3',`${editionName}/${def.id}/${turn}/${difficulty} Ash Pikachu`,()=>{
    const context={game:{turn,wins,difficultyScore:turn,shop:{getTier:()=>4}},activeEdition:edition,difficulty,tutorialStep:0,opponent:def};
    const team=enemyModule.createEnemyTeam(context);
    const electric=team.filter(u=>u?.family==='pichu');
    const core=def.coreUnits.filter(id=>edition.availableUnitIds.includes(id)).slice(0,turn<=1?3:5);
    if(core.some(id=>ALL_UNITS[id]?.family==='pichu'))assert.ok(electric.length);
    for(const unit of electric){assert.equal(unit.templateId,'pikachu');assert.equal(unit.name,'皮卡丘');assert.equal(unit.evolveId,undefined);}
    for(const Simulator of [BattleSimulator,HeadlessBattleSimulator]) {
     const sim=makeBattle(Simulator,[new Unit(ALL_UNITS.rattata)],team);
     sim.enemyTeam.filter(u=>u?.family==='pichu').forEach(unit=>assert.equal(unit.evolveId,undefined,'Ash form lock survives battle cloning'));
    }
   });
  }
 }
 await check('3','Player Pikachu still evolves into Raichu',()=>{
  assert.equal(ALL_UNITS.pikachu.evolveId,'raichu');
  const game=new GameLoop();const unit=new Unit(ALL_UNITS.pikachu);unit.level=2;unit.exp=8;
  game.playerTeam=[unit,null,null,null,null];game.handleUnitExpGain(unit,1);
  assert.equal(unit.templateId,'raichu');assert.equal(unit.level,3);
 });
 for(const name of ['小智','其他訓練家'])for(const fallback of [false,true])await check('3',`${name} fallback=${fallback}`,()=>{
  const def={id:'test',name,coreUnits:['pichu']};
  const edition=Object.fromEntries(['noviceOpponents','intermOpponents','advancedOpponents','eliteOpponents','championOpponents'].map(k=>[k,[def]]));edition.availableUnitIds=Object.keys(ALL_UNITS);
  const context={game:{turn:12,wins:12,difficultyScore:12,shop:{getTier:()=>4}},activeEdition:edition,difficulty:'MASTER',tutorialStep:0,opponent:fallback?null:def};
  const team=enemyModule.createEnemyTeam(context);
  const electric=team.filter(unit=>unit?.family==='pichu');assert.ok(electric.length);
  electric.forEach(unit=>{assert.equal(unit.templateId,name==='小智'?'pikachu':'raichu');assert.equal(unit.level,3);});
  assert.equal(ALL_UNITS.pikachu.evolveId,'raichu');
 });
 if(failures.length)throw new Error(`${failures.length} failures:\n${failures.join('\n')}`);
 assert.ok(passed>0);console.log(`PASS: ${passed} opening-stat/opponent-preview/Ash-form cases${selected?` (group ${selected})`:''}.`);
}finally{await server.close();}
