import type { GameEdition } from '../../../models/Edition';
import { ALL_UNITS } from '../../AllUnits';
import {
    INFINITE_NOVICE_OPPONENTS,
    INFINITE_INTERM_OPPONENTS,
    INFINITE_ADVANCED_OPPONENTS,
    INFINITE_ELITE_OPPONENTS,
    INFINITE_CHAMPION_OPPONENTS
} from '../../opponents/infinite';

export const InfiniteEdition: GameEdition = {
    id: 'infinite',
    name: '作者：柚C老師',
    /** 
     * The Infinite edition includes ALL current units. 
     */
    availableUnitIds: Object.keys(ALL_UNITS),
    noviceOpponents: INFINITE_NOVICE_OPPONENTS,
    intermOpponents: INFINITE_INTERM_OPPONENTS,
    advancedOpponents: INFINITE_ADVANCED_OPPONENTS,
    eliteOpponents: INFINITE_ELITE_OPPONENTS,
    championOpponents: INFINITE_CHAMPION_OPPONENTS
};
