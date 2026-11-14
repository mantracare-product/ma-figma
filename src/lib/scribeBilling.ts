/**
 * Scribe -> billing (Slice 4, item 4.4): the Codes panel data and "Sign and send to billing".
 *
 * Codes live on the session (ScribeSession.codes). Signing marks the note signed and:
 *   - when a claim already exists for the session/appointment (created by a rule, e.g. at appointment.completed) the
 *     accepted codes are written into that claim (diagnosis codes + service lines priced from the fee schedule) and
 *     `claim.note_signed` is emitted for it;
 *   - otherwise `scribe.note_signed` is emitted for the client (a rule variant may create the claim at signing).
 */
import { recordRcmAudit } from "./rcmAudit";
import { getScribeSessionById, saveScribeSession, type ScribeSession } from "./scribeSessionStore";
import { getStoredClaims, saveClaim, type Claim, type ClaimDiagnosisCode, type ClaimServiceLine } from "./claimsStore";
import { lookupFee } from "./billingSetupStore";
import { getCPTCodeOption } from "./cptCodes";
import { eventBus } from "./eventBus";

export interface ScribeIcd {
  code: string;
  description: string;
}
export interface ScribeCpt {
  code: string;
  description: string;
  modifier?: string;
  units: number;
}
export interface ScribeCodes {
  icd: ScribeIcd[];
  cpt: ScribeCpt[];
  accepted: boolean;
  acceptedAt?: string;
  signedAt?: string;
}

export const LATERALITY_MODIFIERS = ["", "RT", "LT", "50"];

export function getSessionCodes(session: ScribeSession): ScribeCodes {
  const existing = (session as any).codes as ScribeCodes | undefined;
  if (existing) return existing;
  const icd = session.extractedData?.icd10Code ? [{ code: session.extractedData.icd10Code, description: session.extractedData.diagnosis || "" }] : [];
  return { icd, cpt: [], accepted: false };
}

export function saveSessionCodes(sessionId: string, codes: ScribeCodes): ScribeSession | undefined {
  const s = getScribeSessionById(sessionId);
  if (!s) return undefined;
  const next = { ...s, codes } as ScribeSession;
  saveScribeSession(next);
  return next;
}

export function acceptCodes(sessionId: string, codes: Omit<ScribeCodes, "accepted" | "acceptedAt">): ScribeCodes {
  const accepted: ScribeCodes = { ...codes, accepted: true, acceptedAt: new Date().toISOString() };
  if (!saveSessionCodes(sessionId, accepted)) throw new Error(`Scribe session ${sessionId} not found`);
  return accepted;
}

/** Write accepted codes into a claim: diagnosis pointers A-D (max 4) and service lines priced from the fee schedule. */
export function applyCodesToClaim(claim: Claim, codes: ScribeCodes, serviceDate: string): Claim {
  const pointers: Array<ClaimDiagnosisCode["pointer"]> = ["A", "B", "C", "D"];
  const diagnosisCodes: ClaimDiagnosisCode[] = codes.icd.slice(0, 4).map((d, i) => ({ pointer: pointers[i], code: d.code, description: d.description }));
  const lines: ClaimServiceLine[] = codes.cpt.map((c, i) => {
    const unit = lookupFee(c.code, claim.payer?.id);
    return {
      id: `ln-${claim.id}-${i + 1}`,
      serviceDate,
      cptCode: c.code,
      description: c.description || getCPTCodeOption(c.code)?.description || c.code,
      modifier: c.modifier || undefined,
      diagnosisPointer: diagnosisCodes.map((d) => d.pointer).join(", ") || "A",
      units: c.units || 1,
      chargeAmount: (unit ?? 0) * (c.units || 1),
    };
  });
  return { ...claim, diagnosisCodes, lines, totalCharge: lines.reduce((a, l) => a + l.chargeAmount, 0) || claim.totalCharge };
}

export interface SignResult {
  signedAt: string;
  claimId?: string;
  event: "claim.note_signed" | "scribe.note_signed";
}

export async function signAndSendToBilling(sessionId: string): Promise<SignResult> {
  const session = getScribeSessionById(sessionId);
  if (!session) throw new Error(`Scribe session ${sessionId} not found`);
  const codes = getSessionCodes(session);
  if (!codes.accepted) throw new Error("Accept the codes before signing");
  const signedAt = new Date().toISOString();
  saveSessionCodes(sessionId, { ...codes, signedAt });
  recordRcmAudit({ action: "updated", entityType: "scribe_session", entityId: sessionId, summary: `Signed the note and sent ${codes.cpt.length} procedure and ${codes.icd.length} diagnosis code(s) to billing`, after: { cpt: codes.cpt.map((c) => c.code + (c.modifier ? "-" + c.modifier : "")), icd: codes.icd.map((c) => c.code) } });

  const claim = getStoredClaims().find(
    (c) => c.scribeSessionId === session.id || (session.appointmentId !== undefined && c.appointmentId !== undefined && String(c.appointmentId) === String(session.appointmentId))
  );
  if (claim) {
    const date = (session.sessionDate || signedAt).slice(0, 10);
    const updated = applyCodesToClaim({ ...claim, scribeSessionId: session.id }, codes, claim.serviceDate || date);
    saveClaim(updated);
    await eventBus.emit("claim.note_signed", "claim", claim.id, { ...updated, claimId: claim.id, clientId: claim.patientId, sessionId: session.id });
    return { signedAt, claimId: claim.id, event: "claim.note_signed" };
  }
  await eventBus.emit("scribe.note_signed", "client", session.clientId, {
    clientId: session.clientId,
    sessionId: session.id,
    appointmentId: session.appointmentId !== undefined ? String(session.appointmentId) : undefined,
    codes,
  });
  return { signedAt, event: "scribe.note_signed" };
}
