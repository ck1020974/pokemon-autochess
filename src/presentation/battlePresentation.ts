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

interface BattleSceneDescriptor {
    scene: string;
    landmark: string;
}

const sceneVariants: Record<BattlePresentationKind, readonly BattleSceneDescriptor[]> = {
    regular: [
        { scene: 'route', landmark: 'wooden-fence' },
        { scene: 'garden', landmark: 'glasshouse' },
        { scene: 'harbor', landmark: 'pier' },
        { scene: 'stadium', landmark: 'scoreboard' },
    ],
    elite: [
        { scene: 'cavern', landmark: 'crystal-arch' },
        { scene: 'library', landmark: 'book-towers' },
        { scene: 'waterfall', landmark: 'cascade' },
        { scene: 'volcanic', landmark: 'lava-ridge' },
    ],
    champion: [{ scene: 'champion-hall', landmark: 'league-columns' }],
};

const stableIndex = (value: string, length: number) => {
    const sum = [...value].reduce((total, char) => total + char.charCodeAt(0), 0);
    return sum % length;
};

export const getBattleSceneClass = (kind: BattlePresentationKind, opponentId: string): string => {
    return `battle-scene--${getBattleSceneDescriptor(kind, opponentId).scene}`;
};

export const getBattleSceneDescriptor = (kind: BattlePresentationKind, opponentId: string): BattleSceneDescriptor => {
    const variants = sceneVariants[kind];
    return variants[stableIndex(opponentId, variants.length)];
};
