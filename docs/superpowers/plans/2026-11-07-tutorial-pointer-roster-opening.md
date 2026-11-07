# Tutorial pointer, battle art, choice emphasis and infinite opening

User-approved follow-up requirements: keep teaching fingers visible above synergy icons; correct Brock battle portraits; gray unavailable Brock choices with no lock copy and softly glow the available choice; infinite turn 1 keeps all fixed starters and randomly draws the five formerly manual picks, while later drafting stays manual.

## Task 1 — Infinite opening (isolated GameLoop task)

Files: `src/engine/GameLoop.ts`, new `scripts/verify-infinite-opening.mjs`.

- [x] Write real GameLoop tests: turn 1 enters SHOP without choices, fixed starter IDs preserved, five unique eligible tier-1 base characters added, no bans for unchosen random characters, reentering shop/rerolling cannot draw again, next turn retains five manual drafts. Cover repeated seeded samples and non-infinite editions.
- [x] Run red; verify old first-turn POOL_SELECTION fails.
- [x] Retain existing starter initialization and change only the turn-1 pool scheduling path to sample five eligible unique characters without replacement, mark turn processed, and roll shop normally. Keep later schedules unchanged.
- [x] Run new tests plus smoke and existing pool/growth coverage. Save report to `output/tutorial-followup-20261107/`.

## Task 2 — Brock battle art

Files: `src/engine/tutorialOpponents.ts`, `scripts/verify-tutorial-opponents.mjs`.

- [x] Assert every tutorial enemy uses template battleImageUrl in generated team and both simulators, while previews still derive correct 00 portraits.
- [x] Run red; Unit currently defaults to shop artwork and tutorial early return skips normal battle image normalization.
- [x] Set `unit.imageUrl = unit.battleImageUrl || unit.imageUrl` in tutorial team creation.
- [x] Run original 36 easy victories and portrait assertions; inspect real rendered battle desktop/mobile with five-slot identity checks.

## Task 3 — Native fingers and choice emphasis

Files: `src/App.tsx`, `src/index.css`, `src/components/selectionCards.css`, `src/presentation/useTutorialPointerClearance.ts`, `scripts/verify-seven-fixes-ui.mjs`, `scripts/verify-tutorial-followup-ui.mjs`.

- [x] Reproduce native step3 with Gastly purchased in logical slot5 so the finger intersects synergy row. Check relative stacking contexts and clipping, then capture desktop/mobile evidence.
- [x] Raise only highlighted board slots above their sibling synergy row; measure HUD clearance for the full native15px bounce and update through resize/scroll. Native screenshots showed board clipping itself was not a remaining problem. Preserve native pseudo-element animation and all formation anchor math.
- [x] Remove visible disabled-copy span. Add dedicated tutorial available-choice class only during first tutorial battle; reuse tutorialGlowPulse with sufficiently specific shadow rule so selection CSS cannot suppress it. Apply grayscale/muted appearance to unavailable opponent cards; preserve disabled semantics/guards and later champion selection.
- [x] Update native UI tests for absent lock copy, grayscale inactive cards, available glow, native finger stacking/clip, real 01 battle art, automatic turn1 infinite pool and turn2 manual pool animation.
- [x] Run UI suite, mobile five-vs-five anchor tests, build and independent review. Commit and publish via existing main/Pages workflow; verify resulting online bundle.
