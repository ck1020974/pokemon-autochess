import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createServer} from 'vite';

assert.ok(existsSync('src/loading/AssetLoader.ts'), 'A shared asset queue is required instead of independent untracked Image requests');
const server = await createServer({appType: 'custom', server: {middlewareMode: true}});
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const image = (url, bytes = 100) => ({url, bytes, kind: 'image'});
try {
  const {AssetLoader} = await server.ssrLoadModule('/src/loading/AssetLoader.ts');
  const calls = [];
  const pending = new Map();
  const loader = new AssetLoader({baseUrl: 'https://test/game/', concurrency: 3, backgroundConcurrency: 1, retryDelayMs: 0,
    load: (asset, progress) => new Promise(resolve => { calls.push(asset.url); pending.set(asset.url, {resolve, progress}); })});
  loader.enqueue([image('a.webp'), image('b.webp'), image('c.webp')], 20);
  await tick();
  assert.equal(calls.length, 1, 'Background work must leave room for foreground work');
  loader.enqueue([image('urgent.webp', 900), image('a.webp')], 0);
  await tick();
  assert.ok(calls.includes('https://test/game/urgent.webp'));
  assert.equal(calls.filter(url => url.endsWith('/a.webp')).length, 1, 'Promoting a live request must not duplicate it');
  pending.get('https://test/game/a.webp').resolve();
  pending.get('https://test/game/urgent.webp').progress(450);
  await tick();
  const half = loader.progress(['a.webp', 'urgent.webp']);
  assert.equal(half.percent, 55, 'Progress must use actual bytes, not completed-file count or fixed jumps');
  assert.equal(half.ready, false);
  pending.get('https://test/game/urgent.webp').resolve();
  await tick();
  assert.equal(loader.progress(['a.webp', 'urgent.webp']).percent, 100);
  assert.equal(loader.progress(['a.webp', 'urgent.webp']).ready, true);
  assert.ok(calls.length <= 4, 'Concurrency must remain bounded');

  let attempts = 0;
  const retry = new AssetLoader({retryDelayMs: 0, maxAttempts: 3, load: async () => { if (++attempts < 3) throw new Error('temporary network failure'); }});
  retry.enqueue([image('retry.webp')], 0);
  assert.equal((await retry.whenSettled(['retry.webp'])).ready, true);
  assert.equal(attempts, 3);

  let available = false;
  const failed = new AssetLoader({retryDelayMs: 0, maxAttempts: 2, load: async () => { if (!available) throw new Error('offline'); }});
  failed.enqueue([image('missing.webp')], 0);
  const failure = await failed.whenSettled(['missing.webp']);
  assert.equal(failure.failed, 1);
  assert.equal(failure.ready, false, 'Errors must not report readiness');
  assert.ok(failure.percent < 100, 'Errors must not report 100%');
  available = true; failed.retryFailed(['missing.webp']);
  assert.equal((await failed.whenSettled(['missing.webp'])).ready, true);

  const order = [];
  const media = new AssetLoader({load: async asset => { order.push(asset.kind); }});
  media.enqueue([{url: 'music.OGG', bytes: 10000000, kind: 'audio'}, image('first.webp'), image('second.webp')], 20);
  await media.whenSettled(['music.OGG', 'first.webp', 'second.webp']);
  assert.deepEqual(order, ['image', 'image', 'audio'], 'Large audio must wait behind images');
  console.log('Asset queue verified: byte progress, deduplication, priorities, bounded concurrency, retries and image-first audio scheduling.');
} finally { await server.close(); }
