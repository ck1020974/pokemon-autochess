
import { Unit } from './models/Unit';
import { UNIT_TEMPLATES } from './models/UnitFactory';
import { HeadlessBattleSimulator } from './engine/HeadlessBattleSimulator';

async function testCaveSynergy() {
    console.log("--- Testing Cave Synergy ---");

    // Cave [2]: Diglett + Onix
    const onix = new Unit(UNIT_TEMPLATES['onix']);
    const diglett = new Unit(UNIT_TEMPLATES['diglett']);

    onix.id = "ONIX_ID";
    diglett.id = "DIGLETT_ID";

    const originalTeam = [onix, diglett, null, null, null];

    const sim = new HeadlessBattleSimulator([onix, diglett, null, null, null], [null, null, null, null, null], originalTeam);
    await sim.init();

    const pOnix = sim.playerTeam.find(u => u && u.family === 'onix')!;
    const pDiglett = sim.playerTeam.find(u => u && u.family === 'diglett')!;

    console.log(`Initial Stats - Onix: ${pOnix.stats.hp}/${pOnix.stats.maxHp}, Diglett: ${pDiglett.stats.hp}/${pDiglett.stats.maxHp}`);
    console.log(`Unit IDs - Onix: ${pOnix.id}, Diglett: ${pDiglett.id}`);

    const eDummy = new Unit(UNIT_TEMPLATES['bulbasaur']);
    sim.enemyTeam[0] = eDummy;

    console.log("\nOnix attacks eDummy...");
    await sim.performAttack(pOnix, eDummy);

    console.log("\nAfter Onix attack and move:");
    console.log(`Onix HP: ${pOnix.stats.hp}/${pOnix.stats.maxHp}`);
    console.log(`Diglett HP: ${pDiglett.stats.hp}/${pDiglett.stats.maxHp}`);

    console.log("\nLogs:");
    sim.logs.forEach(l => console.log(`- ${l}`));

    console.log("\nChecking original team persistence:");
    console.log(`Original Onix HP: ${onix.stats.hp}/${onix.stats.maxHp}`);
    console.log(`Original Diglett HP: ${diglett.stats.hp}/${diglett.stats.maxHp}`);
}

testCaveSynergy().catch(console.error);
