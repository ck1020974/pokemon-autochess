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
                                <div className="tutorial-step-desc">
                                    在畫面下方的商店區點擊寶可夢卡牌，花費 <span className="tutorial-highlight-text">$3 金幣</span> 將牠招募到備戰區。
                                </div>
                            </div>
                        </div>
                        <div className="tutorial-step">
                            <div className="tutorial-step-icon">👆</div>
                            <div className="tutorial-step-content">
                                <div className="tutorial-step-title">2. 拖曳上陣</div>
                                <div className="tutorial-step-desc">
                                    將備戰席上的寶可夢 <span className="tutorial-highlight-text">按住並拖曳</span> 到畫面上方的陣地格子中。
                                    放在前面的負責承受傷害，放在後面的負責輸出！
                                </div>
                            </div>
                        </div>
                        <div className="tutorial-step">
                            <div className="tutorial-step-icon">⚔️</div>
                            <div className="tutorial-step-content">
                                <div className="tutorial-step-title">3. 開始戰鬥</div>
                                <div className="tutorial-step-desc">
                                    佈陣完成後，點擊正中央的 <span className="tutorial-highlight-text">「開始戰鬥」</span> 按鈕。比賽會自動進行，擊敗對象來取得勝利與金幣！
                                </div>
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
                                <div className="tutorial-step-desc">
                                    只要在場上與備戰席中湊齊 <span className="tutorial-highlight-text">3 隻完全一樣</span> 的 1 星寶可夢，
                                    牠們就會在戰鬥結束後自動合體進化成更強大的 <span className="tutorial-highlight-text">2 星寶可夢</span>！
                                </div>
                            </div>
                        </div>
                        <div className="tutorial-step">
                            <div className="tutorial-step-icon">🌟</div>
                            <div className="tutorial-step-content">
                                <div className="tutorial-step-title">究極進化 (3星)</div>
                                <div className="tutorial-step-desc">
                                    同理，湊齊 <span className="tutorial-highlight-text">3 隻 2 星寶可夢</span> 就能再往上升到頂點的 3 星狀態，
                                    不僅血量與攻擊破表，有些寶可夢的技能效果也會發生質變喔！
                                </div>
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
                                <div className="tutorial-step-desc">
                                    每隻寶可夢都帶有自身特有的「屬性/羈絆」。當您在場上部署了 <span className="tutorial-highlight-text">多隻擁有相同羈絆、且不同種類</span> 的寶可夢時，就能發動強大的組合增益效果！
                                </div>
                            </div>
                        </div>
                        <div className="tutorial-step">
                            <div className="tutorial-step-icon">📖</div>
                            <div className="tutorial-step-content">
                                <div className="tutorial-step-title">查閱小百科</div>
                                <div className="tutorial-step-desc">
                                    想知道有哪些羈絆以及需要幾位成員才能觸發嗎？
                                    隨時點擊畫面頂部的 <span className="tutorial-highlight-text">「📖 小百科」按鈕</span> 來查看所有羈絆細節與角色進化連段！
                                </div>
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
                                <div className="tutorial-step-title">基礎收入</div>
                                <div className="tutorial-step-desc">
                                    每回合戰果結算後，您會獲得基礎金幣。打贏會給 <span className="tutorial-highlight-text">$3</span>，打輸則只給 <span className="tutorial-highlight-text">$2</span> 的落敗補償金。
                                </div>
                            </div>
                        </div>
                        <div className="tutorial-step">
                            <div className="tutorial-step-icon">🎲</div>
                            <div className="tutorial-step-content">
                                <div className="tutorial-step-title">刷新商店 ($1)</div>
                                <div className="tutorial-step-desc">
                                    在商店找不到想要的寶可夢？點擊黃色的 <b>刷新按鈕 (Reroll)</b>，花費 $1 來換下一批。
                                </div>
                            </div>
                        </div>
                        <div className="tutorial-step">
                            <div className="tutorial-step-icon">🔒</div>
                            <div className="tutorial-step-content">
                                <div className="tutorial-step-title">鎖定商品 ($1)</div>
                                <div className="tutorial-step-desc">
                                    看到喜歡的陣容卻沒錢買？點開卡片右上角的<span className="tutorial-highlight-text">鎖定 (Lock)</span> 圖示！
                                    它在下回合開始時<span className="tutorial-highlight-text">不會被洗掉</span>，讓您下回合依然買得到。
                                </div>
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
