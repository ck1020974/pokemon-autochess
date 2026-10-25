const CACHE_NAME = 'pkm-autochess-assets-51a344b5bc7fce30';

// Content version is generated before dev/build; changed media gets a new cache.
const inFlight = new Map();
const matchCurrent = async request => (await caches.open(CACHE_NAME)).match(request);
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(names => Promise.all(names
        .filter(name => name.startsWith('pkm-autochess-') && name !== CACHE_NAME)
        .map(name => caches.delete(name)))).then(() => self.clients.claim()));
});

function fromNetwork(request, event, refreshMedia) {
    const key = request.url + '|' + (request.headers.get('range') || '');
    if (!inFlight.has(key)) {
        const response = fetch(request, refreshMedia ? {cache: 'reload'} : undefined);
        inFlight.set(key, response);
        const store = response.then(async result => {
            if (result.status === 200) {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(request, result.clone());
            }
        }).catch(() => {}).finally(() => inFlight.delete(key));
        event.waitUntil(store);
    }
    return inFlight.get(key).then(response => response.clone());
}

self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.origin !== self.location.origin) return;
    const media = /\.(webp|png|jpe?g|svg|ogg|mp3|wav)$/i.test(url.pathname);
    event.respondWith((async () => {
        // Reuse completed media immediately; explicit retry requests bypass old entries.
        if (media && request.cache !== 'reload') {
            const cached = await matchCurrent(request);
            if (cached) return cached;
        }
        try { return await fromNetwork(request, event, media); }
        catch { return (await matchCurrent(request)) || Response.error(); }
    })());
});
