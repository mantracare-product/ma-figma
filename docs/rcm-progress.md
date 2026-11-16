# RCM build progress (branch rcm-3)

Spec: docs/rcm-page-mapping.md Revision 4, section 5. Slice 1 is done (commits 670d475 .. 2274a47).
Status legend: pending | done (commit) | partial (what is missing is a TODO(rcm) below).

## Slice 2 - Setup, tasks, templates, action plumbing
- [x] S2.1 Instance leftovers -- done in Slice 1 (ad6d284: mockMaClient, portal, test drawers, Clients create flow). Nothing left.
- [x] S2.2 Action plumbing: resolveRecordContext, recordWriter, fieldRegistryCore, Retry/health UI -- done (df010bc). update_fields action added (replaces non-persisting fieldupdate); ActionRunsPanel on Automation page.
- [x] S2.3 Billing setup tab + reference stores + provider credentials -- done (f4b4487). Placeholder tab replaced by BillingSetupTab; samples only via seedBillingSetupSamples (wired in S2.6).
- [x] S2.4 Client typed fields + Coverages + Insurance tab -- done (a0b2b00). Sample coverages seed only the 20 canonicalClients with contactType Client (spec said 40; only 20 exist).
- [x] S2.5 Tasks core (mutators, entityRef, auto-close, queues/saved views, linked-record card, create_task, Tasks.tsx import fix) -- done (5518814). TaskQuickCreateDrawer.tsx not touched (not needed). Tasks page: queue bar + extra columns when a view is active.
- [x] S2.6 Load sample templates + Enable demo set + bundle plumbing -- done (fb904fc). DEFAULT_ROLES moved to src/lib/defaultRoles.ts (re-exported from the drawer). AutomationRule.order already existed from Slice 1.

### Slice 2 gate
Commits: df010bc (2.2), f4b4487 (2.3), a0b2b00 (2.4), 5518814 (2.5), fb904fc (2.6); 2.1 was done in Slice 1.
Status: tsc OK, vitest OK (no failures beyond baseline), build OK. Tasks.tsx useEffect import fixed in 2.5.
Demo script (tests only; no browser run):
- PASS (tests: billingSetupStore) Billing setup stores hold entity/NPI/POS once; seeding idempotent, never overwrites edits.
- PASS (tests: coveragesStore) primary + secondary coverage per client; new primary demotes the old one; coverage.updated emitted.
- PASS (tests: sampleBundles) Load sample templates loads rules DISABLED; Enable demo set flips only that set.
- PASS (tests: tasksQueues, end to end through the rule engine) one-off stage-entry rule with create_task on an instance stage -> task in the Insurance fixes view with linked-record label -> moving the instance out of the stage auto-closes it.
- NOT RUN (browser): Billing setup form editing, client Insurance tab UI, Tasks queue bar, task detail linked-record card, Automation/Process sample panel, Deals drag.

## Slice 3 - Eligibility and prior-auth nodes
- [x] S3.1 EG1-EG5 field seeds + S3.2 run_eligibility (mock adapter, resolver, normalizer, window/copy-fresh) -- done in ONE commit (see hash below; deviation: 3.1 and 3.2 share a test file)
- [x] S3.3 check_auth_required + request_prior_auth + priorAuthRulesStore + Payers rules table -- done (see git log "S3.3"). create_task gained linkTo=instance_if_present; Service.requiresAuthDefault added.
- [x] S3.4 Appointment coverage chip, detail Coverage tab, Schedule drawer Coverage + Verify now -- done (git log "S3.4"). Schedule drawer Verify now is a preview (nothing written) because no appointment exists yet; the detail Coverage tab Verify now writes.
- [x] S3.5 Sample process + Set E rules + Run daily jobs now -- done (git log "S3.5"). getStoredRules legacy check-in filter now exempts sample-tagged rules (A13 needs it). Deals instance-card polish: nothing further needed (cards per instance exist from Slice 1). A7 start_call and A5/A9 send_message are inert until S5.4/S3.6.
- [x] S3.6 send_message/notify mock + 4 templates + variables -- done (git log "S3.6"). send_message dispatches into the whatsappMockConversations store + activity; consent = client.consents.sms (sms/whatsapp). notify = in-app notification (type process).
- [x] S3.7 Front-desk Check-in button + kiosk insurance/copay steps -- done (git log "S3.7"). Kiosk: KioskInsuranceStep (coverage on file, mock copay estimate, member ID correction -> coverage.updated). Front desk: Check in button in the appointment drawer tab bar (uses appointmentService.checkInAppointment).

### Slice 3 gate
Commits: 317fb0b (3.1+3.2), 6b97458 (3.3), 21af3b4 (3.4), 7b16f27 (3.5), a1522e9 (3.6), S3.7 (this commit).
Status: tsc OK, vitest OK (no failures beyond baseline), build OK.
Demo script (tests = src/lib/__tests__/rcmSetE.test.ts, eligibility.test.ts, authActions.test.ts, messageActions.test.ts; no browser run):
- PASS Load sample templates -> Enable demo set E: A1 runs first and A10 second (order 10/20), A10 writes to the instance A1 created; with A1 disabled A10 falls back to the appointment only and creates no instance.
- PASS booking for a "member not found" member: instance (titled from the appointment) lands in Needs fix, task in Insurance fixes. NOT RUN (browser): amber chip.
- PASS fix coverage -> coverage.updated -> A3 re-runs (window 0) -> Verified -> the task auto-closes. NOT RUN (browser): green chip, Insurance tab editing.
- PASS second booking inside 30 days: new instance, fresh result COPIED (history source "copied", no new payer call).
- PASS window 0 always calls the payer (also Verify now).
- PASS a service the rule table marks as needing auth: request_prior_auth writes Authorization fields + history row and a task lands in Prior auth (entityRef = the instance, or the appointment when no instance).
- PASS scenario inactive: instance Inactive, Insurance fixes task, and the update-insurance message appears in the client SMS conversation (consent required).
- PASS daily jobs (Run daily jobs now = rcmJobs.runDaily): A2 re-checks upcoming visits (window skips fresh results); A13 re-verifies on check-in only when the last check is older than a day.
- NOT RUN (browser): Billing setup > Payers rules table and scenario picker, detail drawer Coverage tab, Schedule drawer Coverage section, kiosk insurance step, front-desk Check in button, Run daily jobs button.

## Slice 4 - Visit to claim
- [x] S4.1 Multi-workflow claims (persisted claim processes, Claim.processId + migration, per-process required categories, Process page Insurance & Claims tab on the claim entity; Claims page + drawer use claim workflows) -- done (git log "S4.1")
- [x] S4.2 claimService + move_to_workflow + claim Undo + claim events -- done (git log "S4.2"). Engine claim moves + Claims page stage changes now go through claimService; move_to_workflow supports claims only (instance records TODO(rcm)).
- [x] S4.3 Claims page: workflow selector, board per workflow, drawer sections, required-at-stage -- PARTIAL, done (git log "S4.3"): workflow selector (existing dropdown now lists claim workflows), List/Board toggle with a compact ClaimBoard (NOT a shared PipelineBoard extraction), required-at-stage for claim fields on manual moves, N16 blank-table fix. Per-workflow drawer sections (workflowIds) honoured by the checker only: TODO(rcm) the drawer does not hide fields by workflow.
- [x] S4.4 Scribe Codes panel + Sign and send to billing + CPTs + J06.9 fix -- done (git log "S4.4"). Codes panel sits in the transcript drawer (col-span-full inside the body grid; not browser-checked). 14 ophthalmology CPTs added. icd_code now comes from the extraction.
- [x] S4.5 create_claim + scrub_claim + submit_claim (mock) -- done (git log "S4.5"). Step-level update_to_stage on a claim event now moves the claim (it used to move the client). Added a "claims" daily-job collector. Mock clearinghouse scenario is stored (clearinghouseSettingsStore) but has no UI picker yet: TODO(rcm).
- [x] S4.6 Set C rules + queue views + Invoices claim link/columns -- done (git log "S4.6"). Queue views already seeded in S2.5; Invoices got a Claim column (claim number + stage) matched by Claim.invoiceId or the shared appointment. SampleRuleDef.demoDefault=false marks variants that Enable demo set does not switch on.

### Slice 4 gate
Commits: d4b2a39 (4.1), 934a701 (4.2), 22cd656 (4.3), afe7b73 (4.4), ebd846f (4.5), S4.6 (this commit).
Status: tsc OK, vitest OK (no failures beyond baseline), build OK.
Demo script (tests: rcmSetC.test.ts, claimService.test.ts, claimActions.test.ts, scribeBilling.test.ts, claimWorkflows.test.ts; no browser run):
- PASS Load sample templates -> Enable demo set C (A14 default only; the three A14 variants stay off).
- PASS complete an appointment -> claim appears in Charge capture / Awaiting note (once, repeat events do not duplicate).
- PASS sign the note and accept codes (RT) -> claim.note_signed -> Ready to bill -> move_to_workflow -> Claim / Draft -> scrub passes -> Ready to submit.
- PASS scrubber flags a missing laterality modifier: Scrub failed + task in Claim fixes (entityRef = the claim at that stage); fix + back to Draft -> re-scrub passes -> task auto-closes.
- PASS "Run daily jobs now" (rcmJobs.runDaily) -> Submitted -> mock 277CA accepts (Accepted by payer) or rejects (Rejected + Claim fixes task); resubmit uses sequence 2 and is accepted; the rejection task auto-closes.
- PASS change the A14 variant to "create at scribe signing": the claim is created from the scribe codes at signing, not at completion.
- NOT RUN (browser): Process page claim tab (add/rename/delete workflows), Claims page workflow dropdown + List/Board toggle, claim detail drawer, Codes panel layout, Invoices claim column, Billing setup scrub rules.

## Slice 5 - Money back
- [x] S5.1 ERA staging + post_remittance + unmatched handling AND S5.2 CARC/RARC categorization + draft_appeal (propose-only) -- done in ONE commit (see git log "S5.1+S5.2"). The Denial & appeal sample workflow was seeded in S4.1; the A25 move_to_workflow rule lands with Set M (S5.4).
- [x] S5.3 update_invoice_from_claim + invoice sample stages + payment plans (lib) + portal balance -- done (git log "S5.3"). Statement drawer is opened from a new Statement column on Invoices; portal bill screen shows insurance paid/adjustments/plan under an invoice when present. Invoice sample stages are inserted into the existing invoice workflow (not a second workflow: invoice code is single-workflow).
- [x] S5.4 Set M rules A21-A30 + check_claim_status + start_call mock -- done (git log "S5.4"). Invoice "Sent" stage added to the invoice sample stages (the default invoice workflow has none). A30 runs from the daily job (no invoice.overdue emitter). invoiceService.moveToStage now also accepts a stage name.

### Slice 5 gate
Commits: d2d3b84 (5.1+5.2), e7dbc6a (5.3), S5.4 (this commit).
Status: tsc OK, vitest OK (no failures beyond baseline), build OK.
Demo script (tests: rcmSetM.test.ts, remittance.test.ts, invoiceFromClaim.test.ts; no browser run):
- PASS Enable demo set M (A21-A30, plus A25b appeal draft + A27 split into 3 stage rules).
- PASS Receive ERA -> payments post: the paid claim moves to Paid; its invoice is updated from the claim (insurance paid, statement, payment link), moved to Sent, and the payment-link message lands in Chats (consent required).
- PASS one line denies (CO-97): categorized appealable, appeal deadline set, claim.denied -> move_to_workflow to Denial & appeal / New denial, priority set, task in Denials and A/R, appeal DRAFT proposed (nothing sent/moved); moving the claim to Appeal submitted auto-closes the task.
- PASS unmatched ERA lines -> era.unmatched -> task in Posting linked to the ERA.
- PASS advance the clock (invoice sentAt aged, then Run daily jobs): Sent -> Reminder 1 (+message) -> Reminder 2 -> 45 days balance call (voice consent) -> 60 days Overdue + task in Patient balances.
- PASS A21: accepted claim with no payment after 30 days is status-checked (mock 277) and moved to Pending (payer) with a follow-up task.
- NOT RUN (browser): Receive ERA button, Statement column + drawer, portal statement block, payment plan creation UI, Process-page stage editing for the new invoice stages.
## Slice 6 - Overview row, reports, permission wiring, polish
- [x] S6.1 Overview RCM row (queue counts from Task views + KPIs, gated by rcmReports; links open Tasks with ?view=) AND S6.2 report sources (claims, denials, payments, ar_aging, eligibility; offered in the report builder only with rcmReports) -- done in ONE commit (see git log "S6.1+S6.2")
- [x] S6.3 A11/A12 (Set E2) + per-event notification toggles -- done (git log "S6.3"). Added recordAuthDecision (manual approval/denial, UI on the appointment Coverage tab) because the mock prior-auth request never decides on its own; A11 fires on approved authorizations. Notification toggles live in Billing setup > Notifications (default all on).
- [x] S6.4 Voice callPurpose + mock call result into an instance -- done (git log "S6.4"). callPurpose added to CallTriggerSettings (type only: TODO(rcm) no stage voice-settings UI); the start_call step has the purpose + result stage; voice toggle is in Billing setup > Notifications; call result is accepted from the appointment Coverage tab.
- [x] S6.5 hasPermission wiring + audit entries + Mock data banner -- done (git log "S6.5"). hasPermission wired: Billing setup (route + edit), Verify now (eligibility add), authorization decisions (priorAuth edit), accept call result (eligibility add), Sign and send to billing (claims add), Receive ERA (rcmPayments add), Claims create (claims add) / export (claims export) / stage moves (claims edit; denied claims need denials edit), Overview row + RCM report sources (rcmReports read). Audit module RCM added; Mock data banner on Claims, plus mock labels on Billing setup, Coverage tab, schedule Coverage, statement link, Overview row.

### Slice 6 gate
Commits: 5460838 (6.1+6.2), e0086dc (6.3), 184d103 (6.4), S6.5 (this commit).
Status: tsc OK; vitest 217 passed, 13 failed (the same 13 baseline failures as before this run; no new failures); build OK.
Demo script (tests: rcmReports.test.ts, rcmSetE2.test.ts, voiceBenefits.test.ts, rcmAudit.test.ts; no browser run):
- PASS Overview numbers: queue counts per Task saved view (open, overdue, amount at stake) and KPIs (denial rate, A/R, days in A/R, first-pass, eligibility verified rate); the row component renders nothing without rcmReports.
- PASS Reports: denial rate by payer = average of the 1/0 `denied` field on the claims source; denials, payments, ar_aging (aging buckets), eligibility sources return rows from the stores.
- PASS Prior auth renewal (Set E2 / A11): an approved authorization expiring within 14 days (or at 80% of units) is renewed by the daily job (new request starting today) and a Prior auth task is queued; A12 notifies when the visit is 2 days away and the authorization is still only requested; the per-event toggle silences it.
- PASS Voice: with voice on, an Inconclusive instance gets a mock payer call whose benefits land as Pending review; accepting makes them the verified result on the instance and appointment; with voice off the Benefits to verify task is created instead (A8).
- PASS Audit entries for manual claim moves (not rule moves), coverage changes, authorization decisions, ERA receipt/posting, payment plans, scribe signing, Verify now, call-result acceptance; an audit failure never blocks the action.
- PASS Sample roles open exactly the areas they were given (hasPermission); denied/missing keys are denied.
- NOT RUN (browser): Overview row layout, Tasks ?view= link, report builder RCM source cards, Claims page permission states (disabled export/create), Billing setup Notifications/Voice toggle, Coverage tab call-result and authorization-decision panels.

## Decisions
- S5.1: post_remittance matches ERA lines to claims by claim number, then tracking id / payer claim number; a fully accounted-for claim (paid + patient responsibility + contractual) counts as paid.
- S5.4: mock start_call completes immediately with a canned outcome; benefit results from payer calls are written into instances in S6.4.
- S4.1: the legacy `insurance` entity process is left in place and unused by Claims (nothing deleted); claims migrate to the first claim workflow (the default "Claims Management" process).
- S4.2: claimService emits claim.<systemCategory> after each stage entry (claim.submitted, claim.rejected, claim.denied, claim.paid ...); scrub_claim without onFail raises claim.scrub_failed itself.
- S4.5: step-level update_to_stage on a claim event now moves the claim (before it fell through to the client mover).
- S3.2: variant 2 of the mock request strips the first 3 letters of the member ID, so some mock member IDs resolve on retry (by design); markers: NOTFOUND / INACTIVE / DOWN / TIMEOUT in the member ID, or the scenario picker.
- S3.2: retry backoff (1/5/30 min) is not executed; attempts run back to back (no scheduler).
- S3.5: derived rule-condition fields (_hasCoverage, _voiceEnabled, _daysSinceLastCheck) computed in ruleContextFields.ts and merged into event.data; getStoredRules legacy check-in filter exempts sample-tagged rules.
- S3.5: daily jobs emit one job.daily event per record with data.job = collector id; sample rules select the job with a condition.
- S2.4: spec says 40 mock patients; canonicalClients has only 20 with contactType Client, so 20 are seeded.
- S2.5: create_task rules need the stage filter ids (trigger.params.stageId) to equal the process stage id; instance entry events resolve ids by stage name.
- S2.5: queue views bypass the My tasks / Tasks by me tab (queues are cross-user work lists).

## TODO(rcm)
- Stage-level voice settings UI does not expose callPurpose yet (type + start_call step only).
- Appeal drafts have no accept/reject UI (stored as proposed on the claim).
- Payment-plan installments are not marked paid when payments arrive; no reminders from the plan schedule.
- No UI for the mock clearinghouse / ERA scenarios beyond the Receive ERA button.
- Claims board is a compact ClaimBoard, not an extracted shared PipelineBoard.
- Claim drawer does not hide fields by workflowIds (checker/scrubber honour it).
- Mock clearinghouse scenario (accept/reject) has no UI picker; set via clearinghouseSettingsStore.
- move_to_workflow supports claims only (not process instances).
- RCM field seeds have no sections; status-like fields are plain text (no option lists).
- Retry backoff for run_eligibility is not executed (no scheduler).
- A7 (start_call) is inert until S5.4; A5/A9 send_message now work.
- No UI to edit AutomationRule.order.
- start_process / create_task / update_fields have no dedicated canvas NodeType (generic step in the builder).
- Deals does not open the instance drawer from ?instance= (task linked-record Open lands on the board).
- Billing setup > Payers: prior-auth rules table lands in S3.3.

## Round 2 (browser review fixes)
### 0. Demo data vanished (done, commit "R2.0")
Cause: the browser tests' freshWorld() removed whole RCM-affected stores (callLogs(+_demo), deals, clients(+_demo), appointments_v1, tasks, claims, invoices, rules, conversations, services, team, field registry, process store) and left only RCMTEST records behind; stores that hold a default seed only fall back to it when the key is missing or an empty array, so the demo seeds never came back. Callers that read `clients_demo` first lost the demo clients.
Fix: src/lib/demoData.ts: purgeTestRecords() (removes any record carrying the RCMTEST marker from every stored array) + ensureDemoData() (demo org only: empty stores fall back to their seeds again; clients re-seeded from canonicalClients; never overwrites non-empty stores; idempotent), run on every app load (skipped while a browser test run is active) and as `__rcm.reseedDemoData()`.
Not recoverable from the repo: appointments (INITIAL_APPOINTMENTS is empty in code), custom field-registry entries and anything edited by hand in the demo org: if those existed they must be re-entered.
Tests: the harness now backs up storage at the start of every run, restores it after EVERY test (pass or fail), and reports a RUN row proving storage is identical before/after; S1.15 proves the rollback. Unit tests in demoData.test.ts.

### 1. Overview slider (done, commit "R2.1")
Overview is now two slides switched from the PageTopBar mode toggle: "Call overview" (unchanged) and "Claims overview" (needs rcmReports; the toggle is hidden without it). Claims overview: KPI tiles + queue cards on top, then charts from the real stores (claimsOverviewData.ts): claims by stage (bar), by workflow (donut), denial rate by month (line), A/R aging (bar), payer mix (donut), first-pass acceptance by month (line), eligibility results (donut), task queues (horizontal bar). Payer + date filters sit in the PageTopBar. "(Sample)" suffixes removed from queue/workflow/payer/rule/template names and the "Includes mock data" label removed.

### 2. Registry-rendered Insurance, Claim and Coverage screens (done, commit "R2.2")
Client > Insurance is now a DraggableOverviewSections page (sections "Billing demographics" and "Coverages"; Coverages is a table field: payer, member ID, group, priority, effective, term, subscriber) so Configure Sections and the custom-field modal work like on the other tabs; edits write through to the coverages store / client demographics. The Claim drawer gets a registry section "Revenue cycle" (assignee, priority, timely filing, auth status, denial, appeal, scrub issues); assignee/priority/filing deadline persist on the claim, and stage moves in the drawer now go through claimService.moveToStage (stage events fire). The appointment Coverage tab renders Eligibility and Authorization sections from the registry. RCM fields are ordinary client-created registry fields (no "Template" badge), registered once at app start (ensureRcmFieldSeeds) without overwriting edits; "(mock)" wording removed from the Coverage tab. Gate: tsc/build/vitest at baseline.

### 3. Claims page, Workflow/Automation pages, one-time defaults (done, commit "R2.3")
Claims: mock banner and the separate workflow/List-Board strip are gone; the page shows ALL claims by default (the old view silently filtered to the first workflow and a status tab, which is why "All Claims (7)" showed 5). Filters (workflow, stage, payer, assignee, from/to date) and the List/Board toggle sit in the PageTopBar, all defaulting to "All"; Board follows the workflow filter, with "All workflows" it shows the claims grouped by workflow. "Receive ERA" moved into the top bar. Workflow and Automation pages: the "Sample templates" panel is deleted; "Run daily jobs now" is in the Automation top bar next to entity / trigger / status filters. Demo-set UI removed. New src/lib/rcmDefaults.ts (`ensureRcmDefaults`, run at app start, flag `mantra_rcm_defaults_v1`) seeds the starting set once as ordinary items; rules ship ENABLED except alternates (A14 variants) and outbound ones (send_message, start_call, submit_claim: A3, A9, A18, A28a/b, A29), which start off because they message patients, call payers or submit claims without a person looking. Never overwrites edits or recreates deleted items (rcmDefaults.test.ts). Leftover "mock/simulated" user-facing strings in RCM screens and the step catalog were removed. docs/rcm-page-mapping.md carries an amendment note instead of rewriting each statement. Gate at baseline. Not done: tm-tests still reference the removed panel (item 7).

### 4. Claim creation from an AI Scribe session (done, commit "R2.4")
"Create Claim" (still gated by claims-add) opens CreateClaimModal: a searchable list of AI Scribe sessions (patient, date, provider, diagnosis and CPT summary, status Signed / Codes accepted / Note ready) and a secondary link "No session: choose patient / appointment manually" (patient + optional appointment pickers). Choosing a session runs the existing create_claim logic (performCreateClaim: patient, DOS, provider, ICD and CPT/modifier lines from the accepted codes, payer and coverage from the client's primary coverage, appointment link, billing entity/NPI, first workflow and its initial stage, dedupe per session) and opens the claim drawer on the new claim; a claim already created for that session is opened instead. Missing facts are listed in an amber banner in the drawer (claim.missingData). Gate at baseline.

### 5. Flow builder catalogs (done, commit "R2.5")
One definition of every executor action (src/lib/rcmCatalog.ts: label, group, description, icon) now feeds the step catalog drawer, the flow builder "Add actions" sidebar (groups Eligibility & Auth, Claims, Payments, Tasks & Messages, Processes) and the canvas; nodes show readable names (stepDisplayName; the seeded rules now carry real names, old raw-key names are mapped at display). draft_appeal got its (parameter-less) form. Trigger catalog (GLOBAL_TRIGGER_CATALOG) now has every event the rules use or the app emits (job.daily "Daily job", era.received/unmatched, claim.* by stage category, coverage.updated, appointment.*, invoice.*, stage.entered/exited with process and stage pickers, task.*, scribe.note_signed); the trigger sidebar and the trigger editor are generated from it. Root cause of "A21 shows Process Created": the builder fell back to the first catalog entry for any unknown event, and the trigger editor guessed the category from the event prefix. Re-saving a rule is now behavior-neutral (src/lib/automationRuleMapping.ts: keeps trigger params, entity type and the stored action unless you changed them; previously claim rules became "client" rules and stage params were dropped). Tests: rcmCatalogCompleteness.test.ts (every seeded stepKey and trigger event is in the catalogs; every executor key registered; round-trip of every seeded rule). Gate at baseline. Not verified in a browser yet (item 7).

### 6. Billing setup moved into Insurance & Claims; organization is the single source (done, commit "R2.6")
Settings > Billing setup tab, its route /settings/billing-setup and the PermissionGuard route are deleted. Insurance & Claims now has a "Claims | Setup" toggle in the PageTopBar (also ?view=setup); Setup shows only with the existing `billingSetup` permission (its label is now "Claims setup") and has Payers & enrollment (with the prior-auth rules; the eligibility scenario picker is dev-only), Fee schedules, Claim defaults, Scrub rules, Provider credentials, Notification toggles. "Billing entity" and "Locations & POS" sections are removed. The Organization detail drawer (Billing Info) now holds legal name, EIN, group NPI, taxonomy, billing phone, billing contact name/email (registered as organization-module fields in the field registry) and each location has a Place of service code. All of it is read through src/lib/orgBilling.ts by the claim builder (create_claim) and the scrubber (billing_entity check); eligibility never used the billing entity, so nothing to rewire there. Migration (once, flag mantra_org_billing_migrated_v1, at app start): old entity and locations are copied into the active organization (locations matched by name, POS set; claim defaults' default location id re-pointed); the old stores stay in code only for that migration and are no longer read. The demo organization gets plain demo billing values if it has none. Billing-setup seeding no longer creates an entity or locations. Tests: orgBilling.test.ts; billingSetupStore / claimActions / rcmSetC tests adjusted. Gate at baseline. Deviation: someone with only the billingSetup permission used to reach Settings; now they need access to the Claims page too (Setup lives there).

### 7. Tampermonkey tests updated (done, commit "R2.7")
tools/tm-tests: UI tests no longer use the removed panel, demo-set buttons, Billing setup route or the Mock banner; new checks for the Setup toggle (no Billing entity / Locations sections), organization-sourced billing entity and POS, one-time defaults (enabled except outbound and alternates; edits and deletions kept), Claims filters/List-Board in the top bar, the Create Claim session picker (prefilled claim opens, coverage and billing entity filled), flow-builder catalog completeness plus the rule re-save round trip, and "no Sample / Mock data / Demo set wording" on Claims, Setup and Automation. Harness gained T.ui.appText() (app text without the test panel); dev hook gained orgBilling, rcmDefaults, rcmCatalog, automationTypes, automationMapping. Bundle rebuilt. Playwright (headless Chrome, dev server): S1 15 tests, S2 14, S3 17, S4 15, S5 12, S6 11 = 84 tests; 78 PASS, 6 MANUAL (layout/visual judgement), 0 FAIL; every slice's RUN row (storage identical before/after) PASS. Not verified by any script: visual layout of the new Claims top bar, Setup, Create Claim modal, Revenue-cycle section in the claim drawer, Insurance tab drag/reorder and Configure Sections, the flow-builder canvas (node names, trigger sidebar) and the Organization drawer's new billing inputs; those need a human look.

## Round 3

DESIGN.md (repo root) is the design authority for this round (tokens, 32px table rows, dark-navy table header, rounded-2xl cards, subtle grey add buttons, no new design system).

### 1. "(Sample)" cleanup and Claims overview polish (done, commit "R3.1")
src/lib/sampleSuffixMigration.ts: one-time (flag mantra_strip_sample_suffix_v1), idempotent migration that walks every `mantra_*` JSON value in localStorage and strips a trailing " (Sample)" (also "(Demo)", "(Mock)") from string values: processes, stages, queue views, rules, payers, templates, fields, sections, roles. It only rewrites keys that contain the suffix, runs at app start (skipped during browser test runs) and `stripSampleSuffix()` is applied at display time for queue, stage and workflow names. No UI string in src/ still contains "(Sample)". Overview > Claims overview: the 8 queue tiles are replaced by one "Work queues (open tasks)" card (horizontal bars with counts, zero rows hidden, counts only); KPI tiles are one row of 7 with 30-day deltas (kpiDeltas); chart cards share one style (title, min height, chart height, empty text). Two permission tests left over from R2.6 (billing-setup role now has claims read) were corrected. Gate: tsc at baseline, build OK, vitest at baseline.

### 2. Insurance tab removed; Insurance section on the client Overview (done, commit "R3.2")
The client profile "Insurance" tab and ClientInsuranceTab.tsx are deleted. The Overview tab gets one registry section "Insurance" (id sec-insurance): the Coverages table field (payer, member ID, group, priority, effective, term, subscriber; same group/table field view and custom-field modal as other sections) plus guarantor, self-pay, the three consents, date of birth, sex and address. Client name stays the single name field: the "Legal first/last name" fields are no longer placed in any section (definitions and values are kept, nothing deleted). Migration inside ensureRcmFieldSeeds: fields in the old "Billing demographics"/"Coverages" sections are re-pointed to sec-insurance, the two old sections are removed from the section registry, and saved overview layouts drop the old ids. Coverage rows and consents write through src/lib/clientInsurance.ts to the coverages store (coverage.updated and run_eligibility unchanged). Links: `?section=insurance` (and the old `?tab=insurance`) open Overview, scroll to and highlight the Insurance section; task links for eligibility/coverage/auth queues use it (insuranceLink). Kiosk/portal editors never linked to the tab. tm-test S2 updated. Gate at baseline.

### 3. Shared top bar and table (done, commit "R3.3")
PageTopBar (used by every list page) is now strictly one line: flex-nowrap, the search box shrinks (min 140px) and, when the controls still do not fit, secondary actions and children move into a "More" popover (ResizeObserver with hysteresis; testids top-bar-more / top-bar-more-menu). TableComponent root gets min-w-0/max-w-full so only the table container scrolls horizontally; the main content area clips page-level horizontal overflow (overflow-x-hidden). The table already followed DESIGN.md (32px rows, navy gradient header), so no visual change there. Gate at baseline. Browser check across Claims, Tasks, Deals, Automation, Workflow, Invoices, Contacts, Appointments, Call Logs at 1280px is in item 7.

### 6. Insurance & Claims top bar (done, commit "R3.6")
Claims top bar now holds only: Claims | Setup toggle, search, workflow switcher, payer filter, assignee filter, List | Board, Create Claim, Receive ERA, export, settings gear. "All workflows", "All stages" and both date pickers are gone. The workflow switcher lists only the workflows that exist, each with its claim count ("Claim (14)"), no All option, one at a time; it defaults to the workflow with the most claims (and still honours ?processId= / ?process=). List and Board both follow the selected workflow (the grouped "all workflows" board is removed); stage stays visible in the Stage column and the board columns. Counts are per workflow over all claims, before payer/assignee/search filters. tm-test S4 updated. Gate at baseline.
