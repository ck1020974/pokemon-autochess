import { useState } from 'react';
import './TutorialModal.css';

interface TutorialModalProps {
    onClose: () => void;
}

type TabKey = 'basics' | 'evolution' | 'synergies' | 'economy';

export function TutorialModal({ onClose }: TutorialModalProps) {
    const [activeTab, setActiveTab] = useState<TabKey>('basics');

    const renderContent = () => {
        switch (activeTab) {
            case 'basics':
                return (
                    <>
                        <div className="tutorial-section-title">基礎玩法 (Basics)</div>
                        <div className="tutorial-step">
                            <div className="tutorial-step-icon">🛒</div>
                            <div className="tutorial-step-content">
                                <div className="tutorial-step-title">1. 招募寶可夢</div>
                                <div className="tutorial-step-desc">點擊商店卡牌，花費 <span className="tutorial-highlight-text">$3</span> 金幣將成員招募到備戰區。</div>
                            </div>
                        </div>
                        <div className="tutorial-step">
                            <div className="tutorial-step-icon">👆</div>
                            <div className="tutorial-step-content">
                                <div className="tutorial-step-title">2. 拖曳上陣</div>
                                <div className="tutorial-step-desc"><span className="tutorial-highlight-text">按住並拖曳</span> 備戰席成員至陣地格子。前排坦克，後排輸出！</div>
                            </div>
                        </div>
                        <div className="tutorial-step">
                            <div className="tutorial-step-icon">⚔️</div>
                            <div className="tutorial-step-content">
                                <div className="tutorial-step-title">3. 開始戰鬥</div>
                                <div className="tutorial-step-desc">佈陣完成後點擊 <span className="tutorial-highlight-text">開始戰鬥</span>。擊敗敵人來獲取金幣！</div>
                            </div>
                        </div>
                    </>
                );

            case 'evolution':
                return (
                    <>
                        <div className="tutorial-section-title">進化機制 (Evolution)</div>
                        <div className="tutorial-step">
                            <div className="tutorial-step-icon">⭐</div>
                            <div className="tutorial-step-content">
                                <div className="tutorial-step-title">三合一升星</div>
                                <div className="tutorial-step-desc">湊齊 <span className="tutorial-highlight-text">3 隻相同</span> 的 1 星寶可夢，戰鬥後自動合成 2 星！</div>
                            </div>
                        </div>
                        <div className="tutorial-step">
                            <div className="tutorial-step-icon">🌟</div>
                            <div className="tutorial-step-content">
                                <div className="tutorial-step-title">究極進化 (3星)</div>
                                <div className="tutorial-step-desc">湊齊 <span className="tutorial-highlight-text">3 隻相同 2 星</span> 即可升至 3 星，角色能力會發生質變。</div>
                            </div>
                        </div>
                    </>
                );

            case 'synergies':
                return (
                    <>
                        <div className="tutorial-section-title">屬性與羈絆 (Synergies)</div>
                        <div className="tutorial-step">
                            <div className="tutorial-step-icon">🔗</div>
                            <div className="tutorial-step-content">
                                <div className="tutorial-step-title">湊齊羈絆之力</div>
                                <div className="tutorial-step-desc">部署 <span className="tutorial-highlight-text">多隻同羈絆且不同種</span> 的寶可夢，獲得組合增益。</div>
                            </div>
                        </div>
                        <div className="tutorial-step">
                            <div className="tutorial-step-icon">📖</div>
                            <div className="tutorial-step-content">
                                <div className="tutorial-step-title">查閱小百科</div>
                                <div className="tutorial-step-desc">隨時點擊頂部 <span className="tutorial-highlight-text">小百科</span> 查看全角色進化與詳細羈絆效果。</div>
                            </div>
                        </div>
                    </>
                );

            case 'economy':
                return (
                    <>
                        <div className="tutorial-section-title">經濟與商店 (Economy)</div>
                        <div className="tutorial-step">
                            <div className="tutorial-step-icon">💰</div>
                            <div className="tutorial-step-content">
                                <div className="tutorial-step-title">金幣收入</div>
                                <div className="tutorial-step-desc">每回合獲取收入：勝場 <span className="tutorial-highlight-text">$3</span>，敗場補償 <span className="tutorial-highlight-text">$2</span>。</div>
                            </div>
                        </div>
                        <div className="tutorial-step">
                            <div className="tutorial-step-icon">🎲</div>
                            <div className="tutorial-step-content">
                                <div className="tutorial-step-title">刷新商店 ($1)</div>
                                <div className="tutorial-step-desc">消耗 $1 金幣點擊刷新按鈕 (Reroll) 來更換商店名單。</div>
                            </div>
                        </div>
                        <div className="tutorial-step">
                            <div className="tutorial-step-icon">🔒</div>
                            <div className="tutorial-step-content">
                                <div className="tutorial-step-title">鎖定商品 ($1)</div>
                                <div className="tutorial-step-desc">點擊鎖定 (Lock) 以防卡片被洗掉。解鎖需再次支付 $1。</div>
                            </div>
                        </div>
                    </>
                );
        }
    };

    return (
        <div className="tutorial-overlay" onClick={onClose}>
            <div className="tutorial-modal" onClick={(e) => e.stopPropagation()}>
                <div className="tutorial-header">
                    <h2 className="tutorial-title">訓練家教戰手冊</h2>
                    <button className="tutorial-close-btn" onClick={onClose} aria-label="Close">✕</button>
                </div>
                <div className="tutorial-content">
                    <div className="tutorial-sidebar">
                        <button
                            className={`tutorial-tab-btn ${activeTab === 'basics' ? 'active' : ''}`}
                            onClick={() => setActiveTab('basics')}
                        >
                            基礎玩法
                        </button>
                        <button
                            className={`tutorial-tab-btn ${activeTab === 'evolution' ? 'active' : ''}`}
                            onClick={() => setActiveTab('evolution')}
                        >
                            進化機制
                        </button>
                        <button
                            className={`tutorial-tab-btn ${activeTab === 'synergies' ? 'active' : ''}`}
                            onClick={() => setActiveTab('synergies')}
                        >
                            屬性羈絆
                        </button>
                        <button
                            className={`tutorial-tab-btn ${activeTab === 'economy' ? 'active' : ''}`}
                            onClick={() => setActiveTab('economy')}
                        >
                            商店經濟
                        </button>
                    </div>
                    <div className="tutorial-main">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
}
