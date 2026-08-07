# v4.8.5 Quality Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the release checks portable and repeatable, while reducing the initial JavaScript payload without changing gameplay balance.

**Architecture:** A Node smoke-test script will bundle a short TypeScript test harness with the existing Vite dependency and exercise unit data, edition shop flows, and headless battles. `App.tsx` will load non-essential modals only when rendered. The existing data-check script will resolve the repository root from its own location instead of a user-specific desktop path.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Node.js LTS, esbuild.

## Global Constraints

- Do not change unit statistics, opponent teams, rewards, or combat rules.
- Keep all tests offline after dependencies have been installed.
- Keep the production build command as `tsc -b && vite build`.

---

### Task 1: Install and verify the Node runtime

**Files:** None.

- [ ] **Step 1: Install Node.js LTS**

Run: `winget install --id OpenJS.NodeJS.LTS --exact --accept-package-agreements --accept-source-agreements`

Expected: Winget reports a successful installation.

- [ ] **Step 2: Verify npm tooling**

Run: `node --version; npm --version; npx --version`

Expected: each command prints a version number.

### Task 2: Add a repeatable smoke test and repair the data checker

**Files:**
- Create: `scripts/smoke-test.mjs`
- Modify: `package.json`
- Modify: `check_units.js`

**Interfaces:**
- Produces the `npm run test:smoke` command; it exits nonzero for missing base stats, invalid opponent assets or IDs, invalid shop flows, or nonterminating battles.

- [ ] **Step 1: Write the failing smoke-test command declaration**

Add `"test:smoke": "node scripts/smoke-test.mjs"` to `package.json` and run it before creating the script.

Expected: npm fails because `scripts/smoke-test.mjs` does not exist.

- [ ] **Step 2: Implement the smoke test**

Create a Node ESM script that bundles a TypeScript harness using `esbuild.build`, imports `ALL_UNITS`, all three editions, `GameLoop`, and `HeadlessBattleSimulator`, then asserts: every unit has finite `hp`, `maxHp`, and `attack`; each edition reaches `SHOP` after any infinite-pool selection; 100 randomly generated battles reach a result within 200 steps.

- [ ] **Step 3: Make the data checker portable**

Replace the hard-coded `readFileSync` path in `check_units.js` with `fileURLToPath(import.meta.url)`, `dirname`, and `join(__dirname, 'src', 'data', 'AllUnits.ts')`.

- [ ] **Step 4: Verify the test commands**

Run: `npm run test:smoke; node check_units.js`

Expected: both commands exit 0.

### Task 3: Defer non-essential modal code and verify the release

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- `EncyclopediaModal` and `TutorialModal` retain their existing props and render under `React.Suspense` with no visible fallback.

- [ ] **Step 1: Write the failing build expectation**

Run: `npm run build` and record the single main JavaScript bundle warning as the baseline.

- [ ] **Step 2: Implement deferred imports**

Replace static modal imports with `React.lazy(() => import(...).then(module => ({ default: module.EncyclopediaModal })))` and the equivalent tutorial import. Wrap each existing modal render site in `React.Suspense fallback={null}` without changing modal props.

- [ ] **Step 3: Verify the release**

Run: `npm run test:smoke; npm run build; git diff --check`

Expected: smoke test, build, and whitespace validation exit 0; Vite emits a separate modal chunk or a reduced initial entry chunk.
