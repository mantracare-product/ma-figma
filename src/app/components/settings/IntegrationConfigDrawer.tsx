import React, { useState, useEffect } from "react";
import {
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  Sparkles,
  Clock,
  Eye,
  EyeOff,
  HelpCircle,
  Calendar,
  Users,
  DollarSign,
  FileText,
  Activity,
  ArrowRight,
  Plus,
  Trash2,
  ExternalLink,
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
  const [testMessage, setTestMessage] = useState("");
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);

  // Load configuration whenever drawer opens or integration changes
  useEffect(() => {
    if (integration && isOpen) {
      const loaded = getStoredIntegrationConfig(integration.id);
      setConfig(loaded);
      setLogs(getStoredSyncLogs(integration.id));
      setTestStatus(loaded.connected ? "success" : "idle");
      setTestMessage(loaded.connected ? "API connection verified and healthy" : "");
      setActiveTab("connection");
      setVisibleFields({});
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
  };

  // Test Connection Handler
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus("idle");
    setTestMessage("");

    // Basic required fields check
    const requiredFields = integration.fields.filter((f) => f.label.includes("*"));
    const missing = requiredFields.filter((f) => !config.credentials[f.name]?.trim());

    if (missing.length > 0) {
      setIsTesting(false);
      setTestStatus("error");
      setTestMessage(`Please fill in: ${missing.map((m) => m.label.replace("*", "").trim()).join(", ")}`);
      toast.error("Missing required credentials");
      return;
    }

    // Simulate API handshake test
    await new Promise((resolve) => setTimeout(resolve, 1100));

    setIsTesting(false);
    setTestStatus("success");
    setTestMessage(`Handshake verified (HTTP 200 OK) · Connected to ${integration.name}`);
    toast.success(`${integration.name} connection verified!`);
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

    // Also record initial sync log if connecting for first time
    if (!config.connected && isNowConnected) {
      addSyncLog(integration.id, {
        integrationId: integration.id,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        module: "System",
        action: "Initial Handshake & Schema Link",
        status: "success",
        itemsCount: 1,
        message: `Successfully connected and activated sync engine with ${integration.name}`,
      });
      setLogs(getStoredSyncLogs(integration.id));
    }

    toast.success(`${integration.name} configuration saved successfully`);
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
    toast.success(`${integration.name} has been disconnected`);
    if (onSaved) {
      onSaved(integration.id, false);
    }
    onClose();
  };

  // Toggle Function Status
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

  // Assign Workflow
  const handleSelectWorkflow = (capId: string, workflowId: string, cap: SyncCapability) => {
    // If user clicked "+ Auto-create Recommended Workflow"
    if (workflowId === "__AUTO_CREATE__") {
      const defaultName = cap.defaultWorkflowName || `${integration.name} - ${cap.label}`;
      const newProcessId = `proc-${Date.now()}`;

      // Create pre-configured workflow process in useProcessStore
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
          },
        ],
        aiSettings: {
          enabled: true,
          model: "gpt-4o",
          temperature: 0.3,
          systemPrompt: `You are the automated assistant for ${integration.name} sync workflows. Manage incoming events and communicate cleanly with patients.`,
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

    // Normal workflow assignment
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
    await new Promise((resolve) => setTimeout(resolve, 1500));

    addSyncLog(integration.id, {
      integrationId: integration.id,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      module: "Manual Sync",
      action: "Full Delta Reconcile",
      status: "success",
      itemsCount: 9,
      message: `Manually polled ${integration.name}; pulled 9 changes and updated local cache`,
    });

    setLogs(getStoredSyncLogs(integration.id));
    setIsSyncingNow(false);
    toast.success("Manual sync completed successfully!");
  };

  // Group capabilities by module
  const moduleGroups: { key: SyncCapability["module"]; title: string; icon: React.ReactNode }[] = [
    { key: "appointments", title: "Appointments & Scheduling", icon: <Calendar className="w-4 h-4 text-blue-600" /> },
    { key: "leads", title: "Leads & Patient Intake", icon: <Users className="w-4 h-4 text-purple-600" /> },
    { key: "rcm", title: "RCM (Revenue Cycle & Billing)", icon: <DollarSign className="w-4 h-4 text-emerald-600" /> },
    { key: "clinical", title: "Clinical Notes & Care Forms", icon: <FileText className="w-4 h-4 text-amber-600" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-in slide-in-from-right duration-250 ease-out">
        {/* ── TOP HEADER ── */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-xs">
              {integration.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Configure {integration.name}</h2>
                {config.connected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{integration.description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── TAB NAVIGATION (Connection | Setting/configs | Sync Logs) ── */}
        <div className="px-6 border-b border-slate-200 flex items-center gap-6 shrink-0 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab("connection")}
            className={`py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === "connection"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Connection & Health
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("configs")}
            className={`py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "configs"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Setting / Configs</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={`py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "logs"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Sync Logs & Activity</span>
          </button>
        </div>

        {/* ── TAB CONTENT SCROLL AREA ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ═════════ TAB 1: CONNECTION & HEALTH ═════════ */}
          {activeTab === "connection" && (
            <div className="space-y-6">
              {/* Credentials Fields */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  API Credentials & Gateway
                </h3>

                {integration.fields.map((field) => (
                  <div key={field.name} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">{field.label}</label>
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
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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
                          className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                        />
                        {field.type === "password" && (
                          <button
                            type="button"
                            onClick={() =>
                              setVisibleFields({ ...visibleFields, [field.name]: !visibleFields[field.name] })
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {visibleFields[field.name] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Sync Interval Selector */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Synchronization Frequency</label>
                    <p className="text-[11px] text-slate-500">
                      How frequently MantraAssist delta-polls {integration.name} for updates
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <select
                      value={config.syncInterval}
                      onChange={(e) => setConfig({ ...config, syncInterval: e.target.value as any })}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="5m">Every 5 mins (High frequency)</option>
                      <option value="15m">Every 15 mins (Recommended)</option>
                      <option value="30m">Every 30 mins</option>
                      <option value="1h">Every 1 hour</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Test Connection Button & Result Indicator */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Connection Health Check</h4>
                    <p className="text-[11px] text-slate-500">
                      Send a test handshake to verify your credentials against {integration.name} API Gateway
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={isTesting}
                    onClick={handleTestConnection}
                    className="shrink-0 font-bold"
                  >
                    Test Connection
                  </Button>
                </div>

                {testStatus === "success" && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{testMessage}</span>
                  </div>
                )}

                {testStatus === "error" && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-medium animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{testMessage}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═════════ TAB 2: SETTING / CONFIGS (WIREFRAME MATCH) ═════════ */}
          {activeTab === "configs" && (
            <div className="space-y-6">
              {/* Question Banner */}
              <div className="p-4 bg-blue-50/70 border border-blue-200/60 rounded-2xl">
                <h3 className="text-sm font-bold text-blue-950">
                  What all do you want to sync with {integration.name}?
                </h3>
                <p className="text-xs text-blue-700 mt-0.5">
                  Toggle on features to sync data between MantraAssist and {integration.name}. Select a workflow to automate calls, reminders, and invoicing.
                </p>
              </div>

              {/* Render Capabilities grouped by Module */}
              {moduleGroups.map((group) => {
                const groupCaps = integration.capabilities.filter((c) => c.module === group.key);
                if (groupCaps.length === 0) return null;

                return (
                  <div key={group.key} className="space-y-3">
                    {/* Module Section Header */}
                    <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                      {group.icon}
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        {group.title}
                      </h4>
                    </div>

                    {/* Capabilities List */}
                    <div className="space-y-2.5">
                      {groupCaps.map((cap) => {
                        const featureConfig = config.features[cap.id] || { enabled: false };
                        const isEnabled = featureConfig.enabled;

                        return (
                          <div
                            key={cap.id}
                            className={`p-3.5 rounded-xl border transition-all ${
                              isEnabled
                                ? "bg-white border-blue-200 shadow-2xs"
                                : "bg-slate-50/60 border-slate-200/70 opacity-80"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              {/* Left: Capability Info */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900">{cap.label}</span>
                                  <span className="text-[10px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold">
                                    {cap.direction === "two-way" ? "2-Way" : cap.direction}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                  {cap.description}
                                </p>
                              </div>

                              {/* Right: Toggle + Workflow Dropdown */}
                              <div className="flex items-center gap-3 shrink-0">
                                {/* Workflow Dropdown (If capability binds to a workflow) */}
                                {cap.hasWorkflow ? (
                                  <div className="w-48">
                                    <select
                                      disabled={!isEnabled}
                                      value={featureConfig.workflowId || ""}
                                      onChange={(e) => handleSelectWorkflow(cap.id, e.target.value, cap)}
                                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                      <option value="">Select Workflow...</option>
                                      {processes.map((proc) => (
                                        <option key={proc.id} value={proc.id}>
                                          {proc.name}
                                        </option>
                                      ))}
                                      <option value="__AUTO_CREATE__" className="text-blue-600 font-bold">
                                        ✨ + Auto-create Recommended
                                      </option>
                                    </select>
                                  </div>
                                ) : (
                                  <span className="text-[11px] font-semibold text-slate-400 italic px-2">
                                    Direct PMS Sync
                                  </span>
                                )}

                                {/* Status Switch Toggle */}
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isEnabled}
                                    onChange={() => handleToggleFeature(cap.id)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
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

          {/* ═════════ TAB 3: SYNC LOGS & ACTIVITY ═════════ */}
          {activeTab === "logs" && (
            <div className="space-y-5">
              {/* Sync Status Header */}
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Background Sync Engine</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Interval: {config.syncInterval} · Last sync: {config.lastSyncAt ? new Date(config.lastSyncAt).toLocaleTimeString() : "Never"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  loading={isSyncingNow}
                  onClick={handleTriggerSyncNow}
                  className="font-bold flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? "animate-spin" : ""}`} />
                  <span>Sync Now</span>
                </Button>
              </div>

              {/* Logs Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Recent Sync Activity
                </h4>

                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                  {logs.map((log) => (
                    <div key={log.id} className="p-3.5 flex items-start justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{log.action}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                              {log.module}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{log.message}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-slate-700">{log.itemsCount} items</span>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{log.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── BOTTOM ACTIONS FOOTER ── */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div>
            {config.connected ? (
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1.5 cursor-pointer py-2 px-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Disconnect Integration</span>
              </button>
            ) : (
              <span className="text-xs text-slate-400 font-medium">Unconnected Provider</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Button type="button" variant="outline" onClick={onClose} className="font-bold">
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              className="font-bold shadow-xs flex items-center gap-1.5"
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
