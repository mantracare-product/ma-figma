/**
 * Message templates for send_message (Slice 3, item 3.6) + the variable scope they render with.
 * The 4 sample templates are sample DATA seeded by "Load sample templates"; nothing in logic names them.
 *
 * Variables: {{client.name}} {{appointment.date}} {{appointment.time}} {{insurance.payer}} {{insurance.copay}}
 *            {{insurance.deductible_remaining}} {{insurance.status}} {{billing.balance}} {{billing.payment_link}}
 *            {{billing.estimate}}
 */
import { createListStore, seedMissing } from "./refStore";

export const MESSAGE_TEMPLATES_EVENT = "mantra_message_templates_updated";

export interface MessageTemplate {
  id: string;
  name: string;
  channel: "sms" | "whatsapp" | "email";
  subject?: string;
  body: string;
  sample?: boolean;
}

export const messageTemplatesStore = createListStore<MessageTemplate>("mantra_message_templates_v1", MESSAGE_TEMPLATES_EVENT);

export const MESSAGE_VARIABLES = [
  "client.name",
  "appointment.date",
  "appointment.time",
  "insurance.payer",
  "insurance.copay",
  "insurance.deductible_remaining",
  "insurance.status",
  "billing.balance",
  "billing.payment_link",
  "billing.estimate",
] as const;

export const SAMPLE_MESSAGE_TEMPLATES: MessageTemplate[] = [
  { id: "update_insurance", name: "Update your insurance (Sample)", channel: "sms", sample: true,
    body: "Hi {{client.name}}, we could not verify your insurance for your visit on {{appointment.date}}. Please update it here: {{billing.payment_link}}" },
  { id: "estimate", name: "Visit estimate (Sample)", channel: "sms", sample: true,
    body: "Hi {{client.name}}, your visit on {{appointment.date}} is covered by {{insurance.payer}}. Estimated copay {{insurance.copay}}; deductible remaining {{insurance.deductible_remaining}}." },
  { id: "payment_link", name: "Statement and payment link (Sample)", channel: "sms", sample: true,
    body: "Hi {{client.name}}, your statement is ready. Balance {{billing.balance}}. Pay securely: {{billing.payment_link}}" },
  { id: "balance_reminder", name: "Balance reminder (Sample)", channel: "sms", sample: true,
    body: "Reminder for {{client.name}}: balance {{billing.balance}} is still open. Pay here: {{billing.payment_link}}" },
];

export function seedMessageTemplateSamples(): number {
  return seedMissing(messageTemplatesStore, SAMPLE_MESSAGE_TEMPLATES);
}
