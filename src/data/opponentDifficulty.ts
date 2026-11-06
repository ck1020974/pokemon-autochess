import ratings from './opponentDifficultyLookup.json';
import type {OpponentStage} from '../engine/opponentSelection';

const lookup: Readonly<Record<string, string>> = ratings;

// Ratings compare real battles against the same reference rosters in each mode.
// Unknown/custom opponents keep their authored difficulty.
export function rateOpponent<T extends {id: string; difficulty?: string}>(
    opponent: T, editionId: string, stage: OpponentStage, gameDifficulty: string,
): T {
    const difficulty = lookup[`${editionId}/${stage}/${gameDifficulty}/${opponent.id}`];
    return difficulty ? {...opponent, difficulty} : opponent;
}
