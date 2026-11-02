import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  Upload,
  Trash2,
  Sparkles,
  Edit2,
  X,
  Plus,
  FileText,
  Search,
  Zap,
  Calendar,
  TrendingUp,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import CenteredOnboardingShell from "./CenteredOnboardingShell";
import { INITIAL_CATEGORIES } from "../../../data/industryReferenceData";
import {
  UploadedDoc,
  CollectedOnboardingData,
  detectPracticeCategory,
  scrapeLocationsFromContext,
  extractNeedsRequirements,
  formatBytes,
} from "./onboardingHelpers";

export interface QuickFormOnboardingProps {
  orgName: string;
  country?: string;
  mode: "website" | "description";
  websiteUrl: string;
  description: string;
  userEmail?: string;
  onComplete: (data: CollectedOnboardingData) => void;
  onSwitchToVoice: () => void;
  onBack: () => void;
}

type SectionKey = "industry" | "requirements" | "team_capacity" | "locations" | "knowledge_base";

// ── Problem-Led Requirements Options (Conversational, silent mapping) ──
interface RequirementProblem {
  id: string;
  problem: string;
  req: "AI Reception" | "Scribe" | "EHR" | "RCM";
}

const REQUIREMENT_PROBLEMS: RequirementProblem[] = [
  {
    id: "prob-1",
    problem: "Too many calls or messages to keep up with",
    req: "AI Reception",
  },
  {
    id: "prob-2",
    problem: "Spending too long on notes and documentation",
    req: "Scribe",
  },
  {
    id: "prob-3",
    problem: "Patient records and intake are scattered",
    req: "EHR",
  },
  {
    id: "prob-4",
    problem: "Claims and billing take too much chasing",
    req: "RCM",
  },
  {
    id: "prob-5",
    problem: "Booking and rescheduling takes up the front desk",
    req: "AI Reception",
  },
  {
    id: "prob-6",
    problem: "Following up with clients across channels",
    req: "AI Reception",
  },
];

const INITIAL_TEAM_SIZES = ["Just me", "2–5", "6–10", "11–25", "25+"];
const INITIAL_CALL_VOLUMES = ["Under 25 a day", "25–100 a day", "100–300 a day", "300+ a day", "Not sure"];
const INITIAL_INTL_OPTIONS = ["Yes", "No", "Not sure"];
const INITIAL_PHONE_OPTIONS = [
  "Use my own number",
  "Use a number from MantraAssist",
];
// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE CUSTOM DROPDOWN COMPONENT (Single & Multi-Select with "Add your own")
// ─────────────────────────────────────────────────────────────────────────────
interface CustomDropdownProps {
  id?: string;
  label?: string;
  helperText?: string;
  placeholder?: string;
  options: string[];
  value: string | string[];
  onChange: (val: any) => void;
  isMulti?: boolean;
  required?: boolean;
  badge?: React.ReactNode;
  error?: string;
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
  badge,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");
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

  // Update position on scroll/resize when open
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => {
        updatePosition();
      };
      window.addEventListener("scroll", handleScrollOrResize, true);
      window.addEventListener("resize", handleScrollOrResize);
      return () => {
        window.removeEventListener("scroll", handleScrollOrResize, true);
        window.removeEventListener("resize", handleScrollOrResize);
      };
    }
  }, [isOpen]);

  // Close on outside click or Escape
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
        setIsAddingCustom(false);
        setSearchQuery("");
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setIsAddingCustom(false);
        setSearchQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
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

  const handleAddCustomSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = customInput.trim();
    if (!clean) return;

    if (isMulti && Array.isArray(value)) {
      if (!value.includes(clean)) {
        onChange([...value, clean]);
      }
    } else {
      onChange(clean);
      setIsOpen(false);
    }

    setCustomInput("");
    setIsAddingCustom(false);
    setSearchQuery("");
  };

  const toggleDropdown = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-[13px] font-semibold text-slate-800" style={{ fontFamily: "Inter, sans-serif" }}>
            {label}
            {required && (
              <>
                <span aria-hidden="true" className="text-blue-600 text-[14px] ml-[2px] font-bold select-none">*</span>
                <span className="sr-only"> (required)</span>
              </>
            )}
          </label>
          {badge}
        </div>
      )}

      {helperText && <p className="text-[12px] text-slate-500 mb-2 leading-relaxed">{helperText}</p>}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-required={required ? "true" : undefined}
        className={`w-full min-h-[44px] sm:min-h-[40px] px-3.5 py-1.5 sm:py-2 bg-white border rounded-[12px] text-left flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs ${
          error
            ? "border-rose-400 focus:ring-2 focus:ring-rose-500/20"
            : isOpen
            ? "border-blue-600 ring-2 ring-blue-500/15"
            : "border-slate-200 hover:border-slate-300"
        }`}
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        <div className="flex-1 min-w-0">
          {isMulti && Array.isArray(value) ? (
            value.length === 0 ? (
              <span className="text-slate-400 text-[13px]">{placeholder}</span>
            ) : (
              <div className="flex flex-wrap gap-1.5 py-0.5">
                {value.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 text-xs font-medium border border-blue-200/60 max-w-full truncate"
                  >
                    <span className="truncate">{item}</span>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveChip(e, item)}
                      className="p-0.5 hover:text-blue-600 rounded cursor-pointer"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )
          ) : typeof value === "string" && value ? (
            <span className="text-sm font-medium text-slate-900 truncate block">{value}</span>
          ) : (
            <span className="text-slate-400 text-sm">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transform transition-transform duration-200 ${
            isOpen ? "rotate-180 text-slate-700" : ""
          }`}
        />
      </button>

      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}

      {/* Dropdown Menu Panel (Portaled to document.body: Relative to Page, Not Trapped in Parent Dropdown/Card) */}
      {isOpen &&
        createPortal(
          <>
            {/* Mobile Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/40 z-[9998] sm:hidden animate-fadeIn"
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
              className="bg-white sm:rounded-[14px] rounded-t-2xl border border-slate-200 shadow-2xl overflow-hidden py-1 max-h-[75vh] sm:max-h-64 flex flex-col animate-fadeIn"
            >
              {/* Search Box if > 8 options */}
              {options.length > 8 && (
                <div className="p-2 border-b border-slate-100 shrink-0">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search options..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {/* Options List */}
              <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
                {filteredOptions.length === 0 && !isAddingCustom && (
                  <div className="px-3.5 py-3 text-xs text-slate-400 text-center">No matching options</div>
                )}

                {filteredOptions.map((opt) => {
                  const selected = isSelected(opt);
                  return (
                    <div
                      key={opt}
                      onClick={() => handleSelectOption(opt)}
                      className={`px-3.5 py-2.5 flex items-center justify-between text-xs sm:text-sm cursor-pointer transition-colors ${
                        selected
                          ? "bg-blue-50 text-blue-900 font-medium"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate pr-2 leading-relaxed">{opt}</span>
                      {selected && <Check className="w-4 h-4 text-blue-600 shrink-0 stroke-[2.5]" />}
                    </div>
                  );
                })}
              </div>

              {/* "Add your own" Row at Bottom */}
              <div className="border-t border-slate-100 bg-slate-50/60 p-2 shrink-0">
                {isAddingCustom ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomSubmit();
                        }
                        if (e.key === "Escape") {
                          setIsAddingCustom(false);
                        }
                      }}
                      placeholder="Type your own..."
                      className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCustomSubmit()}
                      className="px-2.5 py-1.5 bg-[#182230] hover:bg-black text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingCustom(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingCustom(true)}
                    className="w-full py-1.5 px-2 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50/50 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add your own</span>
                  </button>
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN QUICK FORM ONBOARDING SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export const QuickFormOnboardingScreen: React.FC<QuickFormOnboardingProps> = ({
  orgName,
  country = "United States",
  mode,
  websiteUrl,
  description,
  onComplete,
  onSwitchToVoice,
  onBack,
}) => {
  const [isPreloading, setIsPreloading] = useState<boolean>(true);

  // Accordion open section (allows zero open: null)
  const [openSection, setOpenSection] = useState<SectionKey | null>("industry");

  // Section 1: Industry
  const [industryOptions, setIndustryOptions] = useState<string[]>(
    INITIAL_CATEGORIES.map((c) => c.name)
  );
  const [selectedIndustry, setSelectedIndustry] = useState<string>("Healthcare");
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<string>("General Physician");
  const [detectedBadge, setDetectedBadge] = useState<string | null>(null);

  // Section 2: Requirements (Problem-led multi-select)
  const [selectedProblems, setSelectedProblems] = useState<string[]>([
    "Too many calls or messages to keep up with",
    "Spending too long on notes and documentation",
  ]);

  // Section 3: Team and capacity (Dropdowns)
  const [teamSizeOptions, setTeamSizeOptions] = useState<string[]>(INITIAL_TEAM_SIZES);
  const [selectedTeamSize, setSelectedTeamSize] = useState<string>("2–5");

  const [callVolumeOptions, setCallVolumeOptions] = useState<string[]>(INITIAL_CALL_VOLUMES);
  const [selectedCallVolume, setSelectedCallVolume] = useState<string>("25–100 a day");

  const [intlOptions, setIntlOptions] = useState<string[]>(INITIAL_INTL_OPTIONS);
  const [selectedIntl, setSelectedIntl] = useState<string>("Not sure");

  const [phoneOptions, setPhoneOptions] = useState<string[]>(INITIAL_PHONE_OPTIONS);
  const [selectedPhone, setSelectedPhone] = useState<string>("Use my own number");

  // Section 4: Locations
  const [locations, setLocations] = useState<string[]>(["Main Clinic"]);
  const [primaryLocation, setPrimaryLocation] = useState<string>("Main Clinic");
  const [newLocationInput, setNewLocationInput] = useState<string>("");
  const [editingLocationIndex, setEditingLocationIndex] = useState<number | null>(null);
  const [editingLocationText, setEditingLocationText] = useState<string>("");

  // Section 5: Knowledge base
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Error validation
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // ── Pre-fill on Mount ──
  useEffect(() => {
    const rawContext = mode === "website" ? websiteUrl : description;
    const detected = detectPracticeCategory(orgName, rawContext);
    const scrapedLocs = scrapeLocationsFromContext(websiteUrl, description, country);
    const inferredReqs = extractNeedsRequirements(rawContext);

    setSelectedIndustry(detected.industry || "Healthcare");
    setSelectedService(detected.category || "General Physician");
    setDetectedBadge(mode === "website" ? "your website" : "your description");

    // Map inferred requirements to matching problems
    if (inferredReqs.length > 0) {
      const matchedProblems = REQUIREMENT_PROBLEMS.filter((p) =>
        inferredReqs.includes(p.req)
      ).map((p) => p.problem);
      if (matchedProblems.length > 0) {
        setSelectedProblems(matchedProblems);
      }
    }

    if (scrapedLocs.length > 0) {
      setLocations(scrapedLocs);
      setPrimaryLocation(scrapedLocs[0]);
    }

    const timer = setTimeout(() => {
      setIsPreloading(false);
    }, 280);

    return () => clearTimeout(timer);
  }, [orgName, mode, websiteUrl, description, country]);

  // Update service options when industry changes
  useEffect(() => {
    const cat = INITIAL_CATEGORIES.find((c) => c.name === selectedIndustry);
    if (cat) {
      setServiceOptions(cat.industries);
      if (!cat.industries.includes(selectedService)) {
        setSelectedService(cat.industries[0] || "");
      }
    } else {
      setServiceOptions([selectedService]);
    }
  }, [selectedIndustry]);

  // Ensure primary location exists
  useEffect(() => {
    if (locations.length === 0) {
      setPrimaryLocation("");
    } else if (!locations.includes(primaryLocation)) {
      setPrimaryLocation(locations[0]);
    }
  }, [locations, primaryLocation]);

  // Check if AI Reception is mapped from selected problems
  const hasAiReception = selectedProblems.some((p) => {
    const match = REQUIREMENT_PROBLEMS.find((rp) => rp.problem === p);
    if (match && match.req === "AI Reception") return true;
    if (/call|phone|reception|front desk|booking|message/i.test(p)) return true;
    return false;
  });

  // Clear calling fields when AI Reception is deselected
  useEffect(() => {
    if (!hasAiReception) {
      setSelectedCallVolume("");
      setSelectedIntl("");
      setSelectedPhone("");
      setErrors((prev) => {
        const next = { ...prev };
        delete next.callVolume;
        delete next.intl;
        delete next.phone;
        return next;
      });
    } else {
      // Set sensible defaults if user activates AI Reception and fields are empty
      if (!selectedCallVolume) setSelectedCallVolume("25–100 a day");
      if (!selectedIntl) setSelectedIntl("Not sure");
      if (!selectedPhone) setSelectedPhone("Use my own number");
    }
  }, [hasAiReception]);

  // ── Section Completion Validation ──
  const isSection1Complete = Boolean(selectedIndustry.trim() && selectedService.trim());
  const isSection2Complete = selectedProblems.length > 0;
  const isSection3Complete = Boolean(
    selectedTeamSize.trim() &&
      (!hasAiReception ||
        (selectedCallVolume.trim() && selectedIntl.trim() && selectedPhone.trim()))
  );
  const isSection4Complete = Boolean(locations.length > 0 && primaryLocation.trim());
  const isSection5Complete = uploadedDocs.length > 0;

  const sectionStatusList = [
    isSection1Complete,
    isSection2Complete,
    isSection3Complete,
    isSection4Complete,
    isSection5Complete,
  ];
  const completedCount = sectionStatusList.filter(Boolean).length;

  // Toggle Accordion (collapsible: clicking open section closes it to 0 open)
  const toggleSection = (key: SectionKey) => {
    setOpenSection((prev) => (prev === key ? null : key));
  };

  // ── Location Handlers ──
  const handleAddLocation = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newLocationInput.trim();
    if (!clean) return;
    if (locations.some((l) => l.toLowerCase() === clean.toLowerCase())) {
      toast.error("That location is already in your list.");
      return;
    }
    const updated = [...locations, clean];
    setLocations(updated);
    if (!primaryLocation) {
      setPrimaryLocation(clean);
    }
    setNewLocationInput("");
    if (errors.locations) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.locations;
        return next;
      });
    }
  };

  const handleRemoveLocation = (indexToRemove: number) => {
    if (locations.length <= 1) {
      toast.error("At least one location is required.");
      return;
    }
    const removedLoc = locations[indexToRemove];
    const updated = locations.filter((_, idx) => idx !== indexToRemove);
    setLocations(updated);
    if (primaryLocation === removedLoc) {
      setPrimaryLocation(updated[0]);
    }
  };

  const handleSaveEditLocation = () => {
    if (editingLocationIndex === null) return;
    const clean = editingLocationText.trim();
    if (!clean) return;
    const oldLoc = locations[editingLocationIndex];
    const updated = [...locations];
    updated[editingLocationIndex] = clean;
    setLocations(updated);
    if (primaryLocation === oldLoc) {
      setPrimaryLocation(clean);
    }
    setEditingLocationIndex(null);
    setEditingLocationText("");
  };

  // ── File Upload Handlers ──
  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newDocs: UploadedDoc[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.size > 25 * 1024 * 1024) {
        toast.error(`File "${f.name}" exceeds the 25MB limit.`);
        continue;
      }
      newDocs.push({
        id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: f.name,
        sizeLabel: formatBytes(f.size),
      });
    }

    if (newDocs.length > 0) {
      setUploadedDocs((prev) => [...prev, ...newDocs]);
      toast.success(`Attached ${newDocs.length} document(s).`);
    }
  };

  // ── Finish Setup Submission ──
  const handleFinishSetup = () => {
    if (!isSection1Complete) {
      setOpenSection("industry");
      setErrors({ industry: "Please select your industry and service." });
      toast.error("Please complete the required Industry section.");
      return;
    }

    if (!isSection2Complete) {
      setOpenSection("requirements");
      setErrors({ requirements: "Please pick at least one pain point." });
      toast.error("Please complete the Requirements section.");
      return;
    }

    if (!isSection3Complete) {
      setOpenSection("team_capacity");
      const newErrors: { [key: string]: string } = {};
      if (!selectedTeamSize.trim()) newErrors.teamSize = "Please select your team size.";
      if (hasAiReception) {
        if (!selectedCallVolume.trim()) newErrors.callVolume = "Please select approximate call volume.";
        if (!selectedIntl.trim()) newErrors.intl = "Please indicate if you receive international calls.";
        if (!selectedPhone.trim()) newErrors.phone = "Please select a phone number preference.";
      }
      setErrors(newErrors);
      toast.error("Please complete all required fields in Team and capacity.");
      return;
    }

    if (!isSection4Complete) {
      setOpenSection("locations");
      setErrors({ locations: "Please provide at least one practice location." });
      toast.error("Please provide at least one practice location.");
      return;
    }

    // Map selected problems silently to backend requirements
    const finalRequirements: string[] = [];
    for (const p of selectedProblems) {
      const match = REQUIREMENT_PROBLEMS.find((rp) => rp.problem === p);
      if (match) {
        if (!finalRequirements.includes(match.req)) {
          finalRequirements.push(match.req);
        }
      } else {
        if (!finalRequirements.includes(p)) {
          finalRequirements.push(p);
        }
      }
    }

    // Call Volume
    let finalCallVolume: string | null = null;
    if (hasAiReception && selectedCallVolume) {
      finalCallVolume = selectedCallVolume;
    }

    // International Calls
    let finalIntl: boolean | null = null;
    if (hasAiReception && selectedIntl) {
      if (selectedIntl.toLowerCase().includes("yes")) finalIntl = true;
      else if (selectedIntl.toLowerCase().includes("no")) finalIntl = false;
      else finalIntl = null;
    }

    // Telephony
    let finalTelephony: "bring_own" | "default" | null = null;
    if (hasAiReception && selectedPhone) {
      if (selectedPhone.includes("own")) finalTelephony = "bring_own";
      else if (selectedPhone.includes("MantraAssist")) finalTelephony = "default";
      else finalTelephony = null;
    }

    const finalData: CollectedOnboardingData = {
      confirmedCategory: selectedService.trim(),
      industry: selectedIndustry.trim(),
      requirements: finalRequirements,
      callVolume: finalCallVolume,
      internationalCalls: finalIntl,
      locations: locations,
      primaryLocation: primaryLocation || locations[0] || null,
      operatingHours: null,
      teamSize: selectedTeamSize,
      uploadedDocuments: uploadedDocs,
      telephony: finalTelephony,
    };

    onComplete(finalData);
  };

  // ── Header Summary Generator ──
  const getSectionSummary = (key: SectionKey): string | null => {
    switch (key) {
      case "industry":
        if (selectedService && selectedIndustry) {
          return `${selectedService} · ${selectedIndustry}`;
        }
        return null;
      case "requirements":
        if (selectedProblems.length > 0) {
          const first = selectedProblems[0];
          return selectedProblems.length > 1 ? `${first} (+${selectedProblems.length - 1} more)` : first;
        }
        return null;
      case "team_capacity":
        if (selectedTeamSize) {
          return hasAiReception && selectedCallVolume
            ? `Team of ${selectedTeamSize} · ${selectedCallVolume}`
            : `Team of ${selectedTeamSize}`;
        }
        return null;
      case "locations":
        if (locations.length > 0) {
          return `${locations.length} location${locations.length > 1 ? "s" : ""} (${primaryLocation} primary)`;
        }
        return null;
      case "knowledge_base":
        if (uploadedDocs.length > 0) {
          return `${uploadedDocs.length} document${uploadedDocs.length > 1 ? "s" : ""}`;
        }
        return null;
      default:
        return null;
    }
  };

  // Circular progress calculations (36px ring)
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completedCount / 5) * circumference;

  return (
    <CenteredOnboardingShell maxWidth="max-w-[640px]">
            {/* Header: Title + Subtitle + Circular Progress Ring (Blue on Slate, 36px) */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2
                  className="text-2xl font-semibold text-slate-900 tracking-tight mb-1"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Tell us about your practice
                </h2>
                <p className="text-[13px] text-slate-500" style={{ fontFamily: "Inter, sans-serif" }}>
                  Takes about 2 minutes. Everything is editable.
                </p>
              </div>

              {/* Circular Progress Ring (36px) */}
              <div className="flex items-center justify-center shrink-0 mt-0.5" title={`${completedCount} of 5 sections complete`}>
                <div className="relative w-9 h-9 flex items-center justify-center">
                  <svg className="w-9 h-9 transform -rotate-90">
                    <circle
                      cx="18"
                      cy="18"
                      r={radius}
                      stroke="#e2e8f0"
                      strokeWidth="2.5"
                      fill="transparent"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r={radius}
                      stroke="#2563eb"
                      strokeWidth="2.5"
                      fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className="transition-all duration-300 ease-out"
                    />
                  </svg>
                  <span
                    className="absolute text-[10px] font-bold text-slate-700"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {completedCount}/5
                  </span>
                </div>
              </div>
            </div>

            {/* Skeleton Loading on Mount */}
            {isPreloading ? (
              <div className="space-y-2.5 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-2xl border border-slate-200/60" />
                ))}
              </div>
            ) : (
              /* ── Accordion Cards (One soft card per section, 10px gap) ── */
              <div className="space-y-2.5 pb-6" role="region" aria-label="Practice setup form">
                {/* ─────────────────────────────────────────────────────────────
                    SECTION 1: INDUSTRY *
                ───────────────────────────────────────────────────────────── */}
                <div className="rounded-[16px] border border-slate-200 bg-white shadow-2xs overflow-hidden transition-all duration-200">
                  <button
                    type="button"
                    onClick={() => toggleSection("industry")}
                    aria-expanded={openSection === "industry"}
                    aria-controls="section-1-content"
                    className="w-full px-4 py-3.5 sm:px-5 sm:py-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/50 transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                          isSection1Complete
                            ? "bg-[#182230] text-white"
                            : openSection === "industry"
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {isSection1Complete ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : "1"}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[15px] font-semibold text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
                            Industry
                            <span aria-hidden="true" className="text-blue-600 text-[14px] ml-[2px] font-bold select-none">*</span>
                            <span className="sr-only"> (required)</span>
                          </span>
                        </div>
                        {getSectionSummary("industry") && (
                          <p className="text-[13px] text-slate-500 mt-0.5 truncate">{getSectionSummary("industry")}</p>
                        )}
                      </div>
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transform transition-transform duration-200 ${
                        openSection === "industry" ? "rotate-180 text-slate-700" : ""
                      }`}
                    />
                  </button>

                  {openSection === "industry" && (
                    <div id="section-1-content" className="px-4 pb-4 pt-1 sm:px-5 sm:pb-5 border-t border-slate-100 space-y-3.5 animate-fadeIn">
                      <CustomDropdown
                        label="Industry"
                        options={industryOptions}
                        value={selectedIndustry}
                        onChange={(val) => {
                          setSelectedIndustry(val);
                          if (!industryOptions.includes(val)) {
                            setIndustryOptions((prev) => [...prev, val]);
                          }
                          if (errors.industry) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.industry;
                              return next;
                            });
                          }
                        }}
                        placeholder="Select industry"
                        required
                        error={errors.industry}
                        badge={
                          detectedBadge && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200/60 rounded-full px-2 py-0.5">
                              <Sparkles className="w-3 h-3 text-blue-600" />
                              Detected from {detectedBadge}
                            </span>
                          )
                        }
                      />

                      <CustomDropdown
                        label="Service / Category"
                        options={serviceOptions}
                        value={selectedService}
                        onChange={(val) => {
                          setSelectedService(val);
                          if (!serviceOptions.includes(val)) {
                            setServiceOptions((prev) => [...prev, val]);
                          }
                          if (errors.service) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.service;
                              return next;
                            });
                          }
                        }}
                        placeholder="Select primary specialty"
                        required
                        error={errors.service}
                      />
                    </div>
                  )}
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    SECTION 2: REQUIREMENTS *
                ───────────────────────────────────────────────────────────── */}
                <div className="rounded-[16px] border border-slate-200 bg-white shadow-2xs overflow-hidden transition-all duration-200">
                  <button
                    type="button"
                    onClick={() => toggleSection("requirements")}
                    aria-expanded={openSection === "requirements"}
                    aria-controls="section-2-content"
                    className="w-full px-4 py-3.5 sm:px-5 sm:py-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/50 transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                          isSection2Complete
                            ? "bg-[#182230] text-white"
                            : openSection === "requirements"
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {isSection2Complete ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : "2"}
                      </div>

                      <div className="min-w-0">
                        <span className="text-[15px] font-semibold text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
                          Requirements
                          <span aria-hidden="true" className="text-blue-600 text-[14px] ml-[2px] font-bold select-none">*</span>
                          <span className="sr-only"> (required)</span>
                        </span>
                        {getSectionSummary("requirements") && (
                          <p className="text-[13px] text-slate-500 mt-0.5 truncate">{getSectionSummary("requirements")}</p>
                        )}
                      </div>
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transform transition-transform duration-200 ${
                        openSection === "requirements" ? "rotate-180 text-slate-700" : ""
                      }`}
                    />
                  </button>

                  {openSection === "requirements" && (
                    <div id="section-2-content" className="px-4 pb-4 pt-1 sm:px-5 sm:pb-5 border-t border-slate-100 space-y-3.5 animate-fadeIn">
                      <CustomDropdown
                        label="What would you like help with"
                        helperText="Pick everything that feels like a pain point today."
                        options={REQUIREMENT_PROBLEMS.map((p) => p.problem)}
                        value={selectedProblems}
                        onChange={(val) => {
                          setSelectedProblems(val);
                          if (errors.requirements) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.requirements;
                              return next;
                            });
                          }
                        }}
                        isMulti
                        required
                        placeholder="Choose pain points to automate..."
                        error={errors.requirements}
                      />
                    </div>
                  )}
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    SECTION 3: TEAM AND CAPACITY *
                ───────────────────────────────────────────────────────────── */}
                <div className="rounded-[16px] border border-slate-200 bg-white shadow-2xs overflow-hidden transition-all duration-200">
                  <button
                    type="button"
                    onClick={() => toggleSection("team_capacity")}
                    aria-expanded={openSection === "team_capacity"}
                    aria-controls="section-3-content"
                    className="w-full px-4 py-3.5 sm:px-5 sm:py-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/50 transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                          isSection3Complete
                            ? "bg-[#182230] text-white"
                            : openSection === "team_capacity"
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {isSection3Complete ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : "3"}
                      </div>

                      <div className="min-w-0">
                        <span className="text-[15px] font-semibold text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
                          Team and capacity
                          <span aria-hidden="true" className="text-blue-600 text-[14px] ml-[2px] font-bold select-none">*</span>
                          <span className="sr-only"> (required)</span>
                        </span>
                        {getSectionSummary("team_capacity") && (
                          <p className="text-[13px] text-slate-500 mt-0.5 truncate">{getSectionSummary("team_capacity")}</p>
                        )}
                      </div>
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transform transition-transform duration-200 ${
                        openSection === "team_capacity" ? "rotate-180 text-slate-700" : ""
                      }`}
                    />
                  </button>

                  {openSection === "team_capacity" && (
                    <div id="section-3-content" className="px-4 pb-4 pt-1 sm:px-5 sm:pb-5 border-t border-slate-100 space-y-4 animate-fadeIn">
                      <CustomDropdown
                        label="Team size"
                        options={teamSizeOptions}
                        value={selectedTeamSize}
                        onChange={(val) => {
                          setSelectedTeamSize(val);
                          if (!teamSizeOptions.includes(val)) {
                            setTeamSizeOptions((prev) => [...prev, val]);
                          }
                          if (errors.teamSize) {
                            setErrors((prev) => {
                              const next = { ...prev };
                              delete next.teamSize;
                              return next;
                            });
                          }
                        }}
                        placeholder="Select number of staff"
                        required
                        error={errors.teamSize}
                      />

                      {/* Required calling fields when Requirements map to AI Reception */}
                      {hasAiReception && (
                        <>
                          <div className="h-px bg-slate-100 my-2" />

                          <CustomDropdown
                            label="Approximate call volume"
                            helperText="Daily call estimate across all channels."
                            options={callVolumeOptions}
                            value={selectedCallVolume}
                            onChange={(val) => {
                              setSelectedCallVolume(val);
                              if (!callVolumeOptions.includes(val)) {
                                setCallVolumeOptions((prev) => [...prev, val]);
                              }
                              if (errors.callVolume) {
                                setErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.callVolume;
                                  return next;
                                });
                              }
                            }}
                            placeholder="Select call volume"
                            required
                            error={errors.callVolume}
                          />

                          <CustomDropdown
                            label="International calls"
                            helperText="Do you receive inquiries from outside your domestic area?"
                            options={intlOptions}
                            value={selectedIntl}
                            onChange={(val) => {
                              setSelectedIntl(val);
                              if (!intlOptions.includes(val)) {
                                setIntlOptions((prev) => [...prev, val]);
                              }
                              if (errors.intl) {
                                setErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.intl;
                                  return next;
                                });
                              }
                            }}
                            placeholder="Select option"
                            required
                            error={errors.intl}
                          />

                          <CustomDropdown
                            label="Phone number"
                            helperText="How should MantraAssist route your patient calls?"
                            options={phoneOptions}
                            value={selectedPhone}
                            onChange={(val) => {
                              setSelectedPhone(val);
                              if (!phoneOptions.includes(val)) {
                                setPhoneOptions((prev) => [...prev, val]);
                              }
                              if (errors.phone) {
                                setErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.phone;
                                  return next;
                                });
                              }
                            }}
                            placeholder="Select phone option"
                            required
                            error={errors.phone}
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    SECTION 4: LOCATIONS *
                ───────────────────────────────────────────────────────────── */}
                <div className="rounded-[16px] border border-slate-200 bg-white shadow-2xs overflow-hidden transition-all duration-200">
                  <button
                    type="button"
                    onClick={() => toggleSection("locations")}
                    aria-expanded={openSection === "locations"}
                    aria-controls="section-4-content"
                    className="w-full px-4 py-3.5 sm:px-5 sm:py-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/50 transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                          isSection4Complete
                            ? "bg-[#182230] text-white"
                            : openSection === "locations"
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {isSection4Complete ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : "4"}
                      </div>

                      <div className="min-w-0">
                        <span className="text-[15px] font-semibold text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
                          Locations
                          <span aria-hidden="true" className="text-blue-600 text-[14px] ml-[2px] font-bold select-none">*</span>
                          <span className="sr-only"> (required)</span>
                        </span>
                        {getSectionSummary("locations") && (
                          <p className="text-[13px] text-slate-500 mt-0.5 truncate">{getSectionSummary("locations")}</p>
                        )}
                      </div>
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transform transition-transform duration-200 ${
                        openSection === "locations" ? "rotate-180 text-slate-700" : ""
                      }`}
                    />
                  </button>

                  {openSection === "locations" && (
                    <div id="section-4-content" className="px-4 pb-4 pt-1 sm:px-5 sm:pb-5 border-t border-slate-100 space-y-4 animate-fadeIn">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-[13px] font-semibold text-slate-800">
                            Practice locations
                            <span aria-hidden="true" className="text-blue-600 text-[14px] ml-[2px] font-bold select-none">*</span>
                            <span className="sr-only"> (required)</span>
                          </label>
                          <span className="text-xs text-slate-400">Select one as primary</span>
                        </div>

                        {/* Location Rows */}
                        <div className="space-y-2 mb-3">
                          {locations.map((loc, idx) => {
                            const isPrimary = loc === primaryLocation;
                            const isEditing = editingLocationIndex === idx;

                            if (isEditing) {
                              return (
                                <div key={idx} className="flex items-center gap-2 p-2 bg-blue-50/40 rounded-xl border border-blue-200">
                                  <input
                                    type="text"
                                    value={editingLocationText}
                                    onChange={(e) => setEditingLocationText(e.target.value)}
                                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSaveEditLocation();
                                      if (e.key === "Escape") setEditingLocationIndex(null);
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={handleSaveEditLocation}
                                    className="px-3 py-1.5 bg-[#182230] hover:bg-black text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingLocationIndex(null)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={idx}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                  isPrimary ? "bg-blue-50/40 border-blue-200 shadow-2xs" : "bg-white border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => setPrimaryLocation(loc)}
                                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                                      isPrimary ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
                                    }`}
                                    title="Set as primary"
                                  >
                                    {isPrimary && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                  </button>

                                  <span className="text-[13px] font-medium text-slate-800 truncate">{loc}</span>

                                  {isPrimary && (
                                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60 shrink-0">
                                      Primary
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingLocationIndex(idx);
                                      setEditingLocationText(loc);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                                    title="Rename"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  {locations.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveLocation(idx)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                      title="Remove"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Add Another Location */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newLocationInput}
                            onChange={(e) => setNewLocationInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddLocation();
                              }
                            }}
                            placeholder="Add another location (e.g. Downtown Office)"
                            className="flex-1 px-3.5 py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddLocation()}
                            className="py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5 text-blue-600" />
                            <span>Add</span>
                          </button>
                        </div>
                        {errors.locations && <p className="text-xs text-rose-600 mt-1.5">{errors.locations}</p>}
                      </div>

                    </div>
                  )}
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    SECTION 5: KNOWLEDGE BASE (No star, no "Optional" label)
                ───────────────────────────────────────────────────────────── */}
                <div className="rounded-[16px] border border-slate-200 bg-white shadow-2xs overflow-hidden transition-all duration-200">
                  <button
                    type="button"
                    onClick={() => toggleSection("knowledge_base")}
                    aria-expanded={openSection === "knowledge_base"}
                    aria-controls="section-5-content"
                    className="w-full px-4 py-3.5 sm:px-5 sm:py-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/50 transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                          isSection5Complete
                            ? "bg-[#182230] text-white"
                            : openSection === "knowledge_base"
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {isSection5Complete ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : "5"}
                      </div>

                      <div className="min-w-0">
                        <span className="text-[15px] font-semibold text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
                          Knowledge base
                        </span>
                        {getSectionSummary("knowledge_base") && (
                          <p className="text-[13px] text-slate-500 mt-0.5 truncate">{getSectionSummary("knowledge_base")}</p>
                        )}
                      </div>
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transform transition-transform duration-200 ${
                        openSection === "knowledge_base" ? "rotate-180 text-slate-700" : ""
                      }`}
                    />
                  </button>

                  {openSection === "knowledge_base" && (
                    <div id="section-5-content" className="px-4 pb-4 pt-1 sm:px-5 sm:pb-5 border-t border-slate-100 space-y-3.5 animate-fadeIn">
                      <div>
                        <p className="text-[13px] font-semibold text-slate-800 mb-0.5">Give your agent more context</p>
                        <p className="text-[13px] text-slate-500 mb-3">
                          Pricing, product or service lists, and anything else it should know.
                        </p>

                        {/* Dropzone (Dashed slate-300, blue hover, NO green) */}
                        <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/40 hover:bg-blue-50/30 hover:border-blue-400 p-6 text-center cursor-pointer transition-colors">
                          <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.txt,.csv"
                            onChange={(e) => handleFileUpload(e.target.files)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <Upload className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                          <p className="text-xs font-semibold text-slate-800">Click or drag files here to upload</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Supports PDF, DOC, DOCX, TXT, CSV (up to 25MB)</p>
                        </div>

                        {/* Attached Files List */}
                        {uploadedDocs.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs font-semibold text-slate-600">Attached files:</p>
                            {uploadedDocs.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span className="font-medium text-slate-800 truncate">{doc.name}</span>
                                  <span className="text-slate-400 shrink-0">({doc.sizeLabel})</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setUploadedDocs((prev) => prev.filter((d) => d.id !== doc.id))}
                                  className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer"
                                  title="Remove"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Bottom Actions: Compact Centered Button + Back / Voice Links */}
          <div className="pt-3 flex flex-col items-center space-y-2.5">
            <button
              type="button"
              onClick={handleFinishSetup}
              className="w-full max-w-[280px] h-10 bg-[#182230] hover:bg-black active:scale-[0.98] text-white text-[13px] font-semibold rounded-full shadow-sm shadow-slate-900/10 hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              <span>Finish setup</span>
              <Check className="w-4 h-4 text-blue-400 stroke-[2.5]" />
            </button>

            <div className="flex items-center gap-3 text-[12px] font-medium" style={{ fontFamily: "Inter, sans-serif" }}>
              <button
                type="button"
                onClick={onBack}
                className="text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 cursor-pointer py-0.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <span className="text-slate-300">•</span>

              <button
                type="button"
                onClick={onSwitchToVoice}
                className="text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 cursor-pointer py-0.5"
                title="Switch to AI voice assistant setup"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Talk to AI assistant</span>
              </button>
            </div>
          </div>
    </CenteredOnboardingShell>
  );
};

export default QuickFormOnboardingScreen;
