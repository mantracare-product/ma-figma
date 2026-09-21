# PRD: Mantra AI Receptionist
**Product:** Kiosk / Tablet Avatar Receptionist for MantraCare
**Owner:** Product (Navodya) | **Status:** Draft v1 | **Audience:** Product, Design, Engineering, Antigravity (AI build agent)

> Working name: **Mantra Reception** (rename freely).

---

## 1. Summary

Mantra Reception is a **separate product** that lives on a kiosk or tablet at the hospital/clinic front desk. A patient interacts with an on-screen **AI avatar** (voice + touch) to check in, book appointments, and be guided through their visit. It has **no data of its own**: **MantraAssist (MA) is the single source of truth** for clients, appointments, processes, services, providers, and users. Reception reads from and writes to MA, and the same user accounts/organizations work in both products.

**Phase 1 focus:** Appointment booking + Queue management.
**Later:** Patient queries (FAQ / KB), billing routing.

## 2. Problem

- Front desks are bottlenecks: patients queue just to check in, ask "where do I go next", or book a slot.
- MA already captures leads via AI calls and schedules appointments, but the **on-site journey is invisible** once the patient walks in.
- Walk-ins bypass the CRM entirely, so no client record or journey is created.
- Patients don't know their stage (doctor, pharmacy, tests) or expected wait, leading to crowding and repeated staff interruptions.

## 3. Goals & Non-Goals

### Goals
1. Patient can self check-in in under 30 seconds.
2. Walk-ins are booked and **always** created as clients in MA.
3. Every visit is tracked as a **journey of stages** (Check-in > Doctor > Complete > Pharmacy > Tests) visible in MA.
4. Staff can see and manage live queues per station (doctor room, pharmacy, lab).
5. Reception is guided by MA **Processes**, so admins configure journeys without code.

### Non-Goals (Phase 1)
- Billing/payment collection at kiosk
- Clinical data capture (vitals, SOAP) at kiosk
- Insurance eligibility flows
- Replacing the human front desk (fallback to staff always available)

## 4. Users & Personas

| Persona | Need |
|---|---|
| **Patient (scheduled)** | Check in fast, know where to go and how long to wait |
| **Patient (walk-in)** | Book a slot without talking to staff |
| **Front desk staff** | See queue, override, help stuck patients |
| **Doctor / Pharmacy / Lab associate** | See who is next, call next, mark stage complete |
| **Admin / PM** | Configure journeys, stations, kiosk devices; view analytics |

## 5. The Two Journeys

### Journey A: MA-originated (scheduled)
```
MA: Client created via call
 -> Process 1: Outbound AI call (enquiry -> consultation)
 -> Process 2: Appointment scheduled
 -> Process 3: "Reception-connected" flag ON (queue management enabled)
 -> Patient arrives at hospital
 -> Kiosk check-in (phone+OTP / QR / search)
 -> Stage 1: Check-in complete, token issued
 -> Stage 2: Doctor consultation
 -> Stage 3: Appointment complete
 -> Stage 4: Pharmacy (and/or Tests)
 -> Journey closed
```
Each Process can contain **multiple sub-processes/stages** that Reception guides the patient through.

### Journey B: Walk-in
```
Patient at kiosk -> "I don't have an appointment"
 -> Collect name, phone (OTP verify), reason for visit
 -> Match existing MA client by phone; else CREATE client in MA
 -> Show available services/doctors/slots (from MA)
 -> Book appointment (writes to MA)
 -> Attach the same journey template (Reception-connected)
 -> Token issued -> same stages as Journey A
```
**Rule:** Everything the kiosk does must appear in MA (client, appointment, journey stages, activity feed).

## 6. Functional Requirements

### 6.1 Kiosk / Tablet App
| ID | Requirement | Priority |
|---|---|---|
| K-1 | Idle/attract screen with avatar greeting; tap or voice wake | P0 |
| K-2 | Language select (EN, HI at minimum; extensible) | P0 |
| K-3 | Two entry options: "I have an appointment" / "I'm a walk-in" | P0 |
| K-4 | Check-in via phone number + OTP | P0 |
| K-5 | Check-in via QR code (sent in SMS/WhatsApp confirmation) | P1 |
| K-6 | Fallback: name + DOB search, or "Call staff" button | P1 |
| K-7 | Walk-in booking: collect details, choose service/doctor/slot, confirm | P0 |
| K-8 | Token screen: token number, station, estimated wait, print/SMS option | P0 |
| K-9 | "Where do I go next" guidance after each stage change | P0 |
| K-10 | Avatar voice guidance (TTS) with touch as always-available fallback | P1 |
| K-11 | Free-form voice conversation for booking | P2 (Phase 3) |
| K-12 | Session auto-timeout (60s inactivity), no PHI left on screen | P0 |

### 6.2 Queue Management
| ID | Requirement | Priority |
|---|---|---|
| Q-1 | Queue per **Station** (doctor room, pharmacy counter, lab) | P0 |
| Q-2 | Token generation, FIFO with priority overrides (elderly, emergency, appointment-time-aware) | P0 |
| Q-3 | Staff **Queue Console**: call next, skip, recall, mark complete, transfer | P0 |
| Q-4 | Public **Display Board** (TV): token numbers only, no patient names | P1 |
| Q-5 | Estimated wait time (rolling average of stage durations) | P1 |
| Q-6 | Auto-advance patient to next stage per journey template | P0 |
| Q-7 | SMS/WhatsApp "you're next" notification | P2 |
| Q-8 | No-show handling and re-queue rules | P1 |

### 6.3 Journey Engine (driven by MA Processes)
| ID | Requirement | Priority |
|---|---|---|
| J-1 | In MA Process builder, add a toggle **"Connect to AI Receptionist"** on a process | P0 |
| J-2 | Reception-connected process defines ordered **Stages**, each mapped to a Station | P0 |
| J-3 | Stage types: Check-in, Consultation, Tests, Pharmacy, Custom | P0 |
| J-4 | Stage transitions logged to MA client Activity Feed | P0 |
| J-5 | Multiple sub-processes per journey (e.g., Consultation + Lab + Pharmacy) | P1 |
| J-6 | Journey templates per service/department | P1 |

### 6.4 MA Changes Required
- Process builder: "Connect to AI Receptionist" toggle + stage-to-station mapping
- New **Stations** and **Kiosk Devices** management screens (Settings)
- Client Profile: "Visit Journey" card showing live stage/timeline
- Appointment: field `receptionEnabled`, `journeyId`, `checkedInAt`
- Activity engine: new event types (see design doc)
- Public API / service layer (see Section 9)

### 6.5 Future Modules (out of Phase 1)
- **Patient queries:** answered from MA Knowledge Base (RAG), escalates to staff
- **Billing routing:** detect billing intent, route to billing counter/queue, show dues from MA invoices

## 7. Success Metrics

| Metric | Target (90 days post-launch) |
|---|---|
| Median check-in time | < 30 s |
| % scheduled patients self check-in | > 60% |
| Walk-ins captured as MA clients | 100% |
| Avg. wait-time reduction at front desk | 30% |
| Kiosk session completion rate | > 80% |
| Staff override/fallback rate | < 20% |

## 8. Privacy, Security, Compliance
- Same auth as MA (SSO / shared JWT); kiosk uses a **device-scoped token** with least privilege
- Kiosk never displays full patient records; only first name + token after OTP
- Public display board: token numbers only
- OTP verification before any data is shown or client created
- Audit log on every read/write from kiosk
- Consent capture for voice recording; configurable retention
- Multi-tenant isolation via existing OrganizationContext model

## 9. Technical Approach (summary; details in design doc)
- Separate app/repo, same stack as MA (React + TS + Vite + Tailwind v4) for reuse of design tokens
- **Assumption/Risk:** the current MA structure uses `localStorage` stores (prototype). Reception is a separate device, so a **shared backend API is required**. Phase 0 must define this contract.
- Voice: Deepgram (STT), ElevenLabs (TTS), LLM (OpenAI/Anthropic) already in MA stack
- Real-time queue updates via WebSocket/SSE

## 10. Phased Delivery Plan

### Phase 0: Foundation (1-2 wks)
- Finalize API contract with MA, device auth, data model
- Create Reception repo scaffolding, shared design tokens
- MA: Stations + Kiosk Devices + "Connect to AI Receptionist" toggle (UI + data)
- **Exit criteria:** Kiosk can authenticate and fetch org, services, doctors, appointments from MA

### Phase 1: MVP: Check-in + Walk-in Booking + Basic Queue (3-4 wks)
- Kiosk: idle, language, two paths, phone+OTP check-in, walk-in booking, token screen
- Client create/match in MA; appointment write to MA
- Queue Console for staff (single stage: Doctor)
- Avatar: static/animated presence with scripted TTS prompts
- **Exit criteria:** Both journeys work end-to-end; every action visible in MA client profile

### Phase 2: Multi-Stage Journey + Live Queues (3 wks)
- Full stages: Check-in > Doctor > Complete > Pharmacy > Tests
- Journey templates from MA Process builder; sub-processes
- Display Board, wait-time estimates, "where next" guidance
- Visit Journey card in MA Client Profile; activity events
- **Exit criteria:** Patient moves through 4 stations with correct auto-routing and MA timeline

### Phase 3: Conversational Avatar (3 wks)
- Real-time voice conversation for booking, reschedule, intent detection
- Multilingual STT/TTS, interruption handling, safe fallback to touch/staff
- QR check-in, SMS/WhatsApp notifications
- **Exit criteria:** >70% of test bookings completed by voice without staff help

### Phase 4: Patient Queries + Billing Routing (3 wks)
- KB-grounded Q&A with escalation
- Billing intent > billing queue; show invoice dues (read-only)
- **Exit criteria:** Query deflection and billing routing measurable in analytics

### Phase 5: Analytics & Scale (ongoing)
- Wait-time analytics, station utilization, no-show trends
- Multi-branch kiosk fleet management, remote config, health monitoring

## 11. Acceptance Criteria (Phase 1, Given/When/Then)
1. **Given** a patient with a scheduled appointment, **when** they enter phone + valid OTP, **then** the kiosk shows their appointment, marks `checkedInAt` in MA, and issues a token.
2. **Given** a walk-in with an unknown phone number, **when** they complete booking, **then** a new client exists in MA, an appointment is created, and a journey is attached.
3. **Given** a walk-in with an existing phone number, **then** no duplicate client is created.
4. **Given** staff clicks "Call next", **then** the token is shown on the display and the patient's stage becomes "In Consultation" in MA.
5. **Given** 60s of inactivity, **then** the session clears and no patient data remains visible.

## 12. Open Questions
1. Avatar: 2D animated, 3D real-time (e.g., streaming avatar vendor), or pre-rendered clips? (Cost/latency trade-off)
2. Kiosk hardware: Android tablet, Windows kiosk, or browser-only?
3. Is there a real MA backend today, or should Phase 0 include building it?
4. OTP provider (SMS/WhatsApp) and cost model?
5. Languages required at launch?
6. Are stations/rooms managed per organization branch or per provider?
7. Printing tokens (thermal printer) needed?

## 13. Risks
| Risk | Mitigation |
|---|---|
| No shared backend (localStorage prototype) | Phase 0 API contract + backend work |
| Voice latency / noisy lobby | Touch-first UX, voice as enhancement |
| Duplicate client records | Phone-based match + dedupe rules |
| Staff resistance | Staff console + easy override |
| PHI exposure in public space | Minimal-display policy, timeouts, privacy screen guidance |
