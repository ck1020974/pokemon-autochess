import type { GameEdition } from '../../../models/Edition';
import { ALL_UNITS } from '../../AllUnits';
import {
    NOVICE_OPPONENTS,
    INTERM_OPPONENTS,
    ADVANCED_OPPONENTS,
    ELITE_OPPONENTS,
    CHAMPION_OPPONENTS
} from '../../opponents/classic';
import {
    MODERN_NOVICE_OPPONENTS,
    MODERN_INTERM_OPPONENTS,
    MODERN_ADVANCED_OPPONENTS,
    MODERN_ELITE_OPPONENTS,
    MODERN_CHAMPION_OPPONENTS
} from '../../opponents/modern';

export const InfiniteEdition: GameEdition = {
    id: 'infinite',
    name: '無限模式',
    /** 
     * The Infinite edition includes ALL current units. 
     */
    availableUnitIds: Object.keys(ALL_UNITS),
    noviceOpponents: [...NOVICE_OPPONENTS, ...MODERN_NOVICE_OPPONENTS],
    intermOpponents: [...INTERM_OPPONENTS, ...MODERN_INTERM_OPPONENTS],
    advancedOpponents: [...ADVANCED_OPPONENTS, ...MODERN_ADVANCED_OPPONENTS],
    eliteOpponents: [...ELITE_OPPONENTS, ...MODERN_ELITE_OPPONENTS],
    championOpponents: [...CHAMPION_OPPONENTS, ...MODERN_CHAMPION_OPPONENTS]
};
