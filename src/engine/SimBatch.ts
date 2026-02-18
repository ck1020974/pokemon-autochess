
import { Unit } from '../models/Unit';
import { UNIT_TEMPLATES } from '../models/UnitFactory';
import { SYNERGIES } from '../models/Synergies';
import { HeadlessBattleSimulator } from './HeadlessBattleSimulator';
import { writeFileSync } from 'node:fs';

// --- Simulation Settings ---
const TOTAL_SIMULATIONS = 10000000;
const MAX_STEPS_PER_BATTLE = 200;

// --- Data Trackers ---
const unitStats: Record<string, { pickCount: number; winCount: number }> = {};
const synergyStats: Record<string, { pickCount: number; winCount: number }> = {};
// Carry Trackers
const carryUnitStats: Record<string, { pickCount: number; winCount: number }> = {};
let carryHpWins = 0;
let carryHpPicks = 0;
let carryAtkWins = 0;
let carryAtkPicks = 0;

let totalWins = 0;
let totalDraws = 0;
let totalLosses = 0;
let totalLoops = 0;
const loopCases: any[] = [];

// Initialize trackers
Object.keys(UNIT_TEMPLATES).forEach(id => {
    if (!UNIT_TEMPLATES[id].isHiddenFromShop) {
        unitStats[id] = { pickCount: 0, winCount: 0 };
        carryUnitStats[id] = { pickCount: 0, winCount: 0 };
    }
});
Object.keys(SYNERGIES).forEach(id => {
    synergyStats[id] = { pickCount: 0, winCount: 0 };
});

// --- Helper Functions ---
function generateChampionTeam(): Unit[] {
    const enemyCount = 5;
    const allTemplates = Object.values(UNIT_TEMPLATES).filter(t => t.id !== 'sprout' && !t.isHiddenFromShop);
    const enemyTeam: Unit[] = [];

    const elements = ['Fire', 'Water', 'Grass'];
    const coreSynergyId = elements[Math.floor(Math.random() * elements.length)];
    const synergyPool = allTemplates.filter(u => u.synergies.includes(coreSynergyId));

    for (let i = 0; i < enemyCount; i++) {
        let t = (i < 4 && synergyPool.length > 0)
            ? synergyPool[Math.floor(Math.random() * synergyPool.length)]
            : allTemplates[Math.floor(Math.random() * allTemplates.length)];

        while (t.evolveId) {
            const nextT = UNIT_TEMPLATES[t.evolveId];
            if (nextT) t = nextT;
            else break;
        }

        const u = new Unit(t);
        u.level = 3;
        u.stats.hp += 10;
        u.stats.maxHp += 10;
        u.stats.attack += 5;

        const backlineUnits = ['swampert', 'blaziken', 'sceptile', 'meganium', 'swalot', 'mankey', 'dwebble', 'sprigatito', 'fuecoco'];
        if (i === 0 && backlineUnits.includes(u.family)) {
            i--;
            continue;
        }
        enemyTeam.push(u);
    }
    return enemyTeam;
}

function generateRandomPlayerTeam(): Unit[] {
    const allTemplates = Object.values(UNIT_TEMPLATES).filter(t => t.id !== 'sprout' && !t.isHiddenFromShop);
    const team: Unit[] = [];

    const availableSynergies = Object.keys(SYNERGIES);
    const focusSyn = availableSynergies[Math.floor(Math.random() * availableSynergies.length)];
    const focusPool = allTemplates.filter(t => t.synergies.includes(focusSyn));

    for (let i = 0; i < 5; i++) {
        let t = (i < 3 && focusPool.length > 0)
            ? focusPool[Math.floor(Math.random() * focusPool.length)]
            : allTemplates[Math.floor(Math.random() * allTemplates.length)];

        while (t.evolveId) {
            const nextT = UNIT_TEMPLATES[t.evolveId];
            if (nextT) t = nextT;
            else break;
        }

        const u = new Unit(t);
        u.level = 3;
        // Global buffs REMOVED for players in Phase 9

        const backlineUnits = ['swampert', 'blaziken', 'sceptile', 'meganium', 'swalot', 'mankey', 'dwebble', 'sprigatito', 'fuecoco'];
        if (i === 0 && backlineUnits.includes(u.family)) {
            i--;
            continue;
        }
        team.push(u);
    }
    return team;
}

function applyCarryBuff(team: Unit[]): { unit: Unit; type: 'HP' | 'ATK' } {
    const carryIdx = Math.floor(Math.random() * team.length);
    const carry = team[carryIdx];
    const type = Math.random() < 0.5 ? 'HP' : 'ATK';

    // T1:+15, T2:+12, T3:+10, T4:+8
    const tier = UNIT_TEMPLATES[carry.templateId].tier;
    const bonus = tier === 1 ? 15 : (tier === 2 ? 12 : (tier === 3 ? 10 : 8));

    if (type === 'HP') {
        carry.stats.hp += bonus;
        carry.stats.maxHp += bonus;
    } else {
        carry.stats.attack += bonus;
    }

    return { unit: carry, type };
}

async function runSimulation() {
    console.log(`Starting ${TOTAL_SIMULATIONS} simulations (Phase 9: High Intensity)...`);
    const startTime = Date.now();

    for (let i = 0; i < TOTAL_SIMULATIONS; i++) {
        const playerTeam = generateRandomPlayerTeam();
        const championTeam = generateChampionTeam();

        // Apply Carry Buff to ONE representative unit
        const carryInfo = applyCarryBuff(playerTeam);

        const simulator = new HeadlessBattleSimulator(playerTeam, championTeam);
        await simulator.init();

        let steps = 0;
        let active = true;
        while (active && steps < MAX_STEPS_PER_BATTLE) {
            active = await simulator.simulateStep();
            steps++;
        }

        const result = simulator.getResult();

        // Track data
        if (steps >= MAX_STEPS_PER_BATTLE) {
            totalLoops++;
            if (loopCases.length < 100) {
                loopCases.push({
                    player: playerTeam.map(u => u.name),
                    enemy: championTeam.map(u => u.name)
                });
            }
        }

        if (result === 'WIN') totalWins++;
        else if (result === 'LOSS') totalLosses++;
        else totalDraws++;

        // Carry Stats
        const baseId = Object.keys(UNIT_TEMPLATES).find(id => UNIT_TEMPLATES[id].family === carryInfo.unit.family && !UNIT_TEMPLATES[id].isHiddenFromShop);
        if (baseId && carryUnitStats[baseId]) {
            carryUnitStats[baseId].pickCount++;
            if (result === 'WIN') carryUnitStats[baseId].winCount++;
        }
        if (carryInfo.type === 'HP') {
            carryHpPicks++;
            if (result === 'WIN') carryHpWins++;
        } else {
            carryAtkPicks++;
            if (result === 'WIN') carryAtkWins++;
        }

        // Track Unit Stats
        const playerFamilies = new Set(playerTeam.map(u => u.family));
        playerFamilies.forEach(fam => {
            const baseTemplate = Object.values(UNIT_TEMPLATES).find(t => t.family === fam && !t.isHiddenFromShop);
            if (baseTemplate && unitStats[baseTemplate.id]) {
                unitStats[baseTemplate.id].pickCount++;
                if (result === 'WIN') unitStats[baseTemplate.id].winCount++;
            }
        });

        // Track Synergy Stats
        const synergySet = new Set<string>();
        playerTeam.forEach(u => u.synergies.forEach(s => synergySet.add(s)));
        synergySet.forEach(syn => {
            if (synergyStats[syn]) {
                synergyStats[syn].pickCount++;
                if (result === 'WIN') synergyStats[syn].winCount++;
            }
        });

        if ((i + 1) % 50000 === 0) {
            const progress = (((i + 1) / TOTAL_SIMULATIONS) * 100).toFixed(1);
            const elapsed = (Date.now() - startTime) / 1000;
            const eta = (elapsed / (i + 1)) * (TOTAL_SIMULATIONS - (i + 1));
            console.log(`Progress: ${progress}% (${i + 1} battles). ETA: ${eta.toFixed(0)}s`);
        }
    }

    const duration = (Date.now() - startTime) / 1000;
    generateReport(duration);
}

function generateReport(duration: number) {
    let report = `# 遊戲平衡模擬報告 (10,000,000 場 - 主力養成計畫)

## 總體數據
- **總戰鬥數**: ${TOTAL_SIMULATIONS}
- **模擬耗時**: ${duration.toFixed(2)} 秒
- **玩家勝率**: ${((totalWins / TOTAL_SIMULATIONS) * 100).toFixed(2)}% (${totalWins} 勝)
- **敗北率**: ${((totalLosses / TOTAL_SIMULATIONS) * 100).toFixed(2)}% (${totalLosses} 敗)
- **平手/超時率**: ${((totalDraws / TOTAL_SIMULATIONS) * 100).toFixed(2)}% (${totalDraws} 平)
- **疑似死循環次數**: ${totalLoops}

## 主力屬性效益分析
| 增強種類 | 出場次數 | 勝場 | 勝率 |
| :--- | :--- | :--- | :--- |
| 生命主力 (HP) | ${carryHpPicks} | ${carryHpWins} | ${((carryHpWins / carryHpPicks) * 100).toFixed(2)}% |
| 攻擊主力 (Atk) | ${carryAtkPicks} | ${carryAtkWins} | ${((carryAtkWins / carryAtkPicks) * 100).toFixed(2)}% |

## 👑 主力 Carry 排行榜 (Top 15)
排序：作為主力時的勝率 (Win Rate)

| 名稱 | 作為主力的次數 | 勝場 | 勝率 |
| :--- | :--- | :--- | :--- |
`;

    const sortedCarries = Object.keys(carryUnitStats)
        .filter(id => carryUnitStats[id].pickCount > 100)
        .sort((a, b) => (carryUnitStats[b].winCount / carryUnitStats[b].pickCount) - (carryUnitStats[a].winCount / carryUnitStats[a].pickCount))
        .slice(0, 15);

    sortedCarries.forEach(id => {
        const s = carryUnitStats[id];
        const wr = (s.winCount / s.pickCount) * 100;
        const name = UNIT_TEMPLATES[id].name;
        report += `| ${name} | ${s.pickCount} | ${s.winCount} | ${wr.toFixed(1)}% |\n`;
    });

    report += `
## 角色全體表現排行榜
排序：總體勝率

| 名稱 | 出場次數 | 勝場 | 勝率 | 表現評等 |
| :--- | :--- | :--- | :--- | :--- |
`;

    const sortedUnits = Object.keys(unitStats)
        .filter(id => unitStats[id].pickCount > 0)
        .sort((a, b) => (unitStats[b].winCount / unitStats[b].pickCount) - (unitStats[a].winCount / unitStats[a].pickCount));

    sortedUnits.forEach(id => {
        const s = unitStats[id];
        const wr = (s.winCount / s.pickCount) * 100;
        const name = UNIT_TEMPLATES[id].name;
        let rating = 'Normal';
        if (wr > 50) rating = '🔥 Strong';
        else if (wr < 25) rating = '❄️ Weak';
        report += `| ${name} | ${s.pickCount} | ${s.winCount} | ${wr.toFixed(1)}% | ${rating} |\n`;
    });

    report += `
## Synergy 表現分析
| 共鳴 ID | 出場次數 | 勝場 | 勝率 |
| :--- | :--- | :--- | :--- |
`;

    const sortedSyns = Object.keys(synergyStats)
        .filter(id => synergyStats[id].pickCount > 0)
        .sort((a, b) => (synergyStats[b].winCount / synergyStats[b].pickCount) - (synergyStats[a].winCount / synergyStats[a].pickCount));

    sortedSyns.forEach(id => {
        const s = synergyStats[id];
        const wr = (s.winCount / s.pickCount) * 100;
        report += `| ${id} | ${s.pickCount} | ${s.winCount} | ${wr.toFixed(1)}% |\n`;
    });

    try {
        writeFileSync('./balance_report.md', report);
        console.log('Final Report generated: balance_report.md');
    } catch (err) {
        console.log('Failed to write report');
    }
}

runSimulation();
