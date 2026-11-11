import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Building2,
  Globe,
  Mail,
  Phone,
  Clock,
  MapPin,
  CreditCard,
  Plus,
  Edit2,
  Edit3,
  Trash2,
  Check,
  ChevronDown,
  ChevronRight,
  Save,
  Layers,
  Sparkles,
  ExternalLink,
  Shield,
  FileText,
  Type,
  Hash,
  Calendar,
  DollarSign,
  Tag,
  AlignLeft,
  User,
  Sliders,
  GripVertical,
  PhoneCall,
  Settings as SettingsIcon,
  Camera,
  PhoneOff,
  Ban,
  ShieldCheck,
  Lock,
  RotateCcw,
  Info,
  Copy,
  Briefcase,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Tooltip } from "../ui/Tooltip";
import { Switch } from "../ui/switch";
import { toast } from "sonner";
import {
  useFieldRegistry,
  FieldDefinition,
  SectionDefinition,
} from "../../context/FieldRegistryContext";
import { SelectFieldsModal, CreateFieldModal } from "../help/FieldManager";
import { AdminSectionDrawer } from "../../pages/admin/components/AdminSectionDrawer";
import { AdminFieldDrawer } from "../../pages/admin/components/AdminFieldDrawer";
import {
  INITIAL_CATEGORIES,
  STANDARD_LOCATIONS,
  getIndustriesForCategory,
} from "../../../data/industryReferenceData";
import { COUNTRIES, TIMEZONES } from "../../pages/settings-constants";
import OrganizationLocationsSection from "./OrganizationLocationsSection";

export interface CustomFieldItem {
  id: string;
  key: string;
  label: string;
  type: string;
  value: string;
  required?: boolean;
}

export interface CustomSectionItem {
  id: string;
  title: string;
  description?: string;
  iconName?: string;
  fields: CustomFieldItem[];
}

export interface OrganizationDetail {
  id: string;
  name: string;
  logo?: string;
  flag?: string;
  email: string;
  phone?: string;
  industryCategory?: string;
  industry: string;
  location?: string;
  locations?: string[];
  preferredTime?: string;
  timezone?: string;
  defaultCallingCountry?: string;
  address?: string;
  billingContactName?: string;
  billingContactEmail?: string;
  registrationIdType?: string;
  registrationNumber?: string;
  website?: string;
  socialMediaUrl?: string;
  language?: string;
  status: "Active" | "Inactive";
  users?: number;
  createdDate?: string;
  customSections?: CustomSectionItem[];
}

interface OrganizationDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  organization: OrganizationDetail | null;
  onSave: (updated: OrganizationDetail) => void;
}

export default function OrganizationDetailDrawer({
  isOpen,
  onClose,
  organization,
  onSave,
}: OrganizationDetailDrawerProps) {
  const [formData, setFormData] = useState<OrganizationDetail | null>(null);

  // Field Registry hooks (linked with Admin Custom Fields)
  const {
    getAllFields,
    getAllSections,
    addCustomSection,
    updateCustomSection,
    deleteCustomSection,
    updateCustomField,
  } = useFieldRegistry();

  const allOrgFields = useMemo(() => getAllFields("organization"), [getAllFields]);
  const allOrgSections = useMemo(() => getAllSections("organization"), [getAllSections]);

  const BUILTIN_ORGANIZATION_SECTION_TITLES = useMemo(
    () => new Set(["basic info", "organization locations", "billing info", "contact & billing", "custom fields"]),
    []
  );

  const customOrgSections = useMemo(() => {
    const BUILTIN_SEC_IDS = new Set(["sec-org-basic", "sec-org-locations", "sec-org-contact-billing", "sec-org-custom"]);
    return allOrgSections.filter((s) => {
      if (s.source === "system") return false;
      if (BUILTIN_SEC_IDS.has(s.id)) return false;
      if (s.id.startsWith("sec-org-")) return false;
      const lower = (s.title || "").toLowerCase().trim();
      if (BUILTIN_ORGANIZATION_SECTION_TITLES.has(lower)) return false;
      return true;
    });
  }, [allOrgSections, BUILTIN_ORGANIZATION_SECTION_TITLES]);

  // Registry modals state
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [createFieldModalOpen, setCreateFieldModalOpen] = useState(false);
  const [addSectionDrawerOpen, setAddSectionDrawerOpen] = useState(false);
  const [editingSectionDef, setEditingSectionDef] = useState<SectionDefinition | null>(null);
  const [editingFieldDef, setEditingFieldDef] = useState<FieldDefinition | null>(null);
  const [targetSectionIdForField, setTargetSectionIdForField] = useState<string | null>(null);

  // Custom fields in standard sections
  const [basicCustomFieldKeys, setBasicCustomFieldKeys] = useState<string[]>([]);
  const [billingCustomFieldKeys, setBillingCustomFieldKeys] = useState<string[]>([]);
  const [languageCustomFieldKeys, setLanguageCustomFieldKeys] = useState<string[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  const systemBasicSec = allOrgSections.find((s) => s.id === "sec-org-basic");
  const effectiveBasicCustomKeys = useMemo(() => {
    const CORE_BASIC_KEYS = ["org_name", "industryCategory", "industry", "location"];
    const fromRegistry = (systemBasicSec?.fieldKeys || []).filter((k) => !CORE_BASIC_KEYS.includes(k));
    return Array.from(new Set([...fromRegistry, ...basicCustomFieldKeys]));
  }, [systemBasicSec, basicCustomFieldKeys]);

  const systemBillingSec = allOrgSections.find((s) => s.id === "sec-org-contact-billing");
  const effectiveBillingCustomKeys = useMemo(() => {
    const CORE_BILLING_KEYS = ["email", "phone", "timezone", "address", "billing_address", "billingContactName", "billingContactEmail", "registrationNumber", "website"];
    const fromRegistry = (systemBillingSec?.fieldKeys || []).filter((k) => !CORE_BILLING_KEYS.includes(k));
    return Array.from(new Set([...fromRegistry, ...billingCustomFieldKeys]));
  }, [systemBillingSec, billingCustomFieldKeys]);

  useEffect(() => {
    if (organization) {
      setFormData({
        ...organization,
        phone: organization.phone || "+1 (555) 019-2834",
        preferredTime: organization.preferredTime || "2:00 PM · IST",
        timezone: organization.timezone || "UTC-08:00 (Pacific Time)",
        defaultCallingCountry: organization.defaultCallingCountry || "United States",
        address: organization.address || "123 Innovation Blvd, Suite 400, San Francisco, CA 94107",
        billingContactName: organization.billingContactName || "Finance Lead",
        billingContactEmail: organization.billingContactEmail || organization.email,
        registrationIdType: organization.registrationIdType || "EIN / Tax ID",
        registrationNumber: organization.registrationNumber || "XX-XXXXXXX",
        website: organization.website || "https://example.com",
        socialMediaUrl: organization.socialMediaUrl || "https://linkedin.com/company",
        language: organization.language || "English",
        customSections: organization.customSections || [],
      });
    }
  }, [organization]);

  // Active Tab: General | Availability | Security
  const [activeTab, setActiveTab] = useState<"general" | "availability" | "security">("general");

  // Logo upload ref & handlers
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => (prev ? { ...prev, logo: reader.result as string } : prev));
      toast.success("Organization logo uploaded");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => (prev ? { ...prev, logo: undefined } : prev));
    toast.success("Organization logo removed");
  };

  // Availability / Weekly Schedule State
  const [scheduleTimezone, setScheduleTimezone] = useState(
    organization?.timezone || "America/Los_Angeles (Pacific Time)"
  );
  const [weeklySchedule, setWeeklySchedule] = useState([
    { day: "Monday", open: true, start: "09:00 AM", end: "05:00 PM" },
    { day: "Tuesday", open: true, start: "09:00 AM", end: "05:00 PM" },
    { day: "Wednesday", open: true, start: "09:00 AM", end: "05:00 PM" },
    { day: "Thursday", open: true, start: "09:00 AM", end: "05:00 PM" },
    { day: "Friday", open: true, start: "09:00 AM", end: "05:00 PM" },
    { day: "Saturday", open: false, start: "10:00 AM", end: "02:00 PM" },
    { day: "Sunday", open: false, start: "10:00 AM", end: "02:00 PM" },
  ]);

  const handleApplyMonFriToAll = () => {
    const mon = weeklySchedule[0];
    setWeeklySchedule((prev) =>
      prev.map((item, idx) =>
        idx >= 1 && idx <= 4
          ? { ...item, open: mon.open, start: mon.start, end: mon.end }
          : item
      )
    );
    toast.success("Applied Monday hours to all weekdays");
  };

  // Security Settings State
  const [roboCallEnabled, setRoboCallEnabled] = useState(true);
  const [shieldingSensitivity, setShieldingSensitivity] = useState<"standard" | "strict" | "aggressive">("standard");
  const [autoBlockSpam, setAutoBlockSpam] = useState(true);

  const [enforce2FA, setEnforce2FA] = useState(false);
  const [twoFaGracePeriod, setTwoFaGracePeriod] = useState("3 days");

  const [sessionTimeout, setSessionTimeout] = useState("30m");
  const [lockOnIdle, setLockOnIdle] = useState(true);

  const [minPasswordLength, setMinPasswordLength] = useState(8);
  const [requireSpecialChars, setRequireSpecialChars] = useState(true);
  const [requireNumbers, setRequireNumbers] = useState(true);

  const [blockedNumbers, setBlockedNumbers] = useState<Array<{ id: string; countryCode: string; phoneNumber: string; note: string }>>([
    { id: "1", countryCode: "+1", phoneNumber: "(800) 555-0199", note: "Known spam telemarketer" },
    { id: "2", countryCode: "+1", phoneNumber: "(888) 420-9912", note: "Aggressive robocall" },
  ]);
  const [newBlockedNumber, setNewBlockedNumber] = useState({ countryCode: "+1", phoneNumber: "", note: "" });

  const [expandedSecurityRow, setExpandedSecurityRow] = useState<string | null>("robocall");

  const toggleSecurityRow = (rowId: string) => {
    setExpandedSecurityRow((prev) => (prev === rowId ? null : rowId));
  };

  if (!isOpen || !formData) return null;

  const handleFieldChange = (field: keyof OrganizationDetail, value: any) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleOpenAddField = (sectionId: string) => {
    setTargetSectionIdForField(sectionId);
    setFieldModalOpen(true);
  };

  const handleApplySelectedFields = (selectedKeys: string[]) => {
    if (!targetSectionIdForField) return;

    if (targetSectionIdForField === "sec_basic") {
      setBasicCustomFieldKeys((prev) => Array.from(new Set([...prev, ...selectedKeys])));
    } else if (targetSectionIdForField === "sec_billing") {
      setBillingCustomFieldKeys((prev) => Array.from(new Set([...prev, ...selectedKeys])));
    } else if (targetSectionIdForField === "sec_language") {
      setLanguageCustomFieldKeys((prev) => Array.from(new Set([...prev, ...selectedKeys])));
    } else {
      const targetSec = allOrgSections.find((s) => s.id === targetSectionIdForField);
      if (targetSec) {
        updateCustomSection("organization", targetSec.id, {
          fieldKeys: Array.from(new Set([...(targetSec.fieldKeys || []), ...selectedKeys])),
        });
      }
    }
    setFieldModalOpen(false);
    setTargetSectionIdForField(null);
    toast.success("Fields updated");
  };

  const handleRemoveFieldFromSection = (sectionId: string, fieldKey: string) => {
    if (sectionId === "sec_basic") {
      setBasicCustomFieldKeys((prev) => prev.filter((k) => k !== fieldKey));
    } else if (sectionId === "sec_billing") {
      setBillingCustomFieldKeys((prev) => prev.filter((k) => k !== fieldKey));
    } else if (sectionId === "sec_language") {
      setLanguageCustomFieldKeys((prev) => prev.filter((k) => k !== fieldKey));
    } else {
      const targetSec = allOrgSections.find((s) => s.id === sectionId);
      if (targetSec) {
        updateCustomSection("organization", targetSec.id, {
          fieldKeys: (targetSec.fieldKeys || []).filter((k) => k !== fieldKey),
        });
      }
    }
    toast.success("Field removed");
  };

  const handleCustomFieldValueChange = (fieldKey: string, value: any) => {
    setCustomFieldValues((prev) => ({ ...prev, [fieldKey]: value }));
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("Organization name is required");
      return;
    }
    onSave(formData);
    toast.success("Organization details saved successfully");
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Slide-out Drawer */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-full max-w-[1020px] bg-[#fafafa] shadow-2xl flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-300"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {/* Drawer Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative group w-11 h-11 rounded-xl bg-gradient-to-tr from-[#1E293B] to-[#334155] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 overflow-hidden border border-slate-200">
              {formData.logo ? (
                <img src={formData.logo} alt={formData.name} className="w-full h-full object-cover" />
              ) : formData.flag ? (
                formData.flag
              ) : (
                <Building2 className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#111827] truncate leading-tight">
                  {formData.name}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                    formData.status === "Active"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                      : "bg-gray-100 text-gray-500 border border-gray-200"
                  }`}
                >
                  {formData.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {formData.email} · {formData.industry || formData.industryCategory || "Healthcare"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs text-gray-600 hover:text-gray-900 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              className="bg-[#111827] hover:bg-[#1f2937] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save Changes
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="bg-white px-6 border-b border-gray-200 flex items-center gap-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "general"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            General
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("availability")}
            className={`py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "availability"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            Availability
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "security"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            Security
          </button>
        </div>

        {/* Drawer Body (Scrollable Sections) */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
            {/* Left Column: Organization Sticky Identity Card */}
            <div className="space-y-4 md:sticky md:top-0 md:max-h-[calc(100vh-140px)] md:overflow-y-auto">
              {/* Mobile/Tablet Compact View */}
              <div className="md:hidden bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs flex items-center gap-4">
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="w-14 h-14 rounded-2xl border border-slate-200 flex items-center justify-center relative overflow-hidden shrink-0 cursor-pointer shadow-2xs bg-[#1F2937]"
                >
                  {formData.logo ? (
                    <img src={formData.logo} alt="Organization Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {formData.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {formData.industry || formData.industryCategory || "Healthcare"}
                  </p>
                </div>
              </div>

              {/* Desktop Full Structured Identity Card */}
              <div className="hidden md:flex flex-col bg-white rounded-2xl border border-[#E2E8F0] shadow-xs divide-y divide-slate-100 overflow-hidden relative">
                {/* 1. Profile / Logo Section (Centered) */}
                <div className="p-5 flex flex-col items-center text-center">
                  <div className="relative group">
                    <div
                      onClick={() => logoInputRef.current?.click()}
                      className="w-24 h-24 rounded-2xl border-2 border-slate-200 flex items-center justify-center relative overflow-hidden transition-all hover:opacity-95 cursor-pointer shadow-sm bg-gradient-to-tr from-[#1E293B] to-[#334155]"
                      title="Click to change organization logo"
                    >
                      {formData.logo ? (
                        <img src={formData.logo} alt="Organization Logo" className="w-full h-full object-cover" />
                      ) : formData.flag ? (
                        <span className="text-3xl select-none">{formData.flag}</span>
                      ) : (
                        <Building2 className="w-10 h-10 text-white/90" />
                      )}
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-[10px] font-semibold">
                        <Camera className="w-5 h-5 mb-0.5" />
                        <span>Change</span>
                      </div>
                    </div>

                    {/* Dedicated visible Camera Icon button to upload logo */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        logoInputRef.current?.click();
                      }}
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md border-2 border-white hover:bg-blue-700 cursor-pointer transition-transform hover:scale-105"
                      title="Upload logo"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </div>

                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </div>

                  {formData.logo && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="mt-2 text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                    >
                      Remove logo
                    </button>
                  )}

                  {/* Name */}
                  <div className="mt-3 w-full px-2">
                    <Tooltip content={formData.name}>
                      <h3 className="text-base font-bold text-slate-900 truncate leading-snug" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {formData.name}
                      </h3>
                    </Tooltip>
                  </div>

                  {/* Status Badge */}
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{formData.status || "Active"}</span>
                  </div>
                </div>

                {/* 2. Contact & Org Details */}
                <div className="p-4 space-y-3 text-xs text-left">
                  {/* Industry */}
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Briefcase className="w-3 h-3" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Industry</div>
                      <div className="text-slate-800 font-medium truncate">
                        {formData.industry || formData.industryCategory || "Healthcare"}
                      </div>
                    </div>
                  </div>

                  {/* Org ID */}
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Hash className="w-3 h-3" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Org ID</div>
                      <div className="text-slate-800 font-mono text-[11px] font-semibold truncate">
                        {formData.id || "ORG-0001"}
                      </div>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Phone className="w-3 h-3" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Phone</div>
                      <div className="text-slate-800 font-medium truncate">
                        {formData.phone || "+1 (800) 555-0199"}
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Mail className="w-3 h-3" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email</div>
                      <div className="text-slate-800 font-medium truncate" title={formData.email}>
                        {formData.email}
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-3 h-3" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Location</div>
                      <div className="text-slate-800 font-medium truncate">
                        {formData.location || "California, US"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Quick Actions */}
                <div className="p-4 space-y-2 bg-white">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Quick Actions</p>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(formData.id || "ORG-0001");
                      toast.success("Organization ID copied to clipboard");
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Org ID</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Forms & Custom Sections */}
            <div className="space-y-4 min-w-0">
              {activeTab === "general" && (
                <>
                  {/* SECTION 1: BASIC INFO / ORGANIZATION DETAILS */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-3.5 h-3.5 text-slate-300" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">
                      BASIC INFO
                    </h3>
              </div>
            </div>

            <div className="flex flex-col gap-3.5">
              {/* Organization Name */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <GripVertical className="w-3 h-3 text-slate-300" />
                  <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                    ORGANIZATION NAME
                  </label>
                </div>
                <div className="relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFieldChange("name", e.target.value)}
                    placeholder="Enter organization name"
                    className="flex-1 text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none"
                  />
                  <Building2 className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Industry Category (Fetched from Admin scope: INITIAL_CATEGORIES) */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <GripVertical className="w-3 h-3 text-slate-300" />
                  <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                    INDUSTRY CATEGORY
                  </label>
                </div>
                <div className="relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                  <select
                    value={formData.industryCategory || "Healthcare"}
                    onChange={(e) => {
                      const cat = e.target.value;
                      const indList = getIndustriesForCategory(cat);
                      setFormData((prev) => prev ? {
                        ...prev,
                        industryCategory: cat,
                        industry: indList[0] || "",
                      } : prev);
                    }}
                    className="flex-1 text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none cursor-pointer appearance-none pr-5"
                  >
                    {INITIAL_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
                </div>
              </div>

              {/* Industry (Fetched dynamically based on selected Category) */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <GripVertical className="w-3 h-3 text-slate-300" />
                  <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                    INDUSTRY
                  </label>
                </div>
                <div className="relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                  <select
                    value={formData.industry || "General Physician"}
                    onChange={(e) => handleFieldChange("industry", e.target.value)}
                    className="flex-1 text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none cursor-pointer appearance-none pr-5"
                  >
                    {getIndustriesForCategory(formData.industryCategory || "Healthcare").map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
                </div>
              </div>

              {/* Location (Fetched from Admin scope: STANDARD_LOCATIONS) */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <GripVertical className="w-3 h-3 text-slate-300" />
                  <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                    LOCATION
                  </label>
                </div>
                <div className="relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                  <select
                    value={formData.location || "California"}
                    onChange={(e) => {
                      const loc = e.target.value;
                      handleFieldChange("location", loc);
                      handleFieldChange("locations", [loc]);
                    }}
                    className="flex-1 text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none cursor-pointer appearance-none pr-5"
                  >
                    {STANDARD_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
                </div>
              </div>

              {/* Custom Fields added to Basic Info */}
              {effectiveBasicCustomKeys.map((fieldKey) => {
                const fieldDef = allOrgFields.find((f) => f.key === fieldKey);
                const fieldLabel = fieldDef?.label || fieldKey;
                return (
                  <div key={fieldKey}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <GripVertical className="w-3 h-3 text-slate-300" />
                        <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                          {fieldLabel}
                        </label>
                      </div>
                      <div className="flex items-center gap-1">
                        {fieldDef && (
                          <button
                            type="button"
                            onClick={() => setEditingFieldDef(fieldDef)}
                            className="text-[10px] text-slate-400 hover:text-blue-600 p-0.5 rounded cursor-pointer"
                            title="Edit field settings"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveFieldFromSection("sec_basic", fieldKey)}
                          className="text-[10px] text-slate-300 hover:text-red-500 cursor-pointer"
                          title="Remove from section"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                      <input
                        type="text"
                        value={customFieldValues[fieldKey] ?? ""}
                        onChange={(e) =>
                          handleCustomFieldValueChange(fieldKey, e.target.value)
                        }
                        className="flex-1 text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none"
                        placeholder={`Enter ${fieldLabel.toLowerCase()}...`}
                      />
                      <Tag className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* + Add Field inside Basic Info */}
            <div className="flex justify-end mt-4 pt-1">
              <button
                type="button"
                onClick={() => handleOpenAddField("sec_basic")}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Field
              </button>
            </div>
          </div>

          {/* SECTION 2: BILLING INFO */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GripVertical className="w-3.5 h-3.5 text-slate-300" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">
                  BILLING INFO
                </h3>
              </div>
            </div>

            <div className="space-y-3.5">
              {/* Address as a Group Field */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Billing Address
                  </span>
                  <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Country: United States
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-slate-500 block mb-1">STREET ADDRESS</label>
                  <Input
                    placeholder="123 Healthcare Ave, Suite 100"
                    value={formData.address || ""}
                    onChange={(e) => handleFieldChange("address", e.target.value)}
                    className="w-full text-xs bg-white"
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">CITY</label>
                    <Input
                      placeholder="San Francisco"
                      defaultValue="San Francisco"
                      className="w-full text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">STATE / PROVINCE</label>
                    <Input
                      placeholder="CA"
                      defaultValue="CA"
                      className="w-full text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">ZIP / POSTAL CODE</label>
                    <Input
                      placeholder="94102"
                      defaultValue="94102"
                      className="w-full text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Billing Contact Name */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <GripVertical className="w-3 h-3 text-slate-300" />
                  <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                    BILLING CONTACT NAME
                  </label>
                </div>
                <div className="relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                  <input
                    type="text"
                    value={formData.billingContactName || "John Smith"}
                    onChange={(e) => handleFieldChange("billingContactName", e.target.value)}
                    placeholder="John Smith"
                    className="flex-1 text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none"
                  />
                  <User className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Billing Contact Email */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <GripVertical className="w-3 h-3 text-slate-300" />
                  <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                    BILLING CONTACT EMAIL
                  </label>
                </div>
                <div className="relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                  <input
                    type="email"
                    value={formData.billingContactEmail || formData.email}
                    onChange={(e) => handleFieldChange("billingContactEmail", e.target.value)}
                    placeholder="billing@healthcare.com"
                    className="flex-1 text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none"
                  />
                  <Mail className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Custom Fields added to Billing Info */}
              {effectiveBillingCustomKeys.map((fieldKey) => {
                const fieldDef = allOrgFields.find((f) => f.key === fieldKey);
                const fieldLabel = fieldDef?.label || fieldKey;
                return (
                  <div key={fieldKey}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <GripVertical className="w-3 h-3 text-slate-300" />
                        <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                          {fieldLabel}
                        </label>
                      </div>
                      <div className="flex items-center gap-1">
                        {fieldDef && (
                          <button
                            type="button"
                            onClick={() => setEditingFieldDef(fieldDef)}
                            className="text-[10px] text-slate-400 hover:text-blue-600 p-0.5 rounded cursor-pointer"
                            title="Edit field settings"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveFieldFromSection("sec_billing", fieldKey)}
                          className="text-[10px] text-slate-300 hover:text-red-500 cursor-pointer"
                          title="Remove from section"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                      <input
                        type="text"
                        value={customFieldValues[fieldKey] ?? ""}
                        onChange={(e) =>
                          handleCustomFieldValueChange(fieldKey, e.target.value)
                        }
                        className="flex-1 text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none"
                        placeholder={`Enter ${fieldLabel.toLowerCase()}...`}
                      />
                      <Tag className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* + Add Field inside section */}
            <div className="flex justify-end mt-4 pt-1">
              <button
                type="button"
                onClick={() => handleOpenAddField("sec_billing")}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Field
              </button>
            </div>
          </div>



          {/* DYNAMIC CUSTOM SECTIONS */}
          {customOrgSections.map((section) => (
            <div
              key={section.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-3.5 h-3.5 text-slate-300" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">
                    {section.title}
                  </h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSectionDef(section);
                      setAddSectionDrawerOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-blue-600 rounded-md transition-colors cursor-pointer"
                    title="Edit section"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteCustomSection("organization", section.id);
                      toast.success(`Section "${section.title}" deleted`);
                    }}
                    className="p-1 text-slate-400 hover:text-red-500 rounded-md transition-colors cursor-pointer"
                    title="Delete section"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {!section.fieldKeys || section.fieldKeys.length === 0 ? (
                <div className="py-4 text-center border border-dashed border-slate-200 rounded-xl">
                  <p className="text-xs text-slate-400">No fields in this section yet.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {(section.fieldKeys || []).map((fieldKey) => {
                    const fieldDef = allOrgFields.find((f) => f.key === fieldKey);
                    const fieldLabel = fieldDef?.label || fieldKey;
                    return (
                      <div key={fieldKey}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <GripVertical className="w-3 h-3 text-slate-300" />
                            <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                              {fieldLabel}
                            </label>
                          </div>
                          <div className="flex items-center gap-1">
                            {fieldDef && (
                              <button
                                type="button"
                                onClick={() => setEditingFieldDef(fieldDef)}
                                className="text-[10px] text-slate-400 hover:text-blue-600 p-0.5 rounded cursor-pointer"
                                title="Edit field settings"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveFieldFromSection(section.id, fieldKey)}
                              className="text-[10px] text-slate-300 hover:text-red-500 cursor-pointer"
                              title="Remove from section"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="relative flex items-center rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 hover:border-[#CBD5E1] focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all">
                          <input
                            type="text"
                            value={customFieldValues[fieldKey] ?? ""}
                            onChange={(e) =>
                              handleCustomFieldValueChange(fieldKey, e.target.value)
                            }
                            className="flex-1 text-xs text-[#1E293B] font-medium bg-transparent border-none outline-none"
                            placeholder={`Enter ${fieldLabel.toLowerCase()}...`}
                          />
                          <Tag className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* + Add Field inside section */}
              <div className="flex justify-end mt-4 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenAddField(section.id)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Field
                </button>
              </div>
            </div>
          ))}

          {/* + Add Section Button at bottom right */}
          <div className="flex justify-end pt-2 pb-2">
            <button
              type="button"
              onClick={() => {
                setEditingSectionDef(null);
                setAddSectionDrawerOpen(true);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Section
            </button>
          </div>
        </>
      )}

      {/* ── TAB 2: AVAILABILITY & OPERATING HOURS ─────────────────────────── */}
      {activeTab === "availability" && (
        <div className="space-y-4">
          {/* Operating Hours Card */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">
                  OPERATING HOURS & AVAILABILITY
                </h3>
              </div>
              <button
                type="button"
                onClick={handleApplyMonFriToAll}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Apply Mon-Fri Hours
              </button>
            </div>

            {/* Timezone picker */}
            <div className="mb-4 pb-4 border-b border-slate-100">
              <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider block mb-1.5">
                ORGANIZATION TIMEZONE
              </label>
              <select
                value={scheduleTimezone}
                onChange={(e) => {
                  setScheduleTimezone(e.target.value);
                  handleFieldChange("timezone", e.target.value);
                }}
                className="w-full h-9 px-3 rounded-xl border border-[#E2E8F0] bg-white text-xs text-[#1E293B] font-medium outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="America/Los_Angeles (Pacific Time)">America/Los_Angeles (Pacific Time - UTC-08:00)</option>
                <option value="America/New_York (Eastern Time)">America/New_York (Eastern Time - UTC-05:00)</option>
                <option value="America/Chicago (Central Time)">America/Chicago (Central Time - UTC-06:00)</option>
                <option value="America/Denver (Mountain Time)">America/Denver (Mountain Time - UTC-07:00)</option>
                <option value="Europe/London (GMT)">Europe/London (GMT - UTC+00:00)</option>
                <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST - UTC+05:30)</option>
              </select>
            </div>

            {/* Weekly schedule days */}
            <div className="space-y-2.5">
              {weeklySchedule.map((item, idx) => (
                <div
                  key={item.day}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                    item.open ? "bg-white border-slate-200" : "bg-slate-50/70 border-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3 w-36">
                    <Switch
                      checked={item.open}
                      onCheckedChange={(checked) => {
                        setWeeklySchedule((prev) =>
                          prev.map((d, i) => (i === idx ? { ...d, open: checked } : d))
                        );
                      }}
                    />
                    <span
                      className={`text-xs font-semibold ${
                        item.open ? "text-slate-800" : "text-slate-400 line-through"
                      }`}
                    >
                      {item.day}
                    </span>
                  </div>

                  {item.open ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.start}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWeeklySchedule((prev) =>
                            prev.map((d, i) => (i === idx ? { ...d, start: val } : d))
                          );
                        }}
                        className="w-24 h-8 px-2 text-center text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-xs text-slate-400">to</span>
                      <input
                        type="text"
                        value={item.end}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWeeklySchedule((prev) =>
                            prev.map((d, i) => (i === idx ? { ...d, end: val } : d))
                          );
                        }}
                        className="w-24 h-8 px-2 text-center text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium px-2">Closed all day</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Organization Clinic Locations */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GripVertical className="w-3.5 h-3.5 text-slate-300" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">
                  ORGANIZATION CLINIC LOCATIONS
                </h3>
              </div>
            </div>
            <OrganizationLocationsSection organizationId={formData.id} isEditing={true} />
          </div>
        </div>
      )}

      {/* ── TAB 3: SECURITY & ACCESS SETTINGS ─────────────────────────────── */}
      {activeTab === "security" && (
        <div className="space-y-3">
          {/* Card 1: Robo Call Detection & Shielding */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs transition-all">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
              onClick={() => toggleSecurityRow("robocall")}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <PhoneOff className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Robo Call Detection & Shielding</span>
                    <Tooltip text="Detects telemarketers, robocalls, and spoofed callers automatically before answering.">
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                    </Tooltip>
                  </div>
                  <p className="text-[11px] text-slate-500">Auto-filter malicious & automated inbound calls</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                    roboCallEnabled
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {roboCallEnabled ? "Active" : "Disabled"}
                </span>
                <div onClick={(e) => e.stopPropagation()}>
                  <Switch checked={roboCallEnabled} onCheckedChange={setRoboCallEnabled} />
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    expandedSecurityRow === "robocall" ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>

            {expandedSecurityRow === "robocall" && (
              <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-4 bg-slate-50/30">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Sensitivity Level</div>
                    <div className="text-[11px] text-slate-500">Adjust the aggressiveness of AI spam call interception</div>
                  </div>
                  <select
                    value={shieldingSensitivity}
                    onChange={(e) => setShieldingSensitivity(e.target.value as any)}
                    className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="standard">Standard (Recommended)</option>
                    <option value="strict">Strict (Blocks all unverified caller IDs)</option>
                    <option value="aggressive">Aggressive (Challenge audio captcha)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Auto-Block Known Spam Numbers</div>
                    <div className="text-[11px] text-slate-500">Automatically add recognized spam numbers to the blocklist</div>
                  </div>
                  <Switch checked={autoBlockSpam} onCheckedChange={setAutoBlockSpam} />
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Blocked Numbers */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs transition-all">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
              onClick={() => toggleSecurityRow("blocked")}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Ban className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Blocked Phone Numbers</span>
                    <Tooltip text="Inbound calls and SMS from these numbers are instantly disconnected.">
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                    </Tooltip>
                  </div>
                  <p className="text-[11px] text-slate-500">Manage blacklisted numbers for this organization</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-rose-50 text-rose-700 border border-rose-200/60">
                  {blockedNumbers.length} Blocked
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    expandedSecurityRow === "blocked" ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>

            {expandedSecurityRow === "blocked" && (
              <div className="px-5 pb-5 pt-3 border-t border-slate-100 space-y-3 bg-slate-50/30">
                {/* Add new number row */}
                <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                  <select
                    value={newBlockedNumber.countryCode}
                    onChange={(e) => setNewBlockedNumber({ ...newBlockedNumber, countryCode: e.target.value })}
                    className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    <option value="+1">+1 (US/CA)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+91">+91 (IN)</option>
                    <option value="+61">+61 (AU)</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Phone number..."
                    value={newBlockedNumber.phoneNumber}
                    onChange={(e) => setNewBlockedNumber({ ...newBlockedNumber, phoneNumber: e.target.value })}
                    className="flex-1 h-8 px-2.5 border border-slate-200 rounded-lg text-xs outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Reason (optional)..."
                    value={newBlockedNumber.note}
                    onChange={(e) => setNewBlockedNumber({ ...newBlockedNumber, note: e.target.value })}
                    className="flex-1 h-8 px-2.5 border border-slate-200 rounded-lg text-xs outline-none"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!newBlockedNumber.phoneNumber.trim()) {
                        toast.error("Please enter a phone number");
                        return;
                      }
                      setBlockedNumbers([
                        ...blockedNumbers,
                        {
                          id: String(Date.now()),
                          countryCode: newBlockedNumber.countryCode,
                          phoneNumber: newBlockedNumber.phoneNumber.trim(),
                          note: newBlockedNumber.note.trim() || "Manual block",
                        },
                      ]);
                      setNewBlockedNumber({ countryCode: "+1", phoneNumber: "", note: "" });
                      toast.success("Phone number added to blocklist");
                    }}
                    className="h-8 text-xs font-semibold px-3 bg-rose-600 hover:bg-rose-700 text-white shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Block
                  </Button>
                </div>

                {/* Blocked numbers list */}
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {blockedNumbers.map((bn) => (
                    <div
                      key={bn.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800">
                          {bn.countryCode} {bn.phoneNumber}
                        </span>
                        {bn.note && <span className="text-[11px] text-slate-400">· {bn.note}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setBlockedNumbers(blockedNumbers.filter((n) => n.id !== bn.id));
                          toast.success("Number removed from blocklist");
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Organization 2FA Policy */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs transition-all">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
              onClick={() => toggleSecurityRow("twoFa")}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Two-Factor Authentication (2FA) Policy</span>
                    <Tooltip text="Mandates two-factor authentication for all clinic and organization staff.">
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                    </Tooltip>
                  </div>
                  <p className="text-[11px] text-slate-500">Require multi-factor login for all team members</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                    enforce2FA
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {enforce2FA ? "Enforced" : "Optional"}
                </span>
                <div onClick={(e) => e.stopPropagation()}>
                  <Switch checked={enforce2FA} onCheckedChange={setEnforce2FA} />
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    expandedSecurityRow === "twoFa" ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>

            {expandedSecurityRow === "twoFa" && (
              <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-4 bg-slate-50/30">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-xs font-bold text-slate-800">New Member Grace Period</div>
                    <div className="text-[11px] text-slate-500">Days allowed to configure 2FA before account is locked</div>
                  </div>
                  <select
                    value={twoFaGracePeriod}
                    onChange={(e) => setTwoFaGracePeriod(e.target.value)}
                    className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="Immediately">Immediate (No grace period)</option>
                    <option value="3 days">3 days</option>
                    <option value="7 days">7 days</option>
                    <option value="14 days">14 days</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Session Inactivity Timeout */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs transition-all">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
              onClick={() => toggleSecurityRow("session")}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Session Inactivity Timeout</span>
                    <Tooltip text="Automatically locks the workspace when inactive to protect patient HIPAA data.">
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                    </Tooltip>
                  </div>
                  <p className="text-[11px] text-slate-500">Auto-lock idle sessions across the organization</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-50 text-amber-700 border border-amber-200/60">
                  {sessionTimeout}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    expandedSecurityRow === "session" ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>

            {expandedSecurityRow === "session" && (
              <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-4 bg-slate-50/30">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Idle Duration</div>
                    <div className="text-[11px] text-slate-500">Sign out or lock screen after this period of inactivity</div>
                  </div>
                  <select
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(e.target.value)}
                    className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="15m">15 minutes</option>
                    <option value="30m">30 minutes (Recommended)</option>
                    <option value="1h">1 hour</option>
                    <option value="4h">4 hours</option>
                    <option value="8h">8 hours</option>
                  </select>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Lock Screen on Idle</div>
                    <div className="text-[11px] text-slate-500">Require password entry to resume without losing unsubmitted data</div>
                  </div>
                  <Switch checked={lockOnIdle} onCheckedChange={setLockOnIdle} />
                </div>
              </div>
            )}
          </div>

          {/* Card 5: Password Complexity Policy */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs transition-all">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
              onClick={() => toggleSecurityRow("password")}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Password Complexity Policy</span>
                    <Tooltip text="Sets credential rules when creating or updating team member passwords.">
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                    </Tooltip>
                  </div>
                  <p className="text-[11px] text-slate-500">Enforce strong credentials across all accounts</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-purple-50 text-purple-700 border border-purple-200/60">
                  Min {minPasswordLength} chars
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    expandedSecurityRow === "password" ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>

            {expandedSecurityRow === "password" && (
              <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-4 bg-slate-50/30">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Minimum Password Length</div>
                    <div className="text-[11px] text-slate-500">At least this many characters</div>
                  </div>
                  <select
                    value={minPasswordLength}
                    onChange={(e) => setMinPasswordLength(Number(e.target.value))}
                    className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value={8}>8 characters</option>
                    <option value={10}>10 characters</option>
                    <option value={12}>12 characters (Recommended)</option>
                    <option value={16}>16 characters (High Security)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Require Special Characters</div>
                    <div className="text-[11px] text-slate-500">Must include at least one symbol (!@#$%^&*)</div>
                  </div>
                  <Switch checked={requireSpecialChars} onCheckedChange={setRequireSpecialChars} />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Require Numbers</div>
                    <div className="text-[11px] text-slate-500">Must include at least one numerical digit (0-9)</div>
                  </div>
                  <Switch checked={requireNumbers} onCheckedChange={setRequireNumbers} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Select Fields Modal (Admin linked) ─────────────────────────────── */}
      {fieldModalOpen && (
        <SelectFieldsModal
          onlyModules={["organization"]}
          currentFieldKeys={
            targetSectionIdForField === "sec_basic"
              ? basicCustomFieldKeys
              : targetSectionIdForField === "sec_billing"
              ? billingCustomFieldKeys
              : targetSectionIdForField === "sec_language"
              ? languageCustomFieldKeys
              : allOrgSections.find((s) => s.id === targetSectionIdForField)?.fieldKeys || []
          }
          onOpenCreateModal={() => {
            setFieldModalOpen(false);
            setCreateFieldModalOpen(true);
          }}
          isAdmin={false}
          onClose={() => {
            setFieldModalOpen(false);
            setTargetSectionIdForField(null);
          }}
          onApply={handleApplySelectedFields}
        />
      )}

      {/* ── Create Custom Field Modal (Admin linked) ───────────────────────── */}
      {createFieldModalOpen && (
        <CreateFieldModal
          lockModule="organization"
          isAdmin={false}
          onClose={() => setCreateFieldModalOpen(false)}
          onCreated={(newField) => {
            if (targetSectionIdForField) {
              handleApplySelectedFields([newField.key]);
            }
          }}
        />
      )}

      {/* ── Add/Edit Section Drawer (Admin linked) ─────────────────────────── */}
      {addSectionDrawerOpen && (
        <AdminSectionDrawer
          section={editingSectionDef}
          initialModule="organization"
          isAdmin={false}
          zIndex={10001}
          onClose={() => {
            setAddSectionDrawerOpen(false);
            setEditingSectionDef(null);
          }}
          onSaved={(savedSection) => {
            setAddSectionDrawerOpen(false);
            setEditingSectionDef(null);
            toast.success(`Section "${savedSection.title}" saved`);
          }}
        />
      )}

      {/* ── Edit Custom Field Drawer (Admin linked) ────────────────────────── */}
      {editingFieldDef && (
        <AdminFieldDrawer
          field={editingFieldDef}
          initialModule="organization"
          lockModule={true}
          isAdmin={false}
          onClose={() => setEditingFieldDef(null)}
          onSaved={(savedField) => {
            setEditingFieldDef(null);
            toast.success(`Field "${savedField.label}" updated`);
          }}
        />
      )}
    </>
  );
}
