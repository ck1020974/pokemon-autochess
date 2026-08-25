import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const server = await createServer({ root, appType: 'custom', server: { middlewareMode: true } });

try {
  globalThis.window = {};

  const { ALL_UNITS } = await server.ssrLoadModule('/src/data/AllUnits.ts');
  const { Unit } = await server.ssrLoadModule('/src/models/Unit.ts');
  const { BattleSimulator } = await server.ssrLoadModule('/src/engine/BattleSimulator.ts');

  const verifyFamilyBuff = async ({ sourceId, allyId, stat, expected }) => {
    const source = new Unit(ALL_UNITS[sourceId]);
    const ally = new Unit(ALL_UNITS[allyId]);
    const enemy = new Unit(ALL_UNITS.rattata);
    const originals = [source, ally];
    const battle = new BattleSimulator([source, ally], [enemy], originals);
    battle.playAnimation = async () => {};
    battle.notifySkill = async () => {};
    const battleKiller = battle.playerTeam[1];
    assert.ok(battleKiller, 'The player ally must be present in the battle team');

    await battle.eventBus.emit({
      type: 'AFTER_DEATH',
      source: enemy,
      context: { killer: battleKiller, simulator: battle },
    });

    assert.equal(originals[0].stats[stat], expected.source, `${sourceId} should permanently buff itself`);
    assert.equal(originals[1].stats[stat], expected.ally, `${sourceId} should permanently buff its living ally`);
  };

  await verifyFamilyBuff({
    sourceId: 'bagon',
    allyId: 'rattata',
    stat: 'attack',
    expected: { source: 9, ally: 2 },
  });
  await verifyFamilyBuff({
    sourceId: 'slakoth',
    allyId: 'rattata',
    stat: 'maxHp',
    expected: { source: 9, ally: 2 },
  });

  console.log('Permanent family buffs verified.');
} finally {
  await server.close();
}
