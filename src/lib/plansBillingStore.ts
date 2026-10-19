/**
 * plansBillingStore.ts
 * Path: src/lib/plansBillingStore.ts
 *
 * Single Source of Truth for Plans, Credit Packages, and Workspace Subscriptions.
 * Admin manages creation, editing, and activation.
 * MantraAssist reads from here and applies Scope-Based Visibility rules.
 */

export type PlanTier = "Starter" | "Professional" | "Custom";

export interface CountryPricing {
  country: string;
  currency: string;
  currencySymbol: string;
  monthlyPrice: number;
  yearlyPrice: number;
}

export interface IndustryPlan {
  id: string;
  name: string;
  tier: PlanTier;
  targetCategory: string; // "Global" or specific category e.g. "Wellness & Lifestyle", "Real Estate", "Healthcare", "IT/Tech"
  description: string;
  monthlyCredits: number;
  yearlyCredits: number;
  isActive: boolean;
  isPopular: boolean;
  isInternalStaffOnly: boolean;
  features: string[];
  linkedProcessTemplates: string[];
  countryPricing: CountryPricing[];
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
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
  status: "Active" | "Past Due" | "Canceled" | "Trial";
  nextRenewalDate: string;
  startDate: string;
  userCount: number;
  totalCredits: number;
  creditsUsed: number;
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
}

export const PLANS_STORAGE_KEY = "mantra_admin_industry_plans_v1";
export const CREDIT_PACKAGES_STORAGE_KEY = "mantra_admin_credit_packages_v1";
export const SUBSCRIPTIONS_STORAGE_KEY = "mantra_workspace_subscriptions_v1";
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

export const INITIAL_INDUSTRY_PLANS: IndustryPlan[] = [
  {
    id: "plan-global-starter",
    name: "Global Starter",
    tier: "Starter",
    targetCategory: "Global",
    description: "Essential AI receptionist, telephony, and core intake workflows for single-practitioner teams.",
    monthlyCredits: 500,
    yearlyCredits: 6000,
    isActive: true,
    isPopular: false,
    isInternalStaffOnly: false,
    features: [
      "1 AI Voice Receptionist agent",
      "500 Included Voice & Chat Credits / mo",
      "Standard Website Chat Widget",
      "Basic Appointment & Calendar Scheduling",
      "Email & SMS Client Confirmations",
      "Standard Support (48h turnaround)",
    ],
    linkedProcessTemplates: ["proc-1", "proc-2"],
    countryPricing: [
      { country: "United States", currency: "USD", currencySymbol: "$", monthlyPrice: 49, yearlyPrice: 470 },
      { country: "India", currency: "INR", currencySymbol: "₹", monthlyPrice: 3999, yearlyPrice: 38390 },
      { country: "United Kingdom", currency: "GBP", currencySymbol: "£", monthlyPrice: 39, yearlyPrice: 375 },
      { country: "Canada", currency: "CAD", currencySymbol: "C$", monthlyPrice: 65, yearlyPrice: 624 },
      { country: "Australia", currency: "AUD", currencySymbol: "A$", monthlyPrice: 75, yearlyPrice: 720 },
      { country: "Germany", currency: "EUR", currencySymbol: "€", monthlyPrice: 45, yearlyPrice: 432 },
    ],
    createdAt: "2026-01-10T10:00:00Z",
    updatedAt: "2026-03-01T12:00:00Z",
  },
  {
    id: "plan-global-pro",
    name: "Global Professional",
    tier: "Professional",
    targetCategory: "Global",
    description: "Complete conversational intelligence, CRM sync, and advanced multi-agent workflows for growing teams.",
    monthlyCredits: 2000,
    yearlyCredits: 24000,
    isActive: true,
    isPopular: true,
    isInternalStaffOnly: false,
    features: [
      "3 AI Voice Receptionists with Accent Matching",
      "2,000 Voice & Chat Credits / mo included",
      "Multi-channel WhatsApp & Two-Way SMS Hub",
      "Automated Appointment & EHR Booking",
      "Custom Intake Forms & Document Generation",
      "Live Call Transfer & Round-Robin Escalation",
      "Priority 24/7 Slack & Phone Support",
    ],
    linkedProcessTemplates: ["proc-1", "proc-3", "proc-4"],
    countryPricing: [
      { country: "United States", currency: "USD", currencySymbol: "$", monthlyPrice: 149, yearlyPrice: 1430 },
      { country: "India", currency: "INR", currencySymbol: "₹", monthlyPrice: 11999, yearlyPrice: 115190 },
      { country: "United Kingdom", currency: "GBP", currencySymbol: "£", monthlyPrice: 119, yearlyPrice: 1142 },
      { country: "Canada", currency: "CAD", currencySymbol: "C$", monthlyPrice: 199, yearlyPrice: 1910 },
      { country: "Australia", currency: "AUD", currencySymbol: "A$", monthlyPrice: 229, yearlyPrice: 2198 },
      { country: "Germany", currency: "EUR", currencySymbol: "€", monthlyPrice: 139, yearlyPrice: 1334 },
    ],
    createdAt: "2026-01-10T10:00:00Z",
    updatedAt: "2026-03-01T12:00:00Z",
  },
  {
    id: "plan-global-enterprise",
    name: "Global Enterprise Custom",
    tier: "Custom",
    targetCategory: "Global",
    description: "Dedicated AI models, bespoke telephony rate cards, SLA guarantees, and enterprise multi-location support.",
    monthlyCredits: 10000,
    yearlyCredits: 120000,
    isActive: true,
    isPopular: false,
    isInternalStaffOnly: false,
    features: [
      "Unlimited AI Receptionists & Custom Personas",
      "Custom Voice Cloning & Tone Fine-Tuning",
      "10,000 Included Voice & Call Credits / mo",
      "Dedicated Enterprise Account Manager & 99.9% SLA",
      "Custom EHR / CRM Deep API Integration",
      "HIPAA BAA & SOC2 Type II Certified",
      "Custom Telephony & Wholesale Rates",
    ],
    linkedProcessTemplates: ["proc-1", "proc-2", "proc-3", "proc-4"],
    countryPricing: [
      { country: "United States", currency: "USD", currencySymbol: "$", monthlyPrice: 499, yearlyPrice: 4790 },
      { country: "India", currency: "INR", currencySymbol: "₹", monthlyPrice: 39999, yearlyPrice: 383990 },
      { country: "United Kingdom", currency: "GBP", currencySymbol: "£", monthlyPrice: 399, yearlyPrice: 3830 },
      { country: "Canada", currency: "CAD", currencySymbol: "C$", monthlyPrice: 649, yearlyPrice: 6230 },
      { country: "Australia", currency: "AUD", currencySymbol: "A$", monthlyPrice: 749, yearlyPrice: 7190 },
      { country: "Germany", currency: "EUR", currencySymbol: "€", monthlyPrice: 469, yearlyPrice: 4500 },
    ],
    createdAt: "2026-01-10T10:00:00Z",
    updatedAt: "2026-03-01T12:00:00Z",
  },

  // ── INDUSTRY TARGETED PLANS ──
  {
    id: "plan-wellness-pro",
    name: "Wellness Studio Growth",
    tier: "Professional",
    targetCategory: "Wellness & Lifestyle",
    description: "Designed for Yoga Studios, Fitness Gyms, and Nutritionists with class bookings and diet check-ins.",
    monthlyCredits: 1800,
    yearlyCredits: 21600,
    isActive: true,
    isPopular: true,
    isInternalStaffOnly: false,
    features: [
      "Studio AI Voice Receptionist with Class Schedule Sync",
      "1,800 Voice & Chat Credits / mo included",
      "Nutrition & Fitness Intake Forms Integration",
      "WhatsApp Class Reminders & Cancellation Fillers",
      "Member Check-in & Pass Renewal Triggers",
    ],
    linkedProcessTemplates: ["proc-wellness-1"],
    countryPricing: [
      { country: "United States", currency: "USD", currencySymbol: "$", monthlyPrice: 129, yearlyPrice: 1238 },
      { country: "India", currency: "INR", currencySymbol: "₹", monthlyPrice: 9999, yearlyPrice: 95990 },
      { country: "United Kingdom", currency: "GBP", currencySymbol: "£", monthlyPrice: 99, yearlyPrice: 950 },
      { country: "Canada", currency: "CAD", currencySymbol: "C$", monthlyPrice: 169, yearlyPrice: 1622 },
      { country: "Australia", currency: "AUD", currencySymbol: "A$", monthlyPrice: 199, yearlyPrice: 1910 },
      { country: "Germany", currency: "EUR", currencySymbol: "€", monthlyPrice: 119, yearlyPrice: 1142 },
    ],
    createdAt: "2026-02-15T09:00:00Z",
    updatedAt: "2026-03-05T14:30:00Z",
  },
  {
    id: "plan-realestate-pro",
    name: "Real Estate Deal Accelerator",
    tier: "Professional",
    targetCategory: "Real Estate",
    description: "Engineered for Real Estate Brokerages & Property Managers with 24/7 buyer pre-qualification.",
    monthlyCredits: 2500,
    yearlyCredits: 30000,
    isActive: true,
    isPopular: true,
    isInternalStaffOnly: false,
    features: [
      "24/7 Property Showing & Tour Scheduler AI",
      "2,500 Voice & SMS Credits / mo included",
      "MLS / Property Listing Auto-Lookup",
      "Buyer Pre-Qualification & Budget Screening",
      "Instant Lead Routing to Available On-Duty Agents",
    ],
    linkedProcessTemplates: ["proc-re-1"],
    countryPricing: [
      { country: "United States", currency: "USD", currencySymbol: "$", monthlyPrice: 169, yearlyPrice: 1622 },
      { country: "India", currency: "INR", currencySymbol: "₹", monthlyPrice: 13499, yearlyPrice: 129590 },
      { country: "United Kingdom", currency: "GBP", currencySymbol: "£", monthlyPrice: 135, yearlyPrice: 1296 },
      { country: "Canada", currency: "CAD", currencySymbol: "C$", monthlyPrice: 219, yearlyPrice: 2102 },
      { country: "Australia", currency: "AUD", currencySymbol: "A$", monthlyPrice: 259, yearlyPrice: 2486 },
      { country: "Germany", currency: "EUR", currencySymbol: "€", monthlyPrice: 155, yearlyPrice: 1488 },
    ],
    createdAt: "2026-02-18T11:00:00Z",
    updatedAt: "2026-03-10T16:00:00Z",
  },
  {
    id: "plan-healthcare-pro",
    name: "Healthcare Practice Suite",
    tier: "Professional",
    targetCategory: "Healthcare",
    description: "Specialized for Medical Clinics, Dentists, and Specialists with HIPAA-aware triage and claims verify.",
    monthlyCredits: 3000,
    yearlyCredits: 36000,
    isActive: true,
    isPopular: true,
    isInternalStaffOnly: false,
    features: [
      "Clinical AI Receptionist (HIPAA Compliant & Scribe Linked)",
      "3,000 Voice & Scribe Credits / mo included",
      "Insurance Eligibility & CMS-1500 Verification",
      "Patient Pre-Registration & Medical History Forms",
      "Doctor Rota Scheduling & Urgent Care Call Routing",
    ],
    linkedProcessTemplates: ["proc-1", "proc-hc-claims"],
    countryPricing: [
      { country: "United States", currency: "USD", currencySymbol: "$", monthlyPrice: 179, yearlyPrice: 1718 },
      { country: "India", currency: "INR", currencySymbol: "₹", monthlyPrice: 14499, yearlyPrice: 139190 },
      { country: "United Kingdom", currency: "GBP", currencySymbol: "£", monthlyPrice: 145, yearlyPrice: 1392 },
      { country: "Canada", currency: "CAD", currencySymbol: "C$", monthlyPrice: 239, yearlyPrice: 2294 },
      { country: "Australia", currency: "AUD", currencySymbol: "A$", monthlyPrice: 279, yearlyPrice: 2678 },
      { country: "Germany", currency: "EUR", currencySymbol: "€", monthlyPrice: 165, yearlyPrice: 1584 },
    ],
    createdAt: "2026-02-01T08:00:00Z",
    updatedAt: "2026-03-12T10:00:00Z",
  },
  {
    id: "plan-it-starter",
    name: "IT & MSP Dispatch Desk",
    tier: "Starter",
    targetCategory: "IT/Tech",
    description: "Built for IT Managed Services, SaaS, and Helpdesks with ticket triage and on-call engineer dispatch.",
    monthlyCredits: 800,
    yearlyCredits: 9600,
    isActive: true,
    isPopular: false,
    isInternalStaffOnly: false,
    features: [
      "Helpdesk Tier-1 Incident Triage AI Voice Bot",
      "800 Voice & Chat Credits / mo included",
      "Automated JIRA / Zendesk Ticket Creation",
      "Emergency On-Call Escalation Tree",
      "Status Page Outage Notification System",
    ],
    linkedProcessTemplates: ["proc-it-1"],
    countryPricing: [
      { country: "United States", currency: "USD", currencySymbol: "$", monthlyPrice: 69, yearlyPrice: 662 },
      { country: "India", currency: "INR", currencySymbol: "₹", monthlyPrice: 5499, yearlyPrice: 52790 },
      { country: "United Kingdom", currency: "GBP", currencySymbol: "£", monthlyPrice: 55, yearlyPrice: 528 },
      { country: "Canada", currency: "CAD", currencySymbol: "C$", monthlyPrice: 89, yearlyPrice: 854 },
      { country: "Australia", currency: "AUD", currencySymbol: "A$", monthlyPrice: 105, yearlyPrice: 1008 },
      { country: "Germany", currency: "EUR", currencySymbol: "€", monthlyPrice: 65, yearlyPrice: 624 },
    ],
    createdAt: "2026-02-20T10:00:00Z",
    updatedAt: "2026-03-08T15:00:00Z",
  },

  // ── TEST FLAGS (INTERNAL & INACTIVE) ──
  {
    id: "plan-internal-staff-beta",
    name: "Internal Staff Alpha VIP",
    tier: "Custom",
    targetCategory: "Global",
    description: "Internal-only staff sandbox tier with uncapped voice minutes for internal development and QA.",
    monthlyCredits: 50000,
    yearlyCredits: 600000,
    isActive: true,
    isPopular: false,
    isInternalStaffOnly: true, // MUST NEVER APPEAR IN CUSTOMER MANTRAASSIST APP
    features: [
      "Staff Internal Sandbox Only",
      "Uncapped LiveKit / Cartesia streaming limits",
      "Beta experimental voice agents",
    ],
    linkedProcessTemplates: [],
    countryPricing: [
      { country: "United States", currency: "USD", currencySymbol: "$", monthlyPrice: 0, yearlyPrice: 0 },
      { country: "India", currency: "INR", currencySymbol: "₹", monthlyPrice: 0, yearlyPrice: 0 },
      { country: "United Kingdom", currency: "GBP", currencySymbol: "£", monthlyPrice: 0, yearlyPrice: 0 },
    ],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "plan-inactive-legacy",
    name: "Legacy 2024 Starter (Deprecated)",
    tier: "Starter",
    targetCategory: "Global",
    description: "Grandfathered plan from 2024. Deactivated for all new customer signups.",
    monthlyCredits: 200,
    yearlyCredits: 2400,
    isActive: false, // MUST NEVER APPEAR IN CUSTOMER MANTRAASSIST APP
    isPopular: false,
    isInternalStaffOnly: false,
    features: ["Legacy voice assistant only"],
    linkedProcessTemplates: [],
    countryPricing: [
      { country: "United States", currency: "USD", currencySymbol: "$", monthlyPrice: 29, yearlyPrice: 278 },
      { country: "India", currency: "INR", currencySymbol: "₹", monthlyPrice: 2399, yearlyPrice: 23000 },
    ],
    createdAt: "2024-06-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
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

export const INITIAL_WORKSPACE_SUBSCRIPTIONS: Record<string, WorkspaceSubscription> = {
  demo: {
    workspaceId: "demo",
    planId: "plan-healthcare-pro",
    planName: "Healthcare Practice Suite",
    tier: "Professional",
    billingCycle: "yearly",
    amount: 1718,
    currency: "USD",
    currencySymbol: "$",
    status: "Active",
    nextRenewalDate: "2027-01-15",
    startDate: "2026-01-15",
    userCount: 2,
    totalCredits: 3500,
    creditsUsed: 1240,
    creditsRemaining: 2260,
    recentPackages: [
      {
        packageId: "cred-pkg-500-us",
        packageName: "500 Credits Booster",
        credits: 500,
        amount: 25,
        currencySymbol: "$",
        purchasedAt: "2026-02-10T14:22:00Z",
      },
    ],
  },
  "1": {
    workspaceId: "1",
    planId: "plan-healthcare-pro",
    planName: "Healthcare Practice Suite",
    tier: "Professional",
    billingCycle: "monthly",
    amount: 179,
    currency: "USD",
    currencySymbol: "$",
    status: "Active",
    nextRenewalDate: "2026-04-15",
    startDate: "2026-01-15",
    userCount: 3,
    totalCredits: 3000,
    creditsUsed: 2150,
    creditsRemaining: 850,
  },
  "2": {
    workspaceId: "2",
    planId: "plan-global-starter",
    planName: "Global Starter",
    tier: "Starter",
    billingCycle: "monthly",
    amount: 49,
    currency: "USD",
    currencySymbol: "$",
    status: "Active",
    nextRenewalDate: "2026-04-01",
    startDate: "2026-02-01",
    userCount: 1,
    totalCredits: 500,
    creditsUsed: 380,
    creditsRemaining: 120,
  },
  "3": {
    workspaceId: "3",
    planId: "plan-global-pro",
    planName: "Global Professional",
    tier: "Professional",
    billingCycle: "yearly",
    amount: 1430,
    currency: "USD",
    currencySymbol: "$",
    status: "Active",
    nextRenewalDate: "2026-11-20",
    startDate: "2025-11-20",
    userCount: 5,
    totalCredits: 4000,
    creditsUsed: 2890,
    creditsRemaining: 1110,
  },
};

// ── GETTERS & SETTERS ──

export function getStoredPlans(): IndustryPlan[] {
  try {
    const raw = localStorage.getItem(PLANS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(INITIAL_INDUSTRY_PLANS));
      return INITIAL_INDUSTRY_PLANS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading plans:", err);
    return INITIAL_INDUSTRY_PLANS;
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
    if (!raw) {
      localStorage.setItem(CREDIT_PACKAGES_STORAGE_KEY, JSON.stringify(INITIAL_CREDIT_PACKAGES));
      return INITIAL_CREDIT_PACKAGES;
    }
    return JSON.parse(raw);
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

export function getWorkspaceSubscription(workspaceId: string): WorkspaceSubscription {
  const subs = getStoredSubscriptions();
  if (subs[workspaceId]) {
    return subs[workspaceId];
  }
  // Fallback default subscription
  return {
    workspaceId,
    planId: "plan-global-starter",
    planName: "Global Starter",
    tier: "Starter",
    billingCycle: "monthly",
    amount: 49,
    currency: "USD",
    currencySymbol: "$",
    status: "Active",
    nextRenewalDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    startDate: new Date().toISOString().slice(0, 10),
    userCount: 1,
    totalCredits: 500,
    creditsUsed: 0,
    creditsRemaining: 500,
  };
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

      // Rule 3: Category scope match
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
