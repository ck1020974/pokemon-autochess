export type BattlePresentationKind = 'regular' | 'elite' | 'champion';

export const getPresentationKind = (wins: number): BattlePresentationKind => {
    if (wins >= 12) return 'champion';
    if (wins >= 8) return 'elite';
    return 'regular';
};

export const getBattleIntroDuration = (
    kind: BattlePresentationKind,
    quick: boolean,
    reducedMotion: boolean,
): number => {
    if (reducedMotion) return 0;
    if (quick) return 600;
    return kind === 'regular' ? 1400 : 2000;
};

const sceneVariants: Record<BattlePresentationKind, readonly string[]> = {
    regular: ['route', 'garden', 'harbor', 'stadium'],
    elite: ['cavern', 'library', 'waterfall', 'volcanic'],
    champion: ['champion-hall'],
};

const stableIndex = (value: string, length: number) => {
    const sum = [...value].reduce((total, char) => total + char.charCodeAt(0), 0);
    return sum % length;
};

export const getBattleSceneClass = (kind: BattlePresentationKind, opponentId: string): string => {
    const variants = sceneVariants[kind];
    return `battle-scene--${variants[stableIndex(opponentId, variants.length)]}`;
};
