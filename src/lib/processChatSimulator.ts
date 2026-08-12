import { getStoredWhatsappTemplatesRaw } from "./getWhatsappTemplates";

export interface ProcessSimTurn {
  role: "contact" | "ai" | "system";
  text: string;
  matchedReason?: string;
  header?: {
    type?: "none" | "text" | "image" | "video" | "document";
    text?: string;
    fileName?: string;
  };
  footerText?: string;
  buttons?: Array<{ label: string; type?: string; value?: string }>;
}

export interface ProcessSimResult {
  text: string;
  matchedReason?: string;
  newStageId?: string;
  newStageName?: string;
  firedAutomation?: { stepKey: string; stepName: string };
  header?: ProcessSimTurn["header"];
  footerText?: string;
  buttons?: ProcessSimTurn["buttons"];
  whatsappOutbound?: {
    text: string;
    templateName?: string;
    header?: ProcessSimTurn["header"];
    footerText?: string;
    buttons?: ProcessSimTurn["buttons"];
  };
}

// Evaluates the step's own configured intent conditions (typed in the
// Automation editor) against the user's message — not a hardcoded list.
function evaluateIntentConditions(
  intentConditions: Array<{ id: string; value: string }> = [],
  operators: Array<"AND" | "OR"> = [],
  message: string
): boolean {
  if (!intentConditions || intentConditions.length === 0) return false;
  const lower = message.toLowerCase();
  const results = intentConditions.map((c) => lower.includes((c.value || "").trim().toLowerCase()));
  let acc = results[0];
  for (let i = 1; i < results.length; i++) {
    const op = operators[i - 1] ?? "OR";
    acc = op === "AND" ? acc && results[i] : acc || results[i];
  }
  return acc;
}

function stepMatchesMessage(step: any, message: string): boolean {
  const p = step.params ?? {};
  // Conditions toggle is off → step fires unconditionally when reached
  if (!p.conditionsEnabled) return true;
  return evaluateIntentConditions(p.intentConditions, p.intentConditionOperators, message);
}

function getStoredCampaignsRaw(): any[] {
  try {
    const raw = localStorage.getItem("whatsappCampaigns");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

interface FormattedTemplateMessage {
  text: string;
  header?: ProcessSimTurn["header"];
  footerText?: string;
  buttons?: ProcessSimTurn["buttons"];
}

function formatWhatsappTemplateMessage(template: any): FormattedTemplateMessage {
  const header =
    template.headerType && template.headerType !== "none"
      ? {
          type: template.headerType,
          text: template.headerType === "text" ? template.headerText : undefined,
          fileName: template.headerType !== "text" ? template.headerFileName : undefined,
        }
      : undefined;

  return {
    text: template.bodyText || `[Template: ${template.name}]`,
    header,
    footerText: template.footerText || undefined,
    buttons: template.buttons
      ? template.buttons.map((b: any) => ({ label: b.label, type: b.type, value: b.value }))
      : undefined,
  };
}

function resolveAutomationMessage(step: any, channel?: "whatsapp" | "sms" | "website"): {
  text: string;
  header?: ProcessSimTurn["header"];
  footerText?: string;
  buttons?: ProcessSimTurn["buttons"];
  whatsappOutbound?: ProcessSimResult["whatsappOutbound"];
} {
  const p = step.params ?? {};
  switch (step.stepKey) {
    case "whatsapp": {
      if (p.whatsappSource === "campaign") {
        const campaigns = getStoredCampaignsRaw();
        const matched = campaigns.find((c: any) => c.id === p.whatsappCampaignId || c.name === p.whatsappCampaignId);
        if (!matched) return { text: `[Campaign "${p.whatsappCampaignId || "unknown"}" — not found]` };
        const firstMessageNode = matched.nodes?.find((n: any) => n.type === "message");
        const formatted = {
          text: firstMessageNode?.content
            ? `[Campaign: ${matched.name}] ${firstMessageNode.content}`
            : `[Campaign: ${matched.name} triggered — no message content on first node]`,
          templateName: matched.name,
        };
        if (channel === "website") {
          const websiteMsg = p.websiteNotificationMessage?.trim() ||
            `We have sent the "${matched.name}" campaign details to your WhatsApp number. Please check your WhatsApp messages!`;
          return {
            text: websiteMsg,
            whatsappOutbound: formatted,
          };
        }
        return formatted;
      }
      if (p.whatsappSource === "chatbot") {
        const formatted = { text: `[Chatbot flow triggered — "${p.whatsappChatbotId || "Untitled Bot"}"]`, templateName: p.whatsappChatbotId || "Bot Flow" };
        if (channel === "website") {
          const websiteMsg = p.websiteNotificationMessage?.trim() ||
            `We have sent the requested bot information to your WhatsApp number. Please check your WhatsApp messages!`;
          return {
            text: websiteMsg,
            whatsappOutbound: formatted,
          };
        }
        return formatted;
      }

      const templates = getStoredWhatsappTemplatesRaw();
      const identifier = p.whatsappTemplateIdentifier || p.whatsappTemplate;
      const matched = templates.find(
        (t: any) => t.identifier === identifier || t.id === identifier || t.name === identifier
      );
      if (!matched) {
        return { text: `[WhatsApp template "${identifier || "unknown"}" — content not found, check template identifier]` };
      }
      const formatted = formatWhatsappTemplateMessage(matched);
      const whatsappOutbound = {
        ...formatted,
        templateName: matched.name,
      };

      if (channel === "website") {
        const websiteMsg = p.websiteNotificationMessage?.trim() ||
          `We have sent the "${matched.name}" template to your WhatsApp number. Please check your WhatsApp messages!`;
        return {
          text: websiteMsg,
          whatsappOutbound,
        };
      }

      return {
        ...formatted,
        whatsappOutbound,
      };
    }
    case "sms": {
      const smsText = p.smsMessage ? `[SMS] ${p.smsMessage}` : "[SMS — no message configured]";
      if (channel === "website") {
        const websiteMsg = p.websiteNotificationMessage?.trim() ||
          `We have sent an SMS to your mobile number. Please check your SMS inbox!`;
        return { text: websiteMsg };
      }
      return { text: smsText };
    }
    case "email": {
      const emailText = p.emailSubject ? `[Email] Subject: ${p.emailSubject}` : "[Email — no subject configured]";
      if (channel === "website") {
        const websiteMsg = p.websiteNotificationMessage?.trim() ||
          `We have sent an email to your email address. Please check your inbox!`;
        return { text: websiteMsg };
      }
      return { text: emailText };
    }
    case "scheduleappointment":
    case "book-appointment": {
      const serviceId = p.serviceToBillId || "srv-1";
      const autoGen = p.autoGenerateInvoice ?? true;
      const invId = `INV-CL-${Math.floor(1050 + Math.random() * 900)}`;

      if (autoGen) {
        try {
          const raw = localStorage.getItem("mantra_invoices_v1");
          const invoices = raw ? JSON.parse(raw) : [];
          const newInv = {
            id: invId,
            clientId: "c-1",
            clientName: "Sarah Jenkins",
            clientEmail: "sarah.j@example.com",
            clientPhone: "+1 (555) 234-5678",
            appointmentId: `appt-sim-${Date.now()}`,
            appointmentTitle: "AI Automated Consultation",
            status: "draft",
            currency: "$",
            lineItems: [{ id: `li-${Date.now()}`, source: "service", serviceId, description: "Initial Consultation", quantity: 1, unitPrice: p.serviceFeeOverride || 150 }],
            subtotal: p.serviceFeeOverride || 150,
            discountAmount: 0,
            taxAmount: 12,
            total: (p.serviceFeeOverride || 150) + 12,
            createdAt: new Date().toISOString(),
            createdBy: "system",
            dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
            paymentLinkUrl: `https://pay.mantraassist.mock/${invId.toLowerCase()}`,
          };
          invoices.unshift(newInv);
          localStorage.setItem("mantra_invoices_v1", JSON.stringify(invoices));
        } catch (e) {
          console.error(e);
        }
        return { text: `✅ Appointment booked · ✅ Invoice ${invId} generated` };
      }
      return { text: "✅ Appointment booked successfully" };
    }
    case "send-invoice":
    case "sendinvoice": {
      const channel = p.invoiceChannel || "whatsapp";
      let sentInvId = "INV-CL-1041";
      try {
        const raw = localStorage.getItem("mantra_invoices_v1");
        if (raw) {
          const invoices = JSON.parse(raw);
          if (invoices.length > 0) {
            invoices[0].status = "sent";
            invoices[0].sentAt = new Date().toISOString();
            invoices[0].sentVia = channel;
            sentInvId = invoices[0].id;
            localStorage.setItem("mantra_invoices_v1", JSON.stringify(invoices));
          }
        }
      } catch (e) {
        console.error(e);
      }
      return { text: `✅ Invoice ${sentInvId} sent via ${channel.toUpperCase()}` };
    }
    default:
      return { text: `Okay, I've noted that (${step.name}).` };
  }
}

// ─── Hardcoded scripted flow ────────────────────────────────────────────────
// Turn-based canned script — no external API calls. Uses the stage's own
// configured greeting/objective/business info as the source of truth for
// what to say first; falls back to a generic flow after that.
function scriptedReply(stage: any, turnIndex: number): string {
  const isFirstTurn = turnIndex === 0;

  if (isFirstTurn) {
    if (stage.callerPitchMode === "comprehensive" && stage.greetingIntroMessage) {
      return stage.greetingIntroMessage;
    }
    if (stage.callerPitch?.trim()) {
      return stage.callerPitch;
    }
    return `Hi, thanks for reaching out! This is regarding ${stage.name}. How can I help you today?`;
  }

  // Generic follow-up script cycling through acknowledgement + probing questions
  const followUps = [
    "Got it, thank you. Could you share a bit more detail?",
    "Understood — noting that down. Is there anything else you'd like to add?",
    "Thanks for confirming. I'll make sure this gets handled.",
    "Perfect, I have what I need for now. Anything else before we continue?",
  ];
  return followUps[(turnIndex - 1) % followUps.length];
}

export function generateProcessStageReply(
  stage: any,
  workflowSteps: any[],
  userMessage: string,
  history: ProcessSimTurn[],
  channel?: "whatsapp" | "sms" | "website"
): ProcessSimResult {
  const inChatSteps = workflowSteps.filter((s) => s.trigger === "inchat");

  // 1. Intent-based automation matching — evaluates configured intentConditions
  for (const step of inChatSteps) {
    if (!stepMatchesMessage(step, userMessage)) continue;

    if (step.stepKey === "processmovement" || step.stepKey === "stagemovement") {
      const targetStageName = step.params?.stepDetailStage;
      if (targetStageName && targetStageName !== "Select stage...") {
        return {
          text: `Got it — moving you to the next step: ${targetStageName}.`,
          matchedReason: `Matched intent condition on '${step.name}'`,
          newStageName: targetStageName,
          firedAutomation: { stepKey: step.stepKey, stepName: step.name },
        };
      }
    }

    const resolved = resolveAutomationMessage(step, channel);
    return {
      ...resolved,
      matchedReason: `Matched intent condition on '${step.name}'`,
      firedAutomation: { stepKey: step.stepKey, stepName: step.name },
    };
  }

  // 2. No automation matched — fall back to the hardcoded scripted flow
  const contactTurnCount = history.filter((h) => h.role === "contact").length;
  return {
    text: scriptedReply(stage, contactTurnCount),
    matchedReason: "No in-chat automation matched; using scripted stage flow",
  };
}
