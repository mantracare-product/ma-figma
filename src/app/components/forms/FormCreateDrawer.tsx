import React, { useState } from "react";
import { X, FileText, ArrowRight, Layers, Shield, Sparkles, Check, Building2 } from "lucide-react";
import { Form, FormPermissions, ScopingRule, saveForm } from "../../../data/forms";
import { AdminScopingRulesEditor } from "../../pages/admin/components/AdminScopingRulesEditor";
import { AdminControlAccordion } from "../../pages/admin/components/AdminControlAccordion";
import { INITIAL_CATEGORIES } from "../../../data/industryReferenceData";
import { toast } from "sonner";

interface FormCreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueToBuilder: (form: Form) => void;
  isAdmin?: boolean;
}

const FORM_TYPES: { id: "standard" | "intake" | "meta-ads"; label: string; desc: string }[] = [
  { id: "standard", label: "Standard Form", desc: "General multi-field inquiry or checklist form" },
  { id: "intake", label: "Intake Form", desc: "Comprehensive patient/client medical or onboarding intake" },
  { id: "meta-ads", label: "Meta Ads Form", desc: "Optimized lead-capture form connected to Meta Ads" },
];

const AVAILABLE_ROLES = [
  { id: "admin", label: "Admin", desc: "Full control over templates & settings" },
  { id: "manager", label: "Manager", desc: "Can manage and customize forms" },
  { id: "reception", label: "Reception", desc: "Front desk access & operations" },
  { id: "staff", label: "Staff / Provider", desc: "Clinical & team members" },
  { id: "client", label: "Client / Public", desc: "Public submission / fill access" },
];

export default function FormCreateDrawer({
  isOpen,
  onClose,
  onContinueToBuilder,
  isAdmin = false,
}: FormCreateDrawerProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formType, setFormType] = useState<"standard" | "intake" | "meta-ads">("standard");
  const [category, setCategory] = useState("Healthcare");

  // Client mode: auto-create client settings
  const [autoCreateClient, setAutoCreateClient] = useState(true);

  // Admin mode: scoping & permissions
  const [scopingRules, setScopingRules] = useState<ScopingRule[]>([]);
  const [roles, setRoles] = useState<string[]>(["admin", "manager", "reception"]);
  const [permissions, setPermissions] = useState<FormPermissions>({
    canView: true,
    canEdit: true,
    canDelete: false,
    canShare: true,
  });

  const [error, setError] = useState("");

  if (!isOpen) return null;

  const toggleRole = (roleId: string) => {
    setRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  const handleContinue = () => {
    if (!name.trim()) {
      setError("Please provide a name for this form.");
      return;
    }

    const newForm: Form = {
      id: Date.now(),
      name: name.trim(),
      description: description.trim(),
      formType,
      createdBy: isAdmin ? "Admin User" : "Current User",
      fieldCount: 0,
      fields: [],
      status: "draft",
      submissions: 0,
      enabled: false,
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      lastUpdated: new Date().toISOString(),
      category,
      autoCreateClient: !isAdmin ? autoCreateClient : undefined,
      scopingRules: isAdmin && scopingRules.length > 0 ? scopingRules : undefined,
      roles: isAdmin ? roles : undefined,
      permissions: isAdmin ? permissions : undefined,
    };

    saveForm(newForm);
    toast.success(`Form "${newForm.name}" created! Opening Form Builder...`);
    onContinueToBuilder(newForm);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden select-none">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Slide-out Drawer */}
      <div className="relative w-full max-w-[560px] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250 border-l border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 shrink-0">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 leading-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {isAdmin ? "Create Form Template" : "Create New Form"}
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 rounded-md border border-blue-100" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                  {isAdmin ? "TEMPLATE" : "DRAFT"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                Configure basic settings before arranging questions in the Form Builder
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-[#F8FAFC]">
          {/* Basic Form Details Card */}
          <div className="bg-white rounded-xl p-4.5 border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
              General Information
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                Form Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g. Pre-Visit Health Questionnaire"
                className={`w-full px-3 py-2 text-xs border rounded-lg outline-none transition-all ${
                  error ? "border-red-500 ring-1 ring-red-500" : "border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                } bg-white text-slate-900`}
                style={{ fontFamily: "Outfit, sans-serif" }}
                autoFocus
              />
              {error && <p className="text-[11px] text-red-500 mt-1 font-medium">{error}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this form is used for and instructions for respondents..."
                rows={2}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-slate-900"
                style={{ fontFamily: "Outfit, sans-serif" }}
              />
            </div>

            {/* Category (Admin only) */}
            {isAdmin && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-slate-900"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {INITIAL_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Form Type Selector (Admin only) */}
          {isAdmin && (
            <div className="bg-white rounded-xl p-4.5 border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                Form Type
              </h3>

              <div className="space-y-2">
                {FORM_TYPES.map((type) => {
                  const isSelected = formType === type.id;
                  return (
                    <div
                      key={type.id}
                      onClick={() => setFormType(type.id)}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-blue-50/60 border-blue-300 ring-1 ring-blue-300"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                          isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                          {type.label}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{type.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Client Mode: Auto-create Client Toggle */}
          {!isAdmin && (
            <div className="bg-white rounded-xl p-4.5 border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-800" style={{ fontFamily: "Outfit, sans-serif" }}>
                    Auto-create or match contact record
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Automatically create a new Contact or update existing profile upon submission.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                  <input
                    type="checkbox"
                    checked={autoCreateClient}
                    onChange={(e) => setAutoCreateClient(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          )}

          {/* Admin Mode: Scoping Rules & Roles */}
          {isAdmin && (
            <>
              <div className="bg-white rounded-xl p-4.5 border border-slate-200 shadow-2xs space-y-3">
                <AdminControlAccordion
                  scopingRules={scopingRules}
                  onScopingRulesChange={setScopingRules}
                  permissionsContent={
                    <div className="pt-2">
                      <p className="text-xs font-semibold text-slate-700 mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
                        Template Permissions
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={permissions.canView}
                            onChange={(e) => setPermissions({ ...permissions, canView: e.target.checked })}
                            className="rounded border-slate-300"
                          />
                          <span>Allow Viewing</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={permissions.canEdit}
                            onChange={(e) => setPermissions({ ...permissions, canEdit: e.target.checked })}
                            className="rounded border-slate-300"
                          />
                          <span>Allow Editing</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={permissions.canShare}
                            onChange={(e) => setPermissions({ ...permissions, canShare: e.target.checked })}
                            className="rounded border-slate-300"
                          />
                          <span>Allow Sharing</span>
                        </label>
                      </div>
                    </div>
                  }
                />
              </div>

              <div className="bg-white rounded-xl p-4.5 border border-slate-200 shadow-2xs space-y-3">
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Role Access
                </h3>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_ROLES.map((role) => {
                    const isSelected = roles.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => toggleRole(role.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        <span>{role.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-black rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            <span>Continue to Form Builder</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
