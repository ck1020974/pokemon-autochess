import {useLayoutEffect} from 'react';

/** Keep the native hand's entire 15px bounce below the fixed HUD. */
export function useTutorialPointerClearance(active: boolean, layoutKey: string) {
    useLayoutEffect(() => {
        if (!active) return;
        const targets = [...document.querySelectorAll<HTMLElement>('.board-side > .unit-wrapper.tutorial-highlight')];
        const header = document.querySelector<HTMLElement>('.header');
        if (!targets.length || !header) return;
        const measure = () => {
            const clearTop = header.getBoundingClientRect().bottom + 4;
            for (const target of targets) {
                const top = Math.max(-45, clearTop + 15 - target.getBoundingClientRect().top);
                target.style.setProperty('--tutorial-hand-top', `${top}px`);
            }
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(header);
        targets.forEach(target => observer.observe(target));
        window.addEventListener('resize', measure);
        document.addEventListener('scroll', measure, true);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', measure);
            document.removeEventListener('scroll', measure, true);
            targets.forEach(target => target.style.removeProperty('--tutorial-hand-top'));
        };
    }, [active, layoutKey]);
}
