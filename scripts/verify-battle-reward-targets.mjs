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
  const { GameLoop } = await server.ssrLoadModule('/src/engine/GameLoop.ts');
  const { REWARD_DATA } = await server.ssrLoadModule('/src/models/RewardData.ts');

  const battleWith = async (units, rewards) => {
    const enemy = new Unit(ALL_UNITS.rattata);
    const battle = new BattleSimulator(units, [enemy], units, 1, 1, 2, 2, false, rewards);
    battle.executeUnitStartOfBattleAbility = async () => {};
    battle.applyBattleStartSynergies = async () => {};
    await battle.init();
    return battle;
  };

  // Synergy rewards at EASY/NORMAL only reach units carrying that synergy.
  const synergyReward = REWARD_DATA.find(r => r.difficulty === 'EASY' && r.synergyId === 'Ghost' && r.effect.includes('攻擊'));
  assert.ok(synergyReward, 'An EASY Ghost attack reward must exist');
  const ghost = new Unit(ALL_UNITS.gastly);
  const other = new Unit(ALL_UNITS.bulbasaur);
  const baseGhostAtk = ghost.stats.attack;
  const baseOtherAtk = other.stats.attack;
  const synergyBattle = await battleWith([ghost, other], [synergyReward]);
  assert.equal(synergyBattle.playerTeam[0].stats.attack, baseGhostAtk + 3, 'Matching synergy unit gains the reward');
  assert.equal(synergyBattle.playerTeam[1].stats.attack, baseOtherAtk, 'Other units must not gain a synergy reward');

  // Team-wide rewards keep reaching everyone.
  const teamReward = REWARD_DATA.find(r => r.category === 'BATTLE_NONE' && r.effect.includes('全體角色+1攻擊'));
  const teamA = new Unit(ALL_UNITS.gastly);
  const teamB = new Unit(ALL_UNITS.bulbasaur);
  const atkA = teamA.stats.attack;
  const atkB = teamB.stats.attack;
  const teamBattle = await battleWith([teamA, teamB], [teamReward]);
  assert.equal(teamBattle.playerTeam[0].stats.attack, atkA + 1);
  assert.equal(teamBattle.playerTeam[1].stats.attack, atkB + 1);

  // "+N攻擊與生命" grants both stats.
  for (const [item, amount] of [['活力碎片', 2], ['活力塊', 3]]) {
    const reward = REWARD_DATA.find(r => r.item === item);
    const unit = new Unit(ALL_UNITS.bulbasaur);
    const { attack, maxHp } = unit.stats;
    const battle = await battleWith([unit], [reward]);
    assert.equal(battle.playerTeam[0].stats.attack, attack + amount, `${item} attack`);
    assert.equal(battle.playerTeam[0].stats.maxHp, maxHp + amount, `${item} HP`);
  }

  // Buying a cap provider into an empty slot updates the team at once.
  for (const useTarget of [false, true]) {
    const game = new GameLoop();
    game.gold = 10;
    const ally = new Unit(ALL_UNITS.bulbasaur);
    game.playerTeam[0] = ally;
    game.shop.slots[0] = new Unit(ALL_UNITS.darkrai);
    assert.notEqual(game.buyUnit(0, useTarget ? 1 : undefined), null, 'Purchase must succeed');
    assert.equal(ally.attackCap, ALL_UNITS.darkrai.providedAttackCap, 'Ally attack cap must follow the provider');
  }

  // Mew's infinite pool card shows this run's synergies.
  const mewGame = new GameLoop();
  mewGame.edition = { ...mewGame.edition, availableUnitIds: ['mew'] };
  mewGame.generatePoolChoices(5);
  assert.deepEqual(mewGame.poolChoices[0].synergies, mewGame.mewSynergies);

  // Merging a stronger shop copy keeps the team's battle art.
  const artGame = new GameLoop();
  artGame.gold = 10;
  const weak = new Unit(ALL_UNITS.bulbasaur);
  weak.imageUrl = weak.battleImageUrl;
  weak.stats = { hp: 1, maxHp: 1, attack: 1 };
  artGame.playerTeam[0] = weak;
  artGame.shop.slots[0] = new Unit(ALL_UNITS.bulbasaur);
  artGame.buyUnit(0, 0);
  assert.equal(artGame.playerTeam[0].imageUrl, ALL_UNITS.bulbasaur.battleImageUrl);

  // Each difficulty offers one speed-boosting 爽朗薄荷.
  const jolly = REWARD_DATA.filter(r => r.item === '爽朗薄荷');
  assert.deepEqual(jolly.map(r => r.difficulty).sort(), ['EASY', 'NORMAL']);
  assert.ok(jolly.every(r => r.effect.startsWith('速度')), '爽朗薄荷 must be the speed version');

  // Copy matches what each reward does.
  assert.ok(!REWARD_DATA.some(r => /傷藥|全滿藥/.test(r.item) && r.effect.includes('招式點數')));
  assert.ok(!REWARD_DATA.some(r => r.effect.startsWith('過擊退')));

  console.log('Battle reward targets, caps and reward copy verified.');
} finally {
  await server.close();
}
