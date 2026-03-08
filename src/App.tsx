import * as React from 'react';
import { createPortal } from 'react-dom';
// Last updated: 2026-03-06 - Balance Fix Deploy
import { useState, useEffect, useRef } from 'react';
import './index.css';
import { GameLoop, GamePhase } from './engine/GameLoop';
import { music } from './engine/MusicManager';

import { NOVICE_OPPONENTS, INTERM_OPPONENTS, ADVANCED_OPPONENTS, ELITE_OPPONENTS, CHAMPION_OPPONENTS } from './models/BossData';
import { BattleSimulator } from './engine/BattleSimulator';
import type { BattleLog } from './engine/BattleSimulator';
import { UNIT_TEMPLATES, PREFERRED_POSITIONS } from './models/UnitFactory';
import type { PreferredPosition } from './models/UnitFactory';
import { SYNERGIES } from './models/Synergies';
import { EncyclopediaModal } from './components/EncyclopediaModal';
import { TutorialModal } from './components/TutorialModal';
import { Unit } from './models/Unit';
import { REWARD_DATA } from './models/RewardData';

// Difficulty Icons
import normalBall from './assets/普通.webp';
import greatBall from './assets/超級.webp';
import ultraBall from './assets/高級.webp';
import masterBall from './assets/大師.webp';

// --- Types ---
interface SelectedUnitState {
    unit: Unit;
    index: number;
    source: 'SHOP' | 'BOARD' | 'ENEMY';
}

interface DraggedItemState {
    index: number;
    source: 'SHOP' | 'BOARD';
}

interface ConfirmDialogState {
    message: string;
    description?: string;
    onConfirm: () => void;
}

// --- Helper Components ---

// UnitCard with Direct Lock & Silence Support
function UnitCard({ unit, onClick, frozen, draggable, onDragStart, flipped, isInteractive, onToggleFreeze, silenced, hpSwapped, isSelected, isEvolving, showMergeGlow, tutorialHighlightLock }: any) {
    if (!unit || unit.stats.hp <= 0) {
        return (
            <div className="slot-placeholder">
                <div className="floor-marker"></div>
            </div>
        );
    }

    return (
        <div
            id={unit.id}
            className={`unit-card ${frozen ? 'frozen' : ''} ${flipped ? 'flipped' : ''} ${silenced ? 'is-silenced' : ''} ${isSelected ? 'is-selected' : ''} ${showMergeGlow ? 'is-mergeable' : ''} ${isEvolving ? 'is-evolving' : ''}`}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            draggable={draggable}
            onDragStart={onDragStart}
            style={{
                cursor: isInteractive ? 'pointer' : 'default',
                viewTransitionName: `unit-${unit.id}` as any
            }}
        >
            <div className="floor-marker"></div>

            {/* Silence Visual Overlay */}
            {silenced && (
                <>
                    <div className="silence-lock-badge" title="招式已被封印"> 🈲 </div>
                    <div className="silence-overlay" />
                </>
            )}

            {/* Direct Lock Icon Button (Only if onToggleFreeze provided) */}
            {onToggleFreeze && (
                <div
                    className={`card-lock-overlay ${frozen ? 'locked' : ''} ${tutorialHighlightLock ? 'tutorial-elevate' : ''}`}
                    onClick={(e) => { e.stopPropagation(); onToggleFreeze(); }}
                    title={frozen ? "解除鎖定" : "鎖定角色"}
                >
                    {frozen ? '🔒' : '🔓'}
                </div>
            )}

            <div className="unit-visual-wrapper">
                <img
                    src={unit.imageUrl}
                    className="unit-image"
                    alt="unit"
                />
            </div>

            <div className="unit-stats">
                <span className="stat-atk">{unit.stats.attack}</span>
                <span className="stat-hp" style={{ color: hpSwapped ? '#a855f7' : undefined }}>{unit.stats.hp}</span>
            </div>
        </div>
    );
}

// Synergy Icon Component
function SynergyIcon({ synergy, count, showCount = true, units, activeFamilies, isEnemy, onMouseEnter, className, activeSynergyId, setActiveSynergyId }: any) {
    const [localOpen, setLocalOpen] = useState(false);
    const isForcedOpen = setActiveSynergyId ? (activeSynergyId === synergy.id) : localOpen;

    let activeDesc = synergy.description;
    const isActive = count !== undefined && count >= synergy.tiers[0];
    const style = isActive ? { borderColor: synergy.color } : { borderColor: '#444', filter: 'grayscale(1)', opacity: 0.7 };

    // Dynamic [N] replacement for Psychic synergy
    if (synergy.id === 'Psychic' && (window as any).game) {
        activeDesc = activeDesc.replace('[N]', (window as any).game.psychicN.toString());
    }

    return (
        <div
            className={`synergy-icon ${className || ''} ${isForcedOpen ? 'force-visible' : ''}`}
            style={style}
            onMouseEnter={onMouseEnter}
            onClick={(e) => {
                e.stopPropagation();
                if (setActiveSynergyId) {
                    setActiveSynergyId(isForcedOpen ? null : synergy.id);
                } else {
                    setLocalOpen(!isForcedOpen);
                }
            }}
        >
            {synergy.icon}
            {showCount && count !== undefined && <span style={{ position: 'absolute', bottom: -5, right: -5, fontSize: '0.7rem', background: '#000', borderRadius: '50%', padding: '0 4px', border: '1px solid #333', color: '#fff' }}>{count}</span>}
            <div className={`synergy-tooltip ${isEnemy ? 'is-enemy' : ''}`}>
                <div style={{ fontWeight: 'bold', color: isActive ? synergy.color : '#aaa', marginBottom: '4px' }}>
                    {synergy.icon} {synergy.name} {count !== undefined ? `(${count})` : ''}
                </div>
                <div style={{ marginBottom: '8px' }}>{activeDesc}</div>
                {/* Unit thumbnails */}
                {units && units.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>
                        {units.map((u: any) => {
                            const isUnitActive = activeFamilies?.has(u.family) || false;
                            const unitStyle: React.CSSProperties = {
                                width: '24px', height: '24px', objectFit: 'contain',
                                borderRadius: '4px', background: 'rgba(0,0,0,0.3)',
                                filter: isUnitActive ? 'none' : 'grayscale(1) brightness(0.5)',
                                opacity: isUnitActive ? 1 : 0.5,
                                border: 'none'
                            };
                            return <img key={u.id} src={u.imageUrl} alt={u.name} title={u.name} style={unitStyle} />;
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// Helper to force update
function useForceUpdate() {
    const [, setTick] = useState(0);
    return () => setTick((t: number) => t + 1);
}

// Helper to calculate active synergies
// Helper to calculate all synergies data
function getSynergyStatus(team: (Unit | null)[]) {
    const synergyContributors: Record<string, Set<string>> = {};

    team.forEach(u => {
        if (!u) return;
        u.synergies.forEach(syn => {
            if (!synergyContributors[syn]) {
                synergyContributors[syn] = new Set();
            }
            // Use family for unique check
            synergyContributors[syn].add(u.family);
        });
    });

    const allSynergies = Object.values(SYNERGIES).map(syn => {
        const count = synergyContributors[syn.id] ? synergyContributors[syn.id].size : 0;
        const isActive = count >= syn.tiers[0];

        // Find units belonging to this synergy and sort them by tier
        const units = Object.values(UNIT_TEMPLATES)
            .filter(t => t.synergies?.includes(syn.id) && !t.isHiddenFromShop && t.id !== 'sprout')
            .sort((a, b) => a.tier - b.tier);

        return {
            ...syn,
            count,
            isActive,
            units,
            activeFamilies: synergyContributors[syn.id] || new Set()
        };
    });

    // Sort: Active first, then by count descending, then by ID
    return allSynergies.filter(syn => syn.count > 0).sort((a, b) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        if (a.count !== b.count) return b.count - a.count;
        return a.id.localeCompare(b.id);
    });
}



function App() {
    const gameRef = useRef<GameLoop>(new GameLoop());
    const game = gameRef.current;

    const [rewardChoices, setRewardChoices] = useState<any[]>([]);
    const update = useForceUpdate();

    useEffect(() => {
        console.log("Pokemon AutoChess v4.8.4 - Reward Phase Deploy");
    }, []);

    const handleRestart = () => {
        // 1. Reset Core Engine
        gameRef.current = new GameLoop();
        setRewardChoices([]);

        // 2. Clear Primary States
        setDifficulty(null);
        setTutorialStep(0);
        setHasStarted(false);
        setBattleResult(null);
        setInitialEnemyTeam([]);

        // 3. Clear Interaction States
        setSelected(null);
        setDraggedItem(null);
        setLogs([]);
        setBattleElapsedSeconds(0);

        // 4. Force UI Update
        update();
    };

    const simulatorRef = useRef<BattleSimulator | null>(null);
    const [logs, setLogs] = useState<BattleLog[]>([]);
    const [, setBattleTick] = useState(0);

    // Selection State
    const [selected, setSelected] = useState<SelectedUnitState | null>(null);

    // Drag State
    const [draggedItem, setDraggedItem] = useState<DraggedItemState | null>(null);

    // Battle Result State
    const [battleResult, setBattleResult] = useState<'WIN' | 'LOSS' | 'DRAW' | null>(null);

    // Battle Timeout Timing
    const [battleElapsedSeconds, setBattleElapsedSeconds] = useState(0);

    const [activeSynergyId, setActiveSynergyId] = useState<string | null>(null);

    const [initialEnemyTeam, setInitialEnemyTeam] = useState<(Unit | null)[]>([]);

    // Evolution Visual State
    const [evolvingUnitId, setEvolvingUnitId] = useState<string | null>(null);

    // Battle Speed State
    const [battleSpeed, setBattleSpeed] = useState(1);
    useEffect(() => {
        document.documentElement.style.setProperty('--anim-speed', battleSpeed.toString());
    }, [battleSpeed]);

    const triggerEvolutionEffect = (unit: Unit | null) => {
        if (unit) {
            setEvolvingUnitId(unit.id);
            setTimeout(() => setEvolvingUnitId(null), 800);
        }
    };

    // --- Difficulty & Preloading States ---
    const [difficulty, setDifficulty] = useState<'NORMAL' | 'GREAT' | 'ULTRA' | 'MASTER' | null>(null);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isPortrait, setIsPortrait] = useState(false);

    // Battle Paused State
    const [isPaused, setIsPaused] = useState(false);
    const isPausedRef = useRef(false);

    // Mute State
    const [isMuted, setIsMuted] = useState(music.isMuted());
    const toggleMute = () => {
        const nextMuted = !isMuted;
        music.setMuted(nextMuted);
        setIsMuted(nextMuted);
    };

    // UI States
    const [showEncyclopedia, setShowEncyclopedia] = useState<boolean>(false);
    const [showTutorial, setShowTutorial] = useState<boolean>(true); // Changed to true to auto-prompt tutorial
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
    const [tutorialStep, setTutorialStep] = useState<number>(0);
    const [tutorialShake, setTutorialShake] = useState<boolean>(false);

    // Opponent Selection States
    const [showOpponentSelect, setShowOpponentSelect] = useState(false);
    const [opponentChoices, setOpponentChoices] = useState<{ name: string, url: string, id: string, difficulty?: string }[]>([]);
    const [selectedOpponent, setSelectedOpponent] = useState<{ name: string, url: string, id: string, difficulty?: string } | null>(null);

    // Animation States
    const [goldErrorAnim, setGoldErrorAnim] = useState(false);
    const [hpLossAnim, setHpLossAnim] = useState(false);
    const [focusedDifficulty, setFocusedDifficulty] = useState<string | null>(null);

    const displayPlayerTeam = (game.phase === GamePhase.BATTLE && simulatorRef.current) ? simulatorRef.current.playerTeam : game.playerTeam;
    const displayEnemyTeam = (game.phase === GamePhase.BATTLE && simulatorRef.current) ? simulatorRef.current.enemyTeam : Array(5).fill(null);

    const triggerShake = () => {
        setTutorialShake(true);
        setTimeout(() => setTutorialShake(false), 400);
    };

    const handleTutorialNext = () => {
        if (tutorialStep === 1) {
            setTutorialStep(2);
        } else if (tutorialStep === 11) {
            setTutorialStep(12);
        } else if (tutorialStep === 12) {
            setTutorialStep(0); // End tutorial completely
            handleRestart(); // Reset game back to intro screen
        } else {
            triggerShake();
        }
    };

    // --- Tutorial Logic ---
    const startTutorial = () => {
        // Reset game but PRESERVE title-screen-state
        const newGame = new GameLoop();
        gameRef.current = newGame;

        // Setup Tutorial Context
        newGame.gold = 10;
        newGame.shop.slots = [
            new Unit(UNIT_TEMPLATES.gastly),
            new Unit(UNIT_TEMPLATES.charmander),
            new Unit(UNIT_TEMPLATES.squirtle)
        ];
        newGame.setDifficulty('NORMAL');

        // Sync React States
        setDifficulty('NORMAL');
        setTutorialStep(2);
        setShowTutorial(false);
        setHasStarted(true); // CRITICAL: Keep user on the board, not title screen
        update();
    };

    // Step 10 Synergy Check
    // We keep these states to highlight the icons, but we don't auto-advance anymore
    // using useEffect to Step 11, because Step 10 now includes the battle task.


    // Progression Effect
    useEffect(() => {
        if (tutorialStep === 0) return;

        if (tutorialStep === 2) {
            if (game.playerTeam.filter(u => u !== null).length >= 3) {
                setTutorialStep(3);
                setSelected(null);
            }
        } else if (tutorialStep === 4) {
            const gastlyIdx = game.playerTeam.findIndex(u => u?.family === 'gastly');
            // If Gastly is in index 1-4, it's behind someone if there is another unit in index 0 to (gastlyIdx-1)
            const isBehindSomeone = gastlyIdx > 0 && game.playerTeam.slice(0, gastlyIdx).some(u => u !== null);
            if (isBehindSomeone) {
                setTutorialStep(5);
                setSelected(null);
            }
        } else if (tutorialStep === 5) {
            const isReplaced = game.shop.slots.length === 2 && game.shop.slots[0]?.family === 'charmander' && game.shop.slots[1]?.family === 'charmander';
            if (game.gold < 10 && !isReplaced) {
                game.shop.slots = [new Unit(UNIT_TEMPLATES.charmander), new Unit(UNIT_TEMPLATES.charmander), null];
                game.shop.frozen = [false, false, false, false, false];
                update();
            } else if (game.gold < 10 && isReplaced) {
                setTutorialStep(6);
            }
        } else if (tutorialStep === 6) {
            if (game.shop.frozen[0] && game.shop.frozen[1]) {
                setTutorialStep(7);
            }
        } else if (tutorialStep === 7) {
            if (game.phase === GamePhase.BATTLE) {
                setTutorialStep(8);
            }
        } else if (tutorialStep === 8) {
            if (game.phase === GamePhase.SHOP && battleResult === null) {
                const hasLevel2Charmander = game.playerTeam.some(u => u?.family === 'charmander' && u.level >= 2);
                if (hasLevel2Charmander) {
                    setTutorialStep(9);
                } else {
                    if (game.shop.slots.length > 0 && game.shop.slots[2]?.family !== 'cyndaquil') {
                        game.shop.slots[0] = new Unit(UNIT_TEMPLATES.charmander);
                        game.shop.slots[1] = new Unit(UNIT_TEMPLATES.charmander);
                        game.shop.slots[2] = new Unit(UNIT_TEMPLATES.cyndaquil);
                        game.shop.slots[3] = new Unit(UNIT_TEMPLATES.igglybuff);
                        game.shop.slots.length = 4;
                        game.shop.frozen = [false, false, false, false, false];
                        update();
                    }
                }
            }
        }
    }, [tutorialStep, game.phase, battleResult, update]); // Changed from gameRef.current.phase

    // Image Preloading - Split into Critical (Tier 1/2) and Background (Tier 3+)
    useEffect(() => {

        const loadAssets = async (urls: string[], isBackground: boolean = false) => {
            let loadedCount = 0;
            const promises = urls.map(url => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.src = url;
                    const handleLoad = () => {
                        loadedCount++;
                        if (!isBackground) {
                            setLoadingProgress(Math.floor((loadedCount / urls.length) * 100));
                        }
                        resolve(url);
                    };
                    img.onload = handleLoad;
                    img.onerror = handleLoad;
                });
            });
            await Promise.all(promises);
        };

        const preloadAllAssets = async () => {
            // CRITICAL: Tier 1 and 2, plus basic UI tokens
            const criticalUrls = new Set<string>();
            const backgroundUrls = new Set<string>();

            Object.values(UNIT_TEMPLATES).forEach(t => {
                // Determine if critical (Tier 1 & 2) or background (Tier 3+)
                const isCritical = t.tier <= 2 || t.id === 'sprout';

                const addUrl = (url: string) => {
                    if (isCritical) criticalUrls.add(url);
                    else backgroundUrls.add(url);
                };

                if (t.imageUrl) addUrl(t.imageUrl);
                if (t.battleImageUrl) addUrl(t.battleImageUrl);
            });

            // Trainers: Only NOVICE are critical, others are background
            NOVICE_OPPONENTS.forEach(op => criticalUrls.add(op.url));
            [...INTERM_OPPONENTS, ...ADVANCED_OPPONENTS, ...ELITE_OPPONENTS, ...CHAMPION_OPPONENTS].forEach(op => backgroundUrls.add(op.url));

            // Critical token/derived images
            criticalUrls.add('assets/妙蛙種子01.webp');
            criticalUrls.add('assets/小拉達01.webp');
            criticalUrls.add('assets/飄飄球01.webp');
            criticalUrls.add('assets/隨風球01.webp');
            criticalUrls.add('assets/怨影娃娃01.webp');
            criticalUrls.add('assets/詛咒娃娃01.webp');

            // Critical difficulty icons
            criticalUrls.add(normalBall);
            criticalUrls.add(greatBall);
            criticalUrls.add(ultraBall);
            criticalUrls.add(masterBall);

            // Preload critical audio
            const preloadAudio = (name: string) => {
                const audio = new Audio(`music/${name}.OGG`);
                audio.load();
            };
            preloadAudio('start');
            preloadAudio('pokemonmart');
            preloadAudio('gymfight');
            preloadAudio('pokemoncenter'); // Early loss protection
            preloadAudio('gymwin');       // Early win protection

            console.log(`[系統] 開始預載入關鍵資源 (${criticalUrls.size} 個)...`);
            await loadAssets(Array.from(criticalUrls), false);

            setHasLoaded(true);
            console.log(`[系統] 關鍵資源載入完成！`);

            // Next frame background load
            setTimeout(async () => {
                console.log(`[系統] 開始背景載入剩餘資源 (${backgroundUrls.size} 個)...`);
                preloadAudio('victoryroad');
                preloadAudio('level up');
                preloadAudio('recover');

                // Add reward item images to background load
                REWARD_DATA.forEach(reward => {
                    if (reward.imageUrl) backgroundUrls.add(reward.imageUrl);
                });

                await loadAssets(Array.from(backgroundUrls), true);
                console.log(`[系統] 背景資源載入完成！`);
            }, 500);
        };

        preloadAllAssets();
    }, []);

    // --- BGM Initial Logic ---
    useEffect(() => {
        if (!difficulty) {
            music.play('start', true);
        }
    }, [difficulty]);

    // Orientation Detection
    useEffect(() => {
        const checkOrientation = () => {
            const portrait = window.innerHeight > window.innerWidth;
            const mobile = window.innerWidth < 1024;
            setIsPortrait(portrait && mobile);
        };

        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);

        // Attempt to lock landscape if supported
        try {
            if (screen.orientation && (screen.orientation as any).lock) {
                (screen.orientation as any).lock('landscape').catch(() => { });
            }
        } catch (e) { }

        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    const handleDifficultySelect = (lvl: 'NORMAL' | 'GREAT' | 'ULTRA' | 'MASTER') => {
        music.stop(); // Stop 'start' music
        game.setDifficulty(lvl);
        game.startShopPhase(); // Ensure fresh gold and shop slots on every start
        setDifficulty(lvl);
        setShowTutorial(true); // Auto-prompt tutorial instead of going straight to the game
        update(); // Ensure shop phase logic triggers music check
    };

    const togglePause = () => {
        isPausedRef.current = !isPausedRef.current;
        setIsPaused(isPausedRef.current);
    };

    const toggleBattleSpeed = () => {
        setBattleSpeed(prev => {
            if (prev === 1) return 2;
            if (prev === 2) return 3;
            return 1;
        });
    };

    // Reset pause when entering BATTLE
    useEffect(() => {
        if (game.phase === GamePhase.BATTLE) {
            isPausedRef.current = false;
            setIsPaused(false);
            music.play('gymfight', true);
        }
    }, [game.phase]);

    useEffect(() => {
        if (game.phase === GamePhase.BATTLE) {
            setBattleElapsedSeconds(0);
        } else if (game.phase === GamePhase.SHOP && difficulty) {
            setBattleElapsedSeconds(0);

            // Handle Preparation Phase Music
            if (game.lastResult === 'WIN') {
                if (game.wins <= 7) {
                    music.play('pokemonmart', true);
                } else {
                    music.play('victoryroad', true);
                }
            } else if (game.lastResult === 'LOSS' || game.lastResult === 'DRAW') {
                if (game.wins <= 7) {
                    music.playRecoverSequence('pokemoncenter');
                } else {
                    music.play('pokemoncenter', true);
                }
            } else {
                // Initial game start (no last result)
                music.play('pokemonmart', true);
            }
        } else {
            setBattleElapsedSeconds(0);
        }
    }, [game.phase, difficulty]);

    // Timer loop for timeout (using elapsed seconds for pause sync)
    useEffect(() => {
        let timer: any;
        if (game.phase === GamePhase.BATTLE && !battleResult && !isPaused) {
            timer = setInterval(() => {
                if (!document.hidden) {
                    setBattleElapsedSeconds((s: number) => s + 1);
                }
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [game.phase, battleResult, isPaused]);

    useEffect(() => {
        if (game.phase === GamePhase.BATTLE && !simulatorRef.current) {
            // Init Battle
            // Init Battle
            // Enemy Count Logic based on User Request
            // Turn <= 1 = 3, Turn 2+ = 5
            let enemyCount = 5;
            if (game.turn <= 1) enemyCount = 3;
            else enemyCount = 5;

            let enemyTeam: (Unit | null)[] = [];

            // Helper to bias enemy generation towards higher tiers in mid/late game
            const getRandomEnemyTemplate = (templates: any[]) => {
                if (game.turn >= 8 && Math.random() < 0.6) {
                    const maxTier = Math.max(...templates.map(t => t.tier));
                    const highTierPool = templates.filter(t => t.tier >= maxTier - 1);
                    if (highTierPool.length > 0) return highTierPool[Math.floor(Math.random() * highTierPool.length)];
                }
                return templates[Math.floor(Math.random() * templates.length)];
            };

            // 2. Progression Settings (Star Count & Level)
            // Default settings for filler units
            let enemyBaseLevel = 1;
            let forcedStarCount = 0;
            let forcedTwoStarCount = 0;
            let isBossMatch = false;

            if (game.wins >= 11) {
                isBossMatch = true;
                enemyBaseLevel = 2; // Default to 2-star for lategame, let forcedStarCount push to 3-star
                if (difficulty === 'NORMAL') forcedStarCount = 2;
                else if (difficulty === 'GREAT') forcedStarCount = 3;
                else if (difficulty === 'ULTRA') forcedStarCount = 4;
                else {
                    enemyBaseLevel = 3;
                    forcedStarCount = 5; // Master: All 5 Units 3-Star
                }
            } else if (game.wins >= 8) {
                isBossMatch = true;
                const eliteIndex = game.wins - 8; // 0, 1, 2, 3
                enemyBaseLevel = 2;
                if (difficulty === 'NORMAL') {
                    const progression = [0, 1, 1, 2];
                    forcedStarCount = progression[eliteIndex];
                } else if (difficulty === 'GREAT') {
                    const progression = [1, 1, 2, 2];
                    forcedStarCount = progression[eliteIndex];
                } else if (difficulty === 'ULTRA') {
                    const progression = [1, 2, 3, 3];
                    forcedStarCount = progression[eliteIndex];
                } else {
                    forcedStarCount = eliteIndex + 1;
                }
            } else {
                enemyBaseLevel = 1;
                // Gym scaling
                if (game.turn >= 7) {
                    enemyBaseLevel = 2;
                }
            }

            if (game.wins < 8 && game.turn >= 4 && game.turn < 7) {
                forcedTwoStarCount = game.turn - 3;
            }

            // 3. Strategy / Synergy Selection
            if (tutorialStep > 0 && tutorialStep < 10) {
                // Tutorial Battle 1: Use Brock (novice_3)'s team exactly
                const brock = NOVICE_OPPONENTS.find(n => n.id === 'novice_3')!;
                enemyTeam = brock.coreUnits.map(id => {
                    const t = UNIT_TEMPLATES[id];
                    if (!t) return null;
                    const u = new Unit(t);
                    u.level = 1;
                    return u;
                }).concat(Array(5).fill(null)).slice(0, 5) as Unit[];
            } else if (selectedOpponent && selectedOpponent.id) {
                // Real gameplay OR Tutorial Battle 2: Use chosen opponent's team
                let def = CHAMPION_OPPONENTS.find(c => c.id === selectedOpponent.id) ||
                    ELITE_OPPONENTS.find(c => c.id === selectedOpponent.id) ||
                    ADVANCED_OPPONENTS.find(e => e.id === selectedOpponent.id) ||
                    INTERM_OPPONENTS.find(g => g.id === selectedOpponent.id) ||
                    NOVICE_OPPONENTS.find(n => n.id === selectedOpponent.id);
                if (def) {
                    // bossLevel for Core Units
                    let bossLevel = enemyBaseLevel;
                    if (isBossMatch) {
                        if (difficulty === 'NORMAL') bossLevel = 1;
                        else if (difficulty === 'GREAT') bossLevel = 2;
                        else bossLevel = 3;
                    }
                    if (tutorialStep >= 10) {
                        // Ensure defeat in tutorial second battle
                        bossLevel = 3;
                    }

                    // Helper to dynamically evolve core units
                    const getEvolvedTemplate = (t: any, targetLevel: number) => {
                        let current = t;
                        for (let i = 1; i < targetLevel; i++) {
                            if (current && current.evolveId && UNIT_TEMPLATES[current.evolveId]) {
                                current = UNIT_TEMPLATES[current.evolveId];
                            } else {
                                break;
                            }
                        }
                        return current;
                    };

                    // 1. Create Core Units
                    const candidateUnits: Unit[] = [];
                    let coreCount = 0;
                    for (const coreId of def.coreUnits) {
                        if (coreCount >= enemyCount) break;
                        const baseT = UNIT_TEMPLATES[coreId];
                        if (baseT) {
                            const t = getEvolvedTemplate(baseT, bossLevel);
                            const u = new Unit(t);
                            u.level = bossLevel;
                            candidateUnits.push(u);
                            coreCount++;
                        }
                    }

                    // 2. Fill the rest based on their primary attributes/synergies
                    let fillCount = enemyCount - candidateUnits.length;
                    const mainSynergy = candidateUnits.length > 0 ? candidateUnits[0].synergies[0] : null;

                    let attempts = 0;
                    const MAX_ENEMY_ATTEMPTS = 5;
                    const shopTier = game.shop.getTier(game.turn);

                    while (fillCount > 0 && attempts < MAX_ENEMY_ATTEMPTS) {
                        const availableTemplates = Object.values(UNIT_TEMPLATES).filter(t => t.id !== 'sprout' && !t.isHiddenFromShop && t.tier <= shopTier);
                        let pool = availableTemplates;
                        if (mainSynergy && Math.random() < 0.7) {
                            const sPool = availableTemplates.filter(t => t.synergies.includes(mainSynergy));
                            if (sPool.length > 0) pool = sPool;
                        }

                        const baseT = getRandomEnemyTemplate(pool);
                        const t = getEvolvedTemplate(baseT, bossLevel);
                        const u = new Unit(t);
                        u.level = bossLevel;
                        candidateUnits.push(u);
                        fillCount--;
                        attempts++;
                    }

                    const sortTeamByPositions = (unsortedUnits: Unit[]): Unit[] | null => {
                        const POS_SCORE: Record<PreferredPosition, number> = {
                            'FRONT': 0,
                            'FRONT_MID': 1,
                            'ALL': 2,
                            'MID': 2,
                            'MID_BACK': 3,
                            'BACK': 4
                        };

                        const sorted = [...unsortedUnits].sort((a, b) => {
                            const prefA = PREFERRED_POSITIONS[a.family || a.templateId] || 'ALL';
                            const prefB = PREFERRED_POSITIONS[b.family || b.templateId] || 'ALL';
                            return POS_SCORE[prefA] - POS_SCORE[prefB];
                        });

                        const result: (Unit | null)[] = [null, null, null, null, null];
                        for (let i = 0; i < sorted.length; i++) {
                            result[i] = sorted[i];
                        }
                        return result as unknown as Unit[];
                    };

                    const sorted = sortTeamByPositions(candidateUnits);
                    if (sorted) {
                        enemyTeam = sorted;
                    } else {
                        // Fallback
                        enemyTeam = candidateUnits.concat(Array(5 - candidateUnits.length).fill(null)).slice(0, 5) as unknown as Unit[];
                    }
                } else {
                    // Fallback logic if ID not found (Should not happen)
                    enemyTeam = [new Unit(UNIT_TEMPLATES.rattata), null, null, null, null];
                }
            } else {
                // This block executes if there's NO selected opponent (e.g., debugging or not opening the modal)
                let fallbackPool = game.wins >= 12 ? CHAMPION_OPPONENTS : (game.wins >= 8 ? ELITE_OPPONENTS : (game.wins >= 5 ? ADVANCED_OPPONENTS : (game.wins >= 3 ? INTERM_OPPONENTS : NOVICE_OPPONENTS)));
                const def = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
                const fbCandidateUnits: Unit[] = [];
                for (const coreId of def.coreUnits) {
                    if (fbCandidateUnits.length >= enemyCount) break;
                    const t = UNIT_TEMPLATES[coreId];
                    if (t) {
                        const u = new Unit(t);
                        u.level = enemyBaseLevel;
                        fbCandidateUnits.push(u);
                    }
                }
                let fbFillCount = enemyCount - fbCandidateUnits.length;
                const fbShopTier = game.shop.getTier(game.turn);
                while (fbFillCount > 0) {
                    const allT = Object.values(UNIT_TEMPLATES).filter(t => t.id !== 'sprout' && !t.isHiddenFromShop && t.tier <= fbShopTier);
                    const t = getRandomEnemyTemplate(allT);
                    const u = new Unit(t);
                    u.level = enemyBaseLevel;
                    fbCandidateUnits.push(u);
                    fbFillCount--;
                }

                enemyTeam = fbCandidateUnits.concat(Array(5 - fbCandidateUnits.length).fill(null)).slice(0, 5) as unknown as Unit[];
            }

            // A. Apply forced stars (upgrades)
            let threeStarCount = enemyTeam.filter(u => u && u.level >= 3).length;
            if (isBossMatch && threeStarCount < forcedStarCount) {
                let needed = forcedStarCount - threeStarCount;
                for (const u of enemyTeam) {
                    if (needed <= 0) break;
                    if (u && u.level < 3) {
                        u.level = 3;
                        needed--;
                    }
                }
            }

            if (forcedTwoStarCount > 0 && !isBossMatch) {
                let needed = forcedTwoStarCount;
                for (const u of enemyTeam) {
                    if (needed <= 0) break;
                    if (u && u.level === 1) {
                        u.level = 2;
                        needed--;
                    }
                }
            }

            // Emulate evolution stat growth up to Level 3
            enemyTeam.forEach(u => {
                if (!u) return;
                const baseStats = UNIT_TEMPLATES[u.templateId]?.baseStats || u.stats;
                u.stats = { ...baseStats };
                for (let lv = 2; lv <= u.level; lv++) {
                    let bHp = Math.floor(baseStats.hp * 0.5);
                    let bAtk = Math.floor(baseStats.attack * 0.5);
                    u.stats.hp += bHp; u.stats.maxHp += bHp; u.stats.attack += bAtk;
                }

                // C. Turn-Based Difficulty & Stat Inflation
                const turnScalingStart = difficulty === 'MASTER' ? 3 : 5;
                if (game.difficultyScore >= turnScalingStart) {
                    let scaleFactor = 0.75;
                    if (difficulty === 'MASTER' && game.difficultyScore <= 4.5) scaleFactor = 0.4;

                    const turnScale = Math.floor(game.difficultyScore * scaleFactor);
                    u.stats.hp += turnScale; u.stats.maxHp += turnScale; u.stats.attack += Math.floor(turnScale / 1.5);

                    if (game.wins >= 8) {
                        const eIdx = game.wins - 7;
                        let eBHp = eIdx * 6; let eBAtk = eIdx * 3;
                        if (u.tier === 5) { eBHp = Math.ceil(eBHp * 0.5); eBAtk = Math.ceil(eBAtk * 0.5); }
                        else if (u.tier === 4) { eBHp = Math.ceil(eBHp * 0.75); eBAtk = Math.ceil(eBAtk * 0.75); }
                        u.stats.hp += eBHp; u.stats.maxHp += eBHp; u.stats.attack += eBAtk;
                    }
                }

                // --- Stat Normalization (Method B): Clamp to tier-based min/max ---
                // Prevents weak-base units (e.g. Drifloon 1/1) from being too frail,
                // and strong-base units (e.g. Sneasel 8/8) from being too dominant in the same tier.
                const statRange = (() => {
                    if (game.wins >= 11) return { minHp: 30, maxHp: 44, minAtk: 20, maxAtk: 28 }; // Champion
                    if (game.wins >= 8) return { minHp: 16, maxHp: 34, minAtk: 10, maxAtk: 22 }; // Elite Four
                    if (game.wins >= 4) return { minHp: 8, maxHp: 18, minAtk: 5, maxAtk: 13 }; // Intermediate
                    return { minHp: 1, maxHp: 12, minAtk: 1, maxAtk: 8 }; // Novice
                })();
                u.stats.hp = Math.min(Math.max(u.stats.hp, statRange.minHp), statRange.maxHp);
                u.stats.maxHp = Math.min(Math.max(u.stats.maxHp, statRange.minHp), statRange.maxHp);
                u.stats.attack = Math.min(Math.max(u.stats.attack, statRange.minAtk), statRange.maxAtk);

                if (u.battleImageUrl) u.imageUrl = u.battleImageUrl;
            });

            setInitialEnemyTeam([...enemyTeam]);

            const activeMultiplier = (difficulty === 'MASTER' && game.turn === 1) ? 1.0 : game.difficultyMultiplier;
            const activeBuffs = [...game.nextBattleBuffs];
            game.nextBattleBuffs = []; // Clear buffs after consumption
            simulatorRef.current = new BattleSimulator(game.playerTeam, enemyTeam, game.savedTeam, activeMultiplier, battleSpeed, game.psychicN, false, activeBuffs);
            const currentSim = simulatorRef.current;

            currentSim.onUpdate = () => {
                if (simulatorRef.current) {
                    setLogs([...simulatorRef.current.logs]);
                }
                setBattleTick((t: number) => t + 1);
            };
            setLogs([]);

            const runBattleLoop = async () => {
                if (!simulatorRef.current || isPausedRef.current) return;
                if ((simulatorRef.current as any).isProcessing) return;
                (simulatorRef.current as any).isProcessing = true;

                try {
                    const keepGoing = await simulatorRef.current.simulateStep();
                    setLogs([...simulatorRef.current.logs]);
                    setBattleTick((t: number) => t + 1);

                    if (!keepGoing) {
                        if (interval) clearInterval(interval);
                        document.querySelectorAll('.death-anim, .hurt-anim, .clash-anim').forEach(el => {
                            el.classList.remove('death-anim', 'hurt-anim', 'clash-anim');
                            (el as HTMLElement).style.removeProperty('--clash-offset');
                        });

                        setTimeout(() => {
                            if (simulatorRef.current) {
                                const result = simulatorRef.current.getResult() || 'DRAW';
                                game.lastResult = result;
                                setSelected(null);
                                setBattleResult(result);
                            }
                        }, 300 / battleSpeed);
                        return;
                    }
                } finally {
                    if (simulatorRef.current) (simulatorRef.current as any).isProcessing = false;
                }
            };

            let interval: ReturnType<typeof setInterval>;
            const initAndStart = async () => {
                if (simulatorRef.current) await simulatorRef.current.init();
                interval = setInterval(runBattleLoop, 1200 / battleSpeed);
            };
            initAndStart();

            return () => clearInterval(interval);

        } else {
            // Cleanup leftover animation classes when entering SHOP phase
            setTimeout(() => {
                document.querySelectorAll('.death-anim, .hurt-anim, .clash-anim').forEach(el => {
                    el.classList.remove('death-anim', 'hurt-anim', 'clash-anim');
                    (el as HTMLElement).style.removeProperty('--clash-offset');
                });
            }, 50);
            setInitialEnemyTeam([]);
        }
    }, [game.phase]);

    // Handle Battle Result Music
    useEffect(() => {
        if (battleResult === 'WIN') {
            const currentWins = game.wins;
            if (currentWins === 4 || currentWins === 8 || currentWins === 12) {
                music.playLevelUpSequence('gymwin');
            } else {
                music.play('gymwin', true);
            }
        } else if (battleResult === 'LOSS') {
            music.stop(); // Stops gymfight
        } else if (battleResult === 'DRAW') {
            music.stop();
        }
    }, [battleResult]);

    // Handle Timeout DRAW
    useEffect(() => {
        if (game.phase === GamePhase.BATTLE && !battleResult) {
            if (battleElapsedSeconds >= 60) {
                // Force Draw
                if (simulatorRef.current) {
                    setBattleResult('DRAW');
                }
            }
        }
    }, [battleElapsedSeconds, game.phase, battleResult]);

    // Actions
    const isTutorialActionAllowed = (actionType: string, payload?: any) => {
        if (tutorialStep === 0) return true;

        if (tutorialStep === 1) return false;
        if (tutorialStep === 2) {
            if (actionType !== 'BUY' && actionType !== 'SELECT_SHOP') return false;
            const unit = game.shop.slots[payload];
            const hasGastly = game.playerTeam.some(u => u?.family === 'gastly');
            if (!hasGastly) {
                return unit?.family === 'gastly';
            } else {
                return unit?.family === 'charmander' || unit?.family === 'squirtle';
            }
        }
        if (tutorialStep === 3) return actionType === 'SELECT_BOARD' || (actionType === 'SELECT_BOARD' && payload === 'gastly');
        if (tutorialStep === 4) return actionType === 'MOVE_BOARD' || actionType === 'SELECT_BOARD';
        if (tutorialStep === 5) return actionType === 'REROLL';
        if (tutorialStep === 6) {
            // Allow SELECT_SHOP so the unit card doesn't block the click through to the lock icon
            if (actionType === 'SELECT_SHOP' || actionType === 'LOCK') {
                return true;
            }
            return false;
        }
        if (tutorialStep === 7) return actionType === 'START_BATTLE';
        if (tutorialStep === 8) return (actionType === 'BUY' && game.shop.slots[payload]?.family === 'charmander') || actionType === 'MOVE_BOARD' || (actionType === 'SELECT_BOARD' && payload === 'charmander');
        if (tutorialStep === 9) return (actionType === 'BUY' && game.shop.slots[payload]?.family === 'cyndaquil') || actionType === 'MOVE_BOARD' || actionType === 'SELECT_BOARD';
        if (tutorialStep === 10) return actionType === 'START_BATTLE' || actionType === 'SELECT_BOARD' || actionType === 'MOVE_BOARD';
        if (tutorialStep === 11) return false;
        if (tutorialStep === 12) return false;
        return false;
    };

    const handleReroll = () => {
        if (!isTutorialActionAllowed('REROLL')) {
            if (tutorialStep > 0) triggerShake();
            return;
        }
        game.reroll();
        if (tutorialStep === 5) {
            // Force 2 Charmanders in the shop for Step 6 double lock tutorial
            game.shop.slots = [
                new Unit(UNIT_TEMPLATES.charmander),
                new Unit(UNIT_TEMPLATES.charmander),
                new Unit(UNIT_TEMPLATES.squirtle)
            ];
            setTutorialStep(6);
        }
        update();
    };
    const handleBuy = () => {
        if (selected && selected.source === 'SHOP') {
            if (!isTutorialActionAllowed('BUY', selected.index)) {
                if (tutorialStep > 0) triggerShake();
                return;
            }
            const shopUnit = game.shop.slots[selected.index];
            if (shopUnit && game.gold < 3) {
                if (tutorialStep > 0) triggerShake();
                setGoldErrorAnim(true);
                setTimeout(() => setGoldErrorAnim(false), 400);
                return;
            }

            const targetIdx = game.buyUnit(selected.index);
            if (shopUnit && targetIdx !== null) {
                const targetUnit = game.playerTeam[targetIdx];
                if (targetUnit && targetUnit.level > shopUnit.level) {
                    triggerEvolutionEffect(targetUnit);
                }

                // Auto-advance step 9 after buying cyndaquil
                if (tutorialStep === 9 && shopUnit.family === 'cyndaquil') {
                    setTutorialStep(10);
                }

                setSelected(null);
                update();
            }
        }
    };
    const handleSell = () => {
        if (!isTutorialActionAllowed('SELL')) {
            if (tutorialStep > 0) triggerShake();
            return;
        }
        if (selected && selected.source === 'BOARD') {
            game.sellUnit(selected.index);
            setSelected(null);
            update();
        }
    };
    const handleFreezeToggle = (index: number) => {
        if (!isTutorialActionAllowed('LOCK')) {
            if (tutorialStep > 0) triggerShake();
            return;
        }
        game.shop.toggleFreeze(index);

        // Step 6: Advance only when BOTH Charmanders (slots 0 and 1) are locked
        if (tutorialStep === 6 && game.shop.frozen[0] && game.shop.frozen[1]) {
            setTutorialStep(7);
        }
        update();
    };
    const handleStartBattle = () => {
        if (!isTutorialActionAllowed('START_BATTLE')) {
            if (tutorialStep > 0) triggerShake();
            return;
        }
        if (game.gold > 0 && tutorialStep === 0) {
            setConfirmDialog({
                message: `進入戰鬥階段？`,
                description: '未花完的 ' + game.gold + '$ ，將會直接消失！',
                onConfirm: () => {
                    setConfirmDialog(null);
                    executeStartBattle();
                }
            });
            return;
        }
        executeStartBattle();
    };

    const executeStartBattle = () => {
        music.stop(); // Stop prep music
        setSelected(null);
        setBattleResult(null);

        // Prepare opponent choices
        if (tutorialStep > 0) {
            if (tutorialStep < 10) {
                // First tutorial opponent: Brock Easter Egg (Three ways to face Brock!)
                setOpponentChoices([
                    { id: 'novice_3', name: '小剛', url: 'gym/小剛01.webp', difficulty: 'EASY' },
                    { id: 'novice_3', name: '小剛', url: 'gym/小剛02.webp', difficulty: 'NORMAL' },
                    { id: 'novice_3', name: '小剛', url: 'gym/小剛03.webp', difficulty: 'HARD' }
                ]);
            } else {
                // Second tutorial: Force Champions to ensure player defeat
                const shuffledChampions = [...CHAMPION_OPPONENTS].sort(() => 0.5 - Math.random());
                setOpponentChoices(shuffledChampions.slice(0, 3));
            }
            setShowOpponentSelect(true);
            return;
        }

        // Determine which opponent pool to use based on game.wins
        let npcPool: any[] = [];
        if (game.wins >= 12) {
            npcPool = CHAMPION_OPPONENTS;
        } else if (game.wins >= 8) {
            npcPool = ELITE_OPPONENTS;
        } else if (game.wins >= 5) {
            npcPool = ADVANCED_OPPONENTS;
        } else if (game.wins >= 3) {
            npcPool = INTERM_OPPONENTS;
        } else {
            npcPool = NOVICE_OPPONENTS;
        }

        // We show opponent choices for Boss matches (Wins: 8~11 or 12) or special gym levels.
        // Actually, user spec says: "這 4 場中，每場會在對手畫面跳出從四天王中挑選。 前八勝階段... 這些館主將出現在一般戰鬥中供玩家挑戰"
        // Let's always show the opponent choice if we have a pool.
        const ALL_NPCS = npcPool;
        const unseenNpCS = ALL_NPCS.filter(boss => !game.defeatedOpponentIds?.includes(boss.id));
        const finalPool = unseenNpCS.length > 0 ? unseenNpCS : ALL_NPCS;

        const shuffled = [...finalPool].sort(() => 0.5 - Math.random());
        setOpponentChoices(shuffled.slice(0, 3));
        setShowOpponentSelect(true);
    };

    const handleSelect = (unit: Unit | null, index: number, source: 'SHOP' | 'BOARD' | 'ENEMY') => {
        // --- Fallback for mobile/touch: Click Source -> Click Target ---
        if (game.phase === GamePhase.SHOP && selected) {
            const { index: sourceIndex, source: sourceLoc } = selected;

            // If we click a valid target location (the Board) while holding something
            if (source === 'BOARD') {
                if (sourceLoc === 'BOARD') {
                    if (!isTutorialActionAllowed('MOVE_BOARD')) return;
                    // Try to Move or Synthesize
                    if (sourceIndex !== index) {
                        const oldLevel = game.playerTeam[sourceIndex]?.level || 0;
                        game.moveUnit(sourceIndex, index);
                        const targetUnit = game.playerTeam[index];
                        if (targetUnit && targetUnit.level > oldLevel) {
                            triggerEvolutionEffect(targetUnit);
                        }
                        setSelected(null);
                        update();
                        return;
                    }
                } else if (sourceLoc === 'SHOP') {
                    if (!isTutorialActionAllowed('BUY', sourceIndex)) return;
                    // Try to Buy or Synthesize from Shop
                    const shopUnit = game.shop.slots[sourceIndex];
                    if (shopUnit && game.gold < 3) {
                        setGoldErrorAnim(true);
                        setTimeout(() => setGoldErrorAnim(false), 400);
                        return;
                    }

                    const targetIdx = game.buyUnit(sourceIndex, index);
                    if (shopUnit && targetIdx !== null) {
                        const targetUnit = game.playerTeam[targetIdx];
                        if (targetUnit && targetUnit.level > shopUnit.level) {
                            triggerEvolutionEffect(targetUnit);
                        }
                        setSelected(null);
                        update();
                        return;
                    }
                }
            }
        }

        if (unit) {
            if (source === 'BOARD' && !isTutorialActionAllowed('SELECT_BOARD', unit.family)) {
                if (tutorialStep > 0) triggerShake();
                return;
            }
            if (source === 'SHOP' && !isTutorialActionAllowed('BUY', index) && tutorialStep > 0) {
                triggerShake();
                return; // Prevent highlighting invalid shop items
            }

            // Toggle selection if clicking the same unit
            if (selected && selected.unit === unit && selected.source === source && selected.index === index) {
                setSelected(null);
            } else {
                setSelected({ unit, index, source });
            }
        } else {
            // Clicking empty slot
            setSelected(null);
        }
    };

    const onDragStart = (e: React.DragEvent, index: number, source: 'SHOP' | 'BOARD') => {
        if (source === 'BOARD' && !isTutorialActionAllowed('MOVE_BOARD')) {
            if (tutorialStep > 0) triggerShake();
            e.preventDefault();
            return;
        }
        if (source === 'SHOP' && !isTutorialActionAllowed('BUY', index)) {
            if (tutorialStep > 0) triggerShake();
            e.preventDefault();
            return;
        }

        setDraggedItem({ index, source });
        e.dataTransfer.effectAllowed = "move";
        // Sync selected with dragged for visual consistency
        const unit = source === 'SHOP' ? game.shop.slots[index] : game.playerTeam[index];
        if (unit) setSelected({ unit, index, source });
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const onDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();

        const sourceItem = draggedItem || (selected?.source !== 'ENEMY' ? selected : null);

        if (sourceItem) {
            const { index: sourceIndex, source } = sourceItem;

            if (source === 'BOARD') {
                if (!isTutorialActionAllowed('MOVE_BOARD')) {
                    setDraggedItem(null);
                    setSelected(null);
                    return;
                }
                if (sourceIndex !== targetIndex) {
                    const oldLevel = game.playerTeam[sourceIndex]?.level || 0;
                    game.moveUnit(sourceIndex, targetIndex);
                    const targetUnit = game.playerTeam[targetIndex];
                    if (targetUnit && targetUnit.level > oldLevel) {
                        triggerEvolutionEffect(targetUnit);
                    }
                    update();
                }
            } else if (source === 'SHOP') {
                if (!isTutorialActionAllowed('BUY', sourceIndex)) {
                    setDraggedItem(null);
                    setSelected(null);
                    return;
                }
                const shopUnit = game.shop.slots[sourceIndex];

                if (shopUnit && game.gold < 3) {
                    setGoldErrorAnim(true);
                    setTimeout(() => setGoldErrorAnim(false), 400);
                    setDraggedItem(null);
                    setSelected(null);
                    return;
                }

                const targetIdx = game.buyUnit(sourceIndex, targetIndex);
                if (shopUnit && targetIdx !== null) {
                    const targetUnit = game.playerTeam[targetIdx];
                    if (targetUnit && targetUnit.level > shopUnit.level) {
                        triggerEvolutionEffect(targetUnit);
                    }
                    update();
                }
            }
        }
        setDraggedItem(null);
        setSelected(null);
    };

    const handleOpponentSelect = (opponent: { id?: string, name: string, url: string, difficulty?: string }) => {
        setSelectedOpponent(opponent as { id: string, name: string, url: string });
        if (opponent.id) {
            game.currentOpponentId = opponent.id;
        }
        if (opponent.difficulty) {
            game.currentOpponentDifficulty = opponent.difficulty;
        }
        setShowOpponentSelect(false);
        game.startBattlePhase();
        setBattleResult(null);
        setLogs([]);
        setBattleTick(0);
        update();
    };

    const handleBattleResultClick = () => {
        if (game.phase === 'BATTLE') {
            music.stop(); // Stop victory music
            const hpBefore = game.lives;
            const result = game.lastResult;

            if (result === 'WIN') {
                game.endBattle('WIN');
                setRewardChoices([...game.rewardChoices]);
            } else {
                game.endBattle(result!);
            }

            if (game.lives < hpBefore) {
                setHpLossAnim(true);
                setTimeout(() => setHpLossAnim(false), 800);
            }
        }

        if (tutorialStep === 7) setTutorialStep(8);
        if (tutorialStep === 10) setTutorialStep(11);

        simulatorRef.current = null;
        setBattleResult(null);
        update();
    };

    const handleRewardSelect = (reward: any) => {
        game.applyReward(reward);
        setRewardChoices([]); // Clear UI state immediately
        update();
    };

    // Calculate Synergies (All)
    const synergyStatus = getSynergyStatus(game.playerTeam);

    return (
        <div className="game-container" onClick={() => {
            if (focusedDifficulty) setFocusedDifficulty(null);
            setActiveSynergyId(null);
        }}>
            {/* Modal Components */}
            {confirmDialog && (
                <div className="premium-confirm-overlay" onClick={() => setConfirmDialog(null)}>
                    <div className="premium-confirm-box" onClick={(e) => e.stopPropagation()}>
                        <h2 className="premium-confirm-title">{confirmDialog.message}</h2>
                        {confirmDialog.description && (
                            <p className="premium-confirm-description">{confirmDialog.description}</p>
                        )}
                        <div className="premium-confirm-actions">
                            <button className="premium-confirm-btn confirm-btn-yes" onClick={confirmDialog.onConfirm}>確定</button>
                            <button className="premium-confirm-btn confirm-btn-no" onClick={() => setConfirmDialog(null)}>取消</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tutorial Modal shows if difficulty selected but tutorial not started/ended */}
            {showTutorial && tutorialStep === 0 && difficulty !== null && <TutorialModal onClose={() => setShowTutorial(false)} onStartTutorial={startTutorial} />}

            {/* Reward Selection Overlay (Z-Index 20000) */}
            {game.phase === 'REWARD' && (
                <div className="opponent-select-overlay show" style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 20000,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    <h2 style={{
                        color: '#fff',
                        fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
                        marginBottom: 'clamp(20px, 4vw, 40px)',
                        textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                        letterSpacing: '4px'
                    }}>
                        請選擇你的獎勵
                    </h2>

                    <div className="opponent-cards-container" style={{
                        display: 'flex',
                        gap: 'clamp(20px, 5vw, 60px)',
                        justifyContent: 'center',
                        flexWrap: 'wrap'
                    }}>
                        {rewardChoices.map((reward: any, idx) => (
                            <div
                                key={idx}
                                className="opponent-card"
                                onClick={() => handleRewardSelect(reward)}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                                    padding: 'clamp(15px, 3vw, 25px)',
                                    borderRadius: '16px',
                                    border: '2px solid rgba(255,255,255,0.1)',
                                    transition: 'all 0.2s',
                                    width: 'clamp(130px, 25vw, 200px)', // Matched to opponent-card width
                                    position: 'relative',
                                    minHeight: '260px' // Slightly adjusted for items
                                }}
                            >
                                <img
                                    src={reward.imageUrl}
                                    alt={reward.item}
                                    style={{
                                        width: 'clamp(80px, 15vw, 120px)', // Matched scale
                                        height: 'clamp(80px, 15vw, 120px)',
                                        objectFit: 'contain',
                                        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
                                        marginBottom: '15px'
                                    }}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'item/星星碎片.png';
                                    }}
                                />

                                <div className="opponent-name" style={{
                                    color: '#fff',
                                    fontSize: '1.4rem',
                                    fontWeight: 'bold',
                                    letterSpacing: '2px',
                                    marginBottom: '10px',
                                    textAlign: 'center'
                                }}>
                                    {reward.item}
                                </div>

                                {/* Temporary Badge */}
                                {(reward.category === 'BATTLE_SYNERGY' || reward.category === 'BATTLE_NONE') && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '10px',
                                        left: '10px',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        fontWeight: '900',
                                        color: '#fff',
                                        zIndex: 20,
                                        backgroundColor: '#0ea5e9', // Blue color similar to NORMAL difficulty
                                        boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
                                        textTransform: 'uppercase',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        letterSpacing: '1px'
                                    }}>
                                        暫時
                                    </div>
                                )}

                                <div style={{
                                    color: '#cbd5e1',
                                    fontSize: '1.05rem',
                                    textAlign: 'left',
                                    lineHeight: '1.6',
                                    padding: '0 15px',
                                    width: '100%'
                                }}>
                                    {reward.effect}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tutorial Message Box / Mask (Steps 1-11) */}
            {
                tutorialStep > 0 && tutorialStep <= 11 && hasStarted && !showOpponentSelect && !showEncyclopedia && (game.phase === GamePhase.SHOP || tutorialStep === 11) && (
                    <>
                        <div className="tutorial-mask" onClick={() => (tutorialStep === 1 || tutorialStep === 11) ? handleTutorialNext() : null} />
                        {tutorialStep === 1 ? (
                            <div className="tutorial-message-box" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
                                <div className="tutorial-actions" style={{ position: 'absolute', top: '100px', right: '20px' }}>
                                    <button className="tutorial-btn-continue" onClick={(e) => { e.stopPropagation(); handleTutorialNext(); }}>
                                        點擊繼續 ⏭
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className={`tutorial-message-box ${tutorialShake ? 'shake-anim' : ''}`}>
                                <div className="tutorial-text">
                                    {tutorialStep === 2 && "每回合都會獲得10$\n🎯任務：購買寶可夢"}
                                    {tutorialStep === 3 && "認識每隻寶可夢\n🎯任務：查看招式並關閉面板"}
                                    {tutorialStep === 4 && "調整陣容順序\n🎯任務：將鬼斯移動到其他位置"}
                                    {tutorialStep === 5 && "花費1$刷新商店\n🎯任務：點擊按鈕刷新商店角色"}
                                    {tutorialStep === 6 && "鎖定角色保留到下回合\n🎯任務：點擊鎖定所有小火龍"}
                                    {tutorialStep === 7 && "選擇要挑戰的訓練家\n🎯任務：點擊戰鬥按鈕"}
                                    {tutorialStep === 8 && "點擊或拖曳角色合成\n🎯任務：購買並合成小火龍"}
                                    {tutorialStep === 9 && "開啟羈絆來提高強度\n🎯任務：購買火球鼠"}
                                    {tutorialStep === 10 && "挑戰更強的訓練家\n🎯任務：點擊戰鬥按鈕"}
                                    {tutorialStep === 11 && "戰敗時將減少生命值\n生命值歸零將結束遊戲‼️"}
                                </div>
                            </div>
                        )}
                    </>
                )
            }

            {/* Tutorial Completion Screen (Step 12) */}
            {
                tutorialStep === 12 && (
                    <div className="battle-result-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.98)', zIndex: 30000, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={handleRestart}>
                        <div className="result-content" style={{ textAlign: 'center' }}>
                            <div className="result-title" style={{ fontSize: '4.5rem', color: '#ffd700', textShadow: '0 0 40px rgba(255,215,0,0.6)', marginBottom: '15px' }}>
                                遊戲教學已結束
                            </div>
                            <div className="result-subtitle" style={{ fontSize: '2rem', color: '#fff', marginBottom: '50px', opacity: 0.9 }}>
                                擊敗所有訓練師，成為寶可夢冠軍！
                            </div>
                            <div style={{ fontSize: '1.3rem', color: '#aaa', animation: 'pulse 1.5s infinite' }}>
                                點擊任意處重新開始
                            </div>
                        </div>
                    </div>
                )
            }


            {/* Orientation Lock Overlay */}
            {
                isPortrait && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, bottom: 0, right: 0,
                        background: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #020617 100%)',
                        zIndex: 10001,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', textAlign: 'center', padding: '20px',
                        backdropFilter: 'blur(20px)'
                    }}>
                        <div className="rotate-icon" style={{
                            fontSize: '5rem',
                            marginBottom: '30px',
                            filter: 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.5))'
                        }}>📱</div>
                        <h2 style={{
                            fontSize: '1.8rem',
                            fontWeight: 'bold',
                            letterSpacing: '4px',
                            background: 'linear-gradient(to bottom, #fff, #94a3b8)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            margin: 0,
                            lineHeight: '1.4'
                        }}>請旋轉手機<br />以開始遊戲</h2>
                    </div>
                )
            }

            {/* Mute Toggle Button removed from here */}

            {/* Loading & Start Screen */}
            {
                !hasStarted && (
                    <div className="startup-overlay"
                        style={{
                            position: 'fixed', top: 0, left: 0, bottom: 0, right: 0,
                            background: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #020617 100%)',
                            zIndex: 10000, display: 'flex', flexDirection: 'column',
                            justifyContent: 'center', alignItems: 'center', gap: '30px'
                        }}>
                        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                            <h1 style={{
                                fontSize: '5rem',
                                margin: '0',
                                letterSpacing: '12px',
                                background: 'linear-gradient(to bottom, #fff, #94a3b8)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.1))',
                                fontWeight: 900
                            }}>
                                POKEMON<br />AUTOCHESS
                            </h1>
                        </div>

                        <div className="loading-container" style={{ width: '600px', textAlign: 'center' }}>
                            <div className="loading-bar-wrapper" style={{
                                width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)',
                                borderRadius: '3px', overflow: 'hidden', marginBottom: '20px',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <div className="loading-bar-fill" style={{
                                    width: `${loadingProgress}%`, height: '100%',
                                    background: 'linear-gradient(90deg, #60a5fa, #3b82f6)',
                                    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)'
                                }} />
                            </div>
                            <p style={{ color: '#94a3b8', fontSize: '1rem', letterSpacing: '4px', margin: 0, opacity: 0.7 }}>
                                {hasLoaded ? '系統就緒' : `資源載入中... ${loadingProgress}%`}
                            </p>
                        </div>

                        <button
                            className={`start-game-btn ${hasLoaded ? 'is-ready' : ''}`}
                            disabled={!hasLoaded}
                            onClick={() => {
                                music.play('start', true);
                                setHasStarted(true);
                            }}
                        >
                            開始遊戲
                        </button>

                        <p style={{
                            position: 'absolute',
                            bottom: '20px',
                            color: 'rgba(148, 163, 184, 0.3)',
                            fontSize: '0.7rem',
                            letterSpacing: '2px'
                        }}>v4.8.6 - PREMIUM EDITION</p>
                    </div>
                )
            }

            {/* Difficulty Selection Screen (Only after Start) */}
            {
                (hasStarted && difficulty === null) && (
                    <div className="startup-overlay"
                        style={{
                            position: 'fixed', top: 0, left: 0, bottom: 0, right: 0,
                            background: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #020617 100%)',
                            zIndex: 10000, display: 'flex', flexDirection: 'column',
                            justifyContent: 'center', alignItems: 'center', gap: '40px'
                        }}>
                        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                            <h1 style={{
                                fontSize: '4.5rem',
                                margin: '0',
                                letterSpacing: '10px',
                                background: 'linear-gradient(to bottom, #fff, #94a3b8)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.1))',
                                fontWeight: 900
                            }}>
                                POKEMON<br />AUTOCHESS
                            </h1>
                        </div>

                        <div className="difficulty-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '30px',
                            maxWidth: '950px',
                            width: '94%',
                            margin: '0 auto'
                        }}>
                            {[
                                { id: 'NORMAL', name: '普通', icon: normalBall, color: '#ef4444' },
                                { id: 'GREAT', name: '超級', icon: greatBall, color: '#3b82f6' },
                                { id: 'ULTRA', name: '高級', icon: ultraBall, color: '#eab308' },
                                { id: 'MASTER', name: '大師', icon: masterBall, color: '#a855f7' }
                            ].map(d => (
                                <button
                                    key={d.id}
                                    className={`difficulty-btn ${focusedDifficulty === d.id ? 'is-focused' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (focusedDifficulty === d.id) {
                                            handleDifficultySelect(d.id as any);
                                        } else {
                                            setFocusedDifficulty(d.id as any);
                                        }
                                    }}
                                    style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px',
                                        padding: '30px 15px', background: 'rgba(0,0,0,0.4)', border: `1px solid ${d.color}33`,
                                        borderRadius: '24px', cursor: 'pointer',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        width: '100%',
                                        minHeight: '200px',
                                        backdropFilter: 'blur(10px)',
                                        boxShadow: `0 10px 30px rgba(0,0,0,0.5), inset 0 0 20px ${d.color}11`
                                    }}
                                >
                                    <img src={d.icon} alt={d.name} style={{ width: '96px', height: '96px', filter: `drop-shadow(0 0 20px ${d.color}66)` }} />
                                    <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: d.color, letterSpacing: '2px' }}>{d.name}</span>
                                </button>
                            ))}
                        </div>

                        <div style={{ textAlign: 'center', marginTop: '20px', marginBottom: '5vh' }} className="startup-footer-box">
                            <p style={{
                                color: '#94a3b8',
                                fontSize: '1.1rem',
                                letterSpacing: '4px',
                                opacity: 0.8,
                                padding: '0 20px'
                            }}>選擇本次挑戰難度</p>
                        </div>
                    </div>
                )
            }

            {/* Header */}
            <div className="header">
                <div className="header-section">
                    {difficulty && (
                        <div className={`difficulty-badge ${difficulty}`} style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px',
                            background: 'rgba(255,255,255,0.05)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)',
                            cursor: 'pointer', transition: 'all 0.2s'
                        }}
                            title="重新選擇難度"
                            onClick={() => {
                                setConfirmDialog({
                                    message: '重新選擇難度？',
                                    description: '遊戲進度將被清除，並重新開始！',
                                    onConfirm: () => {
                                        setConfirmDialog(null);
                                        setDifficulty(null);
                                        handleRestart();
                                    }
                                });
                            }}>
                            <img src={
                                difficulty === 'NORMAL' ? normalBall :
                                    difficulty === 'GREAT' ? greatBall :
                                        difficulty === 'ULTRA' ? ultraBall : masterBall
                            } alt={difficulty} style={{ width: '20px', height: '20px' }} />
                            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', opacity: 0.8 }}>{
                                difficulty === 'NORMAL' ? '普通' :
                                    difficulty === 'GREAT' ? '超級' :
                                        difficulty === 'ULTRA' ? '高級' : '大師'
                            }</span>
                        </div>
                    )}
                    {difficulty && (
                        <>
                            <span className={`${hpLossAnim ? 'shake-anim' : ''} ${tutorialStep === 11 ? 'tutorial-elevate synthetic-glow' : ''}`} style={{ color: hpLossAnim ? '#ef4444' : undefined, zIndex: tutorialStep === 11 ? 10005 : 'auto', position: 'relative', padding: '0 8px' }}>❤️ 生命: {game.lives}</span>
                            <span className={`${tutorialStep === 2 ? 'tutorial-highlight tutorial-pointer-left' : ''} ${goldErrorAnim ? 'shake-anim' : ''}`} style={{ padding: '0 8px', color: goldErrorAnim ? '#ef4444' : undefined, borderRadius: '8px', zIndex: tutorialStep === 2 ? 10000 : 'auto', position: 'relative' }}>💰 金幣: {game.gold}</span>
                        </>
                    )}
                </div>
                <div className="header-section">
                    {difficulty && (
                        <>
                            <span style={{ color: game.wins < 8 ? '#fff' : '#888' }}>🏅 道館: {Math.min(game.wins, 8)}/8</span>
                            <span style={{ color: (game.wins >= 8 && game.wins < 12) ? '#fbbf24' : '#888' }}>⚔️ 四天王: {Math.max(0, Math.min(game.wins - 8, 4))}/4</span>
                            <span style={{ color: game.wins >= 12 ? '#f472b6' : '#888' }}>👑 冠軍: {Math.max(0, Math.min(game.wins - 12, 1))}/1</span>
                        </>
                    )}
                    {/* Help & Mute Toggle Buttons inside Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '10px' }}>
                        <button
                            className={`mute-toggle-btn-header ${showTutorial ? 'is-active' : ''}`}
                            onClick={() => {
                                if (game.phase === GamePhase.BATTLE) return;
                                setShowTutorial(true);
                            }}
                            title="遊戲指南 (Tutorial)"
                            style={{
                                color: showTutorial ? '#facc15' : '#aaa',
                                border: showTutorial ? '1px solid #facc15' : '1px solid transparent',
                                background: showTutorial ? 'rgba(250,204,21,0.1)' : 'transparent',
                                borderRadius: '50%',
                                opacity: game.phase === GamePhase.BATTLE ? 0.3 : 1,
                                cursor: game.phase === GamePhase.BATTLE ? 'default' : 'pointer'
                            }}
                        >
                            ❓
                        </button>
                        <button
                            className="mute-toggle-btn-header"
                            onClick={() => {
                                if (game.phase === GamePhase.BATTLE) return;
                                setShowEncyclopedia(true);
                            }}
                            title="圖鑑"
                            style={{
                                opacity: game.phase === GamePhase.BATTLE ? 0.3 : 1,
                                cursor: (game.phase === GamePhase.BATTLE) ? 'default' : 'pointer',
                                zIndex: 'auto',
                                position: 'relative'
                            }}
                        >
                            📖
                        </button>
                        <button
                            className="mute-toggle-btn-header"
                            onClick={toggleMute}
                            title={isMuted ? "開啟聲音" : "靜音"}
                        >
                            {isMuted ? '🔇' : '🔊'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Battle Result Overlay */}
            {
                battleResult && (
                    <div className="battle-result-overlay" onClick={handleBattleResultClick} style={{ zIndex: 10002 }}>
                        <div className="result-content">
                            <div className="result-title">
                                {battleResult === 'WIN' ? 'VICTORY ⭕' :
                                    battleResult === 'LOSS' ? 'DEFEAT ❌' : 'DRAW 🤝'}
                            </div>
                            {battleResult === 'WIN' && (game.wins === 3 || game.wins === 7 || game.wins === 11) && (
                                <div className="result-subtitle" style={{ fontSize: '1.5rem', color: '#ffffffff', marginBottom: '20px' }}>增加一點生命 ❤️</div>
                            )}
                            <div className="result-subtitle">點擊任意處繼續</div>
                        </div>
                    </div>
                )
            }

            {/* Game Over / Victory Overlay */}
            {
                (game.phase === GamePhase.VICTORY || game.phase === GamePhase.GAME_OVER) && (
                    <div
                        className="battle-result-overlay"
                        style={{
                            position: 'fixed', // Key Fix: Ignore parent height collapse
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.8)',
                            backdropFilter: 'blur(10px)',
                            zIndex: 10002,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            cursor: 'pointer'
                        }}
                        onClick={() => {
                            if (game.phase === GamePhase.VICTORY) {
                                setDifficulty(null);
                                handleRestart();
                            } else {
                                handleRestart();
                            }
                        }}
                    >
                        {/* Main Message - Visual center of screen */}
                        <div className="result-content" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '15px',
                            transform: 'translateY(-10%)'
                        }}>
                            <div className="result-title" style={{
                                fontSize: 'min(6rem, 15vw)',
                                margin: 0,
                                color: '#fff',
                                textShadow: '0 0 40px rgba(255,255,255,0.2), 0 10px 40px rgba(0,0,0,0.8)',
                                animation: 'fadeInUp 0.8s ease-out'
                            }}>
                                {game.phase === GamePhase.VICTORY ? 'CHAMPION! 🏆' : 'GAME OVER 💀'}
                            </div>
                            <div className="result-subtitle" style={{
                                fontSize: 'min(1.8rem, 5vw)',
                                fontWeight: 'bold',
                                color: '#fff',
                                letterSpacing: '3px',
                                background: 'rgba(255,255,255,0.15)',
                                padding: '10px 40px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '50px',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                                animation: 'fadeInUp 1s ease-out'
                            }}>
                                {game.phase === GamePhase.VICTORY ? '恭喜你稱霸了聯盟！' : '眼前變得一片漆黑...'}
                            </div>
                        </div>

                        {/* Operational Area - Fixed at bottom of screen, below EVERYTHING */}
                        <div style={{
                            position: 'absolute',
                            bottom: '40px', // Real bottom of the window
                            color: '#aaa',
                            fontSize: '1.2rem',
                            letterSpacing: '2px',
                            animation: 'pulse 2s infinite',
                            borderBottom: '1px solid rgba(255,255,255,0.2)',
                            paddingBottom: '5px'
                        }}>
                            [ 點擊任意處重新開始 ]
                        </div>
                    </div>
                )
            }

            {/* Opponent Selection Overlay */}
            {
                showOpponentSelect && (
                    <div
                        className="opponent-select-overlay"
                        style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.85)',
                            backdropFilter: 'blur(8px)',
                            zIndex: 10001,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            animation: 'fadeIn 0.3s ease-out'
                        }}
                    >
                        <h2 style={{
                            color: '#fff',
                            fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
                            marginBottom: 'clamp(20px, 4vw, 40px)',
                            textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                            letterSpacing: '4px'
                        }}>
                            請選擇你的對手
                        </h2>

                        <div className="opponent-cards-container" style={{
                            display: 'flex',
                            gap: 'clamp(20px, 5vw, 60px)',
                            justifyContent: 'center',
                            flexWrap: 'wrap'
                        }}>
                            {opponentChoices.map((npc: any, idx) => (
                                <div
                                    key={idx}
                                    className="opponent-card"
                                    onClick={() => handleOpponentSelect(npc)}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                                        padding: 'clamp(15px, 3vw, 25px)',
                                        borderRadius: '16px',
                                        border: '2px solid rgba(255,255,255,0.1)',
                                        transition: 'all 0.2s',
                                        width: 'clamp(130px, 25vw, 200px)',
                                        position: 'relative'
                                    }}
                                >
                                    {/* Difficulty Badge */}
                                    {npc.difficulty && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '10px',
                                            left: '10px',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '0.85rem',
                                            fontWeight: '900',
                                            color: '#fff',
                                            zIndex: 20,
                                            backgroundColor:
                                                npc.difficulty === 'EASY' ? '#22c55e' :
                                                    npc.difficulty === 'NORMAL' ? '#0ea5e9' :
                                                        npc.difficulty === 'HARD' ? '#f97316' : '#ef4444',
                                            boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
                                            textTransform: 'uppercase',
                                            border: '1px solid rgba(255,255,255,0.3)',
                                            letterSpacing: '1px'
                                        }}>
                                            {npc.difficulty === 'VERY_HARD' ? 'EXTREME' : npc.difficulty}
                                        </div>
                                    )}

                                    <img
                                        src={npc.url}
                                        alt={npc.name}
                                        style={{
                                            width: 'clamp(100px, 20vw, 150px)',
                                            height: 'clamp(100px, 20vw, 150px)',
                                            objectFit: 'contain',
                                            marginBottom: '15px',
                                            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))'
                                        }}
                                    />
                                    <div className="opponent-name" style={{
                                        color: '#fff',
                                        fontSize: 'clamp(1.2rem, 2.5vw, 1.8rem)',
                                        fontWeight: 'bold',
                                        letterSpacing: '2px',
                                        textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
                                        textAlign: 'center'
                                    }}>
                                        {npc.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            <div className={`board-container ${game.phase === GamePhase.BATTLE ? 'is-battling' : ''}`} onClick={() => setSelected(null)}>
                {/* 1. Synergies (Player) */}
                <div className={`board-synergies ${([2, 3, 4, 7, 8, 9, 10, 11].includes(tutorialStep) && game.phase !== GamePhase.BATTLE) ? 'tutorial-elevate' : ''}`}>
                    {synergyStatus.map(syn => (
                        <SynergyIcon
                            key={syn.id}
                            synergy={syn}
                            count={syn.count}
                            units={syn.units}
                            activeFamilies={syn.activeFamilies}
                            className=""
                            activeSynergyId={activeSynergyId}
                            setActiveSynergyId={setActiveSynergyId}
                        />
                    ))}
                </div>

                {/* 2. Synergies (Enemy) */}
                {(initialEnemyTeam.length > 0 || displayEnemyTeam) && (
                    <div className="board-synergies" style={{ left: 'auto', right: '10px', flexDirection: 'row-reverse' }}>
                        {getSynergyStatus(initialEnemyTeam.length > 0 ? initialEnemyTeam : (displayEnemyTeam || [])).map(syn => (
                            <SynergyIcon key={syn.id} synergy={syn} count={syn.count} units={syn.units} activeFamilies={syn.activeFamilies} isEnemy={true} activeSynergyId={activeSynergyId} setActiveSynergyId={setActiveSynergyId} />
                        ))}
                    </div>
                )}

                {/* 3. Timeout Countdown */}
                {game.phase === GamePhase.BATTLE && !battleResult && battleElapsedSeconds >= 30 && (
                    <div className="battle-timeout-overlay" style={{ top: '5%', bottom: 'auto' }}>
                        <div className="timeout-countdown">{Math.max(0, 60 - battleElapsedSeconds)}</div>
                    </div>
                )}

                {/* 4. Units Area */}
                <div className={`board-teams-horizontal ${(tutorialStep === 10 && game.phase === GamePhase.SHOP) ? 'tutorial-elevate' : ''}`} style={{
                    zIndex: (tutorialStep === 10 && game.phase === GamePhase.SHOP) ? 9999 : 'auto',
                    filter: (game.phase === GamePhase.BATTLE) ? 'none' : (tutorialStep > 0 && tutorialStep !== 2 && tutorialStep !== 3 && tutorialStep !== 4 && tutorialStep !== 7 && tutorialStep !== 8 && tutorialStep !== 9 && tutorialStep !== 10 && tutorialStep !== 11) ? 'grayscale(100%) brightness(50%)' : 'none'
                }}>
                    {/* Left Side: Player Team */}
                    <div className={`board-side player ${(tutorialStep === 8 || tutorialStep === 9 || tutorialStep === 10) && game.phase === GamePhase.SHOP ? 'tutorial-elevate' : ''}`}>
                        {Array.from({ length: 5 }).map((_, i) => {
                            const unit = displayPlayerTeam?.[i] || null;
                            const isInteractive = game.phase === GamePhase.SHOP;
                            // Check for Step 8: if we are building Charmander evolution, highlight the existing board Charmander until it hits tier 2
                            const step8CharmanderTarget = tutorialStep === 8 && unit?.family === 'charmander' && unit.level < 2;

                            return (
                                <div
                                    key={unit ? unit.id : `player-empty-${i}`}
                                    className={`unit-wrapper ${!unit && selected && selected.source !== 'ENEMY' ? 'is-target-eligible' : ''} ${((tutorialStep === 3 && unit?.family === 'gastly') || (tutorialStep === 4 && (unit?.family === 'gastly' || selected?.unit?.family === 'gastly'))) && game.phase === GamePhase.SHOP ? 'tutorial-highlight' : ''} ${(step8CharmanderTarget && game.phase === GamePhase.SHOP) ? 'synthetic-glow' : ''}`}
                                    onDragOver={isInteractive ? onDragOver : undefined}
                                    onDrop={isInteractive ? (e) => onDrop(e, i) : undefined}
                                    onClick={(e) => {
                                        if (isInteractive && selected) {
                                            e.stopPropagation();
                                            handleSelect(unit, i, 'BOARD');
                                        }
                                    }}
                                >
                                    <UnitCard
                                        unit={unit}
                                        onClick={() => handleSelect(unit, i, 'BOARD')}
                                        draggable={isInteractive && !!unit}
                                        onDragStart={(e: React.DragEvent) => onDragStart(e, i, 'BOARD')}
                                        isInteractive={isInteractive}
                                        isSelected={selected?.unit === unit && selected?.source === 'BOARD'}
                                        silenced={unit ? simulatorRef.current?.unitStates.get(unit)?.isSilenced : false}
                                        hpSwapped={unit ? simulatorRef.current?.unitStates.get(unit)?.hpSwapped : false}
                                        isEvolving={unit && evolvingUnitId === unit.id}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    <div className="board-vs">VS</div>

                    {/* Right Side: Enemy Team (Flipped) */}
                    <div className="board-side enemy">
                        {Array.from({ length: 5 }).map((_, i) => {
                            const unit = displayEnemyTeam?.[i] || null;
                            return (
                                <div key={unit ? unit.id : `empty-${i}`} className="unit-wrapper">
                                    <UnitCard
                                        unit={unit}
                                        onClick={() => handleSelect(unit, i, 'ENEMY')}
                                        flipped={true}
                                        silenced={unit ? simulatorRef.current?.unitStates.get(unit)?.isSilenced : false}
                                        hpSwapped={unit ? simulatorRef.current?.unitStates.get(unit)?.hpSwapped : false}
                                        isEvolving={unit && evolvingUnitId === unit.id}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Shop Area */}
            {
                game.phase === GamePhase.SHOP && (
                    <div className={`shop-container ${tutorialStep === 6 ? 'tutorial-elevate' : ''}`}>
                        {/* Left Controls: Compact & Side-by-Side */}
                        <div className="shop-controls">
                            {/* Row 1: Shop Level Text - Higher and Better Color */}
                            <div className="shop-info-row" style={{ justifyContent: 'center', marginBottom: '0px', marginTop: '-15px' }}>
                                <span className="tier-text" style={{ color: '#e2e8f0', fontSize: '1rem', opacity: 0.9 }}>商店 Lv.{game.shop.getTier(game.turn)}</span>
                            </div>

                            {/* Row 2: Battle Button - Centered and Slimmer */}
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '15px', position: 'relative' }}>
                                <button
                                    className="btn-premium btn-battle"
                                    onClick={handleStartBattle}
                                    style={{ height: '50px', width: '60px', zIndex: (tutorialStep === 7 || tutorialStep === 10) ? 10000 : 'auto' }}
                                >
                                    <span style={{ fontSize: '1.5rem' }}>⚔️</span>
                                </button>
                            </div>
                        </div>

                        {/* Right Shop Slots - Shifted right while button stays fixed */}
                        <div className="shop-slots-area" style={{ position: 'relative' }}>
                            <button
                                className={`reroll-icon-btn ${game.gold < 1 ? 'btn-disabled' : ''} ${tutorialStep === 5 ? 'tutorial-highlight' : ''}`}
                                onClick={handleReroll}
                                disabled={game.gold < 1}
                                style={{
                                    position: 'absolute',
                                    top: '-5px',
                                    left: '-5px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: game.gold < 1 ? '#555' : '#aaa',
                                    fontSize: '2rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    zIndex: 10,
                                    padding: '5px'
                                }}
                                title="刷新商店 ($1)"
                            >
                                🔄
                            </button>

                            <div className="shop-slots">
                                {/* Render Active Slots */}
                                {game.shop.slots.map((unit: Unit | null, i: number) => {
                                    if (unit) {
                                        (unit as any).isMergeable = game.playerTeam.some(u => u && u.family === unit.family && u.level === unit.level);
                                    }

                                    const hasGastly = game.playerTeam.some(u => u?.family === 'gastly');
                                    const isHighlighted = (tutorialStep === 2 && ((!hasGastly && unit?.family === 'gastly') || (hasGastly && (unit?.family === 'charmander' || unit?.family === 'squirtle')))) ||
                                        (tutorialStep === 6 && unit?.family === 'charmander') ||
                                        (tutorialStep === 8 && unit?.family === 'charmander') ||
                                        (tutorialStep === 9 && unit?.family === 'cyndaquil');

                                    // Do NOT dim in step 7 or 8 so the user can see the board and interact
                                    const isDimmed = !isHighlighted && tutorialStep > 0 && tutorialStep !== 6 && tutorialStep !== 7 && tutorialStep !== 8 && game.phase === GamePhase.SHOP;

                                    return (
                                        <div key={i} style={{ position: 'relative', filter: isDimmed ? 'grayscale(100%) brightness(50%)' : 'none', opacity: isDimmed ? 0.6 : 1 }} className={`${isHighlighted && tutorialStep !== 6 && tutorialStep !== 8 ? 'tutorial-highlight' : ''} ${(tutorialStep === 6 || tutorialStep === 8) && unit?.family === 'charmander' ? 'tutorial-elevate' : ''}`}>
                                            <UnitCard
                                                unit={unit}
                                                onClick={() => handleSelect(unit, i, 'SHOP')}
                                                frozen={game.shop.frozen[i]}
                                                isInteractive={true}
                                                draggable={!!unit && game.gold >= 3}
                                                onDragStart={(e: React.DragEvent) => onDragStart(e, i, 'SHOP')}
                                                onToggleFreeze={() => handleFreezeToggle(i)}
                                                showMergeGlow={unit && (unit as any).isMergeable}
                                                isEvolving={unit && evolvingUnitId === unit.id}
                                                tutorialHighlightLock={false}
                                            />
                                        </div>
                                    );
                                })}

                                {/* Render Locked Slots (up to 7 total) */}
                                {Array.from({ length: 7 - game.shop.slots.length }).map((_, i) => {
                                    const slotIndex = game.shop.slots.length + i;
                                    let unlockTurn = 0;
                                    if (slotIndex === 4) unlockTurn = 4;
                                    else if (slotIndex === 5) unlockTurn = 7;
                                    else if (slotIndex === 6) unlockTurn = 10;

                                    const turnsLeft = unlockTurn - game.turn;

                                    return (
                                        <div key={`locked-${slotIndex}`} className="slot-placeholder" style={{
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            gap: '2px' /* Tightened gap */
                                        }}>
                                            <div style={{
                                                fontSize: '3.5rem', /* Reduced from 6rem */
                                                color: 'rgba(255,255,255,0.12)',
                                                lineHeight: 1,
                                                fontWeight: 'bold',
                                            }}>×</div>
                                            {turnsLeft > 0 && (
                                                <div style={{
                                                    fontSize: '0.8rem',
                                                    color: 'rgba(255,255,255,0.3)',
                                                    whiteSpace: 'nowrap',
                                                    marginTop: '5px'
                                                }}>{turnsLeft} 回合解鎖</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Battle Log & Timeout HUD */}
            {
                game.phase === GamePhase.BATTLE && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px', padding: '0 0', marginTop: '8px' }}>
                        {/* 1. Battle Controls (Top) */}
                        <div className="battle-controls-container" style={{ zIndex: 10, position: 'relative' }}>
                            <div className="battle-controls-row">
                                <button className="battle-pause-btn" onClick={togglePause}>
                                    {isPaused ? '▶️ 繼續' : '⛔ 暫停'}
                                </button>
                                <button
                                    className={`battle-speed-btn ${battleSpeed > 1 ? 'active' : ''}`}
                                    onClick={toggleBattleSpeed}
                                    title="切換戰鬥速度"
                                >
                                    ⏩ {battleSpeed}x
                                </button>
                            </div>
                        </div>

                        {/* 2. Battle Log (Bottom) */}
                        <div style={{ textAlign: 'center', color: '#888', fontSize: '0.9rem', zIndex: 5, minHeight: '4.5em', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {logs.length > 0 ? (
                                logs.slice(-3).map((log, i) => (
                                    <div key={i} style={{ opacity: i === 2 ? 1 : (i === 1 ? 0.6 : 0.3) }}>
                                        {log.message}
                                    </div>
                                ))
                            ) : (
                                <div>戰鬥進行中...</div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Detail Panel */}
            {
                selected && (
                    <div className="detail-panel" onClick={e => e.stopPropagation()}>
                        {/* Close Button (Top Left X) */}
                        <button
                            style={{
                                position: 'absolute',
                                top: '10px',
                                left: '10px',
                                background: 'transparent',
                                border: 'none',
                                color: '#ccc',
                                fontSize: '1.5rem',
                                cursor: 'pointer',
                                padding: '0',
                                lineHeight: '1',
                                zIndex: 10
                            }}
                            onClick={() => {
                                setSelected(null);
                                if (tutorialStep === 3 && selected?.unit.family === 'gastly') {
                                    setTutorialStep(4);
                                }
                            }}
                        >
                            ×
                        </button>
                        <div className="detail-content" style={{ display: 'flex', gap: '15px' }}>

                            {/* Left Column: Image + Actions */}
                            <div className="detail-left" style={{ width: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                <img src={UNIT_TEMPLATES[selected.unit.templateId].imageUrl} className="detail-image" alt={selected.unit.name} style={{ width: '105px', height: '105px', objectFit: 'contain' }} />

                                {/* Action Buttons (Buy/Sell) */}
                                {selected.source === 'SHOP' && (
                                    <button className="btn-premium btn-reroll" style={{
                                        background: 'linear-gradient(to bottom, #10b981, #059669)',
                                        border: '1px solid #10b981', color: 'white', width: '90%',
                                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px'
                                    }} onClick={handleBuy}>
                                        <span>購買 $3</span>
                                    </button>
                                )}
                                {selected.source === 'BOARD' && game.phase === GamePhase.SHOP && (
                                    <button className="btn-premium btn-reroll" style={{
                                        background: 'linear-gradient(to bottom, #ef4444, #dc2626)',
                                        border: '1px solid #ef4444', width: '90%', color: 'white',
                                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px'
                                    }} onClick={handleSell}>
                                        <span>出售 $1</span>
                                    </button>
                                )}


                            </div>

                            {/* Right Column: Info & Stats */}
                            <div className="detail-right" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {/* Header: Name + Stars */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div className="detail-name" style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{selected.unit.name}</div>
                                    <div style={{ color: '#ffd700', fontSize: '1.2rem', letterSpacing: '2px' }}>
                                        {'★'.repeat(selected.unit.level)}
                                    </div>
                                    <div style={{ color: '#aaa', fontSize: '0.9rem', marginLeft: 'auto' }}>
                                        {selected.unit.exp >= 9 ? 'EXP MAX' : `EXP：${selected.unit.exp}/9`}
                                    </div>
                                </div>

                                <hr style={{ width: '100%', borderColor: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

                                {/* Stats & Synergies Row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    {/* Stats */}
                                    <div style={{
                                        display: 'flex', gap: '10px',
                                        background: 'rgba(0,0,0,0.4)',
                                        padding: '4px 8px', borderRadius: '6px',
                                        fontSize: '1rem', fontWeight: 'bold'
                                    }}>
                                        <span style={{ color: '#60a5fa' }}>⚔️ {selected.unit.stats.attack}</span>
                                        <span style={{ color: '#fca5a5' }}>❤️ {selected.unit.stats.hp}</span>
                                    </div>

                                    <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)' }}></div>

                                    {/* Synergies */}
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        {selected.unit.synergies.map((synId: string) => {
                                            const syn = SYNERGIES[synId];
                                            if (!syn) return null;
                                            return <SynergyIcon key={synId} synergy={syn} showCount={false} />;
                                        })}
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="detail-desc" style={{ marginTop: '8px', lineHeight: '1.5', color: '#ddd' }}>
                                    {/* Use dynamic description from Unit instance */}
                                    {selected.unit.description}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal should be rendered at the very end of the DOM to ensure highest physical layering context */}
            {
                showEncyclopedia && createPortal(
                    <EncyclopediaModal onClose={() => {
                        setShowEncyclopedia(false);
                        if (tutorialStep === 11) {
                            setTutorialStep(12);
                        }
                    }} />,
                    document.getElementById('modal-root')!
                )
            }
        </div >
    );
}

export default App;