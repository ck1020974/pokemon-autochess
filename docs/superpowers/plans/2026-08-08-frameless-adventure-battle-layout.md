# Frameless Adventure Battle Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove remaining startup glass frames, expand the trainer panorama, and make battle-stage and battle-intro art reliably visible and aligned.

**Architecture:** Keep game state and battle presentation selection unchanged. Limit changes to React markup state labels and CSS composition: startup choices become frameless icon choices, trainer state exposes two side-depth levels, and battle scenery uses a non-negative local stacking layer with content above it.

**Tech Stack:** React 19, TypeScript, CSS, Vite, Node assertion scripts.

## Global Constraints

- Do not modify game values, character values, synergies, or battle rules.
- Do not change the trainer hover delay (180ms) or repeat interval (420ms).
- Keep coarse-pointer swipe and side-card tap behavior.
- Use the existing local test scripts, production build, and browser flow for verification.

---

### Task 1: Lock the visual contracts in the presentation verifier

**Files:**
- Modify: `scripts/verify-trainer-presentation.mjs`

**Interfaces:**
- Consumes: textual selectors in `TrainerSelector.tsx`, `TrainerSelector.css`, `BattleIntro.css`, and `index.css`.
- Produces: a regression command, `npm run test:trainer-presentation`, that rejects loss of five-card support and battle-stage layering.

- [ ] **Step 1: Write the failing assertions**

Add assertions for the `is-far` state, five-position desktop transforms, framed-loader removal, a positive battle-stage background layer, and intro name labels placed below the art.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test:trainer-presentation`

Expected: assertion failure because the current selector has no `is-far` state and the current battle-stage pseudo-elements use `z-index: -1`.

- [ ] **Step 3: Implement only the CSS/markup required by those assertions**

Update the production styles and selector markup in Tasks 2–4 without changing game or battle logic.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test:trainer-presentation`

Expected: `Trainer presentation values verified.`

### Task 2: Remove startup glass frames

**Files:**
- Modify: `src/index.css:3271-3385`

**Interfaces:**
- Consumes: existing `adventure-panel`, `adventure-loading`, `adventure-choice`, and loading-bar class names rendered by `App.tsx`.
- Produces: no rectangular translucent container around loading or version/difficulty choices; gold focus remains visible.

- [ ] **Step 1: Replace framed loading and choice treatment**

Remove panel/choice background, white border, blur, and card shadow. Keep a slim muted rail behind the gold loading fill. Replace card focus with a gold image glow and a small underline/halo rather than a rectangular border.

- [ ] **Step 2: Verify the selector test remains green**

Run: `npm.cmd run test:trainer-presentation`

Expected: `Trainer presentation values verified.`

### Task 3: Expand and rebalance the trainer panorama

**Files:**
- Modify: `src/components/TrainerSelector.tsx:75-117`
- Modify: `src/components/TrainerSelector.css:24-92`

**Interfaces:**
- Consumes: `getDistance(index, activeIndex, trainers.length)` and `onSelect(trainer)`.
- Produces: `is-active`, `is-near`, `is-far`, and `is-hidden` figure states; a Chinese operation hint in the top eyebrow position; a larger bottom CTA.

- [ ] **Step 1: Render two visible depths on each desktop side**

Treat absolute carousel distances 1 and 2 as visible and assign `is-near` or `is-far`; leave all other figures hidden and non-focusable. Preserve clicking the center to select and clicking a side character to center it.

- [ ] **Step 2: Style five desktop figures and compact mobile figures**

Widen the desktop track, reduce center scale, add the far-side transforms, and make the bottom CTA prominent. At the mobile breakpoint retain a legible three-figure composition while preserving swipe navigation.

- [ ] **Step 3: Move the Chinese operation hint into the eyebrow**

Replace the English eyebrow with `使用方向鍵、滑鼠滾輪或滑動挑選訓練家` and remove the duplicate header hint line.

- [ ] **Step 4: Run the presentation verifier**

Run: `npm.cmd run test:trainer-presentation`

Expected: `Trainer presentation values verified.`

### Task 4: Correct battle scenery layering and intro composition

**Files:**
- Modify: `src/index.css:59-88`
- Modify: `src/components/BattleIntro.css:7-10`

**Interfaces:**
- Consumes: `battle-stage-shell is-battling` and `battle-intro-trainer` class names.
- Produces: full-viewport stage scenery behind game controls and upward-shifted player/opponent art with individual labels below each figure.

- [ ] **Step 1: Place battle scenery in a valid stacking layer**

Set the shell pseudo-elements to `z-index: 0`, set direct shell children to a higher stacking layer, and keep the scenery decorative/non-interactive. Do not alter `battleSceneClass` or scene selection.

- [ ] **Step 2: Recompose the battle intro figures**

Make each trainer a small vertical stack: art above name; place both groups higher from the bottom; keep opponent text aligned under opponent art; keep existing duration and reduced-motion behavior.

- [ ] **Step 3: Run the presentation verifier**

Run: `npm.cmd run test:trainer-presentation`

Expected: `Trainer presentation values verified.`

### Task 5: Verify and commit

**Files:**
- Modify: files from Tasks 1–4 only.

- [ ] **Step 1: Run all existing automated checks**

Run: `npm.cmd run test:trainer-presentation; npm.cmd run test:balance-values; npm.cmd run test:smoke; npm.cmd run lint; npm.cmd run build`

Expected: each command exits 0.

- [ ] **Step 2: Verify in the local browser**

Navigate edition → difficulty → skip tutorial → trainer selection → battle confirmation → opponent. Confirm frameless choices, five desktop trainer figures, full scene background, and intro labels below art.

- [ ] **Step 3: Commit scoped changes**

Run: `git add scripts/verify-trainer-presentation.mjs src/components/TrainerSelector.tsx src/components/TrainerSelector.css src/components/BattleIntro.css src/index.css docs/superpowers/plans/2026-08-08-frameless-adventure-battle-layout.md; git commit -m "fix: refine frameless adventure presentation"`

## Self-Review

- Startup card and loading frames: Task 2.
- Five desktop trainers, Chinese hint, larger CTA, smaller center art: Task 3.
- Full battle scene and higher figures with labels below: Task 4.
- Game logic preservation: global constraints and CSS/markup-only scope.
- Tests, build, browser verification, and local commit: Task 5.
