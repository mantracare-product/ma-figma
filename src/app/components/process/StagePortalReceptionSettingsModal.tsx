import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Code2,
  Eye,
  Link2,
  Image as ImageIcon,
  Plus,
  Trash2,
  ExternalLink,
  Sparkles,
  Info,
  Check,
  Building2,
  Globe,
  Database,
  Braces,
  Copy,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { StagePortalReceptionSettings } from "../../../lib/useProcessStore";
import { SelectFieldsModal } from "../help/FieldManager";

export interface StagePortalReceptionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stageName: string;
  stageColor?: string;
  processName?: string;
  activeProcessId?: string;
  initialSettings?: StagePortalReceptionSettings;
  onSave: (settings: StagePortalReceptionSettings) => void;
}

export default function StagePortalReceptionSettingsModal({
  isOpen,
  onClose,
  stageName,
  stageColor = "#3B82F6",
  processName,
  activeProcessId,
  initialSettings,
  onSave,
}: StagePortalReceptionSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"html" | "links" | "images">("html");
  const [htmlMode, setHtmlMode] = useState<"edit" | "preview">("edit");
  const [showVariablePicker, setShowVariablePicker] = useState(false);

  // Content state
  const [htmlContent, setHtmlContent] = useState(
    initialSettings?.htmlContent || initialSettings?.text || ""
  );
  const [links, setLinks] = useState<Array<{ id: string; title: string; url: string }>>(
    initialSettings?.links || []
  );
  const [images, setImages] = useState<Array<{ id: string; title: string; url: string }>>(
    initialSettings?.images || []
  );

  // Forms for adding links and images
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newImageTitle, setNewImageTitle] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialSettings) {
      setHtmlContent(initialSettings.htmlContent || initialSettings.text || "");
      setLinks(initialSettings.links || []);
      setImages(initialSettings.images || []);
    }
  }, [initialSettings, isOpen]);

  if (!isOpen) return null;

  // Insert variable keys into textarea at cursor position
  const handleInsertVariables = (keys: string[]) => {
    if (!keys || keys.length === 0) {
      setShowVariablePicker(false);
      return;
    }

    const tokenString = keys.map((k) => `{{${k}}}`).join(" ");
    const el = textareaRef.current;

    if (el) {
      const start = el.selectionStart ?? htmlContent.length;
      const end = el.selectionEnd ?? htmlContent.length;
      const updated = htmlContent.substring(0, start) + tokenString + htmlContent.substring(end);
      setHtmlContent(updated);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + tokenString.length, start + tokenString.length);
      }, 50);
    } else {
      setHtmlContent((prev) => (prev ? `${prev} ${tokenString}` : tokenString));
    }

    setShowVariablePicker(false);
    toast.success(`Inserted ${keys.length} variable ${keys.length === 1 ? "token" : "tokens"}`);
  };

  // Add Link
  const handleAddLink = () => {
    if (!newLinkUrl.trim()) {
      toast.error("Please enter a valid URL");
      return;
    }
    const item = {
      id: `lnk-${Date.now()}`,
      title: newLinkLabel.trim() || newLinkUrl.trim(),
      url: newLinkUrl.trim().startsWith("http") ? newLinkUrl.trim() : `https://${newLinkUrl.trim()}`,
    };
    setLinks((prev) => [...prev, item]);
    setNewLinkLabel("");
    setNewLinkUrl("");
    toast.success("External link added");
  };

  // Add Image
  const handleAddImage = () => {
    if (!newImageUrl.trim()) {
      toast.error("Please enter an image URL");
      return;
    }
    const item = {
      id: `img-${Date.now()}`,
      title: newImageTitle.trim() || `Image Asset ${images.length + 1}`,
      url: newImageUrl.trim(),
    };
    setImages((prev) => [...prev, item]);
    setNewImageTitle("");
    setNewImageUrl("");
    toast.success("Image asset added");
  };

  // Generate simulated preview with substituted tokens
  const getRenderedHtml = () => {
    if (!htmlContent) return '<div class="text-slate-400 italic">No HTML content provided yet.</div>';

    let rendered = htmlContent;
    const sampleValues: Record<string, string> = {
      "client.name": "Priya Sharma",
      "client.firstName": "Priya",
      "client.lastName": "Sharma",
      "client.phone": "+1 (555) 234-5678",
      "client.email": "priya.sharma@example.com",
      "appointment.date": "Oct 15, 2026",
      "appointment.time": "11:30 AM",
      "appointment.service": "Clinical Consultation",
      "appointment.provider": "Dr. Rajesh Patel",
      "invoice.id": "INV-CL-1056",
      "invoice.total": "$78.75",
      "invoice.balanceDue": "$78.75",
      "stage.name": stageName,
      "process.name": processName || "Patient Care Journey",
    };

    // Replace {{key}}
    Object.entries(sampleValues).forEach(([key, val]) => {
      rendered = rendered.split(`{{${key}}}`).join(val);
      rendered = rendered.split(`{{${key.replace("client.", "")}}}`).join(val);
    });

    return rendered;
  };

  const handleSave = () => {
    const payload: StagePortalReceptionSettings = {
      enabled: initialSettings?.enabled ?? true,
      enabledPortal: initialSettings?.enabledPortal ?? true,
      enabledReception: initialSettings?.enabledReception ?? true,
      htmlContent: htmlContent.trim(),
      text: htmlContent.trim(),
      links,
      images,
    };
    onSave(payload);
    toast.success(`Settings saved for stage "${stageName}"`);
    onClose();
  };

  return (
    <>
      {/* Sliding Drawer Shell (matches Call Detail / Call Trigger Drawer) */}
      <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity animate-in fade-in duration-200"
          onClick={onClose}
        />

        {/* Drawer Panel */}
        <div
          className="relative w-full max-w-xl sm:max-w-2xl bg-white shadow-2xl h-full flex flex-col z-50 transform transition-transform duration-300 ease-out border-l border-gray-200 animate-in slide-in-from-right duration-300"
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
                style={{ backgroundColor: stageColor }}
              >
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900 tracking-tight">
                    Stage Portal & Reception Settings
                  </h3>
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: `${stageColor}15`,
                      color: stageColor,
                      borderColor: `${stageColor}40`,
                    }}
                  >
                    {stageName}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  Configure custom HTML guidance, data variables, links, and media assets.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 bg-white px-6 gap-6 flex-shrink-0">
            <button
              onClick={() => setActiveTab("html")}
              className={`py-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "html"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>HTML Block & Preview</span>
            </button>

            <button
              onClick={() => setActiveTab("links")}
              className={`py-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "links"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <Link2 className="w-4 h-4" />
              <span>Links ({links.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("images")}
              className={`py-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "images"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Images ({images.length})</span>
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* TAB 1: HTML BLOCK & PREVIEW */}
            {activeTab === "html" && (
              <div className="space-y-4">
                {/* Mode Selector & Variable Picker Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/80 p-2.5 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200">
                    <button
                      type="button"
                      onClick={() => setHtmlMode("edit")}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        htmlMode === "edit"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Edit HTML</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setHtmlMode("preview")}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        htmlMode === "preview"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Show Preview</span>
                    </button>
                  </div>

                  {/* Select Field Variable Button */}
                  <button
                    type="button"
                    onClick={() => setShowVariablePicker(true)}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100/80 text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Braces className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Select Field Variable</span>
                  </button>
                </div>

                {/* Quick Variable Pill Bar */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] font-bold text-gray-400 mr-1">Quick Tokens:</span>
                  {[
                    "client.name",
                    "appointment.date",
                    "appointment.time",
                    "invoice.total",
                    "invoice.balanceDue",
                    "stage.name",
                  ].map((tok) => (
                    <button
                      key={tok}
                      type="button"
                      onClick={() => handleInsertVariables([tok])}
                      className="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-blue-50 hover:text-blue-600 border border-gray-200 text-[11px] font-mono text-gray-600 transition-colors cursor-pointer"
                      title={`Click to insert {{${tok}}}`}
                    >
                      +{`{{${tok}}}`}
                    </button>
                  ))}
                </div>

                {/* Editor or Preview */}
                {htmlMode === "edit" ? (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Stage HTML & Rich Content Block
                    </label>
                    <div className="relative rounded-2xl border-2 border-gray-200 focus-within:border-blue-600 overflow-hidden shadow-xs transition-all">
                      <textarea
                        ref={textareaRef}
                        rows={14}
                        value={htmlContent}
                        onChange={(e) => setHtmlContent(e.target.value)}
                        placeholder={`<div class="stage-guide">\n  <h3>Welcome, {{client.name}}!</h3>\n  <p>You have arrived at stage <strong>{{stage.name}}</strong>.</p>\n  <p>Your appointment is scheduled for {{appointment.date}} at {{appointment.time}}.</p>\n  <p>Outstanding balance: {{invoice.total}}</p>\n</div>`}
                        className="w-full p-4 font-mono text-xs sm:text-sm text-gray-900 bg-slate-900 text-emerald-400 placeholder:text-slate-600 outline-none resize-y leading-relaxed"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Standard HTML markup supported. Data variables enclosed in <code className="bg-gray-100 text-blue-700 px-1 py-0.5 rounded font-mono font-bold">{"{{variable}}"}</code> will dynamically resolve for the active patient.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Live Preview (Rendered Output)
                      </label>
                      <span className="text-[11px] text-gray-400 italic">
                        Previewed with sample patient variables
                      </span>
                    </div>

                    <div className="p-6 rounded-2xl border-2 border-blue-200 bg-white shadow-inner min-h-[300px] overflow-y-auto prose prose-sm max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: getRenderedHtml() }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: LINKS */}
            {activeTab === "links" && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Add External Link
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Link Label (e.g. Patient Intake Form)"
                      value={newLinkLabel}
                      onChange={(e) => setNewLinkLabel(e.target.value)}
                      className="h-10 px-3 rounded-xl border border-gray-300 text-xs text-gray-800 placeholder:text-gray-400 outline-none focus:border-blue-600"
                    />
                    <input
                      type="url"
                      placeholder="URL (https://example.com/form)"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      className="h-10 px-3 rounded-xl border border-gray-300 text-xs text-gray-800 placeholder:text-gray-400 outline-none focus:border-blue-600"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddLink}
                    className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Link</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Configured Links ({links.length})
                  </span>
                  {links.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      No external links configured for this stage yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden bg-white">
                      {links.map((link) => (
                        <div key={link.id} className="p-3.5 flex items-center justify-between text-xs">
                          <div className="space-y-0.5">
                            <span className="font-bold text-gray-900 block">{link.title}</span>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1 font-mono text-[11px]"
                            >
                              <span>{link.url}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <button
                            type="button"
                            onClick={() => setLinks(links.filter((l) => l.id !== link.id))}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove Link"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: IMAGES */}
            {activeTab === "images" && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Add Image Asset
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Image Caption / Title"
                      value={newImageTitle}
                      onChange={(e) => setNewImageTitle(e.target.value)}
                      className="h-10 px-3 rounded-xl border border-gray-300 text-xs text-gray-800 placeholder:text-gray-400 outline-none focus:border-blue-600"
                    />
                    <input
                      type="url"
                      placeholder="Image URL (https://...)"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      className="h-10 px-3 rounded-xl border border-gray-300 text-xs text-gray-800 placeholder:text-gray-400 outline-none focus:border-blue-600"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddImage}
                    className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Image</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Stage Media Gallery ({images.length})
                  </span>
                  {images.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      No images added for this stage yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {images.map((img) => (
                        <div
                          key={img.id}
                          className="p-3 bg-white rounded-xl border border-gray-200 flex flex-col justify-between space-y-2 group"
                        >
                          <div className="h-28 w-full bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center relative">
                            <img
                              src={img.url}
                              alt={img.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as any).src = "https://placehold.co/400x200?text=Preview+Error";
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setImages(images.filter((i) => i.id !== img.id))}
                              className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                              title="Delete Image"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="text-xs font-semibold text-gray-800 truncate block">
                            {img.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-xs font-bold text-gray-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-98 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Stage Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Select Field Variable Modal (Exact same modal used in Document Template Builder & Pitch) */}
      {showVariablePicker && (
        <SelectFieldsModal
          initiallySelected={[]}
          activeProcessId={activeProcessId}
          activeProcessName={processName}
          onClose={() => setShowVariablePicker(false)}
          onApply={handleInsertVariables}
        />
      )}
    </>
  );
}
