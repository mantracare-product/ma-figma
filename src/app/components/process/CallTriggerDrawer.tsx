import React, { useState, useEffect, useMemo } from "react";
import DrawerShell from "../ui/DrawerShell";
import { useNavigate } from "react-router";
import {
  Settings,
  Zap,
  Clock,
  CalendarOff,
  Calendar,
  ChevronDown,
  Info,
  Plus,
  Check,
  RotateCcw,
  X,
  Layers,
  Globe,
  Mic,
  RefreshCw,
  PhoneForwarded,
  PhoneCall,
  Voicemail,
  Trash2,
  Volume2,
  Play,
  Bot,
  Sparkles,
  Cpu,
  SlidersHorizontal,
} from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import { toast } from "sonner";
import { CallTriggerSettings, TransferNumberItem, getDefaultCallTriggerSettings } from "../../../lib/useProcessStore";
import { getActiveAIModels, AI_MODELS_STORE_EVENT, AIModelConfig } from "../../../lib/aiModelsStore";
import { getStoredVoices, VoiceConfigItem, VOICE_STORE_EVENT } from "../../../lib/useVoiceStore";
import MultiSelectNumberDropdown from "./MultiSelectNumberDropdown";

export interface CallTriggerSaveOptions {
  setAsDefault?: boolean;
  applyToCurrentProcess?: boolean;
}

export interface CallTriggerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stageName?: string;
  processName?: string;
  settings?: CallTriggerSettings;
  inboundNumbers?: string[];
  onSave?: (settings: CallTriggerSettings, options?: CallTriggerSaveOptions) => void;
}

const DEFAULT_SETTINGS: CallTriggerSettings = {
  timingType: "immediate",
  waitDuration: 15,
  waitUnit: "minutes",
  callingHoursType: "custom",
  callingHoursStart: "09:00",
  callingHoursEnd: "18:00",
  timezoneMode: "lead",
  customTimezone: "America/New_York",
  skipDays: ["Saturday", "Sunday"],
  blackoutDates: [],
  callingNumber: "+1 (555) 123-4567",
  callingNumbers: ["+1 (555) 123-4567"],
  recordCalls: true,
  callDurationMinutes: 15,
  hangupWindowMinutes: 2,
  detectVoicemail: true,
  aiModel: "Gemini 2.5 Flash",
  aiVoiceSpeed: 1.0,
  aiVoice: "Ava",
  aiTone: "Professional",
  aiStyle: "Balanced",
};

const WEEKDAYS = [
  { id: "Monday", short: "Mon" },
  { id: "Tuesday", short: "Tue" },
  { id: "Wednesday", short: "Wed" },
  { id: "Thursday", short: "Thu" },
  { id: "Friday", short: "Fri" },
  { id: "Saturday", short: "Sat" },
  { id: "Sunday", short: "Sun" },
];

const COUNTRY_CODES = [
  { value: "+1", label: "+1 (US/CA)" },
  { value: "+44", label: "+44 (UK)" },
  { value: "+91", label: "+91 (IN)" },
  { value: "+61", label: "+61 (AU)" },
  { value: "+49", label: "+49 (DE)" },
  { value: "+33", label: "+33 (FR)" },
  { value: "+81", label: "+81 (JP)" },
  { value: "+86", label: "+86 (CN)" },
  { value: "+55", label: "+55 (BR)" },
  { value: "+52", label: "+52 (MX)" },
  { value: "+971", label: "+971 (UAE)" },
  { value: "+65", label: "+65 (SG)" },
  { value: "+27", label: "+27 (ZA)" },
];

export default function CallTriggerDrawer({
  isOpen,
  onClose,
  stageName,
  processName,
  settings,
  inboundNumbers,
  onSave,
}: CallTriggerDrawerProps) {
  const availableNumbers = inboundNumbers && inboundNumbers.length > 0
    ? inboundNumbers
    : ["+1 (555) 123-4567", "+1 (555) 987-6543", "+1 (555) 555-1234"];

  // Collapsible dropdown states
  const navigate = useNavigate();
  const [callingNumberDropdownOpen, setCallingNumberDropdownOpen] = useState(true);
  const [triggerDropdownOpen, setTriggerDropdownOpen] = useState(true);
  const [callingHoursDropdownOpen, setCallingHoursDropdownOpen] = useState(false);
  const [skipDaysDropdownOpen, setSkipDaysDropdownOpen] = useState(false);
  const [callDurationDropdownOpen, setCallDurationDropdownOpen] = useState(false);
  const [recordCallsDropdownOpen, setRecordCallsDropdownOpen] = useState(false);
  const [detectVoicemailDropdownOpen, setDetectVoicemailDropdownOpen] = useState(false);
  const [aiModelDropdownOpen, setAiModelDropdownOpen] = useState(false);
  const [retryRulesDropdownOpen, setRetryRulesDropdownOpen] = useState(false);
  const [transferCallDropdownOpen, setTransferCallDropdownOpen] = useState(false);
  const [scopeDropdownOpen, setScopeDropdownOpen] = useState(false);

  // Scope & Default checkboxes
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [applyToCurrentProcess, setApplyToCurrentProcess] = useState(false);

  // Form states initialized from props or defaults
  const [callingNumber, setCallingNumber] = useState<string>("+1 (555) 123-4567");
  const [callingNumbers, setCallingNumbers] = useState<string[]>(["+1 (555) 123-4567"]);
  const [callingNumberList, setCallingNumberList] = useState<string[]>(availableNumbers);

  const handleAddCallingNumber = (newNum: string) => {
    if (!callingNumberList.includes(newNum)) {
      setCallingNumberList([...callingNumberList, newNum]);
    }
  };
  const [timingType, setTimingType] = useState<"immediate" | "wait">("immediate");
  const [waitDuration, setWaitDuration] = useState<number>(15);
  const [waitUnit, setWaitUnit] = useState<"minutes" | "hours" | "days" | "weeks" | "months">("minutes");

  const [callingHoursStart, setCallingHoursStart] = useState<string>("09:00");
  const [callingHoursEnd, setCallingHoursEnd] = useState<string>("18:00");

  const [skipDays, setSkipDays] = useState<string[]>(["Saturday", "Sunday"]);
  const [blackoutDates, setBlackoutDates] = useState<Array<{ id: string; date: string; label?: string }>>([]);

  // Record Calls, Call Duration & Retries states
  const [recordCalls, setRecordCalls] = useState<boolean>(true);
  const [callDurationMinutes, setCallDurationMinutes] = useState<number>(15);
  const [hangupWindowMinutes, setHangupWindowMinutes] = useState<number>(2);
  const [detectVoicemail, setDetectVoicemail] = useState<boolean>(true);
  const [retryRulesEnabled, setRetryRulesEnabled] = useState<boolean>(false);
  const [retryAttempts, setRetryAttempts] = useState<number>(3);
  const [retryDelay, setRetryDelay] = useState<number>(5);

  // AI Model Settings states
  const [selectedAIModel, setSelectedAIModel] = useState<string>("Gemini 2.5 Flash");
  const [stageVoiceSpeed, setStageVoiceSpeed] = useState<number>(1.0);
  const [stageVoice, setStageVoice] = useState<string>("Nova");
  const [stageTone, setStageTone] = useState<string>("Professional");
  const [stageStyle, setStageStyle] = useState<string>("Balanced");
  const [activeAIModels, setActiveAIModels] = useState<AIModelConfig[]>(getActiveAIModels);
  const [configuredVoices, setConfiguredVoices] = useState<VoiceConfigItem[]>(getStoredVoices);

  const activeConfiguredVoices = useMemo(() => {
    return configuredVoices.filter(
      (v) => (v.status === true || (v as any).status === "active") && v.clientEnabled !== false
    );
  }, [configuredVoices]);

  useEffect(() => {
    const handleVoiceUpdate = () => setConfiguredVoices(getStoredVoices());
    const handleModelUpdate = () => setActiveAIModels(getActiveAIModels());
    window.addEventListener(VOICE_STORE_EVENT, handleVoiceUpdate);
    window.addEventListener(AI_MODELS_STORE_EVENT, handleModelUpdate);
    window.addEventListener("storage", handleVoiceUpdate);
    window.addEventListener("storage", handleModelUpdate);
    return () => {
      window.removeEventListener(VOICE_STORE_EVENT, handleVoiceUpdate);
      window.removeEventListener(AI_MODELS_STORE_EVENT, handleModelUpdate);
      window.removeEventListener("storage", handleVoiceUpdate);
      window.removeEventListener("storage", handleModelUpdate);
    };
  }, []);

  // Ensure stageVoice stays pointing to an enabled voice
  useEffect(() => {
    if (activeConfiguredVoices.length > 0 && !activeConfiguredVoices.some((v) => v.name === stageVoice)) {
      setStageVoice(activeConfiguredVoices[0].name);
    }
  }, [activeConfiguredVoices, stageVoice]);

  // Transfer Call states
  const [transferCallEnabled, setTransferCallEnabled] = useState<boolean>(false);
  const [transferNumbers, setTransferNumbers] = useState<TransferNumberItem[]>([
    { id: "tn-1", countryCode: "+1", phoneNumber: "", isPrimary: true },
  ]);
  const [transferVoiceResponse, setTransferVoiceResponse] = useState<string>("Please hold while I transfer your call");
  const [transferReason, setTransferReason] = useState<string>("");

  // Draft fields for custom range
  const [draftStartDate, setDraftStartDate] = useState<string>("");
  const [draftEndDate, setDraftEndDate] = useState<string>("");

  // Sync state whenever settings or isOpen changes
  useEffect(() => {
    if (isOpen) {
      const current = settings || getDefaultCallTriggerSettings() || DEFAULT_SETTINGS;
      const initialCallingNums =
        current.callingNumbers && current.callingNumbers.length > 0
          ? current.callingNumbers
          : current.callingNumber
          ? [current.callingNumber]
          : [availableNumbers[0] || "+1 (555) 123-4567"];
      setCallingNumbers(initialCallingNums);
      setCallingNumber(initialCallingNums[0] || "+1 (555) 123-4567");
      setTimingType(current.timingType ?? "immediate");
      setWaitDuration(current.waitDuration ?? 15);
      setWaitUnit(current.waitUnit ?? "minutes");
      setCallingHoursStart(current.callingHoursStart ?? "09:00");
      setCallingHoursEnd(current.callingHoursEnd ?? "18:00");
      setSkipDays(current.skipDays ?? ["Saturday", "Sunday"]);
      setBlackoutDates(current.blackoutDates ?? []);
      setRecordCalls(current.recordCalls !== undefined ? current.recordCalls : true);
      setCallDurationMinutes(current.callDurationMinutes ?? 15);
      setHangupWindowMinutes(current.hangupWindowMinutes ?? 2);
      setDetectVoicemail(current.detectVoicemail !== undefined ? current.detectVoicemail : true);
      setSelectedAIModel(current.aiModel || current.aiSettings?.platform || "Gemini 2.5 Flash");
      setStageVoiceSpeed(current.aiVoiceSpeed ?? current.aiSettings?.voiceSpeed ?? 1.0);
      const chosenVoice = current.aiVoice || current.aiSettings?.voice;
      const validVoice = chosenVoice && activeConfiguredVoices.some((v) => v.name === chosenVoice)
        ? chosenVoice
        : (activeConfiguredVoices[0]?.name || chosenVoice || "Atlas");
      setStageVoice(validVoice);
      setStageTone(current.aiTone || current.aiSettings?.tone || "Professional");
      setStageStyle(current.aiStyle || current.aiSettings?.style || "Balanced");
      setRetryRulesEnabled(current.retryRulesEnabled ?? false);
      setRetryAttempts(current.retryAttempts ?? 3);
      setRetryDelay(current.retryDelay ?? 5);
      // Transfer Call
      setTransferCallEnabled(current.transferCallEnabled ?? false);
      let parsedNumbers: TransferNumberItem[] = [];
      if (current.transferNumbers && current.transferNumbers.length > 0) {
        parsedNumbers = current.transferNumbers.map((n) => ({ ...n }));
      } else {
        const primaryPhone = current.transferPrimaryPhoneNumber || current.transferPhoneNumber || "";
        const secondaryPhone = current.transferSecondaryPhoneNumber || "";
        parsedNumbers = [
          {
            id: "tn-1",
            countryCode: current.transferPrimaryCountryCode || current.transferCountryCode || "+1",
            phoneNumber: primaryPhone,
            isPrimary: true,
          },
        ];
        if (secondaryPhone) {
          parsedNumbers.push({
            id: "tn-2",
            countryCode: current.transferSecondaryCountryCode || "+1",
            phoneNumber: secondaryPhone,
            isPrimary: false,
          });
        }
      }
      if (!parsedNumbers.some((n) => n.isPrimary) && parsedNumbers.length > 0) {
        parsedNumbers[0].isPrimary = true;
      }
      setTransferNumbers(parsedNumbers);
      setTransferVoiceResponse(current.transferVoiceResponse ?? "Please hold while I transfer your call");
      setTransferReason(current.transferReason ?? "");
      setSetAsDefault(false);
      setApplyToCurrentProcess(false);
    }
  }, [isOpen, settings]);

  const handleAddTransferNumber = () => {
    setTransferNumbers((prev) => [
      ...prev,
      {
        id: `tn-${Date.now()}`,
        countryCode: "+1",
        phoneNumber: "",
        isPrimary: prev.length === 0,
      },
    ]);
  };

  const handleSetPrimaryNumber = (id: string) => {
    setTransferNumbers((prev) =>
      prev.map((num) => ({
        ...num,
        isPrimary: num.id === id,
      }))
    );
  };

  const handleUpdateTransferNumber = (id: string, patch: Partial<TransferNumberItem>) => {
    setTransferNumbers((prev) =>
      prev.map((num) => (num.id === id ? { ...num, ...patch } : num))
    );
  };

  const handleRemoveTransferNumber = (id: string) => {
    setTransferNumbers((prev) => {
      const filtered = prev.filter((num) => num.id !== id);
      if (filtered.length > 0 && !filtered.some((num) => num.isPrimary)) {
        filtered[0] = { ...filtered[0], isPrimary: true };
      }
      return filtered;
    });
  };

  const handleToggleSkipDay = (dayId: string) => {
    if (skipDays.includes(dayId)) {
      setSkipDays(skipDays.filter((d) => d !== dayId));
    } else {
      setSkipDays([...skipDays, dayId]);
    }
  };

  const handleAddCustomRange = () => {
    if (!draftStartDate) {
      toast.error("Please select a start date");
      return;
    }
    const dateStr = draftEndDate && draftEndDate !== draftStartDate
      ? `${draftStartDate} to ${draftEndDate}`
      : draftStartDate;

    const exists = blackoutDates.some((b) => b.date === dateStr);
    if (exists) {
      toast.error("This date or range is already in the list");
      return;
    }
    const newEntry = {
      id: `bd-${Date.now()}`,
      date: dateStr,
    };
    setBlackoutDates([...blackoutDates, newEntry]);
    setDraftStartDate("");
    setDraftEndDate("");
    toast.success("Date added to days off");
  };

  const handleRemoveBlackoutDate = (id: string) => {
    setBlackoutDates(blackoutDates.filter((b) => b.id !== id));
  };

  const handleSave = () => {
    const primaryItem = transferNumbers.find((n) => n.isPrimary) || transferNumbers[0];
    const nonPrimaryItems = transferNumbers.filter((n) => !n.isPrimary);
    const secondaryItem = nonPrimaryItems[0];

    const updated: CallTriggerSettings = {
      timingType,
      waitDuration: Number(waitDuration) || 1,
      waitUnit,
      callingHoursType: "custom",
      callingHoursStart,
      callingHoursEnd,
      timezoneMode: settings?.timezoneMode ?? "lead",
      customTimezone: settings?.customTimezone ?? "America/New_York",
      skipDays,
      blackoutDates,
      callingNumber: callingNumbers[0] || callingNumber || "",
      callingNumbers: callingNumbers,
      recordCalls,
      callDurationMinutes: Number(callDurationMinutes) || 15,
      hangupWindowMinutes: Number(hangupWindowMinutes) || 2,
      detectVoicemail,
      retryRulesEnabled,
      retryAttempts: Number(retryAttempts) || 3,
      retryDelay: Number(retryDelay) || 5,
      transferCallEnabled,
      transferNumbers,
      transferPrimaryCountryCode: primaryItem?.countryCode || "+1",
      transferPrimaryPhoneNumber: primaryItem?.phoneNumber || "",
      transferSecondaryCountryCode: secondaryItem?.countryCode || "+1",
      transferSecondaryPhoneNumber: secondaryItem?.phoneNumber || "",
      transferCountryCode: primaryItem?.countryCode || "+1",
      transferPhoneNumber: primaryItem?.phoneNumber || "",
      transferVoiceResponse,
      transferReason,
      aiModel: selectedAIModel,
      aiVoiceSpeed: stageVoiceSpeed,
      aiVoice: stageVoice,
      aiTone: stageTone,
      aiStyle: stageStyle,
      aiSettings: {
        platform: selectedAIModel,
        voiceSpeed: stageVoiceSpeed,
        voice: stageVoice,
        tone: stageTone,
        style: stageStyle,
      },
    };

    if (onSave) {
      onSave(updated, { setAsDefault, applyToCurrentProcess });
    }
    onClose();
  };

  const handleResetDefaults = () => {
    const defaults = getDefaultCallTriggerSettings() || DEFAULT_SETTINGS;
    const defaultCallingNums =
      defaults.callingNumbers && defaults.callingNumbers.length > 0
        ? defaults.callingNumbers
        : [defaults.callingNumber || availableNumbers[0] || "+1 (555) 123-4567"];
    setCallingNumbers(defaultCallingNums);
    setCallingNumber(defaultCallingNums[0] || "+1 (555) 123-4567");
    setTimingType(defaults.timingType);
    setWaitDuration(defaults.waitDuration);
    setWaitUnit(defaults.waitUnit);
    setCallingHoursStart(defaults.callingHoursStart);
    setCallingHoursEnd(defaults.callingHoursEnd);
    setSkipDays([...defaults.skipDays]);
    setBlackoutDates([...defaults.blackoutDates]);
    setRecordCalls(defaults.recordCalls !== undefined ? defaults.recordCalls : true);
    setCallDurationMinutes(defaults.callDurationMinutes ?? 15);
    setHangupWindowMinutes(defaults.hangupWindowMinutes ?? 2);
    setDetectVoicemail(defaults.detectVoicemail !== undefined ? defaults.detectVoicemail : true);
    setSelectedAIModel(defaults.aiModel || defaults.aiSettings?.platform || "Gemini 2.5 Flash");
    setStageVoiceSpeed(defaults.aiVoiceSpeed ?? defaults.aiSettings?.voiceSpeed ?? 1.0);
    const chosenDefaultVoice = defaults.aiVoice || defaults.aiSettings?.voice;
    const validDefault = chosenDefaultVoice && activeConfiguredVoices.some((v) => v.name === chosenDefaultVoice)
      ? chosenDefaultVoice
      : (activeConfiguredVoices[0]?.name || chosenDefaultVoice || "Atlas");
    setStageVoice(validDefault);
    setStageTone(defaults.aiTone || defaults.aiSettings?.tone || "Professional");
    setStageStyle(defaults.aiStyle || defaults.aiSettings?.style || "Balanced");
    setRetryRulesEnabled(defaults.retryRulesEnabled ?? false);
    setRetryAttempts(defaults.retryAttempts ?? 3);
    setRetryDelay(defaults.retryDelay ?? 5);
    // Transfer Call
    setTransferCallEnabled(defaults.transferCallEnabled ?? false);
    setTransferNumbers(
      defaults.transferNumbers && defaults.transferNumbers.length > 0
        ? defaults.transferNumbers.map((n) => ({ ...n }))
        : [{ id: "tn-1", countryCode: "+1", phoneNumber: "", isPrimary: true }]
    );
    setTransferVoiceResponse(defaults.transferVoiceResponse ?? "Please hold while I transfer your call");
    setTransferReason(defaults.transferReason ?? "");
    setSetAsDefault(false);
    setApplyToCurrentProcess(false);
    toast.info("Reset to default settings");
  };

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title="Call Trigger Settings"
      subtitle={stageName ? `Configure trigger timing, hours, and skip dates for "${stageName}"` : "Configure trigger timing, hours, and skip dates"}
      icon={<Settings className="w-5 h-5 text-primary" />}
      width="max-w-[540px]"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-xs transition-colors cursor-pointer"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              <Check className="w-4 h-4" />
              Save Settings
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* DROPDOWN: Calling Numbers */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setCallingNumberDropdownOpen(!callingNumberDropdownOpen)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-bold text-[#222222]"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Calling Numbers
                </span>
                <Tooltip text="The integrated number the AI agent will use to initiate or receive calls in this stage.">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {callingNumbers.length > 1
                  ? `${callingNumbers.length} Numbers`
                  : callingNumbers[0] || "Select"}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                  callingNumberDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {callingNumberDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd] space-y-3">
              <div>
                <label
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Integrated Numbers (Source)
                </label>
                <MultiSelectNumberDropdown
                  selected={callingNumbers}
                  onChange={(nums) => {
                    setCallingNumbers(nums);
                    setCallingNumber(nums[0] || "");
                  }}
                  options={callingNumberList}
                  onAddOption={handleAddCallingNumber}
                  palette="blue"
                  placeholder="Select calling numbers..."
                  badgeSuffix="Outbound / Inbound"
                />
              </div>
            </div>
          )}
        </div>

        {/* DROPDOWN 1: Trigger Call Timing */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setTriggerDropdownOpen(!triggerDropdownOpen)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <span
                className="text-sm font-bold text-[#222222]"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                Trigger Call
              </span>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                triggerDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {triggerDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd] space-y-3">
              {/* Option A: Immediately */}
              <div
                onClick={() => setTimingType("immediate")}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  timingType === "immediate"
                    ? "border-primary bg-primary/5 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                      timingType === "immediate"
                        ? "border-primary bg-primary"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {timingType === "immediate" && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span
                    className="text-sm font-semibold text-[#222222]"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    Trigger Immediately
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                    Default
                  </span>
                </div>
                <Tooltip text="Initiate outbound call immediately as soon as a lead enters this stage" placement="left">
                  <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" />
                </Tooltip>
              </div>

              {/* Option B: Wait Delay */}
              <div
                onClick={() => setTimingType("wait")}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  timingType === "wait"
                    ? "border-primary bg-primary/5 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                      timingType === "wait"
                        ? "border-primary bg-primary"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {timingType === "wait" && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span
                    className="text-sm font-semibold text-[#222222]"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    Wait / Delay Before Calling
                  </span>
                </div>
                <Tooltip text="Wait for a specified duration after lead enters stage before placing the call" placement="left">
                  <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" />
                </Tooltip>
              </div>

              {/* Delay Duration Configuration Inputs (shown when Wait selected) */}
              {timingType === "wait" && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="w-28">
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={waitDuration}
                      onChange={(e) => setWaitDuration(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                  </div>
                  <div className="flex-1">
                    <select
                      value={waitUnit}
                      onChange={(e) => setWaitUnit(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900 cursor-pointer"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* DROPDOWN 2: Calling Hours */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setCallingHoursDropdownOpen(!callingHoursDropdownOpen)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <span
                className="text-sm font-bold text-[#222222]"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                Calling Hours
              </span>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                callingHoursDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {callingHoursDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label
                      className="text-xs font-semibold text-slate-700"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      From
                    </label>
                    <Tooltip text="Earliest daily time outbound calls can be placed">
                      <Info className="w-3 h-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" />
                    </Tooltip>
                  </div>
                  <input
                    type="time"
                    value={callingHoursStart}
                    onChange={(e) => setCallingHoursStart(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900 transition-colors"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label
                      className="text-xs font-semibold text-slate-700"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      To
                    </label>
                    <Tooltip text="Latest daily time outbound calls can be placed">
                      <Info className="w-3 h-3 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" />
                    </Tooltip>
                  </div>
                  <input
                    type="time"
                    value={callingHoursEnd}
                    onChange={(e) => setCallingHoursEnd(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900 transition-colors"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DROPDOWN: Call Duration */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setCallDurationDropdownOpen(!callDurationDropdownOpen)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-bold text-[#222222]"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Call Duration
                </span>
                <Tooltip text="Set the maximum call length and when the AI should start wrapping up the conversation.">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {callDurationMinutes} min
              </span>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                  callDurationDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {callDurationDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd] space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label
                      className="text-xs font-semibold text-slate-700"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      Call Duration (min)
                    </label>
                    <Tooltip text="Maximum call duration allowed before the call automatically wraps up.">
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    </Tooltip>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={callDurationMinutes}
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value) || 1);
                      setCallDurationMinutes(val);
                      if (hangupWindowMinutes >= val) {
                        setHangupWindowMinutes(Math.max(1, val - 1));
                      }
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900 transition-colors"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <label
                      className="text-xs font-semibold text-slate-700"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      Hangup Window
                    </label>
                    <Tooltip text="During the last X minutes of total call duration, the AI proactively wraps up gracefully.">
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 whitespace-nowrap" style={{ fontFamily: "Outfit, sans-serif" }}>
                      Last
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, callDurationMinutes - 1)}
                      value={hangupWindowMinutes}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        if (val >= callDurationMinutes) {
                          toast.error(`Hangup window must be less than call duration (${callDurationMinutes} min)`);
                          return;
                        }
                        setHangupWindowMinutes(val);
                      }}
                      className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900 transition-colors"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                    <span className="text-xs text-slate-500 whitespace-nowrap" style={{ fontFamily: "Outfit, sans-serif" }}>
                      {hangupWindowMinutes === 1 ? "min" : "mins"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DROPDOWN: Record Calls */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setRecordCallsDropdownOpen(!recordCallsDropdownOpen)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                <Mic className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-bold text-[#222222]"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Record Calls
                </span>
                <Tooltip text="Enable automated audio recording and AI transcription for calls in this stage.">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  recordCalls
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {recordCalls ? "On" : "Off"}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                  recordCallsDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {recordCallsDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd] space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-bold text-slate-900"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    Enable Call Recording
                  </span>
                  <Tooltip text="Audio recordings and transcripts are saved securely with the contact record.">
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                  </Tooltip>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={recordCalls}
                    onChange={(e) => setRecordCalls(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary cursor-pointer" />
                </label>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal" style={{ fontFamily: "Outfit, sans-serif" }}>
                Ensure compliance with local call recording and privacy laws in your territory.
              </p>
            </div>
          )}
        </div>

        {/* DROPDOWN: Detect Voicemail */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setDetectVoicemailDropdownOpen(!detectVoicemailDropdownOpen)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                <Voicemail className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-bold text-[#222222]"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Detect Voicemail
                </span>
                <Tooltip text="Detect answering machines or voicemail inboxes and take appropriate actions.">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  detectVoicemail
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {detectVoicemail ? "On" : "Off"}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                  detectVoicemailDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {detectVoicemailDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd] space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-bold text-slate-900"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    Enable Voicemail Detection
                  </span>
                  <Tooltip text="This allows AI to detect if caller is on voicemail and disconnect or leave a voice note.">
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                  </Tooltip>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={detectVoicemail}
                    onChange={(e) => setDetectVoicemail(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary cursor-pointer" />
                </label>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal" style={{ fontFamily: "Outfit, sans-serif" }}>
                When enabled, the AI will not waste call time speaking to answering machine greetings.
              </p>
            </div>
          )}
        </div>

        {/* DROPDOWN: AI Model & Voice Settings */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setAiModelDropdownOpen(!aiModelDropdownOpen)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-bold text-[#222222]"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  AI Model & Voice Settings
                </span>
                <Tooltip text="Fine-tune the technical execution of the AI agent's LLM model, voice personality, speed, tone, and conversational style.">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                aiModelDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {aiModelDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd] space-y-3.5">
              {/* 1. AI Model */}
              <div className="space-y-1.5 p-3.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs hover:border-slate-300 transition-all">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    AI Model
                  </span>
                  <Tooltip text="Select the underlying LLM that powers conversational logic.">
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                  </Tooltip>
                </div>
                <div className="relative">
                  <select
                    value={selectedAIModel}
                    onChange={(e) => {
                      if (e.target.value === "__view_more_models__") {
                        navigate("/settings?tab=voice-config&sub=models");
                        return;
                      }
                      setSelectedAIModel(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl appearance-none text-xs font-medium text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors pr-8 cursor-pointer shadow-2xs"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {activeAIModels.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name} ({m.provider})
                      </option>
                    ))}
                    <option disabled value="">──────────</option>
                    <option value="__view_more_models__" className="text-blue-600 font-semibold">
                      Choose from library →
                    </option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* 2. Voice Engine */}
              <div className="space-y-1.5 p-3.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs hover:border-slate-300 transition-all">
                <div className="flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    Voice Engine
                  </span>
                  <Tooltip text="Select synthesized voice profile and test audio preview.">
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={stageVoice}
                      onChange={(e) => {
                        if (e.target.value === "__view_more_voices__") {
                          navigate("/settings?tab=voice-config&sub=voices");
                          return;
                        }
                        setStageVoice(e.target.value);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl appearance-none text-xs font-medium text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors pr-8 cursor-pointer shadow-2xs"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {activeConfiguredVoices.map((v) => (
                        <option key={v.id || v.name} value={v.name}>
                          {v.name} ({v.country}, {v.gender})
                        </option>
                      ))}
                      <option disabled value="">──────────</option>
                      <option value="__view_more_voices__" className="text-blue-600 font-semibold">
                        Choose from library →
                      </option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      toast.success(`Playing preview for ${stageVoice || "Nova"}...`);
                      if ("speechSynthesis" in window) {
                        window.speechSynthesis.cancel();
                        const utterance = new SpeechSynthesisUtterance("Hello! This is how your AI voice sounds.");
                        utterance.rate = stageVoiceSpeed;
                        window.speechSynthesis.speak(utterance);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 rounded-xl text-xs font-semibold text-slate-800 transition-all cursor-pointer shadow-2xs group shrink-0"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <Play className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                    <span className="group-hover:text-emerald-700 text-xs">Test</span>
                  </button>
                </div>
              </div>

              {/* 3. Speech Speed */}
              <div className="space-y-2 p-3.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      Speech Speed
                    </span>
                    <Tooltip text="Adjust the cadence and pacing of AI speech output.">
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                    </Tooltip>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100" style={{ fontFamily: "Outfit, sans-serif" }}>
                    {stageVoiceSpeed.toFixed(1)}x
                  </span>
                </div>
                <div className="space-y-1.5 pt-1">
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={stageVoiceSpeed}
                    onChange={(e) => setStageVoiceSpeed(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 tracking-wider">
                    <span>SLOW (0.5x)</span>
                    <span>NATURAL (1.0x)</span>
                    <span>FAST (1.5x)</span>
                  </div>
                </div>
              </div>

              {/* 4. Tone */}
              <div className="space-y-1.5 p-3.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs hover:border-slate-300 transition-all">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-xs font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    Tone
                  </span>
                  <Tooltip text="Set the emotional tone and demeanor of the AI agent during conversations.">
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                  </Tooltip>
                </div>
                <div className="relative">
                  <select
                    value={stageTone}
                    onChange={(e) => setStageTone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl appearance-none text-xs font-medium text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors pr-8 cursor-pointer shadow-2xs"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <option value="Professional">Professional</option>
                    <option value="Friendly">Friendly</option>
                    <option value="Empathetic">Empathetic</option>
                    <option value="Casual">Casual</option>
                    <option value="Persuasive">Persuasive</option>
                    <option value="Authoritative">Authoritative</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* 5. Style */}
              <div className="space-y-1.5 p-3.5 bg-white border border-slate-200/90 rounded-xl shadow-2xs hover:border-slate-300 transition-all">
                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-900" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    Style
                  </span>
                  <Tooltip text="Define how verbose or concise the AI's verbal responses should be.">
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                  </Tooltip>
                </div>
                <div className="relative">
                  <select
                    value={stageStyle}
                    onChange={(e) => setStageStyle(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl appearance-none text-xs font-medium text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors pr-8 cursor-pointer shadow-2xs"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <option value="Balanced">Balanced</option>
                    <option value="Concise">Concise</option>
                    <option value="Detailed">Detailed</option>
                    <option value="Warm">Warm</option>
                    <option value="Expressive">Expressive</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DROPDOWN: Call Retries Settings */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setRetryRulesDropdownOpen(!retryRulesDropdownOpen)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-bold text-[#222222]"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Call Retries Settings
                </span>
                <Tooltip text="Automatically retry calling if the call fails.">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  retryRulesEnabled
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {retryRulesEnabled ? "On" : "Off"}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                  retryRulesDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {retryRulesDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd] space-y-3">
              {/* Enable Toggle Row */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-bold text-slate-900"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    Enable Retry Rules
                  </span>
                  <Tooltip text="If call fails, automatically retry calling based on rules configured below.">
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                  </Tooltip>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={retryRulesEnabled}
                    onChange={(e) => setRetryRulesEnabled(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary cursor-pointer" />
                </label>
              </div>

              {retryRulesEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label
                      className="block text-xs font-medium text-slate-700 mb-1"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      Retry Attempts
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={retryAttempts}
                      onChange={(e) => setRetryAttempts(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                  </div>

                  <div>
                    <label
                      className="block text-xs font-medium text-slate-700 mb-1"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      Delay Between Retries (min)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={retryDelay}
                      onChange={(e) => setRetryDelay(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* DROPDOWN: Transfer Call */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setTransferCallDropdownOpen(!transferCallDropdownOpen)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                <PhoneForwarded className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-bold text-[#222222]"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Transfer Call
                </span>
                <Tooltip text="Configure automatic call transfer to a human agent or AI agent.">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                </Tooltip>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  transferCallEnabled
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {transferCallEnabled ? "On" : "Off"}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                  transferCallDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {transferCallDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd] space-y-4">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-bold text-slate-900"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    Enable Transfer Call
                  </span>
                  <Tooltip text="When enabled, the AI will transfer the call to the configured destination.">
                    <Info className="w-3 h-3 text-slate-400 cursor-help" />
                  </Tooltip>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={transferCallEnabled}
                    onChange={(e) => setTransferCallEnabled(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary cursor-pointer" />
                </label>
              </div>

              {transferCallEnabled && (
                <div className="space-y-4">
                  {/* Numbers List Header */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-xs font-bold text-slate-800"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      Transfer Numbers
                    </span>
                    <Tooltip text="First we try to hit the number marked as Primary. If busy or skipped, the call will be transferred to the next number in order.">
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    </Tooltip>
                  </div>

                  {/* List of Numbers */}
                  <div className="space-y-2.5">
                    {transferNumbers.map((num) => (
                      <div
                        key={num.id}
                        className={`p-3.5 bg-white border rounded-xl space-y-3 shadow-2xs transition-all ${
                          num.isPrimary
                            ? "border-primary/50 ring-1 ring-primary/10"
                            : "border-slate-200/90"
                        }`}
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label
                              className="block text-[11px] font-semibold text-slate-600 mb-1"
                              style={{ fontFamily: "DM Sans, sans-serif" }}
                            >
                              Country Code
                            </label>
                            <select
                              value={num.countryCode}
                              onChange={(e) => handleUpdateTransferNumber(num.id, { countryCode: e.target.value })}
                              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900 cursor-pointer"
                              style={{ fontFamily: "DM Sans, sans-serif" }}
                            >
                              {COUNTRY_CODES.map((c) => (
                                <option key={c.value} value={c.value}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label
                                className="block text-[11px] font-semibold text-slate-600"
                                style={{ fontFamily: "DM Sans, sans-serif" }}
                              >
                                Phone Number
                              </label>
                              {transferNumbers.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTransferNumber(num.id)}
                                  className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  title="Remove Number"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            <input
                              type="tel"
                              value={num.phoneNumber}
                              onChange={(e) => handleUpdateTransferNumber(num.id, { phoneNumber: e.target.value })}
                              placeholder="5551234567"
                              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900 placeholder:text-slate-400 transition-colors"
                              style={{ fontFamily: "Outfit, sans-serif" }}
                            />
                          </div>
                        </div>

                        {/* Set as Primary Number Toggle Row */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-xs font-semibold text-slate-700"
                              style={{ fontFamily: "DM Sans, sans-serif" }}
                            >
                              Set as Primary Number
                            </span>
                            <Tooltip text="The number marked as Primary will be tried first. If it is busy, skipped, or unanswered, the call will failover and transfer to the next available number.">
                              <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                            </Tooltip>
                          </div>

                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={num.isPrimary}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  handleSetPrimaryNumber(num.id);
                                }
                              }}
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary cursor-pointer" />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Number Button (blue text button on the right corner below numbers) */}
                  <div className="flex justify-end pt-0.5">
                    <button
                      type="button"
                      onClick={handleAddTransferNumber}
                      className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Number
                    </button>
                  </div>

                  {/* Voice Response */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label
                        className="text-xs font-semibold text-slate-700"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      >
                        Voice Response
                      </label>
                      <Tooltip text="Message the AI will speak to the caller just before transferring. Keeps the caller informed.">
                        <Info className="w-3 h-3 text-slate-400 cursor-help" />
                      </Tooltip>
                    </div>
                    <input
                      type="text"
                      value={transferVoiceResponse}
                      onChange={(e) => setTransferVoiceResponse(e.target.value)}
                      placeholder="Please hold while I transfer your call"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900 placeholder:text-slate-400 transition-colors"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                  </div>

                  {/* Transfer Reason */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label
                        className="text-xs font-semibold text-slate-700"
                        style={{ fontFamily: "DM Sans, sans-serif" }}
                      >
                        Transfer Reason
                      </label>
                      <Tooltip text="Internal note explaining why this call is being transferred. Used for context and logging.">
                        <Info className="w-3 h-3 text-slate-400 cursor-help" />
                      </Tooltip>
                    </div>
                    <textarea
                      value={transferReason}
                      onChange={(e) => setTransferReason(e.target.value)}
                      rows={2}
                      placeholder="Why this call is being transferred..."
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-slate-900 placeholder:text-slate-400 transition-colors resize-none"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* DROPDOWN: Settings Scope & Defaults */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
          <button
            type="button"
            onClick={() => setScopeDropdownOpen(!scopeDropdownOpen)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-bold text-[#222222]"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Settings Scope & Defaults
                </span>
                <Tooltip text="Choose whether these settings apply beyond this individual stage.">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                </Tooltip>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(setAsDefault || applyToCurrentProcess) && (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {setAsDefault ? "Global Default" : "Process Only"}
                </span>
              )}
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                  scopeDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {scopeDropdownOpen && (
            <div className="p-4 border-t border-slate-100 bg-[#fbfcfd] space-y-3">
              {/* Checkbox 1: Set Default */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={setAsDefault}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSetAsDefault(checked);
                    if (checked) {
                      setApplyToCurrentProcess(false);
                    }
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer accent-blue-600 shrink-0"
                />
                <span
                  className="text-xs font-semibold text-slate-800"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Set Default
                </span>
                <Tooltip text="Applicable to all stages of all processes. Whenever a new stage is configured, these settings will be applied automatically. Users can customize settings for any stage individually.">
                  <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                </Tooltip>
              </label>

              {/* Checkbox 2: Apply to All */}
              <label
                className={`flex items-center gap-2.5 cursor-pointer select-none ${
                  setAsDefault ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={applyToCurrentProcess}
                  disabled={setAsDefault}
                  onChange={(e) => setApplyToCurrentProcess(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer accent-blue-600 shrink-0"
                />
                <span
                  className="text-xs font-semibold text-slate-800"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  Apply to All
                </span>
                <Tooltip
                  text={`Apply these call trigger settings to all stages in this process only${
                    processName ? ` (${processName})` : ""
                  }.`}
                >
                  <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help transition-colors" />
                </Tooltip>
              </label>
            </div>
          )}
        </div>
      </div>
    </DrawerShell>
  );
}
