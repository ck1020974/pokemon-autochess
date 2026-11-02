import {useLayoutEffect, type RefObject} from 'react';

// Layout offsets ignore attack / entrance transforms, keeping the HUD steady during combat.
export function useFormationSynergyAnchor(ref: RefObject<HTMLDivElement | null>, layoutKey: string) {
    useLayoutEffect(() => {
        const side = ref.current;
        if (!side) return;
        const measure = () => {
            // Always anchor to logical slot 5, including when it is empty.
            // Measure the slot box, never an animated / replaced unit portrait.
            const slot = side.querySelectorAll<HTMLElement>(':scope > .unit-wrapper')[4];
            const left = slot?.offsetLeft ?? 0;
            const right = slot ? side.clientWidth - left - slot.offsetWidth : 0;
            side.style.setProperty('--synergy-anchor-left', `${left}px`);
            side.style.setProperty('--synergy-anchor-right', `${right}px`);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(side);
        side.querySelectorAll<HTMLElement>(':scope > .unit-wrapper').forEach(element => observer.observe(element));
        return () => observer.disconnect();
    }, [ref, layoutKey]);
}
