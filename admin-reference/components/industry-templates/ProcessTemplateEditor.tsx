"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  ProcessTemplate,
  StageTemplate,
  StageWebhook,
} from "@/lib/types/industry-templates";
import {
  Plus,
  Trash2,
  Sparkles,
  Volume2,
  Settings,
  Cpu,
  Globe,
  SlidersHorizontal,
  Info,
  Check,
  Link as LinkIcon,
  Phone,
  Calendar,
  MousePointer,
  ChevronDown,
  Search,
  Code2,
  Play,
  Layers,
} from "lucide-react";

interface ProcessTemplateEditorProps {
  process: ProcessTemplate;
  onChange: (updated: ProcessTemplate) => void;
}

const COLOR_PALETTE = [
  { label: "Blue", hex: "#3b82f6" },
  { label: "Green", hex: "#10b981" },
  { label: "Orange", hex: "#f59e0b" },
  { label: "Red", hex: "#ef4444" },
  { label: "Purple", hex: "#8b5cf6" },
  { label: "Indigo", hex: "#6366f1" },
  { label: "Teal", hex: "#14b8a6" },
  { label: "Slate", hex: "#64748b" },
];

// All available tokens including Custom Fields from custom-fields module & system fields
const ALL_VARIABLE_KEYS = [
  // System Fields
  "client_name",
  "client_first_name",
  "client_last_name",
  "phone",
  "email",
  "business_name",
  "service_name",
  "appointment_date",
  "appointment_time",
  "assigned_agent",
  "call_direction",

  // Custom Fields from Custom Fields Management
  "hospital_location",
  "appointment_date_time",
  "doctor_assigned",
  "budget",
  "customer_sentiment_score",
  "preferred_callback_time",
  "is_vip_account",
  "service_plan_code",
  "branch_tax_id",

  // Additional Industry Specific CRM Fields
  "insurance_provider",
  "policy_number",
  "case_type",
  "incident_date",
  "property_address",
  "budget_max",
  "vehicle_vin",
  "lead_source",
  "preferred_time_slot",
  "custom_notes",
];

export const ProcessTemplateEditor: React.FC<ProcessTemplateEditorProps> = ({
  process,
  onChange,
}) => {
  const [activeStageId, setActiveStageId] = useState<string>(
    process.stages[0]?.id || ""
  );

  const [activeStageTab, setActiveStageTab] = useState<
    "general" | "prompts" | "settings" | "webhooks" | "advanced"
  >("general");

  const [stageSearch, setStageSearch] = useState("");
  const [isPlayingTestVoice, setIsPlayingTestVoice] = useState(false);

  // Hook creation form state
  const [isAddingHook, setIsAddingHook] = useState(false);
  const [newHookName, setNewHookName] = useState("");
  const [newHookUrl, setNewHookUrl] = useState("");
  const [newHookEvent, setNewHookEvent] = useState<StageWebhook["triggerEvent"]>("call_completed");

  // Insert Variable Dropdown state
  const [isVariableDropdownOpen, setIsVariableDropdownOpen] = useState(false);
  const [variableSearch, setVariableSearch] = useState("");
  const variableDropdownRef = useRef<HTMLDivElement>(null);

  const currentStage =
    process.stages.find((s) => s.id === activeStageId) || process.stages[0];

  // Helper to update a stage
  const handleUpdateStage = (
    stageId: string,
    updates: Partial<StageTemplate>
  ) => {
    const updatedStages = process.stages.map((s) => {
      if (s.id === stageId) {
        return {
          ...s,
          ...updates,
        };
      }
      return s;
    });
    onChange({ ...process, stages: updatedStages });
  };

  // Add new stage (Empty fields on new creation)
  const handleAddStage = () => {
    const newOrder = process.stages.length + 1;
    const newStage: StageTemplate = {
      id: `stg-${Date.now()}`,
      stageOrder: newOrder,
      name: "",
      stageCode: `STG_${newOrder}`,
      description: "",
      statusColor: COLOR_PALETTE[(newOrder - 1) % COLOR_PALETTE.length].hex,
      automaticCalling: true,
      defaultLanding: false,
      systemInstruction: "",
      aiModel: "deepseek-v4-flash",
      speechSpeed: 1.0,
      voiceEngine: "av-Vikas",
      webhooks: [],
      skipHolidays: true,
      duplicateLogic: false,
      retryLimit: 3,
      intervalDelayMinutes: 60,
      nextStageOnRetryExhausted: "",
    };

    const updated = [...process.stages, newStage];
    onChange({ ...process, stages: updated });
    setActiveStageId(newStage.id);
  };

  // Delete / Archive stage
  const handleDeleteStage = (stageId: string) => {
    if (process.stages.length <= 1) {
      alert("A process template must have at least one stage.");
      return;
    }
    if (confirm("Are you sure you want to archive / remove this stage?")) {
      const filtered = process.stages.filter((s) => s.id !== stageId);
      const reordered = filtered.map((s, idx) => ({ ...s, stageOrder: idx + 1 }));
      onChange({ ...process, stages: reordered });
      if (activeStageId === stageId) {
        setActiveStageId(reordered[0]?.id || "");
      }
    }
  };

  // Add webhook to current stage
  const handleSaveNewHook = () => {
    if (!newHookName || !newHookUrl) return;
    const newHook: StageWebhook = {
      id: `hook-${Date.now()}`,
      name: newHookName,
      url: newHookUrl,
      triggerEvent: newHookEvent,
      isEnabled: true,
    };
    const currentHooks = currentStage?.webhooks || [];
    handleUpdateStage(currentStage.id, {
      webhooks: [...currentHooks, newHook],
    });
    setNewHookName("");
    setNewHookUrl("");
    setIsAddingHook(false);
  };

  // Delete webhook
  const handleDeleteHook = (hookId: string) => {
    if (!currentStage) return;
    const currentHooks = currentStage.webhooks || [];
    handleUpdateStage(currentStage.id, {
      webhooks: currentHooks.filter((h) => h.id !== hookId),
    });
  };

  // Insert variable into prompt
  const handleInsertVariable = (variable: string) => {
    if (!currentStage) return;
    const currentPrompt = currentStage.systemInstruction || "";
    handleUpdateStage(currentStage.id, {
      systemInstruction:
        currentPrompt + (currentPrompt.endsWith(" ") || !currentPrompt ? "" : " ") + `{{${variable}}}`,
    });
  };

  // Click outside listener for Variable Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        variableDropdownRef.current &&
        !variableDropdownRef.current.contains(event.target as Node)
      ) {
        setIsVariableDropdownOpen(false);
      }
    };
    if (isVariableDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isVariableDropdownOpen]);

  const filteredStages = process.stages.filter((s) =>
    (s.name || `Stage ${s.stageOrder}`).toLowerCase().includes(stageSearch.toLowerCase())
  );

  const filteredTokens = useMemo(() => {
    if (!variableSearch) return ALL_VARIABLE_KEYS;
    return ALL_VARIABLE_KEYS.filter((k) =>
      k.toLowerCase().includes(variableSearch.toLowerCase())
    );
  }, [variableSearch]);

  return (
    <div className="space-y-6">
      {/* 2-Column Layout: Left Stage List Sidebar | Right Stage Configuration Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT STAGE SELECTOR (3 cols) */}
        <div className="lg:col-span-3 bg-white/80 backdrop-blur-md rounded-3xl p-3.5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-500">
              Stages
            </span>
          </div>

          {/* Stage List Search */}
          <input
            type="text"
            value={stageSearch}
            onChange={(e) => setStageSearch(e.target.value)}
            placeholder="Search stages..."
            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200/80 rounded-xl outline-none focus:ring-2 focus:ring-[#1456f0]/40 text-[#181e25]"
          />

          {/* Stage List Items */}
          <div className="space-y-1.5 max-h-[520px] overflow-y-auto custom-scrollbar pr-0.5">
            {filteredStages.map((stage) => {
              const isSelected = stage.id === currentStage?.id;
              const color = stage.statusColor || "#10b981";

              return (
                <div
                  key={stage.id}
                  onClick={() => setActiveStageId(stage.id)}
                  className={`
                    flex items-center p-3 rounded-2xl cursor-pointer transition-all border
                    ${
                      isSelected
                        ? "bg-[#181e25] text-white border-[#181e25] shadow-sm"
                        : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200/70 hover:border-slate-300 shadow-2xs"
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-bold text-xs truncate">
                      {stage.name || `Stage ${stage.stageOrder}`}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* ADD NEW STAGE BUTTON: Below the stage list items */}
            <button
              type="button"
              onClick={handleAddStage}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl border border-dashed border-slate-300 hover:border-[#1456f0] bg-slate-50/50 hover:bg-blue-50/60 text-slate-600 hover:text-[#1456f0] text-xs font-bold transition-all mt-2 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Stage</span>
            </button>
          </div>
        </div>

        {/* RIGHT STAGE CONFIGURATION PANEL (9 cols) */}
        {currentStage && (
          <div className="lg:col-span-9 space-y-4">
            {/* 5 Stage-Level Navigation Tabs Bar with Archive Button */}
            <div className="flex items-center justify-between gap-2 p-1.5 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
                {[
                  { id: "general", label: "GENERAL", icon: Settings },
                  { id: "prompts", label: "AI PROMPTS", icon: Sparkles },
                  { id: "settings", label: "AI SETTINGS", icon: Cpu },
                  { id: "webhooks", label: "WEBHOOKS", icon: Globe },
                  { id: "advanced", label: "ADVANCED", icon: SlidersHorizontal },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeStageTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveStageTab(tab.id as any)}
                      className={`
                        flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap
                        ${
                          isActive
                            ? "bg-[#181e25] text-white shadow-xs"
                            : "text-slate-600 hover:text-[#181e25] hover:bg-white/80"
                        }
                      `}
                    >
                      <Icon
                        className={`w-3.5 h-3.5 ${
                          isActive ? "text-blue-400" : "text-slate-400"
                        }`}
                      />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Archive Stage Button */}
              <button
                type="button"
                onClick={() => handleDeleteStage(currentStage.id)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/70 transition-colors shrink-0 ml-2"
                title="Archive current stage"
              >
                Archive Stage
              </button>
            </div>

            {/* TAB 1: GENERAL */}
            {activeStageTab === "general" && (
              <div className="p-6 rounded-3xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-200">
                <div>
                  <h4 className="font-bold text-base text-[#181e25]">
                    General Settings
                  </h4>
                  <p className="text-xs text-slate-400">
                    Basic information and visibility settings for this stage
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Stage Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Stage Name
                    </label>
                    <input
                      type="text"
                      value={currentStage.name}
                      onChange={(e) =>
                        handleUpdateStage(currentStage.id, {
                          name: e.target.value,
                        })
                      }
                      placeholder="e.g. Inbound Intake & Triage"
                      className="w-full px-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-200/80 rounded-2xl outline-none focus:ring-2 focus:ring-[#1456f0]/40 font-semibold text-[#181e25]"
                    />
                  </div>

                  {/* Status Color Palette */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Status Color
                    </label>
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {COLOR_PALETTE.map((c) => {
                        const isSelected =
                          (currentStage.statusColor || "#10b981") === c.hex;
                        return (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() =>
                              handleUpdateStage(currentStage.id, {
                                statusColor: c.hex,
                              })
                            }
                            className={`w-6 h-6 rounded-full transition-all flex items-center justify-center ${
                              isSelected
                                ? "ring-2 ring-offset-2 ring-slate-800 scale-110"
                                : "hover:scale-105 opacity-80 hover:opacity-100"
                            }`}
                            style={{ backgroundColor: c.hex }}
                            title={c.label}
                          >
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-white" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={currentStage.description || ""}
                    onChange={(e) =>
                      handleUpdateStage(currentStage.id, {
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe the objective and operational role of this stage..."
                    className="w-full px-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-200/80 rounded-2xl outline-none focus:ring-2 focus:ring-[#1456f0]/40 text-[#181e25]"
                  />
                </div>

                {/* Feature Toggles Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Automatic Calling Toggle */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-[#181e25] block">
                          Automatic Calling
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          Initiate AI calling immediately upon stage entry
                        </span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentStage.automaticCalling ?? true}
                        onChange={(e) =>
                          handleUpdateStage(currentStage.id, {
                            automaticCalling: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#181e25]"></div>
                    </label>
                  </div>

                  {/* Default Landing Toggle */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                        <LinkIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-[#181e25] block">
                          Default Landing
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          Mark as the starting point for this template
                        </span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentStage.defaultLanding ?? false}
                        onChange={(e) =>
                          handleUpdateStage(currentStage.id, {
                            defaultLanding: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#181e25]"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: AI PROMPTS */}
            {activeStageTab === "prompts" && (
              <div className="p-6 rounded-3xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs space-y-4 animate-in fade-in duration-200">
                {/* Header & Right-Aligned Greyish Insert Variable Dropdown */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-base text-[#181e25]">
                      System Instruction
                    </h4>
                    <p className="text-xs text-slate-400">
                      The core behavioral guideline and script logic for the AI agent.
                    </p>
                  </div>

                  {/* RIGHT-ALIGNED GREYISH INSERT VARIABLE DROPDOWN */}
                  <div className="relative" ref={variableDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsVariableDropdownOpen(!isVariableDropdownOpen)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300/80 text-xs font-mono font-medium transition-all shadow-2xs"
                    >
                      <Code2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>+ Insert Variable</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                          isVariableDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Floating Dropdown positioned directly on right */}
                    {isVariableDropdownOpen && (
                      <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2">
                        {/* Quick Search */}
                        <div className="relative">
                          <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={variableSearch}
                            onChange={(e) => setVariableSearch(e.target.value)}
                            placeholder="Search {{variable}}..."
                            className="w-full pl-7 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200/80 rounded-lg outline-none focus:ring-2 focus:ring-slate-400/40 font-mono text-[#181e25]"
                          />
                        </div>

                        {/* Flat list of {{tokens}} without labels or group headings */}
                        <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-0.5 pr-0.5">
                          {filteredTokens.map((key) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => handleInsertVariable(key)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-xs font-mono text-slate-700 hover:text-blue-600 transition-colors flex items-center justify-between"
                            >
                              <span>{`{{${key}}}`}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Main Prompt Textarea */}
                <div className="space-y-1.5">
                  <textarea
                    rows={8}
                    value={
                      currentStage.systemInstruction ||
                      currentStage.basic?.callerPitch ||
                      ""
                    }
                    onChange={(e) =>
                      handleUpdateStage(currentStage.id, {
                        systemInstruction: e.target.value,
                      })
                    }
                    placeholder="Enter system instructions e.g. 'You are a healthcare assistant. Greet {{client_name}} and confirm {{service_name}}...'"
                    className="w-full p-4 text-xs sm:text-sm bg-white border border-slate-200/80 rounded-2xl font-mono leading-relaxed outline-none focus:ring-2 focus:ring-[#1456f0]/40 text-[#181e25] shadow-2xs"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: AI SETTINGS (Exact match to Reference Screenshot 2) */}
            {activeStageTab === "settings" && (
              <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-8 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  {/* LEFT COLUMN: AI Model & Voice Engine */}
                  <div className="space-y-6">
                    {/* AI Model */}
                    <div className="space-y-2">
                      <div>
                        <h4 className="font-bold text-base text-[#181e25]">
                          AI Model
                        </h4>
                        <p className="text-xs text-slate-500">
                          Select the underlying LLM that powers the conversational logic.
                        </p>
                      </div>

                      <div className="relative">
                        <select
                          value={currentStage.aiModel || "deepseek-v4-flash"}
                          onChange={(e) =>
                            handleUpdateStage(currentStage.id, {
                              aiModel: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200/90 rounded-2xl outline-none focus:ring-2 focus:ring-slate-300 font-semibold text-[#181e25] cursor-pointer appearance-none"
                        >
                          <option value="deepseek-v4-flash">deepseek v4 flash</option>
                          <option value="deepseek-v3-flash">deepseek v3 flash</option>
                          <option value="gemini-2.5-flash">gemini 2.5 flash</option>
                          <option value="gpt-4o-mini">gpt-4o mini</option>
                          <option value="claude-3-5-haiku">claude 3.5 haiku</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Voice Engine */}
                    <div className="space-y-2">
                      <div>
                        <h4 className="font-bold text-base text-[#181e25]">
                          Voice Engine
                        </h4>
                        <p className="text-xs text-slate-500">
                          Choose the vocal personality that best represents your brand's tone.
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <select
                            value={currentStage.voiceEngine || "av-Vikas"}
                            onChange={(e) =>
                              handleUpdateStage(currentStage.id, {
                                voiceEngine: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 text-xs sm:text-sm bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200/90 rounded-2xl outline-none focus:ring-2 focus:ring-slate-300 font-semibold text-[#181e25] cursor-pointer appearance-none"
                          >
                            <option value="av-Vikas">IN Vikas</option>
                            <option value="en-US-Journey-F">US Journey-F</option>
                            <option value="en-US-Standard-C">US Standard-C</option>
                            <option value="en-GB-Neural2-B">GB Neural2-B</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsPlayingTestVoice(true);
                            setTimeout(() => setIsPlayingTestVoice(false), 2000);
                          }}
                          className="px-5 py-2.5 rounded-2xl bg-white border border-slate-200/90 hover:bg-slate-50 text-[#181e25] font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
                        >
                          <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                          <span>{isPlayingTestVoice ? "Playing..." : "Test"}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Speech Speed & Notice Box */}
                  <div className="space-y-5">
                    {/* Speech Speed Slider */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-base text-[#181e25]">
                          Speech Speed
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                          {(currentStage.speechSpeed ?? 1.0).toFixed(0)}x
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Adjust how fast the AI speaks to ensure a natural conversational rhythm.
                      </p>

                      <div className="pt-2">
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.1"
                          value={currentStage.speechSpeed ?? 1.0}
                          onChange={(e) =>
                            handleUpdateStage(currentStage.id, {
                              speechSpeed: parseFloat(e.target.value),
                            })
                          }
                          className="w-full accent-black cursor-pointer h-2 bg-slate-200 rounded-lg"
                        />
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider pt-2">
                          <span>SLOW</span>
                          <span>NATURAL</span>
                          <span>FAST</span>
                        </div>
                      </div>
                    </div>

                    {/* Speech Speed Notice Box */}
                    <div className="p-4 rounded-2xl bg-[#fffbf0] border border-[#fde68a] flex items-center gap-3 text-xs text-[#92400e]">
                      <Info className="w-5 h-5 text-[#d97706] shrink-0" />
                      <span>
                        Speech speed significantly affects naturalness. <strong>1.0x (Natural)</strong> is highly recommended.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: WEBHOOKS */}
            {activeStageTab === "webhooks" && (
              <div className="p-6 rounded-3xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-base text-[#181e25]">
                      Service Integrations
                    </h4>
                    <p className="text-xs text-slate-400">
                      Deliver call results and engagement metrics to external systems.
                    </p>
                  </div>

                  {!isAddingHook && (
                    <button
                      type="button"
                      onClick={() => setIsAddingHook(true)}
                      className="px-3 py-1.5 rounded-xl bg-[#181e25] hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Hook
                    </button>
                  )}
                </div>

                {/* Hook Creation Box */}
                {isAddingHook && (
                  <div className="p-4 rounded-2xl bg-white border border-blue-200/80 shadow-sm space-y-4">
                    <h5 className="font-bold text-xs uppercase tracking-wider text-[#1456f0]">
                      Configure New Webhook
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={newHookName}
                        onChange={(e) => setNewHookName(e.target.value)}
                        placeholder="Webhook Name (e.g., CRM Lead Sync)"
                        className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1456f0]/40 text-[#181e25]"
                      />
                      <select
                        value={newHookEvent}
                        onChange={(e) => setNewHookEvent(e.target.value as any)}
                        className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1456f0]/40 font-semibold text-[#181e25]"
                      >
                        <option value="call_completed">Event: Call Completed</option>
                        <option value="stage_entry">Event: Stage Entry</option>
                        <option value="stage_exit">Event: Stage Exit</option>
                        <option value="call_failed">Event: Call Failed / No Answer</option>
                      </select>
                    </div>
                    <input
                      type="url"
                      value={newHookUrl}
                      onChange={(e) => setNewHookUrl(e.target.value)}
                      placeholder="Destination URL (e.g. https://api.crm.com/v1/webhook)"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1456f0]/40 font-mono text-[#181e25]"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingHook(false)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveNewHook}
                        className="px-4 py-1.5 rounded-xl bg-[#1456f0] hover:bg-[#1146c7] text-white font-bold text-xs shadow-xs transition-colors"
                      >
                        Save Webhook
                      </button>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {(!currentStage.webhooks || currentStage.webhooks.length === 0) && !isAddingHook && (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 bg-white/50 rounded-2xl border border-dashed border-slate-200">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-[#181e25]">No Webhooks</h5>
                      <p className="text-xs text-slate-400 max-w-xs">
                        Trigger external system events when leads enter or exit this stage.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddingHook(true)}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs"
                    >
                      Add Hook
                    </button>
                  </div>
                )}

                {/* Webhooks List */}
                {currentStage.webhooks && currentStage.webhooks.length > 0 && (
                  <div className="space-y-2.5">
                    {currentStage.webhooks.map((h) => (
                      <div
                        key={h.id}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-between shadow-2xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#181e25]">{h.name}</span>
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#1456f0] text-[10px] font-mono uppercase font-bold">
                              {h.triggerEvent.replace(/_/g, " ")}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 block truncate max-w-md">
                            {h.url}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteHook(h.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: ADVANCED (Exact match to screenshot) */}
            {activeStageTab === "advanced" && (
              <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-8 animate-in fade-in duration-200">
                {/* Policy & Behavior Section */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-lg text-[#181e25]">
                      Policy & Behavior
                    </h4>
                    <p className="text-xs text-slate-500">
                      Strict engagement rules and workflow prioritization.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Skip Holidays Toggle Card */}
                    <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between shadow-2xs">
                      <div className="space-y-3">
                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-500 shadow-2xs">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-sm text-[#181e25] block">
                            Skip Holidays
                          </span>
                          <span className="text-xs text-slate-400 block mt-0.5">
                            Automatically pause automated interaction on non-working days.
                          </span>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                        <input
                          type="checkbox"
                          checked={currentStage.skipHolidays ?? true}
                          onChange={(e) =>
                            handleUpdateStage(currentStage.id, {
                              skipHolidays: e.target.checked,
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                      </label>
                    </div>

                    {/* Duplicate Logic Toggle Card */}
                    <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between shadow-2xs">
                      <div className="space-y-3">
                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-500 shadow-2xs">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-sm text-[#181e25] block">
                            Duplicate Logic
                          </span>
                          <span className="text-xs text-slate-400 block mt-0.5">
                            Allow identical contact records to coexist in this stage.
                          </span>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                        <input
                          type="checkbox"
                          checked={currentStage.duplicateLogic ?? false}
                          onChange={(e) =>
                            handleUpdateStage(currentStage.id, {
                              duplicateLogic: e.target.checked,
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Retry Orchestration Section */}
                <div className="space-y-5 pt-4 border-t border-slate-100">
                  <div>
                    <h4 className="font-bold text-lg text-[#181e25]">
                      Retry Orchestration
                    </h4>
                    <p className="text-xs text-slate-500">
                      Define fallback logic for failed initial engagements.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Retry Limit */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                        RETRY LIMIT
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={currentStage.retryLimit ?? 3}
                        onChange={(e) =>
                          handleUpdateStage(currentStage.id, {
                            retryLimit: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full px-4 py-3 text-sm bg-slate-100/90 border-transparent rounded-2xl outline-none focus:ring-2 focus:ring-slate-300 font-semibold text-[#181e25]"
                      />
                    </div>

                    {/* Interval Delay (Min) */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                        INTERVAL DELAY (MIN)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="5"
                        value={currentStage.intervalDelayMinutes ?? 60}
                        onChange={(e) =>
                          handleUpdateStage(currentStage.id, {
                            intervalDelayMinutes: parseInt(e.target.value) || 60,
                          })
                        }
                        className="w-full px-4 py-3 text-sm bg-slate-100/90 border-transparent rounded-2xl outline-none focus:ring-2 focus:ring-slate-300 font-semibold text-[#181e25]"
                      />
                    </div>
                  </div>

                  {/* Next Stage on Retry Exhausted */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      NEXT STAGE ON RETRY EXHAUSTED
                    </label>
                    <p className="text-[11px] text-slate-400">
                      When all retries fail, automatically move the contact to this stage. Leave unset to keep them here.
                    </p>
                    <div className="relative">
                      <select
                        value={currentStage.nextStageOnRetryExhausted || ""}
                        onChange={(e) =>
                          handleUpdateStage(currentStage.id, {
                            nextStageOnRetryExhausted: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 text-xs sm:text-sm bg-white border border-slate-300 rounded-2xl outline-none focus:ring-2 focus:ring-slate-400/40 font-semibold text-[#181e25] appearance-none cursor-pointer"
                      >
                        <option value="">— None (stay in this stage) —</option>
                        {process.stages
                          .filter((s) => s.id !== currentStage.id)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              Move to: {s.name || `Stage ${s.stageOrder}`}
                            </option>
                          ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
