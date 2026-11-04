import type {ReactNode} from 'react';

export function SelectionCard({children, className = '', selected, disabled = false, onChoose}: {
    children: ReactNode;
    className?: string;
    selected?: boolean;
    disabled?: boolean;
    onChoose: () => void;
}) {
    return <div className={`opponent-card selection-card ${className} ${selected ? 'is-selected' : ''}`}
        role="button" tabIndex={disabled ? -1 : 0} aria-pressed={selected} aria-disabled={disabled || undefined}
        onClick={() => { if (!disabled) onChoose(); }}
        onKeyDown={event => {
            if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
            event.preventDefault();
            if (!disabled && !event.repeat) onChoose();
        }}>
        {children}
    </div>;
}
