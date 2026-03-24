
import fs from 'fs';

const content = fs.readFileSync('c:\\Users\\李祐馨\\Desktop\\pokemon-autochess\\src\\data\\AllUnits.ts', 'utf8');

const unitsWithoutStats = [];

// Split by unit key (e.g. "bulbasaur: {")
const lines = content.split('\n');
let currentUnitId = null;
let hasStats = false;

for (const line of lines) {
    const keyMatch = line.match(/^\s*([a-zA-Z0-9_]+|'[^']+')\s*:\s*{/);
    if (keyMatch) {
        if (currentUnitId && !hasStats) {
            unitsWithoutStats.push(currentUnitId);
        }
        currentUnitId = keyMatch[1].replace(/'/g, '').trim();
        hasStats = false;
        continue;
    }
    if (line.includes('baseStats')) hasStats = true;
}

if (currentUnitId && !hasStats) {
    unitsWithoutStats.push(currentUnitId);
}

console.log(JSON.stringify(unitsWithoutStats));
