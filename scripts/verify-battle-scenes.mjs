import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const server = await createServer({root, appType: 'custom', server: {middlewareMode: true}});
try {
  const {getBattleSceneClass, getPresentationKind} = await server.ssrLoadModule('/src/presentation/battlePresentation.ts');
  const {ALL_UNITS} = await server.ssrLoadModule('/src/data/AllUnits.ts');
  const prefix = 'battle-scene--';
  const stadiums = ['stadium', 'stadium-coral', 'stadium-mint', 'stadium-lilac', 'stadium-gold'];
  const halls = ['champion-hall', 'champion-hall-lilac', 'champion-hall-gold'];
  const pick = (kind, roll, teamSynergies = [], recent = []) =>
    getBattleSceneClass(kind, 'same-opponent', recent, {teamSynergies, random: () => roll}).replace(prefix, '');

  assert.equal(getPresentationKind(7), 'regular');
  assert.equal(getPresentationKind(8), 'elite');
  assert.equal(getPresentationKind(11), 'elite');
  assert.equal(getPresentationKind(12), 'champion');
  for (let i = 0; i < 100; i++) {
    const roll = i / 100;
    assert.ok(stadiums.includes(pick('elite', roll, [['Fire'], ['Fire']])), 'Every elite battle must use an arena');
    assert.ok(halls.includes(pick('champion', roll, [['Water']])), 'Every champion battle must use a hall');
  }
  assert.deepEqual(new Set([0, .4, .9].map(r => pick('champion', r))), new Set(halls), 'All three halls must be reachable for the same opponent');
  assert.deepEqual(new Set([0, .2, .4, .6, .9].map(r => pick('elite', r))), new Set(stadiums));
  const first = prefix + pick('champion', 0);
  assert.notEqual(prefix + pick('champion', 0, [], [first]), first, 'Skip a recent scene when alternatives exist');
  assert.ok(halls.includes(pick('champion', .9, [], halls.map(s => prefix + s))), 'Exhausted history must stay within the hall pool');

  const themes = [
    {team: [['Starter', 'Fire'], ['Fire'], ['Ghost']], allowed: ['volcanic']},
    {team: [['Water'], ['Water'], ['Normal']], allowed: ['waterfall', 'harbor', 'beach', 'ocean']},
    {team: [['Grass'], ['BugBite'], ['Normal']], allowed: ['garden', 'grassland']},
    {team: [['Snow'], ['Snow'], ['Normal']], allowed: ['cavern']},
    {team: [['Cave'], ['Cave']], allowed: ['desert', 'route']},
    {team: [['Psychic'], ['Ghost']], allowed: ['library']},
    {team: [['Charge'], ['Hard']], allowed: stadiums},
  ];
  for (const {team, allowed} of themes) {
    const realIds = new Set(Object.values(ALL_UNITS).flatMap(unit => unit.synergies));
    for (const id of team.flat()) assert.ok(realIds.has(id), `Test must use real game synergy IDs: ${id}`);
    for (const roll of [0, .25, .5, .999]) {
      assert.ok(allowed.includes(pick('regular', roll, team)), `Unexpected environment for ${JSON.stringify(team)}`);
    }
  }
  assert.equal(pick('regular', 0, [['Fire', 'Water'], ['Fire']]), 'volcanic', 'A dual-themed unit contributes to each matching theme');
  assert.equal(pick('regular', .5, [['Fire']], [prefix + 'volcanic']), 'volcanic', 'A single-theme pool must remain themed even after a repeat');
  const waterFirst = prefix + pick('regular', 0, [['Water']]);
  assert.notEqual(prefix + pick('regular', 0, [['Water']], [waterFirst]), waterFirst);
  assert.equal(pick('regular', .999, [['Grass']], [prefix + 'garden', prefix + 'grassland']), 'garden', 'When a small pool is exhausted, avoid the immediately previous scene');

  const catalog = JSON.parse(readFileSync(resolve(root, 'src/assets/battle-scenes/catalog.json'), 'utf8'));
  const catalogIds = new Set(catalog.map(s => s.id));
  for (const team of [[], [['Unknown']], [['Fire'], ['Water'], ['Grass']]]) {
    for (const roll of [0, .5, .999]) {
      const id = pick('regular', roll, team);
      assert.ok(catalogIds.has(id), `Missing random fallback asset: ${id}`);
      assert.ok(!halls.includes(id), 'Regular matches must not use the champion hall');
    }
  }
  assert.ok(catalogIds.has('prep-lab'), 'Research lab must be included');
  for (const id of [...catalogIds, ...stadiums, ...halls]) {
    assert.ok(existsSync(resolve(root, `src/assets/battle-scenes/${id}.svg`)), `Missing SVG: ${id}`);
  }
  console.log('Battle scene rules verified: arenas, three halls, team themes, randomness, recent-scene avoidance and fallback assets.');
} finally {
  await server.close();
}
