import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const opponentFiles = readdirSync(join(root, 'src', 'data', 'opponents'))
  .filter((file) => file.endsWith('.ts'));

for (const file of opponentFiles) {
  const content = readFileSync(join(root, 'src', 'data', 'opponents', file), 'utf8');
  for (const match of content.matchAll(/url:\s*'([^']+)'/g)) {
    assert(existsSync(join(root, 'public', match[1])), `Missing opponent asset: ${match[1]}`);
  }
}

const server = await createServer({ root, appType: 'custom', server: { middlewareMode: true } });

try {
  globalThis.window = {};

  const { ALL_UNITS } = await server.ssrLoadModule('/src/data/AllUnits.ts');
  const { Unit } = await server.ssrLoadModule('/src/models/Unit.ts');
  const { GameLoop, GamePhase } = await server.ssrLoadModule('/src/engine/GameLoop.ts');
  const { HeadlessBattleSimulator } = await server.ssrLoadModule('/src/engine/HeadlessBattleSimulator.ts');
  const { ClassicEdition } = await server.ssrLoadModule('/src/data/editions/classic/index.ts');
  const { ModernEdition } = await server.ssrLoadModule('/src/data/editions/modern/index.ts');
  const { InfiniteEdition } = await server.ssrLoadModule('/src/data/editions/infinite/index.ts');

  const templates = Object.values(ALL_UNITS);
  const playable = templates.filter((template) => !template.isHiddenFromShop);
  const invalidStats = templates.filter(({ baseStats }) => !baseStats || !Number.isFinite(baseStats.hp) || !Number.isFinite(baseStats.maxHp) || !Number.isFinite(baseStats.attack));
  assert(invalidStats.length === 0, `Units with invalid base stats: ${invalidStats.map((unit) => unit.id).join(', ')}`);

  let shopFlows = 0;
  for (const edition of [ClassicEdition, ModernEdition, InfiniteEdition]) {
    for (let round = 0; round < 20; round += 1) {
      const game = new GameLoop(edition);
      game.setDifficulty('NORMAL');
      if (edition.id === 'infinite') game.initInfinitePool();
      game.startShopPhase();

      while (game.phase === GamePhase.POOL_SELECTION) {
        assert(game.poolChoices.length > 0, 'Infinite mode displayed an empty pool selection');
        game.applyPoolChoice(game.poolChoices[0]);
      }

      assert(game.phase === GamePhase.SHOP, `${edition.id} did not enter the shop phase`);
      assert(game.shop.slots.some(Boolean), `${edition.id} generated an empty first shop`);
      game.startBattlePhase();
      assert(game.phase === GamePhase.BATTLE && game.playerTeam.length === 5, `${edition.id} did not normalize the board before battle`);
      shopFlows += 1;
    }
  }

  let nonTerminatingBattles = 0;
  for (let run = 0; run < 100; run += 1) {
    const pickTeam = () => Array.from({ length: 5 }, () => new Unit(playable[Math.floor(Math.random() * playable.length)]));
    const battle = new HeadlessBattleSimulator(pickTeam(), pickTeam());
    await battle.init();

    let active = true;
    let steps = 0;
    while (active && steps < 200) {
      active = await battle.simulateStep();
      steps += 1;
    }
    if (battle.getResult() === null) nonTerminatingBattles += 1;
  }

  assert(nonTerminatingBattles === 0, `${nonTerminatingBattles} battles exceeded 200 steps`);
  console.log(`Smoke test passed: ${templates.length} units, ${shopFlows} shop flows, 100 battles, ${opponentFiles.length} opponent data files.`);
} finally {
  await server.close();
}
