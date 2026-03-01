import * as React from 'react';
// Last updated: 2026-02-20 - Orientation Optimization Phase 4
import { useState, useEffect, useRef } from 'react';
import './index.css';
import { GameLoop, GamePhase } from './engine/GameLoop';
import { music } from './engine/MusicManager';
import { Unit } from './models/Unit';
import { BattleSimulator } from './engine/BattleSimulator';
import type { BattleLog } from './engine/BattleSimulator';
import { UNIT_TEMPLATES, PREFERRED_POSITIONS } from './models/UnitFactory';
import { SYNERGIES } from './models/Synergies';
import { EncyclopediaModal } from './components/EncyclopediaModal';
import { TutorialModal } from './components/TutorialModal';

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
function UnitCard({ unit, onClick, frozen, draggable, onDragStart, flipped, isInteractive, onToggleFreeze, silenced, isSelected, isEvolving, showMergeGlow, tutorialHighlightLock }: any) {
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
                <span className="stat-hp">{unit.stats.hp}</span>
            </div>
        </div>
    );
}

// Synergy Icon Component
function SynergyIcon({ synergy, count, showCount = true, units, activeFamilies, isEnemy, onMouseEnter, isTutorialHighlighted, isChecked }: any) {
    let activeDesc = synergy.description;
    const isActive = count !== undefined && count >= synergy.tiers[0];
    const style = isActive ? { borderColor: isChecked ? '#10b981' : synergy.color } : { borderColor: '#444', filter: 'grayscale(1)', opacity: 0.7 };

    return (
        <div className={`synergy-icon ${isTutorialHighlighted ? 'synthetic-glow tutorial-elevate' : ''} ${isChecked ? 'is-checked' : ''}`} style={style} onMouseEnter={onMouseEnter}>
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
    const update = useForceUpdate();

    useEffect(() => {
        console.log("Pokemon AutoChess v4.8.3 - Syntax Fix & Final Logs");
    }, []);

    const handleRestart = () => {
        gameRef.current = new GameLoop();
        setDifficulty(null);
        // Force update to reflect new game instance
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
    const [showTutorial, setShowTutorial] = useState<boolean>(false);
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
    const [tutorialStep, setTutorialStep] = useState<number>(0);
    const [tutorialShake, setTutorialShake] = useState<boolean>(false);

    // Animation States
    const [goldErrorAnim, setGoldErrorAnim] = useState(false);
    const [hpLossAnim, setHpLossAnim] = useState(false);

    // Tutorial Specific Interaction States
    const [hoveredStarter, setHoveredStarter] = useState(false);
    const [hoveredFire, setHoveredFire] = useState(false);

    const triggerShake = () => {
        setTutorialShake(true);
        setTimeout(() => setTutorialShake(false), 400);
    };

    const handleTutorialNext = () => {
        if (tutorialStep === 1) {
            setTutorialStep(2);
        } else if (tutorialStep === 10) {
            setTutorialStep(11);
        } else if (tutorialStep === 12) {
            setTutorialStep(0); // End tutorial completely
            handleRestart(); // Reset game back to intro screen
        } else {
            triggerShake();
        }
    };

    // --- Tutorial Logic ---
    const startTutorial = () => {
        handleRestart(); // reset game
        setTimeout(() => {
            if (gameRef.current) {
                gameRef.current.gold = 10;
                gameRef.current.shop.slots = [
                    new Unit(UNIT_TEMPLATES.gastly),
                    new Unit(UNIT_TEMPLATES.charmander),
                    new Unit(UNIT_TEMPLATES.squirtle)
                ];
                gameRef.current.setDifficulty('NORMAL');
                setDifficulty('NORMAL');
                setTutorialStep(2);
                setShowTutorial(false);
                update();
            }
        }, 100);
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
    }, [tutorialStep, gameRef.current.phase, battleResult, update]);

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
                // Determine if critical (Tier 1, 2) or background (Tier 3+)
                // For Sprout and initial tokens, include in critical
                const isCritical = t.tier <= 2 || t.id === 'sprout';

                const addUrl = (url: string) => {
                    if (isCritical) criticalUrls.add(url);
                    else backgroundUrls.add(url);
                };

                if (t.imageUrl) addUrl(t.imageUrl);
                if (t.battleImageUrl) addUrl(t.battleImageUrl);
            });

            // Critical token/derived images
            criticalUrls.add('assets/妙蛙種子01.webp');
            criticalUrls.add('assets/小拉達01.webp');
            criticalUrls.add('assets/飄飄球01.webp');
            criticalUrls.add('assets/隨風球01.webp');
            criticalUrls.add('assets/怨影娃娃01.webp');
            criticalUrls.add('assets/詛咒娃娃01.webp');

            // Preload critical audio
            const preloadAudio = (name: string) => {
                const audio = new Audio(`music/${name}.OGG`);
                audio.load();
            };
            preloadAudio('start');
            preloadAudio('pokemonmart');
            preloadAudio('gymfight');

            console.log(`[系統] 開始預載入關鍵資源 (${criticalUrls.size} 個)...`);
            await loadAssets(Array.from(criticalUrls), false);

            setHasLoaded(true);
            console.log(`[系統] 關鍵資源載入完成！`);

            // Next frame background load
            setTimeout(async () => {
                console.log(`[系統] 開始背景載入剩餘資源 (${backgroundUrls.size} 個)...`);
                preloadAudio('victoryroad');
                preloadAudio('pokemoncenter');
                preloadAudio('gymwin');
                preloadAudio('level up');
                preloadAudio('recover');

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
                setBattleElapsedSeconds((s: number) => s + 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [game.phase, battleResult, isPaused]);

    useEffect(() => {
        if (game.phase === GamePhase.BATTLE && !simulatorRef.current) {
            // Init Battle
            // Init Battle
            // 1. Enemy Count
            // Turn 1 = 3. Turn 2 = 4. Turn 3+ = 5.
            const enemyCount = game.turn === 1 ? 3 : (game.turn === 2 ? 4 : 5);

            let enemyTeam: (Unit | null)[] = [];
            let enemyBaseLevel = 1;
            let forcedStarCount = 0;
            let forcedTwoStarCount = 0;

            if (tutorialStep > 0) {
                // Fixed tutorial enemy team
                if (tutorialStep === 10 || tutorialStep === 11) {
                    enemyTeam = [
                        new Unit(UNIT_TEMPLATES.charizard),
                        new Unit(UNIT_TEMPLATES.blastoise),
                        new Unit(UNIT_TEMPLATES.venusaur),
                        new Unit(UNIT_TEMPLATES.pikachu),
                        new Unit(UNIT_TEMPLATES.gengar)
                    ];
                    // Overpowered team to ensure defeat
                    enemyTeam.forEach(u => { if (u) u.level = 3; });
                } else {
                    enemyTeam = [
                        new Unit(UNIT_TEMPLATES.mankey),
                        new Unit(UNIT_TEMPLATES.dwebble),
                        new Unit(UNIT_TEMPLATES.charmander),
                        null,
                        null
                    ];
                    enemyTeam[0]!.level = 1;
                    enemyTeam[1]!.level = 1;
                    enemyTeam[2]!.level = 1;
                }
            } else {

                // Respect Shop Tier
                const shopTier = game.shop.getTier(game.turn);
                const allTemplates = Object.values(UNIT_TEMPLATES).filter(t => t.id !== 'sprout' && !t.isHiddenFromShop && t.tier <= shopTier);

                // Helper to bias enemy generation towards higher tiers in mid/late game
                const getRandomEnemyTemplate = (templates: typeof allTemplates) => {
                    if (game.turn >= 8 && Math.random() < 0.6) {
                        const maxTier = Math.max(...templates.map(t => t.tier));
                        const highTierPool = templates.filter(t => t.tier >= maxTier - 1);
                        if (highTierPool.length > 0) return highTierPool[Math.floor(Math.random() * highTierPool.length)];
                    }
                    return templates[Math.floor(Math.random() * templates.length)];
                };

                // 2. Progression Settings (Star Count & Level)

                if (game.wins >= 12) {
                    // Champion: Base Level 2, with specific 3-Star counts per difficulty
                    enemyBaseLevel = 2; // Default to 2-star for lategame, let forcedStarCount push to 3-star
                    if (difficulty === 'NORMAL') forcedStarCount = 2;
                    else if (difficulty === 'GREAT') forcedStarCount = 3;
                    else if (difficulty === 'ULTRA') forcedStarCount = 4;
                    else {
                        enemyBaseLevel = 3;
                        forcedStarCount = 5; // Master: All 5 Units 3-Star
                    }
                } else if (game.wins >= 8) {
                    // Elite Four: Base Level 2, specific 3-Star progression
                    const eliteIndex = game.wins - 8; // 0, 1, 2, 3
                    enemyBaseLevel = 2;

                    if (difficulty === 'NORMAL') {
                        // Normal: 0, 1, 1, 2
                        const progression = [0, 1, 1, 2];
                        forcedStarCount = progression[eliteIndex];
                    } else if (difficulty === 'GREAT') {
                        // Great: 1, 1, 2, 2
                        const progression = [1, 1, 2, 2];
                        forcedStarCount = progression[eliteIndex];
                    } else if (difficulty === 'ULTRA') {
                        // Ultra: 1, 2, 3, 3
                        const progression = [1, 2, 3, 3];
                        forcedStarCount = progression[eliteIndex];
                    } else {
                        // Master: 1, 2, 3, 4
                        forcedStarCount = eliteIndex + 1;
                    }
                } else {
                    enemyBaseLevel = 1;
                    // Ensure NO 3-Star units in Gym phase (forcedStarCount remains 0)
                }

                // ... (Variable declarations)
                if (game.wins < 8 && game.turn >= 4 && game.turn < 7) {
                    forcedTwoStarCount = game.turn - 3;
                }

                // Apply Gym Difficulty Logic
                if (game.wins < 8) {
                    if (game.turn >= 7) {
                        enemyBaseLevel = 2; // Full 2-Star team
                    } else if (game.turn >= 4) {
                        // Turn 4: 1 Lv 2, Turn 5: 2 Lv 2, Turn 6: 3 Lv 2
                        // We'll use a new forcedTwoStarCount variable or just enemyBaseLevel
                    }
                }

                // 3. Strategy / Synergy Selection
                let coreSynergyId: string | null = null;
                let synergyTargetCount = 0;
                let uniqueConstraint = false;

                // Updated Elite Thresholds: Master (Win 3+), Ultra (Win 5+), Great (Win 10+), Normal (Win 12+)
                const isEliteMatch = (difficulty === 'MASTER' && game.wins >= 3) ||
                    (difficulty === 'ULTRA' && game.wins >= 5) ||
                    (difficulty === 'GREAT' && game.wins >= 10) ||
                    (difficulty === 'NORMAL' && game.wins >= 12);

                // --- Shared Generation Variables ---
                enemyTeam = [];
                let attempts = 0;
                const MAX_ENEMY_ATTEMPTS = 5;

                const sortTeamByPositions = (units: Unit[]): (Unit | null)[] | null => {
                    const POS_CONSTRAINTS: Record<number, string[]> = {
                        0: ['FRONT', 'FRONT_MID', 'ALL'],
                        1: ['FRONT', 'MID', 'FRONT_MID', 'MID_BACK', 'ALL'],
                        2: ['MID', 'FRONT_MID', 'MID_BACK', 'ALL'],
                        3: ['MID', 'BACK', 'FRONT_MID', 'MID_BACK', 'ALL'],
                        4: ['BACK', 'MID_BACK', 'ALL']
                    };
                    const result: (Unit | null)[] = new Array(5).fill(null);
                    const usedUnitIdx = new Set<number>();
                    const targetCount = units.length;

                    const sortedByConstraint = [...units].sort((a, b) => {
                        const getLen = (unit: Unit) => {
                            const p = PREFERRED_POSITIONS[unit.family || unit.templateId] || 'ALL';
                            if (p === 'ALL') return 5;
                            if (p === 'FRONT' || p === 'BACK') return 2;
                            if (p === 'MID') return 3;
                            if (p === 'FRONT_MID') return 4;
                            if (p === 'MID_BACK') return 4;
                            return 5;
                        };
                        return getLen(a) - getLen(b);
                    });

                    const backtrack = (slotIdx: number): boolean => {
                        if (slotIdx === 5) return true;
                        if (slotIdx >= targetCount) return backtrack(slotIdx + 1);

                        for (let i = 0; i < sortedByConstraint.length; i++) {
                            if (usedUnitIdx.has(i)) continue;
                            const u = sortedByConstraint[i];
                            const pref = PREFERRED_POSITIONS[u.family || u.templateId] || 'ALL';
                            if (POS_CONSTRAINTS[slotIdx].includes(pref)) {
                                usedUnitIdx.add(i);
                                result[slotIdx] = u;
                                if (backtrack(slotIdx + 1)) return true;
                                result[slotIdx] = null;
                                usedUnitIdx.delete(i);
                            }
                        }
                        return false;
                    };

                    if (backtrack(0)) return result;
                    return null;
                };

                if (isEliteMatch) {
                    // Elite/Champ Strategies Refined
                    const stratRoll = Math.random();
                    const shopTier = game.shop.getTier(game.turn);
                    const eliteAllTemplates = Object.values(UNIT_TEMPLATES).filter(t => t.id !== 'sprout' && !t.isHiddenFromShop);
                    const availableTemplates = eliteAllTemplates.filter(t => t.tier <= shopTier);
                    const t5Pool = availableTemplates.filter(u => u.tier === 5);

                    let fixedTemplates: any[] = [];
                    let randomCount = 0;

                    // Helper to ensure template respects shop tier
                    const ensureTier = (t: any) => {
                        if (t.tier <= shopTier) return t;
                        const tierPool = availableTemplates.filter(v => v.tier <= shopTier);
                        return tierPool[Math.floor(Math.random() * tierPool.length)];
                    };

                    if (stratRoll < 0.15) {
                        // (1) Starter: 3 Starters + 1 T4/T5 Starter + 1 Random
                        const starterPool = eliteAllTemplates.filter(u => u.synergies.includes('Starter'));
                        const availableHighStarter = starterPool.filter(u => u.tier >= 4 && u.tier <= shopTier);
                        fixedTemplates = [
                            ensureTier(starterPool[Math.floor(Math.random() * starterPool.length)]),
                            ensureTier(starterPool[Math.floor(Math.random() * starterPool.length)]),
                            ensureTier(starterPool[Math.floor(Math.random() * starterPool.length)])
                        ];
                        if (availableHighStarter.length > 0) {
                            fixedTemplates.push(availableHighStarter[Math.floor(Math.random() * availableHighStarter.length)]);
                        } else {
                            const lowStarters = starterPool.filter(u => u.tier <= shopTier);
                            fixedTemplates.push(lowStarters[Math.floor(Math.random() * lowStarters.length)]);
                        }
                        randomCount = 1;
                        coreSynergyId = 'Starter'; synergyTargetCount = 4;
                    } else if (stratRoll < 0.30) {
                        // (2) Psychic: Natu, Ralts, Mr.Mime + 1 T5 + 1 Random
                        const natu = eliteAllTemplates.find(u => u.family === 'natu');
                        const ralts = eliteAllTemplates.find(u => u.family === 'ralts');
                        const mrmime = eliteAllTemplates.find(u => u.family === 'mrmime');
                        if (natu) fixedTemplates.push(ensureTier(natu));
                        if (ralts) fixedTemplates.push(ensureTier(ralts));
                        if (mrmime) fixedTemplates.push(ensureTier(mrmime));
                        if (t5Pool.length > 0) fixedTemplates.push(t5Pool[Math.floor(Math.random() * t5Pool.length)]);
                        randomCount = 5 - fixedTemplates.length;
                        coreSynergyId = 'Psychic'; synergyTargetCount = 3;
                    } else if (stratRoll < 0.45) {
                        // (3) Cave/Hard: Onix, Diglett + (50% Magneton) + 1 T5 + Random
                        const onix = eliteAllTemplates.find(u => u.family === 'onix');
                        const diglett = eliteAllTemplates.find(u => u.family === 'diglett');
                        if (onix) fixedTemplates.push(ensureTier(onix));
                        if (diglett) fixedTemplates.push(ensureTier(diglett));
                        if (Math.random() < 0.5) {
                            const mag = eliteAllTemplates.find(u => u.family === 'magnemite');
                            if (mag) fixedTemplates.push(ensureTier(mag));
                        }
                        if (t5Pool.length > 0) fixedTemplates.push(t5Pool[Math.floor(Math.random() * t5Pool.length)]);
                        randomCount = 5 - fixedTemplates.length;
                        coreSynergyId = 'Cave'; synergyTargetCount = 2;
                    } else if (stratRoll < 0.60) {
                        // (4) Snow: Weavile, Abomasnow + 1 T5 + 2 Random
                        const sneasel = eliteAllTemplates.find(u => u.family === 'sneasel');
                        const snover = eliteAllTemplates.find(u => u.family === 'snover');
                        if (sneasel) fixedTemplates.push(ensureTier(sneasel));
                        if (snover) fixedTemplates.push(ensureTier(snover));
                        if (t5Pool.length > 0) fixedTemplates.push(t5Pool[Math.floor(Math.random() * t5Pool.length)]);
                        randomCount = 5 - fixedTemplates.length;
                        coreSynergyId = 'Snow'; synergyTargetCount = 2;
                    } else if (stratRoll < 0.75) {
                        // (5) Triplets: Dugtrio, Dodrio, Magneton + 1 T5 + 1 Random
                        const diglett = eliteAllTemplates.find(u => u.family === 'diglett');
                        const doduo = eliteAllTemplates.find(u => u.family === 'doduo');
                        const mag = eliteAllTemplates.find(u => u.family === 'magnemite');
                        if (diglett) fixedTemplates.push(ensureTier(diglett));
                        if (doduo) fixedTemplates.push(ensureTier(doduo));
                        if (mag) fixedTemplates.push(ensureTier(mag));
                        if (t5Pool.length > 0) fixedTemplates.push(t5Pool[Math.floor(Math.random() * t5Pool.length)]);
                        randomCount = 5 - fixedTemplates.length;
                        coreSynergyId = 'Triplets'; synergyTargetCount = 3; uniqueConstraint = true;
                    } else if (stratRoll < 0.85) {
                        // (6) Slow: Swalot, Slowbro + 2 T5 + 1 Random
                        const gulpin = eliteAllTemplates.find(u => u.family === 'gulpin');
                        const slowpoke = eliteAllTemplates.find(u => u.family === 'slowpoke');
                        if (gulpin) fixedTemplates.push(ensureTier(gulpin));
                        if (slowpoke) fixedTemplates.push(ensureTier(slowpoke));
                        if (t5Pool.length > 0) {
                            fixedTemplates.push(t5Pool[Math.floor(Math.random() * t5Pool.length)]);
                            if (t5Pool.length > 1) fixedTemplates.push(t5Pool[Math.floor(Math.random() * t5Pool.length)]);
                        }
                        randomCount = 5 - fixedTemplates.length;
                        coreSynergyId = 'Slow'; synergyTargetCount = 2;
                    } else if (stratRoll < 0.95) {
                        // (7) Beetle: Pinsir, Heracross + 2 T5 + 1 Random
                        const pinsir = eliteAllTemplates.find(u => u.family === 'pinsir');
                        const heracross = eliteAllTemplates.find(u => u.family === 'heracross');
                        if (pinsir) fixedTemplates.push(ensureTier(pinsir));
                        if (heracross) fixedTemplates.push(ensureTier(heracross));
                        if (t5Pool.length > 0) {
                            fixedTemplates.push(t5Pool[Math.floor(Math.random() * t5Pool.length)]);
                            if (t5Pool.length > 1) fixedTemplates.push(t5Pool[Math.floor(Math.random() * t5Pool.length)]);
                        }
                        randomCount = 5 - fixedTemplates.length;
                        coreSynergyId = 'Beetle'; synergyTargetCount = 2;
                    } else {
                        // (8) T5 Flow: 3 T5 + 2 Random
                        if (t5Pool.length > 0) {
                            for (let i = 0; i < Math.min(3, t5Pool.length); i++) {
                                fixedTemplates.push(t5Pool[Math.floor(Math.random() * t5Pool.length)]);
                            }
                        }
                        randomCount = 5 - fixedTemplates.length;
                    }

                    while (attempts < MAX_ENEMY_ATTEMPTS) {
                        const candidateUnits: Unit[] = [];
                        // 1. Fill Fixed
                        for (const t of fixedTemplates) {
                            let finalT = t;
                            let tempLevel = 1;
                            while (tempLevel < enemyBaseLevel && finalT.evolveId) {
                                const nextT = UNIT_TEMPLATES[finalT.evolveId];
                                if (nextT) { finalT = nextT; tempLevel++; } else break;
                            }
                            const u = new Unit(finalT);
                            u.level = enemyBaseLevel;
                            candidateUnits.push(u);
                        }
                        // 2. Fill Random Slots
                        for (let i = 0; i < randomCount; i++) {
                            const t = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
                            const u = new Unit(t);
                            u.level = 1; // Start at 1 to allow evolution logic to work
                            candidateUnits.push(u);
                        }

                        // 4. Position Sort
                        const sorted = sortTeamByPositions(candidateUnits);
                        if (sorted) { enemyTeam = sorted; break; }
                        attempts++;
                    }
                } else {
                    // Gym Strategy (Turn >= 2)
                    if (game.turn >= 2) {
                        const availableSynergies = Object.values(SYNERGIES).map(s => s.id);
                        coreSynergyId = availableSynergies[Math.floor(Math.random() * availableSynergies.length)];
                        synergyTargetCount = 3;
                    }

                    while (attempts < MAX_ENEMY_ATTEMPTS) {
                        const candidateUnits: Unit[] = [];
                        const usedTemplateIds = new Set<string>();

                        for (let i = 0; i < enemyCount; i++) {
                            let pool = allTemplates;
                            if (i < synergyTargetCount && coreSynergyId) {
                                const synergyPool = allTemplates.filter(u => u.synergies.includes(coreSynergyId!));
                                if (uniqueConstraint) {
                                    const uniquePool = synergyPool.filter(u => !usedTemplateIds.has(u.family || u.id));
                                    pool = uniquePool.length > 0 ? uniquePool : synergyPool;
                                } else {
                                    pool = synergyPool.length > 0 ? synergyPool : allTemplates;
                                }
                            }
                            if (pool.length === 0) pool = allTemplates;
                            let t = getRandomEnemyTemplate(pool);
                            usedTemplateIds.add(t.family || t.id);

                            const u = new Unit(t);
                            u.level = 1; // Start at 1 to allow evolution logic to work
                            candidateUnits.push(u);
                        }
                        // 4. Position Sort
                        const sorted = sortTeamByPositions(candidateUnits);
                        if (sorted) { enemyTeam = sorted; break; }
                        attempts++;
                    }
                }
                if (enemyTeam.length === 0) {
                    // Final fallback: just generate randomly if sorting keeps failing
                    attempts = 0; // Reset for actual one-shot generation
                    for (let i = 0; i < enemyCount; i++) {
                        const tempT = getRandomEnemyTemplate(allTemplates);
                        const unit = new Unit(tempT);
                        unit.level = 1; // Start at 1 to allow evolution logic to work
                        enemyTeam.push(unit);
                    }
                    while (enemyTeam.length < 5) enemyTeam.push(null);
                }
            } // end tutorial enemy override

            // --- 5. Unified Enemy Scaling & Image Setup ---
            enemyTeam.forEach((u, i) => {
                if (!u) return;

                // A. Apply forced stars (upgrades)
                const targetLvl = (i < forcedStarCount) ? 3 : ((i < forcedTwoStarCount || enemyBaseLevel >= 2) ? 2 : 1);

                // FIXED: Ensure it evolves up to the HIGHER of targetLvl or enemyBaseLevel.
                const finalTargetLvl = Math.max(targetLvl, enemyBaseLevel);

                while (u.level < finalTargetLvl && u.evolveId) {
                    const nextT = UNIT_TEMPLATES[u.evolveId];
                    if (nextT) {
                        Object.assign(u, {
                            templateId: nextT.id, name: nextT.name, description: nextT.description,
                            imageUrl: nextT.battleImageUrl || nextT.imageUrl,
                            battleImageUrl: nextT.battleImageUrl, evolveId: nextT.evolveId,
                            synergies: nextT.synergies || [], tier: nextT.tier
                        });
                        u.level++;
                    } else break;
                }
                if (u.level < finalTargetLvl) u.level = finalTargetLvl;

                // Initial Base level might be forcefully bumped without template change if no evolution
                if (u.level === 1 && enemyBaseLevel > 1) {
                    u.level = enemyBaseLevel;
                }

                // B. Base stat bonus for level 2 and 3
                const baseStats = UNIT_TEMPLATES[u.family || u.templateId]?.baseStats || u.stats;
                if (u.level === 2) {
                    const bHp = baseStats.maxHp; const bAtk = baseStats.attack;
                    u.stats.hp += bHp; u.stats.maxHp += bHp; u.stats.attack += bAtk;
                } else if (u.level >= 3) {
                    const bHp = baseStats.maxHp * 2; const bAtk = baseStats.attack * 2;
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
                        // Tier-based scaling retention: T5 (50%), T4 (75%)
                        if (u.tier === 5) { eBHp = Math.ceil(eBHp * 0.5); eBAtk = Math.ceil(eBAtk * 0.5); }
                        else if (u.tier === 4) { eBHp = Math.ceil(eBHp * 0.75); eBAtk = Math.ceil(eBAtk * 0.75); }
                        u.stats.hp += eBHp; u.stats.maxHp += eBHp; u.stats.attack += eBAtk;
                    }
                }

                if (u.battleImageUrl) u.imageUrl = u.battleImageUrl;
            });

            // Save initial state for UI Synergy (Before simulator modifies/removes dead units)
            setInitialEnemyTeam([...enemyTeam]);

            // Master Turn 1 Balance: Ensure 1.0 multiplier for fairness
            const activeMultiplier = (difficulty === 'MASTER' && game.turn === 1) ? 1.0 : game.difficultyMultiplier;
            simulatorRef.current = new BattleSimulator(game.playerTeam, enemyTeam, game.savedTeam, activeMultiplier, game.wins, battleSpeed);
            simulatorRef.current.onUpdate = () => {
                if (simulatorRef.current) {
                    setLogs([...simulatorRef.current.logs]);
                }
                setBattleTick((t: number) => t + 1);
            };
            setLogs([]);

            const runBattleLoop = async () => {
                if (!simulatorRef.current || isPausedRef.current) return;

                // Lock loop to prevent overlapping
                if ((simulatorRef.current as any).isProcessing) return;
                (simulatorRef.current as any).isProcessing = true;

                try {
                    const keepGoing = await simulatorRef.current.simulateStep();
                    setLogs([...simulatorRef.current.logs]);
                    setBattleTick((t: number) => t + 1);

                    if (!keepGoing) {
                        if (interval) clearInterval(interval);

                        // Restore visibility immediately for survivors
                        document.querySelectorAll('.death-anim, .hurt-anim, .clash-anim').forEach(el => {
                            el.classList.remove('death-anim', 'hurt-anim', 'clash-anim');
                            (el as HTMLElement).style.removeProperty('--clash-offset');
                        });

                        setTimeout(() => {
                            if (simulatorRef.current) {
                                const result = simulatorRef.current.getResult() || 'DRAW';
                                setSelected(null);
                                setBattleResult(result);
                            }
                        }, 300 / battleSpeed); // Scaled settlement delay
                        return; // Stop loop
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

            return () => {
                if (interval) clearInterval(interval);
            };
        } else {
            // Cleanup leftover animation classes when entering SHOP phase
            // This prevents reused DOM elements (units) from staying invisible or rotated if they were mid-animation
            setTimeout(() => {
                document.querySelectorAll('.death-anim, .hurt-anim, .clash-anim').forEach(el => {
                    el.classList.remove('death-anim', 'hurt-anim', 'clash-anim');
                    (el as HTMLElement).style.removeProperty('--clash-offset');
                });
            }, 50); // Small delay to ensure render cycle complete if needed

            // Reset Enemy Synergy Display when leaving battle
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
        if (tutorialStep === 10) return actionType === 'CLICK_SYNERGY' || actionType === 'START_BATTLE';
        if (tutorialStep === 11) return actionType === 'START_BATTLE';
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
                message: `進入對戰階段？`,
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
        game.startBattlePhase();
        update();
    };

    const handleBattleResultClick = () => {
        if (battleResult) {
            music.stop(); // Stop victory music
            const hpBefore = game.lives;
            game.endBattle(battleResult);

            if ((tutorialStep === 10 || tutorialStep === 11) && battleResult === 'LOSS') {
                setTutorialStep(12);
            }

            if (game.lives < hpBefore) {
                setHpLossAnim(true);
                setTimeout(() => setHpLossAnim(false), 800);
            }

            simulatorRef.current = null;
            setBattleResult(null);
            update();
        }
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

    // Drag Handlers
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

    const displayPlayerTeam = (game.phase === GamePhase.BATTLE && simulatorRef.current) ? simulatorRef.current.playerTeam : game.playerTeam;
    const displayEnemyTeam = (game.phase === GamePhase.BATTLE && simulatorRef.current) ? simulatorRef.current.enemyTeam : Array(5).fill(null);
    const [focusedDifficulty, setFocusedDifficulty] = useState<string | null>(null);

    // Calculate Synergies (All)
    const synergyStatus = getSynergyStatus(game.playerTeam);

    return (
        <div className="game-container" onClick={() => focusedDifficulty && setFocusedDifficulty(null)}>
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
            {showEncyclopedia && <EncyclopediaModal onClose={() => setShowEncyclopedia(false)} />}
            {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} onStartTutorial={startTutorial} />}

            {/* Tutorial Message Box / Mask */}
            {tutorialStep > 0 && game.phase === GamePhase.SHOP && (
                <>
                    <div className="tutorial-mask" onClick={() => (tutorialStep === 1 || tutorialStep === 12) ? handleTutorialNext() : null} />
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
                                {tutorialStep === 2 && "每回合開始都會獲得10$\n🎯任務：購買寶可夢"}
                                {tutorialStep === 3 && "每隻寶可夢都有專屬招式\n🎯任務：查看招式並關閉面板"}
                                {tutorialStep === 4 && "可以自由調整隊伍的陣行\n🎯任務：將鬼斯移動到其他位置"}
                                {tutorialStep === 5 && "花費1$可以刷新商店角色\n🎯任務：點擊按鈕刷新商店角色"}
                                {tutorialStep === 6 && "鎖定角色能保留到下回合\n🎯任務：點擊鎖定所有小火龍"}
                                {tutorialStep === 7 && "準備完成後即可開始戰鬥\n🎯任務：點擊戰鬥並贏得勝利"}
                                {tutorialStep === 8 && "拖曳或點擊相同角色合成\n🎯任務：購買並合成小火龍"}
                                {tutorialStep === 9 && "每隻寶可夢擁有不同羈絆\n🎯任務：購買火球鼠來觸發羈絆"}
                                {tutorialStep === 10 && "觸發羈絆來提升陣容強度\n🎯任務：查看御三家、燃燒羈絆"}
                                {tutorialStep === 11 && "挑戰強大的對手成為冠軍\n🎯任務：點擊戰鬥並進行對戰"}
                                {tutorialStep === 12 && "戰敗會扣愛心，歸零會結束。請努力成為冠軍！\n🎯任務：點擊結束教學"}
                            </div>
                            {tutorialStep === 12 && (
                                <button className="tutorial-btn-continue" style={{ marginTop: '15px' }} onClick={(e) => { e.stopPropagation(); handleTutorialNext(); }}>
                                    結束教學 ⏭
                                </button>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Orientation Lock Overlay */}
            {isPortrait && (
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
            )}

            {/* Mute Toggle Button removed from here */}

            {/* Loading & Start Screen */}
            {!hasStarted && (
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
            )}

            {/* Difficulty Selection Screen (Only after Start) */}
            {(hasStarted && difficulty === null) && (
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
            )}

            {/* Header */}
            <div className="header">
                <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
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
                            <span className={`${hpLossAnim ? 'shake-anim' : ''} ${tutorialStep === 12 ? 'tutorial-elevate' : ''}`} style={{ color: hpLossAnim ? '#ef4444' : undefined, zIndex: tutorialStep === 12 ? 10005 : 'auto', position: 'relative', padding: '0 8px' }}>❤️ 生命: {game.lives}</span>
                            <span className={`${tutorialStep === 2 ? 'tutorial-highlight tutorial-pointer-left' : ''} ${goldErrorAnim ? 'shake-anim' : ''}`} style={{ padding: '0 8px', color: goldErrorAnim ? '#ef4444' : undefined, borderRadius: '8px', zIndex: 10000, position: 'relative' }}>💰 金幣: {game.gold}</span>
                        </>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
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
                            onClick={() => setShowTutorial(true)}
                            title="遊戲指南 (Tutorial)"
                            style={{
                                color: showTutorial ? '#facc15' : '#aaa',
                                border: showTutorial ? '1px solid #facc15' : '1px solid transparent',
                                background: showTutorial ? 'rgba(250,204,21,0.1)' : 'transparent',
                                borderRadius: '50%'
                            }}
                        >
                            ❓
                        </button>
                        <button
                            className="mute-toggle-btn-header"
                            onClick={() => {
                                if (tutorialStep > 0 && tutorialStep !== 10) {
                                    triggerShake();
                                    return;
                                }
                                setShowEncyclopedia(true);
                            }}
                            title="圖鑑 / 小百科"
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

            <div className={`board-container ${game.phase === GamePhase.BATTLE ? 'is-battling' : ''}`} onClick={() => setSelected(null)}>
                {/* 1. Synergies (Player) */}
                <div className={`board-synergies ${(tutorialStep === 10 || tutorialStep === 11) ? 'tutorial-elevate' : ''}`}>
                    {synergyStatus.map(syn => (
                        <SynergyIcon
                            key={syn.id}
                            synergy={syn}
                            count={syn.count}
                            units={syn.units}
                            activeFamilies={syn.activeFamilies}
                            isTutorialHighlighted={tutorialStep === 10 && (syn.id === 'Starter' || syn.id === 'Fire')}
                            isChecked={(syn.id === 'Starter' && hoveredStarter) || (syn.id === 'Fire' && hoveredFire)}
                            onMouseEnter={() => {
                                if (tutorialStep === 10 && (syn.id === 'Starter' || syn.id === 'Fire')) {
                                    if (syn.id === 'Starter') setHoveredStarter(true);
                                    if (syn.id === 'Fire') setHoveredFire(true);
                                }
                            }}
                            onClick={() => {
                                if (tutorialStep === 10 && (syn.id === 'Starter' || syn.id === 'Fire')) {
                                    if (syn.id === 'Starter') setHoveredStarter(true);
                                    if (syn.id === 'Fire') setHoveredFire(true);
                                }
                            }}
                        />
                    ))}
                </div>

                {/* 2. Synergies (Enemy) */}
                {(initialEnemyTeam.length > 0 || displayEnemyTeam) && (
                    <div className="board-synergies" style={{ left: 'auto', right: '10px', flexDirection: 'row-reverse' }}>
                        {getSynergyStatus(initialEnemyTeam.length > 0 ? initialEnemyTeam : (displayEnemyTeam || [])).map(syn => (
                            <SynergyIcon key={syn.id} synergy={syn} count={syn.count} units={syn.units} activeFamilies={syn.activeFamilies} isEnemy={true} />
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
                <div className={`board-teams-horizontal ${(tutorialStep === 10 || tutorialStep === 11) ? 'tutorial-elevate' : ''}`} style={{
                    zIndex: (tutorialStep === 10 || tutorialStep === 11) ? 9999 : 'auto',
                    filter: (tutorialStep > 0 && tutorialStep !== 2 && tutorialStep !== 3 && tutorialStep !== 4 && tutorialStep !== 7 && tutorialStep !== 8 && tutorialStep !== 9 && tutorialStep !== 10 && tutorialStep !== 11) ? 'grayscale(100%) brightness(50%)' : 'none'
                }}>
                    {/* Left Side: Player Team */}
                    <div className={`board-side player ${(tutorialStep === 8 || tutorialStep === 9 || tutorialStep === 10 || tutorialStep === 11) ? 'tutorial-elevate' : ''}`}>
                        {Array.from({ length: 5 }).map((_, i) => {
                            const unit = displayPlayerTeam?.[i] || null;
                            const isInteractive = game.phase === GamePhase.SHOP;
                            // Check for Step 8: if we are building Charmander evolution, highlight the existing board Charmander until it hits tier 2
                            const step8CharmanderTarget = tutorialStep === 8 && unit?.family === 'charmander' && unit.level < 2;

                            return (
                                <div
                                    key={unit ? unit.id : `player-empty-${i}`}
                                    className={`unit-wrapper ${!unit && selected && selected.source !== 'ENEMY' ? 'is-target-eligible' : ''} ${((tutorialStep === 3 && unit?.family === 'gastly') || (tutorialStep === 4 && (unit?.family === 'gastly' || selected?.unit?.family === 'gastly'))) ? 'tutorial-highlight' : ''} ${(step8CharmanderTarget && game.phase === GamePhase.SHOP) ? 'synthetic-glow' : ''}`}
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
                                    style={{ height: '50px', width: '60px', zIndex: (tutorialStep === 7 || tutorialStep === 10 || tutorialStep === 11) ? 10000 : 'auto' }}
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
                                    title="切換對戰速度"
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
        </div >
    );
}

export default App;
