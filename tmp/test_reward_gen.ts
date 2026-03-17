
import { GameLoop } from '../src/engine/GameLoop';
import { Unit } from '../src/models/Unit';
import { ALL_UNITS } from '../src/data/AllUnits';

async function testRewardGen() {
    const game = new GameLoop();
    game.setDifficulty('NORMAL');

    // Set a team with some synergies
    game.playerTeam[0] = new Unit(ALL_UNITS.charmander); // Fire
    game.playerTeam[1] = new Unit(ALL_UNITS.gastly);     // Ghost

    console.log("--- Testing Reward Generation (10 iterations) ---");

    const pool1Items = ['幸運蛋', '不變之石', '進化奇石'];
    const pool1Categories = ['GOLD', 'EXP', 'LIVES'];

    for (let i = 0; i < 10; i++) {
        const rewards = game.generateRewardOptions('NORMAL');
        console.log(`Iteration ${i + 1}:`, rewards.map(r => r.item).join(', '));

        let hasP1 = false;
        let hasP2 = false;
        let hasP3 = false;

        rewards.forEach(r => {
            if (pool1Categories.includes(r.category) || pool1Items.includes(r.item)) hasP1 = true;
            else if (r.category === 'BATTLE_NONE' || (r.category === 'PERM_NONE' && r.item.includes('薄荷'))) hasP2 = true;
            else if (r.category === 'PERM_SYNERGY' || r.category === 'BATTLE_SYNERGY') hasP3 = true;
        });

        if (hasP1 && hasP2 && hasP3) {
            console.log("✅ Success: Contains all 3 categories.");
        } else {
            console.log("❌ Failure: Missing categories.", { hasP1, hasP2, hasP3 });
        }
    }
}

testRewardGen();
