// @ts-nocheck
import { Unit } from '../models/Unit';
import { ALL_UNITS } from '../data/AllUnits';
import { HeadlessBattleSimulator } from './HeadlessBattleSimulator';
import { writeFileSync } from 'fs';
import { NOVICE_OPPONENTS, INTERM_OPPONENTS, ADVANCED_OPPONENTS, ELITE_OPPONENTS, CHAMPION_OPPONENTS } from '../data/opponents/classic';
import { SYNERGIES } from '../models/Synergies';

const TOTAL_BATTLES = 5000;
const MAX_STEPS = 200;

const STAGES = [
    { name: 'Novice', data: NOVICE_OPPONENTS, id: 'Novice' },
    { name: 'Intermediate', data: INTERM_OPPONENTS, id: 'Intermediate' },
    { name: 'Advanced', data: ADVANCED_OPPONENTS, id: 'Advanced' },
    { name: 'Elite', data: ELITE_OPPONENTS, id: 'Elite' },
    { name: 'Champion', data: CHAMPION_OPPONENTS, id: 'Champion' }
];

// --- 輔助函數：模擬星級升級數值 (Reused) ---
function applyStatsByLevel(unit: Unit, targetLevel: number) {
    unit.level = targetLevel;
    const baseStats = ALL_UNITS[unit.templateId]?.baseStats || unit.stats;
    unit.stats = { ...baseStats };
    for (let lv = 2; lv <= unit.level; lv++) {
        let bHp = Math.floor(baseStats.hp * 0.5);
        let bAtk = Math.floor(baseStats.attack * 0.5);
        unit.stats.hp += bHp;
        unit.stats.maxHp += bHp;
        unit.stats.attack += bAtk;
    }
}

function constructBossTeam(boss: any, stageId: string): Unit[] {
    const team: Unit[] = [];
    let baseLevel = 1;
    if (stageId === 'Intermediate') baseLevel = 2;
    if (stageId === 'Advanced') baseLevel = 2;
    if (stageId === 'Elite' || stageId === 'Champion') baseLevel = 3;

    for (const coreId of boss.coreUnits) {
        if (team.length >= 5) break;
        const t = ALL_UNITS[coreId];
        if (t) {
            const u = new Unit(t);
            applyStatsByLevel(u, baseLevel);
            if (stageId === 'Advanced' && team.length < 2) applyStatsByLevel(u, 3);
            team.push(u);
        }
    }
    while (team.length < 5) team.push(null as unknown as Unit);
    return team;
}

function generatePlayerTeamForStage(stageId: string): Unit[] {
    const allTemplates = Object.values(ALL_UNITS).filter(t => t.id !== 'sprout' && !t.isHiddenFromShop);
    const team: Unit[] = [];

    let unitCount = 3;
    let maxLevel = 1;
    let focusSynergy = false;

    if (stageId === 'Novice') { unitCount = 3; maxLevel = 2; }
    else if (stageId === 'Intermediate') { unitCount = 4; maxLevel = 2; focusSynergy = true; }
    else if (stageId === 'Advanced') { unitCount = 5; maxLevel = 3; focusSynergy = true; }
    else if (stageId === 'Elite' || stageId === 'Champion') { unitCount = 5; maxLevel = 3; focusSynergy = true; }

    let synergyPool = allTemplates;
    if (focusSynergy) {
        const availableSynergies = Object.keys(SYNERGIES);
        const focusSyn = availableSynergies[Math.floor(Math.random() * availableSynergies.length)];
        synergyPool = allTemplates.filter(t => t.synergies.includes(focusSyn));
        if (synergyPool.length === 0) synergyPool = allTemplates;
    }

    for (let i = 0; i < unitCount; i++) {
        let t = (focusSynergy && i < 3 && synergyPool.length > 0)
            ? synergyPool[Math.floor(Math.random() * synergyPool.length)]
            : allTemplates[Math.floor(Math.random() * allTemplates.length)];

        if (stageId === 'Elite' || stageId === 'Champion') {
            while (t.evolveId) {
                const nextT = ALL_UNITS[t.evolveId];
                if (nextT) t = nextT;
                else break;
            }
        }

        const u = new Unit(t);
        let level = 1;
        if (maxLevel === 2) { level = Math.random() < 0.4 ? 2 : 1; }
        else if (maxLevel === 3) {
            if (stageId === 'Elite' || stageId === 'Champion') { level = 3; }
            else {
                const r = Math.random();
                if (r < 0.3) level = 3; else if (r < 0.8) level = 2; else level = 1;
            }
        }
        applyStatsByLevel(u, level);
        team.push(u);
    }
    while (team.length < 5) team.push(null as unknown as Unit);
    return team;
}

interface UnitStat {
    wins: number;
    total: number;
    name: string;
}

async function runUnitBalanceSim() {
    console.log(`開始進行各角色強度平衡測試 (${TOTAL_BATTLES} 場戰鬥)...`);
    const statsMap: Record<string, UnitStat> = {};

    for (let i = 0; i < TOTAL_BATTLES; i++) {
        if (i > 0 && i % 1000 === 0) console.log(`已處理 ${i} 場...`);

        const stage = STAGES[Math.floor(Math.random() * STAGES.length)];
        const bossDef = stage.data[Math.floor(Math.random() * stage.data.length)];

        const playerTeam = generatePlayerTeamForStage(stage.id);
        const enemyTeam = constructBossTeam(bossDef, stage.id);

        const simulator = new HeadlessBattleSimulator(playerTeam, enemyTeam);
        await simulator.init();

        let steps = 0;
        let active = true;
        while (active && steps < MAX_STEPS) {
            active = await simulator.simulateStep();
            steps++;
        }

        const result = simulator.getResult();
        const isWin = result === 'WIN';

        // 記錄參戰單位的表現 (以 Family_Level 為 Key)
        const recordedThisBattle = new Set<string>();
        playerTeam.forEach(u => {
            if (u) {
                const key = `${u.family}_${u.level}`;
                if (!recordedThisBattle.has(key)) {
                    if (!statsMap[key]) {
                        statsMap[key] = { wins: 0, total: 0, name: `${u.name}(${u.level}⭐)` };
                    }
                    statsMap[key].total++;
                    if (isWin) statsMap[key].wins++;
                    recordedThisBattle.add(key);
                }
            }
        });
    }

    // 產出報告
    let report = `# 角色強度平衡測試報告\n\n`;
    report += `> 測試設定：執行 \`${TOTAL_BATTLES}\` 場隨機模擬戰鬥。記錄各角色在不同星等下的參戰勝率。\n\n`;
    report += `| 角色名稱 | 星等 | 參戰次數 | 勝率 | 診斷 |\n`;
    report += `| :--- | :--- | :--- | :--- | :--- |\n`;

    const sortedStats = Object.entries(statsMap).sort((a, b) => {
        const wrA = a[1].wins / a[1].total;
        const wrB = b[1].wins / b[1].total;
        return wrB - wrA;
    });

    for (const [key, stat] of sortedStats) {
        if (stat.total < 20) continue; // 樣本數過低不計入
        const winRate = (stat.wins / stat.total) * 100;
        const [_, level] = key.split('_');

        let diagnostic = '✅ 正常';
        if (winRate > 70) diagnostic = '🔥 強力 (Overperforming)';
        else if (winRate < 40) diagnostic = '❄️ 弱勢 (Underperforming)';

        report += `| ${stat.name.split('(')[0]} | ${level}⭐ | ${stat.total} | **${winRate.toFixed(1)}%** | ${diagnostic} |\n`;
    }

    report += `\n\n---\n*備註：參戰次數低於 20 次的角色不予以顯示。*`;

    try {
        writeFileSync('./unit_balance_report.md', report);
        console.log(`\n測試完成！報告已產出：unit_balance_report.md`);
    } catch (err) {
        console.error('報告存檔失敗', err);
    }
}

runUnitBalanceSim();
