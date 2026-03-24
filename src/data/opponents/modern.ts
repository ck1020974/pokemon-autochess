import type { OpponentDefinition } from './classic';

// ========== 帝王版本 (Modern Edition) 敵人名單 ==========

export const MODERN_NOVICE_OPPONENTS: OpponentDefinition[] = [
    { id: 'mn_1', name: '武藏', url: 'gym/武藏.webp', coreUnits: ['ekans', 'meowth'], difficulty: 'EASY' },
    { id: 'mn_2', name: '小次郎', url: 'gym/小次郎.webp', coreUnits: ['wynaut', 'meowth'], difficulty: 'EASY' },
    { id: 'mn_3', name: '小霞', url: 'gym/小霞01.webp', coreUnits: ['squirtle', 'cleffa'], difficulty: 'EASY' },
    { id: 'mn_4', name: '克麗絲', url: 'gym/克麗絲01.webp', coreUnits: ['totodile'], difficulty: 'EASY' },
    { id: 'mn_5', name: '琴音', url: 'gym/琴音01.webp', coreUnits: ['chikorita'], difficulty: 'EASY' },
    { id: 'mn_6', name: '馬志士', url: 'gym/馬志士.webp', coreUnits: ['pichu', 'magnemite', 'magnemite'], difficulty: 'EASY' },
    { id: 'mn_7', name: '莉莉艾', url: 'gym/莉莉艾01.webp', coreUnits: ['cleffa', 'cleffa', 'eevee'], difficulty: 'EASY' },
    { id: 'mn_8', name: '葉子', url: 'gym/葉子01.webp', coreUnits: ['bulbasaur', 'cleffa'], difficulty: 'NORMAL' },
    { id: 'mn_9', name: '阿響', url: 'gym/阿響01.webp', coreUnits: ['cyndaquil'], difficulty: 'NORMAL' },
    { id: 'mn_10', name: '青綠', url: 'gym/青綠01.webp', coreUnits: ['charmander', 'squirtle'], difficulty: 'NORMAL' },
    { id: 'mn_11', name: '小剛', url: 'gym/小剛01.webp', coreUnits: ['geodude', 'geodude', 'diglett'], difficulty: 'HARD' },
    { id: 'mn_12', name: '杜娟', url: 'gym/杜娟.webp', coreUnits: ['bonsly', 'geodude', 'diglett'], difficulty: 'HARD' },
    { id: 'mn_13', name: '菜種', url: 'gym/菜種.webp', coreUnits: ['bulbasaur', 'bulbasaur', 'bulbasaur'], difficulty: 'HARD' },
    { id: 'mn_14', name: '小智', url: 'gym/小智.webp', coreUnits: ['charmander', 'pichu'], difficulty: 'HARD' },
    { id: 'mn_15', name: '阿速', url: 'gym/阿速.webp', coreUnits: ['natu', 'natu'], difficulty: 'EASY' },
    { id: 'mn_16', name: '阿桔', url: 'gym/阿桔.webp', coreUnits: ['ekans', 'ekans', 'ekans'], difficulty: 'NORMAL' },
    { id: 'mn_17', name: '小南', url: 'gym/小南.webp', coreUnits: ['wynaut', 'natu'], difficulty: 'NORMAL' },
    { id: 'mn_18', name: '小楓', url: 'gym/小楓.webp', coreUnits: ['wynaut', 'natu'], difficulty: 'NORMAL' },
    { id: 'mn_19', name: '瓢太', url: 'gym/瓢太.webp', coreUnits: ['magnemite', 'bonsly', 'geodude'], difficulty: 'NORMAL' },
    { id: 'mn_20', name: '亞洛', url: 'gym/亞洛.webp', coreUnits: ['bulbasaur', 'bulbasaur', 'chikorita'], difficulty: 'HARD' },
    { id: 'mn_21', name: '露璃娜', url: 'gym/露璃娜.webp', coreUnits: ['totodile', 'totodile'], difficulty: 'HARD' },
    { id: 'mn_22', name: '莉佳', url: 'gym/莉佳01.webp', coreUnits: ['caterpie', 'bulbasaur', 'chikorita'], difficulty: 'EASY' },
];

export const MODERN_INTERM_OPPONENTS: OpponentDefinition[] = [
    { id: 'mi_1', name: '福爺', url: 'gym/福爺.webp', coreUnits: ['bulbasaur', 'bellsprout', 'bellsprout'], difficulty: 'NORMAL' },
    { id: 'mi_2', name: '菊老大', url: 'gym/菊老大.webp', coreUnits: ['cubone', 'diglett', 'geodude', 'bonsly', 'magnemite'], difficulty: 'NORMAL' },
    { id: 'mi_3', name: '索妮亞', url: 'gym/索妮亞.webp', coreUnits: ['jolteon', 'sylveon', 'cleffa', 'pichu'], difficulty: 'HARD' },
];

export const MODERN_ADVANCED_OPPONENTS: OpponentDefinition[] = [
    { id: 'ma_1', name: '瑪奧', url: 'gym/瑪奧.webp', coreUnits: ['leafeon', 'delibird', 'bellsprout'], difficulty: 'NORMAL' },
    { id: 'ma_2', name: '馬瑪內', url: 'gym/馬瑪內.webp', coreUnits: ['jolteon', 'magnemite', 'pichu'], difficulty: 'NORMAL' },
    { id: 'ma_3', name: '水蓮', url: 'gym/水蓮.webp', coreUnits: ['vaporeon', 'squirtle', 'psyduck'], difficulty: 'NORMAL' },
    { id: 'ma_4', name: '卡奇', url: 'gym/卡奇.webp', coreUnits: ['flareon', 'charmander', 'cyndaquil'], difficulty: 'NORMAL' },
    { id: 'ma_5', name: '莉莉艾02', url: 'gym/莉莉艾02.webp', coreUnits: ['happiny', 'sylveon', 'cleffa', 'togepi'], difficulty: 'HARD' },
    { id: 'ma_6', name: '紫羅蘭02', url: 'gym/紫羅蘭02.webp', coreUnits: ['caterpie', 'caterpie', 'pinsir', 'shuckle', 'togepi'], difficulty: 'HARD' },
    { id: 'ma_7', name: '娜琪', url: 'gym/娜琪.webp', coreUnits: ['natu', 'togepi', 'togepi', 'murkrow'], difficulty: 'HARD' },
];

export const MODERN_ELITE_OPPONENTS: OpponentDefinition[] = [
    { id: 'me_1', name: '火雁', url: 'gym/火雁.webp', coreUnits: ['flareon', 'cyndaquil', 'vulpix', 'sneasel', 'murkrow'], difficulty: 'VERY_HARD' },
    { id: 'me_2', name: '阿泉', url: 'gym/阿泉.webp', coreUnits: ['vaporeon', 'totodile', 'squirtle', 'sneasel', 'murkrow'], difficulty: 'VERY_HARD' },
    { id: 'me_3', name: '牡丹', url: 'gym/牡丹.webp', coreUnits: ['flareon', 'jolteon', 'umbreon', 'leafeon', 'espeon'], difficulty: 'VERY_HARD' },
    { id: 'me_4', name: '琉琪亞', url: 'gym/琉琪亞.webp', coreUnits: ['vaporeon', 'espeon', 'umbreon', 'glaceon', 'sylveon'], difficulty: 'VERY_HARD' },
    { id: 'me_5', name: '竹蘭01', url: 'champion/竹蘭01.webp', coreUnits: ['mareep', 'shuckle', 'sneasel', 'murkrow', 'togepi'], difficulty: 'VERY_HARD' },
    { id: 'me_6', name: '志米', url: 'elitefour/志米.webp', coreUnits: ['squirtle', 'vaporeon', 'delibird', 'togepi', 'sneasel'], difficulty: 'VERY_HARD' },
    { id: 'me_7', name: '小照', url: 'gym/小照.webp', coreUnits: ['pichu', 'mrmime', 'totodile'], difficulty: 'NORMAL' },
    { id: 'me_8', name: '明耀', url: 'gym/明耀.webp', coreUnits: ['pichu', 'mrmime', 'cyndaquil'], difficulty: 'NORMAL' },
];

export const MODERN_CHAMPION_OPPONENTS: OpponentDefinition[] = [
    { id: 'mc_1', name: '迷可利', url: 'champion/迷可利.webp', coreUnits: ['vaporeon', 'espeon', 'squirtle', 'psyduck', 'mrmime'], difficulty: 'VERY_HARD' },
    { id: 'mc_2', name: '竹蘭02', url: 'champion/竹蘭02.webp', coreUnits: ['raikou', 'shuckle', 'sneasel', 'murkrow', 'togepi'], difficulty: 'VERY_HARD' },
    { id: 'mc_3', name: '赤紅02', url: 'champion/赤紅02.webp', coreUnits: ['raikou', 'entei', 'suicune', 'pichu'], difficulty: 'VERY_HARD' },
];
