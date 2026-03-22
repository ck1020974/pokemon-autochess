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
    name: '經典版 (第一至九代混合)',
    /** 
     * The Classic edition includes ALL current units. 
     * We just extract all the keys from the ALL_UNITS pool.
     */
    availableUnitIds: Object.keys(ALL_UNITS).filter(id => {
        const u = ALL_UNITS[id];
        const excludedFamilies = [
            'caterpie', 'cleffa', 'togepi', 'ekans', 'wynaut', 'geodude',
            'pichu', 'eevee', 'vulpix', 'bellsprout', 'psyduck', 'mareep',
            'cubone', 'murkrow', 'bonsly', 'happiny', 'larvitar', 'dratini', 'raikou', 'entei', 'suicune', 'delibird', 'shuckle'
        ];
        return !u.family || !excludedFamilies.includes(u.family);
    }),
    noviceOpponents: NOVICE_OPPONENTS,
    intermOpponents: INTERM_OPPONENTS,
    advancedOpponents: ADVANCED_OPPONENTS,
    eliteOpponents: ELITE_OPPONENTS,
    championOpponents: CHAMPION_OPPONENTS
};
