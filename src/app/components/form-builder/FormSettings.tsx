import { useState } from "react";
import {
  ChevronDown,
  Eye,
  Rocket,
  Save,
  Globe,
  Palette,
  Layout,
  Layers,
  ShieldCheck,
  Mail,
  Zap,
  CreditCard,
  Link2,
  Lock,
  BarChart3,
  Code,
  Clock,
  CheckCircle2,
} from "lucide-react";

import { InfoTooltip } from "../help/InfoTooltip";

interface FormSettingsProps {
  formTitle: string;
  formDescription: string;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onPreview: () => void;
  onPublish: () => void;
  autoCreateClient: boolean;
  onAutoCreateClientChange: (val: boolean) => void;
  autoCreateProcessId: string;
  onAutoCreateProcessIdChange: (val: string) => void;
  autoCreateStageId: string;
  onAutoCreateStageIdChange: (val: string) => void;
}

import ProcessStageSelect from "../ui/ProcessStageSelect";

export default function FormSettings({
  formTitle,
  formDescription,
  onTitleChange,
  onDescriptionChange,
  onPreview,
  onPublish,
  autoCreateClient,
  onAutoCreateClientChange,
  autoCreateProcessId,
  onAutoCreateProcessIdChange,
  autoCreateStageId,
  onAutoCreateStageIdChange,
}: FormSettingsProps) {
  const [activeTab, setActiveTab] = useState<string>("general");
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState("2 minutes ago");

  const tabs = [
    { id: "general", label: "General", icon: Globe },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "layout", label: "Layout", icon: Layout },
    { id: "multiStep", label: "Multi-Step", icon: Layers },
    { id: "validation", label: "Validation", icon: ShieldCheck },
    { id: "confirmation", label: "Confirmation", icon: CheckCircle2 },
    { id: "notifications", label: "Notifications", icon: Mail },
    { id: "conditionalLogic", label: "Logic", icon: Zap },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "integrations", label: "Integrations", icon: Link2 },
    { id: "security", label: "Security", icon: Lock },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "advanced", label: "Advanced", icon: Code },
  ];

  return (
    <div className="flex h-full">
      {/* Vertical Tabs */}
      <div className="w-48 border-r border-gray-200 bg-gray-50/50 overflow-y-auto">
        <div className="p-3 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${
                  activeTab === tab.id
                    ? "bg-white text-primary shadow-sm border border-gray-200"
                    : "text-gray-700 hover:bg-white/60 hover:text-gray-900"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          {/* GENERAL SETTINGS */}
          {activeTab === "general" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
                  General Settings
                </h2>
                <p className="text-sm text-gray-600" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Configure basic form information and behavior
                </p>
              </div>

              <div className="h-px bg-gray-200"></div>

              <div className="space-y-5">

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Form Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => onTitleChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Form Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => onDescriptionChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none h-20"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Form URL Slug
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500" style={{ fontFamily: "monospace" }}>
                    /forms/
                  </span>
                  <input
                    type="text"
                    placeholder="contact-us"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    style={{ fontFamily: "monospace" }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Enable AJAX Submission
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-primary">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Save & Continue Later
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-200">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Draft Autosave
                </label>
                <button
                  onClick={() => setAutosaveEnabled(!autosaveEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autosaveEnabled ? "bg-primary" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autosaveEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Form Language
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <option>English (US)</option>
                  <option>Spanish</option>
                  <option>French</option>
                  <option>German</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Timezone
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <option>America/New_York (EST)</option>
                  <option>America/Los_Angeles (PST)</option>
                  <option>Europe/London (GMT)</option>
                  <option>Asia/Tokyo (JST)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="text-sm font-semibold" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
                        Create Submitter as Client Profile
                      </label>
                      <InfoTooltip text="When on, every submission creates a new client record and enrolls them in the process/stage below." />
                    </div>
                    <p className="text-xs text-gray-500" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Automatically create a new client record in the CRM if the submitter's email or phone doesn't match an existing client.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAutoCreateClientChange(!autoCreateClient)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                      autoCreateClient ? "bg-primary" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        autoCreateClient ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {autoCreateClient && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <ProcessStageSelect
                      selectedProcess={autoCreateProcessId}
                      selectedStage={autoCreateStageId}
                      onProcessChange={onAutoCreateProcessIdChange}
                      onStageChange={onAutoCreateStageIdChange}
                      theme="standard"
                    />
                  </div>
                )}
              </div>
              </div>
            </div>
          )}

          {/* APPEARANCE SETTINGS */}
          {activeTab === "appearance" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
                  Appearance
                </h2>
                <p className="text-sm text-gray-600" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Customize the visual design of your form
                </p>
              </div>

              <div className="h-px bg-gray-200"></div>

              <div className="space-y-5">

              <div>
                <label className="block text-xs font-medium mb-2" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Theme
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button className="p-3 border-2 border-primary bg-blue-50 rounded-lg text-sm font-medium">
                    Light
                  </button>
                  <button className="p-3 border border-gray-300 rounded-lg text-sm font-medium hover:border-gray-400">
                    Dark
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Primary Color
                </label>
                <div className="flex gap-2 items-center">
                  <input type="color" defaultValue="#007AFF" className="w-12 h-10 border border-gray-300 rounded cursor-pointer" />
                  <input
                    type="text"
                    defaultValue="#007AFF"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Font Family
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <option>Inter (Modern)</option>
                  <option>Roboto (Clean)</option>
                  <option>Open Sans (Friendly)</option>
                  <option>Montserrat (Elegant)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Border Radius
                </label>
                <div className="flex gap-2">
                  {["0", "4", "8", "12"].map((radius) => (
                    <button
                      key={radius}
                      className={`flex-1 py-2 border rounded text-xs font-medium ${
                        radius === "8" ? "border-primary bg-blue-50" : "border-gray-300 hover:border-gray-400"
                      }`}
                      style={{ borderRadius: `${radius}px` }}
                    >
                      {radius}px
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Button Style
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <option>Solid</option>
                  <option>Outline</option>
                  <option>Ghost</option>
                  <option>Gradient</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Live Preview
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-primary">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                </button>
              </div>
            </div>
          </div>
          )}

          {/* LAYOUT SETTINGS */}
          {activeTab === "layout" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
                  Layout Settings
                </h2>
                <p className="text-sm text-gray-600" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Control form structure and spacing
                </p>
              </div>

              <div className="h-px bg-gray-200"></div>

              <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium mb-2" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Form Width
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <option>Small (600px)</option>
                  <option>Medium (800px)</option>
                  <option>Large (1000px)</option>
                  <option>Full Width</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Multi-Column Layout
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["1", "2", "3"].map((cols) => (
                    <button
                      key={cols}
                      className={`py-2 border rounded text-xs font-medium ${
                        cols === "1" ? "border-primary bg-blue-50" : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {cols} Col
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Label Position
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <option>Top</option>
                  <option>Left</option>
                  <option>Inline</option>
                  <option>Floating</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Compact Mode
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-200">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Sticky Progress Bar
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-200">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                </button>
              </div>
              </div>
            </div>
          )}

          {/* MULTI-STEP FORM SETTINGS */}
          {activeTab === "multiStep" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
                  Multi-Step Form Settings
                </h2>
                <p className="text-sm text-gray-600" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Configure multi-page forms with progress tracking
                </p>
              </div>

              <div className="h-px bg-gray-200"></div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Enable Multi-Step
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-200">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Progress Bar Style
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <option>Progress Bar</option>
                  <option>Step Circles</option>
                  <option>Numbered Steps</option>
                  <option>None</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                    Previous Button
                  </label>
                  <input
                    type="text"
                    defaultValue="Back"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                    Next Button
                  </label>
                  <input
                    type="text"
                    defaultValue="Continue"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Save Progress
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-primary">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Auto-Scroll Between Pages
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-primary">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                </button>
              </div>
            </div>
          )}

          {/* VALIDATION SETTINGS */}
          {activeTab === "validation" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
                  Validation Settings
                </h2>
                <p className="text-sm text-gray-600" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Set up form validation and spam protection
                </p>
              </div>

              <div className="h-px bg-gray-200"></div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Inline Validation
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-primary">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Real-Time Validation
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-primary">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  CAPTCHA Provider
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <option>None</option>
                  <option>Google reCAPTCHA v2</option>
                  <option>Google reCAPTCHA v3</option>
                  <option>hCaptcha</option>
                  <option>Cloudflare Turnstile</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Duplicate Entry Prevention
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-200">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Error Message Style
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <option>Below Field</option>
                  <option>Above Field</option>
                  <option>Tooltip</option>
                  <option>Toast Notification</option>
                </select>
              </div>
            </div>
          )}

          {/* CONFIRMATION SETTINGS */}
          {activeTab === "confirmation" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
                  Confirmation Settings
                </h2>
                <p className="text-sm text-gray-600" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Configure what happens after form submission
                </p>
              </div>

              <div className="h-px bg-gray-200"></div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Submission Behavior
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <option>Show Message</option>
                  <option>Redirect to URL</option>
                  <option>Redirect to Page</option>
                  <option>Show Modal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Success Message
                </label>
                <textarea
                  defaultValue="Thank you! Your submission has been received."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none h-20"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Redirect URL (optional)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/thank-you"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ fontFamily: "monospace" }}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Show Submission Summary
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-primary">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Success Animation
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-primary">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                </button>
              </div>
            </div>
          )}

          {/* NOTIFICATION SETTINGS */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
                  Notification Settings
                </h2>
                <p className="text-sm text-gray-600" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Set up email notifications and alerts
                </p>
              </div>

              <div className="h-px bg-gray-200"></div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Admin Email Notifications
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-primary">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Admin Email Addresses
                </label>
                <input
                  type="email"
                  placeholder="admin@example.com, team@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas</p>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  User Confirmation Email
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-200">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Email Subject
                </label>
                <input
                  type="text"
                  defaultValue="New Form Submission - {form_title}"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Reply-To Email
                </label>
                <input
                  type="email"
                  placeholder="noreply@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>

              <div className="pt-3 border-t border-gray-200">
                <label className="block text-xs font-semibold mb-2" style={{ fontFamily: "Outfit, sans-serif", color: "#020817" }}>
                  Slack Integration
                </label>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                    Enable Slack Notifications
                  </label>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-200">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                  </button>
                </div>
                <input
                  type="url"
                  placeholder="Slack Webhook URL"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ fontFamily: "monospace" }}
                />
              </div>
            </div>
          )}

          {/* CONDITIONAL LOGIC */}
          {activeTab === "conditionalLogic" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
                  Conditional Logic
                </h2>
                <p className="text-sm text-gray-600" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Create dynamic form behavior based on user input
                </p>
              </div>

              <div className="h-px bg-gray-200"></div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Enable Form-Level Logic
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-200">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Dynamic Branching
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-200">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Conditional Confirmations
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-200">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Conditional Notifications
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-200">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                </button>
              </div>

              <button className="w-full py-2 px-4 border border-primary text-primary rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium">
                Open Logic Builder
              </button>
            </div>
          )}

          {/* PAYMENT SETTINGS */}
          {activeTab === "payments" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
                  Payment Settings
                </h2>
                <p className="text-sm text-gray-600" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Configure payment processing and billing
                </p>
              </div>

              <div className="h-px bg-gray-200"></div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Payment Provider
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <option>None</option>
                  <option>Stripe</option>
                  <option>PayPal</option>
                  <option>Razorpay</option>
                  <option>Square</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Currency
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <option>USD - US Dollar</option>
                  <option>EUR - Euro</option>
                  <option>GBP - British Pound</option>
                  <option>JPY - Japanese Yen</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Enable Coupons
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-200">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Generate Invoices
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-200">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Subscription Support
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-200">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                </button>
              </div>
            </div>
          )}

          {/* INTEGRATIONS */}
          {activeTab === "integrations" && (
            <div className="space-y-3 max-w-2xl">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
                  Integrations
                </h2>
                <p className="text-sm text-gray-600" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Connect your form to external services and tools
                </p>
              </div>

              <div className="h-px bg-gray-200"></div>

              {[
                { name: "Zapier", status: "Connected", color: "green" },
                { name: "HubSpot", status: "Not Connected", color: "gray" },
                { name: "Salesforce", status: "Not Connected", color: "gray" },
                { name: "Google Sheets", status: "Connected", color: "green" },
                { name: "Mailchimp", status: "Not Connected", color: "gray" },
                { name: "Webhooks", status: "Active", color: "green" },
              ].map((integration) => (
                <div key={integration.name} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {integration.name}
                    </p>
                    <p
                      className="text-xs"
                      style={{
                        fontFamily: "Outfit, sans-serif",
                        color: integration.color === "green" ? "#10b981" : "#6b7280",
                      }}
                    >
                      {integration.status}
                    </p>
                  </div>
                  <button className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                    {integration.status === "Connected" || integration.status === "Active" ? "Configure" : "Connect"}
                  </button>
                </div>
              ))}

              <button className="w-full py-2 px-4 border border-primary text-primary rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium mt-2">
                + Add New Integration
              </button>
            </div>
          )}

          {/* SECURITY & PRIVACY */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
                  Security & Privacy
                </h2>
                <p className="text-sm text-gray-600" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Protect user data and ensure compliance
                </p>
              </div>

              <div className="h-px bg-gray-200"></div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  GDPR Compliance
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-primary">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  IP Address Logging
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-primary">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Data Encryption
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-primary">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Password Protection
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-200">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Data Retention Period
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <option>Forever</option>
                  <option>30 Days</option>
                  <option>90 Days</option>
                  <option>1 Year</option>
                  <option>2 Years</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Allowed Domains (optional)
                </label>
                <input
                  type="text"
                  placeholder="example.com, subdomain.example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
                <p className="text-xs text-gray-500 mt-1">Restrict form access to specific domains</p>
              </div>
            </div>
          )}

          {/* ANALYTICS & TRACKING */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
                  Analytics & Tracking
                </h2>
                <p className="text-sm text-gray-600" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Track form performance and user behavior
                </p>
              </div>

              <div className="h-px bg-gray-200"></div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Google Analytics
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-200">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  GA Tracking ID
                </label>
                <input
                  type="text"
                  placeholder="G-XXXXXXXXXX"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ fontFamily: "monospace" }}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Meta Pixel
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-200">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Pixel ID
                </label>
                <input
                  type="text"
                  placeholder="XXXXXXXXXXXXXXXX"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  style={{ fontFamily: "monospace" }}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  UTM Tracking
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-primary">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Conversion Tracking
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-primary">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                  Drop-off Analysis
                </label>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-primary">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                </button>
              </div>
            </div>
          )}

          {/* ADVANCED SETTINGS */}
          {activeTab === "advanced" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "DM Sans, sans-serif", color: "#020817" }}>
                  Advanced Settings
                </h2>
                <p className="text-sm text-gray-600" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Developer tools and advanced customization
                </p>
              </div>

              <div className="h-px bg-gray-200"></div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                    Custom CSS Classes
                  </label>
                  <input
                    type="text"
                    placeholder="custom-form-class another-class"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    style={{ fontFamily: "monospace" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                    Custom JavaScript
                  </label>
                  <textarea
                    placeholder="// Add custom JavaScript here"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none h-24"
                    style={{ fontFamily: "monospace" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                    Custom CSS
                  </label>
                  <textarea
                    placeholder="/* Add custom CSS here */"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none h-24"
                    style={{ fontFamily: "monospace" }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                    Developer Mode
                  </label>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-200">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                    Debug Logs
                  </label>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-200">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium" style={{ fontFamily: "Outfit, sans-serif", color: "#64748B" }}>
                    Lazy Loading
                  </label>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-primary">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                  </button>
                </div>

                <button className="w-full py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                  View API Documentation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
