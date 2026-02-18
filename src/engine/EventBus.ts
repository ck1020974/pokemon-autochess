
import { Unit } from '../models/Unit';

export type GameEventType =
    | 'TURN_START'
    | 'BATTLE_START'
    | 'BEFORE_ATTACK'
    | 'AFTER_ATTACK'
    | 'ON_HURT'
    | 'BEFORE_HURT'
    | 'AFTER_DEATH'
    | 'ON_FRIEND_SUMMONED'
    | 'ON_FRIEND_DEATH'
    | 'ON_SELL'
    | 'ON_MOVE'
    | 'SHOP_TURN_END';

export interface GameEvent {
    type: GameEventType;
    source?: Unit;
    target?: Unit;
    value?: number; // Damage amount or heal amount
    context: any; // Battle state or Shop state
}


export type EventHandler = (event: GameEvent) => void | Promise<void>;

export class EventBus {
    private listeners: Map<GameEventType, EventHandler[]> = new Map();

    public on(type: GameEventType, handler: EventHandler) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type)?.push(handler);
    }

    public async emit(event: GameEvent) {
        const handlers = this.listeners.get(event.type);
        if (handlers) {
            for (const h of handlers) {
                await h(event);
            }
        }
    }

    public clear() {
        this.listeners.clear();
    }
}
