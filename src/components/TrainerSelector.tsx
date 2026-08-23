import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, WheelEvent } from 'react';
import type { PlayerTrainer } from '../presentation/trainers';
import './TrainerSelector.css';

interface TrainerSelectorProps {
    trainers: readonly PlayerTrainer[];
    onSelect: (trainer: PlayerTrainer) => void;
}

const getDistance = (index: number, activeIndex: number, length: number) => {
    const offset = (index - activeIndex + length) % length;
    return offset > length / 2 ? offset - length : offset;
};

export function TrainerSelector({ trainers, onSelect }: TrainerSelectorProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const pointerStart = useRef<number | null>(null);
    const hoverDelayRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
    const hoverRepeatRef = useRef<ReturnType<typeof window.setInterval> | null>(null);
    const move = (direction: -1 | 1) => setActiveIndex((index) => (index + direction + trainers.length) % trainers.length);

    const stopHoverMove = () => {
        if (hoverDelayRef.current !== null) window.clearTimeout(hoverDelayRef.current);
        if (hoverRepeatRef.current !== null) window.clearInterval(hoverRepeatRef.current);
        hoverDelayRef.current = null;
        hoverRepeatRef.current = null;
    };

    const startHoverMove = (direction: -1 | 1) => {
        if (window.matchMedia('(pointer: coarse)').matches) return;
        stopHoverMove();
        hoverDelayRef.current = window.setTimeout(() => {
            hoverDelayRef.current = null;
            move(direction);
            hoverRepeatRef.current = window.setInterval(() => move(direction), 420) as unknown as ReturnType<typeof window.setInterval>;
        }, 180) as unknown as ReturnType<typeof window.setTimeout>;
    };

    useEffect(() => stopHoverMove, []);

    const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            move(-1);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            move(1);
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(trainers[activeIndex]);
        }
    };

    const onWheel = (event: WheelEvent<HTMLElement>) => {
        if (Math.abs(event.deltaY) < 8) return;
        event.preventDefault();
        move(event.deltaY > 0 ? 1 : -1);
    };

    const onPointerDown = (event: PointerEvent<HTMLElement>) => {
        stopHoverMove();
        pointerStart.current = event.clientX;
    };

    const onPointerUp = (event: PointerEvent<HTMLElement>) => {
        if (pointerStart.current === null) return;
        const delta = event.clientX - pointerStart.current;
        pointerStart.current = null;
        if (Math.abs(delta) >= 35) move(delta > 0 ? -1 : 1);
    };

    const onPointerMove = (event: PointerEvent<HTMLElement>) => {
        if (event.pointerType !== 'mouse') return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const pointerX = event.clientX - bounds.left;
        const sideZoneWidth = Math.min(150, Math.max(56, window.innerWidth * 0.1));
        if (pointerX > sideZoneWidth && pointerX < bounds.width - sideZoneWidth) stopHoverMove();
    };

    return (
        <section className="trainer-selector-overlay" aria-label="選擇訓練家" role="dialog" aria-modal="true" onKeyDown={onKeyDown}>
            <div className="trainer-selector-atmosphere" aria-hidden="true">
                <span className="trainer-selector-cloud cloud-one" />
                <span className="trainer-selector-cloud cloud-two" />
                <span className="trainer-selector-hill hill-one" />
                <span className="trainer-selector-hill hill-two" />
            </div>
            <header className="trainer-selector-heading">
                <h2>請選擇你的角色</h2>
            </header>
            <div className="trainer-selector-carousel" onWheel={onWheel} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerMove={onPointerMove}>
                <div
                    className="trainer-selector-hover-zone trainer-selector-hover-zone--left"
                    aria-hidden="true"
                    onPointerEnter={(event) => {
                        if (event.pointerType === 'mouse') startHoverMove(-1);
                    }}
                    onPointerLeave={stopHoverMove}
                />
                <div className="trainer-selector-track" role="list" aria-live="polite" onPointerEnter={stopHoverMove}>
                    {trainers.map((trainer, index) => {
                        const distance = getDistance(index, activeIndex, trainers.length);
                        const visible = Math.abs(distance) <= 2;
                        const state = distance === 0 ? 'is-active' : Math.abs(distance) === 1 ? 'is-near' : visible ? 'is-far' : 'is-hidden';
                        const direction = distance < 0 ? 'is-left' : distance > 0 ? 'is-right' : '';
                        return (
                            <button
                                className={`trainer-selector-figure ${state} ${direction}`}
                                key={trainer.id}
                                type="button"
                                role="listitem"
                                tabIndex={visible ? 0 : -1}
                                onClick={() => distance === 0 ? onSelect(trainer) : setActiveIndex(index)}
                            >
                                <span className="trainer-selector-name">{trainer.name}</span>
                                <img src={trainer.imageUrl} alt={trainer.name} />
                            </button>
                        );
                    })}
                </div>
                <div
                    className="trainer-selector-hover-zone trainer-selector-hover-zone--right"
                    aria-hidden="true"
                    onPointerEnter={(event) => {
                        if (event.pointerType === 'mouse') startHoverMove(1);
                    }}
                    onPointerLeave={stopHoverMove}
                />
            </div>
            <p className="trainer-selector-footnote">點擊角色開始旅途</p>
        </section>
    );
}
