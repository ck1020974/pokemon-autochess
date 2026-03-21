import { Unit } from '../models/Unit';
import { Shop } from '../models/Shop';
import { ALL_UNITS } from '../data/AllUnits';
import { SYNERGIES } from '../models/Synergies';
import { REWARD_DATA } from '../models/RewardData';

import type { GameEdition } from '../models/Edition';
import { ClassicEdition } from '../data/editions/classic';

export const GamePhase = {
    SHOP: 'SHOP',
    BATTLE: 'BATTLE',
    REWARD: 'REWARD',
    GAME_OVER: 'GAME_OVER',
    VICTORY: 'VICTORY'
} as const;

export type GamePhase = typeof GamePhase[keyof typeof GamePhase];

export class GameLoop {
    public turn: number = 1;
    public gold: number = 10;
    public lives: number = 5;
    public wins: number = 0;
    public phase: GamePhase = GamePhase.SHOP;
    public lastResult: 'WIN' | 'LOSS' | 'DRAW' | null = null;
    public drawCount: number = 0;
    public lossCount: number = 0;
    public difficultyName: string = 'NORMAL';
    public battleHistory: { opponentId: string, result: 'WIN' | 'LOSS' | 'DRAW' }[] = [];
    public gymBattleCount: number = 0;
    public eliteBattleCount: number = 0;
    public championBattleCount: number = 0;

    public charmanderN: number = 1;
    public charmanderCounter: number = 0;
    public pichuN: number = 3;
    public pichuCounter: number = 0;
    public psychicN: number = 2;

    public playerTeam: (Unit | null)[] = [null, null, null, null, null];
    public opponentTeam: (Unit | null)[] = [null, null, null, null, null];
    public savedTeam: (Unit | null)[] = []; // Store original team before battle
    public shop: Shop;
    public edition: GameEdition = ClassicEdition;
    public difficultyMultiplier: number = 1.0;
    public difficultyScore: number = 1.0; // Dynamic difficulty tracker
    public defeatedOpponentIds: string[] = [];
    public currentOpponentId: string | null = null;
    public currentOpponentDifficulty: string = 'NORMAL';

    public rewardChoices: any[] = [];
    public pendingGoldBonus: number = 0;
    public pendingFreeRerolls: number = 0;
    public freeRerolls: number = 0;
    public nextBattleBuffs: any[] = [];

    constructor(edition?: GameEdition) {
        this.shop = new Shop();
        if (edition) this.edition = edition;
        this.startShopPhase();
        (window as any).game = this; // Expose to window for UI dynamic descriptions
    }

    public setDifficulty(level: 'NORMAL' | 'GREAT' | 'ULTRA' | 'MASTER') {
        const multipliers = {
            'NORMAL': 0.6,
            'GREAT': 0.75,
            'ULTRA': 1.1,
            'MASTER': 1.5
        };
        this.difficultyMultiplier = multipliers[level];
        this.difficultyName = level;
    }

    public startShopPhase() {
        this.phase = GamePhase.SHOP;
        this.gold = 10 + this.pendingGoldBonus;
        this.pendingGoldBonus = 0;
        this.freeRerolls = this.pendingFreeRerolls;
        this.pendingFreeRerolls = 0;

        // --- Charmander Scaling (Handled in endBattle) ---

        // --- Psychic Scaling (Increments in concludeTurn) ---
        console.log(`念力傷害目前的威力：${this.psychicN}`);

        // --- Refresh Descriptions ---
        this.refreshSpecialDescriptions();

        // Turn Start Abilities
        this.playerTeam.forEach(u => {
            if (!u) return;

            // Meowth: Gain N Gold (1/3/5)
            if (u.family === 'meowth') {
                const amount = [0, 1, 3, 5][u.level] || 1;
                this.gold += amount;
                console.log(`${u.name} 產生了 ${amount} 金幣！`);
            }
        });

        (this.shop as any).roll(this.turn, this.edition?.availableUnitIds);
    }

    public refreshSpecialDescriptions() {
        // Update templates so shop shows CURRENT N value and correct frequency
        ALL_UNITS.charmander.description = `同時對後方敵方造成 ${this.charmanderN} 傷害 (每三回合後增強)`;
        ALL_UNITS.charmeleon.description = `同時對後方敵方造成 ${this.charmanderN} 傷害 (每二回合後增強)`;
        ALL_UNITS.charizard.description = `同時對後方敵方造成 ${this.charmanderN} 傷害 (每回合後增強)`;

        // Sync static template scaling values to current global N
        (ALL_UNITS.charmander as any).scalingValue = this.charmanderN;
        (ALL_UNITS.charmeleon as any).scalingValue = this.charmanderN;
        (ALL_UNITS.charizard as any).scalingValue = this.charmanderN;

        // Pichu family templates
        ALL_UNITS.pichu.description = `戰鬥開始時，對最弱的敵方造成 ${this.pichuN} 傷害 (每三場戰鬥後增強)。`;
        ALL_UNITS.pikachu.description = `戰鬥開始時，對最弱的敵方造成 ${this.pichuN} 傷害 (每兩場戰鬥後增強)。`;
        ALL_UNITS.raichu.description = `戰鬥開始時，對最弱的敵方造成 ${this.pichuN} 傷害 (每場戰鬥後增強)。`;
        (ALL_UNITS.pichu as any).scalingValue = this.pichuN;
        (ALL_UNITS.pikachu as any).scalingValue = this.pichuN;
        (ALL_UNITS.raichu as any).scalingValue = this.pichuN;

        // Sync units in shop (including frozen ones)
        this.shop.slots.forEach(u => {
            if (u && u.family === 'charmander') {
                u.scalingValue = this.charmanderN;
                const freq = [0, '三', '二', ''][u.level] || '三';
                const suffix = u.level === 3 ? '每回合' : `每${freq}回合`;
                u.description = `同時對後方敵方造成 ${this.charmanderN} 傷害 (${suffix}後增強)`;
            }
            if (u && u.family === 'pichu') {
                u.scalingValue = this.pichuN;
                const freq = [0, '三', '二', ''][u.level] || '三';
                const suffix = u.level === 3 ? '每回合' : `每${freq}回合`;
                u.description = `戰鬥開始時，對最弱的敵方造成 ${this.pichuN} 傷害 (${suffix}後增強)。`;
            }
        });

        // Sync player's units on board
        this.playerTeam.forEach(u => {
            if (u && u.family === 'charmander') {
                u.scalingValue = this.charmanderN;
                const freq = [0, '三', '二', ''][u.level] || '三';
                const suffix = u.level === 3 ? '每回合' : `每${freq}回合`;
                u.description = `同時對後方敵方造成 ${this.charmanderN} 傷害 (${suffix}後增強)`;
            }
            if (u && u.family === 'pichu') {
                u.scalingValue = this.pichuN;
                const freq = [0, '三', '二', ''][u.level] || '三';
                const suffix = u.level === 3 ? '每回合' : `每${freq}回合`;
                u.description = `戰鬥開始時，對最弱的敵方造成 ${this.pichuN} 傷害 (${suffix}後增強)。`;
            }
        });

        // Sync opponent's units on board (Enemy uses Player wins as scaling value)
        this.opponentTeam.forEach(u => {
            const enemyScale = Math.max(1, this.wins);
            if (u && u.family === 'charmander') {
                u.scalingValue = enemyScale;
                u.description = `同時對後方敵方造成 ${enemyScale} 傷害 (數值固定為我方勝場數)`;
            }
            if (u && u.family === 'pichu') {
                u.scalingValue = enemyScale; // Force same scaling for enemy Pichu
                u.description = `戰鬥開始時，對最弱的敵方造成 ${enemyScale} 傷害 (數值固定為我方勝場數)`;
            }
        });

        // For Psychic: Directly update the global SYNERGIES object so all UI components (including Encyclopedia) see the value.
        const psychic = SYNERGIES.Psychic;
        const template = '[2/3/4] 兩回合後，對隨機 2 位敵方造成 [N] 傷害 (每場戰鬥後增強)';
        psychic.description = template.replace('[N]', Math.floor(this.psychicN).toString());
    }

    public startBattlePhase() {
        this.applyPrepEndSynergies();

        // --- Clear Permanent Buff Visual Tags after Prep phase effects ---
        this.playerTeam.forEach(u => { if (u) u.hasNewPermanentBuff = false; });

        this.compactPlayerTeam(); // Auto-fill empty slots
        this.savedTeam = this.playerTeam.map(u => u ? this.cloneUnit(u) : null); // Proper clone to maintain methods

        // 5. Replace playerTeam with Deep Clones for the battle
        this.playerTeam = this.playerTeam.map(u => u ? this.cloneUnit(u) : null);

        this.phase = GamePhase.BATTLE;
    }

    private compactPlayerTeam() {
        const compacted: (Unit | null)[] = this.playerTeam.filter(u => u !== null);
        while (compacted.length < 5) {
            compacted.push(null);
        }
        this.playerTeam = compacted;
    }

    private applyPrepEndSynergies() {
        // Unique Count Helper
        const getUniqueCount = (units: Unit[], synergyId?: string) => {
            const families = new Set(units.map(u => u.family));
            let count = families.size;

            if (synergyId) {
                const eeveeUnits = units.filter(u => u.family === 'eevee');
                if (eeveeUnits.length > 0) {
                    if (synergyId === 'BatonPass') {
                        // Baton Pass: Unique Eevee forms count as different
                        const uniqueForms = new Set(eeveeUnits.map(u => u.templateId));
                        count += (uniqueForms.size - 1);
                    } else {
                        // Elemental Synergy: If there's an Eevee form that matches the synergy, it counts as 2
                        const matches = eeveeUnits.some(u => {
                            const template = ALL_UNITS[u.templateId];
                            return template.synergies.includes(synergyId) && u.templateId !== 'eevee';
                        });
                        if (matches) count += 1; // Base 1 + Bonus 1 = 2
                    }
                }
            }
            return count;
        };

        // Helper: Apply Synergy Buff
        const applyBuff = (unit: Unit, amount: number, type: 'hp' | 'atk', source: string) => {
            if (type === 'hp') {
                unit.addGrowth(amount, 0);
                console.log(`${source} 羈絆：${unit.name} +${amount} 生命`);
            } else {
                unit.addBuff(amount);
                console.log(`${source} 羈絆：${unit.name} +${amount} 攻擊`);
            }
        };

        // Normal (2/3/4) [Blessing]: Frontmost Friend -> +1/3/5 HP Permanent
        const normalUnits = this.playerTeam.filter(u => u && u.synergies.includes('Normal')) as Unit[];
        const normalCount = getUniqueCount(normalUnits, 'Normal');
        if (normalCount >= 2) {
            const buff = normalCount >= 5 ? 10 : (normalCount >= 4 ? 6 : (normalCount >= 3 ? 4 : 2));
            const frontUnit = this.playerTeam.find(u => u !== null);
            if (frontUnit) {
                applyBuff(frontUnit, buff, 'hp', 'Normal');
            }
        }

        // Ghost (2/3/4) [Shadow]: Frontmost Friend -> +1/3/5 Atk Permanent
        const ghostUnits = this.playerTeam.filter(u => u && u.synergies.includes('Ghost')) as Unit[];
        const ghostCount = getUniqueCount(ghostUnits, 'Ghost');
        if (ghostCount >= 2) {
            const buff = ghostCount >= 5 ? 10 : (ghostCount >= 4 ? 6 : (ghostCount >= 3 ? 4 : 2));
            const frontUnit = this.playerTeam.find(u => u !== null);
            if (frontUnit) {
                applyBuff(frontUnit, buff, 'atk', 'Ghost');
            }
        }

        // Beetle (2): Every Beetle unit -> +4 HP or Attack (prioritize lower stat)
        const beetleUnits = this.playerTeam.filter(u => u && u.synergies.includes('Beetle')) as Unit[];
        const beetleCount = getUniqueCount(beetleUnits, 'Beetle');
        if (beetleCount >= 2) {
            beetleUnits.forEach(u => {
                const addAtk = u.stats.attack < u.stats.maxHp;
                const addHp = u.stats.maxHp < u.stats.attack;

                let choice: 'hp' | 'atk';
                if (addAtk && !addHp) choice = 'atk';
                else if (addHp && !addAtk) choice = 'hp';
                else choice = Math.random() < 0.5 ? 'atk' : 'hp';

                applyBuff(u, 4, choice, 'Beetle');
            });
        }

        const starterUnits = this.playerTeam.filter(u => u && u.synergies.includes('Starter')) as Unit[];
        const starterCount = getUniqueCount(starterUnits, 'Starter');
        if (starterCount >= 3) {
            starterUnits.forEach(u => {
                const buff = starterCount >= 5 ? 2 : 1;
                if (Math.random() < 0.5) {
                    applyBuff(u, buff, 'hp', 'Starter');
                } else {
                    applyBuff(u, buff, 'atk', 'Starter');
                }
            });
        }


        // --- Individual Unit End-of-Prep Abilities ---
        this.playerTeam.forEach(u => {
            if (!u) return;
            // Magnemite: Random +1 Atk or +1 HP (x Lv times)
            if (u.family === 'magnemite') {
                const maxTimes = [0, 1, 2, 3][u.level] || u.level;
                for (let i = 0; i < maxTimes; i++) {
                    const amount = 1;
                    const canAddAtk = u.stats.attack < 50;
                    const canAddHp = u.stats.maxHp < 50;

                    let choice: 'hp' | 'atk';
                    if (canAddAtk && !canAddHp) choice = 'atk';
                    else if (canAddHp && !canAddAtk) choice = 'hp';
                    else choice = Math.random() < 0.5 ? 'atk' : 'hp';

                    if (choice === 'atk') applyBuff(u, amount, 'atk', 'Magnemite');
                    else applyBuff(u, amount, 'hp', 'Magnemite');
                }
            }

            // Cleffa (皮寶寶) family: Backmost perm HP
            if (u.family === 'cleffa') {
                if (u.templateId === 'clefable') { // Level 3 / Clefable
                    this.playerTeam.forEach(target => {
                        if (target && target !== u) applyBuff(target, 3, 'hp', 'Clefable');
                    });
                } else {
                    const idx = this.playerTeam.indexOf(u);
                    if (idx < this.playerTeam.length - 1) {
                        const back = this.playerTeam[idx + 1];
                        if (back) {
                            const amount = u.level === 2 ? 3 : 1;
                            applyBuff(back, amount, 'hp', u.name);
                        }
                    }
                }
            }

            // Togepi (波克比) family: Backmost perm ATK
            if (u.family === 'togepi') {
                if (u.templateId === 'togekiss') { // Level 3 / Togekiss
                    this.playerTeam.forEach(target => {
                        if (target && target !== u) applyBuff(target, 3, 'atk', 'Togekiss');
                    });
                } else {
                    const idx = this.playerTeam.indexOf(u);
                    if (idx < this.playerTeam.length - 1) {
                        const back = this.playerTeam[idx + 1];
                        if (back) {
                            const amount = u.level === 2 ? 3 : 1;
                            applyBuff(back, amount, 'atk', u.name);
                        }
                    }
                }
            }

            // Dratini (迷你龍) family: All allies perm ATK & HP
            if (u.family === 'dratini') {
                const amount = [0, 1, 3, 5][u.level] || 1;
                this.playerTeam.forEach(target => {
                    if (target) {
                        applyBuff(target, amount, 'atk', u.name);
                        applyBuff(target, amount, 'hp', u.name);
                    }
                });
            }
        });
    }

    public endBattle(result: 'WIN' | 'LOSS' | 'DRAW') {
        this.lastResult = result;

        // Record History
        if (this.currentOpponentId) {
            this.battleHistory.push({
                opponentId: this.currentOpponentId,
                result: result
            });

            // Increment stage counters
            if (this.wins < 8) {
                this.gymBattleCount++;
            } else if (this.wins < 12) {
                this.eliteBattleCount++;
            } else {
                this.championBattleCount++;
            }
        }

        if (result === 'WIN') {
            if (this.currentOpponentId) {
                this.defeatedOpponentIds.push(this.currentOpponentId);
            }
            this.wins++;
            if (this.wins === 4) {
                this.lives++;
                console.log("擊敗半數館主 ：+1 生命");
            }
            if (this.wins === 8) {
                this.lives++;
                console.log("擊敗所有館主 ：+1 生命");
            }
            // Elite Four Defeated at Win 12
            if (this.wins === 12) {
                this.lives++;
                console.log("擊敗四大天王 ：+1 生命");
            }
            if (this.wins >= 13) {
                this.phase = GamePhase.VICTORY;
                return;
            }

            // --- Win-based Scaling Trigger ---
            this.processWinScaling();
        } else if (result === 'LOSS') {
            this.lossCount++;
            this.lives--;
            if (this.lives <= 0) {
                this.phase = GamePhase.GAME_OVER;
                return;
            }
        } else if (result === 'DRAW') {
            this.drawCount++;
        }

        // Restore Original Team
        if (this.savedTeam.length > 0) {
            this.playerTeam = this.savedTeam;
            this.savedTeam = [];
        }

        if (result === 'WIN') {
            this.phase = GamePhase.REWARD;
            // Map opponent difficulty to reward tiers (EASY, NORMAL, HARD, EXTREME)
            const difficultyMap: Record<string, string> = {
                'EASY': 'EASY',
                'NORMAL': 'NORMAL',
                'HARD': 'HARD',
                'VERY_HARD': 'EXTREME'
            };
            const rewardDiffRaw = difficultyMap[this.currentOpponentDifficulty] || 'NORMAL';
            this.rewardChoices = this.generateRewardOptions(rewardDiffRaw as any);
        } else {
            this.concludeTurn(result);
        }
    }

    private processWinScaling() {
        // Winner-only scaling removed (moved to processRoundScaling)
    }

    private processRoundScaling() {
        // --- Player Charmander Scaling (Round-based) ---
        let maxCharmanderLevel = 0;
        this.playerTeam.forEach(u => {
            if (u && u.family === 'charmander') {
                maxCharmanderLevel = Math.max(maxCharmanderLevel, u.level);
            }
        });
        if (maxCharmanderLevel > 0) {
            this.charmanderCounter++;
            const threshold = [0, 3, 2, 1][maxCharmanderLevel] || 3;
            if (this.charmanderCounter >= threshold) {
                this.charmanderN++;
                this.charmanderCounter = 0;
                console.log(`小火龍家族技能增強！目前威力：${this.charmanderN}`);
            }
        }

        // --- Player Pichu Scaling (Round-based) ---
        let maxPichuLevel = 0;
        this.playerTeam.forEach(u => {
            if (u && u.family === 'pichu') {
                maxPichuLevel = Math.max(maxPichuLevel, u.level);
            }
        });
        if (maxPichuLevel > 0) {
            this.pichuCounter++;
            const threshold = [0, 3, 2, 1][maxPichuLevel] || 3;
            if (this.pichuCounter >= threshold) {
                this.pichuN += 2;
                this.pichuCounter = 0;
                console.log(`皮丘家族技能增強！目前威力：${this.pichuN}`);
            }
        }

        // --- Player Psychic Scaling (Round-based) ---
        const psychicUnits = this.playerTeam.filter(u => u && u.synergies.includes('Psychic')) as Unit[];
        const families = new Set(psychicUnits.map(u => u.family));
        const pCount = families.size;
        if (pCount >= 2) {
            let increment = 0;
            if (pCount >= 4) {
                increment = 2;
            } else if (pCount === 3) {
                // Odd Round +2, Even Round +1 (Turn 1 is odd)
                increment = (this.turn % 2 === 1) ? 2 : 1;
            } else {
                increment = 1;
            }
            this.psychicN += increment;
            console.log(`念力羈絆增強！累積威力：${this.psychicN} (+${increment}) - 當前回合：${this.turn}`);
        }
    }

    public generateRewardOptions(difficulty: any): any[] {
        // 1. Get player synergies
        const playerSynergies = new Set<string>();
        this.playerTeam.forEach(u => {
            if (u) u.synergies.forEach(s => playerSynergies.add(s));
        });

        // 2. Filter REWARD_DATA by difficulty
        const diffData = REWARD_DATA.filter((r: any) => r.difficulty === difficulty);

        // 3. Define Pools
        // Pool 1: 資源類 (GOLD, EXP, LIVES)
        const pool1Categories = ['GOLD', 'EXP', 'LIVES'];
        const pool1 = diffData.filter((r: any) =>
            pool1Categories.includes(r.category)
        );

        // Pool 2: 通用強化類 (BATTLE_NONE, Mints, and Evolutionary Items)
        const pool2Items = ['幸運蛋', '不變之石', '進化奇石'];
        const pool2 = diffData.filter((r: any) =>
            r.category === 'BATTLE_NONE' ||
            (r.category === 'PERM_NONE' && r.item.includes('薄荷')) ||
            pool2Items.includes(r.item)
        );

        // Pool 3: 羈絆強化類 (PERM_SYNERGY, BATTLE_SYNERGY)
        let pool3 = diffData.filter((r: any) =>
            (r.category === 'PERM_SYNERGY' || r.category === 'BATTLE_SYNERGY')
        );

        // EXTRA FILTER for Modern Edition (or any edition with restricted units):
        // Only include synergy rewards if that synergy actually has characters in the current edition.
        const availableSynergies = new Set<string>();
        this.edition.availableUnitIds.forEach(id => {
            const u = ALL_UNITS[id];
            if (u && u.synergies) {
                u.synergies.forEach(s => availableSynergies.add(s));
            }
        });
        pool3 = pool3.filter(r => !r.synergyId || availableSynergies.has(r.synergyId));

        // 4. Selection Logic: Strict One from Each Pool
        const results: any[] = [];
        const shuffle = (array: any[]) => [...array].sort(() => Math.random() - 0.5);

        // Pick from Pool 1
        const shuffledP1 = shuffle(pool1);
        if (shuffledP1.length > 0) results.push(shuffledP1[0]);

        // Pick from Pool 2
        const shuffledP2 = shuffle(pool2);
        if (shuffledP2.length > 0) results.push(shuffledP2[0]);

        // Pick from Pool 3 (Prioritize player's synergies)
        const matchingPool3 = pool3.filter(r => r.synergyId && playerSynergies.has(r.synergyId));
        const finalPool3 = matchingPool3.length > 0 ? matchingPool3 : pool3;
        const shuffledP3 = shuffle(finalPool3);
        if (shuffledP3.length > 0) results.push(shuffledP3[0]);

        // 5. Fallback: If we don't have 3 unique choices, fill from all items
        if (results.length < 3) {
            const allItems = shuffle(diffData);
            for (const item of allItems) {
                if (results.length >= 3) break;
                if (!results.some(r => r.item === item.item)) {
                    results.push(item);
                }
            }
        }

        // Final safety check and shuffle the display order
        return shuffle(results).slice(0, 3);
    }

    public applyReward(reward: any) {
        console.log(`正在應用獎勵：${reward.item}`);

        const targetUnits = this.playerTeam.filter(u => u !== null) as Unit[];

        switch (reward.category) {
            case 'GOLD':
                const goldMatch = reward.effect.match(/\+(\d+)/);
                if (goldMatch) {
                    this.pendingGoldBonus += parseInt(goldMatch[1]);
                } else if (reward.item === '老千骰子') {
                    const diceMatch = reward.effect.match(/(\d+)次/);
                    if (diceMatch) this.pendingFreeRerolls += parseInt(diceMatch[1]);
                }
                break;
            case 'EXP':
                const expMatch = reward.effect.match(/\+(\d+)/);
                const expAmount = expMatch ? parseInt(expMatch[1]) : 1;

                if (reward.effect.includes('全體')) {
                    targetUnits.forEach(u => this.applyExpToUnit(u, expAmount));
                } else {
                    // Random target(s) based on text - Filter out Max Level units
                    const eligibleUnits = targetUnits.filter(u => u.level < 3);
                    let count = 1;

                    const randomMatch = reward.effect.match(/隨機(\d+)名/);
                    if (randomMatch) {
                        count = parseInt(randomMatch[1]);
                    } else if (reward.effect.includes('兩位')) {
                        count = 2;
                    } else if (reward.effect.includes('三位')) {
                        count = 3;
                    }

                    const shuffled = [...eligibleUnits].sort(() => 0.5 - Math.random());
                    shuffled.slice(0, count).forEach(u => this.applyExpToUnit(u, expAmount));
                }
                break;
            case 'PERM_NONE':
            case 'PERM_SYNERGY':
                this.applyPermanentReward(reward, targetUnits);
                break;
            case 'BATTLE_NONE':
            case 'BATTLE_SYNERGY':
                this.nextBattleBuffs.push(reward);
                break;
            case 'LIVES':
                const livesMatch = reward.effect.match(/\+(\d+)/);
                if (livesMatch) {
                    this.lives += parseInt(livesMatch[1]);
                    console.log(`玩家生命增加：${livesMatch[1]}`);
                }
                break;
        }

        this.rewardChoices = []; // Clear choices in engine
        this.concludeTurn('WIN');
    }

    private applyExpToUnit(unit: Unit, amount: number) {
        unit.exp += amount;
        unit.hasNewPermanentBuff = true; // Trigger glow for EXP rewards

        // Loop to handle potential multiple level-ups/evolutions (e.g., from Lv1 straight to Lv3)
        let canStillLevelUp = true;
        while (canStillLevelUp) {
            canStillLevelUp = false;

            // Check thresholds
            if (unit.exp >= 9 && unit.level < 3) {
                // Trigger Level 3 (Evolve if applicable)
                const dummy = new Unit(ALL_UNITS[unit.family]);
                this.mergeUnits(unit, dummy);
                canStillLevelUp = true; // Check again after merge/evolution
            } else if (unit.exp >= 3 && unit.level < 2) {
                // Trigger Level 2 (Evolve if applicable)
                const dummy = new Unit(ALL_UNITS[unit.family]);
                this.mergeUnits(unit, dummy);
                canStillLevelUp = true;
            }
        }
    }

    private applyPermanentReward(reward: any, units: Unit[]) {
        const atkMatch = reward.effect.match(/\+(\d+)\s*(?:攻擊|攻)/);
        const hpMatch = reward.effect.match(/\+(\d+)\s*(?:生命|HP)/);
        const atkMinus = reward.effect.match(/-(\d+)\s*(?:攻擊|攻)/);
        const hpMinus = reward.effect.match(/-(\d+)\s*(?:生命|HP)/);

        const atk = (atkMatch ? parseInt(atkMatch[1]) : 0) - (atkMinus ? parseInt(atkMinus[1]) : 0);
        const hp = (hpMatch ? parseInt(hpMatch[1]) : 0) - (hpMinus ? parseInt(hpMinus[1]) : 0);

        let targets: Unit[] = [];
        if (reward.effect.includes('首位')) {
            const first = this.playerTeam.find(u => u !== null);
            if (first) targets = [first];
        } else if (reward.effect.includes('全體')) {
            targets = units;
        } else if (reward.effect.includes('隨機角色')) {
            const shuffled = [...units].sort(() => 0.5 - Math.random());
            if (shuffled.length > 0) targets = [shuffled[0]];
        } else if (reward.effect.includes('未進化') || reward.item === '幸運蛋') {
            targets = units.filter(u => {
                const baseTemplate = ALL_UNITS[u.family];
                return u.name === baseTemplate.name; // "Not evolved" if name matches base family name
            });
        } else if (reward.effect.includes('已進化') || reward.item === '進化奇石') {
            targets = units.filter(u => {
                const baseTemplate = ALL_UNITS[u.family];
                return u.name !== baseTemplate.name; // "Evolved" if name changed from base species
            });
        } else if (reward.effect.includes('無法進化') || reward.item === '不變之石') {
            targets = units.filter(u => {
                // Rule: If unit has no evolution id OR the evolution results in same name
                if (!u.evolveId) return true;
                const nextTemplate = ALL_UNITS[u.evolveId];
                return !nextTemplate || nextTemplate.name === u.name;
            });
        } else if (reward.synergyId) {
            targets = units.filter(u => u.synergies.includes(reward.synergyId));
        }

        targets.forEach(u => {
            let finalHp = hp;
            let finalAtk = atk;

            // Randomized Stat Mechanism: "攻擊或生命"
            if (reward.effect.includes('攻擊或生命')) {
                const amountMatch = reward.effect.match(/\+(\d+)/);
                const amount = amountMatch ? parseInt(amountMatch[1]) : 1;
                if (Math.random() < 0.5) {
                    finalAtk = amount;
                    finalHp = 0;
                } else {
                    finalAtk = 0;
                    finalHp = amount;
                }
            }

            u.addGrowth(finalHp, finalAtk);
            u.hasNewPermanentBuff = true;
            // Also apply to the permanent version in savedTeam
            const savedUnit = this.savedTeam.find(su => su && su.id === u.id);
            if (savedUnit) {
                savedUnit.addGrowth(finalHp, finalAtk);
                savedUnit.hasNewPermanentBuff = true;
            }
        });
    }

    private concludeTurn(result: string) {
        // Update Difficulty Score: Loss protection (Slower increase on loss)
        if (result === 'LOSS') {
            this.difficultyScore += 0.25;
        } else if (result === 'DRAW') {
            this.difficultyScore += 0.5;
        } else {
            this.difficultyScore += 1.0;
        }

        // --- Round-based Scaling Trigger ---
        this.processRoundScaling();

        this.turn++;
        this.startShopPhase();
    }

    // Actions
    public reroll() {
        if (this.freeRerolls > 0) {
            this.freeRerolls--;
            (this.shop as any).roll(this.turn, this.edition?.availableUnitIds);
            console.log(`使用免費刷新！剩餘次數：${this.freeRerolls}`);
        } else if (this.gold >= 1) {
            this.gold -= 1;
            (this.shop as any).roll(this.turn, this.edition?.availableUnitIds);
        }
    }

    public buyUnit(shopIndex: number, targetIndex?: number): number | null {
        const cost = 3;
        if (this.gold < cost) return null;

        const shopUnit = this.shop.slots[shopIndex];
        if (!shopUnit) return null;

        // Helper to finalize purchase (Switch Image)
        const finalizePurchase = (unit: Unit) => {
            if (unit.battleImageUrl) {
                unit.imageUrl = unit.battleImageUrl;
            }
            return unit;
        };

        // 1. Target Specified (Drag to Buy)
        if (targetIndex !== undefined) {
            if (targetIndex < 0 || targetIndex >= this.playerTeam.length) return null;

            const targetUnit = this.playerTeam[targetIndex];

            // A. Target Empty -> Buy directly
            if (!targetUnit) {
                this.gold -= cost;
                const boughtUnit = this.shop.buy(shopIndex);
                if (boughtUnit) {
                    this.playerTeam[targetIndex] = finalizePurchase(boughtUnit);
                    return targetIndex;
                }
                return null;
            }

            // B. Target Same Family AND Same Name -> Merge
            if (targetUnit.family === shopUnit.family && targetUnit.name === shopUnit.name) {
                // Check Max Level
                if (targetUnit.level >= 3) return null;

                this.gold -= cost;
                const boughtUnit = this.shop.buy(shopIndex);
                if (boughtUnit) {
                    this.mergeUnits(targetUnit, boughtUnit);
                    return targetIndex;
                }
                return null;
            }

            return null;
        }

        // 2. No Target (Click Buy)
        const emptySlotIndex = this.playerTeam.indexOf(null);

        // A. If Empty Slot Exists -> Buy there
        if (emptySlotIndex !== -1) {
            this.gold -= cost;
            const boughtUnit = this.shop.buy(shopIndex);
            if (boughtUnit) {
                this.playerTeam[emptySlotIndex] = finalizePurchase(boughtUnit);
                return emptySlotIndex;
            }
        }
        // B. If Full -> Check Auto-Merge
        else {
            // Find merge target by Family AND Name
            const mergeIdx = this.playerTeam.findIndex(u => u && u.family === shopUnit.family && u.name === shopUnit.name && u.level < 3);
            if (mergeIdx !== -1) {
                const mergeTarget = this.playerTeam[mergeIdx];
                if (mergeTarget) {
                    this.gold -= cost;
                    const boughtUnit = this.shop.buy(shopIndex);
                    if (boughtUnit) {
                        this.mergeUnits(mergeTarget, boughtUnit);
                        return mergeIdx;
                    }
                }
            }

            // C. Special: Triple Buy -> Evolve -> Merge into Board Evolved Unit
            const copiesIndices: number[] = [];
            this.shop.slots.forEach((u, i) => {
                if (u && u.templateId === shopUnit.templateId) copiesIndices.push(i);
            });

            if (copiesIndices.length >= 3 && this.gold >= cost * 3 && shopUnit.evolveId) {
                const targetIdx = this.playerTeam.findIndex(u => u && u.templateId === shopUnit.evolveId && u.level < 3);
                if (targetIdx !== -1) {
                    const evolveTarget = this.playerTeam[targetIdx];
                    if (evolveTarget) {
                        this.gold -= cost * 3;
                        const indicesToBuy = copiesIndices.slice(0, 3);
                        indicesToBuy.forEach(idx => this.shop.buy(idx));
                        const evolvedTemplate = ALL_UNITS[shopUnit.evolveId];
                        if (evolvedTemplate) {
                            const virtualUnit = new Unit(evolvedTemplate);
                            virtualUnit.exp = 3;
                            this.mergeUnits(evolveTarget, virtualUnit);
                            this.checkChainMerges(evolveTarget);
                            return targetIdx;
                        }
                    }
                }
            }
        }

        return null;
    }

    private checkChainMerges(unit: Unit) {
        // Find if there's ANOTHER unit on the board with the same ID and Name that isn't this one
        const other = this.playerTeam.find(u => u && u !== unit && u.family === unit.family && u.name === unit.name && u.level < 3);
        if (other) {
            console.log(`${unit.name} 觸發了連鎖合成！`);
            const idxOther = this.playerTeam.indexOf(other);

            // Standard merge: higher exp/stats unit absorbs the other
            this.mergeUnits(unit, other);
            this.playerTeam[idxOther] = null;

            // Recurse to see if there's a third one etc.
            this.checkChainMerges(unit);
        }
    }

    public sellUnit(index: number) {
        if (index >= 0 && index < this.playerTeam.length && this.playerTeam[index]) {
            const unit = this.playerTeam[index];
            if (!unit) return;

            // Special: Sell Trigger for certain families
            const sellTriggerFamilies = ['mankey', 'dwebble', 'ekans', 'wynaut'];
            if (sellTriggerFamilies.includes(unit.family)) {
                console.log(`${unit.name} (等級 ${unit.level}) 觸發了出售效果`);
                this.triggerMergeEffect(unit);
            }

            this.gold += 1;
            this.playerTeam[index] = null;
        }
    }

    public moveUnit(fromIndex: number, toIndex: number) {
        const u1 = this.playerTeam[fromIndex];
        const u2 = this.playerTeam[toIndex];

        if (!u1) return;

        // Check if Same Family AND Name AND Not Max Level -> Merge
        if (u2 && u1.family === u2.family && u1.name === u2.name && u2.level < 3 && u1.level < 3) {
            // Merge u1 INTO u2
            this.mergeUnits(u2, u1);
            this.playerTeam[fromIndex] = null;
        } else {
            // Swap
            this.playerTeam[fromIndex] = u2;
            this.playerTeam[toIndex] = u1;
        }
    }

    private mergeUnits(target: Unit, source: Unit) {
        const sourcePower = source.stats.attack + source.stats.maxHp;
        const targetPower = target.stats.attack + target.stats.maxHp;

        if (sourcePower > targetPower) {
            target.stats = { ...source.stats };
            target.imageUrl = source.imageUrl;
            target.battleImageUrl = source.battleImageUrl;
        }

        target.scalingValue = Math.max(target.scalingValue, source.scalingValue);

        const expGain = (target.family === 'eevee') ? source.exp * 2 : source.exp;
        const totalExp = target.exp + expGain;
        const oldLevel = target.level;
        let predictedLevel = 1;
        if (totalExp >= 9) predictedLevel = 3;
        else if (totalExp >= 3) predictedLevel = 2;
        else predictedLevel = 1;

        predictedLevel = Math.max(predictedLevel, oldLevel);

        const willLevelUp = predictedLevel > oldLevel;
        const willEvolve = !!target.evolveId && willLevelUp;

        this.triggerMergeEffect(target);

        if (willLevelUp) {
            if (willEvolve) {
                this.performEvolution(target);
            } else if (target.family === 'eevee') {
                this.performEeveeEvolution(target, predictedLevel);
            } else {
                target.level = predictedLevel;
                const base = ALL_UNITS[target.family].baseStats;
                const multiplier = 1;
                target.addGrowth(base.maxHp * multiplier, base.attack * multiplier);
                console.log(`${target.name} Level Up (Non-Evolve) -> +${base.maxHp * multiplier}/+${base.attack * multiplier}`);
            }
        } else {
            target.addGrowth(expGain, expGain);
            console.log(`${target.name} absorbs ${expGain} exp. +${expGain}/+${expGain} Stats.`);
        }
        target.exp = totalExp;
        console.log(`${target.name} Merged: Exp ${totalExp} (Level ${target.level})`);
    }

    private performEeveeEvolution(unit: Unit, newLevel: number) {
        unit.level = newLevel;
        // Only evolve if currently base form Eevee
        if (unit.templateId === 'eevee') {
            const forms = ['flareon', 'vaporeon', 'jolteon', 'espeon', 'umbreon', 'leafeon', 'glaceon', 'sylveon'];
            const chosen = forms[Math.floor(Math.random() * forms.length)];
            const template = ALL_UNITS[chosen];

            unit.templateId = template.id;
            unit.name = template.name;
            unit.imageUrl = template.battleImageUrl || template.imageUrl;
            unit.battleImageUrl = template.battleImageUrl;
            unit.description = template.description;
            unit.synergies = [...template.synergies];
            console.log(`伊布進化了！變成了 ${unit.name}`);
        } else {
            console.log(`${unit.name} 等級提升，保持原有型態。`);
        }

        // Apply Growth (Same as non-evolve logic but for Eevee)
        const base = ALL_UNITS[unit.family].baseStats;
        unit.addGrowth(base.maxHp, base.attack);
    }

    private performEvolution(unit: Unit) {
        if (!unit.evolveId) return;

        const newTemplate = ALL_UNITS[unit.evolveId];
        const baseTemplate = ALL_UNITS[unit.family];

        if (newTemplate && baseTemplate) {
            const multiplier = 1;
            const bonus = baseTemplate.baseStats;
            unit.addGrowth(bonus.maxHp * multiplier, bonus.attack * multiplier);

            unit.templateId = newTemplate.id;
            unit.name = newTemplate.name;
            unit.description = newTemplate.description;
            unit.imageUrl = newTemplate.battleImageUrl || newTemplate.imageUrl;
            unit.battleImageUrl = newTemplate.battleImageUrl;
            unit.evolveId = newTemplate.evolveId;
            unit.synergies = newTemplate.synergies || [];
            unit.tier = newTemplate.tier;
            unit.level += 1;

            console.log(`Evolution! ${unit.name} (Stage ${unit.level}) with Bonus + ${bonus.maxHp}/+${bonus.attack}`);
        }
    }

    private triggerMergeEffect(unit: Unit) {
        if (unit.family === 'mankey') {
            if (unit.level === 3) {
                this.playerTeam.filter(u => u && u !== unit).forEach(u => {
                    u!.addBuff(10);
                });
            } else {
                const team = this.playerTeam;
                const idx = team.indexOf(unit);
                if (idx > 0) {
                    const front = team[idx - 1];
                    if (front) {
                        const amount = unit.level === 2 ? 4 : 2;
                        front.addBuff(amount);
                    }
                }
            }
        }

        if (unit.family === 'dwebble') {
            if (unit.level === 3) {
                this.playerTeam.filter(u => u && u !== unit).forEach(u => {
                    u!.addGrowth(10, 0);
                });
            } else {
                const team = this.playerTeam;
                const idx = team.indexOf(unit);
                if (idx > 0) {
                    const front = team[idx - 1];
                    if (front) {
                        const amount = unit.level === 2 ? 4 : 2;
                        front.addGrowth(amount, 0);
                    }
                }
            }
        }

        // Removed caterpie logic because it was moved to battle start.

        if (unit.family === 'ekans') {
            if (unit.templateId === 'arbok_final') { // Level 3
                this.playerTeam.filter(u => u && u !== unit).forEach(u => u!.addBuff(10));
            } else {
                const idx = this.playerTeam.indexOf(unit);
                if (idx < this.playerTeam.length - 1) {
                    const back = this.playerTeam[idx + 1];
                    if (back) {
                        const amount = unit.templateId === 'arbok' ? 5 : 2;
                        back.addBuff(amount);
                    }
                }
            }
        }

        if (unit.family === 'wynaut') {
            if (unit.templateId === 'wobbuffet_final') { // Level 3
                this.playerTeam.filter(u => u && u !== unit).forEach(u => u!.addGrowth(10, 0));
            } else {
                const idx = this.playerTeam.indexOf(unit);
                if (idx < this.playerTeam.length - 1) {
                    const back = this.playerTeam[idx + 1];
                    if (back) {
                        const amount = unit.templateId === 'wobbuffet' ? 5 : 2;
                        back.addGrowth(amount, 0);
                    }
                }
            }
        }
    }

    private cloneUnit(unit: Unit): Unit {
        const template = ALL_UNITS[unit.templateId];
        if (!template) return unit;

        const clone = new Unit(template);
        clone.id = unit.id;
        clone.name = unit.name;
        clone.level = unit.level;
        clone.exp = unit.exp;
        clone.stats = { ...unit.stats };
        clone.tier = unit.tier;
        clone.imageUrl = unit.imageUrl;
        clone.battleImageUrl = unit.battleImageUrl;
        clone.evolveId = unit.evolveId;
        clone.synergies = [...unit.synergies];
        clone.family = unit.family;
        clone.scalingValue = unit.scalingValue;
        clone.hasNewPermanentBuff = unit.hasNewPermanentBuff;

        return clone;
    }
}
