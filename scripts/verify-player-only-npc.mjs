import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'vite';
const server=await createServer({optimizeDeps:{noDiscovery:true,include:[],entries:[]},appType:'custom',server:{middlewareMode:true},plugins:[{name:'test-boss-exports',enforce:'pre',transform(code,id){if(/(?:Classic|Modern|Infinite|Stage|Unit)BalanceSim\.ts$/.test(id))return code.replace('function constructBossTeam(', 'export function constructBossTeam(').replace(/^run\w+\(\);\s*$/m,'');}}]});
const originalRandom=Math.random;
try{
 globalThis.window={};
 const {ALL_UNITS}=await server.ssrLoadModule('/src/data/AllUnits.ts');
 const {createEnemyTeam}=await server.ssrLoadModule('/src/engine/createEnemyTeam.ts');
 const fixture=ALL_UNITS.rattata;const oldFlag=fixture.isPlayerOnly;fixture.isPlayerOnly=true;
 const opponent={id:'fixture',name:'Fixture',coreUnits:['rattata']};
 const edition={availableUnitIds:['rattata','squirtle'],noviceOpponents:[opponent],intermOpponents:[],advancedOpponents:[],eliteOpponents:[],championOpponents:[]};
 const game={turn:1,wins:0,difficultyScore:0,shop:{getTier:()=>5}};
 Math.random=()=>0;
 const clean=team=>{assert.equal(team.length,5);assert.ok(team.filter(Boolean).every(u=>!ALL_UNITS[u.templateId].isPlayerOnly),'NPC contains a player-only template');};
 let cases=0;
 for(const selected of [opponent,null,{id:'missing'}]){clean(createEnemyTeam({game,activeEdition:edition,difficulty:'NORMAL',tutorialStep:0,opponent:selected}));cases++;}
 const blocked={...edition,availableUnitIds:['rattata']};
 for(const selected of [opponent,null]){const team=createEnemyTeam({game,activeEdition:blocked,difficulty:'NORMAL',tutorialStep:0,opponent:selected});clean(team);assert.ok(team.every(u=>u===null));cases++;}
 const empty={...blocked,noviceOpponents:[]};clean(createEnemyTeam({game,activeEdition:empty,difficulty:'NORMAL',tutorialStep:0,opponent:null}));cases++;
 // A permitted core must not evolve into a flagged NPC form.
 const evolution=ALL_UNITS.wartortle;const oldEvolutionFlag=evolution.isPlayerOnly;evolution.isPlayerOnly=true;
 try{const evolvedEdition={...edition,availableUnitIds:['squirtle'],noviceOpponents:[{...opponent,coreUnits:['squirtle']}]};clean(createEnemyTeam({game:{...game,turn:7},activeEdition:evolvedEdition,difficulty:'NORMAL',tutorialStep:0,opponent}));cases++;}finally{evolution.isPlayerOnly=oldEvolutionFlag;}
 for(const name of ['Classic','Modern','Infinite','Stage','Unit']){const {constructBossTeam}=await server.ssrLoadModule(`/src/engine/${name}BalanceSim.ts`);clean(constructBossTeam(opponent,'Novice'));cases++;const source=readFileSync(`src/engine/${name}BalanceSim.ts`,'utf8');assert.ok(!source.slice(source.indexOf('function generatePlayerTeamForStage')).includes('isPlayerOnly'),'Player simulation pool must retain player-only units');}
 fixture.isPlayerOnly=oldFlag;
 console.log(`PASS: ${cases} player-only NPC cases (selected, fallback, empty pools, evolution, five simulation generators).`);
}finally{Math.random=originalRandom;await server.close();}
