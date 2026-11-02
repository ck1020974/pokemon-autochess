import { ANALYTICS_PUBLIC_KEY, ANALYTICS_URL, ANALYTICS_VERSION } from './config';
import type { TeamSnapshot } from './types';

type Result = 'WIN' | 'LOSS' | 'DRAW';
type Outcome = 'victory' | 'defeat' | 'abandoned';
interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; }
interface UnitLike { templateId: string; name: string; level: number; stats: { attack: number; hp: number; maxHp: number }; synergies: string[]; }
export interface BattleInput {
    edition: string; difficulty: string; turn: number; wins: number; lives: number;
    opponentId: string | null; opponentDifficulty: string;
    playerTeam: (UnitLike | null)[]; enemyTeam: (UnitLike | null)[];
    synergies: Record<string, number>; psychicN: number;
}
export interface AnalyticsEvent {
    eventId: string; visitorId: string; runId: string | null; battleId: string | null;
    kind: 'visit' | 'battle_start' | 'battle_end' | 'run_end';
    clientAt: string; edition: string | null; difficulty: string | null; version: string;
    payload: Record<string, unknown>;
}
interface TrackerOptions {
    storage: StorageLike; sessionStorage: StorageLike; enabled: boolean; version: string;
    send: (events: AnalyticsEvent[]) => Promise<string[]>;
    clock?: () => Date; id?: () => string;
}
const QUEUE_KEY = 'pokemon-analytics-queue-v1';
const VISITOR_KEY = 'pokemon-analytics-visitor-v1';
const VISIT_KEY = 'pokemon-analytics-visit-v1';
const randomId = () => globalThis.crypto?.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const value = Math.floor(Math.random() * 16);
    return (c === 'x' ? value : (value & 3) | 8).toString(16);
});
const snapshot = (team: (UnitLike | null)[]): TeamSnapshot => Array.from({ length: 5 }, (_, index) => {
    const unit = team[index];
    return unit ? { templateId: unit.templateId, name: unit.name, level: unit.level, attack: unit.stats.attack, hp: unit.stats.hp, maxHp: unit.stats.maxHp, synergies: [...unit.synergies] } : null;
});

export class AnalyticsTracker {
    private readonly options: TrackerOptions;
    private fallback = new Map<string, string>();
    private blockedKeys = new Set<string>();
    private runId: string | null = null;
    private active: { battleId: string; input: BattleInput; completed: boolean } | null = null;
    private ended = false;
    private flushing: Promise<void> | null = null;

    constructor(options: TrackerOptions) { this.options = options; }
    private now() { return (this.options.clock?.() ?? new Date()).toISOString(); }
    private id() { return this.options.id?.() ?? randomId(); }
    private get(key: string, session = false): string | null {
        if (this.blockedKeys.has(key)) return this.fallback.get(key) ?? null;
        try { return (session ? this.options.sessionStorage : this.options.storage).getItem(key) ?? this.fallback.get(key) ?? null; }
        catch { return this.fallback.get(key) ?? null; }
    }
    private put(key: string, value: string, session = false) {
        this.fallback.set(key, value);
        try { (session ? this.options.sessionStorage : this.options.storage).setItem(key, value); this.blockedKeys.delete(key); }
        catch { this.blockedKeys.add(key); }
    }
    private queue(): AnalyticsEvent[] {
        try {
            const value = JSON.parse(this.get(QUEUE_KEY) ?? '[]');
            if (!Array.isArray(value)) return [];
            const now = Date.parse(this.now());
            return value.filter((event): event is AnalyticsEvent => {
                if (!event || typeof event !== 'object' || typeof event.eventId !== 'string' || typeof event.clientAt !== 'string') return false;
                const time = Date.parse(event.clientAt);
                return Number.isFinite(time) && now - time < 7 * 86400000;
            });
        }
        catch { return []; }
    }
    private visitor() {
        let value = this.get(VISITOR_KEY);
        if (!value) { value = this.id(); this.put(VISITOR_KEY, value); }
        return value;
    }
    private enqueue(kind: AnalyticsEvent['kind'], payload: Record<string, unknown>, input?: BattleInput, battleId: string | null = null) {
        if (!this.options.enabled) return;
        const event: AnalyticsEvent = { eventId: this.id(), visitorId: this.visitor(), runId: kind === 'visit' ? null : this.runId,
            battleId, kind, clientAt: this.now(), edition: input?.edition ?? null, difficulty: input?.difficulty ?? null,
            version: this.options.version, payload };
        this.put(QUEUE_KEY, JSON.stringify([...this.queue(), event].slice(-500)));
    }
    startVisit() {
        if (!this.options.enabled) return;
        const now = Date.parse(this.now());
        const previous = Number(this.get(VISIT_KEY, true) ?? '0');
        if (!previous || now - previous >= 30 * 60 * 1000) this.enqueue('visit', {});
        this.put(VISIT_KEY, String(now), true);
    }
    startBattle(input: BattleInput, tutorial = false) {
        if (!this.options.enabled || tutorial) return;
        if (!this.runId || this.ended) { this.runId = this.id(); this.ended = false; }
        const battleId = `${this.runId}:${input.turn}`;
        if (this.active?.battleId === battleId) return;
        this.startVisit();
        this.active = { battleId, input: { ...input, playerTeam: [], enemyTeam: [], synergies: { ...input.synergies } }, completed: false };
        this.enqueue('battle_start', { turn: input.turn, winsBefore: input.wins, livesBefore: input.lives, opponentId: input.opponentId,
            opponentDifficulty: input.opponentDifficulty, playerTeam: snapshot(input.playerTeam), enemyTeam: snapshot(input.enemyTeam),
            synergies: { ...input.synergies }, psychicN: input.psychicN }, input, battleId);
    }
    finishBattle(result: Result, outcome?: Exclude<Outcome, 'abandoned'>) {
        if (!this.options.enabled || !this.active || this.active.completed || this.ended) return;
        this.active.completed = true;
        this.enqueue('battle_end', { result, turn: this.active.input.turn, outcome: outcome ?? null }, this.active.input, this.active.battleId);
        if (outcome) this.finishRun(outcome);
    }
    finishRun(outcome: Outcome = 'abandoned') {
        if (!this.options.enabled || !this.runId || this.ended) return;
        this.ended = true;
        this.enqueue('run_end', { outcome }, this.active?.input);
    }
    flush(): Promise<void> {
        if (!this.options.enabled) return Promise.resolve();
        if (this.flushing) return this.flushing;
        this.flushing = this.deliver().finally(() => { this.flushing = null; });
        return this.flushing;
    }
    private async deliver() {
        while (true) {
            const batch = this.queue().slice(0, 10);
            if (!batch.length) return;
            try {
                const accepted = new Set(await this.options.send(batch));
                if (!accepted.size) return;
                this.put(QUEUE_KEY, JSON.stringify(this.queue().filter(event => !accepted.has(event.eventId))));
                if (!batch.some(event => accepted.has(event.eventId))) return;
            } catch { return; }
        }
    }
}

const unavailableStorage: StorageLike = { getItem: () => null, setItem: () => {} };
const browserStorage = (session: boolean): StorageLike => {
    try { return session ? window.sessionStorage : window.localStorage; } catch { return unavailableStorage; }
};
const shouldTrack = () => {
    if (typeof window === 'undefined' || location.hostname !== 'ck1020974.github.io' || navigator.webdriver) return false;
    try { return localStorage.getItem('pokemon-analytics-opt-out') !== '1'; } catch { return true; }
};
export const analytics = new AnalyticsTracker({
    storage: typeof window === 'undefined' ? unavailableStorage : browserStorage(false),
    sessionStorage: typeof window === 'undefined' ? unavailableStorage : browserStorage(true),
    enabled: shouldTrack(), version: ANALYTICS_VERSION,
    send: async events => {
        const response = await fetch(`${ANALYTICS_URL}/functions/v1/pa-ingest`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANALYTICS_PUBLIC_KEY },
            body: JSON.stringify({ events }), keepalive: true, signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error('Analytics delivery deferred');
        return (await response.json() as { accepted: string[] }).accepted;
    },
});

export function startAnalyticsDelivery() {
    if (!shouldTrack()) return () => {};
    analytics.startVisit();
    void analytics.flush();
    const flush = () => { void analytics.flush(); };
    const timer = window.setInterval(flush, 15000);
    window.addEventListener('online', flush);
    window.addEventListener('pagehide', flush);
    return () => { clearInterval(timer); window.removeEventListener('online', flush); window.removeEventListener('pagehide', flush); };
}
