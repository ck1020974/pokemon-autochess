import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const server = await createServer({ root, appType: 'custom', server: { middlewareMode: true } });
const originalRandom = Math.random;
const originalLog = console.log;
let cases = 0;
const failures = [];
const check = (name, run) => {
    try { run(); cases++; } catch (error) { failures.push(`${name}: ${error.message}`); }
};
try {
    globalThis.window = {};
    console.log = () => {};
    const { ALL_UNITS } = await server.ssrLoadModule('/src/data/AllUnits.ts');
    const { Unit } = await server.ssrLoadModule('/src/models/Unit.ts');
    const { GameLoop } = await server.ssrLoadModule('/src/engine/GameLoop.ts');
    const forms = ['flareon', 'vaporeon', 'jolteon', 'espeon', 'umbreon', 'leafeon', 'glaceon', 'sylveon'];
    const makeUnit = (id, synergies) => {
        const unit = new Unit(ALL_UNITS[id]);
        if (synergies) unit.synergies = synergies;
        return unit;
    };
    const evolve = (allies, sample, { id = 'eevee', exp = 2, amount = 1, level = 1 } = {}) => {
        let calls = 0;
        // The constructor's unrelated Mew shuffle must not consume evolution RNG.
        const game = new GameLoop(undefined, () => { calls++; return sample; });
        const unit = makeUnit(id);
        unit.exp = exp;
        unit.level = level;
        game.playerTeam = [unit, ...allies];
        Math.random = () => sample;
        game.applyExpToUnit(unit, amount);
        assert.equal(unit.exp, exp + amount, 'EXP reward is applied exactly once');
        return { unit, calls };
    };
    check('Fire most common doubles its relative weight', () => {
        const { unit } = evolve([makeUnit('charmander', ['Fire'])], 0.2);
        assert.equal(unit.templateId, 'flareon');
    });
    check('Water most common doubles its relative weight', () => {
        assert.equal(evolve([makeUnit('squirtle', ['Water'])], 0.3).unit.templateId, 'vaporeon');
    });
    check('All tied leaders receive doubled weights', () => {
        const allies = [makeUnit('charmander', ['Fire']), makeUnit('squirtle', ['Water'])];
        assert.equal(evolve(allies, 0.39).unit.templateId, 'vaporeon');
        assert.equal(evolve(allies, 0.4).unit.templateId, 'jolteon');
    });
    check('Duplicate families cannot beat another synergy', () => {
        const allies = [makeUnit('charmander', ['Fire']), makeUnit('charmeleon', ['Fire']), makeUnit('squirtle', ['Water'])];
        assert.equal(evolve(allies, 0.39).unit.templateId, 'vaporeon');
    });
    check('A stronger unrelated synergy keeps all eight forms uniform', () => {
        const allies = [makeUnit('charmander', ['Starter', 'Fire']), makeUnit('squirtle', ['Starter', 'Water'])];
        assert.equal(evolve(allies, 0.2).unit.templateId, 'vaporeon');
    });
    check('Exclude the evolving base Eevee from all counts', () => {
        const allies = [makeUnit('rattata', ['Normal', 'Fire'])];
        assert.equal(evolve(allies, 0.2).unit.templateId, 'flareon');
    });
    check('Shared BatonPass cannot block elemental bias', () => {
        const allies = [makeUnit('rattata', ['BatonPass']), makeUnit('squirtle', ['BatonPass', 'Water'])];
        assert.equal(evolve(allies, 0.3).unit.templateId, 'vaporeon');
    });
    check('Two-star Eevee forms contribute two elemental counts', () => {
        const ally = makeUnit('vaporeon'); ally.level = 2;
        const allies = [ally, makeUnit('rattata', ['Normal']), makeUnit('charmander', ['Normal'])];
        assert.equal(evolve(allies, 0.3).unit.templateId, 'vaporeon');
    });
    check('Three-star Eevee forms contribute three elemental counts', () => {
        const ally = makeUnit('vaporeon_final'); ally.level = 3;
        const allies = [ally, makeUnit('rattata', ['Normal']), makeUnit('charmander', ['Normal']), makeUnit('bulbasaur', ['Normal'])];
        assert.equal(evolve(allies, 0.3).unit.templateId, 'vaporeon');
    });
    check('Repeated Eevee forms use their highest star bonus once', () => {
        const first = makeUnit('vaporeon'); first.level = 2;
        const second = makeUnit('vaporeon'); second.level = 2;
        const allies = [first, second, makeUnit('rattata', ['Normal']), makeUnit('charmander', ['Normal'])];
        assert.equal(evolve(allies, 0.3).unit.templateId, 'vaporeon');
    });
    for (const [index, id] of forms.entries()) check(`${id} uses its actual elemental synergy`, () => {
        const synergy = ALL_UNITS[id].synergies.find(value => value !== 'BatonPass');
        const counts = Object.fromEntries(forms.map(form => [form, 0]));
        for (let i = 0; i < 90; i++) {
            const result = evolve([makeUnit('rattata', [synergy])], (i + 0.5) / 90);
            counts[result.unit.templateId]++;
        }
        for (const [formIndex, form] of forms.entries()) assert.equal(counts[form], formIndex === index ? 20 : 10);
    });
    for (const [sample, expected] of [[0, 'flareon'], [1 / 9, 'vaporeon'], [3 / 9, 'jolteon'], [1 - Number.EPSILON, 'sylveon']]) {
        check(`Cumulative Water boundary ${sample}`, () => {
            const { unit, calls } = evolve([makeUnit('squirtle', ['Water'])], sample);
            assert.equal(unit.templateId, expected);
            assert.equal(calls, 1, 'One RNG draw for one base evolution');
        });
    }
    check('No effective ally synergy keeps all eight forms uniform', () => {
        for (let i = 0; i < forms.length; i++) {
            assert.equal(evolve([], (i + 0.5) / 8).unit.templateId, forms[i]);
        }
    });
    check('Direct three-star reward chooses one final form without excess EXP', () => {
        const { unit, calls } = evolve([makeUnit('squirtle', ['Water'])], 0.3, { exp: 1, amount: 8 });
        assert.equal(unit.templateId, 'vaporeon_final');
        assert.equal(unit.level, 3);
        assert.equal(calls, 1);
    });
    for (const id of forms) check(`${id} keeps its form at three stars without reroll`, () => {
        const { unit, calls } = evolve([], 0, { id, exp: 8, amount: 1, level: 2 });
        assert.equal(unit.templateId, `${id}_final`);
        assert.equal(unit.level, 3);
        assert.equal(calls, 0);
    });
    check('Normal evolution chains remain unchanged', () => {
        const { unit, calls } = evolve([], 0, { id: 'charmander', exp: 1, amount: 8 });
        assert.equal(unit.templateId, 'charizard');
        assert.equal(unit.level, 3);
        assert.equal(calls, 0);
    });
    check('Reproducible quantile distribution has 2:1 Water weighting', () => {
        const counts = Object.fromEntries(forms.map(id => [id, 0]));
        for (let i = 0; i < 900; i++) counts[evolve([makeUnit('squirtle', ['Water'])], (i + 0.5) / 900).unit.templateId]++;
        for (const id of forms) assert.equal(counts[id], id === 'vaporeon' ? 200 : 100);
    });
    for (const entry of ['move', 'chain', 'buy-target', 'buy-full']) check(`${entry} uses the team after its source is consumed`, () => {
        let calls = 0;
        const game = new GameLoop(undefined, () => { calls++; return 0.2; });
        const target = makeUnit('eevee');
        const source = makeUnit('eevee');
        game.playerTeam = [target, source, makeUnit('rattata'), makeUnit('charmander'), null];
        const startingGold = game.gold;
        if (entry === 'move') game.moveUnit(1, 0);
        else if (entry === 'chain') game.checkChainMerges(target);
        else {
            game.playerTeam[1] = entry === 'buy-full' ? makeUnit('charmander') : null;
            if (entry === 'buy-full') game.playerTeam[4] = makeUnit('charmeleon');
            game.shop.slots[0] = source;
            assert.equal(game.buyUnit(0, entry === 'buy-target' ? 0 : undefined), 0);
        }
        assert.equal(target.templateId, 'flareon', 'Consumed Eevee cannot inflate Normal beyond Fire');
        assert.equal(target.exp, 3, 'Base source grants exactly two Eevee merge EXP');
        assert.equal(target.level, 2);
        assert.equal(calls, 1, 'Each merge evolves with exactly one draw');
        if (entry === 'move' || entry === 'chain') assert.equal(game.playerTeam[1], null);
        assert.equal(game.gold, startingGold - (entry.startsWith('buy') ? 3 : 0));
    });
    if (failures.length) throw new Error(`${failures.length} failed cases:\n${failures.join('\n')}`);
} finally {
    Math.random = originalRandom;
    console.log = originalLog;
    await server.close();
}
console.log(`PASS: ${cases} Eevee evolution weight regression cases.`);
