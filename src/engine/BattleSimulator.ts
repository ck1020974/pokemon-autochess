
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
    public unitStates: Map<Unit, any> = new Map();
    private lightScreenActivated: Set<string> = new Set();
    private initialPlayerSet: Set<Unit> = new Set();
    private spiritombTriggered: Set<string> = new Set();
    private psychicTriggered: Set<string> = new Set();
    private originalPlayerTeam?: (Unit | null)[];
    private isCompacting = false;
    private houndoomLogged: Set<string> = new Set();
    private onixLogged: Set<string> = new Set();
    private natuLogged: Set<string> = new Set();
    private isSimulatingStep = false;
    private queuedKillRewards: (() => Promise<void>)[] = [];
    private playerWins: number = 0;
    private playerAttackCount: number = 0;
    private enemyAttackCount: number = 0;
    // Cached Synergies (Persist through death)
    private playerSynergies = new Map<string, number>();
    private enemySynergies = new Map<string, number>();
    private speed: number = 1;

    constructor(playerTeam: (Unit | null)[], enemyTeam: (Unit | null)[], originalPlayerTeam?: (Unit | null)[], difficultyMultiplier: number = 1.0, playerWins: number = 0, speed: number = 1) {
        this.speed = speed;
        this.playerWins = playerWins;
        this.originalPlayerTeam = originalPlayerTeam;
        // Preserve 5-slot architecture to match UI indices exactly
        this.playerTeam = playerTeam.map(u => u ? this.cloneUnit(u) : null) as Unit[];
        this.enemyTeam = enemyTeam.map(u => {
            if (!u) return null;
            const clone = this.cloneUnit(u);
            // Apply Difficulty Scaling to Enemy (Ensure it doesn't drop below current values)
            clone.stats.hp = Math.max(clone.stats.hp, Math.floor(clone.stats.hp * difficultyMultiplier));
            clone.stats.maxHp = Math.max(clone.stats.maxHp, Math.floor(clone.stats.maxHp * difficultyMultiplier));
            clone.stats.attack = Math.max(clone.stats.attack, Math.floor(clone.stats.attack * difficultyMultiplier));
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
        this.lightScreenActivated.clear();
        this.houndoomLogged.clear();
        this.onixLogged.clear();
        this.natuLogged.clear();

        await this.compactTeams();

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

        await this.applyBattleStartSynergies(this.playerTeam.filter(u => u !== null));
        await this.applyBattleStartSynergies(this.enemyTeam.filter(u => u !== null));

        // Psychic Synergy Start Message
        const hasPsychic = (this.playerSynergies.get('Psychic') || 0) >= 2 || (this.enemySynergies.get('Psychic') || 0) >= 2;
        if (hasPsychic) {
            this.log("預知了未來的攻擊…");
        }

        // 7. Global Weather: Snow (Only triggers once even if both sides have it)
        const hasSnow = (this.playerSynergies.get('Snow') || 0) >= 2 || (this.enemySynergies.get('Snow') || 0) >= 2;
        if (hasSnow) {
            this.log("開始下冰雹了！");
            await this.delay(500);
            const allUnits = [...this.playerTeam, ...this.enemyTeam].filter((u: Unit) => u !== null && u.stats.hp > 0);
            for (const target of allUnits) {
                if (target.synergies.includes('Snow')) continue;

                // User Request: 33% of lifetime Max HP
                let dmg = Math.ceil(target.stats.maxHp * 0.33);
                // Feature: Snow damage cannot kill a unit (minimum 1 HP remaining)
                if (dmg >= target.stats.hp) {
                    dmg = Math.max(0, target.stats.hp - 1);
                }

                if (dmg > 0) {
                    // Silent set to true to avoid individual "受到 N 點傷害" logs
                    await this.dealDamage(null, target, dmg, true, true);
                }
                if (this.onUpdate) this.onUpdate();
                await this.delay(100);
            }
            this.log("冰雹襲擊了雙方隊伍！");
            await this.delay(400);
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
                    const original = this.originalPlayerTeam?.find(o => o && o.id === u!.id);
                    this.growUnit(u!, 0, 5, '耿鬼技能', original, true);
                    await this.delay(65);
                }
            } else {
                const idx = myTeam.indexOf(unit);
                if (idx > 0) {
                    const front = myTeam[idx - 1];
                    if (front) {
                        const amount = unit.templateId === 'haunter' ? 3 : 1;
                        const original = this.originalPlayerTeam?.find(o => o && o.id === front.id);
                        this.growUnit(front, 0, amount, '能力提升', original, true);
                        this.log(`${unit.name} 為 ${front.name} 提升了攻勢！`);
                    }
                }
            }
        }

        // Igglybuff Family: HP buff at start (Swapped from Dwebble)
        if (unit.family === 'igglybuff') {
            if (unit.templateId === 'wigglytuff') { // Stage 3
                await this.notifySkill(unit, `胖可丁發動了治癒波動！`);
                for (const u of myTeam.filter(u => u && u.stats.hp > 0)) {
                    const original = this.originalPlayerTeam?.find(o => o && o.id === u!.id);
                    this.growUnit(u!, 5, 0, '胖可丁技能', original, true);
                    await this.delay(65);
                }
            } else {
                const idx = myTeam.indexOf(unit);
                if (idx > 0) {
                    const front = myTeam[idx - 1];
                    if (front) {
                        const amount = unit.templateId === 'jigglypuff' ? 3 : 1;
                        const original = this.originalPlayerTeam?.find(o => o && o.id === front.id);
                        this.growUnit(front, amount, 0, '能力提升', original, true);
                        this.log(`${unit.name} 為 ${front.name} 恢復了生命！`);
                    }
                }
            }
        }

        // Houndour: 4*Lv Dmg to lowest HP enemy
        if (unit.family === 'houndour') {
            const times = [0, 1, 2, 3][unit.level] || 1;
            const currentOpTeam = this.playerTeam.includes(unit) ? this.enemyTeam : this.playerTeam;
            const livingEnemies = currentOpTeam.filter(e => e && e.stats.hp > 0);

            if (livingEnemies.length > 0 && times > 0) {
                let firstTarget = livingEnemies[0];
                for (const e of livingEnemies) {
                    if (e.stats.hp < firstTarget.stats.hp) firstTarget = e;
                }

                if (!this.houndoomLogged.has(side)) {
                    this.log(`${unit.name} 對 ${firstTarget.name} 發動了噴射火焰！`);
                    this.houndoomLogged.add(side);
                }

                for (let i = 0; i < times; i++) {
                    const freshEnemies = currentOpTeam.filter(e => e && e.stats.hp > 0);
                    if (freshEnemies.length === 0) break;

                    let bestTarget = freshEnemies[0];
                    for (const e of freshEnemies) {
                        if (e.stats.hp < bestTarget.stats.hp) bestTarget = e;
                    }
                    await this.dealDamage(unit, bestTarget, 4, true, true); // Silent hits
                    await this.delay(50);
                }
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
            const idx = myTeam.indexOf(unit);
            let target: Unit | null = null;
            if (idx > 0) {
                target = myTeam[idx - 1];
            }

            if (target && target.stats.hp > 0) {
                const originalName = unit.name;

                // 1. Play animation (Start) - Don't await yet
                const animPromise = this.playAnimation(unit, 'morph', 500);

                // 2. Log skill first so it uses original name
                this.log(`${originalName} 對 ${target.name} 使用了變身！`);

                // 3. Wait for the peak of the blur (250ms)
                await this.delay(250);

                // 4. Perform the data transformation
                unit.family = target.family;

                // Directly copy the target's exact template (ignoring star level difference)
                const currentTemplate = UNIT_TEMPLATES[target.templateId];

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

        // Natu/Xatu: Swap enemy first and last
        if (unit.family === 'natu' && !this.natuLogged.has(side)) {
            this.natuLogged.add(side);
            const livingEnemies = opTeam.filter(e => e && e.stats.hp > 0);
            if (livingEnemies.length >= 2) {
                // Determine how many times to teleport based on total Natu/Xatu in team
                const totalNatu = myTeam.filter(u => u && u.family === 'natu' && u.stats.hp > 0).length;
                const timesToExecute = totalNatu % 2 === 0 ? 2 : 1;

                for (let t = 0; t < timesToExecute; t++) {
                    // Re-fetch living enemies each time in case state changed (though unlikely at start)
                    const currentLiving = opTeam.filter(e => e && e.stats.hp > 0);
                    if (currentLiving.length < 2) break;

                    const first = currentLiving[0];
                    const last = currentLiving[currentLiving.length - 1];
                    const firstIdx = opTeam.indexOf(first);
                    const lastIdx = opTeam.indexOf(last);

                    if (firstIdx !== -1 && lastIdx !== -1 && firstIdx !== lastIdx) {
                        await this.notifySkill(unit, `發動了瞬間移動！`);
                        await Promise.all([
                            this.playAnimation(first, 'teleport', 400),
                            this.playAnimation(last, 'teleport', 400)
                        ]);

                        opTeam[firstIdx] = last;
                        opTeam[lastIdx] = first;
                        this.log(`${first.name} 和 ${last.name} 互換了位置！`);
                        await this.compactTeams();
                        await this.delay(300);
                        if (this.onUpdate) this.onUpdate();
                    }
                }
            }
        }

        // Mr. Mime: Light Screen (Once per team)
        if (unit.family === 'mrmime' && !this.lightScreenActivated.has(side)) {
            await this.notifySkill(unit, `發動了光牆！`);
            await this.playTeamAnimation(myTeam, 'light-screen-anim', 1000);
            const globalState = this.unitStates.get(unit) || {};
            globalState.lightScreen = 5;
            this.unitStates.set(unit, globalState);
            this.lightScreenActivated.add(side);
            await this.delay(200);
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
                this.growUnit(u, 3, 3, 'Triplets', null, true);
            });
        }
        if (this.getSynergyCountForUnit(team[0], 'Starter') >= 3) {
            team.filter((u: Unit) => u && u.synergies.includes('Starter')).forEach(u => {
                const original = this.originalPlayerTeam?.find(o => o && o.id === u.id);
                this.growUnit(u, 1, 1, 'Starter', original, true);
            });
        }

    }

    private growUnit(unit: Unit, hp: number, atk: number, sourceName?: string, permanentTarget?: Unit | null, silent: boolean = false) {
        if (unit.family === 'sneasel' && atk < 0) atk = 0; // Protection
        if (hp === 0 && atk === 0) return;
        unit.addGrowth(hp, atk);
        if (permanentTarget) permanentTarget.addGrowth(hp, atk);

        if (sourceName && !silent) {
            if (hp > 0 && atk > 0) this.log(`${unit.name} 提高了 ${atk} 攻擊與生命`);
            else if (hp > 0) this.log(`${unit.name} 提高了 ${hp} 生命！`);
            else if (atk > 0) this.log(`${unit.name} 提高了 ${atk} 攻擊！`);
        }

    }

    private buffAttack(unit: Unit, amount: number, silent: boolean = false) {
        if (unit.family === 'sneasel' && amount < 0) {
            if (!silent) this.log(`${unit.name} 發動了銳利目光！`);
            return; // Protection
        }
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
                    const heal = count >= 4 ? 5 : (count >= 3 ? 3 : (count >= 2 ? 1 : 0));
                    if (heal > 0 && unit.stats.hp > 0) {
                        this.heal(unit, heal);
                        this.log(`${unit.name} 吸取了 ${heal} 生命`);
                    }
                }
            });
        }

        // Water (Vortex): Reduce target attack before attack
        if (unit.synergies.includes('Water')) {
            this.eventBus.on('BEFORE_ATTACK', async (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                if (unit.stats.hp <= 0) return;
                if (e.source === unit && e.target && e.target.stats.hp > 0) {
                    if (e.target.family === 'sneasel') {
                        this.log(`${e.target.name} 發動了銳利目光！`);
                        return;
                    }
                    const count = this.getSynergyCountForUnit(unit, 'Water');
                    const debuff = count >= 4 ? 5 : (count >= 3 ? 3 : (count >= 2 ? 1 : 0));
                    if (debuff > 0 && e.target.stats.attack > 1) {
                        const amountReduced = Math.min(e.target.stats.attack - 1, debuff);
                        e.target.stats.attack -= amountReduced;
                        this.log(`${e.target.name} 降低了 ${amountReduced} 攻擊！`);
                    }
                }
            });
        }

        // Mudkip Family: Stats on Other Ally Attack
        if (unit.family === 'mudkip') {
            this.eventBus.on('BEFORE_ATTACK', async (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                if (unit.stats.hp <= 0) return;
                const { myTeam } = this.getTeams(unit);
                // Trigger when ANY OTHER ally attacks
                if (e.source && e.source !== unit && myTeam.includes(e.source)) {
                    const buffAmount = [0, 1, 3, 5][unit.level] || 1;
                    await this.delay(150); // Delay for visual pacing
                    await this.notifySkill(unit, `發動了健美！`);
                    await this.playAnimation(unit, 'jump', 200);
                    this.growUnit(unit, buffAmount, buffAmount, '水躍魚技能');
                }
            });
        }
        // Squirtle Family: Damage Reduction
        if (unit.family === 'squirtle') {
            this.eventBus.on('BEFORE_HURT', (e) => {
                if (e.target === unit && !this.unitStates.get(unit)?.isSilenced) {
                    const reduction = [0, 1, 2, 3][unit.level] || 1;
                    const oldAmt = e.context.amount;
                    if (oldAmt > 1) {
                        e.context.amount = Math.max(1, oldAmt - reduction);
                        if (e.context.amount < oldAmt) {
                            this.log(`${unit.name} 的縮殼減輕了傷害！`);
                        }
                    }
                }
            });
        }

        if (unit.family === 'charmander') {
            this.eventBus.on('BEFORE_ATTACK', async (e) => {
                if (e.source === unit && !this.unitStates.get(unit)?.isSilenced) {
                    const amt = [0, 1, 2, 4][unit.level] || 2;
                    this.growUnit(unit, amt, amt, '發動了蓄能焰襲');
                    await this.notifySkill(unit, '發動了蓄能焰襲！');
                    await this.playAnimation(unit, 'jump', 200);
                }
            });
        }

        // Torchic: Pursuit
        if (unit.family === 'torchic') {
            this.eventBus.on('BEFORE_ATTACK', async (e) => {
                if (unit.stats.hp <= 0 || this.unitStates.get(unit)?.isSilenced) return;
                const { myTeam } = this.getTeams(unit);
                if (e.source && e.source !== unit && myTeam.includes(e.source) && e.target) {
                    await this.delay(200); // Increased delay
                    this.log(`${unit.name} 發動了二連踢！`);
                    await this.playAnimation(unit, 'jump', 200);
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

        // Slowpoke Family: Regenerator (Percentage heal on first damage)
        if (unit.family === 'slowpoke') {
            this.eventBus.on('ON_HURT', (e) => {
                if (e.target === unit && !this.unitStates.get(unit)?.isSilenced) {
                    const state = this.unitStates.get(unit) || {};
                    if (!state.slowpokeHealUsed && unit.stats.hp > 0) {
                        const percent = unit.level >= 3 ? 1.0 : 0.33;
                        const amount = Math.floor(unit.stats.maxHp * percent);

                        if (amount > 0) {
                            this.heal(unit, amount);
                            this.log(`${unit.name} 發動了再生力！`);
                        }
                        state.slowpokeHealUsed = true;
                        this.unitStates.set(unit, state);
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
                    const amount = 3;
                    const { side } = this.getTeams(unit);
                    if (!this.isCompacting) {
                        await this.notifySkill(unit, `發動了鐵壁！`);
                        this.playTeamAnimation([unit], 'glow-pale-blue', 600);
                        this.growUnit(unit, amount, 0, '鐵壁', null, true);
                    } else {
                        // Throttled log during compaction
                        if (!this.onixLogged.has(side)) {
                            this.log(`[大岩蛇] 發動了鐵壁！`);
                            this.onixLogged.add(side);
                        }
                        this.growUnit(unit, amount, 0, '鐵壁', null, true);
                    }
                    const original = this.originalPlayerTeam?.find(u => u && u.id === unit.id);
                    if (original) original.addGrowth(amount, 0);
                }
            });

            // Steelix (Evolved Onix) Reflect logic
            this.eventBus.on('ON_HURT', async (e) => {
                if (e.target === unit && e.source && e.source.stats.hp > 0 && !this.unitStates.get(unit)?.isSilenced) {
                    const amount = e.context.amount;
                    if (amount > 0) {
                        const reflectDmg = Math.ceil(amount * 1.0);
                        this.log(`${unit.name} 反彈了 ${reflectDmg} 點傷害！`);
                        await this.dealDamage(unit, e.source, reflectDmg, false); // Use false to silence redundant amount log
                    }
                }
            });
        }

        if (unit.family === 'fuecoco') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                const { myTeam } = this.getTeams(unit);
                // Ensure unit is still alive and in the team array (not replaced by null)
                if (unit.stats.hp <= 0 || this.unitStates.get(unit)?.isSilenced || !myTeam.includes(unit)) return;
                if (e.context.killer && myTeam.includes(e.context.killer)) {
                    const atkBuff = [0, 0, 1, 2][unit.level] || 0;
                    const hpBuff = [0, 1, 1, 2][unit.level] || 1;
                    const now = Date.now();
                    const state = this.unitStates.get(unit) || {};
                    const lastGlow = state.lastGlobalGlowTime || 0;

                    if (now - lastGlow > 500 && !(e.context as any).fuecocoAnimTriggered) {
                        (e.context as any).fuecocoAnimTriggered = true;
                        // Mark all fuecocos on my team so they don't spam glow
                        myTeam.filter(u => u?.family === 'fuecoco').forEach(u => {
                            if (u) {
                                const us = this.unitStates.get(u) || {};
                                us.lastGlobalGlowTime = now;
                                this.unitStates.set(u, us);
                            }
                        });
                        this.notifySkill(unit, `發動了閃焰高歌！`); // Don't await so it doesn't block sync loops
                        this.playTeamAnimation(myTeam, 'glow-pale-red', 1000);
                    }

                    for (const ally of myTeam.filter(u => u && u.stats.hp > 0)) {
                        const original = this.originalPlayerTeam?.find(o => o && o.id === ally.id);
                        this.growUnit(ally, hpBuff, atkBuff, '呆火鱷技能強化', original, true);
                    }
                }
            });
        }

        // Quaxly: Friendly Kill -> All Perm HP
        if (unit.family === 'quaxly') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                const { myTeam } = this.getTeams(unit);
                // Ensure unit is still alive and in the team array
                if (unit.stats.hp <= 0 || this.unitStates.get(unit)?.isSilenced || !myTeam.includes(unit)) return;
                if (e.context.killer && myTeam.includes(e.context.killer)) {
                    const atkBuff = [0, 1, 1, 2][unit.level] || 1;
                    const hpBuff = [0, 0, 1, 2][unit.level] || 0;
                    const now = Date.now();
                    const state = this.unitStates.get(unit) || {};
                    const lastGlow = state.lastGlobalGlowTime || 0;

                    if (now - lastGlow > 500 && !(e.context as any).quaxlyAnimTriggered) {
                        (e.context as any).quaxlyAnimTriggered = true;
                        myTeam.filter(u => u?.family === 'quaxly').forEach(u => {
                            if (u) {
                                const us = this.unitStates.get(u) || {};
                                us.lastGlobalGlowTime = now;
                                this.unitStates.set(u, us);
                            }
                        });
                        this.notifySkill(unit, `發動了流水旋舞！`);
                        this.playTeamAnimation(myTeam, 'glow-pale-blue', 1000);
                    }
                    for (const ally of myTeam.filter(u => u && u.stats.hp > 0)) {
                        const original = this.originalPlayerTeam?.find(o => o && o.id === ally.id);
                        this.growUnit(ally, hpBuff, atkBuff, '潤水鴨技能強化', original, true);
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
                        await this.delay(100); // reduced from 200
                        for (let i = 0; i < 2; i++) {
                            const { myTeam: currentTeam } = this.getTeams(unit);
                            const targetIdx = (e.context.deathIdx !== undefined) ? e.context.deathIdx + i : deathIdx + i;
                            await this.spawnUnit(currentTeam, targetIdx, 'ivysaur', 1, 4, 4, true);
                        }
                    } else if (unit.templateId === 'ivysaur') {
                        // Ivysaur -> 1x Bulbasaur (2/2)
                        await this.notifySkill(unit, '召喚了 妙蛙種子');
                        await this.delay(100); // reduced from 200
                        const { myTeam: currentTeam } = this.getTeams(unit);
                        const targetIdx = (e.context.deathIdx !== undefined) ? e.context.deathIdx : deathIdx;
                        await this.spawnUnit(currentTeam, targetIdx, 'bulbasaur', 1, 2, 2, true);
                    } else {
                        // Bulbasaur (1/2/3 star) -> Original Sprout Logic
                        const count = [0, 1, 2, 5][unit.level] || 1;
                        // Description says "1/1 Sprouts" regardless of Bulbasaur level
                        const seedStats = 1;
                        await this.notifySkill(unit, `召喚了 ${count} 隻小種子`);
                        await this.delay(100); // reduced from 200
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
                    await this.delay(100); // reduced from 200
                    const count = unit.level >= 3 ? 5 : 2;
                    // Fix: Match description. Lv1: 1/1, Lv2: 2/2, Lv3: 3/3
                    const stats = [0, 1, 2, 3][unit.level] || 1;
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
                        if (unit.level >= 3) {
                            await this.notifySkill(unit, `發動了潛靈奇襲！\n造成了連續 5 次傷害`);
                            await this.delay(200);

                            for (let i = 0; i < 5; i++) {
                                const currentLiving = opTeam.filter(u => u && u.stats.hp > 0);
                                if (currentLiving.length === 0) break;
                                const target = currentLiving[Math.floor(Math.random() * currentLiving.length)];
                                await this.dealDamage(unit, target, 10, true, true);
                                await this.delay(65);
                            }
                        } else {
                            const target = living[Math.floor(Math.random() * living.length)];
                            await this.notifySkill(unit, `對目標使用了影子偷襲！`);
                            await this.delay(200);
                            const dmg = [0, 4, 10, 99][unit.level] || 4;
                            await this.dealDamage(unit, target, dmg, true);
                        }
                    }
                }
            });
        }

        // Drifloon/Drifblim: Death -> AOE dmg
        if (unit.family === 'drifloon') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                if (e.source === unit) {
                    const { myTeam, opTeam } = this.getTeams(unit);

                    const dmg = [0, 2, 5, 15][unit.level] || 2;
                    await this.notifySkill(unit, `發動了自爆\n對全體造成了 ${dmg} 點傷害`);
                    // Affect EVERYONE else (myTeam and opTeam)
                    const allTargets = [...myTeam, ...opTeam].filter(u => u && u !== unit && u.stats.hp > 0);
                    for (const target of allTargets) {
                        await this.dealDamage(unit, target!, dmg, true, true); // silent=true
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
                    const buff = [0, 1, 4, 8][unit.level] || 1;
                    await this.delay(150);
                    await this.notifySkill(unit, `對 ${e.source.name} 發動了甜甜香氣！`);
                    await this.playAnimation(unit, 'jump', 200);
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
                    const dmg = [0, 2, 5, 10][unit.level] || 2;
                    const living = opTeam.filter(u => u && u.stats.hp > 0);
                    if (living.length > 0) {
                        const target = living[0];
                        await this.delay(150);
                        await this.notifySkill(unit, `對 ${target.name} 使用了種子機關槍！`);
                        await this.playAnimation(unit, 'jump', 200);
                        await this.delay(100); // reduced from 250
                        await this.dealDamage(unit, target, dmg, true);
                    }
                }
            });
        }

        // Ralts Family: Logic moved to performAttack to prevent double attack bug (and nerf damage)

        // Sprigatito Family: Gain stats on Summon for All
        if (unit.family === 'sprigatito') {
            this.eventBus.on('ON_FRIEND_SUMMONED', async (e) => {
                const { myTeam } = this.getTeams(unit);
                // Ensure unit is still alive and in the team array (not replaced by null)
                if (unit.stats.hp <= 0 || this.unitStates.get(unit)?.isSilenced || !myTeam.includes(unit)) return;
                if (e.source && myTeam.includes(e.source) && e.source !== unit) {
                    const now = Date.now();
                    const state = this.unitStates.get(unit) || {};
                    const lastGlow = state.lastGlobalGlowTime || 0;

                    if (now - lastGlow > 500 && !(e.context as any).sprigatitoAnimTriggered) {
                        (e.context as any).sprigatitoAnimTriggered = true;
                        myTeam.filter(u => u?.family === 'sprigatito').forEach(u => {
                            if (u) {
                                const us = this.unitStates.get(u) || {};
                                us.lastGlobalGlowTime = now;
                                this.unitStates.set(u, us);
                            }
                        });
                        this.notifySkill(unit, `發動了千變萬花！`);
                        this.playTeamAnimation(myTeam, 'glow-pale-green', 1000);
                    }
                    for (const ally of myTeam.filter(u => u && u.stats.hp > 0)) {
                        const original = this.originalPlayerTeam?.find(o => o && o.id === ally.id);
                        if (unit.level === 1) {
                            const isAtk = Math.random() < 0.5;
                            this.growUnit(ally, isAtk ? 0 : 1, isAtk ? 1 : 0, '新葉喵技能強化', original, true);
                        } else if (unit.level === 2) {
                            this.growUnit(ally, 1, 1, '新葉喵技能強化', original, true);
                        } else {
                            this.growUnit(ally, 2, 2, '新葉喵技能強化', original, true);
                        }
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
            if (Math.random() < 0.5) {
                const side = this.initialPlayerSet.has(attacker) ? 'enemy' : 'player';
                const opTeam = side === 'enemy' ? this.enemyTeam : this.playerTeam;
                const liveEnemies = opTeam.filter(u => u && u.stats.hp > 0);
                if (liveEnemies.length > 0) {
                    const targetCount = 1;
                    let potentialTargets = liveEnemies.filter(u => u !== defender);
                    if (potentialTargets.length === 0) potentialTargets = [defender];

                    // Shuffle and pick 1
                    const finalTargets = [...potentialTargets].sort(() => 0.5 - Math.random()).slice(0, targetCount);
                    for (const r of finalTargets) {
                        this.log(`${attacker.name} 對 ${r.name} 發動了暗襲要害！`);
                        attackPromises.push(this.dealDamage(attacker, r, dmg));
                    }
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

        if (attacker.family === 'ralts' && !this.unitStates.get(attacker)?.isSilenced) {
            const side = this.initialPlayerSet.has(attacker) ? 'enemy' : 'player';
            const opTeam = side === 'enemy' ? this.enemyTeam : this.playerTeam;
            const liveEnemies = opTeam.filter(u => u && u.stats.hp > 0);
            if (liveEnemies.length > 0) {
                const target = liveEnemies[liveEnemies.length - 1];
                const multiplier = attacker.level >= 3 ? 1.0 : 0.5;
                const bonusDmg = Math.ceil(attacker.stats.attack * multiplier);
                this.log(`${attacker.name} 對 ${target.name} 發動了精神強念！`);
                attackPromises.push(this.dealDamage(attacker, target, bonusDmg, true));
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

        // Psychic Synergy: "Future Sight"
        const attackerIsEnemy = this.enemyTeam.includes(attacker);
        if (attackerIsEnemy) {
            this.enemyAttackCount++;
            const psychicCount = this.playerSynergies.get('Psychic') || 0;
            if (this.enemyAttackCount >= 2 && psychicCount >= 2 && !this.psychicTriggered.has('player')) {
                this.psychicTriggered.add('player');
                this.enemyAttackCount = 0;
                this.log("敵方受到了預知未來的攻擊！");
                const allEnemies = this.enemyTeam.filter(u => u && u.stats.hp > 0);
                const dmg = 2 * this.playerWins;
                for (const target of allEnemies) {
                    await this.dealDamage(null, target, dmg, true, true); // silent damage for clutter control
                }
                if (this.onUpdate) this.onUpdate();
                await this.delay(300);
            }
        } else {
            this.playerAttackCount++;
            const psychicCount = this.enemySynergies.get('Psychic') || 0;
            if (this.playerAttackCount >= 2 && psychicCount >= 2 && !this.psychicTriggered.has('enemy')) {
                this.psychicTriggered.add('enemy');
                this.playerAttackCount = 0;
                this.log("我方受到了預知未來的攻擊！");
                const allAllies = this.playerTeam.filter(u => u && u.stats.hp > 0);
                const dmg = 2; // Default 2 for enemy psychic? Or based on turn? Let's use 2 as a base.
                for (const target of allAllies) {
                    await this.dealDamage(null, target, dmg, true, true);
                }
                if (this.onUpdate) this.onUpdate();
                await this.delay(300);
            }
        }
    }

    private async dealDamage(source: Unit | null, target: Unit, amount: number, isSkillDamage: boolean = false, silent: boolean = false) {
        if (target.stats.hp <= 0) return;

        const { myTeam, side } = this.getTeams(target);
        const targetState = this.unitStates.get(target) || {};
        const sourceState = source ? this.unitStates.get(source) || {} : {};
        const isBypassing = (source && source.family === 'pinsir' && !sourceState.isSilenced) ||
            (source && source.family === 'sableye' && sourceState.isAbsoluteKill);

        // --- NEW: Light Screen Logic (Halve ALL enemy damage, consumes 1 charge per instance) ---
        // source === null means it's an environment effect or synergy effect, which we treat as enemy for the defender
        const isEnemySource = source ? this.getTeams(source).side !== side : true;

        if (isEnemySource && !isBypassing) {
            const aliveMimes = myTeam.filter(u => u && u.family === 'mrmime' && u.stats.hp > 0);
            for (const mime of aliveMimes) {
                const mState = this.unitStates.get(mime);
                if (mState && mState.lightScreen > 0) {
                    amount = Math.ceil(amount / 2);
                    mState.lightScreen--;
                    this.playTeamAnimation([target], 'light-screen-anim', 400);
                    if (mState.lightScreen === 0) {
                        this.log(side === 'player' ? "我方的光牆消失了" : "敵方的光牆消失了");
                    }
                    break; // Only one light screen charge consumed per damage instance
                }
            }
        }

        // Optimization: Removed overly aggressive source.hp check that broke clash symmetry.
        // Secondary hits (like Kangaskhan) are handled specifically in performAttack.

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
            if (target.family === 'squirtle' && amount > 0) {
                amount = Math.max(1, amount - target.level);
                this.log(`${target.name} 發動了縮殼！`);
            }
        } else if (source) {
            if (source.family === 'pinsir') {
                this.log(`${source.name} 發動了破格！`);
            }
        }

        target.stats.hp -= amount;
        if (isSkillDamage && !silent) {
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
        if (killer && killer.stats.hp > 0) {
            const executeReward = async () => {
                // Critical: Re-check survival if reward was deferred
                if (killer.stats.hp <= 0) return;

                // Claw Synergy: Atk on kill (Permanent)
                // Removed silence check for synergy-based rewards
                if (killer.synergies.includes('Claw') && this.getSynergyCountForUnit(killer, 'Claw') >= 2) {
                    const original = this.originalPlayerTeam?.find(u => u && u.id === killer.id);
                    this.log(`${killer.name} 發動了磨爪！`);
                    this.growUnit(killer, 0, 3, '磨爪', original, true);
                }

                // Check Silence for individual unit abilities
                if (this.unitStates.get(killer)?.isSilenced) return;

                // Cyndaquil family: Stats on kill (Temporary)
                if (killer.family === 'cyndaquil') {
                    const buff = [0, 2, 4, 8][killer.level] || 2;
                    const canAddAtk = killer.stats.attack < 50;
                    const canAddHp = killer.stats.maxHp < 50;

                    let choice: 'hp' | 'atk';
                    if (canAddAtk && !canAddHp) choice = 'atk';
                    else if (canAddHp && !canAddAtk) choice = 'hp';
                    else choice = Math.random() < 0.5 ? 'atk' : 'hp';

                    this.log(`${killer.name} 發動了火焰輪！`);
                    if (choice === 'atk') this.growUnit(killer, 0, buff, '火焰輪', null, false);
                    else this.growUnit(killer, buff, 0, '火焰輪', null, false);
                }
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
            this.log(`戰場已滿，無法再召喚！`);
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

        // 2. Pre-Clash Synergy (Water/Vortex occurs BEFORE impact animation)
        const triggerWater = async (attacker: Unit, defender: Unit) => {
            if (attacker.synergies.includes('Water')) {
                const count = this.getSynergyCountForUnit(attacker, 'Water');
                const debuff = count >= 4 ? 5 : (count >= 3 ? 3 : (count >= 2 ? 1 : 0));
                if (debuff > 0 && defender.stats.attack > 1 && !this.unitStates.get(attacker)?.isSilenced) {
                    const amountReduced = Math.min(defender.stats.attack - 1, debuff);
                    defender.stats.attack -= amountReduced;
                    this.log(`${defender.name} 降低了 ${amountReduced} 攻擊！`);
                }
            }
        };

        await Promise.all([
            triggerWater(pFront, eFront),
            triggerWater(eFront, pFront)
        ]);

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

        // 8. Victory Check with human-readable buffer
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
        return new Promise(resolve => setTimeout(resolve, ms / this.speed));
    }
}
