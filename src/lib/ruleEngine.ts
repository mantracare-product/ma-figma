import { eventBus, BusEvent } from "./eventBus";
import {
  AutomationRule,
  AutomationCondition,
  getStoredRules,
  saveStoredRules,
  logStageMove,
  validateRuleEntityTarget,
} from "./useAutomationStore";
import { getStoredProcesses, Process } from "./useProcessStore";
import { appointmentService } from "./appointmentService";
import { invoiceService } from "./invoiceService";

const MAX_CHAIN_DEPTH = 10;
const executedIdempotencyKeys = new Set<string>();

/**
 * Check if condition matches event data / record properties
 */
export function evaluateCondition(condition: AutomationCondition, data: Record<string, any> = {}): boolean {
  const actualValue = data[condition.field];
  const targetValue = condition.value;

  switch (condition.op) {
    case "equals":
      return String(actualValue ?? "").toLowerCase() === String(targetValue ?? "").toLowerCase();
    case "not_equals":
      return String(actualValue ?? "").toLowerCase() !== String(targetValue ?? "").toLowerCase();
    case "contains":
      return String(actualValue ?? "").toLowerCase().includes(String(targetValue ?? "").toLowerCase());
    case "greater_than":
      return Number(actualValue) > Number(targetValue);
    case "less_than":
      return Number(actualValue) < Number(targetValue);
    default:
      return true;
  }
}

export interface RuleExecutionResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  skippedReason?: string;
  movedToStageId?: string;
  movedToStageName?: string;
}

/**
 * Core Rule Execution Engine
 */
export async function executeRulesForEvent(
  event: BusEvent,
  depth = 0,
  visitedRules: Set<string> = new Set()
): Promise<RuleExecutionResult[]> {
  if (depth >= MAX_CHAIN_DEPTH) {
    console.warn(`[RuleEngine] Max execution chain depth (${MAX_CHAIN_DEPTH}) reached for record ${event.recordId}. Aborting cascade.`);
    return [];
  }

  const allRules = getStoredRules(event.orgId);
  const matchingRules = allRules.filter(
    (r) => r.enabled && r.entityType === event.recordType && r.trigger.event === event.event
  );

  const results: RuleExecutionResult[] = [];
  const processes = getStoredProcesses();

  for (const rule of matchingRules) {
    // 1. Loop Guard
    if (visitedRules.has(rule.id)) {
      console.warn(`[RuleEngine] Loop guard prevented rule "${rule.name}" (${rule.id}) from re-firing in the same chain.`);
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        matched: false,
        skippedReason: "Loop guard triggered (re-fire within same execution chain)",
      });
      continue;
    }

    // 2. Idempotency Check
    const idempotencyKey = `${event.recordId}:${rule.id}:${event.id}`;
    if (executedIdempotencyKeys.has(idempotencyKey)) {
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        matched: false,
        skippedReason: "Idempotent duplicate execution skipped",
      });
      continue;
    }

    // 3. Entity Target Validation
    const validation = validateRuleEntityTarget(rule, processes);
    if (!validation.valid) {
      console.error(`[RuleEngine] Rule validation failed for "${rule.name}":`, validation.error);
      rule.health = "failed";
      rule.healthMessage = validation.error;
      saveStoredRules(allRules);
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        matched: false,
        skippedReason: `Validation failed: ${validation.error}`,
      });
      continue;
    }

    // 4. Evaluate Conditions
    let conditionsPass = true;
    if (rule.conditions && rule.conditions.length > 0) {
      for (const cond of rule.conditions) {
        if (!evaluateCondition(cond, event.data || {})) {
          conditionsPass = false;
          break;
        }
      }
    }

    if (!conditionsPass) {
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        matched: false,
        skippedReason: "Conditions did not match event data",
      });
      continue;
    }

    // 5. Mark idempotency key as executed
    executedIdempotencyKeys.add(idempotencyKey);
    // Keep set bounded
    if (executedIdempotencyKeys.size > 2000) {
      const first = executedIdempotencyKeys.values().next().value;
      if (first) executedIdempotencyKeys.delete(first);
    }

    // 6. Find target process and stage
    const targetProcess = processes.find((p) => p.id === rule.action.processId);
    const targetStage = targetProcess?.stages.find((s) => s.id === rule.action.stageId);

    // 7. Log Stage Move
    const stageMove = logStageMove({
      orgId: event.orgId || "default",
      recordType: event.recordType,
      recordId: event.recordId,
      toStageId: rule.action.stageId,
      toStageName: targetStage?.name || rule.action.stageName || "Unknown Stage",
      processId: rule.action.processId,
      processName: targetProcess?.name || rule.action.processName || "Default Process",
      cause: {
        type: "rule",
        ruleId: rule.id,
        ruleName: rule.name,
        eventId: event.id,
        eventName: event.event,
      },
    });

    // 7b. Sync target stage to entity store
    if (event.recordType === "appointment") {
      try {
        appointmentService.updateAppointment(event.recordId, {
          currentStageId: rule.action.stageId,
          statusLabel: targetStage?.name,
        });
      } catch (err) {
        console.warn("[RuleEngine] Failed to sync appointment stage:", err);
      }
    } else if (event.recordType === "invoice") {
      try {
        const inv = invoiceService.getInvoiceById(event.recordId);
        if (inv) {
          invoiceService.saveInvoices(
            invoiceService.getInvoices().map((i) =>
              i.id === event.recordId
                ? { ...i, currentStageId: rule.action.stageId, statusLabel: targetStage?.name }
                : i
            )
          );
        }
      } catch (err) {
        console.warn("[RuleEngine] Failed to sync invoice stage:", err);
      }
    }

    // 7c. Execute Stage on-entry actions (e.g. generate_invoice)
    const stageSteps = (targetStage as any)?.workflowSteps || [];
    for (const step of stageSteps) {
      if (!step.trigger || step.trigger === "stage" || step.trigger === "enter_stage") {
        if (step.stepKey === "generate_invoice" && event.recordType === "appointment") {
          const appt = appointmentService.getAppointmentById(event.recordId);
          if (appt) {
            invoiceService.createInvoiceFromAppointment(
              {
                id: appt.id,
                clientId: appt.clientId || "c-1",
                clientName: appt.clientName,
                clientEmail: appt.clientEmail,
                clientPhone: appt.clientPhone,
                title: appt.title,
              },
              [],
              { createdBy: "system" }
            );
          }
        }
      }
    }

    // 7d. Execute Rule's Explicit Action Chain (e.g. Book Appointment, Generate Invoice, Send Payment, WhatsApp)
    const ruleActions = rule.actions || [];
    for (const act of ruleActions) {
      if (act.stepKey === "generate_invoice") {
        if (event.recordType === "appointment") {
          const appt = appointmentService.getAppointmentById(event.recordId);
          if (appt) {
            invoiceService.createInvoiceFromAppointment(
              {
                id: appt.id,
                clientId: appt.clientId || "c-1",
                clientName: appt.clientName,
                clientEmail: appt.clientEmail,
                clientPhone: appt.clientPhone,
                title: appt.title,
              },
              [],
              { createdBy: "system" }
            );
          }
        }
      } else if (act.stepKey === "scheduleappointment") {
        try {
          appointmentService.createAppointment({
            clientName: event.data?.clientName || event.data?.name || "Client",
            clientEmail: event.data?.clientEmail || event.data?.email || "client@example.com",
            clientPhone: event.data?.clientPhone || event.data?.phone || "+1-555-0100",
            employeeId: act.params?.employeeId || 1,
            date: act.params?.date || new Date().toISOString().split("T")[0],
            time: act.params?.time || "10:00",
            title: act.params?.title || "Automated Appointment",
            source: "ai",
          });
        } catch (e) {
          console.warn("[RuleEngine] Failed to schedule appointment from rule action:", e);
        }
      } else if (act.stepKey === "send_payment" || act.stepKey === "send-invoice") {
        try {
          if (event.recordType === "invoice") {
            invoiceService.sendInvoice(event.recordId, act.params?.channel || "whatsapp");
          }
        } catch (e) {
          console.warn("[RuleEngine] Failed to send payment/invoice from rule action:", e);
        }
      }
    }

    // 8. Update rule execution metrics
    rule.lastRunAt = new Date().toISOString();
    rule.health = "ok";
    rule.healthMessage = undefined;
    saveStoredRules(allRules);

    results.push({
      ruleId: rule.id,
      ruleName: rule.name,
      matched: true,
      movedToStageId: rule.action.stageId,
      movedToStageName: targetStage?.name,
    });

    // 9. Cascade: Emit stage entry event with loop tracking
    const nextVisited = new Set(visitedRules);
    nextVisited.add(rule.id);

    const enteredStageEvent: BusEvent = {
      id: `evt-stg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      event: `${event.recordType}.entered_stage`,
      recordType: event.recordType,
      recordId: event.recordId,
      orgId: event.orgId,
      data: {
        stageId: rule.action.stageId,
        stageName: targetStage?.name,
        processId: rule.action.processId,
        causeRuleId: rule.id,
      },
      timestamp: new Date().toISOString(),
    };

    // Recursively execute downstream rules with depth increment
    await executeRulesForEvent(enteredStageEvent, depth + 1, nextVisited);
  }

  return results;
}

// Auto-register Rule Engine listener to EventBus
let isInitialized = false;
export function initializeRuleEngine() {
  if (isInitialized) return;
  isInitialized = true;
  eventBus.subscribeAll(async (event) => {
    // Avoid re-processing internal cascaded entered_stage events if already handled
    if (!event.data?.causeRuleId) {
      await executeRulesForEvent(event);
    }
  });
}

// Initialize immediately in browser / app lifecycle
if (typeof window !== "undefined") {
  initializeRuleEngine();
}
