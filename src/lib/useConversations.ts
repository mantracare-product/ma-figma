import { useState, useEffect } from "react";
import { WhatsappTemplate } from "../app/pages/Chats";
import { TEST_CHAT_SYNC_EVENT } from "./testConversationSync";
import { DEFAULT_MOCK_NUMBERS } from "./useWhatsAppNumbers";
import { resolveTestVariables } from "./chatbotTestReply";
import { buildTemplateMessage } from "./conversationBotRuntime";
import { appendActivity, getActivity } from "./activityEngine";

export interface Message {
  id: string;
  text: string;
  timestamp: string;
  sender: "contact" | "me";
  status?: "sent" | "delivered" | "read";
  origin?: "human" | "bot" | "campaign" | "template" | "system";
  buttons?: Array<{ label: string; nextNodeId?: string | null; actionType?: string; actionValue?: string }>;
  header?: {
    type?: "none" | "text" | "image" | "video" | "document";
    text?: string;
    mediaUrl?: string;
    fileName?: string;
  };
  footerText?: string;
}

export interface Conversation {
  id: string;
  clientId?: string;
  contactName: string;
  phoneNumber: string;
  inboxNumber?: string;
  channel: "whatsapp" | "sms" | "website";
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  status: "open" | "resolved";
  messages: Message[];
  botStatus?: "active" | "paused" | "off";
  assignedPersonId?: string;
  assignedBotId?: string;
  botRuntime?: {
    currentNodeId: string | null;
    awaitingFreeText: boolean;
    pendingHandoffNodeId: string | null;
  };
  campaignEnrollments?: Array<{
    campaignId: string;
    currentNodeIndex: number;
    enrolledAt: string;
    status: "active" | "completed" | "paused";
    nextRunAt?: string;
  }>;
}

export interface SessionWindowStatus {
  channel: "whatsapp" | "sms" | "website";
  lastInboundAt: string | null;
  hoursRemaining: number | null;
  isExpired: boolean;
  freeFormAllowed: boolean;
}

const STORAGE_KEY = "whatsappMockConversations";

export const INITIAL_MOCK_CONVERSATIONS: Conversation[] = [
  // ── WhatsApp Contacts (20 Sample Contacts) ──
  {
    id: "conv-wa-1",
    clientId: "CL-001",
    contactName: "Sarah Johnson",
    phoneNumber: "+1 (555) 123-4567",
    inboxNumber: "+1 (555) 123-4567",
    channel: "whatsapp",
    lastMessage: "I wanted to change my appointment slot to 3:00 PM if possible.",
    timestamp: "10:35 AM",
    unreadCount: 2,
    status: "open",
    messages: [
      { id: "msg-wa-1-1", text: "Hello! Thank you for contacting Mantra Health.", timestamp: new Date(Date.now() - 3600000).toISOString(), sender: "me", status: "read" },
      { id: "msg-wa-1-2", text: "Could I reschedule my appointment for tomorrow?", timestamp: new Date(Date.now() - 1800000).toISOString(), sender: "contact" },
      { id: "msg-wa-1-3", text: "I wanted to change my appointment slot to 3:00 PM if possible.", timestamp: new Date(Date.now() - 900000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-wa-2",
    clientId: "CL-002",
    contactName: "Michael Chang",
    phoneNumber: "+1 (555) 876-5432",
    inboxNumber: "+1 (555) 123-4567",
    channel: "whatsapp",
    lastMessage: "Thanks for the update!",
    timestamp: "09:42 AM",
    unreadCount: 1,
    status: "open",
    messages: [
      { id: "msg-wa-2-1", text: "Hi, has my lab report come back yet?", timestamp: new Date(Date.now() - 90000000).toISOString(), sender: "contact" },
      { id: "msg-wa-2-2", text: "Yes! Everything looks normal, we'll email the full report shortly.", timestamp: new Date(Date.now() - 85000000).toISOString(), sender: "me", status: "read" },
      { id: "msg-wa-2-3", text: "Thanks for the update!", timestamp: new Date(Date.now() - 84000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-wa-3",
    clientId: "CL-003",
    contactName: "Aarav Patel",
    phoneNumber: "+91 98201 44521",
    inboxNumber: "+1 (555) 123-4567",
    channel: "whatsapp",
    lastMessage: "Can you share the blood test preparation guidelines?",
    timestamp: "09:15 AM",
    unreadCount: 0,
    status: "open",
    messages: [
      { id: "msg-wa-3-1", text: "Hello Aarav, your fasting blood panel is booked for 8:30 AM tomorrow.", timestamp: new Date(Date.now() - 5400000).toISOString(), sender: "me", status: "read" },
      { id: "msg-wa-3-2", text: "Can you share the blood test preparation guidelines?", timestamp: new Date(Date.now() - 3600000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-wa-4",
    clientId: "CL-004",
    contactName: "Elena Rostova",
    phoneNumber: "+1 (555) 345-6789",
    inboxNumber: "+1 (555) 123-4567",
    channel: "whatsapp",
    lastMessage: "Awesome service! Thanks for checking in.",
    timestamp: "08:50 AM",
    unreadCount: 0,
    status: "resolved",
    messages: [
      { id: "msg-wa-4-1", text: "Hello Elena, how is your recovery progressing following Tuesday's session?", timestamp: new Date(Date.now() - 7200000).toISOString(), sender: "me", status: "read" },
      { id: "msg-wa-4-2", text: "Awesome service! Thanks for checking in.", timestamp: new Date(Date.now() - 5400000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-wa-5",
    clientId: "CL-005",
    contactName: "Priya Nair",
    phoneNumber: "+91 97112 88304",
    inboxNumber: "+1 (555) 123-4567",
    channel: "whatsapp",
    lastMessage: "Sounds good, please confirm for tomorrow 11 AM.",
    timestamp: "Yesterday",
    unreadCount: 1,
    status: "open",
    messages: [
      { id: "msg-wa-5-1", text: "Do you have any openings this Friday morning?", timestamp: new Date(Date.now() - 95000000).toISOString(), sender: "contact" },
      { id: "msg-wa-5-2", text: "Yes Priya! We have an 11:00 AM slot available with Dr. Mehta.", timestamp: new Date(Date.now() - 90000000).toISOString(), sender: "me", status: "read" },
      { id: "msg-wa-5-3", text: "Sounds good, please confirm for tomorrow 11 AM.", timestamp: new Date(Date.now() - 86000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-wa-6",
    clientId: "CL-006",
    contactName: "Marcus Vance",
    phoneNumber: "+1 (555) 678-1234",
    inboxNumber: "+1 (555) 123-4567",
    channel: "whatsapp",
    lastMessage: "Is Dr. Reynolds available this Thursday?",
    timestamp: "Yesterday",
    unreadCount: 0,
    status: "open",
    messages: [
      { id: "msg-wa-6-1", text: "Hi Marcus, welcome back to Mantra Clinic.", timestamp: new Date(Date.now() - 92000000).toISOString(), sender: "me", status: "read" },
      { id: "msg-wa-6-2", text: "Is Dr. Reynolds available this Thursday?", timestamp: new Date(Date.now() - 89000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-wa-7",
    clientId: "CL-007",
    contactName: "Ananya Sharma",
    phoneNumber: "+91 98450 12987",
    inboxNumber: "+1 (555) 123-4567",
    channel: "whatsapp",
    lastMessage: "Could you send the invoice copy on this WhatsApp number?",
    timestamp: "Yesterday",
    unreadCount: 0,
    status: "open",
    messages: [
      { id: "msg-wa-7-1", text: "Your consultation receipt #MN-4820 has been processed.", timestamp: new Date(Date.now() - 100000000).toISOString(), sender: "me", status: "read" },
      { id: "msg-wa-7-2", text: "Could you send the invoice copy on this WhatsApp number?", timestamp: new Date(Date.now() - 94000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-wa-8",
    clientId: "CL-008",
    contactName: "David Miller",
    phoneNumber: "+1 (555) 432-1000",
    inboxNumber: "+1 (555) 123-4567",
    channel: "whatsapp",
    lastMessage: "Thanks for the prescription refill confirmation.",
    timestamp: "2 days ago",
    unreadCount: 0,
    status: "resolved",
    messages: [
      { id: "msg-wa-8-1", text: "David, your prescription refill has been sent to Walgreens on 5th Ave.", timestamp: new Date(Date.now() - 180000000).toISOString(), sender: "me", status: "read" },
      { id: "msg-wa-8-2", text: "Thanks for the prescription refill confirmation.", timestamp: new Date(Date.now() - 170000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-wa-9",
    clientId: "CL-009",
    contactName: "Rohan Mehta",
    phoneNumber: "+91 99302 77412",
    inboxNumber: "+1 (555) 123-4567",
    channel: "whatsapp",
    lastMessage: "I have uploaded the scan documents via portal.",
    timestamp: "2 days ago",
    unreadCount: 3,
    status: "open",
    messages: [
      { id: "msg-wa-9-1", text: "Please upload your previous MRI reports before tomorrow's review.", timestamp: new Date(Date.now() - 190000000).toISOString(), sender: "me", status: "read" },
      { id: "msg-wa-9-2", text: "Sure, let me find the PDF.", timestamp: new Date(Date.now() - 185000000).toISOString(), sender: "contact" },
      { id: "msg-wa-9-3", text: "I have uploaded the scan documents via portal.", timestamp: new Date(Date.now() - 180000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-wa-10",
    clientId: "CL-010",
    contactName: "Emily Watson",
    phoneNumber: "+1 (555) 234-9988",
    inboxNumber: "+1 (555) 123-4567",
    channel: "whatsapp",
    lastMessage: "Thank you so much! See you next week.",
    timestamp: "2 days ago",
    unreadCount: 0,
    status: "resolved",
    messages: [
      { id: "msg-wa-10-1", text: "Your physical therapy follow-up is booked for Wednesday 2 PM.", timestamp: new Date(Date.now() - 200000000).toISOString(), sender: "me", status: "read" },
      { id: "msg-wa-10-2", text: "Thank you so much! See you next week.", timestamp: new Date(Date.now() - 195000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-wa-11",
    clientId: "CL-011",
    contactName: "Vikram Malhotra",
    phoneNumber: "+91 98104 33219",
    inboxNumber: "+1 (555) 123-4567",
    channel: "whatsapp",
    lastMessage: "Need to reschedule my dental consultation.",
    timestamp: "3 days ago",
    unreadCount: 1,
    status: "open",
    messages: [
      { id: "msg-wa-11-1", text: "Hi Vikram, your dental scaling checkup is scheduled for this Friday.", timestamp: new Date(Date.now() - 260000000).toISOString(), sender: "me", status: "read" },
      { id: "msg-wa-11-2", text: "Need to reschedule my dental consultation.", timestamp: new Date(Date.now() - 250000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-wa-12",
    clientId: "CL-012",
    contactName: "Chloe Dubois",
    phoneNumber: "+33 6 12 34 56 78",
    inboxNumber: "+1 (555) 123-4567",
    channel: "whatsapp",
    lastMessage: "Got it, I will arrive 10 minutes early.",
    timestamp: "3 days ago",
    unreadCount: 0,
    status: "open",
    messages: [
      { id: "msg-wa-12-1", text: "Bonjour Chloe! Please remember to bring your insurance card to the clinic.", timestamp: new Date(Date.now() - 270000000).toISOString(), sender: "me", status: "read" },
      { id: "msg-wa-12-2", text: "Got it, I will arrive 10 minutes early.", timestamp: new Date(Date.now() - 265000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-wa-13",
    clientId: "CL-013",
    contactName: "Kabir Sen",
    phoneNumber: "+91 98711 00234",
    inboxNumber: "+1 (555) 123-4567",
    channel: "whatsapp",
    lastMessage: "Is parking available at the clinic?",
    timestamp: "4 days ago",
    unreadCount: 0,
    status: "open",
    messages: [
      { id: "msg-wa-13-1", text: "Your appointment at our City Center branch is confirmed.", timestamp: new Date(Date.now() - 350000000).toISOString(), sender: "me", status: "read" },
      { id: "msg-wa-13-2", text: "Is parking available at the clinic?", timestamp: new Date(Date.now() - 340000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-wa-14",
    clientId: "CL-014",
    contactName: "Jessica Taylor",
    phoneNumber: "+1 (555) 901-2345",
    inboxNumber: "+1 (555) 123-4567",
    channel: "whatsapp",
    lastMessage: "Please let me know once the lab results are ready.",
    timestamp: "4 days ago",
    unreadCount: 0,
    status: "open",
    messages: [
      { id: "msg-wa-14-1", text: "Blood samples have been dispatched to our diagnostic center.", timestamp: new Date(Date.now() - 360000000).toISOString(), sender: "me", status: "read" },
      { id: "msg-wa-14-2", text: "Please let me know once the lab results are ready.", timestamp: new Date(Date.now() - 350000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-wa-15",
    clientId: "CL-015",
    contactName: "Siddharth Verma",
    phoneNumber: "+91 98210 65432",
    inboxNumber: "+1 (555) 123-4567",
    channel: "whatsapp",
    lastMessage: "Payment made via UPI reference #98124.",
    timestamp: "5 days ago",
    unreadCount: 0,
    status: "resolved",
    messages: [
      { id: "msg-wa-15-1", text: "Invoice for wellness package has been sent to your WhatsApp.", timestamp: new Date(Date.now() - 440000000).toISOString(), sender: "me", status: "read" },
      { id: "msg-wa-15-2", text: "Payment made via UPI reference #98124.", timestamp: new Date(Date.now() - 430000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-wa-16",
    clientId: "CL-016",
    contactName: "Hannah Abbott",
    phoneNumber: "+1 (555) 789-0123",
    inboxNumber: "+1 (555) 123-4567",
    channel: "whatsapp",
    lastMessage: "Understood, will bring the previous reports.",
    timestamp: "5 days ago",
    unreadCount: 0,
    status: "resolved",
    messages: [
      { id: "msg-wa-16-1", text: "Please bring any prior cardiology records for Dr. Patel.", timestamp: new Date(Date.now() - 450000000).toISOString(), sender: "me", status: "read" },
      { id: "msg-wa-16-2", text: "Understood, will bring the previous reports.", timestamp: new Date(Date.now() - 445000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-wa-17",
    clientId: "CL-017",
    contactName: "Arjun Kapoor",
    phoneNumber: "+91 99200 11876",
    inboxNumber: "+1 (555) 123-4567",
    channel: "whatsapp",
    lastMessage: "Can I get an appointment with nutrition specialist?",
    timestamp: "6 days ago",
    unreadCount: 1,
    status: "open",
    messages: [
      { id: "msg-wa-17-1", text: "Welcome to Mantra Health Care. How can we assist you?", timestamp: new Date(Date.now() - 520000000).toISOString(), sender: "me", status: "read" },
      { id: "msg-wa-17-2", text: "Can I get an appointment with nutrition specialist?", timestamp: new Date(Date.now() - 515000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-wa-18",
    clientId: "CL-018",
    contactName: "Sofia Rodriguez",
    phoneNumber: "+34 612 345 678",
    inboxNumber: "+1 (555) 123-4567",
    channel: "whatsapp",
    lastMessage: "All clear, thank you for the prompt assistance!",
    timestamp: "1 week ago",
    unreadCount: 0,
    status: "resolved",
    messages: [
      { id: "msg-wa-18-1", text: "Your prescription has been renewed for 6 months.", timestamp: new Date(Date.now() - 610000000).toISOString(), sender: "me", status: "read" },
      { id: "msg-wa-18-2", text: "All clear, thank you for the prompt assistance!", timestamp: new Date(Date.now() - 600000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-wa-19",
    clientId: "CL-019",
    contactName: "Neha Gupta",
    phoneNumber: "+91 98188 55421",
    inboxNumber: "+1 (555) 123-4567",
    channel: "whatsapp",
    lastMessage: "Please send the video call link for telehealth.",
    timestamp: "1 week ago",
    unreadCount: 0,
    status: "open",
    messages: [
      { id: "msg-wa-19-1", text: "Your virtual consultation with Dr. Roy is confirmed for 4:00 PM.", timestamp: new Date(Date.now() - 620000000).toISOString(), sender: "me", status: "read" },
      { id: "msg-wa-19-2", text: "Please send the video call link for telehealth.", timestamp: new Date(Date.now() - 610000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-wa-20",
    clientId: "CL-020",
    contactName: "Liam O'Connor",
    phoneNumber: "+44 7700 900123",
    inboxNumber: "+1 (555) 123-4567",
    channel: "whatsapp",
    lastMessage: "Appointment confirmed. Thank you!",
    timestamp: "2 weeks ago",
    unreadCount: 0,
    status: "resolved",
    messages: [
      { id: "msg-wa-20-1", text: "Hi Liam, your intake appointment has been scheduled.", timestamp: new Date(Date.now() - 1200000000).toISOString(), sender: "me", status: "read" },
      { id: "msg-wa-20-2", text: "Appointment confirmed. Thank you!", timestamp: new Date(Date.now() - 1190000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },

  // ── SMS Contacts (20 Sample Contacts) ──
  {
    id: "conv-sms-1",
    clientId: "CL-001",
    contactName: "Sarah Johnson",
    phoneNumber: "+1 (555) 123-4567",
    inboxNumber: "+1 (555) 123-4567",
    channel: "sms",
    lastMessage: "YES, I will be there on time!",
    timestamp: "10:15 AM",
    unreadCount: 0,
    status: "open",
    messages: [
      { id: "msg-sms-1-1", text: "Hi! This is an SMS reminder regarding your upcoming appointment. Reply YES to confirm or call us if you need to reschedule.", timestamp: new Date(Date.now() - 86400000).toISOString(), sender: "me", status: "delivered" },
      { id: "msg-sms-1-2", text: "YES, I will be there on time!", timestamp: new Date(Date.now() - 43200000).toISOString(), sender: "contact", status: "delivered" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-sms-2",
    clientId: "CL-021",
    contactName: "James Wilson",
    phoneNumber: "+1 (555) 887-2311",
    inboxNumber: "+1 (555) 123-4567",
    channel: "sms",
    lastMessage: "CONFIRM 10:30 AM appointment.",
    timestamp: "09:30 AM",
    unreadCount: 0,
    status: "open",
    messages: [
      { id: "msg-sms-2-1", text: "Mantra Health: Reminder for Dr. Miller appointment tomorrow at 10:30 AM. Reply CONFIRM to lock slot.", timestamp: new Date(Date.now() - 7200000).toISOString(), sender: "me", status: "delivered" },
      { id: "msg-sms-2-2", text: "CONFIRM 10:30 AM appointment.", timestamp: new Date(Date.now() - 5400000).toISOString(), sender: "contact", status: "delivered" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-sms-3",
    clientId: "CL-022",
    contactName: "Rajesh Kumar",
    phoneNumber: "+91 98110 44211",
    inboxNumber: "+1 (555) 123-4567",
    channel: "sms",
    lastMessage: "Received the OTP verification code, thank you.",
    timestamp: "09:05 AM",
    unreadCount: 1,
    status: "open",
    messages: [
      { id: "msg-sms-3-1", text: "Your Mantra portal verification code is 849201. Valid for 10 minutes.", timestamp: new Date(Date.now() - 3600000).toISOString(), sender: "me", status: "delivered" },
      { id: "msg-sms-3-2", text: "Received the OTP verification code, thank you.", timestamp: new Date(Date.now() - 3000000).toISOString(), sender: "contact", status: "delivered" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-sms-4",
    clientId: "CL-005",
    contactName: "David Miller",
    phoneNumber: "+1 (555) 432-1000",
    inboxNumber: "+1 (555) 123-4567",
    channel: "sms",
    lastMessage: "Thanks, I will confirm by tonight.",
    timestamp: "Yesterday",
    unreadCount: 0,
    status: "open",
    messages: [
      { id: "msg-sms-4-1", text: "Hi David, your lab reports have been received.", timestamp: new Date(Date.now() - 90000000).toISOString(), sender: "me", status: "read" },
      { id: "msg-sms-4-2", text: "Thanks, I will confirm by tonight.", timestamp: new Date(Date.now() - 85000000).toISOString(), sender: "contact" },
    ],
    botStatus: "paused",
    assignedPersonId: "1",
  },
  {
    id: "conv-sms-5",
    clientId: "CL-023",
    contactName: "Anita Desai",
    phoneNumber: "+91 98223 99801",
    inboxNumber: "+1 (555) 123-4567",
    channel: "sms",
    lastMessage: "Please reschedule my slot to next Monday.",
    timestamp: "Yesterday",
    unreadCount: 2,
    status: "open",
    messages: [
      { id: "msg-sms-5-1", text: "Reminder: Orthopedic follow up is scheduled for today at 3 PM.", timestamp: new Date(Date.now() - 96000000).toISOString(), sender: "me", status: "delivered" },
      { id: "msg-sms-5-2", text: "Please reschedule my slot to next Monday.", timestamp: new Date(Date.now() - 90000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-sms-6",
    clientId: "CL-024",
    contactName: "Robert Chen",
    phoneNumber: "+1 (555) 654-7890",
    inboxNumber: "+1 (555) 123-4567",
    channel: "sms",
    lastMessage: "STOP unwanted text reminders",
    timestamp: "Yesterday",
    unreadCount: 0,
    status: "resolved",
    messages: [
      { id: "msg-sms-6-1", text: "Mantra Health notification: Schedule your routine annual health checkup.", timestamp: new Date(Date.now() - 100000000).toISOString(), sender: "me", status: "delivered" },
      { id: "msg-sms-6-2", text: "STOP unwanted text reminders", timestamp: new Date(Date.now() - 95000000).toISOString(), sender: "contact" },
      { id: "msg-sms-6-3", text: "You have been unsubscribed from promotional SMS.", timestamp: new Date(Date.now() - 94000000).toISOString(), sender: "me", status: "delivered" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-sms-7",
    clientId: "CL-025",
    contactName: "Pooja Iyer",
    phoneNumber: "+91 98401 55672",
    inboxNumber: "+1 (555) 123-4567",
    channel: "sms",
    lastMessage: "YES, confirmed for 4 PM consultation.",
    timestamp: "2 days ago",
    unreadCount: 0,
    status: "open",
    messages: [
      { id: "msg-sms-7-1", text: "Hi Pooja, please reply YES to confirm your 4:00 PM appointment with Dr. Sharma.", timestamp: new Date(Date.now() - 175000000).toISOString(), sender: "me", status: "delivered" },
      { id: "msg-sms-7-2", text: "YES, confirmed for 4 PM consultation.", timestamp: new Date(Date.now() - 170000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-sms-8",
    clientId: "CL-026",
    contactName: "Daniel Martinez",
    phoneNumber: "+1 (555) 782-9912",
    inboxNumber: "+1 (555) 123-4567",
    channel: "sms",
    lastMessage: "Can you text me the clinic address again?",
    timestamp: "2 days ago",
    unreadCount: 0,
    status: "open",
    messages: [
      { id: "msg-sms-8-1", text: "Hi Daniel, your check-in time is 11:15 AM tomorrow.", timestamp: new Date(Date.now() - 180000000).toISOString(), sender: "me", status: "delivered" },
      { id: "msg-sms-8-2", text: "Can you text me the clinic address again?", timestamp: new Date(Date.now() - 176000000).toISOString(), sender: "contact" },
      { id: "msg-sms-8-3", text: "We are located at 450 Lexington Ave, Suite 400, New York.", timestamp: new Date(Date.now() - 175000000).toISOString(), sender: "me", status: "delivered" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-sms-9",
    clientId: "CL-027",
    contactName: "Karan Joshi",
    phoneNumber: "+91 99100 88234",
    inboxNumber: "+1 (555) 123-4567",
    channel: "sms",
    lastMessage: "Received the digital prescription download link.",
    timestamp: "3 days ago",
    unreadCount: 0,
    status: "resolved",
    messages: [
      { id: "msg-sms-9-1", text: "Your prescription is available for download at: https://mantra.health/rx/9921", timestamp: new Date(Date.now() - 260000000).toISOString(), sender: "me", status: "delivered" },
      { id: "msg-sms-9-2", text: "Received the digital prescription download link.", timestamp: new Date(Date.now() - 250000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-sms-10",
    clientId: "CL-028",
    contactName: "Olivia Smith",
    phoneNumber: "+1 (555) 321-4567",
    inboxNumber: "+1 (555) 123-4567",
    channel: "sms",
    lastMessage: "Thanks for the appointment reminder!",
    timestamp: "3 days ago",
    unreadCount: 0,
    status: "resolved",
    messages: [
      { id: "msg-sms-10-1", text: "Reminder: Flu vaccination drive is open at our downtown center.", timestamp: new Date(Date.now() - 270000000).toISOString(), sender: "me", status: "delivered" },
      { id: "msg-sms-10-2", text: "Thanks for the appointment reminder!", timestamp: new Date(Date.now() - 265000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-sms-11",
    clientId: "CL-029",
    contactName: "Deepak Chopra",
    phoneNumber: "+91 98765 43210",
    inboxNumber: "+1 (555) 123-4567",
    channel: "sms",
    lastMessage: "Can I walk in today between 2-4 PM?",
    timestamp: "4 days ago",
    unreadCount: 1,
    status: "open",
    messages: [
      { id: "msg-sms-11-1", text: "Hello Deepak, urgent care walk-ins are accepted daily.", timestamp: new Date(Date.now() - 350000000).toISOString(), sender: "me", status: "delivered" },
      { id: "msg-sms-11-2", text: "Can I walk in today between 2-4 PM?", timestamp: new Date(Date.now() - 345000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-sms-12",
    clientId: "CL-030",
    contactName: "Emma Davis",
    phoneNumber: "+1 (555) 890-1234",
    inboxNumber: "+1 (555) 123-4567",
    channel: "sms",
    lastMessage: "Confirmed. See you on Friday morning.",
    timestamp: "4 days ago",
    unreadCount: 0,
    status: "open",
    messages: [
      { id: "msg-sms-12-1", text: "Your dental cleaning is booked for Friday at 9:00 AM.", timestamp: new Date(Date.now() - 360000000).toISOString(), sender: "me", status: "delivered" },
      { id: "msg-sms-12-2", text: "Confirmed. See you on Friday morning.", timestamp: new Date(Date.now() - 350000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-sms-13",
    clientId: "CL-031",
    contactName: "Sunil Rao",
    phoneNumber: "+91 98440 22319",
    inboxNumber: "+1 (555) 123-4567",
    channel: "sms",
    lastMessage: "Payment confirmation received via SMS.",
    timestamp: "5 days ago",
    unreadCount: 0,
    status: "resolved",
    messages: [
      { id: "msg-sms-13-1", text: "INR 1,200 received towards appointment booking #MN-8831.", timestamp: new Date(Date.now() - 440000000).toISOString(), sender: "me", status: "delivered" },
      { id: "msg-sms-13-2", text: "Payment confirmation received via SMS.", timestamp: new Date(Date.now() - 435000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-sms-14",
    clientId: "CL-032",
    contactName: "Lucas Miller",
    phoneNumber: "+1 (555) 456-7890",
    inboxNumber: "+1 (555) 123-4567",
    channel: "sms",
    lastMessage: "Please text the patient intake link.",
    timestamp: "5 days ago",
    unreadCount: 0,
    status: "open",
    messages: [
      { id: "msg-sms-14-1", text: "Welcome Lucas. Complete your digital intake form before arrival.", timestamp: new Date(Date.now() - 450000000).toISOString(), sender: "me", status: "delivered" },
      { id: "msg-sms-14-2", text: "Please text the patient intake link.", timestamp: new Date(Date.now() - 445000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-sms-15",
    clientId: "CL-033",
    contactName: "Meera Nambiar",
    phoneNumber: "+91 98205 11984",
    inboxNumber: "+1 (555) 123-4567",
    channel: "sms",
    lastMessage: "Confirmed for tomorrow's follow-up visit.",
    timestamp: "6 days ago",
    unreadCount: 0,
    status: "open",
    messages: [
      { id: "msg-sms-15-1", text: "Reminder: Follow up with Dr. Swaminathan tomorrow at 5 PM.", timestamp: new Date(Date.now() - 520000000).toISOString(), sender: "me", status: "delivered" },
      { id: "msg-sms-15-2", text: "Confirmed for tomorrow's follow-up visit.", timestamp: new Date(Date.now() - 515000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-sms-16",
    clientId: "CL-034",
    contactName: "William Brown",
    phoneNumber: "+1 (555) 234-5678",
    inboxNumber: "+1 (555) 123-4567",
    channel: "sms",
    lastMessage: "Got it, thanks for updating my profile.",
    timestamp: "6 days ago",
    unreadCount: 0,
    status: "resolved",
    messages: [
      { id: "msg-sms-16-1", text: "Your emergency contact info has been updated in our system.", timestamp: new Date(Date.now() - 530000000).toISOString(), sender: "me", status: "delivered" },
      { id: "msg-sms-16-2", text: "Got it, thanks for updating my profile.", timestamp: new Date(Date.now() - 525000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-sms-17",
    clientId: "CL-035",
    contactName: "Amitabh Saxena",
    phoneNumber: "+91 98102 33445",
    inboxNumber: "+1 (555) 123-4567",
    channel: "sms",
    lastMessage: "Please cancel my appointment for this Saturday.",
    timestamp: "1 week ago",
    unreadCount: 0,
    status: "resolved",
    messages: [
      { id: "msg-sms-17-1", text: "Saturday appointment confirmed for 10 AM with Dr. Gupta.", timestamp: new Date(Date.now() - 610000000).toISOString(), sender: "me", status: "delivered" },
      { id: "msg-sms-17-2", text: "Please cancel my appointment for this Saturday.", timestamp: new Date(Date.now() - 605000000).toISOString(), sender: "contact" },
      { id: "msg-sms-17-3", text: "Appointment has been cancelled as requested. Thank you.", timestamp: new Date(Date.now() - 600000000).toISOString(), sender: "me", status: "delivered" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-sms-18",
    clientId: "CL-036",
    contactName: "Grace Kelly",
    phoneNumber: "+1 (555) 345-6780",
    inboxNumber: "+1 (555) 123-4567",
    channel: "sms",
    lastMessage: "Arrived at building, which suite number?",
    timestamp: "1 week ago",
    unreadCount: 0,
    status: "resolved",
    messages: [
      { id: "msg-sms-18-1", text: "Welcome Grace! Please check in at the reception upon arrival.", timestamp: new Date(Date.now() - 620000000).toISOString(), sender: "me", status: "delivered" },
      { id: "msg-sms-18-2", text: "Arrived at building, which suite number?", timestamp: new Date(Date.now() - 618000000).toISOString(), sender: "contact" },
      { id: "msg-sms-18-3", text: "We are on Floor 3, Suite 302.", timestamp: new Date(Date.now() - 617000000).toISOString(), sender: "me", status: "delivered" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-sms-19",
    clientId: "CL-037",
    contactName: "Tanvi Kulkarni",
    phoneNumber: "+91 98920 66781",
    inboxNumber: "+1 (555) 123-4567",
    channel: "sms",
    lastMessage: "Report received, thanks for following up.",
    timestamp: "1 week ago",
    unreadCount: 0,
    status: "resolved",
    messages: [
      { id: "msg-sms-19-1", text: "Your diagnostic health summary has been securely transmitted.", timestamp: new Date(Date.now() - 630000000).toISOString(), sender: "me", status: "delivered" },
      { id: "msg-sms-19-2", text: "Report received, thanks for following up.", timestamp: new Date(Date.now() - 625000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
  {
    id: "conv-sms-20",
    clientId: "CL-038",
    contactName: "Benjamin Clark",
    phoneNumber: "+1 (555) 789-4321",
    inboxNumber: "+1 (555) 123-4567",
    channel: "sms",
    lastMessage: "YES confirming my physical checkup on Friday.",
    timestamp: "2 weeks ago",
    unreadCount: 0,
    status: "resolved",
    messages: [
      { id: "msg-sms-20-1", text: "Mantra Health: Confirming your annual executive health assessment.", timestamp: new Date(Date.now() - 1210000000).toISOString(), sender: "me", status: "delivered" },
      { id: "msg-sms-20-2", text: "YES confirming my physical checkup on Friday.", timestamp: new Date(Date.now() - 1200000000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },

  // ── Website Visitor ──
  {
    id: "conv-web-1",
    clientId: "CL-039",
    contactName: "Alex Rivera",
    phoneNumber: "Website Visitor",
    channel: "website",
    lastMessage: "Do you accept walk-ins?",
    timestamp: "2 hours ago",
    unreadCount: 1,
    status: "open",
    messages: [
      { id: "msg-web-1-1", text: "Hi! How can I help you today?", timestamp: new Date(Date.now() - 7200000).toISOString(), sender: "me", status: "read" },
      { id: "msg-web-1-2", text: "Do you accept walk-ins?", timestamp: new Date(Date.now() - 3600000).toISOString(), sender: "contact" },
    ],
    botStatus: "off",
    assignedPersonId: "",
  },
];

export function getStoredConversations(): Conversation[] {
  const validNumbers = new Set(DEFAULT_MOCK_NUMBERS.map((n) => n.displayPhoneNumber));
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: Conversation[] = JSON.parse(raw);
      const waCount = parsed.filter((c) => c.channel === "whatsapp").length;
      const smsCount = parsed.filter((c) => c.channel === "sms").length;
      if (waCount < 20 || smsCount < 20) {
        saveStoredConversations(INITIAL_MOCK_CONVERSATIONS);
        return INITIAL_MOCK_CONVERSATIONS;
      }
      const parsedIds = new Set(parsed.map((c) => c.id));
      const missingInitial = INITIAL_MOCK_CONVERSATIONS.filter((c) => !parsedIds.has(c.id));
      const merged = [...parsed, ...missingInitial];
      const updated = merged.map((c) => {
        if (c.channel === "whatsapp" && (!c.inboxNumber || !validNumbers.has(c.inboxNumber))) {
          return { ...c, inboxNumber: DEFAULT_MOCK_NUMBERS[0].displayPhoneNumber };
        }
        return c;
      });
      return updated;
    }
  } catch {}
  return INITIAL_MOCK_CONVERSATIONS;
}

export function saveStoredConversations(convs: Conversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
    window.dispatchEvent(new Event(TEST_CHAT_SYNC_EVENT));
    window.dispatchEvent(new Event("storage"));
  } catch {}
}

export function computeSessionWindow(conv?: Conversation): SessionWindowStatus {
  if (!conv) {
    return {
      channel: "whatsapp",
      lastInboundAt: null,
      hoursRemaining: null,
      isExpired: false,
      freeFormAllowed: true,
    };
  }

  if (conv.channel !== "whatsapp") {
    return {
      channel: conv.channel,
      lastInboundAt: null,
      hoursRemaining: null,
      isExpired: false,
      freeFormAllowed: true,
    };
  }

  const inboundMsgs = (conv.messages || []).filter((m) => m.sender === "contact");
  if (inboundMsgs.length === 0) {
    return {
      channel: "whatsapp",
      lastInboundAt: null,
      hoursRemaining: null,
      isExpired: false,
      freeFormAllowed: true,
    };
  }

  const lastInbound = inboundMsgs[inboundMsgs.length - 1];
  let inboundDate: Date;

  if (lastInbound.timestamp) {
    const parsedDate = new Date(lastInbound.timestamp);
    if (!isNaN(parsedDate.getTime())) {
      inboundDate = parsedDate;
    } else if (lastInbound.timestamp.includes("Yesterday")) {
      inboundDate = new Date(Date.now() - 24 * 3600 * 1000);
    } else if (lastInbound.timestamp.includes("days ago")) {
      inboundDate = new Date(Date.now() - 3 * 24 * 3600 * 1000);
    } else {
      inboundDate = new Date(Date.now() - 3600 * 1000);
    }
  } else {
    inboundDate = new Date(Date.now() - 3600 * 1000);
  }

  const elapsedMs = Math.max(0, Date.now() - inboundDate.getTime());
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const hoursRemaining = Math.max(0, Math.round((24 - elapsedHours) * 10) / 10);
  const isExpired = elapsedHours >= 24;

  return {
    channel: "whatsapp",
    lastInboundAt: inboundDate.toISOString(),
    hoursRemaining: isExpired ? 0 : hoursRemaining,
    isExpired,
    freeFormAllowed: !isExpired,
  };
}

export function useConversations() {
  const [conversations, setConversationsState] = useState<Conversation[]>(getStoredConversations);

  useEffect(() => {
    const handleUpdate = () => setConversationsState(getStoredConversations());
    window.addEventListener(TEST_CHAT_SYNC_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(TEST_CHAT_SYNC_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const setConversations = (action: Conversation[] | ((prev: Conversation[]) => Conversation[])) => {
    const current = getStoredConversations();
    const next = typeof action === "function" ? action(current) : action;
    saveStoredConversations(next);
    setConversationsState(next);
  };

  const getConversation = (id: string): Conversation | undefined => {
    return conversations.find((c) => c.id === id);
  };

  const findConversationForClient = (opts: {
    clientId?: string;
    phone?: string;
    name?: string;
    channel?: "whatsapp" | "sms" | "website";
  }): Conversation | undefined => {
    let candidates = conversations;
    if (opts.channel) {
      candidates = candidates.filter((c) => c.channel === opts.channel);
    }
    if (opts.clientId) {
      const match = candidates.find((c) => (c as any).clientId === opts.clientId || c.id === opts.clientId);
      if (match) return match;
    }
    if (opts.phone) {
      const cleanTarget = opts.phone.replace(/\D/g, "");
      if (cleanTarget) {
        const match = candidates.find((c) => c.phoneNumber.replace(/\D/g, "").includes(cleanTarget) || cleanTarget.includes(c.phoneNumber.replace(/\D/g, "")));
        if (match) return match;
      }
    }
    if (opts.name) {
      const targetName = opts.name.toLowerCase();
      const match = candidates.find((c) => c.contactName.toLowerCase().includes(targetName) || targetName.includes(c.contactName.toLowerCase()));
      if (match) return match;
    }
    return undefined;
  };

  const findOrCreateConversationForClient = (opts: {
    clientId?: string;
    phone?: string;
    name?: string;
    channel?: "whatsapp" | "sms" | "website";
  }): Conversation => {
    const channel = opts.channel || "whatsapp";
    const existing = findConversationForClient({ ...opts, channel });
    if (existing) {
      // Enrich existing conversation if name or clientId was updated
      if ((opts.clientId && !existing.clientId) || (opts.name && existing.contactName !== opts.name && opts.name !== "Client")) {
        const updated = {
          ...existing,
          clientId: opts.clientId || existing.clientId,
          contactName: opts.name || existing.contactName,
          phoneNumber: opts.phone || existing.phoneNumber,
        };
        setConversations((prev) => prev.map((c) => (c.id === existing.id ? updated : c)));
        return updated;
      }
      return existing;
    }

    // Build initial seed messages from activity engine for this client & channel
    const activityEntries = opts.clientId ? getActivity(opts.clientId) : [];
    const matchingActivities = activityEntries.filter((a: any) => {
      const rawType = a.rawType || a.type;
      if (channel === "sms") return rawType === "sms";
      if (channel === "whatsapp") return rawType === "whatsapp";
      if (channel === "website") return rawType === "website_message" || rawType === "website";
      return false;
    });

    const seedMessages: Message[] = matchingActivities.map((a: any, idx: number) => ({
      id: `msg-act-${a.id || idx}`,
      text: a.messageText || a.details?.primary || "Message",
      timestamp: a.timestamp ? new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recently",
      sender: (a.direction === "outbound" || a.direction === "sent" ? "me" : "contact") as "me" | "contact",
      status: "delivered" as const,
    })).reverse();

    const newConv: Conversation = {
      id: `conv-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      clientId: opts.clientId,
      contactName: opts.name || "Client",
      phoneNumber: opts.phone || "+1 (555) 010-0100",
      inboxNumber: DEFAULT_MOCK_NUMBERS[0].displayPhoneNumber,
      channel,
      lastMessage: seedMessages.length > 0 ? seedMessages[seedMessages.length - 1].text : "",
      timestamp: seedMessages.length > 0 ? seedMessages[seedMessages.length - 1].timestamp : "Just now",
      unreadCount: 0,
      status: "open",
      messages: seedMessages,
      botStatus: "off",
      assignedPersonId: "",
    };

    setConversations((prev) => [...prev, newConv]);
    return newConv;
  };

  const sendMessage = (conversationId: string, text: string) => {
    if (!text.trim()) return;
    const conv = conversations.find((c) => c.id === conversationId);
    const targetId = conv ? conv.id : conversationId;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sender: "me",
      status: "read",
      origin: "human",
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === targetId
          ? {
              ...c,
              lastMessage: text.trim(),
              timestamp: "Just now",
              messages: [...c.messages, newMessage],
            }
          : c
      )
    );

    // Dual-write to activityEngine so Activity Tab timeline updates immediately
    if (conv) {
      const targetClientId = conv.clientId || "CL-001";
      const actType = conv.channel === "sms" ? "sms" : conv.channel === "website" ? "website_message" : "whatsapp";
      appendActivity({
        type: actType as any,
        clientId: targetClientId,
        timestamp: new Date().toISOString(),
        direction: "sent" as any,
        status: "delivered" as any,
        messageText: text.trim(),
        phoneNumber: conv.phoneNumber,
        refId: conv.id,
        details: {
          primary: text.trim(),
          secondary: `To: ${conv.contactName} (${conv.phoneNumber})`,
        },
      } as any);
    }
  };

  const sendTemplate = (conversationId: string, template: WhatsappTemplate) => {
    const conv = conversations.find((c) => c.id === conversationId);
    const targetId = conv ? conv.id : conversationId;

    const resolvedText = resolveTestVariables(template.bodyText || "");
    const built = buildTemplateMessage(template, resolvedText);
    const templateMsg: Message = {
      id: `msg-${Date.now()}`,
      text: built.text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sender: "me",
      origin: "template",
      status: "read",
      buttons: built.buttons as any,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === targetId
          ? {
              ...c,
              lastMessage: resolvedText,
              timestamp: "Just now",
              messages: [...c.messages, templateMsg],
            }
          : c
      )
    );

    // Dual-write to activityEngine
    if (conv) {
      const targetClientId = conv.clientId || "CL-001";
      appendActivity({
        type: "whatsapp",
        clientId: targetClientId,
        timestamp: new Date().toISOString(),
        direction: "sent" as any,
        status: "delivered" as any,
        messageText: resolvedText,
        phoneNumber: conv.phoneNumber,
        refId: conv.id,
        details: {
          primary: `Template: ${template.name}`,
          secondary: resolvedText,
        },
      } as any);
    }
  };

  const getSessionWindow = (conversationId: string): SessionWindowStatus => {
    const conv = getConversation(conversationId);
    return computeSessionWindow(conv);
  };

  return {
    conversations,
    setConversations,
    getConversation,
    findConversationForClient,
    findOrCreateConversationForClient,
    sendMessage,
    sendTemplate,
    getSessionWindow,
  };
}
