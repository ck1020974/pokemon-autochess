# 電光與初始夥伴平衡調整 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將電光羈絆調整為 0–3、2–6、6–12 攻擊，並讓無介面模擬器的初始夥伴五層效果與正式遊戲的 +2/+2 規則一致。

**Architecture:** 電光數值各自存在於正式戰鬥與無介面戰鬥的開戰羈絆邏輯，兩處必須同步更新。正式遊戲的初始夥伴已在 `GameLoop` 使用 +2/+2；只修正無介面模擬器，並用一個零相依的 Node 檢查腳本防止三處數值再次漂移。

**Tech Stack:** TypeScript、Node.js、Vite、npm。

## Global Constraints

- 電光門檻維持 `[2/3/5]`，效果固定為 `0–3 / 2–6 / 6–12`。
- 初始夥伴三層效果維持 `+1/+1`，五層效果固定為 `+2/+2`。
- 不修改炎帝、水君、其他羈絆、角色、關卡或難度標籤。
- 保留目前工作目錄中與本任務無關的未提交變更。

---

### Task 1: 建立平衡數值防回歸檢查

**Files:**
- Create: `scripts/verify-balance-values.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `src/models/Synergies.ts`、`src/engine/BattleSimulator.ts`、`src/engine/HeadlessBattleSimulator.ts`、`src/engine/GameLoop.ts` 的原始碼。
- Produces: `npm run test:balance-values`，在數值或說明不一致時以非零結束碼失敗。

- [ ] **Step 1: 寫入會失敗的檢查**

建立 `scripts/verify-balance-values.mjs`，其內容為：

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const compact = (source) => source.replace(/\s+/g, '');

const [synergies, battle, headless, gameLoop] = await Promise.all([
  read('src/models/Synergies.ts'),
  read('src/engine/BattleSimulator.ts'),
  read('src/engine/HeadlessBattleSimulator.ts'),
  read('src/engine/GameLoop.ts'),
]);

assert.match(synergies, /\[2\/3\/5\].*0~3.*2~6.*6~12/);
for (const [name, source] of Object.entries({ battle, headless })) {
  const value = compact(source);
  assert.ok(value.includes('letminBoost=0;letmaxBoost=3;'), `${name} 的電光 2 層數值錯誤`);
  assert.ok(value.includes('if(chargeCount>=5){minBoost=6;maxBoost=12;}'), `${name} 的電光 5 層數值錯誤`);
  assert.ok(value.includes('elseif(chargeCount>=3){minBoost=2;maxBoost=6;}'), `${name} 的電光 3 層數值錯誤`);
}
assert.ok(compact(headless).includes('constbuff=count>=5?2:1;'), '無介面模擬器的初始夥伴五層效果不是 +2/+2');
assert.ok(compact(gameLoop).includes('constbuff=starterCount>=5?2:1;'), '正式遊戲的初始夥伴五層效果不是 +2/+2');
console.log('Balance values verified.');
```

在 `package.json` 的 `scripts` 新增：

```json
"test:balance-values": "node scripts/verify-balance-values.mjs"
```

- [ ] **Step 2: 執行檢查，確認目前失敗**

Run: `npm run test:balance-values`

Expected: 非零結束碼，因電光仍是 `0–4 / 2–6 / 8–15`，且無介面模擬器仍為 Starter `+3/+3`。

### Task 2: 同步套用已確認的數值

**Files:**
- Modify: `src/models/Synergies.ts:36`
- Modify: `src/engine/BattleSimulator.ts:1027-1034`
- Modify: `src/engine/HeadlessBattleSimulator.ts:688-690`
- Modify: `src/engine/HeadlessBattleSimulator.ts:740-746`

**Interfaces:**
- Consumes: Task 1 的 `npm run test:balance-values`。
- Produces: 正式戰鬥、無介面戰鬥與 UI 說明使用同一組電光數值；兩種初始夥伴執行路徑都使用 +2/+2。

- [ ] **Step 1: 更新電光的說明與正式戰鬥數值**

在 `src/models/Synergies.ts` 將電光描述改為：

```ts
description: '[2/3/5] 戰鬥開始時，隨機增加 0~3/2~6/6~12 攻擊'
```

在 `src/engine/BattleSimulator.ts` 將電光的預設與五層數值改為：

```ts
let minBoost = 0;
let maxBoost = 3;
if (chargeCount >= 5) { minBoost = 6; maxBoost = 12; }
else if (chargeCount >= 3) { minBoost = 2; maxBoost = 6; }
```

- [ ] **Step 2: 更新無介面模擬器數值**

在 `src/engine/HeadlessBattleSimulator.ts` 將初始夥伴與電光改為：

```ts
const buff = count >= 5 ? 2 : 1;
```

```ts
let minBoost = 0;
let maxBoost = 3;
if (chargeCount >= 5) { minBoost = 6; maxBoost = 12; }
else if (chargeCount >= 3) { minBoost = 2; maxBoost = 6; }
```

- [ ] **Step 3: 執行數值檢查，確認通過**

Run: `npm run test:balance-values`

Expected: 結束碼 0 並輸出 `Balance values verified.`。

### Task 3: 驗證與提交

**Files:**
- Modify: `package.json`
- Create: `scripts/verify-balance-values.mjs`
- Modify: `src/models/Synergies.ts`
- Modify: `src/engine/BattleSimulator.ts`
- Modify: `src/engine/HeadlessBattleSimulator.ts`

**Interfaces:**
- Consumes: 完成後的 Task 1、Task 2。
- Produces: 可建置、可重跑的平衡數值檢查與單一目的提交。

- [ ] **Step 1: 執行完整驗證**

Run:

```powershell
npm run test:balance-values
npm run test:smoke
npm run build
git diff --check
```

Expected: 四個命令皆以結束碼 0 完成；數值檢查輸出 `Balance values verified.`，冒煙測試輸出 `Smoke test passed`，建置輸出 Vite 的成功產物摘要。

- [ ] **Step 2: 提交本次變更**

Run:

```powershell
git add package.json scripts/verify-balance-values.mjs src/models/Synergies.ts src/engine/BattleSimulator.ts src/engine/HeadlessBattleSimulator.ts
git commit -m "balance: tune charge and align starter simulation"
```

Expected: 僅提交這五個路徑，不納入既有未提交的品質更新檔案。
