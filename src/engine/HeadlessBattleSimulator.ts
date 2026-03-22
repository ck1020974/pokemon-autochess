
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

        await this.compactTeams();

        const allUnits: { unit: Unit, pos: number, isPlayer: boolean }[] = [];
        this.playerTeam.forEach((u, i) => { if (u) allUnits.push({ unit: u, pos: i, isPlayer: true }); });
        this.enemyTeam.forEach((u, i) => { if (u) allUnits.push({ unit: u, pos: i, isPlayer: false }); });

        const getRank = (unit: Unit) => {
            if (unit.family === 'spiritomb') return 5;
            if (unit.family === 'mrmime') return 4;
            if (unit.family === 'natu') return 3;
            if (unit.family === 'houndour') return 1;

            const utility = ['ditto', 'gastly', 'igglybuff', 'mudkip', 'gulpin'];
            if (utility.includes(unit.family)) return 2;
            return 0;
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

        for (const unit of allUnits.map(item => item.unit)) {
            await this.executeUnitStartOfBattleAbility(unit);
        }

        await this.applyBattleStartSynergies(this.playerTeam.filter(u => u !== null));
        await this.applyBattleStartSynergies(this.enemyTeam.filter(u => u !== null));

        await this.compactTeams();
        await this.eventBus.emit({ type: 'BATTLE_START', context: { simulator: this } });
    }

    private cloneUnit(unit: Unit): Unit {
        const template = ALL_UNITS[unit.templateId];
        const clone = new Unit(template);
        clone.stats = { ...unit.stats };
        clone.level = unit.level;
        clone.id = unit.id; // CRITICAL FIX: Preserve ID for permanent growth
        clone.synergies = [...unit.synergies];
        clone.family = unit.family;
        clone.scalingValue = unit.scalingValue;
        // Cap stats like in main simulator
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
                    if (front) this.buffAttack(front, unit.templateId === 'haunter' ? 3 : 1);
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
                    if (front) this.growUnit(front, unit.templateId === 'jigglypuff' ? 3 : 1, 0);
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
                const dmg = unit.scalingValue || 3;
                // dealDamage in Headless is async if it calls notifySkill but here it's simplified
                await this.dealDamage(unit, weakest, dmg, true);
                this.log(`${unit.name} 使用了電光一閃。`);
            }
        }

        // Mr. Mime: Light Screen
        if (unit.family === 'mrmime' && !this.lightScreenActivated.has(side)) {
            const globalState = this.unitStates.get(unit) || {};
            globalState.lightScreen = 5;
            this.unitStates.set(unit, globalState);
            this.lightScreenActivated.add(side);
        }

        if (unit.family === 'houndour') {
            const times = [0, 1, 2, 3][unit.level] || 1;
            for (let i = 0; i < times; i++) {
                const currentOpTeam = this.playerTeam.includes(unit) ? this.enemyTeam : this.playerTeam;
                const livingEnemies = currentOpTeam.filter(e => e && e.stats.hp > 0);
                if (livingEnemies.length > 0) {
                    let target = livingEnemies[0];
                    for (const e of livingEnemies) if (e.stats.hp < target.stats.hp) target = e;
                    await this.dealDamage(unit, target, 4, true);
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
                    this.buffAttack(front, buffAtk);
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
                const startAbilities = ['gastly', 'igglybuff', 'houndour', 'spiritomb', 'mudkip', 'gulpin', 'totodile', 'pichu', 'caterpie', 'togepi'];
                if (startAbilities.includes(unit.family)) await this.executeUnitStartOfBattleAbility(unit);
            }
        }
        if (unit.family === 'gulpin') {
            const idx = myTeam.indexOf(unit);
            if (idx > 0) {
                const front = myTeam[idx - 1];
                if (front && front.stats.hp > 0) {
                    const multiplier = unit.level >= 3 ? 2 : 1;
                    this.growUnit(unit, front.stats.maxHp * multiplier, front.stats.attack * multiplier);
                    const fState = this.unitStates.get(front) || {};
                    fState.isSwallowed = true;
                    this.unitStates.set(front, fState);
                    front.stats.hp = 0;
                    await this.eventBus.emit({ type: 'AFTER_DEATH', source: front, context: { killer: unit } });
                    await this.compactTeams();
                }
            }
        }

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
                        const original = this.originalPlayerTeam?.find(o => o && o.id === back.id);
                        this.growUnit(back, 0, amount, original, true);
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

                if (allyTarget && enemyTarget) {
                    this.log(`${unit.name} 對 ${allyTarget.name} 和 ${enemyTarget.name} 使用了禮物`);
                } else if (allyTarget) {
                    this.log(`${unit.name} 給 ${allyTarget.name} 送了個禮物！`);
                } else if (enemyTarget) {
                    this.log(`${unit.name} 給 ${enemyTarget.name} 送了個禮物！`);
                }

                if (enemyTarget) {
                    await this.dealDamage(unit, enemyTarget, 5, true);
                }
                if (allyTarget) {
                    this.heal(allyTarget, 5);
                }
            }
        }

        // Shuckle: Gastro Acid (Start)
        if (unit.family === 'shuckle') {
            const idx = myTeam.indexOf(unit);
            if (idx < myTeam.length - 1) { // has back ally
                const back = myTeam[idx + 1];
                if (back && back.stats.hp > 0) {
                    const healAmt = Math.floor(unit.stats.hp * 0.5);
                    unit.stats.hp -= healAmt; // Shuckle loses HP
                    // Temporary buff: only modify cloned battle unit, NOT original
                    back.stats.hp += healAmt;
                    back.stats.maxHp += healAmt;
                    back.capStats(); // Enforce 50/50 cap
                    this.log(`${unit.name} 分歧了 ${healAmt} 點生命給後方的 ${back.name}！`);
                }
            }

            // Gastro Acid (Start of Battle)
            const livingEnemies = opTeam.filter(e => e && e.stats.hp > 0);
            if (livingEnemies.length > 0) {
                const target = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];
                const tState = this.unitStates.get(target) || {};
                tState.isSilenced = true;
                tState.isGastroAcid = true;
                this.unitStates.set(target, tState);
                this.log(`${unit.name} 對 ${target.name} 使用了胃液，使其招式無效化！`);
            }
        }

        // --- Legendary Beasts ---

        // Raikou: All allies +5 HP, all enemies 4-10 damage
        if (unit.family === 'raikou') {
            myTeam.filter(u => u && u.stats.hp > 0).forEach(ally => {
                this.growUnit(ally, 5, 0, null, true);
            });
            const enemies = opTeam.filter(u => u && u.stats.hp > 0);
            for (const enemy of enemies) {
                const dmg = 4 + Math.floor(Math.random() * 7);
                await this.dealDamage(unit, enemy, dmg, true, true);
            }
        }

        // Entei: All allies +5 HP, strongest enemy 30 damage
        if (unit.family === 'entei') {
            myTeam.filter(u => u && u.stats.hp > 0).forEach(ally => {
                this.growUnit(ally, 5, 0, null, true);
            });
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
                await this.dealDamage(unit, strongest, 30, true);
            }
        }

        // Suicune: All allies +5 ATK, weakest enemy 30 damage
        if (unit.family === 'suicune') {
            myTeam.filter(u => u && u.stats.hp > 0).forEach(ally => {
                this.buffAttack(ally, 5, true);
            });
            const enemies = opTeam.filter(u => u && u.stats.hp > 0);
            if (enemies.length > 0) {
                const weakest = [...enemies].sort((a, b) => a.stats.hp - b.stats.hp)[0];
                await this.dealDamage(unit, weakest, 30, true);
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
            if (eeveeFormsPerSynergy.has(syn)) {
                if (syn === 'BatonPass') {
                    const uniqueEeveeForms = eeveeFormsPerSynergy.get(syn)!;
                    count += (uniqueEeveeForms.size - 1);
                } else {
                    count += 1;
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
                    this.growUnit(u, 20, 20, null, true);
                }
            });
        }

        // Charm (撒嬌)
        const charmCount = mySynergies.get('Charm') || 0;
        if (charmCount >= 2) {
            const targetCount = charmCount - 1;
            const livingEnemies = opTeam.filter(u => u && u.stats.hp > 0);
            if (livingEnemies.length > 0) {
                const shuffled = [...livingEnemies].sort(() => 0.5 - Math.random());
                shuffled.slice(0, targetCount).forEach(target => {
                    const reducedAmt = Math.floor(target.stats.attack * 0.33);
                    if (reducedAmt > 0) {
                        target.stats.attack -= reducedAmt;
                        this.log(`${target.name} 因撒嬌的眼神，降低了攻擊。`);
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
            else if (chargeCount >= 4) { minBoost = 4; maxBoost = 10; }
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
                if (dmg > 0) await this.dealDamage(null, target, dmg, true, true);
            }
        }
    }

    private growUnit(unit: Unit, hp: number, atk: number, permanentTarget?: Unit | null, _silent: boolean = false) {
        if (unit.family === 'sneasel' && atk < 0) atk = 0;
        if (hp === 0 && atk === 0) return;
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
                    const buff = count >= 5 ? 10 : (count >= 4 ? 5 : (count >= 3 ? 3 : (count >= 2 ? 1 : 0)));
                    if (buff > 0 && unit.stats.hp > 1) {
                        unit.stats.hp -= 1;
                        this.buffAttack(unit, buff);
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
                    const healAmount = count >= 5 ? 10 : (count >= 4 ? 6 : (count >= 3 ? 4 : (count >= 2 ? 2 : 0)));
                    if (healAmount > 0) {
                        this.heal(unit, healAmount);
                        this.grassHealedTargets.add(e.target);
                    }
                }
            });
        }
        if (unit.synergies.includes('Water')) {
            this.eventBus.on('BEFORE_ATTACK', (e) => {
                if (unit.stats.hp <= 0) return;
                if (e.source === unit && e.target && e.target.stats.hp > 0 && e.target.family !== 'sneasel') {
                    const count = this.getSynergyCountForUnit(unit, 'Water');
                    const debuff = count >= 5 ? 5 : (count >= 4 ? 3 : (count >= 3 ? 2 : (count >= 2 ? 1 : 0)));
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
                        await this.dealDamage(unit, target, dmg, true, true);
                    }
                }
            });
        }
        if (unit.synergies.includes('Angry')) {
            this.eventBus.on('ON_HURT', (e) => {
                if (e.target === unit && this.getSynergyCountForUnit(unit, 'Angry') >= 2) {
                    const count = this.getSynergyCountForUnit(unit, 'Angry');
                    const buff = count >= 4 ? 8 : (count >= 3 ? 4 : (count >= 2 ? 2 : 0));
                    const { myTeam } = this.getTeams(unit);
                    myTeam.forEach(u => {
                        if (u && u.stats.hp > 0) this.buffAttack(u, buff);
                    });
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
                        this.growUnit(unit, 0, buff, original);
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
                        this.growUnit(unit, buff, 0, original);
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
                    const livingEligible = myTeam.filter(u => u && u.stats.hp > 0 && u.stats.maxHp < 50);
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

        // Bellsprout Family: Ally Death -> Random Ally Perm Atk/HP
        if (unit.family === 'bellsprout') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                if (this.unitStates.get(unit)?.isSilenced) return;
                const { myTeam } = this.getTeams(unit);
                if (e.source && e.source !== unit && myTeam.includes(e.source)) {
                    const living = myTeam.filter(u => u && u.stats.hp > 0);
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

        // Togepi Family: After Attack Permanent Buff + Double Damage Chance (Super Luck)
        if (unit.family === 'togepi') {
            this.eventBus.on('AFTER_ATTACK', async (e) => {
                const s = this.unitStates.get(unit);
                if (e.source === unit && unit.stats.hp > 0 && !s?.isSilenced) {
                    const amount = unit.level; // Lv1:+1, Lv2:+2, Lv3:+3
                    const original = this.originalPlayerTeam?.find(o => o && o.id === unit.id);
                    this.growUnit(unit, 0, amount, original, true);
                }
            });

            this.eventBus.on('BEFORE_HURT', async (e) => {
                const s = this.unitStates.get(unit);
                if (e.context.source === unit && !s?.isSilenced) {
                    if (Math.random() < 0.5) {
                        e.context.amount *= 2;
                        this.log(`${unit.name} 發動了超幸運`);
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
                    const livingEligible = myTeam.filter(u => u && u.stats.hp > 0 && (u.stats.maxHp < 50 || u.stats.attack < 50));
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
                    const count = [0, 1, 2, 5][unit.level] || 1;
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

        // Outrage Synergy: Grow before attack, 25% chance to skip attack
        if (unit.synergies.includes('Outrage')) {
            this.eventBus.on('BEFORE_ATTACK', async (e) => {
                const s = this.unitStates.get(unit);
                if (e.source === unit && unit.stats.hp > 0 && !s?.isSilenced) {
                    const count = this.getSynergyCountForUnit(unit, 'Outrage');
                    if (count >= 2) {
                        const amount = count >= 3 ? 5 : 3;
                        const original = this.originalPlayerTeam?.find(o => o && o.id === unit.id);
                        this.growUnit(unit, amount, amount, original, true);

                        // 25% chance to skip attack
                        if (Math.random() < 0.25) {
                            if (s) s.isAttackSkipped = true;
                        }
                    }
                }
            });
        }

        // Mareep Family: Pursuit (閃電拳) on ally attack
        if (unit.family === 'mareep') {
            this.eventBus.on('ON_ATTACK', async (e) => {
                const s = this.unitStates.get(unit);
                const { myTeam } = this.getTeams(unit);
                if (unit.stats.hp > 0 && !s?.isSilenced && e.source && e.source !== unit && myTeam.includes(e.source)) {
                    const multipliers = [0, 0.25, 0.33, 0.5];
                    const mult = multipliers[unit.level] || 0.25;
                    const dmg = Math.ceil(unit.stats.attack * mult);
                    if (e.target && e.target.stats.hp > 0) {
                        this.log(`${unit.name} 對 ${e.target.name} 發動了閃電拳！`);
                        await this.dealDamage(unit, e.target, dmg, true);
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
        // Dratini Family: First damage halved
        if (unit.family === 'dratini') {
            this.eventBus.on('BEFORE_HURT', async (e) => {
                const s = this.unitStates.get(unit);
                if (e.target === unit && !s?.isSilenced && !s?.firstDamageHalved) {
                    const source = e.context.source;
                    const sState = source ? this.unitStates.get(source) || {} : {};
                    const isBypassing = (source && source.family === 'pinsir' && !sState.isSilenced) ||
                        (source && source.family === 'sableye' && sState.isAbsoluteKill);
                    if (isBypassing) return;

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
                        const targets = livingEnemies.slice(1);
                        this.log(`${unit.name} 對後方目標使用了咬碎`);
                        for (const target of targets) {
                            await this.dealDamage(unit, target, dmg, true, true);
                        }
                    }
                }
            });

            this.eventBus.on('ON_HURT', async (e) => {
                if (e.target === unit && unit.stats.hp > 0 && !this.unitStates.get(unit)?.isSilenced) {
                    const original = this.originalPlayerTeam?.find(o => o && o.id === unit.id);
                    // New: +1 HP and +1 ATK
                    this.growUnit(unit, 1, 1, original, true);
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
        if (attacker.family === 'kangaskhan' && (attacker.templateId !== attacker.family) && !s?.isSilenced) {
            await promises[0];
            if (defender.stats.hp > 0) promises.push(this.dealDamage(attacker, defender, dmg, false));
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
        // Charmander rework: Splash to neighbor (Inherited from old Totodile)
        if (attacker.family === 'charmander' && !s?.isSilenced) {
            const { opTeam } = this.getTeams(attacker);
            const idx = opTeam.indexOf(defender);
            if (idx !== -1 && idx < opTeam.length - 1 && opTeam[idx + 1] && opTeam[idx + 1]!.stats.hp > 0) {
                const isEnemyAttacker = this.enemyTeam.includes(attacker);
                const splashDmg = isEnemyAttacker ? Math.max(1, this.playerWins) : attacker.scalingValue;
                promises.push(this.dealDamage(attacker, opTeam[idx + 1]!, splashDmg, true));
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
        if (target.stats.hp <= 0) return;

        const { myTeam, side } = this.getTeams(target);
        const targetState = this.unitStates.get(target) || {};
        const sourceState = source ? this.unitStates.get(source) || {} : {};
        const isBypassing = (source && source.family === 'pinsir' && !sourceState.isSilenced) ||
            (source && source.family === 'sableye' && sourceState.isAbsoluteKill);

        // --- Light Screen Logic ---
        const isEnemySource = source ? this.getTeams(source).side !== side : true;
        if (isEnemySource) {
            const aliveMimes = myTeam.filter(u => u && u.family === 'mrmime' && u.stats.hp > 0);
            for (const mime of aliveMimes) {
                const mState = this.unitStates.get(mime);
                if (mState && mState.lightScreen > 0) {
                    if (!isBypassing) {
                        amount = Math.ceil(amount / 2);
                    }
                    mState.lightScreen--;
                    break;
                }
            }
        }

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
            const livingAllies = myTeam.filter(u => u && u !== unit && u.stats.hp > 0);
            if (livingAllies.length > 0) {
                const target = livingAllies[Math.floor(Math.random() * livingAllies.length)];
                const inheritedAtk = Math.floor(unit.stats.attack * 0.5);
                const inheritedHp = Math.floor(unit.stats.maxHp * 0.5);
                if (inheritedAtk > 0 || inheritedHp > 0) {
                    this.growUnit(target, inheritedHp, inheritedAtk, null, true);
                    this.log(`${unit.name} 對 ${target.name} 使用了接棒。`);
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
