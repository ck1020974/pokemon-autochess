import assert from 'node:assert/strict';
import {createServer} from 'vite';

const server = await createServer({appType: 'custom', server: {middlewareMode: true}});
let checks = 0;
const failures = [];
const check = async (name, run) => {
  try { await run(); checks++; } catch (error) { failures.push(`${name}: ${error.message}`); }
};
try {
  globalThis.window = {};
  const {ALL_UNITS} = await server.ssrLoadModule('/src/data/AllUnits.ts');
  const {Unit} = await server.ssrLoadModule('/src/models/Unit.ts');
  const {createEnemyTeam} = await server.ssrLoadModule('/src/engine/createEnemyTeam.ts');
  const def = {id: 'test', coreUnits: ['shinx', 'aron', 'togepi', 'happiny', 'charmander']};
  const edition = Object.fromEntries(['noviceOpponents', 'intermOpponents', 'advancedOpponents', 'eliteOpponents', 'championOpponents'].map(k => [k, [def]]));
  edition.availableUnitIds = def.coreUnits;
  for (const [turn, wins, difficulty, opponent] of [[4,0,'NORMAL',def], [5,0,'NORMAL',def], [8,0,'NORMAL',null], [12,11,'NORMAL',def], [12,11,'MASTER',null]]) {
    await check(`enemy ${turn}/${wins}/${difficulty}/${!!opponent}`, () => {
      const game = {turn, wins, difficultyScore: turn, shop: {getTier: () => 5}};
      const team = createEnemyTeam({game, activeEdition: edition, difficulty, tutorialStep: 0, opponent});
      for (const unit of team.filter(Boolean)) {
        let expected = ALL_UNITS[unit.family];
        for (let i = 1; i < unit.level && expected.evolveId; i++) expected = ALL_UNITS[expected.evolveId];
        assert.equal(unit.templateId, expected.id);
        assert.equal(unit.name, expected.name);
        assert.equal(unit.imageUrl, expected.battleImageUrl || expected.imageUrl);
        assert.deepEqual(unit.synergies, expected.synergies);
        assert.equal(unit.description, new Unit(expected).description);
      }
    });
  }
  for (const moduleName of ['BattleSimulator', 'HeadlessBattleSimulator']) {
    const {[moduleName]: Simulator} = await server.ssrLoadModule(`/src/engine/${moduleName}.ts`);
    const makeBattle = (source, allies = []) => {
      const enemy = new Unit(ALL_UNITS.rattata);
      enemy.stats = {hp: 50, maxHp: 50, attack: 1};
      const originals = [source, ...allies];
      const sim = new Simulator(originals, [enemy], originals);
      sim.delay = sim.playAnimation = sim.notifySkill = async () => {};
      return {sim, originals};
    };
    for (const ids of [['shinx','luxio','luxray'], ['aron','lairon','aggron']]) {
      for (const [index, id] of ids.entries()) await check(`${moduleName} ${id} start growth`, async () => {
        const source = new Unit(ALL_UNITS[id]); source.level = index + 1;
        const {sim, originals} = makeBattle(source);
        const stat = source.family === 'shinx' ? 'attack' : 'maxHp';
        const before = source.stats[stat];
        await sim.executeUnitStartOfBattleAbility(sim.playerTeam[0]);
        assert.equal(sim.playerTeam[0].stats[stat] - before, [3,4,5][index]);
        assert.equal(originals[0].stats[stat] - before, [3,4,5][index]);
      });
    }
    for (const ids of [['togepi','togetic','togekiss'], ['happiny','chansey','blissey']]) {
      for (const [index, id] of ids.entries()) await check(`${moduleName} ${id} rear growth`, async () => {
        const source = new Unit(ALL_UNITS[id]); source.level = index + 1;
        const ally = new Unit(ALL_UNITS.rattata);
        const {sim, originals} = makeBattle(source, [ally]);
        const stat = source.family === 'togepi' ? 'attack' : 'maxHp';
        const before = originals.map(u => u.stats[stat]);
        await sim.eventBus.emit({type: 'AFTER_ATTACK', source: sim.playerTeam[0], context: {simulator: sim}});
        originals.forEach((u, i) => assert.equal(u.stats[stat] - before[i], [2,3,5][index]));
        sim.playerTeam.forEach((u, i) => assert.equal(u.stats[stat] - before[i], [2,3,5][index]));
      });
    }
    for (const random of [0, 0.999999]) await check(`${moduleName} raikou endpoint ${random}`, async () => {
      const {sim} = makeBattle(new Unit(ALL_UNITS.raikou));
      const saved = Math.random;
      try {
        Math.random = () => random;
        await sim.executeUnitStartOfBattleAbility(sim.playerTeam[0]);
      } finally { Math.random = saved; }
      assert.equal(50 - sim.enemyTeam[0].stats.hp, random === 0 ? 10 : 15);
    });
  }
  for (const id of ['luxray','aggron']) await check(`${id} caps`, () => {
    const unit = new Unit(ALL_UNITS[id]);
    unit.addGrowth(100, 100);
    assert.deepEqual(unit.stats, {hp:60, maxHp:60, attack:60});
  });
  assert.deepEqual(failures, [], `${failures.length} failures:\n${failures.join('\n')}`);
  console.log(`PASS: ${checks} enemy evolution, real/headless skill and cap cases.`);
} finally { await server.close(); }
