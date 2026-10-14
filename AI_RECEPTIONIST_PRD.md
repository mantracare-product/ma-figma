# PRD: Mantra AI Receptionist
**Product:** Single-Surface AI Virtual Concierge & Receptionist for MantraCare  
**Status:** Single-Surface Architecture Specification | **Audience:** Product, Design, Engineering

---

## 1. Summary

Mantra AI Receptionist is a single-screen, conversational virtual concierge located at `/reception` on front-desk displays. A patient interacts directly with an on-screen **AI avatar (Aria)** via voice and touch to check in for scheduled visits, register for walk-in consultations, and receive automated queue tokens and room guidance.

**MantraAssist (MA) is the single source of truth** for all clinic entities: clients, appointments, processes, services, providers, and rooms. The AI Receptionist reads from and writes to MA via the unified `IMaClient` contract.

---

## 2. Core Capabilities & User Journeys

### Journey A: Scheduled Patient Check-in
1. Patient arrives at clinic and approaches `/reception`.
2. AI Avatar (Aria) greets patient with contextual speech and subtitle prompts.
3. Patient verifies identity via Phone + OTP (or privacy-preserving Biometric Face Match).
4. System looks up today's scheduled appointment in MA.
5. System confirms check-in, marks appointment status in MA, logs `receptionist_checkin` activity, and issues a formatted queue token (e.g. `D-001`).
6. Aria guides the patient to the assigned consultation room/doctor.

### Journey B: Walk-in Patient Registration & Booking
1. Patient arrives without prior appointment and selects Walk-in.
2. Patient verifies phone number with OTP.
3. If existing client in MA, records are matched; otherwise, a new client is created in MA with `createdVia: 'ai_receptionist'`.
4. Patient selects service/doctor and confirms intake details.
5. System books appointment in MA, assigns the default onboarding process, logs `receptionist_onboarding_completed`, and issues a queue token.
6. Aria announces estimated wait time and consultation room guidance.

---

## 3. Product Architecture

- **Single Surface**: Front-desk interactive screen at `/reception`.
- **Avatar Engine**: Aria avatar with dynamic state management (`idle`, `speaking`, `listening`, `thinking`, `success`, `apologetic`).
- **Data Model**:
  - `Station`: Consultation rooms, pharmacy counters, diagnostic labs, billing desks.
  - `Journey`: Tracks patient progression through clinic stages.
  - `QueueTicket`: Token issuance, priority assignment, status (`waiting`, `called`, `serving`, `completed`).
- **MantraAssist Integration**:
  - MA Settings: AI Reception tab for managing clinic rooms and default onboarding processes.
  - MA Client Profile: Visit Journey card tracking live token, stage advancement, and biometric status.
  - MA Activity Feed: Activity logging (`receptionist_checkin`, `receptionist_onboarding_completed`, `receptionist_face_enrolled`).
