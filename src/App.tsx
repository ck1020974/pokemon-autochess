import * as React from 'react';
import { createPortal } from 'react-dom';
// Last updated: 2026-03-06 - Balance Fix Deploy
import { useState, useEffect, useRef } from 'react';
import './index.css';
import { GameLoop, GamePhase, type PoolChoice } from './engine/GameLoop';
import { music } from './engine/MusicManager';

import { BattleSimulator } from './engine/BattleSimulator';
import type { BattleLog } from './engine/BattleSimulator';
import { ALL_UNITS, PREFERRED_POSITIONS } from './data/AllUnits';
import type { PreferredPosition } from './data/AllUnits';
import { SYNERGIES } from './models/Synergies';
import { Unit, type UnitTemplate } from './models/Unit';
import { REWARD_DATA } from './models/RewardData';
import type { RewardDefinition } from './models/RewardData';
import type { GameEdition } from './models/Edition';
import { ClassicEdition } from './data/editions/classic';
import { ModernEdition } from './data/editions/modern';
import { InfiniteEdition } from './data/editions/infinite';
import { TrainerSelector } from './components/TrainerSelector';
import { BattleIntro, type BattleIntroOpponent } from './components/BattleIntro';
import { getBattleSceneClass, getPresentationKind } from './presentation/battlePresentation';
import { PLAYER_TRAINERS, type PlayerTrainer } from './presentation/trainers';

const gameWindow = window as Window & typeof globalThis & { game?: GameLoop };

// Difficulty Icons
import normalBall from './assets/普通.webp';
import greatBall from './assets/超級.webp';
import ultraBall from './assets/高級.webp';
import masterBall from './assets/大師.webp';

const EncyclopediaModal = React.lazy(() => import('./components/EncyclopediaModal').then((module) => ({ default: module.EncyclopediaModal })));
const TutorialModal = React.lazy(() => import('./components/TutorialModal').then((module) => ({ default: module.TutorialModal })));

const getInitialEdition = (): GameEdition => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('v');
    const edition = params.get('edition');
    if (v === '3' || edition === 'infinite') {
        return InfiniteEdition;
    }
    if (v === '2' || edition === 'modern') {
        return ModernEdition;
    }
    return ClassicEdition;
};

// --- Error Boundary ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: unknown }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: unknown) {
        return { hasError: true, error };
    }
    componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
        console.error("React Error Boundary caught an error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '40px', color: '#fff', background: '#1e293b', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <h1 style={{ color: '#ef4444' }}>糟糕！遊戲發生了錯誤 😵</h1>
                    <p style={{ maxWidth: '600px', margin: '20px 0', opacity: 0.8 }}>
                        這通常是由於數據不完整或狀態異常引起的。請點擊下方的按鈕嘗試重新開始。
                    </p>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px', marginBottom: '30px', textAlign: 'left', fontFamily: 'monospace', width: '80%', maxWidth: '800px', overflowX: 'auto' }}>
                        <div style={{ color: '#ef4444', marginBottom: '10px' }}>{this.state.error?.toString()}</div>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ padding: '12px 30px', borderRadius: '30px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        重新啟動遊戲
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

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

type SelectedOpponent = BattleIntroOpponent & {
    difficulty?: string;
};

interface UnitCardProps {
    unit: Unit | null;
    onClick: () => void;
    frozen?: boolean;
    draggable?: boolean;
    onDragStart?: (event: React.DragEvent) => void;
    flipped?: boolean;
    isInteractive?: boolean;
    onToggleFreeze?: () => void;
    silenced?: boolean;
    gastroAcid?: boolean;
    hpSwapped?: boolean;
    isSelected?: boolean;
    isEvolving?: boolean;
    showMergeGlow?: boolean;
    isCharmed?: boolean;
    tutorialHighlightLock?: boolean;
    synergyHighlight?: boolean;
}

// --- Helper Components ---

// UnitCard with Direct Lock & Silence Support
function UnitCard({ unit, onClick, frozen, draggable, onDragStart, flipped, isInteractive, onToggleFreeze, silenced, gastroAcid, hpSwapped, isSelected, isEvolving, showMergeGlow, tutorialHighlightLock, synergyHighlight }: UnitCardProps) {
    // Robust Check: Ensure unit and its stats exist
    if (!unit || !unit.stats || unit.stats.hp <= 0) {
        return (
            <div className="slot-placeholder">
                <div className="floor-marker"></div>
            </div>
        );
    }

    return (
        <div
            id={unit.id}
            className={`unit-card tier-${unit.tier || 1} ${frozen ? 'frozen' : ''} ${flipped ? 'flipped' : ''} ${silenced ? 'is-silenced' : ''} ${gastroAcid ? 'is-gastro-acid' : ''} ${isSelected ? 'is-selected' : ''} ${showMergeGlow ? 'is-mergeable' : ''} ${isEvolving ? 'is-evolving' : ''} ${synergyHighlight ? 'synergy-highlight' : ''}`}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            draggable={draggable}
            onDragStart={onDragStart}
            style={{
                cursor: isInteractive ? 'pointer' : 'default'
            }}
        >
            <div className="floor-marker"></div>

            {/* Silence Visual Overlay */}
            {silenced && !gastroAcid && (
                <>
                    <div className="silence-lock-badge" title="招式已被封印"> 🈲 </div>
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
            {/* isCharmed icon removed as requested, replaced by animation in BattleSimulator */}
        </div>
    );
}

import { SynergyIcon } from './components/SynergyIcon';

// Helper to force update
function useForceUpdate() {
    const [, setTick] = useState(0);
    return () => setTick((t: number) => t + 1);
}

// Helper to calculate active synergies
// Helper to calculate all synergies data
function getSynergyStatus(team: (Unit | null | undefined)[], activeEdition: GameEdition) {
    const teamUnits = team.filter((u): u is Unit => u != null);

    const allSynergies = Object.values(SYNERGIES).map(syn => {
        const synId = syn.id;
        const potentialUnits = teamUnits.filter(u => u && u.synergies && u.synergies.includes(synId));

        const activeTemplateIds = new Set(potentialUnits.map(u => u.templateId));
        const familySet = new Set(potentialUnits.map(u => u.family));

        let count = familySet.size;


        // Eevee Family Special Counting Logic
        const eeveeFamilyUnits = potentialUnits.filter(u => u.family === 'eevee');
        if (eeveeFamilyUnits.length > 0) {
            if (synId === 'BatonPass') {
                // Baton Pass: Every unique template in Eevee family counts as 1 (Character Identity)
                const uniqueEeveeTemplates = new Set(eeveeFamilyUnits.map(u => u.templateId));
                count = (familySet.size - 1) + uniqueEeveeTemplates.size;
            } else {
                // Elemental Synergy: Add bonus based on the highest level of matching evolved Eevee
                const evolvedEeveeUnits = eeveeFamilyUnits.filter(u => u.templateId !== 'eevee');
                if (evolvedEeveeUnits.length > 0) {
                    const maxLevel = Math.max(...evolvedEeveeUnits.map(u => u.level));
                    count += (maxLevel >= 3 ? 2 : 1);
                }
            }
        }

        const isActive = count >= syn.tiers[0];

        // Find units belonging to this synergy and sort them by tier
        const units = Object.values(ALL_UNITS)
            .filter(t => {
                const isEeveeFamily = t.family === 'eevee';
                const baseCondition = t.id !== 'sprout';
                // Fix: Include evolved forms even if they are not in shop (isHiddenFromShop)
                const isEeveeEdition = isEeveeFamily && activeEdition.availableUnitIds.includes('eevee');
                const isAvailable = activeEdition.availableUnitIds.includes(t.id) || isEeveeEdition;
                const isMewSyn = t.id === 'mew' && gameWindow.game?.mewSynergies?.includes(syn.id);
                if ((!t.synergies?.includes(syn.id) && !isMewSyn) || !(baseCondition || isEeveeFamily) || !isAvailable) return false;

                // For Families (except Eevee), only show the most "basic" representative that has the synergy
                // For Eevee, show ALL unique evolved forms related to this synergy
                if (isEeveeFamily) {
                    if (t.id === 'eevee') return true;
                    // If multiple stages of same evolution exist (e.g. flareon and flareon_final), only show flareon
                    return !t.id.endsWith('_final');
                }

                const familyUnits = Object.values(ALL_UNITS).filter(u => u.family === t.family && activeEdition.availableUnitIds.includes(u.id));
                const unitsWithSyn = familyUnits.filter(u => {
                    const unitIsMewSyn = u.id === 'mew' && gameWindow.game?.mewSynergies?.includes(syn.id);
                    return u.synergies?.includes(syn.id) || unitIsMewSyn;
                });

                const getStageDepth = (uId: string) => {
                    let depth = 0;
                    let currId = uId;
                    while (true) {
                        const parent = familyUnits.find(p => p.evolveId === currId);
                        if (parent) { depth++; currId = parent.id; }
                        else break;
                    }
                    return depth;
                };

                const firstInFamily = unitsWithSyn.sort((a, b) => getStageDepth(a.id) - getStageDepth(b.id))[0];
                return t.id === firstInFamily?.id;
            })
            .sort((a, b) => {
                if (a.tier !== b.tier) return a.tier - b.tier;
                // Secondary sort by definition order in ALL_UNITS is implicit because values() preserves order
                return 0;
            });

        return {
            ...syn,
            count,
            isActive,
            units,
            activeTemplateIds,
            activeFamilies: familySet
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
    const [activeEdition, setActiveEdition] = useState<GameEdition>(getInitialEdition());
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
    const [focusedVersionId, setFocusedVersionId] = useState<string | null>(null);
    const [, setLoadingStage] = useState<number>(1);
    const [phase1Loaded, setPhase1Loaded] = useState(false);

    const gameRef = useRef<GameLoop | null>(null);
    if (!gameRef.current) {
        gameRef.current = new GameLoop(activeEdition);
        gameWindow.game = gameRef.current;
    }
    const game = gameRef.current;

    const allEditionOpponents = React.useMemo(() => [
        ...activeEdition.noviceOpponents,
        ...activeEdition.intermOpponents,
        ...activeEdition.advancedOpponents,
        ...activeEdition.eliteOpponents,
        ...activeEdition.championOpponents
    ], [activeEdition]);

    const [rewardChoices, setRewardChoices] = useState<RewardDefinition[]>([]);
    const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
    const [isPoolProcessing, setIsPoolProcessing] = useState(false);
    const update = useForceUpdate();

    useEffect(() => {
        console.log("Pokemon AutoChess v4.8.5 - Quality Update");
    }, [game]);

    const handleRestart = (newEdition?: GameEdition) => {
        music.stop();
        // 1. Reset Core Engine
        const targetEdition = newEdition || activeEdition;
        const newGame = new GameLoop(targetEdition);
        gameRef.current = newGame;
        setRewardChoices([...newGame.rewardChoices]);

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
        setIsPaused(false);
        isPausedRef.current = false;
        setActiveSynergyId(null);
        setShowOpponentSelect(false);
        setSelectedOpponent(null);
        setSelectedBattleSceneClass('');
        setRecentBattleSceneClasses([]);
        setOpponentChoices([]);
        setSelectedTrainer(null);
        setShowTrainerSelector(false);
        setPendingBattleOpponent(null);
        simulatorRef.current = null; // CRITICAL: Clear battle simulator

        // 4. Force UI Update
        setSummaryStage(1);
        setSummaryTab('team');
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

    // UI Synergy Tracking
    const [initialPlayerTeamForSynergy, setInitialPlayerTeamForSynergy] = useState<(Unit | null)[]>([]);
    const [initialEnemyTeamForSynergy, setInitialEnemyTeamForSynergy] = useState<(Unit | null)[]>([]);
    const previousGamePhase = useRef<GamePhase>(game.phase);

    // Evolution Visual State
    const [evolvingUnitId, setEvolvingUnitId] = useState<string | null>(null);

    // Battle Speed State
    const [battleSpeed, setBattleSpeed] = useState(1);
    const battleSpeedRef = useRef(battleSpeed);
    battleSpeedRef.current = battleSpeed;
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
    const [showTrainerSelector, setShowTrainerSelector] = useState(false);
    const [selectedTrainer, setSelectedTrainer] = useState<PlayerTrainer | null>(null);
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
    const [tutorialStep, setTutorialStep] = useState<number>(0);
    const [tutorialShake, setTutorialShake] = useState<boolean>(false);

    // Opponent Selection States
    const [showOpponentSelect, setShowOpponentSelect] = useState(false);
    const [opponentChoices, setOpponentChoices] = useState<SelectedOpponent[]>([]);
    const [selectedOpponent, setSelectedOpponent] = useState<SelectedOpponent | null>(null);
    const [pendingBattleOpponent, setPendingBattleOpponent] = useState<SelectedOpponent | null>(null);
    const [selectedBattleSceneClass, setSelectedBattleSceneClass] = useState('');
    const [recentBattleSceneClasses, setRecentBattleSceneClasses] = useState<string[]>([]);

    // Animation States
    const [goldErrorAnim, setGoldErrorAnim] = useState(false);
    const [hpLossAnim, setHpLossAnim] = useState(false);
    const [focusedDifficulty, setFocusedDifficulty] = useState<string | null>(null);

    // Summary Screen Stages
    const [summaryStage, setSummaryStage] = useState<1 | 2>(1);
    const [summaryTab, setSummaryTab] = useState<'team' | 'history'>('team');

    const displayPlayerTeam = (game.phase === GamePhase.BATTLE && simulatorRef.current) ? simulatorRef.current.playerTeam : game.playerTeam;
    const displayEnemyTeam = (game.phase === GamePhase.BATTLE && simulatorRef.current) ? simulatorRef.current.enemyTeam : Array(5).fill(null);
    const battleSceneClass = selectedBattleSceneClass || (selectedOpponent
        ? getBattleSceneClass(getPresentationKind(game.wins), selectedOpponent.id, recentBattleSceneClasses)
        : '');
    const preparationSceneClass = (() => {
        if (showOpponentSelect) return 'prep-scene--road';
        if (game.phase === GamePhase.REWARD || game.lastResult === 'LOSS' || game.lastResult === 'DRAW') return 'prep-scene--center';
        if (game.phase === GamePhase.POOL_SELECTION) return 'prep-scene--mart';
        if (game.phase === GamePhase.SHOP) {
            return game.lastResult === 'WIN' && game.wins >= 8 && game.wins < 12
                ? 'prep-scene--road'
                : 'prep-scene--mart';
        }
        return '';
    })();

    const tutorialUnitId = 'gastly';
    const tutorialUnitName = '鬼斯';

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
            new Unit(ALL_UNITS[tutorialUnitId]),
            new Unit(ALL_UNITS.charmander),
            new Unit(ALL_UNITS.squirtle)
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


    useEffect(() => {
        if (tutorialStep === 0) return;

        if (tutorialStep === 2) {
            if (game.playerTeam.filter(u => u !== null).length >= 3) {
                setTutorialStep(3);
                setSelected(null);
            }
        } else if (tutorialStep === 4) {
            const tutorialUnitIdx = game.playerTeam.findIndex(u => u?.family === tutorialUnitId);
            // If Tutorial Unit is in index 1-4, it's behind someone if there is another unit in index 0 to (tutorialUnitIdx-1)
            const isBehindSomeone = tutorialUnitIdx > 0 && game.playerTeam.slice(0, tutorialUnitIdx).some(u => u !== null);
            if (isBehindSomeone) {
                setTutorialStep(5);
                setSelected(null);
            }
        } else if (tutorialStep === 5) {
            const isReplaced = game.shop.slots.length === 2 && game.shop.slots[0]?.family === 'charmander' && game.shop.slots[1]?.family === 'charmander';
            if (game.gold < 10 && !isReplaced) {
                game.shop.slots = [new Unit(ALL_UNITS.charmander), new Unit(ALL_UNITS.charmander), null];
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
                        game.shop.slots[0] = new Unit(ALL_UNITS.charmander);
                        game.shop.slots[1] = new Unit(ALL_UNITS.charmander);
                        game.shop.slots[2] = new Unit(ALL_UNITS.cyndaquil);
                        game.shop.slots[3] = new Unit(ALL_UNITS.igglybuff);
                        game.shop.slots.length = 4;
                        game.shop.frozen = [false, false, false, false, false];
                        update();
                    }
                }
            }
        }
    }, [tutorialStep, game.phase, battleResult, update, game.playerTeam, game.gold, game.shop]); // Changed from gameRef.current.phase

    // Image Preloading - Split into Critical (Tier 1/2) and Background (Tier 3+)
    // PHASE 1: Core Assets (Mount)
    useEffect(() => {
        const loadCoreAssets = async () => {
            console.log(`[系統] 開始階段 1：核心資源預載入...`);
            const urls = new Set<string>();
            urls.add(normalBall);
            urls.add(greatBall);
            urls.add(ultraBall);
            urls.add(masterBall);
            urls.add('icon-192.png');
            urls.add('icon-002.png');
            urls.add('icon-003.png');

            const musicNames = ['start'];

            let loadedCount = 0;
            const total = urls.size + musicNames.length;
            const updateProgress = () => {
                loadedCount++;
                setLoadingProgress(Math.floor((loadedCount / total) * 100));
            };

            const imagePromises = Array.from(urls).map(url => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.src = url;
                    const handleLoad = () => { updateProgress(); resolve(url); };
                    img.onload = handleLoad;
                    img.onerror = handleLoad;
                });
            });

            const musicPromises = musicNames.map(name => {
                return music.preload([name]).then(() => { updateProgress(); });
            });

            await Promise.all([...imagePromises, ...musicPromises]);
            setPhase1Loaded(true);
            console.log(`[系統] 核心資源已就緒！`);
        };
        loadCoreAssets();
    }, []);

    // PHASE 2 & 3: Edition Specific Assets (Triggered after selection)
    useEffect(() => {
        if (!selectedVersionId) return;

        const loadEditionAssets = async () => {
            console.log(`[系統] 開始支援 ${activeEdition.name} 的資源載入...`);
            setHasLoaded(false);
            setLoadingProgress(0);

            const loadImages = async (urls: string[]) => {
                const imagePromises = urls.map(url => {
                    return new Promise((resolve) => {
                        const img = new Image();
                        img.src = url;
                        const handleLoad = () => resolve(url);
                        img.onload = handleLoad;
                        img.onerror = handleLoad;
                    });
                });
                await Promise.all(imagePromises);
            };

            // --- PHASE 2: 核心遊玩資源 (Tier 1-2, 初階對手, 獎勵, 核心音樂) ---
            const phase2Urls = new Set<string>();
            const phase2Music = ['pokemonmart', 'gymfight', 'gymwin', 'pokemoncenter', 'recover', 'level up'];

            Object.values(ALL_UNITS).forEach(t => {
                if (t.tier <= 2 || t.id === 'sprout') {
                    if (t.imageUrl) phase2Urls.add(t.imageUrl);
                    if (t.battleImageUrl) phase2Urls.add(t.battleImageUrl);
                }
            });

            activeEdition.noviceOpponents.forEach(op => {
                if (op.url) phase2Urls.add(op.url);
                if (op.coreUnits && Array.isArray(op.coreUnits)) {
                    op.coreUnits.forEach((id: string) => {
                        const t = ALL_UNITS[id];
                        if (t) {
                            if (t.imageUrl) phase2Urls.add(t.imageUrl);
                            if (t.battleImageUrl) phase2Urls.add(t.battleImageUrl);
                        }
                    });
                }
            });

            REWARD_DATA.forEach(reward => {
                if (reward.imageUrl) phase2Urls.add(reward.imageUrl);
            });

            setLoadingProgress(20);
            await loadImages(Array.from(phase2Urls));
            setLoadingProgress(60);
            await music.preload(phase2Music);

            setHasLoaded(true);
            setLoadingProgress(100);
            console.log(`[系統] ${activeEdition.name} 核心遊玩資源已就緒！`);

            // --- PHASE 3: 背景漸進加載 (後期音樂與高階精靈) ---
            // 延遲 2 秒開始，避免與剛開始的遊戲邏輯爭搶資源
            setTimeout(async () => {
                console.log(`[系統] 開始背景異步載入後期資源...`);

                // 1. 先載入高階精靈圖片 (圖片負擔較小，先一次性處理)
                const phase3Urls = new Set<string>();
                Object.values(ALL_UNITS).forEach(t => {
                    if (t.tier > 2 && t.id !== 'sprout') {
                        if (t.imageUrl) phase3Urls.add(t.imageUrl);
                        if (t.battleImageUrl) phase3Urls.add(t.battleImageUrl);
                    }
                });
                [...activeEdition.intermOpponents, ...activeEdition.advancedOpponents, ...activeEdition.eliteOpponents, ...activeEdition.championOpponents].forEach(op => {
                    if (op.url) phase3Urls.add(op.url);
                });
                await loadImages(Array.from(phase3Urls));

                // 2. 音樂文件分批次載入 (最關鍵的優化：每個間隔 1.5 秒，避免阻塞 Stream)
                const phase3Music = ['victoryroad', 'elitefourfight', 'elitefourwin', 'championfight', 'championwin'];
                for (const m of phase3Music) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    await music.preload([m]);
                    console.log(`[系統] 流暢解析完成: ${m}`);
                }

                console.log(`[系統] 所有資源背景載入完成。`);
            }, 2000);
        };

        loadEditionAssets();
    }, [selectedVersionId, activeEdition]);

    // --- Dynamic Preloading for Current Team & Opponents ---
    useEffect(() => {
        const teamUrls: string[] = [];
        game.playerTeam.forEach(u => {
            if (u) {
                if (u.imageUrl) teamUrls.push(u.imageUrl);
                if (u.battleImageUrl) teamUrls.push(u.battleImageUrl);
            }
        });

        // Current Opponent Preload
        if (game.currentOpponentId) {
            const op = allEditionOpponents.find(o => o.id === game.currentOpponentId);
            if (op) {
                if (op.url) teamUrls.push(op.url);
                if (op.coreUnits && Array.isArray(op.coreUnits)) {
                    op.coreUnits.forEach((id: string) => {
                        const t = ALL_UNITS[id];
                        // Get evolved forms for boss level 2 or 3 too (just basic heuristic: push the base templates, we can't perfectly predict their final generated team, but core units cover 80% of it)
                        let currentTemplate = t;
                        for (let i = 0; i < 3; i++) {
                            if (currentTemplate) {
                                if (currentTemplate.imageUrl) teamUrls.push(currentTemplate.imageUrl);
                                if (currentTemplate.battleImageUrl) teamUrls.push(currentTemplate.battleImageUrl);
                                if (currentTemplate.evolveId && ALL_UNITS[currentTemplate.evolveId]) {
                                    currentTemplate = ALL_UNITS[currentTemplate.evolveId];
                                } else {
                                    break;
                                }
                            }
                        }
                    });
                }
            }
        }

        if (teamUrls.length > 0) {
            // Silent background load
            teamUrls.forEach(url => {
                const img = new Image();
                img.src = url;
            });
        }
    }, [game.playerTeam, game.currentOpponentId, game.turn, allEditionOpponents]);

    // --- BGM Initial Logic ---
    useEffect(() => {
        if (!difficulty) {
            music.play('start', true);
        }
    }, [difficulty]);

    // Keep track of entering/leaving battle for UI synergy calculation
    useEffect(() => {
        if (game.phase === GamePhase.BATTLE && previousGamePhase.current !== GamePhase.BATTLE) {
            setInitialPlayerTeamForSynergy([...game.playerTeam]);
            // setInitialEnemyTeamForSynergy(game.opponentTeam ? [...game.opponentTeam] : []); // Removed: Captured later when team is generated
        }
        previousGamePhase.current = game.phase;
    }, [game.phase, game.playerTeam]);

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
            const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
            if (orientation.lock) {
                orientation.lock('landscape').catch(() => { /* unsupported orientation lock */ });
            }
        } catch { /* unsupported orientation lock */ }

        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    const handleDifficultySelect = (lvl: 'NORMAL' | 'GREAT' | 'ULTRA' | 'MASTER') => {
        music.stop(); // Stop 'start' music
        handleRestart(); // NEW: Fully clear state first

        const g = gameRef.current;
        if (g) {
            g.setDifficulty(lvl);

            // Explicitly initialize pool before starting shop phase for Infinite Mode
            if (activeEdition.id === 'infinite') {
                g.initInfinitePool();
            }

            g.startShopPhase(); // Ensure fresh gold and shop slots on every start
        }

        setDifficulty(lvl);
        setHasStarted(true); // Show board behind tutorial prompt
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

            // Selection based on progression
            if (game.wins <= 7) {
                music.play('gymfight', true);
            } else if (game.wins < 12) {
                music.play('elitefourfight', true);
            } else {
                music.play('championfight', true);
            }
        }
    }, [game.phase, game]);

    useEffect(() => {
        if (showOpponentSelect) {
            music.play('victoryroad', true);
            return;
        }

        if (game.phase === GamePhase.BATTLE) {
            setBattleElapsedSeconds(0);
        } else if (game.phase === GamePhase.REWARD) {
            music.play('pokemoncenter', true);
            setBattleElapsedSeconds(0);
        } else if (game.phase === GamePhase.POOL_SELECTION) {
            music.play('pokemonmart', true);
            setBattleElapsedSeconds(0);
        } else if (game.phase === GamePhase.SHOP && difficulty) {
            setBattleElapsedSeconds(0);

            // Handle Preparation Phase Music
            if (game.lastResult === 'WIN') {
                if (game.wins <= 7) {
                    music.play('pokemonmart', true);
                } else if (game.wins < 12) {
                    music.play('victoryroad', true);
                } else {
                    // Won against Champion - Keep playing victory music
                }
            } else if (game.lastResult === 'LOSS' || game.lastResult === 'DRAW') {
                // Ensure room music is playing (the recover sequence might have started in battleResult effect)
                music.play('pokemoncenter', true);
            } else {
                // Initial game start (no last result)
                music.play('pokemonmart', true);
            }
        } else if (game.phase === GamePhase.VICTORY) {
            music.playOneShot('championwin');
            setBattleElapsedSeconds(0);
        } else if (game.phase === GamePhase.GAME_OVER) {
            music.stop();
            setBattleElapsedSeconds(0);
        } else {
            setBattleElapsedSeconds(0);
        }
    }, [game.phase, difficulty, game, showOpponentSelect]);

    // Timer loop for timeout (using elapsed seconds for pause sync)
    useEffect(() => {
        let timer: ReturnType<typeof setInterval> | undefined;
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
        const battleSpeedAtStart = battleSpeedRef.current;
        if (game.phase === GamePhase.BATTLE && !simulatorRef.current) {
            // Init Battle
            // Enemy Count Logic based on User Request
            // Turn <= 1 = 3, Turn 2+ = 5
            let enemyCount = 5;
            if (game.turn <= 1) enemyCount = 3;
            else enemyCount = 5;

            let enemyTeam: (Unit | null)[] = [];

            // Helper to bias enemy generation towards higher tiers in mid/late game
            const getRandomEnemyTemplate = (templates: UnitTemplate[]) => {
                if (game.turn >= 8 && Math.random() < 0.6) {
                    const maxTier = Math.max(...templates.map(t => t.tier));
                    const highTierPool = templates.filter(t => t.tier >= maxTier - 1);
                    if (highTierPool.length > 0) return highTierPool[Math.floor(Math.random() * highTierPool.length)];
                }
                return templates[Math.floor(Math.random() * templates.length)];
            };

            // 2. Progression Settings (Star Count & Level)
            // Default settings for filler units
            try {
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
                    // Tutorial Battle 1: Use Brock (novice_3 or in_3)'s team exactly
                    const brock = activeEdition.noviceOpponents.find(n => n.id.includes('_3')) || activeEdition.noviceOpponents[0];
                    enemyTeam = (brock?.coreUnits || []).map((id: string) => {
                        const t = ALL_UNITS[id];
                        if (!t) {
                            console.warn("Tutorial unit template not found:", id);
                            return new Unit(ALL_UNITS.rattata);
                        }
                        const u = new Unit(t);
                        u.level = 1;
                        return u;
                    }).concat(Array(5).fill(null)).slice(0, 5) as Unit[];
                } else if (selectedOpponent && selectedOpponent.id) {
                    // Real gameplay OR Tutorial Battle 2: Use chosen opponent's team
                    const def = activeEdition.championOpponents.find(c => c.id === selectedOpponent.id) ||
                        activeEdition.eliteOpponents.find(c => c.id === selectedOpponent.id) ||
                        activeEdition.advancedOpponents.find(e => e.id === selectedOpponent.id) ||
                        activeEdition.intermOpponents.find(g => g.id === selectedOpponent.id) ||
                        activeEdition.noviceOpponents.find(n => n.id === selectedOpponent.id);

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
                        const getEvolvedTemplate = (t: UnitTemplate, targetLevel: number) => {
                            let current = t;
                            if (!current) return null;
                            for (let i = 1; i < targetLevel; i++) {
                                if (current && current.evolveId && ALL_UNITS[current.evolveId]) {
                                    current = ALL_UNITS[current.evolveId];
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
                            const baseT = ALL_UNITS[coreId];
                            if (baseT && activeEdition.availableUnitIds.includes(coreId)) {
                                const t = getEvolvedTemplate(baseT, bossLevel);
                                if (!t) continue;
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
                            const availableTemplates = Object.values(ALL_UNITS).filter(t => t.id !== 'sprout' && !t.isHiddenFromShop && t.tier <= shopTier && activeEdition.availableUnitIds.includes(t.id));
                            let pool = availableTemplates;
                            if (mainSynergy && Math.random() < 0.7) {
                                const sPool = availableTemplates.filter(t => t.synergies.includes(mainSynergy));
                                if (sPool.length > 0) pool = sPool;
                            }

                            const baseT = getRandomEnemyTemplate(pool);
                            const t = getEvolvedTemplate(baseT, bossLevel);
                            if (t) {
                                const u = new Unit(t);
                                u.level = bossLevel;
                                candidateUnits.push(u);
                                fillCount--;
                            }
                            attempts++;
                        }

                        const sortTeamByPositions = (unsortedUnits: Unit[]): Unit[] => {
                            const POS_SCORE: Record<PreferredPosition, number> = {
                                'FRONT': 0,
                                'FRONT_MID': 1,
                                'ALL': 2,
                                'MID': 2,
                                'MID_BACK': 3,
                                'BACK': 4
                            };

                            const getPref = (u: Unit) => PREFERRED_POSITIONS[u.family || u.templateId] || 'ALL';

                            const sorted = [...unsortedUnits].sort((a, b) => {
                                return POS_SCORE[getPref(a)] - POS_SCORE[getPref(b)];
                            });

                            const result: (Unit | null)[] = [null, null, null, null, null];
                            for (let i = 0; i < Math.min(sorted.length, 5); i++) {
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
                        enemyTeam = [new Unit(ALL_UNITS.rattata), null, null, null, null];
                    }
                } else {
                    // This block executes if there's NO selected opponent (e.g., debugging or not opening the modal)
                    const fallbackPool = game.wins >= 12 ? activeEdition.championOpponents : (game.wins >= 8 ? activeEdition.eliteOpponents : (game.wins >= 5 ? activeEdition.advancedOpponents : (game.wins >= 3 ? activeEdition.intermOpponents : activeEdition.noviceOpponents)));
                    const def = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
                    const fbCandidateUnits: Unit[] = [];
                    for (const coreId of def.coreUnits) {
                        if (fbCandidateUnits.length >= enemyCount) break;
                        const t = ALL_UNITS[coreId];
                        if (t && activeEdition.availableUnitIds.includes(coreId)) {
                            const u = new Unit(t);
                            u.level = enemyBaseLevel;
                            fbCandidateUnits.push(u);
                        }
                    }
                    let fbFillCount = enemyCount - fbCandidateUnits.length;
                    const fbShopTier = game.shop.getTier(game.turn);
                    while (fbFillCount > 0) {
                        const allT = Object.values(ALL_UNITS).filter(t => t.id !== 'sprout' && !t.isHiddenFromShop && t.tier <= fbShopTier && activeEdition.availableUnitIds.includes(t.id));
                        const t = getRandomEnemyTemplate(allT);
                        if (t) {
                            const u = new Unit(t);
                            u.level = enemyBaseLevel;
                            fbCandidateUnits.push(u);
                            fbFillCount--;
                        }
                    }

                    enemyTeam = fbCandidateUnits.concat(Array(5 - fbCandidateUnits.length).fill(null)).slice(0, 5) as unknown as Unit[];
                }

                // A. Apply forced stars (upgrades)
                const threeStarCount = enemyTeam.filter(u => u && u.level >= 3).length;
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
                    const baseStats = ALL_UNITS[u.templateId]?.baseStats || u.stats;
                    u.stats = { ...baseStats };
                    for (let lv = 2; lv <= u.level; lv++) {
                        const bHp = Math.floor(baseStats.hp * 0.5);
                        const bAtk = Math.floor(baseStats.attack * 0.5);
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
                game.opponentTeam = [...enemyTeam];
                setInitialEnemyTeamForSynergy([...enemyTeam]); // NEW: Capture synergies after generating the new team
                game.refreshSpecialDescriptions();

                const activeMultiplier = (difficulty === 'MASTER' && game.turn === 1) ? 1.0 : game.difficultyMultiplier;
                const activeBuffs = [...game.nextBattleBuffs];
                game.nextBattleBuffs = []; // Clear buffs after consumption
                const enemyPsychicN = game.wins + 1;
                
                const sim = new BattleSimulator(game.playerTeam, enemyTeam, game.savedTeam, activeMultiplier, battleSpeedAtStart, game.psychicN, enemyPsychicN, false, activeBuffs);
                simulatorRef.current = sim;
                
                // Sync difficulty-scaled stats back to GameLoop and UI state for accurate settlement display
                // Snapshot the team using clones to prevent modifications from the simulator affecting the summary
                const scaledEnemyTeamSnapshot = sim.enemyTeam.map(u => u ? sim.cloneUnit(u) : null);
                game.opponentTeam = scaledEnemyTeamSnapshot as Unit[];
                setInitialEnemyTeam(scaledEnemyTeamSnapshot as Unit[]);
                setInitialEnemyTeamForSynergy(scaledEnemyTeamSnapshot as Unit[]);
            } catch (err) {
                console.error("Battle Initialisation Error:", err);
                const fallbackUnit = new Unit(ALL_UNITS.rattata);
                enemyTeam = [fallbackUnit, null, null, null, null];
                
                const fallbackSim = new BattleSimulator(game.playerTeam, enemyTeam, game.savedTeam, 1.0, battleSpeedAtStart, 2, 2, false, []);
                simulatorRef.current = fallbackSim;
                
                const fallbackScaled = [...fallbackSim.enemyTeam];
                game.opponentTeam = fallbackScaled;
                setInitialEnemyTeam(fallbackScaled);
            }

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
                if (simulatorRef.current.isProcessing) return;
                simulatorRef.current.isProcessing = true;

                try {
                    const keepGoing = await simulatorRef.current.simulateStep();

                    if (simulatorRef.current) {
                        setLogs([...simulatorRef.current.logs]);
                    }
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
                        }, 300 / battleSpeedAtStart);
                        return;
                    }
                } finally {
                    if (simulatorRef.current) simulatorRef.current.isProcessing = false;
                }
            };

            let interval: ReturnType<typeof setInterval>;
            const initAndStart = async () => {
                try {
                    if (simulatorRef.current) await simulatorRef.current.init();
                    interval = setInterval(runBattleLoop, 1200 / battleSpeedAtStart);
                } catch (err: unknown) {
                    console.error("Battle Initialization Failed:", err);
                    const details = err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : '發生不明錯誤。';
                    window.alert(`糟糕！戰鬥啟動失敗：\n${details}`);
                }
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
    }, [game.phase, activeEdition, difficulty, game, selectedOpponent, tutorialStep]);

    // Handle Battle Result Music
    useEffect(() => {
        if (!battleResult) return;

        if (game.lives <= 0 || game.phase === GamePhase.VICTORY || game.phase === GamePhase.GAME_OVER) {
            return;
        }

        if (battleResult === 'WIN') {
            const currentWins = game.wins;

            // Determine track based on progression
            let winTrack = 'gymwin';
            if (currentWins >= 8 && currentWins < 12) {
                winTrack = 'elitefourwin';
            } else if (currentWins >= 12) {
                winTrack = 'championwin';
            }

            if (currentWins === 4 || currentWins === 8 || currentWins === 12) {
                music.playLevelUpSequence(winTrack);
            } else {
                music.play(winTrack, true);
            }
        } else if (battleResult === 'LOSS') {
            music.playRecoverSequence('pokemoncenter');
        } else if (battleResult === 'DRAW') {
            music.playRecoverSequence('pokemoncenter');
        }
    }, [battleResult, game.lives, game.phase, game.wins]);

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
    const isTutorialActionAllowed = (actionType: string, payload?: string | number) => {
        if (tutorialStep === 0) return true;

        if (tutorialStep === 1) return false;
        if (tutorialStep === 2) {
            if (actionType !== 'BUY' && actionType !== 'SELECT_SHOP') return false;
            const unit = typeof payload === 'number' ? game.shop.slots[payload] : undefined;
            const hasTutorialUnit = game.playerTeam.some(u => u?.family === tutorialUnitId);
            if (!hasTutorialUnit) {
                return unit?.family === tutorialUnitId;
            } else {
                return unit?.family === 'charmander' || unit?.family === 'squirtle';
            }
        }
        if (tutorialStep === 3) return actionType === 'SELECT_BOARD' || (actionType === 'SELECT_BOARD' && payload === tutorialUnitId);
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
        if (tutorialStep === 8) return (actionType === 'BUY' && typeof payload === 'number' && game.shop.slots[payload]?.family === 'charmander') || actionType === 'MOVE_BOARD' || (actionType === 'SELECT_BOARD' && payload === 'charmander');
        if (tutorialStep === 9) return (actionType === 'BUY' && typeof payload === 'number' && game.shop.slots[payload]?.family === 'cyndaquil') || actionType === 'MOVE_BOARD' || actionType === 'SELECT_BOARD';
        if (tutorialStep === 10) return actionType === 'START_BATTLE' || actionType === 'SELECT_BOARD' || actionType === 'MOVE_BOARD';
        if (tutorialStep === 11) return false;
        if (tutorialStep === 12) return false;
        return false;
    };

    const handleReroll = () => {
        try {
            if (!isTutorialActionAllowed('REROLL')) {
                if (tutorialStep > 0) triggerShake();
                return;
            }
            game.reroll();
            if (tutorialStep === 5) {
                // Force 2 Charmanders in the shop for Step 6 double lock tutorial
                game.shop.slots = [
                    new Unit(ALL_UNITS.charmander),
                    new Unit(ALL_UNITS.charmander),
                    new Unit(ALL_UNITS.squirtle)
                ];
                setTutorialStep(6);
            }
            update();
        } catch (err) {
            console.error("Failed to reroll:", err);
        }
    };

    const handleBuy = () => {
        try {
            if (selected && selected.source === 'SHOP') {
                if (!isTutorialActionAllowed('BUY', selected.index)) {
                    if (tutorialStep > 0) triggerShake();
                    return;
                }
                const shopUnit = game.shop.slots[selected.index];
                if (shopUnit && (game.gold < 3)) {
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
        } catch (err) {
            console.error("Failed to buy unit:", err);
            // Optionally alert user or just ignore to prevent total crash
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
        // music.stop(); // MOVED to handleOpponentSelect: Only stop when NPC is chosen
        setSelected(null);
        setBattleResult(null);

        // Prepare opponent choices
        if (tutorialStep > 0) {
            if (tutorialStep < 10) {
                // First tutorial opponent: Brock Easter Egg (Three ways to face Brock!)
                const brock = activeEdition.noviceOpponents.find(n => n.name === '小剛') || activeEdition.noviceOpponents[0];
                const brockId = brock.id;

                setOpponentChoices([
                    { id: brockId, name: '小剛', url: 'gym/小剛01.webp', difficulty: 'EASY' },
                    { id: brockId, name: '小剛', url: 'gym/小剛02.webp', difficulty: 'NORMAL' },
                    { id: brockId, name: '小剛', url: 'gym/小剛03.webp', difficulty: 'HARD' }
                ]);
            } else {
                // Second tutorial: Force Champions to ensure player defeat
                const shuffledChampions = [...activeEdition.championOpponents].sort(() => 0.5 - Math.random());
                setOpponentChoices(shuffledChampions.slice(0, 3));
            }
            setShowOpponentSelect(true);
            return;
        }

        // Determine which opponent pool to use based on game.wins
        let npcPool: SelectedOpponent[] = [];
        if (game.wins >= 12) {
            npcPool = activeEdition.championOpponents;
        } else if (game.wins >= 8) {
            npcPool = activeEdition.eliteOpponents;
        } else if (game.wins >= 5) {
            npcPool = activeEdition.advancedOpponents;
        } else if (game.wins >= 3) {
            npcPool = activeEdition.intermOpponents;
        } else {
            npcPool = activeEdition.noviceOpponents;
        }

        // We show opponent choices for Boss matches (Wins: 8~11 or 12) or special gym levels.
        // Actually, user spec says: "這 4 場中，每場會在對手畫面跳出從四天王中挑選。 前八勝階段... 這些館主將出現在一般戰鬥中供玩家挑戰"
        // Let's always show the opponent choice if we have a pool.
        const ALL_NPCS = npcPool;
        const unseenNpCS = ALL_NPCS.filter(boss => !game.defeatedOpponentIds?.includes(boss.id));
        const finalPool = unseenNpCS.length > 0 ? unseenNpCS : ALL_NPCS;

        const diffWeights: Record<string, number> = { 'EASY': 0, 'NORMAL': 1, 'HARD': 2, 'VERY_HARD': 3 };
        const shuffled = [...finalPool].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);
        selected.sort((a, b) => (diffWeights[a.difficulty || 'NORMAL'] ?? 1) - (diffWeights[b.difficulty || 'NORMAL'] ?? 1));

        setOpponentChoices(selected);
        setShowOpponentSelect(true);
    };

    const handleSelect = (unit: Unit | null, index: number, source: 'SHOP' | 'BOARD' | 'ENEMY') => {
        try {
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
        } catch (err) {
            console.error("Failed to select/handle interaction:", err);
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
        try {
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
        } catch (err) {
            console.error("Failed to drop unit:", err);
            setDraggedItem(null);
            setSelected(null);
        }
    };

    const beginBattle = () => {
        setPendingBattleOpponent(null);
        music.stop();
        game.startBattlePhase();
        setBattleResult(null);
        setLogs([]);
        setBattleTick(0);
        setActiveSynergyId(null);
        update();
    };

    const handleOpponentSelect = (opponent: SelectedOpponent) => {
        const nextSceneClass = getBattleSceneClass(getPresentationKind(game.wins), opponent.id, recentBattleSceneClasses);
        setSelectedOpponent(opponent);
        setSelectedBattleSceneClass(nextSceneClass);
        setRecentBattleSceneClasses((recent) => [...recent, nextSceneClass].slice(-2));
        if (opponent.id) {
            game.currentOpponentId = opponent.id;
        }
        if (opponent.difficulty) {
            game.currentOpponentDifficulty = opponent.difficulty;
        }
        setShowOpponentSelect(false);
        if (!selectedTrainer) {
            beginBattle();
            return;
        }
        setPendingBattleOpponent(opponent);
    };

    const handleBattleResultClick = () => {
        if (game.phase === 'BATTLE') {
            if (game.lastResult === 'WIN') {
                // Keep playing victory music
            } else {
                // Let the transition handle it (it might already be playing recover sequence)
            }
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
        setActiveSynergyId(null);
        update();
    };

    const handleRewardSelect = (reward: RewardDefinition) => {
        // Only stop if we are transition back to shop, which is handled below.
        game.applyReward(reward);
        setRewardChoices([]); // Clear UI state immediately

        // Return to Shop logic: Handled by centralized BGM effect
        update();
    };

    const handlePoolSelect = async (choice: PoolChoice) => {
        if (isPoolProcessing) return;
        setIsPoolProcessing(true);
        setSelectedPoolId(choice.id);

        // Calculate unselected IDs
        const unselectedIds = game.poolChoices
            .filter(c => c.id !== choice.id)
            .map(c => c.id);

        // Wait for destruction animation (matches CSS 0.6s)
        await new Promise(resolve => setTimeout(resolve, 600));

        // Short pause after destruction
        await new Promise(resolve => setTimeout(resolve, 100));

        game.applyPoolChoice(choice, unselectedIds);
        setSelectedPoolId(null);
        setIsPoolProcessing(false);
        update();
    };

    // Calculate Synergies (All)
    const activeTeamForSynergy = (game.phase === GamePhase.BATTLE || game.phase === GamePhase.VICTORY || game.phase === GamePhase.GAME_OVER)
        ? (initialPlayerTeamForSynergy.length > 0 ? initialPlayerTeamForSynergy : displayPlayerTeam)
        : displayPlayerTeam;
    const synergyStatus = getSynergyStatus(activeTeamForSynergy, activeEdition);
    const activeSynId = activeSynergyId?.includes('-') ? activeSynergyId.split('-').pop() : activeSynergyId;
    const isEnemySynergy = activeSynergyId && activeSynergyId.startsWith('ENEMY-');

    let activeSyn: ReturnType<typeof getSynergyStatus>[number] | undefined;
    if (activeSynId) {
        if (isEnemySynergy) {
            const enemyStatus = getSynergyStatus(initialEnemyTeamForSynergy.length > 0 ? initialEnemyTeamForSynergy : (game.opponentTeam || []), activeEdition);
            activeSyn = enemyStatus.find(s => s.id === activeSynId);
        } else {
            activeSyn = synergyStatus.find(s => s.id === activeSynId);
        }
        if (!activeSyn) {
            activeSyn = SYNERGIES[activeSynId] as unknown as ReturnType<typeof getSynergyStatus>[number];
        }
    }

    return (
        <div className={`game-container battle-stage-shell ${preparationSceneClass} ${game.phase === GamePhase.BATTLE ? `is-battling ${battleSceneClass}` : ''}`} onClick={() => {
            music.resumeContext();
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
            {showTutorial && tutorialStep === 0 && difficulty !== null && (
                <React.Suspense fallback={null}>
                <TutorialModal
                    onClose={() => {
                        setShowTutorial(false);
                        // CRITICAL: Sync Turn 1 initial pool choices if tutorial is skipped
                        setHasStarted(true);
                        setShowTrainerSelector(true);
                        update();
                    }}
                    onStartTutorial={startTutorial}
                />
                </React.Suspense>
            )}

            {showTrainerSelector && (
                <TrainerSelector
                    trainers={PLAYER_TRAINERS}
                    onSelect={(trainer) => {
                        setSelectedTrainer(trainer);
                        setShowTrainerSelector(false);
                    }}
                />
            )}

            {pendingBattleOpponent && selectedTrainer && (
                <BattleIntro
                    playerTrainer={selectedTrainer}
                    opponent={pendingBattleOpponent}
                    kind={getPresentationKind(game.wins)}
                    quick={false}
                    onComplete={beginBattle}
                />
            )}

            {/* Reward Selection Overlay (Z-Index 20000) */}
            {game.phase === 'REWARD' && (
                <div className="opponent-select-overlay pool-selection-overlay show" style={{
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
                        {rewardChoices.map((reward, idx) => (
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
                                        backgroundColor: '#8b5cf6', // Violet color to distinguish from NORMAL difficulty
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
                                    {tutorialStep === 3 && `認識每隻寶可夢\n🎯任務：查看${tutorialUnitName}招式並關閉面板`}
                                    {tutorialStep === 4 && `調整陣容順序\n🎯任務：將${tutorialUnitName}移動到其他位置`}
                                    {tutorialStep === 5 && "花費1$刷新商店\n🎯任務：點擊按鈕刷新商店角色"}
                                    {tutorialStep === 6 && "鎖定角色保留到下回合\n🎯任務：點擊鎖定所有小火龍"}
                                    {tutorialStep === 7 && "選擇要挑戰的訓練家\n🎯任務：點擊戰鬥按鈕"}
                                    {tutorialStep === 8 && "點擊或拖曳角色合成\n🎯任務：購買並合成小火龍"}
                                    {tutorialStep === 9 && "開啟羈絆來提高強度\n🎯任務：購買火球鼠"}
                                    {tutorialStep === 10 && "挑戰更強的訓練家\n🎯任務：點擊戰鬥按鈕"}
                                    {tutorialStep === 11 && "戰敗時將減少生命\n生命歸零將結束遊戲‼️"}
                                </div>
                            </div>
                        )}
                    </>
                )
            }

            {/* Tutorial Completion Screen (Step 12) */}
            {
                tutorialStep === 12 && (
                    <div className="battle-result-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.98)', zIndex: 30000, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => handleRestart()}>
                        <div className="result-content" style={{ textAlign: 'center' }}>
                            <div className="result-title" style={{ fontSize: '4.5rem', color: '#ffd700', textShadow: '0 0 40px rgba(255,215,0,0.6)', marginBottom: '15px' }}>
                                遊戲教學已結束
                            </div>
                            <div className="result-subtitle" style={{ fontSize: '2rem', color: '#fff', marginBottom: '50px', opacity: 0.9 }}>
                                擊敗所有訓練師，成為寶可夢冠軍！
                            </div>
                            <div style={{ fontSize: '1.3rem', color: '#aaa', animation: 'pulse 1.5s infinite' }}>
                                點擊任意處繼續
                            </div>
                        </div>
                    </div>
                )
            }


            {/* Orientation Lock Overlay */}
            {
                isPortrait && createPortal(
                    <div style={{
                        position: 'fixed', top: 0, left: 0, bottom: 0, right: 0,
                        background: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #020617 100%)',
                        zIndex: 2000000,
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
                    </div>,
                    document.getElementById('modal-root')!
                )
            }

            {/* Mute Toggle Button removed from here */}

            {/* Loading & Start Screen (Stage 1) */}
            {
                !hasStarted && !selectedVersionId && (
                    <div className="startup-overlay adventure-startup-overlay">
                        <div className="adventure-scene" aria-hidden="true">
                            <span className="adventure-cloud adventure-cloud--one" />
                            <span className="adventure-cloud adventure-cloud--two" />
                            <span className="adventure-hill adventure-hill--one" />
                            <span className="adventure-hill adventure-hill--two" />
                            <span className="adventure-road" />
                        </div>
                        <div className="adventure-brand">
                            <h1 className="adventure-title">
                                POKEMON<br />AUTOCHESS
                            </h1>
                        </div>

                        {!phase1Loaded && (
                            <div className="loading-container adventure-panel adventure-loading">
                                <div className="loading-bar-wrapper">
                                    <div className="loading-bar-fill" style={{ width: `${loadingProgress}%` }} />
                                </div>
                                <p className="adventure-loading-copy">
                                    核心資源載入中... {loadingProgress}%
                                </p>
                            </div>
                        )}

                        {/* Version Selection Options show up once Stage 1 is loaded */}
                        {phase1Loaded && (
                            <div className="difficulty-grid adventure-choice-grid">
                                {[
                                    { id: 'classic', name: '經典版本', subtitle: '簡單上手的經典玩法', icon: 'icon-192.png', color: '#10b981', available: true },
                                    { id: 'modern', name: '帝王版本', subtitle: '進階策略的豐富玩法', icon: 'icon-002.png', color: '#3b82f6', available: true },
                                    { id: 'infinite', name: '無限版本', subtitle: '全局角色的無限玩法', icon: 'icon-003.png', color: '#a855f7', available: true }
                                ].map(v => (
                                    <button
                                        key={v.id}
                                        className={`difficulty-btn adventure-choice ${focusedVersionId === v.id ? 'is-focused' : ''} ${v.available ? '' : 'is-unavailable'}`}
                                        disabled={!v.available}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!v.available) return;

                                            // Handle selecting the version
                                            if (focusedVersionId === v.id) {
                                                music.play('start', true);
                                                setSelectedVersionId(v.id);
                                                const nextEdition = v.id === 'modern' ? ModernEdition : (v.id === 'infinite' ? InfiniteEdition : ClassicEdition);
                                                setActiveEdition(nextEdition);
                                                setLoadingStage(2); // Start loading stage 2
                                            } else {
                                                setFocusedVersionId(v.id);
                                            }
                                        }}
                                    >
                                        <img src={v.icon} alt={v.name} className="adventure-choice-icon adventure-choice-icon--edition" />
                                        <div className="adventure-choice-copy">
                                            <span className="adventure-choice-name">{v.name}</span>
                                            <span className="adventure-choice-subtitle">{v.subtitle}</span>
                                            {/* {!v.available && <span style={{ fontSize: '0.75rem', color: '#ef4444', letterSpacing: '1px', marginTop: '5px' }}>(尚未開放)</span>} */}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {!phase1Loaded && (
                            <p className="adventure-version">v4.8.6 - {activeEdition.name}</p>
                        )}
                    </div>
                )
            }

            {
                !hasStarted && selectedVersionId && !hasLoaded && (
                    <div className="startup-overlay adventure-startup-overlay">
                        <div className="adventure-scene" aria-hidden="true">
                            <span className="adventure-cloud adventure-cloud--one" />
                            <span className="adventure-cloud adventure-cloud--two" />
                            <span className="adventure-hill adventure-hill--one" />
                            <span className="adventure-hill adventure-hill--two" />
                            <span className="adventure-road" />
                        </div>
                        <div className="adventure-brand">
                            <h1 className="adventure-title">
                                POKEMON<br />AUTOCHESS
                            </h1>
                        </div>

                        <div className="loading-container adventure-panel adventure-loading">
                            <div className="loading-bar-wrapper">
                                <div className="loading-bar-fill" style={{ width: `${loadingProgress}%` }} />
                            </div>
                            <p className="adventure-loading-copy">
                                版本資源載入中... {loadingProgress}%
                            </p>
                        </div>
                    </div>
                )
            }

            {/* Difficulty Selection Screen (After Version Selection & Stage 2 Load) */}
            {
                (!hasStarted && selectedVersionId && hasLoaded && difficulty === null) && (
                    <div className="startup-overlay adventure-startup-overlay">
                        <div className="adventure-scene" aria-hidden="true">
                            <span className="adventure-cloud adventure-cloud--one" />
                            <span className="adventure-cloud adventure-cloud--two" />
                            <span className="adventure-hill adventure-hill--one" />
                            <span className="adventure-hill adventure-hill--two" />
                            <span className="adventure-road" />
                        </div>
                        <div className="adventure-brand">
                            <h1 className="adventure-title">
                                POKEMON<br />AUTOCHESS
                            </h1>
                        </div>

                        <div className="difficulty-grid adventure-choice-grid adventure-choice-grid--difficulty">
                            {[
                                { id: 'NORMAL', name: '普通', icon: normalBall, color: '#ef4444' },
                                { id: 'GREAT', name: '超級', icon: greatBall, color: '#3b82f6' },
                                { id: 'ULTRA', name: '高級', icon: ultraBall, color: '#eab308' },
                                { id: 'MASTER', name: '大師', icon: masterBall, color: '#a855f7' }
                            ].map(d => (
                                <button
                                    key={d.id}
                                    className={`difficulty-btn adventure-choice ${focusedDifficulty === d.id ? 'is-focused' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (focusedDifficulty === d.id) {
                                            handleDifficultySelect(d.id as 'NORMAL' | 'GREAT' | 'ULTRA' | 'MASTER');
                                        } else {
                                            setFocusedDifficulty(d.id as 'NORMAL' | 'GREAT' | 'ULTRA' | 'MASTER');
                                        }
                                    }}
                                >
                                    <img src={d.icon} alt={d.name} className="adventure-choice-icon adventure-choice-icon--difficulty" />
                                    <span className="adventure-choice-name">{d.name}</span>
                                </button>
                            ))}
                        </div>

                        <div className="startup-footer-box adventure-footer">
                            <p className="adventure-footer-copy">選擇本次挑戰難度</p>
                        </div>
                    </div>
                )
            }

            {/* Header */}
            <div className="header" style={{ zIndex: 25000, position: 'relative' }}>
                <div className="header-section">
                    {difficulty && (
                        <div className={`difficulty-badge ${difficulty}`} style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px',
                            background: 'rgba(255,255,255,0.05)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)',
                            cursor: 'pointer', transition: 'all 0.2s'
                        }}
                            title="重新選擇版本與難度"
                            onClick={() => {
                                setConfirmDialog({
                                    message: '重新選擇遊戲？',
                                    description: '遊戲進度將被清除，並回到最初畫面重新開始！',
                                    onConfirm: () => {
                                        setConfirmDialog(null);
                                        window.location.reload();
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
                            <span style={{ color: game.wins >= 12 ? '#f472b6' : '#888' }}>👑 冠軍: {game.edition.id === 'infinite' ? '∞' : `${Math.max(0, Math.min(game.wins - 12, 1))}/1`}</span>
                        </>
                    )}
                    {/* Help & Mute Toggle Buttons inside Header - Show alongside other game info */}
                    {difficulty && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '10px' }}>
                            <button
                                className="mute-toggle-btn-header"
                                onClick={() => {
                                    if (game.phase === GamePhase.BATTLE) return;
                                    setShowTutorial(true);
                                }}
                                title="遊戲指南 (Tutorial)"
                                style={{
                                    color: showTutorial ? '#facc15' : '#aaa',
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
                    )}
                </div>
            </div>

            {/* Battle Result Overlay */}
            {
                battleResult && (
                    <div className={`battle-result-overlay battle-result--${battleResult.toLowerCase()}`} onClick={handleBattleResultClick} style={{ zIndex: 30000 }}>
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
                (game.phase === GamePhase.VICTORY || game.phase === GamePhase.GAME_OVER) && (() => {
                    const mvp = [...game.playerTeam].filter((u): u is Unit => u !== null).reduce<Unit | null>((max, current) => {
                        if (!max) return current;
                        const currentScore = (current.level * 5) + (current.tier * 2) + current.stats.attack + current.stats.maxHp;
                        const maxScore = (max.level * 5) + (max.tier * 2) + max.stats.attack + max.stats.maxHp;
                        return (currentScore > maxScore) ? current : max;
                    }, null);

                    const totalGames = game.wins + (game.drawCount || 0) + (game.lossCount || 0);
                    const winRate = totalGames > 0 ? Math.round((game.wins / totalGames) * 100) : 0;


                    const getDifficultyIcon = () => {
                        const mult = game.difficultyMultiplier || 1;
                        if (mult >= 1.5) return masterBall;
                        if (mult >= 1.3) return ultraBall;
                        if (mult >= 1.1) return greatBall;
                        return normalBall;
                    };

                    if (summaryStage === 1) {
                        return (
                            <div
                                className={`battle-result-overlay game-result-overlay ${game.phase === GamePhase.VICTORY ? 'result-screen--champion' : 'result-screen--game-over'}`}
                                style={{
                                    position: 'fixed',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    zIndex: 30000,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    animation: 'fadeIn 0.5s'
                                }}
                                onClick={() => setSummaryStage(2)}
                            >
                                <div className="result-content" style={{ textAlign: 'center' }}>
                                    <div className="result-kicker">POKÉMON AUTOCHESS · {game.phase === GamePhase.VICTORY ? 'HALL OF FAME' : 'JOURNEY PAUSED'}</div>
                                    <div className="result-title">
                                        {game.phase === GamePhase.VICTORY ? '聯盟冠軍' : '冒險失敗'}
                                    </div>
                                    <div className="result-subtitle">
                                        {game.phase === GamePhase.VICTORY ? '你的夥伴與你，一同留名殿堂' : '你的眼前一片漆黑...'}
                                    </div>
                                    <div className="result-continue">點擊畫面查看冒險紀錄</div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div
                            className={`battle-result-overlay game-result-overlay ${game.phase === GamePhase.VICTORY ? 'result-screen--champion' : 'result-screen--game-over'}`}
                            style={{
                                position: 'fixed',
                                top: 0, left: 0, right: 0, bottom: 0,
                                zIndex: 30000,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                cursor: 'default',
                                overflowY: 'auto',
                                padding: '10px'
                            }}
                            onClick={() => setActiveSynergyId(null)}
                        >
                            <div className="summary-container" style={{ position: 'relative' }} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                <div className="summary-identity" onClick={(e: React.MouseEvent) => { e.stopPropagation(); }}>
                                    {selectedTrainer?.imageUrl ? <img src={selectedTrainer.imageUrl} alt="" className="summary-trainer-image" /> : <div className="summary-trainer-fallback">★</div>}
                                    <div className="summary-identity-copy">
                                        <span>冒險主角</span>
                                        <strong>{selectedTrainer?.name ?? '訓練家'}</strong>
                                        <small>{game.phase === GamePhase.VICTORY ? '聯盟冠軍' : '冒險失敗'}</small>
                                    </div>
                                    <div className="summary-identity-stats">
                                        <div className="stat-box"><div className="stat-box-label">場數</div><div className="stat-box-value">{totalGames}</div></div>
                                        <div className="stat-box"><div className="stat-box-label">勝／平／敗</div><div className="stat-box-value">{game.wins}／{game.drawCount || 0}／{game.lossCount || 0}</div></div>
                                        <div className="stat-box"><div className="stat-box-label">勝率</div><div className="stat-box-value">{winRate}%</div></div>
                                    </div>
                                    <img src={getDifficultyIcon()} className="difficulty-icon-img" alt="難度" />
                                    <div className="summary-tabs">
                                        <button className={`summary-tab-btn-compact ${summaryTab === 'team' ? 'is-active' : ''}`} onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSummaryTab('team'); }}>隊伍</button>
                                        <button className={`summary-tab-btn-compact ${summaryTab === 'history' ? 'is-active' : ''}`} onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSummaryTab('history'); }}>對戰</button>
                                    </div>
                                </div>

                                {/* Content Area */}
                                <div className="summary-tab-content" onClick={() => setActiveSynergyId(null)}>
                                    {summaryTab === 'team' ? (
                                        <div className="summary-team-display" style={{ marginTop: '-5px' }}>
                                            <div className="summary-units-grid">
                                                {/* Synergy Display repositioned to top-left of this grid via CSS absolute positioning */}
                                                <div className="summary-synergies-row" onClick={(e) => e.stopPropagation()}>
                                                    {getSynergyStatus(initialPlayerTeamForSynergy.length > 0 ? initialPlayerTeamForSynergy : game.playerTeam, activeEdition).map(syn => (
                                                        <SynergyIcon
                                                            key={syn.id}
                                                            synergy={syn}
                                                            count={syn.count}
                                                            units={syn.units}
                                                            activeTemplateIds={syn.activeTemplateIds} activeFamilies={syn.activeFamilies}
                                                            className="summary-synergy-item"
                                                            showCount={true}
                                                            side="PLAYER"
                                                            activeSynergyId={activeSynergyId}
                                                            setActiveSynergyId={setActiveSynergyId}
                                                        />
                                                    ))}
                                                </div>
                                                {game.playerTeam.map((u, i) => {
                                                    if (!u) return <div key={i} className="summary-unit-card" style={{ width: '105px', height: '115px', background: 'rgba(255,255,255,0.03)', borderRadius: '15px', border: '1px dashed rgba(255,255,255,0.1)' }} />;
                                                    const img00 = u.imageUrl ? u.imageUrl.replace('01.webp', '00.webp') : '';
                                                    return (
                                                        <div key={i} className={`summary-unit-card ${activeSyn && u && activeSyn.activeTemplateIds?.has(u.templateId) ? 'synergy-highlight' : ''}`}>
                                                            {mvp?.id === u.id && <div className="mvp-badge"> MVP</div>}
                                                            <div className="summary-unit-img-wrapper">
                                                                <img
                                                                    src={img00}
                                                                    className="summary-unit-img"
                                                                    alt={u.name}
                                                                />
                                                            </div>
                                                            {/* <div className="summary-unit-name">{u.name}</div> */}
                                                            <div className="unit-stats" style={{ marginTop: '5px' }}>
                                                                <span className="stat-atk">{u.stats.attack}</span>
                                                                <span className="stat-hp">{u.stats.hp}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Enemy Team Section - Compressed and Headerless */}
                                            {game.opponentTeam && (
                                                <div style={{ marginTop: '20px' }}>
                                                    <div className="summary-units-grid">
                                                        <div className="summary-synergies-row">
                                                            {getSynergyStatus(initialEnemyTeamForSynergy.length > 0 ? initialEnemyTeamForSynergy : game.opponentTeam, activeEdition).map(syn => (
                                                                <SynergyIcon
                                                                    key={syn.id}
                                                                    synergy={syn}
                                                                    count={syn.count}
                                                                    units={syn.units}
                                                                    activeTemplateIds={syn.activeTemplateIds} activeFamilies={syn.activeFamilies}
                                                                    className="summary-synergy-item"
                                                                    showCount={true}
                                                                    isEnemy={true}
                                                                    side="ENEMY"
                                                                    activeSynergyId={activeSynergyId}
                                                                    setActiveSynergyId={setActiveSynergyId}
                                                                />
                                                            ))}
                                                        </div>
                                                        {game.opponentTeam.map((u, i) => {
                                                            if (!u) return <div key={`enemy-${i}`} className="summary-unit-card" style={{ width: '105px', height: '115px', background: 'rgba(255,255,255,0.01)', borderRadius: '15px', border: '1px dashed rgba(255,255,255,0.05)' }} />;
                                                            const img00 = u.imageUrl ? u.imageUrl.replace('01.webp', '00.webp') : '';
                                                            return (
                                                                <div key={`enemy-${i}`} className={`summary-unit-card ${activeSyn && u && activeSyn.activeTemplateIds?.has(u.templateId) ? 'synergy-highlight' : ''}`}>
                                                                    <div className="summary-unit-img-wrapper">
                                                                        <img
                                                                            src={img00}
                                                                            className="summary-unit-img"
                                                                            alt={u.name}
                                                                            style={{ filter: 'grayscale(0.2)' }}
                                                                        />
                                                                    </div>
                                                                    {/* <div className="summary-unit-name">{u.name}</div> */}
                                                                    <div className="unit-stats" style={{ marginTop: '5px' }}>
                                                                        <span className="stat-atk">{u.stats.attack}</span>
                                                                        <span className="stat-hp">{u.stats.hp}</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="summary-history-display">
                                            {(() => {
                                                const history = game.battleHistory || [];

                                                // Helper to get base opponent info for name-based consolidation
                                                const getConsolidatedInfo = (opponentId: string) => {
                                                    const origOp = allEditionOpponents.find(o => o.id === opponentId);
                                                    if (!origOp) return { name: '未知', url: '' };

                                                    // Use name as the key for consolidation
                                                    // Find the '01' version image for this name if it exists, otherwise use current
                                                    const baseOp = allEditionOpponents.find(o => o.name === origOp.name && (o.id.endsWith('_1') || o.url.includes('01.webp'))) || origOp;
                                                    return {
                                                        name: origOp.name,
                                                        url: baseOp.url
                                                    };
                                                };

                                                type HistoryHero = { label: string; opponentId?: string; imageUrl?: string; name?: string; isPlayer?: boolean };
                                                const playerCard: HistoryHero = {
                                                    label: '我方主角',
                                                    name: selectedTrainer?.name ?? '訓練家',
                                                    imageUrl: selectedTrainer?.imageUrl,
                                                    isPlayer: true,
                                                };

                                                // 1. Final opponent milestone
                                                let card1: HistoryHero | null = null;
                                                if (game.phase === GamePhase.VICTORY) {
                                                    const champ = history[history.length - 1];
                                                    card1 = { label: '寶可夢大師', opponentId: champ?.opponentId };
                                                } else {
                                                    const lastOpp = history[history.length - 1];
                                                    card1 = { label: '角色敗將', opponentId: lastOpp?.opponentId };
                                                }

                                                const lastEncounterIndexByName: Record<string, number> = {};

                                                history.forEach((e, idx) => {
                                                    const info = getConsolidatedInfo(e.opponentId);
                                                    lastEncounterIndexByName[info.name] = idx;
                                                });

                                                // 2. Milestone 2 (Lifelong Enemy: Draws + Losses)
                                                const nameNuisance: Record<string, number> = {};
                                                const lastSeenIdByName: Record<string, string> = {};
                                                history.forEach((e) => {
                                                    if (e.result === 'LOSS' || e.result === 'DRAW') {
                                                        const info = getConsolidatedInfo(e.opponentId);
                                                        nameNuisance[info.name] = (nameNuisance[info.name] || 0) + 1;
                                                        lastSeenIdByName[info.name] = e.opponentId;
                                                    }
                                                });
                                                let maxN = 0;
                                                let enemyName = '';
                                                Object.entries(nameNuisance).forEach(([name, count]) => {
                                                    if (count > maxN || (count === maxN && lastEncounterIndexByName[name] >= (lastEncounterIndexByName[enemyName] || 0))) {
                                                        maxN = count;
                                                        enemyName = name;
                                                    }
                                                });
                                                const card3: HistoryHero | null = enemyName ? { label: '好討厭的感覺', opponentId: lastSeenIdByName[enemyName] } : null;

                                                // 3. Milestone 3 (First Battle)
                                                const firstBattle = history[0];
                                                const card4: HistoryHero | null = firstBattle ? { label: '冒險的起點', opponentId: firstBattle.opponentId } : null;

                                                const heroes = [playerCard, card1, card4, card3];

                                                return (
                                                    <>
                                                        <div className="history-hero-grid">
                                                            {heroes.map((hero, idx) => {
                                                                if (!hero) return <div key={idx} className="hero-card is-empty"><div className="hero-label">尚未達成</div></div>;
                                                                const info = hero.isPlayer
                                                                    ? { name: hero.name ?? '訓練家', url: hero.imageUrl ?? '' }
                                                                    : getConsolidatedInfo(hero.opponentId ?? '');
                                                                return (
                                                                    <div key={idx} className={`hero-card ${hero.isPlayer ? 'hero-card--player' : ''}`}>
                                                                        <div className="hero-label">{hero.label}</div>
                                                                        {info.url && <img src={info.url} className="hero-img" alt={info.name} />}
                                                                        {hero.isPlayer && <div className="hero-name">{info.name}</div>}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        <div className="summary-history-grid" style={{ marginTop: '5px' }}>
                                                            {history.slice(-48).map((entry, idx) => {
                                                                const info = getConsolidatedInfo(entry.opponentId);
                                                                const origOp = allEditionOpponents.find(o => o.id === entry.opponentId);
                                                                const displayUrl = origOp ? origOp.url : info.url;
                                                                return (
                                                                    <div
                                                                        key={idx}
                                                                        className={`history-item is-${entry.result.toLowerCase()}`}
                                                                        title={`${info.name} - ${entry.result}`}
                                                                    >
                                                                        <img src={displayUrl} alt={info.name} />
                                                                        <div className="history-result-tag">{entry.result === 'WIN' ? 'W' : entry.result === 'LOSS' ? 'L' : 'D'}</div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>

                                <div className="summary-restart-row">
                                    <button type="button" className="summary-restart-action" onClick={() => handleRestart()}>
                                        重新開始
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()
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
                            {opponentChoices.map((npc, idx) => (
                                <div
                                    key={idx}
                                    className="opponent-card"
                                    onClick={() => handleOpponentSelect(npc)}
                                    style={{
                                        display: 'flex',
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

            <div className={`board-container ${game.phase === GamePhase.BATTLE ? 'is-battling' : ''} ${battleSceneClass}`} onClick={() => { setSelected(null); setActiveSynergyId(null); }}>
                {/* 1. Synergies (Player) */}
                <div className={`board-synergies ${([2, 3, 4, 7, 8, 9, 10, 11].includes(tutorialStep) && game.phase !== GamePhase.BATTLE) ? 'tutorial-elevate' : ''}`}>
                    {(() => {
                        if (game.phase === GamePhase.BATTLE && simulatorRef.current) {
                            return Array.from(simulatorRef.current.playerSynergies.entries())
                                .map(entry => {
                                    const id = entry[0];
                                    const count = entry[1];
                                    const syn = SYNERGIES[id];
                                    if (!syn) {
                                        console.warn(`Synergy ${id} not found in database!`);
                                        return { id, name: id, icon: '❓', description: '缺失定義', tiers: [99], color: '#ccc', count, units: [], activeTemplateIds: new Set<string>(), activeFamilies: new Set<string>(), isActive: false };
                                    }
                                    return { ...syn, count, units: [], activeTemplateIds: new Set<string>(), activeFamilies: new Set<string>(), isActive: count >= syn.tiers[0] };
                                })
                                .filter(s => s.count > 0 && s.name)
                                .sort((a, b) => {
                                    if (a.isActive && !b.isActive) return -1;
                                    if (!a.isActive && b.isActive) return 1;
                                    if (a.count !== b.count) return b.count - a.count;
                                    return a.id.localeCompare(b.id);
                                });
                        }
                        return synergyStatus;
                    })().map(syn => (
                        <SynergyIcon
                            key={syn.id}
                            synergy={syn}
                            count={syn.count}
                            units={syn.units}
                            activeTemplateIds={syn.activeTemplateIds} activeFamilies={syn.activeFamilies}
                            className=""
                            side="PLAYER"
                            activeSynergyId={activeSynergyId}
                            setActiveSynergyId={setActiveSynergyId}
                            disabled={!!battleResult}
                        />
                    ))}
                </div>

                {/* 2. Synergies (Enemy) */}
                {(initialEnemyTeam.length > 0 || displayEnemyTeam) && (
                    <div className="board-synergies" style={{ left: 'auto', right: '10px', flexDirection: 'row-reverse' }}>
                        {(() => {
                            if (game.phase === GamePhase.BATTLE && simulatorRef.current) {
                                return Array.from(simulatorRef.current.enemySynergies.entries())
                                    .map(entry => {
                                        const id = entry[0];
                                        const count = entry[1];
                                        const syn = SYNERGIES[id];
                                        if (!syn) {
                                            console.warn(`Synergy ${id} not found in database!`);
                                            return { id, name: id, icon: '❓', description: '缺失定義', tiers: [99], color: '#ccc', count, units: [], activeTemplateIds: new Set<string>(), activeFamilies: new Set<string>(), isActive: false };
                                        }
                                        return { ...syn, count, units: [], activeTemplateIds: new Set<string>(), activeFamilies: new Set<string>(), isActive: count >= syn.tiers[0] };
                                    })
                                    .filter(s => s.count > 0 && s.name)
                                    .sort((a, b) => {
                                        if (a.isActive && !b.isActive) return -1;
                                        if (!a.isActive && b.isActive) return 1;
                                        if (a.count !== b.count) return b.count - a.count;
                                        return a.id.localeCompare(b.id);
                                    });
                            }
                            return getSynergyStatus(initialEnemyTeam.length > 0 ? initialEnemyTeam : (displayEnemyTeam || []), activeEdition);
                        })().map(syn => (
                            <SynergyIcon key={syn.id} synergy={syn} count={syn.count} units={syn.units} activeTemplateIds={syn.activeTemplateIds} activeFamilies={syn.activeFamilies} isEnemy={true} side="ENEMY" activeSynergyId={activeSynergyId} setActiveSynergyId={setActiveSynergyId} disabled={!!battleResult} />
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
                                    className={`unit-wrapper ${!unit && selected && selected.source !== 'ENEMY' ? 'is-target-eligible' : ''} ${((tutorialStep === 3 && unit?.family === 'gastly') || (tutorialStep === 4 && (unit?.family === 'gastly' || selected?.unit?.family === 'gastly'))) && game.phase === GamePhase.SHOP ? 'tutorial-highlight' : ''} ${(step8CharmanderTarget && game.phase === GamePhase.SHOP) ? 'synthetic-glow' : ''} ${unit?.hasNewPermanentBuff ? 'synthetic-glow' : ''}`}
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
                                        isSelected={!!(selected?.unit === unit && selected?.source === 'BOARD')}
                                        silenced={unit ? simulatorRef.current?.unitStates.get(unit)?.isSilenced ?? false : false}
                                        gastroAcid={unit ? simulatorRef.current?.unitStates.get(unit)?.isGastroAcid ?? false : false}
                                        hpSwapped={unit ? simulatorRef.current?.unitStates.get(unit)?.hpSwapped ?? false : false}
                                        isCharmed={unit ? simulatorRef.current?.unitStates.get(unit)?.isCharmed ?? false : false}
                                        isEvolving={!!unit && evolvingUnitId === unit.id}
                                        synergyHighlight={!!(activeSyn && unit && unit.synergies.includes(activeSyn.id))}
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
                                        silenced={unit ? simulatorRef.current?.unitStates.get(unit)?.isSilenced ?? false : false}
                                        gastroAcid={unit ? simulatorRef.current?.unitStates.get(unit)?.isGastroAcid ?? false : false}
                                        hpSwapped={unit ? simulatorRef.current?.unitStates.get(unit)?.hpSwapped ?? false : false}
                                        isCharmed={unit ? simulatorRef.current?.unitStates.get(unit)?.isCharmed ?? false : false}
                                        isEvolving={!!unit && evolvingUnitId === unit.id}
                                        synergyHighlight={!!(activeSyn && unit && unit.synergies.includes(activeSyn.id))}
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
                    <div className={`shop-container ${tutorialStep === 6 ? 'tutorial-elevate' : ''}`} onClick={() => setActiveSynergyId(null)}>
                        {/* Left Controls: Compact & Side-by-Side */}
                        <div className="shop-controls">
                            {/* Row 1: Shop Level Text - Higher and Better Color */}
                            <div className="shop-info-row" style={{ justifyContent: 'center', marginBottom: '0px', marginTop: '-15px' }}>
                                <span className="tier-text" style={{ color: '#175b5c', fontSize: '1rem', opacity: 0.9 }}>商店 Lv.{game.shop.getTier(game.turn)}</span>
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
                                        unit.isMergeable = game.playerTeam.some(u => u && u.family === unit.family && u.level === unit.level);
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
                                                showMergeGlow={!!unit && unit.isMergeable}
                                                isEvolving={!!unit && evolvingUnitId === unit.id}
                                                tutorialHighlightLock={false}
                                                synergyHighlight={!!(activeSyn && unit && activeSyn.activeTemplateIds?.has(unit.templateId))}
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
                            {/* Synergy Badges */}
                            <div style={{
                                display: 'flex',
                                gap: '6px',
                                justifyContent: 'center',
                                flexWrap: 'wrap',
                                width: '100%'
                            }}>
                                {/* (Synergy Icon Logic) */}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Pool Selection Overlay (Moved to end to ensure maximum stacking priority) */}
            {hasStarted && game.phase === 'POOL_SELECTION' && !showTutorial && (
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
                    animation: 'fadeIn 0.3s ease-out',
                    overflow: 'hidden',
                    padding: '20px'
                }}>
                    <div style={{
                        maxWidth: '1200px',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}>
                        <h2 style={{
                            color: '#fff',
                            fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
                            marginBottom: 'clamp(20px, 4vw, 40px)',
                            textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                            letterSpacing: '4px',
                            textAlign: 'center'
                        }}>
                            請選擇你的角色池
                        </h2>

                        <div className="opponent-cards-container" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                            gap: 'clamp(14px, 2.2vw, 28px)',
                            justifyContent: 'center',
                            width: 'min(760px, 90vw)'
                        }}>
                            {game.poolChoices.map((choice, idx) => (
                                <div
                                    key={idx}
                                    className={`opponent-card is-selection-pool-card pool-choice-card ${(selectedPoolId && selectedPoolId !== choice.id) ? 'pool-card-destroy' : ''}`}
                                    onClick={() => void handlePoolSelect(choice)}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        cursor: isPoolProcessing ? 'default' : 'pointer',
                                        background: 'rgba(255,255,250,.92)',
                                        padding: 'clamp(8px, 1.2vw, 12px)',
                                        borderRadius: '18px',
                                        border: '1px solid rgba(26,92,88,.22)',
                                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                        width: '100%',
                                        position: 'relative',
                                        boxShadow: '0 10px 24px rgba(27,92,86,.14)',
                                        backdropFilter: 'none',
                                        opacity: (selectedPoolId && selectedPoolId === choice.id) ? 1 : undefined,
                                        transform: (selectedPoolId && selectedPoolId === choice.id) ? 'scale(1.05)' : undefined,
                                        zIndex: (selectedPoolId && selectedPoolId === choice.id) ? 100 : undefined
                                    }}
                                >
                                    <div className="pool-card-img-wrapper" style={{
                                        width: '100%',
                                        aspectRatio: '1.2',
                                        background: 'transparent',
                                        borderRadius: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: '5px',
                                        border: 'none',
                                        overflow: 'hidden'
                                    }}>
                                        <img
                                            src={ALL_UNITS[choice.id]?.imageUrl || choice.imageUrl}
                                            alt={ALL_UNITS[choice.id]?.name || choice.name}
                                            style={{
                                                width: '85%',
                                                height: '85%',
                                                objectFit: 'contain',
                                                filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.4))'
                                            }}
                                        />
                                    </div>

                                    <div className="pool-choice-card__details">
                                        <div className="pool-choice-card__title">{ALL_UNITS[choice.id]?.name || choice.name}</div>
                                        <p>{ALL_UNITS[choice.id]?.description ?? '選擇此角色加入本次冒險。'}</p>
                                    </div>

                                    {/* Synergy Badges */}
                                    <div style={{
                                        display: 'flex',
                                        gap: '6px',
                                        justifyContent: 'center',
                                        flexWrap: 'wrap',
                                        width: '100%'
                                    }}>
                                        {choice.synergies && choice.synergies.map((s: string) => {
                                            const synergy = SYNERGIES[s];
                                            if (!synergy) return null;

                                            // Filter units for this synergy (align with getSynergyStatus logic)
                                            const unitsForSyn = Object.values(ALL_UNITS).filter(t => {
                                                const isEeveeFamily = t.family === 'eevee';
                                                const isAvailable = activeEdition.availableUnitIds.includes(t.id) || (isEeveeFamily && activeEdition.availableUnitIds.includes('eevee'));
                                                if (!t.synergies?.includes(s) || !isAvailable || t.id === 'sprout') return false;

                                                if (isEeveeFamily) {
                                                    if (t.id === 'eevee') return true;
                                                    return !t.id.endsWith('_final');
                                                }

                                                const familyUnits = Object.values(ALL_UNITS).filter(u => u.family === t.family && activeEdition.availableUnitIds.includes(u.id));
                                                const root = familyUnits.sort((a, b) => (a.tier - b.tier))[0];
                                                return t.id === root.id;
                                            }).sort((a, b) => (a.tier - b.tier));

                                            // Find current synergy status to highlight already owned units
                                            const currentSynStatus = synergyStatus.find(syn => syn.id === s);
                                            const activeTemplateIds = new Set(currentSynStatus?.activeTemplateIds || []);
                                            const activeFamilies = new Set(currentSynStatus?.activeFamilies || []);

                                            // Add current choice to highlights
                                            activeTemplateIds.add(choice.id);
                                            const unitTemplate = ALL_UNITS[choice.id];
                                            if (unitTemplate && unitTemplate.family) activeFamilies.add(unitTemplate.family);

                                            return <SynergyIcon
                                                key={s}
                                                synergy={synergy}
                                                showCount={false}
                                                forceActive={true}
                                                side="PLAYER"
                                                activeSynergyId={activeSynergyId}
                                                setActiveSynergyId={setActiveSynergyId}
                                                units={unitsForSyn}
                                                activeTemplateIds={activeTemplateIds}
                                                activeFamilies={activeFamilies}
                                                className="is-selection-pool"
                                                tooltipLeft={idx === 2}
                                            />;
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Panel */}
            {
                selected && (
                    <div className="detail-panel" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
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
                                <img src={ALL_UNITS[selected.unit.templateId].imageUrl} className="detail-image" alt={selected.unit.name} style={{ width: '105px', height: '105px', objectFit: 'contain' }} />

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
                                            return <SynergyIcon key={synId} synergy={syn} showCount={false} forceActive={true} activeTemplateIds={new Set([selected.unit.templateId])} activeFamilies={new Set([selected.unit.family])} side="PLAYER" activeSynergyId={activeSynergyId} setActiveSynergyId={setActiveSynergyId} />;
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
                    <React.Suspense fallback={null}>
                    <EncyclopediaModal
                        activeEdition={activeEdition}
                        activePoolUnitIds={game.activePoolUnitIds}
                        onClose={() => {
                            setShowEncyclopedia(false);
                            if (tutorialStep === 11) {
                                setTutorialStep(12);
                            }
                        }} />
                    </React.Suspense>,
                    document.getElementById('modal-root')!
                )
            }
        </div >
    );
}

function AppWrapper() {
    return (
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    );
}

export default AppWrapper;
