import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const server = await createServer({ root, appType: 'custom', server: { middlewareMode: true } });
const originalRandom = Math.random;
const originalLog = console.log;
const failures = [];
let checks = 0;
const check = (name, run) => { try { run(); checks++; } catch (error) { failures.push(`${name}: ${error.message}`); } };
try {
 globalThis.window = {};
 console.log = () => {};
 const { GameLoop, GamePhase } = await server.ssrLoadModule('/src/engine/GameLoop.ts');
 const { ALL_UNITS } = await server.ssrLoadModule('/src/data/AllUnits.ts');
 const { InfiniteEdition } = await server.ssrLoadModule('/src/data/editions/infinite/index.ts');
 const { ClassicEdition } = await server.ssrLoadModule('/src/data/editions/classic/index.ts');
 const { ModernEdition } = await server.ssrLoadModule('/src/data/editions/modern/index.ts');
 const starters = ['bulbasaur','charmander','squirtle','chikorita','cyndaquil','totodile','treecko','torchic','mudkip','sprigatito','fuecoco','quaxly'];
 const eligible = Object.values(ALL_UNITS).filter(u => u.tier === 1 && !u.isHiddenFromShop && InfiniteEdition.availableUnitIds.includes(u.id) && !starters.includes(u.id)).map(u => u.id);
 const make = (edition = InfiniteEdition) => { const game = new GameLoop(edition); if (edition.id === 'infinite') game.initInfinitePool(); return game; };
 const samples = new Set();
 for (let seed = 1; seed <= 40; seed++) check(`opening sample ${seed}`, () => {
  let state = seed;
  Math.random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  const game = make(); game.startShopPhase();
  assert.equal(game.phase, GamePhase.SHOP, 'turn 1 enters SHOP directly');
  assert.deepEqual(game.poolChoices, []);
  assert.deepEqual(game.bannedPoolUnitIds, []);
  assert.deepEqual(game.activePoolUnitIds.slice(0, 12), starters);
  const drawn = game.activePoolUnitIds.slice(12);
  assert.equal(drawn.length, 5);
  assert.equal(new Set(game.activePoolUnitIds).size, 17);
  drawn.forEach(id => assert.ok(eligible.includes(id), `${id} eligible tier 1 base`));
  assert.ok(game.shop.slots.every(unit => unit && game.activePoolUnitIds.includes(unit.templateId)));
  samples.add([...drawn].sort().join(','));
  const before = [...game.activePoolUnitIds];
  game.startShopPhase(); game.reroll(); game.startShopPhase();
  assert.deepEqual(game.activePoolUnitIds, before, 'opening added only once');
 });
 check('samples vary', () => assert.ok(samples.size > 1));
 for (const [turn,tier,count] of [[2,2,5],[3,3,5],[6,4,4],[10,5,5]]) check(`manual turn ${turn}`, () => {
  const game = make(); game.startShopPhase(); game.turn = turn; game.startShopPhase();
  const before = game.activePoolUnitIds.length;
  for (let pick = 0; pick < count; pick++) {
   assert.equal(game.phase, GamePhase.POOL_SELECTION);
   assert.ok(game.poolChoices.length > 0);
   assert.equal(game.poolChoices[0].tier, tier);
   const [chosen,...rest] = game.poolChoices;
   game.applyPoolChoice(chosen, rest.map(choice => choice.id));
  }
  assert.equal(game.phase, GamePhase.SHOP);
  assert.equal(game.activePoolUnitIds.length, before + count);
  assert.ok(game.bannedPoolUnitIds.length > 0);
 });
 for (const count of [0,2]) check(`scarce eligible roster ${count}`, () => {
  const game = make({ ...InfiniteEdition, availableUnitIds: [...starters,...eligible.slice(0,count)] });
  game.startShopPhase();
  assert.equal(game.phase, GamePhase.SHOP);
  assert.deepEqual([...game.activePoolUnitIds.slice(12)].sort(), eligible.slice(0,count).sort());
  assert.equal(new Set(game.activePoolUnitIds).size, 12 + count);
 });
 for (const edition of [ClassicEdition, ModernEdition]) check(`${edition.id} unaffected`, () => {
  const game = make(edition);
  for (const turn of [1,2,3,6,10]) {
   game.turn = turn; game.startShopPhase();
   assert.equal(game.phase, GamePhase.SHOP);
   assert.deepEqual(game.activePoolUnitIds, []);
   assert.deepEqual(game.poolChoices, []);
   assert.deepEqual(game.bannedPoolUnitIds, []);
   assert.ok(game.shop.slots.every(unit => unit && edition.availableUnitIds.includes(unit.templateId)));
  }
 });
} finally { Math.random = originalRandom; console.log = originalLog; await server.close(); }
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`Infinite opening: ${checks} checks passed (40 seeded samples, manual schedules, scarce pools, editions).`);
