import type { EmailTemplate } from "../app/components/chats/EmailTemplateDrawer";

export interface SmsTemplate {
  id: string;
  name: string;
  category: string;
  bodyText: string;
  lastModified?: string;
}

export const DEFAULT_SMS_TEMPLATES: SmsTemplate[] = [
  {
    id: "sms-tpl-appt-reminder",
    name: "Appointment Reminder",
    category: "Utility",
    bodyText:
      "Hi {{client_name}}, reminder for your upcoming appointment with {{practitioner_name}} on {{appointment_date}} at {{appointment_time}}. Reply HELP if you need to reschedule.",
  },
  {
    id: "sms-tpl-appt-confirm",
    name: "Booking Confirmation",
    category: "Utility",
    bodyText:
      "Thanks {{client_name}}! Your appointment for {{service_name}} on {{appointment_date}} at {{appointment_time}} is confirmed.",
  },
  {
    id: "sms-tpl-missed-followup",
    name: "Missed Appointment Follow-up",
    category: "Follow-up",
    bodyText:
      "Hi {{client_name}}, we noticed you missed your appointment today. Let us know when you would like to reschedule.",
  },
  {
    id: "sms-tpl-welcome",
    name: "New Client Welcome",
    category: "Welcome / Onboarding",
    bodyText:
      "Welcome to Mantra Care, {{client_name}}! Complete your intake details anytime via your client portal: {{portal_url}}",
  },
  {
    id: "sms-tpl-payment-due",
    name: "Invoice & Payment Link",
    category: "Billing",
    bodyText:
      "Hi {{client_name}}, your invoice #{{invoice_number}} for {{amount_due}} is ready. Pay securely here: {{payment_link}}",
  },
  {
    id: "sms-tpl-feedback",
    name: "Post-Visit Feedback",
    category: "Clinical Care",
    bodyText:
      "Hi {{client_name}}, thank you for visiting us today! We'd love to hear how your session with {{practitioner_name}} went.",
  },
];

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "em-tpl-1",
    name: "Appointment Confirmation & Prep",
    subject: "Your Appointment Confirmation with {{doctor_name}} - Mantra Care",
    category: "Appointment Reminder",
    preheader: "Details and preparation instructions for your upcoming appointment.",
    bodyText:
      "Hi {{client_name}},\n\nYour upcoming consultation has been confirmed for {{appointment_date}} at {{appointment_time}} with Dr. {{doctor_name}} at {{clinic_name}}.\n\nPlease arrive 10 minutes prior to your scheduled time or test your camera and microphone for video consultation.\n\nWarm regards,\n{{clinic_name}} Care Team",
    lastModified: "Today at 10:15 AM",
    createdAt: "2026-10-15",
  },
  {
    id: "em-tpl-2",
    name: "Post-Consultation Care Plan & Follow-Up",
    subject: "Summary & Next Steps Following Your Consultation - {{client_name}}",
    category: "Follow-up",
    preheader: "Your personalized treatment summary and follow-up guidelines.",
    bodyText:
      "Hello {{client_name}},\n\nThank you for meeting with Dr. {{doctor_name}} today. Attached is a summary of your treatment plan and prescribed recommendations.\n\nIf you have any questions or experience symptoms, please reply to this email or book your follow-up slot.\n\nBest regards,\nMantra Care Clinical Team",
    lastModified: "Oct 20 at 3:45 PM",
    createdAt: "2026-10-18",
  },
  {
    id: "em-tpl-3",
    name: "New Client Welcome & Medical Intake",
    subject: "Welcome to Mantra Care! Please Complete Your Health Intake",
    category: "Welcome / Onboarding",
    preheader: "Complete your online medical profile before your first visit.",
    bodyText:
      "Welcome to Mantra Care, {{client_name}}!\n\nTo help us prepare for your upcoming visit, please log in to your patient portal and complete your digital medical history form.\n\nPortal Link: {{portal_url}}\n\nSincerely,\nClient Experience Team",
    lastModified: "Oct 18 at 9:00 AM",
    createdAt: "2026-10-12",
  },
  {
    id: "em-tpl-4",
    name: "Itemized Invoice & Payment Receipt",
    subject: "Receipt for Your Recent Visit - Mantra Care",
    category: "Billing",
    preheader: "Payment confirmation and itemized superbill for your records.",
    bodyText:
      "Dear {{client_name}},\n\nThank you for your payment for services rendered on {{appointment_date}} with {{doctor_name}}.\n\nA copy of your itemized superbill and payment receipt is attached for your insurance records.\n\nBilling Department\nMantra Care",
    lastModified: "Oct 15 at 1:30 PM",
    createdAt: "2026-10-10",
  },
  {
    id: "em-tpl-5",
    name: "Annual Preventive Health Checkup",
    subject: "Time for Your Annual Health Assessment, {{client_name}}",
    category: "Clinical Care",
    preheader: "Schedule your routine wellness exam with Mantra Care.",
    bodyText:
      "Hi {{client_name}},\n\nOur records show it is time for your annual routine health checkup. Regular preventive evaluations are essential for proactive health management.\n\nPlease reply or visit {{portal_url}} to choose a convenient date.\n\nStay well,\nMantra Care",
    lastModified: "Oct 12 at 11:20 AM",
    createdAt: "2026-10-05",
  },
];

export function getStoredSmsTemplates(): SmsTemplate[] {
  if (typeof window === "undefined") return DEFAULT_SMS_TEMPLATES;
  try {
    const raw = localStorage.getItem("smsTemplates");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_SMS_TEMPLATES;
}

export function getStoredEmailTemplates(): EmailTemplate[] {
  if (typeof window === "undefined") return DEFAULT_EMAIL_TEMPLATES;
  try {
    const raw = localStorage.getItem("emailTemplates");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_EMAIL_TEMPLATES;
}
