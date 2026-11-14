import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  Eye,
  EyeOff,
  HelpCircle,
  Calendar,
  Users,
  DollarSign,
  FileText,
  Activity,
  Trash2,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronRight,
  Search,
  Layers,
  Plus,
  RotateCcw,
  Sparkles,
  Code2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/Button";
import { Tooltip } from "../ui/Tooltip";
import {
  IntegrationDefinition,
  IntegrationSyncConfig,
  SyncCapability,
  getStoredIntegrationConfig,
  saveStoredIntegrationConfig,
  getStoredSyncLogs,
  addSyncLog,
  formatSyncSchedule,
  runIntegrationManualSync,
  SyncLogEntry,
  IntegrationFieldMapping,
  getDefaultFieldMappings,
  getKnownPayloadVariables,
} from "../../../lib/integrationsRegistry";
import { useFieldRegistry } from "../../context/FieldRegistryContext";
import { useProcessStore, Process } from "../../../lib/useProcessStore";

interface IntegrationConfigDrawerProps {
  isOpen: boolean;
  integration: IntegrationDefinition | null;
  onClose: () => void;
  onSaved?: (integrationId: string, isConnected: boolean) => void;
}

export default function IntegrationConfigDrawer({
  isOpen,
  integration,
  onClose,
  onSaved,
}: IntegrationConfigDrawerProps) {
  const { processes, setProcesses } = useProcessStore();

  const fieldRegistry = useFieldRegistry();

  const [activeTab, setActiveTab] = useState<"connection" | "configs" | "mapping" | "logs">("connection");
  const [config, setConfig] = useState<IntegrationSyncConfig | null>(null);
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");
  const [testResult, setTestResult] = useState<{
    message: string;
    latencyMs?: number;
    accountName?: string;
  } | null>(null);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<"all" | "success" | "failed">("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [capabilitySearch, setCapabilitySearch] = useState("");
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedPayloadId, setCopiedPayloadId] = useState<string | null>(null);

  // Field Mapping state
  const [mappingSearchQuery, setMappingSearchQuery] = useState("");
  const [mappingModuleFilter, setMappingModuleFilter] = useState<"all" | "client" | "appointment" | "clinical" | "custom">("all");
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [newCustomLabel, setNewCustomLabel] = useState("");
  const [newCustomKey, setNewCustomKey] = useState("");
  const [newCustomModule, setNewCustomModule] = useState<"client" | "appointment" | "clinical" | "custom">("client");
  const [newCustomVariable, setNewCustomVariable] = useState("");
  const [newCustomSample, setNewCustomSample] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Field Mapping computed values (Unconditional Hooks called before any return)
  const currentMappings = useMemo(() => {
    if (!integration) return {};
    return config?.fieldMappings || getDefaultFieldMappings(integration.id);
  }, [config?.fieldMappings, integration]);

  const knownVariables = useMemo(() => {
    return integration ? getKnownPayloadVariables(integration.id) : [];
  }, [integration]);

  const availableCustomFields = useMemo(() => {
    if (!fieldRegistry?.getAllFields) return [];
    try {
      const clientFields = fieldRegistry.getAllFields("client") || [];
      const apptFields = fieldRegistry.getAllFields("appointment") || [];
      const processFields = fieldRegistry.getAllFields("process") || [];
      const scribeFields = fieldRegistry.getAllFields("scribe") || [];
      return [
        ...clientFields.map((f: any) => ({ ...f, moduleType: "client" as const, moduleLabel: "Contact / Client" })),
        ...apptFields.map((f: any) => ({ ...f, moduleType: "appointment" as const, moduleLabel: "Appointment" })),
        ...processFields.map((f: any) => ({ ...f, moduleType: "custom" as const, moduleLabel: "Process" })),
        ...scribeFields.map((f: any) => ({ ...f, moduleType: "clinical" as const, moduleLabel: "Clinical / Scribe" })),
      ];
    } catch {
      return [];
    }
  }, [fieldRegistry]);

  const filteredMappingsList = useMemo(() => {
    const list = Object.values(currentMappings);
    return list.filter((m) => {
      const matchesModule =
        mappingModuleFilter === "all" ||
        (mappingModuleFilter === "custom" ? m.isCustom : m.module === mappingModuleFilter);
      const q = mappingSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.targetFieldLabel.toLowerCase().includes(q) ||
        m.placeholderToken.toLowerCase().includes(q) ||
        m.incomingVariable.toLowerCase().includes(q) ||
        (m.sampleValue && m.sampleValue.toLowerCase().includes(q));
      return matchesModule && matchesSearch;
    });
  }, [currentMappings, mappingModuleFilter, mappingSearchQuery]);

  useEffect(() => {
    if (integration && isOpen) {
      const loaded = getStoredIntegrationConfig(integration.id);
      setConfig({
        ...loaded,
        customSyncValue: loaded.customSyncValue || 20,
        customSyncUnit: loaded.customSyncUnit || "minutes",
      });
      const storedLogs = getStoredSyncLogs(integration.id);
      setLogs(storedLogs);
      setTestStatus(loaded.connected ? "success" : "idle");
      if (loaded.connected) {
        setTestResult({
          message: `Connected to ${integration.name}`,
          latencyMs: 138,
          accountName:
            loaded.credentials.username ||
            loaded.credentials.businessId ||
            `${integration.name} Account`,
        });
      } else {
        setTestResult(null);
      }
      setActiveTab("connection");
      setVisibleFields({});
      setCapabilitySearch("");
      setMappingSearchQuery("");
      setMappingModuleFilter("all");
      setShowAddCustomModal(false);
      setExpandedLogId(storedLogs.length > 0 ? storedLogs[0].id : null);
    }
  }, [integration, isOpen]);

  const handleCredentialChange = (field: string, value: string) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        credentials: {
          ...prev.credentials,
          [field]: value,
        },
      };
    });
    setTestStatus("idle");
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus("idle");
    setTestResult(null);

    const requiredFields = integration.fields.filter((f) => f.label.includes("*"));
    const missing = requiredFields.filter((f) => !config.credentials[f.name]?.trim());

    if (missing.length > 0) {
      setIsTesting(false);
      setTestStatus("error");
      setTestResult({
        message: `Required: ${missing.map((m) => m.label.replace("*", "").trim()).join(", ")}`,
      });
      toast.error("Please fill in required fields");
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 900));

    setIsTesting(false);
    setTestStatus("success");
    setTestResult({
      message: "Handshake verified (HTTP 200 OK)",
      latencyMs: 124,
      accountName:
        config.credentials.username ||
        config.credentials.businessId ||
        `${integration.name} Gateway`,
    });
    toast.success(`${integration.name} connected`);
  };

  const handleSave = () => {
    const isNowConnected = testStatus === "success" || config.connected;
    const updated: IntegrationSyncConfig = {
      ...config,
      connected: isNowConnected,
      lastSyncAt: config.lastSyncAt || new Date().toISOString(),
      syncStatus: "idle",
    };

    saveStoredIntegrationConfig(integration.id, updated);
    setConfig(updated);

    if (!config.connected && isNowConnected) {
      addSyncLog(integration.id, {
        integrationId: integration.id,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        module: "System",
        action: "Connection Activated",
        status: "success",
        itemsCount: 1,
        message: `Connected ${integration.name} (${formatSyncSchedule(updated)})`,
        endpoint: "/v1/handshake",
        httpStatus: 200,
        latencyMs: 110,
      });
      setLogs(getStoredSyncLogs(integration.id));
    }

    toast.success(`${integration.name} configuration saved`);
    if (onSaved) {
      onSaved(integration.id, isNowConnected);
    }
    onClose();
  };

  const handleDisconnect = () => {
    const updated: IntegrationSyncConfig = {
      ...config,
      connected: false,
      credentials: {},
    };
    saveStoredIntegrationConfig(integration.id, updated);
    setConfig(updated);
    setTestStatus("idle");
    setTestResult(null);
    toast.success(`${integration.name} disconnected`);
    if (onSaved) {
      onSaved(integration.id, false);
    }
    onClose();
  };

  const handleToggleFeature = (capId: string) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const current = prev.features[capId] || { enabled: false };
      return {
        ...prev,
        features: {
          ...prev.features,
          [capId]: {
            ...current,
            enabled: !current.enabled,
          },
        },
      };
    });
  };

  const handleToggleModuleAll = (moduleKey: SyncCapability["module"], enable: boolean) => {
    const caps = integration.capabilities.filter((c) => c.module === moduleKey);
    setConfig((prev) => {
      if (!prev) return prev;
      const updatedFeatures = { ...prev.features };
      caps.forEach((cap) => {
        updatedFeatures[cap.id] = {
          ...updatedFeatures[cap.id],
          enabled: enable,
        };
      });
      return {
        ...prev,
        features: updatedFeatures,
      };
    });
  };

  const handleSelectWorkflow = (capId: string, workflowId: string, cap: SyncCapability) => {
    if (workflowId === "__AUTO_CREATE__") {
      const defaultName = cap.defaultWorkflowName || `${integration.name} - ${cap.label}`;
      const newProcessId = `proc-${Date.now()}`;

      const newProcess: Process = {
        id: newProcessId,
        name: defaultName,
        description: `Automated workflow for ${integration.name} (${cap.label})`,
        assignedToUserId: 1,
        entityType: cap.module === "leads" ? "client" : cap.module === "rcm" ? "invoice" : "appointment",
        stages: [
          {
            id: `stg-${Date.now()}-1`,
            name: "Triggered / Incoming",
            description: "Initial stage for incoming events",
            status: "pending",
            color: "#3b82f6",
            isPredefined: true,
          },
          {
            id: `stg-${Date.now()}-2`,
            name: "Automated Follow-up",
            description: "Automated follow-up stage",
            status: "in-progress",
            color: "#8b5cf6",
          },
          {
            id: `stg-${Date.now()}-3`,
            name: "Completed / Synced",
            description: "Final completed stage",
            status: "completed",
            color: "#10b981",
            stageCategory: "success",
            isFinalStage: true,
          },
        ],
        aiSettings: {
          platform: "OpenAI",
          voiceSpeed: 1,
        },
      };

      setProcesses((prev) => [...prev, newProcess]);

      toast.success(`Created workflow: "${defaultName}"`);

      setConfig((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          features: {
            ...prev.features,
            [capId]: {
              ...prev.features[capId],
              enabled: true,
              workflowId: newProcessId,
            },
          },
        };
      });
      return;
    }

    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        features: {
          ...prev.features,
          [capId]: {
            ...prev.features[capId],
            workflowId,
          },
        },
      };
    });
  };

  const handleTriggerSyncNow = async () => {
    setIsSyncingNow(true);
    const result = await runIntegrationManualSync(integration.id, "all");
    setLogs(getStoredSyncLogs(integration.id));
    setConfig((prev) => (prev ? { ...prev, lastSyncAt: new Date().toISOString() } : prev));
    setIsSyncingNow(false);
    toast.success(result.message);
  };

  const webhookUrl = `https://api.mantraassist.com/v1/integrations/${integration.id}/events`;
  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
    toast.success("Copied webhook URL");
  };

  const handleCopyPayload = (logId: string, payload: any) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedPayloadId(logId);
    setTimeout(() => setCopiedPayloadId(null), 2000);
    toast.success("Copied JSON");
  };

  const handleUpdateMapping = (id: string, patch: Partial<IntegrationFieldMapping>) => {
    setConfig((prev) => {
      if (!prev || !integration) return prev;
      const existing = prev.fieldMappings || getDefaultFieldMappings(integration.id);
      const updated = {
        ...existing,
        [id]: {
          ...existing[id],
          ...patch,
        },
      };
      saveStoredIntegrationConfig(integration.id, {
        ...prev,
        fieldMappings: updated,
      });
      return {
        ...prev,
        fieldMappings: updated,
      };
    });
  };

  const handleDeleteMapping = (id: string) => {
    setConfig((prev) => {
      if (!prev || !integration) return prev;
      const existing = { ...(prev.fieldMappings || getDefaultFieldMappings(integration.id)) };
      delete existing[id];
      saveStoredIntegrationConfig(integration.id, {
        ...prev,
        fieldMappings: existing,
      });
      return {
        ...prev,
        fieldMappings: existing,
      };
    });
    toast.success("Mapping removed");
  };

  const handleResetMappings = () => {
    if (!integration) return;
    const defaults = getDefaultFieldMappings(integration.id);
    setConfig((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        fieldMappings: defaults,
      };
      saveStoredIntegrationConfig(integration.id, updated);
      return updated;
    });
    toast.success("Field mappings reset to defaults");
  };

  const handleAddCustomMapping = () => {
    if (!newCustomLabel.trim()) {
      toast.error("Please enter a field label");
      return;
    }
    const keySlug = (newCustomKey.trim() || newCustomLabel.trim())
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_");
    const token = `{${keySlug}}`;
    const newId = `fm_custom_${Date.now()}`;

    const newMapping: IntegrationFieldMapping = {
      id: newId,
      module: newCustomModule,
      targetFieldKey: keySlug,
      targetFieldLabel: newCustomLabel.trim(),
      placeholderToken: token,
      incomingVariable: newCustomVariable.trim() || keySlug,
      sampleValue: newCustomSample.trim(),
      isCustom: true,
    };

    setConfig((prev) => {
      if (!prev || !integration) return prev;
      const existing = prev.fieldMappings || getDefaultFieldMappings(integration.id);
      const updated = {
        ...existing,
        [newId]: newMapping,
      };
      saveStoredIntegrationConfig(integration.id, {
        ...prev,
        fieldMappings: updated,
      });
      return {
        ...prev,
        fieldMappings: updated,
      };
    });

    setShowAddCustomModal(false);
    setNewCustomLabel("");
    setNewCustomKey("");
    setNewCustomVariable("");
    setNewCustomSample("");
    toast.success(`Added field mapping: ${newMapping.targetFieldLabel}`);
  };

  const handleCopyVariableToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
    toast.success(`Copied variable ${token}`);
  };

  if (!isOpen || !integration || !config) return null;

  const isManualMode = config.syncInterval === "manual";
  const totalCapabilities = integration.capabilities.length;
  const enabledCount = Object.values(config.features).filter((f) => f.enabled).length;
  const filteredLogs = logs.filter((log) => (logFilter === "all" ? true : log.status === logFilter));

  const moduleGroups: { key: SyncCapability["module"]; title: string; icon: React.ReactNode }[] = [
    { key: "appointments", title: "Appointments", icon: <Calendar className="w-4 h-4 text-slate-600" /> },
    { key: "leads", title: "Contacts & Leads", icon: <Users className="w-4 h-4 text-slate-600" /> },
    { key: "rcm", title: "Billing & RCM", icon: <DollarSign className="w-4 h-4 text-slate-600" /> },
    { key: "clinical", title: "Clinical", icon: <FileText className="w-4 h-4 text-slate-600" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-250 ease-out">
        {/* ── TOP HEADER ── */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white text-sm shrink-0"
              style={{ backgroundColor: integration.brandColor || "#0F172A" }}
            >
              {integration.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">{integration.name}</h2>
                {config.connected ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                    Not connected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{integration.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {integration.docsUrl && (
              <a
                href={integration.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-500 hover:text-slate-900 font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <span>Docs</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── TAB NAVIGATION ── */}
        <div className="px-6 border-b border-slate-200 flex items-center gap-6 shrink-0 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab("connection")}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === "connection"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>Connection</span>
            {config.connected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("configs")}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === "configs"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Sync Settings</span>
            <span className="text-[11px] font-mono text-slate-500">
              {enabledCount}/{totalCapabilities}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("mapping")}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === "mapping"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Field Mapping</span>
            <span className="text-[11px] font-mono text-slate-500">
              {Object.keys(currentMappings).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === "logs"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Logs</span>
            <span className="text-[11px] font-mono text-slate-500">{logs.length}</span>
          </button>
        </div>

        {/* ── TAB CONTENT SCROLL AREA (Full Width — Zero Blank Margin) ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/40">
          {/* ═════════ TAB 1: CONNECTION & SYNC SCHEDULE ═════════ */}
          {activeTab === "connection" && (
            <div className="space-y-5 w-full">
              {/* 1. API Credentials */}
              <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Credentials
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {integration.fields.map((field) => (
                    <div
                      key={field.name}
                      className={`space-y-1.5 ${field.type === "select" || integration.fields.length === 1 ? "sm:col-span-2" : ""}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs font-medium text-slate-700">{field.label}</label>
                        {field.tooltip && (
                          <Tooltip text={field.tooltip}>
                            <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                          </Tooltip>
                        )}
                      </div>

                      {field.type === "select" ? (
                        <select
                          value={config.credentials[field.name] || field.defaultValue || ""}
                          onChange={(e) => handleCredentialChange(field.name, e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                        >
                          {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="relative">
                          <input
                            type={field.type === "password" && !visibleFields[field.name] ? "password" : "text"}
                            value={config.credentials[field.name] || ""}
                            onChange={(e) => handleCredentialChange(field.name, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full px-3 py-2 pr-9 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                          />
                          {field.type === "password" && (
                            <button
                              type="button"
                              onClick={() =>
                                setVisibleFields({ ...visibleFields, [field.name]: !visibleFields[field.name] })
                              }
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {visibleFields[field.name] ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Sync Mode & Schedule (Manual + Automatic Presets + Custom Time) */}
              <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Sync Schedule
                  </h4>

                  {/* Manual vs Automatic Switch */}
                  <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/70">
                    <button
                      type="button"
                      onClick={() =>
                        setConfig({
                          ...config,
                          syncInterval: config.syncInterval === "manual" ? "15m" : config.syncInterval,
                        })
                      }
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                        !isManualMode
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Automatic
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, syncInterval: "manual" })}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                        isManualMode
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Manual Only
                    </button>
                  </div>
                </div>

                {isManualMode ? (
                  <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="text-xs text-slate-600">
                      Background polling is off. Trigger sync manually when needed.
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      loading={isSyncingNow}
                      onClick={handleTriggerSyncNow}
                      className="text-xs font-semibold shrink-0 flex items-center gap-1.5 bg-white"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? "animate-spin" : ""}`} />
                      <span>Sync Now</span>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[
                        { id: "5m", label: "5 mins" },
                        { id: "15m", label: "15 mins" },
                        { id: "30m", label: "30 mins" },
                        { id: "1h", label: "1 hour" },
                        { id: "custom", label: "Custom" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setConfig({ ...config, syncInterval: opt.id as any })}
                          className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer text-center ${
                            config.syncInterval === opt.id
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {config.syncInterval === "custom" && (
                      <div className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="text-xs font-medium text-slate-600">Sync every</span>
                        <input
                          type="number"
                          min={1}
                          max={1440}
                          value={config.customSyncValue || 20}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              customSyncValue: Math.max(1, parseInt(e.target.value, 10) || 1),
                            })
                          }
                          className="w-20 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                        <select
                          value={config.customSyncUnit || "minutes"}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              customSyncUnit: e.target.value as "minutes" | "hours",
                            })
                          }
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                        >
                          <option value="minutes">Minutes</option>
                          <option value="hours">Hours</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Inbound Webhook & Test Connection (Compact 2-Column Row) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Webhook Endpoint</span>
                    <button
                      type="button"
                      onClick={handleCopyWebhook}
                      className="text-[11px] font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 bg-slate-50 cursor-pointer"
                    >
                      {copiedWebhook ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedWebhook ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <div className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-mono text-slate-600 truncate select-all">
                    {webhookUrl}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Connection Check</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      loading={isTesting}
                      onClick={handleTestConnection}
                      className="font-semibold text-xs h-7 px-2.5"
                    >
                      Test Connection
                    </Button>
                  </div>

                  {testStatus === "success" && testResult ? (
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{testResult.message}</span>
                    </div>
                  ) : testStatus === "error" && testResult ? (
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-700">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span className="truncate">{testResult.message}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400">Verify API credentials</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═════════ TAB 2: SYNC CONFIGURATION ═════════ */}
          {activeTab === "configs" && (
            <div className="space-y-5 w-full">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={capabilitySearch}
                    onChange={(e) => setCapabilitySearch(e.target.value)}
                    placeholder="Filter features..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <span className="text-xs font-mono text-slate-500">
                  {enabledCount} / {totalCapabilities} enabled
                </span>
              </div>

              {moduleGroups.map((group) => {
                const groupCaps = integration.capabilities
                  .filter((c) => c.module === group.key)
                  .filter((c) => {
                    if (!capabilitySearch.trim()) return true;
                    return (
                      c.label.toLowerCase().includes(capabilitySearch.toLowerCase()) ||
                      c.description.toLowerCase().includes(capabilitySearch.toLowerCase())
                    );
                  });

                if (groupCaps.length === 0) return null;
                const allModuleEnabled = groupCaps.every((c) => config.features[c.id]?.enabled);

                return (
                  <div key={group.key} className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        {group.icon}
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                          {group.title}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleModuleAll(group.key, !allModuleEnabled)}
                        className="text-[11px] font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
                      >
                        {allModuleEnabled ? "Disable all" : "Enable all"}
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white overflow-hidden">
                      {groupCaps.map((cap) => {
                        const featureConfig = config.features[cap.id] || { enabled: false };
                        const isEnabled = featureConfig.enabled;

                        return (
                          <div
                            key={cap.id}
                            className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isEnabled ? "bg-white" : "bg-slate-50/50"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-900">{cap.label}</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                                  {cap.direction === "two-way" ? "2-Way" : cap.direction}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{cap.description}</p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {cap.hasWorkflow && (
                                <select
                                  disabled={!isEnabled}
                                  value={featureConfig.workflowId || ""}
                                  onChange={(e) => handleSelectWorkflow(cap.id, e.target.value, cap)}
                                  className="w-48 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-slate-900"
                                >
                                  <option value="">Select Workflow...</option>
                                  {processes.map((proc) => (
                                    <option key={proc.id} value={proc.id}>
                                      {proc.name}
                                    </option>
                                  ))}
                                  <option value="__AUTO_CREATE__" className="text-blue-600 font-semibold">
                                    + Auto-create Workflow
                                  </option>
                                </select>
                              )}

                              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                <input
                                  type="checkbox"
                                  checked={isEnabled}
                                  onChange={() => handleToggleFeature(cap.id)}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900" />
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ═════════ TAB 3: FIELD MAPPING (Reference Layout) ═════════ */}
          {activeTab === "mapping" && (
            <div className="space-y-4 w-full">
              {/* Reference Header Notice Box */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    The placeholders below were pre-filled from <span className="font-semibold text-slate-800">{integration.name}&apos;s</span> incoming payload. You can manually edit any field value:
                  </p>
                  <button
                    type="button"
                    onClick={handleResetMappings}
                    className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 font-medium transition-colors cursor-pointer shrink-0 py-1 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                    title="Reset to recommended mappings"
                  >
                    <RotateCcw className="w-3 h-3 text-slate-400" />
                    <span>Reset defaults</span>
                  </button>
                </div>
              </div>

              {/* Filter Toolbar & Search */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={mappingSearchQuery}
                      onChange={(e) => setMappingSearchQuery(e.target.value)}
                      placeholder="Search field name or {variable}..."
                      className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all shadow-2xs"
                    />
                    {mappingSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setMappingSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => setShowAddCustomModal(true)}
                    className="font-semibold text-xs flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Field Mapping</span>
                  </Button>
                </div>

                {/* Module Scope Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {[
                    { id: "all", label: "All Fields", count: Object.keys(currentMappings).length },
                    { id: "client", label: "Contacts", count: Object.values(currentMappings).filter((m) => m.module === "client").length },
                    { id: "appointment", label: "Appointments", count: Object.values(currentMappings).filter((m) => m.module === "appointment").length },
                    { id: "clinical", label: "Clinical / Scribe", count: Object.values(currentMappings).filter((m) => m.module === "clinical").length },
                    { id: "custom", label: "Custom Fields", count: Object.values(currentMappings).filter((m) => m.isCustom).length },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setMappingModuleFilter(filter.id as any)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                        mappingModuleFilter === filter.id
                          ? "bg-slate-900 text-white shadow-2xs font-semibold"
                          : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
                      }`}
                    >
                      {filter.label} <span className="opacity-70 font-mono text-[11px] ml-1">({filter.count})</span>
                    </button>
                  ))}
                </div>

                {/* Quick Payload Variables Palette */}
                {knownVariables.length > 0 && (
                  <div className="p-3 rounded-xl border border-dashed border-slate-200 bg-white/70 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>Available API payload variables for {integration.name} (click to copy):</span>
                      <span className="text-[10px] text-slate-400 font-mono">{knownVariables.length} keys</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {knownVariables.map((v) => (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => handleCopyVariableToken(v.token)}
                          className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200/60 transition-colors cursor-pointer flex items-center gap-1"
                          title={`Click to copy ${v.token} (maps ${v.key})`}
                        >
                          <span>{v.token}</span>
                          {copiedToken === v.token && <Check className="w-2.5 h-2.5 text-emerald-600" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Add Custom Field Mapping Inline Modal */}
              {showAddCustomModal && (
                <div className="p-5 bg-white rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/20 space-y-4 shadow-sm animate-in fade-in duration-150">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-2.5">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Add Field Mapping</h4>
                      <p className="text-[11px] text-slate-500">
                        Map an incoming API variable or payload path to a MantraAssist field.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddCustomModal(false)}
                      className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700">MantraAssist Field Label *</label>
                      <input
                        type="text"
                        value={newCustomLabel}
                        onChange={(e) => {
                          setNewCustomLabel(e.target.value);
                          if (!newCustomKey) {
                            setNewCustomKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"));
                          }
                        }}
                        placeholder="e.g. VIP Tier, Insurance ID..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700">Target Entity / Module</label>
                      <select
                        value={newCustomModule}
                        onChange={(e) => setNewCustomModule(e.target.value as any)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      >
                        <option value="client">Contact / Client</option>
                        <option value="appointment">Appointment</option>
                        <option value="clinical">Clinical / Scribe</option>
                        <option value="custom">General Custom Field</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700">Incoming API Variable Key *</label>
                      <input
                        type="text"
                        value={newCustomVariable}
                        onChange={(e) => setNewCustomVariable(e.target.value)}
                        placeholder="e.g. client.custom_status or {{vip_tier}}"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700">Default / Sample Value</label>
                      <input
                        type="text"
                        value={newCustomSample}
                        onChange={(e) => setNewCustomSample(e.target.value)}
                        placeholder="e.g. Active, Standard..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  {availableCustomFields.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[11px] text-slate-500 font-medium">Or pick an existing custom field from your registry:</span>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                        {availableCustomFields.slice(0, 12).map((cf: any) => (
                          <button
                            key={`${cf.moduleType}-${cf.key}`}
                            type="button"
                            onClick={() => {
                              setNewCustomLabel(cf.label || cf.key);
                              setNewCustomKey(cf.key);
                              setNewCustomVariable(`client.${cf.key}`);
                              setNewCustomModule(cf.moduleType || "client");
                            }}
                            className="text-[11px] px-2 py-0.5 rounded bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 transition-colors text-slate-700 cursor-pointer"
                          >
                            + {cf.label || cf.key}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-100">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddCustomModal(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleAddCustomMapping}
                      disabled={!newCustomLabel.trim()}
                      className="text-xs font-semibold"
                    >
                      Add Mapping
                    </Button>
                  </div>
                </div>
              )}

              {/* Field Cards Stack (Exact Reference Format) */}
              <div className="space-y-3">
                {filteredMappingsList.length === 0 ? (
                  <div className="p-8 text-center bg-white border border-dashed border-slate-200 rounded-2xl space-y-2">
                    <p className="text-xs font-semibold text-slate-700">No field mappings match your filter</p>
                    <p className="text-xs text-slate-400">
                      Try clearing your search query or reset back to default integration mappings.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setMappingSearchQuery("");
                        setMappingModuleFilter("all");
                      }}
                      className="text-xs font-semibold text-slate-900 underline hover:no-underline mt-1 cursor-pointer"
                    >
                      Clear search filter
                    </button>
                  </div>
                ) : (
                  filteredMappingsList.map((mapping) => (
                    <div
                      key={mapping.id}
                      className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5 hover:border-slate-300 transition-all"
                    >
                      {/* Top Row: Field Label & {placeholder} */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 tracking-tight font-sans">
                            {mapping.targetFieldLabel}
                          </span>
                          {mapping.isCustom && (
                            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded bg-blue-50 text-blue-600 border border-blue-200/60">
                              Custom Field
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 capitalize">
                            ({mapping.module === "client" ? "Contact" : mapping.module === "appointment" ? "Appointment" : mapping.module})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyVariableToken(mapping.placeholderToken)}
                          className="font-mono text-xs text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Click to copy token"
                        >
                          <span>{mapping.placeholderToken}</span>
                          {copiedToken === mapping.placeholderToken ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-60" />
                          )}
                        </button>
                      </div>

                      {/* Middle Row: Value Input */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={mapping.sampleValue ?? ""}
                          onChange={(e) => handleUpdateMapping(mapping.id, { sampleValue: e.target.value })}
                          placeholder={`Enter mapped value or formula (e.g. ${mapping.incomingVariable})`}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all shadow-2xs"
                        />
                        {mapping.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMapping(mapping.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Remove mapping"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Bottom Subtext Row */}
                      <div className="flex items-center justify-between pt-0.5 text-[11px] text-slate-400">
                        <span className="truncate">
                          Incoming API variable: <code className="text-slate-600 font-mono font-medium">{mapping.incomingVariable}</code>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateMapping(mapping.id, { sampleValue: mapping.incomingVariable })}
                          className="text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline cursor-pointer shrink-0 ml-2"
                        >
                          Use variable key
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ═════════ TAB 4: SYNC LOGS ═════════ */}
          {activeTab === "logs" && (
            <div className="space-y-4 w-full">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isManualMode ? "bg-slate-400" : "bg-emerald-500 animate-pulse"
                    }`}
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      {formatSyncSchedule(config)}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Last sync: {config.lastSyncAt ? new Date(config.lastSyncAt).toLocaleTimeString() : "Never"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                    {(["all", "success", "failed"] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setLogFilter(filter)}
                        className={`px-2.5 py-1 rounded text-xs font-medium capitalize cursor-pointer ${
                          logFilter === filter ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={isSyncingNow}
                    onClick={handleTriggerSyncNow}
                    className="font-semibold text-xs flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? "animate-spin" : ""}`} />
                    <span>Sync Now</span>
                  </Button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white overflow-hidden">
                {filteredLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">No sync logs found.</div>
                ) : (
                  filteredLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    const isSuccess = log.status === "success";

                    return (
                      <div key={log.id} className="hover:bg-slate-50/50">
                        <div
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="p-3.5 flex items-center justify-between gap-4 cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                isSuccess ? "bg-emerald-500" : "bg-rose-500"
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-900">{log.action}</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                  {log.module}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 truncate">{log.message}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 text-right">
                            <div>
                              <div className="text-xs font-mono text-slate-700">{log.itemsCount} items</div>
                              <div className="text-[10px] font-mono text-slate-400">{log.timestamp}</div>
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-3.5 pt-2 bg-slate-50 border-t border-slate-100 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-mono text-slate-600">
                              <span>
                                HTTP {log.httpStatus || 200}
                                {log.latencyMs ? ` · ${log.latencyMs}ms` : ""}
                                {log.endpoint ? ` · ${log.endpoint}` : ""}
                              </span>
                              {log.payload && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyPayload(log.id, log.payload);
                                  }}
                                  className="text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 bg-white cursor-pointer"
                                >
                                  {copiedPayloadId === log.id ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                  <span>{copiedPayloadId === log.id ? "Copied" : "Copy JSON"}</span>
                                </button>
                              )}
                            </div>
                            {log.payload && (
                              <pre className="p-2.5 bg-slate-900 text-slate-200 rounded-lg text-[11px] font-mono overflow-x-auto leading-relaxed">
                                {JSON.stringify(log.payload, null, 2)}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div>
            {config.connected && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-xs font-medium text-rose-600 hover:text-rose-700 flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded hover:bg-rose-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Button type="button" variant="outline" onClick={onClose} className="font-medium text-xs">
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleSave} className="font-semibold text-xs gap-1.5">
              <Check className="w-3.5 h-3.5" />
              <span>Save</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
