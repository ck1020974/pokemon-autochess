const fs = require('fs');
const path = require('path');

const dirs = ['public/gym', 'public/elitefour', 'public/champion'];
dirs.forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const moves = {
    'gym': ['小青', '小春', '小剛', '小悠', '小遙', '小霞', '克麗絲', '坂木', '阿響', '琴音', '葉子', '滿充', '武藏', '小次郎', '小菘', '小茜', '松葉', '阿蜜'],
    'elitefour': ['柯拿', '希巴', '菊子', '梨花', '阿柳', '大葉', '小銀'],
    'champion': ['竹蘭', '卡露妮', '阿渡', '大吾', '赤紅', '丹帝', '小智']
};

Object.entries(moves).forEach(([folder, names]) => {
    names.forEach(name => {
        const src = path.join('public/npc', name + '.webp');
        const dest = path.join('public', folder, name + '.webp');
        if (fs.existsSync(src)) {
            fs.renameSync(src, dest);
            console.log('Moved', src, 'to', dest);
        } else {
            console.log('Missing', src);
        }
    });
});
console.log('Done!');
