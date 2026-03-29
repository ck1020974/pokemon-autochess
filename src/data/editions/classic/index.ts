import type { GameEdition } from '../../../models/Edition';
import { ALL_UNITS } from '../../AllUnits';
import {
    NOVICE_OPPONENTS,
    INTERM_OPPONENTS,
    ADVANCED_OPPONENTS,
    ELITE_OPPONENTS,
    CHAMPION_OPPONENTS
} from '../../opponents/classic';

export const ClassicEdition: GameEdition = {
    id: 'classic',
    name: '作者：柚C老師',
    /** 
     * The Classic edition includes ALL current units. 
     * We just extract all the keys from the ALL_UNITS pool.
     */
    availableUnitIds: Object.keys(ALL_UNITS).filter(id => {
        const u = ALL_UNITS[id];
        const excludedFamilies = [
            'caterpie', 'cleffa', 'togepi', 'ekans', 'wynaut', 'geodude', 'mankey',
            'pichu', 'eevee', 'vulpix', 'bellsprout', 'psyduck', 'mareep',
            'cubone', 'murkrow', 'bonsly', 'happiny', 'larvitar', 'dratini', 'raikou', 'entei', 'suicune', 'delibird', 'shuckle', 'riolu',
            'cramorant', 'comfey', 'mawile', 'grubbin', 'croagunk', 'munna', 'wooper', 'pumpkaboo', 'growlithe', 'swablu', 'plusle', 'minun', 'gulpin',
            'trapinch', 'pawmi', 'spheal', 'bagon', 'shinx', 'aron', 'darkrai', 'cresselia'
        ];
        return !u.family || !excludedFamilies.includes(u.family);
    }),
    noviceOpponents: NOVICE_OPPONENTS,
    intermOpponents: INTERM_OPPONENTS,
    advancedOpponents: ADVANCED_OPPONENTS,
    eliteOpponents: ELITE_OPPONENTS,
    championOpponents: CHAMPION_OPPONENTS
};
