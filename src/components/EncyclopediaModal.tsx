import * as React from 'react';
import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import './EncyclopediaModal.css';
import { ALL_UNITS } from '../data/AllUnits';
import type { GameEdition } from '../models/Edition';
import { SYNERGIES } from '../models/Synergies';
import type { UnitTemplate } from '../models/Unit';
import { SynergyIcon } from './SynergyIcon';

interface EncyclopediaModalProps {
    onClose: () => void;
    activeEdition: GameEdition;
    activePoolUnitIds?: string[];
}

const TIER_NAMES = {
    1: '新手',
    2: '初級',
    3: '中級',
    4: '高級',
    5: '菁英'
};

// 計算寶可夢在進化鏈中的位置 (0 = 基礎型態, 1 = 第一階段進化...)
const getEvolutionIndex = (u: UnitTemplate) => {
    const familyUnits = Object.values(ALL_UNITS).filter(t => t.family === u.family);
    const root = familyUnits.find(t => !familyUnits.some(other => other.evolveId === t.id));
    if (!root) return 0;

    let index = 0;
    let curr: UnitTemplate | undefined = root;
    while (curr) {
        if (curr.id === u.id) return index;
        curr = curr.evolveId ? ALL_UNITS[curr.evolveId] : undefined;
        index++;
    }
    return 0;
};

// 顯式定義羈絆排序順序，確保排序邏輯萬無一失
const SYNERGY_PRIORITY = [
    'Starter',      // 御三家 (1)
    'Normal',       // 守住 (2)
    'Ghost',        // 詛咒 (3)
    'Grass',        // 吸取 (4)
    'Fire',         // 熱風 (5)
    'Water',        // 潮旋 (6)
    'Charge',       // 電光 (7)
    'BugBite',      // 蟲咬 (8)
    'Snow',         // 降雪 (9)
    'Charm',        // 撒嬌 (10)
    'Psychic',      // 念力 (11)
    'Triplets',     // 三胞胎 (12)
    'Cave',         // 挖洞 (13)
    'Hard',         // 堅硬 (14)
    'Angry',        // 憤怒 (15)
    'Thief',        // 小偷 (16)
    'Trick',        // 戲法 (17)
    'SwordDance',   // 劍舞 (18)
    'BatonPass',    // 接棒 (19)
    'Roost',        // 羽棲 (20)
    'Outrage',      // 逆鱗 (21)
];

const ENCYCLOPEDIA_VERSION = '2026-03-04-0105'; // 版本標記，用於協助使用者確認是否為最新版

export function EncyclopediaModal({ onClose, activeEdition, activePoolUnitIds = [] }: EncyclopediaModalProps) {
    const [activeTier, setActiveTier] = useState<number>(1);
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null); // Controls the detail popup
    const [viewingStageIndex, setViewingStageIndex] = useState<number>(0); // Controls which stage (0, 1, 2) is viewed in detail popup

    // Get base units (those allowed in shop, not hidden) grouped by tier
    const baseUnitsByTier = useMemo(() => {
        const groups: Record<number, UnitTemplate[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
        Object.values(ALL_UNITS).forEach(template => {
            // Filter by hidden status AND availability in the current edition
            const isAvailable = activeEdition.availableUnitIds.includes(template.id);
            const isEeveeEvolution = template.family === 'eevee' && template.id !== 'eevee' && !template.id.endsWith('_final');
            // Exclude base eevee from grid, but show its 8 evolutions (8 boxes total)
            if (isAvailable && isEeveeEvolution && template.tier >= 1 && template.tier <= 5 && template.id !== 'sprout') {
                groups[template.tier].push(template);
            } else if (isAvailable && !template.isHiddenFromShop && template.family !== 'eevee' && template.tier >= 1 && template.tier <= 5 && template.id !== 'sprout') {
                groups[template.tier].push(template);
            }
        });
        // Sort each tier
        // Priority 1: Starters (Grass -> Fire -> Water)
        // Priority 2: Group by first synergy
        Object.keys(groups).forEach(tier => {
            groups[parseInt(tier)].sort((a, b) => {
                // Priority 0: Eevee family at the absolute end, sorted in specific order
                if (a.family === 'eevee' && b.family !== 'eevee') return 1;
                if (b.family === 'eevee' && a.family !== 'eevee') return -1;
                if (a.family === 'eevee' && b.family === 'eevee') {
                    const EEVEE_ORDER = ['vaporeon', 'jolteon', 'flareon', 'espeon', 'umbreon', 'leafeon', 'glaceon', 'sylveon'];
                    return EEVEE_ORDER.indexOf(a.id) - EEVEE_ORDER.indexOf(b.id);
                }

                // Priority 0.1: Special handling for legendary beasts (Raikou, Entei, Suicune) - Always last (but before Eevee if Eevee exists in same tier)
                const getLegendaryRank = (u: UnitTemplate) => {
                    if (u.id === 'raikou') return 1;
                    if (u.id === 'entei') return 2;
                    if (u.id === 'suicune') return 3;
                    if (u.id === 'darkrai') return 4;
                    if (u.id === 'cresselia') return 5;
                    if (u.id === 'mew') return 6;
                    return 0;
                };

                const legA = getLegendaryRank(a);
                const legB = getLegendaryRank(b);
                if (legA > 0 || legB > 0) {
                    if (legA > 0 && legB > 0) return legA - legB;
                    return legA > 0 ? 1 : -1;
                }

                // Priority 1: Evolution stages (3 stages > 2 stages > 1 stage)
                // Exclude Eevee from this rule since it's already handled as absolute last
                const getEvolutionStages = (u: UnitTemplate) => {
                    const familyUnits = Object.values(ALL_UNITS).filter(t => t.family === u.family);
                    const root = familyUnits.find(t => !familyUnits.some(other => other.evolveId === t.id));
                    if (!root) return 1;
                    const uniqueNames = new Set<string>();
                    let curr: UnitTemplate | undefined = root;
                    while (curr) {
                        uniqueNames.add(curr.name);
                        curr = curr.evolveId ? ALL_UNITS[curr.evolveId] : undefined;
                    }
                    return uniqueNames.size;
                };

                const stagesA = getEvolutionStages(a);
                const stagesB = getEvolutionStages(b);
                if (stagesA !== stagesB) return stagesB - stagesA;

                const getStarterRank = (u: UnitTemplate) => {
                    if (u.synergies.includes('Starter') && u.synergies.includes('Grass')) return 1;
                    if (u.synergies.includes('Starter') && u.synergies.includes('Fire')) return 2;
                    if (u.synergies.includes('Starter') && u.synergies.includes('Water')) return 3;
                    return 99; // Not a starter
                };

                const rankA = getStarterRank(a);
                const rankB = getStarterRank(b);

                // If both are starters (or one is), sort by starter rank
                if (rankA !== 99 || rankB !== 99) {
                    if (rankA !== rankB) return rankA - rankB;
                }

                const getBestSynergyIndex = (u: UnitTemplate) => {
                    const indices = u.synergies.map(s => SYNERGY_PRIORITY.indexOf(s)).filter(idx => idx !== -1);
                    return indices.length > 0 ? Math.min(...indices) : 999;
                };

                const indexA = getBestSynergyIndex(a);
                const indexB = getBestSynergyIndex(b);

                if (indexA !== indexB) {
                    return indexA - indexB;
                }

                // Fallback to name
                return a.name.localeCompare(b.name);
            });
        });
        return groups;
    }, [activeEdition]);

    // Get evolution path for a selected unit, padding to exactly 3 evolutionary stages
    const getEvolutionPath = (startTemplateId: string) => {
        const startUnit = ALL_UNITS[startTemplateId];
        // Special Case: Eevee family path (Eevee -> Evolution -> Evolution)
        if (startUnit.family === 'eevee' && startUnit.id !== 'eevee') {
            const eevee = ALL_UNITS['eevee'];
            const stage3 = ALL_UNITS[startUnit.id + '_final'] || startUnit;
            return [eevee, startUnit, stage3];
        }

        const path: UnitTemplate[] = [];
        let current: UnitTemplate | undefined = startUnit;

        while (current) {
            path.push(current);
            if (current.evolveId) {
                current = ALL_UNITS[current.evolveId];
            } else {
                break;
            }
        }

        // Force to exactly 3 stages
        while (path.length < 3) {
            // Duplicate the final stage but trick React with a new reference/id conceptually if needed,
            // though we can map it by index to avoid key collisions.
            path.push({ ...path[path.length - 1], id: `${path[path.length - 1].id}_dup_${path.length}` });
        }

        // Just in case there are 4 stages somehow, cap it at 3
        return path.slice(0, 3);
    };

    // Simulate proper in-game stats for higher levels 
    // Stage 1 (index 0): 1 * Base
    // Stage 2 (index 1): 2 * Base + 1 (Absorb 2x 1exp + level up bonus)
    // Stage 3 (index 2): 3 * Base + 4 (Absorb 2x 3exp + level up bonus)
    const getSimulatedStats = (baseStats: { hp: number, attack: number }, stageIndex: number) => {
        if (stageIndex === 0) return { hp: baseStats.hp, attack: baseStats.attack };
        if (stageIndex === 1) return { hp: baseStats.hp * 2 + 1, attack: baseStats.attack * 2 + 1 };
        return { hp: baseStats.hp * 3 + 4, attack: baseStats.attack * 3 + 4 };
    };

    const activeUnits = baseUnitsByTier[activeTier];
    const selectedTemplate = selectedUnitId ? ALL_UNITS[selectedUnitId] : null;

    // Handle selection when changing tiers
    const handleTierChange = (tier: number) => {
        setActiveTier(tier);
    };

    return (
        <div className="encyclopedia-overlay" onClick={onClose} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 50000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            boxSizing: 'border-box',
        }}>
            <div className="encyclopedia-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="encyclopedia-header">
                    <h2 className="encyclopedia-title">📖 寶可夢圖鑑 <span style={{ fontSize: '0.8rem', opacity: 0.5, letterSpacing: 'normal' }}>v{ENCYCLOPEDIA_VERSION}</span></h2>
                    <button className="encyclopedia-close-btn" onClick={onClose}>×</button>
                </div>

                {/* Content Area */}
                <div className="encyclopedia-content">
                    {/* Sidebar Tiers */}
                    <div className="encyclopedia-sidebar">
                        {[1, 2, 3, 4, 5].map(tier => (
                            <button
                                key={tier}
                                className={`encyclopedia-tier-btn ${activeTier === tier ? 'active' : ''}`}
                                onClick={() => handleTierChange(tier)}
                            >
                                {TIER_NAMES[tier as keyof typeof TIER_NAMES]}
                            </button>
                        ))}
                    </div>

                    {/* Main Area */}
                    <div className="encyclopedia-main">
                        {/* Grid of Base Units */}
                        <div className="encyclopedia-grid">
                            {activeUnits.map(unit => (
                                <div
                                    key={unit.id}
                                    className={`encyclopedia-unit-card tier-${unit.tier}`}
                                    onClick={() => {
                                        setSelectedUnitId(unit.id);
                                        setViewingStageIndex(0);
                                    }}
                                    style={(() => {
                                        const isUnlocked = activeEdition.id === 'classic' || activeEdition.id === 'modern' || activePoolUnitIds.includes(unit.id) || (unit.family === 'eevee' && activePoolUnitIds.includes('eevee'));
                                        return !isUnlocked ? {
                                            filter: 'grayscale(100%) brightness(0.5)',
                                            opacity: 0.7
                                        } : {};
                                    })()}
                                >
                                    <img src={unit.imageUrl.replace('01.webp', '00.webp')} alt={unit.name} className="encyclopedia-unit-img" />
                                    <div className="encyclopedia-unit-name">{unit.name}</div>
                                    <div className="encyclopedia-unit-synergies" style={{
                                        display: 'flex',
                                        gap: '4px',
                                        justifyContent: 'center',
                                        marginTop: '8px',
                                        flexWrap: 'wrap'
                                    }}>
                                        {((unit.id === 'mew' && (window as any).game?.mewSynergies) ? (window as any).game.mewSynergies : unit.synergies).map((s: string) => {
                                            const synergy = SYNERGIES[s];
                                            if (!synergy) return null;

                                            // Replicate tooltip unit filtering from App.tsx/Encyclopedia detail
                                            const unitsForSyn = Object.values(ALL_UNITS).filter(t => {
                                                const isAvailable = activeEdition.availableUnitIds.includes(t.id);
                                                const isEeveeFamily = t.family === 'eevee';
                                                const isEeveeEdition = isEeveeFamily && activeEdition.availableUnitIds.includes('eevee');
                                                const isMewSyn = (t.id === 'mew' && (window as any).game?.mewSynergies?.includes(s));
                                                if (!(isAvailable || isEeveeEdition) || t.id === 'sprout' || (!t.synergies?.includes(s) && !isMewSyn)) return false;

                                                if (isEeveeFamily) return !t.id.endsWith('_final') && t.id !== 'eevee';

                                                const familyUnitsWithSynergy = Object.values(ALL_UNITS).filter(u => {
                                                    const unitIsAvailable = activeEdition.availableUnitIds.includes(u.id);
                                                    const unitIsMewSyn = (u.id === 'mew' && (window as any).game?.mewSynergies?.includes(s));
                                                    return u.family === t.family && unitIsAvailable && (u.synergies?.includes(s) || unitIsMewSyn);
                                                });
                                                const firstWithSynergy = familyUnitsWithSynergy.sort((a, b) => getEvolutionIndex(a) - getEvolutionIndex(b) || a.tier - b.tier || a.id.localeCompare(b.id))[0];
                                                return t.id === firstWithSynergy?.id;
                                            }).sort((a, b) => a.tier - b.tier);

                                            return (
                                                <SynergyIcon
                                                    key={s}
                                                    synergy={synergy}
                                                    showCount={false}
                                                    forceActive={true}
                                                    units={unitsForSyn}
                                                    className="encyclopedia-grid-icon"
                                                    showTooltip={false}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Selected Unit Details Modal - Use Portal to escape overflow:hidden */}
            {selectedTemplate && createPortal(
                <div className="encyclopedia-detail-overlay" onClick={(e) => { e.stopPropagation(); setSelectedUnitId(null); setViewingStageIndex(0); }}>
                    <div className="encyclopedia-detail-modal" onClick={e => e.stopPropagation()}>
                        <button className="encyclopedia-close-btn" style={{ position: 'absolute', top: '15px', right: '20px', zIndex: 10 }} onClick={() => { setSelectedUnitId(null); setViewingStageIndex(0); }}>×</button>

                        {(() => {
                            const path = getEvolutionPath(selectedTemplate.id);
                            const viewingTemplate = path[viewingStageIndex] || selectedTemplate;
                            return (
                                <div className="encyclopedia-detail-content">
                                    <div className="encyclopedia-detail-header-row">
                                        <div className="encyclopedia-detail-title" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            {viewingTemplate.name}
                                            <div className="encyclopedia-detail-synergies" style={{ marginLeft: '10px' }}>
                                                {[...((viewingTemplate.id.startsWith('mew') && (window as any).game?.mewSynergies) ? (window as any).game.mewSynergies : viewingTemplate.synergies)]
                                                    .sort((a, b) => SYNERGY_PRIORITY.indexOf(a) - SYNERGY_PRIORITY.indexOf(b))
                                                    .map(synId => {
                                                        const syn = SYNERGIES[synId];
                                                        if (!syn) return null;

                                                        // Find units belonging to this synergy (matching logic)
                                                        const units = Object.values(ALL_UNITS).filter(t => {
                                                            const isAvailable = activeEdition.availableUnitIds.includes(t.id);
                                                            const isEeveeFamily = t.family === 'eevee';
                                                            const isEeveeEdition = isEeveeFamily && activeEdition.availableUnitIds.includes('eevee');
                                                            const isMewSyn = (t.id === 'mew' && (window as any).game?.mewSynergies?.includes(synId));
                                                            if (!(isAvailable || isEeveeEdition) || t.id === 'sprout' || (!t.synergies?.includes(synId) && !isMewSyn)) return false;

                                                            if (isEeveeFamily) return !t.id.endsWith('_final') && t.id !== 'eevee';

                                                            const familyUnitsWithSynergy = Object.values(ALL_UNITS).filter(u => {
                                                                const unitIsAvailable = activeEdition.availableUnitIds.includes(u.id);
                                                                const unitIsMewSyn = (u.id === 'mew' && (window as any).game?.mewSynergies?.includes(synId));
                                                                return u.family === t.family && unitIsAvailable && (u.synergies?.includes(synId) || unitIsMewSyn);
                                                            });
                                                            const firstWithSynergy = familyUnitsWithSynergy.sort((a, b) => getEvolutionIndex(a) - getEvolutionIndex(b) || a.tier - b.tier || a.id.localeCompare(b.id))[0];
                                                            return t.id === firstWithSynergy?.id;
                                                        }).sort((a, b) => a.tier - b.tier);

                                                        return (
                                                            <SynergyIcon
                                                                key={synId}
                                                                synergy={syn}
                                                                showCount={false}
                                                                forceActive={true}
                                                                units={units}
                                                                className="encyclopedia-syn-icon"
                                                            />
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="encyclopedia-evolution-path-container">
                                        <div className="encyclopedia-evolution-path">
                                            {path.map((stage, index) => {
                                                const stats = getSimulatedStats(stage.baseStats, index);
                                                const isActive = viewingStageIndex === index;

                                                return (
                                                    <React.Fragment key={stage.id}>
                                                        {index > 0 && <div className="encyclopedia-evolution-arrow"></div>}
                                                        <div
                                                            className={`encyclopedia-evolution-stage ${isActive ? 'active' : ''}`}
                                                            style={{ cursor: 'pointer' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setViewingStageIndex(index);
                                                            }}
                                                        >
                                                            <div className="encyclopedia-stage-stars">
                                                                {'★'.repeat(index + 1)}
                                                            </div>
                                                            <img src={stage.battleImageUrl || stage.imageUrl} alt={stage.name} className="encyclopedia-stage-img" />
                                                            <div className="encyclopedia-stage-name">{stage.name}</div>
                                                            <div className="encyclopedia-unit-stats" style={{ margin: '6px 0 5px 0' }}>
                                                                <span className="encyclopedia-stat-atk">⚔️ {stats.attack}</span>
                                                                <span className="encyclopedia-stat-hp">❤️ {stats.hp}</span>
                                                            </div>
                                                            <div className="encyclopedia-stage-desc" style={{ textAlign: 'left' }}>
                                                                {(() => {
                                                                    const game = (window as any).game;
                                                                    let desc = stage.description || '';
                                                                    let scalingValue = 1;
                                                                    if (game) {
                                                                        if (stage.family === 'charmander') scalingValue = game.charmanderN;
                                                                        else if (stage.family === 'pichu') scalingValue = game.pichuN;
                                                                        else if (stage.family === 'riolu') scalingValue = game.rioluN;
                                                                    }
                                                                    return desc.replace('[N]', (scalingValue || 1).toString());
                                                                })()}
                                                            </div>
                                                        </div>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>,
                document.getElementById('modal-root')!
            )}
        </div>
    );
}
