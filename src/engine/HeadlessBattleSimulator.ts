
import { Unit } from '../models/Unit';
import { EventBus } from './EventBus';
import { ALL_UNITS } from '../data/AllUnits';

export class HeadlessBattleSimulator {
    public playerTeam: Unit[];
    public enemyTeam: Unit[];
    public logs: string[] = [];
    public eventBus: EventBus;
    public turnCount: number = 0;
    public unitStates: Map<Unit, any> = new Map();
    private lightScreenActivated: Set<string> = new Set();
    private initialPlayerSet: Set<Unit> = new Set();
    private spiritombTriggered: Set<string> = new Set();
    private natuLogged: Set<string> = new Set();
    private playerSynergies = new Map<string, number>();
    private enemySynergies = new Map<string, number>();
    private participantPlayerUnits = new Set<Unit>();
    private participantEnemyUnits = new Set<Unit>();
    private originalPlayerTeam: (Unit | null)[] | null = null;
    private grassHealedTargets = new Set<Unit>();
    private playerWins: number = 0;
    private playerAttackCount: number = 0;
    private enemyAttackCount: number = 0;
    private psychicTriggered: Set<string> = new Set();
    private fireLogged: Set<string> = new Set();
    private grassLogged: Set<string> = new Set();
    private angryLoggedThisTurn: Set<string> = new Set();

    constructor(playerTeam: (Unit | null)[], enemyTeam: (Unit | null)[], originalPlayerTeam?: (Unit | null)[], _playerWins: number = 0) {
        this.playerWins = _playerWins;
        this.originalPlayerTeam = originalPlayerTeam || null;
        this.playerTeam = playerTeam.map(u => u ? this.cloneUnit(u) : null) as Unit[];
        this.enemyTeam = enemyTeam.map(u => {
            if (!u) return null;
            // Apply Difficulty Scaling to Enemy (Ensure it doesn't drop below current values if multiplier < 1)
            // Note: Multiplier is passed through App.tsx -> Simulator. 
            // Here we don't have the multiplier arg but we have the result of it? 
            // Wait, Headless usually clones what is ALREADY scaled if it's enemy? 
            // Actually Headless takes the same args. Let's check Headless constructor.
            return this.cloneUnit(u);
        }) as Unit[];
        this.eventBus = new EventBus();

        this.playerTeam.forEach(u => { if (u) this.initialPlayerSet.add(u); });
        this.playerTeam.forEach(u => { if (u) this.participantPlayerUnits.add(u); });
        this.enemyTeam.forEach(u => { if (u) this.participantEnemyUnits.add(u); });
        this.calculateCachedSynergies(Array.from(this.participantPlayerUnits), this.playerSynergies);
        this.calculateCachedSynergies(Array.from(this.participantEnemyUnits), this.enemySynergies);

        this.enemyTeam.forEach(u => { if (u) this.registerUnitAbilities(u); });
        this.playerTeam.forEach(u => { if (u) this.registerUnitAbilities(u); });
    }

    public async init() {
        this.spiritombTriggered.clear();
        this.lightScreenActivated.clear();
        this.natuLogged.clear();
        this.grassHealedTargets.clear();
        this.fireLogged.clear();
        this.grassLogged.clear();
        this.angryLoggedThisTurn.clear();

        await this.compactTeams();

        const allUnits: { unit: Unit, pos: number, isPlayer: boolean }[] = [];
        this.playerTeam.forEach((u, i) => { if (u) allUnits.push({ unit: u, pos: i, isPlayer: true }); });
        this.enemyTeam.forEach((u, i) => { if (u) allUnits.push({ unit: u, pos: i, isPlayer: false }); });

        const getRank = (unit: Unit) => {
            if (unit.family === 'spiritomb') return 6; // Rank 6: Silence
            if (unit.synergies.includes('Trick') || unit.family === 'mrmime') return 5; // Rank 5: Trick, Light Screen
            if (unit.synergies.includes('Snow') || unit.family === 'natu') return 4; // Rank 4: Snow, Natu family
            if (unit.family === 'ditto') return 3; // Rank 3: Transform
            if (unit.family === 'houndour' || ['raikou', 'entei', 'suicune'].includes(unit.family)) return 0; // Rank 0

            const hasStartupSynergy = unit.synergies.includes('Thief');
            if (hasStartupSynergy) return 2; // Phase 3: Utility/Synergy

            return 1; // Default
        };

        allUnits.sort((a, b) => {
            const rankA = getRank(a.unit);
            const rankB = getRank(b.unit);
            if (rankA !== rankB) return rankB - rankA;
            if (a.pos !== b.pos) return a.pos - b.pos;
            if (a.unit.stats.attack !== b.unit.stats.attack) return b.unit.stats.attack - a.unit.stats.attack;
            if (a.unit.stats.hp !== b.unit.stats.hp) return b.unit.stats.hp - a.unit.stats.hp;
            return Math.random() - 0.5;
        });

        const executePhaseQueue = async (rank: number) => {
            const phaseUnits = allUnits.filter(item => getRank(item.unit) === rank);
            for (const item of phaseUnits) {
                await this.executeUnitStartOfBattleAbility(item.unit);
            }
        };

        // --- PHASE-BASED EXECUTION (Parity with BattleSimulator) ---
        await executePhaseQueue(6);
        await executePhaseQueue(5);

        // Snow handled between 5 and 4
        const hasSnow = (this.playerSynergies.get('Snow') || 0) >= 2 || (this.enemySynergies.get('Snow') || 0) >= 2;
        if (hasSnow) {
            const alive = [...this.playerTeam, ...this.enemyTeam].filter((u: Unit) => u !== null && u.stats.hp > 0);
            for (const target of alive) {
                if (target.synergies.includes('Snow')) continue;
                let dmg = Math.ceil(target.stats.maxHp * 0.33);
                if (dmg >= target.stats.hp) dmg = Math.max(0, target.stats.hp - 1);
                if (dmg > 0) {
                    await this.dealDamage(null, target, dmg, true, true);
                }
            }
        }

        await executePhaseQueue(4);
        await executePhaseQueue(3);
        await executePhaseQueue(2);
        await executePhaseQueue(1);
        await executePhaseQueue(0);

        await this.applyBattleStartSynergies(this.playerTeam.filter(u => u !== null));
        await this.applyBattleStartSynergies(this.enemyTeam.filter(u => u !== null));

        await this.compactTeams();
        await this.eventBus.emit({ type: 'BATTLE_START', context: { simulator: this } });
    }

    private cloneUnit(unit: Unit): Unit {
        const template = ALL_UNITS[unit.templateId];
        if (!template) return unit;

        const clone = new Unit(template);
        clone.id = unit.id; // PRESERVE ID
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
        clone.battlesCount = unit.battlesCount;
        clone.hasNewPermanentBuff = unit.hasNewPermanentBuff;

        clone.capStats();
        this.unitStates.set(clone, {});
        return clone;
    }

    private async executeUnitStartOfBattleAbility(unit: Unit) {
        if (unit.stats.hp <= 0) return;
        const { myTeam, opTeam, side } = this.getTeams(unit);
        const s = this.unitStates.get(unit);
        if (s?.isSilenced) return;

        // Gastly Family: Atk buff at start
        if (unit.family === 'gastly') {
            if (unit.templateId === 'gengar') {
                myTeam.filter(u => u && u.stats.hp > 0).forEach(u => this.buffAttack(u!, 3, true));
            } else {
                const idx = myTeam.indexOf(unit);
                if (idx > 0) {
                    const front = myTeam[idx - 1];
                    if (front) this.buffAttack(front, unit.templateId === 'haunter' ? 3 : 1, true);
                }
            }
        }

        // Igglybuff Family: HP buff at start
        if (unit.family === 'igglybuff') {
            if (unit.templateId === 'wigglytuff') {
                myTeam.filter(u => u && u.stats.hp > 0).forEach(u => this.growUnit(u!, 3, 0, null, true));
            } else {
                const idx = myTeam.indexOf(unit);
                if (idx > 0) {
                    const front = myTeam[idx - 1];
                    const original = this.originalPlayerTeam?.find(o => o && o.id === front?.id);
                    if (front) this.growUnit(front, unit.templateId === 'jigglypuff' ? 3 : 1, 0, original, true);
                }
            }
        }

        // Natu/Xatu: Swap enemy first and last (even count = 2 swaps, odd count = 1 swap)
        if (unit.family === 'natu' && !this.natuLogged.has(side)) {
            this.natuLogged.add(side);
            const timesToExecute = 1;
            for (let t = 0; t < timesToExecute; t++) {
                const currentLiving = opTeam.filter(e => e && e.stats.hp > 0);
                if (currentLiving.length < 2) break;
                const first = currentLiving[0];
                const last = currentLiving[currentLiving.length - 1];
                const firstIdx = opTeam.indexOf(first);
                const lastIdx = opTeam.indexOf(last);
                if (firstIdx !== -1 && lastIdx !== -1 && firstIdx !== lastIdx) {
                    opTeam[firstIdx] = last;
                    opTeam[lastIdx] = first;
                    this.log(`${first.name} 和 ${last.name} 互換了位置！`);
                }
            }
        }

        // Pichu Family: Damage to weakest enemy at start
        if (unit.family === 'pichu') {
            const livingEnemies = opTeam.filter(e => e && e.stats.hp > 0);
            if (livingEnemies.length > 0) {
                let weakest = livingEnemies[0];
                for (const e of livingEnemies) {
                    if (e.stats.hp < weakest.stats.hp) weakest = e;
                }
                const dmg = unit.scalingValue || 1;
                // dealDamage in Headless is async if it calls notifySkill but here it's simplified
                await this.dealDamage(unit, weakest, dmg, true, true);
            }
        }

        // Mr. Mime: Light Screen
        if (unit.family === 'mrmime' && !this.lightScreenActivated.has(side)) {
            this.lightScreenActivated.add(side);

            const lsMap = (this as any).lightScreenCharges = (this as any).lightScreenCharges || new Map<string, number>();
            lsMap.set(side, 5);

            // Add the damage reduction listener
            this.eventBus.on('BEFORE_HURT', (e) => {
                if (unit.stats.hp <= 0 || !e.target) return; // Light Screen fades if Mime dies
                const { myTeam: victimTeam, side: victimSide } = this.getTeams(e.target);
                const sourceState = e.context.source ? this.unitStates.get(e.context.source) || {} : {};
                const isBypassing = (e.context.source && e.context.source.family === 'pinsir' && !sourceState.isSilenced) || (e.context.source && e.context.source.family === 'sableye' && sourceState.isAbsoluteKill);

                if (myTeam === victimTeam) {
                    const charges = lsMap.get(victimSide) || 0;
                    if (charges > 0) {
                        if (!isBypassing) {
                            e.context.amount = Math.ceil(e.context.amount / 2);
                        }
                        lsMap.set(victimSide, charges - 1);
                    }
                }
            });
        }

        if (unit.family === 'houndour') {
            const times = [0, 1, 2, 3][unit.level] || 1;
            for (let i = 0; i < times; i++) {
                const currentOpTeam = this.playerTeam.includes(unit) ? this.enemyTeam : this.playerTeam;
                const livingEnemies = currentOpTeam.filter(e => e && e.stats.hp > 0);
                if (livingEnemies.length > 0) {
                    let target = livingEnemies[0];
                    for (const e of livingEnemies) if (e.stats.hp < target.stats.hp) target = e;
                    await this.dealDamage(unit, target, 4, true, true);
                } else break;
            }
        }
        if (unit.family === 'spiritomb') {
            if (this.spiritombTriggered.has(side)) return;
            const livingEnemies = opTeam.filter(e => e && e.stats.hp > 0 && e.family !== 'spiritomb');
            if (livingEnemies.length > 0) {
                const targets = [...livingEnemies].sort(() => 0.5 - Math.random()).slice(0, 2);
                targets.forEach(t => {
                    const tState = this.unitStates.get(t) || {};
                    tState.isSilenced = true;
                    this.unitStates.set(t, tState);
                });
                this.spiritombTriggered.add(side);
            }
        }
        if (unit.family === 'totodile') {
            const idx = myTeam.indexOf(unit);
            if (idx > 0) {
                const front = myTeam[idx - 1];
                if (front && front.stats.hp > 0) {
                    const ratio = [0, 0.33, 0.5, 1.0][unit.level] || 0.33;
                    const buffAtk = Math.ceil(unit.stats.attack * ratio);
                    this.buffAttack(front, buffAtk, true);
                }
            }
        }
        if (unit.family === 'ditto') {
            const idx = myTeam.indexOf(unit);
            let target: Unit | null = null;
            if (idx > 0) {
                target = myTeam[idx - 1];
            }
            if (target && target.stats.hp > 0) {
                unit.family = target.family;
                unit.level = target.level; // Skill intensity follows target's star level

                // Directly copy the target's exact template (ignoring star level difference)
                const currentTemplate = ALL_UNITS[target.templateId];

                unit.templateId = currentTemplate.id;
                unit.synergies = [...currentTemplate.synergies];

                this.calculateCachedSynergies(Array.from(this.participantPlayerUnits), this.playerSynergies);
                this.calculateCachedSynergies(Array.from(this.participantEnemyUnits), this.enemySynergies);
                this.registerUnitAbilities(unit);
                const startAbilities = ['gastly', 'totodile', 'delibird', 'shuckle', 'kangaskhan', 'igglybuff', 'caterpie', 'pichu', 'houndour', 'spiritomb', 'raikou', 'entei', 'suicune'];
                if (startAbilities.includes(unit.family)) await this.executeUnitStartOfBattleAbility(unit);
            }
        }
        // Gulpin & Swalot: Swallow Front Ally (Removed)

        // Caterpie Family: Permanent Atk buff at start
        if (unit.family === 'caterpie') {
            const isStage3 = (unit.level >= 3);
            if (isStage3) {
                const living = myTeam.filter(u => u && u.stats.hp > 0);
                living.forEach(u => {
                    const original = this.originalPlayerTeam?.find(o => o && o.id === u.id);
                    this.growUnit(u, 0, 3, original, true);
                });
            } else {
                const idx = myTeam.indexOf(unit);
                if (idx < myTeam.length - 1) { // back ally
                    const back = myTeam[idx + 1];
                    if (back) {
                        const amount = unit.level === 2 ? 3 : 1;
                        this.log(`${unit.name} 發動了"鱗粉"`);
                        const original = this.originalPlayerTeam?.find(o => o && o.id === back.id);
                        this.growUnit(back, 0, amount, original, true);
                    }
                }
            }
        }

        // Cleffa Family: Permanent HP buff at start
        if (unit.family === 'cleffa') {
            const isStage3 = (unit.level >= 3);
            if (isStage3) {
                const living = myTeam.filter(u => u && u.stats.hp > 0);
                living.forEach(u => {
                    const original = this.originalPlayerTeam?.find(o => o && o.id === u.id);
                    this.growUnit(u, 3, 0, original, true);
                });
            } else {
                const idx = myTeam.indexOf(unit);
                if (idx < myTeam.length - 1) { // back ally
                    const back = myTeam[idx + 1];
                    if (back) {
                        const amount = unit.level === 2 ? 3 : 1;
                        this.log(`${unit.name} 發動了"友情防守"`);
                        const original = this.originalPlayerTeam?.find(o => o && o.id === back.id);
                        this.growUnit(back, amount, 0, original, true);
                    }
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

                if (allyTarget || enemyTarget) {
                    this.log(`${unit.name} 對 ${allyTarget?.name || '目標'} 和 ${enemyTarget?.name || '目標'} 使用了禮物`);
                }

                if (enemyTarget) {
                    await this.dealDamage(unit, enemyTarget, unit.abilityPower || 5, true, true);
                }
                if (allyTarget) {
                    this.heal(allyTarget, unit.abilityPower || 5);
                }
            }
        }

        // Shuckle: Contrary (Start)
        if (unit.family === 'shuckle') {
            const buffAtk = Math.floor(unit.stats.hp * 0.33);
            if (buffAtk > 0) {
                unit.stats.attack += buffAtk;
                // No change needed for shuckle as '唱反調' is correct or at least not requested to change
                unit.capStats();
                this.log(`${unit.name}發動了唱反調。`);
            }
        }

        // Kangaskhan: Parental Bond (Start)
        if (unit.family === 'kangaskhan') {
            const hpBuff = Math.floor(unit.stats.attack * 0.33);
            if (hpBuff > 0) {
                const original = this.playerTeam.includes(unit) ? (this.originalPlayerTeam as any)?.find((o: Unit | null) => o && o.id === unit.id) : null;
                this.growUnit(unit, hpBuff, 0, original, true);
                this.log(`${unit.name}發動了親子愛！`);
            }
        }

        // --- Legendary Beasts ---

        // Raikou: all enemies 5-15 damage
        if (unit.family === 'raikou') {
            const enemies = opTeam.filter(u => u && u.stats.hp > 0);
            for (const enemy of enemies) {
                const dmg = 5 + Math.floor(Math.random() * 11);
                await this.dealDamage(unit, enemy, dmg, true, true);
            }
        }

        // Entei: Strongest enemy 50 damage
        if (unit.family === 'entei') {
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
                await this.dealDamage(unit, strongest, 50, true, true);
            }
        }

        // Suicune: weakest enemy 50 damage
        if (unit.family === 'suicune') {
            const enemies = opTeam.filter(u => u && u.stats.hp > 0);
            if (enemies.length > 0) {
                const weakest = [...enemies].sort((a, b) => a.stats.hp - b.stats.hp)[0];
                await this.dealDamage(unit, weakest, 50, true, true);
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
                    const myHp = unit.stats.hp;
                    const myMaxHp = unit.stats.maxHp;
                    const opHp = target.stats.hp;
                    const opMaxHp = target.stats.maxHp;
                    unit.stats.hp = opHp;
                    unit.stats.maxHp = opMaxHp;
                    target.stats.hp = myHp;
                    target.stats.maxHp = myMaxHp;
                    const myState = this.unitStates.get(unit) || {};
                    myState.hpSwapped = true;
                    this.unitStates.set(unit, myState);
                    const opState = this.unitStates.get(target) || {};
                    opState.hpSwapped = true;
                    this.unitStates.set(target, opState);
                    unit.capStats();
                    target.capStats();
                }
            }
        }

        // Thief Synergy: Steal Atk
        if (unit.synergies.includes('Thief')) {
            const count = this.getSynergyCountForUnit(unit, 'Thief');
            if (count >= 2) {
                const enemies = opTeam.filter(u => u && u.stats.hp > 0);
                if (enemies.length > 0) {
                    let strongest = enemies[0];
                    let maxAtk = strongest.stats.attack;
                    for (const e of enemies) {
                        if (e.stats.attack > maxAtk) {
                            strongest = e;
                            maxAtk = e.stats.attack;
                        }
                    }
                    const factor = count >= 4 ? 0.5 : 0.33;
                    const stealAmt = Math.floor(strongest.stats.attack * factor);
                    if (stealAmt > 0) {
                        strongest.stats.attack -= stealAmt;
                        this.growUnit(unit, 0, stealAmt, null, true);
                    }
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
        map.clear();
        const familyMap = new Map<string, Set<string>>();
        const eeveeFormsPerSynergy = new Map<string, Set<string>>();
        // Track max level of eevee evolution forms per synergy (for +2 counting)
        const eeveeMaxLevelPerSynergy = new Map<string, number>();

        team.forEach(u => {
            u.synergies.forEach(syn => {
                if (!familyMap.has(syn)) familyMap.set(syn, new Set());
                familyMap.get(syn)!.add(u.family);

                if (u.family === 'eevee' && u.templateId !== 'eevee') {
                    if (!eeveeFormsPerSynergy.has(syn)) eeveeFormsPerSynergy.set(syn, new Set());
                    eeveeFormsPerSynergy.get(syn)!.add(u.templateId);
                    // Track the highest level eevee evo for this synergy
                    const prevLevel = eeveeMaxLevelPerSynergy.get(syn) || 0;
                    if (u.level > prevLevel) eeveeMaxLevelPerSynergy.set(syn, u.level);
                }
            });
        });

        familyMap.forEach((set, syn) => {
            let count = set.size;
            if (eeveeFormsPerSynergy.has(syn)) {
                if (syn === 'BatonPass') {
                    const uniqueEeveeForms = eeveeFormsPerSynergy.get(syn)!;
                    count += (uniqueEeveeForms.size - 1);
                } else {
                    // 1★/2★ eevee evo = +1, 3★ eevee evo = +2
                    const maxLevel = eeveeMaxLevelPerSynergy.get(syn) || 1;
                    count += (maxLevel >= 3 ? 2 : 1);
                }
            }
            map.set(syn, count);
        });
    }

    private async applyBattleStartSynergies(team: Unit[]) {
        if (team.length === 0) return;
        if (this.getSynergyCountForUnit(team[0], 'Triplets') >= 3) {
            team.filter(u => u && u.synergies.includes('Triplets')).forEach(u => {
                const isAtk = Math.random() < 0.5;
                this.growUnit(u, isAtk ? 0 : 3, isAtk ? 3 : 0, null, true);
            });
        }
        if (this.getSynergyCountForUnit(team[0], 'Starter') >= 3) {
            const count = this.getSynergyCountForUnit(team[0], 'Starter');
            const buff = count >= 5 ? 3 : 1;
            team.filter(u => u && u.synergies.includes('Starter')).forEach(u => {
                const original = this.originalPlayerTeam?.find(o => o && o.id === u.id);
                this.growUnit(u, buff, buff, original, true);
            });
        }

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
                    this.growUnit(u, 10, 10, null, true);
                }
            });
        }

        // Charm (撒嬌)
        const charmCount = mySynergies.get('Charm') || 0;
        if (charmCount >= 2) {
            let targetCount = 1;
            if (charmCount >= 5) targetCount = 4;
            else if (charmCount >= 3) targetCount = 2;

            const livingEnemies = opTeam.filter(u => u && u.stats.hp > 0);
            if (livingEnemies.length > 0) {
                const shuffled = [...livingEnemies].sort(() => 0.5 - Math.random());
                shuffled.slice(0, targetCount).forEach(target => {
                    const reducedAmt = Math.floor(target.stats.attack * 0.33);
                    if (reducedAmt > 0) {
                        target.stats.attack -= reducedAmt;
                        // this.log(`${target.name} 因撒嬌的眼神，降低了攻擊。`);
                    }
                });
            }
        }

        // Charge (充電): All Charge units +random Atk (0-4 / 2-6 / 4-10 / 8-15)
        const chargeCount = mySynergies.get('Charge') || 0;
        if (chargeCount >= 2) {
            let minBoost = 0;
            let maxBoost = 4;
            if (chargeCount >= 5) { minBoost = 8; maxBoost = 15; }
            else if (chargeCount >= 3) { minBoost = 2; maxBoost = 6; }

            team.filter(u => u && u.synergies.includes('Charge')).forEach(u => {
                const boost = minBoost + Math.floor(Math.random() * (maxBoost - minBoost + 1));
                if (boost > 0) u.stats.attack += boost;
            });
        }

        const hasSnow = (this.playerSynergies.get('Snow') || 0) >= 2 || (this.enemySynergies.get('Snow') || 0) >= 2;
        if (hasSnow) {
            const allUnits = [...this.playerTeam, ...this.enemyTeam].filter(u => u !== null && u.stats.hp > 0);
            for (const target of allUnits) {
                if (target.synergies.includes('Snow')) continue;
                let dmg = Math.ceil(target.stats.maxHp * 0.33);
                if (dmg >= target.stats.hp) dmg = Math.max(0, target.stats.hp - 1);
                if (dmg > 0) await this.dealDamage(null, target, dmg, true, true); // Silent
            }
        }
    }

    private growUnit(unit: Unit, hp: number, atk: number, permanentTarget?: Unit | null, _silent: boolean = false) {
        if (unit.family === 'sneasel' && atk < 0) atk = 0;
        const hpToMax = hp > 0 ? Math.min(hp, 50 - unit.stats.maxHp) : hp;
        const atkToAtk = atk > 0 ? Math.min(atk, 50 - unit.stats.attack) : atk;
        if (hpToMax === 0 && atkToAtk === 0 && (hp <= 0 || unit.stats.hp >= unit.stats.maxHp)) return;
        unit.addGrowth(hp, atk);
        if (permanentTarget) permanentTarget.addGrowth(hp, atk);

    }

    private buffAttack(unit: Unit, amount: number, _silent: boolean = false) {
        if (unit.family === 'sneasel' && amount < 0) return; // Protection
        unit.addBuff(amount);
    }

    private getTeams(unit: Unit) {
        const inPlayer = this.playerTeam.includes(unit);
        const inEnemy = this.enemyTeam.includes(unit);
        let isPlayer: boolean;
        if (inPlayer) isPlayer = true;
        else if (inEnemy) isPlayer = false;
        else isPlayer = this.initialPlayerSet.has(unit);
        return {
            myTeam: isPlayer ? this.playerTeam : this.enemyTeam,
            opTeam: isPlayer ? this.enemyTeam : this.playerTeam,
            side: isPlayer ? 'player' : 'enemy'
        };
    }

    private registerUnitAbilities(unit: Unit) {
        if (unit.synergies.includes('Fire')) {
            this.eventBus.on('BEFORE_ATTACK', (e) => {
                if (e.source === unit) {
                    const count = this.getSynergyCountForUnit(unit, 'Fire');
                    const buff = count >= 5 ? 10 : (count >= 3 ? 4 : (count >= 2 ? 2 : 0));
                    if (buff > 0 && unit.stats.hp > 1) {
                        unit.stats.hp -= 1;
                        this.buffAttack(unit, buff, true);
                        if (!this.fireLogged.has(unit.id)) {
                            this.log(`${unit.name} 燃盡全身的火焰！`);
                            this.fireLogged.add(unit.id);
                        }
                    }
                }
            });
        }

        if (unit.synergies.includes('Grass')) {
            this.eventBus.on('AFTER_ATTACK', async (e) => {
                if (unit.stats.hp <= 0) return;
                const { myTeam } = this.getTeams(unit);
                if (e.source === unit && e.target && myTeam.includes(unit)) {
                    if (this.grassHealedTargets.has(e.target)) return;

                    const count = this.getSynergyCountForUnit(unit, 'Grass');
                    const healAmount = count >= 5 ? 12 : (count >= 3 ? 5 : (count >= 2 ? 2 : 0));
                    if (healAmount > 0) {
                        this.heal(unit, healAmount);
                        this.grassHealedTargets.add(e.target);
                        if (!this.grassLogged.has(unit.id)) {
                            this.log(`${unit.name} 吸取了對手的生命`);
                            this.grassLogged.add(unit.id);
                        }
                    }
                }
            });
        }
        if (unit.synergies.includes('Water')) {
            this.eventBus.on('BEFORE_ATTACK', (e) => {
                if (unit.stats.hp <= 0) return;
                if (e.source === unit && e.target && e.target.stats.hp > 0 && e.target.family !== 'sneasel') {
                    const count = this.getSynergyCountForUnit(unit, 'Water');
                    const debuff = count >= 5 ? 10 : (count >= 3 ? 3 : (count >= 2 ? 1 : 0));
                    if (debuff > 0 && e.target.stats.attack > 1) {
                        e.target.stats.attack = Math.max(1, e.target.stats.attack - debuff);
                    }
                }
            });
        }
        if (unit.family === 'mudkip') {
            this.eventBus.on('BEFORE_ATTACK', async (e) => {
                const s = this.unitStates.get(unit);
                if (s?.isSilenced || unit.stats.hp <= 0) return;
                const { myTeam } = this.getTeams(unit);
                if (e.source && e.source !== unit && myTeam.includes(e.source)) {
                    const buff = [0, 1, 2, 5][unit.level] || 1;
                    const isAtk = Math.random() < 0.5;
                    this.growUnit(unit, isAtk ? 0 : buff, isAtk ? buff : 0);
                }
            });
        }
        if (unit.family === 'torchic') {
            this.eventBus.on('AFTER_ATTACK', async (e) => {
                const s = this.unitStates.get(unit);
                if (unit.stats.hp <= 0 || s?.isSilenced) return;
                const { myTeam } = this.getTeams(unit);
                if (e.source && e.source !== unit && myTeam.includes(e.source) && e.target) {
                    const dmg = [0, 3, 5, 10][unit.level] || 3;
                    await this.dealDamage(unit, e.target, dmg);
                }
            });
        }
        // Fire logic moved to top of registerUnitAbilities
        // Cyndaquil rework: Team AOE before attack
        if (unit.family === 'cyndaquil') {
            this.eventBus.on('BEFORE_ATTACK', async (e) => {
                const s = this.unitStates.get(unit);
                if (s?.isSilenced) return;
                if (e.source === unit) {
                    const dmg = [0, 1, 2, 5][unit.level] || 1;
                    const allUnits = [...this.playerTeam, ...this.enemyTeam].filter(u => u && u !== unit && u.stats.hp > 0);
                    for (const target of allUnits) {
                        await this.dealDamage(unit, target, dmg, true, true); // Silent
                    }
                }
            });
        }
        if (unit.synergies.includes('Angry')) {
            this.eventBus.on('ON_HURT', (e) => {
                if (e.target === unit && this.getSynergyCountForUnit(unit, 'Angry') >= 2) {
                    const count = this.getSynergyCountForUnit(unit, 'Angry');
                    const buff = count >= 4 ? 10 : (count >= 2 ? 2 : 0);
                    const { myTeam, side } = this.getTeams(unit);
                    myTeam.forEach(u => {
                        if (u && u.stats.hp > 0) this.buffAttack(u, buff, true);
                    });
                    if (!this.angryLoggedThisTurn.has(side)) {
                        const sideName = side === 'player' ? '我方' : '敵方';
                        this.log(`${unit.name} 因憤怒的力量提高了 ${sideName}隊伍的 攻擊！`);
                        this.angryLoggedThisTurn.add(side);
                    }
                }
            });
        }
        if (unit.synergies.includes('Cave')) {
            this.eventBus.on('ON_MOVE', async (e) => {
                if (e.source === unit) {
                    if (this.getSynergyCountForUnit(unit, 'Cave') >= 2) {
                        const original = this.originalPlayerTeam?.find(u => u && u.id === unit.id);
                        const isAtk = Math.random() < 0.5;
                        this.growUnit(unit, isAtk ? 0 : 1, isAtk ? 1 : 0, original);
                    }
                }
            });
        }
        if (unit.synergies.includes('SwordDance')) {
            this.eventBus.on('ON_MOVE', async (e) => {
                if (e.source === unit) {
                    const count = this.getSynergyCountForUnit(unit, 'SwordDance');
                    const buff = count >= 2 ? 2 : 0;
                    if (buff > 0) {
                        const original = this.originalPlayerTeam?.find(u => u && u.id === unit.id);
                        this.growUnit(unit, 0, buff, original, true);
                    }
                }
            });
        }
        if (unit.synergies.includes('Roost')) {
            this.eventBus.on('ON_MOVE', async (e) => {
                if (e.source === unit) {
                    const count = this.getSynergyCountForUnit(unit, 'Roost');
                    const buff = count >= 2 ? 2 : 0;
                    if (buff > 0) {
                        const original = this.originalPlayerTeam?.find(u => u && u.id === unit.id);
                        this.growUnit(unit, buff, 0, original, true);
                    }
                }
            });
        }
        // Triplets
        if (unit.synergies.includes('Triplets') && this.getSynergyCountForUnit(unit, 'Triplets') >= 3) {
            const isAtk = Math.random() < 0.5;
            const original = this.originalPlayerTeam?.find(o => o && o.id === unit.id);
            this.growUnit(unit, isAtk ? 0 : 3, isAtk ? 3 : 0, original, true);
        }

        // BatonPass logic moved to handleDeath

        if (unit.family === 'heracross') {
            this.eventBus.on('ON_HURT', (e) => {
                if (e.target === unit && !this.unitStates.get(unit)?.isSilenced) {
                    const state = this.unitStates.get(unit) || {};
                    if (!state.heracrossTriggered) {
                        state.heracrossTriggered = true;
                        this.buffAttack(unit, unit.stats.attack);
                        this.unitStates.set(unit, state);
                    }
                }
            });
        }
        if (unit.family === 'slowpoke') {
            this.eventBus.on('ON_HURT', (e) => {
                const s = this.unitStates.get(unit) || {};
                if (e.target === unit && !s.isSilenced) {
                    if (!s.slowpokeHealUsed && unit.stats.hp > 0 && unit.stats.hp < unit.stats.maxHp * 0.5) {
                        this.heal(unit, [0, 6, 12, 50][unit.level] || 6);
                        s.slowpokeHealUsed = true;
                        this.unitStates.set(unit, s);
                    }
                }
            });
        }
        if (unit.family === 'onix') {
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
                        await this.eventBus.emit({ type: 'ON_MOVE', source: unit, context: {} });
                    }
                }
            });
            this.eventBus.on('ON_HURT', async (e) => {
                if (e.target === unit && e.context.source && e.context.source.stats.hp > 0 && !this.unitStates.get(unit)?.isSilenced) {
                    if (!e.context.isSkillDamage && e.context.amount > 0) {
                        const reflectDmg = Math.ceil(e.context.amount * 1.0); // 100% reflect
                        await this.dealDamage(unit, e.context.source, reflectDmg, true);
                    }
                }
            });
        }
        if (unit.family === 'fuecoco') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                const s = this.unitStates.get(unit);
                const { myTeam } = this.getTeams(unit);
                if (unit.stats.hp <= 0 || s?.isSilenced || !myTeam.includes(unit)) return;
                if (e.context.killer && myTeam.includes(e.context.killer)) {
                    const hpBuff = 3;
                    const targetCount = unit.level;
                    const livingEligible = myTeam.filter(u => u && u.stats.hp > 0 && (u.stats.maxHp < 50 || u.stats.hp < u.stats.maxHp));
                    if (livingEligible.length > 0) {
                        const shuffled = [...livingEligible].sort(() => 0.5 - Math.random());
                        const targets = shuffled.slice(0, targetCount);
                        targets.forEach(target => {
                            const original = this.originalPlayerTeam?.find(o => o && o.id === target.id);
                            this.growUnit(target, hpBuff, 0, original, true);
                        });
                    }
                }
            });
        }
        if (unit.family === 'quaxly') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                const { myTeam } = this.getTeams(unit);
                if (unit.stats.hp <= 0 || this.unitStates.get(unit)?.isSilenced || !myTeam.includes(unit)) return;
                if (e.context.killer && myTeam.includes(e.context.killer)) {
                    const atkBuff = 3;
                    const targetCount = unit.level;
                    const livingEligible = myTeam.filter(u => u && u.stats.hp > 0 && u.stats.attack < 50);
                    if (livingEligible.length > 0) {
                        const shuffled = [...livingEligible].sort(() => 0.5 - Math.random());
                        const targets = shuffled.slice(0, targetCount);
                        targets.forEach(target => {
                            const original = this.originalPlayerTeam?.find(o => o && o.id === target.id);
                            this.growUnit(target, 0, atkBuff, original, true);
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
                            const original = this.originalPlayerTeam?.find(o => o && o.id === target.id);
                            this.growUnit(target, hpBuff, atkBuff, original, true);
                        });
                    }
                }
            });
        }

        // Bellsprout Family: Ally Summon -> Random Ally Perm Atk/HP
        if (unit.family === 'bellsprout') {
            this.eventBus.on('ON_FRIEND_SUMMONED', async (e) => {
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
                            const original = this.originalPlayerTeam?.find(o => o && o.id === target.id);
                            this.growUnit(target, buff, buff, original, true);
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
                            const original = this.originalPlayerTeam?.find(o => o && o.id === target.id);
                            this.growUnit(target, hpBuff, atkBuff, original, true);
                        });
                    }
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
                    this.growUnit(unit, 0, selfAtk, original, true);

                    const aliveFriends = myTeam.filter((u: Unit) => u && u.stats.hp > 0);
                    if (aliveFriends.length > 0) {
                        const randomFriend = aliveFriends[Math.floor(Math.random() * aliveFriends.length)];
                        this.log(`${unit.name} 對 ${randomFriend.name} 發動了超幸運！`);
                        // Friend buff is temporary (+5 Attack for this battle)
                        this.buffAttack(randomFriend, 5, true);
                    }
                }
            });
        }
        if (unit.family === 'sprigatito') {
            this.eventBus.on('ON_FRIEND_SUMMONED', async (e) => {
                const { myTeam } = this.getTeams(unit);
                if (unit.stats.hp <= 0 || this.unitStates.get(unit)?.isSilenced || !myTeam.includes(unit)) return;
                if (e.source && myTeam.includes(e.source) && e.source !== unit) {
                    const buff = 1;
                    const targetCount = unit.level;
                    const livingEligible = myTeam.filter(u => u && u.stats.hp > 0 && (u.stats.maxHp < 50 || u.stats.attack < 50 || u.stats.hp < u.stats.maxHp));
                    if (livingEligible.length > 0) {
                        const shuffled = [...livingEligible].sort(() => 0.5 - Math.random());
                        const targets = shuffled.slice(0, targetCount);
                        targets.forEach(target => {
                            const original = this.originalPlayerTeam?.find(o => o && o.id === target.id);
                            this.growUnit(target, buff, buff, original, true);
                        });
                    }
                }
            });
        }
        if (unit.family === 'bulbasaur' && unit.templateId !== 'sprout') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                const s = this.unitStates.get(unit);
                if (s?.isSilenced || e.source !== unit) return;
                const { myTeam: initialTeam } = this.getTeams(unit);
                let deathIdx = initialTeam.indexOf(unit);
                if (deathIdx === -1) {
                    deathIdx = initialTeam.findIndex(u => !u || u.stats.hp <= 0);
                    if (deathIdx === -1) deathIdx = 0;
                }

                if (unit.templateId === 'venusaur') {
                    for (let i = 0; i < 2; i++) {
                        const { myTeam: currentTeam } = this.getTeams(unit);
                        await this.spawnUnit(currentTeam, deathIdx + i, 'ivysaur', 1, 4, 4, true);
                    }
                } else if (unit.templateId === 'ivysaur') {
                    const { myTeam: currentTeam } = this.getTeams(unit);
                    await this.spawnUnit(currentTeam, deathIdx, 'bulbasaur', 1, 2, 2, true);
                } else {
                    // Bulbasaur (1 star) -> Spawns 1 seed (Matches description)
                    const count = 1;
                    for (let i = 0; i < count; i++) {
                        const { myTeam: currentTeam } = this.getTeams(unit);
                        await this.spawnUnit(currentTeam, deathIdx + i, 'sprout', 1, 1, 1, true);
                    }
                }
                await this.compactTeams();
            });
        }
        if (unit.family === 'rattata' && unit.templateId !== 'mouse') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                const s = this.unitStates.get(unit);
                if (s?.isSilenced || e.source !== unit) return;
                const { myTeam: initialTeam } = this.getTeams(unit);
                let deathIdx = initialTeam.indexOf(unit);
                if (deathIdx === -1) {
                    deathIdx = initialTeam.findIndex(u => !u || u.stats.hp <= 0);
                    if (deathIdx === -1) deathIdx = 0;
                }
                const count = unit.level >= 3 ? 5 : 2;
                const stats = [0, 1, 2, 5][unit.level] || 1;
                for (let i = 0; i < count; i++) {
                    const { myTeam: currentTeam } = this.getTeams(unit);
                    await this.spawnUnit(currentTeam, deathIdx + i, 'mouse', 1, stats, stats, true);
                }
                await this.compactTeams();
            });
        }

        if (unit.family === 'geodude' && unit.templateId !== 'stone') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                const s = this.unitStates.get(unit);
                if (s?.isSilenced || e.source !== unit) return;
                const { myTeam: initialTeam } = this.getTeams(unit);
                let deathIdx = initialTeam.indexOf(unit);
                if (deathIdx === -1) {
                    deathIdx = initialTeam.findIndex(u => !u || u.stats.hp <= 0);
                    if (deathIdx === -1) deathIdx = 0;
                }
                const count = unit.level >= 3 ? 5 : 2;
                const stats = [0, 1, 2, 5][unit.level] || 1;
                for (let i = 0; i < count; i++) {
                    const { myTeam: currentTeam } = this.getTeams(unit);
                    await this.spawnUnit(currentTeam, deathIdx + i, 'stone', 1, stats, stats, true);
                }
                await this.compactTeams();
            });
        }
        if (unit.family === 'shuppet') {
            this.eventBus.on('ON_HURT', async (e) => {
                const s = this.unitStates.get(unit);
                if (s?.isSilenced) return;
                if (e.target === unit) {
                    const { opTeam } = this.getTeams(unit);
                    const living = opTeam.filter(u => u && u.stats.hp > 0);
                    if (living.length > 0) {
                        const target = living[Math.floor(Math.random() * living.length)];
                        const dmg = [0, 4, 10, 99][unit.level] || 4;
                        await this.dealDamage(unit, target, dmg, true);
                    }
                }
            });
        }
        if (unit.family === 'drifloon') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                const s = this.unitStates.get(unit);
                if (s?.isSilenced || e.source !== unit) return;
                const { myTeam, opTeam } = this.getTeams(unit);
                const dmg = [0, 2, 5, 15][unit.level] || 2;
                // Affect EVERYONE else (myTeam and opTeam)
                const allTargets = [...myTeam, ...opTeam].filter(u => u && u !== unit && u.stats.hp > 0);
                for (const target of allTargets) {
                    await this.dealDamage(unit, target!, dmg, true);
                }
            });
        }
        if (unit.family === 'mimikyu') {
            this.eventBus.on('BEFORE_HURT', (e) => {
                const s = this.unitStates.get(unit) || {};
                if (s.isSilenced) return;
                if (e.target === unit) {
                    const source = e.context.source;
                    const sState = source ? this.unitStates.get(source) || {} : {};
                    const isBypassing = (source && source.family === 'pinsir' && !sState.isSilenced) ||
                        (source && source.family === 'sableye' && sState.isAbsoluteKill);
                    if (isBypassing) return;
                    if ((s.mimikyuGuardsUsed || 0) < 1) {
                        s.mimikyuGuardsUsed = 1;
                        this.unitStates.set(unit, s);
                        e.context.amount = 0;
                    }
                }
            });
        }
        if (unit.family === 'chikorita') {
            this.eventBus.on('ON_FRIEND_SUMMONED', (e) => {
                const s = this.unitStates.get(unit);
                if (unit.stats.hp <= 0 || s?.isSilenced) return;
                const { myTeam } = this.getTeams(unit);
                if (e.source && myTeam.includes(e.source) && e.source !== unit) {
                    const buff = [0, 2, 5, 10][unit.level] || 2;
                    this.growUnit(e.source, 0, buff);
                }
            });
        }
        if (unit.family === 'treecko') {
            this.eventBus.on('ON_FRIEND_SUMMONED', async (e) => {
                const s = this.unitStates.get(unit);
                if (unit.stats.hp <= 0 || s?.isSilenced) return;
                const { myTeam, opTeam } = this.getTeams(unit);
                if (e.source && myTeam.includes(e.source) && e.source !== unit) {
                    const dmg = [0, 2, 6, 12][unit.level] || 2;
                    const living = opTeam.filter(u => u && u.stats.hp > 0);
                    if (living.length > 0) await this.dealDamage(unit, living[0], dmg, true);
                }
            });
        }

        // Ralts Family: Attack backline
        if (unit.family === 'ralts') {
            this.eventBus.on('BEFORE_ATTACK', async (e) => {
                if (unit.stats.hp <= 0 || this.unitStates.get(unit)?.isSilenced) return;
                if (e.source === unit) {
                    const { opTeam } = this.getTeams(unit);
                    const livingEnemies = opTeam.filter(u => u && u.stats.hp > 0);
                    if (livingEnemies.length > 0) {
                        const targetCount = unit.level >= 3 ? 2 : 1;
                        const targets = livingEnemies.slice(-targetCount);
                        for (const target of targets) {
                            await this.dealDamage(unit, target, unit.stats.attack, true);
                        }
                    }
                }
            });
        }
        if (unit.family === 'heracross') {
            this.eventBus.on('ON_HURT', (e) => {
                if (e.target === unit && !this.unitStates.get(unit)?.isSilenced) {
                    const state = this.unitStates.get(unit) || {};
                    if (!state.heracrossTriggered) {
                        state.heracrossTriggered = true;
                        this.buffAttack(unit, unit.stats.attack);
                        this.unitStates.set(unit, state);
                    }
                }
            });
        }
        if (unit.family === 'farfetchd') {
            this.eventBus.on('BEFORE_ATTACK', (e) => {
                if (e.source === unit && !this.unitStates.get(unit)?.isSilenced) {
                    const state = this.unitStates.get(unit) || {};
                    if (!state.farfetchdUsed) {
                        state.farfetchdUsed = true;
                        state.isLethalStrike = true;
                        this.unitStates.set(unit, state);
                    }
                }
            });
        }

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
                    if (dmg > 0) await this.dealDamage(unit, target, dmg, true);
                }
            });
        }

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
                    await this.dealDamage(unit, e.source, 5, true);
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
                if (unit.stats.hp <= 0 || this.unitStates.get(unit)?.isSilenced) return;
                const { myTeam } = this.getTeams(unit);
                const { killer } = e.context;
                if (killer && myTeam.includes(killer)) {
                    const targetCount = unit.level; // 1, 2, or 3
                    const aliveFriends = myTeam.filter((u: Unit) => u && u.stats.hp > 0);
                    if (aliveFriends.length > 0) {
                        const shuffled = [...aliveFriends].sort(() => 0.5 - Math.random());
                        const targets = shuffled.slice(0, targetCount);
                        this.log(`${unit.name} 使用了充電光束！`);
                        for (const target of targets) {
                            const original = this.playerTeam.includes(target) ? (this.originalPlayerTeam as any)?.find((o: Unit | null) => o && o.id === target.id) : null;
                            this.growUnit(target, 1, 1, original, true);
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
                    const original = this.playerTeam.includes(unit) ? (this.originalPlayerTeam as any)?.find((o: Unit | null) => o && o.id === unit.id) : null;
                    this.growUnit(unit, selfGrow, 0, original || null, true);

                    const aliveFriends = myTeam.filter((u: Unit) => u && u.stats.hp > 0);
                    if (aliveFriends.length > 0) {
                        const randomFriend = aliveFriends[Math.floor(Math.random() * aliveFriends.length)];
                        this.log(`${unit.name} 對 ${randomFriend.name} 發動了生蛋！`);
                        const fo = null; // Ally buff is temporary
                        this.growUnit(randomFriend, 5, 0, fo, true);
                    }
                }
            });
        }
        // Larvitar Family: Single targets damage before own attack
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
                        const target = livingEnemies[1];
                        await this.dealDamage(unit, target, dmg, true, true);
                    }
                }
            });
        }

        // Charmander Family: Rear damage before own attack (Scaling)
        if (unit.family === 'charmander') {
            this.eventBus.on('BEFORE_ATTACK', async (e) => {
                const s = this.unitStates.get(unit);
                if (e.source === unit && unit.stats.hp > 0 && !s?.isSilenced) {
                    const dmg = unit.scalingValue || 3;
                    const { opTeam } = this.getTeams(unit);
                    const livingEnemies = opTeam.filter(u => u && u.stats.hp > 0);

                    if (livingEnemies.length > 1) {
                        const target = livingEnemies[1]; // Single target at 2nd position
                        await this.dealDamage(unit, target, dmg, true, true);
                    }
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
            this.unitStates.set(attacker, state); // Update state after consuming
            this.log(`${attacker.name} 處於混亂狀態不受控制`);
            return;
        }

        // Notify that an attack is starting
        await this.eventBus.emit({ type: 'ON_ATTACK', source: attacker, target: defender, context: {} });

        await this.eventBus.emit({ type: 'BEFORE_ATTACK', source: attacker, target: defender, context: {} });
        const dmg = attacker.stats.attack;
        const promises = [this.dealDamage(attacker, defender, dmg, false)];
        const s = this.unitStates.get(attacker);

        // Outrage: 25% chance of extra random target hit
        if (state?.isExtraAttack) {
            state.isExtraAttack = false;
            this.unitStates.set(attacker, state);
            const { opTeam } = this.getTeams(attacker);
            const liveEnemies = opTeam.filter(u => u && u.stats.hp > 0);
            if (liveEnemies.length > 0) {
                const target = liveEnemies[Math.floor(Math.random() * liveEnemies.length)];
                this.log(`${attacker.name} 對 ${target.name} 發動了逆鱗`);
                promises.push(this.dealDamage(attacker, target, dmg));
            }
        }
        if (attacker.family === 'doduo' && !s?.isSilenced) {
            if (Math.random() < ([0, 0.25, 0.33, 0.5][attacker.level] || 0.25)) {
                const { opTeam } = this.getTeams(attacker);
                const living = opTeam.filter(u => u && u.stats.hp > 0);
                if (living.length > 0) promises.push(this.dealDamage(attacker, living[Math.floor(Math.random() * living.length)], dmg));
            }
        }
        if (attacker.family === 'sneasel' && !s?.isSilenced) {
            if (Math.random() < 0.5) {
                const { opTeam } = this.getTeams(attacker);
                const liveEnemies = opTeam.filter(u => u && u.stats.hp > 0);
                if (liveEnemies.length > 0) {
                    const targetCount = attacker.level >= 3 ? 2 : 1;
                    let potentialTargets = liveEnemies.filter(u => u !== defender);
                    if (potentialTargets.length === 0) potentialTargets = [defender];

                    // Shuffle and pick
                    const finalTargets = [...potentialTargets].sort(() => 0.5 - Math.random()).slice(0, targetCount);
                    for (const r of finalTargets) {
                        promises.push(this.dealDamage(attacker, r, dmg));
                    }
                }
            }
        }



        if (attacker.family === 'ralts' && !s?.isSilenced) {
            const { opTeam } = this.getTeams(attacker);
            const liveEnemies = opTeam.filter(u => u && u.stats.hp > 0);
            if (liveEnemies.length > 0) {
                const target = liveEnemies[liveEnemies.length - 1];
                const multiplier = attacker.level >= 3 ? 1.0 : (attacker.level === 2 ? 0.5 : 0.33);
                const bonusDmg = Math.ceil(attacker.stats.attack * multiplier);
                promises.push(this.dealDamage(attacker, target, bonusDmg, true));
            }
        }

        // Bonsly family: Rock Slide targets the last enemy
        if (attacker.family === 'bonsly' && !s?.isSilenced) {
            const { opTeam } = this.getTeams(attacker);
            const liveEnemies = opTeam.filter(u => u && u.stats.hp > 0);
            if (liveEnemies.length > 0) {
                const target = liveEnemies[liveEnemies.length - 1]; // Last enemy
                const dmg = [0, 1, 2, 5][attacker.level] || 1;
                promises.push(this.dealDamage(attacker, target, dmg, true));
            }
        }

        await Promise.all(promises);
        if (attacker.family === 'snover' && !s?.isSilenced) {
            const original = this.originalPlayerTeam?.find(u => u && u.id === attacker.id);
            this.growUnit(attacker, 0, 1, original);
            if (defender.stats.hp > 0) {
                const { myTeam: defTeam } = this.getTeams(defender);
                const idx = defTeam.indexOf(defender);
                if (idx !== -1 && idx < defTeam.length - 1 && defTeam[idx + 1]) {
                    const behind = defTeam[idx + 1];
                    defTeam[idx] = behind!;
                    defTeam[idx + 1] = defender;
                    await this.compactTeams();
                    await Promise.all([
                        this.eventBus.emit({ type: 'ON_MOVE', source: defender, context: {} }),
                        this.eventBus.emit({ type: 'ON_MOVE', source: behind!, context: {} })
                    ]);
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

                const targets = this.enemyTeam;
                const livingEnemies = targets.filter(u => u && u.stats.hp > 0);
                if (livingEnemies.length > 0) {
                    const targetCount = 2; // Updated from all
                    const shuffled = [...livingEnemies].sort(() => 0.5 - Math.random());
                    const selectedTargets = shuffled.slice(0, targetCount);
                    // In Headless, we use playerWins as a proxy for 'N' scaling
                    const dmg = 2 + this.playerWins;
                    for (const target of selectedTargets) await this.dealDamage(null, target, dmg, true, true);
                }
            }
        } else {
            this.playerAttackCount++;
            const psychicCount = this.enemySynergies.get('Psychic') || 0;
            if (this.playerAttackCount >= 2 && psychicCount >= 2 && !this.psychicTriggered.has('enemy')) {
                this.psychicTriggered.add('enemy');
                this.playerAttackCount = 0;

                const targets = this.playerTeam;
                const livingAllies = targets.filter(u => u && u.stats.hp > 0);
                if (livingAllies.length > 0) {
                    const targetCount = 2; // Updated from all
                    const shuffled = [...livingAllies].sort(() => 0.5 - Math.random());
                    const selectedTargets = shuffled.slice(0, targetCount);
                    const dmg = Math.max(1, this.playerWins); // Scaling for enemy psychic
                    for (const target of selectedTargets) await this.dealDamage(null, target, dmg, true, true);
                }
            }
        }
    }

    public async dealDamage(source: Unit | null, target: Unit, amount: number, isSkillDamage: boolean = false, _silent: boolean = false) {
        const targetState = this.unitStates.get(target) || {};
        const sourceState = source ? this.unitStates.get(source) || {} : {};
        const isBypassing = (source && source.family === 'pinsir' && !sourceState.isSilenced) ||
            (source && source.family === 'sableye' && sourceState.isAbsoluteKill);



        if (sourceState.isLethalStrike) {
            sourceState.isLethalStrike = false;
            amount = 99;
        }
        if (target.family === 'diglett' && !targetState.isSilenced && !isSkillDamage && !isBypassing) {
            if (Math.random() < ([0, 0.25, 0.33, 0.5][target.level] || 0.25)) return;
        }
        if (!isBypassing) {
            if (target.family === 'squirtle' && !targetState.isSilenced) {
                amount = Math.max(1, amount - target.level);
            }
        }
        const hurtContext = { source, amount };
        await this.eventBus.emit({ type: 'BEFORE_HURT', target, context: hurtContext });
        amount = hurtContext.amount;
        if (amount <= 0 && source !== null) return;

        if (!isBypassing) {
            if (this.getSynergyCountForUnit(target, 'Slow') >= 2 && target.synergies.includes('Slow')) amount = Math.max(1, Math.ceil(amount * 2 / 3));
        }
        const preHp = target.stats.hp;
        target.stats.hp -= amount;
        if (target.stats.hp <= 0 && preHp > 1 && !isBypassing && target.synergies.includes('Hard') && this.getSynergyCountForUnit(target, 'Hard') >= 2 && !targetState.hardUsed) {
            target.stats.hp = 1;
            targetState.hardUsed = true;
            this.unitStates.set(target, targetState);
        }
        await this.eventBus.emit({ type: 'ON_HURT', target, context: { source, amount, isSkillDamage } });
        if (target.stats.hp <= 0) {
            await this.handleDeath(target, source || undefined);
        }
    }

    private async handleDeath(unit: Unit, killer?: Unit) {
        // Larvitar Family: Earthquake (Death) removed logic
        if (unit.family === 'sableye' && killer && killer.stats.hp > 0 && !this.unitStates.get(unit)?.isSilenced) {
            const state = this.unitStates.get(unit) || {};
            state.isAbsoluteKill = true;
            this.unitStates.set(unit, state);
            await this.dealDamage(unit, killer, 9999);
            state.isAbsoluteKill = false;
        }
        await this.eventBus.emit({ type: 'AFTER_DEATH', source: unit, context: { killer } });

        const { myTeam } = this.getTeams(unit);

        // Triplets (三胞胎)
        if (unit.synergies.includes('Triplets') && this.getSynergyCountForUnit(unit, 'Triplets') >= 3) {
            const isAtk = Math.random() < 0.5;
            const original = this.originalPlayerTeam?.find(o => o && o.id === unit.id);
            if (original) {
                this.growUnit(unit, isAtk ? 0 : 3, isAtk ? 3 : 0, original, true);
            }
        }

        // BatonPass (接棒)
        if (unit.synergies.includes('BatonPass') && this.getSynergyCountForUnit(unit, 'BatonPass') >= 2) {
            const batonCount = this.getSynergyCountForUnit(unit, 'BatonPass');
            const inheritRatio = batonCount >= 5 ? 1.0 : 0.5;
            const livingAllies = myTeam.filter(u => u && u !== unit && u.stats.hp > 0);
            if (livingAllies.length > 0) {
                const target = livingAllies[Math.floor(Math.random() * livingAllies.length)];
                const inheritedAtk = Math.floor(unit.stats.attack * inheritRatio);
                const inheritedHp = Math.floor(unit.stats.maxHp * inheritRatio);
                if (inheritedAtk > 0 || inheritedHp > 0) {
                    this.growUnit(target, inheritedHp, inheritedAtk, null, true);
                    const pct = inheritRatio === 1.0 ? '100%' : '50%';
                    this.log(`${unit.name} 對 ${target.name} 使用了接棒（繼承 ${pct}）。`);
                }
            }
        }
        if (this.playerTeam.includes(unit)) {
            const idx = this.playerTeam.indexOf(unit);
            if (this.playerTeam[idx] === unit || (this.playerTeam[idx] && this.playerTeam[idx].stats.hp <= 0)) this.playerTeam[idx] = null as any;
        } else if (this.enemyTeam.includes(unit)) {
            const idx = this.enemyTeam.indexOf(unit);
            if (this.enemyTeam[idx] === unit || (this.enemyTeam[idx] && this.enemyTeam[idx].stats.hp <= 0)) this.enemyTeam[idx] = null as any;
        }
        if (killer && killer.stats.hp > 0) {
            const original = this.originalPlayerTeam?.find(u => u && u.id === killer.id) || null;

            // Claw Synergy: Permanent Atk on kill
            if (killer.synergies.includes('Claw') && this.getSynergyCountForUnit(killer, 'Claw') >= 2) {
                this.growUnit(killer, 0, 3, original, true);
            }

            // Silence check for unit abilities
            if (this.unitStates.get(killer)?.isSilenced) return;


        }
        await this.compactTeams();
    }

    private async compactTeams() {
        const oldPos = new Map<string, number>();
        [...this.playerTeam, ...this.enemyTeam].forEach((u, i) => { if (u) oldPos.set(u.id, i); });
        this.playerTeam = this.compactTeam(this.playerTeam);
        this.enemyTeam = this.compactTeam(this.enemyTeam);

        // Update synergy cache after team changes (units dying or moving)
        this.calculateCachedSynergies(Array.from(this.participantPlayerUnits), this.playerSynergies);
        this.calculateCachedSynergies(Array.from(this.participantEnemyUnits), this.enemySynergies);

        const allUnits = [...this.playerTeam, ...this.enemyTeam];
        for (let i = 0; i < allUnits.length; i++) {
            const u = allUnits[i];
            if (u && oldPos.has(u.id) && oldPos.get(u.id) !== i) await this.eventBus.emit({ type: 'ON_MOVE', source: u, context: {} });
        }
    }

    private compactTeam(team: Unit[]): Unit[] {
        const survivors = team.filter(u => u !== null && u.stats.hp > 0);
        const result = new Array(5).fill(null);
        for (let i = 0; i < survivors.length; i++) result[i] = survivors[i];
        return result;
    }

    private heal(target: Unit, amount: number) {
        if (target.stats.hp > 0) target.stats.hp = Math.min(target.stats.hp + amount, target.stats.maxHp);
    }

    private async spawnUnit(team: Unit[], index: number, templateId: string, level: number, hp: number, attack: number, insert: boolean = false) {
        const template = ALL_UNITS[templateId];
        if (!template) return;

        const newUnit = new Unit(template);
        newUnit.level = level;
        const safeHp = Math.max(1, hp);
        const safeAtk = Math.max(1, attack);
        newUnit.stats.hp = safeHp;
        newUnit.stats.maxHp = safeHp;
        newUnit.stats.attack = safeAtk;
        newUnit.capStats();
        newUnit.family = template.family || template.id;
        newUnit.synergies = [...template.synergies];

        if (insert) {
            if (team[index] === null || (team[index] && team[index].stats.hp <= 0)) team[index] = newUnit;
            else {
                const vacancyIdx = team.findIndex(u => !u || u.stats.hp <= 0);
                if (vacancyIdx !== -1) {
                    team.splice(index, 0, newUnit);
                    const newVacancyIdx = team.findIndex((u, i) => i !== index && (!u || u.stats.hp <= 0));
                    if (newVacancyIdx !== -1) team.splice(newVacancyIdx, 1);
                } else team.splice(index, 0, newUnit);
            }
        } else {
            const nullIdx = team.indexOf(null as any);
            if (nullIdx !== -1) team[nullIdx] = newUnit;
            else team.push(newUnit);
        }
        this.unitStates.set(newUnit, {});
        this.registerUnitAbilities(newUnit);
    }

    public log(message: string) {
        this.logs.push(message);
    }

    public async delay(_ms: number) { }
    public async playAnimation(_unit: Unit | Unit[], _anim: string, _duration?: number) { }
    public playTeamAnimation(_units: Unit[], _anim: string, _duration?: number) { }
    public async notifySkill(unit: Unit, msg: string) {
        this.log(`${unit.name} ${msg}`);
    }

    public async simulateStep(): Promise<boolean> {
        const pFront = this.playerTeam.find(u => u !== null && u.stats.hp > 0);
        const eFront = this.enemyTeam.find(u => u !== null && u.stats.hp > 0);
        if (!pFront || !eFront) return false;
        this.turnCount++;
        await Promise.all([this.performAttack(pFront, eFront), this.performAttack(eFront, pFront)]);
        await this.compactTeams();
        return this.playerTeam.some(u => u !== null && u.stats.hp > 0) && this.enemyTeam.some(u => u !== null && u.stats.hp > 0);
    }

    public getResult(): 'WIN' | 'LOSS' | 'DRAW' | null {
        const pAlive = this.playerTeam.some(u => u !== null && u.stats.hp > 0);
        const eAlive = this.enemyTeam.some(u => u !== null && u.stats.hp > 0);
        if (!pAlive && !eAlive) return 'DRAW';
        if (!pAlive) return 'LOSS';
        if (!eAlive) return 'WIN';
        return null;
    }
}
