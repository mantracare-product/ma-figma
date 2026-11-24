/**
 * WhatsAppAgentRulesView.tsx
 * Path: src/app/components/chats/WhatsAppAgentRulesView.tsx
 *
 * WhatsApp Agent automation rules list view:
 * Columns:
 * 1. Checkbox (bulk select via TableComponent)
 * 2. Settings icon (column customization via TableComponent)
 * 3. Rule name (no coloured dot, no description line, tooltip on hover)
 * 4. Connected template ("New message" for new message trigger; first template +N more for templates)
 * 5. Status (Toggle switch with "Active"/"Inactive" tooltip, immediate save & toast)
 */

import React, { useMemo, useState } from "react";
import {
  Pencil,
  Copy,
  Trash2,
  FileText,
  Sparkles,
  Users,
} from "lucide-react";
import TableComponent, { TableColumn, TableRowAction } from "../ui/TableComponent";
import {
  useWhatsappAgentStore,
  WhatsAppAgentRule,
} from "../../../lib/whatsappAgentStore";
import { getStoredTemplates } from "../../../lib/useWhatsappTemplates";
import { Tooltip } from "../ui/Tooltip";
import { toast } from "sonner";

interface WhatsAppAgentRulesViewProps {
  searchQuery?: string;
  filterType?: "all" | "active" | "inactive" | "template" | "new_message" | string;
  onOpenAddRule?: () => void;
  onEditRule?: (rule: WhatsAppAgentRule) => void;
}

export default function WhatsAppAgentRulesView({
  searchQuery = "",
  filterType = "all",
  onOpenAddRule,
  onEditRule,
}: WhatsAppAgentRulesViewProps) {
  const {
    rules,
    toggleRuleEnabled,
    duplicateRule,
    deleteRule,
  } = useWhatsappAgentStore();

  const templatesList = useMemo(() => getStoredTemplates(), []);

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<any>>(new Set());

  // Filter and sort rules strictly by priority
  const filteredRules = useMemo(() => {
    return rules
      .filter((r) => {
        const isActive = r.is_active !== undefined ? r.is_active : r.enabled;
        // Status filter
        if (filterType === "active" && !isActive) return false;
        if (filterType === "inactive" && isActive) return false;
        if (filterType === "template" && r.trigger_type !== "template_reply") return false;
        if (filterType === "new_message" && r.trigger_type !== "new_message") return false;

        // Search query
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const matchName = r.name.toLowerCase().includes(q);
        const matchTpl = (r.templateNames || []).some((tn) => tn.toLowerCase().includes(q));
        const matchTriggerPrompt = (r.trigger_prompt || "").toLowerCase().includes(q);
        const matchAgentPrompt = (r.agent_prompt || "").toLowerCase().includes(q);
        const matchCategory = (r.contact_category_name || r.contact_category_id || "").toLowerCase().includes(q);
        const matchWorkflow = (r.workflow_name || r.workflow_id || "").toLowerCase().includes(q);
        const matchKeywords = (r.keywords || "").toLowerCase().includes(q);
        const matchIntent = (r.intent_text || "").toLowerCase().includes(q);

        return (
          matchName ||
          matchTpl ||
          matchTriggerPrompt ||
          matchAgentPrompt ||
          matchCategory ||
          matchWorkflow ||
          matchKeywords ||
          matchIntent
        );
      })
      .sort((a, b) => a.priority - b.priority);
  }, [rules, filterType, searchQuery]);

  // Status toggle handler with immediate feedback
  const handleToggleStatus = (ruleId: string) => {
    try {
      toggleRuleEnabled(ruleId);
      toast.success("Agent rule updated ✓");
    } catch {
      toast.error("Failed to update status");
    }
  };

  // Table Columns (Rule name, Connected template, Reply with, Handoff conditions, Status)
  const columns: TableColumn<WhatsAppAgentRule>[] = [
    {
      id: "name",
      header: "RULE NAME",
      align: "left",
      width: "280px",
      minWidth: "220px",
      render: (row) => {
        return (
          <Tooltip content={row.description || row.name} position="top">
            <button
              type="button"
              onClick={() => onEditRule?.(row)}
              className="text-xs font-bold text-slate-900 hover:text-blue-600 transition-colors text-left truncate block max-w-full cursor-pointer"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {row.name}
            </button>
          </Tooltip>
        );
      },
    },
    {
      id: "template",
      header: "CONNECTED TEMPLATE",
      align: "left",
      width: "240px",
      minWidth: "180px",
      render: (row) => {
        if (row.trigger_type === "new_message") {
          return (
            <span className="text-xs text-slate-700 font-medium truncate block">
              New message
            </span>
          );
        }

        const tplNames =
          row.templates && row.templates.length > 0
            ? row.templates.map((tid) => {
                const found = templatesList.find((t) => t.id === tid);
                return found ? found.name : tid;
              })
            : row.templateNames || ["Appointment Reminder"];

        const firstTpl = tplNames[0] || "Any template";
        const moreCount = tplNames.length - 1;
        const displayText =
          moreCount > 0 ? `${firstTpl} +${moreCount} more` : firstTpl;

        return (
          <Tooltip content={tplNames.join(", ")} position="top">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 max-w-[220px] truncate cursor-help">
              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{displayText}</span>
            </span>
          </Tooltip>
        );
      },
    },
    {
      id: "reply_with",
      header: "REPLY WITH",
      align: "left",
      width: "160px",
      minWidth: "130px",
      render: (row) => {
        const isTemplate = row.reply_mode === "template";
        if (isTemplate) {
          const tplName =
            row.reply_template_name ||
            (row.reply_template_id
              ? templatesList.find((t) => t.id === row.reply_template_id)?.name
              : undefined) ||
            "Template";
          return (
            <Tooltip content={`Reply with template: ${tplName}`} position="top">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 cursor-help">
                <FileText className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                <span className="truncate max-w-[105px]">Template</span>
              </span>
            </Tooltip>
          );
        }

        return (
          <Tooltip content={row.agent_prompt ? `AI Prompt: ${row.agent_prompt}` : "AI Prompt"} position="top">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 cursor-help">
              <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>AI</span>
            </span>
          </Tooltip>
        );
      },
    },
    {
      id: "handoff_conditions",
      header: "HANDOFF CONDITIONS",
      align: "left",
      width: "180px",
      minWidth: "150px",
      render: (row) => {
        const isHandoffEnabled = row.handoff_enabled !== false;
        const conditions = Array.isArray(row.handoff_conditions)
          ? row.handoff_conditions
          : row.handoff_condition_prompt
          ? [
              {
                id: "c-1",
                prompt: row.handoff_condition_prompt,
                assigneeName: row.handoff_assignee_name,
                assigneeId: row.handoff_assignee_id || 1,
                handoffMessage: row.handoff_message || "",
              },
            ]
          : [];

        const conditionCount = isHandoffEnabled ? conditions.length : 0;

        if (!isHandoffEnabled || conditionCount === 0) {
          return (
            <Tooltip content={!isHandoffEnabled ? "Handoff disabled (0 conditions)" : "0 handoff conditions"} position="top">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 cursor-help">
                0
              </span>
            </Tooltip>
          );
        }

        const tooltipContent = conditions
          .map((c, i) => {
            const assigneeStr =
              Array.isArray(c.assignees) && c.assignees.length > 0
                ? c.assignees
                    .map((a, aIdx) => `${aIdx + 1}. ${a.name} (${a.type === "department" ? "Dept" : "User"})`)
                    .join(" → ")
                : c.assigneeName || "Team";
            return `${i + 1}. ${c.prompt || c.title || "Condition"}\n   ↳ Escalation: ${assigneeStr}`;
          })
          .join("\n\n");

        return (
          <Tooltip content={tooltipContent} position="top">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 cursor-help">
              <Users className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                {conditionCount} {conditionCount === 1 ? "condition" : "conditions"}
              </span>
            </span>
          </Tooltip>
        );
      },
    },
    {
      id: "status",
      header: "STATUS",
      align: "center",
      width: "100px",
      render: (row) => {
        const isActive = row.is_active !== undefined ? row.is_active : row.enabled;
        return (
          <Tooltip content={isActive ? "Active" : "Inactive"} position="top">
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={() => handleToggleStatus(row.id)}
                className="sr-only peer"
              />
              <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600 relative"></div>
            </label>
          </Tooltip>
        );
      },
    },
  ];

  // Row Actions
  const rowActions: TableRowAction<WhatsAppAgentRule>[] = [
    {
      label: "Edit Agent Rule",
      icon: <Pencil className="w-3.5 h-3.5" />,
      onClick: (r) => onEditRule?.(r),
    },
    {
      label: "Duplicate Rule",
      icon: <Copy className="w-3.5 h-3.5" />,
      onClick: (r) => {
        duplicateRule(r);
        toast.success(`Agent rule "${r.name}" duplicated ✓`);
      },
    },
    {
      label: "Delete Rule",
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-500" />,
      isDanger: true,
      onClick: (r) => {
        deleteRule(r.id);
        toast.success(`Agent rule "${r.name}" deleted`);
      },
    },
  ];

  // Bulk actions
  const bulkActions = [
    {
      label: "Delete Selected",
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-500" />,
      isDanger: true,
      onClick: (ids: Set<any>) => {
        ids.forEach((id) => deleteRule(id));
        setSelectedIds(new Set());
        toast.success(`${ids.size} agent rules deleted`);
      },
    },
  ];

  return (
    <div className="space-y-4" style={{ fontFamily: "Outfit, sans-serif" }}>
      {/* Main Table */}
      <TableComponent<WhatsAppAgentRule>
        data={filteredRules}
        columns={columns}
        rowActions={rowActions}
        enableSelection={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActions={bulkActions}
        onRowClick={(row) => onEditRule?.(row)}
        getRowId={(row) => row.id}
        tableId="whatsapp_agent_rules_table_v5"
        emptyMessage="No WhatsApp agent rules found matching your filters. Click '+ Add Rule' to create your first agent."
        defaultRowsPerPage={10}
      />
    </div>
  );
}
