/**
 * `send_message` and `notify` (Slice 3, item 3.6). Both are MOCK dispatchers: send_message appends the rendered
 * message to the client's conversation in Chats (via the conversations store) and logs an activity entry; nothing
 * leaves the app. notify raises an in-app notification.
 *
 * send_message params: channel (sms | whatsapp | email), template (template id), body (inline text, used when
 * there is no template), requireConsent (default true for sms / whatsapp), variables (extra {{...}} values).
 * Idempotency: recordId : template : ruleId : eventId.
 */
import type { BusEvent } from "./eventBus";
import type { AutomationRule } from "./useAutomationStore";
import { resolveRecordContext } from "./recordContext";
import { renderTemplate } from "./updateFieldsAction";
import { messageTemplatesStore, type MessageTemplate } from "./messageTemplatesStore";
import { getCoverageOn } from "./coveragesStore";
import { getPayer } from "./billingSetupStore";
import { readLocalRecordFields } from "./recordWriter";
import { getStoredConversations, saveStoredConversations, type Conversation, type Message } from "./useConversations";
import { appendActivity } from "./activityEngine";
import { addNotification } from "./notificationsStore";
import { actionIdempotencyKey, registerActionRetryHandler, runActionOnce, type RunOnceResult } from "./actionRuns";

export const SEND_MESSAGE_STEP_KEYS = ["send_message", "send-message"];
export const NOTIFY_STEP_KEYS = ["notify"];
export const isSendMessageStep = (k: string) => SEND_MESSAGE_STEP_KEYS.includes((k || "").toLowerCase());
export const isNotifyStep = (k: string) => NOTIFY_STEP_KEYS.includes((k || "").toLowerCase());

type Channel = "sms" | "whatsapp" | "email";

export interface SendMessagePayload {
  clientId: string;
  clientName: string;
  phone: string;
  email?: string;
  channel: Channel;
  text: string;
  subject?: string;
  templateId?: string;
  consentRequired: boolean;
  consent: boolean;
  recordId: string;
}

export interface SendMessageResult {
  sent: boolean;
  skipped?: "no_consent" | "no_recipient";
  conversationId?: string;
  text?: string;
}

const money = (v: unknown) => (v === undefined || v === null || v === "" ? "-" : String(v));

/** Variable scope for templates: client, appointment, insurance (primary coverage + latest eligibility), billing. */
export function buildMessageScope(event: BusEvent, extra: Record<string, any> = {}): Record<string, any> {
  const ctx = resolveRecordContext(event);
  const date = ctx.appointment?.date;
  const cov = ctx.clientId ? getCoverageOn(ctx.clientId, date || new Date().toISOString().slice(0, 10), "primary") : undefined;
  const inst: any = ctx.instance || {};
  const apptFields = ctx.appointmentId ? readLocalRecordFields("appointment", ctx.appointmentId) : {};
  const pick = (k: string) => (inst[k] !== undefined && inst[k] !== "" ? inst[k] : apptFields[k]);
  return {
    client: { name: ctx.client?.name || "", id: ctx.clientId },
    appointment: { date: date || "", time: ctx.appointment?.time || "" },
    insurance: {
      payer: (cov ? getPayer(cov.payerId)?.name : undefined) || pick("elig_payer") || "your insurance",
      copay: money(pick("elig_copay")),
      deductible_remaining: money(pick("elig_deductible_remaining")),
      status: pick("elig_status") || "",
    },
    billing: {
      balance: money((event.data as any)?.balance ?? (event.data as any)?.patientResponsibility),
      payment_link: (event.data as any)?.paymentLink || `https://pay.example.test/${ctx.clientId || "client"}`,
      estimate: money(pick("elig_copay")),
    },
    ...extra,
  };
}

function deliver(p: SendMessagePayload): SendMessageResult {
  if (p.consentRequired && !p.consent) return { sent: false, skipped: "no_consent" };
  if (p.channel !== "email" && !p.phone) return { sent: false, skipped: "no_recipient" };
  if (p.channel === "email" && !p.email) return { sent: false, skipped: "no_recipient" };

  const convs = getStoredConversations();
  const nowIso = new Date().toISOString();
  const msg: Message = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text: p.text,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    sender: "me",
    senderName: "Automation",
    status: "sent",
    origin: "system",
  };
  const idx = convs.findIndex((c) => c.channel === p.channel && (c.clientId === p.clientId || (!c.clientId && c.contactName === p.clientName)));
  let conversationId: string;
  if (idx >= 0) {
    conversationId = convs[idx].id;
    convs[idx] = { ...convs[idx], clientId: convs[idx].clientId || p.clientId, messages: [...convs[idx].messages, msg], lastMessage: p.text, timestamp: msg.timestamp };
  } else {
    conversationId = `conv-rcm-${p.clientId}-${p.channel}`;
    const conv: Conversation = {
      id: conversationId,
      clientId: p.clientId,
      contactName: p.clientName,
      phoneNumber: p.phone || p.email || "",
      channel: p.channel,
      lastMessage: p.text,
      timestamp: msg.timestamp,
      unreadCount: 0,
      status: "open",
      messages: [msg],
    };
    convs.unshift(conv);
  }
  saveStoredConversations(convs);
  if (p.channel === "email") {
    appendActivity({ type: "email", clientId: p.clientId, clientName: p.clientName, direction: "sent", status: "pending", subject: p.subject || "Message", bodyPreview: p.text, toOrFrom: p.email || "", createdBy: "system", details: { primary: p.text } } as any);
  } else {
    appendActivity({ type: p.channel, clientId: p.clientId, clientName: p.clientName, direction: "sent", status: "pending", messageText: p.text, phoneNumber: p.phone, createdBy: "system", details: { primary: p.text } } as any);
  }
  void nowIso;
  return { sent: true, conversationId, text: p.text };
}

registerActionRetryHandler("send_message", (run) => deliver(run.payload as SendMessagePayload) as any);

export function executeSendMessageStep(args: { rule: AutomationRule; stepId?: string; params: Record<string, any>; event: BusEvent }): RunOnceResult<any> {
  const { rule, stepId, params, event } = args;
  const ctx = resolveRecordContext(event);
  const channel = (params.channel as Channel) || "sms";
  const tpl: MessageTemplate | undefined = params.template ? messageTemplatesStore.find(String(params.template)) : undefined;
  const scope = buildMessageScope(event, params.variables || {});
  const rawBody = tpl?.body ?? (params.body ? String(params.body) : "");
  const text = String(renderTemplate(rawBody, scope));
  const consentRequired = params.requireConsent !== undefined ? !!params.requireConsent : channel !== "email";
  const consents = (ctx.client as any)?.consents || {};
  const payload: SendMessagePayload = {
    clientId: ctx.clientId || "",
    clientName: ctx.client?.name || "",
    phone: ctx.client?.phone || (ctx.client as any)?.phoneNumber || "",
    email: ctx.client?.email,
    channel,
    text,
    subject: tpl?.subject ? String(renderTemplate(tpl.subject, scope)) : undefined,
    templateId: tpl?.id || (params.template ? String(params.template) : undefined),
    consentRequired,
    consent: !!consents.sms,
    recordId: String(event.recordId),
  };
  const key = actionIdempotencyKey("send_message", event.recordId, payload.templateId || "inline", rule.id, event.id);
  return runActionOnce(key, { actionKey: "send_message", ruleId: rule.id, ruleName: rule.name, stepId, payload: payload as any }, () => {
    if (!payload.clientId) throw new Error(`send_message: cannot resolve a client from ${event.recordType} ${event.recordId}`);
    if (params.template && !tpl) throw new Error(`send_message: template "${params.template}" not found`);
    if (!text.trim()) throw new Error("send_message: the message is empty");
    return deliver(payload) as any;
  });
}

export function executeNotifyStep(args: { rule: AutomationRule; stepId?: string; params: Record<string, any>; event: BusEvent }): RunOnceResult<any> {
  const { rule, stepId, params, event } = args;
  const scope = buildMessageScope(event);
  const message = String(renderTemplate(params.message || rule.name, scope));
  const key = actionIdempotencyKey("notify", event.recordId, rule.id, event.id, stepId);
  // notify is best effort: failures are swallowed (spec: "ignored on failure")
  return runActionOnce(key, { actionKey: "notify", ruleId: rule.id, ruleName: rule.name, stepId }, () => {
    try {
      addNotification({
        type: "process",
        title: String(renderTemplate(params.title || "Automation", scope)),
        message,
        link: params.link ? String(params.link) : undefined,
        meta: { clientId: (scope.client as any)?.id },
      });
      return { notified: true, recipients: params.recipients || "all" } as any;
    } catch (e) {
      return { notified: false } as any;
    }
  });
}
