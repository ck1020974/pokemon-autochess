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
    'bulbasaur', 'charmander', 'squirtle', 'igglybuff', 'rattata', 'mankey',
    'chikorita', 'cyndaquil', 'totodile', 'magnemite', 'diglett', 'doduo',
    'natu', 'meowth', 'houndour', 'slowpoke', 'pinsir', 'heracross',
    'kangaskhan', 'onix', 'sneasel', 'mrmime'
];

export const ModernEdition: GameEdition = {
    id: 'modern',
    name: '第二版本 (Modern Edition)',
    availableUnitIds: Object.keys(ALL_UNITS).filter(id => {
        const u = ALL_UNITS[id];
        return u && u.family && INCLUDED_FAMILIES.includes(u.family as any);
    }),
    noviceOpponents: NOVICE_OPPONENTS,
    intermOpponents: INTERM_OPPONENTS,
    advancedOpponents: ADVANCED_OPPONENTS,
    eliteOpponents: ELITE_OPPONENTS,
    championOpponents: CHAMPION_OPPONENTS
};
