import {ALL_UNITS} from '../data/AllUnits';
import {REWARD_DATA} from '../models/RewardData';
import {PLAYER_TRAINERS} from '../presentation/trainers';
import type {GameEdition} from '../models/Edition';
import type {AssetSpec} from './AssetLoader';
import manifest from './assetManifest.json';

const bundled = import.meta.glob<string>(['../assets/{普通,超級,高級,大師}.webp', '../assets/battle-scenes/*.svg'], {eager: true, query: '?url', import: 'default'});
export const ALL_ASSETS: AssetSpec[] = [
    ...Object.entries(manifest.publicAssets).map(([url, bytes]) => ({url, bytes, kind: /\.(ogg|mp3|wav)$/i.test(url) ? 'audio' as const : 'image' as const})),
    ...Object.entries(bundled).map(([file, url]) => ({url, bytes: (manifest.bundledAssets as Record<string, number>)[file.replace('../assets/', '')] || 4096, kind: 'image' as const})),
];
const byUrl = new Map(ALL_ASSETS.map(asset => [asset.url, asset]));
export const assetsFor = (urls: readonly (string | undefined)[]): AssetSpec[] => [...new Set(urls.filter((url): url is string => Boolean(url)))].map(url =>
    byUrl.get(url) ?? {url, bytes: 16384, kind: 'image'});
const unitImages = Object.values(ALL_UNITS).flatMap(unit => [unit.imageUrl, unit.battleImageUrl]).filter((url): url is string => Boolean(url));
const tutorialImages = ['gym/小剛01.webp', 'gym/小剛02.webp', 'gym/小剛03.webp'];
const commonImages = [...PLAYER_TRAINERS.map(trainer => trainer.imageUrl), ...REWARD_DATA.map(reward => reward.imageUrl), ...tutorialImages];
const earlyTutorial = Object.values(ALL_UNITS).filter(unit => ['gastly', 'charmander', 'squirtle', 'cyndaquil', 'igglybuff'].includes(unit.family || unit.id))
    .flatMap(unit => [unit.imageUrl, unit.battleImageUrl]);
export const BOOT_ASSETS = assetsFor(['icon-192.png', 'icon-002.png', 'icon-003.png', ...Object.entries(bundled).filter(([file]) => !file.includes('battle-scenes/')).map(([,url]) => url),
    ...commonImages, ...earlyTutorial]);
export const getEditionAssets = (edition: GameEdition): AssetSpec[] => assetsFor([
    ...BOOT_ASSETS.map(asset => asset.url), ...unitImages,
    ...[...edition.noviceOpponents, ...edition.intermOpponents, ...edition.advancedOpponents, ...edition.eliteOpponents, ...edition.championOpponents].map(opponent => opponent.url),
]);
