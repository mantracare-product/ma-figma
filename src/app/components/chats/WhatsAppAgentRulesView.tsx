/**
 * WhatsAppAgentRulesView.tsx
 * Path: src/app/components/chats/WhatsAppAgentRulesView.tsx
 *
 * Primary table and management view for WhatsApp Agent automation rules:
 * - Rendered under WhatsApp > Agent tab
 * - Shows connected templates, directions, classification prompts, AI responses, CRM actions, and resolution criteria
 */

import React, { useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Copy,
  Trash2,
  FileText,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  UserPlus,
  CheckCircle2,
  Clock,
  Filter,
  Check,
  Zap,
} from "lucide-react";
import TableComponent, { TableColumn, TableRowAction } from "../ui/TableComponent";
import {
  useWhatsappAgentStore,
  WhatsAppAgentRule,
  RuleDirection,
} from "../../../lib/whatsappAgentStore";
import { Tooltip } from "../ui/Tooltip";
import { toast } from "sonner";

interface WhatsAppAgentRulesViewProps {
  searchQuery?: string;
  filterType?: "all" | "active" | "inbound" | "outbound";
  onOpenAddRule?: () => void;
  onEditRule?: (rule: WhatsAppAgentRule) => void;
}

const COLOR_MAP: Record<WhatsAppAgentRule["color"], { dot: string; bg: string; text: string; border: string }> = {
  emerald: { dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  blue: { dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  purple: { dot: "bg-purple-500", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  amber: { dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  cyan: { dot: "bg-cyan-500", bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  rose: { dot: "bg-rose-500", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  orange: { dot: "bg-orange-500", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  slate: { dot: "bg-slate-500", bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
};

export default function WhatsAppAgentRulesView({
  searchQuery = "",
  filterType = "all",
  onOpenAddRule,
  onEditRule,
}: WhatsAppAgentRulesViewProps) {
  const { rules, toggleRuleEnabled, duplicateRule, deleteRule } = useWhatsappAgentStore();

  // Filtered rules
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      // Status & Direction filter
      if (filterType === "active" && !r.enabled) return false;
      if (filterType === "inbound" && r.direction !== "inbound" && r.direction !== "both") return false;
      if (filterType === "outbound" && r.direction !== "outbound" && r.direction !== "both") return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = r.name.toLowerCase().includes(q);
      const matchDesc = r.description.toLowerCase().includes(q);
      const matchTpl = (r.templateName || "").toLowerCase().includes(q);
      const matchPrompt = (r.responsePrompt || "").toLowerCase().includes(q);
      const matchClass = (r.classificationPrompt || "").toLowerCase().includes(q);
      const matchEntity = (r.entityType || "").toLowerCase().includes(q);
      return matchName || matchDesc || matchTpl || matchPrompt || matchClass || matchEntity;
    });
  }, [rules, filterType, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = rules.length;
    const active = rules.filter((r) => r.enabled).length;
    const inbound = rules.filter((r) => r.direction === "inbound" || r.direction === "both").length;
    const outbound = rules.filter((r) => r.direction === "outbound" || r.direction === "both").length;
    return { total, active, inbound, outbound };
  }, [rules]);

  // Table Columns
  const columns: TableColumn<WhatsAppAgentRule>[] = [
    {
      id: "name",
      header: "RULE NAME",
      align: "left",
      width: "220px",
      render: (row) => {
        const c = COLOR_MAP[row.color] || COLOR_MAP.emerald;
        return (
          <div className="flex flex-col gap-0.5 max-w-[210px]">
            <button
              type="button"
              onClick={() => onEditRule?.(row)}
              className="text-xs font-bold text-gray-900 hover:text-blue-600 transition-colors text-left truncate flex items-center gap-1.5 cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
              <span className="truncate">{row.name}</span>
            </button>
            {row.description && (
              <span className="text-[11px] text-gray-400 truncate pl-3.5 block">
                {row.description}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "direction",
      header: "DIRECTION",
      align: "left",
      width: "110px",
      render: (row) => {
        if (row.direction === "inbound") {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <ArrowDownLeft className="w-3 h-3" />
              Inbound
            </span>
          );
        }
        if (row.direction === "outbound") {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              <ArrowUpRight className="w-3 h-3" />
              Outbound
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ArrowLeftRight className="w-3 h-3" />
            Both
          </span>
        );
      },
    },
    {
      id: "template",
      header: "CONNECTED TEMPLATE",
      align: "left",
      width: "190px",
      render: (row) => (
        <div className="space-y-0.5 max-w-[180px]">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-800 truncate">
            <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="truncate">{row.templateName || "All Templates"}</span>
          </span>
          <span className="text-[10px] text-gray-400 block pl-4.5">
            Trigger: {row.triggerEvent === "button_click" ? `Button: ${row.targetButtonLabel || "Any"}` : row.triggerEvent === "customer_reply" ? "Customer Reply" : row.triggerEvent === "template_fired" ? "Template Dispatched" : "Any Event"}
          </span>
        </div>
      ),
    },
    {
      id: "classification",
      header: "CLASSIFICATION CRITERIA",
      align: "left",
      width: "200px",
      render: (row) => {
        if (row.criteriaType === "prompt") {
          return (
            <Tooltip content={row.classificationPrompt || "AI Semantic Prompt Classification"}>
              <span className="inline-flex items-center gap-1 text-xs text-gray-700 max-w-[190px] truncate bg-gray-50 border border-gray-200/80 px-2 py-1 rounded-lg">
                <Sparkles className="w-3 h-3 text-purple-500 shrink-0" />
                <span className="truncate">{row.classificationPrompt || "AI Intent Analysis"}</span>
              </span>
            </Tooltip>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-gray-700 bg-amber-50 border border-amber-200/80 px-2 py-1 rounded-lg max-w-[190px] truncate font-medium">
            <Filter className="w-3 h-3 text-amber-600 shrink-0" />
            <span className="truncate">Keywords: {row.keywordsFilter?.contains || "Keyword Rules"}</span>
          </span>
        );
      },
    },
    {
      id: "responsePrompt",
      header: "AI RESPONSE INSTRUCTIONS",
      align: "left",
      width: "230px",
      render: (row) => (
        <Tooltip content={row.responsePrompt || row.fixedResponseText || "No prompt specified"}>
          <div className="text-xs text-gray-600 max-w-[220px] truncate font-sans">
            <span className="font-semibold text-gray-800 capitalize mr-1">[{row.aiTone || "AI"}]:</span>
            <span>{row.responsePrompt || row.fixedResponseText || "Automated acknowledgment"}</span>
          </div>
        </Tooltip>
      ),
    },
    {
      id: "crm",
      header: "CRM ENTITY ACTION",
      align: "left",
      width: "150px",
      render: (row) => {
        if (!row.autoCreateContact) {
          return <span className="text-[11px] text-gray-400">None</span>;
        }
        return (
          <div className="space-y-0.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
              <UserPlus className="w-3 h-3" />
              Create {row.entityType}
            </span>
            {row.assignProcessEnabled && row.stageName && (
              <span className="text-[10px] text-gray-400 block truncate max-w-[140px]">
                Stage: {row.stageName}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "resolution",
      header: "RESOLUTION CRITERIA",
      align: "left",
      width: "180px",
      render: (row) => {
        if (row.resolutionCriteria === "immediate") {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Immediate
            </span>
          );
        }
        if (row.resolutionCriteria === "customer_confirmation") {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
              <Check className="w-3 h-3 text-blue-600" />
              On Confirmation
            </span>
          );
        }
        if (row.resolutionCriteria === "inactivity_timeout") {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
              <Clock className="w-3 h-3 text-amber-600" />
              Timeout ({row.resolutionTimeoutHours || 24}h)
            </span>
          );
        }
        if (row.resolutionCriteria === "prompt_condition") {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg">
              <Sparkles className="w-3 h-3 text-purple-600" />
              AI Condition
            </span>
          );
        }
        return <span className="text-[11px] text-gray-500 font-medium">Manual Closure</span>;
      },
    },
    {
      id: "status",
      header: "STATUS",
      align: "center",
      width: "90px",
      render: (row) => (
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={() => toggleRuleEnabled(row.id)}
            className="sr-only peer"
          />
          <div className="w-8 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600 relative"></div>
        </label>
      ),
    },
  ];

  // Row Actions
  const rowActions: TableRowAction<WhatsAppAgentRule>[] = [
    {
      label: "Edit Rule & Instructions",
      icon: <Pencil className="w-3.5 h-3.5" />,
      onClick: (r) => onEditRule?.(r),
    },
    {
      label: "Duplicate Rule",
      icon: <Copy className="w-3.5 h-3.5" />,
      onClick: (r) => {
        duplicateRule(r);
        toast.success(`Rule "${r.name}" duplicated ✓`);
      },
    },
    {
      label: "Delete Rule",
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-500" />,
      isDanger: true,
      onClick: (r) => {
        deleteRule(r.id);
        toast.success(`Rule "${r.name}" deleted`);
      },
    },
  ];

  return (
    <div className="space-y-4" style={{ fontFamily: "Outfit, sans-serif" }}>
      {/* Quick KPI Stats Summary Cards */}
      <div className="grid grid-cols-4 gap-3.5">
        <div className="bg-white border border-gray-200/90 rounded-2xl p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Rules</span>
            <h4 className="text-lg font-black text-gray-900 mt-0.5">{stats.total}</h4>
          </div>
          <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700">
            <Zap className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-gray-200/90 rounded-2xl p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Active Rules</span>
            <h4 className="text-lg font-black text-gray-900 mt-0.5">{stats.active}</h4>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-gray-200/90 rounded-2xl p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Inbound Rules</span>
            <h4 className="text-lg font-black text-gray-900 mt-0.5">{stats.inbound}</h4>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-gray-200/90 rounded-2xl p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600">Outbound Rules</span>
            <h4 className="text-lg font-black text-gray-900 mt-0.5">{stats.outbound}</h4>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <TableComponent<WhatsAppAgentRule>
        data={filteredRules}
        columns={columns}
        rowActions={rowActions}
        onRowClick={(row) => onEditRule?.(row)}
        getRowId={(row) => row.id}
        tableId="whatsapp_agent_rules_table"
        emptyMessage="No WhatsApp agent rules found matching your filters. Click '+ Add Rule' to create your first template-triggered rule."
        defaultRowsPerPage={10}
      />
    </div>
  );
}
