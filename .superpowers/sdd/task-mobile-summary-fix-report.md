# Mobile summary identity overflow fix

## Root cause

At `max-width: 600px`, `.summary-identity` was explicitly `flex-wrap: nowrap`, leaving the fixed portrait, difficulty icon, three stats, and actions competing on one flex row. The existing fixed action/stat sizing therefore overflowed the summary card.

## TDD evidence

- RED: after adding the CSS contract assertions to `scripts/verify-trainer-presentation.mjs`, `npm run test:trainer-presentation` failed with `AssertionError [ERR_ASSERTION]` because the required mobile wrapping rules were absent.
- GREEN: after the CSS-only fix, `npm run test:trainer-presentation` passed with `Trainer presentation values verified.` and exit code 0.
- Regression: `npm run build` passed with exit code 0. Vite emitted only the existing chunk-size warning.

## Change

The 600px media query now wraps `.summary-identity`, places `.summary-identity-stats` on a full-width three-column row, and places `.summary-actions` on a full-width row. DOM order and desktop layout remain unchanged.

