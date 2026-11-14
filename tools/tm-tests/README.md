# RCM browser tests (Tampermonkey)

Browser tests for RCM Slices 1-6. 81 tests: 75 automated checks, 6 MANUAL items (layout/colour things a script cannot judge).

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

## Your data / reset
Tests overwrite RCM data (claims, tasks, rules, process logs, ... they start each test from a clean RCM state and use `RCMTEST-` names). Before the first run the harness stores a full backup of localStorage/sessionStorage under `__rcmtest_backup`.
- **Reset test data**: restores the data as it was before the first run (backup is kept, reloads the page).
- **Restore & delete backup**: same, and deletes the backup. Do this when you are finished.
- If the browser refuses the backup (storage quota) the panel prints a WARNING; export your data yourself first.
Tests are re-runnable.

## What is where
- `rcm-harness.user.js` panel, runner, backup, helpers (`RcmTm.h.*`, `RcmTm.ui.*`). Install the bundle, not this file.
- `s1..s6-*.js` the tests. Arrange/assert go through `window.__rcm` (the real stores/services as namespaces); UI-only checks click real screens through `data-testid`.
- `verify-playwright.mjs` loads the bundle into the dev app with headless Chromium: `PW_DIR=<folder with node_modules/playwright-core> node tools/tm-tests/verify-playwright.mjs http://localhost:5173 [1-6|all] [testId]`.

## Not automatable (MANUAL)
Deals/process-drawer visuals, form layouts (Billing setup, Insurance tab), kiosk insurance screens and chip colours, Scribe Codes panel, portal statement block, report-builder RCM source cards.
