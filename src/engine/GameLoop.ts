
import { Unit } from '../models/Unit';
import { Shop } from '../models/Shop';
import { UNIT_TEMPLATES } from '../models/UnitFactory';
import { SYNERGIES } from '../models/Synergies';
import { REWARD_DATA } from '../models/RewardData';

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

    public charmanderN: number = 1;
    public charmanderCounter: number = 0;
    public psychicN: number = 2;

    public playerTeam: (Unit | null)[] = [null, null, null, null, null];
    public savedTeam: (Unit | null)[] = []; // Store original team before battle
    public shop: Shop;
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

    constructor() {
        this.shop = new Shop();
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
    }

    public startShopPhase() {
        this.phase = GamePhase.SHOP;
        this.gold = 10 + this.pendingGoldBonus;
        this.pendingGoldBonus = 0;
        this.freeRerolls = this.pendingFreeRerolls;
        this.pendingFreeRerolls = 0;

        // --- Charmander Scaling (Shared, based on max level) ---
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

        this.shop.roll(this.turn);
    }

    private refreshSpecialDescriptions() {
        // Update templates so shop shows CURRENT N value and correct frequency
        UNIT_TEMPLATES.charmander.description = `同時對後排敵方造成 ${this.charmanderN} 傷害 (三場戰鬥後增強)。`;
        UNIT_TEMPLATES.charmeleon.description = `同時對後排敵方造成 ${this.charmanderN} 傷害 (兩場戰鬥後增強)。`;
        UNIT_TEMPLATES.charizard.description = `同時對後排敵方造成 ${this.charmanderN} 傷害 (每場戰鬥後增強)。`;

        // Sync static template scaling values to current global N
        (UNIT_TEMPLATES.charmander as any).scalingValue = this.charmanderN;
        (UNIT_TEMPLATES.charmeleon as any).scalingValue = this.charmanderN;
        (UNIT_TEMPLATES.charizard as any).scalingValue = this.charmanderN;

        // Sync units in shop (including frozen ones)
        this.shop.slots.forEach(u => {
            if (u && u.family === 'charmander') {
                u.scalingValue = this.charmanderN;
                const freq = [0, '三', '兩', '一'][u.level] || '三';
                const prefix = u.level === 3 ? '每' : '';
                u.description = `同時對後排敵方造成 ${this.charmanderN} 傷害 (${prefix}${freq}場戰鬥後增強)。`;
            }
        });

        // Sync player's units on board
        this.playerTeam.forEach(u => {
            if (u && u.family === 'charmander') {
                u.scalingValue = this.charmanderN;
                const freq = [0, '三', '兩', '一'][u.level] || '三';
                const prefix = u.level === 3 ? '每' : '';
                u.description = `同時對後排敵方造成 ${this.charmanderN} 傷害 (${prefix}${freq}場戰鬥後增強)。`;
            }
        });

        // For Psychic: Directly update the global SYNERGIES object so all UI components (including Encyclopedia) see the value.
        const psychic = SYNERGIES.Psychic;
        const template = '[2/3/4/5] 兩回合後，對隨機 3 位敵方造成 [N] 點傷害 (每場戰鬥後增強)';
        psychic.description = template.replace('[N]', this.psychicN.toString());
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
        const getUniqueCount = (units: Unit[]) => {
            const families = new Set(units.map(u => u.family));
            console.log(`Checking Synergy Count: ${families.size} unique families found.`);
            return families.size;
        };

        // Helper: Apply Synergy Buff
        const applyBuff = (unit: Unit, amount: number, type: 'hp' | 'atk', source: string) => {
            if (type === 'hp') {
                unit.addGrowth(amount, 0);
                console.log(`${source} Synergy: ${unit.name} +${amount} HP`);
            } else {
                unit.addBuff(amount);
                console.log(`${source} Synergy: ${unit.name} +${amount} Atk`);
            }
        };

        // Normal (2/3/4) [Blessing]: Frontmost Friend -> +1/3/5 HP Permanent
        const normalUnits = this.playerTeam.filter(u => u && u.synergies.includes('Normal')) as Unit[];
        const normalCount = getUniqueCount(normalUnits);
        if (normalCount >= 2) {
            const buff = normalCount >= 5 ? 10 : (normalCount >= 4 ? 6 : (normalCount >= 3 ? 4 : 2));
            const frontUnit = this.playerTeam.find(u => u !== null);
            if (frontUnit) {
                applyBuff(frontUnit, buff, 'hp', 'Normal');
            }
        }

        // Ghost (2/3/4) [Shadow]: Frontmost Friend -> +1/3/5 Atk Permanent
        const ghostUnits = this.playerTeam.filter(u => u && u.synergies.includes('Ghost')) as Unit[];
        const ghostCount = getUniqueCount(ghostUnits);
        if (ghostCount >= 2) {
            const buff = ghostCount >= 5 ? 10 : (ghostCount >= 4 ? 6 : (ghostCount >= 3 ? 4 : 2));
            const frontUnit = this.playerTeam.find(u => u !== null);
            if (frontUnit) {
                applyBuff(frontUnit, buff, 'atk', 'Ghost');
            }
        }

        // Beetle (2): Every Beetle unit -> +4 HP or Attack (prioritize lower stat)
        const beetleUnits = this.playerTeam.filter(u => u && u.synergies.includes('Beetle')) as Unit[];
        const beetleCount = getUniqueCount(beetleUnits);
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
        const starterCount = getUniqueCount(starterUnits);
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
        });
    }

    public endBattle(result: 'WIN' | 'LOSS' | 'DRAW') {
        this.lastResult = result;
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
        } else if (result === 'LOSS') {
            this.lives--;
            if (this.lives <= 0) {
                this.phase = GamePhase.GAME_OVER;
                return;
            }
        }

        // Restore Original Team
        if (this.savedTeam.length > 0) {
            this.playerTeam = this.savedTeam;
            this.savedTeam = [];
        }

        if (result === 'WIN') {
            this.phase = GamePhase.REWARD;
            // Map opponent difficulty to reward difficulty
            const difficultyMap: Record<string, string> = {
                'NOVICE': 'EASY',
                'QUALIFIED': 'NORMAL',
                'GREAT': 'HARD',
                'ULTRA': 'EXTREME',
                'MASTER': 'EXTREME',
                'ELITE': 'EXTREME',
                'CHAMPION': 'EXTREME'
            };
            const rewardDiffRaw = ['EASY', 'NORMAL', 'HARD', 'EXTREME'].includes(this.currentOpponentDifficulty)
                ? this.currentOpponentDifficulty
                : (difficultyMap[this.currentOpponentDifficulty] || 'NORMAL');
            this.rewardChoices = this.generateRewardOptions(rewardDiffRaw as any);
        } else {
            this.concludeTurn(result);
        }
    }

    public generateRewardOptions(difficulty: any): any[] {

        // 1. Get player synergies (including inactive ones)
        const playerSynergies = new Set<string>();
        this.playerTeam.forEach(u => {
            if (u) u.synergies.forEach(s => playerSynergies.add(s));
        });

        // 2. Filter pool and assign weights
        let pool = REWARD_DATA.filter((r: any) => {
            // Difficulty match
            if (r.difficulty !== difficulty) return false;

            // Synergy match logic
            if (r.category === 'PERM_SYNERGY' || r.category === 'BATTLE_SYNERGY') {
                return playerSynergies.has(r.synergyId);
            }

            // Fixed categories always included
            return true;
        }).map(r => {
            // Weights: Mint = 0.5, Synergy = 1.0, Generic = 2.0
            let weight = 1.0;
            const isGeneric = ['GOLD', 'EXP', 'LIVES', 'PERM_NONE', 'BATTLE_NONE'].includes(r.category);
            const isMint = r.item.includes('薄荷');

            if (isMint) weight = 0.5;
            else if (isGeneric) weight = 2.0;
            else weight = 1.0; // Synergies

            return { ...r, weight };
        });

        // 3. Pick 3 unique items using weighted random selection
        const results: any[] = [];
        for (let i = 0; i < 3; i++) {
            if (pool.length === 0) break;

            const totalWeight = pool.reduce((sum, r) => sum + r.weight, 0);
            let random = Math.random() * totalWeight;

            for (let j = 0; j < pool.length; j++) {
                random -= pool[j].weight;
                if (random <= 0) {
                    const picked = pool.splice(j, 1)[0];
                    results.push(picked);
                    break;
                }
            }
        }
        return results;
    }

    public applyReward(reward: any) {
        console.log(`Applying Reward: ${reward.item}`);

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
                const dummy = new Unit(UNIT_TEMPLATES[unit.family]);
                this.mergeUnits(unit, dummy);
                canStillLevelUp = true; // Check again after merge/evolution
            } else if (unit.exp >= 3 && unit.level < 2) {
                // Trigger Level 2 (Evolve if applicable)
                const dummy = new Unit(UNIT_TEMPLATES[unit.family]);
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
            targets = units.filter(u => u.level === 1);
        } else if (reward.effect.includes('已進化') || reward.item === '進化奇石') {
            targets = units.filter(u => u.level > 1);
        } else if (reward.effect.includes('無法進化') || reward.item === '不變之石') {
            targets = units.filter(u => {
                // Case 1: No evolution chain
                if (!u.evolveId) return true;
                // Case 2: Chain exists but next stage has same name (e.g. Raticate -> Raticate)
                const nextTemplate = UNIT_TEMPLATES[u.evolveId];
                if (nextTemplate && nextTemplate.name === u.name) return true;
                return false;
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

        // --- Psychic Synergy Scaling (Cumulative) ---
        const psychicUnits = this.playerTeam.filter(u => u && u.synergies.includes('Psychic')) as Unit[];
        const families = new Set(psychicUnits.map(u => u.family));
        const pCount = families.size;
        if (pCount >= 2) {
            const increment = pCount >= 4 ? 3 : (pCount >= 3 ? 2 : 1);
            this.psychicN += increment;
            console.log(`念力羈絆增強！累積威力：${this.psychicN} (+${increment})`);
        }

        this.turn++;
        this.startShopPhase();
    }

    // Actions
    public reroll() {
        if (this.freeRerolls > 0) {
            this.freeRerolls--;
            this.shop.roll(this.turn);
            console.log(`使用免費刷新！剩餘次數：${this.freeRerolls}`);
        } else if (this.gold >= 1) {
            this.gold -= 1;
            this.shop.roll(this.turn);
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
                        const evolvedTemplate = UNIT_TEMPLATES[shopUnit.evolveId];
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
            console.log(`Chain Merge Triggered for ${unit.name}`);
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

            // Special: Sell Trigger for Mankey/Dwebble (All Levels)
            if (unit.family === 'mankey' || unit.family === 'dwebble') {
                console.log(`Sell Trigger for ${unit.name} (Lv ${unit.level})`);
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

        const totalExp = target.exp + source.exp;
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
            } else {
                target.level = predictedLevel;
                const base = UNIT_TEMPLATES[target.family].baseStats;
                const multiplier = 1;
                target.addGrowth(base.maxHp * multiplier, base.attack * multiplier);
                console.log(`${target.name} Level Up (Non-Evolve) -> +${base.maxHp * multiplier}/+${base.attack * multiplier}`);
            }
        } else {
            target.addGrowth(source.exp, source.exp);
            console.log(`${target.name} absorbs ${source.exp} exp. +${source.exp}/+${source.exp} Stats.`);
        }
        target.exp = totalExp;
        console.log(`${target.name} Merged: Exp ${totalExp} (Level ${target.level})`);
    }

    private performEvolution(unit: Unit) {
        if (!unit.evolveId) return;

        const newTemplate = UNIT_TEMPLATES[unit.evolveId];
        const baseTemplate = UNIT_TEMPLATES[unit.family];

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
    }

    private cloneUnit(unit: Unit): Unit {
        const template = UNIT_TEMPLATES[unit.templateId];
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
