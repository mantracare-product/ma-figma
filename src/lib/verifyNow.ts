/**
 * "Verify now" helpers (Slice 3, item 3.4). Manual eligibility checks always call the (mock) payer (window 0).
 *  - verifyAppointmentNow: runs and WRITES to the appointment (and its instance when one exists).
 *  - previewEligibility: for a booking that does not exist yet; NOTHING is written.
 * Callers must gate the button with hasPermission("eligibility", ...).
 */
import { appointmentService } from "./appointmentService";
import { findClientByRef, instancesForAppointment } from "./recordContext";
import { getCoverageOn } from "./coveragesStore";
import { getPayer } from "./billingSetupStore";
import { performRunEligibility, type RunEligibilityResult } from "./runEligibility";
import { mockEligibilityCheck, normalizeBenefits, requestVariant, resolveEligibilityResponse, type ResultStatus } from "./eligibility";

export function verifyAppointmentNow(appointmentId: string | number): RunEligibilityResult {
  const appt = appointmentService.getAppointmentById(appointmentId);
  if (!appt) throw new Error(`Appointment ${appointmentId} not found`);
  const client = findClientByRef(appt.clientId || appt.clientName);
  if (!client) throw new Error("Client not found for this appointment");
  const instance = instancesForAppointment(appt.id)[0];
  return performRunEligibility({
    clientId: client.id,
    appointmentId: String(appt.id),
    instanceId: instance ? instance.instanceId || instance.id : undefined,
    serviceDate: appt.date,
    trigger: "manual.verify_now",
    params: { windowDays: 0 },
    cause: { type: "manual" },
  });
}

export interface EligibilityPreview {
  status: ResultStatus;
  summary: string;
  payerName?: string;
  /** Always true: the payer adapter is simulated. */
  mock: true;
}

export function previewEligibility(clientRef: string, serviceDate: string): EligibilityPreview {
  const client = findClientByRef(clientRef);
  const cov = client ? getCoverageOn(client.id, serviceDate, "primary") : undefined;
  if (!client || !cov) return { status: "no_coverage", summary: "No coverage on file for the service date", mock: true };
  const payer = getPayer(cov.payerId);
  const req = {
    payerId: cov.payerId,
    payerEnrolled: payer ? payer.enrollment.status === "enrolled" : undefined,
    memberId: cov.memberId,
    firstName: (client as any).legalFirstName,
    lastName: (client as any).legalLastName,
    dob: (client as any).dob,
    serviceDate,
    serviceTypes: ["30"],
  };
  let attempt = 0;
  let res = mockEligibilityCheck(requestVariant(req, attempt));
  let r = resolveEligibilityResponse(res);
  while (r.retry && attempt < 2) {
    attempt += 1;
    res = mockEligibilityCheck(requestVariant(req, attempt));
    r = resolveEligibilityResponse(res);
  }
  if (r.status === "active") {
    const s = normalizeBenefits(res.benefits, ["30"]).summary;
    return { status: "active", summary: `Active · copay ${s.copay ?? "-"} · deductible left ${s.deductibleRemaining ?? "-"}`, payerName: payer?.name, mock: true };
  }
  return { status: r.status, summary: r.message, payerName: payer?.name, mock: true };
}
