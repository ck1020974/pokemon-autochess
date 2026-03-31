export interface OpponentDefinition {
    id: string;
    name: string;
    url: string; // Avatar/Image URL
    coreUnits: string[]; // List of template IDs for their core units
    difficulty: 'EASY' | 'NORMAL' | 'HARD' | 'VERY_HARD';
    preferredSynergies?: string[]; // E.g., ['Water', 'Starter']
}

export const NOVICE_OPPONENTS: OpponentDefinition[] = [
    { id: 'novice_1', name: '武藏', url: 'gym/武藏.webp', coreUnits: ['meowth'], difficulty: 'EASY' },
    { id: 'novice_2', name: '小次郎', url: 'gym/小次郎.webp', coreUnits: ['meowth'], difficulty: 'EASY' },
    { id: 'novice_3', name: '小剛', url: 'gym/小剛01.webp', coreUnits: ['geodude', 'dwebble', 'croagunk'], difficulty: 'NORMAL' },
    { id: 'novice_4', name: '小霞', url: 'gym/小霞01.webp', coreUnits: ['squirtle', 'igglybuff'], difficulty: 'EASY' },
    { id: 'novice_5', name: '葉子', url: 'gym/葉子01.webp', coreUnits: ['bulbasaur', 'igglybuff'], difficulty: 'EASY' },
    { id: 'novice_6', name: '克麗絲', url: 'gym/克麗絲01.webp', coreUnits: ['totodile'], difficulty: 'EASY' },
    { id: 'novice_7', name: '阿響', url: 'gym/阿響01.webp', coreUnits: ['cyndaquil'], difficulty: 'NORMAL' },
    { id: 'novice_8', name: '琴音', url: 'gym/琴音01.webp', coreUnits: ['chikorita'], difficulty: 'EASY' },
    { id: 'novice_9', name: '青綠', url: 'gym/青綠01.webp', coreUnits: ['charmander', 'rattata'], difficulty: 'EASY' },
    { id: 'novice_10', name: '松葉', url: 'gym/松葉.webp', coreUnits: ['drifloon', 'gastly'], difficulty: 'NORMAL' },
    { id: 'novice_11', name: '杜娟', url: 'gym/杜娟.webp', coreUnits: ['dwebble', 'diglett', 'diglett'], difficulty: 'HARD' },
    { id: 'novice_12', name: '藤樹', url: 'gym/藤樹.webp', coreUnits: ['mankey', 'mankey', 'mankey'], difficulty: 'EASY' },
    { id: 'novice_13', name: '馬志士', url: 'gym/馬志士.webp', coreUnits: ['magnemite', 'magnemite', 'magnemite'], difficulty: 'EASY' },
    { id: 'novice_14', name: '菜種', url: 'gym/菜種.webp', coreUnits: ['bulbasaur', 'bulbasaur', 'bulbasaur'], difficulty: 'HARD' },
    { id: 'novice_15', name: '莉莉艾', url: 'gym/莉莉艾01.webp', coreUnits: ['igglybuff', 'igglybuff', 'squirtle'], difficulty: 'EASY' },
];

export const INTERM_OPPONENTS: OpponentDefinition[] = [
    { id: 'interm_1', name: '小悠', url: 'gym/小悠01.webp', coreUnits: ['treecko', 'treecko'], difficulty: 'EASY' },
    { id: 'interm_2', name: '小遙', url: 'gym/小遙01.webp', coreUnits: ['torchic', 'mudkip'], difficulty: 'EASY' },
    { id: 'interm_3', name: '滿充', url: 'gym/滿充01.webp', coreUnits: ['ralts', 'igglybuff', 'magnemite'], difficulty: 'NORMAL' },
    { id: 'interm_4', name: '小剛', url: 'gym/小剛02.webp', coreUnits: ['mudkip', 'diglett', 'dwebble'], difficulty: 'EASY' },
    { id: 'interm_5', name: '小霞', url: 'gym/小霞02.webp', coreUnits: ['squirtle', 'totodile', 'slowpoke'], difficulty: 'EASY' },
    { id: 'interm_6', name: '青綠', url: 'gym/青綠02.webp', coreUnits: ['squirtle', 'charmander', 'bulbasaur', 'doduo', 'rattata'], difficulty: 'NORMAL' },
    { id: 'interm_7', name: '梅麗莎', url: 'gym/梅麗莎.webp', coreUnits: ['shuppet', 'drifloon', 'gastly', 'gastly'], difficulty: 'NORMAL' },
    { id: 'interm_8', name: '亞莎', url: 'gym/亞莎.webp', coreUnits: ['torchic', 'houndour', 'cyndaquil'], difficulty: 'NORMAL' },
    { id: 'interm_9', name: '阿四', url: 'gym/阿四.webp', coreUnits: ['mankey', 'pinsir', 'heracross'], difficulty: 'EASY' },
    { id: 'interm_10', name: '莉佳', url: 'gym/莉佳01.webp', coreUnits: ['bulbasaur', 'chikorita', 'snover'], difficulty: 'EASY' },
    { id: 'interm_11', name: '亞堤', url: 'gym/亞堤.webp', coreUnits: ['dwebble', 'dwebble', 'pinsir', 'heracross'], difficulty: 'NORMAL' },
    { id: 'interm_12', name: '希特隆', url: 'gym/希特隆.webp', coreUnits: ['magnemite', 'magnemite', 'doduo', 'diglett'], difficulty: 'VERY_HARD' },
    { id: 'interm_13', name: '阿筆', url: 'gym/阿筆.webp', coreUnits: ['pinsir', 'heracross', 'dwebble', 'dwebble'], difficulty: 'NORMAL' },
    { id: 'interm_14', name: '小茜', url: 'gym/小茜.webp', coreUnits: ['igglybuff', 'igglybuff'], difficulty: 'EASY' },
    { id: 'interm_15', name: '小楓', url: 'gym/小楓.webp', coreUnits: ['natu', 'natu', 'ralts'], difficulty: 'HARD' },
    { id: 'interm_16', name: '小南', url: 'gym/小南.webp', coreUnits: ['natu', 'natu', 'slowpoke'], difficulty: 'EASY' },
    { id: 'interm_17', name: '阿馴', url: 'gym/阿馴.webp', coreUnits: ['heracross'], difficulty: 'EASY' },
    { id: 'interm_18', name: '瓢太', url: 'gym/瓢太.webp', coreUnits: ['magnemite', 'dwebble', 'dwebble'], difficulty: 'EASY' },
    { id: 'interm_19', name: '葉子', url: 'gym/葉子02.webp', coreUnits: ['bulbasaur', 'treecko', 'squirtle', 'slowpoke'], difficulty: 'HARD' },
    { id: 'interm_20', name: '格拉吉歐', url: 'gym/格拉吉歐01.webp', coreUnits: ['charmander', 'gastly', 'houndour'], difficulty: 'EASY' },
];

export const ADVANCED_OPPONENTS: OpponentDefinition[] = [
    { id: 'adv_1', name: '坂木', url: 'gym/坂木.webp', coreUnits: ['meowth', 'mankey', 'kangaskhan', 'kangaskhan', 'onix'], difficulty: 'HARD' },
    { id: 'adv_2', name: '小菘', url: 'gym/小菘.webp', coreUnits: ['snover', 'snover', 'sneasel'], difficulty: 'NORMAL' },
    { id: 'adv_3', name: '阿蜜', url: 'gym/阿蜜.webp', coreUnits: ['magnemite', 'magnemite', 'onix', 'onix'], difficulty: 'VERY_HARD' },
    { id: 'adv_4', name: '千里', url: 'gym/千里.webp', coreUnits: ['kangaskhan', 'kangaskhan', 'rattata'], difficulty: 'HARD' },
    { id: 'adv_5', name: '小青', url: 'gym/小青.webp', coreUnits: ['sprigatito', 'fuecoco'], difficulty: 'NORMAL' },
    { id: 'adv_6', name: '小春', url: 'gym/小春.webp', coreUnits: ['fuecoco', 'quaxly'], difficulty: 'NORMAL' },
    { id: 'adv_7', name: '妮莫', url: 'gym/妮莫.webp', coreUnits: ['sprigatito', 'quaxly'], difficulty: 'EASY' },
    { id: 'adv_8', name: '歐尼奧', url: 'gym/歐尼奧.webp', coreUnits: ['mimikyu', 'gastly', 'gastly', 'shuppet'], difficulty: 'HARD' },
    { id: 'adv_9', name: '瑪綉', url: 'gym/瑪綉.webp', coreUnits: ['igglybuff', 'igglybuff', 'ralts', 'natu', 'slowpoke'], difficulty: 'NORMAL' },
    { id: 'adv_10', name: '小智', url: 'gym/小智.webp', coreUnits: ['bulbasaur', 'treecko', 'gastly', 'mankey', 'charmander'], difficulty: 'NORMAL' },
    { id: 'adv_11', name: '青綠', url: 'gym/青綠03.webp', coreUnits: ['charmander', 'squirtle', 'rattata', 'bulbasaur', 'doduo'], difficulty: 'NORMAL' },
    { id: 'adv_12', name: '小銀', url: 'gym/小銀.webp', coreUnits: ['cyndaquil', 'chikorita', 'totodile', 'sneasel', 'magnemite'], difficulty: 'HARD' },
    { id: 'adv_13', name: '得撫', url: 'gym/得撫.webp', coreUnits: ['snover', 'snover', 'sneasel'], difficulty: 'NORMAL' },
    { id: 'adv_14', name: '琴音', url: 'gym/琴音02.webp', coreUnits: ['bulbasaur', 'chikorita', 'snover'], difficulty: 'EASY' },
    { id: 'adv_15', name: '阿響', url: 'gym/阿響02.webp', coreUnits: ['charmander', 'cyndaquil', 'mankey', 'gastly'], difficulty: 'EASY' },
    { id: 'adv_16', name: '滿充', url: 'gym/滿充02.webp', coreUnits: ['ralts', 'sprigatito'], difficulty: 'HARD' },
    { id: 'adv_17', name: '小遙', url: 'gym/小遙02.webp', coreUnits: ['torchic', 'torchic', 'mudkip', 'ralts', 'igglybuff'], difficulty: 'HARD' },
    { id: 'adv_18', name: '小悠', url: 'gym/小悠02.webp', coreUnits: ['rattata', 'rattata', 'mudkip', 'treecko', 'treecko'], difficulty: 'VERY_HARD' },
    { id: 'adv_19', name: '格拉吉歐', url: 'gym/格拉吉歐02.webp', coreUnits: ['sneasel', 'sprigatito', 'houndour'], difficulty: 'HARD' },
];

export const ELITE_OPPONENTS: OpponentDefinition[] = [
    { id: 'elite_1', name: '竹蘭', url: 'champion/竹蘭01.webp', coreUnits: ['spiritomb', 'ditto', 'drifloon', 'mimikyu', 'gastly'], difficulty: 'VERY_HARD' },
    { id: 'elite_2', name: '卡露妮', url: 'champion/卡露妮01.webp', coreUnits: ['ralts', 'natu', 'slowpoke', 'igglybuff', 'igglybuff'], difficulty: 'EASY' },
    { id: 'elite_3', name: '阿渡', url: 'elitefour/阿渡01.webp', coreUnits: ['doduo', 'magnemite', 'diglett', 'charmander', 'onix'], difficulty: 'NORMAL' },
    { id: 'elite_4', name: '大吾', url: 'champion/大吾01.webp', coreUnits: ['dwebble', 'onix', 'mudkip', 'magnemite', 'diglett'], difficulty: 'NORMAL' },
    { id: 'elite_5', name: '赤紅', url: 'champion/赤紅01.webp', coreUnits: ['charmander', 'squirtle', 'bulbasaur', 'slowpoke', 'farfetchd'], difficulty: 'EASY' },
    { id: 'elite_6', name: '丹帝', url: 'champion/丹帝01.webp', coreUnits: ['charmander', 'gastly', 'heracross', 'pinsir', 'drifloon'], difficulty: 'NORMAL' },
    { id: 'elite_7', name: '小智', url: 'gym/小智.webp', coreUnits: ['farfetchd', 'treecko', 'gastly', 'mrmime', 'charmander'], difficulty: 'NORMAL' },
    { id: 'elite_8', name: '柯拿', url: 'elitefour/科拿.webp', coreUnits: ['slowpoke', 'snover', 'sneasel', 'squirtle', 'quaxly'], difficulty: 'NORMAL' },
    { id: 'elite_9', name: '希巴', url: 'elitefour/希巴.webp', coreUnits: ['mankey', 'farfetchd', 'onix', 'heracross', 'pinsir'], difficulty: 'HARD' },
    { id: 'elite_10', name: '菊子', url: 'elitefour/菊子.webp', coreUnits: ['gastly', 'shuppet', 'gastly', 'mimikyu', 'drifloon'], difficulty: 'HARD' },
    { id: 'elite_11', name: '梨花', url: 'elitefour/梨花.webp', coreUnits: ['spiritomb', 'houndour', 'sneasel', 'gastly', 'kangaskhan'], difficulty: 'VERY_HARD' },
    { id: 'elite_12', name: '阿柳', url: 'elitefour/阿柳.webp', coreUnits: ['ivysaur', 'grovyle', 'pinsir', 'heracross', 'crustle'], difficulty: 'EASY' },
    { id: 'elite_13', name: '大葉', url: 'elitefour/大葉.webp', coreUnits: ['drifloon', 'onix', 'torchic', 'houndour', 'fuecoco'], difficulty: 'HARD' },
    { id: 'elite_14', name: '小剛', url: 'gym/小剛03.webp', coreUnits: ['mudkip', 'diglett', 'dwebble', 'onix', 'onix'], difficulty: 'HARD' },
    { id: 'elite_15', name: '小霞', url: 'gym/小霞03.webp', coreUnits: ['mudkip', 'squirtle', 'slowpoke', 'totodile', 'quaxly'], difficulty: 'NORMAL' },
    { id: 'elite_18', name: '大木博士', url: 'elitefour/大木博士.webp', coreUnits: ['charmander', 'squirtle', 'bulbasaur', 'ditto', 'mrmime'], difficulty: 'NORMAL' },
    { id: 'elite_19', name: '花月', url: 'elitefour/花月.webp', coreUnits: ['rattata', 'treecko', 'houndour', 'mimikyu', 'sneasel'], difficulty: 'HARD' },
    { id: 'elite_20', name: '芙蓉', url: 'elitefour/芙蓉.webp', coreUnits: ['sableye', 'shuppet', 'shuppet', 'gastly'], difficulty: 'HARD' },
    { id: 'elite_21', name: '一樹', url: 'elitefour/一樹.webp', coreUnits: ['natu', 'natu', 'slowpoke', 'ralts', 'mrmime'], difficulty: 'HARD' },
    { id: 'elite_22', name: '赤日', url: 'elitefour/赤日.webp', coreUnits: ['sneasel', 'houndour', 'gastly', 'snover', 'spiritomb'], difficulty: 'VERY_HARD' },
    { id: 'elite_23', name: '帕琦拉', url: 'elitefour/帕琦拉.webp', coreUnits: ['houndour', 'houndour', 'sableye', 'cyndaquil', 'gastly'], difficulty: 'VERY_HARD' },
];

export const CHAMPION_OPPONENTS: OpponentDefinition[] = [
    { id: 'champion_1', name: '竹蘭', url: 'champion/竹蘭02.webp', coreUnits: ['spiritomb', 'sneasel', 'snover', 'mimikyu', 'gastly'], difficulty: 'HARD' },
    { id: 'champion_2', name: '卡露妮', url: 'champion/卡露妮02.webp', coreUnits: ['ralts', 'natu', 'slowpoke', 'igglybuff', 'mrmime'], difficulty: 'HARD' },
    { id: 'champion_3', name: '大吾', url: 'champion/大吾02.webp', coreUnits: ['dwebble', 'onix', 'mudkip', 'torchic', 'sableye'], difficulty: 'VERY_HARD' },
    { id: 'champion_4', name: '赤紅', url: 'champion/赤紅02.webp', coreUnits: ['charmeleon', 'wartortle', 'ivysaur', 'farfetchd', 'ditto', 'kangaskhan'], difficulty: 'EASY' },
    { id: 'champion_5', name: '丹帝', url: 'champion/丹帝02.webp', coreUnits: ['charmander', 'gastly', 'heracross', 'farfetchd', 'drifloon'], difficulty: 'HARD' },
    { id: 'champion_6', name: '小智', url: 'gym/小智.webp', coreUnits: ['farfetchd', 'treecko', 'gastly', 'mrmime', 'charmander'], difficulty: 'NORMAL' },
    { id: 'champion_7', name: '赤焰松', url: 'elitefour/赤焰松.webp', coreUnits: ['houndour', 'shuppet', 'torchic', 'charmander', 'fuecoco'], difficulty: 'VERY_HARD' },
    { id: 'champion_8', name: '水梧桐', url: 'elitefour/水梧桐.webp', coreUnits: ['totodile', 'sneasel', 'mudkip', 'squirtle', 'quaxly'], difficulty: 'NORMAL' },
];
