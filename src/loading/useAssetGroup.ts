import {useCallback, useEffect, useMemo, useSyncExternalStore} from 'react';
import type {AssetProgress, AssetSpec} from './AssetLoader';
import {gameAssets} from './gameAssets';

export function useAssetGroup(assets: readonly AssetSpec[], priority: number) {
    const subscribe = useCallback((listener: () => void) => {
        let frame = 0;
        const update = () => {
            if (frame) return;
            frame = requestAnimationFrame(() => { frame = 0; listener(); });
        };
        const unsubscribe = gameAssets.subscribe(update);
        return () => { unsubscribe(); cancelAnimationFrame(frame); };
    }, []);
    const urls = useMemo(() => assets.map(asset => asset.url), [assets]);
    const getSnapshot = useCallback(() => JSON.stringify(gameAssets.progress(urls)), [urls]);
    useEffect(() => { gameAssets.enqueue(assets, priority); }, [assets, priority]);
    const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    return JSON.parse(snapshot) as AssetProgress;
}
