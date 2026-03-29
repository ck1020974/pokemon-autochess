// Node script to generate opponent list with Chinese unit names for Infinite Edition
const fs = require('fs');
const path = require('path');

const allUnitsPath = path.resolve('c:/Users/李祐馨/Desktop/pokemon-autochess/src/data/AllUnits.ts');
const classicOppPath = path.resolve('c:/Users/李祐馨/Desktop/pokemon-autochess/src/data/opponents/classic.ts');
const modernOppPath = path.resolve('c:/Users/李祐馨/Desktop/pokemon-autochess/src/data/opponents/modern.ts');

function parseUnits(fileContent) {
    const unitMap = {};
    const unitRegex = /([a-z0-9_]+):\s*\{[^}]*name:\s*'([^']+)'/g;
    let match;
    while ((match = unitRegex.exec(fileContent)) !== null) {
        const id = match[1];
        const name = match[2];
        unitMap[id] = name;
    }
    return unitMap;
}

function parseOpponents(fileContent) {
    const opps = [];
    const oppRegex = /{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',[^}]*coreUnits:\s*\[([^\]]+)\]/g;
    let match;
    while ((match = oppRegex.exec(fileContent)) !== null) {
        const id = match[1];
        const name = match[2];
        const coreUnitsStr = match[3];
        const coreUnits = coreUnitsStr.split(',').map(s => s.trim().replace(/['\"]+/g, ''));
        opps.push({ id, name, coreUnits });
    }
    return opps;
}

const allUnitsContent = fs.readFileSync(allUnitsPath, 'utf8');
const unitMap = parseUnits(allUnitsContent);

const classicContent = fs.readFileSync(classicOppPath, 'utf8');
const modernContent = fs.readFileSync(modernOppPath, 'utf8');

const classicOpps = parseOpponents(classicContent);
const modernOpps = parseOpponents(modernContent);

function formatOpp(opp) {
    const unitNames = opp.coreUnits.map(id => unitMap[id] || id);
    return `- **${opp.name}**: ${unitNames.join('、')}`;
}

let markdown = '# 無限版（Infinite Edition）對手與角色列表\n\n';
markdown += '## 初階（Novice）\n';
classicOpps.filter(o => o.id.startsWith('novice')).forEach(o => { markdown += formatOpp(o) + '\n'; });
modernOpps.filter(o => o.id.startsWith('mn_')).forEach(o => { markdown += formatOpp(o) + '\n'; });
markdown += '\n## 中階（Interm）\n';
classicOpps.filter(o => o.id.startsWith('interm')).forEach(o => { markdown += formatOpp(o) + '\n'; });
modernOpps.filter(o => o.id.startsWith('mi_')).forEach(o => { markdown += formatOpp(o) + '\n'; });
markdown += '\n## 進階（Advanced）\n';
classicOpps.filter(o => o.id.startsWith('adv')).forEach(o => { markdown += formatOpp(o) + '\n'; });
modernOpps.filter(o => o.id.startsWith('ma_')).forEach(o => { markdown += formatOpp(o) + '\n'; });
markdown += '\n## 精英（Elite）\n';
classicOpps.filter(o => o.id.startsWith('elite')).forEach(o => { markdown += formatOpp(o) + '\n'; });
modernOpps.filter(o => o.id.startsWith('me_')).forEach(o => { markdown += formatOpp(o) + '\n'; });
markdown += '\n## 冠軍（Champion）\n';
classicOpps.filter(o => o.id.startsWith('champion')).forEach(o => { markdown += formatOpp(o) + '\n'; });
modernOpps.filter(o => o.id.startsWith('mc_')).forEach(o => { markdown += formatOpp(o) + '\n'; });

fs.writeFileSync(path.resolve('c:/Users/李祐馨/Desktop/pokemon-autochess/opponent_units.md'), markdown, 'utf8');
console.log('Generated opponent_units.md');
