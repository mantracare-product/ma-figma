# MantraAssist RCM — Correction & Depth Pass (v1.1)

**Status:** Ready for build — this supersedes nothing in `MantraAssist_RCM_Spec.md`, it corrects and deepens the V1 Core Loop that was already built against it.
**Audience:** Antigravity build agent
**Read alongside:** `MantraAssist_RCM_Spec.md` (original spec), `ATHELAS_FULL_DOCS.md` (reference/bar — cited throughout below with exact source behavior), `docs/DESIGN_NAVODYA.md` (design system, unchanged)

---

## 0. How to read this document

The V1 build shipped real, working architecture — the encounter trigger, the AI confirmation gate, the rejection/denial split — but it has one root-cause data bug that makes almost everything downstream feel disconnected, plus a set of real feature gaps found by comparing our build against Athelas's actual documented behavior (not their branding or visuals — their *mechanics*, used only as a completeness bar per the original spec's ground rules).

**Fix Section 1 before anything else.** Every other section in this document produces UI that reads from real client data — if Section 1 isn't fixed first, every subsequent fix will just be more UI pointed at fake patients.

This document is organized by fix, not by file — each section names the problem in plain terms, states the required behavior precisely, and lists exactly which existing files it touches. Every "Reuse" note tells you to extend something that already exists rather than create something new.

---

## 1. CRITICAL — Reconnect RCM to Real Client Data

### 1.1 The problem, precisely

Your real client roster (`src/lib/getClientList.ts`) uses IDs like `c-1`, `c-2` and real names (James Wilson, Emma Brown, Oliver Davis...). The entire RCM mock dataset (`src/lib/rcmStore.ts`) was built independently with invented IDs (`CL-001`, `CL-002`...) and invented names ("Sarah Johnson," "Michael Chen") that match nothing in the real roster. On top of that, `Appointment` (`src/app/pages/Appointments.tsx`) has no `clientId` field at all — it only ever had `clientName`/`clientEmail`/`clientPhone`. When the encounter-creation trigger fires on appointment completion, it fabricates a synthetic ID (`` `CL-${apt.id}` ``) instead of resolving a real client.

The result: every RCM screen is either showing a parallel, fictional patient list, or falling back to fragile `clientName.toLowerCase() ===` string matching to bridge the gap (confirmed present in `ClientProfile.tsx`, `AppointmentCard.tsx`, `EligibilityWorklist.tsx`, `DenialBoard.tsx`, `PatientBalances.tsx`, and others). This is precisely the "parallel identity system" the original spec (§2.3) said not to build.

### 1.2 Required fix

1. **Add `clientId: string` to the `Appointment` interface** in `Appointments.tsx`. Every place an appointment is created (`ScheduleAppointmentDrawer.tsx` already has a client picker) must set this to the real selected client's ID — never generate one.
2. **Delete the synthetic-ID fallback** in the `handleStatusChange` → `createEncounterFromAppointment` call. If an appointment somehow has no `clientId`, that's a data problem to surface (e.g., a toast/error), not something to paper over with a fake ID.
3. **Regenerate all of `rcmStore.ts`'s seed data** so every `clientId`/`clientName` pair is pulled from `getClientList()` at seed time — not hardcoded strings. Loop over the real client list and generate claims/eligibility checks/balances/etc. against real client records so every RCM screen shows patients that actually exist in the system.
4. **Remove every `clientName.toLowerCase() === ...` matching pattern** across the codebase (confirmed locations above) and replace with a strict `clientId === clientId` lookup. If no match is found, render a genuine empty state — do not silently fall back to name matching.
5. Audit `PatientArBalance`, `Claim`, `EligibilityCheck`, `DenialClusterGroup`, `CredentialingRecord`, and `PriorAuthRecord` — every one of these must carry a real `clientId` sourced the same way.

**Reuse:** `getClientList()` is the single source of truth — import and use it directly in `rcmStore.ts`'s seed generation rather than hardcoding names.

---

## 2. Insurance Becomes a Real, Editable Client Attribute

### 2.1 Where it lives

Per Athelas's documented pattern (`ATHELAS_FULL_DOCS.md`, "Add/edit a Patient's Insurance"): insurance is entered and edited **from the patient's own profile**, either while creating the patient or any time after — never from a billing worklist as a read-only display. Right now, MantraAssist's client record has **no insurance fields anywhere** (confirmed — the only "insurance" string in the whole client type system is a leftover pipeline-stage label unrelated to actual coverage data).

**Fix:** add a real, editable **Insurance** section to `ClientProfile.tsx` (either as its own block inside the existing Overview tab, or as the entry-point section of the new "Billing & Insurance" tab — but it must be a place you can *add and edit*, not just view). This is the direct, concrete answer to "where do I put in insurance info."

### 2.2 Exact field spec (adapted from the Athelas reference, not copied verbatim — same fields, our own component style)

| Field | Notes |
|---|---|
| Insurance Company (payer) | Selecting this should be able to drive Plan Type in a later pass; v1 can be a text/select field |
| Policy Number | |
| Group Number | |
| Effective Date / Expiration Date | |
| **Guarantor** (relationship to policyholder) | Defaults to **Self**. If not Self, reveal policyholder fields: first/last name, email, phone, DOB, gender, address |
| Insurance Card | Optional photo upload — **reuse** `src/lib/clientDocumentsStore.ts` / `DocumentsTab.tsx` upload mechanism, don't build a new uploader |
| Requires Prior Auth on Submission | Toggle |

**Special values, typed directly into the same Insurance Company field (not a separate flow):**
- **"Self Pay"** → collapses the whole insurance section, patient is self-pay
- **"Missing Insurance"** → flags the patient as not-yet-collected without blocking the rest of the profile
- Selecting a **Workers' Compensation** payer reveals extra fields: Claim Number, Accident Date, Employer, and (for auto claims) Accident State

### 2.3 Downstream effect

Every eligibility check, every claim's payer field, and the new Insurance Intake worklist (§3) should read from this real field set — not from disconnected mock data. This is the actual root of "there's no way to check eligibility": there was nothing to check *against*.

---

## 3. New Page — Insurance Intake Worklist

### 3.1 Why this is missing, not just underbuilt

Athelas has a page whose entire job is upstream of Eligibility: a worklist of **patients who don't have insurance on file yet, or whose insurance needs updating**. Our build only has the *after-you-have-insurance* worklist (Eligibility). The "front door" doesn't exist, which is very likely the exact wall you hit.

### 3.2 Spec

New page: `/revenue-cycle/insurance-intake` (add to `RevenueCycleSubnav.tsx` under Daily Work, next to Pre-Visit & Eligibility).

- List of clients whose insurance field (§2) is empty, marked "Missing Insurance," or flagged stale (e.g., expiration date passed).
- Columns: Patient, Last Contacted, Task Status (`Not Started` / `In Progress` / `Completed`), quick actions.
- Row click → opens the Client Profile's Insurance section directly (deep link into §2's editable form) so staff can fill it in immediately, not just view the problem.
- Actions menu per row: **Mark In Progress**, **Mark Completed** (matches Athelas's exact action set).
- v1 does not need the automated patient-portal self-service texting flow Athelas has — that's a v2/v3 automation candidate (reuse the existing communication trigger engine per the original spec §8.9 pattern when that's built). v1 just needs the worklist + the deep link into an editable form to exist.

---

## 4. Appointment Prep — Upgrade from a Badge to a Real Panel

### 4.1 The gap

The current build put a small eligibility-status badge on `AppointmentCard.tsx` with a "re-run" button. Athelas's actual pattern (`ATHELAS_FULL_DOCS.md`, "Conduct Eligibility Checks" / "Track Prior Authorizations" / "Review Patient Balances") bundles far more into the same moment: from the appointment itself, staff can re-run eligibility, see prior-auth status and visit-count alerts, and **charge an outstanding balance right there** — all before the patient even reaches the front desk.

### 4.2 Fix

Expand the eligibility badge's popover (already exists in `AppointmentCard.tsx`) into a fuller **Pre-Visit Prep** panel, reachable from the same click. Sections:
- Eligibility status + re-run (already exists, keep it — now reading real data per §1/§2)
- Prior Authorization status for this client/payer, with the traffic-light indicator from §7
- Outstanding balance for this client (from `PatientArBalance`, §12), with a **Charge Now** action that opens the existing `RecordPaymentModal.tsx` (reuse, don't build new)

**Reuse:** existing popover shell in `AppointmentCard.tsx`, `RecordPaymentModal.tsx` for the charge action.

---

## 5. Eligibility Worklist — Make Every Row Actionable

`EligibilityWorklist.tsx` currently has zero drawer/detail interaction — rows don't respond to clicks; only a small "View Profile" link (navigates away) and a "Re-run" button exist. Bring this page in line with the pages that already work correctly (Claims, Denials, Rejections, Payment Posting, Encounters, Pending Docs):

- Row click opens a detail drawer (reuse `DrawerShell.tsx`) showing full eligibility check detail, not just the inline table cells.
- The page needs to reflect real data per §1/§2 — once that's fixed, this page should show every real client with insurance on file, not eight scripted mock entries.

---

## 6. Prior Authorizations — From Static Table to Real Tool

`PriorAuthList.tsx` is currently 100% inert: zero click handlers anywhere, no add, no edit, no detail view. Athelas's pattern (`ATHELAS_FULL_DOCS.md`, "Track Visit Alerts" / "Add/edit Patient's Prior Authorization"):

- **Visit-count tracking with a traffic-light indicator**: orange when nearing the authorized visit limit, red when expired or exhausted. Compute this from `PriorAuthRecord`'s visit usage vs. limit.
- **+ New Prior Auth** action (page-level, and also reachable from inside a Client Profile / the Pre-Visit Prep panel in §4) opening a form: Authorization Number, Category (Pre-Certification / Referral), linked Insurance, Effective/Expiration Date, authorized visit count.
- Row click → detail drawer, editable, with a delete/restore option.
- Filterable by expiration proximity so staff can proactively catch auths about to run out.

**Reuse:** `progress.tsx` component for the visits-used bar (already specified in the original spec §8.10); `DrawerShell.tsx` for the detail/edit view.

---

## 7. Claim Ownership — Assignment & Saved Views

### 7.1 The gap

`ClaimsList.tsx` has no concept of who owns a claim. Athelas treats this as foundational: **every claim should have an assignee**, so nothing falls through the cracks between billers.

### 7.2 Fix

- Add an `assignedTo` field to the `Claim` type (reference a real team member, reusing the existing team-member record system — see `ManageTeamMember.tsx` — not a free-text name).
- Add an **Assigned To** control on the Claim Detail Drawer (§9) and as a column in `ClaimsList.tsx`.
- Add three default, built-in filtered views at the top of `ClaimsList.tsx`, matching Athelas's exact three:
  - **All Claims** — everything, no filter
  - **Workable Claims** — this org's responsibility, actionable, not deferred (once §10's defer exists)
  - **My Claims** — workable claims assigned to the current logged-in user
- Add a bulk **Assign** action to the existing bulk-action bar (already present for resubmit) so a manager can distribute a batch of unassigned claims at once.

**Reuse:** existing team-member/RBAC identity system for the assignee reference; existing bulk-action bar pattern already built into `ClaimsList.tsx`.

---

## 8. Claim Detail Drawer — Full Depth Rebuild

### 8.1 Why this is the highest-value fix in this whole document

I checked the actual `ClaimDetailDrawer.tsx` code. It currently shows basic claim fields and the AI scrub-suggestion list (which is implemented correctly — keep that part exactly as-is). It has **none** of the following, all of which Athelas treats as the literal definition of what a claim page is: Submissions history, Remittances, Payments, an Activity Feed, Assignment, or Defer. This drawer is the single most-opened screen in the whole module — its thinness is very likely the biggest single contributor to the module feeling incomplete.

Athelas's stated design philosophy is worth adopting outright: **a claim should be one place with everything on it — you should never have to leave the claim to understand what happened to it, or what to do next.**

### 8.2 Required structure

Rebuild `ClaimDetailDrawer.tsx` into four areas, matching the Athelas reference layout conceptually (not visually — use MantraAssist's existing drawer/typography system throughout):

1. **Claim details** (mostly exists) — patient, payer, provider, diagnoses, procedures, editable.
2. **Actions** — primary **Submit/Resubmit** action prominent; secondary menu holds Push to PR, Adjust, Request Appeal, **Defer** (§9), Preview Submission.
3. **Scrub / AI validation** (exists, keep as-is) — this part is already built correctly per the AI governance rule.
4. **Claim Context** — new, and the core of this fix. Four sub-sections:
   - **Status Reason** — why this claim is in its current queue: the denial/rejection/error code, a plain-language description, aggregate dollar amount, per-procedure breakdown. Updates automatically as status changes.
   - **Submissions** — every time this claim was sent, each entry showing what was sent and when; click into one for the CMS-1500/UB-04 form for that specific submission (**reuse** `pdfGenerator.ts`).
   - **Remittances** — the actual payer response data living on the claim itself (do not build a separate top-level Remittances page beyond the existing posting worklist — the *claim-level* remittance detail belongs here, inline, per Athelas's explicit "no separate remittances page" design choice).
   - **Payments** — every payment posted against this specific claim, individually clickable.
5. **Activity Feed** — a single chronological stream mixing system-generated events ("submission sent," "remittance received," "claim assigned to X," "deferred: reason Y") with human comments. **Reuse** `activityEngine.ts` — this can literally be the same underlying event log already used for the client's Activity tab, filtered to this claim's `claimId`, rendered inline in the drawer. Don't build a second logging system.

### 8.3 Event vocabulary to log (extends the original spec's activity event list)

`claim_submitted`, `claim_resubmitted`, `claim_assigned`, `claim_deferred`, `claim_defer_cancelled`, `remittance_received`, `payment_posted_to_claim`, `scrub_suggestion_accepted`, `scrub_suggestion_rejected`.

---

## 9. Defer a Claim — New Action

### 9.1 Spec (adapted from Athelas's documented mechanics)

Add a **Defer** action to the Claim Detail Drawer's action menu (§8.2). On click, open a small form requiring:

- **Reason** — a dropdown of site-specific reasons, with a "+" affordance to add a new one inline. Once created, a reason should not be deletable (matches Athelas's stated rationale: keeps the list meaningful and prevents silent history loss) — reasons are shared across the org, not per-user.
- **Expiration Date** — required, with quick presets (e.g., "1 week," "1 month").

### 9.2 Behavior

- Deferring does **not** change the claim's status — it only hides it from "Workable Claims" / "My Claims" views (§7) until the expiration date passes or the claim's underlying situation changes.
- **Automatically pauses patient-responsibility generation** for that claim's balance while deferred — reuse the existing PR sequencing gate logic from the original spec (§5.6) by adding a `deferredUntil` check to it.
- On expiration: if nothing changed, the claim reappears in the relevant worklist views. Log both the defer and the reappearance to the claim's Activity Feed (§8.3).
- Bulk defer/cancel-defer from the `ClaimsList.tsx` bulk-action bar (reuse the existing bar).
- Re-deferring an already-deferred claim **resets** the expiration date rather than extending it.

---

## 10. Group Worklists by Reason

`DenialBoard.tsx` already clusters by CARC/RARC — that's correct and matches Athelas's most-used pattern (merging failure types into one prioritized, groupable worklist rather than flat lists). `RejectionsWorklist.tsx` does not do this — it's a flat list. Apply the same grouping treatment: group rejections by rejection reason, sortable by count or dollar amount, collapsible groups, so a biller can work the highest-leverage bucket first the same way they already can on the Denial Board.

---

## 11. Patient Balances — From Static List to a Real Collections Tool

### 11.1 The gap

`PatientBalances.tsx` currently has no working actions beyond a link to the client profile. Athelas's Patient Responsibility page has a real Actions menu and a batch-collection tool.

### 11.2 Fix — Actions menu (page-level, top right)

- **Generate Pay Link** — copy a payable link to clipboard (reuse `InvoiceContext.tsx`'s existing `paymentLinkUrl` mechanism, don't build a new one).
- **Miscellaneous Charge** — create a new one-off charge not tied to an existing balance (reuse `CreateInvoiceDrawer.tsx`).
- **Set Up Payment Plan** — new capability; can be scoped simply for v1 (a balance split across N scheduled charges).
- **Download Balance Report** — reuse the existing report/export mechanism (§ original spec 8.12, `ReportDataSource` extension).

### 11.3 Fix — Batch "Charge Saved Cards" tool

A manually-triggered batch action (not automatic/recurring — that's what a Payment Plan is for): filter by minimum/maximum balance (sensible default floor around $20, ceiling around $500 so large balances get a human call first, matching Athelas's stated rationale), select which patients from the filtered list to include/exclude, confirm, and charge all selected saved cards in one action. Show results in a history table afterward. Reuse whatever saved-card-on-file mechanism already exists in `InvoiceContext.tsx`/`RecordPaymentModal.tsx`.

### 11.4 Fix — Cancel vs. Write-Off distinction

Add this rule wherever a balance can be removed (Posting Action Modal, and any "remove balance" action on Patient Balances):

- A balance **your own team created** (a manual charge, or a placeholder collected as estimated PR before adjudication) can be **cancelled outright** — removed as if it never existed.
- A balance **derived from an actual payer remittance** can only be **written off** — it stays as a record, marked as an accepted loss, never fully deleted, because a payer already adjudicated it.

Enforce this at the data level (a `PatientArBalance`/charge should carry a `source: "manual" | "remittance"` flag) so the UI can't offer "Cancel" on a remittance-derived balance.

---

## 12. Billing Rules, Fee Schedule, Credentialing — Make Them Real Config Tools

All three pages are currently fully static (confirmed: zero `onClick` handlers anywhere in `BillingRules.tsx`, `FeeSchedule.tsx`, `CredentialingList.tsx`). Fix, per page:

**`BillingRules.tsx`** — the enable/disable toggle already works and should stay. Add: a working **+ Add Rule** button (the icon is already imported but never placed — wire it up) opening a rule-creation form; row click opens a detail/edit drawer instead of doing nothing.

**`FeeSchedule.tsx`** — add row click → edit drawer (code, description, price, effective date), and an **Add Fee Item** action. Model this directly on `Services.tsx`'s existing pricing-table pattern per the original spec §8.10 — it's structurally the same "code/name/price" shape, reuse rather than reinvent.

**`CredentialingList.tsx`** — add row click → detail drawer showing both `trueCredentialingStatus` and `transactionEnrollmentStatus` clearly as two distinct fields (per original spec §5.8/§8.11 — this distinction is the entire value of the feature, don't collapse it into one status). Add an edit affordance and an **Add Credentialing Record** action.

---

## 13. Chrome & Consistency

### 13.1 PageHeader is imported everywhere, used nowhere

Every existing MantraAssist page (`Clients.tsx`, `Deals.tsx`) uses the shared `PageHeader` component — title, subtitle, badge slot, actions slot (typically a "How this works" button). All 16 RCM pages hand-built their own header markup instead, even where `PageHeader` is imported. **Replace every hand-built header in `src/app/pages/rcm/*.tsx` with the actual `<PageHeader>` component**, matching the pattern already established in `Clients.tsx`.

### 13.2 Dead help button

`RevenueOverview.tsx` builds a complete `HowItWorksModal` with real content but never renders a button to open it (`setShowHelp(true)` is called nowhere). Fix by placing a `HowItWorksButton` in the new `PageHeader`'s actions slot (per §13.1), matching the exact pattern in `Clients.tsx`.

### 13.3 Apply the same "How This Works" pattern to every new worklist

Per the original spec §6, every new worklist should ship with a `HowItWorksContext`/`HowItWorksModal` entry. Audit all 16 pages and add one where missing, using the `PageHeader` actions slot now that it's actually being used (§13.1).

---

## 14. Invoicing Reconnection

`CreateInvoiceDrawer.tsx` only gained a one-way "Import Adjudicated Balance into line items" banner — it never writes `claimId`/`encounterId` back onto the created `ClientInvoice`, so an invoice generated this way still has no link back to its originating claim. Fix:

- When an invoice is created from a claim/balance, set `claimId` and `encounterId` on the resulting `ClientInvoice` (fields already exist in `invoiceTypes.ts` per the original spec §5.6 — they're just never populated).
- Add a **"View Claim"** affordance on `InvoiceDetailDrawer.tsx` and in the `Invoices.tsx` list whenever `claimId` is present, deep-linking to the Claim Detail Drawer (§8).

---

## 15. Open Product Decision — Multiple Insurance "Cases" per Patient

Athelas structures everything around a **Case** — a patient's visit is tied to a specific case (e.g., "regular visits" vs. "auto-accident, workers' comp"), and each case can carry different insurance and priority. Our current model (§2) assumes one patient = one active insurance record. **Decide now, don't retrofit later:** do any of your target clinics see patients under two simultaneously active coverage situations (the classic case is an auto-accident claim running alongside a patient's regular insurance)? If yes, flag it now so §2's data model gets a `cases: InsuranceCase[]` structure instead of a flat field set before more is built on top of it. If no, v1 stays as specified in §2 and this is simply logged as a known, deliberate scope limit.

---

## 16. File-by-File Punch List

| File | What changes |
|---|---|
| `src/app/pages/Appointments.tsx` | Add `clientId` to `Appointment`; remove synthetic-ID fallback in encounter trigger |
| `src/app/components/appointments/ScheduleAppointmentDrawer.tsx` | Ensure real client selection writes `clientId` onto the appointment |
| `src/lib/rcmStore.ts` | Regenerate all seed data from `getClientList()`; remove hardcoded fictional patients |
| `src/app/pages/ClientProfile.tsx` | Remove `clientName` matching fallback; add editable Insurance section (§2) |
| `src/app/components/appointments/AppointmentCard.tsx` | Remove `clientName` matching; expand eligibility badge into Pre-Visit Prep panel (§4) |
| `src/app/pages/rcm/EligibilityWorklist.tsx` | Remove `clientName` matching; add row-click detail drawer (§5) |
| `src/app/pages/rcm/DenialBoard.tsx` | Remove `clientName` matching (data now real via §1) |
| `src/app/pages/rcm/PatientBalances.tsx` | Remove `clientName` matching; add Actions menu, batch charge tool, cancel/write-off distinction (§11) |
| `src/app/pages/rcm/PriorAuthList.tsx` | Add traffic-light tracking, add/edit drawer, + New action (§6) |
| `src/app/pages/rcm/BillingRules.tsx` | Wire up existing unused "+" icon into a working Add Rule flow; add edit drawer (§12) |
| `src/app/pages/rcm/FeeSchedule.tsx` | Add edit drawer + Add Fee Item, modeled on `Services.tsx` (§12) |
| `src/app/pages/rcm/CredentialingList.tsx` | Add edit drawer + Add Credentialing Record, keep two-status distinction visible (§12) |
| `src/app/pages/rcm/ClaimsList.tsx` | Add Assigned To column, three default views (All/Workable/My Claims), bulk Assign action (§7) |
| `src/app/pages/rcm/RejectionsWorklist.tsx` | Add group-by-reason clustering to match Denial Board (§10) |
| `src/app/components/rcm/ClaimDetailDrawer.tsx` | Full depth rebuild — Claim Context (Status Reason, Submissions, Remittances, Payments), Activity Feed, Assignment control, Defer action (§8, §9) |
| `src/app/pages/rcm/RevenueOverview.tsx` | Replace hand-built header with `PageHeader`; wire the orphaned help button (§13) |
| *(all files in)* `src/app/pages/rcm/*.tsx` | Replace hand-built headers with `<PageHeader>` (§13.1) |
| `src/app/components/invoices/CreateInvoiceDrawer.tsx` | Write `claimId`/`encounterId` onto created invoices when sourced from a claim (§14) |
| `src/app/components/invoices/InvoiceDetailDrawer.tsx` | Add "View Claim" link when `claimId` is present (§14) |
| `src/app/pages/Invoices.tsx` | Surface claim link in list view when present (§14) |
| New: `src/app/pages/rcm/InsuranceIntake.tsx` | New worklist page (§3) |
| `src/app/components/rcm/RevenueCycleSubnav.tsx` | Add Insurance Intake entry under Daily Work (§3) |
| `src/app/types/rcmTypes.ts` | Add `assignedTo` to `Claim`; add `deferredUntil`/`deferReason` to `Claim`; add `source: "manual" \| "remittance"` to `PatientArBalance`; add insurance case flag per §15 decision |

---

## 17. Verification Checklist for This Pass

1. **Open a real client** (e.g., James Wilson) → their Billing & Insurance tab shows real, populated claims/balance/eligibility — not empty, not phantom data.
2. **Add insurance to a client with none** via the new Insurance section → they disappear from the Insurance Intake worklist and become eligible for a real eligibility check.
3. **Complete a real appointment** end to end → confirm the resulting Encounter/Claim carries the *real* `clientId`, visible correctly on that client's profile.
4. **Open any Claim** → confirm Submissions, Remittances, Payments, and Activity Feed all show real, claim-specific data, and that assigning it to a team member and deferring it both work and both log to the feed.
5. **Click every row** on Billing Rules, Fee Schedule, Prior Auth, Credentialing, Patient Balances — confirm each now opens something.
6. **Every RCM page header** matches the visual pattern of `Clients.tsx`'s header, including a working "How this works" button.
7. Create an invoice from a claim balance → confirm `InvoiceDetailDrawer.tsx` shows a working "View Claim" link back to the source claim.
