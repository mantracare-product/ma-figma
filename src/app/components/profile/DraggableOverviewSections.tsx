import React, { useState, useMemo } from "react";
import {
  GripVertical,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  User,
  Briefcase,
  Workflow,
  Layers,
  FileText,
  Settings as SettingsIcon,
  Globe,
  MapPin,
  Mail,
  Phone,
  PhoneOutgoing,
  Calendar,
  Copy,
  ChevronDown,
  Sparkles,
  Shield,
  Tag,
  FolderPlus,
} from "lucide-react";
import { toast } from "sonner";
import { useFieldRegistry, FieldDefinition, FieldModule } from "../../context/FieldRegistryContext";
import { SelectFieldsModal, CreateFieldModal } from "../help/FieldManager";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export interface OverviewSection {
  id: string;
  title: string;
  description?: string;
  iconName?: "user" | "briefcase" | "workflow" | "layers" | "file-text" | "settings" | "sparkles" | "shield" | "tag";
  isCustom?: boolean;
  fieldKeys: string[];
}

export interface DraggableOverviewSectionsProps {
  mode: "client" | "process";
  client?: any;
  log?: any;
  sections: OverviewSection[];
  onSectionsChange: (sections: OverviewSection[]) => void;
  fieldValues: Record<string, any>;
  onFieldValueChange: (key: string, value: any) => void;
  teamMembers?: string[];
  selectedProcesses?: string[];
  onSelectedProcessesChange?: (processes: string[]) => void;
  availableProcesses?: string[];
  onSaveChanges?: () => void;
  onDiscard?: () => void;
  onNavigateToClient?: (clientId: string) => void;
  customFieldsModule?: FieldModule;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  user: <User className="w-3.5 h-3.5 text-blue-600" />,
  briefcase: <Briefcase className="w-3.5 h-3.5 text-blue-600" />,
  workflow: <Workflow className="w-3.5 h-3.5 text-blue-600" />,
  layers: <Layers className="w-3.5 h-3.5 text-blue-600" />,
  "file-text": <FileText className="w-3.5 h-3.5 text-blue-600" />,
  settings: <SettingsIcon className="w-3.5 h-3.5 text-blue-600" />,
  sparkles: <Sparkles className="w-3.5 h-3.5 text-amber-500" />,
  shield: <Shield className="w-3.5 h-3.5 text-emerald-600" />,
  tag: <Tag className="w-3.5 h-3.5 text-purple-600" />,
};

export default function DraggableOverviewSections({
  mode,
  client,
  log,
  sections,
  onSectionsChange,
  fieldValues,
  onFieldValueChange,
  teamMembers = [
    "Unassigned",
    "John Smith",
    "Emily Davis",
    "Michael Chen",
    "Sarah Johnson",
    "Robert Wilson",
    "Jessica Brown",
    "David Martinez",
  ],
  selectedProcesses = [],
  onSelectedProcessesChange,
  availableProcesses = [
    "Patient Intake",
    "Follow-up Calls",
    "Billing Support",
    "Appointment Scheduling",
    "Insurance Verification",
  ],
  onSaveChanges,
  onDiscard,
  onNavigateToClient,
  customFieldsModule = "client",
}: DraggableOverviewSectionsProps) {
  const { getAllFields } = useFieldRegistry();

  // All custom field definitions
  const allRegistryFields = useMemo(() => {
    return getAllFields(customFieldsModule);
  }, [getAllFields, customFieldsModule]);

  // Section Drag & Drop state
  const [draggedSectionIdx, setDraggedSectionIdx] = useState<number | null>(null);
  const [dragOverSectionIdx, setDragOverSectionIdx] = useState<number | null>(null);

  // Field Drag & Drop state
  const [draggedField, setDraggedField] = useState<{ sectionId: string; index: number } | null>(null);
  const [dragOverField, setDragOverField] = useState<{ sectionId: string; index: number } | null>(null);

  // Editing section title state
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState("");

  // Select field modal state
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [targetSectionIdForField, setTargetSectionIdForField] = useState<string | null>(null);

  // Create field modal state
  const [createFieldModalOpen, setCreateFieldModalOpen] = useState(false);

  // Add section modal state
  const [addSectionModalOpen, setAddSectionModalOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionDescription, setNewSectionDescription] = useState("");
  const [newSectionIcon, setNewSectionIcon] = useState<OverviewSection["iconName"]>("layers");
  const [selectedInitialFields, setSelectedInitialFields] = useState<string[]>([]);

  // Responsible dropdown open state per section
  const [responsibleDropdownOpen, setResponsibleDropdownOpen] = useState(false);

  // Process dropdown open state
  const [processDropdownOpen, setProcessDropdownOpen] = useState(false);

  // Inline copy feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    if (!text || text === "—") return;
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // ── Section Drag & Drop Handlers ───────────────────────────────────────────
  const handleSectionDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", `section:${index}`);
    e.dataTransfer.effectAllowed = "move";
    setDraggedSectionIdx(index);
  };

  const handleSectionDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedField !== null) return; // ignore if dragging a field
    if (draggedSectionIdx === null || draggedSectionIdx === index) return;
    setDragOverSectionIdx(index);
  };

  const handleSectionDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedSectionIdx === null || draggedSectionIdx === targetIndex) {
      setDraggedSectionIdx(null);
      setDragOverSectionIdx(null);
      return;
    }
    const updated = [...sections];
    const [moved] = updated.splice(draggedSectionIdx, 1);
    updated.splice(targetIndex, 0, moved);
    onSectionsChange(updated);
    setDraggedSectionIdx(null);
    setDragOverSectionIdx(null);
    toast.success("Sections reordered");
  };

  // ── Field Drag & Drop Handlers ─────────────────────────────────────────────
  const handleFieldDragStart = (e: React.DragEvent, sectionId: string, index: number) => {
    e.stopPropagation();
    e.dataTransfer.setData("text/plain", `field:${sectionId}:${index}`);
    e.dataTransfer.effectAllowed = "move";
    setDraggedField({ sectionId, index });
  };

  const handleFieldDragOver = (e: React.DragEvent, sectionId: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedField) return;
    if (draggedField.sectionId === sectionId && draggedField.index === index) return;
    setDragOverField({ sectionId, index });
  };

  const handleFieldDrop = (e: React.DragEvent, targetSectionId: string, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedField) return;

    const updated = sections.map((sec) => ({ ...sec, fieldKeys: [...sec.fieldKeys] }));
    const sourceSection = updated.find((s) => s.id === draggedField.sectionId);
    const targetSection = updated.find((s) => s.id === targetSectionId);

    if (sourceSection && targetSection) {
      if (sourceSection.id === targetSection.id) {
        const [movedKey] = sourceSection.fieldKeys.splice(draggedField.index, 1);
        sourceSection.fieldKeys.splice(targetIndex, 0, movedKey);
      } else {
        const [movedKey] = sourceSection.fieldKeys.splice(draggedField.index, 1);
        targetSection.fieldKeys.splice(targetIndex, 0, movedKey);
      }
      onSectionsChange(updated);
      toast.success("Field reordered");
    }

    setDraggedField(null);
    setDragOverField(null);
  };

  // ── Section Actions ────────────────────────────────────────────────────────
  const handleOpenSelectFieldForSection = (sectionId: string) => {
    setTargetSectionIdForField(sectionId);
    setFieldModalOpen(true);
  };

  const handleApplySelectedFields = (selectedKeys: string[]) => {
    if (!targetSectionIdForField) return;
    const updated = sections.map((sec) => {
      if (sec.id === targetSectionIdForField) {
        // Add any newly selected keys that aren't already in this section
        const existingSet = new Set(sec.fieldKeys);
        const newKeys = [...sec.fieldKeys];
        selectedKeys.forEach((k) => {
          if (!existingSet.has(k)) {
            newKeys.push(k);
            existingSet.add(k);
          }
        });
        return { ...sec, fieldKeys: newKeys };
      }
      return sec;
    });
    onSectionsChange(updated);
  };

  const handleRemoveFieldFromSection = (sectionId: string, fieldKey: string) => {
    const updated = sections.map((sec) => {
      if (sec.id === sectionId) {
        return { ...sec, fieldKeys: sec.fieldKeys.filter((k) => k !== fieldKey) };
      }
      return sec;
    });
    onSectionsChange(updated);
    toast.success("Field removed from section");
  };

  const handleDeleteSection = (sectionId: string) => {
    const target = sections.find((s) => s.id === sectionId);
    if (!target) return;
    onSectionsChange(sections.filter((s) => s.id !== sectionId));
    toast.success(`Section "${target.title}" deleted`);
  };

  const handleSaveSectionTitle = (sectionId: string) => {
    if (!editingSectionTitle.trim()) {
      setEditingSectionId(null);
      return;
    }
    const updated = sections.map((sec) => {
      if (sec.id === sectionId) {
        return { ...sec, title: editingSectionTitle.trim() };
      }
      return sec;
    });
    onSectionsChange(updated);
    setEditingSectionId(null);
    toast.success("Section renamed");
  };

  const handleCreateSection = () => {
    if (!newSectionTitle.trim()) {
      toast.error("Please enter a section name");
      return;
    }
    const newSectionId = `sec-${Date.now()}`;
    const newSection: OverviewSection = {
      id: newSectionId,
      title: newSectionTitle.trim(),
      description: newSectionDescription.trim() || undefined,
      iconName: "layers",
      isCustom: true,
      fieldKeys: [],
    };
    onSectionsChange([...sections, newSection]);
    setNewSectionTitle("");
    setNewSectionDescription("");
    setAddSectionModalOpen(false);
    toast.success(`Section "${newSection.title}" created`);

    // Automatically open the Add Field modal for this new section
    setTargetSectionIdForField(newSectionId);
    setFieldModalOpen(true);
  };

  // ── Render Individual Field Row ────────────────────────────────────────────
  const renderFieldInput = (key: string, sectionId: string, index: number) => {
    const isFieldDragged = draggedField?.sectionId === sectionId && draggedField?.index === index;
    const isFieldDragOver = dragOverField?.sectionId === sectionId && dragOverField?.index === index;

    // Look up custom field metadata if exists
    const regField = allRegistryFields.find((f) => f.key === key);
    const label = regField?.label || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    return (
      <div
        key={key}
        draggable
        onDragStart={(e) => handleFieldDragStart(e, sectionId, index)}
        onDragOver={(e) => handleFieldDragOver(e, sectionId, index)}
        onDrop={(e) => handleFieldDrop(e, sectionId, index)}
        className={`group relative rounded-lg transition-all ${
          isFieldDragged
            ? "opacity-30 border-2 border-dashed border-blue-400"
            : isFieldDragOver
            ? "bg-blue-50/70 border border-blue-300 ring-2 ring-blue-400/20"
            : "hover:bg-slate-50/70"
        } p-2`}
      >
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-500 transition-colors p-0.5"
              title="Drag to reorder field"
            >
              <GripVertical className="w-3 h-3" />
            </span>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              {label}
            </label>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => handleRemoveFieldFromSection(sectionId, key)}
              className="p-0.5 text-slate-300 hover:text-rose-500 rounded transition-colors cursor-pointer"
              title="Remove field from section"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Input Rendering by Key / Type */}
        {key === "name" || key === "client_name" ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={fieldValues[key] || ""}
              onChange={(e) => onFieldValueChange(key, e.target.value)}
              placeholder="Enter full name"
              className="w-full px-3 py-1.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
            {onNavigateToClient && client?.id && (
              <button
                type="button"
                onClick={() => onNavigateToClient(client.id)}
                className="text-[11px] text-blue-600 hover:underline shrink-0 font-medium whitespace-nowrap"
              >
                Profile →
              </button>
            )}
          </div>
        ) : key === "email" || key === "email_id" ? (
          <div className="flex items-center justify-between bg-slate-50/70 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium">
            <input
              type="email"
              value={fieldValues[key] || ""}
              onChange={(e) => onFieldValueChange(key, e.target.value)}
              placeholder="client@email.com"
              className="w-full bg-transparent text-xs text-slate-800 focus:outline-none"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
            <button
              type="button"
              onClick={() => handleCopy(fieldValues[key] || "", "Email")}
              className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors shrink-0 cursor-pointer"
              title="Copy email"
            >
              {copiedKey === "Email" ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Mail className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        ) : key === "phone" ? (
          <div className="flex items-center justify-between bg-slate-50/70 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium">
            <input
              type="tel"
              value={fieldValues[key] || ""}
              onChange={(e) => onFieldValueChange(key, e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full bg-transparent text-xs text-slate-800 focus:outline-none"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
            <button
              type="button"
              onClick={() => handleCopy(fieldValues[key] || "", "Phone number")}
              className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors shrink-0 cursor-pointer"
              title="Copy phone"
            >
              {copiedKey === "Phone number" ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <PhoneOutgoing className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        ) : key === "location" ? (
          <div className="flex items-center gap-1.5 bg-slate-50/70 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <input
              type="text"
              value={fieldValues[key] || ""}
              onChange={(e) => onFieldValueChange(key, e.target.value)}
              placeholder="City, State"
              className="w-full bg-transparent text-xs text-slate-800 focus:outline-none"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
          </div>
        ) : key === "country" ? (
          <div className="flex items-center gap-1.5 bg-slate-50/70 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Globe className="w-3 h-3 text-slate-400 shrink-0" />
            <input
              type="text"
              value={fieldValues[key] || ""}
              onChange={(e) => onFieldValueChange(key, e.target.value)}
              placeholder="Country"
              className="w-full bg-transparent text-xs text-slate-800 focus:outline-none"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
          </div>
        ) : key === "status" ? (
          <select
            value={fieldValues[key] || "Active"}
            onChange={(e) => onFieldValueChange(key, e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        ) : key === "responsible" ? (
          <div className="relative">
            <div
              onClick={() => setResponsibleDropdownOpen(!responsibleDropdownOpen)}
              className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-1.5 cursor-pointer hover:border-blue-400 transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                  {(fieldValues[key] || "Unassigned").charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-slate-800">
                  {fieldValues[key] || "Unassigned"}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {responsibleDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setResponsibleDropdownOpen(false)}
                />
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-slate-200 py-1 overflow-hidden">
                  {teamMembers.map((person) => (
                    <button
                      key={person}
                      type="button"
                      onClick={() => {
                        onFieldValueChange(key, person);
                        setResponsibleDropdownOpen(false);
                        toast.success(`Assigned to ${person}`);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                        {person.charAt(0)}
                      </div>
                      <span className="text-xs font-medium text-slate-800">{person}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : key === "processes" ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {selectedProcesses && selectedProcesses.length > 0 ? (
              selectedProcesses.map((proc, pIdx) => (
                <div
                  key={pIdx}
                  className="group relative inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-lg shadow-2xs select-none"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <span>{proc}</span>
                  {onSelectedProcessesChange && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = selectedProcesses.filter((_, i) => i !== pIdx);
                        onSelectedProcessesChange(updated);
                        toast.success(`${proc} removed`);
                      }}
                      className="w-3.5 h-3.5 rounded-full hover:bg-blue-200 flex items-center justify-center text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">No processes assigned</span>
            )}

            {onSelectedProcessesChange && (
              <DropdownMenu open={processDropdownOpen} onOpenChange={setProcessDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="px-2 py-0.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <Plus className="w-3 h-3" /> Add Process
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {availableProcesses
                    .filter((p) => !selectedProcesses.includes(p))
                    .map((proc) => (
                      <DropdownMenuItem
                        key={proc}
                        onClick={() => {
                          onSelectedProcessesChange([...selectedProcesses, proc]);
                          toast.success(`${proc} added`);
                          setProcessDropdownOpen(false);
                        }}
                      >
                        {proc}
                      </DropdownMenuItem>
                    ))}
                  {availableProcesses.filter((p) => !selectedProcesses.includes(p)).length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">All processes assigned</div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ) : regField?.inputType === "select" ? (
          <select
            value={fieldValues[key] || ""}
            onChange={(e) => onFieldValueChange(key, e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="Organic">Organic</option>
            <option value="Paid">Paid</option>
            <option value="Referral">Referral</option>
            <option value="Web">Web</option>
            <option value="Other">Other</option>
          </select>
        ) : (
          <input
            type={
              regField?.inputType === "email"
                ? "email"
                : regField?.inputType === "tel"
                ? "tel"
                : regField?.inputType === "date"
                ? "date"
                : regField?.inputType === "number"
                ? "number"
                : "text"
            }
            value={fieldValues[key] || ""}
            onChange={(e) => onFieldValueChange(key, e.target.value)}
            placeholder={regField?.placeholder || `Enter ${label.toLowerCase()}`}
            className="w-full px-3 py-1.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            style={{ fontFamily: "Outfit, sans-serif" }}
          />
        )}
      </div>
    );
  };

  // ── Render All Sections ───────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Sections List */}
      <div className="space-y-4">
        {sections.map((section, sIdx) => {
          const isSectionDragged = draggedSectionIdx === sIdx;
          const isSectionDragOver = dragOverSectionIdx === sIdx;
          const isEditingThisTitle = editingSectionId === section.id;

          return (
            <div
              key={section.id}
              draggable
              onDragStart={(e) => handleSectionDragStart(e, sIdx)}
              onDragOver={(e) => handleSectionDragOver(e, sIdx)}
              onDrop={(e) => handleSectionDrop(e, sIdx)}
              className={`bg-white rounded-xl border transition-all shadow-xs overflow-hidden ${
                isSectionDragged
                  ? "opacity-30 border-2 border-dashed border-blue-500"
                  : isSectionDragOver
                  ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {/* Section Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Grip Handle for Section Reordering */}
                  <span
                    className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-600 transition-colors p-1 -ml-1 rounded"
                    title="Drag to reorder this section"
                  >
                    <GripVertical className="w-4 h-4" />
                  </span>

                  {/* Section Title (Inline Editable) */}
                  {isEditingThisTitle ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editingSectionTitle}
                        onChange={(e) => setEditingSectionTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveSectionTitle(section.id);
                          if (e.key === "Escape") setEditingSectionId(null);
                        }}
                        autoFocus
                        className="text-xs font-bold px-2 py-0.5 border border-blue-500 rounded bg-white text-slate-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveSectionTitle(section.id)}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                        title="Save title"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSectionId(null)}
                        className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3
                          className="text-xs font-bold text-slate-700 uppercase tracking-wider truncate"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {section.title}
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSectionId(section.id);
                            setEditingSectionTitle(section.title);
                          }}
                          className="p-0.5 text-slate-300 hover:text-slate-600 rounded opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                          title="Rename section"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                      {section.description && (
                        <p className="text-[11px] text-slate-400 font-normal leading-tight truncate">
                          {section.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Section Action Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Delete Section Button */}
                  {(section.isCustom || sections.length > 1) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSection(section.id)}
                      className="p-1 text-slate-300 hover:text-rose-500 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete section"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Section Fields Area (Draggable & Droppable) */}
              <div
                className="p-3 space-y-1 bg-white min-h-[50px]"
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggedField && section.fieldKeys.length === 0) {
                    setDragOverField({ sectionId: section.id, index: 0 });
                  }
                }}
                onDrop={(e) => {
                  if (draggedField && section.fieldKeys.length === 0) {
                    handleFieldDrop(e, section.id, 0);
                  }
                }}
              >
                {section.fieldKeys.length === 0 ? (
                  <div className="py-5 px-3 flex items-center justify-between border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                    <p className="text-xs text-slate-400 font-medium">
                      No fields in this section yet
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenSelectFieldForSection(section.id)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <Plus className="w-3 h-3" /> Add Field
                    </button>
                  </div>
                ) : (
                  <>
                    {section.fieldKeys.map((key, fIdx) => renderFieldInput(key, section.id, fIdx))}
                    <div className="flex justify-end pt-2 pb-0.5 px-1">
                      <button
                        type="button"
                        onClick={() => handleOpenSelectFieldForSection(section.id)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 transition-colors cursor-pointer bg-transparent p-0"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Field</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Section Button (At the bottom right of sections column) */}
      <div className="flex justify-end pt-1 px-1">
        <button
          type="button"
          onClick={() => setAddSectionModalOpen(true)}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 transition-colors cursor-pointer bg-transparent p-0"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Section</span>
        </button>
      </div>

      {/* ── Select Fields Modal ────────────────────────────────────────────── */}
      {fieldModalOpen && (
        <SelectFieldsModal
          initiallySelected={
            sections.find((s) => s.id === targetSectionIdForField)?.fieldKeys || []
          }
          onClose={() => {
            setFieldModalOpen(false);
            setTargetSectionIdForField(null);
          }}
          onApply={handleApplySelectedFields}
        />
      )}

      {/* ── Create Custom Field Modal ──────────────────────────────────────── */}
      {createFieldModalOpen && (
        <CreateFieldModal
          lockModule={customFieldsModule}
          onClose={() => setCreateFieldModalOpen(false)}
          onCreated={(newField) => {
            if (targetSectionIdForField) {
              handleApplySelectedFields([newField.key]);
            }
          }}
        />
      )}

      {/* ── Add Section Modal ──────────────────────────────────────────────── */}
      {addSectionModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[600]"
            onClick={() => setAddSectionModalOpen(false)}
          />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl p-6 shadow-2xl z-[601] w-[460px] max-w-[92vw] space-y-4"
            style={{ fontFamily: "Outfit, sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Add New Section</h3>
                  <p className="text-[11px] text-slate-400">
                    Create a customized group for organizing fields
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddSectionModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Section Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Section Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="e.g. Clinical Records, Billing & Insurance, Emergency Info"
                  autoFocus
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Section Description */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Description <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={newSectionDescription}
                  onChange={(e) => setNewSectionDescription(e.target.value)}
                  placeholder="Briefly describe what information this section contains..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAddSectionModalOpen(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateSection}
                className="flex-1 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Create Section
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
