import {Unit, type UnitTemplate} from '../models/Unit';
import {ALL_UNITS, PREFERRED_POSITIONS} from '../data/AllUnits';
import type {PreferredPosition} from '../data/AllUnits';
import type {GameLoop} from './GameLoop';
import type {GameEdition} from '../models/Edition';

interface EnemyContext {
    game: GameLoop;
    activeEdition: GameEdition;
    difficulty: string | null;
    tutorialStep: number;
    opponent: {id: string} | null;
}

// Prepare once for the entrance, then hand the exact same lineup to the battle.
export function createEnemyTeam({game, activeEdition, difficulty, tutorialStep, opponent}: EnemyContext): (Unit | null)[] {
    // Enemy Count Logic based on User Request
    // Turn <= 1 = 3, Turn 2+ = 5
    let enemyCount = 5;
    if (game.turn <= 1) enemyCount = 3;
    else enemyCount = 5;

    let enemyTeam: (Unit | null)[] = [];

    // Helper to bias enemy generation towards higher tiers in mid/late game
    const getRandomEnemyTemplate = (templates: UnitTemplate[]) => {
        if (game.turn >= 8 && Math.random() < 0.6) {
            const maxTier = Math.max(...templates.map(t => t.tier));
            const highTierPool = templates.filter(t => t.tier >= maxTier - 1);
            if (highTierPool.length > 0) return highTierPool[Math.floor(Math.random() * highTierPool.length)];
        }
        return templates[Math.floor(Math.random() * templates.length)];
    };

    // 2. Progression Settings (Star Count & Level)
    // Default settings for filler units
    let enemyBaseLevel = 1;
    let forcedStarCount = 0;
    let forcedTwoStarCount = 0;
    let isBossMatch = false;

    if (game.wins >= 11) {
        isBossMatch = true;
        enemyBaseLevel = 2; // Default to 2-star for lategame, let forcedStarCount push to 3-star
        if (difficulty === 'NORMAL') forcedStarCount = 2;
        else if (difficulty === 'GREAT') forcedStarCount = 3;
        else if (difficulty === 'ULTRA') forcedStarCount = 4;
        else {
            enemyBaseLevel = 3;
            forcedStarCount = 5; // Master: All 5 Units 3-Star
        }
    } else if (game.wins >= 8) {
        isBossMatch = true;
        const eliteIndex = game.wins - 8; // 0, 1, 2, 3
        enemyBaseLevel = 2;
        if (difficulty === 'NORMAL') {
            const progression = [0, 1, 1, 2];
            forcedStarCount = progression[eliteIndex];
        } else if (difficulty === 'GREAT') {
            const progression = [1, 1, 2, 2];
            forcedStarCount = progression[eliteIndex];
        } else if (difficulty === 'ULTRA') {
            const progression = [1, 2, 3, 3];
            forcedStarCount = progression[eliteIndex];
        } else {
            forcedStarCount = eliteIndex + 1;
        }
    } else {
        enemyBaseLevel = 1;
        // Gym scaling
        if (game.turn >= 7) {
            enemyBaseLevel = 2;
        }
    }

    if (game.wins < 8 && game.turn >= 4 && game.turn < 7) {
        forcedTwoStarCount = game.turn - 3;
    }

    // 3. Strategy / Synergy Selection
    if (tutorialStep > 0 && tutorialStep < 10) {
        // Tutorial Battle 1: Use Brock (novice_3 or in_3)'s team exactly
        const brock = activeEdition.noviceOpponents.find(n => n.id.includes('_3')) || activeEdition.noviceOpponents[0];
        enemyTeam = (brock?.coreUnits || []).map((id: string) => {
            const t = ALL_UNITS[id];
            if (!t) {
                console.warn("Tutorial unit template not found:", id);
                return new Unit(ALL_UNITS.rattata);
            }
            const u = new Unit(t);
            u.level = 1;
            return u;
        }).concat(Array(5).fill(null)).slice(0, 5) as Unit[];
    } else if (opponent && opponent.id) {
        // Real gameplay OR Tutorial Battle 2: Use chosen opponent's team
        const def = activeEdition.championOpponents.find(c => c.id === opponent.id) ||
            activeEdition.eliteOpponents.find(c => c.id === opponent.id) ||
            activeEdition.advancedOpponents.find(e => e.id === opponent.id) ||
            activeEdition.intermOpponents.find(g => g.id === opponent.id) ||
            activeEdition.noviceOpponents.find(n => n.id === opponent.id);

        if (def) {
            // bossLevel for Core Units
            let bossLevel = enemyBaseLevel;
            if (isBossMatch) {
                if (difficulty === 'NORMAL') bossLevel = 1;
                else if (difficulty === 'GREAT') bossLevel = 2;
                else bossLevel = 3;
            }
            if (tutorialStep >= 10) {
                // Ensure defeat in tutorial second battle
                bossLevel = 3;
            }

            // Helper to dynamically evolve core units
            const getEvolvedTemplate = (t: UnitTemplate, targetLevel: number) => {
                let current = t;
                if (!current) return null;
                for (let i = 1; i < targetLevel; i++) {
                    if (current && current.evolveId && ALL_UNITS[current.evolveId]) {
                        current = ALL_UNITS[current.evolveId];
                    } else {
                        break;
                    }
                }
                return current;
            };

            // 1. Create Core Units
            const candidateUnits: Unit[] = [];
            let coreCount = 0;
            for (const coreId of def.coreUnits) {
                if (coreCount >= enemyCount) break;
                const baseT = ALL_UNITS[coreId];
                if (baseT && activeEdition.availableUnitIds.includes(coreId)) {
                    const t = getEvolvedTemplate(baseT, bossLevel);
                    if (!t) continue;
                    const u = new Unit(t);
                    u.level = bossLevel;
                    candidateUnits.push(u);
                    coreCount++;
                }
            }

            // 2. Fill the rest based on their primary attributes/synergies
            let fillCount = enemyCount - candidateUnits.length;
            const mainSynergy = candidateUnits.length > 0 ? candidateUnits[0].synergies[0] : null;

            let attempts = 0;
            const MAX_ENEMY_ATTEMPTS = 5;
            const shopTier = game.shop.getTier(game.turn);

            while (fillCount > 0 && attempts < MAX_ENEMY_ATTEMPTS) {
                const availableTemplates = Object.values(ALL_UNITS).filter(t => t.id !== 'sprout' && !t.isHiddenFromShop && t.tier <= shopTier && activeEdition.availableUnitIds.includes(t.id));
                let pool = availableTemplates;
                if (mainSynergy && Math.random() < 0.7) {
                    const sPool = availableTemplates.filter(t => t.synergies.includes(mainSynergy));
                    if (sPool.length > 0) pool = sPool;
                }

                const baseT = getRandomEnemyTemplate(pool);
                const t = getEvolvedTemplate(baseT, bossLevel);
                if (t) {
                    const u = new Unit(t);
                    u.level = bossLevel;
                    candidateUnits.push(u);
                    fillCount--;
                }
                attempts++;
            }

            const sortTeamByPositions = (unsortedUnits: Unit[]): Unit[] => {
                const POS_SCORE: Record<PreferredPosition, number> = {
                    'FRONT': 0,
                    'FRONT_MID': 1,
                    'ALL': 2,
                    'MID': 2,
                    'MID_BACK': 3,
                    'BACK': 4
                };

                const getPref = (u: Unit) => PREFERRED_POSITIONS[u.family || u.templateId] || 'ALL';

                const sorted = [...unsortedUnits].sort((a, b) => {
                    return POS_SCORE[getPref(a)] - POS_SCORE[getPref(b)];
                });

                const result: (Unit | null)[] = [null, null, null, null, null];
                for (let i = 0; i < Math.min(sorted.length, 5); i++) {
                    result[i] = sorted[i];
                }
                return result as unknown as Unit[];
            };

            const sorted = sortTeamByPositions(candidateUnits);
            if (sorted) {
                enemyTeam = sorted;
            } else {
                // Fallback
                enemyTeam = candidateUnits.concat(Array(5 - candidateUnits.length).fill(null)).slice(0, 5) as unknown as Unit[];
            }
        } else {
            // Fallback logic if ID not found (Should not happen)
            enemyTeam = [new Unit(ALL_UNITS.rattata), null, null, null, null];
        }
    } else {
        // This block executes if there's NO selected opponent (e.g., debugging or not opening the modal)
        const fallbackPool = game.wins >= 12 ? activeEdition.championOpponents : (game.wins >= 8 ? activeEdition.eliteOpponents : (game.wins >= 5 ? activeEdition.advancedOpponents : (game.wins >= 3 ? activeEdition.intermOpponents : activeEdition.noviceOpponents)));
        const def = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
        const fbCandidateUnits: Unit[] = [];
        for (const coreId of def.coreUnits) {
            if (fbCandidateUnits.length >= enemyCount) break;
            const t = ALL_UNITS[coreId];
            if (t && activeEdition.availableUnitIds.includes(coreId)) {
                const u = new Unit(t);
                u.level = enemyBaseLevel;
                fbCandidateUnits.push(u);
            }
        }
        let fbFillCount = enemyCount - fbCandidateUnits.length;
        const fbShopTier = game.shop.getTier(game.turn);
        while (fbFillCount > 0) {
            const allT = Object.values(ALL_UNITS).filter(t => t.id !== 'sprout' && !t.isHiddenFromShop && t.tier <= fbShopTier && activeEdition.availableUnitIds.includes(t.id));
            const t = getRandomEnemyTemplate(allT);
            if (t) {
                const u = new Unit(t);
                u.level = enemyBaseLevel;
                fbCandidateUnits.push(u);
                fbFillCount--;
            }
        }

        enemyTeam = fbCandidateUnits.concat(Array(5 - fbCandidateUnits.length).fill(null)).slice(0, 5) as unknown as Unit[];
    }

    // A. Apply forced stars (upgrades)
    const threeStarCount = enemyTeam.filter(u => u && u.level >= 3).length;
    if (isBossMatch && threeStarCount < forcedStarCount) {
        let needed = forcedStarCount - threeStarCount;
        for (const u of enemyTeam) {
            if (needed <= 0) break;
            if (u && u.level < 3) {
                u.level = 3;
                needed--;
            }
        }
    }

    if (forcedTwoStarCount > 0 && !isBossMatch) {
        let needed = forcedTwoStarCount;
        for (const u of enemyTeam) {
            if (needed <= 0) break;
            if (u && u.level === 1) {
                u.level = 2;
                needed--;
            }
        }
    }

    // Emulate evolution stat growth up to Level 3
    enemyTeam.forEach(u => {
        if (!u) return;
        const baseStats = ALL_UNITS[u.templateId]?.baseStats || u.stats;
        u.stats = { ...baseStats };
        for (let lv = 2; lv <= u.level; lv++) {
            const bHp = Math.floor(baseStats.hp * 0.5);
            const bAtk = Math.floor(baseStats.attack * 0.5);
            u.stats.hp += bHp; u.stats.maxHp += bHp; u.stats.attack += bAtk;
        }

        // C. Turn-Based Difficulty & Stat Inflation
        const turnScalingStart = difficulty === 'MASTER' ? 3 : 5;
        if (game.difficultyScore >= turnScalingStart) {
            let scaleFactor = 0.75;
            if (difficulty === 'MASTER' && game.difficultyScore <= 4.5) scaleFactor = 0.4;

            const turnScale = Math.floor(game.difficultyScore * scaleFactor);
            u.stats.hp += turnScale; u.stats.maxHp += turnScale; u.stats.attack += Math.floor(turnScale / 1.5);

            if (game.wins >= 8) {
                const eIdx = game.wins - 7;
                let eBHp = eIdx * 6; let eBAtk = eIdx * 3;
                if (u.tier === 5) { eBHp = Math.ceil(eBHp * 0.5); eBAtk = Math.ceil(eBAtk * 0.5); }
                else if (u.tier === 4) { eBHp = Math.ceil(eBHp * 0.75); eBAtk = Math.ceil(eBAtk * 0.75); }
                u.stats.hp += eBHp; u.stats.maxHp += eBHp; u.stats.attack += eBAtk;
            }
        }

        // --- Stat Normalization (Method B): Clamp to tier-based min/max ---
        const statRange = (() => {
            if (game.wins >= 11) return { minHp: 30, maxHp: 44, minAtk: 20, maxAtk: 28 }; // Champion
            if (game.wins >= 8) return { minHp: 16, maxHp: 34, minAtk: 10, maxAtk: 22 }; // Elite Four
            if (game.wins >= 4) return { minHp: 8, maxHp: 18, minAtk: 5, maxAtk: 13 }; // Intermediate
            return { minHp: 1, maxHp: 12, minAtk: 1, maxAtk: 8 }; // Novice
        })();
        u.stats.hp = Math.min(Math.max(u.stats.hp, statRange.minHp), statRange.maxHp);
        u.stats.maxHp = Math.min(Math.max(u.stats.maxHp, statRange.minHp), statRange.maxHp);
        u.stats.attack = Math.min(Math.max(u.stats.attack, statRange.minAtk), statRange.maxAtk);

        if (u.battleImageUrl) u.imageUrl = u.battleImageUrl;
    });

    return enemyTeam;
}
