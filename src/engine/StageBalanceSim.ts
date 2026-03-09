// @ts-nocheck
import { Unit } from '../models/Unit';
import { UNIT_TEMPLATES } from '../models/UnitFactory';
import { HeadlessBattleSimulator } from './HeadlessBattleSimulator';
import { writeFileSync } from 'fs';
import { NOVICE_OPPONENTS, INTERM_OPPONENTS, ADVANCED_OPPONENTS, ELITE_OPPONENTS, CHAMPION_OPPONENTS } from '../models/BossData';
import type { OpponentDefinition } from '../models/BossData';
import { SYNERGIES } from '../models/Synergies';

const SIMS_PER_BOSS = 1000;
const MAX_STEPS = 200;

// 定義各階段資訊
const STAGES = [
    { name: 'Novice (新手期)', data: NOVICE_OPPONENTS, id: 'Novice', minWin: 80, maxWin: 95 },
    { name: 'Intermediate (中期)', data: INTERM_OPPONENTS, id: 'Intermediate', minWin: 60, maxWin: 75 },
    { name: 'Advanced (進階期)', data: ADVANCED_OPPONENTS, id: 'Advanced', minWin: 45, maxWin: 60 },
    { name: 'Elite (四天王)', data: ELITE_OPPONENTS, id: 'Elite', minWin: 30, maxWin: 45 },
    { name: 'Champion (冠軍)', data: CHAMPION_OPPONENTS, id: 'Champion', minWin: 10, maxWin: 25 }
];

// --- 輔助函數：模擬星級升級數值 ---
function applyStatsByLevel(unit: Unit, targetLevel: number) {
    unit.level = targetLevel;
    const baseStats = UNIT_TEMPLATES[unit.templateId]?.baseStats || unit.stats;
    unit.stats = { ...baseStats };
    for (let lv = 2; lv <= unit.level; lv++) {
        let bHp = Math.floor(baseStats.hp * 0.5);
        let bAtk = Math.floor(baseStats.attack * 0.5);
        unit.stats.hp += bHp;
        unit.stats.maxHp += bHp;
        unit.stats.attack += bAtk;
    }
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
        if (team.length >= 5) break; // 最多 5 隻
        const t = UNIT_TEMPLATES[coreId];
        if (t) {
            const u = new Unit(t);
            applyStatsByLevel(u, baseLevel);

            // 進階期以上的館主可能有強制 3 星
            if (stageId === 'Advanced' && team.length < 2) applyStatsByLevel(u, 3);
            team.push(u);
        }
    }

    // 如果不足 5 隻，維持 null
    while (team.length < 5) {
        team.push(null as unknown as Unit);
    }
    return team;
}

// --- 玩家陣容生成 (基於階段進度) ---
function generatePlayerTeamForStage(stageId: string): Unit[] {
    const allTemplates = Object.values(UNIT_TEMPLATES).filter(t => t.id !== 'sprout' && !t.isHiddenFromShop);
    const team: Unit[] = [];

    // 決定玩家可派出的單位數量與星數
    let unitCount = 3;
    let maxLevel = 1;
    let focusSynergy = false;
    let applyCarryBuff = false;

    if (stageId === 'Novice') {
        unitCount = 3; // 剛開局不久，場上大概 3 隻
        maxLevel = 2;  // 有機會合出 2 星
    } else if (stageId === 'Intermediate') {
        unitCount = 4;
        maxLevel = 2;
        focusSynergy = true;
    } else if (stageId === 'Advanced') {
        unitCount = 5;
        maxLevel = 3;
        focusSynergy = true;
    } else if (stageId === 'Elite' || stageId === 'Champion') {
        unitCount = 5;
        maxLevel = 3;
        focusSynergy = true;
        applyCarryBuff = true;
    }

    // 決定羈絆走向 (中後期玩家通常會湊羈絆)
    let synergyPool = allTemplates;
    if (focusSynergy) {
        const availableSynergies = Object.keys(SYNERGIES);
        const focusSyn = availableSynergies[Math.floor(Math.random() * availableSynergies.length)];
        synergyPool = allTemplates.filter(t => t.synergies.includes(focusSyn));
        if (synergyPool.length === 0) synergyPool = allTemplates;
    }

    for (let i = 0; i < unitCount; i++) {
        // 前幾隻盡量選同羈絆的
        let t = (focusSynergy && i < 3 && synergyPool.length > 0)
            ? synergyPool[Math.floor(Math.random() * synergyPool.length)]
            : allTemplates[Math.floor(Math.random() * allTemplates.length)];

        // 自動進化至最高型態？
        if (stageId === 'Elite' || stageId === 'Champion') {
            while (t.evolveId) {
                const nextT = UNIT_TEMPLATES[t.evolveId];
                if (nextT) t = nextT;
                else break;
            }
        }

        const u = new Unit(t);
        // 隨機決定星數
        let level = 1;
        if (maxLevel === 2) {
            level = Math.random() < 0.4 ? 2 : 1; // 40% 機率 2 星
        } else if (maxLevel === 3) {
            if (stageId === 'Elite' || stageId === 'Champion') {
                level = 3; // 大後期全 3 星
            } else {
                const r = Math.random();
                if (r < 0.3) level = 3;
                else if (r < 0.8) level = 2;
                else level = 1;
            }
        }
        applyStatsByLevel(u, level);

        // 如果是大後期，模擬 Carry 增幅 (Tier 獎勵 + 勳章/圍巾強化)
        if (applyCarryBuff && i === 0) { // 讓第一隻當主 C
            const tier = t.tier || 1;
            // 根據最近的平衡調整，PERM_SYNERGY 與 BATTLE_SYNERGY 給予更強的加成 (EASY +2, NORMAL +3, etc)
            let battleSynBonus = 0;
            let permSynBonus = 0;

            if (stageId === 'Novice') { battleSynBonus = 2; }
            else if (stageId === 'Intermediate') { battleSynBonus = 3; permSynBonus = 2; }
            else if (stageId === 'Advanced') { battleSynBonus = 3; permSynBonus = 3; }
            else { battleSynBonus = 3; permSynBonus = 4; }

            const totalAtkBonus = (tier === 1 ? 15 : (tier === 2 ? 12 : 8)) + battleSynBonus + permSynBonus;
            const totalHpBonus = (tier === 1 ? 15 : (tier === 2 ? 12 : 8)) + battleSynBonus + permSynBonus;

            if (Math.random() < 0.5) {
                u.stats.hp += totalHpBonus; u.stats.maxHp += totalHpBonus;
            } else {
                u.stats.attack += totalAtkBonus;
            }
        }

        team.push(u);
    }

    // 如果不足 5 隻，維持 null
    while (team.length < 5) {
        team.push(null as unknown as Unit);
    }
    return team;
}

// --- 執行主程式 ---
async function runStageBalanceSim() {
    console.log(`開始進行各階段對手強度平衡測試...`);
    let report = `# 各階段對手強度平衡測試報告\n\n`;
    report += `> 測試設定：每個 Boss 進行 \`${SIMS_PER_BOSS}\` 場 Headless 模擬，藉此評估勝率是否合乎玩家該階段該有的實力期望。\n\n`;

    const startTime = Date.now();

    for (const stage of STAGES) {
        console.log(`\n--- 測試階段: ${stage.name} ---`);
        report += `## ${stage.name} (期望勝率: ${stage.minWin}% ~ ${stage.maxWin}%)\n`;
        report += `| 對手名稱 | ID | 陣容預覽 | 玩家勝率 | 平局率 | 平局平均血量(玩/敵) | 平均回合 | 診斷 |\n`;
        report += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

        for (const boss of stage.data) {
            let wins = 0;
            let losses = 0;
            let draws = 0;
            let totalSurvivingUnits = 0;
            let totalTurns = 0;
            let totalWinHpPercent = 0;
            let totalDrawPlayerHpPercent = 0;
            let totalDrawEnemyHpPercent = 0;

            // Get the boss team names once for the report
            const previewTeam = constructBossTeam(boss, stage.id);
            const teamNames = previewTeam.filter(u => u !== null).map(u => u.name).join(', ');

            for (let i = 0; i < SIMS_PER_BOSS; i++) {
                const playerTeam = generatePlayerTeamForStage(stage.id);
                const enemyTeam = constructBossTeam(boss, stage.id);

                const simulator = new HeadlessBattleSimulator(playerTeam, enemyTeam);
                await simulator.init();

                let active = true;
                let steps = 0;
                while (active && steps < MAX_STEPS) {
                    active = await simulator.simulateStep();
                    steps++;
                }
                totalTurns += simulator.turnCount;

                const result = simulator.getResult();

                // Calculate HP percent at the end of simulation
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
                    totalSurvivingUnits += playerTeam.filter(u => u && u.stats.hp > 0).length;
                    totalWinHpPercent += playerHpPercent;
                }
                else if (result === 'LOSS') {
                    losses++;
                }
                else {
                    draws++;
                    totalDrawPlayerHpPercent += playerHpPercent;
                    totalDrawEnemyHpPercent += enemyHpPercent;
                }
            }

            const winRate = (wins / SIMS_PER_BOSS) * 100;
            const drawRate = (draws / SIMS_PER_BOSS) * 100;
            const avgSurviving = wins > 0 ? (totalSurvivingUnits / wins).toFixed(1) : '0.0';
            const avgTurns = (totalTurns / SIMS_PER_BOSS).toFixed(1);

            const avgDrawPlayerHp = draws > 0 ? (totalDrawPlayerHpPercent / draws).toFixed(1) : '0.0';
            const avgDrawEnemyHp = draws > 0 ? (totalDrawEnemyHpPercent / draws).toFixed(1) : '0.0';

            // 診斷分析 (基於設計者期望)
            let diagnostic = '✅ 合格';
            if (winRate < stage.minWin) diagnostic = '🔴 過難 (建議削弱)';
            else if (winRate > stage.maxWin) diagnostic = '🟢 過易 (建議加強)';

            if (drawRate > 15) diagnostic += ' ⚠️ 高平手率';

            console.log(`[${stage.name}] ${boss.name} - 勝率: ${winRate.toFixed(1)}%, 平局: ${drawRate.toFixed(1)}%, 回合: ${avgTurns}`);
            report += `| ${boss.name} | \`${boss.id}\` | ${teamNames} | **${winRate.toFixed(1)}%** | ${drawRate.toFixed(1)}% | ${avgDrawPlayerHp}% / ${avgDrawEnemyHp}% | ${avgTurns} | ${diagnostic} |\n`;
        }
        report += `\n`;
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    report += `\n---\n*測試完成耗時：${duration} 秒*\n`;

    try {
        writeFileSync('./stage_balance_report.md', report);
        console.log(`\n測試完成！報告已產出：stage_balance_report.md`);
    } catch (err) {
        console.error('報告存檔失敗', err);
    }
}

runStageBalanceSim();
