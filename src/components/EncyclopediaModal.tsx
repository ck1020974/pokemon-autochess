import * as React from 'react';
import { useState, useMemo } from 'react';
import './EncyclopediaModal.css';
import { UNIT_TEMPLATES } from '../models/UnitFactory';
import { SYNERGIES } from '../models/Synergies';
import type { UnitTemplate } from '../models/Unit';

interface EncyclopediaModalProps {
    onClose: () => void;
}

// Map tier to text
const TIER_NAMES = {
    1: '新手',
    2: '初級',
    3: '中級',
    4: '高級',
    5: '菁英'
};

export function EncyclopediaModal({ onClose }: EncyclopediaModalProps) {
    const [activeTier, setActiveTier] = useState<number>(1);
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null); // Controls the detail popup

    // Get base units (those allowed in shop, not hidden) grouped by tier
    const baseUnitsByTier = useMemo(() => {
        const groups: Record<number, UnitTemplate[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
        Object.values(UNIT_TEMPLATES).forEach(template => {
            if (!template.isHiddenFromShop && template.tier >= 1 && template.tier <= 5 && template.id !== 'sprout') {
                groups[template.tier].push(template);
            }
        });
        // Sort each tier
        // Priority 1: Starters (Grass -> Fire -> Water)
        // Priority 2: Group by first synergy
        Object.keys(groups).forEach(tier => {
            groups[parseInt(tier)].sort((a, b) => {
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

                // If neither are starters (or they are somehow exactly the same starter type), sort by first synergy definition order
                const synA = a.synergies[0] || '';
                const synB = b.synergies[0] || '';
                if (synA !== synB) {
                    const synergyOrder = Object.keys(SYNERGIES);
                    const indexA = synergyOrder.indexOf(synA);
                    const indexB = synergyOrder.indexOf(synB);
                    const finalA = indexA !== -1 ? indexA : 999;
                    const finalB = indexB !== -1 ? indexB : 999;
                    return finalA - finalB;
                }

                // Fallback to name
                return a.name.localeCompare(b.name);
            });
        });
        return groups;
    }, []);

    // Get evolution path for a selected unit, padding to exactly 3 evolutionary stages
    const getEvolutionPath = (startTemplateId: string) => {
        const path: UnitTemplate[] = [];
        let current: UnitTemplate | undefined = UNIT_TEMPLATES[startTemplateId];

        while (current) {
            path.push(current);
            if (current.evolveId) {
                current = UNIT_TEMPLATES[current.evolveId];
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
    const selectedTemplate = selectedUnitId ? UNIT_TEMPLATES[selectedUnitId] : null;

    // Handle selection when changing tiers
    const handleTierChange = (tier: number) => {
        setActiveTier(tier);
    };

    return (
        <div className="encyclopedia-overlay" onClick={onClose}>
            <div className="encyclopedia-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="encyclopedia-header">
                    <h2 className="encyclopedia-title">📖 寶可夢小百科 </h2>
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
                        <div className="encyclopedia-grid" style={{ paddingBottom: '20px' }}>
                            {activeUnits.map(unit => (
                                <div
                                    key={unit.id}
                                    className="encyclopedia-unit-card"
                                    onClick={() => setSelectedUnitId(unit.id)}
                                >
                                    <img src={unit.imageUrl} alt={unit.name} className="encyclopedia-unit-img" />
                                    <div className="encyclopedia-unit-name">{unit.name}</div>
                                    <div className="encyclopedia-unit-stats">
                                        <span className="encyclopedia-stat-atk">⚔️ {unit.baseStats.attack}</span>
                                        <span className="encyclopedia-stat-hp">❤️ {unit.baseStats.hp}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Selected Unit Details Modal (Popup within Popup) */}
            {selectedTemplate && (
                <div className="encyclopedia-detail-overlay" onClick={(e) => { e.stopPropagation(); setSelectedUnitId(null); }}>
                    <div className="encyclopedia-detail-modal" onClick={e => e.stopPropagation()}>
                        <button className="encyclopedia-close-btn" style={{ position: 'absolute', top: '15px', right: '20px', zIndex: 10 }} onClick={() => setSelectedUnitId(null)}>×</button>

                        <div className="encyclopedia-detail-content">
                            <div className="encyclopedia-detail-header-row">
                                <div className="encyclopedia-detail-title" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    {selectedTemplate.name}
                                    <div className="encyclopedia-detail-synergies" style={{ marginLeft: '10px' }}>
                                        {selectedTemplate.synergies.map(synId => {
                                            const syn = SYNERGIES[synId];
                                            if (!syn) return null;

                                            // Find units belonging to this synergy
                                            const units = Object.values(UNIT_TEMPLATES)
                                                .filter(t => t.synergies?.includes(syn.id) && !t.isHiddenFromShop && t.id !== 'sprout')
                                                .sort((a, b) => a.tier - b.tier);

                                            return (
                                                <div key={synId} className="synergy-icon" style={{ borderColor: syn.color, position: 'relative', width: '38px', height: '38px', fontSize: '1.4rem', margin: 0, zIndex: activeTier === 5 ? 100 : 1 }}>
                                                    {syn.icon}
                                                    <div className="synergy-tooltip is-enemy" style={{
                                                        position: 'absolute',
                                                        bottom: '120%', /* Position ABOVE the icon */
                                                        left: '50%',
                                                        transform: 'translateX(-50%)', /* Center horizontally */
                                                        zIndex: 20000, /* Extremely high to ensure it's on top of everything */
                                                        width: 'max-content',
                                                        maxWidth: '250px',
                                                        whiteSpace: 'normal',
                                                        textAlign: 'left',
                                                        pointerEvents: 'none' /* Prevent tooltip from blocking clicks */
                                                    }}>
                                                        <div style={{ fontWeight: 'bold', color: syn.color, marginBottom: '4px' }}>
                                                            {syn.icon} {syn.name}
                                                        </div>
                                                        <div>{syn.description}</div>
                                                        {units.length > 0 && (
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', marginTop: '8px' }}>
                                                                {units.map((u) => (
                                                                    <img key={u.id} src={u.imageUrl} alt={u.name} title={u.name} style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: 'none' }} />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="encyclopedia-evolution-path-container">
                                <div className="encyclopedia-evolution-path">
                                    {getEvolutionPath(selectedTemplate.id).map((stage, index) => {
                                        const stats = getSimulatedStats(stage.baseStats, index);
                                        return (
                                            <React.Fragment key={stage.id}>
                                                {index > 0 && <div className="encyclopedia-evolution-arrow"></div>}
                                                <div className="encyclopedia-evolution-stage">
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
                                                        {stage.description}
                                                    </div>
                                                </div>
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
