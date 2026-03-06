
import type { UnitTemplate } from './Unit';

export const UNIT_TEMPLATES: Record<string, UnitTemplate> = {
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
        description: '攻擊時，對敵方後排造成 [N] 傷害 (三場對戰後增強)。', synergies: ['Starter', 'Fire'], evolveId: 'charmeleon'
    },
    charmeleon: {
        id: 'charmeleon', name: '火恐龍', tier: 1, family: 'charmander',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/火恐龍00.webp', battleImageUrl: 'assets/火恐龍01.webp',
        description: '攻擊時，對敵方後排造成 [N] 傷害 (兩場對戰後增強)。', synergies: ['Starter', 'Fire'], evolveId: 'charizard', isHiddenFromShop: true
    },
    charizard: {
        id: 'charizard', name: '噴火龍', tier: 1, family: 'charmander',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/噴火龍00.webp', battleImageUrl: 'assets/噴火龍01.webp',
        description: '攻擊時，對敵方後排造成 [N] 傷害 (每場對戰後增強)。', synergies: ['Starter', 'Fire'], isHiddenFromShop: true
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
        baseStats: { hp: 5, maxHp: 5, attack: 5 },
        imageUrl: 'assets/耿鬼00.webp',
        battleImageUrl: 'assets/耿鬼01.webp',
        description: '戰鬥開始時，我方全體永久獲得 3 點攻擊。',
        synergies: ['Ghost', 'Poison'],
        family: 'gastly',
        isHiddenFromShop: true
    },

    // 5. Chikorita
    chikorita: {
        id: 'chikorita', name: '菊草葉', tier: 2, family: 'chikorita',
        baseStats: { hp: 4, maxHp: 4, attack: 2 },
        imageUrl: 'assets/菊草葉00.webp', battleImageUrl: 'assets/菊草葉01.webp',
        description: '友軍召喚物 +1 攻擊與生命。', synergies: ['Starter', 'Grass'], evolveId: 'bayleef'
    },
    bayleef: {
        id: 'bayleef', name: '月桂葉', tier: 2, family: 'chikorita',
        baseStats: { hp: 4, maxHp: 4, attack: 2 },
        imageUrl: 'assets/月桂葉00.webp', battleImageUrl: 'assets/月桂葉01.webp',
        description: '友軍召喚物 +4 攻擊與生命。', synergies: ['Starter', 'Grass'], evolveId: 'meganium', isHiddenFromShop: true
    },
    meganium: {
        id: 'meganium', name: '大竺葵', tier: 2, family: 'chikorita',
        baseStats: { hp: 4, maxHp: 4, attack: 2 },
        imageUrl: 'assets/大竺葵00.webp', battleImageUrl: 'assets/大竺葵01.webp',
        description: '友軍召喚物 +8 攻擊與生命。', synergies: ['Starter', 'Grass'], isHiddenFromShop: true
    },

    // 6. Cyndaquil
    cyndaquil: {
        id: 'cyndaquil', name: '火球鼠', tier: 2, family: 'cyndaquil',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/火球鼠00.webp', battleImageUrl: 'assets/火球鼠01.webp',
        description: '攻擊前對全體單位造成 1 傷害（不含自己）。', synergies: ['Starter', 'Fire'], evolveId: 'quilava'
    },
    quilava: {
        id: 'quilava', name: '火岩鼠', tier: 2, family: 'cyndaquil',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/火岩鼠00.webp', battleImageUrl: 'assets/火岩鼠01.webp',
        description: '攻擊前對全體單位造成 2 傷害（不含自己）。', synergies: ['Starter', 'Fire'], evolveId: 'typhlosion', isHiddenFromShop: true
    },
    typhlosion: {
        id: 'typhlosion', name: '火爆獸', tier: 2, family: 'cyndaquil',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/火爆獸00.webp', battleImageUrl: 'assets/火爆獸01.webp',
        description: '攻擊前對全體單位造成 5 傷害（不含自己）。', synergies: ['Starter', 'Fire'], isHiddenFromShop: true
    },

    // 7. Totodile
    totodile: {
        id: 'totodile', name: '小鋸鱷', tier: 2, family: 'totodile',
        baseStats: { hp: 2, maxHp: 2, attack: 4 },
        imageUrl: 'assets/小鋸鱷00.webp', battleImageUrl: 'assets/小鋸鱷01.webp',
        description: '戰鬥開始時，前方友軍獲得自身 33% 攻擊值。', synergies: ['Starter', 'Water'], evolveId: 'croconaw'
    },
    croconaw: {
        id: 'croconaw', name: '藍鱷', tier: 2, family: 'totodile',
        baseStats: { hp: 2, maxHp: 2, attack: 4 },
        imageUrl: 'assets/藍鱷00.webp', battleImageUrl: 'assets/藍鱷01.webp',
        description: '戰鬥開始時，前方友軍獲得自身 50% 攻擊值。', synergies: ['Starter', 'Water'], evolveId: 'feraligatr', isHiddenFromShop: true
    },
    feraligatr: {
        id: 'feraligatr', name: '大力鱷', tier: 2, family: 'totodile',
        baseStats: { hp: 2, maxHp: 2, attack: 4 },
        imageUrl: 'assets/大力鱷00.webp', battleImageUrl: 'assets/大力鱷01.webp',
        description: '戰鬥開始時，前方友軍獲得自身 100% 攻擊值。', synergies: ['Starter', 'Water'], isHiddenFromShop: true
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
        baseStats: { hp: 6, maxHp: 6, attack: 3 },
        imageUrl: 'assets/胖可丁00.webp',
        battleImageUrl: 'assets/胖可丁01.webp',
        description: '戰鬥開始時，我方全體永久獲得 3 點生命。',
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
        description: '友軍攻擊時，自身 +1 攻擊與生命。', synergies: ['Starter', 'Water'], evolveId: 'marshtomp'
    },
    marshtomp: {
        id: 'marshtomp', name: '沼躍魚', tier: 3, family: 'mudkip',
        baseStats: { hp: 5, maxHp: 5, attack: 3 },
        imageUrl: 'assets/沼躍魚00.webp', battleImageUrl: 'assets/沼躍魚01.webp',
        description: '友軍攻擊時，自身 +2 攻擊與生命。', synergies: ['Starter', 'Water'], evolveId: 'swampert', isHiddenFromShop: true
    },
    swampert: {
        id: 'swampert', name: '巨沼怪', tier: 3, family: 'mudkip',
        baseStats: { hp: 5, maxHp: 5, attack: 3 },
        imageUrl: 'assets/巨沼怪00.webp', battleImageUrl: 'assets/巨沼怪01.webp',
        description: '友軍攻擊時，自身 +5 攻擊與生命。', synergies: ['Starter', 'Water'], isHiddenFromShop: true
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
        description: '友軍擊殺後，隨機 1 位友軍永久 +2 攻擊值。', synergies: ['Starter', 'Water'], evolveId: 'quaxwell'
    },
    quaxwell: {
        id: 'quaxwell', name: '湧躍鴨', tier: 4, family: 'quaxly',
        baseStats: { hp: 4, maxHp: 4, attack: 6 },
        imageUrl: 'assets/湧躍鴨00.webp', battleImageUrl: 'assets/湧躍鴨01.webp',
        description: '友軍擊殺後，隨機 2 位友軍永久 +2 攻擊值。', synergies: ['Starter', 'Water'], evolveId: 'quaquaval', isHiddenFromShop: true
    },
    quaquaval: {
        id: 'quaquaval', name: '狂歡浪舞鴨', tier: 4, family: 'quaxly',
        baseStats: { hp: 4, maxHp: 4, attack: 6 },
        imageUrl: 'assets/狂歡浪舞鴨00.webp', battleImageUrl: 'assets/狂歡浪舞鴨01.webp',
        description: '友軍擊殺後，隨機 3 位友軍永久 +2 攻擊值。', synergies: ['Starter', 'Water'], isHiddenFromShop: true
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
        description: '死亡後召喚 5 隻 3/3 小老鼠。', synergies: ['Normal'], isHiddenFromShop: true
    },

    // 16. Diglett
    diglett: {
        id: 'diglett', name: '地鼠', tier: 2, family: 'diglett',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/地鼠00.webp', battleImageUrl: 'assets/地鼠01.webp',
        description: '有 25% 機率閃避攻擊（不含招式傷害）。', synergies: ['Triplets', 'Cave'], evolveId: 'dugtrio'
    },
    dugtrio: {
        id: 'dugtrio', name: '三地鼠', tier: 2, family: 'diglett',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/三地鼠00.webp', battleImageUrl: 'assets/三地鼠01.webp',
        description: '有 33% 機率閃避攻擊（不含招式傷害）。', synergies: ['Triplets', 'Cave'], evolveId: 'dugtrio_final', isHiddenFromShop: true
    },
    dugtrio_final: {
        id: 'dugtrio_final', name: '三地鼠', tier: 2, family: 'diglett',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
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
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/猴怪00.webp', battleImageUrl: 'assets/猴怪01.webp',
        description: '合成與出售時前方友軍 +2 攻擊。', synergies: ['Angry'], evolveId: 'primeape'
    },
    primeape: {
        id: 'primeape', name: '火爆猴', tier: 1, family: 'mankey',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/火爆猴00.webp', battleImageUrl: 'assets/火爆猴01.webp',
        description: '合成與出售時前方友軍 +4 攻擊。', synergies: ['Angry'], evolveId: 'primeape_final', isHiddenFromShop: true
    },
    primeape_final: {
        id: 'primeape_final', name: '火爆猴', tier: 1, family: 'mankey',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/火爆猴00.webp', battleImageUrl: 'assets/火爆猴01.webp',
        description: '出售時全體友軍 +10 攻擊。', synergies: ['Angry'], isHiddenFromShop: true
    },

    // 19. Onix
    onix: {
        id: 'onix', name: '大岩蛇', tier: 4, family: 'onix',
        baseStats: { hp: 6, maxHp: 6, attack: 4 },
        imageUrl: 'assets/大岩蛇00.webp', battleImageUrl: 'assets/大岩蛇01.webp',
        description: '攻擊後，移動至隊伍最後方；反彈 100% 所受傷害。', synergies: ['Hard', 'Cave'], evolveId: 'steelix'
    },
    steelix: {
        id: 'steelix', name: '大鋼蛇', tier: 4, family: 'onix',
        baseStats: { hp: 6, maxHp: 6, attack: 4 },
        imageUrl: 'assets/大鋼蛇00.webp', battleImageUrl: 'assets/大鋼蛇01.webp',
        description: '攻擊後，移動至隊伍最後方；反彈 100% 所受傷害。', synergies: ['Hard', 'Cave'], evolveId: 'steelix_final', isHiddenFromShop: true
    },
    steelix_final: {
        id: 'steelix_final', name: '大鋼蛇', tier: 4, family: 'onix',
        baseStats: { hp: 6, maxHp: 6, attack: 4 },
        imageUrl: 'assets/大鋼蛇00.webp', battleImageUrl: 'assets/大鋼蛇01.webp',
        description: '攻擊後，移動至隊伍最後方；反彈 100% 所受傷害。', synergies: ['Hard', 'Cave'], isHiddenFromShop: true
    },

    // 20. Doduo
    doduo: {
        id: 'doduo', name: '嘟嘟', tier: 2, family: 'doduo',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/嘟嘟00.webp', battleImageUrl: 'assets/嘟嘟01.webp',
        description: '有 25% 機率額外攻擊一次。', synergies: ['Triplets', 'Angry'], evolveId: 'dodrio'
    },
    dodrio: {
        id: 'dodrio', name: '嘟嘟利', tier: 2, family: 'doduo',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/嘟嘟利00.webp', battleImageUrl: 'assets/嘟嘟利01.webp',
        description: '有 33% 機率額外攻擊一次。', synergies: ['Triplets', 'Angry'], evolveId: 'dodrio_final', isHiddenFromShop: true
    },
    dodrio_final: {
        id: 'dodrio_final', name: '嘟嘟利', tier: 2, family: 'doduo',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/嘟嘟利00.webp', battleImageUrl: 'assets/嘟嘟利01.webp',
        description: '有 50% 機率額外攻擊一次。', synergies: ['Triplets', 'Angry'], isHiddenFromShop: true
    },

    // 21. Slowpoke
    slowpoke: {
        id: 'slowpoke', name: '呆呆獸', tier: 3, family: 'slowpoke',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/呆呆獸00.webp', battleImageUrl: 'assets/呆呆獸01.webp',
        description: '首次受傷後，回復 33％ 生命值。', synergies: ['Water', 'Psychic'], evolveId: 'slowbro'
    },
    slowbro: {
        id: 'slowbro', name: '呆殼獸', tier: 3, family: 'slowpoke',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/呆殼獸00.webp', battleImageUrl: 'assets/呆殼獸01.webp',
        description: '首次受傷後，回復 33％ 生命值。', synergies: ['Water', 'Psychic'], evolveId: 'slowbro_final', isHiddenFromShop: true
    },
    slowbro_final: {
        id: 'slowbro_final', name: '呆殼獸', tier: 3, family: 'slowpoke',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/呆殼獸00.webp', battleImageUrl: 'assets/呆殼獸01.webp',
        description: '首次受傷後，回復 100％ 生命值。', synergies: ['Water', 'Psychic'], isHiddenFromShop: true
    },

    // 22. Magnemite
    magnemite: {
        id: 'magnemite', name: '小磁怪', tier: 2, family: 'magnemite',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/小磁怪00.webp', battleImageUrl: 'assets/小磁怪01.webp',
        description: '準備結束時，隨機 +2 攻擊或生命 (共 1 次)。', synergies: ['Triplets', 'Hard'], evolveId: 'magneton'
    },
    magneton: {
        id: 'magneton', name: '三合一磁怪', tier: 2, family: 'magnemite',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/三合一磁怪00.webp', battleImageUrl: 'assets/三合一磁怪01.webp',
        description: '準備結束時，隨機 +2 攻擊或生命 (共 2 次)。', synergies: ['Triplets', 'Hard'], evolveId: 'magneton_final', isHiddenFromShop: true
    },
    magneton_final: {
        id: 'magneton_final', name: '三合一磁怪', tier: 2, family: 'magnemite',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/三合一磁怪00.webp', battleImageUrl: 'assets/三合一磁怪01.webp',
        description: '準備結束時，隨機 +2 攻擊或生命 (共 5 次)。', synergies: ['Triplets', 'Hard'], isHiddenFromShop: true
    },

    // 23. Houndour
    houndour: {
        id: 'houndour', name: '戴魯比', tier: 3, family: 'houndour',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/戴魯比00.webp', battleImageUrl: 'assets/戴魯比01.webp',
        description: '戰鬥開始時，對生命最少敵方造成 4 傷害 (共 1 次)。', synergies: ['Fire', 'Thief'], evolveId: 'houndoom'
    },
    houndoom: {
        id: 'houndoom', name: '黑魯加', tier: 3, family: 'houndour',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/黑魯加00.webp', battleImageUrl: 'assets/黑魯加01.webp',
        description: '戰鬥開始時，對生命最少敵方造成 4 傷害 (共 2 次)。', synergies: ['Fire', 'Thief'], evolveId: 'houndoom_final', isHiddenFromShop: true
    },
    houndoom_final: {
        id: 'houndoom_final', name: '黑魯加', tier: 3, family: 'houndour',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/黑魯加00.webp', battleImageUrl: 'assets/黑魯加01.webp',
        description: '戰鬥開始時，對生命最少敵方造成 4 傷害 (共 3 次)。', synergies: ['Fire', 'Thief'], isHiddenFromShop: true
    },

    // 24. Sneasel
    sneasel: {
        id: 'sneasel', name: '狃拉', tier: 4, family: 'sneasel',
        baseStats: { hp: 4, maxHp: 4, attack: 6 },
        imageUrl: 'assets/狃拉00.webp', battleImageUrl: 'assets/狃拉01.webp',
        description: '攻擊時 33% 機率再攻擊 1 個敵方，攻擊不會被降低。', synergies: ['Snow', 'SwordDance'], evolveId: 'weavile'
    },
    weavile: {
        id: 'weavile', name: '瑪狃拉', tier: 4, family: 'sneasel',
        baseStats: { hp: 4, maxHp: 4, attack: 6 },
        imageUrl: 'assets/瑪狃拉00.webp', battleImageUrl: 'assets/瑪狃拉01.webp',
        description: '攻擊時 33% 機率再攻擊 1 個敵方，攻擊不會被降低。', synergies: ['Snow', 'SwordDance'], evolveId: 'weavile_final', isHiddenFromShop: true
    },
    weavile_final: {
        id: 'weavile_final', name: '瑪狃拉', tier: 4, family: 'sneasel',
        baseStats: { hp: 4, maxHp: 4, attack: 6 },
        imageUrl: 'assets/瑪狃拉00.webp', battleImageUrl: 'assets/瑪狃拉01.webp',
        description: '攻擊時 33% 機率再攻擊 1 個敵方，攻擊不會被降低。', synergies: ['Snow', 'SwordDance'], isHiddenFromShop: true
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
        description: '攻擊後若存活，額外再攻擊一次。', synergies: ['Normal', 'Angry'], evolveId: 'kangaskhan_2'
    },
    kangaskhan_2: {
        id: 'kangaskhan_2', name: '袋獸', tier: 4, family: 'kangaskhan',
        baseStats: { hp: 6, maxHp: 6, attack: 6 },
        imageUrl: 'assets/袋獸00.webp', battleImageUrl: 'assets/袋獸01.webp',
        description: '攻擊後若存活，額外再攻擊一次。', synergies: ['Normal', 'Angry'], evolveId: 'kangaskhan_3', isHiddenFromShop: true
    },
    kangaskhan_3: {
        id: 'kangaskhan_3', name: '袋獸', tier: 4, family: 'kangaskhan',
        baseStats: { hp: 6, maxHp: 6, attack: 6 },
        imageUrl: 'assets/袋獸00.webp', battleImageUrl: 'assets/袋獸01.webp',
        description: '攻擊後若存活，額外再攻擊一次。', synergies: ['Normal', 'Angry'], isHiddenFromShop: true
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
        description: '殺死勾魂眼的敵方立即死亡。', synergies: ['Ghost', 'Thief'], evolveId: 'sableye_2'
    },
    sableye_2: {
        id: 'sableye_2', name: '勾魂眼', tier: 5, family: 'sableye',
        baseStats: { hp: 10, maxHp: 10, attack: 10 },
        imageUrl: 'assets/勾魂眼00.webp', battleImageUrl: 'assets/勾魂眼01.webp',
        description: '殺死勾魂眼的敵方立即死亡。', synergies: ['Ghost', 'Thief'], evolveId: 'sableye_3', isHiddenFromShop: true
    },
    sableye_3: {
        id: 'sableye_3', name: '勾魂眼', tier: 5, family: 'sableye',
        baseStats: { hp: 10, maxHp: 10, attack: 10 },
        imageUrl: 'assets/勾魂眼00.webp', battleImageUrl: 'assets/勾魂眼01.webp',
        description: '殺死勾魂眼的敵方立即死亡。', synergies: ['Ghost', 'Thief'], isHiddenFromShop: true
    },

    snover: {
        id: 'snover', name: '雪笠怪', tier: 3, family: 'snover',
        baseStats: { hp: 3, maxHp: 3, attack: 5 },
        imageUrl: 'assets/雪笠怪00.webp', battleImageUrl: 'assets/雪笠怪01.webp',
        description: '攻擊後永久 +1 攻擊並擊退敵方角色。', synergies: ['Grass', 'Snow'], evolveId: 'abomasnow'
    },
    abomasnow: {
        id: 'abomasnow', name: '暴雪王', tier: 3, family: 'snover',
        baseStats: { hp: 3, maxHp: 3, attack: 5 },
        imageUrl: 'assets/暴雪王00.webp', battleImageUrl: 'assets/暴雪王01.webp',
        description: '攻擊後永久 +2 攻擊並擊退敵方角色。', synergies: ['Grass', 'Snow'], evolveId: 'abomasnow_final', isHiddenFromShop: true
    },
    abomasnow_final: {
        id: 'abomasnow_final', name: '暴雪王', tier: 3, family: 'snover',
        baseStats: { hp: 3, maxHp: 3, attack: 5 },
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
        description: '戰鬥開始時，使 2 個敵方角色的招式無效化。', synergies: ['Ghost', 'Thief']
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
        description: '首次攻擊造成 99 傷害。', synergies: ['Normal', 'SwordDance']
    },
    // --- New Psychic Units ---
    natu: {
        id: 'natu', name: '天然雀', tier: 2, family: 'natu',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/天然雀00.webp', battleImageUrl: 'assets/天然雀01.webp',
        description: '戰鬥開始時，將敵方首位和末位角色調換位置。', synergies: ['Psychic', 'Trick'], evolveId: 'xatu'
    },
    xatu: {
        id: 'xatu', name: '天然鳥', tier: 2, family: 'natu',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/天然鳥00.webp', battleImageUrl: 'assets/天然鳥01.webp',
        description: '戰鬥開始時，將敵方首位和末位角色調換位置。', synergies: ['Psychic', 'Trick'], evolveId: 'xatu_final', isHiddenFromShop: true
    },
    xatu_final: {
        id: 'xatu_final', name: '天然鳥', tier: 2, family: 'natu',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/天然鳥00.webp', battleImageUrl: 'assets/天然鳥01.webp',
        description: '戰鬥開始時，將敵方首位和末位角色調換位置。', synergies: ['Psychic', 'Trick'], isHiddenFromShop: true
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
        description: '攻擊時，同時對敵方末位造成 100% 傷害。', synergies: ['Psychic', 'Thief'], isHiddenFromShop: true
    },
    mrmime: {
        id: 'mrmime', name: '魔牆人偶', tier: 5, family: 'mrmime',
        baseStats: { hp: 10, maxHp: 10, attack: 10 },
        imageUrl: 'assets/魔牆人偶00.webp', battleImageUrl: 'assets/魔牆人偶01.webp',
        description: '我方受到的前 5 次傷害減半。', synergies: ['Psychic', 'Trick']
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
    'totodile': 'FRONT',
    'igglybuff': 'ALL',
    'treecko': 'MID_BACK',
    'torchic': 'MID_BACK',
    'mudkip': 'MID',
    'sprigatito': 'BACK',
    'fuecoco': 'BACK',
    'quaxly': 'BACK',
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
    'dwebble': 'ALL',
    'kangaskhan': 'FRONT',
    'ditto': 'ALL',
    'sableye': 'ALL',
    'mimikyu': 'ALL',
    'spiritomb': 'ALL',
    'heracross': 'ALL',
    'pinsir': 'ALL',
    'farfetchd': 'FRONT',
    'natu': 'ALL',
    'ralts': 'FRONT',
    'mrmime': 'ALL'
};
