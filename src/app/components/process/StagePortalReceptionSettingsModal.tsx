import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Code,
  Eye,
  CheckCircle2,
  ChevronDown,
  Search,
  Sparkles,
  Info,
  Radio,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { StagePortalReceptionSettings } from "../../../lib/useProcessStore";

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

const VARIABLE_GROUPS = [
  {
    module: "CLIENTS",
    label: "Client Details",
    fields: [
      { key: "client.name", label: "Client Full Name" },
      { key: "client.firstName", label: "Client First Name" },
      { key: "client.lastName", label: "Client Last Name" },
      { key: "client.phone", label: "Client Phone Number" },
      { key: "client.email", label: "Client Email Address" },
      { key: "client.id", label: "Patient / Client ID" },
    ],
  },
  {
    module: "APPOINTMENTS",
    label: "Appointments & Visits",
    fields: [
      { key: "appointment.date", label: "Appointment Date" },
      { key: "appointment.time", label: "Appointment Time" },
      { key: "appointment.service", label: "Consultation / Service Name" },
      { key: "appointment.provider", label: "Doctor / Specialist Name" },
      { key: "appointment.room", label: "Consultation Room" },
    ],
  },
  {
    module: "INVOICES",
    label: "Invoices & Billing",
    fields: [
      { key: "invoice.id", label: "Invoice Number / ID" },
      { key: "invoice.total", label: "Total Invoice Amount" },
      { key: "invoice.balanceDue", label: "Outstanding Balance Due" },
      { key: "invoice.status", label: "Payment Status" },
    ],
  },
  {
    module: "STAGE",
    label: "Stage & Workflow Context",
    fields: [
      { key: "stage.name", label: "Current Stage Name" },
      { key: "process.name", label: "Active Care Workflow" },
      { key: "clinic.name", label: "Clinic / Center Name" },
    ],
  },
];

export default function StagePortalReceptionSettingsModal({
  isOpen,
  onClose,
  stageName,
  stageColor = "#3B82F6",
  processName,
  initialSettings,
  onSave,
}: StagePortalReceptionSettingsModalProps) {
  const [editorTab, setEditorTab] = useState<"html" | "preview">("html");
  const [cardTitle, setCardTitle] = useState(
    initialSettings?.cardTitle || stageName
  );
  const [cardDescription, setCardDescription] = useState(
    initialSettings?.cardDescription || ""
  );
  const [htmlContent, setHtmlContent] = useState(
    initialSettings?.htmlContent || initialSettings?.text || ""
  );

  // Field selector popover
  const [fieldDropdownOpen, setFieldDropdownOpen] = useState(false);
  const [fieldSearchQuery, setFieldSearchQuery] = useState("");
  const [selectedFieldsForDropdown, setSelectedFieldsForDropdown] = useState<string[]>([]);
  const [collapsedDropdownSections, setCollapsedDropdownSections] = useState<Record<string, boolean>>({});

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialSettings) {
      setCardTitle(initialSettings.cardTitle || stageName);
      setCardDescription(initialSettings.cardDescription || "");
      setHtmlContent(initialSettings.htmlContent || initialSettings.text || "");
    } else {
      setCardTitle(stageName);
      setCardDescription("");
      setHtmlContent("");
    }
  }, [initialSettings, stageName, isOpen]);

  if (!isOpen) return null;

  // Insert token variables at cursor position
  const handleApplyDropdownFields = () => {
    if (selectedFieldsForDropdown.length === 0) {
      setFieldDropdownOpen(false);
      return;
    }

    const tokenString = selectedFieldsForDropdown.map((k) => `{{${k}}}`).join(" ");
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

    toast.success(`Inserted ${selectedFieldsForDropdown.length} variable ${selectedFieldsForDropdown.length === 1 ? "token" : "tokens"}`);
    setSelectedFieldsForDropdown([]);
    setFieldDropdownOpen(false);
  };

  const handleInsertSingleToken = (token: string) => {
    const tokenString = `{{${token}}}`;
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
    toast.success(`Inserted {{${token}}}`);
  };

  const toggleDropdownSection = (moduleKey: string) => {
    setCollapsedDropdownSections((prev) => ({
      ...prev,
      [moduleKey]: !prev[moduleKey],
    }));
  };

  // Generate simulated live preview with sample patient data
  const getRenderedHtml = () => {
    if (!htmlContent.trim()) {
      return '<div class="text-slate-400 italic py-6 text-center">No HTML content configured yet. Switch to HTML tab to write your guide or insert variables.</div>';
    }

    let rendered = htmlContent;
    const sampleValues: Record<string, string> = {
      "client.name": "Priya Sharma",
      "client.firstName": "Priya",
      "client.lastName": "Sharma",
      "client.phone": "+1 (555) 234-5678",
      "client.email": "priya.sharma@example.com",
      "client.id": "CL-032",
      "appointment.date": "Oct 15, 2026",
      "appointment.time": "11:30 AM",
      "appointment.service": "Clinical Consultation",
      "appointment.provider": "Dr. Rajesh Patel",
      "appointment.room": "Consultation Room 3",
      "invoice.id": "INV-CL-1056",
      "invoice.total": "$78.75",
      "invoice.balanceDue": "$78.75",
      "invoice.status": "Pending",
      "stage.name": stageName,
      "process.name": processName || "Patient Care Journey",
      "clinic.name": "Mantra Clinic & Wellness Center",
    };

    Object.entries(sampleValues).forEach(([key, val]) => {
      rendered = rendered.split(`{{${key}}}`).join(val);
      rendered = rendered.split(`{${key}}`).join(val);
    });

    return rendered;
  };

  const handleSave = () => {
    const payload: StagePortalReceptionSettings = {
      enabled: initialSettings?.enabled ?? true,
      enabledPortal: initialSettings?.enabledPortal ?? true,
      enabledReception: initialSettings?.enabledReception ?? true,
      cardTitle: cardTitle.trim() || stageName,
      cardDescription: cardDescription.trim(),
      htmlContent: htmlContent.trim(),
      text: htmlContent.trim(),
    };
    onSave(payload);
    toast.success(`Settings saved for stage "${stageName}"`);
    onClose();
  };

  // Filtered groups for variable picker
  const filteredGroups = VARIABLE_GROUPS.map((g) => {
    const q = fieldSearchQuery.toLowerCase().trim();
    if (!q) return g;
    return {
      ...g,
      fields: g.fields.filter(
        (f) => f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q)
      ),
    };
  }).filter((g) => g.fields.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className="relative w-full max-w-xl sm:max-w-2xl bg-white shadow-2xl h-full flex flex-col z-50 transform transition-transform duration-300 ease-out border-l border-slate-200 animate-in slide-in-from-right duration-300"
        style={{ fontFamily: "Outfit, sans-serif" }}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: stageColor }}
            >
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
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
              <p className="text-xs text-slate-500 font-medium">
                Configure card title, description, and interactive HTML guidance for this stage.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Card Title */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="block text-xs font-semibold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                Card Title *
              </label>
              <span className="text-[10px] text-slate-400 font-normal">
                (Displayed on patient portal activity card & AI receptionist)
              </span>
            </div>
            <input
              type="text"
              required
              placeholder="e.g. Clinic Check-In & Identity Verification"
              value={cardTitle}
              onChange={(e) => setCardTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-slate-500 shadow-2xs"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            />
          </div>

          {/* Card Description */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="block text-xs font-semibold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                Card Description
              </label>
              <span className="text-[10px] text-slate-400 font-normal">
                (Brief summary displayed under the card title)
              </span>
            </div>
            <input
              type="text"
              placeholder="e.g. Verified at Reception Desk / AI Kiosk"
              value={cardDescription}
              onChange={(e) => setCardDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-slate-500 shadow-2xs"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            />
          </div>

          {/* Document Template Builder Content Block */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="block text-xs font-semibold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Interactive Detail Content *
                </label>

                {/* Tabs: HTML and Preview (Identical to Document Template Builder) */}
                <div className="flex items-center p-0.5 bg-slate-100 border border-slate-200/80 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setEditorTab("html")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      editorTab === "html"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>HTML</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab("preview")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      editorTab === "preview"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>
                </div>
              </div>

              {/* Toolbar: Select Fields Dropdown */}
              <div className="flex items-center gap-2">
                <div className="relative inline-block">
                  <button
                    type="button"
                    onClick={() => setFieldDropdownOpen((v) => !v)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 text-blue-600 border border-slate-200 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <span className="font-mono text-blue-600 font-bold">{"{ }"}</span>
                    <span>Select Fields</span>
                    <ChevronDown className={`w-3 h-3 text-blue-600 transition-transform ${fieldDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Popover Selector (Identical to Document Template Builder) */}
                  {fieldDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setFieldDropdownOpen(false)} />
                      <div
                        className="absolute right-0 top-full mt-1.5 w-[420px] max-w-[85vw] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden text-left animate-in fade-in-50 zoom-in-95 duration-100 flex flex-col max-h-[460px]"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {/* Dropdown Header */}
                        <div className="p-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between flex-shrink-0">
                          <div>
                            <h4 className="font-bold text-xs text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                              Select Field Variables
                            </h4>
                            <p className="text-[10px] text-slate-500">Insert placeholder tokens into your stage HTML block</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFieldDropdownOpen(false)}
                            className="text-slate-400 hover:text-slate-700 text-xs p-1 rounded hover:bg-slate-100 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Search Input */}
                        <div className="p-2 border-b border-slate-100 flex-shrink-0 bg-white">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                              type="text"
                              value={fieldSearchQuery}
                              onChange={(e) => setFieldSearchQuery(e.target.value)}
                              placeholder="Search fields across all categories..."
                              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 bg-slate-50/50"
                              style={{ fontFamily: "DM Sans, sans-serif" }}
                            />
                          </div>
                        </div>

                        {/* Collapsible Modules List */}
                        <div className="flex-1 overflow-y-auto p-2.5 space-y-2 min-h-0 bg-[#fafafa]">
                          {filteredGroups.map((group) => {
                            const isCollapsed = !!collapsedDropdownSections[group.module];
                            return (
                              <div key={group.module} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                                <button
                                  type="button"
                                  onClick={() => toggleDropdownSection(group.module)}
                                  className="w-full flex items-center justify-between px-3 py-2 bg-slate-50/70 hover:bg-slate-100/70 transition-colors border-b border-slate-100 text-left cursor-pointer"
                                >
                                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                    {group.label} ({group.fields.length})
                                  </span>
                                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                                </button>

                                {!isCollapsed && (
                                  <div className="p-2 space-y-1">
                                    <div className="grid grid-cols-1 gap-1">
                                      {group.fields.map((f) => {
                                        const isChecked = selectedFieldsForDropdown.includes(f.key);
                                        return (
                                          <label
                                            key={`${group.module}-${f.key}`}
                                            className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-colors border select-none ${
                                              isChecked ? "bg-blue-50/70 border-blue-200" : "hover:bg-slate-50 border-transparent"
                                            }`}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={(e) => {
                                                if (e.target.checked) {
                                                  setSelectedFieldsForDropdown((prev) => [...prev, f.key]);
                                                } else {
                                                  setSelectedFieldsForDropdown((prev) => prev.filter((k) => k !== f.key));
                                                }
                                              }}
                                              className="w-3.5 h-3.5 rounded text-blue-600 accent-blue-600 cursor-pointer"
                                            />
                                            <div className="flex items-center justify-between min-w-0 flex-1">
                                              <span className="text-[11px] font-semibold text-slate-800 truncate" style={{ fontFamily: "DM Sans, sans-serif" }}>
                                                {f.label}
                                              </span>
                                              <span className="text-[10px] text-slate-400 font-mono ml-2">
                                                {"{{"}{f.key}{"}}"}
                                              </span>
                                            </div>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {filteredGroups.length === 0 && (
                            <div className="text-center py-6 text-xs text-slate-400">
                              No fields found matching your search.
                            </div>
                          )}
                        </div>

                        {/* Footer */}
                        <div className="p-2.5 border-t border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
                          <span className="text-xs text-slate-600 font-semibold" style={{ fontFamily: "DM Sans, sans-serif" }}>
                            {selectedFieldsForDropdown.length} selected
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setFieldDropdownOpen(false)}
                              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
                              style={{ fontFamily: "DM Sans, sans-serif" }}
                            >
                              CANCEL
                            </button>
                            <button
                              type="button"
                              onClick={handleApplyDropdownFields}
                              disabled={selectedFieldsForDropdown.length === 0}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                selectedFieldsForDropdown.length > 0
                                  ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
                                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
                              }`}
                              style={{ fontFamily: "DM Sans, sans-serif" }}
                            >
                              <span>APPLY</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Token Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Quick Tokens:</span>
              {[
                "client.name",
                "appointment.date",
                "appointment.time",
                "invoice.total",
                "stage.name",
              ].map((tok) => (
                <button
                  key={tok}
                  type="button"
                  onClick={() => handleInsertSingleToken(tok)}
                  className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 text-[10px] font-mono text-slate-600 transition-colors cursor-pointer"
                  title={`Click to insert {{${tok}}}`}
                >
                  +{`{{${tok}}}`}
                </button>
              ))}
            </div>

            {/* Editor Block (Template Builder style) */}
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs bg-white">
              {editorTab === "html" ? (
                <>
                  <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-50 border-b border-slate-200">
                    <span className="text-[11px] font-semibold text-slate-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Write your HTML stage guidance content below
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-200 rounded font-mono">HTML</span>
                  </div>
                  <textarea
                    ref={textareaRef}
                    rows={12}
                    required
                    placeholder={`<div class="stage-guide">\n  <h3>Welcome, {{client.name}}!</h3>\n  <p>You have arrived at stage <strong>{{stage.name}}</strong>.</p>\n  <p>Your appointment is scheduled for {{appointment.date}} at {{appointment.time}}.</p>\n  <p>Outstanding balance: {{invoice.total}}</p>\n</div>`}
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    className="w-full px-4 py-3 bg-white text-slate-800 text-xs font-mono focus:outline-none leading-relaxed resize-y"
                    spellCheck={false}
                  />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-700" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Live Rendered Preview
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        (Simulated with active patient variable values)
                      </span>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded font-mono">
                      PREVIEW
                    </span>
                  </div>
                  <div
                    ref={previewRef}
                    className="w-full min-h-[220px] max-h-[380px] overflow-y-auto px-5 py-4 bg-white text-slate-900 text-sm focus:outline-none leading-relaxed font-sans prose prose-slate max-w-full break-words"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <div dangerouslySetInnerHTML={{ __html: getRenderedHtml() }} />
                  </div>
                </>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              HTML formatting supported. Tokens enclosed in <code className="bg-slate-100 text-blue-700 px-1 py-0.5 rounded font-mono font-bold">{"{{variable}}"}</code> dynamically render in the Client Portal drawer and AI Receptionist screen.
            </p>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1F2937] hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors shadow-xs cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Save Stage Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
