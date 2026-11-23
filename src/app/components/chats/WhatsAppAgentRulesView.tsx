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

  // Table Columns (Rule name, Connected template, Status)
  const columns: TableColumn<WhatsAppAgentRule>[] = [
    {
      id: "name",
      header: "RULE NAME",
      align: "left",
      render: (row) => {
        return (
          <Tooltip content={row.name} position="top">
            <button
              type="button"
              onClick={() => onEditRule?.(row)}
              className="text-xs font-bold text-slate-900 hover:text-blue-600 transition-colors text-left truncate block max-w-[320px] cursor-pointer"
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
      width: "280px",
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
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 max-w-[260px] truncate cursor-help">
              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{displayText}</span>
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
        tableId="whatsapp_agent_rules_table_v4"
        emptyMessage="No WhatsApp agent rules found matching your filters. Click '+ Add Rule' to create your first agent."
        defaultRowsPerPage={10}
      />
    </div>
  );
}
