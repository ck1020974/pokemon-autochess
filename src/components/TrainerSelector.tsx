import { useRef, useState } from 'react';
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
    const move = (direction: -1 | 1) => setActiveIndex((index) => (index + direction + trainers.length) % trainers.length);

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
        pointerStart.current = event.clientX;
    };

    const onPointerUp = (event: PointerEvent<HTMLElement>) => {
        if (pointerStart.current === null) return;
        const delta = event.clientX - pointerStart.current;
        pointerStart.current = null;
        if (Math.abs(delta) >= 35) move(delta > 0 ? -1 : 1);
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
                <p>YOUR ADVENTURE</p>
                <h2>請選擇你的角色</h2>
                <span>使用左右按鈕、方向鍵或滑鼠滾輪挑選訓練家</span>
            </header>
            <div className="trainer-selector-carousel" onWheel={onWheel} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
                <button className="trainer-selector-arrow trainer-selector-arrow-left" type="button" onClick={() => move(-1)} aria-label="上一位訓練家">‹</button>
                <div className="trainer-selector-track" role="list" aria-live="polite">
                    {trainers.map((trainer, index) => {
                        const distance = getDistance(index, activeIndex, trainers.length);
                        const visible = Math.abs(distance) <= 2;
                        const state = distance === 0 ? 'is-active' : Math.abs(distance) === 1 ? 'is-near' : visible ? 'is-far' : 'is-hidden';
                        const direction = distance < 0 ? 'is-left' : distance > 0 ? 'is-right' : '';
                        return (
                            <button
                                className={`trainer-selector-card ${state} ${direction}`}
                                key={trainer.id}
                                type="button"
                                role="listitem"
                                tabIndex={visible ? 0 : -1}
                                onClick={() => distance === 0 ? onSelect(trainer) : setActiveIndex(index)}
                            >
                                <span className="trainer-selector-card-glint" aria-hidden="true" />
                                <img src={trainer.imageUrl} alt={trainer.name} />
                                <span className="trainer-selector-name">{trainer.name}</span>
                                <span className="trainer-selector-pick">{distance === 0 ? '點擊開始旅程' : '查看角色'}</span>
                            </button>
                        );
                    })}
                </div>
                <button className="trainer-selector-arrow trainer-selector-arrow-right" type="button" onClick={() => move(1)} aria-label="下一位訓練家">›</button>
            </div>
            <p className="trainer-selector-footnote">角色只影響畫面演出，不會改變任何遊戲數值。</p>
        </section>
    );
}
