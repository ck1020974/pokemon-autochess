
import { Unit } from './Unit';
// Removed unused UnitTemplate import
import { ALL_UNITS } from '../data/AllUnits';

export class Shop {
    public slots: (Unit | null)[] = [];
    public frozen: boolean[] = [];

    constructor() {
        this.slots = [null, null, null, null];
        this.frozen = [false, false, false, false];
    }

    public getTier(turn: number): number {
        if (turn <= 2) return 1;
        if (turn <= 5) return 2;
        if (turn <= 9) return 3; // Delayed turn 8 to turn 9
        return 4; // Turn 10+
    }

    public roll(turn: number) {
        const tier = this.getTier(turn);

        // Dynamic Slot Count
        let numSlots = 4;
        if (tier === 2) numSlots = 5;
        else if (tier === 3) numSlots = 6;
        else if (tier === 4) numSlots = 7;

        // Resize
        while (this.slots.length < numSlots) this.slots.push(null);
        while (this.frozen.length < numSlots) this.frozen.push(false);

        // Probability Table (T1, T2, T3, T4, T5)
        const PROBS: Record<number, number[]> = {
            1: [80, 20, 0, 0, 0],       // Turn 1-2
            2: [60, 30, 10, 0, 0],      // Turn 3-5
            3: [35, 35, 20, 10, 0],     // Turn 6-9
            4: [17.5, 25, 30, 20, 7.5]  // Turn 10+
        };

        const currentProbs = PROBS[tier];

        for (let i = 0; i < numSlots; i++) {
            if (!this.frozen[i]) {
                const roll = Math.random() * 100;
                let targetTier = 1;
                let cumulative = 0;

                for (let t = 0; t < 5; t++) {
                    cumulative += currentProbs[t];
                    if (roll < cumulative) {
                        targetTier = t + 1;
                        break;
                    }
                }

                const tierTemplates = Object.values(ALL_UNITS).filter(u => u.tier === targetTier && !u.isHiddenFromShop);

                if (tierTemplates.length > 0) {
                    const randomTemp = tierTemplates[Math.floor(Math.random() * tierTemplates.length)];
                    this.slots[i] = new Unit(randomTemp);
                } else {
                    // Fallback if no unit of target tier exists (Shouldn't happen with proper DB)
                    this.slots[i] = null;
                }
            }
        }
    }

    public toggleFreeze(index: number) {
        if (index >= 0 && index < this.slots.length) {
            this.frozen[index] = !this.frozen[index];
        }
    }

    public buy(index: number): Unit | null {
        if (index >= 0 && index < this.slots.length && this.slots[index]) {
            const unit = this.slots[index];
            this.slots[index] = null;
            this.frozen[index] = false;
            return unit;
        }
        return null;
    }
}
