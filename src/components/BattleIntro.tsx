import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { getBattleIntroDuration, getBattleSceneClass, type BattlePresentationKind } from '../presentation/battlePresentation';
import type { PlayerTrainer } from '../presentation/trainers';
import './BattleIntro.css';

export interface BattleIntroOpponent {
    id: string;
    name: string;
    url: string;
}

interface BattleIntroProps {
    playerTrainer: PlayerTrainer;
    opponent: BattleIntroOpponent;
    kind: BattlePresentationKind;
    quick: boolean;
    onComplete: () => void;
}

const useReducedMotion = () => {
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        const sync = () => setReducedMotion(query.matches);
        sync();
        query.addEventListener('change', sync);
        return () => query.removeEventListener('change', sync);
    }, []);

    return reducedMotion;
};

export function BattleIntro({ playerTrainer, opponent, kind, quick, onComplete }: BattleIntroProps) {
    const completed = useRef(false);
    const reducedMotion = useReducedMotion();
    const duration = getBattleIntroDuration(kind, quick, reducedMotion);

    const complete = useCallback(() => {
        if (completed.current) return;
        completed.current = true;
        onComplete();
    }, [onComplete]);

    useEffect(() => {
        const timer = window.setTimeout(complete, duration);
        return () => window.clearTimeout(timer);
    }, [complete, duration]);

    const sceneClass = getBattleSceneClass(kind, opponent.id);
    const style = { '--battle-intro-duration': `${duration}ms` } as CSSProperties;

    return (
        <div className="battle-intro-overlay" style={style}>
            <button className="battle-intro-activate" type="button" onClick={complete} aria-label="略過戰鬥演出">
                <div className={`battle-intro-scene ${sceneClass}`}>
                    <span className="battle-intro-sky" aria-hidden="true" />
                    <span className="battle-intro-horizon horizon-far" aria-hidden="true" />
                    <span className="battle-intro-horizon horizon-near" aria-hidden="true" />
                    <span className="battle-intro-ground" aria-hidden="true" />
                    <span className="battle-intro-mist" aria-hidden="true" />
                    <span className="battle-intro-vignette" aria-hidden="true" />

                    <div className="battle-intro-title">
                        <span>{kind === 'regular' ? '訓練家對戰' : kind === 'elite' ? '四天王挑戰' : '冠軍對決'}</span>
                        <strong>{kind === 'regular' ? '前往下一場對戰' : kind === 'elite' ? '聯盟試煉' : '冠軍殿堂'}</strong>
                    </div>

                    <div className="battle-intro-trainer battle-intro-player">
                        <img src={playerTrainer.imageUrl} alt={playerTrainer.name} />
                        <span>{playerTrainer.name}</span>
                    </div>
                    <div className="battle-intro-versus" aria-hidden="true">VS</div>
                    <div className="battle-intro-trainer battle-intro-opponent">
                        <img src={opponent.url} alt={opponent.name} />
                        <span>{opponent.name}</span>
                    </div>

                    <span className="battle-intro-skip">點一下略過</span>
                </div>
            </button>
        </div>
    );
}
