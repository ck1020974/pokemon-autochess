import {AssetLoader, downloadAsset} from './AssetLoader';
import {ALL_ASSETS, BOOT_ASSETS, assetsFor} from './assetCatalog';

export const gameAssets = new AssetLoader({baseUrl: document.baseURI, load: downloadAsset});
let started = false;
export function startAssetPreload() {
    if (started) return;
    started = true;
    gameAssets.enqueue(BOOT_ASSETS, 0);
    gameAssets.enqueue(ALL_ASSETS.filter(asset => asset.kind === 'image'), 20);
    gameAssets.enqueue(ALL_ASSETS.filter(asset => asset.kind === 'audio'), 30);
    window.addEventListener('online', () => gameAssets.retryFailed());
    document.addEventListener('visibilitychange', () => { if (!document.hidden) gameAssets.retryFailed(); });
}
export const prioritizeImages = (urls: readonly (string | undefined)[]) => gameAssets.enqueue(assetsFor(urls), 0);
