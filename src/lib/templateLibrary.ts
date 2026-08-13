export interface LibraryTemplate {
  id: string;
  name: string;
  category: "Marketing" | "Utility" | "Authentication";
  description: string;
  headerType?: "none" | "text" | "image" | "video" | "document";
  headerText?: string;
  bodyText: string;
  footerText?: string;
  buttons?: Array<{ type: string; label: string; value?: string }>;
  language?: string;
  variableMappings?: Record<string, {
    source: "static" | "field" | "availability";
    staticValue?: string;
    fieldKey?: string;
  }>;
}

export const LIBRARY_TEMPLATES: LibraryTemplate[] = [
  {
    id: "lib-tpl-appt-reminder",
    name: "Appointment Reminder",
    category: "Utility",
    description: "Send an automated reminder 24 hours before a scheduled visit with quick confirm/reschedule options.",
    headerType: "text",
    headerText: "Upcoming Appointment Reminder 📅",
    bodyText: "Hi {{contact_name}}, this is a friendly reminder for your upcoming appointment with {{practitioner_name}} on {{appointment_date}} at {{appointment_time}}.\n\nPlease confirm if you can make it or reschedule if needed.",
    footerText: "Reply STOP to unsubscribe",
    buttons: [
      { type: "quick_reply", label: "Confirm Attendance" },
      { type: "quick_reply", label: "Reschedule Visit" }
    ],
    language: "en",
    variableMappings: {
      "contact_name": { source: "field", fieldKey: "contactName" },
      "practitioner_name": { source: "static", staticValue: "Dr. Smith" },
      "appointment_date": { source: "field", fieldKey: "appointmentDate" },
      "appointment_time": { source: "field", fieldKey: "appointmentTime" }
    }
  },
  {
    id: "lib-tpl-appt-confirmation",
    name: "Booking Confirmation",
    category: "Utility",
    description: "Instant confirmation message sent immediately after an appointment booking is completed.",
    headerType: "none",
    bodyText: "Thank you {{contact_name}}! Your appointment for {{service_name}} on {{appointment_date}} has been successfully booked.\n\nLocation: {{clinic_address}}.\n\nWe look forward to seeing you!",
    footerText: "Thank you for choosing us",
    buttons: [
      { type: "url", label: "View Location", value: "https://maps.google.com" },
      { type: "phone", label: "Call Clinic", value: "+18005550199" }
    ],
    language: "en",
    variableMappings: {
      "contact_name": { source: "field", fieldKey: "contactName" },
      "service_name": { source: "field", fieldKey: "serviceName" },
      "appointment_date": { source: "field", fieldKey: "appointmentDate" },
      "clinic_address": { source: "static", staticValue: "123 Health Ave, Suite 400" }
    }
  },
  {
    id: "lib-tpl-missed-followup",
    name: "Missed Appointment Follow-up",
    category: "Utility",
    description: "Re-engage patients or clients who missed a scheduled appointment and offer easy rescheduling.",
    headerType: "text",
    headerText: "We missed you today! 💙",
    bodyText: "Hi {{contact_name}}, we noticed you were unable to make your appointment today. Your health & care are important to us!\n\nWould you like to reschedule for later this week?",
    footerText: "Press below to pick a new date",
    buttons: [
      { type: "quick_reply", label: "Reschedule Now" },
      { type: "quick_reply", label: "Speak to Desk" }
    ],
    language: "en"
  },
  {
    id: "lib-tpl-welcome-msg",
    name: "New Client Welcome Message",
    category: "Marketing",
    description: "Warm welcome message for newly registered leads or registered patients introducing services.",
    headerType: "image",
    bodyText: "Welcome to {{company_name}}, {{contact_name}}! 🎉\n\nWe are excited to have you on board. You can use this WhatsApp chat to book appointments, ask questions, or view lab reports anytime.",
    footerText: "Available 24/7",
    buttons: [
      { type: "quick_reply", label: "Explore Services" },
      { type: "url", label: "Visit Portal", value: "https://example.com/portal" }
    ],
    language: "en"
  },
  {
    id: "lib-tpl-payment-due",
    name: "Invoice & Payment Due Notice",
    category: "Utility",
    description: "Notify clients of pending invoices or consultation fees with a quick payment link.",
    headerType: "text",
    headerText: "Payment Pending 💳",
    bodyText: "Dear {{contact_name}}, your invoice #{{invoice_number}} for {{service_name}} total {{amount_due}} is now ready.\n\nPlease complete your payment securely via the link below.",
    footerText: "Secure payment gateway",
    buttons: [
      { type: "url", label: "Pay Invoice Now", value: "https://pay.example.com" }
    ],
    language: "en"
  },
  {
    id: "lib-tpl-feedback-req",
    name: "Post-Visit Feedback Request",
    category: "Marketing",
    description: "Collect patient ratings and feedback after a visit or completed service.",
    headerType: "none",
    bodyText: "Hi {{contact_name}}, thank you for visiting {{company_name}} today! How was your experience with {{practitioner_name}}?\n\nYour feedback helps us continuously improve our service.",
    footerText: "Takes less than 30 seconds",
    buttons: [
      { type: "quick_reply", label: "⭐⭐⭐⭐⭐ Great!" },
      { type: "quick_reply", label: "Needs Improvement" }
    ],
    language: "en"
  },
  {
    id: "lib-tpl-reengagement",
    name: "Check-up Re-engagement Offer",
    category: "Marketing",
    description: "Bring back inactive clients who haven't visited in over 6 months with a promotional wellness checkup offer.",
    headerType: "text",
    headerText: "Time for your annual check-up? 🩺",
    bodyText: "Hello {{contact_name}}, it has been over 6 months since your last health consultation. Regular check-ups are key to staying healthy!\n\nBook your annual wellness exam this month and enjoy 15% off.",
    footerText: "Limited time offer",
    buttons: [
      { type: "quick_reply", label: "Claim Offer & Book" },
      { type: "quick_reply", label: "Not Right Now" }
    ],
    language: "en"
  },
  {
    id: "lib-tpl-otp-auth",
    name: "Account Verification OTP",
    category: "Authentication",
    description: "Send a secure 6-digit one-time verification passcode for patient portal logins.",
    headerType: "none",
    bodyText: "{{otp_code}} is your verification code for {{company_name}}. Security code expires in 10 minutes.\n\nDo not share this code with anyone.",
    footerText: "Official security notification",
    buttons: [
      { type: "quick_reply", label: "Copy Code" }
    ],
    language: "en"
  },
  {
    id: "lib-tpl-invoice-payment",
    name: "Invoice Payment Link Delivery",
    category: "Utility",
    description: "Send generated invoice details and secure payment link via WhatsApp, SMS, or Email.",
    headerType: "text",
    headerText: "Invoice & Payment Ready 📄",
    bodyText: "Hi {{contact_name}}, your invoice {{invoice_number}} for {{invoice_amount}} is ready. Due {{due_date}}.",
    footerText: "Tap below to pay securely",
    buttons: [
      { type: "url", label: "Pay Invoice Now", value: "{{payment_link}}" }
    ],
    language: "en",
    variableMappings: {
      "contact_name": { source: "field", fieldKey: "contactName" },
      "invoice_number": { source: "field", fieldKey: "invoiceNumber" },
      "invoice_amount": { source: "field", fieldKey: "invoiceAmount" },
      "due_date": { source: "field", fieldKey: "dueDate" },
      "payment_link": { source: "field", fieldKey: "paymentLink" }
    }
  }
];
