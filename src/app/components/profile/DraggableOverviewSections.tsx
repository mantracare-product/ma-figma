import React, { useState, useMemo, useEffect } from "react";
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
  Star,
  Link as LinkIcon,
  ExternalLink,
  Paperclip,
  Clock,
  DollarSign,
  Table as TableIcon,
  PanelRight,
  ArrowRight,
  PenTool,
  Eraser,
} from "lucide-react";
import { toast } from "sonner";
import { useFieldRegistry, FieldDefinition, SectionDefinition, FieldModule, isFieldMatchingOrg, isSectionMatchingOrg, SectionPermissions, CURRENCY_SYMBOLS } from "../../context/FieldRegistryContext";
import { useOrganization } from "../../context/OrganizationContext";
import { getStoredProcesses, Process, PROCESS_STORE_EVENT } from "../../../lib/useProcessStore";
import { SelectFieldsModal, CreateFieldModal } from "../help/FieldManager";
import { AdminSectionDrawer } from "../../pages/admin/components/AdminSectionDrawer";
import { AdminFieldDrawer } from "../../pages/admin/components/AdminFieldDrawer";
import { InfoTooltip } from "../help/InfoTooltip";
import { FieldInputRenderer } from "../fields/FieldInputRenderer";
import { RichTextEditor } from "../fields/RichTextEditor";
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
  permissions?: SectionPermissions;
}

export interface DraggableOverviewSectionsProps {
  mode: "client" | "process" | "scribe";
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
  highlightRequiredKeys?: string[];
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

const SignatureDrawingPad: React.FC<{
  value?: string;
  onChange: (val: string) => void;
  label: string;
}> = ({ value, onChange, label }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isEditing, setIsEditing] = useState(!value);

  React.useEffect(() => {
    setIsEditing(!value);
  }, [value]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL("image/png"));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onChange("");
  };

  if (!isEditing && value) {
    return (
      <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <PenTool className="w-3.5 h-3.5 text-blue-600" />
            {label}
          </span>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            Redraw
          </button>
        </div>
        <div className="border border-slate-100 rounded-lg p-2 bg-slate-50/50 flex items-center justify-center min-h-[70px]">
          <img src={value} alt="Signature" className="max-h-16 object-contain" />
        </div>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
          <PenTool className="w-3.5 h-3.5 text-blue-600" />
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearCanvas}
            className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 font-medium transition-colors cursor-pointer"
          >
            <Eraser className="w-3 h-3" /> Clear
          </button>
          {value && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
            >
              Done
            </button>
          )}
        </div>
      </div>
      <div className="relative p-2 bg-white">
        <canvas
          ref={canvasRef}
          width={360}
          height={90}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-[90px] bg-slate-50/60 rounded-lg border border-dashed border-slate-200 cursor-crosshair touch-none"
        />
        {!hasDrawn && !value && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-slate-400 italic">
            Draw signature / sketch here...
          </div>
        )}
      </div>
    </div>
  );
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
  highlightRequiredKeys = [],
}: DraggableOverviewSectionsProps) {
  const { getAllFields, getAllSections, addCustomSection, updateCustomSection, deleteCustomSection, updateCustomField } = useFieldRegistry();
  const { activeOrganization } = useOrganization();

  const [allProcesses, setAllProcesses] = useState<Process[]>(getStoredProcesses);

  useEffect(() => {
    const handleUpdate = () => setAllProcesses(getStoredProcesses());
    window.addEventListener(PROCESS_STORE_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(PROCESS_STORE_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const activeProcessName = useMemo(() => {
    return (
      log?.process ||
      log?.processName ||
      (selectedProcesses && selectedProcesses[0]) ||
      (client?.processes && client.processes[0]) ||
      ""
    );
  }, [log, selectedProcesses, client]);

  const activeProcessObj = useMemo(() => {
    if (!activeProcessName) return undefined;
    return allProcesses.find(
      (p) =>
        p.name.toLowerCase() === activeProcessName.toLowerCase() ||
        p.id === activeProcessName
    );
  }, [allProcesses, activeProcessName]);

  const activeProcessStages = useMemo(() => {
    if (!activeProcessObj || !activeProcessObj.stages) return undefined;
    return activeProcessObj.stages.map((st) => ({ id: st.name, name: st.name, color: st.color }));
  }, [activeProcessObj]);

  const SYSTEM_FIELD_KEYS = useMemo(() => new Set([
    "name", "email", "phone", "location", "country",
    "company", "role", "status", "processes", "stage",
    "responsible", "lastContact", "companyName", "jobPosition"
  ]), []);

  const SYSTEM_SEC_IDS = useMemo(() => new Set([
    "sec-client-details",
    "sec-general-info",
    "sec-company-details",
    "sec-company-role",
    "sec-process-pipeline",
  ]), []);

  // All custom field definitions filtered by organization scope and process context
  const allRegistryFields = useMemo(() => {
    const procId = activeProcessObj?.id || activeProcessName;
    return getAllFields(customFieldsModule).filter((f) => isFieldMatchingOrg(f, activeOrganization, procId));
  }, [getAllFields, customFieldsModule, activeOrganization, activeProcessObj, activeProcessName]);

  // All custom sections registered in current module filtered by organization scope and process context
  const allCustomSections = useMemo(() => {
    const procId = activeProcessObj?.id || activeProcessName;
    return getAllSections(customFieldsModule).filter((s) => isSectionMatchingOrg(s, activeOrganization, procId));
  }, [getAllSections, customFieldsModule, activeOrganization, activeProcessObj, activeProcessName]);

  const allowedFieldKeys = useMemo(() => {
    return new Set(allRegistryFields.map((f) => f.key));
  }, [allRegistryFields]);

  const matchingCustomSecIds = useMemo(() => {
    return new Set(allCustomSections.map((s) => s.id));
  }, [allCustomSections]);

  // User explicitly added field keys in this record view
  const [userAddedFieldKeys, setUserAddedFieldKeys] = useState<Set<string>>(new Set());

  // Sections and their fields filtered strictly according to activeOrganization scope and showAlways settings
  const visibleSections = useMemo(() => {
    const procId = activeProcessObj?.id || activeProcessName;
    return sections
      .filter((sec) => {
        if (!sec.isCustom || SYSTEM_SEC_IDS.has(sec.id)) return true;
        return matchingCustomSecIds.has(sec.id) || isSectionMatchingOrg(sec as any, activeOrganization, procId);
      })
      .map((sec) => ({
        ...sec,
        fieldKeys: (sec.fieldKeys || []).filter((k) => {
          if (SYSTEM_FIELD_KEYS.has(k)) return true;
          if (!allowedFieldKeys.has(k)) return false;

          // If showAlways is false (turned off), do NOT show in section unless it has a value on this record or was added via + Add Field popup
          const regField = allRegistryFields.find((f) => f.key === k);
          if (regField && regField.showAlways === false) {
            const scopedKey = `${sec.id}_${k}`;
            const val = fieldValues[scopedKey] !== undefined ? fieldValues[scopedKey] : fieldValues[k];
            const hasVal = val !== undefined && val !== null && val !== "" && (!Array.isArray(val) || val.length > 0);
            if (!hasVal && !userAddedFieldKeys.has(k)) {
              return false;
            }
          }

          return true;
        }),
      }));
  }, [sections, matchingCustomSecIds, allowedFieldKeys, activeOrganization, SYSTEM_SEC_IDS, SYSTEM_FIELD_KEYS, activeProcessObj, activeProcessName, allRegistryFields, fieldValues, userAddedFieldKeys]);

  // User custom option additions per field
  const [newOptionInputs, setNewOptionInputs] = useState<Record<string, string>>({});

  const handleAddOptionToField = (fieldDef: FieldDefinition) => {
    const inputVal = (newOptionInputs[fieldDef.key] || "").trim();
    if (!inputVal) return;
    const newOptValue = inputVal.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const existingOptions = fieldDef.options || [];
    if (existingOptions.some((o) => o.value === newOptValue || o.label.toLowerCase() === inputVal.toLowerCase())) {
      toast.error("Option already exists");
      return;
    }
    const updatedOptions = [
      ...existingOptions,
      { id: Date.now(), label: inputVal, value: newOptValue },
    ];
    updateCustomField(customFieldsModule, fieldDef.id, { options: updatedOptions });
    onFieldValueChange(fieldDef.key, newOptValue);
    setNewOptionInputs((prev) => ({ ...prev, [fieldDef.key]: "" }));
    toast.success(`Option "${inputVal}" added`);
  };

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

  // Edit field modal state
  const [editingFieldDef, setEditingFieldDef] = useState<FieldDefinition | null>(null);

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

  // ── Drag & Drop Section Reordering ─────────────────────────────────────────
  const handleSectionDragStart = (e: React.DragEvent, index: number) => {
    setDraggedSectionIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleSectionDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverSectionIdx !== index) {
      setDragOverSectionIdx(index);
    }
  };

  const handleSectionDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedSectionIdx === null || draggedSectionIdx === dropIndex) {
      setDraggedSectionIdx(null);
      setDragOverSectionIdx(null);
      return;
    }
    const updated = [...visibleSections];
    const [moved] = updated.splice(draggedSectionIdx, 1);
    updated.splice(dropIndex, 0, moved);
    onSectionsChange(updated);
    setDraggedSectionIdx(null);
    setDragOverSectionIdx(null);
    toast.success("Sections reordered");
  };

  const handleSectionDragEnd = () => {
    setDraggedSectionIdx(null);
    setDragOverSectionIdx(null);
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
    setUserAddedFieldKeys((prev) => {
      const next = new Set(prev);
      selectedKeys.forEach((k) => next.add(k));
      return next;
    });

    const targetSec = sections.find((s) => s.id === targetSectionIdForField);
    const existingSet = new Set(targetSec?.fieldKeys || []);
    const newKeys = [...(targetSec?.fieldKeys || [])];
    selectedKeys.forEach((k) => {
      if (!existingSet.has(k)) {
        newKeys.push(k);
        existingSet.add(k);
      }
    });

    const updated = sections.map((sec) => {
      if (sec.id === targetSectionIdForField) {
        return { ...sec, fieldKeys: newKeys };
      }
      return sec;
    });
    onSectionsChange(updated);
    if (targetSec?.isCustom) {
      updateCustomSection(customFieldsModule, targetSectionIdForField, { fieldKeys: newKeys });
    }
  };

  const handleRemoveFieldFromSection = (sectionId: string, fieldKey: string) => {
    setUserAddedFieldKeys((prev) => {
      const next = new Set(prev);
      next.delete(fieldKey);
      return next;
    });
    const targetSec = sections.find((s) => s.id === sectionId);
    const updatedKeys = (targetSec?.fieldKeys || []).filter((k) => k !== fieldKey);
    const updated = sections.map((sec) => {
      if (sec.id === sectionId) {
        return { ...sec, fieldKeys: updatedKeys };
      }
      return sec;
    });
    onSectionsChange(updated);
    if (targetSec?.isCustom) {
      updateCustomSection(customFieldsModule, sectionId, { fieldKeys: updatedKeys });
    }
    toast.success("Field removed from section");
  };

  const handleDeleteSection = (sectionId: string) => {
    const target = sections.find((s) => s.id === sectionId);
    if (!target) return;
    deleteCustomSection(customFieldsModule, sectionId);
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
    updateCustomSection(customFieldsModule, sectionId, { title: editingSectionTitle.trim() });
    onSectionsChange(updated);
    setEditingSectionId(null);
    toast.success("Section renamed");
  };

  const handleCreateSection = () => {
    if (!newSectionTitle.trim()) {
      toast.error("Please enter a section name");
      return;
    }
    const registered = addCustomSection(customFieldsModule, {
      title: newSectionTitle.trim(),
      description: newSectionDescription.trim() || undefined,
      module: customFieldsModule,
      iconName: newSectionIcon || "layers",
      fieldKeys: selectedInitialFields || [],
      processIds: (customFieldsModule === "process" && (activeProcessObj?.id || activeProcessName)) ? [activeProcessObj?.id || activeProcessName] : undefined,
      source: "custom",
      createdIn: "client",
    });

    const newSection: OverviewSection & Partial<SectionDefinition> = {
      id: registered.id,
      title: registered.title,
      description: registered.description,
      iconName: (registered.iconName as any) || "layers",
      isCustom: true,
      fieldKeys: selectedInitialFields || [],
      processIds: registered.processIds,
      scopingRules: registered.scopingRules,
      module: registered.module,
      source: registered.source,
      permissions: registered.permissions,
    };
    onSectionsChange([...sections, newSection]);
    setNewSectionTitle("");
    setNewSectionDescription("");
    setSelectedInitialFields([]);
    setAddSectionModalOpen(false);
    toast.success(`Section "${newSection.title}" created`);

    // Automatically open the Add Field modal for this new section
    setTargetSectionIdForField(registered.id);
    setFieldModalOpen(true);
  };

  // ── Render Individual Field Row ────────────────────────────────────────────
  const renderFieldInput = (key: string, sectionId: string, index: number) => {
    const isFieldDragged = draggedField?.sectionId === sectionId && draggedField?.index === index;
    const isFieldDragOver = dragOverField?.sectionId === sectionId && dragOverField?.index === index;

    // Support section-scoped field values (e.g. sec-medication-1_med_name)
    const scopedKey = `${sectionId}_${key}`;
    const valueKey = fieldValues[scopedKey] !== undefined ? scopedKey : key;
    const rawVal = fieldValues[valueKey] !== undefined ? fieldValues[valueKey] : fieldValues[key];

    // Look up custom field metadata if exists
    const regField = allRegistryFields.find((f) => f.key === key);

    // Compute effective value pre-filled with defaultValue if unedited
    const isTableWithEmptyVal = regField?.inputType === "table" && (!rawVal || (Array.isArray(rawVal) && rawVal.length === 0));
    const effectiveVal = (rawVal !== undefined && !isTableWithEmptyVal)
      ? rawVal
      : (regField?.defaultValue && typeof regField.defaultValue === "object" && "mode" in regField.defaultValue && regField.defaultValue.mode === "today")
      ? new Date().toISOString().split("T")[0]
      : regField?.defaultValue;

    const setVal = (newVal: any) => {
      if (fieldValues[scopedKey] !== undefined || key.startsWith("med_")) {
        onFieldValueChange(scopedKey, newVal);
      } else {
        onFieldValueChange(key, newVal);
      }
      try {
        window.dispatchEvent(new CustomEvent("ma_record_data_changed"));
      } catch {}
    };

    // If not a system field AND not in allRegistryFields (which is filtered by activeOrganization), do NOT render!
    if (!SYSTEM_FIELD_KEYS.has(key) && !regField) {
      return null;
    }

    const label = regField?.label || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    const isRequiredMissing = highlightRequiredKeys.includes(key);

    return (
      <div
        key={`${sectionId}-${key}-${index}`}
        draggable
        onDragStart={(e) => handleFieldDragStart(e, sectionId, index)}
        onDragOver={(e) => handleFieldDragOver(e, sectionId, index)}
        onDrop={(e) => handleFieldDrop(e, sectionId, index)}
        className={`group relative rounded-lg transition-all ${
          isFieldDragged
            ? "opacity-30 border-2 border-dashed border-blue-400"
            : isFieldDragOver
            ? "bg-blue-50/70 border border-blue-300 ring-2 ring-blue-400/20"
            : isRequiredMissing
            ? "bg-amber-50/40 border border-amber-300 shadow-2xs"
            : "hover:bg-slate-50/70"
        } p-2`}
      >
        <div className="flex items-center justify-between gap-1.5 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-500 transition-colors p-0.5"
              title="Drag to reorder field"
            >
              <GripVertical className="w-3 h-3" />
            </span>
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider truncate flex items-center gap-1">
              <span>{label}</span>
              {regField?.tooltip && (
                <InfoTooltip text={regField.tooltip} size="sm" />
              )}
              {regField?.required && <span className="text-red-500 font-bold">*</span>}
              {isRequiredMissing && (
                <span className="text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded shadow-2xs tracking-normal">
                  Required
                </span>
              )}
            </label>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {regField && regField.permissions?.canEdit !== false && (
              <button
                type="button"
                onClick={() => setEditingFieldDef(regField)}
                className="p-0.5 text-slate-300 hover:text-blue-600 hover:rotate-45 rounded transition-all cursor-pointer"
                title="Edit field configuration"
              >
                <SettingsIcon className="w-3 h-3" />
              </button>
            )}
            {regField?.permissions?.canHide !== false && (
              <button
                type="button"
                onClick={() => handleRemoveFieldFromSection(sectionId, key)}
                className="p-0.5 text-slate-300 hover:text-rose-500 rounded transition-colors cursor-pointer"
                title="Remove field from section"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Input Rendering by Key / Type */}
        {key === "name" || key === "client_name" ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={rawVal || ""}
              onChange={(e) => setVal(e.target.value)}
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
              value={rawVal || ""}
              onChange={(e) => setVal(e.target.value)}
              placeholder="client@email.com"
              className="w-full bg-transparent text-xs text-slate-800 focus:outline-none"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
            <button
              type="button"
              onClick={() => handleCopy(rawVal || "", "Email")}
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
              value={rawVal || ""}
              onChange={(e) => setVal(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full bg-transparent text-xs text-slate-800 focus:outline-none"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
            <button
              type="button"
              onClick={() => handleCopy(rawVal || "", "Phone number")}
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
              value={rawVal || ""}
              onChange={(e) => setVal(e.target.value)}
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
              value={rawVal || ""}
              onChange={(e) => setVal(e.target.value)}
              placeholder="Country"
              className="w-full bg-transparent text-xs text-slate-800 focus:outline-none"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
          </div>
        ) : key === "status" ? (
          <select
            value={rawVal || "Active"}
            onChange={(e) => setVal(e.target.value)}
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
                  {(rawVal || "Unassigned").charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-slate-800">
                  {rawVal || "Unassigned"}
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
                        setVal(person);
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
                  <button
                    type="button"
                    onClick={() => {
                      const updated = selectedProcesses.filter((_, i) => i !== pIdx);
                      onSelectedProcessesChange(updated);
                    }}
                    className="w-3.5 h-3.5 rounded-full hover:bg-blue-100 flex items-center justify-center text-blue-400 hover:text-blue-700 transition-colors cursor-pointer"
                    title="Remove process"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))
            ) : (
              <span className="text-xs text-muted-foreground italic">No processes assigned</span>
            )}

            {availableProcesses.length > 0 && (
              <DropdownMenu open={processDropdownOpen} onOpenChange={setProcessDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-2 py-0.5 border border-dashed border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 text-xs rounded-md font-medium transition-colors cursor-pointer"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Assign</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
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
        ) : key === "prescribed_medications" || key === "medications" ? (
          <div className="space-y-3">
            {(() => {
              let medsList: any[] = [];
              if (Array.isArray(rawVal)) {
                medsList = rawVal;
              } else if (typeof rawVal === "string" && rawVal.trim()) {
                try {
                  const parsed = JSON.parse(rawVal);
                  if (Array.isArray(parsed)) medsList = parsed;
                } catch {
                  medsList = rawVal
                    .split("\n")
                    .filter((l: string) => l.trim())
                    .map((l: string, idx: number) => {
                      const parts = l.replace(/^\d+\.\s*/, "").split(/[|()\-]+/).map((s: string) => s.trim());
                      return {
                        id: `med-${idx + 1}`,
                        name: parts[0] || "Paracetamol",
                        strength: parts[1] || "500 mg",
                        form: parts[2] || "Tablet",
                        dosage: parts[3] || "1 tablet",
                        frequency: parts[4] || "Up to 3 times/day as needed",
                        duration: parts[5] || "3 days",
                      };
                    });
                }
              }

              if (medsList.length === 0) {
                medsList = [
                  {
                    id: "med-1",
                    name: "Paracetamol",
                    strength: "500 mg",
                    form: "Tablet",
                    dosage: "1 tablet",
                    frequency: "Up to 3 times/day as needed",
                    duration: "3 days",
                  },
                ];
              }

              return (
                <div className="space-y-3">
                  {medsList.map((med: any, mIdx: number) => (
                    <div
                      key={med.id || mIdx}
                      className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2.5 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                          <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-[10px] font-bold">
                            {mIdx + 1}
                          </span>
                          <span>Medication {mIdx + 1}</span>
                        </div>
                        {medsList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = medsList.filter((_: any, i: number) => i !== mIdx);
                              setVal(updated);
                              toast.success(`Medication ${mIdx + 1} removed`);
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remove medication"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                            Medicine Name
                          </label>
                          <input
                            type="text"
                            value={med.name || ""}
                            onChange={(e) => {
                              const updated = [...medsList];
                              updated[mIdx] = { ...updated[mIdx], name: e.target.value };
                              setVal(updated);
                            }}
                            placeholder="e.g. Paracetamol, Cetirizine"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                            Strength
                          </label>
                          <input
                            type="text"
                            value={med.strength || ""}
                            onChange={(e) => {
                              const updated = [...medsList];
                              updated[mIdx] = { ...updated[mIdx], strength: e.target.value };
                              setVal(updated);
                            }}
                            placeholder="e.g. 500 mg, 10 mg"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                            Form
                          </label>
                          <select
                            value={med.form || "Tablet"}
                            onChange={(e) => {
                              const updated = [...medsList];
                              updated[mIdx] = { ...updated[mIdx], form: e.target.value };
                              setVal(updated);
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                            style={{ fontFamily: "Outfit, sans-serif" }}
                          >
                            <option value="Tablet">Tablet</option>
                            <option value="Syrup">Syrup</option>
                            <option value="Capsule">Capsule</option>
                            <option value="Eye Drops">Eye Drops</option>
                            <option value="Ointment">Ointment</option>
                            <option value="Injection">Injection</option>
                            <option value="Inhalation">Inhalation</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      const newMed = {
                        id: `med-${Date.now()}`,
                        name: "",
                        strength: "",
                        form: "Tablet",
                        dosage: "1 tablet",
                        frequency: "Once daily (OD)",
                        duration: "5 days",
                      };
                      setVal([...medsList, newMed]);
                      toast.success(`Medication ${medsList.length + 1} added`);
                    }}
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 hover:border-slate-400 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Medication
                  </button>
                </div>
              );
            })()}
          </div>
        ) : regField?.inputType === "table" ||
            regField?.inputType === "group" ||
            regField?.inputType === "group_repeatable" ||
            regField?.inputType === "crm_bind" ||
            regField?.inputType === "list_select" ||
            regField?.inputType === "new_list" ||
            regField?.inputType === "multiselect" ||
            regField?.inputType === "rating" ||
            (regField?.inputType === "list_open" && key !== "prescribed_medications" && key !== "medications") ? (
          <FieldInputRenderer
            field={regField}
            value={effectiveVal}
            onChange={(val) => setVal(val)}
            mode="runtime"
            recordData={fieldValues}
          />
        ) : regField?.inputType === "signature" ||
            regField?.inputType === "drawing" ||
            key.includes("signature") ||
            key.includes("drawing") ||
            (typeof rawVal === "string" && rawVal.startsWith("data:image")) ? (
          <SignatureDrawingPad
            label={label}
            value={typeof rawVal === "string" ? rawVal : ""}
            onChange={(val) => setVal(val)}
          />
        ) : key === "symptoms" ||
            key === "patient_instructions" ||
            key === "patient_precautions" ||
            regField?.key === "symptoms" ||
            regField?.key === "patient_instructions" ||
            regField?.key === "patient_precautions" ||
            (Array.isArray(rawVal) && (rawVal.length === 0 || typeof rawVal[0] === "string")) ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5 min-h-[30px] p-2 bg-slate-50/70 border border-slate-200 rounded-lg">
              {(() => {
                const currentArr: string[] = Array.isArray(rawVal)
                  ? (rawVal as string[])
                  : typeof rawVal === "string" && rawVal.trim()
                  ? rawVal
                      .split(/[\n;]+/)
                      .map((s: string) => s.replace(/^[•\-\s]+/, "").trim())
                      .filter(Boolean)
                  : [];

                if (currentArr.length === 0) {
                  return (
                    <span className="text-xs text-muted-foreground italic">
                      No {label.toLowerCase()} added yet. Type below to add.
                    </span>
                  );
                }

                return currentArr.map((item: string, idx: number) => (
                  <div
                    key={idx}
                    className="group relative inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg shadow-2xs select-none hover:border-blue-400 transition-colors"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <span>{typeof item === "string" ? item : JSON.stringify(item)}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = currentArr.filter((_: any, i: number) => i !== idx);
                        setVal(updated);
                      }}
                      className="w-3.5 h-3.5 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                      title="Remove"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ));
              })()}
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                id={`input-add-${sectionId}-${key}`}
                placeholder={`+ Type ${label.toLowerCase()} and press Enter...`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                    e.preventDefault();
                    const val = (e.target as HTMLInputElement).value.replace(/^[•\-\s]+/, "").trim();
                    if (!val) return;
                    const arr: string[] = Array.isArray(rawVal)
                      ? [...rawVal]
                      : typeof rawVal === "string" && rawVal
                      ? rawVal.split(/[\n;]+/).map((s: string) => s.replace(/^[•\-\s]+/, "").trim()).filter(Boolean)
                      : [];
                    if (!arr.includes(val)) {
                      setVal([...arr, val]);
                    }
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
              <button
                type="button"
                onClick={(e) => {
                  const input = document.getElementById(`input-add-${sectionId}-${key}`) as HTMLInputElement;
                  if (input && input.value.trim()) {
                    const val = input.value.replace(/^[•\-\s]+/, "").trim();
                    if (!val) return;
                    const arr: string[] = Array.isArray(rawVal)
                      ? [...rawVal]
                      : typeof rawVal === "string" && rawVal
                      ? rawVal.split(/[\n;]+/).map((s: string) => s.replace(/^[•\-\s]+/, "").trim()).filter(Boolean)
                      : [];
                    if (!arr.includes(val)) {
                      setVal([...arr, val]);
                    }
                    input.value = "";
                  }
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Add
              </button>
            </div>
          </div>
        ) : regField?.inputType === "money" ? (
          /* ── Currency / Money Field ── */
          <div className="flex items-center bg-slate-50/70 border border-slate-200 rounded-lg overflow-hidden focus-within:bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
            <span className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 border-r border-slate-200 select-none">
              {CURRENCY_SYMBOLS[regField?.currency || "INR"] || regField?.currency || "₹"}
            </span>
            <input
              type="number"
              value={rawVal ?? ""}
              onChange={(e) => setVal(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-1.5 bg-transparent text-xs font-medium text-slate-800 outline-none"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
          </div>
        ) : regField?.inputType === "yes_no" ? (
          /* ── Yes / No Toggle ── */
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVal(rawVal === "Yes" ? "No" : "Yes")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                rawVal === "Yes"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : rawVal === "No"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {rawVal || "Select (Yes / No)"}
            </button>
            <span className="text-xs text-slate-400">Click to toggle</span>
          </div>
        ) : regField?.inputType === "link" ? (
          /* ── Link Field ── */
          <div className="flex items-center justify-between bg-slate-50/70 border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
            <LinkIcon className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1.5" />
            <input
              type="url"
              value={rawVal || ""}
              onChange={(e) => setVal(e.target.value)}
              placeholder="https://example.com"
              className="w-full bg-transparent text-xs text-slate-800 outline-none"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
            {rawVal && (
              <a
                href={rawVal.startsWith("http") ? rawVal : `https://${rawVal}`}
                target="_blank"
                rel="noreferrer"
                className="p-1 text-blue-600 hover:text-blue-700 rounded transition-colors shrink-0"
                title="Open link in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        ) : regField?.inputType === "whatsapp_link" ? (
          /* ── WhatsApp Link Field ── */
          <div className="flex items-center justify-between bg-slate-50/70 border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:bg-white focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
            <span className="text-xs font-bold text-slate-500 mr-1">+91</span>
            <input
              type="tel"
              value={rawVal || ""}
              onChange={(e) => setVal(e.target.value)}
              placeholder="9876543210"
              className="w-full bg-transparent text-xs text-slate-800 outline-none"
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
            {rawVal && (
              <a
                href={`https://wa.me/${rawVal.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[10px] font-bold shrink-0 transition-colors"
              >
                Chat ↗
              </a>
            )}
          </div>
        ) : regField?.inputType === "file" ? (
          /* ── File / Attachment Field ── */
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-3 bg-slate-50/40 hover:bg-slate-50 hover:border-blue-400 transition-all text-center cursor-pointer">
            <Paperclip className="w-4 h-4 text-slate-400 mx-auto mb-1" />
            <p className="text-xs font-semibold text-slate-600">
              {rawVal || `Upload ${label.toLowerCase()}`}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {regField.mediaConfig?.acceptedFormats && regField.mediaConfig.acceptedFormats.length > 0
                ? regField.mediaConfig.acceptedFormats.join(", ")
                : "PDF, DOCX, JPG"}
              {regField.mediaConfig?.maxFileSizeMB ? ` up to ${regField.mediaConfig.maxFileSizeMB}MB` : " up to 10MB"}
            </p>
          </div>
        ) : regField?.inputType === "select" ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl text-xs font-semibold text-slate-800 transition-all cursor-pointer shadow-2xs outline-none group text-left"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <span className={effectiveVal ? "text-slate-800 truncate" : "text-slate-400 font-normal truncate"}>
                  {regField.options?.find(o => o.value === effectiveVal)?.label || effectiveVal || `Select ${label}...`}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0 ml-2 transition-transform duration-150" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-72 max-h-64 overflow-y-auto p-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 animate-in fade-in-80 zoom-in-95"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {regField.options && regField.options.length > 0 ? (
                regField.options.map((opt) => {
                  const isSelected = effectiveVal === opt.value;
                  return (
                    <DropdownMenuItem
                      key={opt.id}
                      onClick={() => setVal(opt.value)}
                      className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-2" />}
                    </DropdownMenuItem>
                  );
                })
              ) : (
                ["Active", "Pending", "Completed"].map((optVal) => {
                  const isSelected = effectiveVal === optVal;
                  return (
                    <DropdownMenuItem
                      key={optVal}
                      onClick={() => setVal(optVal)}
                      className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span className="truncate">{optVal}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-2" />}
                    </DropdownMenuItem>
                  );
                })
              )}
              {regField && regField.permissions?.canAddOptions !== false && (
                <div className="pt-1.5 mt-1 border-t border-slate-100 px-1">
                  <div className="flex items-center gap-1.5 p-1 bg-slate-50 rounded-lg">
                    <input
                      type="text"
                      placeholder="+ Add option..."
                      value={newOptionInputs[regField.key] || ""}
                      onChange={(e) => {
                        e.stopPropagation();
                        setNewOptionInputs((prev) => ({ ...prev, [regField.key]: e.target.value }));
                      }}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddOptionToField(regField);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 min-w-0 bg-white border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddOptionToField(regField);
                      }}
                      className="px-2 py-1 bg-blue-600 text-white rounded text-[11px] font-semibold hover:bg-blue-700 cursor-pointer shrink-0"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : regField?.inputType === "richtext" ? (
          /* ── Rich Text Field ── */
          <RichTextEditor
            value={typeof effectiveVal === "string" ? effectiveVal : ""}
            onChange={(html) => setVal(html)}
            placeholder={regField?.placeholder || `Enter ${label.toLowerCase()}...`}
            minRows={3}
          />
        ) : regField?.inputType === "textarea" ? (
          <textarea
            value={effectiveVal ?? ""}
            onChange={(e) => setVal(e.target.value)}
            placeholder={regField?.placeholder || `Enter ${label.toLowerCase()}`}
            rows={2}
            className="w-full px-3 py-1.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-y"
            style={{ fontFamily: "Outfit, sans-serif" }}
          />
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
            value={effectiveVal ?? ""}
            onChange={(e) => setVal(e.target.value)}
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
        {visibleSections.map((section, sIdx) => {
          const isSectionDragged = draggedSectionIdx === sIdx;
          const isSectionDragOver = dragOverSectionIdx === sIdx;
          const isEditingThisTitle = editingSectionId === section.id;
          const registeredSec = allCustomSections.find((rs) => rs.id === section.id);
          const sectionPerms = section.permissions || registeredSec?.permissions;
          const canAddFields = sectionPerms ? sectionPerms.canAddFields !== false : true;
          const canEditSection = sectionPerms ? sectionPerms.canEdit !== false : true;
          const canHideSection = sectionPerms ? sectionPerms.canHide !== false : true;

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
                        {section.iconName && (
                          <span className="shrink-0">
                            {SECTION_ICONS[section.iconName] || <Layers className="w-3.5 h-3.5 text-blue-600" />}
                          </span>
                        )}
                        <h3
                          className="text-xs font-bold text-slate-700 uppercase tracking-wider truncate"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {section.title}
                        </h3>
                        {canEditSection && (
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
                        )}
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
                  {canHideSection && (section.isCustom || sections.length > 1) && (
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
                    {canAddFields && (
                      <button
                        type="button"
                        onClick={() => handleOpenSelectFieldForSection(section.id)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        <Plus className="w-3 h-3" /> Add Field
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {section.fieldKeys.map((key, fIdx) => renderFieldInput(key, section.id, fIdx))}
                    {canAddFields && (
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
                    )}
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
          onlyModules={[customFieldsModule]}
          initiallySelected={
            visibleSections.find((s) => s.id === targetSectionIdForField)?.fieldKeys || []
          }
          activeProcessId={activeProcessObj?.id}
          activeProcessName={activeProcessName}
          processStages={activeProcessStages}
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
          activeProcessId={activeProcessObj?.id}
          activeProcessName={activeProcessName}
          processStages={activeProcessStages}
          onClose={() => setCreateFieldModalOpen(false)}
          onCreated={(newField) => {
            if (targetSectionIdForField) {
              handleApplySelectedFields([newField.key]);
            }
          }}
        />
      )}

      {/* ── Add Section Drawer (Same as Settings) ──────────────────────────── */}
      {addSectionModalOpen && (
        <AdminSectionDrawer
          section={null}
          initialModule={customFieldsModule as Exclude<FieldModule, "deal">}
          activeProcessId={activeProcessObj?.id}
          activeProcessName={activeProcessName}
          processStages={activeProcessStages}
          isAdmin={false}
          onClose={() => setAddSectionModalOpen(false)}
          onSaved={(savedSection) => {
            const newSection: OverviewSection & Partial<SectionDefinition> = {
              id: savedSection.id,
              title: savedSection.title,
              description: savedSection.description,
              iconName: (savedSection.iconName as any) || "layers",
              isCustom: true,
              fieldKeys: savedSection.fieldKeys || [],
              permissions: savedSection.permissions,
              processIds: savedSection.processIds,
              scopingRules: savedSection.scopingRules,
              module: savedSection.module,
              source: savedSection.source,
            };
            onSectionsChange([...sections, newSection]);
            setAddSectionModalOpen(false);
            toast.success(`Section "${savedSection.title}" created`);
          }}
        />
      )}

      {/* ── Edit Custom Field Drawer ────────────────────────────────────────── */}
      {editingFieldDef && (
        <AdminFieldDrawer
          field={editingFieldDef}
          initialModule={(editingFieldDef.module as Exclude<FieldModule, "deal">) || (customFieldsModule === "deal" ? "process" : customFieldsModule)}
          activeProcessId={activeProcessObj?.id}
          activeProcessName={activeProcessName}
          processStages={activeProcessStages}
          isAdmin={false}
          onClose={() => setEditingFieldDef(null)}
          onHide={(f) => {
            const targetSec = sections.find((s) => s.fieldKeys?.includes(f.key));
            if (targetSec) {
              handleRemoveFieldFromSection(targetSec.id, f.key);
            }
            setEditingFieldDef(null);
          }}
          onSaved={(savedField) => {
            setEditingFieldDef(null);
            toast.success(`Field "${savedField.label}" updated`);
          }}
        />
      )}
    </div>
  );
}
