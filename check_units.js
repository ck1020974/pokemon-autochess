import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const content = readFileSync(join(__dirname, 'src', 'data', 'AllUnits.ts'), 'utf8');
const unitsWithoutStats = [];

const lines = content.split('\n');
let currentUnitId = null;
let hasStats = false;

for (const line of lines) {
  const keyMatch = line.match(/^    ([a-zA-Z0-9_]+|'[^']+')\s*:\s*{/);
  if (keyMatch) {
    if (currentUnitId && !hasStats) unitsWithoutStats.push(currentUnitId);
    currentUnitId = keyMatch[1].replace(/'/g, '').trim();
    hasStats = false;
    continue;
  }
  if (line.includes('baseStats')) hasStats = true;
}

if (currentUnitId && !hasStats) unitsWithoutStats.push(currentUnitId);

console.log(JSON.stringify(unitsWithoutStats));
