# Selection and Summary Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compact the desktop selection and ending-summary UI while keeping copy consistent with the encyclopedia.

**Architecture:** Trainer metadata supplies the selected trainer description. `App.tsx` keeps existing interaction state and data flow, while `index.css` owns the revised layout. The presentation verifier locks in requested UI contracts.

**Tech Stack:** React, TypeScript, CSS, Vite, Node assertion scripts.

## Global Constraints

- Do not change game values, Pokémon values, synergies, or battle rules.
- Web desktop layout is the reference layout.
- The ending order is player, difficulty, metrics, square team/history controls, then rectangular restart.

---

### Task 1: Share trainer descriptions with the selector

**Files:** Modify `src/presentation/trainers.ts`, `src/components/TrainerSelector.tsx`, `src/components/TrainerSelector.css`, and test `scripts/verify-trainer-presentation.mjs`.

**Interfaces:** Produces `PlayerTrainer.description: string`, rendered by `TrainerSelector` for the active trainer.

- [ ] **Step 1: Write the failing test**: add `assert.match(trainerSource, /description:\\s*'.+'/);` and `assert.match(selectorSource, /trainer\\.description/);`.
- [ ] **Step 2: Run test to verify it fails**: `npm run test:trainer-presentation`. Expected: fail because trainer records lack descriptions and the selector does not render one.
- [ ] **Step 3: Write minimal implementation**: add `description: string` to `PlayerTrainer`, give all `PLAYER_TRAINERS` one non-empty description, then render `<p className="trainer-selector-description">{trainers[activeIndex]?.description}</p>` below the active name. Style it as a concise readable caption.
- [ ] **Step 4: Run test to verify it passes**: `npm run test:trainer-presentation`. Expected: `Trainer presentation values verified.`
- [ ] **Step 5: Commit**: `git add src/presentation/trainers.ts src/components/TrainerSelector.tsx src/components/TrainerSelector.css scripts/verify-trainer-presentation.mjs; git commit -m "feat: share trainer selection descriptions"`.

### Task 2: Compact and center pool and opponent cards

**Files:** Modify `src/App.tsx:2667-2730,3089-3198`, `src/index.css:3644-3674`, and test `scripts/verify-trainer-presentation.mjs`.

**Interfaces:** Produces a centered `pool-choice-card__heading` group and compact top-aligned `opponent-card--choice` cards.

- [ ] **Step 1: Write the failing test**: add `assert.match(appCss, /\\.pool-choice-card__heading\\s*\\{[^}]*justify-content:\\s*center/s);` and `assert.match(appCss, /\\.opponent-card--choice\\s*\\{[^}]*min-height:\\s*220px/s);`.
- [ ] **Step 2: Run test to verify it fails**: `npm run test:trainer-presentation`. Expected: fail because heading is left-aligned and cards remain 260px tall.
- [ ] **Step 3: Write minimal implementation**: add `.pool-choice-card__heading { justify-content: center; }`, `.pool-choice-card__synergies { margin-left: 0; }`, and `.opponent-card--choice { justify-content: flex-start; min-height: 220px; }`; increase only the pool grid gap and keep three desktop columns plus existing click handlers.
- [ ] **Step 4: Run test to verify it passes**: `npm run test:trainer-presentation`. Expected: `Trainer presentation values verified.`
- [ ] **Step 5: Commit**: `git add src/App.tsx src/index.css scripts/verify-trainer-presentation.mjs; git commit -m "fix: compact pool and opponent card layouts"`.

### Task 3: Rebuild ending-summary information row and history density

**Files:** Modify `src/App.tsx:2397-2623`, `src/index.css:2815-2855,3603-3642`, and test `scripts/verify-trainer-presentation.mjs`.

**Interfaces:** Produces `.summary-actions` containing two square tabs and one rectangular restart control; player history hero cards do not render `.hero-name`.

- [ ] **Step 1: Write the failing test**: add `assert.doesNotMatch(appSource, /<small>\\{game\\.phase === GamePhase\\.VICTORY/);`, `assert.doesNotMatch(appSource, /hero\\.isPlayer && <div className="hero-name">/);`, `assert.match(appSource, /className="summary-actions"/);`, and `assert.match(appCss, /\\.summary-actions\\s*\\{[^}]*grid-template-columns:\\s*repeat\\(2, 34px\\) minmax/s);`.
- [ ] **Step 2: Run test to verify it fails**: `npm run test:trainer-presentation`. Expected: fail because the phase caption/player name remain and action group is absent.
- [ ] **Step 3: Write minimal implementation**: move difficulty before metrics, remove phase caption, put `隊伍`, `對戰`, and `重新開始` into `<div className="summary-actions">`, lower summary content height, and retain history entries as portrait plus compact W/L/D tag without changing their data/count.
- [ ] **Step 4: Run test to verify it passes**: `npm run test:trainer-presentation`. Expected: `Trainer presentation values verified.`
- [ ] **Step 5: Commit**: `git add src/App.tsx src/index.css scripts/verify-trainer-presentation.mjs; git commit -m "fix: compact ending summary information"`.

### Task 4: Verify desktop UI and regression suite

**Files:** Test `scripts/verify-trainer-presentation.mjs`.

- [ ] **Step 1: Run checks**: `npm run test:trainer-presentation; npm run test:balance-values; npm run test:smoke; npm run lint; npm run build`. Expected: all exit 0; Vite chunk-size warning is acceptable on successful build.
- [ ] **Step 2: Verify in local browser**: select Infinite version and difficulty, skip tutorial, confirm trainer copy and centered pool heading. Confirm opponent cards, then verify summary ordering, square tabs, restart rectangle, and player history portrait without player name.
- [ ] **Step 3: Commit completed UI slice**: `git add src/App.tsx src/index.css src/components/TrainerSelector.tsx src/components/TrainerSelector.css src/presentation/trainers.ts scripts/verify-trainer-presentation.mjs; git commit -m "feat: refine selection and ending layouts"`.
