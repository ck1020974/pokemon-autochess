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
    return kind === 'regular' ? 2400 : 2800;
};

const arenas = ['stadium', 'stadium-coral', 'stadium-mint', 'stadium-lilac', 'stadium-gold'] as const;
const halls = ['champion-hall', 'champion-hall-lilac', 'champion-hall-gold'] as const;
const regularScenes = ['route', 'garden', 'harbor', 'grassland', 'desert', 'beach'];

interface SceneTheme {
    synergies: readonly string[];
    scenes: readonly string[];
}

// Existing game synergy IDs select scenery without affecting combat rules.
const sceneThemes: readonly SceneTheme[] = [
    { synergies: ['Fire'], scenes: ['volcanic'] },
    { synergies: ['Water'], scenes: ['waterfall', 'harbor', 'beach', 'ocean'] },
    { synergies: ['Grass', 'BugBite'], scenes: ['garden', 'grassland'] },
    { synergies: ['Snow'], scenes: ['cavern'] },
    { synergies: ['Cave'], scenes: ['desert', 'route'] },
    { synergies: ['Psychic', 'Ghost'], scenes: ['library'] },
];

interface BattleSceneOptions {
    opponentName?: string;
    teamSynergies?: readonly (readonly string[])[];
    random?: () => number;
}

const getScenePool = (kind: BattlePresentationKind, team: readonly (readonly string[])[], opponentName: string): readonly string[] => {
    if (kind === 'champion') return halls;
    if (kind === 'elite' || opponentName === '小智') return arenas;
    let bestScore = 0;
    let bestTheme: SceneTheme | undefined;
    for (const theme of sceneThemes) {
        const score = team.filter(unit => theme.synergies.some(id => unit.includes(id))).length;
        if (score > bestScore) {
            bestScore = score;
            bestTheme = theme;
        }
    }
    // A theme must cover at least half the core; other mixed teams use the general pool.
    return bestTheme && bestScore >= Math.ceil(team.length / 2) ? bestTheme.scenes : regularScenes;
};

export const getBattleSceneClass = (
    kind: BattlePresentationKind,
    _opponentId: string,
    recentSceneClasses: readonly string[] = [],
    { teamSynergies = [], opponentName = '', random = Math.random }: BattleSceneOptions = {},
): string => {
    const pool = getScenePool(kind, teamSynergies, opponentName);
    const fresh = pool.filter(id => !recentSceneClasses.includes(`battle-scene--${id}`));
    const previous = recentSceneClasses[recentSceneClasses.length - 1];
    const notPrevious = pool.filter(id => `battle-scene--${id}` !== previous);
    const choices = fresh.length ? fresh : notPrevious.length ? notPrevious : pool;
    const index = Math.min(choices.length - 1, Math.max(0, Math.floor(random() * choices.length)));
    return `battle-scene--${choices[index]}`;
};

export const getBattleSceneDescriptor = (
    kind: BattlePresentationKind,
    opponentId: string,
    options: BattleSceneOptions = {},
): { scene: string; landmark: string } => {
    const scene = getBattleSceneClass(kind, opponentId, [], options).replace('battle-scene--', '');
    return { scene, landmark: scene };
};
