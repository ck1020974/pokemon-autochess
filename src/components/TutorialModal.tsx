import './TutorialModal.css';

interface TutorialModalProps {
    onClose: () => void;
    onStartTutorial: () => void;
}

export function TutorialModal({ onClose, onStartTutorial }: TutorialModalProps) {
    return (
        <div className="tutorial-overlay tutorial-entry-overlay">
            <div className="tutorial-modal tutorial-entry-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="tutorial-title tutorial-entry-title">新手教學模式</h2>
                <div className="tutorial-entry-copy">
                    學習如何遊玩寶可夢自走棋<br />
                    遊戲進度將被清除，並重新開始！
                </div>
                <div className="tutorial-entry-actions">
                    <button className="btn-premium tutorial-entry-action tutorial-entry-primary" onClick={onStartTutorial}>
                        開始
                    </button>
                    <button className="btn-premium tutorial-entry-action tutorial-entry-secondary" onClick={onClose}>
                        跳過
                    </button>
                </div>
            </div>
        </div>
    );
}
