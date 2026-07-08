import React, { useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Edit,
  FileText,
  Link as LinkIcon,
  Type,
  Info,
  Upload,
  Database,
  AlertCircle,
  Play,
} from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { toast } from "sonner";

export type KnowledgeSourceType = "text" | "document" | "url";

export interface KnowledgeTextSource {
  id: string;
  type: "text";
  title: string;
  content: string;
}

export interface KnowledgeDocumentSource {
  id: string;
  type: "document";
  fileName: string;
  fileSizeLabel: string;
  fileUrl?: string;
}

export interface KnowledgeUrlSource {
  id: string;
  type: "url";
  url: string;
  label?: string;
  scopeNote: "single-page-only";
  status?: "pending" | "indexed" | "failed";
}

export type KnowledgeSource =
  | KnowledgeTextSource
  | KnowledgeDocumentSource
  | KnowledgeUrlSource;

export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  sources: KnowledgeSource[];
  createdAt: string;
}

interface KnowledgeBaseTabProps {
  processName: string;
  stageName: string;
  knowledgeBases: KnowledgeBase[];
  onKnowledgeBasesChange: (knowledgeBases: KnowledgeBase[]) => void;
}

const genId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const SOURCE_TYPE_META: Record<
  KnowledgeSourceType,
  { label: string; icon: React.ReactNode; tooltip: string }
> = {
  text: {
    label: "Text",
    icon: <Type className="w-4 h-4 text-white" />,
    tooltip: "Type or paste raw text for the AI to use as-is.",
  },
  document: {
    label: "Document",
    icon: <FileText className="w-4 h-4 text-white" />,
    tooltip: "Upload a PDF, DOCX, TXT, or CSV file for the AI to reference.",
  },
  url: {
    label: "URL",
    icon: <LinkIcon className="w-4 h-4 text-white" />,
    tooltip: "AI reads only this exact page — it won't crawl other pages.",
  },
};

const KnowledgeBaseCard: React.FC<{
  kb: KnowledgeBase;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ kb, onEdit, onDelete }) => {
  const textCount = kb.sources.filter((s) => s.type === "text").length;
  const docCount = kb.sources.filter((s) => s.type === "document").length;
  const urlCount = kb.sources.filter((s) => s.type === "url").length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#EFF6FF" }}
          >
            <Database className="w-5 h-5" style={{ color: "#2563EB" }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-sm font-bold truncate"
                style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
              >
                {kb.name}
              </span>
              <span
                className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-mono"
                title="Knowledge Base ID"
              >
                {kb.id}
              </span>
            </div>
            {kb.description && (
              <p
                className="text-xs mt-0.5 truncate max-w-md"
                style={{ color: "#64748B", fontFamily: "Outfit, sans-serif" }}
              >
                {kb.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {textCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <Type className="w-3.5 h-3.5" /> {textCount} text
                </span>
              )}
              {docCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <FileText className="w-3.5 h-3.5" /> {docCount} document
                  {docCount > 1 ? "s" : ""}
                </span>
              )}
              {urlCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <LinkIcon className="w-3.5 h-3.5" /> {urlCount} URL
                  {urlCount > 1 ? "s" : ""}
                </span>
              )}
              {kb.sources.length === 0 && (
                <span className="text-xs italic text-gray-400">
                  No material added yet
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Tooltip text="Edit">
            <button
              onClick={onEdit}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
            >
              <Edit className="w-4 h-4 text-gray-500" />
            </button>
          </Tooltip>
          <Tooltip text="Delete">
            <button
              onClick={onDelete}
              className="p-1.5 rounded hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

/**
 * Create/edit modal. Order: Name/ID -> Description -> Add Material -> Attached Material.
 */
const KnowledgeBaseEditor: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  initialKb: KnowledgeBase | null;
  knowledgeBases: KnowledgeBase[];
  onSave: (kb: KnowledgeBase) => void;
}> = ({ isOpen, onClose, initialKb, knowledgeBases, onSave }) => {
  const isEditing = !!initialKb;
  const [kbId, setKbId] = useState<string>(initialKb?.id ?? "");
  const [kbName, setKbName] = useState(initialKb?.name ?? "");
  const [kbDescription, setKbDescription] = useState(initialKb?.description ?? "");
  const [sources, setSources] = useState<KnowledgeSource[]>(initialKb?.sources ?? []);
  const [addSourceType, setAddSourceType] = useState<KnowledgeSourceType | null>(null);

  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");

  const [urlValue, setUrlValue] = useState("");
  const [urlLabel, setUrlLabel] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetDrafts = () => {
    setAddSourceType(null);
    setTextTitle("");
    setTextContent("");
    setUrlValue("");
    setUrlLabel("");
  };

  const handleAddText = () => {
    if (!textTitle.trim() || !textContent.trim()) {
      toast.error("Please add both a title and content for this text source");
      return;
    }
    const newSource: KnowledgeTextSource = {
      id: genId("src"),
      type: "text",
      title: textTitle.trim(),
      content: textContent.trim(),
    };
    setSources((prev) => [...prev, newSource]);
    resetDrafts();
    toast.success("Text source added");
  };

  const handleAddUrl = () => {
    const trimmed = urlValue.trim();
    if (!trimmed) {
      toast.error("Please enter a URL");
      return;
    }
    let normalized = trimmed;
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    }
    try {
      // eslint-disable-next-line no-new
      new URL(normalized);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }
    const newSource: KnowledgeUrlSource = {
      id: genId("src"),
      type: "url",
      url: normalized,
      label: urlLabel.trim() || undefined,
      scopeNote: "single-page-only",
      status: "pending",
    };
    setSources((prev) => [...prev, newSource]);
    resetDrafts();
    toast.success("URL added");
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newSources: KnowledgeDocumentSource[] = Array.from(files).map((file) => ({
      id: genId("src"),
      type: "document",
      fileName: file.name,
      fileSizeLabel: formatBytes(file.size),
    }));
    setSources((prev) => [...prev, ...newSources]);
    toast.success(
      `${newSources.length} document${newSources.length > 1 ? "s" : ""} added`
    );
    setAddSourceType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveSource = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSaveKb = () => {
    if (!kbName.trim()) {
      toast.error("Please give this Knowledge Base a name");
      return;
    }
    const trimmedId = kbId.trim();
    let finalId = trimmedId;
    if (finalId) {
      finalId = finalId
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_-]/g, "");
    }
    if (!finalId) {
      finalId = genId("kb");
    }

    const isDuplicate = knowledgeBases.some(
      (kb) => kb.id === finalId && kb.id !== initialKb?.id
    );
    if (isDuplicate) {
      toast.error("This Knowledge Base ID is already in use");
      return;
    }

    const kb: KnowledgeBase = {
      id: finalId,
      name: kbName.trim(),
      description: kbDescription.trim() || undefined,
      sources,
      createdAt: initialKb?.createdAt ?? new Date().toISOString(),
    };
    onSave(kb);
    toast.success(isEditing ? "Knowledge Base updated" : "Knowledge Base created");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Knowledge Base" : "Create Knowledge Base"}
      maxWidth="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveKb}>
            {isEditing ? "Save Changes" : "Create Knowledge Base"}
          </Button>
        </>
      }
    >
      <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
        {/* Name + ID */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label
                className="text-sm font-medium"
                style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
              >
                Knowledge Base Name
              </label>
              <Tooltip text="A name to identify this knowledge base later.">
                <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
              </Tooltip>
            </div>
            <Input
              value={kbName}
              onChange={(e) => setKbName(e.target.value)}
              placeholder="e.g. Insurance Policy FAQs"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label
                className="text-sm font-medium"
                style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
              >
                Knowledge Base ID
              </label>
              <Tooltip text="A unique ID for this knowledge base. Choose your own or we'll generate one if left blank.">
                <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
              </Tooltip>
            </div>
            <Input
              value={kbId}
              onChange={(e) => setKbId(e.target.value)}
              placeholder="e.g. kb_insurance_faqs"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label
              className="text-sm font-medium"
              style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
            >
              Description (optional)
            </label>
            <Tooltip text="A short note on what this knowledge base covers.">
              <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
            </Tooltip>
          </div>
          <textarea
            value={kbDescription}
            onChange={(e) => setKbDescription(e.target.value)}
            placeholder="What kind of information does this knowledge base cover?"
            className="w-full px-4 py-2.5 bg-input-background border border-input rounded-lg resize-none text-sm"
            style={{ fontFamily: "Outfit, sans-serif", minHeight: "70px" }}
          />
        </div>

        {/* Add Material — now BEFORE Attached Material */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <span
              className="text-sm font-semibold"
              style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
            >
              Add Material
            </span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(SOURCE_TYPE_META) as KnowledgeSourceType[]).map((type) => {
                const meta = SOURCE_TYPE_META[type];
                const active = addSourceType === type;
                return (
                  <Tooltip key={type} text={meta.tooltip} placement="top">
                    <button
                      type="button"
                      onClick={() => setAddSourceType(active ? null : type)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${active
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"
                        }`}
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: active ? "#2563EB" : "#94A3B8" }}
                      >
                        {meta.icon}
                      </div>
                      {meta.label}
                    </button>
                  </Tooltip>
                );
              })}
            </div>

            {addSourceType === "text" && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                    Title
                  </label>
                  <Input
                    value={textTitle}
                    onChange={(e) => setTextTitle(e.target.value)}
                    placeholder="e.g. Cancellation Policy"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                    Content
                  </label>
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Paste or type the reference text here..."
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg resize-none text-sm"
                    style={{ fontFamily: "Outfit, sans-serif", minHeight: "90px" }}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleAddText}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Text
                  </button>
                </div>
              </div>
            )}

            {addSourceType === "document" && (
              <div className="pt-2">
                <label className="text-xs font-semibold text-gray-600 mb-2 block">
                  Upload document(s)
                </label>
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.csv"
                    onChange={(e) => handleFilesSelected(e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 p-6 text-center">
                    <Upload className="w-7 h-7 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-700">
                      Click or drag files here to upload
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PDF, DOCX, TXT, or CSV
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* URL form — Label above Page URL, no banner */}
            {addSourceType === "url" && (
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="text-xs font-semibold text-gray-600">
                      Label (optional)
                    </label>
                    <Tooltip text="A friendly name to identify this URL in the list.">
                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                    </Tooltip>
                  </div>
                  <Input
                    value={urlLabel}
                    onChange={(e) => setUrlLabel(e.target.value)}
                    placeholder="e.g. Pricing Page"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="text-xs font-semibold text-gray-600">Page URL</label>
                    <Tooltip text="AI reads only this page — won't follow links or crawl the site.">
                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                    </Tooltip>
                  </div>
                  <Input
                    value={urlValue}
                    onChange={(e) => setUrlValue(e.target.value)}
                    placeholder="https://example.com/faq"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleAddUrl}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add URL
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Attached Material — now AFTER Add Material */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <label
                className="text-sm font-medium"
                style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
              >
                Attached Material
              </label>
              <Tooltip text="Everything the AI can use for this knowledge base.">
                <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
              </Tooltip>
            </div>
            <span className="text-xs text-gray-400">
              {sources.length} item{sources.length !== 1 ? "s" : ""}
            </span>
          </div>

          {sources.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-gray-200 rounded-lg">
              <p className="text-sm text-gray-400" style={{ fontFamily: "Outfit, sans-serif" }}>
                No material attached yet. Add text, a document, or a URL above.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-white"
                >
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#2563EB" }}
                  >
                    {SOURCE_TYPE_META[source.type].icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    {source.type === "text" && (
                      <>
                        <p
                          className="text-sm font-semibold truncate"
                          style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
                        >
                          {source.title}
                        </p>
                        <p
                          className="text-xs text-gray-500 truncate"
                          style={{ fontFamily: "Outfit, sans-serif" }}
                        >
                          {source.content.slice(0, 90)}
                          {source.content.length > 90 ? "…" : ""}
                        </p>
                      </>
                    )}
                    {source.type === "document" && (
                      <>
                        <p
                          className="text-sm font-semibold truncate"
                          style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
                        >
                          {source.fileName}
                        </p>
                        <p className="text-xs text-gray-500">{source.fileSizeLabel}</p>
                      </>
                    )}
                    {source.type === "url" && (
                      <>
                        <p
                          className="text-sm font-semibold truncate"
                          style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
                        >
                          {source.label || source.url}
                        </p>
                        <p className="text-xs text-blue-600 truncate">{source.url}</p>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveSource(source.id)}
                    className="p-1.5 rounded hover:bg-red-50 transition-colors flex-shrink-0"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

const KnowledgeBaseHowItWorksModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="How Knowledge Base Works">
    <div className="space-y-4">
      <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
        <div className="text-center">
          <Play className="w-16 h-16 mx-auto mb-3" style={{ color: "#64748B" }} />
          <p style={{ color: "#64748B", fontFamily: "Outfit, sans-serif" }}>
            Video tutorial placeholder
          </p>
          <p className="text-sm mt-1" style={{ color: "#64748B", fontFamily: "Outfit, sans-serif" }}>
            Embedded video would appear here
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <h4 className="font-semibold" style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}>
          Helping the AI answer caller questions
        </h4>
        <p className="text-sm" style={{ color: "#64748B", fontFamily: "Outfit, sans-serif" }}>
          Anything you attach here — text, documents, or a page URL — becomes
          reference material the AI can pull from only while it's active in
          this stage. Instead of guessing or giving a generic answer, the AI
          checks this material first, so callers get accurate, stage-specific
          responses.
        </p>
      </div>
    </div>
  </Modal>
);

const KnowledgeBaseTab: React.FC<KnowledgeBaseTabProps> = ({
  processName,
  stageName,
  knowledgeBases,
  onKnowledgeBasesChange,
}) => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingKb, setEditingKb] = useState<KnowledgeBase | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [kbToDelete, setKbToDelete] = useState<KnowledgeBase | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const openCreate = () => {
    setEditingKb(null);
    setEditorOpen(true);
  };

  const openEdit = (kb: KnowledgeBase) => {
    setEditingKb(kb);
    setEditorOpen(true);
  };

  const handleSaveKb = (kb: KnowledgeBase) => {
    const exists = knowledgeBases.some((k) => k.id === kb.id);
    if (exists) {
      onKnowledgeBasesChange(knowledgeBases.map((k) => (k.id === kb.id ? kb : k)));
    } else {
      onKnowledgeBasesChange([...knowledgeBases, kb]);
    }
  };

  const confirmDelete = (kb: KnowledgeBase) => {
    setKbToDelete(kb);
    setShowDeleteConfirm(true);
  };

  const handleDelete = () => {
    if (!kbToDelete) return;
    onKnowledgeBasesChange(knowledgeBases.filter((k) => k.id !== kbToDelete.id));
    setShowDeleteConfirm(false);
    setKbToDelete(null);
    toast.success("Knowledge Base deleted");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#EFF6FF" }}
            >
              <Database className="w-5 h-5" style={{ color: "#2563EB" }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  className="text-lg font-bold"
                  style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
                >
                  Knowledge Base
                </h3>
                <Tooltip text="Reference material the AI can use for this stage only.">
                  <Info className="w-4 h-4 text-gray-400 cursor-help" />
                </Tooltip>
              </div>
              <button
                onClick={() => setShowHowItWorks(true)}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline underline-offset-2 mt-1 transition-colors"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                How it works
              </button>
            </div>
          </div>
          <Tooltip text="Create a new Knowledge Base">
            <button
              onClick={openCreate}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 transition-all shadow-md hover:shadow-lg flex-shrink-0"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          </Tooltip>
        </div>
      </div>

      {knowledgeBases.length === 0 ? (
        <div className="text-center py-14 border-2 border-dashed border-gray-200 rounded-2xl">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Database className="w-7 h-7 text-gray-400" />
          </div>
          <h4
            className="text-base font-semibold mb-1"
            style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}
          >
            No Knowledge Bases yet
          </h4>
          <p
            className="text-sm max-w-sm mx-auto mb-4"
            style={{ color: "#64748B", fontFamily: "Outfit, sans-serif" }}
          >
            Create one to give the AI reference material for this stage.
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Knowledge Base
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {knowledgeBases.map((kb) => (
            <KnowledgeBaseCard
              key={kb.id}
              kb={kb}
              onEdit={() => openEdit(kb)}
              onDelete={() => confirmDelete(kb)}
            />
          ))}
        </div>
      )}

      <KnowledgeBaseEditor
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        initialKb={editingKb}
        knowledgeBases={knowledgeBases}
        onSave={handleSaveKb}
      />

      <KnowledgeBaseHowItWorksModal
        isOpen={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
      />

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setKbToDelete(null);
        }}
        title="Delete Knowledge Base"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setKbToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-base" style={{ color: "#020817", fontFamily: "DM Sans, sans-serif" }}>
              Are you sure you want to delete this Knowledge Base?
            </p>
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
              <p className="font-semibold text-destructive" style={{ fontFamily: "DM Sans, sans-serif" }}>
                {kbToDelete?.name}
              </p>
            </div>
          </div>
          <p className="text-sm text-center" style={{ color: "#64748B", fontFamily: "Outfit, sans-serif" }}>
            This will permanently remove all attached material, and the AI
            will no longer have access to it for this stage.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default KnowledgeBaseTab;