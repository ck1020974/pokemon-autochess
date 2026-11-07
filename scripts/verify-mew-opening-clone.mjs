import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true } });
try {
  globalThis.document = { getElementById: () => null };
  globalThis.requestAnimationFrame = cb => { cb(); return 0; };
  const { Unit } = await server.ssrLoadModule('/src/models/Unit.ts');
  const { ALL_UNITS } = await server.ssrLoadModule('/src/data/AllUnits.ts');
  const { BattleSimulator } = await server.ssrLoadModule('/src/engine/BattleSimulator.ts');
  const { HeadlessBattleSimulator } = await server.ssrLoadModule('/src/engine/HeadlessBattleSimulator.ts');
  const failures = [];
  let passed = 0;
  for (const Simulator of [BattleSimulator, HeadlessBattleSimulator]) {
    for (const side of ['player', 'enemy']) for (const level of [1, 2, 3]) for (const silenced of [false, true]) {
      const label = `${Simulator.name}/${side}/level-${level}/silenced-${silenced}`;
      try {
        const mew = new Unit(ALL_UNITS.mew);
        mew.level = level;
        mew.stats = { hp: 11, maxHp: 17, attack: 13 };
        mew.synergies = ['Water', 'Ghost', 'Normal'];
        const roster = [null, null, mew, null, null];
        const opponent = [new Unit(ALL_UNITS.rattata), null, null, null, null];
        const sim = new Simulator(side === 'player' ? roster : opponent, side === 'enemy' ? roster : opponent, undefined, 1.5);
        sim.delay = async () => {};
        sim.playAnimation = async () => {};
        const teamKey = `${side}Team`;
        const otherKey = side === 'player' ? 'enemyTeam' : 'playerTeam';
        const source = sim[teamKey][2];
        const expected = Simulator === BattleSimulator && side === 'enemy'
          ? { hp: 25, maxHp: 25, attack: 19 } : { hp: 17, maxHp: 17, attack: 13 };
        // Represents opening buffs and later debuffs; snapshot must survive both.
        source.stats.maxHp += 9;
        source.stats.attack = 2;
        source.stats.hp = 0;
        sim.unitStates.set(source, { isSilenced: silenced });
        await sim.handleDeath(source);
        const clones = sim[teamKey].filter(u => u?.templateId === 'mew_clone');
        assert.equal(clones.length, silenced ? 0 : 1, `${label}: clone count`);
        assert.equal(sim[otherKey].filter(u => u?.templateId === 'mew_clone').length, 0, `${label}: ownership`);
        assert.equal(sim[teamKey].length, 5, `${label}: five slots`);
        if (!silenced) {
          const clone = clones[0];
          assert.deepEqual(clone.stats, expected, `${label}: opening full HP/attack`);
          assert.equal(clone.level, level, `${label}: stars`);
          assert.deepEqual(clone.synergies, source.synergies, `${label}: dynamic synergies`);
          assert.notEqual(clone.synergies, source.synergies, `${label}: independent synergy array`);
          const participants = sim[side === 'player' ? 'participantPlayerUnits' : 'participantEnemyUnits'];
          assert.ok(participants.has(clone), `${label}: participant ownership`);
          clone.stats.hp = 0;
          await sim.handleDeath(clone);
          assert.equal(sim[teamKey].filter(u => u?.templateId === 'mew_clone').length, 0, `${label}: no recursive clone`);
        }
        passed++;
      } catch (error) { failures.push(`${label}: ${error.message}`); }
    }
  }
  for (const Simulator of [BattleSimulator, HeadlessBattleSimulator]) for (const side of ['player', 'enemy']) {
    const label = Simulator.name + '/' + side + '/inherited-Water';
    try {
      const mew = new Unit(ALL_UNITS.mew);
      mew.synergies = ['Water'];
      const roster = [mew, new Unit(ALL_UNITS.squirtle), null, null, null];
      const opponent = [new Unit(ALL_UNITS.rattata), null, null, null, null];
      const sim = new Simulator(side === 'player' ? roster : opponent, side === 'enemy' ? roster : opponent);
      sim.delay = async () => {};
      sim.playAnimation = async () => {};
      const teamKey = side + 'Team';
      const otherKey = side === 'player' ? 'enemyTeam' : 'playerTeam';
      const source = sim[teamKey][0]; source.stats.hp = 0;
      await sim.handleDeath(source);
      const clone = sim[teamKey].find(u => u?.templateId === 'mew_clone');
      const target = sim[otherKey][0]; target.stats.attack = 10;
      await sim.eventBus.emit({ type: 'BEFORE_ATTACK', source: clone, target, context: {} });
      assert.equal(target.stats.attack, 9, label + ': registered Water effect uses owning side');
      assert.equal(sim.getSynergyCountForUnit(clone, 'Water'), 2, label + ': owner synergy count');
      passed++;
    } catch (error) { failures.push(label + ': ' + error.message); }
  }
  for (const Simulator of [BattleSimulator, HeadlessBattleSimulator]) for (const side of ['player', 'enemy']) {
    const label = Simulator.name + '/' + side + '/Gulpin-return';
    try {
      const mew = new Unit(ALL_UNITS.mew); mew.level = 2;
      mew.stats = { hp: 17, maxHp: 17, attack: 13 }; mew.synergies = ['Water', 'Ghost'];
      const roster = [mew, new Unit(ALL_UNITS.gulpin), new Unit(ALL_UNITS.squirtle), null, null];
      const opponent = [new Unit(ALL_UNITS.rattata), null, null, null, null];
      const sim = new Simulator(side === 'player' ? roster : opponent, side === 'enemy' ? roster : opponent);
      sim.delay = async () => {}; sim.playAnimation = async () => {};
      const teamKey = side + 'Team';
      const source = sim[teamKey][0]; const gulpin = sim[teamKey][1];
      source.stats = { hp: 8, maxHp: 22, attack: 3 };
      await sim.executeUnitStartOfBattleAbility(gulpin);
      gulpin.stats.hp = 0; await sim.handleDeath(gulpin);
      const returned = sim[teamKey].find(u => u?.templateId === 'mew');
      assert.ok(returned, label + ': real swallow returns Mew');
      assert.deepEqual(returned.stats, { hp: 8, maxHp: 8, attack: 3 }, label + ': ordinary return stats unchanged');
      assert.deepEqual(returned.synergies, ['Water', 'Ghost'], label + ': returned dynamic synergies');
      const existingClones = new Set(sim[teamKey].filter(u => u?.templateId === 'mew_clone'));
      returned.stats.hp = 0; await sim.handleDeath(returned);
      const clone = sim[teamKey].find(u => u?.templateId === 'mew_clone' && !existingClones.has(u));
      assert.ok(clone, label + ': returned Mew summons clone');
      assert.deepEqual(clone.stats, { hp: 17, maxHp: 17, attack: 13 }, label + ': original opening snapshot survives identities');
      assert.equal(clone.level, 2, label + ': returned stars');
      const target = sim[side === 'player' ? 'enemyTeam' : 'playerTeam'][0];
      target.stats.attack = 10;
      await sim.eventBus.emit({ type: 'BEFORE_ATTACK', source: clone, target, context: {} });
      assert.equal(target.stats.attack, 9, label + ': returned clone inherited Water behavior');
      clone.stats.hp = 0; await sim.handleDeath(clone);
      assert.equal(sim[teamKey].filter(u => u?.templateId === 'mew_clone' && !existingClones.has(u)).length, 0, label + ': no recursive clone');
      passed++;
    } catch (error) { failures.push(label + ': ' + error.message); }
  }
  for (const failure of failures) console.error(failure);
  assert.equal(failures.length, 0, `${failures.length} Mew cases failed; ${passed} passed`);
  console.log(`Mew opening clone verified: ${passed} cases (both engines/sides, stars 1–3, silence, changed stats, dynamic synergies, clone death, enemy scaling).`);
} finally { await server.close(); }
