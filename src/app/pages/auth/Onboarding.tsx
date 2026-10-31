import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router";
import { toast } from "sonner";
import { useOrganization } from "../../context/OrganizationContext";
import { useHowItWorks } from "../../context/HowItWorksContext";
import { useAuth } from "../../context/AuthContext";
import {
  Building2,
  Building,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Check,
  X,
  Plus,
  Trash2,
  FileText,
  FileUp,
  Search,
  Headphones,
  Calendar,
  Layers,
  FileCheck2,
  Globe,
} from "lucide-react";
import CenteredOnboardingShell from "./CenteredOnboardingShell";
import { UploadedDoc, formatBytes } from "./onboardingHelpers";
import {
  getStoredProcesses,
  saveStoredProcesses,
  PROCESS_STORE_EVENT,
} from "../../../lib/useProcessStore";

export const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "India",
  "Germany",
  "France",
  "United Arab Emirates",
  "Singapore",
  "Spain",
  "Italy",
  "Brazil",
  "Mexico",
  "Japan",
  "South Africa",
  "New Zealand",
  "Ireland",
  "Switzerland",
  "Netherlands",
  "Other",
];

export const INDUSTRY_OPTIONS = [
  "Healthcare & Clinic",
  "Dental Practice",
  "Wellness & Therapy",
  "Veterinary Care",
  "Legal & Advisory",
  "Home & Field Services",
  "IT & Tech",
  "Other Business",
];

export const CATEGORY_SPECIALTIES: Record<string, string[]> = {
  "Healthcare & Clinic": [
    "General Physician",
    "Dentist",
    "Dermatologist",
    "Cardiologist",
    "Pediatrician",
    "Therapist / Mental Health",
    "Orthopedic",
    "Gynecologist / OBGYN",
    "Ophthalmologist",
    "ENT Specialist",
    "Physical Therapy",
    "Diagnostics",
  ],
  "Dental Practice": [
    "General Dentist",
    "Orthodontist",
    "Periodontist",
    "Endodontist",
    "Pediatric Dentist",
    "Oral Surgeon",
  ],
  "Wellness & Therapy": [
    "Psychologist",
    "Licensed Counselor",
    "Life & Health Coach",
    "Chiropractor",
    "Acupuncturist",
    "Nutritionist",
  ],
  "Veterinary Care": [
    "Small Animal Clinic",
    "General Veterinary",
    "Emergency Pet Hospital",
    "Equine / Large Animal",
    "Exotic Animals",
  ],
  "Legal & Advisory": [
    "Law Firm",
    "Accounting & CPA",
    "Financial Advisory",
    "Estate Planning",
    "Tax Consulting",
  ],
  "Home & Field Services": [
    "HVAC & Climate",
    "Plumbing",
    "Electrical",
    "Roofing & Construction",
    "Cleaning Services",
  ],
  "IT & Tech": [
    "Software & SaaS",
    "IT Support & Managed Services",
    "Cybersecurity",
    "Web & App Development",
  ],
  "Other Business": [
    "Consulting",
    "Retail & Commerce",
    "Automotive",
    "Custom Service",
  ],
};

const ALL_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export const PRACTICE_BUILD_STATUSES = [
  "your organization",
  "Workspace",
  "Knowledge",
  "Schedule",
  "AI Reception",
];

// ─────────────────────────────────────────────────────────────
// TYPEWRITER ANIMATION COMPONENT ("Setting up " is fixed)
// ─────────────────────────────────────────────────────────────
function TypewriterStatus({
  onWordChange,
}: {
  onWordChange?: (wordIndex: number) => void;
}) {
  const [wordIdx, setWordIdx] = useState(0);
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    onWordChange?.(wordIdx);
  }, [wordIdx, onWordChange]);

  useEffect(() => {
    const currentWord = PRACTICE_BUILD_STATUSES[wordIdx];
    const isLastWord = wordIdx === PRACTICE_BUILD_STATUSES.length - 1;

    let timeout: any;

    if (!isDeleting) {
      if (text.length < currentWord.length) {
        timeout = setTimeout(() => {
          setText(currentWord.slice(0, text.length + 1));
        }, 36);
      } else if (!isLastWord) {
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, 620);
      }
    } else {
      if (text.length > 0) {
        timeout = setTimeout(() => {
          setText(currentWord.slice(0, text.length - 1));
        }, 20);
      } else {
        setIsDeleting(false);
        setWordIdx((prev) => Math.min(prev + 1, PRACTICE_BUILD_STATUSES.length - 1));
      }
    }

    return () => clearTimeout(timeout);
  }, [text, isDeleting, wordIdx]);

  return (
    <div className="flex items-center justify-center text-sm sm:text-base font-medium text-slate-600 mt-9 tracking-tight select-none">
      <span>Setting up&nbsp;</span>
      <span className="font-semibold text-slate-900 inline-flex items-center">
        {text}
        <span className="inline-block w-[2px] h-4.5 bg-slate-900 ml-1 animate-pulse" />
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CIRCULAR PROGRESS RING (Top-Right Corner on Each Step)
// ─────────────────────────────────────────────────────────────
function ProgressRing({ currentStep, totalSteps = 5 }: { currentStep: number; totalSteps?: number }) {
  const size = 46;
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = currentStep / totalSteps;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="flex items-center gap-2 shrink-0">
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
        title={`Step ${currentStep} of ${totalSteps}`}
      >
        <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle stroke in slate-900 / dark primary brand color */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#182230"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span
            className="text-[12px] font-bold text-slate-800 leading-none"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {currentStep}/{totalSteps}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SHARED WEBSITE DETECTED CAPSULE (Brand Blue, Above Card)
// ─────────────────────────────────────────────────────────────
export function WebsiteDetectedCapsule({
  websiteDisplay,
}: {
  websiteDisplay: string;
}) {
  return (
    <div
      className="inline-flex items-center h-7 px-3 rounded-full text-[12px] bg-[#EFF8FF] border border-[#CFE6F7] shadow-2xs max-w-[calc(100vw-32px)] select-none whitespace-nowrap shrink-0"
      style={{ height: "28px" }}
    >
      {/* Sparkle icon (14px) + label in brand blue, medium weight, 6px gap */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-[#1456F0] shrink-0" />
        <span className="font-medium text-[#1456F0]">Detected from website</span>
      </div>

      {/* Thin 1px vertical divider with equal spacing on both sides */}
      <span className="w-px h-3 bg-[#CFE6F7] mx-2.5 shrink-0" aria-hidden="true" />

      {/* Globe icon (14px) + URL in muted slate gray, regular weight, 6px gap, truncated at ~280px */}
      <div className="flex items-center gap-1.5 min-w-0">
        <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-slate-500 font-normal truncate max-w-[140px] xs:max-w-[200px] sm:max-w-[280px]">
          {websiteDisplay}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REUSABLE STEP HEADER (Card Heading & Progress Ring)
// ─────────────────────────────────────────────────────────────
function StepHeader({
  title,
  subtitle,
  currentStep,
}: {
  title: string;
  subtitle: string;
  currentStep: number;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="min-w-0 flex-1">
        <h2
          className="text-2xl sm:text-[26px] font-bold mb-1 text-slate-900 tracking-tight"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {title}
        </h2>
        <p
          className="text-[13px] text-slate-500 leading-normal"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {subtitle}
        </p>
      </div>
      <ProgressRing currentStep={currentStep} totalSteps={5} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REUSABLE PREMIUM CUSTOM DROPDOWN (Single & Multi-Select)
// ─────────────────────────────────────────────────────────────
interface CustomDropdownProps {
  label?: string;
  helperText?: string;
  placeholder?: string;
  options: string[];
  value: string | string[];
  onChange: (val: any) => void;
  isMulti?: boolean;
  required?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  label,
  helperText,
  placeholder = "Select an option",
  options,
  value,
  onChange,
  isMulti = false,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    showAbove: boolean;
  }>({
    top: 0,
    left: 0,
    width: 0,
    showAbove: false,
  });

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const showAbove = spaceBelow < 250 && rect.top > 250;
      setCoords({
        top: showAbove ? rect.top - 6 : rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        showAbove,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener("scroll", handleScrollOrResize, true);
      window.addEventListener("resize", handleScrollOrResize);
      return () => {
        window.removeEventListener("scroll", handleScrollOrResize, true);
        window.removeEventListener("resize", handleScrollOrResize);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const isSelected = (opt: string) => {
    if (isMulti && Array.isArray(value)) {
      return value.includes(opt);
    }
    return value === opt;
  };

  const handleSelectOption = (opt: string) => {
    if (isMulti && Array.isArray(value)) {
      if (value.includes(opt)) {
        onChange(value.filter((item) => item !== opt));
      } else {
        onChange([...value, opt]);
      }
    } else {
      onChange(opt);
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  const handleRemoveChip = (e: React.MouseEvent, opt: string) => {
    e.stopPropagation();
    if (isMulti && Array.isArray(value)) {
      onChange(value.filter((item) => item !== opt));
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label
          className="block text-[13px] font-semibold text-slate-800 mb-1.5"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {label}
          {required && <span className="text-slate-400 font-normal ml-0.5">*</span>}
        </label>
      )}

      {helperText && (
        <p className="text-[12px] text-slate-500 mb-2 leading-relaxed">
          {helperText}
        </p>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          updatePosition();
          setIsOpen(!isOpen);
        }}
        className={`w-full min-h-[44px] px-3.5 py-2 bg-white border rounded-xl text-left flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs ${
          isOpen
            ? "border-slate-800 ring-2 ring-slate-900/10"
            : "border-slate-200 hover:border-slate-300"
        }`}
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        <div className="flex-1 min-w-0">
          {isMulti && Array.isArray(value) ? (
            value.length === 0 ? (
              <span className="text-slate-400 text-sm">{placeholder}</span>
            ) : (
              <div className="flex flex-wrap gap-1.5 py-0.5">
                {value.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200"
                  >
                    <span>{item}</span>
                    <span
                      onClick={(e) => handleRemoveChip(e, item)}
                      className="p-0.5 hover:text-rose-600 rounded cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  </span>
                ))}
              </div>
            )
          ) : typeof value === "string" && value ? (
            <span className="text-sm font-medium text-slate-900 truncate block">
              {value}
            </span>
          ) : (
            <span className="text-slate-400 text-sm">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transform transition-transform duration-200 ${
            isOpen ? "rotate-180 text-slate-800" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu Portaled to Document Body */}
      {isOpen &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998] sm:hidden bg-slate-900/30"
              onClick={() => setIsOpen(false)}
            />
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                top:
                  typeof window !== "undefined" && window.innerWidth < 640
                    ? undefined
                    : coords.showAbove
                    ? undefined
                    : `${coords.top}px`,
                bottom:
                  typeof window !== "undefined" && window.innerWidth < 640
                    ? 0
                    : coords.showAbove
                    ? `${Math.max(10, window.innerHeight - coords.top)}px`
                    : undefined,
                left:
                  typeof window !== "undefined" && window.innerWidth < 640
                    ? 0
                    : `${coords.left}px`,
                width:
                  typeof window !== "undefined" && window.innerWidth < 640
                    ? "100%"
                    : `${coords.width}px`,
                zIndex: 9999,
                fontFamily: "Inter, sans-serif",
              }}
              className="bg-white rounded-t-2xl sm:rounded-xl border border-slate-200 shadow-2xl overflow-hidden py-1 max-h-[70vh] sm:max-h-64 flex flex-col"
            >
              {options.length > 7 && (
                <div className="p-2 border-b border-slate-100 shrink-0">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
                {filteredOptions.length === 0 ? (
                  <div className="px-3.5 py-3 text-xs text-slate-400 text-center">
                    No matching options
                  </div>
                ) : (
                  filteredOptions.map((opt) => {
                    const selected = isSelected(opt);
                    return (
                      <div
                        key={opt}
                        onClick={() => handleSelectOption(opt)}
                        className={`px-3.5 py-2.5 flex items-center justify-between text-xs sm:text-sm cursor-pointer transition-colors ${
                          selected
                            ? "bg-slate-100 text-slate-900 font-semibold"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className="truncate pr-2">{opt}</span>
                        {selected && (
                          <Check className="w-4 h-4 text-slate-900 shrink-0 stroke-[2.5]" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// DATA INTERFACES FOR LOCATIONS & SERVICES
// ─────────────────────────────────────────────────────────────
export interface LocationEntry {
  id: string;
  name: string;
  address: string;
  operatingDays: string[];
  opensAt: string;
  closesAt: string;
  isExpanded: boolean;
}

export interface ServiceEntry {
  id: string;
  name: string;
  description: string;
  isExpanded: boolean;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { addOrganization } = useOrganization();
  const { triggerAutoOpen } = useHowItWorks();

  const userEmail =
    (location.state as any)?.email ||
    localStorage.getItem("login_email") ||
    "";

  // Organization Website detected from Signup
  const signupWebsite = (() => {
    const fromState = (location.state as any)?.website;
    if (fromState && typeof fromState === "string" && fromState.trim()) return fromState.trim();
    const fromStorage = localStorage.getItem("signup_website");
    if (fromStorage && fromStorage.trim()) return fromStorage.trim();
    return "https://www.acmehealthclinic.com";
  })();

  const cleanWebsiteDisplay =
    signupWebsite.startsWith("http://") || signupWebsite.startsWith("https://")
      ? signupWebsite
      : `https://${signupWebsite}`;

  // Step state: 1 to 5
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // ── Crazy SaaS Loader State (Setting up your practice) ──
  const [isBuildingPractice, setIsBuildingPractice] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [activeBuildStage, setActiveBuildStage] = useState(0);

  // ── Step 1: About your organization (All details pre-filled from website) ──
  const [orgName, setOrgName] = useState(() => {
    const saved = localStorage.getItem("active_organization_name");
    if (saved && saved.trim()) return saved;

    const email =
      (location.state as any)?.email ||
      localStorage.getItem("login_email") ||
      "";
    if (email && email.includes("@")) {
      const domain = email.split("@")[1].split(".")[0];
      if (
        domain &&
        !["gmail", "yahoo", "hotmail", "outlook", "icloud"].includes(
          domain.toLowerCase()
        )
      ) {
        return domain.charAt(0).toUpperCase() + domain.slice(1) + " Health Clinic";
      }
    }
    return "Acme Health Clinic";
  });
  const [country, setCountry] = useState("United States");
  const [selectedIndustry, setSelectedIndustry] = useState("Healthcare & Clinic");
  const [selectedServiceCategory, setSelectedServiceCategory] = useState("General Physician");

  // Keep category specialty in sync when industry changes
  useEffect(() => {
    const specs = CATEGORY_SPECIALTIES[selectedIndustry] || [];
    if (specs.length > 0 && !specs.includes(selectedServiceCategory)) {
      setSelectedServiceCategory(specs[0]);
    }
  }, [selectedIndustry]);

  // ── Step 2: About your location (Card dropdowns pre-filled) ──
  const [locations, setLocations] = useState<LocationEntry[]>([
    {
      id: "loc-1",
      name: "Main Clinic",
      address: "100 Medical Center Blvd, Suite 250, San Francisco, CA 94102",
      operatingDays: ["MON", "TUE", "WED", "THU", "FRI"],
      opensAt: "09:00",
      closesAt: "17:00",
      isExpanded: true,
    },
  ]);

  // ── Step 3: Product and service (Card dropdowns pre-filled with sample clinical services) ──
  const [servicesList, setServicesList] = useState<ServiceEntry[]>([
    {
      id: "srv-1",
      name: "General Consultation",
      description: "Comprehensive medical review, clinical examination, and treatment plan (30 mins)",
      isExpanded: false,
    },
    {
      id: "srv-2",
      name: "Follow-up Visit",
      description: "Progress evaluation, lab results consultation, and prescription refills (15 mins)",
      isExpanded: false,
    },
    {
      id: "srv-3",
      name: "Telehealth Video Consult",
      description: "Secure virtual consultation for triage, non-emergency care, and remote diagnosis (20 mins)",
      isExpanded: false,
    },
    {
      id: "srv-4",
      name: "Annual Health Checkup",
      description: "Full preventive health assessment, diagnostic panels, and lifestyle consultation (45 mins)",
      isExpanded: false,
    },
  ]);

  // ── Step 4: About your team (All Dropdowns pre-filled) ──
  const [selectedTeamSize, setSelectedTeamSize] = useState("2–5");
  const [selectedCallVolume, setSelectedCallVolume] = useState("25–100 a day");
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>([
    "AI Front Desk & Phone Reception",
    "Smart Scheduling & Reminders",
  ]);
  const [selectedIntl, setSelectedIntl] = useState("No");
  const [selectedPhone, setSelectedPhone] = useState("Use a number from MantraAssist");

  // ── Step 5: Knowledge base (Pre-created organization & services policy documents) ──
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([
    {
      id: "kb-1",
      name: "Acme_Health_Organization_Overview_&_Hours.pdf",
      sizeLabel: "1.8 MB",
    },
    {
      id: "kb-2",
      name: "Clinical_Services_Pricing_&_Treatment_Guide.pdf",
      sizeLabel: "2.4 MB",
    },
    {
      id: "kb-3",
      name: "Patient_Intake_Cancellation_&_Billing_Policies.docx",
      sizeLabel: "840 KB",
    },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─────────────────────────────────────────────────────────────
  // STEP 2: LOCATION HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleAddLocation = () => {
    const newLoc: LocationEntry = {
      id: `loc-${Date.now()}`,
      name: `Location ${locations.length + 1}`,
      address: "",
      operatingDays: ["MON", "TUE", "WED", "THU", "FRI"],
      opensAt: "09:00",
      closesAt: "17:00",
      isExpanded: true,
    };
    // Collapse others and expand new one
    setLocations((prev) => [
      ...prev.map((l) => ({ ...l, isExpanded: false })),
      newLoc,
    ]);
  };

  const handleToggleLocationExpand = (id: string) => {
    setLocations((prev) =>
      prev.map((l) => (l.id === id ? { ...l, isExpanded: !l.isExpanded } : l))
    );
  };

  const handleUpdateLocation = (id: string, updates: Partial<LocationEntry>) => {
    setLocations((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
  };

  const handleRemoveLocation = (id: string) => {
    if (locations.length <= 1) {
      toast.info("At least one location is required.");
      return;
    }
    setLocations((prev) => prev.filter((l) => l.id !== id));
  };

  const handleToggleDay = (locId: string, day: string) => {
    setLocations((prev) =>
      prev.map((l) => {
        if (l.id !== locId) return l;
        const exists = l.operatingDays.includes(day);
        const nextDays = exists
          ? l.operatingDays.filter((d) => d !== day)
          : [...l.operatingDays, day];
        return { ...l, operatingDays: nextDays };
      })
    );
  };

  // ─────────────────────────────────────────────────────────────
  // STEP 3: SERVICES HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleAddServiceCard = () => {
    const newSrv: ServiceEntry = {
      id: `srv-${Date.now()}`,
      name: `Service ${servicesList.length + 1}`,
      description: "",
      isExpanded: true,
    };
    setServicesList((prev) => [
      ...prev.map((s) => ({ ...s, isExpanded: false })),
      newSrv,
    ]);
  };

  const handleToggleServiceExpand = (id: string) => {
    setServicesList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isExpanded: !s.isExpanded } : s))
    );
  };

  const handleUpdateService = (id: string, updates: Partial<ServiceEntry>) => {
    setServicesList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const handleRemoveServiceCard = (id: string) => {
    if (servicesList.length <= 1) {
      toast.info("At least one service is required.");
      return;
    }
    setServicesList((prev) => prev.filter((s) => s.id !== id));
  };

  // ─────────────────────────────────────────────────────────────
  // STEP 5: DOCUMENT UPLOAD HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newDocs: UploadedDoc[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newDocs.push({
        id: `doc-${Date.now()}-${i}`,
        name: file.name,
        sizeLabel: formatBytes(file.size),
      });
    }

    setUploadedDocs((prev) => [...prev, ...newDocs]);
    toast.success(`Uploaded ${newDocs.length} document(s)`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveDoc = (id: string) => {
    setUploadedDocs((prev) => prev.filter((d) => d.id !== id));
    toast.info("Document removed");
  };

  // ─────────────────────────────────────────────────────────────
  // COMPLETION & CRAZY SAAS LOADER TRIGGER
  // ─────────────────────────────────────────────────────────────
  const handleLaunchPracticeBuilding = () => {
    setIsBuildingPractice(true);
    setBuildProgress(5);
    setActiveBuildStage(0);

    const startTime = Date.now();
    const duration = 6500; // Increased animation duration: 6.5s

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setBuildProgress(pct);

      if (pct >= 84) {
        setActiveBuildStage(4);
      } else if (pct >= 64) {
        setActiveBuildStage(3);
      } else if (pct >= 42) {
        setActiveBuildStage(2);
      } else if (pct >= 20) {
        setActiveBuildStage(1);
      }

      if (pct >= 100) {
        clearInterval(interval);
        finalizePracticeSetup();
      }
    }, 40);
  };

  const finalizePracticeSetup = () => {
    const cleanOrgName = orgName.trim() || "My Organization";
    const primaryLoc = locations[0] || {
      name: "Main Location",
      address: "",
      operatingDays: ["MON", "TUE", "WED", "THU", "FRI"],
      opensAt: "09:00",
      closesAt: "17:00",
    };

    const formattedLocations = locations.map((loc) =>
      loc.address.trim()
        ? `${loc.name}: ${loc.address.trim()} (${loc.operatingDays.join(", ")}, ${loc.opensAt}–${loc.closesAt})`
        : `${loc.name} (${loc.operatingDays.join(", ")}, ${loc.opensAt}–${loc.closesAt})`
    );

    const formattedServices = servicesList
      .map((s) => (s.description ? `${s.name} (${s.description})` : s.name))
      .filter((s) => s.trim().length > 0);

    const savedWebsite = localStorage.getItem("signup_website") || "";

    const newOrgData = {
      name: cleanOrgName,
      industry: selectedIndustry,
      industryCategory: selectedServiceCategory,
      locations: formattedLocations,
      primaryLocation: primaryLoc.name,
      operatingHours: `${primaryLoc.operatingDays.join(", ")}: ${primaryLoc.opensAt}–${primaryLoc.closesAt}`,
      country: country.trim() || "United States",
      currency: "USD",
      email: userEmail || "contact@mantraassist.com",
      phone: "+1 (555) 123-4567",
      status: "Active" as const,
      website: savedWebsite || undefined,
      services: formattedServices,
      callVolume: selectedCallVolume,
      internationalCalls: selectedIntl === "Yes",
      teamSize: selectedTeamSize,
      primaryRequirements: selectedRequirements,
      telephonyChoice: selectedPhone === "Use my own number" ? "bring_own" : "default",
      uploadedDocuments: uploadedDocs,
    };

    try {
      addOrganization(newOrgData);
    } catch (err) {
      console.warn("Could not add to context directly", err);
    }

    try {
      const allProcs = getStoredProcesses();
      const updatedProcs = allProcs.map((p) => {
        if (
          (p as any).categoryName === "Healthcare" ||
          p.industryCategory === "Healthcare" ||
          !p.industryCategory
        ) {
          return {
            ...p,
            industryCategory: selectedServiceCategory,
            connectedToAiReceptionist: selectedRequirements.includes(
              "AI Front Desk & Phone Reception"
            ),
            receptionEnabled: selectedRequirements.includes(
              "AI Front Desk & Phone Reception"
            ),
          };
        }
        return p;
      });
      saveStoredProcesses(updatedProcs);
      window.dispatchEvent(new Event(PROCESS_STORE_EVENT));
    } catch (e) {
      console.warn("Process mapping notice:", e);
    }

    localStorage.setItem("user_organization", JSON.stringify(newOrgData));
    localStorage.setItem("active_organization_name", cleanOrgName);
    localStorage.setItem("onboarding_complete", "true");
    localStorage.removeItem("verify_origin");
    login();

    setTimeout(() => {
      toast.success("Practice setup complete! Welcome to MantraAssist.");
      navigate("/", { replace: true });
      setTimeout(() => {
        triggerAutoOpen();
      }, 500);
    }, 600);
  };

  return (
    <CenteredOnboardingShell
      maxWidth={isBuildingPractice ? "max-w-none" : "max-w-[680px]"}
      showLogo={!isBuildingPractice}
      showFooter={!isBuildingPractice}
      noCard={isBuildingPractice}
      headerBadge={
        !isBuildingPractice &&
        (step === 1 || step === 2 || step === 3 || step === 5) ? (
          <WebsiteDetectedCapsule websiteDisplay={cleanWebsiteDisplay} />
        ) : undefined
      }
    >
      <div className={isBuildingPractice ? "w-full flex flex-col items-center justify-center min-h-[50vh]" : "w-full"}>
        {/* ─────────────────────────────────────────────────────────────
            CLEAN LIGHT-MODE SAAS CREATION LOADER (SCALED UP & TYPEWRITER)
            ───────────────────────────────────────────────────────────── */}
        {isBuildingPractice ? (
          <div className="select-none animate-fadeIn flex flex-col items-center justify-center my-auto">
            {/* The Loader: Scaled-up, crisp, minimal, light-mode executive SaaS styling */}
            <div className="relative w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] md:w-[460px] md:h-[460px] flex items-center justify-center select-none">
              {/* Dynamic SVG Connection Beams */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {/* Center to Top (Workspace) */}
                <line
                  x1="50%"
                  y1="50%"
                  x2="50%"
                  y2="15%"
                  stroke={activeBuildStage >= 1 ? "#64748B" : "#E2E8F0"}
                  strokeWidth={activeBuildStage >= 1 ? "1.5" : "1"}
                  strokeDasharray="3 3"
                  className="transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                />
                {/* Center to Left (Knowledge) */}
                <line
                  x1="50%"
                  y1="50%"
                  x2="14%"
                  y2="50%"
                  stroke={activeBuildStage >= 2 ? "#64748B" : "#E2E8F0"}
                  strokeWidth={activeBuildStage >= 2 ? "1.5" : "1"}
                  strokeDasharray="3 3"
                  className="transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                />
                {/* Center to Right (Schedule) */}
                <line
                  x1="50%"
                  y1="50%"
                  x2="86%"
                  y2="50%"
                  stroke={activeBuildStage >= 3 ? "#64748B" : "#E2E8F0"}
                  strokeWidth={activeBuildStage >= 3 ? "1.5" : "1"}
                  strokeDasharray="3 3"
                  className="transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                />
                {/* Center to Bottom (AI Reception) */}
                <line
                  x1="50%"
                  y1="50%"
                  x2="50%"
                  y2="85%"
                  stroke={activeBuildStage >= 4 ? "#64748B" : "#E2E8F0"}
                  strokeWidth={activeBuildStage >= 4 ? "1.5" : "1"}
                  strokeDasharray="3 3"
                  className="transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                />
              </svg>

              {/* Concentric Rotating Precision Rings (Light mode, scaled up) */}
              <div className="relative w-56 h-56 sm:w-68 sm:h-68 md:w-76 md:h-76 flex items-center justify-center">
                {/* Outer rotating dashed ring */}
                <div className="absolute inset-0 border border-dashed border-slate-300 rounded-full animate-[spin_24s_linear_infinite]" />
                {/* Middle counter-rotating dashed ring */}
                <div className="absolute inset-6 border border-dashed border-slate-200 rounded-full animate-[spin_32s_linear_infinite_reverse]" />
                {/* Inner subtle guideline circle */}
                <div className="absolute inset-13 border border-slate-200/60 rounded-full" />

                {/* Center core icon: clean, crisp, executive slate */}
                <div
                  className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-[22px] bg-[#182230] text-white flex items-center justify-center shadow-[0_8px_24px_rgba(24,34,48,0.16)] animate-bounce"
                  style={{ animationDuration: "2.6s" }}
                >
                  <Building2 className="w-8 h-8 sm:w-9 sm:h-9 text-white stroke-[1.8]" />
                </div>

                {/* 4 Orbiting Satellite Nodes: Light mode, crisp SaaS pill styling */}
                {/* Top: Workspace */}
                <div
                  className={`absolute -top-5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs sm:text-[13px] font-semibold border transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-2 shadow-xs ${
                    activeBuildStage >= 1
                      ? "bg-white border-slate-300 text-slate-900 shadow-sm"
                      : "bg-white/70 border-slate-200/80 text-slate-400"
                  }`}
                >
                  <Layers className={`w-4 h-4 transition-colors duration-500 ${activeBuildStage >= 1 ? "text-blue-600" : "text-slate-400"}`} />
                  <span>Workspace</span>
                </div>

                {/* Left: Knowledge */}
                <div
                  className={`absolute -left-16 sm:-left-20 md:-left-22 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full text-xs sm:text-[13px] font-semibold border transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-2 shadow-xs ${
                    activeBuildStage >= 2
                      ? "bg-white border-slate-300 text-slate-900 shadow-sm"
                      : "bg-white/70 border-slate-200/80 text-slate-400"
                  }`}
                >
                  <FileCheck2 className={`w-4 h-4 transition-colors duration-500 ${activeBuildStage >= 2 ? "text-emerald-600" : "text-slate-400"}`} />
                  <span>Knowledge</span>
                </div>

                {/* Right: Schedule */}
                <div
                  className={`absolute -right-14 sm:-right-18 md:-right-20 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full text-xs sm:text-[13px] font-semibold border transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-2 shadow-xs ${
                    activeBuildStage >= 3
                      ? "bg-white border-slate-300 text-slate-900 shadow-sm"
                      : "bg-white/70 border-slate-200/80 text-slate-400"
                  }`}
                >
                  <Calendar className={`w-4 h-4 transition-colors duration-500 ${activeBuildStage >= 3 ? "text-indigo-600" : "text-slate-400"}`} />
                  <span>Schedule</span>
                </div>

                {/* Bottom: AI Reception */}
                <div
                  className={`absolute -bottom-5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs sm:text-[13px] font-semibold border transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-2 shadow-xs ${
                    activeBuildStage >= 4
                      ? "bg-white border-slate-300 text-slate-900 shadow-sm"
                      : "bg-white/70 border-slate-200/80 text-slate-400"
                  }`}
                >
                  <Headphones className={`w-4 h-4 transition-colors duration-500 ${activeBuildStage >= 4 ? "text-sky-600" : "text-slate-400"}`} />
                  <span>AI Reception</span>
                </div>
              </div>
            </div>

            {/* Status line with "Setting up " fixed + typewriter animation on the component */}
            <TypewriterStatus onWordChange={(idx) => setActiveBuildStage(idx)} />
          </div>
        ) : (
          <>
            {/* ─────────────────────────────────────────────────────────────
                STEP 1: ABOUT YOUR ORGANIZATION (Pre-filled)
                ───────────────────────────────────────────────────────────── */}
            {step === 1 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!orgName.trim()) {
                    toast.error("Please enter your organization name");
                    return;
                  }
                  setStep(2);
                }}
                className="space-y-4 sm:space-y-4.5"
              >
                <StepHeader
                  title="About your organization"
                  subtitle="We'll tailor your AI workflows to your business."
                  currentStep={1}
                />

                {/* 1. Organization name (Pre-filled) */}
                <div>
                  <label
                    className="block text-[13px] font-semibold mb-1.5 text-slate-800"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    Organization name *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g. Acme Health Clinic"
                      className="w-full h-11 pl-10 pr-3.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-all text-slate-900 placeholder:text-slate-400 hover:border-slate-300 shadow-2xs"
                      style={{ fontFamily: "Inter, sans-serif" }}
                      autoFocus
                    />
                  </div>
                </div>

                {/* 2. Country (Pre-filled) */}
                <CustomDropdown
                  label="Country"
                  options={COUNTRIES}
                  value={country}
                  onChange={(val) => setCountry(val)}
                  required
                />

                {/* 3. Industry (Pre-filled) */}
                <CustomDropdown
                  label="Industry"
                  options={INDUSTRY_OPTIONS}
                  value={selectedIndustry}
                  onChange={(val) => setSelectedIndustry(val)}
                  required
                />

                {/* 4. Primary Service & Specialty (Pre-filled) */}
                <CustomDropdown
                  label="Primary service & category"
                  options={CATEGORY_SPECIALTIES[selectedIndustry] || []}
                  value={selectedServiceCategory}
                  onChange={(val) => setSelectedServiceCategory(val)}
                  required
                />

                {/* Bottom Actions */}
                <div className="pt-4 flex items-center justify-end">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-8 h-11 bg-[#182230] hover:bg-black active:scale-[0.98] text-white text-[13px] sm:text-sm font-semibold rounded-full shadow-sm shadow-slate-900/10 hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </button>
                </div>
              </form>
            )}

            {/* ─────────────────────────────────────────────────────────────
                STEP 2: ABOUT YOUR LOCATION (Card Dropdowns + Image 2 Operating Hours)
                ───────────────────────────────────────────────────────────── */}
            {step === 2 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (locations.length === 0 || !locations[0].name.trim()) {
                    toast.error("Please provide at least one location name");
                    return;
                  }
                  setStep(3);
                }}
                className="space-y-4 sm:space-y-4.5"
              >
                <StepHeader
                  title="About your location"
                  subtitle="Manage clinic locations, addresses, and operating hours."
                  currentStep={2}
                />

                {/* Location Card Dropdowns List */}
                <div className="space-y-3">
                  {locations.map((loc, idx) => (
                    <div
                      key={loc.id}
                      className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs transition-all"
                    >
                      {/* Card Header (Click to toggle dropdown) */}
                      <div
                        onClick={() => handleToggleLocationExpand(loc.id)}
                        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 bg-white hover:bg-slate-50/60 transition-colors cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-700">
                            <Building className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 truncate">
                              {loc.name || `Location ${idx + 1}`}
                            </div>
                            <div className="text-xs text-slate-400 truncate">
                              {loc.address ? `${loc.address} · ` : ""}
                              {loc.operatingDays.length > 0
                                ? `${loc.operatingDays.length} days (${loc.opensAt}–${loc.closesAt})`
                                : "Hours not set"}
                            </div>
                          </div>
                        </div>

                        <div
                          className="flex items-center gap-1.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Small Gray Delete Button */}
                          {locations.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLocation(loc.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete location"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleLocationExpand(loc.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <ChevronDown
                              className={`w-4 h-4 transform transition-transform duration-200 ${
                                loc.isExpanded ? "rotate-180 text-slate-800" : ""
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Card Body (When Dropdown is Expanded) */}
                      {loc.isExpanded && (
                        <div className="p-4 sm:p-5 border-t border-slate-100 space-y-4 bg-slate-50/30 animate-fadeIn">
                          {/* Location Name (Pre-filled) */}
                          <div>
                            <label
                              className="block text-[13px] font-semibold text-slate-800 mb-1.5"
                              style={{ fontFamily: "Inter, sans-serif" }}
                            >
                              Location name *
                            </label>
                            <input
                              type="text"
                              value={loc.name}
                              onChange={(e) =>
                                handleUpdateLocation(loc.id, { name: e.target.value })
                              }
                              placeholder="e.g. Main Clinic, Downtown Branch"
                              className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800"
                            />
                          </div>

                          {/* Address / City & State (Empty for user to enter) */}
                          <div>
                            <label
                              className="block text-[13px] font-semibold text-slate-800 mb-1.5"
                              style={{ fontFamily: "Inter, sans-serif" }}
                            >
                              Address / City & State
                            </label>
                            <div className="relative">
                              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <input
                                type="text"
                                value={loc.address}
                                onChange={(e) =>
                                  handleUpdateLocation(loc.id, { address: e.target.value })
                                }
                                placeholder="e.g. 100 Medical Center Blvd, Suite 250, San Francisco, CA"
                                className="w-full h-10 pl-9 pr-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800"
                              />
                            </div>
                          </div>

                          {/* ── IMAGE 2 EXACT OPERATING HOURS COMPONENT (Pre-filled) ── */}
                          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-4.5 shadow-2xs space-y-3.5">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              OPERATING HOURS
                            </div>

                            {/* Operating Days: 7 Circular Buttons (Pre-filled MON-FRI) */}
                            <div>
                              <div className="text-xs font-semibold text-slate-700 mb-2">
                                Operating Days
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {ALL_DAYS.map((day) => {
                                  const isSelected = loc.operatingDays.includes(day);
                                  return (
                                    <button
                                      key={day}
                                      type="button"
                                      onClick={() => handleToggleDay(loc.id, day)}
                                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                                        isSelected
                                          ? "bg-[#182230] text-white shadow-xs"
                                          : "bg-white border border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600"
                                      }`}
                                    >
                                      {day}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Opens At & Closes At (Pre-filled 09:00 - 17:00) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Opens At
                                </label>
                                <div className="relative">
                                  <input
                                    type="time"
                                    value={loc.opensAt}
                                    onChange={(e) =>
                                      handleUpdateLocation(loc.id, { opensAt: e.target.value })
                                    }
                                    className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 pr-10"
                                  />
                                  <Clock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Closes At
                                </label>
                                <div className="relative">
                                  <input
                                    type="time"
                                    value={loc.closesAt}
                                    onChange={(e) =>
                                      handleUpdateLocation(loc.id, { closesAt: e.target.value })
                                    }
                                    className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 pr-10"
                                  />
                                  <Clock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* + Add Location Button */}
                  <button
                    type="button"
                    onClick={handleAddLocation}
                    className="w-full py-2.5 px-4 border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-100 rounded-xl text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-500" />
                    <span>+ Add location</span>
                  </button>
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-5 h-11 border border-slate-200 hover:bg-slate-50 text-slate-600 text-[13px] font-semibold rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-500" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    className="px-8 h-11 bg-[#182230] hover:bg-black active:scale-[0.98] text-white text-[13px] sm:text-sm font-semibold rounded-full shadow-sm shadow-slate-900/10 hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </button>
                </div>
              </form>
            )}

            {/* ─────────────────────────────────────────────────────────────
                STEP 3: PRODUCT AND SERVICE (Card Dropdowns Pre-filled)
                ───────────────────────────────────────────────────────────── */}
            {step === 3 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (servicesList.length === 0 || !servicesList[0].name.trim()) {
                    toast.error("Please add at least one service name");
                    return;
                  }
                  setStep(4);
                }}
                className="space-y-4 sm:space-y-4.5"
              >
                <StepHeader
                  title="Product and service"
                  subtitle="Add the services and treatments your team provides."
                  currentStep={3}
                />

                {/* Services Card Dropdowns List (Pre-filled) */}
                <div className="space-y-3">
                  {servicesList.map((srv, idx) => (
                    <div
                      key={srv.id}
                      className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs transition-all"
                    >
                      {/* Card Header (Click to toggle dropdown) */}
                      <div
                        onClick={() => handleToggleServiceExpand(srv.id)}
                        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 bg-white hover:bg-slate-50/60 transition-colors cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-700">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 truncate">
                              {srv.name || `Service ${idx + 1}`}
                            </div>
                            {srv.description && (
                              <div className="text-xs text-slate-400 truncate">
                                {srv.description}
                              </div>
                            )}
                          </div>
                        </div>

                        <div
                          className="flex items-center gap-1.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Small Gray Delete Button */}
                          {servicesList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveServiceCard(srv.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete service"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleServiceExpand(srv.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <ChevronDown
                              className={`w-4 h-4 transform transition-transform duration-200 ${
                                srv.isExpanded ? "rotate-180 text-slate-800" : ""
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Card Body (When Dropdown is Expanded) */}
                      {srv.isExpanded && (
                        <div className="p-4 sm:p-5 border-t border-slate-100 space-y-3.5 bg-slate-50/30 animate-fadeIn">
                          <div>
                            <label
                              className="block text-[13px] font-semibold text-slate-800 mb-1.5"
                              style={{ fontFamily: "Inter, sans-serif" }}
                            >
                              Service name *
                            </label>
                            <input
                              type="text"
                              value={srv.name}
                              onChange={(e) =>
                                handleUpdateService(srv.id, { name: e.target.value })
                              }
                              placeholder="e.g. General Consultation, Follow-up Visit"
                              className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800"
                            />
                          </div>

                          <div>
                            <label
                              className="block text-[13px] font-semibold text-slate-800 mb-1.5"
                              style={{ fontFamily: "Inter, sans-serif" }}
                            >
                              Description / Duration (optional)
                            </label>
                            <input
                              type="text"
                              value={srv.description}
                              onChange={(e) =>
                                handleUpdateService(srv.id, { description: e.target.value })
                              }
                              placeholder="e.g. 30 mins, initial diagnostic assessment"
                              className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* + Add Service Button */}
                  <button
                    type="button"
                    onClick={handleAddServiceCard}
                    className="w-full py-2.5 px-4 border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-100 rounded-xl text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-slate-500" />
                    <span>+ Add service</span>
                  </button>
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-5 h-11 border border-slate-200 hover:bg-slate-50 text-slate-600 text-[13px] font-semibold rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-500" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    className="px-8 h-11 bg-[#182230] hover:bg-black active:scale-[0.98] text-white text-[13px] sm:text-sm font-semibold rounded-full shadow-sm shadow-slate-900/10 hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </button>
                </div>
              </form>
            )}

            {/* ─────────────────────────────────────────────────────────────
                STEP 4: YOUR WORKSPACE (Row Structure matching Org Step)
                ───────────────────────────────────────────────────────────── */}
            {step === 4 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (selectedRequirements.length === 0) {
                    toast.error(
                      "Please select what MantraAssist should handle for you"
                    );
                    return;
                  }
                  setStep(5);
                }}
                className="space-y-4 sm:space-y-4.5"
              >
                <StepHeader
                  title="Your workspace"
                  subtitle="Tell us how your practice runs so we can set up your workspace."
                  currentStep={4}
                />

                {/* Row 1: Team size & Call volume side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <CustomDropdown
                    label="How big is your team?"
                    options={["Just me (1)", "2–5", "6–10", "11–25", "25+"]}
                    value={selectedTeamSize}
                    onChange={(val) => setSelectedTeamSize(val)}
                    required
                  />

                  <CustomDropdown
                    label="How many calls do you get in a day?"
                    options={[
                      "Under 25 a day",
                      "25–100 a day",
                      "100–300 a day",
                      "300+ a day",
                      "Not sure",
                    ]}
                    value={selectedCallVolume}
                    onChange={(val) => setSelectedCallVolume(val)}
                    required
                  />
                </div>

                {/* Row 2: What should MantraAssist handle for you? */}
                <CustomDropdown
                  label="What should MantraAssist handle for you?"
                  placeholder="Select options..."
                  isMulti
                  options={[
                    "AI Front Desk & Phone Reception",
                    "Smart Scheduling & Reminders",
                    "Clinical Scribe & Chart Notes",
                    "Billing, Invoicing & RCM",
                  ]}
                  value={selectedRequirements}
                  onChange={(val) => setSelectedRequirements(val)}
                  required
                />

                {/* Row 3: International calls & Phone number side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <CustomDropdown
                    label="Do you take international calls?"
                    options={["Yes", "No", "Not sure"]}
                    value={selectedIntl}
                    onChange={(val) => setSelectedIntl(val)}
                    required
                  />

                  <CustomDropdown
                    label="Which number should we use?"
                    options={[
                      "Use a number from MantraAssist",
                      "Use my own number",
                    ]}
                    value={selectedPhone}
                    onChange={(val) => setSelectedPhone(val)}
                    required
                  />
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="px-5 h-11 border border-slate-200 hover:bg-slate-50 text-slate-600 text-[13px] font-semibold rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-500" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    className="px-8 h-11 bg-[#182230] hover:bg-black active:scale-[0.98] text-white text-[13px] sm:text-sm font-semibold rounded-full shadow-sm shadow-slate-900/10 hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </button>
                </div>
              </form>
            )}

            {/* ─────────────────────────────────────────────────────────────
                STEP 5: KNOWLEDGE BASE (Documents Only, Clean & Focused)
                ───────────────────────────────────────────────────────────── */}
            {step === 5 && (
              <div className="space-y-4 sm:space-y-4.5">
                <StepHeader
                  title="Knowledge base"
                  subtitle="Add your practice documents so your AI knows how you work."
                  currentStep={5}
                />

                {/* Document Upload Area */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt,.doc,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-7 sm:p-8 border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center text-center group"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform shadow-2xs">
                      <FileUp className="w-5 h-5" />
                    </div>
                    <div className="text-[13px] sm:text-sm font-semibold text-slate-800">
                      Click to upload or drag and drop documents
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      PDF, DOCX, or TXT up to 25 MB
                    </div>
                  </div>

                  {/* Pre-created & Uploaded Documents List */}
                  {uploadedDocs.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 px-0.5">
                        <span>Practice documents ({uploadedDocs.length})</span>
                        <span className="text-[11px] font-normal text-slate-400">
                          From your website
                        </span>
                      </div>
                      {uploadedDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-3 bg-white border border-slate-200/90 rounded-xl flex items-center justify-between gap-3 text-xs shadow-2xs hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800 truncate">
                                {doc.name}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {doc.sizeLabel}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveDoc(doc.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Actions - Clean "Complete and launch" Button */}
                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="px-5 h-11 border border-slate-200 hover:bg-slate-50 text-slate-600 text-[13px] font-semibold rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-500" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLaunchPracticeBuilding}
                    className="px-8 h-11 bg-[#182230] hover:bg-black active:scale-[0.98] text-white text-sm font-semibold rounded-full shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    <span>Complete and launch</span>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </CenteredOnboardingShell>
  );
}
