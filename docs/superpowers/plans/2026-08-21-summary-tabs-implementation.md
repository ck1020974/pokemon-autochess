# 結算畫面四分頁 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將遊戲結算改為緊湊的四按鈕分頁，分別呈現單一隊伍、12 格對戰紀錄與四格成就。

**Architecture:** 僅修改 `App.tsx` 的結算呈現狀態與 JSX，以及 `index.css` 的結算專屬覆寫。對手隊伍直接使用已在開戰時快照並保留至結算的 `game.opponentTeam`，不變更 `GameLoop` 或戰鬥引擎。

**Tech Stack:** React 19、TypeScript、CSS、Vite、Node assert 檢查。

## Global Constraints

- 不變更遊戲規則、數值、戰鬥紀錄來源或 `GameLoop`／`BattleSimulator`。
- 僅使用既有資料：`game.playerTeam`、`game.opponentTeam`、`game.battleHistory`、既有里程碑推導。
- 難度使用既有 `getDifficultyIcon()`，不是可點擊控制項。
- 既有數據標籤與定義必須維持：場數、勝／平／敗、勝率。

---

### Task 1: 鎖定新結算介面契約

**Files:**
- Modify: `scripts/verify-trainer-presentation.mjs`

**Interfaces:**
- Consumes: `src/App.tsx` 與 `src/index.css` 的原始字串。
- Produces: 會先失敗的結算介面結構檢查。

- [ ] **Step 1: 寫入失敗的結算分頁檢查**

在既有結算 assertion 附近加入：

```js
assert.match(appSource, /useState<'team' \| 'battle' \| 'achievement'>\('team'\)/);
assert.match(appSource, />隊伍<\/button>[\s\S]*?>對戰<\/button>[\s\S]*?>成就<\/button>[\s\S]*?>重啟<\/button>/);
assert.match(appSource, /summaryTeamSide/);
assert.match(appSource, /game\.opponentTeam/);
assert.match(appSource, /history\.slice\(-12\)/);
assert.match(appSource, /className="summary-achievement-display"/);
assert.match(appCss, /\.summary-history-grid\s*\{[^}]*grid-template-columns:\s*repeat\(12, 1fr\)/s);
```

- [ ] **Step 2: 執行檢查並確認失敗**

Run: `npm run test:trainer-presentation`

Expected: `AssertionError`，原因是目前 `summaryTab` 僅有 `team | history`，且沒有成就按鈕或 `summaryTeamSide`。

- [ ] **Step 3: 提交測試契約**

```powershell
git add -- scripts/verify-trainer-presentation.mjs
git commit -m "test: specify summary tab layout"
```

### Task 2: 實作結算資訊列與單隊伍切換

**Files:**
- Modify: `src/App.tsx:451-453,2396-2510`
- Modify: `src/index.css:3605-3642`
- Test: `scripts/verify-trainer-presentation.mjs`

**Interfaces:**
- Consumes: `game.playerTeam`, `game.opponentTeam`, `initialPlayerTeamForSynergy`, `initialEnemyTeamForSynergy`, `getDifficultyIcon()`。
- Produces: `summaryTeamSide: 'player' | 'enemy'`，與只渲染選中隊伍的隊伍分頁。

- [ ] **Step 1: 加入最小狀態與重設**

將現有 state 改為：

```tsx
const [summaryTab, setSummaryTab] = useState<'team' | 'battle' | 'achievement'>('team');
const [summaryTeamSide, setSummaryTeamSide] = useState<'player' | 'enemy'>('player');
```

在進入結算的既有 `setSummaryTab('team')` 相鄰處加入：

```tsx
setSummaryTeamSide('player');
```

- [ ] **Step 2: 重排資訊列與四個控制項**

將資訊列 children 排為：身份區、`summary-identity-stats`、`difficulty-icon-img`、`summary-actions`。`summary-actions` 內輸出四個按鈕：

```tsx
<button className={`summary-tab-btn-compact ${summaryTab === 'team' ? 'is-active' : ''}`} onClick={() => setSummaryTab('team')}>隊伍</button>
<button className={`summary-tab-btn-compact ${summaryTab === 'battle' ? 'is-active' : ''}`} onClick={() => setSummaryTab('battle')}>對戰</button>
<button className={`summary-tab-btn-compact ${summaryTab === 'achievement' ? 'is-active' : ''}`} onClick={() => setSummaryTab('achievement')}>成就</button>
<button type="button" className="summary-restart-action" onClick={() => handleRestart()}>重啟</button>
```

- [ ] **Step 3: 以選中方來源取代雙隊伍同時輸出**

在隊伍分頁建立：

```tsx
const isEnemySummary = summaryTeamSide === 'enemy';
const summaryUnits = isEnemySummary ? game.opponentTeam : game.playerTeam;
const summarySynergyUnits = isEnemySummary
  ? (initialEnemyTeamForSynergy.length > 0 ? initialEnemyTeamForSynergy : game.opponentTeam)
  : (initialPlayerTeamForSynergy.length > 0 ? initialPlayerTeamForSynergy : game.playerTeam);
```

並在單一 `.summary-units-grid` 前加入我方／敵方切換按鈕。用 `summaryUnits.map(...)` 與 `summarySynergyUnits` 產出同一套卡片，敵方時傳入既有 `isEnemy`、`side="ENEMY"`；`summaryUnits` 為空時輸出「沒有可顯示的敵方隊伍」空狀態。

- [ ] **Step 4: 寫入資訊列與單隊伍 CSS**

加入結算覆寫，確保資訊順序與間距：

```css
.summary-identity { gap: 10px; }
.summary-identity-copy { flex: 0 0 auto; }
.summary-identity-stats { margin-left: 0; gap: clamp(12px, 1.8vw, 22px); }
.summary-identity .difficulty-icon-img { margin-left: -2px; }
.summary-actions { margin-left: auto; grid-template-columns: repeat(4, 34px); }
.summary-team-toggle { display: flex; gap: 6px; margin-bottom: 10px; }
```

窄螢幕 media rule 保留頭像、身份、數據、難度同列；僅讓 `.summary-actions` 換行且維持四等寬欄位。

- [ ] **Step 5: 驗證測試轉綠**

Run: `npm run test:trainer-presentation`

Expected: `Trainer presentation values verified.`

- [ ] **Step 6: 提交第一個可測試功能**

```powershell
git add -- src/App.tsx src/index.css scripts/verify-trainer-presentation.mjs
git commit -m "feat: restructure summary team tab"
```

### Task 3: 分離對戰紀錄與成就

**Files:**
- Modify: `src/App.tsx:2510-2615`
- Modify: `src/index.css:2815-2870,3625-3642`
- Test: `scripts/verify-trainer-presentation.mjs`

**Interfaces:**
- Consumes: `game.battleHistory`, `allEditionOpponents`，及既有 `getConsolidatedInfo`／里程碑計算。
- Produces: `battle` 分頁的 12 格近期紀錄，以及 `achievement` 分頁的四張既有里程碑卡。

- [ ] **Step 1: 讓對戰只輸出近期 12 格**

在 `summaryTab === 'battle'` 區塊保留 `getConsolidatedInfo`，只輸出：

```tsx
<div className="summary-history-grid">
  {history.slice(-12).map((entry, idx) => (
    <div key={idx} className={`history-item is-${entry.result.toLowerCase()}`}>
      <img src={displayUrl} alt={info.name} />
      <div className="history-result-tag">{entry.result === 'WIN' ? 'W' : entry.result === 'LOSS' ? 'L' : 'D'}</div>
    </div>
  ))}
</div>
```

不要渲染 `.history-hero-grid`。

- [ ] **Step 2: 將四張里程碑移入成就分頁**

在 `summaryTab === 'achievement'` 區塊沿用既有 `playerCard`、`card1`、`card4`、`card3` 計算，並以：

```tsx
<div className="summary-achievement-display">
  <div className="history-hero-grid">{heroes.map(/* 既有 hero-card renderer，加入角色名稱 */)}</div>
</div>
```

每張非空卡應在圖像下方顯示 `info.name`。勝利時 `card1` label 保持既有「寶可夢大師」，非勝利時是「手下敗將」；其餘為「我方主角」、「冒險的起點」、「好討厭的感覺」。

- [ ] **Step 3: 加入視覺狀態 CSS**

```css
.summary-history-grid { grid-template-columns: repeat(12, minmax(0, 1fr)); }
.summary-history-grid .history-item.is-win img { filter: none; opacity: 1; }
.summary-history-grid .history-item.is-loss img,
.summary-history-grid .history-item.is-draw img { filter: grayscale(1); opacity: .48; }
.summary-achievement-display .hero-name { margin-top: 6px; font-size: .72rem; font-weight: 800; }
```

在窄螢幕將歷史格改為六欄，成就保留兩欄。

- [ ] **Step 4: 擴充並執行完整檢查**

在驗證腳本加入 `history.slice(-12)`、`summary-achievement-display`、四個標籤及 `hero-name` assertions。

Run:

```powershell
npm run test:trainer-presentation
npm run lint
npm run build
```

Expected: 三個命令 exit code `0`。

- [ ] **Step 5: 提交第二個可測試功能**

```powershell
git add -- src/App.tsx src/index.css scripts/verify-trainer-presentation.mjs
git commit -m "feat: split summary battle and achievements"
```

### Task 4: 瀏覽器驗收與回歸檢查

**Files:**
- Modify: `scripts/verify-trainer-presentation.mjs`（僅在手動驗收發現可用來源檢查缺口時）

**Interfaces:**
- Consumes: 已建置的 Vite 應用程式。
- Produces: 桌面和手機寬度的結算畫面驗收記錄。

- [ ] **Step 1: 啟動本機預覽**

Run: `npm run preview -- --host 127.0.0.1`

Expected: Vite 顯示本機預覽 URL。

- [ ] **Step 2: 檢查桌面結算畫面**

以 1440px 寬度進入可重現的結算狀態，確認：數據緊接訓練家、難度緊接數據右側、四個方形按鈕靠右；隊伍只出現選中方；對戰僅有 12 格；成就有四張卡與角色名稱。

- [ ] **Step 3: 檢查手機結算畫面**

以 390px 寬度確認上方資訊群組不重疊，四按鈕換列後仍可點擊，隊伍／對戰／成就內容不橫向溢出。

- [ ] **Step 4: 跑完整回歸組合**

Run:

```powershell
npm run test:trainer-presentation
npm run test:balance-values
npm run test:smoke
npm run lint
npm run build
```

Expected: 每個命令 exit code `0`。

- [ ] **Step 5: 提交驗收補強（若有）**

```powershell
git status --short
git add -- scripts/verify-trainer-presentation.mjs src/App.tsx src/index.css
git commit -m "test: verify summary tab presentation"
```
