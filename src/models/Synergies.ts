
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
    'Starter': { id: 'Starter', name: '御三家', icon: '🌟', description: '[3/5] 準備結束時，永久 +1/2 攻擊或生命', tiers: [3, 5], color: '#fbbf24' },
    'Normal': { id: 'Normal', name: '守住', icon: '⚪', description: '[2/3/5] 準備結束時，最前方友軍永久 +2/4/10 生命', tiers: [2, 3, 5], color: '#d1d5db' },
    'Ghost': { id: 'Ghost', name: '詛咒', icon: '👻', description: '[2/3/5] 準備結束時，最前方友軍永久 +2/4/10 攻擊', tiers: [2, 3, 5], color: '#a855f7' },
    'Grass': { id: 'Grass', name: '吸取', icon: '🌿', description: '[2/3/5] 攻擊後回復 2/5/12 生命 (同對象限1次)', tiers: [2, 3, 5], color: '#4ade80' },
    'Fire': { id: 'Fire', name: '燃盡', icon: '🔥', description: '[2/3/5] 攻擊前 -1 生命(最低為 1)， +2/4/10 攻擊', tiers: [2, 3, 5], color: '#ef4444' },
    'Water': { id: 'Water', name: '潮旋', icon: '💧', description: '[2/3/5] 攻擊前使目標 -1/3/10 攻擊 (同對象限1次)', tiers: [2, 3, 5], color: '#60a5fa' },
    'Triplets': { id: 'Triplets', name: '三胞胎', icon: '👨‍👧‍👦', description: '[3] 死亡後永久 +3 攻擊或生命', tiers: [3], color: '#fcd34d' },
    'Hard': { id: 'Hard', name: '堅硬', icon: '🛡️', description: '[2] 抵擋首次死亡，保留 1 生命', tiers: [2], color: '#9ca3af' },
    'Cave': { id: 'Cave', name: '挖洞', icon: '🕳️', description: '[2] 移動後永久 +1 攻擊或生命 (每場戰鬥限3次)', tiers: [2], color: '#78350f' },
    'Angry': { id: 'Angry', name: '憤怒', icon: '💢', description: '[2/4] 受傷後，全體友軍 +2/10 攻擊', tiers: [2, 4], color: '#dc2626' },
    'Snow': { id: 'Snow', name: '降雪', icon: '❄️', description: '[2] 戰鬥開始時，其他角色受到生命 33% 傷害', tiers: [2], color: '#bae6fd' },
    'SwordDance': { id: 'SwordDance', name: '劍舞', icon: '⚔️', description: '[2] 移動後永久 +2 攻擊 (每場戰鬥限3次)', tiers: [2], color: '#fca5a5' },
    'Roost': { id: 'Roost', name: '羽棲', icon: '🪽', description: '[2] 移動後永久 +2 生命 (每場戰鬥限3次)', tiers: [2], color: '#bae6fd' },
    'Psychic': {
        id: 'Psychic',
        name: '念力',
        icon: '🔮',
        color: '#a855f7',
        description: '[2/3/5] 兩回合後，對隨機 2 位敵方造成 2 傷害 (每場戰鬥後增強)',
        tiers: [2, 3, 5]
    },
    'Trick': { id: 'Trick', name: '戲法', icon: '🪄', description: '[2] 戰鬥開始時，和隨機敵方對調生命', tiers: [2], color: '#a855f7' },
    'BugBite': { id: 'BugBite', name: '蟲咬', icon: '🪲', description: '[2] 擊殺敵方後，永久 +1 生命', tiers: [2], color: '#4ade80' },
    'Charge': { id: 'Charge', name: '充電', icon: '⚡', description: '[2/3/5] 戰鬥開始時，隨機增加 0~15 攻擊', tiers: [2, 3, 5], color: '#fde047' },
    'Thief': { id: 'Thief', name: '小偷', icon: '👤', description: '[2/5] 戰鬥開始時，從最強的敵方偷取 2/5 點攻擊', tiers: [2, 5], color: '#64748b' },
    'Charm': { id: 'Charm', name: '撒嬌', icon: '💖', description: '[2/3/5] 戰鬥開始時，首位敵方攻擊降低 33/50/99% (最低為 1)', tiers: [2, 3, 5], color: '#f472b6' },
    'BatonPass': { id: 'BatonPass', name: '接棒', icon: '🏃', description: '[2/5] 死亡後，隨機 1 位角色繼承攻擊與生命', tiers: [2, 5], color: '#fb923c' },
    'Outrage': { id: 'Outrage', name: '逆鱗', icon: '🐲', description: '[2] 可能額外再攻擊 1 個敵方或是無法攻擊。', tiers: [2, 3], color: '#f59e0b' },
};

export function getSynergyCount(team: any[], synergyId: string): number {
    return team.filter(u => u && u.synergies.includes(synergyId)).length;
}
