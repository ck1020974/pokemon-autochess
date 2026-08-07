import * as React from 'react';
import { useState } from 'react';
import type { SynergyConfig } from '../models/Synergies';
import type { UnitTemplate } from '../models/Unit';
import type { GameLoop } from '../engine/GameLoop';

interface SynergyIconProps {
    synergy: SynergyConfig;
    count?: number;
    showCount?: boolean;
    units?: UnitTemplate[];
    activeTemplateIds?: Set<string>;
    activeFamilies?: Set<string>;
    isEnemy?: boolean;
    side?: string;
    onMouseEnter?: () => void;
    className?: string;
    activeSynergyId?: string | null;
    setActiveSynergyId?: (id: string | null) => void;
    forceActive?: boolean;
    disabled?: boolean;
    tooltipLeft?: boolean;
    showTooltip?: boolean;
}

const gameWindow = window as Window & typeof globalThis & { game?: GameLoop };

// Synergy Icon Component
export function SynergyIcon({ synergy, count, showCount = true, units, activeTemplateIds, activeFamilies, isEnemy, side, onMouseEnter, className, activeSynergyId, setActiveSynergyId, forceActive, disabled, tooltipLeft, showTooltip = true }: SynergyIconProps) {
    const [localOpen, setLocalOpen] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    // Use side-aware ID if setActiveSynergyId is provided (mainly for summary screen)
    const synergyKey = (side && synergy.id) ? `${side}-${synergy.id}` : synergy.id;
    const isForcedOpen = setActiveSynergyId ? (activeSynergyId === synergyKey) : localOpen;

    let activeDesc = synergy.description;
    const isActive = (count !== undefined && count >= synergy.tiers[0]) || forceActive;
    const style = { borderColor: isActive ? synergy.color : '#444' };

    // Dynamic [N] replacement for Psychic synergy (Fallback, mainly handled in GameLoop now)
    if (synergy.id === 'Psychic' && gameWindow.game) {
        const val = isEnemy ? (gameWindow.game.wins + 1) : gameWindow.game.psychicN;
        activeDesc = activeDesc.replace('[N]', val.toString());
    }

    return (
        <div
            className={`synergy-icon ${className || ''} ${isForcedOpen ? 'force-visible' : ''}`}
            style={style}
            onMouseEnter={() => {
                if (!showTooltip) return;
                setIsDismissed(false); // Reset dismissal on mouse enter
                if (onMouseEnter) onMouseEnter();
            }}
            onClick={(e: React.MouseEvent) => {
                if (!showTooltip) return; // Don't stop propagation if tooltip is off
                e.stopPropagation();
                if (disabled) return; // Block interaction if disabled

                if (setActiveSynergyId) {
                    setActiveSynergyId(isForcedOpen ? null : synergyKey);
                } else {
                    setLocalOpen(!isForcedOpen);
                }
            }}
            onTouchStart={(e) => {
                // Prevent ghost tooltips on mobile by stopping propagation
                if (showTooltip && setActiveSynergyId) {
                    e.stopPropagation();
                }
            }}
        >
            <span style={{
                filter: isActive ? 'none' : 'grayscale(1)',
                opacity: isActive ? 1 : 0.7
            }}>
                {synergy.icon}
            </span>
            {showCount && count !== undefined && <span style={{ position: 'absolute', bottom: -5, right: -5, fontSize: '0.7rem', background: '#000', borderRadius: '50%', padding: '0 4px', border: '1px solid #333', color: '#fff' }}>{count}</span>}
            {showTooltip && (
                <div className={`synergy-tooltip ${isEnemy ? 'is-enemy' : ''} ${tooltipLeft ? 'tooltip-left' : ''} ${isDismissed ? 'is-dismissed' : ''}`} style={isDismissed ? { visibility: 'hidden', opacity: 0, pointerEvents: 'none' } : {}}>
                    <div style={{ fontWeight: 'bold', color: isActive ? synergy.color : '#aaa', marginBottom: '4px' }}>
                        {synergy.icon} {synergy.name} {count !== undefined ? `(${count})` : ''}
                    </div>
                    <div style={{ marginBottom: '8px' }}>{activeDesc}</div>
                    {/* Unit thumbnails */}
                    {units && units.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>
                            {units.map((u) => {
                                const isUnitActive = (u.family === 'eevee')
                                    ? (activeTemplateIds?.has(u.id) || activeTemplateIds?.has(u.id + '_final') || false)
                                    : (u.family ? activeFamilies?.has(u.family) || false : false);
                                const unitStyle: React.CSSProperties = {
                                    width: '24px', height: '24px', objectFit: 'contain',
                                    borderRadius: '4px', background: 'rgba(0,0,0,0.3)',
                                    filter: isUnitActive ? 'none' : 'grayscale(1)',
                                    opacity: isUnitActive ? 1 : 0.7,
                                    border: 'none'
                                };
                                return <img key={u.id} src={u.imageUrl} alt={u.name} title={u.name} style={unitStyle} />;
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
