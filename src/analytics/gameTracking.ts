import type { GameLoop } from '../engine/GameLoop';

export function terminalOutcome(game: Pick<GameLoop, 'edition' | 'wins' | 'lives' | 'currentOpponentId' | 'defeatedOpponentIds'>, result: 'WIN' | 'LOSS' | 'DRAW'): 'victory' | 'defeat' | undefined {
    if (result === 'LOSS') return game.lives <= 1 ? 'defeat' : undefined;
    if (result !== 'WIN') return undefined;
    if (game.edition.id !== 'infinite') return game.wins + 1 >= 13 ? 'victory' : undefined;
    const champions = game.edition.championOpponents;
    if (!champions.length) return undefined;
    const defeated = new Set([...game.defeatedOpponentIds, game.currentOpponentId].filter(Boolean));
    return champions.every(champion => defeated.has(champion.id)) ? 'victory' : undefined;
}
