
import { Unit } from '../models/Unit';
import { Shop } from '../models/Shop';
import { UNIT_TEMPLATES } from '../models/UnitFactory';

export const GamePhase = {
    SHOP: 'SHOP',
    BATTLE: 'BATTLE',
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

    public playerTeam: (Unit | null)[] = [null, null, null, null, null];
    public savedTeam: (Unit | null)[] = []; // Store original team before battle
    public shop: Shop;

    constructor() {
        this.shop = new Shop();
        this.startShopPhase();
    }

    public startShopPhase() {
        this.phase = GamePhase.SHOP;
        this.gold = 10;

        // Turn Start Abilities
        this.playerTeam.forEach(u => {
            if (!u) return;

            // Meowth: Gain N Gold (1/3/5)
            if (u.family === 'meowth') {
                const amount = [0, 1, 3, 5][u.level] || 1;
                this.gold += amount;
                console.log(`${u.name} grants ${amount} gold!`);
            }
        });

        this.shop.roll(this.turn);
    }

    public startBattlePhase() {
        // 3. Apply PREP END Synergies (Permanent Buffs)
        this.applyPrepEndSynergies();

        // 4. Save Original Team
        this.savedTeam = [...this.playerTeam];

        // 5. Replace playerTeam with Deep Clones for the battle
        this.playerTeam = this.playerTeam.map(u => u ? this.cloneUnit(u) : null);

        this.phase = GamePhase.BATTLE;
    }

    private applyPrepEndSynergies() {
        // Unique Count Helper
        const getUniqueCount = (units: Unit[]) => {
            const families = new Set(units.map(u => u.family));
            console.log(`Checking Synergy Count: ${families.size} unique families found.`);
            return families.size;
        };

        // Helper: Apply Synergy Buff & Check Sneasel + Claw Passive
        const applyBuff = (unit: Unit, amount: number, type: 'hp' | 'atk', source: string) => {
            const clawCount = getUniqueCount(this.playerTeam.filter(u => u && u.synergies.includes('Claw')) as Unit[]);

            if (type === 'hp') {
                unit.addGrowth(amount, 0);
                console.log(`${source} Synergy: ${unit.name} +${amount} HP`);
            } else {
                unit.addBuff(amount);
                console.log(`${source} Synergy: ${unit.name} +${amount} Atk`);
            }

            // Sneasel: On Buff (Prep Phase) -> Gain +2 Atk
            if (unit.family === 'sneasel') {
                unit.addBuff(2);
                console.log(`Sneasel Passive (${source}): ${unit.name} +2 Atk`);
            }

            // Claw (2): Extra +2 Atk on any growth
            if (clawCount >= 2 && unit.synergies.includes('Claw')) {
                unit.addBuff(2);
                console.log(`Claw Synergy: ${unit.name} +2 Atk`);
            }
        };

        // Normal (2/3/4) [Blessing]: Frontmost Friend -> +1/3/5 HP Permanent
        const normalUnits = this.playerTeam.filter(u => u && u.synergies.includes('Normal')) as Unit[];
        const normalCount = getUniqueCount(normalUnits);
        if (normalCount >= 2) {
            const buff = normalCount >= 4 ? 5 : (normalCount >= 3 ? 3 : 1);
            const frontUnit = this.playerTeam.find(u => u !== null);
            if (frontUnit) {
                applyBuff(frontUnit, buff, 'hp', 'Normal');
            }
        }

        // Ghost (2/3/4) [Shadow]: Frontmost Friend -> +1/3/5 Atk Permanent
        const ghostUnits = this.playerTeam.filter(u => u && u.synergies.includes('Ghost')) as Unit[];
        const ghostCount = getUniqueCount(ghostUnits);
        if (ghostCount >= 2) {
            const buff = ghostCount >= 4 ? 5 : (ghostCount >= 3 ? 3 : 1);
            const frontUnit = this.playerTeam.find(u => u !== null);
            if (frontUnit) {
                applyBuff(frontUnit, buff, 'atk', 'Ghost');
            }
        }

        // Beetle (2): Every Beetle unit -> +2/+2 Permanent
        const beetleUnits = this.playerTeam.filter(u => u && u.synergies.includes('Beetle')) as Unit[];
        const beetleCount = getUniqueCount(beetleUnits);
        if (beetleCount >= 2) {
            beetleUnits.forEach(u => {
                applyBuff(u, 2, 'hp', 'Beetle');
                applyBuff(u, 2, 'atk', 'Beetle');
            });
        }

        // --- Individual Unit End-of-Prep Abilities ---
        this.playerTeam.forEach(u => {
            if (!u) return;
            // Magnemite: Random +2 Atk or +2 HP (x Lv times)
            if (u.family === 'magnemite') {
                for (let i = 0; i < u.level; i++) {
                    const amount = 2;
                    if (Math.random() < 0.5) applyBuff(u, amount, 'atk', 'Magnemite');
                    else applyBuff(u, amount, 'hp', 'Magnemite');
                }
            }
        });
    }

    public endBattle(result: 'WIN' | 'LOSS' | 'DRAW') {
        if (result === 'WIN') {
            this.wins++;
            if (this.wins === 8) {
                this.lives++;
                console.log("Badge Earned (Win 8): +1 Life");
            }
            // Elite Four Defeated at Win 12
            if (this.wins === 12) {
                this.lives++;
                console.log("Elite Four Defeated (Win 12): +1 Life");
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

        this.turn++;
        this.startShopPhase();
    }

    // Actions
    public reroll() {
        if (this.gold >= 1) {
            this.gold -= 1;
            this.shop.roll(this.turn);
        }
    }

    /**
     * Buy unit. 
     * Handles target logic and switches image to Battle Mode.
     */
    public buyUnit(shopIndex: number, targetIndex?: number): boolean {
        const cost = 3;
        if (this.gold < cost) return false;

        const shopUnit = this.shop.slots[shopIndex];
        if (!shopUnit) return false;

        // Helper to finalize purchase (Switch Image)
        const finalizePurchase = (unit: Unit) => {
            if (unit.battleImageUrl) {
                unit.imageUrl = unit.battleImageUrl;
            }
            return unit;
        };

        // 1. Target Specified (Drag to Buy)
        if (targetIndex !== undefined) {
            if (targetIndex < 0 || targetIndex >= this.playerTeam.length) return false;

            const targetUnit = this.playerTeam[targetIndex];

            // A. Target Empty -> Buy directly
            if (!targetUnit) {
                this.gold -= cost;
                const boughtUnit = this.shop.buy(shopIndex);
                if (boughtUnit) {
                    this.playerTeam[targetIndex] = finalizePurchase(boughtUnit);
                    return true;
                }
                return false;
            }

            // B. Target Same Family AND Same Name -> Merge
            // This allows Non-Evolving units (Kangaskhan Lv1 + Lv2) to merge because they share Name '袋獸'.
            // Matches User Request: "Only Non-Evolving type characters can merge like this".
            // Prevents Bulbasaur (Lv1) merging with Ivysaur (Lv2) because Names differ.
            if (targetUnit.family === shopUnit.family && targetUnit.name === shopUnit.name) {
                // Check Max Level
                if (targetUnit.level >= 3) return false;

                this.gold -= cost;
                const boughtUnit = this.shop.buy(shopIndex);
                if (boughtUnit) {
                    this.mergeUnits(targetUnit, boughtUnit);
                    return true;
                }
                return false;
            }

            return false;
        }

        // 2. No Target (Click Buy)
        const emptySlotIndex = this.playerTeam.indexOf(null);

        // A. If Empty Slot Exists -> Buy there
        if (emptySlotIndex !== -1) {
            this.gold -= cost;
            const boughtUnit = this.shop.buy(shopIndex);
            if (boughtUnit) {
                this.playerTeam[emptySlotIndex] = finalizePurchase(boughtUnit);
                return true;
            }
        }
        // B. If Full -> Check Auto-Merge
        else {
            // Find merge target by Family AND Name
            const mergeTarget = this.playerTeam.find(u => u && u.family === shopUnit.family && u.name === shopUnit.name && u.level < 3);
            if (mergeTarget) {
                this.gold -= cost;
                const boughtUnit = this.shop.buy(shopIndex);
                if (boughtUnit) {
                    this.mergeUnits(mergeTarget, boughtUnit);
                    return true;
                }
            }

            // C. Special: Triple Buy -> Evolve -> Merge into Board Evolved Unit
            // Scenario: Shop has 3 Copies (e.g. Charmander). Board has Evolved Form (e.g. Charmeleon).
            // Action: Pay 9g, consume 3 Charmanders, merge 1 Charmeleon into Board Charmeleon.
            const copiesIndices: number[] = [];
            this.shop.slots.forEach((u, i) => {
                if (u && u.templateId === shopUnit.templateId) copiesIndices.push(i);
            });

            if (copiesIndices.length >= 3 && this.gold >= cost * 3 && shopUnit.evolveId) {
                // Check for Evolved Target on Board
                const evolveTarget = this.playerTeam.find(u => u && u.templateId === shopUnit.evolveId && u.level < 3);

                if (evolveTarget) {
                    // Start Transaction
                    this.gold -= cost * 3;

                    // Consume Shop Slots
                    const indicesToBuy = copiesIndices.slice(0, 3);
                    indicesToBuy.forEach(idx => this.shop.buy(idx)); // Allow buy to clear slot

                    // Create Evolved Unit (Virtual)
                    // We assume 3 Base = 1 Evolved (Exp 1).
                    // We need to construct it properly to get correct stats (Level 1 Evolved).
                    // Or just use template base stats?
                    // Evolving 3 bases gives: Base Unit -> Evolved. Stats might carry over?
                    // Standard evolution: keeps accumulated stats.
                    // Here, we buy fresh ones. 
                    // Let's create a fresh Evolved Unit from Template.
                    const evolvedTemplate = UNIT_TEMPLATES[shopUnit.evolveId];
                    if (evolvedTemplate) {
                        const virtualUnit = new Unit(evolvedTemplate);
                        virtualUnit.exp = 3; // 3 bases = 3 exp worth
                        this.mergeUnits(evolveTarget, virtualUnit);

                        // Check if there's another matching unit on board to continue merging
                        this.checkChainMerges(evolveTarget);
                        return true;
                    }
                }
            }
        }

        return false;
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

            // Special: Sell Trigger for Lv 3 Merge-Effect Units (Wigglytuff/Gengar)
            if (unit.level === 3) {
                if (unit.family === 'igglybuff' || unit.family === 'gastly') {
                    // Trigger "Merge" effect but on Sell
                    console.log(`Sell Trigger for ${unit.name} (Lv 3)`);
                    this.triggerMergeEffect(unit);
                }
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
        // User Rule: If ANY side is Lv.3, cannot merge.
        if (u2 && u1.family === u2.family && u1.name === u2.name && u2.level < 3 && u1.level < 3) {
            // Merge u1 INTO u2
            this.mergeUnits(u2, u1);
            this.playerTeam[fromIndex] = null;
        } else {
            // Swap (Includes case where u2 is SAME TYPE but MAX LEVEL)
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

        // Calculate Future State
        const totalExp = target.exp + source.exp;
        const oldLevel = target.level;
        let predictedLevel = 1;
        if (totalExp >= 9) predictedLevel = 3;
        else if (totalExp >= 3) predictedLevel = 2;
        else predictedLevel = 1;

        // Ensure level doesn't drop
        predictedLevel = Math.max(predictedLevel, oldLevel);

        const willLevelUp = predictedLevel > oldLevel;
        const willEvolve = !!target.evolveId && willLevelUp; // Standard Evolving Unit leveling up

        // Rule: Trigger Merge Effects (Igglybuff/Gastly) EXACTLY ONCE per mergeUnits call
        // Trigger BEFORE level changes to use current level magnitude (e.g. Lv 1 Igglybuff gives +2)
        this.triggerMergeEffect(target);

        if (willLevelUp) {
            // UNIFIED SYNC is removed in favor of distinct growth as requested
            if (willEvolve) {
                this.performEvolution(target);
            } else {
                target.level = predictedLevel;
                // this.triggerMergeEffect(target); // Removed duplicate

                // Non-evolving OR Final Stage Level Up
                const base = UNIT_TEMPLATES[target.family].baseStats;

                // Rule: Non-evolving (Stage 1 -> 2/3) gets 1x Base
                // Rule: Already evolved but final stage (Stage 2 -> 3) gets 2x Base
                // In my implementation, Stage 1 is lvl 1, Stage 2 is lvl 2, etc.
                const multiplier = 1;

                target.addGrowth(base.maxHp * multiplier, base.attack * multiplier);
                console.log(`${target.name} Level Up (Non-Evolve) -> +${base.maxHp * multiplier}/+${base.attack * multiplier}`);
            }
        } else {
            // Standard Merge (No Level Up)
            // Rule: Add +source.exp stats (Accumulate fodder power)
            target.addGrowth(source.exp, source.exp);

            // this.triggerMergeEffect(target); // Removed duplicate

            console.log(`${target.name} absorbs ${source.exp} exp. +${source.exp}/+${source.exp} Stats.`);
        }

        // Update Exp
        target.exp = totalExp;

        console.log(`${target.name} Merged: Exp ${totalExp} (Level ${target.level})`);
    }

    private performEvolution(unit: Unit) {
        if (!unit.evolveId) return;

        const newTemplate = UNIT_TEMPLATES[unit.evolveId];
        // "First object of family path is Base Stats source".
        // unit.family stores the ID of the base unit (e.g. 'bulbasaur').
        const baseTemplate = UNIT_TEMPLATES[unit.family];

        if (newTemplate && baseTemplate) {
            // triggerMergeEffect call removed from here, now handled centrally in mergeUnits

            // Evolution Bonus: Add Base Stats based on Stage
            // Stage 2 (lv 2) gets 2x Base. Stage 3 (lv 3) gets 3x Base.
            // Since we call this AFTER unit.level has been set by logic or is about to be:
            // Let's use the TARGET level: current + 1.
            const multiplier = 1;
            const bonus = baseTemplate.baseStats;
            unit.addGrowth(bonus.maxHp * multiplier, bonus.attack * multiplier);

            console.log(`Evolution Bonus: +${bonus.maxHp * multiplier}/+${bonus.attack * multiplier} (lv ${unit.level + 1})`);

            // Transform Logic
            unit.templateId = newTemplate.id;
            unit.name = newTemplate.name;
            unit.description = newTemplate.description; // Update Description
            unit.imageUrl = newTemplate.battleImageUrl || newTemplate.imageUrl; // Use 01 version (Battle Image)
            unit.battleImageUrl = newTemplate.battleImageUrl;
            unit.evolveId = newTemplate.evolveId;

            // Update Synergies? Usually evolved form has same synergies, but good to refresh.
            unit.synergies = newTemplate.synergies || [];

            // Tier? Shop Tier usually strictly Unit Tier, but evolved unit might be considered higher tier?
            // "Stage 2" unit is Tier 1 Base?
            // Let's rely on template tier.
            unit.tier = newTemplate.tier;

            // Increment Level (Stage 1 -> 2 -> 3)
            unit.level += 1;

            console.log(`Evolution! ${unit.name} (Stage ${unit.level}) with Bonus +${bonus.maxHp}/+${bonus.attack}`);
        }
    }

    // Helper for Merge/Evolution Effects
    private triggerMergeEffect(unit: Unit) {
        // Gastly: Merge/Evolve -> Front Ally +2/5/10 Atk
        if (unit.family === 'gastly') {
            const team = this.playerTeam;
            const idx = team.indexOf(unit);
            if (idx > 0) {
                const front = team[idx - 1];
                if (front) {
                    const amount = [0, 2, 5, 10][unit.level] || 2;
                    front.addBuff(amount);
                    console.log(`Gastly Family Merge: +${amount} Atk to ${front.name}`);
                }
            }
        }

        // Igglybuff: Merge/Evolve -> Front Ally +2/5/10 HP
        if (unit.family === 'igglybuff') {
            const team = this.playerTeam;
            const idx = team.indexOf(unit);
            if (idx > 0) {
                const front = team[idx - 1];
                if (front) {
                    const amount = [0, 2, 5, 10][unit.level] || 2;
                    front.addGrowth(amount, 0);
                    console.log(`Igglybuff Family Merge/Sell: +${amount} HP to ${front.name}`);
                }
            }
        }
    }

    private cloneUnit(unit: Unit): Unit {
        const template = UNIT_TEMPLATES[unit.templateId];
        // Fallback if template missing (shouldn't happen)
        if (!template) return unit;

        const clone = new Unit(template);
        clone.id = unit.id; // Keep ID? Or new? For battle strictness, persistence doesn't matter much unless logic depends on ID.
        // Actually best to keep ID stable for React keys if possible, though strict mode might complain if we swap objects.
        // Let's keep data consistent.

        clone.name = unit.name;
        clone.level = unit.level;
        clone.exp = unit.exp;
        clone.stats = { ...unit.stats };
        clone.tier = unit.tier;
        clone.imageUrl = unit.imageUrl;
        clone.battleImageUrl = unit.battleImageUrl;
        clone.evolveId = unit.evolveId;
        clone.synergies = [...unit.synergies];

        return clone;
    }
}
