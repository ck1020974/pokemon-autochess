import type { OpponentDefinition } from '../data/opponents/classic';

export interface GameEdition {
    /** Edition ID, e.g., 'classic', 'expansion_a' */
    id: string;
    
    /** Edition Display Name */
    name: string;
    
    /** 
     * List of Unit Template IDs that are available/can be rolled in this edition.
     * Note: Evolved form IDs and 'isHiddenFromShop' units that can be summoned 
     * should also be included if they exist in this version.
     */
    availableUnitIds: string[];
    
    /** Opponents configured for this edition */
    noviceOpponents: OpponentDefinition[];
    intermOpponents: OpponentDefinition[];
    advancedOpponents: OpponentDefinition[];
    eliteOpponents: OpponentDefinition[];
    championOpponents: OpponentDefinition[];
}
