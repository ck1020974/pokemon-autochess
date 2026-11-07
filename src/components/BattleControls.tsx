interface BattleControlsProps {
    isPaused: boolean;
    speed: number;
    onTogglePause: () => void;
    onToggleSpeed: () => void;
    isMuted?: boolean;
    onToggleMute?: () => void;
}

export function BattleControls({ isPaused, speed, onTogglePause, onToggleSpeed, isMuted, onToggleMute }: BattleControlsProps) {
    const nextSpeed = speed === 3 ? 1 : speed + 1;

    return (
        <div className="battle-controls-row" role="group" aria-label="戰鬥播放控制">
            <button
                type="button"
                className={`battle-control-btn battle-pause-btn${isPaused ? ' is-paused' : ''}`}
                onClick={onTogglePause}
                aria-label={isPaused ? '繼續戰鬥' : '暫停戰鬥'}
                aria-pressed={isPaused}
                title={isPaused ? '繼續戰鬥' : '暫停戰鬥'}
            >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    {isPaused
                        ? <path d="M8 5.5a1 1 0 0 1 1.5-.86l10 6.5a1 1 0 0 1 0 1.72l-10 6.5A1 1 0 0 1 8 18.5Z" fill="currentColor" />
                        : <><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" /></>}
                </svg>
            </button>
            <button
                type="button"
                className={`battle-control-btn battle-speed-btn${speed > 1 ? ' active' : ''}`}
                onClick={onToggleSpeed}
                aria-label={`目前 ${speed} 倍速，切換為 ${nextSpeed} 倍速`}
                title={`切換為 ${nextSpeed} 倍速`}
            >
                <span>{speed}×</span>
            </button>
            {onToggleMute && (
                <button
                    type="button"
                    className="battle-control-btn battle-sound-btn"
                    onClick={onToggleMute}
                    aria-label={isMuted ? '開啟聲音' : '靜音'}
                    title={isMuted ? '開啟聲音' : '靜音'}
                >
                    <span aria-hidden="true">{isMuted ? '🔇' : '🔊'}</span>
                </button>
            )}
        </div>
    );
}
