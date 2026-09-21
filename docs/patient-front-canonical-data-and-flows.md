# Patient Front — Canonical Data & Complete Flow Map

**Purpose:** every piece of mock data used anywhere in the app must come from this document. Nothing invented, nothing duplicated with variations. If a screen needs a doctor's name, a date, an amount — it's here. If it's not here, that's a sign the data model or the flow is incomplete, not a reason to make something up.

This complements (doesn't replace) `patient-front-v3-today-first-brief.md` and `patient-front-page-by-page-spec.md`.

---

## Part A — Canonical Data (single source of truth)

### Patient
- **Name:** Ramesh Iyer
- **Age:** 62
- **MRN:** MRN-84920 *(exists for internal/billing use only — never the lead identifier on any patient-facing screen, per prior brief)*
- **Phone:** +91 98765 43210
- **Email:** ramesh.iyer@email.com
- **Emergency contact:** Priya Iyer (Daughter) · +91 98765 11223

### Surgeon — the only doctor in this scenario
- **Name:** Dr. Meera Nair
- **Specialty:** Ophthalmologist
- **Clinic:** Mantra Eye Care

*No other clinician name appears anywhere in the build — not in seed data, not in a fallback, not in a placeholder.*

### The one clinical journey
- **Process:** Cataract Surgery Daycare (`op-cataract`)
- **Stages, in order:** Checked In → Dilation & Drops → Pre-Op Prep → In Surgery → Recovery & Discharge
- **Copy for each stage:** as specified in `patient-front-v3-today-first-brief.md` §2/§4 (patient-voiced for Stages 1–3 and 5, attendant-voiced for Stage 4). Use that copy verbatim — don't re-derive it.

### Appointments — exactly two, ever, in this demo
| ID | Title | Doctor | Date & time | Status | Linked process |
|---|---|---|---|---|---|
| `APPT-001` | Cataract Surgery (Right Eye) | Dr. Meera Nair | Sept 21, 2026 · 9:00 AM | `scheduled` → becomes `arrived` after QR check-in | `op-cataract` |
| `APPT-002` | Post-Op Review | Dr. Meera Nair | Sept 22, 2026 · 10:30 AM | `scheduled` | `op-cataract` (follow-up, no new pipeline) |

No other appointments exist. Past tab is empty for this demo — this patient has no history yet.

### Documents — exactly three
| Type | Title | Detail | Date | Status |
|---|---|---|---|---|
| Prescription | Nuclear Cataract Grade II (Right Eye) | Dr. Meera Nair · `RX-001` | Aug 24, 2026 | Verified |
| Form | General Medical History & Intake | New-patient onboarding | Aug 20, 2026 | Completed |
| Form | Pre-Procedure Eye & Allergy Assessment | Required before Sept 21 surgery | — | Pending |

No lab/imaging documents exist in this demo — this patient hasn't had imaging.

### Billing — exactly one invoice
- **Invoice:** `INV-2026-041` — Cataract Surgery Package
- **Line items:** Surgeon fee $900.00 · OT & anesthesia $650.00 · IOL lens $300.00 → **Subtotal $1,850.00**
- **Insurance adjustment:** –$1,200.00
- **Balance due:** **$650.00**
- **Status before payment:** `sent` / unpaid
- **Status after the payment flow completes:** `paid`, with a receipt (`RCPT-2026-041`) generated

This is the only invoice in the system for this patient. No other charges, no payment history before this one (this is his first payment on the platform).

---

## Part B — Every user flow, enumerated

Each flow below: entry point → steps → data used → end state. Build only these flows for this demo — if a screen implies a flow not listed here, that's scope creep, flag it rather than build it.

### 1. QR Walk-in Check-in
- **Entry:** Patient scans the clinic's entrance QR on Sept 21.
- **Steps:** Instant recognition (matched to `APPT-001` by date/time — no department picker, no process picker, per prior brief) → confirmation screen: *"Checking you in for your cataract surgery today…"* → success.
- **Data used:** `APPT-001` flips from `scheduled` to `arrived`; client is enrolled into `op-cataract` at Stage 1 (Checked In).
- **End state:** Today view now shows live status, Stage 1.

### 2. QR Appointment Check-in (functionally the same flow as #1 in this demo)
- Since this patient only ever has the one same-day surgical appointment to check into, this is not a separate flow from #1 for this demo — don't build two different QR-scanning code paths that do the same thing. (If a future scenario needs a *non-surgery* appointment check-in — e.g. a routine consult with no associated queue — that's a distinct flow to design later, not now.)

### 3. Live Stage Tracking
- **Entry:** Automatic — Today updates as staff move the client's stage in the admin Kanban.
- **Steps:** No patient action required. Cross-window sync (existing `localStorage` + `storage` event mechanism) pushes the update; Today's hero re-renders with the new stage, new headline, new content (per the audience-aware Stage 4 logic).
- **Data used:** Whichever of the 5 canonical stages is current.
- **End state:** Continuous — this flow is "always on" while a visit is active.

### 4. Stage Checklist Completion
- **Entry:** Patient taps a checklist item on the Today hero or stage drawer (Stage 1 only, per canonical stage content — fasting confirmed, attendant present, valuables removed).
- **Steps:** Tap to check off → immediate visual confirmation (checkmark fills) → no confirmation modal needed, this is low-stakes.
- **Data used:** Stage 1's three checklist items, as defined in the v3 brief.
- **End state:** Checklist shows completion count; once all required items are done, no residual "action needed" banner for checklist (separate from consent, see flow 5).

### 5. Digital Consent Signing
- **Entry:** The one blocking "Action Needed" card on Today (per v3 brief — appears only when unsigned) → `Review & sign`.
- **Steps:** Consent text shown in full (the cataract consent language, patient-appropriate) → signature pad → `Sign & Submit` → confirmation.
- **Data used:** The single consent tied to Stage 1 of `op-cataract`.
- **End state:** Action Needed card disappears from Today (per the "only render if something's pending" rule); signature timestamp recorded.

### 6. Intake/Pre-Op Form Completion
- **Entry:** The "needs attention" callout on the Documents page (§3 of the page-by-page spec) → `Start form` (or `Fill out form`, pick one verb and use it everywhere).
- **Steps:** Form fields for the Pre-Procedure Eye & Allergy Assessment → submit → confirmation.
- **Data used:** The one pending form from Part A.
- **End state:** Form moves from "pending" to "completed" in the Documents list; the callout disappears (not duplicated below, per the no-duplication rule).

### 7. Document Upload
- **Entry:** `Upload document` text link on Documents page.
- **Steps:** Pick a file → pick a category (Prescription / Form / Lab result) → confirm → appears in the flat list.
- **Data used:** N/A — this is patient-generated content, not canonical seed data. For demo purposes, one example upload is enough to prove the flow works; don't pre-seed additional uploaded documents.
- **End state:** New row appears in the Documents list, same visual treatment as existing rows — no special "just uploaded" styling needed.

### 8. Book New Appointment
- **Entry:** `Book appointment` button on the Visits page.
- **Steps:** Since this is a single-doctor, single-specialty demo: pick a reason (short list — e.g. "Follow-up," "New concern") → pick date/time from Dr. Nair's available slots → confirm.
- **Data used:** Booking creates a new entry in the same shape as `APPT-001`/`APPT-002`, always with Dr. Meera Nair as the provider (there is no other doctor to pick in this demo — don't build a doctor-selection step that has only one option to choose from; skip straight to date/time).
- **End state:** New row appears on the Visits list; confirmation shown.

### 9. Reschedule Appointment
- **Entry:** `Reschedule` link on an upcoming Visits row.
- **Steps:** Pick a new date/time from availability → confirm → old slot released.
- **Data used:** Whichever of `APPT-001`/`APPT-002` was tapped.
- **End state:** Row updates in place with new date/time; no duplicate row created.

### 10. Cancel Appointment
- **Entry:** Not in scope for this demo's primary flows — do not build a visible "Cancel" action. A same-day surgical appointment isn't something this demo needs to show being cancelled. (If this needs to exist later, it's a deliberate addition, not an assumed default.)

### 11. Bill Payment
- **Entry:** `Pay now` button on the Billing page (only visible because `INV-2026-041` has a balance due).
- **Steps:** Tap `Pay now` → payment method selection (kept simple — one or two realistic options, not a long list) → confirm → success.
- **Data used:** `INV-2026-041`, balance $650.00.
- **End state:** Invoice status flips to `paid`; balance shown becomes `$0.00 — All paid up`; a receipt (`RCPT-2026-041`) is available from the same page (a simple `View receipt` link where `Pay now` used to be — not a whole separate "payment history" page for a single invoice).

### 12. Visit Feedback
- **Entry:** Automatic prompt when the client reaches the final stage (Recovery & Discharge) and the visit is marked complete.
- **Steps:** Simple 1–5 rating + optional comment → submit.
- **Data used:** N/A — patient-generated.
- **End state:** Prompt doesn't reappear once submitted for this visit.

### 13. Profile Edit
- **Entry:** Any field on the Profile page.
- **Steps:** Tap a field → edit inline or via a simple form → save.
- **Data used:** The canonical patient fields from Part A.
- **End state:** Updated value persists and reflects wherever else it's shown (e.g. emergency contact, if ever surfaced elsewhere).

### 14. Cross-Window Staff Sync (not a patient-initiated flow, but must be demonstrable)
- **Entry:** Staff moves the client's stage in the real admin Kanban, in a separate browser window.
- **Steps:** No patient action. This is flow #3 from the staff's side.
- **Data used:** Same canonical stage data.
- **End state:** This is the flow to demo live, side-by-side, to prove the sync works — per the earlier verification requirement.

---

## Part C — What's explicitly NOT a flow in this demo

To prevent scope creep from "flows that could exist": no in-app chat/messaging (confirmed earlier), no multi-doctor selection, no multi-location switching, no family/dependent booking-on-behalf-of, no appointment cancellation, no payment plan/installment flow, no insurance-claim-status flow. If any of these get built without being asked for, that's the exact "nice to have" problem this whole spec exists to prevent.
