import React, { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Tooltip } from "../ui/Tooltip";
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
        className="fixed inset-y-0 right-0 z-50 w-full max-w-[700px] bg-[#fafafa] shadow-2xl flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-300"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {/* Drawer Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1E293B] to-[#334155] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              {formData.flag ? formData.flag : <Building2 className="w-5 h-5" />}
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

        {/* Drawer Body (Scrollable Sections) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F8FAFC]">
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#1456f0] bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/80 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Field
              </button>
            </div>
          </div>

          {/* SECTION 2: ORGANIZATION LOCATIONS (Appointment module dependency) */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GripVertical className="w-3.5 h-3.5 text-slate-300" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1E293B]">
                  ORGANIZATION LOCATIONS
                </h3>
              </div>
            </div>
            <div>
              <OrganizationLocationsSection organizationId={formData.id} isEditing={true} />
            </div>
          </div>

          {/* SECTION 3: BILLING INFO */}
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

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">CITY</label>
                    <Input
                      placeholder="San Francisco"
                      defaultValue="San Francisco"
                      className="w-full text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">STATE</label>
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#1456f0] bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/80 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95"
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#1456f0] bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/80 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95"
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
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-[#1456f0] bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-200 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add Section
            </button>
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
