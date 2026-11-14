import { describe, it, expect } from "vitest";
import { reconcileDealCards, dealTitleForInstance, type DealCardLike } from "../dealCards";
import type { CallLog } from "../processLogsStore";

const inst = (id: string, stage: string, apptId: string, extra: Partial<CallLog> = {}): CallLog => ({
  id,
  instanceId: id,
  kind: "process_instance",
  client: "Test Patient",
  clientId: "CL-TEST",
  type: "WhatsApp",
  status: "In Progress",
  process: "Sample Process",
  processId: "proc-sample",
  currentStage: stage,
  duration: "0:00",
  date: "2026-11-14 10:00",
  hasRecording: false,
  hasTranscript: true,
  hasScheduledCall: false,
  source: { type: "appointment", id: apptId, title: `Eye exam — 2026-11-20 10:30 (Appt #${apptId})` },
  createdAt: "2026-11-14T10:00:00.000Z",
  ...extra,
});

const card = (id: string, extra: Partial<DealCardLike> = {}): DealCardLike => ({
  id,
  dealName: "Legacy card",
  clientName: "Test Patient",
  amount: 0,
  currency: "₹",
  createdDate: "2026-11-01",
  status: "In Progress",
  responsible: "Dr X",
  stage: "Sample Process: Not checked",
  ...extra,
});

describe("reconcileDealCards: one card per instance", () => {
  it("creates one card per instance, each titled from its source, for the same client + process", () => {
    const { deals, changed } = reconcileDealCards([], [inst("PI-1", "Not checked", "101"), inst("PI-2", "Not checked", "102")]);
    expect(changed).toBe(true);
    expect(deals).toHaveLength(2);
    expect(new Set(deals.map((d) => d.instanceId)).size).toBe(2);
    expect(deals.map((d) => d.title).sort()).toEqual([
      "Eye exam — 2026-11-20 10:30 (Appt #101)",
      "Eye exam — 2026-11-20 10:30 (Appt #102)",
    ]);
    expect(deals.every((d) => d.clientId === "CL-TEST" && d.stage === "Sample Process: Not checked")).toBe(true);
  });

  it("is idempotent and returns the same array reference when nothing changes", () => {
    const rows = [inst("PI-1", "Not checked", "101"), inst("PI-2", "Not checked", "102")];
    const first = reconcileDealCards([], rows);
    const second = reconcileDealCards(first.deals, rows);
    expect(second.changed).toBe(false);
    expect(second.deals).toBe(first.deals);
    expect(second.deals).toHaveLength(2);
  });

  it("syncs a card's stage from its instance (the instance is the source of truth)", () => {
    const first = reconcileDealCards([], [inst("PI-1", "Not checked", "101")]);
    const moved = reconcileDealCards(first.deals, [inst("PI-1", "Needs fix", "101")]);
    expect(moved.changed).toBe(true);
    expect(moved.deals[0].stage).toBe("Sample Process: Needs fix");
  });

  it("moving one instance does not move the other instance's card", () => {
    const rows = [inst("PI-1", "Not checked", "101"), inst("PI-2", "Not checked", "102")];
    const first = reconcileDealCards([], rows);
    const after = reconcileDealCards(first.deals, [inst("PI-1", "Verified", "101"), inst("PI-2", "Not checked", "102")]);
    const byInst = Object.fromEntries(after.deals.map((d) => [d.instanceId, d.stage]));
    expect(byInst["PI-1"]).toBe("Sample Process: Verified");
    expect(byInst["PI-2"]).toBe("Sample Process: Not checked");
  });

  it("adopts an unambiguous legacy card (single instance, single card)", () => {
    const { deals } = reconcileDealCards([card("DEAL-OLD")], [inst("PI-1", "Not checked", "101")]);
    expect(deals).toHaveLength(1);
    expect(deals[0].id).toBe("DEAL-OLD");
    expect(deals[0].instanceId).toBe("PI-1");
    expect(deals[0].clientId).toBe("CL-TEST");
  });

  it("does NOT adopt a legacy card when the client has several instances of the process (no guessing)", () => {
    const { deals } = reconcileDealCards(
      [card("DEAL-OLD")],
      [inst("PI-1", "Not checked", "101"), inst("PI-2", "Not checked", "102")]
    );
    const legacy = deals.find((d) => d.id === "DEAL-OLD")!;
    expect(legacy.instanceId).toBeUndefined();
    expect(deals.filter((d) => d.instanceId)).toHaveLength(2);
    expect(deals).toHaveLength(3);
  });

  it("leaves cards of other clients/processes alone", () => {
    const other = card("DEAL-OTHER", { clientName: "Someone Else", stage: "Other Process: Stage 1" });
    const { deals } = reconcileDealCards([other], [inst("PI-1", "Not checked", "101")]);
    expect(deals.find((d) => d.id === "DEAL-OTHER")).toEqual(other);
  });

  it("dealTitleForInstance prefers an explicit title, then the source title, then 'Client - Process'", () => {
    expect(dealTitleForInstance({ title: "T", source: { type: "x", id: "1", title: "S" }, client: "C", process: "P" })).toBe("T");
    expect(dealTitleForInstance({ source: { type: "x", id: "1", title: "S" }, client: "C", process: "P" })).toBe("S");
    expect(dealTitleForInstance({ client: "C", process: "P" })).toBe("C - P");
  });
});
