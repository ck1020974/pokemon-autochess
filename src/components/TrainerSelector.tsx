import type { PlayerTrainer } from '../presentation/trainers';
import './TrainerSelector.css';

interface TrainerSelectorProps {
    trainers: readonly PlayerTrainer[];
    onSelect: (trainer: PlayerTrainer) => void;
}

export function TrainerSelector({ trainers, onSelect }: TrainerSelectorProps) {
    return (
        <section className="trainer-selector-overlay" aria-label="選擇訓練家" role="dialog" aria-modal="true">
            <div className="trainer-selector-atmosphere" aria-hidden="true">
                <span className="trainer-selector-cloud cloud-one" />
                <span className="trainer-selector-cloud cloud-two" />
                <span className="trainer-selector-hill hill-one" />
                <span className="trainer-selector-hill hill-two" />
            </div>
            <header className="trainer-selector-heading">
                <p>YOUR ADVENTURE</p>
                <h2>請選擇你的角色</h2>
                <span>左右滑動，挑選陪你踏上旅程的訓練家</span>
            </header>
            <div className="trainer-selector-track" role="list">
                {trainers.map((trainer) => (
                    <button
                        className="trainer-selector-card"
                        key={trainer.id}
                        type="button"
                        role="listitem"
                        onClick={() => onSelect(trainer)}
                    >
                        <span className="trainer-selector-card-glint" aria-hidden="true" />
                        <img src={trainer.imageUrl} alt={trainer.name} />
                        <span className="trainer-selector-name">{trainer.name}</span>
                        <span className="trainer-selector-pick">選擇</span>
                    </button>
                ))}
            </div>
            <p className="trainer-selector-footnote">角色只影響畫面演出，不會改變任何遊戲數值。</p>
        </section>
    );
}
