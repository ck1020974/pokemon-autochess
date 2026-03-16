import type { GameEdition } from '../../../models/Edition';
import { ALL_UNITS } from '../../AllUnits';
import { 
    NOVICE_OPPONENTS, 
    INTERM_OPPONENTS, 
    ADVANCED_OPPONENTS, 
    ELITE_OPPONENTS, 
    CHAMPION_OPPONENTS 
} from '../../AllOpponents';

export const ClassicEdition: GameEdition = {
    id: 'classic',
    name: '經典版 (Generation 1-9 Starter Mix)',
    /** 
     * The Classic edition includes ALL current units. 
     * We just extract all the keys from the ALL_UNITS pool.
     */
    availableUnitIds: Object.keys(ALL_UNITS),
    noviceOpponents: NOVICE_OPPONENTS,
    intermOpponents: INTERM_OPPONENTS,
    advancedOpponents: ADVANCED_OPPONENTS,
    eliteOpponents: ELITE_OPPONENTS,
    championOpponents: CHAMPION_OPPONENTS
};
