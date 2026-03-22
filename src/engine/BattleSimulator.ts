
import { Unit } from '../models/Unit';
import { EventBus } from './EventBus';
import { ALL_UNITS } from '../data/AllUnits';

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
    private originalPlayerTeam?: (Unit | null)[];
    private houndoomLogged: Set<string> = new Set();
    private natuLogged: Set<string> = new Set();
    private isSimulatingStep = false;
    private queuedKillRewards: (() => Promise<void>)[] = [];
    // Cached Synergies (Persist through death)
    private playerSynergies = new Map<string, number>();
    private enemySynergies = new Map<string, number>();
    private participantPlayerUnits = new Set<Unit>();
    private participantEnemyUnits = new Set<Unit>();
    private psychicN: number = 2;
    private enemyPsychicN: number = 2;

    private speed: number = 1;
    public isSim: boolean = false;
    public battleBuffs: any[] = [];
    private waterDebuffedTargets = new Set<Unit>();
    private grassHealedTargets = new Set<Unit>();

    constructor(playerTeam: (Unit | null)[], enemyTeam: (Unit | null)[], originalPlayerTeam?: (Unit | null)[], difficultyMultiplier: number = 1.0, speed: number = 1, psychicN: number = 2, enemyPsychicN: number = 2, isSim: boolean = false, battleBuffs: any[] = []) {
        this.speed = speed;
        this.isSim = isSim;
        this.battleBuffs = battleBuffs;

        this.originalPlayerTeam = originalPlayerTeam;
        this.psychicN = psychicN;
        this.enemyPsychicN = enemyPsychicN;
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

        // Apply Battle Rewards (Must be done after teams are initialized)
        this.applyBattleRewards();

        // Register Initial Teams for Synergy Persistence
        this.playerTeam.forEach(u => { if (u) { this.initialPlayerSet.add(u); this.participantPlayerUnits.add(u); } });
        this.enemyTeam.forEach(u => { if (u) { this.participantEnemyUnits.add(u); } });
        // Calculate Initial Synergies
        this.calculateCachedSynergies(Array.from(this.participantPlayerUnits), this.playerSynergies);
        this.calculateCachedSynergies(Array.from(this.participantEnemyUnits), this.enemySynergies);

        // 1. Register Passive Abilities & Hooks
        this.playerTeam.forEach(u => { if (u) this.registerUnitAbilities(u); });
        this.enemyTeam.forEach(u => { if (u) this.registerUnitAbilities(u); });
    }

    private applyBattleRewards() {
        if (!this.battleBuffs || this.battleBuffs.length === 0) return;

        this.battleBuffs.forEach(reward => {
            const atkMatch = reward.effect.match(/\+(\d+)\s*(?:攻擊力?|攻)/);
            const hpMatch = reward.effect.match(/\+(\d+)\s*(?:生命值?|HP)/);
            const atk = atkMatch ? parseInt(atkMatch[1]) : 0;
            const hp = hpMatch ? parseInt(hpMatch[1]) : 0;

            let targets: Unit[] = [];
            const playerUnits = this.playerTeam.filter(u => u !== null) as Unit[];

            if (reward.effect.includes('隨機角色')) {
                const shuffled = [...playerUnits].sort(() => 0.5 - Math.random());
                if (shuffled.length > 0) targets = [shuffled[0]];
            } else if (reward.effect.includes('首位角色')) {
                const first = playerUnits[0];
                if (first) targets = [first];
            } else if (reward.effect.includes('全體角色')) {
                targets = playerUnits;
            } else if (reward.effect.includes('雙方')) {
                const synergyId = reward.synergyId;
                targets = [...playerUnits, ...(this.enemyTeam.filter(u => u !== null) as Unit[])]
                    .filter(u => u.synergies.includes(synergyId));
            } else if (reward.synergyId) {
                targets = playerUnits.filter(u => u.synergies.includes(reward.synergyId));
            }

            targets.forEach(u => {
                if (atk > 0) u.addBuff(atk);
                if (hp > 0) {
                    u.addGrowth(hp, 0);
                }
            });
        });
    }

    public async init() {
        this.spiritombTriggered.clear();
        this.lightScreenActivated.clear();
        this.houndoomLogged.clear();
        this.natuLogged.clear();
        this.waterDebuffedTargets.clear();

        await this.compactTeams();

        // Collect all units and their positions
        const allUnits: { unit: Unit, pos: number, isPlayer: boolean }[] = [];
        this.playerTeam.forEach((u, i) => { if (u) allUnits.push({ unit: u, pos: i, isPlayer: true }); });
        this.enemyTeam.forEach((u, i) => { if (u) allUnits.push({ unit: u, pos: i, isPlayer: false }); });

        // Helper for Category Rank based on User Request Phases
        const getRank = (unit: Unit) => {
            if (unit.synergies.includes('Trick')) return 5; // Trick swaps HP before Snow
            if (unit.family === 'spiritomb') return 5; // Phase 1: Silence
            if (unit.family === 'mrmime') return 4;    // Phase 2 Part 2: Light Screen
            if (unit.family === 'natu') return 3;      // Phase 2 Part 3: Swap
            if (unit.family === 'houndour') return 0;  // Phase 4: First Strike (Now last priority)

            const utility = ['ditto', 'gastly', 'igglybuff', 'mudkip', 'gulpin', 'totodile'];
            const hasStartupSynergy = unit.synergies.includes('Thief');
            if (utility.includes(unit.family) || hasStartupSynergy) return 2; // Phase 3: Utility/Synergy

            return 1; // Standard buffs (Gastly, Igglybuff, Totodile family) now Rank 1
        };

        // Sort by Priority: Rank (Desc) > Position (Asc) > Attack (Desc) > HP (Desc) > Random
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

        const executePhaseQueue = async (rank: number) => {
            const phaseUnits = allUnits.filter(item => getRank(item.unit) === rank);
            for (const item of phaseUnits) {
                await this.executeUnitStartOfBattleAbility(item.unit);
                if (this.onUpdate) this.onUpdate();
            }
        };

        // --- PHASE 1: Spiritomb ---
        await executePhaseQueue(5);

        // --- PHASE 2: Environment & Weather (Snow, then Light Screen) ---
        const hasSnow = (this.playerSynergies.get('Snow') || 0) >= 2 || (this.enemySynergies.get('Snow') || 0) >= 2;
        if (hasSnow) {
            this.log("四周開始降下冰雹，冰雹襲擊了雙方隊伍！");
            await this.delay(500);
            const alive = [...this.playerTeam, ...this.enemyTeam].filter((u: Unit) => u !== null && u.stats.hp > 0);
            for (const target of alive) {
                if (target.synergies.includes('Snow')) continue;
                let dmg = Math.ceil(target.stats.maxHp * 0.33);
                if (dmg >= target.stats.hp) dmg = Math.max(0, target.stats.hp - 1);
                if (dmg > 0) {
                    await this.dealDamage(null, target, dmg, true, true);
                }
                if (this.onUpdate) this.onUpdate();
                await this.delay(100);
            }
            await this.delay(400);
        }

        // Phase 2 Part 2: Mr. Mime (Light Screen)
        await executePhaseQueue(4);

        // Phase 2 Part 3: Natu
        await executePhaseQueue(3);

        // --- PHASE 3: Character & Synergy Function/Enhancement ---
        await executePhaseQueue(2);

        // --- PHASE 4: Houndour (First Strike) ---
        await executePhaseQueue(1);

        // --- OTHERS: (Totodile, etc.) ---
        await executePhaseQueue(0);

        await this.applyBattleStartSynergies(this.playerTeam.filter(u => u !== null));
        await this.applyBattleStartSynergies(this.enemyTeam.filter(u => u !== null));

        // Psychic Synergy Start Message
        const hasPsychic = (this.playerSynergies.get('Psychic') || 0) >= 2 || (this.enemySynergies.get('Psychic') || 0) >= 2;
        if (hasPsychic) {
            this.log("預知了未來的攻擊…");
        }

        // Initial compaction to ensure everyone is at the front
        await this.compactTeams();

        await this.eventBus.emit({ type: 'BATTLE_START', context: { simulator: this } });
    }

    private cloneUnit(unit: Unit): Unit {
        const clone = new Unit(ALL_UNITS[unit.templateId]);
        clone.stats = { ...unit.stats };
        clone.level = unit.level;
        clone.exp = unit.exp;
        clone.id = unit.id;
        clone.synergies = [...unit.synergies];
        clone.imageUrl = unit.imageUrl;
        clone.battleImageUrl = unit.battleImageUrl;
        clone.family = unit.family;
        clone.scalingValue = unit.scalingValue;

        this.unitStates.set(clone, {});
        return clone;
    }


    private async executeUnitStartOfBattleAbility(unit: Unit) {
        if (unit.stats.hp <= 0) return;

        const { myTeam, opTeam, side } = this.getTeams(unit);

        const s = this.unitStates.get(unit);
        if (s?.isSilenced) {
            this.log(`${unit.name} 陷入封印狀態，無法發動招式！`);
            return;
        }

        // Totodile Family: Buff front ally (Rework)
        if (unit.family === 'totodile') {
            const idx = myTeam.indexOf(unit);
            if (idx > 0) {
                const front = myTeam[idx - 1];
                if (front && front.stats.hp > 0) {
                    const ratio = [0, 0.33, 0.5, 1.0][unit.level] || 0.33;
                    const buffAtk = Math.ceil(unit.stats.attack * ratio);
                    await this.notifySkill(unit, `發動了強壯之顎！`);
                    this.buffAttack(front, buffAtk);
                    this.playTeamAnimation([front], 'level-up-anim', 600);
                    this.log(`${unit.name} 發動了強壯之顎，提升了 ${front.name} 的攻擊力！`);
                }
            }
        }


        // Delibird: Gift (Battle Start)
        if (unit.family === 'delibird') {
            const times = [0, 1, 2, 3][unit.level] || 1;
            for (let i = 0; i < times; i++) {
                const enemies = opTeam.filter(u => u && u.stats.hp > 0);
                const allies = myTeam.filter(u => u && u.stats.hp > 0);

                let enemyTarget: Unit | null = null;
                let allyTarget: Unit | null = null;

                if (enemies.length > 0) {
                    enemyTarget = enemies[Math.floor(Math.random() * enemies.length)];
                }
                if (allies.length > 0) {
                    allyTarget = allies[Math.floor(Math.random() * allies.length)];
                }

                if (allyTarget && enemyTarget) {
                    this.log(`${unit.name} 對 ${allyTarget.name} 和 ${enemyTarget.name} 使用了禮物`);
                } else if (allyTarget) {
                    this.log(`${unit.name} 給 ${allyTarget.name} 送了個禮物！`);
                } else if (enemyTarget) {
                    this.log(`${unit.name} 給 ${enemyTarget.name} 送了個禮物！`);
                }

                if (enemyTarget) {
                    this.playAnimation(enemyTarget, 'gift-flash-anim', 600);
                    await this.dealDamage(unit, enemyTarget, unit.abilityPower || 5, true);
                }
                if (allyTarget) {
                    this.playAnimation(allyTarget, 'gift-flash-anim', 600);
                    this.heal(allyTarget, unit.abilityPower || 5);
                }
            }
        }

        // Shuckle: Contrary (Start)
        if (unit.family === 'shuckle') {
            const buffAtk = Math.floor(unit.stats.hp * 0.33);
            if (buffAtk > 0) {
                unit.stats.attack += buffAtk;
                this.log(`${unit.name}發動了唱反調。`);
                this.playAnimation(unit, 'jump', 200);
            }
        }

        // Kangaskhan: Parental Bond (Start)
        if (unit.family === 'kangaskhan') {
            const hpBuff = Math.floor(unit.stats.attack * 0.33);
            if (hpBuff > 0) {
                const original = this.playerTeam.includes(unit) ? this.originalPlayerTeam?.find((o: Unit | null) => o && o.id === unit.id) : null;
                this.growUnit(unit, hpBuff, 0, '親子愛', original, true);
                this.log(`${unit.name}發動了親子愛！`);
                this.playAnimation(unit, 'glow-white', 600);
            }
        }

        // Gastly Family: Atk buff at start (Swapped from Mankey)
        if (unit.family === 'gastly') {
            if (unit.templateId === 'gengar') { // Stage 3
                await this.notifySkill(unit, `耿鬼使用了詭計！`);
                for (const u of myTeam.filter(u => u && u.stats.hp > 0)) {
                    const original = this.originalPlayerTeam?.find(o => o && o.id === u!.id);
                    this.growUnit(u!, 0, 3, '耿鬼技能', original, true);
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
                await this.notifySkill(unit, `胖可丁使用了治癒波動！`);
                for (const u of myTeam.filter(u => u && u.stats.hp > 0)) {
                    const original = this.originalPlayerTeam?.find(o => o && o.id === u!.id);
                    this.growUnit(u!, 3, 0, '胖可丁技能', original, true);
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
                        this.log(`${unit.name} 為 ${front.name} 增加了生命！`);
                    }
                }
            }
        }

        // Caterpie Family: Permanent Atk buff at start
        if (unit.family === 'caterpie') {
            const isStage3 = (unit.level >= 3);
            if (isStage3) {
                await this.notifySkill(unit, `巴大蝶使用了蝶舞！`);
                for (const u of myTeam.filter(u => u && u.stats.hp > 0)) {
                    const original = this.originalPlayerTeam?.find(o => o && o.id === u.id);
                    this.growUnit(u, 0, 3, '能力提升', original, true);
                    await this.delay(65);
                }
            } else {
                const idx = myTeam.indexOf(unit);
                if (idx < myTeam.length - 1) { // back ally
                    const back = myTeam[idx + 1];
                    if (back) {
                        const amount = unit.level === 2 ? 3 : 1;
                        await this.notifySkill(unit, `吐絲纏繞了！`);

                        const original = this.originalPlayerTeam?.find(o => o && o.id === back.id);
                        this.growUnit(back, 0, amount, '能力提升', original, true);
                        this.log(`${unit.name} 為 ${back.name} 增加了攻擊！`);
                    }
                }
            }
        }

        // Pichu Family: Damage to weakest enemy at start
        if (unit.family === 'pichu') {
            const livingEnemies = opTeam.filter(e => e && e.stats.hp > 0);
            if (livingEnemies.length > 0) {
                // Sort by current HP ascending to find the weakest
                const weakest = [...livingEnemies].sort((a, b) => a!.stats.hp - b!.stats.hp)[0];
                if (weakest) {
                    await this.notifySkill(unit, `使用了電光一閃！`);
                    // Use scalingValue (default to 3 if somehow undefined)
                    const dmg = unit.scalingValue || 3;
                    await this.dealDamage(unit, weakest, dmg, true);
                    this.log(`${unit.name} 對 ${weakest.name} 使用了電光一閃。`);
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
                    if (e.stats.hp > firstTarget.stats.hp) firstTarget = e;
                }

                if (!this.houndoomLogged.has(side)) {
                    this.log(`${unit.name} 對 ${firstTarget.name} 使用了噴射火焰！`);
                    this.houndoomLogged.add(side);
                }

                for (let i = 0; i < times; i++) {
                    const freshEnemies = currentOpTeam.filter(e => e && e.stats.hp > 0);
                    if (freshEnemies.length === 0) break;

                    let bestTarget = freshEnemies[0];
                    for (const e of freshEnemies) {
                        if (e.stats.hp > bestTarget.stats.hp) bestTarget = e;
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
                unit.level = target.level; // Skill intensity follows target's star level

                // Directly copy the target's exact template (ignoring star level difference)
                const currentTemplate = ALL_UNITS[target.templateId];

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
                const startAbilities = ['gastly', 'igglybuff', 'houndour', 'spiritomb', 'mudkip', 'gulpin', 'pichu'];
                if (startAbilities.includes(unit.family)) {
                    await this.executeUnitStartOfBattleAbility(unit);
                }
            }
        }

        // Mudkip Family: Logic moved to registerUnitAbilities

        // Gulpin & Swalot: Swallow Front Ally (Removed)

        // Natu/Xatu: Swap enemy first and last
        if (unit.family === 'natu' && !this.natuLogged.has(side)) {
            this.natuLogged.add(side);
            const livingEnemies = opTeam.filter(e => e && e.stats.hp > 0);
            if (livingEnemies.length >= 2) {
                // Determine how many times to teleport based on total Natu/Xatu in team
                const timesToExecute = 1;

                if (timesToExecute > 0) {
                    await this.notifySkill(unit, `使用了瞬間移動！`);
                }

                for (let t = 0; t < timesToExecute; t++) {
                    // Re-fetch living enemies each time in case state changed (though unlikely at start)
                    const currentLiving = opTeam.filter(e => e && e.stats.hp > 0);
                    if (currentLiving.length < 2) break;

                    const first = currentLiving[0];
                    const last = currentLiving[currentLiving.length - 1];
                    const firstIdx = opTeam.indexOf(first);
                    const lastIdx = opTeam.indexOf(last);

                    if (firstIdx !== -1 && lastIdx !== -1 && firstIdx !== lastIdx) {
                        await Promise.all([
                            this.playAnimation(first, 'teleport', 400),
                            this.playAnimation(last, 'teleport', 400)
                        ]);

                        opTeam[firstIdx] = last;
                        opTeam[lastIdx] = first;

                        if (t === 0) {
                            this.log(`${first.name} 和 ${last.name} 互換了位置！`);
                        } else {
                            this.log(`${first.name} 和 ${last.name} 又換回了位置！`);
                        }

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

        // --- New Synergies ---

        // Thief Synergy: Steal Attack
        if (unit.synergies.includes('Thief')) {
            const count = this.getSynergyCountForUnit(unit, 'Thief');
            if (count >= 2) {
                const buff = count >= 4 ? 5 : (count >= 3 ? 3 : 2);
                const candidates = opTeam.filter(e => e && e.stats.hp > 0);
                if (candidates.length > 0) {
                    // Find strongest: sum of HP and Attack
                    let strongest = candidates[0];
                    let maxPower = strongest.stats.hp + strongest.stats.attack;
                    for (const e of candidates) {
                        const power = e.stats.hp + e.stats.attack;
                        if (power > maxPower) {
                            strongest = e;
                            maxPower = power;
                        }
                    }

                    this.log(`${unit.name} 對 ${strongest.name} 發動了小偷`);
                    await this.notifySkill(unit, `發動了小偷！`);

                    const stealAmt = Math.min(strongest.stats.attack - 1, buff);
                    if (stealAmt > 0) {
                        strongest.stats.attack -= stealAmt;
                        const original = this.originalPlayerTeam?.find(o => o && o.id === unit.id);
                        // Permanent increase for player's unit
                        this.growUnit(unit, 0, stealAmt, '小偷', original, true);
                    }
                    this.playAnimation(unit, 'jump', 200);
                }
            }
        }

        // Trick Synergy: Swap HP (Temporary)
        if (unit.synergies.includes('Trick')) {
            const count = this.getSynergyCountForUnit(unit, 'Trick');
            if (count >= 2) {
                const candidates = opTeam.filter(e => e && e.stats.hp > 0);
                if (candidates.length > 0) {
                    const target = candidates[Math.floor(Math.random() * candidates.length)];
                    this.log(`${unit.name} 對 ${target.name} 發動了戲法空間`);
                    await this.notifySkill(unit, `發動了戲法空間！`);

                    const myHp = unit.stats.hp;
                    const myMaxHp = unit.stats.maxHp;
                    const opHp = target.stats.hp;
                    const opMaxHp = target.stats.maxHp;

                    // Swap without growUnit (no permanent target provided, so it's temporary for clones only)
                    unit.stats.hp = opHp;
                    unit.stats.maxHp = opMaxHp;
                    target.stats.hp = myHp;
                    target.stats.maxHp = myMaxHp;

                    // Mark as swapped for UI
                    const myState = this.unitStates.get(unit) || {};
                    myState.hpSwapped = true;
                    this.unitStates.set(unit, myState);

                    const opState = this.unitStates.get(target) || {};
                    opState.hpSwapped = true;
                    this.unitStates.set(target, opState);

                    unit.capStats();
                    target.capStats();

                    await Promise.all([
                        this.playAnimation(unit, 'teleport', 400),
                        this.playAnimation(target, 'teleport', 400)
                    ]);
                    await this.delay(400);
                    if (this.onUpdate) this.onUpdate();
                }
            }
        }


        // --- Legendary Beasts ---

        // Raikou: All allies +5 HP, all enemies 4-10 damage
        if (unit.family === 'raikou') {
            await this.notifySkill(unit, `使用了打雷！`);
            this.log(`雷公使用了打雷，向敵方劈下暴雷`);

            // All allies +5 HP
            for (const ally of myTeam.filter(u => u && u.stats.hp > 0)) {
                this.growUnit(ally, 5, 0, '雷公技能', null, true);
            }

            // All enemies 4-10 damage
            const enemies = opTeam.filter(u => u && u.stats.hp > 0);
            for (const enemy of enemies) {
                const dmg = 4 + Math.floor(Math.random() * 7); // 4 to 10
                await this.dealDamage(unit, enemy, dmg, true, true);
            }
            if (this.onUpdate) this.onUpdate();
        }

        // Entei: All allies +5 HP, strongest enemy 30 damage
        if (unit.family === 'entei') {
            await this.notifySkill(unit, `使用了大字爆炎！`);

            // All allies +5 HP
            for (const ally of myTeam.filter(u => u && u.stats.hp > 0)) {
                this.growUnit(ally, 5, 0, '炎帝技能', null, true);
            }

            // Strongest enemy 30 damage
            const enemies = opTeam.filter(u => u && u.stats.hp > 0);
            if (enemies.length > 0) {
                let strongest = enemies[0];
                let maxPower = strongest.stats.hp + strongest.stats.attack;
                for (const e of enemies) {
                    const power = e.stats.hp + e.stats.attack;
                    if (power > maxPower) {
                        strongest = e;
                        maxPower = power;
                    }
                }
                this.log(`炎帝使用了大字爆炎，燒盡了 ${strongest.name}`);
                await this.dealDamage(unit, strongest, 30, true);
            }
            if (this.onUpdate) this.onUpdate();
        }

        // Suicune: All allies +5 ATK, weakest enemy 30 damage
        if (unit.family === 'suicune') {
            await this.notifySkill(unit, `使用了水砲！`);

            // All allies +5 ATK
            for (const ally of myTeam.filter(u => u && u.stats.hp > 0)) {
                this.buffAttack(ally, 5, true);
            }

            // Weakest enemy 30 damage
            const enemies = opTeam.filter(u => u && u.stats.hp > 0);
            if (enemies.length > 0) {
                const weakest = [...enemies].sort((a, b) => a.stats.hp - b.stats.hp)[0];
                this.log(`水君使用了水砲，向 ${weakest.name} 猛烈地噴射`);
                await this.dealDamage(unit, weakest, 30, true);
            }
            if (this.onUpdate) this.onUpdate();
        }
    }

    private getSynergyCountForUnit(unit: Unit, synergyId: string): number {
        const isPlayer = this.initialPlayerSet.has(unit);
        const map = isPlayer ? this.playerSynergies : this.enemySynergies;
        return map.get(synergyId) || 0;
    }

    private calculateCachedSynergies(team: Unit[], map: Map<string, number>) {
        map.clear(); // CRITICAL: Reset before recalculating
        const familyMap = new Map<string, Set<string>>();
        const eeveeFormsPerSynergy = new Map<string, Set<string>>();

        team.forEach(u => {
            u.synergies.forEach(syn => {
                if (!familyMap.has(syn)) familyMap.set(syn, new Set());
                familyMap.get(syn)!.add(u.family);

                if (u.family === 'eevee' && u.templateId !== 'eevee') {
                    if (!eeveeFormsPerSynergy.has(syn)) eeveeFormsPerSynergy.set(syn, new Set());
                    eeveeFormsPerSynergy.get(syn)!.add(u.templateId);
                }
            });
        });

        familyMap.forEach((set, syn) => {
            let count = set.size;

            // Eevee Special Logic
            if (eeveeFormsPerSynergy.has(syn)) {
                if (syn === 'BatonPass') {
                    // Baton Pass: Unique Eevee forms count as different families
                    const uniqueEeveeForms = eeveeFormsPerSynergy.get(syn)!;
                    // We already counted family 'eevee' as 1 in set.size if any form was present.
                    // Add the remaining N-1 forms.
                    count += (uniqueEeveeForms.size - 1);
                } else {
                    // Elemental Synergies: If any matching Eevee form exists, it counts as 2 instead of 1.
                    // (Matching logic: The form must have the synergy in its definition, which we already verified by eeveeFormsPerSynergy inclusion)
                    count += 1;
                }
            }

            map.set(syn, count);
        });
    }

    private async applyBattleStartSynergies(team: Unit[]) {
        if (team.length === 0) return;

        // Triplets and Starter synergies have been moved to End of Prep phase

        const isPlayer = this.initialPlayerSet.has(team[0]);
        const mySynergies = isPlayer ? this.playerSynergies : this.enemySynergies;
        const opTeam = isPlayer ? this.enemyTeam : this.playerTeam;

        // Easter Egg: Extreme Evoboost (九彩昇華齊聚頂)
        // Required: 5 different Eevee evolution forms
        const eeveeEvolutions = team.filter(u => u && u.family === 'eevee' && u.templateId !== 'eevee');
        const uniqueEeveeForms = new Set(eeveeEvolutions.map(u => u.templateId));
        if (uniqueEeveeForms.size >= 5) {
            this.log(`伊布發動了九彩昇華齊聚頂`);
            team.forEach(u => {
                if (u && u.stats.hp > 0) {
                    this.growUnit(u, 20, 20, '九彩昇華齊聚頂', null, true);
                    this.playAnimation(u, 'glow-rainbow', 1000);
                }
            });
        }

        // Charm (撒嬌): Random 2/3/4 enemies -33% Atk
        const charmCount = mySynergies.get('Charm') || 0;
        if (charmCount >= 2) {
            const targetCount = charmCount - 1;
            const livingEnemies = opTeam.filter(u => u && u.stats.hp > 0);
            if (livingEnemies.length > 0) {
                const shuffled = [...livingEnemies].sort(() => 0.5 - Math.random());
                const selected = shuffled.slice(0, targetCount);
                for (const target of selected) {
                    const reducedAmt = Math.floor(target.stats.attack * 0.33);
                    if (reducedAmt > 0) {
                        target.stats.attack -= reducedAmt;
                        this.log(`${target.name} 因撒嬌的眼神，降低了攻擊。`);
                        this.playAnimation(target, 'glow-pale-pink', 500);
                    }
                }
            }
        }

        // Charge (充電): All Charge units +random Atk (0-4 / 2-6 / 4-10 / 8-15)
        const chargeCount = mySynergies.get('Charge') || 0;
        if (chargeCount >= 2) {
            let minBoost = 0;
            let maxBoost = 4;
            if (chargeCount >= 5) { minBoost = 8; maxBoost = 15; }
            else if (chargeCount >= 4) { minBoost = 4; maxBoost = 10; }
            else if (chargeCount >= 3) { minBoost = 2; maxBoost = 6; }

            team.filter(u => u && u.synergies.includes('Charge')).forEach(u => {
                const boost = minBoost + Math.floor(Math.random() * (maxBoost - minBoost + 1));
                if (boost > 0) {
                    u.stats.attack += boost;
                    // No message as requested
                    this.playAnimation(u, 'glow-yellow', 500);
                }
            });
        }
    }

    private growUnit(unit: Unit, hp: number, atk: number, sourceName?: string, permanentTarget?: Unit | null, silent: boolean = false) {
        if (unit.family === 'sneasel' && atk < 0) atk = 0; // Protection
        if (hp === 0 && atk === 0) return;

        // 1. Apply to Battle Clone
        // Rule: If unit is dead (hp <= 0), don't add HP to it (no mid-battle revival)
        // But always add MaxHP and Atk.
        unit.stats.maxHp += hp;
        if (unit.stats.hp > 0) {
            unit.stats.hp += hp;
        }
        unit.stats.attack += atk;
        unit.capStats();

        // 2. Apply to Permanent Target (Always grow)
        if (permanentTarget) {
            permanentTarget.addGrowth(hp, atk);
        }

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

        // Fire: Atk Buff on Attack (HP cost, triggers first)
        if (unit.synergies.includes('Fire')) {
            this.eventBus.on('BEFORE_ATTACK', (e) => {
                if (e.source === unit) {
                    const count = this.getSynergyCountForUnit(unit, 'Fire');
                    const buff = count >= 5 ? 12 : (count >= 4 ? 7 : (count >= 3 ? 4 : (count >= 2 ? 2 : 0)));
                    if (buff > 0 && unit.stats.hp > 1) {
                        unit.stats.hp -= 1;
                        this.buffAttack(unit, buff);
                        this.log(`${unit.name} 燃盡全身的火焰！`);
                    }
                }
            });
        }

        // Grass: Lifesteal
        if (unit.synergies.includes('Grass')) {
            this.eventBus.on('AFTER_ATTACK', async (e) => {
                // Critical: Check HP AFTER attack completes to prevent dead units from healing
                if (unit.stats.hp <= 0) return;
                const { myTeam } = this.getTeams(unit);
                if (e.source === unit && e.target && myTeam.includes(unit)) { // Ensure unit is still in team
                    if (this.grassHealedTargets.has(e.target)) return;

                    const count = this.getSynergyCountForUnit(unit, 'Grass');
                    const heal = count >= 5 ? 12 : (count >= 4 ? 7 : (count >= 3 ? 4 : (count >= 2 ? 2 : 0)));
                    if (heal > 0 && unit.stats.hp > 0) {
                        this.heal(unit, heal);
                        this.grassHealedTargets.add(e.target);
                        // Message remains same as per user instruction (none provided for Grass)
                        this.log(`${unit.name} 吸取了 ${heal} 生命`);
                    }
                }
            });
        }

        // Water (Vortex): Reduce target attack before attack (Once per target)
        if (unit.synergies.includes('Water')) {
            this.eventBus.on('BEFORE_ATTACK', async (e) => {
                if (unit.stats.hp <= 0) return;
                if (e.source === unit && e.target && e.target.stats.hp > 0) {
                    if (this.waterDebuffedTargets.has(e.target)) return;

                    if (e.target.family === 'sneasel') {
                        this.log(`${e.target.name} 發動了銳利目光！`);
                        return;
                    }
                    const count = this.getSynergyCountForUnit(unit, 'Water');
                    const debuff = count >= 5 ? 10 : (count >= 4 ? 5 : (count >= 3 ? 3 : (count >= 2 ? 1 : 0)));
                    if (debuff > 0 && e.target.stats.attack > 1) {
                        const amountReduced = Math.min(e.target.stats.attack - 1, debuff);
                        e.target.stats.attack -= amountReduced;
                        this.waterDebuffedTargets.add(e.target);
                        this.log(`${e.target.name} 被困在漩渦，降低了 ${amountReduced} 攻擊！`);
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
                    const buffAmount = [0, 1, 2, 5][unit.level] || 1;
                    const isAtk = Math.random() < 0.5;
                    await this.delay(150); // Delay for visual pacing
                    await this.notifySkill(unit, `發動了健美！`);
                    await this.playAnimation(unit, 'jump', 200);
                    this.growUnit(unit, isAtk ? 0 : buffAmount, isAtk ? buffAmount : 0, '水躍魚技能');
                }
            });
        }
        // Squirtle Family: Damage Reduction
        if (unit.family === 'squirtle') {
            this.eventBus.on('BEFORE_HURT', (e) => {
                const s = this.unitStates.get(unit);
                const source = e.context.source;
                const sourceState = source ? this.unitStates.get(source) || {} : {};
                const isBypassing = (source && source.family === 'pinsir' && !sourceState.isSilenced) ||
                    (source && source.family === 'sableye' && sourceState.isAbsoluteKill);

                if (e.target === unit && !s?.isSilenced && !isBypassing) {
                    const reduction = [0, 1, 2, 3][unit.level] || 1;
                    const oldAmt = e.context.amount;
                    if (oldAmt > 1) {
                        const newAmt = Math.max(1, oldAmt - reduction);
                        if (newAmt < oldAmt) {
                            e.context.amount = newAmt;
                            this.log(`${unit.name} 發動了縮殼！`);
                        }
                    }
                }
            });
        }


        // Cyndaquil rework: Team AOE before attack
        if (unit.family === 'cyndaquil') {
            this.eventBus.on('BEFORE_ATTACK', async (e) => {
                if (e.source === unit && !this.unitStates.get(unit)?.isSilenced) {
                    const dmg = [0, 1, 2, 5][unit.level] || 1;
                    await this.notifySkill(unit, '使用了噴火！');
                    await this.playAnimation(unit, 'jump', 200);

                    const allUnits = [...this.playerTeam, ...this.enemyTeam].filter(u => u && u !== unit && u.stats.hp > 0);
                    for (const target of allUnits) {
                        await this.dealDamage(unit, target, dmg, true, true);
                    }
                }
            });
        }

        // Torchic: Pursuit
        if (unit.family === 'torchic') {
            this.eventBus.on('AFTER_ATTACK', async (e) => {
                if (unit.stats.hp <= 0 || this.unitStates.get(unit)?.isSilenced) return;
                const { myTeam } = this.getTeams(unit);
                if (e.source && e.source !== unit && myTeam.includes(e.source) && e.target) {
                    await this.delay(200); // Increased delay
                    this.log(`${unit.name} 發動了二連踢！`);
                    await this.playAnimation(unit, 'jump', 200);
                    const dmg = [0, 2, 5, 10][unit.level] || 2;
                    await this.dealDamage(unit, e.target, dmg);
                }
            });
        }

        // Fire logic moved to top of registerUnitAbilities

        // Angry: Atk on Hurt (Buff All Allies)
        if (unit.synergies.includes('Angry')) {
            this.eventBus.on('ON_HURT', (e) => {
                if (e.target === unit) {
                    const count = this.getSynergyCountForUnit(unit, 'Angry');
                    const buff = count >= 4 ? 10 : (count >= 3 ? 5 : (count >= 2 ? 2 : 0));
                    if (buff > 0) {
                        const { myTeam } = this.getTeams(unit);
                        myTeam.forEach(u => {
                            if (u && u.stats.hp > 0) {
                                this.buffAttack(u, buff, true);
                            }
                        });
                        const side = this.playerTeam.includes(unit) ? '我方' : '敵方';
                        this.log(`${unit.name} 因憤怒的力量提高了 ${side} ${buff} 攻擊！`);
                        if (this.onUpdate) this.onUpdate();
                    }
                }
            });
        }

        // SwordDance: Atk on Move
        if (unit.synergies.includes('SwordDance')) {
            this.eventBus.on('ON_MOVE', async (e) => {
                if (e.source === unit) {
                    const count = this.getSynergyCountForUnit(unit, 'SwordDance');
                    const buff = count >= 2 ? 2 : 0;
                    if (buff > 0) {
                        const original = this.originalPlayerTeam?.find(u => u && u.id === unit.id);
                        this.growUnit(unit, 0, buff, '劍舞', original, true);
                        if (!e.context?.isPassiveMove) {
                            this.log(`${unit.name}發動了劍舞， 提高 ${buff} 攻擊！`);
                        }
                    }
                }
            });
        }

        // Roost: HP on Move
        if (unit.synergies.includes('Roost')) {
            this.eventBus.on('ON_MOVE', async (e) => {
                if (e.source === unit) {
                    const count = this.getSynergyCountForUnit(unit, 'Roost');
                    const buff = count >= 2 ? 2 : 0;
                    if (buff > 0) {
                        const original = this.originalPlayerTeam?.find(u => u && u.id === unit.id);
                        this.growUnit(unit, buff, 0, '羽棲', original, true);
                        if (!e.context?.isPassiveMove) {
                            this.log(`${unit.name}發動了羽棲， 提高 ${buff} 生命！`);
                        }
                    }
                }
            });
        }

        // Snow: Start of Battle Dmg
        if (unit.synergies.includes('Snow')) {
            // No trigger logic needed here, handled as constant battle-start effect in Simulator
        }

        // Cave: Stat Buff on Move
        if (unit.synergies.includes('Cave')) {
            this.eventBus.on('ON_MOVE', async (e) => {
                if (e.source === unit) {
                    if (this.getSynergyCountForUnit(unit, 'Cave') >= 2) {
                        const original = this.originalPlayerTeam?.find(u => u && u.id === unit.id);
                        const isAtk = Math.random() < 0.5;
                        this.growUnit(unit, isAtk ? 0 : 1, isAtk ? 1 : 0, '挖洞', original, e.context?.isPassiveMove || false);
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

        // Onix: Move to Back after attack and Reflect Damage
        if (unit.family === 'onix') {
            // Move to back after attack
            this.eventBus.on('AFTER_ATTACK', async (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                if (e.source === unit && unit.stats.hp > 0) {
                    const { myTeam } = this.getTeams(unit);
                    const aliveCount = myTeam.filter(u => u && u.stats.hp > 0).length;
                    if (aliveCount <= 1) return; // Don't move if alone

                    const idx = myTeam.indexOf(unit);
                    if (idx !== -1 && idx < myTeam.length - 1) {
                        myTeam.splice(idx, 1);
                        myTeam.push(unit);
                        await this.compactTeams();
                        await this.delay(250);
                        await this.eventBus.emit({ type: 'ON_MOVE', source: unit, context: {} });
                    }
                }
            });

            // Reflect 200% of incoming BASIC damage
            this.eventBus.on('ON_HURT', async (e) => {
                if (e.target === unit && e.context.source && e.context.source.stats.hp > 0 && !this.unitStates.get(unit)?.isSilenced) {
                    if (!e.context.isSkillDamage && e.context.amount > 0) {
                        const reflectDmg = Math.ceil(e.context.amount * 0.5); // Nerfed to 50%
                        this.log(`${unit.name} 對${e.context.source.name}使用了捨身衝撞！`);
                        this.playAnimation(unit, 'jump', 200);
                        await this.dealDamage(unit, e.context.source, reflectDmg, true, true);
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

        // Onix abilities are now all registered in the block above (lines 626+)

        if (unit.family === 'fuecoco') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                const { myTeam } = this.getTeams(unit);
                if (unit.stats.hp <= 0 || this.unitStates.get(unit)?.isSilenced || !myTeam.includes(unit)) return;
                if (e.context.killer && myTeam.includes(e.context.killer)) {
                    const hpBuff = 2;
                    const targetCount = unit.level; // 1, 2, or 3
                    const now = Date.now();
                    const state = this.unitStates.get(unit) || {};
                    const lastGlow = state.lastGlobalGlowTime || 0;

                    if (now - lastGlow > 500 && !(e.context as any).fuecocoAnimTriggered) {
                        (e.context as any).fuecocoAnimTriggered = true;
                        myTeam.filter(u => u?.family === 'fuecoco').forEach(u => {
                            if (u) {
                                const us = this.unitStates.get(u) || {};
                                us.lastGlobalGlowTime = now;
                                this.unitStates.set(u, us);
                            }
                        });
                        this.notifySkill(unit, `發動了閃焰高歌！`);
                    }

                    // Buff random living allies who are under HP limit
                    const livingEligible = myTeam.filter(u => u && u.stats.hp > 0 && u.stats.maxHp < 50);
                    if (livingEligible.length > 0) {
                        const shuffled = [...livingEligible].sort(() => 0.5 - Math.random());
                        const targets = shuffled.slice(0, targetCount);

                        targets.forEach(target => {
                            this.playTeamAnimation([target], 'glow-pale-red', 1000);
                            const original = this.originalPlayerTeam?.find(o => o && o.id === target.id);
                            this.growUnit(target, hpBuff, 0, '呆火鱷技能強化', original, true);
                        });
                    }
                }
            });
        }

        // Quaxly logic...
        if (unit.family === 'quaxly') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                const { myTeam } = this.getTeams(unit);
                if (unit.stats.hp <= 0 || this.unitStates.get(unit)?.isSilenced || !myTeam.includes(unit)) return;
                if (e.context.killer && myTeam.includes(e.context.killer)) {
                    const atkBuff = 2;
                    const targetCount = unit.level; // 1, 2, or 3
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
                    }

                    // Buff random living allies who are under ATK limit
                    const livingEligible = myTeam.filter(u => u && u.stats.hp > 0 && u.stats.attack < 50);
                    if (livingEligible.length > 0) {
                        const shuffled = [...livingEligible].sort(() => 0.5 - Math.random());
                        const targets = shuffled.slice(0, targetCount);

                        targets.forEach(target => {
                            this.playTeamAnimation([target], 'glow-pale-blue', 1000);
                            const original = this.originalPlayerTeam?.find(o => o && o.id === target.id);
                            this.growUnit(target, 0, atkBuff, '潤水鴨技能強化', original, true);
                        });
                    }
                }
            });
        }

        // Psyduck Family: Kill -> Random Ally Perm HP
        if (unit.family === 'psyduck') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                if (e.context.killer === unit) {
                    const { myTeam } = this.getTeams(unit);
                    const living = myTeam.filter(u => u && u.stats.hp > 0);
                    if (living.length > 0) {
                        const targetCount = unit.level;
                        const hpBuff = 2;
                        const atkBuff = 1;
                        const shuffled = [...living].sort(() => 0.5 - Math.random());
                        const targets = shuffled.slice(0, targetCount);
                        targets.forEach(target => {
                            this.log(`${unit.name} 對 ${target.name} 發動了瞬間失憶。`);
                            this.playTeamAnimation([target], 'glow-pale-blue', 1000);
                            const original = this.originalPlayerTeam?.find(o => o && o.id === target.id);
                            this.growUnit(target, hpBuff, atkBuff, '瞬間失憶', original, true);
                        });
                    }
                }
            });
        }

        // Bellsprout Family: Ally Summon -> Random Ally Perm Atk/HP
        if (unit.family === 'bellsprout') {
            this.eventBus.on('ON_FRIEND_SUMMONED', async (e) => {
                if (unit.stats.hp <= 0 || this.unitStates.get(unit)?.isSilenced) return;
                const { side } = this.getTeams(unit);
                const { side: sSide } = e.source ? this.getTeams(e.source) : { side: null };

                if (e.source && side === sSide && e.source !== unit) {
                    const living = this.playerTeam.includes(unit) ? this.playerTeam.filter(u => u && u.stats.hp > 0) : this.enemyTeam.filter(u => u && u.stats.hp > 0);
                    if (living.length > 0) {
                        const targetCount = unit.level;
                        const buff = 1; // +1 atk, +1 hp
                        const shuffled = [...living].sort(() => 0.5 - Math.random());
                        const targets = shuffled.slice(0, targetCount);
                        targets.forEach(target => {
                            this.log(`${unit.name} 對 ${target.name} 發動了生長。`);
                            this.playTeamAnimation([target], 'glow-pale-green', 1000);
                            const original = this.originalPlayerTeam?.find(o => o && o.id === target.id);
                            this.growUnit(target, buff, buff, '生長', original, true);
                        });
                    }
                }
            });
        }

        // Vulpix Family: Kill -> Random Ally Perm ATK
        if (unit.family === 'vulpix') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                if (e.context.killer === unit) {
                    const { myTeam } = this.getTeams(unit);
                    const living = myTeam.filter(u => u && u.stats.hp > 0);
                    if (living.length > 0) {
                        const targetCount = unit.level;
                        const atkBuff = 2;
                        const hpBuff = 1;
                        const shuffled = [...living].sort(() => 0.5 - Math.random());
                        const targets = shuffled.slice(0, targetCount);
                        targets.forEach(target => {
                            this.log(`${unit.name} 對 ${target.name} 發動了蓄能焰襲。`);
                            this.playTeamAnimation([target], 'glow-pale-red', 1000);
                            const original = this.originalPlayerTeam?.find(o => o && o.id === target.id);
                            this.growUnit(target, hpBuff, atkBuff, '蓄能焰襲', original, true);
                        });
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
                        // Bulbasaur (1 star) -> Spawns 1 seed (Matches description)
                        const count = 1;
                        const seedStats = 1;
                        await this.notifySkill(unit, `召喚了 1 隻小種子`);
                        await this.delay(100);
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
                    // Fix: Match description. Lv1: 1/1, Lv2: 2/2, Lv3: 5/5
                    const stats = [0, 1, 2, 5][unit.level] || 1;
                    for (let i = 0; i < count; i++) {
                        const { myTeam: currentTeam } = this.getTeams(unit);
                        const targetIdx = (e.context.deathIdx !== undefined) ? e.context.deathIdx + i : deathIdx + i;
                        await this.spawnUnit(currentTeam, targetIdx, 'mouse', 1, stats, stats, true);
                    }
                    // COMPACTION REMOVED HERE
                }
            });
        }

        // Geodude Line: Summon Help (Prevent loop if instance is already a stone)
        if (unit.family === 'geodude' && unit.templateId !== 'stone') {
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

                    await this.notifySkill(unit, '召喚了小石頭');
                    await this.delay(100);
                    const count = unit.level >= 3 ? 5 : 2;
                    const stats = [0, 1, 2, 5][unit.level] || 1;
                    for (let i = 0; i < count; i++) {
                        const { myTeam: currentTeam } = this.getTeams(unit);
                        const targetIdx = (e.context.deathIdx !== undefined) ? e.context.deathIdx + i : deathIdx + i;
                        await this.spawnUnit(currentTeam, targetIdx, 'stone', 1, stats, stats, true);
                    }
                }
            });
        }

        // Shuppet/Banette: Hurt -> Dmg to random enemy (Spite)
        if (unit.family === 'shuppet') {
            this.eventBus.on('ON_HURT', async (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                if (e.target === unit) {
                    const { opTeam } = this.getTeams(unit);
                    const living = opTeam.filter(u => u && u.stats.hp > 0);
                    if (living.length > 0) {
                        const target = living[Math.floor(Math.random() * living.length)];
                        await this.notifySkill(unit, `發動了怨恨！`);
                        await this.delay(100);
                        const dmg = [0, 2, 5, 10][unit.level] || 2;
                        await this.dealDamage(unit, target, dmg, true);
                    }
                }
            });
        }

        // Drifloon/Drifblim: Death -> AOE dmg (Explosion)
        if (unit.family === 'drifloon') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                if (e.source === unit) {
                    const { myTeam, opTeam } = this.getTeams(unit);

                    const dmg = [0, 2, 5, 10][unit.level] || 2;
                    await this.notifySkill(unit, `使用了自爆\n對全體造成了 ${dmg} 傷害`);
                    // Affect EVERYONE else (myTeam and opTeam)
                    const allTargets = [...myTeam, ...opTeam].filter(u => u && u !== unit && u.stats.hp > 0);
                    for (const target of allTargets) {
                        await this.dealDamage(unit, target!, dmg, true, true); // silent=true
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
                        this.log(`${unit.name} 發動了畫皮，抵擋傷害！`);
                    }
                }
            });
        }

        // Dratini Family: First damage halved
        if (unit.family === 'dratini') {
            this.eventBus.on('BEFORE_HURT', (e) => {
                const s = this.unitStates.get(unit);
                if (e.target === unit && !s?.isSilenced && !s?.firstDamageHalved) {
                    const source = e.context.source;
                    const sState = source ? this.unitStates.get(source) || {} : {};
                    const isBypassing = (source && source.family === 'pinsir' && !sState.isSilenced) ||
                        (source && source.family === 'sableye' && sState.isAbsoluteKill);
                    if (isBypassing) return;

                    const state = this.unitStates.get(unit) || {};
                    state.firstDamageHalved = true;
                    this.unitStates.set(unit, state);
                    const oldAmt = e.context.amount;
                    e.context.amount = Math.ceil(oldAmt / 2);
                    this.log(`${unit.name} 發動了神奇鱗片，傷害減半！`);
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
                    const buff = [0, 2, 5, 10][unit.level] || 2;
                    await this.delay(150);
                    await this.notifySkill(unit, `對 ${e.source.name} 發動了甜甜香氣！`);
                    await this.playAnimation(unit, 'jump', 200);
                    this.growUnit(e.source, 0, buff);
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
                    const dmg = [0, 2, 4, 8][unit.level] || 2;
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

        // Sprigatito Family: Buff one random ally on Summon
        if (unit.family === 'sprigatito') {
            this.eventBus.on('ON_FRIEND_SUMMONED', async (e) => {
                const { myTeam } = this.getTeams(unit);
                if (unit.stats.hp <= 0 || this.unitStates.get(unit)?.isSilenced || !myTeam.includes(unit)) return;
                if (e.source && myTeam.includes(e.source) && e.source !== unit) {
                    const buff = 1;
                    const targetCount = unit.level; // 1, 2, or 3
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
                    }

                    // Buff random living allies who are under BOTH limits
                    const livingEligible = myTeam.filter(u => u && u.stats.hp > 0 && (u.stats.maxHp < 50 || u.stats.attack < 50));
                    if (livingEligible.length > 0) {
                        const shuffled = [...livingEligible].sort(() => 0.5 - Math.random());
                        const targets = shuffled.slice(0, targetCount);

                        targets.forEach(target => {
                            this.playTeamAnimation([target], 'glow-pale-green', 1000);
                            const original = this.originalPlayerTeam?.find(o => o && o.id === target.id);
                            this.growUnit(target, buff, buff, '新葉喵技能強化', original, true);
                        });
                    }
                }
            });
        }

        // Cubone Family: Death -> Random Enemy Damage
        if (unit.family === 'cubone') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                const s = this.unitStates.get(unit);
                if (s?.isSilenced || e.source !== unit) return;
                const { opTeam } = this.getTeams(unit);
                const livingEnemies = opTeam.filter(u => u && u.stats.hp > 0);
                if (livingEnemies.length > 0) {
                    const target = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];
                    const ratio = [0, 0.33, 0.5, 1.0][unit.level] || 0.33;
                    const dmg = Math.ceil(unit.stats.attack * ratio);
                    if (dmg > 0) {
                        this.log(`${unit.name}對${target.name}發動了骨頭迴力鏢`);
                        this.playAnimation(unit, 'jump', 200);
                        await this.dealDamage(unit, target, dmg, true);
                    }
                }
            });
        }

        // Murkrow Family: Attack then move back; Pursuit on enemy attack
        if (unit.family === 'murkrow') {
            this.eventBus.on('AFTER_ATTACK', async (e) => {
                const s = this.unitStates.get(unit);
                if (s?.isSilenced || unit.stats.hp <= 0) return;
                if (e.source === unit) {
                    const { myTeam } = this.getTeams(unit);
                    const aliveCount = myTeam.filter(u => u && u.stats.hp > 0).length;
                    if (aliveCount <= 1) return;
                    const idx = myTeam.indexOf(unit);
                    if (idx !== -1 && idx < myTeam.length - 1) {
                        myTeam.splice(idx, 1);
                        myTeam.push(unit);
                        await this.compactTeams();
                        await this.eventBus.emit({ type: 'ON_MOVE', source: unit, context: { isPassiveMove: true } });
                    }
                }
            });

            this.eventBus.on('AFTER_ATTACK', async (e) => {
                const s = this.unitStates.get(unit);
                if (s?.isSilenced || unit.stats.hp <= 0) return;
                const { opTeam } = this.getTeams(unit);
                if (e.source && opTeam.includes(e.source) && e.source.stats.hp > 0) {
                    this.log(`${unit.name}對${e.source.name}發動了突襲`);
                    this.playAnimation(unit, 'jump', 200);
                    await this.dealDamage(unit, e.source, 5, true);
                }
            });
        }

        // Togepi Family: Super Luck (After Attack Buff)
        if (unit.family === 'togepi') {
            this.eventBus.on('AFTER_ATTACK', async (e) => {
                const s = this.unitStates.get(unit);
                const { myTeam } = this.getTeams(unit);
                if (e.source === unit && unit.stats.hp > 0 && !s?.isSilenced) {
                    const selfAtks = [0, 1, 2, 5];
                    const selfAtk = selfAtks[unit.level] || 1;
                    const original = this.originalPlayerTeam?.find(o => o && o.id === unit.id);
                    // Permanent growth for self
                    this.growUnit(unit, 0, selfAtk, '超幸運', original, true);

                    const aliveFriends = myTeam.filter((u: Unit) => u && u.stats.hp > 0);
                    if (aliveFriends.length > 0) {
                        const randomFriend = aliveFriends[Math.floor(Math.random() * aliveFriends.length)];
                        await this.notifySkill(unit, `對 ${randomFriend.name} 發動了超幸運！`);
                        // Friend buff is temporary (+5 Attack)
                        this.growUnit(randomFriend, 0, 5, '超幸運', null, true);
                        this.playAnimation(randomFriend, 'glow-white', 600);
                    }
                }
            });
        }

        // Outrage Synergy: 25% extra, 25% fail, 50% normal
        if (unit.synergies.includes('Outrage')) {
            this.eventBus.on('BEFORE_ATTACK', async (e) => {
                const s = this.unitStates.get(unit);
                if (e.source === unit && unit.stats.hp > 0 && !s?.isSilenced) {
                    const count = this.getSynergyCountForUnit(unit, 'Outrage');
                    if (count >= 2) {
                        const rand = Math.random();
                        if (rand < 0.25) {
                            if (s) s.isAttackSkipped = true;
                        } else if (rand < 0.50) { // 25% total (33% of remaining 75%)
                            if (s) s.isExtraAttack = true;
                        }
                    }
                }
            });
        }

        // Mareep Family: Charge Beam (充電光束) - Ally kill trigger
        if (unit.family === 'mareep') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                const s = this.unitStates.get(unit);
                if (unit.stats.hp <= 0 || s?.isSilenced) return;

                const { myTeam } = this.getTeams(unit);
                const { killer } = e.context;

                // Trigger if an ally (including self) killed someone
                if (killer && myTeam.includes(killer)) {
                    const targetCount = unit.level; // 1, 2, or 3
                    const aliveFriends = myTeam.filter((u: Unit) => u && u.stats.hp > 0);

                    if (aliveFriends.length > 0) {
                        const shuffled = [...aliveFriends].sort(() => 0.5 - Math.random());
                        const targets = shuffled.slice(0, targetCount);

                        await this.notifySkill(unit, `使用了充電光束！`);
                        for (const target of targets) {
                            const original = this.playerTeam.includes(target) ? this.originalPlayerTeam?.find((o: Unit | null) => o && o.id === target.id) : null;
                            this.growUnit(target, 1, 1, '充電光束', original, true);
                            this.playAnimation(target, 'glow-yellow', 600);
                        }
                    }
                }
            });
        }

        // Happiny Family: Grow HP + Heal random ally on own attack
        if (unit.family === 'happiny') {
            this.eventBus.on('AFTER_ATTACK', async (e) => {
                const s = this.unitStates.get(unit);
                const { myTeam } = this.getTeams(unit);
                if (e.source === unit && unit.stats.hp > 0 && !s?.isSilenced) {
                    const selfGrowths = [0, 1, 2, 5];
                    const selfGrow = selfGrowths[unit.level] || 1;
                    const original = this.playerTeam.includes(unit) ? this.originalPlayerTeam?.find((o: Unit | null) => o && o.id === unit.id) : null;
                    this.growUnit(unit, selfGrow, 0, '生蛋技能', original, true);

                    const aliveFriends = myTeam.filter((u: Unit) => u && u.stats.hp > 0);
                    if (aliveFriends.length > 0) {
                        const randomFriend = aliveFriends[Math.floor(Math.random() * aliveFriends.length)];
                        await this.notifySkill(unit, `對 ${randomFriend.name} 發動了生蛋！`);
                        const fo = null; // Ally buff is temporary
                        this.growUnit(randomFriend, 5, 0, '生蛋技能', fo, true);
                        this.playAnimation(randomFriend, 'glow-green', 600);
                    }
                }
            });
        }

        // Dratini Family: First damage halved
        if (unit.family === 'dratini') {
            this.eventBus.on('BEFORE_HURT', (e) => {
                const s = this.unitStates.get(unit);
                if (e.target === unit && !s?.isSilenced && !s?.firstDamageHalved) {
                    e.context.amount = Math.ceil(e.context.amount / 2);
                    if (s) s.firstDamageHalved = true;
                }
            });
        }

        // Larvitar Family: AoE damage before attack + On-hurt permanent growth
        if (unit.family === 'larvitar') {
            this.eventBus.on('BEFORE_ATTACK', async (e) => {
                const s = this.unitStates.get(unit);
                if (e.source === unit && unit.stats.hp > 0 && !s?.isSilenced) {
                    const ratios = [0, 0.25, 0.33, 0.5];
                    const ratio = ratios[unit.level] || 0.25;
                    const dmg = Math.ceil(unit.stats.attack * ratio);
                    const { opTeam } = this.getTeams(unit);
                    const livingEnemies = opTeam.filter(u => u && u.stats.hp > 0);

                    if (livingEnemies.length > 1) {
                        const targets = livingEnemies.slice(1); // Targets are all except the front-most
                        this.log(`${unit.name} 對後方目標使用了咬碎`);
                        for (const target of targets) {
                            await this.dealDamage(unit, target, dmg, true, true);
                        }
                        if (this.onUpdate) this.onUpdate();
                    }
                }
            });

            this.eventBus.on('ON_HURT', async (e) => {
                if (e.target === unit && unit.stats.hp > 0 && !this.unitStates.get(unit)?.isSilenced) {
                    const original = this.originalPlayerTeam?.find(o => o && o.id === unit.id);
                    // New: +2 HP and +2 ATK
                    this.growUnit(unit, 2, 2, '受傷成長', original, true);
                }
            });
        }
    }

    public async performAttack(attacker: Unit, defender: Unit) {
        if (attacker.stats.hp <= 0 || defender.stats.hp <= 0) return;

        // Skip attack logic (e.g., Outrage confusion)
        const state = this.unitStates.get(attacker);
        if (state?.isAttackSkipped) {
            state.isAttackSkipped = false;
            this.log(`${attacker.name} 處於混亂狀態不受控制`);
            return;
        }

        // Notify that an attack is starting
        await this.eventBus.emit({ type: 'ON_ATTACK', source: attacker, target: defender, context: {} });

        // Ordinary attack log removed per design request to reduce clutter
        // this.log(`${attacker.name} 攻擊了 ${defender.name}！`);
        await this.delay(100);

        // BEFORE_ATTACK moved to simulateStep

        const attackPromises: Promise<any>[] = [];
        const dmg = attacker.stats.attack;

        // Base attack
        attackPromises.push(this.dealDamage(attacker, defender, dmg, false));

        // Outrage: 25% chance of extra random target hit
        if (state?.isExtraAttack) {
            state.isExtraAttack = false;
            const { opTeam } = this.getTeams(attacker);
            const liveEnemies = opTeam.filter(u => u && u.stats.hp > 0);
            if (liveEnemies.length > 0) {
                const target = liveEnemies[Math.floor(Math.random() * liveEnemies.length)];
                this.log(`${attacker.name} 對 ${target.name} 發動了逆鱗`);
                attackPromises.push(this.dealDamage(attacker, target, dmg));
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
            if (Math.random() < 0.33) {
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


        // Charmander (Revised): Splash to neighbor (Inherited from old Totodile)
        if (attacker.family === 'charmander' && !this.unitStates.get(attacker)?.isSilenced) {
            const side = this.initialPlayerSet.has(attacker) ? 'enemy' : 'player';
            const opTeam = side === 'enemy' ? this.enemyTeam : this.playerTeam;
            const idx = opTeam.indexOf(defender);
            if (idx !== -1 && idx < opTeam.length - 1) {
                const neighbor = opTeam[idx + 1];
                if (neighbor && neighbor.stats.hp > 0) {
                    const splashDmg = attacker.scalingValue;
                    await this.notifySkill(attacker, `發動了噴射火焰！`);
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
                const multiplier = attacker.level >= 3 ? 1.0 : (attacker.level === 2 ? 0.5 : 0.33);
                const bonusDmg = Math.ceil(attacker.stats.attack * multiplier);
                this.log(`${attacker.name} 對 ${target.name} 發動了精神強念！`);
                attackPromises.push(this.dealDamage(attacker, target, bonusDmg, true));
            }
        }

        // Bonsly family: Rock Slide targets the last enemy
        if (attacker.family === 'bonsly' && !this.unitStates.get(attacker)?.isSilenced) {
            const side = this.initialPlayerSet.has(attacker) ? 'enemy' : 'player';
            const opTeam = side === 'enemy' ? this.enemyTeam : this.playerTeam;
            const liveEnemies = opTeam.filter(u => u && u.stats.hp > 0);
            if (liveEnemies.length > 0) {
                const target = liveEnemies[liveEnemies.length - 1]; // Last enemy
                const dmg = [0, 1, 2, 5][attacker.level] || 1;
                this.log(`${attacker.name} 對 ${target.name} 發動了落石！`);
                attackPromises.push(this.dealDamage(attacker, target, dmg, true));
            }
        }

        await Promise.all(attackPromises);

        // Snover: Knockback
        if (attacker.family === 'snover' && !this.unitStates.get(attacker)?.isSilenced) {
            const buffAtk = [0, 1, 2, 5][attacker.level] || 1;
            const original = this.originalPlayerTeam?.find(u => u && u.id === attacker.id);
            this.growUnit(attacker, 0, buffAtk, attacker.name, original);
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

        // Psychic Synergy: "Global AOE" (Random Targets)
        const updatePsychic = async (isPlayer: boolean) => {
            const side = isPlayer ? 'player' : 'enemy';
            const count = (isPlayer ? this.playerSynergies : this.enemySynergies).get('Psychic') || 0;

            if (count >= 2) {
                // "兩回合後" means exactly start of Turn 3, and only once.
                if (this.turnCount === 3) {
                    const lastTurn = this.unitStates.get(this as any)?.[`psychicLastTurn_${side}`];
                    if (lastTurn !== this.turnCount) {
                        const state = this.unitStates.get(this as any) || {};
                        state[`psychicLastTurn_${side}`] = this.turnCount;
                        this.unitStates.set(this as any, state);

                        this.log(isPlayer ? "敵方受到了預知未來的攻擊！" : "我方受到了預知未來的攻擊！");
                        const targets = isPlayer ? this.enemyTeam : this.playerTeam;
                        const livingEnemies = targets.filter(u => u && u.stats.hp > 0);

                        if (livingEnemies.length > 0) {
                            const targetCount = 2; // Updated from 3
                            const shuffled = [...livingEnemies].sort(() => 0.5 - Math.random());
                            const selectedTargets = shuffled.slice(0, targetCount);

                            const dmg = isPlayer ? this.psychicN : this.enemyPsychicN;
                            this.log(isPlayer ? `預知未來對敵方造成 ${dmg} 傷害！` : `預知未來對我方造成 ${dmg} 傷害！`);
                            for (const target of selectedTargets) {
                                await this.dealDamage(null, target, dmg, true, true);
                            }
                        }
                        if (this.onUpdate) this.onUpdate();
                        await this.delay(300);
                    }
                }
            }
        };

        await updatePsychic(true);
        await updatePsychic(false);
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

        if (isEnemySource) {
            const aliveMimes = myTeam.filter(u => u && u.family === 'mrmime' && u.stats.hp > 0);
            for (const mime of aliveMimes) {
                const mState = this.unitStates.get(mime);
                if (mState && mState.lightScreen > 0) {
                    // "Ignore but still deduct": If bypassing, don't reduce amount but still consume charge
                    if (!isBypassing) {
                        amount = Math.ceil(amount / 2);
                    } else if (source && source.family === 'pinsir') {
                        // Keep the "Bypassing" message consistent if it hits a screen
                        this.log(`${source.name} 的破格穿透了光牆！`);
                    }

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

        if (amount <= 0) {
            // Damage nullified (e.g. by Mimikyu), don't show hurt anim
            if (this.onUpdate) this.onUpdate();
            return;
        }

        // Pinsir/Sableye ignore reductions
        if (isBypassing && source) {
            if (source.family === 'pinsir') {
                this.log(`${source.name} 發動了破格！`);
            }
        }

        const preHp = target.stats.hp;
        target.stats.hp -= amount;
        if (isSkillDamage && !silent) {
            this.log(`${target.name} 受到 ${amount} 傷害！`);
        }

        if (target.stats.hp <= 0 && preHp > 1 && !isBypassing && target.synergies.includes('Hard') && this.getSynergyCountForUnit(target, 'Hard') >= 2 && !targetState.hardUsed) {
            target.stats.hp = 1;
            targetState.hardUsed = true;
            this.unitStates.set(target, targetState);
            this.log(`${target.name} 發動了結實！`);
        }

        // Emit ON_HURT for triggers (like Steelix reflection)
        await this.eventBus.emit({ type: 'ON_HURT', target, context: { source, amount, isSkillDamage } });

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
        // Log removed per user request: "不要在說明角色倒下，戰鬥訊息太多了"
        // this.log(`${unit.name} 倒下了！`);

        // (Shuckle death-trigger removed: Gastro Acid only fires at battle start)

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

        // Triplets Synergy: Permanent growth on death
        if (unit.synergies.includes('Triplets') && this.getSynergyCountForUnit(unit, 'Triplets') >= 3 && !this.unitStates.get(unit)?.isSilenced) {
            const original = this.originalPlayerTeam?.find(o => o && o.id === unit.id);
            if (original) {
                const isAtk = Math.random() < 0.5;
                this.growUnit(unit, isAtk ? 0 : 3, isAtk ? 3 : 0, '三胞胎', original, true);
            }
        }

        // BatonPass (接棒): Random 1 ally inherits 50% Atk/HP
        if (unit.synergies.includes('BatonPass') && this.getSynergyCountForUnit(unit, 'BatonPass') >= 2 && !this.unitStates.get(unit)?.isSilenced) {
            const livingAllies = myTeam.filter(u => u && u !== unit && u.stats.hp > 0);
            if (livingAllies.length > 0) {
                const target = livingAllies[Math.floor(Math.random() * livingAllies.length)];
                const inheritedAtk = Math.floor(unit.stats.attack * 0.5);
                const inheritedHp = Math.floor(unit.stats.maxHp * 0.5);

                if (inheritedAtk > 0 || inheritedHp > 0) {
                    this.growUnit(target, inheritedHp, inheritedAtk, `${unit.name} 的接棒`, null, true);
                    this.log(`${unit.name} 對 ${target.name} 使用了接棒。`);
                    this.playAnimation(target, 'glow-orange', 600);
                }
            }
        }

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

        // 3. Process Killer Rewards
        if (killer) {
            const executeReward = async () => {
                // Check Silence for individual unit abilities
                if (this.unitStates.get(killer)?.isSilenced) return;

                // BugBite Synergy: Kill Reward
                const bugBiteCount = this.getSynergyCountForUnit(killer, 'BugBite');
                if (bugBiteCount >= 2 && killer.synergies.includes('BugBite')) {
                    const original = this.originalPlayerTeam?.find(o => o && o.id === killer.id);
                    this.log(`${killer.name} 發動了蟲咬，提高 1 生命！`);
                    // We call growUnit. It will handle the "don't revive if dead" logic internally.
                    this.growUnit(killer, 1, 0, '蟲咬', original, true);
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
        const template = ALL_UNITS[templateId];
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
            const safeIdx = Math.min(index, 4);

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

        // Track as participant for persistent synergies
        if (team === this.playerTeam) this.participantPlayerUnits.add(newUnit);
        else this.participantEnemyUnits.add(newUnit);
        this.calculateCachedSynergies(Array.from(this.participantPlayerUnits), this.playerSynergies);
        this.calculateCachedSynergies(Array.from(this.participantEnemyUnits), this.enemySynergies);

        // 1. Refresh UI so the DOM element for the new unit is created
        if (this.onUpdate) this.onUpdate();
        // Delay removed as per user request to fix Chikorita/Treecko sync issues

        // 2. Play spawn animation and log (Deferred to ensure DOM exists after React render)
        requestAnimationFrame(() => {
            const el = document.getElementById(newUnit.id);
            if (el) el.classList.add('spawn-anim');
        });


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
        // User Request: Cyndaquil (火球鼠) simplified animation - Only jump, no forward clash.
        const pAnim = pFront.family === 'cyndaquil' ? 'jump' : 'clash';
        const eAnim = eFront.family === 'cyndaquil' ? 'jump' : 'clash';

        const anims = [
            this.playAnimation(pFront, pAnim, 300),
            this.playAnimation(eFront, eAnim, 300)
        ];

        // 2. Pre-Clash logic: Trigger all BEFORE_ATTACK effects (Cyndaquil, Water, etc.)
        await Promise.all([
            this.eventBus.emit({ type: 'BEFORE_ATTACK', source: pFront, target: eFront, context: {} }),
            this.eventBus.emit({ type: 'BEFORE_ATTACK', source: eFront, target: pFront, context: {} })
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
        // Added a short additional wait to ensure all cascading death effects are resolved and visible
        await this.delay(300);
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

        if (!pAlive && !eAlive) {
            console.log("Battle Result: DRAW (Both teams empty)");
            return 'DRAW';
        }
        if (!pAlive) {
            console.log("Battle Result: LOSS (Player team empty)");
            return 'LOSS';
        }
        if (!eAlive) {
            console.log("Battle Result: WIN (Enemy team empty)");
            return 'WIN';
        }
        return null;
    }

    private delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms / this.speed));
    }
}
