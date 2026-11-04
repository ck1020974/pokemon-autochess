import {useRef, useState} from 'react';

/** A new choices array starts a fresh selection. Confirmation is synchronous and fires once. */
export function useTwoTapChoice<T>(choices: readonly T[], confirm: (choice: T) => void) {
    type Selection = {choices: readonly T[]; choice: T; confirmed: boolean};
    const current = useRef<Selection | null>(null);
    const [preview, setPreview] = useState<Selection | null>(null);
    return {
        selected: preview?.choices === choices ? preview.choice : null,
        choose(choice: T) {
            if (!choices.includes(choice)) return;
            const previous = current.current;
            if (previous?.choices === choices && previous.confirmed) return;
            if (previous?.choices === choices && previous.choice === choice) {
                previous.confirmed = true;
                confirm(choice);
            } else {
                const next = {choices, choice, confirmed: false};
                current.current = next;
                setPreview(next);
            }
        }
    };
}
