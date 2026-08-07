# 全景戰鬥舞台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以無滑桿輪播、辨識度更高的場景與 A 全景戰鬥舞台取代目前斷裂的演出。

**Architecture:** `battlePresentation.ts` 由單一 scene descriptor 提供開場與 battle phase 共用的 CSS class。`TrainerSelector` 內聚箭頭、鍵盤與指標輪播；`App.tsx` 將 scene class 掛到戰鬥頁根容器，而非只有棋盤容器。

**Tech Stack:** React 19、TypeScript 5、Vite 7、CSS、Node assertion scripts。

## Global Constraints

- 選角不顯示水平捲動條；箭頭、點選與鍵盤操作必須可用。
- 開場立繪高度為可視畫面約 24–30%，進入戰鬥後卸載。
- 一般、四天王、冠軍場景各有結構地標差異；同一對手場景固定。
- 戰鬥 phase 的 HUD、隊伍、羈絆、控制區在同一張全景環境底圖上。
- 商店與其他 phase 不套用全景背景；不修改任何引擎／平衡檔案。

---

### Task 1: 建立可驗證的場景描述與輪播互動

**Files:**
- Modify: `src/presentation/battlePresentation.ts`
- Modify: `src/components/TrainerSelector.tsx`
- Modify: `src/components/TrainerSelector.css`
- Modify: `scripts/verify-trainer-presentation.mjs`

**Interfaces:**
- `getBattleSceneClass(kind, opponentId)` 維持既有呼叫方式，並回傳有地標差異的 scene class。
- `TrainerSelector` 管理 `activeIndex`，提供 arrow button、`onKeyDown` 與選中卡。

- [ ] **Step 1: 寫失敗的回歸檢查**

```js
assert.match(selectorSource, /trainer-selector-arrow/);
assert.match(selectorSource, /onKeyDown/);
assert.match(selectorSource, /setActiveIndex/);
assert.doesNotMatch(selectorCss, /overflow-x:\s*auto/);
assert.match(presentationSource, /landmark/);
```

- [ ] **Step 2: 執行檢查並確認失敗**

Run: `npm run test:trainer-presentation`

Expected: FAIL because the arrow class and landmark descriptor do not exist.

- [ ] **Step 3: 實作最小行為**

```tsx
const move = (direction: -1 | 1) => setActiveIndex((index) => (index + direction + trainers.length) % trainers.length);
<button className="trainer-selector-arrow" onClick={() => move(-1)} aria-label="上一位訓練家">‹</button>
```

將 track 改為無 scrollbar 的五張可視卡片舞台；依 `activeIndex` 添加 `is-active`、`is-near`、`is-hidden` class。以 CSS scene landmark layers 區分道路、溫室、港灣、洞窟、圖書館、瀑布、火山與聯盟殿堂。

- [ ] **Step 4: 執行測試與建置**

Run: `npm run test:trainer-presentation; npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/presentation/battlePresentation.ts src/components/TrainerSelector.tsx src/components/TrainerSelector.css scripts/verify-trainer-presentation.mjs
git commit -m "feat: refine trainer carousel and scene landmarks"
```

### Task 2: 讓開場與戰鬥共享完整舞台

**Files:**
- Modify: `src/components/BattleIntro.tsx`
- Modify: `src/components/BattleIntro.css`
- Modify: `src/App.tsx`
- Modify: `src/index.css`
- Modify: `scripts/verify-trainer-presentation.mjs`

**Interfaces:**
- `BattleIntro` 保留 `onComplete` 單次完成語意，將人物尺寸限制在 30vh。
- `App.tsx` 將 `battleSceneClass` 套用到戰鬥頁根容器；`index.css` 以該 class 建立全頁 backdrop，不新增大型面板。

- [ ] **Step 1: 寫失敗的全景驗證**

```js
assert.match(appSource, /battle-stage-shell/);
assert.match(appSource, /battleSceneClass/);
assert.match(appCss, /\.battle-stage-shell\.is-battling/);
assert.match(introCss, /max-height:\s*30vh/);
assert.match(introCss, /battle-scene--champion-hall/);
```

- [ ] **Step 2: 執行並確認失敗**

Run: `npm run test:trainer-presentation`

Expected: FAIL because the battle stage shell does not exist.

- [ ] **Step 3: 實作最小整合**

```tsx
<div className={`battle-stage-shell ${game.phase === GamePhase.BATTLE ? `is-battling ${battleSceneClass}` : ''}`}>
  {/* header, board, and battle controls */}
</div>
```

讓 backdrop 覆蓋整個 shell，讓 board background 成為透明的地面層；HUD、羈絆、隊伍與控制列使用文字陰影與細描邊，而不是新增寬大的矩形遮罩。

- [ ] **Step 4: 執行完整驗證**

Run: `npm run test:trainer-presentation; npm run test:balance-values; npm run test:smoke; npm run build; git diff --check`

Expected: 所有命令 exit 0；build 僅允許既有 chunk-size warning。

- [ ] **Step 5: 瀏覽器驗收與 Commit**

Check: 跳過教學後可用箭頭與鍵盤選角；一般戰鬥開場與戰鬥畫面顯示同一場景；點擊開場立即進戰鬥；快速模式可用；戰鬥引擎沒有 `selectedTrainer`。

```powershell
git add src/components/BattleIntro.tsx src/components/BattleIntro.css src/App.tsx src/index.css scripts/verify-trainer-presentation.mjs docs/superpowers/plans/2026-08-07-full-stage-battle-implementation.md
git commit -m "feat: add full stage battle presentation"
```
