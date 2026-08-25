import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const compact = (source) => source.replace(/\s+/g, '');

const [synergies, battle, headless, gameLoop] = await Promise.all([
  read('src/models/Synergies.ts'),
  read('src/engine/BattleSimulator.ts'),
  read('src/engine/HeadlessBattleSimulator.ts'),
  read('src/engine/GameLoop.ts'),
]);

assert.match(synergies, /\[2\/3\/5\].*0~3.*2~6.*6~12/);

for (const [name, source] of Object.entries({ battle, headless })) {
  const value = compact(source);
  assert.ok(value.includes('letminBoost=0;letmaxBoost=3;'), `${name} 的電光 2 層數值錯誤`);
  assert.ok(value.includes('if(chargeCount>=5){minBoost=6;maxBoost=12;}'), `${name} 的電光 5 層數值錯誤`);
  assert.ok(value.includes('elseif(chargeCount>=3){minBoost=2;maxBoost=6;}'), `${name} 的電光 3 層數值錯誤`);
}

assert.ok(compact(headless).includes('constbuff=count>=5?2:1;'), '無介面模擬器的初始夥伴五層效果不是 +2/+2');
assert.ok(compact(gameLoop).includes('constbuff=starterCount>=5?2:1;'), '正式遊戲的初始夥伴五層效果不是 +2/+2');

assert.match(battle, /if \(unit\.family === 'slakoth'\)[\s\S]*?for \(const ally of myTeam\)[\s\S]*?const original = this\.originalPlayerTeam\?\.find\(o => o && o\.id === ally\.id\);[\s\S]*?this\.growUnit\(ally, buffHp, 0, '', original, true\);/);
assert.match(battle, /if \(unit\.family === 'bagon'\)[\s\S]*?for \(const ally of myTeam\)[\s\S]*?const original = this\.originalPlayerTeam\?\.find\(o => o && o\.id === ally\.id\);[\s\S]*?this\.growUnit\(ally, 0, buffAtk, '', original, true\);/);

console.log('Balance values verified.');
