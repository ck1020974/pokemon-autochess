import { HeadlessBattleSimulator } from './engine/HeadlessBattleSimulator';
import { UnitTemplate, UNIT_TEMPLATES } from './models/UnitFactory';
import { Unit } from './models/Unit';

async function testSkills() {
    console.log("Starting Skill Verification Tests...");

    // Mock original player team for permanent growth tracking
    const originalPlayerTeam: Unit[] = [
        { ...UNIT_TEMPLATES.sprigatito, id: 'test-sprigatito', stats: { ...UNIT_TEMPLATES.sprigatito.baseStats } } as any,
        { ...UNIT_TEMPLATES.fuecoco, id: 'test-fuecoco', stats: { ...UNIT_TEMPLATES.fuecoco.baseStats } } as any,
        { ...UNIT_TEMPLATES.quaxly, id: 'test-quaxly', stats: { ...UNIT_TEMPLATES.quaxly.baseStats } } as any,
        { ...UNIT_TEMPLATES.snover, id: 'test-snover', stats: { ...UNIT_TEMPLATES.snover.baseStats } } as any,
    ];

    const sim = new HeadlessBattleSimulator(
        [...originalPlayerTeam.map(u => JSON.parse(JSON.stringify(u)))],
        [{ ...UNIT_TEMPLATES.pidgey, id: 'enemy-1', stats: { hp: 100, maxHp: 100, attack: 1 } } as any],
        originalPlayerTeam
    );

    // 1. Test Snover Permanent Growth
    console.log("\n--- Testing Snover Permanent Growth ---");
    const snover = sim.playerTeam.find(u => u?.family === 'snover')!;
    const snoverOriginal = originalPlayerTeam.find(u => u.id === snover.id)!;
    console.log(`Initial ATK: ${snover.stats.attack}, Original ATK: ${snoverOriginal.stats.attack}`);

    // Simulate Snover attack
    (sim as any).attacker = snover;
    (sim as any).defender = sim.enemyTeam[0];
    await (sim as any).performAttack(snover, sim.enemyTeam[0]); // This should trigger growth
    console.log(`After Attack - Snover ATK: ${snover.stats.attack}`);
    console.log(`After Attack - Original Snover ATK: ${snoverOriginal.stats.attack}`);

    if (snoverOriginal.stats.attack > UNIT_TEMPLATES.snover.baseStats.attack) {
        console.log("✅ Snover Permanent Growth Successful!");
    } else {
        console.log("❌ Snover Permanent Growth Failed!");
    }

    // 2. Test Fuecoco Multi-stage Buff
    console.log("\n--- Testing Fuecoco Multi-stage Buff ---");
    const fuecoco = sim.playerTeam.find(u => u?.family === 'fuecoco')!;
    fuecoco.level = 2; // Should target 2 allies
    const enemies = sim.enemyTeam;

    console.log("Mocking ally kill...");
    await sim.eventBus.emit('AFTER_DEATH', {
        unit: enemies[0],
        context: { killer: fuecoco }
    });

    const buffedAllies = sim.playerTeam.filter(u => u && u.stats.maxHp > u.template!.baseStats.hp);
    console.log(`Number of buffed allies: ${buffedAllies.length}`);
    if (buffedAllies.length === 2) {
        console.log("✅ Fuecoco Multi-stage Buff Successful (2 targets)!");
    } else {
        console.log("❌ Fuecoco Multi-stage Buff Failed!");
    }

    // 3. Test Cap Limit (50)
    console.log("\n--- Testing Stat Cap Limit (50) ---");
    const quaxly = sim.playerTeam.find(u => u?.family === 'quaxly')!;
    quaxly.level = 3;
    // Set all allies to near cap
    sim.playerTeam.forEach(u => { if (u) u.stats.attack = 50; });
    const oneEligible = sim.playerTeam.find(u => u && u.id === 'test-sprigatito')!;
    oneEligible.stats.attack = 40;

    console.log("Mocking ally kill with one eligible target...");
    await sim.eventBus.emit('AFTER_DEATH', {
        unit: enemies[0],
        context: { killer: quaxly }
    });

    const overCapped = sim.playerTeam.filter(u => u && u.stats.attack > 50);
    console.log(`Allies over 50 ATK: ${overCapped.length}`);
    if (overCapped.length === 0 && oneEligible.stats.attack === 43) {
        console.log("✅ Stat Cap Limit Respected!");
    } else {
        console.log("❌ Stat Cap Limit Failed!");
    }

    console.log("\nVerification Finished.");
}

// Note: This script is intended to be run in the project environment.
// Since I cannot easily run it here due to build context, I will manually inspect the code logic again.
// testSkills();
