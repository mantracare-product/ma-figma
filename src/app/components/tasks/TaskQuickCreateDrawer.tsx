import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  CheckSquare,
  Star,
  Clock,
  Repeat,
  Paperclip,
  Plus,
  Trash2,
  X,
  FileText,
  User,
  Users,
  Eye,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  Shield,
  Globe,
  Calendar,
  FileCode,
  Link as LinkIcon,
  Image as ImageIcon,
  Video as VideoIcon,
  Upload,
  AlertCircle,
  Sparkles,
  Info,
  Download,
  Search,
} from "lucide-react";
import DrawerShell from "../ui/DrawerShell";
import { CircularProgressRing } from "../ui/CircularProgressRing";
import { InfoTooltip } from "../help/InfoTooltip";
import { Tooltip } from "../ui/Tooltip";
import {
  TaskEntity,
  TaskScopeLevel,
  TaskStatus,
  TaskChecklist,
  TaskChecklistItem,
  TaskObserver,
  TaskRecurrenceConfig,
  TaskTimePlanningConfig,
  TaskFileAttachment,
  TaskAssigneeScope,
  TaskStudioItem,
  TaskStudioItemResource,
  TaskStudioResourceType,
  TaskResponsiblePerson,
} from "../../../types/task";
import { useProcessStore, DEFAULT_TASK_PROCESSES, Stage } from "../../../lib/useProcessStore";
import { useTeamMembers } from "../../../lib/teamStore";
import { initialClients } from "../../../data/canonicalClients";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import { AdminControlAccordion } from "../../pages/admin/components/AdminControlAccordion";
import type { ScopingRule } from "../../context/FieldRegistryContext";

export interface TaskQuickCreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTask: (taskData: Omit<TaskEntity, "id" | "code" | "createdAt" | "updatedAt">) => void;
  onCreateMultipleTasks?: (tasksData: Array<Omit<TaskEntity, "id" | "code" | "createdAt" | "updatedAt">>) => TaskEntity[] | void;
  onUpdateTask?: (id: string, patch: Partial<TaskEntity>) => void;
  taskToEdit?: TaskEntity | null;
  isAdmin?: boolean;
  taskStages?: Stage[];
  defaultWorkflowName?: string;
  defaultWorkflowId?: string;
}

const CONTACT_CATEGORIES = ["All Categories", "Client", "Lead", "Supplier", "Vendor"];

export const CATEGORY_ROLES_CATALOG: Record<string, string[]> = {
  Healthcare: [
    "Lead Physician",
    "Clinical Director",
    "Clinical Intake Coordinator",
    "Care Coordinator",
    "Practice Billing Specialist",
    "Chief Medical Officer",
    "Cardiologist",
    "General Practitioner",
    "Staff Nurse",
    "Practice Manager",
  ],
  Automobile: [
    "Dealership Service Advisor",
    "Fleet Maintenance Lead",
    "Master Technician",
    "Parts Specialist",
    "EV Diagnostic Specialist",
    "Service Center Manager",
  ],
  "Coaching & Advisory": [
    "Executive Practice Advisory Lead",
    "Executive Leadership Coach",
    "Career Advisory Specialist",
    "Client Advisory Manager",
    "Life & Wellness Coach",
  ],
  "Household Care": [
    "Field Service Dispatcher",
    "HVAC Service Lead",
    "Master Electrician",
    "Operations Dispatcher",
    "Service Route Coordinator",
  ],
  "IT/Tech": [
    "IT Technical Support Agent",
    "Cloud Solutions Architect",
    "Cybersecurity Analyst",
    "DevOps Specialist",
    "Data Infrastructure Lead",
    "Systems Administrator",
  ],
  "Real Estate": [
    "Property Leasing Manager",
    "Commercial Broker Associate",
    "Property Operations Lead",
    "Tenant Relations Coordinator",
    "HOA Community Manager",
  ],
  "Wellness & Lifestyle": [
    "Wellness Director",
    "Physical Therapist",
    "Nutritionist",
    "Clinic Coordinator",
    "Mindfulness & Yoga Coach",
  ],
};

// Size limit for uploads stored in localStorage (1 MB)
const MAX_UPLOAD_BYTES = 1024 * 1024; // 1 MB

interface SearchablePickerOption {
  id: string;
  name: string;
  subtitle?: string;
  avatar?: string;
  badge?: string;
}

interface SearchableMultiSelectPickerProps {
  label: string;
  placeholder?: string;
  searchPlaceholder?: string;
  options: SearchablePickerOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  autoRoleText?: string | null;
}

function SearchableMultiSelectPicker({
  label,
  placeholder = "+ Click to select...",
  searchPlaceholder = "Search...",
  options,
  selectedIds,
  onChange,
  autoRoleText,
}: SearchableMultiSelectPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q) ||
        (opt.subtitle && opt.subtitle.toLowerCase().includes(q))
    );
  }, [options, search]);

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredOptions.map((o) => o.id);
    const combined = Array.from(new Set([...selectedIds, ...filteredIds]));
    onChange(combined);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-1.5" ref={dropdownRef}>
      <label className="text-[13px] font-medium text-slate-700 block">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-800 flex items-center justify-between transition-colors cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          <span className={selectedIds.length > 0 ? "text-slate-900 font-medium" : "text-slate-400 font-normal truncate"}>
            {selectedIds.length > 0
              ? `${selectedIds.length} selected`
              : autoRoleText || placeholder}
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-2 space-y-2 animate-in fade-in zoom-in-95 duration-100">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full text-xs pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between text-[11px] px-1 text-slate-500 pt-0.5 border-b border-slate-100 pb-1.5">
              <span>{filteredOptions.length} available</span>
              <div className="flex items-center gap-2 font-semibold">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-blue-600 hover:underline cursor-pointer"
                >
                  Select all
                </button>
                <span>&bull;</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-slate-500 hover:text-rose-600 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-52 overflow-y-auto space-y-0.5 pr-0.5">
              {filteredOptions.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400 italic">
                  No matching results found
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isChecked = selectedIds.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleToggle(opt.id)}
                      className={`flex items-center gap-2.5 p-2 rounded-md text-xs cursor-pointer transition-colors ${
                        isChecked ? "bg-blue-50/40 text-blue-900 font-medium" : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isChecked
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="min-w-0 flex-1 truncate">
                        <span className="truncate">{opt.name}</span>
                        {opt.subtitle && (
                          <span className="text-[11px] text-slate-400 font-normal ml-1.5">
                            ({opt.subtitle})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface StudioDraftItem {
  id: string;
  title: string;
  description: string;
  isImportant: boolean;
  resourceType: "none" | TaskStudioResourceType;
  resourceSource: "upload" | "url";
  resourceValue: string;
  resourceName: string;
  resourceSize: string;
  isExpanded?: boolean;
}

interface StudioItemCardProps {
  item: StudioDraftItem;
  index: number;
  totalItems: number;
  onUpdate: (id: string, patch: Partial<StudioDraftItem>) => void;
  onMove: (index: number, direction: "up" | "down") => void;
  onDelete: (id: string) => void;
  onFileUpload: (id: string, file: File) => void;
}

function StudioItemCard({
  item,
  index,
  totalItems,
  onUpdate,
  onMove,
  onDelete,
  onFileUpload,
}: StudioItemCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-3 transition-all hover:border-slate-300">
      {/* Item Header & Controls */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center font-mono text-[11px] font-bold text-slate-700 shrink-0">
            {index + 1}
          </span>
          <input
            type="text"
            placeholder="Deliverable title (required)..."
            value={item.title}
            onChange={(e) => onUpdate(item.id, { title: e.target.value })}
            className="text-xs font-bold text-slate-900 w-full p-1.5 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-slate-50 rounded transition-all focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Important Star */}
          <button
            type="button"
            onClick={() => onUpdate(item.id, { isImportant: !item.isImportant })}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              item.isImportant
                ? "bg-amber-50 text-amber-500 border-amber-200"
                : "bg-white text-slate-300 hover:text-amber-500 border-slate-200"
            }`}
            title={item.isImportant ? "Important" : "Mark as important"}
          >
            <Star className={`w-3.5 h-3.5 ${item.isImportant ? "fill-amber-500" : ""}`} />
          </button>

          {/* Reorder Up */}
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(index, "up")}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title="Move Up"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>

          {/* Reorder Down */}
          <button
            type="button"
            disabled={index === totalItems - 1}
            onClick={() => onMove(index, "down")}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title="Move Down"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
            title="Delete Item"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Item Description (Optional) */}
      <input
        type="text"
        placeholder="Short description or instructions (optional)..."
        value={item.description}
        onChange={(e) => onUpdate(item.id, { description: e.target.value })}
        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
      />

      {/* Resource Selector Bar */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
          Resource:
        </span>
        {(["none", "file", "image", "video", "url", "html"] as const).map((rType) => (
          <button
            key={rType}
            type="button"
            onClick={() => {
              onUpdate(item.id, {
                resourceType: rType,
                resourceValue: rType === item.resourceType ? item.resourceValue : "",
                resourceSource: rType === "url" ? "url" : "upload",
              });
            }}
            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
              item.resourceType === rType
                ? "bg-[#1E293B] text-white border-[#1E293B] shadow-2xs"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            {rType === "none"
              ? "None"
              : rType === "html"
              ? "HTML Block"
              : rType.charAt(0).toUpperCase() + rType.slice(1)}
          </button>
        ))}
      </div>

      {/* Resource Input & Preview Area */}
      {item.resourceType !== "none" && (
        <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/90 space-y-2.5 animate-in fade-in duration-100">
          {item.resourceType === "html" ? (
            /* HTML Block Code Editor */
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <FileCode className="w-3.5 h-3.5" />
                <span>Monospace HTML / CSS Block (Sandboxed)</span>
              </label>
              <textarea
                rows={4}
                placeholder="<div style='padding: 12px;'>Custom HTML/CSS block...</div>"
                value={item.resourceValue}
                onChange={(e) => onUpdate(item.id, { resourceValue: e.target.value })}
                className="w-full text-xs font-mono p-2.5 bg-slate-900 text-emerald-400 border border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed"
              />
            </div>
          ) : (
            /* File, Image, Video, URL: Unified Upload Div with Direct Upload vs Online URL Toggle */
            <div className="space-y-2.5">
              {/* Segmented Toggle: Direct Upload vs Online URL */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 border border-slate-200 rounded-lg w-fit text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => onUpdate(item.id, { resourceSource: "upload" })}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    item.resourceSource === "upload" || !item.resourceSource
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Direct Upload (max 1MB)
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate(item.id, { resourceSource: "url" })}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    item.resourceSource === "url"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Online URL
                </button>
              </div>

              {/* Direct Upload Section */}
              {(item.resourceSource === "upload" || !item.resourceSource) ? (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onFileUpload(item.id, f);
                    }}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs hover:border-slate-300"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>{item.resourceValue && item.resourceName ? "Replace File" : "Choose File (Max 1MB)"}</span>
                    </button>
                    {item.resourceName && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs">
                        <span className="font-mono text-slate-600 truncate max-w-[200px]">
                          {item.resourceName}
                        </span>
                        {item.resourceSize && (
                          <span className="text-[10px] text-slate-400">({item.resourceSize})</span>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            onUpdate(item.id, {
                              resourceValue: "",
                              resourceName: "",
                              resourceSize: "",
                            })
                          }
                          className="hover:text-rose-600 transition-colors p-0.5 cursor-pointer ml-0.5 text-slate-400"
                          title="Remove file"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Online URL Input Section */
                <div className="space-y-1">
                  <input
                    type="url"
                    placeholder="https://example.com/asset..."
                    value={item.resourceValue}
                    onChange={(e) => onUpdate(item.id, { resourceValue: e.target.value })}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    Must begin with http:// or https:// (strict validation)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Studio Resource Mini Preview */}
          {item.resourceValue && (
            <div className="mt-2 pt-2 border-t border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Resource Preview
              </span>

              {item.resourceType === "image" && (
                <div className="max-w-xs rounded-xl overflow-hidden border border-slate-200 bg-white p-1">
                  <img
                    src={item.resourceValue}
                    alt={item.title}
                    className="w-full h-32 object-cover rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              )}

              {item.resourceType === "video" && (
                <div className="max-w-xs rounded-xl overflow-hidden border border-slate-200 bg-black">
                  <video
                    src={item.resourceValue}
                    controls
                    className="w-full max-h-36 object-contain"
                  />
                </div>
              )}

              {item.resourceType === "url" && (
                <a
                  href={item.resourceValue}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#1456f0] hover:underline font-mono truncate max-w-sm"
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>{item.resourceValue}</span>
                </a>
              )}

              {item.resourceType === "file" && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-mono">{item.resourceName || "Document"}</span>
                  <span className="text-slate-400 font-mono text-[10px]">({item.resourceSize})</span>
                </div>
              )}

              {item.resourceType === "html" && (
                <div className="border border-slate-300 rounded-xl overflow-hidden max-h-40 bg-white">
                  <iframe
                    srcDoc={item.resourceValue}
                    sandbox="allow-same-origin"
                    title="HTML Block Preview"
                    className="w-full h-36 border-0 overflow-auto"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TaskQuickCreateDrawer({
  isOpen,
  onClose,
  onCreateTask,
  onCreateMultipleTasks,
  onUpdateTask,
  taskToEdit = null,
  isAdmin = false,
  taskStages = [],
  defaultWorkflowName,
  defaultWorkflowId,
}: TaskQuickCreateDrawerProps) {
  const { teamMembers } = useTeamMembers();
  const { processes } = useProcessStore();
  const { user } = useAuth();

  // Task workflows (processes)
  const taskPipelines = useMemo(() => {
    const list = processes.filter((p) => p.entityType === "task");
    return list.length > 0 ? list : DEFAULT_TASK_PROCESSES;
  }, [processes]);

  // Current Step: 1 = Configure, 2 = Task Studio
  const [step, setStep] = useState<1 | 2>(1);

  // ── Step 1: Configure Fields ──
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Responsible Mode: "team" vs "contact" (Clinic) or "admin_org_role" (Admin)
  const [responsibleType, setResponsibleType] = useState<"team" | "contact">("team");

  // Clinic: Team Member Assignment
  const availableRoles = useMemo(() => {
    const roles = Array.from(new Set(teamMembers.map((m) => m.role).filter(Boolean))) as string[];
    return ["All Roles", ...roles];
  }, [teamMembers]);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("All Roles");
  const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState<string[]>(() => {
    return teamMembers[0] ? [String(teamMembers[0].id)] : ["1"];
  });

  const filteredTeamMembers = useMemo(() => {
    if (selectedRoleFilter === "All Roles") return teamMembers;
    return teamMembers.filter((m) => m.role === selectedRoleFilter);
  }, [teamMembers, selectedRoleFilter]);

  // Clinic: Contact Assignment
  const [selectedContactCategory, setSelectedContactCategory] = useState("All Categories");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([initialClients[0]?.id || "CL-001"]);

  const filteredContacts = useMemo(() => {
    if (selectedContactCategory === "All Categories") return initialClients;
    return initialClients.filter(
      (c) => (c.contactType || c.contact_type || "Client").toLowerCase() === selectedContactCategory.toLowerCase()
    );
  }, [selectedContactCategory]);

  // Admin Control (Scope Rules) & Roles
  const [adminScopingRules, setAdminScopingRules] = useState<ScopingRule[]>([]);
  const [selectedAdminRoles, setSelectedAdminRoles] = useState<string[]>(["Lead Physician"]);

  const availableAdminRoles = useMemo(() => {
    // 1. Get any custom roles saved in localStorage by Admin Roles console
    let storedRoles: { roleName: string; category?: string }[] = [];
    try {
      const raw = localStorage.getItem("ma_admin_roles_store_v2");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          storedRoles = parsed.map((r: any) => ({
            roleName: r.roleName || r.name,
            category: r.category,
          }));
        }
      }
    } catch {
      // ignore
    }

    // 2. Identify active categories from Admin Control scoping rules
    const activeCategories = Array.from(
      new Set(
        adminScopingRules
          .map((r) => r.industryCategory)
          .filter(
            (cat): cat is string =>
              Boolean(cat && cat !== "All" && cat !== "All Categories" && cat !== "Global / Cross-Domain")
          )
      )
    );

    // If no specific scoping rules configured: return all roles across all categories
    if (activeCategories.length === 0) {
      const allRoles = new Set<string>();
      Object.values(CATEGORY_ROLES_CATALOG).forEach((roles) => roles.forEach((r) => allRoles.add(r)));
      storedRoles.forEach((r) => {
        if (r.roleName) allRoles.add(r.roleName);
      });
      return Array.from(allRoles);
    }

    // If specific categories configured in Admin Control, strictly render only roles for those categories
    const scopedRoles = new Set<string>();
    activeCategories.forEach((cat) => {
      const matchedKey = Object.keys(CATEGORY_ROLES_CATALOG).find(
        (k) => k.toLowerCase() === cat.toLowerCase()
      );
      if (matchedKey) {
        CATEGORY_ROLES_CATALOG[matchedKey].forEach((r) => scopedRoles.add(r));
      }
      storedRoles
        .filter((sr) => sr.category && sr.category.toLowerCase() === cat.toLowerCase())
        .forEach((sr) => scopedRoles.add(sr.roleName));
    });

    if (scopedRoles.size === 0) {
      return ["Lead Physician", "Clinical Director", "Practice Manager", "Staff Specialist"];
    }

    return Array.from(scopedRoles);
  }, [adminScopingRules]);

  // Workflow (Required, shows only pipeline name)
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>(() => {
    return defaultWorkflowId || taskPipelines[0]?.id || "process-task-default";
  });

  // ── Settings Accordion Rows State ──
  const [openSettingsRow, setOpenSettingsRow] = useState<string | null>(null);

  // Settings: Schedule & Priority
  const [deadlineDate, setDeadlineDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [deadlineTime, setDeadlineTime] = useState("17:00");
  const [isImportant, setIsImportant] = useState(false);

  // Settings: Repeat
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [repeatUnit, setRepeatUnit] = useState<"days" | "weeks" | "months" | "years">("weeks");
  const [repeatSkipWeekends, setRepeatSkipWeekends] = useState(true);
  const [repeatStopRule, setRepeatStopRule] = useState<"never" | "count" | "date">("never");
  const [repeatStopCount, setRepeatStopCount] = useState(10);
  const [repeatStopDate, setRepeatStopDate] = useState("");

  // Settings: Observers (Role, Multi-select, All-role logic for Team Members)
  const [observerRoleFilter, setObserverRoleFilter] = useState("All Roles");
  const [selectedObserverMemberIds, setSelectedObserverMemberIds] = useState<string[]>([]);

  const filteredObserverTeamMembers = useMemo(() => {
    if (observerRoleFilter === "All Roles") return teamMembers;
    return teamMembers.filter((m) => m.role === observerRoleFilter);
  }, [teamMembers, observerRoleFilter]);

  const computedObservers = useMemo<TaskObserver[]>(() => {
    if (selectedObserverMemberIds.length > 0) {
      return selectedObserverMemberIds.map((id) => {
        const m = teamMembers.find((tm) => String(tm.id) === id);
        return {
          id: String(m?.id || id),
          name: m?.name || "Team Member",
          role: m?.role,
          type: "member" as const,
        };
      });
    } else if (observerRoleFilter !== "All Roles") {
      const matching = teamMembers.filter((m) => m.role === observerRoleFilter);
      if (matching.length > 0) {
        return matching.map((m) => ({
          id: String(m.id),
          name: m.name,
          role: m.role,
          type: "member" as const,
        }));
      }
      return [
        {
          id: `obs-role-${observerRoleFilter}`,
          name: `All ${observerRoleFilter}s`,
          role: observerRoleFilter,
          type: "member" as const,
        },
      ];
    }
    return [];
  }, [selectedObserverMemberIds, observerRoleFilter, teamMembers]);

  const observers = computedObservers;

  // ── Step 2: Task Studio State ──
  const [studioItems, setStudioItems] = useState<StudioDraftItem[]>([
    {
      id: "draft-item-1",
      title: "Review patient chart & clinical intake baseline",
      description: "Verify diagnostic codes and medical baseline history prior to evaluation.",
      isImportant: true,
      resourceType: "none",
      resourceSource: "upload",
      resourceValue: "",
      resourceName: "",
      resourceSize: "",
      isExpanded: false,
    },
    {
      id: "draft-item-2",
      title: "Confirm insurance clearinghouse verification stamp",
      description: "Submit electronic verification and attach verification code.",
      isImportant: false,
      resourceType: "none",
      resourceSource: "upload",
      resourceValue: "",
      resourceName: "",
      resourceSize: "",
      isExpanded: false,
    },
  ]);

  const lastOpenedRef = useRef(false);
  const lastTaskToEditIdRef = useRef<string | null>(null);

  // Reset or populate drawer state when opened/closed or taskToEdit changes
  useEffect(() => {
    if (!isOpen) {
      lastOpenedRef.current = false;
      lastTaskToEditIdRef.current = null;
      setStep(1);
      setStudioTab("builder");
      setPreviewDoneItems({});
      setOpenSettingsRow(null);
      return;
    }

    const currentTaskId = taskToEdit?.id || null;
    const isNewOpening = !lastOpenedRef.current;
    const isDifferentTask = currentTaskId !== lastTaskToEditIdRef.current;

    if (!isNewOpening && !isDifferentTask) {
      return;
    }

    lastOpenedRef.current = true;
    lastTaskToEditIdRef.current = currentTaskId;

    if (taskToEdit) {
      setTitle(taskToEdit.title || "");
      setDescription(taskToEdit.description || "");
      setIsImportant(Boolean(taskToEdit.isImportant));

      if (taskToEdit.workflowId) {
        setSelectedPipelineId(taskToEdit.workflowId);
      }

      if (taskToEdit.responsibleType === "contact") {
        setResponsibleType("contact");
        if (taskToEdit.responsiblePeople && taskToEdit.responsiblePeople.length > 0) {
          setSelectedContactIds(taskToEdit.responsiblePeople.map((p) => p.id));
        } else if (taskToEdit.assignee?.clientId) {
          setSelectedContactIds([taskToEdit.assignee.clientId]);
        }
      } else {
        setResponsibleType("team");
        if (taskToEdit.responsiblePeople && taskToEdit.responsiblePeople.length > 0) {
          setSelectedTeamMemberIds(taskToEdit.responsiblePeople.map((p) => p.id));
        } else if (taskToEdit.assignee?.assigneeName) {
          const match = teamMembers.find(
            (m) => m.name.toLowerCase() === (taskToEdit.assignee?.assigneeName || "").toLowerCase()
          );
          if (match) setSelectedTeamMemberIds([String(match.id)]);
        }
      }

      if (taskToEdit.scopingRules && Array.isArray(taskToEdit.scopingRules)) {
        setAdminScopingRules(taskToEdit.scopingRules);
      } else {
        setAdminScopingRules([]);
      }

      if (taskToEdit.targetRole) {
        const roles = taskToEdit.targetRole.split(",").map((r) => r.trim()).filter(Boolean);
        setSelectedAdminRoles(roles.length > 0 ? roles : [taskToEdit.targetRole]);
      } else if (taskToEdit.responsiblePeople && taskToEdit.responsiblePeople.length > 0) {
        const roles = taskToEdit.responsiblePeople.map((p) => p.role).filter(Boolean) as string[];
        if (roles.length > 0) {
          setSelectedAdminRoles(Array.from(new Set(roles)));
        } else {
          setSelectedAdminRoles(["Lead Physician"]);
        }
      } else {
        setSelectedAdminRoles(["Lead Physician"]);
      }

      if (taskToEdit.deadlineDate) {
        setDeadlineDate(taskToEdit.deadlineDate);
      }
      if (taskToEdit.deadlineTime) {
        setDeadlineTime(taskToEdit.deadlineTime);
      }

      if (taskToEdit.recurrence?.enabled) {
        setRepeatEnabled(true);
        setRepeatInterval(taskToEdit.recurrence.interval || 1);
        setRepeatUnit(taskToEdit.recurrence.unit || "weeks");
        setRepeatSkipWeekends(Boolean(taskToEdit.recurrence.skipWeekends));
        setRepeatStopRule(taskToEdit.recurrence.stopRule || "never");
        if (taskToEdit.recurrence.stopCount) setRepeatStopCount(taskToEdit.recurrence.stopCount);
        if (taskToEdit.recurrence.stopDate) setRepeatStopDate(taskToEdit.recurrence.stopDate);
      } else {
        setRepeatEnabled(false);
      }

      if (taskToEdit.observers && taskToEdit.observers.length > 0) {
        const memberIds = taskToEdit.observers
          .filter((o) => o.type !== "contact")
          .map((o) => String(o.id));
        setSelectedObserverMemberIds(memberIds);
      } else {
        setSelectedObserverMemberIds([]);
      }

      if (taskToEdit.studioItems && taskToEdit.studioItems.length > 0) {
        setStudioItems(
          taskToEdit.studioItems.map((si) => ({
            id: si.id,
            title: si.title,
            description: si.description || "",
            isImportant: Boolean(si.isImportant),
            resourceType: si.resource?.type || "none",
            resourceSource: si.resource?.source || "upload",
            resourceValue: si.resource?.value || "",
            resourceName: si.resource?.name || "",
            resourceSize: si.resource?.size || "",
            isExpanded: false,
          }))
        );
      }
    } else {
      // Clear for new task
      setTitle("");
      setDescription("");
      setIsImportant(false);
      setRepeatEnabled(false);
      setSelectedObserverMemberIds([]);
      setAdminScopingRules([]);
      setSelectedAdminRoles(["Lead Physician"]);
      setStudioItems([
        {
          id: "draft-item-1",
          title: "Review patient chart & clinical intake baseline",
          description: "Verify diagnostic codes and medical baseline history prior to evaluation.",
          isImportant: true,
          resourceType: "none",
          resourceSource: "upload",
          resourceValue: "",
          resourceName: "",
          resourceSize: "",
          isExpanded: false,
        },
        {
          id: "draft-item-2",
          title: "Confirm insurance clearinghouse verification stamp",
          description: "Submit electronic verification and attach verification code.",
          isImportant: false,
          resourceType: "none",
          resourceSource: "upload",
          resourceValue: "",
          resourceName: "",
          resourceSize: "",
          isExpanded: false,
        },
      ]);
    }
  }, [isOpen, taskToEdit]);

  // Step 2 Studio View Tab: "builder" vs "preview"
  const [studioTab, setStudioTab] = useState<"builder" | "preview">("builder");
  const [previewDoneItems, setPreviewDoneItems] = useState<Record<string, boolean>>({});

  const previewDoneCount = useMemo(() => {
    return studioItems.filter((it) => previewDoneItems[it.id]).length;
  }, [studioItems, previewDoneItems]);

  const previewPercent = useMemo(() => {
    if (studioItems.length === 0) return 0;
    return Math.round((previewDoneCount / studioItems.length) * 100);
  }, [previewDoneCount, studioItems.length]);

  const currentResponsiblePeople = useMemo<TaskResponsiblePerson[]>(() => {
    if (isAdmin) {
      const activeCats = adminScopingRules
        .map((r) => r.industryCategory)
        .filter(Boolean)
        .join(", ");
      return selectedAdminRoles.map((role, idx) => ({
        id: `admin-role-${idx}`,
        name: role,
        role: role,
        type: "org_role",
        category: activeCats || "Global",
      }));
    } else if (responsibleType === "team") {
      if (selectedTeamMemberIds.length > 0) {
        return selectedTeamMemberIds.map((id) => {
          const m = teamMembers.find((tm) => String(tm.id) === id);
          return {
            id: String(m?.id || id),
            name: m?.name || "Team Member",
            role: m?.role,
            type: "member" as const,
            avatar: (m as any)?.avatar,
          };
        });
      } else if (selectedRoleFilter !== "All Roles") {
        const matching = teamMembers.filter((m) => m.role === selectedRoleFilter);
        if (matching.length > 0) {
          return matching.map((m) => ({
            id: String(m.id),
            name: m.name,
            role: m.role,
            type: "member" as const,
            avatar: (m as any)?.avatar,
          }));
        }
        return [
          {
            id: `role-all-${selectedRoleFilter}`,
            name: `All ${selectedRoleFilter}s`,
            role: selectedRoleFilter,
            type: "member" as const,
          },
        ];
      } else {
        return teamMembers[0]
          ? [
              {
                id: String(teamMembers[0].id),
                name: teamMembers[0].name,
                role: teamMembers[0].role,
                type: "member" as const,
                avatar: (teamMembers[0] as any)?.avatar,
              },
            ]
          : [];
      }
    } else {
      if (selectedContactIds.length > 0) {
        return selectedContactIds.map((id) => {
          const c = initialClients.find((cl) => cl.id === id);
          return {
            id: c?.id || id,
            name: c?.name || "Patient / Contact",
            role: c?.contactType || c?.contact_type || "Client",
            category: c?.contactType || c?.contact_type || "Client",
            type: "contact" as const,
          };
        });
      } else if (selectedContactCategory !== "All Categories") {
        const matching = initialClients.filter(
          (c) => (c.contactType || c.contact_type || "Client").toLowerCase() === selectedContactCategory.toLowerCase()
        );
        if (matching.length > 0) {
          return matching.map((c) => ({
            id: c.id,
            name: c.name,
            role: c.contactType || c.contact_type || "Client",
            category: c.contactType || c.contact_type || "Client",
            type: "contact" as const,
          }));
        }
        return [
          {
            id: `cat-all-${selectedContactCategory}`,
            name: `All ${selectedContactCategory} Contacts`,
            role: selectedContactCategory,
            category: selectedContactCategory,
            type: "contact" as const,
          },
        ];
      } else {
        return initialClients[0]
          ? [
              {
                id: initialClients[0].id,
                name: initialClients[0].name,
                role: initialClients[0].contactType || initialClients[0].contact_type || "Client",
                category: initialClients[0].contactType || initialClients[0].contact_type || "Client",
                type: "contact" as const,
              },
            ]
          : [];
      }
    }
  }, [
    isAdmin,
    adminScopingRules,
    selectedAdminRoles,
    responsibleType,
    selectedTeamMemberIds,
    selectedRoleFilter,
    teamMembers,
    selectedContactIds,
    selectedContactCategory,
  ]);

  const selectedPipeline = useMemo(() => {
    return taskPipelines.find((p) => p.id === selectedPipelineId) || taskPipelines[0];
  }, [taskPipelines, selectedPipelineId]);

  const initialStage = selectedPipeline?.stages?.[0];
  const stageName = initialStage?.name || "Task Created";
  const stageId = initialStage?.id || "task-stg-created";

  const deadlineFormatted = useMemo(() => {
    if (!deadlineDate) return undefined;
    return `${new Date(deadlineDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}${
      deadlineTime ? `, ${deadlineTime}` : ""
    }`;
  }, [deadlineDate, deadlineTime]);

  // Synchronize admin org roles
  useEffect(() => {
    if (availableAdminRoles.length > 0 && selectedAdminRoles.length === 0) {
      setSelectedAdminRoles([availableAdminRoles[0]]);
    }
  }, [availableAdminRoles, selectedAdminRoles]);

  // ── Handlers for Selection & Chips ──
  const toggleTeamMemberSelection = (id: string) => {
    setSelectedTeamMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const removeTeamMemberChip = (id: string) => {
    setSelectedTeamMemberIds((prev) => prev.filter((x) => x !== id));
  };

  const toggleContactSelection = (id: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const removeContactChip = (id: string) => {
    setSelectedContactIds((prev) => prev.filter((x) => x !== id));
  };

  const toggleAdminRoleSelection = (role: string) => {
    setSelectedAdminRoles((prev) =>
      prev.includes(role) ? (prev.length > 1 ? prev.filter((x) => x !== role) : prev) : [...prev, role]
    );
  };

  const removeAdminRoleChip = (role: string) => {
    setSelectedAdminRoles((prev) => (prev.length > 1 ? prev.filter((x) => x !== role) : prev));
  };

  const handleAddObserver = (memberId: string) => {
    if (!selectedObserverMemberIds.includes(memberId)) {
      setSelectedObserverMemberIds((prev) => [...prev, memberId]);
    }
  };

  const handleRemoveObserver = (id: string) => {
    setSelectedObserverMemberIds((prev) => prev.filter((x) => x !== id));
  };

  // ── File Upload Helper (Base64 + 1MB limit) ──
  const handleItemFileUpload = (itemId: string, file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(`File size exceeds 1MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller file.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const sizeStr = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`;
      setStudioItems((prev) =>
        prev.map((it) =>
          it.id === itemId
            ? {
                ...it,
                resourceValue: dataUrl,
                resourceName: file.name,
                resourceSize: sizeStr,
              }
            : it
        )
      );
      toast.success(`Attached "${file.name}"`);
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
    };
    reader.readAsDataURL(file);
  };

  // ── URL Validation ──
  const isValidHttpUrl = (val: string) => {
    try {
      const u = new URL(val);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  // ── Studio Item Management ──
  const handleAddStudioItem = () => {
    const nextNum = studioItems.length + 1;
    const newItem: StudioDraftItem = {
      id: `draft-item-${Date.now()}-${nextNum}`,
      title: `Task Deliverable ${nextNum}`,
      description: "",
      isImportant: false,
      resourceType: "none",
      resourceSource: "upload",
      resourceValue: "",
      resourceName: "",
      resourceSize: "",
      isExpanded: true,
    };
    setStudioItems((prev) => [...prev, newItem]);
  };

  const handleUpdateStudioItem = (id: string, patch: Partial<StudioDraftItem>) => {
    setStudioItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const handleDeleteStudioItem = (id: string) => {
    if (studioItems.length <= 1) {
      toast.error("A task must have at least one studio deliverable item");
      return;
    }
    setStudioItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleMoveStudioItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= studioItems.length) return;
    const items = [...studioItems];
    const [moved] = items.splice(index, 1);
    items.splice(targetIndex, 0, moved);
    setStudioItems(items);
  };

  // ── Validation & Step Progression ──
  const handleNextStep = () => {
    if (!title.trim()) {
      toast.error("Please enter a Task Title");
      return;
    }
    if (!isAdmin && !selectedPipelineId) {
      toast.error("Please select a Workflow Pipeline");
      return;
    }
    setStep(2);
  };

  const handleFinalCreate = () => {
    // Validate Studio Items
    if (studioItems.length === 0) {
      toast.error("Task Studio requires at least one item");
      return;
    }
    const emptyTitleItem = studioItems.find((it) => !it.title.trim());
    if (emptyTitleItem) {
      toast.error("Every studio item must have a title");
      return;
    }

    // Validate URLs if resourceType is url or (image/video with source url)
    for (const it of studioItems) {
      if (
        it.resourceType === "url" ||
        ((it.resourceType === "image" || it.resourceType === "video") && it.resourceSource === "url")
      ) {
        if (it.resourceValue && !isValidHttpUrl(it.resourceValue)) {
          toast.error(`Invalid URL scheme for "${it.title}". Must start with http:// or https://`);
          return;
        }
      }
    }

    // Construct Responsible People
    const responsiblePeople = currentResponsiblePeople;

    // Convert Studio Items
    const finalStudioItems: TaskStudioItem[] = studioItems.map((draft, idx) => {
      let resource: TaskStudioItemResource | undefined = undefined;
      if (draft.resourceType !== "none" && draft.resourceValue) {
        resource = {
          type: draft.resourceType,
          source: draft.resourceSource,
          value: draft.resourceValue,
          name: draft.resourceName || draft.title,
          size: draft.resourceSize,
        };
      }
      return {
        id: draft.id,
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        resource,
        isImportant: draft.isImportant,
        order: idx,
        completion: {},
      };
    });

    // Primary Assignee for backward compatibility
    const firstResp = responsiblePeople[0] || {
      id: "resp-1",
      name: "Assigned Staff",
      type: "member" as const,
    };
    const primaryAssignee: TaskAssigneeScope = {
      scopeLevel: isAdmin ? "org_role" : responsibleType === "contact" ? "contact" : "client",
      assigneeName: firstResp.name,
      roleName: firstResp.role,
      userId: firstResp.type === "member" ? firstResp.id : undefined,
      clientId: firstResp.type === "contact" ? firstResp.id : undefined,
      clientName: firstResp.type === "contact" ? firstResp.name : undefined,
      adminScopeName: isAdmin
        ? adminScopingRules.map((r) => r.industryCategory).filter(Boolean).join(", ") || "Global"
        : undefined,
    };

    const allAssignees: TaskAssigneeScope[] = responsiblePeople.map((r) => ({
      scopeLevel: isAdmin ? "org_role" : r.type === "contact" ? "contact" : "client",
      assigneeName: r.name,
      roleName: r.role,
      userId: r.type === "member" ? r.id : undefined,
      clientId: r.type === "contact" ? r.id : undefined,
      clientName: r.type === "contact" ? r.name : undefined,
      adminScopeName: isAdmin
        ? adminScopingRules.map((r) => r.industryCategory).filter(Boolean).join(", ") || "Global"
        : undefined,
    }));

    // Recurrence config (omitted for Admin tasks)
    let recurrence: TaskRecurrenceConfig | undefined = undefined;
    if (!isAdmin && repeatEnabled) {
      recurrence = {
        enabled: true,
        interval: Math.max(1, repeatInterval),
        unit: repeatUnit,
        startDate: deadlineDate || new Date().toISOString().split("T")[0],
        skipWeekends: repeatSkipWeekends,
        stopRule: repeatStopRule,
        stopCount: repeatStopRule === "count" ? repeatStopCount : undefined,
        stopDate: repeatStopRule === "date" ? repeatStopDate : undefined,
      };
    }

    const timePlanning: TaskTimePlanningConfig | undefined = isAdmin ? undefined : {
      startDate: deadlineDate,
      dueDate: deadlineDate,
      assigneeCanEditDates: false,
      skipWeekends: false,
      useSubtaskDates: false,
    };

    // If editing existing task, update and return
    if (taskToEdit && onUpdateTask) {
      onUpdateTask(taskToEdit.id, {
        title: title.trim(),
        description: description.trim(),
        workflowId: selectedPipeline.id,
        workflowName: selectedPipeline.name,
        isImportant,
        scopeLevel: isAdmin ? "admin" : responsibleType === "contact" ? "portal" : "client",
        assignee: primaryAssignee,
        assignees: allAssignees,
        responsiblePeople,
        responsibleType: isAdmin ? "org_role" : responsibleType,
        studioItems: finalStudioItems,
        deadline: isAdmin ? undefined : deadlineFormatted,
        deadlineDate: isAdmin ? undefined : deadlineDate || undefined,
        deadlineTime: isAdmin ? undefined : deadlineTime || undefined,
        recurrence: isAdmin ? undefined : recurrence,
        timePlanning,
        observers,
        targetRole: isAdmin ? selectedAdminRoles.join(", ") : selectedRoleFilter !== "All Roles" ? selectedRoleFilter : undefined,
        targetCategory: responsibleType === "contact" && selectedContactCategory !== "All Categories" ? selectedContactCategory : undefined,
        targetOrgId: undefined,
        targetOrgName: undefined,
        scopingRules: isAdmin ? adminScopingRules : taskToEdit.scopingRules,
      });
      toast.success(`Task ${taskToEdit.code} updated successfully`);
      onClose();
      return;
    }

    // When multiple responsible people are selected:
    // Create an individual task for EACH responsible person with their own unique ID, code, and log!
    if (responsiblePeople.length > 1) {
      const nowTs = Date.now();
      const tasksToCreate: Array<Omit<TaskEntity, "id" | "code" | "createdAt" | "updatedAt">> = responsiblePeople.map(
        (r, rIdx) => {
          const indivAssignee: TaskAssigneeScope = {
            scopeLevel: isAdmin ? "org_role" : r.type === "contact" ? "contact" : "client",
            assigneeName: r.name,
            roleName: r.role,
            userId: r.type === "member" ? r.id : undefined,
            clientId: r.type === "contact" ? r.id : undefined,
            clientName: r.type === "contact" ? r.name : undefined,
            adminScopeName: isAdmin
              ? adminScopingRules.map((rule) => rule.industryCategory).filter(Boolean).join(", ") || "Global"
              : undefined,
          };

          const indivStudioItems = finalStudioItems.map((si, siIdx) => ({
            ...si,
            id: `st-it-${nowTs}-${rIdx + 1}-${siIdx + 1}`,
            completion: {},
          }));

          return {
            title: title.trim(),
            description: description.trim(),
            creator: {
              id: user?.email || (isAdmin ? "admin-1" : "member-1"),
              name: user?.name || (isAdmin ? "Platform Administrator" : "Dr. Alistair Mehta"),
              role: user?.role || (isAdmin ? "SuperAdmin" : "Physician"),
            },
            status: "pending",
            stageName,
            stageId,
            workflowId: selectedPipeline.id,
            workflowName: selectedPipeline.name,
            isImportant,
            scopeLevel: isAdmin ? "admin" : r.type === "contact" ? "portal" : "client",
            assignee: indivAssignee,
            assignees: [indivAssignee],
            responsiblePeople: [r],
            responsibleType: isAdmin ? "org_role" : r.type === "contact" ? "contact" : "team",
            targetRole: isAdmin ? selectedAdminRoles.join(", ") : r.role || undefined,
            targetCategory:
              r.type === "contact" && selectedContactCategory !== "All Categories"
                ? selectedContactCategory
                : undefined,
            scopingRules: isAdmin ? adminScopingRules : undefined,
            studioItems: indivStudioItems,
            deadline: isAdmin ? undefined : deadlineFormatted,
            deadlineDate: isAdmin ? undefined : deadlineDate || undefined,
            deadlineTime: isAdmin ? undefined : deadlineTime || undefined,
            checklists: [
              {
                id: `chk-${nowTs}-${rIdx + 1}`,
                title: "Deliverables Checklist",
                items: indivStudioItems.map((si) => ({
                  id: si.id,
                  text: si.title,
                  isCompleted: false,
                  isImportant: si.isImportant,
                })),
              },
            ],
            observers,
            subtasks: [],
            recurrence,
            timePlanning,
            attachments: [],
          };
        }
      );

      if (onCreateMultipleTasks) {
        onCreateMultipleTasks(tasksToCreate);
      } else {
        tasksToCreate.forEach((t) => onCreateTask(t));
      }

      toast.success(
        `Created ${tasksToCreate.length} individual tasks for each responsible person (${responsiblePeople.map((p) => p.name).join(", ")})`
      );
      onClose();
      return;
    }

    const newTaskData: Omit<TaskEntity, "id" | "code" | "createdAt" | "updatedAt"> = {
      title: title.trim(),
      description: description.trim(),
      creator: {
        id: user?.email || (isAdmin ? "admin-1" : "member-1"),
        name: user?.name || (isAdmin ? "Platform Administrator" : "Dr. Alistair Mehta"),
        role: user?.role || (isAdmin ? "SuperAdmin" : "Physician"),
      },
      status: "pending",
      stageName,
      stageId,
      workflowId: selectedPipeline.id,
      workflowName: selectedPipeline.name,
      isImportant,
      scopeLevel: isAdmin ? "admin" : responsibleType === "contact" ? "portal" : "client",
      assignee: primaryAssignee,
      assignees: allAssignees,
      responsiblePeople,
      responsibleType: isAdmin ? "org_role" : responsibleType,
      targetRole: isAdmin ? selectedAdminRoles.join(", ") : selectedRoleFilter !== "All Roles" ? selectedRoleFilter : undefined,
      targetCategory: responsibleType === "contact" && selectedContactCategory !== "All Categories" ? selectedContactCategory : undefined,
      scopingRules: isAdmin ? adminScopingRules : undefined,
      studioItems: finalStudioItems,
      deadline: isAdmin ? undefined : deadlineFormatted,
      deadlineDate: isAdmin ? undefined : deadlineDate || undefined,
      deadlineTime: isAdmin ? undefined : deadlineTime || undefined,
      checklists: [
        {
          id: `chk-${Date.now()}`,
          title: "Deliverables Checklist",
          items: finalStudioItems.map((si) => ({
            id: si.id,
            text: si.title,
            isCompleted: false,
            isImportant: si.isImportant,
          })),
        },
      ],
      observers,
      subtasks: [],
      recurrence,
      timePlanning,
      attachments: [],
    };

    onCreateTask(newTaskData);
    toast.success(`Task "${title.trim()}" created successfully with ${finalStudioItems.length} studio items`);
    onClose();
  };

  // Schedule summary chip
  const scheduleChipSummary = useMemo(() => {
    if (!deadlineDate) return "None";
    const dStr = new Date(deadlineDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const timeStr = deadlineTime ? `, ${deadlineTime}` : "";
    return `${dStr}${timeStr}`;
  }, [deadlineDate, deadlineTime]);

  // Repeat summary chip
  const repeatChipSummary = useMemo(() => {
    if (!repeatEnabled) return "Off";
    return `Every ${repeatInterval} ${repeatUnit}`;
  }, [repeatEnabled, repeatInterval, repeatUnit]);

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title={taskToEdit ? `Edit Task (${taskToEdit.code})` : "Create Task"}
      subtitle={
        taskToEdit
          ? step === 1
            ? "Step 1: Configure task scope & assignment"
            : "Step 2: Task Studio & deliverables"
          : step === 1
          ? "Step 1: Configure task scope & assignment"
          : "Step 2: Task Studio & deliverables"
      }
      icon={<CheckSquare className="w-5 h-5 text-slate-700" />}
      width={step === 2 ? "max-w-[760px]" : "max-w-[640px]"}
      zIndex={650}
      headerRight={
        <div className="flex items-center gap-3">
          {/* Step Indicator */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                step === 1
                  ? "bg-[#1E293B] text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <span>1</span>
              <span>Configure</span>
            </button>
            <div className="w-2.5 h-px bg-slate-300" />
            <button
              type="button"
              onClick={() => {
                if (title.trim()) setStep(2);
                else toast.error("Please enter a Task Title first");
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                step === 2
                  ? "bg-[#1E293B] text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <span>2</span>
              <span>Task Studio</span>
            </button>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#1E293B] hover:bg-slate-800 rounded-xl shadow-xs transition-all cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <span>Next: Task Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Configure</span>
              </button>
              <button
                type="button"
                onClick={handleFinalCreate}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-xs transition-all cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <Check className="w-4 h-4" />
                <span>{taskToEdit ? "Save Changes" : "Create Task"}</span>
              </button>
            </>
          )}
        </div>
      }
      bodyClassName="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50/50"
    >
      {/* ─────────────────────────────────────────────────────────────
          STEP 1: CONFIGURE THE TASK
      ───────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-3.5 animate-in fade-in duration-150" style={{ fontFamily: "Outfit, sans-serif" }}>
          {/* 1. Task Title (Required) */}
          <div className="border border-slate-200 rounded-lg bg-white p-4 space-y-4">
            <div>
              <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                <span>Task title</span>
                <span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Verify Patient Insurance Eligibility for Fasting Labs"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="flex items-center text-[13px] font-medium text-slate-700 mb-1.5">
                <span>Description</span>
              </label>
              <textarea
                rows={3}
                placeholder="Provide background context, clinical objectives, and deliverables instructions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Admin Control (Scope Rules) - Only in Admin Mode */}
          {isAdmin && (
            <div className="space-y-2">
              <AdminControlAccordion
                scopingRules={adminScopingRules}
                onScopingRulesChange={(newRules) => setAdminScopingRules(newRules)}
                defaultAdminControlOpen={true}
                defaultScopeOpen={true}
                defaultPermissionsOpen={false}
                scopeTooltip="Define which tenant organization categories, industries, and locations this administrative task applies to. Assigned roles below are filtered by this scope."
              />
            </div>
          )}

          {/* 3. Task Responsible */}
          <div className="border border-slate-200 rounded-lg bg-white p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-slate-900">
                Task responsible
              </span>
              {!isAdmin && (
                <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setResponsibleType("team")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      responsibleType === "team"
                        ? "bg-white text-blue-700 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Team Members
                  </button>
                  <button
                    type="button"
                    onClick={() => setResponsibleType("contact")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      responsibleType === "contact"
                        ? "bg-white text-blue-700 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Contacts
                  </button>
                </div>
              )}
            </div>

            {/* Admin Responsible: Render Roles based on Admin Control scope, organizations removed */}
            {isAdmin ? (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[13px] font-medium text-slate-700">
                      Assign to role(s)
                    </label>
                    {adminScopingRules.length > 0 && (
                      <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        Filtered by Scope ({adminScopingRules.map((r) => r.industryCategory || "All").join(", ")})
                      </span>
                    )}
                  </div>
                  <select
                    onChange={(e) => {
                      if (e.target.value) toggleAdminRoleSelection(e.target.value);
                      e.target.value = "";
                    }}
                    defaultValue=""
                    className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-colors"
                  >
                    <option value="" disabled>
                      Select role to assign...
                    </option>
                    {availableAdminRoles.map((role) => (
                      <option key={role} value={role}>
                        {role} {selectedAdminRoles.includes(role) ? "✓ (Selected)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Role Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedAdminRoles.length === 0 ? (
                    <p className="text-xs text-slate-400">No roles selected. Select at least one role above.</p>
                  ) : (
                    selectedAdminRoles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                      >
                        <span>{role}</span>
                        <button
                          type="button"
                          onClick={() => removeAdminRoleChip(role)}
                          className="ml-0.5 p-0.5 hover:bg-black/5 rounded-full transition-colors cursor-pointer"
                          title={`Remove ${role}`}
                        >
                          <X className="w-3 h-3 opacity-60 hover:opacity-100" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            ) : responsibleType === "team" ? (
              /* Clinic Team Members: Vertically aligned Role -> Searchable Multi-select members */
              <div className="space-y-3">
                <div>
                  <label className="text-[13px] font-medium text-slate-700 block mb-1.5">Role</label>
                  <select
                    value={selectedRoleFilter}
                    onChange={(e) => {
                      setSelectedRoleFilter(e.target.value);
                      setSelectedTeamMemberIds([]);
                    }}
                    className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-colors"
                  >
                    {availableRoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <SearchableMultiSelectPicker
                    label="Select members"
                    placeholder="Select team members..."
                    searchPlaceholder="Search team members by name or role..."
                    options={filteredTeamMembers.map((m) => ({
                      id: String(m.id),
                      name: m.name,
                      subtitle: m.role,
                    }))}
                    selectedIds={selectedTeamMemberIds}
                    onChange={setSelectedTeamMemberIds}
                    autoRoleText={
                      selectedRoleFilter !== "All Roles" && selectedTeamMemberIds.length === 0
                        ? `All ${selectedRoleFilter} members (${filteredTeamMembers.length} members)`
                        : undefined
                    }
                  />
                </div>

                {/* If Role is selected and no individual members are picked: show role-wide assignment banner */}
                {selectedRoleFilter !== "All Roles" && selectedTeamMemberIds.length === 0 && (
                  <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs text-blue-900">
                    Assigned to all <strong>{filteredTeamMembers.length} {selectedRoleFilter}</strong> members.
                  </div>
                )}

                {/* Selected People Removable Chips */}
                {selectedTeamMemberIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedTeamMemberIds.map((id) => {
                      const m = teamMembers.find((tm) => String(tm.id) === id);
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                        >
                          <span>{m?.name || "Member"}</span>
                          <button
                            type="button"
                            onClick={() => removeTeamMemberChip(id)}
                            className="ml-0.5 p-0.5 hover:bg-black/5 rounded-full transition-colors cursor-pointer"
                            title="Remove person"
                          >
                            <X className="w-3 h-3 opacity-60 hover:opacity-100" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Clinic Contacts: Vertically aligned Category -> Searchable Multi-select contacts */
              <div className="space-y-3">
                <div>
                  <label className="text-[13px] font-medium text-slate-700 block mb-1.5">Category</label>
                  <select
                    value={selectedContactCategory}
                    onChange={(e) => {
                      setSelectedContactCategory(e.target.value);
                      setSelectedContactIds([]);
                    }}
                    className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-colors"
                  >
                    {CONTACT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <SearchableMultiSelectPicker
                    label="Select contacts"
                    placeholder="Select contacts..."
                    searchPlaceholder="Search contacts by name or category..."
                    options={filteredContacts.map((c) => ({
                      id: c.id,
                      name: c.name,
                      subtitle: c.contactType || c.contact_type || "Client",
                    }))}
                    selectedIds={selectedContactIds}
                    onChange={setSelectedContactIds}
                    autoRoleText={
                      selectedContactCategory !== "All Categories" && selectedContactIds.length === 0
                        ? `All ${selectedContactCategory} contacts (${filteredContacts.length} contacts)`
                        : undefined
                    }
                  />
                </div>

                {/* If Category is selected and no individual contacts are picked */}
                {selectedContactCategory !== "All Categories" && selectedContactIds.length === 0 && (
                  <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs text-blue-900">
                    Assigned to all <strong>{filteredContacts.length} {selectedContactCategory}</strong> contacts.
                  </div>
                )}

                {/* Selected Contacts Removable Chips */}
                {selectedContactIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedContactIds.map((id) => {
                      const c = initialClients.find((cl) => cl.id === id);
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                        >
                          <span>{c?.name || "Contact"}</span>
                          <button
                            type="button"
                            onClick={() => removeContactChip(id)}
                            className="ml-0.5 p-0.5 hover:bg-black/5 rounded-full transition-colors cursor-pointer"
                            title="Remove contact"
                          >
                            <X className="w-3 h-3 opacity-60 hover:opacity-100" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Workflow (Required, pipeline name only; omitted for Admin tasks) */}
          {!isAdmin && (
            <div className="border border-slate-200 rounded-lg bg-white p-4 space-y-1.5">
              <div className="flex items-center">
                <label className="flex items-center text-[13px] font-medium text-slate-700">
                  <span>Workflow pipeline</span>
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <InfoTooltip content="The task will automatically begin in the pipeline's starting stage." />
              </div>
              <select
                value={selectedPipelineId}
                onChange={(e) => setSelectedPipelineId(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-colors"
              >
                {taskPipelines.map((pipe) => (
                  <option key={pipe.id} value={pipe.id}>
                    {pipe.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 5. Settings Accordion Rows (Scheduling omitted for Admin tasks) */}
          <div className="space-y-3.5">
            {/* Mark as Important Toggle */}
            <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-slate-200 bg-white">
              <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 cursor-pointer">
                <span>Mark as important</span>
                <InfoTooltip content="Flags this task with high urgency priority." />
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isImportant}
                  onChange={(e) => setIsImportant(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Row A: Schedule (Client only) */}
            {!isAdmin && (
              <div className="border border-slate-200 rounded-lg bg-white">
                <button
                  type="button"
                  onClick={() => setOpenSettingsRow(openSettingsRow === "schedule" ? null : "schedule")}
                  className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
                    openSettingsRow === "schedule" ? "rounded-t-lg" : "rounded-lg"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900">Schedule</span>
                    <InfoTooltip content="Set completion deadline and target time." />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      {scheduleChipSummary}
                    </span>
                    {openSettingsRow === "schedule" ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {openSettingsRow === "schedule" && (
                  <div className="px-4 py-4 border-t border-slate-100 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[13px] font-medium text-slate-700 block mb-1.5">Deadline date</label>
                        <input
                          type="date"
                          value={deadlineDate}
                          onChange={(e) => setDeadlineDate(e.target.value)}
                          className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[13px] font-medium text-slate-700 block mb-1.5">Target time</label>
                        <input
                          type="time"
                          value={deadlineTime}
                          onChange={(e) => setDeadlineTime(e.target.value)}
                          className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Row B: Repeat (Inline recurrence settings — Client only; hidden for Admin) */}
            {!isAdmin && (
            <div className="border border-slate-200 rounded-lg bg-white">
              <button
                type="button"
                onClick={() => setOpenSettingsRow(openSettingsRow === "repeat" ? null : "repeat")}
                className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
                  openSettingsRow === "repeat" ? "rounded-t-lg" : "rounded-lg"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-900">Repeat</span>
                  <InfoTooltip content="Automated cadence for recurring task dispatch." />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">
                    {repeatChipSummary}
                  </span>
                  {openSettingsRow === "repeat" ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {openSettingsRow === "repeat" && (
                <div className="px-4 py-4 border-t border-slate-100 space-y-4">
                  {/* Enable Repeat Toggle */}
                  <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50">
                    <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 cursor-pointer">
                      <span>Enable recurrence</span>
                      <InfoTooltip content="Auto-create new instances on schedule." />
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={repeatEnabled}
                        onChange={(e) => setRepeatEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {repeatEnabled && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[13px] font-medium text-slate-700 block mb-1.5">Every</label>
                          <input
                            type="number"
                            min={1}
                            value={repeatInterval}
                            onChange={(e) => setRepeatInterval(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="text-[13px] font-medium text-slate-700 block mb-1.5">Unit</label>
                          <select
                            value={repeatUnit}
                            onChange={(e) => setRepeatUnit(e.target.value as any)}
                            className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                          >
                            <option value="days">Days</option>
                            <option value="weeks">Weeks</option>
                            <option value="months">Months</option>
                            <option value="years">Years</option>
                          </select>
                        </div>
                      </div>

                      {/* Stop Conditions */}
                      <div className="space-y-2">
                        <label className="text-[13px] font-medium text-slate-700 block">End recurrence</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(["never", "count", "date"] as const).map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setRepeatStopRule(r)}
                              className={`h-9 rounded-lg text-xs font-semibold capitalize border transition-colors cursor-pointer ${
                                repeatStopRule === r
                                  ? "bg-slate-900 text-white border-slate-900"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>

                        {repeatStopRule === "count" && (
                          <div className="pt-1">
                            <label className="text-[12px] font-medium text-slate-600 block mb-1">Stop after (occurrences)</label>
                            <input
                              type="number"
                              min={1}
                              value={repeatStopCount}
                              onChange={(e) => setRepeatStopCount(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                          </div>
                        )}

                        {repeatStopRule === "date" && (
                          <div className="pt-1">
                            <label className="text-[12px] font-medium text-slate-600 block mb-1">Stop on date</label>
                            <input
                              type="date"
                              value={repeatStopDate}
                              onChange={(e) => setRepeatStopDate(e.target.value)}
                              className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            )}

            {/* Row C: Observers */}
            <div className="border border-slate-200 rounded-lg bg-white">
              <button
                type="button"
                onClick={() => setOpenSettingsRow(openSettingsRow === "observers" ? null : "observers")}
                className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
                  openSettingsRow === "observers" ? "rounded-t-lg" : "rounded-lg"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-900">Observers</span>
                  <InfoTooltip content="Observers receive notifications and progress updates without direct responsibility." />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">
                    {computedObservers.length} {computedObservers.length === 1 ? "Observer" : "Observers"}
                  </span>
                  {openSettingsRow === "observers" ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {openSettingsRow === "observers" && (
                <div className="px-4 py-4 border-t border-slate-100 space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-[13px] font-medium text-slate-700 block mb-1.5">Role</label>
                      <select
                        value={observerRoleFilter}
                        onChange={(e) => {
                          setObserverRoleFilter(e.target.value);
                          setSelectedObserverMemberIds([]);
                        }}
                        className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer transition-colors"
                      >
                        {availableRoles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <SearchableMultiSelectPicker
                        label="Select observer members"
                        placeholder="Select observers..."
                        searchPlaceholder="Search team members by name or role..."
                        options={filteredObserverTeamMembers.map((m) => ({
                          id: String(m.id),
                          name: m.name,
                          subtitle: m.role,
                        }))}
                        selectedIds={selectedObserverMemberIds}
                        onChange={setSelectedObserverMemberIds}
                        autoRoleText={
                          observerRoleFilter !== "All Roles" && selectedObserverMemberIds.length === 0
                            ? `All ${observerRoleFilter} members (${filteredObserverTeamMembers.length} observers)`
                            : undefined
                        }
                      />
                    </div>

                    {/* If role is selected and no members picked: show role-wide banner */}
                    {observerRoleFilter !== "All Roles" && selectedObserverMemberIds.length === 0 && (
                      <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs text-blue-900">
                        All <strong>{filteredObserverTeamMembers.length} {observerRoleFilter}</strong> members will observe this task.
                      </div>
                    )}

                    {/* Active observer chips */}
                    {selectedObserverMemberIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {selectedObserverMemberIds.map((id) => {
                          const m = teamMembers.find((tm) => String(tm.id) === id);
                          return (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                            >
                              <span>{m?.name || "Member"}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveObserver(id)}
                                className="ml-0.5 p-0.5 hover:bg-black/5 rounded-full transition-colors cursor-pointer"
                                title="Remove observer"
                              >
                                <X className="w-3 h-3 opacity-60 hover:opacity-100" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 2: TASK STUDIO (Items, Resources, HTML Blocks & Live Preview)
      ───────────────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Studio Header: Title & Switcher (Builder vs Task Preview) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Task Studio
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                  {studioItems.length} {studioItems.length === 1 ? "deliverable" : "deliverables"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {studioTab === "builder"
                  ? "Build and arrange sequential deliverables for your assignees."
                  : "Live preview of how assignees will interact with this task."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Segmented Switcher: Builder vs Preview */}
              <div className="inline-flex p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setStudioTab("builder")}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    studioTab === "builder"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Builder</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStudioTab("preview")}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    studioTab === "preview"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Task Preview</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── SUB-VIEW A: BUILDER ── */}
          {studioTab === "builder" && (
            <div className="space-y-3">
              {studioItems.map((item, index) => (
                <StudioItemCard
                  key={item.id}
                  item={item}
                  index={index}
                  totalItems={studioItems.length}
                  onUpdate={handleUpdateStudioItem}
                  onMove={handleMoveStudioItem}
                  onDelete={handleDeleteStudioItem}
                  onFileUpload={handleItemFileUpload}
                />
              ))}

              {/* Bottom Actions: Add Deliverable at bottom right, styled like Add Section */}
              <div className="flex justify-end pt-2 pb-1">
                <button
                  type="button"
                  onClick={handleAddStudioItem}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Deliverable</span>
                </button>
              </div>
            </div>
          )}

          {/* ── SUB-VIEW B: LIVE TASK PREVIEW ── */}
          {studioTab === "preview" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Preview Mode Callout Banner */}
              <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200/80 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="font-bold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Live Assignee Preview
                  </span>
                  <span className="text-slate-500 truncate hidden sm:inline">
                    &bull; Simulates how assignees interact with this task on their screen
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStudioTab("builder")}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 rounded-lg text-[11px] shrink-0 transition-colors shadow-2xs cursor-pointer"
                >
                  Back to Builder
                </button>
              </div>

              {/* 1. Task Info Block (Single-Column) */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        TSK-PREVIEW
                      </span>
                      {!isAdmin && (
                        <>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                            {selectedPipeline?.name || "Task Pipeline"}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            {stageName}
                          </span>
                        </>
                      )}
                    </div>
                    <h2
                      className="text-base sm:text-lg font-bold text-slate-900 tracking-tight"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {title.trim() || "Untitled Task"}
                    </h2>
                    <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">
                      {description.trim() || "No description provided."}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isImportant && (
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold shrink-0">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>Important</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Metadata: Schedule & Progress */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4 flex-wrap text-slate-600">
                    {!isAdmin && deadlineFormatted && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium">Due {deadlineFormatted}</span>
                      </div>
                    )}
                    {!isAdmin && repeatEnabled && (
                      <div className="flex items-center gap-1.5">
                        <Repeat className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          Repeats every {repeatInterval} {repeatUnit}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progress Ring */}
                  <div className="flex items-center gap-2">
                    <CircularProgressRing
                      value={previewDoneCount}
                      max={studioItems.length}
                      size={24}
                      strokeWidth={3}
                      indicatorColor={
                        previewDoneCount === studioItems.length && studioItems.length > 0
                          ? "#10b981"
                          : "#1456f0"
                      }
                    />
                    <span className="font-mono text-xs font-bold text-slate-800 tabular-nums">
                      {previewDoneCount}/{studioItems.length} items ({previewPercent}%)
                    </span>
                  </div>
                </div>

                {/* Responsible Assignees & Observers */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Responsible:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {currentResponsiblePeople.length > 0 ? (
                        currentResponsiblePeople.map((p, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200/80"
                          >
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{p.name}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic">No assignees selected</span>
                      )}
                    </div>
                  </div>

                  {observers.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Observers:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {observers.map((o) => (
                          <span
                            key={o.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-100"
                          >
                            <Eye className="w-3 h-3 text-blue-500" />
                            <span>{o.name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Deliverables List Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span
                    className="text-xs font-bold uppercase tracking-wider text-slate-500"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Deliverables ({studioItems.length})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Click &ldquo;Mark as done&rdquo; below to test completion
                  </span>
                </div>

                {studioItems.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center text-slate-500 text-xs">
                    No deliverables added yet. Switch to the Builder tab to add items.
                  </div>
                ) : (
                  studioItems.map((item, idx) => {
                    const isDone = Boolean(previewDoneItems[item.id]);

                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl border p-4 transition-all ${
                          isDone
                            ? "bg-emerald-50/40 border-emerald-200"
                            : "bg-white border-slate-200/90 shadow-xs hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono text-[11px] font-bold shrink-0 mt-0.5 ${
                                isDone
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {isDone ? "✓" : idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h4
                                  className={`text-xs font-bold transition-colors ${
                                    isDone ? "line-through text-slate-400" : "text-slate-900"
                                  }`}
                                  style={{ fontFamily: "Outfit, sans-serif" }}
                                >
                                  {item.title || `Item ${idx + 1}`}
                                </h4>
                                {item.isImportant && (
                                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                                )}
                              </div>
                              {item.description && (
                                <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Toggle Done simulation button */}
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewDoneItems((prev) => ({
                                ...prev,
                                [item.id]: !prev[item.id],
                              }));
                              if (!isDone) {
                                toast.success(`Completed "${item.title || "Item"}" (Preview)`);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0 ${
                              isDone
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-white hover:bg-emerald-50 text-slate-700 border border-slate-300 hover:border-emerald-300 hover:text-emerald-700"
                            }`}
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            {isDone ? (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Done</span>
                                <span className="text-[10px] opacity-75 ml-0.5">(Undo)</span>
                              </>
                            ) : (
                              <>
                                <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                                <span>Mark as done</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Rendered resource in Preview */}
                        {item.resourceType !== "none" && item.resourceValue && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            {/* Image */}
                            {item.resourceType === "image" && (
                              <div className="rounded-xl overflow-hidden border border-slate-200 bg-white p-1 max-w-md">
                                <img
                                  src={item.resourceValue}
                                  alt={item.title}
                                  className="w-full max-h-56 object-cover rounded-lg"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              </div>
                            )}

                            {/* Video */}
                            {item.resourceType === "video" && (
                              <div className="rounded-xl overflow-hidden border border-slate-200 bg-black max-w-md">
                                <video
                                  src={item.resourceValue}
                                  controls
                                  className="w-full max-h-56 object-contain"
                                />
                              </div>
                            )}

                            {/* External URL */}
                            {item.resourceType === "url" && (
                              <a
                                href={item.resourceValue}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                              >
                                <span>Open External Resource</span>
                                <LinkIcon className="w-3 h-3" />
                              </a>
                            )}

                            {/* File Attachment Tile */}
                            {item.resourceType === "file" && (
                              <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800">
                                <FileText className="w-4 h-4 text-slate-500" />
                                <span className="font-mono">{item.resourceName || "Attachment"}</span>
                                <span className="text-slate-400 font-mono text-[10px]">
                                  ({item.resourceSize || "Document"})
                                </span>
                                <a
                                  href={item.resourceValue}
                                  download={item.resourceName || "deliverable-file"}
                                  className="p-1 hover:bg-slate-200 rounded-md text-slate-600 ml-1"
                                  title="Download File"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            )}

                            {/* HTML Block Sandbox */}
                            {item.resourceType === "html" && (
                              <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
                                <iframe
                                  srcDoc={item.resourceValue}
                                  sandbox="allow-same-origin"
                                  title="Sandboxed HTML Preview"
                                  className="w-full h-44 border-0 overflow-auto"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </DrawerShell>
  );
}
