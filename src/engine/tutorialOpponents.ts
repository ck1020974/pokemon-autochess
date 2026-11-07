import {ALL_UNITS} from '../data/AllUnits';
import {Unit} from '../models/Unit';

export const TUTORIAL_OPPONENTS = [
    {id: 'tutorial-brock-easy', name: '小剛', url: 'gym/小剛01.webp', difficulty: 'EASY', units: ['dwebble', 'dwebble'], level: 1},
    {id: 'tutorial-brock-normal', name: '小剛', url: 'gym/小剛02.webp', difficulty: 'NORMAL', units: ['dwebble', 'diglett', 'onix'], level: 1},
    {id: 'tutorial-brock-hard', name: '小剛', url: 'gym/小剛03.webp', difficulty: 'HARD', units: ['crustle', 'dugtrio', 'steelix'], level: 2},
] as const;

export function isTutorialOpponentAllowed(step: number, opponentId: string): boolean {
    return step <= 0 || step >= 10 || opponentId === TUTORIAL_OPPONENTS[0].id;
}

export function createTutorialEnemyTeam(opponentId?: string): (Unit | null)[] {
    const choice = TUTORIAL_OPPONENTS.find(opponent => opponent.id === opponentId) ?? TUTORIAL_OPPONENTS[0];
    const team: (Unit | null)[] = choice.units.map(id => {
        const unit = new Unit(ALL_UNITS[id]);
        unit.level = choice.level;
        const base = ALL_UNITS[id].baseStats;
        for (let level = 1; level < choice.level; level++) {
            unit.addGrowth(Math.floor(base.maxHp * .5), Math.floor(base.attack * .5));
        }
        return unit;
    });
    while (team.length < 5) team.push(null);
    return team;
}
