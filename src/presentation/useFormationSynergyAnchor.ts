import {useLayoutEffect, type RefObject} from 'react';

// Layout offsets ignore attack / entrance transforms, keeping the HUD steady during combat.
export function useFormationSynergyAnchor(ref: RefObject<HTMLDivElement | null>, anchorIndex: number, layoutKey: string) {
    useLayoutEffect(() => {
        const side = ref.current;
        if (!side) return;
        const measure = () => {
            const slot = side.querySelectorAll<HTMLElement>(':scope > .unit-wrapper')[anchorIndex];
            const portrait = slot?.querySelector<HTMLElement>('.unit-image, .slot-placeholder');
            let left = 0;
            let node: HTMLElement | null = portrait ?? null;
            while (node && node !== side) {
                left += node.offsetLeft;
                node = node.offsetParent as HTMLElement | null;
            }
            const right = portrait ? side.clientWidth - left - portrait.offsetWidth : 0;
            side.style.setProperty('--synergy-anchor-left', `${portrait ? left : 0}px`);
            side.style.setProperty('--synergy-anchor-right', `${right}px`);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(side);
        side.querySelectorAll<HTMLElement>(':scope > .unit-wrapper, .unit-image').forEach(element => observer.observe(element));
        return () => observer.disconnect();
    }, [ref, anchorIndex, layoutKey]);
}
