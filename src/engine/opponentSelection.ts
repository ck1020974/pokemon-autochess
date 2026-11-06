export type OpponentStage = 'novice' | 'intermediate' | 'advanced' | 'elite' | 'champion';

const difficultyOrder = ['EASY', 'NORMAL', 'HARD', 'VERY_HARD'];
const difficultyRank = (difficulty?: string) => {
    const rank = difficultyOrder.indexOf(difficulty ?? 'NORMAL');
    return rank < 0 ? 1 : rank;
};

export function getOpponentStage(wins: number): OpponentStage {
    if (wins >= 12) return 'champion';
    if (wins >= 8) return 'elite';
    if (wins >= 5) return 'advanced';
    if (wins >= 3) return 'intermediate';
    return 'novice';
}

function shuffle<T>(values: readonly T[], random: () => number): T[] {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index--) {
        const other = Math.floor(random() * (index + 1));
        [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
}

// Keep wins meaningful: difficulty variety never reintroduces a defeated trainer.
export function selectOpponentChoices<T extends {id: string; difficulty?: string}>(
    pool: readonly T[],
    defeatedIds: readonly string[],
    {count = 3, diversify = true, random = Math.random}: {count?: number; diversify?: boolean; random?: () => number} = {},
): T[] {
    const defeated = new Set(defeatedIds);
    const unique = new Map(pool.filter(opponent => !defeated.has(opponent.id)).map(opponent => [opponent.id, opponent]));
    const candidates = shuffle([...unique.values()], random);
    const limit = Math.max(0, Math.min(count, candidates.length));
    if (limit === 0) return [];
    const selected: T[] = [];
    if (diversify) {
        const tiers = new Set<number>();
        for (const opponent of candidates) {
            const tier = difficultyRank(opponent.difficulty);
            if (tiers.has(tier)) continue;
            selected.push(opponent);
            tiers.add(tier);
            if (selected.length === limit) break;
        }
    }
    for (const opponent of candidates) {
        if (selected.length >= limit) break;
        if (!selected.includes(opponent)) selected.push(opponent);
    }
    return selected.sort((left, right) => difficultyRank(left.difficulty) - difficultyRank(right.difficulty));
}
