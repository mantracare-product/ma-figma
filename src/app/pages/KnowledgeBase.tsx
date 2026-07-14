import React, { useRef, useState, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  Upload,
  Link as LinkIcon,
  FileText,
  Type,
  Database,
  Search,
  LayoutGrid,
  List,
  Copy,
  Trash2,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Lock,
  Plus,
  X,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  MoreVertical,
  Edit,
  Settings,
} from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Drawer } from "../components/ui/drawer";
import { Tooltip } from "../components/ui/Tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../components/ui/dropdown-menu";
import { toast } from "sonner";
import PageHeader from "../components/layout/PageHeader";
import { HowItWorksModal, HowItWorksButton } from "../components/help/HowItWorksModal";
import { InfoTooltip } from "../components/help/InfoTooltip";

// ─── Process / Stage seed data (mirrors Process.tsx state) ───────────────────

interface ProcessStage {
  id: string;
  name: string;
}

interface ProcessDef {
  id: string;
  name: string;
  stages: ProcessStage[];
}

const PROCESS_TREE: ProcessDef[] = [
  {
    id: "1",
    name: "Patient Intake",
    stages: [
      { id: "1-1", name: "Initial Contact" },
      { id: "1-2", name: "Insurance Verify" },
      { id: "1-3", name: "Schedule Appointment" },
    ],
  },
  {
    id: "2",
    name: "Follow-up Calls",
    stages: [
      { id: "2-1", name: "Post-Visit Check" },
      { id: "2-2", name: "Medication Reminder" },
    ],
  },
];

// ─── Preset Tags for combo dropdown ──────────────────────────────────────────

const PRESET_TAGS = [
  "Feedback",
  "Plan Details",
  "Complaints",
  "FAQ",
  "Pricing",
  "Policy",
  "Refund",
  "Onboarding",
  "Support",
  "Billing",
];

// ─── Types ────────────────────────────────────────────────────────────────────

type KnowledgeSourceType = "text" | "document" | "url";
type SourceStatus = "pending" | "processing" | "completed" | "failed";
type FilterTab = "all" | "url" | "files" | "text";
type ViewMode = "list" | "grid";

interface KnowledgeScopeSelection {
  processId: string;
  stageIds: string[]; // empty = all stages selected
}

interface BaseSource {
  id: string;
  name: string;
  tags: string[];
  scopes: KnowledgeScopeSelection[];
  allProcesses: boolean;
  status: SourceStatus;
  createdAt: string;
}

interface GlobalKnowledgeTextSource extends BaseSource {
  type: "text";
  title: string;
  content: string;
}

interface GlobalKnowledgeDocumentSource extends BaseSource {
  type: "document";
  fileName: string;
  fileSizeLabel: string;
  fileUrl?: string;
}

interface GlobalKnowledgeUrlSource extends BaseSource {
  type: "url";
  url: string;
  label?: string;
  scopeNote: "single-page-only";
}

type GlobalKnowledgeSource =
  | GlobalKnowledgeTextSource
  | GlobalKnowledgeDocumentSource
  | GlobalKnowledgeUrlSource;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const genId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const getSourceName = (src: GlobalKnowledgeSource): string => src.name;

const getScopeLabel = (src: GlobalKnowledgeSource): string => {
  if (src.allProcesses) return "All Processes";
  if (src.scopes.length === 0) return "—";
  const parts = src.scopes.map((sc) => {
    const proc = PROCESS_TREE.find((p) => p.id === sc.processId);
    if (!proc) return "";
    if (sc.stageIds.length === 0 || sc.stageIds.length === proc.stages.length) {
      return proc.name;
    }
    const stageNames = sc.stageIds
      .map((sid) => proc.stages.find((s) => s.id === sid)?.name ?? sid)
      .join(", ");
    return `${proc.name} → ${stageNames}`;
  });
  return parts.filter(Boolean).join("; ");
};

// ─── Type badge (Plain neutral-gray type label) ──────────────────────────────

const TypeBadge: React.FC<{ type: KnowledgeSourceType }> = ({ type }) => {
  const label = type === "document" ? "File" : type === "url" ? "URL" : "Text";
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs font-medium">
      {label}
    </span>
  );
};

// ─── Copy KB ID cell ──────────────────────────────────────────────────────────

const KbIdCell: React.FC<{ id: string }> = ({ id }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      toast.success("KB ID copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    });
  };
  const truncated = id.length > 18 ? `${id.slice(0, 18)}…` : id;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-mono" style={{ color: "#64748B" }} title={id}>{truncated}</span>
      <button onClick={handleCopy} className="p-0.5 rounded hover:bg-gray-100 transition-colors flex-shrink-0" title="Copy KB ID">
        {copied
          ? <Check className="w-3.5 h-3.5 text-green-500" />
          : <Copy className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />}
      </button>
    </div>
  );
};

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<SourceStatus, { bg: string; text: string; dot: string }> = {
  completed:  { bg: "bg-[#F0FDF4]", text: "text-[#16A34A]", dot: "bg-[#16A34A]" },
  pending:    { bg: "bg-[#FFFBEB]", text: "text-[#D97706]", dot: "bg-[#D97706]" },
  processing: { bg: "bg-[#EFF6FF]", text: "text-[#2563EB]", dot: "bg-[#2563EB]" },
  failed:     { bg: "bg-[#FEF2F2]", text: "text-[#DC2626]", dot: "bg-[#DC2626]" },
};

const StatusBadge: React.FC<{ status: SourceStatus }> = ({ status }) => {
  const s = STATUS_STYLES[status];
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${s.bg} ${s.text}`}
      style={{ fontFamily: "Outfit, sans-serif" }}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
      {label}
    </span>
  );
};

// ─── Scope chip listing helper ───────────────────────────────────────────────

interface FlattenedScope {
  id: string;
  processId: string;
  stageId?: string;
  label: string;
}

const getFlattenedScopes = (scopes: KnowledgeScopeSelection[], allProcesses: boolean): FlattenedScope[] => {
  if (allProcesses) {
    return [{ id: "all", processId: "all", label: "All Processes" }];
  }
  const list: FlattenedScope[] = [];
  scopes.forEach((sc) => {
    const proc = PROCESS_TREE.find((p) => p.id === sc.processId);
    if (!proc) return;
    if (sc.stageIds.length === 0 || sc.stageIds.length === proc.stages.length) {
      list.push({
        id: `proc-${sc.processId}`,
        processId: sc.processId,
        label: `${proc.name} (All Stages)`,
      });
    } else {
      sc.stageIds.forEach((sid) => {
        const stage = proc.stages.find((st) => st.id === sid);
        list.push({
          id: `stage-${sc.processId}-${sid}`,
          processId: sc.processId,
          stageId: sid,
          label: `${proc.name} > ${stage?.name || sid}`,
        });
      });
    }
  });
  return list;
};

interface ScopeChipListProps {
  scopes: KnowledgeScopeSelection[];
  allProcesses: boolean;
}

const ScopeChipList: React.FC<ScopeChipListProps> = ({ scopes, allProcesses }) => {
  const [showAll, setShowAll] = useState(false);

  const flatScopes = useMemo(() => getFlattenedScopes(scopes, allProcesses), [scopes, allProcesses]);

  const limit = 2;
  const hasOverflow = flatScopes.length > limit;
  const visibleScopes = showAll ? flatScopes : flatScopes.slice(0, limit);

  return (
    <div className="flex flex-wrap gap-1.5 items-center w-full max-w-[280px]">
      {visibleScopes.map((fs) => (
        <span
          key={fs.id}
          className="inline-flex items-center bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-md font-medium"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {fs.label}
        </span>
      ))}

      {hasOverflow && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold cursor-pointer underline whitespace-nowrap"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {showAll ? "show less" : `+${flatScopes.length - limit} more`}
        </button>
      )}
    </div>
  );
};

// ─── Grid card ────────────────────────────────────────────────────────────────

const SourceCard: React.FC<{
  src: GlobalKnowledgeSource;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ src, onEdit, onDelete }) => {
  const hasScope = src.allProcesses || src.scopes.length > 0;
  const hasTags = src.tags && src.tags.length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow flex flex-col gap-3 h-full justify-between">
      {/* Header section (Name + Type inline, Hamburger right) */}
      <div className="flex items-center justify-between gap-3">
        {/* Name and Type inline next to it */}
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-start">
          <button
            className="text-sm font-bold text-blue-600 hover:underline hover:text-blue-700 cursor-pointer truncate text-left"
            style={{ fontFamily: "DM Sans, sans-serif" }}
            title={getSourceName(src)}
            onClick={onEdit}
          >
            {getSourceName(src)}
          </button>
          <div className="flex-shrink-0">
            <TypeBadge type={src.type} />
          </div>
        </div>

        {/* Hamburger menu */}
        <div className="flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded hover:bg-gray-100 transition-colors flex items-center justify-center">
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
                <Trash2 className="w-4 h-4 mr-2 text-red-600" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Scope Section (collapse if empty) */}
      {hasScope && (
        <div className="border-t border-gray-100 pt-3 space-y-1 text-left max-w-[280px]">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
            Scope
          </p>
          <ScopeChipList
            scopes={src.scopes}
            allProcesses={src.allProcesses}
          />
        </div>
      )}

      {/* Tags Section (collapse if empty) */}
      {hasTags && (
        <div className="border-t border-gray-100 pt-3 space-y-1 text-left">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
            Tags
          </p>
          <div className="flex flex-wrap gap-1">
            {src.tags.map((t) => (
              <span
                key={t}
                className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium whitespace-nowrap"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer Section (KB ID left, Status + Date right) */}
      <div className="border-t border-gray-100 pt-3 flex items-center justify-between mt-auto gap-2">
        <KbIdCell id={src.id} />
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={src.status} />
          <p className="text-xs text-muted-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
            {formatDate(src.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Process Tree Checkbox ────────────────────────────────────────────────────

interface ProcessTreeProps {
  allSelected: boolean;
  onAllChange: (v: boolean) => void;
  scopes: KnowledgeScopeSelection[];
  onScopesChange: (s: KnowledgeScopeSelection[]) => void;
}

const ProcessTree: React.FC<ProcessTreeProps> = ({ allSelected, onAllChange, scopes, onScopesChange }) => {
  const [expanded, setExpanded] = useState<string[]>([]);

  const toggleExpand = (pid: string) =>
    setExpanded((prev) => prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]);

  const getScopeFor = (pid: string): KnowledgeScopeSelection | undefined =>
    scopes.find((s) => s.processId === pid);

  const isProcessChecked = (proc: ProcessDef): boolean => {
    const sc = getScopeFor(proc.id);
    return !!sc;
  };

  const isProcessIndeterminate = (proc: ProcessDef): boolean => {
    const sc = getScopeFor(proc.id);
    if (!sc) return false;
    return sc.stageIds.length > 0 && sc.stageIds.length < proc.stages.length;
  };

  const isStageChecked = (proc: ProcessDef, stageId: string): boolean => {
    const sc = getScopeFor(proc.id);
    if (!sc) return false;
    return sc.stageIds.length === 0 || sc.stageIds.includes(stageId);
  };

  const toggleProcess = (proc: ProcessDef) => {
    const existing = getScopeFor(proc.id);
    if (existing) {
      onScopesChange(scopes.filter((s) => s.processId !== proc.id));
    } else {
      onScopesChange([...scopes, { processId: proc.id, stageIds: [] }]);
    }
  };

  const toggleStage = (proc: ProcessDef, stageId: string) => {
    const existing = getScopeFor(proc.id);
    if (!existing) {
      onScopesChange([...scopes, { processId: proc.id, stageIds: [stageId] }]);
      return;
    }
    const currentIds: string[] =
      existing.stageIds.length === 0
        ? proc.stages.map((s) => s.id)
        : existing.stageIds;

    const newIds = currentIds.includes(stageId)
      ? currentIds.filter((id) => id !== stageId)
      : [...currentIds, stageId];

    if (newIds.length === 0) {
      onScopesChange(scopes.filter((s) => s.processId !== proc.id));
    } else if (newIds.length === proc.stages.length) {
      onScopesChange(scopes.map((s) => s.processId === proc.id ? { ...s, stageIds: [] } : s));
    } else {
      onScopesChange(scopes.map((s) => s.processId === proc.id ? { ...s, stageIds: newIds } : s));
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
        <CheckboxInput
          checked={allSelected}
          indeterminate={false}
          onChange={(v) => onAllChange(v)}
        />
        <span className="text-sm font-semibold" style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}>All</span>
      </label>

      {PROCESS_TREE.map((proc) => {
        const isExp = expanded.includes(proc.id);
        const procChecked = isProcessChecked(proc);
        const procIndet = isProcessIndeterminate(proc);
        return (
          <div key={proc.id} className={`${allSelected ? "opacity-40 pointer-events-none" : ""}`}>
            <div className="flex items-center gap-1">
              <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer flex-1">
                <CheckboxInput
                  checked={procChecked}
                  indeterminate={procIndet}
                  onChange={() => toggleProcess(proc)}
                />
                <span className="text-sm" style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}>{proc.name}</span>
              </label>
              <button
                type="button"
                onClick={() => toggleExpand(proc.id)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
              >
                {isExp
                  ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  : <ChevronRightIcon className="w-3.5 h-3.5 text-gray-400" />}
              </button>
            </div>
            {isExp && (
              <div className="ml-8 mt-1 space-y-1 border-l-2 border-gray-100 pl-3">
                {proc.stages.map((stage) => (
                  <label key={stage.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <CheckboxInput
                      checked={isStageChecked(proc, stage.id)}
                      indeterminate={false}
                      onChange={() => toggleStage(proc, stage.id)}
                    />
                    <span className="text-sm" style={{ color: "#64748B", fontFamily: "Outfit, sans-serif" }}>{stage.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Reusable checkbox with indeterminate support ─────────────────────────────

const CheckboxInput: React.FC<{
  checked: boolean;
  indeterminate: boolean;
  onChange: (v: boolean) => void;
}> = ({ checked, indeterminate, onChange }) => {
  const ref = useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer flex-shrink-0"
    />
  );
};

// ─── Create/Edit/View Knowledge Base Drawer Component ────────────────────────

interface CreateKnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (src: GlobalKnowledgeSource) => void;
  initialSource?: GlobalKnowledgeSource | null;
}

const CreateKnowledgeBaseModal: React.FC<CreateKnowledgeBaseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSource,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [allProcesses, setAllProcesses] = useState(false);
  const [scopes, setScopes] = useState<KnowledgeScopeSelection[]>([]);
  const [contentType, setContentType] = useState<"text" | "document">("text");
  const [textContent, setTextContent] = useState("");
  const [file, setFile] = useState<{ name: string; sizeLabel: string } | null>(null);

  const [processDropdownOpen, setProcessDropdownOpen] = useState(false);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);

  const resetAll = () => {
    setName("");
    setTagInput("");
    setTags([]);
    setAllProcesses(false);
    setScopes([]);
    setContentType("text");
    setTextContent("");
    setFile(null);
    setProcessDropdownOpen(false);
    setTagDropdownOpen(false);
  };

  const handleClose = () => { resetAll(); onClose(); };

  React.useEffect(() => {
    if (isOpen) {
      if (initialSource) {
        setName(initialSource.name);
        setTags(initialSource.tags || []);
        setAllProcesses(initialSource.allProcesses);
        setScopes(initialSource.scopes || []);
        setContentType(initialSource.type === "document" ? "document" : "text");
        if (initialSource.type === "text") {
          setTextContent(initialSource.content);
        } else if (initialSource.type === "document") {
          setFile({ name: initialSource.fileName, sizeLabel: initialSource.fileSizeLabel });
        }
      } else {
        resetAll();
      }
    }
  }, [isOpen, initialSource]);

  // Combo dropdown filtered tag presets
  const filteredPresets = useMemo(() => {
    const query = tagInput.trim().toLowerCase();
    const available = PRESET_TAGS.filter((t) => !tags.includes(t));
    if (!query) return available;
    return available.filter((t) => t.toLowerCase().includes(query));
  }, [tags, tagInput]);

  const removeTag = (t: string) => {
    setTags((prev) => prev.filter((x) => x !== t));
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    setFile({ name: f.name, sizeLabel: formatBytes(f.size) });
  };

  const handleSave = () => {
    if (!name.trim()) { toast.error("Please enter a Knowledge Base name"); return; }
    if (!allProcesses && scopes.length === 0) { toast.error("Please select at least one process or stage"); return; }

    const baseProps = {
      id: initialSource ? initialSource.id : genId("kb"),
      name: name.trim(),
      tags,
      scopes,
      allProcesses,
      status: initialSource ? initialSource.status : ("pending" as SourceStatus),
      createdAt: initialSource ? initialSource.createdAt : new Date().toISOString(),
    };

    let newSrc: GlobalKnowledgeSource;
    if (contentType === "text") {
      const trimmed = textContent.trim();
      if (!trimmed) { toast.error("Please enter some content"); return; }
      const title = trimmed.slice(0, 40) + (trimmed.length > 40 ? "…" : "");
      newSrc = { ...baseProps, type: "text", title, content: trimmed, status: initialSource ? initialSource.status : "completed" };
    } else {
      if (!file) { toast.error("Please upload a file"); return; }
      newSrc = { ...baseProps, type: "document", fileName: file.name, fileSizeLabel: file.sizeLabel };
    }

    onSave(newSrc);
    toast.success(initialSource ? "Knowledge Base updated" : "Knowledge Base created");
    resetAll();
    onClose();
  };

  const getScopesSummary = () => {
    if (allProcesses) return "All Processes";
    if (scopes.length === 0) return "Select processes…";
    if (scopes.length === 1) {
      const proc = PROCESS_TREE.find(p => p.id === scopes[0].processId);
      if (!proc) return "1 process selected";
      if (scopes[0].stageIds.length === 0 || scopes[0].stageIds.length === proc.stages.length) {
        return proc.name;
      }
      return `${proc.name} (${scopes[0].stageIds.length} stages)`;
    }
    return `${scopes.length} processes selected`;
  };

  const footer = (
    <>
      <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
      <Button variant="primary" size="sm" onClick={handleSave}>Save</Button>
    </>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      title={initialSource ? "Edit Knowledge Base" : "Create Knowledge Base"}
      footer={footer}
      maxWidth="sm:max-w-xl"
    >
      <div className="space-y-5 pb-6">
        {/* Name */}
        <div>
          <div className="flex items-center gap-1 mb-1.5">
            <label className="block text-sm font-medium" style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}>
              Name <span className="text-red-500">*</span>
            </label>
            <InfoTooltip text="A short, descriptive name so you can identify this source later." />
          </div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Insurance Policy FAQs"
          />
        </div>

        {/* Tags Combo Dropdown */}
        <div className="relative">
          <div className="flex items-center gap-1 mb-1.5">
            <label className="block text-sm font-medium" style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}>
              Tags / Categories
            </label>
            <InfoTooltip text="Group related sources together. Pick an existing tag or add your own." />
          </div>
          <div className="relative">
            <Input
              value={tagInput}
              onChange={(e) => {
                setTagInput(e.target.value);
                setTagDropdownOpen(true);
              }}
                onFocus={() => setTagDropdownOpen(true)}
                placeholder="Select tags or type custom..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const trimmed = tagInput.trim();
                    if (trimmed && !tags.includes(trimmed)) {
                      setTags((prev) => [...prev, trimmed]);
                      setTagInput("");
                    }
                  }
                }}
              />
              {tagDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setTagDropdownOpen(false)} />
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-45 max-h-[220px] overflow-y-auto p-1.5 space-y-0.5">
                    {filteredPresets.map((pt) => (
                      <button
                        type="button"
                        key={pt}
                        onClick={() => {
                          setTags((prev) => [...prev, pt]);
                          setTagInput("");
                          setTagDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-blue-50 text-gray-700 transition-colors"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {pt}
                      </button>
                    ))}
                    {tagInput.trim() && !tags.includes(tagInput.trim()) && !filteredPresets.includes(tagInput.trim()) && (
                      <button
                        type="button"
                        onClick={() => {
                          setTags((prev) => [...prev, tagInput.trim()]);
                          setTagInput("");
                          setTagDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-blue-50 text-blue-600 font-semibold transition-colors animate-fade-in"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        Add "{tagInput.trim()}"
                      </button>
                    )}
                    {filteredPresets.length === 0 && !tagInput.trim() && (
                      <p className="text-xs text-gray-400 p-3 text-center" style={{ fontFamily: "Outfit, sans-serif" }}>
                        No more preset tags available
                      </p>
                    )}
                  </div>
                </>
              )}
          </div>

          {/* Selected Chips */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {t}
                  <button type="button" onClick={() => removeTag(t)} className="hover:text-blue-900 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="text-xs mt-1.5" style={{ color: "#94A3B8", fontFamily: "Outfit, sans-serif" }}>
            Select presets from the dropdown or type a custom tag and press Enter.
          </p>
        </div>

        {/* Applicable Processes Dropdown */}
        <div className="relative">
          <div className="flex items-center gap-1 mb-1.5">
            <label className="block text-sm font-medium" style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}>
              Applicable Processes <span className="text-red-500">*</span>
            </label>
            <InfoTooltip text="This knowledge base will only be used by the AI when it's active in the selected process and stage. Choose 'All' to make it available everywhere." />
          </div>
          <button
            type="button"
            onClick={() => setProcessDropdownOpen((prev) => !prev)}
            className="w-full h-10 px-3 flex items-center justify-between bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-left"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <span className={allProcesses || scopes.length > 0 ? "text-gray-700" : "text-gray-400"}>
              {allProcesses || scopes.length > 0 ? "Add or remove processes…" : "Select processes…"}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          {processDropdownOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setProcessDropdownOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-45 p-4 max-h-[350px] overflow-y-auto space-y-3">
                <p className="text-xs" style={{ color: "#64748B", fontFamily: "Outfit, sans-serif" }}>
                  Select the processes and stages where this knowledge base will be available.
                </p>
                <ProcessTree
                  allSelected={allProcesses}
                  onAllChange={(v) => {
                    setAllProcesses(v);
                    if (v) setScopes([]);
                  }}
                  scopes={scopes}
                  onScopesChange={setScopes}
                />
                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <Button type="button" variant="primary" size="sm" onClick={() => setProcessDropdownOpen(false)}>
                    Done
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Selected scope chips — mirrors Tags chip row */}
          {(allProcesses || scopes.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {allProcesses ? (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  All Processes
                  <button
                    type="button"
                    onClick={() => setAllProcesses(false)}
                    className="hover:text-blue-900 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ) : (
                getFlattenedScopes(scopes, false).map((fs) => (
                  <span
                    key={fs.id}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {fs.label}
                    <button
                      type="button"
                      onClick={() => {
                        if (fs.stageId) {
                          // Remove a specific stage from its process scope
                          setScopes((prev) =>
                            prev
                              .map((sc) =>
                                sc.processId === fs.processId
                                  ? { ...sc, stageIds: sc.stageIds.filter((s) => s !== fs.stageId) }
                                  : sc
                              )
                              .filter((sc) => {
                                if (sc.processId !== fs.processId) return true;
                                // Drop the entire scope entry if no stages remain
                                return sc.stageIds.length > 0;
                              })
                          );
                        } else {
                          // Remove the entire process scope entry
                          setScopes((prev) => prev.filter((sc) => sc.processId !== fs.processId));
                        }
                      }}
                      className="hover:text-blue-900 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          )}
        </div>

        {/* Content Type */}
        <div>
          <div className="flex items-center gap-1 mb-2">
            <label className="block text-sm font-medium" style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}>
              Content Type <span className="text-red-500">*</span>
            </label>
            <InfoTooltip text="Choose how you're providing this reference material." />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {/* Text */}
            <button
              type="button"
              onClick={() => setContentType("text")}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all w-full h-11 justify-center ${
                contentType === "text"
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"
              }`}
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: contentType === "text" ? "#2563EB" : "#94A3B8" }}>
                <Type className="w-3.5 h-3.5 text-white" />
              </div>
              Text
            </button>

            {/* File */}
            <button
              type="button"
              onClick={() => setContentType("document")}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all w-full h-11 justify-center ${
                contentType === "document"
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"
              }`}
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: contentType === "document" ? "#2563EB" : "#94A3B8" }}>
                <FileText className="w-3.5 h-3.5 text-white" />
              </div>
              File
            </button>

            {/* URL */}
            <Tooltip text="Coming soon" placement="top">
              <button
                type="button"
                disabled
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-100 bg-gray-50 text-gray-400 text-sm font-medium cursor-not-allowed w-full h-11 justify-center relative"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 bg-gray-300">
                  <LinkIcon className="w-3.5 h-3.5 text-white" />
                </div>
                URL
              </button>
            </Tooltip>
          </div>

          {contentType === "text" && (
            <div className="mt-3 space-y-1">
              <label className="block text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>In case of text</label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste or type the reference text here…"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl resize-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                style={{ fontFamily: "Outfit, sans-serif", minHeight: "120px" }}
              />
              <p className="text-xs" style={{ color: "#94A3B8", fontFamily: "Outfit, sans-serif" }}>
                Title will be derived from the first 40 characters.
              </p>
            </div>
          )}

          {contentType === "document" && (
            <div className="mt-3 space-y-2">
              <label className="block text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>In case of File — Drag and drop file etc</label>
              {file ? (
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-white">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#2563EB" }}>
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}>{file.name}</p>
                      <p className="text-xs text-gray-500">{file.sizeLabel}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setFile(null)} className="p-1.5 rounded hover:bg-red-50 text-red-500 transition-colors flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple={false}
                    accept=".pdf,.doc,.docx,.txt,.csv"
                    onChange={(e) => handleFiles(e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="border-2 border-dashed border-blue-300 rounded-xl bg-blue-50 p-8 text-center cursor-pointer hover:bg-blue-100 transition-colors">
                    <Upload className="w-7 h-7 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700">Click or drag files here to upload</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT, or CSV</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};

// ─── Delete confirm modal ─────────────────────────────────────────────────────

interface DeleteConfirmModalProps {
  isOpen: boolean;
  items: GlobalKnowledgeSource[];
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmModal: React.FC<{
  isOpen: boolean;
  items: GlobalKnowledgeSource[];
  onClose: () => void;
  onConfirm: () => void;
}> = ({ isOpen, items, onClose, onConfirm }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={items.length > 1 ? "Delete Knowledge Sources" : "Delete Knowledge Source"}
    footer={
      <>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="destructive" onClick={onConfirm}>Delete</Button>
      </>
    }
  >
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <p className="text-base" style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}>
          {items.length > 1
            ? `Are you sure you want to delete these ${items.length} knowledge sources?`
            : "Are you sure you want to delete this knowledge source?"}
        </p>
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
          {items.map((item) => (
            <p key={item.id} className="font-semibold text-red-600 text-sm truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>
              {getSourceName(item)}
            </p>
          ))}
        </div>
      </div>
      <p className="text-sm text-center" style={{ color: "#64748B", fontFamily: "Outfit, sans-serif" }}>
        This will permanently remove the selected reference material and the AI will no longer have access to it.
      </p>
    </div>
  </Modal>
);

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
  <div className="text-center py-20 border border-border rounded-xl bg-card shadow-sm">
    <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
      <Database className="w-8 h-8 text-muted-foreground" />
    </div>
    <h4 className="text-base font-semibold mb-1" style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}>
      No Knowledge Bases yet
    </h4>
    <p className="text-sm max-w-xs mx-auto mb-5 text-muted-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
      Create a knowledge base to give your AI reference material scoped to specific processes and stages.
    </p>
    <Button
      variant="primary"
      onClick={onCreate}
    >
      <Plus className="w-4 h-4" />
      Create Knowledge Base
    </Button>
  </div>
);

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED_SOURCES: GlobalKnowledgeSource[] = [
  {
    id: "src_1720000000000_ab1cd",
    name: "Insurance Policy FAQs",
    type: "document",
    fileName: "Insurance_Policy_FAQs.pdf",
    fileSizeLabel: "1.2 MB",
    tags: ["Insurance", "FAQs"],
    scopes: [{ processId: "1", stageIds: [] }],
    allProcesses: false,
    status: "completed",
    createdAt: "2025-06-01T08:00:00Z",
  },
  {
    id: "src_1720000001000_ef2gh",
    name: "MantraCare FAQ Page",
    type: "url",
    url: "https://mantracare.com/faq",
    scopeNote: "single-page-only",
    tags: ["FAQ"],
    scopes: [],
    allProcesses: true,
    status: "completed",
    createdAt: "2025-06-10T10:30:00Z",
  },
  {
    id: "src_1720000002000_ij3kl",
    name: "Cancellation & Refund Policy",
    type: "text",
    title: "Cancellation & Refund Policy",
    content: "Cancellation & Refund Policy…",
    tags: ["Policy", "Refund"],
    scopes: [{ processId: "2", stageIds: ["2-1"] }],
    allProcesses: false,
    status: "completed",
    createdAt: "2025-06-20T14:00:00Z",
  },
  {
    id: "src_1720000003000_mn4op",
    name: "Service Catalogue 2025",
    type: "document",
    fileName: "Service_Catalogue_2025.docx",
    fileSizeLabel: "340 KB",
    tags: ["Catalogue"],
    scopes: [{ processId: "1", stageIds: ["1-1", "1-2"] }],
    allProcesses: false,
    status: "pending",
    createdAt: "2025-07-01T09:00:00Z",
  },
];

const PAGE_SIZES = [10, 25, 50] as const;
type PageSizeValue = (typeof PAGE_SIZES)[number];

const TABLE_HEADERS = ["Actions", "Name", "Type", "Scope", "Tags", "Status", "Created"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KnowledgeBase() {
  const navigate = useNavigate();

  const [sources, setSources] = useState<GlobalKnowledgeSource[]>(SEED_SOURCES);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeValue>(10);

  // Derived list
  const filtered = useMemo(() => {
    let list = sources;
    if (activeFilter !== "all") {
      const typeMap: Record<FilterTab, KnowledgeSourceType | undefined> = {
        all: undefined, url: "url", files: "document", text: "text",
      };
      const t = typeMap[activeFilter];
      if (t) list = list.filter((s) => s.type === t);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => getSourceName(s).toLowerCase().includes(q));
    }
    return list;
  }, [sources, activeFilter, searchQuery]);

  // Table scroll state
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [showScrollLeftIndicator, setShowScrollLeftIndicator] = useState(false);
  const scrollIntervalRef = useRef<number | null>(null);

  const handleScrollRightMouseEnter = () => {
    let velocity = 0;
    const maxVelocity = 3;
    const acceleration = 0.15;

    const scroll = () => {
      if (tableScrollRef.current) {
        velocity = Math.min(velocity + acceleration, maxVelocity);
        tableScrollRef.current.scrollLeft += velocity;

        const { scrollWidth, clientWidth, scrollLeft } = tableScrollRef.current;
        if (scrollLeft >= scrollWidth - clientWidth) {
          if (scrollIntervalRef.current) {
            cancelAnimationFrame(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
          }
          return;
        }

        scrollIntervalRef.current = requestAnimationFrame(scroll);
      }
    };

    scrollIntervalRef.current = requestAnimationFrame(scroll);
  };

  const handleScrollLeftMouseEnter = () => {
    let velocity = 0;
    const maxVelocity = 3;
    const acceleration = 0.15;

    const scroll = () => {
      if (tableScrollRef.current) {
        velocity = Math.min(velocity + acceleration, maxVelocity);
        tableScrollRef.current.scrollLeft -= velocity;

        if (tableScrollRef.current.scrollLeft <= 0) {
          if (scrollIntervalRef.current) {
            cancelAnimationFrame(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
          }
          return;
        }

        scrollIntervalRef.current = requestAnimationFrame(scroll);
      }
    };

    scrollIntervalRef.current = requestAnimationFrame(scroll);
  };

  const handleScrollMouseLeave = () => {
    if (scrollIntervalRef.current) {
      cancelAnimationFrame(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const [createOpen, setCreateOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<GlobalKnowledgeSource | null>(null);

  const [deleteTargetList, setDeleteTargetList] = useState<GlobalKnowledgeSource[] | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Row selection state
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());


  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const startItem = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem   = Math.min(safePage * pageSize, filtered.length);

  // Check if table needs horizontal scroll
  useEffect(() => {
    let active = true;
    const checkScroll = () => {
      if (!active) return;
      if (tableScrollRef.current) {
        const { scrollWidth, clientWidth, scrollLeft } = tableScrollRef.current;
        const canScrollRight = scrollWidth > clientWidth + 1 && scrollLeft < (scrollWidth - clientWidth - 10);
        const canScrollLeft = scrollWidth > clientWidth + 1 && scrollLeft > 10;
        setShowScrollIndicator(canScrollRight);
        setShowScrollLeftIndicator(canScrollLeft);
      }
    };

    const handle = requestAnimationFrame(() => {
      checkScroll();
    });

    window.addEventListener("resize", checkScroll);

    return () => {
      active = false;
      cancelAnimationFrame(handle);
      window.removeEventListener("resize", checkScroll);
      if (scrollIntervalRef.current) {
        cancelAnimationFrame(scrollIntervalRef.current);
      }
    };
  }, [sources, filtered, paginated, pageSize, viewMode]);

  const resetPage = () => setCurrentPage(1);
  const handleSetFilter = (f: FilterTab) => { setActiveFilter(f); resetPage(); };
  const handleSearch = (v: string) => { setSearchQuery(v); resetPage(); };

  // Checkbox row state calculations
  const paginatedIds = paginated.map((s) => s.id);
  const allSelected = paginatedIds.length > 0 && paginatedIds.every((id) => selectedRows.has(id));
  const someSelected = paginatedIds.some((id) => selectedRows.has(id)) && !allSelected;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows((prev) => {
        const next = new Set(prev);
        paginatedIds.forEach((id) => next.add(id));
        return next;
      });
    } else {
      setSelectedRows((prev) => {
        const next = new Set(prev);
        paginatedIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddSource = (src: GlobalKnowledgeSource) => {
    const isEditing = sources.some((s) => s.id === src.id);
    if (isEditing) {
      setSources((prev) => prev.map((s) => s.id === src.id ? src : s));
    } else {
      setSources((prev) => [src, ...prev]);
      if (src.status === "pending") {
        setTimeout(() => {
          setSources((prev) => prev.map((s) => s.id === src.id ? { ...s, status: "completed" } : s));
        }, 2000);
      }
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteTargetList) return;
    const idsToDelete = new Set(deleteTargetList.map((item) => item.id));
    setSources((prev) => prev.filter((s) => !idsToDelete.has(s.id)));
    setSelectedRows((prev) => {
      const next = new Set(prev);
      idsToDelete.forEach((id) => next.delete(id));
      return next;
    });
    setDeleteTargetList(null);
    toast.success(deleteTargetList.length > 1 ? "Knowledge sources deleted" : "Knowledge source deleted");
  };

  const handleCloseDrawer = () => {
    setCreateOpen(false);
    setEditingSource(null);
  };

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all",   label: "All" },
    { key: "text",  label: "Text" },
    { key: "files", label: "Files" },
    { key: "url",   label: "URLs" },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F9FAFB" }}>
      <div className="py-6 px-[150px] space-y-6">
        
        {/* ── Page Header ── */}
        <PageHeader
          title="Knowledge Base"
          subtitle="Give your AI reference material, scoped to the exact processes and stages where it should be used."
        >
          <HowItWorksButton onClick={() => setShowHelp(true)} label="How Knowledge Base Works" />
        </PageHeader>

        {/* ── Action Toolbar (Two Rows) ── */}
        <div className="space-y-3">
          {/* Row 1: Search + Create button */}
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" />
              <input
                id="kb-search-input"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search sources…"
                className="w-full h-[44px] pl-10 pr-4 bg-input-background border border-input rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
            </div>

            <Tooltip text="Create a new Knowledge Base">
              <Button
                id="kb-create-btn"
                variant="primary"
                onClick={() => {
                  setEditingSource(null);
                  setCreateOpen(true);
                }}
                className="h-10 ml-auto"
              >
                <Plus className="w-4 h-4" />
                Create Knowledge Base
              </Button>
            </Tooltip>
          </div>

          {/* Row 2: View toggle + Filter tabs */}
          <div className="flex items-center gap-3 bg-white border border-border rounded-xl px-4 py-2.5 shadow-sm justify-start">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
              <Tooltip text="List view">
                <button
                  id="kb-view-list"
                  onClick={() => setViewMode("list")}
                  className={`h-8 w-8 rounded-md flex items-center justify-center transition-all ${
                    viewMode === "list"
                      ? "bg-white text-blue-600 shadow-xs"
                      : "bg-transparent text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <List className={`w-4 h-4 ${viewMode === "list" ? "text-blue-600" : "text-gray-500"}`} />
                </button>
              </Tooltip>
              <Tooltip text="Grid view">
                <button
                  id="kb-view-grid"
                  onClick={() => setViewMode("grid")}
                  className={`h-8 w-8 rounded-md flex items-center justify-center transition-all ${
                    viewMode === "grid"
                      ? "bg-white text-blue-600 shadow-xs"
                      : "bg-transparent text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <LayoutGrid className={`w-4 h-4 ${viewMode === "grid" ? "text-blue-600" : "text-gray-500"}`} />
                </button>
              </Tooltip>
            </div>

            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-wrap">
              {filterTabs.map((tab) => {
                const active = activeFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    id={`kb-filter-${tab.key}`}
                    onClick={() => handleSetFilter(tab.key)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md transition-all animate-in duration-100"
                    style={{
                      fontFamily: "DM Sans, sans-serif",
                      backgroundColor: active ? "#FFFFFF" : "transparent",
                      color: active ? "#020817" : "#64748B",
                      boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Bulk Actions Bar ── */}
        {selectedRows.size > 0 && (
          <div className="bg-card rounded-xl border border-border shadow-sm animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  {selectedRows.size} selected
                </span>
                <button
                  onClick={() => setSelectedRows(new Set())}
                  className="text-xs hover:text-foreground transition-colors"
                  style={{ color: "#6B7280", fontFamily: "Outfit, sans-serif" }}
                >
                  Clear selection
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip text="Delete selected knowledge sources">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDeleteTargetList(sources.filter((s) => selectedRows.has(s.id)));
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    Delete Selected
                  </Button>
                </Tooltip>
              </div>
            </div>
          </div>
        )}

        {/* ── Content View ── */}
        {filtered.length === 0 ? (
          <EmptyState onCreate={() => {
            setEditingSource(null);
            setCreateOpen(true);
          }} />
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-200">
            {paginated.map((src) => (
              <SourceCard
                key={src.id}
                src={src}
                onEdit={() => { setEditingSource(src); setCreateOpen(true); }}
                onDelete={() => setDeleteTargetList([src])}
              />
            ))}
          </div>
        ) : (
          /* List View (Table card matching Clients page) */
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden relative animate-in fade-in duration-200">
            <div
              ref={tableScrollRef}
              className="overflow-x-auto scrollbar-hide"
              style={{ scrollBehavior: "auto" }}
              onScroll={() => {
                if (tableScrollRef.current) {
                  const { scrollWidth, clientWidth, scrollLeft } = tableScrollRef.current;
                  const canScrollRight = scrollWidth > clientWidth + 1 && scrollLeft < (scrollWidth - clientWidth - 10);
                  const canScrollLeft = scrollWidth > clientWidth + 1 && scrollLeft > 10;
                  setShowScrollIndicator(canScrollRight);
                  setShowScrollLeftIndicator(canScrollLeft);
                }
              }}
            >
              <table className="w-full">
                <thead className="border-b border-border" style={{ backgroundColor: "#1F2937" }}>
                  <tr>
                    {/* Checkbox Header */}
                    <th className="px-4 py-2.5 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected;
                        }}
                        onChange={handleSelectAll}
                        className="w-3.5 h-3.5 cursor-pointer rounded border-[1.5px] border-[#E5E7EB] checked:bg-[#4F8EF7] checked:border-[#4F8EF7]"
                      />
                    </th>
                    {TABLE_HEADERS.map((h) => (
                      <th
                        key={h}
                        className={`px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-white ${
                          h === "Scope" ? "w-[280px] max-w-[280px]" : ""
                        } ${h === "Actions" ? "w-16 max-w-16" : ""}`}
                        style={{ color: "#FFFFFF", fontFamily: "Outfit, sans-serif" }}
                      >
                        {h === "Actions" ? (
                          <div className="flex items-center justify-center">
                            <Settings className="w-4 h-4 text-white" />
                          </div>
                        ) : (
                          h
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginated.map((src) => (
                    <tr
                      key={src.id}
                      className={`transition-colors ${
                        selectedRows.has(src.id) ? "bg-[#E8F0FE]" : "hover:bg-[#F1F5F9]"
                      }`}
                    >
                      {/* Checkbox Cell */}
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(src.id)}
                          onChange={() => handleSelectRow(src.id)}
                          className="w-3.5 h-3.5 cursor-pointer rounded border-[1.5px] border-[#E5E7EB] checked:bg-[#4F8EF7] checked:border-[#4F8EF7]"
                        />
                      </td>

                      {/* Actions (Hamburger vertical menu) - Moved to second column */}
                      <td className="px-4 py-2.5 relative">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 hover:bg-muted rounded transition-colors flex items-center justify-center">
                              <MoreVertical className="w-4 h-4 text-gray-500" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingSource(src); setCreateOpen(true); }}>
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteTargetList([src])} className="text-red-600 focus:text-red-600">
                              <Trash2 className="w-4 h-4 mr-2 text-red-600" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>

                      <td className="px-4 py-2.5">
                        <div className="min-w-0 max-w-[220px]">
                          <button
                            className="font-medium truncate block text-sm text-blue-600 hover:underline hover:text-blue-700 cursor-pointer text-left w-full"
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                            title={getSourceName(src)}
                            onClick={() => { setEditingSource(src); setCreateOpen(true); }}
                          >
                            {getSourceName(src)}
                          </button>
                        </div>
                      </td>

                      {/* Type Badge (neutral gray badge) */}
                      <td className="px-4 py-2.5">
                        <TypeBadge type={src.type} />
                      </td>

                      {/* Scope Cell */}
                      <td className="px-4 py-2.5 w-[280px] max-w-[280px]">
                        <ScopeChipList
                          scopes={src.scopes}
                          allProcesses={src.allProcesses}
                        />
                      </td>

                      {/* Tags Cell (moved here from Name) */}
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1 items-center">
                          {src.tags.slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium whitespace-nowrap"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            >
                              {t}
                            </span>
                          ))}
                          {src.tags.length > 2 && (
                            <Tooltip text={src.tags.slice(2).join(", ")} placement="top">
                              <span
                                className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium cursor-default whitespace-nowrap"
                                style={{ fontFamily: "Outfit, sans-serif" }}
                              >
                                +{src.tags.length - 2}
                              </span>
                            </Tooltip>
                          )}
                          {src.tags.length === 0 && <span className="text-gray-400 text-xs">—</span>}
                        </div>
                      </td>


                      {/* Status Cell */}
                      <td className="px-4 py-2.5">
                        <StatusBadge status={src.status} />
                      </td>

                      {/* Created Cell */}
                      <td className="px-4 py-2.5 text-xs whitespace-nowrap text-muted-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
                        {formatDate(src.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Scroll Right Button - Semicircle */}
            <button
              className="absolute right-0 flex items-center justify-center pointer-events-auto z-10 transition-all"
              style={{
                top: "50%",
                transform: "translateY(-50%)",
                height: "112px",
                width: "40px",
                backgroundColor: "rgba(255, 255, 255, 0.5)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                borderTopLeftRadius: "9999px",
                borderBottomLeftRadius: "9999px",
                borderTopRightRadius: "0",
                borderBottomRightRadius: "0",
                opacity: showScrollIndicator ? 1 : 0,
                visibility: showScrollIndicator ? "visible" : "hidden",
                pointerEvents: showScrollIndicator ? "auto" : "none"
              }}
              onMouseEnter={(e) => {
                if (showScrollIndicator) {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.65)";
                  e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                  const icon = e.currentTarget.querySelector("svg");
                  if (icon) {
                    (icon as SVGElement).style.transform = "scale(1.1)";
                  }
                  handleScrollRightMouseEnter();
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
                e.currentTarget.style.boxShadow = "";
                const icon = e.currentTarget.querySelector("svg");
                if (icon) {
                  (icon as SVGElement).style.transform = "scale(1)";
                }
                handleScrollMouseLeave();
              }}
            >
              <ChevronRight className="w-5 h-5 transition-transform" style={{ color: "#1F2937", opacity: 1 }} />
            </button>

            {/* Scroll Left Button - Semicircle */}
            <button
              className="absolute left-0 flex items-center justify-center pointer-events-auto z-10 transition-all"
              style={{
                top: "50%",
                transform: "translateY(-50%)",
                height: "112px",
                width: "40px",
                backgroundColor: "rgba(255, 255, 255, 0.5)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                borderTopRightRadius: "9999px",
                borderBottomRightRadius: "9999px",
                borderTopLeftRadius: "0",
                borderBottomLeftRadius: "0",
                opacity: showScrollLeftIndicator ? 1 : 0,
                visibility: showScrollLeftIndicator ? "visible" : "hidden",
                pointerEvents: showScrollLeftIndicator ? "auto" : "none"
              }}
              onMouseEnter={(e) => {
                if (showScrollLeftIndicator) {
                  e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.65)";
                  e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
                  const icon = e.currentTarget.querySelector("svg");
                  if (icon) {
                    (icon as SVGElement).style.transform = "scale(1.1)";
                  }
                  handleScrollLeftMouseEnter();
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
                e.currentTarget.style.boxShadow = "";
                const icon = e.currentTarget.querySelector("svg");
                if (icon) {
                  (icon as SVGElement).style.transform = "scale(1)";
                }
                handleScrollMouseLeave();
              }}
            >
              <ChevronLeft className="w-5 h-5 transition-transform" style={{ color: "#1F2937", opacity: 1 }} />
            </button>

            {/* ── Pagination Footer inside Table Card ── */}
            {filtered.length > 0 && (
              <div className="border-t border-border px-4 py-3 bg-card">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  {/* Left Controls */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: "#6B7280", fontFamily: "Outfit, sans-serif" }}>Rows per page:</span>
                      <select
                        id="kb-page-size-select"
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value) as PageSizeValue); resetPage(); }}
                        className="px-2 py-1 bg-input-background border border-input rounded-lg text-xs"
                      >
                        {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <span className="text-xs text-muted-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Showing {startItem}–{endItem} of {filtered.length}
                    </span>
                  </div>

                  {/* Right Navigation */}
                  <div className="flex items-center gap-1">
                    <Tooltip text="First Page">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={safePage === 1}
                        className="p-1.5 hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronsLeft className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Previous Page">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                        className="p-1.5 hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                    <span className="text-xs px-2" style={{ color: "#6B7280", fontFamily: "Outfit, sans-serif" }}>
                      Page {safePage} of {totalPages}
                    </span>
                    <Tooltip text="Next Page">
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage === totalPages}
                        className="p-1.5 hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Last Page">
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={safePage === totalPages}
                        className="p-1.5 hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronsRight className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Drawer & Modals ── */}
      <CreateKnowledgeBaseModal
        isOpen={createOpen}
        onClose={handleCloseDrawer}
        onSave={handleAddSource}
        initialSource={editingSource}
      />
      <DeleteConfirmModal
        isOpen={!!deleteTargetList}
        items={deleteTargetList || []}
        onClose={() => setDeleteTargetList(null)}
        onConfirm={handleDeleteConfirm}
      />
      <HowItWorksModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title="How Knowledge Base Works"
        summary="Add reference material — text, documents, or URLs — that your AI receptionist can refer to when answering caller questions. This scoped knowledge keeps the AI accurate and context-aware."
        bullets={[
          "Upload files (PDF, DOCX, TXT, CSV) or type raw text",
          "Scope each knowledge base to specific processes or stages",
          "AI reviews scoped material first before answering",
          "Truncate and copy KB IDs to clipboard for reference",
        ]}
        guideUrl="/guide/knowledge-base"
      />
    </div>
  );
}
