# Temporary Reward Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply temporary reward stats after all battle-start abilities and synergies resolve.

**Architecture:** Keep `battleBuffs` on `BattleSimulator` exactly as it is today, but remove the constructor-side call to `applyBattleRewards`. Invoke that existing method in `init` after both calls to `applyBattleStartSynergies` and before the final `BATTLE_START` event.

**Tech Stack:** TypeScript, Vite SSR module loading, Node assertion scripts.

## Global Constraints

- Only `BATTLE_NONE` and `BATTLE_SYNERGY` rewards move.
- Permanent reward behavior and all Pokémon ability phase order remain unchanged.
- The existing Sneasel/Thief behavior remains unchanged.

---

### Task 1: Prove temporary rewards are deferred

**Files:**
- Create: `scripts/verify-temporary-reward-order.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

Create a Vite-loaded battle with `我方全體角色+3攻擊`. Assert that its unit has base attack immediately after construction, retains base attack while the ability and synergy setup hooks run, and gains three attack only after `init` finishes.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:temporary-reward-order`

Expected: FAIL because the constructor currently applies the reward before `init`.

- [ ] **Step 3: Write minimal implementation**

Remove `this.applyBattleRewards()` from the constructor and call it immediately after the two `applyBattleStartSynergies` calls in `init`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:temporary-reward-order`

Expected: `Temporary reward order verified.`

### Task 2: Verify project integration

**Files:**
- Verify only.

- [ ] **Step 1: Run focused and project checks**

Run: `npm run test:temporary-reward-order; npm run test:balance-values; npm run test:permanent-family-buffs; npm run lint; npm run build`

Expected: every command exits with code 0.
