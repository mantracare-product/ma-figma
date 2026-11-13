import React, { useState, useEffect } from "react";
import { RefreshCw, Search, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/Button";
import {
  INTEGRATIONS_REGISTRY,
  IntegrationDefinition,
  getStoredIntegrationConfig,
  IntegrationSyncConfig,
  runIntegrationManualSync,
} from "../../../lib/integrationsRegistry";
import IntegrationConfigDrawer from "../settings/IntegrationConfigDrawer";

interface ImportIntegrationsTabProps {
  entityType: "clients" | "appointments";
  onSynced?: (integrationId: string, count: number) => void;
}

export default function ImportIntegrationsTab({
  entityType,
  onSynced,
}: ImportIntegrationsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [configs, setConfigs] = useState<Record<string, IntegrationSyncConfig>>({});
  const [syncingIds, setSyncingIds] = useState<Record<string, boolean>>({});
  const [configDrawerDef, setConfigDrawerDef] = useState<IntegrationDefinition | null>(null);

  const loadConfigs = () => {
    const map: Record<string, IntegrationSyncConfig> = {};
    INTEGRATIONS_REGISTRY.forEach((def) => {
      map[def.id] = getStoredIntegrationConfig(def.id);
    });
    setConfigs(map);
  };

  useEffect(() => {
    loadConfigs();
    const handleUpdate = () => loadConfigs();
    window.addEventListener("mantra:integration_updated", handleUpdate);
    return () => window.removeEventListener("mantra:integration_updated", handleUpdate);
  }, []);

  // Filter integrations relevant to clients or appointments (show CRM/EHR/Marketing)
  const relevantIntegrations = INTEGRATIONS_REGISTRY.filter((def) => {
    if (entityType === "appointments") {
      return def.capabilities.some((c) => c.module === "appointments");
    }
    return def.id !== "whatsapp-business";
  }).filter((def) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return def.name.toLowerCase().includes(q) || def.description.toLowerCase().includes(q);
  });

  // Sort connected integrations first, then alphabetical/registry order
  const sortedIntegrations = [...relevantIntegrations].sort((a, b) => {
    const aConn = configs[a.id]?.connected ? 1 : 0;
    const bConn = configs[b.id]?.connected ? 1 : 0;
    return bConn - aConn;
  });

  const handleManualSync = async (def: IntegrationDefinition) => {
    setSyncingIds((prev) => ({ ...prev, [def.id]: true }));
    try {
      const result = await runIntegrationManualSync(def.id, entityType);
      loadConfigs();
      toast.success(result.message);
      if (onSynced) {
        onSynced(def.id, result.itemsCount);
      }
    } finally {
      setSyncingIds((prev) => ({ ...prev, [def.id]: false }));
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 leading-relaxed">
        Pull {entityType} manually from your connected software or connect a new integration.
      </p>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search integrations (e.g. Phorest, Cliniko, Healthie)..."
          className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all"
        />
      </div>

      {/* Simple Clean Integration List (No Flashy Badges) */}
      <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white overflow-hidden">
        {sortedIntegrations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No integrations matching &quot;{searchQuery}&quot;.
          </div>
        ) : (
          sortedIntegrations.map((def) => {
            const cfg = configs[def.id];
            const isConnected = !!cfg?.connected;
            const isSyncing = !!syncingIds[def.id];
            const lastSyncLabel = cfg?.lastSyncAt
              ? `Last synced ${new Date(cfg.lastSyncAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : null;

            return (
              <div
                key={def.id}
                className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: def.brandColor || "#0F172A" }}
                  >
                    {def.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 truncate">{def.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {isConnected
                        ? lastSyncLabel
                          ? `Connected · ${lastSyncLabel}`
                          : "Connected"
                        : "Not connected"}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {isConnected ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      loading={isSyncing}
                      onClick={() => handleManualSync(def)}
                      className="text-xs font-semibold gap-1.5 h-8 px-3 bg-white"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                      <span>Sync Now</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConfigDrawerDef(def)}
                      className="text-xs font-medium gap-1.5 h-8 px-3 bg-white text-slate-700"
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>Connect</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Connect Drawer so user doesn't lose place */}
      <IntegrationConfigDrawer
        isOpen={!!configDrawerDef}
        integration={configDrawerDef}
        onClose={() => setConfigDrawerDef(null)}
        onSaved={() => {
          loadConfigs();
          setConfigDrawerDef(null);
        }}
      />
    </div>
  );
}

