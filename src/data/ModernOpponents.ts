import type { OpponentDefinition } from './AllOpponents';

// ========== 帝王版本 (Modern Edition) 敵人名單 ==========

export const MODERN_NOVICE_OPPONENTS: OpponentDefinition[] = [
    // EASY
    { id: 'mn_1', name: '武藏', url: 'gym/武藏.webp', coreUnits: ['ekans', 'meowth'], difficulty: 'EASY' },
    { id: 'mn_2', name: '小次郎', url: 'gym/小次郎.webp', coreUnits: ['wynaut', 'meowth'], difficulty: 'EASY' },
    { id: 'mn_3', name: '小霞', url: 'gym/小霞01.webp', coreUnits: ['squirtle', 'clefairy'], difficulty: 'EASY' },
    { id: 'mn_4', name: '克莉絲', url: 'gym/克莉絲01.webp', coreUnits: ['totodile'], difficulty: 'EASY' },
    { id: 'mn_5', name: '琴音', url: 'gym/琴音01.webp', coreUnits: ['chikorita'], difficulty: 'EASY' },
    { id: 'mn_6', name: '馬志士', url: 'gym/馬志士.webp', coreUnits: ['pichu', 'magnemite', 'magnemite'], difficulty: 'EASY' },
    { id: 'mn_7', name: '莉莉艾', url: 'gym/莉莉艾.webp', coreUnits: ['clefairy', 'clefairy', 'eevee'], difficulty: 'EASY' },
    // NORMAL
    { id: 'mn_8', name: '葉子', url: 'gym/葉子01.webp', coreUnits: ['bulbasaur', 'clefairy'], difficulty: 'NORMAL' },
    { id: 'mn_9', name: '阿響', url: 'gym/阿響01.webp', coreUnits: ['cyndaquil'], difficulty: 'NORMAL' },
    { id: 'mn_10', name: '青綠', url: 'gym/青綠01.webp', coreUnits: ['charmander', 'doduo'], difficulty: 'NORMAL' },
    // HARD
    { id: 'mn_11', name: '小剛', url: 'gym/小剛01.webp', coreUnits: ['geodude', 'geodude', 'diglett'], difficulty: 'HARD' },
    { id: 'mn_12', name: '杜娟', url: 'gym/杜娟.webp', coreUnits: ['bonsly', 'geodude', 'diglett'], difficulty: 'HARD' },
    { id: 'mn_13', name: '青綠', url: 'gym/青綠02.webp', coreUnits: ['charmander', 'doduo'], difficulty: 'HARD' },
    { id: 'mn_14', name: '菜種', url: 'gym/菜種.webp', coreUnits: ['bulbasaur', 'bulbasaur', 'bulbasaur'], difficulty: 'HARD' },
    { id: 'mn_15', name: '小智', url: 'gym/小智.webp', coreUnits: ['charmander', 'pichu'], difficulty: 'HARD' },
];

export const MODERN_INTERM_OPPONENTS: OpponentDefinition[] = [
    // EASY
    { id: 'mi_1', name: '莉佳', url: 'gym/莉佳01.webp', coreUnits: ['bulbasaur', 'chikorita', 'bellsprout'], difficulty: 'EASY' },
    { id: 'mi_2', name: '小茜', url: 'gym/小茜.webp', coreUnits: ['clefairy', 'clefairy'], difficulty: 'EASY' },
    { id: 'mi_3', name: '阿馴', url: 'gym/阿馴.webp', coreUnits: ['heracross'], difficulty: 'EASY' },
    { id: 'mi_4', name: '瓢太', url: 'gym/瓢太.webp', coreUnits: ['magnemite', 'bonsly', 'geodude'], difficulty: 'EASY' },
    { id: 'mi_5', name: '武藏', url: 'gym/武藏.webp', coreUnits: ['ekans', 'ekans', 'wynaut', 'meowth'], difficulty: 'EASY' },
    // NORMAL
    { id: 'mi_6', name: '小次郎', url: 'gym/小次郎.webp', coreUnits: ['bellsprout', 'wynaut', 'meowth'], difficulty: 'NORMAL' },
    { id: 'mi_7', name: '小剛', url: 'gym/小剛02.webp', coreUnits: ['cubone', 'diglett', 'geodude', 'vulpix'], difficulty: 'NORMAL' },
    { id: 'mi_8', name: '亞堤', url: 'gym/亞堤.webp', coreUnits: ['caterpie', 'pinsir', 'heracross'], difficulty: 'NORMAL' },
    { id: 'mi_9', name: '阿筆', url: 'gym/阿筆.webp', coreUnits: ['pinsir', 'heracross', 'caterpie', 'caterpie'], difficulty: 'NORMAL' },
    { id: 'mi_10', name: '小南', url: 'gym/小南.webp', coreUnits: ['natu', 'natu', 'psyduck'], difficulty: 'NORMAL' },
    { id: 'mi_11', name: '小智', url: 'gym/小智.webp', coreUnits: ['bulbasaur', 'squirtle', 'charmander', 'pichu', 'chikorita'], difficulty: 'NORMAL' },
    // HARD
    { id: 'mi_12', name: '阿四', url: 'gym/阿四.webp', coreUnits: ['pinsir', 'pinsir', 'heracross', 'heracross'], difficulty: 'HARD' },
    { id: 'mi_13', name: '青綠', url: 'gym/青綠02.webp', coreUnits: ['squirtle', 'charmander', 'bulbasaur', 'doduo', 'umbreon'], difficulty: 'HARD' },
    { id: 'mi_14', name: '希特隆', url: 'gym/希特隆.webp', coreUnits: ['magnemite', 'magnemite', 'pichu'], difficulty: 'HARD' },
    { id: 'mi_15', name: '小楓', url: 'gym/小楓.webp', coreUnits: ['natu', 'natu', 'ralts'], difficulty: 'HARD' },
    { id: 'mi_16', name: '葉子', url: 'gym/葉子02.webp', coreUnits: ['bulbasaur', 'bellsprout', 'squirtle', 'psyduck'], difficulty: 'HARD' },
    // VERY_HARD
    { id: 'mi_17', name: '滿充', url: 'gym/滿充01.webp', coreUnits: ['espeon', 'clefairy', 'magnemite'], difficulty: 'VERY_HARD' },
    { id: 'mi_18', name: '格拉吉歐', url: 'gym/格拉吉歐01.webp', coreUnits: ['charmander', 'umbreon', 'flareon'], difficulty: 'VERY_HARD' },
    { id: 'mi_19', name: '亞莎', url: 'gym/亞莎.webp', coreUnits: ['flareon', 'vulpix', 'cyndaquil'], difficulty: 'VERY_HARD' },
    { id: 'mi_20', name: '小霞', url: 'gym/小霞02.webp', coreUnits: ['squirtle', 'psyduck', 'vaporeon'], difficulty: 'VERY_HARD' },
];

export const MODERN_ADVANCED_OPPONENTS: OpponentDefinition[] = [
    // EASY
    { id: 'ma_1', name: '琴音', url: 'gym/琴音02.webp', coreUnits: ['bulbasaur', 'chikorita', 'bellsprout'], difficulty: 'EASY' },
    // NORMAL
    { id: 'ma_2', name: '千里', url: 'gym/千里.webp', coreUnits: ['kangaskhan', 'kangaskhan', 'clefairy'], difficulty: 'NORMAL' },
    { id: 'ma_3', name: '小智', url: 'gym/小智.webp', coreUnits: ['bulbasaur', 'heracross', 'charmander', 'pichu', 'chikorita'], difficulty: 'NORMAL' },
    { id: 'ma_4', name: '青綠', url: 'gym/青綠03.webp', coreUnits: ['charmander', 'squirtle', 'umbreon', 'jolteon', 'bulbasaur'], difficulty: 'NORMAL' },
    { id: 'ma_5', name: '阿響', url: 'gym/阿響02.webp', coreUnits: ['charmander', 'cyndaquil', 'flareon', 'delibird'], difficulty: 'NORMAL' },
    // HARD
    { id: 'ma_6', name: '坂木', url: 'gym/坂木.webp', coreUnits: ['meowth', 'kangaskhan', 'kangaskhan', 'cubone', 'murkrow'], difficulty: 'HARD' },
    { id: 'ma_7', name: '小菘', url: 'gym/小菘.webp', coreUnits: ['glaceon', 'delibird', 'sneasel'], difficulty: 'HARD' },
    { id: 'ma_8', name: '阿蜜', url: 'gym/阿蜜.webp', coreUnits: ['magnemite', 'magnemite', 'mareep', 'pichu'], difficulty: 'HARD' },
    { id: 'ma_9', name: '瑪綉', url: 'gym/瑪綉.webp', coreUnits: ['clefairy', 'sylveon', 'natu', 'happiny'], difficulty: 'HARD' },
    { id: 'ma_10', name: '小銀', url: 'gym/小銀.webp', coreUnits: ['cyndaquil', 'chikorita', 'totodile', 'sneasel', 'magnemite'], difficulty: 'HARD' },
    { id: 'ma_11', name: '得撫', url: 'gym/得撫.webp', coreUnits: ['delibird', 'sneasel'], difficulty: 'HARD' },
    // VERY_HARD
    { id: 'ma_12', name: '滿充', url: 'gym/滿充02.webp', coreUnits: ['clefairy', 'happiny', 'togepi', 'espeon', 'sylveon'], difficulty: 'VERY_HARD' },
    { id: 'ma_13', name: '格拉吉歐', url: 'gym/格拉吉歐02.webp', coreUnits: ['sneasel', 'murkrow', 'umbreon'], difficulty: 'VERY_HARD' },
];

export const MODERN_ELITE_OPPONENTS: OpponentDefinition[] = [
    // EASY
    { id: 'me_1', name: '希巴', url: 'elitefour/希巴.webp', coreUnits: ['cubone', 'farfetchd', 'shuckle', 'heracross', 'pinsir'], difficulty: 'EASY' },
    { id: 'me_2', name: '阿柳', url: 'elitefour/阿柳.webp', coreUnits: ['ivysaur', 'caterpie', 'pinsir', 'heracross', 'shuckle'], difficulty: 'EASY' },
    // NORMAL
    { id: 'me_3', name: '卡露妮', url: 'champion/卡露妮01.webp', coreUnits: ['sylveon', 'natu', 'clefairy'], difficulty: 'NORMAL' },
    { id: 'me_4', name: '赤紅', url: 'champion/赤紅01.webp', coreUnits: ['charmander', 'squirtle', 'bulbasaur', 'pichu', 'farfetchd'], difficulty: 'NORMAL' },
    { id: 'me_5', name: '小剛', url: 'gym/小剛03.webp', coreUnits: ['mareep', 'happiny', 'geodude', 'vulpix', 'larvitar'], difficulty: 'NORMAL' },
    { id: 'me_6', name: '一樹', url: 'elitefour/一樹.webp', coreUnits: ['natu', 'natu', 'golduck', 'mrmime'], difficulty: 'NORMAL' },
    // HARD
    { id: 'me_7', name: '小霞', url: 'gym/小霞03.webp', coreUnits: ['vaporeon', 'squirtle', 'golduck', 'totodile', 'togepi'], difficulty: 'HARD' },
    { id: 'me_8', name: '小智', url: 'gym/小智.webp', coreUnits: ['farfetchd', 'larvitar', 'pichu', 'mrmime', 'charmander'], difficulty: 'HARD' },
    { id: 'me_9', name: '阿渡', url: 'elitefour/阿渡01.webp', coreUnits: ['doduo', 'magnemite', 'charmander', 'dratini', 'dratini'], difficulty: 'HARD' },
    { id: 'me_10', name: '大吾', url: 'champion/大吾01.webp', coreUnits: ['shuckle', 'larvitar', 'magnemite', 'diglett', 'cubone'], difficulty: 'HARD' },
    { id: 'me_11', name: '丹帝', url: 'champion/丹帝01.webp', coreUnits: ['charmander', 'dratini', 'heracross', 'pinsir', 'farfetchd'], difficulty: 'HARD' },
    { id: 'me_12', name: '柯拿', url: 'elitefour/科拿.webp', coreUnits: ['delibird', 'golduck', 'sneasel', 'squirtle', 'totodile'], difficulty: 'HARD' },
    { id: 'me_13', name: '梨花', url: 'elitefour/梨花.webp', coreUnits: ['umbreon', 'umbreon', 'sneasel', 'murkrow'], difficulty: 'HARD' },
    { id: 'me_14', name: '大木博士', url: 'elitefour/大木博士.webp', coreUnits: ['charmander', 'squirtle', 'bulbasaur', 'togepi', 'mrmime'], difficulty: 'HARD' },
    { id: 'me_15', name: '花月', url: 'elitefour/花月.webp', coreUnits: ['murkrow', 'meowth', 'sneasel', 'larvitar', 'umbreon'], difficulty: 'HARD' },
    // VERY_HARD
    { id: 'me_16', name: '赤焰松', url: 'elitefour/赤焰松.webp', coreUnits: ['entei', 'charmander', 'cyndaquil', 'bonsly', 'larvitar'], difficulty: 'VERY_HARD' },
    { id: 'me_17', name: '水梧桐', url: 'elitefour/水梧桐.webp', coreUnits: ['suicune', 'totodile', 'squirtle', 'bonsly', 'larvitar'], difficulty: 'VERY_HARD' },
    { id: 'me_18', name: '赤日', url: 'elitefour/赤日.webp', coreUnits: ['sneasel', 'murkrow', 'larvitar', 'larvitar', 'cubone'], difficulty: 'VERY_HARD' },
];

export const MODERN_CHAMPION_OPPONENTS: OpponentDefinition[] = [
    // NORMAL
    { id: 'mc_1', name: '赤紅', url: 'champion/赤紅02.webp', coreUnits: ['charmeleon', 'wartortle', 'ivysaur', 'farfetchd', 'kangaskhan'], difficulty: 'NORMAL' },
    // HARD
    { id: 'mc_2', name: '丹帝', url: 'champion/丹帝02.webp', coreUnits: ['charmander', 'dratini', 'heracross', 'pinsir', 'farfetchd'], difficulty: 'HARD' },
    // VERY_HARD
    { id: 'mc_3', name: '卡露妮', url: 'champion/卡露妮02.webp', coreUnits: ['happiny', 'natu', 'togepi', 'clefairy', 'mrmime'], difficulty: 'VERY_HARD' },
    { id: 'mc_4', name: '大吾', url: 'champion/大吾02.webp', coreUnits: ['shuckle', 'larvitar', 'larvitar', 'magnemite', 'diglett'], difficulty: 'VERY_HARD' },
    { id: 'mc_5', name: '小智', url: 'gym/小智.webp', coreUnits: ['farfetchd', 'dratini', 'larvitar', 'mrmime', 'charmander'], difficulty: 'VERY_HARD' },
];
