# Permanent Family Buffs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the active trainer name closer to its image and make Bagon and Slakoth family kill bonuses persist for the player's team.

**Architecture:** The trainer selector remains CSS-only: offset only the active card and position its label closer to the visible character. In battle, retain `growUnit` as the single cap-aware stat mutation path, but supply the matching persistent player unit when a Bagon or Slakoth family ability applies its bonus. Data copy changes describe the new persistence and omit obsolete level-three EXP text.

**Tech Stack:** React 19, TypeScript, Vite, Node assertion scripts.

## Global Constraints

- Only the player team's family buffs persist between battles; enemy buffs remain battle-local.
- Keep all stat caps enforced through `growUnit` / `Unit.addGrowth`.
- Do not alter the diagnosed Thief or Mew clone rules.
- Preserve existing user-owned untracked files.

---

### Task 1: Regression checks for copy and selector alignment

**Files:**
- Modify: `scripts/verify-trainer-presentation.mjs`
- Modify: `src/components/TrainerSelector.css`
- Modify: `src/data/AllUnits.ts`

- [ ] **Step 1: Write the failing test**

Add source assertions that require the active trainer transform to include an 8px downward offset, the label top offset to be 14px, all six Bagon/Slakoth descriptions to contain `永久`, and the level-three descriptions to omit `每三場戰鬥後`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:trainer-presentation`

Expected: the assertion for the existing active-transform or description copy fails.

- [ ] **Step 3: Write minimal implementation**

Change only the active trainer selector transforms and family description strings required by the assertions.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:trainer-presentation`

Expected: `Trainer presentation values verified.`

### Task 2: Permanent kill-buff behavior

**Files:**
- Modify: `scripts/verify-balance-values.mjs`
- Modify: `src/engine/BattleSimulator.ts`

- [ ] **Step 1: Write the failing test**

Add assertions requiring the Bagon and Slakoth family `AFTER_DEATH` loops to find the matching `originalPlayerTeam` unit and pass it as the final persistent target to `growUnit`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:balance-values`

Expected: the new assertion fails because each family currently passes `null` as the persistent target.

- [ ] **Step 3: Write minimal implementation**

Inside each live ally loop, look up `this.originalPlayerTeam` by id and pass the result to `growUnit`. This automatically makes player bonuses survive the battle while keeping enemy bonuses local.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:balance-values`

Expected: `Balance values verified.`

### Task 3: Full verification

**Files:**
- Verify only.

- [ ] **Step 1: Run focused checks**

Run: `npm run test:trainer-presentation; npm run test:balance-values; npm run lint`

Expected: all commands exit with code 0.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: TypeScript and Vite complete successfully.
