import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { InfoTooltip } from "../help/InfoTooltip";
import ProcessStageSelect from "../ui/ProcessStageSelect";

export interface FormSettingsProps {
  formTitle: string;
  formDescription: string;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onPreview?: () => void;
  onPublish?: () => void;
  autoCreateClient: boolean;
  onAutoCreateClientChange: (val: boolean) => void;
  autoCreateProcessId: string;
  onAutoCreateProcessIdChange: (val: string) => void;
  autoCreateStageId: string;
  onAutoCreateStageIdChange: (val: string) => void;
  customUrlSlug?: string;
  onCustomUrlSlugChange?: (val: string) => void;
  backgroundTheme?: "light" | "dark";
  onBackgroundThemeChange?: (val: "light" | "dark") => void;
  typography?: string;
  onTypographyChange?: (val: string) => void;
  buttonColor?: string;
  onButtonColorChange?: (val: string) => void;
  submitButtonText?: string;
  onSubmitButtonTextChange?: (val: string) => void;
}

export default function FormSettings({
  formTitle,
  formDescription,
  onTitleChange,
  onDescriptionChange,
  autoCreateClient,
  onAutoCreateClientChange,
  autoCreateProcessId,
  onAutoCreateProcessIdChange,
  autoCreateStageId,
  onAutoCreateStageIdChange,
  customUrlSlug = "",
  onCustomUrlSlugChange,
  backgroundTheme = "light",
  onBackgroundThemeChange,
  typography = "Inter (Modern)",
  onTypographyChange,
  buttonColor = "#007AFF",
  onButtonColorChange,
  submitButtonText = "Submit",
  onSubmitButtonTextChange,
}: FormSettingsProps) {
  // Tabs: General, Appearance, Multi-Step, Confirmation
  const [activeTab, setActiveTab] = useState<"general" | "appearance" | "multiStep" | "confirmation">("general");

  // Collapsible section cards state: first section of each tab is open by default
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    general_basic: true,
    appearance_theme: true,
    multistep_config: true,
    confirmation_action: true,
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // General Tab Local Settings
  const [slugValue, setSlugValue] = useState(customUrlSlug || "");
  const [ajaxSubmission, setAjaxSubmission] = useState(true);
  const [saveContinue, setSaveContinue] = useState(false);
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const [formLanguage, setFormLanguage] = useState("English (US)");
  const [timezone, setTimezone] = useState("America/New_York (EST)");

  // Appearance Tab Local Settings
  const [borderRadius, setBorderRadius] = useState("8");
  const [buttonStyle, setButtonStyle] = useState("Solid");
  const [livePreview, setLivePreview] = useState(true);

  // Multi-Step Tab Local Settings
  const [enableMultiStep, setEnableMultiStep] = useState(false);
  const [progressBar, setProgressBar] = useState("Progress Bar");
  const [prevButtonText, setPrevButtonText] = useState("Back");
  const [nextButtonText, setNextButtonText] = useState("Continue");
  const [saveProgress, setSaveProgress] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);

  // Confirmation Tab Local Settings
  const [submissionBehavior, setSubmissionBehavior] = useState("Show Message");
  const [successMessage, setSuccessMessage] = useState("Thank you! Your submission has been received.");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [showSummary, setShowSummary] = useState(true);
  const [successAnimation, setSuccessAnimation] = useState(true);

  const tabs: { id: "general" | "appearance" | "multiStep" | "confirmation"; label: string }[] = [
    { id: "general", label: "General" },
    { id: "appearance", label: "Appearance" },
    { id: "multiStep", label: "Multi-Step" },
    { id: "confirmation", label: "Confirmation" },
  ];

  // Helper component for Section Card
  const SectionCard = ({
    id,
    title,
    info,
    statusPill,
    children,
  }: {
    id: string;
    title: string;
    info?: string;
    statusPill?: { label: string; isOn: boolean };
    children: React.ReactNode;
  }) => {
    const isExpanded = Boolean(expandedSections[id]);
    return (
      <div className="border border-[#E2E8F0] rounded-[12px] bg-white shadow-2xs overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleSection(id)}
          className="w-full min-h-[48px] flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-[14px] font-semibold text-[#0F172A]"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              {title}
            </span>
            {info && <InfoTooltip text={info} />}
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {statusPill && (
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                  statusPill.isOn
                    ? "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]"
                    : "bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {statusPill.label}
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-[#64748B] transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {isExpanded && (
          <div className="p-4 pt-3 border-t border-[#E2E8F0] bg-slate-50/40 space-y-3">
            {children}
          </div>
        )}
      </div>
    );
  };

  // Helper component for Toggle Sub-Card
  const ToggleSubCard = ({
    label,
    desc,
    info,
    isOn,
    onToggle,
  }: {
    label: string;
    desc?: string;
    info?: string;
    isOn: boolean;
    onToggle: () => void;
  }) => (
    <div className="p-3.5 rounded-[10px] bg-white border border-[#E2E8F0] shadow-2xs flex items-center justify-between gap-3">
      <div className="space-y-0.5 pr-2">
        <div className="flex items-center gap-1.5">
          <label
            className="text-[13px] font-medium text-[#0F172A]"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {label}
          </label>
          {info && <InfoTooltip text={info} />}
        </div>
        {desc && (
          <p
            className="text-[12px] text-[#64748B] leading-normal"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {desc}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 cursor-pointer ${
          isOn ? "bg-[#2563EB]" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isOn ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white border border-[#E2E8F0] rounded-xl shadow-2xs overflow-hidden">
      {/* 2. SETTINGS TABS (General, Appearance, Multi-Step, Confirmation) */}
      <div className="shrink-0 p-2.5 border-b border-[#E2E8F0] bg-gray-50/70">
        <div className="grid grid-cols-4 gap-1 bg-slate-100/90 p-1 rounded-lg border border-[#E2E8F0]">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center py-1.5 px-2.5 rounded-md text-[12px] transition-all cursor-pointer truncate ${
                  isActive
                    ? "bg-white text-[#0F172A] font-semibold shadow-2xs border border-[#E2E8F0]"
                    : "bg-transparent text-[#64748B] font-medium hover:text-[#0F172A] hover:bg-white/50"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. SETTINGS CONTENT PANE */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4">
        {/* ── GENERAL TAB ── */}
        {activeTab === "general" && (
          <div className="space-y-3">
            {/* Section 1: Basic Details */}
            <SectionCard
              id="general_basic"
              title="Basic Details"
              info="Configure the form name, public description, and custom URL slug"
            >
              {/* Form Title */}
              <div className="p-3.5 rounded-[10px] bg-white border border-[#E2E8F0] shadow-2xs space-y-1.5">
                <label
                  className="block text-[13px] font-medium text-[#0F172A]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Form Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder="e.g. Patient Intake Form"
                  className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] shadow-2xs"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>

              {/* Form Description */}
              <div className="p-3.5 rounded-[10px] bg-white border border-[#E2E8F0] shadow-2xs space-y-1.5">
                <label
                  className="block text-[13px] font-medium text-[#0F172A]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Form Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => onDescriptionChange(e.target.value)}
                  placeholder="Explain the purpose of this form to submitters..."
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] resize-none h-20 shadow-2xs"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>

              {/* Form URL Slug */}
              <div className="p-3.5 rounded-[10px] bg-white border border-[#E2E8F0] shadow-2xs space-y-1.5">
                <label
                  className="block text-[13px] font-medium text-[#0F172A]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Form URL Slug
                </label>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[12px] text-[#64748B] font-mono shrink-0 select-none"
                    style={{ fontFamily: "monospace" }}
                  >
                    /forms/
                  </span>
                  <input
                    type="text"
                    value={slugValue}
                    onChange={(e) => {
                      const val = e.target.value.toLowerCase().replace(/\s+/g, "-");
                      setSlugValue(val);
                      onCustomUrlSlugChange?.(val);
                    }}
                    placeholder="contact-us"
                    className="flex-1 h-9 px-3 border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] font-mono focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] shadow-2xs"
                    style={{ fontFamily: "monospace" }}
                  />
                </div>
              </div>
            </SectionCard>

            {/* Section 2: Submission */}
            <SectionCard
              id="general_submission"
              title="Submission"
              info="Configure AJAX submission, resume later, and auto-save behavior"
              statusPill={{ label: ajaxSubmission ? "On" : "Off", isOn: ajaxSubmission }}
            >
              <ToggleSubCard
                label="Enable AJAX Submission"
                desc="Submit without a full page reload for a faster client experience"
                isOn={ajaxSubmission}
                onToggle={() => setAjaxSubmission(!ajaxSubmission)}
              />
              <ToggleSubCard
                label="Save & Continue Later"
                desc="Allow clients to save their progress and resume via an email link"
                isOn={saveContinue}
                onToggle={() => setSaveContinue(!saveContinue)}
              />
              <ToggleSubCard
                label="Draft Autosave"
                desc="Automatically save user input locally while filling the form"
                isOn={autosaveEnabled}
                onToggle={() => setAutosaveEnabled(!autosaveEnabled)}
              />
            </SectionCard>

            {/* Section 3: Language & Time */}
            <SectionCard
              id="general_language"
              title="Language & Time"
              info="Set the default language and timezone for timestamps"
            >
              {/* Form Language */}
              <div className="p-3.5 rounded-[10px] bg-white border border-[#E2E8F0] shadow-2xs space-y-1.5">
                <label
                  className="block text-[13px] font-medium text-[#0F172A]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Form Language
                </label>
                <select
                  value={formLanguage}
                  onChange={(e) => setFormLanguage(e.target.value)}
                  className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] bg-white cursor-pointer shadow-2xs"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <option>English (US)</option>
                  <option>Spanish</option>
                  <option>French</option>
                  <option>German</option>
                </select>
              </div>

              {/* Timezone */}
              <div className="p-3.5 rounded-[10px] bg-white border border-[#E2E8F0] shadow-2xs space-y-1.5">
                <label
                  className="block text-[13px] font-medium text-[#0F172A]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] bg-white cursor-pointer shadow-2xs"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <option>America/New_York (EST)</option>
                  <option>America/Los_Angeles (PST)</option>
                  <option>Europe/London (GMT)</option>
                  <option>Asia/Tokyo (JST)</option>
                </select>
              </div>
            </SectionCard>

            {/* Section 4: Client Profile */}
            <SectionCard
              id="general_client"
              title="Client Profile"
              info="Automatically create a new client record in the CRM from submissions"
              statusPill={{ label: autoCreateClient ? "On" : "Off", isOn: autoCreateClient }}
            >
              <div className="p-3.5 rounded-[10px] bg-white border border-[#E2E8F0] shadow-2xs space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5 pr-2">
                    <div className="flex items-center gap-1.5">
                      <label
                        className="text-[13px] font-medium text-[#0F172A]"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        Create Submitter as Client Profile
                      </label>
                      <InfoTooltip text="When on, every submission creates a new client record and enrolls them in the process/stage below." />
                    </div>
                    <p
                      className="text-[12px] text-[#64748B] leading-normal"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      Automatically create a new client record in the CRM if the submitter's email or phone doesn't match an existing client.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAutoCreateClientChange(!autoCreateClient)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 cursor-pointer ${
                      autoCreateClient ? "bg-[#2563EB]" : "bg-gray-200"
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
                  <div className="pt-3 border-t border-[#E2E8F0]">
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
            </SectionCard>
          </div>
        )}

        {/* ── APPEARANCE TAB ── */}
        {activeTab === "appearance" && (
          <div className="space-y-3">
            {/* Section 1: Theme & Colors */}
            <SectionCard
              id="appearance_theme"
              title="Theme & Colors"
              info="Select base theme and primary brand color"
            >
              {/* Theme Selector */}
              <div className="p-3.5 rounded-[10px] bg-white border border-[#E2E8F0] shadow-2xs space-y-2">
                <label
                  className="block text-[13px] font-medium text-[#0F172A]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Theme
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onBackgroundThemeChange?.("light")}
                    className={`h-9 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                      backgroundTheme === "light"
                        ? "border-2 border-[#2563EB] bg-blue-50/70 text-[#2563EB] font-semibold"
                        : "border border-[#E2E8F0] bg-white text-[#64748B] hover:border-gray-300"
                    }`}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => onBackgroundThemeChange?.("dark")}
                    className={`h-9 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                      backgroundTheme === "dark"
                        ? "border-2 border-[#2563EB] bg-slate-900 text-white font-semibold"
                        : "border border-[#E2E8F0] bg-white text-[#64748B] hover:border-gray-300"
                    }`}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Dark
                  </button>
                </div>
              </div>

              {/* Primary Color */}
              <div className="p-3.5 rounded-[10px] bg-white border border-[#E2E8F0] shadow-2xs space-y-2">
                <label
                  className="block text-[13px] font-medium text-[#0F172A]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Primary Color
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={buttonColor}
                    onChange={(e) => onButtonColorChange?.(e.target.value)}
                    className="w-10 h-9 p-0.5 border border-[#E2E8F0] rounded-lg cursor-pointer shrink-0 bg-white"
                  />
                  <input
                    type="text"
                    value={buttonColor}
                    onChange={(e) => onButtonColorChange?.(e.target.value)}
                    className="flex-1 h-9 px-3 border border-[#E2E8F0] rounded-lg text-[13px] font-mono text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB]"
                    style={{ fontFamily: "monospace" }}
                  />
                </div>
              </div>
            </SectionCard>

            {/* Section 2: Typography & Styling */}
            <SectionCard
              id="appearance_typography"
              title="Typography & Styling"
              info="Set font family, element corner radiuses, and button appearance"
            >
              {/* Font Family */}
              <div className="p-3.5 rounded-[10px] bg-white border border-[#E2E8F0] shadow-2xs space-y-1.5">
                <label
                  className="block text-[13px] font-medium text-[#0F172A]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Font Family
                </label>
                <select
                  value={typography}
                  onChange={(e) => onTypographyChange?.(e.target.value)}
                  className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] bg-white cursor-pointer shadow-2xs"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <option value="Inter (Modern)">Inter (Modern)</option>
                  <option value="Roboto (Clean)">Roboto (Clean)</option>
                  <option value="Open Sans (Friendly)">Open Sans (Friendly)</option>
                  <option value="Montserrat (Elegant)">Montserrat (Elegant)</option>
                  <option value="DM Sans (Default)">DM Sans (Default)</option>
                </select>
              </div>

              {/* Border Radius */}
              <div className="p-3.5 rounded-[10px] bg-white border border-[#E2E8F0] shadow-2xs space-y-2">
                <label
                  className="block text-[13px] font-medium text-[#0F172A]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Border Radius
                </label>
                <div className="flex gap-2">
                  {["0", "4", "8", "12"].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setBorderRadius(r)}
                      className={`flex-1 h-9 border rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
                        borderRadius === r
                          ? "border-[#2563EB] bg-blue-50/70 text-[#2563EB] font-semibold"
                          : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-gray-300"
                      }`}
                      style={{ borderRadius: `${r}px`, fontFamily: "Outfit, sans-serif" }}
                    >
                      {r}px
                    </button>
                  ))}
                </div>
              </div>

              {/* Button Style */}
              <div className="p-3.5 rounded-[10px] bg-white border border-[#E2E8F0] shadow-2xs space-y-1.5">
                <label
                  className="block text-[13px] font-medium text-[#0F172A]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Button Style
                </label>
                <select
                  value={buttonStyle}
                  onChange={(e) => setButtonStyle(e.target.value)}
                  className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] bg-white cursor-pointer shadow-2xs"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <option>Solid</option>
                  <option>Outline</option>
                  <option>Ghost</option>
                  <option>Gradient</option>
                </select>
              </div>

              {/* Submit Button Text */}
              <div className="p-3.5 rounded-[10px] bg-white border border-[#E2E8F0] shadow-2xs space-y-1.5">
                <label
                  className="block text-[13px] font-medium text-[#0F172A]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Submit Button Label
                </label>
                <input
                  type="text"
                  value={submitButtonText}
                  onChange={(e) => onSubmitButtonTextChange?.(e.target.value)}
                  placeholder="Submit"
                  className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] shadow-2xs"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>
            </SectionCard>

            {/* Section 3: Preview Options */}
            <SectionCard
              id="appearance_preview"
              title="Preview Options"
              info="Synchronize form builder changes immediately in the live preview"
              statusPill={{ label: livePreview ? "On" : "Off", isOn: livePreview }}
            >
              <ToggleSubCard
                label="Live Preview"
                desc="Render real-time visual updates on the left canvas as you type"
                isOn={livePreview}
                onToggle={() => setLivePreview(!livePreview)}
              />
            </SectionCard>
          </div>
        )}

        {/* ── MULTI-STEP TAB ── */}
        {activeTab === "multiStep" && (
          <div className="space-y-3">
            {/* Section 1: Multi-Step Configuration */}
            <SectionCard
              id="multistep_config"
              title="Multi-Step Configuration"
              info="Configure multi-page navigation and progress indicators"
              statusPill={{ label: enableMultiStep ? "On" : "Off", isOn: enableMultiStep }}
            >
              <ToggleSubCard
                label="Enable Multi-Step"
                desc="Split long forms across multiple interactive steps"
                isOn={enableMultiStep}
                onToggle={() => setEnableMultiStep(!enableMultiStep)}
              />

              <div className="p-3.5 rounded-[10px] bg-white border border-[#E2E8F0] shadow-2xs space-y-1.5">
                <label
                  className="block text-[13px] font-medium text-[#0F172A]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Progress Bar Style
                </label>
                <select
                  value={progressBar}
                  onChange={(e) => setProgressBar(e.target.value)}
                  className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] bg-white cursor-pointer shadow-2xs"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <option>Progress Bar</option>
                  <option>Step Circles</option>
                  <option>Numbered Steps</option>
                  <option>None</option>
                </select>
              </div>
            </SectionCard>

            {/* Section 2: Navigation Controls */}
            <SectionCard
              id="multistep_nav"
              title="Navigation Controls"
              info="Customize pagination button labels for previous and next transitions"
            >
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3.5 rounded-[10px] bg-white border border-[#E2E8F0] shadow-2xs space-y-1.5">
                  <label
                    className="block text-[13px] font-medium text-[#0F172A]"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Previous Button
                  </label>
                  <input
                    type="text"
                    value={prevButtonText}
                    onChange={(e) => setPrevButtonText(e.target.value)}
                    placeholder="Back"
                    className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] shadow-2xs"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                </div>
                <div className="p-3.5 rounded-[10px] bg-white border border-[#E2E8F0] shadow-2xs space-y-1.5">
                  <label
                    className="block text-[13px] font-medium text-[#0F172A]"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    Next Button
                  </label>
                  <input
                    type="text"
                    value={nextButtonText}
                    onChange={(e) => setNextButtonText(e.target.value)}
                    placeholder="Continue"
                    className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] shadow-2xs"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                </div>
              </div>
            </SectionCard>

            {/* Section 3: Progress & Behavior */}
            <SectionCard
              id="multistep_behavior"
              title="Progress & Behavior"
              info="Configure auto-scrolling and page progress persistence"
            >
              <ToggleSubCard
                label="Save Progress"
                desc="Persist user entries across steps in local storage"
                isOn={saveProgress}
                onToggle={() => setSaveProgress(!saveProgress)}
              />
              <ToggleSubCard
                label="Auto-Scroll Between Pages"
                desc="Smoothly scroll to top of form when navigating between steps"
                isOn={autoScroll}
                onToggle={() => setAutoScroll(!autoScroll)}
              />
            </SectionCard>
          </div>
        )}

        {/* ── CONFIRMATION TAB ── */}
        {activeTab === "confirmation" && (
          <div className="space-y-3">
            {/* Section 1: Submission Action */}
            <SectionCard
              id="confirmation_action"
              title="Submission Action"
              info="Configure post-submission behavior and redirect targets"
            >
              {/* Submission Behavior */}
              <div className="p-3.5 rounded-[10px] bg-white border border-[#E2E8F0] shadow-2xs space-y-1.5">
                <label
                  className="block text-[13px] font-medium text-[#0F172A]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Submission Behavior
                </label>
                <select
                  value={submissionBehavior}
                  onChange={(e) => setSubmissionBehavior(e.target.value)}
                  className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] bg-white cursor-pointer shadow-2xs"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  <option>Show Message</option>
                  <option>Redirect to URL</option>
                  <option>Redirect to Page</option>
                  <option>Show Modal</option>
                </select>
              </div>

              {/* Redirect URL */}
              <div className="p-3.5 rounded-[10px] bg-white border border-[#E2E8F0] shadow-2xs space-y-1.5">
                <label
                  className="block text-[13px] font-medium text-[#0F172A]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Redirect URL (optional)
                </label>
                <input
                  type="url"
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                  placeholder="https://example.com/thank-you"
                  className="w-full h-9 px-3 border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] font-mono focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] shadow-2xs"
                  style={{ fontFamily: "monospace" }}
                />
              </div>
            </SectionCard>

            {/* Section 2: Confirmation Message */}
            <SectionCard
              id="confirmation_message"
              title="Confirmation Message"
              info="Display message shown to the user upon submission"
            >
              <div className="p-3.5 rounded-[10px] bg-white border border-[#E2E8F0] shadow-2xs space-y-1.5">
                <label
                  className="block text-[13px] font-medium text-[#0F172A]"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  Success Message
                </label>
                <textarea
                  value={successMessage}
                  onChange={(e) => setSuccessMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] resize-none h-20 shadow-2xs"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                />
              </div>
            </SectionCard>

            {/* Section 3: Post-Submission Display */}
            <SectionCard
              id="confirmation_display"
              title="Post-Submission Display"
              info="Summary and visual completion animations"
            >
              <ToggleSubCard
                label="Show Submission Summary"
                desc="Display an itemized summary of submitted fields on the confirmation screen"
                isOn={showSummary}
                onToggle={() => setShowSummary(!showSummary)}
              />
              <ToggleSubCard
                label="Success Animation"
                desc="Show a celebratory checkmark animation upon successful submission"
                isOn={successAnimation}
                onToggle={() => setSuccessAnimation(!successAnimation)}
              />
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}
