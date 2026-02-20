import * as React from 'react';
// Last updated: 2026-02-20 - Orientation Optimization Phase 4
import { useState, useEffect, useRef } from 'react';
import './index.css';
import { GameLoop, GamePhase } from './engine/GameLoop';
import { Unit } from './models/Unit';
import { BattleSimulator } from './engine/BattleSimulator';
import type { BattleLog } from './engine/BattleSimulator';
import { UNIT_TEMPLATES, PREFERRED_POSITIONS } from './models/UnitFactory';
import { SYNERGIES } from './models/Synergies';

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

// --- Helper Components ---

// UnitCard with Direct Lock & Silence Support
function UnitCard({ unit, onClick, frozen, draggable, onDragStart, flipped, isInteractive, onToggleFreeze, silenced, isSelected, isEvolving, showMergeGlow }: any) {
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
                    className={`card-lock-overlay ${frozen ? 'locked' : ''}`}
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
function SynergyIcon({ synergy, count, showCount = true, units, activeFamilies, isEnemy }: any) {
    let activeDesc = synergy.description;
    const isActive = count !== undefined && count >= synergy.tiers[0];
    const style = isActive ? { borderColor: synergy.color } : { borderColor: '#444', filter: 'grayscale(1)', opacity: 0.7 };

    return (
        <div className="synergy-icon" style={style}>
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

    const triggerEvolutionEffect = (unit: Unit | null) => {
        if (unit) {
            setEvolvingUnitId(unit.id);
            setTimeout(() => setEvolvingUnitId(null), 800);
        }
    };

    // --- Difficulty & Preloading States ---
    const [difficulty, setDifficulty] = useState<'NORMAL' | 'GREAT' | 'ULTRA' | 'MASTER' | null>(null);
    const [isPortrait, setIsPortrait] = useState(false);

    // Battle Paused State
    const [isPaused, setIsPaused] = useState(false);
    const isPausedRef = useRef(false);

    // Image Preloading - Systematically cache all unit assets on startup
    useEffect(() => {
        const preloadAllAssets = async () => {
            const urls = new Set<string>();
            Object.values(UNIT_TEMPLATES).forEach(t => {
                if (t.imageUrl) urls.add(t.imageUrl);
                if (t.battleImageUrl) urls.add(t.battleImageUrl);
            });
            // Ensure derived/token images are also preloaded if they differ
            urls.add('assets/妙蛙種子01.webp');
            urls.add('assets/小拉達01.webp');
            urls.add('assets/飄飄球01.webp');
            urls.add('assets/隨風球01.webp');
            urls.add('assets/怨影娃娃01.webp');
            urls.add('assets/詛咒娃娃01.webp');

            const assetUrls = Array.from(urls);

            const promises = assetUrls.map(url => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.src = url;
                    img.onload = () => resolve(url);
                    img.onerror = () => resolve(url);
                });
            });

            console.log(`[系統] 開始預載入 ${assetUrls.length} 個美術資源...`);
            await Promise.all(promises);
            console.log(`[系統] 所有資源載入完成！`);
        };

        preloadAllAssets();
    }, []);

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
        setDifficulty(lvl);
        game.setDifficulty(lvl);
    };

    const togglePause = () => {
        isPausedRef.current = !isPausedRef.current;
        setIsPaused(isPausedRef.current);
    };

    // Reset pause when entering BATTLE
    useEffect(() => {
        if (game.phase === GamePhase.BATTLE) {
            isPausedRef.current = false;
            setIsPaused(false);
        }
    }, [game.phase]);

    useEffect(() => {
        if (game.phase === GamePhase.BATTLE) {
            setBattleElapsedSeconds(0);
        } else {
            setBattleElapsedSeconds(0);
        }
    }, [game.phase]);

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

            // Respect Shop Tier
            const shopTier = game.shop.getTier(game.turn);
            const allTemplates = Object.values(UNIT_TEMPLATES).filter(t => t.id !== 'sprout' && !t.isHiddenFromShop && t.tier <= shopTier);

            // 2. Progression Settings (Star Count & Level)
            let enemyBaseLevel = 1;
            let forcedStarCount = 0; // How many units are forced to 3-Star

            if (game.wins >= 12) {
                // Champion:
                if (difficulty === 'NORMAL' || difficulty === 'GREAT') {
                    // Normal/Great Champion: 3 Stars
                    enemyBaseLevel = 2;
                    forcedStarCount = 3;
                } else {
                    // Champion: All 5 Units 3-Star
                    enemyBaseLevel = 3;
                    forcedStarCount = 5;
                }
            } else if (game.wins >= 8) {
                // Elite Four:
                const eliteIndex = game.wins - 8; // 0, 1, 2, 3
                if (difficulty === 'NORMAL' || difficulty === 'GREAT') {
                    // Normal/Great Elite: First two (0,1) = 1 star, Last two (2,3) = 2 stars
                    enemyBaseLevel = 2;
                    forcedStarCount = eliteIndex < 2 ? 1 : 2;
                } else {
                    // Elite Four: Progressive 3-Stars (1, 2, 3, 4)
                    enemyBaseLevel = 2;
                    forcedStarCount = eliteIndex + 1; // 1, 2, 3, 4
                }
            } else {
                // Gym (Wins 0-7)
                // New Progressive Logic:
                // Turn 1-3: Base Lv 1.
                // Turn 4-6: Progressive Lv 2 units.
                // Turn 7+: All Base Lv 2.
                enemyBaseLevel = 1;

                // Ensure NO 3-Star units in Gym phase (forcedStarCount remains 0)
                // We handle 2-Star logic below with forcedTwoStarCount
            }

            // ... (Variable declarations)
            let forcedTwoStarCount = 0; // For Gym Phase scaling

            // Apply Gym Difficulty Logic
            if (game.wins < 8) {
                if (game.turn >= 7) {
                    enemyBaseLevel = 2; // Full 2-Star team
                } else if (game.turn >= 4) {
                    // Turn 4: 1 Lv 2
                    // Turn 5: 2 Lv 2
                    // Turn 6: 3 Lv 2
                    forcedTwoStarCount = game.turn - 3;
                }
            }

            // 3. Strategy / Synergy Selection
            let coreSynergyId: string | null = null;
            let synergyTargetCount = 0;
            let uniqueConstraint = false;

            // Updated Elite Thresholds: Master (Win 3+), Ultra (Win 5+), Normal (Win 10+), Great (Win 8+)
            const isEliteMatch = (difficulty === 'MASTER' && game.wins >= 3) ||
                (difficulty === 'ULTRA' && game.wins >= 5) ||
                (difficulty === 'NORMAL' && game.wins >= 10) ||
                (difficulty === 'GREAT' && game.wins >= 8);

            if (isEliteMatch) {
                // Elite/Champ Strategies
                const stratRoll = Math.random();
                if (stratRoll < 0.2) {
                    // (1) Elemental: Fire/Water/Grass (4 Units)
                    const elements = ['Fire', 'Water', 'Grass'];
                    coreSynergyId = elements[Math.floor(Math.random() * elements.length)];
                    synergyTargetCount = 4;
                } else if (stratRoll < 0.4) {
                    // (2) Environment: Cave/Snow (Contains characters)
                    const envs = ['Cave', 'Snow'];
                    coreSynergyId = envs[Math.floor(Math.random() * envs.length)];
                    synergyTargetCount = 2;
                } else if (stratRoll < 0.6) {
                    // (3) Triplets: 3 Different Characters
                    coreSynergyId = 'Triplets';
                    synergyTargetCount = 3;
                    uniqueConstraint = true;
                } else if (stratRoll < 0.8) {
                    // (4) New: Psychic Strategy
                    coreSynergyId = 'Psychic';
                    synergyTargetCount = 3;
                } else {
                    // (5) New: Starter Strategy
                    coreSynergyId = 'Starter';
                    synergyTargetCount = 4;
                }
            } else {
                // Gym Strategy (Turn >= 2)
                if (game.turn >= 2) {
                    const availableSynergies = Object.values(SYNERGIES).map(s => s.id);
                    coreSynergyId = availableSynergies[Math.floor(Math.random() * availableSynergies.length)];
                    synergyTargetCount = 3;
                }
            }

            // 4. Generate Team (Draw then Sort Strategy)
            let enemyTeam: (Unit | null)[] = [];
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
                    let t = pool[Math.floor(Math.random() * pool.length)];
                    usedTemplateIds.add(t.family || t.id);

                    let tempLevel = 1;
                    while (tempLevel < enemyBaseLevel && t.evolveId) {
                        const nextT = UNIT_TEMPLATES[t.evolveId];
                        if (nextT) { t = nextT; tempLevel++; } else break;
                    }
                    const u = new Unit(t);
                    u.level = enemyBaseLevel;

                    if (i < forcedStarCount) {
                        while (u.evolveId && u.level < 3) {
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
                        u.level = 3;
                    } else if (i < forcedTwoStarCount && u.level < 2) {
                        if (u.evolveId) {
                            const nextT = UNIT_TEMPLATES[u.evolveId];
                            if (nextT) {
                                Object.assign(u, {
                                    templateId: nextT.id, name: nextT.name, description: nextT.description,
                                    imageUrl: nextT.battleImageUrl || nextT.imageUrl,
                                    battleImageUrl: nextT.battleImageUrl, evolveId: nextT.evolveId,
                                    synergies: nextT.synergies || [], tier: nextT.tier
                                });
                                u.level++;
                            }
                        }
                        u.level = 2;
                    }

                    const baseStats = UNIT_TEMPLATES[u.family || u.id].baseStats;
                    if (u.level === 2) {
                        const bHp = baseStats.maxHp + 1; const bAtk = baseStats.attack + 1;
                        u.stats.hp += bHp; u.stats.maxHp += bHp; u.stats.attack += bAtk;
                    } else if (u.level === 3) {
                        const bHp = baseStats.maxHp * 2 + 6; const bAtk = baseStats.attack * 2 + 6;
                        u.stats.hp += bHp; u.stats.maxHp += bHp; u.stats.attack += bAtk;
                    }

                    const turnScalingStart = difficulty === 'MASTER' ? 3 : 5;
                    if (game.difficultyScore >= turnScalingStart) {
                        let scaleFactor = 0.6;
                        if (difficulty === 'MASTER' && game.difficultyScore <= 4.5) scaleFactor = 0.3;
                        const turnScale = Math.floor(game.difficultyScore * scaleFactor);
                        u.stats.hp += turnScale; u.stats.maxHp += turnScale; u.stats.attack += Math.floor(turnScale / 1.5);
                        if (game.wins >= 8) {
                            const eIdx = game.wins - 7; const eBHp = eIdx * 2; const eBAtk = eIdx * 1;
                            u.stats.hp += eBHp; u.stats.maxHp += eBHp; u.stats.attack += eBAtk;
                        }
                        if (game.wins >= 12) { u.stats.hp += 10; u.stats.maxHp += 10; u.stats.attack += 5; }
                    }
                    if (u.battleImageUrl) u.imageUrl = u.battleImageUrl;
                    candidateUnits.push(u);
                }

                if (isEliteMatch) {
                    const sorted = sortTeamByPositions(candidateUnits);
                    if (sorted) { enemyTeam = sorted; break; }
                } else {
                    enemyTeam = candidateUnits;
                    while (enemyTeam.length < 5) enemyTeam.push(null);
                    break;
                }
                attempts++;
            }
            if (enemyTeam.length === 0) {
                // Final fallback: just generate randomly if sorting keeps failing
                attempts = 0; // Reset for actual one-shot generation
                for (let i = 0; i < enemyCount; i++) {
                    enemyTeam.push(new Unit(allTemplates[Math.floor(Math.random() * allTemplates.length)]));
                }
                while (enemyTeam.length < 5) enemyTeam.push(null);
            }

            // Save initial state for UI Synergy (Before simulator modifies/removes dead units)
            setInitialEnemyTeam([...enemyTeam]);

            // Master Turn 1 Balance: Ensure 1.0 multiplier for fairness
            const activeMultiplier = (difficulty === 'MASTER' && game.turn === 1) ? 1.0 : game.difficultyMultiplier;
            simulatorRef.current = new BattleSimulator(game.playerTeam, enemyTeam, game.savedTeam, activeMultiplier, game.wins);
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
                        }, 300); // Shorter settlement delay as per user request
                        return; // Stop loop
                    }
                } finally {
                    if (simulatorRef.current) (simulatorRef.current as any).isProcessing = false;
                }
            };

            let interval: ReturnType<typeof setInterval>;
            const initAndStart = async () => {
                if (simulatorRef.current) await simulatorRef.current.init();
                interval = setInterval(runBattleLoop, 1200);
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
    const handleReroll = () => { game.reroll(); update(); };
    const handleBuy = () => {
        if (selected && selected.source === 'SHOP') {
            const shopUnit = game.shop.slots[selected.index];
            const targetIdx = game.buyUnit(selected.index);
            if (shopUnit && targetIdx !== null) {
                const targetUnit = game.playerTeam[targetIdx];
                if (targetUnit && targetUnit.level > shopUnit.level) {
                    triggerEvolutionEffect(targetUnit);
                }
                setSelected(null);
                update();
            }
        }
    };
    const handleSell = () => {
        if (selected && selected.source === 'BOARD') {
            game.sellUnit(selected.index);
            setSelected(null);
            update();
        }
    };
    const handleFreezeToggle = (index: number) => {
        game.shop.toggleFreeze(index);
        update();
    };
    const handleStartBattle = () => {
        if (game.gold > 0) {
            const confirmed = window.confirm(`您還有 ${game.gold} 金幣尚未花完，確定進入對戰？`);
            if (!confirmed) return;
        }
        setSelected(null);
        setBattleResult(null);
        game.startBattlePhase();
        update();
    };

    const handleBattleResultClick = () => {
        if (battleResult) {
            game.endBattle(battleResult);
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
                    // Try to Buy or Synthesize from Shop
                    const shopUnit = game.shop.slots[sourceIndex];
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

        // --- Standard selection behavior (Details panel or initial selection) ---
        if (unit) {
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
                const shopUnit = game.shop.slots[sourceIndex];
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

    const displayPlayerTeam = game.phase === GamePhase.BATTLE ? simulatorRef.current?.playerTeam : game.playerTeam;
    const displayEnemyTeam = game.phase === GamePhase.BATTLE ? simulatorRef.current?.enemyTeam : Array(5).fill(null);
    const [focusedDifficulty, setFocusedDifficulty] = useState<string | null>(null);

    // Calculate Synergies (All)
    const synergyStatus = getSynergyStatus(game.playerTeam);

    return (
        <div className="game-container" onClick={() => focusedDifficulty && setFocusedDifficulty(null)}>
            {/* Orientation Lock Overlay */}
            {isPortrait && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, bottom: 0, right: 0,
                    background: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #020617 100%)',
                    zIndex: 9999,
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

            {/* Difficulty & Preloading Initial Screen */}
            {(difficulty === null) && (
                <div className="startup-overlay" style={{
                    position: 'fixed', top: 0, left: 0, bottom: 0, right: 0,
                    background: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #020617 100%)',
                    zIndex: 10000, display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', alignItems: 'center', gap: '40px'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '10px', marginTop: '5vh' }} className="startup-header-box">
                        <h1 style={{ fontSize: '3.5rem', margin: '0', letterSpacing: '4px', background: 'linear-gradient(to bottom, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>POKEMON AUTOCHESS</h1>
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
                        }}>選擇您的挑戰難度</p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="header">
                <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
                    {difficulty && (
                        <div className={`difficulty-badge ${difficulty}`} style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px',
                            background: 'rgba(255,255,255,0.05)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)'
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
                    <span>❤️ 生命: {game.lives}</span>
                    <span>💰 金幣: {game.gold}</span>
                    <span>📅 回合: {game.turn}</span>
                </div>
                <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
                    <span style={{ color: game.wins < 8 ? '#fff' : '#888' }}>🏅 道館: {Math.min(game.wins, 8)}/8</span>
                    <span style={{ color: (game.wins >= 8 && game.wins < 12) ? '#fbbf24' : '#888' }}>⚔️ 四天王: {Math.max(0, Math.min(game.wins - 8, 4))}/4</span>
                    <span style={{ color: game.wins >= 12 ? '#f472b6' : '#888' }}>👑 冠軍: {Math.max(0, Math.min(game.wins - 12, 1))}/1</span>
                </div>
            </div>

            {/* Battle Result Overlay */}
            {
                battleResult && (
                    <div className="battle-result-overlay" onClick={handleBattleResultClick}>
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
                            zIndex: 9999,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            cursor: 'pointer'
                        }}
                        onClick={handleRestart}
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
                <div className="board-synergies">
                    {synergyStatus.map(syn => (
                        <SynergyIcon key={syn.id} synergy={syn} count={syn.count} units={syn.units} activeFamilies={syn.activeFamilies} />
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
                <div className="board-teams-horizontal">
                    {/* Left Side: Player Team */}
                    <div className="board-side player">
                        {Array.from({ length: 5 }).map((_, i) => {
                            const unit = displayPlayerTeam?.[i] || null;
                            const isInteractive = game.phase === GamePhase.SHOP;
                            return (
                                <div
                                    key={unit ? unit.id : `player-empty-${i}`}
                                    className={`unit-wrapper ${!unit && selected && selected.source !== 'ENEMY' ? 'is-target-eligible' : ''}`}
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
                    <div className="shop-container">
                        {/* Left Controls: Compact & Side-by-Side */}
                        <div className="shop-controls">
                            {/* Row 1: Shop Level Text - Higher and Better Color */}
                            <div className="shop-info-row" style={{ justifyContent: 'center', marginBottom: '0px', marginTop: '-15px' }}>
                                <span className="tier-text" style={{ color: '#e2e8f0', fontSize: '1rem', opacity: 0.9 }}>商店 Lv.{game.shop.getTier(game.turn)}</span>
                            </div>

                            {/* Row 2: Battle Button - Centered and Slimmer */}
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '15px' }}>
                                <button
                                    className="btn-premium btn-battle"
                                    onClick={handleStartBattle}
                                    style={{ height: '50px', width: '60px' }}
                                >
                                    <span style={{ fontSize: '1.5rem' }}>⚔️</span>
                                </button>
                            </div>
                        </div>

                        {/* Right Shop Slots - Shifted right while button stays fixed */}
                        <div className="shop-slots-area" style={{ position: 'relative' }}>
                            {/* Reroll Button: Icon-only, Top-Left of Slot 1 - Moved down and left */}
                            <button
                                className={`reroll-icon-btn ${game.gold < 1 ? 'btn-disabled' : ''}`}
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
                                    return (
                                        <UnitCard
                                            key={i}
                                            unit={unit}
                                            onClick={() => handleSelect(unit, i, 'SHOP')}
                                            frozen={game.shop.frozen[i]}
                                            isInteractive={true}
                                            draggable={!!unit && game.gold >= 3}
                                            onDragStart={(e: React.DragEvent) => onDragStart(e, i, 'SHOP')}
                                            onToggleFreeze={() => handleFreezeToggle(i)}
                                            showMergeGlow={unit && (unit as any).isMergeable}
                                            isEvolving={unit && evolvingUnitId === unit.id}
                                        />
                                    );
                                })}

                                {/* Render Locked Slots (up to 7 total) */}
                                {Array.from({ length: 7 - game.shop.slots.length }).map((_, i) => {
                                    const slotIndex = game.shop.slots.length + i;
                                    let unlockTurn = 0;
                                    if (slotIndex === 4) unlockTurn = 3;
                                    else if (slotIndex === 5) unlockTurn = 6;
                                    else if (slotIndex === 6) unlockTurn = 9;

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
                            <button onClick={togglePause} style={{
                                border: 'none',
                                color: '#ddd',
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                textShadow: '0 0 5px rgba(0,0,0,0.8)',
                                padding: '5px 20px',
                                background: 'rgba(0,0,0,0.3)',
                                borderRadius: '20px'
                            }}>
                                {isPaused ? '▶️ 繼續' : '⛔ 暫停'}
                            </button>
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
                            onClick={() => setSelected(null)}
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
