# RCM build progress (branch rcm-3)

Spec: docs/rcm-page-mapping.md Revision 4, section 5. Slice 1 is done (commits 670d475 .. 2274a47).
Status legend: pending | done (commit) | partial (what is missing is a TODO(rcm) below).

## Slice 2 - Setup, tasks, templates, action plumbing
- [x] S2.1 Instance leftovers -- done in Slice 1 (ad6d284: mockMaClient, portal, test drawers, Clients create flow). Nothing left.
- [x] S2.2 Action plumbing: resolveRecordContext, recordWriter, fieldRegistryCore, Retry/health UI -- done (df010bc). update_fields action added (replaces non-persisting fieldupdate); ActionRunsPanel on Automation page.
- [ ] S2.3 Billing setup tab + reference stores + provider credentials
- [ ] S2.4 Client typed fields + Coverages + Insurance tab
- [ ] S2.5 Tasks core (mutators, entityRef, auto-close, queues/saved views, linked-record card, create_task, Tasks.tsx import fix)
- [ ] S2.6 Load sample templates + Enable demo set + bundle plumbing

## Slice 3 - Eligibility and prior-auth nodes
- [ ] S3.1 .. S3.7 (pending)

## Slice 4 - Visit to claim
- [ ] S4.1 .. S4.6 (pending)

## Slice 5 - Money back
- [ ] S5.1 .. S5.4 (pending)

## Slice 6 - Overview row, reports, permission wiring, polish
- [ ] S6.1 .. S6.5 (pending)

## Decisions
(none yet)

## TODO(rcm)
(none yet)
