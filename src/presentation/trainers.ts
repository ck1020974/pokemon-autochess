export interface PlayerTrainer {
    id: string;
    name: string;
    imageUrl: string;
    description: string;
}

export const PLAYER_TRAINERS: PlayerTrainer[] = [
    { id: 'green', name: '小青', imageUrl: 'gym/小青.webp', description: '沉著敏銳的對戰家' },
    { id: 'chun', name: '小春', imageUrl: 'gym/小春.webp', description: '溫柔堅定的旅人' },
    { id: 'brendan', name: '小悠', imageUrl: 'gym/小悠01.webp', description: '熱情爽朗的冒險家' },
    { id: 'ash', name: '小智', imageUrl: 'gym/小智.webp', description: '永不放棄的夢想家' },
    { id: 'may', name: '小遙', imageUrl: 'gym/小遙01.webp', description: '勇於探索的新手訓練家' },
    { id: 'kris', name: '克麗絲', imageUrl: 'gym/克麗絲01.webp', description: '冷靜俐落的戰術家' },
    { id: 'ethan', name: '阿響', imageUrl: 'gym/阿響01.webp', description: '充滿活力的挑戰者' },
    { id: 'lyra', name: '琴音', imageUrl: 'gym/琴音01.webp', description: '細心可靠的培育家' },
    { id: 'leaf', name: '葉子', imageUrl: 'gym/葉子01.webp', description: '靈活果敢的訓練家' },
    { id: 'red', name: '赤紅', imageUrl: 'champion/赤紅01.webp', description: '追求巔峰的冠軍' },
];
