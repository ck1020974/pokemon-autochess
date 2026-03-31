// @ts-nocheck
import { Unit } from '../models/Unit';
import { ALL_UNITS } from '../data/AllUnits';
import { HeadlessBattleSimulator } from './HeadlessBattleSimulator';
import { writeFileSync } from 'fs';
import {
    INFINITE_NOVICE_OPPONENTS,
    INFINITE_INTERM_OPPONENTS,
    INFINITE_ADVANCED_OPPONENTS,
    INFINITE_ELITE_OPPONENTS,
    INFINITE_CHAMPION_OPPONENTS
} from '../data/opponents/infinite';
import type { OpponentDefinition } from '../data/AllOpponents';
import { SYNERGIES } from '../models/Synergies';

const SIMS_PER_BOSS = 1000; // 測試次數
const MAX_STEPS = 200;

const STAGES = [
    { name: 'Novice (新手期)', data: INFINITE_NOVICE_OPPONENTS, id: 'Novice', minWin: 80, maxWin: 95 },
    { name: 'Intermediate (中期)', data: INFINITE_INTERM_OPPONENTS, id: 'Intermediate', minWin: 60, maxWin: 80 },
    { name: 'Advanced (進階期)', data: INFINITE_ADVANCED_OPPONENTS, id: 'Advanced', minWin: 45, maxWin: 65 },
    { name: 'Elite (四天王)', data: INFINITE_ELITE_OPPONENTS, id: 'Elite', minWin: 30, maxWin: 50 },
    { name: 'Champion (冠軍)', data: INFINITE_CHAMPION_OPPONENTS, id: 'Champion', minWin: 15, maxWin: 35 }
];

// --- 輔助函數：模擬星級升級數值 ---
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
    unit.capStats();
}

// --- 敵方陣容生成 ---
function constructBossTeam(boss: OpponentDefinition, stageId: string): Unit[] {
    const team: Unit[] = [];

    // 依據階段調整敵人的基礎星數
    let baseLevel = 1;
    if (stageId === 'Intermediate') baseLevel = 2;
    if (stageId === 'Advanced') baseLevel = 2;
    if (stageId === 'Elite' || stageId === 'Champion') baseLevel = 3;

    for (const coreId of boss.coreUnits) {
        if (team.length >= 5) break;
        const t = ALL_UNITS[coreId];
        if (t) {
            try {
                const u = new Unit(t);
                applyStatsByLevel(u, baseLevel);
                if (stageId === 'Advanced' && team.length < 2) applyStatsByLevel(u, 3);
                team.push(u);
            } catch (err) {
                throw err;
            }
        } else {
            console.warn(`找不到單位模板: ${coreId}`);
        }
    }

    while (team.length < 5) {
        team.push(null as unknown as Unit);
    }
    return team;
}

// --- 玩家陣容生成 (基於階段進度) ---
function generatePlayerTeamForStage(stageId: string, enemyCount: number): Unit[] {
    const allTemplates = Object.values(ALL_UNITS).filter(t => t.id !== 'sprout' && !t.isHiddenFromShop);
    const team: Unit[] = [];

    let unitCount = enemyCount; // 用戶要求數量相同
    let maxLevel = 1;
    let focusSynergy = false; // 用戶要求全隨機
    let applyCarryBuff = false;

    if (stageId === 'Novice') {
        maxLevel = 1; // 既然是全隨機，且剛才測過 4 隻 1 星全勝，這裡也維持 1 星
    } else if (stageId === 'Intermediate') {
        maxLevel = 2;
    } else if (stageId === 'Advanced') {
        maxLevel = 3;
    } else if (stageId === 'Elite' || stageId === 'Champion') {
        maxLevel = 3;
        applyCarryBuff = true;
    }

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
        if (maxLevel === 2) {
            level = Math.random() < 0.7 ? 2 : 1; // 提高二星比例
        } else if (maxLevel === 3) {
            if (stageId === 'Elite' || stageId === 'Champion') {
                level = Math.random() < 0.85 ? 3 : 2; // 四天王戰力維持
            } else {
                const r = Math.random();
                if (r < 0.4) level = 3; // 提高三星比例
                else if (r < 0.9) level = 2;
                else level = 1;
            }
        }
        applyStatsByLevel(u, level);

        if (applyCarryBuff && i === 0) {
            const tier = t.tier || 1;
            let battleSynBonus = 0;
            let permSynBonus = 0;

            if (stageId === 'Novice') { battleSynBonus = 2; }
            else if (stageId === 'Intermediate') { battleSynBonus = 3; permSynBonus = 2; }
            else if (stageId === 'Advanced') { battleSynBonus = 3; permSynBonus = 3; }
            else { battleSynBonus = 4; permSynBonus = 4; }

            const totalAtkBonus = (tier === 1 ? 20 : (tier === 2 ? 15 : 10)) + battleSynBonus + permSynBonus;
            const totalHpBonus = (tier === 1 ? 20 : (tier === 2 ? 15 : 10)) + battleSynBonus + permSynBonus;

            if (Math.random() < 0.5) {
                u.stats.hp += totalHpBonus; u.stats.maxHp += totalHpBonus;
            } else {
                u.stats.attack += totalAtkBonus;
            }
            u.capStats();
        }

        team.push(u);
    }

    while (team.length < 5) {
        team.push(null as unknown as Unit);
    }
    return team;
}

// 自動推導標籤
function suggestDifficulty(winRate: number, currentDifficulty: string): string {
    let suggested = currentDifficulty;
    if (winRate > 85) suggested = 'EASY';
    else if (winRate > 60) suggested = 'NORMAL';
    else if (winRate > 35) suggested = 'HARD';
    else suggested = 'VERY_HARD';
    return suggested;
}

// --- 執行主程式 ---
async function runStageBalanceSim() {
    console.log(`開始進行無限版本 (Infinite Edition) 敵人強度考驗...`);
    let report = `# 無限版本：敵人強度平衡測試報告\n\n`;
    report += `> 測試設定：每個 Boss 進行 \`${SIMS_PER_BOSS}\` 場 Headless 模擬，藉此評估勝率是否合乎玩家該階段該有的實力期望。\n\n`;
    report += `> 難度自動校正規則：\n`;
    report += `> - EASY: 玩家勝率 > 85%\n`;
    report += `> - NORMAL: 玩家勝率 60% ~ 85%\n`;
    report += `> - HARD: 玩家勝率 35% ~ 60%\n`;
    report += `> - VERY_HARD: 玩家勝率 < 35%\n\n`;

    const startTime = Date.now();

    for (const stage of STAGES) {
        console.log(`\n--- 測試階段: ${stage.name} ---`);
        report += `## ${stage.name} (期望勝率: ${stage.minWin}% ~ ${stage.maxWin}%)\n`;
        report += `| 對手名稱 | ID | 陣容預覽 | 目前標籤 | 玩家勝率 | 平均回合 | 玩家殘餘血量 | 敵人殘餘血量 | **系統建議** |\n`;
        report += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

        for (const boss of stage.data) {
            let wins = 0;
            let losses = 0;
            let draws = 0;
            let totalTurns = 0;
            let totalWinHpPercent = 0;
            let totalLossHpPercent = 0;
            let totalDrawHpPercent = 0;

            const previewTeam = constructBossTeam(boss, stage.id);
            const teamNames = previewTeam.filter(u => u !== null).map(u => u.name).join(', ');

            for (let i = 0; i < SIMS_PER_BOSS; i++) {
                try {
                    const enemyTeam = constructBossTeam(boss, stage.id);
                    const enemyCount = enemyTeam.filter(u => u !== null).length;
                    const playerTeam = generatePlayerTeamForStage(stage.id, enemyCount);

                    const simulator = new HeadlessBattleSimulator(playerTeam, enemyTeam);
                    await simulator.init();

                    let active = true;
                    let steps = 0;
                    while (active && steps < MAX_STEPS) {
                        active = await (simulator as any).simulateStep();
                        steps++;
                    }
                    totalTurns += simulator.turnCount;

                    const result = (simulator as any).getResult();

                    let playerMaxHp = 0;
                    let playerHp = 0;
                    playerTeam.forEach(u => {
                        if (u) {
                            playerMaxHp += Math.max(1, u.stats.maxHp);
                            if (u.stats.hp > 0) playerHp += u.stats.hp;
                        }
                    });
                    let enemyMaxHp = 0;
                    let enemyHp = 0;
                    enemyTeam.forEach(u => {
                        if (u) {
                            enemyMaxHp += Math.max(1, u.stats.maxHp);
                            if (u.stats.hp > 0) enemyHp += u.stats.hp;
                        }
                    });

                    const playerHpPercent = playerMaxHp > 0 ? (playerHp / playerMaxHp) * 100 : 0;
                    const enemyHpPercent = enemyMaxHp > 0 ? (enemyHp / enemyMaxHp) * 100 : 0;

                    if (result === 'WIN') {
                        wins++;
                        totalWinHpPercent += playerHpPercent;
                    } else if (result === 'LOSS') {
                        losses++;
                        totalLossHpPercent += enemyHpPercent;
                    } else {
                        draws++;
                        totalDrawHpPercent += ((playerHpPercent + enemyHpPercent) / 2);
                    }
                } catch (err) {
                    console.error(`模擬發生錯誤! 對手: ${boss.name} (${boss.id}), 第 ${i} 次模擬`);
                    console.error(err);
                    process.exit(1);
                }
            }

            const winRate = (wins / SIMS_PER_BOSS) * 100;
            const avgTurns = (totalTurns / SIMS_PER_BOSS).toFixed(1);

            const avgWinHp = wins > 0 ? (totalWinHpPercent / wins).toFixed(1) : '0.0';
            const avgLossHp = losses > 0 ? (totalLossHpPercent / losses).toFixed(1) : '0.0';

            const suggestedTag = suggestDifficulty(winRate, boss.difficulty);

            let diagnostic = `✅ ${boss.difficulty}`;
            if (suggestedTag !== boss.difficulty) {
                diagnostic = `⚠️ 建議改為 **${suggestedTag}**`;
            }

            console.log(`[${stage.name}] ${boss.name} - 勝率: ${winRate.toFixed(1)}%, 預設: ${boss.difficulty}, 建議: ${suggestedTag}`);
            report += `| ${boss.name} | \`${boss.id}\` | ${teamNames} | ${boss.difficulty} | **${winRate.toFixed(1)}%** | ${avgTurns} | ${avgWinHp}% | ${avgLossHp}% | ${diagnostic} |\n`;
        }
        report += `\n`;
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    report += `\n---\n*測試完成耗時：${duration} 秒*\n`;

    try {
        writeFileSync('./infinite_balance_report.md', report);
        console.log(`\n測試完成！報告已產出：infinite_balance_report.md`);
    } catch (err) {
        console.error('報告存檔失敗', err);
    }
}

runStageBalanceSim();
