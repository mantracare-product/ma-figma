# Mantra AI Receptionist: Backend Handoff & Production Architecture Specification

## 1. Overview
This specification details the backend architecture, security protocols, API contracts, and biometric compliance requirements for transitioning Mantra AI Receptionist from the current client-side prototype to a production-grade distributed backend service.

---

## 2. Production Biometrics & Facial Recognition Architecture

> [!IMPORTANT]
> **Production Face Matching Security Rule**: Production facial recognition **must run server-side** with encrypted biometric templates, ISO/IEC 30107-3 compliant liveness detection, and explicit legal/statutory compliance review.

### 2.1 Biometric Security Principles & Production Storage
1. **Server-Side Encrypted Vector Storage**:
   - Production storage of face templates requires server-side encrypted storage using hardware security modules (HSM) or KMS envelope encryption (AES-256-GCM) with tenant-isolated encryption keys.
   - Client devices (tablets/kiosks) calculate face embedding vectors or capture single-session ephemeral frames sent over TLS 1.3 to the backend inference microservice.
   - Raw photographic images are **never stored** on disk or transmitted beyond the ephemeral TLS stream buffer.
   - Vectors are stored strictly as mathematical embeddings decoupled from patient identifiers.
2. **Explicit Informed Consent Record**:
   - Every enrolled biometric template requires an immutable audit record containing: `consentAt` timestamp, `enrolledVia: 'ai_receptionist'`, `templateVersion`, and digital signature/audit hash.
   - Walk-in patients who decline or skip registration generate an audit entry (`receptionist_face_skipped`) with zero biometric data stored.
3. **Automated Deletion Process**:
   - Immediate patient or staff-initiated deletion via MA Client Profile triggers an atomic purge of vectors from both primary vector indices and all backup caches.
   - Emits structured audit event `receptionist_face_deleted`.
4. **Legal & Compliance Review**:
   - Biometric processing workflows require formal legal review across relevant jurisdictions (BIPA, GDPR Article 9 special category biometrics, India DPDP Act 2023, and state-level biometric regulations).
   - Biometric data retention policies must enforce periodic re-consent and automated purging for inactive patients.
5. **ISO/IEC 30107-3 Liveness & Presentation Attack Detection (PAD)**:
   - Must incorporate passive and active PAD (blink detection, micro-nod, 3D structure analysis) to prevent replay and spoof attacks.
6. **Privacy-Gate Verification Flow**:
   - The kiosk display must only reveal the patient's first name upon biometric match (*"Hi Sunita, is this you?"*). Full appointment details and clinical room assignments are only surfaced following patient confirmation.
7. **Zero PHI in Logs or URLs**:
   - Vector values, raw embeddings, and biometric tokens must never appear in HTTP query params, server application logs, or telemetry.

---

## 3. MantraAssist Integration & IMaClient Contracts

### 3.1 Single Source of Truth
MantraAssist (MA) remains the single source of truth for:
- Patient profiles (`Client`)
- Service catalogs (`Service`)
- Practitioner rosters (`Provider`)
- Physical rooms & stations (`Station`)
- Multi-stage journeys (`Process` with `receptionEnabled: true`)

### 3.2 Key Production Endpoints
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/v1/reception/auth/device` | Kiosk device registration & scoped token issuance |
| `POST` | `/api/v1/reception/biometrics/match` | Match ephemeral vector against encrypted templates |
| `POST` | `/api/v1/reception/biometrics/enroll` | Enroll new template with verified patient consent |
| `DELETE` | `/api/v1/reception/biometrics/:clientId` | Permanent deletion and audit log of biometric template |
| `GET` | `/api/v1/reception/visit-summary/:clientId` | Single-query composite summary of patient, appointment & room |
| `POST` | `/api/v1/reception/appointments/checkin` | Atomic check-in, journey instantiation & queue ticket issuance |
| `WS` | `/api/v1/reception/queue/stream` | WebSocket real-time queue state broadcasts |

---

## 4. Legal & Regulatory Review Checklist
- [ ] BIPA (Illinois Biometric Information Privacy Act) / CPRA compliance review.
- [ ] India DPDP Act 2023 consent architecture sign-off.
- [ ] HIPAA Business Associate Agreement (BAA) compliance with cloud vector database providers.
- [ ] Biometric data retention policy: automatic purge upon inactivity or patient request.
