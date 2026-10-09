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
  const targetValue = condition.value ?? condition.filterValue ?? condition.targetValue ?? "";

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
  const matchingRules = allRules.filter(
    (r) =>
      r.enabled &&
      (r.entityType === event.recordType ||
        !r.entityType ||
        r.trigger.event.startsWith(`${event.recordType}.`) ||
        r.trigger.event.startsWith("stage.") ||
        r.trigger.event.startsWith("field.") ||
        r.trigger.event === "field_update" ||
        r.trigger.event === event.event) &&
      (r.trigger.event === event.event ||
       (r.trigger.event === "stage.entered" && (event.event === "stage.entry" || event.event === `${event.recordType}.entered_stage` || event.event === "stage.entered")) ||
       (r.trigger.event === "stage.entry" && (event.event === "stage.entered" || event.event === `${event.recordType}.entered_stage` || event.event === "stage.entry")) ||
       (r.trigger.event === "stage.exited" && (event.event === "stage.exit" || event.event === `${event.recordType}.exited_stage` || event.event === "stage.exited")) ||
       (r.trigger.event === "stage.exit" && (event.event === "stage.exited" || event.event === `${event.recordType}.exited_stage` || event.event === "stage.exit")) ||
       ((r.trigger.event === "field.updated" || r.trigger.event === "field_update" || r.trigger.event.includes("field")) &&
        (event.event === "field.updated" || event.event === "field_update" || event.event === "client.field_updated" || event.event === `${event.recordType}.field_updated`)))
  );

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
    const allActions = flattenRuleSteps(rule.actions || []);
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
        const targetStageId = act.params?.stageId || act.params?.stepDetailStage;

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
          const targetClientId = event.recordType === "client"
            ? String(event.recordId)
            : (event.data?.clientId ? String(event.data.clientId) : "c-1");

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

          const newDoc: StoredClientDocument = {
            id: docId,
            clientId: targetClientId,
            name: resolvedDocName.endsWith(".pdf") ? resolvedDocName : `${resolvedDocName}.pdf`,
            category: matchedTemplate?.category || categoryByEntity[targetEntity] || "General",
            fileType: "pdf",
            fileSize: "148 KB",
            uploadedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            uploadedBy: "Automation Engine",
            status: "Verified",
            notes: `Generated automatically via rule "${rule.name}" for ${targetEntity} #${event.recordId}`,
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
