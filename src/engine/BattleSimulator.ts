
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
    private spiritombTriggered: Set<string> = new Set(); // To track 'player' or 'enemy' activation
    private originalPlayerTeam: (Unit | null)[] | null = null;
    // Cached Synergies (Persist through death)
    private playerSynergies = new Map<string, number>();
    private enemySynergies = new Map<string, number>();

    constructor(playerTeam: (Unit | null)[], enemyTeam: (Unit | null)[], originalPlayerTeam?: (Unit | null)[]) {
        this.originalPlayerTeam = originalPlayerTeam || null;
        // Preserve 5-slot architecture to match UI indices exactly
        this.playerTeam = playerTeam.map(u => u ? this.cloneUnit(u) : null) as Unit[];
        this.enemyTeam = enemyTeam.map(u => u ? this.cloneUnit(u) : null) as Unit[];
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
            const utility = ['ditto', 'mankey', 'dwebble', 'mudkip', 'gulpin'];
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

        // 6. Apply Start-of-Battle Synergies (Constant effects + Snow Weather)
        await this.applyBattleStartSynergies(this.playerTeam.filter(u => u !== null));
        await this.applyBattleStartSynergies(this.enemyTeam.filter(u => u !== null));

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
            this.log(`${unit.name} 被沉默了，無法發動戰鬥開始技能！`);
            return;
        }

        // Mankey: Front Ally +2/5/10 Atk
        if (unit.family === 'mankey') {
            const idx = myTeam.indexOf(unit);
            if (idx > 0) {
                const front = myTeam[idx - 1];
                if (front) {
                    const amount = [0, 2, 5, 10][unit.level] || 2;
                    this.buffAttack(front, amount, 'Mankey');
                    await this.notifySkill(unit, `提升了 ${front.name} 的攻擊力`);
                }
            }
        }

        // Dwebble: Front Ally +2/5/10 HP
        if (unit.family === 'dwebble') {
            const idx = myTeam.indexOf(unit);
            if (idx > 0) {
                const front = myTeam[idx - 1];
                if (front) {
                    const amount = [0, 2, 5, 10][unit.level] || 2;
                    this.growUnit(front, amount, 0, 'Dwebble');
                    await this.notifySkill(unit, `提升了 ${front.name} 的生命值`);
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
                    await this.notifySkill(unit, `對 ${target.name} 發射了火花`);
                    await this.dealDamage(unit, target, 4, true);
                    // Wait for death effects/compaction to settle before next fire breath
                    await this.delay(50);
                } else break;
            }
        }

        // Spiritomb: Invalidate 2 enemy skills (Exclusive: Once per team, no Spiritomb targets)
        if (unit.family === 'spiritomb') {
            if (this.spiritombTriggered.has(side)) {
                this.log(`${unit.name} 保持沉默 (該隊伍的花岩怪技能已發動過)。`);
                return;
            }

            const livingEnemies = opTeam.filter(e => e && e.stats.hp > 0 && e.family !== 'spiritomb');
            if (livingEnemies.length > 0) {
                const targets = [...livingEnemies].sort(() => 0.5 - Math.random()).slice(0, 2);
                await this.notifySkill(unit, `封印了對手的技能`);
                for (const t of targets) {
                    const tState = this.unitStates.get(t) || {};
                    tState.isSilenced = true;
                    this.unitStates.set(t, tState);
                    this.log(`${unit.name} 封印了 ${t.name} 的技能！`);
                }
                this.spiritombTriggered.add(side);
            }
        }

        // Ditto: Transform
        if (unit.family === 'ditto') {
            const allies = myTeam.filter(u => u && u !== unit && u.stats.hp > 0);
            if (allies.length > 0) {
                let target = allies[0];
                for (const u of allies) {
                    if (u.stats.hp > target.stats.hp) target = u;
                }
                await this.notifySkill(unit, `變身成了 ${target.name}`);
                unit.family = target.family;
                unit.synergies = [...target.synergies];
                unit.imageUrl = target.imageUrl;

                // Recalculate Synergies after transformation!
                this.calculateCachedSynergies(this.playerTeam.filter(u => u !== null), this.playerSynergies);
                this.calculateCachedSynergies(this.enemyTeam.filter(u => u !== null), this.enemySynergies);

                // Register new abilities (Ditto still keeps its SOBA trigger, but adds new ones)
                this.registerUnitAbilities(unit);

                // Chain Reaction: If new form has Battle-Start ability, trigger it immediately
                const startAbilities = ['mankey', 'dwebble', 'houndour', 'spiritomb', 'mudkip', 'gulpin'];
                if (startAbilities.includes(unit.family)) {
                    this.log(`${unit.name} (變身後) 立即發動新的戰鬥開始技能！`);
                    await this.executeUnitStartOfBattleAbility(unit);
                }
            }
        }

        // Mudkip: Support Front Ally
        if (unit.family === 'mudkip') {
            const idx = myTeam.indexOf(unit);
            if (idx > 0) {
                const front = myTeam[idx - 1];
                if (front) {
                    const amount = [0, 3, 5, 10][unit.level] || 3;
                    this.growUnit(front, amount, amount, 'Mudkip');
                    await this.notifySkill(unit, `支援了 ${front.name}`);
                }
            }
        }

        // Gulpin & Swalot: Swallow Front Ally
        if (unit.family === 'gulpin') {
            const idx = myTeam.indexOf(unit);
            if (idx > 0) {
                const front = myTeam[idx - 1];
                if (front && front.stats.hp > 0) {
                    await this.notifySkill(unit, `吞下了 ${front.name}`);
                    this.growUnit(unit, front.stats.maxHp, front.stats.attack, 'Swallow');
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
            team.filter(u => u && u.synergies.includes('Triplets')).forEach(u => {
                this.growUnit(u, 2, 2, 'Triplets');
            });
        }
        if (this.getSynergyCountForUnit(team[0], 'Starter') >= 3) {
            team.filter(u => u && u.synergies.includes('Starter')).forEach(u => {
                this.growUnit(u, 1, 1, 'Starter');
            });
        }

        if (this.getSynergyCountForUnit(team[0], 'Snow') >= 2) {
            this.log("天空開始下雪了...");
            const { myTeam, opTeam } = this.getTeams(team[0]);
            const allUnits = [...myTeam, ...opTeam].filter(u => u !== null && u.stats.hp > 0);

            for (const target of allUnits) {
                // If it's a Snow member, it's immune to the synergy dmg
                if (target.synergies.includes('Snow')) continue;

                this.log(`下雪效果：${target.name} 受到 5 點傷害！`);
                await this.dealDamage(null, target, 5, true);
            }
        }
    }

    private growUnit(unit: Unit, hp: number, atk: number, sourceName?: string, permanentTarget?: Unit | null) {
        if (hp === 0 && atk === 0) return;
        unit.addGrowth(hp, atk);
        if (permanentTarget) permanentTarget.addGrowth(hp, atk);

        if (sourceName) {
            let msg = `${unit.name} gains `;
            if (hp > 0 && atk > 0) msg += `+${hp}/+${atk}`;
            else if (hp > 0) msg += `+${hp} HP`;
            else msg += `+${atk} Atk`;
            msg += ` (${sourceName})`;
            this.log(msg);
        }

        // Claw Synergy: Extra +2 Atk on any growth
        if (this.getSynergyCountForUnit(unit, 'Claw') >= 2 && unit.synergies.includes('Claw')) {
            unit.stats.attack += 2;
            unit.capStats();
            if (permanentTarget) {
                permanentTarget.stats.attack += 2;
                permanentTarget.capStats();
            }
            this.log(`${unit.name} gains +2 Atk from Claw!`);
        }
    }

    private buffAttack(unit: Unit, amount: number, sourceName: string) {
        if (amount < 0 && unit.family === 'sneasel') {
            this.log(`${unit.name} resists the attack reduction!`);
            return;
        }
        unit.addBuff(amount);
        this.log(`${unit.name} gains ${amount >= 0 ? '+' : ''}${amount} Atk (${sourceName})`);
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
                    const heal = count >= 4 ? 4 : (count >= 3 ? 3 : (count >= 2 ? 2 : 0));
                    // Double-check HP again right before healing to prevent race conditions
                    if (heal > 0 && unit.stats.hp > 0) this.heal(unit, heal);
                }
            });
        }

        // Water: HP Growth on Attack
        if (unit.synergies.includes('Water')) {
            this.eventBus.on('BEFORE_ATTACK', (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                if (unit.stats.hp <= 0) return;
                if (e.source === unit) {
                    const count = this.getSynergyCountForUnit(unit, 'Water');
                    const buff = count >= 4 ? 4 : (count >= 3 ? 2 : (count >= 2 ? 1 : 0));
                    if (buff > 0) {
                        this.growUnit(unit, buff, 0, 'Water');
                    }
                }
            });
        }

        // Torchic: Pursuit
        if (unit.family === 'torchic') {
            this.eventBus.on('BEFORE_ATTACK', async (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                const { myTeam } = this.getTeams(unit);
                const idx = myTeam.indexOf(unit);
                if (idx > 0 && myTeam[idx - 1] === e.source && e.target) {
                    this.log(`${unit.name} pursuits!`);
                    await this.dealDamage(unit, e.target, 2 * unit.level);
                }
            });
        }

        // Fire: Atk Buff on Attack
        if (unit.synergies.includes('Fire')) {
            this.eventBus.on('BEFORE_ATTACK', (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                if (e.source === unit) {
                    const count = this.getSynergyCountForUnit(unit, 'Fire');
                    const buff = count >= 4 ? 4 : (count >= 3 ? 2 : (count >= 2 ? 1 : 0));
                    if (buff > 0) this.buffAttack(unit, buff, 'Fire');
                }
            });
        }

        // Angry: Atk on Hurt
        if (unit.synergies.includes('Angry')) {
            this.eventBus.on('ON_HURT', (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                if (e.target === unit) {
                    if (this.getSynergyCountForUnit(unit, 'Angry') >= 2) {
                        this.buffAttack(unit, 2, 'Angry');
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
                            this.log(`${unit.name} 撤退到了後排！`);
                            await this.compactTeams();
                            await this.eventBus.emit({ type: 'ON_MOVE', source: unit, context: {} });
                        }
                    }
                }
            });
        }

        // Slowpoke Family: Heal below 50%
        if (unit.family === 'slowpoke') {
            this.eventBus.on('ON_HURT', (e) => {
                if (e.target === unit && !this.unitStates.get(unit)?.isSilenced) {
                    const state = this.unitStates.get(unit) || {};
                    if (!state.slowpokeHealUsed && unit.stats.hp > 0 && unit.stats.hp < unit.stats.maxHp * 0.5) {
                        const amount = [0, 6, 12, 20][unit.level] || 6;
                        this.heal(unit, amount);
                        state.slowpokeHealUsed = true;
                        this.unitStates.set(unit, state);
                        this.log(`${unit.name} 發動了再生 (+${amount} HP)！`);
                    }
                }
            });
        }

        // Farfetch'd: First attack deals 99 damage
        if (unit.family === 'farfetchd') {
            this.eventBus.on('BEFORE_ATTACK', (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                if (e.source === unit) {
                    const state = this.unitStates.get(unit) || {};
                    if (!state.isLethalStrike) {
                        state.isLethalStrike = true;
                        this.unitStates.set(unit, state);
                        this.log(`${unit.name} 準備進行致命一擊！`);
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
                        this.buffAttack(unit, currentAtk, 'Heracross');
                        state.heracrossEnraged = true;
                        this.unitStates.set(unit, state);
                        this.log(`${unit.name} 進入憤怒狀態！攻擊力翻倍！`);
                    }
                }
            });
        }

        // Onix: Stats on Move
        if (unit.family === 'onix') {
            this.eventBus.on('ON_MOVE', async (e) => {
                if (e.source === unit && !this.unitStates.get(unit)?.isSilenced) {
                    await this.notifySkill(unit, '提升了生命值');
                    this.growUnit(unit, 2, 0, 'Onix');
                    const original = this.originalPlayerTeam?.find(u => u && u.id === unit.id);
                    if (original) original.addGrowth(2, 0);
                }
            });
        }

        // Fuecoco: Ally Death -> Gain HP
        if (unit.family === 'fuecoco') {
            this.eventBus.on('AFTER_DEATH', (e) => {
                if (unit.stats.hp <= 0 || this.unitStates.get(unit)?.isSilenced) return;
                const { myTeam } = this.getTeams(unit);
                if (e.source && myTeam.includes(e.source) && e.source !== unit) {
                    const amount = 2 * unit.level;
                    this.growUnit(unit, amount, 0, 'Fuecoco');
                }
            });
        }

        // Bulbasaur: Spawn Sprout (Prevent loop if instance is already a sprout)
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

                    const count = unit.level; // 1, 2, 3 based on level/star
                    await this.notifySkill(unit, `召喚了 ${count} 隻小樹苗`);
                    for (let i = 0; i < count; i++) {
                        // Re-fetch team reference (compactTeams may replace the array object)
                        const { myTeam: currentTeam } = this.getTeams(unit);
                        await this.spawnUnit(currentTeam, deathIdx + i, 'sprout', 1, 1, 1, true);
                    }
                    await this.compactTeams();
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

                    await this.notifySkill(unit, '召喚了同伴');
                    const stats = [0, 1, 2, 3][unit.level] || 1;
                    for (let i = 0; i < 2; i++) {
                        const { myTeam: currentTeam } = this.getTeams(unit);
                        await this.spawnUnit(currentTeam, deathIdx + i, 'mouse', 1, stats, stats, true);
                    }
                    await this.compactTeams();
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
                        await this.notifySkill(unit, `對 ${target.name} 下了詛咒`);
                        const dmg = [0, 2, 5, 10][unit.level] || 2;
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
                    const dmg = [0, 1, 3, 8][unit.level] || 1;
                    await Promise.all(opTeam.filter(u => u && u.stats.hp > 0).map(u => this.dealDamage(unit, u!, dmg, true)));
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
                        this.log(`${unit.name}'s disguise protects it! (${state.mimikyuGuardsUsed}/${maxGuards})`);
                    }
                }
            });
        }

        // Chikorita Family: Buff Summons
        if (unit.family === 'chikorita') {
            this.eventBus.on('ON_FRIEND_SUMMONED', async (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                const { side: mySide } = this.getTeams(unit);
                const { side: sSide } = e.source ? this.getTeams(e.source) : { side: null };
                if (e.source && mySide === sSide && e.source !== unit) {
                    const buff = [0, 1, 2, 3][unit.level] || 1;
                    await this.notifySkill(unit, `激勵了召喚物 ${e.source.name}，屬性 +${buff}/+${buff}`);
                    this.growUnit(e.source, buff, buff, '菊草葉的激勵');
                }
            });
        }

        // Treecko Family: Damage on Summon
        if (unit.family === 'treecko') {
            this.eventBus.on('ON_FRIEND_SUMMONED', async (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                const { side: mySide, opTeam } = this.getTeams(unit);
                const { side: sSide } = e.source ? this.getTeams(e.source) : { side: null };

                if (e.source && mySide === sSide && e.source !== unit) {
                    const dmg = [0, 2, 4, 6][unit.level] || 2;
                    const living = opTeam.filter(u => u && u.stats.hp > 0);
                    if (living.length > 0) {
                        const target = living[0];
                        await this.notifySkill(unit, `與 ${e.source.name} 連動，對 ${target.name} 造成了 ${dmg} 傷害`);
                        await this.dealDamage(unit, target, dmg, true);
                    }
                }
            });
        }

        // Sprigatito Family: Gain stats on Summon
        if (unit.family === 'sprigatito') {
            this.eventBus.on('ON_FRIEND_SUMMONED', (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                const { myTeam } = this.getTeams(unit);
                if (e.source && myTeam.includes(e.source) && e.source !== unit) {
                    const buff = [0, 3, 5, 10][unit.level] || 3;
                    this.growUnit(unit, buff, buff, 'Sprigatito');
                }
            });
        }
    }

    public async performAttack(attacker: Unit, defender: Unit) {
        if (attacker.stats.hp <= 0 || defender.stats.hp <= 0) return;
        this.log(`${attacker.name} 攻擊了 ${defender.name}！`);

        await this.eventBus.emit({ type: 'BEFORE_ATTACK', source: attacker, target: defender, context: {} });

        const attackPromises: Promise<any>[] = [];
        const dmg = attacker.stats.attack;

        // Base attack
        attackPromises.push(this.dealDamage(attacker, defender, dmg, false));

        // Kangaskhan: Second hit if evolved and defender still alive
        if (attacker.family === 'kangaskhan' && (defender.templateId !== defender.family) && !this.unitStates.get(attacker)?.isSilenced) {
            await Promise.all(attackPromises); // Wait for the first hit
            if (defender.stats.hp > 0) {
                await this.notifySkill(attacker, '發動了連擊');
                attackPromises.push(this.dealDamage(attacker, defender, dmg, false));
            }
        }

        // Doduo: Extra random hit (Maximum 1 extra hit)
        if (attacker.family === 'doduo' && !this.unitStates.get(attacker)?.isSilenced) {
            const chance = [0, 0.25, 0.33, 0.5][attacker.level] || 0.25;
            if (Math.random() < chance) {
                const side = this.initialPlayerSet.has(attacker) ? 'enemy' : 'player';
                const opTeam = side === 'enemy' ? this.enemyTeam : this.playerTeam;
                const living = opTeam.filter(u => u && u.stats.hp > 0);
                if (living.length > 0) {
                    const target = living[Math.floor(Math.random() * living.length)];
                    this.log(`${attacker.name} 發動二連擊，擊中了 ${target.name}！`);
                    attackPromises.push(this.dealDamage(attacker, target, dmg));
                }
            }
        }

        // Sneasel: 1 extra random hit (Can hit same target if only 1 enemy)
        if (attacker.family === 'sneasel' && !this.unitStates.get(attacker)?.isSilenced) {
            const side = this.initialPlayerSet.has(attacker) ? 'enemy' : 'player';
            const opTeam = side === 'enemy' ? this.enemyTeam : this.playerTeam;
            const liveEnemies = opTeam.filter(u => u && u.stats.hp > 0);
            if (liveEnemies.length > 0) {
                // Priority to other enemies, but hit same if only 1 enemy total
                const others = liveEnemies.filter(u => u !== defender);
                const r = others.length > 0 ? others[Math.floor(Math.random() * others.length)] : defender;
                this.log(`${attacker.name} 揮擊了 ${r.name}！`);
                attackPromises.push(this.dealDamage(attacker, r, dmg));
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
                    const splashDmg = [0, 2, 4, 6][attacker.level] || 2;
                    await this.notifySkill(attacker, `波及到了 ${neighbor.name}`);
                    attackPromises.push(this.dealDamage(attacker, neighbor, splashDmg, true));
                }
            }
        }

        await Promise.all(attackPromises);

        // Snover: Knockback
        if (attacker.family === 'snover' && !this.unitStates.get(attacker)?.isSilenced) {
            this.growUnit(attacker, 0, 1, 'Snover');
            if (defender.stats.hp > 0) {
                const team = this.playerTeam.includes(defender) ? this.playerTeam : this.enemyTeam;
                const idx = team.indexOf(defender);
                if (idx !== -1 && idx < team.length - 1) {
                    const behind = team[idx + 1];
                    if (behind) {
                        team[idx] = behind;
                        team[idx + 1] = defender;
                        await this.notifySkill(attacker, `擊退了 ${defender.name}`);
                        await this.compactTeams();
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

        const targetState = this.unitStates.get(target) || {};
        // Source state for bypass logic
        const sourceState = source ? this.unitStates.get(source) || {} : {};
        const isBypassing = (source && source.family === 'pinsir' && !sourceState.isSilenced) ||
            (source && source.family === 'sableye' && sourceState.isAbsoluteKill);

        // Lethal Strike (Farfetch'd)
        if (sourceState.isLethalStrike) {
            sourceState.isLethalStrike = false; // Consume it
            amount = 99;
            this.log(`致命一擊！ ${target.name} 被擊倒了！`);
        }

        // Diglett: Chance to dodge (only basic attacks, not skills; Pinsir bypasses)
        if (target.family === 'diglett' && !targetState.isSilenced && !isSkillDamage && !isBypassing) {
            const dodgeChance = [0, 0.25, 0.33, 0.5][target.level] || 0.25;
            if (Math.random() < dodgeChance) {
                this.log(`${target.name} 躲開了攻擊！`);
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
            this.log(`${source.name} 穿透了防禦！`);
        }

        target.stats.hp -= amount;
        this.log(`${target.name} 受到 ${amount} 點傷害！`);
        if (this.onUpdate) this.onUpdate();

        // Hard: Death block (Synergy check)
        // Pinsir and Sableye-Revenge ignore Hard!
        if (target.stats.hp <= 0 && !isBypassing && target.synergies.includes('Hard') && this.getSynergyCountForUnit(target, 'Hard') >= 2 && !targetState.hardUsed) {
            target.stats.hp = 1;
            targetState.hardUsed = true;
            this.unitStates.set(target, targetState);
            this.log(`${target.name} 挺住了攻擊！`);
        }

        if (target.stats.hp <= 0) {
            // DEATH: Go straight to handleDeath, skipping hurt animation
            await this.handleDeath(target, source || undefined);
        } else {
            // SURVIVE: Play hurt animation IF not in front row (index 0)
            const { myTeam } = this.getTeams(target);
            const isFront = myTeam[0] === target;

            if (!isFront) {
                await this.eventBus.emit({ type: 'ON_HURT', target, context: { source, amount } });
                await this.playAnimation(target, 'hurt', 150);
                await this.delay(100); // Wait 100ms after flicker
            } else {
                // Front row: skip anim to reduce clutter (clash is enough feedback)
                await this.eventBus.emit({ type: 'ON_HURT', target, context: { source, amount } });
            }
        }
    }

    private async handleDeath(unit: Unit, killer?: Unit) {
        // Removed isSwallowed guard to ensure cleanup
        this.log(`${unit.name} 倒下了！`);

        // Sableye: Revenge kill
        if (unit.family === 'sableye' && killer && killer.stats.hp > 0 && !this.unitStates.get(unit)?.isSilenced) {
            this.log(`${unit.name} 拉著 ${killer.name} 同歸於盡！`);
            const state = this.unitStates.get(unit) || {};
            state.isAbsoluteKill = true;
            this.unitStates.set(unit, state);
            await this.dealDamage(unit, killer, 9999);
            // reset is not strictly needed since unit faints, but good for safety
            state.isAbsoluteKill = false;
        }

        await this.eventBus.emit({ type: 'AFTER_DEATH', source: unit, context: { killer } });

        // Remove from team AFTER emitting AFTER_DEATH
        // This ensures summons triggered by DEATH events can find the target unit's index in the array
        // Remove from team AFTER emitting AFTER_DEATH
        // This ensures summons triggered by DEATH events can find the target unit's index in the array
        if (this.playerTeam.includes(unit)) {
            const idx = this.playerTeam.indexOf(unit);
            // Fix: Only clear if the slot hasn't been taken by a new summon already
            if (this.playerTeam[idx] === unit || (this.playerTeam[idx] && this.playerTeam[idx].stats.hp <= 0)) {
                this.playerTeam[idx] = null as any;
            }
        } else if (this.enemyTeam.includes(unit)) {
            const idx = this.enemyTeam.indexOf(unit);
            // Fix: Only clear if the slot hasn't been taken by a new summon already
            if (this.enemyTeam[idx] === unit || (this.enemyTeam[idx] && this.enemyTeam[idx].stats.hp <= 0)) {
                this.enemyTeam[idx] = null as any;
            }
        }

        if (killer && killer.stats.hp > 0 && !this.unitStates.get(killer)?.isSilenced) {
            // Sneasel family: Atk on kill (Permanent)
            if (killer.family === 'sneasel') {
                const original = this.originalPlayerTeam?.find(u => u && u.id === killer.id);
                this.growUnit(killer, 0, 3, '狃拉技能', original);
            }

            // Charmander family: Stats on kill
            if (killer.family === 'charmander') {
                const buff = killer.level;
                const original = this.originalPlayerTeam?.find(u => u && u.id === killer.id);
                if (Math.random() < 0.5) this.growUnit(killer, 0, buff, 'Charmander', original);
                else this.growUnit(killer, buff, 0, 'Charmander', original);
            }

            // Cyndaquil family: Atk and HP on kill
            if (killer.family === 'cyndaquil') {
                const kState = this.unitStates.get(killer) || {};
                const maxTimes = killer.level;
                const used = kState.cyndaquilKills || 0;
                if (used < maxTimes) {
                    kState.cyndaquilKills = used + 1;
                    this.unitStates.set(killer, kState);
                    const original = this.originalPlayerTeam?.find(u => u && u.id === killer.id);
                    this.growUnit(killer, 3, 2, 'Cyndaquil', original);
                }
            }

            // Quaxly family: Atk on kill
            if (killer.family === 'quaxly') {
                const buff = [0, 3, 5, 10][killer.level] || 3;
                const original = this.originalPlayerTeam?.find(u => u && u.id === killer.id);
                this.growUnit(killer, 0, buff, 'Quaxly', original);
            }
        }


        // Special: If unit just died but didn't trigger immediate spawn (which uses insert:true),
        // we compact. But spawnUnit(insert:true) handles displacement correctly.
        await this.compactTeams();
    }

    private async compactTeams() {
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
        newUnit.stats.hp = hp;
        newUnit.stats.maxHp = hp;
        newUnit.stats.attack = attack;
        newUnit.family = template.family || template.id;
        newUnit.synergies = [...template.synergies];

        // User Request: Spawned tokens should use 01 (Battle Image) if available
        newUnit.imageUrl = template.battleImageUrl || template.imageUrl;
        newUnit.battleImageUrl = template.battleImageUrl;

        // Team Limit Check: Field limit is 5 survivors.
        // We count only units with HP > 0.
        const livingUnits = team.filter(u => u && u.stats.hp > 0).length;
        if (livingUnits >= 5) {
            this.log(`戰場已滿，無法呼叫 ${newUnit.name}！ (存活: ${livingUnits}/5)`);
            return;
        }

        // Placement Logic: "若有空間即召喚"
        if (insert) {
            // Priority 1: Fill the dead unit's slot directly (Prevents array growth)
            if (team[index] === null || (team[index] && team[index].stats.hp <= 0)) {
                team[index] = newUnit;
            }
            // Priority 2: Find ANY other dead/null slot to avoid splice if possible
            else {
                const vacancyIdx = team.findIndex(u => !u || u.stats.hp <= 0);
                if (vacancyIdx !== -1) {
                    // We have a vacancy elsewhere. To respect the "insert" (ordering),
                    // we could splice at 'index' and then prune the vacancy.
                    team.splice(index, 0, newUnit);
                    // Remove the first vacancy found to keep array count stable
                    const newVacancyIdx = team.findIndex((u, i) => i !== index && (!u || u.stats.hp <= 0));
                    if (newVacancyIdx !== -1) team.splice(newVacancyIdx, 1);
                } else {
                    // Truly no vacancies in the 5-slot array? 
                    // This shouldn't happen if livingUnits < 5, but as a fallback:
                    team.splice(index, 0, newUnit);
                }
            }
        } else {
            // Click/Standard Spawn: Fill first null or append
            const nullIdx = team.indexOf(null as any);
            if (nullIdx !== -1) team[nullIdx] = newUnit;
            else team.push(newUnit);
        }

        this.unitStates.set(newUnit, {});
        this.registerUnitAbilities(newUnit);

        await this.eventBus.emit({ type: 'ON_FRIEND_SUMMONED', source: newUnit, context: {} });
        this.log(`${newUnit.name} 進入了戰場！`);
        await this.delay(50);
        const el = document.getElementById(newUnit.id);
        if (el) el.classList.add('spawn-anim');
    }

    private async notifySkill(unit: Unit, message: string) {
        const fullMsg = `【技能】${unit.name} ${message}！`;
        this.log(fullMsg);
        if (this.onUpdate) this.onUpdate();
        await this.delay(200); // 0.2s pause for visual feedback
    }

    private log(message: string) {
        this.logs.push({ message, turn: this.turnCount });
    }

    private async playAnimation(unit: Unit, anim: string, duration: number) {
        const el = document.getElementById(unit.id);
        if (el) {
            const className = `${anim}-anim`;
            el.classList.add(className);
            if (this.onUpdate) this.onUpdate();
            await this.delay(duration);
            el.classList.remove(className);
            if (this.onUpdate) this.onUpdate();
        }
    }

    public async simulateStep(): Promise<boolean> {
        const pFront = this.playerTeam.find(u => u !== null && u.stats.hp > 0);
        const eFront = this.enemyTeam.find(u => u !== null && u.stats.hp > 0);

        if (!pFront || !eFront) return false;

        this.turnCount++;

        const pEl = document.getElementById(pFront.id);
        const eEl = document.getElementById(eFront.id);
        if (pEl) pEl.style.setProperty('--clash-offset', '20px');
        if (eEl) eEl.style.setProperty('--clash-offset', '20px'); // Also 20px because scaleX(-1) reverses X axis

        // 1. Start clash animations
        const anims = [
            this.playAnimation(pFront, 'clash', 300),
            this.playAnimation(eFront, 'clash', 300)
        ];

        // 2. Wait for the "impact" point (middle of clash animation)
        await this.delay(100);

        // 3. Trigger damage and logic
        await Promise.all([
            this.performAttack(pFront, eFront),
            this.performAttack(eFront, pFront)
        ]);

        // 4. Wait for animations to complete before finishing the step
        await Promise.all(anims);

        // 5. Compact teams to ensure summons are settled before victory check
        await this.compactTeams();

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
