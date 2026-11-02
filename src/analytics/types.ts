export interface TeamUnitSnapshot {
    templateId: string;
    name: string;
    level: number;
    attack: number;
    hp: number;
    maxHp: number;
    synergies: string[];
}
export type TeamSnapshot = (TeamUnitSnapshot | null)[];
export interface DashboardFilters {
    from: string;
    to: string;
    edition: string;
    difficulty: string;
    version: string;
}
export interface DashboardSummary {
    visits: number;
    players: number;
    runs: number;
    completedRuns: number;
    victories: number;
    defeats: number;
    abandonedRuns: number;
    inProgressRuns: number;
    battles: number;
    battleWins: number;
    battleDraws: number;
    battleLosses: number;
    winRate: number | null;
    completionRate: number | null;
    clearRate: number | null;
    avgWins: number | null;
}
export interface DashboardData {
    summary: DashboardSummary;
    daily: { date: string; visits: number; players: number; runs: number; battles: number }[];
    modes: { edition: string; difficulty: string; runs: number; completedRuns: number; victories: number; battles: number; winRate: number | null }[];
    synergies: { id: string; battles: number; wins: number; winRate: number | null }[];
    recentRuns: { runId: string; edition: string; difficulty: string; version: string; startedAt: string; status: 'victory' | 'defeat' | 'abandoned' | 'in_progress'; wins: number; losses: number; draws: number; team: TeamSnapshot }[];
    versions: string[];
    generatedAt: string;
}
