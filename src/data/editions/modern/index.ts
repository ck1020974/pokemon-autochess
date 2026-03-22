import type { GameEdition } from '../../../models/Edition';
import { ALL_UNITS } from '../../AllUnits';
import {
    MODERN_NOVICE_OPPONENTS,
    MODERN_INTERM_OPPONENTS,
    MODERN_ADVANCED_OPPONENTS,
    MODERN_ELITE_OPPONENTS,
    MODERN_CHAMPION_OPPONENTS
} from '../../ModernOpponents';

const INCLUDED_FAMILIES = [
    'bulbasaur', 'charmander', 'squirtle',
    'chikorita', 'cyndaquil', 'totodile',
    'psyduck', 'bellsprout', 'vulpix',
    'eevee',
    'doduo', 'magnemite', 'sneasel', 'diglett', 'mareep',
    'heracross', 'pinsir',
    'caterpie', 'cleffa', 'togepi', 'pichu', 'ekans', 'wynaut', 'geodude', 'natu',
    'cubone', 'murkrow',
    'bonsly',
    'meowth', 'kangaskhan', 'farfetchd', 'mrmime',
    'happiny',
    'raikou', 'entei', 'suicune', 'dratini', 'larvitar', 'delibird', 'shuckle'
];

export const ModernEdition: GameEdition = {
    id: 'modern',
    name: '第二版本 (現代版)',
    availableUnitIds: Object.keys(ALL_UNITS).filter(id => {
        const u = ALL_UNITS[id];
        if (!u || !u.family || !INCLUDED_FAMILIES.includes(u.family as any)) return false;

        // --- 根據需求調整：第二版本 (Modern Edition) 限縮 T1 商店角色池 ---
        // 除御三家外，移除所有其他 T1 角色 (含寶寶丁、小拉達、猴怪等)
        if (u.tier === 1) {
            const allowedT1Families = [
                'bulbasaur', 'charmander', 'squirtle',
                'caterpie', 'cleffa', 'togepi', 'ekans', 'wynaut', 'geodude', 'bonsly'
            ];
            if (!allowedT1Families.includes(u.family)) {
                return false;
            }
        }

        return true;
    }),
    noviceOpponents: MODERN_NOVICE_OPPONENTS,
    intermOpponents: MODERN_INTERM_OPPONENTS,
    advancedOpponents: MODERN_ADVANCED_OPPONENTS,
    eliteOpponents: MODERN_ELITE_OPPONENTS,
    championOpponents: MODERN_CHAMPION_OPPONENTS
};
