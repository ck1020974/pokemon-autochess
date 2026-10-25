import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const listeners = {}, stored = new Map(), deleted = [], waiting = [];
let networkCalls = 0;
let lastCacheMode;
const cache = {put: async (request, response) => stored.set(request.url, response.clone()), match: async request => stored.get(request.url)?.clone()};
const caches = {open: async () => cache, match: async () => new Response('stale from another version'),
  keys: async () => ['pkm-autochess-v3.9', 'unrelated-project-cache'], delete: async key => deleted.push(key)};
runInNewContext(readFileSync('public/sw.js', 'utf8'), {
  self: {location: {origin: 'https://test'}, addEventListener: (name, listener) => listeners[name] = listener,
    skipWaiting: async () => {}, clients: {claim: async () => {}}},
  caches, URL, Response, Map, fetch: async (request, options) => { networkCalls++; lastCacheMode = options?.cache ?? request.cache; const range = request.headers.get('range'); return new Response(range || 'fresh', {status: range ? 206 : 200}); },
});
const image = new Request('https://test/game/assets/test.webp');
stored.set(image.url, new Response('cached'));
let response;
listeners.fetch({request: image, respondWith: promise => response = promise, waitUntil: promise => waiting.push(promise)});
assert.equal(await (await response).text(), 'cached');
assert.equal(networkCalls, 0, 'A cached image must not wait for a new network request');
const changedImage = new Request('https://test/game/assets/changed.webp', {cache: 'force-cache'});
listeners.fetch({request: changedImage, respondWith: promise => response = promise, waitUntil: promise => waiting.push(promise)});
await response;
assert.equal(lastCacheMode, 'reload', 'A new content-version cache must not inherit stale HTTP-cache bytes');
const page = new Request('https://test/game/index.html');
stored.set(page.url, new Response('old page'));
listeners.fetch({request: page, respondWith: promise => response = promise, waitUntil: promise => waiting.push(promise)});
assert.equal(await (await response).text(), 'fresh', 'HTML must still prefer the latest network version');
let partial, full;
listeners.fetch({request: new Request('https://test/game/music/track.OGG', {headers: {range: 'bytes=0-99'}}), respondWith: promise => partial = promise, waitUntil: promise => waiting.push(promise)});
listeners.fetch({request: new Request('https://test/game/music/track.OGG'), respondWith: promise => full = promise, waitUntil: promise => waiting.push(promise)});
assert.equal(await (await partial).text(), 'bytes=0-99');
assert.equal(await (await full).text(), 'fresh', 'Partial audio streams must not be reused as complete downloads');
listeners.activate({waitUntil: promise => waiting.push(promise)});
await Promise.all(waiting);
assert.ok(deleted.includes('pkm-autochess-v3.9'));
assert.ok(!deleted.includes('unrelated-project-cache'), 'Do not remove another app cache');
console.log('Asset cache verified: cache-first images, fresh HTML, scoped cache cleanup.');
