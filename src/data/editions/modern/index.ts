import type { GameEdition } from '../../../models/Edition';
import { ALL_UNITS } from '../../AllUnits';
import {
    NOVICE_OPPONENTS,
    INTERM_OPPONENTS,
    ADVANCED_OPPONENTS,
    ELITE_OPPONENTS,
    CHAMPION_OPPONENTS
} from '../../AllOpponents';

const INCLUDED_FAMILIES = [
    'bulbasaur', 'charmander', 'squirtle',
    'chikorita', 'cyndaquil', 'totodile',
    'magnemite', 'diglett', 'doduo',
    'natu', 'meowth', 'houndour',
    'pinsir', 'heracross',
    'onix', 'sneasel', 'mrmime'
];

export const ModernEdition: GameEdition = {
    id: 'modern',
    name: '第二版本 (Modern Edition)',
    availableUnitIds: Object.keys(ALL_UNITS).filter(id => {
        const u = ALL_UNITS[id];
        if (!u || !u.family || !INCLUDED_FAMILIES.includes(u.family as any)) return false;

        // --- 根據需求調整：第二版本 (Modern Edition) 限縮 T1 商店角色池 ---
        // 除御三家外，移除所有其他 T1 角色 (含寶寶丁、小拉達、猴怪等)
        if (u.tier === 1) {
            const starterFamilies = ['bulbasaur', 'charmander', 'squirtle'];
            if (!starterFamilies.includes(u.family)) {
                return false;
            }
        }

        return true;
    }),
    noviceOpponents: NOVICE_OPPONENTS,
    intermOpponents: INTERM_OPPONENTS,
    advancedOpponents: ADVANCED_OPPONENTS,
    eliteOpponents: ELITE_OPPONENTS,
    championOpponents: CHAMPION_OPPONENTS
};
