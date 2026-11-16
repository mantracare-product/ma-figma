# RCM browser tests (Tampermonkey)

Browser tests for RCM Slices 1-6. 84 tests: 78 automated checks, 6 MANUAL items (layout/colour things a script cannot judge).

## Install
1. `node tools/tm-tests/build.mjs` (from the repo root) builds `tools/tm-tests/rcm-all.user.js` from the harness + the six slice files.
2. Tampermonkey > **Create a new script**, paste the whole of `rcm-all.user.js`, save. (Or Tampermonkey > Utilities > import from file.)
3. Start the app on the **Vite dev server**: `npm run dev`. The tests need `window.__rcm`, a dev-only hook (`src/dev/rcmTestHook.ts`) that does not exist in production builds; on a production build every test SKIPs with that reason.
4. Log in to the app first (the tests do not touch your session; the two role tests change `user_role`/`user_data` and restore them).

## Dev server URL / port
The script header matches `http://localhost:*/*` and `http://127.0.0.1:*/*`, so any port works. To restrict it (e.g. only 5173), edit the `@match` lines in the Tampermonkey editor. It never runs on other hosts.

## Run
A dark **RCM tests** panel appears bottom-right (click its header to collapse).
- **Run all**, **S1..S6** (one slice), **Run single** (pick from the list).
- Some tests navigate (e.g. to `/claims`); the run resumes automatically after each reload (state is kept in `sessionStorage`). Do not click around while a run is in progress.
- Statuses: **PASS** (a real assertion held), **FAIL** (assertion failed or a target was not found), **SKIP** (cannot run here, with the reason), **MANUAL** (needs a human).
- **Copy results** puts a markdown table `id | slice | title | status | detail` plus a summary line on the clipboard (also `RcmTm.markdown()` in the console).

## Your data / reset (non-destructive)
Tests build a clean RCM state for themselves, so they wipe RCM stores **during** a test. To make that safe the harness takes a full backup of localStorage/sessionStorage (`__rcmtest_backup`) at the START of every run and puts storage back exactly as it was **after every test, pass or fail**. At the end it checks that storage is identical to the start and reports a `RUN` row (PASS/FAIL); test S1.15 proves the rollback.
- If you close the tab in the middle of a run, press **Reset test data** (restores the backup, reloads) and, if needed, run `__rcm.reseedDemoData()`.
- **Restore & delete backup**: restores and removes the backup.
- If the browser refuses the backup (storage quota) the panel prints a WARNING; export your data yourself first.
- On every app load `ensureDemoData()` also purges any record that still carries the RCMTEST marker.
Tests are re-runnable.

## What is where
- `rcm-harness.user.js` panel, runner, backup, helpers (`RcmTm.h.*`, `RcmTm.ui.*`). Install the bundle, not this file.
- `s1..s6-*.js` the tests. Arrange/assert go through `window.__rcm` (the real stores/services as namespaces); UI-only checks click real screens through `data-testid`.
- `verify-playwright.mjs` loads the bundle into the dev app with headless Chromium: `PW_DIR=<folder with node_modules/playwright-core> node tools/tm-tests/verify-playwright.mjs http://localhost:5173 [1-6|all] [testId]`.

## Not automatable (MANUAL)
Deals/process-drawer visuals, form layouts (Claims Setup, Insurance tab, Create Claim modal), kiosk insurance screens and chip colours, Scribe Codes panel, portal statement block, report-builder RCM source cards.

## Round 2 changes
- Billing setup is now **Insurance & Claims > Setup** (`/claims?view=setup`); the billing entity and POS are on the **Organization** record (tested through `__rcm.orgBilling`).
- There are no demo-set / sample-template buttons any more: the starting set is created once by `ensureRcmDefaults` (tested via `__rcm.rcmDefaults`). Tests that need the E/E2/C/M rules still call the internal `__rcm.sampleBundles.enableDemoSet` to arrange state; that is test setup, not UI.
- New checks: Create Claim session picker, Claims filters + List/Board in the top bar, Claims overview slider, flow-builder catalog completeness and re-save round trip, no Sample / Mock wording on Claims, Setup and Automation.
- Every run backs up storage first, restores it after each test, and ends with a RUN row proving storage is identical.

## Round 3 changes
- Client profile has no Insurance tab: the Overview tab has an **Insurance** section (`data-section-id="sec-insurance"`, `?section=insurance` scrolls to it).
- Claims top bar: workflow switcher (no All, counts, default = most claims), payer, assignee, List/Board, no stage or date filters. Payer, assignee and List/Board may sit in the top bar's **More** menu on narrow windows: tests call `T.ui.openMore()` first.
- Tasks page has no Queue selector / Save view. Overview shows one "Work queues" card (counts only).
- New checks (S6.12-S6.16): "(Sample)" suffix migration, realistic data present (flag `mantra_demo_workspace_v1`), single-line top bars and no horizontal page scroll on eight pages, no Insurance tab. The realistic data is seeded by the app at start-up (never during a test run) and read-only here.
