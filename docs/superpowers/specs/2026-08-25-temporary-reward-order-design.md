# Temporary Reward Order Design

## Goal

Make rewards marked `暫時` increase power only after every battle-start Pokémon ability and synergy effect has resolved.

## Scope

- Applies only to `BATTLE_NONE` and `BATTLE_SYNERGY` rewards.
- `PERM_NONE` and `PERM_SYNERGY` rewards remain immediate, persistent selection rewards.
- No changes to item targeting, item values, stat caps, or the start-of-battle ability phase order.

## Data Flow

1. Selecting a temporary reward continues to queue it in `GameLoop.nextBattleBuffs`.
2. `App` continues to consume that queue when creating `BattleSimulator` for the next battle.
3. `BattleSimulator` retains those rewards without applying them in its constructor.
4. During `init`, resolve the existing start sequence: unit ability phases, then battle-start synergies.
5. Apply queued temporary rewards after step 4 and immediately before the `BATTLE_START` event. There are currently no listeners for that event, so this is the final setup mutation before turns begin.

## Result

Temporary reward values do not affect pre-battle ordering, targets, or calculations. They affect only the combat state used from the first actual turn onward and disappear with that battle simulator instance.

## Verification

- Add a regression test proving temporary rewards are applied after the battle-start ability sequence.
- Keep the permanent-family-buff, balance, trainer-presentation, lint, and production-build checks green.
