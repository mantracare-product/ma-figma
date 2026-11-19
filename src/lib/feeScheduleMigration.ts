/**
 * R5.B Migration: Fees live on the service only.
 * Default schedule lines set a service's price only when it has none;
 * on conflict keep the service price and log it; unmatched lines are logged, not dropped.
 * Payer-specific schedules are no longer used or shown (data stays in storage).
 */
import { feeSchedulesStore, SAMPLE_FEE_SCHEDULES } from "./billingSetupStore";
import { getStoredServices, saveStoredServices, Service } from "./servicesStore";
import { logMigration } from "./stageCallMigration";

const FLAG = "mantra_fee_schedule_migrated_v1";

export function getServicePriceForCpt(cptCode: string): number | undefined {
  if (!cptCode) return undefined;
  const services = getStoredServices();
  const matched = services.find((s) => s.cptCode === cptCode);
  if (matched && typeof matched.price === "number" && matched.price > 0) {
    return matched.price;
  }
  return undefined;
}

export function migrateFeeSchedulesToServicePrices(): { servicesUpdated: number; conflicts: number; unmatched: number } {
  const result = { servicesUpdated: 0, conflicts: 0, unmatched: 0 };
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem(FLAG) === "1") {
      return result;
    }

    const storedSchedules = feeSchedulesStore.get();
    const schedules = storedSchedules.length > 0 ? storedSchedules : SAMPLE_FEE_SCHEDULES;
    const defaultSchedule = schedules.find((s) => !s.payerId) || schedules[0];
    if (!defaultSchedule || !defaultSchedule.lines || defaultSchedule.lines.length === 0) {
      if (typeof localStorage !== "undefined") localStorage.setItem(FLAG, "1");
      return result;
    }

    const services = getStoredServices();
    let servicesChanged = false;

    for (const line of defaultSchedule.lines) {
      const cpt = line.cpt || (line as any).cptCode;
      const amount = line.amount;
      if (!cpt || typeof amount !== "number") continue;

      const matched = services.filter((s) => s.cptCode === cpt);
      if (matched.length > 0) {
        for (const s of matched) {
          if (s.price === undefined || s.price === null || s.price === 0) {
            s.price = amount;
            servicesChanged = true;
            result.servicesUpdated++;
            logMigration("R5.B", `Set service "${s.name}" (${s.cptCode}) price to $${amount} from default schedule`);
          } else if (s.price !== amount) {
            result.conflicts++;
            logMigration("R5.B", `Conflict on service "${s.name}" (${s.cptCode}): kept service price $${s.price}, ignored schedule amount $${amount}`);
          }
        }
      } else {
        result.unmatched++;
        logMigration("R5.B", `Unmatched default schedule line CPT ${cpt} ($${amount}) - no matching service found`);
      }
    }

    if (servicesChanged) {
      saveStoredServices(services);
    }

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(FLAG, "1");
    }
  } catch (err) {
    console.warn("migrateFeeSchedulesToServicePrices error:", err);
  }
  return result;
}
