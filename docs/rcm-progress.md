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
- [ ] S4.4 Scribe Codes panel + Sign and send to billing + CPTs + J06.9 fix
- [ ] S4.5 create_claim + scrub_claim + submit_claim (mock)
- [ ] S4.6 Set C rules + queue views + Invoices claim link/columns

## Slice 5 - Money back
- [ ] S5.1 .. S5.4 (pending)

## Slice 6 - Overview row, reports, permission wiring, polish
- [ ] S6.1 .. S6.5 (pending)

## Decisions
- S3.2: variant 2 of the mock request strips the first 3 letters of the member ID, so some mock member IDs resolve on retry (by design); markers: NOTFOUND / INACTIVE / DOWN / TIMEOUT in the member ID, or the scenario picker.
- S3.2: retry backoff (1/5/30 min) is not executed; attempts run back to back (no scheduler).
- S3.5: derived rule-condition fields (_hasCoverage, _voiceEnabled, _daysSinceLastCheck) computed in ruleContextFields.ts and merged into event.data; getStoredRules legacy check-in filter exempts sample-tagged rules.
- S3.5: daily jobs emit one job.daily event per record with data.job = collector id; sample rules select the job with a condition.
- S2.4: spec says 40 mock patients; canonicalClients has only 20 with contactType Client, so 20 are seeded.
- S2.5: create_task rules need the stage filter ids (trigger.params.stageId) to equal the process stage id; instance entry events resolve ids by stage name.
- S2.5: queue views bypass the My tasks / Tasks by me tab (queues are cross-user work lists).

## TODO(rcm)
- RCM field seeds have no sections; status-like fields are plain text (no option lists).
- Retry backoff for run_eligibility is not executed (no scheduler).
- A7 (start_call) is inert until S5.4; A5/A9 send_message now work.
- No UI to edit AutomationRule.order.
- start_process / create_task / update_fields have no dedicated canvas NodeType (generic step in the builder).
- Deals does not open the instance drawer from ?instance= (task linked-record Open lands on the board).
- Billing setup > Payers: prior-auth rules table lands in S3.3.
