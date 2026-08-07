
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
    | 'ON_ATTACK'
    | 'SHOP_TURN_END';

export interface GameEvent {
    type: GameEventType;
    source?: Unit;
    target?: Unit;
    value?: number; // Damage amount or heal amount
    context: GameEventContext; // Battle state or Shop state
}

export interface GameEventContext {
    simulator?: object;
    source?: Unit | null;
    amount?: number;
    isSkillDamage?: boolean;
    isPassiveMove?: boolean;
    killer?: Unit;
    deathIdx?: number;
    fuecocoAnimTriggered?: boolean;
    quaxlyAnimTriggered?: boolean;
    sprigatitoAnimTriggered?: boolean;
}

export interface BattleUnitState {
    [key: string]: boolean | number | Unit | undefined;
    hpSwapped?: boolean;
    isSilenced?: boolean;
    isGastroAcid?: boolean;
    isAbsoluteKill?: boolean;
    isLethalStrike?: boolean;
    lethalStrikeUsed?: boolean;
    isAttackSkipped?: boolean;
    isExtraAttack?: boolean;
    isCharmed?: boolean;
    swallowedUnit?: Unit;
    infiltratorBonus?: number;
    lastGlobalGlowTime?: number;
    caveTriggers?: number;
    dragonDanceTriggers?: number;
    swordDanceTriggers?: number;
    roostTriggers?: number;
    mimikyuGuardsUsed?: number;
    slowpokeHealUsed?: boolean;
    thickFatUsed?: boolean;
    infiltratorUsed?: boolean;
    hardUsed?: boolean;
    heracrossEnraged?: boolean;
    heracrossTriggered?: boolean;
    farfetchdUsed?: boolean;
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
