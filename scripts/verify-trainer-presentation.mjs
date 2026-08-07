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
  const selectorCss = readFileSync(resolve(root, 'src', 'components', 'TrainerSelector.css'), 'utf8');
  assert.match(selectorSource, /aria-label="選擇訓練家"/);
  assert.match(selectorSource, /onSelect\(trainer\)/);
  assert.match(selectorSource, /trainer-selector-track/);
  assert.match(selectorSource, /trainer-selector-arrow/);
  assert.match(selectorSource, /onKeyDown/);
  assert.match(selectorSource, /setActiveIndex/);
  assert.doesNotMatch(selectorCss, /overflow-x:\s*auto/);

  const introSource = readFileSync(resolve(root, 'src', 'components', 'BattleIntro.tsx'), 'utf8');
  const introCss = readFileSync(resolve(root, 'src', 'components', 'BattleIntro.css'), 'utf8');
  assert.match(introSource, /onClick=\{complete\}/);
  assert.match(introSource, /useRef\(false\)/);
  assert.match(introSource, /clearTimeout/);
  assert.match(introSource, /battle-intro-scene/);

  const appSource = readFileSync(resolve(root, 'src', 'App.tsx'), 'utf8');
  const appCss = readFileSync(resolve(root, 'src', 'index.css'), 'utf8');
  const presentationSource = readFileSync(resolve(root, 'src', 'presentation', 'battlePresentation.ts'), 'utf8');
  assert.match(appSource, /showTrainerSelector/);
  assert.match(appSource, /<TrainerSelector/);
  assert.match(appSource, /quickBattlePresentation/);
  assert.match(appSource, /<BattleIntro/);
  assert.match(appSource, /battle-stage-shell/);
  assert.match(appCss, /\.battle-stage-shell\.is-battling/);
  assert.match(presentationSource, /landmark/);
  assert.match(introCss, /max-height:\s*30vh/);
  const simulatorSource = readFileSync(resolve(root, 'src', 'engine', 'BattleSimulator.ts'), 'utf8');
  const gameLoopSource = readFileSync(resolve(root, 'src', 'engine', 'GameLoop.ts'), 'utf8');
  assert.doesNotMatch(simulatorSource, /selectedTrainer/);
  assert.doesNotMatch(gameLoopSource, /selectedTrainer/);

  console.log('Trainer presentation values verified.');
} finally {
  await server.close();
}
