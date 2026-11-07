# Tinkatink family and opening balance

Approved scope: user requests tier-5 Infinite-only Tinkatink family, initial 8/8,
Charm + Hard at every stage, nonlegendary, never NPC core or filler. Preserve
the supplied descriptions exactly and reuse Larvitar's damage and EXP rules.
Use the six supplied 00 portraits / 01 battle sprites unchanged.

1. Add regression coverage for definitions, edition eligibility, damage ratios,
   silence, three-battle EXP/evolution, and temporary opening stat bonuses.
   Run it before implementation and confirm missing-family failure.
2. Add templates in AllUnits, Classic exclusion, shared Larvitar hooks in both
   simulators, and GameLoop battle-count EXP. Copy supplied assets.
3. Add player-only template metadata and enforce it at every NPC core/filler
   generation route, with empty-pool handling and focused regression tests.
4. Set Kangaskhan to 6 attack / 4 HP and Shuckle to 4 attack / 6 HP. Replace
   cross-stat effects with 50% own opening attack / maximum HP respectively,
   temporary, floored and capped consistently in both simulators.
5. Run focused regressions, growth/opening/smoke/assets checks, production build,
   independent review, then commit and deploy with the existing Pages workflow.
   Verify workflow success and deployed assets.
