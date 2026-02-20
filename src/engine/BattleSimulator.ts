
import { Unit } from '../models/Unit';
import { EventBus } from './EventBus';
import { UNIT_TEMPLATES } from '../models/UnitFactory';

export interface BattleLog {
    message: string;
    turn: number;
}

export class BattleSimulator {
    public playerTeam: Unit[];
    public enemyTeam: Unit[];
    public logs: BattleLog[] = [];
    public eventBus: EventBus;
    public turnCount: number = 0;
    public onUpdate?: () => void; // Hook for UI refresh during async steps

    // Track battle-specific state for units (e.g. "hasBlockedDeath")
    public unitStates: Map<Unit, any> = new Map(); // Changed from private to public for UI access
    private initialPlayerSet: Set<Unit> = new Set();
    private spiritombTriggered: Set<string> = new Set();
    private originalPlayerTeam?: (Unit | null)[];
    private isCompacting = false;
    private isSimulatingStep = false;
    private queuedKillRewards: (() => Promise<void>)[] = [];
    // Cached Synergies (Persist through death)
    private playerSynergies = new Map<string, number>();
    private enemySynergies = new Map<string, number>();

    constructor(playerTeam: (Unit | null)[], enemyTeam: (Unit | null)[], originalPlayerTeam?: (Unit | null)[], difficultyMultiplier: number = 1.0) {
        this.originalPlayerTeam = originalPlayerTeam;
        // Preserve 5-slot architecture to match UI indices exactly
        this.playerTeam = playerTeam.map(u => u ? this.cloneUnit(u) : null) as Unit[];
        this.enemyTeam = enemyTeam.map(u => {
            if (!u) return null;
            const clone = this.cloneUnit(u);
            // Apply Difficulty Scaling to Enemy (Ensure floor is 1)
            clone.stats.hp = Math.max(1, Math.floor(clone.stats.hp * difficultyMultiplier));
            clone.stats.maxHp = Math.max(1, Math.floor(clone.stats.maxHp * difficultyMultiplier));
            clone.stats.attack = Math.max(1, Math.floor(clone.stats.attack * difficultyMultiplier));
            // Feature: Global Stat Cap 50/50
            clone.capStats();
            return clone;
        }) as Unit[];
        this.eventBus = new EventBus();

        // Register Initial Teams for Synergy Persistence
        this.playerTeam.forEach(u => { if (u) this.initialPlayerSet.add(u); });
        // Calculate Initial Synergies
        this.calculateCachedSynergies(this.playerTeam.filter(u => u !== null), this.playerSynergies);
        this.calculateCachedSynergies(this.enemyTeam.filter(u => u !== null), this.enemySynergies);

        // 1. Register Passive Abilities & Hooks
        this.playerTeam.forEach(u => { if (u) this.registerUnitAbilities(u); });
        this.enemyTeam.forEach(u => { if (u) this.registerUnitAbilities(u); });
    }

    public async init() {
        this.spiritombTriggered.clear();
        // Collect all units and their positions
        const allUnits: { unit: Unit, pos: number, isPlayer: boolean }[] = [];
        this.playerTeam.forEach((u, i) => { if (u) allUnits.push({ unit: u, pos: i, isPlayer: true }); });
        this.enemyTeam.forEach((u, i) => { if (u) allUnits.push({ unit: u, pos: i, isPlayer: false }); });

        // Helper for Category Rank
        const getRank = (unit: Unit) => {
            if (unit.family === 'spiritomb') return 3; // Priority 1: Silence
            const utility = ['ditto', 'gastly', 'igglybuff', 'mudkip', 'gulpin'];
            if (utility.includes(unit.family)) return 2; // Priority 2: Utility/Transform
            if (unit.family === 'houndour') return 1; // Priority 3: Damage
            return 0;
        };

        // Sort by Priority: Category (Desc) > Position (Asc) > Attack (Desc) > HP (Desc) > Random
        allUnits.sort((a, b) => {
            const rankA = getRank(a.unit);
            const rankB = getRank(b.unit);
            if (rankA !== rankB) return rankB - rankA;

            // Priority 2: Position (front to back)
            if (a.pos !== b.pos) return a.pos - b.pos;

            // Priority 3: Attack
            if (a.unit.stats.attack !== b.unit.stats.attack) return b.unit.stats.attack - a.unit.stats.attack;

            // Priority 4: HP
            if (a.unit.stats.hp !== b.unit.stats.hp) return b.unit.stats.hp - a.unit.stats.hp;

            // Priority 5: Random Fallback
            return Math.random() - 0.5;
        });

        // Run global start of battle sequence
        await this.runGlobalStartOfBattleAbilities(allUnits.map(item => item.unit));

        // 6. Apply Start-of-Battle Synergies (Personal buffs: Triplets, Starter)
        await this.applyBattleStartSynergies(this.playerTeam.filter(u => u !== null));
        await this.applyBattleStartSynergies(this.enemyTeam.filter(u => u !== null));

        // 7. Global Weather: Snow (Only triggers once even if both sides have it)
        const hasSnow = (this.playerSynergies.get('Snow') || 0) >= 2 || (this.enemySynergies.get('Snow') || 0) >= 2;
        if (hasSnow) {
            this.log("天空降下了冰雹...");
            await this.delay(500);
            const allUnits = [...this.playerTeam, ...this.enemyTeam].filter((u: Unit) => u !== null && u.stats.hp > 0);
            for (const target of allUnits) {
                if (target.synergies.includes('Snow')) continue;

                // User Request: 33% of lifetime Max HP
                const dmg = Math.ceil(target.stats.maxHp * 0.33);
                this.log(`${target.name} 受到 ${dmg} 點傷害！`);
                await this.dealDamage(null, target, dmg, true);
                if (this.onUpdate) this.onUpdate();
                await this.delay(100);
            }
        }

        // Initial compaction to ensure everyone is at the front
        await this.compactTeams();

        await this.eventBus.emit({ type: 'BATTLE_START', context: { simulator: this } });
    }

    private cloneUnit(unit: Unit): Unit {
        const clone = new Unit(UNIT_TEMPLATES[unit.templateId]);
        clone.stats = { ...unit.stats };
        clone.level = unit.level;
        clone.exp = unit.exp;
        clone.id = unit.id;
        clone.synergies = [...unit.synergies];
        clone.imageUrl = unit.imageUrl;
        clone.battleImageUrl = unit.battleImageUrl;
        clone.family = unit.family;

        this.unitStates.set(clone, {});
        return clone;
    }

    private async runGlobalStartOfBattleAbilities(queue: Unit[]) {
        for (const unit of queue) {
            await this.executeUnitStartOfBattleAbility(unit);
            if (this.onUpdate) this.onUpdate(); // Update UI after each ability
        }
    }

    private async executeUnitStartOfBattleAbility(unit: Unit) {
        if (unit.stats.hp <= 0) return;

        const { myTeam, opTeam, side } = this.getTeams(unit);

        const s = this.unitStates.get(unit);
        if (s?.isSilenced) {
            this.log(`${unit.name} 陷入封印狀態，無法發動招式！`);
            return;
        }

        // Gastly Family: Atk buff at start (Swapped from Mankey)
        if (unit.family === 'gastly') {
            if (unit.templateId === 'gengar') { // Stage 3
                await this.notifySkill(unit, `耿鬼發動了詭計！`);
                for (const u of myTeam.filter(u => u && u.stats.hp > 0)) {
                    this.buffAttack(u!, 5);
                    await this.delay(65);
                }
            } else {
                const idx = myTeam.indexOf(unit);
                if (idx > 0) {
                    const front = myTeam[idx - 1];
                    if (front) {
                        const amount = unit.templateId === 'haunter' ? 5 : 2;
                        this.buffAttack(front, amount);
                        await this.notifySkill(unit, `耿鬼發動了詭計！`);
                    }
                }
            }
        }

        // Igglybuff Family: HP buff at start (Swapped from Dwebble)
        if (unit.family === 'igglybuff') {
            if (unit.templateId === 'wigglytuff') { // Stage 3
                await this.notifySkill(unit, `胖可丁發動了治癒波動！`);
                for (const u of myTeam.filter(u => u && u.stats.hp > 0)) {
                    this.growUnit(u!, 5, 0, 'Igglybuff');
                    await this.delay(65);
                }
            } else {
                const idx = myTeam.indexOf(unit);
                if (idx > 0) {
                    const front = myTeam[idx - 1];
                    if (front) {
                        const amount = unit.templateId === 'jigglypuff' ? 5 : 2;
                        this.growUnit(front, amount, 0, 'Igglybuff');
                        await this.notifySkill(unit, `胖可丁發動了治癒波動！`);
                    }
                }
            }
        }

        // Houndour: 4*Lv Dmg to lowest HP enemy
        if (unit.family === 'houndour') {
            const times = [0, 1, 3, 5][unit.level] || 1;
            for (let i = 0; i < times; i++) {
                // Re-fetch current enemies to handle team compression after death
                const currentOpTeam = this.playerTeam.includes(unit) ? this.enemyTeam : this.playerTeam;
                const livingEnemies = currentOpTeam.filter(e => e && e.stats.hp > 0);

                if (livingEnemies.length > 0) {
                    let target = livingEnemies[0];
                    for (const e of livingEnemies) {
                        if (e.stats.hp < target.stats.hp) target = e;
                    }
                    await this.notifySkill(unit, `對 ${target.name} 發動了噴射火焰`);
                    await this.dealDamage(unit, target, 4, true);
                    // Wait for death effects/compaction to settle before next fire breath
                    await this.delay(50);
                } else break;
            }
        }

        // Spiritomb: Invalidate 2 enemy skills (Exclusive: Once per team, no Spiritomb targets)
        if (unit.family === 'spiritomb' && !this.spiritombTriggered.has(side)) {
            const livingEnemies = opTeam.filter(e => e && e.stats.hp > 0 && e.family !== 'spiritomb');
            if (livingEnemies.length > 0) {
                const targets = [...livingEnemies].sort(() => 0.5 - Math.random()).slice(0, 2);
                await this.notifySkill(unit, `封印了對手的招式！`);
                await this.delay(400);
                for (const t of targets) {
                    const tState = this.unitStates.get(t) || {};
                    tState.isSilenced = true;
                    this.unitStates.set(t, tState);
                    this.log(`${unit.name} 封印了 ${t.name} 的招式！`);
                }
                this.spiritombTriggered.add(side);
            }
        }

        // Ditto: Transform (Optimized timing)
        if (unit.family === 'ditto') {
            const allies = myTeam.filter((u: Unit) => u && u !== unit && u.stats.hp > 0);
            if (allies.length > 0) {
                let target = allies[0];
                for (const u of allies) {
                    if (u.stats.hp > target.stats.hp) target = u;
                }

                const originalName = unit.name;

                // 1. Play animation (Start) - Don't await yet
                const animPromise = this.playAnimation(unit, 'morph', 500);

                // 2. Log skill first so it uses original name
                this.log(`${originalName}(${unit.level}) 對 ${target.name} 使用了變身！`);

                // 3. Wait for the peak of the blur (250ms)
                await this.delay(250);

                // 4. Perform the data transformation
                unit.family = target.family;

                // Find the correct template for this family at THIS level (Ditto's level)
                let currentTemplate = UNIT_TEMPLATES[target.family] || UNIT_TEMPLATES[target.templateId];
                for (let i = 1; i < unit.level; i++) {
                    if (currentTemplate.evolveId && UNIT_TEMPLATES[currentTemplate.evolveId]) {
                        currentTemplate = UNIT_TEMPLATES[currentTemplate.evolveId];
                    }
                }

                unit.templateId = currentTemplate.id;
                unit.description = currentTemplate.description;
                unit.synergies = [...currentTemplate.synergies];

                // Appearance (Copied from target)
                unit.name = target.name;
                unit.imageUrl = target.imageUrl;
                unit.battleImageUrl = target.battleImageUrl;

                // 5. Refresh UI while animation is still running (blurry character)
                if (this.onUpdate) this.onUpdate();

                // 6. Wait for animation to finish
                await animPromise;

                // Register new abilities (Ditto now registers listeners based on its new identity)
                this.registerUnitAbilities(unit);

                // Chain Reaction: If new form has Battle-Start ability, trigger it immediately
                const startAbilities = ['gastly', 'igglybuff', 'houndour', 'spiritomb', 'mudkip', 'gulpin'];
                if (startAbilities.includes(unit.family)) {
                    await this.executeUnitStartOfBattleAbility(unit);
                }
            }
        }

        // Mudkip Family: Logic moved to registerUnitAbilities

        // Gulpin & Swalot: Swallow Front Ally
        if (unit.family === 'gulpin') {
            const idx = myTeam.indexOf(unit);
            if (idx > 0) {
                const front = myTeam[idx - 1];
                if (front && front.stats.hp > 0) {
                    await this.notifySkill(unit, `對 ${front.name} 使用了吞下`);
                    await this.delay(400);
                    const multiplier = unit.level >= 3 ? 2 : 1;
                    this.growUnit(unit, front.stats.maxHp * multiplier, front.stats.attack * multiplier, '吞噬');
                    const fState = this.unitStates.get(front) || {};
                    fState.isSwallowed = true;
                    this.unitStates.set(front, fState);
                    front.stats.hp = 0;
                    // Trigger death BEFORE removal/compaction so location is preserved for summons
                    await this.eventBus.emit({ type: 'AFTER_DEATH', source: front, context: { killer: unit } });
                    await this.compactTeams();
                    if (this.onUpdate) this.onUpdate();
                }
            }
        }
    }

    private getSynergyCountForUnit(unit: Unit, synergyId: string): number {
        const isPlayer = this.initialPlayerSet.has(unit);
        const map = isPlayer ? this.playerSynergies : this.enemySynergies;
        return map.get(synergyId) || 0;
    }

    private calculateCachedSynergies(team: Unit[], map: Map<string, number>) {
        map.clear(); // CRITICAL: Reset before recalculating
        const families = new Map<string, Set<string>>();
        team.forEach(u => {
            u.synergies.forEach(syn => {
                if (!families.has(syn)) families.set(syn, new Set());
                families.get(syn)!.add(u.family);
            });
        });
        families.forEach((set, syn) => {
            map.set(syn, set.size);
        });
    }

    private async applyBattleStartSynergies(team: Unit[]) {
        if (team.length === 0) return;
        if (this.getSynergyCountForUnit(team[0], 'Triplets') >= 3) {
            team.filter((u: Unit) => u && u.synergies.includes('Triplets')).forEach(u => {
                this.growUnit(u, 3, 3, 'Triplets');
            });
        }
        if (this.getSynergyCountForUnit(team[0], 'Starter') >= 3) {
            team.filter((u: Unit) => u && u.synergies.includes('Starter')).forEach(u => {
                this.growUnit(u, 1, 1, '御三家');
            });
        }

    }

    private growUnit(unit: Unit, hp: number, atk: number, sourceName?: string, permanentTarget?: Unit | null) {
        if (hp === 0 && atk === 0) return;
        unit.addGrowth(hp, atk);
        if (permanentTarget) permanentTarget.addGrowth(hp, atk);

        if (sourceName) {
            if (hp > 0 && atk > 0) this.log(`${unit.name} 提高了 ${atk} 攻擊 與 生命`);
            else if (hp > 0) this.log(`${unit.name} 提高了 ${hp} 生命！`);
            else if (atk > 0) this.log(`${unit.name} 提高了 ${atk} 攻擊！`);
        }

        // Claw Synergy: Extra +2 Atk on any growth
        if (this.getSynergyCountForUnit(unit, 'Claw') >= 2 && unit.synergies.includes('Claw')) {
            unit.stats.attack += 2;
            unit.capStats();
            if (permanentTarget) {
                permanentTarget.stats.attack += 2;
                permanentTarget.capStats();
            }
            this.log(`${unit.name} 發動了磨爪！`);
        }
    }

    private buffAttack(unit: Unit, amount: number, silent: boolean = false) {
        unit.addBuff(amount);
        if (!silent) {
            this.log(`${unit.name} ${amount >= 0 ? '提高' : '降低'}了 ${Math.abs(amount)} 攻擊！`);
        }
    }

    private getTeams(unit: Unit) {
        // Use includes first, then fall back to initialPlayerSet for dead/removed units
        const inPlayer = this.playerTeam.includes(unit);
        const inEnemy = this.enemyTeam.includes(unit);
        let isPlayer: boolean;
        if (inPlayer) isPlayer = true;
        else if (inEnemy) isPlayer = false;
        else isPlayer = this.initialPlayerSet.has(unit); // Fallback for removed units
        const myTeam = isPlayer ? this.playerTeam : this.enemyTeam;
        const opTeam = isPlayer ? this.enemyTeam : this.playerTeam;
        const side = isPlayer ? 'player' : 'enemy';
        return { myTeam, opTeam, side };
    }

    private registerUnitAbilities(unit: Unit) {

        // Grass: Lifesteal
        if (unit.synergies.includes('Grass')) {
            this.eventBus.on('AFTER_ATTACK', async (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                // Critical: Check HP AFTER attack completes to prevent dead units from healing
                if (unit.stats.hp <= 0) return;
                const { myTeam } = this.getTeams(unit);
                if (e.source === unit && myTeam.includes(unit)) { // Ensure unit is still in team
                    const count = this.getSynergyCountForUnit(unit, 'Grass');
                    const heal = count >= 4 ? 6 : (count >= 3 ? 4 : (count >= 2 ? 2 : 0));
                    if (heal > 0 && unit.stats.hp > 0) {
                        this.heal(unit, heal);
                        this.log(`${unit.name} 吸取了 ${heal} 生命`);
                    }
                }
            });
        }

        // Water: HP Growth on Attack
        if (unit.synergies.includes('Water')) {
            this.eventBus.on('BEFORE_ATTACK', async (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                if (unit.stats.hp <= 0) return;
                if (e.source === unit) {
                    const count = this.getSynergyCountForUnit(unit, 'Water');
                    const buff = count >= 4 ? 5 : (count >= 3 ? 3 : (count >= 2 ? 1 : 0));
                    if (buff > 0) {
                        this.growUnit(unit, buff, 0, '潮汐');
                    }
                }
            });
        }

        // Mudkip Family: Stats on Front Ally Attack (Redirected from Start of Battle)
        if (unit.family === 'mudkip') {
            this.eventBus.on('BEFORE_ATTACK', async (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                if (unit.stats.hp <= 0) return;
                const { myTeam } = this.getTeams(unit);
                const idx = myTeam.indexOf(unit);
                // Trigger when FRONT ally attacks
                if (idx > 0 && myTeam[idx - 1] === e.source) {
                    const buff = [0, 2, 4, 6][unit.level] || 2;
                    await this.notifySkill(unit, `發動了健美！`);
                    await this.playAnimation(unit, 'jump', 300);
                    this.growUnit(unit, buff, buff, '水躍魚技能');
                }
            });
        }

        // Torchic: Pursuit
        if (unit.family === 'torchic') {
            this.eventBus.on('BEFORE_ATTACK', async (e) => {
                if (unit.stats.hp <= 0 || this.unitStates.get(unit)?.isSilenced) return;
                const { myTeam } = this.getTeams(unit);
                const idx = myTeam.indexOf(unit);
                if (idx > 0 && myTeam[idx - 1] === e.source && e.target) {
                    await this.delay(150);
                    this.log(`${unit.name} 發動了二連踢！`);
                    await this.playAnimation(unit, 'jump', 300);
                    const dmg = [0, 3, 5, 10][unit.level] || 3;
                    await this.dealDamage(unit, e.target, dmg);
                }
            });
        }

        // Fire: Atk Buff on Attack
        if (unit.synergies.includes('Fire')) {
            this.eventBus.on('BEFORE_ATTACK', (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                if (e.source === unit) {
                    const count = this.getSynergyCountForUnit(unit, 'Fire');
                    const buff = count >= 4 ? 5 : (count >= 3 ? 3 : (count >= 2 ? 1 : 0));
                    if (buff > 0) this.buffAttack(unit, buff);
                }
            });
        }

        // Angry: Atk on Hurt
        if (unit.synergies.includes('Angry')) {
            this.eventBus.on('ON_HURT', (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                if (e.target === unit) {
                    if (this.getSynergyCountForUnit(unit, 'Angry') >= 2) {
                        this.buffAttack(unit, 3);
                    }
                }
            });
        }

        // Snow: Start of Battle Dmg
        if (unit.synergies.includes('Snow')) {
            // No trigger logic needed here, handled as constant battle-start effect in Simulator
        }

        // Cave: Move to Back
        if (unit.synergies.includes('Cave')) {
            this.eventBus.on('AFTER_ATTACK', async (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                if (e.source === unit && unit.stats.hp > 0) {
                    if (this.getSynergyCountForUnit(unit, 'Cave') >= 2) {
                        const { myTeam } = this.getTeams(unit);
                        const aliveCount = myTeam.filter(u => u && u.stats.hp > 0).length;
                        if (aliveCount <= 1) return; // Don't move if alone

                        const idx = myTeam.indexOf(unit);
                        if (idx !== -1 && idx < myTeam.length - 1) {
                            myTeam.splice(idx, 1); // Properly remove from current spot
                            myTeam.push(unit); // Move to the end
                            this.log(`${unit.name} 發動了挖洞！`);
                            await this.compactTeams();
                            await this.delay(250);
                            await this.eventBus.emit({ type: 'ON_MOVE', source: unit, context: {} });
                        }
                    }
                }
            });
        }

        // Slowpoke Family: Heal below 50%
        if (unit.family === 'slowpoke') {
            // Record original Battle-Start Max HP for heal cap
            const state = this.unitStates.get(unit) || {};
            state.originalMaxHp = unit.stats.maxHp;
            this.unitStates.set(unit, state);

            this.eventBus.on('ON_HURT', (e) => {
                if (e.target === unit && !this.unitStates.get(unit)?.isSilenced) {
                    const currentState = this.unitStates.get(unit) || {};
                    if (!currentState.slowpokeHealUsed && unit.stats.hp > 0 && unit.stats.hp < unit.stats.maxHp * 0.5) {
                        let amount = [0, 6, 12, 50][unit.level] || 6;
                        // Feature: Heal cannot exceed original max HP (from start of battle)
                        const cap = currentState.originalMaxHp || unit.stats.maxHp;
                        const potentialNewHp = unit.stats.hp + amount;
                        if (potentialNewHp > cap) {
                            amount = Math.max(0, cap - unit.stats.hp);
                        }

                        if (amount > 0) {
                            this.heal(unit, amount);
                            this.log(`${unit.name} 發動了再生力！`);
                        }
                        currentState.slowpokeHealUsed = true;
                        this.unitStates.set(unit, currentState);
                    }
                }
            });
        }

        if (unit.family === 'farfetchd') {
            this.eventBus.on('BEFORE_ATTACK', (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                if (e.source === unit) {
                    const state = this.unitStates.get(unit) || {};
                    if (!state.lethalStrikeUsed) {
                        state.isLethalStrike = true; // Mark as ready for the next dealDamage
                        this.unitStates.set(unit, state);
                    }
                }
            });
        }

        // Heracross: Double attack after first hit
        if (unit.family === 'heracross') {
            this.eventBus.on('ON_HURT', (e) => {
                if (e.target === unit && !this.unitStates.get(unit)?.isSilenced) {
                    const state = this.unitStates.get(unit) || {};
                    if (!state.heracrossEnraged && unit.stats.hp > 0) {
                        const currentAtk = unit.stats.attack;
                        this.buffAttack(unit, currentAtk, true);
                        state.heracrossEnraged = true;
                        this.unitStates.set(unit, state);
                        this.log(`${unit.name} 發動了毅力！`);
                    }
                }
            });
        }

        // Onix: Stats on Move & Steelix Reflect
        if (unit.family === 'onix') {
            this.eventBus.on('ON_MOVE', async (e) => {
                if (e.source === unit && !this.unitStates.get(unit)?.isSilenced) {
                    const amount = unit.level >= 3 ? 4 : 2;
                    if (!this.isCompacting) {
                        await this.notifySkill(unit, `發動了鐵壁！`);
                        const { myTeam } = this.getTeams(unit);
                        await this.playTeamAnimation(myTeam, 'glow-pale-green', 600);
                    } else {
                        // Silent log during compaction to avoid flood
                        this.log(`${unit.name} 發動了鐵壁！`);
                    }
                    this.growUnit(unit, amount, 0); // Removed sourceName to prevent redundant HP log
                    const original = this.originalPlayerTeam?.find(u => u && u.id === unit.id);
                    if (original) original.addGrowth(amount, 0);
                }
            });

            // Steelix (Evolved Onix) Reflect logic
            this.eventBus.on('ON_HURT', async (e) => {
                if (e.target === unit && e.source && e.source.stats.hp > 0 && !this.unitStates.get(unit)?.isSilenced) {
                    const amount = e.context.amount;
                    if (amount > 0) {
                        const multiplier = unit.templateId === 'onix' ? 0.5 : 1.0;
                        const reflectDmg = Math.ceil(amount * multiplier);
                        this.log(`${unit.name} 反彈了 ${reflectDmg} 點傷害！`);
                        await this.dealDamage(unit, e.source, reflectDmg, false); // Use false to silence redundant amount log
                    }
                }
            });
        }

        // Fuecoco: Friendly Kill -> All Perm Atk
        if (unit.family === 'fuecoco') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                if (unit.stats.hp <= 0 || this.unitStates.get(unit)?.isSilenced) return;
                const { myTeam } = this.getTeams(unit);
                if (e.context.killer && myTeam.includes(e.context.killer)) {
                    const amount = [0, 1, 2, 4][unit.level] || 1;
                    await this.notifySkill(unit, `發動了閃焰高歌！`);
                    await this.playTeamAnimation(myTeam, 'glow-pale-red', 1000);
                    for (const ally of myTeam.filter(u => u && u.stats.hp > 0)) {
                        const original = this.originalPlayerTeam?.find(o => o && o.id === ally.id);
                        this.growUnit(ally, 0, amount, '呆火鱷技能強化', original);
                    }
                }
            });
        }

        // Quaxly: Friendly Kill -> All Perm HP
        if (unit.family === 'quaxly') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                if (unit.stats.hp <= 0 || this.unitStates.get(unit)?.isSilenced) return;
                const { myTeam } = this.getTeams(unit);
                if (e.context.killer && myTeam.includes(e.context.killer)) {
                    const amount = [0, 1, 2, 4][unit.level] || 1;
                    await this.notifySkill(unit, `發動了流水旋舞！`);
                    await this.playTeamAnimation(myTeam, 'glow-pale-blue', 1000);
                    for (const ally of myTeam.filter(u => u && u.stats.hp > 0)) {
                        const original = this.originalPlayerTeam?.find(o => o && o.id === ally.id);
                        this.growUnit(ally, amount, 0, '潤水鴨技能強化', original);
                    }
                }
            });
        }

        // Bulbasaur Line (Matryoshka Summons)
        if (unit.family === 'bulbasaur' && unit.templateId !== 'sprout') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                if (e.source === unit) {
                    // Capture death position ONCE before any spawning
                    const { myTeam: initialTeam } = this.getTeams(unit);
                    let deathIdx = initialTeam.indexOf(unit);
                    if (deathIdx === -1) {
                        deathIdx = initialTeam.findIndex(u => !u || u.stats.hp <= 0);
                        if (deathIdx === -1) deathIdx = 0;
                    }

                    if (unit.templateId === 'venusaur') {
                        // Venusaur -> 2x Ivysaur (4/4)
                        await this.notifySkill(unit, '召喚了 2 隻妙蛙草');
                        await this.delay(200);
                        for (let i = 0; i < 2; i++) {
                            const { myTeam: currentTeam } = this.getTeams(unit);
                            const targetIdx = (e.context.deathIdx !== undefined) ? e.context.deathIdx + i : deathIdx + i;
                            await this.spawnUnit(currentTeam, targetIdx, 'ivysaur', 1, 4, 4, true);
                        }
                    } else if (unit.templateId === 'ivysaur') {
                        // Ivysaur -> 1x Bulbasaur (2/2)
                        await this.notifySkill(unit, '召喚了 妙蛙種子');
                        await this.delay(200);
                        const { myTeam: currentTeam } = this.getTeams(unit);
                        const targetIdx = (e.context.deathIdx !== undefined) ? e.context.deathIdx : deathIdx;
                        await this.spawnUnit(currentTeam, targetIdx, 'bulbasaur', 1, 2, 2, true);
                    } else {
                        // Bulbasaur (1/2/3 star) -> Original Sprout Logic
                        const count = [0, 1, 2, 5][unit.level] || 1;
                        // Description says "1/1 Sprouts" regardless of Bulbasaur level
                        const seedStats = 1;
                        await this.notifySkill(unit, `召喚了 ${count} 隻小種子`);
                        await this.delay(200);
                        for (let i = 0; i < count; i++) {
                            const { myTeam: currentTeam } = this.getTeams(unit);
                            const targetIdx = (e.context.deathIdx !== undefined) ? e.context.deathIdx + i : deathIdx + i;
                            await this.spawnUnit(currentTeam, targetIdx, 'sprout', 1, seedStats, seedStats, true);
                        }
                    }
                    // COMPACTION REMOVED HERE: handleDeath will do it once after all effects
                }
            });
        }

        // Rattata: Summon Help (Prevent loop if instance is already a mouse)
        if (unit.family === 'rattata' && unit.templateId !== 'mouse') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                if (e.source === unit) {
                    // Capture death position ONCE
                    const { myTeam: initialTeam } = this.getTeams(unit);
                    let deathIdx = initialTeam.indexOf(unit);
                    if (deathIdx === -1) {
                        deathIdx = initialTeam.findIndex(u => !u || u.stats.hp <= 0);
                        if (deathIdx === -1) deathIdx = 0;
                    }

                    await this.notifySkill(unit, '召喚了小老鼠');
                    await this.delay(200);
                    const count = unit.level >= 3 ? 5 : 2;
                    const bonus = [0, 0, 1, 2][unit.level];
                    const stats = 1 + bonus; // Base 1 + Bonus
                    for (let i = 0; i < count; i++) {
                        const { myTeam: currentTeam } = this.getTeams(unit);
                        const targetIdx = (e.context.deathIdx !== undefined) ? e.context.deathIdx + i : deathIdx + i;
                        await this.spawnUnit(currentTeam, targetIdx, 'mouse', 1, stats, stats, true);
                    }
                    // COMPACTION REMOVED HERE
                }
            });
        }

        // Shuppet/Banette: Death -> Dmg to random enemy
        if (unit.family === 'shuppet') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                if (e.source === unit) {
                    const { opTeam } = this.getTeams(unit);
                    const living = opTeam.filter(u => u && u.stats.hp > 0);
                    if (living.length > 0) {
                        const target = living[Math.floor(Math.random() * living.length)];
                        await this.notifySkill(unit, `對目標使用了影子偷襲！`);
                        await this.delay(400);
                        const dmg = [0, 4, 10, 99][unit.level] || 4;
                        await this.dealDamage(unit, target, dmg, true);
                    }
                }
            });
        }

        // Drifloon/Drifblim: Death -> AOE dmg
        if (unit.family === 'drifloon') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                if (e.source === unit) {
                    const { opTeam } = this.getTeams(unit);
                    await this.notifySkill(unit, '發動了自爆');
                    const dmg = [0, 2, 5, 15][unit.level] || 2;
                    // Staggered sequence for AOE damage
                    for (const target of opTeam.filter(u => u && u.stats.hp > 0)) {
                        await this.dealDamage(unit, target, dmg, true);
                        await this.delay(65);
                    }
                }
            });
        }

        // Mimikyu: Guard first damage of each battle
        if (unit.family === 'mimikyu') {
            this.eventBus.on('BEFORE_HURT', (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                if (e.target === unit) {
                    // Pinsir or Sableye-Revenge ignore Mimikyu!
                    const source = e.context.source;
                    const sState = source ? this.unitStates.get(source) || {} : {};
                    const isBypassing = (source && source.family === 'pinsir' && !sState.isSilenced) ||
                        (source && source.family === 'sableye' && sState.isAbsoluteKill);
                    if (isBypassing) return;

                    const state = this.unitStates.get(unit) || {};
                    const maxGuards = 1; // Nerfed: Always 1 regardless of level
                    const used = (state.mimikyuGuardsUsed || 0);
                    if (used < maxGuards) {
                        state.mimikyuGuardsUsed = used + 1;
                        this.unitStates.set(unit, state);
                        e.context.amount = 0; // Nullify damage
                        this.log(`${unit.name} 發動了畫皮抵擋傷害！`);
                    }
                }
            });
        }

        // Chikorita Family: Buff Summons
        if (unit.family === 'chikorita') {
            this.eventBus.on('ON_FRIEND_SUMMONED', async (e) => {
                if (unit.stats.hp <= 0 || this.unitStates.get(unit)?.isSilenced) return;
                const { side: mySide } = this.getTeams(unit);
                const { side: sSide } = e.source ? this.getTeams(e.source) : { side: null };
                if (e.source && mySide === sSide && e.source !== unit) {
                    const buff = [0, 1, 2, 5][unit.level] || 1;
                    await this.notifySkill(unit, `對 ${e.source.name} 發動了甜甜香氣！`);
                    await this.playAnimation(unit, 'jump', 300);
                    this.growUnit(e.source, buff, buff);
                }
            });
        }

        // Treecko Family: Damage on Summon
        if (unit.family === 'treecko') {
            this.eventBus.on('ON_FRIEND_SUMMONED', async (e) => {
                if (unit.stats.hp <= 0 || this.unitStates.get(unit)?.isSilenced) return;
                const { side: mySide, opTeam } = this.getTeams(unit);
                const { side: sSide } = e.source ? this.getTeams(e.source) : { side: null };

                if (e.source && mySide === sSide && e.source !== unit) {
                    const dmg = [0, 3, 5, 10][unit.level] || 3;
                    const living = opTeam.filter(u => u && u.stats.hp > 0);
                    if (living.length > 0) {
                        const target = living[0];
                        await this.notifySkill(unit, `對 ${target.name} 使用了種子機關槍！`);
                        await this.playAnimation(unit, 'jump', 300);
                        await this.delay(250);
                        await this.dealDamage(unit, target, dmg, true);
                    }
                }
            });
        }

        // Sprigatito Family: Gain stats on Summon for All
        if (unit.family === 'sprigatito') {
            this.eventBus.on('ON_FRIEND_SUMMONED', async (e) => {
                if (unit.stats.hp <= 0 || this.unitStates.get(unit)?.isSilenced) return;
                const { myTeam } = this.getTeams(unit);
                if (e.source && myTeam.includes(e.source) && e.source !== unit) {
                    const amount = [0, 1, 2, 4][unit.level] || 1;
                    await this.notifySkill(unit, `發動了千變萬花！`);
                    await this.playTeamAnimation(myTeam, 'glow-pale-green', 1000);
                    for (const ally of myTeam.filter(u => u && u.stats.hp > 0)) {
                        const isAtk = Math.random() < 0.5;
                        const original = this.originalPlayerTeam?.find(o => o && o.id === ally.id);
                        this.growUnit(ally, isAtk ? 0 : amount, isAtk ? amount : 0, '新葉貓技能強化', original);
                    }
                }
            });
        }
    }

    public async performAttack(attacker: Unit, defender: Unit) {
        if (attacker.stats.hp <= 0 || defender.stats.hp <= 0) return;
        // Ordinary attack log removed per design request to reduce clutter
        // this.log(`${attacker.name} 攻擊了 ${defender.name}！`);
        await this.delay(100);

        await this.eventBus.emit({ type: 'BEFORE_ATTACK', source: attacker, target: defender, context: {} });

        const attackPromises: Promise<any>[] = [];
        const dmg = attacker.stats.attack;

        // Base attack
        attackPromises.push(this.dealDamage(attacker, defender, dmg, false));

        // Kangaskhan: Second hit if defender is evolved AND attacker/defender both survive the first hit
        if (attacker.family === 'kangaskhan' && (defender.templateId !== defender.family) && !this.unitStates.get(attacker)?.isSilenced) {
            await Promise.all(attackPromises); // Wait for the first hit and any triggers
            // Re-check survival after the first hit and its consequences (like reflect)
            if (defender.stats.hp > 0 && attacker.stats.hp > 0) {
                await this.notifySkill(attacker, `對 ${defender.name} 發動了親子愛！`);
                const secondHit = this.dealDamage(attacker, defender, attacker.stats.attack, false);
                attackPromises.push(secondHit);
            }
        }

        // Doduo: Extra hit on same target
        if (attacker.family === 'doduo' && !this.unitStates.get(attacker)?.isSilenced) {
            const chance = [0, 0.25, 0.33, 0.5][attacker.level] || 0.25;
            if (Math.random() < chance) {
                // User Request: Should hit the same target
                this.log(`${attacker.name} 對 ${defender.name} 發動了二連擊！`);
                attackPromises.push(this.dealDamage(attacker, defender, dmg));
            }
        }

        // Sneasel: 1 extra random hit (Can hit same target if only 1 enemy)
        if (attacker.family === 'sneasel' && !this.unitStates.get(attacker)?.isSilenced) {
            const side = this.initialPlayerSet.has(attacker) ? 'enemy' : 'player';
            const opTeam = side === 'enemy' ? this.enemyTeam : this.playerTeam;
            const liveEnemies = opTeam.filter(u => u && u.stats.hp > 0);
            if (liveEnemies.length > 0) {
                const targetCount = attacker.level >= 3 ? 2 : 1;
                let potentialTargets = liveEnemies.filter(u => u !== defender);
                if (potentialTargets.length === 0) potentialTargets = [defender];

                // Shuffle and pick
                const finalTargets = [...potentialTargets].sort(() => 0.5 - Math.random()).slice(0, targetCount);
                for (const r of finalTargets) {
                    this.log(`${attacker.name} 對 ${r.name} 發動了暗襲要害！`);
                    attackPromises.push(this.dealDamage(attacker, r, dmg));
                }
            }
        }

        // Totodile: Splash to neighbor (Fixed 2, 4, 6 dmg)
        if (attacker.family === 'totodile' && !this.unitStates.get(attacker)?.isSilenced) {
            const side = this.initialPlayerSet.has(attacker) ? 'enemy' : 'player';
            const opTeam = side === 'enemy' ? this.enemyTeam : this.playerTeam;
            const idx = opTeam.indexOf(defender);
            if (idx !== -1 && idx < opTeam.length - 1) {
                const neighbor = opTeam[idx + 1];
                if (neighbor && neighbor.stats.hp > 0) {
                    const splashDmg = [0, 2, 4, 8][attacker.level] || 2;
                    await this.notifySkill(attacker, `對 ${neighbor.name} 使用了咬住！`);
                    attackPromises.push(this.dealDamage(attacker, neighbor, splashDmg, true));
                }
            }
        }

        await Promise.all(attackPromises);

        // Snover: Knockback
        if (attacker.family === 'snover' && !this.unitStates.get(attacker)?.isSilenced) {
            const buffAtk = [0, 1, 2, 5][attacker.level] || 1;
            this.growUnit(attacker, 0, buffAtk, attacker.name);
            if (defender.stats.hp > 0) {
                const team = this.playerTeam.includes(defender) ? this.playerTeam : this.enemyTeam;
                const idx = team.indexOf(defender);
                if (idx !== -1 && idx < team.length - 1) {
                    const behind = team[idx + 1];
                    if (behind) {
                        team[idx] = behind;
                        team[idx + 1] = defender;
                        await this.notifySkill(attacker, `對 ${defender.name} 使用了木槌！`);
                        await this.compactTeams();
                        await this.delay(300);
                        await this.eventBus.emit({ type: 'ON_MOVE', source: defender, context: {} });
                        await this.eventBus.emit({ type: 'ON_MOVE', source: behind, context: {} });
                    }
                }
            }
        }

        await this.eventBus.emit({ type: 'AFTER_ATTACK', source: attacker, target: defender, context: {} });
    }

    private async dealDamage(source: Unit | null, target: Unit, amount: number, isSkillDamage: boolean = false) {
        if (target.stats.hp <= 0) return;
        // Optimization: Removed overly aggressive source.hp check that broke clash symmetry.
        // Secondary hits (like Kangaskhan) are handled specifically in performAttack.

        const targetState = this.unitStates.get(target) || {};
        // Source state for bypass logic
        const sourceState = source ? this.unitStates.get(source) || {} : {};
        const isBypassing = (source && source.family === 'pinsir' && !sourceState.isSilenced) ||
            (source && source.family === 'sableye' && sourceState.isAbsoluteKill);

        // Lethal Strike (Farfetch'd)
        if (sourceState.isLethalStrike && !sourceState.lethalStrikeUsed) {
            sourceState.isLethalStrike = false;
            sourceState.lethalStrikeUsed = true; // Mark as permanently used
            amount = 99;
            await this.notifySkill(source!, '致命一擊');
            this.log(`${source!.name} 對目標使用了迎頭一擊！`);
        }

        // Diglett: Chance to dodge (only basic attacks, not skills; Pinsir bypasses)
        if (target.family === 'diglett' && !targetState.isSilenced && !isSkillDamage && !isBypassing) {
            const dodgeChance = [0, 0.25, 0.33, 0.5][target.level] || 0.25;
            if (Math.random() < dodgeChance) {
                this.log(`${target.name} 發動了沙隱！`);
                if (this.onUpdate) this.onUpdate();
                return;
            }
        }

        // Emitting BEFORE_HURT allows skills like Mimikyu to nullify damage
        const hurtContext = { source, amount };
        await this.eventBus.emit({ type: 'BEFORE_HURT', target, context: hurtContext });
        amount = hurtContext.amount; // Get modified damage from listeners

        if (amount <= 0 && source !== null) {
            // Damage nullified (e.g. by Mimikyu), don't show hurt anim
            if (this.onUpdate) this.onUpdate();
            return;
        }

        // Pinsir/Sableye ignore reductions
        if (!isBypassing) {
            // Slow: 33% damage reduction
            if (this.getSynergyCountForUnit(target, 'Slow') >= 2 && target.synergies.includes('Slow')) {
                amount = Math.max(1, Math.ceil(amount * 2 / 3));
            }
            // Squirtle: Flat reduction
            if (target.family === 'squirtle' && amount > 0) amount = Math.max(1, amount - target.level);
        } else if (source) {
            this.log(`${source.name} 發動了破格！`);
        }

        target.stats.hp -= amount;
        if (isSkillDamage) {
            this.log(`${target.name} 受到 ${amount} 點傷害！`);
        }

        // Emit ON_HURT for triggers (like Steelix reflection) before checking survival effects
        await this.eventBus.emit({ type: 'ON_HURT', target, context: { source, amount } });

        if (target.stats.hp <= 0 && !isBypassing && target.synergies.includes('Hard') && this.getSynergyCountForUnit(target, 'Hard') >= 2 && !targetState.hardUsed) {
            target.stats.hp = 1;
            targetState.hardUsed = true;
            this.unitStates.set(target, targetState);
            this.log(`${target.name} 發動了結實！`);
        }

        if (target.stats.hp <= 0) {
            // DEATH: Go straight to handleDeath, skipping hurt animation
            await this.handleDeath(target, source || undefined);
        } else {
            // SURVIVE: Play hurt animation IF not in front row (index 0)
            const { myTeam } = this.getTeams(target);
            const isFront = myTeam[0] === target;

            if (!isFront) {
                await this.playAnimation(target, 'hurt', 150);
                await this.delay(100); // Wait 100ms after flicker
            }
        }
    }

    private async handleDeath(unit: Unit, killer?: Unit) {
        // Log removed per user request: "不要在說明角色倒下，對戰訊息太多了"
        // this.log(`${unit.name} 倒下了！`);

        // Sableye: Revenge kill
        if (unit.family === 'sableye' && killer && killer.stats.hp > 0 && !this.unitStates.get(unit)?.isSilenced) {
            this.log(`${unit.name} 對 ${killer.name} 發動了同命！`);
            const state = this.unitStates.get(unit) || {};
            state.isAbsoluteKill = true;
            this.unitStates.set(unit, state);
            await this.dealDamage(unit, killer, 9999);
            // reset is not strictly needed since unit faints, but good for safety
            state.isAbsoluteKill = false;
        }

        // 1. Emit AFTER_DEATH (Fuecoco etc. triggers here)
        // Pass deathIdx to help summons find their parent's spot even after shifts
        const { myTeam } = this.getTeams(unit);
        const deathIdx = myTeam.indexOf(unit);
        await this.eventBus.emit({ type: 'AFTER_DEATH', source: unit, context: { killer, deathIdx } });

        // 2. Remove from team (Victim is gone)
        if (this.playerTeam.includes(unit)) {
            const idx = this.playerTeam.indexOf(unit);
            if (this.playerTeam[idx] === unit) {
                this.playerTeam[idx] = null as any;
            }
        } else if (this.enemyTeam.includes(unit)) {
            const idx = this.enemyTeam.indexOf(unit);
            if (this.enemyTeam[idx] === unit) {
                this.enemyTeam[idx] = null as any;
            }
        }

        // 3. Process Killer Rewards ONLY if killer survived
        if (killer && killer.stats.hp > 0 && !this.unitStates.get(killer)?.isSilenced) {
            const executeReward = async () => {
                // Critical: Re-check survival if reward was deferred
                if (killer.stats.hp <= 0) return;

                // Sneasel family: Atk on kill (Permanent)
                if (killer.family === 'sneasel') {
                    const original = this.originalPlayerTeam?.find(u => u && u.id === killer.id);
                    const buff = killer.level >= 2 ? 2 : 1;
                    this.growUnit(killer, 0, buff, '狃拉技能', original);
                }

                // Charmander family: Stats on kill (Temporary)
                if (killer.family === 'charmander') {
                    if (killer.level >= 3) {
                        const canAddAtk = killer.stats.attack < 50;
                        const canAddHp = killer.stats.maxHp < 50;
                        const buff = 5;

                        let choice: 'hp' | 'atk';
                        if (canAddAtk && !canAddHp) choice = 'atk';
                        else if (canAddHp && !canAddAtk) choice = 'hp';
                        else choice = Math.random() < 0.5 ? 'atk' : 'hp';

                        this.log(`${killer.name} 發動了蓄能焰襲！`);
                        if (choice === 'atk') this.growUnit(killer, 0, buff, '蓄能焰襲強化');
                        else this.growUnit(killer, buff, 0, '蓄能焰襲強化');
                    } else {
                        const buff = killer.level;
                        const canAddAtk = killer.stats.attack < 50;
                        const canAddHp = killer.stats.maxHp < 50;

                        let choice: 'hp' | 'atk';
                        if (canAddAtk && !canAddHp) {
                            choice = 'atk';
                        } else if (canAddHp && !canAddAtk) {
                            choice = 'hp';
                        } else {
                            choice = Math.random() < 0.5 ? 'atk' : 'hp';
                        }

                        this.log(`${killer.name} 發動了蓄能焰襲！`);
                        if (choice === 'atk') this.growUnit(killer, 0, buff, '蓄能焰襲強化');
                        else this.growUnit(killer, buff, 0, '蓄能焰襲強化');
                    }
                }

                // Cyndaquil family: Atk and HP on kill (Temporary)
                if (killer.family === 'cyndaquil') {
                    const kState = this.unitStates.get(killer) || {};
                    const maxTimes = killer.level + 1;
                    const used = kState.cyndaquilKills || 0;
                    if (used < maxTimes) {
                        kState.cyndaquilKills = used + 1;
                        this.unitStates.set(killer, kState);
                        const amt = killer.level >= 3 ? 4 : 2;
                        this.growUnit(killer, amt, amt, '發動了火焰輪！');
                    }
                }

                // Reward logic handled by event listeners in registerUnitAbilities
            };

            if (this.isSimulatingStep) {
                this.queuedKillRewards.push(executeReward);
            } else {
                await executeReward();
            }
        }

        // Special: Wait 150ms before compacting as per refined plan
        await this.delay(150);
        // compactTeams is now called after both attacks in simulateStep
    }

    private async compactTeams() {
        this.isCompacting = true;
        // Track old positions to detect movement
        const oldPos = new Map<string, number>();
        [...this.playerTeam, ...this.enemyTeam].forEach((u, i) => {
            if (u) oldPos.set(u.id, i);
        });

        this.playerTeam = this.compactTeam(this.playerTeam);
        this.enemyTeam = this.compactTeam(this.enemyTeam);

        // Emit ON_MOVE for units that actually shifted
        const allUnits = [...this.playerTeam, ...this.enemyTeam];
        for (let i = 0; i < allUnits.length; i++) {
            const u = allUnits[i];
            if (u && oldPos.has(u.id) && oldPos.get(u.id) !== i) {
                // Potential optimization: only emit if game is in progress
                await this.eventBus.emit({ type: 'ON_MOVE', source: u, context: {} });
            }
        }

        if (this.onUpdate) this.onUpdate();
        this.isCompacting = false;
        await this.delay(100); // 0.1s delay after movement
    }

    private compactTeam(team: Unit[]): Unit[] {
        const survivors = team.filter(u => u !== null && u.stats.hp > 0);
        const result = new Array(5).fill(null);
        for (let i = 0; i < survivors.length; i++) {
            result[i] = survivors[i];
        }
        return result;
    }

    private heal(target: Unit, amount: number) {
        if (target.stats.hp <= 0) return;
        target.stats.hp = Math.min(target.stats.hp + amount, target.stats.maxHp);
    }

    private async spawnUnit(team: Unit[], index: number, templateId: string, level: number, hp: number, attack: number, insert: boolean = false) {
        const template = UNIT_TEMPLATES[templateId];
        if (!template) return;
        const newUnit = new Unit(template);
        newUnit.level = level;
        // Fix: Ensure spawned stats are at least 1/1 to prevent instant death or invincibility
        const safeHp = Math.max(1, hp);
        const safeAtk = Math.max(1, attack);
        newUnit.stats.hp = safeHp;
        newUnit.stats.maxHp = safeHp;
        newUnit.stats.attack = safeAtk;
        // Feature: Cap spawned unit stats at 50/50
        newUnit.capStats();
        newUnit.family = template.family || template.id;
        newUnit.synergies = [...template.synergies];

        // User Request: Spawned tokens should use 01 (Battle Image) if available
        newUnit.imageUrl = template.battleImageUrl || template.imageUrl;
        newUnit.battleImageUrl = template.battleImageUrl;

        // Team Limit Check: Field limit is 5 survivors.
        const livingUnits = team.filter(u => u && u.stats.hp > 0).length;
        // Clamp index to slot 0-4 for replacement check
        const checkIdx = Math.min(index, 4);
        const isReplacingSlot = !team[checkIdx] || team[checkIdx].stats.hp <= 0;

        if (livingUnits >= 5 && !isReplacingSlot) {
            this.log(`戰場已滿，無法再召喚 ${newUnit.name}！ `);
            return;
        }

        // Placement Logic: "若有空間即召喚"
        if (insert) {
            // Clamp index to slot 0-4 to prevent array expansion beyond 5
            let safeIdx = Math.min(index, 4);

            // Priority 1: Fill the target slot if empty/dead
            if (!team[safeIdx] || team[safeIdx].stats.hp <= 0) {
                team[safeIdx] = newUnit;
            } else {
                // Priority 2: Splice into position (shifts others back)
                team.splice(safeIdx, 0, newUnit);

                // Then immediately find and remove a vacancy to restore length 5
                const vacancyIdx = team.findIndex((u, i) => i !== safeIdx && (!u || u.stats.hp <= 0));
                if (vacancyIdx !== -1) {
                    team.splice(vacancyIdx, 1);
                } else if (team.length > 5) {
                    // Safety: if no vacancy found, pop the one pushed past index 4
                    team.splice(5, team.length - 5);
                }
            }
        } else {
            // Click/Standard Spawn: Fill first null or append within 5-slot limit
            const nullIdx = team.findIndex(u => !u || u.stats.hp <= 0);
            if (nullIdx !== -1 && nullIdx < 5) team[nullIdx] = newUnit;
            else if (team.length < 5) team.push(newUnit);
        }

        this.unitStates.set(newUnit, {});
        this.registerUnitAbilities(newUnit);

        // 1. Refresh UI so the DOM element for the new unit is created
        if (this.onUpdate) this.onUpdate();
        // Delay removed as per user request to fix Chikorita/Treecko sync issues

        // 2. Play spawn animation and log (Deferred to ensure DOM exists after React render)
        requestAnimationFrame(() => {
            const el = document.getElementById(newUnit.id);
            if (el) el.classList.add('spawn-anim');
        });
        this.log(`${newUnit.name} 加入了戰場！`);

        // 3. Stand up delay removed

        // 4. Finally emit the event for others to react (e.g. Chikorita buffs)
        await this.eventBus.emit({ type: 'ON_FRIEND_SUMMONED', source: newUnit, context: {} });
    }

    private async notifySkill(unit: Unit, message: string) {
        const fullMsg = `${unit.name} ${message}！`;
        this.log(fullMsg);
        await this.delay(250); // 0.25s pause for visual feedback
    }

    private log(message: string) {
        this.logs.push({ message, turn: this.turnCount });
        if (this.onUpdate) this.onUpdate();
    }

    private async playTeamAnimation(units: (Unit | null)[], anim: string, duration: number) {
        const aliveUnits = units.filter(u => u && u.stats.hp > 0) as Unit[];
        if (aliveUnits.length === 0) return;

        // Ensure DOM update before seeking elements
        if (this.onUpdate) this.onUpdate();

        return new Promise<void>(resolve => {
            requestAnimationFrame(async () => {
                const className = `${anim}-anim`; // anim might be a full class like 'glow-pale-red'
                // Use the animation name directly if no '-anim' suffix is needed, but playAnimation uses suffix
                // Let's allow raw class names for more flexibility
                const finalClass = anim.includes('-') ? anim : className;

                const elements: HTMLElement[] = [];
                aliveUnits.forEach(u => {
                    const el = document.getElementById(u.id);
                    if (el) {
                        el.classList.add(finalClass);
                        elements.push(el);
                    }
                });

                await this.delay(duration);

                elements.forEach(el => el.classList.remove(finalClass));
                resolve();
            });
        });
    }

    private async playAnimation(unit: Unit, anim: string, duration: number) {
        // Ensure DOM update before seeking element
        if (this.onUpdate) this.onUpdate();

        // Use requestAnimationFrame to ensure the element exists if it was JUST rendered
        return new Promise<void>(resolve => {
            requestAnimationFrame(async () => {
                const el = document.getElementById(unit.id);
                if (el) {
                    const className = `${anim}-anim`;
                    el.classList.add(className);
                    await this.delay(duration);
                    el.classList.remove(className);
                }
                resolve();
            });
        });
    }

    public async simulateStep(): Promise<boolean> {
        const pFront = this.playerTeam.find(u => u !== null && u.stats.hp > 0);
        const eFront = this.enemyTeam.find(u => u !== null && u.stats.hp > 0);

        if (!pFront || !eFront) return false;

        this.turnCount++;

        const pEl = document.getElementById(pFront.id);
        const eEl = document.getElementById(eFront.id);
        if (pEl) pEl.style.setProperty('--clash-offset', '20px');
        if (eEl) eEl.style.setProperty('--clash-offset', '20px');

        // 1. Start clash animations
        const anims = [
            this.playAnimation(pFront, 'clash', 300),
            this.playAnimation(eFront, 'clash', 300)
        ];

        // 2. Wait for the "impact" point (middle of clash animation)
        await this.delay(150);

        // 3. Trigger damage and logic (Enable deferred rewards)
        this.isSimulatingStep = true;
        this.queuedKillRewards = [];

        await Promise.all([
            this.performAttack(pFront, eFront),
            this.performAttack(eFront, pFront)
        ]);

        this.isSimulatingStep = false;

        // 4. Process deferred rewards for ANY unit that survived the clash
        for (const executeReward of this.queuedKillRewards) {
            await executeReward();
        }
        this.queuedKillRewards = [];

        // 5. Wait for animations and any triggered secondary actions (summoning, etc.)
        await Promise.all(anims);

        // 6. Short buffer for cascading death effects (like Drifloon exploding)
        await this.delay(200);

        // 7. Compact teams to ensure survivors are in their final positions
        await this.compactTeams();

        // 7. Victory Check with human-readable buffer
        const result = this.getResult();
        if (result !== null) {
            // Before declaring victory, ensure we aren't mid-summoning
            // (e.g. Rattata just died, we want to see the mice before Victory pops)
            await this.delay(1500);
        }

        return this.playerTeam.some(u => u !== null && u.stats.hp > 0) &&
            this.enemyTeam.some(u => u !== null && u.stats.hp > 0);
    }

    public getResult(): 'WIN' | 'LOSS' | 'DRAW' | null {
        const pAlive = this.playerTeam.some(u => u !== null && u.stats.hp > 0);
        const eAlive = this.enemyTeam.some(u => u !== null && u.stats.hp > 0);

        if (!pAlive && !eAlive) return 'DRAW';
        if (!pAlive) return 'LOSS';
        if (!eAlive) return 'WIN';
        return null;
    }

    private delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
