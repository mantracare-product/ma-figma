/** Human label + route for the record a task is linked to (entityRef). */
import type { TaskEntity } from "../types/task";
import { getProcessInstanceById } from "./processLogsStore";

export interface LinkedRecord {
  label: string;
  kindLabel: string;
  href?: string;
}

export function describeEntityRef(task: Pick<TaskEntity, "entityRef">): LinkedRecord | undefined {
  const r = task.entityRef;
  if (!r) return undefined;
  switch (r.type) {
    case "process_instance": {
      const inst = getProcessInstanceById(r.instanceId || r.id);
      const label = inst?.title || inst?.source?.title || (inst ? `${inst.client} - ${inst.process}` : `Process instance ${r.id}`);
      // TODO(rcm): Deals does not yet open the instance drawer from ?instance=; the link lands on the board.
      return { label, kindLabel: "Process instance", href: `/deals?instance=${encodeURIComponent(r.instanceId || r.id)}` };
    }
    case "appointment":
      return { label: `Appointment #${r.id}`, kindLabel: "Appointment", href: "/appointments" };
    case "claim":
      return { label: `Claim ${r.id}`, kindLabel: "Claim", href: "/claims" };
    case "invoice":
      return { label: `Invoice ${r.id}`, kindLabel: "Invoice", href: "/invoices" };
    case "client":
      return { label: `Client ${r.id}`, kindLabel: "Client", href: `/clients/${r.id}` };
    default:
      return { label: `${r.type} ${r.id}`, kindLabel: String(r.type) };
  }
}
