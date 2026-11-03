import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), appType: 'custom', server: { middlewareMode: true } });
let failed = 0;
try {
  globalThis.window = {};
  const { Unit } = await server.ssrLoadModule('/src/models/Unit.ts');
  const { ALL_UNITS } = await server.ssrLoadModule('/src/data/AllUnits.ts');
  const { GameLoop } = await server.ssrLoadModule('/src/engine/GameLoop.ts');
  const { BattleSimulator } = await server.ssrLoadModule('/src/engine/BattleSimulator.ts');
  const { HeadlessBattleSimulator } = await server.ssrLoadModule('/src/engine/HeadlessBattleSimulator.ts');
  const make = (id, synergy = [], attack = 10, hp = 50) => {
    const template = { id, name: id, family: id, tier: 1, baseStats: { attack, hp, maxHp: hp }, imageUrl: '', description: '', synergies: synergy };
    ALL_UNITS[id] = template;
    return new Unit(template);
  };
  const test = async (name, run) => {
    try { await run(); console.log(`PASS ${name}`); }
    catch (error) { failed++; console.error(`FAIL ${name}: ${error.message}`); }
  };

  for (const count of [0, 1, 2, 3, 4, 5, 6]) {
    await test(`Psychic ${count}: active tiers grow by one, five or more by two`, () => {
      const game = new GameLoop();
      game.playerTeam = Array.from({ length: count }, (_, i) => make(`psychic-${i}`, ['Psychic']));
      for (let turn = 1; turn <= 4; turn++) {
        game.turn = turn;
        game.processRoundScaling();
        assert.equal(game.psychicN, 2 + (count >= 5 ? turn * 2 : count >= 2 ? turn : 0));
      }
      game.playerTeam = [];
      game.processRoundScaling();
      assert.equal(game.psychicN, 2 + (count >= 5 ? 8 : count >= 2 ? 4 : 0), 'Removing Psychic preserves accumulated power');
    });
  }

  for (const Simulator of [BattleSimulator, HeadlessBattleSimulator]) {
    const build = (players, enemies, originals = players) => {
      const sim = Simulator === BattleSimulator
        ? new Simulator(players, enemies, originals, 1, 1, 7, 4)
        : new Simulator(players, enemies, originals, 3, 7, 4);
      sim.delay = async () => {};
      sim.notifySkill = async () => {};
      sim.playAnimation = async () => {};
      return sim;
    };
    for (const available of [1, 4, 5]) {
    for (const count of [1, 2, 3, 4, 5]) {
      for (const side of ['player', 'enemy']) {
        await test(`${Simulator.name}: ${side} Psychic ${count}, ${available} living targets, timing and once-only`, async () => {
          const players = Array.from({ length: 5 }, (_, i) => make(`p${i}`));
          const enemies = Array.from({ length: 5 }, (_, i) => make(`e${i}`));
          const sim = build(players, enemies);
          sim.playerSynergies.clear();
          sim.enemySynergies.clear();
          (side === 'player' ? sim.playerSynergies : sim.enemySynergies).set('Psychic', count);
          for (let i = available; i < 5; i++) {
            sim.enemyTeam[i].stats.hp = 0;
            sim.playerTeam[i].stats.hp = 0;
          }
          const hits = [];
          sim.dealDamage = async (source, target, amount) => { if (!source) hits.push({ target, amount }); };
          for (const turn of [1, 2]) {
            sim.turnCount = turn;
            await sim.performAttack(sim.playerTeam[0], sim.enemyTeam[0]);
            await sim.performAttack(sim.enemyTeam[0], sim.playerTeam[0]);
          }
          assert.equal(hits.length, 0, 'No Psychic before third combat round');
          sim.turnCount = 3;
          await sim.performAttack(sim.playerTeam[0], sim.enemyTeam[0]);
          await sim.performAttack(sim.enemyTeam[0], sim.playerTeam[0]);
          const expected = count < 2 ? 0 : Math.min(count >= 5 ? 5 : count >= 3 ? 3 : 2, available);
          assert.equal(hits.length, expected);
          assert.equal(new Set(hits.map(hit => hit.target)).size, expected);
          assert.ok(hits.every(hit => hit.amount === (side === 'player' ? 7 : 4) && hit.target.stats.hp > 0));
          assert.ok(hits.every(hit => (side === 'player' ? sim.enemyTeam : sim.playerTeam).includes(hit.target)));
          sim.turnCount = 4;
          await sim.performAttack(sim.playerTeam[0], sim.enemyTeam[0]);
          assert.equal(hits.length, expected, 'Only one activation per battle');
        });
      }
    }
    }
    for (const count of [2, 4, 5]) {
      for (const stat of ['attack', 'hp']) {
      await test(`${Simulator.name}: Thief ${count} steals ${stat} per unit, permanently, from strongest total stats`, async () => {
        const originals = [make('thief-a', ['Thief'], 10, 10), make('thief-b', ['Thief'], 10, 10)];
        const sim = build(originals, [make('strong', [], 20, 50), make('high-attack', [], 30, 10)]);
        sim.playerSynergies.set('Thief', count);
        const previousRandom = Math.random;
        try {
          Math.random = () => stat === 'hp' ? 0.25 : 0.75;
          for (const unit of sim.playerTeam) await sim.executeUnitStartOfBattleAbility(unit);
        } finally { Math.random = previousRandom; }
        const amount = count >= 5 ? 5 : 2;
        assert.equal(sim.enemyTeam[0].stats.attack, stat === 'attack' ? 20 - amount * 2 : 20);
        assert.equal(sim.enemyTeam[0].stats.hp, stat === 'hp' ? 50 - amount * 2 : 50);
        assert.equal(sim.enemyTeam[0].stats.maxHp, stat === 'hp' ? 50 - amount * 2 : 50);
        assert.equal(sim.enemyTeam[1].stats.attack, 30);
        for (const team of [sim.playerTeam, originals]) {
          assert.deepEqual(team.map(u => u.stats.attack), [10, 10].map(value => value + (stat === 'attack' ? amount : 0)));
          assert.deepEqual(team.map(u => u.stats.hp), [10, 10].map(value => value + (stat === 'hp' ? amount : 0)));
          assert.deepEqual(team.map(u => u.stats.maxHp), [10, 10].map(value => value + (stat === 'hp' ? amount : 0)));
        }
      });
      }
    }
    for (const stat of ['attack', 'hp']) {
    await test(`${Simulator.name}: Thief leaves one ${stat} and transfers only available amount`, async () => {
      const originals = [make('thief-a', ['Thief'], 10, 10), make('thief-b', ['Thief'], 10, 10)];
      const sim = build(originals, [make('poor', [], 3, 3)]);
      sim.playerSynergies.set('Thief', 5);
      const previousRandom = Math.random;
      try {
        Math.random = () => stat === 'hp' ? 0.25 : 0.75;
        for (const unit of sim.playerTeam) await sim.executeUnitStartOfBattleAbility(unit);
      } finally { Math.random = previousRandom; }
      assert.equal(sim.enemyTeam[0].stats[stat], 1);
      assert.deepEqual(originals.map(u => u.stats[stat]), [12, 10]);
    });
    }
    for (const stat of ['attack', 'hp']) {
      await test(`${Simulator.name}: enemy Thief transfers ${stat} without permanently debuffing player`, async () => {
        const originals = [make('victim', [], 20, 40)];
        const sim = build(originals, [make('enemy-thief-a', ['Thief'], 10, 10), make('enemy-thief-b', ['Thief'], 10, 10)]);
        sim.enemySynergies.set('Thief', 5);
        const previousRandom = Math.random;
        try {
          Math.random = () => stat === 'hp' ? 0.25 : 0.75;
          for (const unit of sim.enemyTeam) await sim.executeUnitStartOfBattleAbility(unit);
        } finally { Math.random = previousRandom; }
        assert.equal(sim.playerTeam[0].stats[stat], stat === 'hp' ? 30 : 10);
        assert.deepEqual(sim.enemyTeam.map(unit => unit.stats[stat]), [15, 15]);
        assert.equal(originals[0].stats.attack, 20);
        assert.equal(originals[0].stats.hp, 40);
      });
    }
    await test(`${Simulator.name}: attack immunity cannot create a stolen buff`, async () => {
      const original = make('immune-thief', ['Thief']);
      const immune = make('sneasel', [], 20, 50);
      const sim = build([original], [immune]);
      sim.playerSynergies.set('Thief', 5);
      const previousRandom = Math.random;
      try {
        Math.random = () => 0.75;
        await sim.executeUnitStartOfBattleAbility(sim.playerTeam[0]);
      } finally { Math.random = previousRandom; }
      assert.equal(sim.enemyTeam[0].stats.attack, 20);
      assert.equal(original.stats.attack, 10);
    });
  }
} finally {
  await server.close();
}
if (failed) process.exitCode = 1;
