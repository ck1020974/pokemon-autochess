import './TutorialCoach.css';

interface TutorialCoachProps {
    step: number;
    unitName: string;
    shake: boolean;
    onContinue: () => void;
}

// Quiet guidance occupies the unused opponent side; the highlighted action stays primary.
export function TutorialCoach({step, unitName, shake, onContinue}: TutorialCoachProps) {
    const copy: Record<number, [string, string]> = {
        1: ['一起開始冒險', '跟著提示操作，認識你的第一支隊伍。'],
        2: ['組成你的第一支隊伍', '每回合獲得 10 金幣。先購買三隻寶可夢。'],
        3: ['認識寶可夢的招式', `點選${unitName}，閱讀招式後關閉面板。`],
        4: ['調整出場順序', `將${unitName}移到其他夥伴的後方。`],
        5: ['看看新的夥伴', '花費 1 金幣，點選刷新商店。'],
        6: ['把想要的夥伴留下來', '鎖定商店裡的兩隻小火龍，保留到下回合。'],
        7: ['準備好就出發', '點選戰鬥，再選擇你要挑戰的訓練家。'],
        8: ['讓夥伴進化', '購買小火龍，點選或拖曳來合成。'],
        9: ['試著搭配羈絆', '購買火球鼠，開啟熱風羈絆。'],
        10: ['挑戰更強的訓練家', '點選戰鬥，看看這支隊伍的表現。'],
        11: ['每一次失敗都是經驗', '戰敗會損失生命；生命歸零時，這趟冒險就會結束。'],
    };
    const [title, task] = copy[step] ?? ['', ''];
    return (
        <aside className={`tutorial-coach${shake ? ' shake-anim' : ''}`} aria-label="新手引導" aria-live="polite" data-step={step}>
            <div className="tutorial-coach-progress"><span>新手引導</span><span>{step} / 11</span></div>
            <strong className="tutorial-coach-title">{title}</strong>
            <p className="tutorial-coach-task">{task}</p>
            {(step === 1 || step === 11) && <button type="button" onClick={onContinue}>繼續 →</button>}
        </aside>
    );
}
