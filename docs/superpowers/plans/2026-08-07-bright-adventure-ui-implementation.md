# Bright Adventure UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace non-battle dark glass UI with a shared bright Pokémon-adventure presentation, rebuild trainer selection as a frameless hover-zone-driven character stage, and clear existing lint errors without changing game behavior.

**Architecture:** Keep game state and selection callbacks in `App.tsx`; introduce presentation-only class names and CSS layers for all non-battle screens. Keep `TrainerSelector` responsible for focus index, pointer/touch/keyboard input, and timer cleanup. Retain `battlePresentation.ts`, game engine files, and all numeric data unchanged.

**Tech Stack:** React 19, TypeScript, CSS, Vite, Node assertion smoke scripts, Playwright CLI.

## Global Constraints

- Do not change game values, unit values, synergies, opponent data, edition logic, or battle rules. Lint fixes must be equivalent type, variable, and syntax corrections only.
- Non-battle screens use a shared sky, cloud, grass, distant-hill, and road background with warm-white translucent panels, deep-teal text, and restrained gold accents.
- Battle screens continue using existing per-stage panoramic scene classes.
- Desktop hover zones wait 180ms before the first trainer move and repeat every 420ms only while the pointer remains in that side zone.
- Mobile retains swipe and side-character tap; only the focused center character starts the journey.
- Preserve keyboard left/right plus Enter/Space selection and reduced-motion support.

---

### Task 0: Clear the existing lint baseline without altering game behavior

**Files:**
- Modify: `src/App.tsx`, `src/components/EncyclopediaModal.tsx`, `src/components/SynergyIcon.tsx`, `src/data/editions/modern/index.ts`
- Modify: `src/engine/BattleSimulator.ts`, `src/engine/ClassicBalanceSim.ts`, `src/engine/EventBus.ts`, `src/engine/GameLoop.ts`, `src/engine/HeadlessBattleSimulator.ts`, `src/engine/InfiniteBalanceSim.ts`, `src/engine/ModernBalanceSim.ts`, `src/engine/MusicManager.ts`, `src/engine/SimBatch.ts`, `src/engine/StageBalanceSim.ts`, `src/engine/UnitBalanceSim.ts`
- Modify: `src/models/Shop.ts`, `src/models/Synergies.ts`, `src/models/Unit.ts`
- Test: `npm run lint`, `npm run test:smoke`, `npm run test:balance-values`

**Interfaces:**
- Consumes: existing runtime APIs, game data, and simulation behavior.
- Produces: equivalent TypeScript with no ESLint errors or warnings; no new exports, rule changes, or gameplay branches.

- [ ] **Step 1: Capture the failing lint baseline**

Run: `npm.cmd run lint`  
Expected: failure reporting the pre-existing 213 errors and 5 warnings, predominantly `@typescript-eslint/no-explicit-any`, unused variables, and lexical declarations in switch cases.

- [ ] **Step 2: Replace `any` with existing domain types or `unknown` plus narrow guards**

Use `unknown` at untyped event/data boundaries and narrow before property access. For an intentionally generic object map, use an explicit structural type such as `Record<string, unknown>` rather than `any`.

```ts
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

if (isRecord(payload) && typeof payload.name === 'string') {
  // existing behavior using payload.name
}
```

- [ ] **Step 3: Apply behavior-preserving syntax fixes**

Replace unmodified `let` bindings with `const`, remove genuinely unused catch parameters, wrap switch case lexical declarations in braces, and remove obsolete `@ts-nocheck` comments only after the file type-checks. Do not change numeric literals, data arrays, condition predicates, event names, or return values.

- [ ] **Step 4: Run the smallest relevant tests after each file group**

Run: `npm.cmd run test:smoke` after data/models/engine groups and `npm.cmd run test:balance-values` after simulation groups.  
Expected: existing success messages with unchanged unit and balance verification.

- [ ] **Step 5: Verify the clean lint baseline**

Run: `npm.cmd run lint`  
Expected: exit code 0 with no ESLint errors or warnings.

### Task 1: Lock the new selector behavior in the presentation verifier

**Files:**
- Modify: `scripts/verify-trainer-presentation.mjs`
- Test: `scripts/verify-trainer-presentation.mjs`

**Interfaces:**
- Consumes: `src/components/TrainerSelector.tsx` and `src/components/TrainerSelector.css` source text.
- Produces: source-level guardrails for the hover-zone contract without inspecting game engine data.

- [ ] **Step 1: Add failing assertions for the new contract**

```js
assert.match(selectorSource, /trainer-selector-hover-zone/);
assert.match(selectorSource, /180/);
assert.match(selectorSource, /420/);
assert.match(selectorSource, /clearTimeout/);
assert.match(selectorSource, /clearInterval/);
assert.match(selectorSource, /點擊角色開始旅途/);
assert.doesNotMatch(selectorSource, /trainer-selector-arrow/);
assert.doesNotMatch(selectorSource, /trainer-selector-name/);
assert.doesNotMatch(selectorSource, /trainer-selector-pick/);
assert.doesNotMatch(selectorCss, /trainer-selector-arrow/);
assert.doesNotMatch(selectorCss, /trainer-selector-card\s*\{[^}]*border:/);
```

- [ ] **Step 2: Run the verifier to prove the assertions fail before implementation**

Run: `npm run test:trainer-presentation`  
Expected: assertion failure because the existing selector still contains arrows, card text, and no hover zones.

- [ ] **Step 3: Keep existing battle isolation assertions unchanged**

```js
assert.doesNotMatch(simulatorSource, /selectedTrainer/);
assert.doesNotMatch(gameLoopSource, /selectedTrainer/);
```

- [ ] **Step 4: Re-run after the selector task**

Run: `npm run test:trainer-presentation`  
Expected: `Trainer presentation values verified.`

### Task 2: Implement the frameless trainer stage and hover-zone controller

**Files:**
- Modify: `src/components/TrainerSelector.tsx`
- Modify: `src/components/TrainerSelector.css`
- Test: `scripts/verify-trainer-presentation.mjs`

**Interfaces:**
- Consumes: `trainers: readonly PlayerTrainer[]`, `onSelect: (trainer: PlayerTrainer) => void`.
- Produces: the existing `TrainerSelector` component with unchanged props and a focused `activeIndex`.

- [ ] **Step 1: Add timer refs and cleanup before creating hover zones**

```ts
const hoverDelayRef = useRef<number | null>(null);
const hoverRepeatRef = useRef<number | null>(null);

const stopHoverMove = () => {
  if (hoverDelayRef.current !== null) window.clearTimeout(hoverDelayRef.current);
  if (hoverRepeatRef.current !== null) window.clearInterval(hoverRepeatRef.current);
  hoverDelayRef.current = null;
  hoverRepeatRef.current = null;
};

const startHoverMove = (direction: -1 | 1) => {
  stopHoverMove();
  hoverDelayRef.current = window.setTimeout(() => {
    move(direction);
    hoverRepeatRef.current = window.setInterval(() => move(direction), 420);
  }, 180);
};

useEffect(() => stopHoverMove, []);
```

- [ ] **Step 2: Replace visual arrows with semantic side hover zones**

```tsx
<div
  className="trainer-selector-hover-zone trainer-selector-hover-zone--left"
  aria-hidden="true"
  onPointerEnter={() => startHoverMove(-1)}
  onPointerLeave={stopHoverMove}
/>
<div
  className="trainer-selector-hover-zone trainer-selector-hover-zone--right"
  aria-hidden="true"
  onPointerEnter={() => startHoverMove(1)}
  onPointerLeave={stopHoverMove}
/>
```

- [ ] **Step 3: Remove trainer-card copy and keep center-only selection**

```tsx
<button
  className={`trainer-selector-figure ${state} ${direction}`}
  key={trainer.id}
  type="button"
  role="listitem"
  tabIndex={visible ? 0 : -1}
  onClick={() => distance === 0 ? onSelect(trainer) : setActiveIndex(index)}
>
  <img src={trainer.imageUrl} alt={trainer.name} />
</button>
```

Render the exact footer `<p className="trainer-selector-footnote">點擊角色開始旅途</p>` outside the track.

- [ ] **Step 4: Replace card CSS with figure-stage CSS**

```css
.trainer-selector-figure {
  position: absolute;
  top: 0;
  left: 50%;
  width: clamp(170px, 23vw, 270px);
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  transition: transform .34s cubic-bezier(.2,.8,.2,1), opacity .25s ease, filter .25s ease;
}
.trainer-selector-figure.is-active { transform: translateX(-50%) scale(1); }
.trainer-selector-figure.is-near.is-left { transform: translateX(calc(-50% - clamp(180px, 26vw, 290px))) scale(.62); }
.trainer-selector-figure.is-near.is-right { transform: translateX(calc(-50% + clamp(180px, 26vw, 290px))) scale(.62); }
.trainer-selector-figure.is-active img { filter: drop-shadow(0 0 23px rgba(244, 195, 77, .72)) drop-shadow(0 14px 9px rgba(25,65,70,.22)); }
```

Add absolute left/right hover-zone selectors with a transparent background, pointer events on fine pointers only, and `pointer-events: none` in the mobile media query.

- [ ] **Step 5: Preserve touch, keyboard, and reduced motion**

Keep the existing swipe threshold, `onKeyDown`, and wheel handlers. Add `onPointerDown={stopHoverMove}` on the carousel so a touch action cancels a pending hover timer. Keep the existing `@media(prefers-reduced-motion:reduce)` rule and extend it to hover-zone-related transitions.

- [ ] **Step 6: Run the focused presentation test**

Run: `npm run test:trainer-presentation`  
Expected: `Trainer presentation values verified.`

### Task 3: Add the shared bright adventure shell for all non-battle screens

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/index.css`
- Test: `npm run lint`

**Interfaces:**
- Consumes: existing `phase1Loaded`, `selectedVersionId`, `hasLoaded`, `difficulty`, `focusedVersionId`, and `focusedDifficulty` state.
- Produces: the same selection event handlers with `startup-overlay adventure-startup-overlay`, `adventure-panel`, and `adventure-choice` class names.

- [ ] **Step 1: Replace only startup markup class names and inline dark visual styles**

For each of the three existing startup overlays, retain its state guard and children but replace the inline `background: 'radial-gradient(... #020617)'` presentation with:

```tsx
<div className="startup-overlay adventure-startup-overlay">
  <div className="adventure-scene" aria-hidden="true">
    <span className="adventure-cloud adventure-cloud--one" />
    <span className="adventure-cloud adventure-cloud--two" />
    <span className="adventure-hill adventure-hill--one" />
    <span className="adventure-hill adventure-hill--two" />
    <span className="adventure-road" />
  </div>
  {/* existing title, loading state, and choices */}
</div>
```

Keep the version and difficulty array values, click handlers, focus states, load stages, and the two-click confirmation behavior unchanged.

- [ ] **Step 2: Style the shared scene and warm-white surfaces in `index.css`**

```css
.adventure-startup-overlay {
  color: #153f45;
  background: linear-gradient(180deg, #bcecff 0 48%, #c8e7b5 48% 67%, #71ae70 67%);
}
.adventure-panel,
.adventure-choice {
  background: rgba(255,255,248,.78);
  border: 1px solid rgba(255,255,255,.82);
  box-shadow: 0 14px 34px rgba(23,85,79,.16);
  color: #173f45;
}
.adventure-choice.is-focused {
  border-color: #d8a93a;
  box-shadow: 0 0 0 4px rgba(244,206,104,.34), 0 14px 34px rgba(23,85,79,.16);
}
```

Scope overrides to `.adventure-startup-overlay` so battle UI retains existing dark/scene-specific CSS.

- [ ] **Step 3: Convert loading and button colors to the adventure palette**

Use deep-teal text (`#153f45`) for headings and explanatory text, gold (`#d8a93a` / `#f0c95d`) for the progress fill and primary focus, and warm-white translucency for surfaces. Do not change any loading state, text content, image source, or event handler.

- [ ] **Step 4: Run type and lint validation**

Run: `npm run lint`  
Expected: exit code 0.

### Task 4: Restyle the tutorial entry point without changing tutorial control flow

**Files:**
- Modify: `src/components/TutorialModal.tsx`
- Modify: `src/components/TutorialModal.css`
- Test: `npm run lint`

**Interfaces:**
- Consumes: `onClose: () => void`, `onStartTutorial: () => void`.
- Produces: identical callbacks with no modification to `tutorialStep`, tutorial overlays, or game events in `App.tsx`.

- [ ] **Step 1: Remove dark inline visual styles from the tutorial entry markup**

```tsx
<div className="tutorial-overlay tutorial-entry-overlay" style={{ zIndex: 100000 }}>
  <div className="tutorial-modal tutorial-entry-modal" onClick={(event) => event.stopPropagation()}>
    <h2 className="tutorial-title tutorial-entry-title">...</h2>
    <div className="tutorial-entry-copy">...</div>
    <div className="tutorial-entry-actions">
      <button className="btn-premium tutorial-entry-primary" onClick={onStartTutorial}>...</button>
      <button className="btn-premium tutorial-entry-secondary" onClick={onClose}>...</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add bright tutorial styles scoped to the entry classes**

```css
.tutorial-entry-overlay { background: rgba(30, 91, 84, .25); backdrop-filter: blur(6px); }
.tutorial-entry-modal { width: min(500px, calc(100vw - 40px)); height: auto; padding: 40px; text-align: center; justify-content: center; background: rgba(255,255,248,.88); border: 1px solid rgba(255,255,255,.9); box-shadow: 0 22px 55px rgba(21,70,70,.24); }
.tutorial-entry-title { color: #153f45; background: none; -webkit-text-fill-color: currentColor; }
.tutorial-entry-copy { color: #426a6c; font-size: 1.2rem; line-height: 1.8; margin-bottom: 35px; }
.tutorial-entry-primary { background: #d8a93a; border-color: #edcd73; color: #173f45; }
.tutorial-entry-secondary { background: transparent; border-color: rgba(21,63,69,.2); color: #426a6c; }
```

- [ ] **Step 3: Confirm callbacks remain direct**

Run: `rg -n "onClick=\{onStartTutorial\}|onClick=\{onClose\}" src/components/TutorialModal.tsx`  
Expected: one direct click binding for each callback.

- [ ] **Step 4: Run lint**

Run: `npm run lint`  
Expected: exit code 0.

### Task 5: Run complete automated and visual verification, then commit

**Files:**
- Modify only if verification exposes a presentation defect: the files listed in Tasks 1–4.
- Test: `scripts/smoke-test.mjs`, `scripts/verify-balance-values.mjs`, `scripts/verify-trainer-presentation.mjs`, Vite production build, and local browser flow.

**Interfaces:**
- Consumes: completed UI classes and unchanged game engine/data modules.
- Produces: a verified local commit with no remote push.

- [ ] **Step 1: Run all existing automated checks**

Run:

```powershell
npm run lint
npm run test:smoke
npm run test:balance-values
npm run test:trainer-presentation
npm run build
```

Expected: every command exits with status 0.

- [ ] **Step 2: Serve and inspect the production build locally**

Run: `npm run preview -- --host 127.0.0.1`  
Inspect desktop and a mobile viewport through the browser:

1. Load the main screen and confirm bright sky/grass/road, teal copy, and warm-white surfaces.
2. Select each version and each difficulty; confirm values and double-click confirmation still work.
3. Open/skip the tutorial entry modal and confirm each existing path works.
4. In trainer selection, verify arrows and per-character copy are absent; hover left/right zones use the 180ms first delay and 420ms repeat; moving pointer to center stops changes; center click begins; side click focuses; keyboard and swipe operate.
5. Start a battle and verify an existing `battle-scene--*` panoramic background is still used.

- [ ] **Step 3: Check the staged diff excludes game rules and data**

Run:

```powershell
git diff --check
git diff -- src/engine src/models src/data
git status --short
```

Expected: `git diff -- src/engine src/models src/data` is empty; the only untracked pre-existing entries remain `.playwright-cli/` and `.superpowers/`.

- [ ] **Step 4: Commit verified UI changes locally without pushing**

```powershell
git add src/App.tsx src/index.css src/components/TrainerSelector.tsx src/components/TrainerSelector.css src/components/TutorialModal.tsx src/components/TutorialModal.css scripts/verify-trainer-presentation.mjs docs/superpowers/plans/2026-08-07-bright-adventure-ui-implementation.md
git commit -m "feat: refresh bright adventure UI"
```

Expected: commit succeeds and no `git push` command is run.
