# Game Ending Hall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give championship and life-depleted endings distinct atmosphere, music behavior, and a readable adventure summary without changing game rules or values.

**Architecture:** Result flow remains in `App.tsx`, with semantic ending classes instead of inline dark-glass presentation. Entering `VICTORY` plays the existing `championwin` track once and entering `GAME_OVER` stops audio; stylesheet-owned scenes provide a navy-and-gold Hall of Fame or near-black defeat screen. Existing team/history content is preserved inside a clearer identity, metric, and tab hierarchy.

**Tech Stack:** React 19, TypeScript, Vite, CSS, Node assertion scripts.

## Global Constraints

- Do not change game values, character values, synergies, opponent data, or battle rules.
- Championship is `GamePhase.VICTORY`, including Infinite Mode after all champions; life-depleted defeat is `GamePhase.GAME_OVER`.
- Use existing `public/music/championwin.OGG` for championship and silence for defeat.
- Preserve existing final team and adventure-history data and controls.
- Do not stage `.playwright-cli/` or `.superpowers/`.

---

### Task 1: Add ending regression coverage

**Files:**
- Modify: `scripts/verify-trainer-presentation.mjs`
- Test: `scripts/verify-trainer-presentation.mjs`

**Interfaces:**
- Consumes: source strings from `src/App.tsx` and `src/index.css`.
- Produces: assertions that lock terminal music, copy, semantic classes, and the new palette.

- [ ] **Step 1: Write the failing test**

Append these assertions before the success log:

```js
assert.match(appSource, /game\.phase === GamePhase\.VICTORY\)\s*\{\s*music\.playOneShot\('championwin'\)/s);
assert.match(appSource, /game\.phase === GamePhase\.GAME_OVER\)\s*\{\s*music\.stop\(\)/s);
assert.match(appSource, /聯盟冠軍/);
assert.match(appSource, /冒險暫止/);
assert.match(appSource, /summary-identity/);
assert.match(appSource, /summary-metrics/);
assert.match(appCss, /\.game-result-overlay\.result-screen--champion\s*\{[^}]*#112c55/s);
assert.match(appCss, /\.game-result-overlay\.result-screen--game-over\s*\{[^}]*#020407/s);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:trainer-presentation`

Expected: FAIL because terminal victory currently stops audio and the existing result scene has no new classes or palette.

- [ ] **Step 3: Write minimal implementation**

Complete Tasks 2 and 3 without changing `GameLoop`, unit data, or battle simulation.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:trainer-presentation`

Expected: PASS and prints `Trainer presentation values verified.`

- [ ] **Step 5: Commit**

```powershell
git add src/App.tsx src/index.css scripts/verify-trainer-presentation.mjs docs/superpowers/plans/2026-08-20-game-ending-hall.md
git commit -m "feat: redesign game ending scenes"
```

### Task 2: Make terminal music intentional

**Files:**
- Modify: `src/App.tsx:852-888`
- Modify: `src/App.tsx:1299-1307`
- Modify: `src/App.tsx:1739-1744`

**Interfaces:**
- Consumes: `game.phase: GamePhase` and `music.playOneShot(name: string): Promise<void>`.
- Produces: champion fanfare on victory entry and silence on game-over entry.

- [ ] **Step 1: Write the failing test**

Use Task 1's terminal audio assertions.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:trainer-presentation`

Expected: FAIL at the `championwin` assertion.

- [ ] **Step 3: Write minimal implementation**

Replace only the terminal branch in the centralized phase-music effect with:

```ts
} else if (game.phase === GamePhase.VICTORY) {
    music.playOneShot('championwin');
    setBattleElapsedSeconds(0);
} else if (game.phase === GamePhase.GAME_OVER) {
    music.stop();
    setBattleElapsedSeconds(0);
}
```

Remove only later terminal `music.stop()` guards that would interrupt the victory fanfare. Keep non-terminal battle-result audio unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:trainer-presentation`

Expected: PASS for terminal-audio assertions.

- [ ] **Step 5: Commit**

Commit with Task 1 after Task 3 and Task 4 verification.

### Task 3: Recompose terminal scenes and summary hierarchy

**Files:**
- Modify: `src/App.tsx:2362-2510`
- Modify: `src/index.css:2637-2640`
- Modify: `src/index.css:2696-2800`

**Interfaces:**
- Consumes: `summaryStage`, `summaryTab`, selected trainer, difficulty icon, existing statistics, and existing team/history content.
- Produces: `summary-identity`, `summary-metrics`, `summary-tabs`, `result-screen--champion`, and `result-screen--game-over` presentation.

- [ ] **Step 1: Write the failing test**

Use Task 1's visual and copy assertions.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:trainer-presentation`

Expected: FAIL because current copy is `CHAMPION!`/`GAME OVER` and the summary is a compressed header row.

- [ ] **Step 3: Write minimal implementation**

Keep the two-stage flow and both tab contents, replacing only terminal presentation markup with the identity, metrics, and tab groups:

```tsx
<div className="summary-identity">{/* trainer image, role/name, difficulty */}</div>
<div className="summary-metrics">{/* total battles, W/D/L, win rate */}</div>
<div className="summary-tabs">{/* existing team/history buttons */}</div>
```

Use `聯盟冠軍` / `你的夥伴與你，一同留名殿堂` on victory and `冒險暫止` / `生命值歸零，但旅途還能重新啟程。` on defeat. Style championship as a navy hall with gold spotlights, column silhouettes, and ivory summary panel; style defeat as a near-black vignette with dim battlefield lines and graphite panel. Do not retain bright pink or green result gradients.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:trainer-presentation`

Expected: PASS for every old and new presentation assertion.

- [ ] **Step 5: Commit**

Commit with Task 1 after Task 4 verification.

### Task 4: Verify production behavior and commit

**Files:**
- Verify only: `src/App.tsx`, `src/index.css`, `scripts/verify-trainer-presentation.mjs`

**Interfaces:**
- Consumes: completed browser UI and existing automated checks.
- Produces: fresh evidence before commit and reporting completion.

- [ ] **Step 1: Run targeted and existing checks**

Run:

```powershell
npm run test:trainer-presentation
npm run test:balance-values
npm run test:smoke
npm run lint
npm run build
```

Expected: every command exits 0.

- [ ] **Step 2: Verify the browser flow**

Start or reuse `npm run dev -- --host 127.0.0.1 --port 4174`; check normal navigation, both terminal layouts at desktop/mobile widths, champion fanfare, defeat silence, and browser console errors.

- [ ] **Step 3: Review staged scope**

Run:

```powershell
git diff --check
git status --short
git diff --cached --stat
```

Expected: only `src/App.tsx`, `src/index.css`, `scripts/verify-trainer-presentation.mjs`, and this plan are staged.

- [ ] **Step 4: Commit**

Run the Task 1 commit command after checks exit 0. Do not push GitHub unless the user explicitly asks.

## Self-Review

- Spec coverage: Task 2 gives terminal states distinct audio; Task 3 gives them distinct backgrounds and a better hierarchy; Task 4 proves no game rules changed and validates browser behavior.
- Placeholder scan: no TBD/TODO or deferred work remains.
- Type consistency: all named React state and `MusicManager` APIs already exist; no engine interface changes are required.
