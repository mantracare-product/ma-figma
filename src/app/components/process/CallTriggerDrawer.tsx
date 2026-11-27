import React, { useState, useEffect, useMemo } from "react";
import DrawerShell from "../ui/DrawerShell";
import { useNavigate } from "react-router";
import {
  ChevronDown,
  ChevronUp,
  Info,
  Plus,
  Check,
  RotateCcw,
  Trash2,
  Play,
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
      width="max-w-3xl"
      bodyClassName="pt-3.5 px-6 pb-6 overflow-y-auto overflow-x-hidden"
      footer={
        <div className="flex items-center justify-between w-full" style={{ fontFamily: "Outfit, sans-serif" }}>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-[#1456f0] text-white hover:bg-blue-700 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3.5" style={{ fontFamily: "Outfit, sans-serif" }}>
        {/* ── Calling Numbers ── */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => setCallingNumberDropdownOpen(!callingNumberDropdownOpen)}
            className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
              callingNumberDropdownOpen ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900">Calling Numbers</span>
              <Tooltip content="The integrated number the AI agent will use to initiate or receive calls in this stage." position="top">
                <span tabIndex={0} role="button" className="inline-flex items-center text-slate-400 hover:text-slate-600 cursor-help ml-0.5">
                  <Info className="w-3.5 h-3.5" />
                </span>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                {callingNumbers.length > 1
                  ? `${callingNumbers.length} Numbers`
                  : callingNumbers[0] || "Select"}
              </span>
              {callingNumberDropdownOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {callingNumberDropdownOpen && (
            <div className="px-4 py-4 border-t border-slate-100 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Integrated numbers (Source)
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

        {/* ── Trigger Call ── */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => setTriggerDropdownOpen(!triggerDropdownOpen)}
            className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
              triggerDropdownOpen ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <span className="text-sm font-bold text-slate-900">Trigger Call</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                {timingType === "immediate" ? "Immediate" : `Wait ${waitDuration} ${waitUnit}`}
              </span>
              {triggerDropdownOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {triggerDropdownOpen && (
            <div className="px-4 py-4 border-t border-slate-100 space-y-3">
              {/* Option A: Immediately */}
              <div
                onClick={() => setTimingType("immediate")}
                className={`p-3 rounded-lg border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                  timingType === "immediate"
                    ? "border-blue-500 bg-blue-50/40"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                      timingType === "immediate"
                        ? "border-blue-600 bg-blue-600"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {timingType === "immediate" && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="text-[13px] font-medium text-slate-900">
                    Trigger Immediately
                  </span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    Default
                  </span>
                </div>
                <Tooltip content="Initiate outbound call immediately as soon as a lead enters this stage" position="left">
                  <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help" />
                </Tooltip>
              </div>

              {/* Option B: Wait Delay */}
              <div
                onClick={() => setTimingType("wait")}
                className={`p-3 rounded-lg border transition-colors cursor-pointer space-y-3 ${
                  timingType === "wait"
                    ? "border-blue-500 bg-blue-50/40"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                        timingType === "wait"
                          ? "border-blue-600 bg-blue-600"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {timingType === "wait" && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-[13px] font-medium text-slate-900">
                      Wait / Delay Before Calling
                    </span>
                  </div>
                  <Tooltip content="Wait for a specified duration after lead enters stage before placing the call" position="left">
                    <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help" />
                  </Tooltip>
                </div>

                {timingType === "wait" && (
                  <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    <div className="w-28">
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={waitDuration}
                        onChange={(e) => setWaitDuration(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                      />
                    </div>
                    <div className="flex-1">
                      <select
                        value={waitUnit}
                        onChange={(e) => setWaitUnit(e.target.value as any)}
                        className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 cursor-pointer"
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
            </div>
          )}
        </div>

        {/* ── Calling Hours ── */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => setCallingHoursDropdownOpen(!callingHoursDropdownOpen)}
            className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
              callingHoursDropdownOpen ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <span className="text-sm font-bold text-slate-900">Calling Hours</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                {callingHoursStart} – {callingHoursEnd}
              </span>
              {callingHoursDropdownOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {callingHoursDropdownOpen && (
            <div className="px-4 py-4 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 mb-1.5">
                    <span>From</span>
                    <Tooltip content="Earliest daily time outbound calls can be placed" position="top">
                      <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help" />
                    </Tooltip>
                  </label>
                  <input
                    type="time"
                    value={callingHoursStart}
                    onChange={(e) => setCallingHoursStart(e.target.value)}
                    className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 mb-1.5">
                    <span>To</span>
                    <Tooltip content="Latest daily time outbound calls can be placed" position="top">
                      <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help" />
                    </Tooltip>
                  </label>
                  <input
                    type="time"
                    value={callingHoursEnd}
                    onChange={(e) => setCallingHoursEnd(e.target.value)}
                    className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Call Duration ── */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => setCallDurationDropdownOpen(!callDurationDropdownOpen)}
            className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
              callDurationDropdownOpen ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900">Call Duration</span>
              <Tooltip content="Set the maximum call length and when the AI should start wrapping up the conversation." position="top">
                <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                {callDurationMinutes} min
              </span>
              {callDurationDropdownOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {callDurationDropdownOpen && (
            <div className="px-4 py-4 border-t border-slate-100 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 mb-1.5">
                    <span>Call duration (min)</span>
                    <Tooltip content="Maximum call duration allowed before the call automatically wraps up." position="top">
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    </Tooltip>
                  </label>
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
                    className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 mb-1.5">
                    <span>Hangup window</span>
                    <Tooltip content="During the last X minutes of total call duration, the AI proactively wraps up gracefully." position="top">
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    </Tooltip>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 whitespace-nowrap">Last</span>
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
                      className="flex-1 h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                    />
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {hangupWindowMinutes === 1 ? "min" : "mins"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Record Calls ── */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => setRecordCallsDropdownOpen(!recordCallsDropdownOpen)}
            className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
              recordCallsDropdownOpen ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900">Record Calls</span>
              <Tooltip content="Enable automated audio recording and AI transcription for calls in this stage." position="top">
                <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                {recordCalls ? "On" : "Off"}
              </span>
              {recordCallsDropdownOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {recordCallsDropdownOpen && (
            <div className="px-4 py-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 cursor-pointer">
                  <span>Enable call recording</span>
                  <Tooltip content="Audio recordings and transcripts are saved securely with the contact record. Ensure compliance with local call recording laws." position="top">
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                  </Tooltip>
                </label>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={recordCalls}
                    onChange={(e) => setRecordCalls(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 cursor-pointer" />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* ── Detect Voicemail ── */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => setDetectVoicemailDropdownOpen(!detectVoicemailDropdownOpen)}
            className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
              detectVoicemailDropdownOpen ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900">Detect Voicemail</span>
              <Tooltip content="Detect answering machines or voicemail inboxes and take appropriate actions." position="top">
                <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                {detectVoicemail ? "On" : "Off"}
              </span>
              {detectVoicemailDropdownOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {detectVoicemailDropdownOpen && (
            <div className="px-4 py-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 cursor-pointer">
                  <span>Enable voicemail detection</span>
                  <Tooltip content="Allows AI to detect answering machine greetings and disconnect or leave a voice note." position="top">
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                  </Tooltip>
                </label>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={detectVoicemail}
                    onChange={(e) => setDetectVoicemail(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 cursor-pointer" />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* ── AI Model & Voice Settings ── */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => setAiModelDropdownOpen(!aiModelDropdownOpen)}
            className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
              aiModelDropdownOpen ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900">AI Model & Voice Settings</span>
              <Tooltip content="Fine-tune the AI agent's LLM model, voice profile, speed, tone, and conversational style." position="top">
                <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
              </Tooltip>
            </div>
            {aiModelDropdownOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {aiModelDropdownOpen && (
            <div className="px-4 py-4 border-t border-slate-100 space-y-4">
              {/* 1. AI Model */}
              <div>
                <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 mb-1.5">
                  <span>AI model</span>
                  <Tooltip content="Select the underlying LLM that powers conversational logic." position="top">
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                  </Tooltip>
                </label>
                <select
                  value={selectedAIModel}
                  onChange={(e) => {
                    if (e.target.value === "__view_more_models__") {
                      navigate("/settings?tab=voice-config&sub=models");
                      return;
                    }
                    setSelectedAIModel(e.target.value);
                  }}
                  className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
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
              </div>

              {/* 2. Voice Engine */}
              <div>
                <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 mb-1.5">
                  <span>Voice engine</span>
                  <Tooltip content="Select synthesized voice profile and test audio preview." position="top">
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                  </Tooltip>
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={stageVoice}
                    onChange={(e) => {
                      if (e.target.value === "__view_more_voices__") {
                        navigate("/settings?tab=voice-config&sub=voices");
                        return;
                      }
                      setStageVoice(e.target.value);
                    }}
                    className="flex-1 h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
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
                    className="h-10 inline-flex items-center gap-1.5 px-3 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition-colors cursor-pointer shrink-0"
                  >
                    <Play className="w-3 h-3 text-slate-600" />
                    <span>Test</span>
                  </button>
                </div>
              </div>

              {/* 3. Speech Speed */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700">
                    <span>Speech speed</span>
                    <Tooltip content="Adjust the cadence and pacing of AI speech output." position="top">
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    </Tooltip>
                  </label>
                  <span className="text-xs font-medium text-slate-600">
                    {stageVoiceSpeed.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={stageVoiceSpeed}
                  onChange={(e) => setStageVoiceSpeed(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex items-center justify-between text-[10px] font-medium text-slate-400">
                  <span>Slow (0.5x)</span>
                  <span>Natural (1.0x)</span>
                  <span>Fast (1.5x)</span>
                </div>
              </div>

              {/* 4. Tone & 5. Style */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 mb-1.5">
                    <span>Tone</span>
                    <Tooltip content="Set the emotional tone and demeanor of the AI agent during conversations." position="top">
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    </Tooltip>
                  </label>
                  <select
                    value={stageTone}
                    onChange={(e) => setStageTone(e.target.value)}
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
                  >
                    <option value="Professional">Professional</option>
                    <option value="Friendly">Friendly</option>
                    <option value="Empathetic">Empathetic</option>
                    <option value="Casual">Casual</option>
                    <option value="Persuasive">Persuasive</option>
                    <option value="Authoritative">Authoritative</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 mb-1.5">
                    <span>Style</span>
                    <Tooltip content="Define how verbose or concise the AI's verbal responses should be." position="top">
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    </Tooltip>
                  </label>
                  <select
                    value={stageStyle}
                    onChange={(e) => setStageStyle(e.target.value)}
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
                  >
                    <option value="Balanced">Balanced</option>
                    <option value="Concise">Concise</option>
                    <option value="Detailed">Detailed</option>
                    <option value="Warm">Warm</option>
                    <option value="Expressive">Expressive</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Call Retries Settings ── */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => setRetryRulesDropdownOpen(!retryRulesDropdownOpen)}
            className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
              retryRulesDropdownOpen ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900">Call Retries Settings</span>
              <Tooltip content="Automatically retry calling if the call fails." position="top">
                <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                {retryRulesEnabled ? "On" : "Off"}
              </span>
              {retryRulesDropdownOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {retryRulesDropdownOpen && (
            <div className="px-4 py-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 cursor-pointer">
                  <span>Enable retry rules</span>
                  <Tooltip content="If call fails, automatically retry calling based on rules configured below." position="top">
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                  </Tooltip>
                </label>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={retryRulesEnabled}
                    onChange={(e) => setRetryRulesEnabled(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 cursor-pointer" />
                </label>
              </div>

              {retryRulesEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                      Retry attempts
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={retryAttempts}
                      onChange={(e) => setRetryAttempts(parseInt(e.target.value) || 1)}
                      className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                      Delay between retries (min)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={retryDelay}
                      onChange={(e) => setRetryDelay(parseInt(e.target.value) || 1)}
                      className="w-full h-10 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Transfer Call ── */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => setTransferCallDropdownOpen(!transferCallDropdownOpen)}
            className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
              transferCallDropdownOpen ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900">Transfer Call</span>
              <Tooltip content="Configure automatic call transfer to a human agent or AI agent." position="top">
                <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                {transferCallEnabled ? "On" : "Off"}
              </span>
              {transferCallDropdownOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {transferCallDropdownOpen && (
            <div className="px-4 py-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 cursor-pointer">
                  <span>Enable transfer call</span>
                  <Tooltip content="When enabled, the AI will transfer the call to the configured destination." position="top">
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                  </Tooltip>
                </label>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={transferCallEnabled}
                    onChange={(e) => setTransferCallEnabled(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 cursor-pointer" />
                </label>
              </div>

              {transferCallEnabled && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium text-slate-700">Transfer numbers</span>
                      <Tooltip content="First we try the number marked as Primary. If busy or skipped, the call transfers to the next number in order." position="top">
                        <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                      </Tooltip>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddTransferNumber}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 bg-white border border-blue-200 rounded-md transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add number</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {transferNumbers.map((num) => (
                      <div
                        key={num.id}
                        className={`p-3.5 bg-slate-50/30 border rounded-lg space-y-3 transition-colors ${
                          num.isPrimary ? "border-blue-300" : "border-slate-200"
                        }`}
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                              Country code
                            </label>
                            <select
                              value={num.countryCode}
                              onChange={(e) => handleUpdateTransferNumber(num.id, { countryCode: e.target.value })}
                              className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 cursor-pointer"
                            >
                              {COUNTRY_CODES.map((c) => (
                                <option key={c.value} value={c.value}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="block text-[13px] font-medium text-slate-700">
                                Phone number
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
                              className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 placeholder:text-slate-400"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-medium text-slate-700">Set as primary number</span>
                            <Tooltip content="The number marked as Primary will be tried first. If busy or unanswered, the call fails over to the next number." position="top">
                              <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
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
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 cursor-pointer" />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 mb-1.5">
                      <span>Voice response</span>
                      <Tooltip content="Message the AI will speak to the caller just before transferring." position="top">
                        <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                      </Tooltip>
                    </label>
                    <input
                      type="text"
                      value={transferVoiceResponse}
                      onChange={(e) => setTransferVoiceResponse(e.target.value)}
                      placeholder="Please hold while I transfer your call"
                      className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700 mb-1.5">
                      <span>Transfer reason</span>
                      <Tooltip content="Internal note explaining why this call is being transferred. Used for context and logging." position="top">
                        <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                      </Tooltip>
                    </label>
                    <textarea
                      value={transferReason}
                      onChange={(e) => setTransferReason(e.target.value)}
                      rows={2}
                      placeholder="Why this call is being transferred..."
                      className="w-full p-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Settings Scope & Defaults ── */}
        <div className="border border-slate-200 rounded-lg bg-white">
          <button
            type="button"
            onClick={() => setScopeDropdownOpen(!scopeDropdownOpen)}
            className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer ${
              scopeDropdownOpen ? "rounded-t-lg" : "rounded-lg"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900">Settings Scope & Defaults</span>
              <Tooltip content="Choose whether these settings apply beyond this individual stage." position="top">
                <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              {(setAsDefault || applyToCurrentProcess) && (
                <span className="text-xs font-medium text-slate-500">
                  {setAsDefault ? "Global Default" : "Process Only"}
                </span>
              )}
              {scopeDropdownOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {scopeDropdownOpen && (
            <div className="px-4 py-4 border-t border-slate-100 space-y-3">
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
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer shrink-0"
                />
                <span className="text-[13px] font-medium text-slate-700">Set default</span>
                <Tooltip content="Applicable to all stages of all processes. Whenever a new stage is configured, these settings will be applied automatically." position="top">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                </Tooltip>
              </label>

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
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer shrink-0"
                />
                <span className="text-[13px] font-medium text-slate-700">Apply to all</span>
                <Tooltip
                  content={`Apply these call trigger settings to all stages in this process only${
                    processName ? ` (${processName})` : ""
                  }.`}
                  position="top"
                >
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                </Tooltip>
              </label>
            </div>
          )}
        </div>
      </div>
    </DrawerShell>
  );
}
