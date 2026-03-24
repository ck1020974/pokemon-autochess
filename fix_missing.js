const fs = require('fs');
const path = require('path');
const p = 'c:/Users/李祐馨/Desktop/pokemon-autochess/src/data';
const files = [
    path.join(p, 'AllOpponents.ts'),
    path.join(p, 'ModernOpponents.ts'),
    path.join(p, 'opponents/classic.ts'),
    path.join(p, 'opponents/modern.ts')
];

const corrections = {
    'gym/火雁.webp': 'elitefour/火雁.webp',
    'gym/阿泉.webp': 'elitefour/阿泉.webp',
    'gym/牡丹.webp': 'elitefour/牡丹.webp',
    'gym/琉琪亞.webp': 'elitefour/琉琪亞.webp',
    'gym/小照.webp': 'elitefour/小照.webp',
    'gym/明耀.webp': 'elitefour/明耀.webp',
    'gym/望羅01.webp': 'elitefour/望羅01.webp',
    'gym/越橘.webp': 'elitefour/越橘.webp',
    'gym/小椿.webp': 'elitefour/小椿.webp',
    'champion/迷可利.webp': 'champion/米可利.webp',
    'gym/望羅02.webp': 'elitefour/望羅02.webp',
    'gym/剛石.webp': 'elitefour/剛石.webp',
    'gym/珠貝.webp': 'elitefour/珠貝.webp',
};

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf-8');
    let original = content;
    for (let [bad, good] of Object.entries(corrections)) {
        content = content.replace(new RegExp(`url:\\s*'${bad}'`, 'g'), `url: '${good}'`);
    }
    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log('Fixed URLs in', path.basename(file));
    }
});
