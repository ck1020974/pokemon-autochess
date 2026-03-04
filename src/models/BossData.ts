export interface OpponentDefinition {
    id: string;
    name: string;
    url: string; // Avatar/Image URL
    coreUnits: string[]; // List of template IDs for their core units
    preferredSynergies?: string[]; // E.g., ['Water', 'Starter']
}

export const NOVICE_OPPONENTS: OpponentDefinition[] = [
    { id: 'novice_1', name: '武藏', url: 'gym/武藏.webp', coreUnits: ['meowth'] },
    { id: 'novice_2', name: '小次郎', url: 'gym/小次郎.webp', coreUnits: ['meowth'] },
    { id: 'novice_3', name: '小剛', url: 'gym/小剛01.webp', coreUnits: ['mankey', 'dwebble', 'diglett'] },
    { id: 'novice_4', name: '小霞', url: 'gym/小霞01.webp', coreUnits: ['squirtle', 'igglybuff'] },
    { id: 'novice_5', name: '葉子', url: 'gym/葉子.webp', coreUnits: ['bulbasaur', 'igglybuff'] },
    { id: 'novice_6', name: '克麗絲', url: 'gym/克麗絲.webp', coreUnits: ['totodile'] },
    { id: 'novice_7', name: '阿響', url: 'gym/阿響.webp', coreUnits: ['cyndaquil'] },
    { id: 'novice_8', name: '琴音', url: 'gym/琴音.webp', coreUnits: ['chikorita'] },
    { id: 'novice_9', name: '青綠', url: 'gym/青綠01.webp', coreUnits: ['charmander', 'rattata'] },
    { id: 'novice_10', name: '松葉', url: 'gym/松葉.webp', coreUnits: ['drifloon', 'gastly'] },
    { id: 'novice_11', name: '杜娟', url: 'gym/杜娟.webp', coreUnits: ['dwebble', 'dwebble', 'diglett'] },
    { id: 'novice_12', name: '藤樹', url: 'gym/藤樹.webp', coreUnits: ['mankey', 'mankey', 'mankey'] },
    { id: 'novice_13', name: '馬志士', url: 'gym/馬志士.webp', coreUnits: ['magnemite', 'magnemite', 'magnemite'] },
    { id: 'novice_14', name: '菜種', url: 'gym/菜種.webp', coreUnits: ['bulbasaur', 'bulbasaur', 'bulbasaur'] },
];

export const INTERM_OPPONENTS: OpponentDefinition[] = [
    { id: 'interm_1', name: '小悠', url: 'gym/小悠.webp', coreUnits: ['treecko', 'treecko'] },
    { id: 'interm_2', name: '小遙', url: 'gym/小遙.webp', coreUnits: ['torchic', 'mudkip'] },
    { id: 'interm_3', name: '滿充', url: 'gym/滿充.webp', coreUnits: ['ralts', 'ralts', 'magnemite'] },
    { id: 'interm_4', name: '小剛', url: 'gym/小剛02.webp', coreUnits: ['mudkip', 'diglett', 'dwebble'] },
    { id: 'interm_5', name: '小霞', url: 'gym/小霞02.webp', coreUnits: ['squirtle', 'totodile', 'slowpoke'] },
    { id: 'interm_6', name: '青綠', url: 'gym/青綠02.webp', coreUnits: ['squirtle', 'charmander', 'bulbasaur', 'doduo', 'rattata'] },
    { id: 'interm_7', name: '梅麗莎', url: 'gym/梅麗莎.webp', coreUnits: ['shuppet', 'drifloon', 'gastly', 'gastly'] },
    { id: 'interm_8', name: '亞莎', url: 'gym/亞莎.webp', coreUnits: ['torchic', 'houndour', 'cyndaquil'] },
    { id: 'interm_9', name: '阿四', url: 'gym/阿四.webp', coreUnits: ['mankey', 'pinsir', 'heracross'] },
    { id: 'interm_10', name: '莉佳', url: 'gym/莉佳.webp', coreUnits: ['bulbasaur', 'chikorita', 'snover'] },
    { id: 'interm_11', name: '亞堤', url: 'gym/亞堤.webp', coreUnits: ['dwebble', 'dwebble', 'pinsir', 'heracross'] },
    { id: 'interm_12', name: '希特隆', url: 'gym/希特隆.webp', coreUnits: ['magnemite', 'magnemite', 'magnemite'] },
    { id: 'interm_13', name: '阿筆', url: 'gym/阿筆.webp', coreUnits: ['pinsir', 'heracross', 'dwebble', 'dwebble'] },
    { id: 'interm_13', name: '小茜', url: 'gym/小茜.webp', coreUnits: ['igglybuff', 'igglybuff'] },
];

export const ADVANCED_OPPONENTS: OpponentDefinition[] = [
    { id: 'adv_1', name: '坂木', url: 'gym/坂木.webp', coreUnits: ['meowth', 'mankey', 'kangaskhan', 'kangaskhan', 'onix'] },
    { id: 'adv_2', name: '小菘', url: 'gym/小菘.webp', coreUnits: ['snover', 'snover', 'sneasel'] },
    { id: 'adv_3', name: '阿蜜', url: 'gym/阿蜜.webp', coreUnits: ['magnemite', 'magnemite', 'onix', 'onix'] },
    { id: 'adv_4', name: '千里', url: 'gym/千里.webp', coreUnits: ['kangaskhan', 'kangaskhan', 'rattata'] },
    { id: 'adv_5', name: '小青', url: 'gym/小青.webp', coreUnits: ['sprigatito', 'fuecoco'] },
    { id: 'adv_6', name: '小春', url: 'gym/小春.webp', coreUnits: ['fuecoco', 'quaxly'] },
    { id: 'adv_7', name: '妮莫', url: 'gym/妮莫.webp', coreUnits: ['sprigatito', 'quaxly'] },
    { id: 'adv_8', name: '歐尼奧', url: 'gym/歐尼奧.webp', coreUnits: ['mimikyu', 'gastly', 'gastly', 'shuppet'] },
    { id: 'adv_9', name: '瑪綉', url: 'gym/瑪綉.webp', coreUnits: ['igglybuff', 'igglybuff', 'ralts', 'natu', 'slowpoke'] },
    { id: 'adv_10', name: '小智', url: 'gym/小智.webp', coreUnits: ['bulbasaur', 'treecko', 'gastly', 'mankey', 'charmander'] },
    { id: 'adv_11', name: '青綠', url: 'gym/青綠03.webp', coreUnits: ['charmander', 'squirtle', 'rattata', 'bulbasaur', 'doduo'] },
    { id: 'adv_12', name: '小銀', url: 'gym/小銀.webp', coreUnits: ['cyndaquil', 'chikorita', 'totodile', 'sneasel', 'magnemite'] },
];

export const ELITE_OPPONENTS: OpponentDefinition[] = [
    { id: 'elite_1', name: '竹蘭', url: 'champion/竹蘭01.webp', coreUnits: ['spiritomb', 'igglybuff', 'drifloon', 'mimikyu', 'gastly'] },
    { id: 'elite_2', name: '卡露妮', url: 'champion/卡露妮01.webp', coreUnits: ['ralts', 'natu', 'slowpoke', 'igglybuff', 'igglybuff'] },
    { id: 'elite_3', name: '阿渡', url: 'elitefour/阿渡.webp', coreUnits: ['doduo', 'magnemite', 'diglett', 'charmander', 'onix'] },
    { id: 'elite_4', name: '大吾', url: 'champion/大吾01.webp', coreUnits: ['dwebble', 'onix', 'mudkip', 'magnemite', 'diglett'] },
    { id: 'elite_5', name: '赤紅', url: 'champion/赤紅01.webp', coreUnits: ['charmander', 'squirtle', 'bulbasaur', 'slowpoke', 'farfetchd'] },
    { id: 'elite_6', name: '丹帝', url: 'champion/丹帝01.webp', coreUnits: ['charmander', 'gastly', 'heracross', 'pinsir', 'drifloon'] },
    { id: 'elite_7', name: '小智', url: 'gym/小智.webp', coreUnits: ['farfetchd', 'treecko', 'gastly', 'mrmime', 'charmander'] },
    { id: 'elite_8', name: '柯拿', url: 'elitefour/科拿.webp', coreUnits: ['slowpoke', 'snover', 'sneasel', 'squirtle', 'quaxly'] },
    { id: 'elite_9', name: '希巴', url: 'elitefour/希巴.webp', coreUnits: ['mankey', 'dwebble', 'onix', 'heracross', 'pinsir'] },
    { id: 'elite_10', name: '菊子', url: 'elitefour/菊子.webp', coreUnits: ['gastly', 'shuppet', 'gastly', 'mimikyu', 'drifloon'] },
    { id: 'elite_11', name: '梨花', url: 'elitefour/梨花.webp', coreUnits: ['spiritomb', 'houndour', 'sneasel', 'gastly'] },
    { id: 'elite_12', name: '阿柳', url: 'elitefour/阿柳.webp', coreUnits: ['bulbasaur', 'chikorita', 'heracross', 'sceptile', 'dwebble'] },
    { id: 'elite_13', name: '大葉', url: 'elitefour/大葉.webp', coreUnits: ['drifloon', 'onix', 'torchic', 'houndour', 'fuecoco'] },
    { id: 'elite_14', name: '小剛', url: 'gym/小剛03.webp', coreUnits: ['mudkip', 'diglett', 'dwebble', 'onix', 'onix'] },
    { id: 'elite_15', name: '小霞', url: 'gym/小霞03.webp', coreUnits: ['mudkip', 'squirtle', 'slowpoke', 'totodile', 'quaxly'] },
    { id: 'elite_16', name: '赤焰松', url: 'elitefour/赤焰松.webp', coreUnits: ['houndour', 'shuppet', 'torchic', 'charmander', 'fuecoco'] },
    { id: 'elite_17', name: '水梧桐', url: 'elitefour/水梧桐.webp', coreUnits: ['totodile', 'sneasel', 'mudkip', 'squirtle', 'quaxly'] },
    { id: 'elite_18', name: '大木博士', url: 'elitefour/大木博士.webp', coreUnits: ['charmander', 'squirtle', 'bulbasaur', 'ditto', 'mrmime'] },
    { id: 'elite_19', name: '花月', url: 'elitefour/花月.webp', coreUnits: ['rattata', 'treecko', 'houndour', 'mimikyu', 'sneasel'] },
    { id: 'elite_20', name: '芙蓉', url: 'elitefour/芙蓉.webp', coreUnits: ['sableye', 'sableye', 'shuppet', 'shuppet', 'gastly'] },
    { id: 'elite_21', name: '一樹', url: 'elitefour/一樹.webp', coreUnits: ['natu', 'natu', 'slowpoke', 'ralts', 'mrmime'] },
    { id: 'elite_22', name: '赤日', url: 'elitefour/赤日.webp', coreUnits: ['sneasel', 'houndour', 'houndour', 'abomasnow_final', 'spiritomb'] },
];

export const CHAMPION_OPPONENTS: OpponentDefinition[] = [
    { id: 'champion_1', name: '竹蘭', url: 'champion/竹蘭02.webp', coreUnits: ['spiritomb', 'sneasel', 'snover', 'mimikyu', 'gastly'] },
    { id: 'champion_2', name: '卡露妮', url: 'champion/卡露妮02.webp', coreUnits: ['ralts', 'natu', 'slowpoke', 'igglybuff', 'mrmime'] },
    { id: 'champion_3', name: '大吾', url: 'champion/大吾02.webp', coreUnits: ['dwebble', 'onix', 'mudkip', 'torchic', 'sableye'] },
    { id: 'champion_4', name: '赤紅', url: 'champion/赤紅02.webp', coreUnits: ['charmander', 'squirtle', 'bulbasaur', 'slowpoke', 'farfetchd'] },
    { id: 'champion_5', name: '丹帝', url: 'champion/丹帝02.webp', coreUnits: ['charmander', 'gastly', 'heracross', 'farfetchd', 'drifloon'] },
    { id: 'champion_6', name: '小智', url: 'gym/小智.webp', coreUnits: ['farfetchd', 'treecko', 'gastly', 'mrmime', 'charmander'] },
];
