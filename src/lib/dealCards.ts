import type { CallLog } from "./processLogsStore";

/**
 * Deal cards (the Deals kanban) vs process instances.
 *
 * Every process instance has exactly ONE deal card, linked by `instanceId`. `reconcileDealCards` is a pure function
 * that enforces this regardless of which code path created the instance (UI, kiosk, rule action, migration):
 *   1. a card already linked to the instance is kept (its stage is synced from the instance, the source of truth);
 *   2. otherwise an UNAMBIGUOUS legacy card (same client + process, no instanceId, and the client has exactly one
 *      instance of that process) is adopted;
 *   3. otherwise a new card is created, titled from the instance source.
 * Cards whose instance no longer exists are left alone (never auto-deleted).
 */
export interface DealCardLike {
  id: string;
  dealName: string;
  clientName: string;
  clientId?: string;
  amount: number;
  currency: string;
  createdDate: string;
  status: "In Progress" | "Won" | "Lost";
  responsible: string;
  stage: string;
  instanceId?: string;
  title?: string;
  source?: { type: string; id: string; title?: string };
}

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();

/** Card title for an instance, e.g. "Eye exam — 2026-11-20 10:30 (Appt #123)"; falls back to "Client - Process". */
export function dealTitleForInstance(row: Pick<CallLog, "title" | "source" | "client" | "process">): string {
  return row.title || row.source?.title || `${row.client} - ${row.process}`;
}

function sameClient(card: DealCardLike, row: CallLog): boolean {
  return (!!card.clientId && card.clientId === row.clientId) || (!!card.clientName && norm(card.clientName) === norm(row.client));
}

export function reconcileDealCards<T extends DealCardLike>(
  deals: T[],
  instances: CallLog[],
  opts?: { responsibleOf?: (clientId: string, clientName: string) => string | undefined; today?: string }
): { deals: T[]; changed: boolean } {
  let changed = false;
  const out: T[] = deals.map((d) => ({ ...d }));
  const byInstance = new Map<string, T>();
  for (const d of out) if (d.instanceId) byInstance.set(d.instanceId, d);

  for (const row of instances) {
    const iid = row.instanceId || row.id;
    const stageStr = `${row.process}: ${row.currentStage}`;
    let card = byInstance.get(iid);

    if (!card) {
      const sameClientProcessInstances = instances.filter(
        (i) => norm(i.process) === norm(row.process) && (i.clientId === row.clientId || norm(i.client) === norm(row.client))
      ).length;
      if (sameClientProcessInstances === 1) {
        const candidates = out.filter(
          (d) => !d.instanceId && sameClient(d, row) && norm(d.stage).startsWith(`${norm(row.process)}:`)
        );
        if (candidates.length === 1) {
          card = candidates[0];
          card.instanceId = iid;
          if (!card.clientId) card.clientId = row.clientId;
          byInstance.set(iid, card);
          changed = true;
        }
      }
    }

    if (!card) {
      const created = (row.createdAt || "").slice(0, 10) || opts?.today || new Date().toISOString().slice(0, 10);
      const title = dealTitleForInstance(row);
      const newCard = {
        id: `DEAL-${iid}`,
        dealName: title,
        clientName: row.client,
        clientId: row.clientId,
        amount: 0,
        currency: "₹",
        createdDate: created,
        status: "In Progress",
        responsible: opts?.responsibleOf?.(row.clientId, row.client) || "Unassigned",
        stage: stageStr,
        instanceId: iid,
        title,
        source: row.source,
      } as unknown as T;
      out.unshift(newCard);
      byInstance.set(iid, newCard);
      changed = true;
      continue;
    }

    if (card.stage !== stageStr) {
      card.stage = stageStr;
      changed = true;
    }
    if (row.source && !card.source) {
      card.source = row.source;
      changed = true;
    }
    const title = row.title || row.source?.title;
    if (title && card.title !== title) {
      card.title = title;
      changed = true;
    }
  }

  return { deals: changed ? out : deals, changed };
}
