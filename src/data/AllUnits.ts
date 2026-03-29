
import type { UnitTemplate } from '../models/Unit';

export const ALL_UNITS: Record<string, UnitTemplate> = {
    // --- Evolution Paths Define ---
    // Format: Base -> Stage 2 -> Stage 3

    // 1. Bulbasaur
    bulbasaur: {
        id: 'bulbasaur', name: '妙蛙種子', tier: 1, family: 'bulbasaur',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/妙蛙種子00.webp', battleImageUrl: 'assets/妙蛙種子01.webp',
        description: '死亡後召喚 1 隻 1/1 小種子。', synergies: ['Starter', 'Grass'], evolveId: 'ivysaur'
    },
    ivysaur: {
        id: 'ivysaur', name: '妙蛙草', tier: 1, family: 'bulbasaur',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/妙蛙草00.webp', battleImageUrl: 'assets/妙蛙草01.webp',
        description: '死亡後召喚 1 隻 2/2 妙蛙種子。', synergies: ['Starter', 'Grass'], evolveId: 'venusaur', isHiddenFromShop: true
    },
    venusaur: {
        id: 'venusaur', name: '妙蛙花', tier: 1, family: 'bulbasaur',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/妙蛙花00.webp', battleImageUrl: 'assets/妙蛙花01.webp',
        description: '死亡後召喚 2 隻 4/4 妙蛙草。', synergies: ['Starter', 'Grass'], isHiddenFromShop: true
    },

    // 2. Charmander
    charmander: {
        id: 'charmander', name: '小火龍', tier: 1, family: 'charmander',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/小火龍00.webp', battleImageUrl: 'assets/小火龍01.webp',
        description: '同時對後方敵方造成 [N] 傷害 (每兩場戰鬥後增強)', synergies: ['Starter', 'Fire'], evolveId: 'charmeleon'
    },
    charmeleon: {
        id: 'charmeleon', name: '火恐龍', tier: 1, family: 'charmander',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/火恐龍00.webp', battleImageUrl: 'assets/火恐龍01.webp',
        description: '同時對後方敵方造成 [N] 傷害 (每場戰鬥後增強)', synergies: ['Starter', 'Fire'], evolveId: 'charizard', isHiddenFromShop: true
    },
    charizard: {
        id: 'charizard', name: '噴火龍', tier: 1, family: 'charmander',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/噴火龍00.webp', battleImageUrl: 'assets/噴火龍01.webp',
        description: '同時對後方敵方造成 [N] 傷害 (每場戰鬥後增強)', synergies: ['Starter', 'Fire'], isHiddenFromShop: true
    },

    // 3. Squirtle
    squirtle: {
        id: 'squirtle', name: '傑尼龜', tier: 1, family: 'squirtle',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/傑尼龜00.webp', battleImageUrl: 'assets/傑尼龜01.webp',
        description: '受到的傷害減少 1 (最低為 1)。', synergies: ['Starter', 'Water'], evolveId: 'wartortle'
    },
    wartortle: {
        id: 'wartortle', name: '卡咪龜', tier: 1, family: 'squirtle',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/卡咪龜00.webp', battleImageUrl: 'assets/卡咪龜01.webp',
        description: '受到的傷害減少 2 (最低為 1)。', synergies: ['Starter', 'Water'], evolveId: 'blastoise', isHiddenFromShop: true
    },
    blastoise: {
        id: 'blastoise', name: '水箭龜', tier: 1, family: 'squirtle',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/水箭龜00.webp', battleImageUrl: 'assets/水箭龜01.webp',
        description: '受到的傷害減少 3 (最低為 1)。', synergies: ['Starter', 'Water'], isHiddenFromShop: true
    },

    // 4. Gastly
    gastly: {
        id: 'gastly', name: '鬼斯', tier: 1, family: 'gastly',
        baseStats: { hp: 1, maxHp: 1, attack: 3 },
        imageUrl: 'assets/鬼斯00.webp', battleImageUrl: 'assets/鬼斯01.webp',
        description: '戰鬥開始時，前方友軍永久 +1 攻擊。', synergies: ['Ghost'], evolveId: 'haunter'
    },
    haunter: {
        id: 'haunter', name: '鬼斯通', tier: 1, family: 'gastly',
        baseStats: { hp: 1, maxHp: 1, attack: 3 },
        imageUrl: 'assets/鬼斯通00.webp', battleImageUrl: 'assets/鬼斯通01.webp',
        description: '戰鬥開始時，前方友軍永久 +3 攻擊。', synergies: ['Ghost'], evolveId: 'gengar', isHiddenFromShop: true
    },
    'gengar': {
        id: 'gengar',
        name: '耿鬼',
        tier: 3,
        baseStats: { hp: 1, maxHp: 1, attack: 3 },
        imageUrl: 'assets/耿鬼00.webp',
        battleImageUrl: 'assets/耿鬼01.webp',
        description: '戰鬥開始時，我方全體永久 +3 攻擊。',
        synergies: ['Ghost', 'Poison'],
        family: 'gastly',
        isHiddenFromShop: true
    },

    // 5. Chikorita
    chikorita: {
        id: 'chikorita', name: '菊草葉', tier: 2, family: 'chikorita',
        baseStats: { hp: 4, maxHp: 4, attack: 2 },
        imageUrl: 'assets/菊草葉00.webp', battleImageUrl: 'assets/菊草葉01.webp',
        description: '友軍召喚物 +2 攻擊。', synergies: ['Starter', 'Grass'], evolveId: 'bayleef'
    },
    bayleef: {
        id: 'bayleef', name: '月桂葉', tier: 2, family: 'chikorita',
        baseStats: { hp: 4, maxHp: 4, attack: 2 },
        imageUrl: 'assets/月桂葉00.webp', battleImageUrl: 'assets/月桂葉01.webp',
        description: '友軍召喚物 +5 攻擊。', synergies: ['Starter', 'Grass'], evolveId: 'meganium', isHiddenFromShop: true
    },
    meganium: {
        id: 'meganium', name: '大竺葵', tier: 2, family: 'chikorita',
        baseStats: { hp: 4, maxHp: 4, attack: 2 },
        imageUrl: 'assets/大竺葵00.webp', battleImageUrl: 'assets/大竺葵01.webp',
        description: '友軍召喚物 +10 攻擊。', synergies: ['Starter', 'Grass'], isHiddenFromShop: true
    },

    // 6. Cyndaquil
    cyndaquil: {
        id: 'cyndaquil', name: '火球鼠', tier: 2, family: 'cyndaquil',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/火球鼠00.webp', battleImageUrl: 'assets/火球鼠01.webp',
        description: '攻擊前，對其他全體角色造成 1 傷害。', synergies: ['Starter', 'Fire'], evolveId: 'quilava'
    },
    quilava: {
        id: 'quilava', name: '火岩鼠', tier: 2, family: 'cyndaquil',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/火岩鼠00.webp', battleImageUrl: 'assets/火岩鼠01.webp',
        description: '攻擊前，對其他全體角色造成 2 傷害。', synergies: ['Starter', 'Fire'], evolveId: 'typhlosion', isHiddenFromShop: true
    },
    typhlosion: {
        id: 'typhlosion', name: '火爆獸', tier: 2, family: 'cyndaquil',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/火爆獸00.webp', battleImageUrl: 'assets/火爆獸01.webp',
        description: '攻擊前，對其他全體角色造成 5 傷害。', synergies: ['Starter', 'Fire'], isHiddenFromShop: true
    },

    // 7. Totodile
    totodile: {
        id: 'totodile', name: '小鋸鱷', tier: 2, family: 'totodile',
        baseStats: { hp: 2, maxHp: 2, attack: 4 },
        imageUrl: 'assets/小鋸鱷00.webp', battleImageUrl: 'assets/小鋸鱷01.webp',
        description: '戰鬥開始時，前方友軍獲得小鋸鱷 33% 攻擊。', synergies: ['Starter', 'Water'], evolveId: 'croconaw'
    },
    croconaw: {
        id: 'croconaw', name: '藍鱷', tier: 2, family: 'totodile',
        baseStats: { hp: 2, maxHp: 2, attack: 4 },
        imageUrl: 'assets/藍鱷00.webp', battleImageUrl: 'assets/藍鱷01.webp',
        description: '戰鬥開始時，前方友軍獲得藍鱷 50% 攻擊。', synergies: ['Starter', 'Water'], evolveId: 'feraligatr', isHiddenFromShop: true
    },
    feraligatr: {
        id: 'feraligatr', name: '大力鱷', tier: 2, family: 'totodile',
        baseStats: { hp: 2, maxHp: 2, attack: 4 },
        imageUrl: 'assets/大力鱷00.webp', battleImageUrl: 'assets/大力鱷01.webp',
        description: '戰鬥開始時，前方友軍獲得大力鱷 100% 攻擊。', synergies: ['Starter', 'Water'], isHiddenFromShop: true
    },

    // 8. Igglybuff (New)
    igglybuff: {
        id: 'igglybuff', name: '寶寶丁', tier: 1, family: 'igglybuff',
        baseStats: { hp: 3, maxHp: 3, attack: 1 },
        imageUrl: 'assets/寶寶丁00.webp', battleImageUrl: 'assets/寶寶丁01.webp',
        description: '戰鬥開始時，前方友軍永久 +1 生命。', synergies: ['Normal'], evolveId: 'jigglypuff'
    },
    jigglypuff: {
        id: 'jigglypuff', name: '胖丁', tier: 1, family: 'igglybuff',
        baseStats: { hp: 3, maxHp: 3, attack: 1 },
        imageUrl: 'assets/胖丁00.webp', battleImageUrl: 'assets/胖丁01.webp',
        description: '戰鬥開始時，前方友軍永久 +3 生命。', synergies: ['Normal'], evolveId: 'wigglytuff', isHiddenFromShop: true
    },
    'wigglytuff': {
        id: 'wigglytuff',
        name: '胖可丁',
        tier: 3,
        baseStats: { hp: 3, maxHp: 3, attack: 1 },
        imageUrl: 'assets/胖可丁00.webp',
        battleImageUrl: 'assets/胖可丁01.webp',
        description: '戰鬥開始時，我方全體永久 +3 生命。',
        synergies: ['Normal', 'Fairy'],
        family: 'igglybuff',
        isHiddenFromShop: true
    },

    // 9. Treecko
    treecko: {
        id: 'treecko', name: '木守宮', tier: 3, family: 'treecko',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/木守宮00.webp', battleImageUrl: 'assets/木守宮01.webp',
        description: '召喚友軍後，對敵方造成 2 傷害。', synergies: ['Starter', 'Grass'], evolveId: 'grovyle'
    },
    grovyle: {
        id: 'grovyle', name: '森林蜥蜴', tier: 3, family: 'treecko',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/森林蜥蜴00.webp', battleImageUrl: 'assets/森林蜥蜴01.webp',
        description: '召喚友軍後，對敵方造成 4 傷害。', synergies: ['Starter', 'Grass'], evolveId: 'sceptile', isHiddenFromShop: true
    },
    sceptile: {
        id: 'sceptile', name: '蜥蜴王', tier: 3, family: 'treecko',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/蜥蜴王00.webp', battleImageUrl: 'assets/蜥蜴王01.webp',
        description: '召喚友軍後，對敵方造成 8 傷害。', synergies: ['Starter', 'Grass'], isHiddenFromShop: true
    },

    // 10. Torchic
    torchic: {
        id: 'torchic', name: '火稚雞', tier: 3, family: 'torchic',
        baseStats: { hp: 3, maxHp: 3, attack: 5 },
        imageUrl: 'assets/火稚雞00.webp', battleImageUrl: 'assets/火稚雞01.webp',
        description: '友軍攻擊時，自身追擊 2 傷害。', synergies: ['Starter', 'Fire'], evolveId: 'combusken'
    },
    combusken: {
        id: 'combusken', name: '力壯雞', tier: 3, family: 'torchic',
        baseStats: { hp: 3, maxHp: 3, attack: 5 },
        imageUrl: 'assets/力壯雞00.webp', battleImageUrl: 'assets/力壯雞01.webp',
        description: '友軍攻擊時，自身追擊 5 傷害。', synergies: ['Starter', 'Fire'], evolveId: 'blaziken', isHiddenFromShop: true
    },
    blaziken: {
        id: 'blaziken', name: '火焰雞', tier: 3, family: 'torchic',
        baseStats: { hp: 3, maxHp: 3, attack: 5 },
        imageUrl: 'assets/火焰雞00.webp', battleImageUrl: 'assets/火焰雞01.webp',
        description: '友軍攻擊時，自身追擊 10 傷害。', synergies: ['Starter', 'Fire'], isHiddenFromShop: true
    },

    // 11. Mudkip
    mudkip: {
        id: 'mudkip', name: '水躍魚', tier: 3, family: 'mudkip',
        baseStats: { hp: 5, maxHp: 5, attack: 3 },
        imageUrl: 'assets/水躍魚00.webp', battleImageUrl: 'assets/水躍魚01.webp',
        description: '友軍攻擊時，自身 +1 攻擊或生命。', synergies: ['Starter', 'Water'], evolveId: 'marshtomp'
    },
    marshtomp: {
        id: 'marshtomp', name: '沼躍魚', tier: 3, family: 'mudkip',
        baseStats: { hp: 5, maxHp: 5, attack: 3 },
        imageUrl: 'assets/沼躍魚00.webp', battleImageUrl: 'assets/沼躍魚01.webp',
        description: '友軍攻擊時，自身 +2 攻擊或生命。', synergies: ['Starter', 'Water'], evolveId: 'swampert', isHiddenFromShop: true
    },
    swampert: {
        id: 'swampert', name: '巨沼怪', tier: 3, family: 'mudkip',
        baseStats: { hp: 5, maxHp: 5, attack: 3 },
        imageUrl: 'assets/巨沼怪00.webp', battleImageUrl: 'assets/巨沼怪01.webp',
        description: '友軍攻擊時，自身 +5 攻擊或生命。', synergies: ['Starter', 'Water'], isHiddenFromShop: true
    },

    // 12. Sprigatito
    sprigatito: {
        id: 'sprigatito', name: '新葉喵', tier: 4, family: 'sprigatito',
        baseStats: { hp: 5, maxHp: 5, attack: 5 },
        imageUrl: 'assets/新葉喵00.webp', battleImageUrl: 'assets/新葉喵01.webp',
        description: '召喚友軍後，隨機 1 位友軍永久 +1 攻擊與生命。', synergies: ['Starter', 'Grass'], evolveId: 'floragato'
    },
    floragato: {
        id: 'floragato', name: '蒂蕾喵', tier: 4, family: 'sprigatito',
        baseStats: { hp: 5, maxHp: 5, attack: 5 },
        imageUrl: 'assets/蒂蕾喵00.webp', battleImageUrl: 'assets/蒂蕾喵01.webp',
        description: '召喚友軍後，隨機 2 位友軍永久 +1 攻擊與生命。', synergies: ['Starter', 'Grass'], evolveId: 'meowscarada', isHiddenFromShop: true
    },
    meowscarada: {
        id: 'meowscarada', name: '魔幻假面喵', tier: 4, family: 'sprigatito',
        baseStats: { hp: 5, maxHp: 5, attack: 5 },
        imageUrl: 'assets/魔幻假面喵00.webp', battleImageUrl: 'assets/魔幻假面喵01.webp',
        description: '召喚友軍後，隨機 3 位友軍永久 +1 攻擊與生命。', synergies: ['Starter', 'Grass'], isHiddenFromShop: true
    },

    // 13. Fuecoco
    fuecoco: {
        id: 'fuecoco', name: '呆火鱷', tier: 4, family: 'fuecoco',
        baseStats: { hp: 6, maxHp: 6, attack: 4 },
        imageUrl: 'assets/呆火鱷00.webp', battleImageUrl: 'assets/呆火鱷01.webp',
        description: '友軍擊殺後，隨機 1 位友軍永久 +2 生命。', synergies: ['Starter', 'Fire'], evolveId: 'crocalor'
    },
    crocalor: {
        id: 'crocalor', name: '炙燙鱷', tier: 4, family: 'fuecoco',
        baseStats: { hp: 6, maxHp: 6, attack: 4 },
        imageUrl: 'assets/炙燙鱷00.webp', battleImageUrl: 'assets/炙燙鱷01.webp',
        description: '友軍擊殺後，隨機 2 位友軍永久 +2 生命。', synergies: ['Starter', 'Fire'], evolveId: 'skeledirge', isHiddenFromShop: true
    },
    skeledirge: {
        id: 'skeledirge', name: '骨紋巨聲鱷', tier: 4, family: 'fuecoco',
        baseStats: { hp: 6, maxHp: 6, attack: 4 },
        imageUrl: 'assets/骨紋巨聲鱷00.webp', battleImageUrl: 'assets/骨紋巨聲鱷01.webp',
        description: '友軍擊殺後，隨機 3 位友軍永久 +2 生命。', synergies: ['Starter', 'Fire'], isHiddenFromShop: true
    },

    // 14. Quaxly
    quaxly: {
        id: 'quaxly', name: '潤水鴨', tier: 4, family: 'quaxly',
        baseStats: { hp: 4, maxHp: 4, attack: 6 },
        imageUrl: 'assets/潤水鴨00.webp', battleImageUrl: 'assets/潤水鴨01.webp',
        description: '友軍擊殺後，隨機 1 位友軍永久 +2 攻擊。', synergies: ['Starter', 'Water'], evolveId: 'quaxwell'
    },
    quaxwell: {
        id: 'quaxwell', name: '湧躍鴨', tier: 4, family: 'quaxly',
        baseStats: { hp: 4, maxHp: 4, attack: 6 },
        imageUrl: 'assets/湧躍鴨00.webp', battleImageUrl: 'assets/湧躍鴨01.webp',
        description: '友軍擊殺後，隨機 2 位友軍永久 +2 攻擊。', synergies: ['Starter', 'Water'], evolveId: 'quaquaval', isHiddenFromShop: true
    },
    quaquaval: {
        id: 'quaquaval', name: '狂歡浪舞鴨', tier: 4, family: 'quaxly',
        baseStats: { hp: 4, maxHp: 4, attack: 6 },
        imageUrl: 'assets/狂歡浪舞鴨00.webp', battleImageUrl: 'assets/狂歡浪舞鴨01.webp',
        description: '友軍擊殺後，隨機 3 位友軍永久 +2 攻擊。', synergies: ['Starter', 'Water'], isHiddenFromShop: true
    },

    // 15. Rattata (Loop same name for stage 3)
    rattata: {
        id: 'rattata', name: '小拉達', tier: 1, family: 'rattata',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/小拉達00.webp', battleImageUrl: 'assets/小拉達01.webp',
        description: '死亡後召喚 2 隻 1/1 小老鼠。', synergies: ['Normal'], evolveId: 'raticate'
    },
    raticate: {
        id: 'raticate', name: '拉達', tier: 1, family: 'rattata',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/拉達00.webp', battleImageUrl: 'assets/拉達01.webp',
        description: '死亡後召喚 2 隻 2/2 小老鼠。', synergies: ['Normal'], evolveId: 'raticate_final', isHiddenFromShop: true
    },
    raticate_final: {
        id: 'raticate_final', name: '拉達', tier: 1, family: 'rattata',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/拉達00.webp', battleImageUrl: 'assets/拉達01.webp',
        description: '死亡後召喚 5 隻 5/5 小老鼠。', synergies: ['Normal'], isHiddenFromShop: true
    },

    // 16. Diglett
    diglett: {
        id: 'diglett', name: '地鼠', tier: 2, family: 'diglett',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/地鼠00.webp', battleImageUrl: 'assets/地鼠01.webp',
        description: '有 25% 機率閃避攻擊（不含招式傷害）。', synergies: ['Triplets', 'Cave'], evolveId: 'dugtrio'
    },
    dugtrio: {
        id: 'dugtrio', name: '三地鼠', tier: 2, family: 'diglett',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/三地鼠00.webp', battleImageUrl: 'assets/三地鼠01.webp',
        description: '有 33% 機率閃避攻擊（不含招式傷害）。', synergies: ['Triplets', 'Cave'], evolveId: 'dugtrio_final', isHiddenFromShop: true
    },
    dugtrio_final: {
        id: 'dugtrio_final', name: '三地鼠', tier: 2, family: 'diglett',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/三地鼠00.webp', battleImageUrl: 'assets/三地鼠01.webp',
        description: '有 50% 機率閃避攻擊（不含招式傷害）。', synergies: ['Triplets', 'Cave'], isHiddenFromShop: true
    },

    // 17. Meowth
    meowth: {
        id: 'meowth', name: '喵喵', tier: 2, family: 'meowth',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/喵喵00.webp', battleImageUrl: 'assets/喵喵01.webp',
        description: '準備階段時 +1 金幣。', synergies: ['Normal', 'Thief'], evolveId: 'persian'
    },
    persian: {
        id: 'persian', name: '貓老大', tier: 2, family: 'meowth',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/貓老大00.webp', battleImageUrl: 'assets/貓老大01.webp',
        description: '準備階段時 +3 金幣。', synergies: ['Normal', 'Thief'], evolveId: 'persian_final', isHiddenFromShop: true
    },
    persian_final: {
        id: 'persian_final', name: '貓老大', tier: 2, family: 'meowth',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/貓老大00.webp', battleImageUrl: 'assets/貓老大01.webp',
        description: '準備階段時 +5 金幣。', synergies: ['Normal', 'Thief'], isHiddenFromShop: true
    },

    // 18. Mankey (Tier 1)
    mankey: {
        id: 'mankey', name: '猴怪', tier: 1, family: 'mankey',
        baseStats: { hp: 1, maxHp: 1, attack: 3 },
        imageUrl: 'assets/猴怪00.webp', battleImageUrl: 'assets/猴怪01.webp',
        description: '合成與出售時後方友軍 +2 攻擊。', synergies: ['Angry'], evolveId: 'primeape'
    },
    primeape: {
        id: 'primeape', name: '火爆猴', tier: 1, family: 'mankey',
        baseStats: { hp: 1, maxHp: 1, attack: 3 },
        imageUrl: 'assets/火爆猴00.webp', battleImageUrl: 'assets/火爆猴01.webp',
        description: '合成與出售時後方友軍 +4 攻擊。', synergies: ['Angry'], evolveId: 'primeape_final', isHiddenFromShop: true
    },
    primeape_final: {
        id: 'primeape_final', name: '火爆猴', tier: 1, family: 'mankey',
        baseStats: { hp: 1, maxHp: 1, attack: 3 },
        imageUrl: 'assets/火爆猴00.webp', battleImageUrl: 'assets/火爆猴01.webp',
        description: '出售時全體友軍 +10 攻擊。', synergies: ['Angry'], isHiddenFromShop: true
    },

    // Stufful (Tier 1) - Replacement for Mankey in Classic
    stufful: {
        id: 'stufful', name: '童偶熊', tier: 1, family: 'stufful',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/童偶熊00.webp', battleImageUrl: 'assets/童偶熊01.webp',
        description: '合成與出售時前方友軍 +2 攻擊。', synergies: ['Angry'], evolveId: 'bewear'
    },
    bewear: {
        id: 'bewear', name: '穿著熊', tier: 1, family: 'stufful',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/穿著熊00.webp', battleImageUrl: 'assets/穿著熊01.webp',
        description: '合成與出售時前方友軍 +4 攻擊。', synergies: ['Angry'], evolveId: 'bewear_final', isHiddenFromShop: true
    },
    bewear_final: {
        id: 'bewear_final', name: '穿著熊', tier: 1, family: 'stufful',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/穿著熊00.webp', battleImageUrl: 'assets/穿著熊01.webp',
        description: '出售時全體友軍 +10 攻擊。', synergies: ['Angry'], isHiddenFromShop: true
    },

    // 19. Onix
    onix: {
        id: 'onix', name: '大岩蛇', tier: 4, family: 'onix',
        baseStats: { hp: 6, maxHp: 6, attack: 4 },
        imageUrl: 'assets/大岩蛇00.webp', battleImageUrl: 'assets/大岩蛇01.webp',
        description: '攻擊後，移動至隊伍最後方；反彈 50% 所受傷害。', synergies: ['Hard', 'Cave'], evolveId: 'steelix'
    },
    steelix: {
        id: 'steelix', name: '大鋼蛇', tier: 4, family: 'onix',
        baseStats: { hp: 6, maxHp: 6, attack: 4 },
        imageUrl: 'assets/大鋼蛇00.webp', battleImageUrl: 'assets/大鋼蛇01.webp',
        description: '攻擊後，移動至隊伍最後方；反彈 50% 所受傷害。', synergies: ['Hard', 'Cave'], evolveId: 'steelix_final', isHiddenFromShop: true
    },
    steelix_final: {
        id: 'steelix_final', name: '大鋼蛇', tier: 4, family: 'onix',
        baseStats: { hp: 6, maxHp: 6, attack: 4 },
        imageUrl: 'assets/大鋼蛇00.webp', battleImageUrl: 'assets/大鋼蛇01.webp',
        description: '攻擊後，移動至隊伍最後方；反彈 50% 所受傷害。', synergies: ['Hard', 'Cave'], isHiddenFromShop: true
    },

    // 20. Doduo
    doduo: {
        id: 'doduo', name: '嘟嘟', tier: 2, family: 'doduo',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/嘟嘟00.webp', battleImageUrl: 'assets/嘟嘟01.webp',
        description: '有 25% 機率額外攻擊一次。', synergies: ['Triplets', 'Angry'], evolveId: 'dodrio'
    },
    dodrio: {
        id: 'dodrio', name: '嘟嘟利', tier: 2, family: 'doduo',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/嘟嘟利00.webp', battleImageUrl: 'assets/嘟嘟利01.webp',
        description: '有 33% 機率額外攻擊一次。', synergies: ['Triplets', 'Angry'], evolveId: 'dodrio_final', isHiddenFromShop: true
    },
    dodrio_final: {
        id: 'dodrio_final', name: '嘟嘟利', tier: 2, family: 'doduo',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/嘟嘟利00.webp', battleImageUrl: 'assets/嘟嘟利01.webp',
        description: '有 50% 機率額外攻擊一次。', synergies: ['Triplets', 'Angry'], isHiddenFromShop: true
    },

    // 21. Slowpoke
    slowpoke: {
        id: 'slowpoke', name: '呆呆獸', tier: 3, family: 'slowpoke',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/呆呆獸00.webp', battleImageUrl: 'assets/呆呆獸01.webp',
        description: '首次受傷後，回復 33％ 生命。', synergies: ['Water', 'Psychic'], evolveId: 'slowbro'
    },
    slowbro: {
        id: 'slowbro', name: '呆殼獸', tier: 3, family: 'slowpoke',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/呆殼獸00.webp', battleImageUrl: 'assets/呆殼獸01.webp',
        description: '首次受傷後，回復 33％ 生命。', synergies: ['Water', 'Psychic'], evolveId: 'slowbro_final', isHiddenFromShop: true
    },
    slowbro_final: {
        id: 'slowbro_final', name: '呆殼獸', tier: 3, family: 'slowpoke',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/呆殼獸00.webp', battleImageUrl: 'assets/呆殼獸01.webp',
        description: '首次受傷後，回復 100％ 生命。', synergies: ['Water', 'Psychic'], isHiddenFromShop: true
    },

    // 22. Magnemite
    magnemite: {
        id: 'magnemite', name: '小磁怪', tier: 2, family: 'magnemite',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/小磁怪00.webp', battleImageUrl: 'assets/小磁怪01.webp',
        description: '準備結束時，永久 +1 攻擊或生命 (共 1 次)。', synergies: ['Triplets', 'Hard'], evolveId: 'magneton'
    },
    magneton: {
        id: 'magneton', name: '三合一磁怪', tier: 2, family: 'magnemite',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/三合一磁怪00.webp', battleImageUrl: 'assets/三合一磁怪01.webp',
        description: '準備結束時，永久 +1 攻擊或生命 (共 2 次)。', synergies: ['Triplets', 'Hard'], evolveId: 'magneton_final', isHiddenFromShop: true
    },
    magneton_final: {
        id: 'magneton_final', name: '三合一磁怪', tier: 2, family: 'magnemite',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/三合一磁怪00.webp', battleImageUrl: 'assets/三合一磁怪01.webp',
        description: '準備結束時，永久 +1 攻擊或生命 (共 3 次)。', synergies: ['Triplets', 'Hard'], isHiddenFromShop: true
    },

    // 23. Houndour
    houndour: {
        id: 'houndour', name: '戴魯比', tier: 3, family: 'houndour',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/戴魯比00.webp', battleImageUrl: 'assets/戴魯比01.webp',
        description: '戰鬥開始時，對生命最高敵方造成 4 傷害 (共 1 次)。', synergies: ['Fire', 'Thief'], evolveId: 'houndoom'
    },
    houndoom: {
        id: 'houndoom', name: '黑魯加', tier: 3, family: 'houndour',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/黑魯加00.webp', battleImageUrl: 'assets/黑魯加01.webp',
        description: '戰鬥開始時，對生命最高敵方造成 4 傷害 (共 2 次)。', synergies: ['Fire', 'Thief'], evolveId: 'houndoom_final', isHiddenFromShop: true
    },
    houndoom_final: {
        id: 'houndoom_final', name: '黑魯加', tier: 3, family: 'houndour',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/黑魯加00.webp', battleImageUrl: 'assets/黑魯加01.webp',
        description: '戰鬥開始時，對生命最高敵方造成 4 傷害 (共 3 次)。', synergies: ['Fire', 'Thief'], isHiddenFromShop: true
    },

    // 24. Sneasel
    sneasel: {
        id: 'sneasel', name: '狃拉', tier: 4, family: 'sneasel',
        baseStats: { hp: 4, maxHp: 4, attack: 6 },
        imageUrl: 'assets/狃拉00.webp', battleImageUrl: 'assets/狃拉01.webp',
        description: '攻擊時 33% 機率再攻擊 1 個敵方，攻擊不會被降低。', synergies: ['Snow', 'Thief'], evolveId: 'weavile'
    },
    weavile: {
        id: 'weavile', name: '瑪狃拉', tier: 4, family: 'sneasel',
        baseStats: { hp: 4, maxHp: 4, attack: 6 },
        imageUrl: 'assets/瑪狃拉00.webp', battleImageUrl: 'assets/瑪狃拉01.webp',
        description: '攻擊時 33% 機率再攻擊 1 個敵方，攻擊不會被降低。', synergies: ['Snow', 'Thief'], evolveId: 'weavile_final', isHiddenFromShop: true
    },
    weavile_final: {
        id: 'weavile_final', name: '瑪狃拉', tier: 4, family: 'sneasel',
        baseStats: { hp: 4, maxHp: 4, attack: 6 },
        imageUrl: 'assets/瑪狃拉00.webp', battleImageUrl: 'assets/瑪狃拉01.webp',
        description: '攻擊時 33% 機率再攻擊 1 個敵方，攻擊不會被降低。', synergies: ['Snow', 'Thief'], isHiddenFromShop: true
    },

    // 25. Shuppet (Tier 1)
    shuppet: {
        id: 'shuppet', name: '怨影娃娃', tier: 2, family: 'shuppet',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/怨影娃娃00.webp', battleImageUrl: 'assets/怨影娃娃01.webp',
        description: '受傷後對隨機敵方造成 2 傷害。', synergies: ['Ghost', 'Trick'], evolveId: 'banette'
    },
    banette: {
        id: 'banette', name: '詛咒娃娃', tier: 2, family: 'shuppet',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/詛咒娃娃00.webp', battleImageUrl: 'assets/詛咒娃娃01.webp',
        description: '受傷後對隨機敵方造成 5 傷害。', synergies: ['Ghost', 'Trick'], evolveId: 'banette_final', isHiddenFromShop: true
    },
    banette_final: {
        id: 'banette_final', name: '詛咒娃娃', tier: 2, family: 'shuppet',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/詛咒娃娃00.webp', battleImageUrl: 'assets/詛咒娃娃01.webp',
        description: '受傷後對隨機敵方造成 10 傷害。', synergies: ['Ghost', 'Trick'], isHiddenFromShop: true
    },

    // 26. Drifloon (Renamed from Drifblim Base)
    drifloon: {
        id: 'drifloon', name: '飄飄球', tier: 1, family: 'drifloon',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/飄飄球00.webp', battleImageUrl: 'assets/飄飄球01.webp',
        description: '死亡後對全體造成 2 傷害。', synergies: ['Ghost'], evolveId: 'drifblim'
    },
    drifblim: {
        id: 'drifblim', name: '隨風球', tier: 1, family: 'drifloon',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/隨風球00.webp', battleImageUrl: 'assets/隨風球01.webp',
        description: '死亡後對全體造成 5 傷害。', synergies: ['Ghost'], evolveId: 'drifblim_final', isHiddenFromShop: true
    },
    drifblim_final: {
        id: 'drifblim_final', name: '隨風球', tier: 1, family: 'drifloon',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/隨風球00.webp', battleImageUrl: 'assets/隨風球01.webp',
        description: '死亡後對全體造成 10 傷害。', synergies: ['Ghost'], isHiddenFromShop: true
    },


    // 28. Dwebble (Tier 1)
    dwebble: {
        id: 'dwebble', name: '石居蟹', tier: 1, family: 'dwebble',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/石居蟹00.webp', battleImageUrl: 'assets/石居蟹01.webp',
        description: '合成與出售時前方友軍 +2 生命。', synergies: ['Hard'], evolveId: 'crustle'
    },
    crustle: {
        id: 'crustle', name: '岩殿居蟹', tier: 1, family: 'dwebble',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/岩殿居蟹00.webp', battleImageUrl: 'assets/岩殿居蟹01.webp',
        description: '合成與出售時前方友軍 +4 生命。', synergies: ['Hard'], evolveId: 'crustle_final', isHiddenFromShop: true
    },
    crustle_final: {
        id: 'crustle_final', name: '岩殿居蟹', tier: 1, family: 'dwebble',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/岩殿居蟹00.webp', battleImageUrl: 'assets/岩殿居蟹01.webp',
        description: '出售時全體友軍 +10 生命。', synergies: ['Hard'], isHiddenFromShop: true
    },

    // 29. Kangaskhan
    kangaskhan: {
        id: 'kangaskhan', name: '袋獸', tier: 4, family: 'kangaskhan',
        baseStats: { hp: 6, maxHp: 6, attack: 6 },
        imageUrl: 'assets/袋獸00.webp', battleImageUrl: 'assets/袋獸01.webp',
        description: '戰鬥開始時，獲得自身 33% 攻擊的生命。', synergies: ['Normal', 'Angry'], evolveId: 'kangaskhan_2'
    },
    kangaskhan_2: {
        id: 'kangaskhan_2', name: '袋獸', tier: 4, family: 'kangaskhan',
        baseStats: { hp: 6, maxHp: 6, attack: 6 },
        imageUrl: 'assets/袋獸00.webp', battleImageUrl: 'assets/袋獸01.webp',
        description: '戰鬥開始時，獲得自身 33% 攻擊的生命。', synergies: ['Normal', 'Angry'], evolveId: 'kangaskhan_3', isHiddenFromShop: true
    },
    kangaskhan_3: {
        id: 'kangaskhan_3', name: '袋獸', tier: 4, family: 'kangaskhan',
        baseStats: { hp: 6, maxHp: 6, attack: 6 },
        imageUrl: 'assets/袋獸00.webp', battleImageUrl: 'assets/袋獸01.webp',
        description: '戰鬥開始時，獲得自身 33% 攻擊的生命。', synergies: ['Normal', 'Angry'], isHiddenFromShop: true
    },

    // 30. Ditto
    ditto: {
        id: 'ditto', name: '百變怪', tier: 5, family: 'ditto',
        baseStats: { hp: 10, maxHp: 10, attack: 10 },
        imageUrl: 'assets/百變怪00.webp', battleImageUrl: 'assets/百變怪01.webp',
        description: '變身為前方角色並複製招式。', synergies: ['Normal', 'Trick'], evolveId: 'ditto_2'
    },
    ditto_2: {
        id: 'ditto_2', name: '百變怪', tier: 5, family: 'ditto',
        baseStats: { hp: 10, maxHp: 10, attack: 10 },
        imageUrl: 'assets/百變怪00.webp', battleImageUrl: 'assets/百變怪01.webp',
        description: '變身為前方角色並複製招式。', synergies: ['Normal', 'Trick'], evolveId: 'ditto_3', isHiddenFromShop: true
    },
    ditto_3: {
        id: 'ditto_3', name: '百變怪', tier: 5, family: 'ditto',
        baseStats: { hp: 10, maxHp: 10, attack: 10 },
        imageUrl: 'assets/百變怪00.webp', battleImageUrl: 'assets/百變怪01.webp',
        description: '變身為前方角色並複製招式。', synergies: ['Normal', 'Trick'], isHiddenFromShop: true
    },

    // 31. Sableye
    sableye: {
        id: 'sableye', name: '勾魂眼', tier: 5, family: 'sableye',
        baseStats: { hp: 10, maxHp: 10, attack: 10 },
        imageUrl: 'assets/勾魂眼00.webp', battleImageUrl: 'assets/勾魂眼01.webp',
        description: '殺死勾魂眼的敵方立即死亡。', synergies: ['Trick', 'Thief'], evolveId: 'sableye_2'
    },
    sableye_2: {
        id: 'sableye_2', name: '勾魂眼', tier: 5, family: 'sableye',
        baseStats: { hp: 10, maxHp: 10, attack: 10 },
        imageUrl: 'assets/勾魂眼00.webp', battleImageUrl: 'assets/勾魂眼01.webp',
        description: '殺死勾魂眼的敵方立即死亡。', synergies: ['Trick', 'Thief'], evolveId: 'sableye_3', isHiddenFromShop: true
    },
    sableye_3: {
        id: 'sableye_3', name: '勾魂眼', tier: 5, family: 'sableye',
        baseStats: { hp: 10, maxHp: 10, attack: 10 },
        imageUrl: 'assets/勾魂眼00.webp', battleImageUrl: 'assets/勾魂眼01.webp',
        description: '殺死勾魂眼的敵方立即死亡。', synergies: ['Trick', 'Thief'], isHiddenFromShop: true
    },

    snover: {
        id: 'snover', name: '雪笠怪', tier: 3, family: 'snover',
        baseStats: { hp: 6, maxHp: 6, attack: 2 },
        imageUrl: 'assets/雪笠怪00.webp', battleImageUrl: 'assets/雪笠怪01.webp',
        description: '攻擊後永久 +1 攻擊並擊退敵方角色。', synergies: ['Grass', 'Snow'], evolveId: 'abomasnow'
    },
    abomasnow: {
        id: 'abomasnow', name: '暴雪王', tier: 3, family: 'snover',
        baseStats: { hp: 6, maxHp: 6, attack: 2 },
        imageUrl: 'assets/暴雪王00.webp', battleImageUrl: 'assets/暴雪王01.webp',
        description: '攻擊後永久 +2 攻擊並擊退敵方角色。', synergies: ['Grass', 'Snow'], evolveId: 'abomasnow_final', isHiddenFromShop: true
    },
    abomasnow_final: {
        id: 'abomasnow_final', name: '暴雪王', tier: 3, family: 'snover',
        baseStats: { hp: 6, maxHp: 6, attack: 2 },
        imageUrl: 'assets/暴雪王00.webp', battleImageUrl: 'assets/暴雪王01.webp',
        description: '攻擊後永久 +5 攻擊並擊退敵方角色。', synergies: ['Grass', 'Snow'], isHiddenFromShop: true
    },

    // 32. Mimikyu
    mimikyu: {
        id: 'mimikyu', name: '謎擬Ｑ', tier: 4, family: 'mimikyu',
        baseStats: { hp: 6, maxHp: 6, attack: 6 },
        imageUrl: 'assets/謎擬Ｑ00.webp', battleImageUrl: 'assets/謎擬Ｑ01.webp',
        description: '抵擋每場戰鬥中的首次傷害。', synergies: ['Ghost', 'SwordDance'], evolveId: 'mimikyu_2'
    },
    mimikyu_2: {
        id: 'mimikyu_2', name: '謎擬Ｑ', tier: 4, family: 'mimikyu',
        baseStats: { hp: 6, maxHp: 6, attack: 6 },
        imageUrl: 'assets/謎擬Ｑ00.webp', battleImageUrl: 'assets/謎擬Ｑ01.webp',
        description: '抵擋每場戰鬥中的首次傷害。', synergies: ['Ghost', 'SwordDance'], evolveId: 'mimikyu_3', isHiddenFromShop: true
    },
    mimikyu_3: {
        id: 'mimikyu_3', name: '謎擬Ｑ', tier: 4, family: 'mimikyu',
        baseStats: { hp: 6, maxHp: 6, attack: 6 },
        imageUrl: 'assets/謎擬Ｑ00.webp', battleImageUrl: 'assets/謎擬Ｑ01.webp',
        description: '抵擋每場戰鬥中的首次傷害。', synergies: ['Ghost', 'SwordDance'], isHiddenFromShop: true
    },

    // Misc
    sprout: {
        id: 'sprout', name: '小種子', tier: 1, family: 'bulbasaur',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/妙蛙種子00.webp', battleImageUrl: 'assets/妙蛙種子01.webp',
        description: '妙蛙種子的身分。', synergies: ['Grass'], isHiddenFromShop: true
    },
    mouse: {
        id: 'mouse', name: '小老鼠', tier: 1, family: 'rattata',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/小拉達00.webp', battleImageUrl: 'assets/小拉達01.webp',
        description: '小拉達的分身。', synergies: ['Normal'], isHiddenFromShop: true
    },

    // 33. Spiritomb
    spiritomb: {
        id: 'spiritomb', name: '花岩怪', tier: 5, family: 'spiritomb',
        baseStats: { hp: 10, maxHp: 10, attack: 10 },
        imageUrl: 'assets/花岩怪00.webp', battleImageUrl: 'assets/花岩怪01.webp',
        description: '戰鬥開始時，使 2 個敵方招式無效化。', synergies: ['Ghost', 'Angry']
    },
    heracross: {
        id: 'heracross', name: '赫拉克羅斯', tier: 3, family: 'heracross',
        baseStats: { hp: 3, maxHp: 3, attack: 5 },
        imageUrl: 'assets/赫拉克羅斯00.webp', battleImageUrl: 'assets/赫拉克羅斯01.webp',
        description: '首次受傷後，攻擊翻倍。', synergies: ['SwordDance', 'BugBite']
    },
    pinsir: {
        id: 'pinsir', name: '凱羅斯', tier: 3, family: 'pinsir',
        baseStats: { hp: 5, maxHp: 5, attack: 3 },
        imageUrl: 'assets/凱羅斯00.webp', battleImageUrl: 'assets/凱羅斯01.webp',
        description: '無視所有減傷和閃避效果。', synergies: ['SwordDance', 'BugBite']
    },
    farfetchd: {
        id: 'farfetchd', name: '大蔥鴨', tier: 5, family: 'farfetchd',
        baseStats: { hp: 10, maxHp: 10, attack: 10 },
        imageUrl: 'assets/大蔥鴨00.webp', battleImageUrl: 'assets/大蔥鴨01.webp',
        description: '首次攻擊造成 99 傷害。', synergies: ['Roost', 'SwordDance']
    },
    // --- New Psychic Units ---
    natu: {
        id: 'natu', name: '天然雀', tier: 2, family: 'natu',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/天然雀00.webp', battleImageUrl: 'assets/天然雀01.webp',
        description: '戰鬥開始時，將敵方首位和末位角色調換位置。', synergies: ['Psychic', 'Roost'], evolveId: 'xatu'
    },
    xatu: {
        id: 'xatu', name: '天然鳥', tier: 2, family: 'natu',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/天然鳥00.webp', battleImageUrl: 'assets/天然鳥01.webp',
        description: '戰鬥開始時，將敵方首位和末位角色調換位置。', synergies: ['Psychic', 'Roost'], evolveId: 'xatu_final', isHiddenFromShop: true
    },
    xatu_final: {
        id: 'xatu_final', name: '天然鳥', tier: 2, family: 'natu',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/天然鳥00.webp', battleImageUrl: 'assets/天然鳥01.webp',
        description: '戰鬥開始時，將敵方首位和末位角色調換位置。', synergies: ['Psychic', 'Roost'], isHiddenFromShop: true
    },
    ralts: {
        id: 'ralts', name: '拉魯拉絲', tier: 3, family: 'ralts',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/拉魯拉絲00.webp', battleImageUrl: 'assets/拉魯拉絲01.webp',
        description: '攻擊時，同時對敵方末位造成 33% 傷害。', synergies: ['Psychic', 'Thief'], evolveId: 'kirlia'
    },
    kirlia: {
        id: 'kirlia', name: '奇魯莉安', tier: 3, family: 'ralts',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/奇魯莉安00.webp', battleImageUrl: 'assets/奇魯莉安01.webp',
        description: '攻擊時，同時對敵方末位造成 50% 傷害。', synergies: ['Psychic', 'Thief'], evolveId: 'gardevoir', isHiddenFromShop: true
    },
    gardevoir: {
        id: 'gardevoir', name: '沙奈朵', tier: 3, family: 'ralts',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/沙奈朵00.webp', battleImageUrl: 'assets/沙奈朵01.webp',
        description: '攻擊時，同時對敵方末位造成 66% 傷害。', synergies: ['Psychic', 'Thief'], isHiddenFromShop: true
    },
    mrmime: {
        id: 'mrmime', name: '魔牆人偶', tier: 5, family: 'mrmime',
        baseStats: { hp: 10, maxHp: 10, attack: 10 },
        imageUrl: 'assets/魔牆人偶00.webp', battleImageUrl: 'assets/魔牆人偶01.webp',
        description: '我方受到的前 5 次傷害減半。', synergies: ['Psychic', 'Trick']
    },
    // 34. Caterpie
    caterpie: {
        id: 'caterpie', name: '綠毛蟲', tier: 1, family: 'caterpie',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/綠毛蟲00.webp', battleImageUrl: 'assets/綠毛蟲01.webp',
        description: '戰鬥開始時，後方友軍永久 +1 攻擊。', synergies: ['BugBite'], evolveId: 'metapod'
    },
    metapod: {
        id: 'metapod', name: '鐵甲蛹', tier: 1, family: 'caterpie',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/鐵甲蛹00.webp', battleImageUrl: 'assets/鐵甲蛹01.webp',
        description: '戰鬥開始時，後方友軍永久 +3 攻擊。', synergies: ['BugBite'], evolveId: 'butterfree', isHiddenFromShop: true
    },
    butterfree: {
        id: 'butterfree', name: '巴大蝶', tier: 1, family: 'caterpie',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/巴大蝶00.webp', battleImageUrl: 'assets/巴大蝶01.webp',
        description: '戰鬥開始時，我方全體永久 +3 攻擊。', synergies: ['BugBite', 'Roost'], isHiddenFromShop: true
    },
    // 35. Cleffa
    cleffa: {
        id: 'cleffa', name: '皮寶寶', tier: 1, family: 'cleffa',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/皮寶寶00.webp', battleImageUrl: 'assets/皮寶寶01.webp',
        description: '戰鬥開始時，後方友軍永久 +1 生命。', synergies: ['Charm'], evolveId: 'clefairy'
    },
    clefairy: {
        id: 'clefairy', name: '皮皮', tier: 1, family: 'cleffa',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/皮皮00.webp', battleImageUrl: 'assets/皮皮01.webp',
        description: '戰鬥開始時，後方友軍永久 +3 生命。', synergies: ['Charm'], evolveId: 'clefable', isHiddenFromShop: true
    },
    clefable: {
        id: 'clefable', name: '皮可西', tier: 3, family: 'cleffa',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/皮可西00.webp', battleImageUrl: 'assets/皮可西01.webp',
        description: '戰鬥開始時，我方全體永久獲得 3 點生命。', synergies: ['Charm'], isHiddenFromShop: true
    },
    // 36. Togepi
    togepi: {
        id: 'togepi', name: '波克比', tier: 4, family: 'togepi',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/波克比00.webp', battleImageUrl: 'assets/波克比01.webp',
        description: '攻擊後自身與後方角色永久 +1 攻擊。', synergies: ['Trick'], evolveId: 'togetic'
    },
    togetic: {
        id: 'togetic', name: '波克基古', tier: 4, family: 'togepi',
        baseStats: { hp: 5, maxHp: 5, attack: 5 },
        imageUrl: 'assets/波克基古00.webp', battleImageUrl: 'assets/波克基古01.webp',
        description: '攻擊後自身與後方角色永久 +3 攻擊。', synergies: ['Trick', 'Roost'], evolveId: 'togekiss', isHiddenFromShop: true
    },
    togekiss: {
        id: 'togekiss', name: '波克基斯', tier: 4, family: 'togepi',
        baseStats: { hp: 6, maxHp: 6, attack: 6 },
        imageUrl: 'assets/波克基斯00.webp', battleImageUrl: 'assets/波克基斯01.webp',
        description: '攻擊後自身與後方角色永久 +5 攻擊。', synergies: ['Trick', 'Roost'], isHiddenFromShop: true
    },
    // 37. Ekans
    ekans: {
        id: 'ekans', name: '阿柏蛇', tier: 1, family: 'ekans',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/阿柏蛇00.webp', battleImageUrl: 'assets/阿柏蛇01.webp',
        description: '同時對後方敵方造成 1 傷害。', synergies: ['Intimidate'], evolveId: 'arbok'
    },
    arbok: {
        id: 'arbok', name: '阿柏怪', tier: 1, family: 'ekans',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/阿柏怪00.webp', battleImageUrl: 'assets/阿柏怪01.webp',
        description: '同時對後方敵方造成 2 傷害。', synergies: ['Intimidate'], evolveId: 'arbok_final', isHiddenFromShop: true
    },
    arbok_final: {
        id: 'arbok_final', name: '阿柏怪', tier: 1, family: 'ekans',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/阿柏怪00.webp', battleImageUrl: 'assets/阿柏怪01.webp',
        description: '同時對後方敵方造成 5 傷害。', synergies: ['Intimidate'], isHiddenFromShop: true
    },
    // 38. Wynaut
    wynaut: {
        id: 'wynaut', name: '小果然', tier: 1, family: 'wynaut',
        baseStats: { hp: 3, maxHp: 3, attack: 1 },
        imageUrl: 'assets/小果然00.webp', battleImageUrl: 'assets/小果然01.webp',
        description: '合成與出售時後方友軍 +2 生命。', synergies: ['Psychic'], evolveId: 'wobbuffet'
    },
    wobbuffet: {
        id: 'wobbuffet', name: '果然翁', tier: 1, family: 'wynaut',
        baseStats: { hp: 3, maxHp: 3, attack: 1 },
        imageUrl: 'assets/果然翁00.webp', battleImageUrl: 'assets/果然翁01.webp',
        description: '合成與出售時後方友軍 +4 生命。', synergies: ['Psychic'], evolveId: 'wobbuffet_final', isHiddenFromShop: true
    },
    wobbuffet_final: {
        id: 'wobbuffet_final', name: '果然翁', tier: 1, family: 'wynaut',
        baseStats: { hp: 3, maxHp: 3, attack: 1 },
        imageUrl: 'assets/果然翁00.webp', battleImageUrl: 'assets/果然翁01.webp',
        description: '出售時全體友軍 +10 生命。', synergies: ['Psychic'], isHiddenFromShop: true
    },
    // 39. Geodude
    geodude: {
        id: 'geodude', name: '小拳石', tier: 1, family: 'geodude',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/小拳石00.webp', battleImageUrl: 'assets/小拳石01.webp',
        description: '死亡後召喚 2 隻 1/1 小石頭。', synergies: ['Cave'], evolveId: 'graveler'
    },
    graveler: {
        id: 'graveler', name: '隆隆石', tier: 1, family: 'geodude',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/隆隆石00.webp', battleImageUrl: 'assets/隆隆石01.webp',
        description: '死亡後召喚 2 隻 2/2 小石頭。', synergies: ['Cave'], evolveId: 'golem', isHiddenFromShop: true
    },
    golem: {
        id: 'golem', name: '隆隆岩', tier: 1, family: 'geodude',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/隆隆岩00.webp', battleImageUrl: 'assets/隆隆岩01.webp',
        description: '死亡後召喚 5 隻 5/5 小石頭。', synergies: ['Cave'], isHiddenFromShop: true
    },
    stone: {
        id: 'stone', name: '小石頭', tier: 1, family: 'geodude',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/小拳石00.webp', battleImageUrl: 'assets/小拳石01.webp',
        description: '小拳石的碎石。', synergies: ['Cave'], isHiddenFromShop: true
    },
    // 40. Pichu
    pichu: {
        id: 'pichu', name: '皮丘', tier: 2, family: 'pichu',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/皮丘00.webp', battleImageUrl: 'assets/皮丘01.webp',
        description: '戰鬥開始時，對最弱的敵方造成 [N] 傷害 (每三場戰鬥後增強)。', synergies: ['Charge', 'Charm'], evolveId: 'pikachu'
    },
    pikachu: {
        id: 'pikachu', name: '皮卡丘', tier: 2, family: 'pichu',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/皮卡丘00.webp', battleImageUrl: 'assets/皮卡丘01.webp',
        description: '戰鬥開始時，對最弱的敵方造成 [N] 傷害 (每兩場戰鬥後增強)。', synergies: ['Charge', 'Charm'], evolveId: 'raichu', isHiddenFromShop: true
    },
    raichu: {
        id: 'raichu', name: '雷丘', tier: 2, family: 'pichu',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/雷丘00.webp', battleImageUrl: 'assets/雷丘01.webp',
        description: '戰鬥開始時，對最弱的敵方造成 [N] 傷害 (每場戰鬥後增強)。', synergies: ['Charge', 'Charm'], isHiddenFromShop: true
    },
    // 41. Eevee
    eevee: {
        id: 'eevee', name: '伊布', tier: 3, family: 'eevee',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/伊布00.webp', battleImageUrl: 'assets/伊布01.webp',
        description: '合成時額外獲得兩倍經驗值且隨機進化。', synergies: ['BatonPass', 'Normal']
    },
    flareon: {
        id: 'flareon', name: '火伊布', tier: 3, family: 'eevee',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/火伊布00.webp', battleImageUrl: 'assets/火伊布01.webp',
        description: '合成時額外獲得兩倍經驗值；額外累積燃盡羈絆數量。', synergies: ['Fire', 'BatonPass'], isHiddenFromShop: true, evolveId: 'flareon_final'
    },
    flareon_final: {
        id: 'flareon_final', name: '火伊布', tier: 3, family: 'eevee',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/火伊布00.webp', battleImageUrl: 'assets/火伊布01.webp',
        description: '額外累積兩次燃盡羈絆數量。', synergies: ['Fire', 'BatonPass'], isHiddenFromShop: true
    },
    vaporeon: {
        id: 'vaporeon', name: '水伊布', tier: 3, family: 'eevee',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/水伊布00.webp', battleImageUrl: 'assets/水伊布01.webp',
        description: '合成時額外獲得兩倍經驗值；額外累積潮旋羈絆數量。', synergies: ['Water', 'BatonPass'], isHiddenFromShop: true, evolveId: 'vaporeon_final'
    },
    vaporeon_final: {
        id: 'vaporeon_final', name: '水伊布', tier: 3, family: 'eevee',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/水伊布00.webp', battleImageUrl: 'assets/水伊布01.webp',
        description: '額外累積兩次潮旋羈絆數量。', synergies: ['Water', 'BatonPass'], isHiddenFromShop: true
    },
    jolteon: {
        id: 'jolteon', name: '雷伊布', tier: 3, family: 'eevee',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/雷伊布00.webp', battleImageUrl: 'assets/雷伊布01.webp',
        description: '合成時額外獲得兩倍經驗值；額外累積電光羈絆數量。', synergies: ['Charge', 'BatonPass'], isHiddenFromShop: true, evolveId: 'jolteon_final'
    },
    jolteon_final: {
        id: 'jolteon_final', name: '雷伊布', tier: 3, family: 'eevee',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/雷伊布00.webp', battleImageUrl: 'assets/雷伊布01.webp',
        description: '額外累積兩次電光羈絆數量。', synergies: ['Charge', 'BatonPass'], isHiddenFromShop: true
    },
    espeon: {
        id: 'espeon', name: '太陽伊布', tier: 3, family: 'eevee',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/太陽伊布00.webp', battleImageUrl: 'assets/太陽伊布01.webp',
        description: '合成時額外獲得兩倍經驗值；額外累積念力羈絆數量。', synergies: ['Psychic', 'BatonPass'], isHiddenFromShop: true, evolveId: 'espeon_final'
    },
    espeon_final: {
        id: 'espeon_final', name: '太陽伊布', tier: 3, family: 'eevee',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/太陽伊布00.webp', battleImageUrl: 'assets/太陽伊布01.webp',
        description: '額外累積兩次念力羈絆數量。', synergies: ['Psychic', 'BatonPass'], isHiddenFromShop: true
    },
    umbreon: {
        id: 'umbreon', name: '月亮伊布', tier: 3, family: 'eevee',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/月亮伊布00.webp', battleImageUrl: 'assets/月亮伊布01.webp',
        description: '合成時額外獲得兩倍經驗值；額外累積小偷羈絆數量。', synergies: ['Thief', 'BatonPass'], isHiddenFromShop: true, evolveId: 'umbreon_final'
    },
    umbreon_final: {
        id: 'umbreon_final', name: '月亮伊布', tier: 3, family: 'eevee',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/月亮伊布00.webp', battleImageUrl: 'assets/月亮伊布01.webp',
        description: '額外累積兩次小偷羈絆數量。', synergies: ['Thief', 'BatonPass'], isHiddenFromShop: true
    },
    leafeon: {
        id: 'leafeon', name: '葉伊布', tier: 3, family: 'eevee',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/葉伊布00.webp', battleImageUrl: 'assets/葉伊布01.webp',
        description: '合成時額外獲得兩倍經驗值；額外累積吸取羈絆數量。', synergies: ['Grass', 'BatonPass'], isHiddenFromShop: true, evolveId: 'leafeon_final'
    },
    leafeon_final: {
        id: 'leafeon_final', name: '葉伊布', tier: 3, family: 'eevee',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/葉伊布00.webp', battleImageUrl: 'assets/葉伊布01.webp',
        description: '額外累積兩次吸取羈絆數量。', synergies: ['Grass', 'BatonPass'], isHiddenFromShop: true
    },
    glaceon: {
        id: 'glaceon', name: '冰伊布', tier: 3, family: 'eevee',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/冰伊布00.webp', battleImageUrl: 'assets/冰伊布01.webp',
        description: '合成時額外獲得兩倍經驗值；額外累積降雪羈絆數量。', synergies: ['Snow', 'BatonPass'], isHiddenFromShop: true, evolveId: 'glaceon_final'
    },
    glaceon_final: {
        id: 'glaceon_final', name: '冰伊布', tier: 3, family: 'eevee',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/冰伊布00.webp', battleImageUrl: 'assets/冰伊布01.webp',
        description: '額外累積兩次降雪羈絆數量。', synergies: ['Snow', 'BatonPass'], isHiddenFromShop: true
    },
    sylveon: {
        id: 'sylveon', name: '仙子伊布', tier: 3, family: 'eevee',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/仙子伊布00.webp', battleImageUrl: 'assets/仙子伊布01.webp',
        description: '合成時額外獲得兩倍經驗值；額外累積撒嬌羈絆數量。', synergies: ['Charm', 'BatonPass'], isHiddenFromShop: true, evolveId: 'sylveon_final'
    },
    sylveon_final: {
        id: 'sylveon_final', name: '仙子伊布', tier: 3, family: 'eevee',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/仙子伊布00.webp', battleImageUrl: 'assets/仙子伊布01.webp',
        description: '額外累積兩次撒嬌羈絆數量。', synergies: ['Charm', 'BatonPass'], isHiddenFromShop: true
    },

    // 27. Psyduck
    psyduck: {
        id: 'psyduck', name: '可達鴨', tier: 3, family: 'psyduck',
        baseStats: { hp: 3, maxHp: 3, attack: 5 },
        imageUrl: 'assets/可達鴨00.webp', battleImageUrl: 'assets/可達鴨01.webp',
        description: '擊殺敵方後，隨機 1 位友軍永久 +1 攻擊與 +2 生命。', synergies: ['Water', 'Psychic'], evolveId: 'golduck'
    },
    golduck: {
        id: 'golduck', name: '哥達鴨', tier: 3, family: 'psyduck',
        baseStats: { hp: 3, maxHp: 3, attack: 5 },
        imageUrl: 'assets/哥達鴨00.webp', battleImageUrl: 'assets/哥達鴨01.webp',
        description: '擊殺敵方後，隨機 2 位友軍永久 +1 攻擊與 +2 生命。', synergies: ['Water', 'Psychic'], evolveId: 'golduck_final', isHiddenFromShop: true
    },
    golduck_final: {
        id: 'golduck_final', name: '哥達鴨', tier: 3, family: 'psyduck',
        baseStats: { hp: 3, maxHp: 3, attack: 5 },
        imageUrl: 'assets/哥達鴨00.webp', battleImageUrl: 'assets/哥達鴨01.webp',
        description: '擊殺敵方後，隨機 3 位友軍永久 +1 攻擊與 +2 生命。', synergies: ['Water', 'Psychic'], isHiddenFromShop: true
    },

    // 28. Bellsprout
    bellsprout: {
        id: 'bellsprout', name: '喇叭芽', tier: 3, family: 'bellsprout',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/喇叭芽00.webp', battleImageUrl: 'assets/喇叭芽01.webp',
        description: '友軍死亡後，隨機 1 位友軍永久 +1 攻擊或生命。', synergies: ['Grass'], evolveId: 'weepinbell'
    },
    weepinbell: {
        id: 'weepinbell', name: '口呆花', tier: 3, family: 'bellsprout',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/口呆花00.webp', battleImageUrl: 'assets/口呆花01.webp',
        description: '友軍死亡後，隨機 2 位友軍永久 +1 攻擊或生命。', synergies: ['Grass'], evolveId: 'victreebel', isHiddenFromShop: true
    },
    victreebel: {
        id: 'victreebel', name: '大食花', tier: 3, family: 'bellsprout',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/大食花00.webp', battleImageUrl: 'assets/大食花01.webp',
        description: '友軍死亡後，隨機 3 位友軍永久 +1 攻擊或生命。', synergies: ['Grass'], isHiddenFromShop: true
    },

    // 29. Vulpix
    vulpix: {
        id: 'vulpix', name: '六尾', tier: 3, family: 'vulpix',
        baseStats: { hp: 5, maxHp: 5, attack: 3 },
        imageUrl: 'assets/六尾00.webp', battleImageUrl: 'assets/六尾01.webp',
        description: '擊殺敵方後，隨機 1 位友軍永久 +2 攻擊與 +1 生命。', synergies: ['Fire', 'Charm'], evolveId: 'ninetales'
    },
    ninetales: {
        id: 'ninetales', name: '九尾', tier: 3, family: 'vulpix',
        baseStats: { hp: 5, maxHp: 5, attack: 3 },
        imageUrl: 'assets/九尾00.webp', battleImageUrl: 'assets/九尾01.webp',
        description: '擊殺敵方後，隨機 2 位友軍永久 +2 攻擊與 +1 生命。', synergies: ['Fire', 'Charm'], evolveId: 'ninetales_final', isHiddenFromShop: true
    },
    ninetales_final: {
        id: 'ninetales_final', name: '九尾', tier: 3, family: 'vulpix',
        baseStats: { hp: 5, maxHp: 5, attack: 3 },
        imageUrl: 'assets/九尾00.webp', battleImageUrl: 'assets/九尾01.webp',
        description: '擊殺敵方後，隨機 3 位友軍永久 +2 攻擊與 +1 生命。', synergies: ['Fire', 'Charm'], isHiddenFromShop: true
    },

    // 30. Mareep
    mareep: {
        id: 'mareep', name: '咩利羊', tier: 4, family: 'mareep',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/咩利羊00.webp', battleImageUrl: 'assets/咩利羊01.webp',
        description: '友軍擊殺後，隨機 1 位友軍永久 +1 生命與攻擊。', synergies: ['Charge'], evolveId: 'flaaffy'
    },
    flaaffy: {
        id: 'flaaffy', name: '茸茸羊', tier: 4, family: 'mareep',
        baseStats: { hp: 5, maxHp: 5, attack: 5 },
        imageUrl: 'assets/茸茸羊00.webp', battleImageUrl: 'assets/茸茸羊01.webp',
        description: '友軍擊殺後，隨機 2 位友軍永久 +1 生命與攻擊。', synergies: ['Charge'], evolveId: 'ampharos', isHiddenFromShop: true
    },
    ampharos: {
        id: 'ampharos', name: '電龍', tier: 4, family: 'mareep',
        baseStats: { hp: 6, maxHp: 6, attack: 6 },
        imageUrl: 'assets/電龍00.webp', battleImageUrl: 'assets/電龍01.webp',
        description: '友軍擊殺後，隨機 3 位友軍永久 +1 生命與攻擊。', synergies: ['Charge', 'Outrage'], isHiddenFromShop: true
    },

    // 31. Cubone
    cubone: {
        id: 'cubone', name: '卡拉卡拉', tier: 3, family: 'cubone',
        baseStats: { hp: 3, maxHp: 3, attack: 5 },
        imageUrl: 'assets/卡拉卡拉00.webp', battleImageUrl: 'assets/卡拉卡拉01.webp',
        description: '死亡時，對隨機敵方造成 33% 攻擊的傷害。', synergies: ['Hard', 'Angry'], evolveId: 'marowak'
    },
    marowak: {
        id: 'marowak', name: '嘎啦嘎啦', tier: 3, family: 'cubone',
        baseStats: { hp: 3, maxHp: 3, attack: 5 },
        imageUrl: 'assets/嘎啦嘎啦00.webp', battleImageUrl: 'assets/嘎啦嘎啦01.webp',
        description: '死亡時，對隨機敵方造成 50% 攻擊的傷害。', synergies: ['Hard', 'Angry'], evolveId: 'marowak_final', isHiddenFromShop: true
    },
    marowak_final: {
        id: 'marowak_final', name: '嘎啦嘎啦', tier: 3, family: 'cubone',
        baseStats: { hp: 3, maxHp: 3, attack: 5 },
        imageUrl: 'assets/嘎啦嘎啦00.webp', battleImageUrl: 'assets/嘎啦嘎啦01.webp',
        description: '死亡時，對隨機敵方造成 100% 攻擊的傷害。', synergies: ['Hard', 'Angry'], isHiddenFromShop: true
    },

    // 32. Murkrow
    murkrow: {
        id: 'murkrow', name: '黑暗鴉', tier: 4, family: 'murkrow',
        baseStats: { hp: 6, maxHp: 6, attack: 4 },
        imageUrl: 'assets/黑暗鴉00.webp', battleImageUrl: 'assets/黑暗鴉01.webp',
        description: '攻擊後，移動至隊伍最後方；敵方攻擊時，自身追擊 5 傷害。', synergies: ['Thief', 'Roost'], evolveId: 'honchkrow'
    },
    honchkrow: {
        id: 'honchkrow', name: '烏鴉頭頭', tier: 4, family: 'murkrow',
        baseStats: { hp: 6, maxHp: 6, attack: 4 },
        imageUrl: 'assets/烏鴉頭頭00.webp', battleImageUrl: 'assets/烏鴉頭頭01.webp',
        description: '攻擊後，移動至隊伍最後方；敵方攻擊時，自身追擊 5 傷害。', synergies: ['Thief', 'Roost'], evolveId: 'honchkrow_final', isHiddenFromShop: true
    },
    honchkrow_final: {
        id: 'honchkrow_final', name: '烏鴉頭頭', tier: 4, family: 'murkrow',
        baseStats: { hp: 6, maxHp: 6, attack: 4 },
        imageUrl: 'assets/烏鴉頭頭00.webp', battleImageUrl: 'assets/烏鴉頭頭01.webp',
        description: '攻擊後，移動至隊伍最後方；敵方攻擊時，自身追擊 5 傷害。', synergies: ['Thief', 'Roost'], isHiddenFromShop: true
    },
    // 33. Bonsly
    bonsly: {
        id: 'bonsly', name: '盆才怪', tier: 1, family: 'bonsly',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/盆才怪00.webp', battleImageUrl: 'assets/盆才怪01.webp',
        description: '攻擊時，對敵方末位造成 1 傷害。', synergies: ['Hard'], evolveId: 'sudowoodo'
    },
    sudowoodo: {
        id: 'sudowoodo', name: '樹才怪', tier: 1, family: 'bonsly',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/樹才怪00.webp', battleImageUrl: 'assets/樹才怪01.webp',
        description: '攻擊時，對敵方末位造成 2 傷害。', synergies: ['Hard'], evolveId: 'sudowoodo_final', isHiddenFromShop: true
    },
    sudowoodo_final: {
        id: 'sudowoodo_final', name: '樹才怪', tier: 1, family: 'bonsly',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/樹才怪00.webp', battleImageUrl: 'assets/樹才怪01.webp',
        description: '攻擊時，對敵方末位造成 5 傷害。', synergies: ['Hard'], isHiddenFromShop: true
    },
    // 34. Happiny
    happiny: {
        id: 'happiny', name: '小福蛋', tier: 4, family: 'happiny',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/小福蛋00.webp', battleImageUrl: 'assets/小福蛋01.webp',
        description: '攻擊後自身與後方角色永久 +1 生命。', synergies: ['Normal', 'Charm'], evolveId: 'chansey'
    },
    chansey: {
        id: 'chansey', name: '吉利蛋', tier: 4, family: 'happiny',
        baseStats: { hp: 5, maxHp: 5, attack: 5 },
        imageUrl: 'assets/吉利蛋00.webp', battleImageUrl: 'assets/吉利蛋01.webp',
        description: '攻擊後自身與後方角色永久 +3 生命。', synergies: ['Normal', 'Charm'], evolveId: 'blissey', isHiddenFromShop: true
    },
    blissey: {
        id: 'blissey', name: '幸福蛋', tier: 4, family: 'happiny',
        baseStats: { hp: 6, maxHp: 6, attack: 6 },
        imageUrl: 'assets/幸福蛋00.webp', battleImageUrl: 'assets/幸福蛋01.webp',
        description: '攻擊後自身與後方角色永久 +5 生命。', synergies: ['Normal', 'Charm'], isHiddenFromShop: true
    },
    // 35. Legendary Beasts
    raikou: {
        id: 'raikou', name: '雷公', tier: 5, family: 'raikou',
        baseStats: { hp: 15, maxHp: 15, attack: 15 },
        imageUrl: 'assets/雷公00.webp', battleImageUrl: 'assets/雷公01.webp',
        description: '戰鬥開始時，對所有敵方造成 5-15 傷害。', synergies: ['Charge']
    },
    entei: {
        id: 'entei', name: '炎帝', tier: 5, family: 'entei',
        baseStats: { hp: 15, maxHp: 15, attack: 15 },
        imageUrl: 'assets/炎帝00.webp', battleImageUrl: 'assets/炎帝01.webp',
        description: '戰鬥開始時，對最強的敵方造成 50 傷害。', synergies: ['Fire']
    },
    suicune: {
        id: 'suicune', name: '水君', tier: 5, family: 'suicune',
        baseStats: { hp: 15, maxHp: 15, attack: 15 },
        imageUrl: 'assets/水君00.webp', battleImageUrl: 'assets/水君01.webp',
        description: '戰鬥開始時，對最弱的敵方造成 50 傷害。', synergies: ['Water']
    },
    // 36. Dratini Family
    dratini: {
        id: 'dratini', name: '迷你龍', tier: 5, family: 'dratini',
        baseStats: { hp: 8, maxHp: 8, attack: 8 },
        imageUrl: 'assets/迷你龍00.webp', battleImageUrl: 'assets/迷你龍01.webp',
        description: '準備結束時，全體永久 +2 攻擊或生命；每三場戰鬥後獲得 1 點 EXP。', synergies: ['Outrage'], evolveId: 'dragonair'
    },
    dragonair: {
        id: 'dragonair', name: '哈克龍', tier: 5, family: 'dratini',
        baseStats: { hp: 8, maxHp: 8, attack: 8 },
        imageUrl: 'assets/哈克龍00.webp', battleImageUrl: 'assets/哈克龍01.webp',
        description: '準備結束時，全體永久 +3 攻擊或生命；每三場戰鬥後獲得 1 點 EXP。', synergies: ['Outrage'], evolveId: 'dragonite', isHiddenFromShop: true
    },
    dragonite: {
        id: 'dragonite', name: '快龍', tier: 5, family: 'dratini',
        baseStats: { hp: 10, maxHp: 10, attack: 10 },
        imageUrl: 'assets/快龍00.webp', battleImageUrl: 'assets/快龍01.webp',
        description: '準備結束時，全體永久 +3 攻擊與生命。', synergies: ['Outrage', 'Roost'], isHiddenFromShop: true
    },
    // 37. Larvitar Family
    larvitar: {
        id: 'larvitar', name: '幼基拉斯', tier: 5, family: 'larvitar',
        baseStats: { hp: 8, maxHp: 8, attack: 8 },
        imageUrl: 'assets/幼基拉斯00.webp', battleImageUrl: 'assets/幼基拉斯01.webp',
        description: '同時對後方敵方造成 33% 傷害；每三場戰鬥後獲得 1 點 EXP。', synergies: ['Cave'], evolveId: 'pupitar'
    },
    pupitar: {
        id: 'pupitar', name: '沙基拉斯', tier: 5, family: 'larvitar',
        baseStats: { hp: 8, maxHp: 8, attack: 8 },
        imageUrl: 'assets/沙基拉斯00.webp', battleImageUrl: 'assets/沙基拉斯01.webp',
        description: '同時對後方敵方造成 50% 傷害；每三場戰鬥後獲得 1 點 EXP。', synergies: ['Cave'], evolveId: 'tyranitar', isHiddenFromShop: true
    },
    tyranitar: {
        id: 'tyranitar', name: '班基拉斯', tier: 5, family: 'larvitar',
        baseStats: { hp: 10, maxHp: 10, attack: 10 },
        imageUrl: 'assets/班基拉斯00.webp', battleImageUrl: 'assets/班基拉斯01.webp',
        description: '同時對後方敵方造成 66% 傷害。', synergies: ['Thief', 'Cave'], isHiddenFromShop: true
    },
    // 37. Delibird
    delibird: {
        id: 'delibird', name: '信使鳥', tier: 3, family: 'delibird',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/信使鳥00.webp', battleImageUrl: 'assets/信使鳥01.webp',
        description: '戰鬥開始時，對隨機敵方造成 3 傷害，隨機友方 +3 生命 (共 1 次)。', synergies: ['Snow', 'BatonPass'],
        abilityPower: 3,
        evolveId: 'delibird_2'
    },
    delibird_2: {
        id: 'delibird_2', name: '信使鳥', tier: 3, family: 'delibird',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/信使鳥00.webp', battleImageUrl: 'assets/信使鳥01.webp',
        description: '戰鬥開始時，對隨機敵方造成 3 傷害，隨機友方 +3 生命 (共 2 次)。', synergies: ['Snow', 'BatonPass'],
        abilityPower: 3,
        evolveId: 'delibird_3',
        isHiddenFromShop: true
    },
    delibird_3: {
        id: 'delibird_3', name: '信使鳥', tier: 3, family: 'delibird',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/信使鳥00.webp', battleImageUrl: 'assets/信使鳥01.webp',
        description: '戰鬥開始時，對隨機敵方造成 3 傷害，隨機友方 +3 生命 (共 3 次)。', synergies: ['Snow', 'BatonPass'],
        abilityPower: 3,
        isHiddenFromShop: true
    },
    // 38. Shuckle
    shuckle: {
        id: 'shuckle', name: '壺壺', tier: 4, family: 'shuckle',
        baseStats: { hp: 6, maxHp: 6, attack: 6 },
        imageUrl: 'assets/壺壺00.webp', battleImageUrl: 'assets/壺壺01.webp',
        description: '戰鬥開始時，獲得自身 33% 生命的攻擊。', synergies: ['BugBite', 'Hard']
    },
    // 39. Riolu Family
    riolu: {
        id: 'riolu', name: '利歐路', tier: 1, family: 'riolu',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/利歐路00.webp', battleImageUrl: 'assets/利歐路01.webp',
        description: '死亡後，對敵方首位造成 [N] 傷害 (每場戰鬥後增強)。', synergies: ['SwordDance'], evolveId: 'lucario'
    },
    lucario: {
        id: 'lucario', name: '路卡利歐', tier: 1, family: 'riolu',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/路卡利歐00.webp', battleImageUrl: 'assets/路卡利歐01.webp',
        description: '死亡後，對敵方首位造成 [N] 傷害 (每場戰鬥後增強)。', synergies: ['SwordDance', 'Hard'], evolveId: 'lucario_final', isHiddenFromShop: true
    },
    lucario_final: {
        id: 'lucario_final', name: '路卡利歐', tier: 1, family: 'riolu',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/路卡利歐00.webp', battleImageUrl: 'assets/路卡利歐01.webp',
        description: '死亡後，對敵方首位造成 [N] 傷害 (每場戰鬥後增強)。', synergies: ['SwordDance', 'Hard'], isHiddenFromShop: true
    },
    // 40. Cramorant Family
    cramorant: {
        id: 'cramorant', name: '古月鳥', tier: 4, family: 'cramorant',
        baseStats: { hp: 6, maxHp: 6, attack: 6 },
        imageUrl: 'assets/古月鳥00.webp', battleImageUrl: 'assets/古月鳥01.webp',
        description: '死亡時，召喚 1 隻古月鳥 33% 體質的皮卡丘。', synergies: ['Water', 'Roost'], evolveId: 'cramorant_2'
    },
    cramorant_2: {
        id: 'cramorant_2', name: '古月鳥', tier: 4, family: 'cramorant',
        baseStats: { hp: 6, maxHp: 6, attack: 6 },
        imageUrl: 'assets/古月鳥00.webp', battleImageUrl: 'assets/古月鳥01.webp',
        description: '死亡時，召喚 1 隻古月鳥 33% 體質的皮卡丘。', synergies: ['Water', 'Roost'], evolveId: 'cramorant_3', isHiddenFromShop: true
    },
    cramorant_3: {
        id: 'cramorant_3', name: '古月鳥', tier: 4, family: 'cramorant',
        baseStats: { hp: 6, maxHp: 6, attack: 6 },
        imageUrl: 'assets/古月鳥00.webp', battleImageUrl: 'assets/古月鳥01.webp',
        description: '死亡時，召喚 1 隻古月鳥 33% 體質的皮卡丘。', synergies: ['Water', 'Roost'], isHiddenFromShop: true
    },
    // 41. Comfey Family
    comfey: {
        id: 'comfey', name: '花療環環', tier: 4, family: 'comfey',
        baseStats: { hp: 6, maxHp: 6, attack: 4 },
        imageUrl: 'assets/花療環環00.webp', battleImageUrl: 'assets/花療環環01.webp',
        description: '擊殺敵方後，自身與後方角色永久 +3 生命。', synergies: ['Grass', 'Charm'], evolveId: 'comfey_2'
    },
    comfey_2: {
        id: 'comfey_2', name: '花療環環', tier: 4, family: 'comfey',
        baseStats: { hp: 6, maxHp: 6, attack: 4 },
        imageUrl: 'assets/花療環環00.webp', battleImageUrl: 'assets/花療環環01.webp',
        description: '擊殺敵方後，自身與後方角色永久 +3 生命。', synergies: ['Grass', 'Charm'], evolveId: 'comfey_3', isHiddenFromShop: true
    },
    comfey_3: {
        id: 'comfey_3', name: '花療環環', tier: 4, family: 'comfey',
        baseStats: { hp: 6, maxHp: 6, attack: 4 },
        imageUrl: 'assets/花療環環00.webp', battleImageUrl: 'assets/花療環環01.webp',
        description: '擊殺敵方後，自身與後方角色永久 +3 生命。', synergies: ['Grass', 'Charm'], isHiddenFromShop: true
    },
    // 42. Mawile Family
    mawile: {
        id: 'mawile', name: '大嘴娃', tier: 4, family: 'mawile',
        baseStats: { hp: 4, maxHp: 4, attack: 6 },
        imageUrl: 'assets/大嘴娃00.webp', battleImageUrl: 'assets/大嘴娃01.webp',
        description: '擊殺敵方後，自身與後方角色永久 +3 攻擊。', synergies: ['Angry', 'Intimidate'], evolveId: 'mawile_2'
    },
    mawile_2: {
        id: 'mawile_2', name: '大嘴娃', tier: 4, family: 'mawile',
        baseStats: { hp: 4, maxHp: 4, attack: 6 },
        imageUrl: 'assets/大嘴娃00.webp', battleImageUrl: 'assets/大嘴娃01.webp',
        description: '擊殺敵方後，自身與後方角色永久 +3 攻擊。', synergies: ['Angry', 'Intimidate'], evolveId: 'mawile_3', isHiddenFromShop: true
    },
    mawile_3: {
        id: 'mawile_3', name: '大嘴娃', tier: 4, family: 'mawile',
        baseStats: { hp: 4, maxHp: 4, attack: 6 },
        imageUrl: 'assets/大嘴娃00.webp', battleImageUrl: 'assets/大嘴娃01.webp',
        description: '擊殺敵方後，自身與後方角色永久 +3 攻擊。', synergies: ['Angry', 'Intimidate'], isHiddenFromShop: true
    },
    // 43. Grubbin Family
    grubbin: {
        id: 'grubbin', name: '強顎雞母蟲', tier: 1, family: 'grubbin',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/強顎雞母蟲00.webp', battleImageUrl: 'assets/強顎雞母蟲01.webp',
        description: '戰鬥開始時，隨機友軍永久 +1 攻擊與生命。', synergies: ['BugBite'], evolveId: 'grubbin_2'
    },
    grubbin_2: {
        id: 'grubbin_2', name: '蟲電寶', tier: 1, family: 'grubbin',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/蟲電寶00.webp', battleImageUrl: 'assets/蟲電寶01.webp',
        description: '戰鬥開始時，隨機友軍永久 +2 攻擊與生命。', synergies: ['BugBite', 'Charge'], evolveId: 'grubbin_3', isHiddenFromShop: true
    },
    grubbin_3: {
        id: 'grubbin_3', name: '鍬農炮蟲', tier: 1, family: 'grubbin',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/鍬農炮蟲00.webp', battleImageUrl: 'assets/鍬農炮蟲01.webp',
        description: '戰鬥開始時，我方全體永久 +2 攻擊與生命。', synergies: ['BugBite', 'Charge'], isHiddenFromShop: true
    },
    // 44. Croagunk Family
    croagunk: {
        id: 'croagunk', name: '不良蛙', tier: 1, family: 'croagunk',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/不良蛙00.webp', battleImageUrl: 'assets/不良蛙01.webp',
        description: '合成與出售時前方友軍 +1 攻擊與生命。', synergies: ['Thief'], evolveId: 'croagunk_2'
    },
    croagunk_2: {
        id: 'croagunk_2', name: '毒骷蛙', tier: 1, family: 'croagunk',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/毒骷蛙00.webp', battleImageUrl: 'assets/毒骷蛙01.webp',
        description: '合成與出售時前方友軍 +2 攻擊與生命。', synergies: ['Thief'], evolveId: 'croagunk_3', isHiddenFromShop: true
    },
    croagunk_3: {
        id: 'croagunk_3', name: '毒骷蛙', tier: 1, family: 'croagunk',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/毒骷蛙00.webp', battleImageUrl: 'assets/毒骷蛙01.webp',
        description: '出售時全體友軍 +5 攻擊與生命。', synergies: ['Thief'], isHiddenFromShop: true
    },
    // 45. Munna Family
    munna: {
        id: 'munna', name: '食夢夢', tier: 1, family: 'munna',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/食夢夢00.webp', battleImageUrl: 'assets/食夢夢01.webp',
        description: '合成與出售時後方友軍 +1 攻擊與生命。', synergies: ['Trick'], evolveId: 'munna_2'
    },
    munna_2: {
        id: 'munna_2', name: '夢夢蝕', tier: 1, family: 'munna',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/夢夢蝕00.webp', battleImageUrl: 'assets/夢夢蝕01.webp',
        description: '合成與出售時後方友軍 +2 攻擊與生命。', synergies: ['Trick'], evolveId: 'munna_3', isHiddenFromShop: true
    },
    munna_3: {
        id: 'munna_3', name: '夢夢蝕', tier: 1, family: 'munna',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/夢夢蝕00.webp', battleImageUrl: 'assets/夢夢蝕01.webp',
        description: '出售時全體友軍 +5 攻擊與生命。', synergies: ['Trick'], isHiddenFromShop: true
    },
    // 46. Wooper Family
    wooper: {
        id: 'wooper', name: '烏波', tier: 2, family: 'wooper',
        baseStats: { hp: 4, maxHp: 4, attack: 2 },
        imageUrl: 'assets/烏波00.webp', battleImageUrl: 'assets/烏波01.webp',
        description: '戰鬥開始時，前方友軍獲得烏波 33% 生命。', synergies: ['Water', 'Cave'], evolveId: 'wooper_2'
    },
    wooper_2: {
        id: 'wooper_2', name: '沼王', tier: 2, family: 'wooper',
        baseStats: { hp: 4, maxHp: 4, attack: 2 },
        imageUrl: 'assets/沼王00.webp', battleImageUrl: 'assets/沼王01.webp',
        description: '戰鬥開始時，前方友軍獲得沼王 50% 生命。', synergies: ['Water', 'Cave'], evolveId: 'wooper_3', isHiddenFromShop: true
    },
    wooper_3: {
        id: 'wooper_3', name: '沼王', tier: 2, family: 'wooper',
        baseStats: { hp: 4, maxHp: 4, attack: 2 },
        imageUrl: 'assets/沼王00.webp', battleImageUrl: 'assets/沼王01.webp',
        description: '戰鬥開始時，前方友軍獲得沼王 100% 生命級。', synergies: ['Water', 'Cave'], isHiddenFromShop: true
    },
    // 47. Pumpkaboo Family
    pumpkaboo: {
        id: 'pumpkaboo', name: '南瓜精', tier: 2, family: 'pumpkaboo',
        baseStats: { hp: 4, maxHp: 4, attack: 2 },
        imageUrl: 'assets/南瓜精00.webp', battleImageUrl: 'assets/南瓜精01.webp',
        description: '死亡後，將敵方的所有羈絆無效化。', synergies: ['Grass', 'Trick'], evolveId: 'pumpkaboo_2'
    },
    // 48. Gulpin Family
    gulpin: {
        id: 'gulpin', name: '溶食獸', tier: 2, family: 'gulpin',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/溶食獸00.webp', battleImageUrl: 'assets/溶食獸01.webp',
        description: '戰鬥開始時，吞噬前方角色；死亡後召喚該角色。', synergies: ['Normal', 'Ghost'], evolveId: 'gulpin_2'
    },
    gulpin_2: {
        id: 'gulpin_2', name: '吞食獸', tier: 2, family: 'gulpin',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/吞食獸00.webp', battleImageUrl: 'assets/吞食獸01.webp',
        description: '戰鬥開始時，吞噬前方角色；死亡後召喚該角色。', synergies: ['Normal', 'Ghost'], evolveId: 'gulpin_3', isHiddenFromShop: true
    },
    gulpin_3: {
        id: 'gulpin_3', name: '吞食獸', tier: 2, family: 'gulpin',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/吞食獸00.webp', battleImageUrl: 'assets/吞食獸01.webp',
        description: '戰鬥開始時，吞噬前方角色；死亡後召喚該角色。', synergies: ['Normal', 'Ghost'], isHiddenFromShop: true
    },
    pumpkaboo_2: {
        id: 'pumpkaboo_2', name: '南瓜怪人', tier: 2, family: 'pumpkaboo',
        baseStats: { hp: 4, maxHp: 4, attack: 2 },
        imageUrl: 'assets/南瓜怪人00.webp', battleImageUrl: 'assets/南瓜怪人01.webp',
        description: '死亡後，將敵方的所有羈絆無效化。', synergies: ['Grass', 'Trick'], evolveId: 'pumpkaboo_3', isHiddenFromShop: true
    },
    pumpkaboo_3: {
        id: 'pumpkaboo_3', name: '南瓜怪人', tier: 2, family: 'pumpkaboo',
        baseStats: { hp: 4, maxHp: 4, attack: 2 },
        imageUrl: 'assets/南瓜怪人00.webp', battleImageUrl: 'assets/南瓜怪人01.webp',
        description: '死亡後，將敵方的所有羈絆無效化。', synergies: ['Grass', 'Trick'], isHiddenFromShop: true
    },
    growlithe: {
        id: 'growlithe', name: '卡蒂狗', tier: 2, family: 'growlithe',
        baseStats: { hp: 2, maxHp: 2, attack: 4 },
        imageUrl: 'assets/卡蒂狗00.webp', battleImageUrl: 'assets/卡蒂狗01.webp',
        description: '攻擊時，改為攻擊最弱的敵方。', synergies: ['Fire', 'Intimidate'], evolveId: 'growlithe_2'
    },
    growlithe_2: {
        id: 'growlithe_2', name: '風速狗', tier: 2, family: 'growlithe',
        baseStats: { hp: 2, maxHp: 2, attack: 4 },
        imageUrl: 'assets/風速狗00.webp', battleImageUrl: 'assets/風速狗01.webp',
        description: '攻擊時，改為攻擊最弱的敵方。', synergies: ['Fire', 'Intimidate'], evolveId: 'growlithe_3', isHiddenFromShop: true
    },
    growlithe_3: {
        id: 'growlithe_3', name: '風速狗', tier: 2, family: 'growlithe',
        baseStats: { hp: 2, maxHp: 2, attack: 4 },
        imageUrl: 'assets/風速狗00.webp', battleImageUrl: 'assets/風速狗01.webp',
        description: '攻擊時，改為攻擊最弱的敵方。', synergies: ['Fire', 'Intimidate'], isHiddenFromShop: true
    },
    swablu: {
        id: 'swablu', name: '青綿鳥', tier: 2, family: 'swablu',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/青綿鳥00.webp', battleImageUrl: 'assets/青綿鳥01.webp',
        description: '攻擊前，+1 攻擊與生命（每場戰鬥限2次）。', synergies: ['Roost'], evolveId: 'swablu_2'
    },
    swablu_2: {
        id: 'swablu_2', name: '七夕青鳥', tier: 2, family: 'swablu',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/七夕青鳥00.webp', battleImageUrl: 'assets/七夕青鳥01.webp',
        description: '攻擊前，+3 攻擊與生命（每場戰鬥限2次）。', synergies: ['Roost', 'Outrage'], evolveId: 'swablu_3', isHiddenFromShop: true
    },
    swablu_3: {
        id: 'swablu_3', name: '七夕青鳥', tier: 2, family: 'swablu',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/七夕青鳥00.webp', battleImageUrl: 'assets/七夕青鳥01.webp',
        description: '攻擊前，+5 攻擊與生命（每場戰鬥限2次）。', synergies: ['Roost', 'Outrage'], isHiddenFromShop: true
    },
    plusle: {
        id: 'plusle', name: '正電拍拍', tier: 2, family: 'plusle',
        baseStats: { hp: 2, maxHp: 2, attack: 4 },
        imageUrl: 'assets/正電拍拍00.webp', battleImageUrl: 'assets/正電拍拍01.webp',
        description: '戰鬥開始時，首位友軍獲得正電拍拍 25% 攻擊。', synergies: ['Charge', 'BatonPass'], evolveId: 'plusle_2'
    },
    plusle_2: {
        id: 'plusle_2', name: '正電拍拍', tier: 2, family: 'plusle',
        baseStats: { hp: 2, maxHp: 2, attack: 4 },
        imageUrl: 'assets/正電拍拍00.webp', battleImageUrl: 'assets/正電拍拍01.webp',
        description: '戰鬥開始時，首位友軍獲得正電拍拍 33% 攻擊。', synergies: ['Charge', 'BatonPass'], evolveId: 'plusle_3', isHiddenFromShop: true
    },
    plusle_3: {
        id: 'plusle_3', name: '正電拍拍', tier: 2, family: 'plusle',
        baseStats: { hp: 2, maxHp: 2, attack: 4 },
        imageUrl: 'assets/正電拍拍00.webp', battleImageUrl: 'assets/正電拍拍01.webp',
        description: '戰鬥開始時，首位友軍獲得正電拍拍 50% 攻擊。', synergies: ['Charge', 'BatonPass'], isHiddenFromShop: true
    },
    minun: {
        id: 'minun', name: '負電拍拍', tier: 2, family: 'minun',
        baseStats: { hp: 4, maxHp: 4, attack: 2 },
        imageUrl: 'assets/負電拍拍00.webp', battleImageUrl: 'assets/負電拍拍01.webp',
        description: '戰鬥開始時，首位友軍獲得生命加成。', synergies: ['Charge', 'BatonPass'], evolveId: 'minun_2'
    },
    minun_2: {
        id: 'minun_2', name: '負電拍拍', tier: 2, family: 'minun',
        baseStats: { hp: 4, maxHp: 4, attack: 2 },
        imageUrl: 'assets/負電拍拍00.webp', battleImageUrl: 'assets/負電拍拍01.webp',
        description: '戰鬥開始時，首位友軍獲得生命加成。', synergies: ['Charge', 'BatonPass'], evolveId: 'minun_3', isHiddenFromShop: true
    },
    minun_3: {
        id: 'minun_3', name: '負電拍拍', tier: 2, family: 'minun',
        baseStats: { hp: 4, maxHp: 4, attack: 2 },
        imageUrl: 'assets/負電拍拍00.webp', battleImageUrl: 'assets/負電拍拍01.webp',
        description: '戰鬥開始時，首位友軍獲得生命加成。', synergies: ['Charge', 'BatonPass'], isHiddenFromShop: true
    },
    trapinch: {
        id: 'trapinch', name: '大顎蟻', tier: 3, family: 'trapinch',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/大顎蟻00.webp', battleImageUrl: 'assets/大顎蟻01.webp',
        description: '攻擊時，同時對其他全體角色造成 1 傷害。', synergies: ['Cave'], evolveId: 'trapinch_2'
    },
    trapinch_2: {
        id: 'trapinch_2', name: '超音波幼蟲', tier: 3, family: 'trapinch',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/超音波幼蟲00.webp', battleImageUrl: 'assets/超音波幼蟲01.webp',
        description: '攻擊時，同時對其他全體角色造成 2 傷害。', synergies: ['Cave', 'Outrage'], evolveId: 'trapinch_3', isHiddenFromShop: true
    },
    trapinch_3: {
        id: 'trapinch_3', name: '沙漠蜻蜓', tier: 3, family: 'trapinch',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/沙漠蜻蜓00.webp', battleImageUrl: 'assets/沙漠蜻蜓01.webp',
        description: '攻擊時，同時對其他全體角色造成 5 傷害。', synergies: ['Cave', 'Outrage'], isHiddenFromShop: true
    },
    pawmi: {
        id: 'pawmi', name: '布撥', tier: 3, family: 'pawmi',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/布撥00.webp', battleImageUrl: 'assets/布撥01.webp',
        description: '擊殺敵方後，隨機 1 位友軍永久 +1 攻擊與 +2 生命。', synergies: ['Charge', 'Charm'], evolveId: 'pawmi_2'
    },
    pawmi_2: {
        id: 'pawmi_2', name: '布土撥', tier: 3, family: 'pawmi',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/布土撥00.webp', battleImageUrl: 'assets/布土撥01.webp',
        description: '擊殺敵方後，隨機 2 位友軍永久 +1 攻擊與 +2 生命。', synergies: ['Charge', 'Charm'], evolveId: 'pawmi_3', isHiddenFromShop: true
    },
    pawmi_3: {
        id: 'pawmi_3', name: '巴布土撥', tier: 3, family: 'pawmi',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/巴布土撥00.webp', battleImageUrl: 'assets/巴布土撥01.webp',
        description: '擊殺敵方後，隨機 3 位友軍永久 +1 攻擊與 +2 生命。', synergies: ['Charge', 'Charm'], isHiddenFromShop: true
    },
    spheal: {
        id: 'spheal', name: '海豹球', tier: 3, family: 'spheal',
        baseStats: { hp: 5, maxHp: 5, attack: 3 },
        imageUrl: 'assets/海豹球00.webp', battleImageUrl: 'assets/海豹球01.webp',
        description: '攻擊時，同時對後方敵方造成 33% 傷害。', synergies: ['Water', 'Snow'], evolveId: 'spheal_2'
    },
    spheal_2: {
        id: 'spheal_2', name: '海魔獅', tier: 3, family: 'spheal',
        baseStats: { hp: 5, maxHp: 5, attack: 3 },
        imageUrl: 'assets/海魔獅00.webp', battleImageUrl: 'assets/海魔獅01.webp',
        description: '攻擊時，同時對後方敵方造成 50% 傷害。', synergies: ['Water', 'Snow'], evolveId: 'spheal_3', isHiddenFromShop: true
    },
    spheal_3: {
        id: 'spheal_3', name: '帝牙海獅', tier: 3, family: 'spheal',
        baseStats: { hp: 5, maxHp: 5, attack: 3 },
        imageUrl: 'assets/帝牙海獅00.webp', battleImageUrl: 'assets/帝牙海獅01.webp',
        description: '攻擊時，同時對後方敵方造成 66% 傷害。', synergies: ['Water', 'Snow'], isHiddenFromShop: true
    },
    bagon: {
        id: 'bagon', name: '寶貝龍', tier: 5, family: 'bagon',
        baseStats: { hp: 8, maxHp: 8, attack: 8 },
        imageUrl: 'assets/寶貝龍00.webp', battleImageUrl: 'assets/寶貝龍01.webp',
        description: '友軍擊殺後，全體我方 +1 攻擊；每三場戰鬥後獲得 1 點 EXP。', synergies: ['Outrage'], evolveId: 'bagon_2'
    },
    bagon_2: {
        id: 'bagon_2', name: '甲殼龍', tier: 5, family: 'bagon',
        baseStats: { hp: 8, maxHp: 8, attack: 8 },
        imageUrl: 'assets/甲殼龍00.webp', battleImageUrl: 'assets/甲殼龍01.webp',
        description: '友軍擊殺後，全體我方 +2 攻擊；每三場戰鬥後獲得 1 點 EXP。', synergies: ['Outrage'], evolveId: 'bagon_3', isHiddenFromShop: true
    },
    bagon_3: {
        id: 'bagon_3', name: '暴飛龍', tier: 5, family: 'bagon',
        baseStats: { hp: 10, maxHp: 10, attack: 10 },
        imageUrl: 'assets/暴飛龍00.webp', battleImageUrl: 'assets/暴飛龍01.webp',
        description: '友軍擊殺後，全體我方 +5 攻擊；每三場戰鬥後獲得 1 點 EXP。', synergies: ['Outrage', 'Intimidate'], isHiddenFromShop: true
    },
    shinx: {
        id: 'shinx', name: '小貓怪', tier: 4, family: 'shinx',
        baseStats: { hp: 4, maxHp: 4, attack: 6 },
        imageUrl: 'assets/小貓怪00.webp', battleImageUrl: 'assets/小貓怪01.webp',
        description: '戰鬥開始時攻擊永久 +1 並有著更高的攻擊上限。', synergies: ['Charge', 'Intimidate'], evolveId: 'luxio', attackCap: 60
    },
    luxio: {
        id: 'luxio', name: '勒克貓', tier: 4, family: 'shinx',
        baseStats: { hp: 4, maxHp: 4, attack: 6 },
        imageUrl: 'assets/勒克貓00.webp', battleImageUrl: 'assets/勒克貓01.webp',
        description: '戰鬥開始時攻擊永久 +2 並有著更高的攻擊上限。', synergies: ['Charge', 'Intimidate'], evolveId: 'luxray', isHiddenFromShop: true, attackCap: 60
    },
    luxray: {
        id: 'luxray', name: '倫琴貓', tier: 4, family: 'shinx',
        baseStats: { hp: 4, maxHp: 4, attack: 6 },
        imageUrl: 'assets/倫琴貓00.webp', battleImageUrl: 'assets/倫琴貓01.webp',
        description: '戰鬥開始時攻擊永久 +5 並有著更高的攻擊上限。', synergies: ['Charge', 'Intimidate'], isHiddenFromShop: true, attackCap: 60
    },
    aron: {
        id: 'aron', name: '可可多拉', tier: 4, family: 'aron',
        baseStats: { hp: 6, maxHp: 6, attack: 4 },
        imageUrl: 'assets/可可多拉00.webp', battleImageUrl: 'assets/可多拉01.webp',
        description: '戰鬥開始時生命永久 +1 並有著更高的生命上限。', synergies: ['Hard'], evolveId: 'lairon', maxHpCap: 60
    },
    lairon: {
        id: 'lairon', name: '可多拉', tier: 4, family: 'aron',
        baseStats: { hp: 6, maxHp: 6, attack: 4 },
        imageUrl: 'assets/可多拉00.webp', battleImageUrl: 'assets/可多拉01.webp',
        description: '戰鬥開始時生命永久 +2 並有著更高的生命上限。', synergies: ['Hard'], evolveId: 'aggron', isHiddenFromShop: true, maxHpCap: 60
    },
    aggron: {
        id: 'aggron', name: '波士可多拉', tier: 4, family: 'aron',
        baseStats: { hp: 6, maxHp: 6, attack: 4 },
        imageUrl: 'assets/波士可多拉00.webp', battleImageUrl: 'assets/波士可多拉01.webp',
        description: '戰鬥開始時生命永久 +5 並有著更高的生命上限。', synergies: ['Hard', 'Outrage'], isHiddenFromShop: true, maxHpCap: 60
    },
    darkrai: {
        id: 'darkrai', name: '達克萊伊', tier: 5, family: 'darkrai',
        baseStats: { hp: 15, maxHp: 15, attack: 15 },
        imageUrl: 'assets/達克萊伊00.webp', battleImageUrl: 'assets/達克萊伊01.webp',
        description: '戰鬥開始時，我方全體攻擊 + 5 ；我方全體有著更高的攻擊上限。', synergies: ['Thief']
    },
    cresselia: {
        id: 'cresselia', name: '克雷色利亞', tier: 5, family: 'cresselia',
        baseStats: { hp: 15, maxHp: 15, attack: 15 },
        imageUrl: 'assets/克雷色利亞00.webp', battleImageUrl: 'assets/克雷色利亞01.webp',
        description: '戰鬥開始時，我方全體生命 + 5 ；我方全體有著更高的生命上限。', synergies: ['Psychic']
    }
};

export type PreferredPosition = 'FRONT' | 'MID' | 'BACK' | 'FRONT_MID' | 'MID_BACK' | 'ALL';

export const PREFERRED_POSITIONS: Record<string, PreferredPosition> = {
    'bulbasaur': 'FRONT_MID',
    'charmander': 'ALL',
    'squirtle': 'ALL',
    'gastly': 'ALL',
    'chikorita': 'BACK',
    'cyndaquil': 'ALL',
    'totodile': 'MID',
    'igglybuff': 'ALL',
    'treecko': 'MID_BACK',
    'torchic': 'MID_BACK',
    'mudkip': 'MID',
    'sprigatito': 'BACK',
    'fuecoco': 'BACK',
    'quaxly': 'BACK',
    'growlithe': 'FRONT_MID',
    'swablu': 'MID_BACK',
    'plusle': 'BACK',
    'minun': 'BACK',
    'gulpin': 'MID_BACK',
    'rattata': 'FRONT_MID',
    'diglett': 'ALL',
    'meowth': 'ALL',
    'mankey': 'ALL',
    'onix': 'ALL',
    'doduo': 'ALL',
    'slowpoke': 'ALL',
    'magnemite': 'ALL',
    'houndour': 'ALL',
    'sneasel': 'FRONT',
    'drifloon': 'ALL',
    'snover': 'FRONT',
    'dwebble': 'FRONT',
    'kangaskhan': 'FRONT',
    'ditto': 'BACK',
    'sableye': 'ALL',
    'mimikyu': 'ALL',
    'spiritomb': 'ALL',
    'heracross': 'FRONT_MID',
    'pinsir': 'FRONT_MID',
    'farfetchd': 'MID_BACK',
    'natu': 'ALL',
    ralts: 'FRONT',
    mrmime: 'ALL',
    caterpie: 'FRONT_MID',
    cleffa: 'ALL',
    togepi: 'ALL',
    ekans: 'ALL',
    wynaut: 'ALL',
    geodude: 'FRONT',
    pichu: 'FRONT_MID',
    eevee: 'ALL',
    'psyduck': 'BACK',
    'bellsprout': 'BACK',
    'vulpix': 'BACK',
    'mareep': 'BACK',
    'cubone': 'ALL',
    'murkrow': 'ALL',
    'bonsly': 'FRONT_MID',
    'happiny': 'BACK',
    'raikou': 'ALL',
    'entei': 'ALL',
    'suicune': 'FRONT',
    'dratini': 'ALL',
    'larvitar': 'ALL',
    'delibird': 'ALL',
    'shuckle': 'FRONT_MID',
    'riolu': 'ALL',
    'cramorant': 'ALL',
    'comfey': 'MID_BACK',
    'mawile': 'FRONT_MID',
    'grubbin': 'ALL',
    'croagunk': 'ALL',
    'munna': 'ALL',
    'wooper': 'FRONT_MID',
    'pumpkaboo': 'ALL',
    'trapinch': 'ALL',
    'pawmi': 'ALL',
    'spheal': 'ALL',
    'bagon': 'ALL',
    'shinx': 'ALL',
    'aron': 'FRONT',
    'darkrai': 'ALL',
    'cresselia': 'ALL'
};
