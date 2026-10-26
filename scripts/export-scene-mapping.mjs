import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const server = await createServer({root, appType: 'custom', server: {middlewareMode: true}});
try {
  const {ALL_UNITS} = await server.ssrLoadModule('/src/data/AllUnits.ts');
  const {getBattleSceneClass} = await server.ssrLoadModule('/src/presentation/battlePresentation.ts');
  const catalog = JSON.parse(readFileSync(resolve(root, 'src/assets/battle-scenes/catalog.json'), 'utf8'));
  const titles = Object.fromEntries(catalog.map(s => [s.id, s.title]));
  const lines = ['# 敵方角色與場景對應表', '', '更新：2026-10-26。依現行程式實際計算；不使用訓練家原作屬性推測。', '',
    '玩家選的訓練家不影響場景。一般戰依敵方定義中的核心寶可夢羈絆判斷：至少一半核心成員符合才採用主題，多主題同分時依熱風→潮旋→吸取／蟲咬→降雪→挖洞→念力／詛咒→電光／堅硬優先。這不是要求羈絆已發動；一隻核心也可能決定場景。', '',
    '戰鬥場景只在確認對手後抽一次，開場與對戰共用。可選時避開最近兩場，候選不足時先避開上一場；單場景主題仍可能連續出現。', '',
    '四天王階段（8～11 勝）一律抽競技場：青藍、珊瑚、薄荷、薰衣草、金砂。冠軍戰（12 勝起）一律抽殿堂：青藍、薰衣草、白金。判定依遊戲階段，角色名字不覆蓋這項規則。', '',
    '下表列出一般戰（0～7 勝）的所有核心隊伍定義。初階為 0～2 勝、中階為 3～4 勝、高階為 5～7 勝；名稱後的編號可區分同名不同隊伍。', ''];
  for (const [id, label, name] of [['classic','經典版本','ClassicEdition'], ['modern','帝王版本','ModernEdition'], ['infinite','無限版本','InfiniteEdition']]) {
    const module = await server.ssrLoadModule(`/src/data/editions/${id}/index.ts`);
    const edition = module[name], groups = new Map();
    for (const [key, stage] of [['noviceOpponents','初階'], ['intermOpponents','中階'], ['advancedOpponents','高階']]) {
      for (const opponent of edition[key]) {
        const teamSynergies = opponent.coreUnits.flatMap(u => ALL_UNITS[u] ? [ALL_UNITS[u].synergies] : []);
        const scenes = [...new Set(Array.from({length: 100}, (_, i) => getBattleSceneClass('regular', opponent.id, [], {teamSynergies, random: () => i / 100}).replace('battle-scene--', '')))];
        const sceneNames = scenes.map(s => titles[s]).join('、');
        if (!groups.has(sceneNames)) groups.set(sceneNames, []);
        groups.get(sceneNames).push(`${opponent.name}（${stage} ${opponent.id}）`);
      }
    }
    lines.push(`## ${label}`, '', '| 可抽到的場景 | 敵方角色與隊伍 |', '|---|---|');
    for (const [scenes, opponents] of groups) lines.push(`| ${scenes} | ${opponents.join('、')} |`);
    lines.push('');
    console.log(`${label}: ${groups.size} 種場景組合`);
  }
  writeFileSync(resolve(root, 'docs/battle-scene-mapping.md'), lines.join('\n'), 'utf8');
} finally { await server.close(); }
