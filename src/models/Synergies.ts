
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
    'Starter': { id: 'Starter', name: '御三家', icon: '🌟', description: '[3] 戰鬥開始時 +1 攻擊 與 生命', tiers: [3], color: '#fbbf24' },
    'Grass': { id: 'Grass', name: '吸取', icon: '🌿', description: '[2/3/4] 攻擊後回復 2/3/4 生命', tiers: [2, 3, 4], color: '#4ade80' },
    'Water': { id: 'Water', name: '潮汐', icon: '💧', description: '[2/3/4] 攻擊前獲得 +1/+2/+4 生命', tiers: [2, 3, 4], color: '#60a5fa' },
    'Fire': { id: 'Fire', name: '燃燒', icon: '🔥', description: '[2/3/4] 攻擊前獲得 +1/+2/+4 攻擊', tiers: [2, 3, 4], color: '#ef4444' },
    'Normal': { id: 'Normal', name: '祝福', icon: '⚪', description: '[2/3/4] 準備結束時，最前方友軍永久 +1/+3/+5 生命', tiers: [2, 3, 4], color: '#d1d5db' },
    'Ghost': { id: 'Ghost', name: '暗影', icon: '👻', description: '[2/3/4] 準備結束時，最前方友軍永久 +1/+3/+5 攻擊', tiers: [2, 3, 4], color: '#a855f7' },

    // --- Traits ---
    'Triplets': { id: 'Triplets', name: '三胞胎', icon: '👨‍👧‍👦', description: '[3] 戰鬥開始時，所有三胞胎獲得 +3/+3', tiers: [3], color: '#fcd34d' },
    'Angry': { id: 'Angry', name: '憤怒', icon: '💢', description: '[2] 受傷後獲得 +2 攻擊', tiers: [2], color: '#dc2626' },
    'Slow': { id: 'Slow', name: '遲鈍', icon: '🌀', description: '[2] 所受到的傷害減少33% (最低1)', tiers: [2], color: '#f87171' },
    'Hard': { id: 'Hard', name: '堅硬', icon: '🛡️', description: '[2] 抵擋死亡，保留 1 生命 (每場戰鬥 1 次)', tiers: [2], color: '#9ca3af' },
    'Cave': { id: 'Cave', name: '洞穴', icon: '🕳️', description: '[2] 攻擊後，移動至最後方', tiers: [2], color: '#78350f' },
    'Snow': { id: 'Snow', name: '降雪', icon: '❄️', description: '[2] 戰鬥開始時，全體其他角色受到 5 傷害', tiers: [2], color: '#bae6fd' },
    'Claw': { id: 'Claw', name: '尖爪', icon: '🐯', description: '[2] 體質提升時，額外獲得 +2 攻擊', tiers: [2], color: '#fca5a5' },
    'Beetle': { id: 'Beetle', name: '甲蟲', icon: '🪲', description: '[2] 準備結束時，全體甲蟲永久 +2/+2', tiers: [2], color: '#b5e48c' },

    // Legacy mapping if needed
    'Spirit': { id: 'Spirit', name: '暗影', icon: '👻', description: '[2] 準備結束時，最前方暗影永久 +1 攻擊', tiers: [2], color: '#a855f7' },
    'Plant': { id: 'Plant', name: '吸取', icon: '🌿', description: '[2/3/4] 攻擊後回復 2/3/4 生命', tiers: [2, 3, 4], color: '#4ade80' },
};

export function getSynergyCount(team: any[], synergyId: string): number {
    return team.filter(u => u && u.synergies.includes(synergyId)).length;
}
