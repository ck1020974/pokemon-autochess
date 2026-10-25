export interface AssetSpec { url: string; bytes: number; kind: 'image' | 'audio' }
type State = 'queued' | 'loading' | 'loaded' | 'failed';
interface Entry extends AssetSpec { state: State; priority: number; received: number; attempts: number; retryAt: number }
export interface AssetProgress {
    total: number; loaded: number; failed: number; totalBytes: number; loadedBytes: number; percent: number; ready: boolean;
}
interface Options {
    baseUrl?: string; concurrency?: number; backgroundConcurrency?: number; maxAttempts?: number; retryDelayMs?: number;
    load: (asset: AssetSpec, progress: (bytes: number) => void, attempt: number) => Promise<void>;
}

export class AssetLoader {
    private entries = new Map<string, Entry>();
    private listeners = new Set<() => void>();
    private scheduled = false;
    private revision = 0;
    private readonly options: Required<Options>;
    constructor(options: Options) {
        this.options = {baseUrl: 'https://assets.local/', concurrency: 4, backgroundConcurrency: 2, maxAttempts: 3, retryDelayMs: 500, ...options};
    }
    private key(url: string) { return new URL(url, this.options.baseUrl).href; }
    subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
    getRevision = () => this.revision;
    private emit() { this.revision++; for (const listener of this.listeners) listener(); }
    enqueue(assets: readonly AssetSpec[], priority = 20) {
        let changed = false;
        for (const asset of assets) {
            if (!asset.url) continue;
            const url = this.key(asset.url);
            const existing = this.entries.get(url);
            if (existing) {
                if (priority < existing.priority) { existing.priority = priority; changed = true; }
                continue;
            }
            this.entries.set(url, {...asset, url, bytes: Math.max(1, asset.bytes), state: 'queued', priority, received: 0, attempts: 0, retryAt: 0});
            changed = true;
        }
        if (changed) this.emit();
        this.schedule();
    }
    progress(urls: readonly string[]): AssetProgress {
        const keys = [...new Set(urls.filter(Boolean).map(url => this.key(url)))];
        let loaded = 0, failed = 0, totalBytes = 0, loadedBytes = 0;
        for (const key of keys) {
            const entry = this.entries.get(key);
            totalBytes += entry?.bytes ?? 1;
            if (entry?.state === 'loaded') { loaded++; loadedBytes += entry.bytes; }
            else if (entry) {
                if (entry.state === 'failed') failed++;
                loadedBytes += Math.min(entry.received, entry.bytes * .99);
            }
        }
        const ready = loaded === keys.length;
        return {total: keys.length, loaded, failed, totalBytes, loadedBytes,
            percent: ready ? 100 : Math.min(99, Math.floor(100 * loadedBytes / Math.max(1, totalBytes))), ready};
    }
    whenSettled(urls: readonly string[]): Promise<AssetProgress> {
        return new Promise(resolve => {
            const check = () => {
                const state = this.progress(urls);
                if (state.loaded + state.failed === state.total) { unsubscribe(); resolve(state); }
            };
            const unsubscribe = this.subscribe(check);
            check();
        });
    }
    retryFailed(urls?: readonly string[]) {
        const keys = urls && new Set(urls.map(url => this.key(url)));
        for (const entry of this.entries.values()) {
            if (entry.state === 'failed' && (!keys || keys.has(entry.url))) {
                entry.state = 'queued'; entry.attempts = 0; entry.retryAt = 0;
            }
        }
        this.emit(); this.schedule();
    }
    private schedule() {
        if (this.scheduled) return;
        this.scheduled = true;
        queueMicrotask(() => { this.scheduled = false; this.pump(); });
    }
    private pump() {
        const all = [...this.entries.values()];
        const active = all.filter(entry => entry.state === 'loading');
        let slots = this.options.concurrency - active.length;
        let background = active.filter(entry => entry.priority >= 10).length;
        let audio = active.filter(entry => entry.kind === 'audio').length;
        const imagesPending = all.some(entry => entry.kind === 'image' && (entry.state === 'queued' || entry.state === 'loading'));
        const candidates = all.filter(entry => entry.state === 'queued' && entry.retryAt <= Date.now())
            .sort((a, b) => Number(a.kind === 'audio') - Number(b.kind === 'audio') || a.priority - b.priority);
        for (const entry of candidates) {
            if (slots <= 0) break;
            if (entry.priority >= 10 && background >= this.options.backgroundConcurrency) continue;
            if (entry.kind === 'audio' && (imagesPending || audio >= 1)) continue;
            entry.state = 'loading'; entry.attempts++;
            slots--; if (entry.priority >= 10) background++; if (entry.kind === 'audio') audio++;
            void this.run(entry);
        }
    }
    private async run(entry: Entry) {
        try {
            await this.options.load(entry, bytes => {
                entry.received = Math.max(entry.received, Math.min(bytes, entry.bytes * .99));
                this.emit();
            }, entry.attempts);
            entry.state = 'loaded'; entry.received = entry.bytes;
        } catch {
            if (entry.attempts < this.options.maxAttempts) {
                const delay = this.options.retryDelayMs * entry.attempts;
                entry.state = 'queued'; entry.retryAt = Date.now() + delay;
                setTimeout(() => this.schedule(), delay);
            } else entry.state = 'failed';
        }
        this.emit(); this.schedule();
    }
}

// Download all bytes before declaring readiness. A decoded blob also catches HTML error pages and corrupt images.
export async function downloadAsset(asset: AssetSpec, progress: (bytes: number) => void, attempt: number): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
        const response = await fetch(asset.url, {signal: controller.signal, cache: attempt > 1 ? 'reload' : 'force-cache'});
        if (!response.ok) throw new Error(`Asset HTTP ${response.status}`);
        const chunks: Uint8Array<ArrayBuffer>[] = [];
        let received = 0;
        if (response.body) {
            const reader = response.body.getReader();
            for (;;) {
                const {done, value} = await reader.read();
                if (done) break;
                received += value.byteLength;
                if (asset.kind === 'image') chunks.push(new Uint8Array(value));
                progress(received);
            }
        } else {
            const data = new Uint8Array(await response.arrayBuffer()); received = data.byteLength;
            if (asset.kind === 'image') chunks.push(data);
        }
        if (!received) throw new Error('Empty asset response');
        if (asset.kind === 'image') {
            const blob = new Blob(chunks, {type: response.headers.get('content-type') || 'image/webp'});
            const url = URL.createObjectURL(blob);
            try { const image = new Image(); image.src = url; await image.decode(); }
            finally { URL.revokeObjectURL(url); }
        }
    } finally { clearTimeout(timeout); }
}
