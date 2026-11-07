import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdirSync, writeFileSync} from 'node:fs';
const server = await createServer({appType:'custom', server:{middlewareMode:true}});
const originalLog = console.log;
const out = 'output/seven-fixes-20261107'; mkdirSync(out, {recursive:true});
const findings = [], failures = [];
globalThis.window = {};
globalThis.document = {getElementById:()=>null, querySelectorAll:()=>[]};
globalThis.requestAnimationFrame = callback => { callback(); return 0; };
console.log = () => {};
try {
    const {Unit} = await server.ssrLoadModule('/src/models/Unit.ts');
    const {ALL_UNITS} = await server.ssrLoadModule('/src/data/AllUnits.ts');
    const {GameLoop} = await server.ssrLoadModule('/src/engine/GameLoop.ts');
    const {ClassicEdition} = await server.ssrLoadModule('/src/data/editions/classic/index.ts');
    const {ModernEdition} = await server.ssrLoadModule('/src/data/editions/modern/index.ts');
    const {InfiniteEdition} = await server.ssrLoadModule('/src/data/editions/infinite/index.ts');
    const {prepareOpponentTeams} = await server.ssrLoadModule('/src/engine/createEnemyTeam.ts');
    const {BattleSimulator} = await server.ssrLoadModule('/src/engine/BattleSimulator.ts');
    const {HeadlessBattleSimulator} = await server.ssrLoadModule('/src/engine/HeadlessBattleSimulator.ts');
    const expected = [
        {id:'tutorial-brock-easy', difficulty:'EASY', templates:['dwebble','dwebble'], level:1},
        {id:'tutorial-brock-normal', difficulty:'NORMAL', templates:['dwebble','diglett','onix'], level:1},
        {id:'tutorial-brock-hard', difficulty:'HARD', templates:['crustle','dugtrio','steelix'], level:2},
    ];
    const check = async (name, run) => {try {await run(); findings.push(name);} catch(error) {failures.push(`${name}: ${error.message}`);} };
    for (const edition of [ClassicEdition, ModernEdition, InfiniteEdition]) await check(`${edition.id} three independent tutorial teams`, async () => {
        const game = new GameLoop();
        const teams = prepareOpponentTeams({game, activeEdition:edition, difficulty:'NORMAL', tutorialStep:7}, expected);
        for (const choice of expected) {
            const team = teams.get(choice.id);
            assert.equal(team.length, 5);
            assert.deepEqual(team.filter(Boolean).map(u=>u.templateId), choice.templates);
            assert.ok(team.filter(Boolean).every(u=>u.level === choice.level));
            for (const unit of team.filter(Boolean)) {
                const base = ALL_UNITS[unit.templateId].baseStats;
                assert.equal(unit.stats.attack, base.attack + (choice.level-1)*Math.floor(base.attack*.5));
            }
        }
        const orders = [['gastly','charmander','squirtle'],['gastly','squirtle','charmander'],['charmander','gastly','squirtle'],['charmander','squirtle','gastly'],['squirtle','gastly','charmander'],['squirtle','charmander','gastly']];
        for (const [name, Simulator] of Object.entries({BattleSimulator, HeadlessBattleSimulator})) for (const order of orders) {
            const player = [...order.map(id=>new Unit(ALL_UNITS[id])), null, null];
            const sim = new Simulator(player, teams.get(expected[0].id));
            sim.delay = async()=>{}; sim.playAnimation = async()=>{}; sim.playTeamAnimation = async()=>{};
            await sim.init();
            let steps = 0;
            while (!sim.getResult() && steps++ < 100) await sim.simulateStep();
            assert.equal(sim.getResult(), 'WIN', `${name}: ${order}`);
        }
    });
    writeFileSync(`${out}/tutorial-opponents.json`, JSON.stringify({findings,failures}, null, 2));
    assert.deepEqual(failures, []);
} finally {console.log = originalLog; await server.close();}
console.log(`PASS: ${findings.length} edition lineups; 36 real-engine easy tutorial victories.`);
