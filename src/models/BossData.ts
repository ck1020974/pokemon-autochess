

export interface OpponentDefinition {
    id: string;
    name: string;
    url: string; // Avatar/Image URL
    coreUnits: string[]; // List of template IDs for their core units
    preferredSynergies?: string[]; // E.g., ['Water', 'Starter']
}

export const GYM_LEADERS: OpponentDefinition[] = [
    { id: 'gym1', name: '小青', url: '/npc/小青.webp', coreUnits: ['sprigatito'] },
    { id: 'gym2', name: '小春', url: '/npc/小春.webp', coreUnits: ['fuecoco'] },
    { id: 'gym3', name: '小剛', url: '/npc/小剛.webp', coreUnits: ['onix', 'steelix_final'] },
    { id: 'gym4', name: '小悠', url: '/npc/小悠.webp', coreUnits: ['treecko', 'sceptile'] },
    { id: 'gym5', name: '小遙', url: '/npc/小遙.webp', coreUnits: ['torchic', 'blaziken', 'mudkip', 'swampert'] },
    { id: 'gym6', name: '小霞', url: '/npc/小霞.webp', coreUnits: ['slowpoke', 'slowbro_final', 'squirtle', 'blastoise'] },
    { id: 'gym7', name: '克麗絲', url: '/npc/克麗絲.webp', coreUnits: ['totodile', 'feraligatr'] },
    { id: 'gym8', name: '坂木', url: '/npc/坂木.webp', coreUnits: ['persian_final'] },
    { id: 'gym9', name: '阿響', url: '/npc/阿響.webp', coreUnits: ['cyndaquil', 'typhlosion'] },
    { id: 'gym10', name: '琴音', url: '/npc/琴音.webp', coreUnits: ['chikorita', 'meganium'] },
    { id: 'gym11', name: '葉子', url: '/npc/葉子.webp', coreUnits: ['bulbasaur', 'venusaur', 'igglybuff', 'wigglytuff'] },
    { id: 'gym12', name: '滿充', url: '/npc/滿充.webp', coreUnits: ['ralts', 'gardevoir'] },
    { id: 'gym13', name: '武藏', url: '/npc/武藏.webp', coreUnits: ['meowth'] },
    { id: 'gym14', name: '小次郎', url: '/npc/小次郎.webp', coreUnits: ['meowth'] },
    { id: 'gym15', name: '小菘', url: '/npc/小菘.webp', coreUnits: ['snover', 'abomasnow_final', 'sneasel', 'weavile_final'] },
    { id: 'gym16', name: '小茜', url: '/npc/小茜.webp', coreUnits: ['kangaskhan', 'igglybuff', 'wigglytuff'] },
    { id: 'gym17', name: '松葉', url: '/npc/松葉.webp', coreUnits: ['shuppet', 'banette_final', 'drifloon', 'drifblim_final'] },
    { id: 'gym18', name: '阿蜜', url: '/npc/阿蜜.webp', coreUnits: ['magnemite', 'magneton_final', 'steelix_final'] },
];

export const ELITE_FOUR: OpponentDefinition[] = [
    { id: 'e4_1', name: '柯拿', url: '/npc/柯拿.webp', coreUnits: ['slowbro_final', 'abomasnow_final', 'weavile_final', 'blastoise', 'quaquaval'] },
    { id: 'e4_2', name: '希巴', url: '/npc/希巴.webp', coreUnits: ['primeape_final', 'onix', 'steelix_final', 'heracross', 'pinsir'] },
    { id: 'e4_3', name: '菊子', url: '/npc/菊子.webp', coreUnits: ['gengar', 'banette_final', 'haunter', 'mimikyu_3', 'drifblim_final'] },
    { id: 'e4_4', name: '梨花', url: '/npc/梨花.webp', coreUnits: ['spiritomb', 'houndoom_final', 'weavile_final', 'gengar', 'drifblim_final'] },
    { id: 'e4_5', name: '阿柳', url: '/npc/阿柳.webp', coreUnits: ['venusaur', 'meganium', 'heracross', 'pinsir', 'dwebble'] },
    { id: 'e4_6', name: '大葉', url: '/npc/大葉.webp', coreUnits: ['drifblim_final', 'steelix_final', 'blaziken', 'houndoom_final', 'skeledirge'] },
    { id: 'e4_7', name: '小銀', url: '/npc/小銀.webp', coreUnits: ['typhlosion', 'meganium', 'feraligatr', 'sneasel', 'magneton_final'] },
];

export const CHAMPIONS: OpponentDefinition[] = [
    { id: 'champ1', name: '竹蘭', url: '/npc/竹蘭.webp', coreUnits: ['spiritomb', 'weavile_final', 'abomasnow_final', 'mimikyu_3', 'gengar'] },
    { id: 'champ2', name: '卡露妮', url: '/npc/卡露妮.webp', coreUnits: ['gardevoir', 'xatu_final', 'slowbro_final', 'wigglytuff', 'mrmime'] },
    { id: 'champ3', name: '阿渡', url: '/npc/阿渡.webp', coreUnits: ['dodrio_final', 'magneton_final', 'dugtrio_final', 'charizard', 'steelix_final'] },
    { id: 'champ4', name: '大吾', url: '/npc/大吾.webp', coreUnits: ['crustle_final', 'steelix_final', 'swampert', 'blaziken', 'sableye_3'] },
    { id: 'champ5', name: '赤紅', url: '/npc/赤紅.webp', coreUnits: ['charizard', 'blastoise', 'venusaur', 'slowbro_final', 'farfetchd'] },
    { id: 'champ6', name: '丹帝', url: '/npc/丹帝.webp', coreUnits: ['charizard', 'gengar', 'heracross', 'pinsir', 'drifblim_final'] },
    { id: 'champ7', name: '小智', url: '/npc/小智.webp', coreUnits: ['bulbasaur', 'sceptile', 'gengar', 'primeape_final', 'charizard'] },
];

