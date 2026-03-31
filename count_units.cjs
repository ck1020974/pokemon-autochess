const fs = require('fs');
const content = fs.readFileSync('src/data/AllUnits.ts', 'utf8');

// Use a regex to find all unit definitions
// This regex matches "key: { ... }" where the closing brace is on a new line started with spaces and "},"
const unitBlocks = content.match(/^\s*\w+:\s*\{[\s\S]*?\n\s+\},/gm);

const stats = { 1: [], 2: [], 3: [], 4: [], 5: [] };

if (unitBlocks) {
    unitBlocks.forEach(block => {
        const idMatch = block.match(/^\s*(\w+):/);
        const nameMatch = block.match(/name:\s*['"](.+?)['"]/);
        const tierMatch = block.match(/tier:\s*(\d+)/);
        const isHidden = block.includes('isHiddenFromShop: true');

        if (tierMatch && !isHidden && nameMatch) {
            const tier = parseInt(tierMatch[1]);
            const name = nameMatch[1];
            if (stats[tier]) {
                stats[tier].push(name);
            }
        }
    });
}

for (let t = 1; t <= 5; t++) {
    console.log(`Tier ${t} (${stats[t].length}): ${stats[t].join(', ')}`);
}
