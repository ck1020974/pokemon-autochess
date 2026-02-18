
import type { UnitTemplate } from './Unit';

export const UNIT_TEMPLATES: Record<string, UnitTemplate> = {
    // --- Evolution Paths Define ---
    // Format: Base -> Stage 2 -> Stage 3

    // 1. Bulbasaur
    bulbasaur: {
        id: 'bulbasaur', name: 'å¦™è?ç¨®å?', tier: 1, family: 'bulbasaur',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/å¦™è?ç¨®å?00.webp', battleImageUrl: 'assets/å¦™è?ç¨®å?01.webp',
        description: 'æ­»äº¡å¾Œå¬??1 ??1/1 å°ç¨®å­ã€?, synergies: ['Starter', 'Grass'], evolveId: 'ivysaur'
    },
    ivysaur: {
        id: 'ivysaur', name: 'å¦™è???, tier: 1, family: 'bulbasaur',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/å¦™è???0.webp', battleImageUrl: 'assets/å¦™è???1.webp',
        description: 'æ­»äº¡å¾Œå¬??2 ??1/1 å°ç¨®å­ã€?, synergies: ['Starter', 'Grass'], evolveId: 'venusaur', isHiddenFromShop: true
    },
    venusaur: {
        id: 'venusaur', name: 'å¦™è???, tier: 1, family: 'bulbasaur',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/å¦™è???0.webp', battleImageUrl: 'assets/å¦™è???1.webp',
        description: 'æ­»äº¡å¾Œå¬??3 ??1/1 å°ç¨®å­ã€?, synergies: ['Starter', 'Grass'], isHiddenFromShop: true
    },

    // 2. Charmander
    charmander: {
        id: 'charmander', name: 'å°ç«é¾?, tier: 1, family: 'charmander',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/å°ç«é¾?0.webp', battleImageUrl: 'assets/å°ç«é¾?1.webp',
        description: '?Šæ®º?µæ–¹å¾Œéš¨æ©Ÿç²å¾?+1 ?»æ? ???Ÿå‘½??, synergies: ['Starter', 'Fire'], evolveId: 'charmeleon'
    },
    charmeleon: {
        id: 'charmeleon', name: '?«æ?é¾?, tier: 1, family: 'charmander',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/?«æ?é¾?0.webp', battleImageUrl: 'assets/?«æ?é¾?1.webp',
        description: '?Šæ®º?µæ–¹å¾Œéš¨æ©Ÿç²å¾?+2 ?»æ? ???Ÿå‘½??, synergies: ['Starter', 'Fire'], evolveId: 'charizard', isHiddenFromShop: true
    },
    charizard: {
        id: 'charizard', name: '?´ç«é¾?, tier: 1, family: 'charmander',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/?´ç«é¾?0.webp', battleImageUrl: 'assets/?´ç«é¾?1.webp',
        description: '?Šæ®º?µæ–¹å¾Œéš¨æ©Ÿç²å¾?+3 ?»æ? ???Ÿå‘½??, synergies: ['Starter', 'Fire'], isHiddenFromShop: true
    },

    // 3. Squirtle
    squirtle: {
        id: 'squirtle', name: '?‘å°¼é¾?, tier: 1, family: 'squirtle',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/?‘å°¼é¾?0.webp', battleImageUrl: 'assets/?‘å°¼é¾?1.webp',
        description: '?—åˆ°?„å‚·å®³æ?å°?1 (?€ä½ç‚º 1)??, synergies: ['Starter', 'Water'], evolveId: 'wartortle'
    },
    wartortle: {
        id: 'wartortle', name: '?¡å’ªé¾?, tier: 1, family: 'squirtle',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/?¡å’ªé¾?0.webp', battleImageUrl: 'assets/?¡å’ªé¾?1.webp',
        description: '?—åˆ°?„å‚·å®³æ?å°?2 (?€ä½ç‚º 1)??, synergies: ['Starter', 'Water'], evolveId: 'blastoise', isHiddenFromShop: true
    },
    blastoise: {
        id: 'blastoise', name: 'æ°´ç®­é¾?, tier: 1, family: 'squirtle',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/æ°´ç®­é¾?0.webp', battleImageUrl: 'assets/æ°´ç®­é¾?1.webp',
        description: '?—åˆ°?„å‚·å®³æ?å°?3 (?€ä½ç‚º 1)??, synergies: ['Starter', 'Water'], isHiddenFromShop: true
    },

    // 4. Gastly
    gastly: {
        id: 'gastly', name: 'é¬¼æ–¯', tier: 1, family: 'gastly',
        baseStats: { hp: 1, maxHp: 1, attack: 3 },
        imageUrl: 'assets/é¬¼æ–¯00.webp', battleImageUrl: 'assets/é¬¼æ–¯01.webp',
        description: '?ˆæ??‚å??¹å?è»?+2 ?»æ???, synergies: ['Ghost'], evolveId: 'haunter'
    },
    haunter: {
        id: 'haunter', name: 'é¬¼æ–¯??, tier: 1, family: 'gastly',
        baseStats: { hp: 1, maxHp: 1, attack: 3 },
        imageUrl: 'assets/é¬¼æ–¯??0.webp', battleImageUrl: 'assets/é¬¼æ–¯??1.webp',
        description: '?ˆæ??‚å??¹å?è»?+5 ?»æ???, synergies: ['Ghost'], evolveId: 'gengar', isHiddenFromShop: true
    },
    gengar: {
        id: 'gengar', name: '?¿é¬¼', tier: 1, family: 'gastly',
        baseStats: { hp: 1, maxHp: 1, attack: 3 },
        imageUrl: 'assets/?¿é¬¼00.webp', battleImageUrl: 'assets/?¿é¬¼01.webp',
        description: '?ºå”®?‚å??¹å?è»?+10 ?»æ???, synergies: ['Ghost'], isHiddenFromShop: true
    },

    // 5. Chikorita
    chikorita: {
        id: 'chikorita', name: '?Šè???, tier: 2, family: 'chikorita',
        baseStats: { hp: 4, maxHp: 4, attack: 2 },
        imageUrl: 'assets/?Šè???0.webp', battleImageUrl: 'assets/?Šè???1.webp',
        description: '?‹è??¬å???+1 ?»æ? ???Ÿå‘½??, synergies: ['Starter', 'Grass'], evolveId: 'bayleef'
    },
    bayleef: {
        id: 'bayleef', name: '?ˆæ???, tier: 2, family: 'chikorita',
        baseStats: { hp: 4, maxHp: 4, attack: 2 },
        imageUrl: 'assets/?ˆæ???0.webp', battleImageUrl: 'assets/?ˆæ???1.webp',
        description: '?‹è??¬å???+2 ?»æ? ???Ÿå‘½??, synergies: ['Starter', 'Grass'], evolveId: 'meganium', isHiddenFromShop: true
    },
    meganium: {
        id: 'meganium', name: 'å¤§ç«º??, tier: 2, family: 'chikorita',
        baseStats: { hp: 4, maxHp: 4, attack: 2 },
        imageUrl: 'assets/å¤§ç«º??0.webp', battleImageUrl: 'assets/å¤§ç«º??1.webp',
        description: '?‹è??¬å???+3 ?»æ? ???Ÿå‘½??, synergies: ['Starter', 'Grass'], isHiddenFromShop: true
    },

    // 6. Cyndaquil
    cyndaquil: {
        id: 'cyndaquil', name: '?«ç?é¼?, tier: 2, family: 'cyndaquil',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/?«ç?é¼?0.webp', battleImageUrl: 'assets/?«ç?é¼?1.webp',
        description: '?Šæ®ºå¾Œç²å¾?+2 ?»æ? ??+3 ?Ÿå‘½ (æ¯å ´?°é¬¥?€å¤?1 æ¬???, synergies: ['Starter', 'Fire'], evolveId: 'quilava'
    },
    quilava: {
        id: 'quilava', name: '?«å²©é¼?, tier: 2, family: 'cyndaquil',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/?«å²©é¼?0.webp', battleImageUrl: 'assets/?«å²©é¼?1.webp',
        description: '?Šæ®ºå¾Œç²å¾?+2 ?»æ? ??+3 ?Ÿå‘½ (æ¯å ´?°é¬¥?€å¤?2 æ¬???, synergies: ['Starter', 'Fire'], evolveId: 'typhlosion', isHiddenFromShop: true
    },
    typhlosion: {
        id: 'typhlosion', name: '?«ç???, tier: 2, family: 'cyndaquil',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/?«ç???0.webp', battleImageUrl: 'assets/?«ç???1.webp',
        description: '?Šæ®ºå¾Œç²å¾?+2 ?»æ? ??+3 ?Ÿå‘½ (æ¯å ´?°é¬¥?€å¤?3 æ¬???, synergies: ['Starter', 'Fire'], isHiddenFromShop: true
    },

    // 7. Totodile
    totodile: {
        id: 'totodile', name: 'å°é‹¸é±?, tier: 2, family: 'totodile',
        baseStats: { hp: 2, maxHp: 2, attack: 4 },
        imageUrl: 'assets/å°é‹¸é±?0.webp', battleImageUrl: 'assets/å°é‹¸é±?1.webp',
        description: '?»æ??‚ï??Œæ?å°å??’æ•µäººé€ æ? 2 ?·å®³??, synergies: ['Starter', 'Water'], evolveId: 'croconaw'
    },
    croconaw: {
        id: 'croconaw', name: '?é±·', tier: 2, family: 'totodile',
        baseStats: { hp: 2, maxHp: 2, attack: 4 },
        imageUrl: 'assets/?é±·00.webp', battleImageUrl: 'assets/?é±·01.webp',
        description: '?»æ??‚ï??Œæ?å°å??’æ•µäººé€ æ? 4 ?·å®³??, synergies: ['Starter', 'Water'], evolveId: 'feraligatr', isHiddenFromShop: true
    },
    feraligatr: {
        id: 'feraligatr', name: 'å¤§å?é±?, tier: 2, family: 'totodile',
        baseStats: { hp: 2, maxHp: 2, attack: 4 },
        imageUrl: 'assets/å¤§å?é±?0.webp', battleImageUrl: 'assets/å¤§å?é±?1.webp',
        description: '?»æ??‚ï??Œæ?å°å??’æ•µäººé€ æ? 6 ?·å®³??, synergies: ['Starter', 'Water'], isHiddenFromShop: true
    },

    // 8. Igglybuff (New)
    igglybuff: {
        id: 'igglybuff', name: 'å¯¶å¯¶ä¸?, tier: 1, family: 'igglybuff',
        baseStats: { hp: 3, maxHp: 3, attack: 1 },
        imageUrl: 'assets/å¯¶å¯¶ä¸?0.webp', battleImageUrl: 'assets/å¯¶å¯¶ä¸?1.webp',
        description: '?ˆæ??‚å??¹å?è»?+2 ?Ÿå‘½??, synergies: ['Normal'], evolveId: 'jigglypuff'
    },
    jigglypuff: {
        id: 'jigglypuff', name: '?–ä?', tier: 1, family: 'igglybuff',
        baseStats: { hp: 3, maxHp: 3, attack: 1 },
        imageUrl: 'assets/?–ä?00.webp', battleImageUrl: 'assets/?–ä?01.webp',
        description: '?ˆæ??‚å??¹å?è»?+5 ?Ÿå‘½??, synergies: ['Normal'], evolveId: 'wigglytuff', isHiddenFromShop: true
    },
    wigglytuff: {
        id: 'wigglytuff', name: '?–å¯ä¸?, tier: 1, family: 'igglybuff',
        baseStats: { hp: 3, maxHp: 3, attack: 1 },
        imageUrl: 'assets/?–å¯ä¸?0.webp', battleImageUrl: 'assets/?–å¯ä¸?1.webp',
        description: '?ºå”®?‚å??¹å?è»?+10 ?Ÿå‘½??, synergies: ['Normal'], isHiddenFromShop: true
    },

    // 9. Treecko
    treecko: {
        id: 'treecko', name: '?¨å?å®?, tier: 3, family: 'treecko',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/?¨å?å®?0.webp', battleImageUrl: 'assets/?¨å?å®?1.webp',
        description: '?¬å??‹è?å¾Œå?é¦–ä??µæ–¹? æ? 2 ?·å®³??, synergies: ['Starter', 'Grass'], evolveId: 'grovyle'
    },
    grovyle: {
        id: 'grovyle', name: 'æ£®æ??¥èœ´', tier: 3, family: 'treecko',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/æ£®æ??¥èœ´00.webp', battleImageUrl: 'assets/æ£®æ??¥èœ´01.webp',
        description: '?¬å??‹è?å¾Œå?é¦–ä??µæ–¹? æ? 4 ?·å®³??, synergies: ['Starter', 'Grass'], evolveId: 'sceptile', isHiddenFromShop: true
    },
    sceptile: {
        id: 'sceptile', name: '?¥èœ´??, tier: 3, family: 'treecko',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/?¥èœ´??0.webp', battleImageUrl: 'assets/?¥èœ´??1.webp',
        description: '?¬å??‹è?å¾Œå?é¦–ä??µæ–¹? æ? 6 ?·å®³??, synergies: ['Starter', 'Grass'], isHiddenFromShop: true
    },

    // 10. Torchic
    torchic: {
        id: 'torchic', name: '?«ç???, tier: 3, family: 'torchic',
        baseStats: { hp: 3, maxHp: 3, attack: 5 },
        imageUrl: 'assets/?«ç???0.webp', battleImageUrl: 'assets/?«ç???1.webp',
        description: '?æ–¹?‹è??»æ??‚ï?å°ç›®æ¨™é€ æ? 2 ?·å®³??, synergies: ['Starter', 'Fire'], evolveId: 'combusken'
    },
    combusken: {
        id: 'combusken', name: '?›å£¯??, tier: 3, family: 'torchic',
        baseStats: { hp: 3, maxHp: 3, attack: 5 },
        imageUrl: 'assets/?›å£¯??0.webp', battleImageUrl: 'assets/?›å£¯??1.webp',
        description: '?æ–¹?‹è??»æ??‚ï?å°ç›®æ¨™é€ æ? 4 ?·å®³??, synergies: ['Starter', 'Fire'], evolveId: 'blaziken', isHiddenFromShop: true
    },
    blaziken: {
        id: 'blaziken', name: '?«ç„°??, tier: 3, family: 'torchic',
        baseStats: { hp: 3, maxHp: 3, attack: 5 },
        imageUrl: 'assets/?«ç„°??0.webp', battleImageUrl: 'assets/?«ç„°??1.webp',
        description: '?æ–¹?‹è??»æ??‚ï?å°ç›®æ¨™é€ æ? 6 ?·å®³??, synergies: ['Starter', 'Fire'], isHiddenFromShop: true
    },

    // 11. Mudkip
    mudkip: {
        id: 'mudkip', name: 'æ°´è?é­?, tier: 3, family: 'mudkip',
        baseStats: { hp: 5, maxHp: 5, attack: 3 },
        imageUrl: 'assets/æ°´è?é­?0.webp', battleImageUrl: 'assets/æ°´è?é­?1.webp',
        description: '?°é¬¥?‹å??‚ï??æ–¹?‹è?å¢å? 3 ?Ÿå‘½ ???»æ???, synergies: ['Starter', 'Water'], evolveId: 'marshtomp'
    },
    marshtomp: {
        id: 'marshtomp', name: 'æ²¼è?é­?, tier: 3, family: 'mudkip',
        baseStats: { hp: 5, maxHp: 5, attack: 3 },
        imageUrl: 'assets/æ²¼è?é­?0.webp', battleImageUrl: 'assets/æ²¼è?é­?1.webp',
        description: '?°é¬¥?‹å??‚ï??æ–¹?‹è?å¢å? 5 ?Ÿå‘½ ???»æ???, synergies: ['Starter', 'Water'], evolveId: 'swampert', isHiddenFromShop: true
    },
    swampert: {
        id: 'swampert', name: 'å·¨æ²¼??, tier: 3, family: 'mudkip',
        baseStats: { hp: 5, maxHp: 5, attack: 3 },
        imageUrl: 'assets/å·¨æ²¼??0.webp', battleImageUrl: 'assets/å·¨æ²¼??1.webp',
        description: '?°é¬¥?‹å??‚ï??æ–¹?‹è?å¢å? 10 ?Ÿå‘½ ???»æ???, synergies: ['Starter', 'Water'], isHiddenFromShop: true
    },

    // 12. Sprigatito
    sprigatito: {
        id: 'sprigatito', name: '?°è???, tier: 4, family: 'sprigatito',
        baseStats: { hp: 5, maxHp: 5, attack: 5 },
        imageUrl: 'assets/?°è???0.webp', battleImageUrl: 'assets/?°è???1.webp',
        description: '?¬å??‹è?å¾Œï??ªèº«?²å? +3 ?»æ? ???Ÿå‘½??, synergies: ['Starter', 'Grass'], evolveId: 'floragato'
    },
    floragato: {
        id: 'floragato', name: '?‚è•¾??, tier: 4, family: 'sprigatito',
        baseStats: { hp: 5, maxHp: 5, attack: 5 },
        imageUrl: 'assets/?‚è•¾??0.webp', battleImageUrl: 'assets/?‚è•¾??1.webp',
        description: '?¬å??‹è?å¾Œï??ªèº«?²å? +5 ?»æ? ???Ÿå‘½??, synergies: ['Starter', 'Grass'], evolveId: 'meowscarada', isHiddenFromShop: true
    },
    meowscarada: {
        id: 'meowscarada', name: 'é­”å¹»?‡é¢??, tier: 4, family: 'sprigatito',
        baseStats: { hp: 5, maxHp: 5, attack: 5 },
        imageUrl: 'assets/é­”å¹»?‡é¢??0.webp', battleImageUrl: 'assets/é­”å¹»?‡é¢??1.webp',
        description: '?¬å??‹è?å¾Œï??ªèº«?²å? +10 ?»æ? ???Ÿå‘½??, synergies: ['Starter', 'Grass'], isHiddenFromShop: true
    },

    // 13. Fuecoco
    fuecoco: {
        id: 'fuecoco', name: '?†ç«é±?, tier: 4, family: 'fuecoco',
        baseStats: { hp: 6, maxHp: 6, attack: 4 },
        imageUrl: 'assets/?†ç«é±?0.webp', battleImageUrl: 'assets/?†ç«é±?1.webp',
        description: '?‹è?æ­»äº¡å¾Œï??ªèº«?²å? +3 ?Ÿå‘½??, synergies: ['Starter', 'Fire'], evolveId: 'crocalor'
    },
    crocalor: {
        id: 'crocalor', name: '?™ç?é±?, tier: 4, family: 'fuecoco',
        baseStats: { hp: 6, maxHp: 6, attack: 4 },
        imageUrl: 'assets/?™ç?é±?0.webp', battleImageUrl: 'assets/?™ç?é±?1.webp',
        description: '?‹è?æ­»äº¡å¾Œï??ªèº«?²å? +5 ?Ÿå‘½??, synergies: ['Starter', 'Fire'], evolveId: 'skeledirge', isHiddenFromShop: true
    },
    skeledirge: {
        id: 'skeledirge', name: 'éª¨ç?å·¨è²é±?, tier: 4, family: 'fuecoco',
        baseStats: { hp: 6, maxHp: 6, attack: 4 },
        imageUrl: 'assets/éª¨ç?å·¨è²é±?0.webp', battleImageUrl: 'assets/éª¨ç?å·¨è²é±?1.webp',
        description: '?‹è?æ­»äº¡å¾Œï??ªèº«?²å? +10 ?Ÿå‘½??, synergies: ['Starter', 'Fire'], isHiddenFromShop: true
    },

    // 14. Quaxly
    quaxly: {
        id: 'quaxly', name: 'æ½¤æ°´é´?, tier: 4, family: 'quaxly',
        baseStats: { hp: 4, maxHp: 4, attack: 6 },
        imageUrl: 'assets/æ½¤æ°´é´?0.webp', battleImageUrl: 'assets/æ½¤æ°´é´?1.webp',
        description: '?Šæ®º?µæ–¹å¾Œï??ªèº«?²å? +3 ?»æ???, synergies: ['Starter', 'Water'], evolveId: 'quaxwell'
    },
    quaxwell: {
        id: 'quaxwell', name: 'æ¹§è?é´?, tier: 4, family: 'quaxly',
        baseStats: { hp: 4, maxHp: 4, attack: 6 },
        imageUrl: 'assets/æ¹§è?é´?0.webp', battleImageUrl: 'assets/æ¹§è?é´?1.webp',
        description: '?Šæ®º?µæ–¹å¾Œï??ªèº«?²å? +5 ?»æ???, synergies: ['Starter', 'Water'], evolveId: 'quaquaval', isHiddenFromShop: true
    },
    quaquaval: {
        id: 'quaquaval', name: '?‚æ­¡æµªè?é´?, tier: 4, family: 'quaxly',
        baseStats: { hp: 4, maxHp: 4, attack: 6 },
        imageUrl: 'assets/?‚æ­¡æµªè?é´?0.webp', battleImageUrl: 'assets/?‚æ­¡æµªè?é´?1.webp',
        description: '?Šæ®º?µæ–¹å¾Œï??ªèº«?²å? +10 ?»æ???, synergies: ['Starter', 'Water'], isHiddenFromShop: true
    },

    // 15. Rattata (Loop same name for stage 3)
    rattata: {
        id: 'rattata', name: 'å°æ???, tier: 1, family: 'rattata',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/å°æ???0.webp', battleImageUrl: 'assets/å°æ???1.webp',
        description: 'æ­»äº¡å¾Œå¬??2 ??1/1 è¿·ä??‰é???, synergies: ['Normal'], evolveId: 'raticate'
    },
    raticate: {
        id: 'raticate', name: '?‰é?', tier: 1, family: 'rattata',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/?‰é?00.webp', battleImageUrl: 'assets/?‰é?01.webp',
        description: 'æ­»äº¡å¾Œå¬??2 ??2/2 è¿·ä??‰é???, synergies: ['Normal'], evolveId: 'raticate_final', isHiddenFromShop: true
    },
    raticate_final: {
        id: 'raticate_final', name: '?‰é?', tier: 1, family: 'rattata',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/?‰é?00.webp', battleImageUrl: 'assets/?‰é?01.webp',
        description: 'æ­»äº¡å¾Œå¬??2 ??3/3 è¿·ä??‰é???, synergies: ['Normal'], isHiddenFromShop: true
    },

    // 16. Diglett
    diglett: {
        id: 'diglett', name: '?°é?', tier: 2, family: 'diglett',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/?°é?00.webp', battleImageUrl: 'assets/?°é?01.webp',
        description: '??25% æ©Ÿç??ƒé¿?·å®³??, synergies: ['Triplets', 'Cave'], evolveId: 'dugtrio'
    },
    dugtrio: {
        id: 'dugtrio', name: 'ä¸‰åœ°é¼?, tier: 2, family: 'diglett',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/ä¸‰åœ°é¼?0.webp', battleImageUrl: 'assets/ä¸‰åœ°é¼?1.webp',
        description: '??33% æ©Ÿç??ƒé¿?·å®³??, synergies: ['Triplets', 'Cave'], evolveId: 'dugtrio_final', isHiddenFromShop: true
    },
    dugtrio_final: {
        id: 'dugtrio_final', name: 'ä¸‰åœ°é¼?, tier: 2, family: 'diglett',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/ä¸‰åœ°é¼?0.webp', battleImageUrl: 'assets/ä¸‰åœ°é¼?1.webp',
        description: '??50% æ©Ÿç??ƒé¿?·å®³??, synergies: ['Triplets', 'Cave'], isHiddenFromShop: true
    },

    // 17. Meowth
    meowth: {
        id: 'meowth', name: '?µå–µ', tier: 2, family: 'meowth',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/?µå–µ00.webp', battleImageUrl: 'assets/?µå–µ01.webp',
        description: '?å??‹å??‚ç²å¾?1 ?‘å¹£??, synergies: ['Normal', 'Claw'], evolveId: 'persian'
    },
    persian: {
        id: 'persian', name: 'è²“è€å¤§', tier: 2, family: 'meowth',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/è²“è€å¤§00.webp', battleImageUrl: 'assets/è²“è€å¤§01.webp',
        description: '?å??‹å??‚ç²å¾?3 ?‘å¹£??, synergies: ['Normal', 'Claw'], evolveId: 'persian_final', isHiddenFromShop: true
    },
    persian_final: {
        id: 'persian_final', name: 'è²“è€å¤§', tier: 2, family: 'meowth',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/è²“è€å¤§00.webp', battleImageUrl: 'assets/è²“è€å¤§01.webp',
        description: '?å??‹å??‚ç²å¾?5 ?‘å¹£??, synergies: ['Normal', 'Claw'], isHiddenFromShop: true
    },

    // 18. Mankey (Tier 1)
    mankey: {
        id: 'mankey', name: '?´æ€?, tier: 1, family: 'mankey',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/?´æ€?0.webp', battleImageUrl: 'assets/?´æ€?1.webp',
        description: '?°é¬¥?‹å??‚ï??æ–¹?‹è??²å? +2 ?»æ???, synergies: ['Angry'], evolveId: 'primeape'
    },
    primeape: {
        id: 'primeape', name: '?«ç???, tier: 1, family: 'mankey',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/?«ç???0.webp', battleImageUrl: 'assets/?«ç???1.webp',
        description: '?°é¬¥?‹å??‚ï??æ–¹?‹è??²å? +5 ?»æ???, synergies: ['Angry'], evolveId: 'primeape_final', isHiddenFromShop: true
    },
    primeape_final: {
        id: 'primeape_final', name: '?«ç???, tier: 1, family: 'mankey',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/?«ç???0.webp', battleImageUrl: 'assets/?«ç???1.webp',
        description: '?°é¬¥?‹å??‚ï??æ–¹?‹è??²å? +10 ?»æ???, synergies: ['Angry'], isHiddenFromShop: true
    },

    // 19. Onix
    onix: {
        id: 'onix', name: 'å¤§å²©??, tier: 4, family: 'onix',
        baseStats: { hp: 5, maxHp: 5, attack: 5 },
        imageUrl: 'assets/å¤§å²©??0.webp', battleImageUrl: 'assets/å¤§å²©??1.webp',
        description: 'ç§»å?å¾Œï?æ°¸ä? +2 ?Ÿå‘½ï¼›å?å½?50% ?€?—åˆ°?„å‚·å®³ã€?, synergies: ['Cave', 'Hard'], evolveId: 'steelix'
    },
    steelix: {
        id: 'steelix', name: 'å¤§é‹¼??, tier: 4, family: 'onix',
        baseStats: { hp: 5, maxHp: 5, attack: 5 },
        imageUrl: 'assets/å¤§é‹¼??0.webp', battleImageUrl: 'assets/å¤§é‹¼??1.webp',
        description: 'ç§»å?å¾Œï?æ°¸ä? +2 ?Ÿå‘½ï¼›å?å½?50% ?€?—åˆ°?„å‚·å®³ã€?, synergies: ['Cave', 'Hard'], evolveId: 'steelix_final', isHiddenFromShop: true
    },
    steelix_final: {
        id: 'steelix_final', name: 'å¤§é‹¼??, tier: 4, family: 'onix',
        baseStats: { hp: 5, maxHp: 5, attack: 5 },
        imageUrl: 'assets/å¤§é‹¼??0.webp', battleImageUrl: 'assets/å¤§é‹¼??1.webp',
        description: 'ç§»å?å¾Œï?æ°¸ä?  +2 ?Ÿå‘½ï¼›å?å½?50% ?€?—åˆ°?„å‚·å®³ã€?, synergies: ['Cave', 'Hard'], isHiddenFromShop: true
    },

    // 20. Doduo
    doduo: {
        id: 'doduo', name: '?Ÿå?', tier: 2, family: 'doduo',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/?Ÿå?00.webp', battleImageUrl: 'assets/?Ÿå?01.webp',
        description: '??25% æ©Ÿç?é¡å??»æ?ä¸€æ¬¡ã€?, synergies: ['Triplets', 'Angry'], evolveId: 'dodrio'
    },
    dodrio: {
        id: 'dodrio', name: '?Ÿå???, tier: 2, family: 'doduo',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/?Ÿå???0.webp', battleImageUrl: 'assets/?Ÿå???1.webp',
        description: '??33% æ©Ÿç?é¡å??»æ?ä¸€æ¬¡ã€?, synergies: ['Triplets', 'Angry'], evolveId: 'dodrio_final', isHiddenFromShop: true
    },
    dodrio_final: {
        id: 'dodrio_final', name: '?Ÿå???, tier: 2, family: 'doduo',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/?Ÿå???0.webp', battleImageUrl: 'assets/?Ÿå???1.webp',
        description: '??50% æ©Ÿç?é¡å??»æ?ä¸€æ¬¡ã€?, synergies: ['Triplets', 'Angry'], isHiddenFromShop: true
    },

    // 21. Slowpoke
    slowpoke: {
        id: 'slowpoke', name: '?†å???, tier: 3, family: 'slowpoke',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/?†å???0.webp', battleImageUrl: 'assets/?†å???1.webp',
        description: '?—å‚·?‚ï??¥ç???< 50%ï¼Œå?å¾?6 ?Ÿå‘½ (æ¯å ´?°é¬¥ 1 æ¬???, synergies: ['Slow', 'Water'], evolveId: 'slowbro'
    },
    slowbro: {
        id: 'slowbro', name: '?†æ®¼??, tier: 3, family: 'slowpoke',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/?†æ®¼??0.webp', battleImageUrl: 'assets/?†æ®¼??1.webp',
        description: '?—å‚·?‚ï??¥ç???< 50%ï¼Œå?å¾?12 ?Ÿå‘½ (æ¯å ´?°é¬¥ 1 æ¬???, synergies: ['Slow', 'Water'], evolveId: 'slowbro_final', isHiddenFromShop: true
    },
    slowbro_final: {
        id: 'slowbro_final', name: '?†æ®¼??, tier: 3, family: 'slowpoke',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/?†æ®¼??0.webp', battleImageUrl: 'assets/?†æ®¼??1.webp',
        description: '?—å‚·?‚ï??¥ç???< 50%ï¼Œå?å¾?20 ?Ÿå‘½ (æ¯å ´?°é¬¥ 1 æ¬???, synergies: ['Slow', 'Water'], isHiddenFromShop: true
    },

    // 22. Magnemite
    magnemite: {
        id: 'magnemite', name: 'å°ç???, tier: 2, family: 'magnemite',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/å°ç???0.webp', battleImageUrl: 'assets/å°ç???1.webp',
        description: 'æº–å?çµæ??‚ï??¨æ??²å? +2 ?»æ? ???Ÿå‘½ (??1 æ¬???, synergies: ['Triplets', 'Hard'], evolveId: 'magneton'
    },
    magneton: {
        id: 'magneton', name: 'ä¸‰å?ä¸€ç£æ€?, tier: 2, family: 'magnemite',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/ä¸‰å?ä¸€ç£æ€?0.webp', battleImageUrl: 'assets/ä¸‰å?ä¸€ç£æ€?1.webp',
        description: 'æº–å?çµæ??‚ï??¨æ??²å? +2 ?»æ? ???Ÿå‘½ (??2 æ¬???, synergies: ['Triplets', 'Hard'], evolveId: 'magneton_final', isHiddenFromShop: true
    },
    magneton_final: {
        id: 'magneton_final', name: 'ä¸‰å?ä¸€ç£æ€?, tier: 2, family: 'magnemite',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/ä¸‰å?ä¸€ç£æ€?0.webp', battleImageUrl: 'assets/ä¸‰å?ä¸€ç£æ€?1.webp',
        description: 'æº–å?çµæ??‚ï??¨æ??²å? +2 ?»æ? ???Ÿå‘½ (??3 æ¬???, synergies: ['Triplets', 'Hard'], isHiddenFromShop: true
    },

    // 23. Houndour
    houndour: {
        id: 'houndour', name: '?´é­¯æ¯?, tier: 3, family: 'houndour',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/?´é­¯æ¯?0.webp', battleImageUrl: 'assets/?´é­¯æ¯?1.webp',
        description: '?°é¬¥?‹å??‚ï?å°ç??½æ?å°‘æ•µ?¹é€ æ? 4 ?·å®³ (??1 æ¬???, synergies: ['Angry', 'Fire'], evolveId: 'houndoom'
    },
    houndoom: {
        id: 'houndoom', name: 'é»‘é­¯??, tier: 3, family: 'houndour',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/é»‘é­¯??0.webp', battleImageUrl: 'assets/é»‘é­¯??1.webp',
        description: '?°é¬¥?‹å??‚ï?å°ç??½æ?å°‘æ•µ?¹é€ æ? 4 ?·å®³ (??3 æ¬???, synergies: ['Angry', 'Fire'], evolveId: 'houndoom_final', isHiddenFromShop: true
    },
    houndoom_final: {
        id: 'houndoom_final', name: 'é»‘é­¯??, tier: 3, family: 'houndour',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/é»‘é­¯??0.webp', battleImageUrl: 'assets/é»‘é­¯??1.webp',
        description: '?°é¬¥?‹å??‚ï?å°ç??½æ?å°‘æ•µ?¹é€ æ? 4 ?·å®³ (??5 æ¬???, synergies: ['Angry', 'Fire'], isHiddenFromShop: true
    },

    // 24. Sneasel
    sneasel: {
        id: 'sneasel', name: '?ƒæ?', tier: 4, family: 'sneasel',
        baseStats: { hp: 5, maxHp: 5, attack: 5 },
        imageUrl: 'assets/?ƒæ?00.webp', battleImageUrl: 'assets/?ƒæ?01.webp',
        description: '?»æ??‚ï??éš¨æ©Ÿæ”»??1 ?‹æ•µ?¹ï??Šæ®ºå¾Œæ”»?Šæ°¸ä¹?+3??, synergies: ['Claw', 'Snow'], evolveId: 'weavile'
    },
    weavile: {
        id: 'weavile', name: '?ªç???, tier: 4, family: 'sneasel',
        baseStats: { hp: 5, maxHp: 5, attack: 5 },
        imageUrl: 'assets/?ªç???0.webp', battleImageUrl: 'assets/?ªç???1.webp',
        description: '?»æ??‚ï??éš¨æ©Ÿæ”»??1 ?‹æ•µ?¹ï??Šæ®ºå¾Œæ”»?Šæ°¸ä¹?+3??, synergies: ['Claw', 'Snow'], evolveId: 'weavile_final', isHiddenFromShop: true
    },
    weavile_final: {
        id: 'weavile_final', name: '?ªç???, tier: 4, family: 'sneasel',
        baseStats: { hp: 5, maxHp: 5, attack: 5 },
        imageUrl: 'assets/?ªç???0.webp', battleImageUrl: 'assets/?ªç???1.webp',
        description: '?»æ??‚ï??éš¨æ©Ÿæ”»??1 ?‹æ•µ?¹ï??Šæ®ºå¾Œæ”»?Šæ°¸ä¹?+3??, synergies: ['Claw', 'Snow'], isHiddenFromShop: true
    },

    // 25. Shuppet (Tier 1)
    shuppet: {
        id: 'shuppet', name: '?¨å½±å¨ƒå?', tier: 1, family: 'shuppet',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/?¨å½±å¨ƒå?00.webp', battleImageUrl: 'assets/?¨å½±å¨ƒå?01.webp',
        description: 'æ­»äº¡å¾Œå??¨æ??µæ–¹? æ? 2 ?·å®³??, synergies: ['Ghost'], evolveId: 'banette'
    },
    banette: {
        id: 'banette', name: 'è©›å?å¨ƒå?', tier: 1, family: 'shuppet',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/è©›å?å¨ƒå?00.webp', battleImageUrl: 'assets/è©›å?å¨ƒå?01.webp',
        description: 'æ­»äº¡å¾Œå??¨æ??µæ–¹? æ? 5 ?·å®³??, synergies: ['Ghost'], evolveId: 'banette_final', isHiddenFromShop: true
    },
    banette_final: {
        id: 'banette_final', name: 'è©›å?å¨ƒå?', tier: 3, family: 'shuppet',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/è©›å?å¨ƒå?00.webp', battleImageUrl: 'assets/è©›å?å¨ƒå?01.webp',
        description: 'æ­»äº¡å¾Œå??¨æ??µæ–¹? æ? 10 ?·å®³??, synergies: ['Ghost'], isHiddenFromShop: true
    },

    // 26. Drifloon (Renamed from Drifblim Base)
    drifloon: {
        id: 'drifloon', name: 'é£„é???, tier: 2, family: 'drifloon',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/é£„é???0.webp', battleImageUrl: 'assets/é£„é???1.webp',
        description: 'æ­»äº¡å¾Œå??¨é??µæ–¹? æ? 2 ?·å®³??, synergies: ['Ghost'], evolveId: 'drifblim'
    },
    drifblim: {
        id: 'drifblim', name: '?¨é¢¨??, tier: 2, family: 'drifloon',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/?¨é¢¨??0.webp', battleImageUrl: 'assets/?¨é¢¨??1.webp',
        description: 'æ­»äº¡å¾Œå??¨é??µæ–¹? æ? 5 ?·å®³??, synergies: ['Ghost'], evolveId: 'drifblim_final', isHiddenFromShop: true
    },
    drifblim_final: {
        id: 'drifblim_final', name: '?¨é¢¨??, tier: 2, family: 'drifloon',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/?¨é¢¨??0.webp', battleImageUrl: 'assets/?¨é¢¨??1.webp',
        description: 'æ­»äº¡å¾Œå??¨é??µæ–¹? æ? 10 ?·å®³??, synergies: ['Ghost'], isHiddenFromShop: true
    },

    // 27. Snover
    snover: {
        id: 'snover', name: '?ªç???, tier: 3, family: 'snover',
        baseStats: { hp: 6, maxHp: 6, attack: 4 },
        imageUrl: 'assets/?ªç???0.webp', battleImageUrl: 'assets/?ªç???1.webp',
        description: '?»æ?å¾?+1 ?»æ?ä¸¦æ??€?µæ–¹è§’è‰²??, synergies: ['Grass', 'Snow'], evolveId: 'abomasnow'
    },
    abomasnow: {
        id: 'abomasnow', name: '?´é›ª??, tier: 3, family: 'snover',
        baseStats: { hp: 6, maxHp: 6, attack: 4 },
        imageUrl: 'assets/?´é›ª??0.webp', battleImageUrl: 'assets/?´é›ª??1.webp',
        description: '?»æ?å¾?+1 ?»æ?ä¸¦æ??€?µæ–¹è§’è‰²??, synergies: ['Grass', 'Snow'], evolveId: 'abomasnow_final', isHiddenFromShop: true
    },
    abomasnow_final: {
        id: 'abomasnow_final', name: '?´é›ª??, tier: 3, family: 'snover',
        baseStats: { hp: 6, maxHp: 6, attack: 4 },
        imageUrl: 'assets/?´é›ª??0.webp', battleImageUrl: 'assets/?´é›ª??1.webp',
        description: '?»æ?å¾?+1 ?»æ?ä¸¦æ??€?µæ–¹è§’è‰²??, synergies: ['Grass', 'Snow'], isHiddenFromShop: true
    },

    // 28. Dwebble (Tier 1)
    dwebble: {
        id: 'dwebble', name: '?³å???, tier: 1, family: 'dwebble',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/?³å???0.webp', battleImageUrl: 'assets/?³å???1.webp',
        description: '?°é¬¥?‹å??‚ï??æ–¹?‹è? +2 ?Ÿå‘½??, synergies: ['Hard'], evolveId: 'crustle'
    },
    crustle: {
        id: 'crustle', name: 'å²©æ®¿å±…èŸ¹', tier: 1, family: 'dwebble',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/å²©æ®¿å±…èŸ¹00.webp', battleImageUrl: 'assets/å²©æ®¿å±…èŸ¹01.webp',
        description: '?°é¬¥?‹å??‚ï??æ–¹?‹è? +5 ?Ÿå‘½??, synergies: ['Hard'], evolveId: 'crustle_final', isHiddenFromShop: true
    },
    crustle_final: {
        id: 'crustle_final', name: 'å²©æ®¿å±…èŸ¹', tier: 1, family: 'dwebble',
        baseStats: { hp: 2, maxHp: 2, attack: 2 },
        imageUrl: 'assets/å²©æ®¿å±…èŸ¹00.webp', battleImageUrl: 'assets/å²©æ®¿å±…èŸ¹01.webp',
        description: '?°é¬¥?‹å??‚ï??æ–¹?‹è? +10 ?Ÿå‘½??, synergies: ['Hard'], isHiddenFromShop: true
    },

    // 29. Kangaskhan
    kangaskhan: {
        id: 'kangaskhan', name: 'è¢‹ç¸', tier: 4, family: 'kangaskhan',
        baseStats: { hp: 6, maxHp: 6, attack: 6 },
        imageUrl: 'assets/è¢‹ç¸00.webp', battleImageUrl: 'assets/è¢‹ç¸01.webp',
        description: '?¥æ•µ?¹å·²?²å?ï¼Œå??»æ?ä¸€æ¬¡ã€??¥ç›®æ¨™æ­»äº¡å?ä¸ç™¼??', synergies: ['Normal'], evolveId: 'kangaskhan_2'
    },
    kangaskhan_2: {
        id: 'kangaskhan_2', name: 'è¢‹ç¸', tier: 4, family: 'kangaskhan',
        baseStats: { hp: 6, maxHp: 6, attack: 6 },
        imageUrl: 'assets/è¢‹ç¸00.webp', battleImageUrl: 'assets/è¢‹ç¸01.webp',
        description: '?¥æ•µ?¹å·²?²å?ï¼Œå??»æ?ä¸€æ¬¡ã€??¥ç›®æ¨™æ­»äº¡å?ä¸ç™¼??', synergies: ['Normal'], evolveId: 'kangaskhan_3', isHiddenFromShop: true
    },
    kangaskhan_3: {
        id: 'kangaskhan_3', name: 'è¢‹ç¸', tier: 4, family: 'kangaskhan',
        baseStats: { hp: 6, maxHp: 6, attack: 6 },
        imageUrl: 'assets/è¢‹ç¸00.webp', battleImageUrl: 'assets/è¢‹ç¸01.webp',
        description: '?¥æ•µ?¹å·²?²å?ï¼Œå??»æ?ä¸€æ¬¡ã€??¥ç›®æ¨™æ­»äº¡å?ä¸ç™¼??', synergies: ['Normal'], isHiddenFromShop: true
    },

    // 30. Ditto
    ditto: {
        id: 'ditto', name: '?¾è???, tier: 5, family: 'ditto',
        baseStats: { hp: 10, maxHp: 10, attack: 10 },
        imageUrl: 'assets/?¾è???0.webp', battleImageUrl: 'assets/?¾è???1.webp',
        description: '?°é¬¥?‹å??‚ï?è®Šèº«?ºæ??¹ç??½æ?é«˜ç?è§’è‰²??, synergies: ['Normal'], evolveId: 'ditto_2'
    },
    ditto_2: {
        id: 'ditto_2', name: '?¾è???, tier: 5, family: 'ditto',
        baseStats: { hp: 10, maxHp: 10, attack: 10 },
        imageUrl: 'assets/?¾è???0.webp', battleImageUrl: 'assets/?¾è???1.webp',
        description: '?°é¬¥?‹å??‚ï?è®Šèº«?ºæ??¹ç??½æ?é«˜ç?è§’è‰²??, synergies: ['Normal'], evolveId: 'ditto_3', isHiddenFromShop: true
    },
    ditto_3: {
        id: 'ditto_3', name: '?¾è???, tier: 5, family: 'ditto',
        baseStats: { hp: 10, maxHp: 10, attack: 10 },
        imageUrl: 'assets/?¾è???0.webp', battleImageUrl: 'assets/?¾è???1.webp',
        description: '?°é¬¥?‹å??‚ï?è®Šèº«?ºæ??¹ç??½æ?é«˜ç?è§’è‰²??, synergies: ['Normal'], isHiddenFromShop: true
    },

    // 31. Sableye
    sableye: {
        id: 'sableye', name: '?¾é???, tier: 4, family: 'sableye',
        baseStats: { hp: 5, maxHp: 5, attack: 5 },
        imageUrl: 'assets/?¾é???0.webp', battleImageUrl: 'assets/?¾é???1.webp',
        description: 'æ®ºæ­»?¾é??¼ç??µæ–¹ç«‹å³æ­»äº¡??, synergies: ['Ghost'], evolveId: 'sableye_2'
    },
    sableye_2: {
        id: 'sableye_2', name: '?¾é???, tier: 4, family: 'sableye',
        baseStats: { hp: 5, maxHp: 5, attack: 5 },
        imageUrl: 'assets/?¾é???0.webp', battleImageUrl: 'assets/?¾é???1.webp',
        description: 'æ®ºæ­»?¾é??¼ç??µæ–¹ç«‹å³æ­»äº¡??, synergies: ['Ghost'], evolveId: 'sableye_3', isHiddenFromShop: true
    },
    sableye_3: {
        id: 'sableye_3', name: '?¾é???, tier: 4, family: 'sableye',
        baseStats: { hp: 5, maxHp: 5, attack: 5 },
        imageUrl: 'assets/?¾é???0.webp', battleImageUrl: 'assets/?¾é???1.webp',
        description: 'æ®ºæ­»?¾é??¼ç??µæ–¹ç«‹å³æ­»äº¡??, synergies: ['Ghost'], isHiddenFromShop: true
    },

    // 32. Mimikyu
    mimikyu: {
        id: 'mimikyu', name: 'è¬æ“¬ï¼?, tier: 5, family: 'mimikyu',
        baseStats: { hp: 10, maxHp: 10, attack: 10 },
        imageUrl: 'assets/è¬æ“¬ï¼?0.webp', battleImageUrl: 'assets/è¬æ“¬ï¼?1.webp',
        description: '?µæ?æ¯å ´?°é¬¥ä¸­ç?é¦–æ¬¡?·å®³??, synergies: ['Ghost'], evolveId: 'mimikyu_2'
    },
    mimikyu_2: {
        id: 'mimikyu_2', name: 'è¬æ“¬ï¼?, tier: 5, family: 'mimikyu',
        baseStats: { hp: 10, maxHp: 10, attack: 10 },
        imageUrl: 'assets/è¬æ“¬ï¼?0.webp', battleImageUrl: 'assets/è¬æ“¬ï¼?1.webp',
        description: '?µæ?æ¯å ´?°é¬¥ä¸­ç?é¦–æ¬¡?·å®³??, synergies: ['Ghost'], evolveId: 'mimikyu_3', isHiddenFromShop: true
    },
    mimikyu_3: {
        id: 'mimikyu_3', name: 'è¬æ“¬ï¼?, tier: 5, family: 'mimikyu',
        baseStats: { hp: 10, maxHp: 10, attack: 10 },
        imageUrl: 'assets/è¬æ“¬ï¼?0.webp', battleImageUrl: 'assets/è¬æ“¬ï¼?1.webp',
        description: '?µæ?æ¯å ´?°é¬¥ä¸­ç?é¦–æ¬¡?·å®³??, synergies: ['Ghost'], isHiddenFromShop: true
    },

    // Misc
    sprout: {
        id: 'sprout', name: 'å°ç¨®å­?, tier: 1, family: 'bulbasaur',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/å¦™è?ç¨®å?00.webp', battleImageUrl: 'assets/å¦™è?ç¨®å?01.webp',
        description: 'å¦™è?ç¨®å??„èº«?†ã€?, synergies: ['Grass'], isHiddenFromShop: true
    },
    mouse: {
        id: 'mouse', name: 'è¿·ä??‰é?', tier: 1, family: 'rattata',
        baseStats: { hp: 1, maxHp: 1, attack: 1 },
        imageUrl: 'assets/å°æ???0.webp', battleImageUrl: 'assets/å°æ???1.webp',
        description: 'å°æ??”ç??†èº«??, synergies: ['Normal'], isHiddenFromShop: true
    },

    // 33. Spiritomb
    spiritomb: {
        id: 'spiritomb', name: '?±å²©??, tier: 5, family: 'spiritomb',
        baseStats: { hp: 10, maxHp: 10, attack: 10 },
        imageUrl: 'assets/?±å²©??0.webp', battleImageUrl: 'assets/?±å²©??1.webp',
        description: '?°é¬¥?‹å??‚ï?ä½¿éš¨æ©?2 ?‹æ•µ?¹è??²ç??€?½ç„¡?ˆå???, synergies: ['Ghost']
    },

    // 34. Gulpin
    gulpin: {
        id: 'gulpin', name: 'æº¶é???, tier: 2, family: 'gulpin',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/æº¶é???0.webp', battleImageUrl: 'assets/æº¶é???1.webp',
        description: '?°é¬¥?‹å??‚ï??å™¬?æ–¹?‹è?ä¸¦ç¹¼?¿å…¶?Ÿå‘½?Œæ”»?Šã€?, synergies: ['Slow'], evolveId: 'swalot'
    },
    swalot: {
        id: 'swalot', name: '?é???, tier: 2, family: 'gulpin',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/?é???0.webp', battleImageUrl: 'assets/?é???1.webp',
        description: '?°é¬¥?‹å??‚ï??å™¬?æ–¹?‹è?ä¸¦ç¹¼?¿å…¶?Ÿå‘½?Œæ”»?Šã€?, synergies: ['Slow'], evolveId: 'swalot_final', isHiddenFromShop: true
    },
    swalot_final: {
        id: 'swalot_final', name: '?é???, tier: 2, family: 'gulpin',
        baseStats: { hp: 3, maxHp: 3, attack: 3 },
        imageUrl: 'assets/?é???0.webp', battleImageUrl: 'assets/?é???1.webp',
        description: '?°é¬¥?‹å??‚ï??å™¬?æ–¹?‹è?ä¸¦ç¹¼?¿å…¶?Ÿå‘½?Œæ”»?Šã€?, synergies: ['Slow'], isHiddenFromShop: true
    },
    heracross: {
        id: 'heracross', name: 'èµ«æ??‹ç???, tier: 3, family: 'heracross',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/èµ«æ??‹ç???0.webp', battleImageUrl: 'assets/èµ«æ??‹ç???1.webp',
        description: 'é¦–æ¬¡?—å‚·å¾Œï??¬å ´?°é¬¥ä¸­æ”»?Šå?ç¿»å€ã€?, synergies: ['Beetle']
    },
    pinsir: {
        id: 'pinsir', name: '?±ç???, tier: 3, family: 'pinsir',
        baseStats: { hp: 4, maxHp: 4, attack: 4 },
        imageUrl: 'assets/?±ç???0.webp', battleImageUrl: 'assets/?±ç???1.webp',
        description: '?»æ??¡è?æ¸›å‚·?å?ç¡¬å?è¬æ“¬Q?„æ??½æ??œã€?, synergies: ['Beetle']
    },
    farfetchd: {
        id: 'farfetchd', name: 'å¤§è”¥é´?, tier: 5, family: 'farfetchd',
        baseStats: { hp: 10, maxHp: 10, attack: 10 },
        imageUrl: 'assets/å¤§è”¥é´?0.webp', battleImageUrl: 'assets/å¤§è”¥é´?1.webp',
        description: 'é¦–æ¬¡?»æ?? æ? 99 ?·å®³??, synergies: ['Normal']
    }
}
