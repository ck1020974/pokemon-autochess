# 訓練家選擇與戰鬥演出 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增不影響遊戲數值的玩家訓練家選擇、環境式戰鬥開場與快速對戰演出設定。

**Architecture:** 將所有視覺資料與時間規則放在 `src/presentation/` 純函式模組，讓 UI 元件與 `App.tsx` 只消費它們。`TrainerSelector` 管理選角，`BattleIntro` 負責可跳過的計時演出；`App.tsx` 在選手與對手都確定後才啟動現有的 battle phase。

**Tech Stack:** React 19、TypeScript 5、Vite 7、原生 CSS、Node assertion scripts。

## Global Constraints

- 顯示角色固定為：小青、小春、小悠、小智、小遙、克麗絲、阿響、琴音、葉子、赤紅；不顯示世代或資源尾碼。
- 使用既有 `public/gym`、`public/champion` 立繪；不下載或新增外部素材。
- 場景由對手的關卡分類決定，不能依玩家隊伍、屬性或羈絆改變。
- 一般開場為 1400ms；四天王／冠軍開場為 2000ms；快速模式為 600ms；所有動畫單次點擊即完成。
- `prefers-reduced-motion: reduce` 時以 0ms 靜態轉場完成。
- 不修改 `BattleSimulator`、`HeadlessBattleSimulator`、`GameLoop` 的戰鬥規則或平衡數值。

---

### Task 1: 建立訓練家與演出純資料模組

**Files:**
- Create: `src/presentation/trainers.ts`
- Create: `src/presentation/battlePresentation.ts`
- Create: `scripts/verify-trainer-presentation.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces `PLAYER_TRAINERS`, `PlayerTrainer`, `getPresentationKind`, `getBattleIntroDuration`, `getBattleSceneClass`。
- `TrainerSelector` 與 `BattleIntro` 不得自行判讀檔名、勝場或時間規則。

- [ ] **Step 1: 寫出會失敗的資料規格測試**

```js
const { PLAYER_TRAINERS } = await server.ssrLoadModule('/src/presentation/trainers.ts');
const presentation = await server.ssrLoadModule('/src/presentation/battlePresentation.ts');
assert.deepEqual(PLAYER_TRAINERS.map(({ name }) => name), ['小青', '小春', '小悠', '小智', '小遙', '克麗絲', '阿響', '琴音', '葉子', '赤紅']);
assert.equal(new Set(PLAYER_TRAINERS.map(({ id }) => id)).size, 10);
assert.equal(presentation.getBattleIntroDuration('regular', false, false), 1400);
assert.equal(presentation.getBattleIntroDuration('elite', false, false), 2000);
assert.equal(presentation.getBattleIntroDuration('champion', true, false), 600);
assert.equal(presentation.getBattleIntroDuration('regular', false, true), 0);
```

- [ ] **Step 2: 執行測試並確認它因模組不存在而失敗**

Run: `node scripts/verify-trainer-presentation.mjs`

Expected: FAIL with a Vite module-not-found error for `src/presentation/trainers.ts`.

- [ ] **Step 3: 實作最小資料 API**

```ts
export type BattlePresentationKind = 'regular' | 'elite' | 'champion';

export const getBattleIntroDuration = (kind: BattlePresentationKind, quick: boolean, reducedMotion: boolean) =>
  reducedMotion ? 0 : quick ? 600 : kind === 'regular' ? 1400 : 2000;

export const getPresentationKind = (wins: number): BattlePresentationKind =>
  wins >= 12 ? 'champion' : wins >= 8 ? 'elite' : 'regular';
```

`PLAYER_TRAINERS` 需以十筆 `{ id, name, imageUrl }` 寫死，`name` 使用簡化名稱、`imageUrl` 使用設計規格列出的現有檔案。

- [ ] **Step 4: 驗證資料測試通過並接到 npm script**

Run: `node scripts/verify-trainer-presentation.mjs` then `npm run test:trainer-presentation`

Expected: `Trainer presentation values verified.` twice.

- [ ] **Step 5: Commit**

```powershell
git add package.json src/presentation/trainers.ts src/presentation/battlePresentation.ts scripts/verify-trainer-presentation.mjs
git commit -m "feat: add trainer presentation data"
```

### Task 2: 實作可存取的橫向選角介面

**Files:**
- Create: `src/components/TrainerSelector.tsx`
- Create: `src/components/TrainerSelector.css`
- Modify: `scripts/verify-trainer-presentation.mjs`

**Interfaces:**
- Consumes `PlayerTrainer` 與 `PLAYER_TRAINERS`。
- Produces `TrainerSelector({ trainers, onSelect })`，只透過 `onSelect(trainer)` 回傳視覺身分。

- [ ] **Step 1: 為 UI 契約加入失敗檢查**

```js
const selectorSource = await readFile(join(root, 'src/components/TrainerSelector.tsx'), 'utf8');
assert.match(selectorSource, /aria-label="選擇訓練家"/);
assert.match(selectorSource, /onSelect\(trainer\)/);
assert.match(selectorSource, /trainer-selector-track/);
```

- [ ] **Step 2: 執行測試並確認它因元件不存在而失敗**

Run: `npm run test:trainer-presentation`

Expected: FAIL with `ENOENT` for `TrainerSelector.tsx`.

- [ ] **Step 3: 建立元件與 CSS**

```tsx
export function TrainerSelector({ trainers, onSelect }: TrainerSelectorProps) {
  return <section className="trainer-selector-overlay" aria-label="選擇訓練家">
    <h2>請選擇你的角色</h2>
    <div className="trainer-selector-track">{trainers.map((trainer) => <button key={trainer.id} onClick={() => onSelect(trainer)}>{trainer.name}</button>)}</div>
  </section>;
}
```

CSS 使用 `overflow-x: auto`、`scroll-snap-type: x mandatory` 與可見 focus ring；卡片只呈現既有立繪與名稱，沒有世代文字、能力值或增益。

- [ ] **Step 4: 驗證選角 UI 契約與 TypeScript**

Run: `npm run test:trainer-presentation` then `npm run build`

Expected: presentation test and TypeScript/Vite build PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/TrainerSelector.tsx src/components/TrainerSelector.css scripts/verify-trainer-presentation.mjs
git commit -m "feat: add trainer selector"
```

### Task 3: 實作滿版環境式、可跳過的戰鬥開場

**Files:**
- Create: `src/components/BattleIntro.tsx`
- Create: `src/components/BattleIntro.css`
- Modify: `scripts/verify-trainer-presentation.mjs`

**Interfaces:**
- Consumes `playerTrainer`, `opponent`, `kind`, `quick`, `onComplete`。
- Produces `BattleIntro`；它自行清除 timeout，且無論計時或使用者點擊都只呼叫一次 `onComplete`。

- [ ] **Step 1: 寫出會失敗的元件實作契約**

```js
const introSource = await readFile(join(root, 'src/components/BattleIntro.tsx'), 'utf8');
assert.match(introSource, /onClick=\{complete\}/);
assert.match(introSource, /useRef\(false\)/);
assert.match(introSource, /clearTimeout/);
assert.match(introSource, /battle-intro-scene/);
```

- [ ] **Step 2: 執行並確認模組不存在**

Run: `npm run test:trainer-presentation`

Expected: FAIL with `ENOENT` for `BattleIntro.tsx`.

- [ ] **Step 3: 實作單次完成與環境背景**

```tsx
const completed = useRef(false);
const complete = () => {
  if (completed.current) return;
  completed.current = true;
  onComplete();
};
useEffect(() => {
  const timer = window.setTimeout(complete, duration);
  return () => window.clearTimeout(timer);
}, [duration]);
```

CSS 以 scene class 生成天空、遠景、地面、薄霧、暗角與兩側去背立繪。中央不建立半透明矩形卡片；文字使用陰影與窄幅標籤確保可讀性。`@media (prefers-reduced-motion: reduce)` 關閉 transform/animation。

- [ ] **Step 4: 驗證完成語意與建置**

Run: `npm run test:trainer-presentation` then `npm run build`

Expected: PASS. 產物可含既有 chunk-size warning，但不得有 TypeScript error.

- [ ] **Step 5: Commit**

```powershell
git add src/components/BattleIntro.tsx src/components/BattleIntro.css scripts/verify-trainer-presentation.mjs
git commit -m "feat: add battle intro presentation"
```

### Task 4: 整合既有開局、設定與戰鬥流程

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/index.css`
- Modify: `scripts/verify-trainer-presentation.mjs`

**Interfaces:**
- `App.tsx` 保有 `selectedTrainer`、`showTrainerSelector`、`quickBattlePresentation`、`pendingBattleOpponent`。
- `handleOpponentSelect` 只保存 pending opponent 並顯示 `BattleIntro`；其完成回呼才呼叫原本的 `game.startBattlePhase()` 與重置 battle UI 的程式碼。

- [ ] **Step 1: 寫出失敗的整合回歸檢查**

```js
const appSource = await readFile(join(root, 'src/App.tsx'), 'utf8');
assert.match(appSource, /showTrainerSelector/);
assert.match(appSource, /<TrainerSelector/);
assert.match(appSource, /quickBattlePresentation/);
assert.match(appSource, /<BattleIntro/);
assert.match(appSource, /startBattlePhase\(\)/);
assert.doesNotMatch(appSource, /BattleSimulator.*selectedTrainer|selectedTrainer.*BattleSimulator/s);
```

- [ ] **Step 2: 執行並確認整合檢查失敗**

Run: `npm run test:trainer-presentation`

Expected: FAIL because `showTrainerSelector` is not yet present.

- [ ] **Step 3: 最小整合**

在教學關閉回呼中設定 `showTrainerSelector`；角色被選中後顯示既有角色池。新增設定按鈕以切換 `quickBattlePresentation`。將原先 `handleOpponentSelect` 的 battle-start 區塊抽成 `beginBattle(opponent)`，並由 `BattleIntro.onComplete` 唯一呼叫；不變更對手資料、隊伍生成、難度寫入與 battle simulator。

- [ ] **Step 4: 執行完整自動驗證**

Run: `npm run test:trainer-presentation; npm run test:balance-values; npm run test:smoke; npm run build; git diff --check`

Expected: 四個指令皆成功；balance script 仍顯示 `Balance values verified.`。

- [ ] **Step 5: 手動瀏覽器驗收**

Run: `npm run dev`

Check: 跳過教學後可橫向選角；選小悠時只改左方立繪；一般、四天王／冠軍、快速模式各可點一次跳過；棋盤、隊伍、金錢、生命與羈絆在開場前後沒有不同。

- [ ] **Step 6: Commit**

```powershell
git add src/App.tsx src/index.css scripts/verify-trainer-presentation.mjs
git commit -m "feat: integrate trainer battle presentation"
```

### Task 5: 最終回歸與交付資訊

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 在 README 加入本機測試指令**

```markdown
## 本機執行

```powershell
npm install
npm run dev
```

開啟 Vite 顯示的網址（通常是 `http://localhost:5173/`）。自動檢查使用 `npm run test:trainer-presentation`、`npm run test:balance-values`、`npm run test:smoke` 與 `npm run build`。
```

- [ ] **Step 2: 執行最後驗證**

Run: `npm run test:trainer-presentation; npm run test:balance-values; npm run test:smoke; npm run build; git diff --check`

Expected: PASS with no diff whitespace error.

- [ ] **Step 3: Commit**

```powershell
git add README.md docs/superpowers/plans/2026-08-07-trainer-presentation-implementation.md
git commit -m "docs: add trainer presentation test guide"
```
