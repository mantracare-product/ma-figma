# Design & Technical Blueprint: Mantra AI Receptionist
Companion to `AI_RECEPTIONIST_PRD.md`. Written as build instructions for **Antigravity**.

---

## 0. Instructions for Antigravity (read first)
1. Build Mantra Reception as a **separate app** (`mantra-reception/`), not inside `ma-figma`. Reuse the same stack and design tokens.
2. **MantraAssist is the only source of data.** Never persist patient/appointment data locally beyond in-memory session state.
3. Build **phase by phase** (see PRD Section 10). Do not build Phase N+1 features early.
4. Every write to MA must also produce an **Activity event** on the client.
5. Touch UI must always work without voice. Voice is an enhancement.
6. No PHI on public screens. Follow Section 9 privacy rules.
7. Where the MA API does not exist yet, code against the **interfaces in Section 5** with a mock adapter, and keep the adapter swappable.

---

## 1. Product Surfaces

| Surface | Device | Route | Users |
|---|---|---|---|
| **Kiosk App** | Tablet / kiosk (portrait or landscape) | `/kiosk` | Patients |
| **Display Board** | TV / wall screen | `/display/:stationGroupId` | Public (tokens only) |
| **Queue Console** | Staff desktop/tablet | `/console` | Front desk, doctor, pharmacy, lab |
| **MA Admin additions** | Inside MantraAssist | `/settings/reception`, Process builder, Client Profile | Admin/PM |

## 2. Tech Stack
- React 18 + TypeScript, Vite, Tailwind CSS v4 (share HSL tokens, `Outfit` + `DM Sans`, Lucide icons)
- React Router v7, Framer Motion for avatar/screen transitions
- Data: TanStack Query for MA API + WebSocket/SSE for live queue
- Voice: Deepgram (STT), ElevenLabs (TTS), LLM (OpenAI/Anthropic) for intent (Phase 3+)
- Kiosk mode: PWA, full-screen, wake lock, auto-reload on idle

### Suggested structure
```
mantra-reception/
├── src/
│   ├── main.tsx
│   ├── app/
│   │   ├── App.tsx, routes.tsx
│   │   ├── context/        # DeviceContext, SessionContext, ThemeContext, LanguageContext
│   │   ├── kiosk/          # screens + flow state machine
│   │   │   ├── screens/    # Idle, Language, Choose, CheckIn, Otp, Appointment,
│   │   │   │               # WalkInDetails, ServiceSelect, SlotSelect, Confirm,
│   │   │   │               # Token, NextStep, Help
│   │   │   ├── flows/      # checkinFlow.ts, walkinFlow.ts (XState or reducer)
│   │   │   └── components/ # Avatar, SubtitleBar, BigButton, NumPad, TokenCard
│   │   ├── console/        # QueueBoard, StationQueue, PatientCard, CallNext
│   │   ├── display/        # TokenBoard
│   │   └── components/ui/  # shared primitives
│   ├── lib/
│   │   ├── api/            # maClient.ts, adapters (real + mock)
│   │   ├── queueEngine.ts  # token, priority, wait estimate
│   │   ├── journeyEngine.ts# stage transitions from MA process definition
│   │   ├── voice/          # stt.ts, tts.ts, intent.ts (Phase 3)
│   │   └── i18n/           # en.json, hi.json
│   └── types/
```

## 3. Concept Model

```
Organization ─┬─ Station (Doctor Room 1, Pharmacy, Lab...) 
              ├─ KioskDevice
              └─ Process (MA) ── Stage[] ── mapped to Station
Client ── Appointment ── Journey (instance of Process) ── JourneyStage[] ── QueueTicket
```

- A **Process** in MA gets `receptionEnabled: true`. Its ordered **Stages** each map to a **Station**.
- When an appointment tied to such a process is checked in, a **Journey** instance is created.
- Each active stage produces a **QueueTicket** at that stage's Station.

## 4. Data Model (TypeScript)

```ts
type StageType = 'checkin' | 'consultation' | 'tests' | 'pharmacy' | 'custom';

interface Station {
  id: string; orgId: string; name: string;
  type: 'doctor_room' | 'pharmacy' | 'lab' | 'billing' | 'desk';
  providerId?: string; active: boolean;
}

interface KioskDevice {
  id: string; orgId: string; name: string; location: string;
  language: string[]; status: 'online' | 'offline'; lastSeenAt: string;
}

interface ProcessStageDef {          // lives on MA Process
  id: string; order: number; type: StageType; label: string;
  stationId: string; autoAdvance: boolean;
}

interface Journey {
  id: string; clientId: string; appointmentId?: string; processId: string;
  source: 'scheduled' | 'walk_in';
  status: 'active' | 'completed' | 'cancelled' | 'no_show';
  currentStageId: string; startedAt: string; completedAt?: string;
}

interface JourneyStage {
  id: string; journeyId: string; stageDefId: string;
  status: 'pending' | 'waiting' | 'in_progress' | 'completed' | 'skipped';
  enteredAt?: string; startedAt?: string; completedAt?: string;
}

interface QueueTicket {
  id: string; orgId: string; stationId: string; journeyStageId: string;
  tokenLabel: string;               // e.g. "D-042"
  priority: 0 | 1 | 2;              // 0 normal, 1 appointment-late/elderly, 2 urgent
  status: 'waiting' | 'called' | 'serving' | 'done' | 'no_show';
  estimatedWaitMin?: number; createdAt: string;
}
```

### MA schema additions
- `Appointment`: `receptionEnabled`, `journeyId`, `checkedInAt`, `source`
- `Process`: `receptionEnabled`, `stages: ProcessStageDef[]`
- `Client`: `phoneVerifiedAt`, `createdVia: 'call' | 'kiosk' | ...`
- New activity types: `kiosk_checkin`, `kiosk_walkin_created`, `journey_stage_entered`, `journey_stage_completed`, `token_issued`, `token_called`

## 5. API Contract (MA service layer)

All calls authenticated with a **device token** (kiosk) or **user JWT** (console). Provide a mock adapter first.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/reception/auth/device` | Exchange device key for scoped token |
| POST | `/reception/otp/send` `/verify` | Phone OTP |
| GET | `/reception/clients/lookup?phone=` | Match client (returns minimal fields) |
| POST | `/reception/clients` | Create walk-in client |
| GET | `/reception/appointments?clientId=&date=today` | Today's appointments |
| GET | `/reception/services` `/providers` `/slots?serviceId=&date=` | Booking data |
| POST | `/reception/appointments` | Book appointment |
| POST | `/reception/appointments/:id/checkin` | Check-in; creates Journey + first ticket |
| GET | `/reception/queue?stationId=` | Live queue |
| POST | `/reception/tickets/:id/call` `/serve` `/complete` `/skip` `/transfer` | Staff actions |
| GET | `/reception/journeys/:id` | Journey state for "where next" |
| WS | `/reception/stream?orgId=` | Live ticket/journey events |

**Rules:** lookup returns only first name + masked phone until OTP verified. Client dedupe by normalized phone + org.

## 6. Kiosk UX Design

### 6.1 Layout principles
- **Avatar zone** (top ~35%): animated avatar with subtitle bar (always captioned)
- **Action zone** (bottom ~65%): large touch targets (min 64px), max 2 primary actions per screen
- Persistent footer: Language toggle, "Need help? Call staff", progress dots
- High contrast, 18px+ base text, works for elderly users; landscape and portrait responsive
- Reuse MA HSL tokens; brand accent from `ThemeProvider`

### 6.2 Avatar behavior
States: `idle`, `greeting`, `listening`, `thinking`, `speaking`, `success`, `apologetic`.
Phase 1: pre-rendered/2D animated avatar with scripted TTS lines. Phase 3: real-time lip-sync + streaming voice. Avatar must never be the only way to complete a step.

### 6.3 Screen flows

**Scheduled check-in**
`Idle -> Language -> Choose(Have appointment) -> Enter phone -> OTP -> Pick appointment (if >1) -> Confirm details -> Token -> NextStep`

**Walk-in**
`Idle -> Language -> Choose(Walk-in) -> Phone -> OTP -> [existing client? welcome back : Name/Age/Gender/Reason] -> Service/Doctor -> Slot -> Confirm -> Token -> NextStep`

**Post-visit guidance (kiosk re-scan or SMS link)**
`Scan token/QR -> NextStep (Go to Pharmacy, Counter 2, ~8 min)`

### 6.4 Token screen
Big token (e.g. **D-042**), station name and direction, estimated wait, "Send to my phone" and "Print" actions, auto-return to idle in 20s.

### 6.5 Error/edge states
OTP fail x3 -> staff help; no appointment found -> offer walk-in; slot taken -> refresh options; network down -> offline banner + "Please see front desk"; late arrival -> priority rule + notice.

## 7. Queue Console & Display Board

**Console:** tabs per Station; columns Waiting / Called / Serving; row actions Call, Recall, Skip, Transfer, Complete; priority badge; walk-in vs scheduled tag; search by token/name; live via WebSocket.

**Display board:** large "Now Serving" + "Next" tokens per station, chime on call, no names, auto-refresh.

## 8. State Machines (implement explicitly)

**Kiosk session:** `idle > language > mode > identify > verify > (select|book) > confirm > token > done`, with `timeout`, `help`, `error` transitions from any state.

**Journey stage:** `pending > waiting > in_progress > completed` (`skipped` allowed). On `completed`, `journeyEngine` activates the next stage, creates its ticket, and emits the guidance event.

**Queue ordering:** sort by `priority desc`, then scheduled-time-aware, then `createdAt asc`. Wait estimate = rolling average stage duration x people ahead (per station).

## 9. Privacy & Security Implementation
- Device token scoped to kiosk endpoints only; rotate and revoke from MA settings
- No PHI in URL, logs, analytics, or display board
- Session data in memory only; cleared on timeout/done
- OTP required before showing appointments or creating client
- Audit every kiosk action with deviceId, timestamp, clientId
- Voice recordings off by default; consent screen if enabled

## 10. MA-side UI Changes
1. **Process builder:** toggle *Connect to AI Receptionist* > reveals Stage list (drag to reorder), each with Type + Station + Auto-advance
2. **Settings > Reception:** Stations CRUD, Kiosk Devices (register, key, status), Token prefixes, priority rules, languages
3. **Client Profile:** *Visit Journey* card (stage stepper, timestamps, current station, token)
4. **Appointments:** badge "Reception enabled", show `checkedInAt`
5. **Activity feed:** render new event types

## 11. Phase Build Checklist for Antigravity

**Phase 0:** scaffold app, tokens, `maClient` + mock adapter, device auth, Stations/Devices/Process toggle in MA.
**Phase 1:** kiosk screens & both flows, OTP, client match/create, booking, check-in, token, Queue Console (Doctor station), activity events, timeout, EN/HI strings.
**Phase 2:** journeyEngine multi-stage, sub-processes, Display Board, wait estimates, NextStep screen, Visit Journey card.
**Phase 3:** voice pipeline (STT/TTS/intent), conversational booking, QR check-in, notifications.
**Phase 4:** KB Q&A with escalation, billing intent routing and invoice dues (read-only).
**Phase 5:** analytics dashboards, fleet management.

## 12. Definition of Done (per phase)
- All acceptance criteria in PRD met
- Every kiosk action visible in MA client activity
- No PHI on public surfaces (verified checklist)
- Works offline-degraded with clear staff fallback
- Accessibility: keyboard/touch, contrast AA, captions on all avatar speech
- Mock adapter and real adapter share the same interface tests
