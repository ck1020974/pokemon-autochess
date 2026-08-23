# 結算畫面排版微調 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將結算頁資訊改為緊湊單列、讓隊伍與成就排版一致，並顯示完整對戰紀錄。

**Architecture:** 保持 `App.tsx` 的既有狀態與資料模型不變，僅調整 summary JSX 的群組位置與 CSS 覆寫規則。以現有的來源斷言腳本鎖定重要 DOM／樣式契約。

**Tech Stack:** React、TypeScript、CSS、Node assert 驗證腳本。

## Global Constraints

- 不新增或替換既有結算數據項目。
- 對戰紀錄必須使用完整 `battleHistory`，每列 12 個圖示。
- 桌面版資訊列單列排列；窄螢幕不可溢出。

---

### Task 1: 建立結算資訊列與完整對戰紀錄的回歸測試

**Files:**
- Modify: `scripts/verify-trainer-presentation.mjs`
- Modify: `src/App.tsx:2398-2603`
- Modify: `src/index.css:3605-3682`

- [ ] **Step 1: 寫入預期失敗的來源／樣式斷言**

新增斷言：難度圖示位於數據群組之前、按鈕使用四欄長方形尺寸，以及對戰歷史以 `history.map` 顯示完整紀錄。

- [ ] **Step 2: 執行斷言並確認失敗**

Run: `npm run test:trainer-presentation`

Expected: FAIL，因既有程式為數據在難度之前、34px 方形按鈕且使用 `history.slice(-12)`。

- [ ] **Step 3: 最小化調整資訊列與歷史 JSX/CSS**

將難度圖示移至 `.summary-identity-stats` 前方；設定 `.summary-actions` 的四欄為較寬的長方形按鈕；將對戰 map 改為完整 `history.map`。

- [ ] **Step 4: 執行斷言並確認通過**

Run: `npm run test:trainer-presentation`

Expected: `Trainer presentation values verified.`

### Task 2: 壓縮隊伍列、統一成就與角色選擇名稱位置

**Files:**
- Modify: `scripts/verify-trainer-presentation.mjs`
- Modify: `src/App.tsx:2420-2513`
- Modify: `src/index.css:2933-3119, 3669-3682`
- Modify: `src/components/TrainerSelector.tsx:108-118`
- Modify: `src/components/TrainerSelector.css:32-81`

- [ ] **Step 1: 寫入預期失敗的來源／樣式斷言**

新增斷言：隊伍切換列可與羈絆列共同布局、敵方可見面板無額外 top margin、成就卡不再使用第一格特殊樣式，以及角色選擇名稱採圖示上方定位。

- [ ] **Step 2: 執行斷言並確認失敗**

Run: `npm run test:trainer-presentation`

Expected: FAIL，因既有切換按鈕獨立一列、敵方有 inline `marginTop: '20px'`，且名稱定位於圖示下方。

- [ ] **Step 3: 最小化調整隊伍、成就與角色選擇標記**

將 `.summary-team-toggle` 放入羈絆列、移除敵方 inline margin、減少隊伍 grid 的頂部留白；以成就專用覆寫統一四個 `.hero-card`；將 `TrainerSelector` 的名稱元素置於 `img` 前，並以 CSS 定位在圖示上方。

- [ ] **Step 4: 執行斷言並確認通過**

Run: `npm run test:trainer-presentation`

Expected: `Trainer presentation values verified.`

### Task 3: 全面驗證與提交

**Files:**
- Modify: `scripts/verify-trainer-presentation.mjs`
- Modify: `src/App.tsx`
- Modify: `src/index.css`
- Modify: `src/components/TrainerSelector.tsx`
- Modify: `src/components/TrainerSelector.css`

- [ ] **Step 1: 執行完整品質檢查**

Run: `npm run test:trainer-presentation; npm run lint; npm run build`

Expected: 每個命令 exit code 0。

- [ ] **Step 2: 檢查變更範圍**

Run: `git diff --check; git status --short`

Expected: 無空白錯誤，且不包含未追蹤的本機工具目錄。

- [ ] **Step 3: 提交已確認的檔案**

Run: `git add -- src/App.tsx src/index.css src/components/TrainerSelector.tsx src/components/TrainerSelector.css scripts/verify-trainer-presentation.mjs docs/superpowers/specs/2026-08-23-summary-layout-polish-design.md docs/superpowers/plans/2026-08-23-summary-layout-polish-implementation.md && git commit -m "feat: polish summary layout"`

Expected: 建立一個只含本次結算與角色選擇排版調整的提交。
