
import { Unit } from '../models/Unit';
import { EventBus } from './EventBus';
import { UNIT_TEMPLATES } from '../models/UnitFactory';

export class HeadlessBattleSimulator {
    public playerTeam: Unit[];
    public enemyTeam: Unit[];
    public logs: string[] = [];
    public eventBus: EventBus;
    public turnCount: number = 0;
    public unitStates: Map<Unit, any> = new Map();
    private initialPlayerSet: Set<Unit> = new Set();
    private spiritombTriggered: Set<string> = new Set();
    private playerSynergies = new Map<string, number>();
    private enemySynergies = new Map<string, number>();
    private originalPlayerTeam: (Unit | null)[] | null = null;
    private playerWins: number = 0;
    private playerAttackCount: number = 0;
    private enemyAttackCount: number = 0;

    constructor(playerTeam: (Unit | null)[], enemyTeam: (Unit | null)[], originalPlayerTeam?: (Unit | null)[], playerWins: number = 0) {
        this.playerWins = playerWins || 0;
        this.originalPlayerTeam = originalPlayerTeam || null;
        this.playerTeam = playerTeam.map(u => u ? this.cloneUnit(u) : null) as Unit[];
        this.enemyTeam = enemyTeam.map(u => u ? this.cloneUnit(u) : null) as Unit[];
        this.eventBus = new EventBus();

        this.playerTeam.forEach(u => { if (u) this.initialPlayerSet.add(u); });
        this.calculateCachedSynergies(this.playerTeam.filter(u => u !== null), this.playerSynergies);
        this.calculateCachedSynergies(this.enemyTeam.filter(u => u !== null), this.enemySynergies);

        this.enemyTeam.forEach(u => { if (u) this.registerUnitAbilities(u); });
        this.playerTeam.forEach(u => { if (u) this.registerUnitAbilities(u); });
    }

    public async init() {
        this.spiritombTriggered.clear();
        const allUnits: { unit: Unit, pos: number, isPlayer: boolean }[] = [];
        this.playerTeam.forEach((u, i) => { if (u) allUnits.push({ unit: u, pos: i, isPlayer: true }); });
        this.enemyTeam.forEach((u, i) => { if (u) allUnits.push({ unit: u, pos: i, isPlayer: false }); });

        const getRank = (unit: Unit) => {
            if (unit.family === 'spiritomb') return 3;
            const utility = ['ditto', 'gastly', 'igglybuff', 'mudkip', 'gulpin'];
            if (utility.includes(unit.family)) return 2;
            if (unit.family === 'houndour') return 1;
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

        this.compactTeams();
        await this.eventBus.emit({ type: 'BATTLE_START', context: { simulator: this } });
    }

    private cloneUnit(unit: Unit): Unit {
        const clone = new Unit(UNIT_TEMPLATES[unit.templateId]);
        clone.stats = { ...unit.stats };
        clone.level = unit.level;
        clone.synergies = [...unit.synergies];
        clone.family = unit.family;
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
                myTeam.filter(u => u && u.stats.hp > 0).forEach(u => this.buffAttack(u!, 5, true));
            } else {
                const idx = myTeam.indexOf(unit);
                if (idx > 0) {
                    const front = myTeam[idx - 1];
                    if (front) this.buffAttack(front, unit.templateId === 'haunter' ? 5 : 2);
                }
            }
        }
        // Igglybuff Family: HP buff at start
        if (unit.family === 'igglybuff') {
            if (unit.templateId === 'wigglytuff') {
                myTeam.filter(u => u && u.stats.hp > 0).forEach(u => this.growUnit(u!, 5, 0, null, true));
            } else {
                const idx = myTeam.indexOf(unit);
                if (idx > 0) {
                    const front = myTeam[idx - 1];
                    if (front) this.growUnit(front, unit.templateId === 'jigglypuff' ? 5 : 2, 0);
                }
            }
        }

        // Natu/Xatu: Swap enemy first and last
        if (unit.family === 'natu') {
            const livingEnemies = opTeam.filter(e => e && e.stats.hp > 0);
            if (livingEnemies.length >= 2) {
                const first = livingEnemies[0];
                const last = livingEnemies[livingEnemies.length - 1];
                const firstIdx = opTeam.indexOf(first);
                const lastIdx = opTeam.indexOf(last);
                if (firstIdx !== -1 && lastIdx !== -1 && firstIdx !== lastIdx) {
                    opTeam[firstIdx] = last;
                    opTeam[lastIdx] = first;
                }
            }
        }

        // Mr. Mime: Light Screen
        if (unit.family === 'mrmime') {
            const globalState = this.unitStates.get(unit) || {};
            globalState.lightScreen = 5;
            this.unitStates.set(unit, globalState);
        }
        if (unit.family === 'houndour') {
            const times = [0, 1, 3, 5][unit.level] || 1;
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
        if (unit.family === 'ditto') {
            const allies = myTeam.filter(u => u && u !== unit && u.stats.hp > 0);
            if (allies.length > 0) {
                let target = allies[0];
                for (const u of allies) if (u.stats.hp > target.stats.hp) target = u;

                unit.family = target.family;

                // Mirror logic from BattleSimulator for level-appropriate template
                let currentTemplate = UNIT_TEMPLATES[target.family] || UNIT_TEMPLATES[target.templateId];
                for (let i = 1; i < unit.level; i++) {
                    if (currentTemplate.evolveId && UNIT_TEMPLATES[currentTemplate.evolveId]) {
                        currentTemplate = UNIT_TEMPLATES[currentTemplate.evolveId];
                    }
                }
                unit.templateId = currentTemplate.id;
                unit.synergies = [...currentTemplate.synergies];

                this.calculateCachedSynergies(this.playerTeam.filter(u => u !== null), this.playerSynergies);
                this.calculateCachedSynergies(this.enemyTeam.filter(u => u !== null), this.enemySynergies);
                this.registerUnitAbilities(unit);
                const startAbilities = ['gastly', 'igglybuff', 'houndour', 'spiritomb', 'mudkip', 'gulpin'];
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
                    this.compactTeams();
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
        const families = new Map<string, Set<string>>();
        team.forEach(u => {
            u.synergies.forEach(syn => {
                if (!families.has(syn)) families.set(syn, new Set());
                families.get(syn)!.add(u.family);
            });
        });
        families.forEach((set, syn) => map.set(syn, set.size));
    }

    private async applyBattleStartSynergies(team: Unit[]) {
        if (team.length === 0) return;
        if (this.getSynergyCountForUnit(team[0], 'Triplets') >= 3) {
            team.filter(u => u && u.synergies.includes('Triplets')).forEach(u => this.growUnit(u, 3, 3, null, true));
        }
        if (this.getSynergyCountForUnit(team[0], 'Starter') >= 3) {
            team.filter(u => u && u.synergies.includes('Starter')).forEach(u => this.growUnit(u, 1, 1, null, true));
        }

        const hasSnow = (this.playerSynergies.get('Snow') || 0) >= 2 || (this.enemySynergies.get('Snow') || 0) >= 2;
        if (hasSnow) {
            const allUnits = [...this.playerTeam, ...this.enemyTeam].filter(u => u !== null && u.stats.hp > 0);
            for (const target of allUnits) {
                if (target.synergies.includes('Snow')) continue;
                const dmg = Math.ceil(target.stats.maxHp * 0.33);
                await this.dealDamage(null, target, dmg, true, true);
            }
        }
    }

    private growUnit(unit: Unit, hp: number, atk: number, permanentTarget?: Unit | null, _silent: boolean = false) {
        if (hp === 0 && atk === 0) return;
        unit.addGrowth(hp, atk);
        if (permanentTarget) permanentTarget.addGrowth(hp, atk);

        if (this.getSynergyCountForUnit(unit, 'Claw') >= 2 && unit.synergies.includes('Claw')) {
            unit.stats.attack += 2;
            unit.capStats();
            if (permanentTarget) {
                permanentTarget.stats.attack += 2;
                permanentTarget.capStats();
            }
        }
    }

    private buffAttack(unit: Unit, amount: number, _silent: boolean = false) {
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
        if (unit.synergies.includes('Grass')) {
            this.eventBus.on('AFTER_ATTACK', async (e) => {
                const s = this.unitStates.get(unit);
                if (s?.isSilenced || unit.stats.hp <= 0) return;
                const { myTeam } = this.getTeams(unit);
                if (e.source === unit && myTeam.includes(unit)) {
                    const count = this.getSynergyCountForUnit(unit, 'Grass');
                    const healAmount = count >= 4 ? 6 : (count >= 3 ? 4 : (count >= 2 ? 2 : 0));
                    if (healAmount > 0) this.heal(unit, healAmount);
                }
            });
        }
        if (unit.synergies.includes('Water')) {
            this.eventBus.on('BEFORE_ATTACK', (e) => {
                const s = this.unitStates.get(unit);
                if (s?.isSilenced || unit.stats.hp <= 0) return;
                if (e.source === unit) {
                    const count = this.getSynergyCountForUnit(unit, 'Water');
                    const buff = count >= 4 ? 5 : (count >= 3 ? 3 : (count >= 2 ? 1 : 0));
                    if (buff > 0) this.growUnit(unit, buff, 0);
                }
            });
        }
        if (unit.family === 'mudkip') {
            this.eventBus.on('BEFORE_ATTACK', async (e) => {
                const s = this.unitStates.get(unit);
                if (s?.isSilenced || unit.stats.hp <= 0) return;
                const { myTeam } = this.getTeams(unit);
                const idx = myTeam.indexOf(unit);
                if (idx > 0 && myTeam[idx - 1] === e.source) {
                    const buff = [0, 2, 4, 6][unit.level] || 2;
                    this.growUnit(unit, buff, buff);
                }
            });
        }
        if (unit.family === 'torchic') {
            this.eventBus.on('BEFORE_ATTACK', async (e) => {
                const s = this.unitStates.get(unit);
                if (unit.stats.hp <= 0 || s?.isSilenced) return;
                const { myTeam } = this.getTeams(unit);
                const idx = myTeam.indexOf(unit);
                if (idx > 0 && myTeam[idx - 1] === e.source && e.target) {
                    const dmg = [0, 3, 5, 10][unit.level] || 3;
                    await this.dealDamage(unit, e.target, dmg);
                }
            });
        }
        if (unit.synergies.includes('Fire')) {
            this.eventBus.on('BEFORE_ATTACK', (e) => {
                const s = this.unitStates.get(unit);
                if (s?.isSilenced) return;
                if (e.source === unit) {
                    const count = this.getSynergyCountForUnit(unit, 'Fire');
                    const buff = count >= 4 ? 5 : (count >= 3 ? 3 : (count >= 2 ? 1 : 0));
                    if (buff > 0) this.buffAttack(unit, buff);
                }
            });
        }
        if (unit.synergies.includes('Angry')) {
            this.eventBus.on('ON_HURT', (e) => {
                const s = this.unitStates.get(unit);
                if (s?.isSilenced) return;
                if (e.target === unit && this.getSynergyCountForUnit(unit, 'Angry') >= 2) this.buffAttack(unit, 3);
            });
        }
        if (unit.synergies.includes('Cave')) {
            this.eventBus.on('AFTER_ATTACK', async (e) => {
                const s = this.unitStates.get(unit);
                if (s?.isSilenced || unit.stats.hp <= 0) return;
                if (e.source === unit && this.getSynergyCountForUnit(unit, 'Cave') >= 2) {
                    const { myTeam } = this.getTeams(unit);
                    const aliveCount = myTeam.filter(u => u && u.stats.hp > 0).length;
                    if (aliveCount <= 1) return;
                    const idx = myTeam.indexOf(unit);
                    if (idx !== -1 && idx < myTeam.length - 1) {
                        myTeam.splice(idx, 1);
                        myTeam.push(unit);
                        this.compactTeams();
                        await this.eventBus.emit({ type: 'ON_MOVE', source: unit, context: {} });
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
            this.eventBus.on('ON_MOVE', (e) => {
                if (e.source === unit && !this.unitStates.get(unit)?.isSilenced) {
                    const amount = unit.level >= 3 ? 4 : 2;
                    this.growUnit(unit, amount, 0);
                    const original = this.originalPlayerTeam?.find(u => u && u.id === unit.id);
                    if (original) original.addGrowth(amount, 0);
                }
            });
            this.eventBus.on('ON_HURT', async (e) => {
                if (e.target === unit && e.source && e.source.stats.hp > 0 && !this.unitStates.get(unit)?.isSilenced) {
                    const amount = e.context.amount;
                    if (amount > 0) {
                        const multiplier = unit.templateId === 'onix' ? 0.5 : 1.0;
                        const reflectDmg = Math.ceil(amount * multiplier);
                        await this.dealDamage(unit, e.source, reflectDmg, false);
                    }
                }
            });
        }
        if (unit.family === 'fuecoco') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                const s = this.unitStates.get(unit);
                const { myTeam } = this.getTeams(unit);
                // Ensure unit is still alive and in the team array (not replaced by null)
                if (unit.stats.hp <= 0 || s?.isSilenced || !myTeam.includes(unit)) return;
                if (e.context.killer && myTeam.includes(e.context.killer)) {
                    const amount = [0, 1, 2, 4][unit.level] || 1;
                    for (const ally of myTeam.filter(u => u && u.stats.hp > 0)) {
                        const original = this.originalPlayerTeam?.find(o => o && o.id === ally.id);
                        this.growUnit(ally, 0, amount, original, true);
                    }
                }
            });
        }
        if (unit.family === 'quaxly') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                const { myTeam } = this.getTeams(unit);
                // Ensure unit is still alive and in the team array
                if (unit.stats.hp <= 0 || this.unitStates.get(unit)?.isSilenced || !myTeam.includes(unit)) return;
                if (e.context.killer && myTeam.includes(e.context.killer)) {
                    const amount = [0, 1, 2, 4][unit.level] || 1;
                    for (const ally of myTeam.filter(u => u && u.stats.hp > 0)) {
                        const original = this.originalPlayerTeam?.find(o => o && o.id === ally.id);
                        this.growUnit(ally, amount, 0, original, true);
                    }
                }
            });
        }
        if (unit.family === 'sprigatito') {
            this.eventBus.on('ON_FRIEND_SUMMONED', async (e) => {
                const { myTeam } = this.getTeams(unit);
                // Ensure unit is still alive and in the team array
                if (unit.stats.hp <= 0 || this.unitStates.get(unit)?.isSilenced || !myTeam.includes(unit)) return;
                if (e.source && myTeam.includes(e.source) && e.source !== unit) {
                    const amount = [0, 1, 2, 4][unit.level] || 1;
                    for (const ally of myTeam.filter(u => u && u.stats.hp > 0)) {
                        const isAtk = Math.random() < 0.5;
                        const original = this.originalPlayerTeam?.find(o => o && o.id === ally.id);
                        this.growUnit(ally, isAtk ? 0 : amount, isAtk ? amount : 0, original, true);
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
                this.compactTeams();
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
                const bonus = [0, 0, 1, 2][unit.level];
                const stats = 1 + bonus;
                for (let i = 0; i < count; i++) {
                    const { myTeam: currentTeam } = this.getTeams(unit);
                    await this.spawnUnit(currentTeam, deathIdx + i, 'mouse', 1, stats, stats, true);
                }
                this.compactTeams();
            });
        }
        if (unit.family === 'shuppet') {
            this.eventBus.on('AFTER_DEATH', async (e) => {
                const s = this.unitStates.get(unit);
                if (s?.isSilenced || e.source !== unit) return;
                const { opTeam } = this.getTeams(unit);
                const living = opTeam.filter(u => u && u.stats.hp > 0);
                if (living.length > 0) {
                    const target = living[Math.floor(Math.random() * living.length)];
                    const dmg = [0, 4, 10, 99][unit.level] || 4;
                    await this.dealDamage(unit, target, dmg, true);
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
                    const buff = [0, 1, 2, 5][unit.level] || 1;
                    this.growUnit(e.source, buff, buff);
                }
            });
        }
        if (unit.family === 'treecko') {
            this.eventBus.on('ON_FRIEND_SUMMONED', async (e) => {
                const s = this.unitStates.get(unit);
                if (unit.stats.hp <= 0 || s?.isSilenced) return;
                const { myTeam, opTeam } = this.getTeams(unit);
                if (e.source && myTeam.includes(e.source) && e.source !== unit) {
                    const dmg = [0, 3, 6, 12][unit.level] || 3;
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
    }

    public async performAttack(attacker: Unit, defender: Unit) {
        if (attacker.stats.hp <= 0 || defender.stats.hp <= 0) return;
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
            const { opTeam } = this.getTeams(attacker);
            const liveEnemies = opTeam.filter(u => u && u.stats.hp > 0);
            if (liveEnemies.length > 0) {
                const others = liveEnemies.filter(u => u !== defender);
                const r = others.length > 0 ? others[Math.floor(Math.random() * others.length)] : defender;
                promises.push(this.dealDamage(attacker, r, dmg));
            }
        }
        if (attacker.family === 'totodile' && !s?.isSilenced) {
            const { opTeam } = this.getTeams(attacker);
            const idx = opTeam.indexOf(defender);
            if (idx !== -1 && idx < opTeam.length - 1 && opTeam[idx + 1] && opTeam[idx + 1]!.stats.hp > 0) {
                const splashDmg = [0, 2, 4, 6][attacker.level] || 2;
                promises.push(this.dealDamage(attacker, opTeam[idx + 1]!, splashDmg, true));
            }
        }
        await Promise.all(promises);
        if (attacker.family === 'snover' && !s?.isSilenced) {
            this.growUnit(attacker, 0, 1);
            if (defender.stats.hp > 0) {
                const { myTeam: defTeam } = this.getTeams(defender);
                const idx = defTeam.indexOf(defender);
                if (idx !== -1 && idx < defTeam.length - 1 && defTeam[idx + 1]) {
                    const behind = defTeam[idx + 1];
                    defTeam[idx] = behind!;
                    defTeam[idx + 1] = defender;
                    this.compactTeams();
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
            if (this.enemyAttackCount >= 2 && psychicCount >= 2) {
                this.enemyAttackCount = 0;
                const allEnemies = this.enemyTeam.filter(u => u && u.stats.hp > 0);
                const dmg = 2 * this.playerWins;
                for (const target of allEnemies) await this.dealDamage(null, target, dmg, true, true);
            }
        } else {
            this.playerAttackCount++;
            const psychicCount = this.enemySynergies.get('Psychic') || 0;
            if (this.playerAttackCount >= 2 && psychicCount >= 2) {
                this.playerAttackCount = 0;
                const allAllies = this.playerTeam.filter(u => u && u.stats.hp > 0);
                for (const target of allAllies) await this.dealDamage(null, target, 2, true, true);
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
        if (isEnemySource && !isBypassing) {
            const aliveMimes = myTeam.filter(u => u && u.family === 'mrmime' && u.stats.hp > 0);
            for (const mime of aliveMimes) {
                const mState = this.unitStates.get(mime);
                if (mState && mState.lightScreen > 0) {
                    amount = Math.ceil(amount / 2);
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
        target.stats.hp -= amount;
        if (target.stats.hp <= 0 && !isBypassing && target.synergies.includes('Hard') && this.getSynergyCountForUnit(target, 'Hard') >= 2 && !targetState.hardUsed) {
            target.stats.hp = 1;
            targetState.hardUsed = true;
            this.unitStates.set(target, targetState);
        }
        if (target.stats.hp <= 0) {
            await this.handleDeath(target, source || undefined);
        } else {
            await this.eventBus.emit({ type: 'ON_HURT', target, context: { source, amount } });
        }
    }

    private async handleDeath(unit: Unit, killer?: Unit) {
        if (unit.family === 'sableye' && killer && killer.stats.hp > 0 && !this.unitStates.get(unit)?.isSilenced) {
            const state = this.unitStates.get(unit) || {};
            state.isAbsoluteKill = true;
            this.unitStates.set(unit, state);
            await this.dealDamage(unit, killer, 9999);
            state.isAbsoluteKill = false;
        }
        await this.eventBus.emit({ type: 'AFTER_DEATH', source: unit, context: { killer } });
        if (this.playerTeam.includes(unit)) {
            const idx = this.playerTeam.indexOf(unit);
            if (this.playerTeam[idx] === unit || (this.playerTeam[idx] && this.playerTeam[idx].stats.hp <= 0)) this.playerTeam[idx] = null as any;
        } else if (this.enemyTeam.includes(unit)) {
            const idx = this.enemyTeam.indexOf(unit);
            if (this.enemyTeam[idx] === unit || (this.enemyTeam[idx] && this.enemyTeam[idx].stats.hp <= 0)) this.enemyTeam[idx] = null as any;
        }
        if (killer && killer.stats.hp > 0 && !this.unitStates.get(killer)?.isSilenced) {
            const original = this.originalPlayerTeam?.find(u => u && u.id === killer.id) || null;

            if (killer.family === 'sneasel') {
                const buff = killer.level >= 2 ? 2 : 1;
                this.growUnit(killer, 0, buff, original);
            }
            if (killer.family === 'charmander') {
                const buff = killer.level;
                const canAddAtk = killer.stats.attack < 50;
                const canAddHp = killer.stats.maxHp < 50;
                let choice: 'hp' | 'atk';
                if (canAddAtk && !canAddHp) choice = 'atk';
                else if (canAddHp && !canAddAtk) choice = 'hp';
                else choice = Math.random() < 0.5 ? 'atk' : 'hp';

                if (choice === 'atk') this.growUnit(killer, 0, buff);
                else this.growUnit(killer, buff, 0);
            }
            if (killer.family === 'cyndaquil') {
                const kState = this.unitStates.get(killer) || {};
                if ((kState.cyndaquilKills || 0) < killer.level + 1) {
                    kState.cyndaquilKills = (kState.cyndaquilKills || 0) + 1;
                    this.unitStates.set(killer, kState);
                    const amt = killer.level >= 3 ? 4 : 2;
                    this.growUnit(killer, amt, amt);
                }
            }
        }
        this.compactTeams();
    }

    private async compactTeams() {
        const oldPos = new Map<string, number>();
        [...this.playerTeam, ...this.enemyTeam].forEach((u, i) => { if (u) oldPos.set(u.id, i); });
        this.playerTeam = this.compactTeam(this.playerTeam);
        this.enemyTeam = this.compactTeam(this.enemyTeam);
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
        const template = UNIT_TEMPLATES[templateId];
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
        await this.eventBus.emit({ type: 'ON_FRIEND_SUMMONED', source: newUnit, context: {} });
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
