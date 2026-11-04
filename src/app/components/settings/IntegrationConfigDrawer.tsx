import React, { useState, useEffect } from "react";
import {
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Clock,
  Eye,
  EyeOff,
  Calendar,
  Users,
  DollarSign,
  FileText,
  Activity,
  ArrowRight,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronRight,
  Search,
  ShieldCheck,
  Radio,
  Terminal,
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
  SyncLogEntry,
} from "../../../lib/integrationsRegistry";
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
  const { processes, addProcess } = useProcessStore();

  const [activeTab, setActiveTab] = useState<"connection" | "configs" | "logs">("connection");
  const [config, setConfig] = useState<IntegrationSyncConfig | null>(null);
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");
  const [testResult, setTestResult] = useState<{
    message: string;
    latencyMs?: number;
    accountName?: string;
    scopes?: string[];
  } | null>(null);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<"all" | "success" | "failed">("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [capabilitySearch, setCapabilitySearch] = useState("");
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedPayloadId, setCopiedPayloadId] = useState<string | null>(null);

  // Load configuration on drawer open
  useEffect(() => {
    if (integration && isOpen) {
      const loaded = getStoredIntegrationConfig(integration.id);
      setConfig(loaded);
      const storedLogs = getStoredSyncLogs(integration.id);
      setLogs(storedLogs);
      setTestStatus(loaded.connected ? "success" : "idle");
      if (loaded.connected) {
        setTestResult({
          message: `Active connection verified with ${integration.name} API Gateway`,
          latencyMs: 138,
          accountName: loaded.credentials.username || loaded.credentials.businessId || `${integration.name} Clinic Account`,
          scopes: ["appointments:read", "appointments:write", "patients:read", "invoices:read"],
        });
      } else {
        setTestResult(null);
      }
      setActiveTab("connection");
      setVisibleFields({});
      setExpandedLogId(storedLogs.length > 0 ? storedLogs[0].id : null);
    }
  }, [integration, isOpen]);

  if (!isOpen || !integration || !config) return null;

  // Handle Credentials Changes
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

  // Test Connection Handshake
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
        message: `Missing required credentials: ${missing.map((m) => m.label.replace("*", "").trim()).join(", ")}`,
      });
      toast.error("Please fill in all required credentials");
      return;
    }

    // Simulate API verification
    await new Promise((resolve) => setTimeout(resolve, 950));

    setIsTesting(false);
    setTestStatus("success");
    setTestResult({
      message: "Handshake verified (HTTP 200 OK)",
      latencyMs: 124,
      accountName: config.credentials.username || config.credentials.businessId || "Verified Clinic Gateway",
      scopes: ["appointments:read", "appointments:write", "patients:read", "invoices:read"],
    });
    toast.success(`${integration.name} credentials verified`);
  };

  // Save Full Configuration
  const handleSave = () => {
    const isNowConnected = testStatus === "success" || config.connected;
    const updated: IntegrationSyncConfig = {
      ...config,
      connected: isNowConnected,
      lastSyncAt: new Date().toISOString(),
      syncStatus: "idle",
    };

    saveStoredIntegrationConfig(integration.id, updated);
    setConfig(updated);

    if (!config.connected && isNowConnected) {
      addSyncLog(integration.id, {
        integrationId: integration.id,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        module: "System",
        action: "Schema Link & Initial Sync",
        status: "success",
        itemsCount: 1,
        message: `Activated background synchronization engine with ${integration.name}`,
        endpoint: "/v1/handshake",
        httpStatus: 200,
        latencyMs: 110,
        payload: {
          event: "INTEGRATION_ACTIVATED",
          syncInterval: config.syncInterval,
          featuresEnabled: Object.values(config.features).filter((f) => f.enabled).length,
        },
      });
      setLogs(getStoredSyncLogs(integration.id));
    }

    toast.success(`${integration.name} configuration saved`);
    if (onSaved) {
      onSaved(integration.id, isNowConnected);
    }
    onClose();
  };

  // Disconnect Handler
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

  // Toggle Feature Status
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

  // Enable/Disable All in a module
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

  // Assign Workflow
  const handleSelectWorkflow = (capId: string, workflowId: string, cap: SyncCapability) => {
    if (workflowId === "__AUTO_CREATE__") {
      const defaultName = cap.defaultWorkflowName || `${integration.name} - ${cap.label}`;
      const newProcessId = `proc-${Date.now()}`;

      const newProcess: Process = {
        id: newProcessId,
        name: defaultName,
        description: `Automated workflow created for ${integration.name} integration (${cap.label})`,
        assignedToUserId: 1,
        entityType: cap.module === "leads" ? "client" : cap.module === "rcm" ? "invoice" : "appointment",
        stages: [
          {
            id: `stg-${Date.now()}-1`,
            name: "Triggered / Incoming",
            color: "#3b82f6",
            order: 1,
            isDefault: true,
          },
          {
            id: `stg-${Date.now()}-2`,
            name: "Automated Follow-up",
            color: "#8b5cf6",
            order: 2,
          },
          {
            id: `stg-${Date.now()}-3`,
            name: "Completed / Synced",
            color: "#10b981",
            order: 3,
            stageCategory: "success",
            isFinalStage: true,
          },
        ],
        aiSettings: {
          enabled: true,
          model: "gpt-4o",
          temperature: 0.3,
          systemPrompt: `Assistant managing automated events for ${integration.name}. Reconcile data and notify patients cleanly.`,
        },
      };

      if (addProcess) {
        addProcess(newProcess);
      }

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

  // Manual Trigger "Sync Now"
  const handleTriggerSyncNow = async () => {
    setIsSyncingNow(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));

    addSyncLog(integration.id, {
      integrationId: integration.id,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      module: "Manual Sync",
      action: "Incremental Delta Pull",
      status: "success",
      itemsCount: 8,
      message: `Manual poll completed. Pulled 8 delta records from ${integration.name}`,
      endpoint: "/api/v2/delta",
      httpStatus: 200,
      latencyMs: 145,
      payload: {
        trigger: "MANUAL_UI_TRIGGER",
        recordsReconciled: 8,
        syncMode: "DELTA_RECONCILE",
      },
    });

    setLogs(getStoredSyncLogs(integration.id));
    setIsSyncingNow(false);
    toast.success("Sync completed successfully");
  };

  // Copy webhook URL
  const webhookUrl = `https://api.mantraassist.com/v1/integrations/${integration.id}/events`;
  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
    toast.success("Webhook URL copied to clipboard");
  };

  // Copy JSON Payload
  const handleCopyPayload = (logId: string, payload: any) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedPayloadId(logId);
    setTimeout(() => setCopiedPayloadId(null), 2000);
    toast.success("Payload copied to clipboard");
  };

  // Module Groups
  const moduleGroups: { key: SyncCapability["module"]; title: string; icon: React.ReactNode }[] = [
    { key: "appointments", title: "Appointments & Scheduling", icon: <Calendar className="w-4 h-4 text-slate-700" /> },
    { key: "leads", title: "Leads & Patient Intake", icon: <Users className="w-4 h-4 text-slate-700" /> },
    { key: "rcm", title: "RCM (Revenue Cycle & Billing)", icon: <DollarSign className="w-4 h-4 text-slate-700" /> },
    { key: "clinical", title: "Clinical Notes & Care Forms", icon: <FileText className="w-4 h-4 text-slate-700" /> },
  ];

  // Calculated Stats
  const totalCapabilities = integration.capabilities.length;
  const enabledCount = Object.values(config.features).filter((f) => f.enabled).length;
  const filteredLogs = logs.filter((log) => {
    if (logFilter === "all") return true;
    return log.status === logFilter;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      {/* ── HIGH DENSITY ENTERPRISE DRAWER (Expanded Width) ── */}
      <div className="w-full max-w-4xl xl:max-w-5xl bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-250 ease-out">
        {/* ── TOP HEADER ── */}
        <div className="px-8 py-5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-xs"
              style={{ backgroundColor: integration.brandColor || "#0F172A" }}
            >
              {integration.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                  Configure {integration.name}
                </h2>
                <span className="text-[11px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border border-slate-200 text-slate-600 bg-slate-50 font-medium">
                  {integration.category.toUpperCase()}
                </span>
                {config.connected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    Not connected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{integration.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {integration.docsUrl && (
              <a
                href={integration.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <span>Documentation</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
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
        <div className="px-8 border-b border-slate-200 flex items-center gap-8 shrink-0 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab("connection")}
            className={`py-3.5 text-xs font-semibold tracking-wide border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "connection"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>Connection & Health</span>
            {config.connected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("configs")}
            className={`py-3.5 text-xs font-semibold tracking-wide border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "configs"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span>Sync Configuration</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
              {enabledCount}/{totalCapabilities} Active
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={`py-3.5 text-xs font-semibold tracking-wide border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "logs"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span>Sync Logs & Diagnostics</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
              {logs.length}
            </span>
          </button>
        </div>

        {/* ── TAB CONTENT SCROLL AREA ── */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* ═════════ TAB 1: CONNECTION & HEALTH ═════════ */}
          {activeTab === "connection" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: API Credentials (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    API Credentials & Gateway
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure authentication keys to link MantraAssist with your {integration.name} instance.
                  </p>
                </div>

                <div className="space-y-4">
                  {integration.fields.map((field) => (
                    <div key={field.name} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700">
                          {field.label}
                        </label>
                        {field.tooltip && (
                          <span className="text-[11px] text-slate-400">{field.tooltip}</span>
                        )}
                      </div>

                      {field.type === "select" ? (
                        <select
                          value={config.credentials[field.name] || field.defaultValue || ""}
                          onChange={(e) => handleCredentialChange(field.name, e.target.value)}
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
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
                            className="w-full px-3.5 py-2 pr-10 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
                          />
                          {field.type === "password" && (
                            <button
                              type="button"
                              onClick={() =>
                                setVisibleFields({ ...visibleFields, [field.name]: !visibleFields[field.name] })
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {visibleFields[field.name] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Engine, Webhook & Diagnostic Status (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                {/* Synchronization Schedule */}
                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-800">Sync Frequency</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Delta-polling schedule for appointments and intake updates.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "5m", label: "Every 5 mins", desc: "High frequency" },
                      { id: "15m", label: "Every 15 mins", desc: "Recommended" },
                      { id: "30m", label: "Every 30 mins", desc: "Standard" },
                      { id: "1h", label: "Every 1 hour", desc: "Batch" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setConfig({ ...config, syncInterval: opt.id as any })}
                        className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          config.syncInterval === opt.id
                            ? "border-slate-900 bg-white shadow-xs"
                            : "border-slate-200 bg-white/60 hover:bg-white text-slate-600"
                        }`}
                      >
                        <div className="text-xs font-semibold text-slate-900">{opt.label}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Webhook Listener URL */}
                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800">Inbound Webhook URL</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        For real-time booking push events from {integration.name}.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyWebhook}
                      className="text-xs font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1 px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                    >
                      {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedWebhook ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <div className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-mono text-slate-600 truncate select-all">
                    {webhookUrl}
                  </div>
                </div>

                {/* Handshake Diagnostic Test Card */}
                <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900">Connection Health</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Send verification ping to {integration.name} endpoint.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      loading={isTesting}
                      onClick={handleTestConnection}
                      className="font-semibold text-xs"
                    >
                      Test Connection
                    </Button>
                  </div>

                  {testStatus === "success" && testResult && (
                    <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/60 space-y-2 animate-in fade-in">
                      <div className="flex items-center gap-2 text-emerald-900 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{testResult.message}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 text-[11px] font-mono text-emerald-800">
                        <div>Latency: {testResult.latencyMs}ms</div>
                        <div>Status: 200 OK</div>
                        <div className="col-span-2 truncate">Account: {testResult.accountName}</div>
                      </div>
                    </div>
                  )}

                  {testStatus === "error" && testResult && (
                    <div className="p-3.5 rounded-lg border border-rose-200 bg-rose-50/60 space-y-1.5 animate-in fade-in">
                      <div className="flex items-center gap-2 text-rose-900 text-xs font-semibold">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Handshake Failed</span>
                      </div>
                      <p className="text-xs text-rose-700">{testResult.message}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═════════ TAB 2: SYNC CONFIGURATION ═════════ */}
          {activeTab === "configs" && (
            <div className="space-y-6">
              {/* Header Filter & Summary Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={capabilitySearch}
                    onChange={(e) => setCapabilitySearch(e.target.value)}
                    placeholder="Filter sync capabilities..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-500">
                    {enabledCount} of {totalCapabilities} enabled
                  </span>
                </div>
              </div>

              {/* Module Groups */}
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
                  <div key={group.key} className="space-y-3">
                    {/* Section Header */}
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        {group.icon}
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
                          {group.title}
                        </h4>
                        <span className="text-[11px] font-mono text-slate-400">
                          ({groupCaps.length})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleModuleAll(group.key, !allModuleEnabled)}
                          className="text-[11px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
                        >
                          {allModuleEnabled ? "Disable all" : "Enable all"}
                        </button>
                      </div>
                    </div>

                    {/* Capabilities Rows */}
                    <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white overflow-hidden">
                      {groupCaps.map((cap) => {
                        const featureConfig = config.features[cap.id] || { enabled: false };
                        const isEnabled = featureConfig.enabled;

                        return (
                          <div
                            key={cap.id}
                            className={`p-4 transition-colors ${
                              isEnabled ? "bg-white" : "bg-slate-50/50"
                            }`}
                          >
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              {/* Left: Capability Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-xs font-semibold text-slate-900">
                                    {cap.label}
                                  </span>
                                  <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-slate-200 bg-slate-100 text-slate-600 font-medium">
                                    {cap.direction === "two-way" ? "2-Way" : cap.direction}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                                  {cap.description}
                                </p>

                                {/* Synced Fields Tags */}
                                {cap.syncedFields && cap.syncedFields.length > 0 && (
                                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                    <span className="text-[10px] font-mono text-slate-400">Syncs:</span>
                                    {cap.syncedFields.map((field) => (
                                      <span
                                        key={field}
                                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                                      >
                                        {field}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Right: Workflow Dropdown + Toggle */}
                              <div className="flex items-center gap-4 shrink-0">
                                {cap.hasWorkflow ? (
                                  <div className="w-56">
                                    <select
                                      disabled={!isEnabled}
                                      value={featureConfig.workflowId || ""}
                                      onChange={(e) => handleSelectWorkflow(cap.id, e.target.value, cap)}
                                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-slate-900"
                                    >
                                      <option value="">Select Target Workflow...</option>
                                      {processes.map((proc) => (
                                        <option key={proc.id} value={proc.id}>
                                          {proc.name}
                                        </option>
                                      ))}
                                      <option value="__AUTO_CREATE__" className="text-blue-600 font-semibold">
                                        + Auto-create Recommended
                                      </option>
                                    </select>
                                  </div>
                                ) : (
                                  <span className="text-[11px] font-mono text-slate-400 px-2">
                                    Native PMS Sync
                                  </span>
                                )}

                                {/* Modern Switch */}
                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={isEnabled}
                                    onChange={() => handleToggleFeature(cap.id)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
                                </label>
                              </div>
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

          {/* ═════════ TAB 3: SYNC LOGS & DIAGNOSTICS ═════════ */}
          {activeTab === "logs" && (
            <div className="space-y-6">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      Delta Poller Active · {config.syncInterval} schedule
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Last run: {config.lastSyncAt ? new Date(config.lastSyncAt).toLocaleTimeString() : "Never"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
                    {(["all", "success", "failed"] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setLogFilter(filter)}
                        className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-all cursor-pointer ${
                          logFilter === filter
                            ? "bg-slate-900 text-white shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
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

              {/* Log Entries Table */}
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white overflow-hidden">
                {filteredLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No sync events found matching filter.
                  </div>
                ) : (
                  filteredLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    const isSuccess = log.status === "success";

                    return (
                      <div key={log.id} className="transition-colors hover:bg-slate-50/50">
                        {/* Summary Row */}
                        <div
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="p-4 flex items-center justify-between gap-4 cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {isSuccess ? (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-900">
                                  {log.action}
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                  {log.module}
                                </span>
                                {log.endpoint && (
                                  <span className="text-[11px] font-mono text-slate-400 truncate hidden md:inline">
                                    {log.endpoint}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 truncate">{log.message}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0 text-right">
                            <div>
                              <div className="text-xs font-mono font-medium text-slate-700">
                                {log.itemsCount} items
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">{log.timestamp}</div>
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* Collapsible Payload & Diagnostic Inspector */}
                        {isExpanded && (
                          <div className="px-5 pb-4 pt-1 bg-slate-50/80 border-t border-slate-100 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-3 font-mono text-[11px] text-slate-600">
                                <span>Status: {log.httpStatus || 200}</span>
                                {log.latencyMs && <span>Latency: {log.latencyMs}ms</span>}
                                {log.endpoint && <span>Endpoint: {log.endpoint}</span>}
                              </div>

                              {log.payload && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyPayload(log.id, log.payload);
                                  }}
                                  className="text-[11px] font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 bg-white"
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
                              <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg text-[11px] font-mono overflow-x-auto leading-relaxed border border-slate-800">
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

        {/* ── BOTTOM ACTIONS FOOTER ── */}
        <div className="px-8 py-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div>
            {config.connected && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 cursor-pointer py-1.5 px-2 rounded hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Disconnect Integration</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="font-semibold text-xs">
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              className="font-semibold text-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Configuration</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
