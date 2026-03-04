
export interface SynergyConfig {
    id: string;
    name: string;
    icon: string;
    description: string;
    tiers: number[]; // Numbers required for activation
    color: string;
}

export const SYNERGIES: Record<string, SynergyConfig> = {
    // --- Attributes ---
    'Starter': { id: 'Starter', name: '御三家', icon: '🌟', description: '[3] 準備結束時，永久 +1 攻擊與生命', tiers: [3], color: '#fbbf24' },
    'Normal': { id: 'Normal', name: '守住', icon: '⚪', description: '[2/3/4] 準備結束時，最前方友軍永久 +1/+3/+6 生命', tiers: [2, 3, 4], color: '#d1d5db' },
    'Ghost': { id: 'Ghost', name: '詛咒', icon: '👻', description: '[2/3/4] 準備結束時，最前方友軍永久 +1/+3/+6 攻擊', tiers: [2, 3, 4], color: '#a855f7' },
    'Grass': { id: 'Grass', name: '吸取', icon: '🌿', description: '[2/3/4] 攻擊後回復 1/3/5 生命', tiers: [2, 3, 4], color: '#4ade80' },
    'Fire': { id: 'Fire', name: '燃盡', icon: '🔥', description: '[2/3/4] 攻擊前 +1/+3/+5 攻擊', tiers: [2, 3, 4], color: '#ef4444' },
    'Water': { id: 'Water', name: '潮旋', icon: '💧', description: '[2/3/4] 攻擊前使目標 -1/-3/-5 攻擊力 (最低為 1)', tiers: [2, 3, 4], color: '#60a5fa' },
    'Triplets': { id: 'Triplets', name: '三胞胎', icon: '👨‍👧‍👦', description: '[3] 準備結束時，最弱的三胞胎永久 +3 攻擊與生命', tiers: [3], color: '#fcd34d' },
    'Hard': { id: 'Hard', name: '堅硬', icon: '🛡️', description: '[2] 抵擋首次死亡，保留 1 生命', tiers: [2], color: '#9ca3af' },
    'Cave': { id: 'Cave', name: '挖洞', icon: '🕳️', description: '[2] 移動後永久 +2 生命', tiers: [2], color: '#78350f' },
    'Angry': { id: 'Angry', name: '憤怒', icon: '💢', description: '[2/3] 受傷後 +3/+5 攻擊', tiers: [2, 3], color: '#dc2626' },
    'Snow': { id: 'Snow', name: '降雪', icon: '❄️', description: '[2] 戰鬥開始時，其他角色受到生命 33% 傷害', tiers: [2], color: '#bae6fd' },
    'SwordDance': { id: 'SwordDance', name: '劍舞', icon: '⚔️', description: '[2/3] 移動後永久 +2/3 攻擊', tiers: [2, 3], color: '#fca5a5' },
    'Psychic': { id: 'Psychic', name: '念力', icon: '🪄', description: '[2/3/4] 兩回合後，對全體敵方造成傷害 (共1/3/5次)', tiers: [2, 3, 4], color: '#a855f7' },
};

export function getSynergyCount(team: any[], synergyId: string): number {
    return team.filter(u => u && u.synergies.includes(synergyId)).length;
}
