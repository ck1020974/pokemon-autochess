import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const server = await createServer({ root, appType: 'custom', server: { middlewareMode: true } });

try {
  const { PLAYER_TRAINERS } = await server.ssrLoadModule('/src/presentation/trainers.ts');
  const presentation = await server.ssrLoadModule('/src/presentation/battlePresentation.ts');

  assert.deepEqual(PLAYER_TRAINERS.map(({ name }) => name), ['小青', '小春', '小悠', '小智', '小遙', '克麗絲', '阿響', '琴音', '葉子', '赤紅']);
  assert.equal(new Set(PLAYER_TRAINERS.map(({ id }) => id)).size, 10);
  PLAYER_TRAINERS.forEach(({ imageUrl }) => assert.ok(existsSync(resolve(root, 'public', imageUrl)), `Missing player trainer asset: ${imageUrl}`));

  assert.equal(presentation.getBattleIntroDuration('regular', false, false), 1400);
  assert.equal(presentation.getBattleIntroDuration('elite', false, false), 2000);
  assert.equal(presentation.getBattleIntroDuration('champion', true, false), 600);
  assert.equal(presentation.getBattleIntroDuration('regular', false, true), 0);

  const selectorSource = readFileSync(resolve(root, 'src', 'components', 'TrainerSelector.tsx'), 'utf8');
  assert.match(selectorSource, /aria-label="選擇訓練家"/);
  assert.match(selectorSource, /onSelect\(trainer\)/);
  assert.match(selectorSource, /trainer-selector-track/);

  console.log('Trainer presentation values verified.');
} finally {
  await server.close();
}
