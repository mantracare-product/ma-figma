# MantraAssist x Phorest API Integration: Product Requirements Document (PRD) & Technical Specification

**Document Version:** 1.0.0  
**Target Audience:** Engineering, Telephony/Voice AI Team, Backend Developers, QA  
**Status:** Approved for Implementation  
**Last Updated:** November 2026  

---

## 1. Executive Summary & Objective

This document specifies the technical design, system architecture, API contracts, and telephony call flows required to integrate **MantraAssist AI Receptionist** with **Phorest Salon & Clinic Management Software**.

The integration enables MantraAssist to act as an autonomous 24/7 AI front-desk receptionist for clinics using Phorest. The AI agent will directly handle inbound voice calls, perform real-time scheduling actions in Phorest, answer clinic-specific FAQs, capture qualified leads, and triage emergency calls with automated call transfer.

---

## 2. Requirement Traceability Matrix

| ID | Requirement | Primary Tech Component | Phorest API Endpoint / External Service |
|:---|:---|:---|:---|
| **REQ-1** | Answer all incoming calls | MantraAssist Telephony Gateway + Voice Agent | Twilio / Exotel / Zadarma SIP Trunk + Realtime Audio |
| **REQ-2** | Book appointments | AI Function Calling (`book_appointment`) | `POST /appointments/availability`<br>`POST /client`<br>`POST /branch/{branchId}/booking` |
| **REQ-3** | Cancel appointments | AI Function Calling (`cancel_appointment`) | `GET /branch/{branchId}/appointment`<br>`POST /branch/{branchId}/booking/{bookingId}/cancel` |
| **REQ-4** | Reschedule appointments | AI Function Calling (`reschedule_appointment`)| `POST /appointments/availability` (`rescheduleBookingId`)<br>`PUT /appointment/{appointmentId}` |
| **REQ-5** | Answer FAQs | MantraAssist Prompt Engine & Knowledge Base | Local clinic vector/FAQ store + injected clinic profile |
| **REQ-6** | Provide clinic timings | AI Knowledge Retrieval + Schedule Sync | `GET /branch/{branchId}/staff-work-timetables`<br>`GET /business/{businessId}/branch` |
| **REQ-7** | Provide directions | Voice recitation + SMS/WhatsApp Dispatch | `GET /business/{businessId}/branch`<br>Twilio SMS / WhatsApp API (Google Maps Link) |
| **REQ-8** | Collect lead info | AI Function Calling (`capture_lead`) | `POST /business/{businessId}/branch/{branchId}/leads` |
| **REQ-9** | Transfer urgent calls | Telephony Call Control / SIP Refer | Twilio `<Dial>` / SIP REFER to designated clinic triage line |

---

## 3. High-Level Architecture & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Caller as Patient / Caller
    participant Carrier as Telephony Carrier (Twilio/SIP)
    participant VoiceEngine as MantraAssist AI Voice Engine
    participant Adapter as Phorest Integration Service
    participant Phorest as Phorest Cloud API (EU / US Gateway)
    participant ClinicStaff as Clinic Front Desk / Emergency Line

    Caller->>Carrier: Dial Clinic Phone Number
    Carrier->>VoiceEngine: Inbound Call Webhook (Audio Stream / WebSocket)
    VoiceEngine->>Caller: "Hello, thank you for calling [Clinic Name]. How can I help you today?"

    alt Appointment Booking
        Caller->>VoiceEngine: "I'd like to book a consultation for next Tuesday morning."
        VoiceEngine->>Adapter: check_availability(serviceId, dateRange)
        Adapter->>Phorest: POST /branch/{branchId}/appointments/availability
        Phorest-->>Adapter: Available Slots List
        Adapter-->>VoiceEngine: Formatted slots (e.g. 10:00 AM, 11:30 AM)
        VoiceEngine->>Caller: "We have 10:00 AM or 11:30 AM with Dr. Smith. Which works best?"
        Caller->>VoiceEngine: "10:00 AM works."
        VoiceEngine->>Adapter: book_appointment(callerName, phone, serviceId, slot)
        Adapter->>Phorest: POST /client (find-or-create) + POST /booking
        Phorest-->>Adapter: 201 Created (bookingId, appointmentId)
        VoiceEngine->>Caller: "You're all booked for Tuesday at 10:00 AM! A confirmation text was sent."
    else Reschedule or Cancel
        Caller->>VoiceEngine: "I need to cancel my appointment tomorrow."
        VoiceEngine->>Adapter: lookup_appointments(callerPhone)
        Adapter->>Phorest: GET /appointment?client_id={id}&from_date={today}
        Phorest-->>Adapter: Active appointments list
        VoiceEngine->>Caller: "I see your consultation tomorrow at 2:00 PM. Would you like me to cancel this?"
        Caller->>VoiceEngine: "Yes, please cancel it."
        VoiceEngine->>Adapter: cancel_booking(bookingId)
        Adapter->>Phorest: POST /branch/{branchId}/booking/{bookingId}/cancel
        Phorest-->>Adapter: 200 OK
        VoiceEngine->>Caller: "Your appointment has been successfully cancelled."
    else Lead Capture
        Caller->>VoiceEngine: "Do you offer pricing for dental implants?"
        VoiceEngine->>Caller: Explains base pricing & asks: "Would you like our treatment coordinator to follow up with details?"
        Caller->>VoiceEngine: "Yes, my name is Alex Doe and my number is this one."
        VoiceEngine->>Adapter: create_lead(Alex, Doe, phone, "Inquired about dental implants")
        Adapter->>Phorest: POST /branch/{branchId}/leads
        Phorest-->>Adapter: 201 Created
    else Urgent Triage / Transfer
        Caller->>VoiceEngine: "I'm having severe pain and bleeding after my procedure!"
        VoiceEngine->>Caller: "I understand this is urgent. Please hold while I connect you to our medical team immediately."
        VoiceEngine->>Carrier: Execute Call Transfer (<Dial> to Emergency Forwarding Number)
        Carrier->>ClinicStaff: Connect Live Call
    end
```

---

## 4. Phorest API Connectivity Specifications

### 4.1 Base URLs
Phorest routes requests based on the physical jurisdiction of the clinic:
* **North America (US / Canada) & Australia:** `https://api-gateway-us.phorest.com/third-party-api-server`
* **United Kingdom & Europe:** `https://api-gateway-eu.phorest.com/third-party-api-server`

### 4.2 Authentication
* **Method:** HTTP Basic Authentication (`Authorization: Basic <base64(username:password)>`)
* **Username Convention:** Issued by Phorest, typically formatted with a namespace (e.g. `global/integration_user@domain.com`).
* **Header Format:**
  ```http
  Authorization: Basic Z2xvYmFsL3VzZXJuYW1lOnBhc3N3b3JkMTIz
  Content-Type: application/json
  Accept: application/json
  ```

### 4.3 Rate Limiting & Concurrency Guardrails
* **Rate Limit:** 100 requests per second across the API account.
* **HTTP 429 Handling:** Implement exponential backoff with jitter (initial retry 250ms, max 3 attempts).
* **Optimistic Locking:** When updating clients via `PUT /client/{clientId}`, the request body **must include the current `version` integer**. Increment the version on subsequent writes.
* **Pagination Format:** 0-indexed (`page=0&size=20`). Embedded items reside under `_embedded.{resourcePlural}` with a `page` metadata block.

---

## 5. Feature Implementation & API Contracts

---

### Feature 1: Inbound Call Answering & Telephony Setup (REQ-1)

#### Architecture
1. **DID Provisioning:** The clinic forwards their primary landline or assigns a dedicated virtual DID (via Twilio/Exotel) to MantraAssist.
2. **Inbound Webhook:** Carrier triggers a webhook to `POST /api/v1/telephony/inbound-call`.
3. **Media Stream:** Establish bidirectional WebSockets (PCM 8kHz/16kHz) connected to the MantraAssist Realtime Voice Pipeline (VAD -> Speech-to-Text -> LLM Orchestrator -> Text-to-Speech).
4. **Latency Budget:** First-token audio latency must remain `< 900ms` for seamless conversational cadence.

---

### Feature 2: Appointment Booking Flow (REQ-2)

#### Step 1: Query Slot Availability
When the caller expresses a desired day/time and treatment:
* **Endpoint:** `POST /api/business/{businessId}/branch/{branchId}/appointments/availability`
* **Request Payload:**
```json
{
  "startTime": "2026-11-10T09:00:00Z",
  "endTime": "2026-11-10T18:00:00Z",
  "isOnlineAvailability": true,
  "clientServiceSelections": [
    {
      "serviceSelections": [
        {
          "serviceId": "vG7y8Z4...",
          "staffId": null
        }
      ]
    }
  ]
}
```
* **Response Handling:** Filter `AvailableAppointment.startTime` slots into conversational choices (e.g., *"We have 10:00 AM or 2:30 PM available on Tuesday"*).

#### Step 2: Lookup or Register Client
Before creating a booking, check if the client already exists using their caller ID:
* **Endpoint:** `GET /api/business/{businessId}/client?phone={caller_phone}`
* **If Not Found, Create Client:** `POST /api/business/{businessId}/client`
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "mobile": "+15551234567",
  "email": "john.smith@example.com",
  "smsReminderConsent": true,
  "emailReminderConsent": true,
  "creatingBranchId": "{branchId}"
}
```
* **Capture Response:** Store `clientId`.

#### Step 3: Commit Booking
* **Endpoint:** `POST /api/business/{businessId}/branch/{branchId}/booking`
* **Request Payload:**
```json
{
  "bookingStatus": "ACTIVE",
  "clientId": "dbNZRQHDqAn6VlVoL2c-iA",
  "note": "Booked via MantraAssist AI Voice Receptionist",
  "clientAppointmentSchedules": [
    {
      "clientId": "dbNZRQHDqAn6VlVoL2c-iA",
      "startTime": "2026-11-10T10:00:00Z",
      "endTime": "2026-11-10T10:45:00Z",
      "serviceSelections": [
        {
          "serviceId": "vG7y8Z4...",
          "staffId": "G4iZa1VHaKCPcyv6Lt3BoA"
        }
      ]
    }
  ]
}
```
* **Response Status:** `201 Created` with `bookingId` and `appointmentId`.

---

### Feature 3: Appointment Cancellation (REQ-3)

#### Flow
1. Fetch the patient's existing active appointments:
   * **Endpoint:** `GET /api/business/{businessId}/branch/{branchId}/appointment?client_id={clientId}&from_date={YYYY-MM-DD}`
2. Voice Agent prompts caller: *"I found an appointment for [Service Name] on [Date] at [Time]. Are you sure you want to cancel?"*
3. Upon positive confirmation:
   * **Endpoint:** `POST /api/business/{businessId}/branch/{branchId}/booking/{bookingId}/cancel`
4. **Response:** `200 OK`. The appointment status changes to `CANCELED` in Phorest.

---

### Feature 4: Appointment Rescheduling (REQ-4)

#### Flow
Phorest provides native conflict-free slot checking for reschedules:
1. Call availability with the existing `rescheduleBookingId`:
   * **Endpoint:** `POST /api/business/{businessId}/branch/{branchId}/appointments/availability`
   * **Payload Addition:** `"rescheduleBookingId": "{current_booking_id}"`
2. Update the appointment time:
   * **Endpoint:** `PUT /api/business/{businessId}/branch/{branchId}/appointment/{appointmentId}`
   * **Request Payload:**
   ```json
   {
     "appointmentId": "TZcha-e8oanJ2KXwSIYkuA",
     "startTime": "2026-11-12T14:00:00Z",
     "endTime": "2026-11-12T14:45:00Z",
     "serviceId": "vG7y8Z4...",
     "staffId": "G4iZa1VHaKCPcyv6Lt3BoA",
     "confirmed": true
   }
   ```
3. Announce the new confirmed date & time to the caller.

---

### Feature 5: FAQ & Clinic Knowledge Base (REQ-5)

* **Design:** Clinic-specific FAQs (services offered, insurance accepted, pricing ranges, parking, pre-treatment instructions) are stored in MantraAssist's Clinic Knowledge Base.
* **Retrieval Method:** 
  * Low-volume / standard instructions are injected into the LLM system prompt.
  * Larger manuals use vector search (RAG) retrieved within `< 150ms`.
* **Guardrail:** The agent must never give medical diagnoses. It explains clinic policies and encourages booking a professional consultation for medical questions.

---

### Feature 6: Clinic Timings & Schedule Queries (REQ-6)

* **Source of Truth:**
  * **Static Operating Hours:** Configured in MantraAssist Clinic Settings.
  * **Dynamic / Staff-Specific Timetables:** Pulled via `GET /api/business/{businessId}/branch/{branchId}/staff-work-timetables?from_date={YYYY-MM-DD}&to_date={YYYY-MM-DD}`.
* **Agent Capability:** The AI can answer:
  * Overall clinic opening & closing times for any day of the week.
  * Holiday closures and lunch breaks.
  * Specific availability of named doctors or practitioners.

---

### Feature 7: Location, Directions & SMS Link Dispatch (REQ-7)

* **Data Retrieval:** `GET /api/business/{businessId}/branch` returns `streetAddress1`, `streetAddress2`, `city`, `postalCode`, `latitude`, `longitude`.
* **Voice Recitation:** The AI gives spoken directions with relevant local landmarks (e.g. *"We are located at 56 Haughton Road, right across from the central library"*).
* **Automated Map Dispatch (Multi-channel):**
  * When the caller asks for directions, the AI prompts: *"I can send a direct Google Maps link to your mobile phone right now. Would that be helpful?"*
  * On affirmative response, MantraAssist triggers an immediate SMS/WhatsApp message:
  ```text
  "Hi [Name], here is the direction link to [Clinic Name]: https://maps.google.com/?q=[Latitude],[Longitude]. See you soon!"
  ```

---

### Feature 8: Lead Collection & CRM Ingestion (REQ-8)

When a prospective patient calls inquiring about treatments without immediately booking an appointment, the AI captures lead data.

* **Endpoint:** `POST /api/business/{businessId}/branch/{branchId}/leads`
* **Request Payload:**
```json
{
  "businessId": "Xf7saoBpuqy2t0RRIkBpXg",
  "branchId": "hPfzdyamWjxp9GzYVUETRg",
  "firstName": "Sarah",
  "lastName": "Connor",
  "mobile": "+15559876543",
  "email": "sarah.c@example.com",
  "source": "MantraAssist AI Receptionist",
  "contactableByMobile": true,
  "contactableByEmail": true,
  "marketingOptIn": true,
  "note": "Caller inquired about Invisalign pricing; requested treatment coordinator call back."
}
```
* **Payload Constraints:** Either `contactableByEmail` or `contactableByMobile` must be `true`.
* **Dual Persistence:** The lead is simultaneously recorded in MantraAssist CRM pipeline (`clientsStore`) for internal clinic tracking and follow-up reminders.

---

### Feature 9: Urgent Call Triage & Live Telephony Transfer (REQ-9)

#### Triage Triggers
The AI Voice Receptionist constantly evaluates caller utterances against medical urgency criteria:
1. **Explicit Escalation:** Caller repeatedly asks for *"receptionist"*, *"operator"*, *"human"*, or *"speak to someone"*.
2. **Clinical Urgency / Triage:** Triggers on phrases like *"severe pain"*, *"bleeding"*, *"allergic reaction"*, *"difficulty breathing"*, *"post-op complications"*, *"infection"*.

#### Execution Protocol
1. **Spoken Acknowledgment:**  
   *"I understand this requires immediate attention. Please stay on the line while I transfer you directly to our clinical team right now."*
2. **Telephony Transfer:**
   * **Twilio TwiML:**
     ```xml
     <Response>
       <Say voice="Polly.Joanna-Neural">Connecting your call now.</Say>
       <Dial timeout="25" callerId="{{callerPhone}}">
         <Number>{{CLINIC_EMERGENCY_TRANSFER_NUMBER}}</Number>
       </Dial>
     </Response>
     ```
   * **SIP REFER (For PBX/Exotel):** Issue SIP `REFER` to the clinic's internal ring group.
3. **Fallback Protocol:** If the clinic line is busy or unanswered within 25 seconds:
   * The AI returns, apologizes, records an emergency callback ticket, and dispatches an immediate high-priority SMS/email alert to clinic management.

---

## 6. MantraAssist Internal State & Mapping

To maintain bidirectional coherence between Phorest and MantraAssist:

| MantraAssist Field | Phorest Equivalent Field | Description |
|:---|:---|:---|
| `client.id` | Local Mantra UUID | Internal ID in `clientsStore` |
| `client.foreignId` | `Phorest.clientId` | Phorest Client UUID |
| `appointment.id` | Local UUID | Internal appointment ID |
| `appointment.foreignId`| `Phorest.appointmentId` | Phorest Planner Appointment UUID |
| `appointment.bookingId`| `Phorest.bookingId` | Phorest Group/Single Booking UUID |
| `service.id` | `Phorest.serviceId` | Catalog Service ID |
| `provider.id` | `Phorest.staffId` | Branch Staff Member ID |
| `location.id` | `Phorest.branchId` | Branch UUID |

---

## 7. Environment Configuration & Secrets

The engineering team must configure the following environment variables:

```bash
# Phorest Gateway Configuration
PHOREST_REGION="US" # Options: "US" or "EU"
PHOREST_BASE_URL="https://api-gateway-us.phorest.com/third-party-api-server"
PHOREST_USERNAME="global/your_api_username"
PHOREST_PASSWORD="your_api_password_here"
PHOREST_BUSINESS_ID="your_phorest_business_id"
PHOREST_DEFAULT_BRANCH_ID="your_default_branch_id"

# Telephony & Call Control
TELEPHONY_PROVIDER="twilio" # "twilio" | "exotel" | "zadarma"
TELEPHONY_INBOUND_DID="+15551234567"
CLINIC_TRANSFER_PHONE_NUMBER="+15559998888"
CLINIC_EMERGENCY_FALLBACK_EMAIL="urgent@clinicdomain.com"

# Messaging Dispatch
SMS_DISPATCH_ENABLED="true"
WHATSAPP_DISPATCH_ENABLED="true"
```

---

## 8. Quality Assurance & Verification Scenarios

| Test Case | Objective | Expected Result |
|:---|:---|:---|
| **TC-01: Auth & Handshake** | Verify basic auth with correct region. | HTTP 200 with branch list returned from `GET /branch`. |
| **TC-02: Slot Availability** | Request availability for a specific service. | Returns array of ISO timestamps without slot overlap. |
| **TC-03: End-to-End Booking** | Create client + book appointment via AI. | Booking appears live on Phorest desktop calendar within 2s. |
| **TC-04: Reschedule Slot Guard** | Reschedule appointment with `rescheduleBookingId`. | Prevents double-booking false negatives; moves appointment successfully. |
| **TC-05: Cancellation Policy** | Cancel appointment inside & outside permitted window. | Outside policy: cancels cleanly. Inside policy: returns Phorest policy notice. |
| **TC-06: Direction SMS** | Ask for directions and consent to SMS link. | Caller receives SMS with Google Maps coordinates within 5 seconds. |
| **TC-07: Lead Capture** | Submit non-booking inquiry. | Record created in Phorest `POST /leads` with `source: MantraAssist`. |
| **TC-08: Emergency Transfer** | Speak trigger phrase *"severe bleeding after surgery"*. | Call transfers via `<Dial>` within 1.5 seconds. |

---

## 9. Next Steps for Implementation

1. **Obtain Client Credentials:** Input `PHOREST_USERNAME`, `PHOREST_PASSWORD`, and `PHOREST_BUSINESS_ID`.
2. **Execute Diagnostic Harness:** Run `scripts/phorest_test.py` to validate credentials, latency, and sandbox responses.
3. **Deploy Phorest Adapter Service:** Implement the REST client functions under `src/services/phorest/`.
4. **Wire AI Receptionist Tools:** Bind the tool-calling definitions (`book_appointment`, `cancel_appointment`, `check_availability`, `create_lead`) to the Voice Agent orchestrator.
5. **Run Integration Testing:** Perform live simulated voice calls to confirm all 9 requirements end-to-end.

