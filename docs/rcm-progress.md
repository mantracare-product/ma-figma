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
- [ ] S3.7 Front-desk Check-in button + kiosk insurance/copay steps

## Slice 4 - Visit to claim
- [ ] S4.1 .. S4.6 (pending)

## Slice 5 - Money back
- [ ] S5.1 .. S5.4 (pending)

## Slice 6 - Overview row, reports, permission wiring, polish
- [ ] S6.1 .. S6.5 (pending)

## Decisions
- S2.4: spec says 40 mock patients; canonicalClients has only 20 with contactType Client, so 20 are seeded.
- S2.5: create_task rules need the stage filter ids (trigger.params.stageId) to equal the process stage id; instance entry events resolve ids by stage name.
- S2.5: queue views bypass the My tasks / Tasks by me tab (queues are cross-user work lists).

## TODO(rcm)
- No UI to edit AutomationRule.order.
- start_process / create_task / update_fields have no dedicated canvas NodeType (generic step in the builder).
- Deals does not open the instance drawer from ?instance= (task linked-record Open lands on the board).
- Billing setup > Payers: prior-auth rules table lands in S3.3.
