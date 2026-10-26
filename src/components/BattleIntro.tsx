import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { getBattleIntroDuration, type BattlePresentationKind } from '../presentation/battlePresentation';
import type { PlayerTrainer } from '../presentation/trainers';
import type { Unit } from '../models/Unit';
import './BattleIntro.css';

export interface BattleIntroOpponent {
    id: string;
    name: string;
    url: string;
}

interface BattleIntroProps {
    playerTrainer: PlayerTrainer;
    opponent: BattleIntroOpponent;
    playerTeam: readonly (Unit | null)[];
    enemyTeam: readonly (Unit | null)[];
    kind: BattlePresentationKind;
    sceneClass: string;
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

export function BattleIntro({ playerTrainer, opponent, playerTeam, enemyTeam, kind, sceneClass, quick, onComplete }: BattleIntroProps) {
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

    const style = { '--battle-intro-duration': `${duration}ms` } as CSSProperties;
    const lineup = (team: readonly (Unit | null)[], label: string) => (
        <div className="battle-intro-lineup" aria-label={label}>
            {Array.from({length: 5}, (_, index) => {
                const unit = team[index];
                return <div className="battle-intro-slot" key={index} style={{'--unit-order': index} as CSSProperties}>
                    {unit ? <>
                        <img src={unit.imageUrl.replace('01.webp', '00.webp')} alt={unit.name} data-template-id={unit.templateId} />
                        <small aria-label={`${unit.level}星`}>{'★'.repeat(Math.min(unit.level, 3))}</small>
                    </> : <span className="battle-intro-empty" aria-hidden="true" />}
                </div>;
            })}
        </div>
    );

    return (
        <div className="battle-intro-overlay" style={style}>
            <button className="battle-intro-activate" type="button" onClick={complete} aria-label="略過戰鬥演出">
                <div className={`battle-intro-scene ${sceneClass}`}>
                    <span className="battle-intro-vignette" aria-hidden="true" />
                    <span className="battle-intro-flash" aria-hidden="true" />

                    <div className="battle-intro-title">
                        <span>{kind === 'regular' ? '訓練家對戰' : kind === 'elite' ? '四天王挑戰' : '冠軍對決'}</span>
                    </div>

                    <div className="battle-intro-matchup">
                    <div className="battle-intro-trainer battle-intro-player">
                        <img src={playerTrainer.imageUrl} alt={playerTrainer.name} />
                        <span className="battle-intro-name"><small>我方訓練家</small><strong>{playerTrainer.name}</strong></span>
                        {lineup(playerTeam, '我方出戰隊伍')}
                    </div>
                    <span className="battle-intro-versus" aria-hidden="true">VS</span>
                    <div className="battle-intro-trainer battle-intro-opponent">
                        <img src={opponent.url} alt={opponent.name} />
                        <span className="battle-intro-name"><small>對手訓練家</small><strong>{opponent.name}</strong></span>
                        {lineup(enemyTeam, '敵方出戰隊伍')}
                    </div>
                    </div>

                    <span className="battle-intro-skip">點一下略過</span>
                </div>
            </button>
        </div>
    );
}
