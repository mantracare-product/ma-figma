# Patient Front — Product Scope & Requirements

**Status:** Scoping complete, ready for prototype build
**Owner:** Product
**Companion to:** MantraAssist RCM (admin product)

---

## 1. What this is

MantraAssist today is an admin-only product: staff manage patients through Processes (pipelines) made of Stages, run appointments, billing, forms, and AI-assisted intake — all from a dashboard. **Patient Front** is the patient-facing mirror of that same engine: a webapp where the patient checks into a clinic, tracks their own progress through a pipeline in real time, books appointments, and accesses their own records — all reading and writing the *same* Process/Stage/Client data model the admin app already uses. Nothing new is invented at the data layer; this is a new window into the existing engine, scoped to one patient.

**Not in scope for this round:** in-app chat/messaging (stays on WhatsApp/SMS/phone, per decision), cross-org unified identity (designed for, not built), OTP/real auth (hardcoded demo patient for now).

---

## 2. Architecture decisions

| Decision | Resolution |
|---|---|
| **Where it lives** | Subpage inside the existing MantraAssist repo — `/patient-front` — not a separate deployment. This means it shares `sessionStorage`-backed stores (`useProcessStore`, `clientProcessState`, etc.) with the admin app directly, same-origin. This is what makes "admin creates a process → patient view reflects it" work live in the prototype with zero extra backend. |
| **Patient identity (long-term design)** | Design toward a phone-number-keyed **master patient identity** layer that can later map to multiple per-org client records (Master Patient Index pattern), without changing the admin backend's org-siloed client model. This is a design intent for the auth layer when it's built — not built in this round. |
| **Patient identity (demo)** | Hardcoded demo patient. No login/OTP flow in this round. |
| **Multi-org (cross-clinic)** | Out of scope for this demo — MantraAssist has no live customers yet, so there's no legacy constraint to accommodate. Single-org, multi-department is the demo's proof point. |
| **Multi-department within one hospital** | Already solved by the existing data model — one Organization, many Processes, one Client record with `processStages[]`. No new mechanism needed. |

---

## 3. Data model additions needed (on top of existing admin model)

These extend `Process` / `Stage`, they don't replace anything:

1. **`Process.pipelineType`**: `'OPD' | 'IPD' | 'Operation'` (extensible enum). Drives how the patient-front renders that pipeline — queue tracker vs. multi-day stay timeline vs. procedure checklist.
2. **Patient-facing Stage content**, keyed per **(Process, Stage)** combination — not per generic stage name, since "Pre-Op" means something different in a Cataract pipeline vs. a Hip Replacement pipeline. Each entry supports:
   - Informational content (text/instructions/media)
   - Checklist items (e.g. "confirm fasting since midnight")
   - Consent capture (e-signature/acknowledgment)
   - Document upload requests
   - Authored from the admin side, likely as an extension of the existing Process Settings / Stage config UI (possibly reusing the same "attach content to a stage" pattern already used for AI Knowledge Base docs).
3. **Appointment ↔ QR linkage**: a personal-appointment QR (sent via SMS/WhatsApp ahead of a booked visit) must resolve to an existing `Appointment` record and flip it from `Scheduled` → `Arrived`, rather than creating a fresh queue entry.
4. **Visit feedback**: simple rating + comment, captured on a `Process`/visit closing out.

No changes needed to `Client.processStages[]` — it already supports concurrent multi-pipeline membership.

---

## 4. Navigation / IA

Tabs for the demo:

- **Home** — active pipeline card(s); one card per concurrent active process (e.g. separate cards for Ophthalmology and Obs-Gynae if both active same visit), each showing current stage + stage-specific content/checklist/consent
- **Appointments** — book new, view upcoming, reschedule/cancel
- **Records** — prescriptions (AI Scribe output), lab reports, uploaded documents
- **Billing** — invoices, outstanding balance, pay, payment history
- **Forms** — pending intake/consent forms assigned to the patient
- **Profile** — own details, dependents/family

*Explicitly excluded:* a Chat tab. Messaging stays on WhatsApp/SMS/phone; Patient Front is status + records + booking, not a conversation surface.

---

## 5. Core flows

### 5.1 Entrance QR (walk-in, unscheduled)
Patient scans a general clinic-entrance QR → self-selects department/reason (or QR is pre-scoped to a department/counter) → system maps selection to a `Process` → enrolls patient at Stage 1. If the patient is **already active** in that process today, they're redirected straight to their existing live status — no duplicate enrollment.

### 5.2 Personal appointment QR (pre-booked)
Patient scans a QR sent ahead of a booked appointment → matches the existing `Appointment` record → moves it to `Arrived` → enrolls into the linked process at Stage 1 (or wherever the appointment's flow begins).

### 5.3 Live stage tracking
As staff move the client's stage in the admin Kanban, the Home card updates live (same-origin store read). Rendering adapts by `pipelineType`:
- **OPD** → queue/stage tracker (status-based, not exact numeric position — avoids the bad experience of showing a position that gets overtaken by priority reordering)
- **IPD** → multi-day stay timeline
- **Operation** → procedure checklist view

### 5.4 Stage-specific content
At each stage, the patient sees whatever the org authored for that exact Process+Stage — instructions, checklist to confirm, consent to sign, documents to upload — surfaced directly on the active pipeline card.

### 5.5 Visit close-out
When a process/visit completes, prompt a simple rating + comment.

---

## 6. Open items (flagged, not yet resolved — revisit before build sign-off)

- **Caregiver/dependent booking mechanics**: Profile supports dependents — but the actual flow for booking/checking in *on behalf of* someone else (pediatric, elderly, unconscious patients) needs its own pass.
- **Notification triggers**: since in-app chat is out, how does the patient get proactively notified of a stage change if they've left the app (push? SMS, reusing existing automation engine?).
- **Consent/data governance**: once the master identity layer is actually built (not this round), need an explicit answer on whether cross-org linkage is automatic on phone match or requires patient confirmation per clinic.
- **Content authoring UI**: where in the admin does staff author per-Process+Stage patient content — new tab in Process Settings, or extend the existing Stage config drawer?
- **IPD "stay" representation**: room/bed assignment, multi-day timeline granularity — needs its own design pass, not just a checklist-style Stage card.

---

## 7. Scope tiers

**This round (demo):** Home (multi-pipeline cards, QR-driven, live stage tracking with per-pipeline-type rendering, stage content incl. checklist/consent/upload), Appointments, Records, Billing, Forms, Profile, visit feedback.

**Explicitly deferred:** in-app chat, real auth/OTP, cross-org master identity build-out, IPD stay/room detail design, caregiver-on-behalf-of flow detail, push notification build.
