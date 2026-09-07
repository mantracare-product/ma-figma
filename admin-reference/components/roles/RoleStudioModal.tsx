"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ShieldCheck,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  Search,
  Users,
  Workflow,
  PhoneCall,
  MessageSquare,
  BookOpen,
  Settings,
  Sliders,
  CheckSquare,
  Calendar,
  Tag,
  Building2,
  Users2,
  CreditCard,
  Bot,
  Phone,
  SlidersHorizontal,
  Share2,
  FileText,
} from "lucide-react";
import { Pill } from "@/components/ui/Pill";
import { useIndustryTemplateStore } from "@/lib/industry-template-store";

export type PermissionScope = "deny" | "own" | "department" | "all" | "allow";

export interface ProcessItemDef {
  id: string;
  name: string;
  description?: string;
}

export const STANDARD_MODULES = [
  { id: "clients", label: "Clients", icon: Users },
  { id: "processes", label: "Processes", icon: Workflow },
  { id: "calls", label: "Calls", icon: PhoneCall },
  { id: "chats", label: "Chats", icon: MessageSquare },
  { id: "knowledge_base", label: "Knowledge Base", icon: BookOpen },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export const EXTRA_MODULES = [
  { id: "process_settings", label: "Process Settings", icon: Sliders },
  { id: "web_forms", label: "Web Forms", icon: CheckSquare },
  { id: "appointments", label: "Appointments", icon: Calendar },
  { id: "products_services", label: "Product/Services", icon: Tag },
] as const;

export const SETTINGS_SUB_PAGES = [
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "team", label: "Team", icon: Users2 },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "ai_voices_models", label: "AI Voices / Models", icon: Bot },
  { id: "numbers", label: "Numbers", icon: Phone },
  { id: "custom_fields", label: "Custom Fields", icon: SlidersHorizontal },
  { id: "integrations", label: "Integrations", icon: Share2 },
  { id: "audit_logs", label: "Audit Logs", icon: FileText },
  { id: "security", label: "Security", icon: ShieldCheck },
] as const;

export interface ActionItem {
  id: string;
  label: string;
}

export const FULL_ACTIONS: ActionItem[] = [
  { id: "read", label: "Read" },
  { id: "add", label: "Add" },
  { id: "edit", label: "Edit" },
  { id: "delete", label: "Delete" },
  { id: "export", label: "Export" },
  { id: "import", label: "Import" },
];

export const FOUR_ACTIONS: ActionItem[] = [
  { id: "read", label: "Read" },
  { id: "add", label: "Add" },
  { id: "edit", label: "Edit" },
  { id: "delete", label: "Delete" },
];

export const SETTINGS_ACTIONS: ActionItem[] = [
  { id: "read", label: "Read" },
  { id: "edit", label: "Edit" },
];

// Custom High-Quality Glassmorphic Select Component
interface CustomFormSelectProps {
  label: string;
  value: string;
  options: { id: string | number; name: string }[];
  placeholder: string;
  disabled?: boolean;
  onChange: (val: string) => void;
}

const CustomFormSelect: React.FC<CustomFormSelectProps> = ({
  label,
  value,
  options,
  placeholder,
  disabled = false,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchFilter.trim()) return options;
    return options.filter((opt) =>
      opt.name.toLowerCase().includes(searchFilter.toLowerCase())
    );
  }, [options, searchFilter]);

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`w-full px-3 py-2 text-xs rounded-2xl border flex items-center justify-between font-sans transition-all shadow-2xs text-left ${
          disabled
            ? "bg-slate-100/70 border-slate-200/60 text-slate-400 cursor-not-allowed"
            : isOpen
            ? "bg-white border-[#1456f0] ring-2 ring-[#1456f0]/20 text-[#222222]"
            : "bg-white border-slate-200/90 hover:border-slate-300 text-[#222222] cursor-pointer"
        }`}
      >
        <span
          className={`truncate ${
            !value ? "text-slate-400 font-normal" : "font-medium text-[#222222]"
          }`}
        >
          {value || placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ml-1.5 ${
            isOpen ? "rotate-180 text-[#1456f0]" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/90 shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-100 max-h-64 flex flex-col">
          {options.length > 5 && (
            <div className="px-1.5 pb-1 pt-0.5">
              <div className="relative">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder={`Search ${label.toLowerCase()}...`}
                  className="w-full pl-7 pr-2 py-1 text-xs bg-slate-50/90 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-[#1456f0] text-[#222222]"
                  autoFocus
                />
              </div>
            </div>
          )}

          <div className="overflow-y-auto space-y-0.5 max-h-48 pr-0.5">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400 text-center">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.name === value;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.name);
                      setIsOpen(false);
                      setSearchFilter("");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-sans transition-all text-left cursor-pointer ${
                      isSelected
                        ? "bg-[#1456f0]/10 text-[#1456f0] font-bold"
                        : "text-[#45515e] hover:bg-slate-50 hover:text-[#222222] font-medium"
                    }`}
                  >
                    <span className="truncate">{opt.name}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#1456f0] shrink-0 ml-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface RoleStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleToEdit?: {
    id: string;
    roleName: string;
    categoryName: string;
    industryName: string;
  } | null;
  onSave: (role: {
    id?: string;
    roleName: string;
    categoryName: string;
    industryName: string;
    permissions: Record<string, Record<string, PermissionScope>>;
  }) => void;
}

export const RoleStudioModal: React.FC<RoleStudioModalProps> = ({
  isOpen,
  onClose,
  roleToEdit,
  onSave,
}) => {
  const { categories, bundles, getIndustriesByCategory } = useIndustryTemplateStore();

  // 1. General Settings State
  const [roleName, setRoleName] = useState(roleToEdit?.roleName || "");
  const [selectedCategory, setSelectedCategory] = useState(
    roleToEdit?.categoryName || ""
  );
  const [selectedIndustry, setSelectedIndustry] = useState(
    roleToEdit?.industryName || ""
  );

  useEffect(() => {
    if (roleToEdit) {
      setRoleName(roleToEdit.roleName || "");
      setSelectedCategory(roleToEdit.categoryName || "");
      setSelectedIndustry(roleToEdit.industryName || "");
    } else {
      setRoleName("");
      setSelectedCategory("");
      setSelectedIndustry("");
    }
  }, [roleToEdit, isOpen]);

  // Dynamic industry list based on selected category
  const availableIndustries = useMemo(() => {
    if (!selectedCategory) return [];
    return getIndustriesByCategory(selectedCategory);
  }, [selectedCategory, getIndustriesByCategory]);

  // Handle category change
  const handleCategoryChange = (newCat: string) => {
    setSelectedCategory(newCat);
    setSelectedIndustry("");
  };

  // 2. Navigation & Module State
  const [activeModule, setActiveModule] = useState<string>("clients");
  const [activeSettingsSubPage, setActiveSettingsSubPage] = useState<string>("organization");
  const [showMoreModules, setShowMoreModules] = useState(false);

  // Active open dropdown tracker: `${moduleId}__${actionId}`
  const [activeDropdownKey, setActiveDropdownKey] = useState<string | null>(null);

  // Determine actions to display for the active module
  const currentActions = useMemo(() => {
    if (activeModule === "settings") {
      return SETTINGS_ACTIONS;
    }
    if (["chats", "calls", "web_forms", "appointments"].includes(activeModule)) {
      return FOUR_ACTIONS;
    }
    return FULL_ACTIONS;
  }, [activeModule]);

  // Permissions state: key = `${moduleId}__${actionId}` -> PermissionScope
  const [permissionScopes, setPermissionScopes] = useState<Record<string, PermissionScope>>(() => {
    const initial: Record<string, PermissionScope> = {};

    // Standard & extra modules
    [...STANDARD_MODULES, ...EXTRA_MODULES].forEach((mod) => {
      FULL_ACTIONS.forEach((act) => {
        const key = `${mod.id}__${act.id}`;
        if (act.id === "read" || act.id === "add" || act.id === "edit") {
          initial[key] = "all";
        } else if (act.id === "delete") {
          initial[key] = "own";
        } else {
          initial[key] = "department";
        }
      });
    });

    // Settings sub-pages
    SETTINGS_SUB_PAGES.forEach((sub) => {
      SETTINGS_ACTIONS.forEach((act) => {
        const key = `settings_${sub.id}__${act.id}`;
        initial[key] = "allow";
      });
    });

    return initial;
  });

  // Dynamic process templates for the selected category & industry
  const availableProcessTemplates = useMemo<ProcessItemDef[]>(() => {
    if (!selectedIndustry || !selectedCategory) return [];

    const matchingBundles = bundles.filter((b) => {
      const indName = b.industryName?.trim().toLowerCase();
      const targetInd = selectedIndustry.trim().toLowerCase();
      return indName === targetInd;
    });

    const processes: ProcessItemDef[] = [];

    matchingBundles.forEach((b) => {
      if (b.processTemplate && b.processTemplate.name) {
        processes.push({
          id: b.processTemplate.id || b.id || `proc-${b.slug}`,
          name: b.processTemplate.name,
        });
      }
    });

    return processes;
  }, [bundles, selectedIndustry, selectedCategory]);

  // Collapsed states for processes
  const [collapsedProcesses, setCollapsedProcesses] = useState<Record<string, boolean>>({});

  const toggleProcessCollapse = (procId: string) => {
    setCollapsedProcesses((prev) => ({
      ...prev,
      [procId]: !prev[procId],
    }));
  };

  const getScope = (moduleId: string, actionId: string): PermissionScope => {
    const key = `${moduleId}__${actionId}`;
    return permissionScopes[key] || "deny";
  };

  const setScope = (moduleId: string, actionId: string, scope: PermissionScope) => {
    const key = `${moduleId}__${actionId}`;
    setPermissionScopes((prev) => ({
      ...prev,
      [key]: scope,
    }));
    setActiveDropdownKey(null);
  };

  // Save changes
  const handleSaveAll = () => {
    if (!roleName.trim()) {
      alert("Please enter a Role Name.");
      return;
    }
    if (!selectedCategory) {
      alert("Please select an Industry Category.");
      return;
    }
    if (!selectedIndustry) {
      alert("Please select an Industry.");
      return;
    }

    onSave({
      id: roleToEdit?.id,
      roleName: roleName.trim(),
      categoryName: selectedCategory,
      industryName: selectedIndustry,
      permissions: {},
    });

    onClose();
  };

  // Render Inline Scope Dropdown
  const renderInlineScopeDropdown = (
    moduleId: string,
    actionId: string,
    isBinary = false
  ) => {
    const key = `${moduleId}__${actionId}`;
    const currentScope = getScope(moduleId, actionId);
    const isOpen = activeDropdownKey === key;

    const getScopeLabel = (scope: PermissionScope) => {
      switch (scope) {
        case "deny":
          return "Deny";
        case "own":
          return "Own Only";
        case "department":
          return "Department";
        case "all":
          return "All";
        case "allow":
          return "Allow";
        default:
          return "Deny";
      }
    };

    return (
      <div className="relative inline-block text-left w-32 sm:w-36">
        {/* Capsule Trigger Button */}
        <button
          type="button"
          onClick={() => setActiveDropdownKey(isOpen ? null : key)}
          className={`w-full py-1.5 px-3 rounded-full border bg-white text-xs font-semibold font-sans flex items-center justify-between transition-all cursor-pointer shadow-2xs ${
            isOpen
              ? "border-[#1456f0] ring-2 ring-[#1456f0]/20 text-[#222222]"
              : "border-slate-200/90 hover:border-slate-300 text-[#45515e] hover:bg-slate-50/60"
          }`}
        >
          <span className="truncate">{getScopeLabel(currentScope)}</span>
          {isOpen ? (
            <ChevronUp className="w-3.5 h-3.5 text-[#1456f0] shrink-0 ml-1" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          )}
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setActiveDropdownKey(null)}
            />
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-0.5 min-w-[124px]">
              {isBinary ? (
                <>
                  {/* Deny */}
                  <button
                    type="button"
                    onClick={() => setScope(moduleId, actionId, "deny")}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-sans transition-all cursor-pointer ${
                      currentScope === "deny"
                        ? "bg-[#1456f0]/10 text-[#1456f0] font-bold"
                        : "text-[#45515e] hover:bg-slate-50 font-medium"
                    }`}
                  >
                    <span>Deny</span>
                    {currentScope === "deny" && (
                      <Check className="w-3.5 h-3.5 text-[#1456f0]" />
                    )}
                  </button>

                  {/* Allow */}
                  <button
                    type="button"
                    onClick={() => setScope(moduleId, actionId, "allow")}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-sans transition-all cursor-pointer ${
                      currentScope === "allow" || currentScope === "all"
                        ? "bg-[#1456f0]/10 text-[#1456f0] font-bold"
                        : "text-[#45515e] hover:bg-slate-50 font-medium"
                    }`}
                  >
                    <span>Allow</span>
                    {(currentScope === "allow" || currentScope === "all") && (
                      <Check className="w-3.5 h-3.5 text-[#1456f0]" />
                    )}
                  </button>
                </>
              ) : (
                <>
                  {/* Deny */}
                  <button
                    type="button"
                    onClick={() => setScope(moduleId, actionId, "deny")}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-sans transition-all cursor-pointer ${
                      currentScope === "deny"
                        ? "bg-[#1456f0]/10 text-[#1456f0] font-bold"
                        : "text-[#45515e] hover:bg-slate-50 font-medium"
                    }`}
                  >
                    <span>Deny</span>
                    {currentScope === "deny" && (
                      <Check className="w-3.5 h-3.5 text-[#1456f0]" />
                    )}
                  </button>

                  {/* Own Only */}
                  <button
                    type="button"
                    onClick={() => setScope(moduleId, actionId, "own")}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-sans transition-all cursor-pointer ${
                      currentScope === "own"
                        ? "bg-[#1456f0]/10 text-[#1456f0] font-bold"
                        : "text-[#45515e] hover:bg-slate-50 font-medium"
                    }`}
                  >
                    <span>Own Only</span>
                    {currentScope === "own" && (
                      <Check className="w-3.5 h-3.5 text-[#1456f0]" />
                    )}
                  </button>

                  {/* Department */}
                  <button
                    type="button"
                    onClick={() => setScope(moduleId, actionId, "department")}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-sans transition-all cursor-pointer ${
                      currentScope === "department"
                        ? "bg-[#1456f0]/10 text-[#1456f0] font-bold"
                        : "text-[#45515e] hover:bg-slate-50 font-medium"
                    }`}
                  >
                    <span>Department</span>
                    {currentScope === "department" && (
                      <Check className="w-3.5 h-3.5 text-[#1456f0]" />
                    )}
                  </button>

                  {/* All */}
                  <button
                    type="button"
                    onClick={() => setScope(moduleId, actionId, "all")}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-sans transition-all cursor-pointer ${
                      currentScope === "all"
                        ? "bg-[#1456f0]/10 text-[#1456f0] font-bold"
                        : "text-[#45515e] hover:bg-slate-50 font-medium"
                    }`}
                  >
                    <span>All</span>
                    {currentScope === "all" && (
                      <Check className="w-3.5 h-3.5 text-[#1456f0]" />
                    )}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Frosted Glass Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Side Drawer Container */}
      <div className="relative w-full max-w-2xl lg:max-w-3xl xl:max-w-[800px] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300 font-sans">
        {/* 1. TOP HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-sm font-bold font-display text-[#222222] tracking-tight">
              {roleToEdit ? `Edit Role: ${roleName}` : "Create New Role"}
            </h2>
            <p className="text-[11px] text-slate-500 font-sans">
              Configure module access and permission scopes
            </p>
          </div>

          {/* Close Red Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-xs transition-transform hover:scale-105 cursor-pointer"
            title="Close"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* 2. GENERAL SETTINGS BAR (Custom Glassmorphic Dropdowns) */}
        <div className="px-6 py-3.5 bg-[#fafafa] border-b border-slate-200/80 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Role Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans">
                Role Name *
              </label>
              <input
                type="text"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="e.g. Clinic Coordinator"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200/90 rounded-2xl outline-none focus:ring-2 focus:ring-[#1456f0]/30 font-semibold text-[#222222] shadow-2xs placeholder:text-slate-400 placeholder:font-normal"
              />
            </div>

            {/* Industry Category (Custom Dropdown) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans">
                Category
              </label>
              <CustomFormSelect
                label="Category"
                value={selectedCategory}
                options={categories}
                placeholder="Select Category..."
                onChange={handleCategoryChange}
              />
            </div>

            {/* Industry (Custom Dropdown) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans">
                Industry
              </label>
              <CustomFormSelect
                label="Industry"
                value={selectedIndustry}
                disabled={!selectedCategory}
                options={availableIndustries}
                placeholder={!selectedCategory ? "Select Category first..." : "Select Industry..."}
                onChange={(val) => setSelectedIndustry(val)}
              />
            </div>
          </div>
        </div>

        {/* 3. MAIN BODY (Sidebar Navigation + Sub-pages + Table) */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-[#fafafa]/50">
          {/* LEFT SIDEBAR 1: MODULES NAVIGATION (Matching Main Sidebar Design) */}
          <div className="w-full md:w-48 bg-[#fafafa] border-r border-slate-200/80 p-3 space-y-2 overflow-y-auto shrink-0 custom-scrollbar">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8e8e93] font-sans">
              MODULES
            </div>

            <div className="space-y-1">
              {STANDARD_MODULES.map((mod) => {
                const Icon = mod.icon;
                const isActive = activeModule === mod.id;

                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setActiveModule(mod.id)}
                    className={`
                      group w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs
                      transition-all duration-150 text-left cursor-pointer
                      ${
                        isActive
                          ? "bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white shadow-sm shadow-slate-900/10 font-semibold"
                          : "text-[#45515e] hover:text-[#181e25] hover:bg-white/80 font-medium"
                      }
                    `}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                          isActive
                            ? "text-white"
                            : "text-slate-400 group-hover:text-[#1456f0]"
                        }`}
                      />
                      <span className="truncate">{mod.label}</span>
                    </div>
                  </button>
                );
              })}

              {/* Show More / Show Less Accordion Toggle */}
              <button
                type="button"
                onClick={() => setShowMoreModules(!showMoreModules)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:text-[#181e25] rounded-xl hover:bg-slate-200/50 transition-colors"
              >
                <span>{showMoreModules ? "Show less" : "Show more"}</span>
                {showMoreModules ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {/* Extra Modules */}
              {showMoreModules &&
                EXTRA_MODULES.map((mod) => {
                  const Icon = mod.icon;
                  const isActive = activeModule === mod.id;

                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => setActiveModule(mod.id)}
                      className={`
                        group w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs
                        transition-all duration-150 text-left cursor-pointer
                        ${
                          isActive
                            ? "bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white shadow-sm shadow-slate-900/10 font-semibold"
                            : "text-[#45515e] hover:text-[#181e25] hover:bg-white/80 font-medium"
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                            isActive
                              ? "text-white"
                              : "text-slate-400 group-hover:text-[#1456f0]"
                          }`}
                        />
                        <span className="truncate">{mod.label}</span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* LEFT SIDEBAR 2: SETTINGS SUB-PAGES (Matching Main Sidebar Design) */}
          {activeModule === "settings" && (
            <div className="w-full md:w-48 bg-[#fafafa]/90 border-r border-slate-200/80 p-3 space-y-2 overflow-y-auto shrink-0 animate-in fade-in slide-in-from-left-2 duration-150 custom-scrollbar">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8e8e93] font-sans">
                SETTINGS SUB-PAGES
              </div>

              <div className="space-y-1">
                {SETTINGS_SUB_PAGES.map((sub) => {
                  const Icon = sub.icon;
                  const isActive = activeSettingsSubPage === sub.id;

                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setActiveSettingsSubPage(sub.id)}
                      className={`
                        group w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs
                        transition-all duration-150 text-left cursor-pointer
                        ${
                          isActive
                            ? "bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white shadow-sm shadow-slate-900/10 font-semibold"
                            : "text-[#45515e] hover:text-[#181e25] hover:bg-white/80 font-medium"
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                            isActive
                              ? "text-white"
                              : "text-slate-400 group-hover:text-[#1456f0]"
                          }`}
                        />
                        <span className="truncate">{sub.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* RIGHT CONTENT PANEL */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {/* CASE A: PROCESSES OR PROCESS SETTINGS */}
            {activeModule === "processes" || activeModule === "process_settings" ? (
              <div className="space-y-3">
                <div className="pb-0.5">
                  <h3 className="font-bold font-display text-xs uppercase tracking-wider text-[#222222]">
                    Process Templates for {selectedIndustry || "Selected Industry"}
                  </h3>
                </div>

                {availableProcessTemplates.length === 0 ? (
                  <div className="p-6 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-1.5">
                    <p className="text-xs font-bold text-[#222222]">
                      No process templates found for {selectedIndustry || selectedCategory || "this industry"}.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Create templates for this industry in <strong>Industry Templates</strong>.
                    </p>
                  </div>
                ) : (
                  availableProcessTemplates.map((proc) => {
                    const isCollapsed = collapsedProcesses[proc.id] ?? false;

                    return (
                      <div
                        key={proc.id}
                        className="rounded-3xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden"
                      >
                        {/* Accordion Header */}
                        <div
                          onClick={() => toggleProcessCollapse(proc.id)}
                          className="bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white px-5 py-3 flex items-center justify-between cursor-pointer select-none"
                        >
                          <span className="font-bold font-display text-xs tracking-wide truncate">
                            {proc.name.startsWith("Process:") ? proc.name : `Process: ${proc.name}`}
                          </span>

                          <span className="text-[10px] text-slate-300 hover:text-white flex items-center gap-1 shrink-0 ml-2">
                            {isCollapsed ? "Expand" : "Collapse"}
                            {isCollapsed ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronUp className="w-3.5 h-3.5" />
                            )}
                          </span>
                        </div>

                        {/* Process Table Content */}
                        {!isCollapsed && (
                          <div className="overflow-x-visible">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-sans">
                                  <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider w-[55%]">
                                    ACTION
                                  </th>
                                  <th className="px-5 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider w-[45%]">
                                    PERMISSION SCOPE
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs">
                                {FULL_ACTIONS.map((act) => (
                                  <tr key={act.id} className="hover:bg-blue-50/20 transition-colors">
                                    <td className="px-5 py-2.5 align-middle text-[#222222] font-semibold">
                                      {act.label}
                                    </td>
                                    <td className="px-5 py-2.5 align-middle text-right">
                                      <div className="flex justify-end">
                                        {renderInlineScopeDropdown(proc.id, act.id, false)}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : activeModule === "settings" ? (
              /* CASE B: SETTINGS SUB-PAGES MATRIX */
              <div className="space-y-3">
                <div className="rounded-3xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
                  <div className="overflow-x-visible">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white font-display">
                          <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider w-[55%]">
                            {SETTINGS_SUB_PAGES.find((s) => s.id === activeSettingsSubPage)?.label.toUpperCase() || "SETTINGS"} &mdash; ACTION
                          </th>
                          <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider w-[45%]">
                            PERMISSION SCOPE
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {SETTINGS_ACTIONS.map((act) => {
                          const subPageKey = `settings_${activeSettingsSubPage}`;

                          return (
                            <tr key={act.id} className="hover:bg-blue-50/20 transition-colors">
                              <td className="px-5 py-2.5 align-middle text-[#222222] font-semibold">
                                {act.label}
                              </td>
                              <td className="px-5 py-2.5 align-middle text-right">
                                <div className="flex justify-end">
                                  {renderInlineScopeDropdown(subPageKey, act.id, true)}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* CASE C: STANDARD MODULE MATRIX */
              <div className="space-y-3">
                <div className="rounded-3xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
                  <div className="overflow-x-visible">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gradient-to-r from-[#181e25] to-[#2c3e50] text-white font-display">
                          <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider w-[55%]">
                            {activeModule.toUpperCase().replace("_", " ")} &mdash; ACTION
                          </th>
                          <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider w-[45%]">
                            PERMISSION SCOPE
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {currentActions.map((act) => (
                          <tr key={act.id} className="hover:bg-blue-50/20 transition-colors">
                            <td className="px-5 py-2.5 align-middle text-[#222222] font-semibold">
                              {act.label}
                            </td>
                            <td className="px-5 py-2.5 align-middle text-right">
                              <div className="flex justify-end">
                                {renderInlineScopeDropdown(activeModule, act.id, false)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. FOOTER ACTIONS */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200/80 flex items-center justify-between shrink-0 shadow-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-slate-100/90 text-slate-600 font-semibold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <Pill
            variant="navy"
            size="md"
            icon={<Check className="w-3.5 h-3.5 text-emerald-400" />}
            onClick={handleSaveAll}
          >
            Save Role Permissions
          </Pill>
        </div>
      </div>
    </div>
  );
};
