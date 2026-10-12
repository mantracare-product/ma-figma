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
import { invoiceService, generateInvoiceDocument } from "./invoiceService";
import { getClientProducts } from "./servicesStore";
import { saveClientDocument, StoredClientDocument } from "./clientDocumentsStore";
import { appendActivity } from "./activityEngine";
import { getStoredDocumentTemplates } from "./documentTemplatesStore";
import { getClientList } from "./getClientList";

const MAX_CHAIN_DEPTH = 10;
const executedIdempotencyKeys = new Set<string>();

/**
 * Check if condition matches event data / record properties
 */
export function evaluateCondition(condition: any, data: Record<string, any> = {}): boolean {
  if (!condition) return true;
  const fieldKey = condition.field || condition.fieldToFilter || condition.fieldKey || "";
  if (!fieldKey) return true;

  // Resolve actual value from event data
  let actualValue = data[fieldKey];
  if (actualValue === undefined && fieldKey.includes(".")) {
    const parts = fieldKey.split(".");
    actualValue = data[parts[parts.length - 1]];
  }
  if (actualValue === undefined) {
    const lowerKey = fieldKey.toLowerCase();
    const shortKey = fieldKey.includes(".") ? fieldKey.split(".").pop()?.toLowerCase() : lowerKey;
    const foundKey = Object.keys(data).find(
      (k) => k.toLowerCase() === lowerKey || (shortKey && k.toLowerCase() === shortKey)
    );
    if (foundKey) actualValue = data[foundKey];
  }

  const op = (condition.op || condition.operator || "equals").toLowerCase();
  let targetValue = condition.value ?? condition.filterValue ?? condition.targetValue ?? "";

  // Dynamic field value comparison support (e.g. Due Amount > Paid Amount)
  if (condition.valueType === "dynamic" && condition.dynamicField) {
    const dynKey = condition.dynamicField;
    let dynActual = data[dynKey];
    if (dynActual === undefined && dynKey.includes(".")) {
      const parts = dynKey.split(".");
      dynActual = data[parts[parts.length - 1]];
    }
    if (dynActual === undefined) {
      const lowerKey = dynKey.toLowerCase();
      const shortKey = dynKey.includes(".") ? dynKey.split(".").pop()?.toLowerCase() : lowerKey;
      const foundKey = Object.keys(data).find(
        (k) => k.toLowerCase() === lowerKey || (shortKey && k.toLowerCase() === shortKey)
      );
      if (foundKey) dynActual = data[foundKey];
    }
    if (dynActual !== undefined) {
      targetValue = dynActual;
    }
  }

  const normSource = (v: any) => {
    const s = String(v ?? "").trim().toLowerCase().replace(/[_\s-]+/g, " ");
    if (s.includes("walk") || s.includes("reception")) return "walked in";
    if (s.includes("ma client") || s.includes("patient portal") || s.includes("client portal")) return "ma-client";
    if (s.includes("inbound") || s.includes("call")) return "inbound call";
    return s;
  };

  const isSourceField = fieldKey.toLowerCase().includes("source");
  if (isSourceField) {
    const nsActual = normSource(actualValue);
    const nsTarget = normSource(targetValue);
    if (op === "equals" || op === "equal_to" || op === "is") {
      return nsActual === nsTarget || String(actualValue ?? "").trim().toLowerCase() === String(targetValue ?? "").trim().toLowerCase();
    }
    if (op === "not_equals" || op === "not_equal_to" || op === "is_not") {
      return nsActual !== nsTarget && String(actualValue ?? "").trim().toLowerCase() !== String(targetValue ?? "").trim().toLowerCase();
    }
  }

  switch (op) {
    case "equals":
    case "equal_to":
    case "is":
      return String(actualValue ?? "").trim().toLowerCase() === String(targetValue ?? "").trim().toLowerCase();
    case "not_equals":
    case "not_equal_to":
    case "is_not":
      return String(actualValue ?? "").trim().toLowerCase() !== String(targetValue ?? "").trim().toLowerCase();
    case "contains":
    case "includes":
      return String(actualValue ?? "").toLowerCase().includes(String(targetValue ?? "").toLowerCase());
    case "not_contains":
      return !String(actualValue ?? "").toLowerCase().includes(String(targetValue ?? "").toLowerCase());
    case "starts_with":
      return String(actualValue ?? "").toLowerCase().startsWith(String(targetValue ?? "").toLowerCase());
    case "ends_with":
      return String(actualValue ?? "").toLowerCase().endsWith(String(targetValue ?? "").toLowerCase());
    case "greater_than":
    case "gt":
      return Number(actualValue) > Number(targetValue);
    case "less_than":
    case "lt":
      return Number(actualValue) < Number(targetValue);
    case "greater_than_or_equal":
    case "gte":
      return Number(actualValue) >= Number(targetValue);
    case "less_than_or_equal":
    case "lte":
      return Number(actualValue) <= Number(targetValue);
    case "is_empty":
    case "empty":
      return actualValue === undefined || actualValue === null || String(actualValue).trim() === "";
    case "is_not_empty":
    case "not_empty":
      return actualValue !== undefined && actualValue !== null && String(actualValue).trim() !== "";
    default:
      return String(actualValue ?? "").trim().toLowerCase() === String(targetValue ?? "").trim().toLowerCase();
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

export function flattenRuleSteps(steps: any[]): any[] {
  const flattened: any[] = [];
  if (!Array.isArray(steps)) return flattened;
  for (const step of steps) {
    flattened.push(step);
    if (Array.isArray(step.branches)) {
      for (const branch of step.branches) {
        if (Array.isArray(branch.steps)) {
          flattened.push(...flattenRuleSteps(branch.steps));
        }
      }
    }
  }
  return flattened;
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
  const norm = (s?: string) => (s || "").trim().toLowerCase().replace(/[\s_-]+/g, ".");
  const busEvt = norm(event.event);

  const matchingRules = allRules.filter((r) => {
    if (!r.enabled) return false;
    const ruleEvt = norm(r.trigger?.event);
    const ruleLabel = norm(r.trigger?.label);

    const isDirectMatch = ruleEvt === busEvt || ruleLabel === busEvt;
    const isStageMatch =
      (ruleEvt === "stage.entered" || ruleEvt === "stage.entry" || ruleEvt.endsWith(".entered_stage") || ruleEvt.endsWith(".entered.stage")) &&
      (busEvt === "stage.entered" || busEvt === "stage.entry" || busEvt.endsWith(".entered_stage") || busEvt.endsWith(".entered.stage"));
    const isStageExitMatch =
      (ruleEvt === "stage.exited" || ruleEvt === "stage.exit" || ruleEvt.endsWith(".exited_stage") || ruleEvt.endsWith(".exited.stage")) &&
      (busEvt === "stage.exited" || busEvt === "stage.exit" || busEvt.endsWith(".exited_stage") || busEvt.endsWith(".exited.stage"));
    const isFieldMatch =
      (ruleEvt.includes("field") || ruleEvt === "field_update") &&
      (busEvt.includes("field") || busEvt === "field_update");

    if (!isDirectMatch && !isStageMatch && !isStageExitMatch && !isFieldMatch) {
      return false;
    }

    const ruleEntity = (r.entityType || "").toLowerCase();
    const eventRecord = (event.recordType || "").toLowerCase();
    if (
      ruleEntity &&
      ruleEntity !== eventRecord &&
      !ruleEvt.startsWith(`${eventRecord}.`) &&
      !ruleLabel.startsWith(eventRecord)
    ) {
      if (!isStageMatch && !isStageExitMatch && !isFieldMatch) {
        return false;
      }
    }

    return true;
  });

  const results: RuleExecutionResult[] = [];
  const processes = getStoredProcesses();

  for (const rule of matchingRules) {
    // Stage Filter check
    if (rule.trigger.event.startsWith("stage.") || rule.trigger.event.includes("stage")) {
      const filterStageId = rule.trigger.params?.triggerStageId || rule.trigger.params?.stageId;
      if (filterStageId && filterStageId !== "all") {
        const evStageId = event.data?.stageId || event.data?.toStageId || event.data?.currentStageId;
        if (evStageId && evStageId !== filterStageId) {
          continue;
        }
      }
      const filterProcessId = rule.trigger.params?.triggerProcessId || rule.trigger.params?.processId;
      if (filterProcessId && filterProcessId !== "all") {
        const evProcessId = event.data?.processId;
        if (evProcessId && evProcessId !== filterProcessId) {
          continue;
        }
      }
    }

    // Field Update Filter check
    if (
      rule.trigger.event === "field.updated" ||
      rule.trigger.event === "field_update" ||
      rule.trigger.event.includes("field")
    ) {
      const monitoredFields: string[] =
        rule.trigger.params?.monitoredFields || rule.trigger.params?.fields || [];
      const matchLogic: string = rule.trigger.params?.matchLogic || "any";

      if (monitoredFields.length > 0) {
        const updatedFieldsList: string[] = [];
        if (event.data?.updatedFields && Array.isArray(event.data.updatedFields)) {
          updatedFieldsList.push(...event.data.updatedFields);
        }
        if (event.data?.updatedField && typeof event.data.updatedField === "string") {
          updatedFieldsList.push(event.data.updatedField);
        }
        if (event.data?.fieldKey && typeof event.data.fieldKey === "string") {
          updatedFieldsList.push(event.data.fieldKey);
        }

        const normClean = (s: string) =>
          s.trim().toLowerCase().replace(/^\{+|\}+$/g, "").replace(/[^a-z0-9]/g, "");
        const normUpdated = new Set(updatedFieldsList.map(normClean));

        if (normUpdated.size > 0) {
          const normMonitored = monitoredFields.map(normClean);
          if (matchLogic === "all") {
            const allMatch = normMonitored.every((f) => normUpdated.has(f));
            if (!allMatch) {
              continue;
            }
          } else {
            // "any"
            const anyMatch = normMonitored.some((f) => normUpdated.has(f));
            if (!anyMatch) {
              continue;
            }
          }
        }
      }
    }

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

    // 4. Evaluate Conditions & Trigger Conditions
    let conditionsPass = true;
    if (rule.conditions && rule.conditions.length > 0) {
      for (const cond of rule.conditions) {
        if (!evaluateCondition(cond, event.data || {})) {
          conditionsPass = false;
          break;
        }
      }
    }

    const triggerConditions = rule.trigger.params?.triggerConditions || [];
    if (conditionsPass && Array.isArray(triggerConditions) && triggerConditions.length > 0) {
      for (const cond of triggerConditions) {
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
    if (executedIdempotencyKeys.size > 2000) {
      const first = executedIdempotencyKeys.values().next().value;
      if (first) executedIdempotencyKeys.delete(first);
    }

    // 6. Handle top-level moveToStage action ONLY if a valid stageId is provided
    const hasTopLevelMove = Boolean(
      rule.action?.type === "moveToStage" && rule.action?.stageId && rule.action.stageId.trim() !== ""
    );
    const targetProcess = hasTopLevelMove ? processes.find((p) => p.id === rule.action.processId) : undefined;
    const targetStage = hasTopLevelMove ? targetProcess?.stages.find((s) => s.id === rule.action.stageId) : undefined;

    if (hasTopLevelMove && rule.action?.stageId) {
      logStageMove({
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

      if (event.recordType === "appointment") {
        try {
          appointmentService.moveToStage(event.recordId, rule.action.stageId, {
            type: "rule",
            ruleName: rule.name,
            processId: rule.action.processId,
          });
        } catch (err) {
          console.warn("[RuleEngine] Failed to sync appointment stage:", err);
        }
      } else if (event.recordType === "invoice") {
        try {
          invoiceService.moveToStage(event.recordId, rule.action.stageId, {
            type: "rule",
            ruleName: rule.name,
          });
        } catch (err) {
          console.warn("[RuleEngine] Failed to sync invoice stage:", err);
        }
      }
    }

    // 7. Execute Rule's Step Actions Chain (from FlowBuilderTab / Canvas / Library)
    const allActions = flattenRuleSteps(rule.actions && rule.actions.length > 0 ? rule.actions : (rule as any).steps || []);
    for (const act of allActions) {
      const stepKey = (act.stepKey || "").toLowerCase();

      // Condition Step Node: Gate downstream steps behind condition rules
      if (stepKey === "condition") {
        const rules = act.params?.conditionRules || [];
        if (Array.isArray(rules) && rules.length > 0) {
          const pass = rules.every((r: any) => evaluateCondition(r, event.data || {}));
          if (!pass) {
            console.log(`[RuleEngine] Condition step "${act.name || act.id}" evaluated to false. Halting flow for rule "${rule.name}".`);
            break;
          }
        }
      }

      // Action: Field Update
      if (stepKey === "fieldupdate" || stepKey === "field-update" || stepKey === "field_update") {
        const blocks = act.params?.fieldUpdateBlocks || [];
        if (Array.isArray(blocks) && blocks.length > 0) {
          for (const block of blocks) {
            const fieldKey = block.fieldToEdit || block.field;
            const updateVal = block.updateValue !== undefined ? block.updateValue : block.value;
            if (fieldKey) {
              if (event.data) {
                event.data[fieldKey] = updateVal;
              }
              appendActivity({
                type: "field_update",
                clientId: String(event.recordId),
                processId: "general",
                processName: "Field Update Automation",
                timestamp: new Date().toISOString(),
                fieldLabel: block.fieldLabel || fieldKey,
                newValue: String(updateVal),
                details: {
                  primary: `Field ${block.fieldLabel || fieldKey} updated to "${updateVal}"`,
                  secondary: `Via rule "${rule.name}"`,
                },
              });
            }
          }
        }
      }

      // Action: Update Stage / Move To Stage
      if (
        stepKey === "update_to_stage" ||
        stepKey === "update-stage" ||
        stepKey === "movetostage" ||
        stepKey === "move_to_stage" ||
        stepKey === "move-stage" ||
        stepKey === "stage_movement" ||
        stepKey === "stagemovement" ||
        stepKey === "processmovement"
      ) {
        const rawTargetEntity = act.params?.stageEntity || act.params?.entityType;
        const targetStageId = act.params?.stageId || act.params?.stepDetailStage || act.params?.stageName || act.params?.stepDetailStageName;

        if (targetStageId) {
          // If explicitly invoice or target stage belongs to invoice
          const isInvoiceTarget = rawTargetEntity === "invoice" || (!rawTargetEntity && event.recordType === "invoice");
          const isAppointmentTarget = rawTargetEntity === "appointment" || (!rawTargetEntity && event.recordType === "appointment");

          if (isAppointmentTarget || (!isInvoiceTarget && event.recordType === "appointment")) {
            const apptId = event.recordType === "appointment" ? event.recordId : act.params?.appointmentId;
            if (apptId) {
              try {
                appointmentService.moveToStage(apptId, targetStageId, {
                  type: "rule",
                  ruleName: rule.name,
                  processId: act.params?.processId || act.params?.stepDetailProcess,
                });
                console.log(`[RuleEngine] Moved appointment ${apptId} to stage ${targetStageId} via rule "${rule.name}"`);
              } catch (e) {
                console.warn("[RuleEngine] Failed to move appointment stage:", e);
              }
            }
          }

          if (isInvoiceTarget || (!isAppointmentTarget && event.recordType === "invoice") || (rawTargetEntity === "invoice" && event.recordType === "appointment")) {
            const currentAppt = event.recordType === "appointment" ? appointmentService.getAppointmentById(event.recordId) : undefined;
            const invId = event.recordType === "invoice" ? event.recordId : (event.data?.invoiceId || act.params?.invoiceId || currentAppt?.invoiceId);
            if (invId) {
              try {
                invoiceService.moveToStage(invId, targetStageId, {
                  type: "rule",
                  ruleName: rule.name,
                });
                console.log(`[RuleEngine] Moved invoice ${invId} to stage ${targetStageId} via rule "${rule.name}"`);
              } catch (e) {
                console.warn("[RuleEngine] Failed to move invoice stage:", e);
              }
            }
          }
        }
      }

      // Action: Generate Invoice
      if (stepKey === "generate_invoice" || stepKey === "generate-invoice" || stepKey === "create_invoice") {
        if (event.recordType === "appointment") {
          const appt = appointmentService.getAppointmentById(event.recordId);
          if (appt) {
            let lineItems: any[] = [];
            if (act.params?.billFor === "choose" && Array.isArray(act.params?.selectedServices) && act.params.selectedServices.length > 0) {
              lineItems = act.params.selectedServices.map((s: any, idx: number) => ({
                id: `li-${appt.id}-${idx}`,
                source: "service",
                serviceId: s.serviceId,
                description: s.name,
                quantity: s.quantity || 1,
                unitPrice: s.unitPrice || 150,
                discountAmount: s.discount || 0,
                taxPercent: s.taxPercent ?? 5,
              }));
            }
            const discountVal = act.params?.discount ?? 0;
            const discountType = act.params?.discountType === "$" ? "amount" : "percent";
            const dueDays = typeof act.params?.dueDays === "number" ? act.params.dueDays : 14;
            const dueDate = new Date(Date.now() + dueDays * 86400000).toISOString().split("T")[0];

            const { invoice } = invoiceService.createInvoiceFromAppointment(
              {
                id: appt.id,
                clientId: appt.clientId || "c-1",
                clientName: appt.clientName,
                clientEmail: appt.clientEmail,
                clientPhone: appt.clientPhone,
                title: appt.title,
              },
              lineItems,
              {
                createdBy: "system",
                discountValue: discountVal,
                discountType: discountType as any,
                dueDate,
                paymentMode: act.params?.paymentMode,
              }
            );

            if (invoice?.id) {
              appointmentService.updateAppointment(appt.id, { invoiceId: invoice.id });
              if (event.data) {
                event.data.invoiceId = invoice.id;
              }
              console.log(`[RuleEngine] Generated invoice ${invoice.id} for appointment ${appt.id} via rule "${rule.name}"`);
            }
          }
        } else if (event.recordType === "client") {
          // Task 2: Triggered by Assign Product or Client events
          const clientId = String(event.recordId);
          let lineItems: any[] = [];

          if (act.params?.billFor === "choose" && Array.isArray(act.params?.selectedServices) && act.params.selectedServices.length > 0) {
            lineItems = act.params.selectedServices.map((s: any, idx: number) => ({
              id: `li-cl-${clientId}-${idx}`,
              source: "service",
              serviceId: s.serviceId,
              description: s.name,
              quantity: s.quantity || 1,
              unitPrice: s.unitPrice || 150,
              discountAmount: s.discount || 0,
              taxPercent: s.taxPercent ?? 5,
            }));
          } else if (event.data?.product || event.data?.productId) {
            const p = event.data.product || {};
            lineItems = [{
              id: `li-cl-${clientId}-prod`,
              source: "service",
              serviceId: p.id || event.data.productId,
              description: p.name || event.data.productName || "Client Service",
              quantity: 1,
              unitPrice: p.price ?? (event.data.productPrice || 150),
              discountAmount: 0,
              taxPercent: p.tax ?? 5,
            }];
          } else {
            const clientProducts = getClientProducts(clientId);
            if (clientProducts.length > 0) {
              lineItems = clientProducts.map((p, idx) => ({
                id: `li-cl-${clientId}-${idx}`,
                source: "service",
                serviceId: p.id,
                description: p.name,
                quantity: 1,
                unitPrice: p.price || 150,
                discountAmount: 0,
                taxPercent: p.tax ?? 5,
              }));
            }
          }

          if (lineItems.length === 0) {
            lineItems = [{
              id: `li-cl-${clientId}-def`,
              source: "service",
              description: "Assigned Client Service",
              quantity: 1,
              unitPrice: 150,
              discountAmount: 0,
              taxPercent: 5,
            }];
          }

          const discountVal = act.params?.discount ?? 0;
          const discountType = act.params?.discountType === "$" ? "amount" : "percent";
          const dueDays = typeof act.params?.dueDays === "number" ? act.params.dueDays : 14;
          const dueDate = new Date(Date.now() + dueDays * 86400000).toISOString().split("T")[0];

          const clientName = event.data?.clientName || event.data?.name || "Client";
          const clientEmail = event.data?.clientEmail || event.data?.email || "";
          const clientPhone = event.data?.clientPhone || event.data?.phone || "";
          const invoiceTitle = event.data?.productName
            ? `Invoice for ${event.data.productName}`
            : "Client Services Invoice";

          const { invoice } = invoiceService.createInvoiceFromAppointment(
            {
              clientId,
              clientName,
              clientEmail,
              clientPhone,
              title: invoiceTitle,
            },
            lineItems,
            {
              createdBy: "system",
              discountValue: discountVal,
              discountType: discountType as any,
              dueDate,
              paymentMode: act.params?.paymentMode,
            }
          );

          if (invoice?.id) {
            if (event.data) {
              event.data.invoiceId = invoice.id;
            }
            console.log(`[RuleEngine] Generated invoice ${invoice.id} for client ${clientId} via rule "${rule.name}"`);
            appendActivity({
              type: "field_update",
              clientId,
              processId: "billing",
              processName: "Billing & Invoicing",
              timestamp: new Date().toISOString(),
              fieldLabel: "Invoice",
              newValue: invoice.id,
              details: {
                primary: `Invoice ${invoice.id} generated for client services`,
                secondary: `Total: $${invoice.total.toFixed(2)} · ${lineItems.map((l: any) => l.description).join(", ")}`,
              },
            });
          }
        }
      }

      // Action: Generate Document (Task 3)
      if (stepKey === "generate_document" || stepKey === "generate-document") {
        try {
          const targetEntity = act.params?.entity || event.recordType || "client";
          let targetClientId = event.recordType === "client"
            ? String(event.recordId)
            : (event.data?.clientId ? String(event.data.clientId) : "");

          if (!targetClientId) {
            const clientList = getClientList();
            const clientName = event.data?.clientName || event.data?.name;
            const clientEmail = event.data?.email || event.data?.clientEmail;
            const clientPhone = event.data?.phone || event.data?.clientPhone;
            const foundClient = clientList.find(
              (c) =>
                (clientEmail && c.email?.toLowerCase() === clientEmail.toLowerCase()) ||
                (clientName && c.name?.toLowerCase() === clientName.toLowerCase()) ||
                (clientPhone && c.phoneNumber && c.phoneNumber.replace(/\D/g, "") === clientPhone.replace(/\D/g, ""))
            );
            if (foundClient) {
              targetClientId = String(foundClient.id);
            } else {
              targetClientId = "c-1";
            }
          }

          // Find template if templateId or template name was selected
          const storedTemplates = getStoredDocumentTemplates();
          const matchedTemplate = storedTemplates.find(
            (t) =>
              t.id === act.params?.templateId ||
              t.id === act.params?.template ||
              t.name.toLowerCase() === (act.params?.templateName || act.params?.template || "").toLowerCase()
          );

          const templateName = act.params?.templateName || matchedTemplate?.name || act.params?.template || "Document";
          const clientName = event.data?.clientName || event.data?.name || "Client";

          // Gather all available client/record data for substitution
          const rawTemplateText = act.params?.templateText || matchedTemplate?.templateText || `Generated document for ${clientName} on ${new Date().toLocaleString()}`;

          // Merge fields from event.data, client list, and parameters
          const clientList = getClientList();
          const storedClient = clientList.find((c) => String(c.id) === targetClientId);

          const mergedData: Record<string, any> = {
            client_name: clientName,
            name: clientName,
            contact_name: clientName,
            clientName: clientName,
            email: event.data?.email || storedClient?.email || "",
            phone: event.data?.phone || storedClient?.phoneNumber || "",
            phoneNumber: event.data?.phone || storedClient?.phoneNumber || "",
            company: event.data?.company || event.data?.companyName || "",
            companyName: event.data?.company || event.data?.companyName || "",
            status: event.data?.status || "Active",
            role: event.data?.role || event.data?.jobPosition || "",
            location: event.data?.location || "",
            country: event.data?.country || "",
            entity: targetEntity,
            date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            current_date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            ...(storedClient || {}),
            ...(event.data || {}),
          };

          // Helper to substitute {var} and {{var}}
          const substituteTokens = (inputStr: string): string => {
            if (!inputStr) return "";
            return inputStr.replace(/\{\{?([a-zA-Z0-9_\-]+)\}?\}/g, (match, token) => {
              const cleanToken = token.trim().toLowerCase();
              const normToken = cleanToken.replace(/[^a-z0-9]/g, "");

              for (const [k, v] of Object.entries(mergedData)) {
                const normK = k.toLowerCase().replace(/[^a-z0-9]/g, "");
                if (normK === normToken && v !== undefined && v !== null && v !== "") {
                  return String(v);
                }
              }
              if (cleanToken === "current_date" || cleanToken === "date") {
                return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              }
              return match;
            });
          };

          const rawDocName = act.params?.documentName || act.params?.docTitle || `${templateName} - {client_name}`;
          const resolvedDocName = substituteTokens(rawDocName);
          const resolvedContent = substituteTokens(rawTemplateText);

          const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const categoryByEntity: Record<string, string> = {
            client: "Client Documents",
            process: "Process",
            appointment: "Clinical",
            invoice: "Billing",
          };

          const isExplicitInvoice = targetEntity === "invoice" || event.recordType === "invoice";
          const isInvoiceTemplate =
            (matchedTemplate?.category || "").toLowerCase() === "invoices" ||
            templateName.toLowerCase().includes("invoice") ||
            templateName.toLowerCase().includes("billing");
          const isInvoiceTarget = isExplicitInvoice || (targetEntity !== "client" && targetEntity !== "appointment" && isInvoiceTemplate);

          let targetInvoiceId: string | undefined = undefined;
          if (isInvoiceTarget) {
            targetInvoiceId =
              event.data?.invoiceId ||
              (event.recordType === "invoice" ? String(event.recordId) : act.params?.invoiceId) ||
              (event.recordType === "appointment" ? appointmentService.getAppointmentById(event.recordId)?.invoiceId : undefined);

            if (!targetInvoiceId) {
              const allInvoices = invoiceService.getInvoices();
              const clientNameClean = (clientName || "").trim().toLowerCase();
              const matchingInv = allInvoices.find(
                (inv) =>
                  (event.recordType === "appointment" && inv.appointmentId === String(event.recordId)) ||
                  (targetClientId && inv.clientId === targetClientId && Math.abs(Date.now() - new Date(inv.createdAt).getTime()) < 600000) ||
                  (clientNameClean && inv.clientName.toLowerCase() === clientNameClean && Math.abs(Date.now() - new Date(inv.createdAt).getTime()) < 600000)
              );
              if (matchingInv) {
                targetInvoiceId = matchingInv.id;
              }
            }
          }

          const targetApptId =
            event.recordType === "appointment"
              ? String(event.recordId)
              : (event.data?.appointmentId || act.params?.appointmentId);

          if (isInvoiceTarget && targetInvoiceId) {
            const invObj = invoiceService.getInvoiceById(targetInvoiceId);
            if (invObj) {
              const invDoc = generateInvoiceDocument(invObj, act.params);
              appendActivity({
                type: "field_update",
                clientId: targetClientId,
                processId: "billing",
                processName: "Billing & Invoicing",
                timestamp: new Date().toISOString(),
                fieldLabel: "Generated Document",
                newValue: invDoc.name,
                details: {
                  primary: `Document generated: ${invDoc.name}`,
                  secondary: `Entity: INVOICE #${invObj.id} · Template: ${templateName}`,
                },
              });
              console.log(`[RuleEngine] Generated invoice document "${invDoc.name}" (${invDoc.id}) for invoice #${invObj.id}`);
              continue;
            }
          }

          const effectiveCategory = isInvoiceTarget
            ? "Invoices"
            : (matchedTemplate?.category || categoryByEntity[targetEntity] || "General");

          const newDoc: StoredClientDocument = {
            id: docId,
            clientId: targetClientId,
            invoiceId: targetInvoiceId || undefined,
            appointmentId: targetApptId || undefined,
            entityId: targetInvoiceId || (event.recordType === "invoice" ? String(event.recordId) : String(event.recordId)),
            entityType: (targetInvoiceId ? "invoice" : targetEntity) as any,
            name: resolvedDocName.endsWith(".pdf") ? resolvedDocName : `${resolvedDocName}.pdf`,
            category: effectiveCategory,
            valueBy: targetInvoiceId || targetEntity === "invoice" ? "Invoice Record Data" : "Client Profile Data",
            fileType: "pdf",
            fileSize: "1.4 MB",
            uploadedDate: new Date().toISOString().replace("T", " ").substring(0, 16),
            uploadedBy: "System Admin",
            status: "Verified",
            notes: `Generated automatically via rule "${rule.name}" for ${targetEntity} #${event.recordId}${targetInvoiceId ? ` · Invoice #${targetInvoiceId}` : ""}`,
            templateId: matchedTemplate?.id || act.params?.templateId,
            generatedContent: resolvedContent,
          };

          saveClientDocument(newDoc);

          appendActivity({
            type: "field_update",
            clientId: targetClientId,
            processId: targetEntity === "process" ? event.recordId : "general",
            processName: "Document Automation",
            timestamp: new Date().toISOString(),
            fieldLabel: "Generated Document",
            newValue: newDoc.name,
            details: {
              primary: `Document generated: ${newDoc.name}`,
              secondary: `Entity: ${targetEntity.toUpperCase()} · Template: ${templateName}`,
            },
          });
          console.log(`[RuleEngine] Generated document "${newDoc.name}" (${newDoc.id}) for ${targetEntity} #${event.recordId}`);
        } catch (e) {
          console.warn("[RuleEngine] Failed to generate document from rule action:", e);
        }
      }

      // Action: Schedule Appointment
      if (stepKey === "scheduleappointment" || stepKey === "schedule-appointment") {
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
      }

      // Action: Send Payment / Send Invoice
      if (
        stepKey === "send_payment" ||
        stepKey === "send-payment" ||
        stepKey === "send_invoice" ||
        stepKey === "send-invoice"
      ) {
        try {
          const invId = event.recordType === "invoice" ? event.recordId : event.data?.invoiceId;
          if (invId) {
            invoiceService.sendInvoice(invId, act.params?.channel || act.params?.invoiceChannel || "whatsapp");
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
      movedToStageId: rule.action?.stageId,
      movedToStageName: targetStage?.name,
    });

    // 9. Cascade: Emit stage entry event if top level move happened
    if (hasTopLevelMove && rule.action?.stageId) {
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

      await executeRulesForEvent(enteredStageEvent, depth + 1, nextVisited);
    }
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

// Initialize immediately in app and test lifecycles
initializeRuleEngine();
