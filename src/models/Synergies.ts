
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
    'Starter': { id: 'Starter', name: '御三家', icon: '🌟', description: '[3] 戰鬥開始時，永久 +1 攻擊與生命', tiers: [3], color: '#fbbf24' },
    'Grass': { id: 'Grass', name: '吸取', icon: '🌿', description: '[2/3/4] 攻擊後回復 2/4/6 生命', tiers: [2, 3, 4], color: '#4ade80' },
    'Water': { id: 'Water', name: '漩渦', icon: '💧', description: '[2/3/4] 攻擊前使目標 -1/-3/-5 攻擊力 (最低為 1)', tiers: [2, 3, 4], color: '#60a5fa' },
    'Fire': { id: 'Fire', name: '燃燒', icon: '🔥', description: '[2/3/4] 攻擊前 +1/+3/+5 攻擊', tiers: [2, 3, 4], color: '#ef4444' },
    'Normal': { id: 'Normal', name: '祝福', icon: '⚪', description: '[2/3/4] 準備結束時，最前方友軍永久 +1/+3/+6 生命', tiers: [2, 3, 4], color: '#d1d5db' },
    'Ghost': { id: 'Ghost', name: '暗影', icon: '👻', description: '[2/3/4] 準備結束時，最前方友軍永久 +1/+3/+6 攻擊', tiers: [2, 3, 4], color: '#a855f7' },
    'Snow': { id: 'Snow', name: '降雪', icon: '❄️', description: '[2] 戰鬥開始時，其他角色受到生命 33% 傷害', tiers: [2], color: '#bae6fd' },

    // --- Traits ---
    'Triplets': { id: 'Triplets', name: '三胞胎', icon: '👨‍👧‍👦', description: '[3] 戰鬥開始時， +3 攻擊與生命', tiers: [3], color: '#fcd34d' },
    'Angry': { id: 'Angry', name: '憤怒', icon: '💢', description: '[2] 受傷後 +3 攻擊', tiers: [2], color: '#dc2626' },
    'Slow': { id: 'Slow', name: '遲鈍', icon: '🌀', description: '[2] 受到的傷害減少33% (最低為 1)', tiers: [2], color: '#f87171' },
    'Hard': { id: 'Hard', name: '堅硬', icon: '🛡️', description: '[2] 抵擋首次死亡，保留 1 生命', tiers: [2], color: '#9ca3af' },
    'Cave': { id: 'Cave', name: '洞穴', icon: '🕳️', description: '[2] 攻擊後，移動至隊伍最後方', tiers: [2], color: '#78350f' },

    'Claw': { id: 'Claw', name: '磨爪', icon: '🐯', description: '[2] 擊殺敵方後，永久 +2 攻擊', tiers: [2], color: '#fca5a5' },
    'Beetle': { id: 'Beetle', name: '甲蟲', icon: '🪲', description: '[2] 準備結束時，永久 +5 攻擊或生命', tiers: [2], color: '#b5e48c' },
    'Psychic': { id: 'Psychic', name: '念力', icon: '🪄', description: '[2] 兩回合後，對全體敵方造成傷害', tiers: [2], color: '#a855f7' },

};

export function getSynergyCount(team: any[], synergyId: string): number {
    return team.filter(u => u && u.synergies.includes(synergyId)).length;
}
