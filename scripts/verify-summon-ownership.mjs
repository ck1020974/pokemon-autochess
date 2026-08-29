import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const server = await createServer({ root, appType: 'custom', server: { middlewareMode: true } });

try {
  globalThis.document = { getElementById: () => null };
  globalThis.requestAnimationFrame = (callback) => {
    callback();
    return 0;
  };

  const { ALL_UNITS } = await server.ssrLoadModule('/src/data/AllUnits.ts');
  const { Unit } = await server.ssrLoadModule('/src/models/Unit.ts');
  const { BattleSimulator } = await server.ssrLoadModule('/src/engine/BattleSimulator.ts');
  const { HeadlessBattleSimulator } = await server.ssrLoadModule('/src/engine/HeadlessBattleSimulator.ts');
  const makeUnit = (templateId) => new Unit(ALL_UNITS[templateId]);

  const cases = [
    { sourceId: 'venusaur', childId: 'ivysaur' },
    { sourceId: 'rattata', childId: 'mouse' },
    { sourceId: 'geodude', childId: 'stone' },
  ];

  for (const [name, Simulator] of Object.entries({ BattleSimulator, HeadlessBattleSimulator })) {
    for (const { sourceId, childId } of cases) {
      const simulator = new Simulator(
        [sourceId, 'gulpin', 'rattata', null, null].map((templateId) => templateId ? makeUnit(templateId) : null),
        ['rattata', null, null, null, null].map((templateId) => templateId ? makeUnit(templateId) : null),
        undefined,
        1,
        1000,
      );
      const gulpin = simulator.playerTeam[1];
      await simulator.executeUnitStartOfBattleAbility(gulpin);
      gulpin.stats.hp = 0;
      await simulator.handleDeath(gulpin);

      const returnedSource = simulator.playerTeam.find((unit) => unit?.templateId === sourceId);
      assert.ok(returnedSource, `${name}: 吞食獸沒有吐回 ${sourceId}`);
      returnedSource.stats.hp = 0;
      await simulator.handleDeath(returnedSource);

      assert.equal(
        simulator.enemyTeam.filter((unit) => unit?.templateId === childId).length,
        0,
        `${name}: 吐回的 ${sourceId} 死亡後把 ${childId} 召喚到敵方`,
      );
      assert.equal(
        simulator.playerTeam.filter((unit) => unit?.templateId === childId).length,
        4,
        `${name}: 吐回的 ${sourceId} 死亡後未把兩批 ${childId} 都留在我方`,
      );
    }
  }

  console.log('Summon ownership verified.');
} finally {
  await server.close();
}
