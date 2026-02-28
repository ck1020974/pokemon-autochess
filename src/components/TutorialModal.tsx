import './TutorialModal.css';

interface TutorialModalProps {
    onClose: () => void;
    onStartTutorial: () => void;
}

export function TutorialModal({ onClose, onStartTutorial }: TutorialModalProps) {
    return (
        <div className="tutorial-overlay" style={{ zIndex: 100000 }}>
            <div className="tutorial-modal" style={{ width: '500px', height: 'auto', textAlign: 'center', padding: '40px', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                <h2 className="tutorial-title" style={{ marginBottom: '20px', fontSize: '2.2rem' }}>新手教學模式</h2>
                <div style={{ color: '#cbd5e1', fontSize: '1.2rem', marginBottom: '35px', lineHeight: '1.8' }}>
                    學習如何遊玩寶可夢自走棋<br />
                    從頭體驗完整的對戰流程！
                </div>
                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                    <button className="btn-premium" style={{
                        background: 'linear-gradient(to bottom, #3b82f6, #2563eb)',
                        borderColor: '#60a5fa',
                        color: '#fff',
                        fontSize: '1.2rem',
                        padding: '15px 35px',
                        boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)'
                    }} onClick={onStartTutorial}>
                        開始
                    </button>
                    <button className="btn-premium" style={{
                        background: 'transparent',
                        borderColor: 'rgba(255,255,255,0.2)',
                        color: '#aaa',
                        fontSize: '1.2rem',
                        padding: '15px 35px'
                    }} onClick={onClose}>
                        跳過
                    </button>
                </div>
            </div>
        </div>
    );
}
