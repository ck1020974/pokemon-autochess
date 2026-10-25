import assert from 'node:assert/strict';
import {readFileSync, existsSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {createServer} from 'vite';
const server = await createServer({appType: 'custom', server: {middlewareMode: true}});
try {
  const catalog = await server.ssrLoadModule('/src/loading/assetCatalog.ts');
  const {ALL_UNITS} = await server.ssrLoadModule('/src/data/AllUnits.ts');
  const {REWARD_DATA} = await server.ssrLoadModule('/src/models/RewardData.ts');
  const {PLAYER_TRAINERS} = await server.ssrLoadModule('/src/presentation/trainers.ts');
  const boot = new Set(catalog.BOOT_ASSETS.map(asset => asset.url));
  for (const trainer of PLAYER_TRAINERS) assert.ok(boot.has(trainer.imageUrl), `Trainer must be ready before selection: ${trainer.name}`);
  for (const reward of REWARD_DATA) assert.ok(boot.has(reward.imageUrl), `Reward must be preloaded: ${reward.item}`);
  for (const name of ['小剛01', '小剛02', '小剛03']) assert.ok(boot.has(`gym/${name}.webp`));
  for (const name of ['classic', 'modern', 'infinite']) {
    const module = await server.ssrLoadModule(`/src/data/editions/${name}/index.ts`);
    const edition = Object.values(module).find(value => value?.id === name);
    const assets = catalog.getEditionAssets(edition);
    assert.ok(assets.every(asset => asset.kind === 'image'), 'No large audio may block entry');
    const urls = new Set(assets.map(asset => asset.url));
    for (const unit of Object.values(ALL_UNITS)) {
      assert.ok(urls.has(unit.imageUrl), `Missing unit portrait: ${unit.id}`);
      if (unit.battleImageUrl) assert.ok(urls.has(unit.battleImageUrl), `Missing battle sprite: ${unit.id}`);
    }
    for (const opponent of [...edition.noviceOpponents, ...edition.intermOpponents, ...edition.advancedOpponents, ...edition.eliteOpponents, ...edition.championOpponents]) {
      assert.ok(urls.has(opponent.url), `Missing opponent portrait: ${name}/${opponent.name}`);
    }
  }
  const manifest = JSON.parse(readFileSync('src/loading/assetManifest.json', 'utf8'));
  for (const [url, bytes] of Object.entries(manifest.publicAssets)) {
    const file = path.resolve('public', url);
    assert.ok(existsSync(file), `Missing public asset: ${url}`);
    assert.ok(readdirSync(path.dirname(file)).includes(path.basename(file)), `Linux filename mismatch: ${url}`);
    assert.ok(bytes > 0);
  }
  const main = readFileSync('src/main.tsx', 'utf8');
  assert.ok(main.indexOf('startAssetPreload()') < main.indexOf('createRoot(document'), 'Background queue must start before React renders');
  const app = readFileSync('src/App.tsx', 'utf8');
  assert.doesNotMatch(app, /setLoadingProgress\((20|60|100)\)/);
  assert.doesNotMatch(app, /img\.onerror\s*=\s*handleLoad/);
  console.log(`Asset coverage verified: ${Object.keys(ALL_UNITS).length} units, all editions, 10 trainers, rewards, tutorial assets and ${Object.keys(manifest.publicAssets).length} valid public paths.`);
} finally { await server.close(); }
