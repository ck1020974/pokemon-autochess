import type {AssetProgress, AssetSpec} from './AssetLoader';
import {gameAssets} from './gameAssets';

export function AssetLoadStatus({progress, assets}: {progress: AssetProgress; assets: readonly AssetSpec[]}) {
    return <div style={{fontSize: 13, color: '#526c69', marginTop: 8}}>
        <span>圖片已準備 {progress.loaded} / {progress.total}</span>
        {progress.failed > 0 && <div role="alert" style={{marginTop: 12}}>
            <p>{progress.failed} 張圖片暫時無法載入，請重試。</p>
            <button type="button" onClick={() => gameAssets.retryFailed(assets.map(asset => asset.url))}
                style={{padding: '9px 20px', border: '1px solid #71958c', borderRadius: 8, background: '#f6f5e7', color: '#284b47', cursor: 'pointer'}}>重試載入圖片</button>
        </div>}
    </div>;
}
