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

  const player = new Unit(ALL_UNITS.rattata);
  const enemy = new Unit(ALL_UNITS.rattata);
  const reward = {
    difficulty: 'EASY',
    category: 'BATTLE_NONE',
    item: '測試道具',
    effect: '我方全體角色+3攻擊',
    imageUrl: 'item/test.png',
  };
  const battle = new BattleSimulator([player], [enemy], [player], 1, 1, 2, 2, false, [reward]);
  const battlePlayer = battle.playerTeam[0];
  assert.ok(battlePlayer, 'The player unit must exist in the battle team');
  assert.equal(battlePlayer.stats.attack, 1, 'Temporary reward must not apply during battle construction');

  const observedAttacks = [];
  battle.executeUnitStartOfBattleAbility = async () => {
    observedAttacks.push(battlePlayer.stats.attack);
  };
  battle.applyBattleStartSynergies = async () => {
    observedAttacks.push(battlePlayer.stats.attack);
  };

  await battle.init();

  assert.deepEqual(observedAttacks, [1, 1, 1, 1]);
  assert.equal(battlePlayer.stats.attack, 4, 'Temporary reward must apply after battle-start setup');
  console.log('Temporary reward order verified.');
} finally {
  await server.close();
}
