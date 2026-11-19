/**
 * Realistic starting workspace for the demo organization (R3.4, rebuilt in R4.6 for the one-record-per-appointment model): appointments, coverages, eligibility instances,
 * claims in every stage of the three claim workflows, ERAs, payments, invoices, scribe sessions with accepted codes,
 * tasks in every queue, payer calls, notifications and audit entries. Dates are relative to today (last ~90 days and
 * the next 14), the data is deterministic and internally consistent (client <-> appointment <-> coverage <-> instance
 * <-> claim <-> ERA/payment <-> invoice <-> task) and carries no marker saying what it is. Every record id starts with
 * "dm-" so the dev reseed can remove exactly these records.
 *
 * Seeded ONCE (flag mantra_demo_workspace_v1), demo org only, never during a browser test run. Records are only ever
 * ADDED (by id); existing records and stores are never rewritten or removed.
 */
import { initialClients } from "../data/canonicalClients";
import { isDemoMantraActive } from "./onboardingWorkspace";
import { testRunActive } from "./demoData";
import { getOrgBilling } from "./orgBilling";
import { POPULAR_PAYERS, type Claim, type ClaimPayer } from "./claimsStore";
import { buildSampleClaimWorkflows, seedSampleClaimWorkflows, SAMPLE_CLAIM_WORKFLOW_IDS, claimStageId } from "./rcmSampleClaimWorkflows";
import { ensureRound4Defaults, APPT_INSURANCE_WORKFLOW_ID, apptInsuranceStageId, mapDemoStateToRecord } from "./rcmDefaultsR4";
import { claimStatusForStage } from "./claimWorkflows";
import { CARC } from "./denialCodes";
import { queueIdFromName } from "./taskViewsStore";
import { getStoredProcesses } from "./useProcessStore";
import { getStoredClaims } from "./claimsStore";
import { getStoredCallLogs, saveCallLogs } from "./processLogsStore";
import { getStoredTasks, saveStoredTasks } from "./tasksStore";
import { CREDENTIALING_STORAGE_KEY, type CredentialingRecord } from "./credentialingStore";
import { getStoredNotifications, saveStoredNotifications } from "./notificationsStore";
import { getStoredAuditLogs } from "./auditLogsStore";
import { getScribeSessions } from "./scribeSessionStore";

export const DEMO_WORKSPACE_FLAG = "mantra_demo_workspace_v2";
const DEMO_WORKSPACE_FLAG_V1 = "mantra_demo_workspace_v1";
const ID = "dm-";

// ── helpers ───────────────────────────────────────────────────────────────────────────────────────
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const DAY = 86400000;
const money = (n: number) => Math.round(n * 100) / 100;
const readArr = (key: string): any[] => { try { const v = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
/** Add the records whose id is not stored yet; never touches existing ones. */
function addMissing(key: string, records: any[], prepend = false, base?: any[], write?: (list: any[]) => void): number {
  const cur = base ?? readArr(key);
  const have = new Set(cur.map((r) => String(r?.id)));
  const fresh = records.filter((r) => !have.has(String(r.id)));
  if (fresh.length === 0) return 0;
  const next = prepend ? [...fresh, ...cur] : [...cur, ...fresh];
  if (write) write(next); else localStorage.setItem(key, JSON.stringify(next));
  return fresh.length;
}

const SERVICES = [
  { name: "Office visit", cpt: "99213", desc: "Established patient office visit", charge: 150, dur: 30, icd: ["I10", "Essential (primary) hypertension"] },
  { name: "MRI brain", cpt: "70551", desc: "MRI brain without contrast", charge: 1180, dur: 45, icd: ["R51.9", "Headache, unspecified"] },
  { name: "Cataract surgery", cpt: "66984", desc: "Cataract surgery with intraocular lens, right eye", charge: 3200, dur: 60, icd: ["H25.11", "Age-related nuclear cataract, right eye"] },
  { name: "Physical therapy", cpt: "97110", desc: "Therapeutic exercise, each 15 minutes", charge: 140, dur: 45, icd: ["M54.5", "Low back pain"] },
  { name: "Comprehensive eye exam", cpt: "92004", desc: "Comprehensive eye exam, new patient", charge: 220, dur: 40, icd: ["H52.4", "Presbyopia"] },
];
const PROVIDERS = [{ name: "Dr. Priya Sharma", npi: "1487920195" }, { name: "Dr. Marcus Reed", npi: "1316987456" }, { name: "Dr. Elena Park", npi: "1578234092" }];
const STAFF = ["Maya Collins", "Jordan Lee", "Sam Rivera"];

/** Eligibility / authorization state of an appointment's coverage; names are the stages of "Coverage & authorization". */
const COV_STATES = [
  "Verified", "Verified", "Verified", "Needs fix", "Verified", "Inactive", "Verified", "Inconclusive", "Verified", "Pending review",
  "Verified", "Self-pay", "Auth required", "Verified", "Auth submitted", "Provider setup issue", "Verified", "Auth expired", "Not checked", "Checking", "Auth denied", "Verified", "Needs fix", "Auth approved", "Verified", "Auth approved",
] as const;
type CovState = (typeof COV_STATES)[number];
const CHIP: Record<string, string> = {
  Verified: "active", "Needs fix": "not_found", Inactive: "inactive", Inconclusive: "inconclusive", "Pending review": "pending_review", "Self-pay": "self_pay",
  "Provider setup issue": "provider_setup", "Auth required": "active", "Auth submitted": "active", "Auth expired": "active", "Auth denied": "active", "Auth approved": "active",
};
const ELIG: Record<string, string> = {
  Verified: "active", "Needs fix": "not_found", Inactive: "inactive", Inconclusive: "inconclusive", "Pending review": "pending_review", "Provider setup issue": "provider_setup",
  "Auth required": "active", "Auth submitted": "active", "Auth expired": "active", "Auth denied": "active", "Auth approved": "active", "Self-pay": "", "Not checked": "", Checking: "",
};

const DEMO_SCRIBE_KEY = "mantra_demo_scribe_sessions_v1";

/** Scribe sessions live in sessionStorage; put the demo ones back at the start of every browser session (add-only). */
export function restoreDemoScribeSessions(): number {
  try {
    const mine: any[] = readArr(DEMO_SCRIBE_KEY);
    if (mine.length === 0) return 0;
    const cur = getScribeSessions();
    const have = new Set(cur.map((x) => String(x.id)));
    const fresh = mine.filter((x) => !have.has(String(x.id)));
    if (fresh.length) sessionStorage.setItem("scribeSessionsData", JSON.stringify([...fresh, ...cur]));
    return fresh.length;
  } catch { return 0; }
}

export interface DemoWorkspaceResult { already: boolean; added: Record<string, number> }

export function seedDemoWorkspace(opts: { force?: boolean; now?: number } = {}): DemoWorkspaceResult {
  const added: Record<string, number> = {};
  try {
    if (typeof localStorage === "undefined") return { already: true, added };
    if (!opts.force) {
      if (testRunActive() || !isDemoMantraActive()) return { already: true, added };
      if (localStorage.getItem(DEMO_WORKSPACE_FLAG) === "1") return { already: true, added };
      // the first version of this data (instances, several claims per visit) is replaced: remove exactly what it created
      if (localStorage.getItem(DEMO_WORKSPACE_FLAG_V1) === "1") removeDemoRecords();
    }
    const now = opts.now ?? Date.now();
    const dayYmd = (offset: number) => new Date(now + offset * DAY).toISOString().slice(0, 10);
    const dayIso = (offset: number, hour = 9) => new Date(new Date(now + offset * DAY).setUTCHours(hour, (Math.abs(offset) * 7) % 60, 0, 0)).toISOString();
    const rand = rng(20260101);
    const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];

    // Reference data the rest depends on (all idempotent "add what is missing" seeders).
    seedSampleClaimWorkflows();
    try { ensureRound4Defaults(); } catch { /* ignore */ }
    const clients = (initialClients as any[]).slice(0, 20);
    const payers: ClaimPayer[] = POPULAR_PAYERS.slice(0, 6);
    const planOf = (p: ClaimPayer) => (p.type === "Medicare" ? "Medicare Part B" : p.type === "Medicaid" ? "Medicaid Managed Care" : `${p.name.split(" ")[0]} PPO Choice`);

    // ── Coverages ──
    const coverages: any[] = [];
    const covOf: Record<string, any> = {};
    clients.forEach((c, i) => {
      if (i === 11 || i === 17) return; // self-pay clients
      const p = payers[i % payers.length];
      const prefix = p.name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
      const cov: any = {
        id: `${ID}cov-${i}-p`, clientId: c.id, payerId: p.id, memberId: `${prefix}${48210000 + i * 137}`, groupNumber: `GRP-${3100 + (i % 7) * 11}`, planName: planOf(p),
        priority: "primary", subscriberName: c.name, subscriberRelationship: "self", effectiveDate: dayYmd(-(400 + i * 9)), termDate: i === 5 ? dayYmd(-30) : undefined,
      };
      coverages.push(cov);
      covOf[c.id] = cov;
      if (i % 4 === 1) {
        const p2 = payers[(i + 2) % payers.length];
        coverages.push({ id: `${ID}cov-${i}-s`, clientId: c.id, payerId: p2.id, memberId: `${p2.name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase()}${77300000 + i * 91}`, groupNumber: `GRP-${5200 + i}`, planName: planOf(p2), priority: "secondary", subscriberName: i % 8 === 1 ? `${c.name.split(" ")[0]} ${c.name.split(" ").slice(-1)[0]} Sr.` : c.name, subscriberRelationship: i % 8 === 1 ? "spouse" : "self", effectiveDate: dayYmd(-300) });
      }
    });
    added.coverages = addMissing("mantra_coverages_v1", coverages);

    // ── Appointments (past ~85 days and next 14) ──
    const appts: any[] = [];
    let aSeq = 0;
    const mkAppt = (ci: number, offset: number, status: string) => {
      const c = clients[ci % clients.length];
      const s = SERVICES[(ci + aSeq) % SERVICES.length];
      const prov = PROVIDERS[(ci + aSeq) % PROVIDERS.length];
      aSeq += 1;
      const hour = 8 + ((ci * 3 + aSeq) % 9);
      const a: any = {
        id: 910000 + aSeq, _seq: aSeq, clientId: c.id, clientName: c.name, clientEmail: c.email || "", clientPhone: c.phone || "", employeeId: 100 + (ci % 3), employeeName: prov.name,
        serviceId: 9000 + (SERVICES.indexOf(s) + 1), serviceName: s.name, title: `${s.name} - ${c.name}`, date: dayYmd(offset), time: `${String(hour).padStart(2, "0")}:${aSeq % 2 ? "00" : "30"}`, duration: s.dur,
        status, sessionType: "inPerson", location: "Main Clinic", createdAt: dayIso(offset - 12), updatedAt: dayIso(offset - 1), source: ["Inbound Call", "MA-Client", "Walked In", "screen"][aSeq % 4],
        _service: s, _prov: prov,
      };
      // payment mode: insurance when the client has a coverage and the service is billable to insurance (physical therapy is self-pay); some call bookings were never confirmed
      a.paymentMode = covOf[c.id] && s.name !== "Physical therapy" ? "insurance" : "self_pay";
      if (a.source === "Inbound Call" && aSeq % 3 === 0) a.paymentModeUnconfirmed = true;
      appts.push(a);
      return a;
    };
    clients.forEach((c, ci) => {
      const past = 6 + (ci % 2);
      for (let k = 0; k < past; k++) mkAppt(ci, -(4 + ((ci * 11 + k * 13) % 84)), (ci + k) % 11 === 4 ? "cancelled" : (ci + k) % 17 === 6 ? "no-show" : "completed");
      mkAppt(ci, (ci * 5) % 15, "scheduled");
      if (ci % 2 === 0) mkAppt(ci, 1 + ((ci * 3) % 13), "scheduled");
      if (ci % 3 === 1) mkAppt(ci, 2 + ((ci * 7) % 12), "scheduled");
    });

    // ── Insurance records for the visits that are still ahead (or just happened): ONE per appointment, in every stage of
    //    Eligibility and Prior auth, with eligibility / authorization values and history ──
    const preRecords: any[] = [];
    const preFields: Record<string, Record<string, any>> = {};
    let stateIdx = 0;
    const eligAppts = appts.filter((a) => a.paymentMode === "insurance" && a.status === "scheduled" && covOf[a.clientId]);
    eligAppts.forEach((a) => {
      const state: CovState = COV_STATES[stateIdx % COV_STATES.length];
      stateIdx += 1;
      const cov = covOf[a.clientId];
      const payer = payers.find((p) => p.id === cov?.payerId)!;
      const target = mapDemoStateToRecord(state);
      const recId = `${ID}rec-${a._seq}`;
      const checkedAt = dayIso(-1, 7);
      const eligStatus = ELIG[state];
      const needsAuth = state.startsWith("Auth");
      const c = clients.find((x) => x.id === a.clientId) || clients[0];
      preRecords.push({
        id: recId, claimNumber: `INS-${String(910000 + a._seq).slice(-5)}`, patientId: c.id, patientName: c.name, patientDob: c.dob || "", patientGender: "Other", patientAddress: c.location || "", patientPhone: c.phone || "",
        insuredId: cov.memberId, groupNumber: cov.groupNumber, payer, appointmentId: String(a.id), appointmentTitle: a.title, serviceId: String(a.serviceId),
        renderingProviderName: a._prov.name, renderingProviderNpi: a._prov.npi, billingProviderName: "", billingProviderNpi: "", placeOfService: "", serviceDate: a.date,
        diagnosisCodes: [], lines: [], totalCharge: 0, amountPaid: 0, status: "Draft", currentStageId: claimStageId(target.workflow, target.stage), statusLabel: target.stage, processId: target.workflow,
        assignee: STAFF[stateIdx % STAFF.length], priority: "normal", sourceType: "appointment", sourceId: String(a.id), dedupeKey: `claim:appointment:${a.id}`, submissionCount: 0,
        createdAt: dayIso(-3 - (stateIdx % 12), 6), updatedAt: dayIso(-1, 9),
      });
      const f: Record<string, any> = {};
      if (eligStatus) {
        Object.assign(f, {
          elig_status: eligStatus, elig_payer: payer.name, elig_plan: cov.planName, elig_copay: [20, 30, 40, 50][stateIdx % 4], elig_deductible_remaining: [0, 250, 500, 1200, 75][stateIdx % 5],
          elig_coinsurance: [10, 20, 0][stateIdx % 3], elig_oop_remaining: [800, 2400, 150][stateIdx % 3], elig_network: stateIdx % 6 === 0 ? "Out of network" : "In network",
          elig_plan_begin: cov.effectiveDate, elig_plan_end: cov.termDate || dayYmd(200), elig_checked_at: checkedAt, elig_source: "clearinghouse",
          elig_history: [{ checkedAt, trigger: "Scheduled check", source: "clearinghouse", status: eligStatus, reasonCode: eligStatus === "not_found" ? "75" : "", summary: state, sourceRecord: `appointment:${a.id}`, rawRef: "" }],
        });
        if (eligStatus === "not_found") Object.assign(f, { elig_reason_code: "75", elig_reason_category: "Subscriber not found", elig_message: "Member ID or date of birth does not match the payer record", elig_attempt: 2 });
      }
      if (needsAuth) {
        Object.assign(f, {
          auth_required: true, auth_status: state === "Auth required" ? "required" : state === "Auth submitted" ? "requested" : state === "Auth expired" ? "expired" : state === "Auth approved" ? "approved" : "denied",
          auth_number: state === "Auth required" || state === "Auth submitted" ? "" : `PA-${660000 + stateIdx * 17}`, auth_units_approved: 12, auth_units_used: state === "Auth expired" ? 12 : 3,
          auth_valid_from: dayYmd(-120), auth_valid_to: state === "Auth expired" ? dayYmd(-5) : dayYmd(90), auth_requested_at: dayYmd(-6),
        });
      }
      preFields[recId] = f;
      a.coverage = state === "Not checked" || state === "Checking" ? undefined : { instanceId: recId, status: CHIP[state], checkedAt, summary: state === "Verified" ? "Active coverage" : state };
      a.coverageId = cov.id;
      a.financialClass = state === "Self-pay" ? "self_pay" : "insurance";
      a.claimId = recId;
      // the appointment sits in the insurance workflow; cleared once eligibility / authorization is
      a.processId = APPT_INSURANCE_WORKFLOW_ID;
      const cleared = state === "Verified" || state === "Auth approved";
      a.currentStageId = apptInsuranceStageId(cleared ? (a._seq % 3 === 0 ? "Reminded" : "Insurance cleared") : "Booked");
      a.statusLabel = cleared ? (a._seq % 3 === 0 ? "Reminded" : "Insurance cleared") : "Booked";
    });
    // appointments that already took place are in the insurance workflow too (Completed)
    appts.forEach((a) => {
      if (a.paymentMode === "insurance" && a.status === "completed" && !a.processId) { a.processId = APPT_INSURANCE_WORKFLOW_ID; a.currentStageId = apptInsuranceStageId("Completed"); a.statusLabel = "Completed"; }
    });

    // ── Scribe sessions (signed and unsigned) so Create Claim has choices ──
    const sessions: any[] = [];
    const completed = appts.filter((a) => a.status === "completed");
    completed.slice(0, 14).forEach((a, i) => {
      const s = a._service;
      const signed = i % 3 !== 2;
      const sid = `${ID}scribe-${i + 1}`;
      a.scribeSessionId = sid;
      sessions.push({
        id: sid, clientId: a.clientId, clientName: a.clientName, title: `${s.name} note`, appointmentId: String(a.id), doctorId: String(100 + (i % 3)), doctorName: a._prov.name,
        sessionDate: new Date(`${a.date}T${a.time}:00`).toISOString(), durationSeconds: s.dur * 60, transcript: { fullText: "", utterances: [] },
        extractedData: { chiefComplaint: s.desc, diagnosis: s.icd[1], icd10Code: s.icd[0], medications: [], investigations: [], doctorNotes: "" },
        status: "completed", createdAt: new Date(`${a.date}T${a.time}:00`).getTime(),
        codes: { icd: [{ code: s.icd[0], description: s.icd[1] }], cpt: [{ code: s.cpt, description: s.desc, modifier: s.name === "Cataract surgery" ? "RT" : "", units: s.name === "Physical therapy" ? 3 : 1 }], accepted: i % 5 !== 4, acceptedAt: dayIso(-2 - i), ...(signed ? { signedAt: dayIso(-1 - i) } : {}) },
      });
    });
    localStorage.setItem(DEMO_SCRIBE_KEY, JSON.stringify(sessions));
    added.scribeSessions = restoreDemoScribeSessions();

    // ── Claims in every stage of the three workflows ──
    const wfs = buildSampleClaimWorkflows();
    const { chargeCapture, claim: claimWf, denial } = SAMPLE_CLAIM_WORKFLOW_IDS;
    const stageOf = (wfId: string, name: string) => wfs.find((w) => w.id === wfId)!.stages.find((s) => s.name === name)!;
    const PLAN: Array<[string, string, number]> = [
      [chargeCapture, "Awaiting note", 3], [chargeCapture, "Coding review", 3], [chargeCapture, "Hold", 2], [chargeCapture, "Ready to bill", 2],
      [claimWf, "Draft", 4], [claimWf, "Scrub failed", 3], [claimWf, "Ready to submit", 4], [claimWf, "Submitted", 6], [claimWf, "Rejected", 3], [claimWf, "Accepted by payer", 4],
      [claimWf, "Pending (payer)", 5], [claimWf, "Partially paid", 3], [claimWf, "Paid", 12], [claimWf, "Closed", 3],
      [denial, "New denial", 5], [denial, "Correct & resubmit", 3], [denial, "Appeal drafted", 3], [denial, "Appeal submitted", 2], [denial, "Written off", 2],
    ];
    const DENIALS: Array<[string, string]> = [["appealable", "197"], ["correctable", "16"], ["coverage", "27"], ["appealable", "50"], ["timely_filing", "29"], ["appealable", "97"], ["correctable", "4"], ["coverage", "31"]];
    const insuredCompleted = completed.filter((x) => x.paymentMode === "insurance" && !!covOf[x.clientId]); // self-pay visits get invoices, not claims; ONE record per appointment
    const claims: Claim[] = [];
    const eraLinesByPayer: Record<string, any[]> = {};
    const invoiceSeeds: Array<{ claim: Claim }> = [];
    let n = 0;
    const billing = getOrgBilling();
    for (const [wfId, stageName, count] of PLAN) {
      const stage = stageOf(wfId, stageName);
      const cat = stage.systemCategory || "";
      for (let k = 0; k < count; k++) {
        const a = insuredCompleted[n];
        if (!a) continue;
        const c = clients.find((x) => x.id === a.clientId) || clients[n % clients.length];
        const cov = covOf[c.id];
        const payer = payers.find((p) => p.id === cov?.payerId) || payers[n % payers.length];
        const s: (typeof SERVICES)[number] = a._service;
        const units = s.name === "Physical therapy" ? 3 : 1;
        const charge = money(s.charge * units);
        const ageDays = 6 + ((n * 29) % 82) + (cat === "pending" || cat === "submitted" || cat === "accepted" ? (n % 3) * 22 : 0); // created 6..~130 days ago (older open claims fill the 90+ A/R bucket)
        const created = dayIso(-ageDays, 10);
        const afterSubmit = ["submitted", "rejected", "accepted", "pending", "partially_paid", "paid", "closed", "denied", "correct", "appeal_drafted", "appeal_submitted", "written_off"].includes(cat);
        const submittedAt = afterSubmit ? dayIso(-Math.max(1, ageDays - 3), 14) : undefined;
        const isDenial = wfId === denial;
        const d = DENIALS[n % DENIALS.length];
        const paid = cat === "paid" || cat === "closed";
        const partially = cat === "partially_paid";
        const amountPaid = paid ? money(charge * 0.8) : partially ? money(charge * 0.4) : 0;
        const sid = a.scribeSessionId;
        const clm: any = {
          id: `${ID}clm-${n + 1}`, claimNumber: `CLM-${String(26040 + n * 7)}`, patientId: c.id, patientName: c.name, patientDob: c.dob || `19${60 + (n % 35)}-0${1 + (n % 9)}-1${n % 9}`,
          patientGender: c.gender === "Male" ? "Male" : c.gender === "Female" ? "Female" : (n % 2 ? "Female" : "Male"), patientAddress: c.location || "Springfield, IL", patientPhone: c.phone || "",
          insuredId: cov?.memberId || "", groupNumber: cov?.groupNumber, payer, appointmentId: String(a.id), appointmentTitle: a.title, scribeSessionId: sid, serviceId: String(a.serviceId),
          renderingProviderName: a._prov.name, renderingProviderNpi: a._prov.npi, billingProviderName: billing.legalName || "Mantra Care Health LLC", billingProviderNpi: billing.groupNpi || "1234567893",
          billingProviderTaxId: billing.ein || "12-3456789", billingProviderAddress: billing.address || "", placeOfService: "11 - Office", serviceDate: a.date,
          diagnosisCodes: [{ pointer: "A", code: s.icd[0], description: s.icd[1] }],
          lines: [{ id: `${ID}ln-${n + 1}`, serviceDate: a.date, cptCode: s.cpt, description: s.desc, diagnosisPointer: "A", units, chargeAmount: charge }],
          totalCharge: charge, amountPaid, contractualAdjustment: paid ? money(charge * 0.15) : partially ? money(charge * 0.2) : 0, patientResponsibility: paid ? money(charge * 0.05) : 0,
          status: claimStatusForStage(stage), currentStageId: claimStageId(wfId, stageName), statusLabel: stageName, processId: wfId, assignee: STAFF[n % STAFF.length],
          priority: isDenial ? "high" : n % 7 === 0 ? "urgent" : "normal", timelyFilingDeadline: dayYmd(-ageDays + 90), sourceType: "appointment", sourceId: String(a.id),
          submissionCount: afterSubmit ? (n % 4 === 3 ? 2 : 1) : 0, submissionMethod: "clearinghouse", createdAt: created, submittedAt, updatedAt: dayIso(-Math.max(0, ageDays - 8), 15),
        };
        if (afterSubmit) { clm.clearinghouseTrackingId = `MTR-837P-${770000 + n * 13}`; clm.ediControlNumber = String(100000 + n * 3); }
        if (cat === "rejected") clm.rejectionReason = "Subscriber ID not found at payer (277CA reject)";
        if (cat === "scrub_failed") clm.scrubIssues = [{ ruleId: "billing_entity", severity: "error", message: "Rendering provider NPI is required" }, { ruleId: "dx_pointer", severity: "warning", message: "Diagnosis pointer A is the only pointer used" }];
        if (cat === "draft" || cat === "scrub_failed") clm.missingData = n % 2 ? ["Referring provider"] : [];
        if (cat === "partially_paid") clm.underpaidBy = money(charge * 0.35);
        if (isDenial) {
          clm.denialCategory = d[0]; clm.denialCodes = [`CO-${d[1]}`]; clm.denialSummary = (CARC[d[1]] && CARC[d[1]].text) || "Denied by payer"; clm.appealDeadline = dayYmd(-ageDays + 60 + 30);
          clm.amountPaid = 0;
        }
        if (cat === "appeal_drafted" || cat === "appeal_submitted") clm.appealDraft = { text: `Re: ${clm.claimNumber}. We request reconsideration of the denial (${clm.denialSummary}). Supporting documentation from the visit on ${a.date} is attached.`, revision: 1, proposedAt: dayIso(-4), status: cat === "appeal_submitted" ? "accepted" : "proposed" };
        if (paid || partially) {
          const eraId = `${ID}era-${payer.id}`;
          clm.payments = [{ id: `${ID}pay-${n + 1}`, eraId, traceNumber: `TRN${440000 + payers.indexOf(payer) * 311}`, amount: amountPaid, date: dayYmd(-Math.max(2, ageDays - 15)) }];
          (eraLinesByPayer[payer.id] ||= []).push({ id: `${ID}eral-${n + 1}`, claimNumber: clm.claimNumber, payerClaimNumber: `PCN${900000 + n}`, patientName: c.name, charged: charge, paid: amountPaid, adjustments: [{ group: "CO", carc: "45", amount: money(charge * (partially ? 0.2 : 0.15)) }, ...(paid ? [{ group: "PR", carc: "2", amount: money(charge * 0.05) }] : [])], patientResponsibility: paid ? money(charge * 0.05) : 0, status: "posted", matchedClaimId: clm.id, postedAt: dayIso(-Math.max(2, ageDays - 15)) });
          invoiceSeeds.push({ claim: clm });
        }
        a.claimId = a.claimId || clm.id;
        claims.push(clm);
        n += 1;
      }
    }
    added.claims = addMissing("mantra_claims_v1", [...(preRecords as Claim[]), ...claims], true, getStoredClaims());
    for (const [rid, vals] of Object.entries(preFields)) { try { if (!localStorage.getItem(`mantra_claim_fieldvalues_${rid}`)) localStorage.setItem(`mantra_claim_fieldvalues_${rid}`, JSON.stringify(vals)); } catch { /* ignore */ } }
    localStorage.setItem("claims_schema_v2", localStorage.getItem("claims_schema_v2") || "1");

    // ── ERAs: posted per payer, one partial, one unmatched ──
    const eras: any[] = Object.entries(eraLinesByPayer).map(([pid, lines], i) => {
      const total = lines.reduce((x, l) => x + l.paid, 0);
      return { id: `${ID}era-${pid}`, traceNumber: `TRN${440000 + payers.findIndex((p) => p.id === pid) * 311}`, payerId: pid, receivedAt: dayIso(-9 - i * 6), checkAmount: money(total), status: i === 2 ? "partial" : "posted", lines: i === 2 ? [...lines, { id: `${ID}eral-x${i}`, claimNumber: "CLM-99999", payerClaimNumber: "PCN000000", patientName: "Unknown patient", charged: 180, paid: 120, adjustments: [{ group: "CO", carc: "45", amount: 60 }], patientResponsibility: 0, status: "pending" }] : lines, mock: true };
    });
    eras.push({ id: `${ID}era-unmatched`, traceNumber: "TRN558201", payerId: payers[1].id, receivedAt: dayIso(-2), checkAmount: 310, status: "unmatched", lines: [{ id: `${ID}eral-u1`, claimNumber: "CLM-77310", payerClaimNumber: "PCN778101", patientName: "Alex Moran", charged: 410, paid: 310, adjustments: [{ group: "CO", carc: "45", amount: 100 }], patientResponsibility: 0, status: "unmatched" }], mock: true });
    added.eras = addMissing("mantra_eras_v1", eras);

    // ── Invoices (Draft, Sent, Reminder 1/2, Overdue, Paid + statements + a payment plan) and payments ──
    const invProc = getStoredProcesses().find((p) => p.entityType === "invoice");
    const stageByName = (re: RegExp) => invProc?.stages.find((s) => re.test(s.name))?.id;
    const INV_PLAN: Array<{ label: string; status: string; re: RegExp; paidPct: number; age: number }> = [
      { label: "Draft", status: "draft", re: /draft/i, paidPct: 0, age: 2 }, { label: "Draft", status: "draft", re: /draft/i, paidPct: 0, age: 4 },
      { label: "Sent", status: "sent", re: /sent/i, paidPct: 0, age: 6 }, { label: "Sent", status: "sent", re: /sent/i, paidPct: 0, age: 9 }, { label: "Sent", status: "viewed", re: /sent|viewed/i, paidPct: 0, age: 12 },
      { label: "Reminder 1", status: "sent", re: /remind/i, paidPct: 0, age: 21 }, { label: "Reminder 1", status: "sent", re: /remind/i, paidPct: 0, age: 24 },
      { label: "Reminder 2", status: "sent", re: /remind/i, paidPct: 0, age: 38 }, { label: "Reminder 2", status: "partial", re: /remind/i, paidPct: 0.3, age: 41 },
      { label: "Overdue", status: "overdue", re: /overdue/i, paidPct: 0, age: 58 }, { label: "Overdue", status: "overdue", re: /overdue/i, paidPct: 0, age: 66 }, { label: "Overdue", status: "overdue", re: /overdue/i, paidPct: 0, age: 79 },
      { label: "Paid", status: "paid", re: /paid|payment/i, paidPct: 1, age: 30 }, { label: "Paid", status: "paid", re: /paid|payment/i, paidPct: 1, age: 45 }, { label: "Paid", status: "paid", re: /paid|payment/i, paidPct: 1, age: 70 }, { label: "Paid", status: "paid", re: /paid|payment/i, paidPct: 1, age: 84 },
    ];
    const invoices: any[] = [];
    const payments: any[] = [];
    INV_PLAN.forEach((p, i) => {
      const c = clients[(i * 3 + 2) % clients.length];
      const s = SERVICES[i % SERVICES.length];
      const fromClaim = invoiceSeeds[i]?.claim;
      const total = money(fromClaim ? fromClaim.patientResponsibility || s.charge * 0.2 : s.charge * 0.25);
      const paidAmt = money(total * p.paidPct);
      const id = `INV-DM-${i + 1}`;
      const inv: any = {
        id, invoiceNumber: `INV-${24100 + i}`, clientId: c.id, clientName: c.name, clientEmail: c.email || "", clientPhone: c.phone || "", currency: "$",
        appointmentTitle: s.name, lineItems: [{ id: `${id}-l1`, source: "manual", description: `${s.name} - patient responsibility`, quantity: 1, unitPrice: total }], subtotal: total, discountAmount: 0, taxAmount: 0, total, amountPaid: paidAmt,
        paymentType: "self_pay", status: p.status, statusLabel: p.label, createdAt: dayIso(-p.age, 9), createdBy: "system", dueDate: dayYmd(-p.age + 30), issueDate: dayYmd(-p.age), date: dayYmd(-p.age),
        ...(p.status !== "draft" ? { sentAt: dayIso(-p.age + 1, 9), sentVia: "email" } : {}), ...(p.status === "paid" ? { paidAt: dayIso(-p.age + 12, 11), paymentMode: "Card" } : {}),
        reminderLevel: p.label === "Reminder 1" ? 1 : p.label === "Reminder 2" ? 2 : 0,
        statements: p.status === "draft" ? [] : [{ id: `${id}-st1`, sentAt: dayIso(-p.age + 1, 9), channel: "email", amount: total }],
        ...(i === 8 ? { paymentPlan: { installments: 4, amountEach: money(total / 4), frequency: "monthly", nextDue: dayYmd(12) } } : {}),
        ...(fromClaim ? { claimId: fromClaim.id } : {}),
      };
      const stageId = stageByName(p.re);
      if (stageId) inv.currentStageId = stageId, inv.processId = invProc!.id;
      invoices.push(inv);
      if (paidAmt > 0) payments.push({ id: `${ID}ipay-${i + 1}`, invoiceId: id, clientId: c.id, amount: paidAmt, method: p.status === "paid" ? "card_on_file" : "payment_link", paymentType: "self_pay", paymentDate: dayYmd(-p.age + 12), receiptNumber: `RC-${5200 + i}`, createdAt: dayIso(-p.age + 12, 11) });
    });
    added.invoices = addMissing("mantra_invoices_v1", invoices);
    added.payments = addMissing("mantra_payments_v1", payments);

    // ── Tasks in every queue, linked to their records ──
    const QUEUES: Array<[string, string, number]> = [
      ["Insurance fixes", "record", 4], ["Benefits to verify", "record", 4], ["Enrollment", "client", 2], ["Prior auth", "record", 4],
      ["Claim fixes", "claim", 5], ["Posting", "claim", 3], ["Denials and A/R", "claim", 5], ["Patient balances", "invoice", 4],
    ];
    const tasks: any[] = [];
    let t = 0;
    for (const [qName, refType, count] of QUEUES) {
      for (let k = 0; k < count; k++) {
        const done = k === count - 1 && t % 2 === 0;
        const overdue = !done && k % 2 === 0;
        const due = dayIso(overdue ? -(1 + ((t * 3) % 12)) : 1 + ((t * 2) % 9), 17);
        let ref: any; let amount = 0; let title = "";
        if (refType === "claim") { const cl = claims[(t * 5) % claims.length]; ref = { type: "claim", id: cl.id, stageId: cl.currentStageId, stageName: cl.statusLabel }; amount = cl.totalCharge; title = `${qName === "Posting" ? "Post payment for" : qName === "Denials and A/R" ? "Work denial on" : "Fix"} ${cl.claimNumber} (${cl.patientName})`; }
        else if (refType === "invoice") { const iv = invoices[(t * 3) % invoices.length]; ref = { type: "invoice", id: iv.id }; amount = iv.total - iv.amountPaid; title = `Collect balance on ${iv.invoiceNumber} (${iv.clientName})`; }
        else if (refType === "client") { const c = clients[(t * 7) % clients.length]; ref = { type: "client", id: c.id }; title = `Enroll ${c.name} with the payer`; }
        else { const rec = preRecords[(t * 3) % preRecords.length]; ref = { type: "claim", id: rec.id, stageId: rec.currentStageId, stageName: rec.statusLabel }; title = `${qName === "Prior auth" ? "Prior authorization for" : qName === "Benefits to verify" ? "Verify benefits for" : "Fix coverage for"} ${rec.patientName}`; }
        tasks.push({
          id: `${ID}task-${t + 1}`, code: `RC-${100 + t}`, title, description: "", status: done ? "completed" : k % 3 === 1 ? "in_progress" : "pending", isImportant: overdue, scopeLevel: "client",
          assignee: { scopeLevel: "client", assigneeName: STAFF[t % STAFF.length] }, creator: { id: "u1", name: STAFF[(t + 1) % STAFF.length] }, checklists: [], observers: [], subtasks: [], attachments: [],
          createdAt: dayIso(-3 - (t % 10), 9), updatedAt: dayIso(-1, 9), queueId: queueIdFromName(qName), priority: overdue ? "high" : (["normal", "low", "urgent"] as const)[t % 3], dueAt: due,
          amountAtStake: amount ? money(amount) : undefined, source: "rule", entityRef: ref, ...(done ? { closedBy: "user", closedAt: dayIso(-1, 12) } : {}),
        });
        t += 1;
      }
    }
    added.tasks = addMissing("mantra_tasks_store", tasks, true, getStoredTasks(), saveStoredTasks);

    // ── Payer calls (process rows of type call) ──
    const calls: any[] = [];
    const CALLS = [["Benefits check", "Completed", "4:32"], ["Claim status", "Completed", "6:10"], ["Prior auth status", "Completed", "3:48"], ["Claim status", "No answer", "0:00"], ["Benefits check", "Completed", "5:21"], ["Denial follow-up", "Completed", "8:04"], ["Prior auth status", "Voicemail", "1:02"], ["Claim status", "Completed", "2:57"]];
    CALLS.forEach(([purpose, status, dur], i) => {
      const p = payers[i % payers.length];
      calls.push({ id: `${ID}call-${i + 1}`, kind: "call", client: `${p.name} (${purpose})`, clientId: clients[i].id, type: "Outbound", status, process: "Payer calls", currentStage: purpose, duration: dur, date: `${dayYmd(-(3 + i * 4))} ${String(9 + i).padStart(2, "0")}:15`, hasRecording: status === "Completed", hasTranscript: status === "Completed", hasScheduledCall: false, createdAt: dayIso(-(3 + i * 4), 9) });
    });
    // call logs: payer calls (existing call logs are kept)
    added.callLogs = addMissing("callLogs", calls, true, getStoredCallLogs(), saveCallLogs);
    const apptRecords = appts.map(({ _service, _prov, _seq, ...rest }) => rest);
    added.appointments = addMissing("appointments_v1", apptRecords);
    try { const raw = sessionStorage.getItem("appointments_v1"); if (raw) { const cur = JSON.parse(raw); if (Array.isArray(cur)) { const have = new Set(cur.map((r: any) => String(r.id))); sessionStorage.setItem("appointments_v1", JSON.stringify([...cur, ...apptRecords.filter((r) => !have.has(String(r.id)))])); } } } catch { /* ignore */ }

    // ── Notifications and audit entries ──
    const notifs = [
      ["claim", "Claim denied", `${claims.find((c) => c.denialCategory)?.claimNumber || "A claim"} was denied: ${claims.find((c) => c.denialCategory)?.denialSummary || ""}`, "/claims", -1],
      ["system", "ERA received", "Remittance TRN558201 could not be matched to a claim", "/claims", -2],
      ["task", "Task overdue", "Prior authorization task is past its due date", "/tasks", -3],
      ["system", "Eligibility needs a fix", "Member ID does not match the payer record", "/deals", -1],
      ["claim", "Claim paid", `${claims.find((c) => c.status === "Paid")?.claimNumber || "A claim"} was paid in full`, "/claims", -5],
      ["system", "Daily jobs finished", "Eligibility checks scheduled for the next 7 days are complete", "/automation", -1],
    ].map(([type, title, message, link, off], i) => ({ id: `${ID}notif-${i + 1}`, type, title, message, timestamp: dayIso(off as number, 8 + i), read: i > 3, link, module: "RCM" }));
    added.notifications = addMissing("mantra_notifications_store", notifs, true, getStoredNotifications(), saveStoredNotifications);
    const audits = claims.slice(0, 10).map((cl, i) => ({
      id: `${ID}aud-${i + 1}`, timestamp: dayIso(-(2 + i * 3), 11), actorId: STAFF[i % 3].toLowerCase().replace(" ", ".") + "@demo.care", actorName: STAFF[i % 3], actorEmail: STAFF[i % 3].toLowerCase().replace(" ", ".") + "@demo.care", actorRole: "Billing",
      action: i % 2 ? "updated" : "created", module: "RCM", entityType: "claim", entityId: cl.id, targetName: cl.claimNumber, summary: i % 2 ? `Moved ${cl.claimNumber} to ${cl.statusLabel}` : `Created ${cl.claimNumber} for ${cl.patientName}`, before: null, after: { stage: cl.statusLabel }, ip: "10.0.0.24", userAgent: "Browser",
    }));
    added.audit = addMissing("mantra_admin_audit_logs", audits, true, getStoredAuditLogs());

    // ── Credentialing: org and providers against payers ──
    const credRecords: CredentialingRecord[] = [];
    const p1 = payers[0];
    const p2 = payers[1] || payers[0];
    const p3 = payers[2] || payers[0];

    // Org credentialed with p1 and p2, not credentialed with p3
    credRecords.push({
      id: `${ID}cred-org-${p1.id}`,
      scope: "organization",
      payerId: p1.id,
      payerName: p1.name,
      networkStatus: "in_network",
      status: "credentialed",
      payerAssignedId: "ORG-BCBS-900",
      effectiveDate: "2024-01-01",
      expiresDate: dayYmd(365),
      notes: "Annual in-network contract active",
      createdAt: dayIso(-30, 9),
      updatedAt: dayIso(-1, 9),
    });
    credRecords.push({
      id: `${ID}cred-org-${p2.id}`,
      scope: "organization",
      payerId: p2.id,
      payerName: p2.name,
      networkStatus: "in_network",
      status: "credentialed",
      payerAssignedId: "ORG-AET-440",
      effectiveDate: "2024-03-01",
      expiresDate: dayYmd(300),
      createdAt: dayIso(-20, 9),
      updatedAt: dayIso(-1, 9),
    });
    credRecords.push({
      id: `${ID}cred-org-${p3.id}`,
      scope: "organization",
      payerId: p3.id,
      payerName: p3.name,
      networkStatus: "out_of_network",
      status: "not_started",
      notes: "Contracting under review",
      createdAt: dayIso(-10, 9),
      updatedAt: dayIso(-1, 9),
    });

    // Providers against p1:
    // Prov 1: credentialed
    credRecords.push({
      id: `${ID}cred-p1-${PROVIDERS[0].name.replace(/\s+/g, "")}`,
      scope: "provider",
      memberId: PROVIDERS[0].npi,
      memberName: PROVIDERS[0].name,
      payerId: p1.id,
      payerName: p1.name,
      networkStatus: "in_network",
      status: "credentialed",
      payerAssignedId: "PR-901",
      effectiveDate: "2024-01-01",
      expiresDate: dayYmd(365),
      createdAt: dayIso(-30, 9),
      updatedAt: dayIso(-1, 9),
    });
    // Prov 2: expiring in 30 days!
    credRecords.push({
      id: `${ID}cred-p2-${PROVIDERS[1].name.replace(/\s+/g, "")}`,
      scope: "provider",
      memberId: PROVIDERS[1].npi,
      memberName: PROVIDERS[1].name,
      payerId: p1.id,
      payerName: p1.name,
      networkStatus: "in_network",
      status: "credentialed",
      payerAssignedId: "PR-902",
      effectiveDate: "2024-01-01",
      expiresDate: dayYmd(30),
      notes: "Re-credentialing packet sent to payer",
      createdAt: dayIso(-30, 9),
      updatedAt: dayIso(-1, 9),
    });
    // Prov 3: not credentialed!
    credRecords.push({
      id: `${ID}cred-p3-${PROVIDERS[2].name.replace(/\s+/g, "")}`,
      scope: "provider",
      memberId: PROVIDERS[2].npi,
      memberName: PROVIDERS[2].name,
      payerId: p1.id,
      payerName: p1.name,
      networkStatus: "out_of_network",
      status: "not_started",
      notes: "Application pending provider signature",
      createdAt: dayIso(-5, 9),
      updatedAt: dayIso(-1, 9),
    });

    added.credentialing = addMissing(CREDENTIALING_STORAGE_KEY, credRecords);

    if (!opts.force) localStorage.setItem(DEMO_WORKSPACE_FLAG, "1");
    window.dispatchEvent(new Event("storage"));
    for (const ev of ["mantra_claims_changed", "mantra_era_updated", "mantra_coverages_updated", "processLogs_updated", "mantra-tasks-updated", "mantra-notifications-updated"]) {
      try { window.dispatchEvent(new CustomEvent(ev)); } catch { /* ignore */ }
    }
  } catch (e) {
    console.warn("[demoWorkspace] seed failed:", e);
  }
  return { already: false, added };
}

const isDemoRecord = (r: any) => {
  const id = String(r?.id);
  const n = Number(id);
  const appt = Number(r?.appointmentId);
  // records of the first version that the R4.4 migration turned into insurance records keep their appointment id
  return id.startsWith(ID) || id.includes("-DM-") || (Number.isFinite(n) && n >= 910000 && n < 920000) || (Number.isFinite(appt) && appt >= 910000 && appt < 920000);
};

const DEMO_KEYS = ["mantra_coverages_v1", "mantra_claims_v1", "mantra_eras_v1", "mantra_invoices_v1", "mantra_payments_v1", "mantra_tasks_store", "callLogs", "callLogs_demo", "appointments_v1", "mantra_notifications_store", "mantra_admin_audit_logs", CREDENTIALING_STORAGE_KEY];

/** Remove exactly the records this seed created (and their field values). */
export function removeDemoRecords(): number {
  let removed = 0;
  for (const k of DEMO_KEYS) {
    const cur = readArr(k);
    if (cur.some(isDemoRecord)) {
      for (const r of cur.filter(isDemoRecord)) { try { localStorage.removeItem(`mantra_claim_fieldvalues_${r.id}`); } catch { /* ignore */ } }
      removed += cur.filter(isDemoRecord).length;
      localStorage.setItem(k, JSON.stringify(cur.filter((r) => !isDemoRecord(r))));
    }
  }
  try { const cur = JSON.parse(sessionStorage.getItem("scribeSessionsData") || "null"); if (Array.isArray(cur)) sessionStorage.setItem("scribeSessionsData", JSON.stringify(cur.filter((r: any) => !String(r?.id).startsWith(ID)))); } catch { /* ignore */ }
  try { const ap = JSON.parse(sessionStorage.getItem("appointments_v1") || "null"); if (Array.isArray(ap)) sessionStorage.setItem("appointments_v1", JSON.stringify(ap.filter((r: any) => !isDemoRecord(r)))); } catch { /* ignore */ }
  localStorage.removeItem(DEMO_SCRIBE_KEY);
  return removed;
}

/** Dev only: remove exactly the records this seed created and seed again. */
export function reseedDemoWorkspace(): DemoWorkspaceResult {
  removeDemoRecords();
  localStorage.removeItem(DEMO_WORKSPACE_FLAG);
  localStorage.removeItem(DEMO_WORKSPACE_FLAG_V1);
  return seedDemoWorkspace({ force: false });
}
