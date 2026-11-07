# Seven Game Fixes Implementation Plan

> **For agentic workers:** Use subagent-driven-development for the isolated battle task and requesting-code-review for final review. Execute the remaining integrated UI work in this session without further approval gates.

**Goal:** Implement the seven changes approved in the two 2026-11-07 design documents.

**Architecture:** Reuse the existing opening-stat snapshots, preserve weighted Eevee selection, and define tutorial opponents independently of normal opponents. Keep UI changes in scoped classes and existing CSS, preserving five-slot formation anchors.

**Tech Stack:** React 19, TypeScript, Vite, native CSS, Node assertion scripts, Playwright Chrome.

## Global Constraints

- No publishing, video regeneration, voice or subtitle changes.
- Both formations retain five logical slots and their existing synergy anchors.
- Ghost movement does not reroll the shop or deduct gold.
- No forced battle result and no adjusted evasion probabilities.
- Reuse existing assets, palettes, and native animated fingers.

## Task 1: Mew opening snapshot

Files: `src/engine/BattleSimulator.ts`, `src/engine/HeadlessBattleSimulator.ts`, `scripts/verify-mew-opening-clone.mjs`.

- [x] Add failing behavioral tests for both engines, both teams, levels 1–3, battle stat changes, silence, inherited dynamic synergies, and nonrecursive clone death. Use Vite SSR and real Unit instances; call death events with delays disabled as existing tests do.
- [x] Run `node scripts/verify-mew-opening-clone.mjs`; verify missing/incorrect clones fail.
- [x] Animate engine: `const opening = this.openingStats.get(unit) ?? unit.stats;` then pass `opening.maxHp, opening.attack` to spawn. Headless engine: register equivalent Mew death handling and return spawned units for synergy inheritance.
- [x] Re-run new tests and `npm run test:summon-ownership`; review the diff for unrelated changes.

## Task 2: Eevee three-star exclusion

Files: `src/engine/GameLoop.ts`, `scripts/verify-eevee-evolution-weights.mjs`.

- [x] Extend the existing weighted tests with every final form, multiple exclusions, nonfinal forms, consumed-source exclusion, direct level 3, and a corrupted full-blocked roster.
- [x] Run `npm run test:eevee-evolution-weights`, confirm excluded form still appears before changes.
- [x] Filter base candidates using allies other than evolving unit and consumed source: `ally.level >= 3` and `ally.templateId.replace(/_final$/, '')`; retain weighting on remaining candidates. Guard zero candidates without undefined template access. Existing evolved units keep their path.
- [x] Re-run existing and new weight tests.

## Task 3: Tutorial opponents and interactions

Files: `src/engine/tutorialOpponents.ts` (new), `src/engine/createEnemyTeam.ts`, `src/App.tsx`, `src/components/TutorialCoach.tsx`, `scripts/verify-tutorial-opponents.mjs` (new).

- [x] Write failing tests showing three distinct preview identities and lineups, native star stats, easy victory for all six player permutations in both engines, and first-battle-only easy selection.
- [x] Use distinct IDs: `tutorial-brock-easy`, `tutorial-brock-normal`, `tutorial-brock-hard`. Easy: two level-1 dwebble; normal: dwebble/diglett/onix level 1; hard: crustle/dugtrio/steelix level 2. Five-slot arrays include nulls.
- [x] Prepare each preview once, hand it to entrance and actual battle. Disable normal/hard in first tutorial battle and guard handler as well; label the reason. Keep second tutorial champion battle selectable.
- [x] Run new tests, opening-stats and opponent preview regressions.

## Task 4: HUD, tutorial polish, mobile messages, card exit

Files: `src/App.tsx`, `src/index.css`, `src/presentation/battleScenes.css`, `src/components/TutorialCoach.css`, `src/components/TutorialModal.css`, new focused UI verification script.

- [x] Reproduce UI failures with real app screenshots and measurements; use current audit evidence as baseline. Assert HUD background equality/readability and no blur during battle transitions; reroll and shop stability; finger not clipped; long log final text visible within mobile safe bounds.
- [x] Use one opaque existing mint surface with dark ink for HUD in preparation and battle. Remove conflicting scene text shadows and unintended filters/overlay coverage while retaining intended dialog masks.
- [x] Preserve absolute reroll positioning, replace outlined target emphasis with local soft glow, let native fingers escape scrolling clip while keeping sideways shop scrolling. Keep coach clear of targets and respect safe areas.
- [x] Add a scoped battle feedback layout with compact mobile gaps and bottom safety space; prevent flex compression and ensure three long wrapped messages can be read. Avoid shrinking unit art below current mobile sizes.
- [x] Replace jagged card exit with `opacity`/`transform` animation to scale .96 and translateY(10px) over 400ms; selected card remains visible. Match JS wait; reduced motion uses brief fade.
- [x] Run desktop/mobile native tutorial flow, all steps through completion, long-message mobile checks, safe-area/resize, pool choice confirmation and repeated-click prevention. Save screenshots and JSON evidence.
- [x] Run `npm run build`, relevant regression scripts, final diff review, and independent code review. Resolve findings, document exact verification and remaining platform limits.
