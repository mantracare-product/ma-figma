/**
 * plansBillingStore.ts
 * Path: src/lib/plansBillingStore.ts
 *
 * Single Source of Truth for Plans, Credit Packages, and Workspace Subscriptions.
 * Admin manages creation, editing, and activation.
 * MantraAssist reads from here and applies Scope-Based Visibility rules.
 */

import type { ScopingRule } from "../app/context/FieldRegistryContext";

export type PlanTier = "Free" | "Starter" | "Professional" | "Custom";

export interface CountryPricing {
  country: string;
  currency: string;
  currencySymbol: string;
  monthlyPrice: number;
  yearlyPrice: number;
}

export interface PlanLinkedTemplate {
  id: string;
  type: "process" | "workflow" | "document" | "webform";
  name: string;
  industry: string;
  category?: string;
}

export const PLAN_CATEGORIES = [
  "AI Receptionist",
  "AI Scribe",
  "EHR",
  "RCM",
] as const;

export type PlanCategory = (typeof PLAN_CATEGORIES)[number];

export interface IndustryPlan {
  id: string;
  name: string;
  category?: PlanCategory | string; // Category: AI Scribe, AI Receptionist, EHR, RCM
  tier: PlanTier;
  targetCategory: string; // "Global" or specific category e.g. "Wellness & Lifestyle", "Real Estate", "Healthcare", "IT/Tech"
  scopingRules?: ScopingRule[]; // Unified Admin Scope rules (category, industries, locations)
  description: string;
  includedSeats?: number; // FR-1: Number of seats (team members) allowed with plan at no extra charge
  monthlyCredits: number;
  yearlyCredits: number;
  isActive: boolean;
  isPopular: boolean;
  isInternalStaffOnly: boolean;
  features: string[]; // FR-3: Marketing display text
  modules?: string[]; // FR-2: Assigned module IDs
  moduleFeatures?: Record<string, string[]>; // FR-2: Features included under each assigned module
  linkedTemplates?: PlanLinkedTemplate[]; // FR-4: Templates by type and industry
  linkedProcessTemplates: string[]; // Legacy process IDs
  countryPricing: CountryPricing[];
  createdAt: string;
  updatedAt: string;
}

export interface CountryPackagePrice {
  country: string;
  currency: string;
  currencySymbol: string;
  price: number;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  pricePerCredit: number;
  totalPrice: number;
  country: string;
  currency: string;
  currencySymbol: string;
  isActive: boolean;
  isInternalStaffOnly: boolean;
  targetCategory?: string; // Optional: "Global" or industry
  badge?: string; // e.g. "Popular", "Best Value"
  countryPricing?: CountryPackagePrice[]; // Multi-currency localized pricing
  createdAt: string;
}

export interface TeamMemberPack {
  id: string;
  name: string;
  members: number;
  totalPrice: number;
  currencySymbol: string;
  country?: string;
  badge?: string;
  isActive: boolean;
  countryPricing?: CountryPackagePrice[]; // Multi-currency localized pricing
  createdAt: string;
}

export interface GlobalBillingSettings {
  defaultPricePerCredit: number; // FR-5: Base price per credit for custom credit amounts
  defaultPricePerExtraMember: number; // FR-8: Base price per extra team member
  currencySymbol: string;
}

export interface CreditAction {
  id: string;
  name: string;
  unitLabel: string; // e.g. "per minute", "per message", "per execution"
  creditsDeducted: number;
  linkedFeature: "Calls" | "SMS" | "Email" | "Workflows" | "AI Scribe";
  description?: string;
}

export interface CreditDeductionLog {
  id: string;
  workspaceId: string;
  actionId: string;
  actionName: string;
  linkedFeature: "Calls" | "SMS" | "Email" | "Workflows" | "AI Scribe";
  units: number;
  creditsDeducted: number;
  timestamp: string;
  details?: string;
}

export interface ActivePlanItem {
  planId: string;
  planName: string;
  category: PlanCategory | string;
  tier: PlanTier;
  billingCycle: "monthly" | "yearly";
  amount: number;
  currency: string;
  currencySymbol: string;
  includedSeats?: number;
  monthlyCredits?: number;
  yearlyCredits?: number;
}

export interface WorkspaceSubscription {
  workspaceId: string;
  planId: string;
  planName: string;
  tier: PlanTier;
  billingCycle: "monthly" | "yearly";
  amount: number;
  currency: string;
  currencySymbol: string;
  status: "Active" | "Past Due" | "Canceled" | "Trial" | "Inactive" | "Unassigned";
  nextRenewalDate: string;
  startDate: string;
  userCount: number; // Total active users
  activePlans?: ActivePlanItem[]; // Multi-category subscription: 1 active plan per category (AI Receptionist, AI Scribe, EHR, RCM)
  includedSeats?: number; // FR-1, FR-11: Seats from plan
  extraSeatsPurchased?: number; // FR-9: Additional seats purchased via packs or custom
  planCredits?: number; // Renewed monthly with plan
  addonCredits?: number; // Permanent add-on credits from topups/packs
  totalCredits: number; // planCredits + addonCredits
  creditsUsed: number; // Total consumed in cycle
  creditsRemaining: number;
  lastCreditTopupDate?: string;
  recentPackages?: Array<{
    packageId: string;
    packageName: string;
    credits: number;
    amount: number;
    currencySymbol: string;
    purchasedAt: string;
  }>;
  recentMemberPacks?: Array<{
    packId: string;
    packName: string;
    members: number;
    amount: number;
    currencySymbol: string;
    purchasedAt: string;
  }>;
}

export interface CartItem {
  id: string;
  type: "plan" | "credit_pack" | "custom_credits" | "team_pack" | "custom_seats";
  title: string;
  subtitle?: string;
  category?: PlanCategory | string;
  planId?: string;
  planTier?: PlanTier;
  billingCycle?: "monthly" | "yearly";
  credits?: number;
  members?: number;
  price: number;
  currencySymbol: string;
  currency: string;
}

export const CART_STORAGE_KEY = "mantra_billing_cart_v2";
export const CART_CHANGED_EVENT = "mantra_cart_changed";
export const PLANS_STORAGE_KEY = "mantra_admin_industry_plans_v4";
export const CREDIT_PACKAGES_STORAGE_KEY = "mantra_admin_credit_packages_v1";
export const TEAM_MEMBER_PACKS_STORAGE_KEY = "mantra_admin_team_member_packs_v1";
export const GLOBAL_BILLING_SETTINGS_KEY = "mantra_global_billing_settings_v1";
export const CREDIT_ACTIONS_STORAGE_KEY = "mantra_admin_credit_actions_v1";
export const CREDIT_DEDUCTION_LOGS_KEY = "mantra_credit_deduction_logs_v1";
export const SUBSCRIPTIONS_STORAGE_KEY = "mantra_workspace_subscriptions_v2";
export const PLANS_BILLING_CHANGED_EVENT = "mantra_plans_billing_changed";

export const SUPPORTED_COUNTRIES = [
  { country: "United States", currency: "USD", symbol: "$" },
  { country: "India", currency: "INR", symbol: "₹" },
  { country: "United Kingdom", currency: "GBP", symbol: "£" },
  { country: "Canada", currency: "CAD", symbol: "C$" },
  { country: "Australia", currency: "AUD", symbol: "A$" },
  { country: "Germany", currency: "EUR", symbol: "€" },
  { country: "France", currency: "EUR", symbol: "€" },
  { country: "United Arab Emirates", currency: "AED", symbol: "AED " },
  { country: "Singapore", currency: "SGD", symbol: "S$" },
];

export const DEFAULT_COUNTRY_PRICING: CountryPricing[] = [
  { country: "United States", currency: "USD", currencySymbol: "$", monthlyPrice: 49, yearlyPrice: 470 },
  { country: "India", currency: "INR", currencySymbol: "₹", monthlyPrice: 3999, yearlyPrice: 38390 },
  { country: "United Kingdom", currency: "GBP", currencySymbol: "£", monthlyPrice: 39, yearlyPrice: 375 },
  { country: "Canada", currency: "CAD", currencySymbol: "C$", monthlyPrice: 65, yearlyPrice: 624 },
  { country: "Australia", currency: "AUD", currencySymbol: "A$", monthlyPrice: 75, yearlyPrice: 720 },
  { country: "Germany", currency: "EUR", currencySymbol: "€", monthlyPrice: 45, yearlyPrice: 432 },
];

export function getDefaultPackageCountryPricing(baseUSDPrice: number): CountryPackagePrice[] {
  const roundedUSD = Math.round(baseUSDPrice);
  return [
    { country: "United States", currency: "USD", currencySymbol: "$", price: roundedUSD },
    { country: "India", currency: "INR", currencySymbol: "₹", price: Math.round(baseUSDPrice * 80) },
    { country: "United Kingdom", currency: "GBP", currencySymbol: "£", price: Math.max(1, Math.round(baseUSDPrice * 0.8)) },
    { country: "Canada", currency: "CAD", currencySymbol: "C$", price: Math.round(baseUSDPrice * 1.35) },
    { country: "Australia", currency: "AUD", currencySymbol: "A$", price: Math.round(baseUSDPrice * 1.5) },
    { country: "Germany", currency: "EUR", currencySymbol: "€", price: Math.max(1, Math.round(baseUSDPrice * 0.92)) },
  ];
}

export function getPackageLocalizedPrice(
  pkg: { totalPrice: number; currencySymbol?: string; countryPricing?: CountryPackagePrice[] },
  targetCountry?: string,
  targetCurrency?: string
): { price: number; currencySymbol: string; currency: string } {
  if (pkg.countryPricing && pkg.countryPricing.length > 0) {
    if (targetCountry) {
      const match = pkg.countryPricing.find((cp) => cp.country.toLowerCase() === targetCountry.toLowerCase());
      if (match) {
        return { price: match.price, currencySymbol: match.currencySymbol, currency: match.currency };
      }
    }
    if (targetCurrency) {
      const matchCurr = pkg.countryPricing.find((cp) => cp.currency.toLowerCase() === targetCurrency.toLowerCase());
      if (matchCurr) {
        return { price: matchCurr.price, currencySymbol: matchCurr.currencySymbol, currency: matchCurr.currency };
      }
    }
    const defaultCP = pkg.countryPricing[0];
    return { price: defaultCP.price, currencySymbol: defaultCP.currencySymbol, currency: defaultCP.currency };
  }
  return { price: pkg.totalPrice, currencySymbol: pkg.currencySymbol || "$", currency: "USD" };
}

export const INITIAL_INDUSTRY_PLANS: IndustryPlan[] = [
  // ── CATEGORY 1: AI RECEPTIONIST (Healthcare) ──
  {
    id: "plan-ai-rec-starter",
    name: "AI Clinic Receptionist Starter",
    category: "AI Receptionist",
    tier: "Starter",
    targetCategory: "Healthcare",
    description: "24/7 autonomous AI voice receptionist for outpatient clinics and medical practices.",
    includedSeats: 2,
    monthlyCredits: 1000,
    yearlyCredits: 12000,
    isActive: true,
    isPopular: false,
    isInternalStaffOnly: false,
    features: [
      "2 staff members included",
      "1,000 Voice & Chat Credits / mo",
      "24/7 AI Medical Call Answering",
      "Appointment Booking & Triage",
      "HIPAA Compliant Call Logs",
    ],
    modules: ["telephony", "clients", "appointments"],
    moduleFeatures: {
      telephony: ["24/7 AI Voice Answering Agent", "Inbound Calling"],
    },
    linkedTemplates: [],
    linkedProcessTemplates: [],
    countryPricing: [
      { country: "United States", currency: "USD", currencySymbol: "$", monthlyPrice: 49, yearlyPrice: 470 },
      { country: "India", currency: "INR", currencySymbol: "₹", monthlyPrice: 3999, yearlyPrice: 38390 },
      { country: "United Kingdom", currency: "GBP", currencySymbol: "£", monthlyPrice: 39, yearlyPrice: 375 },
      { country: "Canada", currency: "CAD", currencySymbol: "C$", monthlyPrice: 65, yearlyPrice: 624 },
      { country: "Australia", currency: "AUD", currencySymbol: "A$", monthlyPrice: 75, yearlyPrice: 720 },
      { country: "Germany", currency: "EUR", currencySymbol: "€", monthlyPrice: 45, yearlyPrice: 432 },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "plan-ai-rec-pro",
    name: "AI Clinic Receptionist Pro",
    category: "AI Receptionist",
    tier: "Professional",
    targetCategory: "Healthcare",
    description: "Multi-line inbound/outbound call triage, nurse line transfers, and emergency routing.",
    includedSeats: 5,
    monthlyCredits: 3500,
    yearlyCredits: 42000,
    isActive: true,
    isPopular: true,
    isInternalStaffOnly: false,
    features: [
      "5 staff members included",
      "3,500 Voice & Chat Credits / mo",
      "Multi-Line Concurrent Call Handling",
      "Intelligent Clinical Triage & Urgency Rules",
      "Direct Provider & On-Call Transfers",
      "SMS Appointment Confirmation & Reminders",
    ],
    modules: ["telephony", "clients", "appointments"],
    moduleFeatures: {
      telephony: ["24/7 AI Voice Answering Agent", "Inbound & Outbound Calling", "Smart Routing"],
    },
    linkedTemplates: [],
    linkedProcessTemplates: [],
    countryPricing: [
      { country: "United States", currency: "USD", currencySymbol: "$", monthlyPrice: 99, yearlyPrice: 950 },
      { country: "India", currency: "INR", currencySymbol: "₹", monthlyPrice: 7999, yearlyPrice: 76790 },
      { country: "United Kingdom", currency: "GBP", currencySymbol: "£", monthlyPrice: 79, yearlyPrice: 758 },
      { country: "Canada", currency: "CAD", currencySymbol: "C$", monthlyPrice: 135, yearlyPrice: 1296 },
      { country: "Australia", currency: "AUD", currencySymbol: "A$", monthlyPrice: 150, yearlyPrice: 1440 },
      { country: "Germany", currency: "EUR", currencySymbol: "€", monthlyPrice: 90, yearlyPrice: 864 },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "plan-ai-rec-custom",
    name: "AI Hospital Reception Enterprise",
    category: "AI Receptionist",
    tier: "Custom",
    targetCategory: "Healthcare",
    description: "Hospital network deployment, custom multilingual voice models, and PBX telephony bridge.",
    includedSeats: 20,
    monthlyCredits: 15000,
    yearlyCredits: 180000,
    isActive: true,
    isPopular: false,
    isInternalStaffOnly: false,
    features: [
      "20+ staff seats included",
      "Custom High-Volume Credit Allocation",
      "Enterprise PBX / SIP Trunk Integration",
      "Custom Trained Voice Models (30+ Languages)",
      "Dedicated Healthcare SLA & BAA Agreement",
      "Custom Hospital EHR Rota Dispatch",
    ],
    modules: ["telephony", "clients", "appointments", "workflows"],
    moduleFeatures: {
      telephony: ["Enterprise PBX Trunking", "Multilingual Voice", "Hospital Rota Dispatch"],
    },
    linkedTemplates: [],
    linkedProcessTemplates: [],
    countryPricing: [
      { country: "United States", currency: "USD", currencySymbol: "$", monthlyPrice: 0, yearlyPrice: 0 },
      { country: "India", currency: "INR", currencySymbol: "₹", monthlyPrice: 0, yearlyPrice: 0 },
      { country: "United Kingdom", currency: "GBP", currencySymbol: "£", monthlyPrice: 0, yearlyPrice: 0 },
      { country: "Canada", currency: "CAD", currencySymbol: "C$", monthlyPrice: 0, yearlyPrice: 0 },
      { country: "Australia", currency: "AUD", currencySymbol: "A$", monthlyPrice: 0, yearlyPrice: 0 },
      { country: "Germany", currency: "EUR", currencySymbol: "€", monthlyPrice: 0, yearlyPrice: 0 },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },

  // ── CATEGORY 2: AI SCRIBE (Healthcare) ──
  {
    id: "plan-ai-scribe-starter",
    name: "AI Clinical Scribe Starter",
    category: "AI Scribe",
    tier: "Starter",
    targetCategory: "Healthcare",
    description: "Ambient consultation audio capture and instant SOAP note generation for solo practitioners.",
    includedSeats: 2,
    monthlyCredits: 1200,
    yearlyCredits: 14400,
    isActive: true,
    isPopular: false,
    isInternalStaffOnly: false,
    features: [
      "2 provider seats included",
      "1,200 Audio Transcription Credits / mo",
      "Real-Time Ambient Consultation Capture",
      "Instant Structured SOAP Note Synthesis",
      "One-Click EHR Copy & Export",
    ],
    modules: ["scribe"],
    moduleFeatures: {},
    linkedTemplates: [],
    linkedProcessTemplates: [],
    countryPricing: [
      { country: "United States", currency: "USD", currencySymbol: "$", monthlyPrice: 59, yearlyPrice: 566 },
      { country: "India", currency: "INR", currencySymbol: "₹", monthlyPrice: 4799, yearlyPrice: 46070 },
      { country: "United Kingdom", currency: "GBP", currencySymbol: "£", monthlyPrice: 47, yearlyPrice: 450 },
      { country: "Canada", currency: "CAD", currencySymbol: "C$", monthlyPrice: 79, yearlyPrice: 758 },
      { country: "Australia", currency: "AUD", currencySymbol: "A$", monthlyPrice: 89, yearlyPrice: 854 },
      { country: "Germany", currency: "EUR", currencySymbol: "€", monthlyPrice: 55, yearlyPrice: 528 },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "plan-ai-scribe-pro",
    name: "AI Clinical Scribe Pro",
    category: "AI Scribe",
    tier: "Professional",
    targetCategory: "Healthcare",
    description: "Multi-specialty clinical dictation, ICD-10 suggestions, and direct 2-way EHR sync.",
    includedSeats: 5,
    monthlyCredits: 4000,
    yearlyCredits: 48000,
    isActive: true,
    isPopular: true,
    isInternalStaffOnly: false,
    features: [
      "5 provider seats included",
      "4,000 Audio Transcription Credits / mo",
      "40+ Medical Specialty SOAP Templates",
      "Automated ICD-10 & CPT Code Suggestions",
      "Direct EHR Chart Insertion via FHIR API",
      "Patient Visit Summary & Instructions Draft",
    ],
    modules: ["scribe"],
    moduleFeatures: {},
    linkedTemplates: [],
    linkedProcessTemplates: [],
    countryPricing: [
      { country: "United States", currency: "USD", currencySymbol: "$", monthlyPrice: 119, yearlyPrice: 1142 },
      { country: "India", currency: "INR", currencySymbol: "₹", monthlyPrice: 9599, yearlyPrice: 92150 },
      { country: "United Kingdom", currency: "GBP", currencySymbol: "£", monthlyPrice: 95, yearlyPrice: 912 },
      { country: "Canada", currency: "CAD", currencySymbol: "C$", monthlyPrice: 159, yearlyPrice: 1526 },
      { country: "Australia", currency: "AUD", currencySymbol: "A$", monthlyPrice: 179, yearlyPrice: 1718 },
      { country: "Germany", currency: "EUR", currencySymbol: "€", monthlyPrice: 110, yearlyPrice: 1056 },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "plan-ai-scribe-custom",
    name: "AI Health System Scribe Enterprise",
    category: "AI Scribe",
    tier: "Custom",
    targetCategory: "Healthcare",
    description: "Hospital-wide ambient documentation, tailored clinical fine-tuning, and on-premise security.",
    includedSeats: 25,
    monthlyCredits: 20000,
    yearlyCredits: 240000,
    isActive: true,
    isPopular: false,
    isInternalStaffOnly: false,
    features: [
      "25+ clinician seats included",
      "Unlimited Ambient Clinical Audio Processing",
      "Custom Hospital Specialty Vocabularies",
      "Epic, Cerner & Athenahealth Deep Bi-Directional Sync",
      "Enterprise SOC2 & HIPAA Compliance Vault",
      "Dedicated Clinical Account Manager",
    ],
    modules: ["scribe", "workflows"],
    moduleFeatures: {},
    linkedTemplates: [],
    linkedProcessTemplates: [],
    countryPricing: [
      { country: "United States", currency: "USD", currencySymbol: "$", monthlyPrice: 0, yearlyPrice: 0 },
      { country: "India", currency: "INR", currencySymbol: "₹", monthlyPrice: 0, yearlyPrice: 0 },
      { country: "United Kingdom", currency: "GBP", currencySymbol: "£", monthlyPrice: 0, yearlyPrice: 0 },
      { country: "Canada", currency: "CAD", currencySymbol: "C$", monthlyPrice: 0, yearlyPrice: 0 },
      { country: "Australia", currency: "AUD", currencySymbol: "A$", monthlyPrice: 0, yearlyPrice: 0 },
      { country: "Germany", currency: "EUR", currencySymbol: "€", monthlyPrice: 0, yearlyPrice: 0 },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },

  // ── CATEGORY 3: EHR (Healthcare) ──
  {
    id: "plan-ehr-starter",
    name: "Cloud EHR Essentials",
    category: "EHR",
    tier: "Starter",
    targetCategory: "Healthcare",
    description: "Core digital health records, patient demographics, and appointment scheduling.",
    includedSeats: 3,
    monthlyCredits: 1500,
    yearlyCredits: 18000,
    isActive: true,
    isPopular: false,
    isInternalStaffOnly: false,
    features: [
      "3 clinical staff included",
      "1,500 System & Notification Credits / mo",
      "Digital Health Records & Demographics",
      "Patient Portal Self-Service Booking",
      "Automated SMS & Email Reminders",
    ],
    modules: ["clients", "appointments"],
    moduleFeatures: {},
    linkedTemplates: [],
    linkedProcessTemplates: [],
    countryPricing: [
      { country: "United States", currency: "USD", currencySymbol: "$", monthlyPrice: 79, yearlyPrice: 758 },
      { country: "India", currency: "INR", currencySymbol: "₹", monthlyPrice: 6399, yearlyPrice: 61430 },
      { country: "United Kingdom", currency: "GBP", currencySymbol: "£", monthlyPrice: 63, yearlyPrice: 604 },
      { country: "Canada", currency: "CAD", currencySymbol: "C$", monthlyPrice: 105, yearlyPrice: 1008 },
      { country: "Australia", currency: "AUD", currencySymbol: "A$", monthlyPrice: 119, yearlyPrice: 1142 },
      { country: "Germany", currency: "EUR", currencySymbol: "€", monthlyPrice: 72, yearlyPrice: 691 },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "plan-ehr-pro",
    name: "Integrated Clinical EHR Suite",
    category: "EHR",
    tier: "Professional",
    targetCategory: "Healthcare",
    description: "Full clinical charting, e-prescriptions, lab integrations, and digital intake forms.",
    includedSeats: 8,
    monthlyCredits: 5000,
    yearlyCredits: 60000,
    isActive: true,
    isPopular: true,
    isInternalStaffOnly: false,
    features: [
      "8 clinical staff included",
      "5,000 System Credits / mo",
      "Comprehensive Clinical Charting & E-Rx",
      "Bi-directional Lab & Imaging Interfaces",
      "Custom Digital Patient Intake Forms",
      "Secure HIPAA Document & Records Vault",
    ],
    modules: ["clients", "appointments", "forms"],
    moduleFeatures: {},
    linkedTemplates: [],
    linkedProcessTemplates: [],
    countryPricing: [
      { country: "United States", currency: "USD", currencySymbol: "$", monthlyPrice: 149, yearlyPrice: 1430 },
      { country: "India", currency: "INR", currencySymbol: "₹", monthlyPrice: 11999, yearlyPrice: 115190 },
      { country: "United Kingdom", currency: "GBP", currencySymbol: "£", monthlyPrice: 119, yearlyPrice: 1142 },
      { country: "Canada", currency: "CAD", currencySymbol: "C$", monthlyPrice: 199, yearlyPrice: 1910 },
      { country: "Australia", currency: "AUD", currencySymbol: "A$", monthlyPrice: 225, yearlyPrice: 2160 },
      { country: "Germany", currency: "EUR", currencySymbol: "€", monthlyPrice: 138, yearlyPrice: 1324 },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "plan-ehr-custom",
    name: "Enterprise Health Network EHR",
    category: "EHR",
    tier: "Custom",
    targetCategory: "Healthcare",
    description: "Multi-facility health system EHR with FHIR interoperability, clinical trials, and HL7 feeds.",
    includedSeats: 30,
    monthlyCredits: 25000,
    yearlyCredits: 300000,
    isActive: true,
    isPopular: false,
    isInternalStaffOnly: false,
    features: [
      "30+ multi-facility staff included",
      "Unlimited Records & High Quota Allocation",
      "HL7 & FHIR Interoperability Bridge",
      "Multi-Department Rota & Inpatient Tracking",
      "Role-Based Audit Logs & Access Control",
      "99.99% Guaranteed Enterprise Uptime SLA",
    ],
    modules: ["clients", "appointments", "forms", "workflows"],
    moduleFeatures: {},
    linkedTemplates: [],
    linkedProcessTemplates: [],
    countryPricing: [
      { country: "United States", currency: "USD", currencySymbol: "$", monthlyPrice: 0, yearlyPrice: 0 },
      { country: "India", currency: "INR", currencySymbol: "₹", monthlyPrice: 0, yearlyPrice: 0 },
      { country: "United Kingdom", currency: "GBP", currencySymbol: "£", monthlyPrice: 0, yearlyPrice: 0 },
      { country: "Canada", currency: "CAD", currencySymbol: "C$", monthlyPrice: 0, yearlyPrice: 0 },
      { country: "Australia", currency: "AUD", currencySymbol: "A$", monthlyPrice: 0, yearlyPrice: 0 },
      { country: "Germany", currency: "EUR", currencySymbol: "€", monthlyPrice: 0, yearlyPrice: 0 },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },

  // ── CATEGORY 4: RCM (Healthcare) ──
  {
    id: "plan-rcm-starter",
    name: "RCM Billing & Claims Starter",
    category: "RCM",
    tier: "Starter",
    targetCategory: "Healthcare",
    description: "Automated claim submission, real-time eligibility checks, and patient invoicing.",
    includedSeats: 3,
    monthlyCredits: 1500,
    yearlyCredits: 18000,
    isActive: true,
    isPopular: false,
    isInternalStaffOnly: false,
    features: [
      "3 billing specialists included",
      "1,500 Billing & Claims Credits / mo",
      "Automated Clearinghouse EDI 837 Submission",
      "Instant Patient Insurance Eligibility (EDI 270/271)",
      "Patient Online Invoices & Settlement",
    ],
    modules: ["billing"],
    moduleFeatures: {},
    linkedTemplates: [],
    linkedProcessTemplates: [],
    countryPricing: [
      { country: "United States", currency: "USD", currencySymbol: "$", monthlyPrice: 69, yearlyPrice: 662 },
      { country: "India", currency: "INR", currencySymbol: "₹", monthlyPrice: 5599, yearlyPrice: 53750 },
      { country: "United Kingdom", currency: "GBP", currencySymbol: "£", monthlyPrice: 55, yearlyPrice: 528 },
      { country: "Canada", currency: "CAD", currencySymbol: "C$", monthlyPrice: 92, yearlyPrice: 883 },
      { country: "Australia", currency: "AUD", currencySymbol: "A$", monthlyPrice: 105, yearlyPrice: 1008 },
      { country: "Germany", currency: "EUR", currencySymbol: "€", monthlyPrice: 64, yearlyPrice: 614 },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "plan-rcm-pro",
    name: "Full Revenue Cycle Suite",
    category: "RCM",
    tier: "Professional",
    targetCategory: "Healthcare",
    description: "End-to-end denial management, automated ERA posting, and predictive collection analytics.",
    includedSeats: 6,
    monthlyCredits: 4500,
    yearlyCredits: 54000,
    isActive: true,
    isPopular: true,
    isInternalStaffOnly: false,
    features: [
      "6 billing specialists included",
      "4,500 Billing Credits / mo",
      "Denial Workflow Automation & Resubmission",
      "Automated ERA (EDI 835) Payment Posting",
      "A/R Aging & Payer Performance Analytics",
      "Automated SMS/Email Patient Collections",
    ],
    modules: ["billing"],
    moduleFeatures: {},
    linkedTemplates: [],
    linkedProcessTemplates: [],
    countryPricing: [
      { country: "United States", currency: "USD", currencySymbol: "$", monthlyPrice: 139, yearlyPrice: 1334 },
      { country: "India", currency: "INR", currencySymbol: "₹", monthlyPrice: 11199, yearlyPrice: 107510 },
      { country: "United Kingdom", currency: "GBP", currencySymbol: "£", monthlyPrice: 111, yearlyPrice: 1065 },
      { country: "Canada", currency: "CAD", currencySymbol: "C$", monthlyPrice: 185, yearlyPrice: 1776 },
      { country: "Australia", currency: "AUD", currencySymbol: "A$", monthlyPrice: 210, yearlyPrice: 2016 },
      { country: "Germany", currency: "EUR", currencySymbol: "€", monthlyPrice: 128, yearlyPrice: 1228 },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "plan-rcm-custom",
    name: "Enterprise Hospital RCM Solutions",
    category: "RCM",
    tier: "Custom",
    targetCategory: "Healthcare",
    description: "Large-scale revenue cycle operations with contract modeling, underpayment recovery, and dedicated billers.",
    includedSeats: 25,
    monthlyCredits: 25000,
    yearlyCredits: 300000,
    isActive: true,
    isPopular: false,
    isInternalStaffOnly: false,
    features: [
      "25+ enterprise billing seats included",
      "Custom High-Volume Claims & Invoicing Quota",
      "Payer Contract Modeling & Fee Schedule Rules",
      "Automated Underpayment & Overpayment Audits",
      "Dedicated Certified Billing Account Team",
      "Tailored Clearinghouse & Bank Lockbox Integration",
    ],
    modules: ["billing", "workflows"],
    moduleFeatures: {},
    linkedTemplates: [],
    linkedProcessTemplates: [],
    countryPricing: [
      { country: "United States", currency: "USD", currencySymbol: "$", monthlyPrice: 0, yearlyPrice: 0 },
      { country: "India", currency: "INR", currencySymbol: "₹", monthlyPrice: 0, yearlyPrice: 0 },
      { country: "United Kingdom", currency: "GBP", currencySymbol: "£", monthlyPrice: 0, yearlyPrice: 0 },
      { country: "Canada", currency: "CAD", currencySymbol: "C$", monthlyPrice: 0, yearlyPrice: 0 },
      { country: "Australia", currency: "AUD", currencySymbol: "A$", monthlyPrice: 0, yearlyPrice: 0 },
      { country: "Germany", currency: "EUR", currencySymbol: "€", monthlyPrice: 0, yearlyPrice: 0 },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

export const INITIAL_CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "cred-pkg-500-us",
    name: "500 Credits Booster",
    credits: 500,
    pricePerCredit: 0.05,
    totalPrice: 25,
    country: "United States",
    currency: "USD",
    currencySymbol: "$",
    isActive: true,
    isInternalStaffOnly: false,
    badge: "Quick Top-up",
    createdAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "cred-pkg-1000-us",
    name: "1,000 Credits Pack",
    credits: 1000,
    pricePerCredit: 0.045,
    totalPrice: 45,
    country: "United States",
    currency: "USD",
    currencySymbol: "$",
    isActive: true,
    isInternalStaffOnly: false,
    badge: "Most Popular",
    createdAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "cred-pkg-2500-us",
    name: "2,500 Credits Value",
    credits: 2500,
    pricePerCredit: 0.04,
    totalPrice: 100,
    country: "United States",
    currency: "USD",
    currencySymbol: "$",
    isActive: true,
    isInternalStaffOnly: false,
    badge: "Great Value",
    createdAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "cred-pkg-5000-us",
    name: "5,000 Credits Scale",
    credits: 5000,
    pricePerCredit: 0.036,
    totalPrice: 180,
    country: "United States",
    currency: "USD",
    currencySymbol: "$",
    isActive: true,
    isInternalStaffOnly: false,
    badge: "Best Value (Save 28%)",
    createdAt: "2026-01-15T10:00:00Z",
  },

  // ── India Packages ──
  {
    id: "cred-pkg-500-in",
    name: "500 Credits Booster",
    credits: 500,
    pricePerCredit: 3.75,
    totalPrice: 1875,
    country: "India",
    currency: "INR",
    currencySymbol: "₹",
    isActive: true,
    isInternalStaffOnly: false,
    badge: "Quick Top-up",
    createdAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "cred-pkg-1000-in",
    name: "1,000 Credits Pack",
    credits: 1000,
    pricePerCredit: 3.375,
    totalPrice: 3375,
    country: "India",
    currency: "INR",
    currencySymbol: "₹",
    isActive: true,
    isInternalStaffOnly: false,
    badge: "Most Popular",
    createdAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "cred-pkg-2500-in",
    name: "2,500 Credits Value",
    credits: 2500,
    pricePerCredit: 3.0,
    totalPrice: 7500,
    country: "India",
    currency: "INR",
    currencySymbol: "₹",
    isActive: true,
    isInternalStaffOnly: false,
    badge: "Great Value",
    createdAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "cred-pkg-5000-in",
    name: "5,000 Credits Scale",
    credits: 5000,
    pricePerCredit: 2.7,
    totalPrice: 13500,
    country: "India",
    currency: "INR",
    currencySymbol: "₹",
    isActive: true,
    isInternalStaffOnly: false,
    badge: "Best Value (Save 28%)",
    createdAt: "2026-01-15T10:00:00Z",
  },

  // ── UK Packages ──
  {
    id: "cred-pkg-1000-uk",
    name: "1,000 Credits Pack",
    credits: 1000,
    pricePerCredit: 0.036,
    totalPrice: 36,
    country: "United Kingdom",
    currency: "GBP",
    currencySymbol: "£",
    isActive: true,
    isInternalStaffOnly: false,
    badge: "Most Popular",
    createdAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "cred-pkg-5000-uk",
    name: "5,000 Credits Scale",
    credits: 5000,
    pricePerCredit: 0.0288,
    totalPrice: 144,
    country: "United Kingdom",
    currency: "GBP",
    currencySymbol: "£",
    isActive: true,
    isInternalStaffOnly: false,
    badge: "Best Value",
    createdAt: "2026-01-15T10:00:00Z",
  },

  // ── Internal Package ──
  {
    id: "cred-pkg-internal-qa",
    name: "Staff QA 20,000 Free Credits",
    credits: 20000,
    pricePerCredit: 0,
    totalPrice: 0,
    country: "United States",
    currency: "USD",
    currencySymbol: "$",
    isActive: true,
    isInternalStaffOnly: true, // Hidden from customer app
    badge: "Staff Only",
    createdAt: "2026-01-01T00:00:00Z",
  },
];

export const AVAILABLE_PLAN_MODULES = [
  {
    id: "clients",
    name: "Clients & Contacts (CRM)",
    features: [
      "Contact Management & History",
      "Custom Profile Sections & Fields",
      "Tagging & Smart Lists",
      "Patient Intake & Questionnaire Bindings",
    ],
  },
  {
    id: "telephony",
    name: "AI Receptionist & Telephony",
    features: [
      "24/7 AI Voice Answering Agent",
      "Inbound & Outbound Calling",
      "Live Call Transfer & Escalation",
      "Missed Call Instant Callback",
      "Voicemail Transcription",
    ],
  },
  {
    id: "appointments",
    name: "Appointments & Calendar",
    features: [
      "Online Booking Widget",
      "Google & Outlook Calendar 2-Way Sync",
      "Automated SMS/Email Reminders",
      "Doctor / Provider Rota Scheduling",
    ],
  },
  {
    id: "messaging",
    name: "Multi-Channel Messaging",
    features: [
      "Two-Way SMS Messaging",
      "WhatsApp Business API Integration",
      "Email Marketing & Notification Hub",
      "Shared Team Inbox",
    ],
  },
  {
    id: "workflows",
    name: "Workflows & Automations",
    features: [
      "Visual Flow Builder",
      "Stage Entry Automated Triggers",
      "Cross-Entity Lifecycle Movement",
      "Webhooks & External Integrations",
    ],
  },
  {
    id: "documents",
    name: "Documents & Web Forms",
    features: [
      "Fillable Docx / PDF Generation",
      "Patient Registration Web Forms",
      "E-Signature Capture",
      "EHR Document Vault",
    ],
  },
  {
    id: "billing",
    name: "Invoicing & Revenue",
    features: [
      "Digital Invoicing & Receipts",
      "Stripe / Razorpay Payment Links",
      "Insurance Claim Filing (CMS 1500)",
      "Financial Transaction Logs",
    ],
  },
  {
    id: "scribe",
    name: "AI Scribe & Clinical Notes",
    features: [
      "Real-time Clinical Audio Transcription",
      "SOAP Note Auto-Generation",
      "Diagnostic Code Suggestions (ICD-10)",
    ],
  },
];

export const PLAN_AVAILABLE_TEMPLATES: PlanLinkedTemplate[] = [
  // Process Templates
  { id: "proc-1", type: "process", name: "New Leads & Intake Pipeline", industry: "All", category: "Global" },
  { id: "proc-2", type: "process", name: "Standard Client Onboarding", industry: "All", category: "Global" },
  { id: "proc-hc-claims", type: "process", name: "Treatment & Insurance Claim Journey", industry: "Healthcare", category: "Healthcare" },
  { id: "proc-re-1", type: "process", name: "Property Tour & Offer Pipeline", industry: "Real Estate", category: "Real Estate" },
  { id: "proc-it-1", type: "process", name: "Incident Triage & Engineer Dispatch", industry: "IT/Tech", category: "IT/Tech" },
  { id: "proc-wellness-1", type: "process", name: "Class Booking & Nutrition Check-in", industry: "Wellness & Lifestyle", category: "Wellness & Lifestyle" },

  // Workflow Templates
  { id: "wf-callback", type: "workflow", name: "Instant Missed Call Auto-Callback", industry: "All", category: "Global" },
  { id: "wf-reminder", type: "workflow", name: "24-Hour Appointment SMS Reminder", industry: "All", category: "Global" },
  { id: "wf-hc-triage", type: "workflow", name: "Emergency Patient Triage & Doctor Escalation", industry: "Healthcare", category: "Healthcare" },
  { id: "wf-re-lead", type: "workflow", name: "MLS Buyer Pre-Qualification Alert", industry: "Real Estate", category: "Real Estate" },
  { id: "wf-dunning", type: "workflow", name: "Overdue Invoice Dunning Escalation", industry: "All", category: "Global" },

  // Document Templates
  { id: "doc-rx", type: "document", name: "Prescription & Medication Order", industry: "Healthcare", category: "Healthcare" },
  { id: "doc-hipaa", type: "document", name: "HIPAA Patient Intake & Consent Form", industry: "Healthcare", category: "Healthcare" },
  { id: "doc-broker", type: "document", name: "Residential Buyer Broker Agreement", industry: "Real Estate", category: "Real Estate" },
  { id: "doc-nda", type: "document", name: "General Services Agreement & Mutual NDA", industry: "All", category: "Global" },

  // Web Form Templates
  { id: "form-patient-reg", type: "webform", name: "New Patient Online Registration Form", industry: "Healthcare", category: "Healthcare" },
  { id: "form-showing", type: "webform", name: "Property Showing Schedule Request", industry: "Real Estate", category: "Real Estate" },
  { id: "form-intake", type: "webform", name: "General Client Intake Questionnaire", industry: "All", category: "Global" },
  { id: "form-it-ticket", type: "webform", name: "IT Support Incident Ticket Form", industry: "IT/Tech", category: "IT/Tech" },
];

export const INITIAL_TEAM_MEMBER_PACKS: TeamMemberPack[] = [
  {
    id: "team-pack-2",
    name: "2 Team Members Pack",
    members: 2,
    totalPrice: 36,
    currencySymbol: "$",
    badge: "Starter Booster",
    isActive: true,
    createdAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "team-pack-5",
    name: "5 Team Members Pack",
    members: 5,
    totalPrice: 90,
    currencySymbol: "$",
    badge: "Most Popular (Save 10%)",
    isActive: true,
    createdAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "team-pack-10",
    name: "10 Team Members Scale",
    members: 10,
    totalPrice: 160,
    currencySymbol: "$",
    badge: "Best Value (Save 20%)",
    isActive: true,
    createdAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "team-pack-25",
    name: "25 Enterprise Seats",
    members: 25,
    totalPrice: 375,
    currencySymbol: "$",
    badge: "Enterprise (Save 25%)",
    isActive: true,
    createdAt: "2026-01-15T10:00:00Z",
  },
];

export const INITIAL_GLOBAL_BILLING_SETTINGS: GlobalBillingSettings = {
  defaultPricePerCredit: 0.05, // FR-5: $0.05 per credit
  defaultPricePerExtraMember: 20, // FR-8: $20 per member per month
  currencySymbol: "$",
};

export const INITIAL_CREDIT_ACTIONS: CreditAction[] = [
  {
    id: "act-call-out",
    name: "Outbound Calls Made (per minute)",
    unitLabel: "per minute",
    creditsDeducted: 1,
    linkedFeature: "Calls",
    description: "Deducted per minute of active outbound call by AI receptionist or staff",
  },
  {
    id: "act-call-in",
    name: "Calls received (per minute)",
    unitLabel: "per minute",
    creditsDeducted: 2,
    linkedFeature: "Calls",
    description: "Deducted per minute of inbound AI voice answering and triage",
  },
  {
    id: "act-call-callback",
    name: "Missed Call Callback",
    unitLabel: "per callback",
    creditsDeducted: 3,
    linkedFeature: "Calls",
    description: "Automated instant voice dial out to recover lost missed caller",
  },
  {
    id: "act-sms-sent",
    name: "SMS Sent",
    unitLabel: "per message",
    creditsDeducted: 1,
    linkedFeature: "SMS",
    description: "Standard outgoing transactional or reminder SMS message",
  },
  {
    id: "act-email-sent",
    name: "Email Sent",
    unitLabel: "per email",
    creditsDeducted: 1,
    linkedFeature: "Email",
    description: "Appointment confirmation or document notification email",
  },
  {
    id: "act-workflow-exec",
    name: "Workflow Execution",
    unitLabel: "per execution",
    creditsDeducted: 1,
    linkedFeature: "Workflows",
    description: "Execution of an automated stage entry action or pipeline rule",
  },
  {
    id: "act-scribe-min",
    name: "AI Scribe Transcription",
    unitLabel: "per minute",
    creditsDeducted: 2,
    linkedFeature: "AI Scribe",
    description: "Real-time clinical audio transcription and SOAP note synthesis",
  },
];

export const INITIAL_CREDIT_DEDUCTION_LOGS: CreditDeductionLog[] = [
  {
    id: "deduct-1",
    workspaceId: "demo",
    actionId: "act-call-in",
    actionName: "Calls received (per minute)",
    linkedFeature: "Calls",
    units: 4,
    creditsDeducted: 8,
    timestamp: "2026-03-20T14:30:00Z",
    details: "4-minute inbound patient consultation intake call",
  },
  {
    id: "deduct-2",
    workspaceId: "demo",
    actionId: "act-call-out",
    actionName: "Outbound Calls Made (per minute)",
    linkedFeature: "Calls",
    units: 3,
    creditsDeducted: 3,
    timestamp: "2026-03-20T15:10:00Z",
    details: "3-minute outbound treatment plan review call",
  },
  {
    id: "deduct-3",
    workspaceId: "demo",
    actionId: "act-call-callback",
    actionName: "Missed Call Callback",
    linkedFeature: "Calls",
    units: 1,
    creditsDeducted: 3,
    timestamp: "2026-03-20T16:45:00Z",
    details: "Automated missed call recovery for caller +1 (415) 892-1200",
  },
  {
    id: "deduct-4",
    workspaceId: "demo",
    actionId: "act-sms-sent",
    actionName: "SMS Sent",
    linkedFeature: "SMS",
    units: 5,
    creditsDeducted: 5,
    timestamp: "2026-03-21T09:00:00Z",
    details: "5 appointment confirmation SMS notifications",
  },
  {
    id: "deduct-5",
    workspaceId: "demo",
    actionId: "act-workflow-exec",
    actionName: "Workflow Execution",
    linkedFeature: "Workflows",
    units: 2,
    creditsDeducted: 2,
    timestamp: "2026-03-21T11:20:00Z",
    details: "2 automated stage-entry pipeline movements",
  },
  {
    id: "deduct-6",
    workspaceId: "demo",
    actionId: "act-call-in",
    actionName: "Calls received (per minute)",
    linkedFeature: "Calls",
    units: 400,
    creditsDeducted: 800,
    timestamp: "2026-03-15T12:00:00Z",
    details: "Monthly cumulative AI receptionist answering (400 minutes)",
  },
  {
    id: "deduct-7",
    workspaceId: "demo",
    actionId: "act-sms-sent",
    actionName: "SMS Sent",
    linkedFeature: "SMS",
    units: 250,
    creditsDeducted: 250,
    timestamp: "2026-03-16T12:00:00Z",
    details: "Monthly cumulative two-way patient chat & reminder SMS",
  },
  {
    id: "deduct-8",
    workspaceId: "demo",
    actionId: "act-email-sent",
    actionName: "Email Sent",
    linkedFeature: "Email",
    units: 100,
    creditsDeducted: 100,
    timestamp: "2026-03-17T12:00:00Z",
    details: "Monthly cumulative intake packet & bill emails",
  },
  {
    id: "deduct-9",
    workspaceId: "demo",
    actionId: "act-workflow-exec",
    actionName: "Workflow Execution",
    linkedFeature: "Workflows",
    units: 69,
    creditsDeducted: 69,
    timestamp: "2026-03-18T12:00:00Z",
    details: "Monthly cumulative automated lifecycle actions",
  },
];

export const INITIAL_WORKSPACE_SUBSCRIPTIONS: Record<string, WorkspaceSubscription> = {};

// ── GETTERS & SETTERS ──

export function getStoredPlans(): IndustryPlan[] {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem("mantra_admin_industry_plans_v1");
      localStorage.removeItem("mantra_admin_industry_plans_v2");
      localStorage.removeItem("mantra_admin_industry_plans_v3");
    }
    const raw = typeof window !== "undefined" ? localStorage.getItem(PLANS_STORAGE_KEY) : null;
    if (!raw) {
      if (typeof window !== "undefined") {
        localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(INITIAL_INDUSTRY_PLANS));
      }
      return INITIAL_INDUSTRY_PLANS;
    }
    const parsed: IndustryPlan[] = JSON.parse(raw);
    if (
      !Array.isArray(parsed) ||
      parsed.length !== INITIAL_INDUSTRY_PLANS.length ||
      parsed.some((p) => p.name.includes("Voice") || !p.category)
    ) {
      if (typeof window !== "undefined") {
        localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(INITIAL_INDUSTRY_PLANS));
      }
      return INITIAL_INDUSTRY_PLANS;
    }
    // Guarantee category is populated for every plan
    const updated = parsed.map((p) => {
      if (p.category) return p;
      const lower = p.name.toLowerCase();
      let cat: PlanCategory = "AI Receptionist";
      if (lower.includes("scribe")) cat = "AI Scribe";
      else if (lower.includes("ehr") || lower.includes("chart") || lower.includes("record")) cat = "EHR";
      else if (lower.includes("rcm") || lower.includes("billing") || lower.includes("claim")) cat = "RCM";
      return { ...p, category: cat };
    });
    return updated;
  } catch (err) {
    console.error("Error reading plans:", err);
    return INITIAL_INDUSTRY_PLANS;
  }
}

export function clearAllStoredPlans(): void {
  try {
    localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify([]));
    window.dispatchEvent(new CustomEvent(PLANS_BILLING_CHANGED_EVENT, { detail: { type: "plans_cleared" } }));
  } catch (err) {
    console.error("Error clearing plans:", err);
  }
}

export function savePlan(plan: IndustryPlan): void {
  try {
    const plans = getStoredPlans();
    const idx = plans.findIndex((p) => p.id === plan.id);
    let next: IndustryPlan[];
    if (idx >= 0) {
      next = [...plans];
      next[idx] = { ...plan, updatedAt: new Date().toISOString() };
    } else {
      next = [plan, ...plans];
    }
    localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(PLANS_BILLING_CHANGED_EVENT, { detail: { type: "plan_saved", plan } }));
  } catch (err) {
    console.error("Error saving plan:", err);
  }
}

export function deletePlan(id: string): void {
  try {
    const plans = getStoredPlans();
    const next = plans.filter((p) => p.id !== id);
    localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(PLANS_BILLING_CHANGED_EVENT, { detail: { type: "plan_deleted", id } }));
  } catch (err) {
    console.error("Error deleting plan:", err);
  }
}

export function getStoredCreditPackages(): CreditPackage[] {
  try {
    const raw = localStorage.getItem(CREDIT_PACKAGES_STORAGE_KEY);
    let list: CreditPackage[] = raw ? JSON.parse(raw) : INITIAL_CREDIT_PACKAGES;
    list = list.map((pkg) => ({
      ...pkg,
      countryPricing:
        pkg.countryPricing && pkg.countryPricing.length > 0
          ? pkg.countryPricing
          : getDefaultPackageCountryPricing(pkg.totalPrice),
    }));
    return list;
  } catch (err) {
    console.error("Error reading credit packages:", err);
    return INITIAL_CREDIT_PACKAGES;
  }
}

export function saveCreditPackage(pkg: CreditPackage): void {
  try {
    const packages = getStoredCreditPackages();
    const idx = packages.findIndex((p) => p.id === pkg.id);
    let next: CreditPackage[];
    if (idx >= 0) {
      next = [...packages];
      next[idx] = pkg;
    } else {
      next = [pkg, ...packages];
    }
    localStorage.setItem(CREDIT_PACKAGES_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(PLANS_BILLING_CHANGED_EVENT, { detail: { type: "package_saved", pkg } }));
  } catch (err) {
    console.error("Error saving credit package:", err);
  }
}

export function deleteCreditPackage(id: string): void {
  try {
    const packages = getStoredCreditPackages();
    const next = packages.filter((p) => p.id !== id);
    localStorage.setItem(CREDIT_PACKAGES_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(PLANS_BILLING_CHANGED_EVENT, { detail: { type: "package_deleted", id } }));
  } catch (err) {
    console.error("Error deleting credit package:", err);
  }
}

export function getStoredSubscriptions(): Record<string, WorkspaceSubscription> {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem("mantra_workspace_subscriptions");
      localStorage.removeItem("mantra_workspace_subscriptions_v1");
    }
    const raw = localStorage.getItem(SUBSCRIPTIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(INITIAL_WORKSPACE_SUBSCRIPTIONS));
      return INITIAL_WORKSPACE_SUBSCRIPTIONS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading subscriptions:", err);
    return INITIAL_WORKSPACE_SUBSCRIPTIONS;
  }
}

export function clearAllStoredSubscriptions(): void {
  try {
    localStorage.setItem(SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify({}));
    window.dispatchEvent(new CustomEvent(PLANS_BILLING_CHANGED_EVENT, { detail: { type: "subscriptions_cleared" } }));
  } catch (err) {
    console.error("Error clearing subscriptions:", err);
  }
}

export const DEFAULT_FREE_PLAN: IndustryPlan = {
  id: "plan-free-onboarding",
  name: "Free Plan",
  category: "AI Receptionist",
  tier: "Free",
  targetCategory: "Global",
  description: "Complimentary onboarding tier for newly created accounts to explore AI features.",
  includedSeats: 1,
  monthlyCredits: 500,
  yearlyCredits: 6000,
  isActive: true,
  isPopular: false,
  isInternalStaffOnly: false,
  features: [
    "1 team member included",
    "500 included Voice & Chat Credits / mo",
    "AI Voice Receptionist agent (Trial)",
    "Multi-channel Chat & Call logs",
    "Automated Scheduling & Confirmations",
  ],
  linkedProcessTemplates: [],
  countryPricing: [
    { country: "United States", currency: "USD", currencySymbol: "$", monthlyPrice: 0, yearlyPrice: 0 },
    { country: "India", currency: "INR", currencySymbol: "₹", monthlyPrice: 0, yearlyPrice: 0 },
    { country: "United Kingdom", currency: "GBP", currencySymbol: "£", monthlyPrice: 0, yearlyPrice: 0 },
    { country: "Canada", currency: "CAD", currencySymbol: "C$", monthlyPrice: 0, yearlyPrice: 0 },
    { country: "Australia", currency: "AUD", currencySymbol: "A$", monthlyPrice: 0, yearlyPrice: 0 },
    { country: "Germany", currency: "EUR", currencySymbol: "€", monthlyPrice: 0, yearlyPrice: 0 },
  ],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

export function getWorkspaceSubscription(workspaceId: string): WorkspaceSubscription {
  const subs = getStoredSubscriptions();
  const existing = subs[workspaceId];
  if (existing && existing.planId && existing.status === "Active") {
    // Sanitize legacy combined multi-plan names to single active plan
    if (existing.planName && existing.planName.includes(" + ")) {
      const primaryPlanName = existing.activePlans?.[0]?.planName || existing.planName.split(" + ")[0].trim();
      const plans = getStoredPlans();
      const matched = plans.find((p) => p.name.toLowerCase() === primaryPlanName.toLowerCase() || p.id === existing.planId);
      existing.planName = matched?.name || primaryPlanName;
      if (matched) {
        existing.planId = matched.id;
        existing.tier = matched.tier;
        existing.includedSeats = matched.includedSeats || (matched.tier === "Starter" ? 2 : matched.tier === "Professional" ? 5 : 20);
        existing.planCredits = matched.monthlyCredits || 1000;
        existing.totalCredits = existing.planCredits + (existing.addonCredits || 0);
        existing.creditsRemaining = Math.max(0, existing.totalCredits - (existing.creditsUsed || 0));
      }
      existing.activePlans = existing.planId ? [{
        planId: existing.planId,
        planName: existing.planName,
        category: matched?.category || "AI Receptionist",
        tier: existing.tier,
        billingCycle: existing.billingCycle,
        amount: existing.amount,
        currency: existing.currency,
        currencySymbol: existing.currencySymbol,
        includedSeats: existing.includedSeats,
        monthlyCredits: existing.planCredits,
      }] : [];
      subs[workspaceId] = existing;
      try {
        localStorage.setItem(SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(subs));
      } catch (err) {
        console.error("Error storing sanitized subscription:", err);
      }
    }
    return existing;
  }

  // When a new user / workspace is created, overview shows the values of the Free onboarding plan
  const plans = getStoredPlans();
  const freePlan = plans.find((p) => (p.tier || "").toLowerCase() === "free" && p.isActive) || DEFAULT_FREE_PLAN;

  const defaultFreeSub: WorkspaceSubscription = {
    workspaceId,
    planId: freePlan.id,
    planName: freePlan.name,
    tier: "Free",
    billingCycle: "monthly",
    amount: 0,
    currency: "USD",
    currencySymbol: "$",
    status: "Active",
    nextRenewalDate: "Free (No Expiration)",
    startDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    userCount: 1,
    includedSeats: freePlan.includedSeats || 1,
    extraSeatsPurchased: existing?.extraSeatsPurchased || 0,
    planCredits: freePlan.monthlyCredits || 500,
    addonCredits: existing?.addonCredits || 0,
    totalCredits: (freePlan.monthlyCredits || 500) + (existing?.addonCredits || 0),
    creditsUsed: existing?.creditsUsed || 0,
    creditsRemaining: Math.max(0, (freePlan.monthlyCredits || 500) + (existing?.addonCredits || 0) - (existing?.creditsUsed || 0)),
  };

  subs[workspaceId] = defaultFreeSub;
  try {
    localStorage.setItem(SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(subs));
  } catch (err) {
    console.error("Error storing default free subscription:", err);
  }

  return defaultFreeSub;
}

export function updateWorkspaceSubscription(workspaceId: string, updates: Partial<WorkspaceSubscription>): void {
  try {
    const subs = getStoredSubscriptions();
    const existing = getWorkspaceSubscription(workspaceId);
    subs[workspaceId] = { ...existing, ...updates };
    localStorage.setItem(SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(subs));
    window.dispatchEvent(new CustomEvent(PLANS_BILLING_CHANGED_EVENT, { detail: { type: "subscription_updated", workspaceId } }));
  } catch (err) {
    console.error("Error updating subscription:", err);
  }
}

export function purchaseCreditPackageForWorkspace(workspaceId: string, pkg: CreditPackage): WorkspaceSubscription {
  const existing = getWorkspaceSubscription(workspaceId);
  const updatedTotal = (existing.totalCredits || 0) + pkg.credits;
  const updatedRemaining = (existing.creditsRemaining || 0) + pkg.credits;

  const recentPackages = [
    {
      packageId: pkg.id,
      packageName: pkg.name,
      credits: pkg.credits,
      amount: pkg.totalPrice,
      currencySymbol: pkg.currencySymbol,
      purchasedAt: new Date().toISOString(),
    },
    ...(existing.recentPackages || []),
  ];

  const updated: WorkspaceSubscription = {
    ...existing,
    totalCredits: updatedTotal,
    creditsRemaining: updatedRemaining,
    lastCreditTopupDate: new Date().toISOString(),
    recentPackages,
  };

  updateWorkspaceSubscription(workspaceId, updated);
  return updated;
}

// ── SCOPE-BASED FILTERING ENGINE ──

export interface WorkspaceScope {
  id?: string;
  industryCategory?: string; // e.g. "Healthcare", "Wellness & Lifestyle", "Real Estate", "IT/Tech"
  industry?: string; // e.g. "Dental Clinic", "Cardiology"
  country?: string; // e.g. "United States", "India", "United Kingdom", "Canada"
  currency?: string; // e.g. "USD", "INR", "GBP", "EUR"
}

/**
 * Filter plans based on the viewing workspace / admin scope:
 * 1. Must be Active (`isActive === true`)
 * 2. Must NOT be Internal / Staff Only (`isInternalStaffOnly === false`)
 * 3. Target Category must be "Global" OR match workspace's industry category
 * 4. Resolves price in workspace's country/currency from the plan's countryPricing matrix
 */
export function getAvailablePlansForWorkspace(
  plans: IndustryPlan[],
  scope: WorkspaceScope
): Array<{
  plan: IndustryPlan;
  pricing: CountryPricing;
  isIndustrySpecific: boolean;
}> {
  const targetCategory = (scope.industryCategory || "").trim().toLowerCase();
  const targetCountry = (scope.country || "United States").trim().toLowerCase();

  return plans
    .filter((plan) => {
      // Rule 1: Must be active
      if (!plan.isActive) return false;

      // Rule 2: Must NOT be internal staff only
      if (plan.isInternalStaffOnly) return false;

      // Rule 3: Admin Scope match (scoping rules take precedence if present)
      if (plan.scopingRules && plan.scopingRules.length > 0) {
        return plan.scopingRules.some((rule) => {
          const ruleCat = (rule.industryCategory || "").trim().toLowerCase();
          const matchCat = !ruleCat || ruleCat === "all" || ruleCat === "*" || (targetCategory && ruleCat === targetCategory);
          if (!matchCat) return false;

          const inds = (rule.industries || []).filter((i) => i && i !== "All" && i !== "*");
          if (inds.length > 0 && scope.industry) {
            const targetInd = scope.industry.trim().toLowerCase();
            const matchInd = inds.some((ind) => ind.trim().toLowerCase() === targetInd);
            if (!matchInd) return false;
          }

          const locs = (rule.locations || []).filter((l) => l && l !== "All" && l !== "*");
          if (locs.length > 0) {
            const matchLoc = locs.some((loc) => loc.trim().toLowerCase() === targetCountry);
            if (!matchLoc) return false;
          }

          return true;
        });
      }

      // Fallback: Category scope match
      const planCategory = (plan.targetCategory || "Global").trim().toLowerCase();
      if (planCategory === "global") return true;
      if (targetCategory && planCategory === targetCategory) return true;

      return false;
    })
    .map((plan) => {
      // Find matching country pricing or fallback
      let pricing = plan.countryPricing.find(
        (cp) => cp.country.trim().toLowerCase() === targetCountry
      );

      // If no exact country found, fallback to USD / United States entry, or the first entry
      if (!pricing) {
        pricing =
          plan.countryPricing.find((cp) => cp.country.toLowerCase().includes("united states") || cp.currency === "USD") ||
          plan.countryPricing[0] ||
          DEFAULT_COUNTRY_PRICING[0];
      }

      const isIndustrySpecific = (plan.targetCategory || "Global").trim().toLowerCase() !== "global";

      return {
        plan,
        pricing,
        isIndustrySpecific,
      };
    });
}

/**
 * Filter credit packages based on workspace scope:
 * 1. Must be Active
 * 2. Must NOT be Internal Staff Only
 * 3. Matches workspace country/currency (or fallback to USD / US)
 */
export function getAvailableCreditPackagesForWorkspace(
  packages: CreditPackage[],
  scope: WorkspaceScope
): CreditPackage[] {
  const targetCountry = (scope.country || "United States").trim().toLowerCase();
  const targetCurrency = (scope.currency || "").trim().toUpperCase();

  const activeNonInternal = packages.filter((p) => p.isActive && !p.isInternalStaffOnly);

  // Exact country or currency match
  const matched = activeNonInternal.filter((p) => {
    const pkgCountry = p.country.trim().toLowerCase();
    const pkgCurrency = p.currency.trim().toUpperCase();
    return pkgCountry === targetCountry || (targetCurrency && pkgCurrency === targetCurrency);
  });

  if (matched.length > 0) {
    return matched;
  }

  // Fallback to USD / US credit packages if none specifically defined for this country
  return activeNonInternal.filter(
    (p) => p.country.toLowerCase().includes("united states") || p.currency === "USD"
  );
}

// ── TEAM MEMBER PACKS STORE ──

export function getStoredTeamMemberPacks(): TeamMemberPack[] {
  try {
    const raw = localStorage.getItem(TEAM_MEMBER_PACKS_STORAGE_KEY);
    let list: TeamMemberPack[] = raw ? JSON.parse(raw) : INITIAL_TEAM_MEMBER_PACKS;
    list = list.map((pack) => ({
      ...pack,
      countryPricing:
        pack.countryPricing && pack.countryPricing.length > 0
          ? pack.countryPricing
          : getDefaultPackageCountryPricing(pack.totalPrice),
    }));
    return list;
  } catch (err) {
    console.error("Error reading team member packs:", err);
    return INITIAL_TEAM_MEMBER_PACKS;
  }
}

export function saveTeamMemberPack(pack: TeamMemberPack): void {
  try {
    const packs = getStoredTeamMemberPacks();
    const idx = packs.findIndex((p) => p.id === pack.id);
    let next: TeamMemberPack[];
    if (idx >= 0) {
      next = [...packs];
      next[idx] = pack;
    } else {
      next = [pack, ...packs];
    }
    localStorage.setItem(TEAM_MEMBER_PACKS_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(PLANS_BILLING_CHANGED_EVENT, { detail: { type: "team_pack_saved", pack } }));
  } catch (err) {
    console.error("Error saving team member pack:", err);
  }
}

export function deleteTeamMemberPack(id: string): void {
  try {
    const packs = getStoredTeamMemberPacks();
    const next = packs.filter((p) => p.id !== id);
    localStorage.setItem(TEAM_MEMBER_PACKS_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(PLANS_BILLING_CHANGED_EVENT, { detail: { type: "team_pack_deleted", id } }));
  } catch (err) {
    console.error("Error deleting team member pack:", err);
  }
}

// ── GLOBAL BILLING SETTINGS (FR-5, FR-8) ──

export function getStoredGlobalBillingSettings(): GlobalBillingSettings {
  try {
    const raw = localStorage.getItem(GLOBAL_BILLING_SETTINGS_KEY);
    if (!raw) {
      localStorage.setItem(GLOBAL_BILLING_SETTINGS_KEY, JSON.stringify(INITIAL_GLOBAL_BILLING_SETTINGS));
      return INITIAL_GLOBAL_BILLING_SETTINGS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading global billing settings:", err);
    return INITIAL_GLOBAL_BILLING_SETTINGS;
  }
}

export function saveGlobalBillingSettings(settings: GlobalBillingSettings): void {
  try {
    localStorage.setItem(GLOBAL_BILLING_SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(PLANS_BILLING_CHANGED_EVENT, { detail: { type: "global_settings_saved", settings } }));
  } catch (err) {
    console.error("Error saving global billing settings:", err);
  }
}

// ── CREDIT ACTIONS STORE (FR-13, FR-14) ──

export function getStoredCreditActions(): CreditAction[] {
  try {
    const raw = localStorage.getItem(CREDIT_ACTIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CREDIT_ACTIONS_STORAGE_KEY, JSON.stringify(INITIAL_CREDIT_ACTIONS));
      return INITIAL_CREDIT_ACTIONS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading credit actions:", err);
    return INITIAL_CREDIT_ACTIONS;
  }
}

export function saveCreditAction(action: CreditAction): void {
  try {
    const actions = getStoredCreditActions();
    const idx = actions.findIndex((a) => a.id === action.id);
    let next: CreditAction[];
    if (idx >= 0) {
      next = [...actions];
      next[idx] = action;
    } else {
      next = [action, ...actions];
    }
    localStorage.setItem(CREDIT_ACTIONS_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(PLANS_BILLING_CHANGED_EVENT, { detail: { type: "credit_action_saved", action } }));
  } catch (err) {
    console.error("Error saving credit action:", err);
  }
}

export function deleteCreditAction(id: string): void {
  try {
    const actions = getStoredCreditActions();
    const next = actions.filter((a) => a.id !== id);
    localStorage.setItem(CREDIT_ACTIONS_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(PLANS_BILLING_CHANGED_EVENT, { detail: { type: "credit_action_deleted", id } }));
  } catch (err) {
    console.error("Error deleting credit action:", err);
  }
}

// ── CREDIT DEDUCTION LOGS & EXECUTION (FR-14, FR-15) ──

export function getStoredCreditDeductionLogs(workspaceId?: string): CreditDeductionLog[] {
  try {
    const raw = localStorage.getItem(CREDIT_DEDUCTION_LOGS_KEY);
    const allLogs: CreditDeductionLog[] = raw ? JSON.parse(raw) : INITIAL_CREDIT_DEDUCTION_LOGS;
    if (!workspaceId) return allLogs;
    return allLogs.filter((l) => l.workspaceId === workspaceId || l.workspaceId === "demo");
  } catch (err) {
    console.error("Error reading deduction logs:", err);
    return INITIAL_CREDIT_DEDUCTION_LOGS;
  }
}

export function recordCreditDeduction(
  workspaceId: string,
  actionId: string,
  units: number = 1
): { deducted: number; remaining: number; log: CreditDeductionLog } {
  const actions = getStoredCreditActions();
  const action = actions.find((a) => a.id === actionId) || {
    id: actionId,
    name: "General Activity",
    creditsDeducted: 1,
    unitLabel: "per unit",
    linkedFeature: "Calls" as const,
  };

  const totalDeducted = Math.max(1, Math.round(action.creditsDeducted * units));
  const sub = getWorkspaceSubscription(workspaceId);
  const newUsed = (sub.creditsUsed || 0) + totalDeducted;
  const newRemaining = Math.max(0, (sub.creditsRemaining || 0) - totalDeducted);

  const newLog: CreditDeductionLog = {
    id: `deduct-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    workspaceId,
    actionId: action.id,
    actionName: action.name,
    linkedFeature: action.linkedFeature,
    units,
    creditsDeducted: totalDeducted,
    timestamp: new Date().toISOString(),
    details: `${units} ${action.unitLabel} (${action.name})`,
  };

  try {
    const allLogs = getStoredCreditDeductionLogs();
    const nextLogs = [newLog, ...allLogs];
    localStorage.setItem(CREDIT_DEDUCTION_LOGS_KEY, JSON.stringify(nextLogs));
  } catch (err) {
    console.error("Error logging deduction:", err);
  }

  updateWorkspaceSubscription(workspaceId, {
    creditsUsed: newUsed,
    creditsRemaining: newRemaining,
  });

  return { deducted: totalDeducted, remaining: newRemaining, log: newLog };
}

// ── PLAN ASSIGNMENT (FR-10) WITH MULTI-CATEGORY SUPPORT ──

export function getSubscriptionDisplayPlanName(sub: WorkspaceSubscription | null | undefined): string {
  if (!sub) return "No Plan Assigned";
  if (sub.planName && sub.planName !== "No Plan Assigned") {
    return sub.planName;
  }
  if ((sub.tier || "").toLowerCase() === "free" || sub.amount === 0) {
    return "Free Plan";
  }
  return "AI Clinic Receptionist Starter";
}

export function assignPlanToWorkspace(
  workspaceId: string,
  planId: string,
  billingCycle: "monthly" | "yearly" = "monthly",
  currency: string = "USD"
): WorkspaceSubscription {
  const plans = getStoredPlans();
  const existing = getWorkspaceSubscription(workspaceId);
  const targetPlan = plans.find((p) => p.id === planId);
  if (!targetPlan) {
    return existing;
  }
  const countryPricing =
    targetPlan.countryPricing?.find((cp) => cp.currency === currency) ||
    targetPlan.countryPricing?.[0] ||
    DEFAULT_COUNTRY_PRICING[0];

  const amount = billingCycle === "yearly" ? countryPricing.yearlyPrice : countryPricing.monthlyPrice;
  const planCredits = billingCycle === "yearly" ? targetPlan.yearlyCredits : targetPlan.monthlyCredits;
  const planSeats = targetPlan.includedSeats || (targetPlan.tier === "Starter" ? 2 : targetPlan.tier === "Professional" ? 5 : 20);
  const planCategory = targetPlan.category || "AI Receptionist";

  // Single Active Plan Rule: User can only have one active plan at a time
  const updated: WorkspaceSubscription = {
    ...existing,
    activePlans: [
      {
        planId: targetPlan.id,
        planName: targetPlan.name,
        category: planCategory,
        tier: targetPlan.tier,
        billingCycle,
        amount,
        currency: countryPricing.currency,
        currencySymbol: countryPricing.currencySymbol,
        includedSeats: planSeats,
        monthlyCredits: planCredits,
        yearlyCredits: targetPlan.yearlyCredits,
      },
    ],
    planId: targetPlan.id,
    planName: targetPlan.name,
    tier: targetPlan.tier,
    billingCycle,
    amount,
    currency: countryPricing.currency,
    currencySymbol: countryPricing.currencySymbol,
    status: "Active",
    includedSeats: planSeats,
    planCredits,
    totalCredits: planCredits + (existing.addonCredits || 0),
    creditsRemaining: Math.max(0, planCredits + (existing.addonCredits || 0) - (existing.creditsUsed || 0)),
    nextRenewalDate: new Date(Date.now() + (billingCycle === "yearly" ? 365 : 30) * 86400000).toISOString().slice(0, 10),
  };

  updateWorkspaceSubscription(workspaceId, updated);
  return updated;
}

// ── BILLING CART STORE & CHECKOUT ENGINE ──

export function getStoredCart(workspaceId: string): CartItem[] {
  try {
    const raw = localStorage.getItem(`${CART_STORAGE_KEY}_${workspaceId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export function saveStoredCart(workspaceId: string, items: CartItem[]): void {
  try {
    localStorage.setItem(`${CART_STORAGE_KEY}_${workspaceId}`, JSON.stringify(items));
    window.dispatchEvent(
      new CustomEvent(CART_CHANGED_EVENT, { detail: { workspaceId, items } })
    );
    window.dispatchEvent(
      new CustomEvent(PLANS_BILLING_CHANGED_EVENT, { detail: { type: "cart_updated", workspaceId } })
    );
  } catch (err) {
    console.error("Error saving cart:", err);
  }
}

export function addToCart(workspaceId: string, item: Omit<CartItem, "id">): CartItem[] {
  const current = getStoredCart(workspaceId);
  // Single active plan rule: Adding a plan replaces any existing plan in the cart,
  // while preserving credit packs and team member seats
  let next: CartItem[];
  if (item.type === "plan") {
    next = current.filter((ci) => ci.type !== "plan");
  } else {
    next = [...current];
  }

  const newItem: CartItem = {
    ...item,
    id: `cart-item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
  };
  next.push(newItem);
  saveStoredCart(workspaceId, next);
  return next;
}

export function removeFromCart(workspaceId: string, itemId: string): CartItem[] {
  const current = getStoredCart(workspaceId);
  const next = current.filter((ci) => ci.id !== itemId);
  saveStoredCart(workspaceId, next);
  return next;
}

export function clearCart(workspaceId: string): void {
  saveStoredCart(workspaceId, []);
}

export function checkoutCart(workspaceId: string): WorkspaceSubscription {
  const cart = getStoredCart(workspaceId);
  if (cart.length === 0) {
    return getWorkspaceSubscription(workspaceId);
  }

  const existing = getWorkspaceSubscription(workspaceId);
  const planItem = cart.find((item) => item.type === "plan" && item.planId);

  let additionalAddonCredits = 0;
  let additionalExtraSeats = 0;
  const recentPackages = [...(existing.recentPackages || [])];
  const recentMemberPacks = [...(existing.recentMemberPacks || [])];

  for (const item of cart) {
    if (item.type === "credit_pack" || item.type === "custom_credits") {
      const credits = item.credits || 0;
      additionalAddonCredits += credits;
      recentPackages.unshift({
        packageId: item.id,
        packageName: item.title,
        credits,
        amount: item.price,
        currencySymbol: item.currencySymbol,
        purchasedAt: new Date().toISOString(),
      });
    } else if (item.type === "team_pack" || item.type === "custom_seats") {
      const members = item.members || 0;
      additionalExtraSeats += members;
      recentMemberPacks.unshift({
        packId: item.id,
        packName: item.title,
        members,
        amount: item.price,
        currencySymbol: item.currencySymbol,
        purchasedAt: new Date().toISOString(),
      });
    }
  }

  let updated: WorkspaceSubscription;

  if (planItem && planItem.planId) {
    const plans = getStoredPlans();
    const targetPlan = plans.find((p) => p.id === planItem.planId);
    const planSeats =
      planItem.members ||
      targetPlan?.includedSeats ||
      (planItem.planTier === "Starter" ? 2 : planItem.planTier === "Professional" ? 5 : 20);
    const planCredits =
      planItem.credits ||
      (planItem.billingCycle === "yearly" ? targetPlan?.yearlyCredits : targetPlan?.monthlyCredits) ||
      1000;

    updated = {
      ...existing,
      activePlans: [
        {
          planId: planItem.planId,
          planName: planItem.title,
          category: planItem.category || targetPlan?.category || "AI Receptionist",
          tier: planItem.planTier || targetPlan?.tier || "Starter",
          billingCycle: planItem.billingCycle || "monthly",
          amount: planItem.price,
          currency: planItem.currency,
          currencySymbol: planItem.currencySymbol,
          includedSeats: planSeats,
          monthlyCredits: planCredits,
        },
      ],
      planId: planItem.planId,
      planName: planItem.title,
      tier: planItem.planTier || targetPlan?.tier || "Starter",
      billingCycle: planItem.billingCycle || "monthly",
      amount: planItem.price,
      currency: planItem.currency,
      currencySymbol: planItem.currencySymbol,
      status: "Active",
      includedSeats: planSeats,
      extraSeatsPurchased: (existing.extraSeatsPurchased || 0) + additionalExtraSeats,
      planCredits,
      addonCredits: (existing.addonCredits || 0) + additionalAddonCredits,
      totalCredits: planCredits + (existing.addonCredits || 0) + additionalAddonCredits,
      creditsRemaining: Math.max(
        0,
        planCredits + (existing.addonCredits || 0) + additionalAddonCredits - (existing.creditsUsed || 0)
      ),
      recentPackages,
      recentMemberPacks,
      lastCreditTopupDate: additionalAddonCredits > 0 ? new Date().toISOString() : existing.lastCreditTopupDate,
      nextRenewalDate: new Date(
        Date.now() + (planItem.billingCycle === "yearly" ? 365 : 30) * 86400000
      ).toISOString().slice(0, 10),
    };
  } else {
    // Only credits or seats purchased without a plan
    updated = {
      ...existing,
      extraSeatsPurchased: (existing.extraSeatsPurchased || 0) + additionalExtraSeats,
      addonCredits: (existing.addonCredits || 0) + additionalAddonCredits,
      totalCredits: (existing.planCredits || 0) + (existing.addonCredits || 0) + additionalAddonCredits,
      creditsRemaining: Math.max(
        0,
        (existing.planCredits || 0) + (existing.addonCredits || 0) + additionalAddonCredits - (existing.creditsUsed || 0)
      ),
      recentPackages,
      recentMemberPacks,
      lastCreditTopupDate: additionalAddonCredits > 0 ? new Date().toISOString() : existing.lastCreditTopupDate,
    };
  }

  updateWorkspaceSubscription(workspaceId, updated);
  clearCart(workspaceId);
  return updated;
}

// ── ADD-ON PURCHASES (FR-7, FR-9) ──

export function purchaseCustomCreditsForWorkspace(workspaceId: string, credits: number): WorkspaceSubscription {
  const settings = getStoredGlobalBillingSettings();
  const sub = getWorkspaceSubscription(workspaceId);
  const cost = parseFloat((credits * settings.defaultPricePerCredit).toFixed(2));

  const updatedAddon = (sub.addonCredits || 0) + credits;
  const updatedTotal = (sub.totalCredits || 0) + credits;
  const updatedRemaining = (sub.creditsRemaining || 0) + credits;

  const recentPackages = [
    {
      packageId: `custom-cred-${Date.now()}`,
      packageName: `Custom Top-Up (${credits.toLocaleString()} Credits)`,
      credits,
      amount: cost,
      currencySymbol: settings.currencySymbol,
      purchasedAt: new Date().toISOString(),
    },
    ...(sub.recentPackages || []),
  ];

  const updated: WorkspaceSubscription = {
    ...sub,
    addonCredits: updatedAddon,
    totalCredits: updatedTotal,
    creditsRemaining: updatedRemaining,
    lastCreditTopupDate: new Date().toISOString(),
    recentPackages,
  };

  updateWorkspaceSubscription(workspaceId, updated);
  return updated;
}

export function purchaseTeamMemberPackForWorkspace(workspaceId: string, pack: TeamMemberPack): WorkspaceSubscription {
  const sub = getWorkspaceSubscription(workspaceId);
  const updatedExtraSeats = (sub.extraSeatsPurchased || 0) + pack.members;

  const recentMemberPacks = [
    {
      packId: pack.id,
      packName: pack.name,
      members: pack.members,
      amount: pack.totalPrice,
      currencySymbol: pack.currencySymbol,
      purchasedAt: new Date().toISOString(),
    },
    ...(sub.recentMemberPacks || []),
  ];

  const updated: WorkspaceSubscription = {
    ...sub,
    extraSeatsPurchased: updatedExtraSeats,
    recentMemberPacks,
  };

  updateWorkspaceSubscription(workspaceId, updated);
  return updated;
}

export function purchaseCustomTeamMembersForWorkspace(workspaceId: string, memberCount: number): WorkspaceSubscription {
  const settings = getStoredGlobalBillingSettings();
  const sub = getWorkspaceSubscription(workspaceId);
  const cost = parseFloat((memberCount * settings.defaultPricePerExtraMember).toFixed(2));
  const updatedExtraSeats = (sub.extraSeatsPurchased || 0) + memberCount;

  const recentMemberPacks = [
    {
      packId: `custom-members-${Date.now()}`,
      packName: `Custom Seats (${memberCount} Extra Members)`,
      members: memberCount,
      amount: cost,
      currencySymbol: settings.currencySymbol,
      purchasedAt: new Date().toISOString(),
    },
    ...(sub.recentMemberPacks || []),
  ];

  const updated: WorkspaceSubscription = {
    ...sub,
    extraSeatsPurchased: updatedExtraSeats,
    recentMemberPacks,
  };

  updateWorkspaceSubscription(workspaceId, updated);
  return updated;
}

